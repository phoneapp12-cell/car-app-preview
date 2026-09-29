/* Car & Life Due Dates – shared code used by both the page (app.js) and the service worker (sw.js).
   Everything is stored on the device in IndexedDB. Nothing is sent anywhere. */
(function (g) {
  'use strict';
  const DAY = 864e5;
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const WDL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const pad = n => String(n).padStart(2, '0');

  /* ---------- dates: stored as 'YYYY-MM-DD' strings, maths done on UTC midnights ---------- */
  const todayT = (now = new Date()) => Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const parseD = s => { if (!s || typeof s !== 'string') return null; const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; };
  const isoT = t => { const d = new Date(t); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
  const todayISO = (now) => isoT(todayT(now));
  const daysLeft = (s, now) => Math.round((parseD(s) - todayT(now)) / DAY);
  const addDays = (s, n) => isoT(parseD(s) + n * DAY);
  function addMonths(s, n, anchorDay) {
    const d = new Date(parseD(s));
    const y = d.getUTCFullYear(), m = d.getUTCMonth() + n;
    const want = anchorDay || d.getUTCDate();
    const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return isoT(Date.UTC(y, m, Math.min(want, dim)));
  }
  const dObj = s => new Date(parseD(s));
  const fmt0 = s => { const d = dObj(s); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; };
  const fmt = (s, now = new Date()) => fmt0(s) + (dObj(s).getUTCFullYear() !== now.getFullYear() ? ' ' + dObj(s).getUTCFullYear() : '');
  const fmtY = s => fmt0(s) + ' ' + dObj(s).getUTCFullYear();
  const fmtW = (s, now) => WD[dObj(s).getUTCDay()] + ' ' + fmt(s, now);
  const fmtLong = s => WDL[dObj(s).getUTCDay()] + ' ' + fmtY(s);
  function fmtTime(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const ap = h >= 12 ? 'pm' : 'am'; const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + pad(m) + ' ' + ap;
  }
  function inWords(d) {
    if (d < 0) return (-d) + (d === -1 ? ' day' : ' days') + ' overdue';
    if (d === 0) return 'today';
    if (d === 1) return 'tomorrow';
    return 'in ' + d + ' days';
  }
  const money = n => '$' + (Number(n) || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ---------- NZ public holidays (built in, works offline, no setup) ----------
     Rules from the Holidays Act 2003 as described by employment.govt.nz and govt.nz:
     - Waitangi Day and ANZAC Day on a Saturday or Sunday are also observed on the following Monday.
     - Christmas/Boxing Day and 1/2 January on a weekend are observed on the following Monday (and Tuesday).
     - Good Friday/Easter Monday follow Easter; King's Birthday is the 1st Monday in June; Labour Day the 4th Monday in October.
     - Matariki dates are fixed by Schedule 1 of Te Kāhui o Matariki Public Holiday Act 2022.
     - Northland observes Auckland Anniversary Day: the Monday nearest 29 January.
     Checked against the official 2026 and 2027 lists on employment.govt.nz and govt.nz. */
  const MATARIKI = { 2022: '06-24', 2023: '07-14', 2024: '06-28', 2025: '06-20', 2026: '07-10', 2027: '06-25', 2028: '07-14', 2029: '07-06',
    2030: '06-21', 2031: '07-11', 2032: '07-02', 2033: '06-24', 2034: '07-07', 2035: '06-29', 2036: '07-18', 2037: '07-10', 2038: '06-25',
    2039: '07-15', 2040: '07-06', 2041: '07-19', 2042: '07-11', 2043: '07-03', 2044: '06-24', 2045: '07-07', 2046: '06-29', 2047: '07-19',
    2048: '07-03', 2049: '06-25', 2050: '07-15', 2051: '06-30', 2052: '06-21' };
  function easterT(y) { // Gregorian Easter Sunday (anonymous algorithm)
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g2 = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g2 + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(y, mo - 1, da);
  }
  const holCache = {};
  function nzHolidays(y) {
    if (holCache[y]) return holCache[y];
    const D = (m, d) => Date.UTC(y, m - 1, d), wd = t => new Date(t).getUTCDay(), out = [];
    const add = (t, name, kw, extra) => out.push(Object.assign({ date: isoT(t), name, kw }, extra || {}));
    // a holiday that may also be observed on a later weekday
    const obs = (t, name, kw, ot) => {
      add(t, name, kw, ot ? { observedOn: isoT(ot) } : null);
      if (ot) add(ot, name + ' (observed)', kw, { observedFor: isoT(t) });
    };
    const mondayise = t => wd(t) === 6 ? t + 2 * DAY : wd(t) === 0 ? t + DAY : null;
    const pair = (a, n1, k1, n2, k2) => { // 25/26 Dec and 1/2 Jan
      const b = a + DAY, w = wd(a);
      obs(a, n1, k1, w === 6 || w === 0 ? a + 2 * DAY : null);
      obs(b, n2, k2, w === 6 ? a + 3 * DAY : w === 5 ? b + 2 * DAY : null);
    };
    pair(D(1, 1), 'New Year’s Day', ['new year'], 'Day after New Year’s Day', ['new year']);
    const j29 = D(1, 29), back = (wd(j29) + 6) % 7; // days since the Monday before
    add(back <= 3 ? j29 - back * DAY : j29 + (7 - back) * DAY, 'Auckland Anniversary Day', ['auckland', 'northland', 'anniversary'], { regional: 'Northland’s regional holiday' });
    obs(D(2, 6), 'Waitangi Day', ['waitangi'], mondayise(D(2, 6)));
    const e = easterT(y);
    add(e - 2 * DAY, 'Good Friday', ['good friday']);
    add(e + DAY, 'Easter Monday', ['easter monday']);
    obs(D(4, 25), 'ANZAC Day', ['anzac'], mondayise(D(4, 25)));
    const j1 = D(6, 1); add(j1 + ((8 - wd(j1)) % 7) * DAY, 'King’s Birthday', ['king', 'sovereign', 'queen']);
    if (MATARIKI[y]) add(parseD(y + '-' + MATARIKI[y]), 'Matariki', ['matariki']);
    const o1 = D(10, 1); add(o1 + ((8 - wd(o1)) % 7) * DAY + 21 * DAY, 'Labour Day', ['labour']);
    pair(D(12, 25), 'Christmas Day', ['christmas day'], 'Boxing Day', ['boxing']);
    out.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    return (holCache[y] = out);
  }
  // Holidays between two UTC-midnight day values
  function holidaysBetween(fromT, toT) {
    const out = [];
    for (let y = new Date(fromT).getUTCFullYear(); y <= new Date(toT).getUTCFullYear(); y++)
      nzHolidays(y).forEach(h => { const t = parseD(h.date); if (t >= fromT && t <= toT) out.push(h); });
    return out;
  }

  /* ---------- Lifting bridge on Dave Culham Drive (Te Matau ā Pohe) ----------
     Not live: worked out from the council's published lift times (wdc.govt.nz, Te Matau a Pohe bridge):
     - A scheduled lift at 12:00 noon every day (about 5–7 minutes to raise and lower).
     - Staffed hours, when boats can ask for a lift at any time (about 5 a day, each about 5–7 minutes):
       summer (from the last Sunday in September to the Saturday before the first Sunday in April): weekdays 9:00–16:00 and
       18:00–19:00, weekends 7:00–19:00; winter: weekdays 9:00–16:00, weekends 8:00–17:00.
     - Never lifted on weekdays 7:00–9:00 and 16:00–18:00 (peak traffic), or in gale-force wind (over 34 knots, about 63 km/h).
     - Outside staffed hours lifts are on call (usually booked ahead), so they're uncommon. */
  const BRIDGE = { lat: -35.73498, lon: 174.33534, galeKmh: 63, liftMins: 7 };
  const wdOf = iso => new Date(parseD(iso)).getUTCDay();
  function sundayOf(y, m, which) { // which: 1 = first, -1 = last Sunday of month m (1-12)
    if (which === 1) { const t = Date.UTC(y, m - 1, 1); return isoT(t + ((7 - new Date(t).getUTCDay()) % 7) * DAY); }
    const t = Date.UTC(y, m, 0); return isoT(t - new Date(t).getUTCDay() * DAY);
  }
  function bridgeSeason(iso) {
    const y = +iso.slice(0, 4);
    return iso >= sundayOf(y, 9, -1) || iso < sundayOf(y, 4, 1) ? 'summer' : 'winter';
  }
  function bridgeHours(iso) {
    const we = wdOf(iso) === 0 || wdOf(iso) === 6, su = bridgeSeason(iso) === 'summer';
    return su ? (we ? [[420, 1140]] : [[540, 960], [1080, 1140]]) : (we ? [[480, 1020]] : [[540, 960]]);
  }
  function bridgeStateAt(iso, min) {
    const wd = wdOf(iso);
    if (wd >= 1 && wd <= 5 && ((min >= 420 && min < 540) || (min >= 960 && min < 1080))) return 'peak';
    if (min >= 720 && min < 720 + BRIDGE.liftMins) return 'noon';
    return bridgeHours(iso).some(([a, b]) => min >= a && min < b) ? 'request' : 'after';
  }
  const BR_MARKS = [0, 420, 480, 540, 720, 720 + BRIDGE.liftMins, 960, 1020, 1080, 1140];
  function bridgeNext(iso, min) {
    const cur = bridgeStateAt(iso, min);
    for (let d = 0; d < 4; d++) {
      const day = addDays(iso, d);
      for (const m of BR_MARKS) {
        if (d === 0 && m <= min) continue;
        const st = bridgeStateAt(day, m);
        if (st !== cur) return { iso: day, min: m, state: st };
      }
    }
    return null;
  }
  function nzClock(now = new Date()) {
    const p = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now).forEach(x => { p[x.type] = x.value; });
    const iso = `${p.year}-${p.month}-${p.day}`, min = (+p.hour % 24) * 60 + +p.minute;
    return { iso, min, stamp: `${iso}T${pad(Math.floor(min / 60))}:${pad(min % 60)}` };
  }
  const hm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  // opts: { windKmh (forecast, or null), closures: [{ title, where, desc, url, dates: [{ start, end, time, endTime }] }] }
  function bridgeStatus(now = new Date(), opts = {}) {
    const c = nzClock(now), base = bridgeStateAt(c.iso, c.min);
    const out = { iso: c.iso, min: c.min, base, state: base, season: bridgeSeason(c.iso), hours: bridgeHours(c.iso), next: bridgeNext(c.iso, c.min), closure: null, upcoming: [] };
    for (const cl of opts.closures || []) for (const d of cl.dates || []) {
      const a = d.start + 'T' + (d.time || '00:00'), b = (d.end || d.start) + 'T' + (d.endTime || '23:59');
      if (a <= c.stamp && c.stamp < b) { if (!out.closure || b > out.closure.until) out.closure = { ...cl, from: a, until: b }; }
      else if (a > c.stamp) out.upcoming.push({ ...cl, from: a, until: b });
    }
    out.upcoming.sort((x, y) => x.from.localeCompare(y.from));
    const w = typeof opts.windKmh === 'number' ? opts.windKmh : null;
    out.windKmh = w;
    if (out.closure) out.state = 'closed';
    else if (w != null && w > BRIDGE.galeKmh && base !== 'peak') out.state = 'windy';
    return out;
  }
  const bridgeMetres = (lat, lon) => {
    const R = 6371000, r = x => x * Math.PI / 180, dLat = r(lat - BRIDGE.lat), dLon = r(lon - BRIDGE.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(BRIDGE.lat)) * Math.cos(r(lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  /* ---------- bills ---------- */
  const REPEATS = { none: 'One-off', weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly', quarterly: 'Every 3 months', yearly: 'Yearly' };
  function nextDue(bill, from) {
    const s = from || bill.due;
    switch (bill.repeat) {
      case 'weekly': return addDays(s, 7);
      case 'fortnightly': return addDays(s, 14);
      case 'monthly': return addMonths(s, 1, bill.anchor);
      case 'quarterly': return addMonths(s, 3, bill.anchor);
      case 'yearly': return addMonths(s, 12, bill.anchor);
      default: return null;
    }
  }
  // Dates on which an unpaid bill falls due between two UTC-midnight times (inclusive).
  function billDates(bill, fromT, toT) {
    const out = [];
    if (!bill.due || bill.paid) return out;
    let s = bill.due, n = 0;
    while (s && parseD(s) <= toT && n < 500) {
      if (parseD(s) >= fromT) out.push(s);
      s = nextDue(bill, s); n++;
    }
    return out;
  }

  /* ---------- birthdays: { day, month, year (optional) } ---------- */
  const leap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  function bdayInYear(b, y) { let d = +b.day; const m = +b.month; if (m === 2 && d === 29 && !leap(y)) d = 28; return Date.UTC(y, m - 1, d); }
  // Next birthday on or after today, as 'YYYY-MM-DD'
  function nextBday(b, now) {
    const T = todayT(now), y = new Date(T).getUTCFullYear();
    const t = bdayInYear(b, y);
    return isoT(t >= T ? t : bdayInYear(b, y + 1));
  }
  const bdayAge = (b, iso) => (b.year ? +iso.slice(0, 4) - +b.year : null);
  // Birthday dates between two UTC-midnight times (inclusive)
  function bdayDates(b, fromT, toT) {
    const out = [];
    for (let y = new Date(fromT).getUTCFullYear(); y <= new Date(toT).getUTCFullYear(); y++) {
      const t = bdayInYear(b, y);
      if (t >= fromT && t <= toT && (!b.year || y >= +b.year)) out.push(isoT(t));
    }
    return out;
  }
  const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));

  /* ---------- pets: care items (flea, worming, vaccinations, grooming, check-up, dog registration, own items) ----------
     Each item: { id, kind, name, every, unit: 'weeks' | 'months' | 'years' | 'none', last: 'YYYY-MM-DD', due: 'YYYY-MM-DD' (set by hand, optional) } */
  const PET_CARE = {
    flea: { name: 'Flea treatment', every: 1, unit: 'months' },
    worm: { name: 'Worming', every: 3, unit: 'months' },
    vacc: { name: 'Vaccinations', every: 1, unit: 'years' },
    groom: { name: 'Grooming', every: 6, unit: 'weeks' },
    check: { name: 'Vet check-up', every: 1, unit: 'years' },
    reg: { name: 'Dog registration', every: 1, unit: 'years' }
  };
  // Health (1.8.0): suggested check-up types and their usual intervals (all editable). every 0 / unit 'none' = doesn't repeat.
  const HEALTH_TYPES = {
    dentist: { name: 'Dentist', every: 6, unit: 'months' },
    doctor: { name: 'Doctor check-up', every: 1, unit: 'years' },
    chiro: { name: 'Chiropractor', every: 4, unit: 'weeks' },
    opto: { name: 'Optometrist', every: 2, unit: 'years' },
    hyg: { name: 'Hygienist', every: 6, unit: 'months' },
    physio: { name: 'Physio', every: 0, unit: 'none' },
    skin: { name: 'Skin check', every: 1, unit: 'years' },
    flu: { name: 'Flu jab', every: 1, unit: 'years', note: 'Usually in autumn (March to May).' },
    script: { name: 'Prescription repeat', every: 3, unit: 'months' }
  };
  // Booked health appointments between two dates (UTC day numbers), for the Calendar, Home and reminders
  function healthAppts(data, fromT, toT) {
    const out = [];
    (data.health || []).forEach(p => (p.items || []).forEach(it => {
      const t = parseD(it.apptDate); if (t == null || t < fromT || t > toT) return;
      out.push({ person: p, item: it, date: it.apptDate, time: it.apptTime || '', title: p.name + ' – ' + it.name });
    }));
    return out.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }
  function addInterval(s, n, unit) {
    n = Math.max(1, Math.round(+n || 1));
    return unit === 'weeks' ? addDays(s, 7 * n) : unit === 'years' ? addMonths(s, 12 * n) : addMonths(s, n);
  }
  // NZ dog registration year runs 1 July to 30 June, due each 1 July. Paying from May onwards counts for the coming year
  // (councils send the new year's invoice before 1 July); paying Jan–Apr is a late payment for the current year.
  function regDueAfter(done) { const d = dObj(done); return (d.getUTCFullYear() + (d.getUTCMonth() >= 4 ? 1 : 0)) + '-07-01'; }
  function nextJuly1(now) { const T = todayISO(now), y = +T.slice(0, 4); return T <= y + '-07-01' ? y + '-07-01' : (y + 1) + '-07-01'; }
  // Next due date of a care item ('' if it can't be worked out yet)
  function careDue(it, now) {
    if (!it) return '';
    if (it.due && parseD(it.due) != null) return it.due;
    if (it.kind === 'reg') return it.last ? regDueAfter(it.last) : nextJuly1(now);
    if (!it.last || parseD(it.last) == null || it.unit === 'none' || !(+it.every > 0)) return '';
    return addInterval(it.last, it.every, it.unit);
  }
  // Due date after ticking Done on `date`
  function careNextAfter(it, date) {
    if (it.kind === 'reg') return regDueAfter(date);
    return it.unit === 'none' || !(+it.every > 0) ? '' : addInterval(date, it.every, it.unit);
  }
  function careEvery(it) {
    if (it.kind === 'reg') return 'Every 1 July';
    if (it.unit === 'none' || !(+it.every > 0)) return 'Doesn’t repeat';
    const n = +it.every, u = it.unit === 'weeks' ? 'week' : it.unit === 'years' ? 'year' : 'month';
    return n === 1 ? (u === 'week' ? 'Every week' : u === 'month' ? 'Monthly' : 'Yearly') : `Every ${n} ${u}s`;
  }

  /* ---------- my events (Calendar › Add event), optionally repeating ----------
     { id, title, start: 'YYYY-MM-DD', time: 'HH:MM' | '', notes, repeat, until: 'YYYY-MM-DD' | '', skips: [date], moves: { date: newDate },
       remind: 'off' | 'day' | 'before', remindAt: 'HH:MM' }
     repeat: none | weekly | fortnightly | 4weekly | monthly (same date, last day of the month if it's short) | lastday | yearly */
  const REPEAT_STEP = { weekly: 7, fortnightly: 14, '4weekly': 28 };
  const dim = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); // days in month m (0-11)
  // The k-th date of the series (k = 0 is the start), before skips and moves
  function repeatNth(ev, k) {
    const t0 = parseD(ev.start); if (t0 == null) return null;
    if (!ev.repeat || ev.repeat === 'none') return k ? null : ev.start;
    if (!k && ev.repeat !== 'lastday') return ev.start;
    if (REPEAT_STEP[ev.repeat]) return isoT(t0 + k * REPEAT_STEP[ev.repeat] * DAY);
    const d = new Date(t0), y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
    if (ev.repeat === 'monthly' || ev.repeat === 'lastday') {
      const yy = y + Math.floor((m + k) / 12), mm = (m + k) % 12;
      return isoT(Date.UTC(yy, mm, ev.repeat === 'lastday' ? dim(yy, mm) : Math.min(day, dim(yy, mm))));
    }
    if (ev.repeat === 'yearly') return isoT(Date.UTC(y + k, m, Math.min(day, dim(y + k, m))));
    return null;
  }
  // Is `iso` one of the series' own dates (before skips/moves)?
  function isSeriesDate(ev, iso) {
    const t = parseD(iso), t0 = parseD(ev.start); if (t == null || t0 == null || t < t0) return false;
    if (ev.until && iso > ev.until) return false;
    if (REPEAT_STEP[ev.repeat]) return Math.round((t - t0) / DAY) % REPEAT_STEP[ev.repeat] === 0;
    const a = new Date(t0), b = new Date(t);
    const k = ev.repeat === 'yearly' ? b.getUTCFullYear() - a.getUTCFullYear() : ev.repeat === 'monthly' || ev.repeat === 'lastday' ? (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth() : 0;
    return repeatNth(ev, k) === iso;
  }
  // Dates of a series between two UTC-midnight times (inclusive): [{ date, orig, moved }], sorted
  function repeatDates(ev, fromT, toT) {
    const out = [], t0 = parseD(ev.start); if (t0 == null || toT < fromT) return out;
    const skips = new Set(ev.skips || []), moves = ev.moves || {};
    const endT = ev.until && parseD(ev.until) != null ? Math.min(toT, parseD(ev.until)) : toT;
    let k = 0;
    const step = REPEAT_STEP[ev.repeat];
    if (step && fromT > t0) k = Math.max(0, Math.floor((fromT - t0) / (step * DAY)));
    else if ((ev.repeat === 'monthly' || ev.repeat === 'lastday') && fromT > t0) { const a = new Date(t0), b = new Date(fromT); k = Math.max(0, (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth() - 1); }
    else if (ev.repeat === 'yearly' && fromT > t0) k = Math.max(0, new Date(fromT).getUTCFullYear() - new Date(t0).getUTCFullYear() - 1);
    for (let n = 0; n < 2000; n++, k++) {
      const iso = repeatNth(ev, k); if (!iso) break;
      const t = parseD(iso); if (t > endT) break;
      if (t >= fromT && !skips.has(iso) && !moves[iso]) out.push({ date: iso, orig: iso, moved: false });
    }
    // moved dates: shown on their new day, as long as the original date is part of the series and not skipped
    Object.keys(moves).forEach(o => { const nt = parseD(moves[o]); if (nt != null && nt >= fromT && nt <= toT && !skips.has(o) && isSeriesDate(ev, o)) out.push({ date: moves[o], orig: o, moved: true }); });
    return out.sort((a, b) => a.date.localeCompare(b.date) || a.orig.localeCompare(b.orig));
  }
  const REPEAT_LABEL = { none: 'Doesn’t repeat', weekly: 'Every week', fortnightly: 'Every 2 weeks', '4weekly': 'Every 4 weeks', monthly: 'Every month on the same date', lastday: 'Every month on the last day', yearly: 'Every year' };
  function repeatText(ev) {
    const s = ev.start, d = dObj(s), wd = WDL[d.getUTCDay()];
    let t;
    switch (ev.repeat) {
      case 'weekly': t = 'Every ' + wd; break;
      case 'fortnightly': t = 'Every 2 weeks on ' + wd; break;
      case '4weekly': t = 'Every 4 weeks on ' + wd; break;
      case 'monthly': t = 'Monthly on the ' + ordinal(d.getUTCDate()) + (d.getUTCDate() > 28 ? ' (or the last day)' : ''); break;
      case 'lastday': t = 'Monthly on the last day'; break;
      case 'yearly': t = 'Every year on ' + d.getUTCDate() + ' ' + MONL[d.getUTCMonth()]; break;
      default: return 'One-off';
    }
    return t + (ev.until ? ', until ' + fmtY(ev.until) : '');
  }


  /* ---------- gardening (1.20.0): built-in plants, annual jobs for Whangārei ----------
     S.garden = { off: [plantId], done: { "jobKey-year": true } }.
     A plant in `off` is one the user does not grow. Jobs are hidden and not reminded.
     `done` marks this year's occurrence finished, so it leaves Upcoming and will not notify again until next year.
     Citrus feeding (and the March planting reminder) is one shared job for whichever of lemon, orange and mandarin are on. */
  const GARDEN_IDS = ['lemon', 'orange', 'mandarin', 'peach', 'plum', 'strawberries', 'tomatoes'];
  const GARDEN_CITRUS = ['lemon', 'orange', 'mandarin'];
  const GARDEN_WORD = { lemon: 'lemon', orange: 'orange', mandarin: 'mandarin', peach: 'peach', plum: 'plum' };
  function gardenOff(data) { const g = data && data.garden; return g && Array.isArray(g.off) ? g.off : []; }
  function gardenDoneMap(data) {
    const g = data && data.garden;
    return g && g.done && typeof g.done === 'object' && !Array.isArray(g.done) ? g.done : {};
  }
  function gardenOn(data, id) { return gardenOff(data).indexOf(id) < 0; }
  function gardenThe(ids) {
    const w = ids.map(id => GARDEN_WORD[id]).filter(Boolean);
    const body = w.length <= 1 ? (w[0] || '') : w.length === 2 ? w[0] + ' and ' + w[1] : w.slice(0, -1).join(', ') + ' and ' + w[w.length - 1];
    return 'the ' + body;
  }
  function gardenSpecs(data) {
    const on = id => gardenOn(data, id), specs = [];
    const add = (m, d, kind, title, body, plants) => specs.push({ m, d, kind, title, body, plants: plants.slice() });
    const citrus = GARDEN_CITRUS.filter(on);
    if (citrus.length) {
      const who = gardenThe(citrus);
      const feed = 'Citrus fertiliser around the drip line of ' + who + ', then water it in.';
      [[9, 1], [11, 1], [1, 1], [3, 1]].forEach(([m, d]) => add(m, d, 'citrus-feed', 'Feed the citrus', feed, citrus));
      add(3, 1, 'citrus-plant', 'Best time to plant citrus', 'Plant ' + who + ' from March to May while the soil is warm, or any time through November.', citrus);
    }
    if (on('peach')) {
      add(5, 15, 'peach-curl', 'Spray the Golden Queen for leaf curl', 'Copper at leaf fall, before any green shows.', ['peach']);
      add(8, 15, 'peach-bud', 'Spray the Golden Queen again, and feed it', 'At bud swell, before any green shows, with a balanced fertiliser.', ['peach']);
      add(3, 1, 'peach-harvest', 'Feed the Golden Queen after harvest', 'Fruit should be finishing.', ['peach']);
    }
    if (on('plum')) {
      add(9, 1, 'plum-feed', 'Feed the plum', 'Feed in September, then again in December.', ['plum']);
      add(12, 1, 'plum-feed2', 'Feed the plum again', 'The second feed of the year.', ['plum']);
      add(1, 15, 'plum-prune', 'Prune the plum once the fruit is off', 'A summer prune, not in autumn or winter.', ['plum']);
    }
    const stone = ['peach', 'plum'].filter(on);
    if (stone.length) add(6, 1, 'bare-root', 'Bare-root time for ' + gardenThe(stone), 'Plant June to August.', stone);
    if (on('strawberries')) {
      [9, 10, 11, 12, 1, 2].forEach(m => add(m, 1, 'straw-feed', 'Feed the strawberries', 'Feed every 4 weeks from September through February, without so much nitrogen that you get leaves instead of fruit.', ['strawberries']));
      add(6, 1, 'straw-plant', 'Strawberry planting is open', 'Plant from June to November, with late August to October the easy window.', ['strawberries']);
    }
    if (on('tomatoes')) {
      add(9, 1, 'tomato-plant', 'Tomato planting time', 'Seedlings can go outside in Whangārei now.', ['tomatoes']);
      [[11, 1], [11, 15], [12, 1], [12, 15], [1, 1], [1, 15], [2, 1], [2, 15], [3, 1]].forEach(([m, d]) => add(m, d, 'tomato-feed', 'Feed the tomatoes', 'A high-potash tomato food until the fruit is finishing.', ['tomatoes']));
    }
    return specs;
  }
  // Jobs whose date falls between two UTC-midnight times (inclusive). Includes past and done ones; callers filter.
  function gardenJobs(data, fromT, toT, now) {
    if (fromT == null || toT == null || toT < fromT) return [];
    const done = gardenDoneMap(data), specs = gardenSpecs(data), out = [];
    for (let y = new Date(fromT).getUTCFullYear(); y <= new Date(toT).getUTCFullYear(); y++) {
      specs.forEach(sp => {
        const md = pad(sp.m) + '-' + pad(sp.d), date = y + '-' + md, t = parseD(date);
        if (t == null || t < fromT || t > toT) return;
        const jobKey = sp.kind + '-' + md, key = jobKey + '-' + y;
        out.push({ jobKey, key, notifyId: 'garden-' + sp.kind + '-' + y + '-' + md, title: sp.title, body: sp.body, date, plants: sp.plants, go: sp.plants[0], done: !!done[key], days: daysLeft(date, now) });
      });
    }
    return out.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.title.localeCompare(b.title));
  }

  /* ---------- everything that has a due date ---------- */
  function dueItems(data, now) {
    const out = [];
    (data.cars || []).forEach(c => {
      if (c.wof) out.push({ kind: 'car', part: 'wof', id: c.id, car: c, label: 'WOF', title: c.name + ' WOF', date: c.wof, go: '#car/' + c.id });
      if (c.rego) out.push({ kind: 'car', part: 'rego', id: c.id, car: c, label: 'Rego', title: c.name + ' rego', date: c.rego, go: '#car/' + c.id });
      if (c.svcDate) out.push({ kind: 'car', part: 'svc', id: c.id, car: c, label: 'Service', title: c.name + ' service', date: c.svcDate, go: '#car/' + c.id });
    });
    (data.bills || []).filter(b => !b.paid && b.due).forEach(b => out.push({ kind: 'bill', part: 'bill', id: b.id, bill: b, title: b.name, date: b.due, go: '#bills' }));
    (data.drivers || []).forEach(d => {
      if (d.aaExpiry) out.push({ kind: 'driver', part: 'aa', id: d.id, driver: d, label: 'AA', title: d.name + ' AA membership', date: d.aaExpiry, go: '#driver/' + d.id });
      if (d.licExpiry) out.push({ kind: 'driver', part: 'lic', id: d.id, driver: d, label: 'Licence', title: d.name + ' driver licence', date: d.licExpiry, go: '#driver/' + d.id });
    });
    (data.pets || []).forEach(p => (p.care || []).forEach(it => {
      const date = careDue(it, now);
      if (date) out.push({ kind: 'pet', part: 'care', id: p.id + ':' + it.id, pet: p, care: it, title: p.name + ': ' + it.name, date, go: '#pet/' + p.id });
    }));
    // Health check-ups. A booked appointment (today or later) stands in for the due date until it's done.
    (data.health || []).forEach(p => (p.items || []).forEach(it => {
      if (it.apptDate && it.apptDate >= todayISO(now)) return;
      const date = careDue(it, now);
      if (date) out.push({ kind: 'health', part: 'hcheck', id: p.id + ':' + it.id, person: p, item: it, title: p.name + ' – ' + it.name, date, go: '#health/' + p.id + '/' + it.id });
    }));
    (data.todos || []).filter(t => !t.done && t.due).forEach(t => out.push({ kind: 'todo', part: 'todo', id: t.id, todo: t, title: t.title, date: t.due, go: '#todo' }));
    out.forEach(x => { x.days = daysLeft(x.date, now); });
    return out.sort((a, b) => a.days - b.days || a.title.localeCompare(b.title));
  }
  /* ---------- commission (1.7.0): pay fortnights run Monday to the Sunday 13 days later, lined up on a chosen Monday ---------- */
  // All dates are UTC-midnight day numbers, so daylight saving changes can't shift a day into the wrong fortnight.
  const isMonday = iso => { const t = parseD(iso); return t != null && new Date(t).getUTCDay() === 1; };
  const lastMonday = now => { const T = todayT(now); return isoT(T - ((new Date(T).getUTCDay() + 6) % 7) * DAY); };
  function fortnightOf(anchor, iso) {
    const a = parseD(anchor), t = parseD(iso);
    const k = Math.floor((t - a) / (14 * DAY)), st = a + k * 14 * DAY;
    return { start: isoT(st), end: isoT(st + 13 * DAY), k };
  }
  const commSum = (entries, from, to) => (entries || []).reduce((n, e) => n + (e.date >= from && e.date <= to ? (Math.round(+e.cents) || 0) : 0), 0);
  function taxYearOf(iso) { // NZ tax year: 1 April to 31 March
    const y = +iso.slice(0, 4), s = iso.slice(5) >= '04-01' ? y : y - 1;
    return { start: s + '-04-01', end: (s + 1) + '-03-31', label: s + '/' + String(s + 1).slice(2) };
  }
  const centsMoney = c => (c < 0 ? '−' : '') + money(Math.abs(c) / 100);
  function parseCents(v) { // "120", "120.5", "$1,200.50" -> 12050; null if not a plain positive amount with up to 2 decimals
    const t = String(v == null ? '' : v).replace(/[\s,$]/g, '');
    if (!/^\d+(\.\d{1,2})?$|^\.\d{1,2}$/.test(t)) return null;
    return Math.round(parseFloat(t) * 100);
  }

  const status = d => d < 0 ? 'over' : d <= 30 ? 'soon' : 'fine';
  // Badge = overdue + due within 3 days
  const badgeCount = (data, now) => dueItems(data, now).filter(x => x.days <= 3).length;

  /* ---------- reminder schedule ---------- */
  // Returns the reminder "stage" an item is currently in, or null. One notification per stage.
  // WOF / rego: 30, 14, 3 days before, on the day, then every 3 days while overdue.
  // Service: 14 days before. Bills: 3 days before and on the day. To-dos: on the day.
  function stage(x) {
    const d = x.days;
    if (x.part === 'wof' || x.part === 'rego') {
      if (d > 30) return null; if (d > 14) return 's30'; if (d > 3) return 's14'; if (d > 0) return 's3';
      return 'd' + Math.floor(-d / 3);
    }
    if (x.part === 'svc') return d <= 14 ? 's14' : null;
    if (x.part === 'bill') { if (d <= 0) return 'd0'; if (d <= 3) return 's3'; return null; }
    if (x.part === 'todo') return d <= 0 ? 'd0' : null;
    // AA membership and driver licence: 30, 14 and 3 days before, and on the day (or once, if already expired)
    // Pet care: 3 days before and on the day (once, if already overdue)
    if (x.part === 'care') { if (d <= 0) return 'd0'; if (d <= 3) return 's3'; return null; }
    // Health check-ups: the same, 3 days before and on the day
    if (x.part === 'hcheck') { if (d <= 0) return 'd0'; if (d <= 3) return 's3'; return null; }
    if (x.part === 'aa' || x.part === 'lic') { if (d > 30) return null; if (d > 14) return 's30'; if (d > 3) return 's14'; if (d > 0) return 's3'; return 'd0'; }
    return null;
  }

  function message(x, data, now) {
    const d = x.days, when = inWords(d);
    if (x.kind === 'car') {
      const c = x.car, plate = c.plate ? ' (' + c.plate + ')' : '';
      if (x.part === 'wof') {
        let body = d < 0 ? `It ran out on ${fmtW(x.date, now)}. You can be fined for driving without a current WOF.` : `Due ${fmtW(x.date, now)}${plate}. Book a WOF soon.`;
        if (d >= 0 && c.rego && parseD(c.rego) >= parseD(x.date) && daysLeft(c.rego, now) <= 60) body += ` You'll need it to renew the rego on ${fmt(c.rego, now)}.`;
        return { title: d < 0 ? `${c.name}: WOF expired` : `${c.name}: WOF due ${when}`, body };
      }
      if (x.part === 'rego') {
        let body = d < 0 ? `It ran out on ${fmtW(x.date, now)}. Renew it on the NZTA website.` : `Due ${fmtW(x.date, now)}${plate}. Renew online for 3, 6 or 12 months.`;
        if (c.wof && (daysLeft(c.wof, now) < 0 || parseD(c.wof) <= parseD(x.date))) body += ' Get the WOF done first.';
        return { title: d < 0 ? `${c.name}: rego expired` : `${c.name}: rego due ${when}`, body };
      }
      return { title: `${c.name}: service due ${when}`, body: `Service due ${fmtW(x.date, now)}${c.svcKm ? ' or at ' + Number(c.svcKm).toLocaleString('en-NZ') + ' km' : ''}. Time to book it in.` };
    }
    if (x.kind === 'bill') {
      const b = x.bill;
      return { title: `${b.name} ${d < 0 ? 'is overdue' : 'due ' + when}`, body: `${money(b.amount)} due ${fmtW(x.date, now)}. Tap to mark it paid.` };
    }
    if (x.kind === 'driver') {
      const n = x.driver.name, what = x.part === 'aa' ? 'AA membership' : 'driver licence';
      const how = x.part === 'aa' ? 'Renew online at aa.co.nz or call 0800 500 222.' : 'You can renew at an AA or VTNZ centre.';
      if (d < 0) return { title: `${n}’s ${what} has expired`, body: `It ran out on ${fmtW(x.date, now)}. ${how}` };
      return { title: `${n}’s ${what} ${d === 0 ? 'expires today' : 'expires ' + when}`, body: `Expires ${fmtW(x.date, now)}. ${how}` };
    }
    if (x.kind === 'pet') {
      const n = x.pet.name, what = x.care.name.toLowerCase();
      if (d < 0) return { title: `${n}: ${what} overdue`, body: `It was due ${fmtW(x.date, now)}. Tap Done once it’s sorted.` };
      return { title: `${n}: ${what} ${d === 0 ? 'due today' : 'due ' + when}`, body: `Due ${fmtW(x.date, now)}.${x.pet.vet ? ' ' + x.pet.vet + (x.pet.vetPhone ? ' · ' + x.pet.vetPhone : '') : ''}` };
    }
    if (x.kind === 'health') {
      const it = x.item, where = [it.clinic, it.phone].filter(Boolean).join(' · ');
      if (d < 0) return { title: `${x.title} overdue`, body: `It was due ${fmtW(x.date, now)}.${where ? ' ' + where + '.' : ''} Book it in, or tap Done if it’s sorted.` };
      return { title: `${x.title} ${d === 0 ? 'due today' : 'due ' + when}`, body: `Due ${fmtW(x.date, now)}.${where ? ' ' + where + '.' : ''} Time to book it in.` };
    }
    return { title: d < 0 ? `To-do overdue: ${x.title}` : `To-do today: ${x.title}`, body: d < 0 ? `It was due ${fmtW(x.date, now)}.` : 'Tap to tick it off.' };
  }

  // Works out which reminders should fire now. `fired` is an object of key -> time fired.
  function pendingReminders(data, fired, now = new Date(), cal = {}) {
    const s = data.settings || {};
    const out = [];
    const daytime = !quietNow(now);
    dueItems(data, now).forEach(x => {
      if ((x.kind === 'driver' || x.kind === 'pet' || x.kind === 'health') && !daytime) return; // AA / licence / pet / health reminders wait until 7 am
      const st = stage(x); if (!st) return;
      const key = [x.kind, x.id, x.part, x.date, st].join('|');
      if (fired[key]) return;
      const m = message(x, data, now);
      out.push({ key, title: m.title, body: m.body, url: x.go, days: x.days });
    });
    if (s.apptReminders !== false) {
      (data.appts || []).forEach(a => {
        if (!a.date) return;
        if (a.time) {
          const [y, mo, d] = a.date.split('-').map(Number), [h, mi] = a.time.split(':').map(Number);
          const start = new Date(y, mo - 1, d, h, mi).getTime(), diff = start - now.getTime();
          if (diff > 0 && diff <= 60 * 60 * 1000) {
            const key = ['appt', a.id, a.date + 'T' + a.time, 'h1'].join('|');
            if (!fired[key]) out.push({ key, title: `${a.title} at ${fmtTime(a.time)}`, body: `Starts in ${Math.max(1, Math.round(diff / 60000))} minutes.${a.notes ? ' ' + a.notes : ''}`, url: '#calendar', days: 0 });
          }
        } else if (daysLeft(a.date, now) === 0) {
          const key = ['appt', a.id, a.date, 'd0'].join('|');
          if (!fired[key]) out.push({ key, title: `Today: ${a.title}`, body: 'All-day appointment.', url: '#calendar', days: 0 });
        }
      });
    }
    // Birthdays: 3 days before and on the day, never between 9 pm and 7 am
    if (s.bdayReminders !== false && daytime) {
      (data.birthdays || []).forEach(b => {
        if (!b.day || !b.month) return;
        const iso = nextBday(b, now), d = daysLeft(iso, now);
        const st = d === 0 ? 'd0' : d > 0 && d <= 3 ? 's3' : null; if (!st) return;
        const key = ['bday', b.id, iso, st].join('|'); if (fired[key]) return;
        const age = bdayAge(b, iso), turns = age && age > 0 ? ` turns ${age}` : '';
        if (d === 0) out.push({ key, title: `It’s ${b.name}’s birthday today 🎂`, body: `${b.name}${turns || ' has a birthday'} today.${b.notes ? ' ' + b.notes : ''}`, url: '#birthdays', days: 0 });
        else out.push({ key, title: `${b.name}’s birthday ${inWords(d)}`, body: `${b.name}${turns ? turns + ' on' : '’s birthday is'} ${fmtW(iso, now)}.${b.notes ? ' ' + b.notes : ''}`, url: '#birthdays', days: d });
      });
    }
    // My events: on the day or the day before, at the time chosen for each event (7 am to 8:30 pm), never between 9 pm and 7 am
    if (daytime) {
      const T = todayT(now);
      (data.myEvents || []).forEach(ev => {
        if (!ev.remind || ev.remind === 'off') return;
        const [h, mi] = String(ev.remindAt || (ev.remind === 'before' ? '19:00' : '07:00')).split(':').map(Number);
        repeatDates(ev, T, T + 2 * DAY).forEach(o => {
          const r = ev.remind === 'before' ? addDays(o.date, -1) : o.date;
          const [y, mo, d] = r.split('-').map(Number), at = new Date(y, mo - 1, d, h, mi).getTime();
          const [y2, mo2, d2] = o.date.split('-').map(Number), end = new Date(y2, mo2 - 1, d2, 23, 59).getTime();
          if (now.getTime() < at || now.getTime() > end) return;
          const key = ['mine', ev.id, o.date, ev.remind].join('|'); if (fired[key]) return;
          const dl = daysLeft(o.date, now), when = dl === 0 ? 'Today' : 'Tomorrow';
          out.push({ key, title: `${when}: ${ev.title}${ev.time ? ' at ' + fmtTime(ev.time) : ''}`, body: `${fmtW(o.date, now)}${ev.time ? ' · ' + fmtTime(ev.time) : ' · All day'}${o.moved ? ' (moved from ' + fmtW(o.orig, now) + ')' : ''}.${ev.notes ? ' ' + ev.notes : ''}`, url: '#calendar', days: dl });
        });
      });
    }
    // Booked health appointments: the evening before at 7 pm, and 2 hours before if that's in waking hours (7 am to 9 pm)
    if (daytime) {
      const T = todayT(now);
      healthAppts(data, T, T + DAY).forEach(a => {
        const [y, mo, d] = a.date.split('-').map(Number), at = a.time ? ' at ' + fmtTime(a.time) : '';
        const where = [a.item.clinic, a.item.phone].filter(Boolean).join(' · ');
        const eve = new Date(y, mo - 1, d - 1, 19, 0).getTime(), eveEnd = new Date(y, mo - 1, d - 1, 23, 59).getTime();
        const k1 = ['happt', a.person.id + ':' + a.item.id, a.date, 'eve'].join('|');
        if (now.getTime() >= eve && now.getTime() <= eveEnd && !fired[k1])
          out.push({ key: k1, title: `Tomorrow: ${a.title}${a.time ? ' ' + fmtTime(a.time) : ''}`, body: `Health appointment ${fmtW(a.date, now)}${at}.${where ? ' ' + where + '.' : ''}`, url: '#health/' + a.person.id + '/' + a.item.id, days: 1 });
        if (a.time) {
          const [h, mi] = a.time.split(':').map(Number), start = new Date(y, mo - 1, d, h, mi).getTime(), rt = start - 2 * 3600 * 1000;
          const k2 = ['happt', a.person.id + ':' + a.item.id, a.date + 'T' + a.time, 'h2'].join('|');
          if (!quietNow(new Date(rt)) && now.getTime() >= rt && now.getTime() < start && !fired[k2])
            out.push({ key: k2, title: `${a.title}${at}`, body: `In about ${Math.max(1, Math.round((start - now.getTime()) / 3600000))} hour${Math.round((start - now.getTime()) / 3600000) > 1 ? 's' : ''}.${where ? ' ' + where + '.' : ''}`, url: '#health/' + a.person.id + '/' + a.item.id, days: 0 });
        }
      });
    }
    // Gardening: one notification on the morning of the job date (waking hours, same 7 am–9 pm window as birthdays).
    // A date that has already passed does not fire late. The key is stable for that occurrence, e.g. garden-citrus-feed-2026-09-01.
    if (daytime) {
      const gT = todayT(now), gIso = todayISO(now);
      gardenJobs(data, gT, gT, now).forEach(j => {
        if (j.done || j.date !== gIso || fired[j.notifyId]) return;
        out.push({ key: j.notifyId, title: j.title, body: j.body, url: '#garden/' + j.go, days: 0 });
      });
    }
    // Commission (if turned on): 9 am the next morning, only if nothing has been entered for yesterday
    const cm = data.commission;
    if (cm && cm.remind && cm.anchor && daytime && now.getHours() >= 9) {
      const y = addDays(todayISO(now), -1), key = ['comm', y].join('|');
      if (!fired[key] && !(cm.entries || []).some(e => e.date === y))
        out.push({ key, title: 'Enter yesterday’s commission?', body: `Nothing entered for ${fmtW(y, now)} yet. Tap to add it.`, url: '#commission/add', days: 0 });
    }
    // Events imported from Outlook / Google: 1 hour before timed events, morning of all-day ones
    (data.feeds || []).forEach(f => {
      if (f.reminders === false) return;
      const c = cal && cal[f.id]; if (!c || !Array.isArray(c.events)) return;
      const from = ' · from ' + (f.name || 'your calendar');
      c.events.forEach(e => {
        if (e.allDay) {
          if (!daytime || e.date !== todayISO(now)) return;
          const key = ['ical', f.id, e.key, e.date, 'd0'].join('|');
          if (!fired[key]) out.push({ key, title: `Today: ${e.title}`, body: 'All day' + from, url: '#calendar', days: 0 });
        } else {
          const diff = e.start - now.getTime();
          if (!(diff > 0 && diff <= 60 * 60 * 1000)) return;
          const key = ['ical', f.id, e.key, e.start, 'h1'].join('|');
          if (!fired[key]) out.push({ key, title: `${e.title} at ${fmtTime(e.time)}`, body: `Starts in ${Math.max(1, Math.round(diff / 60000))} minutes${e.location ? ' · ' + e.location : ''}${from}`, url: '#calendar', days: 0 });
        }
      });
    });
    return out.sort((a, b) => a.days - b.days);
  }

  /* ---------- IndexedDB key-value store (shared by page and service worker) ---------- */
  let dbp = null;
  function openDB() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('due-dates', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => { dbp = null; rej(r.error); };
    });
    return dbp;
  }
  async function kvGet(key) {
    const db = await openDB();
    return new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  }
  async function kvSet(key, val) {
    const db = await openDB();
    return new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(val, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  }

  /* ---------- the reminder check, run by the page on open/resume and by the SW on periodic sync ---------- */
  function quietNow(now) { const h = now.getHours(); return h >= 21 || h < 7; }
  async function runCheck(reg, opts = {}) {
    const now = opts.now || new Date();
    const data = opts.data || await kvGet('data');
    if (!data) return { shown: 0, badge: 0 };
    const badge = badgeCount(data, now);
    try {
      const nav = g.navigator;
      if (nav && nav.setAppBadge) { if (badge) await nav.setAppBadge(badge); else await nav.clearAppBadge(); }
    } catch (e) { /* not supported here */ }
    const enabled = (data.settings || {}).reminders !== false;
    const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
    if (!enabled || perm !== 'granted' || !reg) return { shown: 0, badge };
    if (opts.respectQuiet && quietNow(now)) return { shown: 0, badge, quiet: true };
    const fired = (await kvGet('fired')) || {};
    let cal = opts.cal;
    if (!cal) { try { cal = (await kvGet('calcache')) || {}; } catch (e) { cal = {}; } }
    const list = pendingReminders(data, fired, now, cal);
    let shown = 0;
    for (const r of list.slice(0, 8)) {
      try {
        await reg.showNotification(r.title, { body: r.body, tag: r.key, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: r.url } });
        fired[r.key] = now.getTime(); shown++;
      } catch (e) { break; }
    }
    // tidy keys older than 400 days
    const cutoff = now.getTime() - 400 * DAY;
    Object.keys(fired).forEach(k => { if (fired[k] < cutoff) delete fired[k]; });
    await kvSet('fired', fired);
    return { shown, badge };
  }

  g.DD = { DAY, MON, MONL, WD, WDL, pad, todayT, todayISO, parseD, isoT, daysLeft, addDays, addMonths, fmt0, fmt, fmtY, fmtW, fmtLong, fmtTime, inWords, money, GARDEN_IDS, gardenJobs,
    nzHolidays, holidaysBetween, BRIDGE, bridgeSeason, bridgeHours, bridgeStateAt, bridgeNext, bridgeStatus, bridgeMetres, nzClock, REPEATS, nextDue, billDates, nextBday, bdayAge, bdayDates, ordinal, repeatNth, isSeriesDate, repeatDates, REPEAT_LABEL, repeatText, PET_CARE, addInterval, regDueAfter, careDue, careNextAfter, careEvery, dueItems, status, badgeCount, HEALTH_TYPES, healthAppts, isMonday, lastMonday, fortnightOf, commSum, taxYearOf, centsMoney, parseCents, stage, pendingReminders, openDB, kvGet, kvSet, runCheck };
})(typeof self !== 'undefined' ? self : this);
