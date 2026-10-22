/* 2.27.48: per-device keys for the shared list (Sarah's To-do <-> My App). No working key lives in either app's code.
   - Each phone holds its own random key (st_...), stored only on that phone. The relay keeps only SHA-256 hashes.
   - My App gets Shane's key with its device key (/pair/shane). Sarah's phone pairs once with a one-time code or link
     that Shane shows in My App (/pair/code, valid 24 hours, single use, 10 wrong tries and it's dead).
   - The old shared key (now only the internal list id, the SHARED_NS secret) is accepted from apps until Sarah and
     Shane have both paired, or LEGACY_CUTOFF, whichever comes first.
   - Any accepted key is swapped for the internal list id before the route runs, so all existing data stays put. */
import { sha, eq, b64url } from './akahu.js';
import { appOk } from './health.js';
import { cacheGet, cachePut } from './kvguard.js';
export const LEGACY_CUTOFF = Date.parse('2026-11-05T23:59:59+13:00');
const K = 'shared-auth-v1', CODE_MS = 24 * 3600e3, ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const SHARED_RE = /^\/(shared-todo|shared-photo|shared-car|shared-push\/.+|sunshine\/.+|brands|prices)$/;

async function load(env, fresh) {
  if (!fresh) { const c = await cacheGet('shared-auth'); if (c) return c; }
  let d = null; try { d = JSON.parse((await env.EVENTS_KV.get(K)) || 'null'); } catch (e) { }
  d = d && typeof d === 'object' ? d : {}; d.devs = Array.isArray(d.devs) ? d.devs : []; d.pair = d.pair || null;
  await cachePut('shared-auth', d, 60); return d;
}
async function save(env, d) { await env.EVENTS_KV.put(K, JSON.stringify(d)); await cachePut('shared-auth', d, 60); }
export const legacyOpen = (d, now = Date.now()) => now < LEGACY_CUTOFF && !(d.devs.some(x => x.who === 'sarah') && d.devs.some(x => x.who === 'shane'));
const newKey = () => 'st_' + b64url(crypto.getRandomValues(new Uint8Array(32)));
const newCode = () => { const r = crypto.getRandomValues(new Uint8Array(10)); let s = ''; for (const b of r) s += ALPHA[b % 32]; return s; };
const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// -> { ok, who, legacy } ; ok=false when the key is unknown or the old key has been retired
export async function sharedAuth(env, key, now = Date.now()) {
  if (!env.SHARED_NS || typeof key !== 'string' || !key || key.length > 200) return { ok: false };
  const h = await sha(key), d = await load(env);
  for (const x of d.devs) if (eq(h, x.h)) return { ok: true, who: x.who };
  if (eq(h, await sha(env.SHARED_NS))) return legacyOpen(d, now) ? { ok: true, who: '', legacy: true } : { ok: false, retired: true };
  return { ok: false };
}

// returns [status, body]
export async function pairRoute(path, request, env, okOrigin, now = Date.now()) {
  if (request.method !== 'POST') return [405, { error: 'post_only' }];
  if (!okOrigin) return [403, { error: 'forbidden_origin' }];
  if (!env.SHARED_NS) return [503, { error: 'not_configured' }];
  let b = {}; try { const raw = await request.text(); if (raw.length > 2000) return [413, { error: 'too_large' }]; b = raw ? JSON.parse(raw) : {}; } catch (e) { return [400, { error: 'bad_request' }]; }
  if (path === '/pair/redeem') { // Sarah's phone, with the code or link Shane gave her
    const code = normCode(b.code); const d = await load(env, true); const p = d.pair;
    if (!p || p.exp < now) return [410, { error: 'expired' }];
    if (code.length !== 10 || !eq(await sha(code), p.h)) { p.bad = (p.bad || 0) + 1; if (p.bad >= 10) d.pair = null; await save(env, d); return [403, { error: 'bad_code' }]; }
    const key = newKey(); d.devs = d.devs.filter(x => x.who !== 'sarah').concat(d.devs.filter(x => x.who === 'sarah').slice(-2)).concat([{ id: b64url(crypto.getRandomValues(new Uint8Array(6))), who: 'sarah', h: await sha(key), at: now }]); d.pair = null;
    await save(env, d); return [200, { key }];
  }
  if (!(await appOk(env, request))) return [401, { error: 'no_key' }]; // everything else is My App only
  const d = await load(env, true);
  if (path === '/pair/shane') { // this My App phone's own key
    const key = newKey(); d.devs = d.devs.filter(x => x.who === 'shane').slice(-3).concat(d.devs.filter(x => x.who !== 'shane'));
    d.devs.push({ id: b64url(crypto.getRandomValues(new Uint8Array(6))), who: 'shane', h: await sha(key), at: now }); await save(env, d); return [200, { key }];
  }
  if (path === '/pair/code') { const code = newCode(); d.pair = { h: await sha(code), exp: now + CODE_MS, bad: 0 }; await save(env, d); return [200, { code: code.slice(0, 5) + '-' + code.slice(5), exp: d.pair.exp }]; }
  if (path === '/pair/cancel') { d.pair = null; await save(env, d); return [200, { ok: true }]; }
  if (path === '/pair/unlink') { d.devs = d.devs.filter(x => x.who !== 'sarah'); await save(env, d); return [200, { ok: true }]; }
  if (path === '/pair/status') {
    const s = d.devs.filter(x => x.who === 'sarah').pop();
    return [200, { sarahAt: s ? s.at : 0, shane: d.devs.filter(x => x.who === 'shane').length, pending: d.pair && d.pair.exp > now ? d.pair.exp : 0, legacyOpen: legacyOpen(d, now), cutoff: LEGACY_CUTOFF }];
  }
  return [404, { error: 'not_found_route' }];
}
