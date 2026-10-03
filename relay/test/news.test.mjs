import { parseNorthlandRss, isLocalStory, getLocalNews, resetNews, NEWS_URL, NEWS_PAGE } from '../src/news.js';
import { handle } from '../src/relay.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

const item = (title, link, when, desc) => `<item>
  <title>${title}</title>
  <description><![CDATA[${desc}]]></description>
  <pubDate>${when}</pubDate>
  <link>${link}</link>
</item>`;
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>RNZ Northland Headlines</title>
<link>https://www.rnz.co.nz/news/regions_northland</link>
${item('Road reopens in Whangārei', 'https://www.rnz.co.nz/news/regions_northland/1/road', 'Sat, 03 Oct 2026 10:10:42 +1300', 'Traffic is moving again.')}
${item('Insect programme in Auckland', 'https://www.rnz.co.nz/news/regions_auckland/2/insect', 'Sat, 03 Oct 2026 09:00:00 +1300', 'A breeding programme further south.')}
${item('Whales at Ninety Mile Beach', 'https://www.rnz.co.nz/news/regional/3/whales', 'Fri, 02 Oct 2026 15:29:02 +1300', 'A rescue is under way.')}
${item('Off-site story', 'https://example.com/not-rnz', 'Fri, 02 Oct 2026 12:00:00 +1300', 'Northland mention but not RNZ.')}
${item('Same road again', 'https://www.rnz.co.nz/news/regions_northland/1/road', 'Sat, 03 Oct 2026 10:10:42 +1300', 'Duplicate link.')}
</channel></rss>`;
const parsed = parseNorthlandRss(rss);
ok(parsed.source === 'RNZ' && parsed.page === NEWS_PAGE && parsed.feed === NEWS_URL, 'source is RNZ Northland');
ok(parsed.items.length === 2, 'keeps Whangārei and Ninety Mile, drops Auckland, off-site and duplicates (' + parsed.items.length + ')');
ok(parsed.items[0].title === 'Road reopens in Whangārei' && parsed.items[0].published === '2026-10-02T21:10:42.000Z', 'newest local item first, time kept');
ok(parsed.items[1].title === 'Whales at Ninety Mile Beach', 'second local item kept');
ok(!parsed.items.some(i => /Auckland|example.com/.test(i.title + i.url)), 'non-local and non-RNZ links are not returned');
ok(isLocalStory('Shop on a Northland road', '', 'https://www.rnz.co.nz/news/weather/9/x'), 'northland in the title counts');
ok(!isLocalStory('City hall vote', 'No place name here.', 'https://www.rnz.co.nz/news/regions_auckland/9/x'), 'an Auckland-only item is left out');
let gone = false;
try { parseNorthlandRss('<rss><channel><title>Radio NZ Feed - 404</title><item><title>This feed is no longer available</title><link>https://www.rnz.co.nz/rss</link><pubDate>Fri, 24 Jun 2011 12:12:00 +1200</pubDate></item></channel></rss>'); }
catch (e) { gone = e.message === 'news_gone'; }
ok(gone, 'a retired feed is rejected');
let changed = false;
try { parseNorthlandRss('<html>not a feed</html>'); }
catch (e) { changed = e.message === 'news_changed'; }
ok(changed, 'a page that is not RSS is rejected');

const LIVE = Date.now();
resetNews();
const mem = {};
const env = { EVENTS_KV: { async get() { return mem.v ? JSON.parse(mem.v) : null; }, async put(k, v) { mem.v = v; } } };
let calls = 0;
const fetchImpl = async (url) => {
  calls++;
  if (url !== NEWS_URL) throw new Error('bad url ' + url);
  return new Response(rss, { status: 200 });
};
const feed = await getLocalNews(env, fetchImpl, LIVE);
ok(calls === 1 && feed.items.length === 2 && mem.v && JSON.parse(mem.v).at === LIVE, 'fetch stores the local items');
resetNews();
const again = await getLocalNews(env, async () => { calls++; throw new Error('down'); }, LIVE + 60 * 1000);
ok(calls === 1 && again.items.length === 2, 'fresh KV copy is served without fetching');
resetNews();
const stale = await getLocalNews(env, async () => { throw new Error('down'); }, LIVE + 11 * 60 * 1000);
ok(stale.items.length === 2, 'a failed refresh keeps the saved copy');

const O = 'https://phoneapp12-cell.github.io';
resetNews();
let r = await handle(new Request('https://relay.example/news', { headers: { Origin: O } }), env, fetchImpl);
const body = await r.json();
ok(r.status === 200 && r.headers.get('access-control-allow-origin') === O && body.items.length === 2 && body.items[0].url.startsWith('https://www.rnz.co.nz/'), 'GET /news from the app');
r = await handle(new Request('https://relay.example/news', { headers: { Origin: 'https://evil.example' } }), env, fetchImpl);
ok(r.status === 403, 'GET /news from another site refused');
resetNews();
r = await handle(new Request('https://relay.example/news', { headers: { Origin: O } }), { EVENTS_KV: { async get() { return null; }, async put() {} } }, async () => { throw new Error('down'); });
ok(r.status === 502 && (await r.json()).error === 'news_unavailable', 'a failed fetch with no cache is an error');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
