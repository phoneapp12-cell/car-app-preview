// Builds data/tides-whangarei.json from LINZ official tide predictions (standard port: Marsden Point).
// Inputs: tools/marsden<year>.csv, downloaded unchanged from
//   https://static.charts.linz.govt.nz/tide-tables/maj-ports/csv/Marsden%20Point%20<year>.csv
// LINZ times are New Zealand local time (NZDT applied when daylight saving is on). Heights in metres.
// Secondary port correction, LINZ "Secondary ports 2026-27" (NZ Nautical Almanac), port 6395 Whangārei
// (35°46'S 174°21'E, the harbour off Onerahi): high water +0h21m, low water +0h14m (mean differences),
// MSL 1.8 m, range ratio 1.14; Marsden Point MSL 1.63 m.
// Height at Whangārei = 1.8 + (Marsden Point height − 1.63) × 1.14  (gives MHWS 3.0, MLWS 0.5, matching the table).
// Run: node tools/build-tides.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const YEARS = [2026, 2027];
const HW_MIN = 21, LW_MIN = 14, STD_MSL = 1.63, SEC_MSL = 1.8, RATIO = 1.14;
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const wall = ms => { const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`; };
const pad = n => String(n).padStart(2, '0');
function aklToUtc(y, m, d, hh, mm) {
  const want = `${y}-${pad(m)}-${pad(d)} ${pad(hh)}:${pad(mm)}`;
  const base = Date.UTC(y, m - 1, d, hh, mm);
  for (const off of [13, 12]) { const ms = base - off * 3600e3; if (wall(ms) === want) return ms; }
  return base - 12 * 3600e3; // the skipped hour when clocks go forward; doesn't occur in practice
}
const rows = [];
for (const y of YEARS) {
  const lines = readFileSync(new URL(`./marsden${y}.csv`, import.meta.url), 'utf8').split(/\r?\n/).slice(3);
  for (const line of lines) {
    const c = line.split(',');
    if (c.length < 6 || !/^\d+$/.test(c[0])) continue;
    const d = +c[0], m = +c[2], yr = +c[3];
    for (let i = 4; i + 1 < c.length; i += 2) {
      const t = (c[i] || '').trim(), h = (c[i + 1] || '').trim();
      if (!/^\d{2}:\d{2}$/.test(t) || !/^-?\d+(\.\d+)?$/.test(h)) continue;
      rows.push({ ms: aklToUtc(yr, m, d, +t.slice(0, 2), +t.slice(3)), h: +h });
    }
  }
}
rows.sort((a, b) => a.ms - b.ms);
// High or low: higher than both neighbours is high water. Tides alternate, so check that too.
rows.forEach((r, i) => {
  const a = rows[i - 1], b = rows[i + 1];
  r.k = a && b ? (r.h > a.h && r.h > b.h ? 'H' : 'L') : a ? (r.h > a.h ? 'H' : 'L') : (r.h > b.h ? 'H' : 'L');
});
for (let i = 1; i < rows.length; i++) if (rows[i].k === rows[i - 1].k) throw new Error('tides do not alternate at ' + new Date(rows[i].ms).toISOString());
const out = {
  v: 1,
  place: 'Whangārei Harbour',
  source: 'LINZ tide predictions for Marsden Point, adjusted for Whangārei (secondary port 6395)',
  correction: { hwMin: HW_MIN, lwMin: LW_MIN, stdMsl: STD_MSL, secMsl: SEC_MSL, ratio: RATIO },
  // t: UTC epoch minutes; h: height in decimetres above chart datum; k: H or L
  t: [], h: [], k: ''
};
for (const r of rows) {
  const ms = r.ms + (r.k === 'H' ? HW_MIN : LW_MIN) * 60e3;
  out.t.push(Math.round(ms / 60e3));
  out.h.push(Math.round((SEC_MSL + (r.h - STD_MSL) * RATIO) * 10));
  out.k += r.k;
}
out.from = new Date(out.t[0] * 60e3).toISOString();
out.to = new Date(out.t[out.t.length - 1] * 60e3).toISOString();
writeFileSync(new URL('../data/tides-whangarei.json', import.meta.url), JSON.stringify(out));
console.log('tides', rows.length, out.from, out.to);
