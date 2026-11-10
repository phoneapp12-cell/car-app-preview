/* Come-back Web Push for the existing shane-my-feed-data worker.
   Do not deploy this folder by itself. It is not the feed worker.
   Copy the call sites in COMEBACK.md into the worker that already serves /feed.json.
   VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are Worker secrets. Never commit them.
   VAPID_PRIVATE_KEY is a JSON JWK (d, x, y, kty, crv). VAPID_PUBLIC_KEY is the
   uncompressed P-256 point, base64url, which the phone uses to subscribe. */
const TWO = 2 * 86400000;
const enc = new TextEncoder();

export function nzHour(ms) {
  const p = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hourCycle: 'h23', hour: '2-digit' }).formatToParts(new Date(ms));
  return Number((p.find(x => x.type === 'hour') || {}).value || 0);
}
export function quiet(ms) { const h = nzHour(ms); return h >= 21 || h < 8; }
export function shouldPing(row, now) {
  // Always on once a phone has subscribed. An off flag is not consulted.
  if (!row || !row.sub) return false;
  const lastOpen = row.lastOpen || 0, lastSent = row.lastSent || 0;
  if (!lastOpen || now - lastOpen < TWO) return false;
  if (lastSent && now - lastSent < TWO) return false;
  if (quiet(now)) return false;
  return true;
}

const b64url = bytes => {
  let s = ''; const u = new Uint8Array(bytes); for (const b of u) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export function b64urlToBytes(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
}
const concat = parts => { const n = parts.reduce((a, b) => a + b.length, 0), o = new Uint8Array(n); let i = 0; for (const p of parts) { o.set(p, i); i += p.length; } return o; };

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8);
  return new Uint8Array(bits);
}

export async function encryptPayload(subscription, text) {
  const userPublic = b64urlToBytes(subscription.keys.p256dh);
  const auth = b64urlToBytes(subscription.keys.auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const userKey = await crypto.subtle.importKey('raw', userPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: userKey }, local.privateKey, 256));
  const localRaw = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const ikm = await hkdf(auth, shared, concat([enc.encode('WebPush: info\0'), userPublic, localRaw]), 32);
  const key = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat([enc.encode(text), new Uint8Array([2])])));
  const rs = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096);
  return concat([salt, rs, new Uint8Array([localRaw.length]), localRaw, cipher]);
}

async function vapidAuth(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const head = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:feed@shane-my-app.pages.dev' })));
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE_KEY), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = b64url(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body)));
  return 'vapid t=' + head + '.' + body + '.' + sig + ', k=' + env.VAPID_PUBLIC_KEY;
}

export async function sendComeback(subscription, env) {
  const payload = JSON.stringify({ type: 'comeback', title: 'Info Book', body: 'It has been a couple of days. Come back when you have a minute.' });
  const body = await encryptPayload(subscription, payload);
  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: { Authorization: await vapidAuth(subscription.endpoint, env), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400' },
    body
  });
  return res.status;
}

async function idOf(endpoint) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(endpoint));
  return b64url(digest);
}

export async function saveSub(env, body) {
  if (!env.FEED_KV || !body || !body.sub || !body.sub.endpoint) return;
  const id = await idOf(body.sub.endpoint);
  const prev = await env.FEED_KV.get('push:' + id, 'json') || {};
  await env.FEED_KV.put('push:' + id, JSON.stringify({ sub: body.sub, lastOpen: body.lastOpen || prev.lastOpen || Date.now(), lastSent: prev.lastSent || 0 }));
}

export async function runComeback(env, now = Date.now()) {
  if (!env || !env.FEED_KV || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return { skipped: 'no-keys' };
  if (quiet(now)) return { skipped: 'quiet' };
  let sent = 0, cursor;
  do {
    const page = await env.FEED_KV.list({ prefix: 'push:', cursor });
    for (const k of page.keys) {
      const row = await env.FEED_KV.get(k.name, 'json');
      if (!shouldPing(row, now)) continue;
      try { await sendComeback(row.sub, env); row.lastSent = now; await env.FEED_KV.put(k.name, JSON.stringify(row)); sent++; } catch (e) {}
      if (sent >= 20) return { sent, capped: true };
    }
    cursor = page.list_complete ? '' : page.cursor;
  } while (cursor);
  return { sent };
}

export async function handlePush(req, env) {
  const u = new URL(req.url);
  if (u.pathname === '/push/vapid') return Response.json({ publicKey: env.VAPID_PUBLIC_KEY || '' });
  if (u.pathname === '/push/subscribe' && req.method === 'POST') { await saveSub(env, await req.json()); return Response.json({ ok: 1 }); }
  return null;
}
