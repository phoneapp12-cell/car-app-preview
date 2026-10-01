/* Device sync storage. The phone sends an AES-GCM blob it encrypted with the sync code.
   This worker never decrypts it. The key in KV is a hash of the code, not the code.
   Newer updatedAt replaces an older copy. An empty key is filled by the first push.
   Uses the existing EVENTS_KV binding. Nothing is logged. */
export const SYNC_MAX = 2 * 1024 * 1024;

export function normSyncCode(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-HJ-NP-Z2-9]{16}$/.test(s) ? s : '';
}

export function syncStamp(iso) {
  const t = Date.parse(iso || '');
  return Number.isFinite(t) ? t : 0;
}

async function syncKvKey(code) {
  const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('due-dates-sync-v1:' + code));
  let hex = '';
  for (const b of new Uint8Array(dig)) hex += b.toString(16).padStart(2, '0');
  return 'sync-v1:' + hex;
}

function b64ok(s, min, max) {
  return typeof s === 'string' && s.length >= min && s.length <= max && /^[A-Za-z0-9+/]+={0,2}$/.test(s);
}

export async function syncRoute(body, env) {
  const code = normSyncCode(body && body.code);
  if (!code) return [400, { error: 'bad_code' }];
  if (!env || !env.EVENTS_KV || typeof env.EVENTS_KV.get !== 'function') return [503, { error: 'sync_unavailable' }];
  const key = await syncKvKey(code);
  const op = body && body.op;
  let cur = null;
  try { cur = await env.EVENTS_KV.get(key, { type: 'json' }); } catch (e) { cur = null; }
  if (op === 'pull') {
    if (!cur || typeof cur.ct !== 'string') return [200, { ok: true, empty: true }];
    return [200, { ok: true, empty: false, updatedAt: cur.updatedAt || '', iv: cur.iv, ct: cur.ct }];
  }
  if (op !== 'push') return [400, { error: 'bad_request' }];
  const updatedAt = typeof body.updatedAt === 'string' ? body.updatedAt.slice(0, 40) : '';
  if (!syncStamp(updatedAt)) return [400, { error: 'bad_request' }];
  if (!b64ok(body.iv, 16, 32) || !b64ok(body.ct, 16, SYNC_MAX)) return [400, { error: 'bad_request' }];
  if (cur && typeof cur.ct === 'string' && syncStamp(cur.updatedAt) > syncStamp(updatedAt)) {
    return [200, { ok: true, stored: false, reason: 'older', updatedAt: cur.updatedAt || '', iv: cur.iv, ct: cur.ct }];
  }
  const rec = { updatedAt, iv: body.iv, ct: body.ct };
  await env.EVENTS_KV.put(key, JSON.stringify(rec));
  return [200, { ok: true, stored: true, updatedAt }];
}
