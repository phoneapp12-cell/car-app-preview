/* 1.9.149 Family scoreboard for Info Book games (Tetris, Scrabble). Lives in the Family Durable Object's SQLite, next to
   members, so a score always belongs to the member whose token sent it: the name shown is that member's name from the
   server, never one typed into the game. Bounds are generous for real play and refuse made-up numbers. */
export const GAMES = ['tetris', 'scrabble'];
export const LIMITS = { tetrisScore: 9999999, tetrisLines: 9999, scrabbleScore: 1500 };
export const RATE = { gapMs: 15e3, perDay: 60 }; // a game takes longer than 15 seconds; 60 games a day per member per game is plenty

const isInt = (v, lo, hi) => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
// Tetris: each line is worth at most 200 x level (a 4-line Tetris is 800 x level) and level = lines/10 + 1. Drops add at most
// 2 points a row, about 40 a piece, and a game of n lines uses at most (n x 10 + 200) / 4 pieces.
export function tetrisMax(lines) { return 200 * lines * (Math.floor(lines / 10) + 1) + 10 * (lines * 10 + 200) + 1000; }

export function checkScore(b) {
  if (!b || typeof b !== 'object') return { err: 'bad score' };
  const game = b.game;
  if (!GAMES.includes(game)) return { err: 'unknown game' };
  if (game === 'tetris') {
    const lines = b.lines == null ? 0 : b.lines;
    if (!isInt(lines, 0, LIMITS.tetrisLines)) return { err: 'bad lines' };
    if (!isInt(b.score, 0, LIMITS.tetrisScore)) return { err: 'bad score' };
    if (b.score > tetrisMax(lines)) return { err: 'score too high for those lines' };
    const level = b.level == null ? Math.floor(lines / 10) + 1 : b.level;
    if (!isInt(level, 1, 1000) || level !== Math.floor(lines / 10) + 1) return { err: 'bad level' };
    return { ok: { game, score: b.score, lines, level, won: null, opp: null } };
  }
  if (!isInt(b.score, 0, LIMITS.scrabbleScore)) return { err: 'bad score' };
  const opp = b.opponent == null ? 'computer' : b.opponent;
  if (opp !== 'computer' && opp !== 'family') return { err: 'bad opponent' };
  if (b.won != null && typeof b.won !== 'boolean') return { err: 'bad won' };
  return { ok: { game, score: b.score, lines: null, level: null, won: b.won ? 1 : 0, opp } };
}

export function scoresInit(sql) {
  sql.exec(`CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY AUTOINCREMENT, game TEXT NOT NULL, mid TEXT NOT NULL, score INTEGER NOT NULL, lines INTEGER, level INTEGER, won INTEGER, opp TEXT, at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS s_game ON scores(game, score DESC);
    CREATE INDEX IF NOT EXISTS s_mid ON scores(mid, game, at);`);
  clearShaneTetrisOnce(sql);
}

/* One-off, 12 Nov 2026: Shane asked to be cleared from the Tetris high-score table only.
   Guarded by a meta flag so it runs exactly once. Other games and other members are left alone.
   After it has run, new Tetris scores Shane posts later are kept. */
export const CLEAR_SHANE_TETRIS_KEY = 'clear_shane_tetris_20261112';
const rows = (sql, q, ...a) => sql.exec(q, ...a).toArray();
export function clearShaneTetrisOnce(sql) {
  try {
    sql.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`);
    const prev = rows(sql, `SELECT v FROM meta WHERE k=?`, CLEAR_SHANE_TETRIS_KEY)[0];
    if (prev) {
      try { return { already: true, ...JSON.parse(prev.v) }; } catch (e) { return { already: true }; }
    }
    const shane = rows(sql, `SELECT id, name FROM members WHERE role='admin' AND removed=0`)
      .filter(m => /^Shane\b/i.test(String(m.name || '').trim()));
    const deleted = [];
    for (const m of shane) {
      const existing = rows(sql, `SELECT score, lines, level, at FROM scores WHERE game='tetris' AND mid=? ORDER BY score DESC, at ASC`, m.id);
      sql.exec(`DELETE FROM scores WHERE game='tetris' AND mid=?`, m.id);
      deleted.push({ name: m.name, n: existing.length, top: existing.length ? existing[0].score : 0, scores: existing });
    }
    const rec = { at: Date.now(), matched: shane.length, deleted };
    sql.exec(`INSERT OR REPLACE INTO meta (k,v) VALUES (?,?)`, CLEAR_SHANE_TETRIS_KEY, JSON.stringify(rec));
    try { console.log('clear_shane_tetris_20261112', JSON.stringify({ matched: rec.matched, deleted: rec.deleted.map(d => ({ name: d.name, n: d.n, top: d.top })) })); } catch (e) { }
    return rec;
  } catch (e) {
    return { err: 'pending' }; // e.g. members table not ready yet; flag is not set, so a later call can retry
  }
}

export function addScore(sql, me, body, now = Date.now()) {
  const c = checkScore(body); if (c.err) return { status: 400, body: { err: c.err } };
  const s = c.ok;
  const last = rows(sql, `SELECT MAX(at) at, SUM(CASE WHEN at > ? THEN 1 ELSE 0 END) n FROM scores WHERE mid=? AND game=?`, now - 864e5, me.id, s.game)[0] || {};
  if (last.at && now - last.at < RATE.gapMs) return { status: 429, body: { err: 'too soon' } };
  if ((last.n || 0) >= RATE.perDay) return { status: 429, body: { err: 'too many today' } };
  sql.exec(`INSERT INTO scores (game,mid,score,lines,level,won,opp,at) VALUES (?,?,?,?,?,?,?,?)`, s.game, me.id, s.score, s.lines, s.level, s.won, s.opp, now);
  const best = (rows(sql, `SELECT MAX(score) b FROM scores WHERE mid=? AND game=?`, me.id, s.game)[0] || {}).b || 0;
  const rank = (rows(sql, `SELECT COUNT(*) n FROM scores s JOIN members m ON m.id=s.mid AND m.removed=0 WHERE s.game=? AND s.score > ?`, s.game, s.score)[0] || {}).n + 1;
  return { status: 200, body: { ok: 1, rank, best, newBest: best === s.score } };
}

export function board(sql, me, game) {
  if (!GAMES.includes(game)) return { status: 400, body: { err: 'unknown game' } };
  const top = rows(sql, `SELECT s.mid, m.name, s.score, s.lines, s.level, s.won, s.opp, s.at FROM scores s JOIN members m ON m.id=s.mid AND m.removed=0 WHERE s.game=? ORDER BY s.score DESC, s.at ASC LIMIT 10`, game)
    .map(r => ({ name: r.name, score: r.score, at: r.at, lines: r.lines ?? undefined, level: r.level ?? undefined, won: r.won == null ? undefined : !!r.won, opp: r.opp || undefined, mine: r.mid === me.id }));
  const best = rows(sql, `SELECT s.mid, m.name, MAX(s.score) score, COUNT(*) games, SUM(CASE WHEN s.won=1 AND s.opp='computer' THEN 1 ELSE 0 END) wcpu, SUM(CASE WHEN s.won=1 AND s.opp='family' THEN 1 ELSE 0 END) wfam FROM scores s JOIN members m ON m.id=s.mid AND m.removed=0 WHERE s.game=? GROUP BY s.mid ORDER BY score DESC`, game)
    .map(r => {
      const at = (rows(sql, `SELECT MIN(at) at FROM scores WHERE mid=? AND game=? AND score=?`, r.mid, game, r.score)[0] || {}).at;
      const o = { name: r.name, score: r.score, at, games: r.games, mine: r.mid === me.id };
      if (game === 'scrabble') { o.winsComputer = r.wcpu || 0; o.winsFamily = r.wfam || 0; }
      return o;
    });
  return { status: 200, body: { game, me: me.name, top, best } };
}

/* Called from Family.fetch once the member's token has been checked. Returns null for paths that aren't /scores. */
export async function scoresRoute(sql, me, p, m, url, readBody, now = Date.now()) {
  if (p !== '/scores') return null;
  if (m === 'GET') return board(sql, me, url.searchParams.get('game'));
  if (m === 'POST') return addScore(sql, me, await readBody(), now);
  return { status: 405, body: { err: 'method' } };
}
