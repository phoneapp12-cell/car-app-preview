/* 1.9.118 Info Book calendar. Entries stay on this phone, in the same per-member
   localStorage as the rest of the feed (ls). A home-screen PWA does not get a
   reliable timer once the page is closed, so a reminder banner and a notification
   only fire while Info Book is open. Add to phone calendar downloads an .ics file,
   which is the reminder that still works when the app is shut.
   1.9.287 adds a book-style Day / Week / Month / Year reader, with a page-turn
   swipe, a Monday week start, and NZ public holidays from the same Holidays Act
   2003 / Matariki schedule already used in My App (core.js / DD.nzHolidays).
   1.9.289 adds an honest NZTA Check Expiry card: a link to the official page and
   date fields the person fills in. Shared /cars dates also show, labelled by owner.
   Nothing about cars is added to the feed. */
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
    const kind = ['tv', 'movie', 'event', 'own', 'wof', 'rego'].includes(e.kind) ? e.kind : 'own';
    const plate = String(e.plate || '').toUpperCase().replace(/\s+/g, '').slice(0, 8);
    if (!title || !date) return null;
    let at = typeof e.at === 'number' && isFinite(e.at) ? e.at : NaN;
    if (time) {
      const wall = isFinite(at) ? nzParts(at) : { date: '', time: '' };
      if (!isFinite(at) || wall.date !== date || wall.time !== time) at = aucklandMs(date, time);
    }
    return { id: e.id || ('c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), title, date, time, note, remind, kind, plate: plate || undefined, url: String(e.url || '').slice(0, 400), fired: e.fired || '', at: isFinite(at) ? at : undefined };
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
  // book helpers assigned after they are declared


  if (!root.document) return;


  /* ---- 1.9.287 book views. Holidays reuse the existing My App source. ---- */
  const DAY_MS = 864e5;
  const MONL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const WDL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const pad2 = n => String(n).padStart(2, '0');
  function parseIso(s) {
    const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? { y: +m[1], mo: +m[2], d: +m[3] } : null;
  }
  function isoYmd(y, mo, d) { return y + '-' + pad2(mo) + '-' + pad2(d); }
  function isoT(t) { const d = new Date(t); return isoYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
  function parseD(s) { const p = parseIso(s); return p ? Date.UTC(p.y, p.mo - 1, p.d) : null; }
  function addDays(s, n) { const t = parseD(s); return t == null ? s : isoT(t + n * DAY_MS); }
  function addMonths(s, n) {
    const p = parseIso(s); if (!p) return s;
    const dim = new Date(Date.UTC(p.y, p.mo - 1 + n + 1, 0)).getUTCDate();
    return isoT(Date.UTC(p.y, p.mo - 1 + n, Math.min(p.d, dim)));
  }
  function weekStart(s) {
    const t = parseD(s); if (t == null) return s;
    const back = (new Date(t).getUTCDay() + 6) % 7;
    return isoT(t - back * DAY_MS);
  }
  function monthLabel(s) { const p = parseIso(s) || parseIso(today()); return MONL[p.mo - 1] + ' ' + p.y; }
  function dayLabel(s) {
    const p = parseIso(s); if (!p) return s;
    return WDL[new Date(parseD(s)).getUTCDay()] + ' ' + p.d + ' ' + MONL[p.mo - 1] + ' ' + p.y;
  }
  function weekLabel(s) {
    const a = weekStart(s), b = addDays(a, 6);
    const pa = parseIso(a), pb = parseIso(b);
    if (pa.y !== pb.y) return pa.d + ' ' + MONL[pa.mo - 1] + ' ' + pa.y + ' – ' + pb.d + ' ' + MONL[pb.mo - 1] + ' ' + pb.y;
    if (pa.mo !== pb.mo) return pa.d + ' ' + MONL[pa.mo - 1] + ' – ' + pb.d + ' ' + MONL[pb.mo - 1] + ' ' + pb.y;
    return pa.d + '–' + pb.d + ' ' + MONL[pa.mo - 1] + ' ' + pa.y;
  }
  function monthGrid(month) {
    const first = month + '-01';
    const [y, mo] = month.split('-').map(Number);
    const last = isoYmd(y, mo, new Date(Date.UTC(y, mo, 0)).getUTCDate());
    const cells = [];
    let d = weekStart(first);
    for (let i = 0; i < 42; i++) {
      cells.push({ date: d, mute: d.slice(0, 7) !== month, n: +d.slice(8) });
      if (d >= last && new Date(parseD(d)).getUTCDay() === 0) break;
      d = addDays(d, 1);
    }
    return cells;
  }

  /* Same holiday rules as core.js (Holidays Act 2003 and the Matariki schedule).
     Prefer DD.nzHolidays when My App has already loaded that file. Do not invent dates. */
  const MATARIKI = { 2022: '06-24', 2023: '07-14', 2024: '06-28', 2025: '06-20', 2026: '07-10', 2027: '06-25', 2028: '07-14', 2029: '07-06',
    2030: '06-21', 2031: '07-11', 2032: '07-02', 2033: '06-24', 2034: '07-07', 2035: '06-29', 2036: '07-18', 2037: '07-10', 2038: '06-25',
    2039: '07-15', 2040: '07-06', 2041: '07-19', 2042: '07-11', 2043: '07-03', 2044: '06-24', 2045: '07-07', 2046: '06-29', 2047: '07-19',
    2048: '07-03', 2049: '06-25', 2050: '07-15', 2051: '06-30', 2052: '06-21' };
  function easterT(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g2 = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g2 + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(y, mo - 1, da);
  }
  const holCache = {};
  function localNzHolidays(y) {
    if (holCache[y]) return holCache[y];
    const D = (mo, d) => Date.UTC(y, mo - 1, d), wd = t => new Date(t).getUTCDay(), out = [];
    const add = (t, name, kw, extra) => out.push(Object.assign({ date: isoT(t), name, kw }, extra || {}));
    const obs = (t, name, kw, ot) => {
      add(t, name, kw, ot ? { observedOn: isoT(ot) } : null);
      if (ot) add(ot, name + ' (observed)', kw, { observedFor: isoT(t) });
    };
    const mondayise = t => wd(t) === 6 ? t + 2 * DAY_MS : wd(t) === 0 ? t + DAY_MS : null;
    const pair = (a, n1, k1, n2, k2) => {
      const b = a + DAY_MS, w = wd(a);
      obs(a, n1, k1, w === 6 || w === 0 ? a + 2 * DAY_MS : null);
      obs(b, n2, k2, w === 6 ? a + 3 * DAY_MS : w === 5 ? b + 2 * DAY_MS : null);
    };
    pair(D(1, 1), 'New Year’s Day', ['new year'], 'Day after New Year’s Day', ['new year']);
    const j29 = D(1, 29), back = (wd(j29) + 6) % 7;
    add(back <= 3 ? j29 - back * DAY_MS : j29 + (7 - back) * DAY_MS, 'Auckland Anniversary Day', ['auckland', 'northland', 'anniversary'], { regional: 'Northland’s regional holiday' });
    obs(D(2, 6), 'Waitangi Day', ['waitangi'], mondayise(D(2, 6)));
    const e = easterT(y);
    add(e - 2 * DAY_MS, 'Good Friday', ['good friday']);
    add(e + DAY_MS, 'Easter Monday', ['easter monday']);
    obs(D(4, 25), 'ANZAC Day', ['anzac'], mondayise(D(4, 25)));
    const j1 = D(6, 1); add(j1 + ((8 - wd(j1)) % 7) * DAY_MS, 'King’s Birthday', ['king', 'sovereign', 'queen']);
    if (MATARIKI[y]) add(parseD(y + '-' + MATARIKI[y]), 'Matariki', ['matariki']);
    const o1 = D(10, 1); add(o1 + ((8 - wd(o1)) % 7) * DAY_MS + 21 * DAY_MS, 'Labour Day', ['labour']);
    pair(D(12, 25), 'Christmas Day', ['christmas day'], 'Boxing Day', ['boxing']);
    out.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    return (holCache[y] = out);
  }
  function holidaysOfYear(y) {
    if (root.DD && typeof root.DD.nzHolidays === 'function') {
      try { return root.DD.nzHolidays(y) || []; } catch (err) {}
    }
    return localNzHolidays(y);
  }
  function isFriend() {
    try { if (typeof IS_FRIEND !== 'undefined') return !!IS_FRIEND; } catch (err) {}
    return !!(root.IS_FRIEND);
  }
  function familyDateList() {
    try { if (typeof X !== 'undefined' && X && Array.isArray(X.dates)) return X.dates; } catch (err) {}
    if (root.X && Array.isArray(root.X.dates)) return root.X.dates;
    return [];
  }
  function familyEvents(from, to) {
    if (isFriend()) return [];
    const list = familyDateList();
    const out = [];
    const years = [];
    const fy = from ? +from.slice(0, 4) : +today().slice(0, 4);
    const ty = to ? +to.slice(0, 4) : fy;
    for (let y = fy; y <= ty; y++) years.push(y);
    for (const d of list) {
      if (!d || !d.m || !d.d) continue;
      const title = String(d.title || (d.kind === 'bday' ? 'Birthday' : 'Event')).trim();
      if (!title) continue;
      const kind = d.kind === 'bday' ? 'bday' : 'family';
      for (const y of years) {
        if (d.y && kind !== 'bday' && +d.y !== y) continue;
        const date = isoYmd(y, d.m, d.d);
        if (from && date < from) continue;
        if (to && date > to) continue;
        out.push({ date, time: d.time || '', title, kind, src: 'family', readOnly: true, icon: kind === 'bday' ? '🎂' : '🎉' });
      }
    }
    return out;
  }
  function holidayEvents(from, to) {
    const out = [];
    const fy = from ? +from.slice(0, 4) : +today().slice(0, 4);
    const ty = to ? +to.slice(0, 4) : fy;
    for (let y = fy; y <= ty; y++) {
      for (const h of holidaysOfYear(y)) {
        if (from && h.date < from) continue;
        if (to && h.date > to) continue;
        out.push({ date: h.date, time: '', title: h.name, kind: 'holiday', src: 'holiday', readOnly: true, icon: '🇳🇿', note: h.regional || '' });
      }
    }
    return out;
  }
  const NZTA_EXPIRY = 'https://transact.nzta.govt.nz/v2/check-expiry';
  const NZTA_NOTE = 'Source: NZTA Check Expiry — dates entered after checking the official page (or the windscreen stickers).';
  function carShareList() {
    if (isFriend()) return [];
    try { if (typeof X !== 'undefined' && X && Array.isArray(X.cars)) return X.cars; } catch (err) {}
    if (root.X && Array.isArray(root.X.cars)) return root.X.cars;
    return [];
  }
  function carLabel(row) {
    const c = (row && row.car) || {};
    const name = String(c.name || '').trim();
    if (name) return name;
    const who = String((row && row.name) || '').trim();
    const plate = String(c.plate || (row && row.plate) || '').toUpperCase().replace(/\s+/g, '');
    if (who && plate) return who + ' (' + plate + ')';
    return who || plate || 'Car';
  }
  /* Shared /cars dates (GET only). The Worker already limits this list: Shane sees every
     shared car, other members see only the car shared with them, friends get none. */
  function carEvents(from, to) {
    const out = [];
    for (const row of carShareList()) {
      const c = row && row.car; if (!c) continue;
      const plate = String(c.plate || row.plate || '').toUpperCase().replace(/\s+/g, '');
      const label = carLabel(row);
      const bits = [[c.wof, 'wof', 'WOF', '🛡️'], [c.rego, 'rego', 'rego', '🚗'], [c.svc || c.svcDate, 'svc', 'service', '🔧']];
      for (const [date, part, word, icon] of bits) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) continue;
        if (from && date < from) continue;
        if (to && date > to) continue;
        out.push({ date, time: '', title: label + ' ' + word, kind: part === 'svc' ? 'event' : part, src: 'cars', plate, part, readOnly: true, icon, note: 'From the family car list in My App.' });
      }
    }
    return out;
  }
  function savePlateDates(raw) {
    const name = String((raw && raw.name) || '').trim().slice(0, 40);
    const plate = String((raw && raw.plate) || '').toUpperCase().replace(/\s+/g, '').slice(0, 8);
    const remind = (raw && raw.remind) || 'd1';
    const who = name || plate || 'Car';
    const saved = [];
    if (raw && raw.wof) {
      const e = upsert({ title: who + ' WOF', date: raw.wof, kind: 'wof', plate, remind, note: NZTA_NOTE, url: NZTA_EXPIRY });
      if (e) saved.push(e);
    }
    if (raw && raw.rego) {
      const e = upsert({ title: who + ' rego', date: raw.rego, kind: 'rego', plate, remind, note: NZTA_NOTE, url: NZTA_EXPIRY });
      if (e) saved.push(e);
    }
    return saved;
  }
  function plateCardHtml() {
    return `<section class="cal-plate" data-calplate>
      <h3>Add your car’s WOF &amp; rego</h3>
      <p>Check the official NZTA page, then enter the dates you were shown (or the dates on the windscreen stickers). We don’t look the dates up for you.</p>
      <p><a class="ibr-orig cal-nzta" href="${NZTA_EXPIRY}" target="_blank" rel="noopener noreferrer">Check expiry on NZTA (opens in a new tab)</a></p>
      <form class="calform" data-calplateform>
        <div class="cal-plate-row">
          <label>Car name (optional)<input name="name" maxlength="40" placeholder="e.g. Shane’s car" autocomplete="off"></label>
          <label>Plate (optional)<input name="plate" maxlength="8" placeholder="ABC123" autocapitalize="characters" spellcheck="false" style="text-transform:uppercase"></label>
        </div>
        <div class="cal-plate-row">
          <label>WOF due<input name="wof" type="date"></label>
          <label>Rego due<input name="rego" type="date"></label>
        </div>
        <label>Reminder<select name="remind">
          ${[['d1', '1 day before'], ['h1', '1 hour before'], ['at', 'On the day (9:00 am NZ)'], ['none', 'No reminder']].map(([k, lab]) => `<option value="${k}"${k === 'd1' ? ' selected' : ''}>${lab}</option>`).join('')}
        </select></label>
        <p class="calnote">Events stay on this phone, on your own calendar. Source: NZTA Check Expiry, or the windscreen stickers.</p>
        <div class="xbtns"><button class="btn pri" type="submit">Save to my calendar</button></div>
      </form>
    </section>`;
  }
  function ownEvents(from, to) {
    return load().filter(e => e && e.date && (!from || e.date >= from) && (!to || e.date <= to)).map(e => Object.assign({ src: 'cal', icon: e.kind === 'wof' ? '🛡️' : e.kind === 'rego' ? '🚗' : e.kind === 'tv' ? '📺' : e.kind === 'movie' ? '🎬' : e.kind === 'event' ? '🎉' : '📅', readOnly: false }, e));
  }
  function allEvents(from, to) {
    const own = ownEvents(from, to);
    const cars = carEvents(from, to).filter(ce => !own.some(o => o.date === ce.date && ((o.plate && ce.plate && o.plate === ce.plate && o.kind === ce.kind) || o.title === ce.title)));
    const evs = own.concat(cars, familyEvents(from, to), holidayEvents(from, to));
    evs.sort((a, b) => (a.date + (a.time || '') + a.title).localeCompare(b.date + (b.time || '') + b.title));
    return evs;
  }
  function evIcon(e) { return e.icon || (e.kind === 'wof' ? '🛡️' : e.kind === 'rego' ? '🚗' : e.kind === 'bday' ? '🎂' : e.kind === 'holiday' ? '🇳🇿' : e.kind === 'tv' ? '📺' : e.kind === 'movie' ? '🎬' : '📅'); }
  function dotsFor(date, evs) {
    const kinds = evs.filter(e => e.date === date).map(e => e.kind || 'own');
    const uniq = [];
    kinds.forEach(k => { if (!uniq.includes(k)) uniq.push(k); });
    if (!uniq.length) return '';
    return `<span class="caldots" aria-hidden="true">${uniq.slice(0, 4).map(k => `<i class="cdot ${esc(k)}"></i>`).join('')}</span>`;
  }
  function evRow(e, withDate) {
    const when = [withDate ? e.date : '', e.time ? e.time + ' NZ' : '', e.note || ''].filter(Boolean).join(' · ');
    const actions = e.readOnly || !e.id ? '' : `<span><button type="button" data-caledit="${esc(e.id)}">Edit</button><button type="button" data-calics="${esc(e.id)}">Add to phone calendar</button><button type="button" data-caldel="${esc(e.id)}">Delete</button></span>`;
    return `<div class="cal-ev"><em>${evIcon(e)}</em><div><b>${esc(e.title)}</b>${when ? `<small>${esc(when)}</small>` : ''}${actions}</div></div>`;
  }
  function evList(evs, empty) {
    if (!evs.length) return `<p class="cal-empty">${esc(empty || 'Nothing on this day.')}</p>`;
    return evs.map(e => evRow(e)).join('');
  }

  function monthOf(date) { return date.slice(0, 7); }
  function today() { return nzParts(Date.now()).date; }
  let on = false, edit = null, cursor = today(), view = 'month', turning = false;

  function setCalClass(v) {
    const h = root.document && root.document.documentElement;
    if (h && h.classList) h.classList.toggle('ib-cal-on', !!v);
  }
  function titleForView() {
    if (view === 'year') return String((parseIso(cursor) || parseIso(today())).y);
    if (view === 'week') return weekLabel(cursor);
    if (view === 'day') return dayLabel(cursor);
    return monthLabel(cursor);
  }
  function stepCursor(dir) {
    if (view === 'year') cursor = addMonths(cursor, dir * 12);
    else if (view === 'month') cursor = addMonths(cursor, dir);
    else if (view === 'week') cursor = addDays(cursor, dir * 7);
    else cursor = addDays(cursor, dir);
  }
  function monthPage(month, evs, mini) {
    const cells = monthGrid(month).map(c => {
      const cls = [c.mute ? 'mute' : '', c.date === today() ? 'today' : '', evs.some(e => e.date === c.date) ? 'has' : ''].filter(Boolean).join(' ');
      const inner = `<span class="calnum">${c.n}</span>${dotsFor(c.date, evs)}`;
      return mini
        ? `<span class="${cls}">${inner}</span>`
        : `<button type="button" data-calday="${c.date}" class="${cls}">${inner}</button>`;
    }).join('');
    const dows = DOW.map(d => `<span>${d}</span>`).join('');
    if (mini) {
      const [y, mo] = month.split('-').map(Number);
      return `<div class="cal-ymin" role="button" tabindex="0" data-calview="month" data-calgoto="${month}-01"><b>${MONL[mo - 1]}</b><div class="cal-dows">${dows}</div><div class="calgrid">${cells}</div></div>`;
    }
    return `<div class="cal-dows">${dows}</div><div class="calgrid">${cells}</div>`;
  }
  function yearPage(year, evs) {
    let html = '<div class="cal-year">';
    for (let mo = 1; mo <= 12; mo++) html += monthPage(year + '-' + pad2(mo), evs, true);
    return html + '</div>';
  }
  function weekPage(date, evs) {
    const start = weekStart(date);
    let html = '<ul class="cal-list">';
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const dayEvs = evs.filter(e => e.date === d);
      html += `<li class="${d === today() ? 'today' : ''}"><button type="button" class="when" data-calday="${d}">${esc(dayLabel(d))}</button>${evList(dayEvs, 'Nothing this day')}</li>`;
    }
    return html + '</ul>';
  }
  function dayPage(date, evs) {
    return `<ul class="cal-list"><li class="${date === today() ? 'today' : ''}"><span class="when">${esc(dayLabel(date))}</span>${evList(evs.filter(e => e.date === date), 'Nothing saved or listed for this day.')}</li></ul>`;
  }
  function rangeForView() {
    if (view === 'year') {
      const y = (parseIso(cursor) || parseIso(today())).y;
      return [y + '-01-01', y + '-12-31'];
    }
    if (view === 'week') {
      const a = weekStart(cursor);
      return [a, addDays(a, 6)];
    }
    if (view === 'day') return [cursor, cursor];
    const month = cursor.slice(0, 7);
    const cells = monthGrid(month);
    return [cells[0].date, cells[cells.length - 1].date];
  }

  function viewHtml() {
    const [from, to] = rangeForView();
    const evs = allEvents(from, to);
    const month = cursor.slice(0, 7);
    const year = String((parseIso(cursor) || parseIso(today())).y);
    let body = '';
    if (view === 'year') body = yearPage(year, evs);
    else if (view === 'week') body = weekPage(cursor, evs);
    else if (view === 'day') body = dayPage(cursor, evs);
    else {
      const monthEvs = evs.filter(e => e.date.slice(0, 7) === month);
      body = monthPage(month, evs, false) + (monthEvs.length ? `<ul class="cal-list cal-month-up">${monthEvs.map(e => `<li>${evRow(e, true)}</li>`).join('')}</ul>` : '');
    }
    const form = edit ? `<form class="calform" data-calform>
      <label>Title<input name="title" required maxlength="120" value="${esc(edit.title || '')}"></label>
      <label>Date<input name="date" type="date" required value="${esc(edit.date || cursor || today())}"></label>
      <label>Time<input name="time" type="time" value="${esc(edit.time || '')}"></label>
      <label>Note<textarea name="note" maxlength="400" rows="2">${esc(edit.note || '')}</textarea></label>
      <label>Reminder<select name="remind">
        ${[['none', 'No reminder'], ['at', 'At the time'], ['m15', '15 minutes before'], ['h1', '1 hour before'], ['d1', '1 day before']].map(([k, lab]) => `<option value="${k}"${edit.remind === k ? ' selected' : ''}>${lab}</option>`).join('')}
      </select></label>
      <input type="hidden" name="kind" value="${esc(edit.kind || 'own')}">
      <p class="calnote">Reminders show while Info Book is open. Add to phone calendar if you need a reminder when it is closed.</p>
      <div class="xbtns"><button class="btn pri" type="submit">Save</button><button class="btn" type="button" data-calback>Cancel</button></div>
    </form>` : '';
    const friend = isFriend();
    const key = friend
      ? `<p class="calkey"><i class="cdot own"></i> Yours <i class="cdot holiday"></i> NZ holidays <i class="cdot tv"></i> TV <i class="cdot movie"></i> Movies</p>`
      : `<p class="calkey"><i class="cdot own"></i> Yours <i class="cdot bday"></i> Family <i class="cdot holiday"></i> NZ holidays <i class="cdot wof"></i> Cars <i class="cdot tv"></i> TV <i class="cdot movie"></i> Movies</p>`;
    const segs = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']].map(([k, lab]) => `<button type="button" role="tab" aria-selected="${view === k ? 'true' : 'false'}" data-calview="${k}" class="${view === k ? 'on' : ''}">${lab}</button>`).join('');
    const extra = (view === 'month' || view === 'year') ? '' : '';
    return `<div class="calwrap calbook-wrap"><button type="button" class="backpill" data-calclose>← Back to feed</button>
      <header class="calbook-hd"><h2>Calendar</h2><div class="cal-seg" role="tablist">${segs}</div></header>
      ${key}
      <div class="calbook" data-calbook>
        <div class="cal-title"><h3>${esc(titleForView())}</h3><div class="cal-nav"><button type="button" data-calnav="-1" aria-label="Previous">‹</button><button type="button" data-calnav="1" aria-label="Next">›</button></div></div>
        <div class="calpage-stack">
          <div class="calpage calpage-under" aria-hidden="true"></div>
          <div class="calpage">${body}</div>
        </div>
      </div>
      ${form}
      <div class="xbtns"><button type="button" class="btn pri" data-calnew>Add something</button></div>
      ${plateCardHtml()}
      ${extra}
      </div>`;
  }
  function bindSwipe() {
    const book = root.document && root.document.querySelector && root.document.querySelector('[data-calbook]');
    if (!book || book.dataset.swipeBound) return;
    book.dataset.swipeBound = '1';
    let x0 = 0, y0 = 0, pid = null;
    book.addEventListener('pointerdown', e => {
      if (e.button && e.button !== 0) return;
      if (e.target.closest && e.target.closest('button, a, input, textarea, select, form, label')) return;
      x0 = e.clientX; y0 = e.clientY; pid = e.pointerId;
    });
    book.addEventListener('pointerup', e => {
      if (pid == null) return;
      pid = null;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      turn(dx < 0 ? 1 : -1);
    });
    book.addEventListener('pointercancel', () => { pid = null; });
  }
  function reduceMotion() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (err) { return false; }
  }
  function turn(dir) {
    if (turning) return;
    const book = root.document && root.document.querySelector && root.document.querySelector('[data-calbook]');
    const go = () => { turning = false; stepCursor(dir); draw(); };
    if (reduceMotion() || !book) { go(); return; }
    turning = true;
    book.classList.remove('cal-turn-next', 'cal-turn-prev', 'cal-turn-hold');
    void book.offsetWidth;
    book.classList.add(dir > 0 ? 'cal-turn-next' : 'cal-turn-prev');
    root.setTimeout(go, 520);
  }
  function draw() {
    if (root.document && root.document.documentElement) setCalClass(on);
    const feed = root.document && root.document.getElementById && root.document.getElementById('feed');
    if (feed) feed.innerHTML = viewHtml();
    const sh = root.document && root.document.getElementById && root.document.getElementById('stories-host');
    if (sh) sh.innerHTML = '';
    bindSwipe();
  }
  function open(pre) {
    on = true; root.ibCalOn = true; setCalClass(true);
    if (pre && pre.date) cursor = pre.date;
    else if (!cursor) cursor = today();
    edit = pre || null;
    draw();
    if (root.scrollTo) root.scrollTo(0, 0);
    refreshCars();
  }
  async function refreshCars() {
    if (isFriend()) return;
    try {
      if (typeof fam !== 'function') return;
      if (typeof FAM_ON === 'undefined' || !FAM_ON) return;
      const r = await fam('/cars');
      const list = r && r.cars;
      if (!Array.isArray(list)) return;
      try { if (typeof X !== 'undefined') X.cars = list; } catch (err) {}
      if (root.X) root.X.cars = list;
      if (on) draw();
    } catch (err) {}
  }
  root.ibCalOpen = open;
  root.ibCalClose = closeCal;
  root.ibCalDraw = function () { if (on) draw(); };
  Object.assign(root.ibCal, { weekStart, addDays, addMonths, monthGrid, holidaysOfYear, localNzHolidays, allEvents, familyEvents, holidayEvents, carEvents, carShareList, savePlateDates, plateCardHtml, NZTA_EXPIRY, isFriend, viewHtml,
    getView() { return view; }, setView(v) { view = v; }, getCursor() { return cursor; }, setCursor(d) { cursor = d; }, today, dayLabel, weekLabel, monthLabel, turn, reduceMotion });
  root.ibSoon = function () { on = false; root.ibCalOn = false; setCalClass(false); edit = null; const el = root.document && root.document.querySelector && root.document.querySelector('[data-id="gamesoon"]'); if (el) el.scrollIntoView({ block: 'start' }); else root.alert('Scroll the feed to find the Games card and play Tetris or Scrabble.'); };

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
      try { const reg = await navigator.serviceWorker.ready; reg.showNotification('Info Book', { body, tag: 'cal-' + e.id, icon: 'icons/icon-192-lb.png' }); } catch (err) {}
    }
  }
  function tick() {
    const now = Date.now();
    due(now).forEach(e => { markFired(e.id, now); notify(e); });
  }
  if (root.setInterval) root.setInterval(tick, 30000);
  if (root.addEventListener) root.addEventListener('visibilitychange', tick);
  if (root.setTimeout) root.setTimeout(tick, 1500);

  function closeCal() { on = false; root.ibCalOn = false; setCalClass(false); edit = null; }
  if (root.document && root.document.addEventListener) root.document.addEventListener('click', e => {
    const t = e.target; if (!t || !t.closest) return;
    if (t.closest('[data-calclose]')) { closeCal(); if (typeof root.draw === 'function') root.draw(); return; }
    if (t.closest('[data-calnew]')) { edit = { date: cursor || today(), remind: 'none', title: '' }; draw(); return; }
    const vbtn = t.closest('[data-calview]'); if (vbtn) { view = vbtn.dataset.calview || 'month'; const go = t.closest('[data-calgoto]') || vbtn.closest('[data-calgoto]'); if (go) cursor = go.dataset.calgoto; edit = null; draw(); return; }
    const go = t.closest('[data-calgoto]'); if (go) { cursor = go.dataset.calgoto; draw(); return; }
    const nav = t.closest('[data-calnav]'); if (nav) { turn(+nav.dataset.calnav); return; }
    const day = t.closest('[data-calday]'); if (day) { cursor = day.dataset.calday; view = 'day'; edit = null; draw(); return; }
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
  if (root.document && root.document.addEventListener) root.document.addEventListener('submit', e => {
    const tv = e.target && e.target.matches && e.target.matches('[data-tvform]');
    if (!tv) return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const saved = upsert(data);
    const sheet = root.document.getElementById('sheet'); if (sheet) sheet.classList.remove('on');
    if (saved && saved.remind !== 'none') askNotify();
    if (root.toast) root.toast(saved ? 'Reminder saved' : 'Add a title and a date first');
  });
  if (root.document && root.document.addEventListener) root.document.addEventListener('submit', e => {
    const pf = e.target; if (pf && pf.matches && pf.matches('[data-calplateform]')) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(pf).entries());
      const saved = savePlateDates(data);
      if (!saved.length) { if (root.toast) root.toast('Add a WOF or rego date first'); return; }
      if (saved.some(x => x.remind !== 'none') && typeof askNotify === 'function') askNotify();
      pf.reset();
      if (root.toast) root.toast(saved.length === 2 ? 'WOF and rego saved to your calendar' : (saved[0].kind === 'wof' ? 'WOF saved to your calendar' : 'Rego saved to your calendar'));
      draw();
      return;
    }
  });
  if (root.document && root.document.addEventListener) root.document.addEventListener('submit', e => {
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
    // 1.9.228 Sugar Rush is playable for every family member (Shane-only from 1.9.156 to 1.9.227)
    const sugar = !!(i && i.x === 'gamesoon');
    if (i && i.x === 'gamesoon') return `<article class="card soon" data-id="gamesoon" style="--c1:#7c3aed;--c2:#f59e0b"><div class="hd"><div class="av">🎮</div><div class="who"><b>Info Book</b><small>Tetris, Scrabble and Sugar Rush are ready</small></div><span class="tp">Games</span></div><div class="soonband" aria-hidden="true">🎮 🎲 🧩</div><div class="bd"><h3>Games</h3><ul class="sum open" data-more aria-expanded="true"><li>Tetris opens here. Tap the board to start. Sound starts then too.</li><li>Scrabble: play the computer, pass the phone, or challenge a family member over the internet.</li><li>Sugar Rush 🍬: our sweet-shop matching game. Travel the candy map from Onerahi to Australia, race the family and send each other lives.</li></ul><div class="xbtns"><button type="button" class="btn pri" data-art="tetris">Play Tetris</button><button type="button" class="btn pri" data-art="scrabble">Play Scrabble</button>${sugar ? '<button type="button" class="btn pri" data-art="sugar">Play Sugar Rush</button>' : ''}</div></div></article>`;
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
