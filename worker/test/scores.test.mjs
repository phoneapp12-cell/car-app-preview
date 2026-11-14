// node worker/test/scores.test.mjs : family scoreboard checks and handlers, against an in-memory SQLite that behaves like
// the Durable Object's ctx.storage.sql (exec(query, ...bindings).toArray()).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { checkScore, tetrisMax, scoresInit, scoresRoute, addScore, board, RATE, RACE_ICONS, RACE_LIMITS, checkRace, saveRace, raceBoard, clearShaneTetrisOnce, CLEAR_SHANE_TETRIS_KEY, clearShaneTetrisOnce20261113, CLEAR_SHANE_TETRIS_KEY2, clearAllTetrisOnce20261114, CLEAR_ALL_TETRIS_KEY, RACE_STOP_IDS, sugarStopsOnce20261114, SUGAR_STOPS_KEY, expireRaces, LIVES, nzDay, lifeKey } from '../src/scores.js';

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


// 13 Nov 2026 one-off: a second clear, after the first flag is already set (as in production)
const sql4 = stubSql();
sql4.db.exec(`CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT, role TEXT, removed INTEGER DEFAULT 0)`);
for (const [id, name, role] of [['m1', 'Shane Jenkins', 'admin'], ['m2', 'Sarah', 'member'], ['m4', 'Shane', 'member'], ['m5', 'Alex', 'admin']])
  sql4.db.prepare(`INSERT INTO members VALUES (?,?,?,0)`).run(id, name, role);
scoresInit(sql4);
// first flag stays set (as in production); second flag is not yet set
sql4.db.prepare('DELETE FROM meta WHERE k=?').run(CLEAR_SHANE_TETRIS_KEY2);
// Shane has posted new Tetris games since the 12 Nov clear
const ins4 = sql4.db.prepare(`INSERT INTO scores (game,mid,score,lines,level,won,opp,at) VALUES (?,?,?,?,?,?,?,?)`);
ins4.run('tetris', 'm1', 9900, 50, 6, null, null, 200);
ins4.run('tetris', 'm1', 2100, 16, 2, null, null, 190);
ins4.run('tetris', 'm2', 8000, 50, 6, null, null, 180);
ins4.run('tetris', 'm4', 3000, 20, 3, null, null, 170);
ins4.run('scrabble', 'm1', 412, null, null, 1, 'computer', 160);
const rec13 = clearShaneTetrisOnce20261113(sql4);
assert.equal(rec13.already, undefined);
assert.equal(rec13.matched, 1);
assert.equal(rec13.deleted.length, 1);
assert.equal(rec13.deleted[0].n, 2);
assert.equal(rec13.deleted[0].top, 9900);
assert.deepEqual(rec13.newLeader, { name: 'Sarah', score: 8000 });
assert.deepEqual(board(sql4, shane, 'tetris').body.top.map(x => [x.name, x.score]), [['Sarah', 8000], ['Shane', 3000]], 'only the admin Shane is removed from Tetris');
assert.deepEqual(board(sql4, shane, 'scrabble').body.top.map(x => [x.name, x.score]), [['Shane Jenkins', 412]], 'Scrabble is untouched');
assert.equal(addScore(sql4, shane, { game: 'tetris', score: 500, lines: 4, level: 1 }, 2e12).status, 200);
const rec13b = clearShaneTetrisOnce20261113(sql4);
assert.equal(rec13b.already, true);
assert.equal(rec13b.deleted[0].n, 2);
assert.deepEqual(board(sql4, shane, 'tetris').body.top.map(x => [x.name, x.score]), [['Sarah', 8000], ['Shane', 3000], ['Shane Jenkins', 500]]);
assert.ok(fam.includes('clearShaneTetrisOnce20261113(this.sql)'));

// 14 Nov 2026 one-off: clear everyone's Tetris scores; leave Scrabble
const sql5 = stubSql();
sql5.db.exec(`CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT, role TEXT, removed INTEGER DEFAULT 0)`);
for (const [id, name, role] of [['m1', 'Shane Jenkins', 'admin'], ['m2', 'Sarah', 'member'], ['m4', 'Shane', 'member'], ['m5', 'Alex', 'admin']])
  sql5.db.prepare(`INSERT INTO members VALUES (?,?,?,0)`).run(id, name, role);
scoresInit(sql5);
sql5.db.prepare('DELETE FROM meta WHERE k=?').run(CLEAR_ALL_TETRIS_KEY);
const ins5 = sql5.db.prepare(`INSERT INTO scores (game,mid,score,lines,level,won,opp,at) VALUES (?,?,?,?,?,?,?,?)`);
ins5.run('tetris', 'm1', 9900, 50, 6, null, null, 200);
ins5.run('tetris', 'm2', 8000, 50, 6, null, null, 180);
ins5.run('tetris', 'm4', 3000, 20, 3, null, null, 170);
ins5.run('tetris', 'm5', 1200, 10, 2, null, null, 160);
ins5.run('scrabble', 'm1', 412, null, null, 1, 'computer', 150);
ins5.run('scrabble', 'm2', 380, null, null, 1, 'family', 140);
const recAll = clearAllTetrisOnce20261114(sql5);
assert.equal(recAll.already, undefined);
assert.equal(recAll.n, 4);
assert.equal(recAll.members.length, 4);
assert.equal(board(sql5, shane, 'tetris').body.top.length, 0, 'every Tetris score is gone');
assert.equal(board(sql5, shane, 'tetris').body.best.length, 0);
assert.deepEqual(board(sql5, shane, 'scrabble').body.top.map(x => [x.name, x.score]), [['Shane Jenkins', 412], ['Sarah', 380]], 'Scrabble is untouched');
assert.ok(recAll.scores.some(s => s.score === 9900 && s.name === 'Shane Jenkins'), 'backup rows are stored in the meta record');
assert.equal(addScore(sql5, shane, { game: 'tetris', score: 500, lines: 4, level: 1 }, 3e12).status, 200);
assert.deepEqual(board(sql5, shane, 'tetris').body.top.map(x => [x.name, x.score]), [['Shane Jenkins', 500]], 'a new Tetris score still saves and shows');
const recAll2 = clearAllTetrisOnce20261114(sql5);
assert.equal(recAll2.already, true);
assert.equal(recAll2.n, 4);
assert.deepEqual(board(sql5, shane, 'tetris').body.top.map(x => [x.name, x.score]), [['Shane Jenkins', 500]], 'the second clear is a no-op');
assert.ok(fam.includes('clearAllTetrisOnce20261114(this.sql)'));


// 1.9.210 Sugar Rush family race: one row per member, unique icons, names from the server
assert.ok(RACE_ICONS.length >= 16);
assert.ok(checkRace({ icon: 'lolly', stop: 5, stars: 9 }).ok);
assert.ok(checkRace({ icon: 'spaceship', stop: 5, stars: 9 }).err, 'unknown icon refused');
assert.ok(checkRace({ icon: 'lolly', stop: 0, stars: 0 }).err);
// 1.9.219 Levels 11-15: the race now runs to stop 15 (Dunedin) with up to 45 stars.
// 1.9.220 Pacific Islands: stops 16-18 (Rarotonga, Tonga, Samoa), up to 54 stars.
// 1.9.222 Bluff + Australia: 22 stops, up to 66 stars.
assert.deepEqual(RACE_LIMITS, { stop: 22, stars: 66, gapMs: 1000, perDay: 300, wins: 1e6 });
assert.ok(checkRace({ icon: 'lolly', stop: 11, stars: 31 }).ok);
assert.ok(checkRace({ icon: 'lolly', stop: 15, stars: 45 }).ok);
assert.ok(checkRace({ icon: 'lolly', stop: 18, stars: 54 }).ok);
assert.ok(checkRace({ icon: 'lolly', stop: 22, stars: 66 }).ok);
assert.ok(checkRace({ icon: 'lolly', stop: 23, stars: 0 }).err);
assert.ok(checkRace({ icon: 'lolly', stop: 3, stars: 67 }).err);
assert.ok(checkRace({ icon: 'lolly', stop: 3, stars: -1 }).err);
assert.ok(checkRace({ icon: 'lolly', stop: 1.5, stars: 1 }).err);

const sqlR = stubSql();
sqlR.db.exec(`CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, tok TEXT, created INTEGER, seen INTEGER, removed INTEGER DEFAULT 0)`);
for (const [id, name, role, removed] of [['m1', 'Shane', 'admin', 0], ['m2', 'Sarah', 'member', 0], ['m3', 'Aranea', 'member', 0], ['m9', 'Gone', 'member', 1]])
  sqlR.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,?)`).run(id, name, role, 1, removed);
scoresInit(sqlR);
const racePost = (me, b, t) => scoresRoute(sqlR, me, '/sugar-race', 'POST', new URL('https://x/api/sugar-race'), async () => b, t);
const raceGet = (me) => scoresRoute(sqlR, me, '/sugar-race', 'GET', new URL('https://x/api/sugar-race'), async () => ({}), 1);
let rr = await racePost(shane, { icon: 'lolly', stop: 5, stars: 10 }, 1000);
assert.equal(rr.status, 200); assert.equal(rr.body.icon, 'lolly'); assert.equal(rr.body.stop, 5);
rr = await racePost(sarah, { icon: 'lolly', stop: 6, stars: 14 }, 2000);
assert.equal(rr.status, 409); assert.equal(rr.body.err, 'icon taken'); assert.ok(rr.body.suggested && rr.body.suggested !== 'lolly');
rr = await racePost(sarah, { icon: 'cupcake', stop: 6, stars: 14 }, 2000);
assert.equal(rr.status, 200);
rr = await racePost(aranea, { icon: 'kiwi', stop: 3, stars: 6 }, 3000);
assert.equal(rr.status, 200);
rr = await racePost(gone, { icon: 'train', stop: 10, stars: 30 }, 4000);
assert.equal(rr.status, 200, 'removed members can still write their own row');
rr = await raceGet(sarah);
assert.equal(rr.status, 200);
assert.deepEqual(rr.body.racers.map(x => [x.name, x.icon, x.stop, x.stars]), [['Sarah', 'cupcake', 6, 14], ['Shane', 'lolly', 5, 10], ['Aranea', 'kiwi', 3, 6]], 'removed members are hidden; sorted by stop then stars');
assert.equal(rr.body.racers[0].mine, true);
assert.ok(!JSON.stringify(rr.body).includes('m1') && !JSON.stringify(rr.body).includes('Gone'), 'no member ids or removed names');
// progress never goes backwards if a stale phone posts a lower stop
rr = await racePost(shane, { icon: 'lolly', stop: 2, stars: 3 }, 5000);
assert.equal(rr.status, 200); assert.equal(rr.body.stop, 5); assert.equal(rr.body.stars, 10);
rr = await racePost(shane, { icon: 'rocket', stop: 7, stars: 12 }, 6000);
assert.equal(rr.body.icon, 'rocket'); assert.equal(rr.body.stop, 7);
assert.equal((await raceGet(shane)).body.racers.find(x => x.mine).icon, 'rocket');
assert.equal((await scoresRoute(sqlR, shane, '/sugar-race', 'PUT', new URL('https://x/api/sugar-race'), async () => ({}), 7000)).status, 405);


// ---- 1.9.222 stops follow the level id, not its number
assert.equal(RACE_STOP_IDS.length, 22);
assert.equal(new Set(RACE_STOP_IDS).size, 22, 'level ids are unique');
assert.deepEqual(RACE_STOP_IDS.slice(15), ['oyster', 'hibiscus', 'coconut', 'shell', 'opera', 'wave', 'swan']);
assert.equal(checkRace({ icon: 'lolly', stop: 16, stars: 40, sid: 'oyster' }).ok.stop, 16, 'Bluff is stop 16');
assert.equal(checkRace({ icon: 'lolly', stop: 17, stars: 40, sid: 'hibiscus' }).ok.stop, 17);
assert.equal(checkRace({ icon: 'lolly', stop: 3, stars: 40, sid: 'swan' }).ok.stop, 22, 'the id wins over a wrong number');
assert.ok(checkRace({ icon: 'lolly', stop: 3, stars: 4, sid: 'nope' }).err);
assert.equal(checkRace({ icon: 'lolly', stop: 16, stars: 40 }).ok.stop, 17, 'a 1.9.220 phone at Rarotonga (16) lands on 17');
assert.equal(checkRace({ icon: 'lolly', stop: 18, stars: 50 }).ok.stop, 19, 'a 1.9.220 phone at Samoa (18) lands on 19');
assert.equal(checkRace({ icon: 'lolly', stop: 15, stars: 40 }).ok.stop, 15, '1-15 never moved');
assert.ok(checkRace({ icon: 'lolly', stop: 3, stars: 4, wins: -1 }).err);
// one-off migration of saved race rows 16-18 -> 17-19, exactly once
{
  const q = stubSql();
  q.db.exec(`CREATE TABLE sugar_race (mid TEXT PRIMARY KEY, icon TEXT NOT NULL, stop INTEGER NOT NULL, stars INTEGER NOT NULL, at INTEGER NOT NULL)`);
  for (const [mid, icon, stop] of [['a', 'lolly', 15], ['b', 'kiwi', 16], ['c', 'cat', 17], ['d', 'dog', 18]]) q.db.prepare(`INSERT INTO sugar_race VALUES (?,?,?,?,?)`).run(mid, icon, stop, 30, 1);
  q.db.exec(`CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, tok TEXT, created INTEGER, seen INTEGER, removed INTEGER DEFAULT 0)`);
  q.db.exec(`CREATE TABLE scores (id INTEGER PRIMARY KEY AUTOINCREMENT, mid TEXT, game TEXT, score INTEGER, lines INTEGER, level INTEGER, won INTEGER, opp TEXT, at INTEGER)`);
  scoresInit(q);
  assert.deepEqual(q.db.prepare(`SELECT mid, stop FROM sugar_race ORDER BY mid`).all().map(r => [r.mid, r.stop]), [['a', 15], ['b', 17], ['c', 18], ['d', 19]]);
  assert.ok(sugarStopsOnce20261114(q).already, 'second run is a no-op');
  scoresInit(q);
  assert.deepEqual(q.db.prepare(`SELECT stop FROM sugar_race ORDER BY mid`).all().map(r => r.stop), [15, 17, 18, 19], 'not moved twice');
  assert.ok(q.db.prepare(`SELECT v FROM meta WHERE k=?`).get(SUGAR_STOPS_KEY));
}
assert.ok(fam.includes('sugarStopsOnce20261114(this.sql)'));
assert.ok(fam.includes("this.rt.note(mid, 'sugar', text, card)"), 'race pushes go through the family notifications');

// ---- 1.9.222 family race events: start, progress, win, timeout
{
  const q = stubSql();
  q.db.exec(`CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, tok TEXT, created INTEGER, seen INTEGER, removed INTEGER DEFAULT 0)`);
  for (const [id, name] of [['m1', 'Shane'], ['m2', 'Sarah'], ['m3', 'Aranea'], ['m4', 'Nana'], ['m5', 'Pop']]) q.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,0)`).run(id, name, 'member', 1);
  scoresInit(q);
  const pushed = [];
  const hooks = { note: async (mid, text, card) => { pushed.push({ mid, text, card }); } };
  const T0 = 1_800_000_000_000;
  const post = (me, b, t) => scoresRoute(q, me, '/sugar-race', 'POST', new URL('https://x/api/sugar-race'), async () => b, t, hooks);
  const get = (me, t) => scoresRoute(q, me, '/sugar-race', 'GET', new URL('https://x/api/sugar-race'), async () => ({}), t, hooks);
  const S = { id: 'm1', name: 'Shane' }, H = { id: 'm2', name: 'Sarah' }, A = { id: 'm3', name: 'Aranea' }, N = { id: 'm4', name: 'Nana' }, P = { id: 'm5', name: 'Pop' };
  // start: one player alone at a stop is no race; a second arrival starts one for both
  let r = await post(S, { icon: 'lolly', stop: 20, stars: 50, sid: 'opera', wins: 30 }, T0);
  assert.equal(r.body.event, null);
  r = await post(H, { icon: 'cupcake', stop: 20, stars: 48, sid: 'opera', wins: 25 }, T0 + 1000);
  assert.ok(r.body.event && !r.body.event.done, 'Race on!');
  assert.equal(r.body.event.stop, 20); assert.equal(r.body.event.goal, 5);
  assert.deepEqual(r.body.event.racers.map(x => [x.name, x.icon, x.n]).sort(), [['Sarah', 'cupcake', 0], ['Shane', 'lolly', 0]]);
  assert.equal(r.body.event.ends - r.body.event.at, 48 * 36e5);
  assert.deepEqual(pushed.map(p => p.mid).sort(), ['m1', 'm2'], 'both racers get a push');
  assert.ok(pushed.every(p => /^🏁 Race on!/.test(p.text) && p.card === 'sugar-race-' + r.body.event.id));
  assert.ok(pushed.find(p => p.mid === 'm1').text.includes('Sarah') && pushed.find(p => p.mid === 'm2').text.includes('Shane'), 'the push lists the racers');
  const raceId = r.body.event.id;
  // no mid-race joins: a later arrival at the same stop isn't added, and no second race starts around the racers
  pushed.length = 0;
  r = await post(A, { icon: 'kiwi', stop: 20, stars: 45, sid: 'opera', wins: 20 }, T0 + 2000);
  assert.equal(r.body.event, null, 'Aranea is not added mid-race');
  assert.equal(pushed.length, 0);
  assert.equal(q.db.prepare(`SELECT COUNT(*) n FROM sugar_race_event WHERE done=0`).get().n, 1, 'one active race for the group');
  // progress: only new wins on the race stop or beyond count
  r = await post(S, { icon: 'lolly', stop: 21, stars: 52, sid: 'wave', wins: 31, lw: 20 }, T0 + 10_000);
  assert.equal(r.body.event.racers.find(x => x.mine).n, 1);
  r = await post(S, { icon: 'lolly', stop: 21, stars: 52, sid: 'wave', wins: 32, lw: 3 }, T0 + 20_000);
  assert.equal(r.body.event.racers.find(x => x.mine).n, 1, 'replaying an early level does not count');
  r = await post(S, { icon: 'lolly', stop: 21, stars: 52, sid: 'wave', wins: 32, lw: 21 }, T0 + 30_000);
  assert.equal(r.body.event.racers.find(x => x.mine).n, 1, 'a repeat post with no new win does not count');
  r = await post(H, { icon: 'cupcake', stop: 21, stars: 50, sid: 'wave', wins: 26, lw: 20 }, T0 + 40_000);
  assert.deepEqual(r.body.event.racers.map(x => [x.name, x.n]).sort(), [['Sarah', 1], ['Shane', 1]]);
  r = await get(N, T0 + 41_000);
  assert.equal(r.body.event, null, 'non-racers see no race card');
  // win: first to 5
  for (let k = 0; k < 3; k++) r = await post(S, { icon: 'lolly', stop: 22, stars: 55, sid: 'swan', wins: 33 + k, lw: 21 }, T0 + 50_000 + k * 2000);
  assert.equal(r.body.event.racers.find(x => x.mine).n, 4); assert.equal(r.body.event.done, false);
  pushed.length = 0;
  r = await post(S, { icon: 'lolly', stop: 22, stars: 58, sid: 'swan', wins: 36, lw: 22 }, T0 + 60_000);
  assert.equal(r.body.event.done, true); assert.equal(r.body.event.won, true); assert.equal(r.body.event.winner, 'Shane'); assert.equal(r.body.event.why, 'win');
  assert.ok(pushed.find(p => p.mid === 'm1' && /You won/.test(p.text)));
  assert.ok(pushed.find(p => p.mid === 'm2' && /Shane won/.test(p.text) && /consolation/.test(p.text)));
  r = await get(H, T0 + 61_000);
  assert.equal(r.body.event.id, raceId); assert.equal(r.body.event.done, true); assert.equal(r.body.event.won, false, 'Sarah sees the result');
  r = await get(H, T0 + 61_000 + 73 * 36e5);
  assert.equal(r.body.event, null, 'finished races drop off after 3 days');
  // timeout: Pop and Nana race, nobody reaches 5 in 48 hours, the leader wins
  pushed.length = 0;
  const T1 = T0 + 100 * 36e5;
  await post(P, { icon: 'bear', stop: 9, stars: 20, sid: 'path', wins: 20 }, T1);
  r = await post(N, { icon: 'bee', stop: 9, stars: 18, sid: 'path', wins: 10 }, T1 + 1000);
  assert.ok(r.body.event && r.body.event.racers.length === 2);
  await post(N, { icon: 'bee', stop: 10, stars: 20, sid: 'night', wins: 11, lw: 9 }, T1 + 5000);
  await post(P, { icon: 'bear', stop: 10, stars: 22, sid: 'night', wins: 21, lw: 9 }, T1 + 6000);
  await post(P, { icon: 'bear', stop: 11, stars: 24, sid: 'whale', wins: 22, lw: 10 }, T1 + 7000);
  r = await get(N, T1 + 47 * 36e5);
  assert.equal(r.body.event.done, false, 'still on at 47 hours');
  pushed.length = 0;
  r = await get(N, T1 + 1000 + 48 * 36e5);
  assert.equal(r.body.event.done, true); assert.equal(r.body.event.why, 'timeout'); assert.equal(r.body.event.winner, 'Pop');
  assert.ok(pushed.find(p => p.mid === 'm5' && /time's up/.test(p.text)));
  assert.ok(pushed.find(p => p.mid === 'm4' && /Pop won \(time ran out\)/.test(p.text)));
  // nobody winning a level before the timeout means no winner
  const q2 = stubSql();
  q2.db.exec(`CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, tok TEXT, created INTEGER, seen INTEGER, removed INTEGER DEFAULT 0)`);
  for (const [id, name] of [['x', 'X'], ['y', 'Y']]) q2.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,0)`).run(id, name, 'member', 1);
  scoresInit(q2);
  await scoresRoute(q2, { id: 'x', name: 'X' }, '/sugar-race', 'POST', new URL('https://x/'), async () => ({ icon: 'cat', stop: 4, stars: 9 }), T0);
  await scoresRoute(q2, { id: 'y', name: 'Y' }, '/sugar-race', 'POST', new URL('https://x/'), async () => ({ icon: 'dog', stop: 4, stars: 9 }), T0 + 1);
  const ev = expireRaces(q2, T0 + 49 * 36e5, []);
  assert.equal(ev.length, 2); assert.ok(ev.every(n => /before anyone won/.test(n.text)));
  assert.equal(q2.db.prepare(`SELECT winner FROM sugar_race_event`).get().winner, null);
  // stale players (no play for a week) don't get pulled into a race
  const q3 = stubSql();
  q3.db.exec(`CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, tok TEXT, created INTEGER, seen INTEGER, removed INTEGER DEFAULT 0)`);
  for (const id of ['x', 'y']) q3.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,0)`).run(id, id, 'member', 1);
  scoresInit(q3);
  await scoresRoute(q3, { id: 'x', name: 'x' }, '/sugar-race', 'POST', new URL('https://x/'), async () => ({ icon: 'cat', stop: 4, stars: 9 }), T0);
  r = await scoresRoute(q3, { id: 'y', name: 'y' }, '/sugar-race', 'POST', new URL('https://x/'), async () => ({ icon: 'dog', stop: 4, stars: 9 }), T0 + 8 * 864e5);
  assert.equal(r.body.event, null);
  assert.ok(!JSON.stringify(r.body).includes('"x"'), 'no member ids in the race view');
}

// ---- 1.9.222 Sugar Rush lives: send a life (once a day per recipient), claim on next open, ask family
{
  const q = stubSql();
  q.db.exec(`CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, tok TEXT, created INTEGER, seen INTEGER, removed INTEGER DEFAULT 0)`);
  for (const [id, name, removed] of [['m1', 'Shane Jenkins', 0], ['m2', 'Sarah', 0], ['m3', 'Aranea', 0], ['m9', 'Gone', 1]]) q.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES (?,?,?,?,?)`).run(id, name, 'member', 1, removed);
  scoresInit(q);
  const pushed = [];
  const hooks = { note: async (mid, text, card) => { pushed.push({ mid, text, card }); } };
  const S = { id: 'm1', name: 'Shane Jenkins' }, H = { id: 'm2', name: 'Sarah' }, A = { id: 'm3', name: 'Aranea' };
  const T = Date.parse('2026-11-14T08:00:00Z'); // 9pm Saturday 14 Nov in Auckland
  const get = (me, t) => scoresRoute(q, me, '/sugar-lives', 'GET', new URL('https://x/api/sugar-lives'), async () => ({}), t, hooks);
  const post = (me, b, t) => scoresRoute(q, me, '/sugar-lives', 'POST', new URL('https://x/api/sugar-lives'), async () => b, t, hooks);
  assert.equal(LIVES.perDay, 3);
  assert.equal(nzDay(T), '2026-11-14');
  assert.equal(nzDay(Date.parse('2026-11-14T11:30:00Z')), '2026-11-15', 'NZ midnight, not UTC');
  let r = await get(H, T);
  assert.deepEqual(r.body.family.map(f => f.name), ['Aranea', 'Shane Jenkins'], 'family list: not me, not removed members');
  assert.ok(!JSON.stringify(r.body).includes('m1') && !JSON.stringify(r.body).includes('Gone'), 'no member ids');
  assert.equal(r.body.pending, 0); assert.equal(r.body.asked, false);
  const shaneKey = r.body.family.find(f => f.name === 'Shane Jenkins').key;
  assert.equal(shaneKey, lifeKey('m1'));
  // sending
  r = await post(H, { act: 'send', to: shaneKey }, T);
  assert.equal(r.status, 200); assert.equal(r.body.sent, 'Shane');
  assert.deepEqual(pushed, [{ mid: 'm1', text: 'Sarah sent you a life ❤️', card: 'sugar-lives' }], 'the recipient gets a push');
  assert.equal(r.body.family.find(f => f.key === shaneKey).sent, true);
  assert.equal((await post(H, { act: 'send', to: lifeKey('m2') }, T)).status, 400, 'cannot send to yourself');
  assert.equal((await post(H, { act: 'send', to: lifeKey('m9') }, T)).status, 400, 'cannot send to a removed member');
  assert.equal((await post(H, { act: 'send', to: 'nope' }, T)).status, 400);
  assert.equal((await post(H, { act: 'wat' }, T)).status, 400);
  // the daily limit: once per day per recipient; a different recipient is fine; a new NZ day resets it
  pushed.length = 0;
  r = await post(H, { act: 'send', to: shaneKey }, T + 3600e3);
  assert.equal(r.status, 429); assert.equal(r.body.err, 'already sent today'); assert.equal(pushed.length, 0);
  assert.equal((await post(H, { act: 'send', to: lifeKey('m3') }, T + 60e3)).status, 200, 'another family member can still get one');
  assert.equal((await post(A, { act: 'send', to: shaneKey }, T + 120e3)).status, 200, 'Aranea can send Shane one too');
  const NEXT = Date.parse('2026-11-14T11:05:00Z'); // 12:05am Sunday in Auckland
  assert.equal((await post(H, { act: 'send', to: shaneKey }, NEXT)).status, 200, 'a new NZ day, a new gift');
  // claiming: Shane gets every pending gift once, on his next open
  r = await get(S, NEXT + 1000);
  assert.equal(r.body.pending, 3);
  r = await post(S, { act: 'claim' }, NEXT + 2000);
  assert.equal(r.body.claimed, 3); assert.deepEqual(r.body.from, ['Sarah', 'Aranea', 'Sarah']); assert.equal(r.body.pending, 0);
  r = await post(S, { act: 'claim' }, NEXT + 3000);
  assert.equal(r.body.claimed, 0, 'claimed only once');
  assert.equal((await post(A, { act: 'claim' }, NEXT)).body.claimed, 1, 'Aranea claims the one from Sarah');
  // ask family: notifies everyone else, once a day
  pushed.length = 0;
  r = await post(S, { act: 'ask' }, NEXT + 5000);
  assert.equal(r.status, 200); assert.equal(r.body.told, 2); assert.equal(r.body.asked, true);
  assert.deepEqual(pushed.map(p => p.mid).sort(), ['m2', 'm3']);
  assert.ok(pushed.every(p => p.text === 'Shane is out of lives in Sugar Rush. Send a life ❤️'));
  assert.equal((await post(S, { act: 'ask' }, NEXT + 6000)).status, 429, 'one ask a day');
  assert.equal((await get(S, NEXT + 7000)).body.asked, true);
  assert.equal((await scoresRoute(q, S, '/sugar-lives', 'PUT', new URL('https://x/'), async () => ({}), NEXT, hooks)).status, 405);
}

console.log('scores tests ok');

