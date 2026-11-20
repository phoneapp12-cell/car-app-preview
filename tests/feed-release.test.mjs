import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const worker = read('../feed/sw.js');
const app = read('../feed/app.js');
const feedHtml = read('../feed/index.html');
const gameHtml = read('../feed/sugar-rush.html');
const gameJs = read('../feed/sugar-rush.js');

const versionOf = (source, pattern, label) => {
  const match = pattern.exec(source);
  assert.ok(match, `Could not find ${label}`);
  return match[1];
};

const release = versionOf(worker, /const VERSION = '([^']+)'/, 'service-worker version');

test('feed shell, app, and Sugar Rush assets share one release version', () => {
  assert.equal(versionOf(app, /const APP_VERSION = '([^']+)'/, 'feed app version'), release);
  assert.equal(versionOf(gameJs, /Info Book (1\.9\.\d+)/, 'Sugar Rush source version'), release);

  for (const [label, source] of [['feed shell', feedHtml], ['Sugar Rush page', gameHtml]]) {
    const versions = [...source.matchAll(/\?v=(1\.9\.\d+)/g)].map((match) => match[1]);
    assert.ok(versions.length > 0, `${label} should have versioned assets`);
    assert.ok(versions.every((version) => version === release), `${label} has asset versions ${[...new Set(versions)].join(', ')} but worker is ${release}`);
  }
});

test('feed update lifecycle does not force a reload when the service-worker controller changes', () => {
  assert.match(feedHtml, /No controllerchange reload/);
  assert.doesNotMatch(app, /addEventListener\(['"]controllerchange['"][\s\S]{0,300}location\.reload\(/);
  assert.doesNotMatch(worker, /clients\.claim\s*\(/);
});

test('map atmosphere is decorative and respects reduced-motion preferences', () => {
  const cloudMatch = /const MAP_CLOUDS = (\[[^\n;]+\]);/.exec(gameJs);
  assert.ok(cloudMatch, 'map cloud list should exist');
  assert.ok(JSON.parse(cloudMatch[1]).length >= 16, 'map should have a broader cloud layer');
  assert.match(gameJs, /function mapWindSwirls\(/);
  assert.match(gameJs, /function mapAtmosphere\(/);
  assert.match(gameJs, /mapClouds\(\) \+\s*mapAtmosphere\(\)/);
  assert.match(gameJs, /class="sr-map-balloon"/);
  assert.match(gameHtml, /\.sr-cloud, \.sr-wind, \.sr-map-spark, \.sr-map-balloon \{ animation: none !important; \}/);
});
