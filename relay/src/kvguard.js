/* 2.25.6: KV write guard. The free plan allows 1000 put()s a day. A put whose value is the same as what's
   already stored (and has no TTL option) is skipped. Short-lived caches use the Cache API (cacheGet/cachePut),
   which costs no KV writes. */
export function guardKV(env) {
  const kv = env && env.EVENTS_KV;
  if (!kv || kv.__guard) return env;
  const w = {
    __guard: true,
    get: (...a) => kv.get(...a),
    getWithMetadata: (...a) => kv.getWithMetadata(...a),
    list: (...a) => kv.list(...a),
    delete: (...a) => kv.delete(...a),
    async put(key, value, opts) {
      if (opts == null && typeof value === 'string') {
        try { const cur = await kv.get(key); if (cur === value) return; } catch (e) { }
      }
      return kv.put(key, value, opts);
    }
  };
  return { ...env, EVENTS_KV: w };
}
const CU = n => 'https://kv-cache.relay.internal/' + encodeURIComponent(n);
const mem = new Map();
export async function cacheGet(name) {
  const m = mem.get(name); if (m && m.exp > Date.now()) return m.v;
  try { if (typeof caches !== 'undefined' && caches.default) { const r = await caches.default.match(CU(name)); if (r) { const v = await r.json(); mem.set(name, { v, exp: Date.now() + 30000 }); return v; } } } catch (e) { }
  return null;
}
export async function cachePut(name, v, ttlSec) {
  mem.set(name, { v, exp: Date.now() + ttlSec * 1000 });
  try { if (typeof caches !== 'undefined' && caches.default) await caches.default.put(CU(name), new Response(JSON.stringify(v), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=' + ttlSec } })); } catch (e) { }
}
export async function cacheDel(name) { mem.delete(name); try { if (typeof caches !== 'undefined' && caches.default) await caches.default.delete(CU(name)); } catch (e) { } }
