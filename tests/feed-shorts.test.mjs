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
  { vid: 'dodoVid111', t: 'A rescued puppy', src: 'fun-dodo-all', topic: 'nature', url: 'https://www.youtube.com/watch?v=dodoVid111' },
  { vk: 'peertube', vu: 'ptclip001', t: 'Satisfying 3D-Printed Fidget Toys', ext: 'https://tube.blueben.net/download/streaming-playlists/hls/videos/24931bc6-5e83-49e3-9c11-2dd6cf295103-480-fragmented.mp4', url: 'https://tube.blueben.net/videos/watch/24931bc6-5e83-49e3-9c11-2dd6cf295103', topic: 'fun', src: 'pt-blueben', vdur: 43, vw: 480, vh: 852, sn: 'BluebenTube' }
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
  assert.ok(built.mixed.every(it => it.kind === 'reddit' || it.kind === 'youtube' || it.kind === 'mp4'));
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

test('Shorts keeps Reddit clips and leaves YouTube out of the reel', () => {
  const S = loadShorts();
  const built = S.buildCatalog({ items: sample }, top40, { optIn: ['pets'] });
  assert.ok(built.mixed.length >= 1);
  assert.ok(built.mixed.every(x => x.kind !== 'youtube' && !S.isYoutubeClip(x)), 'no YouTube in the reel');
  assert.ok(built.mixed.some(x => x.kind === 'reddit'));
  assert.equal(built.youtube.length, 0);
  /* Education and Top 40 lists can still be built from the feed, but they are not mixed in. */
  assert.ok(built.music.length === 2);
  assert.ok(built.edu.some(x => x.videoId === 'nasaVid111'));
  const manyR = Array.from({ length: 20 }, (_, i) => ({ vk: 'reddit', vu: 'vu' + String(i).padStart(8, '0'), t: 'Clip ' + i, url: 'https://www.reddit.com/r/aww/comments/x/' + i, topic: 'nature', vdur: 10 }));
  const mixed = S.buildCatalog({ items: manyR.concat(sample) }, top40, { optIn: ['pets'] }).mixed;
  assert.equal(mixed.filter(x => x.kind === 'youtube').length, 0);
  assert.ok(mixed.length >= 20);
  assert.ok(S.isYoutubeClip({ kind: 'youtube', videoId: 'abc' }));
  assert.ok(S.isYoutubeClip({ url: 'https://www.youtube.com/watch?v=abcdefghijk' }));
  assert.equal(S.isYoutubeClip({ kind: 'reddit', vu: 'ok1234567', url: 'https://www.reddit.com/r/aww/comments/x/k/' }), false);
});

test('the player keeps swipe, close, back and Reddit CMAF audio', () => {
  assert.match(js, /data-sh-reel/);
  assert.match(css, /scroll-snap-type:\s*y\s+mandatory/);
  assert.match(js, /data-sh-close/);
  assert.match(js, /history\.pushState\(\{ ibShorts: 1 \}/);
  assert.match(js, /popstate/);
  assert.match(js, /CMAF_720/);
  assert.match(js, /CMAF_AUDIO_128/);
  assert.match(js, /v\.redd\.it/);
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

test('Braynix Games clips from the local catalog get the early slots and stay family-safe', () => {
  const S = loadShorts();
  assert.equal(S.BRAYNIX_AUTHOR, 'braynixgames');
  const pack = {
    credit: 'Braynix Games',
    author: 'braynixgames',
    clips: [
      { vu: '4t9c7bghhy1i1', title: 'Right or Left Rotation? Comment plz', sub: 'opticalillusions', url: 'https://www.reddit.com/r/opticalillusions/comments/1xxmo3p/right_or_left_rotation_comment_plz/', vdur: 41, width: 1080, height: 1920 },
      { vu: 'vtebjwhmhj2i1', title: 'Left or right || Top or Bottom? Comment plz', sub: 'opticalillusions', url: 'https://www.reddit.com/r/opticalillusions/comments/1y05fd4/left_or_right_top_or_bottom_comment_plz/', vdur: 48, width: 1080, height: 1920 },
      { vu: 'landscap90xx', title: '90 SECS PUZZLE', sub: 'opticalillusions', url: 'https://www.reddit.com/r/opticalillusions/comments/x/landscape/', vdur: 90, width: 1280, height: 720 },
      { vu: 'toolong99999', title: 'A long puzzle', sub: 'opticalillusions', url: 'https://www.reddit.com/r/opticalillusions/comments/x/long/', vdur: 98, width: 576, height: 1280 }
    ]
  };
  const feedItems = [
    { vk: 'reddit', vu: '4t9c7bghhy1i1', t: 'Right or Left Rotation? Comment plz', url: 'https://www.reddit.com/r/opticalillusions/comments/1xxmo3p/right_or_left_rotation_comment_plz/', topic: 'games', src: 'fun-illusions', vdur: 41 },
    { vk: 'reddit', vu: 'aww00000001', t: 'A sleepy puppy', url: 'https://www.reddit.com/r/aww/comments/x/a_sleepy_puppy/', topic: 'nature', vdur: 12 },
    { vk: 'reddit', vu: 'amaz0000001', t: 'A surprising clip', url: 'https://www.reddit.com/r/BeAmazed/comments/x/surprising/', topic: 'learn', vdur: 20 },
    { vk: 'reddit', vu: 'aww00000002', t: 'Another puppy', url: 'https://www.reddit.com/r/aww/comments/x/another/', topic: 'nature', vdur: 14 }
  ];
  const built = S.buildCatalog({ items: feedItems }, { songs: [] }, { pick: ['games', 'nature', 'learn'], optIn: [] }, pack);
  assert.equal(built.braynix.length, 2, 'landscape and over-long clips stay out');
  assert.ok(S.isBraynix(built.mixed[0], pack) && S.isBraynix(built.mixed[1], pack), 'Braynix clips open the reel');
  assert.ok(built.mixed[0].credit.includes('Braynix Games'));
  assert.equal(built.mixed.filter(x => x.vu === '4t9c7bghhy1i1').length, 1, 'the feed copy is not duplicated');
  const after = built.mixed.slice(2);
  assert.ok(after.length && S.isBoosted(after[0]), 'BeAmazed still gets the first leftover slot');
  assert.ok(built.mixed.every(x => !/trump|putin|modi/i.test((x.title || '') + ' ' + (x.credit || ''))));
});

test('a loved Short boosts similar clips without dropping the Braynix seed or BeAmazed', () => {
  const S = loadShorts();
  const pack = { clips: [
    { vu: '4t9c7bghhy1i1', title: 'Right or Left Rotation? Comment plz', sub: 'opticalillusions', url: 'https://www.reddit.com/r/opticalillusions/comments/1xxmo3p/right_or_left_rotation_comment_plz/', vdur: 41, width: 1080, height: 1920 }
  ] };
  const items = [
    { vk: 'reddit', vu: '4t9c7bghhy1i1', t: 'Right or Left Rotation? Comment plz', url: 'https://www.reddit.com/r/opticalillusions/comments/1xxmo3p/right_or_left_rotation_comment_plz/', topic: 'games', vdur: 41 },
    { vk: 'reddit', vu: 'pupaaaaaaa', t: 'A sleepy puppy', url: 'https://www.reddit.com/r/aww/comments/x/sleepy/', topic: 'nature', vdur: 12 },
    { vk: 'reddit', vu: 'pupbbbbbbb', t: 'A golden puppy runs', url: 'https://www.reddit.com/r/aww/comments/x/golden/', topic: 'nature', vdur: 11 },
    { vk: 'reddit', vu: 'pupccccccc', t: 'Dog treats at home', url: 'https://www.reddit.com/r/rarepuppers/comments/x/treats/', topic: 'dogs', vdur: 13 },
    { vk: 'reddit', vu: 'amazzzzzzz', t: 'A surprising clip', url: 'https://www.reddit.com/r/BeAmazed/comments/x/s/', topic: 'learn', vdur: 20 },
    { vk: 'reddit', vu: 'craft11111', t: 'A tidy shelf', url: 'https://www.reddit.com/r/Antiques/comments/x/shelf/', topic: 'collect', vdur: 15 },
    { vk: 'reddit', vu: 'craft22222', t: 'An old clock', url: 'https://www.reddit.com/r/Antiques/comments/x/clock/', topic: 'collect', vdur: 16 },
    { vk: 'reddit', vu: 'scuba11111', t: 'A calm reef', url: 'https://www.reddit.com/r/scuba/comments/x/reef/', topic: 'outdoors', vdur: 18 }
  ];
  const loves = { pupaaaaaaa: { vu: 'pupaaaaaaa', sub: 'aww', author: '', src: '', topic: 'nature', title: 'A sleepy puppy' } };
  const built = S.buildCatalog({ items }, { songs: [] }, { pick: ['games', 'nature', 'dogs', 'learn', 'collect', 'outdoors'], optIn: [] }, pack, loves);
  assert.ok(S.isBraynix(built.mixed[0], pack), 'Braynix still opens the reel');
  const tail = built.mixed.slice(1);
  assert.ok(tail.some(S.isBoosted), 'BeAmazed is still in the mix');
  const awwish = tail.filter(x => /aww|rarepuppers|puppy|Dog /i.test((x.credit || '') + ' ' + (x.title || ''))).length;
  assert.ok(awwish >= 2, 'loved-alike clips are kept and boosted, got ' + awwish);
  assert.ok(tail.some(x => /Antiques|scuba/i.test(x.credit || '')), 'other sources still appear');
  const recs = Object.values(loves);
  assert.ok(S.loveScore({ vu: 'pupbbbbbbb', sub: 'aww', title: 'A golden puppy runs', topic: 'nature', credit: 'r/aww' }, recs) > 0);
  const it = { id: 'pupaaaaaaa', vu: 'pupaaaaaaa', title: 'A sleepy puppy', credit: 'r/aww' };
  const map = S.setLoved(it, true, {});
  assert.equal(S.isLoved(it, map), true);
  const off = S.setLoved(it, false, map);
  assert.equal(S.isLoved(it, off), false);
});

test('double-tap loves a Short and a single tap still goes to pause', () => {
  const S = loadShorts();
  const js = fs.readFileSync(path.join(root, 'feed/shorts.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'feed/shorts.css'), 'utf8');
  assert.match(js, /data-sh-love/);
  assert.match(js, /lastTapAt/);
  assert.match(js, /showHeartBurst/);
  assert.match(js, /loveVisible\(true/);
  assert.match(js, /togglePause\(slide\)/);
  assert.match(css, /\.sh-love/);
  assert.match(css, /@keyframes sh-burst/);
  const fam = fs.readFileSync(path.join(root, 'feed/family.js'), 'utf8');
  assert.match(fam, /shortsLoves/);
  const sources = fs.readFileSync(path.join(root, 'worker/src/sources.js'), 'utf8');
  assert.match(sources, /fun-braynix-oi/);
  assert.match(sources, /fun-braynix-puzzle/);
  assert.match(sources, /fun-braynix-user/);
  assert.match(sources, /author: 'braynixgames'/);
  const worker = fs.readFileSync(path.join(root, 'worker/src/worker.js'), 'utf8');
  assert.match(worker, /src\.author/);
  assert.match(worker, /portraitOnly/);
  assert.match(sources, /modi\|putin\|raga/);
  const puzzle = S.filterReddit([{ vk: 'reddit', vu: 'pz11111111', t: 'Which cup hides the ball?', url: 'https://www.reddit.com/r/puzzle/comments/x/cup/', topic: 'games', vdur: 20, by: 'braynixgames' }], { pick: ['games'], optIn: [] });
  assert.equal(puzzle.length, 1, 'Braynix r/puzzle clips are kept even though the sub is not allowlisted');
  assert.match(puzzle[0].credit, /Braynix Games/);
});

test('playAt does not reset a Short that is already playing', () => {
  const js = fs.readFileSync(path.join(root, 'feed/shorts.js'), 'utf8');
  assert.match(js, /if \(video\.getAttribute\('src'\) !== src && video\.currentSrc !== src\) video\.src = src/);
  assert.match(js, /if \(i === playingI\)/);
  assert.match(js, /if \(i >= 0 && i !== playingI\) playAt\(i\)/);
});

test('PeerTube portrait MP4s are woven into Shorts and stay family-safe', () => {
  const S = loadShorts();
  const pts = S.filterPeertube(sample, { optIn: ['pets'] });
  assert.equal(pts.length, 1);
  assert.equal(pts[0].kind, 'mp4');
  assert.match(pts[0].url, /\.mp4$/);
  const built = S.buildCatalog({ items: sample }, top40, { optIn: ['pets'] });
  assert.ok(built.mixed.some(it => it.kind === 'mp4' && it.src === 'pt-blueben'));
  const blocked = S.filterPeertube([{ ...sample[sample.length - 1], t: 'NSFW fidget' }], { optIn: ['pets'] });
  assert.equal(blocked.length, 0);
});

