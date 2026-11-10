import assert from 'node:assert/strict';
import { buildRenoCountdownMsg, TOTAL_MAIN_JOBS } from '../src/reno.js';

assert.equal(TOTAL_MAIN_JOBS, 77, '9 inside rooms × 8 jobs (including Doors) + 5 outside');

const today = '2026-11-10';
const deadline = '2026-11-17';
const done = (n, doing = 0) => {
  const items = [{ id: 'project', deadline, updated: 1 }, { id: 'phones', updated: 1 }, { id: 'a-main', floor: 'carpet', updated: 1 }];
  for (let i = 0; i < n; i++) items.push({ id: 'job-' + i, status: 'done', updated: 1 });
  for (let i = 0; i < doing; i++) items.push({ id: 'doing-' + i, status: 'doing', updated: 1 });
  return buildRenoCountdownMsg(items, today);
};

let m = done(55);
assert.equal(m.days, 7);
assert.equal(m.doneCount, 55);
assert.equal(m.pct, 71); // 55/77
assert.match(m.title, /7 days left/);
assert.match(m.body, /Currently 71% done \(55 jobs ticked off\)/);
assert.match(m.smsText, /Currently 71% done/);
assert.match(m.fmtDl, /Tue.*17.*Nov.*2026/);

m = done(55, 2);
assert.equal(m.pct, 73); // (55 + 1) / 77

m = done(0);
assert.equal(m.pct, 0);

m = done(77);
assert.equal(m.pct, 100);

// area metadata and the project/phones rows are not jobs
m = buildRenoCountdownMsg([
  { id: 'project', deadline, status: 'done', updated: 1 },
  { id: 'phones', status: 'done', updated: 1 },
  { id: 'a-main', status: 'done', updated: 1 },
  { id: 'main-doors', status: 'done', updated: 1 }
], today);
assert.equal(m.doneCount, 1);
assert.equal(m.pct, 1); // 1/77 rounds to 1

console.log('reno ok');
