import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadSugarRush() {
  const ctx = { console, Intl, Date, Math, URL, Set, Map, Object, Number, String, Array, encodeURIComponent, decodeURIComponent };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('feed/sugar-rush.js', 'utf8'), ctx, { filename: 'feed/sugar-rush.js' });
  return ctx.SugarRush;
}
const SR = loadSugarRush();
const HASH = '8b496564';
const BASE = 'feed/img/sugar-rush/leaving-nz-intro-' + HASH;

test('Bluff is the last New Zealand stop and Rarotonga is the first overseas level', () => {
  assert.equal(SR.LEAVE_NZ_LEVEL, 17);
  assert.equal(SR.MAP_STOPS[15].place, 'Bluff');
  assert.equal(SR.LEVELS[15].name, 'Bluff Oyster Bay');
  assert.equal(SR.countryForLevel(16), 'New Zealand');
  assert.equal(SR.MAP_STOPS[16].place, 'Rarotonga');
  assert.equal(SR.LEVELS[16].name, 'Rarotonga Lagoon');
  assert.equal(SR.countryForLevel(17), 'Cook Islands');
  assert.notEqual(SR.countryForLevel(17), 'New Zealand');
  for (let n = 1; n <= 16; n++) assert.equal(SR.countryForLevel(n), 'New Zealand');
});

test('the leaving-NZ intro film is present with a hashed name', () => {
  assert.ok(fs.existsSync(BASE + '.mp4'));
  assert.ok(fs.existsSync(BASE + '.webm'));
  assert.ok(fs.existsSync(BASE + '-poster.jpg'));
  const intro = fs.readFileSync('feed/sugar-rush-intro-assets.js', 'utf8');
  assert.match(intro, /SUGAR_LEAVE_NZ_INTRO/);
  assert.match(intro, /leaving-nz-intro-8b496564/);
});

test('starting Rarotonga plays the leaving-NZ intro once per player', () => {
  const game = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  assert.match(game, /function beginLevel\(n\)/);
  assert.match(game, /shouldPlayLeaveNzIntro/);
  assert.match(game, /SUGAR_LEAVE_NZ_INTRO/);
  assert.match(game, /ib-sugar-leave-nz-intro/);
  assert.match(game, /markLeaveNzIntroSeen/);
  assert.equal(SR.LEAVE_NZ_INTRO_KEY, 'ib-sugar-leave-nz-intro');
  // Replay and other levels must not keep calling the film after it has been marked seen.
  assert.match(game, /leaveNzIntroSeen\(\)/);
  assert.match(game, /n !== LEAVE_NZ_LEVEL/);
});
