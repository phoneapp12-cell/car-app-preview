/* 2.27.40: Northpower power outages (Whangārei and Kaipara lines company) for My App's bell page.
 * Source: Northpower's public Outages Centre page (outages.northpower.nz). Its robots.txt allows all, and its terms allow
 * viewing and reproducing content for informational, non-commercial use with acknowledgement; the app credits Northpower.
 * Read about every 20 minutes on the 10-minute cron; the outage list embedded in the page is slimmed (no map shapes)
 * and kept in KV. GET /outages returns it. Onerahi outages also become pushes through the phone's reminder list:
 * unplanned ones straight away, planned ones at 6pm the day before and 7am on the day. */
import { cacheGet, cachePut } from './kvguard.js';
export const OUT_KEY = 'outages-v1';
const PAGE = 'https://outages.northpower.nz/';
const GAP = 19 * 60;
const unesc = s => s.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// Livewire wraps values as [value, {s: ...}]; unwrap them.
export function unwrap(v) {
  if (Array.isArray(v)) { if (v.length === 2 && v[1] && typeof v[1] === 'object' && !Array.isArray(v[1]) && 's' in v[1] && Object.keys(v[1]).length <= 3) return unwrap(v[0]); return v.map(unwrap); }
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) if (k !== 'geometry') o[k] = unwrap(v[k]); return o; }
  return v;
}
const iso = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? v : null);
const list = (L, k) => (Array.isArray(L) ? L : []).map(x => x && x[k]).filter(Boolean);
function slim(o, kind) {
  const loc = (o && o.location) || {};
  return { id: String(o.caseNumber || o.id || o.incidentNumber || o.title || '').slice(0, 40), kind, area: String(o.title || o.localityDescription || '').slice(0, 80),
    where: String(o.localityDescription || '').slice(0, 160), cause: String(o.shutdownReason || o.cause || o.faultCause || o.reason || '').slice(0, 80),
    start: iso(o.outageStartDate) || iso(o.startDate) || iso(o.createdDate), end: iso(o.outageEndDate) || iso(o.estimatedRestorationDate) || iso(o.estimatedRestoreTime) || iso(o.etr) || null,
    status: String(o.publicStatus || o.status || '').slice(0, 40), msg: o.statusMessage ? String(o.statusMessage).slice(0, 160) : '', customers: +o.customerCount || null,
    suburbs: list(loc.icpsBySuburb, 'suburb').slice(0, 12), roads: list(loc.icpsByRoad, 'road').slice(0, 30), zone: list(loc.icpsByZoneSub, 'zoneSub').slice(0, 4) };
}
// Pure: page HTML in, { planned, unplanned, updated } out (null if the list isn't there).
export function parsePage(html) {
  let i = 0;
  while ((i = html.indexOf('wire:snapshot="', i)) >= 0) {
    const s = i + 15, e = html.indexOf('"', s); if (e < 0) break; i = e;
    const raw = html.slice(s, e); if (raw.indexOf('unplannedElectricityOutages&quot;') < 0 || raw.indexOf('plannedElectricityOutages&quot;:') < 0) continue;
    let d; try { d = unwrap(JSON.parse(unesc(raw)).data); } catch (er) { continue; }
    const P = d.plannedElectricityOutages, U = d.unplannedElectricityOutages, F = d.unplannedFibreOutages;
    const planned = [], seen = new Set();
    const flat = v => Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v).flat() : []);
    for (const o of flat(P)) { if (!o || typeof o !== 'object') continue; const x = slim(o, 'planned'); const k = x.id + x.start; if (!seen.has(k)) { seen.add(k); planned.push(x); } }
    const unplanned = flat(U).filter(o => o && typeof o === 'object').map(o => slim(o, 'unplanned'));
    const meta = d.plannedElectricityOutageMeta || {};
    const os = (d.outageState && (Array.isArray(d.outageState) ? d.outageState[0] : d.outageState)) || {}, om = os.plannedElectricityOutagesMeta || {};
    const fibre = flat(F).filter(o => o && typeof o === 'object').map(o => slim(o, 'unplanned'));
    return { planned, unplanned, fibre, updated: iso(meta.lastUpdated) || iso(om.lastUpdated) || null };
  }
  return null;
}
export async function runOutages(env, fetchImpl = fetch, now = Date.now(), force = false) {
  const kv = env && env.EVENTS_KV; if (!kv) return null;
  if (!force && await cacheGet('outages-at')) return null; await cachePut('outages-at', { at: now }, GAP);
  const c = new AbortController(), t = setTimeout(() => c.abort(), 20000);
  let html; try { const r = await fetchImpl(PAGE, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; due-dates-relay; personal outage alerts)' }, signal: c.signal }); if (!r.ok) throw new Error('http ' + r.status); html = await r.text(); } finally { clearTimeout(t); }
  const got = parsePage(html); if (!got) throw new Error('no outage list');
  let prev = null; try { prev = JSON.parse(await kv.get(OUT_KEY) || 'null'); } catch (e) { }
  // Unplanned outages that have gone from the list are kept a few hours as restored.
  const restored = ((prev && prev.unplanned) || []).filter(o => o.status !== 'Restored' && !got.unplanned.some(u => u.id === o.id)).map(o => ({ ...o, status: 'Restored', restoredAt: new Date(now).toISOString() }));
  const keepR = ((prev && prev.restored) || []).concat(restored).filter(o => now - Date.parse(o.restoredAt || 0) < 6 * 3600e3).slice(-20);
  // 2.27.41: internet and mobile. Northpower Fibre's unplanned outages come in the same page; 2degrees' public outage list is separate.
  let d2 = null; try { d2 = await fetch2d(fetchImpl); } catch (e) { d2 = null; }
  const net = netMerge(got.fibre || [], d2 === null ? ((prev && prev.net) || []).filter(o => o.prov === '2degrees') : d2, (prev && prev.net) || [], now);
  const rec = { planned: got.planned, unplanned: got.unplanned, restored: keepR, net, netOk: { npf: true, d2: d2 !== null }, updated: got.updated, source: 'Northpower Outages Centre' };
  await kv.put(OUT_KEY, JSON.stringify(rec));
  return rec;
}
export async function getOutages(env) { try { return JSON.parse(await env.EVENTS_KV.get(OUT_KEY) || 'null'); } catch (e) { return null; } }
// Onerahi test: his suburb or street. (Tamaterau shares the Onerahi zone substation but isn't his street.)
export const isOnerahi = o => (o.suburbs || []).some(s => /onerahi/i.test(s)) || (o.roads || []).some(r => /sherwood road/i.test(r)) || /onerahi/i.test(o.area || '');
const nzParts = ms => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
const clock = ms => new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
const day = (ms, n = 0) => { const p = nzParts(ms + n * 86400e3); return `${p.year}-${p.month}-${p.day}`; };
// Pure: outage record + phone's setting in, one-off reminders out (ids 'out-...').
export function outageReminders(rec, pref, now) {
  if (!rec || pref === 'off') return [];
  const out = [], cid = s => String(s).replace(/[^a-z0-9]/gi, '').slice(0, 30);
  for (const o of rec.unplanned || []) if (isOnerahi(o)) { const p = nzParts(now);
    out.push({ id: 'out-u-' + cid(o.id), title: ('⚡ Power outage in ' + (o.area || 'Onerahi') + (o.end ? ', back about ' + clock(Date.parse(o.end)) : '')).slice(0, 80), date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, repeat: 'none' }); }
  for (const o of rec.planned || []) { if (!isOnerahi(o) || !o.start) continue; const s = Date.parse(o.start); if (s < now) continue; const d = day(s), t = clock(s) + (o.end ? '–' + clock(Date.parse(o.end)) : '');
    out.push({ id: 'out-b-' + cid(o.id + d), title: ('🔌 Planned power cut tomorrow in ' + o.area + ', ' + t).slice(0, 80), date: day(s, -1), time: '18:00', repeat: 'none' });
    out.push({ id: 'out-m-' + cid(o.id + d), title: ('🔌 Planned power cut today in ' + o.area + ', ' + t).slice(0, 80), date: d, time: '07:00', repeat: 'none' }); }
  return out.slice(0, 12);
}

// ---- 2.27.41: internet and mobile outages ----
/* Northpower Fibre (Whangārei's fibre network) unplanned outages, from the same Northpower page, and 2degrees' published
   outage list (api.2degrees.nz/outages/publishedOutages, the list their public Network status page shows; their site terms
   allow use for your own non-commercial purposes). Only Northland items are kept. One NZ (terms bar copying content
   without consent), Spark (captcha) and Chorus (outage API needs a login key) aren't used. */
const D2_URL = 'https://api.2degrees.nz/outages/publishedOutages';
const WHG = { lat: -35.7251, lng: 174.3237 };
const NORTH_RE = /\b(whang[aā]rei|onerahi|northland|tamaterau|parua bay|ngunguru|tutukaka|hikurangi|ruakaka|one tree point|maungatapere)\b/i; // place names that are only in Northland; others go by map point
const kmFrom = (a, b) => { const r = x => x * Math.PI / 180, dl = r(b.lat - a.lat), dg = r(b.lng - a.lng), h = Math.sin(dl / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dg / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
// NZ local time with no zone ("2026-10-22T22:00:00") to an ISO time with the right NZ offset.
export function nzLocalIso(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return null; if (/(Z|[+-]\d{2}:?\d{2})$/.test(v)) return v;
  const base = Date.parse(v.slice(0, 19) + 'Z'); let ms = base - 13 * 3600e3;
  for (let i = 0; i < 2; i++) { const p = nzParts(ms), loc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute); ms = ms + (base - loc); }
  const off = Math.round((base - ms) / 60e3), sg = off >= 0 ? '+' : '-', a = Math.abs(off);
  return v.slice(0, 19) + sg + String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0');
}
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const D2_STATUS = { implement: 'In progress', review: 'In progress', closed: 'Resolved', resolved: 'Resolved', 'in progress': 'Under repair', 'on hold': 'Under repair', 'under observation': 'Monitoring', scheduled: 'Scheduled' };
// Pure: 2degrees list in, Northland items out.
export function parse2d(list) {
  return (Array.isArray(list) ? list : []).filter(o => o && typeof o === 'object').filter(o => { const g = o.geoLocation || {}; return NORTH_RE.test(String(o.location || '')) || (Number.isFinite(g.latitude) && kmFrom(WHG, { lat: g.latitude, lng: g.longitude }) <= 30); })
    .map(o => { const cats = (o.categories || []).map(c => String(c).toLowerCase()), mob = cats.some(c => c.includes('mobile')), bb = cats.some(c => c.includes('broadband'));
      const st = D2_STATUS[String(o.status || '').toLowerCase()] || String(o.status || '').slice(0, 30), loc = String(o.location || '').slice(0, 200);
      return { id: 'd2' + hash([o.type, o.startTime, loc].join('|')), prov: '2degrees', type: mob && bb ? 'Internet & mobile' : mob ? 'Mobile' : 'Internet', kind: /unplanned/i.test(o.type) ? 'unplanned' : 'planned',
        area: loc, status: st, start: nzLocalIso(o.startTime), end: nzLocalIso(o.endTime), desc: String(o.description || '').slice(0, 200), done: st === 'Resolved' }; });
}
async function fetch2d(fetchImpl) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), 15000);
  try { const r = await fetchImpl(D2_URL, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; due-dates-relay; personal outage alerts)' }, signal: c.signal }); if (!r.ok) throw new Error('http ' + r.status); return parse2d(await r.json()); } finally { clearTimeout(t); }
}
// Pure: fibre (slimmed Northpower items) + 2degrees -> one list; fibre outages that vanish are kept 6 hours as restored.
export function netMerge(fibre, d2, prevNet, now) {
  const f = fibre.map(o => ({ id: 'npf' + String(o.id).replace(/[^a-z0-9]/gi, '').slice(0, 30), prov: 'Northpower Fibre', type: 'Internet', kind: 'unplanned', area: o.area || o.where, status: o.status || 'Current', start: o.start, end: o.end, desc: o.cause || o.msg || '', onerahi: isOnerahi(o), done: false }));
  const gone = (prevNet || []).filter(o => o.prov === 'Northpower Fibre' && !o.done && !f.some(x => x.id === o.id)).map(o => ({ ...o, status: 'Restored', done: true, restoredAt: new Date(now).toISOString() }));
  const keep = (prevNet || []).filter(o => o.prov === 'Northpower Fibre' && o.done && now - Date.parse(o.restoredAt || 0) < 6 * 3600e3 && !f.some(x => x.id === o.id));
  const d = (d2 || []).map(o => ({ ...o, onerahi: /onerahi/i.test(o.area || '') }));
  return f.concat(gone, keep, d).slice(0, 40);
}
// Current = unplanned and not resolved (or a planned one under way). Whangārei generally = all kept items (Northland only).
export const netCurrent = (o, now) => !o.done && (o.kind === 'unplanned' || (o.start && Date.parse(o.start) <= now && (!o.end || Date.parse(o.end) > now)));
export function netReminders(rec, now) {
  const out = [], cid = v => String(v).replace(/[^a-z0-9]/gi, '').slice(0, 30), where = o => String(o.area || 'Whangārei').split(',').slice(0, 2).join(',');
  for (const o of (rec && rec.net) || []) { if (o.done) continue;
    if (o.kind === 'unplanned') { const p = nzParts(now); out.push({ id: 'out-n-' + cid(o.id), title: ('📶 ' + o.prov + ' ' + o.type.toLowerCase() + ' outage: ' + where(o)).slice(0, 80), date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, repeat: 'none' }); continue; }
    // 2.27.42: planned work, like planned power: 6pm the day before and 7am on the day. Work that starts from 6pm gets its
    // 'tonight' push at 6pm that day instead; work starting before 8am gets only the evening-before push.
    if (!o.start) continue; const s = Date.parse(o.start); if (!(s > now)) continue; const p = nzParts(s), d = day(s), hm = p.hour + ':' + p.minute, t = clock(s) + (o.end ? '–' + clock(Date.parse(o.end)) : '');
    const what = o.prov + ' ' + o.type.toLowerCase() + ' work';
    const add = (k, date, time, title) => { const due = Date.parse(nzLocalIso(date + 'T' + time + ':00')); if (due > now - 60e3 && due < s) out.push({ id: 'out-p' + k + '-' + cid(o.id + d), title: title.slice(0, 80), date, time, repeat: 'none' }); };
    if (hm >= '18:00') add('e', d, '18:00', '🛠 Planned tonight: ' + what + ', ' + where(o) + ', ' + t);
    else add('b', day(s, -1), '18:00', '🛠 Planned tomorrow: ' + what + ', ' + where(o) + ', ' + t);
    if (hm >= '08:00') add('m', d, '07:00', '🛠 Planned today: ' + what + ', ' + where(o) + ', ' + t); }
  return out.slice(0, 12);
}
