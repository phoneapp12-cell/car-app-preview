import { parseRoadworks, getCouncilRoadworks, resetRoadworks, ROADWORKS_URL, startWithinNextYear } from '../src/roadworks.js';
import { handle } from '../src/relay.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const row = (name, start, status, href) => `<tr><td>${href ? `<a href="${href}">${name}</a>` : name}</td><td>${start}</td><td>${status}</td></tr>`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function monthLabel(offset, now) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', year: 'numeric', month: 'numeric' }).formatToParts(new Date(now)).map(x => [x.type, x.value]));
  const idx = Number(p.year) * 12 + (Number(p.month) - 1) + offset;
  return MONTHS[((idx % 12) + 12) % 12] + ' ' + Math.floor(idx / 12);
}
const NOW = Date.parse('2026-10-02T12:00:00+13:00');
const html = `<p>This list was last updated on 21 September 2026.</p>
<table><thead><tr><th>Location and overview</th><th>Expected start</th><th>Status</th></tr></thead><tbody>
${row('Springsflat and SH 1 - new roundabout (safety and growth)', 'July 2025', 'Construction underway', 'https://www.wdc.govt.nz/Council/Projects/Springs-Flat-Roundabout')}
${row('Te Matua a Pohe Bridge renewals', 'July 2025', 'Construction underway', '')}
${row('Helena Bay - slip repair', 'February 2026', 'Design', '')}
${row('Millbrook Road - McAulleys Bridge', 'September 2026', 'Construction underway', '')}
${row('Duck Creek B3 &amp; Clotworthy - strengthening', 'October 2026', 'Construction underway', 'https://evil.example/x')}
${row('Apotu Road - pavement rehabilitation', 'October 2026', 'Procurement (physical works)', '')}
${row('Ohawini Road - causeway repairs', 'November 2026', 'Design', '')}
${row('Kokopu Block Road - pavement rehabilitation', 'October 2027', 'Design', 'https://www.wdc.govt.nz/Council/Projects/Kokopu')}
${row('Rosythe Bridge - structure component replacement', 'November 2027', 'Design', '')}
${row('Moody Avenue - new roundabout', '2026 / 2027', 'Design', '')}
${row('Cherry Road - bridge repairs', 'TBC', 'Design', '')}
${row('Whau Valley crossing - pedestrian crossing', '2 October 2026', 'Planning', '')}
${row('Already started this month - day before today', '1 October 2026', 'Planning', '')}
</tbody></table>`;
const parsed = parseRoadworks(html, NOW);
const names = parsed.projects.map(p => p.name);
ok(parsed.updated === '21 September 2026' && parsed.count === 5, 'updated date and only the next 12 months (' + parsed.count + ')');
ok(names.includes('Duck Creek B3 & Clotworthy') && names.includes('Apotu Road') && names.includes('Ohawini Road') && names.includes('Kokopu Block Road') && names.includes('Whau Valley crossing'), 'this month through twelve months, any status');
ok(parsed.projects.find(p => p.name === 'Kokopu Block Road').url.endsWith('/Kokopu') && parsed.projects.find(p => p.name === 'Kokopu Block Road').detail === 'pavement rehabilitation', 'linked project name, detail and council url');
ok(parsed.projects.find(p => p.name === 'Apotu Road').url === ROADWORKS_URL, 'unlinked project keeps the programme page');
ok(parsed.projects.find(p => p.name === 'Duck Creek B3 & Clotworthy').url === ROADWORKS_URL, 'off-site link is not used');
ok(!names.some(n => /Springsflat|Te Matua|Helena Bay|Millbrook|Rosythe|Moody|Cherry|Already started/.test(n)), 'past starts, a year-range, TBC and beyond a year are left out');
ok(startWithinNextYear('October 2026', NOW) && startWithinNextYear('October 2027', NOW) && !startWithinNextYear('September 2026', NOW) && !startWithinNextYear('November 2027', NOW) && !startWithinNextYear('2026 / 2027', NOW) && !startWithinNextYear('TBC', NOW), 'month window is current month through twelve months');
let threw = false; try { parseRoadworks('<p>no table</p>', NOW); } catch (e) { threw = e.message === 'roadworks_changed'; }
ok(threw, 'a page with no project rows is rejected');

const LIVE = Date.now();
const liveHtml = `<p>This list was last updated on 21 September 2026.</p><table><tbody>
${row('Past job - slip repair', monthLabel(-1, LIVE), 'Construction underway', '')}
${row('This month - bridge', monthLabel(0, LIVE), 'Construction underway', 'https://www.wdc.govt.nz/Council/Projects/This-Month')}
${row('Next month - road', monthLabel(1, LIVE), 'Procurement (physical works)', '')}
${row('A year out - pavement', monthLabel(12, LIVE), 'Design', '')}
${row('Too far - bridge', monthLabel(13, LIVE), 'Design', '')}
${row('Range - roundabout', '2026 / 2027', 'Design', '')}
</tbody></table>`;
resetRoadworks();
const mem = {};
const env = { EVENTS_KV: { async get() { return mem.v ? JSON.parse(mem.v) : null; }, async put(k, v) { mem.v = v; } } };
const fetchImpl = async (url) => { if (url !== ROADWORKS_URL) throw new Error('bad url ' + url); return new Response(liveHtml, { status: 200 }); };
const feed = await getCouncilRoadworks(env, fetchImpl, LIVE);
ok(feed.count === 3 && feed.projects.map(p => p.name).join('|') === 'This month|Next month|A year out' && mem.v && JSON.parse(mem.v).at === LIVE, 'fetch stores only the next year');
resetRoadworks();
let calls = 0;
const feed2 = await getCouncilRoadworks(env, async () => { calls++; throw new Error('down'); }, LIVE + 60 * 1000);
ok(calls === 0 && feed2.count === 3, 'fresh KV copy is served without fetching');
resetRoadworks();
const stale = await getCouncilRoadworks(env, async () => { throw new Error('down'); }, LIVE + 4 * 3600 * 1000);
ok(stale.count === 3, 'a failed refresh keeps the saved copy');

const O = 'https://phoneapp12-cell.github.io';
resetRoadworks();
let r = await handle(new Request('https://relay.example/roadworks', { headers: { Origin: O } }), env, fetchImpl);
ok(r.status === 200 && r.headers.get('access-control-allow-origin') === O && (await r.json()).count === 3, 'GET /roadworks from the app');
r = await handle(new Request('https://relay.example/roadworks', { headers: { Origin: 'https://evil.example' } }), env, fetchImpl);
ok(r.status === 403, 'GET /roadworks from another site refused');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
