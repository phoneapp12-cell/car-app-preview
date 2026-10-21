// Every reminder id prefix the app sends must pass the relay's check (bed- and pwr- were silently dropped before).
import assert from 'node:assert/strict';
import { cleanReminder } from '../src/push.js';
const now = Date.UTC(2026, 9, 21, 8, 0), r = id => cleanReminder({ id, title: 'x', date: '2026-10-23', time: '00:00', repeat: id === 'pwr-offpeak' || id === 'zeus-crate' ? 'daily' : 'none' }, now);
for (const id of ['rem-abcd1234', 'med-a1', 'due-d-wof', 'zeus-crate', 'sug-1', 'sug-pack-2026-10-23-0600', 'sug-gymbag-tue', 'sug-water', 'bed-2026-10-23-0', 'pwr-offpeak', 'tv-mjhtvnz1-1792569600000']) assert.ok(r(id), id);
assert.equal(r('evil-1'), null);
console.log('reminder ids: 12 checks passed');
