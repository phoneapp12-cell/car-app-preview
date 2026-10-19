import assert from 'node:assert/strict';
import { applyPayload, publicDays, stepPick, nzStart } from '../src/health.js';
const blank = () => ({ v: 2, days: {}, sess: {}, hrB: {}, stB: {}, stR: {}, org: [], lastAt: '', lastTypes: [], posts: 0 });
const HS = 'nl.appyhapps.healthsync', GF = 'com.google.android.apps.fitness';
const now = Date.parse('2026-10-19T09:00:00Z'); // 10pm NZDT Mon 19 Oct
const day0 = nzStart('2026-10-19');
assert.equal(new Date(day0).toISOString(), '2026-10-18T11:00:00.000Z');
const rec = (o, minFrom, mins, c, id) => ({ count: c, start_time: new Date(day0 + minFrom * 60e3).toISOString(), end_time: new Date(day0 + (minFrom + mins) * 60e3).toISOString(), metadata: { data_origin: o, id: id || o + minFrom } });
// watch 10,098 via Health Sync in 15-minute chunks, phone 5,418 overlapping
const watch = [], phone = []; let w = 0, ph = 0;
for (let i = 0; i < 48; i++) { const c = i < 47 ? 210 : 10098 - 210 * 47; watch.push(rec(HS, 420 + i * 15, 15, c)); w += c; }
for (let i = 0; i < 43; i++) { const c = i < 42 ? 126 : 5418 - 126 * 42; phone.push(rec(GF, 425 + i * 15, 10, c)); ph += c; }
assert.equal(w, 10098); assert.equal(ph, 5418);
{ // (a) two apps: use Health Sync, never the sum
  const D = blank(); applyPayload(D, { steps: watch.concat(phone) }, now);
  assert.equal(D.days['2026-10-19'].steps, 10098);
  const p = publicDays(D, 7, now).find(x => x.date === '2026-10-19');
  assert.equal(p.stSrc.how, 'origin'); assert.equal(p.stSrc.used, HS); assert.deepEqual(p.stSrc.by, { [HS]: 10098, [GF]: 5418 });
}
{ // (b) repeated pushes with overlapping/cumulative records replace, not add
  const D = blank();
  applyPayload(D, { steps: watch.slice(0, 30).concat(phone.slice(0, 20)) }, now - 3 * 3600e3);
  applyPayload(D, { steps: watch.slice(20).concat(phone.slice(10)) }, now - 3600e3);
  applyPayload(D, { steps: watch.concat(phone) }, now);
  assert.equal(D.days['2026-10-19'].steps, 10098);
  // an edited record (same id/time) replaces
  applyPayload(D, { steps: [Object.assign({}, watch[0], { count: 310 })] }, now);
  assert.equal(D.days['2026-10-19'].steps, 10198);
}
{ // no Huawei app: highest app per hour, not the sum
  const D = blank(); const A = 'com.a', B = 'com.b';
  applyPayload(D, { steps: [rec(A, 600, 30, 1000), rec(B, 610, 20, 700), rec(B, 700, 30, 500)] }, now);
  assert.equal(D.days['2026-10-19'].steps, 1500); assert.equal(D.days['2026-10-19'].stSrc.how, 'max');
}
{ // (c) NZ day bucketing: a record across NZ midnight is split; 11:30pm UTC-day steps land on the NZ day
  const D = blank();
  applyPayload(D, { steps: [{ count: 600, start_time: new Date(day0 - 30 * 60e3).toISOString(), end_time: new Date(day0 + 30 * 60e3).toISOString(), metadata: { data_origin: HS } },
    { count: 100, start_time: '2026-10-19T08:30:00Z', end_time: '2026-10-19T08:40:00Z', metadata: { data_origin: HS } }] }, now);
  assert.equal(D.days['2026-10-18'].steps, 300); assert.equal(D.days['2026-10-19'].steps, 400);
}
{ // old store (summed) is rebuilt once the phone resends the whole day; until then the old figure stays, marked
  const D = { v: 1, days: { '2026-10-19': { steps: 15516 } }, sess: {}, hrB: {}, stB: { '2026-10-19': { 1: 15516 } }, lastAt: '', lastTypes: [], posts: 3 };
  applyPayload(D, { steps: [watch[47], phone[42]] }, now); // incremental push: only new records
  assert.equal(D.days['2026-10-19'].steps, 15516); assert.equal(publicDays(D, 7, now).find(x => x.date === '2026-10-19').stSrc.how, 'rebuild');
  applyPayload(D, { steps: watch.concat(phone) }, now + 60e3); // manual sync with a time range
  assert.equal(D.days['2026-10-19'].steps, 10098); assert.equal(D.days['2026-10-19'].stSrc.how, 'origin');
  // a new day after the upgrade is right straight away
  applyPayload(D, { steps: [{ count: 50, start_time: '2026-10-19T19:00:00Z', end_time: '2026-10-19T19:10:00Z', metadata: { data_origin: HS } }] }, now + 12 * 3600e3);
  assert.equal(D.days['2026-10-20'].steps, 50);
}
{ // Daily resolution (Health Connect's own de-duplicated total) still replaces the day
  const D = blank(); applyPayload(D, { steps: [{ count: 10098, start_time: new Date(day0).toISOString(), end_time: new Date(now).toISOString() }] }, now);
  applyPayload(D, { steps: [{ count: 10098, start_time: new Date(day0).toISOString(), end_time: new Date(now).toISOString() }] }, now);
  assert.equal(D.days['2026-10-19'].steps, 10098); assert.equal(D.days['2026-10-19'].stSrc.how, 'daily');
}
{ // sleep: same night from two apps counts once; Health Sync wins
  const D = blank(); const end = '2026-10-19T19:00:00Z';
  applyPayload(D, { sleep: [{ start_time: '2026-10-19T11:00:00Z', session_end_time: end, duration_seconds: 8 * 3600, metadata: { data_origin: GF, id: 'g1' } },
    { start_time: '2026-10-19T11:30:00Z', session_end_time: end, duration_seconds: 7.5 * 3600, metadata: { data_origin: HS, id: 'h1' } }] }, now);
  const sl = D.days['2026-10-20'].sleep; assert.equal(sl.parts, 1); assert.equal(sl.bed, 450); assert.equal(sl.total, 450);
}
{ // heart rate: the watch's minute isn't overwritten by another app
  const D = blank(); const tm = '2026-10-19T08:00:00Z';
  applyPayload(D, { heart_rate: [{ time: tm, avg: 70, min: 68, max: 72, metadata: { data_origin: HS } }] }, now);
  applyPayload(D, { heart_rate: [{ time: tm, avg: 95, min: 95, max: 95, metadata: { data_origin: GF } }] }, now);
  assert.equal(D.days['2026-10-19'].hr.avg, 70);
  applyPayload(D, { resting_heart_rate: [{ time: tm, bpm: 58, metadata: { data_origin: HS } }, { time: tm, bpm: 66, metadata: { data_origin: GF } }] }, now);
  assert.equal(D.days['2026-10-19'].hr.rest, 58);
}
console.log('health dedupe tests passed');
