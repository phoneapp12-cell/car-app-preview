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

  /* ---------- everything that has a due date ---------- */
  function dueItems(data, now) {
    const out = [];
    (data.cars || []).forEach(c => {
      if (c.wof) out.push({ kind: 'car', part: 'wof', id: c.id, car: c, label: 'WOF', title: c.name + ' WOF', date: c.wof, go: '#car/' + c.id });
      if (c.rego) out.push({ kind: 'car', part: 'rego', id: c.id, car: c, label: 'Rego', title: c.name + ' rego', date: c.rego, go: '#car/' + c.id });
      if (c.svcDate) out.push({ kind: 'car', part: 'svc', id: c.id, car: c, label: 'Service', title: c.name + ' service', date: c.svcDate, go: '#car/' + c.id });
    });
    (data.bills || []).filter(b => !b.paid && b.due).forEach(b => out.push({ kind: 'bill', part: 'bill', id: b.id, bill: b, title: b.name, date: b.due, go: '#bills' }));
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
    return { title: d < 0 ? `To-do overdue: ${x.title}` : `To-do today: ${x.title}`, body: d < 0 ? `It was due ${fmtW(x.date, now)}.` : 'Tap to tick it off.' };
  }

  // Works out which reminders should fire now. `fired` is an object of key -> time fired.
  function pendingReminders(data, fired, now = new Date()) {
    const s = data.settings || {};
    const out = [];
    dueItems(data, now).forEach(x => {
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
    const list = pendingReminders(data, fired, now);
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
    REPEATS, nextDue, billDates, dueItems, status, badgeCount, stage, pendingReminders, openDB, kvGet, kvSet, runCheck };
})(typeof self !== 'undefined' ? self : this);
