import { handle } from '../src/relay.js';
import { parseSarahFeed, SARAH_RSS, SARAH_CHANNEL_ID, refreshSarah } from '../src/sarah.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const O = 'https://phoneapp12-cell.github.io';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed><yt:channelId>${SARAH_CHANNEL_ID}</yt:channelId>
<link rel="alternate" href="https://www.youtube.com/channel/${SARAH_CHANNEL_ID}"/>
<entry>
  <yt:videoId>hyuecefG9Aw</yt:videoId>
  <title>2 October 2026</title>
  <published>2026-10-02T04:54:17+00:00</published>
</entry>
<entry>
  <yt:videoId>dM7pc_u_D9Q</yt:videoId>
  <title>October 1st 2026 SunRise</title>
  <published>2026-09-30T19:11:23+00:00</published>
</entry>
<entry>
  <yt:videoId>bbbbbbbbbbb</yt:videoId>
  <title>Not her</title>
  <published>2026-10-03T00:00:00+00:00</published>
</entry>
</feed>`;

const parsed = parseSarahFeed(xml);
ok(parsed[0].id === 'bbbbbbbbbbb' && parsed[1].id === 'hyuecefG9Aw' && parsed.length === 3, 'feed parses newest first and keeps only this channel');
ok(parseSarahFeed(xml.replaceAll(SARAH_CHANNEL_ID, 'UCxxxxxxxxxxxxxxxxxxxxxx')).length === 0, 'another channel is ignored');
ok(parseSarahFeed('<feed><entry><yt:videoId>hyuecefG9Aw</yt:videoId><published>2026-10-02T04:54:17+00:00</published></entry></feed>').length === 0, 'a feed without the channel id is ignored');

const titles = {
  hyuecefG9Aw: { title: '2 October 2026', author_name: 'Sarah Jenkins' },
  dM7pc_u_D9Q: { title: 'October 1st 2026 SunRise', author_name: 'Sarah Jenkins' },
  bbbbbbbbbbb: { title: 'Not her', author_name: 'Someone Else' }
};
const fetchImpl = async (url) => {
  if (url === SARAH_RSS) return new Response(xml, { status: 200 });
  const m = decodeURIComponent(url).match(/v=([A-Za-z0-9_-]{11})/);
  if (m && titles[m[1]]) return new Response(JSON.stringify(titles[m[1]]), { status: 200 });
  throw new Error('unexpected ' + url);
};
const store = {};
const env = { EVENTS_KV: {
  async get(k) { return store[k] ? JSON.parse(store[k]) : null; },
  async put(k, v) { store[k] = v; }
}, ALLOWED_ORIGIN: O };

let r = await handle(new Request('https://relay.example/sarah', { headers: { Origin: O } }), env, fetchImpl);
let j = await r.json();
ok(r.status === 200 && j.channelId === SARAH_CHANNEL_ID && j.videos.length === 2 && j.videos[0].id === 'hyuecefG9Aw' && j.videos[0].title === '2 October 2026' && j.videos[0].channel === 'Sarah Jenkins' && j.videos[1].id === 'dM7pc_u_D9Q', 'oembed drops a video that is not Sarah Jenkins and keeps the newest real one first');
ok(j.rss === SARAH_RSS && r.headers.get('access-control-allow-origin') === O, 'response names the fixed RSS URL and allows the app');

r = await handle(new Request('https://relay.example/sarah', { headers: { Origin: 'https://evil.example' } }), env, fetchImpl);
ok(r.status === 403, 'other origins are refused');
r = await handle(new Request('https://relay.example/sarah?channel_id=UCEvil', { headers: { Origin: O } }), env, fetchImpl);
ok(r.status === 200 && (await r.json()).channelId === SARAH_CHANNEL_ID, 'a query string cannot switch channel');

r = await handle(new Request('https://relay.example/sarah/seen', { method: 'POST', headers: { Origin: O, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'hyuecefG9Aw' }) }), env, fetchImpl);
j = await r.json();
ok(r.status === 200 && j.announced === 'hyuecefG9Aw', 'the phone can mark the newest id so it is not announced again');
const again = await refreshSarah(env, fetchImpl, Date.now() + 20 * 60 * 1000);
ok(again.announced === 'hyuecefG9Aw' && again.videos[0].id === 'hyuecefG9Aw', 'a later check keeps the same id marked');

r = await handle(new Request('https://relay.example/sarah/seen', { method: 'POST', headers: { Origin: O, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'not-an-id' }) }), env, fetchImpl);
ok(r.status === 400, 'a bad id is refused');

console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
