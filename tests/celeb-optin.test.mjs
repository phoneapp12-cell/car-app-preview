import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('../feed/app.js');
const family = read('../feed/family.js');
const today = read('../feed/today.js');
const css = read('../feed/today.css');
const sources = read('../worker/src/sources.js');
const workerFam = read('../worker/src/family.js');

test('opt-in is limited to Sarah, Millesha, Monique, Nicole and Miracle', () => {
  assert.match(workerFam, /m8e5feaf41519/); // Sarah
  assert.match(workerFam, /mc2fc6a0e9f91/); // Millesha
  assert.match(workerFam, /mde3c8e85cded/); // Monique
  assert.match(workerFam, /m078211284db3/); // Nicole
  assert.match(workerFam, /mdecd8c04ff70/); // Miracle
  assert.match(workerFam, /Left out: Shane and Dion/);
  assert.match(workerFam, /Cass \(\“they\”\)/);
  assert.match(family, /let CELEB = \{ can: false/);
  assert.match(family, /function setCelebNews/);
});

test('celeb topic is opt-in and hidden from onboarding and from anyone who has not agreed', () => {
  assert.match(app, /\['celeb', 'Celebrity & reality TV'/);
  assert.match(app, /OPTIN = new Set\(\[[^\]]*celeb/);
  assert.match(family, /t\[0\] !== 'celeb'/);
  assert.match(app, /if \(OPTIN\.has\(i\.topic\) && !optedIn\(i\.topic\)\) return false/);
  assert.match(family, /celebNews: \(CELEB\.can && CELEB\.news !== null\) \? CELEB\.news/);
  assert.match(workerFam, /if \(!CELEB_ASK\.has\(me\.id\)\) delete np\.celebNews/);
});

test('Today magazine card asks yes please / no thanks, and Settings has a later toggle', () => {
  assert.match(today, /Would you like celebrity &amp; reality TV news in your feed\?/);
  assert.match(today, /Kardashians, Love Island and Real Housewives/);
  assert.match(today, /Yes please/);
  assert.match(today, /No thanks/);
  assert.match(today, /CELEB\.ask/);
  assert.match(today, /\.today-celeb/);
  assert.match(css, /\.today-celeb\{/);
  assert.match(app, /id="celebt"/);
  assert.match(app, /CELEB\.can/);
  assert.match(app, /setCelebNews\(!CELEB\.news\)/);
});

test('celebrity sources are NZ Herald Entertainment, Now to Love NZ, E! News and Us Weekly, with no sport sources', () => {
  assert.match(sources, /rss\('nzh-ent', 'celeb'/);
  assert.match(sources, /rss\('ntl-nz', 'celeb'/);
  assert.match(sources, /rss\('eonline', 'celeb'/);
  assert.match(sources, /rss\('usweekly', 'celeb'/);
  assert.match(sources, /NZ Herald Entertainment/);
  assert.match(sources, /section\/entertainment\/\?outputType=xml/);
  assert.match(sources, /Now to Love NZ/);
  assert.match(sources, /nowtolove\.co\.nz\/feed/);
  assert.match(sources, /E! News/);
  assert.match(sources, /eol-feeds\.eonline\.com\/rssfeed\/us\/top_stories/);
  assert.match(sources, /Us Weekly/);
  assert.match(sources, /usmagazine\.com\/feed/);
  assert.doesNotMatch(sources, /dailymail/i);
  assert.equal((sources.match(/rss\('[^']+', 'celeb'/g) || []).length, 4);
});

test('nothing is sent outside the app: no push or email for this question', () => {
  assert.match(today, /You can change this later in Settings/);
  assert.equal(today.includes('data-celeb'), true);
  assert.equal(/celeb/.test(family) && !/new Notification|showNotification|mailto:/.test(family.split('setCelebNews')[1] || ''), true);
  assert.doesNotMatch(family, /showNotification\([^)]*celeb/i);
});
