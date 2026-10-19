import assert from 'node:assert/strict';
import { bankPushes, cleanBankPref, payeeOf, acctName } from '../src/bank-notify.js';
const A = [{ id: 'a1', name: 'BOARD', bank: 'Kiwibank', type: 'CHECKING' }, { id: 'a2', name: 'Visa Rewards', bank: 'ASB', type: 'CREDITCARD' }];
const now = Date.parse('2026-10-19T00:30:00Z'); // 1:30pm NZ
const old = { accounts: A, transactions: [{ id: 't0', acct: 'a1', amount: 10, date: '2026-10-18T00:00:00Z' }] };
const nu = { accounts: A, transactions: old.transactions.concat([
  { id: 't1', acct: 'a1', amount: 571.45, date: '2026-10-19T00:00:00Z', desc: 'L H JENKINS 12-3456-7890123-00', merchant: '' },
  { id: 't2', acct: 'a2', amount: -64.2, date: '2026-10-19T00:00:00Z', desc: 'COUNTDOWN', merchant: 'Countdown' },
  { id: 't3', acct: 'a2', amount: -164.2, date: '2026-10-19T00:00:00Z', desc: 'BUNNINGS 4412 **** 1234', merchant: '' },
  { id: 't4', acct: 'a1', amount: -500, date: '2026-10-19T00:00:00Z', cat2: 'transfer', pair: 'x' }]) };
const P = bankPushes(old, nu, {}, now);
assert.equal(P.length, 2, JSON.stringify(P));
assert.match(P[0].title, /\$571\.45 in · Kiwibank BOARD/); assert.equal(P[0].body, 'from L H Jenkins');
assert.match(P[1].title, /\$164\.20 out · ASB credit card/); assert.ok(!/\d{4}/.test(P[1].body), P[1].body);
assert.equal(bankPushes(null, nu, {}, now).length, 0, 'first run: nothing');
assert.equal(bankPushes(old, nu, {}, Date.parse('2026-10-19T10:00:00Z')).length, 0, '11pm NZ quiet');
assert.equal(bankPushes(old, nu, { off: ['a1'] }, now).length, 1);
assert.equal(bankPushes(old, nu, { outOver: 50 }, now).length, 3);
const many = { accounts: A, transactions: old.transactions.concat(Array.from({ length: 7 }, (_, i) => ({ id: 'm' + i, acct: 'a1', amount: 5 + i, date: '2026-10-19T00:00:00Z', desc: 'X' }))) };
const M = bankPushes(old, many, {}, now); assert.equal(M.length, 1); assert.match(M[0].title, /7 new bank transactions/);
assert.equal(cleanBankPref({ outOver: 'x' }).outOver, 100);
assert.equal(acctName(A[1]), 'ASB credit card'); assert.equal(payeeOf({ desc: 'PAK N SAVE 1234 5678' }), 'Pak N Save');
console.log('bank-notify ok');
