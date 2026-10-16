/* 2.26.0: /tides. LINZ official predictions for Marsden Point (standard port), corrected for Whangārei
   (LINZ secondary port 6395, beside Onerahi): high water +21 min, low water +14 min,
   height = 1.8 + (Marsden Point height − 1.63) × 1.14. Same output shape as the app's data/tides-whangarei.json.
   Cached in the Cache API for 7 days (no KV writes). Nothing is guessed: if LINZ can't be read, it errors. */
import { cacheGet, cachePut } from './kvguard.js';
const SRC = y => `https://static.charts.linz.govt.nz/tide-tables/maj-ports/csv/Marsden%20Point%20${y}.csv`;
const HW_MIN = 21, LW_MIN = 14, STD_MSL = 1.63, SEC_MSL = 1.8, RATIO = 1.14;
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const pad = n => String(n).padStart(2, '0');
const wall = ms => { const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`; };
function aklToUtc(y, m, d, hh, mm) {
  const want = `${y}-${pad(m)}-${pad(d)} ${pad(hh)}:${pad(mm)}`, base = Date.UTC(y, m - 1, d, hh, mm);
  for (const off of [13, 12]) { const ms = base - off * 3600e3; if (wall(ms) === want) return ms; }
  return base - 12 * 3600e3;
}
export function parseTides(csvs) {
  const rows = [];
  for (const text of csvs) for (const line of String(text).split(/\r?\n/).slice(3)) {
    const c = line.split(','); if (c.length < 6 || !/^\d+$/.test(c[0])) continue;
    const d = +c[0], m = +c[2], yr = +c[3];
    for (let i = 4; i + 1 < c.length; i += 2) {
      const t = (c[i] || '').trim(), h = (c[i + 1] || '').trim();
      if (!/^\d{2}:\d{2}$/.test(t) || !/^-?\d+(\.\d+)?$/.test(h)) continue;
      rows.push({ ms: aklToUtc(yr, m, d, +t.slice(0, 2), +t.slice(3)), h: +h });
    }
  }
  rows.sort((a, b) => a.ms - b.ms);
  rows.forEach((r, i) => { const a = rows[i - 1], b = rows[i + 1]; r.k = a && b ? (r.h > a.h && r.h > b.h ? 'H' : 'L') : a ? (r.h > a.h ? 'H' : 'L') : b ? (r.h > b.h ? 'H' : 'L') : 'H'; });
  const out = { v: 1, place: 'Whangārei Harbour', source: 'LINZ tide predictions for Marsden Point, adjusted for Whangārei (secondary port 6395)', correction: { hwMin: HW_MIN, lwMin: LW_MIN, stdMsl: STD_MSL, secMsl: SEC_MSL, ratio: RATIO }, t: [], h: [], k: '' };
  for (const r of rows) { out.t.push(Math.round((r.ms + (r.k === 'H' ? HW_MIN : LW_MIN) * 60e3) / 60e3)); out.h.push(Math.round((SEC_MSL + (r.h - STD_MSL) * RATIO) * 10)); out.k += r.k; }
  if (out.t.length) { out.from = new Date(out.t[0] * 60e3).toISOString(); out.to = new Date(out.t[out.t.length - 1] * 60e3).toISOString(); }
  return out;
}
export async function getTides(fetchImpl = fetch, now = Date.now()) {
  const y = +fmt.format(new Date(now)).slice(0, 4), key = 'tides-' + y;
  const hit = await cacheGet(key); if (hit && hit.t && hit.t.length) return hit;
  const csvs = [];
  for (const yr of [y, y + 1]) {
    try { const r = await fetchImpl(SRC(yr), { headers: { 'User-Agent': 'DueDatesCalendarRelay/1.0' } }); if (r.ok) { const t = await r.text(); if (/Marsden Point/i.test(t.slice(0, 200))) csvs.push(t); } } catch (e) { }
  }
  if (!csvs.length) throw new Error('tides_unavailable');
  const out = parseTides(csvs);
  if (!out.t.length) throw new Error('tides_unavailable');
  await cachePut(key, out, 7 * 86400);
  return out;
}
