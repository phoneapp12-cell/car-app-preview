// node worker/test/scores.test.mjs : family scoreboard checks and handlers, against an in-memory SQLite that behaves like
// the Durable Object's ctx.storage.sql (exec(query, ...bindings).toArray()).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { checkScore, tetrisMax, scoresInit, scoresRoute, addScore, board, RATE, clearShaneTetrisOnce, CLEAR_SHANE_TETRIS_KEY } from '../src/scores.js';

function stubSql() {
  const db = new DatabaseSync(':memory:');
  return {
    db,
    exec(q, ...a) {
      if (!a.length && q.trim().replace(/;\s*$/, '').includes(';')) { db.exec(q); return { toArray: () => [] }; }
      const st = db.prepare(q);
      const out = /^\s*select/i.test(q) ? st.all(...a) : (st.run(...a), []);
      return { toArray: () => out.map(r => ({ ...r })) };
    }
  };
}

// ---- validation
assert.deepEqual(checkScore({ game: 'tetris', score: 1200, lines: 12, level: 2 }).ok, { game: 'tetris', score: 1200, lines: 12, level: 2, won: null, opp: null });
assert.equal(checkScore({ game: 'tetris', score: 0 }).ok.level, 1);
assert.ok(checkScore({ game: 'chess', score: 1 }).err);
assert.ok(checkScore(null).err);
assert.ok(checkScore({ game: 'tetris', score: -1, lines: 0 }).err);
assert.ok(checkScore({ game: 'tetris', score: 1.5, lines: 0 }).err);
assert.ok(checkScore({ game: 'tetris', score: '500', lines: 0 }).err);
assert.ok(checkScore({ game: 'tetris', score: 1e9, lines: 9999 }).err, 'over the overall cap');
assert.ok(checkScore({ game: 'tetris', score: 50000, lines: 0 }).err, 'no lines, no big score');
assert.ok(checkScore({ game: 'tetris', score: 2000, lines: 0 }).ok, 'drop points only');
assert.ok(checkScore({ game: 'tetris', score: 1000, lines: 10, level: 5 }).err, 'level must match lines');
assert.ok(checkScore({ game: 'tetris', score: 100, lines: 100000 }).err);
assert.ok(tetrisMax(40) > 40 * 800 / 4 * 5, 'a real 40-line game at level 5 fits');
assert.ok(checkScore({ game: 'scrabble', score: 412, won: true, opponent: 'computer' }).ok);
assert.equal(checkScore({ game: 'scrabble', score: 0 }).ok.opp, 'computer');
assert.ok(checkScore({ game: 'scrabble', score: 1500 }).ok);
assert.ok(checkScore({ game: 'scrabble', score: 1501 }).err);
assert.ok(checkScore({ game: 'scrabble', score: -3 }).err);
assert.ok(checkScore({ game: 'scrabble', score: 300, opponent: 'robot' }).err);
assert.ok(checkScore({ game: 'scrabble', score: 300, won: 'yes' }).err);

// ---- handlers
const sql = stubSql();
sql.db.exec(`CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, tok TEXT, created INTEGER, seen INTEGER, removed INTEGER DEFAULT 0)`);
for (const [id, name, role, removed] of [['m1', 'Shane', 'admin', 0], ['m2', 'Sarah', 'member', 0], ['m3', 'Aranea', 'member', 0], ['m9', 'Gone', 'member', 1]])
  sql.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,?)`).run(id, name, role, 1, removed);
scoresInit(sql); scoresInit(sql); // safe to run every time the object starts
const shane = { id: 'm1', name: 'Shane' }, sarah = { id: 'm2', name: 'Sarah' }, aranea = { id: 'm3', name: 'Aranea' }, gone = { id: 'm9', name: 'Gone' };
let t = Date.UTC(2026, 10, 11, 8);
const post = (me, b) => { t += 60e3; return scoresRoute(sql, me, '/scores', 'POST', new URL('https://x/api/scores'), async () => b, t); };
const get = (me, game) => scoresRoute(sql, me, '/scores', 'GET', new URL('https://x/api/scores?game=' + game), async () => ({}), t);

assert.equal(await scoresRoute(sql, shane, '/people', 'GET', new URL('https://x/api/people'), async () => ({})), null, 'other paths fall through');
assert.equal((await scoresRoute(sql, shane, '/scores', 'PUT', new URL('https://x/api/scores'), async () => ({}))).status, 405);
let r = await post(shane, { game: 'tetris', score: 3100, lines: 21, level: 3, name: 'Hacker' });
assert.equal(r.status, 200); assert.equal(r.body.rank, 1); assert.equal(r.body.newBest, true);
r = await post(sarah, { game: 'tetris', score: 5200, lines: 32, level: 4 }); assert.equal(r.body.rank, 1);
r = await post(shane, { game: 'tetris', score: 900, lines: 8, level: 1 }); assert.equal(r.body.newBest, false); assert.equal(r.body.best, 3100);
r = await post(gone, { game: 'tetris', score: 9000, lines: 50, level: 6 }); assert.equal(r.status, 200);
r = await post(aranea, { game: 'tetris', score: 99999, lines: 1, level: 1 }); assert.equal(r.status, 400, 'impossible score refused');
r = await post(aranea, { game: 'tetris', score: 1, lines: 0, level: 1 });
r = await scoresRoute(sql, aranea, '/scores', 'POST', null, async () => ({ game: 'tetris', score: 2, lines: 0 }), t + 2000);
assert.equal(r.status, 429, 'two games inside 15 seconds');
r = await get(sarah, 'tetris');
assert.equal(r.status, 200);
assert.deepEqual(r.body.top.map(x => [x.name, x.score]), [['Sarah', 5200], ['Shane', 3100], ['Shane', 900], ['Aranea', 1]], 'removed members are hidden; names come from the server');
assert.equal(r.body.top[0].mine, true); assert.equal(r.body.top[1].mine, false);
assert.deepEqual(r.body.best.map(x => [x.name, x.score, x.games]), [['Sarah', 5200, 1], ['Shane', 3100, 2], ['Aranea', 1, 1]]);
assert.ok(!JSON.stringify(r.body).includes('Hacker') && !JSON.stringify(r.body).includes('m1'), 'no client names or member ids');
assert.equal((await get(sarah, 'pong')).status, 400);

await post(shane, { game: 'scrabble', score: 388, won: true, opponent: 'computer' });
await post(shane, { game: 'scrabble', score: 290, won: false, opponent: 'computer' });
await post(shane, { game: 'scrabble', score: 341, won: true, opponent: 'family' });
await post(sarah, { game: 'scrabble', score: 402, won: true, opponent: 'family' });
r = await get(shane, 'scrabble');
assert.deepEqual(r.body.top.map(x => [x.name, x.score, x.won, x.opp]), [['Sarah', 402, true, 'family'], ['Shane', 388, true, 'computer'], ['Shane', 341, true, 'family'], ['Shane', 290, false, 'computer']]);
const sb = Object.fromEntries(r.body.best.map(x => [x.name, x]));
assert.equal(sb.Shane.winsComputer, 1); assert.equal(sb.Shane.winsFamily, 1); assert.equal(sb.Shane.games, 3); assert.equal(sb.Sarah.winsFamily, 1);
assert.equal(r.body.top.length <= 10, true);
for (let i = 0; i < 12; i++) await post(aranea, { game: 'scrabble', score: 100 + i });
assert.equal((await get(aranea, 'scrabble')).body.top.length, 10, 'top 10 only');

// daily limit
const sql2 = stubSql(); sql2.db.exec(`CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT, role TEXT, removed INTEGER DEFAULT 0)`); sql2.db.exec(`INSERT INTO members VALUES ('m1','Shane','admin',0)`); scoresInit(sql2);
let t2 = 1e12, last;
for (let i = 0; i <= RATE.perDay; i++) { t2 += RATE.gapMs + 1; last = addScore(sql2, shane, { game: 'scrabble', score: 50 }, t2); }
assert.equal(last.status, 429); assert.equal(board(sql2, shane, 'scrabble').body.best[0].games, RATE.perDay);

// family.js wires the route in after the member token check, with the score table set up in the constructor
const fam = fs.readFileSync(new URL('../src/family.js', import.meta.url), 'utf8');
assert.ok(fam.indexOf('scoresRoute(this.sql, me') > fam.indexOf("if (!me) return J({ err: 'not a member' }, 401)"));
assert.ok(fam.includes('scoresInit(this.sql)'));

// one-off: clear only the admin named Shane from the Tetris table; leave Scrabble and everyone else
const sql3 = stubSql();
sql3.db.exec(`CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT, role TEXT, removed INTEGER DEFAULT 0)`);
for (const [id, name, role] of [['m1', 'Shane Jenkins', 'admin'], ['m2', 'Sarah', 'member'], ['m4', 'Shane', 'member'], ['m5', 'Alex', 'admin']])
  sql3.db.prepare(`INSERT INTO members VALUES (?,?,?,0)`).run(id, name, role);
scoresInit(sql3);
sql3.db.prepare('DELETE FROM meta WHERE k=?').run(CLEAR_SHANE_TETRIS_KEY); // simulate production before the one-off (flag not yet set)
const ins = sql3.db.prepare(`INSERT INTO scores (game,mid,score,lines,level,won,opp,at) VALUES (?,?,?,?,?,?,?,?)`);
ins.run('tetris', 'm1', 6400, 40, 5, null, null, 100);
ins.run('tetris', 'm1', 1200, 10, 2, null, null, 90);
ins.run('tetris', 'm2', 8000, 50, 6, null, null, 80);
ins.run('tetris', 'm4', 3000, 20, 3, null, null, 70); // a non-admin also named Shane
ins.run('scrabble', 'm1', 412, null, null, 1, 'computer', 60);
ins.run('scrabble', 'm2', 380, null, null, 1, 'family', 50);
const rec = clearShaneTetrisOnce(sql3);
assert.equal(rec.already, undefined);
assert.equal(rec.matched, 1);
assert.equal(rec.deleted.length, 1);
assert.equal(rec.deleted[0].n, 2);
assert.equal(rec.deleted[0].top, 6400);
assert.deepEqual(board(sql3, shane, 'tetris').body.top.map(x => [x.name, x.score]), [['Sarah', 8000], ['Shane', 3000]], 'only the admin Shane is removed from Tetris');
assert.deepEqual(board(sql3, shane, 'scrabble').body.top.map(x => [x.name, x.score]), [['Shane Jenkins', 412], ['Sarah', 380]], 'Scrabble is untouched');
// a later Tetris score from Shane is kept; a second clear is a no-op
assert.equal(addScore(sql3, shane, { game: 'tetris', score: 500, lines: 4, level: 1 }, 1e12).status, 200);
const rec2 = clearShaneTetrisOnce(sql3);
assert.equal(rec2.already, true);
assert.equal(rec2.deleted[0].n, 2);
assert.deepEqual(board(sql3, shane, 'tetris').body.top.map(x => [x.name, x.score]), [['Sarah', 8000], ['Shane', 3000], ['Shane Jenkins', 500]]);
assert.ok(fam.includes('clearShaneTetrisOnce(this.sql)'));

console.log('scores tests ok');
