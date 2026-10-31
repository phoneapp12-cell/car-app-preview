/* 2.29.2: Unpaid NZ toll trips for Shane's three cars (Shane asked 31 Oct 2026, free, no Grok Bot).
 * Reads NZTA's public "Buy or pay a toll" lookup (tollingonline.nzta.govt.nz, the same request the page makes)
 * for these three plates only, about every 3 hours. A trip shows there until it's paid or a toll payment notice
 * is posted (after 5 working days), so a paid trip simply drops off. Nothing is paid or changed. Stored in KV:
 * the current unpaid trips only. */
import { cacheGet, cachePut } from './kvguard.js';
const BASE = 'https://tollingonline.nzta.govt.nz/';
export const TOLL_PLATES = { MUL27: "Shane's car", PNU312: "Sarah's car", KBZ234: "Cass's car" };
const KEY = 'tolls-v1', GAP = 3 * 3600;
export const TOLL_PAY_URL = 'https://tollingonline.nzta.govt.nz/#/welcome';

async function session(fetchImpl) {
  const r = await fetchImpl(BASE, { headers: { 'User-Agent': 'Mozilla/5.0 (DueDates toll check)', Accept: 'text/html' } });
  if (!r.ok) throw new Error('toll_page');
  const html = await r.text();
  const m = html.match(/request-verification-token="([^"]+)"/); if (!m) throw new Error('toll_token');
  const raw = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : String(r.headers.get('set-cookie') || '').split(/,(?=\s*[^;,=\s]+=)/);
  const cookie = raw.map(c => String(c).split(';')[0].trim()).filter(Boolean).join('; ');
  return { token: m[1].replace(/&amp;/g, '&'), cookie };
}
export function slimTrip(d, plate) {
  const a = (d && d.AdditionalProductDetails) || {};
  const id = String(a.PastTripId || d.LineOfBusinessIdentifier || '').replace(/\D/g, '').slice(0, 20);
  const at = String(a.TravelDateTime || ''); const cost = Number(d.CostPerItem);
  if (!id || !Date.parse(at) || !(cost >= 0 && cost < 100)) return null;
  return { id, plate, car: TOLL_PLATES[plate], road: String(a.TollRoad || 'Toll road').slice(0, 60), at, cost };
}
export async function fetchTolls(fetchImpl = fetch) {
  const s = await session(fetchImpl), trips = [];
  for (const plate of Object.keys(TOLL_PLATES)) {
    const r = await fetchImpl(BASE + 'api/PastTrip/?vehicleRegistration=' + plate, { headers: { 'User-Agent': 'Mozilla/5.0 (DueDates toll check)', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', RequestVerificationToken: s.token, Cookie: s.cookie } });
    if (!r.ok) throw new Error('toll_lookup');
    const j = await r.json(); if (!j || j.Status !== true) throw new Error('toll_lookup');
    (Array.isArray(j.Data) ? j.Data : []).forEach(d => { const t = slimTrip(d, plate); if (t) trips.push(t); });
  }
  return trips.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
export async function runTolls(env, fetchImpl = fetch, now = Date.now(), force = false) {
  const kv = env && env.EVENTS_KV; if (!kv) return null;
  if (!force && await cacheGet('tolls-at')) return null; await cachePut('tolls-at', { at: now }, GAP);
  let trips; try { trips = await fetchTolls(fetchImpl); } catch (e) { return null; }
  const rec = { checked: new Date(now).toISOString(), trips, payUrl: TOLL_PAY_URL, source: 'NZ Transport Agency Waka Kotahi (Buy or pay a toll)' };
  await kv.put(KEY, JSON.stringify(rec));
  return rec;
}
export async function getTolls(env) { try { return JSON.parse(await env.EVENTS_KV.get(KEY) || 'null'); } catch (e) { return null; } }
const nzParts = ms => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
// One push per new unpaid trip. Overnight finds wait until 7 am.
export function tollReminders(rec, now) {
  if (!rec || !Array.isArray(rec.trips)) return [];
  const p = nzParts(now), h = +p.hour; let due = now; if (h >= 22 || h < 7) { const d = new Date(now + (h >= 22 ? 86400e3 : 0)); const q = nzParts(d.getTime()); return rec.trips.map(t => mk(t, `${q.year}-${q.month}-${q.day}`, '07:00')); }
  return rec.trips.map(t => mk(t, `${p.year}-${p.month}-${p.day}`, `${p.hour}:${p.minute}`));
  function mk(t, date, time) { const w = nzParts(Date.parse(t.at)); const hh = +w.hour; return { id: 'toll-' + t.id, title: `🚗 Toll to pay: ${t.car} $${t.cost.toFixed(2)}`, body: `${t.road}, ${w.day}/${w.month} ${hh % 12 || 12}:${w.minute}${hh < 12 ? 'am' : 'pm'}. Pay on the NZTA site within 5 working days to avoid a notice fee.`, date, time, repeat: 'none' }; }
}
