/* 2.26.0: /traffic. Live NZTA (Waka Kotahi) highway events from the public TREIS feature layer (closures, crashes,
   roadworks, hazards), within ~25 km of Whangārei. Each event is tagged when it's within 1.5 km of Shane's commute
   (Onerahi → Riverside Dr → Te Matau ā Pohe → Port Rd). Cache API for 10 minutes; no KV writes.
   Only what NZTA publishes is returned; an empty list stays empty. */
import { cacheGet, cachePut } from './kvguard.js';
const LAYER = 'https://services.arcgis.com/XTtANUDT8Va4DLwI/arcgis/rest/services/NZTA_Highway_Information_TREIS_Feature_Layer_View/FeatureServer/';
const C_LAT = -35.7251, C_LON = 174.3237, KM = 25;
export const COMMUTE = [[-35.748, 174.362], [-35.7440, 174.3560], [-35.7350, 174.3450], [-35.7300, 174.3380], [-35.7262, 174.3310], [-35.7300, 174.3270], [-35.7375, 174.3255]];
const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(x))); };
function pts(g) { const o = []; if (g && typeof g.x === 'number') o.push([g.y, g.x]); (g && g.paths || []).forEach(p => (p || []).forEach(xy => xy && xy.length >= 2 && o.push([xy[1], xy[0]]))); return o; }
function q(layer) {
  const la = KM / 111, lo = KM / (111 * Math.cos(C_LAT * Math.PI / 180));
  const p = new URLSearchParams({ f: 'json', where: '1=1', geometry: [C_LON - lo, C_LAT - la, C_LON + lo, C_LAT + la].join(','), geometryType: 'esriGeometryEnvelope', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: 'eventId,eventType,eventDescription,eventComments,locationArea,startDate,endDate,status,expectedResolution,impact,planned', returnGeometry: 'true', outSR: '4326' });
  return LAYER + layer + '/query?' + p;
}
export function parseTraffic(features, now = Date.now()) {
  const out = [], seen = new Set();
  for (const f of features || []) {
    const a = f && f.attributes; if (!a) continue;
    const st = String(a.status || ''); if (st && !/^(active|scheduled)$/i.test(st)) continue;
    if (a.endDate && +a.endDate < now) continue;
    const P = pts(f.geometry); if (!P.length) continue;
    const dist = Math.min(...P.map(([la, lo]) => km(la, lo, C_LAT, C_LON))); if (dist > KM) continue;
    const near = Math.min(...P.flatMap(([la, lo]) => COMMUTE.map(([c, d]) => km(la, lo, c, d))));
    const id = String(a.eventId || ''); if (!id || seen.has(id)) continue; seen.add(id);
    const type = String(a.eventType || '').trim(), desc = String(a.eventDescription || '').replace(/\s+/g, ' ').trim();
    const closed = /clos/i.test(type + ' ' + desc + ' ' + (a.impact || ''));
    out.push({ id, type, desc: desc.slice(0, 160), where: String(a.locationArea || '').replace(/\s+/g, ' ').trim().slice(0, 120), comments: String(a.eventComments || '').replace(/\s+/g, ' ').trim().slice(0, 200), impact: String(a.impact || '').slice(0, 60), start: a.startDate || null, end: a.endDate || null, until: String(a.expectedResolution || '').slice(0, 60), active: /^active$/i.test(st), closed, commute: near <= 1.5, km: Math.round(dist * 10) / 10, lat: Math.round(P[0][0] * 1e5) / 1e5, lon: Math.round(P[0][1] * 1e5) / 1e5 });
  }
  return out.sort((x, y) => (y.commute - x.commute) || (y.closed - x.closed) || (y.active - x.active) || x.km - y.km).slice(0, 25);
}
export async function getTraffic(fetchImpl = fetch) {
  const hit = await cacheGet('nzta-traffic'); if (hit && Array.isArray(hit.items)) return hit;
  const get = async l => { const r = await fetchImpl(q(l), { headers: { 'User-Agent': 'DueDatesCalendarRelay/1.0' } }); if (!r.ok) throw new Error('upstream'); const j = await r.json(); if (j && j.error) throw new Error('upstream'); return j.features || []; };
  const res = await Promise.allSettled([get(0), get(1)]);
  if (res.every(r => r.status === 'rejected')) throw new Error('traffic_unavailable');
  const items = parseTraffic(res.flatMap(r => r.status === 'fulfilled' ? r.value : []));
  const out = { at: Date.now(), source: 'NZ Transport Agency Waka Kotahi (TREIS highway information)', items };
  await cachePut('nzta-traffic', out, 600);
  return out;
}
