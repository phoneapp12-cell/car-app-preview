import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(join(root, rel), 'utf8');

const assets = read('feed/sugar-rush-intro-assets.js');
const html = read('feed/sugar-rush.html');
const gameJs = read('feed/sugar-rush.js');
const play = read('feed/play.js');
const sw = read('feed/sw.js');
const todayJs = read('feed/today.js');
const todayCss = read('feed/today.css');

const MP4 = 'img/sugar-rush/sugar-rush-intro-95641ff8.mp4';
const WEBM = 'img/sugar-rush/sugar-rush-intro-95641ff8.webm';
const POSTER = 'img/sugar-rush/sugar-rush-intro-poster-75cbb408.jpg';
const SONG = 'img/sugar-rush/sugar-rush-intro-song-95641ff8.m4a';
const SONG_MP3 = 'img/sugar-rush/sugar-rush-intro-song-95641ff8.mp3';
const LONG_MP4 = 'img/sugar-rush/sugar-rush-intro-long-5dab8424.mp4';
const LONG_WEBM = 'img/sugar-rush/sugar-rush-intro-long-5dab8424.webm';
const LONG_POSTER = 'img/sugar-rush/sugar-rush-intro-long-5dab8424-poster.jpg';

test('hashed intro video, song and poster files are in the feed folder', () => {
  for (const rel of [MP4, WEBM, POSTER, SONG, SONG_MP3, LONG_MP4, LONG_WEBM, LONG_POSTER]) {
    assert.ok(existsSync(join(root, 'feed', rel)), rel);
  }
});

test('intro assets use the muxed 7s film, a song fallback, and the long first-open film', () => {
  assert.match(assets, /videoHasAudio:\s*true/);
  assert.ok(assets.includes(MP4) && assets.includes(WEBM) && assets.includes(POSTER));
  assert.ok(assets.includes(SONG) && assets.includes(SONG_MP3));
  assert.ok(assets.includes(LONG_MP4) && assets.includes(LONG_WEBM) && assets.includes(LONG_POSTER));
  assert.match(assets, /longSong:\s*''/);
  assert.match(assets, /longVideoHasAudio:\s*true/);
  assert.match(assets, /sr-long-intro-seen/);
  assert.match(assets, /function pickIntro/);
  assert.match(assets, /useLong = first && hasLongFile/);
  assert.match(assets, /function hasSeenLong/);
  assert.match(assets, /function markLongSeen/);
  assert.match(assets, /root\.playSugarIntro/);
  assert.match(assets, /NotAllowedError|armUnmute|startMuted/);
});

test('the service worker caches the muxed 7s intro and song, not the silent drafts or the long film', () => {
  assert.ok(sw.includes(MP4) && sw.includes(WEBM) && sw.includes(POSTER));
  assert.ok(sw.includes(SONG) && sw.includes(SONG_MP3));
  assert.ok(sw.includes('sugar-rush-intro-assets.js?v='));
  assert.doesNotMatch(sw, /893745cb|865aa326/);
  assert.doesNotMatch(sw, /5dab8424/);
});

test('a fresh open plays an intro; resume does not; first open can use the long cut', () => {
  assert.match(play, /playSugarIntro/);
  assert.match(play, /afterIntro=1/);
  assert.match(play, /resume=1/);
  assert.match(play, /startParentSugarIntro/);
  assert.match(play, /ib-sugar-intro-done/);
  assert.match(gameJs, /isResumeOpen\(\)/);
  assert.match(gameJs, /queryFlag\('resume'\)/);
  assert.match(gameJs, /queryFlag\('afterIntro'\)/);
  assert.match(gameJs, /parentIntroStatus/);
  assert.match(gameJs, /playSugarIntro/);
  assert.ok(html.includes('id="sr-open-intro"') && html.includes('id="sr-intro-skip"'));
  assert.ok(html.includes(MP4) && html.includes(WEBM) && html.includes(POSTER));
});

test('wrapped sweets and the awning stay hidden until a level is on screen', () => {
  assert.match(html, /\.candy-sky\s*\{[^}]*display:\s*none/);
  assert.match(html, /body\.ingame \.candy-sky\s*\{[^}]*display:\s*block/);
  assert.match(html, /html\.sr-wait/);
  assert.match(html, /classList\.add\('sr-wait'\)/);
  assert.match(gameJs, /function revealSugarUi/);
  assert.match(gameJs, /classList\.remove\('sr-wait'\)/);
});

test('gameplay and the map have a tappable Exit and Minimise, and progress is saved', () => {
  assert.match(html, /class="pri" id="mapexit" aria-label="Exit"/);
  assert.match(html, /id="mapmin"/);
  assert.match(html, /id="gameexit"/);
  assert.match(html, /id="gamemin"/);
  assert.match(gameJs, /function requestMinimiseSugar/);
  assert.match(gameJs, /function requestCloseSugar/);
  assert.match(gameJs, /postMessage\(\{ type: 'ib-sugar-minimise' \}/);
  assert.match(gameJs, /postMessage\(\{ type: 'ib-sugar-close' \}/);
  assert.match(gameJs, /function writeLive|function buildLive/);
  assert.match(gameJs, /ib-sugar-live/);
  assert.match(play, /ib-sugar-minimise/);
  assert.match(play, /function minimiseArt/);
  assert.match(play, /function restoreSugar/);
  assert.match(play, /isSugarSession/);
});

test('Pick your icon stays available after the first choice, and the family race is easy to open', () => {
  assert.match(html, /id="pickicon"/);
  assert.match(html, /Pick your icon/);
  assert.match(html, /id="raceicon"/);
  assert.match(html, /id="racefoot"/);
  assert.match(gameJs, /function paintPickIcon/);
  assert.match(gameJs, /Change your icon/);
  assert.match(gameJs, /openIconPicker/);
  assert.match(html, /z-index: 28/);
  assert.match(html, /z-index: 30/);
});

test('the Games tab uses large contrast-safe tiles', () => {
  assert.match(todayJs, /today-gtile/);
  assert.match(todayJs, /data-gplay="scrabble"/);
  assert.match(todayCss, /today-games-hero/);
  assert.match(todayCss, /html\.today-look #feed > \.card\.soon/);
  assert.match(todayCss, /background:linear-gradient\(160deg,#4c1d95,#db2777 55%,#f59e0b\)!important/);
});
