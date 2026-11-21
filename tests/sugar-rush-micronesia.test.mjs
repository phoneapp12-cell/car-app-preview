import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadSugarRush() {
  const ctx = {
    console, Intl, Date, Math, URL, Set, Map, Object, Number, String, Array,
    encodeURIComponent, decodeURIComponent
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('feed/sugar-rush.js', 'utf8'), ctx, {
    filename: 'feed/sugar-rush.js'
  });
  return ctx.SugarRush;
}

const SR = loadSugarRush();

const NEW_STOPS = [
  { n: 71, place: 'Koror', country: 'Palau', scene: 'koror' },
  { n: 72, place: 'Palikir', country: 'Federated States of Micronesia', scene: 'palikir' },
  { n: 73, place: 'Majuro', country: 'Marshall Islands', scene: 'majuro' },
  { n: 74, place: 'Yaren', country: 'Nauru', scene: 'yaren' },
  { n: 75, place: 'South Tarawa', country: 'Kiribati', scene: 'south-tarawa' }
];

test('levels 71–75 extend the route, atlas, and progression cap', () => {
  assert.equal(SR.LEVELS.length, 75);
  assert.equal(SR.MAP_STOPS.length, 75);
  assert.equal(SR.MAP_COUNTRIES.length, 75);
  assert.equal(SR.LV_COUNT, 75);
  assert.equal(new Set(SR.levelIds()).size, 75);
  assert.deepEqual(Array.from(SR.MAP_STOPS.slice(68).map(stop => stop.place)), [
    'Seoul', 'Tokyo', 'Koror', 'Palikir', 'Majuro', 'Yaren', 'South Tarawa'
  ]);
  assert.deepEqual(Array.from(SR.MAP_COUNTRIES.slice(68)), [
    'South Korea', 'Japan', 'Palau', 'Federated States of Micronesia',
    'Marshall Islands', 'Nauru', 'Kiribati'
  ]);

  for (const expected of NEW_STOPS) {
    const stop = SR.stopForLevel(expected.n);
    const geo = SR.ausXY(stop.lat, stop.lon);
    assert.equal(stop.n, expected.n);
    assert.equal(stop.place, expected.place);
    assert.equal(SR.countryForLevel(expected.n), expected.country);
    assert.ok(Math.hypot(stop.x - geo.x, stop.y - geo.y) < 1.5, expected.place + ' pin follows its real coordinates');
    assert.equal(SR.sceneFor(expected.n).id, expected.scene);
  }
  assert.equal(SR.countryForLevel(76), '');
  assert.ok(SR.nzMapSvg().includes('WESTERN PACIFIC'));
});

test('new stages use varied, winnable objectives and original animated island scenes', () => {
  const goals = [
    ['jelly', 'bub'],
    ['ings', 'ice'],
    ['recipe-candy', 'recipe-candy', 'recipe-special', 'recipe-special'],
    ['hidden'],
    ['flow', 'bub', 'boss']
  ];
  for (let i = 0; i < NEW_STOPS.length; i++) {
    const expected = NEW_STOPS[i];
    const lv = SR.LEVELS[expected.n - 1];
    const intro = SR.levelIntro(expected.n);
    assert.deepEqual(Array.from(SR.goalCounts(lv).map(goal => goal.kind)), goals[i]);
    assert.equal(intro.place, expected.place);
    assert.ok(intro.detail.includes(lv.moves + ' moves'));
    assert.ok(SR.tryBeat(lv, 16) >= 1, 'solver can beat level ' + expected.n);

    const art = SR.sceneSvg(expected.n);
    const sprites = SR.sceneFor(expected.n).sprites;
    assert.ok(art.includes('data-scene=' + JSON.stringify(expected.scene)));
    assert.ok(art.length > 1000, expected.place + ' has an illustrated scene');
    assert.ok(sprites.some(sprite => sprite.cls === 'sc-drift'), expected.place + ' has drifting animation');
    assert.ok(sprites.some(sprite => sprite.cls === 'sc-bob'), expected.place + ' has bobbing animation');
  }
});

test('Postcard Hunt and established Australia/India audio mappings remain unchanged', () => {
  assert.deepEqual(Array.from(SR.POSTCARD_COUNTRIES), [
    'New Zealand', 'Cook Islands', 'Tonga', 'Samoa', 'Australia', 'Papua New Guinea',
    'Solomon Islands', 'Vanuatu', 'Fiji', 'New Caledonia', 'Indonesia', 'Vietnam',
    'Malaysia', 'Thailand', 'Myanmar', 'India', 'Nepal', 'Bangladesh', 'Sri Lanka',
    'Singapore', 'Cambodia', 'Philippines', 'Laos', 'Bhutan', 'Pakistan', 'Afghanistan',
    'Iran', 'Uzbekistan', 'Kazakhstan', 'China'
  ]);
  assert.deepEqual(Array.from(SR.SONG_PLAN.aussie), [20, 21, 22, 23, 24, 25, 32, 33]);
  assert.deepEqual(Array.from(SR.SONG_PLAN.india), [38, 39, 46, 47]);
  assert.deepEqual(Array.from(SR.SONG_PLAN.intense), [13, 15, 19, 52, 75]);
  for (const n of SR.SONG_PLAN.aussie) assert.equal(SR.gameTrack(n), 'sugar-rush-aussie.mp3');
  for (const n of SR.SONG_PLAN.india) assert.equal(SR.gameTrack(n), 'sugar-rush-india.mp3');
  for (const n of [69, 70, 71, 72, 73, 74]) {
    assert.equal(SR.songMood(n), 'upbeat');
    assert.equal(SR.gameTrack(n), 'sugar-rush-song.m4a');
  }
  assert.equal(SR.LEVELS[74].hard, 1);
  assert.equal(SR.songMood(75), 'intense');
  assert.equal(SR.gameTrack(75), 'sugar-rush-travel.m4a');
});

test('release assets and service worker are synchronized at 1.9.307', () => {
  const shell = fs.readFileSync('feed/index.html', 'utf8');
  const game = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  const app = fs.readFileSync('feed/app.js', 'utf8');
  const worker = fs.readFileSync('feed/sw.js', 'utf8');
  assert.ok(shell.includes('sights.js?v=1.9.307'));
  assert.ok(game.includes('sugar-rush.js?v=1.9.307'));
  assert.ok(game.includes('scores.js?v=1.9.307'));
  assert.ok(app.includes("const APP_VERSION = '1.9.307'"));
  assert.ok(worker.includes("const VERSION = '1.9.307'"));
  for (const asset of ['lake.webp', 'mountains.webp', 'volcano.webp']) {
    assert.ok(worker.includes('img/sugar-rush/landmarks/' + asset), `${asset} is cached by the release worker`);
  }
});

test('map chrome is pinned to the small viewport so the footer cannot loop', () => {
  const html = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  const onmap = html.match(/body\.onmap\s*\{[^}]+\}/);
  assert.ok(onmap, 'body.onmap rule exists');
  assert.match(onmap[0], /height:\s*100svh/);
  assert.match(onmap[0], /min-height:\s*100svh/);
  assert.match(onmap[0], /max-height:\s*100svh/);
  assert.doesNotMatch(onmap[0], /100dvh/);
  const mapview = html.match(/\.mapview\s*\{[^}]+\}/);
  assert.ok(mapview, 'mapview rule exists');
  assert.match(mapview[0], /overflow:\s*hidden/);
  assert.doesNotMatch(mapview[0], /overflow:\s*auto/);
  const mapJs = fs.readFileSync('feed/sugar-rush-map.js', 'utf8');
  assert.match(mapJs, /\.mapview\{background:#7ee8f5;overflow:hidden/);
});
