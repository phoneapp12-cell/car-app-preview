/* 2.27.36: Marsden Point terminal gate prices (wholesale, incl. taxes) for My App's Fuel card.
 * Sources: only the price lists BP and Z must publish under the Fuel Industry Act 2020 (public PDFs).
 * Nothing from Gaspy, Gassy or any site whose terms ban automated access. One read a day from 6am NZ time
 * (10-minute cron), retried at most hourly if it fails. KV keeps a 30-day history. GET /fuel returns it.
 */
const KEY = 'fuel-v2';
export const SEED_FUEL_DAYS = [{"d":"2026-09-26","z91":329.5,"z95":351.46,"zDiesel":307.62,"zEff":"2026-09-23"},{"d":"2026-09-27","z91":329.5,"z95":351.46,"zDiesel":307.62,"zEff":"2026-09-23"},{"d":"2026-09-28","z91":329.5,"z95":351.46,"zDiesel":307.62,"zEff":"2026-09-23"},{"d":"2026-09-29","z91":329.5,"z95":351.46,"zDiesel":307.62,"zEff":"2026-09-23"},{"d":"2026-09-30","z91":328.96,"z95":351.51,"zDiesel":290.84,"zEff":"2026-09-30"},{"d":"2026-10-01","z91":328.96,"z95":351.51,"zDiesel":290.84,"zEff":"2026-09-30"},{"d":"2026-10-02","z91":328.96,"z95":351.51,"zDiesel":290.84,"zEff":"2026-09-30"},{"d":"2026-10-03","z91":328.96,"z95":351.51,"zDiesel":290.84,"zEff":"2026-09-30"},{"d":"2026-10-04","z91":328.96,"z95":351.51,"zDiesel":290.84,"zEff":"2026-09-30"},{"d":"2026-10-05","z91":328.96,"z95":351.51,"zDiesel":290.84,"zEff":"2026-09-30"},{"d":"2026-10-06","z91":328.96,"z95":351.51,"zDiesel":290.84,"zEff":"2026-09-30"},{"d":"2026-10-07","z91":335.46,"z95":358.18,"zDiesel":291.75,"zEff":"2026-10-07"},{"d":"2026-10-08","z91":335.46,"z95":358.18,"zDiesel":291.75,"zEff":"2026-10-07"},{"d":"2026-10-09","z91":335.46,"z95":358.18,"zDiesel":291.75,"zEff":"2026-10-07"},{"d":"2026-10-10","z91":335.46,"z95":358.18,"zDiesel":291.75,"zEff":"2026-10-07"},{"d":"2026-10-11","z91":335.46,"z95":358.18,"zDiesel":291.75,"zEff":"2026-10-07"},{"d":"2026-10-12","z91":335.46,"z95":358.18,"zDiesel":291.75,"zEff":"2026-10-07"},{"d":"2026-10-13","z91":335.46,"z95":358.18,"zDiesel":291.75,"zEff":"2026-10-07"},{"d":"2026-10-14","z91":339.92,"z95":361.75,"zDiesel":288.52,"zEff":"2026-10-14"},{"d":"2026-10-15","z91":339.92,"z95":361.75,"zDiesel":288.52,"zEff":"2026-10-14"},{"d":"2026-10-16","z91":339.92,"z95":361.75,"zDiesel":288.52,"zEff":"2026-10-14"},{"d":"2026-10-17","z91":339.92,"z95":361.75,"zDiesel":288.52,"zEff":"2026-10-14"},{"d":"2026-10-18","z91":339.92,"z95":361.75,"zDiesel":288.52,"zEff":"2026-10-14"},{"d":"2026-10-19","z91":339.92,"z95":361.75,"zDiesel":288.52,"zEff":"2026-10-14"},{"d":"2026-10-20","bp91":335.05,"bp95":347.02,"bpDiesel":304.65,"bpEff":"2026-10-20","z91":339.92,"z95":361.75,"zDiesel":288.52,"zEff":"2026-10-14"},{"d":"2026-10-21","bp91":335.05,"bp95":347.02,"bpDiesel":304.65,"bpEff":"2026-10-20","z91":327.11,"z95":343.91,"zDiesel":288.99,"zEff":"2026-10-21"},{"d":"2026-10-22","bp91":335.05,"bp95":347.02,"bpDiesel":304.65,"bpEff":"2026-10-20","z91":327.11,"z95":343.91,"zDiesel":288.99,"zEff":"2026-10-21"},{"d":"2026-10-23","bp91":328.86,"bp95":340.02,"bpDiesel":305.36,"bpEff":"2026-10-23","z91":327.11,"z95":343.91,"zDiesel":288.99,"zEff":"2026-10-21"},{"d":"2026-10-24","bp91":328.86,"bp95":340.02,"bpDiesel":305.36,"bpEff":"2026-10-23","z91":327.11,"z95":343.91,"zDiesel":288.99,"zEff":"2026-10-21"},{"d":"2026-10-25","bp91":328.86,"bp95":340.02,"bpDiesel":305.36,"bpEff":"2026-10-23","z91":327.11,"z95":343.91,"zDiesel":288.99,"zEff":"2026-10-21"}];
const Z_PAGE = 'https://www.z.co.nz/for-businesses/fuels-and-services/terminal-gate-pricing';
const BP_PDF = 'https://www.bp.com/content/dam/bp/country-sites/en_nz/new-zealand/home/documents/tgp-pricing-uploads/terminal-gate-prices-nz.pdf';
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; due-dates-relay; personal fuel price card)', Accept: 'text/html,application/pdf' };
const FROM_HOUR = 6, RETRY_MS = 55 * 60 * 1000, KEEP = 30;
const nzStamp = now => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now)).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`; };

const latin1 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return s; };
async function inflate(u8) {
  const ds = new DecompressionStream('deflate'), w = ds.writable.getWriter(); w.write(u8).catch(() => { }); w.close().catch(() => { });
  const r = ds.readable.getReader(), parts = []; let n = 0;
  try { for (;;) { const { value, done } = await r.read(); if (done) break; parts.push(value); n += value.length; } } catch (e) { if (!n) throw e; }
  const out = new Uint8Array(n); let o = 0; parts.forEach(p => { out.set(p, o); o += p.length; }); return out;
}
function unLit(s) { return s.replace(/\\(\d{1,3}|.)/g, (_, c) => /^\d/.test(c) ? String.fromCharCode(parseInt(c, 8)) : ({ n: '\n', r: '\r', t: '\t', b: '', f: '' }[c] ?? c)); }
// Pure: one decoded content stream in, text pieces with their x/y out (literal strings only; enough for these lists).
export function textItems(cs) {
  const out = []; let x = 0, y = 0, lx = 0, ly = 0;
  const re = /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm|(-?[\d.]+)\s+(-?[\d.]+)\s+T[dD]|\bBT\b|\[((?:\\.|[^\]\\])*)\]\s*TJ|\(((?:\\.|[^)\\])*)\)\s*(?:Tj|'|")/g;
  let m;
  while ((m = re.exec(cs))) {
    if (m[5] !== undefined) { x = lx = +m[5]; y = ly = +m[6]; }
    else if (m[7] !== undefined) { lx += +m[7]; ly += +m[8]; x = lx; y = ly; }
    else if (m[0] === 'BT') { x = lx = 0; y = ly = 0; }
    else { const raw = m[9] !== undefined ? (m[9].match(/\((?:\\.|[^)\\])*\)/g) || []).map(p => p.slice(1, -1)).join('') : m[10]; const t = unLit(raw).replace(/\s+/g, ' ').trim(); if (t) out.push({ x, y, t }); }
  }
  return out;
}
export async function pdfStreams(buf) {
  const u8 = new Uint8Array(buf), s = latin1(u8), out = [];
  const re = /<<((?:[^<>]|<<(?:[^<>]|<<[^<>]*>>)*>>|<[0-9A-Fa-f]*>)*)>>\s*stream\r?\n/g; let m;
  while ((m = re.exec(s))) {
    const d = m[1]; if (/\/(Subtype\s*\/(Image|XML|Type1C|CIDFontType0C)|Type\s*\/(XRef|Metadata|ObjStm))/.test(d) || /\/Length1\b/.test(d)) continue;
    const L = /\/Length\s+(\d+)(\s+\d+\s+R)?/.exec(d), start = m.index + m[0].length;
    const end = L && !L[2] ? start + +L[1] : s.indexOf('endstream', start); if (end < start) continue;
    const raw = u8.subarray(start, end);
    try { out.push(latin1(/FlateDecode/.test(d) ? await inflate(raw) : raw)); } catch (e) { }
  }
  return out;
}
const num = t => { const v = parseFloat(String(t).replace(/[^\d.]/g, '')); return v > 100 && v < 1000 ? Math.round(v * 100) / 100 : null; };
const dmy = t => { const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t || ''); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
// Pure: items of one table page in, { eff, p91, p95 } for the Marsden Point row (or null).
export function marsdenRow(items, h91, h95) {
  const effI = items.find(i => /\d{1,2}\/\d{1,2}\/\d{4}/.test(i.t)); const eff = effI ? dmy(effI.t) : '';
  const row = items.find(i => /^Marsden Point/i.test(i.t)); if (!row) return null;
  const sameY = items.filter(i => Math.abs(i.y - row.y) < 4 && num(i.t) != null && /^\d{3}\.\d{1,2}$/.test(i.t.trim()));
  const hs = [h91, h95, /^(Diesel|ADF)/i].map(re => items.filter(i => re.test(i.t) && i.y > row.y).sort((a, b) => a.y - b.y)[0] || null);
  const nums = sameY.slice().sort((a, b) => a.x - b.x), heads = hs.filter(Boolean).slice().sort((a, b) => a.x - b.x);
  const col = re => { const h = hs[re === h91 ? 0 : 1]; if (!h || !nums.length) return null;
    if (nums.length === heads.length) return num(nums[heads.indexOf(h)].t);
    const c = nums.filter(n => n.x >= h.x - 10).sort((a, b) => a.x - b.x)[0]; return c && c.x - h.x < 120 ? num(c.t) : null; };
  const hD = /^(Diesel|ADF)/i;
  const colIdx = idx => { const h = hs[idx]; if (!h || !nums.length) return null; if (nums.length === heads.length) return num(nums[heads.indexOf(h)].t); const c = nums.filter(n => n.x >= h.x - 10).sort((a, b) => a.x - b.x)[0]; return c && c.x - h.x < 120 ? num(c.t) : null; };
  const p91 = colIdx(0), p95 = colIdx(1), pDiesel = colIdx(2);
  return p91 ? { eff, p91, p95, pDiesel } : null;
}
export async function readList(buf, h91, h95) {
  const pages = (await pdfStreams(buf)).map(cs => marsdenRow(textItems(cs), h91, h95)).filter(Boolean);
  pages.sort((a, b) => (b.eff || '').localeCompare(a.eff || '')); return pages[0] || null;
}
async function get(fetchImpl, url, ms = 15000) { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); try { const r = await fetchImpl(url, { headers: UA, signal: c.signal, redirect: 'follow' }); if (!r.ok) throw new Error('http ' + r.status); return r; } finally { clearTimeout(t); } }
async function readZ(fetchImpl) {
  const html = await (await get(fetchImpl, Z_PAGE)).text();
  const u = (/https:\/\/[^"'\s]+\/TGP-Price-\d{8}\.pdf/.exec(html) || [])[0]; if (!u) throw new Error('z link');
  return readList(await (await get(fetchImpl, u)).arrayBuffer(), /Regular 91/i, /Premium 95/i);
}
async function readBP(fetchImpl) { return readList(await (await get(fetchImpl, BP_PDF)).arrayBuffer(), /^M91/, /^M95/); }

export async function fetchFuel(fetchImpl = fetch) {
  const [z, bp] = await Promise.all([readZ(fetchImpl).catch(e => ({ err: String(e && e.message || e).slice(0, 60) })), readBP(fetchImpl).catch(e => ({ err: String(e && e.message || e).slice(0, 60) }))]);
  return { z: z && z.p91 ? z : null, bp: bp && bp.p91 ? bp : null, errs: { z: z && z.err || (z && z.p91 ? '' : 'no row'), bp: bp && bp.err || (bp && bp.p91 ? '' : 'no row') } };
}
// Pure: merge one day's reading into the stored record (30 days, one entry per NZ day).
export function mergeSeedDays(rawDays) {
  const byD = new Map(SEED_FUEL_DAYS.map(x => [x.d, Object.assign({}, x)]));
  (Array.isArray(rawDays) ? rawDays : []).forEach(x => {
    if (x && x.d) byD.set(x.d, Object.assign({}, byD.get(x.d) || {}, x));
  });
  return [...byD.values()].sort((a, b) => a.d.localeCompare(b.d)).slice(-KEEP);
}
export function addDay(rec, day, got, now) {
  const days = mergeSeedDays(rec && rec.days).filter(d => d.d !== day);
  const e = { d: day };
  if (got.bp) { e.bp91 = got.bp.p91; if (got.bp.p95) e.bp95 = got.bp.p95; if (got.bp.pDiesel) e.bpDiesel = got.bp.pDiesel; e.bpEff = got.bp.eff; }
  if (got.z) { e.z91 = got.z.p91; if (got.z.p95) e.z95 = got.z.p95; if (got.z.pDiesel) e.zDiesel = got.z.pDiesel; e.zEff = got.z.eff; }
  if (e.bp91 || e.z91) days.push(e);
  days.sort((a, b) => a.d.localeCompare(b.d));
  return { days: days.slice(-KEEP), at: now, tryAt: now, ok: !!(e.bp91 || e.z91), day: (e.bp91 || e.z91) ? day : (rec && rec.day) || '', errs: got.errs };
}
export async function runFuel(env, fetchImpl = fetch, now = Date.now(), force = false) {
  const kv = env && env.EVENTS_KV; if (!kv) return null;
  const st = nzStamp(now), day = st.slice(0, 10), hr = +st.slice(11, 13);
  let rec = null; try { rec = JSON.parse(await kv.get(KEY) || 'null'); } catch (e) { }
  if (!force && (hr < FROM_HOUR || (rec && rec.day === day) || (rec && now - (rec.tryAt || 0) < RETRY_MS))) return rec;
  const got = await fetchFuel(fetchImpl);
  const next = got.bp || got.z ? addDay(rec, day, got, now) : { ...(rec || { days: [] }), tryAt: now, ok: false, errs: got.errs };
  await kv.put(KEY, JSON.stringify(next));
  return next;
}
export async function fuelRoute(env, fetchImpl = fetch, now = Date.now()) {
  const kv = env && env.EVENTS_KV; let rec = null;
  try { rec = JSON.parse(await kv.get(KEY) || 'null'); } catch (e) { }
  if (!rec || !rec.days || rec.days.length < 25) rec = await runFuel(env, fetchImpl, now, !rec || now - (rec.tryAt || 0) > 6 * 3600e3);
  const days = mergeSeedDays(rec && rec.days);
  return { days, day: (rec && rec.day) || (days[days.length - 1] && days[days.length - 1].d) || '', ok: true, at: (rec && rec.at) || now, sources: { bp: BP_PDF, z: Z_PAGE } };
}
