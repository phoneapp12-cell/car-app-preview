import { parseRoadworks, getCouncilRoadworks, resetRoadworks, ROADWORKS_URL } from '../src/roadworks.js';
import { handle } from '../src/relay.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const row = (name, start, status, href) => `<tr><td>${href ? `<a href="${href}">${name}</a>` : name}</td><td>${start}</td><td>${status}</td></tr>`;
const html = `<p>This list was last updated on 21 September 2026.</p>
<table><thead><tr><th>Location and overview</th><th>Expected start</th><th>Status</th></tr></thead><tbody>
${row('Springsflat and SH 1 - new roundabout (safety and growth)', 'July 2025', 'Construction underway', 'https://www.wdc.govt.nz/Council/Projects/Springs-Flat-Roundabout')}
${row('Te Matua a Pohe Bridge renewals', 'July 2025', 'Construction underway', '')}
${row('Helena Bay - slip repair', 'February 2026', 'Design', '')}
${row('Duck Creek B3 &amp; Clotworthy', 'October 2026', 'Construction underway', 'https://evil.example/x')}
</tbody></table>`;
const parsed = parseRoadworks(html);
ok(parsed.updated === '21 September 2026' && parsed.count === 3, 'updated date and only construction underway');
ok(parsed.projects[0].name === 'Springsflat and SH 1' && parsed.projects[0].detail === 'new roundabout (safety and growth)' && parsed.projects[0].url.endsWith('/Springs-Flat-Roundabout'), 'linked project name, detail and council url');
ok(parsed.projects[1].name === 'Te Matua a Pohe Bridge renewals' && parsed.projects[1].url === ROADWORKS_URL, 'unlinked project keeps the programme page');
ok(parsed.projects[2].name === 'Duck Creek B3 & Clotworthy' && parsed.projects[2].url === ROADWORKS_URL, 'off-site link is not used');
ok(!parsed.projects.some(p => /Helena Bay/.test(p.name)), 'design-only project left out');
let threw = false; try { parseRoadworks('<p>no table</p>'); } catch (e) { threw = e.message === 'roadworks_changed'; }
ok(threw, 'a page with no project rows is rejected');

resetRoadworks();
const mem = {};
const env = { EVENTS_KV: { async get() { return mem.v ? JSON.parse(mem.v) : null; }, async put(k, v) { mem.v = v; } } };
const fetchImpl = async (url) => { if (url !== ROADWORKS_URL) throw new Error('bad url ' + url); return new Response(html, { status: 200 }); };
const feed = await getCouncilRoadworks(env, fetchImpl, 1000);
ok(feed.count === 3 && mem.v && JSON.parse(mem.v).at === 1000, 'fetch stores the feed');
resetRoadworks();
let calls = 0;
const feed2 = await getCouncilRoadworks(env, async () => { calls++; throw new Error('down'); }, 1000 + 60 * 1000);
ok(calls === 0 && feed2.count === 3, 'fresh KV copy is served without fetching');
resetRoadworks();
const stale = await getCouncilRoadworks(env, async () => { throw new Error('down'); }, 1000 + 4 * 3600 * 1000);
ok(stale.count === 3, 'a failed refresh keeps the saved copy');

const O = 'https://phoneapp12-cell.github.io';
resetRoadworks();
let r = await handle(new Request('https://relay.example/roadworks', { headers: { Origin: O } }), env, fetchImpl);
ok(r.status === 200 && r.headers.get('access-control-allow-origin') === O && (await r.json()).count === 3, 'GET /roadworks from the app');
r = await handle(new Request('https://relay.example/roadworks', { headers: { Origin: 'https://evil.example' } }), env, fetchImpl);
ok(r.status === 403, 'GET /roadworks from another site refused');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
