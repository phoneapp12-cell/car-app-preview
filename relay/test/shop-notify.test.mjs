// node test/shop-notify.test.mjs – shopping push between My App and Sarah's To-do (no network)
import crypto from 'crypto';
import { sharedTodoRoute } from '../src/shared-todo.js';
import { runShop, sharedPushRoute, shopLabel, shopBody, sunHash, SHOP_KEY } from '../src/shop-notify.js';
import { SUN_KEY } from '../src/sunshine.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const kv = () => { const m = new Map(); return { m, get: async (k, o) => m.has(k) ? (o && o.type === 'json' ? JSON.parse(m.get(k)) : m.get(k)) : null, put: async (k, v) => { m.set(k, v); } }; };
const { privateKey } = await crypto.webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = await crypto.webcrypto.subtle.exportKey('jwk', privateKey);
const b64 = u => Buffer.from(u).toString('base64url');
const mkSub = async ep => { const ua = await crypto.webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']); return { endpoint: ep, keys: { p256dh: b64(new Uint8Array(await crypto.webcrypto.subtle.exportKey('raw', ua.publicKey))), auth: b64(crypto.randomBytes(16)) } }; };
const env = { EVENTS_KV: kv(), VAPID_PRIVATE_JWK: JSON.stringify(jwk), VAPID_PUBLIC: 'x' };
const KEY = 'testKey' + 'A'.repeat(32);
const shane = await mkSub('https://fcm.googleapis.com/fcm/send/TEST-shane'), sarah = await mkSub('https://fcm.googleapis.com/fcm/send/TEST-sarah');
// Sarah's existing Sarah's To-do notification address (sunshine list), plus someone else's on another key
await env.EVENTS_KV.put(SUN_KEY, JSON.stringify({ subs: [{ id: 'sar1', k: await sunHash(KEY), endpoint: sarah.endpoint, keys: sarah.keys }, { id: 'oth', k: 'other', endpoint: 'https://fcm.googleapis.com/fcm/send/TEST-other', keys: sarah.keys }] }));
let pushes = []; const f = async (u, o) => { pushes.push(u); return new Response('', { status: 201 }); };
ok((await sharedPushRoute('/shared-push/subscribe', { key: KEY, who: 'shane', subscription: shane }, env))[1].subscribed, 'My App registers Shane');
ok((await sharedPushRoute('/shared-push/subscribe', { key: 'bad', who: 'shane', subscription: shane }, env))[0] === 403, 'bad key refused');
ok((await sharedPushRoute('/shared-push/subscribe', { key: KEY, who: 'sarah', subscription: shane }, env))[0] === 400, 'only Shane registers here');
const T0 = Date.UTC(2026, 9, 17, 5, 0);
const it = (id, title, by, extra = {}) => ({ id, title, list: 'Shopping', by, updated: T0, created: T0, ...extra });
await sharedTodoRoute({ key: KEY, items: [it('old-1', 'Eggs', 'sarah'), { id: 'home-1', title: 'Vacuum', list: 'Home', by: 'shane', updated: T0 }] }, env, T0);
ok(!Object.values((await env.EVENTS_KV.get(SHOP_KEY, { type: 'json' })) || {}).some(e => e.q && Object.keys(e.q).length), 'first ever sync (empty list): nothing announced');
// Shane adds two items, then another 20 s later (same batch); a Home to-do is ignored
await sharedTodoRoute({ key: KEY, items: [it('shn-1', 'Milk', 'shane', { brand: { brand: 'Anchor', product: 'Blue top 2L' } }), it('shn-2', 'Bread', 'shane'), { id: 'home-2', title: 'Mow', list: 'Home', by: 'shane', updated: T0 }] }, env, T0 + 1000);
await sharedTodoRoute({ key: KEY, items: [it('shn-3', 'Bananas', 'shane', { updated: T0 + 20000 })] }, env, T0 + 20000);
let r = await runShop(env, f, T0 + 30000); ok(r.sent === 0 && pushes.length === 0, 'waits about a minute to batch');
r = await runShop(env, f, T0 + 62000); ok(r.sent === 1 && pushes.length === 1 && pushes[0].endsWith('TEST-sarah'), 'one push, to Sarah only (not Shane, not the other key)');
r = await runShop(env, f, T0 + 125000); ok(r.sent === 0, 'batch sent once');
// Sarah adds; Shane gets it; her self-heal re-send of the same id doesn't announce again
pushes = [];
await sharedTodoRoute({ key: KEY, items: [it('sar-1', 'Butter', 'sarah', { updated: T0 + 200000 })] }, env, T0 + 200000);
r = await runShop(env, f, T0 + 270000); ok(r.sent === 1 && pushes[0].endsWith('TEST-shane'), 'Sarah adds -> push to Shane');
await sharedTodoRoute({ key: KEY, items: [{ id: 'sar-1', deleted: true, updated: T0 + 300000 }] }, env, T0 + 300000);
pushes = [];
await sharedTodoRoute({ key: KEY, items: [it('sar-1', 'Butter', 'sarah', { updated: T0 + 400000 })] }, env, T0 + 400000);
r = await runShop(env, f, T0 + 470000); ok(r.sent === 0 && !pushes.length, 'same item again: not announced twice');
// ticked / done items and edits are not "added"
await sharedTodoRoute({ key: KEY, items: [it('shn-1', 'Milk', 'shane', { done: true, updated: T0 + 500000 })] }, env, T0 + 500000);
r = await runShop(env, f, T0 + 570000); ok(r.sent === 0, 'tick: no push');
// labels
ok(shopLabel({ title: 'Milk', brand: { brand: 'Anchor' } }) === 'Milk (Anchor)' && shopLabel({ title: 'Anchor milk', brand: { brand: 'Anchor' } }) === 'Anchor milk' && shopLabel({ title: 'Milk', brand: { any: true } }) === 'Milk', 'brand shown when chosen');
ok(shopBody(['a', 'b']) === 'a, b' && shopBody('abcdefgh'.split('')) === 'a, b, c, d, e and 3 more', 'long batches shortened');
// gone address is dropped (Shane)
const f410 = async () => new Response('', { status: 410 });
await sharedTodoRoute({ key: KEY, items: [it('sar-2', 'Cheese', 'sarah', { updated: T0 + 600000 })] }, env, T0 + 600000);
await runShop(env, f410, T0 + 670000);
ok(!(await sharedPushRoute('/shared-push/status', { key: KEY, who: 'shane', endpoint: shane.endpoint }, env))[1].subscribed, 'expired address removed');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
