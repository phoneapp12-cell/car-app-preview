import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../feed/sugar-rush.js', import.meta.url), 'utf8');
const context = { console, Intl, Date, Math, URL, Set, Map, Object, Number, String, Array, JSON };
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'feed/sugar-rush.js' });
const game = context.SugarRush;

test('East Asia extends the campaign after Haikou with accurate city stops and country labels', () => {
  assert.equal(game.LV_COUNT, 70);
  assert.equal(game.LEVELS.length, 70);
  assert.equal(game.MAP_STOPS.length, 70);
  assert.deepEqual(
    Array.from(game.MAP_STOPS.slice(65).map(stop => stop.place)),
    ['Taipei', 'Naha', 'Fukuoka', 'Seoul', 'Tokyo']
  );
  assert.deepEqual(
    Array.from(game.MAP_COUNTRIES.slice(65)),
    ['Taiwan', 'Japan', 'Japan', 'South Korea', 'Japan']
  );
  assert.deepEqual(
    Array.from([66, 67, 68, 69, 70].map(n => game.countryForLevel(n))),
    ['Taiwan', 'Japan', 'Japan', 'South Korea', 'Japan']
  );

  for (const stop of game.MAP_STOPS.slice(65)) {
    const projected = game.ausXY(stop.lat, stop.lon);
    assert.ok(Math.abs(projected.x - stop.x) < 0.1, `${stop.place} longitude projection`);
    assert.ok(Math.abs(projected.y - stop.y) < 0.1, `${stop.place} latitude projection`);
    assert.ok(stop.x > game.MAP_X0 && stop.x < game.MAP_W);
    assert.ok(stop.y > 0 && stop.y < game.MAP_H);
  }

  const svg = game.nzMapSvg();
  assert.match(svg, /TAIWAN · SOUTH KOREA · JAPAN/);
  const taiwanCoast = game.ausXY(25.3, 121.5);
  assert.ok(svg.includes('M' + taiwanCoast.x.toFixed(1) + ' ' + taiwanCoast.y.toFixed(1)), 'the Taiwan outline is drawn on the map');
});

test('new East Asian levels have matching intro copy and playable objectives', () => {
  const expected = [
    ['Taipei Lantern Market', 'Taipei'],
    ['Naha Coral Garden', 'Naha'],
    ['Fukuoka Mochi Delivery', 'Fukuoka'],
    ['Seoul Palace Garden', 'Seoul'],
    ['Tokyo Star Parade', 'Tokyo']
  ];
  expected.forEach(([name, place], index) => {
    const n = index + 66;
    const intro = game.levelIntro(n);
    assert.equal(game.LEVELS[n - 1].name, name);
    assert.equal(intro.place, place);
    assert.notEqual(intro.detail, game.levelIntro(1).detail, `level ${n} should not reuse generic copy`);
    const state = game.newGame({ level: game.LEVELS[n - 1], seed: 8675309 + n });
    assert.equal(game.goalsMet(state), false, `level ${n} should start with its objectives unfinished`);
  });
});

test('the separate Postcard Hunt retains its original country roster', () => {
  assert.equal(game.POSTCARD_COUNTRIES.length, 30);
  assert.ok(game.POSTCARD_COUNTRIES.includes('China'));
  for (const addedCountry of ['Taiwan', 'Japan', 'South Korea']) {
    assert.ok(!game.POSTCARD_COUNTRIES.includes(addedCountry), `${addedCountry} should not alter the existing postcard challenge`);
  }
  const progress = game.normalizePostcardProgress({ countries: { Taiwan: { pieces: [0, 1] } } });
  assert.equal(progress.countries.Taiwan, undefined);
  assert.equal(Object.keys(progress.countries).length, 30);
});
