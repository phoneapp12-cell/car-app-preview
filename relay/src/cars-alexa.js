/* E1 (not shipped): "Share car dates with Alexa". My App (when the switch is on) PUTs a small plain car summary here,
   keyed by a hash of its own long random key; the Alexa skill GETs it with that key alone (no browser Origin).
   Only dates, plate, model, colour, km and WOF-recheck progress are kept. No money, no notes. */
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const IDS = ['sarah', 'shane', 'cass'];
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const day = v => ISO.test(String(v || '')) ? String(v) : null;
const km = v => { const n = Math.round(Number(String(v == null ? '' : v).replace(/[^\d.]/g, ''))); return n > 0 && n < 2e6 ? n : null; };
const cnt = v => { const n = Math.floor(Number(v)); return n >= 0 && n <= 50 ? n : 0; };
export function normCarsKey(raw) { const s = String(raw || ''); return /^[A-Za-z0-9_-]{40,128}$/.test(s) ? s : ''; }
async function kvKey(k) {
  const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('cars-alexa-v1:' + k));
  let hex = ''; for (const b of new Uint8Array(dig)) hex += b.toString(16).padStart(2, '0');
  return 'cars-alexa-v1:' + hex;
}
export function cleanCars(list) {
  const out = [];
  (Array.isArray(list) ? list : []).slice(0, 6).forEach(c => {
    if (!c || !IDS.includes(c.id) || out.some(o => o.id === c.id)) return;
    const o = { id: c.id, nickname: str(c.nickname, 40), plate: str(c.plate, 10).toUpperCase(), model: str(c.model, 60), colour: str(c.colour, 30),
      regoExpiry: day(c.regoExpiry), wofExpiry: day(c.wofExpiry),
      lastService: c.lastService ? { date: day(c.lastService.date), odometerKm: km(c.lastService.odometerKm) } : null,
      nextService: c.nextService ? { date: day(c.nextService.date), odometerKm: km(c.nextService.odometerKm) } : null,
      odometerKm: km(c.odometerKm) };
    if (o.lastService && !o.lastService.date && !o.lastService.odometerKm) o.lastService = null;
    if (o.nextService && !o.nextService.date && !o.nextService.odometerKm) o.nextService = null;
    const w = c.wofInProgress; if (w && (day(w.recheck) || cnt(w.fixesTotal))) { const t = cnt(w.fixesTotal); o.wofInProgress = { recheck: day(w.recheck), fixesDone: Math.min(cnt(w.fixesDone), t), fixesTotal: t }; }
    out.push(o);
  });
  return out;
}
// PUT: { key, cars } from My App (caller checks Origin). DELETE: { key } when the switch is turned off. GET: key only.
export async function carsAlexaRoute(method, key, body, env, now = Date.now()) {
  const k = normCarsKey(key); if (!k) return [403, { error: 'bad_key' }];
  const kv = env && env.EVENTS_KV; if (!kv) return [503, { error: 'not_configured' }];
  const kk = await kvKey(k);
  if (method === 'GET') { const raw = await kv.get(kk); if (!raw) return [404, { error: 'not_shared' }]; try { return [200, JSON.parse(raw)]; } catch (e) { return [404, { error: 'not_shared' }]; } }
  if (method === 'DELETE') { await kv.delete(kk); return [200, { ok: true }]; }
  if (method === 'PUT' || method === 'POST') {
    const cars = cleanCars(body && body.cars); if (!cars.length) return [400, { error: 'no_cars' }];
    const v = { v: 1, updatedAt: new Date(Math.min(Number(body.updatedAt) || now, now)).toISOString(), tz: 'Pacific/Auckland', cars };
    const prev = await kv.get(kk); let same = false; try { same = prev && JSON.stringify(JSON.parse(prev).cars) === JSON.stringify(cars); } catch (e) { }
    if (!same) await kv.put(kk, JSON.stringify(v)); // unchanged dates cost no KV write
    return [200, { ok: true, cars: cars.length, changed: !same }];
  }
  return [405, { error: 'method_not_allowed' }];
}
