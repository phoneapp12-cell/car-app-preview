// node worker/test/scrabble.test.mjs
// Family Scrabble rules and API, against an in-memory SQLite that behaves like the Durable Object.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { bindDict, hasWord, check, play, pass, swap, finish, scrabbleInit, scrabbleRoute, createGame, PREMIUM, VALUES, COUNTS, N, MID, BINGO, RACK } from '../src/scrabble.js';

function stubSql() {
  const db = new DatabaseSync(':memory:');
  return {
    db,
    exec(q, ...a) {
      if (!a.length && q.trim().replace(/;\s*$/, '').includes(';')) { db.exec(q); return { toArray: () => [] }; }
      const st = db.prepare(q);
      const out = /^\s*(select|with)/i.test(q) ? st.all(...a) : (st.run(...a), []);
      return { toArray: () => out.map(r => ({ ...r })) };
    }
  };
}

const SHANE = 'm111111111111', SARAH = 'm222222222222', ARANEA = 'm333333333333', GONE = 'm999999999999';
const shane = { id: SHANE, name: 'Shane' }, sarah = { id: SARAH, name: 'Sarah' }, aranea = { id: ARANEA, name: 'Aranea' };

function fresh() {
  const sql = stubSql();
  sql.db.exec(`CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, tok TEXT, created INTEGER, seen INTEGER, removed INTEGER DEFAULT 0)`);
  sql.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,?)`).run(SHANE, 'Shane', 'admin', 1, 0);
  sql.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,?)`).run(SARAH, 'Sarah', 'member', 2, 0);
  sql.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,?)`).run(ARANEA, 'Aranea', 'member', 3, 0);
  sql.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,?)`).run(GONE, 'Gone', 'member', 4, 1);
  scrabbleInit(sql);
  bindDict('aa\ncat\ndog\nto\nat\ncd\nao\ntg\ndag\nhello\nqi\nzzzzzz\n');
  return sql;
}

const notes = [];
const hooks = { note: (mid, text, card) => { notes.push({ mid, text, card }); } };
let t = Date.UTC(2026, 10, 14, 1);
const post = (sql, me, path, body) => { t += 1000; return scrabbleRoute(sql, me, path, 'POST', new URL('https://x/api' + path), async () => body || {}, t, hooks); };
const get = (sql, me, path) => scrabbleRoute(sql, me, path, 'GET', new URL('https://x/api' + path), async () => ({}), t, hooks);

// ---- dictionary: every ENABLE word, and strings that are not words
const lex = fs.readFileSync(new URL('../../feed/scrabble-words.txt', import.meta.url), 'utf8');
bindDict(lex);
const allWords = lex.split(/\n/).map(w => w.trim()).filter(Boolean);
assert.ok(allWords.length > 100000, 'word list loaded');
for (const w of allWords) assert.equal(hasWord(w), true, w);
assert.equal(hasWord('CAT'), true);
assert.equal(hasWord('cat'), true);
assert.equal(hasWord('a'), false);
assert.equal(hasWord(''), false);
assert.equal(hasWord('qqqqq'), false);
assert.equal(hasWord('hello!'), false);
for (let i = 0; i < 500; i++) {
  const fake = 'qq' + i.toString(36);
  if (!allWords.includes(fake)) assert.equal(hasWord(fake), false, fake);
}

// ---- the phone game and the worker agree on the board and on scoring
const ctx = { console, Math, Object, Number, String, Array, Set, Map, JSON, Date, Uint8Array, Int8Array, Int32Array, setTimeout, parseInt };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../../feed/scrabble.js', import.meta.url), 'utf8'), ctx, { filename: 'feed/scrabble.js' });
const phone = ctx.Scrabble;
const here = v => JSON.parse(JSON.stringify(v)); // the phone script runs in its own vm, so compare the data, not the object identity
assert.deepEqual(PREMIUM, here(phone.PREMIUM));
assert.deepEqual(VALUES, here(phone.VALUES));
assert.deepEqual(COUNTS, here(phone.COUNTS));
const trie = phone.buildTrie(lex);
const phoneDict = { has: w => trie.has(w) };
const board0 = new Array(N * N).fill(null);
const cat = [{ r: MID, c: MID - 1, l: 'C', b: 0 }, { r: MID, c: MID, l: 'A', b: 0 }, { r: MID, c: MID + 1, l: 'T', b: 0 }];
const serverCat = check(board0, cat);
const phoneCat = phone.check(board0, cat, phoneDict);
assert.equal(serverCat.ok, true);
assert.equal(serverCat.score, 10, 'CAT across the star is (3+1+1) × 2');
assert.deepEqual(here(serverCat), here(phoneCat));
assert.equal(phoneCat.score, 10);

const off = [{ r: 0, c: 0, l: 'C', b: 0 }, { r: 0, c: 1, l: 'A', b: 0 }, { r: 0, c: 2, l: 'T', b: 0 }];
assert.equal(check(board0, off).err, phone.check(board0, off, phoneDict).err);
assert.match(check(board0, [{ r: MID, c: MID, l: 'A', b: 0 }]).err, /at least two/);
assert.match(check(board0, [{ r: MID, c: MID, l: 'A', b: 0 }, { r: MID, c: MID + 2, l: 'T', b: 0 }]).err, /gaps/);

bindDict('cat\ndog\nto\nat\n');
const played = new Array(N * N).fill(null);
played[MID * N + (MID - 1)] = { l: 'C', b: 0 };
played[MID * N + MID] = { l: 'A', b: 0 };
played[MID * N + (MID + 1)] = { l: 'T', b: 0 };
const to = [{ r: MID + 1, c: MID + 1, l: 'O', b: 0 }];
const serverTo = check(played, to);
const phoneTo = phone.check(played, to, { has: w => ['cat', 'dog', 'to', 'at'].includes(w.toLowerCase()) });
assert.equal(serverTo.ok, true);
assert.deepEqual(here(serverTo), here(phoneTo));
assert.equal(serverTo.words[0].w, 'TO');
assert.match(check(played, [{ r: 0, c: 0, l: 'D', b: 0 }, { r: 0, c: 1, l: 'O', b: 0 }, { r: 0, c: 2, l: 'G', b: 0 }]).err, /join on/);
assert.match(check(played, [{ r: MID, c: MID + 2, l: 'Z', b: 0 }]).err, /Not in the word list/);

// blank A in CAT scores (3+0+1) × 2 = 8, and a 7-tile word adds 50
const blankCat = [{ r: MID, c: MID - 1, l: 'C', b: 0 }, { r: MID, c: MID, l: 'A', b: 1 }, { r: MID, c: MID + 1, l: 'T', b: 0 }];
assert.equal(check(board0, blankCat).score, 8);
const bingo = 'TESTING'.split('').map((l, i) => ({ r: MID, c: MID - 3 + i, l, b: 0 }));
bindDict('testing\ncat\nto\n');
const bingoRes = check(board0, bingo);
assert.equal(bingoRes.ok, true);
assert.equal(bingoRes.bingo, true);
assert.ok(bingoRes.score >= BINGO);

// ---- API
notes.length = 0;
const sql = fresh();
assert.equal(await scrabbleRoute(sql, shane, '/people', 'GET', new URL('https://x/api/people'), async () => ({})), null);
assert.equal((await scrabbleRoute(sql, shane, '/scrabble', 'PUT', new URL('https://x/api/scrabble'), async () => ({}))).status, 405);
let r = await post(sql, shane, '/scrabble', { players: [] });
assert.equal(r.status, 400);
r = await post(sql, shane, '/scrabble', { players: [SARAH, ARANEA, 'm444444444444', 'm555555555555'] });
assert.equal(r.status, 400, 'five people is too many');
r = await post(sql, shane, '/scrabble', { players: [GONE] });
assert.equal(r.status, 400, 'removed members are not in the family list');
r = await post(sql, shane, '/scrabble', { players: ['not-a-person'] });
assert.equal(r.status, 400);

r = await post(sql, shane, '/scrabble', { players: [SARAH] });
assert.equal(r.status, 200);
const game = r.body;
assert.match(game.id, /^g[0-9a-f]{16}$/);
assert.equal(game.rack.length, RACK);
assert.equal(game.bag, 100 - RACK * 2);
assert.equal(game.players.length, 2);
assert.equal(game.players.filter(p => p.me).length, 1);
assert.ok(game.players.every(p => p.tiles === RACK && !p.rack));
const mine = game.players.find(p => p.me);
assert.equal(mine.name, 'Shane');
assert.equal(typeof game.yourTurn, 'boolean');
const raw = sql.db.prepare(`SELECT state FROM scrabble_games WHERE id=?`).get(game.id).state;
assert.ok(raw.includes(game.rack.join('')) || game.rack.every(l => raw.includes(l)), 'racks are stored for the players');
assert.ok(!JSON.stringify(game).includes('"bag":"') && typeof game.bag === 'number');

const sarahView = await get(sql, sarah, '/scrabble/' + game.id);
assert.equal(sarahView.status, 200);
assert.notDeepEqual(sarahView.body.rack, game.rack);
assert.equal(sarahView.body.yourTurn, !game.yourTurn, 'exactly one person starts');
assert.equal(game.yourTurn !== sarahView.body.yourTurn, true);
const hidden = JSON.stringify(sarahView.body);
for (const letter of game.rack) {
  if (!sarahView.body.rack.includes(letter) && !JSON.stringify(sarahView.body.board).includes(letter)) {
    assert.ok(!hidden.includes('"' + letter + '"') || sarahView.body.rack.includes(letter));
  }
}
assert.equal((await get(sql, aranea, '/scrabble/' + game.id)).status, 404, 'a non-player cannot open the game');

const list = await get(sql, shane, '/scrabble');
assert.equal(list.body.games.length, 1);
assert.equal(list.body.yourTurn, game.yourTurn ? 1 : 0);
assert.equal(list.body.games[0].players.find(p => p.me).name, 'Shane');

const turn = game.yourTurn ? shane : sarah;
const other = game.yourTurn ? sarah : shane;
r = await post(sql, other, '/scrabble/' + game.id + '/pass', { rev: game.rev });
assert.equal(r.status, 403);
r = await post(sql, turn, '/scrabble/' + game.id + '/pass', { rev: game.rev + 9 });
assert.equal(r.status, 409);
r = await post(sql, turn, '/scrabble/' + game.id + '/pass', { rev: game.rev });
assert.equal(r.status, 200);
assert.equal(r.body.yourTurn, false);
assert.equal(r.body.last.kind, 'pass');
const after = await get(sql, other, '/scrabble/' + game.id);
assert.equal(after.body.yourTurn, true);
assert.ok(notes.some(n => n.mid === other.id && n.text.startsWith('Your turn')));

// scripted game: words, scores, hiding, swap, end, scoreboard
notes.length = 0;
const sql2 = fresh();
bindDict('cat\nto\nat\ndog\n');
const made = createGame(sql2, shane, [SHANE, SARAH], t, { order: [SHANE, SARAH], racks: ['CATXXXX', 'OOOOOOD'], bag: 'Z'.repeat(86) });
assert.equal(made.status, 200);
const gid = made.body.id;
let v = (await get(sql2, shane, '/scrabble/' + gid)).body;
assert.deepEqual(v.rack, ['C', 'A', 'T', 'X', 'X', 'X', 'X']);
assert.equal(v.yourTurn, true);
const sarahEarly = await get(sql2, sarah, '/scrabble/' + gid);
assert.ok(!JSON.stringify(sarahEarly.body).includes('"X"'), 'Shane’s tiles stay on his phone');
assert.deepEqual(sarahEarly.body.rack, ['O', 'O', 'O', 'O', 'O', 'O', 'D']);

r = await post(sql2, shane, '/scrabble/' + gid + '/play', { rev: v.rev, tiles: [{ r: 0, c: 0, l: 'C' }, { r: 0, c: 1, l: 'A' }, { r: 0, c: 2, l: 'T' }] });
assert.equal(r.status, 400);
assert.match(r.body.err, /centre/);
r = await post(sql2, shane, '/scrabble/' + gid + '/play', { rev: v.rev, tiles: cat });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.players.find(p => p.me).score, 10);
assert.equal(r.body.yourTurn, false);
assert.equal(r.body.rack.length, 7, 'drew back up to 7');
assert.equal(r.body.last.words[0].w, 'CAT');
assert.equal(r.body.last.bingo, false);
v = r.body;
r = await post(sql2, shane, '/scrabble/' + gid + '/pass', { rev: v.rev });
assert.equal(r.status, 403);
r = await post(sql2, sarah, '/scrabble/' + gid + '/play', {
  rev: v.rev,
  tiles: [{ r: MID + 1, c: MID + 1, l: 'O', b: 0 }]
});
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.last.words[0].w, 'TO');
assert.equal(r.body.players.find(p => p.name === 'Sarah').score, 3);
assert.ok(notes.some(n => n.mid === SHANE && /Your turn/.test(n.text)));

// swap, then six scoreless turns end it and write the scoreboard
v = (await get(sql2, shane, '/scrabble/' + gid)).body;
const beforeBag = v.bag;
r = await post(sql2, shane, '/scrabble/' + gid + '/swap', { rev: v.rev, letters: ['X'] });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.rack.length, 7);
assert.equal(r.body.bag, beforeBag);
assert.equal(r.body.last.kind, 'swap');
assert.ok(r.body.rack.includes('Z') && r.body.rack.filter(l => l === 'X').length === 3);
const sarahAfterSwap = await get(sql2, sarah, '/scrabble/' + gid);
assert.ok(!JSON.stringify(sarahAfterSwap.body).includes('"X"'), 'a swap stays on the player’s own phone');
assert.equal(sarahAfterSwap.body.yourTurn, true);

// drain the bag so a later swap is refused, using passes to finish instead
let guard = 0;
while (!(await get(sql2, shane, '/scrabble/' + gid)).body.over && guard++ < 8) {
  const cur = (await get(sql2, shane, '/scrabble/' + gid)).body;
  const who = cur.yourTurn ? shane : sarah;
  const live = cur.yourTurn ? cur : (await get(sql2, sarah, '/scrabble/' + gid)).body;
  r = await post(sql2, who, '/scrabble/' + gid + '/pass', { rev: live.rev });
  assert.equal(r.status, 200, r.body.err);
}
const done = (await get(sql2, shane, '/scrabble/' + gid)).body;
assert.equal(done.over, true);
assert.ok(done.winnerNames.length >= 1);
assert.equal(done.yourTurn, false);
const board = sql2.db.prepare(`SELECT mid, score, won, opp, ref FROM scores WHERE game='scrabble' ORDER BY mid`).all();
assert.equal(board.length, 2);
assert.ok(board.every(row => row.opp === 'family' && String(row.ref).startsWith('scrabble:' + gid)));
const wins = board.filter(row => row.won === 1);
assert.ok(wins.length <= 1);
// a second load does not insert again
await get(sql2, sarah, '/scrabble/' + gid);
assert.equal(sql2.db.prepare(`SELECT COUNT(*) n FROM scores WHERE ref LIKE ?`).get('scrabble:' + gid + '%').n, 2);

// swap refused when the bag has fewer than 7
const sql3 = fresh();
const thin = createGame(sql3, shane, [SHANE, SARAH], t, { order: [SHANE, SARAH], racks: ['CATXXXX', 'DOGYYYY'], bag: 'EEEEEE' });
r = await post(sql3, shane, '/scrabble/' + thin.body.id + '/swap', { rev: 1, letters: ['C'] });
assert.equal(r.status, 400);
assert.match(r.body.err, /at least 7/);

// unknown word does not change the rack or the turn
r = await post(sql3, shane, '/scrabble/' + thin.body.id + '/play', { rev: 1, tiles: [{ r: MID, c: MID - 1, l: 'X' }, { r: MID, c: MID, l: 'X' }, { r: MID, c: MID + 1, l: 'X' }] });
assert.equal(r.status, 400);
assert.match(r.body.err, /Not in the word list/);
assert.deepEqual((await get(sql3, shane, '/scrabble/' + thin.body.id)).body.rack, ['C', 'A', 'T', 'X', 'X', 'X', 'X']);

// a removed player's turn is skipped so the game can carry on
const sql4 = fresh();
const stuck = createGame(sql4, shane, [SHANE, SARAH], t, { order: [SARAH, SHANE], racks: ['CATXXXX', 'DOGYYYY'], bag: 'E'.repeat(86) });
sql4.db.prepare(`UPDATE members SET removed=1 WHERE id=?`).run(SARAH);
const skipped = await get(sql4, shane, '/scrabble/' + stuck.body.id);
assert.equal(skipped.body.yourTurn, true, 'Sarah was removed on her turn, so it becomes Shane’s');
assert.equal(skipped.body.last.kind, 'pass');

// eight open games is the cap
const sql5 = fresh();
for (let i = 0; i < 8; i++) {
  const madeN = await post(sql5, shane, '/scrabble', { players: [SARAH] });
  assert.equal(madeN.status, 200, madeN.body.err);
}
r = await post(sql5, shane, '/scrabble', { players: [SARAH] });
assert.equal(r.status, 400);
assert.match(r.body.err, /8 games/);

// finish() pays the leftover tiles to the player who went out
bindDict('cat\n');
const end = {
  over: false, board: new Array(N * N).fill(null), bag: [],
  players: [{ mid: SHANE, score: 20, rack: [] }, { mid: SARAH, score: 15, rack: ['C', 'A'] }],
  turn: 0, scoreless: 0
};
finish(end, 0);
assert.equal(end.players[0].score, 20 + 3 + 1);
assert.equal(end.players[1].score, 15 - 4);
assert.deepEqual(end.winners, [0]);
assert.equal(end.over, true);

// family.js wires the route in after the member token check
const fam = fs.readFileSync(new URL('../src/family.js', import.meta.url), 'utf8');
assert.ok(fam.includes('scrabbleInit(this.sql)'));
assert.ok(fam.indexOf('scrabbleRoute(this.sql, me') > fam.indexOf("if (!me) return J({ err: 'not a member' }, 401)"));
assert.ok(fam.includes('scrabble-words.txt') || fam.includes('lexicon'));

console.log('scrabble tests ok');
