import { handle } from '../src/relay.js';
import { applyPayload, publicDays, nz } from '../src/health.js';
import assert from 'node:assert/strict';
const O = 'https://phoneapp12-cell.github.io';
const store = new Map();
const kv = { get: async k => store.has(k) ? store.get(k) : null, put: async (k, v) => { store.set(k, v); }, delete: async k => { store.delete(k); }, list: async () => ({ keys: [] }) };
const env = { EVENTS_KV: kv, ALLOWED_ORIGIN: O, AKAHU_ENC_KEY: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64') };
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };
const sha = async s => Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))).toString('base64');
const APPKEY = 'device-key-test-123';
store.set('akahu-cred-v1', 'x'); // unreadable bank cred: health must still work through its own key
const req = (path, method = 'GET', body, headers = {}) => new Request('https://relay.example' + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
const J = async r => [r.status, await r.json()];

await t('nz(): Auckland date and minute', async () => { const z = nz(Date.parse('2026-10-17T11:00:00Z')); assert.equal(z.date, '2026-10-18'); assert.equal(z.min, 0); });
await t('token needs the app origin and a device key', async () => {
  let [s] = await J(await handle(req('/health/token', 'POST', {}, { 'X-Cash-Key': APPKEY }), env)); assert.equal(s, 403);
  [s] = await J(await handle(req('/health/token', 'POST', {}, { Origin: O }), env)); assert.equal(s, 401);
  [s] = await J(await handle(req('/health/token', 'POST', {}, { Origin: O, 'X-Cash-Key': APPKEY }), env)); assert.equal(s, 401); // no cred yet, key unknown
});
let TOK = '';
await t('token: made with a valid key, only hashes stored', async () => {
  store.set('health-cred-v1', JSON.stringify({ tokHash: 'none', appKeyHash: await sha(APPKEY), created: '' }));
  const [s, d] = await J(await handle(req('/health/token', 'POST', {}, { Origin: O, 'X-Cash-Key': APPKEY }), env));
  assert.equal(s, 200); assert.match(d.token, /^hw_[A-Za-z0-9_-]{30,}$/); assert.equal(d.url, 'https://relay.example/health/in'); TOK = d.token;
  assert.ok(!store.get('health-cred-v1').includes(TOK));
});
await t('webhook: wrong code refused', async () => { const [s] = await J(await handle(req('/health/in', 'POST', { steps: [] }, { Authorization: 'Bearer hw_nope' }), env)); assert.equal(s, 401); });
const P = {
  timestamp: '2026-10-18T03:00:00Z', app_version: '1.9.22',
  steps: [{ count: 4200, start_time: '2026-10-16T13:00:00Z', end_time: '2026-10-17T11:00:00Z' }, // partial day 17 Oct (48h window)
    { count: 8100, start_time: '2026-10-17T11:00:00Z', end_time: '2026-10-18T03:00:00Z' }], // 18 Oct from midnight
  sleep: [{ session_end_time: '2026-10-17T18:30:00Z', duration_seconds: 8 * 3600, metadata: { id: 'sl1' }, stages: [
    { stage: '4', start_time: '2026-10-17T10:30:00Z', end_time: '2026-10-17T14:30:00Z', duration_seconds: 4 * 3600 },
    { stage: '5', start_time: '2026-10-17T14:30:00Z', end_time: '2026-10-17T16:30:00Z', duration_seconds: 2 * 3600 },
    { stage: '6', start_time: '2026-10-17T16:30:00Z', end_time: '2026-10-17T18:00:00Z', duration_seconds: 5400 },
    { stage: '1', start_time: '2026-10-17T18:00:00Z', end_time: '2026-10-17T18:30:00Z', duration_seconds: 1800 }] }],
  heart_rate: Array.from({ length: 60 }, (_, i) => ({ time: new Date(Date.parse('2026-10-17T14:00:00Z') + i * 60000).toISOString(), avg: 55 + (i % 5), min: 52, max: 61 + (i === 10 ? 40 : 0), bpm: 55 })),
};
await t('webhook: payload stored as daily summaries', async () => {
  const [s, d] = await J(await handle(req('/health/in', 'POST', P, { Authorization: 'Bearer ' + TOK }), env));
  assert.equal(s, 200); assert.deepEqual(d.types.sort(), ['heart_rate', 'sleep', 'steps']);
  assert.ok(!store.get('health-data-v1').includes('4200')); // encrypted
});
await t('webhook: ?token= also works; a resend does not double', async () => {
  const [s] = await J(await handle(req('/health/in?token=' + TOK, 'POST', P), env)); assert.equal(s, 200);
});
await t('daily: steps, sleep stages, heart rate', async () => {
  const [s, d] = await J(await handle(req('/health/daily?days=400', 'GET', null, { Origin: O, 'X-Cash-Key': APPKEY }), env));
  assert.equal(s, 200); assert.equal(d.connected, true); assert.ok(d.lastAt);
  const by = Object.fromEntries(d.list.map(x => [x.date, x]));
  assert.equal(by['2026-10-18'].steps, 8100); assert.equal(by['2026-10-17'].steps, 4200);
  const sl = by['2026-10-18'].sleep; assert.equal(sl.bed, 480); assert.equal(sl.mins, 450); assert.deepEqual(sl.stages, { light: 240, deep: 120, rem: 90, awake: 30 });
  const hr = by['2026-10-18'].hr; assert.equal(hr.min, 52); assert.equal(hr.max, 101); assert.equal(hr.avg, 57); assert.equal(hr.restEst, true); assert.ok(hr.rest >= 56 && hr.rest <= 58);
});
await t('resting heart rate from the watch wins over the estimate', async () => {
  await handle(req('/health/in', 'POST', { resting_heart_rate: [{ bpm: 51, time: '2026-10-17T20:00:00Z' }] }, { Authorization: 'Bearer ' + TOK }), env);
  const [, d] = await J(await handle(req('/health/daily?days=400', 'GET', null, { Origin: O, 'X-Cash-Key': APPKEY }), env));
  const hr = d.list.find(x => x.date === '2026-10-18').hr; assert.equal(hr.rest, 51); assert.equal(hr.restEst, false);
});
await t('later full-day total replaces; partial never lowers', () => {
  const D = { days: {}, sess: {}, hrB: {}, stB: {} };
  applyPayload(D, { steps: [{ count: 900, start_time: '2026-10-17T11:00:00Z', end_time: '2026-10-17T20:00:00Z' }] }, Date.parse('2026-10-18T03:00:00Z'));
  applyPayload(D, { steps: [{ count: 300, start_time: '2026-10-17T15:00:00Z', end_time: '2026-10-18T03:00:00Z' }] }, Date.parse('2026-10-18T03:00:00Z'));
  assert.equal(D.days['2026-10-18'].steps, 900);
  applyPayload(D, { steps: [{ count: 1500, start_time: '2026-10-17T11:00:00Z', end_time: '2026-10-18T03:00:00Z' }] }, Date.parse('2026-10-18T03:00:00Z'));
  assert.equal(D.days['2026-10-18'].steps, 1500);
});
await t('short step buckets add up by start time (resend replaces)', () => {
  const D = { days: {}, sess: {}, hrB: {}, stB: {} }, b = (c, h) => ({ count: c, start_time: `2026-10-17T${h}:00:00Z`, end_time: `2026-10-17T${h}:59:00Z` });
  applyPayload(D, { steps: [b(100, 20), b(200, 21)] }, Date.parse('2026-10-18T03:00:00Z'));
  applyPayload(D, { steps: [b(250, 21)] }, Date.parse('2026-10-18T03:00:00Z'));
  assert.equal(D.days['2026-10-18'].steps, 350);
});
await t('deleted sleep record is removed', async () => {
  await handle(req('/health/in', 'POST', { deleted: [{ type: 'sleep', id: 'sl1' }] }, { Authorization: 'Bearer ' + TOK }), env);
  const [, d] = await J(await handle(req('/health/daily?days=400', 'GET', null, { Origin: O, 'X-Cash-Key': APPKEY }), env));
  assert.ok(!d.list.find(x => x.date === '2026-10-18').sleep);
});
await t('old days are dropped after ~400 days', () => {
  const D = { days: { '2025-01-01': { steps: 5 } }, sess: {}, hrB: {}, stB: {} }; applyPayload(D, {}, Date.parse('2026-10-18T03:00:00Z')); assert.ok(!D.days['2025-01-01']);
  assert.equal(publicDays({ days: { '2026-10-18': { steps: 1 } } }, 7, Date.parse('2026-10-18T03:00:00Z')).length, 1);
});
await t('regenerate: old code stops working', async () => {
  const [, d] = await J(await handle(req('/health/token', 'POST', {}, { Origin: O, 'X-Cash-Key': APPKEY }), env));
  let [s] = await J(await handle(req('/health/in', 'POST', {}, { Authorization: 'Bearer ' + TOK }), env)); assert.equal(s, 401);
  [s] = await J(await handle(req('/health/in', 'POST', {}, { Authorization: 'Bearer ' + d.token }), env)); assert.equal(s, 200);
});
await t('revoke deletes the code and the data', async () => {
  const [s] = await J(await handle(req('/health/revoke', 'POST', {}, { Origin: O, 'X-Cash-Key': APPKEY }), env)); assert.equal(s, 200);
  assert.ok(!store.has('health-cred-v1') && !store.has('health-data-v1'));
});
console.log(ok + ' health tests passed');
