import { parseBlogFeed, httpsUrl, getBlogs, resetBlogs, BLOGS } from '../src/blogs.js';
import { handle } from '../src/relay.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Kiwiblog</title>
<item>
  <title>The Taxpayers&#8217; Union manifesto</title>
  <link>https://www.kiwiblog.co.nz/2026/10/the_taxpayers_union_manifesto.html</link>
  <pubDate>Sat, 03 Oct 2026 02:00:00 +0000</pubDate>
  <description><![CDATA[<p>The Taxpayers&#8217; Union has published their 2026 manifesto.</p> <p>The post <a href="https://www.kiwiblog.co.nz/2026/10/the_taxpayers_union_manifesto.html">The Taxpayers’ Union manifesto</a> appeared first on <a href="https://www.kiwiblog.co.nz">Kiwiblog</a>.</p>]]></description>
</item>
<item>
  <title>Same again</title>
  <link>https://www.kiwiblog.co.nz/2026/10/the_taxpayers_union_manifesto.html</link>
  <pubDate>Sat, 03 Oct 2026 01:00:00 +0000</pubDate>
  <description>Duplicate link.</description>
</item>
<item>
  <title>Not a link</title>
  <link>javascript:alert(1)</link>
  <pubDate>Sat, 03 Oct 2026 00:00:00 +0000</pubDate>
</item>
</channel></rss>`;
const parsed = parseBlogFeed(rss);
ok(parsed.length === 1, 'rss keeps one https post and drops the duplicate and the bad link (' + parsed.length + ')');
ok(parsed[0].title === 'The Taxpayers’ Union manifesto', 'rss title decoded');
ok(parsed[0].url.startsWith('https://www.kiwiblog.co.nz/'), 'rss link kept');
ok(parsed[0].published === '2026-10-03T02:00:00.000Z', 'rss time kept');
ok(/manifesto/.test(parsed[0].summary) && !/appeared first/.test(parsed[0].summary), 'rss summary kept without the footer');

const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<entry>
  <title>Labour on democracy and trust in government</title>
  <published>2026-10-01T14:47:53.200+13:00</published>
  <link rel="edit" type="application/atom+xml" href="https://www.blogger.com/feeds/5054264/posts/default/1"/>
  <link rel="alternate" type="text/html" href="https://norightturn.blogspot.com/2026/10/labour-on-democracy-and-trust-in.html"/>
  <summary type="html">Labour released a plan.</summary>
</entry>
<entry>
  <title>Only an edit link</title>
  <updated>2026-10-02T00:00:00Z</updated>
  <link rel="edit" href="https://www.blogger.com/feeds/5054264/posts/default/2"/>
  <summary>Should not be used.</summary>
</entry>
</feed>`;
const atomItems = parseBlogFeed(atom);
ok(atomItems.length === 1 && atomItems[0].url === 'https://norightturn.blogspot.com/2026/10/labour-on-democracy-and-trust-in.html', 'atom uses the alternate html link');
ok(atomItems[0].summary === 'Labour released a plan.', 'atom summary kept');
ok(atomItems[0].published === '2026-10-01T01:47:53.200Z', 'atom published time kept');
ok(httpsUrl('http://example.com/a') === '' && httpsUrl('https://kottke.org/x') === 'https://kottke.org/x', 'only https links pass');
let changed = false;
try { parseBlogFeed('<html>not a feed</html>'); } catch (e) { changed = e.message === 'blogs_changed'; }
ok(changed, 'a page that is not a feed is rejected');

const LIVE = Date.now();
resetBlogs();
const mem = {};
const env = { EVENTS_KV: { async get() { return mem.v ? JSON.parse(mem.v) : null; }, async put(k, v) { mem.v = v; } } };
let calls = [];
const fetchImpl = async (url) => {
  calls.push(url);
  if (url === BLOGS[0].feed) return new Response(rss, { status: 200 });
  if (url === BLOGS[1].feed) return new Response(atom, { status: 200 });
  if (url === BLOGS[2].feed) return new Response('nope', { status: 500 });
  if (url === BLOGS[3].feed) return new Response('<html>blocked</html>', { status: 200 });
  throw new Error('unexpected ' + url);
};
const feed = await getBlogs(env, fetchImpl, LIVE);
ok(calls.length === 4, 'each fixed feed is fetched once (' + calls.length + ')');
ok(feed.blogs.length === 4, 'four blogs are returned');
ok(feed.blogs[0].ok && feed.blogs[0].items.length === 1 && feed.blogs[0].name === 'Kiwiblog', 'a good feed returns its post');
ok(feed.blogs[1].ok && feed.blogs[1].items[0].title.startsWith('Labour'), 'atom feed returns its post');
ok(feed.blogs[2].ok === false && feed.blogs[2].items.length === 0, 'a failed fetch is empty');
ok(feed.blogs[3].ok === false && feed.blogs[3].items.length === 0, 'a non-feed page is empty');
resetBlogs();
calls = [];
const again = await getBlogs(env, async () => { calls.push('x'); throw new Error('down'); }, LIVE + 60 * 1000);
ok(calls.length === 0 && again.blogs[0].items.length === 1, 'a fresh cache is served without fetching');

const O = 'https://phoneapp12-cell.github.io';
resetBlogs();
let r = await handle(new Request('https://relay.example/blogs', { headers: { Origin: O } }), env, fetchImpl);
const body = await r.json();
ok(r.status === 200 && r.headers.get('access-control-allow-origin') === O && body.blogs.length === 4, 'GET /blogs from the app');
r = await handle(new Request('https://relay.example/blogs', { method: 'POST', headers: { Origin: O } }), env, fetchImpl);
ok(r.status === 405, 'POST /blogs refused');
r = await handle(new Request('https://relay.example/blogs', { headers: { Origin: 'https://evil.example' } }), env, fetchImpl);
ok(r.status === 403, 'GET /blogs from another site refused');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
