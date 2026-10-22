/* 2.27.45: light per-IP rate limits kept in the Cache API (no KV writes). Counts are per Cloudflare location and
   approximate, which is fine: they stop key guessing and quota abuse, not a determined botnet. */
import { cacheGet, cachePut } from './kvguard.js';
const ipOf = req => (req && req.headers && (req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || '')).split(',')[0].trim() || 'none';
const slot = (name, req, secs) => `rl-${name}-${ipOf(req).replace(/[^0-9a-f:.]/gi, '')}-${Math.floor(Date.now() / (secs * 1000))}`;
// true while under the limit (and counts this hit)
export async function allow(name, req, max, secs) {
  const k = slot(name, req, secs); const n = Number(await cacheGet(k)) || 0; if (n >= max) return false; await cachePut(k, n + 1, secs + 5); return true;
}
// failed-key counter: blocked() checks, fail() counts one bad key
export async function blocked(name, req, max, secs) { return (Number(await cacheGet(slot(name + '-bad', req, secs))) || 0) >= max; }
export async function fail(name, req, secs) { const k = slot(name + '-bad', req, secs); await cachePut(k, (Number(await cacheGet(k)) || 0) + 1, secs + 5); }
