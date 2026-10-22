// 2.27.48: per-device shared keys, pairing, and the old key's grace period
import { handle } from '../src/relay.js';
import { sha } from '../src/akahu.js';
import { LEGACY_CUTOFF } from '../src/pair.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const O = 'https://phoneapp12-cell.github.io', N = 'https://shane-my-app.pages.dev', APPKEY = 'test-device-key-0123456789abcdef', OLD = 'legacy-shared-key-for-tests-0123456789AB';
const store = new Map(); const kv = { async get(k, o) { const v = store.has(k) ? store.get(k) : null; return v && o && o.type === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); }, async list() { return { keys: [] }; } };
const env = { EVENTS_KV: kv, ALLOWED_ORIGIN: O, EXTRA_ORIGINS: N, SHARED_NS: OLD };
store.set('health-cred-v1', JSON.stringify({ tokHash: 'none', appKeyHash: await sha(APPKEY), created: '' }));
let ip = 1; const post = async (path, body, h = {}, origin = O) => { const r = await handle(new Request('https://relay.example' + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.' + (ip++ % 200), ...h }, body: JSON.stringify(body) }), env); let j = null; try { j = await r.json(); } catch (e) { } return [r.status, j]; };
const todo = key => post('/shared-todo', { key, items: [], from: 'sarah' });

let [s, j] = await todo(OLD); ok(s === 200, 'old key still works during grace (Sarah on an old version keeps syncing)');
[s] = await todo('x'.repeat(40)); ok(s === 403, 'unknown key refused');
[s] = await post('/pair/shane', {}, {}, N); ok(s === 401, 'Shane key needs the device key');
[s, j] = await post('/pair/shane', {}, { 'X-Cash-Key': APPKEY }, N); const shaneKey = j && j.key; ok(s === 200 && /^st_[A-Za-z0-9_-]{43}$/.test(shaneKey), 'My App gets its own key');
ok(!store.get('shared-auth-v1').includes(shaneKey), 'relay keeps only a hash');
[s] = await todo(shaneKey); ok(s === 200, "Shane's key opens the same list");
[s] = await post('/pair/code', {}, {}, N); ok(s === 401, 'pairing code needs the device key');
[s, j] = await post('/pair/code', {}, { 'X-Cash-Key': APPKEY }, N); const code = j && j.code; ok(s === 200 && /^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(code), 'Shane gets a pairing code');
[s] = await post('/pair/redeem', { code: 'AAAAA-AAAAA' }); ok(s === 403, 'wrong code refused');
[s, j] = await post('/pair/redeem', { code: code.toLowerCase() }); const sarahKey = j && j.key; ok(s === 200 && /^st_/.test(sarahKey), 'Sarah pairs with the code');
[s] = await post('/pair/redeem', { code }); ok(s === 410, 'code is single use');
[s] = await todo(sarahKey); ok(s === 200, "Sarah's key opens the same list");
[s] = await todo(OLD); ok(s === 403, 'old key retired once both phones are paired');
[s, j] = await post('/pair/status', {}, { 'X-Cash-Key': APPKEY }, N); ok(s === 200 && j.sarahAt > 0 && j.shane === 1 && j.legacyOpen === false, 'status shows both paired');
// expiry
[s, j] = await post('/pair/code', {}, { 'X-Cash-Key': APPKEY }, N); const d = JSON.parse(store.get('shared-auth-v1')); d.pair.exp = Date.now() - 1; store.set('shared-auth-v1', JSON.stringify(d));
const { cacheDel } = await import('../src/kvguard.js'); await cacheDel('shared-auth');
[s] = await post('/pair/redeem', { code: j.code }); ok(s === 410, 'code expires after 24 hours');
// unlink Sarah: her key stops; legacy closed since cutoff logic still needs both... (Sarah removed -> legacy reopens before cutoff)
[s] = await post('/pair/unlink', {}, { 'X-Cash-Key': APPKEY }, N); [s] = await todo(sarahKey); ok(s === 403, 'unlinked phone refused');
ok(LEGACY_CUTOFF === Date.parse('2026-11-05T23:59:59+13:00'), 'cutoff 5 Nov 2026');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
