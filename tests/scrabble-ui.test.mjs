// node tests/scrabble-ui.test.mjs
// Multi-select layout helper, shared with the phone game.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = { console, Math, Object, Number, String, Array, Set, Map, JSON, Date, Uint8Array, Int8Array, Int32Array, setTimeout, parseInt };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../feed/scrabble.js', import.meta.url), 'utf8'), ctx, { filename: 'feed/scrabble.js' });
const S = ctx.Scrabble;
const here = v => JSON.parse(JSON.stringify(v));
assert.equal(typeof S.layoutRun, 'function');

const empty = new Array(S.N * S.N).fill(null);
const across = S.layoutRun(empty, [], 7, 6, 'across', 4);
assert.deepEqual(here(across), [{ r: 7, c: 6 }, { r: 7, c: 7 }, { r: 7, c: 8 }, { r: 7, c: 9 }]);

const down = S.layoutRun(empty, [], 5, 7, 'down', 3);
assert.deepEqual(here(down), [{ r: 5, c: 7 }, { r: 6, c: 7 }, { r: 7, c: 7 }]);

// skip squares already on the board or already pending
const board = empty.slice();
board[7 * 15 + 7] = { l: 'A', b: 0 };
const skipped = S.layoutRun(board, [7 * 15 + 8], 7, 6, 'across', 3);
assert.deepEqual(here(skipped), [{ r: 7, c: 6 }, { r: 7, c: 9 }, { r: 7, c: 10 }]);

// stops at the edge
const edge = S.layoutRun(empty, [], 14, 13, 'across', 4);
assert.deepEqual(here(edge), [{ r: 14, c: 13 }, { r: 14, c: 14 }]);

const none = S.layoutRun(empty, [], 14, 7, 'down', 2);
assert.equal(none.length, 1);
assert.deepEqual(here(none[0]), { r: 14, c: 7 });

console.log('scrabble-ui tests ok');
