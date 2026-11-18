import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const gameJs = readFileSync(new URL('../feed/sugar-rush.js', import.meta.url), 'utf8');
const gameHtml = readFileSync(new URL('../feed/sugar-rush.html', import.meta.url), 'utf8');
const context = { console, Intl, Date, Math, URL, Set, Map, Object, Number, String, Array, JSON };
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(gameJs, context, { filename: 'feed/sugar-rush.js' });

const { createSessionLevelAccess, LV_COUNT } = context.SugarRush;

test('five taps open every level only in the current in-memory session', () => {
  const savedProgress = { open: 1 };
  const savedSnapshot = JSON.stringify(savedProgress);
  const access = createSessionLevelAccess();

  assert.equal(access.allows(1, savedProgress.open), true);
  assert.equal(access.allows(LV_COUNT, savedProgress.open), false);
  for (let tap = 1; tap < 5; tap++) {
    assert.deepEqual({ ...access.tap() }, { unlocked: false, taps: tap });
    assert.equal(access.allows(LV_COUNT, savedProgress.open), false, `level remains locked after tap ${tap}`);
  }

  assert.deepEqual({ ...access.tap() }, { unlocked: true, taps: 5 });
  for (let n = 1; n <= LV_COUNT; n++) assert.equal(access.allows(n, savedProgress.open), true, `level ${n} opens`);
  assert.equal(JSON.stringify(savedProgress), savedSnapshot, 'the unlock does not change saved progression');

  access.reset();
  assert.equal(access.isUnlocked(), false);
  assert.equal(access.allows(LV_COUNT, savedProgress.open), false, 'reset closes levels not saved as progress');
  assert.equal(JSON.stringify(savedProgress), savedSnapshot);
});

test('an interrupted tap sequence clears, and a new session starts locked', () => {
  const access = createSessionLevelAccess();
  access.tap();
  access.tap();
  access.tap();
  access.clearTaps();
  assert.equal(access.tap().unlocked, false);
  assert.equal(access.tap().unlocked, false);
  assert.equal(access.tap().unlocked, false);
  assert.equal(access.tap().unlocked, false);
  assert.equal(access.tap().unlocked, true);

  const nextSession = createSessionLevelAccess();
  assert.equal(nextSession.isUnlocked(), false);
  assert.equal(nextSession.allows(LV_COUNT, 1), false);
});

test('the map Exit button is the gesture target and runtime access is never persisted', () => {
  assert.match(gameHtml, /class="pri" id="mapexit" aria-label="Exit"/);
  assert.match(gameJs, /addEventListener\('click', handleMapExitTap\)/);
  assert.match(gameJs, /open = sessionLevelAccess\.allows\(n, prog\.open\)/);
  assert.match(gameJs, /!sessionLevelAccess\.allows\(n, prog\.open\)/);
  assert.match(gameJs, /root\.addEventListener\('pagehide', resetSessionUnlock\)/);
  const helper = gameJs.match(/function createSessionLevelAccess\(\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(helper, 'session access helper exists');
  assert.doesNotMatch(helper, /localStorage|sessionStorage|saveProg|prog\b|fetch\(|race/i);
});
