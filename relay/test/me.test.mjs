// 2.27.47: /me returns Shane's private profile only to My App's device key, and seals a seeded plain copy
import { handle } from '../src/relay.js';
import { sha } from '../src/akahu.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const O = 'https://shane-my-app.pages.dev', APPKEY = 'test-device-key-0123456789abcdef';
const store = new Map(); const kv = { async get(k) { return store.has(k) ? store.get(k) : null; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); } };
const raw = new Uint8Array(32).fill(3); const AK = btoa(String.fromCharCode(...raw));
const env = { EVENTS_KV: kv, ALLOWED_ORIGIN: 'https://phoneapp12-cell.github.io', EXTRA_ORIGINS: O, AKAHU_ENC_KEY: AK };
store.set('health-cred-v1', JSON.stringify({ tokHash: 'none', appKeyHash: await sha(APPKEY), created: '' }));
store.set('me-plain-v1', JSON.stringify({ v: 1, profile: 'test profile', facts: ['a'] }));
const get = (h) => handle(new Request('https://relay.example/me', { headers: { Origin: O, ...h } }), env);
let r = await get({}); ok(r.status === 401, 'no device key: refused');
r = await handle(new Request('https://relay.example/me', { headers: { Origin: 'https://evil.example', 'X-Cash-Key': APPKEY } }), env); ok(r.status === 403, 'other site refused');
r = await get({ 'X-Cash-Key': APPKEY }); const j = await r.json(); ok(r.status === 200 && j.me.profile === 'test profile', 'device key gets the profile');
ok(!store.has('me-plain-v1') && store.has('me-v1') && !store.get('me-v1').includes('test profile'), 'plain copy sealed and removed');
r = await get({ 'X-Cash-Key': APPKEY }); ok(r.status === 200 && (await r.json()).me.facts[0] === 'a', 'sealed copy reads back');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
