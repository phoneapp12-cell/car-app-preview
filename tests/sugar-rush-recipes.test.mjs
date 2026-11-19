import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../feed/sugar-rush.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../feed/sugar-rush.html', import.meta.url), 'utf8');
const context = { console, Intl, Date, Math, URL, Set, Map, Object, Number, String, Array, JSON };
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'feed/sugar-rush.js' });
const game = context.SugarRush;
const key = (r, c) => r * game.N + c;
const emptyStep = (clear = new Set(), hit = new Set()) => ({ clear, hit, made: [], fired: [] });

const testRows = Array.from({ length: game.N }, (_, r) => Array.from({ length: game.N }, (_, c) => String((r + c) % game.KINDS)).join(''));

test('the eight new campaign levels are mapped and carry the intended order recipes', () => {
  assert.equal(game.LV_COUNT, 75);
  assert.deepEqual(Array.from(game.LEVELS.slice(57, 65).map(level => level.n)), [58, 59, 60, 61, 62, 63, 64, 65]);
  assert.equal(game.stopForLevel(65).place, 'Haikou');
  assert.ok(game.LEVELS[57].recipe.candies.length >= 2, 'first recipe requests several candy colours');
  assert.ok(game.LEVELS[57].recipe.specials.some(item => item.kind === 'w'), 'first recipe requires making a wrapped sweet');
  assert.ok(game.LEVELS[59].recipe.combos.some(item => item.kind === 'crisscross'), 'double-stripe order requires a real special swap');
  assert.ok(game.LEVELS[60].hard && game.LEVELS[60].timer === 90, 'the scarce countdown is marked Hard and lasts 90 seconds');
  assert.match(game.levelIntro(63).tip, /Popper.*3×3 blast/i);
  assert.match(html, /sugar-rush\.js\?v=1\.9\.260/);
});

test('a recipe only wins after the requested colours and a wrapped sweet have both been collected/made', () => {
  const level = game.LEVELS[57];
  const state = game.newGame({ level, seed: 501 });
  for (const item of level.recipe.candies) state.collected[item.color] = item.n;
  assert.equal(game.goalsMet(state), false, 'collecting colours alone does not finish the recipe');

  const special = level.recipe.specials[0];
  const made = Object.assign(emptyStep(), { made: [{ k: key(0, 0), color: 1, s: special.kind }] });
  game.applyStep(state.board, made, state.rand, state.kinds, 1, state);
  assert.equal(state.specialsMade[special.kind], 1);
  assert.equal(game.goalsMet(state), true);
});

test('a stripe-plus-stripe swap counts the requested double-stripe combo', () => {
  const level = game.LEVELS[59];
  const state = game.newGame({ level, seed: 502 });
  state.collected[level.recipe.candies[0].color] = level.recipe.candies[0].n;
  state.board[3][3].s = 'row';
  state.board[3][4].s = 'col';
  assert.equal(game.comboKind(state.board[3][3], state.board[3][4]), 'crisscross');

  const result = game.play(state, [3, 3], [3, 4]);
  assert.equal(result.valid, true);
  assert.equal(result.steps[0].combo, 'crisscross');
  assert.equal(state.combosMade.crisscross, 1);
  assert.equal(game.goalsMet(state), true);
});

test('triple-layer jelly takes three clears at the marked square', () => {
  const state = game.newGame({ level: game.LEVELS[58], seed: 503 });
  assert.equal(state.jelly[2][2], 3);
  game.applyStep(state.board, emptyStep(new Set([key(2, 2)])), state.rand, state.kinds, 1, state);
  assert.equal(state.jelly[2][2], 2);
  assert.equal(game.goalsMet(state), false);
});

test('the two adjacent Popper bombs chain their 3×3 bursts and clear marked syrup clogs', () => {
  const state = game.newGame({ level: game.LEVELS[62], seed: 504 });
  const bombs = state.board.flatMap((row, r) => row.map((tile, c) => tile && tile.popper ? [r, c] : null).filter(Boolean));
  assert.equal(bombs.length, 2);
  assert.ok(game.isBlock(state.board[bombs[0][0]][bombs[0][1]]));
  assert.equal(game.flowLeft(state), 8);

  const [r, c] = bombs[0];
  const step = emptyStep(new Set(), new Set([key(r, c)]));
  game.applyStep(state.board, step, state.rand, state.kinds, 1, state);
  assert.equal(step.blasts.length, 2, 'the neighboring Popper is triggered by the first burst');
  assert.equal(state.board.flat().filter(tile => tile && tile.popper).length, 0);
  assert.ok(game.flowLeft(state) < 8, 'the bursts clear some candies on the syrup path');
});

test('hidden sprites count only when their frosting is fully cracked', () => {
  const level = {
    n: 62, name: 'Sugar Sprite Test', target: 0, moves: 10, kinds: 6, stars: [0, 1, 2], iceGoal: false,
    ice: ['00000000', '00000000', '00010000', '00000000', '00000000', '00000000', '00000000', '00000000'],
    hidden: ['00000000', '00000000', '00010000', '00000000', '00000000', '00000000', '00000000', '00000000']
  };
  const board = game.fromRows(testRows);
  board[2][3].ice = 1;
  board[2][3].hidden = 1;
  const state = game.newGame({ level, board, seed: 505 });
  assert.equal(game.goalsMet(state), false);
  game.applyStep(state.board, emptyStep(new Set(), new Set([key(2, 3)])), state.rand, state.kinds, 1, state);
  assert.equal(state.hiddenLeft, 0);
  assert.equal(state.board[2][3].ice, undefined, 'the cleared frosting cell refills with an ordinary candy');
  assert.equal(game.goalsMet(state), true);
});

test('the 90-second lantern clock can end in either a win or a timeout loss', () => {
  const level = game.LEVELS[60];
  const won = game.newGame({ level, seed: 506 });
  won.collected[level.collect.color] = level.collect.n;
  won.jelly = won.jelly.map(row => row.map(() => 0));
  const start = won.timerUpdatedAt;
  game.tickTimer(won, start + 18000);
  assert.equal(won.timerLeft, 72);
  game.tickTimer(won, start + 90000);
  assert.equal(won.over, true);
  assert.equal(won.timerExpired, true);
  assert.equal(won.won, true);

  const lost = game.newGame({ level, seed: 507 });
  game.tickTimer(lost, lost.timerUpdatedAt + 90000);
  assert.equal(lost.over, true);
  assert.equal(lost.won, false);
});

test('mixed delivery and score objectives require all their conditions', () => {
  const delivery = game.newGame({ level: game.LEVELS[63], seed: 508 });
  assert.equal(game.goalsMet(delivery), false);
  delivery.collected[3] = 10;
  delivery.ingsLeft = 0;
  for (const row of delivery.board) for (const tile of row) if (tile) { tile.choco = 0; tile.liq = 0; }
  assert.equal(game.goalsMet(delivery), true);

  const score = game.newGame({ level: game.LEVELS[64], seed: 509 });
  assert.equal(game.goalsMet(score), false);
  score.score = game.LEVELS[64].scoreGoal;
  assert.equal(game.goalsMet(score), true);
});
