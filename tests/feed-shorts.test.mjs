import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const today = fs.readFileSync(path.join(root, 'feed/today.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'feed/index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'feed/sw.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'feed/shorts.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'feed/shorts.js'), 'utf8');
const stories = fs.readFileSync(path.join(root, 'feed/stories.js'), 'utf8');

function loadShorts() {
  const ctx = { console, URL, Set, Map, Object, Number, String, Array, Date, Math, JSON, encodeURIComponent, fetch: undefined };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ctx.document = {
    querySelector: () => null,
    createElement: () => ({ setAttribute() {}, appendChild() {}, querySelector() { return null; }, innerHTML: '' }),
    body: { appendChild() {} },
    documentElement: { classList: { add() {}, remove() {} } }
  };
  ctx.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(js, ctx, { filename: 'shorts.js' });
  return ctx.ibShorts;
}

const sample = [
  { vk: 'reddit', vu: 'abc12345', t: 'A sleepy puppy', url: 'https://www.reddit.com/r/aww/comments/x/a_sleepy_puppy/', topic: 'nature', src: 'rd-aww', vdur: 18 },
  { vk: 'reddit', vu: 'long99999', t: 'A long walk', url: 'https://www.reddit.com/r/aww/comments/x/long/', topic: 'nature', src: 'rd-aww', vdur: 140 },
  { vk: 'reddit', vu: 'rude99999', t: 'World Cup stadium football', url: 'https://www.reddit.com/r/aww/comments/x/sport/', topic: 'nature', src: 'rd-aww', vdur: 12 },
  { vk: 'reddit', vu: 'crude1234', t: 'Wild storm', url: 'https://www.reddit.com/r/NatureIsFuckingLit/comments/x/storm/', topic: 'nature', src: 'rd-nfl', vdur: 20 },
  { vk: 'reddit', vu: 'iaf123456', t: 'A cool fact', url: 'https://www.reddit.com/r/interestingasfuck/comments/x/fact/', topic: 'learn', src: 'fun-interestingasfuck', vdur: 15 },
  { vk: 'reddit', vu: 'nsfw12345', t: 'NSFW cat clip', url: 'https://www.reddit.com/r/aww/comments/x/nsfw/', topic: 'nature', src: 'rd-aww', vdur: 10 },
  { vk: 'reddit', vu: 'derp12345', t: 'A derpy dog', url: 'https://www.reddit.com/r/AnimalsBeingDerps/comments/x/derp/', topic: 'pets', src: 'sv-derps', vdur: 22 },
  { vk: 'reddit', vu: 'smile1234', t: 'A kind teacher', url: 'https://www.reddit.com/r/MadeMeSmile/comments/x/kind/', topic: 'kids', src: 'sv-smile', vdur: 30 },
  { vid: 'nasaVid111', t: 'Who Can Be a NASA Astronaut?', src: 'yt-nasa', topic: 'scifi', url: 'https://www.youtube.com/watch?v=nasaVid111' },
  { vid: 'kurzVid111', t: 'What Is Food Fortification?', src: 'fun-kurzgesagt', topic: 'science', url: 'https://www.youtube.com/watch?v=kurzVid111' },
  { vid: 'dodoVid111', t: 'A rescued puppy', src: 'fun-dodo-all', topic: 'nature', url: 'https://www.youtube.com/watch?v=dodoVid111' }
];
const top40 = { songs: [
  { rank: 1, title: 'Babydoll', artist: 'Jamie Miller', videoId: '8g25GeJgxgs' },
  { rank: 2, title: 'Man I Need', artist: 'Olivia Dean', videoId: 'oIv_Y2RPQ_A' }
] };

test('the Today streak tile is replaced by a Shorts tile', () => {
  assert.match(today, /function shortsTile/);
  assert.doesNotMatch(today, /function streakTile/);
  assert.match(today, /title: 'Shorts'/);
  assert.match(today, /🎬/);
  assert.match(today, /k === 'shorts' && typeof ibShortsOpen === 'function'/);
  assert.match(html, /shorts\.css\?v=/);
  assert.match(html, /shorts\.js\?v=/);
  assert.match(sw, /shorts\.css\?v=/);
  assert.match(sw, /shorts\.js\?v=/);
});

test('portrait filter keeps only taller-than-wide clips', () => {
  const S = loadShorts();
  assert.equal(S.isPortrait(720, 1280), true);
  assert.equal(S.isPortrait(1280, 720), false);
  assert.equal(S.isPortrait(1080, 1080), false);
});

test('the Mixkit list is portrait and only used as a fallback', () => {
  const S = loadShorts();
  assert.ok(S.FALLBACK.length >= 8);
  assert.equal(S.filterPortrait(S.FALLBACK).length, S.FALLBACK.length);
  for (const it of S.FALLBACK) {
    assert.equal(it.fallback, true);
    assert.equal(S.isPortrait(it.width, it.height), true);
    assert.match(it.url, /^https:\/\/assets\.mixkit\.co\/videos\/\d+\/\d+-720\.mp4$/);
  }
  const built = S.buildCatalog({ items: sample }, top40, { optIn: ['pets'] });
  assert.ok(built.mixed.length, 'the feed mix is used when clips exist');
  assert.ok(built.mixed.every(it => it.kind === 'reddit' || it.kind === 'youtube'));
  assert.ok(built.mixed.every(it => !it.fallback));
});

test('Reddit clips are allowlisted, short, family-safe and not sport', () => {
  const S = loadShorts();
  assert.equal(S.isAllowedSub('aww'), true);
  assert.equal(S.isAllowedSub('AnimalsBeingDerps'), true);
  assert.equal(S.isAllowedSub('MadeMeSmile'), true);
  assert.equal(S.isAllowedSub('interestingasfuck'), false);
  assert.equal(S.isAllowedSub('NatureIsFuckingLit'), false);
  const reddit = S.filterReddit(sample, { optIn: ['pets'] });
  const ids = reddit.map(x => x.vu);
  assert.ok(ids.includes('abc12345'));
  assert.ok(ids.includes('derp12345'));
  assert.ok(ids.includes('smile1234'));
  assert.ok(!ids.includes('long99999'), 'duration cap ~90s');
  assert.ok(!ids.includes('rude99999'), 'sport titles dropped');
  assert.ok(!ids.includes('crude1234'), 'crude subs dropped');
  assert.ok(!ids.includes('iaf123456'), 'interestingasfuck dropped');
  assert.ok(!ids.includes('nsfw12345'), 'nsfw titles dropped');
  assert.equal(S.durationOk(90), true);
  assert.equal(S.durationOk(91), false);
});

test('clips follow each member’s interests', () => {
  const S = loadShorts();
  const petsOff = S.filterReddit(sample, { pick: ['nature', 'kids', 'music', 'science', 'scifi', 'learn'], optIn: [] });
  assert.ok(petsOff.some(x => x.vu === 'abc12345'));
  assert.ok(!petsOff.some(x => x.vu === 'derp12345'), 'pets stay off until opted in');
  const petsOn = S.filterReddit(sample, { optIn: ['pets'] });
  assert.ok(petsOn.some(x => x.vu === 'derp12345'));
});

test('YouTube lane mixes music and allowlisted education, about 1 in 5', () => {
  const S = loadShorts();
  assert.equal(S.isEduSource('yt-nasa'), true);
  assert.equal(S.isEduSource('fun-kurzgesagt'), true);
  assert.equal(S.isEduSource('yt-ted'), true);
  assert.equal(S.isEduSource('fun-dodo-all'), false);
  const profile = { optIn: ['pets'], pick: null };
  const built = S.buildCatalog({ items: sample }, top40, { optIn: ['pets'] });
  assert.ok(built.music.length === 2);
  assert.ok(built.edu.some(x => x.videoId === 'nasaVid111'));
  assert.ok(built.edu.some(x => x.videoId === 'kurzVid111'));
  assert.ok(!built.edu.some(x => x.videoId === 'dodoVid111'), 'non-allowlisted channels stay out');
  const yt = built.mixed.filter(x => x.kind === 'youtube');
  const rd = built.mixed.filter(x => x.kind === 'reddit');
  assert.ok(rd.length >= 1);
  assert.ok(yt.length >= 1);
  /* With a handful of Reddit clips, the 5th slot is YouTube. */
  const manyR = Array.from({ length: 20 }, (_, i) => ({ vk: 'reddit', vu: 'vu' + String(i).padStart(8, '0'), t: 'Clip ' + i, url: 'https://www.reddit.com/r/aww/comments/x/' + i, topic: 'nature', vdur: 10 }));
  const mixed = S.buildCatalog({ items: manyR.concat(sample) }, top40, { optIn: ['pets'] }).mixed;
  const ytIdx = mixed.map((x, i) => x.kind === 'youtube' ? i : -1).filter(i => i >= 0);
  assert.ok(ytIdx.includes(4), 'the fifth item is a YouTube clip');
  const ratio = mixed.filter(x => x.kind === 'youtube').length / mixed.length;
  assert.ok(ratio > 0.1 && ratio < 0.35, 'YouTube is about 1 in 5, got ' + ratio);
  const lanes = new Set(mixed.filter(x => x.kind === 'youtube').map(x => x.lane));
  assert.ok(lanes.has('music') && lanes.has('edu'), 'music and education both appear in the lane');
});

test('the player keeps swipe, close, back, Reddit CMAF audio and a YouTube ads label', () => {
  assert.match(js, /data-sh-reel/);
  assert.match(css, /scroll-snap-type:\s*y\s+mandatory/);
  assert.match(js, /data-sh-close/);
  assert.match(js, /history\.pushState\(\{ ibShorts: 1 \}/);
  assert.match(js, /popstate/);
  assert.match(js, /CMAF_720/);
  assert.match(js, /CMAF_AUDIO_128/);
  assert.match(js, /v\.redd\.it/);
  assert.match(js, /youtube-nocookie\.com\/embed/);
  assert.match(js, /YouTube · may show ads/);
  assert.match(css, /\.sh-ytlab/);
  assert.match(js, /sh-credit/);
  assert.match(stories, /CMAF_AUDIO_128/);
  assert.match(js, /preload = \(j === i \|\| j === i \+ 1\) \? 'auto'/);
});


test('r/BeAmazed is boosted to about one in three and stays family-safe', () => {
  const S = loadShorts();
  assert.equal(S.isAllowedSub('BeAmazed'), true);
  assert.equal(S.BOOST_SUBS.beamazed, 1);
  assert.equal(S.BOOST_EVERY, 3);
  const amaz = Array.from({ length: 6 }, (_, i) => ({
    vk: 'reddit', vu: 'amaz' + String(i).padStart(7, '0'), t: 'A surprising clip ' + i,
    url: 'https://www.reddit.com/r/BeAmazed/comments/x/' + i, topic: 'learn', vdur: 20
  }));
  const other = Array.from({ length: 18 }, (_, i) => ({
    vk: 'reddit', vu: 'aww' + String(i).padStart(8, '0'), t: 'A sleepy puppy ' + i,
    url: 'https://www.reddit.com/r/aww/comments/x/' + i, topic: 'nature', vdur: 12
  }));
  const blocked = [{
    vk: 'reddit', vu: 'iaf0000001', t: 'A cool fact',
    url: 'https://www.reddit.com/r/interestingasfuck/comments/x/fact', topic: 'learn', vdur: 15
  }];
  const built = S.buildCatalog({ items: amaz.concat(other).concat(blocked) }, { songs: [] }, { pick: ['learn', 'nature'], optIn: [] });
  assert.equal(built.reddit.filter(x => x.credit === 'r/BeAmazed').length, 6);
  assert.ok(!built.reddit.some(x => /interestingasfuck/i.test(x.credit)), 'crude subs stay out');
  const flags = built.mixed.map(x => S.isBoosted(x));
  assert.ok(flags[0] && flags[3] && flags[6], 'BeAmazed appears every third slot');
  const ratio = flags.filter(Boolean).length / built.mixed.length;
  assert.ok(ratio > 0.2 && ratio < 0.4, 'boost is about 1 in 3, got ' + ratio);
  assert.ok(flags.filter(Boolean).length === 6, 'every BeAmazed clip is still shown');
});
