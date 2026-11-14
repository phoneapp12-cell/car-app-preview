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
export const RACE_LIMITS = { stop: 22, stars: 66, gapMs: 1000, perDay: 300, wins: 1e6 }; // 1.9.222 Sugar Rush has 22 stops (Bluff, the Pacific Islands, then Sydney, Gold Coast and Perth).
// 1.9.222 Each stop's stable level id (the level's badge id), in map order. The client sends `sid` so the race follows the level, not its number.
export const RACE_STOP_IDS = ['shop', 'sarah', 'jelly', 'lock', 'icing', 'double', 'down', 'choco', 'path', 'night', 'whale', 'tram', 'glacier', 'gondola', 'ticket', 'oyster', 'hibiscus', 'coconut', 'shell', 'opera', 'wave', 'swan'];
// 1.9.220 numbered the islands 16-18; from 1.9.222 they are 17-19 (Bluff is 16).
export const LEGACY_220_ISLANDS = { 16: 17, 17: 18, 18: 19 };
// 1.9.222 Family race events: 2+ players at the same stop start a race; first to win 5 levels wins; 48 hours max.
export const RACE_EVENT = { goal: 5, ms: 48 * 36e5, activeMs: 7 * 864e5, showMs: 72 * 36e5 };

export function scoresInit(sql) {
  sql.exec(`CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY AUTOINCREMENT, game TEXT NOT NULL, mid TEXT NOT NULL, score INTEGER NOT NULL, lines INTEGER, level INTEGER, won INTEGER, opp TEXT, at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS s_game ON scores(game, score DESC);
    CREATE INDEX IF NOT EXISTS s_mid ON scores(mid, game, at);`);
  sql.exec(`CREATE TABLE IF NOT EXISTS sugar_race (mid TEXT PRIMARY KEY, icon TEXT NOT NULL, stop INTEGER NOT NULL, stars INTEGER NOT NULL, at INTEGER NOT NULL)`);
  try { sql.exec(`ALTER TABLE sugar_race ADD COLUMN wins INTEGER DEFAULT 0`); } catch (e) { }
  sql.exec(`CREATE TABLE IF NOT EXISTS sugar_race_event (id INTEGER PRIMARY KEY AUTOINCREMENT, stop INTEGER NOT NULL, members TEXT NOT NULL, prog TEXT NOT NULL, at INTEGER NOT NULL, ends INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0, winner TEXT, why TEXT, fin INTEGER)`);
  sugarStopsOnce20261114(sql);
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

/* 1.9.222 One-off: race rows saved by 1.9.220 at stops 16-18 (the islands) move to 17-19, so nobody
   loses their place when Bluff becomes stop 16. Guarded by a meta flag so it runs exactly once. */
export const SUGAR_STOPS_KEY = 'sugar_stops_222_20261114';
export function sugarStopsOnce20261114(sql) {
  try {
    sql.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`);
    if (rows(sql, `SELECT v FROM meta WHERE k=?`, SUGAR_STOPS_KEY)[0]) return { already: true };
    const moved = rows(sql, `SELECT mid, stop FROM sugar_race WHERE stop BETWEEN 16 AND 18`);
    sql.exec(`UPDATE sugar_race SET stop = stop + 1 WHERE stop BETWEEN 16 AND 18`);
    sql.exec(`INSERT OR REPLACE INTO meta (k,v) VALUES (?,?)`, SUGAR_STOPS_KEY, JSON.stringify({ at: Date.now(), n: moved.length, moved }));
    return { n: moved.length };
  } catch (e) {
    return { err: 'pending' };
  }
}

/* Called from Family.fetch once the member's token has been checked. Returns null for paths that aren't /scores. */
export function checkRace(b) {
  if (!b || typeof b !== 'object') return { err: 'bad race' };
  const icon = typeof b.icon === 'string' ? b.icon.trim() : '';
  if (!RACE_ICONS.includes(icon)) return { err: 'bad icon' };
  if (!isInt(b.stop, 1, RACE_LIMITS.stop)) return { err: 'bad stop' };
  if (!isInt(b.stars, 0, RACE_LIMITS.stars)) return { err: 'bad stars' };
  let stop = b.stop;
  if (b.sid !== undefined) {
    // 1.9.222+ clients name their stop's level: trust the id over the number.
    const i = RACE_STOP_IDS.indexOf(typeof b.sid === 'string' ? b.sid : '');
    if (i < 0) return { err: 'bad sid' };
    stop = i + 1;
  } else if (LEGACY_220_ISLANDS[stop]) {
    stop = LEGACY_220_ISLANDS[stop]; // a 1.9.220 phone still counting the islands as 16-18
  }
  const wins = b.wins === undefined ? null : b.wins;
  if (wins !== null && !isInt(wins, 0, RACE_LIMITS.wins)) return { err: 'bad wins' };
  const lw = b.lw === undefined ? null : b.lw;
  if (lw !== null && !isInt(lw, 1, RACE_LIMITS.stop)) return { err: 'bad lw' };
  return { ok: { icon, stop, stars: b.stars, wins, lw } };
}

/* ---- 1.9.222 race events ---- */
const pj = (t, d) => { try { return JSON.parse(t); } catch (e) { return d; } };
function evRow(r) { return r && { ...r, members: pj(r.members, []), prog: pj(r.prog, {}) }; }
function activeEventFor(sql, mid) {
  for (const r of rows(sql, `SELECT * FROM sugar_race_event WHERE done=0 ORDER BY id DESC`)) { const e = evRow(r); if (e.members.includes(mid)) return e; }
  return null;
}
function leaderOf(e) {
  // most wins; a tie goes to whoever got there first
  let best = null;
  for (const mid of e.members) {
    const p = e.prog[mid] || { n: 0, t: 0 };
    if (!best || p.n > best.n || (p.n === best.n && p.n > 0 && (p.t || 0) < (best.t || 0))) best = { mid, n: p.n, t: p.t || 0 };
  }
  return best && best.n > 0 ? best.mid : null; // nobody won a level: no winner
}
function namesOf(sql, mids) {
  const out = {};
  for (const r of rows(sql, `SELECT id, name FROM members`)) out[r.id] = r.name;
  return mids.map(m => out[m] || 'Someone');
}
function finishEvent(sql, e, winner, why, now, notes) {
  sql.exec(`UPDATE sugar_race_event SET done=1, winner=?, why=?, fin=? WHERE id=?`, winner, why, now, e.id);
  const [wn] = namesOf(sql, [winner]);
  for (const mid of e.members) {
    const text = !winner ? `🏁 Sugar Rush race over: time ran out before anyone won a level. Better luck next race!` : mid === winner
      ? (why === 'timeout' ? `🏆 Sugar Rush race over: time's up and you were in front. You win!` : `🏆 You won the Sugar Rush race! Come and collect your prize.`)
      : `🏁 Sugar Rush race over: ${wn} won${why === 'timeout' ? ' (time ran out)' : ''}. You get a consolation prize!`;
    notes.push({ mid, text, card: 'sugar-race-' + e.id });
  }
}
// Time out any race that has run past 48 hours: the leader wins.
export function expireRaces(sql, now = Date.now(), notes = []) {
  for (const r of rows(sql, `SELECT * FROM sugar_race_event WHERE done=0 AND ends <= ?`, now)) {
    const e = evRow(r);
    finishEvent(sql, e, leaderOf(e), 'timeout', now, notes);
  }
  return notes;
}
// Start a race when 2+ recently active players share a stop and none of them is already racing.
export function maybeStartRace(sql, mid, now = Date.now(), notes = []) {
  const me = rows(sql, `SELECT r.stop FROM sugar_race r JOIN members m ON m.id=r.mid AND m.removed=0 WHERE r.mid=?`, mid)[0];
  if (!me || activeEventFor(sql, mid)) return null;
  const here = rows(sql, `SELECT r.mid, r.at FROM sugar_race r JOIN members m ON m.id=r.mid AND m.removed=0 WHERE r.stop=? AND r.at > ? ORDER BY r.at ASC`, me.stop, now - RACE_EVENT.activeMs)
    .map(r => r.mid).filter(m => m === mid || !activeEventFor(sql, m));
  if (here.length < 2 || !here.includes(mid)) return null;
  const prog = {}; for (const m of here) prog[m] = { n: 0, t: 0 };
  sql.exec(`INSERT INTO sugar_race_event (stop, members, prog, at, ends) VALUES (?,?,?,?,?)`, me.stop, JSON.stringify(here), JSON.stringify(prog), now, now + RACE_EVENT.ms);
  const id = rows(sql, `SELECT MAX(id) id FROM sugar_race_event`)[0].id;
  const names = namesOf(sql, here);
  for (let i = 0; i < here.length; i++) {
    const others = names.filter((_, j) => j !== i);
    notes.push({ mid: here[i], text: `🏁 Race on! You vs ${others.join(', ')} in Sugar Rush. First to win ${RACE_EVENT.goal} levels wins a prize!`, card: 'sugar-race-' + id });
  }
  return id;
}
// A win on the race stop or beyond counts toward the race (replaying easy early levels doesn't).
export function raceWin(sql, mid, lw, now = Date.now(), notes = []) {
  const e = activeEventFor(sql, mid); if (!e || !lw || lw < e.stop) return null;
  const p = e.prog[mid] || { n: 0, t: 0 };
  p.n = Math.min(RACE_EVENT.goal, p.n + 1); p.t = now; e.prog[mid] = p;
  sql.exec(`UPDATE sugar_race_event SET prog=? WHERE id=?`, JSON.stringify(e.prog), e.id);
  if (p.n >= RACE_EVENT.goal) finishEvent(sql, e, mid, 'win', now, notes);
  return p.n;
}
export function raceEventView(sql, me, now = Date.now()) {
  let e = activeEventFor(sql, me.id);
  if (!e) {
    for (const r of rows(sql, `SELECT * FROM sugar_race_event WHERE done=1 AND fin > ? ORDER BY fin DESC`, now - RACE_EVENT.showMs)) { const x = evRow(r); if (x.members.includes(me.id)) { e = x; break; } }
  }
  if (!e) return null;
  const info = {};
  for (const r of rows(sql, `SELECT r.mid, r.icon, m.name FROM sugar_race r JOIN members m ON m.id=r.mid`)) info[r.mid] = r;
  const racers = e.members.map(mid => ({ name: (info[mid] && info[mid].name) || 'Someone', icon: (info[mid] && info[mid].icon) || 'star', n: (e.prog[mid] || {}).n || 0, mine: mid === me.id, winner: !!e.done && mid === e.winner }));
  return { id: e.id, stop: e.stop, at: e.at, ends: e.ends, goal: RACE_EVENT.goal, done: !!e.done, why: e.why || null, won: !!e.done && e.winner === me.id, winner: e.done ? ((info[e.winner] && info[e.winner].name) || 'Someone') : null, racers };
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
  const prevWins = prev ? (rows(sql, `SELECT wins FROM sugar_race WHERE mid=?`, me.id)[0] || {}).wins || 0 : 0;
  const wins = c.ok.wins === null ? prevWins : Math.max(prevWins, c.ok.wins);
  if (prev) sql.exec(`UPDATE sugar_race SET icon=?, stop=?, stars=?, at=?, wins=? WHERE mid=?`, c.ok.icon, stop, stars, now, wins, me.id);
  else {
    if ((today.n || 0) >= RACE_LIMITS.perDay) return { status: 429, body: { err: 'too many today' } };
    sql.exec(`INSERT INTO sugar_race (mid, icon, stop, stars, at, wins) VALUES (?,?,?,?,?,?)`, me.id, c.ok.icon, stop, stars, now, wins);
  }
  // 1.9.222 race events: time-outs first, then this post's win (if it's new), then maybe a new race at the stop.
  const notes = [];
  expireRaces(sql, now, notes);
  if (prev && c.ok.wins !== null && c.ok.wins > prevWins && c.ok.lw) raceWin(sql, me.id, c.ok.lw, now, notes);
  maybeStartRace(sql, me.id, now, notes);
  return { status: 200, body: { ok: 1, icon: c.ok.icon, stop, stars, event: raceEventView(sql, me, now) }, notes };
}

export function raceBoard(sql, me, now = Date.now(), notes = []) {
  expireRaces(sql, now, notes);
  const racers = rows(sql, `SELECT r.mid, m.name, r.icon, r.stop, r.stars, r.at FROM sugar_race r JOIN members m ON m.id=r.mid AND m.removed=0 ORDER BY r.stop DESC, r.stars DESC, m.name ASC`)
    .map(r => ({ name: r.name, icon: r.icon, stop: r.stop, stars: r.stars, at: r.at, mine: r.mid === me.id }));
  return { status: 200, body: { me: me.name, racers, event: raceEventView(sql, me, now) }, notes };
}

export async function scoresRoute(sql, me, p, m, url, readBody, now = Date.now(), hooks = null) {
  if (p === '/sugar-race') {
    let r;
    if (m === 'GET') r = raceBoard(sql, me, now);
    else if (m === 'POST') r = saveRace(sql, me, await readBody(), now);
    else return { status: 405, body: { err: 'method' } };
    // 1.9.222 "Race on!" and race results go out through the family notifications.
    if (r.notes && r.notes.length && hooks && hooks.note) for (const n of r.notes) { try { await hooks.note(n.mid, n.text, n.card); } catch (e) { } }
    return r;
  }
  if (p !== '/scores') return null;
  if (m === 'GET') return board(sql, me, url.searchParams.get('game'));
  if (m === 'POST') return addScore(sql, me, await readBody(), now);
  return { status: 405, body: { err: 'method' } };
}
