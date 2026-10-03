import { handle } from '../src/relay.js';
import { readBusy, getStoreBusy, aucklandParts } from '../src/busy.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PLACE = 'ChIJWdxTnfF-C20RVO9nRj_HK7k';
const O = 'https://phoneapp12-cell.github.io';
const sun9 = new Date(Date.UTC(2026, 9, 3, 20, 30)); // Sunday 4 Oct 2026 09:30 NZDT
const sun7 = new Date(Date.UTC(2026, 9, 3, 18, 30)); // 07:30 NZDT, before open

function payload(pop, name = 'Noel Leeming Whangarei Supa', id = PLACE) {
  const d = [];
  d[11] = name;
  d[78] = id;
  d[84] = pop;
  return ")]}'\n" + JSON.stringify([null, null, null, null, null, null, d]);
}
const days = [[7, [[7, 0, '', ''], [9, 28, 'Usually not too busy', '']], 0]];
const livePop = [days, 0, null, 1, 7, null, 'Not busy', [7, 9]];

ok(aucklandParts(sun9).day === 7 && aucklandParts(sun9).hour === 9, 'Auckland Sunday 9am');
let live = readBusy(payload(livePop), sun7);
ok(live && live.basis === 'live' && live.level === 'quiet', 'live label wins over a closed hour');
let usual = readBusy(payload([days]), sun9);
ok(usual && usual.basis === 'usual' && usual.level === 'easy', 'popular-times label for this hour');
ok(readBusy(payload([days]), sun7) === null, 'closed hour with an empty label is no reading');
ok(readBusy(payload([[ [7, [[9, 40, 'Usually hectic', '']]] ]]), sun9) === null, 'unknown phrase is not turned into a level');
let threw = false;
try { readBusy(payload(livePop, 'Bendon Whangarei', 'ChIJother'), sun9); } catch (e) { threw = true; }
ok(threw, 'a different shop is refused');
threw = false;
try { readBusy(payload(livePop, 'Noel Leeming Whangarei Collection Centre', PLACE), sun9); } catch (e) { threw = true; }
ok(threw, 'the collection centre name is refused');

const text = payload(livePop);
const fetchImpl = async (url) => {
  if (String(url).includes('/maps?')) {
    return new Response('ok', { status: 200, headers: { 'set-cookie': 'NID=abc123; path=/; secure' } });
  }
  if (String(url).includes('/maps/preview/place')) return new Response(text, { status: 200 });
  throw new Error('unexpected ' + url);
};
const got = await getStoreBusy(fetchImpl, sun7);
ok(got && got.basis === 'live' && got.level === 'quiet', 'fetcher returns the live level only');

const req = (origin = O) => new Request('https://relay.example/busy', { headers: { Origin: origin } });
let r = await handle(req(), {}, fetchImpl);
let body = await r.json();
ok(r.status === 200 && body.basis === 'live' && body.level === 'quiet' && !JSON.stringify(body).match(/port|road|okara/i), 'GET /busy is a level, never a street');
r = await handle(req('https://evil.example'), {}, fetchImpl);
ok(r.status === 403, 'other origin refused');
r = await handle(new Request('https://relay.example/busy', { method: 'POST', headers: { Origin: O } }), {}, fetchImpl);
ok(r.status === 405, 'POST refused');
const blocked = async (url) => {
  if (String(url).includes('/maps?')) return new Response('no', { status: 200, headers: { 'set-cookie': 'OTHER=1' } });
  throw new Error('no');
};
r = await handle(req(), {}, blocked);
ok(r.status === 502 && (await r.json()).error === 'busy_unavailable', 'no Google session is a skip, not a guess');
const closedFetch = async (url) => {
  if (String(url).includes('/maps?')) return new Response('ok', { status: 200, headers: { 'set-cookie': 'NID=abc; path=/' } });
  return new Response(payload([days]), { status: 200 });
};
r = await handle(req(), {}, closedFetch);
body = await r.json();
ok(r.status === 200 && !body.level && !body.basis, 'open place with no label for this hour returns no level');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
