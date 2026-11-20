import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const html = readFileSync(new URL('../feed/sugar-rush.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../feed/sugar-rush.js', import.meta.url), 'utf8');
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
      const icon = game.mapCountryIconForLevel(i + 1);
      assert.ok(icon && icon !== '✦', `country icon exists for ${game.MAP_COUNTRIES[i]}`);
      starts.push(game.MAP_COUNTRIES[i]);
    }
  }
  assert.ok(starts.length > 30, 'country icons cover the full world tour');
  assert.match(rule('.stops .meta .country-icon'), /border-radius\s*:\s*50%/i, 'country emblems sit in styled circular label badges');
  assert.match(source, /countryPill\s*=\s*countryStart/, 'emblems are attached to country labels');
  assert.doesNotMatch(source, /class="country-mark"/, 'emblems no longer float on numbered pins');
});

test('map SVG contains labeled lakes, snowcapped ranges, and volcano landmarks', () => {
  const svg = game.nzMapSvg();
  for (const id of [
    'landmark-lake-taupo', 'landmark-lake-pukaki', 'landmark-lake-wakatipu',
    'landmark-southern-alps', 'landmark-himalaya', 'landmark-tongariro-volcano',
    'landmark-java-volcano', 'landmark-yasur-volcano', 'landmark-mt-fuji'
  ]) assert.ok(svg.includes(`id="${id}"`), `illustrated landmark ${id} remains present`);
  for (const file of ['mountains.webp', 'volcano.webp', 'lake.webp']) {
    assert.ok(svg.includes(`img/sugar-rush/landmarks/${file}`), `map references the painted asset ${file}`);
  }
});
