import { parsePodcastFeed, audioUrl, getPodcasts, resetPodcasts, PODCASTS } from '../src/podcasts.js';
import { handle } from '../src/relay.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Checkpoint</title>
<item>
  <title>"Freedom" - 82yo amputee on first para ice hockey experience</title>
  <link>https://www.rnz.co.nz/national/programmes/checkpoint/audio/2019054370/freedom</link>
  <pubDate>Fri, 02 Oct 2026 17:50:00 +1300</pubDate>
  <description><![CDATA[<p>Checkpoint producer Johnny Sutherland spoke to Lisa Owen.</p>]]></description>
  <enclosure url="https://podcast.radionz.co.nz/ckpt/ckpt-20261002-1750-freedom.mp3" length="10" type="audio/mpeg"/>
</item>
<item>
  <title>Same again</title>
  <link>https://www.rnz.co.nz/national/programmes/checkpoint/audio/2019054370/freedom</link>
  <pubDate>Fri, 02 Oct 2026 17:40:00 +1300</pubDate>
  <enclosure url="https://podcast.radionz.co.nz/ckpt/ckpt-20261002-1750-freedom.mp3" type="audio/mpeg"/>
</item>
<item>
  <title>Page only</title>
  <link>https://www.thisamericanlife.org/898/an-argument</link>
  <pubDate>Sun, 27 Sep 2026 20:00:00 -0400</pubDate>
  <description>Page only</description>
  <enclosure url="http://example.com/episode.mp3" type="audio/mpeg"/>
</item>
<item>
  <title>Audio only</title>
  <link>javascript:alert(1)</link>
  <pubDate>Fri, 02 Oct 2026 07:00:00 +0000</pubDate>
  <enclosure url="https://cdn.example/ep.m4a?x=1&amp;y=2" type="audio/mp4"/>
</item>
<item>
  <title>Not audio</title>
  <link>https://99percentinvisible.org/episode</link>
  <pubDate>Thu, 01 Oct 2026 07:00:00 +0000</pubDate>
  <enclosure url="https://cdn.example/notes.pdf" type="application/pdf"/>
</item>
</channel></rss>`;
const parsed = parsePodcastFeed(rss);
ok(parsed.length === 4, 'keeps distinct episodes and drops the duplicate (' + parsed.length + ')');
const freedom = parsed.find(x => x.title.startsWith('"Freedom"'));
ok(freedom && freedom.audio.endsWith('.mp3') && freedom.url.includes('rnz.co.nz'), 'https mp3 and page kept');
ok(freedom && freedom.published === '2026-10-02T04:50:00.000Z', 'Auckland pubDate kept as UTC');
ok(freedom && /Sutherland/.test(freedom.summary), 'summary kept');
ok(parsed[0].title === 'Audio only', 'newest episode is first');
const pageOnly = parsed.find(x => x.title === 'Page only');
ok(pageOnly && pageOnly.url.includes('thisamericanlife.org') && !pageOnly.audio && !pageOnly.summary, 'http audio dropped and a title-only summary dropped');
const audioOnly = parsed.find(x => x.title === 'Audio only');
ok(audioOnly && !audioOnly.url && audioOnly.audio === 'https://cdn.example/ep.m4a?x=1&y=2', 'm4a kept and a bad page link dropped');
const pdf = parsed.find(x => x.title === 'Not audio');
ok(pdf && pdf.url.includes('99percentinvisible') && !pdf.audio, 'a non mp3/m4a enclosure is not audio');
ok(audioUrl('http://example.com/a.mp3') === '' && audioUrl('https://cdn.example/a.MP3') === 'https://cdn.example/a.MP3', 'only https mp3 or m4a');
let changed = false;
try { parsePodcastFeed('<html>not a feed</html>'); } catch (e) { changed = e.message === 'podcasts_changed'; }
ok(changed, 'a page that is not a feed is rejected');

const LIVE = Date.now();
resetPodcasts();
const mem = {};
const env = { EVENTS_KV: { async get() { return mem.v ? JSON.parse(mem.v) : null; }, async put(k, v) { mem.v = v; } } };
let calls = [];
const fetchImpl = async (url) => {
  calls.push(String(url));
  if (url === PODCASTS[0].feed) return new Response(rss, { status: 200 });
  if (url === PODCASTS[1].feed) return new Response(rss, { status: 200 });
  if (url === PODCASTS[2].feed) return new Response('<html>blocked</html>', { status: 200 });
  throw new Error('unexpected ' + url);
};
const feed = await getPodcasts(env, fetchImpl, LIVE);
ok(calls.length === 3, 'each fixed feed is fetched once (' + calls.length + ')');
ok(feed.podcasts.length === 3, 'three podcasts are returned');
ok(feed.podcasts[0].ok && feed.podcasts[0].items.length === 4 && feed.podcasts[0].name === 'Checkpoint', 'a good feed returns its episodes');
ok(feed.podcasts[2].ok === false && feed.podcasts[2].items.length === 0, 'a non-feed page is empty');
resetPodcasts();
calls = [];
const again = await getPodcasts(env, async () => { calls.push('x'); throw new Error('down'); }, LIVE + 60 * 1000);
ok(calls.length === 0 && again.podcasts[0].items.length === 4, 'a fresh cache is served without fetching');

const O = 'https://phoneapp12-cell.github.io';
resetPodcasts();
let r = await handle(new Request('https://relay.example/podcasts', { headers: { Origin: O } }), env, fetchImpl);
const body = await r.json();
ok(r.status === 200 && r.headers.get('access-control-allow-origin') === O && body.podcasts.length === 3, 'GET /podcasts from the app');
r = await handle(new Request('https://relay.example/podcasts', { method: 'POST', headers: { Origin: O } }), env, fetchImpl);
ok(r.status === 405, 'POST /podcasts refused');
r = await handle(new Request('https://relay.example/podcasts', { headers: { Origin: 'https://evil.example' } }), env, fetchImpl);
ok(r.status === 403, 'GET /podcasts from another site refused');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
