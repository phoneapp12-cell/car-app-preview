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

// opts.bridge true/false forces the flag. A normal subscribe (bridge alerts turned on) forces true.
// A quiet re-register keeps the previous flag (so a reminder-only phone is not opted into bridge alerts).
export async function subscribe(env, raw, now = Date.now(), opts = {}) {
  const sub = cleanSub(raw); if (!sub) throw new Error('bad_subscription');
  const id = await subId(sub.endpoint);
  let subs = await loadSubs(env);
  const prev = subs.find(s => s.id === id);
  let fromOld = null;
  if (!prev && opts.previous && typeof opts.previous === 'string') {
    const oid = await subId(opts.previous);
    fromOld = subs.find(s => s.id === oid) || null;
  }
  let bridge;
  if (opts.bridge === true) bridge = true;
  else if (opts.bridge === false) bridge = false;
  else if (opts.quiet) bridge = (prev || fromOld) ? (prev || fromOld).bridge !== false : true;
  else bridge = true;
  subs = subs.filter(s => s.id !== id);
  subs.push({ id, endpoint: sub.endpoint, keys: sub.keys, at: now, bridge });
  subs = subs.slice(-MAX_SUBS);
  await saveSubs(env, subs);
  if (opts.previous) await migrateReminders(env, opts.previous, sub.endpoint);
  return { id, endpoint: sub.endpoint, keys: sub.keys, bridge };
}
export async function unsubscribe(env, endpoint) {
  if (typeof endpoint !== 'string') return { removed: false, kept: false };
  const id = await subId(endpoint), subs = await loadSubs(env);
  const cur = subs.find(s => s.id === id);
  if (!cur) return { removed: false, kept: false };
  const book = await loadRem(env);
  const pending = book[id] && Array.isArray(book[id].items) && book[id].items.length;
  if (pending) {
    cur.bridge = false; // reminders still need this push address; bridge alerts stop
    await saveSubs(env, subs);
    return { removed: false, kept: true };
  }
  await saveSubs(env, subs.filter(s => s.id !== id));
  return { removed: true, kept: false };
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
    if (s.bridge === false || gone.has(s.id)) continue;
    const r = await sendPush(s, m, env, fetchImpl, now);
    if (r === 'gone') gone.add(s.id); else if (r === 'ok') sent++;
  }
  if (gone.size) await saveSubs(env, subs.filter(s => !gone.has(s.id)));
  if (plan.changed) await env.EVENTS_KV.put(ALERTS_KEY, JSON.stringify(plan.alerts));
  return { sent, msgs: plan.msgs.length, removed: gone.size };
}


// ---- Reminders (exact Auckland time; not the bridge quiet hours) ----
// The phone sends the pending list. A cron every minute pushes when that minute arrives,
// including evenings and weekends. Bridge alerts still wait until 7 am; this does not.
// repeat none fires once and leaves the pending list. daily / weekly / monthly stay scheduled
// for the next Auckland occurrence (monthly: the same date, or the last day of a shorter month).
const REM_KEY = 'push-reminders-v1';
const MAX_REMS = 40;
const REM_GRACE = 36 * 3600 * 1000;
const REM_SLOP = 90 * 1000; // the minute just gone still counts, so a save during that minute is not skipped
const REM_REPEATS = new Set(['daily', 'weekly', 'monthly']);

export function aucklandDue(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [Y, M, D] = date.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  if (M < 1 || M > 12 || h > 23 || m > 59) return null;
  const cal = new Date(Date.UTC(Y, M - 1, D));
  if (cal.getUTCFullYear() !== Y || cal.getUTCMonth() !== M - 1 || cal.getUTCDate() !== D) return null;
  const want = date + 'T' + time;
  let t = Date.UTC(Y, M - 1, D, h, m) - 13 * 3600000;
  for (let i = 0; i < 6; i++) {
    const got = nzStamp(t);
    if (got === want) return t;
    const [gd, gt] = got.split('T');
    const [gy, gm, gd2] = gd.split('-').map(Number);
    const [gh, gmin] = gt.split(':').map(Number);
    t += Date.UTC(Y, M - 1, D, h, m) - Date.UTC(gy, gm - 1, gd2, gh, gmin);
  }
  return nzStamp(t) === want ? t : null;
}
export function reminderBody(date, time) { return dayTxt(date) + ', ' + timeTxt(time); }

function ymd(y, m, d) { return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
function ymdParts(date) { return { Y: +date.slice(0, 4), M: +date.slice(5, 7), D: +date.slice(8, 10) }; }
export function addDaysIso(date, n) {
  const { Y, M, D } = ymdParts(date);
  const t = new Date(Date.UTC(Y, M - 1, D) + n * 86400000);
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
function weekdayIso(date) { const { Y, M, D } = ymdParts(date); return new Date(Date.UTC(Y, M - 1, D)).getUTCDay(); }
// Add n calendar months. The day is the anchor day, clamped to the month length (31st → 28/29/30).
export function addMonthsIso(date, n, anchorDay) {
  const { Y, M, D } = ymdParts(date);
  const first = new Date(Date.UTC(Y, M - 1 + n, 1));
  const y = first.getUTCFullYear(), m = first.getUTCMonth();
  const want = anchorDay || D;
  const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return ymd(y, m + 1, Math.min(want, dim));
}
export function stepRepeat(date, repeat, dom) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (repeat === 'daily') return addDaysIso(date, 1);
  if (repeat === 'weekly') return addDaysIso(date, 7);
  if (repeat === 'monthly') return addMonthsIso(date, 1, dom);
  return null;
}
function realDate(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return false;
  const { Y, M, D } = ymdParts(date);
  const h = +time.slice(0, 2), mi = +time.slice(3, 5);
  if (M < 1 || M > 12 || h > 23 || mi > 59) return false;
  const t = new Date(Date.UTC(Y, M - 1, D));
  return t.getUTCFullYear() === Y && t.getUTCMonth() === M - 1 && t.getUTCDate() === D;
}
// First occurrence at or after now (with a short slop so the current minute still counts).
// Starts at the anchor the phone stored, so nothing fires before the date the user picked.
export function nextOccurrence(anchor, time, repeat, dom, now) {
  const cutoff = now - REM_SLOP;
  const first = aucklandDue(anchor, time);
  if (first != null && first >= cutoff) return { date: anchor, due: first };
  const today = nzStamp(now).slice(0, 10);
  let date = anchor;
  if (repeat === 'daily') date = addDaysIso(today, -1);
  else if (repeat === 'weekly') {
    let d = today;
    const want = weekdayIso(anchor);
    for (let i = 0; i < 7; i++) { if (weekdayIso(d) === want) { date = addDaysIso(d, -7); break; } d = addDaysIso(d, -1); }
  } else if (repeat === 'monthly') date = addMonthsIso(today, -1, dom);
  if (date < anchor) date = anchor;
  for (let i = 0; i < 50; i++) {
    const due = aucklandDue(date, time);
    if (due != null && due >= cutoff) return { date, due };
    const n = stepRepeat(date, repeat, dom);
    if (!n || n <= date) return null;
    date = n;
  }
  return null;
}
// The occurrence after `from`, strictly later than now. Used once a reminder has fired or was missed.
function nextAfter(from, time, repeat, dom, now) {
  let d = stepRepeat(from, repeat, dom);
  if (!d) return null;
  const today = nzStamp(now).slice(0, 10);
  if (d < addDaysIso(today, -2)) {
    const snap = nextOccurrence(d, time, repeat, dom, now + 1000);
    if (snap && snap.date > from && snap.due > now) return snap;
    if (snap && snap.date > from) d = snap.date;
  }
  for (let i = 0; i < 48; i++) {
    const due = aucklandDue(d, time);
    if (due != null && due > now) return { date: d, due };
    const n = stepRepeat(d, repeat, dom);
    if (!n || n <= d) return null;
    d = n;
  }
  return null;
}
function scheduleNext(item, now) {
  const dom = item.dom || Number(String(item.date || '').slice(8, 10));
  const from = item.nextDate || item.date;
  const nxt = nextAfter(from, item.time, item.repeat, dom, now);
  if (!nxt) return null;
  return { id: item.id, title: item.title, date: item.date, time: item.time, repeat: item.repeat, dom, due: nxt.due, nextDate: nxt.date, body: reminderBody(nxt.date, item.time) };
}

export function cleanReminder(r, now = Date.now()) {
  if (!r || typeof r !== 'object') return null;
  const id = String(r.id || '');
  if (!/^rem-[a-z0-9]{4,32}$/i.test(id)) return null;
  const title = String(r.title || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!title) return null;
  const date = String(r.date || ''), time = String(r.time || '');
  if (!realDate(date, time)) return null;
  let repeat = String(r.repeat || 'none');
  if (!REM_REPEATS.has(repeat)) repeat = 'none';
  if (repeat === 'none') {
    const due = aucklandDue(date, time);
    if (due == null || due < now - REM_GRACE) return null;
    return { id, title, date, time, repeat: 'none', due, body: reminderBody(date, time) };
  }
  const dom = Number(date.slice(8, 10));
  const next = nextOccurrence(date, time, repeat, dom, now);
  if (!next) return null;
  return { id, title, date, time, repeat, dom, due: next.due, nextDate: next.date, body: reminderBody(next.date, time) };
}

async function loadRem(env) {
  if (!env.EVENTS_KV) return {};
  try {
    const v = await env.EVENTS_KV.get(REM_KEY, { type: 'json' });
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch (e) { return {}; }
}
async function saveRem(env, book) { await env.EVENTS_KV.put(REM_KEY, JSON.stringify(book)); }

export async function migrateReminders(env, previousEndpoint, nextEndpoint) {
  if (typeof previousEndpoint !== 'string' || typeof nextEndpoint !== 'string' || previousEndpoint === nextEndpoint) return;
  const oldId = await subId(previousEndpoint), newId = await subId(nextEndpoint);
  const book = await loadRem(env);
  if (!book[oldId]) return;
  book[newId] = book[oldId];
  delete book[oldId];
  await saveRem(env, book);
}

export async function setReminders(env, rawSub, list, now = Date.now()) {
  const sub = cleanSub(rawSub);
  if (!sub) throw new Error('bad_subscription');
  const id = await subId(sub.endpoint);
  const subs = await loadSubs(env);
  const prev = subs.find(s => s.id === id);
  if (!prev) await subscribe(env, sub, now, { bridge: false, quiet: true });
  else if (prev.keys.p256dh !== sub.keys.p256dh || prev.keys.auth !== sub.keys.auth) await subscribe(env, sub, now, { quiet: true });
  const book = await loadRem(env);
  const prevItems = (book[id] && Array.isArray(book[id].items)) ? book[id].items : [];
  const prevById = new Map(prevItems.filter(Boolean).map(it => [it.id, it]));
  const items = []; const seen = new Set();
  for (const r of (Array.isArray(list) ? list : []).slice(0, MAX_REMS)) {
    const c = cleanReminder(r, now);
    if (!c || seen.has(c.id)) continue;
    // The phone re-sends the anchor date. If this occurrence already fired, keep the later due
    // so a resync in the same minute does not schedule it again.
    const old = prevById.get(c.id);
    if (old && old.time === c.time && (old.repeat || 'none') === c.repeat && old.date === c.date && typeof old.due === 'number' && old.due > c.due) {
      c.due = old.due;
      if (old.nextDate && (!c.nextDate || old.nextDate > c.nextDate)) {
        c.nextDate = old.nextDate;
        c.body = reminderBody(old.nextDate, c.time);
      }
    }
    seen.add(c.id); items.push(c);
  }
  if (items.length) book[id] = { items }; else delete book[id];
  await saveRem(env, book);
  if (!items.length) {
    const again = await loadSubs(env);
    const cur = again.find(s => s.id === id);
    if (cur && cur.bridge === false) await saveSubs(env, again.filter(s => s.id !== id));
  }
  return { saved: items.length };
}

export async function runReminders(env, fetchImpl = fetch, now = Date.now()) {
  if (!env.EVENTS_KV || !env.VAPID_PRIVATE_JWK) return { sent: 0 };
  const book = await loadRem(env);
  const ids = Object.keys(book);
  if (!ids.length) return { sent: 0 };
  let subs = await loadSubs(env);
  const gone = new Set();
  let sent = 0, changed = false, budget = 5;
  for (const id of ids) {
    const sub = subs.find(s => s.id === id);
    const items = (book[id] && book[id].items) || [];
    if (!sub) { delete book[id]; changed = true; continue; }
    const keep = [];
    for (const item of items) {
      if (!item || typeof item.due !== 'number') { changed = true; continue; }
      if (item.due > now) { keep.push(item); continue; }
      const repeat = !!(item.repeat && item.repeat !== 'none');
      if (now - item.due > REM_GRACE) {
        changed = true;
        if (repeat) { const nxt = scheduleNext(item, now); if (nxt) keep.push(nxt); }
        continue; // a one-off that was missed by more than the grace period is dropped
      }
      if (gone.has(id) || budget <= 0) { keep.push(item); continue; }
      budget--;
      const occ = item.nextDate || item.date;
      const tag = repeat ? 'rem-' + item.id + '-' + occ : 'rem-' + item.id;
      const r = await sendPush(sub, { title: item.title, body: item.body || 'Reminder', url: '#reminders', tag, ttl: 12 * 3600 }, env, fetchImpl, now);
      if (r === 'gone') { gone.add(id); changed = true; continue; }
      if (r === 'ok') {
        sent++; changed = true;
        if (repeat) { const nxt = scheduleNext(item, now); if (nxt) keep.push(nxt); }
        continue; // one-off: leave it off the pending list. The phone still has its own copy.
      }
      keep.push(item);
    }
    if (gone.has(id)) { delete book[id]; changed = true; }
    else if (keep.length !== items.length || keep.some((x, i) => x !== items[i])) { if (keep.length) book[id] = { items: keep }; else delete book[id]; changed = true; }
  }
  if (gone.size) await saveSubs(env, subs.filter(s => !gone.has(s.id)));
  if (changed) await saveRem(env, book);
  return { sent, removed: gone.size };
}

// ---- Routes: /push/subscribe, /push/unsubscribe, /push/status, /push/test (app origin only, POST JSON) ----
const hits = []; // small per-instance limit so nobody can use this to spam a push service
function limited(now) { while (hits.length && now - hits[0] > 3600e3) hits.shift(); if (hits.length >= 30) return true; hits.push(now); return false; }
export async function pushRoute(path, body, env, fetchImpl = fetch, now = Date.now()) {
  if (!env.EVENTS_KV || !env.VAPID_PRIVATE_JWK) return [503, { error: 'push_unavailable' }];
  if (path === '/push/key') return [200, { key: env.VAPID_PUBLIC || null }];
  if (path === '/push/status') {
    const endpoint = body && body.endpoint;
    const subscribed = await isSubscribed(env, endpoint);
    let bridge = false;
    if (subscribed) {
      const id = await subId(endpoint);
      const rec = (await loadSubs(env)).find(x => x.id === id);
      bridge = !rec || rec.bridge !== false;
    }
    return [200, { subscribed, bridge }];
  }
  if (path === '/push/unsubscribe') return [200, await unsubscribe(env, body && body.endpoint)];
  if (path === '/push/reminders') {
    try { return [200, await setReminders(env, body && body.subscription, body && body.reminders, now)]; }
    catch (e) { return [400, { error: 'bad_subscription' }]; }
  }
  if (limited(now)) return [429, { error: 'too_many' }];
  if (path === '/push/subscribe') {
    const opt = { quiet: !!(body && body.quiet), previous: body && body.previous };
    if (body && body.bridge === true) opt.bridge = true;
    else if (body && body.bridge === false) opt.bridge = false;
    let sub; try { sub = await subscribe(env, body && body.subscription, now, opt); } catch (e) { return [400, { error: 'bad_subscription' }]; }
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
