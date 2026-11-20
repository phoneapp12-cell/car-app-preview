import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const map = readFileSync(new URL('../feed/sugar-rush-map.js', import.meta.url), 'utf8');
const art = map.slice(map.indexOf('Map art v2'), map.indexOf('function injectStyle()'));

test('map art v2 paints raised pastel land with cliffs, foam and shadow without SVG filters', () => {
  assert.ok(art.length > 2000, 'art pass present');
  for (const id of ['v2-meadow', 'v2-mint', 'v2-peach', 'v2-lilac', 'v2-swirl', 'v2-bush', 'v2-pebbles', 'v2-islet']) {
    assert.ok(art.includes(`id="${id}"`), `${id} is defined`);
  }
  assert.match(art, /n\.removeAttribute\('filter'\)/, 'per-country drop-shadow filters are dropped for phone performance');
  assert.doesNotMatch(art, /<filter|filter="url|setAttribute\('filter'/, 'the art pass adds no SVG filters');
  assert.match(art, /'#d98f7c'/, 'cliff sides');
  assert.match(art, /stroke-width': sw \+ 26/, 'outer foam line');
  assert.match(art, /'#1d7d9c'/, 'soft drop shadow');
  assert.match(art, /svg\.__v2/, 'painted once per map');
  assert.match(art, /isPointInFill/, 'bushes, pebbles and islets are placed on real land or open sea');
});

test('route is one thick pink road per country with cream nodes; the old crossing dotted lines are hidden', () => {
  assert.match(map, /\.mapstage:not\(\.travel-shot\) \.nzsvg\.sr-v2 #sr-future/);
  assert.match(map, /\.mapstage\.travel-shot #sr-v2-route\{display:none\}/, 'car and plane travel keep their own path');
  assert.match(art, /function syncRoute/);
  assert.match(map, /\.stops \.lv \.pin\{[^}]*background:#fff6e4/, 'cream nodes');
  assert.match(map, /\.stops \.lv \.pin::before\{[^}]*inset:-14px/, 'stops keep a finger-sized tap area');
});

test('reference-style badges, title card and corner clouds respect reduced motion', () => {
  assert.match(map, /medal\.innerHTML = '<i aria-hidden="true"><u>' \+ pair\[0\] \+ '<\/u><b>' \+ \(SHORT\[key\] \|\| country\)/);
  assert.match(map, /\.sr-country-card \.sr-bit\+\.sr-bit\{border-left/);
  assert.match(map, /@media \(prefers-reduced-motion:reduce\)\{\.sr-v2-cloud\{animation:none\}\}/);
  assert.match(map, /body:not\(\.onmap\) \.sr-v2-clouds\{display:none\}/);
});
