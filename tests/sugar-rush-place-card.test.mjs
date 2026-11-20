import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
require('../feed/sugar-rush.js');
const game = globalThis.SugarRush;
const mapSrc = readFileSync(new URL('../feed/sugar-rush-map.js', import.meta.url), 'utf8');
const gameSrc = readFileSync(new URL('../feed/sugar-rush.js', import.meta.url), 'utf8');

function loadMap() {
  const win = {};
  const doc = { readyState: 'loading', addEventListener() {}, getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; } };
  win.document = doc;
  vm.runInNewContext(mapSrc, { window: win, document: doc, MutationObserver: class { observe() {} disconnect() {} }, setInterval() {}, DOMParser: class {} });
  return win.SugarRushMap;
}

const SPORT = /\b(sport|rugby|cricket|football|soccer|netball|league|golf|tennis|surfing|surf |ski|skiing|olympic|stadium|race|racing|match|cup|team|marathon|boxing|polo|kabaddi|sumo)\b/i;

test('every real place on the trail has three short, sport-free unique things', () => {
  const map = loadMap();
  assert.ok(map && typeof map.showPlace === 'function', 'map module exposes the place card');
  assert.equal(game.MAP_STOPS.length, 75);
  for (const stop of game.MAP_STOPS) {
    const facts = map.PLACES[stop.place.toLowerCase()];
    assert.ok(facts, `facts exist for ${stop.place}`);
    assert.equal(facts.length, 3, `three facts for ${stop.place}`);
    const lines = new Set();
    for (const [icon, line] of facts) {
      assert.ok(icon && icon.length <= 4, `${stop.place} fact has a round icon`);
      assert.ok(line.length >= 8 && line.length <= 48, `${stop.place}: "${line}" is one short line`);
      assert.doesNotMatch(line, SPORT, `${stop.place}: "${line}" has no sport`);
      lines.add(line);
    }
    assert.equal(lines.size, 3, `${stop.place} facts are distinct`);
  }
});

test('place card follows the reference style', () => {
  assert.match(mapSrc, /\.sr-place-card\{[^}]*border-radius:24px;background:#fff/, 'white rounded card');
  assert.match(mapSrc, /\.sr-pc-name\{[^}]*color:#159a9c[^}]*text-transform:uppercase/, 'teal caps place name');
  assert.match(mapSrc, /\.sr-pc-rule\{[^}]*border-top:1\.5px solid/, 'thin divider');
  assert.match(mapSrc, /\.sr-pc-head\{[^}]*color:#f2706a/, 'coral heading');
  assert.ok(mapSrc.includes('Three unique things'));
  assert.match(mapSrc, /\.sr-pc-list i\{[^}]*border-radius:50%/, 'round pastel icon chips');
});

test('tapping any stop opens the card; open stops still play from it', () => {
  assert.ok(!gameSrc.includes('b.disabled = !open'), 'locked stops stay tappable for facts');
  assert.match(gameSrc, /b\.classList\.add\('locked'\); b\.setAttribute\('aria-disabled', 'true'\)/);
  assert.match(gameSrc, /SugarRushMap\.showPlace/);
  assert.match(gameSrc, /if \(open\) play\(\);/, 'without the card module an open stop still opens its level');
  assert.ok(mapSrc.includes('data-sr-place="play"') && mapSrc.includes('to unlock'));
});

test('current stop has a glowing red star pin and the player never hides small countries', () => {
  assert.match(mapSrc, /sr-star/);
  assert.match(mapSrc, /M20 50 C20 50 4 31 4 19 A16 16 0 1 1 36 19/, 'teardrop pin');
  assert.match(mapSrc, /fill="#ffd54a"/, 'gold star');
  assert.match(mapSrc, /@keyframes srStarGlow/);
  assert.match(mapSrc, /prefers-reduced-motion:reduce\)\{\.sr-star\{animation:none\}/);
  assert.match(mapSrc, /scale\(' \+ \(1 \/ k\)/, 'racers counter-scale against the country zoom');
  assert.match(mapSrc, /sr-medal\{transform-origin:0 0;scale:calc\(1 \/ var\(--sr-k, 1\)\)\}/, 'badges keep a fixed screen size');
  assert.match(mapSrc, /\.stops \.lv\.here \.sr-medal\{display:none\}/);
});
