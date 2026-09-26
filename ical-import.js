/* Calendar import: turns an iCal (.ics) feed into a list of event occurrences for the app.
   Uses ical.js (vendor/ical.min.js, Mozilla, MPL-2.0) for parsing and recurrence rules.
   Times are converted with the phone's built-in time zone data (Intl) so they show correctly
   in New Zealand time, including Outlook's Windows zone names like "New Zealand Standard Time". */
(function (g) {
  'use strict';
  const HOME_TZ = 'Pacific/Auckland';
  const DAY = 864e5;
  // Windows time zone name -> IANA (from Unicode CLDR windowsZones.xml, territory 001)
  const WINDOWS_TZ = {"Dateline Standard Time":"Etc/GMT+12","UTC-11":"Etc/GMT+11","Aleutian Standard Time":"America/Adak","Hawaiian Standard Time":"Pacific/Honolulu","Marquesas Standard Time":"Pacific/Marquesas","Alaskan Standard Time":"America/Anchorage","UTC-09":"Etc/GMT+9","Pacific Standard Time (Mexico)":"America/Tijuana","UTC-08":"Etc/GMT+8","Pacific Standard Time":"America/Los_Angeles","US Mountain Standard Time":"America/Phoenix","Mountain Standard Time (Mexico)":"America/Mazatlan","Mountain Standard Time":"America/Denver","Yukon Standard Time":"America/Whitehorse","Central America Standard Time":"America/Guatemala","Central Standard Time":"America/Chicago","Easter Island Standard Time":"Pacific/Easter","Central Standard Time (Mexico)":"America/Mexico_City","Canada Central Standard Time":"America/Regina","SA Pacific Standard Time":"America/Bogota","Eastern Standard Time (Mexico)":"America/Cancun","Eastern Standard Time":"America/New_York","Haiti Standard Time":"America/Port-au-Prince","Cuba Standard Time":"America/Havana","US Eastern Standard Time":"America/Indianapolis","Turks And Caicos Standard Time":"America/Grand_Turk","Paraguay Standard Time":"America/Asuncion","Atlantic Standard Time":"America/Halifax","Venezuela Standard Time":"America/Caracas","Central Brazilian Standard Time":"America/Cuiaba","SA Western Standard Time":"America/La_Paz","Pacific SA Standard Time":"America/Santiago","Newfoundland Standard Time":"America/St_Johns","Tocantins Standard Time":"America/Araguaina","E. South America Standard Time":"America/Sao_Paulo","SA Eastern Standard Time":"America/Cayenne","Argentina Standard Time":"America/Buenos_Aires","Greenland Standard Time":"America/Godthab","Montevideo Standard Time":"America/Montevideo","Magallanes Standard Time":"America/Punta_Arenas","Saint Pierre Standard Time":"America/Miquelon","Bahia Standard Time":"America/Bahia","UTC-02":"Etc/GMT+2","Azores Standard Time":"Atlantic/Azores","Cape Verde Standard Time":"Atlantic/Cape_Verde","UTC":"Etc/UTC","GMT Standard Time":"Europe/London","Greenwich Standard Time":"Atlantic/Reykjavik","Sao Tome Standard Time":"Africa/Sao_Tome","Morocco Standard Time":"Africa/Casablanca","W. Europe Standard Time":"Europe/Berlin","Central Europe Standard Time":"Europe/Budapest","Romance Standard Time":"Europe/Paris","Central European Standard Time":"Europe/Warsaw","W. Central Africa Standard Time":"Africa/Lagos","Jordan Standard Time":"Asia/Amman","GTB Standard Time":"Europe/Bucharest","Middle East Standard Time":"Asia/Beirut","Egypt Standard Time":"Africa/Cairo","E. Europe Standard Time":"Europe/Chisinau","Syria Standard Time":"Asia/Damascus","West Bank Standard Time":"Asia/Hebron","South Africa Standard Time":"Africa/Johannesburg","FLE Standard Time":"Europe/Kiev","Israel Standard Time":"Asia/Jerusalem","South Sudan Standard Time":"Africa/Juba","Kaliningrad Standard Time":"Europe/Kaliningrad","Sudan Standard Time":"Africa/Khartoum","Libya Standard Time":"Africa/Tripoli","Namibia Standard Time":"Africa/Windhoek","Arabic Standard Time":"Asia/Baghdad","Turkey Standard Time":"Europe/Istanbul","Arab Standard Time":"Asia/Riyadh","Belarus Standard Time":"Europe/Minsk","Russian Standard Time":"Europe/Moscow","E. Africa Standard Time":"Africa/Nairobi","Iran Standard Time":"Asia/Tehran","Arabian Standard Time":"Asia/Dubai","Astrakhan Standard Time":"Europe/Astrakhan","Azerbaijan Standard Time":"Asia/Baku","Russia Time Zone 3":"Europe/Samara","Mauritius Standard Time":"Indian/Mauritius","Saratov Standard Time":"Europe/Saratov","Georgian Standard Time":"Asia/Tbilisi","Volgograd Standard Time":"Europe/Volgograd","Caucasus Standard Time":"Asia/Yerevan","Afghanistan Standard Time":"Asia/Kabul","West Asia Standard Time":"Asia/Tashkent","Ekaterinburg Standard Time":"Asia/Yekaterinburg","Pakistan Standard Time":"Asia/Karachi","Qyzylorda Standard Time":"Asia/Qyzylorda","India Standard Time":"Asia/Calcutta","Sri Lanka Standard Time":"Asia/Colombo","Nepal Standard Time":"Asia/Katmandu","Central Asia Standard Time":"Asia/Bishkek","Bangladesh Standard Time":"Asia/Dhaka","Omsk Standard Time":"Asia/Omsk","Myanmar Standard Time":"Asia/Rangoon","SE Asia Standard Time":"Asia/Bangkok","Altai Standard Time":"Asia/Barnaul","W. Mongolia Standard Time":"Asia/Hovd","North Asia Standard Time":"Asia/Krasnoyarsk","N. Central Asia Standard Time":"Asia/Novosibirsk","Tomsk Standard Time":"Asia/Tomsk","China Standard Time":"Asia/Shanghai","North Asia East Standard Time":"Asia/Irkutsk","Singapore Standard Time":"Asia/Singapore","W. Australia Standard Time":"Australia/Perth","Taipei Standard Time":"Asia/Taipei","Ulaanbaatar Standard Time":"Asia/Ulaanbaatar","Aus Central W. Standard Time":"Australia/Eucla","Transbaikal Standard Time":"Asia/Chita","Tokyo Standard Time":"Asia/Tokyo","North Korea Standard Time":"Asia/Pyongyang","Korea Standard Time":"Asia/Seoul","Yakutsk Standard Time":"Asia/Yakutsk","Cen. Australia Standard Time":"Australia/Adelaide","AUS Central Standard Time":"Australia/Darwin","E. Australia Standard Time":"Australia/Brisbane","AUS Eastern Standard Time":"Australia/Sydney","West Pacific Standard Time":"Pacific/Port_Moresby","Tasmania Standard Time":"Australia/Hobart","Vladivostok Standard Time":"Asia/Vladivostok","Lord Howe Standard Time":"Australia/Lord_Howe","Bougainville Standard Time":"Pacific/Bougainville","Russia Time Zone 10":"Asia/Srednekolymsk","Magadan Standard Time":"Asia/Magadan","Norfolk Standard Time":"Pacific/Norfolk","Sakhalin Standard Time":"Asia/Sakhalin","Central Pacific Standard Time":"Pacific/Guadalcanal","Russia Time Zone 11":"Asia/Kamchatka","New Zealand Standard Time":"Pacific/Auckland","UTC+12":"Etc/GMT-12","Fiji Standard Time":"Pacific/Fiji","Chatham Islands Standard Time":"Pacific/Chatham","UTC+13":"Etc/GMT-13","Tonga Standard Time":"Pacific/Tongatapu","Samoa Standard Time":"Pacific/Apia","Line Islands Standard Time":"Pacific/Kiritimati"};
  const pad = n => String(n).padStart(2, '0');

  let ICAL = null;
  async function loadICAL() {
    if (ICAL) return ICAL;
    if (g.ICAL) { ICAL = g.ICAL; return ICAL; }
    const m = await import('./vendor/ical.min.js');
    ICAL = m.default || m;
    return ICAL;
  }

  /* ---------- time zones ---------- */
  const validTz = {};
  function isIana(tz) {
    if (!tz || typeof tz !== 'string') return false;
    if (tz in validTz) return validTz[tz];
    let ok = false;
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); ok = /\//.test(tz) || tz === 'UTC'; } catch (e) { ok = false; }
    return (validTz[tz] = ok);
  }
  // Returns an IANA zone name, or null if we can't tell (caller then falls back to the feed's own VTIMEZONE).
  function mapTz(tzid) {
    if (!tzid) return null;
    let t = String(tzid).trim().replace(/^"|"$/g, '');
    if (isIana(t)) return t;
    if (WINDOWS_TZ[t]) return WINDOWS_TZ[t];
    const ci = Object.keys(WINDOWS_TZ).find(k => k.toLowerCase() === t.toLowerCase());
    if (ci) return WINDOWS_TZ[ci];
    // e.g. "/mozilla.org/20050126_1/Pacific/Auckland" or "/Pacific/Auckland"
    const m = t.match(/([A-Za-z_]+\/[A-Za-z_\-+]+(?:\/[A-Za-z_\-+]+)?)$/);
    if (m && isIana(m[1])) return m[1];
    // Exchange display names, e.g. "(UTC+12:00) Auckland, Wellington"
    if (/auckland|wellington/i.test(t)) return 'Pacific/Auckland';
    if (/chatham/i.test(t)) return 'Pacific/Chatham';
    if (/^(utc|gmt|z|etc\/utc|coordinated universal time)$/i.test(t)) return 'UTC';
    return null;
  }
  const dtfCache = {};
  function dtf(tz) {
    return dtfCache[tz] || (dtfCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }
  function wallParts(ms, tz) {
    const p = {}; dtf(tz).formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
    return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
  }
  function tzOffset(ms, tz) { const w = wallParts(ms, tz); return Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s) - Math.floor(ms / 1000) * 1000; }
  // Wall-clock time in zone tz -> epoch ms. Gaps (spring forward) resolve forwards, overlaps pick the first.
  function zonedToUtc(y, mo, d, h, mi, s, tz) {
    const guess = Date.UTC(y, mo - 1, d, h, mi, s);
    const o1 = tzOffset(guess - 0, tz);
    let t = guess - o1;
    const o2 = tzOffset(t, tz);
    if (o2 !== o1) { const t2 = guess - o2; if (tzOffset(t2, tz) === o2) t = t2; }
    return t;
  }
  function homeDate(ms) { const w = wallParts(ms, HOME_TZ); return w.y + '-' + pad(w.mo) + '-' + pad(w.d); }
  function homeTime(ms) { const w = wallParts(ms, HOME_TZ); return pad(w.h) + ':' + pad(w.mi); }

  /* ---------- helpers on ical.js values ---------- */
  const dateStr = t => t.year + '-' + pad(t.month) + '-' + pad(t.day);
  const isUtc = t => !!(t.zone && (t.zone === ICAL.Timezone.utcTimezone || t.zone.tzid === 'UTC' || t.zone.tzid === 'Z'));
  // Epoch ms for a DATE-TIME value; tzid is the TZID parameter of the property it came from.
  function epochOf(t, tzid) {
    if (isUtc(t)) return Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second);
    const iana = mapTz(tzid);
    if (iana) return zonedToUtc(t.year, t.month, t.day, t.hour, t.minute, t.second, iana);
    if (tzid && t.zone && t.zone.tzid === tzid && t.zone.component) { try { return t.toUnixTime() * 1000; } catch (e) { } }
    return zonedToUtc(t.year, t.month, t.day, t.hour, t.minute, t.second, HOME_TZ); // floating time: treat as NZ
  }
  const tzidOf = prop => (prop && prop.getParameter('tzid')) || null;
  function txt(comp, name, max) {
    let v = comp.getFirstPropertyValue(name);
    if (v == null) return '';
    v = String(v).replace(/\r\n?/g, '\n').trim();
    return max && v.length > max ? v.slice(0, max) + '…' : v;
  }

  const BDAY_RE = /\b(birthday|b['’]?day|bday)\b/i;
  function birthdayName(title) {
    let n = String(title || '')
      .replace(/^\s*(happy\s+)?(birthday|b['’]?day|bday)\s*(of|for|:|-|–|—)?\s*/i, '')
      .replace(/\s*(['’]s)?\s*(\d+(st|nd|rd|th)\s+)?(birthday|b['’]?day|bday)\s*!?\s*$/i, '')
      .replace(/[🎂🎉🎈]/gu, '').replace(/\(\s*\)/g, '').trim();
    return n.replace(/^[-–—:\s]+|[-–—:\s!]+$/g, '').trim();
  }

  /* ---------- the parser ---------- */
  // Returns { events: [...], count, total, calName }. Window defaults to 30 days back .. 12 months ahead.
  function parseFeed(text, opts = {}) {
    if (!ICAL) throw new Error('ical.js not loaded');
    const now = opts.now || Date.now();
    const fromMs = opts.fromMs != null ? opts.fromMs : now - 30 * DAY;
    const toMs = opts.toMs != null ? opts.toMs : now + 366 * DAY;
    const fromDate = homeDate(fromMs), toDate = homeDate(toMs);
    const cap = opts.cap || 3000;
    let root;
    try { root = new ICAL.Component(ICAL.parse(String(text))); } catch (e) { const err = new Error('parse'); err.code = 'parse'; throw err; }
    if (root.name !== 'vcalendar') { const c = root.getFirstSubcomponent('vcalendar'); if (c) root = c; }
    // Register the feed's own time zone definitions, used only when a TZID can't be mapped.
    root.getAllSubcomponents('vtimezone').forEach(vtz => {
      try { const tz = new ICAL.Timezone(vtz); if (tz.tzid && !ICAL.TimezoneService.has(tz.tzid)) ICAL.TimezoneService.register(tz.tzid, tz); } catch (e) { }
    });
    const calName = txt(root, 'x-wr-calname', 80);
    const googleBirthdays = /birthdays?/i.test(calName) && /#contacts@group\.v\.calendar\.google\.com|addressbook/i.test(String(text).slice(0, 4000));

    const masters = new Map(), overrides = new Map(), singles = [];
    root.getAllSubcomponents('vevent').forEach(ve => {
      const uid = txt(ve, 'uid') || ('nouid-' + Math.random().toString(36).slice(2));
      if (ve.hasProperty('recurrence-id')) { if (!overrides.has(uid)) overrides.set(uid, []); overrides.get(uid).push(ve); }
      else if (masters.has(uid)) singles.push([uid, ve]);
      else masters.set(uid, ve);
    });

    const out = [];
    let total = 0;
    // Build one occurrence from a VEVENT with a given start.
    function info(ve) {
      const sp = ve.getFirstProperty('dtstart'); if (!sp) return null;
      const st = sp.getFirstValue(); if (!st) return null;
      const allDay = !!st.isDate;
      const ep = ve.getFirstProperty('dtend');
      let dur; // ms for timed, days for all-day
      if (allDay) {
        if (ep && ep.getFirstValue()) { const e = ep.getFirstValue(); dur = Math.max(1, Math.round((Date.UTC(e.year, e.month - 1, e.day) - Date.UTC(st.year, st.month - 1, st.day)) / DAY)); }
        else if (ve.hasProperty('duration')) dur = Math.max(1, Math.round(ve.getFirstPropertyValue('duration').toSeconds() / 86400));
        else dur = 1;
      } else {
        const s = epochOf(st, tzidOf(sp));
        if (ep && ep.getFirstValue()) { const e = ep.getFirstValue(); dur = e.isDate ? DAY : Math.max(0, epochOf(e, tzidOf(ep)) - s); }
        else if (ve.hasProperty('duration')) dur = ve.getFirstPropertyValue('duration').toSeconds() * 1000;
        else dur = 0;
      }
      const title = txt(ve, 'summary', 200) || '(No title)';
      const rr = ve.getFirstPropertyValue('rrule');
      const yearly = !!(rr && rr.freq === 'YEARLY');
      const cats = ve.getAllProperties('categories').map(p => String(p.getFirstValue() || '')).join(',');
      const isBday = BDAY_RE.test(title) && (yearly || allDay) || (googleBirthdays && allDay) || /birthday/i.test(cats);
      return { sp, st, allDay, dur, tzid: tzidOf(sp), title, location: txt(ve, 'location', 200), desc: txt(ve, 'description', 600),
        status: String(ve.getFirstPropertyValue('status') || '').toUpperCase(), birthday: isBday, bdayName: isBday ? birthdayName(title) : '' };
    }
    function emit(uid, inf, startT, recKey) {
      let ev;
      if (inf.allDay) {
        const date = dateStr(startT);
        const end = new Date(Date.UTC(startT.year, startT.month - 1, startT.day) + (inf.dur - 1) * DAY);
        const endDate = end.getUTCFullYear() + '-' + pad(end.getUTCMonth() + 1) + '-' + pad(end.getUTCDate());
        if (endDate < fromDate || date > toDate) return;
        ev = { key: uid + '|' + (recKey || date), allDay: true, date, endDate, time: '', start: null, end: null };
      } else {
        const s = typeof startT === 'number' ? startT : epochOf(startT, inf.tzid);
        const e = s + inf.dur;
        if (e < fromMs || s > toMs) return;
        ev = { key: uid + '|' + (recKey || s), allDay: false, date: homeDate(s), time: homeTime(s), endDate: homeDate(Math.max(s, e - 1)), endTime: homeTime(e), start: s, end: e };
      }
      ev.title = inf.title; if (inf.location) ev.location = inf.location; if (inf.desc) ev.desc = inf.desc;
      if (inf.birthday) { ev.birthday = true; ev.bdayName = inf.bdayName; }
      total++;
      if (out.length < cap) out.push(ev);
    }
    // Key used to match EXDATE / RECURRENCE-ID values against generated occurrences.
    function occKey(t, tzid, allDay) {
      if (t.isDate || allDay) return 'D' + dateStr(t);
      return 'T' + epochOf(t, tzid);
    }

    for (const [uid, ve] of masters) {
      const inf = info(ve); if (!inf) continue;
      if (inf.status === 'CANCELLED') continue;
      const ovs = overrides.get(uid) || []; overrides.delete(uid);
      const rrules = ve.getAllProperties('rrule'), rdates = ve.getAllProperties('rdate');
      if (!rrules.length && !rdates.length) { emit(uid, inf, inf.allDay ? inf.st : epochOf(inf.st, inf.tzid)); continue; }

      // Exclusions
      const exT = new Set(), exD = new Set();
      ve.getAllProperties('exdate').forEach(p => p.getValues().forEach(v => {
        if (!v) return;
        if (v.isDate) exD.add(dateStr(v)); else { exT.add(epochOf(v, tzidOf(p) || (isUtc(v) ? null : inf.tzid))); if (inf.allDay) exD.add(dateStr(v)); }
      }));
      // Overrides keyed by the occurrence they replace
      const ovMap = new Map();
      ovs.forEach(o => {
        const rp = o.getFirstProperty('recurrence-id'), rv = rp && rp.getFirstValue(); if (!rv) return;
        ovMap.set(occKey(rv, tzidOf(rp) || (isUtc(rv) ? null : inf.tzid), inf.allDay), o);
      });
      const seen = new Set();
      const handle = (t) => {
        const k = inf.allDay ? 'D' + dateStr(t) : 'T' + epochOf(t, inf.tzid);
        if (seen.has(k)) return; seen.add(k);
        if (inf.allDay ? exD.has(dateStr(t)) : (exT.has(+k.slice(1)) || exD.has(dateStr(t)))) return;
        const o = ovMap.get(k);
        if (o) { ovMap.delete(k); const oi = info(o); if (!oi || oi.status === 'CANCELLED') return; emit(uid, oi, oi.allDay ? oi.st : epochOf(oi.st, oi.tzid), k); return; }
        emit(uid, inf, t, k);
      };
      // RRULE expansion. UNTIL is applied here (in real time) rather than by ical.js, so
      // Outlook's UTC UNTIL values work with local start times.
      rrules.forEach(p => {
        const rule = p.getFirstValue().clone();
        let untilMs = null, untilDate = null;
        if (rule.until) {
          const u = rule.until;
          if (u.isDate || inf.allDay) untilDate = dateStr(u);
          else untilMs = isUtc(u) ? Date.UTC(u.year, u.month - 1, u.day, u.hour, u.minute, u.second) : epochOf(u, inf.tzid);
          if (u.isDate && !inf.allDay) { untilDate = dateStr(u); }
          rule.until = null;
        }
        const it = rule.iterator(inf.st.clone());
        for (let i = 0, t; i < 20000 && (t = it.next()); i++) {
          if (inf.allDay) { const ds = dateStr(t); if (untilDate && ds > untilDate) break; if (ds > toDate) break; }
          else {
            const ms = epochOf(t, inf.tzid);
            if (untilMs != null && ms > untilMs) break;
            if (untilDate && homeDate(ms) > untilDate && dateStr(t) > untilDate) break;
            if (ms > toMs) break;
          }
          handle(t);
        }
      });
      rdates.forEach(p => p.getValues().forEach(v => {
        const t = v && v.start ? v.start : v; if (!t || typeof t.year !== 'number') return;
        handle(t);
      }));
      // Overrides that moved an occurrence we didn't generate (e.g. outside the rule) still show.
      for (const [k, o] of ovMap) { const oi = info(o); if (oi && oi.status !== 'CANCELLED') emit(uid, oi, oi.allDay ? oi.st : epochOf(oi.st, oi.tzid), k); }
    }
    // Duplicate UIDs without recurrence, and overrides whose master isn't in the feed
    singles.forEach(([uid, ve]) => { const inf = info(ve); if (inf && inf.status !== 'CANCELLED') emit(uid + '#' + Math.random().toString(36).slice(2, 6), inf, inf.allDay ? inf.st : epochOf(inf.st, inf.tzid)); });
    for (const [uid, list] of overrides) list.forEach(o => { const inf = info(o); if (inf && inf.status !== 'CANCELLED') emit(uid, inf, inf.allDay ? inf.st : epochOf(inf.st, inf.tzid), 'r' + txt(o, 'recurrence-id')); });

    out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || (a.allDay ? 0 : 1) - (b.allDay ? 0 : 1) || (a.start || 0) - (b.start || 0));
    return { events: out, count: out.length, total, calName };
  }

  g.CalImport = { loadICAL, parseFeed, mapTz, zonedToUtc, homeDate, homeTime, birthdayName, setICAL: m => { ICAL = m.default || m; }, WINDOWS_TZ, HOME_TZ };
})(typeof self !== 'undefined' ? self : globalThis);
