/* Job list v2 (2.26.29 / 2.28.70): jobs are defined here only; saved entries for removed jobs (out-prep, out-paint) are simply ignored, so nobody's other ticks are touched.
   2.26.25: Millesha's Renovation – shared by My App (#reno) and Millesha's own page (millesha.html).
   2.28.70: Daily 8:30 pm NZT countdown notification & SMS text reminder for every person that has the app.
   Only this job list travels, through the relay's /reno route with its own key. Nothing else from My App is shared. */
function makeReno(cfg) { // 2.26.36: one engine for every renovation list (Millesha's shared, Mum's private)
  cfg = cfg || {}; const NS = cfg.ns || 'Reno', SK = cfg.store || 'renoState', NK = cfg.noteKey || 'renoNoteHidden';
  const RELAY = 'https://due-dates-calendar-relay.phoneapp12.workers.dev/reno';
  const VAPID_PUBLIC = 'BEsNn0TcOiNQqSE7AbDFgYGL_v45EEm-mma2_6DtecoG5c7ZvwZ7lKpAXOQry7cqfvWM0JTjtPPdK93arc0VXMU';
  const INSIDE = [['main', 'Main bedroom', '🛏️', 'carpet'], ['spare', 'Spare bedroom', '🛋️', 'carpet'], ['bath', 'Bathroom', '🛁', 'tiles'], ['hall', 'Hallway', '🚪', 'carpet'], ['lounge', 'Lounge', '📺', 'carpet'], ['dining', 'Dining', '🍽️', 'carpet'], ['kitchen', 'Kitchen', '🍳', 'tiles'], ['pantry', 'Pantry', '🥫', 'tiles'], ['laundry', 'Laundry', '🧺', 'tiles']];
  let AREAS = cfg.areas ? cfg.areas() : INSIDE.map(([k, n, e, f]) => ({ k, n, e, floorDef: f, jobs: [['clean', 'Clean'], ['mop', 'Mop ceiling'], ['speckle', 'Apply speckle (filler)'], ['sand', 'Sand'], ['ceiling', 'Paint ceiling (roof)'], ['walls', 'Paint walls'], ['floor', 'Flooring']] }))
    .concat([{ k: 'out', n: 'Outside', e: '🏡', jobs: [['wash', 'House wash (walls, windows, soffits)'], ['gutters', 'Clear gutters and downpipes'], ['decks', 'Clean decks and paths'], ['metal', 'Metal man (scrap metal pickup)'], ['dump', 'Dump runs']] },
    { k: 'final', n: 'Final stage', e: '✨', final: true, jobs: [['clean', 'Final clean-up'], ['switches', 'Check light switches (make sure they are all working)'], ['lawns', 'Final lawns'], ['weed', 'Weed eating']] }]);
  const ST = { todo: 'To do', doing: 'In progress', done: 'Done' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let key = '', me = 'Shane', onChange = () => { }, st = { items: {}, dirty: [] };
  let pushState = { subscribed: false, totalDevices: 0, checked: false };

  function load() { try { const o = JSON.parse(localStorage.getItem(SK) || 'null'); if (o && o.items) st = { items: o.items, dirty: o.dirty || [] }; } catch (e) { } }
  function persist() { try { localStorage.setItem(SK, JSON.stringify(st)); } catch (e) { } }
  const ent = id => st.items[id] || {};
  function setE(id, patch) { const e = Object.assign({}, ent(id), patch, { id, updated: Date.now(), by: me }); st.items[id] = e; if (!st.dirty.includes(id)) st.dirty.push(id); persist(); onChange(); soon(); }
  let t = null; function soon() { clearTimeout(t); t = setTimeout(sync, 1200); }
  let busy = false;
  async function sync() {
    if (!key || busy) return; busy = true;
    try {
      const sent = st.dirty.slice(), items = sent.map(id => st.items[id]).filter(Boolean);
      const r = await fetch(RELAY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, items }) });
      if (r.ok) { const d = await r.json(); let ch = false; (d.items || []).forEach(x => { const h = st.items[x.id]; if (!h || x.updated > h.updated) { st.items[x.id] = x; ch = true; } }); st.dirty = st.dirty.filter(id => !sent.includes(id)); st.at = Date.now(); persist(); if (ch) onChange(); }
    } catch (e) { } finally { busy = false; }
  }

  function vapidKey() {
    const b = VAPID_PUBLIC.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - VAPID_PUBLIC.length % 4) % 4);
    return Uint8Array.from(atob(b), c => c.charCodeAt(0));
  }
  async function checkAndAutoSubscribePush(quiet = true) {
    if (!key || cfg.noDeadline || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub && Notification.permission === 'granted') {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey() });
      }
      if (sub) {
        const pageUrl = /millesha\.html/i.test(location.pathname) ? ('millesha.html#k=' + key) : '#reno';
        const r = await fetch(RELAY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, action: 'push-subscribe', subscription: sub.toJSON(), who: me, url: pageUrl, quiet })
        });
        if (r.ok) {
          const d = await r.json();
          pushState = { subscribed: !!d.subscribed, totalDevices: d.totalDevices || 1, checked: true };
          onChange();
        }
      } else {
        pushState.checked = true;
      }
    } catch (e) { pushState.checked = true; }
  }

  const job = (a, j) => { const e = ent(a.k + '-' + j[0]), ae = ent('a-' + a.k); return { id: a.k + '-' + j[0], title: j[0] === 'floor' ? 'Flooring: ' + ((ae.floor || a.floorDef) === 'tiles' ? 'stick-down tiles' : 'carpet') : j[1], status: e.status || 'todo', who: e.who || '', areaWho: ae.areaWho || ae.who || '', notes: e.notes || '', due: e.due || '', by: e.by || '', count: +e.count || 0, counter: j[0] === 'dump' }; };
  const jobsOf = a => a.jobs.map(j => job(a, j));
  const pct = L => L.length ? Math.round(L.reduce((s, j) => s + (j.status === 'done' ? 1 : j.status === 'doing' ? .5 : 0), 0) / L.length * 100) : 0;
  const finalOpen = () => AREAS.filter(a => !a.final).every(a => jobsOf(a).every(j => j.status === 'done'));
  const fmtD = d => { try { return new Date(d + 'T12:00').toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return d; } };
  const DEADLINE = '2026-11-22';
  const nzToday = () => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } };
  const deadline = () => ent('project').deadline || DEADLINE;
  const daysLeft = () => Math.round((Date.parse(deadline() + 'T00:00:00Z') - Date.parse(nzToday() + 'T00:00:00Z')) / 864e5);
  const phonesList = () => { const p = ent('phones').phones; return Array.isArray(p) ? p : []; };

  function buildSmsBody(ovPct) {
    const d = deadline(), n = daysLeft();
    const dayStr = n > 1 ? `${n} days` : n === 1 ? '1 day' : n === 0 ? '0 days (due today!)' : `${Math.abs(n)} days past deadline`;
    const link = 'https://shane-my-app.pages.dev/millesha.html#k=' + key;
    return `Millesha’s Renovation reminder: ${dayStr} until the project needs to be finished (Deadline: ${fmtD(d)}). Currently ${ovPct}% done. Open checklist: ${link}`;
  }

  function countdown() {
    const d = deadline(), n = daysLeft();
    const cls = n < 7 ? 'rncd-red' : n < 14 ? 'rncd-amber' : 'rncd-blue';
    const big = n > 1 ? n + ' days to go' : n === 1 ? '1 day to go' : n === 0 ? 'Deadline is today' : Math.abs(n) + (Math.abs(n) === 1 ? ' day' : ' days') + ' past the deadline';
    return `<button type="button" class="rncd ${cls}" onclick="${NS}.editDeadline()" aria-label="Deadline ${esc(fmtD(d))}. Tap to change"><span class="rncdi">⏳</span><span class="rncdt"><b>${big}</b><span>Deadline ${esc(fmtD(d))} · tap to change</span></span></button>`;
  }

  function reminderCard(ovPct) {
    if (cfg.noDeadline || !key) return '';
    const n = daysLeft();
    const pList = phonesList();
    const nums = pList.map(x => String(x.phone || '').replace(/\s+/g, '')).filter(Boolean);
    const ua = navigator.userAgent || '';
    const sep = /iPad|iPhone|iPod/i.test(ua) ? '&' : '?';
    const smsHref = `sms:${nums.join(',')}${sep}body=${encodeURIComponent(buildSmsBody(ovPct))}`;
    const peopleBadges = pList.length
      ? pList.map(p => `<span class="rnpbadge">📱 ${esc(p.name || 'Helper')}${p.phone ? ' (' + esc(p.phone) + ')' : ''}</span>`).join('')
      : `<span style="font-size:.78rem;color:#64748b">Add everyone’s mobile number so anyone can group-text the team in one tap, alongside the automatic 8:30 pm phone push.</span>`;

    return `<div class="rnremcard">
      <div class="rnremtop">
        <div>
          <div class="rnremtitle">🕣 Daily 8:30 pm Countdown Reminder</div>
          <div class="rnremsub">Sent at <b>8:30 pm NZ time every day</b> to every person with the app — stating there ${n === 1 ? 'is <b>1 day</b>' : `are <b>${n} days</b>`} until the project needs to be finished.</div>
        </div>
        <span class="rnrempill ${pushState.subscribed ? 'on' : ''}">${pushState.subscribed ? '🔔 8:30pm Push Active' : '🔔 8:30pm Push'}</span>
      </div>
      <div class="rnrempeeps">${peopleBadges}</div>
      <div class="rnrembtns">
        <button type="button" class="rnrembtn primary" onclick="${NS}.enableDailyPush()">${pushState.subscribed ? '🔔 8:30 pm Reminder On ✓' : '🔔 Turn On 8:30 pm Reminder'}</button>
        <a class="rnrembtn sms" href="${esc(smsHref)}">💬 Text Team (${n}d left)</a>
        <button type="button" class="rnrembtn" onclick="${NS}.sendCountdownNow()">📨 Push to All Phones Now</button>
        <button type="button" class="rnrembtn" onclick="${NS}.editPhones()">👥 Team Numbers (${pList.length})</button>
      </div>
    </div>`;
  }

  const bar = p => `<div class="rnbar"><i style="width:${p}%"></i></div>`;
  function html() {
    const all = AREAS.filter(a => !a.final).flatMap(jobsOf), fin = finalOpen(), done = all.filter(j => j.status === 'done').length;
    const fa = AREAS.find(a => a.final), ov = pct(all.concat(fin && fa ? jobsOf(fa) : []));
    let h = (cfg.noDeadline ? '' : countdown() + reminderCard(ov)) + `<div class="rnhero"><div class="rnhl"><div class="rnk">Overall progress</div><div class="rnbig">${ov}%</div><div class="rns">${done} of ${all.length} jobs done${fin && AREAS.some(a => a.final) ? ' · final stage open' : ''}</div></div><div class="rnring" style="--p:${ov}"><span>🛠️</span></div></div>${bar(ov)}`;
    let noted = false; try { noted = localStorage.getItem(NK) === '1'; } catch (e) { }
    if (!noted && done < all.length) h += `<div class="rnnote"><div><b>Project already underway?</b> Tick off what’s done: tap a job’s circle, or use “Mark room done” for a finished room.</div><button type="button" onclick="${NS}.hideNote()" aria-label="Hide this note">✕</button></div>`;
    AREAS.forEach(a => {
      const L = jobsOf(a), p = pct(L), ae = ent('a-' + a.k), locked = a.final && !fin;
      h += `<section class="rnarea${locked ? ' rnlocked' : ''}"><div class="rnah"><span class="rne">${a.e}</span><div class="rnat"><div class="rnan">${esc(a.n)}</div><div class="rnas">${locked ? 'Unlocks when everything else is done' : `${L.filter(j => j.status === 'done').length}/${L.length} done${ae.who ? ' · ' + esc(ae.who) : ''}`}</div></div><span class="rnp">${p}%</span></div>${bar(p)}`;
      if (!locked) {
        h += `<div class="rnctl"><button type="button" class="rnchip rnall" onclick="${NS}.roomDone('${a.k}')">${L.every(j => j.status === 'done') ? '↺ Untick all' : '✓ Mark room done'}</button><button type="button" class="rnchip" onclick="${NS}.assignArea('${a.k}')">👤 ${ae.who ? esc(ae.who) : 'Assign area'}</button>${a.floorDef ? `<span class="rnseg"><button type="button" class="${(ae.floor || a.floorDef) === 'carpet' ? 'on' : ''}" onclick="${NS}.floor('${a.k}','carpet')">Carpet</button><button type="button" class="${(ae.floor || a.floorDef) === 'tiles' ? 'on' : ''}" onclick="${NS}.floor('${a.k}','tiles')">Stick-down tiles</button></span>` : ''}</div>`;
        h += L.map((j, i) => `<div class="rnjob s-${j.status}"><button type="button" class="rnst" aria-label="${j.status === 'done' ? 'Untick' : 'Tick done'}: ${esc(j.title)}" onclick="${NS}.cycle('${j.id}')">${j.status === 'done' ? '✓' : i + 1}</button><button type="button" class="rnjt" onclick="${NS}.edit('${j.id}')"><div class="t">${esc(j.title)}</div><div class="s"><span class="rnpill p-${j.status}">${ST[j.status]}</span>${j.status === 'done' && j.by ? ' · ticked by ' + esc(j.by) : ''}${j.due ? ' · 📅 ' + fmtD(j.due) : ''}${j.notes ? ' · ' + esc(j.notes.slice(0, 60)) : ''}</div></button><button type="button" class="rnas1${j.who ? ' on' : j.areaWho ? ' inh' : ''}" onclick="${NS}.assign('${j.id}')" aria-label="Assign: ${esc(j.title)}">👤 ${j.who ? esc(j.who) : j.areaWho ? esc(j.areaWho) : 'Assign'}</button>${j.counter ? `<span class="rncnt"><b>${j.count}</b> ${j.count === 1 ? 'run' : 'runs'} done<button type="button" aria-label="Add a dump run" onclick="${NS}.addRun('${j.id}')">+1</button></span>` : ''}</div>`).join('');
      }
      else h += `<div class="rnlockl">${L.map(j => '🔒 ' + esc(j.title)).join('<br>')}</div>`;
      h += '</section>';
    });
    return `<div class="reno">${h}<p class="rnfoot">${cfg.foot || (key ? 'Shared with Millesha’s page · Daily 8:30 pm NZT countdown enabled.' : 'Not linked yet.')}</p></div>`;
  }
  function findJob(id) { for (const a of AREAS) for (const j of a.jobs) if (a.k + '-' + j[0] === id) return job(a, j); return null; }
  function sheet(title, body, onSave) {
    const d = document.createElement('div'); d.className = 'rnsheet';
    d.innerHTML = `<div class="rnsb" role="dialog" aria-label="${esc(title)}"><h3>${esc(title)}</h3>${body}<div class="rnsbtns"><button type="button" class="rncancel">Cancel</button><button type="button" class="rnsave">Save</button></div></div>`;
    document.body.appendChild(d); const close = () => d.remove();
    d.addEventListener('click', e => { if (e.target === d) close(); }); d.querySelector('.rncancel').onclick = close; d.querySelector('.rnsave').onclick = () => { onSave(d); close(); };
    d.querySelectorAll('.rnseg2 button').forEach(b => b.onclick = () => { d.querySelectorAll('.rnseg2 button').forEach(x => x.classList.remove('on')); b.classList.add('on'); });
  }
  function miniToast(msg) {
    if (typeof window.toast === 'function') { window.toast(msg); return; }
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 16px;border-radius:12px;font-size:.9rem;z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.25)';
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3200);
  }
  const Reno = {
    init(o) {
      key = o.key || ''; me = o.me || me; onChange = o.onChange || onChange; load(); sync();
      setTimeout(() => checkAndAutoSubscribePush(true), 800);
      if (!Reno._t) {
        Reno._t = setInterval(() => { if (document.visibilityState === 'visible') sync(); }, 60000);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
      }
    },
    html, sync, get areas() { return AREAS; }, setAreas(L) { AREAS = L; },
    daysLeft, deadline,
    next() { for (const a of AREAS) { if (a.final && !finalOpen()) continue; for (const j of jobsOf(a)) if (j.status !== 'done') return { id: j.id, title: j.title, area: a.n }; } return null; },
    progress() { const all = AREAS.flatMap(jobsOf); return pct(all); },
    cycle(id) { const j = findJob(id); if (!j) return; setE(id, { status: j.status === 'done' ? 'todo' : 'done' }); },
    roomDone(k) { const a = AREAS.find(x => x.k === k); if (!a) return; const L = jobsOf(a), all = L.every(j => j.status === 'done'); if (!all && !confirm('Mark every job in ' + a.n + ' as done?')) return; L.forEach(j => { const e = Object.assign({}, ent(j.id), { id: j.id, status: all ? 'todo' : 'done', updated: Date.now(), by: me }); st.items[j.id] = e; if (!st.dirty.includes(j.id)) st.dirty.push(j.id); }); persist(); onChange(); soon(); },
    editDeadline() { sheet('Project deadline', `<label class="rnl">Finish by<input class="rnin" id="rndl" type="date" value="${esc(deadline())}"></label><p class="rnhelp">Shows on everyone’s phone and updates the 8:30 pm daily countdown reminder.</p>`, d => { const v = d.querySelector('#rndl').value; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) setE('project', { deadline: v }); }); },
    async enableDailyPush() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        miniToast('Add this page to your Home Screen first to enable phone notifications.');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        miniToast('Please allow notifications in your browser settings.');
        return;
      }
      await checkAndAutoSubscribePush(false);
      miniToast('8:30 pm daily renovation countdown reminder is ON for this phone!');
    },
    async sendCountdownNow() {
      if (!key) return;
      miniToast('Sending countdown reminder to all phones with the app…');
      try {
        const r = await fetch(RELAY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, action: 'push-send-now' }) });
        const d = await r.json();
        if (r.ok && d.ok) {
          miniToast(`Sent "${d.daysLeft} days left" reminder to ${d.sent || d.totalTargets || 1} phone(s)!`);
        } else {
          miniToast('Could not send push right now.');
        }
      } catch (e) { miniToast('Offline — check connection.'); }
    },
    editPhones() {
      const pList = phonesList();
      const rowsHtml = [0, 1, 2, 3, 4].map(i => {
        const p = pList[i] || { name: i === 0 ? 'Millesha' : i === 1 ? 'Shane' : i === 2 ? 'Sarah' : i === 3 ? 'Cass' : '', phone: '' };
        return `<div style="display:flex;gap:8px;align-items:center">
          <input class="rnin rn-pname" data-idx="${i}" placeholder="Name (e.g. Millesha)" value="${esc(p.name)}" style="flex:1;padding:8px 10px;font-size:.9rem">
          <input class="rnin rn-pnum" data-idx="${i}" type="tel" placeholder="Mobile (e.g. 021...)" value="${esc(p.phone)}" style="flex:1.1;padding:8px 10px;font-size:.9rem">
        </div>`;
      }).join('');
      sheet('Team Mobile Numbers (8:30 pm Reminder)', `<p class="rnhelp">Add everyone who has the app so you can group-text the daily countdown in one tap alongside the automatic 8:30 pm phone notification.</p><div style="display:flex;flex-direction:column;gap:8px">${rowsHtml}</div>`, d => {
        const names = [...d.querySelectorAll('.rn-pname')];
        const nums = [...d.querySelectorAll('.rn-pnum')];
        const next = [];
        for (let i = 0; i < names.length; i++) {
          const nm = names[i].value.trim();
          const ph = nums[i].value.trim();
          if (nm || ph) next.push({ name: nm, phone: ph });
        }
        setE('phones', { phones: next });
        miniToast('Saved team mobile numbers.');
      });
    },
    addRun(id) { const j = findJob(id); if (!j) return; setE(id, { count: j.count + 1, status: j.status === 'done' ? 'done' : 'doing' }); },
    names() { const n = new Map(); Object.values(st.items).forEach(e => [e.by, e.who].forEach(x => { x = String(x || '').trim(); if (x && !/^helper [ab]$|^test$/i.test(x)) n.set(x.toLowerCase(), x); })); if (me) n.set(me.toLowerCase(), me); return [...n.values()].sort((a, b) => a.localeCompare(b)); },
    assign(id) {
      const j = findJob(id); if (!j) return;
      sheet('Who’s doing this?', `<div class="rnsub">${esc(j.title)}${j.areaWho && !j.who ? ' · area: ' + esc(j.areaWho) : ''}</div><div class="rnnames">${Reno.names().map(n => `<button type="button" class="rnname${n === j.who ? ' on' : ''}" data-n="${esc(n)}">👤 ${esc(n)}</button>`).join('')}</div>
        <label class="rnl">Or type a new name<input class="rnin" id="rnwho" maxlength="40" placeholder="e.g. Cass"></label>${j.who ? '<button type="button" class="rnunas">Unassign</button>' : ''}`,
        d => { const v = d.querySelector('#rnwho').value.trim(); if (v) setE(id, { who: v }); });
      const box = document.querySelector('.rnsheet:last-of-type'); if (!box) return;
      box.querySelectorAll('.rnname').forEach(b => b.onclick = () => { setE(id, { who: b.dataset.n }); box.remove(); });
      const u = box.querySelector('.rnunas'); if (u) u.onclick = () => { setE(id, { who: '' }); box.remove(); };
    },
    hideNote() { try { localStorage.setItem(NK, '1'); } catch (e) { } onChange(); },
    floor(k, f) { setE('a-' + k, { floor: f }); },
    assignArea(k) { const a = AREAS.find(x => x.k === k), ae = ent('a-' + k); sheet('Who’s doing ' + a.n + '?', `<label class="rnl">Name<input class="rnin" id="rnwho" value="${esc(ae.who || '')}" placeholder="Type a name, e.g. Millesha" maxlength="40"></label><p class="rnhelp">Every job in this area goes to them, unless a job has its own name.</p>`, d => setE('a-' + k, { who: d.querySelector('#rnwho').value.trim() })); },
    edit(id) {
      const j = findJob(id); if (!j) return;
      sheet(j.title, `<div class="rnseg2">${Object.keys(ST).map(s => `<button type="button" data-s="${s}" class="${j.status === s ? 'on' : ''}">${ST[s]}</button>`).join('')}</div>
        <label class="rnl">Who’s doing it<input class="rnin" id="rnwho" value="${esc(j.who)}" placeholder="${j.areaWho ? 'Area: ' + esc(j.areaWho) : 'Type a name'}" maxlength="40"></label>
        <label class="rnl">Due date (optional)<input class="rnin" id="rndue" type="date" value="${esc(j.due)}"></label>
        <label class="rnl">Notes (optional)<textarea class="rnin" id="rnnotes" rows="3" maxlength="600">${esc(j.notes)}</textarea></label>`,
        d => { const s = (d.querySelector('.rnseg2 .on') || {}).dataset; setE(id, { status: (s && s.s) || j.status, who: d.querySelector('#rnwho').value.trim(), due: d.querySelector('#rndue').value, notes: d.querySelector('#rnnotes').value }); });
    }
  };
  if (cfg.extra) Object.assign(Reno, cfg.extra(Reno, { ent, setE }));
  if (makeReno.css) return Reno;
  makeReno.css = true;
  const css = `.reno{--rb:var(--brand,#0f766e);display:flex;flex-direction:column;gap:12px}
.rnhero{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#1e3a8a,#2563eb 60%,#38bdf8);color:#fff;border-radius:20px;padding:18px 18px;box-shadow:0 8px 24px rgba(37,99,235,.25)}
.rnk{font-size:.8rem;opacity:.85;font-weight:600}.rnbig{font-size:2.2rem;font-weight:800;line-height:1.1}.rns{font-size:.85rem;opacity:.9}
.rnring{--p:0;width:76px;height:76px;border-radius:50%;background:conic-gradient(#fff calc(var(--p)*1%),rgba(255,255,255,.25) 0);display:grid;place-items:center}.rnring span{width:60px;height:60px;border-radius:50%;background:#1d4ed8;display:grid;place-items:center;font-size:1.6rem}
.rnbar{height:8px;border-radius:99px;background:#e2e8f0;overflow:hidden}.rnbar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#14b8a6,#22c55e);transition:width .4s}
.rnarea{background:#fff;border-radius:18px;padding:14px;box-shadow:0 2px 10px rgba(15,23,42,.06);display:flex;flex-direction:column;gap:8px}
.rnlocked{opacity:.6}.rnah{display:flex;align-items:center;gap:10px}.rne{font-size:1.6rem;width:44px;height:44px;border-radius:14px;background:#eff6ff;display:grid;place-items:center;flex:none}
.rnat{flex:1;min-width:0}.rnan{font-weight:750;font-size:1.05rem;color:#0f172a}.rnas{font-size:.8rem;color:#64748b}.rnp{font-weight:800;color:#1d4ed8}
.rnctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.rnchip{background:#f1f5f9;border:0;border-radius:99px;padding:6px 12px;font-weight:650;font-size:.85rem;color:#0f172a}
.rnseg{display:inline-flex;background:#f1f5f9;border-radius:99px;padding:3px}.rnseg button,.rnseg2 button{border:0;background:none;border-radius:99px;padding:5px 11px;font-size:.8rem;font-weight:650;color:#475569}.rnseg button.on,.rnseg2 button.on{background:#1d4ed8;color:#fff}
.rnjob{display:flex;align-items:center;gap:10px;border-top:1px solid #f1f5f9;padding-top:8px}.rnst{width:34px;height:34px;border-radius:50%;border:2px solid #cbd5e1;background:#fff;font-weight:800;color:#64748b;flex:none;font-size:.9rem}
.rnjob.s-doing .rnst{border-color:#f59e0b;color:#b45309;background:#fffbeb}.rnjob.s-done .rnst{border-color:#22c55e;background:#22c55e;color:#fff}.rnjob.s-done .t{text-decoration:line-through;color:#94a3b8}
.rnjt{flex:1;min-width:0;text-align:left;background:none;border:0;padding:2px 0}.rnjt .t{font-weight:650;color:#0f172a;font-size:.95rem;overflow-wrap:break-word}.rnjt .s{font-size:.78rem;color:#64748b;margin-top:2px}
.rnpill{border-radius:99px;padding:1px 7px;font-weight:700;font-size:.72rem}.p-todo{background:#f1f5f9;color:#475569}.p-doing{background:#fef3c7;color:#92400e}.p-done{background:#dcfce7;color:#166534}
.rnall{background:#dcfce7;color:#166534}
.rnnote{display:flex;gap:10px;align-items:flex-start;background:#fffbeb;border-radius:14px;padding:12px 14px;font-size:.88rem;color:#78350f}.rnnote button{border:0;background:none;font-size:1rem;color:#92400e;padding:0 2px}
.rncd{display:flex;align-items:center;gap:12px;border:0;border-radius:18px;padding:12px 16px;text-align:left;color:#fff;width:100%}.rncdi{font-size:1.6rem}.rncdt{display:flex;flex-direction:column}.rncdt b{font-size:1.35rem;line-height:1.2}.rncdt span{font-size:.82rem;opacity:.92}
.rncd-blue{background:linear-gradient(135deg,#0ea5e9,#2563eb)}.rncd-amber{background:linear-gradient(135deg,#f59e0b,#d97706)}.rncd-red{background:linear-gradient(135deg,#ef4444,#b91c1c)}
.rnremcard{background:#fff;border:1.5px solid #bfdbfe;border-radius:18px;padding:13px 14px;box-shadow:0 2px 10px rgba(37,99,235,.07);display:flex;flex-direction:column;gap:9px}
.rnremtop{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.rnremtitle{font-weight:800;font-size:.94rem;color:#1e3a8a}
.rnremsub{font-size:.8rem;color:#475569;margin-top:2px;line-height:1.38}
.rnrempill{flex:none;font-size:.72rem;font-weight:800;padding:3px 9px;border-radius:99px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
.rnrempill.on{background:#dcfce7;color:#166534;border-color:#86efac}
.rnrempeeps{display:flex;flex-wrap:wrap;gap:6px}
.rnpbadge{font-size:.75rem;font-weight:700;padding:3px 9px;border-radius:99px;background:#f1f5f9;color:#0f172a}
.rnrembtns{display:flex;flex-wrap:wrap;gap:7px}
.rnrembtn{border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;border-radius:10px;padding:7px 11px;font-size:.78rem;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:4px}
.rnrembtn.primary{background:#1d4ed8;color:#fff;border-color:#1d4ed8}
.rnrembtn.sms{background:#0f766e;color:#fff;border-color:#0f766e}
.rncnt{display:flex;align-items:center;gap:6px;font-size:.78rem;color:#475569;flex:none}.rncnt b{font-size:1rem;color:#0f172a}.rncnt button{border:0;background:#1d4ed8;color:#fff;border-radius:99px;padding:6px 10px;font-weight:800;font-size:.85rem}
.rnlockl{font-size:.85rem;color:#64748b;line-height:1.7;padding:2px 4px}
.rnas1{flex:none;border:0;border-radius:99px;padding:5px 10px;font-size:.78rem;font-weight:650;background:#f1f5f9;color:#64748b;max-width:42%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rnas1.on{background:#e0e7ff;color:#3730a3}.rnas1.inh{background:#f8fafc;color:#6366f1;border:1px dashed #c7d2fe}
.rnsub{font-size:.85rem;color:#64748b;margin-top:-6px}.rnnames{display:flex;flex-wrap:wrap;gap:8px}.rnname{border:0;border-radius:99px;padding:8px 14px;background:#eef2ff;color:#3730a3;font-weight:700;font-size:.9rem}.rnname.on{background:#3730a3;color:#fff}
.rnunas{border:0;background:#fee2e2;color:#991b1b;border-radius:12px;padding:10px;font-weight:700}
.rnfoot{font-size:.78rem;color:#94a3b8;text-align:center;margin:4px 0 0}
.rnsheet{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center}.rnsb{background:#fff;width:100%;max-width:560px;border-radius:20px 20px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;color:#0f172a}
.rnsb h3{margin:0;font-size:1.15rem}.rnl{display:flex;flex-direction:column;gap:4px;font-size:.85rem;font-weight:650;color:#334155}.rnin{font:inherit;font-weight:400;border:1px solid #cbd5e1;border-radius:12px;padding:10px 12px;font-size:1rem}
.rnseg2{display:flex;background:#f1f5f9;border-radius:99px;padding:3px}.rnseg2 button{flex:1;padding:8px}.rnhelp{margin:0;font-size:.8rem;color:#64748b}
.rnsbtns{display:flex;gap:10px}.rnsbtns button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:700;font-size:1rem}.rncancel{background:#f1f5f9;color:#0f172a}.rnsave{background:#1d4ed8;color:#fff}`;
  const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
  return Reno;
}
window.makeReno = makeReno;
window.Reno = makeReno({});
