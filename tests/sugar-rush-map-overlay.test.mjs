import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../feed/sugar-rush.html', import.meta.url), 'utf8');
const css = html.match(/<style>([\s\S]*?)<\/style>/i)?.[1] || '';

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
