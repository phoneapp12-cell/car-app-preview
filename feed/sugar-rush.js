/* Info Book 1.9.156 – Sugar Rush, level 1. Our own match-3 sweet-shop game (own art drawn on canvas, own names).
   Swap two sweets next to each other to make a line of 3 or more. 4 in a line makes a striped sweet (clears a row or
   column), an L or T makes a wrapped sweet (clears the 3x3 around it), 5 in a line makes a sprinkle bomb (clears every
   sweet of the colour it is swapped with). Level 1: reach 3,000 points in 20 moves.
   Only Shane can play for now (IBScores.isShane() from scores.js); everyone else sees a coming-soon screen.
   Scores are not sent to the family scoreboard yet. Sounds are soft and low: sine/triangle notes under 400 Hz,
   gentle attack, through a lowpass, no clicks or chirps. */
(function (root) {
  'use strict';
  const N = 8, KINDS = 6, PTS = 30;
  const LEVEL = { n: 1, target: 3000, moves: 20, stars: [3000, 6000, 9000] };
  const BONUS = { row: 120, col: 120, w: 200, b: 300 };
  const NAMES = ['Cherry gumdrop', 'Orange jelly', 'Lemon drop', 'Apple chew', 'Blueberry gem', 'Grape twist'];

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  let nid = 1;
  const mk = (c, s) => ({ id: nid++, c, s: s || '' });
  const key = (r, c) => r * N + c;
  const rc = k => [Math.floor(k / N), k % N];
  const adj = (a, z) => Math.abs(a[0] - z[0]) + Math.abs(a[1] - z[1]) === 1;
  const randKind = (rand, kinds) => Math.floor(rand() * (kinds || KINDS));

  // Tests: '0'-'5' plain sweets, '*' a sprinkle bomb, '.' empty.
  function fromRows(rows) {
    return rows.map(row => row.split('').map(ch => ch === '.' ? null : ch === '*' ? mk(-1, 'b') : mk(+ch)));
  }
  const toRows = b => b.map(row => row.map(t => !t ? '.' : t.c < 0 ? '*' : String(t.c)).join(''));

  function findRuns(b) {
    const runs = [];
    for (let dir = 0; dir < 2; dir++) {
      for (let i = 0; i < N; i++) {
        let start = 0;
        for (let j = 1; j <= N; j++) {
          const cur = j < N ? (dir ? b[j][i] : b[i][j]) : null;
          const first = dir ? b[start][i] : b[i][start];
          if (cur && first && cur.c >= 0 && cur.c === first.c) continue;
          if (j - start >= 3 && first && first.c >= 0) {
            const cells = [];
            for (let k = start; k < j; k++) cells.push(dir ? key(k, i) : key(i, k));
            runs.push({ dir: dir ? 'v' : 'h', color: first.c, cells });
          }
          start = j;
        }
      }
    }
    return runs;
  }
  function groups(runs) {
    const gs = [];
    for (const run of runs) {
      const hit = gs.filter(g => g.color === run.color && run.cells.some(k => g.cells.has(k)));
      let g;
      if (!hit.length) { g = { color: run.color, runs: [], cells: new Set() }; gs.push(g); }
      else { g = hit[0]; for (const o of hit.slice(1)) { o.runs.forEach(x => g.runs.push(x)); o.cells.forEach(k => g.cells.add(k)); gs.splice(gs.indexOf(o), 1); } }
      g.runs.push(run); run.cells.forEach(k => g.cells.add(k));
    }
    return gs;
  }
  // What a matched group makes: 5 in a line a bomb, an L/T a wrapped sweet, 4 in a line a striped sweet.
  function specialFor(g) {
    const long = Math.max(...g.runs.map(r => r.cells.length));
    const hasH = g.runs.some(r => r.dir === 'h'), hasV = g.runs.some(r => r.dir === 'v');
    if (long >= 5) return 'b';
    if (hasH && hasV) return 'w';
    if (long === 4) return g.runs.find(r => r.cells.length === 4).dir === 'h' ? 'col' : 'row';
    return '';
  }
  function placeFor(g, pref) {
    for (const p of pref || []) if (g.cells.has(key(p[0], p[1]))) return key(p[0], p[1]);
    const hs = g.runs.filter(r => r.dir === 'h'), vs = g.runs.filter(r => r.dir === 'v');
    for (const h of hs) for (const v of vs) { const x = h.cells.find(k => v.cells.includes(k)); if (x != null) return x; }
    const longest = g.runs.slice().sort((a, b) => b.cells.length - a.cells.length)[0];
    return longest.cells[Math.floor((longest.cells.length - 1) / 2)];
  }
  function mostCommon(b, skip) {
    const n = new Array(KINDS).fill(0);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = b[r][c]; if (t && t.c >= 0 && !skip.has(key(r, c))) n[t.c]++; }
    let best = 0; for (let i = 1; i < KINDS; i++) if (n[i] > n[best]) best = i;
    return best;
  }
  // Specials caught in a clear go off, and can set each other off.
  function expand(b, clear, fired, keep) {
    const q = [...clear], done = new Set();
    const add = k => { if (!clear.has(k)) { clear.add(k); q.push(k); } };
    while (q.length) {
      const k = q.pop(); if (done.has(k)) continue; done.add(k);
      const [r, c] = rc(k), t = b[r][c];
      if (!t || !t.s || (keep && keep.has(k) && !t.s)) continue;
      if (t.s === 'row') { fired.push({ r, c, s: 'row' }); for (let j = 0; j < N; j++) add(key(r, j)); }
      else if (t.s === 'col') { fired.push({ r, c, s: 'col' }); for (let i = 0; i < N; i++) add(key(i, c)); }
      else if (t.s === 'w') { fired.push({ r, c, s: 'w' }); for (let i = r - 1; i <= r + 1; i++) for (let j = c - 1; j <= c + 1; j++) if (i >= 0 && i < N && j >= 0 && j < N) add(key(i, j)); }
      else if (t.s === 'b' && !t.armed) {
        const col = mostCommon(b, clear); fired.push({ r, c, s: 'b', color: col });
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const o = b[i][j]; if (o && o.c === col) add(key(i, j)); }
      }
    }
  }
  function resolve(b, pref) {
    const runs = findRuns(b); if (!runs.length) return null;
    const gs = groups(runs), clear = new Set(), made = [], keep = new Set();
    for (const g of gs) {
      g.cells.forEach(k => clear.add(k));
      const s = specialFor(g);
      if (s) { const k = placeFor(g, pref); if (!keep.has(k)) { keep.add(k); made.push({ k, s, color: s === 'b' ? -1 : g.color }); } }
    }
    const fired = [];
    expand(b, clear, fired);
    return { kind: 'clear', clear, made, fired, groups: gs.length };
  }
  function bombSwap(b, A, Z, at) {
    const clear = new Set(), fired = [];
    if (A.c < 0 && Z.c < 0) { for (let k = 0; k < N * N; k++) if (b[rc(k)[0]][rc(k)[1]]) clear.add(k); fired.push({ r: rc(at)[0], c: rc(at)[1], s: 'b', color: -1 }); }
    else {
      const other = A.c < 0 ? Z : A, bomb = A.c < 0 ? A : Z;
      bomb.armed = true;
      for (let k = 0; k < N * N; k++) { const [r, c] = rc(k), t = b[r][c]; if (t === bomb || (t && t.c === other.c)) clear.add(k); }
      const bk = [...clear].find(k => b[rc(k)[0]][rc(k)[1]] === bomb);
      fired.push({ r: rc(bk)[0], c: rc(bk)[1], s: 'b', color: other.c });
      expand(b, clear, fired);
    }
    return { kind: 'clear', clear, made: [], fired, groups: 1, bomb: true };
  }
  function collapse(b, rand, kinds) {
    const falls = [];
    for (let c = 0; c < N; c++) {
      let w = N - 1;
      for (let r = N - 1; r >= 0; r--) {
        const t = b[r][c]; if (!t) continue;
        if (r !== w) { b[w][c] = t; b[r][c] = null; falls.push({ t, r: w, c, from: r }); }
        w--;
      }
      for (let r = w; r >= 0; r--) { const t = mk(randKind(rand, kinds)); b[r][c] = t; falls.push({ t, r, c, from: r - (w + 1), fresh: true }); }
    }
    return falls;
  }
  function applyStep(b, step, rand, kinds, cascade) {
    step.popped = [];
    step.clear.forEach(k => { const [r, c] = rc(k), t = b[r][c]; if (t) step.popped.push({ id: t.id, r, c, color: t.c, s: t.s }); b[r][c] = null; });
    step.madeTiles = step.made.map(m => { const [r, c] = rc(m.k), t = mk(m.color, m.s); b[r][c] = t; return { t, r, c }; });
    step.cascade = cascade;
    step.points = step.popped.length * PTS * cascade + step.made.reduce((n, m) => n + BONUS[m.s], 0);
    step.falls = collapse(b, rand, kinds);
    return step;
  }
  function swapAt(b, a, z) { const t = b[a[0]][a[1]]; b[a[0]][a[1]] = b[z[0]][z[1]]; b[z[0]][z[1]] = t; }
  function validSwap(b, a, z) {
    if (!adj(a, z)) return false;
    const A = b[a[0]] && b[a[0]][a[1]], Z = b[z[0]] && b[z[0]][z[1]];
    if (!A || !Z) return false;
    if (A.c < 0 || Z.c < 0) return true;
    swapAt(b, a, z); const ok = findRuns(b).length > 0; swapAt(b, a, z);
    return ok;
  }
  function findMove(b) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (c + 1 < N && validSwap(b, [r, c], [r, c + 1])) return [[r, c], [r, c + 1]];
      if (r + 1 < N && validSwap(b, [r, c], [r + 1, c])) return [[r, c], [r + 1, c]];
    }
    return null;
  }
  const hasMove = b => !!findMove(b);
  function shuffle(b, rand, kinds) {
    const cells = [], tiles = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c]) { cells.push([r, c]); tiles.push(b[r][c]); }
    for (let tries = 0; tries < 300; tries++) {
      for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const x = tiles[i]; tiles[i] = tiles[j]; tiles[j] = x; }
      cells.forEach((p, i) => { b[p[0]][p[1]] = tiles[i]; });
      if (!findRuns(b).length && hasMove(b)) return true;
    }
    // Too few colours left to rearrange: deal a fresh set of sweets.
    const fresh = newBoard(rand, kinds);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) b[r][c] = fresh[r][c];
    return true;
  }
  function newBoard(rand, kinds) {
    kinds = kinds || KINDS;
    for (;;) {
      const b = [];
      for (let r = 0; r < N; r++) {
        b.push([]);
        for (let c = 0; c < N; c++) {
          let k;
          do { k = randKind(rand, kinds); } while ((c >= 2 && b[r][c - 1].c === k && b[r][c - 2].c === k) || (r >= 2 && b[r - 1][c].c === k && b[r - 2][c].c === k));
          b[r].push(mk(k));
        }
      }
      if (hasMove(b)) return b;
    }
  }
  function starsFor(score, lv) { lv = lv || LEVEL; return lv.stars.filter(s => score >= s).length; }
  function newGame(opt) {
    opt = opt || {};
    const rand = opt.rand || rng(opt.seed == null ? Date.now() : opt.seed);
    const kinds = opt.kinds || KINDS;
    return { board: opt.board || newBoard(rand, kinds), rand, kinds, score: 0, moves: LEVEL.moves, target: LEVEL.target, over: false, won: false, stars: 0 };
  }
  // One move: the swap, every cascade after it, and a shuffle if no moves are left. Returns the steps for the animation.
  function play(st, a, z) {
    const b = st.board;
    if (st.over || !validSwap(b, a, z)) return { valid: false };
    const A = b[a[0]][a[1]], Z = b[z[0]][z[1]];
    swapAt(b, a, z);
    st.moves--;
    const steps = [];
    let cascade = 1;
    if (A.c < 0 || Z.c < 0) { const s = applyStep(b, bombSwap(b, A, Z, key(z[0], z[1])), st.rand, st.kinds, cascade++); steps.push(s); st.score += s.points; }
    let pref = steps.length ? null : [z, a];
    for (let guard = 0; guard < 60; guard++) {
      const s = resolve(b, pref); if (!s) break;
      pref = null;
      applyStep(b, s, st.rand, st.kinds, cascade++);
      steps.push(s); st.score += s.points;
    }
    let shuffled = false;
    if (!hasMove(b)) { shuffle(b, st.rand, st.kinds); shuffled = true; }
    if (st.moves <= 0) { st.over = true; st.won = st.score >= st.target; st.stars = starsFor(st.score); }
    return { valid: true, steps, shuffled, swapped: [A, Z] };
  }

  root.SugarRush = { N, KINDS, PTS, LEVEL, BONUS, NAMES, rng, fromRows, toRows, findRuns, groups, specialFor, resolve, collapse, applyStep, validSwap, findMove, hasMove, shuffle, newBoard, newGame, play, starsFor,
    allowed: () => !!(root.IBScores && root.IBScores.isShane && root.IBScores.isShane()) };

  if (!root.document) return;
  const doc = root.document;
  const $ = id => doc.getElementById(id);
  const ls = {
    get(k, f) { try { const v = root.localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch (e) { return f; } },
    set(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  if (!root.SugarRush.allowed()) { $('soon').hidden = false; return; }
  $('game').hidden = false;

  const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SP = reduce ? 0.35 : 1;
  const cv = $('board'), ctx = cv.getContext('2d');
  let W = 0, CS = 0, DPR = 1;
  let st = newGame();
  let best = ls.get('ib-sugar-best', 0);
  let busy = false, sel = null, down = null, lastAct = performance.now();
  let sprites = new Map(), fx = [];
  let soundOn = ls.get('ib-sugar-sound', true), musicOn = ls.get('ib-sugar-music', false);

  // ---------- Look ----------
  const COL = [['#ff8a9a', '#e0284a', '#9e1030'], ['#ffc078', '#f76707', '#b34700'], ['#fff3a0', '#fcc419', '#c98e00'], ['#9ff0a8', '#37b24d', '#1d7a30'], ['#a5dcff', '#228be6', '#124f99'], ['#e2b6ff', '#9c36b5', '#5f1a75']];
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function shapePath(k, R) {
    ctx.beginPath();
    if (k === 0) ctx.arc(0, 0, R, 0, Math.PI * 2);
    else if (k === 1) { rr(-R * .9, -R * .9, R * 1.8, R * 1.8, R * .45); }
    else if (k === 2) ctx.ellipse(0, 0, R * 1.02, R * .74, 0, 0, Math.PI * 2);
    else if (k === 3) { const p = [[0, -R * 1.02], [R * .98, R * .78], [-R * .98, R * .78]]; ctx.moveTo((p[0][0] + p[2][0]) / 2, (p[0][1] + p[2][1]) / 2); for (let i = 0; i < 3; i++) { const a = p[i], n = p[(i + 1) % 3]; ctx.arcTo(a[0], a[1], n[0], n[1], R * .32); } ctx.closePath(); }
    else if (k === 4) { const q = [[0, -R * 1.05], [R * .95, 0], [0, R * 1.05], [-R * .95, 0]]; ctx.moveTo((q[3][0] + q[0][0]) / 2, (q[3][1] + q[0][1]) / 2); for (let i = 0; i < 4; i++) { const a = q[i], n = q[(i + 1) % 4]; ctx.arcTo(a[0], a[1], n[0], n[1], R * .25); } ctx.closePath(); }
    else { ctx.arc(0, 0, R * .78, 0, Math.PI * 2); }
  }
  function drawSweet(t, x, y, R, sc, al, wob) {
    ctx.save(); ctx.translate(x, y); if (wob) ctx.rotate(wob); ctx.scale(sc, sc); ctx.globalAlpha = al;
    if (t.c < 0) { // sprinkle bomb
      const g = ctx.createRadialGradient(-R * .3, -R * .35, R * .1, 0, 0, R);
      g.addColorStop(0, '#9a6a4f'); g.addColorStop(.6, '#5b3423'); g.addColorStop(1, '#3a1f14');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * .95, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 14; i++) { const a = i * 2.39996, d = R * (.25 + .55 * ((i * 37) % 10) / 10); ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d); ctx.rotate(a * 1.7); ctx.fillStyle = COL[i % 6][1]; rr(-R * .13, -R * .05, R * .26, R * .1, R * .05); ctx.fill(); ctx.restore(); }
      ctx.restore(); return;
    }
    const c = COL[t.c];
    if (t.c === 5) { // twisted wrapper ends
      ctx.fillStyle = c[1];
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * R * .6, 0); ctx.lineTo(s * R * 1.08, -R * .45); ctx.quadraticCurveTo(s * R * .95, 0, s * R * 1.08, R * .45); ctx.closePath(); ctx.fill(); }
    }
    if (t.s === 'w') { ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(-R * 1.08, -R * 1.08, R * 2.16, R * 2.16, R * .5); ctx.fill(); ctx.strokeStyle = c[1]; ctx.lineWidth = R * .14; ctx.setLineDash([R * .3, R * .18]); ctx.stroke(); ctx.restore(); }
    const g = ctx.createRadialGradient(-R * .35, -R * .4, R * .1, 0, 0, R * 1.1);
    g.addColorStop(0, c[0]); g.addColorStop(.55, c[1]); g.addColorStop(1, c[2]);
    shapePath(t.c, R * (t.s === 'w' ? .8 : 1)); ctx.fillStyle = g; ctx.fill();
    if (t.s === 'row' || t.s === 'col') {
      ctx.save(); shapePath(t.c, R); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.78)';
      for (let i = -2; i <= 2; i++) { if (t.s === 'row') ctx.fillRect(-R * 1.2, i * R * .42 - R * .08, R * 2.4, R * .16); else ctx.fillRect(i * R * .42 - R * .08, -R * 1.2, R * .16, R * 2.4); }
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-R * .3, -R * .42, R * .3, R * .15, -.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function cellXY(r, c) { return [c * CS + CS / 2, r * CS + CS / 2]; }

  // ---------- Sprites and animation ----------
  const now = () => performance.now();
  const easeOut = x => 1 - Math.pow(1 - x, 3), easeIn = x => x * x;
  function sprite(t, r, c) { const s = { t, r, c, y: r, x: c, sc: 1, al: 1, tw: null }; sprites.set(t.id, s); return s; }
  function moveTo(s, r, c, dur, ease) { s.tw = { fx: s.x, fy: s.y, tx: c, ty: r, t0: now(), dur: Math.max(1, dur * SP), ease: ease || easeOut }; s.r = r; s.c = c; }
  function syncAll() { sprites = new Map(); for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = st.board[r][c]; if (t) sprite(t, r, c); } }
  const wait = ms => new Promise(res => setTimeout(res, ms * SP));
  function fitCanvas() {
    const w = Math.floor(cv.getBoundingClientRect().width) || 320;
    DPR = Math.min(2.5, root.devicePixelRatio || 1);
    cv.width = Math.round(w * DPR); cv.height = cv.width; W = cv.width; CS = W / N;
  }
  function frame() {
    const t = now();
    ctx.clearRect(0, 0, W, W);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { ctx.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,.55)' : 'rgba(255,228,240,.7)'; rr(c * CS + 1.5, r * CS + 1.5, CS - 3, CS - 3, CS * .18); ctx.fill(); }
    if (sel && !busy) { ctx.strokeStyle = '#ff4f9a'; ctx.lineWidth = 3 * DPR; rr(sel[1] * CS + 3, sel[0] * CS + 3, CS - 6, CS - 6, CS * .2); ctx.stroke(); }
    for (const f of fx) if (f.type === 'beam') {
      const p = Math.min(1, (t - f.t0) / f.dur); ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - p)) + ')';
      if (f.s === 'row') ctx.fillRect(0, f.r * CS + CS * (.5 - .4 * (1 - p)), W, CS * .8 * (1 - p)); else ctx.fillRect(f.c * CS + CS * (.5 - .4 * (1 - p)), 0, CS * .8 * (1 - p), W);
    } else if (f.type === 'ring') {
      const p = Math.min(1, (t - f.t0) / f.dur); ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - p)) + ')'; ctx.lineWidth = CS * .2 * (1 - p);
      ctx.beginPath(); ctx.arc(f.x, f.y, CS * (.4 + 1.3 * p), 0, Math.PI * 2); ctx.stroke();
    }
    const hint = !busy && !st.over && t - lastAct > 6000 ? hintMove : null;
    const R = CS * .37;
    for (const s of sprites.values()) {
      if (s.tw) { const p = Math.min(1, (t - s.tw.t0) / s.tw.dur), e = s.tw.ease(p); s.x = s.tw.fx + (s.tw.tx - s.tw.fx) * e; s.y = s.tw.fy + (s.tw.ty - s.tw.fy) * e; if (p >= 1) s.tw = null; }
      if (s.pop) { const p = Math.min(1, (t - s.pop) / (220 * SP)); s.sc = 1 + .25 * p; s.al = 1 - p; }
      if (s.grow) { const p = Math.min(1, (t - s.grow) / (260 * SP)); s.sc = .3 + .7 * easeOut(p); if (p >= 1) s.grow = 0; }
      if (s.y < -0.5) continue;
      let wob = 0;
      if (hint && hint.some(h => h[0] === s.r && h[1] === s.c)) wob = Math.sin(t / 180) * .12;
      drawSweet(s.t, s.x * CS + CS / 2, s.y * CS + CS / 2, R, s.sc, s.al, wob);
    }
    for (const f of fx) if (f.type === 'bit') {
      const p = Math.min(1, (t - f.t0) / f.dur); ctx.globalAlpha = 1 - p; ctx.fillStyle = f.col;
      ctx.beginPath(); ctx.arc(f.x + f.vx * p * CS, f.y + f.vy * p * CS + p * p * CS * .5, CS * .07 * (1 - p * .5), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    } else if (f.type === 'text') {
      const p = Math.min(1, (t - f.t0) / f.dur); ctx.globalAlpha = p < .7 ? 1 : (1 - p) / .3;
      ctx.font = '800 ' + Math.round(f.size * DPR) + 'px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5 * DPR; ctx.strokeStyle = 'rgba(120,20,70,.85)'; ctx.strokeText(f.str, f.x, f.y - p * CS * .8); ctx.fillStyle = f.col || '#fff'; ctx.fillText(f.str, f.x, f.y - p * CS * .8); ctx.globalAlpha = 1;
    }
    fx = fx.filter(f => t - f.t0 < f.dur);
    for (const [id, s] of sprites) if (s.pop && t - s.pop > 230 * SP) sprites.delete(id);
    root.requestAnimationFrame(frame);
  }
  let hintMove = null;

  // ---------- Sound (soft and low only) ----------
  let ac = null, out = null;
  function audio() {
    if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => { }); return ac; }
    const A = root.AudioContext || root.webkitAudioContext; if (!A) return null;
    ac = new A();
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.5;
    out = ac.createGain(); out.gain.value = 0.55; out.connect(lp); lp.connect(ac.destination);
    return ac;
  }
  // C major pentatonic, octaves 2–4 (65–392 Hz). Every sound is built from these, so nothing is high or sharp.
  const SCALE = [65.4, 73.4, 82.4, 98, 110, 130.8, 146.8, 164.8, 196, 220, 261.6, 293.7, 329.6, 392];
  function note(f, at, dur, vol, type, dest) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.value = Math.min(f, 400);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(dest || out); o.start(at); o.stop(at + dur + 0.05);
  }
  function sfx(kind, n) {
    if (!soundOn || !audio()) return;
    const t = ac.currentTime + 0.01;
    if (kind === 'swap') note(SCALE[5], t, .22, .07, 'triangle');
    else if (kind === 'nope') { note(SCALE[4], t, .2, .07, 'sine'); note(SCALE[3], t + .14, .26, .07, 'sine'); }
    else if (kind === 'pop') { const i = Math.min(SCALE.length - 1, 6 + n); note(SCALE[i], t, .32, .09, 'sine'); note(SCALE[i - 5], t, .36, .06, 'triangle'); }
    else if (kind === 'special') { [5, 7, 8].forEach((i, j) => note(SCALE[i], t + j * .06, .6, .06, 'triangle')); }
    else if (kind === 'blast') { note(SCALE[0], t, .5, .12, 'sine'); note(SCALE[5], t + .02, .45, .05, 'triangle'); }
    else if (kind === 'win') { [5, 7, 8, 10, 12].forEach((i, j) => note(SCALE[i], t + j * .16, .7, .08, 'triangle')); note(SCALE[0], t, 1.4, .08, 'sine'); }
    else if (kind === 'lose') { [8, 7, 5].forEach((i, j) => note(SCALE[i], t + j * .2, .6, .07, 'sine')); }
  }
  // Optional background music: slow, quiet triangle chords and a low bass, off unless turned on.
  let musicTimer = 0, musicAt = 0, musicBar = 0, musicGain = null;
  const CHORDS = [[5, 7, 8], [4, 5, 7], [3, 5, 6], [3, 4, 6]]; // C, Am, F-ish, G-ish from the scale
  function musicTick() {
    if (!ac || !musicOn) return;
    while (musicAt < ac.currentTime + 1.2) {
      const ch = CHORDS[musicBar % CHORDS.length];
      ch.forEach(i => note(SCALE[i], musicAt, 2.6, .03, 'triangle', musicGain));
      note(SCALE[ch[0] - 5 >= 0 ? ch[0] - 5 : 0], musicAt, 2.2, .05, 'sine', musicGain);
      note(SCALE[ch[2] + 2], musicAt + 1.2, 1.1, .02, 'sine', musicGain);
      musicAt += 2.4; musicBar++;
    }
  }
  function setMusic(on) {
    musicOn = on; ls.set('ib-sugar-music', on); paintButtons();
    if (on) { if (!audio()) return; if (!musicGain) { musicGain = ac.createGain(); musicGain.gain.value = 1; musicGain.connect(out); } musicGain.gain.setValueAtTime(1, ac.currentTime); musicAt = ac.currentTime + 0.1; clearInterval(musicTimer); musicTimer = setInterval(musicTick, 300); musicTick(); }
    else { clearInterval(musicTimer); if (musicGain && ac) { musicGain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.3); musicGain.disconnect(); musicGain = null; } }
  }

  // ---------- HUD ----------
  function paintButtons() { $('soundbtn').textContent = soundOn ? '🔉 Sound on' : '🔇 Sound off'; $('musicbtn').textContent = musicOn ? '🎵 Music on' : '🎵 Music off'; }
  function hud() {
    $('score').textContent = st.score.toLocaleString('en-NZ');
    $('moves').textContent = st.moves;
    $('best').textContent = Math.max(best, 0).toLocaleString('en-NZ');
    const max = LEVEL.stars[2], p = Math.min(1, st.score / max);
    $('fill').style.width = (p * 100).toFixed(1) + '%';
    LEVEL.stars.forEach((s, i) => { const el = $('st' + i); el.style.left = (s / max * 100) + '%'; el.classList.toggle('got', st.score >= s); });
  }
  function praise(step, i) {
    const words = ['', '', 'Yum!', 'Sweet!', 'Super sweet!', 'Sugar rush!'];
    return words[Math.min(words.length - 1, i + 1)];
  }

  // ---------- A move ----------
  async function attempt(a, z) {
    if (busy || st.over) return;
    sel = null; busy = true; lastAct = now(); hintMove = null;
    const A = sprites.get(st.board[a[0]][a[1]].id), Z = sprites.get(st.board[z[0]][z[1]].id);
    const res = play(st, a, z);
    sfx('swap');
    moveTo(A, z[0], z[1], 160); moveTo(Z, a[0], a[1], 160);
    await wait(170);
    if (!res.valid) { sfx('nope'); moveTo(A, a[0], a[1], 180); moveTo(Z, z[0], z[1], 180); await wait(190); busy = false; return; }
    hud();
    for (let i = 0; i < res.steps.length; i++) await showStep(res.steps[i], i);
    if (res.shuffled) { addText('Shuffle!', W / 2, W / 2, 30, '#fff'); await wait(450); for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = st.board[r][c], s = sprites.get(t.id) || sprite(t, r, c); moveTo(s, r, c, 420); } await wait(440); }
    hud();
    hintMove = findMove(st.board);
    busy = false; lastAct = now();
    if (st.over) finish();
  }
  function addText(str, x, y, size, col) { fx.push({ type: 'text', str, x, y, size, col, t0: now(), dur: 900 * SP }); }
  async function showStep(s, i) {
    const t = now();
    let cx = 0, cy = 0;
    for (const p of s.popped) {
      const sp = sprites.get(p.id); if (sp) sp.pop = t;
      const [x, y] = cellXY(p.r, p.c); cx += x; cy += y;
      if (p.color >= 0 && !reduce) for (let k = 0; k < 4; k++) { const a = Math.random() * Math.PI * 2; fx.push({ type: 'bit', x, y, vx: Math.cos(a) * .6, vy: Math.sin(a) * .6 - .3, col: COL[p.color][1], t0: t, dur: 480 }); }
    }
    for (const f of s.fired) {
      if (f.s === 'row' || f.s === 'col') fx.push({ type: 'beam', s: f.s, r: f.r, c: f.c, t0: t, dur: 420 * SP });
      else { const [x, y] = cellXY(f.r, f.c); fx.push({ type: 'ring', x, y, t0: t, dur: 480 * SP }); }
    }
    if (s.fired.length) sfx('blast'); else sfx('pop', i);
    if (s.madeTiles.length) setTimeout(() => sfx('special'), 120 * SP);
    if (s.popped.length) addText('+' + s.points, cx / s.popped.length, cy / s.popped.length, 22, '#fff');
    const word = s.fired.length ? (i >= 1 ? praise(s, i + 1) : 'Pow!') : praise(s, i);
    if (word) addText(word, W / 2, W * .42, 34, '#ffe066');
    for (const m of s.madeTiles) { const sp = sprite(m.t, m.r, m.c); sp.grow = t; }
    await wait(230);
    let longest = 0;
    for (const f of s.falls) {
      let sp = sprites.get(f.t.id);
      if (!sp || sp.pop) { sp = sprite(f.t, f.from, f.c); }
      const d = f.r - (f.fresh ? f.from : sp.y), dur = 120 + 70 * Math.sqrt(Math.max(1, d));
      longest = Math.max(longest, dur);
      moveTo(sp, f.r, f.c, dur, easeIn);
    }
    hud();
    await wait(longest + 40);
  }
  function finish() {
    const won = st.won;
    if (st.score > best) { best = st.score; ls.set('ib-sugar-best', best); }
    sfx(won ? 'win' : 'lose');
    setTimeout(() => showEnd(), 500 * SP);
  }
  function showEnd() {
    const won = st.score >= LEVEL.target, n = starsFor(st.score);
    $('endtitle').textContent = won ? 'Level 1 complete!' : 'So close!';
    $('endstars').innerHTML = [0, 1, 2].map(i => `<span class="${i < n ? 'on' : ''}">★</span>`).join('');
    $('endscore').textContent = st.score.toLocaleString('en-NZ') + ' points';
    $('endmsg').textContent = won ? (n === 3 ? 'Three stars! A perfect sweet shop.' : n === 2 ? 'Two stars. Reach 9,000 for all three.' : 'One star. Reach 6,000 for two.') + ' More levels are coming soon.' : 'You needed 3,000 points. Have another go!';
    $('againbtn').textContent = won ? 'Play again' : 'Try again';
    $('end').hidden = false;
  }
  function restart() {
    $('end').hidden = true; st = newGame(); syncAll(); sel = null; busy = false; hud();
    hintMove = findMove(st.board); lastAct = now();
    for (const s of sprites.values()) { s.y = s.r - N - 1 + (N - s.r) * .2; moveTo(s, s.r, s.c, 300 + (N - s.r) * 40, easeOut); }
  }

  // ---------- Input: swipe, or tap one sweet then a neighbour ----------
  function cellAt(e) { const b = cv.getBoundingClientRect(); const c = Math.floor((e.clientX - b.left) / b.width * N), r = Math.floor((e.clientY - b.top) / b.height * N); return r >= 0 && r < N && c >= 0 && c < N ? [r, c] : null; }
  cv.addEventListener('pointerdown', e => { audio(); if (musicOn && !musicTimer) setMusic(true); const p = cellAt(e); if (!p) return; down = { p, x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch (er) { } e.preventDefault(); });
  cv.addEventListener('pointermove', e => {
    if (!down || busy) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y, cell = cv.getBoundingClientRect().width / N;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < cell * .32) return;
    const a = down.p, z = Math.abs(dx) > Math.abs(dy) ? [a[0], a[1] + Math.sign(dx)] : [a[0] + Math.sign(dy), a[1]];
    down = null;
    if (z[0] >= 0 && z[0] < N && z[1] >= 0 && z[1] < N) attempt(a, z);
  });
  cv.addEventListener('pointerup', () => {
    if (!down) return; const p = down.p; down = null; if (busy) return;
    if (sel && adj(sel, p)) attempt(sel, p);
    else if (sel && sel[0] === p[0] && sel[1] === p[1]) sel = null;
    else sel = p;
    lastAct = now();
  });
  cv.addEventListener('pointercancel', () => { down = null; });
  $('soundbtn').addEventListener('click', () => { soundOn = !soundOn; ls.set('ib-sugar-sound', soundOn); paintButtons(); if (soundOn) sfx('swap'); });
  $('musicbtn').addEventListener('click', () => setMusic(!musicOn));
  $('restartbtn').addEventListener('click', restart);
  $('againbtn').addEventListener('click', restart);
  doc.addEventListener('visibilitychange', () => { if (doc.hidden && ac) ac.suspend().catch(() => { }); else if (!doc.hidden && ac && (soundOn || musicOn)) ac.resume().catch(() => { }); });
  root.addEventListener('pagehide', () => { clearInterval(musicTimer); if (ac) ac.close().catch(() => { }); });
  root.addEventListener('resize', fitCanvas);

  fitCanvas(); paintButtons(); syncAll(); hud(); hintMove = findMove(st.board);
  root.requestAnimationFrame(frame);
  // For screenshots and checks.
  root.SugarRush.ui = { state: () => st, attempt, showEnd, setScore(n) { st.score = n; st.moves = 0; st.over = true; st.won = n >= LEVEL.target; hud(); }, view: () => ({ score: st.score, moves: st.moves, busy, soundOn, musicOn }) };
})(typeof window !== 'undefined' ? window : globalThis);
