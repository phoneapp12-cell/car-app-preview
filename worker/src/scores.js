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

export const RACE_ICONS = ['lolly','cupcake','donut','cherry','icecream','cookie','kiwi','cat','dog','bunny','unicorn','car','train','bike','rocket','star','bear','bee','butterfly','boat'];
export const RACE_LIMITS = { stop: 15, stars: 45, gapMs: 1000, perDay: 300 }; // 1.9.219 Sugar Rush has 15 stops (to Dunedin).

export function scoresInit(sql) {
  sql.exec(`CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY AUTOINCREMENT, game TEXT NOT NULL, mid TEXT NOT NULL, score INTEGER NOT NULL, lines INTEGER, level INTEGER, won INTEGER, opp TEXT, at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS s_game ON scores(game, score DESC);
    CREATE INDEX IF NOT EXISTS s_mid ON scores(mid, game, at);`);
  sql.exec(`CREATE TABLE IF NOT EXISTS sugar_race (mid TEXT PRIMARY KEY, icon TEXT NOT NULL, stop INTEGER NOT NULL, stars INTEGER NOT NULL, at INTEGER NOT NULL)`);
  clearShaneTetrisOnce(sql);
  clearShaneTetrisOnce20261113(sql);
  clearAllTetrisOnce20261114(sql);
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

/* One-off, 13 Nov 2026: Shane asked again to be cleared from the Tetris high-score table.
   A new meta flag, so the 12 Nov clear (already run) is left alone. Other games and other
   members are left alone. After it has run, new Tetris scores Shane posts later are kept. */
export const CLEAR_SHANE_TETRIS_KEY2 = 'clear_shane_tetris_20261113';
export function clearShaneTetrisOnce20261113(sql) {
  try {
    sql.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`);
    const prev = rows(sql, `SELECT v FROM meta WHERE k=?`, CLEAR_SHANE_TETRIS_KEY2)[0];
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
    const leader = rows(sql, `SELECT m.name, s.score FROM scores s JOIN members m ON m.id=s.mid AND m.removed=0 WHERE s.game='tetris' ORDER BY s.score DESC, s.at ASC LIMIT 1`)[0] || null;
    const rec = { at: Date.now(), matched: shane.length, deleted, newLeader: leader ? { name: leader.name, score: leader.score } : null };
    sql.exec(`INSERT OR REPLACE INTO meta (k,v) VALUES (?,?)`, CLEAR_SHANE_TETRIS_KEY2, JSON.stringify(rec));
    try { console.log('clear_shane_tetris_20261113', JSON.stringify({ matched: rec.matched, deleted: rec.deleted.map(d => ({ name: d.name, n: d.n, top: d.top })), newLeader: rec.newLeader })); } catch (e) { }
    return rec;
  } catch (e) {
    return { err: 'pending' };
  }
}


/* One-off, 14 Nov 2026: Shane asked to reset everyone's Tetris high scores
   (family scoreboard and each phone). Scrabble is left alone. Guarded by a
   meta flag so it runs exactly once. After it has run, new Tetris scores are kept. */
export const CLEAR_ALL_TETRIS_KEY = 'clear_all_tetris_20261114';
export function clearAllTetrisOnce20261114(sql) {
  try {
    sql.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`);
    const prev = rows(sql, `SELECT v FROM meta WHERE k=?`, CLEAR_ALL_TETRIS_KEY)[0];
    if (prev) {
      try { return { already: true, ...JSON.parse(prev.v) }; } catch (e) { return { already: true }; }
    }
    const existing = rows(sql, `SELECT s.id, s.mid, m.name, s.score, s.lines, s.level, s.at FROM scores s LEFT JOIN members m ON m.id=s.mid WHERE s.game='tetris' ORDER BY s.score DESC, s.at ASC`);
    sql.exec(`DELETE FROM scores WHERE game='tetris'`);
    const by = {};
    for (const r of existing) {
      const n = r.name || r.mid || '?';
      if (!by[n]) by[n] = { name: n, mid: r.mid, n: 0, top: 0 };
      by[n].n++;
      if ((r.score || 0) > by[n].top) by[n].top = r.score || 0;
    }
    const rec = { at: Date.now(), n: existing.length, members: Object.values(by), scores: existing };
    sql.exec(`INSERT OR REPLACE INTO meta (k,v) VALUES (?,?)`, CLEAR_ALL_TETRIS_KEY, JSON.stringify(rec));
    try { console.log('clear_all_tetris_20261114', JSON.stringify({ n: rec.n, members: rec.members })); } catch (e) { }
    return rec;
  } catch (e) {
    return { err: 'pending' };
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
export function checkRace(b) {
  if (!b || typeof b !== 'object') return { err: 'bad race' };
  const icon = typeof b.icon === 'string' ? b.icon.trim() : '';
  if (!RACE_ICONS.includes(icon)) return { err: 'bad icon' };
  if (!isInt(b.stop, 1, RACE_LIMITS.stop)) return { err: 'bad stop' };
  if (!isInt(b.stars, 0, RACE_LIMITS.stars)) return { err: 'bad stars' };
  return { ok: { icon, stop: b.stop, stars: b.stars } };
}

function suggestedIcon(sql, mid, want) {
  const taken = new Set(rows(sql, `SELECT icon FROM sugar_race WHERE mid != ?`, mid).map(r => r.icon));
  if (want && !taken.has(want)) return want;
  for (const id of RACE_ICONS) if (!taken.has(id)) return id;
  return want || RACE_ICONS[0];
}

export function saveRace(sql, me, body, now = Date.now()) {
  const c = checkRace(body); if (c.err) return { status: 400, body: { err: c.err } };
  const prev = rows(sql, `SELECT icon, stop, stars, at FROM sugar_race WHERE mid=?`, me.id)[0];
  if (prev && prev.at && now - prev.at < RACE_LIMITS.gapMs && prev.icon === c.ok.icon && prev.stop === c.ok.stop && prev.stars === c.ok.stars)
    return { status: 200, body: { ok: 1, icon: prev.icon, stop: prev.stop, stars: prev.stars } };
  const today = rows(sql, `SELECT COUNT(*) n FROM sugar_race WHERE mid=? AND at > ?`, me.id, now - 864e5)[0] || {};
  // upserts rewrite one row, so the "per day" cap is only a flood brake on first-time inserts; updates are always allowed after the short gap
  const owner = rows(sql, `SELECT mid FROM sugar_race WHERE icon=? AND mid != ?`, c.ok.icon, me.id)[0];
  if (owner) {
    const suggested = suggestedIcon(sql, me.id, null);
    return { status: 409, body: { err: 'icon taken', suggested } };
  }
  const stop = Math.max(c.ok.stop, prev ? prev.stop : 0);
  const stars = Math.max(c.ok.stars, prev ? prev.stars : 0);
  if (prev) sql.exec(`UPDATE sugar_race SET icon=?, stop=?, stars=?, at=? WHERE mid=?`, c.ok.icon, stop, stars, now, me.id);
  else {
    if ((today.n || 0) >= RACE_LIMITS.perDay) return { status: 429, body: { err: 'too many today' } };
    sql.exec(`INSERT INTO sugar_race (mid, icon, stop, stars, at) VALUES (?,?,?,?,?)`, me.id, c.ok.icon, stop, stars, now);
  }
  return { status: 200, body: { ok: 1, icon: c.ok.icon, stop, stars } };
}

export function raceBoard(sql, me) {
  const racers = rows(sql, `SELECT r.mid, m.name, r.icon, r.stop, r.stars, r.at FROM sugar_race r JOIN members m ON m.id=r.mid AND m.removed=0 ORDER BY r.stop DESC, r.stars DESC, m.name ASC`)
    .map(r => ({ name: r.name, icon: r.icon, stop: r.stop, stars: r.stars, at: r.at, mine: r.mid === me.id }));
  return { status: 200, body: { me: me.name, racers } };
}

export async function scoresRoute(sql, me, p, m, url, readBody, now = Date.now()) {
  if (p === '/sugar-race') {
    if (m === 'GET') return raceBoard(sql, me);
    if (m === 'POST') return saveRace(sql, me, await readBody(), now);
    return { status: 405, body: { err: 'method' } };
  }
  if (p !== '/scores') return null;
  if (m === 'GET') return board(sql, me, url.searchParams.get('game'));
  if (m === 'POST') return addScore(sql, me, await readBody(), now);
  return { status: 405, body: { err: 'method' } };
}
