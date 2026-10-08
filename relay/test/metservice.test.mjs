import assert from 'node:assert/strict';
import { parseCap, rssLinks, inPolygon, getMetAlerts } from '../src/metservice.js';

const cap = (area, poly, colour = 'Orange', msgType = 'Alert', expires = '2099-01-01T00:00:00+12:00') => `<?xml version="1.0"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>abc</identifier><sent>2026-10-08T10:00:00+13:00</sent><msgType>${msgType}</msgType>
<info><language>en-NZ</language><event>rain</event><severity>Moderate</severity><onset>2026-10-08T18:00:00+13:00</onset><expires>${expires}</expires>
<headline>Heavy Rain Warning - Orange</headline><description>Periods of heavy rain &amp; thunderstorms.</description><web>https://www.metservice.com/warnings/home</web>
<parameter><valueName>ColourCode</valueName><value>${colour}</value></parameter>
<area><areaDesc>${area}</areaDesc>${poly ? `<polygon>${poly}</polygon>` : ''}</area></info></alert>`;

// Box around Whangārei
const box = '-35.6,174.2 -35.6,174.5 -35.9,174.5 -35.9,174.2 -35.6,174.2';
assert.equal(inPolygon(-35.7251, 174.3237, box), true);
assert.equal(inPolygon(-41.29, 174.78, box), false);
let a = parseCap(cap('Coromandel Peninsula', box), Date.parse('2026-10-08T00:00:00Z'));
assert.equal(a.length, 1);
assert.equal(a[0].colour, 'Orange');
assert.equal(a[0].desc, 'Periods of heavy rain & thunderstorms.');
assert.equal(parseCap(cap('Northland from Kaitaia southwards', ''), 0).length, 1);
assert.equal(parseCap(cap('Wellington', '-41.2,174.7 -41.2,174.9 -41.4,174.9 -41.4,174.7 -41.2,174.7'), 0).length, 0);
assert.equal(parseCap(cap('Northland', '', 'Orange', 'Cancel'), 0).length, 0);
assert.equal(parseCap(cap('Northland', '', 'Orange', 'Alert', '2020-01-01T00:00:00+12:00'), Date.now()).length, 0);
assert.deepEqual(rssLinks('<rss><channel><item><link>https://alerts.metservice.com/cap/alert?id=1</link></item><item><link>https://evil.example/x</link></item></channel></rss>'), ['https://alerts.metservice.com/cap/alert?id=1']);

// Full fetch with a fake upstream
const fake = async url => ({ ok: true, text: async () => url.includes('/cap/rss')
  ? '<rss version="2.0"><channel><item><link>https://alerts.metservice.com/cap/alert?id=1</link></item></channel></rss>'
  : cap('Northland', box) });
const data = await getMetAlerts({}, fake, Date.parse('2026-10-08T00:00:00Z'));
assert.equal(data.count, 1);
assert.equal(data.alerts[0].headline, 'Heavy Rain Warning - Orange');
console.log('metservice tests ok');
