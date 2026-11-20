import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const html = readFileSync(new URL('../feed/sugar-rush.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../feed/sugar-rush.js', import.meta.url), 'utf8');
const mapModule = readFileSync(new URL('../feed/sugar-rush-map.js', import.meta.url), 'utf8');
const countryTableStart = mapModule.indexOf('var COUNTRIES = {');
const countryTableEnd = mapModule.indexOf('\n  };', countryTableStart);
const countryTable = mapModule.slice(countryTableStart, countryTableEnd);
const iconCountries = new Set([...countryTable.matchAll(/^\s*(?:'([^']+)'|([a-z][a-z ]*)):\s*\[/gm)]
  .map((match) => (match[1] || match[2]).toLowerCase()));
const css = html.match(/<style>([\s\S]*?)<\/style>/i)?.[1] || '';
const require = createRequire(import.meta.url);
require('../feed/sugar-rush.js');
const game = globalThis.SugarRush;

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp('(?:^|\\n)\\s*' + escaped + '\\s*\\{([^}]*)\\}', 'm'))?.[1] || '';
}

test('mobile map scrolling layer stays below the fixed level intro dialog', () => {
  const map = rule('body.onmap #map');
  const overlay = rule('.ov');
  const mapView = rule('.mapview');
  const mapZ = map.match(/(?:^|;)\s*z-index\s*:\s*(\d+)/i);
  const overlayZ = overlay.match(/(?:^|;)\s*z-index\s*:\s*(\d+)/i);

  assert.ok(mapZ, 'the map has an explicit stacking level');
  assert.ok(overlayZ, 'the fixed dialog overlay has an explicit stacking level');
  assert.ok(Number(mapZ[1]) < Number(overlayZ[1]), 'the map must stack below dialogs');
  assert.match(mapView, /overflow\s*:\s*auto/i, 'the map remains scrollable');
  assert.match(mapView, /-webkit-overflow-scrolling\s*:\s*touch/i, 'native mobile momentum scrolling remains enabled');
});

test('every country-entry level has a representative emblem integrated into its country label', () => {
  const starts = [];
  for (let i = 0; i < game.MAP_COUNTRIES.length; i++) {
    if (i === 0 || game.MAP_COUNTRIES[i] !== game.MAP_COUNTRIES[i - 1]) {
      assert.ok(iconCountries.has(game.MAP_COUNTRIES[i].toLowerCase()), `country icon metadata exists for ${game.MAP_COUNTRIES[i]}`);
      starts.push(game.MAP_COUNTRIES[i]);
    }
  }
  assert.ok(starts.length > 30, 'country icons cover the full world tour');
  assert.match(mapModule, /\.sr-medal i\{[^}]*border-radius:50%/, 'country emblems use styled circular medallions');
  assert.match(mapModule, /medal\.className = 'sr-medal'/, 'the map module attaches a country emblem to the country stop');
  assert.match(mapModule, /medal\.innerHTML = .*country/, 'the emblem label includes the country name');
});

test('map SVG contains labeled lakes, snowcapped ranges, and volcano landmarks', () => {
  const svg = game.nzMapSvg();
  for (const id of [
    'landmark-lake-taupo', 'landmark-lake-pukaki', 'landmark-lake-wakatipu',
    'landmark-southern-alps', 'landmark-himalaya', 'landmark-tongariro-volcano',
    'landmark-java-volcano', 'landmark-yasur-volcano', 'landmark-mt-fuji'
  ]) assert.ok(svg.includes(`id="${id}"`), `illustrated landmark ${id} remains present`);
  assert.match(svg, /class="sr-terrain"[^>]*pointer-events="none"/, 'decorative hills and groves cannot block level taps');
  assert.match(svg, /class="sr-landmarks"[^>]*pointer-events="none"/, 'landmark art cannot block level taps');
  for (const file of ['mountains.webp', 'volcano.webp', 'lake.webp']) {
    assert.ok(svg.includes(`img/sugar-rush/landmarks/${file}`), `map references the painted asset ${file}`);
    assert.ok(existsSync(new URL(`../feed/img/sugar-rush/landmarks/${file}`, import.meta.url)), `the deployed asset ${file} exists`);
  }
});

test('same-country level travel uses roads and country crossings use flights', () => {
  const svg = game.nzMapSvg();
  assert.ok(svg.includes('id="sr-travel-car"'), 'car sprite is present');
  assert.ok(svg.includes('id="sr-travel-plane"'), 'plane sprite is present');
  assert.ok(svg.includes('id="sr-future-border"'), 'pink road has its white outline');
  let roads = 0, flights = 0;
  for (let n = 1; n < game.MAP_STOPS.length; n++) {
    const d = game.journeyPath(game.MAP_STOPS.slice(n - 1, n + 1), n);
    if (game.countryForLevel(n) === game.countryForLevel(n + 1)) {
      assert.match(d, / C /, `levels ${n}–${n + 1} form a road`); roads++;
    } else {
      assert.match(d, / Q /, `levels ${n}–${n + 1} form a flight`); flights++;
    }
  }
  assert.ok(roads > 0 && flights > 0);
  assert.match(source, /const vehicle = isFlight \? plane : car/);
  assert.match(source, /saved\.carDisplay/);
});

test('map module runs once and the cached-page fallback waits for the static script', () => {
  assert.match(mapModule, /if \(window\.__sugarRushMapLoaded\) return;/);
  assert.match(mapModule, /window\.__sugarRushMapLoaded = true;/);
  assert.match(source, /document\.addEventListener\('DOMContentLoaded', ensureMapExtras/);
  assert.match(source, /document\.querySelector\('script\[src\*="sugar-rush-map"\]'\)/);
  assert.doesNotMatch(mapModule, /\.nzsvg path\{[^}]*stroke\s*:/, 'global styling cannot erase SVG stroke colors');
  assert.match(mapModule, /#sr-future\{stroke:#ff6fa8/, 'future road remains pink');
});
