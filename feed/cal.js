/* 1.9.118 Info Book calendar. Entries stay on this phone, in the same per-member
   localStorage as the rest of the feed (ls). A home-screen PWA does not get a
   reliable timer once the page is closed, so a reminder banner and a notification
   only fire while Info Book is open. Add to phone calendar downloads an .ics file,
   which is the reminder that still works when the app is shut. */
(function (root) {
  const KEY = 'cal';
  const NZ_TV = new Set(['nz-tvg2', 'tvm-nz', 'nz-yt-three']);
  const NZ_HOST = /(^|\.)(tvnz\.co\.nz|threenow\.co\.nz|skygo\.co\.nz)$/i;
  const REMIND = { none: null, at: 0, m15: 15 * 60000, h1: 3600000, d1: 86400000 };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function nzParts(ms) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
    return { date: p.year + '-' + p.month + '-' + p.day, time: p.hour + ':' + p.minute, hour: Number(p.hour) };
  }
  function aucklandMs(date, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return NaN;
    const clock = /^\d{2}:\d{2}$/.test(time || '') ? time : '09:00';
    const guess = Date.parse(date + 'T' + clock + ':00Z');
    if (!isFinite(guess)) return NaN;
    const got = nzParts(guess);
    const seen = Date.parse(got.date + 'T' + got.time + ':00Z');
    const want = Date.parse(date + 'T' + clock + ':00Z');
    return guess - (seen - want);
  }
  function load() { try { return (root.ls && root.ls.get(KEY, [])) || []; } catch (e) { return []; } }
  function save(list) { try { root.ls && root.ls.set(KEY, list); } catch (e) {} }
  function clean(e) {
    const title = String(e.title || '').trim().slice(0, 120);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(e.date || '') ? e.date : '';
    const time = /^\d{2}:\d{2}$/.test(e.time || '') ? e.time : '';
    const note = String(e.note || '').trim().slice(0, 400);
    const remind = REMIND[e.remind] == null && e.remind !== 'none' ? 'none' : (e.remind || 'none');
    if (!title || !date) return null;
    return { id: e.id || ('c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), title, date, time, note, remind, url: String(e.url || '').slice(0, 400), fired: e.fired || '' };
  }
  function upsert(raw) {
    const e = clean(raw); if (!e) return null;
    const list = load().filter(x => x.id !== e.id);
    list.push(e); save(list); return e;
  }
  function remove(id) { save(load().filter(x => x.id !== id)); }
  function fireMs(e) {
    const start = aucklandMs(e.date, e.time);
    if (!isFinite(start) || REMIND[e.remind] == null) return NaN;
    return start - REMIND[e.remind];
  }
  function due(now) {
    return load().filter(e => {
      const f = fireMs(e); if (!isFinite(f)) return false;
      const end = aucklandMs(e.date, e.time) + 2 * 3600000;
      return now >= f && now <= end && e.fired !== String(f);
    });
  }
  function markFired(id, now) {
    const list = load(); const e = list.find(x => x.id === id); if (!e) return;
    e.fired = String(fireMs(e)); save(list);
  }
  function icsStamp(date, time) { return date.replace(/-/g, '') + 'T' + (time || '0900').replace(':', '') + '00'; }
  function ics(e) {
    const clock = e.time || '09:00';
    const trigger = e.remind === 'm15' ? '-PT15M' : e.remind === 'h1' ? '-PT1H' : e.remind === 'd1' ? '-P1D' : e.remind === 'at' ? '-PT0M' : '';
    const text = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&');
    const alarm = trigger ? 'BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:' + text(e.title) + '\r\nTRIGGER:' + trigger + '\r\nEND:VALARM\r\n' : '';
    return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Info Book//Calendar//EN\r\nBEGIN:VEVENT\r\nUID:' + e.id + '@infobook\r\nDTSTART;TZID=Pacific/Auckland:' + icsStamp(e.date, clock) + '\r\nSUMMARY:' + text(e.title) + '\r\nDESCRIPTION:' + text(e.note) + '\r\n' + alarm + 'END:VEVENT\r\nEND:VCALENDAR\r\n';
  }
  function download(e) {
    const blob = new Blob([ics(e)], { type: 'text/calendar' });
    const a = root.document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'infobook-' + e.date + '.ics'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (err) { return ''; } }
  function fromMs(ms, title, note, url) {
    if (typeof ms !== 'number' || !isFinite(ms)) return null;
    const p = nzParts(ms);
    return { title, date: p.date, time: p.time, note: note || '', url: url || '', remind: 'm15' };
  }
  function prefill(i) {
    if (!i) return null;
    if (i.x === 'cine' && i.film && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(i.film.next || '')) {
      const [date, time] = i.film.next.split('T');
      return { title: i.film.title, date, time, note: 'Event Cinemas Whangārei, 18 James Street. ' + (i.film.rating || ''), url: i.film.sessions || i.film.link || '', remind: 'h1' };
    }
    if (i.x === 'watch' && i.w && typeof i.w.ev === 'number' && !/^(Stan|Neon)$/i.test(i.w.plat || '') && !/neon|stan\.(com|news)/i.test(i.w.url || '')) return fromMs(i.w.ev, i.w.t, 'On ' + (i.w.plat || 'NZ TV'), i.w.url);
    if (i.x === 'concert' && i.c && typeof i.c.ev === 'number') return fromMs(i.c.ev, i.c.t, (i.c.venue || 'Auckland') + ', Auckland', i.c.url);
    if (i.kind === 'tv' && typeof i.ev === 'number' && (NZ_TV.has(i.src) || NZ_HOST.test(hostOf(i.url || '')))) return fromMs(i.ev, i.t, i.where ? 'On ' + i.where : '', i.url);
    if (i.kind === 'event' && typeof i.ev === 'number') return fromMs(i.ev, i.t, i.s || '', i.url);
    return null;
  }
  function btn(raw) {
    const p = raw && raw.title ? raw : prefill(raw);
    if (!p || !p.date) return '';
    const pack = encodeURIComponent(JSON.stringify({ title: p.title, date: p.date, time: p.time || '', note: p.note || '', url: p.url || '', remind: p.remind || 'm15' }));
    return `<button type="button" class="btn" data-caladd="${pack}">Add to calendar</button>`;
  }

  root.ibCal = { load, upsert, remove, due, markFired, ics, prefill, aucklandMs, nzParts, fireMs };

  if (!root.document) return;

  let on = false, edit = null;
  function monthOf(date) { return date.slice(0, 7); }
  function today() { return nzParts(Date.now()).date; }
  function viewHtml() {
    const list = load().slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const month = (edit && edit.date || today()).slice(0, 7);
    const [y, m] = month.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const start = (first.getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const have = new Set(list.filter(e => e.date.slice(0, 7) === month).map(e => e.date));
    let cells = '';
    for (let i = 0; i < start; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const ds = month + '-' + String(d).padStart(2, '0');
      cells += `<button type="button" data-calday="${ds}" class="${ds === today() ? 'today' : ''}${have.has(ds) ? ' has' : ''}">${d}</button>`;
    }
    const upcoming = list.filter(e => e.date >= today()).slice(0, 12);
    const form = edit ? `<form class="calform" data-calform>
      <label>Title<input name="title" required maxlength="120" value="${esc(edit.title || '')}"></label>
      <label>Date<input name="date" type="date" required value="${esc(edit.date || today())}"></label>
      <label>Time<input name="time" type="time" value="${esc(edit.time || '')}"></label>
      <label>Note<textarea name="note" maxlength="400" rows="2">${esc(edit.note || '')}</textarea></label>
      <label>Reminder<select name="remind">
        ${[['none', 'No reminder'], ['at', 'At the time'], ['m15', '15 minutes before'], ['h1', '1 hour before'], ['d1', '1 day before']].map(([k, lab]) => `<option value="${k}"${edit.remind === k ? ' selected' : ''}>${lab}</option>`).join('')}
      </select></label>
      <p class="calnote">Reminders show while Info Book is open. Add to phone calendar if you need a reminder when it is closed.</p>
      <div class="xbtns"><button class="btn pri" type="submit">Save</button><button class="btn" type="button" data-calback>Cancel</button></div>
    </form>` : '';
    return `<div class="calwrap"><button type="button" class="backpill" data-calclose>← Back to feed</button>
      <h2>📅 Calendar</h2>
      <div class="calgrid">${cells}</div>
      ${form}
      <div class="xbtns"><button type="button" class="btn pri" data-calnew>Add something</button></div>
      <h3>Coming up</h3>
      ${upcoming.length ? `<ul class="callist">${upcoming.map(e => `<li><b>${esc(e.title)}</b><small>${esc(e.date)}${e.time ? ' · ' + esc(e.time) : ''}${e.remind !== 'none' ? ' · reminder' : ''}</small>
        <span><button type="button" data-caledit="${esc(e.id)}">Edit</button><button type="button" data-calics="${esc(e.id)}">Add to phone calendar</button><button type="button" data-caldel="${esc(e.id)}">Delete</button></span></li>`).join('')}</ul>` : '<p>Nothing saved yet.</p>'}
      </div>`;
  }
  function draw() { const feed = root.document.getElementById('feed'); if (feed) feed.innerHTML = viewHtml(); const sh = root.document.getElementById('stories-host'); if (sh) sh.innerHTML = ''; }
  function open(pre) { on = true; root.ibCalOn = true; edit = pre || null; draw(); root.scrollTo(0, 0); }
  root.ibCalOpen = open;
  root.ibCalDraw = function () { if (on) draw(); };
  root.ibSoon = function () { on = false; root.ibCalOn = false; const el = root.document.querySelector('[data-id="gamesoon"]'); if (el) el.scrollIntoView({ block: 'start' }); else root.alert('Games are coming soon. Nothing to play yet.'); };

  async function askNotify() {
    if (!root.Notification || Notification.permission !== 'default') return Notification && Notification.permission;
    const ok = root.confirm('Info Book can remind you while it is open. Allow notifications on this phone? You can also turn on a gentle come-back note every couple of days.');
    if (!ok) return 'default';
    const perm = await Notification.requestPermission();
    if (perm === 'granted' && root.ibComeOpt) root.ibComeOpt(true);
    return perm;
  }
  async function notify(e) {
    const body = e.title + (e.time ? ' · ' + e.time : '');
    let ban = root.document.getElementById('calban');
    if (!ban) { ban = root.document.createElement('button'); ban.id = 'calban'; ban.type = 'button'; root.document.body.append(ban); }
    ban.hidden = false; ban.textContent = '📅 ' + body; ban.onclick = () => { ban.hidden = true; open(e); };
    if (root.Notification && Notification.permission === 'granted' && root.navigator.serviceWorker) {
      try { const reg = await navigator.serviceWorker.ready; reg.showNotification('Info Book', { body, tag: 'cal-' + e.id, icon: 'icons/icon-192.png' }); } catch (err) {}
    }
  }
  function tick() {
    const now = Date.now();
    due(now).forEach(e => { markFired(e.id, now); notify(e); });
  }
  setInterval(tick, 30000); root.addEventListener('visibilitychange', tick); setTimeout(tick, 1500);

  root.document.addEventListener('click', e => {
    const t = e.target; if (!t || !t.closest) return;
    if (t.closest('[data-calclose]')) { on = false; root.ibCalOn = false; if (typeof root.draw === 'function') root.draw(); return; }
    if (t.closest('[data-calnew]')) { edit = { date: today(), remind: 'none', title: '' }; draw(); return; }
    const day = t.closest('[data-calday]'); if (day) { edit = { date: day.dataset.calday, remind: 'none', title: '' }; draw(); return; }
    const ed = t.closest('[data-caledit]'); if (ed) { edit = load().find(x => x.id === ed.dataset.caledit) || null; draw(); return; }
    const del = t.closest('[data-caldel]'); if (del) { remove(del.dataset.caldel); draw(); return; }
    const icsBtn = t.closest('[data-calics]'); if (icsBtn) { const item = load().find(x => x.id === icsBtn.dataset.calics); if (item) download(item); return; }
    if (t.closest('[data-calback]')) { edit = null; draw(); return; }
    const add = t.closest('[data-caladd]'); if (add) { try { open(JSON.parse(decodeURIComponent(add.dataset.caladd))); } catch (err) {} return; }
  });
  root.document.addEventListener('submit', e => {
    const f = e.target; if (!f || !f.matches || !f.matches('[data-calform]')) return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(f).entries());
    data.id = edit && edit.id; data.url = edit && edit.url;
    const saved = upsert(data);
    edit = null;
    if (saved && saved.remind !== 'none') askNotify();
    draw();
  });

  const prevCard = root.card;
  root.card = function (i) {
    if (i && i.x === 'gamesoon') return `<article class="card soon" data-id="gamesoon" style="--c1:#7c3aed;--c2:#f59e0b"><div class="hd"><div class="av">🎮</div><div class="who"><b>Info Book</b><small>Not a game yet</small></div><span class="tp">Games</span></div><div class="soonband" aria-hidden="true">🎮 🎲 🧩</div><div class="bd"><h3>Games — coming soon</h3><ul class="sum open" data-more aria-expanded="true"><li>New games are on the way.</li><li>Nothing here plays yet.</li></ul></div></article>`;
    const html = prevCard ? prevCard(i) : '';
    const b = btn(i); if (!b || !html) return html;
    if (html.includes('<div class="xbtns">')) return html.replace('<div class="xbtns">', '<div class="xbtns">' + b);
    return html.replace('<div class="ft">', '<div class="ft">' + b);
  };
  const prevFest = root.festive;
  root.festive = function (order, nPins) {
    order = prevFest ? prevFest(order, nPins) : (order || []);
    if (order.some(x => x && x.x === 'gamesoon')) return order;
    const at = Math.min(order.length, Math.max(nPins | 0, 2) + 16);
    order.splice(at, 0, { id: 'gamesoon', x: 'gamesoon', topic: 'games', t: 'Games' });
    return order;
  };
})(typeof window !== 'undefined' ? window : globalThis);
