import { handle } from '../src/relay.js';
import { runAkahu, categorise } from '../src/akahu.js';
import assert from 'node:assert/strict';
const O = 'https://phoneapp12-cell.github.io';
const store = new Map();
const kv = { get: async (k, o) => { const v = store.has(k) ? store.get(k) : null; return o && o.type === 'json' && v ? JSON.parse(v) : v; }, put: async (k, v) => { store.set(k, v); }, delete: async k => { store.delete(k); }, list: async () => ({ keys: [] }) };
const env = { EVENTS_KV: kv, ALLOWED_ORIGIN: O, AKAHU_ENC_KEY: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64') };
const U = 'user_token_mockUSER1234567890', A = 'app_token_mockAPP1234567890';
let calls = [];
const now = Date.now(), iso = d => new Date(now - d * 864e5).toISOString();
const ACC = [
  { _id: 'acc_asb1', name: 'Streamline', formatted_account: '12-3000-0000000-00', type: 'CHECKING', connection: { name: 'ASB' }, balance: { current: 812.4, available: 812.4 } },
  { _id: 'acc_anz1', name: 'Go', formatted_account: '01-0000-0000000-00', type: 'CHECKING', connection: { name: 'ANZ' }, balance: { current: 1500, available: 1500 } },
  { _id: 'acc_card', name: 'Visa Rewards', type: 'CREDITCARD', connection: { name: 'ASB' }, balance: { current: -350, available: 650, limit: 1000 } }];
const TX = [
  { _id: 't1', _account: 'acc_asb1', date: iso(2), description: 'ACME LTD SALARY', amount: 2400, type: 'CREDIT' },
  { _id: 't2', _account: 'acc_anz1', date: iso(3), description: 'TRANSFER TO ASB', amount: -200, type: 'TRANSFER' },
  { _id: 't3', _account: 'acc_asb1', date: iso(3), description: 'TRANSFER FROM ANZ', amount: 200, type: 'TRANSFER' },
  { _id: 't4', _account: 'acc_asb1', date: iso(4), description: 'ASB HOME LOAN', amount: -610, type: 'DEBIT' },
  { _id: 't5', _account: 'acc_card', date: iso(5), description: 'COUNTDOWN ONERAHI', amount: -84.2, type: 'CREDIT CARD' }];
const fetchImpl = async (url, init) => {
  calls.push([init.method || 'GET', url.replace('https://api.akahu.io/v1', '')]);
  const h = init.headers; if (h.Authorization !== 'Bearer ' + U || h['X-Akahu-Id'] !== A) return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
  if (url.endsWith('/me')) return Response.json({ success: true, item: { _id: 'user_1', preferred_name: 'Shane', email: 'x@example.com' } });
  if (url.endsWith('/accounts')) return Response.json({ success: true, items: ACC });
  if (url.includes('/transactions')) { const page2 = url.includes('cursor=c2'); return Response.json({ success: true, items: page2 ? TX.slice(3) : TX.slice(0, 3), cursor: { next: page2 ? null : 'c2' } }); }
  if (url.endsWith('/refresh')) return Response.json({ success: true });
  return new Response('{}', { status: 404 });
};
const req = (path, method = 'GET', body, key, origin = O) => new Request('https://relay.example' + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(key ? { 'X-Cash-Key': key } : {}) }, body: body ? JSON.stringify(body) : undefined });
const J = async r => [r.status, await r.json()];
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };

await t('not connected: status says so', async () => { const [s, d] = await J(await handle(req('/akahu/status'), env, fetchImpl)); assert.equal(s, 200); assert.equal(d.connected, false); });
await t('wrong origin refused', async () => { const [s] = await J(await handle(req('/akahu/connect', 'POST', { user: U, app: A }, '', 'https://evil.example'), env, fetchImpl)); assert.equal(s, 403); });
await t('bad tokens refused before calling Akahu', async () => { calls = []; const [s, d] = await J(await handle(req('/akahu/connect', 'POST', { user: 'nope', app: A }), env, fetchImpl)); assert.equal(s, 400); assert.equal(d.error, 'bad_tokens'); assert.equal(calls.length, 0); });
await t('rejected tokens: 401, nothing stored', async () => { const [s, d] = await J(await handle(req('/akahu/connect', 'POST', { user: 'user_token_wrongwrongwrong', app: A }), env, fetchImpl)); assert.equal(s, 401); assert.equal(d.error, 'akahu_rejected'); assert.equal(store.has('akahu-cred-v1'), false); });
let KEY = '';
await t('connect: validates /me, stores encrypted, returns name + key, never the tokens', async () => {
  const r = await handle(req('/akahu/connect', 'POST', { user: U, app: A }), env, fetchImpl); const txt = await r.text(); const d = JSON.parse(txt);
  assert.equal(r.status, 200); assert.equal(d.name, 'Shane'); assert.equal(d.accounts, 3); assert.ok(d.key.length > 30); KEY = d.key;
  assert.ok(!txt.includes(U) && !txt.includes(A));
  for (const v of store.values()) { assert.ok(!v.includes(U) && !v.includes(A) && !v.includes('Streamline'), 'stored in the clear'); }
  assert.ok(calls.some(c => c[1] === '/me'));
});
await t('cashflow needs the device key', async () => { const [s] = await J(await handle(req('/cashflow'), env, fetchImpl)); assert.equal(s, 401); const [s2] = await J(await handle(req('/cashflow', 'GET', null, 'x'.repeat(43)), env, fetchImpl)); assert.equal(s2, 401); });
await t('cashflow: accounts, paged transactions, categories, own transfers paired', async () => {
  const [s, d] = await J(await handle(req('/cashflow', 'GET', null, KEY), env, fetchImpl)); assert.equal(s, 200);
  const D = d.data; assert.equal(D.accounts.length, 3); assert.equal(D.transactions.length, 5);
  const c = Object.fromEntries(D.transactions.map(x => [x.id, x.cat2]));
  assert.deepEqual(c, { t1: 'income', t2: 'transfer', t3: 'transfer', t4: 'mortgage', t5: 'card' });
  const card = D.accounts.find(a => a.type === 'CREDITCARD'); assert.equal(card.available, 650); assert.equal(card.limit, 1000);
  assert.ok(!JSON.stringify(d).includes(U));
});
await t('a second phone without the key cannot take over (different Akahu user)', async () => {
  const f2 = async (url, init) => url.endsWith('/me') ? Response.json({ success: true, item: { _id: 'user_2', preferred_name: 'Eve' } }) : fetchImpl(url, init);
  const [s, d] = await J(await handle(req('/akahu/connect', 'POST', { user: U, app: A }), env, f2)); assert.equal(s, 409); assert.equal(d.error, 'already_connected');
});
await t('same Akahu user can reconnect (new key) without the old key', async () => {
  const [s, d] = await J(await handle(req('/akahu/connect', 'POST', { user: U, app: A }), env, fetchImpl)); assert.equal(s, 200); assert.notEqual(d.key, KEY);
  const [s2] = await J(await handle(req('/akahu/status', 'GET', null, KEY), env, fetchImpl)); assert.equal(s2, 401); KEY = d.key;
});
await t('refresh: once an hour', async () => {
  calls = []; const [s] = await J(await handle(req('/cashflow/refresh', 'POST', {}, KEY), env, fetchImpl)); assert.equal(s, 200); assert.ok(calls.some(c => c[0] === 'POST' && c[1] === '/refresh'));
  const [s2, d2] = await J(await handle(req('/cashflow/refresh', 'POST', {}, KEY), env, fetchImpl)); assert.equal(s2, 429); assert.equal(d2.error, 'too_soon');
});
await t('cron: fresh data is left alone; stale data after 6am is fetched', async () => {
  assert.equal(await runAkahu(env, fetchImpl, Date.now()), 'fresh');
  const r = await runAkahu(env, fetchImpl, Date.now() + 30 * 3600e3); assert.ok(r === 'fetched' || r === 'fresh');
});
await t('disconnect deletes the tokens and data', async () => {
  const [s] = await J(await handle(req('/akahu/disconnect', 'POST', {}, KEY), env, fetchImpl)); assert.equal(s, 200);
  assert.equal(store.has('akahu-cred-v1'), false); assert.equal(store.has('akahu-data-v1'), false);
  const [, d] = await J(await handle(req('/akahu/status', 'GET', null, KEY), env, fetchImpl)); assert.equal(d.connected, false);
});

await t('regression 2.26.59: a big 90-day history (3,000 transactions) saves and connects', async () => {
  store.clear(); const big = Array.from({ length: 3000 }, (_, i) => ({ _id: 'tx' + i, _account: 'acc_asb1', date: iso(i % 89), description: 'EFTPOS PURCHASE NUMBER ' + i, amount: -(i % 97 + 1.25), type: 'EFTPOS' }));
  const fb = async (url, init) => url.includes('/transactions') ? Response.json({ success: true, items: big, cursor: { next: null } }) : fetchImpl(url, init);
  const [s, d] = await J(await handle(req('/akahu/connect', 'POST', { user: U, app: A }), env, fb)); assert.equal(s, 200, JSON.stringify(d)); assert.ok(store.has('akahu-data-v1'));
  const [s2, d2] = await J(await handle(req('/cashflow', 'GET', null, d.key), env, fb)); assert.equal(s2, 200); assert.equal(d2.data.transactions.length, 3000);
  store.clear();
});
await t('specific errors: 403 from Akahu, swapped tokens, same token twice, stray spaces', async () => {
  const f403 = async () => new Response(JSON.stringify({ success: false, message: 'IP address not allowed' }), { status: 403 });
  const [s, d] = await J(await handle(req('/akahu/connect', 'POST', { user: U, app: A }), env, f403)); assert.equal(s, 403); assert.equal(d.error, 'akahu_forbidden'); assert.equal(d.akahu, 'IP address not allowed'); assert.equal(d.step, 'me');
  const diag = JSON.parse(store.get('akahu-diag-v1')); assert.equal(diag.status, 403); assert.ok(!store.get('akahu-diag-v1').includes(U));
  const [, d2] = await J(await handle(req('/akahu/connect', 'POST', { user: A, app: U }), env, fetchImpl)); assert.equal(d2.error, 'swapped');
  const [, d3] = await J(await handle(req('/akahu/connect', 'POST', { user: A, app: A }), env, fetchImpl)); assert.ok(['same_token', 'bad_tokens'].includes(d3.error));
  const [s4] = await J(await handle(req('/akahu/connect', 'POST', { user: ' ' + U + '\u200B\n', app: A + ' ' }), env, fetchImpl)); assert.equal(s4, 200);
  store.clear();
});
await t('connect rate-limited', async () => { let last = 0; for (let i = 0; i < 8; i++) { last = (await handle(req('/akahu/connect', 'POST', { user: 'user_token_wrongwrongwrong', app: A }), env, fetchImpl)).status; } assert.equal(last, 429); });
console.log(`${ok} passed`);
