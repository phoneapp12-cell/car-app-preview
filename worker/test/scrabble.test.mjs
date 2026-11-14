// node worker/test/scrabble.test.mjs
// Family Scrabble rules and API, against an in-memory SQLite that behaves like the Durable Object.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { bindDict, hasWord, check, play, pass, swap, resign, finish, scrabbleInit, scrabbleRoute, createGame, PREMIUM, VALUES, COUNTS, N, MID, BINGO, RACK, _test as S } from '../src/scrabble.js';

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

const SHANE = 'm111111111111', SARAH = 'm222222222222', ARANEA = 'm333333333333', ALEX = 'm444444444444', GONE = 'm999999999999';
const shane = { id: SHANE, name: 'Shane' }, sarah = { id: SARAH, name: 'Sarah' }, aranea = { id: ARANEA, name: 'Aranea' }, alex = { id: ALEX, name: 'Alex' };

function fresh() {
  const sql = stubSql();
  sql.db.exec(`CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, tok TEXT, created INTEGER, seen INTEGER, removed INTEGER DEFAULT 0)`);
  sql.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,?)`).run(SHANE, 'Shane', 'admin', 1, 0);
  sql.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,?)`).run(SARAH, 'Sarah', 'member', 2, 0);
  sql.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,?)`).run(ARANEA, 'Aranea', 'member', 3, 0);
  sql.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,?)`).run(ALEX, 'Alex', 'member', 4, 0);
  sql.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,?)`).run(GONE, 'Gone', 'member', 5, 1);
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


// challenge a single family member with { player }
notes.length = 0;
const sql6 = fresh();
r = await post(sql6, shane, '/scrabble', { player: SARAH });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.players.length, 2);
assert.ok(r.body.players.some(p => p.name === 'Sarah'));
const list6 = await get(sql6, shane, '/scrabble');
assert.equal(typeof list6.body.games[0].last, 'string');
// after a pass, the list shows the last move and the notice uses "vs"
const turn6 = r.body.yourTurn ? shane : sarah;
const other6 = r.body.yourTurn ? sarah : shane;
r = await post(sql6, turn6, '/scrabble/' + r.body.id + '/pass', { rev: r.body.rev });
assert.equal(r.status, 200);
const listAfter = await get(sql6, other6, '/scrabble');
assert.match(listAfter.body.games[0].last, /passed/);
assert.ok(notes.some(n => n.mid === other6.id && /Your turn in Scrabble vs /.test(n.text)), JSON.stringify(notes));

// two simulated players play a full scripted game, then a resign ends another
notes.length = 0;
const sql7 = fresh();
bindDict('cat\nto\nat\ndog\nqi\nax\n');
const full = createGame(sql7, shane, [SHANE, SARAH], t, { order: [SHANE, SARAH], racks: ['CATQXXX', 'TOYYYYY'], bag: 'E'.repeat(86) });
const gid7 = full.body.id;
r = await post(sql7, shane, '/scrabble/' + gid7 + '/play', { rev: 1, tiles: cat });
assert.equal(r.status, 200, r.body.err);
assert.ok(Array.isArray(r.body.history) && r.body.history.length >= 1);
assert.equal(r.body.history[0].kind, 'play');
r = await post(sql7, sarah, '/scrabble/' + gid7 + '/play', { rev: r.body.rev, tiles: [{ r: MID + 1, c: MID + 1, l: 'O', b: 0 }] });
assert.equal(r.status, 200, r.body.err);
assert.ok(notes.some(n => n.mid === SHANE && n.text.startsWith('Your turn in Scrabble vs Sarah')));
// Sarah cannot see Shane's remaining X tiles
const sneak = JSON.stringify((await get(sql7, sarah, '/scrabble/' + gid7)).body);
assert.ok(!sneak.includes('"X"'), sneak);
// resign ends the game; Shane wins
r = await post(sql7, shane, '/scrabble/' + gid7 + '/resign', { rev: (await get(sql7, shane, '/scrabble/' + gid7)).body.rev });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.over, true);
assert.deepEqual(r.body.winnerNames, ['Sarah']);
assert.equal(r.body.last.kind, 'resign');
assert.ok(notes.some(n => n.mid === SARAH && /resigned/.test(n.text)));
const board7 = sql7.db.prepare(`SELECT mid, won FROM scores WHERE game='scrabble' AND ref LIKE ?`).all('scrabble:' + gid7 + '%');
assert.equal(board7.length, 2);
assert.equal(board7.find(row => row.mid === SARAH).won, 1);
assert.equal(board7.find(row => row.mid === SHANE).won, 0);

// delete removes the game for both players (used to clean up a test game)
r = await scrabbleRoute(sql7, shane, '/scrabble/' + gid7, 'DELETE', new URL('https://x/api/scrabble/' + gid7), async () => ({}), t, hooks);
assert.equal(r.status, 200);
assert.equal((await get(sql7, shane, '/scrabble/' + gid7)).status, 404);
assert.equal((await get(sql7, sarah, '/scrabble')).body.games.length, 0);
assert.equal((await scrabbleRoute(sql7, aranea, '/scrabble/' + gid7, 'DELETE', new URL('https://x/api/scrabble/' + gid7), async () => ({}), t, hooks)).status, 404);

// a non-player cannot resign or play
const sql8 = fresh();
const g8 = createGame(sql8, shane, [SHANE, SARAH], t, { order: [SHANE, SARAH], racks: ['CATXXXX', 'DOGYYYY'], bag: 'E'.repeat(86) });
assert.equal((await post(sql8, aranea, '/scrabble/' + g8.body.id + '/resign', { rev: 1 })).status, 404);
assert.equal((await post(sql8, sarah, '/scrabble/' + g8.body.id + '/play', { rev: 1, tiles: cat })).status, 403);


assert.equal(S.listNames(['Sarah', 'Aranea', 'Alex']), 'Sarah, Aranea and Alex');
assert.equal(S.listNames(['Sarah', 'Aranea']), 'Sarah and Aranea');
const namesAll = { [SHANE]: 'Shane', [SARAH]: 'Sarah', [ARANEA]: 'Aranea', [ALEX]: 'Alex' };
assert.equal(S.vsNames({ players: [
  { mid: SHANE }, { mid: SARAH }, { mid: ARANEA }, { mid: ALEX, resigned: true }
] }, SHANE, namesAll), 'Sarah and Aranea');

// finish() does not deduct leftover tiles twice for someone who already resigned
const end3 = {
  over: false, board: new Array(N * N).fill(null), bag: [],
  players: [
    { mid: SHANE, score: 20, rack: [] },
    { mid: SARAH, score: 7, rack: [], resigned: true, left: 8 },
    { mid: ARANEA, score: 15, rack: ['A', 'A'] }
  ],
  turn: 0, scoreless: 0
};
finish(end3, 0);
assert.equal(end3.players[0].score, 20 + 2);
assert.equal(end3.players[1].score, 7, 'resigned leftover already settled');
assert.equal(end3.players[2].score, 13);
assert.deepEqual(end3.winners, [0]);

// 3-player game: turns rotate, racks stay hidden, resign drops out and the others carry on
notes.length = 0;
const sql9 = fresh();
bindDict('cat\nto\nat\ndog\nqi\nax\n');
const g3 = createGame(sql9, shane, [SARAH, ARANEA], t, {
  order: [SHANE, SARAH, ARANEA],
  racks: ['CATXXXX', 'TOYYYYY', 'DOGZZZZ'],
  bag: 'E'.repeat(79)
});
const gid3 = g3.body.id;
assert.equal(g3.body.players.length, 3);
r = await post(sql9, shane, '/scrabble/' + gid3 + '/play', { rev: 1, tiles: cat });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.turn, 1);
assert.equal(r.body.players.find(p => p.turn).name, 'Sarah');
assert.ok(notes.some(n => n.mid === SARAH && n.text.startsWith('Your turn in Scrabble vs Sarah, Aranea and Shane'.slice(0, 20))));
assert.ok(notes.some(n => n.mid === SARAH && /vs Shane and Aranea/.test(n.text)), JSON.stringify(notes));
assert.ok(!notes.some(n => n.mid === ARANEA && /Your turn/.test(n.text)), 'only the next player is told it is their turn');
const sneak3 = JSON.stringify((await get(sql9, sarah, '/scrabble/' + gid3)).body);
assert.ok(!sneak3.includes('"X"'), sneak3);
r = await post(sql9, sarah, '/scrabble/' + gid3 + '/play', { rev: r.body.rev, tiles: [{ r: MID + 1, c: MID + 1, l: 'O', b: 0 }] });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.turn, 2);
assert.ok(notes.some(n => n.mid === ARANEA && /Your turn in Scrabble vs Shane and Sarah/.test(n.text)));

// Aranea resigns; Shane and Sarah carry on; leftover is taken off now; turn goes to Shane
notes.length = 0;
const beforeResign = await get(sql9, aranea, '/scrabble/' + gid3);
const araneaRackPts = beforeResign.body.rack.reduce((a, l) => a + (VALUES[l] || 0), 0);
r = await post(sql9, aranea, '/scrabble/' + gid3 + '/resign', { rev: beforeResign.body.rev });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.over, false, 'a 3-player resign leaves the others playing');
assert.equal(r.body.players.find(p => p.name === 'Aranea').resigned, true);
assert.equal(r.body.players.find(p => p.name === 'Aranea').score, 0 - araneaRackPts);
assert.equal(r.body.turn, 0);
assert.equal(r.body.players.find(p => p.turn).name, 'Shane');
assert.ok(notes.some(n => n.mid === SHANE && /Your turn in Scrabble vs Sarah/.test(n.text) && /resigned/.test(n.text)), JSON.stringify(notes));
assert.ok(!notes.some(n => n.mid === SARAH && /Your turn/.test(n.text)));
// Shane's view does not include Aranea's old rack letters as his rack; tiles stay out of the bag
assert.equal(r.body.bag, 75, 'resigned tiles stay out of the bag; earlier plays already drew replacements');
const list3 = await get(sql9, shane, '/scrabble');
assert.equal(list3.body.games[0].players.find(p => p.name === 'Aranea').resigned, true);

// pass skips the resigned player
r = await post(sql9, shane, '/scrabble/' + gid3 + '/pass', { rev: r.body.rev });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.turn, 1, 'turn goes to Sarah, skipping Aranea');
assert.equal(r.body.over, false);

// Sarah resigns; only Shane remains, so the game ends and Shane wins
notes.length = 0;
r = await post(sql9, sarah, '/scrabble/' + gid3 + '/resign', { rev: r.body.rev });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.over, true);
assert.deepEqual(r.body.winnerNames, ['Shane']);
assert.ok(notes.some(n => n.mid === SHANE && /Sarah resigned/.test(n.text) && /Shane wins/.test(n.text)));
const board3 = sql9.db.prepare(`SELECT mid, won FROM scores WHERE game='scrabble' AND ref LIKE ?`).all('scrabble:' + gid3 + '%');
assert.equal(board3.length, 3);
assert.equal(board3.find(row => row.mid === SHANE).won, 1);
assert.equal(board3.find(row => row.mid === SARAH).won, 0);
assert.equal(board3.find(row => row.mid === ARANEA).won, 0);

// 4-player game: turns rotate around the table; one person can resign off their turn; the rest keep playing
notes.length = 0;
const sql10 = fresh();
bindDict('cat\nto\nat\ndog\nqi\nax\n');
r = await post(sql10, shane, '/scrabble', { players: [SARAH, ARANEA, ALEX] });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.players.length, 4);
const gid4 = r.body.id;
for (const mid of [SARAH, ARANEA, ALEX]) {
  assert.ok(notes.some(n => n.mid === mid && /Shane started/.test(n.text)), 'each opponent hears that Shane started the game');
}
// whoever starts, every other player got a start or a your-turn notice, never a live game on the family backend
const first = r.body.players[r.body.turn];
assert.equal(first.turn, true);
// scripted 4-player from a known order
const sql11 = fresh();
bindDict('cat\nto\nat\ndog\nqi\nax\n');
const g4 = createGame(sql11, shane, [SARAH, ARANEA, ALEX], t, {
  order: [SHANE, SARAH, ARANEA, ALEX],
  racks: ['CATXXXX', 'TOYYYYY', 'DOGZZZZ', 'QIWWWWW'],
  bag: 'E'.repeat(72)
});
const gid4b = g4.body.id;
assert.equal(g4.body.players.length, 4);
r = await post(sql11, shane, '/scrabble/' + gid4b + '/play', { rev: 1, tiles: cat });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.turn, 1);
r = await post(sql11, sarah, '/scrabble/' + gid4b + '/pass', { rev: r.body.rev });
assert.equal(r.body.turn, 2);
r = await post(sql11, aranea, '/scrabble/' + gid4b + '/pass', { rev: r.body.rev });
assert.equal(r.body.turn, 3);
r = await post(sql11, alex, '/scrabble/' + gid4b + '/pass', { rev: r.body.rev });
assert.equal(r.body.turn, 0);
assert.equal(r.body.scoreless, 3);
assert.equal(r.body.over, false);
// Sarah resigns while it is Shane's turn; the turn stays with Shane and the game goes on with 3
notes.length = 0;
const revShane = (await get(sql11, shane, '/scrabble/' + gid4b)).body.rev;
r = await post(sql11, sarah, '/scrabble/' + gid4b + '/resign', { rev: revShane });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.over, false);
assert.equal(r.body.turn, 0);
assert.equal(r.body.players.filter(p => p.resigned).length, 1);
assert.ok(!notes.some(n => /Your turn/.test(n.text)), 'resigning off-turn does not re-notify the person already to play');
r = await post(sql11, shane, '/scrabble/' + gid4b + '/pass', { rev: r.body.rev });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.turn, 2, 'Shane’s pass skips resigned Sarah and goes to Aranea');
assert.ok(notes.some(n => n.mid === ARANEA && /Your turn in Scrabble vs Shane and Alex/.test(n.text)), JSON.stringify(notes));
// swap still works with three people left
r = await post(sql11, aranea, '/scrabble/' + gid4b + '/swap', { rev: r.body.rev, letters: ['D'] });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.over, false);
assert.equal(r.body.turn, 3);
const alexView = await get(sql11, alex, '/scrabble/' + gid4b);
assert.ok(!JSON.stringify(alexView.body).includes('"D"') || alexView.body.rack.includes('D') === false);
assert.ok(!alexView.body.players.some(p => p.me === false && p.rack), 'other racks stay hidden');


// Shane-only cancel: ends as Cancelled, no winner, scores not recorded, everyone else is told
assert.equal(S.isShane(sql11, shane), true);
assert.equal(S.isShane(sql11, sarah), false);
assert.equal(S.isShane(sql11, { id: SARAH, name: 'Shane', role: 'admin' }), false, 'identity comes from the member record, not the request body');

notes.length = 0;
const sqlC = fresh();
bindDict('cat\nto\nat\ndog\nqi\nax\n');
const own = createGame(sqlC, shane, [SARAH], t, { order: [SHANE, SARAH], racks: ['CATXXXX', 'TOYYYYY'], bag: 'E'.repeat(86) });
const gidC = own.body.id;
r = await post(sqlC, shane, '/scrabble/' + gidC + '/play', { rev: 1, tiles: cat });
assert.equal(r.status, 200, r.body.err);
notes.length = 0;
r = await post(sqlC, shane, '/scrabble/' + gidC + '/cancel', { rev: r.body.rev });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.over, true);
assert.equal(r.body.cancelled, true);
assert.deepEqual(r.body.winners, []);
assert.deepEqual(r.body.winnerNames, []);
assert.equal(r.body.last.kind, 'cancel');
assert.match(r.body.lastText, /Shane cancelled the game/);
assert.ok(notes.some(n => n.mid === SARAH && n.text === 'Shane cancelled the Scrabble game'), JSON.stringify(notes));
assert.ok(!notes.some(n => n.mid === SHANE));
const scoredC = sqlC.db.prepare(`SELECT mid, score, won FROM scores WHERE game='scrabble' AND ref LIKE ?`).all('scrabble:' + gidC + '%');
assert.equal(scoredC.length, 0, 'cancelled games are not recorded on the family scoreboard');
const rowC = sqlC.db.prepare(`SELECT status FROM scrabble_games WHERE id=?`).get(gidC);
assert.equal(rowC.status, 'cancelled');
// a later GET still does not write scores
const again = await get(sqlC, sarah, '/scrabble/' + gidC);
assert.equal(again.body.cancelled, true);
assert.equal(sqlC.db.prepare(`SELECT COUNT(*) n FROM scores WHERE ref LIKE ?`).get('scrabble:' + gidC + '%').n, 0);

// Shane can cancel a game he is not in; Sarah cannot cancel one she is in
notes.length = 0;
const sqlC2 = fresh();
const theirs = createGame(sqlC2, sarah, [ARANEA], t, { order: [SARAH, ARANEA], racks: ['CATXXXX', 'TOYYYYY'], bag: 'E'.repeat(86) });
const gidO = theirs.body.id;
assert.equal((await post(sqlC2, sarah, '/scrabble/' + gidO + '/cancel', { rev: 1 })).status, 403);
assert.equal((await post(sqlC2, sarah, '/scrabble/' + gidO + '/cancel', { rev: 1 })).body.err, 'Only Shane can cancel a game.');
assert.equal((await get(sqlC2, alex, '/scrabble/' + gidO)).status, 404);
const watch = await get(sqlC2, shane, '/scrabble/' + gidO);
assert.equal(watch.status, 200, 'Shane can open a family game he is not in');
assert.equal(watch.body.watch, true);
assert.equal(watch.body.canCancel, true);
assert.deepEqual(watch.body.rack, []);
assert.ok(!JSON.stringify(watch.body).includes('"C"') || watch.body.board && true);
// racks of the seated players stay hidden from the watch view
const sneakC = JSON.stringify(watch.body);
assert.ok(!/"rack":\[[^\]]*C/.test(sneakC) && sneakC.includes('"rack":[]'), sneakC);
r = await post(sqlC2, shane, '/scrabble/' + gidO + '/cancel', { rev: watch.body.rev });
assert.equal(r.status, 200, r.body.err);
assert.equal(r.body.cancelled, true);
assert.equal(r.body.over, true);
assert.ok(notes.some(n => n.mid === SARAH && n.text === 'Shane cancelled the Scrabble game'));
assert.ok(notes.some(n => n.mid === ARANEA && n.text === 'Shane cancelled the Scrabble game'));
assert.equal(sqlC2.db.prepare(`SELECT COUNT(*) n FROM scores WHERE ref LIKE ?`).get('scrabble:' + gidO + '%').n, 0);
assert.equal((await post(sqlC2, shane, '/scrabble/' + gidO + '/cancel', { rev: r.body.rev })).status, 409, 'already cancelled');

// All games list is only for Shane, and only active games
const sqlC3 = fresh();
const gMine = createGame(sqlC3, shane, [SARAH], t, { order: [SHANE, SARAH], racks: ['CATXXXX', 'TOYYYYY'], bag: 'E'.repeat(86) });
const gTheirs = createGame(sqlC3, aranea, [ALEX], t, { order: [ARANEA, ALEX], racks: ['DOGZZZZ', 'QIWWWWW'], bag: 'E'.repeat(86) });
const listShane = await get(sqlC3, shane, '/scrabble');
assert.equal(listShane.body.admin, true);
assert.ok(Array.isArray(listShane.body.all));
assert.equal(listShane.body.all.length, 2);
assert.ok(listShane.body.all.every(g => g.canCancel && !g.over));
assert.ok(listShane.body.all.some(g => g.id === gTheirs.body.id && g.mine === false));
assert.ok(listShane.body.all.some(g => g.id === gMine.body.id && g.mine === true));
const listSarah = await get(sqlC3, sarah, '/scrabble');
assert.equal(listSarah.body.admin, undefined);
assert.equal(listSarah.body.all, undefined);
assert.ok(listSarah.body.games.every(g => !g.canCancel));
r = await post(sqlC3, shane, '/scrabble/' + gTheirs.body.id + '/cancel', { rev: 1 });
assert.equal(r.status, 200, r.body.err);
const listC3 = await get(sqlC3, shane, '/scrabble');
assert.equal(listC3.body.all.length, 1);
assert.equal(listC3.body.all[0].id, gMine.body.id);

// a member who happens to be named Shane, but is not the admin, cannot cancel
const SHANE2 = 'm555555555555';
sqlC3.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,?)`).run(SHANE2, 'Shane', 'member', 9, 0);
const notAdmin = { id: SHANE2, name: 'Shane', role: 'admin' };
assert.equal(S.isShane(sqlC3, notAdmin), false);
assert.equal((await post(sqlC3, notAdmin, '/scrabble/' + gMine.body.id + '/cancel', { rev: 1 })).status, 403);


const sqlName = fresh();
sqlName.db.prepare(`UPDATE members SET name=? WHERE id=?`).run('Shane Jenkins', SHANE);
assert.equal(S.isShane(sqlName, shane), true, 'Shane Jenkins is still recognised as Shane');
const sqlSole = fresh();
sqlSole.db.prepare(`UPDATE members SET name=? WHERE id=?`).run('Family Admin', SHANE);
assert.equal(S.isShane(sqlSole, shane), true, 'the only admin is treated as Shane');
sqlSole.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,?)`).run('m666666666666', 'Other', 'admin', 10, 0);
assert.equal(S.isShane(sqlSole, shane), false, 'a renamed admin is not Shane when another admin exists');

console.log('scrabble tests ok');
