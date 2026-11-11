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
    // NZ is UTC+13 in daylight time and UTC+12 in standard time. Try both and keep the one that displays as this clock.
    for (const off of ['+13:00', '+12:00']) {
      const ms = Date.parse(date + 'T' + clock + ':00' + off);
      if (!isFinite(ms)) continue;
      const got = nzParts(ms);
      if (got.date === date && got.time === clock) return ms;
    }
    return NaN;
  }
  function load() {
    let list = [];
    try { list = (typeof ls !== 'undefined' && ls.get(KEY, [])) || []; } catch (e) { list = []; }
    let changed = false;
    const next = list.map(e => {
      if (!e || !['tv', 'movie', 'event'].includes(e.kind)) return e;
      if (typeof e.at === 'number' && isFinite(e.at)) return e;
      if (!e.date || !e.time) return e;
      const at = aucklandMs(e.date, e.time);
      if (!isFinite(at)) return e;
      changed = true;
      return { ...e, at };
    });
    if (changed) save(next);
    return changed ? next : list;
  }
  function save(list) { try { if (typeof ls !== 'undefined') ls.set(KEY, list); } catch (e) {} }
  function clean(e) {
    const title = String(e.title || '').trim().slice(0, 120);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(e.date || '') ? e.date : '';
    const time = /^\d{2}:\d{2}$/.test(e.time || '') ? e.time : '';
    const note = String(e.note || '').trim().slice(0, 400);
    const remind = REMIND[e.remind] == null && e.remind !== 'none' ? 'none' : (e.remind || 'none');
    const kind = ['tv', 'movie', 'event', 'own'].includes(e.kind) ? e.kind : 'own';
    if (!title || !date) return null;
    let at = typeof e.at === 'number' && isFinite(e.at) ? e.at : NaN;
    if (time) {
      const wall = isFinite(at) ? nzParts(at) : { date: '', time: '' };
      if (!isFinite(at) || wall.date !== date || wall.time !== time) at = aucklandMs(date, time);
    }
    return { id: e.id || ('c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), title, date, time, note, remind, kind, url: String(e.url || '').slice(0, 400), fired: e.fired || '', at: isFinite(at) ? at : undefined };
  }
  function upsert(raw) {
    const e = clean(raw); if (!e) return null;
    const list = load().filter(x => x.id !== e.id);
    list.push(e); save(list); return e;
  }
  function remove(id) { save(load().filter(x => x.id !== id)); }
  function startMs(e) {
    if (e && typeof e.at === 'number' && isFinite(e.at)) return e.at;
    return aucklandMs(e && e.date, e && e.time);
  }
  function fireMs(e) {
    const start = startMs(e);
    if (!isFinite(start) || REMIND[e.remind] == null) return NaN;
    return start - REMIND[e.remind];
  }
  function due(now) {
    return load().filter(e => {
      const f = fireMs(e); if (!isFinite(f)) return false;
      const end = startMs(e) + 2 * 3600000;
      return now >= f && now <= end && e.fired !== String(f);
    });
  }
  function markFired(id, now) {
    const list = load(); const e = list.find(x => x.id === id); if (!e) return;
    e.fired = String(fireMs(e)); save(list);
  }
  function icsUtc(ms) {
    const d = new Date(ms), p = n => String(n).padStart(2, '0');
    return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
  }
  function ics(e) {
    const start = startMs(e.time ? e : { ...e, time: e.time || '09:00' });
    const trigger = e.remind === 'm15' ? '-PT15M' : e.remind === 'h1' ? '-PT1H' : e.remind === 'd1' ? '-P1D' : e.remind === 'at' ? '-PT0M' : '';
    const text = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&');
    const alarm = trigger ? 'BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:' + text(e.title) + '\r\nTRIGGER:' + trigger + '\r\nEND:VALARM\r\n' : '';
    const when = isFinite(start) ? 'DTSTART:' + icsUtc(start) + '\r\n' : '';
    return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Info Book//Calendar//EN\r\nBEGIN:VEVENT\r\nUID:' + e.id + '@infobook\r\n' + when + 'SUMMARY:' + text(e.title) + '\r\nDESCRIPTION:' + text(e.note) + '\r\n' + alarm + 'END:VEVENT\r\nEND:VCALENDAR\r\n';
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
    return { title, date: p.date, time: p.time, at: ms, note: note || '', url: url || '', remind: 'm15' };
  }
  function prefill(i, now) {
    if (!i) return null;
    now = now == null ? Date.now() : now;
    const keep = p => (!p || (typeof p.at === 'number' && p.at < now)) ? null : p;
    if (i.x === 'cine' && i.film && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(i.film.next || '')) {
      const [date, time] = i.film.next.split('T');
      const at = aucklandMs(date, time);
      return keep({ title: i.film.title, date, time, at: isFinite(at) ? at : undefined, note: 'Event Cinemas Whangārei, 18 James Street. ' + (i.film.rating || ''), url: i.film.sessions || i.film.link || '', remind: 'h1', kind: 'movie' });
    }
    if (i.x === 'watch' && i.w && !/^(Stan|Neon)$/i.test(i.w.plat || '') && !/neon|stan\.(com|news)/i.test(i.w.url || '')) {
      const w = i.w;
      const day = /^\d{4}-\d{2}-\d{2}$/.test(w.day || '') ? w.day : (typeof w.ev === 'number' ? nzParts(w.ev).date : '');
      let time = '';
      if (typeof w.ev === 'number') { const clock = nzParts(w.ev).time; if (clock !== '12:00') time = clock; }
      const at = time ? aucklandMs(day, time) : undefined;
      return keep({ title: w.t, date: day, time, at: at && isFinite(at) ? at : undefined, note: 'On ' + (w.plat || 'NZ TV'), url: w.url || '', remind: 'm15', tv: 1, kind: 'tv' });
    }
    if (i.x === 'concert' && i.c && typeof i.c.ev === 'number') { const p = fromMs(i.c.ev, i.c.t, (i.c.venue || 'Auckland') + ', Auckland', i.c.url); return keep(p && { ...p, kind: 'event' }); }
    if (i.kind === 'tv' && (NZ_TV.has(i.src) || NZ_HOST.test(hostOf(i.url || '')))) {
      if (typeof i.ev !== 'number') return { title: i.t, date: '', time: '', note: i.where ? 'On ' + i.where : '', url: i.url || '', remind: 'm15', tv: 1, kind: 'tv' };
      const p = fromMs(i.ev, i.t, i.where ? 'On ' + i.where : '', i.url);
      return keep(p && { ...p, tv: 1, kind: 'tv' });
    }
    if (i.kind === 'event' && typeof i.ev === 'number') { const p = fromMs(i.ev, i.t, i.s || '', i.url); return keep(p && { ...p, kind: 'event' }); }
    return null;
  }
  function packOf(p) {
    return encodeURIComponent(JSON.stringify({ title: p.title, date: p.date || '', time: p.time || '', note: p.note || '', url: p.url || '', remind: p.remind || 'm15', tv: p.tv ? 1 : 0, kind: p.kind || (p.tv ? 'tv' : 'own') }));
  }
  function btn(raw) {
    const p = raw && raw.title && raw.date !== undefined && !raw.kind && !raw.x ? raw : prefill(raw);
    if (!p || (!p.date && !p.tv)) return '';
    const pack = packOf(p);
    const label = p.tv ? 'Add reminder' : 'Add to calendar';
    return `<button type="button" class="btn" data-caladd="${pack}">${label}</button>`;
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
    const dots = kinds => kinds.length ? `<span class="caldots" aria-hidden="true">${kinds.slice(0, 4).map(k => `<i class="cdot ${esc(k)}"></i>`).join('')}</span>` : '';
    let cells = '';
    for (let i = 0; i < start; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const ds = month + '-' + String(d).padStart(2, '0');
      const kinds = ((all) => { const u = [...new Set(all)]; return u.concat(all.filter((k, n) => all.indexOf(k) !== n)).slice(0, 4); })(list.filter(e => e.date === ds).map(e => e.kind || 'own'));
      cells += `<button type="button" data-calday="${ds}" class="${ds === today() ? 'today' : ''}${kinds.length ? ' has' : ''}"><span class="calnum">${d}</span>${dots(kinds)}</button>`;
    }
    const shown = e => (typeof e.at === 'number' && isFinite(e.at)) ? nzParts(e.at) : { date: e.date, time: e.time };
    const upcoming = list.filter(e => shown(e).date >= today()).slice(0, 12);
    const form = edit ? `<form class="calform" data-calform>
      <label>Title<input name="title" required maxlength="120" value="${esc(edit.title || '')}"></label>
      <label>Date<input name="date" type="date" required value="${esc(edit.date || today())}"></label>
      <label>Time<input name="time" type="time" value="${esc(edit.time || '')}"></label>
      <label>Note<textarea name="note" maxlength="400" rows="2">${esc(edit.note || '')}</textarea></label>
      <label>Reminder<select name="remind">
        ${[['none', 'No reminder'], ['at', 'At the time'], ['m15', '15 minutes before'], ['h1', '1 hour before'], ['d1', '1 day before']].map(([k, lab]) => `<option value="${k}"${edit.remind === k ? ' selected' : ''}>${lab}</option>`).join('')}
      </select></label>
      <input type="hidden" name="kind" value="${esc(edit.kind || 'own')}">
      <p class="calnote">Reminders show while Info Book is open. Add to phone calendar if you need a reminder when it is closed.</p>
      <div class="xbtns"><button class="btn pri" type="submit">Save</button><button class="btn" type="button" data-calback>Cancel</button></div>
    </form>` : '';
    return `<div class="calwrap"><button type="button" class="backpill" data-calclose>← Back to feed</button>
      <div class="calmark" aria-hidden="true"><i class="cdot tv"></i><i class="cdot movie"></i><i class="cdot event"></i><i class="cdot own"></i></div>
      <h2>Calendar</h2>
      <p class="calkey"><i class="cdot tv"></i> TV <i class="cdot movie"></i> Movies <i class="cdot event"></i> Events <i class="cdot own"></i> Yours</p>
      <div class="calgrid">${cells}</div>
      ${form}
      <div class="xbtns"><button type="button" class="btn pri" data-calnew>Add something</button></div>
      <h3>Coming up</h3>
      ${upcoming.length ? `<ul class="callist">${upcoming.map(e => { const s = shown(e); return `<li><b><i class="cdot ${esc(e.kind || 'own')}"></i> ${esc(e.title)}</b><small>${esc(s.date)}${s.time ? ' · ' + esc(s.time) + ' NZ' : ''}${e.remind !== 'none' ? ' · reminder' : ''}</small>
        <span><button type="button" data-caledit="${esc(e.id)}">Edit</button><button type="button" data-calics="${esc(e.id)}">Add to phone calendar</button><button type="button" data-caldel="${esc(e.id)}">Delete</button></span></li>`; }).join('')}</ul>` : '<p>Nothing saved yet.</p>'}
      </div>`;
  }
  function draw() { const feed = root.document.getElementById('feed'); if (feed) feed.innerHTML = viewHtml(); const sh = root.document.getElementById('stories-host'); if (sh) sh.innerHTML = ''; }
  function open(pre) { on = true; root.ibCalOn = true; edit = pre || null; draw(); root.scrollTo(0, 0); }
  root.ibCalOpen = open;
  root.ibCalDraw = function () { if (on) draw(); };
  root.ibSoon = function () { on = false; root.ibCalOn = false; const el = root.document.querySelector('[data-id="gamesoon"]'); if (el) el.scrollIntoView({ block: 'start' }); else root.alert('Scroll the feed to find the Games card and play Tetris or Scrabble.'); };

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
    const add = t.closest('[data-caladd]'); if (add) { try { const p = JSON.parse(decodeURIComponent(add.dataset.caladd)); if (p.tv) showReminder(p); else open(p); } catch (err) {} return; }
  });
  function showReminder(p) {
    const sheet = root.document.getElementById('sheet'), box = root.document.getElementById('sheetin');
    if (!sheet || !box) { open(p); return; }
    const when = p.time ? esc(p.date) + ' · ' + esc(p.time) + ' New Zealand time' : (p.date ? esc(p.date) + ' · no air time was listed, so you can add one' : 'No date or time was listed. Add them yourself.');
    box.innerHTML = `<h2>Add reminder</h2><p><b>${esc(p.title || '')}</b></p><p>${when}</p><p class="calnote">${esc(p.note || '')}</p>
      <form class="calform" data-tvform>
        ${p.date ? `<input type="hidden" name="date" value="${esc(p.date)}">` : '<label>Date<input name="date" type="date" required></label>'}
        <label>Time<input name="time" type="time" value="${esc(p.time || '')}"></label>
        <label>Remind me<select name="remind">
          ${[['at', 'At the time'], ['m15', '15 minutes before'], ['h1', '1 hour before'], ['d1', '1 day before'], ['none', 'Save without a reminder']].map(([k, lab]) => `<option value="${k}"${(p.remind || 'm15') === k ? ' selected' : ''}>${lab}</option>`).join('')}
        </select></label>
        <input type="hidden" name="title" value="${esc(p.title || '')}">
        <input type="hidden" name="note" value="${esc(p.note || '')}">
        <input type="hidden" name="url" value="${esc(p.url || '')}">
        <input type="hidden" name="kind" value="${esc(p.kind || 'tv')}">
        <div class="xbtns"><button class="btn pri" type="submit">Save reminder</button><button class="btn" type="button" data-close>Close</button></div>
      </form>`;
    sheet.classList.add('on');
  }
  root.document.addEventListener('submit', e => {
    const tv = e.target && e.target.matches && e.target.matches('[data-tvform]');
    if (!tv) return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const saved = upsert(data);
    const sheet = root.document.getElementById('sheet'); if (sheet) sheet.classList.remove('on');
    if (saved && saved.remind !== 'none') askNotify();
    if (root.toast) root.toast(saved ? 'Reminder saved' : 'Add a title and a date first');
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
    // 1.9.156 Sugar Rush is playable for Shane only (IBScores.isShane()); others still see it as coming soon
    const sugar = !!(i && i.x === 'gamesoon' && root.IBScores && root.IBScores.isShane());
    if (i && i.x === 'gamesoon') return `<article class="card soon" data-id="gamesoon" style="--c1:#7c3aed;--c2:#f59e0b"><div class="hd"><div class="av">🎮</div><div class="who"><b>Info Book</b><small>Tetris and Scrabble are ready</small></div><span class="tp">Games</span></div><div class="soonband" aria-hidden="true">🎮 🎲 🧩</div><div class="bd"><h3>Games</h3><ul class="sum open" data-more aria-expanded="true"><li>Tetris opens here. Tap the board to start. Sound starts then too.</li><li>Scrabble: play the computer, or pass the phone round the family.</li></ul><div class="xbtns"><button type="button" class="btn pri" data-art="tetris">Play Tetris</button><button type="button" class="btn pri" data-art="scrabble">Play Scrabble</button>${sugar ? '<button type="button" class="btn pri" data-art="sugar">Play Sugar Rush</button>' : ''}</div>${sugar ? '' : '<p class="soonnames"><span>Coming soon: Sugar Rush 🍬, a Candy Crush style matching game</span></p>'}</div></article>`;
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
