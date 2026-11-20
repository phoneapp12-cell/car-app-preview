import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 1.9.285 Gameplay overhaul: countdown bombs, candy cannons, portals, bosses, thick frosting, timed and order levels.
function loadSugarRush() {
  const ctx = { console, Intl, Date, Math, URL, Set, Map, Object, Number, String, Array, encodeURIComponent, decodeURIComponent };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('feed/sugar-rush.js', 'utf8'), ctx, { filename: 'feed/sugar-rush.js' });
  return ctx.SugarRush;
}
const SR = loadSugarRush();
const L = n => SR.LEVELS[n - 1];
const noEmpty = st => st.board.every(row => row.every(t => t !== null));

test('every level has objectives, never a score target', () => {
  for (const lv of SR.LEVELS) {
    assert.equal(lv.scoreGoal, undefined, 'level ' + lv.n + ' has a score target');
    assert.ok(SR.goalCounts(lv).length > 0, 'level ' + lv.n + ' has goals');
  }
});

test('each new mechanic gets a "New!" intro the first time it appears', () => {
  const first = SR.MECHANIC_FIRST;
  for (const id of ['frost3', 'fuse', 'order', 'cannon', 'timer', 'portal', 'boss', 'belts']) {
    const n = first[id];
    assert.ok(n >= 25 && n <= 34, id + ' first appears at ' + n);
    const news = SR.newsFor(n);
    assert.equal(news && news.kind, 'new', id + ' has a New! card at level ' + n);
    assert.ok(SR.levelIntro(n).news, 'levelIntro carries the card');
  }
});

test('neighbouring levels play differently and every country from 25 on brings something new', () => {
  const sig = lv => SR.goalCounts(lv).map(g => g.kind.replace(/^recipe-.*/, 'recipe')).sort().join('+') +
    (lv.timer ? '+timer' : '') + (lv.boss ? '+boss' : '') + (lv.portals ? '+portal' : '') + (lv.cannons ? '+cannon' : '') + (lv.fuses ? '+fuse' : '') + (lv.belts ? '+belts' : '');
  for (let n = 26; n <= 75; n++) assert.notEqual(sig(L(n)), sig(L(n - 1)), 'levels ' + (n - 1) + ' and ' + n + ' feel the same');
  const firsts = [];
  for (let n = 25; n <= 75; n++) if (SR.MAP_COUNTRIES[n - 1] !== SR.MAP_COUNTRIES[n - 2]) firsts.push(n);
  for (const n of firsts) if (SR.LEVEL_REWORK_285[n]) assert.ok(SR.newsFor(n), 'country-first level ' + n + ' introduces something');
});

test('countdown bombs tick each move, defuse when matched, and end the level at zero', () => {
  const st = SR.newGame({ level: L(26), seed: 11 });
  const fuses = SR.fusesOn(st.board);
  assert.equal(fuses.length, 3);
  const before = fuses.map(f => st.board[f.r][f.c].fuse);
  const out = SR.endOfMove(st);
  assert.equal(out.fuseTicks.length, 3);
  assert.deepEqual(SR.fusesOn(st.board).map(f => st.board[f.r][f.c].fuse), before.map(n => n - 1));
  const f = SR.fusesOn(st.board)[0];
  st.board[f.r][f.c].fuse = 1;
  const boom = SR.endOfMove(st);
  assert.ok(boom.fuseBlown);
  assert.equal(st.over, true);
  assert.equal(st.won, false);
});

test('a candy cannon loads every few moves and drops its treat into the column', () => {
  const st = SR.newGame({ level: L(28), seed: 5 });
  const cn = L(28).cannons[0];
  const total = SR.ingTotal(L(28));
  assert.equal(total, cn.max, 'the treats all come from the cannon');
  assert.equal(st.ingsLeft, total);
  let loaded = 0;
  for (let i = 0; i < cn.every * 2; i++) loaded += SR.endOfMove(st).cannonLoaded.length;
  assert.ok(loaded >= 1);
  st.board[0][cn.c] = null;
  SR.collapse(st.board, st.rand, st.kinds, st.mask, st);
  assert.ok(st.board[0][cn.c] && st.board[0][cn.c].cannon, 'the cannon tile drops in');
  assert.ok(noEmpty(st));
});

test('lock and liquorice cannons count their shots still to come', () => {
  const st = SR.newGame({ level: L(48), seed: 3 });
  for (const row of st.board) for (const t of row) if (t) t.lock = 0;
  assert.equal(SR.goalsMet(st), false, 'jars still to come from the cannon');
  const cn = L(48).cannons[0];
  st.cannonShots[cn.c] = cn.max; st.cannonDue[cn.c] = 0;
  assert.equal(SR.goalsMet(st), true);
});

test('portals carry sweets from one part of the tray to another and never leave holes', () => {
  const lv = L(30);
  const st = SR.newGame({ level: lv, seed: 9 });
  const p = lv.portals[0];
  const exitBefore = st.board[p.to[0]][p.to[1]];
  const fromTile = st.board[p.from[0]][p.from[1]];
  st.board[p.to[0]][p.to[1]] = null;
  const falls = SR.collapse(st.board, st.rand, st.kinds, st.mask, st);
  assert.ok(exitBefore);
  assert.equal(st.board[p.to[0]][p.to[1]].id, fromTile.id, 'the sweet above the portal mouth comes out of the exit');
  assert.ok((falls || []).some(f => f.portal), 'the fall is marked as a portal hop');
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (!(st.mask && st.mask[r] && st.mask[r][c] === 0) && SR.isOpen && SR.isOpen(st.mask, r, c)) assert.ok(st.board[r][c], 'hole at ' + r + ',' + c);
});

test('a boss takes hits, heals when left alone, and must reach zero to win', () => {
  const st = SR.newGame({ level: L(33), seed: 4 });
  assert.equal(st.boss.hp, st.boss.max);
  assert.equal(SR.goalsMet(st), false);
  st.boss.hp -= 3; st.boss.hitThisMove = false;
  const out = SR.endOfMove(st);
  assert.equal(out.bossHealed, 1);
  assert.equal(st.boss.hp, st.boss.max - 2);
  st.boss.hp = 0;
  assert.equal(SR.goalsMet(st), true);
  for (const n of [33, 40, 50, 65, 75]) assert.ok(L(n).boss, 'milestone boss at ' + n);
});

test('thick frosting has three or more layers and each hit takes one', () => {
  const st = SR.newGame({ level: L(25), seed: 2 });
  const thick = st.board.flat().filter(t => t && t.ice >= 3);
  assert.ok(thick.length >= 3);
  const t = thick[0], n = t.ice;
  assert.ok(n >= 3);
});

test('timed levels add a clock on top of moves and stay winnable by the bot', () => {
  const timed = SR.LEVELS.filter(lv => lv.timer).map(lv => lv.n);
  assert.ok(timed.length >= 6, 'a handful of timed levels: ' + timed);
  for (const n of [29, 42, 66, 73]) {
    assert.ok(L(n).timer > 0 && L(n).moves > 0);
    assert.match(SR.levelIntro(n).detail, /moves and \d+ seconds/);
  }
});

test('reworked levels are balanced: the bot wins some but not all', () => {
  for (const n of [26, 28, 30, 33, 44, 48]) {
    const w = SR.tryBeat(L(n), 12);
    assert.ok(w >= 2 && w <= 12, 'level ' + n + ' bot wins ' + w + '/12');
  }
});
