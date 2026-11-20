import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const js = read('../feed/reader.js');
const today = read('../feed/today.js');
const css = read('../feed/reader.css');
const html = read('../feed/index.html');
const sw = read('../feed/sw.js');

function load(extra = {}) {
  const ctx = {
    document: {
      documentElement: { classList: { toggle() {}, contains() { return false; } } },
      getElementById() { return null; },
      createElement() { return { id: '', className: '', hidden: true, setAttribute() {}, innerHTML: '', querySelector() { return null; }, addEventListener() {} }; },
      body: { appendChild() {} },
      addEventListener() {}
    },
    addEventListener() {},
    setTimeout() {},
    matchMedia() { return { matches: false }; },
    history: { pushState() {}, back() {}, state: null },
    fetch: extra.fetch,
    Date,
    Intl,
    ...extra
  };
  vm.runInNewContext(js, ctx);
  return ctx;
}

test('magazine reader assets are wired into the feed shell', () => {
  assert.match(html, /reader\.css\?v=1\.9\.\d+/);
  assert.match(html, /reader\.js\?v=1\.9\.\d+/);
  assert.match(sw, /reader\.css\?v=' \+ VERSION/);
  assert.match(sw, /reader\.js\?v=' \+ VERSION/);
  assert.match(css, /ibr-drop/);
  assert.match(css, /ibr-pull/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /ibrTurnIn/);
  assert.match(today, /openReaderOrLink/);
  assert.match(today, /ibReader\.open/);
  assert.match(today, /const TAP_WAIT = 280;/);
  assert.match(today, /a\.open-l/);
});

test('closeMatch accepts the same topic and rejects a loose heading', () => {
  const { ibReader } = load();
  assert.equal(ibReader.closeMatch('Pōhutukawa', 'Pōhutukawa starting to bloom along the coast.'), true);
  assert.equal(ibReader.closeMatch('Pohutukawa', 'Pōhutukawa starting to bloom along the coast.'), true);
  assert.equal(ibReader.closeMatch('New Zealand', 'Pōhutukawa starting to bloom along the coast.'), false);
  assert.equal(ibReader.closeMatch('Coast', 'Pōhutukawa starting to bloom along the coast.'), false);
  assert.equal(ibReader.closeMatch('Whangārei', 'A pink sky over Whangārei, and the dogs already dreaming.'), false);
  assert.equal(ibReader.wikiTitleFromUrl('https://en.wikipedia.org/wiki/P%C5%8Dhutukawa'), 'Pōhutukawa');
});

test('canOpen allows news and family posts, not games or My App life cards', () => {
  const { ibReader } = load();
  const card = { classList: { contains: k => k === 'soon' }, querySelector() { return null; }, dataset: { id: 'gamesoon' } };
  assert.equal(ibReader.canOpen(card, { id: 'gamesoon', x: 'gamesoon', t: 'Games' }), false);
  const life = { classList: { contains: k => k === 'life' }, querySelector() { return null; }, dataset: { id: 'life:1' } };
  assert.equal(ibReader.canOpen(life, { id: 'life:1', topic: 'life', t: 'WOF' }), false);
  const news = { classList: { contains: () => false }, querySelector() { return null; }, dataset: { id: 'n1' } };
  assert.equal(ibReader.canOpen(news, { id: 'n1', t: 'Pōhutukawa starting to bloom along the coast.', s: 'The first red flowers are out.', url: 'https://www.rnz.co.nz/x', sn: 'RNZ', kind: 'news', topic: 'nz' }), true);
  const fam = { classList: { contains: k => k === 'shared' }, querySelector() { return null; }, dataset: { id: 'sh1' } };
  assert.equal(ibReader.canOpen(fam, { id: 'sh1', t: 'A pink sky over Whangārei', s: 'Just a hello from the porch.', topic: 'family', _share: { name: 'Shane' } }), true);
});

test('viewHtml attributes Wikipedia and always offers Read the original, without inventing text', () => {
  const { ibReader } = load();
  const item = { id: 'n1', t: 'Pōhutukawa starting to bloom along the coast.', s: 'The first red flowers are out on Northland’s shores this week.', url: 'https://www.rnz.co.nz/pohutukawa', sn: 'RNZ', kind: 'news', img: 'https://example.invalid/poh.jpg' };
  const fallback = ibReader.viewHtml(item, { wiki: null, paras: [], quotes: [] });
  assert.match(fallback, /Pōhutukawa starting to bloom/);
  assert.match(fallback, /The first red flowers are out/);
  assert.match(fallback, /Read the original on RNZ/);
  assert.doesNotMatch(fallback, /From Wikipedia/);
  assert.doesNotMatch(fallback, /invent|lorem|sample article/i);

  const wiki = {
    wiki: { title: 'Pōhutukawa', sum: { title: 'Pōhutukawa', extract: 'The pōhutukawa is a coastal evergreen tree.', content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/P%C5%8Dhutukawa' } } } },
    paras: ['The pōhutukawa is a coastal evergreen tree in the myrtle family, producing large crimson flowers.'],
    quotes: []
  };
  const withWiki = ibReader.viewHtml(item, wiki);
  assert.match(withWiki, /From/);
  assert.match(withWiki, /Wikipedia/);
  assert.match(withWiki, /creativecommons.org\/licenses\/by-sa\/4\.0/);
  assert.match(withWiki, /The pōhutukawa is a coastal evergreen tree in the myrtle family/);
  assert.match(withWiki, /Read the original on RNZ/);
  assert.match(withWiki, /ibr-drop/);
});

test('family posts render in the same reader and include comments, news posts do not', () => {
  const { ibReader } = load({ FAM_ON: true, loadThread() {} });
  const fam = { id: 'sh1', t: 'A pink sky over Whangārei', s: 'Just a hello from the porch this evening.', topic: 'family', _share: { name: 'Shane' }, img: 'https://example.invalid/porch.jpg' };
  const htmlFam = ibReader.viewHtml(fam, { wiki: null, paras: [], quotes: [] });
  assert.match(htmlFam, /Shane|Family/);
  assert.match(htmlFam, /data-cid="sh1"/);
  assert.match(htmlFam, /Write a comment/);
  const news = { id: 'n1', t: 'Headline', s: 'Summary', url: 'https://example.invalid/x', sn: 'RNZ' };
  const htmlNews = ibReader.viewHtml(news, { wiki: null, paras: [], quotes: [] });
  assert.doesNotMatch(htmlNews, /data-cid/);
});

test('findWiki only uses a close title match and does not invent a page', async () => {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(String(url));
    const u = String(url);
    if (/list=search/.test(u)) {
      return { ok: true, json: async () => ({ query: { search: [{ title: 'New Zealand' }, { title: 'Coastal geography' }] } }) };
    }
    return { ok: true, json: async () => ({ title: 'New Zealand', type: 'standard', extract: 'A country.' }) };
  };
  const { ibReader } = load({ fetch: fetchFn });
  const miss = await ibReader.findWiki({ t: 'Pōhutukawa starting to bloom along the coast.', url: 'https://www.rnz.co.nz/x' });
  assert.equal(miss, null);
  assert.ok(calls.some(u => /list=search/.test(u)));
  assert.ok(!calls.some(u => /page\/summary\/New_Zealand/.test(u)));
});

test('pull quotes are copied verbatim from source text only', () => {
  const { ibReader } = load();
  const text = 'The tree is common in Northland. “Large crimson flowers cover the crown in early summer.” Birds visit often.';
  assert.equal(ibReader.pullQuotesFrom(text).join('\n'), 'Large crimson flowers cover the crown in early summer.');
  assert.equal(ibReader.pullQuotesFrom('No quotes here at all, just a sentence about trees blooming along the coast of Northland this week.').length, 0);
});
