import assert from 'node:assert/strict';
import { handle } from '../src/relay.js';
import { mergeItems } from '../src/shared-todo.js';
const store = new Map();
const env = { ALLOWED_ORIGIN: 'https://phoneapp12-cell.github.io', EVENTS_KV: { get: async (k, o) => store.has(k) ? JSON.parse(store.get(k)) : null, put: async (k, v) => { store.set(k, v); } } };
const KEY = 'abcdefghijklmnopqrstuvwxyz0123456789ABCD';
const call = (body, origin = 'https://phoneapp12-cell.github.io') => handle(new Request('https://x/shared-todo', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env).then(async r => [r.status, await r.json()]);
let [s, d] = await call({ key: KEY }); assert.equal(s, 200); assert.deepEqual(d.items, []);
[s] = await call({ key: 'short' }); assert.equal(s, 403);
[s] = await call({ key: KEY }, 'https://evil.example'); assert.equal(s, 403);
const t = Date.now();
[s, d] = await call({ key: KEY, items: [{ id: 'st-aaaa1', title: 'Buy milk', updated: t, by: 'sarah' }] }); assert.equal(d.items.length, 1); assert.equal(d.rev, 1);
// older update loses, newer wins
[s, d] = await call({ key: KEY, items: [{ id: 'st-aaaa1', title: 'Old', updated: t - 10 }] }); assert.equal(d.items[0].title, 'Buy milk'); assert.equal(d.rev, 1);
[s, d] = await call({ key: KEY, items: [{ id: 'st-aaaa1', title: 'Buy milk', done: true, updated: t + 10 }] }); assert.equal(d.items[0].done, true); assert.equal(d.rev, 2);
// same item resent: no write, no duplicate
[s, d] = await call({ key: KEY, items: [{ id: 'st-aaaa1', title: 'Buy milk', done: true, updated: t + 10 }] }); assert.equal(d.rev, 2); assert.equal(d.items.length, 1);
[s, d] = await call({ key: KEY, items: [{ id: 'st-aaaa1', deleted: true, updated: t + 20 }] }); assert.equal(d.items[0].deleted, true);
assert.equal(mergeItems([], [{ id: 'x', title: 'y', updated: 1 }]).items.length, 0); // bad id
console.log('shared-todo tests ok');

import { cleanItem as ci2 } from '../src/shared-todo.js';
import assert2 from 'node:assert/strict';
import test2 from 'node:test';
test2('brand travels on an item and is cleaned', () => {
  const x = ci2({ id: 'abcd1', title: 'Lemon juice', list: 'Shopping', updated: 5, brand: { brand: 'Pams', product: 'Lemon Baking Juice', size: '250ml', price: '2.39', store: 'New World Onerahi', at: '2026-10-12', evil: 1 } }, 10);
  assert2.equal(x.brand.brand, 'Pams'); assert2.equal(x.brand.price, 2.39); assert2.equal(x.brand.evil, undefined);
  assert2.equal(ci2({ id: 'abcd2', title: 'Milk', updated: 5, brand: { price: 3 } }, 10).brand, undefined);
  assert2.equal(ci2({ id: 'abcd3', title: 'Milk', updated: 5, brand: { any: true } }, 10).brand.any, true);
});

import { cleanItem as ci3, cleanCar, sharedCarRoute } from '../src/shared-todo.js';
test2('appointment details ride only on Appointments items; car is cleaned and stored', async () => {
  const a = ci3({ id: 'appt1', title: 'Dentist', list: 'Appointments', due: '2026-10-20', updated: 5, appt: { type: 'dentist', time: '09:30', place: 'Onerahi Dental', x: 1 } }, 10);
  assert2.deepEqual(a.appt, { type: 'dentist', time: '09:30', place: 'Onerahi Dental' });
  assert2.equal(ci3({ id: 'appt2', title: 'Milk', list: 'Shopping', updated: 5, appt: { type: 'dentist' } }, 10).appt, undefined);
  assert2.equal(cleanCar({ plate: 'pnu312', wof: '2026-10-16', rego: 'bad', svcKm: '45,000' }).plate, 'PNU312');
  assert2.equal(cleanCar({ plate: 'pnu312', rego: 'bad' }).rego, '');
  const kv = new Map(), env = { EVENTS_KV: { get: async k => kv.has(k) ? JSON.parse(kv.get(k)) : null, put: async (k, v) => kv.set(k, v) } };
  const key = 'k'.repeat(40);
  assert2.equal((await sharedCarRoute({ key }, env))[1].car, null);
  await sharedCarRoute({ key, car: { plate: 'PNU312', wof: '2026-10-16' } }, env);
  assert2.equal((await sharedCarRoute({ key }, env))[1].car.wof, '2026-10-16');
});

import { cleanItem as ci4, sharedPhotoRoute } from '../src/shared-todo.js';
test2('claims ride on appointments; photos store and read back', async () => {
  const a = ci4({ id: 'appt9', title: 'GP', list: 'Appointments', due: '2026-10-10', updated: 5, claim: { status: 'draft', amount: '$45.5', photos: [{ id: 'ph-abc123', up: 1 }, { id: 'bad id!' }], evil: 1 } }, 10);
  assert2.equal(a.claim.amount, '45.50'); assert2.equal(a.claim.photos.length, 1); assert2.equal(a.claim.evil, undefined);
  const kv = new Map(), env = { EVENTS_KV: { get: async k => kv.get(k) || null, put: async (k, v) => kv.set(k, v) } };
  const key = 'k'.repeat(40);
  assert2.equal((await sharedPhotoRoute({ key, id: 'ph-abc123', data: 'javascript:x' }, env))[0], 400);
  assert2.equal((await sharedPhotoRoute({ key, id: 'ph-abc123', data: 'data:image/jpeg;base64,AAAA' }, env))[0], 200);
  assert2.equal((await sharedPhotoRoute({ key, id: 'ph-abc123' }, env))[1].data, 'data:image/jpeg;base64,AAAA');
  assert2.equal((await sharedPhotoRoute({ key: 'z'.repeat(40), id: 'ph-abc123' }, env))[0], 404);
});
