// 2.27.37: series links pick matching episodes, skip passed ones, no duplicates; tv- ids pass the reminder check.
import assert from 'node:assert/strict';
import { seriesReminders, tvNorm, cleanLinks } from '../src/tv.js';
import { cleanReminder } from '../src/push.js';
const now = Date.UTC(2026, 9, 21, 8, 0); // 9pm NZDT
const s1 = now / 1000 + 3600, s0 = now / 1000 + 300;
const days = [{ d: '2026-10-21', ch: { 'mjh-tvnz-1': [[s0, s0 + 1800, 'Shortland Street', 'Soap', ''], [s1, s1 + 1800, 'Shortland Street (New)', 'Soap', ''], [s1, s1 + 1800, 'Rugby Live', 'Sport', '']], 'mjh-three': [[s1, s1 + 1800, 'Shortland Street', '', '']] } }];
assert.equal(tvNorm('Shortland Street (New)'), 'shortland street');
let r = seriesReminders(cleanLinks([{ t: 'Shortland Street', ch: 'mjh-tvnz-1' }]), days, { 'mjh-tvnz-1': 'TVNZ 1' }, now);
assert.equal(r.length, 1); assert.match(r[0].title, /^📺 Starting in 10 min: Shortland Street \(New\) on TVNZ 1 at 10:00/);
assert.equal(r[0].time, '21:50');
r = seriesReminders(cleanLinks([{ t: 'Shortland Street', ch: '*' }]), days.concat(days), {}, now);
assert.equal(r.length, 2);
assert.equal(seriesReminders(cleanLinks([{ t: 'Rugby Live', ch: '*' }]), days, {}, now).length, 0);
assert.ok(cleanReminder(r[0], now));
console.log('tv series: 7 checks passed');
