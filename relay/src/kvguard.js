/* 2.28.31: KV write guard + Cloudflare Edge Cache API fallback.
   The free plan allows 1000 KV put()s a day. Every put() is stored in memory + caches.default (unlimited free reads/writes)
   and get() checks memory + caches.default first, then KV. If KV hits its daily put quota, put() succeeds via caches.default
   instead of throwing HTTP 1101. */
const CU = n => "https://kv-cache.relay.internal/" + encodeURIComponent(n);
const KVCU = k => "https://kv-store2.relay.internal/" + encodeURIComponent(k); // 2.29.11: new name, so the old 7-day edge copies (stale in some data centres) are never read again
const mem = new Map();
const kvMem = new Map();

const stripVolatile = s => String(s || "")
  .replace(/"(at|got|checked|updatedAt|stepsAt|savedAt)"\s*:\s*("[^"]*"|\d+)/g, "")
  .replace(/\s+/g, "");

async function edgeGet(key) {
  const m = kvMem.get(key);
  if (m && m.exp > Date.now()) return m.raw;
  try {
    if (typeof caches !== "undefined" && caches.default) {
      const r = await caches.default.match(KVCU(key));
      if (r) {
        const raw = await r.text();
        kvMem.set(key, { raw, exp: Date.now() + 60000 });
        return raw;
      }
    }
  } catch (e) {}
  return null;
}

async function edgePut(key, raw, ttlSec = 604800) {
  kvMem.set(key, { raw, exp: Date.now() + 60000 });
  try {
    if (typeof caches !== "undefined" && caches.default) {
      await caches.default.put(KVCU(key), new Response(raw, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "max-age=" + ttlSec }
      }));
    }
  } catch (e) {}
}

export function guardKV(env) {
  const kv = env && env.EVENTS_KV;
  if (!kv || kv.__guard) return env;
  const w = {
    __guard: true,
    async get(key, opts) {
      const wantJson = opts === "json" || (opts && opts.type === "json");
      const cached = await edgeGet(key);
      if (cached !== null) {
        if (wantJson) { try { return JSON.parse(cached); } catch (e) { return null; } }
        return cached;
      }
      try {
        const raw = await kv.get(key, "text");
        if (raw !== null && raw !== undefined) {
          await edgePut(key, raw, 120);
          if (wantJson) { try { return JSON.parse(raw); } catch (e) { return null; } }
          return raw;
        }
      } catch (e) {}
      return null;
    },
    getWithMetadata: (...a) => kv.getWithMetadata(...a),
    list: (...a) => kv.list(...a),
    async delete(key) {
      kvMem.delete(key);
      try { if (typeof caches !== "undefined" && caches.default) await caches.default.delete(KVCU(key)); } catch (e) {}
      try { return await kv.delete(key); } catch (e) {}
    },
    async put(key, value, opts) {
      const raw = typeof value === "string" ? value : JSON.stringify(value);
      const ttl = (opts && opts.expirationTtl) || 604800;
      const prev = await edgeGet(key);
      await edgePut(key, raw, 120); // 2.29.11: short edge copy; a 7-day copy went stale in other data centres and caused rewrites
      if (prev !== null && stripVolatile(prev) === stripVolatile(raw)) return;
      try {
        // 2.29.11: the edge copy can be an older value from this data centre, so check the real KV value before writing
        // (before, a stale edge copy meant an unchanged record was written again every minute: ~1,000 extra writes a day)
        const cur = await kv.get(key, "text");
        if (cur !== null && stripVolatile(cur) === stripVolatile(raw)) return;
        await kv.put(key, raw, opts);
      } catch (e) {
        await edgePut(key, raw, ttl); // Daily KV write limit reached: keep the value in caches.default + kvMem until KV takes writes again
      }
    }
  };
  return { ...env, EVENTS_KV: w };
}

export async function cacheGet(name) {
  const m = mem.get(name); if (m && m.exp > Date.now()) return m.v;
  try { if (typeof caches !== "undefined" && caches.default) { const r = await caches.default.match(CU(name)); if (r) { const v = await r.json(); mem.set(name, { v, exp: Date.now() + 30000 }); return v; } } } catch (e) { }
  return null;
}
export async function cachePut(name, v, ttlSec) {
  mem.set(name, { v, exp: Date.now() + ttlSec * 1000 });
  try { if (typeof caches !== "undefined" && caches.default) await caches.default.put(CU(name), new Response(JSON.stringify(v), { headers: { "Content-Type": "application/json", "Cache-Control": "max-age=" + ttlSec } })); } catch (e) { }
}
export async function cacheDel(name) { mem.delete(name); try { if (typeof caches !== "undefined" && caches.default) await caches.default.delete(CU(name)); } catch (e) { } }
