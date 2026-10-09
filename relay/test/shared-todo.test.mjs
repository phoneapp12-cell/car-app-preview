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
