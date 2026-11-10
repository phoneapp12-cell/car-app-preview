import assert from 'node:assert/strict';
import { cardLeft, cardStep, cleanSnap, cardCycle, leftMsg, fmtDay } from '../src/card-notify.js';
const now = Date.parse('2026-11-10T07:00:00Z'); // Tue 10 Nov 8pm NZ
assert.deepEqual(cardCycle('2026-11-10', 1, 25), { stmt: '2026-11-01', due: '2026-11-26' });
assert.equal(fmtDay('2026-11-26'), 'Thu 26 Nov');
const D = { accounts: [{ id: 'c', type: 'CREDITCARD', limit: 1000, available: 300 }], transactions: [
  { id: 'a', acct: 'c', date: '2026-10-20T00:00:00Z', amount: -50 },
  { id: 'b', acct: 'c', date: '2026-11-04T00:00:00Z', amount: 200 },
  { id: 'd', acct: 'c', date: '2026-11-06T00:00:00Z', amount: -40 }] };
const snap = cleanSnap({ stmt: '2026-11-01', due: '2026-11-26', goal: 885.7, sb: true, stmtDay: 1, gap: 25, pend: [{ d: '2026-11-10', a: 50, at: '2026-11-10T06:00:00Z' }] });
let r = cardLeft(D, snap, now);
assert.equal(r.left, 635.7); assert.equal(r.paid, 250); assert.equal(r.days, 16);
// self-computed statement: owed now 700, +200 payment back, -40 charge undone => 860
r = cardLeft(D, cleanSnap({ stmtDay: 1, gap: 25 }), now); assert.equal(r.goal, 860); assert.equal(r.left, 660); assert.ok(r.about);
// steps
const st = {}; r = cardLeft(D, snap, now);
let m = cardStep(st, r, 'app'); assert.match(m.title, /\$635\.70 left to pay in full/); assert.match(m.body, /by Thu 26 Nov \(16 days\) to avoid interest/);
assert.equal(cardStep(st, r, 'bank'), null);
const D2 = JSON.parse(JSON.stringify(D)); D2.transactions.push({ id: 'e', acct: 'c', date: '2026-11-11T00:00:00Z', amount: 100 });
m = cardStep(st, cardLeft(D2, snap, now), 'bank'); assert.match(m.title, /\$585\.70/); assert.match(m.body, /^Payment in/);
const D3 = JSON.parse(JSON.stringify(D2)); D3.transactions.push({ id: 'f', acct: 'c', date: '2026-11-12T00:00:00Z', amount: 600 });
m = cardStep(st, cardLeft(D3, snap, now), 'bank'); assert.match(m.title, /paid in full/);
assert.equal(cardStep(st, cardLeft(D3, snap, now), 'bank'), null);
// after due date, before next statement: waiting, nothing
assert.equal(cardStep(st, cardLeft(D3, snap, Date.parse('2026-11-28T00:00:00Z')), 'bank'), null);
// wednesday plan line
const w = leftMsg({ left: 500, paid: 300, goal: 800, due: '2026-11-26', days: 15, T: '2026-11-11' }, 'wed', cleanSnap({ weeks: [{ d: '2026-11-11', a: 200, cum: 400 }] }));
assert.match(w.body, /This week: pay \$100\.00/);
console.log('card-notify ok');
