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

function loadShorts() {
  const ctx = { console, URL, Set, Map, Object, Number, String, Array, Date, Math, JSON, encodeURIComponent };
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

test('the Today streak tile is replaced by a Shorts tile', () => {
  assert.match(today, /function shortsTile/);
  assert.doesNotMatch(today, /function streakTile/);
  assert.match(today, /title: 'Shorts'/);
  assert.match(today, /go: 'shorts'/);
  assert.match(today, /🎬/);
  assert.match(today, /const tr = triviaTile\(\), sh = shortsTile\(\)/);
  assert.match(today, /data-today-bit="\$\{sh\.go\}"/);
  assert.doesNotMatch(today, /data-today-bit="\$\{st\.go\}"/);
  assert.doesNotMatch(today, /k === 'streak'/);
  assert.match(today, /k === 'shorts' && typeof ibShortsOpen === 'function'/);
  assert.match(html, /shorts\.css\?v=/);
  assert.match(html, /shorts\.js\?v=/);
  assert.match(sw, /shorts\.css\?v=/);
  assert.match(sw, /shorts\.js\?v=/);
});

test('portrait filter keeps only taller-than-wide clips', () => {
  const S = loadShorts();
  assert.equal(S.isPortrait(720, 1280), true);
  assert.equal(S.isPortrait(1080, 1920), true);
  assert.equal(S.isPortrait(9, 16), true);
  assert.equal(S.isPortrait(1280, 720), false);
  assert.equal(S.isPortrait(1920, 1080), false);
  assert.equal(S.isPortrait(1080, 1080), false);
  assert.equal(S.isPortrait(0, 1280), false);
  const mixed = [
    { title: 'Ocean', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/51500/51500-720.mp4' },
    { title: 'Wide beach', width: 1280, height: 720, url: 'https://assets.mixkit.co/videos/4064/4064-720.mp4' },
    { title: 'Square', width: 1080, height: 1080, url: 'https://assets.mixkit.co/videos/x/x-720.mp4' }
  ];
  const kept = S.filterPortrait(mixed);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].title, 'Ocean');
});

test('the curated fallback is portrait, ad-free, and family-friendly', () => {
  const S = loadShorts();
  assert.ok(S.FALLBACK.length >= 8, 'enough clips to swipe through');
  const kept = S.filterPortrait(S.FALLBACK);
  assert.equal(kept.length, S.FALLBACK.length, 'every fallback clip already passes the portrait filter');
  for (const it of S.FALLBACK) {
    assert.equal(S.isPortrait(it.width, it.height), true, it.id + ' is portrait');
    assert.equal(S.isDirectVideo(it.url), true, it.id + ' is a direct file');
    assert.equal(S.isAllowedTopic(it.title), true, it.id + ' is family-friendly');
    assert.match(it.url, /^https:\/\/assets\.mixkit\.co\/videos\/\d+\/\d+-720\.mp4$/);
    assert.doesNotMatch(it.url, /youtube|youtu\.be|tiktok|instagram/i);
    assert.ok(it.width < it.height);
  }
});

test('embedded ad hosts and sport clips are rejected', () => {
  const S = loadShorts();
  assert.equal(S.isDirectVideo('https://www.youtube.com/embed/abc'), false);
  assert.equal(S.isDirectVideo('https://www.tiktok.com/@x/video/1'), false);
  assert.equal(S.isDirectVideo('https://www.instagram.com/reel/abc'), false);
  assert.equal(S.isDirectVideo('https://youtu.be/abc'), false);
  assert.equal(S.isDirectVideo('https://assets.mixkit.co/videos/1548/1548-720.mp4'), true);
  assert.equal(S.isAllowedTopic('Turquoise waves on the sand'), true);
  assert.equal(S.isAllowedTopic('Alex Ovechkin swing and a miss NHL All-Star'), false);
  assert.equal(S.isAllowedTopic('World Cup stadium football'), false);
  const bad = S.filterPortrait([
    { title: 'Premier League goals', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1/1-720.mp4' },
    { title: 'YouTube short', width: 720, height: 1280, url: 'https://www.youtube.com/watch?v=abc' },
    { title: 'Forest', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/51791/51791-720.mp4' }
  ]);
  assert.deepEqual(bad.map(x => x.title), ['Forest']);
});

test('the player is a swipeable full-screen reel with close, mute, loop and next-only preload', () => {
  assert.match(js, /scroll-snap|data-sh-reel/);
  assert.match(css, /scroll-snap-type:\s*y\s+mandatory/);
  assert.match(css, /scroll-snap-align:\s*start/);
  assert.match(css, /#ib-shorts\{[^}]*position:\s*fixed/);
  assert.match(css, /z-index:\s*12000/);
  assert.match(js, /data-sh-close/);
  assert.match(js, /history\.pushState\(\{ ibShorts: 1 \}/);
  assert.match(js, /popstate/);
  assert.match(js, /v\.loop\s*=\s*true/);
  assert.match(js, /preload = \(j === i \|\| j === i \+ 1\) \? 'auto'/);
  assert.match(js, /j === i \|\| j === i \+ 1 \|\| j === i - 1/);
  assert.match(js, /togglePause/);
  assert.match(js, /data-sh-mute/);
  assert.match(js, /ibShortsOpen/);
  assert.match(js, /playsinline/);
});
