import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEf, nightPick } from '../src/nightlife.js';
const item = (title, pub, cdata, guid = '1') => `<item><title>${title}</title><link>https://www.eventfinda.co.nz/2026/x/whangarei?utm_medium=rss</link><description>&lt;p&gt;Desc&lt;/p&gt;</description><content:encoded><![CDATA[${cdata}]]></content:encoded><guid isPermalink="false">${guid}</guid><pubDate>${pub}</pubDate></item>`;
test('parses a gig, end time, venue, and drops cancelled / daytime / far away', () => {
  const xml = '<rss>' + item('Band Night', '2026-10-17T19:30:00', 'Saturday 17th Oct, 7.30pm &ndash; 10.00pm, The Bunker, Whangarei<br/>Whangārei', '1')
    + item('Show: CANCELLED', '2026-10-18T19:30:00', 'Sunday 18th Oct, 7.30pm, Forum North<br/>Whangārei', '2')
    + item('Matinee', '2026-10-18T14:00:00', 'Sunday 18th Oct, 2.00pm, Forum North<br/>Whangārei', '3')
    + item('Far gig', '2026-10-18T20:00:00', 'Sunday 18th Oct, 8.00pm, Powerstation<br/>Auckland', '4') + '</rss>';
  const p = parseEf(xml, 'Live music');
  assert.equal(p.length, 3);
  assert.equal(p[0].endTime, '22:00'); assert.equal(p[0].venue, 'The Bunker, Whangarei');
  const n = nightPick(p, '2026-10-12');
  assert.deepEqual(n.map(x => x.title), ['Band Night']);
  assert.deepEqual(n[0].cats, ['Nightlife', 'Live music']);
});
test('general feed keeps evening quiz nights only', () => {
  const xml = item('Quiz Night', '2026-10-16T18:30:00', 'Friday 16th Oct, 6.30pm, Onerahi Tavern<br/>Whangārei', '9') + item('Garden Talk', '2026-10-16T18:30:00', 'Friday 16th Oct, 6.30pm, Library<br/>Whangārei', '10');
  const n = nightPick(parseEf(xml, ''), '2026-10-12');
  assert.deepEqual(n.map(x => x.cats[1]), ['Quiz night']);
});
