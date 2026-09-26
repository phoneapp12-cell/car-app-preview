import { handle, checkUrl } from '../src/relay.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const O = 'https://phoneapp12-cell.github.io';
const ICS = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n';
const mk = (routes) => async (url, opts) => {
  const r = routes[url]; if (!r) throw new Error('no route ' + url);
  if (opts.method !== 'GET' || opts.redirect !== 'manual') throw new Error('bad opts');
  return r(opts);
};
const post = (body, origin = O, path = '/fetch') => new Request('https://relay.example' + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const G = 'https://calendar.google.com/calendar/ical/x/basic.ics';
const f = mk({
  [G]: () => new Response(ICS, { status: 200 }),
  'https://outlook.live.com/owa/calendar/a/b/calendar.ics': () => new Response('', { status: 302, headers: { Location: 'https://outlook.office365.com/owa/calendar/a/b/calendar.ics' } }),
  'https://outlook.office365.com/owa/calendar/a/b/calendar.ics': () => new Response(ICS, { status: 200 }),
  'https://outlook.live.com/evil.ics': () => new Response('', { status: 302, headers: { Location: 'https://169.254.169.254/latest' } }),
  'https://calendar.google.com/404.ics': () => new Response('nope', { status: 404 }),
  'https://calendar.google.com/html': () => new Response('<html></html>', { status: 200 }),
  'https://calendar.google.com/big.ics': () => new Response('BEGIN:VCALENDAR\n' + 'x'.repeat(5 * 1024 * 1024 + 10), { status: 200 }),
  'https://calendar.google.com/slow.ics': (opts) => new Promise((res, rej) => opts.signal.addEventListener('abort', () => rej(new Error('aborted'))))
});
let r = await handle(new Request('https://relay.example/fetch', { method: 'OPTIONS', headers: { Origin: O, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } }), {}, f);
ok(r.status === 204 && r.headers.get('access-control-allow-origin') === O && /content-type/i.test(r.headers.get('access-control-allow-headers')), 'preflight from app origin allowed');
r = await handle(new Request('https://relay.example/fetch', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), {}, f);
ok(r.status === 403 && !r.headers.get('access-control-allow-origin'), 'preflight from other origin refused, no ACAO');
r = await handle(post({ url: G }), {}, f);
ok(r.status === 200 && (await r.text()) === ICS && r.headers.get('access-control-allow-origin') === O && r.headers.get('cache-control') === 'no-store', 'google feed relayed with CORS + no-store');
r = await handle(post({ url: 'webcal://calendar.google.com/calendar/ical/x/basic.ics' }), {}, f);
ok(r.status === 200, 'webcal:// converted to https://');
r = await handle(post({ url: G }, 'https://evil.example'), {}, f);
ok(r.status === 403 && !r.headers.get('access-control-allow-origin'), 'POST from other origin refused');
r = await handle(post({ url: G }, ''), {}, f);
ok(r.status === 403, 'POST without Origin refused');
r = await handle(post({ url: 'http://calendar.google.com/x.ics' }), {}, f); ok(r.status === 400, 'http:// refused');
r = await handle(post({ url: 'https://example.com/x.ics' }), {}, f); ok(r.status === 403 && (await r.json()).error === 'host_not_allowed', 'non-calendar host refused');
r = await handle(post({ url: 'https://calendar.google.com.evil.com/x.ics' }), {}, f); ok(r.status === 403, 'look-alike host refused');
r = await handle(post({ url: 'https://icloud.com.evil.com/x.ics' }), {}, f); ok(r.status === 403, 'look-alike icloud refused');
r = await handle(post({ url: 'https://user:pw@calendar.google.com/x.ics' }), {}, f); ok(r.status === 400, 'credentials in URL refused');
r = await handle(post({ url: 'https://calendar.google.com:8443/x.ics' }), {}, f); ok(r.status === 400, 'odd port refused');
r = await handle(post('not json'), {}, f); ok(r.status === 400, 'bad JSON refused');
r = await handle(new Request('https://relay.example/fetch?url=' + encodeURIComponent(G), { headers: { Origin: O } }), {}, f); ok(r.status === 405, 'GET with query string refused (URL must be in body)');
r = await handle(post({ url: 'https://outlook.live.com/owa/calendar/a/b/calendar.ics' }), {}, f); ok(r.status === 200, 'redirect to allowed host followed');
r = await handle(post({ url: 'https://outlook.live.com/evil.ics' }), {}, f); ok(r.status === 403, 'redirect to non-allowed host refused');
r = await handle(post({ url: 'https://calendar.google.com/404.ics' }), {}, f); ok(r.status === 404 && (await r.json()).error === 'not_found', '404 reported as not_found');
r = await handle(post({ url: 'https://calendar.google.com/html' }), {}, f); ok(r.status === 422, 'non-calendar response refused');
r = await handle(post({ url: 'https://calendar.google.com/big.ics' }), {}, f); ok(r.status === 413, 'over 5 MB refused');
const t0 = Date.now(); r = await handle(post({ url: 'https://calendar.google.com/slow.ics' }), {}, f); ok(r.status === 504 && Date.now() - t0 < 20000, 'timeout -> 504 after ' + (Date.now() - t0) + ' ms');
r = await handle(new Request('https://relay.example/health'), {}, f); ok(r.status === 200, '/health works');
r = await handle(new Request('https://relay.example/fetch', { method: 'POST', headers: { Origin: 'http://localhost:8080' }, body: JSON.stringify({ url: G }) }), { EXTRA_ORIGINS: 'http://localhost:8080' }, f); ok(r.status === 200, 'EXTRA_ORIGINS works (local tests only)');
try { checkUrl('https://p42-caldav.icloud.com/published/2/abc'); ok(true, 'icloud subdomain allowed'); } catch (e) { ok(false, 'icloud subdomain allowed'); }
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
