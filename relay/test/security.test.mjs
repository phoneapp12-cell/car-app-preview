// 2.27.45 security fixes: device key on /ai, /power, shared-push sign-up, SMS opt-in; hashed power token; purge
import { handle } from '../src/relay.js';
import { runShop, SHOP_KEY } from '../src/shop-notify.js';
import { sha } from '../src/akahu.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const O = 'https://phoneapp12-cell.github.io', APPKEY = 'test-device-key-0123456789abcdef';
const store = new Map();
const kv = { async get(k, o) { const v = store.has(k) ? store.get(k) : null; return v && o && (o.type === 'json' || o === 'json') ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); }, async list() { return { keys: [] }; } };
const env = { EVENTS_KV: kv, ALLOWED_ORIGIN: O, POWER_WRITE_TOKEN: 'power-token-for-tests-1234567890', VAPID_PRIVATE_JWK: '{}' };
store.set('health-cred-v1', JSON.stringify({ tokHash: 'none', appKeyHash: await sha(APPKEY), created: '' }));
const req = (path, method = 'GET', body, h = {}) => new Request('https://relay.example' + path, { method, headers: { 'Content-Type': 'application/json', ...h }, body: body ? JSON.stringify(body) : undefined });
const noFetch = async () => { throw new Error('no network'); };

let r = await handle(req('/power', 'GET', null, { Origin: O }), env, noFetch); ok(r.status === 401, '/power without device key refused');
r = await handle(req('/power', 'GET', null, { Origin: O, 'X-Cash-Key': 'wrong-key-wrong-key' }), env, noFetch); ok(r.status === 401, '/power with wrong key refused');
r = await handle(req('/power', 'GET', null, { Origin: O, 'X-Cash-Key': APPKEY }), env, noFetch); ok(r.status !== 401 && r.status !== 403, '/power with device key allowed');
r = await handle(req('/ai', 'POST', { ctx: {} }, { Origin: O }), env, noFetch); ok(r.status === 401, '/ai without device key refused');
r = await handle(req('/ai/ask', 'POST', { facts: [] }, { Origin: O }), env, noFetch); ok(r.status === 401, '/ai/ask without device key refused');
r = await handle(req('/power', 'PUT', { at: 1 }, { Authorization: 'Bearer nope' }), env, noFetch); ok(r.status === 401, 'power upload with wrong token refused');
r = await handle(req('/shared-push/subscribe', 'POST', { key: 'k'.repeat(40), who: 'shane', subscription: { endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'a'.repeat(80), auth: 'b'.repeat(22) } } }, { Origin: O }), env, noFetch);
ok(r.status === 401 || r.status === 403, 'Shane push sign-up without device key refused');

// purge: unverified Shane subscriptions are dropped, verified kept
store.set(SHOP_KEY, JSON.stringify({ h1: { subs: { shane: [{ id: 'a', endpoint: 'https://x/1', keys: {} }, { id: 'b', endpoint: 'https://x/2', keys: {}, v: 1 }] }, q: {} } }));
const res = await runShop(env, noFetch, Date.now());
const left = JSON.parse(store.get(SHOP_KEY)).h1.subs.shane;
ok(res.purged === 1 && left.length === 1 && left[0].id === 'b', 'unverified Shane subscription purged, verified kept');

// wrong-key limiter: 30 bad keys an hour, then 429
let last = 0; for (let i = 0; i < 31; i++) { r = await handle(req('/cars/alexa', 'GET', null, { 'X-Cars-Key': 'x'.repeat(48), 'CF-Connecting-IP': '203.0.113.9' }), env, noFetch); last = r.status; }
ok(last === 429, 'repeated wrong Alexa keys get rate limited');
r = await handle(req('/cars/alexa', 'GET', null, { 'X-Cars-Key': 'x'.repeat(48), 'CF-Connecting-IP': '203.0.113.10' }), env, noFetch); ok(r.status !== 429, 'other callers unaffected');

console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
