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

  assert.equal(access.hasUnlimitedLives(), false);
  assert.equal(access.allows(1, savedProgress.open), true);
  assert.equal(access.allows(LV_COUNT, savedProgress.open), false);
  for (let tap = 1; tap < 5; tap++) {
    assert.deepEqual({ ...access.tap() }, { unlocked: false, taps: tap });
    assert.equal(access.allows(LV_COUNT, savedProgress.open), false, `level remains locked after tap ${tap}`);
  }

  assert.deepEqual({ ...access.tap() }, { unlocked: false, taps: 5 });
  assert.deepEqual({ ...access.authorizeOwner(false) }, { unlocked: false, taps: 5 });
  assert.equal(access.allows(LV_COUNT, savedProgress.open), false, 'five taps without verified owner identity remain locked');
  assert.equal(access.hasUnlimitedLives(), false, 'unverified taps do not grant lives');
  assert.deepEqual({ ...access.authorizeOwner(true) }, { unlocked: true, taps: 5 });
  assert.equal(access.hasUnlimitedLives(), true, 'the owner gesture grants unlimited lives for this session');
  for (let n = 1; n <= LV_COUNT; n++) assert.equal(access.allows(n, savedProgress.open), true, `level ${n} opens`);
  assert.equal(JSON.stringify(savedProgress), savedSnapshot, 'the unlock does not change saved progression');

  access.reset();
  assert.equal(access.isUnlocked(), false);
  assert.equal(access.hasUnlimitedLives(), false);
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
  assert.equal(access.tap().unlocked, false);
  assert.equal(access.authorizeOwner(false).unlocked, false);

  const nextSession = createSessionLevelAccess();
  assert.equal(nextSession.isUnlocked(), false);
  assert.equal(nextSession.allows(LV_COUNT, 1), false);
});

test('the red heart/lives buttons are the hidden target, Exit is ordinary, and runtime access is never persisted', () => {
  assert.match(gameHtml, /class="pri" id="mapexit" aria-label="Exit"/);
  assert.match(gameHtml, /class="hearts inlevel" id="hearts2" aria-label="Lives"/);
  assert.match(gameJs, /\['maphearts', 'hearts2'\]\.forEach\(id => \{ if \(\$\(id\)\) \$\(id\)\.addEventListener\('click', handleLivesButtonTap\); \}\)/);
  assert.match(gameJs, /root\.IBScores\.isVerifiedShane\(\)/);
  assert.match(gameJs, /sessionLevelAccess\.authorizeOwner\(!!isOwner\)/);
  assert.match(gameJs, /function lives\(\) \{ return sessionLevelAccess\.hasUnlimitedLives\(\) \? LIVES_MAX : livesState\(\)\.n; \}/);
  assert.match(gameJs, /function addLives\(delta\) \{ if \(sessionLevelAccess\.hasUnlimitedLives\(\)\) \{ paintHearts\(\); return; \}/);
  assert.match(gameJs, /if \(!sessionLevelAccess\.hasUnlimitedLives\(\)\) addLives\(-1\)/);
  assert.match(gameJs, /const S = livesApi\(\); if \(!S \|\| sessionLevelAccess\.hasUnlimitedLives\(\)\) return;/);
  assert.match(gameJs, /addEventListener\('click', requestCloseSugar\)/, 'map Exit retains its normal close action');
  assert.doesNotMatch(gameJs, /handleMapExitTap|Exit ' \+ result\.taps|result\.taps \+ ' of '/, 'the old Exit gesture and tap-count hint are removed');
  assert.match(gameJs, /open = sessionLevelAccess\.allows\(n, prog\.open\)/);
  assert.match(gameJs, /!sessionLevelAccess\.allows\(n, prog\.open\)/);
  assert.match(gameJs, /root\.addEventListener\('pagehide', resetSessionBenefits\)/);
  const helper = gameJs.match(/function createSessionLevelAccess\(\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(helper, 'session access helper exists');
  assert.doesNotMatch(helper, /localStorage|sessionStorage|saveProg|prog\b|fetch\(|race/i);
});
