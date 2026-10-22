import assert from 'node:assert/strict';
import { parsePage, outageReminders, isOnerahi } from '../src/outages.js';
import { cleanReminder } from '../src/push.js';
const o = (id, title, sub, road, start, end) => [{ caseNumber: id, title, outageStartDate: start, outageEndDate: end, publicStatus: ['Scheduled', { s: 'enm' }], shutdownReason: 'Network maintenance', customerCount: 9,
  location: [{ icpsBySuburb: [[[{ suburb: sub }, { s: 'arr' }]], { s: 'arr' }], icpsByRoad: [[[{ road }, { s: 'arr' }]], { s: 'arr' }], geometry: [{ big: 1 }, { s: 'arr' }] }, { s: 'arr' }] }, { s: 'arr' }];
const data = { plannedElectricityOutages: [{ '2026-11-03': [[o('1', 'Onerahi', 'Onerahi', 'Example Street', '2026-11-03T09:00:00+13:00', '2026-11-03T15:30:00+13:00'), o('2', 'Waipu', 'Waipu', 'Cove Road', '2026-11-03T09:00:00+13:00', null)], { s: 'arr' }] }, { s: 'arr' }],
  unplannedElectricityOutages: [[[{ id: 'F9', title: 'Onerahi', startDate: '2026-11-01T10:00:00+13:00', estimatedRestorationDate: '2026-11-01T12:00:00+13:00', status: 'Crew on site', location: [{ icpsBySuburb: [[[{ suburb: 'Onerahi' }, { s: 'arr' }]], { s: 'arr' }] }, { s: 'arr' }] }, { s: 'arr' }]], { s: 'arr' }] };
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const html = `<div wire:snapshot="${esc(JSON.stringify({ data, memo: {} }))}"></div>`;
const r = parsePage(html); let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
ok(r && r.planned.length === 2 && r.unplanned.length === 1, 'parsed both lists');
ok(r.planned[0].suburbs[0] === 'Onerahi' && r.planned[0].roads[0] === 'Example Street' && r.planned[0].status === 'Scheduled', 'fields');
ok(!('geometry' in (r.planned[0])) && r.unplanned[0].end === '2026-11-01T12:00:00+13:00', 'slim + restore time');
ok(isOnerahi(r.planned[0]) && !isOnerahi(r.planned[1]), 'Onerahi match');
const now = Date.parse('2026-11-01T11:00:00+13:00'), rem = outageReminders(r, 'onerahi', now);
ok(rem.length === 3, 'one unplanned + two planned pushes');
ok(rem.find(x => x.id.startsWith('out-b-')).date === '2026-11-02' && rem.find(x => x.id.startsWith('out-m-')).time === '07:00', 'day before + morning');
ok(rem.every(x => cleanReminder(x, now)), 'relay accepts out- ids');
ok(outageReminders(r, 'off', now).length === 0, 'off means no pushes');
console.log(`outages: ${n} checks passed`);
