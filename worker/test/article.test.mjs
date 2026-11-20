import test from 'node:test';
import assert from 'node:assert/strict';
import { robotsPathAllowed, articleFromHtml, excerptBlocks, fetchArticle, isSafePageUrl, ARTICLE_MAX_CHARS } from '../src/article.js';

test('robotsPathAllowed honours Disallow and the longest Allow', () => {
  const star = `User-agent: *\nDisallow: /premium/\nDisallow: /search\nAllow: /news/\n`;
  assert.equal(robotsPathAllowed(star, '/premium/story', 'InfoBook'), false);
  assert.equal(robotsPathAllowed(star, '/search?q=1', 'InfoBook'), false);
  assert.equal(robotsPathAllowed(star, '/news/story', 'InfoBook'), true);
  const ib = `User-agent: *\nDisallow: /\n\nUser-agent: InfoBook\nDisallow: /private/\nAllow: /\n`;
  assert.equal(robotsPathAllowed(ib, '/private/x', 'InfoBook'), false);
  assert.equal(robotsPathAllowed(ib, '/open', 'InfoBook'), true);
  assert.equal(robotsPathAllowed(ib, '/open', 'OtherBot'), false);
  assert.equal(robotsPathAllowed('User-agent: *\nDisallow: /', '/any', 'InfoBook'), false);
  assert.equal(robotsPathAllowed('User-agent: *\nDisallow:', '/any', 'InfoBook'), true);
  assert.equal(robotsPathAllowed('', '/any', 'InfoBook'), true);
});

test('isSafePageUrl rejects private, local and credentialed addresses', () => {
  assert.ok(isSafePageUrl('https://www.rnz.co.nz/news/foo').href.startsWith('https://www.rnz.co.nz/'));
  assert.equal(isSafePageUrl('http://127.0.0.1/secret'), null);
  assert.equal(isSafePageUrl('https://localhost/x'), null);
  assert.equal(isSafePageUrl('https://192.168.1.1/x'), null);
  assert.equal(isSafePageUrl('https://169.254.169.254/latest'), null);
  assert.equal(isSafePageUrl('https://user:pass@example.com/'), null);
  assert.equal(isSafePageUrl('not a url'), null);
});

const RNZ = `<!doctype html><html><head>
<title>Pōhutukawa starting to bloom along the coast | RNZ</title>
<meta property="og:title" content="Pōhutukawa starting to bloom along the coast">
<meta property="og:site_name" content="RNZ">
<meta name="author" content="Jane Doe">
</head><body>
<nav>Home Sport Weather Subscribe</nav>
<article>
<p>The first red flowers are out on Northland’s shores this week, turning a familiar stretch of coast a deep crimson.</p>
<p>Pōhutukawa trees usually reach their peak in December, but a warm, dry spring has brought the bloom forward in several Northland bays.</p>
<h2>Why they flower early</h2>
<p>Scientists say a run of mild nights around the east coast has shortened the usual wait, and early nectar is already drawing tūī and bellbirds into the canopy.</p>
<p>Gardeners in Whangārei and the Bay of Islands have been sending in photographs of trees that are already well covered, a fortnight ahead of a typical year.</p>
<h2>How to see them</h2>
<p>The best displays so far have been along coastal reserves, where the trees have space and salt air. Walkers are asked to stay on the tracks so roots and seedlings are left alone.</p>
<p>Further south the bloom is only just beginning, and rangers expect a second wave of colour in early December if the weather stays settled.</p>
<p>People who want a closer look can join weekend walks run by local coastcare groups, which also talk through how to grow the trees from seed.</p>
<p>A second weekend of walks is planned once more trees come into flower, and maps will be posted on the council website.</p>
<p>One more paragraph of detail about the weekend walks and how families can join without disturbing the trees or the birds that feed in them.</p>
<p>Yet another paragraph so the excerpt has to stop before the end of the original article and invite the reader to the source instead of copying it all.</p>
</article>
<footer>Contact RNZ</footer>
</body></html>`;

test('articleFromHtml keeps a short excerpt with headings and never invents text', () => {
  const d = articleFromHtml(RNZ, 'https://www.rnz.co.nz/news/pohutukawa', 'https://www.rnz.co.nz/news/pohutukawa');
  assert.equal(d.ok, true);
  assert.equal(d.site, 'RNZ');
  assert.match(d.title, /Pōhutukawa starting to bloom/);
  assert.equal(d.byline, 'Jane Doe');
  assert.equal(d.excerpt, true);
  assert.ok(d.paras.filter(p => p.text).length <= 8);
  const blob = d.paras.map(p => p.heading || p.text).join('\n');
  assert.match(blob, /first red flowers are out on Northland/);
  assert.match(blob, /Why they flower early/);
  assert.doesNotMatch(blob, /invent|lorem|sample article/i);
  assert.doesNotMatch(blob, /Subscribe|Home Sport/);
});

test('paywalled, nosnippet and thin pages are refused', () => {
  const pay = articleFromHtml('<html><head><meta property="article:content_tier" content="locked"></head><body><article><p>' + 'Word '.repeat(80) + '</p><p>' + 'More '.repeat(80) + '</p></article></body></html>', 'https://example.com/a', 'https://example.com/a');
  assert.equal(pay.ok, false);
  assert.equal(pay.reason, 'paywall');
  const nos = articleFromHtml('<html><head><meta name="robots" content="index, nosnippet"></head><body><article><p>' + 'Word '.repeat(80) + '</p><p>' + 'More '.repeat(80) + '</p></article></body></html>', 'https://example.com/a', 'https://example.com/a');
  assert.equal(nos.ok, false);
  assert.equal(nos.reason, 'nosnippet');
  const thin = articleFromHtml('<html><body><p>Hi</p></body></html>', 'https://example.com/a', 'https://example.com/a');
  assert.equal(thin.ok, false);
  assert.equal(thin.reason, 'empty');
});

test('excerptBlocks stops at the character cap and marks an excerpt', () => {
  const blocks = [];
  for (let i = 0; i < 20; i++) blocks.push({ heading: false, text: ('A sentence about the coast of Northland this week. ').repeat(6) });
  const { paras, excerpt, chars } = excerptBlocks(blocks, 500, 8);
  assert.equal(excerpt, true);
  assert.ok(chars <= 500);
  assert.ok(paras.length < 20);
  assert.ok(paras.length >= 1);
  assert.ok(ARTICLE_MAX_CHARS >= 4000);
});

test('fetchArticle checks robots and paywalls before returning text', async () => {
  const calls = [];
  const fetcher = async (url, opts) => {
    calls.push(String(url));
    if (String(url).endsWith('/robots.txt')) {
      return { ok: true, status: 200, text: async () => 'User-agent: *\nDisallow: /hidden/\nAllow: /\n', headers: { get: () => 'text/plain' } };
    }
    return {
      ok: true, status: 200, url: String(url),
      headers: { get: k => k === 'content-type' ? 'text/html' : '' },
      text: async () => RNZ
    };
  };
  const ok = await fetchArticle('https://www.rnz.co.nz/news/pohutukawa', fetcher);
  assert.equal(ok.ok, true);
  assert.ok(calls.some(u => u.endsWith('/robots.txt')));
  const blocked = await fetchArticle('https://www.rnz.co.nz/hidden/secret', fetcher);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'robots');
  const pay = await fetchArticle('https://www.nytimes.com/2026/11/21/world/story.html', fetcher);
  assert.equal(pay.ok, false);
  assert.equal(pay.reason, 'paywall');
});
