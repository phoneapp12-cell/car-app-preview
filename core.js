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
    (data.todos || []).filter(t => !t.done && t.due).forEach(t => out.push({ kind: 'todo', part: 'todo', id: t.id, todo: t, title: t.title, date: t.due, go: '#todo' }));
    out.forEach(x => { x.days = daysLeft(x.date, now); });
    return out.sort((a, b) => a.days - b.days || a.title.localeCompare(b.title));
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
    return { title: d < 0 ? `To-do overdue: ${x.title}` : `To-do today: ${x.title}`, body: d < 0 ? `It was due ${fmtW(x.date, now)}.` : 'Tap to tick it off.' };
  }

  // Works out which reminders should fire now. `fired` is an object of key -> time fired.
  function pendingReminders(data, fired, now = new Date(), cal = {}) {
    const s = data.settings || {};
    const out = [];
    const daytime = !quietNow(now);
    dueItems(data, now).forEach(x => {
      if (x.kind === 'driver' && !daytime) return; // AA / licence reminders wait until 7 am
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

  g.DD = { DAY, MON, MONL, WD, WDL, pad, todayT, todayISO, parseD, isoT, daysLeft, addDays, addMonths, fmt0, fmt, fmtY, fmtW, fmtLong, fmtTime, inWords, money,
    nzHolidays, holidaysBetween, BRIDGE, bridgeSeason, bridgeHours, bridgeStateAt, bridgeNext, bridgeStatus, bridgeMetres, nzClock, REPEATS, nextDue, billDates, nextBday, bdayAge, bdayDates, ordinal, dueItems, status, badgeCount, stage, pendingReminders, openDB, kvGet, kvSet, runCheck };
})(typeof self !== 'undefined' ? self : this);
