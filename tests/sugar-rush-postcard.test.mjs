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

test('postcard progress is a separate, validated four-piece record for each country', () => {
  const empty = game.normalizePostcardProgress(null);
  assert.equal(empty.v, 1);
  assert.ok(game.POSTCARD_COUNTRIES.includes('New Zealand'));
  assert.equal(empty.countries['New Zealand'].complete, false);
  const partial = game.addPostcardPiece(empty, 'New Zealand', 2);
  assert.deepEqual(Array.from(partial.countries['New Zealand'].pieces), [2]);
  assert.deepEqual(Array.from(partial.countries.Australia.pieces), []);
  assert.equal(partial.countries['New Zealand'].complete, false);
  const complete = [0, 1, 2, 3].reduce((p, i) => game.addPostcardPiece(p, 'New Zealand', i), empty);
  assert.equal(complete.countries['New Zealand'].complete, true);
  assert.equal(complete.countries.Australia.complete, false);
});

test('duplicate, invalid, or unknown postcard pieces cannot inflate progress', () => {
  let p = game.normalizePostcardProgress({ countries: { 'New Zealand': { pieces: [0, 0, 3, -1, 4, 'nope'] } } });
  p = game.addPostcardPiece(p, 'New Zealand', 3);
  p = game.addPostcardPiece(p, 'Imaginary Country', 1);
  p = game.addPostcardPiece(p, 'Australia', 4);
  assert.deepEqual(Array.from(p.countries['New Zealand'].pieces), [0, 3]);
  assert.deepEqual(Array.from(p.countries.Australia.pieces), []);
});

test('challenge entry, shelf and game progress are separate from the campaign route and objectives', () => {
  assert.match(html, /id="postcardbtn"/);
  assert.match(html, /id="postcards"/);
  assert.match(html, /id="postcardHud"/);
  assert.match(source, /const POSTCARD_KEY = 'ib-sugar-postcards'/);
  assert.match(source, /function savePostcardProgress\(\) \{ ls\.set\(POSTCARD_KEY, postcardProgress\); \}/);
  assert.match(source, /if \(st\.challenge\) return Array\.isArray\(st\.postcardFound\) && st\.postcardFound\.length >= POSTCARD_COUNT/);
  assert.match(source, /if \(st && st\.challenge\) \{ showEnd\(\); return; \}/);
  assert.match(source, /if \(!st \|\| st\.challenge \|\| st\.tutorial \|\| st\.won \|\| st\.lifeDone\) return/);
  assert.match(source, /!st\.challenge && !st\.over/);
  assert.match(source, /function recordWin\(g\)/);
  assert.match(source, /function collectPostcardFinds\(steps\)/);
  assert.match(source, /postcardPiece: Number\.isInteger\(t\.postcardPiece\) \? t\.postcardPiece : null/);
  assert.match(source, /if \(under && Number\.isInteger\(under\.postcardPiece\)\) t\.postcardPiece = under\.postcardPiece/);
});

test('postcard hunts use their own four-piece win condition while normal objectives stay unchanged', () => {
  const challengeLevel = { n: 1, name: 'Postcard Hunt', target: 0, moves: 6, stars: [0, 0, 0], kinds: game.KINDS };
  const hunt = game.newGame({ level: challengeLevel, seed: 17 });
  hunt.challenge = true;
  hunt.postcardFound = [0, 2, 3];
  assert.equal(game.goalsMet(hunt), false);
  hunt.postcardFound = [0, 1, 2, 3];
  assert.equal(game.goalsMet(hunt), true);
  const campaign = game.newGame({ level: game.LEVELS[0], seed: 17 });
  assert.equal(game.goalsMet(campaign), false);
});

test('cleared sweets report their postcard piece and a newly created special keeps its hidden piece', () => {
  const rows = Array.from({ length: 8 }, () => '01234501');
  const board = game.fromRows(rows);
  const state = game.newGame({ level: { n: 1, name: 'Postcard Hunt', moves: 6, stars: [0, 0, 0], kinds: game.KINDS }, board, rand: game.rng(19) });
  state.board[0][0].postcardPiece = 2;
  const cleared = { clear: new Set([0]), hit: new Set(), made: [] };
  game.applyStep(state.board, cleared, state.rand, state.kinds, 1, state);
  assert.equal(cleared.popped[0].postcardPiece, 2);

  state.board[0][1].postcardPiece = 3;
  const made = { clear: new Set(), hit: new Set(), made: [{ k: 1, color: 2, s: 'r' }] };
  game.applyStep(state.board, made, state.rand, state.kinds, 1, state);
  assert.equal(state.board[0][1].postcardPiece, 3);
});
