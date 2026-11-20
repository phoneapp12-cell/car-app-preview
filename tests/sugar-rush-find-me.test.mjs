import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const map = readFileSync(new URL('../feed/sugar-rush-map.js', import.meta.url), 'utf8');

test('place card fits a phone: fixed under the title, full width with margins, wraps, has a close button', () => {
  assert.match(map, /\.sr-place-card\{position:fixed;left:10px;right:10px;top:var\(--sr-pc-top,140px\);transform:none;z-index:40;width:auto;max-width:430px/);
  assert.match(map, /\.sr-pc-name\{overflow-wrap:anywhere/);
  assert.match(map, /\.sr-pc-list li span\{min-width:0;overflow-wrap:anywhere\}/);
  assert.match(map, /data-sr-place="close" aria-label="Close">×/);
  assert.ok(!map.includes("'#map.sr-placing .sr-country-card{display:none}'"), 'the country title stays visible');
  assert.match(map, /function clearStop\(n, card\)/, 'tapped stop is slid clear of the card');
});

test('the current level is unmissable', () => {
  assert.match(map, /"You're here · Level " \+ here\.dataset\.n/);
  assert.match(map, /id = 'sr-level-chip'/);
  assert.match(map, /'<b>Level ' \+ h\.n \+ '<\/b><span>· '/);
  assert.match(map, /class="sr-lc-play">▶ Play/);
  assert.match(map, /ui\.openLevel\(h\.n\)/);
  assert.match(map, /\.stops \.lv \.pin \.no\{font:900 10px/, 'every stop shows its number');
  assert.match(map, /◎ Find me/);
  assert.match(map, /function openOnMyLevel\(\)/, 'the map opens on my level');
  assert.ok(!map.includes("'.mapstage.sr-world-view .sr-star{display:none}'"), 'world view shows the star');
});

test('pins sit on the route and the zoom is phone friendly', () => {
  assert.match(map, /\.mapstage \.stops\.path\{margin:0\}/);
  assert.match(map, /Math\.min\(scale, 7\)/);
  assert.match(map, /stage\.style\.transform = 'translate\(' \+ tx/);
  assert.match(map, /herePin\.dataset\.country === country/);
});

test('reopening the map never leaves the view scrolled off into empty sea', () => {
  assert.match(map, /if \(view\.scrollLeft \|\| view\.scrollTop\) \{ view\.scrollLeft = 0; view\.scrollTop = 0; \}/);
});
