import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');

test('Sugar Rush and other games skip requestFullscreen in an installed PWA', () => {
  const play = read('feed/play.js');
  const tet = read('feed/tetris.js');
  for (const src of [play, tet]) {
    assert.match(src, /function isPwaShell/);
    assert.match(src, /display-mode: standalone/);
    assert.match(src, /display-mode: fullscreen/);
    assert.match(src, /navigator\.standalone/);
    assert.match(src, /requestFullscreen/);
  }
  assert.match(play, /if \(!isPwaShell\(\)\)/);
  assert.match(tet, /!isPwaShell\(\)/);
  // Games still auto-fill the phone via artfull / setFull(true)
  assert.match(play, /kind === 'sugar' \|\| kind === 'scrabble'\) setFull\(true\)/);
  assert.match(play, /setFull\(true\)/);
});

test('My App and Info Book manifests already open as standalone PWAs', () => {
  const app = JSON.parse(read('manifest.webmanifest'));
  const feed = JSON.parse(read('feed/manifest.webmanifest'));
  assert.equal(app.display, 'standalone');
  assert.equal(feed.display, 'standalone');
});
