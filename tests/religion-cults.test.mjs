import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = rel => readFileSync(path.join(rootDir, rel), 'utf8');
const previewSrc = read('feed/ib-preview.js');
const appSrc = read('feed/app.js');
const storiesSrc = read('feed/stories.js');
const local = JSON.parse(read('feed/religion-local.json'));

function loadPreview() {
  const document = {
    readyState: 'loading',
    addEventListener() {},
    createElement() { return { id: '', textContent: '' }; },
    head: { appendChild() {} },
    documentElement: { appendChild() {} }
  };
  const sandbox = { window: null, document, console };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(previewSrc, sandbox);
  assert.ok(sandbox.ibPreview, 'ib-preview should attach ibPreview without booting network fetches');
  return sandbox.ibPreview;
}

test('opt-in copy mentions cults, investigations, documentaries and podcasts', () => {
  assert.match(previewSrc, /Optional stories about traditional practices/);
  assert.match(previewSrc, /investigations, documentaries and podcasts about religions, cults and high-control groups/);
  assert.match(previewSrc, /It stays factual and is hidden until you say yes/);
  assert.match(appSrc, /plus news, investigations, documentaries and podcasts about religions, cults and high-control groups/);
  assert.match(appSrc, /id="religt"/);
});

test('members who have not opted in still do not see Religion, including cult stories', () => {
  assert.match(previewSrc, /if \(religionOn\(\) && REL_ITEMS && REL_ITEMS\.length/);
  assert.match(previewSrc, /function hideFromFeed\(i\) \{ return isCultItem\(i\); \}/);
  assert.match(appSrc, /ibPreview\.hideFromFeed && ibPreview\.hideFromFeed\(i\)\) return false/);
  assert.match(appSrc, /ibPreview\.onFeed === 'function'\) ibPreview\.onFeed\(f\)/);
  assert.match(storiesSrc, /ibPreview\.hideFromFeed && ibPreview\.hideFromFeed\(i\)/);
  assert.match(previewSrc, /if \(hideFromFeed\(i\)\) continue;/);
});

test('keyword matcher tags cult stories and skips culture, churches and clickbait', () => {
  const p = loadPreview();
  const yes = [
    'Former residents speak about life inside Gloriavale',
    'A Scientology documentary looks at the church’s history',
    'Survivors remember Jonestown',
    'The NXIVM trial, explained',
    'A cult survivor describes leaving a high-control group',
    'What is a religious sect?',
    'Centrepoint community: a New Zealand investigation',
    'Heaven’s Gate, 25 years on',
    'CultProof: leavers from high-control groups'
  ];
  const no = [
    'Helping kids see diet culture for what it is',
    'Cultigens: Plants You Won\'t Find in the Wild',
    'Tā moko artist discusses identity and culture',
    'Green Temple [45x45] battle map',
    'Tuesday Morning Yoga at the Church hall',
    'Destiny Church holds a rally in Auckland',
    'Brian Tamaki comments on the news',
    'A shocking video you won\'t believe of a gruesome cult raid'
  ];
  for (const t of yes) assert.equal(p.isCultText(t), true, t);
  for (const t of no) assert.equal(p.isCultText(t), false, t);
  assert.equal(p.isCultItem({ t: 'NZ Herald looks at Gloriavale leavers', topic: 'nz', src: 'nzh' }), true);
  assert.equal(p.hideFromFeed({ t: 'A report on Scientology in Auckland', url: 'https://www.rnz.co.nz/x' }), true);
  assert.equal(p.hideFromFeed({ t: 'Smithsonian looks at pastoral culture', topic: 'culture' }), false);
});

test('matching feed.json items are collected into Religion, without retagging culture posts', () => {
  const p = loadPreview();
  const extra = p.collectFromFeed({
    items: [
      { id: 'g1', t: 'Gloriavale leavers speak to RNZ', s: 'An investigation into the community.', url: 'https://www.rnz.co.nz/gloriavale', sn: 'RNZ', topic: 'nz', kind: 'news', at: Date.parse('2026-11-20T00:00:00Z') },
      { id: 'c1', t: 'Ahorangi Tā William Te Rangiua Pou Temara 1948–2026', s: 'A museum tribute.', url: 'https://blog.tepapa.govt.nz/temara', sn: 'Te Papa', topic: 'culture', kind: 'news' }
    ],
    vlogs: [
      { id: 'v1', t: 'A short history of Jonestown', s: 'A documentary explainer.', url: 'https://www.youtube.com/watch?v=xxxxx', vid: 'xxxxx', sn: 'YouTube', topic: 'learn' }
    ]
  });
  assert.equal(extra.map(i => i.id).sort().join(','), 'g1,v1');
  assert.equal(extra.find(i => i.id === 'g1').kind, 'news');
  assert.equal(extra.find(i => i.id === 'v1').kind, 'documentary');
});

test('client fetches RNZ news and The Lodge podcast, and local items include cult sources', () => {
  assert.match(previewSrc, /www\.rnz\.co\.nz\/rss\/te-manu-korihi\.xml/);
  assert.match(previewSrc, /www\.rnz\.co\.nz\/rss\/national\.xml/);
  assert.match(previewSrc, /www\.rnz\.co\.nz\/rss\/world\.xml/);
  assert.match(previewSrc, /www\.rnz\.co\.nz\/podcasts\/the-lodge\.rss/);
  assert.match(previewSrc, /mode: 'lodge'/);
  assert.match(previewSrc, /mode: 'cult'/);
  const urls = local.items.map(i => i.url);
  assert.ok(urls.some(u => u.includes('the-lodge/season-2')));
  assert.ok(urls.some(u => u.includes('whats-the-difference-between-a-cult-and-a-high-control-group')));
  assert.ok(urls.some(u => u.includes('teara.govt.nz/en/diverse-religions/page-9')));
  assert.ok(local.items.some(i => i.kind === 'podcast' && /CultProof|high-control|Gloriavale/i.test(i.t + ' ' + i.s)));
  assert.ok(local.items.some(i => i.kind === 'tikanga'));
  assert.equal(local.items.every(i => i.t && i.url && i.sn), true);
});

test('rssKeep uses religion keywords for Te Manu Korihi and cult keywords for news', () => {
  const p = loadPreview();
  assert.equal(p.rssKeep('Te Whakatōhea mourns pou tikanga Dr Te Riaki Amoamo', 'religion'), true);
  assert.equal(p.rssKeep('India look to build a big lead against the Black Caps', 'religion'), false);
  assert.equal(p.rssKeep('Former Gloriavale residents give evidence', 'cult'), true);
  assert.equal(p.rssKeep('Half of Kiwi adults are skipping the dentist', 'cult'), false);
  assert.equal(p.rssKeep('E1 Distant Bells: a therapeutic community — or cult', 'lodge'), true);
  assert.equal(p.rssKeep('A shocking video you won\'t believe of gruesome footage', 'cult'), false);
});
