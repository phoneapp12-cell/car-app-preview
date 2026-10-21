import assert from 'node:assert/strict';
import { parse2d, netMerge, netReminders, nzLocalIso, netCurrent } from '../src/outages.js';
import { cleanReminder } from '../src/push.js';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const L = [
  { type: 'Unplanned', status: 'In Progress', startTime: '2026-11-01T10:00:00', endTime: null, description: 'Fault', location: 'Northland, Onerahi', categories: ['Mobile'], geoLocation: { latitude: -35.77, longitude: 174.36 } },
  { type: 'Planned', status: 'Scheduled', startTime: '2026-11-02T22:00:00', endTime: '2026-11-03T06:00:00', description: 'Upgrade', location: 'Northland', categories: ['Mobile'], geoLocation: { latitude: -36.1, longitude: 174.39 } },
  { type: 'Planned', status: 'Scheduled', startTime: '2026-11-02T08:00:00', endTime: '2026-11-05T16:00:00', description: 'x', location: 'Auckland, Morningside', categories: ['Mobile'], geoLocation: { latitude: -36.87, longitude: 174.73 } },
  { type: 'Unplanned', status: 'Resolved', startTime: '2026-11-01T08:00:00', location: 'Kamo', categories: ['Broadband'], geoLocation: { latitude: -35.68, longitude: 174.3 } }];
const d = parse2d(L);
ok(d.length === 3 && !d.some(o => /Auckland/.test(o.area)), 'Northland only (text or within 30 km)');
ok(d[0].type === 'Mobile' && d[0].kind === 'unplanned' && d[0].status === 'Under repair' && d[0].start === '2026-11-01T10:00:00+13:00', 'fields and NZ time');
ok(d[2].done && d[2].type === 'Internet', 'resolved broadband');
ok(nzLocalIso('2026-07-01T09:00:00') === '2026-07-01T09:00:00+12:00', 'winter offset');
const now = Date.parse('2026-11-01T11:00:00+13:00');
const net = netMerge([{ id: 'F1', area: 'Onerahi', suburbs: ['Onerahi'], status: 'Investigating', start: '2026-11-01T10:30:00+13:00', cause: 'Fibre cut' }], d, [{ id: 'npfOLD', prov: 'Northpower Fibre', done: false }], now);
ok(net.find(o => o.id === 'npfF1').onerahi && net.find(o => o.id === 'npfOLD').status === 'Restored', 'fibre item + restored');
ok(netCurrent(net.find(o => o.id === 'npfF1'), now) && !netCurrent(d[1], now), 'current test');
const rem = netReminders({ net }, now);
ok(rem.filter(r => r.id.startsWith('out-n-')).length === 2 && rem.every(r => cleanReminder(r, now)), 'unplanned pushes for current ones only, ids accepted');
console.log(`net outages: ${n} checks passed`);
{ // 2.27.42: planned work pushes
  const at = Date.parse('2026-10-22T07:55:00+13:00'), net = [
    { id: 'd2a', prov: '2degrees', type: 'Mobile', kind: 'planned', area: 'Northland', start: '2026-10-22T22:00:00+13:00', end: '2026-10-23T06:00:00+13:00' },
    { id: 'd2b', prov: '2degrees', type: 'Internet', kind: 'planned', area: 'Northland, Kamo', start: '2026-10-24T09:00:00+13:00', end: '2026-10-24T12:00:00+13:00' },
    { id: 'd2c', prov: '2degrees', type: 'Mobile', kind: 'planned', area: 'Northland', start: '2026-10-25T00:00:00+13:00', end: '2026-10-25T06:00:00+13:00' }];
  const r = netReminders({ net }, at), by = k => r.filter(x => x.id.includes(k));
  let m = 0; const ok2 = (c, s) => { assert.ok(c, s); m++; };
  ok2(by('d2a').length === 1 && by('d2a')[0].date === '2026-10-22' && by('d2a')[0].time === '18:00' && /tonight/.test(by('d2a')[0].title), 'evening start: 6pm same day only (7am passed)');
  ok2(by('d2b').length === 2 && by('d2b').some(x => x.date === '2026-10-23' && x.time === '18:00') && by('d2b').some(x => x.date === '2026-10-24' && x.time === '07:00'), 'daytime: 6pm before + 7am on the day');
  ok2(by('d2c').length === 1 && by('d2c')[0].date === '2026-10-24', 'early start: evening before only');
  ok2(r.every(x => x.id.startsWith('out-p') && cleanReminder(x, at)), 'out- ids accepted');
  console.log(`planned net pushes: ${m} checks passed`);
}
