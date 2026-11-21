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
  assert.match(css, /ibr-facts/);
  assert.match(css, /ibr-summary/);
  assert.match(css, /ibr-skel/);
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

test('canOpen works for custom story cards, including swipe-row items with nested urls', () => {
  const rel = { id: 'rel-1', x: 'religion', topic: 'religion', t: 'A local karakia', it: { t: 'A local karakia', s: 'A short blurb.', url: 'https://example.invalid/story' } };
  const dev = { id: 'd1', x: 'whgdev', topic: 'news', t: 'Housing project', url: 'https://www.nzherald.co.nz/x', dev: { title: 'Housing project', url: 'https://www.nzherald.co.nz/x', desc: 'Habitat for Humanity' } };
  const tip = { id: 'ht-1', x: 'hometip', topic: 'hometips', t: 'A lunchbox tip', h: { id: 'ht-1', t: 'A lunchbox tip', s: 'Pack snacks first.', url: 'https://kiwifamilies.co.nz/x', img: 'https://example.invalid/t.jpg' } };
  const crys = { id: 'crys-1', x: 'crys', topic: 'family', t: '💎 Crystal of the week: Rose quartz', c: { n: 'Rose quartz', what: 'Soft pink quartz', wiki: 'https://en.wikipedia.org/wiki/Rose_quartz', img: 'https://example.invalid/c.jpg' } };
  const card = { classList: { contains: () => false }, querySelector() { return null; }, dataset: { id: rel.id } };
  const { ibReader } = load({
    order: [{ id: 'row-religion', x: 'row', k: 'religion', items: [rel] }, dev, tip, crys]
  });
  assert.equal(ibReader.itemOf(card).id, 'rel-1');
  assert.equal(ibReader.canOpen(card), true);
  assert.equal(ibReader.canOpen(null, dev), true);
  assert.equal(ibReader.canOpen(null, tip), true);
  assert.equal(ibReader.canOpen(null, crys), true);
  const filled = ibReader.withStoryFields(rel);
  assert.equal(filled.url, 'https://example.invalid/story');
  const html = ibReader.viewHtml(filled, { wiki: null, paras: [], quotes: [] });
  assert.match(html, /Read the original/);
  assert.match(html, /example\.invalid\/story/);
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


test('extractEntities picks places and names, and scoreCandidate prefers a clear topic', () => {
  const { ibReader } = load();
  const ents = ibReader.extractEntities('Pōhutukawa starting to bloom along the coast.', 'The first red flowers are out on Northland’s shores this week.');
  assert.ok(ents.some(e => /p[oō]hutukawa/i.test(e)), ents);
  assert.equal(ibReader.scoreCandidate('Pōhutukawa', '', 'Pōhutukawa starting to bloom along the coast.', ''), 0.96);
  assert.ok(ibReader.scoreCandidate('Pōhutukawa', '', "Northland's pōhutukawa trees are starting to bloom", '') >= 0.86);
  assert.ok(ibReader.scoreCandidate('New Zealand', '', 'Pōhutukawa starting to bloom along the coast.', '') < 0.75);
  assert.ok(ibReader.scoreCandidate('Coast', '', 'Pōhutukawa starting to bloom along the coast.', '') < 0.75);
  assert.equal(ibReader.confidenceOk(0.86, 'Pōhutukawa', "Northland's pōhutukawa trees are starting to bloom", false), true);
  assert.equal(ibReader.confidenceOk(0.86, 'New Zealand', 'Pōhutukawa starting to bloom along the coast.', false), false);
  assert.equal(ibReader.confidenceOk(0.86, 'Whangārei', 'A pink sky over Whangārei, and the dogs already dreaming.', true), false);
});

test('sectionsFromText keeps the lead and key headings, and drops references', () => {
  const { ibReader } = load();
  const text = `The pōhutukawa is a coastal evergreen tree in the myrtle family, producing large crimson flowers.

It is commonly found around the north of the North Island.

== Description ==
The tree typically grows to 20 metres, with spreading branches and a gnarled trunk.

Leaves are leathery and dark green, with a felted underside that helps the tree cope with salt spray.

== Ecology ==
Tūī, bellbirds and bats visit the flowers for nectar in early summer.

== See also ==
Rata is a related tree.

== References ==
A list of papers.
`;
  const secs = ibReader.sectionsFromText(text);
  assert.equal(secs[0].heading, '');
  assert.match(secs[0].paras[0], /coastal evergreen tree/);
  assert.ok(secs.some(s => s.heading === 'Description'));
  assert.ok(secs.some(s => s.heading === 'Ecology'));
  assert.ok(!secs.some(s => /see also|references/i.test(s.heading)));
  const paras = ibReader.paragraphsFromText(text, 8);
  assert.ok(paras.length >= 4);
  assert.ok(paras.some(p => /20 metres/.test(p)));
});

test('viewHtml shows a quick summary, key facts, sections, related topics and a source excerpt', () => {
  const { ibReader } = load();
  const item = { id: 'n1', t: 'Pōhutukawa starting to bloom along the coast.', s: 'The first red flowers are out.', url: 'https://www.rnz.co.nz/pohutukawa', sn: 'RNZ', kind: 'news' };
  const html = ibReader.viewHtml(item, {
    wiki: { title: 'Pōhutukawa', sum: { title: 'Pōhutukawa', extract: 'The pōhutukawa is a coastal evergreen tree.', content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/P%C5%8Dhutukawa' } } } },
    summary: 'The pōhutukawa is a coastal evergreen tree in the myrtle family.',
    facts: [{ label: 'Type', value: 'Taxon' }, { label: 'Scientific name', value: 'Metrosideros excelsa' }],
    sections: [
      { heading: '', paras: ['The pōhutukawa is a coastal evergreen tree in the myrtle family, producing large crimson flowers.'] },
      { heading: 'Description', paras: ['The tree typically grows to 20 metres, with spreading branches and a gnarled trunk.'] }
    ],
    paras: ['The pōhutukawa is a coastal evergreen tree in the myrtle family, producing large crimson flowers.'],
    images: [{ src: 'https://upload.wikimedia.org/example.jpg', caption: 'Flowers in December' }],
    related: [{ title: 'Metrosideros', extract: 'A genus of trees in the myrtle family, including the pōhutukawa and rātā.', url: 'https://en.wikipedia.org/wiki/Metrosideros' }],
    quotes: [],
    source: { ok: true, site: 'RNZ', excerpt: true, paras: [{ text: 'The first red flowers are out on Northland’s shores this week, turning a familiar stretch of coast a deep crimson.' }, { text: 'Pōhutukawa trees usually reach their peak in December, but a warm spring has brought the bloom forward.' }] }
  });
  assert.match(html, /Quick summary/);
  assert.match(html, /Key facts/);
  assert.match(html, /Metrosideros excelsa/);
  assert.match(html, /<h2>Description<\/h2>/);
  assert.match(html, /grows to 20 metres/);
  assert.match(html, /More on this topic/);
  assert.match(html, /Metrosideros/);
  assert.match(html, /From the original on RNZ/);
  assert.match(html, /short excerpt/);
  assert.match(html, /Flowers in December/);
  assert.match(html, /From/);
  assert.match(html, /Wikipedia/);
  assert.match(html, /creativecommons.org\/licenses\/by-sa\/4\.0/);
  assert.match(html, /Read the original on RNZ/);
  assert.doesNotMatch(html, /invent|lorem|sample article/i);
  assert.doesNotMatch(html, /ibr-skel/);
});

test('viewHtml shows a skeleton while more information is loading', () => {
  const { ibReader } = load();
  const item = { id: 'n1', t: 'Headline', s: 'A short intro from the card.', url: 'https://www.rnz.co.nz/x', sn: 'RNZ' };
  const html = ibReader.viewHtml(item, { wiki: null, paras: [], quotes: [], pending: true });
  assert.match(html, /ibr-skel/);
  assert.match(html, /Looking up more about this story/);
  assert.match(html, /A short intro from the card/);
});

test('findWiki accepts a strong entity match and still rejects a loose country page', async () => {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(String(url));
    const u = String(url);
    if (/list=search/.test(u)) {
      const q = decodeURIComponent((u.match(/srsearch=([^&]+)/) || [])[1] || '');
      if (/p[oō]hutukawa/i.test(q)) {
        return { ok: true, json: async () => ({ query: { search: [{ title: 'Pōhutukawa', snippet: 'A coastal evergreen tree of New Zealand.' }] } }) };
      }
      return { ok: true, json: async () => ({ query: { search: [{ title: 'New Zealand' }, { title: 'Coastal geography' }] } }) };
    }
    if (/page\/summary\//.test(u)) {
      const title = decodeURIComponent(u.split('/summary/')[1] || '');
      return { ok: true, json: async () => ({ title: title.replace(/_/g, ' '), type: 'standard', extract: 'The pōhutukawa is a coastal evergreen tree.', content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/P%C5%8Dhutukawa' } } }) };
    }
    return { ok: true, json: async () => ({}) };
  };
  const { ibReader } = load({ fetch: fetchFn });
  const hit = await ibReader.findWiki({ t: "Northland's pōhutukawa trees are starting to bloom", s: 'The first red flowers are out.', url: 'https://www.rnz.co.nz/x' });
  assert.ok(hit);
  assert.match(hit.title, /Pōhutukawa/);
  assert.ok(hit.confidence >= 0.75);
  const miss = await ibReader.findWiki({ t: 'A quiet morning walk along the shore', s: 'Just the usual tide and a few dogs.', url: 'https://www.rnz.co.nz/y' });
  assert.equal(miss, null);
  assert.ok(!calls.some(u => /page\/summary\/New_Zealand/.test(u)));
});

test('news and family cards open on tap, so the Open link is omitted; life cards keep theirs', () => {
  const app = read('../feed/app.js');
  assert.match(app, /function showOpenLink\(i\)/);
  assert.match(app, /showOpenLink\(i\)/);
  assert.match(app, /ibReader\.canOpen\(null, i\)/);
  assert.match(today, /openReaderOrLink\(card, null\)/);
  assert.match(today, /ibReader\.canOpen\(card\)/);
  assert.match(today, /ibReader\.open\(card\)/);
  const { ibReader } = load();
  assert.equal(ibReader.canOpen(null, { id: 'n1', t: 'Pōhutukawa starting to bloom along the coast.', s: 'The first red flowers are out.', url: 'https://www.rnz.co.nz/x', sn: 'RNZ', kind: 'news', topic: 'nz' }), true);
  assert.equal(ibReader.canOpen(null, { id: 'tv1', t: 'Shortland Street', s: 'Tonight on TVNZ 2.', url: 'https://www.tvnz.co.nz/x', kind: 'tv' }), true);
  assert.equal(ibReader.canOpen(null, { id: 'ev1', t: 'Auckland concert', s: 'Doors at 7.', ev: 1, url: 'https://www.eventfinda.co.nz/x', kind: 'event' }), true);
  assert.equal(ibReader.canOpen(null, { id: 'ph1', t: 'From the porch', img: 'https://example.invalid/p.jpg', url: 'https://example.invalid/p.jpg', kind: 'photo' }), true);
  assert.equal(ibReader.canOpen(null, { id: 'lk1', t: 'A link Sarah shared', url: 'https://www.facebook.com/x', kind: 'link', sn: 'Facebook', _share: { name: 'Sarah', link: 1 } }), true);
  assert.equal(ibReader.canOpen(null, { id: 'fam1', t: 'A pink sky over Whangārei', s: 'Just a hello from the porch.', topic: 'family', _share: { name: 'Shane' } }), true);
  assert.equal(ibReader.canOpen(null, { id: 'life:1', topic: 'life', t: 'WOF due', url: 'https://shane-my-app.pages.dev/' }), false);
  assert.equal(ibReader.canOpen(null, { id: 'bare', url: 'https://example.invalid/x' }), false);
});
