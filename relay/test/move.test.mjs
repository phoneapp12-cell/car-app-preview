// 2.27.46: one-time move to the new address
import { handle } from '../src/relay.js';
import { sha } from '../src/akahu.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const OLD = 'https://phoneapp12-cell.github.io', NEW = 'https://shane-my-app.pages.dev', APPKEY = 'test-device-key-0123456789abcdef';
const store = new Map();
const kv = { async get(k) { return store.has(k) ? store.get(k) : null; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); }, async list() { return { keys: [] }; } };
const env = { EVENTS_KV: kv, ALLOWED_ORIGIN: OLD, EXTRA_ORIGINS: NEW };
store.set('health-cred-v1', JSON.stringify({ tokHash: 'none', appKeyHash: await sha(APPKEY), created: '' }));
const call = async (path, origin, body, key, text) => { const h = { Origin: origin, 'Content-Type': text ? 'text/plain' : 'application/json' }; if (key) h['X-Cash-Key'] = key; const r = await handle(new Request('https://relay.example' + path, { method: 'POST', headers: h, body: text ? body : JSON.stringify(body || {}) }), env); let j = null; try { j = await r.json(); } catch (e) { } return [r.status, j, r]; };

let r; let [s, j] = await call('/move/start', OLD, { chunks: 2 }); ok(s === 401, 'start without device key refused');
[s] = await call('/move/start', NEW, { chunks: 2 }, APPKEY); ok(s === 403, 'start from the new address refused');
[s, j] = await call('/move/start', OLD, { chunks: 2 }, APPKEY); ok(s === 200 && /^[A-Za-z0-9_-]{22,}$/.test(j.id), 'old address with device key starts a move');
const id = j.id;
[s] = await call(`/move/put?id=${id}&i=0`, OLD, 'abc.def', APPKEY, true); ok(s === 200, 'chunk 0 stored');
[s] = await call(`/move/put?id=${id}&i=1`, OLD, 'ghi', APPKEY, true); ok(s === 200, 'chunk 1 stored');
[s] = await call(`/move/put?id=${id}&i=2`, OLD, 'x', APPKEY, true); ok(s === 404, 'chunk out of range refused');
[s] = await call(`/move/get?id=${id}`, OLD); ok(s === 403, 'old address cannot read the parcel');
[s, j] = await call(`/move/get?id=${id}`, NEW); ok(s === 200 && j.n === 2, 'new address sees 2 chunks');
[s, j] = await call(`/move/get?id=${id}&i=1`, NEW); ok(s === 200 && j.c === 'ghi', 'new address reads chunk');
[s, j, r] = await call('/move/status', NEW); ok(j.moved === 0, 'not moved yet');
ok(r.headers.get('Access-Control-Allow-Origin') === NEW, 'new address allowed by CORS');
[s] = await call('/move/done', NEW, { id }); ok(s === 401, 'done needs the device key');
[s] = await call('/move/done', NEW, { id }, APPKEY); ok(s === 200, 'done accepted');
ok(!store.has('move-v1:' + id) && !store.has('move-v1:' + id + ':0'), 'parcel deleted after the move');
[s, j] = await call('/move/status', OLD); ok(j.moved > 0, 'moved time recorded');
// grace: github.io still works for 3 days, then private routes refuse it; shared routes keep working
let r2 = await handle(new Request('https://relay.example/power', { headers: { Origin: OLD, 'X-Cash-Key': APPKEY } }), env); ok(r2.status !== 403, 'old address still works during grace');
store.set('moved-v1', JSON.stringify({ at: Date.now() - 4 * 86400e3 }));
r2 = await handle(new Request('https://relay.example/power', { headers: { Origin: OLD, 'X-Cash-Key': APPKEY } }), env); ok(r2.status === 403, 'after grace, old address refused on private routes');
r2 = await handle(new Request('https://relay.example/power', { headers: { Origin: NEW, 'X-Cash-Key': APPKEY } }), env); ok(r2.status !== 403 && r2.status !== 401, 'new address fine');
r2 = await handle(new Request('https://relay.example/sarah', { headers: { Origin: OLD } }), env, async () => new Response('<feed></feed>')); ok(r2.status !== 403, "Sarah's routes still open to github.io");
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
