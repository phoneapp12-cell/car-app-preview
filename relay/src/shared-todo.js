/* Shared to-do list between Sarah's To-do app and My App (2.22.94).
   One small list in the existing EVENTS_KV binding, under a hash of the shared key (the key itself is not stored).
   Each item merges on its own `updated` time (newest wins), so a tick on one phone and a new item on the other
   never overwrite each other. Deletes are kept as short tombstones so they don't come back. No AI, nothing logged. */
export const SHARED_MAX_ITEMS = 500;
const TOMBSTONE_MS = 60 * 24 * 3600 * 1000;
const PRI = ['high', 'normal', 'low'];

export function normSharedKey(raw) {
  const s = String(raw || '');
  return /^[A-Za-z0-9_-]{32,128}$/.test(s) ? s : '';
}
async function kvKey(k) {
  const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('shared-todo-v1:' + k));
  let hex = ''; for (const b of new Uint8Array(dig)) hex += b.toString(16).padStart(2, '0');
  return 'shared-todo-v1:' + hex;
}
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const num = v => { const n = Number(v); return v !== null && v !== '' && Number.isFinite(n) && n >= 0 && n < 100000 ? Math.round(n * 100) / 100 : null; };
// 1.4.0 / 2.23.17: Sarah's appointment details (doctor, dentist, other) when she shares one with Shane.
const APPT_TYPES = ['doctor', 'dentist', 'other'];
export function cleanAppt(a) {
  if (!a || typeof a !== 'object') return null;
  return { type: APPT_TYPES.includes(a.type) ? a.type : 'other', time: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(a.time || '')) ? a.time : '', place: str(a.place, 160).trim() };
}
// 1.3.0 / 2.23.13: the brand Sarah picked for a shopping item (from New World's own product search, or typed).
export function cleanBrand(b) {
  if (!b || typeof b !== 'object') return null;
  const o = { brand: str(b.brand, 60).trim(), product: str(b.product, 120).trim(), size: str(b.size, 30).trim(), price: num(b.price), per: b.per === 'kg' ? 'kg' : '',
    promo: num(b.promo), club: !!b.club, gf: !!b.gf, store: str(b.store, 60).trim(), at: /^\d{4}-\d{2}-\d{2}$/.test(String(b.at || '')) ? b.at : '', any: !!b.any, other: !!b.other };
  if (!o.any && !o.brand && !o.product) return null;
  return o;
}
export function cleanItem(x, now = Date.now()) {
  if (!x || typeof x !== 'object') return null;
  const id = String(x.id || '');
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) return null;
  const updated = Math.min(Number(x.updated) || 0, now + 5 * 60000);
  if (!updated) return null;
  if (x.deleted) return { id, deleted: true, updated };
  const title = str(x.title, 120).trim(); if (!title) return null;
  return {
    id, title, list: str(x.list, 24).trim() || 'To-do', due: /^\d{4}-\d{2}-\d{2}$/.test(String(x.due || '')) ? x.due : '',
    notes: str(x.notes, 1000), priority: PRI.includes(x.priority) ? x.priority : 'normal', done: !!x.done,
    doneAt: x.done ? Number(x.doneAt) || updated : 0, created: Number(x.created) || updated, by: x.by === 'shane' ? 'shane' : 'sarah', updated,
    ...(cleanBrand(x.brand) ? { brand: cleanBrand(x.brand) } : {}),
    ...(x.list === 'Appointments' && cleanAppt(x.appt) ? { appt: cleanAppt(x.appt) } : {})
  };
}
export function mergeItems(cur, incoming, now = Date.now()) {
  const map = new Map();
  (Array.isArray(cur) ? cur : []).forEach(x => { const c = cleanItem(x, now); if (c) map.set(c.id, c); });
  let changed = false;
  (Array.isArray(incoming) ? incoming : []).slice(0, SHARED_MAX_ITEMS).forEach(x => {
    const c = cleanItem(x, now); if (!c) return;
    const have = map.get(c.id);
    if (!have || c.updated > have.updated) { map.set(c.id, c); changed = true; }
  });
  let out = [...map.values()].filter(x => !x.deleted || now - x.updated < TOMBSTONE_MS);
  if (out.length > SHARED_MAX_ITEMS) { // drop the oldest finished ones first
    out.sort((a, b) => (a.deleted || a.done ? 0 : 1) - (b.deleted || b.done ? 0 : 1) || a.updated - b.updated);
    out = out.slice(out.length - SHARED_MAX_ITEMS); changed = true;
  }
  return { items: out, changed };
}
// body: { key, items?: [...] }. Returns the whole list (tombstones included, so phones can drop deleted items).
export async function sharedTodoRoute(body, env, now = Date.now()) {
  const k = normSharedKey(body && body.key);
  if (!k) return [403, { error: 'bad_key' }];
  if (!env || !env.EVENTS_KV || typeof env.EVENTS_KV.get !== 'function') return [503, { error: 'shared_unavailable' }];
  const key = await kvKey(k);
  let cur = null;
  try { cur = await env.EVENTS_KV.get(key, { type: 'json' }); } catch (e) { cur = null; }
  const items = cur && Array.isArray(cur.items) ? cur.items : [];
  const inc = body && Array.isArray(body.items) ? body.items : [];
  if (inc.length > SHARED_MAX_ITEMS) return [413, { error: 'too_many' }];
  const m = mergeItems(items, inc, now);
  let rev = cur && Number(cur.rev) || 0;
  if (m.changed) { rev += 1; await env.EVENTS_KV.put(key, JSON.stringify({ rev, updatedAt: new Date(now).toISOString(), items: m.items })); }
  return [200, { ok: true, rev, items: m.items, now }];
}

/* 1.4.0 / 2.23.17: Sarah's car (the Haval H6, PNU312) due dates, published by My App so Sarah's To-do can show them.
   Only that one car's WOF, rego and service dates (and service km / odometer if set). Same shared key; stored under
   its own hashed KV key. A body with `car` replaces it (My App); a body without just reads it (Sarah's app). */
const isoOk = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? v : '';
export function cleanCar(c, now = Date.now()) {
  if (!c || typeof c !== 'object') return null;
  const km = v => { const n = Math.round(Number(String(v || '').replace(/[^\d.]/g, ''))); return n > 0 && n < 2e6 ? n : null; };
  const o = { name: str(c.name, 60).trim(), plate: str(c.plate, 12).trim().toUpperCase(), model: str(c.model, 60).trim(), year: str(c.year, 4).trim(),
    wof: isoOk(c.wof), rego: isoOk(c.rego), svc: isoOk(c.svc), svcKm: km(c.svcKm), odo: km(c.odo), updated: Math.min(Number(c.updated) || now, now + 300000) };
  if (!o.plate) return null;
  return o;
}
async function carKey(k) {
  const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('shared-car-v1:' + k));
  let hex = ''; for (const b of new Uint8Array(dig)) hex += b.toString(16).padStart(2, '0');
  return 'shared-car-v1:' + hex;
}
export async function sharedCarRoute(body, env, now = Date.now()) {
  const k = normSharedKey(body && body.key);
  if (!k) return [403, { error: 'bad_key' }];
  if (!env || !env.EVENTS_KV || typeof env.EVENTS_KV.get !== 'function') return [503, { error: 'shared_unavailable' }];
  const key = await carKey(k);
  let cur = null;
  try { cur = await env.EVENTS_KV.get(key, { type: 'json' }); } catch (e) { cur = null; }
  if (body && body.car) {
    const c = cleanCar(body.car, now);
    if (!c) return [400, { error: 'bad_car' }];
    const same = cur && JSON.stringify({ ...cur, updated: 0 }) === JSON.stringify({ ...c, updated: 0 });
    if (!same) { await env.EVENTS_KV.put(key, JSON.stringify(c)); cur = c; }
  }
  return [200, { ok: true, car: cur || null, now }];
}
