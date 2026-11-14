/* 1.9.147 Scrabble-style word game for Info Book. 1.9.214 adds family challenges over the
   internet (each person on their own phone, taking a turn whenever it suits them) and
   multi-select placement: pick several rack tiles, then place them in that order.
   The board of an online game is kept by the family service. Play the computer, or pass
   the phone round, still runs on this phone. No sign-in beyond the Info Book family link,
   and no network apart from the word list and (for a family game) the family service.
   Word list: ENABLE (Enhanced North American Benchmark LEXicon), public domain,
   from https://github.com/dolph/dictionary (enable1.txt), trimmed to 2-15 letters.
   The same file runs as a Web Worker so the computer can think without freezing the board.
   Sounds are a few very soft, low, lowpassed thuds. Shane finds high or sharp sounds painful. */
(function (root) {
  'use strict';
  const N = 15, MID = 7, RACK = 7, BINGO = 50, ALL = (1 << 26) - 1;
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const VALUES = { A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10, '?': 0 };
  const COUNTS = { A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1, '?': 2 };
  const PREMIUM = (function () {
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
  const LM = { DL: 2, TL: 3 }, WM = { DW: 2, TW: 3, ST: 2 };
  const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const idx = (r, c) => r * N + c;
  const inside = (r, c) => r >= 0 && c >= 0 && r < N && c < N;
  const tileVal = t => (t.b ? 0 : VALUES[t.l]);
  const isEmpty = board => { for (let i = 0; i < board.length; i++) if (board[i]) return false; return true; };

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffleArr(a, rand) { rand = rand || Math.random; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* Word list as a compact trie: first-child / next-sibling arrays, about 4 MB for the full list. */
  function buildTrie(text) {
    const words = String(text).split(/\r?\n/).map(w => w.trim().toUpperCase()).filter(w => /^[A-Z]{2,15}$/.test(w));
    for (let i = 1; i < words.length; i++) if (words[i] < words[i - 1]) { words.sort(); break; }
    const cp = (a, b) => { let k = 0; const m = Math.min(a.length, b.length); while (k < m && a.charCodeAt(k) === b.charCodeAt(k)) k++; return k; };
    let count = 1, prev = '';
    for (const w of words) { count += w.length - cp(prev, w); prev = w; }
    const L = new Uint8Array(count), FC = new Int32Array(count), NS = new Int32Array(count), LC = new Int32Array(count), T = new Uint8Array(count);
    const stack = new Int32Array(17);
    let next = 1; prev = '';
    for (const w of words) {
      const k = cp(prev, w);
      let node = stack[k];
      for (let i = k; i < w.length; i++) {
        const id = next++;
        L[id] = w.charCodeAt(i) - 65;
        if (FC[node]) NS[LC[node]] = id; else FC[node] = id;
        LC[node] = id; node = id; stack[i + 1] = id;
      }
      T[node] = 1; prev = w;
    }
    function child(n, x) { for (let c = FC[n]; c; c = NS[c]) { const l = L[c]; if (l === x) return c; if (l > x) return 0; } return 0; }
    function has(w) {
      w = String(w).toUpperCase();
      if (w.length < 2) return false;
      let n = 0;
      for (let i = 0; i < w.length; i++) { const x = w.charCodeAt(i) - 65; if (x < 0 || x > 25) return false; n = child(n, x); if (!n) return false; }
      return T[n] === 1;
    }
    return { L, FC, NS, T, child, has, size: words.length, nodes: count };
  }

  /* Scoring. place = [{r, c, l, b}] new tiles; b = 1 for a blank showing letter l. */
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
  function wordsOf(board, place) {
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
  function quickScore(board, place) {
    let s = 0; for (const w of wordsOf(board, place)) s += w.s;
    return s + (place.length === RACK ? BINGO : 0);
  }
  function bad(err) { return { ok: false, err }; }
  function check(board, place, dict) {
    if (!place || !place.length) return bad('Put some tiles on the board first.');
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
    if (wrong.length) return { ok: false, err: (wrong.length > 1 ? 'Not in the word list: ' : 'Not in the word list: ') + wrong.join(', '), bad: wrong, words };
    const bingo = place.length === RACK;
    const score = list.reduce((a, x) => a + x.s, 0) + (bingo ? BINGO : 0);
    return { ok: true, score, bingo, words };
  }

  /* Computer moves: anchor-based generator (Appel and Jacobson) with cross-checks, across then down. */
  function transpose(b) { const t = new Array(N * N); for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) t[c * N + r] = b[r * N + c]; return t; }
  function genMoves(board, rack, trie, cap) {
    cap = cap || 60000;
    const counts = new Int8Array(27);
    for (const l of rack) counts[l === '?' ? 26 : l.charCodeAt(0) - 65]++;
    const first = isEmpty(board), out = [];
    const L = trie.L, FC = trie.FC, NS = trie.NS, T = trie.T, child = trie.child;
    for (let pass = 0; pass < 2 && out.length < cap; pass++) {
      if (first && pass === 1) break; // on an empty board the down moves mirror the across ones
      const b = pass === 0 ? board : transpose(board);
      const mask = new Int32Array(N * N), anchor = new Uint8Array(N * N);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const i = r * N + c;
        if (b[i]) continue;
        let up = '', dn = '';
        for (let k = r - 1; k >= 0 && b[k * N + c]; k--) up = b[k * N + c].l + up;
        for (let k = r + 1; k < N && b[k * N + c]; k++) dn += b[k * N + c].l;
        if (!up && !dn) mask[i] = ALL;
        else { let m = 0; for (let x = 0; x < 26; x++) if (trie.has(up + ABC[x] + dn)) m |= 1 << x; mask[i] = m; }
        anchor[i] = first ? (r === MID && c === MID ? 1 : 0) : ((r > 0 && b[i - N]) || (r < N - 1 && b[i + N]) || (c > 0 && b[i - 1]) || (c < N - 1 && b[i + 1])) ? 1 : 0;
      }
      for (let r = 0; r < N; r++) {
        const row = r * N;
        for (let a = 0; a < N; a++) {
          if (!anchor[row + a]) continue;
          const placed = [], lt = [];
          const record = () => {
            if (out.length >= cap) return;
            const place = placed.map(p => (pass === 0 ? { r, c: p.c, l: ABC[p.x], b: p.b } : { r: p.c, c: r, l: ABC[p.x], b: p.b }));
            out.push({ place, score: quickScore(board, place) });
          };
          const extend = (node, c) => {
            if (c >= N || !b[row + c]) {
              if (c > a && T[node]) record();
              if (c >= N) return;
              const m = mask[row + c];
              if (!m) return;
              for (let ch = FC[node]; ch; ch = NS[ch]) {
                const x = L[ch];
                if (!((m >> x) & 1)) continue;
                if (counts[x]) { counts[x]--; placed.push({ c, x, b: 0 }); extend(ch, c + 1); placed.pop(); counts[x]++; }
                else if (counts[26]) { counts[26]--; placed.push({ c, x, b: 1 }); extend(ch, c + 1); placed.pop(); counts[26]++; }
              }
            } else {
              const ch = child(node, b[row + c].l.charCodeAt(0) - 65);
              if (ch) extend(ch, c + 1);
            }
          };
          if (a > 0 && b[row + a - 1]) {
            let s = a - 1;
            while (s > 0 && b[row + s - 1]) s--;
            let node = 0;
            for (let k = s; k < a; k++) { node = child(node, b[row + k].l.charCodeAt(0) - 65); if (!node) break; }
            if (node) extend(node, a);
          } else {
            let limit = 0;
            for (let k = a - 1; k >= 0 && !b[row + k] && !anchor[row + k]; k--) limit++;
            const leftPart = (node, lim) => {
              placed.length = 0;
              for (let i = 0; i < lt.length; i++) placed.push({ c: a - lt.length + i, x: lt[i].x, b: lt[i].b });
              extend(node, a);
              if (lim <= 0) return;
              for (let ch = FC[node]; ch; ch = NS[ch]) {
                const x = L[ch];
                if (counts[x]) { counts[x]--; lt.push({ x, b: 0 }); leftPart(ch, lim - 1); lt.pop(); counts[x]++; }
                else if (counts[26]) { counts[26]--; lt.push({ x, b: 1 }); leftPart(ch, lim - 1); lt.pop(); counts[26]++; }
              }
            };
            leftPart(0, limit);
          }
        }
      }
    }
    return out;
  }
  function leaveValue(left) {
    let v = 0, vow = 0;
    const seen = {};
    for (const l of left) {
      if (l === '?') v += 7; else if (l === 'S') v += 3; else if ('AEILNORST'.includes(l)) v += 0.5; else if ('QVJXZKW'.includes(l)) v -= 1.5;
      if ('AEIOU'.includes(l)) vow++;
      seen[l] = (seen[l] || 0) + 1; if (seen[l] > 1) v -= 2;
    }
    if (left.includes('Q') && !left.includes('U')) v -= 5;
    v -= Math.abs(vow - (left.length - vow)) * 0.7;
    return v;
  }
  function rackAfter(rack, place) { const left = rack.slice(); for (const p of place) { const k = left.indexOf(p.b ? '?' : p.l); if (k >= 0) left.splice(k, 1); } return left; }
  function pickMove(moves, rack, level, rand) {
    if (!moves.length) return null;
    rand = rand || Math.random;
    if (level === 'clever') {
      let best = null, bv = -1e9;
      for (const m of moves) { const v = m.score + leaveValue(rackAfter(rack, m.place)); if (v > bv) { bv = v; best = m; } }
      return best;
    }
    // Gentle: a decent but not best word, so the family can win.
    const sorted = moves.slice().sort((x, y) => y.score - x.score);
    const lo = Math.floor(sorted.length * 0.15), hi = Math.max(lo + 1, Math.floor(sorted.length * 0.45));
    return sorted[Math.min(sorted.length - 1, lo + Math.floor(rand() * (hi - lo)))];
  }

  /* Game state. */
  function makeBag(rand) { const bag = []; for (const k in COUNTS) for (let i = 0; i < COUNTS[k]; i++) bag.push(k); return shuffleArr(bag, rand); }
  function drawTiles(bag, rack) { while (rack.length < RACK && bag.length) rack.push(bag.pop()); }
  function newGame(opts) {
    opts = opts || {};
    const bag = makeBag(opts.rand);
    const players = (opts.players || [{ name: 'You' }, { name: 'Computer', cpu: true }]).map(p => ({ name: String(p.name || 'Player').slice(0, 16), cpu: !!p.cpu, score: 0, rack: [] }));
    for (const p of players) drawTiles(bag, p.rack);
    return { v: 1, mode: opts.mode || 'cpu', level: opts.level || 'gentle', board: new Array(N * N).fill(null), bag, players, turn: 0, scoreless: 0, over: false, last: null, moves: 0 };
  }
  const rackPoints = rack => rack.reduce((a, l) => a + VALUES[l], 0);
  function finish(st, outIdx) {
    let bonus = 0;
    st.players.forEach((p, i) => { const v = rackPoints(p.rack); p.left = v; if (i !== outIdx) { p.score -= v; bonus += v; } });
    if (outIdx >= 0) st.players[outIdx].score += bonus;
    st.out = outIdx; st.over = true;
    const top = Math.max.apply(null, st.players.map(p => p.score));
    st.winners = st.players.map((p, i) => (p.score === top ? i : -1)).filter(i => i >= 0);
  }
  function nextTurn(st) { if (st.scoreless >= 6) finish(st, -1); else st.turn = (st.turn + 1) % st.players.length; }
  function play(st, place, dict) {
    if (st.over) return bad('The game is over.');
    const res = check(st.board, place, dict);
    if (!res.ok) return res;
    const p = st.players[st.turn];
    const rack = p.rack.slice();
    for (const t of place) { const k = rack.indexOf(t.b ? '?' : t.l); if (k < 0) return bad('Those tiles are not in the rack.'); rack.splice(k, 1); }
    for (const t of place) st.board[idx(t.r, t.c)] = { l: t.l, b: t.b ? 1 : 0 };
    p.rack = rack; drawTiles(st.bag, p.rack);
    p.score += res.score; st.scoreless = 0; st.moves++;
    st.last = { who: st.turn, kind: 'play', score: res.score, words: res.words, cells: place.map(t => idx(t.r, t.c)), bingo: res.bingo };
    if (!p.rack.length && !st.bag.length) finish(st, st.turn); else nextTurn(st);
    return res;
  }
  function swap(st, letters, rand) {
    if (st.over) return bad('The game is over.');
    if (st.bag.length < RACK) return bad('Swapping needs at least 7 tiles in the bag.');
    if (!letters || !letters.length) return bad('Choose the tiles to swap.');
    const p = st.players[st.turn], rack = p.rack.slice();
    for (const l of letters) { const k = rack.indexOf(l); if (k < 0) return bad('Those tiles are not in the rack.'); rack.splice(k, 1); }
    drawTiles(st.bag, rack);
    st.bag.push.apply(st.bag, letters); shuffleArr(st.bag, rand);
    p.rack = rack; st.scoreless++; st.moves++;
    st.last = { who: st.turn, kind: 'swap', n: letters.length };
    nextTurn(st);
    return { ok: true };
  }
  function pass(st) {
    if (st.over) return bad('The game is over.');
    st.scoreless++; st.moves++;
    st.last = { who: st.turn, kind: 'pass' };
    nextTurn(st);
    return { ok: true };
  }
  function cpuChoose(st, trie, rand) {
    const p = st.players[st.turn];
    const moves = genMoves(st.board, p.rack, trie);
    return { move: pickMove(moves, p.rack, st.level, rand), n: moves.length };
  }
  function applyCpu(st, move, dict, rand) {
    if (move) { const r = play(st, move.place, dict); if (r.ok) return r; }
    if (st.bag.length >= RACK) return swap(st, st.players[st.turn].rack.slice(), rand);
    return pass(st);
  }
  function lastText(st) {
    const L = st.last; if (!L) return '';
    const name = st.players[L.who].name;
    if (L.kind === 'swap') return `${name} swapped ${L.n} tile${L.n === 1 ? '' : 's'}.`;
    if (L.kind === 'pass') return `${name} passed.`;
    if (L.kind === 'resign') return `${name} resigned.`;
    const more = L.words.length > 1 ? ` and ${L.words.slice(1).map(w => w.w).join(', ')}` : '';
    return `${name} played ${L.words[0].w}${more} for ${L.score}${L.bingo ? ', with the 50-point bonus for all 7 tiles' : ''}.`;
  }

  /* Empty squares along a line, skipping tiles already on the board or already pending. */
  function layoutRun(board, pendingIdx, startR, startC, dir, n) {
    const dr = dir === 'down' ? 1 : 0, dc = dir === 'across' ? 1 : 0;
    const taken = new Set(pendingIdx || []);
    const out = [];
    let r = startR, c = startC;
    while (out.length < n && inside(r, c)) {
      const i = idx(r, c);
      if (!board[i] && !taken.has(i)) { out.push({ r, c }); taken.add(i); }
      r += dr; c += dc;
    }
    return out;
  }
  root.Scrabble = { N, MID, RACK, BINGO, VALUES, COUNTS, PREMIUM, ABC, rng, buildTrie, check, wordsOf, quickScore, genMoves, pickMove, leaveValue, newGame, makeBag, play, swap, pass, finish, cpuChoose, applyCpu, lastText, rackPoints, transpose, idx, layoutRun };

  /* Worker mode: build the trie once, then answer move requests. */
  if (typeof importScripts === 'function' && typeof root.document === 'undefined') {
    let trie = null;
    root.onmessage = e => {
      const m = e.data || {};
      if (m.dict) { trie = buildTrie(m.dict); root.postMessage({ ready: true }); return; }
      if (m.ask) {
        const t0 = Date.now();
        let move = null, n = 0;
        try { if (trie) { const moves = genMoves(m.board, m.rack, trie); n = moves.length; move = pickMove(moves, m.rack, m.level); } } catch (err) { move = null; }
        root.postMessage({ id: m.id, move, n, ms: Date.now() - t0 });
      }
    };
    return;
  }
  if (!root.document) return;

  /* ---------- Page ---------- */
  const d = root.document;
  const $ = s => d.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'scrabble-game', SKEY = 'scrabble-sound', NKEY = 'scrabble-names';
  const LABEL = { TW: 'triple word', DW: 'double word', TL: 'triple letter', DL: 'double letter', ST: 'centre star, double word' };
  const store = {
    get(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { root.localStorage.setItem(k, v); } catch (e) { } }
  };
  let dict = null, worker = null, workerReady = false, st = null, pending = [], selected = [], placeDir = 'one', layoutRest = null, swapPick = null, zoom = false, busy = false, askId = 0, revealed = false, demo = false, demoMember = null;
  let soundOn = store.get(SKEY) !== 'off', armed = '', armTimer = 0;
  let reduced = false;
  try { reduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { }

  // Very soft low thuds only: sine, below 200 Hz, through a 500 Hz lowpass.
  let ac = null, outGain = null;
  function audio() {
    if (!soundOn) return null;
    try {
      if (!ac) {
        const C = root.AudioContext || root.webkitAudioContext; if (!C) return null;
        ac = new C();
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 0.3;
        outGain = ac.createGain(); outGain.gain.value = 0.3;
        outGain.connect(lp); lp.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  function thud(f, when, dur) {
    const a = audio(); if (!a) return;
    dur = dur || 0.25;
    const t = a.currentTime + (when || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.45, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(outGain); o.start(t); o.stop(t + dur + 0.05);
  }
  const sndPlace = () => thud(147, 0, 0.2);
  const sndWord = () => { thud(131, 0, 0.35); thud(165, 0.14, 0.45); };
  const sndNo = () => thud(98, 0, 0.3);

  // 1.9.207 Family games. The phone that has the Info Book family link (mf.member) can start
  // a game with people from the family list. Turns are taken whenever it suits each person.
  function offlineMsg() { return 'No internet just now. You can still play the computer or pass the phone, and your online games will be here when you’re back online.'; }
  const API = 'https://shane-my-feed-data.phoneapp12.workers.dev/api';
  let onlineId = '', pollTimer = 0, famList = null, famPeople = null;
  function member() {
    if (demoMember) return demoMember;
    try { const m = JSON.parse(store.get('mf.member') || 'null'); return m && m.id && m.tok && !m.pending ? m : null; } catch (e) { return null; }
  }
  function api(path, opt) {
    const me = member();
    if (!me) return Promise.reject(new Error('This phone needs its Info Book family link.'));
    const ctl = root.AbortController ? new AbortController() : null;
    const tm = ctl && setTimeout(() => ctl.abort(), 12000);
    return fetch(API + path, {
      method: (opt && opt.method) || 'GET', signal: ctl && ctl.signal,
      headers: { Authorization: 'Bearer ' + me.tok, ...(opt && opt.body ? { 'Content-Type': 'application/json' } : {}) },
      body: opt && opt.body
    }).then(r => r.json().catch(() => ({})).then(j => {
      if (tm) clearTimeout(tm);
      if (!r.ok) {
        const msg = j && j.err;
        const e = new Error(!msg || msg === 'unknown' ? 'Family Scrabble isn’t on the service yet. It starts when Shane says go live.' : msg);
        e.status = r.status; throw e;
      }
      return j;
    }), () => { if (tm) clearTimeout(tm); return Promise.reject(new Error('No internet just now. Try again.')); });
  }
  function applyView(v) {
    onlineId = v.id;
    st = {
      v: 1, mode: 'family', rev: v.rev, id: v.id, over: !!v.over, turnIsMe: !!v.yourTurn, scored: 1,
      board: (v.board || []).map(c => c ? { l: c.l, b: c.b ? 1 : 0 } : null),
      bag: new Array(v.bag | 0),
      players: (v.players || []).map(p => ({ name: p.name, score: p.score, rack: p.me ? (v.rack || []).slice() : [], me: !!p.me, left: p.left })),
      turn: v.turn | 0, scoreless: v.scoreless || 0, winners: v.winners || [], out: v.out, last: v.last || null
    };
  }
  function turnBanner() {
    const el = $('#yourturn'); if (!el) return;
    if (!st || st.mode !== 'family' || st.over) { el.hidden = true; return; }
    el.hidden = false;
    if (st.turnIsMe) { el.textContent = 'Your turn'; el.classList.remove('wait'); }
    else { const p = st.players[st.turn]; el.textContent = 'Waiting for ' + (p ? p.name : 'the next person'); el.classList.add('wait'); }
  }
  function showFamilyAlert() {
    const el = $('#famalert'); if (!el) return;
    const n = famList && famList.yourTurn || 0;
    const playingMine = st && st.mode === 'family' && st.turnIsMe && !st.over;
    const onSetup = $('#setup') && !$('#setup').hidden;
    if (!n || playingMine || onSetup) { el.hidden = true; return; }
    const g = (famList.games || []).find(x => x.yourTurn);
    el.hidden = false;
    el.textContent = n > 1 ? 'Your turn · ' + n + ' games' : 'Your turn';
    el.dataset.gid = g ? g.id : '';
  }
  function pollOnline() {
    clearInterval(pollTimer); pollTimer = 0;
    if (!st || st.mode !== 'family' || st.over) return;
    pollTimer = setInterval(() => {
      if (root.document.hidden || pending.length || selected.length || swapPick || busy || !onlineId) return;
      api('/scrabble/' + onlineId).then(v => {
        if (!st || st.mode !== 'family' || v.rev === st.rev || pending.length || selected.length || swapPick) return;
        openOnline(v);
      }).catch(() => {});
    }, st.turnIsMe ? 20000 : 8000);
  }
  function openOnline(v) {
    applyView(v);
    pending = []; selected = []; layoutRest = null; swapPick = null; armed = ''; revealed = true; busy = false;
    overlay('#over', false); overlay('#cover', false);
    show('#game'); render();
    if (st.over) showOver();
    pollOnline(); showFamilyAlert();
  }
  function openFamilyGame(id) {
    if (!id) return;
    busy = true; say('Opening the game…');
    api('/scrabble/' + id).then(v => { busy = false; openOnline(v); }).catch(e => {
      busy = false; say(e.message, true); if (!st) openSetup();
    });
  }
  function onOnlineErr(e) {
    busy = false;
    if (e && (e.status === 409 || e.status === 403)) {
      pending = []; selected = []; layoutRest = null; swapPick = null;
      say(e.message || 'The board has changed.', true);
      if (onlineId) api('/scrabble/' + onlineId).then(openOnline).catch(() => render());
      else render();
      return;
    }
    say((e && e.message) || 'Something went wrong.', true); sndNo(); render();
  }
  function sendOnline(kind, extra) {
    busy = true; render();
    api('/scrabble/' + onlineId + '/' + kind, { method: 'POST', body: JSON.stringify(Object.assign({ rev: st.rev }, extra || {})) })
      .then(v => { busy = false; if (kind === 'play') sndWord(); else sndPlace(); openOnline(v); })
      .catch(onOnlineErr);
  }
  function peekFamily() {
    if (!member() || demo) return;
    api('/scrabble').then(list => { famList = list; showFamilyAlert(); if (setupMode === 'family') paintFamily(); }).catch(() => { if (setupMode === 'family') { const status = $('#famstatus'); status.classList.add('offline'); status.textContent = offlineMsg(); } });
  }
  function paintFamily() {
    const status = $('#famstatus'), people = $('#fampeople'), games = $('#famgames'), banner = $('#setupturn'), start = $('#startbtn');
    const me = member();
    if (start) start.hidden = setupMode === 'family';
    if (!me) {
      status.textContent = 'Challenging a family member needs this phone’s Info Book family link. Open Info Book from your invite, then come back.';
      people.innerHTML = ''; games.innerHTML = ''; banner.hidden = true; return;
    }
    const list = famPeople || [];
    const others = list.filter(p => p.id !== me.id);
    people.innerHTML = others.map(p => '<button type="button" class="challenge" data-mid="' + esc(p.id) + '">Challenge ' + esc(p.name) + '</button>').join('');
    const gs = (famList && famList.games) || [];
    const waiting = gs.filter(g => g.yourTurn && !g.over);
    banner.hidden = !waiting.length;
    if (waiting.length) banner.textContent = waiting.length > 1 ? 'Your turn · ' + waiting.length + ' games' : 'Your turn';
    games.innerHTML = gs.length ? gs.map(g => {
      const who = (g.players || []).map(p => (p.me ? 'You' : p.name) + ' ' + p.score).join(' · ');
      const turn = g.over ? 'Finished' : g.yourTurn ? 'Your turn' : 'Waiting for ' + (g.turnName || 'the next person');
      const last = g.last ? '<small>' + esc(g.last) + '</small>' : '';
      return '<button type="button" class="' + (g.yourTurn && !g.over ? 'your' : '') + '" data-gid="' + esc(g.id) + '"><b>' + esc(turn) + '</b> · ' + esc(who) + last + '</button>';
    }).join('') : '<p class="help">No online games yet.</p>';
    status.classList.toggle('offline', false);
    status.textContent = others.length ? 'Tap a family member to challenge them over the internet. Each of you plays on your own phone, whenever it suits you.' : 'It’s just you on the family list so far. Ask Shane to add someone in Info Book, then open Scrabble again.';
  }
  function loadFamily(force) {
    const me = member();
    if (!me) { famPeople = null; paintFamily(); return; }
    if (famPeople && famList && !force) { paintFamily(); return; }
    $('#famstatus').textContent = 'Loading the family…';
    if (demo) { paintFamily(); showFamilyAlert(); return; }
    Promise.all([api('/people'), api('/scrabble')]).then(([people, list]) => {
      famPeople = Array.isArray(people) ? people : [];
      famList = list;
      paintFamily(); showFamilyAlert();
    }).catch(e => {
      const status = $('#famstatus');
      status.classList.add('offline');
      status.textContent = /internet|offline|network|fetch|abort/i.test(e.message || '') || (typeof navigator !== 'undefined' && navigator.onLine === false) ? offlineMsg() : (e.message || offlineMsg());
    });
  }
  function startFamily() {
    const me = member();
    if (!me) { $('#famstatus').textContent = 'This phone needs its Info Book family link.'; return; }
    const ids = [...d.querySelectorAll('#fampeople button.on')].map(b => b.dataset.mid).filter(Boolean);
    if (ids.filter(id => id !== me.id).length < 1) { $('#famstatus').textContent = 'Tap a family member to challenge them.'; return; }
    challengePerson(ids.find(id => id !== me.id));
  }
  function challengePerson(id) {
    const me = member();
    if (!me || !id) return;
    if (demo) { say('This is a demo, so no real challenge is sent.'); return; }
    const status = $('#famstatus');
    status.textContent = 'Starting the game…';
    api('/scrabble', { method: 'POST', body: JSON.stringify({ player: id }) }).then(v => {
      famList = null; openOnline(v);
    }).catch(e => {
      status.classList.toggle('offline', /internet|offline|network|fetch|abort/i.test(e.message || ''));
      status.textContent = e.message || offlineMsg();
    });
  }
  function takeOpenId() {
    let id = '';
    try { id = root.sessionStorage.getItem('scrabble-open') || ''; root.sessionStorage.removeItem('scrabble-open'); } catch (e) { }
    if (!/^g[0-9a-f]{16}$/.test(id)) { const h = String(root.location.hash || '').replace(/^#/, ''); id = /^g[0-9a-f]{16}$/.test(h) ? h : ''; }
    return id;
  }

  function save() { if (demo || !st || st.mode === 'family') return; store.set(KEY, JSON.stringify({ st, pending })); }
  function loadSaved() { try { const o = JSON.parse(store.get(KEY) || 'null'); if (o && o.st && o.st.v === 1 && Array.isArray(o.st.board)) return o; } catch (e) { } return null; }

  function onWorker(e) {
    const m = e.data || {};
    if (m.ready) { workerReady = true; return; }
    if (m.id === askId && waiting) { const w = waiting; waiting = null; w(m.move, m.ms); }
  }
  let waiting = null;
  function loadDict() {
    return fetch('scrabble-words.txt').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(text => {
      dict = buildTrie(text);
      try {
        worker = new Worker('scrabble.js');
        worker.onmessage = onWorker;
        worker.onerror = () => { worker = null; if (waiting) { const w = waiting; waiting = null; localThink(w); } };
        worker.postMessage({ dict: text });
      } catch (e) { worker = null; }
    });
  }
  function localThink(done) {
    setTimeout(() => { const t0 = Date.now(); const r = cpuChoose(st, dict); done(r.move, Date.now() - t0); }, 30);
  }
  function think(done) {
    if (worker) {
      const id = ++askId; waiting = done;
      const p = st.players[st.turn];
      worker.postMessage({ ask: 1, id, board: st.board, rack: p.rack, level: st.level });
      setTimeout(() => { if (waiting === done && askId === id) { waiting = null; localThink(done); } }, workerReady ? 12000 : 20000);
    } else localThink(done);
  }

  function show(id) { ['#loading', '#setup', '#game'].forEach(s => { $(s).hidden = s !== id; }); }
  function overlay(id, on) { $(id).hidden = !on; }
  function humanIdx() { if (st.mode === 'cpu') return st.players.findIndex(p => !p.cpu); return st.turn; }
  function myRack() {
    if (st && st.mode === 'family') { const p = st.players.find(x => x.me); return p ? p.rack : []; }
    return st.players[humanIdx()].rack;
  }
  function canAct() {
    if (!st || st.over || busy) return false;
    if (st.mode === 'family') return !!st.turnIsMe;
    return !st.players[st.turn].cpu && (st.mode === 'cpu' || revealed);
  }
  function used(k) { return pending.some(p => p.k === k); }
  function say(t, warn) { const m = $('#msg'); m.textContent = t || ''; m.classList.toggle('warn', !!warn); if (warn && !reduced) { m.classList.remove('nudge'); void m.offsetWidth; m.classList.add('nudge'); } }
  function arm(name, btn, text) {
    if (armed === name) { armed = ''; clearTimeout(armTimer); return true; }
    armed = name; clearTimeout(armTimer);
    armTimer = setTimeout(() => { armed = ''; drawButtons(); }, 4000);
    say(text); drawButtons();
    return false;
  }

  function drawScores() {
    $('#scores').innerHTML = st.players.map((p, i) => `<div class="pl${i === st.turn && !st.over ? ' on' : ''}"><span>${p.cpu ? '🤖 ' : ''}${esc(p.name)}</span><strong>${p.score}</strong></div>`).join('');
    $('#bagn').textContent = st.bag.length;
  }
  function drawBoard() {
    const pm = new Map(pending.map(p => [idx(p.r, p.c), p]));
    const last = new Set(st.last && st.last.kind === 'play' ? st.last.cells : []);
    let h = '';
    for (let i = 0; i < N * N; i++) {
      const np = pm.get(i), t = st.board[i] || np, pr = PREMIUM[i];
      if (t) h += `<button type="button" class="sq has${np ? ' new' : ''}${!np && last.has(i) ? ' last' : ''}" data-i="${i}" aria-label="${t.l}${t.b ? ' blank' : ''}${np ? ', tap to take back' : ''}"><span class="t${t.b ? ' bl' : ''}">${t.l}<i>${t.b ? '' : VALUES[t.l]}</i></span></button>`;
      else h += `<button type="button" class="sq p-${pr || 'n'}" data-i="${i}" aria-label="${pr ? LABEL[pr] : 'empty'} square">${pr === 'ST' ? '★' : pr}</button>`;
    }
    $('#board').innerHTML = h;
  }
  function drawRack() {
    const el = $('#rack');
    if (st.mode === 'pass' && !revealed && !st.over) { el.innerHTML = '<p class="hidden">Tiles are hidden until the next player taps Show.</p>'; return; }
    const rack = myRack();
    el.innerHTML = rack.map((l, k) => {
      if (used(k)) return '<span class="slot"></span>';
      const n = selected.indexOf(k);
      const on = swapPick ? swapPick.has(k) : n >= 0;
      const ord = !swapPick && n >= 0 ? `<span class="ord">${n + 1}</span>` : '';
      return `<button type="button" class="rt${on ? ' sel' : ''}${l === '?' ? ' bl' : ''}" data-k="${k}" aria-pressed="${on}" aria-label="${l === '?' ? 'blank tile' : l + ', ' + VALUES[l] + ' points'}${n >= 0 ? ', letter ' + (n + 1) : ''}">${ord}${l === '?' ? '' : l}<i>${l === '?' ? '' : VALUES[l]}</i></button>`;
    }).join('') + '<span class="slot"></span>'.repeat(Math.max(0, RACK - rack.length));
  }
  let preview = null;
  function drawButtons() {
    const act = canAct();
    const pb = $('#playbtn');
    preview = pending.length && dict ? check(st.board, pending, dict) : null;
    if (swapPick) { pb.textContent = `Swap ${swapPick.size} tile${swapPick.size === 1 ? '' : 's'}`; pb.disabled = !act || !swapPick.size; pb.classList.toggle('ready', !!swapPick.size); }
    else { pb.textContent = preview && preview.ok ? `Play · ${preview.score}` : 'Play'; pb.disabled = !act || !pending.length; pb.classList.toggle('ready', !!(preview && preview.ok)); }
    $('#recallbtn').textContent = swapPick ? 'Cancel' : 'Clear';
    $('#recallbtn').disabled = !act || (!pending.length && !swapPick && !selected.length);
    $('#shufbtn').disabled = !act || !!swapPick;
    $('#swapbtn').disabled = !act || !!swapPick || st.bag.length < RACK;
    $('#passbtn').textContent = armed === 'pass' ? 'Pass?' : 'Pass';
    $('#passbtn').disabled = !act || !!swapPick;
    const rb = $('#resignbtn');
    if (rb) { rb.classList.toggle('show', st.mode === 'family'); rb.textContent = armed === 'resign' ? 'Resign?' : 'Resign'; rb.disabled = !act || !!swapPick; }
    const ds = $('#dirseg');
    if (ds) {
      ds.hidden = !act || !!swapPick || !selected.length;
      ds.querySelectorAll('[data-dir]').forEach(b => b.classList.toggle('on', b.dataset.dir === placeDir));
    }
    $('#newbtn').textContent = st.mode === 'family' ? 'Games' : (armed === 'new' ? 'New game?' : 'New game');
    $('#soundbtn').textContent = soundOn ? 'Sound on' : 'Sound off';
    $('#zoombtn').textContent = zoom ? 'Smaller' : 'Bigger';
  }
  function hint() {
    if (!st) return;
    if (st.mode === 'family' && !st.over && !busy && !pending.length && !selected.length && !swapPick) {
      const lt = lastText(st);
      say((lt ? lt + ' ' : '') + (st.turnIsMe ? 'Your turn.' : 'Waiting for ' + st.players[st.turn].name + '.'));
      return;
    }
    if (st.over) { say('Game over. ' + lastText(st)); return; }
    if (busy) { say(st.players[st.turn].name + ' is thinking…'); return; }
    if (swapPick) { say('Tap the tiles you want to swap, then tap Swap. You miss this turn.'); return; }
    if (pending.length && preview) {
      if (preview.ok) say(preview.words.map(w => `${w.w} ${w.s}`).join(' · ') + (preview.bingo ? ' · +50 for all 7 tiles' : ''));
      else say(preview.err, true);
      return;
    }
    const lt = lastText(st);
    const first = isEmpty(st.board);
    if (selected.length && !pending.length) {
      say(placeDir === 'one' || selected.length === 1
        ? 'Tap squares to place your letters in order' + (selected.length > 1 ? ' (1 is first).' : '.')
        : 'Tap the first square and your letters will be laid out ' + (placeDir === 'down' ? 'down.' : 'across.'));
      return;
    }
    if (first) say('Tap the tiles you want, in order, then tap squares to place them. The first word must cover the ★.');
    else say((lt ? lt + ' ' : '') + (st.mode === 'cpu' ? 'Your turn.' : st.players[st.turn].name + '’s turn.'));
  }
  function render() { if (!st) return; drawScores(); drawBoard(); drawRack(); drawButtons(); turnBanner(); hint(); showFamilyAlert(); }

  function zoomTo() {
    const wrap = $('#boardwrap');
    if (!zoom) { wrap.scrollLeft = 0; wrap.scrollTop = 0; return; }
    const cells = pending.length ? pending.map(p => idx(p.r, p.c)) : (st.last && st.last.cells) || [idx(MID, MID)];
    const r = cells.reduce((a, i) => a + Math.floor(i / N), 0) / cells.length, c = cells.reduce((a, i) => a + i % N, 0) / cells.length;
    const b = $('#board');
    wrap.scrollLeft = Math.max(0, (c + 0.5) / N * b.offsetWidth - wrap.clientWidth / 2);
    wrap.scrollTop = Math.max(0, (r + 0.5) / N * b.offsetHeight - wrap.clientHeight / 2);
  }

  function afterTurn() {
    pending = []; selected = []; layoutRest = null; swapPick = null; armed = ''; revealed = false;
    save(); render();
    if (st.over) { showOver(); return; }
    if (st.players[st.turn].cpu) { cpuGo(); return; }
    if (st.mode === 'pass') showCover();
    else revealed = true;
  }
  function cpuGo() {
    busy = true; render();
    const t0 = Date.now();
    think((move, ms) => {
      const wait = Math.max(0, 700 - (Date.now() - t0));
      if (ms != null) root.Scrabble.lastMs = ms; // time the computer took, for checking on a phone
      setTimeout(() => {
        busy = false;
        const r = applyCpu(st, move, dict);
        if (st.last && st.last.kind === 'play') sndWord();
        afterTurn();
        if (zoom) zoomTo();
        return r;
      }, wait);
    });
  }
  function showCover() {
    const p = st.players[st.turn];
    $('#covername').textContent = p.name;
    $('#coverlast').textContent = lastText(st) || 'First turn of the game.';
    $('#coverbtn').textContent = `I’m ${p.name}. Show my tiles`;
    overlay('#cover', true);
    $('#coverbtn').focus();
  }
  function showOver() {
    const rows = st.players.map((p, i) => ({ p, i })).sort((a, b) => b.p.score - a.p.score);
    const win = st.winners.map(i => st.players[i].name);
    $('#overtitle').textContent = win.length > 1 ? 'A tie: ' + win.join(' and ') : (st.players[st.winners[0]].cpu ? 'The computer wins' : win[0] + ' wins!');
    $('#overnew').textContent = st.mode === 'family' ? 'Back to games' : 'New game';
    $('#overlist').innerHTML = rows.map(x => `<li><span>${esc(x.p.name)}</span><strong>${x.p.score}</strong><small>${x.i === st.out ? 'used all tiles, +' + st.players.reduce((a, q, j) => a + (j === st.out ? 0 : q.left), 0) : (x.p.left ? '−' + x.p.left + ' left in rack' : '')}</small></li>`).join('');
    overlay('#over', true);
    overScores();
  }
  // 1.9.149 family scoreboard (scores.js). Against the computer the score is the phone owner's. Passing the phone, only the
  // phone owner is known to the family service, so only the player whose name matches theirs goes on the family board;
  // everyone's scores are still kept on this phone.
  function ownerIdx() {
    const S = root.IBScores, me = S && S.who(); if (!me || !me.first) return -1;
    if (st.mode === 'cpu') return st.players.findIndex(p => !p.cpu);
    const f = me.first.toLowerCase(), hit = st.players.map((p, i) => (!p.cpu && String(p.name).trim().split(/\s+/)[0].toLowerCase() === f ? i : -1)).filter(i => i >= 0);
    return hit.length === 1 ? hit[0] : -1;
  }
  function overScores() {
    const S = root.IBScores, box = $('#overscores'); if (!S || !box || demo) return;
    if (st.mode === 'family') { box.hidden = false; S.fill(box, 'scrabble', { note: 'This game is on the family scoreboard.' }); return; }
    const opp = st.mode === 'cpu' ? 'computer' : 'family', oi = ownerIdx(), me = S.who();
    const label = opp === 'computer' ? 'v 🤖' : 'pass the phone';
    let sent = null;
    if (!st.scored) { // once per game, even if the finished game is opened again
      st.scored = 1;
      st.players.forEach((p, i) => { if (!p.cpu && i !== oi) S.submit('scrabble', { score: p.score }, { name: p.name, note: label, localOnly: true }).then(() => { }, () => { }); }); // kept on this phone only (no family link for them)
      const p = oi >= 0 ? st.players[oi] : null;
      if (p) sent = S.submit('scrabble', { score: Math.max(0, Math.min(1500, p.score)), won: st.winners.length === 1 && st.winners[0] === oi, opponent: opp }, { name: p.name, note: label });
      save();
    }
    const note = st.mode === 'pass' && me ? (oi >= 0 ? `Pass-the-phone games count for ${st.players[oi].name}, this phone’s owner. Everyone’s scores are kept on this phone.` : `Pass-the-phone scores go on the family board when one player is named ${me.first}, this phone’s owner.`) : '';
    box.hidden = false;
    S.fill(box, 'scrabble', { sent, note });
  }

  function placeOne(r, c, k) {
    if (used(k) || !inside(r, c) || st.board[idx(r, c)] || pending.some(p => p.r === r && p.c === c)) return 'skip';
    const l = myRack()[k];
    if (l === '?') { askBlank(r, c, k); return 'blank'; }
    pending.push({ r, c, l, b: 0, k });
    selected = selected.filter(x => x !== k);
    sndPlace();
    return 'ok';
  }
  function placeRun(r, c) {
    const cells = layoutRun(st.board, pending.map(p => idx(p.r, p.c)), r, c, placeDir, selected.length);
    if (!cells.length) { say('There’s no room to lay those letters from there.', true); return; }
    const ks = selected.slice();
    for (let i = 0; i < cells.length && i < ks.length; i++) {
      const res = placeOne(cells[i].r, cells[i].c, ks[i]);
      if (res === 'blank') {
        layoutRest = { dir: placeDir, next: i + 1, cells, ks };
        return;
      }
    }
  }
  function continueRun() {
    const rest = layoutRest; layoutRest = null;
    if (!rest) return;
    for (let i = rest.next; i < rest.cells.length && i < rest.ks.length; i++) {
      const res = placeOne(rest.cells[i].r, rest.cells[i].c, rest.ks[i]);
      if (res === 'blank') { layoutRest = { dir: rest.dir, next: i + 1, cells: rest.cells, ks: rest.ks }; return; }
    }
  }
  // Board taps
  function onBoard(e) {
    const btn = e.target.closest('.sq'); if (!btn || !canAct() || swapPick) return;
    const i = +btn.dataset.i, r = Math.floor(i / N), c = i % N;
    const pi = pending.findIndex(p => idx(p.r, p.c) === i);
    if (pi >= 0) {
      const back = pending.splice(pi, 1)[0];
      if (back && !selected.includes(back.k)) selected.unshift(back.k);
      layoutRest = null;
      if (back) sndPlace(); render(); save(); return;
    }
    if (st.board[i]) return;
    if (!selected.length) { say('Tap the tiles you want in your rack first, then tap a square.'); return; }
    if (placeDir !== 'one' && selected.length > 1) placeRun(r, c);
    else placeOne(r, c, selected[0]);
    render(); save();
  }
  let blankAt = null;
  function askBlank(r, c, k) {
    blankAt = { r, c, k };
    $('#blankgrid').innerHTML = ABC.split('').map(l => `<button type="button" data-l="${l}">${l}</button>`).join('');
    overlay('#blank', true);
  }
  function onBlank(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.l && blankAt) {
      pending.push({ r: blankAt.r, c: blankAt.c, l: b.dataset.l, b: 1, k: blankAt.k });
      selected = selected.filter(x => x !== blankAt.k);
      sndPlace();
      blankAt = null; overlay('#blank', false);
      continueRun();
      render(); save();
      return;
    }
    blankAt = null; overlay('#blank', false); layoutRest = null; render(); save();
  }
  function onRack(e) {
    const b = e.target.closest('.rt'); if (!b || !canAct() || dragMoved) return;
    const k = +b.dataset.k;
    if (swapPick) { if (swapPick.has(k)) swapPick.delete(k); else swapPick.add(k); }
    else if (selected.includes(k)) selected = selected.filter(x => x !== k);
    else selected = selected.concat([k]);
    drawRack(); drawButtons(); hint();
  }
  function doResign() {
    if (!canAct() || st.mode !== 'family') return;
    if (!arm('resign', null, 'Tap Resign again to give up this game.')) return;
    sendOnline('resign');
  }
  function doPlay() {
    if (!canAct()) return;
    if (st.mode === 'family') {
      if (swapPick) sendOnline('swap', { letters: [...swapPick].map(k => myRack()[k]) });
      else sendOnline('play', { tiles: pending.map(p => ({ r: p.r, c: p.c, l: p.l, b: p.b ? 1 : 0 })) });
      return;
    }
    if (swapPick) {
      const rack = myRack(), letters = [...swapPick].map(k => rack[k]);
      const r = swap(st, letters);
      if (!r.ok) { say(r.err, true); sndNo(); return; }
      sndPlace(); afterTurn(); return;
    }
    const r = play(st, pending.map(p => ({ r: p.r, c: p.c, l: p.l, b: p.b })), dict);
    if (!r.ok) { say(r.err, true); sndNo(); return; }
    sndWord(); afterTurn();
  }
  function doRecall() { if (!canAct()) return; pending = []; selected = []; layoutRest = null; swapPick = null; render(); save(); }
  function doShuffle() {
    if (!canAct()) return;
    pending = []; selected = []; layoutRest = null;
    shuffleArr(myRack()); render(); save();
  }
  function doSwap() {
    if (!canAct()) return;
    if (st.bag.length < RACK) { say('Swapping needs at least 7 tiles in the bag.', true); return; }
    pending = []; selected = []; layoutRest = null; swapPick = new Set(); render();
  }
  function doPass() {
    if (!canAct()) return;
    if (!arm('pass', null, 'Tap Pass again to skip your turn.')) return;
    if (st.mode === 'family') { sendOnline('pass'); return; }
    pass(st); afterTurn();
  }
  function doNew() {
    if (st && st.mode === 'family') {
      clearInterval(pollTimer); pollTimer = 0; onlineId = ''; st = null;
      setupMode = 'family'; openSetup(); loadFamily(true); return;
    }
    if (st && !st.over && !arm('new', null, 'Tap New game again to end this game and start a new one.')) return;
    openSetup();
  }

  // Setup
  let setupMode = 'cpu', setupLevel = 'gentle', setupCount = 2;
  function names() { try { return JSON.parse(store.get(NKEY) || '[]') || []; } catch (e) { return []; } }
  function openSetup() {
    overlay('#over', false); overlay('#cover', false);
    const saved = loadSaved();
    $('#contbtn').hidden = !(saved && !saved.st.over);
    drawSetup(); show('#setup');
  }
  function drawSetup() {
    d.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === setupMode));
    d.querySelectorAll('[data-level]').forEach(b => b.classList.toggle('on', b.dataset.level === setupLevel));
    d.querySelectorAll('[data-count]').forEach(b => b.classList.toggle('on', +b.dataset.count === setupCount));
    $('#cpuopts').hidden = setupMode !== 'cpu';
    $('#passopts').hidden = setupMode !== 'pass';
    const fam = $('#famopts'); if (fam) fam.hidden = setupMode !== 'family';
    const start = $('#startbtn'); if (start) start.hidden = setupMode === 'family';
    if (setupMode === 'family') loadFamily(false);
    const nm = names();
    const box = $('#namebox');
    const have = [...box.querySelectorAll('input')].map(x => x.value);
    let h = '';
    for (let i = 0; i < setupCount; i++) h += `<label>Player ${i + 1}<input type="text" maxlength="16" autocomplete="off" value="${esc(have[i] != null ? have[i] : (nm[i] || ''))}" placeholder="Name"></label>`;
    box.innerHTML = h;
    if (!$('#myname').value) $('#myname').value = nm[0] || '';
  }
  function startGame() {
    let players;
    if (setupMode === 'cpu') {
      const me = $('#myname').value.trim() || 'You';
      players = [{ name: me }, { name: 'Computer', cpu: true }];
      const nm = names(); nm[0] = $('#myname').value.trim(); store.set(NKEY, JSON.stringify(nm));
    } else {
      const vals = [...$('#namebox').querySelectorAll('input')].map(x => x.value.trim());
      players = vals.map((v, i) => ({ name: v || 'Player ' + (i + 1) }));
      store.set(NKEY, JSON.stringify(vals));
    }
    st = newGame({ mode: setupMode, level: setupLevel, players });
    pending = []; selected = []; layoutRest = null; swapPick = null; revealed = setupMode === 'cpu'; zoom = false;
    $('#boardwrap').classList.remove('zoom');
    show('#game'); save(); render();
    if (setupMode === 'pass') showCover();
  }
  function resume(saved) {
    st = saved.st; pending = (saved.pending || []).filter(p => p && !st.board[idx(p.r, p.c)]);
    selected = []; layoutRest = null; swapPick = null; revealed = st.mode === 'cpu';
    show('#game'); render();
    if (st.over) { showOver(); return; }
    if (st.players[st.turn].cpu) cpuGo();
    else if (st.mode === 'pass') showCover();
  }

  function seedFamilyDemo() {
    demo = true;
    demoMember = { id: 'm111111111111', tok: 'demo', name: 'Shane', pending: false };
    famPeople = [
      { id: 'm111111111111', name: 'Shane' },
      { id: 'm222222222222', name: 'Sarah' },
      { id: 'm333333333333', name: 'Aranea' },
      { id: 'm444444444444', name: 'Alex' }
    ];
    famList = {
      yourTurn: 1,
      games: [
        { id: 'g1111111111111111', yourTurn: true, over: false, bag: 72, turnName: 'Shane', last: 'Sarah played HOUSE for 18.', players: [{ name: 'Shane', score: 24, me: true, tiles: 7 }, { name: 'Sarah', score: 31, me: false, tiles: 7 }] },
        { id: 'g2222222222222222', yourTurn: false, over: false, bag: 80, turnName: 'Aranea', last: 'You passed.', players: [{ name: 'Shane', score: 12, me: true, tiles: 7 }, { name: 'Aranea', score: 19, me: false, tiles: 7 }] }
      ]
    };
  }
  function demoSelect() {
    demoGame();
    pending = [];
    const rack = st.players[0].rack;
    selected = [];
    for (let k = 0; k < rack.length && selected.length < 4; k++) if (rack[k] !== '?' && !used(k)) selected.push(k);
    placeDir = 'across';
    render();
  }
  function demoChallenge() {
    seedFamilyDemo();
    setupMode = 'family';
    openSetup();
    paintFamily();
    showFamilyAlert();
  }
  function demoOnline() {
    seedFamilyDemo();
    const rand = rng(20261114);
    st = newGame({ mode: 'cpu', level: 'clever', players: [{ name: 'Shane' }, { name: 'Sarah' }], rand });
    for (let k = 0; k < 6 && !st.over; k++) { const r = cpuChoose(st, dict, rand); applyCpu(st, r.move, dict, rand); }
    const board = st.board.slice();
    const last = st.last;
    openOnline({
      id: 'g1111111111111111', rev: 8, over: false, yourTurn: true, bag: 72, scoreless: 0, turn: 0,
      board, last, history: last ? [last] : [], lastText: lastText({ last, players: [{ name: 'Sarah' }, { name: 'Shane' }] }),
      rack: ['C', 'A', 'R', 'E', 'T', 'S', '?'],
      players: [
        { name: 'Shane', score: 24, tiles: 7, me: true, turn: true },
        { name: 'Sarah', score: 31, tiles: 7, me: false, turn: false }
      ]
    });
    pending = [];
    selected = [0, 1, 2, 3];
    placeDir = 'across';
    render();
  }
  function demoGame() {
    demo = true;
    const rand = rng(20261111);
    st = newGame({ mode: 'cpu', level: 'clever', players: [{ name: 'Shane' }, { name: 'Computer', cpu: true }], rand });
    for (let k = 0; k < 8 && !st.over; k++) { const r = cpuChoose(st, dict, rand); applyCpu(st, r.move, dict, rand); }
    st.turn = 0; revealed = true;
    const moves = genMoves(st.board, st.players[0].rack, dict).sort((a, b) => b.score - a.score);
    const mv = moves[Math.floor(moves.length * 0.3)];
    if (mv) { const rack = st.players[0].rack.slice(), taken = []; pending = mv.place.map(p => { let k = rack.findIndex((l, j) => l === (p.b ? '?' : p.l) && !taken.includes(j)); taken.push(k); return Object.assign({ k }, p); }); }
    show('#game'); render();
  }


  let dragMoved = false, dragK = -1, ghost = null;
  function wireDrag() {
    const rack = $('#rack'), board = $('#board');
    const clearGhost = () => { if (ghost) { ghost.remove(); ghost = null; } };
    rack.addEventListener('pointerdown', e => {
      const b = e.target.closest('.rt'); if (!b || !canAct() || swapPick) return;
      dragK = +b.dataset.k; dragMoved = false;
      const move = ev => {
        if (dragK < 0) return;
        if (!dragMoved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 10) return;
        dragMoved = true;
        if (!ghost) {
          ghost = b.cloneNode(true);
          ghost.style.cssText = 'position:fixed;left:0;top:0;width:' + b.offsetWidth + 'px;height:' + b.offsetHeight + 'px;pointer-events:none;z-index:40;opacity:.92;';
          d.body.appendChild(ghost);
        }
        ghost.style.transform = 'translate(' + (ev.clientX - b.offsetWidth / 2) + 'px,' + (ev.clientY - b.offsetHeight / 2) + 'px)';
      };
      const up = ev => {
        root.removeEventListener('pointermove', move);
        root.removeEventListener('pointerup', up);
        root.removeEventListener('pointercancel', up);
        const k = dragK; dragK = -1; clearGhost();
        if (!dragMoved) return;
        const sq = d.elementFromPoint(ev.clientX, ev.clientY);
        const cell = sq && sq.closest && sq.closest('#board .sq');
        if (cell && canAct() && !swapPick) {
          if (!selected.includes(k)) selected = [k].concat(selected.filter(x => x !== k));
          const i = +cell.dataset.i, r = Math.floor(i / N), c = i % N;
          if (!st.board[i] && !pending.some(p => idx(p.r, p.c) === i)) { placeOne(r, c, k); render(); save(); }
        }
        setTimeout(() => { dragMoved = false; }, 0);
      };
      root.addEventListener('pointermove', move);
      root.addEventListener('pointerup', up);
      root.addEventListener('pointercancel', up);
    });
  }
  function wire() {
    $('#board').addEventListener('click', onBoard);
    $('#rack').addEventListener('click', onRack);
    wireDrag();
    $('#blank').addEventListener('click', onBlank);
    $('#playbtn').addEventListener('click', doPlay);
    $('#recallbtn').addEventListener('click', doRecall);
    $('#shufbtn').addEventListener('click', doShuffle);
    $('#swapbtn').addEventListener('click', doSwap);
    $('#passbtn').addEventListener('click', doPass);
    $('#newbtn').addEventListener('click', doNew);
    const resign = $('#resignbtn'); if (resign) resign.addEventListener('click', doResign);
    const dirseg = $('#dirseg'); if (dirseg) dirseg.addEventListener('click', e => { const b = e.target.closest('[data-dir]'); if (!b || !canAct()) return; placeDir = b.dataset.dir; drawButtons(); hint(); });
    $('#soundbtn').addEventListener('click', () => { soundOn = !soundOn; store.set(SKEY, soundOn ? 'on' : 'off'); drawButtons(); if (soundOn) sndPlace(); });
    $('#zoombtn').addEventListener('click', () => { zoom = !zoom; $('#boardwrap').classList.toggle('zoom', zoom); drawButtons(); zoomTo(); });
    $('#coverbtn').addEventListener('click', () => { revealed = true; overlay('#cover', false); render(); });
    $('#overnew').addEventListener('click', () => { overlay('#over', false); if (st && st.mode === 'family') doNew(); else openSetup(); });
    $('#overlook').addEventListener('click', () => overlay('#over', false));
    d.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { setupMode = b.dataset.mode; drawSetup(); }));
    d.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => { setupLevel = b.dataset.level; drawSetup(); }));
    d.querySelectorAll('[data-count]').forEach(b => b.addEventListener('click', () => { setupCount = +b.dataset.count; drawSetup(); }));
    $('#startbtn').addEventListener('click', () => { if (setupMode === 'family') startFamily(); else startGame(); });
    $('#fampeople').addEventListener('click', e => { const b = e.target.closest('button[data-mid]'); if (b) challengePerson(b.dataset.mid); });
    $('#famgames').addEventListener('click', e => { const b = e.target.closest('[data-gid]'); if (b) openFamilyGame(b.dataset.gid); });
    $('#famalert').addEventListener('click', () => openFamilyGame($('#famalert').dataset.gid));
    { const sb = $('#scoresbtn'), gb = $('#gscoresbtn'); const go = () => root.IBScores && root.IBScores.open('scrabble'); if (sb) sb.addEventListener('click', go); if (gb) gb.addEventListener('click', go); }
    $('#contbtn').addEventListener('click', () => { const s = loadSaved(); if (s) resume(s); });
    root.addEventListener('pagehide', save);
    root.addEventListener('visibilitychange', () => { if (!root.document.hidden && st && st.mode === 'family' && !pending.length && !selected.length && !swapPick) { if (onlineId) api('/scrabble/' + onlineId).then(v => { if (st && v.rev !== st.rev) openOnline(v); }).catch(() => {}); peekFamily(); } });
  }

  function boot() {
    wire();
    show('#loading');
    loadDict().then(() => {
      const hash = String(root.location.hash || '');
      if (/^#demo-select/.test(hash)) { demoSelect(); return; }
      if (/^#demo-challenge/.test(hash)) { demoChallenge(); return; }
      if (/^#demo-online/.test(hash)) { demoOnline(); return; }
      if (/^#demo/.test(hash)) { demoGame(); return; }
      const want = takeOpenId();
      if (want) { openFamilyGame(want); peekFamily(); return; }
      const saved = loadSaved();
      if (saved && !saved.st.over) resume(saved); else openSetup();
      peekFamily();
    }).catch(err => {
      $('#loadmsg').textContent = 'The word list did not load. Check the internet connection, then close and open Scrabble again.';
      if (root.console) root.console.warn('Scrabble word list', err);
    });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
  root.Scrabble.ui = { seedChallenge: demoChallenge, seedOnline: demoOnline, seedSelect: demoSelect, layoutRun };
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
