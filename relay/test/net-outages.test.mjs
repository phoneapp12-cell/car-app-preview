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
ok(rem.length === 2 && rem.every(r => r.id.startsWith('out-n-') && cleanReminder(r, now)), 'pushes only for current unplanned, ids accepted');
console.log(`net outages: ${n} checks passed`);
