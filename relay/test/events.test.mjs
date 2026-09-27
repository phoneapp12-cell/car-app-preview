// node test/events.test.mjs – events parsing, paging, KV state, /events and /weather routes (no network)
import { parseList, parseDetail, refresh, toFeed, nzToday, addDaysISO, getFeed, resetMemory, scheduled, WDC_LIST } from '../src/events.js';
import { handle, resetWeather, WEATHER_URL } from '../src/relay.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const O = 'https://phoneapp12-cell.github.io';
const NOW = Date.parse('2026-09-27T00:00:00Z'); // 1 pm, 27 Sep in NZ
// The sample events are fixed dates around 27 Sep 2026, so the relay's own clock (Date.now) is pinned there too;
// otherwise the /events checks start failing once those dates are in the past.
{ const t0 = performance.now(); Date.now = () => NOW + Math.round(performance.now() - t0); }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const item = (slug, title, iso, cats = ['Kids &amp; family', 'Sport'], addr = 'Forum North,&nbsp;Whangārei&nbsp;0110') => {
  const [y, m, d] = iso.split('-');
  return `<div class="list-item-container homepage-show "><article><a href="https://www.wdc.govt.nz/Events/Whats-On/${slug}" ><h2 class="list-item-title">${title}</h2>
  <p class="clearfix"><span class="list-item-block-date"><span class="part-date">${d}</span>
<span class="part-month">${MON[+m - 1]}</span>
<span class="part-year">${y}</span></span><span class="list-item-block-desc">
  A short description of ${title} &amp; more.
  </span></p><p class="list-item-address">${addr}</p>
  <p class="tagged-as-list"><span class='label'>Category:&nbsp;&nbsp;</span><span class="text">${cats.map(c => `<span class="separator">,&nbsp;</span>${c}`).join('')}</span></p></a></article></div>`;
};
const page = (n, total, items) => `<html><form name="mainForm" method="post" action="/Events/Whats-On" id="mainForm">
<input type="hidden" name="__EVENTTARGET" id="__EVENTTARGET" value="" /><input type="hidden" name="__SEAMLESSVIEWSTATE" id="__SEAMLESSVIEWSTATE" value="abc&amp;def" />
<div class="list-container events-list-container left">${items.join('')}</div>
<div class="seamless-pagination left"><div class="seamless-pagination-controls"><div class="seamless-pagination-data">Page <select name="ctl10$ctl00$ctl07"><option value="1">1</option></select><input type="submit" name="ctl10$ctl00$ctl08" value="Go" title="Change page" /></div></div></div>
<div class="seamless-pagination-info right" role="status">Page ${n} of ${total}</div></form></html>`;
const detail = (dates, venue = 'Capitaine Bougainville Theatre, Forum North, 7 Rust Avenue,&nbsp;Whangārei,&nbsp;0110,&nbsp;', cost = '$25') => `<html><h1 class='oc-page-title '>X</h1>
<h2 class="sub-title">When</h2><div class="multi-date-list-container"><ul class="multi-date-list future-events-list">${dates.map(([s, e, sh, sm, eh, em]) => { const [a, b, c] = s.split('-'), [d, f, g] = e.split('-'); return `<li class="multi-date-item" data-start-year='${a}' data-start-month='${b}' data-start-day='${c}' data-end-year='${d}' data-end-month='${f}' data-end-day='${g}' data-start-hour='${sh}' data-start-mins='${sm}' data-end-hour='${eh}' data-end-mins='${em}'>x</li>`; }).join('')}</ul></div>
<h2 class="sub-title">Location</h2><p>${venue}<a href="https://maps.google.com?q=x" target="_blank">View Map</a></p>
<div class="side-box-section"><h3 class="side-box-cost">Cost</h3><p class="side-box-cost">${cost}</p></div></html>`;

// ---- parsing
const p1 = page(1, 2, [item('Rally-20260925', 'International Rally of Whangārei', '2026-09-27'), item('Show-20260930', 'The Tempestuous', '2026-09-30', ['Live shows, music and performance'])]);
const p2 = page(2, 2, [item('Market-20261018', 'Crafts Market', '2026-10-18', ['Markets']), item('Far-20270417', 'Far away event', '2027-04-17'), item('Evil', 'Evil', '2026-10-01').replace('https://www.wdc.govt.nz/Events/Whats-On/Evil', 'https://evil.example/x')]);
let r = parseList(p1);
ok(r.items.length === 2 && r.page === 1 && r.pages === 2, 'list page parsed (2 items, page 1 of 2)');
ok(r.items[0].title === 'International Rally of Whangārei' && r.items[0].date === '2026-09-27' && r.items[0].url === 'https://www.wdc.govt.nz/Events/Whats-On/Rally-20260925', 'title, date and link');
ok(r.items[0].desc === 'A short description of International Rally of Whangārei & more.' && r.items[0].venue === 'Forum North, Whangārei 0110', 'description and venue decoded');
ok(JSON.stringify(r.items[0].cats) === '["Kids & family","Sport"]' && JSON.stringify(r.items[1].cats) === '["Live shows, music and performance"]', 'categories split on the separators only');
ok(parseList(p2).items.length === 2, 'links to other sites are dropped');
const d = parseDetail(detail([['2026-09-30', '2026-09-30', '18', '30', '20', '00'], ['2026-10-01', '2026-10-01', '00', '00', '00', '00']]));
ok(d.dates.length === 2 && d.dates[0].time === '18:30' && d.dates[0].endTime === '20:00' && d.dates[1].time === '' && d.venue === 'Capitaine Bougainville Theatre, Forum North, 7 Rust Avenue, Whangārei, 0110' && d.cost === '$25', 'event page: times, all-day, venue, cost');
ok(nzToday(NOW) === '2026-09-27' && nzToday(Date.parse('2026-09-27T11:30:00Z')) === '2026-09-28' && addDaysISO('2026-12-31', 1) === '2027-01-01', 'NZ date helpers');

// ---- fetching: page 1 by GET, page 2 with the page form
const calls = [];
const routes = {
  [WDC_LIST]: (o) => { if (o.method === 'POST') { const b = new URLSearchParams(o.body); calls.push('POST ' + b.get('ctl10$ctl00$ctl07') + ' ' + b.get('__SEAMLESSVIEWSTATE')); return p2; } calls.push('GET list'); return p1; },
  'https://www.wdc.govt.nz/Events/Whats-On/Rally-20260925': () => detail([['2026-09-25', '2026-09-25', '16', '00', '18', '00'], ['2026-09-27', '2026-09-27', '07', '00', '17', '00']], 'Whangārei'),
  'https://www.wdc.govt.nz/Events/Whats-On/Show-20260930': () => detail([['2026-09-30', '2026-09-30', '18', '30', '20', '00']]),
  'https://www.wdc.govt.nz/Events/Whats-On/Market-20261018': () => { throw new Error('boom'); }
};
const fake = async (url, o = {}) => {
  const f = routes[url]; if (!f) return new Response('nope', { status: 404 });
  if (!/DueDatesApp/.test(o.headers['User-Agent']) || !o.headers['Accept-Language']) return new Response('no', { status: 403 });
  calls.push(url.replace('https://www.wdc.govt.nz/Events/Whats-On/', ''));
  return new Response(f(o), { status: 200 });
};
let st = await refresh({}, fake, NOW);
ok(st.list.length === 4 && calls.filter(c => c === WDC_LIST).length === 2 && calls.includes('GET list') && calls.includes('POST 2 abc&def') && calls.length === 4, 'first run reads the list only (page 2 via the form, with the page state)');
ok(Object.keys(st.details).length === 0 && st.changed, 'no event pages on the list run');
calls.length = 0;
st = await refresh(st, fake, NOW + 60000);
ok(Object.keys(st.details).length === 3 && calls.length === 3, 'next run reads event pages in the 60-day window only (3), not the April one');
ok(st.details['https://www.wdc.govt.nz/Events/Whats-On/Market-20261018'].failed === true, 'a failing event page is marked and retried later');
calls.length = 0; st.changed = false;
st = await refresh(st, fake, NOW + 120000);
ok(calls.length === 0 && !st.changed, 'nothing to do on the next run (no extra requests)');
let feed = toFeed(st, NOW);
ok(feed.count === 3 && feed.events.map(e => e.title).join('|') === 'International Rally of Whangārei|The Tempestuous|Crafts Market', 'feed: 3 events in the next 60 days, in date order (past dates and April dropped)');
const rally = feed.events[0];
ok(rally.date === '2026-09-27' && rally.time === '07:00' && rally.endTime === '17:00' && rally.timeKnown && rally.venue === 'Whangārei', 'feed uses exact times from the event page');
ok(feed.events[2].time === '' && feed.events[2].timeKnown === false && feed.events[2].date === '2026-10-18', 'without an event page: list date, time unknown');
ok(feed.source.url === WDC_LIST && /Whangārei District Council/.test(feed.source.name) && feed.updated, 'feed names and links the source');
ok(new Set(feed.events.map(e => e.id)).size === feed.events.length, 'event ids are unique');

// ---- KV + routes
const store = {};
const kv = { get: async (k, o) => store[k] ? (o && o.type === 'json' ? JSON.parse(store[k]) : store[k]) : null, put: async (k, v) => { store[k] = v; } };
const env = { EVENTS_KV: kv };
calls.length = 0;
ok(await scheduled(env, fake, NOW) === true && JSON.parse(store['wdc-events-v1']).list.length === 4, 'cron run saves the list to KV');
await scheduled(env, fake, NOW + 60000);
ok(Object.keys(JSON.parse(store['wdc-events-v1']).details).length === 3, 'second cron run adds event times');
calls.length = 0;
ok(await scheduled(env, fake, NOW + 120000) === false && calls.length === 0, 'idle cron run: no requests and no KV write');
resetMemory();
const get = (path, origin = O) => new Request('https://relay.example' + path, { method: 'GET', headers: origin ? { Origin: origin } : {} });
r = await handle(get('/events'), env, fake);
let body = await r.json();
ok(r.status === 200 && r.headers.get('access-control-allow-origin') === O && body.events.length >= 3, 'GET /events from the app: 200 with CORS');
r = await handle(get('/events', 'https://evil.example'), env, fake);
ok(r.status === 403 && !r.headers.get('access-control-allow-origin'), 'GET /events from another site refused');
r = await handle(new Request('https://relay.example/events', { method: 'POST', headers: { Origin: O }, body: '{}' }), env, fake);
ok(r.status === 405, 'POST /events refused');
resetMemory();
r = await handle(get('/events'), {}, async () => new Response('down', { status: 503 }));
ok(r.status === 502 && (await r.json()).error === 'events_unavailable', 'council site down and nothing stored: 502 events_unavailable');
r = await handle(new Request('https://relay.example/events', { method: 'OPTIONS', headers: { Origin: O, 'Access-Control-Request-Method': 'GET' } }), env, fake);
ok(r.status === 204 && /GET/.test(r.headers.get('access-control-allow-methods')), 'preflight allows GET');

// weather fallback
let wcalls = 0;
const WX = { current: { temperature_2m: 17.1, weather_code: 1 }, daily: { time: ['2026-09-27'], temperature_2m_max: [18], temperature_2m_min: [10] } };
const wf = async (url) => { wcalls++; if (url !== WEATHER_URL) throw new Error('wrong url'); return new Response(JSON.stringify(WX), { status: 200 }); };
resetWeather();
r = await handle(get('/weather'), env, wf);
ok(r.status === 200 && (await r.json()).current.temperature_2m === 17.1 && wcalls === 1, 'GET /weather: Open-Meteo for Whangārei');
ok(/hourly=temperature_2m,precipitation_probability,weather_code/.test(WEATHER_URL) && /forecast_hours=48/.test(WEATHER_URL), '/weather asks for the hourly forecast too (v1.9.0 hourly strip)');
r = await handle(get('/weather'), env, wf);
ok(r.status === 200 && wcalls === 1, 'weather kept for 20 minutes (no second request)');
resetWeather(); delete store['weather-v2'];
r = await handle(get('/weather'), env, async () => new Response('{"error":true}', { status: 429 }));
ok(r.status === 502 && (await r.json()).error === 'weather_unavailable', 'Open-Meteo refusing: 502 weather_unavailable');
r = await handle(get('/weather', 'https://evil.example'), env, wf);
ok(r.status === 403, 'GET /weather from another site refused');
r = await handle(new Request('https://relay.example/weather?latitude=1', { method: 'GET', headers: { Origin: O } }), env, async (u) => { ok(u === WEATHER_URL, 'query string cannot change the weather location'); return new Response(JSON.stringify(WX)); });
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
