/* 2.27.46: one-time move of My App's data from the old github.io address to its own address.
   The old copy encrypts everything on the phone with a fresh random key that never leaves the phone except in the
   new address's #fragment (browsers never send that to a server). The relay only holds ciphertext, for 2 hours,
   and deletes it once the new copy has it. Starting a move needs My App's device key. */
import { appOk } from './health.js';
import { b64url } from './akahu.js';
export const OLD_ORIGIN = 'https://phoneapp12-cell.github.io';
export const NEW_ORIGIN = 'https://shane-my-app.pages.dev';
export const K_MOVED = 'moved-v1';
export const MOVE_GRACE_MS = 3 * 86400e3; // github.io keeps working on private routes for 3 days after the move
const TTL = 7200, MAX_CHUNKS = 40, CHUNK_MAX = 6 * 1024 * 1024;
const K = id => 'move-v1:' + id;
const okId = id => /^[A-Za-z0-9_-]{22,64}$/.test(String(id || ''));

export async function movedAt(env) {
  try { const v = await env.EVENTS_KV.get(K_MOVED); const j = v ? JSON.parse(v) : null; return j && j.at ? Number(j.at) : 0; } catch (e) { return 0; }
}
// true when a request from the old address should now be refused on a private route
export async function oldOriginRetired(env, origin, now = Date.now()) {
  if (origin !== OLD_ORIGIN) return false;
  const at = await movedAt(env); return !!at && now - at > MOVE_GRACE_MS;
}

// returns [status, body]
export async function moveRoute(path, request, env, origin, now = Date.now()) {
  if (request.method !== 'POST') return [405, { error: 'post_only' }];
  const kv = env.EVENTS_KV; if (!kv) return [503, { error: 'not_configured' }];
  const q = new URL(request.url).searchParams;
  if (path === '/move/status') return [200, { moved: (await movedAt(env)) || 0 }];
  if (path === '/move/start') { // old address, device key
    if (origin !== OLD_ORIGIN) return [403, { error: 'forbidden_origin' }];
    if (!(await appOk(env, request))) return [401, { error: 'no_key' }];
    let b = {}; try { b = await request.json(); } catch (e) { return [400, { error: 'bad_request' }]; }
    const n = Number(b.chunks); if (!Number.isInteger(n) || n < 1 || n > MAX_CHUNKS) return [400, { error: 'bad_request' }];
    const id = b64url(crypto.getRandomValues(new Uint8Array(18)));
    await kv.put(K(id), JSON.stringify({ n, at: now, got: 0 }), { expirationTtl: TTL });
    return [200, { id }];
  }
  if (path === '/move/put') { // old address, device key; body = one encrypted chunk (text)
    if (origin !== OLD_ORIGIN) return [403, { error: 'forbidden_origin' }];
    if (!(await appOk(env, request))) return [401, { error: 'no_key' }];
    const id = q.get('id'), i = Number(q.get('i')); if (!okId(id)) return [400, { error: 'bad_request' }];
    const meta = JSON.parse((await kv.get(K(id))) || 'null'); if (!meta || !Number.isInteger(i) || i < 0 || i >= meta.n) return [404, { error: 'not_found' }];
    const body = await request.text(); if (!body || body.length > CHUNK_MAX || !/^[A-Za-z0-9_\-.]+$/.test(body)) return [400, { error: 'bad_request' }];
    await kv.put(K(id) + ':' + i, body, { expirationTtl: TTL });
    return [200, { ok: true }];
  }
  if (path === '/move/get') { // new address; the random id is the only way in, and the data is encrypted with a key the relay never sees
    if (origin !== NEW_ORIGIN) return [403, { error: 'forbidden_origin' }];
    const id = q.get('id'); if (!okId(id)) return [400, { error: 'bad_request' }];
    const meta = JSON.parse((await kv.get(K(id))) || 'null'); if (!meta) return [404, { error: 'not_found' }];
    if (q.get('i') === null) return [200, { n: meta.n }];
    const i = Number(q.get('i')); if (!Number.isInteger(i) || i < 0 || i >= meta.n) return [400, { error: 'bad_request' }];
    const c = await kv.get(K(id) + ':' + i); if (!c) return [404, { error: 'not_found' }];
    return [200, { c }];
  }
  if (path === '/move/done') { // new address, now holding the device key: wipe the parcel and start the grace clock
    if (origin !== NEW_ORIGIN) return [403, { error: 'forbidden_origin' }];
    if (!(await appOk(env, request))) return [401, { error: 'no_key' }];
    let b = {}; try { b = await request.json(); } catch (e) { }
    if (okId(b.id)) { const meta = JSON.parse((await kv.get(K(b.id))) || 'null'); if (meta) { for (let i = 0; i < meta.n; i++) await kv.delete(K(b.id) + ':' + i); await kv.delete(K(b.id)); } }
    if (!(await movedAt(env))) await kv.put(K_MOVED, JSON.stringify({ at: now }));
    return [200, { ok: true }];
  }
  return [404, { error: 'not_found_route' }];
}
