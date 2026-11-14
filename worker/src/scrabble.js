/* 1.9.207 Family Scrabble. Game state lives in the Family Durable Object, next to the scoreboard.
   Each person plays on their own phone, whenever it suits them. Only the seat whose turn it is can play, pass or swap.
   Rules match the phone game (feed/scrabble.js): 15×15 board, standard premiums, 100 tiles, racks of 7,
   ENABLE word list, 50-point bonus for using all 7 tiles, swap needs 7 tiles left in the bag,
   and the game ends when someone uses their last tile with an empty bag, or after 6 scoreless turns
   (a pass or a swap). Words are checked straight away. There is no challenge step.
   Other players' racks and the bag order are never sent out. */
import { scoresInit } from './scores.js';

export const N = 15, MID = 7, RACK = 7, BINGO = 50, OPEN_CAP = 8, SEATS_MIN = 2, SEATS_MAX = 4;
export const VALUES = { A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10, '?': 0 };
export const COUNTS = { A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1, '?': 2 };
const LM = { DL: 2, TL: 3 }, WM = { DW: 2, TW: 3, ST: 2 };
const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
const idx = (r, c) => r * N + c;
const inside = (r, c) => r >= 0 && c >= 0 && r < N && c < N;
const tileVal = t => (t.b ? 0 : VALUES[t.l] || 0);
const isEmpty = board => { for (let i = 0; i < board.length; i++) if (board[i]) return false; return true; };
const bad = err => ({ ok: false, err });
const rows = (sql, q, ...a) => sql.exec(q, ...a).toArray();

export const PREMIUM = (function () {
  const g = new Array(N * N).fill('');
  const put = (t, list) => list.forEach(rc => { g[rc[0] * N + rc[1]] = t; });
  put('TW', [[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]]);
  const dw = [];
  for (let i = 1; i <= 4; i++) dw.push([i, i], [i, 14 - i], [14 - i, i], [14 - i, 14 - i]);
  put('DW', dw);
  put('TL', [[1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13], [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9]]);
  put('DL', [[0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14], [6, 2], [6, 6], [6, 8], [6, 12], [7, 3], [7, 11], [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14], [12, 6], [12, 8], [14, 3], [14, 11]]);
  g[MID * N + MID] = 'ST';
  return g;
})();

let lex = '';
/* The word list is the same ENABLE file the phone uses. Stored once per isolate, searched in place. */
export function bindDict(text) {
  const words = String(text || '').replace(/\r/g, '').toLowerCase().split('\n').map(w => w.trim()).filter(w => /^[a-z]{2,15}$/.test(w));
  words.sort();
  lex = words.length ? words.join('\n') + '\n' : '';
}
export function hasWord(word) {
  const w = String(word || '').trim().toLowerCase();
  if (!/^[a-z]{2,15}$/.test(w) || !lex) return false;
  let lo = 0, hi = lex.length;
  for (let n = 0; n < 40 && lo < hi; n++) {
    let mid = (lo + hi) >> 1;
    if (mid > lo) {
      const nl = lex.lastIndexOf('\n', mid - 1);
      const start = nl + 1;
      mid = start < lo ? lo : start;
    }
    const end = lex.indexOf('\n', mid);
    const line = end < 0 ? lex.slice(mid) : lex.slice(mid, end);
    if (line === w) return true;
    const next = end < 0 ? lex.length : end + 1;
    if (line < w) { if (next <= lo) return false; lo = next; }
    else { if (mid >= hi) return false; hi = mid; }
  }
  return false;
}
const dict = { has: hasWord };

function lineCells(tmp, r, c, dr, dc) {
  let r0 = r, c0 = c;
  while (inside(r0 - dr, c0 - dc) && tmp[idx(r0 - dr, c0 - dc)]) { r0 -= dr; c0 -= dc; }
  const cells = [];
  while (inside(r0, c0) && tmp[idx(r0, c0)]) { cells.push(idx(r0, c0)); r0 += dr; c0 += dc; }
  return cells;
}
function scoreCells(tmp, cells, fresh) {
  let sum = 0, mul = 1;
  for (const i of cells) {
    let v = tileVal(tmp[i]);
    if (fresh.has(i)) { const p = PREMIUM[i]; v *= LM[p] || 1; mul *= WM[p] || 1; }
    sum += v;
  }
  return sum * mul;
}
export function wordsOf(board, place) {
  const tmp = board.slice(), fresh = new Set();
  for (const p of place) { const i = idx(p.r, p.c); tmp[i] = { l: p.l, b: p.b ? 1 : 0 }; fresh.add(i); }
  let across;
  if (place.length > 1) across = place[0].r === place[1].r;
  else { const p = place[0]; across = !!((inside(p.r, p.c - 1) && tmp[idx(p.r, p.c - 1)]) || (inside(p.r, p.c + 1) && tmp[idx(p.r, p.c + 1)])); }
  const dr = across ? 0 : 1, dc = across ? 1 : 0;
  const groups = [];
  const main = lineCells(tmp, place[0].r, place[0].c, dr, dc);
  if (main.length >= 2) groups.push(main);
  for (const p of place) { const cr = lineCells(tmp, p.r, p.c, dc, dr); if (cr.length >= 2) groups.push(cr); }
  return groups.map(cells => ({ w: cells.map(i => tmp[i].l).join(''), s: scoreCells(tmp, cells, fresh), cells }));
}
export function check(board, place) {
  if (!place || !place.length) return bad('Put some tiles on the board first.');
  if (place.length > RACK) return bad('A rack only holds 7 tiles.');
  const seen = new Set();
  for (const p of place) {
    if (!inside(p.r, p.c)) return bad('That square is off the board.');
    const i = idx(p.r, p.c);
    if (board[i] || seen.has(i)) return bad('That square is already taken.');
    if (!/^[A-Z]$/.test(p.l || '')) return bad('Choose a letter for the blank tile.');
    seen.add(i);
  }
  const sameRow = place.every(p => p.r === place[0].r), sameCol = place.every(p => p.c === place[0].c);
  if (!sameRow && !sameCol) return bad('Put your tiles in one straight line, across or down.');
  const first = isEmpty(board);
  if (first && !seen.has(idx(MID, MID))) return bad('The first word must cover the ★ centre square.');
  if (first && place.length < 2) return bad('The first word needs at least two letters.');
  if (place.length > 1) {
    const fixed = sameRow ? place[0].r : place[0].c;
    const pos = place.map(p => (sameRow ? p.c : p.r));
    const lo = Math.min.apply(null, pos), hi = Math.max.apply(null, pos);
    for (let k = lo; k <= hi; k++) { const i = sameRow ? idx(fixed, k) : idx(k, fixed); if (!board[i] && !seen.has(i)) return bad('Your tiles must make one word with no gaps.'); }
  }
  if (!first) {
    let touch = false;
    for (const p of place) for (const d of DIRS) { const r = p.r + d[0], c = p.c + d[1]; if (inside(r, c) && board[idx(r, c)]) touch = true; }
    if (!touch) return bad('Your word must join on to tiles already on the board.');
  }
  const list = wordsOf(board, place);
  if (!list.length) return bad('Make a word of at least two letters.');
  const wrong = list.filter(x => !dict.has(x.w)).map(x => x.w);
  const words = list.map(x => ({ w: x.w, s: x.s }));
  if (wrong.length) return { ok: false, err: 'Not in the word list: ' + wrong.join(', '), bad: wrong, words };
  const bingo = place.length === RACK;
  const score = list.reduce((a, x) => a + x.s, 0) + (bingo ? BINGO : 0);
  return { ok: true, score, bingo, words };
}

function drawTiles(bag, rack) { while (rack.length < RACK && bag.length) rack.push(bag.pop()); }
const rackPoints = rack => rack.reduce((a, l) => a + (VALUES[l] || 0), 0);
export function finish(st, outIdx) {
  let bonus = 0;
  st.players.forEach((p, i) => { const v = rackPoints(p.rack); p.left = v; if (i !== outIdx) { p.score -= v; bonus += v; } });
  if (outIdx >= 0) st.players[outIdx].score += bonus;
  st.out = outIdx; st.over = true;
  const top = Math.max.apply(null, st.players.map(p => p.score));
  st.winners = st.players.map((p, i) => (p.score === top ? i : -1)).filter(i => i >= 0);
}
function nextTurn(st) { if (st.scoreless >= 6) finish(st, -1); else st.turn = (st.turn + 1) % st.players.length; }
export function play(st, place) {
  if (st.over) return bad('The game is over.');
  const res = check(st.board, place);
  if (!res.ok) return res;
  const p = st.players[st.turn];
  const rack = p.rack.slice();
  for (const t of place) { const k = rack.indexOf(t.b ? '?' : t.l); if (k < 0) return bad('Those tiles are not in the rack.'); rack.splice(k, 1); }
  for (const t of place) st.board[idx(t.r, t.c)] = { l: t.l, b: t.b ? 1 : 0 };
  p.rack = rack; drawTiles(st.bag, p.rack);
  p.score += res.score; st.scoreless = 0; st.moves = (st.moves || 0) + 1;
  st.last = { who: st.turn, kind: 'play', score: res.score, words: res.words, cells: place.map(t => idx(t.r, t.c)), bingo: !!res.bingo };
  if (!p.rack.length && !st.bag.length) finish(st, st.turn); else nextTurn(st);
  return res;
}
function shuffleBag(bag) {
  const buf = new Uint32Array(bag.length);
  crypto.getRandomValues(buf);
  for (let i = bag.length - 1; i > 0; i--) { const j = buf[i] % (i + 1); const t = bag[i]; bag[i] = bag[j]; bag[j] = t; }
  return bag;
}
export function swap(st, letters) {
  if (st.over) return bad('The game is over.');
  if (st.bag.length < RACK) return bad('Swapping needs at least 7 tiles in the bag.');
  if (!letters || !letters.length || letters.length > RACK) return bad('Choose the tiles to swap.');
  const p = st.players[st.turn], rack = p.rack.slice();
  for (const l of letters) { if (!/^[A-Z?]$/.test(l || '')) return bad('Choose the tiles to swap.'); const k = rack.indexOf(l); if (k < 0) return bad('Those tiles are not in the rack.'); rack.splice(k, 1); }
  drawTiles(st.bag, rack);
  st.bag.push(...letters); shuffleBag(st.bag);
  p.rack = rack; st.scoreless++; st.moves = (st.moves || 0) + 1;
  st.last = { who: st.turn, kind: 'swap', n: letters.length };
  nextTurn(st);
  return { ok: true };
}
export function pass(st) {
  if (st.over) return bad('The game is over.');
  st.scoreless++; st.moves = (st.moves || 0) + 1;
  st.last = { who: st.turn, kind: 'pass' };
  nextTurn(st);
  return { ok: true };
}

function newId() {
  const b = new Uint8Array(8); crypto.getRandomValues(b);
  return 'g' + [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}
function makeBag() {
  const bag = [];
  for (const k in COUNTS) for (let i = 0; i < COUNTS[k]; i++) bag.push(k);
  return shuffleBag(bag);
}
function seatOrder(ids) {
  const a = ids.slice();
  const buf = new Uint32Array(a.length);
  crypto.getRandomValues(buf);
  for (let i = a.length - 1; i > 0; i--) { const j = buf[i] % (i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

export function scrabbleInit(sql) {
  scoresInit(sql);
  sql.exec(`CREATE TABLE IF NOT EXISTS scrabble_games (id TEXT PRIMARY KEY, rev INTEGER NOT NULL, status TEXT NOT NULL, turn_mid TEXT, state TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS scrabble_seats (gid TEXT NOT NULL, mid TEXT NOT NULL, seat INTEGER NOT NULL, PRIMARY KEY (gid, mid));
    CREATE INDEX IF NOT EXISTS scrabble_seat_mid ON scrabble_seats(mid, gid);`);
  try { sql.exec(`ALTER TABLE scores ADD COLUMN ref TEXT`); } catch (e) { }
  try { sql.exec(`CREATE UNIQUE INDEX IF NOT EXISTS s_ref ON scores(ref)`); } catch (e) { }
}

function pack(g) {
  return JSON.stringify({
    board: g.board, bag: g.bag,
    players: g.players.map(p => ({ mid: p.mid, score: p.score, rack: p.rack, left: p.left == null ? undefined : p.left })),
    turn: g.turn, scoreless: g.scoreless, over: !!g.over, out: g.out == null ? null : g.out,
    winners: g.winners || [], last: g.last || null, moves: g.moves || 0, scored: !!g.scored
  });
}
function unpack(row) {
  const s = JSON.parse(row.state);
  s.id = row.id; s.rev = row.rev; s.updated = row.updated; s.created = row.created;
  s.over = !!s.over; s.winners = s.winners || []; s.players = s.players || [];
  return s;
}
function loadGame(sql, id) {
  const row = rows(sql, `SELECT id, rev, status, turn_mid, state, created, updated FROM scrabble_games WHERE id=?`, id)[0];
  return row ? unpack(row) : null;
}
function saveGame(sql, g, now) {
  sql.exec(`UPDATE scrabble_games SET rev=?, status=?, turn_mid=?, state=?, updated=? WHERE id=?`,
    g.rev, g.over ? 'done' : 'play', g.over ? null : g.players[g.turn].mid, pack(g), now, g.id);
}
function namesFor(sql, g) {
  const ids = g.players.map(p => p.mid);
  const map = {};
  if (ids.length) for (const r of rows(sql, `SELECT id, name, removed FROM members WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)) map[r.id] = r.removed ? '' : r.name;
  return map;
}
function repair(sql, g) {
  if (g.over) return false;
  let changed = false;
  for (let n = 0; n < 8 && !g.over; n++) {
    const mid = g.players[g.turn].mid;
    const m = rows(sql, `SELECT removed FROM members WHERE id=?`, mid)[0];
    if (m && !m.removed) break;
    pass(g); changed = true;
  }
  return changed;
}
function recordScores(sql, g, now) {
  if (!g.over || g.scored) return;
  g.players.forEach((p, i) => {
    const ref = 'scrabble:' + g.id + ':' + p.mid;
    if (rows(sql, `SELECT 1 x FROM scores WHERE ref=?`, ref)[0]) return;
    const won = g.winners.length === 1 && g.winners[0] === i ? 1 : 0;
    sql.exec(`INSERT INTO scores (game, mid, score, lines, level, won, opp, at, ref) VALUES (?,?,?,?,?,?,?,?,?)`,
      'scrabble', p.mid, p.score | 0, null, null, won, 'family', now, ref);
  });
  g.scored = true;
}
export function viewOf(g, meId, names) {
  const mine = g.players.findIndex(p => p.mid === meId);
  if (mine < 0) return null;
  const nm = i => names[g.players[i].mid] || 'Former member';
  return {
    id: g.id, rev: g.rev, over: !!g.over,
    yourTurn: !g.over && g.players[g.turn].mid === meId,
    bag: g.bag.length, scoreless: g.scoreless || 0, turn: g.turn,
    out: g.over ? g.out : null, winners: g.over ? g.winners.slice() : [],
    winnerNames: g.over ? g.winners.map(nm) : [],
    board: g.board, last: g.last || null, updated: g.updated, created: g.created,
    rack: g.players[mine].rack.slice(),
    players: g.players.map((p, i) => ({
      name: names[p.mid] || 'Former member', score: p.score, tiles: p.rack.length,
      me: i === mine, turn: !g.over && i === g.turn, left: g.over ? (p.left || 0) : undefined
    }))
  };
}
function lastLine(g, names) {
  const L = g.last; if (!L) return '';
  const name = names[g.players[L.who].mid] || 'Someone';
  if (L.kind === 'swap') return `${name} swapped ${L.n} tile${L.n === 1 ? '' : 's'}.`;
  if (L.kind === 'pass') return `${name} passed.`;
  const w = L.words && L.words[0];
  if (!w) return `${name} played.`;
  const more = L.words.length > 1 ? ` and ${L.words.slice(1).map(x => x.w).join(', ')}` : '';
  return `${name} played ${w.w}${more} for ${L.score}${L.bingo ? ', plus 50 for all 7 tiles' : ''}.`;
}
async function tell(hooks, mid, text, card) {
  if (!hooks || !mid || !hooks.note) return;
  try { await hooks.note(mid, String(text).slice(0, 160), card || ''); } catch (e) { }
}
function inGame(sql, id, mid) { return !!rows(sql, `SELECT 1 x FROM scrabble_seats WHERE gid=? AND mid=?`, id, mid)[0]; }

export function createGame(sql, me, ids, now, opts = {}) {
  const want = [...new Set([me.id, ...(Array.isArray(ids) ? ids : []).map(x => String(x || ''))])].filter(id => /^m[0-9a-f]{12}$/.test(id));
  if (want.length < SEATS_MIN || want.length > SEATS_MAX) return { status: 400, body: { err: 'Pick 1 to 3 family members, besides you. A game is 2 to 4 people.' } };
  const found = rows(sql, `SELECT id FROM members WHERE removed=0 AND id IN (${want.map(() => '?').join(',')})`, ...want).map(r => r.id);
  if (found.length !== want.length) return { status: 400, body: { err: 'Pick people from the family list.' } };
  const open = (rows(sql, `SELECT COUNT(*) n FROM scrabble_games g JOIN scrabble_seats s ON s.gid=g.id WHERE s.mid=? AND g.status='play'`, me.id)[0] || {}).n || 0;
  if (Number(open) >= OPEN_CAP && !opts.order) return { status: 400, body: { err: 'You already have 8 games on the go. Finish one before starting another.' } };
  const order = Array.isArray(opts.order) && opts.order.length === want.length ? opts.order.slice() : seatOrder(want);
  const bag = typeof opts.bag === 'string' ? opts.bag.split('') : makeBag();
  const racks = Array.isArray(opts.racks) ? opts.racks : null;
  const players = order.map((mid, i) => ({ mid, score: 0, rack: racks ? String(racks[i] || '').split('') : [] }));
  if (!racks) for (const p of players) drawTiles(bag, p.rack);
  const id = newId();
  const g = { id, rev: 1, board: new Array(N * N).fill(null), bag, players, turn: 0, scoreless: 0, over: false, out: null, winners: [], last: null, moves: 0, scored: false, created: now, updated: now };
  sql.exec(`INSERT INTO scrabble_games (id, rev, status, turn_mid, state, created, updated) VALUES (?,?,?,?,?,?,?)`,
    id, 1, 'play', players[0].mid, pack(g), now, now);
  order.forEach((mid, i) => sql.exec(`INSERT INTO scrabble_seats (gid, mid, seat) VALUES (?,?,?)`, id, mid, i));
  return { status: 200, body: g };
}

function listGames(sql, me) {
  const recs = rows(sql, `SELECT g.id, g.rev, g.status, g.turn_mid, g.state, g.created, g.updated FROM scrabble_games g JOIN scrabble_seats s ON s.gid=g.id WHERE s.mid=? ORDER BY (g.status='play' AND g.turn_mid=?) DESC, (g.status='play') DESC, g.updated DESC LIMIT 30`, me.id, me.id);
  const games = [];
  for (const row of recs) {
    const g = unpack(row);
    const names = namesFor(sql, g);
    const v = viewOf(g, me.id, names);
    games.push({
      id: g.id, yourTurn: v.yourTurn, over: v.over, updated: g.updated, bag: v.bag,
      turnName: v.over ? '' : (names[g.players[g.turn].mid] || 'Former member'),
      players: v.players.map(p => ({ name: p.name, score: p.score, me: p.me, tiles: p.tiles }))
    });
  }
  return { yourTurn: games.filter(g => g.yourTurn).length, games };
}

async function act(sql, me, id, kind, body, now, hooks) {
  const g0 = loadGame(sql, id);
  if (!g0 || !inGame(sql, id, me.id)) return { status: 404, body: { err: 'no such game' } };
  let g = g0;
  if (repair(sql, g)) { g.rev++; if (g.over) recordScores(sql, g, now); saveGame(sql, g, now); }
  if (g.over) return { status: 409, body: { err: 'The game is over.', rev: g.rev } };
  if (g.players[g.turn].mid !== me.id) return { status: 403, body: { err: 'It isn’t your turn yet.' } };
  if (!body || body.rev !== g.rev) return { status: 409, body: { err: 'The board has changed. Have another look.', rev: g.rev } };
  const next = JSON.parse(JSON.stringify(g));
  let res;
  if (kind === 'play') {
    const tiles = Array.isArray(body.tiles) ? body.tiles.slice(0, RACK) : [];
    const place = tiles.map(t => ({ r: t.r | 0, c: t.c | 0, l: String(t.l || '').toUpperCase(), b: t.b ? 1 : 0 }));
    res = play(next, place);
  } else if (kind === 'pass') res = pass(next);
  else if (kind === 'swap') res = swap(next, Array.isArray(body.letters) ? body.letters.map(l => String(l || '').toUpperCase()).slice(0, RACK) : []);
  else return { status: 404, body: { err: 'no such game' } };
  if (!res.ok) return { status: 400, body: { err: res.err } };
  next.rev = g.rev + 1;
  if (next.over) recordScores(sql, next, now);
  saveGame(sql, next, now);
  const names = namesFor(sql, next);
  const line = lastLine(next, names);
  const card = 'scrabble-' + next.id;
  if (next.over) {
    const win = (next.winners || []).map(i => names[next.players[i].mid] || 'Someone');
    const end = win.length > 1 ? `Scrabble is finished. It’s a tie: ${win.join(' and ')}.` : `Scrabble is finished. ${win[0] || 'Someone'} wins.`;
    for (const p of next.players) if (p.mid !== me.id) await tell(hooks, p.mid, end, card);
  } else if (next.players[next.turn].mid !== me.id) {
    await tell(hooks, next.players[next.turn].mid, `Your turn in Scrabble. ${line}`.slice(0, 160), card);
  }
  return { status: 200, body: viewOf(next, me.id, names) };
}

/* Called from Family.fetch once the member token has been checked. null when the path is not /scrabble. */
export async function scrabbleRoute(sql, me, p, m, url, readBody, now = Date.now(), hooks) {
  const mm = /^\/scrabble(?:\/(g[0-9a-f]{16})(?:\/(play|pass|swap))?)?$/.exec(p || '');
  if (!mm) return null;
  if (!lex) return { status: 503, body: { err: 'The word list is not ready yet.' } };
  const id = mm[1], kind = mm[2];
  if (!id) {
    if (m === 'GET') return { status: 200, body: listGames(sql, me) };
    if (m === 'POST') {
      const b = await readBody();
      const made = createGame(sql, me, b && b.players, now);
      if (made.status !== 200) return made;
      const g = made.body;
      const names = namesFor(sql, g);
      const card = 'scrabble-' + g.id;
      const starter = names[g.players[0].mid] || 'Someone';
      for (const p of g.players) {
        if (p.mid === me.id && p.mid === g.players[0].mid) continue;
        const text = p.mid === g.players[0].mid ? `Your turn in Scrabble. ${starter} started a game.` : `${starter} started a Scrabble game. You’ll get a turn when it comes around.`;
        await tell(hooks, p.mid, text, card);
      }
      return { status: 200, body: viewOf(g, me.id, names) };
    }
    return { status: 405, body: { err: 'method' } };
  }
  if (kind) {
    if (m !== 'POST') return { status: 405, body: { err: 'method' } };
    const b = await readBody();
    return act(sql, me, id, kind, b, now, hooks);
  }
  if (m !== 'GET') return { status: 405, body: { err: 'method' } };
  let g = loadGame(sql, id);
  if (!g || !inGame(sql, id, me.id)) return { status: 404, body: { err: 'no such game' } };
  if (repair(sql, g)) { g.rev++; saveGame(sql, g, now); }
  if (g.over && !g.scored) { recordScores(sql, g, now); saveGame(sql, g, now); }
  return { status: 200, body: viewOf(g, me.id, namesFor(sql, g)) };
}

export const _test = { idx, rackPoints, makeBag };
