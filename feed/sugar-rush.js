/* Info Book 1.9.166 – Sugar Rush, levels 1–10. Our own match-3 sweet-shop game (own art drawn on canvas, own names).
   Swap two sweets next to each other to make a line of 3 or more. 4 in a line makes a striped sweet (clears a row or
   column), an L or T makes a wrapped sweet (clears the 3x3 around it), 5 in a line makes a sprinkle bomb (clears every
   sweet of the colour it is swapped with).
   Only Shane can play for now (IBScores.isShane() from scores.js); everyone else sees a coming-soon screen.
   Scores are not sent to the family scoreboard yet. Good moves are spoken in a bright, punchy callout voice (matched to Shane's "Great!" clip)
   (Yay, Great, Awesome, Sweet as, Succulent). A plain 3-match plays a short, soft chime (about 200 ms, sine
   with a gentle bell harmonic, 400–800 Hz, 2.5 kHz lowpass). There are no pack pops, smashes or synth select
   or swap sounds. Voices sit clearly above the music, through a compressor, with a brief music duck that
   always restores, and never overlap (at most one every 1.2s, the bigger word wins). Shane's tracks share
   the same AudioContext. The context is unlocked on pointerup/touchend on the game page itself (a silent
   buffer in the same gesture), not only on the menu. Music and sound toggles are independent and default on. */
(function (root) {
  'use strict';
  const N = 8, KINDS = 6, PTS = 30;
  const LEVEL = { n: 1, target: 3000, moves: 20, stars: [3000, 6000, 9000] };
  const BONUS = { row: 120, col: 120, w: 200, b: 300 };
  const NAMES = ['Cherry gumdrop', 'Orange jelly', 'Lemon drop', 'Apple chew', 'Blueberry gem', 'Grape twist'];
  const HOLE = Object.freeze({ hole: 1 });

  const HEART = ['..XXXX..', '.XXXXXX.', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..', '...XX...'];
  const FUNNEL = ['.XXXXXX.', '.XXXXXX.', '..XXXX..', '..XXXX..', '..XXXX..', '..XXXX..', '.XXXXXX.', '.XXXXXX.'];
  const FRAME = ['XXXXXXXX', 'X......X', 'X......X', 'XX....XX', 'XX....XX', 'X......X', 'X......X', 'XXXXXXXX'];

  const LEVELS = [
    { n: 1, name: 'The Sweet Shop', target: 3000, moves: 20, stars: [3000, 6000, 9000], kinds: 6,
      help: 'Swipe a sweet into its neighbour, or tap one then the other, to line up 3 or more of the same. Reach 3,000 points in 20 moves.',
      badge: { id: 'shop', name: 'Sweet Shop Star', icon: '⭐' } },
    { n: 2, name: "Sarah's Sweet Spot", theme: 'sarah', target: 0, moves: 25, stars: [0, 1200, 2400], kinds: 5, mask: HEART,
      collect: { color: 0, n: 10 },
      help: "This heart-shaped tray is Sarah's corner of the shop. Collect 10 cherry gumdrops in 25 moves.",
      intro: { title: "Sarah's Sweet Spot",
        body: "This one is for Sarah, Shane's partner. She lights up at a tray of sweets and the quiet satisfaction of a good match — so this heart-shaped board is her sweet spot in the shop. Collect ten cherry gumdrops, and take your time." },
      badge: { id: 'sarah', name: "Sarah's Heart", icon: '💖', special: true } },
    { n: 3, name: 'A Little Jelly', target: 0, moves: 22, stars: [0, 1500, 3000], kinds: 6,
      jelly: ['00000000', '00000000', '00111100', '00111100', '00111100', '00111100', '00000000', '00000000'],
      help: 'Some tiles have a layer of jelly under the sweet. Make a match on a jelly tile to clear it. Clear every jelly in 22 moves.',
      badge: { id: 'jelly', name: 'Jelly Ribbon', icon: '🎀' } },
    { n: 4, name: 'Locked Jars', target: 2500, moves: 22, stars: [2500, 5000, 8000], kinds: 6,
      locks: ['00000000', '00011000', '00111100', '01100110', '01100110', '00111100', '00011000', '00000000'],
      help: 'A few sweets are locked. They cannot be swapped, but a match that includes them still counts and frees them. Reach 2,500 points in 22 moves.',
      badge: { id: 'lock', name: 'Unlocked Key', icon: '🔑' } },
    { n: 5, name: 'Icing on the Cake', target: 0, moves: 24, stars: [0, 1600, 3200], kinds: 6,
      ice: ['00000000', '00011000', '00111100', '01100110', '01100110', '00111100', '00011000', '00000000'],
      help: 'Icing blocks a tile until a match happens next to it, or a special sweet hits it. Clear all the icing in 24 moves.',
      badge: { id: 'icing', name: 'Icing Rose', icon: '🧁' } },
    { n: 6, name: 'Double Jelly', target: 0, moves: 24, stars: [0, 2000, 4000], kinds: 6,
      jelly: ['00000000', '00222200', '02222220', '02222220', '02222220', '02222220', '00222200', '00000000'],
      help: 'These jellies have two layers, so some tiles need two clears. Clear every jelly in 24 moves.',
      badge: { id: 'double', name: 'Double Scoop', icon: '🍨' } },
    { n: 7, name: 'Bring it Down', target: 0, moves: 34, stars: [0, 1600, 3200], kinds: 6, mask: FUNNEL,
      ings: [[1, 2], [1, 5]],
      ice: ['00000000', '00000000', '00000000', '00011000', '00000000', '00000000', '00000000', '00000000'],
      help: 'Guide the two ingredients down to the bottom of the tray. A little icing sits in the way. Bring both down in 34 moves.',
      badge: { id: 'down', name: 'Lift Ticket', icon: '🎁' } },
    { n: 8, name: 'Chocolate Shop', target: 0, moves: 24, stars: [0, 1800, 3600], kinds: 6,
      choco: ['11000000', '11000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000'],
      jelly: ['00000000', '00000000', '00111100', '00111100', '00111100', '00111100', '00000000', '00000000'],
      help: 'Chocolate spreads to a neighbouring tile at the end of a move if you did not hit it. Keep it in check and clear every jelly in 24 moves.',
      badge: { id: 'choco', name: 'Cocoa Medal', icon: '🍫' } },
    { n: 9, name: 'The Winding Path', target: 0, moves: 28, stars: [0, 1400, 2800], kinds: 5, mask: FRAME,
      jelly: ['11111111', '10000001', '10000001', '10000001', '10000001', '10000001', '10000001', '11111111'],
      collect: { color: 2, n: 6 },
      help: 'The path runs around the edge of the tray. Clear the jelly and collect 6 lemon drops in 28 moves.',
      badge: { id: 'path', name: 'Winding Charm', icon: '🌙' } },
    { n: 10, name: 'Saturday Night', target: 0, moves: 32, stars: [0, 2500, 5000], kinds: 6,
      jelly: ['00000000', '00111100', '01000010', '01000010', '01000010', '01000010', '00111100', '00000000'],
      ings: [[0, 3], [0, 4]],
      ice: ['00000000', '00000000', '00100100', '00000000', '00000000', '00000000', '00000000', '00000000'],
      locks: ['00000000', '00000000', '00000000', '00100100', '00000000', '00000000', '00000000', '00000000'],
      help: 'A little of everything: jelly, two ingredients, a bit of icing and a couple of locked jars. Finish it all in 32 moves.',
      badge: { id: 'night', name: 'Night Light', icon: '🌟' } }
  ];

  // 1.9.210 Sugar Rush main screen: an illustrated candy map of New Zealand.
  // Stops start in Onerahi / Whangārei and travel south. Level 2 is Sarah's house.
  const MAP_W = 400, MAP_H = 1280;
  const MAP_STOPS = [
    { n: 1, x: 258, y: 118, place: 'Onerahi', kind: 'town', label: 'right' },
    { n: 2, x: 168, y: 178, place: "Sarah's House", kind: 'house', label: 'left' },
    { n: 3, x: 214, y: 236, place: 'Whangārei', kind: 'town', label: 'right' },
    { n: 4, x: 176, y: 292, place: 'Auckland Post Office', kind: 'post', label: 'left' },
    { n: 5, x: 168, y: 348, place: 'Hamilton', kind: 'town', label: 'left' },
    { n: 6, x: 258, y: 368, place: 'Rotorua', kind: 'town', label: 'right' },
    { n: 7, x: 200, y: 424, place: 'Taupō Station', kind: 'station', label: 'left' },
    { n: 8, x: 300, y: 500, place: 'Napier', kind: 'town', label: 'left' },
    { n: 9, x: 246, y: 530, place: 'Wellington', kind: 'town', label: 'right' },
    { n: 10, x: 148, y: 640, place: 'Nelson', kind: 'town', label: 'left' }
  ];
  const FUTURE_STOPS = [
    { place: 'Christchurch', x: 270, y: 852, label: 'right' },
    { place: 'Queenstown', x: 138, y: 948, label: 'right' },
    { place: 'Dunedin', x: 252, y: 1010, label: 'left' }
  ];
  function stopForLevel(n) { return MAP_STOPS[(n | 0) - 1] || null; }
  function icingPath(pts) {
    if (!pts || pts.length < 2) return '';
    const p = [pts[0]].concat(pts, [pts[pts.length - 1]]);
    let d = 'M ' + pts[0].x + ' ' + pts[0].y;
    for (let i = 1; i < p.length - 2; i++) {
      const p0 = p[i - 1], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2];
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C ' + c1x + ' ' + c1y + ' ' + c2x + ' ' + c2y + ' ' + p2.x + ' ' + p2.y;
    }
    return d;
  }
  function nzMapSvg() {
    const live = icingPath(MAP_STOPS);
    const future = icingPath([MAP_STOPS[MAP_STOPS.length - 1]].concat(FUTURE_STOPS));
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + MAP_W + ' ' + MAP_H + '" width="' + MAP_W + '" height="' + MAP_H + '" aria-hidden="true" class="nzsvg">' +
      '<defs>' +
      '<linearGradient id="sr-sea" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#9be7ff"/><stop offset=".45" stop-color="#8fd9f8"/><stop offset="1" stop-color="#b8f3de"/>' +
      '</linearGradient>' +
      '<linearGradient id="sr-land" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#fff6fb"/><stop offset=".45" stop-color="#ffd7ea"/><stop offset="1" stop-color="#ffe9c8"/>' +
      '</linearGradient>' +
      '<linearGradient id="sr-icing" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#ff8ab8"/><stop offset=".55" stop-color="#ffb347"/><stop offset="1" stop-color="#ff6fa8"/>' +
      '</linearGradient>' +
      '<filter id="sr-soft" x="-6%" y="-6%" width="112%" height="112%">' +
      '<feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#4a90b8" flood-opacity=".28"/>' +
      '</filter>' +
      '</defs>' +
      '<rect width="' + MAP_W + '" height="' + MAP_H + '" fill="url(#sr-sea)"/>' +
      '<circle class="sr-bob" cx="48" cy="90" r="7" fill="#ff8ab8" opacity=".55"/>' +
      '<circle class="sr-bob" cx="62" cy="102" r="5" fill="#ffe066" opacity=".65"/>' +
      '<circle class="sr-bob" cx="360" cy="200" r="6" fill="#7ee0a8" opacity=".5"/>' +
      '<circle class="sr-bob" cx="40" cy="640" r="8" fill="#ffb347" opacity=".45"/>' +
      '<circle class="sr-bob" cx="370" cy="900" r="7" fill="#ff8ab8" opacity=".45"/>' +
      '<circle class="sr-bob" cx="56" cy="1100" r="6" fill="#fff" opacity=".55"/>' +
      '<text x="28" y="48" font-size="13" font-weight="800" fill="#2a6a88" font-family="ui-rounded,system-ui,sans-serif">N</text>' +
      '<path d="M28 54 L28 72 M28 54 L22 62 M28 54 L34 62" fill="none" stroke="#2a6a88" stroke-width="2" stroke-linecap="round"/>' +
      // North Island
      '<path filter="url(#sr-soft)" fill="url(#sr-land)" stroke="#fff" stroke-width="8" stroke-linejoin="round" d="' +
      'M 196 30 C 208 28 222 38 224 54 C 226 72 236 86 230 104 C 238 118 242 132 232 146 C 238 160 232 176 220 188 ' +
      'C 238 192 268 172 286 162 C 304 152 316 162 312 180 C 308 196 290 204 272 210 C 262 220 278 230 304 236 ' +
      'C 336 244 362 258 370 280 C 376 300 360 322 350 344 C 340 368 352 386 338 404 C 322 426 316 452 302 476 ' +
      'C 290 498 280 518 262 528 C 246 536 236 524 228 512 C 214 514 204 500 200 482 C 190 458 176 434 168 410 ' +
      'C 154 388 132 372 116 352 C 96 334 90 316 108 300 C 124 284 142 276 150 256 C 156 236 148 220 158 208 ' +
      'C 150 192 142 176 146 158 C 150 136 160 116 168 98 C 174 74 180 52 188 40 C 190 34 192 30 196 30 Z"/>' +
      '<ellipse cx="226" cy="388" rx="16" ry="13" fill="#7ec8ef" stroke="#fff" stroke-width="2"/>' +
      // South Island (Banks Peninsula included on the east)
      '<path filter="url(#sr-soft)" fill="url(#sr-land)" stroke="#fff" stroke-width="8" stroke-linejoin="round" d="' +
      'M 198 608 C 226 600 252 610 254 636 C 256 670 262 708 258 746 C 256 784 268 812 288 828 ' +
      'C 308 844 306 866 288 876 C 272 886 258 896 256 922 C 258 950 254 986 236 1006 ' +
      'C 216 1028 190 1038 166 1030 C 140 1022 118 1004 102 976 C 84 944 70 904 74 862 ' +
      'C 76 820 66 780 76 740 C 84 700 74 662 84 628 C 94 596 126 584 156 590 C 174 594 186 600 198 608 Z"/>' +
      '<path fill="#8fd9f8" d="M 86 930 C 78 918 70 910 76 898 C 90 906 96 920 94 934 Z"/>' +
      '<path fill="#8fd9f8" d="M 80 880 C 70 868 64 854 74 844 C 86 856 90 870 86 884 Z"/>' +
      '<ellipse filter="url(#sr-soft)" cx="168" cy="1148" rx="28" ry="20" fill="url(#sr-land)" stroke="#fff" stroke-width="6"/>' +
      // Soft icing alps
      '<path d="M 132 710 C 142 668 154 668 164 710 C 154 702 142 702 132 710 Z" fill="#fff" opacity=".9"/>' +
      '<path d="M 152 790 C 164 742 178 742 188 790 C 176 780 164 780 152 790 Z" fill="#fff" opacity=".88"/>' +
      '<path d="M 140 870 C 152 828 166 828 176 870 C 164 860 152 860 140 870 Z" fill="#fff" opacity=".88"/>' +
      // Ferry across Cook Strait
      '<path d="M 210 575 C 200 595 180 615 168 628" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="5 7" stroke-linecap="round" opacity=".85"/>' +
      '<path id="sr-future" d="' + future + '" fill="none" stroke="#ffb3d3" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 9" opacity=".7"/>' +
      '<path id="sr-path-wide" d="' + live + '" fill="none" stroke="url(#sr-icing)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path id="sr-path-dash" d="' + live + '" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 10" opacity=".9"/>' +
      '</svg>'
    );
  }

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    const f = function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f._get = () => a; f._set = v => { a = v >>> 0; };
    return f;
  }
  function fork(rand) { const g = rng(1); if (rand && rand._get) g._set(rand._get()); return g; }
  let nid = 1;
  const mk = (c, s) => ({ id: nid++, c, s: s || '' });
  const key = (r, c) => r * N + c;
  const rc = k => [Math.floor(k / N), k % N];
  const adj = (a, z) => Math.abs(a[0] - z[0]) + Math.abs(a[1] - z[1]) === 1;
  const randKind = (rand, kinds) => Math.floor(rand() * (kinds || KINDS));
  const isHole = t => t === HOLE || !!(t && t.hole);
  const isBlock = t => !!(t && (t.ice > 0 || t.choco > 0));
  const isIng = t => !!(t && t.ing);
  const isBomb = t => !!(t && t.s === 'b' && t.c < 0 && !t.ing && !t.ice && !t.choco);
  const isCandy = t => !!(t && t.c >= 0 && !t.ice && !t.choco && !t.ing);
  const canSwap = t => !!(t && !isHole(t) && (isCandy(t) || isBomb(t)) && !t.lock);
  function isOpen(mask, r, c) {
    if (r < 0 || r >= N || c < 0 || c >= N) return false;
    if (!mask) return true;
    const ch = mask[r][c];
    return ch === 'X' || ch === '1';
  }
  function parseDigits(rows) {
    if (!rows) return null;
    return rows.map(row => row.split('').map(ch => +ch || 0));
  }
  function lvOf(opt) {
    opt = opt || {};
    if (opt.level && typeof opt.level === 'object') return opt.level;
    if (opt.level != null) return LEVELS[(opt.level | 0) - 1] || LEVELS[0];
    return LEVELS[0];
  }

  // Tests: '0'-'5' plain sweets, '*' a sprinkle bomb, '.' empty, '#' a hole, 'I' icing, 'C' chocolate, 'G' an ingredient.
  function fromRows(rows) {
    return rows.map(row => row.split('').map(ch => {
      if (ch === '.') return null;
      if (ch === '#') return HOLE;
      if (ch === '*') return mk(-1, 'b');
      if (ch === 'I') return Object.assign(mk(-4), { ice: 1 });
      if (ch === 'C') return Object.assign(mk(-5), { choco: 1 });
      if (ch === 'G') return Object.assign(mk(-3), { ing: 1 });
      return mk(+ch);
    }));
  }
  const toRows = b => b.map(row => row.map(t => {
    if (!t) return '.';
    if (isHole(t)) return '#';
    if (t.ice > 0) return 'I';
    if (t.choco) return 'C';
    if (t.ing) return 'G';
    if (t.c < 0) return '*';
    return String(t.c);
  }).join(''));

  function findRuns(b) {
    const runs = [];
    for (let dir = 0; dir < 2; dir++) {
      for (let i = 0; i < N; i++) {
        let start = 0;
        for (let j = 1; j <= N; j++) {
          const cur = j < N ? (dir ? b[j][i] : b[i][j]) : null;
          const first = dir ? b[start][i] : b[i][start];
          if (cur && first && isCandy(cur) && isCandy(first) && cur.c === first.c) continue;
          if (j - start >= 3 && first && isCandy(first)) {
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
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = b[r][c]; if (isCandy(t) && !skip.has(key(r, c))) n[t.c]++; }
    let best = 0; for (let i = 1; i < KINDS; i++) if (n[i] > n[best]) best = i;
    return best;
  }
  function expand(b, clear, fired, hit, mask) {
    const q = [...clear], done = new Set();
    const add = k => {
      const [r, c] = rc(k);
      if (!isOpen(mask, r, c)) return;
      const t = b[r][c];
      if (isHole(t) || isIng(t)) return;
      if (isBlock(t)) { hit.add(k); return; }
      if (!clear.has(k)) { clear.add(k); q.push(k); }
    };
    while (q.length) {
      const k = q.pop(); if (done.has(k)) continue; done.add(k);
      const [r, c] = rc(k), t = b[r][c];
      if (!t || !t.s || isBlock(t) || isIng(t)) continue;
      if (t.s === 'row') { fired.push({ r, c, s: 'row' }); for (let j = 0; j < N; j++) add(key(r, j)); }
      else if (t.s === 'col') { fired.push({ r, c, s: 'col' }); for (let i = 0; i < N; i++) add(key(i, c)); }
      else if (t.s === 'w') { fired.push({ r, c, s: 'w' }); for (let i = r - 1; i <= r + 1; i++) for (let j = c - 1; j <= c + 1; j++) if (i >= 0 && i < N && j >= 0 && j < N) add(key(i, j)); }
      else if (t.s === 'b' && !t.armed) {
        const col = mostCommon(b, clear); fired.push({ r, c, s: 'b', color: col });
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const o = b[i][j]; if (o && o.c === col) add(key(i, j)); }
      }
    }
  }
  function neighbourHits(b, clear, hit, mask) {
    const bump = (r, c) => { if (isOpen(mask, r, c) && isBlock(b[r][c])) hit.add(key(r, c)); };
    clear.forEach(k => { const [r, c] = rc(k); bump(r - 1, c); bump(r + 1, c); bump(r, c - 1); bump(r, c + 1); });
  }
  function resolve(b, pref, mask) {
    const runs = findRuns(b); if (!runs.length) return null;
    const gs = groups(runs), clear = new Set(), made = [], keep = new Set();
    for (const g of gs) {
      g.cells.forEach(k => clear.add(k));
      const s = specialFor(g);
      if (s) { const k = placeFor(g, pref); if (!keep.has(k)) { keep.add(k); made.push({ k, s, color: s === 'b' ? -1 : g.color }); } }
    }
    const fired = [], hit = new Set();
    expand(b, clear, fired, hit, mask);
    neighbourHits(b, clear, hit, mask);
    return { kind: 'clear', clear, made, fired, hit, groups: gs.length };
  }
  function bombSwap(b, A, Z, at, mask) {
    const clear = new Set(), fired = [], hit = new Set();
    if (A.c < 0 && Z.c < 0 && isBomb(A) && isBomb(Z)) {
      for (let k = 0; k < N * N; k++) { const t = b[rc(k)[0]][rc(k)[1]]; if (t && !isHole(t) && !isIng(t)) { if (isBlock(t)) hit.add(k); else clear.add(k); } }
      fired.push({ r: rc(at)[0], c: rc(at)[1], s: 'b', color: -1 });
    } else {
      const other = isBomb(A) ? Z : A, bomb = isBomb(A) ? A : Z;
      bomb.armed = true;
      for (let k = 0; k < N * N; k++) { const [r, c] = rc(k), t = b[r][c]; if (t === bomb || (t && t.c === other.c)) clear.add(k); }
      const bk = [...clear].find(k => b[rc(k)[0]][rc(k)[1]] === bomb);
      fired.push({ r: rc(bk)[0], c: rc(bk)[1], s: 'b', color: other.c });
      expand(b, clear, fired, hit, mask);
      neighbourHits(b, clear, hit, mask);
    }
    return { kind: 'clear', clear, made: [], fired, hit, groups: 1, bomb: true };
  }
  function collapse(b, rand, kinds, mask) {
    const falls = [];
    kinds = kinds || KINDS;
    for (let c = 0; c < N; c++) {
      let r = N - 1;
      while (r >= 0) {
        while (r >= 0 && (!isOpen(mask, r, c) || isHole(b[r][c]))) r--;
        if (r < 0) break;
        if (isBlock(b[r][c])) { r--; continue; }
        let top = r;
        while (top - 1 >= 0 && isOpen(mask, top - 1, c) && !isHole(b[top - 1][c]) && !isBlock(b[top - 1][c])) top--;
        const items = [];
        for (let i = r; i >= top; i--) { if (b[i][c]) items.push({ t: b[i][c], from: i }); b[i][c] = null; }
        let w = r;
        for (const it of items) { b[w][c] = it.t; if (w !== it.from) falls.push({ t: it.t, r: w, c, from: it.from }); w--; }
        let spawn = 0;
        for (let i = w; i >= top; i--) {
          spawn++;
          const t = mk(randKind(rand, kinds));
          b[i][c] = t;
          falls.push({ t, r: i, c, from: top - spawn, fresh: true });
        }
        r = top - 1;
      }
    }
    return falls;
  }
  function collectIngs(b, mask, st, step) {
    let n = 0;
    for (let c = 0; c < N; c++) {
      let bottom = -1;
      for (let r = N - 1; r >= 0; r--) if (isOpen(mask, r, c)) { bottom = r; break; }
      if (bottom < 0) continue;
      const t = b[bottom][c];
      if (isIng(t)) {
        (step.delivered || (step.delivered = [])).push({ t, r: bottom, c });
        b[bottom][c] = null;
        if (st) st.ingsLeft = Math.max(0, (st.ingsLeft || 0) - 1);
        n++;
      }
    }
    return n;
  }
  function applyStep(b, step, rand, kinds, cascade, st) {
    const mask = st && st.mask;
    const hit = step.hit || new Set();
    step.popped = [];
    step.delivered = step.delivered || [];
    step.jellyCleared = 0;
    step.brokeLock = false;
    step.clear.forEach(k => {
      const [r, c] = rc(k), t = b[r][c];
      if (t && !isHole(t) && !isBlock(t)) {
        step.popped.push({ id: t.id, r, c, color: t.c, s: t.s, lock: t.lock });
        if (t.lock) step.brokeLock = true;
        if (st && t.c >= 0) st.collected[t.c] = (st.collected[t.c] || 0) + 1;
        b[r][c] = null;
        if (st && st.jelly) {
          const before = st.jelly[r][c] || 0;
          st.jelly[r][c] = Math.max(0, before - 1);
          if (before > 0) step.jellyCleared++;
        }
      }
    });
    step.blocked = [];
    hit.forEach(k => {
      const [r, c] = rc(k), t = b[r][c];
      if (!t) return;
      if (t.ice > 0) {
        t.ice--;
        step.blocked.push({ r, c, kind: 'ice', left: t.ice });
        if (t.ice <= 0) { b[r][c] = null; if (st && st.jelly) { const before = st.jelly[r][c] || 0; st.jelly[r][c] = Math.max(0, before - 1); if (before > 0) step.jellyCleared++; } }
      } else if (t.choco > 0) {
        step.blocked.push({ r, c, kind: 'choco', left: 0 });
        step.chocoHit = true;
        b[r][c] = null;
        if (st && st.jelly) { const before = st.jelly[r][c] || 0; st.jelly[r][c] = Math.max(0, before - 1); if (before > 0) step.jellyCleared++; }
      }
    });
    step.madeTiles = (step.made || []).map(m => { const [r, c] = rc(m.k), t = mk(m.color, m.s); b[r][c] = t; return { t, r, c }; });
    step.cascade = cascade;
    step.points = step.popped.length * PTS * cascade + (step.made || []).reduce((n, m) => n + (BONUS[m.s] || 0), 0);
    step.falls = [];
    for (let guard = 0; guard < 8; guard++) {
      const f = collapse(b, rand, kinds, mask);
      step.falls.push.apply(step.falls, f);
      if (!collectIngs(b, mask, st, step)) break;
    }
    return step;
  }
  function swapAt(b, a, z) { const t = b[a[0]][a[1]]; b[a[0]][a[1]] = b[z[0]][z[1]]; b[z[0]][z[1]] = t; }
  function validSwap(b, a, z, mask) {
    if (!adj(a, z)) return false;
    if (mask && (!isOpen(mask, a[0], a[1]) || !isOpen(mask, z[0], z[1]))) return false;
    const A = b[a[0]] && b[a[0]][a[1]], Z = b[z[0]] && b[z[0]][z[1]];
    if (!canSwap(A) || !canSwap(Z)) return false;
    if (isBomb(A) || isBomb(Z)) return true;
    swapAt(b, a, z); const ok = findRuns(b).length > 0; swapAt(b, a, z);
    return ok;
  }
  function findMove(b, mask) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (c + 1 < N && validSwap(b, [r, c], [r, c + 1], mask)) return [[r, c], [r, c + 1]];
      if (r + 1 < N && validSwap(b, [r, c], [r + 1, c], mask)) return [[r, c], [r + 1, c]];
    }
    return null;
  }
  const hasMove = (b, mask) => !!findMove(b, mask);
  function shuffle(b, rand, kinds, mask) {
    const cells = [], tiles = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = b[r][c];
      if (isCandy(t) && !t.lock) { cells.push([r, c]); tiles.push(t); }
    }
    for (let tries = 0; tries < 300; tries++) {
      for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const x = tiles[i]; tiles[i] = tiles[j]; tiles[j] = x; }
      cells.forEach((p, i) => { b[p[0]][p[1]] = tiles[i]; });
      if (!findRuns(b).length && hasMove(b, mask)) return true;
    }
    const fresh = newBoard(rand, kinds, mask);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (isHole(b[r][c]) || isBlock(b[r][c]) || isIng(b[r][c]) || (b[r][c] && b[r][c].lock)) continue;
      if (isOpen(mask, r, c)) b[r][c] = fresh[r][c];
    }
    return true;
  }
  function newBoard(rand, kinds, mask) {
    kinds = kinds || KINDS;
    for (;;) {
      const b = [];
      for (let r = 0; r < N; r++) {
        b.push([]);
        for (let c = 0; c < N; c++) {
          if (!isOpen(mask, r, c)) { b[r].push(HOLE); continue; }
          let k, guard = 0;
          do {
            k = randKind(rand, kinds);
            guard++;
          } while (guard < 24 && (
            (c >= 2 && isCandy(b[r][c - 1]) && b[r][c - 1].c === k && isCandy(b[r][c - 2]) && b[r][c - 2].c === k) ||
            (r >= 2 && isCandy(b[r - 1][c]) && b[r - 1][c].c === k && isCandy(b[r - 2][c]) && b[r - 2][c].c === k)
          ));
          b[r].push(mk(k));
        }
      }
      if (hasMove(b, mask)) return b;
    }
  }
  function decorate(board, lv, rand, kinds, mask) {
    const grid = (rows, fn) => {
      if (!rows) return;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const n = +(rows[r] && rows[r][c]) || 0;
        if (n && isOpen(mask, r, c)) fn(r, c, n);
      }
    };
    grid(lv.locks, (r, c) => { if (isCandy(board[r][c])) board[r][c].lock = 1; });
    grid(lv.ice, (r, c, n) => { board[r][c] = Object.assign(mk(-4), { ice: n }); });
    grid(lv.choco, (r, c) => { board[r][c] = Object.assign(mk(-5), { choco: 1 }); });
    (lv.ings || []).forEach(([r, c]) => { if (isOpen(mask, r, c)) board[r][c] = Object.assign(mk(-3), { ing: 1 }); });
    if (!hasMove(board, mask)) shuffle(board, rand, kinds, mask);
    return board;
  }
  function countIngs(b) { let n = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (isIng(b[r][c])) n++; return n; }
  function jellyLeft(st) {
    if (!st.jelly) return 0;
    let n = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) n += st.jelly[r][c] || 0;
    return n;
  }
  function iceLeft(b) { let n = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c] && b[r][c].ice > 0) n += b[r][c].ice; return n; }
  function chocoLeft(b) { let n = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c] && b[r][c].choco) n++; return n; }
  function goalsMet(st) {
    const lv = st.lv || LEVEL;
    if (lv.target && st.score < lv.target) return false;
    if (lv.jelly && jellyLeft(st) > 0) return false;
    if (lv.ice && iceLeft(st.board) > 0) return false;
    if (lv.collect && (st.collected[lv.collect.color] || 0) < lv.collect.n) return false;
    if ((lv.ings && lv.ings.length) && (st.ingsLeft || 0) > 0) return false;
    return true;
  }
  function spreadChoco(st) {
    const b = st.board, mask = st.mask, spots = [], neigh = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c] && b[r][c].choco) spots.push([r, c]);
    if (!spots.length) return null;
    spots.forEach(([r, c]) => {
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([i, j]) => {
        if (!isOpen(mask, i, j)) return;
        const t = b[i][j];
        if (!t || isHole(t) || isBlock(t) || isIng(t)) return;
        neigh.push([i, j]);
      });
    });
    if (!neigh.length) return null;
    const [i, j] = neigh[Math.floor(st.rand() * neigh.length)];
    b[i][j] = Object.assign(mk(-5), { choco: 1 });
    return { r: i, c: j };
  }
  function starsFor(score, lv) { lv = lv || LEVEL; return lv.stars.filter(s => score >= s).length; }
  function starsOf(st) {
    if (!st.won) return 0;
    return Math.max(1, starsFor(st.score, st.lv || LEVEL));
  }
  function newGame(opt) {
    opt = opt || {};
    const lv = lvOf(opt);
    const rand = opt.rand || rng(opt.seed == null ? Date.now() : opt.seed);
    const kinds = opt.kinds || lv.kinds || KINDS;
    const mask = opt.mask || lv.mask || null;
    let board = opt.board || newBoard(rand, kinds, mask);
    if (!opt.board) board = decorate(board, lv, rand, kinds, mask);
    return {
      board, rand, kinds, mask, lv,
      jelly: parseDigits(lv.jelly),
      collected: new Array(KINDS).fill(0),
      ingsLeft: countIngs(board),
      score: 0, moves: lv.moves, target: lv.target || 0, over: false, won: false, stars: 0
    };
  }
  function isScoreOnly(lv) {
    lv = lv || {};
    return !lv.jelly && !lv.ice && !lv.collect && !(lv.ings && lv.ings.length);
  }
  function finishIfDone(st) {
    const reached = goalsMet(st);
    // Score-only levels (including level 1) play out every move, then award the win.
    if (isScoreOnly(st.lv)) {
      if (st.moves <= 0) { st.over = true; st.won = reached; st.stars = st.won ? starsOf(Object.assign({}, st, { won: true })) : 0; }
      return;
    }
    if (reached) { st.won = true; st.over = true; st.stars = starsOf(st); return; }
    if (st.moves <= 0) { st.over = true; st.won = false; st.stars = 0; }
  }
  function play(st, a, z) {
    const b = st.board, mask = st.mask;
    if (st.over || !validSwap(b, a, z, mask)) return { valid: false };
    const A = b[a[0]][a[1]], Z = b[z[0]][z[1]];
    swapAt(b, a, z);
    st.moves--;
    const steps = [];
    let cascade = 1;
    if (isBomb(A) || isBomb(Z)) { const s = applyStep(b, bombSwap(b, A, Z, key(z[0], z[1]), mask), st.rand, st.kinds, cascade++, st); steps.push(s); st.score += s.points; }
    let pref = steps.length ? null : [z, a];
    for (let guard = 0; guard < 60; guard++) {
      const s = resolve(b, pref, mask); if (!s) break;
      pref = null;
      applyStep(b, s, st.rand, st.kinds, cascade++, st);
      steps.push(s); st.score += s.points;
    }
    let shuffled = false;
    if (!hasMove(b, mask)) { shuffle(b, st.rand, st.kinds, mask); shuffled = true; }
    const chocoHit = steps.some(s => s.chocoHit);
    const spread = (!chocoHit && chocoLeft(b)) ? spreadChoco(st) : null;
    finishIfDone(st);
    return { valid: true, steps, shuffled, swapped: [A, Z], spread };
  }

  function cloneTile(t) {
    if (!t) return null;
    if (isHole(t)) return HOLE;
    return Object.assign({}, t);
  }
  function cloneState(st) {
    return {
      board: st.board.map(row => row.map(cloneTile)),
      rand: fork(st.rand),
      kinds: st.kinds,
      mask: st.mask,
      lv: st.lv,
      jelly: st.jelly ? st.jelly.map(r => r.slice()) : null,
      collected: st.collected.slice(),
      ingsLeft: st.ingsLeft,
      score: st.score, moves: st.moves, target: st.target, over: st.over, won: st.won, stars: st.stars
    };
  }
  function allMoves(st) {
    const out = [], b = st.board, mask = st.mask;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (c + 1 < N && validSwap(b, [r, c], [r, c + 1], mask)) out.push([[r, c], [r, c + 1]]);
      if (r + 1 < N && validSwap(b, [r, c], [r + 1, c], mask)) out.push([[r, c], [r + 1, c]]);
    }
    return out;
  }
  function heur(before, after, res) {
    if (after.won) return 1e7 + after.score + after.moves * 50;
    let h = after.score;
    if (before.lv && before.lv.collect) h += ((after.collected[before.lv.collect.color] || 0) - (before.collected[before.lv.collect.color] || 0)) * 400;
    if (before.jelly) h += (jellyLeft(before) - jellyLeft(after)) * 250;
    if (before.lv && before.lv.ice) h += (iceLeft(before.board) - iceLeft(after.board)) * 300;
    h += ((before.ingsLeft || 0) - (after.ingsLeft || 0)) * 800;
    if (res && res.steps) h += res.steps.reduce((n, s) => n + (s.madeTiles ? s.madeTiles.length * 80 : 0), 0);
    return h;
  }
  function bestMove(st) {
    let best = null, bestH = -1e15;
    const moves = allMoves(st);
    for (const m of moves) {
      const cl = cloneState(st);
      const res = play(cl, m[0], m[1]);
      if (!res.valid) continue;
      const h = heur(st, cl, res);
      if (h > bestH) { bestH = h; best = m; }
    }
    return best || findMove(st.board, st.mask);
  }
  function tryBeat(lv, seeds) {
    let wins = 0;
    for (let s = 1; s <= seeds; s++) {
      const g = newGame({ level: lv, seed: s * 97 + lv.n * 13 });
      let guard = 0;
      while (!g.over && guard++ < 80) {
        const m = bestMove(g); if (!m) break;
        if (!play(g, m[0], m[1]).valid) break;
      }
      if (g.won) wins++;
    }
    return wins;
  }


  // Soft spoken callouts and a short 3-match chime. Voices are warm NZ clips,
  // already de-essed and lowpassed at 7 kHz, played through the clip bus (they
  // skip the 2.5 kHz synth filter so the words stay clear). The chime is a
  // sine with a gentle bell harmonic, fundamentals 400–800 Hz, 2.5 kHz lowpass,
  // quieter than the words. Mix: voices clearly above the music, a brief duck
  // that always restores, a compressor on the bus.
  const BGM_VOL = 0.12, END_VOL = 0.20, MENU_VOL = 0.12, BGM_DUCK = 0.078, XF = 0.3;
  const SFX_MASTER = 0.96, SFX_NOTE = 0.10, SFX_LP = 2500, SFX_MAX_HZ = 800;
  const VOICE_VOL = 0.36, CHIME_VOL = 0.10, CHIME_DUR = 0.20, VOICE_GAP = 1.2;
  const SCALE = [440.0, 523.3, 587.3, 659.3, 784.0];
  const VOICE_FILES = {
    yay: 'sugar-rush-voice-yay.mp3',
    great: 'sugar-rush-voice-great.mp3',
    awesome: 'sugar-rush-voice-awesome.mp3',
    sweetas: 'sugar-rush-voice-sweetas.mp3',
    succulent: 'sugar-rush-voice-succulent.mp3'
  };
  const VOICE_RANK = { great: 1, sweetas: 2, awesome: 3, succulent: 4, yay: 5 };
  // 1.9.163/164 Content hash on every music and voice URL so a replaced file is
  // not served from the HTTP cache. 1.9.164 puts the hash in the filename because
  // some phone media caches ignore ?v= on audio. Pathname still ends in .mp3, so
  // the SW leaves range requests alone.
  const MEDIA_HASH = {
    'sugar-rush-music.mp3': '39970f66', 'sugar-rush-menu.mp3': '3343a079', 'sugar-rush-win.mp3': '9b0efbad', 'sugar-rush-yum.mp3': 'ac1b2cf5',
    'sugar-rush-l1.mp3': '3fd00f38', 'sugar-rush-l2.mp3': '34c4b4be',
    'sugar-rush-voice-yay.mp3': '6ca043f6', 'sugar-rush-voice-great.mp3': 'c287c114', 'sugar-rush-voice-awesome.mp3': 'a56af295',
    'sugar-rush-voice-sweetas.mp3': '50b435e6', 'sugar-rush-voice-succulent.mp3': '1d5018ba'
  };
  function mediaUrl(file) { return file.replace(/\.mp3$/, '-' + MEDIA_HASH[file] + '.mp3'); }
  // Level 1 plays Shane's "Sugar Rush" song, level 2 plays "Sarah's Sugar Sprint";
  // later levels keep the usual gameplay loop.
  function gameTrack(level) { return level === 1 ? 'sugar-rush-l1.mp3' : level === 2 ? 'sugar-rush-l2.mp3' : 'sugar-rush-music.mp3'; }

  function attachSfxBus(ctx) {
    const mix = ctx.createGain(); mix.gain.value = 1;
    const sfxComp = ctx.createDynamicsCompressor();
    sfxComp.threshold.value = -8; sfxComp.knee.value = 6; sfxComp.ratio.value = 6;
    sfxComp.attack.value = 0.003; sfxComp.release.value = 0.15;
    mix.connect(sfxComp); sfxComp.connect(ctx.destination);
    const sfxLp = ctx.createBiquadFilter(); sfxLp.type = 'lowpass'; sfxLp.frequency.value = SFX_LP; sfxLp.Q.value = 0.5;
    const master = ctx.createGain(); master.gain.value = SFX_MASTER;
    master.connect(sfxLp); sfxLp.connect(mix);
    // Voice clips are already lowpassed at 7 kHz; they share the compressor, not the 2.5 kHz chime filter.
    const clip = ctx.createGain(); clip.gain.value = SFX_MASTER;
    clip.connect(mix);
    return { master, clip, lp: sfxLp, comp: sfxComp, mix };
  }
  function playClip(ctx, dest, buf, at, rate, vol) {
    if (!ctx || !dest || !buf) return null;
    if (at == null) at = (ctx.currentTime || 0) + 0.01;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf;
    src.playbackRate.setValueAtTime(rate == null ? 1 : rate, at);
    g.gain.setValueAtTime(Math.max(0.0001, vol == null ? VOICE_VOL : vol), at);
    src.connect(g); g.connect(dest);
    src.start(at);
    return src;
  }
  function playTone(ctx, dest, f, at, dur, vol, type) {
    if (!ctx || !dest) return;
    f = Math.max(400, Math.min(SFX_MAX_HZ, f));
    const att = 0.01, end = at + Math.max(dur, att + 0.02);
    function osc(hz, peak, typ) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = typ || 'sine';
      o.frequency.setValueAtTime(hz, at);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), at + att);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      o.connect(g); g.connect(dest);
      o.start(at); o.stop(end + 0.03);
    }
    if (type === 'triangle') {
      osc(f, vol, 'triangle');
      osc(f * 2, vol * 0.16, 'sine');
    } else {
      osc(f, vol, 'sine');
      osc(f * 2, vol * 0.18, 'sine');
    }
  }
  // Short, soft, warm chime for a plain 3-match. Pitch walks the key so repeats vary.
  function playChime(ctx, dest, at, n) {
    if (!ctx || !dest) return;
    if (at == null) at = (ctx.currentTime || 0) + 0.01;
    const f = SCALE[((n || 0) % SCALE.length + SCALE.length) % SCALE.length];
    const dur = CHIME_DUR, att = 0.01, end = at + dur, v = CHIME_VOL;
    function osc(hz, peak) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(Math.max(400, Math.min(SFX_MAX_HZ, hz)), at);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), at + att);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      o.connect(g); g.connect(dest);
      o.start(at); o.stop(end + 0.03);
    }
    osc(f, v);
    osc(f * 2, v * 0.16);
    osc(f * 1.5, v * 0.10);
  }
  function madeKind(m) { return (m && (m.s || (m.t && m.t.s))) || ''; }
  // Pick the spoken word for one clear. cascade is 1 for the first clear, 2 for a
  // 2-step cascade, and so on. A plain 3-match returns null (the chime plays instead).
  // Bigger words win when more than one rule matches.
  function voiceForStep(s, cascade) {
    if (!s) return null;
    const i = cascade != null ? cascade : (s.cascade || 1);
    const fired = s.fired || [];
    const made = s.madeTiles || s.made || [];
    const popped = (s.popped && s.popped.length) || (s.clear && s.clear.size) || 0;
    const hasBombFired = !!(s.bomb || fired.some(f => f.s === 'b'));
    const madeBomb = made.some(m => madeKind(m) === 'b');
    const madeWrap = made.some(m => madeKind(m) === 'w');
    const madeStripe = made.some(m => { const k = madeKind(m); return k === 'row' || k === 'col'; });
    const nFireSW = fired.filter(f => f.s === 'row' || f.s === 'col' || f.s === 'w').length;
    const huge = popped >= 12 || i >= 5 || (hasBombFired && (nFireSW >= 1 || i >= 2));
    if (hasBombFired || madeBomb || huge) return 'succulent';
    if (i >= 4 || nFireSW >= 1) return 'awesome';
    if (i >= 3 || madeWrap) return 'sweetas';
    if (i >= 2 || madeStripe) return 'great';
    return null;
  }

  // 1.9.169 Tasteful candy sparkle: a glossy highlight on each sweet, a few
  // staggered star glints (~0.6–1s), and a soft shimmer sweep. Cheap on a
  // phone; prefers-reduced-motion keeps the gloss and tones the motion down.
  const SPARKLE_MIN_MS = 600, SPARKLE_MAX_MS = 1000, SPARKLE_MAX = 4, SPARKLE_MAX_REDUCE = 1, SHIMMER_MS = 5200;
  function sparkleCap(reduceMotion) { return reduceMotion ? SPARKLE_MAX_REDUCE : SPARKLE_MAX; }
  function sparkleEase(p) {
    if (p <= 0 || p >= 1) return 0;
    const x = p < 0.4 ? (p / 0.4) : (1 - (p - 0.4) / 0.6);
    return x * x * (3 - 2 * x);
  }
  function shimmerAt(t) {
    const m = ((t % SHIMMER_MS) + SHIMMER_MS) % SHIMMER_MS;
    return m / SHIMMER_MS;
  }
  // A 4-point sparkle (plus a smaller diagonal cross). No audio.
  function drawStarGlint(ctx, x, y, r, a, rot) {
    if (!ctx || !(a > 0.02) || !(r > 0)) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    function cross(len, thick) {
      ctx.beginPath();
      ctx.moveTo(0, -len);
      ctx.lineTo(thick, -thick);
      ctx.lineTo(len, 0);
      ctx.lineTo(thick, thick);
      ctx.lineTo(0, len);
      ctx.lineTo(-thick, thick);
      ctx.lineTo(-len, 0);
      ctx.lineTo(-thick, -thick);
      ctx.closePath();
      ctx.fill();
    }
    cross(r, r * 0.16);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    cross(r * 0.52, r * 0.1);
    ctx.restore();
  }
  // Soft candy gloss: a sheen oval and a tiny specular, kept light so colours stay clear.
  function drawCandyShine(ctx, R, amt) {
    if (!ctx || !(R > 0)) return;
    const a = amt == null ? 1 : amt;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.42 * a) + ')';
    ctx.beginPath();
    ctx.ellipse(-R * .32, -R * .44, R * .34, R * .16, -.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * a) + ')';
    ctx.beginPath();
    ctx.ellipse(-R * .16, -R * .54, R * .09, R * .055, -.4, 0, Math.PI * 2);
    ctx.fill();
  }

  root.SugarRush = { N, KINDS, PTS, LEVEL, LEVELS, BONUS, NAMES, HOLE, MAP_W, MAP_H, MAP_STOPS, FUTURE_STOPS, stopForLevel, icingPath, nzMapSvg, rng, fromRows, toRows, findRuns, groups, specialFor, resolve, collapse, applyStep, validSwap, findMove, hasMove, shuffle, newBoard, newGame, play, starsFor, starsOf, goalsMet, jellyLeft, iceLeft, cloneState, bestMove, tryBeat, lvOf, isHole, isCandy, isIng, isBlock,
    allowed: () => !!(root.IBScores && root.IBScores.isShane && root.IBScores.isShane()),
    SCALE, SFX_MAX_HZ, SFX_LP, SFX_NOTE, SFX_MASTER, VOICE_VOL, CHIME_VOL, CHIME_DUR, VOICE_GAP, BGM_VOL, BGM_DUCK, END_VOL, MENU_VOL, XF,
    VOICE_FILES, VOICE_RANK, MEDIA_HASH, mediaUrl, gameTrack, attachSfxBus, playTone, playChime, playClip, voiceForStep,
    SPARKLE_MIN_MS, SPARKLE_MAX_MS, SPARKLE_MAX, SPARKLE_MAX_REDUCE, SHIMMER_MS, sparkleCap, sparkleEase, shimmerAt, drawStarGlint, drawCandyShine };

  if (!root.document) return;
  const doc = root.document;
  const $ = id => doc.getElementById(id);
  const ls = {
    get(k, f) { try { const v = root.localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch (e) { return f; } },
    set(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  if (!root.SugarRush.allowed()) { $('soon').hidden = false; return; }

  const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SP = reduce ? 0.35 : 1;
  let soundOn = ls.get('ib-sugar-sound', true), musicOn = ls.get('ib-sugar-music', true);
  let screen = 'map', lvNum = 1, st = null, pendingLv = 1;
  let busy = false, sel = null, down = null, lastAct = performance.now();
  let sprites = new Map(), fx = [], hintMove = null;
  let winInfo = { newBadge: false, yum: false };
  let sparkles = [], sparkleNext = 0, sparkleHoldT = null;

  function loadProg() {
    const p = ls.get('ib-sugar-progress', null) || {};
    const stars = Array.isArray(p.stars) ? p.stars.slice(0, 10) : [];
    const best = Array.isArray(p.best) ? p.best.slice(0, 10) : [];
    const badges = Array.isArray(p.badges) ? p.badges.slice(0, 10) : [];
    while (stars.length < 10) stars.push(0);
    while (best.length < 10) best.push(0);
    while (badges.length < 10) badges.push(0);
    return { open: Math.max(1, Math.min(10, p.open || 1)), stars, best, badges };
  }
  function saveProg() { ls.set('ib-sugar-progress', prog); }
  const prog = loadProg();

  // ---------- Sound: one AudioContext for voices, chime, music, menu and end songs ----------
  // 1.9.159 played the loop with a standalone HTMLAudioElement. On iOS (and some phones)
  // that media session ducks or silences Web Audio. Everything shares one context.
  // 1.9.164 adds a watchdog so music is not left muted. 1.9.165 replaces pack and
  // synth effects with spoken words and a short 3-match chime, and unlocks the
  // context on the game page itself (pointerup/touchend plus a silent buffer).
  let ac = null, out = null, clipOut = null, musicGain = null, musicSoft = null;
  let bufs = {}, loading = {}, musicSrc = null, musicSrcGain = null, musicKind = '', endSrc = null;
  let musicTok = 0, endTok = 0, endPlaying = false, endKind = '';
  let liveMusic = new Set();
  let voiceSrc = null, voiceUntil = 0, voiceRank = 0, voiceWait = null, chimeN = 0;

  function audio() {
    if (ac) { if (ac.state === 'suspended' || ac.state === 'interrupted') ac.resume().catch(() => { }); return ac; }
    const A = root.AudioContext || root.webkitAudioContext; if (!A) return null;
    ac = new A();
    const bus = attachSfxBus(ac);
    out = bus.master; clipOut = bus.clip;
    Object.keys(VOICE_FILES).forEach(k => loadBuf(k));
    musicGain = ac.createGain(); musicGain.gain.value = 1;
    musicSoft = ac.createBiquadFilter(); musicSoft.type = 'lowpass'; musicSoft.frequency.value = 2800; musicSoft.Q.value = 0.5;
    musicGain.connect(musicSoft); musicSoft.connect(ac.destination);
    return ac;
  }
  function loadBuf(kind) {
    if (bufs[kind]) return Promise.resolve(bufs[kind]);
    if (loading[kind]) return loading[kind];
    if (!audio()) return Promise.resolve(null);
    loading[kind] = fetch(mediaUrl(TRACKS[kind])).then(r => r.arrayBuffer()).then(ab => ac.decodeAudioData(ab.slice(0))).then(b => { bufs[kind] = b; return b; }).catch(() => { loading[kind] = null; return null; });
    return loading[kind];
  }
  const TRACKS = { game: 'sugar-rush-music.mp3', game1: 'sugar-rush-l1.mp3', game2: 'sugar-rush-l2.mp3', menu: 'sugar-rush-menu.mp3', win: 'sugar-rush-win.mp3', yum: 'sugar-rush-yum.mp3', yay: VOICE_FILES.yay, great: VOICE_FILES.great, awesome: VOICE_FILES.awesome, sweetas: VOICE_FILES.sweetas, succulent: VOICE_FILES.succulent };
  function volFor(kind) { return kind === 'menu' ? MENU_VOL : BGM_VOL; }
  function gameKind(level) {
    const n = level == null ? lvNum : level;
    return n === 1 ? 'game1' : n === 2 ? 'game2' : 'game';
  }
  // 1.9.171 One music controller: exactly one intended track at a time.
  // Each loop has its own gain so a ~300ms crossfade actually fades the old
  // song out instead of leaving it on the shared bus. A token cancels stale
  // async decodes. End songs stop the gameplay loop and do not let it restart
  // underneath (taps, visibility, or the watchdog).
  function trackSrc(src) {
    if (!src) return src;
    liveMusic.add(src);
    const orig = src.stop.bind(src);
    src.stop = function () {
      liveMusic.delete(src);
      try { orig.apply(src, arguments); } catch (e) { }
    };
    return src;
  }
  function fadeStop(src, gain, fade) {
    if (!src || !ac) return;
    try {
      if (fade && gain) {
        const t0 = ac.currentTime;
        gain.gain.cancelScheduledValues(t0);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t0);
        gain.gain.linearRampToValueAtTime(0.0001, t0 + fade);
        const s = src;
        setTimeout(() => { try { s.stop(); } catch (e) { } }, fade * 1000 + 40);
      } else { src.stop(); }
    } catch (e) { }
  }
  function stopLoop(fade) {
    if (musicSrc) fadeStop(musicSrc, musicSrcGain, fade);
    musicSrc = null; musicSrcGain = null; musicKind = '';
  }
  function introOpen() { const el = $('intro'); return !!(el && !el.hidden); }
  function wantKind() {
    if (endPlaying) return null;
    if (introOpen()) return 'menu';
    return screen === 'game' ? gameKind(lvNum) : 'menu';
  }
  function startLoop(kind, fade, tok) {
    if (tok != null && tok !== musicTok) return;
    if (!ac || !bufs[kind] || !musicOn || endPlaying) return;
    if (kind !== wantKind()) return;
    fade = fade == null ? XF : fade;
    if (musicSrc && musicKind === kind) return;
    if (musicSrc) fadeStop(musicSrc, musicSrcGain, fade);
    const g = ac.createGain();
    const src = trackSrc(ac.createBufferSource());
    src.buffer = bufs[kind]; src.loop = true;
    src.connect(g); g.connect(musicGain);
    const t0 = ac.currentTime, v = volFor(kind);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + Math.max(0.01, fade || 0));
    try { src.start(0); } catch (e) { return; }
    musicSrc = src; musicSrcGain = g; musicKind = kind;
  }
  function playKind(kind) {
    if (!musicOn || !audio() || endPlaying) return;
    if (!kind) kind = wantKind();
    if (!kind) return;
    const tok = ++musicTok;
    const go = () => {
      if (tok !== musicTok || !musicOn || endPlaying || kind !== wantKind()) return;
      loadBuf(kind).then(() => {
        if (tok !== musicTok || !musicOn || endPlaying || kind !== wantKind()) return;
        startLoop(kind, XF, tok);
      });
    };
    if (ac.state === 'suspended' || ac.state === 'interrupted') ac.resume().then(go).catch(() => { });
    else go();
  }
  function duckMusicBrief(dur) {
    if (!ac || !musicGain || endPlaying) return;
    dur = dur == null ? 0.35 : dur;
    const t0 = ac.currentTime;
    const duck = BGM_DUCK / BGM_VOL;
    musicGain.gain.cancelScheduledValues(t0);
    musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), t0);
    musicGain.gain.linearRampToValueAtTime(duck, t0 + 0.03);
    musicGain.gain.setValueAtTime(duck, t0 + dur);
    musicGain.gain.linearRampToValueAtTime(1, t0 + dur + 0.22);
  }
  function musicWatch() {
    if (!musicOn || (doc && doc.hidden) || !ac) return;
    if (endPlaying) return;
    if (ac.state === 'suspended' || ac.state === 'interrupted') ac.resume().catch(() => { });
    if (!musicSrc) { playKind(wantKind()); return; }
  }
  function stopEnd() {
    endTok++;
    endPlaying = false;
    endKind = '';
    if (endSrc) { try { endSrc.stop(); } catch (e) { } endSrc = null; }
  }
  function playEndSong(kind) {
    if (!musicOn || !audio()) return;
    const tok = ++endTok;
    endPlaying = true;
    endKind = kind;
    musicTok++;
    stopLoop(XF);
    const go = () => loadBuf(kind).then(b => {
      if (tok !== endTok || !b || !musicOn || !endPlaying) return;
      if (endSrc) { try { endSrc.stop(); } catch (e) { } endSrc = null; }
      const src = trackSrc(ac.createBufferSource());
      const g = ac.createGain();
      g.gain.value = END_VOL;
      src.buffer = b; src.connect(g); g.connect(musicSoft || ac.destination);
      try { src.start(0); } catch (e) { return; }
      endSrc = src;
      src.onended = () => {
        if (endSrc === src) { endSrc = null; endPlaying = false; endKind = ''; }
        // Do not auto-restart the level loop; wait for retry, next, or map.
      };
    });
    if (ac.state === 'suspended' || ac.state === 'interrupted') ac.resume().then(go).catch(() => { });
    else go();
  }
  function stopAllMusic() {
    musicTok++;
    stopEnd();
    stopLoop(0);
    if (musicGain && ac) {
      musicGain.gain.cancelScheduledValues(ac.currentTime);
      musicGain.gain.setValueAtTime(1, ac.currentTime);
    }
  }
  function setMusic(on) {
    musicOn = on; ls.set('ib-sugar-music', on); paintButtons();
    if (on) playKind(wantKind()); else stopAllMusic();
  }
  function musicState() {
    return {
      kind: musicKind, want: wantKind(), looping: !!musicSrc, endPlaying: !!endPlaying,
      endKind: endKind, endAlive: !!endSrc, live: liveMusic.size, voice: !!voiceSrc, tok: musicTok
    };
  }
  function silentUnlock(ctx) {
    if (!ctx) return;
    try {
      const z = ctx.createBuffer(1, 1, ctx.sampleRate || 44100);
      const s = ctx.createBufferSource(); s.buffer = z; s.connect(ctx.destination); s.start(0);
    } catch (e) { }
  }
  function unlockAudio() {
    if (!audio()) return;
    silentUnlock(ac);
    const p = (ac.state === 'suspended' || ac.state === 'interrupted') ? ac.resume() : Promise.resolve();
    p.then(() => { if (musicOn) playKind(wantKind()); }).catch(() => { });
  }

  function stopVoice() {
    if (voiceSrc) { try { voiceSrc.stop(); } catch (e) { } voiceSrc = null; }
  }
  function runAudio(fn) {
    if (!soundOn || !audio()) return;
    const go = () => { try { fn(); } catch (e) { } };
    silentUnlock(ac);
    if (ac.state === 'suspended' || ac.state === 'interrupted') {
      ac.resume().then(go).catch(() => { });
    } else go();
  }
  function chime() {
    runAudio(() => {
      if (!out) return;
      playChime(ac, out, ac.currentTime + 0.01, chimeN++);
    });
  }
  // Spoken callouts: never overlap, at most one every VOICE_GAP seconds, bigger word wins.
  function say(word) {
    const rank = VOICE_RANK[word] || 0;
    if (!rank) return;
    runAudio(() => {
      const t = ac.currentTime;
      if (t < voiceUntil && rank <= voiceRank) return;
      const buf = bufs[word];
      if (!buf || !clipOut) {
        // Clip may still be loading; only play it if this word is still the one we want.
        voiceWait = word;
        loadBuf(word).then(b => { if (b && soundOn && voiceWait === word) { voiceWait = null; say(word); } });
        return;
      }
      voiceWait = null;
      stopVoice();
      const dur = buf.duration || 0.6;
      voiceSrc = playClip(ac, clipOut, buf, t + 0.01, 1, VOICE_VOL);
      if (voiceSrc) voiceSrc.onended = () => { if (voiceSrc && voiceSrc.buffer === buf) voiceSrc = null; };
      voiceUntil = t + Math.max(VOICE_GAP, dur);
      voiceRank = rank;
      duckMusicBrief(Math.max(0.4, dur * 0.9));
    });
  }
  function callout(step, i) {
    const word = voiceForStep(step, step && (step.cascade || (i + 1)));
    if (word) say(word);
    else chime();
  }

  // ---------- Look ----------
  const COL = [['#ff8a9a', '#e0284a', '#9e1030'], ['#ffc078', '#f76707', '#b34700'], ['#fff3a0', '#fcc419', '#c98e00'], ['#9ff0a8', '#37b24d', '#1d7a30'], ['#a5dcff', '#228be6', '#124f99'], ['#e2b6ff', '#9c36b5', '#5f1a75']];
  const cv = $('board'), ctx = cv.getContext('2d');
  let W = 0, CS = 0, DPR = 1;
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
  function drawHeart(x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-12, -2, -8, -12, 0, -6);
    ctx.bezierCurveTo(8, -12, 12, -2, 0, 8);
    ctx.fillStyle = col; ctx.fill(); ctx.restore();
  }
  function drawSweet(t, x, y, R, sc, al, wob) {
    ctx.save(); ctx.translate(x, y); if (wob) ctx.rotate(wob); ctx.scale(sc, sc); ctx.globalAlpha = al;
    if (t.ing) {
      ctx.fillStyle = '#c45c2e'; rr(-R * .7, -R * .55, R * 1.4, R * 1.2, R * .18); ctx.fill();
      ctx.fillStyle = '#e8b04a'; rr(-R * .7, -R * .55, R * 1.4, R * .4, R * .16); ctx.fill();
      ctx.fillStyle = '#fff6c8'; ctx.fillRect(-R * .08, -R * .7, R * .16, R * 1.35);
      drawCandyShine(ctx, R * 0.85, 0.75);
      ctx.restore(); return;
    }
    if (t.ice > 0) {
      const g = ctx.createLinearGradient(-R, -R, R, R);
      g.addColorStop(0, t.ice > 1 ? 'rgba(230,248,255,.95)' : 'rgba(210,240,255,.85)');
      g.addColorStop(1, 'rgba(160,210,240,.8)');
      ctx.fillStyle = g; rr(-R * .85, -R * .85, R * 1.7, R * 1.7, R * .28); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = R * .08; rr(-R * .85, -R * .85, R * 1.7, R * 1.7, R * .28); ctx.stroke();
      drawCandyShine(ctx, R * 0.9, 0.7);
      ctx.restore(); return;
    }
    if (t.choco) {
      ctx.fillStyle = '#6b3a1f'; rr(-R * .85, -R * .85, R * 1.7, R * 1.7, R * .2); ctx.fill();
      ctx.fillStyle = '#4a2414'; rr(-R * .6, -R * .6, R * 1.2, R * 1.2, R * .12); ctx.fill();
      drawCandyShine(ctx, R * 0.85, 0.55);
      ctx.restore(); return;
    }
    if (t.c < 0) {
      const g = ctx.createRadialGradient(-R * .3, -R * .35, R * .1, 0, 0, R);
      g.addColorStop(0, '#9a6a4f'); g.addColorStop(.6, '#5b3423'); g.addColorStop(1, '#3a1f14');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * .95, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 14; i++) { const a = i * 2.39996, d = R * (.25 + .55 * ((i * 37) % 10) / 10); ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d); ctx.rotate(a * 1.7); ctx.fillStyle = COL[i % 6][1]; rr(-R * .13, -R * .05, R * .26, R * .1, R * .05); ctx.fill(); ctx.restore(); }
      drawCandyShine(ctx, R, 0.8);
      ctx.restore(); return;
    }
    const c = COL[t.c];
    if (t.c === 5) {
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
    drawCandyShine(ctx, R, 1);
    if (t.lock) {
      ctx.fillStyle = 'rgba(70,40,20,.8)'; rr(-R * .28, -R * .05, R * .56, R * .45, R * .08); ctx.fill();
      ctx.strokeStyle = 'rgba(70,40,20,.8)'; ctx.lineWidth = R * .1; ctx.beginPath(); ctx.arc(0, -R * .08, R * .2, Math.PI, 0); ctx.stroke();
    }
    ctx.restore();
  }
  function cellXY(r, c) { return [c * CS + CS / 2, r * CS + CS / 2]; }
  const now = () => performance.now();
  const easeOut = x => 1 - Math.pow(1 - x, 3), easeIn = x => x * x;
  function sprite(t, r, c) { const s = { t, r, c, y: r, x: c, sc: 1, al: 1, tw: null }; sprites.set(t.id, s); return s; }
  function moveTo(s, r, c, dur, ease) { s.tw = { fx: s.x, fy: s.y, tx: c, ty: r, t0: now(), dur: Math.max(1, dur * SP), ease: ease || easeOut }; s.r = r; s.c = c; }
  function syncAll() { sprites = new Map(); if (!st) return; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = st.board[r][c]; if (t && !isHole(t)) sprite(t, r, c); } }
  const wait = ms => new Promise(res => setTimeout(res, ms * SP));
  function fitCanvas() {
    if (!cv) return;
    const w = Math.floor(cv.getBoundingClientRect().width) || 320;
    DPR = Math.min(2.5, root.devicePixelRatio || 1);
    cv.width = Math.round(w * DPR); cv.height = cv.width; W = cv.width; CS = W / N;
  }
  function tickSparkles(t, visible) {
    const cap = sparkleCap(reduce);
    sparkles = sparkles.filter(s => (t - s.t0) < s.dur && visible.has(s.id));
    if (sparkleHoldT != null) return;
    if (sparkles.length >= cap || t < sparkleNext || !visible.size) return;
    const used = new Set(sparkles.map(s => s.id));
    const pool = [];
    for (const id of visible.keys()) if (!used.has(id)) pool.push(id);
    if (!pool.length) return;
    const id = pool[(Math.random() * pool.length) | 0];
    const dur = reduce ? SPARKLE_MAX_MS : (SPARKLE_MIN_MS + Math.random() * (SPARKLE_MAX_MS - SPARKLE_MIN_MS));
    sparkles.push({
      id,
      ox: (Math.random() - 0.5) * 0.5,
      oy: (Math.random() - 0.55) * 0.5,
      t0: t,
      dur,
      rot: Math.random() * Math.PI
    });
    sparkleNext = t + (reduce ? 900 : (160 + Math.random() * 260));
  }
  function drawShimmerSweep(t) {
    if (reduce && sparkleHoldT == null) return;
    const p = shimmerAt(t);
    const x = (p * 1.7 - 0.35) * W;
    const g = ctx.createLinearGradient(x - CS * 1.4, -CS * 0.2, x + CS * 1.4, CS * 0.5);
    const peak = reduce ? 0.04 : 0.11;
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,252,245,' + peak + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, W);
  }
  function frame() {
    if (screen === 'game' && st) {
      const t = sparkleHoldT != null ? sparkleHoldT : now();
      ctx.clearRect(0, 0, W, W);
      const sarah = st.lv && st.lv.theme === 'sarah';
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const open = isOpen(st.mask, r, c);
        if (!open) {
          if (sarah) drawHeart(c * CS + CS / 2, r * CS + CS / 2, CS * .018, 'rgba(255,140,180,.22)');
          continue;
        }
        const jelly = st.jelly ? (st.jelly[r][c] || 0) : 0;
        ctx.fillStyle = jelly >= 2 ? 'rgba(180,80,200,.35)' : jelly === 1 ? 'rgba(255,120,190,.28)' : ((r + c) % 2 ? 'rgba(255,255,255,.55)' : 'rgba(255,228,240,.7)');
        rr(c * CS + 1.5, r * CS + 1.5, CS - 3, CS - 3, CS * .18); ctx.fill();
        if (jelly) { ctx.strokeStyle = jelly >= 2 ? 'rgba(140,40,180,.55)' : 'rgba(230,70,150,.45)'; ctx.lineWidth = 2 * DPR; rr(c * CS + 4, r * CS + 4, CS - 8, CS - 8, CS * .16); ctx.stroke(); }
      }
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
      const visible = new Map();
      for (const s of sprites.values()) {
        if (s.y < -0.5 || s.al < 0.35) continue;
        visible.set(s.t.id, s);
      }
      tickSparkles(t, visible);
      drawShimmerSweep(t);
      for (const sp of sparkles) {
        const s = visible.get(sp.id);
        if (!s) continue;
        const life = sparkleEase((t - sp.t0) / sp.dur);
        if (life <= 0) continue;
        const x = s.x * CS + CS / 2 + sp.ox * R * s.sc;
        const y = s.y * CS + CS / 2 + sp.oy * R * s.sc;
        drawStarGlint(ctx, x, y, R * (0.16 + 0.14 * life) * s.sc, 0.85 * life * s.al, sp.rot);
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
    }
    try { musicWatch(); } catch (e) { }
    root.requestAnimationFrame(frame);
  }

  function paintButtons() {
    const s = soundOn ? '🔉 Sound on' : '🔇 Sound off', m = musicOn ? '🎵 Music on' : '🎵 Music off';
    if ($('soundbtn')) $('soundbtn').textContent = s;
    if ($('musicbtn')) $('musicbtn').textContent = m;
    if ($('mapsound')) $('mapsound').textContent = s;
    if ($('mapmusic')) $('mapmusic').textContent = m;
  }
  function objText(g) {
    if (!g || !g.lv) return '';
    const lv = g.lv, bits = [];
    if (lv.target) bits.push('Score ' + g.score.toLocaleString('en-NZ') + ' / ' + lv.target.toLocaleString('en-NZ'));
    if (lv.collect) bits.push((NAMES[lv.collect.color] || 'Sweets') + ' ' + (g.collected[lv.collect.color] || 0) + ' / ' + lv.collect.n);
    if (lv.jelly) bits.push('Jelly ' + jellyLeft(g) + ' left');
    if (lv.ice) bits.push('Icing ' + iceLeft(g.board) + ' left');
    if (lv.ings && lv.ings.length) bits.push('Ingredients ' + ((lv.ings.length - (g.ingsLeft || 0))) + ' / ' + lv.ings.length);
    return bits.join(' · ');
  }
  function hud() {
    if (!st) return;
    $('score').textContent = st.score.toLocaleString('en-NZ');
    $('moves').textContent = st.moves;
    $('best').textContent = Math.max(prog.best[st.lv.n - 1] || 0, st.score).toLocaleString('en-NZ');
    $('obj').textContent = objText(st);
    const stars = st.lv.stars, max = stars[2] || 1, p = Math.min(1, st.score / max);
    $('fill').style.width = (p * 100).toFixed(1) + '%';
    stars.forEach((s, i) => { const el = $('st' + i); el.style.left = (s / max * 100) + '%'; el.classList.toggle('got', st.score >= s && (s > 0 || st.won)); });
  }
  function praise(step, i) {
    const sarah = st && st.lv && st.lv.theme === 'sarah';
    const words = sarah ? ['', '', 'Lovely!', 'Sweet!', 'For Sarah!', 'Sugar rush!'] : ['', '', 'Yum!', 'Sweet!', 'Super sweet!', 'Sugar rush!'];
    return words[Math.min(words.length - 1, i + 1)];
  }

  function renderMap() {
    const stage = $('mapstage'), path = $('path'), shelf = $('shelf');
    if (stage && !stage.querySelector('svg.nzsvg')) {
      const hold = path;
      stage.insertAdjacentHTML('afterbegin', nzMapSvg());
      if (hold && hold.parentNode !== stage) stage.appendChild(hold);
    }
    const live = icingPath(MAP_STOPS);
    const future = icingPath([MAP_STOPS[MAP_STOPS.length - 1]].concat(FUTURE_STOPS));
    const wide = stage && stage.querySelector('#sr-path-wide');
    const dash = stage && stage.querySelector('#sr-path-dash');
    const fut = stage && stage.querySelector('#sr-future');
    if (wide) wide.setAttribute('d', live);
    if (dash) dash.setAttribute('d', live);
    if (fut) fut.setAttribute('d', future);
    path.innerHTML = '';
    const here = Math.min(10, Math.max(1, prog.open));
    LEVELS.forEach((lv, i) => {
      const n = i + 1, open = n <= prog.open, stars = prog.stars[i] || 0, stop = MAP_STOPS[i];
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'lv lab-' + (stop.label || 'right') + (lv.theme === 'sarah' ? ' sarah' : '') + (open ? ' open' : '') + (stars ? ' done' : '') + (n === here ? ' here' : '') + ' kind-' + (stop.kind || 'town');
      b.disabled = !open;
      b.dataset.n = String(n);
      b.style.left = (stop.x / MAP_W * 100) + '%';
      b.style.top = (stop.y / MAP_H * 100) + '%';
      const mark = stop.kind === 'house' ? '🏠' : (stop.kind === 'post' ? '✉️' : (stop.kind === 'station' ? '🚂' : ''));
      const starHtml = [0, 1, 2].map(k => '<span class="' + (k < stars ? 'on' : '') + '">★</span>').join('');
      const badge = prog.badges[i] && lv.badge ? '<span class="gotbadge" aria-hidden="true">' + lv.badge.icon + '</span>' : '';
      b.innerHTML = '<span class="pin"><span class="no">' + n + '</span>' + (mark ? '<span class="mark" aria-hidden="true">' + mark + '</span>' : '') + '</span><span class="st">' + starHtml + '</span>' +
        '<span class="meta"><b>' + stop.place + '</b><em>' + lv.name + '</em></span>' + badge;
      b.setAttribute('aria-label', (open ? 'Play ' : 'Locked: ') + 'level ' + n + ', ' + lv.name + ', ' + stop.place + (stars ? ', ' + stars + ' stars' : '') + (prog.badges[i] && lv.badge ? ', badge ' + lv.badge.name : ''));
      if (open) b.addEventListener('click', () => { unlockAudio(); openLevel(n); });
      path.appendChild(b);
    });
    FUTURE_STOPS.forEach(function (stop) {
      const el = doc.createElement('div');
      el.className = 'future-stop lab-' + (stop.label || 'right');
      el.dataset.place = stop.place;
      el.style.left = (stop.x / MAP_W * 100) + '%';
      el.style.top = (stop.y / MAP_H * 100) + '%';
      el.innerHTML = '<span class="pin"></span><span class="meta"><b>' + stop.place + '</b><em>Coming soon</em></span>';
      el.setAttribute('aria-label', 'Coming soon: ' + stop.place);
      path.appendChild(el);
    });
    shelf.innerHTML = '';
    LEVELS.forEach((lv, i) => {
      const got = !!(prog.badges[i]);
      const el = doc.createElement('div');
      el.className = 'badge' + (got ? ' got' : '') + (lv.badge && lv.badge.special ? ' heart' : '');
      el.innerHTML = '<i>' + (got ? lv.badge.icon : '·') + '</i><b>' + (got ? lv.badge.name : 'Level ' + (i + 1)) + '</b>';
      shelf.appendChild(el);
    });
  }
  function scrollMapTo(target, opts) {
    const view = $('mapview');
    if (!view) return;
    opts = opts || {};
    const motion = (opts.behavior) || (reduce ? 'auto' : 'smooth');
    let el = null, top = 0, left = 0, useEl = true;
    if (target === 'start' || target === 'north') {
      useEl = false; top = 0; left = Math.max(0, view.scrollWidth / 2 - view.clientWidth / 2);
    } else if (target === 'south') {
      const n9 = view.querySelector('.lv[data-n="9"]');
      const chch = view.querySelector('.future-stop[data-place="Christchurch"]');
      if (n9 && chch) {
        const r1 = n9.getBoundingClientRect(), r2 = chch.getBoundingClientRect(), v = view.getBoundingClientRect();
        const mid = ((r1.top + r2.bottom) / 2) - v.top + view.scrollTop;
        top = mid - v.height / 2;
        left = view.scrollLeft;
        useEl = false;
      } else {
        el = chch || view.querySelector('.lv[data-n="10"]');
      }
    } else {
      const n = target == null ? Math.min(10, Math.max(1, prog.open)) : target;
      el = view.querySelector('.lv[data-n="' + n + '"]');
    }
    if (useEl && el) {
      const r = el.getBoundingClientRect(), v = view.getBoundingClientRect();
      top = view.scrollTop + (r.top - v.top) - v.height / 2 + r.height / 2;
      left = view.scrollLeft + (r.left - v.left) - v.width / 2 + r.width / 2;
    }
    view.scrollTo({ top: Math.max(0, top), left: Math.max(0, left), behavior: motion });
    return { target: target, top: view.scrollTop, left: view.scrollLeft };
  }
  function showMap(opts) {
    stopEnd();
    screen = 'map';
    $('game').hidden = true; $('intro').hidden = true; $('end').hidden = true; $('map').hidden = false;
    doc.body.classList.remove('sarah');
    doc.body.classList.add('onmap');
    renderMap(); paintButtons();
    const scrollTo = opts && opts.scroll != null ? opts.scroll : Math.min(10, Math.max(1, prog.open));
    const behavior = (opts && opts.behavior) || (reduce ? 'auto' : 'smooth');
    const go = function () { scrollMapTo(scrollTo, { behavior: behavior }); };
    if (root.requestAnimationFrame) root.requestAnimationFrame(function () { root.requestAnimationFrame(go); });
    else go();
    if (musicOn) playKind(wantKind());
  }
  function openLevel(n) {
    const lv = LEVELS[n - 1]; if (!lv || n > prog.open) return;
    pendingLv = n;
    if (lv.intro) {
      $('introtitle').textContent = lv.intro.title;
      $('introbody').textContent = lv.intro.body;
      $('introbtn').textContent = 'Play level ' + n;
      $('intro').hidden = false;
      return;
    }
    startLevel(n);
  }
  function startLevel(n) {
    $('intro').hidden = true; $('end').hidden = true; $('map').hidden = true; $('game').hidden = false;
    doc.body.classList.remove('onmap', 'sarah');
    screen = 'game';
    lvNum = n;
    const lv = LEVELS[n - 1];
    doc.body.classList.toggle('sarah', lv.theme === 'sarah');
    $('lvname').textContent = 'Level ' + n + ' · ' + lv.name;
    $('help').textContent = lv.help;
    st = newGame({ level: lv });
    sel = null; busy = false; lastAct = now();
    fitCanvas(); syncAll(); hud();
    hintMove = findMove(st.board, st.mask);
    for (const s of sprites.values()) { s.y = s.r - N - 1 + (N - s.r) * .2; moveTo(s, s.r, s.c, 300 + (N - s.r) * 40, easeOut); }
    if (musicOn) playKind(wantKind());
  }

  async function attempt(a, z) {
    if (busy || !st || st.over) return;
    const At = st.board[a[0]][a[1]], Zt = st.board[z[0]][z[1]];
    if (!At || !Zt || isHole(At) || isHole(Zt)) return;
    sel = null; busy = true; lastAct = now(); hintMove = null;
    const A = sprites.get(At.id), Z = sprites.get(Zt.id);
    const res = play(st, a, z);
    if (A) moveTo(A, z[0], z[1], 160); if (Z) moveTo(Z, a[0], a[1], 160);
    await wait(170);
    if (!res.valid) { if (A) moveTo(A, a[0], a[1], 180); if (Z) moveTo(Z, z[0], z[1], 180); await wait(190); busy = false; return; }
    hud();
    for (let i = 0; i < res.steps.length; i++) await showStep(res.steps[i], i);
    if (res.spread) { const t = st.board[res.spread.r][res.spread.c]; if (t) { const s = sprite(t, res.spread.r, res.spread.c); s.grow = now(); } }
    if (res.shuffled) {
      addText('Shuffle!', W / 2, W / 2, 30, '#fff'); await wait(450);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const t = st.board[r][c]; if (!t || isHole(t)) continue;
        const s = sprites.get(t.id) || sprite(t, r, c); moveTo(s, r, c, 420);
      }
      await wait(440);
    }
    hud();
    hintMove = findMove(st.board, st.mask);
    busy = false; lastAct = now();
    if (st.over) finish();
  }
  function addText(str, x, y, size, col) { fx.push({ type: 'text', str, x, y, size, col, t0: now(), dur: 900 * SP }); }
  async function showStep(s, i) {
    const t = now();
    let cx = 0, cy = 0, n = 0;
    for (const p of s.popped) {
      const sp = sprites.get(p.id); if (sp) sp.pop = t;
      const [x, y] = cellXY(p.r, p.c); cx += x; cy += y; n++;
      if (p.color >= 0 && !reduce) for (let k = 0; k < 4; k++) { const a = Math.random() * Math.PI * 2; fx.push({ type: 'bit', x, y, vx: Math.cos(a) * .6, vy: Math.sin(a) * .6 - .3, col: COL[p.color][1], t0: t, dur: 480 }); }
    }
    for (const f of s.fired || []) {
      if (f.s === 'row' || f.s === 'col') fx.push({ type: 'beam', s: f.s, r: f.r, c: f.c, t0: t, dur: 420 * SP });
      else { const [x, y] = cellXY(f.r, f.c); fx.push({ type: 'ring', x, y, t0: t, dur: 480 * SP }); }
    }
    callout(s, i);
    if (n) addText('+' + s.points, cx / n, cy / n, 22, '#fff');
    const word = (s.fired && s.fired.length) ? (i >= 1 ? praise(s, i + 1) : 'Pow!') : praise(s, i);
    if (word) addText(word, W / 2, W * .42, 34, '#ffe066');
    for (const m of s.madeTiles || []) { const sp = sprite(m.t, m.r, m.c); sp.grow = t; }
    if (s.delivered) for (const d of s.delivered) { const sp = sprites.get(d.t.id); if (sp) sp.pop = t; addText('Got it!', cellXY(d.r, d.c)[0], cellXY(d.r, d.c)[1], 20, '#ffe066'); }
    await wait(230);
    let longest = 0;
    for (const f of s.falls || []) {
      let sp = sprites.get(f.t.id);
      if (!sp || sp.pop) { sp = sprite(f.t, f.from, f.c); }
      const d = f.r - (f.fresh ? f.from : sp.y), dur = 120 + 70 * Math.sqrt(Math.max(1, Math.abs(d)));
      longest = Math.max(longest, dur);
      moveTo(sp, f.r, f.c, dur, easeIn);
    }
    hud();
    await wait(longest + 40);
  }
  function recordWin(g) {
    const i = g.lv.n - 1;
    const prevStars = prog.stars[i] || 0;
    const hadBadge = !!(prog.badges[i]);
    const newBadge = !hadBadge;
    const stars = g.stars || 0;
    if (stars > prog.stars[i]) prog.stars[i] = stars;
    if (g.score > (prog.best[i] || 0)) prog.best[i] = g.score;
    if (newBadge) prog.badges[i] = 1;
    if (g.lv.n >= prog.open && g.lv.n < 10) prog.open = g.lv.n + 1;
    saveProg();
    const firstThree = stars === 3 && prevStars < 3;
    // Yum! when a new badge is earned (first win) or the first 3-star on a level;
    // Sweet Sparkle for a later ordinary win.
    return { newBadge, yum: newBadge || firstThree, firstThree, stars };
  }
  function finish() {
    const won = st.won;
    if (st.score > (prog.best[st.lv.n - 1] || 0)) { prog.best[st.lv.n - 1] = st.score; saveProg(); }
    winInfo = won ? recordWin(st) : { newBadge: false, yum: false, stars: 0 };
    if (won) say('yay');
    if (won && musicOn) setTimeout(() => { if (musicOn) playEndSong(winInfo.yum ? 'yum' : 'win'); }, 480);
    setTimeout(() => showEnd(), 500 * SP);
  }
  function showEnd() {
    if (!st) return;
    const won = st.won, n = st.stars || 0, lv = st.lv;
    $('endtitle').textContent = won ? (lv.theme === 'sarah' ? "Sarah's level complete!" : ('Level ' + lv.n + ' complete!')) : 'So close!';
    $('endstars').innerHTML = [0, 1, 2].map(i => '<span class="' + (i < n ? 'on' : '') + '">★</span>').join('');
    $('endscore').textContent = st.score.toLocaleString('en-NZ') + ' points';
    const badgeWrap = $('endbadge'), cap = $('endbadgecap');
    if (won && winInfo.newBadge) {
      const b = lv.badge;
      badgeWrap.hidden = false; cap.hidden = false;
      badgeWrap.className = 'winbadge soft' + (b.special ? ' heart' : '');
      badgeWrap.textContent = b.icon;
      cap.textContent = 'New badge: ' + b.name;
    } else { badgeWrap.hidden = true; cap.hidden = true; }
    if (won) {
      const extra = n === 3 ? 'Three stars!' : n === 2 ? 'Two stars.' : 'One star.';
      const next = lv.n < 10 ? ' Level ' + (lv.n + 1) + ' is open.' : ' You have finished every level in the shop.';
      $('endmsg').textContent = extra + next;
    } else {
      const bits = [];
      if (lv.target) bits.push('you needed ' + lv.target.toLocaleString('en-NZ') + ' points');
      if (lv.collect) bits.push('you needed ' + lv.collect.n + ' ' + (NAMES[lv.collect.color] || 'sweets').toLowerCase());
      if (lv.jelly) bits.push('some jelly is still on the tray');
      if (lv.ice) bits.push('some icing is still in the way');
      if (lv.ings && lv.ings.length) bits.push('an ingredient did not make it down');
      $('endmsg').textContent = bits.length ? ('Not quite — ' + bits.join(', ') + '. Have another go!') : 'Have another go!';
    }
    $('againbtn').textContent = won ? 'Play again' : 'Try again';
    $('nextbtn').hidden = !(won && lv.n < 10);
    $('end').hidden = false;
  }
  function leaveEnd() { stopEnd(); $('end').hidden = true; }
  function restart() {
    leaveEnd();
    startLevel(lvNum);
  }
  function goNext() {
    leaveEnd();
    if (lvNum < 10) openLevel(lvNum + 1);
    else showMap();
    if (musicOn) playKind(wantKind());
  }
  function backToMap() {
    leaveEnd();
    showMap();
  }

  function cellAt(e) {
    if (!st) return null;
    const b = cv.getBoundingClientRect();
    const c = Math.floor((e.clientX - b.left) / b.width * N), r = Math.floor((e.clientY - b.top) / b.height * N);
    if (r < 0 || r >= N || c < 0 || c >= N) return null;
    if (!isOpen(st.mask, r, c) || isHole(st.board[r][c])) return null;
    return [r, c];
  }
  cv.addEventListener('pointerdown', e => { unlockAudio(); const p = cellAt(e); if (!p) return; down = { p, x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch (er) { } e.preventDefault(); });
  cv.addEventListener('pointermove', e => {
    if (!down || busy) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y, cell = cv.getBoundingClientRect().width / N;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < cell * .32) return;
    const a = down.p, z = Math.abs(dx) > Math.abs(dy) ? [a[0], a[1] + Math.sign(dx)] : [a[0] + Math.sign(dy), a[1]];
    down = null;
    if (z[0] >= 0 && z[0] < N && z[1] >= 0 && z[1] < N) attempt(a, z);
  });
  cv.addEventListener('pointerup', e => {
    unlockAudio();
    if (!down) return; const p = down.p; down = null; if (busy) return;
    if (sel && adj(sel, p)) attempt(sel, p);
    else if (sel && sel[0] === p[0] && sel[1] === p[1]) sel = null;
    else { sel = p; }
    lastAct = now();
  });
  cv.addEventListener('touchend', unlockAudio, { passive: true });
  cv.addEventListener('pointercancel', () => { down = null; });

  function toggleSound() { soundOn = !soundOn; ls.set('ib-sugar-sound', soundOn); paintButtons(); unlockAudio(); }
  $('soundbtn').addEventListener('click', toggleSound);
  $('mapsound').addEventListener('click', toggleSound);
  $('musicbtn').addEventListener('click', () => setMusic(!musicOn));
  $('mapmusic').addEventListener('click', () => setMusic(!musicOn));
  $('restartbtn').addEventListener('click', restart);
  $('againbtn').addEventListener('click', restart);
  $('nextbtn').addEventListener('click', goNext);
  $('mapbtn').addEventListener('click', backToMap);
  $('endmap').addEventListener('click', backToMap);
  $('introbtn').addEventListener('click', () => { unlockAudio(); startLevel(pendingLv); });
  doc.addEventListener('pointerdown', unlockAudio, { passive: true });
  doc.addEventListener('pointerup', unlockAudio, { passive: true });
  doc.addEventListener('touchend', unlockAudio, { passive: true });
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) { if (ac) ac.suspend().catch(() => { }); }
    else {
      if (ac && (soundOn || musicOn)) ac.resume().catch(() => { });
      if (musicOn && !doc.hidden) playKind(wantKind());
    }
  });
  root.addEventListener('pagehide', () => { stopAllMusic(); if (ac) ac.close().catch(() => { }); });
  root.addEventListener('resize', fitCanvas);

  paintButtons();
  showMap();
  root.requestAnimationFrame(frame);

  root.SugarRush.ui = {
    state: () => st, attempt, showEnd, showMap, scrollMapTo, openLevel, startLevel, progress: () => prog,
    say, chime, callout, unlockAudio, audio,
    clipsReady: () => Object.keys(VOICE_FILES).every(k => !!bufs[k]),
    setSound(on) { soundOn = !!on; ls.set('ib-sugar-sound', soundOn); paintButtons(); },
    setScore(n) { if (!st) return; st.score = n; st.moves = 0; st.over = true; st.won = goalsMet(st) || n >= (st.target || 0); st.stars = starsOf(st); hud(); },
    previewWin(opts) { opts = opts || {}; const n = opts.level || (st && st.lv && st.lv.n) || 2; if (!st || st.lv.n !== n) startLevel(n); st.score = opts.score || Math.max(st.lv.stars[2] || 0, 2400); st.moves = Math.max(st.moves, 1); st.won = true; st.over = true; st.stars = opts.stars || 3; if (opts.resetBadge) prog.badges[n - 1] = 0; winInfo = recordWin(st); hud(); showEnd(); },
    view: () => ({ score: st && st.score, moves: st && st.moves, busy, soundOn, musicOn, screen, level: st && st.lv && st.lv.n, acState: ac && ac.state, sparkles: sparkles.length, hold: sparkleHoldT != null }),
    musicState, playKind, wantKind, playEndSong, stopAllMusic, stopEnd, gameKind, setMusic,
    // Freeze a sparkling board for screenshots (settled pieces, mid-sweep, a few glints at peak).
    previewSparkle(opts) {
      opts = opts || {};
      startLevel(opts.level || 1);
      musicOn = false; soundOn = false; paintButtons();
      try { stopAllMusic(); } catch (e) { }
      if (st && st.board && opts.specials !== false) {
        const cells = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (isCandy(st.board[r][c])) cells.push([r, c]);
        if (cells[10]) st.board[cells[10][0]][cells[10][1]].s = 'w';
        if (cells[18]) st.board[cells[18][0]][cells[18][1]].s = 'row';
        if (cells[25]) st.board[cells[25][0]][cells[25][1]].s = 'col';
        if (cells[33]) st.board[cells[33][0]][cells[33][1]] = mk(-1, 'b');
      }
      syncAll();
      for (const s of sprites.values()) { s.tw = null; s.pop = 0; s.grow = 0; s.x = s.c; s.y = s.r; s.sc = 1; s.al = 1; }
      lastAct = now();
      const want = opts.sweep != null ? opts.sweep : 0.48;
      sparkleHoldT = Math.floor(now() / SHIMMER_MS) * SHIMMER_MS + want * SHIMMER_MS;
      const ids = [...sprites.values()];
      const picks = opts.glints || [1, 8, 19, 28];
      sparkles = picks.slice(0, sparkleCap(false)).map((idx, i) => {
        const s = ids[idx % Math.max(1, ids.length)];
        return {
          id: s.t.id,
          ox: [-0.18, 0.22, -0.06, 0.14][i] || 0,
          oy: [-0.28, 0.08, 0.24, -0.16][i] || 0,
          t0: sparkleHoldT - 800 * 0.4,
          dur: 800,
          rot: i * 0.7
        };
      });
      return { level: st.lv.n, sparkles: sparkles.length, sweep: want };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
