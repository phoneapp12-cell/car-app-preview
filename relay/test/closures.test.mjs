// node test/closures.test.mjs – bridge closure notices: parsing, robots.txt, KV steps, /closures route (no network)
import { parseClosureList, parseClosurePage, robotsRules, allowed, step, toClosures, getClosures, resetClosures, scheduledClosures, nzStamp, CLOSURES_URL } from '../src/closures.js';
import { handle } from '../src/relay.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const O = 'https://phoneapp12-cell.github.io';
const NOW = Date.parse('2026-09-25T22:00:00Z'); // 10 am Sat 26 Sep NZ
const B = CLOSURES_URL + '/';
const li = (slug, title, desc, addr) => `<div class="list-item-container homepage-hide "><article><a href="${slug.startsWith('http') ? slug : B + slug}" ><h2 class="list-item-title">${title}</h2>
<p class="clearfix"><span class="list-item-block-desc">${desc}</span></p><p class="list-item-address">${addr}</p></a></article></div>`;
const page = (n, total, items) => `<html><form name="mainForm" method="post" id="mainForm"><input type="hidden" name="__SEAMLESSVIEWSTATE" value="v" />
<div class="list-container events-list-container left">${items.join('')}</div>
<div class="seamless-pagination-controls"><div>Page <select name="ctl10$ctl00$ctl07"><option value="1">1</option></select><input type="submit" name="ctl10$ctl00$ctl08" value="Go" /></div></div>
<div class="seamless-pagination-info right" role="status">Page ${n} of ${total}</div></form>
<div class="item"><div class="title">VHF channel change</div><div class="description">Bridge Control for the Te Matau a Pohe bridge…</div></div></html>`;
const dateLi = (s, e, sh, sm, eh, em) => { const [a, b, c] = s.split('-'), [d, f, g] = e.split('-'); return `<li class="multi-date-item" data-start-year='${a}' data-start-month='${b}' data-start-day='${c}' data-end-year='${d}' data-end-month='${f}' data-end-day='${g}' data-start-hour='${sh}' data-start-mins='${sm}' data-end-hour='${eh}' data-end-mins='${em}'>x</li>`; };
const multi = `<html><h1 class='oc-page-title '>Rally road closures</h1><h2 class="sub-title">Dates and Locations</h2>
<div class="multi-location-item"><h3>Pohe Island Road,&nbsp;Whangārei&nbsp;0117</h3><p class="view-map-link"><a href="x">View Map</a></p><p>Pohe Island Road, for the SERVICE PARK.</p><h4 class="sub-title">When</h4><div class="multi-date-list-container"><ul class="multi-date-list future-events-list">${dateLi('2026-09-23', '2026-09-27', '08', '00', '20', '00')}</ul></div></div>
<div class="multi-location-item"><h3>Dave Culham Drive,&nbsp;Whangārei&nbsp;0110</h3><p class="view-map-link"><a href="x">View Map</a></p><p>Dave Culham Drive, from Port Road to Riverside Drive, including Te Matau a Pohe bridge, for Special Stage 9.</p><h4 class="sub-title">When</h4><div class="multi-date-list-container"><ul class="multi-date-list future-events-list">${dateLi('2026-09-26', '2026-09-26', '14', '00', '22', '00')}</ul></div></div>
<div class="multi-location-item"><h3>Ruarangi Road</h3><p>Ruarangi Road, for Special Stage 11.</p><h4>When</h4><div class="multi-date-list-container"><ul class="multi-date-list">${dateLi('2026-09-27', '2026-09-27', '06', '00', '14', '00')}</ul></div></div>
<div class="item"><div class="description">Te Matau a Pohe VHF notice in the page footer</div></div></html>`;
const single = (title, body, centre, dates) => `<html><h1 class='oc-page-title '>${title}</h1><p class="event-date">Event date: x</p><p>${body}</p><div class="clearfix"></div>
<h2 class="sub-title">When</h2><div class="multi-date-list-container"><ul class="multi-date-list">${dates.map(d => dateLi(...d)).join('')}</ul></div>
<h2 class="sub-title">Location</h2><p>Somewhere,&nbsp;Whangārei,&nbsp;<a href="x">View Map</a></p><div class="gmap rs_skip" data-params='{"zoom" : 14, "centerPoint" : "${centre}"}'></div>
<div class="item"><div class="description">Te Matau a Pohe VHF notice</div></div></html>`;

// parsing
let r = parseClosureList(page(1, 2, [li('Rally-20260923', 'Rally closures', 'Various roads', 'Multiple locations'), li('https://evil.example/x', 'Evil', 'x', 'y'), li('Bank-Street', 'Bank Street closure', 'Night works', 'Bank Street, Whangārei')]));
ok(r.items.length === 2 && r.page === 1 && r.pages === 2 && r.items[0].url === B + 'Rally-20260923', 'list parsed; links elsewhere dropped');
let e = parseClosurePage(multi, { title: 'Rally closures' });
ok(e.length === 1 && e[0].where === 'Dave Culham Drive, Whangārei 0110' && /Te Matau a Pohe bridge/.test(e[0].desc), 'multi-location notice: only the Dave Culham Drive part kept (not Pohe Island Road, not the footer notice)');
ok(e[0].dates.length === 1 && e[0].dates[0].start === '2026-09-26' && e[0].dates[0].time === '14:00' && e[0].dates[0].endTime === '22:00', 'its date and times');
ok(parseClosurePage(single('Bank Street closure', 'Night works on Bank Street.', '-35.7252, 174.3194', [['2026-09-27', '2026-09-28', '18', '00', '05', '30']]), { title: 'Bank Street closure' }).length === 0, 'unrelated single notice (1.9 km away, no mention) ignored, even with a bridge notice in the page footer');
e = parseClosurePage(single('Port Road resurfacing', 'Lane closures near the harbour.', '-35.7352, 174.3360', [['2026-10-03', '2026-10-03', '19', '00', '23', '00']]), { title: 'Port Road resurfacing' });
ok(e.length === 1 && e[0].dates[0].time === '19:00', 'single notice mapped within 400 m of the bridge kept');
ok(parseClosurePage(single('Hātea works', 'Te Matau ā Pohe will be closed to all traffic for maintenance.', '-35.70, 174.30', [['2026-10-10', '2026-10-10', '20', '00', '23', '30']]), {}).length === 1, 'notice that names Te Matau ā Pohe kept');
// robots
const rules = robotsRules('User-agent: *\nDisallow: /After5\nDisallow: /Services/Roads-and-Transportation/Roads/Roadworks-and-closures/Anzac-Day-closures-20260425/Cameron-Street-Anzac\nDisallow: /Services/Roads-and-Transportation/Roads/Roadworks-and-closures/*/Hidden\nDisallow: /Services/Building/X\n');
ok(rules.length === 2, 'robots: only rules that can apply to the closures pages kept (' + rules.length + ')');
ok(!allowed(B + 'Anzac-Day-closures-20260425/Cameron-Street-Anzac', rules) && !allowed(B + 'Foo/Hidden', rules) && allowed(B + 'Rally-20260923', rules), 'robots: disallowed pages skipped, others allowed');
ok(!allowed(B + 'x', robotsRules('Disallow: /Services')), 'robots: a broad Disallow covers the list too');
// steps with a fake site
const site = {
  [CLOSURES_URL]: page(1, 2, [li('Rally-20260923', 'Rally closures', 'Various roads', 'Multiple locations'), li('Bank-Street', 'Bank Street closure', 'Night works', 'Bank Street, Whangārei')]),
  POST: page(2, 2, [li('Bridge-maintenance', 'Te Matau a Pohe bridge maintenance', 'Overnight closure', 'Dave Culham Drive'), li('Secret/Hidden', 'Hidden', 'x', 'y')]),
  [B + 'Rally-20260923']: multi,
  [B + 'Bank-Street']: single('Bank Street closure', 'Night works on Bank Street.', '-35.7252, 174.3194', [['2026-09-27', '2026-09-28', '18', '00', '05', '30']]),
  [B + 'Bridge-maintenance']: single('Te Matau a Pohe bridge maintenance', 'The bridge will be closed overnight.', '-35.73498, 174.33534', [['2026-09-20', '2026-09-20', '20', '00', '23', '00'], ['2026-10-02', '2026-10-02', '20', '00', '23', '00']]),
  'https://www.wdc.govt.nz/robots.txt': 'User-agent: *\nDisallow: /Services/Roads-and-Transportation/Roads/Roadworks-and-closures/Secret\n'
};
const calls = []; let down = false;
const fake = async (url, opts = {}) => {
  calls.push((opts.method || 'GET') + ' ' + url);
  if (down) return new Response('no', { status: 503 });
  const body = opts.method === 'POST' ? site.POST : site[url];
  if (body == null) return new Response('nf', { status: 404 });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/html' } });
};
let { state, changed } = await step(null, fake, NOW);
ok(changed && state.list.length === 4 && Object.keys(state.pages).length === 0 && calls.filter(c => /Roadworks-and-closures\/./.test(c)).length === 0, 'first cron step: robots + list (2 pages) only');
calls.length = 0; ({ state } = await step(state, fake, NOW + 60000));
ok(calls.length === 3 && state.pages[B + 'Secret/Hidden'].skipped && !calls.some(c => c.includes('Secret')), 'next step: notice pages, skipping the one robots.txt disallows (' + calls.length + ' fetches)');
let feed = toClosures(state, NOW);
ok(feed.count === 2 && feed.closures[1].title === 'Te Matau a Pohe bridge maintenance' && feed.closures[1].dates.length === 1 && feed.closures[1].dates[0].start === '2026-10-02', 'feed: bridge maintenance (finished date dropped) …');
ok(feed.closures[0].where === 'Dave Culham Drive, Whangārei 0110' && feed.closures[0].url === B + 'Rally-20260923', '… and the rally’s Dave Culham Drive closure first (sooner), linked to the notice');
ok(toClosures(state, Date.parse('2026-09-26T10:30:00Z')).count === 1, 'after 10:30 pm Sat 26 Sep the rally closure is gone');
ok(nzStamp(Date.parse('2026-09-26T01:05:00Z')) === '2026-09-26T13:05', 'NZ time stamp');
// route
const mem = {}; const env = { ALLOWED_ORIGIN: O, EVENTS_KV: { get: async (k) => mem[k] ? JSON.parse(mem[k]) : null, put: async (k, v) => { mem[k] = v; } } };
resetClosures(); calls.length = 0;
let res = await handle(new Request('https://relay.example/closures', { headers: { Origin: O } }), env, fake);
let body = await res.json();
ok(res.status === 200 && res.headers.get('Access-Control-Allow-Origin') === O && body.closures.length >= 1 && mem['wdc-closures-v1'], 'GET /closures builds everything when nothing is saved, and saves it to KV');
res = await handle(new Request('https://relay.example/closures', { headers: { Origin: 'https://evil.example' } }), env, fake);
ok(res.status === 403, 'other sites refused');
res = await handle(new Request('https://relay.example/closures', { method: 'POST', headers: { Origin: O } }), env, fake);
ok(res.status === 405, 'POST refused');
res = await handle(new Request('https://relay.example/closures?url=https://evil.example', { headers: { Origin: O } }), env, fake);
ok(res.status === 200 && !calls.some(c => c.includes('evil')), 'query string ignored');
resetClosures(); down = true; for (const k in mem) delete mem[k];
res = await handle(new Request('https://relay.example/closures', { headers: { Origin: O } }), env, fake);
ok(res.status === 502 && (await res.json()).error === 'closures_unavailable', 'council site down and nothing saved: 502 closures_unavailable');
down = false; mem['wdc-closures-v1'] = JSON.stringify(state);
ok(await scheduledClosures(env, fake, NOW + 4 * 3600 * 1000) === true && JSON.parse(mem['wdc-closures-v1']).listAt === NOW + 4 * 3600 * 1000, 'cron re-reads the list after 3 hours');
down = true; const before = mem['wdc-closures-v1'];
await scheduledClosures(env, fake, NOW + 8 * 3600 * 1000);
ok(JSON.parse(mem['wdc-closures-v1']).list.length === 4, 'cron failure keeps the saved notices');
ok(!/console\.log/.test((await import('fs')).readFileSync(new URL('../src/closures.js', import.meta.url), 'utf8')), 'no logging in closures.js');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
