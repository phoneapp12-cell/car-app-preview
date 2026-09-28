/* Push notifications for bridge closures (Web Push, no third-party service).
 *
 * The app subscribes with the browser's own push service (Chrome uses Google's FCM endpoint) and sends
 * that subscription here. When the closures cron finds a new notice about the lifting bridge, or it's the
 * evening before a planned closure, this sends an encrypted push (RFC 8291, aes128gcm) signed with our
 * VAPID key (RFC 8292). The phone shows it even when the app is closed.
 *
 * Stored in KV: the subscriptions (push endpoint + its public keys, nothing else) and which closures have
 * already been announced. The VAPID private key is a Worker secret (VAPID_PRIVATE_JWK), never in the repo.
 * No logging.
 */
import { toClosures, nzStamp } from './closures.js';

const SUBS_KEY = 'push-subs-v1';
const ALERTS_KEY = 'push-alerts-v1';
const MAX_SUBS = 10;
const CONTACT = 'https://phoneapp12-cell.github.io/car-app-preview/';
export const PUSH_HOSTS = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'];
const PUSH_SUFFIXES = ['.notify.windows.com', '.push.apple.com', '.push.services.mozilla.com'];
const QUIET_FROM = 21, QUIET_TO = 7;   // new-notice alerts wait until 7 am if found overnight
const REMIND_HOUR = 18;                 // "tomorrow" reminder from 6 pm the evening before

const enc = new TextEncoder();
export const b64u = buf => { let s = ''; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const unb64u = s => { s = String(s || '').replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };
const cat = (...parts) => { const n = parts.reduce((a, p) => a + p.length, 0), out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

export function endpointAllowed(raw) {
  let u; try { u = new URL(raw); } catch (e) { return false; }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443') || raw.length > 1024) return false;
  const h = u.hostname.toLowerCase();
  return PUSH_HOSTS.includes(h) || PUSH_SUFFIXES.some(s => h.endsWith(s) && h.length > s.length);
}
// Returns a clean subscription or null
export function cleanSub(s) {
  if (!s || typeof s !== 'object' || typeof s.endpoint !== 'string' || !endpointAllowed(s.endpoint)) return null;
  const k = s.keys || {};
  try { if (unb64u(k.p256dh).length !== 65 || unb64u(k.auth).length !== 16) return null; } catch (e) { return null; }
  return { endpoint: s.endpoint, keys: { p256dh: String(k.p256dh), auth: String(k.auth) } };
}

// ---- VAPID (RFC 8292) ----
async function vapidHeader(endpoint, env, now) {
  const jwk = typeof env.VAPID_PRIVATE_JWK === 'string' ? JSON.parse(env.VAPID_PRIVATE_JWK) : env.VAPID_PRIVATE_JWK;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: CONTACT })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body));
  const pub = env.VAPID_PUBLIC || b64u(cat(new Uint8Array([4]), unb64u(jwk.x), unb64u(jwk.y)));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${pub}`;
}

// ---- Payload encryption (RFC 8291 / RFC 8188 aes128gcm) ----
async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}
export async function encryptPayload(sub, text, testKeys) {
  const uaPub = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const as = testKeys ? testKeys.pair : await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(auth, shared, cat(enc.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = testKeys ? testKeys.salt : crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(enc.encode(text), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}

// Sends one push. Returns 'ok' | 'gone' (subscription expired, remove it) | 'error'
export async function sendPush(sub, msg, env, fetchImpl = fetch, now = Date.now()) {
  try {
    const body = await encryptPayload(sub, JSON.stringify(msg));
    const res = await fetchImpl(sub.endpoint, {
      method: 'POST', body,
      headers: { 'Authorization': await vapidHeader(sub.endpoint, env, now), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', 'TTL': String(msg.ttl || 12 * 3600), 'Urgency': 'normal' }
    });
    if (res.body) res.body.cancel().catch(() => { });
    if (res.status === 404 || res.status === 410) return 'gone';
    return res.ok ? 'ok' : 'error';
  } catch (e) { return 'error'; }
}

// ---- Subscriptions in KV ----
const subId = async ep => b64u(await crypto.subtle.digest('SHA-256', enc.encode(ep))).slice(0, 16);
export async function loadSubs(env) { if (!env.EVENTS_KV) return []; try { return (await env.EVENTS_KV.get(SUBS_KEY, { type: 'json' })) || []; } catch (e) { return []; } }
async function saveSubs(env, subs) { await env.EVENTS_KV.put(SUBS_KEY, JSON.stringify(subs)); }

export async function subscribe(env, raw, now = Date.now()) {
  const sub = cleanSub(raw); if (!sub) throw new Error('bad_subscription');
  const id = await subId(sub.endpoint);
  let subs = (await loadSubs(env)).filter(s => s.id !== id);
  subs.push({ id, ...sub, at: now });
  subs = subs.slice(-MAX_SUBS);
  await saveSubs(env, subs);
  return { id, ...sub };
}
export async function unsubscribe(env, endpoint) {
  if (typeof endpoint !== 'string') return false;
  const id = await subId(endpoint), subs = await loadSubs(env), left = subs.filter(s => s.id !== id);
  if (left.length !== subs.length) await saveSubs(env, left);
  return left.length !== subs.length;
}
export async function isSubscribed(env, endpoint) {
  if (typeof endpoint !== 'string') return false;
  const id = await subId(endpoint); return (await loadSubs(env)).some(s => s.id === id);
}

// ---- Wording ----
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayTxt = iso => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d)); return `${WD[t.getUTCDay()]} ${d} ${MON[m - 1]}`; };
export function timeTxt(t) { if (!t) return ''; let [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return m ? `${h}:${String(m).padStart(2, '0')} ${ap}` : `${h} ${ap}`; }
export function whenTxt(d) {
  const same = !d.end || d.end === d.start;
  const t = d.time ? (d.endTime ? `${timeTxt(d.time)} to ${timeTxt(d.endTime)}` : `from ${timeTxt(d.time)}`) : '';
  if (same) return dayTxt(d.start) + (t ? ', ' + t : '');
  return `${dayTxt(d.start)}${d.time ? ' ' + timeTxt(d.time) : ''} to ${dayTxt(d.end)}${d.endTime ? ' ' + timeTxt(d.endTime) : ''}`;
}
const whereTxt = c => c.where ? c.where.replace(/,?\s*Whangārei\s*\d{4}$/, '').trim() : '';

export function newMsg(c) {
  const when = c.dates.length ? c.dates.slice(0, 2).map(whenTxt).join(' and ') + (c.dates.length > 2 ? ` (+${c.dates.length - 2} more)` : '') : 'Dates on the council notice';
  const w = whereTxt(c);
  return { title: 'Lifting bridge: new closure notice', body: `${c.title}. ${when}.${w ? ' ' + w + '.' : ''}`, url: '#bridge', tag: 'bridge-new-' + c.id };
}
export function remindMsg(c, d) {
  const t = d.time ? (d.endTime ? ` from ${timeTxt(d.time)} to ${timeTxt(d.endTime)}` : ` from ${timeTxt(d.time)}`) : '';
  const w = whereTxt(c);
  return { title: `Tomorrow: bridge closure${t}`, body: `${c.title}.${w ? ' ' + w + '.' : ''} ${dayTxt(d.start)}.`, url: '#bridge', tag: 'bridge-remind-' + c.id + '-' + d.start };
}

const nzParts = now => { const s = nzStamp(now); return { date: s.slice(0, 10), hour: +s.slice(11, 13) }; };
const nextDay = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10); };

// Decide what to send. alerts = { seeded, announced: {id: ms}, reminded: {id|date: ms} }. Pure (no I/O).
export function planAlerts(feed, alerts, now = Date.now()) {
  alerts = alerts && typeof alerts === 'object' ? alerts : {};
  const out = { msgs: [], alerts: { seeded: true, announced: { ...(alerts.announced || {}) }, reminded: { ...(alerts.reminded || {}) } }, changed: false };
  const { date, hour } = nzParts(now), tomorrow = nextDay(date);
  const quiet = hour >= QUIET_FROM || hour < QUIET_TO;
  const closures = (feed && feed.closures) || [];
  if (!alerts.seeded) { // first run: don't announce what's already listed (the app shows those)
    closures.forEach(c => { out.alerts.announced[c.id] = now; });
    out.changed = true;
  } else if (!quiet) {
    for (const c of closures) {
      if (out.alerts.announced[c.id]) continue;
      out.alerts.announced[c.id] = now; out.changed = true;
      out.msgs.push(newMsg(c));
      // a new notice for tomorrow already says when, so skip the separate reminder
      (c.dates || []).forEach(d => { if (d.start === tomorrow) out.alerts.reminded[c.id + '|' + d.start] = now; });
    }
  }
  if (hour >= REMIND_HOUR && hour < 22) {
    for (const c of closures) for (const d of c.dates || []) {
      const k = c.id + '|' + d.start;
      if (d.start !== tomorrow || out.alerts.reminded[k]) continue;
      out.alerts.reminded[k] = now; out.changed = true;
      out.msgs.push(remindMsg(c, d));
    }
  }
  // tidy: forget closures gone from the list for 30 days
  const live = new Set(closures.map(c => c.id)), old = now - 30 * 864e5;
  for (const [k, v] of Object.entries(out.alerts.announced)) if (!live.has(k) && v < old) { delete out.alerts.announced[k]; out.changed = true; }
  for (const [k, v] of Object.entries(out.alerts.reminded)) if (v < old) { delete out.alerts.reminded[k]; out.changed = true; }
  if (out.msgs.length > 3) { // several at once (unlikely): one summary instead of a pile
    const n = out.msgs.length;
    out.msgs = [{ title: 'Lifting bridge: closure notices', body: `${n} updates about closures on Dave Culham Drive. Tap to see them.`, url: '#bridge', tag: 'bridge-summary' }];
  }
  return out;
}

// Called from the closures cron with the latest saved closures state.
export async function runAlerts(env, closuresState, fetchImpl = fetch, now = Date.now()) {
  if (!env.EVENTS_KV || !env.VAPID_PRIVATE_JWK || !closuresState || !closuresState.list) return { sent: 0 };
  const subs = await loadSubs(env);
  if (!subs.length) return { sent: 0 };
  let alerts = null; try { alerts = await env.EVENTS_KV.get(ALERTS_KEY, { type: 'json' }); } catch (e) { }
  // only closures whose notice page has been read (so the alert has the dates), unless it couldn't be read
  const feed = toClosures(closuresState, now), pages = closuresState.pages || {};
  feed.closures = feed.closures.filter(c => pages[c.url]);
  const plan = planAlerts(feed, alerts, now);
  let sent = 0; const gone = new Set();
  for (const m of plan.msgs) for (const s of subs) {
    if (gone.has(s.id)) continue;
    const r = await sendPush(s, m, env, fetchImpl, now);
    if (r === 'gone') gone.add(s.id); else if (r === 'ok') sent++;
  }
  if (gone.size) await saveSubs(env, subs.filter(s => !gone.has(s.id)));
  if (plan.changed) await env.EVENTS_KV.put(ALERTS_KEY, JSON.stringify(plan.alerts));
  return { sent, msgs: plan.msgs.length, removed: gone.size };
}

// ---- Routes: /push/subscribe, /push/unsubscribe, /push/status, /push/test (app origin only, POST JSON) ----
const hits = []; // small per-instance limit so nobody can use this to spam a push service
function limited(now) { while (hits.length && now - hits[0] > 3600e3) hits.shift(); if (hits.length >= 30) return true; hits.push(now); return false; }
export async function pushRoute(path, body, env, fetchImpl = fetch, now = Date.now()) {
  if (!env.EVENTS_KV || !env.VAPID_PRIVATE_JWK) return [503, { error: 'push_unavailable' }];
  if (path === '/push/key') return [200, { key: env.VAPID_PUBLIC || null }];
  if (path === '/push/status') return [200, { subscribed: await isSubscribed(env, body && body.endpoint) }];
  if (path === '/push/unsubscribe') return [200, { removed: await unsubscribe(env, body && body.endpoint) }];
  if (limited(now)) return [429, { error: 'too_many' }];
  if (path === '/push/subscribe') {
    let sub; try { sub = await subscribe(env, body && body.subscription, now); } catch (e) { return [400, { error: 'bad_subscription' }]; }
    if (body.quiet) return [200, { subscribed: true }]; // re-registering after the phone renewed its push address
    const r = await sendPush(sub, { title: 'Bridge closure alerts are on', body: 'You’ll get a notification when the council posts a new closure for the lifting bridge or Dave Culham Drive, and again the evening before.', url: '#bridge', tag: 'bridge-on' }, env, fetchImpl, now);
    return [200, { subscribed: true, test: r }];
  }
  if (path === '/push/test') {
    const ep = body && body.endpoint; const id = typeof ep === 'string' ? await subId(ep) : null;
    const sub = id && (await loadSubs(env)).find(s => s.id === id);
    if (!sub) return [404, { error: 'not_subscribed' }];
    const r = await sendPush(sub, { title: 'Test: bridge closure alert', body: 'This is how a bridge closure alert will look. Tap it to open the bridge page.', url: '#bridge', tag: 'bridge-test' }, env, fetchImpl, now);
    if (r === 'gone') await unsubscribe(env, ep);
    return [200, { test: r }];
  }
  return [404, { error: 'not_found_route' }];
}
