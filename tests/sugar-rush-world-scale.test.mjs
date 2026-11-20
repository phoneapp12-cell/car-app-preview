import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('../feed/sugar-rush.js');
const game = globalThis.SugarRush;
const map = readFileSync(new URL('../feed/sugar-rush-map.js', import.meta.url), 'utf8');
const src = readFileSync(new URL('../feed/sugar-rush.js', import.meta.url), 'utf8');
const svg = game.nzMapSvg();

function pathBox(d) {
  const nums = [...d.matchAll(/(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)/g)].map((m) => [+m[1], +m[2]]);
  const xs = nums.map((p) => p[0]), ys = nums.map((p) => p[1]);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), x: Math.min(...xs), y: Math.min(...ys) };
}

test('one world projection: the map is the world area, not a tall New Zealand page', () => {
  assert.match(svg, /viewBox="-600 1040 1420 1210"/);
  assert.equal(game.MAP_Y0, 1040);
  assert.ok(!svg.includes('<rect x="16" y="1236"'), 'the Pacific inset panel is gone');
  assert.ok(!/class="sr-pacific"[^>]*>\s*<rect/.test(svg), 'Pacific islands are drawn without a panel');
});

test('New Zealand is drawn at its true size next to Australia', () => {
  const lands = [...svg.matchAll(/<path fill="url\(#sr-land\)" stroke="#fff" stroke-width="1\.4" stroke-linejoin="round" d="([^"]+)"/g)].map((m) => pathBox(m[1]));
  assert.equal(lands.length, 2, 'North and South Islands');
  const nzH = Math.max(...lands.map((b) => b.y + b.h)) - Math.min(...lands.map((b) => b.y));
  const aus = svg.match(/fill="url\(#sr-land\)" stroke="#fff" stroke-width="8" stroke-linejoin="round" d="([^"]+)"/);
  const ausBox = pathBox(aus[1]);
  // Real spans: NZ ~ 34.4°S–46.7°S (12.3° = 135 units), Australia ~ 10.7°S–39.1°S (28.4° = 312 units).
  assert.ok(nzH > 110 && nzH < 160, `NZ is about 135 map units tall (got ${nzH.toFixed(1)})`);
  assert.ok(ausBox.h > 280 && ausBox.h < 340, `Australia is about 312 map units tall (got ${ausBox.h.toFixed(1)})`);
  assert.ok(nzH < ausBox.h * 0.55, 'New Zealand is well under half Australia\'s height');
});

test('every stop sits at its real place (cities only nudged a little apart inside their country)', () => {
  game.MAP_STOPS.forEach((s, i) => {
    if (s.inset) return;
    const real = game.worldXY(s.lat, s.lon);
    const d = Math.hypot(real.x - s.x, real.y - s.y);
    assert.ok(d <= 10, `${i + 1} ${s.place} is within ~100 km of its real place (off by ${d.toFixed(1)})`);
  });
  const sydney = game.MAP_STOPS[19], auckland = game.MAP_STOPS[3], tokyo = game.MAP_STOPS[69], tonga = game.MAP_STOPS[17];
  assert.ok(auckland.x > sydney.x + 150 && Math.abs(auckland.y - sydney.y) < 60, 'Auckland is east of Sydney across the Tasman');
  assert.ok(tonga.x > auckland.x && tonga.y < auckland.y, 'Tonga is north-east of Auckland');
  assert.ok(tokyo.y < sydney.y - 600, 'Tokyo is far north of Sydney');
});

test('small island nations get a minimum visible size but are never inflated beyond it', () => {
  for (const q of game.PACIFIC_ISLES) assert.ok(q[3] <= 3.6 && q[4] <= 2.6, `${q[0]} stays at about the minimum visible size`);
  const isles = [...svg.matchAll(/<ellipse cx="[^"]+" cy="[^"]+" rx="([\d.]+)" ry="([\d.]+)" transform="rotate\([^)]*\)" fill="url\(#sr-candy/g)].map((m) => [+m[1], +m[2]]);
  assert.ok(isles.length >= 25);
  isles.slice(12).forEach(([rx, ry]) => assert.ok(rx <= 2.4 && ry <= 1.5, 'Micronesian islands, Nauru and Kiribati stay at the minimum size'));
});

test('world view shows every country with tappable badges and the route in game order', () => {
  assert.match(map, /var WORLD = '__world'/);
  assert.match(map, /country === WORLD \|\| s\.country === country/, 'the world route links all stops in game order');
  assert.match(map, /🌏 World map/);
  assert.match(map, /function spreadWorldBadges/);
  assert.match(map, /gotoCountry\(lv\.dataset\.country\)/, 'tapping a badge opens that country');
  assert.match(map, /minBox = 130 \* perUnit/, 'single-stop countries show their neighbourhood at true scale');
  assert.match(map, /\.stops \.lv \.gotbadge\{scale:calc\(1 \/ var\(--sr-k, 1\)\)\}/);
  assert.match(src, /closeScaleFit/, 'car and plane travel zoom to fit short true-scale trips');
});

test('route strokes during travel are sized in screen px for the true-scale map', () => {
  const js = readFileSync(new URL('../feed/sugar-rush.js', import.meta.url), 'utf8');
  const art = readFileSync(new URL('../feed/sugar-rush-map.js', import.meta.url), 'utf8');
  assert.match(js, /function fitRouteStrokes\(pxPerUnit\)/);
  assert.match(js, /fitRouteStrokes\(closeScaleFit \* sx\)/);
  assert.match(art, /winPath\.style\.strokeWidth = \(8 \/ unit\)/);
});

test('every route waypoint stays on the world map', () => {
  const SR = game;
  const xs = [], ys = [];
  SR.MAP_STOPS.forEach((s) => { [s].concat(s.via || []).forEach((p) => { xs.push(p.x); ys.push(p.y); }); });
  assert.ok(Math.min(...ys) >= SR.MAP_Y0 && Math.max(...ys) <= SR.MAP_Y0 + SR.MAP_VH, 'y inside the map');
  assert.ok(Math.min(...xs) >= SR.MAP_X0 && Math.max(...xs) <= SR.MAP_X0 + SR.MAP_VW, 'x inside the map');
});
