// node test/shared-car-wof.test.mjs – WOF status on the shared car + one push per change (no network)
import { sharedCarRoute, cleanWofSt, wofNoteFor } from '../src/shared-todo.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const m = new Map(), env = { EVENTS_KV: { get: async (k, o) => m.has(k) ? JSON.parse(m.get(k)) : null, put: async (k, v) => m.set(k, v) } };
const KEY = 'testKey' + 'A'.repeat(32), sent = []; const np = async (e, k, msg) => { sent.push(msg); return 1; };
const base = { name: "Sarah's car", plate: 'PNU312', wof: '2026-10-16', rego: '2026-11-09' };
ok(cleanWofSt({ st: 'x' }) === null && cleanWofSt({ st: 'doing', insp: '2026-10-16', recheck: '2026-11-13', fixes: [{ t: 'Wiper blades', d: true }, { t: '' }] }).fixes.length === 1, 'status cleaned');
let r = await sharedCarRoute({ key: KEY, car: { ...base, wofSt: { st: 'due' } } }, env, 1, np); ok(r[1].car.wofSt.st === 'due' && !sent.length, 'due: no push');
const doing = { st: 'doing', insp: '2026-10-16', recheck: '2026-11-13', fixes: [{ t: 'Wiper blades', d: true }, { t: 'Tyre', d: false }] };
r = await sharedCarRoute({ key: KEY, car: { ...base, wofSt: doing } }, env, 2, np);
ok(sent.length === 1 && sent[0].title.includes('in progress') && sent[0].body === 'Recheck by Fri 13 Nov · 1 of 2 fixes done', 'in progress: one push → ' + (sent[0] || {}).body);
await sharedCarRoute({ key: KEY, car: { ...base, wofSt: { ...doing, fixes: [{ t: 'Wiper blades', d: true }, { t: 'Tyre', d: true }] } } }, env, 3, np);
ok(sent.length === 1, 'ticking a fix: no repeat push');
r = await sharedCarRoute({ key: KEY, car: { ...base, wof: '2027-11-13', wofSt: { st: 'done', passed: '2026-11-10' } } }, env, 4, np);
ok(sent.length === 2 && sent[1].title.includes('passed') && sent[1].body === 'Next due Sat 13 Nov', 'complete: one push → ' + (sent[1] || {}).body);
await sharedCarRoute({ key: KEY, car: { ...base, wof: '2027-11-13', wofSt: { st: 'done', passed: '2026-11-10' } } }, env, 5, np);
ok(sent.length === 2, 'same again: no repeat');
r = await sharedCarRoute({ key: KEY }, env, 6, np); ok(r[1].car.wofSt.st === 'done', 'Sarah reads status');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
