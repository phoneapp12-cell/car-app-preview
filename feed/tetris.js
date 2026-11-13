/* Shane's Tetris, copied into Info Book so it plays on this phone with no sign-in.
   Same board, pieces, scoring, hold, music and touch controls as his page.
   The page is not loaded until Play, and closing it throws this document away. */
(function (root) {
  const COLS = 10, ROWS = 20, CELL = 28;
  const FONT = 'ui-sans-serif, system-ui, sans-serif';
  const SHAPES = [
    [],
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]],
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
    [[4, 4], [4, 4]],
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
  ];
  const COLORS = ['', '#22d3ee', '#3b82f6', '#f97316', '#facc15', '#22c55e', '#a855f7', '#ef4444'];
  const LINE_POINTS = [0, 100, 300, 500, 800];
  const LINE_WORDS = ['', 'Single', 'Double', 'Triple', 'TETRIS!'];

  let ac = null, sfxGain = null, musicGain = null, soundOn = true, musicOn = true;
  let nextNoteTime = 0, noteIdx = 0, melodyBus = null, noiseBuf = null;
  // 1.9.155 Mix: game sounds sit ~6 dB above the music, still soft and low.
  // Tracks m0–m11 mean file RMS 0.190. Music at BGM_VOL 0.44 → RMS 0.0836 (−21.6 dB).
  // A musical note peak is SFX_NOTE * SFX_MASTER = 0.24, sine RMS 0.170 (−15.4 dB) → +6.2 dB vs music.
  // (Was 0.08 * 0.48 = 0.0384 peak, RMS 0.027, about 11 dB below the music at volume 0.5.)
  // Line clears duck the music 35%. A limiter on the SFX bus stops overlapping notes clipping.
  const BGM_VOL = 0.44, BGM_DUCK = 0.286, SFX_MASTER = 0.96, SFX_NOTE = 0.25;

  function ensureAudio() {
    try {
      if (!ac) {
        const Ctor = root.AudioContext || root.webkitAudioContext;
        if (!Ctor) return;
        ac = new Ctor();
        sfxGain = ac.createGain();
        sfxGain.gain.value = SFX_MASTER;
        const sfxSoft = ac.createBiquadFilter(); // take the sharp top off every sound
        sfxSoft.type = 'lowpass'; sfxSoft.frequency.value = 1400;
        const sfxLim = ac.createDynamicsCompressor();
        sfxLim.threshold.value = -4;
        sfxLim.knee.value = 4;
        sfxLim.ratio.value = 20;
        sfxLim.attack.value = 0.003;
        sfxLim.release.value = 0.15;
        const sfxCeil = ac.createWaveShaper(); // hard ceiling so compressor makeup cannot clip
        const curve = new Float32Array(2048);
        for (let i = 0; i < curve.length; i++) {
          const x = i / 1024 - 1;
          const a = Math.abs(x);
          curve[i] = a <= 0.9 ? x : Math.sign(x) * (0.9 + 0.08 * Math.tanh((a - 0.9) / 0.1));
        }
        sfxCeil.curve = curve;
        sfxGain.connect(sfxSoft); sfxSoft.connect(sfxLim); sfxLim.connect(sfxCeil); sfxCeil.connect(ac.destination);
        musicGain = ac.createGain();
        musicGain.gain.value = 0.26;
        const musicSoft = ac.createBiquadFilter();
        musicSoft.type = 'lowpass'; musicSoft.frequency.value = 1100;
        musicGain.connect(musicSoft); musicSoft.connect(ac.destination);
        melodyBus = ac.createGain();
        melodyBus.gain.value = 1;
        melodyBus.connect(musicGain);
        const delay = ac.createDelay(1);
        delay.delayTime.value = 0.45;
        const fb = ac.createGain();
        fb.gain.value = 0.4;
        const wet = ac.createGain();
        wet.gain.value = 0.45;
        const tone_ = ac.createBiquadFilter();
        tone_.type = 'lowpass';
        tone_.frequency.value = 2600;
        melodyBus.connect(delay);
        delay.connect(tone_);
        tone_.connect(fb);
        fb.connect(delay);
        tone_.connect(wet);
        wet.connect(musicGain);
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const ch = noiseBuf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
        nextNoteTime = ac.currentTime + 0.1;
        ensureLuGain();
        loadLevelUp();
        ensureGoGain();
        loadGameOver();
        ensureCcGain();
        loadLineClear();
        ensureVoGain();
        loadCallouts();
        ensureRotGain();
        ensureHsGain();
        loadHighScore();
      }
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { /* no audio */ }
  }
  function tone(freq, dur, type, vol, delay, slideTo, dest, at) {
    if (!ac || !dest) return;
    const t0 = at !== undefined ? at : ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  // Themes cycle every level. Level 4 (theme 1) is Fireworks as of 1.9.180.
  const SEMI = { C: 0, CS: 1, D: 2, DS: 3, E: 4, F: 5, FS: 6, G: 7, GS: 8, A: 9, AS: 10, B: 11 };
  function nf(n) {
    const oct = parseInt(n.slice(-1), 10);
    const midi = 12 * (oct + 1) + SEMI[n.slice(0, -1)];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  const THEMES = [
    { name: 'Beach', beat: 0.7, pad: 'sine', ambient: 'wave', critter: 'gull', pitch: 1, sfx: 'sine',
      chords: [['F3', 'A3', 'C4', 'E4'], ['C3', 'G3', 'B3', 'E4'], ['A2', 'E3', 'G3', 'C4'], ['G2', 'D3', 'G3', 'B3']],
      bells: ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'] },
    { name: 'Fireworks', beat: 0.7, pad: 'triangle', ambient: 'none', critter: 'bird', pitch: 1.122, sfx: 'triangle',
      chords: [['D3', 'A3', 'D4', 'FS4'], ['B2', 'FS3', 'A3', 'D4'], ['G2', 'D3', 'B3', 'D4'], ['A2', 'E3', 'A3', 'CS4']],
      bells: ['D5', 'E5', 'FS5', 'A5', 'B5', 'D6'] },
    { name: 'Ocean', beat: 0.9, pad: 'sine', ambient: 'wave', critter: ['dolphin', 'whale'], pitch: 0.794, sfx: 'sine',
      chords: [['D2', 'A2', 'F3', 'C4'], ['AS1', 'F2', 'D3', 'A3'], ['G2', 'D3', 'AS3', 'D4'], ['A2', 'E3', 'G3', 'CS4']],
      bells: ['D4', 'F4', 'G4', 'A4', 'C5', 'D5'] },
    { name: 'Bush walk', beat: 0.75, pad: 'triangle', ambient: 'wind', critter: ['tui', 'bird'], pitch: 0.891, sfx: 'triangle',
      chords: [['AS2', 'F3', 'A3', 'D4'], ['G2', 'D3', 'F3', 'AS3'], ['DS3', 'AS3', 'D4', 'G4'], ['F2', 'C3', 'F3', 'A3']],
      bells: ['AS4', 'C5', 'D5', 'F5', 'G5', 'AS5'] },
    { name: 'City', beat: 0.6, pad: 'triangle', ambient: 'traffic', critter: 'chime', pitch: 1.059, sfx: 'triangle',
      chords: [['A2', 'E3', 'G3', 'C4'], ['D3', 'A3', 'C4', 'F4'], ['G2', 'D3', 'F3', 'B3'], ['C3', 'G3', 'B3', 'E4']],
      bells: ['A4', 'C5', 'D5', 'E5', 'G5', 'A5'] },
    { name: 'Night sky', beat: 0.95, pad: 'sine', ambient: 'shimmer', critter: 'twinkle', pitch: 1.335, sfx: 'sine',
      chords: [['E3', 'B3', 'DS4', 'GS4'], ['CS3', 'GS3', 'B3', 'E4'], ['A2', 'E3', 'GS3', 'CS4'], ['B2', 'FS3', 'A3', 'DS4']],
      bells: ['E5', 'FS5', 'GS5', 'B5', 'CS6', 'E6'] },
    { name: 'Farmyard', beat: 0.55, pad: 'triangle', ambient: 'none', critter: 'farm', bouncy: true, pitch: 1, sfx: 'triangle',
      chords: [['G2', 'D3', 'G3', 'B3'], ['C3', 'G3', 'C4', 'E4'], ['E2', 'B2', 'G3', 'B3'], ['D3', 'A3', 'D4', 'FS4']],
      bells: ['G4', 'A4', 'B4', 'D5', 'E5', 'G5'] },
    { name: 'Space travel', beat: 1, pad: 'sine', ambient: 'none', critter: 'whale', pitch: 0.75, sfx: 'sine',
      chords: [['C3', 'G3', 'B3', 'E4'], ['A2', 'E3', 'G3', 'B3'], ['F2', 'C3', 'E3', 'A3'], ['G2', 'D3', 'FS3', 'B3']],
      bells: ['B4', 'C5', 'E5', 'G5', 'A5', 'B5'] },
    { name: 'Triangles', beat: 0.65, pad: 'triangle', ambient: 'none', critter: 'none', pitch: 1.19, sfx: 'sine',
      chords: [['E3', 'B3', 'E4', 'G4'], ['C3', 'G3', 'C4', 'E4'], ['D3', 'A3', 'D4', 'FS4'], ['B2', 'FS3', 'B3', 'D4']],
      bells: ['E5', 'FS5', 'G5', 'B5', 'D6', 'E6'] },
    { name: 'New Zealand', beat: 0.75, pad: 'sine', ambient: 'wave', critter: 'tui', pitch: 0.94, sfx: 'sine',
      chords: [['F2', 'C3', 'F3', 'A3'], ['D3', 'A3', 'D4', 'F4'], ['AS2', 'F3', 'AS3', 'D4'], ['C3', 'G3', 'C4', 'E4']],
      bells: ['F4', 'G4', 'A4', 'C5', 'D5', 'F5'] },
    { name: 'Snowy mountains', beat: 0.9, pad: 'sine', ambient: 'wind', critter: 'none', pitch: 1.06, sfx: 'sine',
      chords: [['A2', 'E3', 'A3', 'C4'], ['F2', 'C3', 'F3', 'A3'], ['C3', 'G3', 'C4', 'E4'], ['G2', 'D3', 'G3', 'B3']],
      bells: ['A4', 'C5', 'D5', 'E5', 'G5', 'A5'] },
    { name: 'Jeremiah was a bullfrog', beat: 0.6, pad: 'triangle', ambient: 'none', critter: 'none', pitch: 0.9, sfx: 'triangle',
      chords: [['G2', 'D3', 'G3', 'B3'], ['C3', 'G3', 'C4', 'E4'], ['D3', 'A3', 'D4', 'FS4'], ['G2', 'D3', 'G3', 'B3']],
      bells: ['G4', 'A4', 'B4', 'D5', 'E5', 'G5'] }
  ];
  // Colours and see-through backgrounds for each theme (same order as THEMES).
  const LOOKS = [
    { colors: ['#22d3ee', '#0ea5e9', '#fb923c', '#fde047', '#2dd4bf', '#f472b6', '#f87171'], bg: 'linear-gradient(180deg,#38bdf8 0%,#7dd3fc 45%,#fcd34d 85%,#f5d08a 100%)', board: 'rgba(8,47,73,0.5)' },
    { colors: ['#facc15', '#f472b6', '#22d3ee', '#a855f7', '#4ade80', '#fb923c', '#f43f5e'], bg: '#000', board: 'rgba(4,6,16,0.52)' },
    { colors: ['#22d3ee', '#3b82f6', '#06b6d4', '#a5f3fc', '#14b8a6', '#818cf8', '#38bdf8'], bg: 'linear-gradient(180deg,#0b8fb0 0%,#065a82 40%,#03263f 100%)', board: 'rgba(2,20,36,0.55)' },
    { colors: ['#a3e635', '#65a30d', '#d97706', '#fbbf24', '#4ade80', '#b45309', '#e11d48'], bg: 'linear-gradient(180deg,#365314 0%,#1a2e05 55%,#3b2a14 100%)', board: 'rgba(16,20,6,0.55)' },
    { colors: ['#f472b6', '#22d3ee', '#a855f7', '#facc15', '#34d399', '#fb923c', '#60a5fa'], bg: 'linear-gradient(180deg,#0f172a 0%,#312e81 55%,#831843 100%)', board: 'rgba(10,10,25,0.55)' },
    { colors: ['#e0e7ff', '#a78bfa', '#fde68a', '#facc15', '#93c5fd', '#c4b5fd', '#f9a8d4'], bg: 'radial-gradient(1px 1px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 70% 15%,#fff,transparent),radial-gradient(1.5px 1.5px at 45% 60%,#fff,transparent),radial-gradient(1px 1px at 85% 75%,#fff,transparent),linear-gradient(180deg,#020617 0%,#1e1b4b 60%,#312e81 100%)', board: 'rgba(5,6,25,0.5)' },
    { colors: ['#facc15', '#ef4444', '#84cc16', '#fb923c', '#22c55e', '#f472b6', '#60a5fa'], bg: 'linear-gradient(180deg,#3b82f6 0%,#93c5fd 45%,#65a30d 100%)', board: 'rgba(20,40,10,0.5)' },
    { colors: ['#c084fc', '#f472b6', '#22d3ee', '#fb923c', '#a3e635', '#818cf8', '#fde047'], bg: 'linear-gradient(180deg,#1e1b4b 0%,#581c87 55%,#0f172a 100%)', board: 'rgba(15,10,40,0.55)' },
    { colors: ['#f43f5e', '#f59e0b', '#14b8a6', '#facc15', '#a855f7', '#06b6d4', '#ec4899'], bg: 'linear-gradient(135deg,#0f766e 0%,#7e22ce 50%,#ea580c 100%)', board: 'rgba(20,10,40,0.5)' },
    { colors: ['#ef4444', '#14b8a6', '#22c55e', '#facc15', '#38bdf8', '#e5e7eb', '#f97316'], bg: 'linear-gradient(180deg,#2563eb 0%,#22d3ee 45%,#15803d 100%)', board: 'rgba(5,30,30,0.5)' },
    { colors: ['#e0f2fe', '#93c5fd', '#f9a8d4', '#fde68a', '#5eead4', '#c4b5fd', '#fca5a5'], bg: 'linear-gradient(180deg,#f9a8d4 0%,#818cf8 45%,#1e3a8a 100%)', board: 'rgba(15,23,60,0.5)' },
    { colors: ['#4ade80', '#16a34a', '#f472b6', '#facc15', '#22d3ee', '#a3e635', '#fb923c'], bg: 'linear-gradient(180deg,#fb923c 0%,#f472b6 35%,#0e7490 70%,#14532d 100%)', board: 'rgba(5,30,20,0.5)' }
  ];
  // Colourful picture behind each theme (same order as THEMES), softened with a dark veil so the blocks stand out.
  const PICS = THEMES.map((_, i) => 'tetris-bg/' + i + '.webp');
  let themeIdx = 0;
  // Level order (indexes into THEMES): Farmyard, Jeremiah was a bullfrog, Beach, Fireworks, City, Ocean, Bush walk, New Zealand, Snowy mountains, Night sky, Space travel, Triangles last.
  // 1.9.188: City (theme 4) moved to level 5; Ocean and the levels after it shift down one.
  // 1.9.192: Space travel is level 11; Triangles is last (level 12).
  const ORDER = [6, 11, 0, 1, 4, 2, 3, 9, 10, 5, 7, 8];
  function themeFor(level) { return ORDER[(Math.max(1, level) - 1) % ORDER.length]; }
  function stages() { return ORDER.map((ti, i) => ({ level: i + 1, theme: ti, name: THEMES[ti].name })); }
  function shouldSubmit(gm) { return !!(gm && !gm.practice && gm.score > 0); }
  // 1.9.151 Triangle Tetris (theme 8, level 11, second to last): blocks are triangles, and only two colours at a time.
  // 1.9.192: Triangles is the last level (level 12).
  // Red and blue for the first 5 lines of the level, then pink and lime after half the lines needed (5 of 10).
  const TRI_THEME = 8;
  const TRI_PAL = { early: ['#e25b62', '#4e88d6'], late: ['#ef8cba', '#8dce5c'] };
  function triangleLate(lines) { return (Math.max(0, lines | 0) % 10) >= 5; }
  function trianglePalette(lines, level) {
    if (themeFor(level == null ? 1 : level) !== TRI_THEME) return null;
    return triangleLate(lines) ? TRI_PAL.late : TRI_PAL.early;
  }
  function blockColor(t, lines, level) {
    if (!t) return '';
    const pal = trianglePalette(lines, level);
    return pal ? pal[(t - 1) % 2] : COLORS[t];
  }
  // 1.9.150 Space travel (theme 7, last level) plays like Space Invaders: bombs only clear one settled block,
  // 1.9.192: Space travel is level 11; Triangles is last.
  // never the falling piece, and blocks above do not drop.
  // 1.9.154 First bomb comes in 4–6s, then every 6–10s, aiming at columns with blocks.
  const SPACE_THEME = 7;
  // 1.9.188 Space travel bomb cadence, easy to tune. Seconds between drops
  // (first and later use the same window). Up to BOMB_MAX bombs in the air.
  // A locked block cell is knocked out after BOMB_HITS hits (a "piece" here is one cell).
  const BOMB_EVERY = [0.8, 1.6];
  const BOMB_MAX = 4;
  const BOMB_HITS = 3;
  function bombWaitRange(level, first) {
    return BOMB_EVERY.slice();
  }
  function bombWait(level, first) {
    const [lo, hi] = bombWaitRange(level, first);
    return (lo + Math.random() * Math.max(0, hi - lo)) * 1000;
  }
  function ensureHits(g) {
    if (!g.hits || g.hits.length !== ROWS) g.hits = emptyBoard();
    return g.hits;
  }
  function cellHits(g, c, r) {
    if (!g || !g.hits || r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
    return g.hits[r][c] || 0;
  }
  function dropRows(grid, rows, fill) {
    fill = fill || 0;
    const next = (grid || emptyBoard()).filter((_, i) => rows.indexOf(i) < 0);
    while (next.length < ROWS) next.unshift(Array(COLS).fill(fill));
    return next;
  }
  function pieceCovers(g, c, r) {
    const p = g.piece;
    if (!p || g.over || r < 0) return false;
    const mr = r - p.y, mc = c - p.x;
    return !!(p.m[mr] && p.m[mr][mc]);
  }
  function applyBombHit(g, c, r) {
    if (r < 0) return 'sky';
    if (r >= ROWS || c < 0 || c >= COLS) return 'gone';
    if (pieceCovers(g, c, r)) return 'piece';
    if (g.board[r][c]) {
      const hits = ensureHits(g);
      hits[r][c] = (hits[r][c] || 0) + 1;
      if (hits[r][c] >= BOMB_HITS) {
        g.board[r][c] = 0;
        hits[r][c] = 0;
        return 'block';
      }
      return 'chip';
    }
    return 'empty';
  }
  // Invader motion and bombs, kept here so tests can run it without a page.
  const INV_PX = 2, INV_GAP = 48, INV_COUNT = 5;
  const INV_W = 11 * INV_PX, INV_H = 8 * INV_PX;
  const BOMB_VY = 3 * CELL; // px/s: slow enough to watch, fast enough to hit a stack within ~12s
  function newInvaders() {
    return { ready: false, x: 12, dir: 1, wait: 0, bombs: [], boom: [], t: 0, first: true };
  }
  function resetInvaders(inv, level) {
    inv.ready = true; inv.x = 12; inv.dir = 1; inv.bombs = []; inv.boom = []; inv.t = 0; inv.first = true;
    inv.wait = themeFor(level) === SPACE_THEME ? bombWait(level, true) : 0;
    return inv;
  }
  function seedInvaders(inv, g, opts) {
    opts = opts || {};
    if (themeFor(g.level) !== SPACE_THEME) { inv.ready = false; inv.bombs = []; inv.boom = []; return inv; }
    resetInvaders(inv, g.level);
    inv.wait = 1e9; // still picture for screenshots: no bombs drop
    if (opts.invX != null) inv.x = opts.invX;
    if (opts.bomb) inv.bombs.push(opts.bomb);
    if (opts.bombs) inv.bombs = inv.bombs.concat(opts.bombs);
    if (opts.boom) inv.boom = opts.boom.slice();
    return inv;
  }
  function makeBombParts(c, r) {
    const parts = [];
    const cx = c * CELL + CELL / 2, cy = r * CELL + CELL / 2;
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * 6.283 + Math.random() * 0.35;
      const sp = 36 + Math.random() * 80;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 18, t: 1, col: i % 2 ? '#f3d7a0' : '#e8b86a', sz: 1.6 + Math.random() * 1.8 });
    }
    return parts;
  }
  function dropBomb(inv, g) {
    // Random invader, so the column varies with their drift; empty columns miss harmlessly.
    const i = (Math.random() * INV_COUNT) | 0;
    const cx = inv.x + i * INV_GAP + INV_W / 2;
    const col = Math.max(0, Math.min(COLS - 1, Math.floor(cx / CELL)));
    inv.bombs.push({ x: cx, y: INV_H + 10, col: col, vy: BOMB_VY, from: i });
  }
  function moveBombs(inv, g, dt, onThump) {
    const keep = [];
    for (const b of inv.bombs) {
      const from = Math.floor(b.y / CELL);
      b.y += b.vy * dt / 1000;
      const to = Math.floor(b.y / CELL);
      let dead = false;
      for (let r = from; r <= to; r++) {
        const hit = applyBombHit(g, b.col, r);
        if (hit === 'block' || hit === 'chip') {
          if (hit === 'block') {
            inv.boom.push({ c: b.col, r: r, t: 480, kind: 'out', parts: makeBombParts(b.col, r) });
            if (onThump) onThump('boom');
          } else {
            inv.boom.push({ c: b.col, r: r, t: 240, kind: 'chip' });
            if (onThump) onThump('thump');
          }
          dead = true;
          break;
        }
        if (hit === 'gone') { dead = true; break; }
        // 'piece' and 'empty' and 'sky': the bomb keeps falling (never hits the falling piece).
      }
      if (!dead && b.y < ROWS * CELL + 10) keep.push(b);
    }
    inv.bombs = keep;
  }
  function stepInvaders(inv, g, dt, flags) {
    flags = flags || {};
    if (themeFor(g.level) !== SPACE_THEME) { if (inv.ready) { inv.ready = false; inv.bombs = []; inv.boom = []; } return inv; }
    if (!inv.ready) resetInvaders(inv, g.level);
    inv.t += dt;
    if (flags.demo || g.demo) return inv;
    if (inv.boom.length) {
      for (const e of inv.boom) {
        e.t -= dt;
        if (e.parts) {
          const k = dt / 1000;
          for (const p of e.parts) { p.x += p.vx * k; p.y += p.vy * k; p.vy += 90 * k; }
        }
      }
      inv.boom = inv.boom.filter(e => e.t > 0);
    }
    const moving = flags.started !== false && !g.over && !g.paused;
    if (!moving) return inv;
    const span = COLS * CELL - ((INV_COUNT - 1) * INV_GAP + INV_W) - 36;
    inv.x += inv.dir * 22 * (dt / 1000);
    if (inv.x < 4) { inv.x = 4; inv.dir = 1; }
    if (inv.x > span - 4) { inv.x = span - 4; inv.dir = -1; }
    if (inv.bombs.length < BOMB_MAX) {
      inv.wait -= dt;
      if (inv.wait <= 0) {
        dropBomb(inv, g);
        inv.wait = bombWait(g.level, false);
        inv.first = false;
      }
    }
    moveBombs(inv, g, dt, flags.onThump);
    return inv;
  }

  // Offline analysis of tetris-bg/m0..m11.mp3: tempo, first-beat phase (loop-safe), key.
  // 1.9.173 m6 (Farmyard) re-analysed after Shane's new level-1 track.
  // 1.9.178 m11 (Bullfrog) re-analysed after Shane's new level-2 track (127.45 BPM, D major, loop-safe 440 beats).
  // 1.9.179 m0 (Beach) re-analysed after Shane's new level-3 track (115.5 BPM, C major, loop-safe 392 beats).
  // 1.9.180 m1 (Fireworks) re-analysed after Shane's level-4 soundscape (131 BPM, F# minor kept for chimes, loop-safe 905 beats).
  // 1.9.188 m4 (City, now level 5) re-analysed after Shane's Hot In The City track (111.25 BPM, G minor, loop-safe 420 beats).
  // 1.9.193 m9 (New Zealand, level 8) re-analysed after Shane's soundtrack (143.25 BPM, D# major, loop-safe 236 beats).
  const TRACKS = [
    { bpm: 115.5, offset: 0.229, key: 'C', mode: 'major' },
    { bpm: 131, offset: 0.083, key: 'F#', mode: 'minor' },
    { bpm: 136, offset: 0, key: 'C#', mode: 'major' },
    { bpm: 117.5, offset: 0.348, key: 'G', mode: 'major' },
    { bpm: 111.25, offset: 0.02, key: 'G', mode: 'minor' },
    { bpm: 117.5, offset: 0.282, key: 'D', mode: 'minor' },
    { bpm: 171, offset: 0.006, key: 'D', mode: 'major' },
    { bpm: 123, offset: 0.163, key: 'D', mode: 'minor' },
    { bpm: 117.5, offset: 0.209, key: 'A', mode: 'major' },
    { bpm: 143.25, offset: 0.035, key: 'D#', mode: 'major' },
    { bpm: 123, offset: 0.218, key: 'G', mode: 'major' },
    { bpm: 127.45, offset: 0.266, key: 'D', mode: 'major' }
  ];
  const MAJOR_IV = [0, 2, 4, 5, 7, 9, 11], MINOR_IV = [0, 2, 3, 5, 7, 8, 10];
  const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const SFX_MAX_HZ = 800, SFX_LO = 48, SFX_HI = 76, MAX_Q = 0.12;
  function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function scaleMidi(tr) {
    if (!tr || tr.key == null) return null;
    const tonic = PC[tr.key];
    if (tonic == null) return null;
    const iv = tr.mode === 'minor' ? MINOR_IV : MAJOR_IV;
    const out = [];
    for (let m = SFX_LO; m <= SFX_HI; m++) if (iv.indexOf((m - tonic + 120) % 12) >= 0) out.push(m);
    return out;
  }
  // Quantise a sound to the music grid. Delay is wall-clock seconds, never more than 120ms.
  // land/clear: next beat or half-beat. rotate: nearest 8th note. Missing data → 0 (play now).
  function quantizeDelay(currentTime, playbackRate, meta, mode) {
    if (!meta || !(meta.bpm > 0)) return 0;
    const rate = playbackRate > 0 ? playbackRate : 1;
    const period = 60 / meta.bpm;
    const offset = meta.offset || 0;
    const t = currentTime - offset;
    if (!isFinite(t) || !isFinite(period) || period <= 0) return 0;
    const grid = period / 2;
    if (mode === 'nearest8th') {
      const k = Math.round(t / grid);
      const target = offset + k * grid;
      const wall = (target - currentTime) / rate;
      if (wall > 0 && wall <= MAX_Q) return wall;
      return 0;
    }
    // 1.9.185 Rotate: nearest 16th, capped ~48ms so it locks to the beat without lag.
    if (mode === 'nearest16th') {
      const grid16 = period / 4;
      const k = Math.round(t / grid16);
      const target = offset + k * grid16;
      const wall = (target - currentTime) / rate;
      if (wall > 0 && wall <= 0.048) return wall;
      return 0;
    }
    const behind = ((t % grid) + grid) % grid;
    if (behind < 0.004 || grid - behind < 0.004) return 0;
    const kCeil = Math.ceil(t / grid - 1e-9);
    const target = offset + kCeil * grid;
    const wall = (target - currentTime) / rate;
    if (wall > 0 && wall <= MAX_Q) return wall;
    return 0;
  }
  function sfxFreqs(ti, name, lines) {
    const scale = scaleMidi(TRACKS[ti]);
    if (!scale || !scale.length) return null;
    const mid = Math.max(0, scale.findIndex(m => m >= 55));
    const hz = i => midiHz(scale[Math.max(0, Math.min(scale.length - 1, mid + i))]);
    if (name === 'rotate') return rotateRun(ti);
    if (name === 'land') return [hz(-2)];
    if (name === 'level') {
      const inRange = scale.filter(m => { const f = midiHz(m); return f >= 300 && f <= 800; });
      const src = inRange.length >= 4 ? inRange : scale;
      const i0 = Math.max(0, Math.min(src.length - 4, Math.floor((src.length - 4) / 2)));
      return [0, 1, 2, 4].map(i => midiHz(src[Math.max(0, Math.min(src.length - 1, i0 + i))]));
    }
    if (name === 'tetris') return [0, 1, 2, 3, 4, 5].map(hz);
    if (name === 'clear') {
      const n = Math.max(1, Math.min(3, lines || 1));
      return [0, 2, 4, 7].slice(0, n + 1).map(hz);
    }
    return null;
  }
  function softTone(freq, dur, type, vol, dest, at) {
    if (!ac || !dest) return;
    const f = Math.max(40, Math.min(SFX_MAX_HZ, freq));
    const t0 = at;
    const o = ac.createOscillator();
    const g = ac.createGain();
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    o.type = type === 'triangle' ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0);
    const att = Math.min(0.04, dur * 0.3);
    g.gain.linearRampToValueAtTime(vol, t0 + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(lp); lp.connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }
  let duckTok = 0, duckUntil = 0;
  function duckMusic(delay, dur) {
    if (!musicOn || !bgmGain || !ac) return;
    const tok = ++duckTok;
    const hold = Math.max(0.2, dur || 0.45);
    const go = () => {
      try {
        if (!bgmGain || !musicOn || tok !== duckTok || !ac) return;
        const t0 = ac.currentTime;
        duckUntil = performance.now() + (hold + 0.25) * 1000;
        bgmGain.gain.cancelScheduledValues(t0);
        bgmGain.gain.setValueAtTime(Math.max(0.0001, bgmGain.gain.value), t0);
        bgmGain.gain.linearRampToValueAtTime(BGM_DUCK, t0 + 0.03);
        bgmGain.gain.setValueAtTime(BGM_DUCK, t0 + hold);
        bgmGain.gain.linearRampToValueAtTime(BGM_VOL, t0 + hold + 0.22);
      } catch (e) { }
    };
    if (delay > 0) setTimeout(go, delay * 1000);
    else go();
  }
  function sfxDelay(kind) {
    if (!musicOn || !bgmNode || !ac) return 0;
    const tr = TRACKS[themeIdx];
    if (!tr) return 0;
    try {
      const pos = Math.max(0, (ac.currentTime - bgmAt) * (bgmRate || 1));
      return quantizeDelay(pos, bgmRate || 1, tr, kind === 'rotate' ? 'nearest16th' : 'next');
    } catch (e) { return 0; }
  }

  // In-key mid notes used by tests and (historically) the whoosh-to-chord cue.
  const LU_LO = 300, LU_HI = 1200;
  function luHz(f) { return Math.max(LU_LO, Math.min(LU_HI, f)); }
  function levelUpNotes(ti) {
    const scale = scaleMidi(TRACKS[ti]);
    if (!scale || !scale.length) return null;
    const freqs = scale.map(midiHz).filter(f => f >= LU_LO && f <= LU_HI);
    const src = freqs.length >= 4 ? freqs : scale.map(midiHz).map(luHz);
    const i0 = Math.max(0, Math.min(src.length - 4, Math.floor((src.length - 4) / 3)));
    return [0, 2, 4, 7].map(i => luHz(src[Math.max(0, Math.min(src.length - 1, i0 + Math.min(i, src.length - 1 - i0)))]));
  }

  // 1.9.184 Shane's recorded LEVEL UP cue, on every level, at the LEVEL UP! moment.
  // Content-hashed mp3 (ogg is unreliable on iOS Safari), decoded through the shared
  // AudioContext. The file is already gently low-passed at ~3.8 kHz, highpassed so
  // the body stays phone-speaker friendly, and loudness-matched to sit above the music.
  // Played on its own bus so the 1400 Hz SFX softener does not dull it.
  const LEVELUP_HASH = 'e8f84e6f';
  const LEVELUP_VOL = 0.85;
  const LEVELUP_DUR = 2.13;
  function levelUpSrc() { return 'tetris-bg/levelup-' + LEVELUP_HASH + '.mp3'; }
  let luBuf = null, luLoading = null, luGain = null;
  function ensureLuGain() {
    if (!ac || luGain) return;
    luGain = ac.createGain();
    luGain.gain.value = 1;
    luGain.connect(ac.destination);
  }
  function loadLevelUp() {
    if (luBuf) return Promise.resolve(luBuf);
    if (luLoading) return luLoading;
    if (!ac) return Promise.resolve(null);
    luLoading = fetch(levelUpSrc()).then(r => r.arrayBuffer()).then(ab => ac.decodeAudioData(ab.slice(0))).then(b => { luBuf = b; return b; }).catch(() => { luLoading = null; return null; });
    return luLoading;
  }
  function playLuBuf(buf, t0) {
    if (!buf || !ac || !luGain) return;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    const dur = Math.max(0.2, buf.duration || LEVELUP_DUR);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(LEVELUP_VOL, t0 + 0.012);
    g.gain.setValueAtTime(LEVELUP_VOL, t0 + Math.max(0.05, dur - 0.04));
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g); g.connect(luGain);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }
  function playLevelUpSfx(ti) {
    if (!soundOn || !ac) return;
    ensureLuGain();
    loadLevelUp();
    // Play at the LEVEL UP! moment, not quantized to the next music beat.
    const t0 = ac.currentTime;
    duckMusic(0, Math.max(0.75, LEVELUP_DUR - 0.1));
    duckBus(ccGain, 0.08, LEVELUP_DUR, 0.05, 0.18);
    duckBus(voGain, 0.05, LEVELUP_DUR, 0.04, 0.12);
    duckBus(hsGain, 0.08, LEVELUP_DUR, 0.05, 0.16);
    if (luBuf) playLuBuf(luBuf, t0);
    else if (luLoading) {
      const startedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
      luLoading.then(b => {
        if (!b || !soundOn || !ac) return;
        if (startedAt && performance.now() - startedAt > 1800) return;
        ensureLuGain();
        playLuBuf(b, ac.currentTime);
      });
    }
    // Softened rolling thunder + a gentle electric crackle under Shane's cue.
    // Content stays about 300–3000 Hz so a phone speaker can play it, with no
    // harsh snaps. Quieter than before so they do not clash with the recording.
    if (noiseBuf && sfxGain) {
      const dest = sfxGain;
      const rum = ac.createBufferSource();
      rum.buffer = noiseBuf;
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 300; hp.Q.value = 0.7;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 720; lp.Q.value = 0.5;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.055, t0 + 0.12);
      g.gain.setValueAtTime(0.045, t0 + 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.45);
      rum.connect(hp); hp.connect(lp); lp.connect(g); g.connect(dest);
      rum.start(t0); rum.stop(t0 + 1.5);
      for (let k = 0; k < 5; k++) {
        const at = t0 + 0.04 + k * 0.11;
        const src = ac.createBufferSource();
        src.buffer = noiseBuf;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 520 + k * 180; bp.Q.value = 0.9;
        const clp = ac.createBiquadFilter();
        clp.type = 'lowpass'; clp.frequency.value = 2600; clp.Q.value = 0.5;
        const cg = ac.createGain();
        cg.gain.setValueAtTime(0.0001, at);
        cg.gain.linearRampToValueAtTime(0.03 - k * 0.004, at + 0.018);
        cg.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
        src.connect(bp); bp.connect(clp); clp.connect(cg); cg.connect(dest);
        src.start(at); src.stop(at + 0.2);
      }
    }
  }

  // 1.9.185 In-key rotate riff (Tetris Effect style): a short arpeggio in the
  // level's scale, one step per spin, lightly quantised to a 16th.
  function rotateRun(ti) {
    const scale = scaleMidi(TRACKS[ti]);
    if (!scale || !scale.length) return [440];
    const mid = scale.filter(m => { const f = midiHz(m); return f >= 300 && f <= 800; });
    const src = mid.length >= 5 ? mid : scale;
    const i0 = Math.max(0, Math.min(src.length - 1, Math.floor((src.length - 1) * 0.2)));
    const steps = [0, 2, 4, 7, 4, 2, 0, 7];
    return steps.map(st => {
      let f = midiHz(src[Math.max(0, Math.min(src.length - 1, i0 + st))]);
      while (f < 300) f *= 2;
      while (f > 800) f /= 2;
      return f;
    });
  }

  // 1.9.185 Shane's recorded game-over and line-clear stings, plus spoken callouts.
  // Content-hashed mp3s, decoded through the shared AudioContext on their own buses
  // so the 1400 Hz SFX softener does not dull them. Same mellow treatment as LEVEL UP.
  const GAMEOVER_HASH = '5f3dda37';
  const GAMEOVER_VOL = 0.85;
  const GAMEOVER_DUR = 1.98;
  function gameOverSrc() { return 'tetris-bg/gameover-' + GAMEOVER_HASH + '.mp3'; }
  const LINECLEAR_HASH = 'c3b333cd';
  const LINECLEAR_VOL = 0.85;
  const LINECLEAR_DUR = 1.67;
  function lineClearSrc() { return 'tetris-bg/lineclear-' + LINECLEAR_HASH + '.mp3'; }
  // 1.9.192: Amazing, Brilliant, Awesome and Keep going are the RogerNeural clips
  // re-toned to Shane's game-over voice; Fantastic (Shane) and You got this stay as they were.
  const CALLOUT_VOICES = {
    amazing: 'f68cdbb0', brilliant: '791b3eb0', fantastic: '95c74d33',
    awesome: 'c083a2f5', yougotthis: '7761c550', keepgoing: '66d1b6c8'
  };
  const CALLOUT_TEXT = {
    amazing: 'Amazing!', brilliant: 'Brilliant!', fantastic: 'Fantastic!',
    awesome: 'Awesome!', yougotthis: 'You got this!', keepgoing: 'Keep going!'
  };
  const CALLOUT_DUR = 1400;
  const CALLOUT_GAP = 7000;
  function calloutSrc(id) { return 'tetris-bg/vo-' + id + '-' + CALLOUT_VOICES[id] + '.mp3'; }
  let goBuf = null, goLoading = null, goGain = null, goPlaying = false;
  let ccBuf = null, ccLoading = null, ccGain = null;
  let voBufs = {}, voLoading = {}, voGain = null;
  let calloutAt = 0, calloutBusy = false;
  let rotGain = null, rotStep = 0, rotAt = 0;
  function ensureGoGain() {
    if (!ac || goGain) return;
    goGain = ac.createGain();
    goGain.gain.value = 1;
    goGain.connect(ac.destination);
  }
  function ensureCcGain() {
    if (!ac || ccGain) return;
    ccGain = ac.createGain();
    ccGain.gain.value = 1;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -8; comp.knee.value = 6; comp.ratio.value = 4;
    comp.attack.value = 0.003; comp.release.value = 0.12;
    ccGain.connect(comp); comp.connect(ac.destination);
  }
  function ensureVoGain() {
    if (!ac || voGain) return;
    voGain = ac.createGain();
    voGain.gain.value = 1;
    voGain.connect(ac.destination);
  }
  function ensureRotGain() {
    if (!ac || rotGain) return;
    rotGain = ac.createGain();
    rotGain.gain.value = 1;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 300; hp.Q.value = 0.7;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 3800; lp.Q.value = 0.5;
    rotGain.connect(hp); hp.connect(lp); lp.connect(ac.destination);
  }
  function loadGameOver() {
    if (goBuf) return Promise.resolve(goBuf);
    if (goLoading) return goLoading;
    if (!ac) return Promise.resolve(null);
    goLoading = fetch(gameOverSrc()).then(r => r.arrayBuffer()).then(ab => ac.decodeAudioData(ab.slice(0))).then(b => { goBuf = b; return b; }).catch(() => { goLoading = null; return null; });
    return goLoading;
  }
  function loadLineClear() {
    if (ccBuf) return Promise.resolve(ccBuf);
    if (ccLoading) return ccLoading;
    if (!ac) return Promise.resolve(null);
    ccLoading = fetch(lineClearSrc()).then(r => r.arrayBuffer()).then(ab => ac.decodeAudioData(ab.slice(0))).then(b => { ccBuf = b; return b; }).catch(() => { ccLoading = null; return null; });
    return ccLoading;
  }
  function loadCallouts() {
    if (!ac) return Promise.resolve(null);
    return Promise.all(Object.keys(CALLOUT_VOICES).map(id => {
      if (voBufs[id]) return voBufs[id];
      if (voLoading[id]) return voLoading[id];
      voLoading[id] = fetch(calloutSrc(id)).then(r => r.arrayBuffer()).then(ab => ac.decodeAudioData(ab.slice(0))).then(b => { voBufs[id] = b; return b; }).catch(() => { voLoading[id] = null; return null; });
      return voLoading[id];
    }));
  }
  function duckBus(gain, toVal, hold, attack, release) {
    if (!gain || !ac) return;
    const t0 = ac.currentTime;
    const a = attack != null ? attack : 0.06;
    const rls = release != null ? release : 0.2;
    const h = Math.max(0.05, hold || 0.4);
    try {
      const cur = Math.max(0.0001, gain.gain.value);
      gain.gain.cancelScheduledValues(t0);
      gain.gain.setValueAtTime(cur, t0);
      gain.gain.linearRampToValueAtTime(Math.max(0.0001, toVal), t0 + a);
      gain.gain.setValueAtTime(Math.max(0.0001, toVal), t0 + a + h);
      gain.gain.linearRampToValueAtTime(1, t0 + a + h + rls);
    } catch (e) { }
  }
  let bgmFading = false;
  function fadeBgmOut(dur) {
    if (!ac || !bgmGain || !bgmNode) { bgmWant = false; bgmWantTi = -1; return; }
    bgmFading = true;
    bgmWant = false;
    bgmWantTi = -1;
    const t0 = ac.currentTime;
    const d = Math.max(0.1, dur || 0.28);
    try {
      bgmGain.gain.cancelScheduledValues(t0);
      bgmGain.gain.setValueAtTime(Math.max(0.0001, bgmGain.gain.value), t0);
      bgmGain.gain.linearRampToValueAtTime(0.0001, t0 + d);
    } catch (e) { }
    const node = bgmNode;
    setTimeout(() => {
      if (bgmNode === node) stopBgmNode();
      bgmFading = false;
      if (bgmGain && ac) {
        try { bgmGain.gain.cancelScheduledValues(ac.currentTime); bgmGain.gain.setValueAtTime(BGM_VOL, ac.currentTime); } catch (e) { }
      }
    }, (d + 0.06) * 1000);
  }
  function playDecoded(buf, dest, vol, t0) {
    if (!buf || !ac || !dest) return 0;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    const dur = Math.max(0.2, buf.duration || 0.8);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.setValueAtTime(vol, t0 + Math.max(0.05, dur - 0.04));
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g); g.connect(dest);
    src.start(t0); src.stop(t0 + dur + 0.02);
    return dur;
  }
  function playGameOverSfx() {
    if (!soundOn || !ac || goPlaying) return;
    ensureGoGain();
    loadGameOver();
    goPlaying = true;
    fadeBgmOut(0.28);
    duckBus(ccGain, 0.06, GAMEOVER_DUR, 0.05, 0.12);
    duckBus(voGain, 0.04, GAMEOVER_DUR, 0.04, 0.1);
    duckBus(hsGain, 0.06, GAMEOVER_DUR, 0.05, 0.12);
    const start = (buf) => {
      const dur = playDecoded(buf, goGain, GAMEOVER_VOL, ac.currentTime);
      setTimeout(() => { goPlaying = false; }, Math.max(400, dur * 1000 + 40));
    };
    if (goBuf) start(goBuf);
    else if (goLoading) goLoading.then(b => { if (b && soundOn && ac) start(b); else goPlaying = false; });
    else goPlaying = false;
  }
  function playLineClearSfx(n) {
    if (!soundOn || !ac) return;
    ensureCcGain();
    loadLineClear();
    duckMusic(0, Math.max(0.45, LINECLEAR_DUR - 0.12));
    // Overlaps are allowed: a new source is started without stopping earlier ones.
    if (ccBuf) playDecoded(ccBuf, ccGain, LINECLEAR_VOL, ac.currentTime);
    else if (ccLoading) ccLoading.then(b => { if (b && soundOn && ac) { ensureCcGain(); playDecoded(b, ccGain, LINECLEAR_VOL, ac.currentTime); } });
  }
  function pickCallout(info) {
    const idsPraiseBig = ['amazing', 'brilliant'];
    const idsBigger = ['fantastic', 'awesome'];
    const idsEncourage = ['yougotthis', 'keepgoing'];
    const pick = arr => arr[(Math.random() * arr.length) | 0];
    if (info.n >= 4 && info.b2b) return pick(idsBigger);
    if (info.n >= 4) return pick(idsPraiseBig);
    if (info.n === 3) return pick(idsPraiseBig);
    if (info.combo >= 3) return pick(idsBigger);
    // You got this / Keep going are only for level 1 (Farmyard, the first level of a run).
    if (info.n === 0 && (info.high || info.near) && info.level === 1) return pick(idsEncourage);
    return null;
  }
  function playCallout(g, id, delay) {
    if (!id || !CALLOUT_VOICES[id] || !g) return;
    const text = CALLOUT_TEXT[id];
    const wait = Math.max(0, delay || 0);
    const dur = CALLOUT_DUR;
    const arm = () => {
      if (g.over || g.levelUp || g.pendingLevel || g.highScore) return;
      g.callout = { text: text, t: dur, dur: dur, id: id };
      calloutAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      calloutBusy = true;
      if (soundOn && ac) {
        ensureVoGain();
        duckBus(ccGain, 0.28, 0.85, 0.05, 0.22);
        const buf = voBufs[id];
        const start = (b) => { playDecoded(b, voGain, 0.78, ac.currentTime); };
        if (buf) start(buf);
        else loadCallouts().then(() => { if (voBufs[id] && soundOn && ac) start(voBufs[id]); });
      }
      setTimeout(() => { calloutBusy = false; }, dur + 80);
    };
    if (wait > 0) setTimeout(arm, wait * 1000);
    else arm();
  }
  function maybeCallout(g, info) {
    if (!g || g.over || g.pendingLevel || g.levelUp || g.highScore) return;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (calloutBusy) return;
    if (now - calloutAt < CALLOUT_GAP) return;
    // Occasional, not every clear: singles never praise; triples often; encouragement is rarer.
    if (info.n === 1 || info.n === 2) {
      if (!(info.combo >= 3)) return;
    }
    if (info.n === 0 && Math.random() > 0.45) return;
    if (info.n === 3 && Math.random() > 0.7) return;
    if (info.level == null) info = Object.assign({}, info, { level: g.level });
    const id = pickCallout(info);
    if (!id) return;
    // Voice sits just after the clear attack so the sting is heard first, then ducked under the voice.
    const delay = info.n > 0 ? 0.42 : 0.05;
    playCallout(g, id, delay);
  }
  function tickCallout(g, dt) {
    if (!g.callout) return;
    if (g.callout.hold) return;
    g.callout.t -= dt;
    if (g.callout.t <= 0) g.callout = null;
  }

  // 1.9.185 Shane's NEW HIGH SCORE message: overall family top, once per game, not on an empty board.
  const HIGHSCORE_HASH = 'f7bf7066';
  const HIGHSCORE_VOL = 0.85;
  const HIGHSCORE_DUR = 2.09;
  // 1.9.193: add 1000ms of visible hold before the fade-out. Fade-in and fade-out
  // keep the original 2200ms candy timing (fade starts after 0.72 of that span).
  const HIGH_SCORE_FADE_MS = 2200;
  const HIGH_SCORE_MS = HIGH_SCORE_FADE_MS + 1000;
  function highScoreProg(hs) {
    if (!hs) return 0;
    if (hs.hold) return hs.at || 0;
    const old = HIGH_SCORE_FADE_MS;
    const extra = Math.max(0, (hs.dur || HIGH_SCORE_MS) - old);
    const tm = hs.t || 0;
    const fadeOutAt = 0.72 * old;
    if (tm <= fadeOutAt) return Math.min(0.72, tm / old);
    if (tm < fadeOutAt + extra) return 0.72;
    return Math.min(1, 0.72 + (tm - fadeOutAt - extra) / (0.28 * old) * 0.28);
  }
  function highScoreSrc() { return 'tetris-bg/highscore-' + HIGHSCORE_HASH + '.mp3'; }
  let hsBuf = null, hsLoading = null, hsGain = null;
  function ensureHsGain() {
    if (!ac || hsGain) return;
    hsGain = ac.createGain();
    hsGain.gain.value = 1;
    hsGain.connect(ac.destination);
  }
  function loadHighScore() {
    if (hsBuf) return Promise.resolve(hsBuf);
    if (hsLoading) return hsLoading;
    if (!ac) return Promise.resolve(null);
    hsLoading = fetch(highScoreSrc()).then(r => r.arrayBuffer()).then(ab => ac.decodeAudioData(ab.slice(0))).then(b => { hsBuf = b; return b; }).catch(() => { hsLoading = null; return null; });
    return hsLoading;
  }
  function playHighScoreSfx() {
    if (!soundOn || !ac) return;
    ensureHsGain();
    loadHighScore();
    duckMusic(0, Math.max(0.8, HIGHSCORE_DUR - 0.1));
    duckBus(ccGain, 0.08, HIGHSCORE_DUR, 0.05, 0.18);
    duckBus(voGain, 0.05, HIGHSCORE_DUR, 0.04, 0.12);
    const start = (buf) => { playDecoded(buf, hsGain, HIGHSCORE_VOL, ac.currentTime); };
    if (hsBuf) start(hsBuf);
    else if (hsLoading) hsLoading.then(b => { if (b && soundOn && ac) { ensureHsGain(); start(b); } });
  }
  // 1.9.190: CC0 rooster crow (Freesound 456804, Breviceps) once the farm sun is fully up.
  const ROOSTER_HASH = 'd5a4ffc5';
  const ROOSTER_VOL = 0.62;
  const ROOSTER_DUR = 2.73;
  function roosterSrc() { return 'tetris-bg/rooster-' + ROOSTER_HASH + '.mp3'; }
  let roosterBuf = null, roosterLoading = null, roosterGain = null;
  function ensureRoosterGain() {
    if (!ac || roosterGain) return;
    roosterGain = ac.createGain();
    roosterGain.gain.value = 1;
    roosterGain.connect(ac.destination);
  }
  function loadRooster() {
    if (roosterBuf) return Promise.resolve(roosterBuf);
    if (roosterLoading) return roosterLoading;
    if (!ac) return Promise.resolve(null);
    roosterLoading = fetch(roosterSrc()).then(r => r.arrayBuffer()).then(ab => ac.decodeAudioData(ab.slice(0))).then(b => { roosterBuf = b; return b; }).catch(() => { roosterLoading = null; return null; });
    return roosterLoading;
  }
  function playRoosterSfx() {
    if (!soundOn || !ac) return;
    ensureRoosterGain();
    loadRooster();
    duckMusic(0, Math.max(0.7, ROOSTER_DUR - 0.2));
    const start = (buf) => { playDecoded(buf, roosterGain, ROOSTER_VOL, ac.currentTime); };
    if (roosterBuf) start(roosterBuf);
    else if (roosterLoading) roosterLoading.then(b => { if (b && soundOn && ac) { ensureRoosterGain(); start(b); } });
  }
  // 1.9.193 Seagull squawk: Freesound 263786 "Seagull single call" by steaq, CC0.
  // Pitched down 4 semitones, 300 Hz high-pass, 3.5 kHz low-pass, quiet under the music.
  const SEAGULL_HASH = '712237c3';
  const SEAGULL_VOL = 0.4;
  const SEAGULL_DUR = 0.47;
  function seagullSrc() { return 'tetris-bg/seagull-' + SEAGULL_HASH + '.mp3'; }
  let seagullBuf = null, seagullLoading = null, seagullGain = null;
  function ensureSeagullGain() {
    if (!ac || seagullGain) return;
    seagullGain = ac.createGain();
    seagullGain.gain.value = 1;
    seagullGain.connect(ac.destination);
  }
  function loadSeagull() {
    if (seagullBuf) return Promise.resolve(seagullBuf);
    if (seagullLoading) return seagullLoading;
    if (!ac) return Promise.resolve(null);
    seagullLoading = fetch(seagullSrc()).then(r => r.arrayBuffer()).then(ab => ac.decodeAudioData(ab.slice(0))).then(b => { seagullBuf = b; return b; }).catch(() => { seagullLoading = null; return null; });
    return seagullLoading;
  }
  function playSeagullSfx() {
    if (!soundOn || !ac) return;
    ensureSeagullGain();
    loadSeagull();
    const rate = 0.94 + Math.random() * 0.1;
    const start = function (buf) {
      if (!buf || !seagullGain || !ac) return;
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 300; hp.Q.value = 0.7;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 3500; lp.Q.value = 0.5;
      const g0 = ac.createGain();
      g0.gain.value = SEAGULL_VOL;
      src.connect(hp); hp.connect(lp); lp.connect(g0); g0.connect(seagullGain);
      src.start(ac.currentTime);
    };
    if (seagullBuf) start(seagullBuf);
    else if (seagullLoading) seagullLoading.then(function (b) { if (b && soundOn && ac) { ensureSeagullGain(); start(b); } });
  }
    function boardOccupied(g) {
    return !!(g && g.board && g.board.some(function (row) { return row.some(function (v) { return v; }); }));
  }
  function familyHighFrom(data) {
    if (!data || !Array.isArray(data.top)) return null;
    let n = 0;
    for (let i = 0; i < data.top.length; i++) n = Math.max(n, data.top[i].score || 0);
    return n;
  }
  function localHighFallback() {
    let n = 0;
    try { n = Math.max(n, parseInt(root.localStorage && root.localStorage.getItem('tetris-best'), 10) || 0); } catch (e) { }
    try {
      if (root.IBScores && root.IBScores.localBests) {
        const list = root.IBScores.localBests('tetris') || [];
        for (let i = 0; i < list.length; i++) n = Math.max(n, list[i].score || 0);
      }
    } catch (e) { }
    return n;
  }
  function seedHighBar(g) {
    if (!g) return g;
    g.familyHigh = localHighFallback();
    g.highNoted = false;
    g.highScore = null;
    g.pendingHigh = false;
    const S = root.IBScores;
    if (!S || !S.load) return g;
    const p = (S.who && S.who()) ? S.load('tetris') : null;
    Promise.resolve(p).then(function (data) {
      if (!g || g.highNoted) return;
      if (data && Array.isArray(data.top)) g.familyHigh = familyHighFrom(data);
      maybeHighScore(g);
    }).catch(function () { });
    return g;
  }
  function startHighScore(g) {
    if (!g || g.highScore) return g && g.highScore;
    g.highNoted = true;
    g.pendingHigh = false;
    const pal = ['#fde68a', '#fbbf24', '#f59e0b', '#fff7ed', '#facc15', '#eab308'];
    const ti = themeFor(g.level);
    const parts = burstParts(ti, 4, pal, true, null);
    let reduce = false;
    try { reduce = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { }
    g.highScore = {
      t: 0, dur: HIGH_SCORE_MS, hold: false, at: 0,
      title: 'NEW HIGH SCORE', sub: String(g.score || 0),
      parts: parts, n: 4, reduce: reduce, score: g.score, theme: ti
    };
    playHighScoreSfx();
    return g.highScore;
  }
  function tickHighScore(g, dt) {
    const hs = g && g.highScore;
    if (!hs) return false;
    if (hs.hold) return true;
    hs.t += dt;
    if (hs.t >= hs.dur) { g.highScore = null; return false; }
    return true;
  }
  function maybeHighScore(g) {
    if (!g || g.demo || g.over || g.highNoted || g.highScore) return false;
    if (!boardOccupied(g)) return false;
    const bar = g.familyHigh != null ? g.familyHigh : 0;
    if (!(g.score > bar)) return false;
    if (g.clearFx || g.pendingLevel || g.levelUp) { g.pendingHigh = true; return false; }
    startHighScore(g);
    return true;
  }
  function drawHighScore(ctx, hs) {
    if (!hs) return;
    const p = highScoreProg(hs);
    const fade = candyFade(p);
    const scale = candyScale(p, hs.reduce);
    const tSec = hs.hold ? (hs.at || 0) * (HIGH_SCORE_FADE_MS / 1000) : (hs.t || 0) / 1000;
    ctx.save();
    ctx.globalAlpha = 0.26 * fade;
    ctx.fillStyle = '#1a0e04';
    ctx.fillRect(0, 0, board.width, board.height);
    ctx.restore();
    if (!hs.reduce) {
      const glowA = 0.42 * fade * (p < 0.2 ? p / 0.2 : (p > 0.75 ? Math.max(0, (1 - p) / 0.25) : 1));
      const cx0 = board.width / 2, cy0 = board.height / 2 - 18;
      const rg = ctx.createRadialGradient(cx0, cy0, 8, cx0, cy0, board.width * 0.75);
      rg.addColorStop(0, 'rgba(255, 210, 80,' + glowA + ')');
      rg.addColorStop(0.4, 'rgba(250, 180, 40,' + (glowA * 0.4) + ')');
      rg.addColorStop(1, 'rgba(250, 180, 40, 0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, board.width, board.height);
    }
    const sw = board.width * 0.48;
    const sx = -sw + Math.min(1, p / 0.55) * (board.width + sw * 2);
    const sg = ctx.createLinearGradient(sx, 0, sx + sw, board.height * 0.15);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.45, 'rgba(255, 236, 180,' + (0.28 * fade) + ')');
    sg.addColorStop(0.5, 'rgba(255,255,255,' + (0.45 * fade) + ')');
    sg.addColorStop(0.55, 'rgba(255, 210, 120,' + (0.28 * fade) + ')');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, board.width, board.height);
    for (const o of hs.parts) drawPart(ctx, o, tSec, fade, hs.n || 4);
    const cx = board.width / 2, cy = board.height / 2 - 18;
    drawCandyWord(ctx, hs.title, cx, cy, 26, fade, scale, { shadow: 'rgba(255, 190, 40, 0.95)', stops: ['#fffbeb', '#fde68a', '#fbbf24', '#f59e0b', '#b45309'] });
    ctx.save();
    ctx.globalAlpha = fade * (p < 0.14 ? Math.max(0, (p - 0.06) / 0.08) : 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 18px ' + FONT;
    ctx.shadowColor = 'rgba(40, 20, 0, 0.65)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#fff7ed';
    ctx.fillText(hs.sub, cx, cy + 36);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function resetRotRiff() { rotStep = 0; rotAt = 0; }
  // Theme timbres for the rotate riff: musical, mellow, distinct from the move taps.
  const ROT_KIND = ['pluck', 'bellpad', 'harp', 'wood', 'city', 'bellpad', 'marimba', 'space', 'triangle', 'pluck', 'ice', 'marimba'];
  function rotNote(freq, dur, vol, dest, t0, kind, shimmer) {
    const f = Math.max(300, Math.min(800, freq));
    const att = 0.014;
    function tone(type, hz, peak, decay, detune) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(hz, t0);
      if (detune) o.detune.setValueAtTime(detune, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + att);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
      o.connect(g); g.connect(dest);
      o.start(t0); o.stop(t0 + decay + 0.03);
    }
    if (kind === 'marimba') {
      tone('sine', f, vol, dur, 0);
      tone('sine', f * 4, vol * 0.1, dur * 0.35, 0);
    } else if (kind === 'pluck' || kind === 'harp' || kind === 'wood') {
      tone('sine', f, vol, dur, 0);
      tone('triangle', f, vol * 0.22, dur * 0.55, 0);
      if (kind === 'harp') tone('sine', f, vol * 0.28, dur * 1.05, 0);
    } else if (kind === 'bellpad' || kind === 'ice') {
      tone('sine', f, vol, dur * 1.15, 0);
      tone('sine', f * 2, vol * 0.12, dur * 0.8, 0);
      if (kind === 'ice') tone('sine', f * 2.76, vol * 0.06, dur * 0.5, 0);
    } else if (kind === 'city' || kind === 'synth') {
      tone('sine', f, vol, dur, -4);
      tone('sine', f, vol * 0.7, dur, 5);
    } else if (kind === 'space') {
      tone('sine', f, vol * 0.95, dur * 1.2, 0);
      tone('sine', f * 2, vol * 0.08, dur, 0);
    } else if (kind === 'triangle') {
      tone('triangle', f, vol * 0.7, dur, 0);
      tone('sine', f, vol * 0.45, dur, 0);
    } else {
      tone('sine', f, vol, dur, 0);
    }
    if (shimmer) {
      const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.4;
      o.type = 'sine';
      o.frequency.setValueAtTime(Math.min(800, f * 2), t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol * 0.1, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 1.35);
      o.connect(g); g.connect(lp); lp.connect(dest);
      o.start(t0); o.stop(t0 + dur * 1.4);
    }
  }
  function playRotateSfx(ok) {
    if (!soundOn || !ac) return;
    ensureRotGain();
    const dest = rotGain;
    const delay = ok ? sfxDelay('rotate') : 0;
    const t0 = ac.currentTime + delay;
    if (ok) duckMusic(delay, 0.16);
    if (!ok) {
      // Soft muted tick for a failed rotation, still mid and low-passed.
      const f = 330;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.09, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
      o.connect(g); g.connect(dest);
      o.start(t0); o.stop(t0 + 0.12);
      return;
    }
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (!rotAt || now - rotAt > 850) rotStep = 0;
    rotAt = now;
    const run = rotateRun(themeIdx);
    const f = run[rotStep % run.length];
    rotStep++;
    const kind = ROT_KIND[themeIdx] || 'pluck';
    rotNote(f, 0.28, 0.42, dest, t0, kind, true);
    // A quiet chord tone under later steps makes a spinning riff feel bigger.
    if (rotStep > 1 && run.length > 2) {
      const under = run[(rotStep + 2) % run.length];
      rotNote(under, 0.2, 0.12, dest, t0 + 0.018, kind, false);
    }
  }

  // 1.9.181 Themed piece-movement sounds, pitched in the level's key, clearly louder than the music.
  // Mellow: highpass ~300 Hz, lowpass ~3.5 kHz, soft attack, no harsh transients.
  function moveKeyHz(name) {
    const kind = (name === 'drop' || name === 'lock') ? 'land' : (name === 'soft' || name === 'move' ? 'rotate' : name);
    const notes = sfxFreqs(themeIdx, kind);
    let f = notes && notes[0];
    if (!f) {
      const tr = TRACKS[themeIdx] || { key: 'C' };
      const pc = PC[tr.key] != null ? PC[tr.key] : 0;
      f = midiHz(48 + pc + (tr.mode === 'minor' ? 3 : 4));
    }
    // Keep the tonal centre on a phone speaker (about 300–800 Hz).
    while (f < 300) f *= 2;
    while (f > 800) f /= 2;
    return f;
  }
  function moveChain(dest) {
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 300; hp.Q.value = 0.7;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 3500; lp.Q.value = 0.5;
    hp.connect(lp); lp.connect(dest);
    return hp;
  }
  function moveTone(freq, dur, vol, dest, t0, glidesTo) {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(Math.max(80, freq), t0);
    if (glidesTo) o.frequency.exponentialRampToValueAtTime(Math.max(80, glidesTo), t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.018, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function moveNoise(dur, vol, dest, t0, bpHz, q, startLp, endLp) {
    if (!noiseBuf) return;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = bpHz; bp.Q.value = q || 0.9;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = startLp || 2800; lp.Q.value = 0.5;
    if (endLp) lp.frequency.linearRampToValueAtTime(endLp, t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.016, dur * 0.22));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(dest);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }
  function playMoveSfx(name) {
    if (!soundOn || !ac || !sfxGain) return;
    const dest = moveChain(sfxGain);
    const t0 = ac.currentTime + 0.008;
    const f = moveKeyHz(name);
    const ti = themeIdx;
    const kind = isEffect(ti) || '';
    // Clearly louder than the music on a phone speaker: brief duck + a fuller SFX gain.
    const duckDur = name === 'drop' || name === 'lock' ? 0.28 : (name === 'rotate' ? 0.22 : 0.2);
    duckMusic(0, duckDur);
    const farm = kind === 'farm' || ti === 6;
    const frog = kind === 'frog' || ti === 11;
    const beach = kind === 'beach' || ti === 0;
    const fwth = kind === 'fireworks' || ti === 1;
    const oceanTh = kind === 'ocean' || ti === 2;
    const volMul = name === 'drop' ? 1 : (name === 'lock' ? 0.9 : (name === 'rotate' ? 0.85 : (name === 'soft' ? 0.62 : 0.7)));
    if (farm) {
      // Soft wooden clop / clucky tap.
      moveNoise(name === 'rotate' ? 0.1 : 0.08, 0.38 * volMul, dest, t0, 640, 1.1, 2200, 1400);
      moveTone(f, 0.11, 0.22 * volMul, dest, t0, f * 0.84);
      if (name === 'rotate') moveTone(f * 1.25, 0.09, 0.12 * volMul, dest, t0 + 0.03, f);
    } else if (frog) {
      if (name === 'rotate') {
        // Soft ribbit: mid sine glide, no rasp.
        moveTone(f * 1.05, 0.22, 0.36, dest, t0, f * 0.72);
        moveTone(f * 0.72, 0.16, 0.16, dest, t0 + 0.08, f * 0.9);
        moveNoise(0.08, 0.08, dest, t0 + 0.02, 700, 0.8, 1600);
      } else {
        moveTone(f * 1.15, 0.11, 0.34 * volMul, dest, t0, f * 0.7);
        moveNoise(0.06, 0.12 * volMul, dest, t0, 780, 1.0, 1800);
      }
    } else if (beach) {
      if (name === 'move' || name === 'soft' || name === 'drop') {
        moveNoise(name === 'drop' ? 0.18 : 0.12, 0.36 * volMul, dest, t0, 720, 0.7, 2400, 1100);
        moveTone(f, 0.1, 0.14 * volMul, dest, t0, f * 0.9);
      } else {
        // Shell click
        moveNoise(0.07, 0.34 * volMul, dest, t0, 1100, 1.4, 2800, 1600);
        moveTone(f, 0.09, 0.2 * volMul, dest, t0, f * 0.92);
      }
    } else if (fwth) {
      if (name === 'lock' || name === 'drop') {
        moveTone(f, 0.12, 0.3 * volMul, dest, t0, f * 0.75);
        moveNoise(0.08, 0.22 * volMul, dest, t0 + 0.01, 900, 0.8, 2600);
      } else {
        moveNoise(0.11, 0.32 * volMul, dest, t0, 1200, 0.7, 3200, 1800);
        moveTone(f * 1.1, 0.08, 0.12 * volMul, dest, t0);
      }
    } else if (oceanTh) {
      moveTone(f * 0.95, 0.1, 0.32 * volMul, dest, t0, f * 1.35);
      moveNoise(0.07, 0.14 * volMul, dest, t0, 800, 0.9, 2000);
      if (name === 'rotate' || name === 'drop') moveTone(f * 1.2, 0.08, 0.14 * volMul, dest, t0 + 0.04, f * 1.5);
    } else {
      // Sensible default: in-key soft tick, still themed by pitch.
      moveTone(f, name === 'drop' ? 0.16 : 0.1, 0.32 * volMul, dest, t0, name === 'drop' ? f * 0.75 : f * 0.92);
      moveNoise(0.07, 0.16 * volMul, dest, t0, 900, 0.9, 2600, 1600);
    }
  }

  function sfx(name, lines) {
    if (!soundOn || !ac) return;
    if (name === 'over') { playGameOverSfx(); return; }
    if (name === 'clear' || name === 'tetris') { playLineClearSfx(name === 'tetris' ? 4 : (lines || 1)); return; }
    if (name === 'rotate') { playRotateSfx(true); return; }
    if (name === 'rotateFail') { playRotateSfx(false); return; }
    if (name === 'move' || name === 'soft' || name === 'drop' || name === 'lock') { playMoveSfx(name); return; }
    const d = sfxGain, T = THEMES[themeIdx], m = T.pitch * 0.5, w = 'sine', lo = f => nf(f) / 2;
    const musical = name === 'rotate' || name === 'lock' || name === 'drop' || name === 'clear' || name === 'tetris' || name === 'level';
    const notes = musical ? sfxFreqs(themeIdx, (name === 'drop' || name === 'lock') ? 'land' : name, lines) : null;
    if (notes && notes.length) {
      const delay = sfxDelay(name);
      const t0 = ac.currentTime + delay;
      const typ = (T && T.sfx) === 'triangle' ? 'triangle' : 'sine';
      if (name === 'clear' || name === 'tetris' || name === 'level') duckMusic(delay, name === 'tetris' ? 0.75 : (name === 'level' ? 0.5 : 0.55));
      const gap = (name === 'tetris' || name === 'level') ? 0.09 : 0.1;
      const dur = (name === 'rotate') ? 0.12 : (name === 'lock' || name === 'drop') ? 0.2 : 0.5;
      const nLines = name === 'tetris' ? 4 : (name === 'clear' ? Math.max(1, Math.min(3, lines || 1)) : 1);
      const vol = (name === 'clear' || name === 'tetris' || name === 'level') ? SFX_NOTE * (0.88 + nLines * 0.08) : SFX_NOTE;
      if (name === 'clear' || name === 'tetris' || name === 'level') {
        // Soft in-key chord under a gentle arpeggio; a little louder for more lines, still soft.
        const chord = notes.slice(0, Math.min(notes.length, name === 'tetris' || name === 'level' ? 4 : 3));
        const cVol = SFX_NOTE * (0.5 + nLines * 0.07);
        chord.forEach(f => softTone(f, 0.58 + (name === 'level' ? 0.12 : nLines * 0.04), typ, cVol, d, t0));
        notes.forEach((f, i) => softTone(f, dur, typ, vol, d, t0 + 0.05 + i * gap));
        return;
      }
      notes.forEach((f, i) => softTone(f, dur, typ, vol, d, t0 + i * gap));
      return;
    }
    switch (name) {
      // Soft chimes and drops, pitched and voiced to the current theme.
      case 'move': tone(880 * m, 0.05, w, 0.16, 0, 0, d); break;
      case 'rotate': tone(700 * m, 0.09, w, 0.28, 0, 1200 * m, d); break;
      case 'soft': tone(520 * m, 0.03, w, 0.09, 0, 0, d); break;
      case 'drop': tone(420 * m, 0.22, w, 0.38, 0, 160 * m, d); break;
      case 'lock': tone(330 * m, 0.12, 'triangle', 0.25, 0, 260 * m, d); break;
      case 'hold': tone(784 * m, 0.18, w, 0.25, 0, 0, d); tone(1047 * m, 0.22, w, 0.22, 0.08, 0, d); break;
      case 'clear': [0, 2, 3].forEach((k, i) => tone(lo(T.bells[k]), 0.5, w, 0.28, i * 0.09, 0, d)); break;
      case 'tetris': [0, 1, 2, 3, 4, 5].forEach((k, i) => tone(lo(T.bells[k]), 0.7, w, 0.28, i * 0.09, 0, d)); break;
      case 'level': [1, 2, 3, 5].forEach((k, i) => tone(lo(T.bells[k]), 0.6, w, 0.25, i * 0.12, 0, d)); break;
      case 'over': [5, 3, 2, 0].forEach((k, i) => tone(nf(T.bells[k]) / 2, 0.9, 'sine', 0.28, i * 0.3, 0, d)); break;
      case 'thump': {
        // Muffled low thud when a bomb chips a locked cell (extra-low lowpass, no zap or chirp).
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 400;
        lp.connect(d);
        tone(88, 0.28, 'sine', 0.22, 0, 46, lp);
        tone(56, 0.36, 'triangle', 0.14, 0.03, 34, lp);
        break;
      }
      case 'boom': {
        // Soft low boom when a cell is knocked out on the third hit. Still mellow, nothing sharp.
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 380;
        lp.connect(d);
        tone(64, 0.42, 'sine', 0.26, 0, 38, lp);
        tone(44, 0.55, 'triangle', 0.16, 0.02, 26, lp);
        break;
      }
      case 'tock': {
        // Soft mellow hammer tock when a city worker places a brick. Low-passed, no sharp click.
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 820;
        lp.connect(d);
        tone(196, 0.1, 'sine', 0.17, 0, 140, lp);
        tone(262, 0.08, 'triangle', 0.1, 0.012, 160, lp);
        break;
      }
      default: break;
    }
  }
  const BELLS = [
    [0, 4], [1.5, 2], [3, 3], [5, 1], [6.5, 0], [9, 2], [10, 4], [12.5, 3], [14, 5], [17, 2], [18.5, 1], [21, 0], [22, 2], [25, 4], [26.5, 3], [29, 1], [30, 0]
  ];
  const STEPS = THEMES.map(T => {
    const steps = [];
    const add = (pos, e) => { const i = Math.round(pos * 2); while (steps.length <= i) steps.push([]); steps[i].push(e); };
    const bars = 8, len = bars * 4;
    for (let b = 0; b < bars; b++) {
      T.chords[b % T.chords.length].forEach((n, k) => add(b * 4 + k * 0.25, { v: 'pad', f: nf(n), d: 4.6 }));
      if ((T.ambient === 'wave' || T.ambient === 'wind' || T.ambient === 'traffic') && b % 2 === 0) add(b * 4, { v: T.ambient, d: 8 });
      if (T.ambient === 'rain') add(b * 4, { v: 'rain', d: 4.2 });
      if (false && T.ambient === 'shimmer' && b % 2 === 1) add(b * 4, { v: 'shimmer', f: nf(T.bells[5]), d: 6 });
      if (false && T.ambient === 'bubbles') [0.5, 1.75, 3].forEach(p => add(b * 4 + p, { v: 'bubble' }));
    }
    if (T.bouncy) for (let b = 0; b < bars; b++) { // oom-pah country bounce
      const ch = T.chords[b % T.chords.length];
      add(b * 4, { v: 'bass', f: nf(ch[0]) }); add(b * 4 + 2, { v: 'bass', f: nf(ch[1]) / 2 });
      [1, 3].forEach(q => ch.slice(1).forEach(n => add(b * 4 + q, { v: 'pah', f: nf(n) })));
    }
    for (const [pos, k] of BELLS) add(pos, { v: 'bell', f: nf(T.bells[k]) / 2, d: 3 });
    const cr = [].concat(T.critter);
    [7, 23].forEach((p, i) => { if (cr[i % cr.length] === 'whale') add(p, { v: 'whale' }); });
    if (T.critter === 'farm') { add(6, { v: 'pig' }); add(14, { v: 'sheep' }); add(22, { v: 'pig' }); add(26.5, { v: 'sheep' }); add(30, { v: 'horse' }); } // high chirps removed: too sharp
    while (steps.length < len * 2) steps.push([]);
    return steps;
  });
  function blip(f0, f1, f2, t0, dur, vol, dest, type) {
    const o = ac.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f1, t0 + dur * 0.45);
    o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noiseSwell(at, d, peak, lo, hi) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(lo, at);
    f.frequency.linearRampToValueAtTime(hi, at + d * 0.45);
    f.frequency.linearRampToValueAtTime(lo, at + d);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(peak, at + d * 0.45);
    g.gain.linearRampToValueAtTime(0.0001, at + d);
    src.connect(f); f.connect(g); g.connect(musicGain);
    src.start(at, Math.random() * 0.5); src.stop(at + d + 0.05);
  }
  // Soft farm animal voices: a buzzy tone shaped by a vocal filter, kept low and mellow.
  function animal(at, pts, vol, vib, vibHz, bp, q) {
    const o = ac.createOscillator(); o.type = 'sawtooth';
    const end = pts[pts.length - 1][0];
    o.frequency.setValueAtTime(pts[0][1], at);
    for (const [tt, f] of pts.slice(1)) o.frequency.exponentialRampToValueAtTime(f, at + tt);
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vibHz; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(at); l.stop(at + end + 0.05); }
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = bp; f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + Math.min(0.08, end * 0.25));
    g.gain.setValueAtTime(vol, at + end * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, at + end);
    o.connect(f); f.connect(g); g.connect(musicGain); o.start(at); o.stop(at + end + 0.05);
  }
  function oink(at) { animal(at, [[0, 150], [0.07, 200], [0.18, 120]], 0.5, 0, 0, 650, 2.5); animal(at + 0.24, [[0, 140], [0.06, 185], [0.16, 115]], 0.45, 0, 0, 650, 2.5); }
  function baa(at) { animal(at, [[0, 230], [0.15, 265], [0.85, 245]], 0.42, 14, 7, 850, 1.6); }
  function neigh(at) {
    animal(at, [[0, 330], [0.2, 470], [0.7, 380], [1.1, 260]], 0.32, 34, 11, 900, 2);
    if (noiseBuf) { const n = ac.createBufferSource(); n.buffer = noiseBuf; const lf = ac.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 500; const ng = ac.createGain(); const t = at + 1.25; ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(0.18, t + 0.04); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); n.connect(lf); lf.connect(ng); ng.connect(musicGain); n.start(t); n.stop(t + 0.35); }
  }
  function playEvent(e, at, beat, T) {
    if (!ac || !musicGain) return;
    if (e.v === 'pig') { oink(at); return; }
    if (e.v === 'sheep') { baa(at); return; }
    if (e.v === 'horse') { neigh(at); return; }
    if (e.v === 'bass') { blip(e.f, e.f, e.f * 0.98, at, beat * 0.9, 0.16, musicGain, 'triangle'); return; }
    if (e.v === 'pah') { blip(e.f, e.f, e.f, at, beat * 0.35, 0.035, musicGain, 'triangle'); return; }
    if (e.v === 'pad') {
      const o = ac.createOscillator();
      o.type = T.pad;
      o.frequency.setValueAtTime(e.f, at);
      const g = ac.createGain();
      const d = e.d * beat;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(T.pad === 'sine' ? 0.06 : 0.045, at + d * 0.35);
      g.gain.linearRampToValueAtTime(0.0001, at + d);
      o.connect(g); g.connect(musicGain); o.start(at); o.stop(at + d + 0.05);
    } else if (e.v === 'bell') {
      [1].forEach((m, i) => {
        const o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(e.f * m, at);
        const g = ac.createGain();
        const d = e.d * beat * (i ? 0.5 : 1);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(0.07, at + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, at + d);
        o.connect(g); g.connect(melodyBus); o.start(at); o.stop(at + d + 0.05);
      });
    } else if (e.v === 'wave' && noiseBuf) noiseSwell(at, e.d * beat, 0.12, 250, 900);
    else if (e.v === 'wind' && noiseBuf) noiseSwell(at, e.d * beat, 0.05, 400, 1400);
    else if (e.v === 'traffic' && noiseBuf) noiseSwell(at, e.d * beat, 0.08, 120, 380);
    else if (e.v === 'rain' && noiseBuf) {
      const src = ac.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      const f = ac.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 900;
      const g = ac.createGain();
      const d = e.d * beat;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(0.04, at + 0.6);
      g.gain.setValueAtTime(0.04, at + d - 0.6);
      g.gain.linearRampToValueAtTime(0.0001, at + d);
      src.connect(f); f.connect(g); g.connect(musicGain);
      src.start(at, Math.random() * 0.5); src.stop(at + d + 0.05);
    } else if (e.v === 'shimmer') {
      [1, 1.5, 2].forEach((m, i) => blip(e.f * m, e.f * m * 1.003, e.f * m, at + i * 0.4, e.d * beat, 0.018, melodyBus));
    } else if (e.v === 'bubble') {
      const f = 400 + Math.random() * 500;
      blip(f, f * 2.2, f * 2.6, at, 0.09, 0.035, musicGain);
    } else if (e.v === 'dolphin') {
      for (let i = 0; i < 3; i++) { const b = 1700 + Math.random() * 500; blip(b, b * 1.6, b * 0.9, at + i * 0.16, 0.14, 0.03, melodyBus); }
    } else if (e.v === 'bird') {
      for (let i = 0; i < 4; i++) { const b = 2400 + Math.random() * 600; blip(b, b * 1.25, b * 0.95, at + i * 0.12, 0.09, 0.025, melodyBus); }
    } else if (e.v === 'twinkle') {
      [0, 0.2, 0.45].forEach((dt, i) => blip(nf(T.bells[3 + i]) * 2, nf(T.bells[3 + i]) * 2, nf(T.bells[3 + i]) * 2, at + dt, 0.6, 0.02, melodyBus));
    } else if (e.v === 'gull') {
      [0, 0.45].forEach(dt => blip(1500, 1900, 1000, at + dt, 0.35, 0.02, melodyBus, 'triangle'));
    } else if (e.v === 'tui') {
      blip(1200, 2600, 2400, at, 0.18, 0.025, melodyBus); blip(3200, 3000, 1800, at + 0.25, 0.12, 0.02, melodyBus); blip(900, 950, 900, at + 0.45, 0.2, 0.025, melodyBus);
    } else if (e.v === 'chime') {
      [3, 1, 4].forEach((k, i) => blip(nf(T.bells[k]), nf(T.bells[k]), nf(T.bells[k]), at + i * 0.35, 1.2, 0.03, melodyBus));
    } else if (e.v === 'whale') {
      blip(180, 320, 140, at, 2.6, 0.05, melodyBus);
      blip(240, 400, 200, at + 2, 2.2, 0.035, melodyBus);
    }
  }
  function scheduleMusic(level) {
    if (!ac || !musicGain) return;
    const ti = themeFor(level || 1);
    if (ti !== themeIdx) { themeIdx = ti; noteIdx = 0; }
    // 1.9.142 Urgency: the tempo quickens a little each level (down to 55% of the beat by level 16) and a soft low pulse joins from level 6.
    const lv = Math.max(1, level || 1), urge = Math.min(1, (lv - 1) / 15);
    const T = THEMES[themeIdx], steps = STEPS[themeIdx], beat = T.beat * (1 - 0.45 * urge);
    if (nextNoteTime < ac.currentTime) nextNoteTime = ac.currentTime + 0.05;
    while (nextNoteTime < ac.currentTime + 0.25) {
      const evs = steps[noteIdx % steps.length];
      for (const e of evs) playEvent(e, nextNoteTime, beat, T);
      if (lv >= 6 && noteIdx % 2 === 0) blip(82, 62, 55, nextNoteTime, Math.min(0.35, beat * 0.6), 0.05 + 0.07 * urge, musicGain);
      nextNoteTime += beat / 2;
      noteIdx++;
    }
  }
  function emptyBoard() { return Array.from({ length: ROWS }, () => Array(COLS).fill(0)); }
  function rotateCW(m) { return m[0].map((_, i) => m.map(r => r[i]).reverse()); }
  function rotateCCW(m) { return rotateCW(rotateCW(rotateCW(m))); }
  function collides(b, m, x, y) {
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const nx = x + c, ny = y + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && b[ny][nx]) return true;
      }
    }
    return false;
  }
  function refillBag() {
    const a = [1, 2, 3, 4, 5, 6, 7];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function spawn(t) {
    const m = SHAPES[t].map(r => r.slice());
    return { t, m, x: Math.floor((COLS - m[0].length) / 2), y: t === 1 ? -1 : 0 };
  }
  function takeNext(g) { if (g.bag.length === 0) g.bag = refillBag(); return g.bag.shift(); }
  // 1.9.174 Tetris Effect stage for Farmyard (6) and Bullfrog (11) only.
  // Dark, beat-synced scenes; luminous tiles; action bursts. Other themes are unchanged.
  const FARM_ART = { plate: 'tetris-bg/farm-plate-87d14966.webp', land: 'tetris-bg/farm-land-dcf78c32.webp', atlas: 'tetris-bg/farm-animals-a062cf37.webp', sun: 'tetris-bg/farm-sun-378e81e0.webp' };
  // Sky line (photo px) every 6 px across the 540 px painting, from the sky mask.
  const FARM_HZ = [247,245,241,239,240,246,251,265,265,263,259,258,257,263,272,272,270,269,260,237,230,227,220,224,231,236,259,258,255,255,258,263,269,274,279,284,291,294,306,317,328,339,323,319,319,324,319,317,318,327,323,324,329,326,328,331,332,333,334,335,337,338,338,340,341,341,340,338,337,331,330,329,329,329,332,332,323,323,324,325,326,327,327,328,327,328,329,330,330,331,333];
  const FARM_SUN = { x: 66, y: 14, w: 142, h: 142, cx: 136.9, cy: 84.5, x0: 420, y0: 378.5, rTop: 64.5 };
  // [atlas x, atlas y, w, h, photo x, photo y, foot row]; head/tail: tip and neck columns, rows yA..yB blend.
  const FARM_RIG = {
    cow: { a: [0, 0, 121, 83, 135, 510, 81], kind: 'graze', head: { tip: 0, neck: 50, yA: 0.78, yB: 0.96 } },
    calf: { a: [123, 0, 69, 112, 247, 556, 110], kind: 'graze', head: { tip: 0, neck: 36, yA: 0.34, yB: 0.52 } },
    pig: { a: [194, 0, 155, 115, 319, 617, 112], kind: 'snuffle', head: { tip: 0, neck: 64, yA: 0.82, yB: 0.98 }, tail: { tip: 155, neck: 136, yA: 0.24, yB: 0.4 } },
    sheep: { a: [351, 0, 155, 143, 117, 673, 141], kind: 'graze', head: { tip: 155, neck: 100, yA: 0.4, yB: 0.58 } },
    rooster: { a: [0, 145, 115, 130, 419, 692, 128], kind: 'rooster', head: { tip: 0, neck: 40, yA: 0.34, yB: 0.52 }, tail: { tip: 115, neck: 68, yA: 0.42, yB: 0.64 } },
    henw1: { a: [117, 145, 72, 77, 268, 762, 75], kind: 'hen', head: { tip: 72, neck: 46, yA: 0.62, yB: 0.86 } },
    henw2: { a: [191, 145, 81, 88, 197, 814, 85], kind: 'hen', head: { tip: 81, neck: 54, yA: 0.58, yB: 0.82 } },
    henb1: { a: [274, 145, 62, 96, 344, 737, 94], kind: 'pecker', head: { tip: 0, neck: 28, yA: 0.97, yB: 1 } },
    henb2: { a: [338, 145, 86, 100, 365, 797, 98], kind: 'pecker', head: { tip: 0, neck: 32, yA: 0.97, yB: 1 } },
    chick: { a: [426, 145, 34, 46, 311, 852, 44], kind: 'chick' }
  };
  const FARM_BEH = {
    graze: ['graze', 'graze', 'look', 'nod', 'shuffle'],
    snuffle: ['snuffle', 'snuffle', 'look', 'shuffle'],
    rooster: ['look', 'peck', 'nod', 'shuffle'],
    hen: ['peck', 'peck', 'look', 'shuffle'],
    pecker: ['peck', 'peck', 'peck', 'shuffle'],
    chick: ['hop', 'hop', 'shuffle']
  };
  const farm = { img: null, ready: false, spr: {}, lit: {}, st: {}, stars: [], tilt: { x: 0, y: 0, at: -9, gx: 0, gy: 0 }, listen: false, crowed: false };
  // 1.9.178 Painted bullfrog cut-out (the frog in theme 11's photo) sings to the new track.
  const FROG_ART = { plate: 'tetris-bg/frog-plate-e01ea4ca.webp', atlas: 'tetris-bg/frog-atlas-26f38e61.webp', little: 'tetris-bg/frog-little-4dcdd4dc.webp' };
  // 1.9.185 Painted little frogs from 11.webp, hopping between lily pads. The big singer stays put.
  const FROG_LITTLE = [
    { name: 'left', ax: 2, ay: 2, aw: 105, ah: 95, px: 103.7, py: 390.0, ox: 54.7, oy: 82.0 },
    { name: 'right', ax: 109, ay: 2, aw: 89, ah: 92, px: 487.6, py: 403.0, ox: 44.6, oy: 68.0 }
  ];
  const FROG_LITTLE_PADS = [
    { x: 104, y: 390 }, { x: 200, y: 348 }, { x: 350, y: 368 },
    { x: 488, y: 403 }, { x: 505, y: 348 }, { x: 425, y: 515 }
  ];
  const FROG_META = {
    x: 46, y: 355, w: 372, h: 344, fw: 372, fh: 344,
    eyes: [{ x: 168, y: 52, r: 22 }, { x: 252, y: 48, r: 22 }],
    throat: { x: 210, y: 168 }, belly: { x: 210, y: 210 }, foot: { x: 186, y: 330 }
  };
  const frog = { img: null, ready: false, spr: [], little: null, notes: [] };
  // 1.9.179 Beach (theme 0, level 3): the painting itself moves — surf washes in and out,
  // palms sway in the wind, a little parallax and contact shadow. No cartoon add-ons.
  const BEACH_ART = {
    plate: 'tetris-bg/beach-plate-5b8a360f.webp',
    atlas: 'tetris-bg/beach-atlas-80e05e2c.webp',
    water: 'tetris-bg/beach-water-bb1635ec.webp',
    foam: 'tetris-bg/beach-foam-d4365f24.webp'
  };
  const BEACH_META = {
    trees: {
      mid: { ax: 0, ay: 0, aw: 134, ah: 150, x: 52, y: 311, w: 134, h: 150, px: 85, py: 454 },
      big: { ax: 138, ay: 0, aw: 307, ah: 452, x: 0, y: 0, w: 307, h: 452, px: 8, py: 445, crownY: 210 }
    },
    flowers: { ax: 449, ay: 0, aw: 300, ah: 289, x: 0, y: 671, w: 300, h: 289, px: 90, py: 955 },
    sea: { x: 181, y: 464, w: 359, h: 426 },
    foamBox: { x: 227, y: 475, w: 313, h: 401 },
    inland: [-0.64, 0.76],
    washPx: 42,
    horizon: 468,
    sun: [414, 422]
  };
  const beach = { img: null, ready: false };

  const SPARK_DUR = 600, SPARK_MAX = 5, SPARK_MAX_REDUCE = 1;
  const FW_ART = { sil: 'tetris-bg/fw-sil-947b87d3.webp', silY: 588 };
  const FW_META = { y: 588, h: 372, w: 540 };
  const FW_MAX_P = 900, FW_MAX_R = 14;
  const FW_KINDS = ['peony', 'chrys', 'willow', 'ring', 'crackle'];
  const FW_COLS = [
    [255, 214, 90], [255, 86, 128], [80, 220, 255], [186, 96, 255],
    [110, 255, 150], [255, 150, 56], [255, 244, 248], [255, 72, 196]
  ];
  const fw = { ready: false, sil: null, loading: false, rockets: [], parts: [], flashes: [], lit: 0, litR: 1, litG: 1, litB: 1, beatLatch: false, beatN: 0, hold: null, posed: false, prog: 0 };

  const OCEAN_ART = { plate: 'tetris-bg/ocean-plate-51d83ca2.webp', atlas: 'tetris-bg/ocean-atlas-fb01ff38.webp' };
  const OCEAN_META = {
    dolphins: [
    { name: 'top', ax: 2, ay: 2, aw: 261, ah: 186, x: 21, y: 136, w: 261, h: 186, px: 154.56, py: 208.08, ox: 133.56, oy: 72.08, ang: -30.09 },
    { name: 'mid', ax: 265, ay: 2, aw: 264, ah: 184, x: 13, y: 317, w: 264, h: 184, px: 152.33, py: 398.44, ox: 139.33, oy: 81.44, ang: -20.21 }
    ],
    fish: [
    { name: 'idol', ax: 531, ay: 2, aw: 40, ah: 42, x: 14, y: 368, w: 40, h: 42, px: 33.31, py: 390.69, ox: 19.31, oy: 22.69, ang: 65.74, kind: 'solo', nose: 1 },
    { name: 'yell_L', ax: 573, ay: 2, aw: 54, ah: 40, x: 10, y: 518, w: 54, h: 40, px: 35.28, py: 537.47, ox: 25.28, oy: 19.47, ang: 9.21, kind: 'yellow', nose: 1 },
    { name: 'yell_M', ax: 629, ay: 2, aw: 34, ah: 31, x: 101, y: 557, w: 34, h: 31, px: 119.46, py: 571.99, ox: 18.46, oy: 14.99, ang: -20.9, kind: 'yellow', nose: 1 },
    { name: 'yell_R', ax: 665, ay: 2, aw: 47, ah: 23, x: 101, y: 557, w: 47, h: 23, px: 122.64, py: 569.03, ox: 21.64, oy: 12.03, ang: 1.01, kind: 'yellow', nose: 1 },
    { name: 'butterfly', ax: 714, ay: 2, aw: 59, ah: 43, x: 375, y: 670, w: 59, h: 43, px: 405.96, py: 690.8, ox: 30.96, oy: 20.8, ang: -2.64, kind: 'solo', nose: -1 },
    { name: 'clown', ax: 775, ay: 2, aw: 61, ah: 28, x: 272, y: 716, w: 61, h: 28, px: 300.34, py: 731.47, ox: 28.34, oy: 15.47, ang: 7.41, kind: 'solo', nose: 1 },
    { name: 'orange_L', ax: 838, ay: 2, aw: 39, ah: 24, x: 86, y: 666, w: 39, h: 24, px: 105.62, py: 677.0, ox: 19.62, oy: 11.0, ang: 17.64, kind: 'solo', nose: 1 },
    { name: 'orange_M', ax: 879, ay: 2, aw: 36, ah: 25, x: 145, y: 693, w: 36, h: 25, px: 163.04, py: 706.41, ox: 18.04, oy: 13.41, ang: 21.4, kind: 'solo', nose: 1 },
    { name: 'tang', ax: 917, ay: 2, aw: 95, ah: 47, x: 395, y: 576, w: 95, h: 47, px: 444.0, py: 600.0, ox: 49.0, oy: 24.0, ang: -7.9, kind: 'solo', nose: -1 },
    { name: 'purp_u', ax: 2, ay: 190, aw: 73, ah: 42, x: 430, y: 630, w: 73, h: 42, px: 474.27, py: 660.29, ox: 44.27, oy: 30.29, ang: 13.82, kind: 'solo', nose: -1 },
    { name: 'purp_l', ax: 77, ay: 190, aw: 75, ah: 47, x: 385, y: 720, w: 75, h: 47, px: 435.34, py: 749.14, ox: 50.34, oy: 29.14, ang: -8.78, kind: 'solo', nose: -1 },
    { name: 'gold', ax: 154, ay: 190, aw: 16, ah: 12, x: 449, y: 539, w: 16, h: 12, px: 468.0, py: 552.0, ox: 19.0, oy: 13.0, ang: 7.73, kind: 'solo', nose: -1 },
    { name: 'anthias_4', ax: 172, ay: 190, aw: 22, ah: 15, x: 180, y: 602, w: 22, h: 15, px: 190.91, py: 608.94, ox: 10.91, oy: 6.94, ang: 7.49, kind: 'orange', nose: 1 },
    { name: 'anthias_6', ax: 196, ay: 190, aw: 16, ah: 12, x: 164, y: 618, w: 16, h: 12, px: 171.15, py: 623.4, ox: 7.15, oy: 5.4, ang: -9.12, kind: 'orange', nose: -1 },
    { name: 'anthias_7', ax: 214, ay: 190, aw: 18, ah: 14, x: 181, y: 630, w: 18, h: 14, px: 189.47, py: 636.63, ox: 8.47, oy: 6.63, ang: 26.98, kind: 'orange', nose: -1 },
    { name: 'anthias_8', ax: 234, ay: 190, aw: 21, ah: 15, x: 149, y: 632, w: 21, h: 15, px: 159.22, py: 639.02, ox: 10.22, oy: 7.02, ang: 17.42, kind: 'orange', nose: 1 },
    { name: 'anthias_9', ax: 257, ay: 190, aw: 18, ah: 13, x: 181, y: 648, w: 18, h: 13, px: 189.52, py: 654.08, ox: 8.52, oy: 6.08, ang: 12.04, kind: 'orange', nose: -1 },
    { name: 'anthias_10', ax: 277, ay: 190, aw: 14, ah: 12, x: 168, y: 653, w: 14, h: 12, px: 174.53, py: 658.45, ox: 6.53, oy: 5.45, ang: 23.88, kind: 'orange', nose: -1 },
    { name: 'anthias_11', ax: 293, ay: 190, aw: 19, ah: 16, x: 203, y: 653, w: 19, h: 16, px: 212.05, py: 660.21, ox: 9.05, oy: 7.21, ang: 30.48, kind: 'orange', nose: -1 },
    { name: 'anthias_12', ax: 314, ay: 190, aw: 19, ah: 14, x: 153, y: 656, w: 19, h: 14, px: 162.34, py: 662.06, ox: 9.34, oy: 6.06, ang: 16.99, kind: 'orange', nose: 1 },
    { name: 'anthias_13', ax: 335, ay: 190, aw: 22, ah: 14, x: 220, y: 664, w: 22, h: 14, px: 230.54, py: 670.52, ox: 10.54, oy: 6.52, ang: 12.97, kind: 'orange', nose: -1 },
    { name: 'anthias_14', ax: 359, ay: 190, aw: 20, ah: 14, x: 181, y: 666, w: 20, h: 14, px: 190.78, py: 672.63, ox: 9.78, oy: 6.63, ang: 8.75, kind: 'orange', nose: 1 },
    { name: 'anthias_18', ax: 381, ay: 190, aw: 18, ah: 12, x: 235, y: 682, w: 18, h: 12, px: 243.45, py: 687.53, ox: 8.45, oy: 5.53, ang: 16.3, kind: 'orange', nose: -1 },
    { name: 'anthias_20', ax: 401, ay: 190, aw: 17, ah: 13, x: 192, y: 687, w: 17, h: 13, px: 200.11, py: 692.95, ox: 8.11, oy: 5.95, ang: 11.95, kind: 'orange', nose: -1 }
    ]
  };
  const EFFECT_TI = { 0: 'beach', 1: 'fireworks', 2: 'ocean', 6: 'farm', 11: 'frog' };
  function isEffect(ti) { return EFFECT_TI[ti] || null; }
  function reduceMotion() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function effectProg(lines) { return Math.min(1, (Math.max(0, lines || 0) % 10) / 9); }
  function musicBeat(ti, time) {
    const tr = TRACKS[ti] || { bpm: 120, offset: 0 };
    const bpm = tr.bpm > 0 ? tr.bpm : 120, offset = tr.offset || 0, period = 60 / bpm;
    let t = time;
    if (t == null) {
      if (ac && bgmNode && musicOn) {
        t = Math.max(0, (ac.currentTime - bgmAt) * (bgmRate || 1));
        const buf = bgmBufs[ti];
        if (buf && buf.duration) t = t % buf.duration;
      } else t = (root.performance ? root.performance.now() / 1000 : 0);
    }
    const u = t - offset;
    const phase = ((u % period) + period) % period;
    const pulse = Math.max(0, 1 - phase / (period * 0.32));
    return { t: t, period: period, phase: phase, pulse: pulse * pulse, on: phase < period * 0.1 };
  }
  const efx = { parts: [], pool: [], trails: [], ripples: [], zoom: 1, zoomV: 0, cap: 140, degrade: false, lastMs: 16 };
  var life = { react: 0, seeded: false, hold: null, actors: [], frog: null, ripples: [], flies: [], fish: null, t: 0, cache: {}, kind: '', beatN: 0, beatLatch: false, croak: 0, cv: null, ctx: null, w: 0, h: 0 };
  function efxTake() { return efx.pool.pop() || { typ: '', x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0, size: 0, color: '', spin: 0, tx: 0, ty: 0, ph: 0, a: 1 }; }
  function efxKill(i) {
    const p = efx.parts[i];
    if (!p) return;
    efx.parts[i] = efx.parts[efx.parts.length - 1];
    efx.parts.pop();
    if (efx.pool.length < 200) efx.pool.push(p);
  }
  function efxCap() {
    if (reduceMotion()) return 48;
    return efx.degrade ? 80 : efx.cap;
  }
  function efxEmit(spec) {
    if (efx.parts.length >= efxCap()) {
      // drop the oldest short spark first
      let old = 0, best = 1e9;
      for (let i = 0; i < efx.parts.length; i++) if (efx.parts[i].life < best) { best = efx.parts[i].life; old = i; }
      efxKill(old);
    }
    const p = efxTake();
    p.typ = spec.typ || 'spark';
    p.x = spec.x || 0; p.y = spec.y || 0;
    p.vx = spec.vx || 0; p.vy = spec.vy || 0;
    p.max = spec.max || 0.6; p.life = p.max;
    p.size = spec.size || 3; p.color = spec.color || '#fff';
    p.spin = spec.spin || 0; p.ph = spec.ph || 0;
    p.tx = spec.tx || 0; p.ty = spec.ty || 0;
    p.a = 1;
    efx.parts.push(p);
    return p;
  }
  function efxClearAll() { while (efx.parts.length) efxKill(0); efx.trails.length = 0; efx.ripples.length = 0; }
  function boardToScreen(x, y) {
    const el = root.document && root.document.getElementById('board');
    if (!el || !el.getBoundingClientRect) return null;
    const r = el.getBoundingClientRect();
    const sx = r.width / (COLS * CELL), sy = r.height / (ROWS * CELL);
    return { x: r.left + x * sx, y: r.top + y * sy, sx: sx, sy: sy, r: r };
  }
  function effectAction(kind, g) {
    if (!isEffect(themeFor(g && g.level)) || !root.document) return;
    if (reduceMotion()) return;
    const p = g.piece; if (!p) return;
    const pal = (LOOKS[themeFor(g.level)] && LOOKS[themeFor(g.level)].colors) || ['#fff'];
    const n = kind === 'rotate' ? 5 : 3;
    for (let i = 0; i < n; i++) {
      let cx = (p.x + 0.5) * CELL, cy = (p.y + 0.5) * CELL;
      p.m.forEach((row, r) => row.forEach((v, c) => { if (v) { cx = (p.x + c + 0.5) * CELL; cy = (p.y + r + 0.5) * CELL; } }));
      // pick a random filled cell
      const cells = [];
      p.m.forEach((row, r) => row.forEach((v, c) => { if (v && p.y + r >= 0) cells.push({ c: p.x + c, r: p.y + r }); }));
      const cell = cells[(Math.random() * cells.length) | 0] || { c: p.x, r: Math.max(0, p.y) };
      const s = boardToScreen((cell.c + 0.5) * CELL, (cell.r + 0.5) * CELL);
      if (!s) return;
      const ang = Math.random() * 6.28, spd = (kind === 'rotate' ? 40 : 28) + Math.random() * 40;
      efxEmit({ typ: 'spark', x: s.x, y: s.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 16, max: 0.32 + Math.random() * 0.18, size: 1.6 + Math.random() * 2.2, color: pal[(Math.random() * pal.length) | 0], spin: (Math.random() - 0.5) * 8 });
    }
  }
  function effectDropTrail(g, fromY, toY) {
    if (!isEffect(themeFor(g.level)) || !root.document || reduceMotion()) return;
    const p = g.piece; if (!p) return;
    const color = blockColor(p.t, g.lines, g.level);
    const cells = [];
    p.m.forEach((row, r) => row.forEach((v, c) => { if (v) cells.push({ c: p.x + c, r: r }); }));
    efx.trails.push({ cells: cells, fromY: fromY, toY: toY, color: color, t: 0, dur: 280 });
  }
  function effectLand(g) {
    if (!isEffect(themeFor(g.level)) || !root.document) return;
    const p = g.piece; if (!p) return;
    const cells = [];
    p.m.forEach((row, r) => row.forEach((v, c) => { if (v && p.y + r >= 0) cells.push({ c: p.x + c, r: p.y + r }); }));
    const color = blockColor(p.t, g.lines, g.level);
    cells.forEach(cell => {
      efx.ripples.push({ x: (cell.c + 0.5) * CELL, y: (cell.r + 0.5) * CELL, t: 0, dur: reduceMotion() ? 220 : 420, color: color });
    });
  }
  function effectOnClear(fx, ti) {
    const kind = isEffect(ti);
    if (!kind || !fx || !root.document) return;
    fx.effect = true;
    if (kind === 'fireworks') { fwOnClear(fx.n); return; }
    if (!reduceMotion() && (fx.n >= 3 || fx.banner)) {
      efx.zoom = Math.max(efx.zoom, fx.n === 4 ? 1.05 : 1.03);
      efx.zoomV = 0;
    }
    const pal = (LOOKS[ti] && LOOKS[ti].colors) || ['#fff'];
    const reduce = reduceMotion();
    const count = reduce ? 6 : Math.min(22, 8 + fx.n * 4);
    const midX = COLS * CELL / 2, midY = ((fx.rows[0] + fx.rows[fx.rows.length - 1]) / 2 + 0.5) * CELL;
    const origin = boardToScreen(midX, midY);
    const board = origin && origin.r;
    for (let i = 0; i < count; i++) {
      const row = fx.rows[i % fx.rows.length];
      const x0 = (i / Math.max(1, count - 1)) * COLS * CELL;
      const s = boardToScreen(x0, row * CELL + CELL * 0.5);
      if (!s) break;
      const ang = -0.2 + Math.random() * 1.2 * (Math.random() < 0.5 ? 1 : -1) - Math.PI / 2;
      const spd = 70 + fx.n * 18 + Math.random() * 90;
      // swirl target: a background point around the board (or screen edges)
      let tx, ty;
      if (board) {
        const side = Math.random();
        if (side < 0.35) { tx = board.left - 20 - Math.random() * 80; ty = board.top + Math.random() * board.height; }
        else if (side < 0.7) { tx = board.right + 20 + Math.random() * 80; ty = board.top + Math.random() * board.height; }
        else { tx = board.left + Math.random() * board.width; ty = board.bottom + 10 + Math.random() * 70; }
      } else { tx = s.x; ty = s.y; }
      efxEmit({ typ: kind === 'farm' ? 'seed' : 'drop', x: s.x, y: s.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, max: 0.9 + Math.random() * 0.6 + (fx.n === 4 ? 0.25 : 0), size: 2.2 + Math.random() * 3.2 + fx.n * 0.25, color: pal[(Math.random() * pal.length) | 0], spin: (Math.random() - 0.5) * 6, tx: tx, ty: ty, ph: 1 });
    }
  }
  function effectOnLevelUp(ti) {
    const kind = isEffect(ti);
    if (!kind || !root.document) return;
    if (kind === 'fireworks') {
      if (!reduceMotion()) { efx.zoom = 1.07; efx.zoomV = 0; }
      fwOnLevelUp();
      return;
    }
    if (!reduceMotion()) { efx.zoom = 1.07; efx.zoomV = 0; }
    const pal = (LOOKS[ti] && LOOKS[ti].colors) || ['#fff'];
    const el = root.document.getElementById('board');
    if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const n = reduceMotion() ? 12 : 48;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * 6.28 + Math.random() * 0.2;
      const spd = 50 + Math.random() * 140;
      efxEmit({ typ: 'glow', x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, max: 1.1 + Math.random() * 0.5, size: 3 + Math.random() * 5, color: pal[i % pal.length], spin: 0, tx: cx + Math.cos(ang) * (r.width * 0.8), ty: cy + Math.sin(ang) * (r.height * 0.8), ph: 1 });
    }
  }
  function effectTick(dt) {
    const sec = Math.min(0.05, dt / 1000);
    try {
      if (life.hold == null && life.seeded) {
        const ti = lookIdx < 0 ? themeIdx : lookIdx;
        const lines = (g.clearFx ? g.clearFx.lines + g.clearFx.n : g.lines) || 0;
        lifeAdvance(sec, effectProg(lines), musicBeat(ti), reduceMotion());
      }
    } catch (e) { }
    efx.lastMs = dt;
    efx.degrade = dt > 24;
    // zoom ease back to 1
    if (efx.zoom !== 1) {
      efx.zoom += (1 - efx.zoom) * Math.min(1, sec * 5.5);
      if (Math.abs(efx.zoom - 1) < 0.002) efx.zoom = 1;
    }
    for (let i = efx.trails.length - 1; i >= 0; i--) {
      efx.trails[i].t += dt;
      if (efx.trails[i].t >= efx.trails[i].dur) efx.trails.splice(i, 1);
    }
    for (let i = efx.ripples.length - 1; i >= 0; i--) {
      efx.ripples[i].t += dt;
      if (efx.ripples[i].t >= efx.ripples[i].dur) efx.ripples.splice(i, 1);
    }
    for (let i = efx.parts.length - 1; i >= 0; i--) {
      const p = efx.parts[i];
      p.life -= sec;
      if (p.life <= 0) { efxKill(i); continue; }
      const age = 1 - p.life / p.max;
      if (p.ph) {
        // fly out, then steer back toward a background target
        if (age > 0.28) {
          const k = 2.6;
          p.vx += (p.tx - p.x) * k * sec;
          p.vy += (p.ty - p.y) * k * sec;
          p.vx *= 0.92; p.vy *= 0.92;
        } else {
          p.vy += 40 * sec;
        }
      } else {
        p.vy += 30 * sec;
      }
      p.x += p.vx * sec;
      p.y += p.vy * sec;
    }
  }

  // 1.9.158 Line-clear flourish: a soft coloured sweep, themed sparkles, a short pause, then the rows drop.
  // Pause stays under 400ms so the game still flows. More lines = a bigger burst; four lines get a soft banner.
  const CLEAR_KIND = { 1: 'leaves', 2: 'bubbles', 3: 'leaves', 5: 'stars', 7: 'stars', 10: 'snow', 11: 'frog' };
  function clearDuration(n) { return Math.min(400, 240 + 40 * Math.max(1, Math.min(4, n || 1))); }
  function clearKind(ti) { return CLEAR_KIND[ti] || 'sparkle'; }
  function clearPartCount(n) { return Math.min(36, 8 + 8 * Math.max(1, Math.min(4, n || 1))); }
  function startClear(g, rows, snap, lines, level, snapHits) {
    const n = rows.length;
    const ti = themeFor(level);
    const kind = clearKind(ti);
    const dur = clearDuration(n);
    const parts = [];
    let reduce = false;
    try { reduce = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { }
    const count = reduce ? Math.min(8, clearPartCount(n)) : clearPartCount(n);
    const colours = [];
    rows.forEach(r => {
      (snap[r] || []).forEach(v => { if (v) colours.push(blockColor(v, lines, level)); });
    });
    const fallback = (LOOKS[ti] && LOOKS[ti].colors) || COLORS.slice(1);
    const pal = colours.length ? colours : fallback;
    const pick = () => pal[(Math.random() * pal.length) | 0];
    for (let i = 0; i < count; i++) {
      const row = rows[i % rows.length];
      const x0 = (i / Math.max(1, count - 1)) * COLS * CELL * 0.92 + Math.random() * 8;
      const y0 = row * CELL + CELL * 0.5;
      const ang = -0.35 + (i % 7) * 0.18 + Math.random() * 0.2;
      const spd = 28 + n * 8 + Math.random() * 36;
      parts.push({
        kind, x0, y0,
        vx: Math.cos(ang) * spd * (Math.random() < 0.5 ? 1 : -1),
        vy: -Math.abs(Math.sin(ang) * spd) - 20 - n * 4,
        color: pick(),
        size: (kind === 'bubbles' ? 3.8 : kind === 'frog' ? 4.2 : 2.4) + Math.random() * (kind === 'frog' ? 4 : 3.2) + n * 0.3,
        delay: (i / Math.max(1, count)) * 0.22,
        rot: Math.random() * 6.28,
        spin: (Math.random() - 0.5) * 3,
        hop: 18 + Math.random() * 16
      });
    }
    g.clearFx = { t: 0, dur, rows: rows.slice(), snap, snapHits: snapHits ? snapHits.map(r => r.slice()) : null, n, kind, parts, lines, level, hold: false, at: 0, banner: n === 4 };
    if (isEffect(ti)) { effectOnClear(g.clearFx, ti); lifeReact(); }
    if (ti === NZ_THEME) startNzFlash();
    return g.clearFx;
  }
  function tickClear(g, dt) {
    const fx = g.clearFx;
    if (!fx) return false;
    if (fx.hold) return true;
    fx.t += dt;
    if (fx.t >= fx.dur) {
      g.clearFx = null;
      if (g.pendingLevel) {
        const pl = g.pendingLevel;
        g.pendingLevel = null;
        startLevelUp(g, pl.from, pl.to);
      } else if (g.pendingHigh) startHighScore(g);
      return false;
    }
    return true;
  }
  // Brief LEVEL UP! overlay when the player reaches a new theme.
  // About 1.8s, candy-gloss word, themed particles, a soft shimmer, then fade.
  // Gravity and input pause for that moment so a piece does not drop behind the banner;
  // music keeps playing, with a short duck that always restores.
  const LEVEL_UP_MS = 1800;
  function levelUpDuration() { return LEVEL_UP_MS; }
  function levelUpCopy(fromLevel, toLevel) {
    const ti = themeFor(toLevel);
    const name = (THEMES[ti] && THEMES[ti].name) || '';
    if (fromLevel > 0 && fromLevel % ORDER.length === 0) {
      return { beat: true, title: 'YOU DID IT!', sub: 'You beat every level!', theme: ti, level: toLevel };
    }
    return { beat: false, title: 'LEVEL UP!', sub: 'Level ' + toLevel + ': ' + name, theme: ti, level: toLevel };
  }
  function burstParts(ti, n, pal, scatter, rows) {
    const kind = clearKind(ti);
    let reduce = false;
    try { reduce = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { }
    const count = reduce ? Math.min(8, clearPartCount(n)) : clearPartCount(n);
    const fallback = (LOOKS[ti] && LOOKS[ti].colors) || COLORS.slice(1);
    const use = (pal && pal.length) ? pal : fallback;
    const pick = () => use[(Math.random() * use.length) | 0];
    const parts = [];
    const rowList = (rows && rows.length) ? rows : [10];
    for (let i = 0; i < count; i++) {
      const row = rowList[i % rowList.length];
      const x0 = scatter
        ? 16 + Math.random() * (COLS * CELL - 32)
        : (i / Math.max(1, count - 1)) * COLS * CELL * 0.92 + Math.random() * 8;
      const y0 = scatter
        ? (ROWS * CELL) * (0.28 + Math.random() * 0.36)
        : row * CELL + CELL * 0.5;
      const ang = -0.35 + (i % 7) * 0.18 + Math.random() * 0.2;
      const spd = 28 + n * 8 + Math.random() * 36;
      parts.push({
        kind, x0, y0,
        vx: Math.cos(ang) * spd * (Math.random() < 0.5 ? 1 : -1),
        vy: -Math.abs(Math.sin(ang) * spd) - 20 - n * 4,
        color: pick(),
        size: (kind === 'bubbles' ? 3.8 : kind === 'frog' ? 4.2 : 2.4) + Math.random() * (kind === 'frog' ? 4 : 3.2) + n * 0.3,
        delay: (i / Math.max(1, count)) * 0.22,
        rot: Math.random() * 6.28,
        spin: (Math.random() - 0.5) * 3,
        hop: 18 + Math.random() * 16
      });
    }
    return parts;
  }
  function luRand(seed) {
    seed = (seed * 16807) % 2147483647;
    return { seed: seed, v: (seed - 1) / 2147483646 };
  }
  // Branching bolts around the board / banner. Mid-point displacement, cheap to stroke.
  function makeLightning(w, h) {
    w = w || 280; h = h || 560;
    const bolts = [];
    let seed = 9301 + ((w * 13 + h) | 0);
    function rnd() { const r = luRand(seed); seed = r.seed; return r.v; }
    function bolt(x0, y0, x1, y1, depth, jag) {
      const pts = [{ x: x0, y: y0 }, { x: x1, y: y1 }];
      function split(list, d, j) {
        if (d <= 0) return list;
        const out = [list[0]];
        for (let i = 1; i < list.length; i++) {
          const a = list[i - 1], b = list[i];
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          const ox = (-dy / len) * (rnd() - 0.5) * 2 * j, oy = (dx / len) * (rnd() - 0.5) * 2 * j;
          out.push({ x: mx + ox, y: my + oy }); out.push(b);
        }
        return split(out, d - 1, j * 0.55);
      }
      const path = split(pts, depth, jag);
      const branches = [];
      if (depth >= 3) {
        for (let i = 2; i < path.length - 1; i++) if (rnd() < 0.28) {
          const p = path[i], ang = Math.atan2(path[i].y - path[i - 1].y, path[i].x - path[i - 1].x) + (rnd() < 0.5 ? 0.7 : -0.7);
          const len = 18 + rnd() * 28;
          branches.push(split([p, { x: p.x + Math.cos(ang) * len, y: p.y + Math.sin(ang) * len }], 2, jag * 0.5));
        }
      }
      return { path: path, branches: branches, phase: rnd() * 6.28 };
    }
    // Around the board: bolts along each edge, branching outward.
    const pad = 10;
    const edges = [
      [pad, pad, w - pad, pad],
      [w - pad, pad, w - pad, h - pad],
      [w - pad, h - pad, pad, h - pad],
      [pad, h - pad, pad, pad]
    ];
    edges.forEach((e, i) => {
      const t0 = 0.1 + (i % 2) * 0.15, t1 = 0.7 + rnd() * 0.2;
      const x0 = e[0] + (e[2] - e[0]) * t0, y0 = e[1] + (e[3] - e[1]) * t0;
      const x1 = e[0] + (e[2] - e[0]) * t1, y1 = e[1] + (e[3] - e[1]) * t1;
      // push slightly outward
      const nx = (i === 1) ? 1 : (i === 3) ? -1 : (rnd() - 0.5) * 0.4;
      const ny = (i === 2) ? 1 : (i === 0) ? -1 : (rnd() - 0.5) * 0.4;
      bolts.push(bolt(x0 + nx * 6, y0 + ny * 6, x1 + nx * 18, y1 + ny * 22, 5, 16));
    });
    // A few bolts toward the banner (centre of the board)
    const cx = w / 2, cy = h / 2 - 18;
    for (let k = 0; k < 4; k++) {
      const ang = -0.9 + k * 0.6 + (rnd() - 0.5) * 0.25;
      const r0 = 28 + rnd() * 10, r1 = 90 + rnd() * 40;
      bolts.push(bolt(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0, cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1, 4, 14));
    }
    return bolts;
  }
  function strokeBolt(ctx, pts, width, color) {
    if (!pts || pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }
  function drawLightningBolts(ctx, bolts, p, fade, flicker) {
    if (!bolts || !bolts.length || !(fade > 0.02)) return;
    const appear = Math.min(1, p / 0.12);
    const hold = p < 0.72 ? 1 : Math.max(0, (1 - p) / 0.28);
    const a = fade * appear * hold;
    bolts.forEach((b, i) => {
      const fl = 0.55 + 0.45 * Math.abs(Math.sin(flicker * 18 + b.phase + i));
      const aa = a * fl;
      if (aa < 0.03) return;
      strokeBolt(ctx, b.path, 5.2, 'rgba(160,210,255,' + (0.22 * aa) + ')');
      strokeBolt(ctx, b.path, 2.2, 'rgba(200,230,255,' + (0.55 * aa) + ')');
      strokeBolt(ctx, b.path, 1.05, 'rgba(255,255,255,' + (0.9 * aa) + ')');
      (b.branches || []).forEach(br => {
        strokeBolt(ctx, br, 2.4, 'rgba(170,215,255,' + (0.28 * aa) + ')');
        strokeBolt(ctx, br, 0.9, 'rgba(255,255,255,' + (0.7 * aa) + ')');
      });
    });
  }
  function startLevelUp(g, fromLevel, toLevel) {
    const copy = levelUpCopy(fromLevel, toLevel);
    const ti = copy.theme;
    themeIdx = ti;
    noteIdx = 0;
    const pal = (LOOKS[ti] && LOOKS[ti].colors) || COLORS.slice(1);
    const parts = burstParts(ti, 4, pal, true, null);
    let reduce = false;
    try { reduce = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { }
    g.levelUp = {
      t: 0, dur: LEVEL_UP_MS, hold: false, at: 0,
      title: copy.title, sub: copy.sub, beat: copy.beat,
      level: toLevel, theme: ti, kind: clearKind(ti), parts, n: 4, reduce,
      lines: g.lines,
      bolts: reduce ? [] : makeLightning(COLS * CELL, ROWS * CELL)
    };
    playLevelUpSfx(ti);
    if (isEffect(ti)) { effectOnLevelUp(ti); lifeReact(); }
    return g.levelUp;
  }
  function tickLevelUp(g, dt) {
    const lu = g.levelUp;
    if (!lu) return false;
    if (lu.hold) return true;
    lu.t += dt;
    if (lu.t >= lu.dur) { g.levelUp = null; if (g.pendingHigh) startHighScore(g); return false; }
    return true;
  }
  function newGame(opt) {
    opt = opt || {};
    const level = Math.max(1, opt.level || 1);
    const practice = !!opt.practice;
    const g = { board: emptyBoard(), hits: emptyBoard(), piece: spawn(1), bag: refillBag(), next: 0, hold: 0, canHold: true, score: 0, lines: (level - 1) * 10, level, over: false, paused: false, acc: 0, flashT: 0, popup: '', popupT: 0, practice, startLevel: level, clearFx: null, pendingLevel: null, levelUp: null, callout: null, clearCombo: 0, lastWasTetris: false, familyHigh: 0, highNoted: false, highScore: null, pendingHigh: false };
    g.piece = spawn(takeNext(g));
    g.next = takeNext(g);
    seedHighBar(g);
    return g;
  }
  function dropInterval(level) { return Math.max(60, 800 * Math.pow(0.85, level - 1)); }
  // 1.9.193 New Zealand (theme 9, level 8): gravity is quantised to the song's beat.
  // Starts at 1 row every 2 beats, ramps to 1 row per beat, then 2 rows per beat
  // near the end, never faster than the global dropInterval for that level.
  const NZ_THEME = 9;
  function nzProg(lines, level) {
    const lv = Math.max(1, level || 1);
    const base = (lv - 1) * 10;
    return Math.max(0, Math.min(1, ((lines || 0) - base) / 10));
  }
  function nzBeatsPerRow(prog) {
    const p = Math.max(0, Math.min(1, prog || 0));
    if (p < 0.55) return 2 - p / 0.55;
    return 1 - 0.5 * Math.min(1, (p - 0.55) / 0.45);
  }
  function nzDropInterval(lines, level) {
    const tr = TRACKS[NZ_THEME] || { bpm: 143.25 };
    const beatMs = 60000 / (tr.bpm > 0 ? tr.bpm : 143.25);
    const ms = nzBeatsPerRow(nzProg(lines, level)) * beatMs;
    return Math.max(dropInterval(level), ms);
  }
  function nzSnapTime(t, grid, offset) {
    const off = offset || 0;
    const k = Math.round((t - off) / grid);
    return off + k * grid;
  }

  function findFullRows(g) {
    const full = [];
    for (let r = 0; r < ROWS; r++) if (g.board[r].every(v => v !== 0)) full.push(r);
    return full;
  }
  function applyClear(g, full) {
    if (!full || !full.length) return 0;
    const oldLevel = g.level;
    const snap = g.board.map(r => r.slice());
    const snapHits = ensureHits(g).map(r => r.slice());
    startClear(g, full, snap, g.lines, g.level, snapHits);
    g.board = dropRows(g.board, full, 0);
    g.hits = dropRows(g.hits, full, 0);
    const pts = LINE_POINTS[full.length] * g.level;
    g.lines += full.length;
    g.score += pts;
    g.level = Math.floor(g.lines / 10) + 1;
    g.flashT = g.clearFx.dur;
    g.popup = LINE_WORDS[full.length] + ' +' + pts;
    g.popupT = 1100;
    sfx(full.length === 4 ? 'tetris' : 'clear', full.length);
    if (g.level > oldLevel) g.pendingLevel = { from: oldLevel, to: g.level };
    g.clearCombo = (g.clearCombo || 0) + 1;
    const b2b = !!(g.lastWasTetris && full.length === 4);
    g.lastWasTetris = full.length === 4;
    const high = g.board.some((row, r) => r <= 7 && row.some(v => v));
    maybeCallout(g, { n: full.length, combo: g.clearCombo, b2b: b2b, high: high, near: false, level: g.level });
    snowOnLineClear(g);
    return full.length;
  }

  // 1.9.188 City (theme 4, level 5): construction workers climb a long ladder and
  // place a single block cell on top of the stack. A "brick" is one cell.
  const CITY_THEME = 4;
  // Seconds between placements (first and later). Modest and easy to tune.
  const CITY_BUILD_EVERY = [6, 10];
  // 1.9.195: 3x as often while the highest settled block is below half the well
  // (rows 11–19, or empty). Re-checked each time the next brick is scheduled.
  const CITY_BUILD_EVERY_LOW = [2, 10 / 3];
  const CITY_SAFE_TOP = 6; // never build in the top 6 rows — keep it a fun challenge, not unfair
  const CITY_CREW_N = 2;
  const CITY_ANIM_CLIMB = 1500, CITY_ANIM_PLACE = 420, CITY_ANIM_DOWN = 1300; // 3.22s total
  const CITY_ANIM_FAST = 1 / 3; // 1.073s, fits inside the 2s fast wait
  function cityHighestSettled(g) {
    if (!g || !g.board) return ROWS;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) if (g.board[r][c]) return r;
    }
    return ROWS;
  }
  function cityStackLow(g) {
    // Halfway is row 10 (10 cells up from the floor). Below that is a low stack.
    return cityHighestSettled(g) > (ROWS / 2);
  }
  function cityBuildEvery(g) {
    return cityStackLow(g) ? CITY_BUILD_EVERY_LOW : CITY_BUILD_EVERY;
  }
  function cityBuildWait(g) {
    const ev = cityBuildEvery(g);
    const lo = ev[0], hi = ev[1];
    return (lo + Math.random() * Math.max(0, hi - lo)) * 1000;
  }
  function cityAnimDur(stage, gOrFast) {
    const base = stage === 'climb' ? CITY_ANIM_CLIMB : stage === 'place' ? CITY_ANIM_PLACE : CITY_ANIM_DOWN;
    const fast = typeof gOrFast === 'boolean' ? gOrFast : cityStackLow(gOrFast);
    return fast ? base * CITY_ANIM_FAST : base;
  }
  function pieceDropCovers(g, c, r) {
    const p = g.piece;
    if (!p || g.over || r < 0) return false;
    if (pieceCovers(g, c, r)) return true;
    let gy = p.y;
    while (!collides(g.board, p.m, p.x, gy + 1)) gy++;
    const mr = r - gy, mc = c - p.x;
    return !!(p.m[mr] && p.m[mr][mc]);
  }
  function cityStackTop(g, c) {
    if (c < 0 || c >= COLS) return -1;
    for (let r = 0; r < ROWS; r++) if (g.board[r][c]) return r - 1;
    return ROWS - 1;
  }
  function cityCanPlace(g, c, r) {
    if (!g || g.over || g.clearFx || g.levelUp || g.highScore) return false;
    if (r < CITY_SAFE_TOP || r >= ROWS || c < 0 || c >= COLS) return false;
    if (g.board[r][c]) return false;
    if (r < ROWS - 1 && !g.board[r + 1][c]) return false;
    if (pieceCovers(g, c, r) || pieceDropCovers(g, c, r)) return false;
    return true;
  }
  function cityPickCol(g) {
    const opts = [];
    for (let c = 0; c < COLS; c++) {
      const r = cityStackTop(g, c);
      if (cityCanPlace(g, c, r)) opts.push({ c: c, r: r });
    }
    if (!opts.length) return null;
    return opts[(Math.random() * opts.length) | 0];
  }
  function placeBuiltCell(g, c, r, typ) {
    typ = typ || (1 + ((Math.random() * 7) | 0));
    if (!cityCanPlace(g, c, r)) return null;
    g.board[r][c] = typ;
    ensureHits(g)[r][c] = 0;
    const n = applyClear(g, findFullRows(g));
    maybeHighScore(g);
    return { typ: typ, c: c, r: r, cleared: n };
  }
  function newCityCrew() {
    return { ready: false, t: 0, wait: 0, ladderC: 1, workers: [], dust: [], job: null };
  }
  function cityWorker(i) {
    return { id: i, x: 28 + i * 70, y: ROWS * CELL - 8, dir: i % 2 ? 1 : -1, walk: i * 0.4, pose: 'wander', brick: 0, climb: 0 };
  }
  function resetCityCrew(crew, level, g) {
    crew.ready = themeFor(level) === CITY_THEME;
    crew.t = 0;
    crew.wait = crew.ready ? cityBuildWait(g) : 0;
    crew.ladderC = 1;
    crew.workers = [];
    for (let i = 0; i < CITY_CREW_N; i++) crew.workers.push(cityWorker(i));
    crew.dust = [];
    crew.job = null;
    return crew;
  }
  function seedCityCrew(crew, g, opts) {
    opts = opts || {};
    if (themeFor(g.level) !== CITY_THEME) { crew.ready = false; crew.workers = []; crew.dust = []; crew.job = null; return crew; }
    resetCityCrew(crew, g.level, g);
    crew.wait = 1e9; // still picture for screenshots: no new jobs
    if (opts.ladderC != null) crew.ladderC = opts.ladderC;
    if (opts.workers) {
      opts.workers.forEach((src, i) => {
        const w = crew.workers[i] || cityWorker(i);
        Object.assign(w, src);
        crew.workers[i] = w;
      });
    }
    if (opts.job) crew.job = Object.assign({}, opts.job);
    if (opts.dust) crew.dust = opts.dust.slice();
    return crew;
  }
  function cityLadderFoot(crew) {
    const mid = (crew.ladderC + 0.5) * CELL;
    return { x: mid + 18, y: ROWS * CELL - 2 };
  }
  function cityLadderTop(crew, g) {
    const mid = (crew.ladderC + 0.5) * CELL;
    let r = crew.job ? crew.job.r : cityStackTop(g, crew.ladderC);
    if (r < 0 || r > ROWS - 1) r = Math.max(CITY_SAFE_TOP, ROWS - 8);
    return { x: mid, y: (r + 1) * CELL };
  }
  function cityAddDust(crew, c, r) {
    const cx = (c + 0.5) * CELL, cy = (r + 0.5) * CELL;
    for (let i = 0; i < 9; i++) {
      const a = -2.6 + Math.random() * 2.0;
      const sp = 18 + Math.random() * 38;
      crew.dust.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 8, t: 0, life: 320 + Math.random() * 180, sz: 1.2 + Math.random() * 1.8 });
    }
  }
  function stepCityCrew(crew, g, dt, flags) {
    flags = flags || {};
    if (themeFor(g.level) !== CITY_THEME) {
      if (crew.ready) { crew.ready = false; crew.workers = []; crew.dust = []; crew.job = null; }
      return crew;
    }
    if (!crew.ready) resetCityCrew(crew, g.level, g);
    crew.t += dt;
    if (crew.dust.length) {
      const k = dt / 1000;
      for (const d of crew.dust) { d.t += dt; d.x += d.vx * k; d.y += d.vy * k; d.vy += 70 * k; }
      crew.dust = crew.dust.filter(d => d.t < d.life);
    }
    if (flags.demo || g.demo) return crew;
    const moving = flags.started !== false && !g.over && !g.paused;
    if (!moving) return crew;
    // Wanderers amble along the bottom of the well.
    for (const w of crew.workers) {
      if (crew.job && crew.job.wid === w.id) continue;
      w.pose = 'wander';
      w.brick = 0;
      w.walk += dt / 260;
      w.x += w.dir * 18 * (dt / 1000);
      if (w.x < 16) { w.x = 16; w.dir = 1; }
      if (w.x > COLS * CELL - 16) { w.x = COLS * CELL - 16; w.dir = -1; }
      w.y = ROWS * CELL - 8 + Math.sin(w.walk) * 0.6;
      if (Math.random() < 0.002) w.dir *= -1;
    }
    if (!crew.job) {
      crew.wait -= dt;
      if (crew.wait <= 0) {
        const pick = cityPickCol(g);
        if (!pick) crew.wait = 1800;
        else {
          const wr = crew.workers[0] || cityWorker(0);
          if (!crew.workers.length) crew.workers.push(wr);
          crew.ladderC = pick.c;
          const fast = cityStackLow(g);
          crew.job = { c: pick.c, r: pick.r, typ: 1 + ((Math.random() * 7) | 0), stage: 'climb', p: 0, dur: cityAnimDur('climb', fast), fast: fast, wid: wr.id };
          wr.pose = 'climb';
          wr.brick = crew.job.typ;
          wr.dir = 1;
        }
      }
    } else {
      const job = crew.job;
      const wr = crew.workers.find(w => w.id === job.wid) || crew.workers[0];
      job.p += dt / job.dur;
      const foot = cityLadderFoot(crew);
      const top = cityLadderTop(crew, g);
      if (job.stage === 'climb') {
        wr.pose = 'climb';
        wr.brick = job.typ;
        const u = Math.max(0, Math.min(1, job.p));
        wr.x = foot.x + (top.x - foot.x) * u;
        wr.y = foot.y + (top.y - foot.y) * u;
        wr.walk += dt / 180;
        if (job.p >= 1) { job.stage = 'place'; job.p = 0; job.dur = cityAnimDur('place', !!job.fast); wr.pose = 'hammer'; }
      } else if (job.stage === 'place') {
        wr.pose = 'hammer';
        wr.x = top.x;
        wr.y = top.y;
        if (job.p >= 0.35 && !job.done) {
          // Re-check at the moment of placement so we never overlap the falling piece.
          const rNow = cityStackTop(g, job.c);
          const put = (rNow === job.r || rNow >= CITY_SAFE_TOP) ? placeBuiltCell(g, job.c, rNow, job.typ) : null;
          job.done = true;
          wr.brick = 0;
          if (put) {
            job.r = put.r;
            cityAddDust(crew, put.c, put.r);
            if (flags.onTock) flags.onTock();
          }
        }
        if (job.p >= 1) { job.stage = 'down'; job.p = 0; job.dur = cityAnimDur('down', !!job.fast); wr.pose = 'climb'; wr.brick = 0; }
      } else if (job.stage === 'down') {
        wr.pose = 'climb';
        wr.brick = 0;
        const u = Math.max(0, Math.min(1, job.p));
        wr.x = top.x + (foot.x - top.x) * u;
        wr.y = top.y + (foot.y - top.y) * u;
        wr.walk += dt / 180;
        if (job.p >= 1) {
          wr.pose = 'wander';
          wr.y = ROWS * CELL - 8;
          crew.job = null;
          crew.wait = cityBuildWait(g);
        }
      }
    }
    return crew;
  }

  function lockPiece(g) {

    const p = g.piece;
    for (let r = 0; r < p.m.length; r++) {
      for (let c = 0; c < p.m[r].length; c++) {
        if (!p.m[r][c]) continue;
        const y = p.y + r;
        if (y < 0) { g.over = true; continue; }
        g.board[y][p.x + c] = p.t;
      }
    }
    if (g.over) { sfx('over'); return g; }
    resetRotRiff();
    const full = findFullRows(g);
    const highBefore = g.board.some((row, r) => r <= 7 && row.some(v => v));
    const nearMiss = g.board.some((row, r) => row.filter(v => v).length === 9 && full.indexOf(r) < 0);
    if (full.length) {
      applyClear(g, full);
    } else {
      sfx('lock'); effectLand(g);
      g.clearCombo = 0;
      g.lastWasTetris = false;
      const high = highBefore;
      const near = nearMiss || (g.piece && g.piece.y <= 2);
      maybeCallout(g, { n: 0, combo: 0, b2b: false, high: high, near: near, level: g.level });
    }
    maybeHighScore(g);
    g.piece = spawn(g.next);
    g.next = takeNext(g);
    g.canHold = true;
    if (collides(g.board, g.piece.m, g.piece.x, g.piece.y)) { g.over = true; sfx('over'); }
    return g;
  }
  function act(g, a) {
    ensureAudio();
    if (a === 'pause') { if (!g.over) g.paused = !g.paused; return g; }
    if (a === 'restart') {
      noteIdx = 0;
      const next = newGame(g.practice ? { level: g.startLevel || 1, practice: true } : null);
      themeIdx = themeFor(next.level);
      return next;
    }
    if (g.over || g.paused) return g;
    if (g.clearFx || g.levelUp || g.highScore) return g;
    const p = g.piece;
    if (a === 'left' || a === 'right') {
      const dx = a === 'left' ? -1 : 1;
      if (!collides(g.board, p.m, p.x + dx, p.y)) { p.x += dx; sfx('move'); effectAction('move', g); }
    } else if (a === 'down') {
      if (!collides(g.board, p.m, p.x, p.y + 1)) { p.y++; g.score += 1; g.acc = 0; sfx('soft'); maybeHighScore(g); }
      else lockPiece(g);
    } else if (a === 'drop') {
      let d = 0;
      const fromY = p.y;
      while (!collides(g.board, p.m, p.x, p.y + 1)) { p.y++; d++; }
      g.score += d * 2;
      sfx('drop');
      if (d) effectDropTrail(g, fromY, p.y);
      lockPiece(g);
    } else if (a === 'rotate' || a === 'rotateBack') {
      const m = a === 'rotate' ? rotateCW(p.m) : rotateCCW(p.m);
      const kicks = [0, -1, 1, -2, 2];
      let turned = false;
      for (const k of kicks) {
        if (!collides(g.board, m, p.x + k, p.y)) { p.m = m; p.x += k; sfx('rotate'); effectAction('rotate', g); turned = true; break; }
        if (!collides(g.board, m, p.x + k, p.y - 1)) { p.m = m; p.x += k; p.y -= 1; sfx('rotate'); effectAction('rotate', g); turned = true; break; }
      }
      if (!turned) sfx('rotateFail');
    } else if (a === 'hold' && g.canHold) {
      const cur = p.t;
      if (g.hold) g.piece = spawn(g.hold);
      else { g.piece = spawn(g.next); g.next = takeNext(g); }
      g.hold = cur;
      g.canHold = false;
      resetRotRiff();
      sfx('hold');
    }
    return g;
  }
  // 1.9.145 Real recorded music, one track per theme (tetris-bg/m<theme>-<hash>.mp3, Kevin MacLeod, CC BY 4.0).
  // 1.9.188 m4 is Shane's Hot In The City loop (theme 4 / level 5).
  // It speeds up a little each level, and the old generated music is no longer played.
  // 1.9.164 Music plays through the shared AudioContext (decoded loop), so line-clear
  // effects cannot pause or mute a separate HTML audio element on iOS/Android WebView.
  // Filenames include a content hash because some phone media caches ignore ?v= query strings
  // (1.9.163 busted the URL but Shane still heard the old bullfrog track).
  const BGM_HASH = ['da11a54a', '9813c57a', '9ca3b84e', '7776197f', '1814d32a', '63c9eafe', '7bc4ebcd', 'b76dd1d3', 'fdec4369', '6a43316b', 'cdbe7d34', '8afd517f'];
  function bgmSrc(ti) { return 'tetris-bg/m' + ti + '-' + BGM_HASH[ti] + '.mp3'; }
  let bgmGain = null, bgmNode = null, bgmIdx = -1, bgmBufs = {}, bgmLoading = {}, bgmAt = 0, bgmRate = 1, bgmWant = false, bgmWantTi = -1, bgmAnalyser = null, bgmBins = null;
  function silentUnlock() {
    if (!ac) return;
    try { const z = ac.createBuffer(1, 1, ac.sampleRate || 44100); const s = ac.createBufferSource(); s.buffer = z; s.connect(ac.destination); s.start(0); } catch (e) { }
  }
  function ensureBgmGain() {
    if (!ac) return;
    if (!bgmGain) {
      bgmGain = ac.createGain();
      bgmGain.gain.value = BGM_VOL;
      bgmGain.connect(ac.destination);
      if (!bgmAnalyser && ac.createAnalyser) {
        bgmAnalyser = ac.createAnalyser();
        bgmAnalyser.fftSize = 256;
        bgmAnalyser.smoothingTimeConstant = 0.65;
        bgmGain.connect(bgmAnalyser);
      }
    }
  }
  function loadBgm(ti) {
    if (bgmBufs[ti]) return Promise.resolve(bgmBufs[ti]);
    if (bgmLoading[ti]) return bgmLoading[ti];
    if (!ac) return Promise.resolve(null);
    bgmLoading[ti] = fetch(bgmSrc(ti)).then(r => r.arrayBuffer()).then(ab => ac.decodeAudioData(ab.slice(0))).then(b => { bgmBufs[ti] = b; return b; }).catch(() => { bgmLoading[ti] = null; return null; });
    return bgmLoading[ti];
  }
  function stopBgmNode() {
    if (bgmNode) { try { bgmNode.onended = null; bgmNode.stop(); } catch (e) { } bgmNode = null; }
  }
  function startBgm(ti, rate) {
    if (!ac || !bgmGain || !bgmBufs[ti] || !musicOn) return;
    stopBgmNode();
    const src = ac.createBufferSource();
    src.buffer = bgmBufs[ti];
    src.loop = true;
    bgmRate = rate || 1;
    src.playbackRate.value = bgmRate;
    src.connect(bgmGain);
    src.start(0);
    bgmAt = ac.currentTime;
    bgmNode = src;
    bgmIdx = ti;
    src.onended = () => { if (bgmNode === src) { bgmNode = null; } };
    const t0 = ac.currentTime;
    bgmGain.gain.cancelScheduledValues(t0);
    bgmGain.gain.setValueAtTime(BGM_VOL, t0);
  }
  function musicWanted(level, started, g) {
    return !!(musicOn && started && g && !g.over && !g.paused && !g.demo);
  }
  function musicTick(level, want) {
    if (!want || !musicOn) {
      if (bgmFading) { bgmWant = false; bgmWantTi = -1; return; }
      if (bgmWant) { bgmWant = false; bgmWantTi = -1; stopBgmNode(); }
      return;
    }
    ensureAudio();
    if (!ac) return;
    ensureBgmGain();
    silentUnlock();
    if (ac.state === 'suspended' || ac.state === 'interrupted') ac.resume().catch(() => { });
    const ti = themeFor(level || 1);
    const lv = Math.max(1, level || 1), rate = Math.min(1.25, 1 + (lv - 1) * 0.02);
    bgmWant = true;
    bgmWantTi = ti;
    if (ti !== bgmIdx || !bgmNode) {
      // Use bgmWantTi (the latest requested theme), not the closed-over level,
      // so a slow decode of the previous theme cannot start after a level-up.
      loadBgm(ti).then(b => { if (b && musicOn && bgmWant && bgmWantTi === ti) startBgm(ti, rate); });
      return;
    }
    if (Math.abs(bgmRate - rate) > 0.001 && bgmNode) { bgmRate = rate; try { bgmNode.playbackRate.value = rate; } catch (e) { } }
    // Watchdog: restart a dropped source, and restore gain after a duck that never came back.
    if (performance.now() > duckUntil && bgmGain && bgmGain.gain.value < BGM_VOL * 0.85) {
      const t0 = ac.currentTime;
      bgmGain.gain.cancelScheduledValues(t0);
      bgmGain.gain.setValueAtTime(BGM_VOL, t0);
    }
  }

  function musicState() {
    return { idx: bgmIdx, src: bgmIdx >= 0 ? bgmSrc(bgmIdx) : '', playing: !!(bgmNode && musicOn && bgmWant), rate: bgmRate, gain: bgmGain ? bgmGain.gain.value : 0, wanted: bgmWant };
  }
  function stopAudio() {
    duckTok++;
    duckUntil = 0;
    bgmWant = false;
    stopBgmNode();
    bgmIdx = -1;
    if (ac) { try { ac.close(); } catch (e) { } }
    ac = null; sfxGain = null; musicGain = null; bgmGain = null; melodyBus = null; noiseBuf = null;
    luBuf = null; luLoading = null; luGain = null;
    goBuf = null; goLoading = null; goGain = null; goPlaying = false;
    ccBuf = null; ccLoading = null; ccGain = null;
    voBufs = {}; voLoading = {}; voGain = null;
    rotGain = null; resetRotRiff();
    hsBuf = null; hsLoading = null; hsGain = null;
    bgmFading = false;
    bgmBufs = {}; bgmLoading = {};
  }

  const LIVE_KEY = 'ib-tetris-live';
  const LIVE_TTL = 36 * 3600 * 1000;
  function cloneBoard(b) { return (b || []).map(r => (r || []).slice()); }
  function clonePiece(p) {
    if (!p) return null;
    return { t: p.t, x: p.x, y: p.y, m: (p.m || []).map(r => r.slice()) };
  }
  function snapshotGame(g, extra) {
    extra = extra || {};
    if (!g || g.demo) return null;
    return {
      v: 1,
      at: Date.now(),
      started: !!extra.started,
      musicOn: extra.musicOn !== false,
      soundOn: extra.soundOn !== false,
      g: {
        board: cloneBoard(g.board),
        piece: clonePiece(g.piece),
        bag: (g.bag || []).slice(),
        next: g.next,
        hold: g.hold || 0,
        canHold: g.canHold !== false,
        score: g.score || 0,
        lines: g.lines || 0,
        level: g.level || 1,
        over: !!g.over,
        practice: !!g.practice,
        startLevel: g.startLevel || 1,
        acc: g.acc || 0,
        clearCombo: g.clearCombo || 0,
        lastWasTetris: !!g.lastWasTetris,
        familyHigh: g.familyHigh || 0,
        highNoted: !!g.highNoted,
        scored: !!g.scored,
        hits: cloneBoard(ensureHits(g))
      }
    };
  }
  function readLiveFrom(store) {
    if (!store || !store.getItem) return null;
    try {
      const snap = JSON.parse(store.getItem(LIVE_KEY) || 'null');
      if (!snap || snap.v !== 1 || !snap.g || !Array.isArray(snap.g.board) || snap.g.board.length !== 20) return null;
      if (Date.now() - (snap.at || 0) > LIVE_TTL) return null;
      return snap;
    } catch (e) { return null; }
  }
  function readLive(rootObj) {
    const r = rootObj || root;
    return readLiveFrom(r.sessionStorage) || readLiveFrom(r.localStorage);
  }
  function writeLive(snap, rootObj) {
    if (!snap) return;
    const r = rootObj || root;
    const raw = JSON.stringify(snap);
    try { if (r.sessionStorage) r.sessionStorage.setItem(LIVE_KEY, raw); } catch (e) { }
    try { if (r.localStorage) r.localStorage.setItem(LIVE_KEY, raw); } catch (e) { }
  }
  function clearLive(rootObj) {
    const r = rootObj || root;
    try { if (r.sessionStorage) r.sessionStorage.removeItem(LIVE_KEY); } catch (e) { }
    try { if (r.localStorage) r.localStorage.removeItem(LIVE_KEY); } catch (e) { }
  }
  function applyLive(snap) {
    if (!snap || snap.v !== 1 || !snap.g || !Array.isArray(snap.g.board) || snap.g.board.length !== 20) return null;
    if (Date.now() - (snap.at || 0) > LIVE_TTL) return null;
    const s = snap.g;
    const g = newGame(s.practice ? { level: s.startLevel || 1, practice: true } : { level: 1 });
    g.board = cloneBoard(s.board);
    g.piece = clonePiece(s.piece) || g.piece;
    g.bag = (s.bag || []).slice();
    g.next = s.next;
    g.hold = s.hold || 0;
    g.canHold = s.canHold !== false;
    g.score = s.score || 0;
    g.lines = s.lines || 0;
    g.level = s.level || 1;
    g.over = !!s.over;
    g.practice = !!s.practice;
    g.startLevel = s.startLevel || 1;
    g.acc = s.acc || 0;
    g.clearCombo = s.clearCombo || 0;
    g.lastWasTetris = !!s.lastWasTetris;
    g.familyHigh = s.familyHigh || 0;
    g.highNoted = !!s.highNoted;
    g.scored = !!s.scored;
    g.hits = s.hits ? cloneBoard(s.hits) : emptyBoard();
    g.paused = true;
    g.clearFx = null;
    g.pendingLevel = null;
    g.levelUp = null;
    g.callout = null;
    g.highScore = null;
    g.pendingHigh = false;
    g.popup = '';
    g.popupT = 0;
    g.flashT = 0;
    return { g: g, started: !!snap.started, musicOn: snap.musicOn !== false, soundOn: snap.soundOn !== false };
  }


  // 1.9.193 New Zealand line-clear: a soft lightning flash of the painting, 1–2
  // flickers fading over about 0.4s. Not a harsh full-white strobe. Existing line-clear sound is unchanged.
  let nzFlash = null;
  function startNzFlash(opts) {
    opts = opts || {};
    nzFlash = { t: 0, dur: 400, hold: !!opts.hold, at: opts.at != null ? opts.at : 0 };
  }
  function nzFlashAlpha(tSec) {
    const a1 = Math.exp(-Math.pow((tSec - 0.04) / 0.045, 2));
    const a2 = 0.55 * Math.exp(-Math.pow((tSec - 0.16) / 0.05, 2));
    const fade = Math.max(0, 1 - tSec / 0.4);
    return 0.36 * (a1 + a2) * fade;
  }
  function tickNzFlash(dt) {
    if (!nzFlash) return;
    if (nzFlash.hold) return;
    nzFlash.t += dt;
    if (nzFlash.t >= nzFlash.dur) nzFlash = null;
  }
  function drawNzFlash(ctx, w, h) {
    if (!nzFlash || !ctx) return;
    const tSec = (nzFlash.hold ? nzFlash.at : nzFlash.t) / 1000;
    const a = nzFlashAlpha(tSec);
    if (a < 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = a;
    const grd = ctx.createRadialGradient(w * 0.55, h * 0.2, 16, w * 0.5, h * 0.32, Math.max(w, h) * 0.8);
    grd.addColorStop(0, 'rgba(255,252,240,1)');
    grd.addColorStop(0.4, 'rgba(210,230,255,0.9)');
    grd.addColorStop(1, 'rgba(180,210,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  function newNzGulls() {
    const birds = [];
    for (let i = 0; i < 4; i++) {
      birds.push({
        x: 70 + i * 90, y: 60 + (i % 3) * 36, z: 0.55 + i * 0.16,
        ang: (i % 2 ? -0.12 : 0.1), dir: i % 2 ? -1 : 1,
        bank: 0, flap: i * 1.1, turn: 0, ph: i * 1.7
      });
    }
    return { birds: birds, t: 0, squawkIn: 6 + Math.random() * 9, ready: false, w: 0, h: 0 };
  }
  let nzGulls = newNzGulls();
  function nzGullsReset() { nzGulls = newNzGulls(); }
  function stepNzGulls(st, dt, w, h, flags) {
    st = st || nzGulls;
    w = w || st.w || 390; h = h || st.h || 844;
    st.w = w; st.h = h;
    const sec = Math.max(0, dt || 0) / 1000;
    st.t += sec;
    if (!st.ready) {
      for (let i = 0; i < st.birds.length; i++) {
        const b = st.birds[i];
        b.x = (0.08 + (i * 0.22) % 0.84) * w;
        b.y = (0.06 + (i * 0.065) % 0.26) * h;
      }
      st.ready = true;
    }
    if (flags && flags.reduce) return st;
    for (let i = 0; i < st.birds.length; i++) {
      const b = st.birds[i];
      b.flap += sec * (2.0 + b.z * 0.6);
      const speed = (26 + 24 * b.z) * (0.88 + 0.12 * Math.sin(st.t * 0.6 + b.ph));
      if (b.turn > 0) {
        b.turn -= sec;
        b.bank += (b.dir * 0.85 - b.bank) * Math.min(1, sec * 3);
        b.ang += b.dir * sec * 1.35;
        b.x += Math.cos(b.ang) * b.dir * speed * 0.45 * sec;
        b.y += Math.sin(st.t * 0.8 + b.ph) * 8 * sec;
        if (b.turn <= 0) { b.dir *= -1; b.turn = 0; }
      } else {
        b.bank += (0 - b.bank) * Math.min(1, sec * 1.8);
        b.x += Math.cos(b.ang) * (b.dir) * speed * sec;
        b.y += Math.sin(b.ang) * speed * 0.2 * sec + Math.sin(st.t * 0.85 + b.ph) * 7 * sec;
        if (b.x < w * 0.04 || b.x > w * 0.96) { b.turn = 1.15; b.x = Math.max(w * 0.04, Math.min(w * 0.96, b.x)); }
        if (b.y < h * 0.035) b.y = h * 0.035;
        if (b.y > h * 0.36) b.y = h * 0.36;
      }
    }
    return st;
  }
  function drawNzGull(ctx, b) {
    const sc = 0.7 + 0.55 * (b.z || 1);
    const flap = Math.sin(b.flap) * 0.22;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.ang * 0.35);
    ctx.scale((b.dir < 0 ? -sc : sc), sc);
    ctx.rotate(b.bank * 0.45);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = 'rgba(40,60,80,0.4)';
    ctx.beginPath(); ctx.ellipse(2, 11, 13, 3.6, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(186, 200, 210, 0.92)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-8, -10 - flap * 16, -26, -7 - flap * 9);
    ctx.quadraticCurveTo(-10, -2, 2, 2);
    ctx.fill();
    const body = ctx.createLinearGradient(-10, -4, 12, 8);
    body.addColorStop(0, '#f7f4ee');
    body.addColorStop(0.55, '#e6e2da');
    body.addColorStop(1, '#b4c0c8');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(2, 1, 13, 5.4, -0.16, 0, 6.283); ctx.fill();
    const wing = ctx.createLinearGradient(0, 0, 18, -16);
    wing.addColorStop(0, '#fffdf8');
    wing.addColorStop(0.55, '#d3dbe2');
    wing.addColorStop(1, '#97a6b1');
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(8, -16 - flap * 18, 30, -11 - flap * 8);
    ctx.quadraticCurveTo(12, -4, 2, 3);
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.quadraticCurveTo(10, -10, 17, -7);
    ctx.quadraticCurveTo(8, -3, 2, 0);
    ctx.fill();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#f3f0ea';
    ctx.beginPath(); ctx.ellipse(13, -1.2, 4.1, 3.3, 0.2, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#e2a24a';
    ctx.beginPath(); ctx.moveTo(16.7, -1); ctx.lineTo(21.8, 0.2); ctx.lineTo(16.5, 1.05); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a2a28';
    ctx.beginPath(); ctx.arc(14.5, -1.55, 0.65, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#c5ced4';
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-17.5, -2.6); ctx.lineTo(-16.5, 2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawNzGulls(ctx, st) {
    st = st || nzGulls;
    if (!st || !st.birds) return;
    const list = st.birds.slice().sort(function (a, b) { return a.z - b.z; });
    for (let i = 0; i < list.length; i++) drawNzGull(ctx, list[i]);
  }
  function tickNzSquawk(dt) {
    if (!nzGulls) return;
    if (!g || themeFor(g.clearFx ? g.clearFx.level : g.level) !== NZ_THEME) return;
    nzGulls.squawkIn -= dt / 1000;
    if (nzGulls.squawkIn <= 0) {
      playSeagullSfx();
      nzGulls.squawkIn = 6 + Math.random() * 9;
    }
  }

  // 1.9.191 Beach (theme 0, level 3): 2–3 small painterly surfers ride the
  // top of the settled Tetris stack inside the well. They follow the skyline
  // column by column, carve up and over block tops, drop at height changes
  // and at the walls with a soft spray, turn around at the edges, and
  // re-route when lines clear. Empty well: they ride the floor. No gameplay effect.
  // The 1.9.190 sea-wash riders were removed so the well does not get cluttered.
  // 1.9.193: those surfers were removed. A painterly sea-blue wave band
  // with a soft white foam crest now rides the same skyline instead.
  // 1.9.194: that travelling band was reworked into a beach-wash sheet
  // that spreads over the tops and pours off the blocks.
  const STACK_WASH_INSET = 6;
  function stackColY(board, c) {
    if (!board || c < 0 || c >= COLS) return ROWS * CELL;
    for (let r = 0; r < ROWS; r++) if (board[r][c]) return r * CELL;
    return ROWS * CELL;
  }
  function stackSkyline(board) {
    const pts = [];
    for (let c = 0; c < COLS; c++) {
      const y = stackColY(board, c);
      const x0 = c * CELL + (c === 0 ? STACK_WASH_INSET : 0);
      const x1 = (c + 1) * CELL - (c === COLS - 1 ? STACK_WASH_INSET : 0);
      if (!pts.length) pts.push({ x: x0, y: y });
      else if (Math.abs(pts[pts.length - 1].y - y) > 0.5) {
        pts.push({ x: pts[pts.length - 1].x, y: y, drop: y > pts[pts.length - 1].y });
      }
      pts.push({ x: x1, y: y });
    }
    return pts;
  }
  function stackPathLen(pts) {
    let n = 0;
    for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return n;
  }
  function stackPathAt(pts, dist) {
    if (!pts || pts.length < 2) return { x: STACK_WASH_INSET, y: ROWS * CELL, ang: 0, drop: false, rise: false, s: 0, len: 0 };
    const total = stackPathLen(pts);
    if (total <= 0) return { x: pts[0].x, y: pts[0].y, ang: 0, drop: false, rise: false, s: 0, len: 0 };
    const s = Math.max(0, Math.min(total, dist));
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
      const len = Math.hypot(dx, dy) || 1e-6;
      if (acc + len >= s - 1e-6) {
        const u = (s - acc) / len;
        return {
          x: pts[i - 1].x + dx * u,
          y: pts[i - 1].y + dy * u,
          ang: Math.atan2(dy, dx),
          drop: !!(pts[i].drop || dy > 4),
          rise: dy < -4,
          s: s,
          len: total
        };
      }
      acc += len;
    }
    const last = pts[pts.length - 1], prev = pts[pts.length - 2];
    return { x: last.x, y: last.y, ang: Math.atan2(last.y - prev.y, last.x - prev.x), drop: false, rise: false, s: total, len: total };
  }
  function stackNearestS(pts, x, y) {
    let best = { s: 0, d2: Infinity, x: pts[0].x, y: pts[0].y };
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1].x, ay = pts[i - 1].y, bx = pts[i].x, by = pts[i].y;
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy || 1e-6;
      const len = Math.sqrt(len2);
      let u = ((x - ax) * dx + (y - ay) * dy) / len2;
      u = Math.max(0, Math.min(1, u));
      const px = ax + u * dx, py = ay + u * dy;
      const d2 = (px - x) * (px - x) + (py - y) * (py - y);
      if (d2 < best.d2) best = { s: acc + u * len, d2: d2, x: px, y: py };
      acc += len;
    }
    return best;
  }
  function stackSkyKey(board) {
    let k = '';
    for (let c = 0; c < COLS; c++) k += stackColY(board, c) + ',';
    return k;
  }
  // 1.9.194: the travelling wave band is gone. A translucent sheet of sea
  // water with a foamy leading edge washes up over the block tops, spreading
  // out thin like a wave running up sand, spills over the edges and down the
  // sides in small cascading streams and drips with soft foam, pools briefly
  // on lower ledges, then recedes. Slow 8s cycle, like the painted surf.
  // Visual only, under the piece and ghost. Re-forms after line clears;
  // washes the floor when the well is empty.
  const STACK_WASH_PERIOD = 8;
  function washEaseOut(x) { x = Math.max(0, Math.min(1, x)); return 1 - (1 - x) * (1 - x); }
  function washEaseIn(x) { x = Math.max(0, Math.min(1, x)); return x * x; }
  function washCycle(tSec) {
    const T = STACK_WASH_PERIOD;
    const t = ((tSec % T) + T) % T;
    return { t: t, p: t / T, period: T };
  }
  // 0–0.34 wash-up, 0.34–0.50 peak, 0.50–1 recede (slower, like a real wave).
  function washCover(p) {
    if (p < 0.34) return washEaseOut(p / 0.34);
    if (p < 0.50) return 1;
    return washEaseIn(Math.max(0, 1 - (p - 0.50) / 0.50));
  }
  function washSpill(p) {
    if (p < 0.22) return 0;
    if (p < 0.40) return washEaseOut((p - 0.22) / 0.18);
    if (p < 0.56) return 1;
    if (p < 0.80) return Math.max(0, 1 - (p - 0.56) / 0.24);
    return 0;
  }
  function washPool(p) {
    if (p < 0.30) return 0;
    if (p < 0.46) return washEaseOut((p - 0.30) / 0.16);
    if (p < 0.62) return 1;
    if (p < 0.92) return Math.max(0, 1 - (p - 0.62) / 0.30);
    return 0;
  }
  function stackWashInland(board, c) {
    const ys = [];
    for (let i = 0; i < COLS; i++) ys.push(stackColY(board, i));
    const yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
    const span = Math.max(CELL, yMax - yMin);
    const heightInland = (yMax - ys[c]) / span;
    const sideInland = c / Math.max(1, COLS - 1);
    const hW = span > CELL * 0.5 ? 0.7 : 0;
    return hW * heightInland + (1 - hW) * sideInland;
  }
  function newStackWash() {
    const wet = [], pool = [], tops = [];
    for (let c = 0; c < COLS; c++) { wet.push(0); pool.push(0); tops.push(ROWS * CELL); }
    return { ready: false, t: 0, key: '', drips: [], streams: [], wet: wet, pool: pool, tops: tops };
  }
  function stackWashTarget(board, c, cover) {
    const inland = stackWashInland(board, c);
    const soft = 0.24;
    return Math.max(0, Math.min(1, (cover - inland + soft) / soft));
  }
  function stackAddDrip(wash, x, y, dir) {
    wash.drips.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + 1,
      vx: (dir || 0) * (8 + Math.random() * 10) + (Math.random() - 0.5) * 6,
      vy: 20 + Math.random() * 28,
      t: 0,
      life: 0.32 + Math.random() * 0.28,
      sz: 1.1 + Math.random() * 1.5
    });
  }
  function stepStackWashTick(wash, board, dt, flags) {
    flags = flags || {};
    if (!wash || !board) return wash;
    const sec = Math.max(0, dt || 0) / 1000;
    wash.t += sec;
    const key = stackSkyKey(board);
    const keyChanged = key !== wash.key;
    wash.key = key;
    wash.ready = true;
    const p = washCycle(wash.t).p;
    const cover = washCover(p);
    const spill = washSpill(p);
    const poolAmt = washPool(p);
    const reduce = !!flags.reduce;
    const streams = [];
    for (let c = 0; c < COLS; c++) {
      const y = stackColY(board, c);
      wash.tops[c] = y;
      const target = reduce ? (c < 6 ? 0.7 : 0.15) : stackWashTarget(board, c, cover);
      if (keyChanged) wash.wet[c] = target;
      else {
        const k = target > wash.wet[c] ? 7 : 1.8;
        wash.wet[c] += (target - wash.wet[c]) * Math.min(1, sec * k);
      }
      const leftY = c > 0 ? stackColY(board, c - 1) : y;
      const rightY = c < COLS - 1 ? stackColY(board, c + 1) : y;
      const catchL = Math.max(0, leftY < y ? 0 : (c > 0 ? leftY - y : 0));
      const catchR = Math.max(0, rightY < y ? 0 : (c < COLS - 1 ? rightY - y : 0));
      const catchment = Math.min(1, (catchL + catchR) / (CELL * 3));
      const pTarget = (catchment > 0.08 ? catchment : 0) * poolAmt * Math.max(wash.wet[c], spill * 0.5);
      if (keyChanged) wash.pool[c] = pTarget;
      else {
        const pk = pTarget > wash.pool[c] ? 5 : 1.2;
        wash.pool[c] += (pTarget - wash.pool[c]) * Math.min(1, sec * pk);
      }
      if (spill > 0.04 && wash.wet[c] > 0.2 && !reduce) {
        if (c > 0 && y < leftY - 6) {
          streams.push({ c: c, side: -1, x: c * CELL, y0: y, y1: leftY, flow: spill * wash.wet[c] });
        }
        if (c < COLS - 1 && y < rightY - 6) {
          streams.push({ c: c, side: 1, x: (c + 1) * CELL, y0: y, y1: rightY, flow: spill * wash.wet[c] });
        }
      }
    }
    wash.streams = streams;
    if (!reduce && spill > 0.2 && streams.length) {
      for (let i = 0; i < streams.length; i++) {
        const s = streams[i];
        if (Math.random() < Math.min(0.85, sec * 8 * s.flow)) stackAddDrip(wash, s.x, s.y0 + 2, s.side);
      }
    }
    if (wash.drips.length) {
      for (let i = 0; i < wash.drips.length; i++) {
        const d = wash.drips[i];
        d.t += sec;
        d.x += d.vx * sec;
        d.y += d.vy * sec;
        d.vy += 220 * sec;
      }
      wash.drips = wash.drips.filter(function (d) { return d.t < d.life; });
    }
    return wash;
  }
  function stepStackWash(wash, board, dt, flags) {
    const ms = Math.max(0, dt || 0);
    if (ms > 50) {
      const step = 32;
      for (let acc = 0; acc < ms; acc += step) stepStackWashTick(wash, board, Math.min(step, ms - acc), flags);
      return wash;
    }
    return stepStackWashTick(wash, board, ms, flags);
  }
  let stackWash = newStackWash();
  function stackWashReset() { stackWash = newStackWash(); }
  function drawStackWash(ctx) {
    if (!g || isEffect((g.clearFx ? themeFor(g.clearFx.level) : themeFor(g.level))) !== 'beach') return;
    if (!stackWash.ready && g.board) stepStackWash(stackWash, g.board, 0);
    if (!stackWash.ready) return;
    const board = g.board;
    const p = washCycle(stackWash.t).p;
    const cover = washCover(p);
    const bob = Math.sin(stackWash.t * 1.35) * 1.05;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, COLS * CELL, ROWS * CELL);
    ctx.clip();
    // Residual wet sheen, then the spreading sheet on each top.
    for (let c = 0; c < COLS; c++) {
      const y = stackColY(board, c);
      const sheen = Math.max(stackWash.wet[c] * 0.35, stackWash.wet[c] > 0.02 ? 0.08 : 0);
      if (sheen > 0.02) {
        ctx.globalAlpha = 0.18 * sheen;
        ctx.fillStyle = 'rgba(30, 70, 90, 0.7)';
        ctx.fillRect(c * CELL, y, CELL, Math.min(7, ROWS * CELL - y));
      }
      const wet = stackWash.wet[c];
      if (wet < 0.03) continue;
      const inland = stackWashInland(board, c);
      const thin = Math.max(0.18, Math.min(1, (cover - inland + 0.1) / 0.45));
      const h = (6 + 13 * wet * thin);
      const x0 = c * CELL + (c === 0 ? STACK_WASH_INSET : -1);
      const x1 = (c + 1) * CELL - (c === COLS - 1 ? STACK_WASH_INSET : -1);
      const y0 = y + bob * (0.35 + 0.65 * wet);
      const grd = ctx.createLinearGradient(x0, y0, x0, y0 + h);
      grd.addColorStop(0, 'rgba(160, 220, 235, ' + (0.58 * wet) + ')');
      grd.addColorStop(0.35, 'rgba(60, 165, 205, ' + (0.62 * wet) + ')');
      grd.addColorStop(1, 'rgba(20, 90, 140, ' + (0.36 * wet) + ')');
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + 1.2);
      ctx.lineTo(x1, y0 + 1.2);
      ctx.lineTo(x1, y0 + h);
      ctx.lineTo(x0, y0 + h);
      ctx.closePath();
      ctx.fill();
      // Foam film on the surface, thinner toward the front.
      ctx.globalAlpha = 0.55 * wet * thin;
      ctx.strokeStyle = 'rgba(230, 245, 250, 0.85)';
      ctx.lineWidth = 1.6 + 1.1 * thin;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y0);
      ctx.stroke();
    }
    // Foamy leading edge — scallops where the wash is just arriving.
    for (let c = 0; c < COLS; c++) {
      const wet = stackWash.wet[c];
      if (wet < 0.12 || wet > 0.88) continue;
      const y = stackColY(board, c) + bob * 0.5;
      const x0 = c * CELL, mid = x0 + CELL * 0.5;
      const a = 0.75 * (1 - Math.abs(wet - 0.5) * 1.6);
      if (a < 0.08) continue;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.ellipse(mid, y - 1.2, 9 + 4 * wet, 3.2, 0, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = Math.max(0, a * 0.7);
      ctx.beginPath();
      ctx.ellipse(mid - 7, y + 0.6, 4.5, 2.1, -0.2, 0, 6.283);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(mid + 7, y + 0.4, 4.2, 1.9, 0.2, 0, 6.283);
      ctx.fill();
    }
    // Pools on lower ledges.
    for (let c = 0; c < COLS; c++) {
      const amt = stackWash.pool[c];
      if (amt < 0.06) continue;
      const y = stackColY(board, c) + bob * 0.3;
      const cx = c * CELL + CELL * 0.5;
      const w = 8 + 9 * amt, h = 3 + 5 * amt;
      ctx.globalAlpha = 0.55 * amt;
      const pg = ctx.createRadialGradient(cx, y + 2, 1, cx, y + 3, w);
      pg.addColorStop(0, 'rgba(80, 175, 210, 0.7)');
      pg.addColorStop(0.65, 'rgba(30, 110, 160, 0.5)');
      pg.addColorStop(1, 'rgba(30, 110, 160, 0)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(cx, y + 3, w, h, 0, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 0.7 * amt;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, y + 1, w * 0.85, h * 0.45, 0, 0, Math.PI);
      ctx.stroke();
    }
    // Cascading streams down drop faces, with foam at the lip and the landing.
    const streams = stackWash.streams || [];
    for (let i = 0; i < streams.length; i++) {
      const s = streams[i];
      const flow = s.flow;
      const x = s.x + s.side * 1.2;
      const len = Math.max(8, (s.y1 - s.y0) * (0.55 + 0.45 * flow));
      const y1 = s.y0 + len;
      const wob = Math.sin(stackWash.t * 6 + s.c * 1.3) * 1.6 * s.side;
      ctx.globalAlpha = 0.42 * flow;
      ctx.strokeStyle = 'rgba(70, 170, 205, 0.9)';
      ctx.lineWidth = 3.2 + 2.2 * flow;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, s.y0 + 1);
      ctx.quadraticCurveTo(x + wob, s.y0 + len * 0.45, x + wob * 0.3, y1);
      ctx.stroke();
      ctx.globalAlpha = 0.35 * flow;
      ctx.strokeStyle = 'rgba(200, 230, 240, 0.85)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x - s.side * 1.1, s.y0 + 2);
      ctx.quadraticCurveTo(x + wob * 0.6, s.y0 + len * 0.5, x, y1 - 2);
      ctx.stroke();
      // Foam lip
      ctx.globalAlpha = 0.8 * flow;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.beginPath();
      ctx.ellipse(x, s.y0 + 1, 5.5, 2.4, 0, 0, 6.283);
      ctx.fill();
      // Splash foam where it lands
      ctx.globalAlpha = 0.55 * flow;
      ctx.beginPath();
      ctx.ellipse(x + wob * 0.2, y1 - 1, 6 + 3 * flow, 2.4, 0, 0, 6.283);
      ctx.fill();
    }
    // Drips
    for (let i = 0; i < stackWash.drips.length; i++) {
      const d = stackWash.drips[i];
      const k = Math.max(0, 1 - d.t / d.life);
      ctx.globalAlpha = 0.7 * k;
      ctx.fillStyle = 'rgba(210, 235, 245, 1)';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.sz * 0.7, d.sz * (1.1 + 0.4 * k), 0, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 0.4 * k;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(d.x, d.y - 0.4, d.sz * 0.45, 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  }

  // 1.9.192 Snowy mountains (theme 10, level 9): snowfall ramps from light flurries
  // to a heavy fall by the end of the level, and soft white caps settle on exposed
  // column tops. Visual only, drawn under the active piece and ghost.
  const SNOW_THEME = 10;
  function snowProg(lines, level) {
    const lv = Math.max(1, level || 1);
    const base = (lv - 1) * 10;
    return Math.max(0, Math.min(1, ((lines || 0) - base) / 10));
  }
  function snowFallParams(prog) {
    const p = Math.max(0, Math.min(1, prog || 0));
    const e = p * p * 0.35 + p * 0.65;
    return {
      count: Math.round(10 + 48 * e),
      fxCount: Math.round(18 + 72 * e),
      size0: 1.15 + 1.55 * e,
      size1: 2.2 + 2.5 * e,
      speed0: 26 + 16 * e,
      speed1: 42 + 22 * e,
      wind: 8 + 16 * e,
      settle: 0.09 + 0.15 * e
    };
  }
  function newBoardSnow() {
    const cap = [];
    const tops = [];
    for (let c = 0; c < COLS; c++) { cap.push(0); tops.push(-1); }
    return { ready: false, cap: cap, tops: tops, flakes: [], t: 0 };
  }
  let boardSnow = newBoardSnow();
  function snowReset() { boardSnow = newBoardSnow(); }
  function snowTopRow(board, c) {
    if (!board || c < 0 || c >= COLS) return -1;
    for (let r = 0; r < ROWS; r++) if (board[r][c]) return r;
    return -1;
  }
  function snowSpawnFlake(par, first) {
    const sz = par.size0 + Math.random() * Math.max(0.2, par.size1 - par.size0);
    const sp = par.speed0 + Math.random() * Math.max(4, par.speed1 - par.speed0);
    return {
      x: Math.random() * COLS * CELL,
      y: first ? Math.random() * ROWS * CELL : -6 - Math.random() * 18,
      sp: sp, sz: sz, ph: Math.random() * 6.28, a: 0.72 + Math.random() * 0.22
    };
  }
  function stepBoardSnow(sn, board, dt, prog, flags) {
    sn = sn || boardSnow;
    if (!sn) return sn;
    const reduce = !!(flags && flags.reduce);
    const par = snowFallParams(prog);
    const ms = Math.max(0, dt || 0) / 1000;
    sn.t += ms;
    // Reset a cap when that column's exposed top changes (new brick or a line clear).
    for (let c = 0; c < COLS; c++) {
      const top = snowTopRow(board, c);
      if (top !== sn.tops[c]) {
        sn.cap[c] = 0;
        sn.tops[c] = top;
      }
      if (top >= 0 && !reduce) {
        sn.cap[c] = Math.min(1, sn.cap[c] + par.settle * ms);
      } else if (top >= 0 && reduce) {
        sn.cap[c] = Math.max(sn.cap[c], 0.4);
      } else {
        sn.cap[c] = 0;
      }
    }
    if (reduce) { sn.flakes = []; sn.ready = true; return sn; }
    const want = par.count;
    while (sn.flakes.length < want) sn.flakes.push(snowSpawnFlake(par, !sn.ready));
    if (sn.flakes.length > want) sn.flakes.length = want;
    const drift = par.wind;
    for (let i = 0; i < sn.flakes.length; i++) {
      const f = sn.flakes[i];
      f.y += f.sp * ms;
      f.x += Math.sin(sn.t * 0.7 + f.ph) * drift * ms;
      if (f.x < -8) f.x += COLS * CELL + 16;
      if (f.x > COLS * CELL + 8) f.x -= COLS * CELL + 16;
      const c = Math.max(0, Math.min(COLS - 1, Math.floor(f.x / CELL)));
      const topY = stackColY(board, c);
      if (f.y >= topY - 1) {
        if (sn.tops[c] >= 0) sn.cap[c] = Math.min(1, sn.cap[c] + 0.08 + 0.06 * (f.sz / 4));
        sn.flakes[i] = snowSpawnFlake(par, false);
      }
    }
    sn.ready = true;
    return sn;
  }
  function snowOnLineClear(g, sn) {
    sn = sn || boardSnow;
    if (!sn) return;
    for (let c = 0; c < COLS; c++) {
      sn.cap[c] = 0;
      sn.tops[c] = g && g.board ? snowTopRow(g.board, c) : -1;
    }
  }
  function drawSnowCaps(ctx) {
    if (!g || themeFor(g.clearFx ? g.clearFx.level : g.level) !== SNOW_THEME) return;
    if (!boardSnow.ready && g.board) stepBoardSnow(boardSnow, g.board, 0, snowProg(g.lines, g.level));
    const board = g.clearFx && g.clearFx.snap ? g.clearFx.snap : g.board;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, COLS * CELL, ROWS * CELL);
    ctx.clip();
    for (let c = 0; c < COLS; c++) {
      const amt = boardSnow.cap[c] || 0;
      const top = snowTopRow(board, c);
      if (top < 0 || amt <= 0.02) continue;
      const x = c * CELL;
      const y = top * CELL;
      const h = 3.2 + 6.2 * amt;
      const inset = 1.4;
      const w = CELL - inset * 2;
      ctx.globalAlpha = 0.72 + 0.22 * amt;
      const grd = ctx.createLinearGradient(x, y, x, y + h);
      grd.addColorStop(0, 'rgba(255,255,255,0.98)');
      grd.addColorStop(0.55, 'rgba(236,248,255,0.92)');
      grd.addColorStop(1, 'rgba(210,230,245,0.15)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(x + inset, y + 1.2);
      ctx.quadraticCurveTo(x + CELL * 0.22, y - h * 0.55, x + CELL * 0.5, y - h * 0.72);
      ctx.quadraticCurveTo(x + CELL * 0.78, y - h * 0.55, x + CELL - inset, y + 1.2);
      ctx.quadraticCurveTo(x + CELL * 0.5, y + 2.4, x + inset, y + 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.55 * amt;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.ellipse(x + CELL * 0.38, y - h * 0.28, w * 0.18, h * 0.18, -0.3, 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawBoardSnow(ctx) {
    if (!g || themeFor(g.clearFx ? g.clearFx.level : g.level) !== SNOW_THEME) return;
    if (!boardSnow.ready) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, COLS * CELL, ROWS * CELL);
    ctx.clip();
    for (let i = 0; i < boardSnow.flakes.length; i++) {
      const f = boardSnow.flakes[i];
      ctx.globalAlpha = f.a;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.sz, 0, 6.283); ctx.fill();
      if (f.sz > 2.4) {
        ctx.globalAlpha = f.a * 0.55;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(f.x - f.sz, f.y); ctx.lineTo(f.x + f.sz, f.y);
        ctx.moveTo(f.x, f.y - f.sz); ctx.lineTo(f.x, f.y + f.sz);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function syncSnowFx(prog) {
    if (!fx || !fx.list) return;
    fx.snowProg = prog;
    const par = snowFallParams(prog);
    const proto = (CRITTERS[SNOW_THEME] || []).find(function (k) { return k.m === 'snow'; });
    if (!proto) return;
    let n = 0;
    for (let i = 0; i < fx.list.length; i++) if (fx.list[i].k && fx.list[i].k.m === 'snow') n++;
    while (n < par.fxCount) {
      const c = fxSpawn(proto, false);
      c.sz = par.size0 + Math.random() * (par.size1 - par.size0);
      c.sp = par.speed0 + Math.random() * (par.speed1 - par.speed0);
      fx.list.push(c);
      n++;
    }
    if (n > par.fxCount) {
      for (let i = fx.list.length - 1; i >= 0 && n > par.fxCount; i--) {
        if (fx.list[i].k && fx.list[i].k.m === 'snow') { fx.list.splice(i, 1); n--; }
      }
    }
  }

  // 1.9.194 full-screen flash: 70ms at peak, then a 150ms fade. Only the occasional
  // biggest burst (scale >= 2) once the show has grown to about 150%, and at most
  // one every 8–12s. Small and medium bursts get no flash.
  const FW_SKY_FLASH_PEAK = 0.07;
  const FW_SKY_FLASH_FADE = 0.15;
  const FW_MAJOR_SCALE = 2;
  const FW_BIGGER_GROW = 1.5;
  function fwSkyFlashAlpha(tSec) {
    if (tSec == null || tSec < 0) return 0;
    if (tSec <= FW_SKY_FLASH_PEAK) return 1;
    if (tSec <= FW_SKY_FLASH_PEAK + FW_SKY_FLASH_FADE) return Math.max(0, 1 - (tSec - FW_SKY_FLASH_PEAK) / FW_SKY_FLASH_FADE);
    return 0;
  }
  function startFwSkyFlash(opts) {
    opts = opts || {};
    fw.skyFlash = { t: 0, peak: FW_SKY_FLASH_PEAK, fade: FW_SKY_FLASH_FADE, hold: !!opts.hold, at: opts.at != null ? opts.at : 0 };
  }
  function tickFwSkyFlash(dtSec) {
    if (!fw.skyFlash) return;
    if (fw.skyFlash.hold) return;
    fw.skyFlash.t += dtSec;
    if (fw.skyFlash.t >= FW_SKY_FLASH_PEAK + FW_SKY_FLASH_FADE) fw.skyFlash = null;
  }
  function maybeFwSkyFlash(scale) {
    if (fw.hold) return false;
    if (fwSize(fw.prog) < FW_BIGGER_GROW) return false;
    if (!(scale >= FW_MAJOR_SCALE)) return false;
    const now = fw.clock || 0;
    if (fw.skyFlashNext != null && now < fw.skyFlashNext) return false;
    startFwSkyFlash();
    fw.skyFlashNext = now + 8 + Math.random() * 4;
    return true;
  }
  function drawFwSkyFlash(c, w, h) {
    if (!fw.skyFlash || !c) return;
    const tm = fw.skyFlash.hold ? (fw.skyFlash.at || 0) : fw.skyFlash.t;
    const a = fwSkyFlashAlpha(tm);
    if (a < 0.01) return;
    c.save();
    c.globalAlpha = a;
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.restore();
  }
  root.Tetris = { THEMES, LOOKS, PICS, ORDER, themeFor, stages, shouldSubmit, SHAPES, COLORS, TRI_THEME, TRI_PAL, triangleLate, trianglePalette, blockColor, SPACE_THEME, BOMB_EVERY, BOMB_MAX, BOMB_HITS, bombWaitRange, bombWait, pieceCovers, applyBombHit, ensureHits, cellHits, dropRows, makeBombParts, emptyBoard, findFullRows, applyClear, CITY_THEME, CITY_BUILD_EVERY, CITY_BUILD_EVERY_LOW, CITY_SAFE_TOP, CITY_CREW_N, CITY_ANIM_CLIMB, CITY_ANIM_PLACE, CITY_ANIM_DOWN, CITY_ANIM_FAST, cityHighestSettled, cityStackLow, cityBuildEvery, cityBuildWait, cityAnimDur, pieceDropCovers, cityStackTop, cityCanPlace, cityPickCol, placeBuiltCell, newCityCrew, resetCityCrew, seedCityCrew, stepCityCrew, rotateCW, rotateCCW, collides, newGame, lockPiece, act, dropInterval, spawn, snapshotGame, applyLive, readLive, writeLive, clearLive, LIVE_KEY, LIVE_TTL, stopAudio, audio: () => ac && ac.state, TRACKS, quantizeDelay, sfxFreqs, BGM_VOL, BGM_DUCK, SFX_MASTER, SFX_NOTE, BGM_HASH, bgmSrc, LEVELUP_HASH, levelUpSrc, loadLevelUp, GAMEOVER_HASH, gameOverSrc, LINECLEAR_HASH, lineClearSrc, CALLOUT_VOICES, CALLOUT_TEXT, calloutSrc, pickCallout, maybeCallout, playGameOverSfx, playLineClearSfx, playRotateSfx, rotateRun, ROT_KIND, HIGHSCORE_HASH, highScoreSrc, HIGH_SCORE_MS, HIGH_SCORE_FADE_MS, highScoreProg, maybeHighScore, startHighScore, tickHighScore, familyHighFrom, boardOccupied, musicWanted, musicState, newInvaders, resetInvaders, seedInvaders, stepInvaders, dropBomb, INV_COUNT, INV_GAP, INV_W, BOMB_VY, clearDuration, clearKind, clearPartCount, startClear, tickClear, startLevelUp, tickLevelUp, levelUpDuration, levelUpCopy, burstParts, playLevelUpSfx, levelUpNotes, LU_LO, LU_HI, isEffect, effectProg, musicBeat, EFFECT_TI, reduceMotion, lifeReset, lifeFastForward, lifeReact, photoToScreen, farmArt: () => FARM_ART, farmRig: () => FARM_RIG, FARM_SUN, FARM_HZ, farmDayTarget, farmSunPos, ROOSTER_HASH, roosterSrc, stackColY, stackSkyline, stackPathAt, stackPathLen, newStackWash, stepStackWash, STACK_WASH_PERIOD, washCover, washSpill, washPool, stackWashInland, washCycle, farmReady: () => farm.ready, farmLoad, lifeDay: () => life.day, frogArt: () => FROG_ART, frogMeta: () => FROG_META, frogLittle: () => FROG_LITTLE, frogLittlePads: () => FROG_LITTLE_PADS, frogReady: () => frog.ready, frogLoad, beachArt: () => BEACH_ART, beachMeta: () => BEACH_META, beachReady: () => beach.ready, beachLoad, fwArt: () => FW_ART, fwMeta: () => FW_META, fwReady: () => fw.ready, fwLoad, fwPose, fwSize, fwSkyFlashAlpha, startFwSkyFlash, maybeFwSkyFlash, FW_SKY_FLASH_PEAK, FW_SKY_FLASH_FADE, FW_MAJOR_SCALE, FW_BIGGER_GROW, fwSkyFlashState: () => fw.skyFlash, fwProg: (p) => { if (p != null) fw.prog = p; return fw.prog; }, fwReset, oceanArt: () => OCEAN_ART, oceanMeta: () => OCEAN_META, oceanReady: () => ocean.ready, oceanLoad, holdBlockSpark, SPARK_DUR, SPARK_MAX, makeLightning, drawLightningBolts, SNOW_THEME, snowProg, snowFallParams, newBoardSnow, stepBoardSnow, snowOnLineClear, snowReset, boardSnow: () => boardSnow, NZ_THEME, nzProg, nzBeatsPerRow, nzDropInterval, SEAGULL_HASH, seagullSrc, startNzFlash, nzFlashAlpha, newNzGulls, stepNzGulls, nzGulls: () => nzGulls, nzFlashState: () => nzFlash };

  if (!root.document) return;
  const doc = root.document;
  let g = newGame();
  const SHANE_BEST_CLEAR = 'ib-tetris-best-cleared-20261113';
  function clearShaneLocalBestOnce() {
    try {
      if (!root.IBScores || !root.IBScores.isShane) return;
      const me = root.IBScores.who && root.IBScores.who();
      if (!me || !root.IBScores.isShane(me) || !me.admin) return;
      if (root.localStorage.getItem(SHANE_BEST_CLEAR)) return;
      root.localStorage.removeItem('tetris-best');
      root.localStorage.setItem(SHANE_BEST_CLEAR, '1');
    } catch (e) { }
  }
  clearShaneLocalBestOnce();
  let best = 0;
  let started = false;
  let raf = 0;
  try { const v = root.localStorage && root.localStorage.getItem('tetris-best'); if (v) best = parseInt(v, 10) || 0; } catch (e) { }
  const board = doc.getElementById('board');
  const nextCv = doc.getElementById('next');
  const holdCv = doc.getElementById('hold');
  function syncHud() {
    const set = (id, val) => { const el = doc.getElementById(id); if (el) el.textContent = val; };
    set('score', g.score);
    set('lines', g.lines);
    set('level', g.level);
    set('best', g.practice ? best : Math.max(best, g.score));
    const pb = doc.getElementById('pausebtn'); if (pb) pb.textContent = g.paused ? 'Resume' : 'Pause';
    const rb = doc.getElementById('restartbtn'); if (rb) rb.textContent = g.over ? 'Play again' : 'Restart';
    const pl = doc.getElementById('practicelabel'); if (pl) pl.hidden = !g.practice;
    if (g.over) {
      if (!g.practice) {
        best = Math.max(best, g.score);
        try { root.localStorage.setItem('tetris-best', String(best)); } catch (e) { }
      }
      if (!g.scored) { g.scored = true; gameOverScores(g); }
    }
  }
  // 1.9.149 family scoreboard (scores.js): send the finished game once, then show the board over the game
  const SB = { acc: '#facc15', btn: '#3f3a12' };
  function gameOverScores(gm) {
    const S = root.IBScores; if (!S || !started || !shouldSubmit(gm)) return;
    const sent = S.submit('tetris', { score: gm.score, lines: gm.lines, level: gm.level }, { note: gm.lines + ' lines' });
    setTimeout(() => { if (g === gm && gm.over) S.open('tetris', { ...SB, over: true, score: gm.score, detail: gm.lines + ' line' + (gm.lines === 1 ? '' : 's') + ' · level ' + gm.level, sent, onAgain: () => press('restart') }); }, 1200);
  }
  function openScores() {
    const S = root.IBScores; if (!S) return;
    if (started && !g.over && !g.paused) press('pause');
    S.open('tetris', SB);
  }
  function press(a) {
    if (!started) started = true;
    const next = act(g, a);
    if (a === 'restart') { g = next; invReset(); cityReset(); stackWashReset(); snowReset(); life.hold = null; life.singHold = null; life.beachHold = null; fw.hold = null; ocean.hold = null; sparkHold = null; blockSparks = []; lifeReset(); if (isEffect(themeFor(g.level))) { lifeCast(isEffect(themeFor(g.level))); } if (root.IBScores) root.IBScores.close(); }
    syncHud();
    try { persistLive(); } catch (e) { }
  }
  root.Tetris.press = press;
  root.Tetris.live = () => g;
  root.Tetris.view = () => ({ x: g.piece.x, y: g.piece.y, t: g.piece.t, score: g.score, lines: g.lines, level: g.level, practice: !!g.practice, startLevel: g.startLevel || 1, paused: g.paused, over: g.over, started, musicOn, soundOn });
  // Seed a still board (used for screenshots and checks). No overlay, no gravity, music off.
  root.Tetris.show = function (opts) {
    opts = opts || {};
    started = true; musicOn = false; soundOn = false;
    g = newGame();
    g.lines = opts.lines || 0;
    g.level = Math.floor(g.lines / 10) + 1;
    g.score = opts.score || 0;
    g.paused = false; g.over = false; g.demo = true; g.acc = 0; g.popupT = 0; g.flashT = 0; g.levelUp = null; g.callout = null; g.highScore = null; g.pendingHigh = false; goPlaying = false; resetRotRiff();
    if (opts.board) g.board = opts.board;
    if (opts.hits) g.hits = opts.hits;
    else if (opts.board) g.hits = emptyBoard();
    if (opts.piece) g.piece = opts.piece;
    if (opts.next != null) g.next = opts.next;
    if (opts.hold != null) { g.hold = opts.hold; g.canHold = true; }
    themeIdx = themeFor(g.level);
    lookIdx = -1;
    applyLook(themeIdx);
    if (isEffect(themeIdx)) {
      life.hold = opts.lifeTime != null ? opts.lifeTime : 0;
      lifeFastForward(life.hold, effectProg(g.lines));
      if (opts.frogHop && life.frog) {
        const h = opts.frogHop;
        life.frog.from = h.from != null ? h.from : 0;
        life.frog.to = h.to != null ? h.to : 2;
        life.frog.pad = life.frog.from;
        life.frog.hop = (h.p != null ? h.p : 0.45) * life.frog.hopDur;
        const a = FROG_PADS[life.frog.from], b = FROG_PADS[life.frog.to];
        const q = h.p != null ? h.p : 0.45;
        life.frog.nx = a.x + (b.x - a.x) * q;
        life.frog.ny = a.y + (b.y - a.y) * q - 4 * 0.11 * q * (1 - q);
        life.frog.dir = (b.x - a.x) >= 0 ? 1 : -1;
      }
    } else { life.hold = null; }
    if (opts.clear) {
      const rows = (opts.clear.rows || []).slice();
      const snap = g.board.map(r => r.slice());
      const snapHits = ensureHits(g).map(r => r.slice());
      startClear(g, rows, snap, g.lines, g.level, snapHits);
      g.clearFx.hold = true;
      g.clearFx.at = opts.clear.at != null ? opts.clear.at : 0.45;
      if (g.clearFx.n === 4) {
        const pts = LINE_POINTS[4] * g.level;
        g.popup = 'TETRIS! +' + pts;
        g.popupT = 1100;
      }
      g.board = dropRows(g.board, rows, 0);
      g.hits = dropRows(g.hits, rows, 0);
    }
    if (opts.levelUp) {
      const from = opts.levelUp.from != null ? opts.levelUp.from : Math.max(1, g.level - 1);
      const to = opts.levelUp.to != null ? opts.levelUp.to : g.level;
      startLevelUp(g, from, to);
      g.levelUp.hold = true;
      g.levelUp.at = opts.levelUp.at != null ? opts.levelUp.at : 0.32;
    }
    if (opts.beach) {
      life.beachHold = opts.beach;
      if (!life.beach) life.beach = { tide: 0.5, wet: 0.2, big: 0, mid: 0, fl: 0, gust: 0 };
    } else life.beachHold = null;
    if (opts.littleFrog) {
      life.littleHold = true;
      if (!life.little) littleFrogCast();
      const list = Array.isArray(opts.littleFrog) ? opts.littleFrog : [opts.littleFrog];
      list.forEach(function (h, i) {
        const d = life.little[h.i != null ? h.i : i];
        if (!d) return;
        d.from = h.from != null ? h.from : d.from;
        d.to = h.to != null ? h.to : d.to;
        d.pad = h.to != null && (h.p == null || h.p >= 1) ? h.to : (h.from != null ? h.from : d.pad);
        if (h.p == null || h.p < 0) { d.hop = -1; littleFrogPose(d, -1); }
        else { d.hop = (h.p) * (d.hopDur || 0.48); littleFrogPose(d, h.p); }
        if (h.dir) d.dir = h.dir;
      });
    }
    else life.littleHold = null;
    if (opts.frogSing) {
      life.singHold = opts.frogSing;
      if (life.frog) {
        life.frog.mouth = opts.frogSing.mouth != null ? opts.frogSing.mouth : 0;
        life.frog.puff = opts.frogSing.puff != null ? opts.frogSing.puff : 0;
        life.frog.blink = opts.frogSing.blink != null ? opts.frogSing.blink : 0;
      }
    } else life.singHold = null;
    if (opts.fireworks) { fw.hold = opts.fireworks; fw.posed = false; if (opts.fireworks.prog != null) fw.prog = opts.fireworks.prog; if (opts.fireworks.size != null) { const s0 = (opts.fireworks.size - 0.20) / 2.55; fw.prog = Math.max(0, Math.min(1, s0)); } if (opts.fireworks.skyFlash) startFwSkyFlash({ hold: true, at: opts.fireworks.skyFlash.at != null ? opts.fireworks.skyFlash.at : 0.03 }); } else { fw.hold = null; fw.posed = false; fw.skyFlash = null; }
    if (opts.ocean) { ocean.hold = opts.ocean; ocean.posed = false; } else { ocean.hold = null; ocean.posed = false; }
    if (opts.sparkle) holdBlockSpark(opts.sparkle); else { sparkHold = null; }
    if (opts.callout) {
      const text = opts.callout.text || 'Amazing!';
      const dur = opts.callout.dur != null ? opts.callout.dur : CALLOUT_DUR;
      g.callout = { text: text, t: dur, dur: dur, hold: true, at: opts.callout.at != null ? opts.callout.at : 0.35, id: opts.callout.id || 'amazing' };
    }
    if (opts.highScore) {
      startHighScore(g);
      if (g.highScore) {
        g.highScore.hold = true;
        g.highScore.at = opts.highScore.at != null ? opts.highScore.at : 0.32;
        if (opts.highScore.sub != null) g.highScore.sub = String(opts.highScore.sub);
      }
    }
    if (opts.popup) { g.popup = opts.popup; g.popupT = opts.popupT != null ? opts.popupT : 1100; }
    syncHud();
    const mb = doc.getElementById('musicbtn'); if (mb) mb.textContent = 'Music off';
    const sb = doc.getElementById('soundbtn'); if (sb) sb.textContent = 'Sound off';
    invSeed(opts);
    citySeed(opts);
    snowReset();
    stackWashReset();
    if (isEffect(themeFor(g.level)) === 'beach' && g.board) {
      stepStackWash(stackWash, g.board, opts.washTime != null ? opts.washTime : (opts.waveTime != null ? opts.waveTime : 0), { reduce: reduceMotion() });
    }
    if (opts.nzFlash) startNzFlash({ hold: true, at: opts.nzFlash.at != null ? opts.nzFlash.at : 80 });
    else if (themeFor(g.level) !== NZ_THEME) nzFlash = null;
    if (themeFor(g.level) === NZ_THEME) {
      nzGullsReset();
      stepNzGulls(nzGulls, opts.nzGullTime != null ? opts.nzGullTime : 1800, (root.innerWidth || 390), (root.innerHeight || 844), { reduce: false });
    } else nzGullsReset();
    if (themeFor(g.level) === SNOW_THEME && g.board) {
      stepBoardSnow(boardSnow, g.board, opts.snowTime != null ? opts.snowTime : 0, snowProg(g.lines, g.level), { reduce: reduceMotion() });
    }
  };
  doc.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-act]');
    if (b) press(b.dataset.act);
  });
  doc.getElementById('musicbtn').addEventListener('click', () => {
    musicOn = !musicOn; ensureAudio();
    doc.getElementById('musicbtn').textContent = musicOn ? 'Music on' : 'Music off';
  });
  { const sb = doc.getElementById('scoresbtn'); if (sb) sb.addEventListener('click', openScores); }
  if (/^#scores/.test(root.location && root.location.hash || '')) setTimeout(openScores, 0);
  // 1.9.152 Shane-only level picker: start any stage in practice (not posted to the family scoreboard).
  function meShane() { return !!(root.IBScores && root.IBScores.isShane()); }
  function fillLevelList() {
    const list = doc.getElementById('levellist'); if (!list) return;
    list.innerHTML = stages().map(s => '<button type="button" data-level="' + s.level + '">' + s.level + '. ' + s.name + '</button>').join('');
  }
  function closePicker() { const el = doc.getElementById('levelpick'); if (el) el.hidden = true; }
  function openPicker() {
    if (!meShane()) return;
    const el = doc.getElementById('levelpick'); if (!el) return;
    if (started && !g.over && !g.paused) press('pause');
    fillLevelList();
    el.hidden = false;
  }
  function startPractice(level) {
    closePicker();
    if (root.IBScores) root.IBScores.close();
    started = true;
    noteIdx = 0;
    g = newGame({ level: Math.max(1, level || 1), practice: true });
    themeIdx = themeFor(g.level);
    lookIdx = -1;
    applyLook(themeIdx);
    invReset();
    cityReset();
    stackWashReset();
    snowReset();
    syncHud();
  }
  function showShanePicker(force) {
    const btn = doc.getElementById('levelbtn');
    if (btn) btn.hidden = !(force || meShane());
  }
  showShanePicker();
  { const lb = doc.getElementById('levelbtn'); if (lb) lb.addEventListener('click', openPicker); }
  { const pick = doc.getElementById('levelpick');
    if (pick) pick.addEventListener('click', e => {
      if (e.target === pick || (e.target.id === 'levelpickclose')) { closePicker(); return; }
      const b = e.target.closest && e.target.closest('[data-level]');
      if (b) startPractice(+b.dataset.level);
    });
  }
  root.Tetris.startPractice = startPractice;
  root.Tetris.showPicker = function () { showShanePicker(true); fillLevelList(); const el = doc.getElementById('levelpick'); if (el) el.hidden = false; };
  root.Tetris.closePicker = closePicker;
  doc.getElementById('soundbtn').addEventListener('click', () => {
    soundOn = !soundOn; ensureAudio();
    doc.getElementById('soundbtn').textContent = soundOn ? 'Sound on' : 'Sound off';
  });
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rotate', x: 'rotate', X: 'rotate', z: 'rotateBack', Z: 'rotateBack', ' ': 'drop', c: 'hold', C: 'hold', Shift: 'hold', p: 'pause', P: 'pause', Escape: 'pause', r: 'restart', R: 'restart' };
  root.addEventListener('keydown', e => {
    if (e.key === 'm' || e.key === 'M') { musicOn = !musicOn; ensureAudio(); const b = doc.getElementById('musicbtn'); if (b) b.textContent = musicOn ? 'Music on' : 'Music off'; return; }
    const pick = doc.getElementById('levelpick');
    if (pick && !pick.hidden) { if (e.key === 'Escape') closePicker(); return; }
    if (root.IBScores && root.IBScores.isOpen()) { if (e.key === 'Escape') root.IBScores.close(); return; }
    const a = map[e.key];
    if (!a) return;
    e.preventDefault();
    press(a);
  });
  const touch = { cur: null };
  const cellPx = () => board ? board.getBoundingClientRect().width / COLS : CELL;
  board.addEventListener('pointerdown', e => {
    e.preventDefault();
    ensureAudio();
    try { board.setPointerCapture(e.pointerId); } catch (err) { }
    touch.cur = { id: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), moved: false, dropped: false };
  });
  board.addEventListener('pointermove', e => {
    const s = touch.cur;
    if (!s || s.id !== e.pointerId || s.dropped) return;
    e.preventDefault();
    const step = cellPx();
    const dx = e.clientX - s.lx, dy = e.clientY - s.ly;
    if (Math.abs(e.clientX - s.sx) > 8 || Math.abs(e.clientY - s.sy) > 8) s.moved = true;
    if (Math.abs(dx) >= step) {
      const n = Math.trunc(dx / step);
      for (let i = 0; i < Math.abs(n); i++) press(n > 0 ? 'right' : 'left');
      s.lx += n * step;
    }
    if (dy >= step) {
      const n = Math.trunc(dy / step);
      const el = performance.now() - s.t;
      const totalDy = e.clientY - s.sy;
      if (el < 220 && totalDy > step * 2.5) { press('drop'); s.dropped = true; return; }
      for (let i = 0; i < n; i++) press('down');
      s.ly += n * step;
    }
  });
  board.addEventListener('pointerup', e => {
    const s = touch.cur;
    touch.cur = null;
    if (!s || s.id !== e.pointerId || s.dropped) return;
    const dy = e.clientY - s.sy;
    const el = performance.now() - s.t;
    if (!s.moved) {
      if (!started) { press('down'); return; }
      if (g.over) { press('restart'); return; }
      if (g.paused) { press('pause'); return; }
      press('rotate');
      return;
    }
    if (dy < -cellPx() * 2 && Math.abs(dy) > Math.abs(e.clientX - s.sx)) { press('hold'); return; }
    if (el < 300 && dy > cellPx() * 2.5 && dy > Math.abs(e.clientX - s.sx)) press('drop');
  });
  board.addEventListener('pointercancel', () => { touch.cur = null; });
  function triPath(ctx, x, y, size, col, row) {
    const pad = Math.max(1.2, size * 0.07);
    const up = ((col + row) & 1) === 0;
    const x1 = x + pad, y1 = y + pad, x2 = x + size - pad, y2 = y + size - pad, xm = x + size / 2;
    ctx.beginPath();
    if (up) { ctx.moveTo(xm, y1); ctx.lineTo(x2, y2); ctx.lineTo(x1, y2); }
    else { ctx.moveTo(x1, y1); ctx.lineTo(x2, y1); ctx.lineTo(xm, y2); }
    ctx.closePath();
    return up;
  }
  // 1.9.178 Tasteful block sparkle: a glossy highlight on every cell, and every so
  // often a few random cells get a 4-point twinkle (~0.6s) and a diagonal sheen.
  // Cheap on a phone. prefers-reduced-motion keeps the gloss and calms the motion. No sound.
  let blockSparks = [], sparkNext = 0, sparkHold = null;
  function sparkEase(p) {
    if (p <= 0 || p >= 1) return 0;
    const x = p < 0.4 ? (p / 0.4) : (1 - (p - 0.4) / 0.6);
    return x * x * (3 - 2 * x);
  }
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
  function drawBlockGloss(ctx, x, y, size, alpha) {
    if (!(size > 4) || !(alpha > 0)) return;
    const a = alpha;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 1, y + 1, size - 2, size - 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.22 * a) + ')';
    ctx.beginPath();
    ctx.ellipse(x + size * 0.32, y + size * 0.28, size * 0.34, size * 0.16, -0.5, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.4 * a) + ')';
    ctx.beginPath();
    ctx.ellipse(x + size * 0.24, y + size * 0.2, size * 0.08, size * 0.05, -0.4, 0, 6.283);
    ctx.fill();
    ctx.restore();
  }
  function cellSparkKey(c, r, falling) { return (falling ? 'p:' : '') + c + ':' + r; }
  function tickBlockSpark(now, board, piece, reduce) {
    if (sparkHold) return;
    blockSparks = blockSparks.filter(s => (now - s.t0) < s.dur);
    const cap = reduce ? SPARK_MAX_REDUCE : SPARK_MAX;
    if (blockSparks.length >= cap || now < sparkNext) return;
    const cells = [];
    if (board) for (let r = 0; r < board.length; r++) for (let c = 0; c < board[r].length; c++) if (board[r][c]) cells.push({ c: c, r: r, falling: 0 });
    if (piece && piece.m) piece.m.forEach((row, rr) => row.forEach((v, cc) => {
      if (v && piece.y + rr >= 0) cells.push({ c: piece.x + cc, r: piece.y + rr, falling: 1 });
    }));
    if (!cells.length) return;
    const used = new Set(blockSparks.map(s => cellSparkKey(s.c, s.r, s.falling)));
    const free = cells.filter(c => !used.has(cellSparkKey(c.c, c.r, c.falling)));
    if (!free.length) return;
    const pick = free[(Math.random() * free.length) | 0];
    blockSparks.push({
      c: pick.c, r: pick.r, falling: pick.falling, t0: now,
      dur: SPARK_DUR * (0.92 + Math.random() * 0.16),
      rot: Math.random() * 0.6 - 0.3,
      ox: 0.3 + Math.random() * 0.4,
      oy: 0.3 + Math.random() * 0.4
    });
    sparkNext = now + (reduce ? 1600 : (220 + Math.random() * 320));
  }
  function drawBlockSparks(ctx, now, size) {
    if (!ctx || !blockSparks.length) return;
    const t = sparkHold != null ? sparkHold : now;
    blockSparks.forEach(s => {
      const p = (t - s.t0) / s.dur;
      const life = sparkEase(p);
      if (life <= 0.02) return;
      const x = s.c * size, y = s.r * size;
      const fade = s.falling ? 0.65 : 1;
      // diagonal sheen band sweeping across the cell
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 1, y + 1, size - 2, size - 2);
      ctx.clip();
      const u = Math.max(0, Math.min(1, p));
      const mid = (u * 2 - 0.5) * size;
      const sg = ctx.createLinearGradient(x + mid, y + mid - size, x + mid + size, y + mid);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.45, 'rgba(255,255,255,' + (0.08 * life * fade) + ')');
      sg.addColorStop(0.5, 'rgba(255,255,255,' + (0.32 * life * fade) + ')');
      sg.addColorStop(0.55, 'rgba(255,255,255,' + (0.08 * life * fade) + ')');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(x, y, size, size);
      ctx.restore();
      drawStarGlint(ctx, x + s.ox * size, y + s.oy * size, size * (0.22 + 0.14 * life), 0.85 * life * fade, s.rot);
    });
  }
  function holdBlockSpark(opts) {
    opts = opts || {};
    const now = performance.now();
    const cells = opts.cells || [[1, 16], [3, 17], [6, 15], [8, 18], [4, 14]];
    sparkHold = now;
    blockSparks = cells.slice(0, SPARK_MAX).map((pr, i) => ({
      c: pr[0], r: pr[1], falling: pr[2] ? 1 : 0,
      t0: now - SPARK_DUR * (opts.at != null ? opts.at : 0.4),
      dur: SPARK_DUR, rot: -0.15 + i * 0.12, ox: 0.45, oy: 0.35
    }));
  }
  function drawBlockHits(ctx, x, y, size, hits, now) {
    if (!hits) return;
    const flicker = hits >= 2 ? 0.82 + 0.18 * Math.sin((now || 0) / 80) : 1;
    ctx.save();
    ctx.globalAlpha = (hits === 1 ? 0.22 : 0.4) * flicker;
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(18, 14, 10,' + (0.5 + hits * 0.18) + ')';
    ctx.lineWidth = Math.max(1.1, size * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.18, y + size * 0.16);
    ctx.lineTo(x + size * 0.48, y + size * 0.5);
    ctx.lineTo(x + size * 0.3, y + size * 0.86);
    if (hits >= 2) {
      ctx.moveTo(x + size * 0.78, y + size * 0.14);
      ctx.lineTo(x + size * 0.52, y + size * 0.48);
      ctx.lineTo(x + size * 0.86, y + size * 0.84);
      ctx.moveTo(x + size * 0.12, y + size * 0.52);
      ctx.lineTo(x + size * 0.72, y + size * 0.6);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 230, 180,' + (0.22 * flicker + (hits >= 2 ? 0.12 : 0)) + ')';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  function drawCell(ctx, x, y, color, size, alpha, col, row) {

    if (themeFor(g.level) === TRI_THEME) {
      ctx.globalAlpha = alpha;
      triPath(ctx, x, y, size, col, row);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.save();
      triPath(ctx, x, y, size, col, row);
      ctx.clip();
      const hi = ctx.createLinearGradient(x, y, x, y + size);
      hi.addColorStop(0, 'rgba(255,255,255,0.32)');
      hi.addColorStop(0.45, 'rgba(255,255,255,0)');
      hi.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = hi;
      ctx.fill();
      ctx.restore();
      ctx.lineWidth = Math.max(1, size * 0.06);
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      triPath(ctx, x, y, size, col, row);
      ctx.stroke();
      drawBlockGloss(ctx, x, y, size, alpha);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(x + 1, y + 1, size - 2, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + 1, y + size - 5, size - 2, 4);
    drawBlockGloss(ctx, x, y, size, alpha);
    ctx.globalAlpha = 1;
  }
  function drawGhost(ctx, x, y, color, size, col, row) {
    // 1.9.183 Stronger landing preview: see-through fill, colour outline, faint glow.
    // No gloss or bevel, so it is never mistaken for a locked block.
    ctx.save();
    if (themeFor(g.level) === TRI_THEME) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = color;
      triPath(ctx, x, y, size, col, row);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(3.5, size * 0.16);
      triPath(ctx, x, y, size, col, row);
      ctx.stroke();
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = Math.max(2.2, size * 0.11);
      triPath(ctx, x, y, size, col, row);
      ctx.stroke();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = Math.max(1, size * 0.045);
      triPath(ctx, x, y, size, col, row);
      ctx.stroke();
      ctx.restore();
      return;
    }
    const pad = Math.max(1.6, size * 0.08);
    const ix = x + pad, iy = y + pad, iw = size - pad * 2, ih = size - pad * 2;
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = color;
    ctx.fillRect(ix, iy, iw, ih);
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(4, size * 0.18);
    ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = Math.max(2.2, size * 0.11);
    ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ix - 0.5, iy - 0.5, iw + 1, ih + 1);
    ctx.restore();
  }
  function drawWellFrame(ctx, w, h) {
    // 1.9.183 Crisp well frame on every theme, so the playfield stays distinct
    // from the animated photo without hiding it. Drawn last (under HUD).
    ctx.save();
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 5;
    ctx.strokeRect(2.5, 2.5, w - 5, h - 5);
    ctx.strokeStyle = 'rgba(255,255,255,0.82)';
    ctx.lineWidth = 2.25;
    ctx.strokeRect(3.25, 3.25, w - 6.5, h - 6.5);
    ctx.strokeStyle = 'rgba(180,220,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.restore();
  }
  function drawMini(cv, t, dim) {
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = boardBg;
    ctx.fillRect(0, 0, cv.width, cv.height);
    if (!t) return;
    const m = SHAPES[t];
    const s = 16;
    let minR = 9, maxR = -1, minC = 9, maxC = -1;
    m.forEach((row, r) => row.forEach((v, c) => { if (v) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); } }));
    const w = (maxC - minC + 1) * s, h = (maxR - minR + 1) * s;
    const ox = (cv.width - w) / 2, oy = (cv.height - h) / 2;
    m.forEach((row, r) => row.forEach((v, c) => { if (v) drawCell(ctx, ox + (c - minC) * s, oy + (r - minR) * s, blockColor(t, g.lines, g.level), s, dim ? 0.35 : 1, c, r); }));
  }
  let lookIdx = -1, boardBg = LOOKS[0].board;
  function applyLook(i) {
    if (i === lookIdx) return;
    lookIdx = i;
    const L = LOOKS[i];
    for (let k = 1; k < COLORS.length; k++) COLORS[k] = L.colors[k - 1];
    boardBg = L.board;
    const kind = isEffect(i);
    if (doc.documentElement) {
      doc.documentElement.classList.toggle('effect', !!kind);
      doc.documentElement.classList.toggle('fx-farm', kind === 'farm');
      doc.documentElement.classList.toggle('fx-frog', kind === 'frog');
      doc.documentElement.classList.toggle('fx-beach', kind === 'beach');
      doc.documentElement.classList.toggle('fx-fireworks', kind === 'fireworks');
      doc.documentElement.classList.toggle('fx-ocean', kind === 'ocean');
    }
    // 1.9.175: always the original theme photo (center / cover), including Farmyard and Bullfrog.
    // 1.9.180 Fireworks is the exception: a black night sky (Shane asked for a black background).
    // 1.9.194: Fireworks is plain black — no painted backdrop, no rainforest silhouette.
    if (kind === 'fireworks') doc.documentElement.style.background = '#000';
    else doc.documentElement.style.background = 'linear-gradient(rgba(0,0,0,.28),rgba(0,0,0,.28)), url("' + PICS[i] + '") center / cover no-repeat, ' + L.bg;
    try { const nx = new root.Image(); nx.src = PICS[(i + 1) % PICS.length]; } catch (e) { }
    if (kind) { efxClearAll(); lifeReset(); if (kind === 'farm') farmLoad(); if (kind === 'frog') frogLoad(); if (kind === 'beach') beachLoad(); if (kind === 'fireworks') fwLoad(); if (kind === 'ocean') oceanLoad(); }
    doc.documentElement.style.backgroundAttachment = 'fixed';
    doc.body.style.background = 'transparent';
    drawMini(doc.getElementById('next'), g.next, false);
    drawMini(doc.getElementById('hold'), g.hold, !g.canHold);
  }

  // 1.9.142 Gentle moving things behind the board for each theme (same order as THEMES). Off when reduced motion is set.
  const CRITTERS = [
    [{ e: ['☁️'], n: 3, m: 'fly', sp: [6, 12], y: [0.04, 0.22], sz: [44, 64], a: 0.8 },
     { e: ['🐦'], n: 2, m: 'fly', sp: [22, 34], y: [0.08, 0.3], sz: [18, 24], a: 0.85 },
     { e: ['🦀'], n: 1, m: 'walk', sp: [10, 16], y: [0.93, 0.97], sz: [24, 28], a: 0.9 },
     { e: ['✨'], n: 6, m: 'twinkle', y: [0.55, 0.85], sz: [10, 16], a: 0.8 }],
    [{ e: ['🌺', '🌸', '🌼', '🌷'], n: 9, m: 'drift', sp: [14, 26], sz: [16, 26], a: 0.9 },
     { e: ['🦋'], n: 3, m: 'flutter', sp: [16, 26], y: [0.2, 0.8], sz: [20, 26], a: 0.95 },
     { e: ['🦜'], n: 1, m: 'fly', sp: [30, 40], y: [0.1, 0.35], sz: [28, 34], a: 0.95 }],
    [{ e: ['🐬'], n: 3, m: 'swim', sp: [26, 40], y: [0.25, 0.7], sz: [34, 44], a: 0.95 },
     { e: ['🐠', '🐟', '🐡'], n: 5, m: 'swim', sp: [14, 26], y: [0.4, 0.92], sz: [18, 26], a: 0.9 },
     { e: ['🐋'], n: 1, m: 'swim', sp: [8, 12], y: [0.55, 0.8], sz: [60, 72], a: 0.75 },
     { e: ['o'], n: 10, m: 'bubble', sp: [14, 28], sz: [3, 7], a: 0.5 }],
    [{ e: ['🍃', '🍂', '🌿'], n: 8, m: 'drift', sp: [12, 22], sz: [16, 24], a: 0.9 },
     { e: ['🐦'], n: 2, m: 'fly', sp: [24, 36], y: [0.08, 0.4], sz: [20, 26], a: 0.9 },
     { e: ['🦋'], n: 2, m: 'flutter', sp: [14, 22], y: [0.3, 0.85], sz: [18, 24], a: 0.9 }],
    [{ e: ['•'], n: 22, m: 'window', y: [0.35, 0.8], sz: [3, 5], a: 0.9 },
     { e: ['🚗', '🚕', '🚌', '🚙'], n: 4, m: 'walk', sp: [30, 50], y: [0.94, 0.98], sz: [22, 28], a: 0.9 },
     { e: ['✈️'], n: 1, m: 'fly', sp: [18, 26], y: [0.05, 0.18], sz: [22, 26], a: 0.85 }],
    [{ e: ['*'], n: 40, m: 'star', y: [0, 0.7], sz: [1, 2.4], a: 1 },
     { e: ['.'], n: 8, m: 'firefly', y: [0.55, 0.95], sz: [2, 3.5], a: 0.9 },
     { e: ['-'], n: 1, m: 'shoot', sz: [2, 2], a: 0.9 }],
    [{ e: ['☁️'], n: 3, m: 'fly', sp: [6, 12], y: [0.04, 0.2], sz: [40, 60], a: 0.85 },
     { e: ['🐄', '🐑', '🐖', '🐓', '🐥'], n: 4, m: 'walk', sp: [8, 16], y: [0.9, 0.97], sz: [24, 32], a: 0.95 },
     { e: ['🐝', '🦋'], n: 3, m: 'flutter', sp: [14, 22], y: [0.3, 0.8], sz: [16, 22], a: 0.9 }],
    [{ e: ['*'], n: 35, m: 'star', y: [0, 1], sz: [0.8, 2], a: 1 },
     { e: ['🚀'], n: 1, m: 'fly', dir: 1, noflip: 1, vy: -16, sp: [26, 36], y: [0.7, 0.95], sz: [30, 36], a: 0.95 },
     { e: ['🛸', '🪐', '🌍', '☄️'], n: 3, m: 'fly', sp: [6, 14], y: [0.1, 0.85], sz: [24, 36], a: 0.85 },
     { e: ['-'], n: 1, m: 'shoot', sz: [2, 2], a: 0.9 }],
    [{ e: ['^'], n: 14, m: 'tri', sp: [10, 22], sz: [10, 28], a: 0.45 }],
    [{ e: ['🐑'], n: 4, m: 'walk', sp: [6, 12], y: [0.9, 0.97], sz: [22, 28], a: 0.95 },
     { e: ['🌺'], n: 6, m: 'drift', sp: [12, 22], sz: [14, 22], a: 0.9 },
     { e: ['🐦'], n: 2, m: 'fly', sp: [22, 32], y: [0.08, 0.35], sz: [20, 26], a: 0.9 },
     { e: ['🌿'], n: 3, m: 'drift', sp: [10, 16], sz: [16, 22], a: 0.85 }],
    [{ e: ['.'], n: 45, m: 'snow', sp: [16, 34], sz: [1.2, 3.2], a: 0.85 },
     { e: ['❄️'], n: 6, m: 'drift', sp: [10, 18], sz: [14, 22], a: 0.9 },
     { e: ['🦅'], n: 1, m: 'fly', sp: [18, 26], y: [0.08, 0.3], sz: [26, 32], a: 0.9 }],
    [{ e: ['🐸'], n: 3, m: 'walk', sp: [10, 20], y: [0.9, 0.97], sz: [26, 34], a: 0.95 },
     { e: ['🪷'], n: 5, m: 'drift', sp: [6, 12], sz: [16, 24], a: 0.85 },
     { e: ['🐞', '🦋'], n: 3, m: 'flutter', sp: [14, 22], y: [0.3, 0.8], sz: [16, 22], a: 0.9 },
     { e: ['o'], n: 8, m: 'bubble', sp: [10, 20], sz: [3, 6], a: 0.45 }]
  ];
  const fx = { cv: null, ctx: null, w: 0, h: 0, list: [], theme: -1, last: 0, cache: new Map(), off: false };
  try { fx.off = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function fxSize() {
    if (!fx.cv) return;
    const d = Math.min(2, root.devicePixelRatio || 1);
    fx.w = root.innerWidth; fx.h = root.innerHeight;
    fx.cv.width = Math.round(fx.w * d); fx.cv.height = Math.round(fx.h * d);
    fx.ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function fxInit() {
    if (fx.cv || fx.off || !doc.body || !doc.createElement) return;
    const cv = doc.createElement('canvas'); if (!cv.getContext) return;
    cv.className = 'fx'; cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';
    doc.body.insertBefore(cv, doc.body.firstChild);
    const wrap = doc.querySelector('.wrap'); if (wrap) { wrap.style.position = 'relative'; wrap.style.zIndex = '1'; }
    fx.cv = cv; fx.ctx = cv.getContext('2d'); fxSize();
    root.addEventListener('resize', fxSize);
  }
  function fxSpawn(k, first) {
    const dir = k.dir || (Math.random() < 0.5 ? 1 : -1), sz = rnd(k.sz[0], k.sz[1]);
    const c = { k, ch: k.e[Math.floor(Math.random() * k.e.length)], sz, dir, ph: rnd(0, 6.28), sp: k.sp ? rnd(k.sp[0], k.sp[1]) : 0 };
    const yr = k.y || [0, 1];
    c.y = fx.h * rnd(yr[0], yr[1]); c.y0 = c.y;
    if (k.m === 'snow') { c.x = rnd(0, fx.w); c.y = first ? rnd(-10, fx.h) : -10; }
    else if (k.m === 'tri') { c.x = rnd(0, fx.w); c.y = first ? rnd(0, fx.h) : fx.h + 40; c.hue = rnd(0, 360); }
    else if (k.m === 'drift') { c.x = rnd(0, fx.w); c.y = first ? rnd(-20, fx.h) : -30; }
    else if (k.m === 'bubble') { c.x = rnd(0, fx.w); c.y = first ? rnd(0, fx.h) : fx.h + 10; }
    else if (k.m === 'twinkle' || k.m === 'star' || k.m === 'window' || k.m === 'firefly') { c.x = rnd(0, fx.w); }
    else if (k.m === 'shoot') { c.x = -999; c.wait = rnd(3, 9); }
    else { c.x = first ? rnd(0, fx.w) : (dir > 0 ? -sz * 2 : fx.w + sz * 2); }
    return c;
  }
  function fxTheme(i) {
    fx.theme = i; fx.list = [];
    for (const k of CRITTERS[i] || []) for (let n = 0; n < k.n; n++) fx.list.push(fxSpawn(k, true));
  }
  function glyph(ch, sz) {
    const key = ch + '|' + Math.round(sz);
    let g = fx.cache.get(key);
    if (!g) {
      g = doc.createElement('canvas'); const p = Math.ceil(sz * 1.5); g.width = g.height = p * 2;
      const c = g.getContext('2d'); c.scale(2, 2); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = Math.round(sz) + 'px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
      c.fillText(ch, p / 2, p / 2); g.p = p; fx.cache.set(key, g);
    }
    return g;
  }
  function fxDraw(now) {
    if (isEffect(lookIdx < 0 ? themeIdx : lookIdx)) {
      try { if (effectStageDraw(now)) return; } catch (e) { }
    }
    if (fx.off) return;
    fxInit(); if (!fx.ctx) return;
    if (fx.theme !== lookIdx) fxTheme(lookIdx < 0 ? 0 : lookIdx);
    if ((lookIdx < 0 ? themeIdx : lookIdx) === SNOW_THEME && g) {
      try { syncSnowFx(snowProg(g.lines, g.level)); } catch (e) { }
    }
    const t = now / 1000, dt = Math.min(0.05, fx.last ? t - fx.last : 0); fx.last = t;
    const c = fx.ctx; c.clearRect(0, 0, fx.w, fx.h);
    for (let i = 0; i < fx.list.length; i++) {
      let o = fx.list[i]; const k = o.k, m = k.m;
      let a = k.a, rot = 0, flip = o.dir > 0;
      if (k.vy) o.y0 += k.vy * dt;
      if (m === 'snow') {
        const par = snowFallParams(fx.snowProg || 0);
        o.y += (o.sp || par.speed0) * dt;
        o.x += Math.sin(t * 0.55 + o.ph) * par.wind * dt;
      }
      else if (m === 'tri') { o.y -= o.sp * dt; o.x += Math.sin(t * 0.4 + o.ph) * 6 * dt; rot = t * 0.3 + o.ph; }
      else if (m === 'fly' || m === 'walk') { o.x += o.dir * o.sp * dt; o.y = o.y0 + (m === 'fly' ? Math.sin(t * 0.8 + o.ph) * 6 : 0); }
      else if (m === 'flutter') { o.x += o.dir * o.sp * dt; o.y = o.y0 + Math.sin(t * 1.6 + o.ph) * 18; rot = Math.sin(t * 6 + o.ph) * 0.15; }
      else if (m === 'swim') { o.x += o.dir * o.sp * dt; const s = Math.sin(o.x / 60 + o.ph); o.y = o.y0 + s * (o.sz * 0.5); rot = -Math.cos(o.x / 60 + o.ph) * 0.35 * o.dir; }
      else if (m === 'drift') { o.y += o.sp * dt; o.x += Math.sin(t * 0.9 + o.ph) * 12 * dt; rot = Math.sin(t * 0.7 + o.ph) * 0.6; }
      else if (m === 'bubble') { o.y -= o.sp * dt; o.x += Math.sin(t * 2 + o.ph) * 8 * dt; }
      else if (m === 'twinkle' || m === 'star' || m === 'window') a = k.a * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (m === 'window' ? 0.4 : 1.3) + o.ph * 3)));
      else if (m === 'firefly') { o.x += Math.sin(t * 0.5 + o.ph) * 10 * dt; o.y += Math.cos(t * 0.6 + o.ph * 2) * 8 * dt; a = k.a * (0.5 + 0.5 * Math.sin(t * 1.8 + o.ph)); }
      else if (m === 'shoot') {
        if (o.x < -100) { o.wait -= dt; if (o.wait <= 0) { o.x = rnd(fx.w * 0.1, fx.w * 0.6); o.y = rnd(0, fx.h * 0.25); o.life = 0; } continue; }
        o.life += dt; o.x += 220 * dt; o.y += 90 * dt; a = Math.max(0, 1 - o.life / 1.4);
        if (a <= 0 || o.x > fx.w + 50) { fx.list[i] = fxSpawn(k, false); continue; }
        const g2 = c.createLinearGradient(o.x - 70, o.y - 29, o.x, o.y); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(1, 'rgba(255,255,255,' + (a * 0.9) + ')');
        c.strokeStyle = g2; c.lineWidth = 2; c.beginPath(); c.moveTo(o.x - 70, o.y - 29); c.lineTo(o.x, o.y); c.stroke(); continue;
      }
      const gone = o.x < -o.sz * 3 || o.x > fx.w + o.sz * 3 || o.y > fx.h + 40 || o.y < -60;
      if (gone && m !== 'twinkle') { fx.list[i] = fxSpawn(k, false); continue; }
      c.globalAlpha = a;
      if (m === 'bubble') { c.strokeStyle = 'rgba(220,245,255,0.8)'; c.lineWidth = 1.2; c.beginPath(); c.arc(o.x, o.y, o.sz, 0, 6.283); c.stroke(); }
      else if (m === 'snow') { c.fillStyle = '#fff'; c.beginPath(); c.arc(o.x, o.y, o.sz, 0, 6.283); c.fill(); }
      else if (m === 'tri') { c.save(); c.translate(o.x, o.y); c.rotate(rot); c.fillStyle = 'hsla(' + ((o.hue + t * 12) % 360) + ',90%,65%,1)'; c.beginPath(); c.moveTo(0, -o.sz); c.lineTo(o.sz * 0.87, o.sz * 0.5); c.lineTo(-o.sz * 0.87, o.sz * 0.5); c.closePath(); c.fill(); c.restore(); }
      else if (m === 'star') { c.fillStyle = '#fff'; c.beginPath(); c.arc(o.x, o.y, o.sz, 0, 6.283); c.fill(); }
      else if (m === 'window') { c.fillStyle = '#fde68a'; c.fillRect(o.x, o.y, o.sz, o.sz * 1.3); }
      else if (m === 'firefly') { c.fillStyle = '#bef264'; c.shadowColor = '#bef264'; c.shadowBlur = 8; c.beginPath(); c.arc(o.x, o.y, o.sz, 0, 6.283); c.fill(); c.shadowBlur = 0; }
      else {
        const g = glyph(o.ch, o.sz);
        c.save(); c.translate(o.x, o.y); if (rot) c.rotate(rot); if (flip && !k.noflip && m !== 'drift' && m !== 'twinkle') c.scale(-1, 1);
        c.drawImage(g, -g.p / 2, -g.p / 2, g.p, g.p); c.restore();
      }
    }
    c.globalAlpha = 1;
    const nzOn = (lookIdx < 0 ? themeIdx : lookIdx) === NZ_THEME || (g && themeFor(g.clearFx ? g.clearFx.level : g.level) === NZ_THEME);
    if (nzOn) {
      try {
        stepNzGulls(nzGulls, dt * 1000, fx.w, fx.h, { reduce: fx.off || reduceMotion() });
        drawNzGulls(c, nzGulls);
      } catch (e) { }
    } else if (nzGulls && nzGulls.ready) nzGullsReset();
    try { drawNzFlash(c, fx.w, fx.h); } catch (e) { }
  }
  // Pixel invaders on the Space travel board. They drift; bombs fall slowly down a column.
  const INV_SPRITES = [
    [['..#.....#..','...#...#...','..#######..','.##.#.#.##.','###########','#.#.###.#.#','#.#.....#.#','...##.##...'],
     ['..#.....#..','#..#...#..#','#.#######.#','###.#.#.###','.#########.','..#.###.#..','..#.....#..','.#.......#.' ]],
    [['...#.#.....','..#####....','.#######...','.#.#.#.#...','#########..','.#####.#...','#.#...#.#..','.#.#.......'],
     ['...#.#.....','..#####....','.#######...','#.#.#.#.#..','#########..','.#.#####...','..#...#.#..','.......#.#.']]
  ];
  const inv = newInvaders();
  const city = newCityCrew();
  function invReset() { resetInvaders(inv, g.level); }
  function invSeed(opts) { seedInvaders(inv, g, opts); }
  function invStep(dt) { stepInvaders(inv, g, dt, { started: started, onThump: (k) => sfx(k || 'thump') }); }
  function cityReset() { resetCityCrew(city, g.level, g); }
  function citySeed(opts) { seedCityCrew(city, g, (opts && opts.city) || {}); }
  function cityStep(dt) { stepCityCrew(city, g, dt, { started: started, onTock: () => sfx('tock') }); }
  function invSprite(ctx, rows, x, y, color) {
    const px = INV_PX;
    ctx.fillStyle = color;
    for (let r = 0; r < rows.length; r++) {
      const line = rows[r];
      for (let c = 0; c < line.length; c++) if (line[c] === '#') ctx.fillRect(Math.round(x + c * px), Math.round(y + r * px), px, px);
    }
  }
  function invDraw(ctx) {
    if (themeFor(g.level) !== SPACE_THEME) return;
    if (!inv.ready) invReset();
    const frame = (inv.t / 400 | 0) % 2;
    const colours = ['#7dcc8a', '#7eb8c9'];
    for (let i = 0; i < INV_COUNT; i++) {
      const rows = INV_SPRITES[i % 2][frame];
      invSprite(ctx, rows, inv.x + i * INV_GAP, 6, colours[i % 2]);
    }
    for (const b of inv.bombs) {
      const bx = b.x, by = b.y;
      ctx.fillStyle = '#e6c36a';
      ctx.fillRect(bx - 2, by - 6, 4, 3);
      ctx.fillRect(bx - 3, by - 3, 6, 6);
      ctx.fillRect(bx - 2, by + 3, 4, 3);
      ctx.fillStyle = 'rgba(230,195,106,0.35)';
      ctx.fillRect(bx - 1, by + 6, 2, 5);
    }
    for (const e of inv.boom) {
      const life = e.kind === 'out' ? 480 : 240;
      const k = Math.max(0, e.t / life), cx = e.c * CELL + CELL / 2, cy = e.r * CELL + CELL / 2;
      const rad = (e.kind === 'out' ? 7 : 4) + (e.kind === 'out' ? 16 : 8) * (1 - k);
      ctx.globalAlpha = 0.35 * k;
      ctx.fillStyle = e.kind === 'out' ? '#f3d7a0' : '#d9c48a';
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 0.7 * k;
      ctx.fillStyle = '#e8b86a';
      ctx.beginPath(); ctx.arc(cx, cy, rad * 0.45, 0, 6.283); ctx.fill();
      if (e.parts) {
        for (const p of e.parts) {
          ctx.globalAlpha = 0.85 * k;
          ctx.fillStyle = p.col || '#f3d7a0';
          ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
        }
      }
      ctx.globalAlpha = 1;
    }
  }


  function drawCityLadder(ctx, crew, gm) {
    const foot = cityLadderFoot(crew);
    const top = cityLadderTop(crew, gm);
    const x0 = foot.x, y0 = ROWS * CELL - 1;
    const x1 = top.x, y1 = Math.min(top.y, ROWS * CELL - 24);
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const px = -uy, py = ux;
    const half = 6.2;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Grounded shadow
    ctx.strokeStyle = 'rgba(8,0,28,0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0 + px * half + 3, y0 + 3);
    ctx.lineTo(x1 + px * half + 3, y1 + 3);
    ctx.moveTo(x0 - px * half + 3, y0 + 3);
    ctx.lineTo(x1 - px * half + 3, y1 + 3);
    ctx.stroke();
    function rail(side, w, dark) {
      const s = side * half;
      ctx.beginPath();
      ctx.moveTo(x0 + px * s, y0 + py * s);
      ctx.lineTo(x1 + px * s, y1 + py * s);
      ctx.strokeStyle = dark ? '#2a1a3c' : '#d4c4e8';
      ctx.lineWidth = w;
      ctx.stroke();
    }
    rail(-1, 4.2, true); rail(1, 4.2, true);
    rail(-1, 2.4, false); rail(1, 2.4, false);
    // Cyan rim on the near rail, warm edge on the far one — matches the skyline lights.
    ctx.strokeStyle = 'rgba(80, 220, 255, 0.55)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x0 + px * (-half + 1.4), y0); ctx.lineTo(x1 + px * (-half + 1.4), y1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 140, 80, 0.45)';
    ctx.beginPath();
    ctx.moveTo(x0 + px * (half - 1.2), y0); ctx.lineTo(x1 + px * (half - 1.2), y1);
    ctx.stroke();
    const rungs = Math.max(6, Math.floor(len / 16));
    for (let i = 1; i < rungs; i++) {
      const t = i / rungs;
      const x = x0 + dx * t, y = y0 + dy * t;
      ctx.beginPath();
      ctx.moveTo(x - px * (half - 0.6), y - py * (half - 0.6));
      ctx.lineTo(x + px * (half - 0.6), y + py * (half - 0.6));
      ctx.strokeStyle = '#1a1028';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(232, 214, 255, 0.85)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    // Feet at the bottom of the screen
    ctx.fillStyle = '#2a1a3c';
    ctx.beginPath(); ctx.arc(x0 - px * half, y0, 3.2, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(x0 + px * half, y0, 3.2, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(80, 220, 255, 0.5)';
    ctx.beginPath(); ctx.arc(x0 - px * half, y0, 1.5, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  function drawCityBrick(ctx, x, y, typ, s) {
    s = s || 9;
    const col = COLORS[typ] || '#facc15';
    ctx.save();
    ctx.translate(x, y);
    // isometric-ish cube
    ctx.fillStyle = 'rgba(8,0,24,0.35)';
    ctx.fillRect(-s * 0.4 + 1.5, -s * 0.15 + 1.5, s * 0.85, s * 0.7);
    const gdt = ctx.createLinearGradient(-s * 0.5, -s * 0.6, s * 0.5, s * 0.5);
    gdt.addColorStop(0, 'rgba(255,255,255,0.55)');
    gdt.addColorStop(0.35, col);
    gdt.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = gdt;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.55);
    ctx.lineTo(s * 0.55, -s * 0.2);
    ctx.lineTo(s * 0.55, s * 0.35);
    ctx.lineTo(0, s * 0.62);
    ctx.lineTo(-s * 0.55, s * 0.35);
    ctx.lineTo(-s * 0.55, -s * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.55); ctx.lineTo(0, s * 0.62); ctx.stroke();
    ctx.restore();
  }
  function drawCityWorker(ctx, w, t) {
    const x = w.x, y = w.y;
    const dir = w.dir >= 0 ? 1 : -1;
    const climb = w.pose === 'climb';
    const hammer = w.pose === 'hammer';
    const walk = w.walk || 0;
    const swing = climb ? Math.sin(walk * 2.2) * 0.35 : (hammer ? Math.sin(t / 50) * 0.9 : Math.sin(walk) * 0.45);
    const bob = climb ? 0 : Math.abs(Math.sin(walk)) * 0.8;
    ctx.save();
    ctx.translate(x, y - bob);
    ctx.scale(dir, 1);
    // Contact shadow
    ctx.fillStyle = 'rgba(8,0,30,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 2, 8, 2.2, 0, 0, 6.283); ctx.fill();
    function limb(x1, y1, x2, y2, wdt, col) {
      ctx.strokeStyle = col;
      ctx.lineWidth = wdt;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    const pant = '#2a2040';
    const pantHi = '#4a3a62';
    const skin = '#e8b898';
    const boot = '#1a1428';
    // Legs
    const lA = climb ? 0.55 + swing : 0.35 + swing;
    const lB = climb ? 0.55 - swing : 0.35 - swing;
    limb(-2.2, -9, -3.5 - swing * 2, -2, 3.4, pant);
    limb(2.2, -9, 3.2 + swing * 2, -2, 3.4, pant);
    limb(-3.5 - swing * 2, -2, -4.2 - swing * 2, 1.5, 3.1, boot);
    limb(3.2 + swing * 2, -2, 4.0 + swing * 2, 1.5, 3.1, boot);
    // Torso / hi-vis, with a 3D vest fold
    const vest = ctx.createLinearGradient(-7, -22, 8, -8);
    vest.addColorStop(0, '#fff3a0');
    vest.addColorStop(0.25, '#f5d031');
    vest.addColorStop(0.7, '#c9a40e');
    vest.addColorStop(1, '#6b4a10');
    ctx.fillStyle = vest;
    ctx.beginPath();
    ctx.moveTo(-6.2, -21);
    ctx.lineTo(6.4, -21);
    ctx.lineTo(7.2, -9);
    ctx.lineTo(-6.8, -9);
    ctx.closePath();
    ctx.fill();
    // Magenta bounce light on the vest edge (city neon)
    ctx.strokeStyle = 'rgba(255, 70, 180, 0.55)';
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(6.2, -20.5); ctx.lineTo(7.0, -9.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(80, 220, 255, 0.4)';
    ctx.beginPath(); ctx.moveTo(-6.0, -20.5); ctx.lineTo(-6.6, -9.2); ctx.stroke();
    // Reflective silver stripes
    ctx.fillStyle = 'rgba(230, 245, 255, 0.85)';
    ctx.fillRect(-5.4, -17.2, 11, 1.6);
    ctx.fillRect(-5.6, -13.2, 11.4, 1.6);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(-5.4, -17.2, 11, 0.5);
    // Arms
    const armCol = '#f5d031';
    if (hammer) {
      limb(-5.5, -18.5, -8 - swing * 2, -14, 2.6, skin);
      limb(4.5, -18.5, 7, -12 + swing * 6, 2.6, skin);
      // hammer
      ctx.save();
      ctx.translate(7, -12 + swing * 6);
      ctx.rotate(0.9 + swing);
      ctx.fillStyle = '#3a2a20';
      ctx.fillRect(-1, -7, 2, 8);
      ctx.fillStyle = '#8a7a90';
      ctx.fillRect(-3.2, -10, 6.4, 3.4);
      ctx.fillStyle = 'rgba(180, 230, 255, 0.5)';
      ctx.fillRect(-3.2, -10, 6.4, 1);
      ctx.restore();
    } else if (climb) {
      limb(-5.2, -18.5, -7.5, -24 - swing * 3, 2.6, skin);
      limb(4.8, -18.5, 6.5, -22 + swing * 3, 2.6, skin);
    } else {
      limb(-5.2, -18.5, -7.5, -12 - swing * 4, 2.6, skin);
      limb(4.8, -18.5, 6.8, -12 + swing * 4, 2.6, skin);
    }
    // Head
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(0.2, -25.2, 4.3, 0, 6.283); ctx.fill();
    // Hard hat — glossy yellow with a brim, sunset highlight, cyan rim
    ctx.fillStyle = '#c9a00a';
    ctx.beginPath(); ctx.ellipse(0.2, -27.4, 6.2, 2.1, 0, 0, 6.283); ctx.fill(); // brim
    const hat = ctx.createLinearGradient(-4, -34, 4, -26);
    hat.addColorStop(0, '#fff4b0');
    hat.addColorStop(0.35, '#ffd84a');
    hat.addColorStop(1, '#c98910');
    ctx.fillStyle = hat;
    ctx.beginPath(); ctx.ellipse(0.2, -29.2, 5.1, 4.3, 0, Math.PI, 0, true); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0.2, -29.0, 5.1, 3.2, 0, 0, Math.PI, true); ctx.fill();
    ctx.strokeStyle = 'rgba(80, 220, 255, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0.2, -27.6, 6.0, 1.7, 0, 0, 3.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(-1.3, -30.6, 1.7, 1.0, -0.5, 0, 6.283); ctx.fill();
    // Brick under the arm / on the shoulder while climbing
    if (w.brick) {
      const bx = climb ? 8.5 : 9;
      const by = climb ? -20 : -14;
      drawCityBrick(ctx, bx, by, w.brick, 8);
    }
    ctx.restore();
  }
  function drawCityDust(ctx, crew) {
    for (const d of crew.dust) {
      const k = 1 - d.t / d.life;
      ctx.globalAlpha = 0.55 * k;
      ctx.fillStyle = 'rgba(220, 190, 150, 1)';
      ctx.beginPath(); ctx.arc(d.x, d.y, d.sz * k, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawCityCrew(ctx) {
    if (themeFor(g.level) !== CITY_THEME) return;
    if (!city.ready) cityReset();
    drawCityLadder(ctx, city, g);
    drawCityDust(ctx, city);
    const list = city.workers.slice();
    // Painters: draw farther (higher y is closer? y down is toward camera at bottom). Sort by y.
    list.sort((a, b) => a.y - b.y);
    for (const w of list) drawCityWorker(ctx, w, city.t);
  }



  function rgbaHex(h, a) {
    if (!h || h[0] !== '#') return 'rgba(255,255,255,' + a + ')';
    const n = parseInt(h.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function rrPath(ctx, x, y, w, h, r) {
    const p = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + p, y);
    ctx.arcTo(x + w, y, x + w, y + h, p);
    ctx.arcTo(x + w, y + h, x, y + h, p);
    ctx.arcTo(x, y + h, x, y, p);
    ctx.arcTo(x, y, x + w, y, p);
    ctx.closePath();
  }
  function hexRgb(h) {
    if (!h || h[0] !== '#') return [255, 255, 255];
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(h, a) { const c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function lighten(h, k) {
    const c = hexRgb(h);
    return 'rgb(' + Math.round(c[0] + (255 - c[0]) * k) + ',' + Math.round(c[1] + (255 - c[1]) * k) + ',' + Math.round(c[2] + (255 - c[2]) * k) + ')';
  }
  function cellThemeIdx() {
    if (g.clearFx) return themeFor(g.clearFx.level);
    if (g.levelUp) return g.levelUp.theme;
    return themeFor(g.level);
  }
  function drawEffectGlyph(ctx, x, y, size, kind, color) {
    const s = size;
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = Math.max(0.8, s * 0.055);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (kind === 'farm') {
      // small wheat-head chevron
      ctx.beginPath();
      ctx.moveTo(0, s * 0.22); ctx.lineTo(0, -s * 0.18);
      ctx.moveTo(-s * 0.12, -s * 0.02); ctx.lineTo(0, -s * 0.18); ctx.lineTo(s * 0.12, -s * 0.02);
      ctx.moveTo(-s * 0.14, s * 0.08); ctx.lineTo(0, -s * 0.04); ctx.lineTo(s * 0.14, s * 0.08);
      ctx.stroke();
    } else {
      // lily-ripple arcs
      ctx.beginPath(); ctx.arc(0, s * 0.04, s * 0.18, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, s * 0.06, s * 0.28, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    }
    ctx.restore();
  }
  function drawEffectCell(ctx, x, y, color, size, alpha) {
    const kind = isEffect(cellThemeIdx());
    const pad = Math.max(1, size * 0.06);
    const rad = Math.max(3, size * 0.18);
    ctx.save();
    ctx.globalAlpha = alpha;
    // soft bloom (no shadowBlur — cheaper)
    rrPath(ctx, x - 1, y - 1, size + 2, size + 2, rad + 1);
    ctx.fillStyle = rgba(color, 0.22);
    ctx.fill();
    rrPath(ctx, x + pad, y + pad, size - pad * 2, size - pad * 2, rad);
    const gdt = ctx.createLinearGradient(x, y, x + size * 0.2, y + size);
    gdt.addColorStop(0, lighten(color, 0.55));
    gdt.addColorStop(0.4, color);
    gdt.addColorStop(1, rgba(color, 0.72));
    ctx.fillStyle = gdt;
    ctx.globalAlpha = alpha * 0.9;
    ctx.fill();
    // inner glass highlight
    rrPath(ctx, x + pad + 1, y + pad + 1, size - pad * 2 - 2, (size - pad * 2) * 0.42, rad * 0.7);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();
    ctx.globalAlpha = alpha * 0.85;
    drawEffectGlyph(ctx, x, y, size, kind, color);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function drawEffectGhost(ctx, x, y, color, size) {
    const pad = Math.max(1.6, size * 0.08);
    const rad = Math.max(3, size * 0.18);
    ctx.save();
    ctx.globalAlpha = 0.26;
    rrPath(ctx, x + pad, y + pad, size - pad * 2, size - pad * 2, rad);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3.5, size * 0.16);
    rrPath(ctx, x + pad, y + pad, size - pad * 2, size - pad * 2, rad);
    ctx.stroke();
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = Math.max(2.2, size * 0.11);
    ctx.stroke();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function drawEffectTrails(ctx) {
    if (!efx.trails.length) return;
    efx.trails.forEach(tr => {
      const k = 1 - tr.t / tr.dur;
      tr.cells.forEach(cell => {
        const x = cell.c * CELL;
        const y0 = (tr.fromY + cell.r) * CELL;
        const y1 = (tr.toY + cell.r) * CELL;
        const gdt = ctx.createLinearGradient(x, y0, x, y1);
        gdt.addColorStop(0, rgba(tr.color, 0));
        gdt.addColorStop(1, rgba(tr.color, 0.45 * k));
        ctx.fillStyle = gdt;
        ctx.fillRect(x + 4, y0, CELL - 8, Math.max(2, y1 - y0));
      });
    });
  }
  function drawEffectRipples(ctx) {
    efx.ripples.forEach(rp => {
      const p = rp.t / rp.dur;
      const rad = 6 + p * 22;
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.7;
      ctx.strokeStyle = rp.color;
      ctx.lineWidth = 1.6 * (1 - p * 0.5);
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rad, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = (1 - p) * 0.25;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rad * 0.55, 0, 6.283); ctx.stroke();
      ctx.restore();
    });
  }
  function drawEfxParts(ctx) {
    // screen-space particles on the FX canvas
    for (let i = 0; i < efx.parts.length; i++) {
      const p = efx.parts[i];
      const k = Math.max(0, p.life / p.max);
      ctx.globalAlpha = k * 0.9;
      if (p.typ === 'seed') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((1 - k) * p.spin);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, 6.283); ctx.fill();
        ctx.restore();
      } else if (p.typ === 'drop') {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.arc(p.x - p.size * 0.25, p.y - p.size * 0.25, p.size * 0.25, 0, 6.283); ctx.fill();
      } else if (p.typ === 'glow') {
        ctx.fillStyle = rgba(p.color, 0.35);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.8, 0, 6.283); ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.7, 0, 6.283); ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  // 1.9.175 Life on the original theme photos: sun rise, barn animals, hopping frog.
  // Characters are composited in photo-space (center / cover) and drawn on a
  // foreground canvas so they stay visible around the board on a phone.
  const PHOTO_W = 540, PHOTO_H = 960;
  function photoBox() {
    const vw = root.innerWidth || 390, vh = root.innerHeight || 844;
    const scale = Math.max(vw / PHOTO_W, vh / PHOTO_H);
    const dw = PHOTO_W * scale, dh = PHOTO_H * scale;
    return { left: (vw - dw) / 2, top: (vh - dh) / 2, dw: dw, dh: dh, scale: scale, vw: vw, vh: vh };
  }
  function photoToScreen(nx, ny) {
    const p = photoBox();
    return { x: p.left + nx * p.dw, y: p.top + ny * p.dh, s: p.scale };
  }
  function lifeSize() {
    if (!life.cv) return;
    const d = Math.min(2, root.devicePixelRatio || 1);
    life.w = root.innerWidth; life.h = root.innerHeight;
    life.cv.width = Math.round(life.w * d); life.cv.height = Math.round(life.h * d);
    life.ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function lifeInit() {
    if (life.cv || !doc.body || !doc.createElement) return;
    const cv = doc.createElement('canvas');
    if (!cv.getContext) return;
    cv.className = 'fx-life';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3';
    doc.body.appendChild(cv);
    life.cv = cv; life.ctx = cv.getContext('2d');
    lifeSize();
    root.addEventListener('resize', lifeSize);
  }
  function clipAroundBoard(ctx, w, h) {
    const el = doc.getElementById('board');
    if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    if (r.width < 8) return;
    const pad = 3;
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.rect(r.left - pad, r.top - pad, r.width + pad * 2, r.height + pad * 2);
    ctx.clip('evenodd');
  }
  function lifeSprite(name, w, h, paint) {
    let s = life.cache[name];
    if (s) return s;
    const d = 2;
    const cv = doc.createElement('canvas');
    cv.width = Math.ceil(w * d); cv.height = Math.ceil(h * d);
    const c = cv.getContext('2d');
    c.scale(d, d);
    paint(c, w, h);
    s = { cv: cv, w: w, h: h };
    life.cache[name] = s;
    return s;
  }
  function strokeFill(c, fill, stroke, lw) {
    c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1.4; c.stroke(); }
  }

  // ---- cute illustrated sprites (feet at the bottom of the canvas) ----
  function paintFrog(c, w, h, stretch) {
    const cx = w * 0.5, fy = stretch ? h * 0.62 : h * 0.78;
    const k = stretch ? 1.25 : 1;
    c.lineJoin = 'round';
    // back legs — flung out behind during a hop
    c.fillStyle = '#4d7c0f';
    if (stretch) {
      c.beginPath(); c.ellipse(cx - 26, fy + 4, 14, 5, -0.7, 0, 6.283); c.fill();
      c.beginPath(); c.ellipse(cx + 8, fy + 10, 14, 5, 0.5, 0, 6.283); c.fill();
    } else {
      c.beginPath(); c.ellipse(cx - 18, fy + 8, 10, 6, -0.4, 0, 6.283); c.fill();
      c.beginPath(); c.ellipse(cx + 18, fy + 8, 10, 6, 0.4, 0, 6.283); c.fill();
    }
    // body
    c.beginPath(); c.ellipse(cx, fy, 22, 16 * k, 0, 0, 6.283);
    strokeFill(c, '#65a30d', '#3f6212', 1.5);
    c.beginPath(); c.ellipse(cx, fy + 4, 14, 10, 0, 0, 6.283);
    c.fillStyle = '#ecfccb'; c.fill();
    // spots
    c.fillStyle = 'rgba(20,60,10,0.35)';
    c.beginPath(); c.arc(cx - 10, fy - 4, 3, 0, 6.283); c.fill();
    c.beginPath(); c.arc(cx + 8, fy - 6, 2.4, 0, 6.283); c.fill();
    // eyes
    c.beginPath(); c.arc(cx - 10, fy - 16, 8, 0, 6.283);
    strokeFill(c, '#84cc16', '#3f6212', 1.3);
    c.beginPath(); c.arc(cx + 10, fy - 16, 8, 0, 6.283);
    strokeFill(c, '#84cc16', '#3f6212', 1.3);
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(cx - 10, fy - 16, 5, 0, 6.283); c.fill();
    c.beginPath(); c.arc(cx + 10, fy - 16, 5, 0, 6.283); c.fill();
    c.fillStyle = '#14532d';
    c.beginPath(); c.arc(cx - 9, fy - 16, 2.6, 0, 6.283); c.fill();
    c.beginPath(); c.arc(cx + 11, fy - 16, 2.6, 0, 6.283); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(cx - 10, fy - 17, 1, 0, 6.283); c.fill();
    c.beginPath(); c.arc(cx + 10, fy - 17, 1, 0, 6.283); c.fill();
    // smile
    c.strokeStyle = '#365314'; c.lineWidth = 1.6;
    c.beginPath(); c.arc(cx, fy - 2, 8, 0.2, Math.PI - 0.2); c.stroke();
    // front feet
    c.fillStyle = '#4d7c0f';
    c.beginPath(); c.ellipse(cx - 12, fy + 12, 7, 4, 0.2, 0, 6.283); c.fill();
    c.beginPath(); c.ellipse(cx + 12, fy + 12, 7, 4, -0.2, 0, 6.283); c.fill();
  }
  function paintDragonfly(c, w, h, wing) {
    const cx = w * 0.5, cy = h * 0.5;
    c.save(); c.translate(cx, cy);
    c.strokeStyle = '#164e63'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-16, 0); c.lineTo(18, 0); c.stroke();
    c.fillStyle = '#0e7490'; c.beginPath(); c.arc(-16, 0, 3.2, 0, 6.283); c.fill();
    c.fillStyle = 'rgba(125,211,252,0.55)';
    c.save(); c.rotate(wing ? -0.35 : 0.15);
    c.beginPath(); c.ellipse(-2, -8, 12, 4.5, -0.2, 0, 6.283); c.fill();
    c.beginPath(); c.ellipse(6, -7, 10, 4, 0.15, 0, 6.283); c.fill();
    c.restore();
    c.save(); c.rotate(wing ? 0.35 : -0.15);
    c.beginPath(); c.ellipse(-2, 8, 12, 4.5, 0.2, 0, 6.283); c.fill();
    c.beginPath(); c.ellipse(6, 7, 10, 4, -0.15, 0, 6.283); c.fill();
    c.restore();
    c.restore();
  }
  function paintFish(c, w, h) {
    c.save(); c.translate(w * 0.5, h * 0.5);
    c.beginPath(); c.ellipse(0, 0, 12, 6, 0, 0, 6.283);
    strokeFill(c, '#38bdf8', '#0e7490', 1.1);
    c.beginPath(); c.moveTo(-12, 0); c.lineTo(-20, -6); c.lineTo(-20, 6); c.closePath();
    strokeFill(c, '#0ea5e9', '#0e7490', 1);
    c.fillStyle = '#111'; c.beginPath(); c.arc(6, -1, 1.2, 0, 6.283); c.fill();
    c.restore();
  }

  const FROG_PADS = [
    { x: 0.80, y: 0.50 }, { x: 0.80, y: 0.64 }, { x: 0.70, y: 0.90 },
    { x: 0.42, y: 0.91 }, { x: 0.18, y: 0.87 }
  ];

  function lifeCast(kind) {
    life.kind = kind;
    life.actors = [];
    life.frog = null;
    life.flies = [];
    life.fish = null;
    life.ripples = [];
    life.react = 0; life.croak = 0; life.beatN = 0; life.beatLatch = false;
    life.seeded = true;
    if (kind === 'farm') {
      farmCast();
    } else if (kind === 'beach') {
      life.beach = { tide: 0.5, wet: 0.2, big: 0, mid: 0, fl: 0, gust: 0 };
      beachLoad();
    } else if (kind === 'fireworks') {
      fwReset();
      fwLoad();
    } else if (kind === 'ocean') {
      oceanCast();
    } else {
      life.frog = { mouth: 0, puff: 0, blink: 0, blinkIn: 0, nextBlink: 2.4, sway: 0, vocal: 0, avg: 0.12, lev: 0 };
      frog.notes = [];
      frogLoad();
      littleFrogCast();
      life.flies = [
        { nx: 0.28, ny: 0.16, ph: 0, sp: 0.08 },
        { nx: 0.62, ny: 0.20, ph: 2.1, sp: 0.07 }
      ];
      life.fish = { t: 3.5, x: 0.55, y: 0.92, hop: -1 };
    }
  }
  function lifeReset() {
    life.t = 0;
    life.day = 0;
    life.dayLock = null;
    life.seeded = false;
    life.actors = [];
    life.frog = null;
    life.little = null;
    life.ripples = [];
    life.kind = '';
    fwReset();
  }
  function lifeAdvance(dt, prog, beat, reduce) {
    if (!life.seeded) return;
    life.t += dt;
    if (life.react > 0) life.react = Math.max(0, life.react - dt);
    if (life.croak > 0) life.croak = Math.max(0, life.croak - dt);
    if (life.kind === 'farm') {
      farmAdvance(dt, prog, reduce);
    } else if (life.kind === 'beach') {
      beachAdvance(dt, reduce);
    } else if (life.kind === 'fireworks') {
      fwAdvance(dt, beat, reduce, prog);
    } else if (life.kind === 'ocean') {
      oceanAdvance(dt, reduce);
    } else if (life.frog) {
      const f = life.frog;
      let beatEdge = false;
      if (beat && beat.on && !life.beatLatch) { life.beatN++; life.beatLatch = true; beatEdge = true; }
      if (beat && !beat.on) life.beatLatch = false;
      littleFrogAdvance(dt, beat, reduce, beatEdge);
      if (life.singHold) {
        f.mouth = life.singHold.mouth != null ? life.singHold.mouth : f.mouth;
        f.puff = life.singHold.puff != null ? life.singHold.puff : f.puff;
        f.blink = life.singHold.blink != null ? life.singHold.blink : f.blink;
      } else if (reduce) {
        f.mouth *= Math.max(0, 1 - dt * 3);
        f.puff *= Math.max(0, 1 - dt * 3);
        f.blink = 0;
        f.sway = 0;
      } else {
        const v = frogVocal();
        f.vocal = v;
        f.mouth += (v - f.mouth) * Math.min(1, dt * 10);
        const pulse = (beat && beat.pulse) || 0;
        const wantPuff = Math.max(v * 0.85, pulse > 0.7 ? pulse : 0);
        f.puff += (wantPuff - f.puff) * Math.min(1, dt * 8);
        f.sway = Math.sin(life.t * (TRACKS[11] && TRACKS[11].bpm ? TRACKS[11].bpm / 60 : 2.12) * Math.PI * 2 * 0.5) * 0.035;
        f.nextBlink -= dt;
        if (f.blinkIn > 0) {
          f.blinkIn -= dt;
          const u = 1 - Math.max(0, f.blinkIn) / 0.12;
          f.blink = u < 0.5 ? u * 2 : (1 - u) * 2;
        } else if (f.nextBlink <= 0) {
          f.blinkIn = 0.12;
          f.nextBlink = 2.8 + Math.random() * 2.4;
          f.blink = 0;
        } else f.blink = 0;
        if (v > 0.55 && frog.notes.length < 6 && Math.random() < dt * 2.4) {
          frog.notes.push({ x: 0.42 + Math.random() * 0.08, y: 0.48, t: 0, s: 0.7 + Math.random() * 0.5, rot: (Math.random() - 0.5) * 0.4 });
        }
      }
      if (life.react > 0) { f.puff = Math.max(f.puff, 0.7); life.croak = Math.max(life.croak, life.react); }
      frog.notes.forEach(n => { n.t += dt; n.y -= dt * 0.06; n.x += Math.sin(n.t * 3) * dt * 0.015; });
      frog.notes = frog.notes.filter(n => n.t < 1.6);
      life.flies.forEach((d, i) => {
        d.ph += dt * d.sp;
        d.nx = 0.25 + i * 0.32 + Math.sin(d.ph) * 0.16;
        d.ny = 0.14 + Math.cos(d.ph * 0.8 + i) * 0.06;
      });
      if (life.fish) {
        if (life.fish.hop >= 0) {
          life.fish.hop += dt;
          if (life.fish.hop > 0.7) life.fish.hop = -1;
        } else {
          life.fish.t -= dt;
          if (life.fish.t <= 0 && !reduce) {
            life.fish.hop = 0;
            life.fish.x = 0.3 + Math.random() * 0.5;
            life.fish.y = 0.86 + Math.random() * 0.08;
            life.fish.t = 4 + Math.random() * 4;
            life.ripples.push({ nx: life.fish.x, ny: life.fish.y, t: 0, max: 0.9, big: false });
          }
        }
      }
      // ambient pond ripples
      if (!reduce && Math.random() < dt * 0.7) {
        life.ripples.push({ nx: 0.2 + Math.random() * 0.65, ny: 0.55 + Math.random() * 0.4, t: 0, max: 1.4, big: false });
      }
      for (let i = life.ripples.length - 1; i >= 0; i--) {
        life.ripples[i].t += dt;
        if (life.ripples[i].t >= life.ripples[i].max) life.ripples.splice(i, 1);
      }
    }
  }
  // 1.9.177 Farmyard: the animals already painted in tetris-bg/6.webp are cut out (u2net masks),
  // the painting behind them is filled in (farm-plate), and each animal is drawn back on its own
  // spot with gentle motion (breathing, head bobs, pecking, tail swish), sun-side rim light,
  // soft ground shadows and a little depth parallax. The day starts in darkness; the painted sun
  // peeks just over the open hills at the start and the light reaches each animal, which then wakes up.
  function farmLoad() {
    if (farm.img || !root.Image) return;
    farm.img = {};
    try { if (ac) loadRooster(); } catch (e) { }
    let left = 4;
    Object.keys(FARM_ART).forEach(k => {
      const im = new root.Image();
      im.onload = () => { if (--left === 0) { farm.ready = true; farmSprites(); } };
      im.src = FARM_ART[k];
      farm.img[k] = im;
    });
    if (!farm.listen && root.addEventListener) {
      farm.listen = true;
      // Tilt only if the phone already sends orientation (no permission prompt is asked for).
      root.addEventListener('deviceorientation', e => {
        if (e.gamma == null) return;
        farm.tilt.gx = Math.max(-1, Math.min(1, e.gamma / 25));
        farm.tilt.gy = Math.max(-1, Math.min(1, ((e.beta || 50) - 50) / 25));
        farm.tilt.at = life.t;
      });
    }
  }
  function farmSprites() {
    Object.keys(FARM_RIG).forEach(k => {
      const a = FARM_RIG[k].a;
      const cv = doc.createElement('canvas');
      cv.width = a[2]; cv.height = a[3];
      cv.getContext('2d').drawImage(farm.img.atlas, a[0], a[1], a[2], a[3], 0, 0, a[2], a[3]);
      farm.spr[k] = cv;
    });
  }
  function farmCast() {
    farm.st = {};
    farm.crowed = false;
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    Object.keys(FARM_RIG).forEach((k, i) => {
      farm.st[k] = { awake: 0, br: rnd() * 6.28, beh: '', bt: 0, bdur: 0, next: 0.6 + rnd() * 2.5, hy: 0, ty: 0, dx: 0, dxT: 0, dz: 0, dzT: 0, hop: 0, rot: 0, crow: 0, ph: rnd() * 6.28 };
    });
    farm.stars = [];
    for (let i = 0; i < 46; i++) {
      const x = 6 + rnd() * 528;
      const hz = FARM_HZ[Math.min(FARM_HZ.length - 1, Math.round(x / 6))];
      farm.stars.push({ x: x, y: 6 + rnd() * Math.max(10, hz - 26), r: 0.5 + rnd() * 1.1, ph: rnd() * 6.28, sp: 0.6 + rnd() * 1.6 });
    }
  }
  // 1.9.185: sunrise is much quicker — full daylight about 40% of the way through
  // level 1, while still starting in darkness. A slow time term is only a gentle assist.
  function farmDayTarget(prog, t) { return Math.max(0, Math.min(1, (prog || 0) / 0.4 + (t || 0) / 800)); }
  function smooth01(v) { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }
  // 1.9.190: t tracks day directly so the peek is visible at t=0 (no 0.16 delay).
  function farmSunPos(day) {
    const t = Math.max(0, Math.min(1, day || 0));
    const e = t * (0.75 + 0.25 * t);
    return { x: FARM_SUN.x0 + (FARM_SUN.cx - FARM_SUN.x0) * e, y: FARM_SUN.y0 + (FARM_SUN.cy - FARM_SUN.y0) * e, alt: e, t: t };
  }
  function farmFront(day) { return 0.22 + smooth01((day - 0.28) / 0.55) * 0.86; }
  function farmAdvance(dt, prog, reduce) {
    if (life.dayLock != null) life.day = life.dayLock;
    else {
      const tgt = farmDayTarget(prog, life.t);
      life.day = (life.day || 0) + (tgt - (life.day || 0)) * Math.min(1, dt * 0.6);
    }
    const day = life.day, front = farmFront(day);
    // smooth tilt: phone orientation if it is arriving, otherwise a slow drift
    const T = farm.tilt, live = life.t - T.at < 1.5;
    const wx = reduce ? 0 : live ? T.gx : Math.sin(life.t * 0.23) * 0.6;
    const wy = reduce ? 0 : live ? T.gy : Math.sin(life.t * 0.17 + 1) * 0.4;
    T.x += (wx - T.x) * Math.min(1, dt * 2.5); T.y += (wy - T.y) * Math.min(1, dt * 2.5);
    if (!farm.crowed && farmSunPos(day).alt >= 0.98) { farm.crowed = true; if (farm.st.rooster) farm.st.rooster.crow = 1.8; playRoosterSfx(); }
    Object.keys(FARM_RIG).forEach(k => {
      const R = FARM_RIG[k], S = farm.st[k];
      if (!S) return;
      const footN = (R.a[5] + R.a[6]) / PHOTO_H;
      if (day > 0.3 && front >= footN) S.awake = Math.min(1, S.awake + dt / 1.6);
      if (reduce) { S.hy = 0; S.ty = 0; S.hop = 0; S.rot = 0; return; }
      S.br += dt * (1.3 + S.awake * 1.1);
      S.ph += dt;
      let hy = (1 - S.awake) * (R.kind === 'pecker' ? 0 : 4); // sleepy head drop
      const side = R.head && R.head.tip < R.head.neck ? -1 : 1;
      let hop = 0, rot = 0;
      if (S.awake >= 1) {
        S.next -= dt;
        if (!S.beh && S.next <= 0) {
          const list = FARM_BEH[R.kind];
          S.beh = list[(Math.random() * list.length) | 0];
          S.bt = 0;
          S.bdur = { graze: 2.6, snuffle: 1.8, look: 1.5, nod: 1.1, peck: 0.9, hop: 0.5, shuffle: 0.9 }[S.beh] || 1;
          if (S.beh === 'shuffle') { S.dxT = (Math.random() * 2 - 1) * 2.6; S.dzT = (Math.random() * 2 - 1) * 0.018; }
        }
        if (S.beh) {
          S.bt += dt;
          const u = Math.min(1, S.bt / S.bdur), bell = Math.sin(Math.PI * u);
          if (S.beh === 'graze') hy += 5.5 * smooth01(Math.min(1, u * 4)) * smooth01(Math.min(1, (1 - u) * 4)) + Math.sin(S.bt * 11) * 0.9 * bell;
          else if (S.beh === 'snuffle') hy += Math.sin(S.bt * 16) * 1.8 * bell + 2.4 * bell;
          else if (S.beh === 'look') { hy -= 5 * bell; rot -= side * 0.025 * bell; }
          else if (S.beh === 'nod') hy += Math.sin(u * Math.PI * 4) * 3.2 * bell;
          else if (S.beh === 'peck') { const q = Math.abs(Math.sin(u * Math.PI * 2)); hy += (R.kind === 'pecker' ? -6 : 6) * q; rot += side * (R.kind === 'pecker' ? -0.05 : 0.12) * q; }
          else if (S.beh === 'hop') { hop -= 5 * bell; rot += Math.sin(u * Math.PI * 2) * 0.08; }
          else if (S.beh === 'shuffle') { hop -= Math.abs(Math.sin(u * Math.PI * 3)) * 1.6; rot += Math.sin(u * Math.PI * 3) * 0.02; }
          if (u >= 1) { S.beh = ''; S.next = 1.2 + Math.random() * 3.2; }
        }
      }
      if (S.crow > 0) {
        S.crow = Math.max(0, S.crow - dt);
        const c = Math.sin(Math.PI * Math.min(1, (1.8 - S.crow) / 1.8));
        hy -= 7 * c; rot -= side * 0.06 * c; S.dz = 0.04 * c;
      }
      if (life.react > 0 && S.awake > 0.5) {
        const r = Math.sin((0.45 - Math.min(0.45, life.react)) / 0.45 * Math.PI);
        if (R.kind === 'hen' || R.kind === 'pecker' || R.kind === 'chick' || k === 'sheep') hop -= (k === 'sheep' ? 5 : 6) * r;
        else hy -= 5 * r;
        if (R.kind === 'rooster') hy -= 2 * r;
      }
      S.dx += (S.dxT - S.dx) * Math.min(1, dt * 3);
      if (S.crow <= 0) S.dz += (S.dzT - S.dz) * Math.min(1, dt * 3);
      S.hy = hy; S.hop = hop; S.rot = rot;
      S.ty = R.tail ? Math.sin(S.ph * (R.kind === 'rooster' ? 1.6 : 7)) * (R.kind === 'rooster' ? 2.2 : 2.4) * S.awake : 0;
    });
  }
  // Pre-lit copy of a sprite: round shading toward the sun, darker belly, warm rim on the sun side.
  function farmLit(k, ang, L) {
    const ab = Math.round(ang / (Math.PI / 8)) & 15, lb = Math.round(L * 5);
    const key = k + ':' + ab + ':' + lb;
    const had = farm.lit[k];
    if (had && had.key === key) return had.cv;
    const src = farm.spr[k], w = src.width, h = src.height;
    const cv = doc.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    c.drawImage(src, 0, 0);
    const a = ab * Math.PI / 8, ux = Math.cos(a), uy = Math.sin(a), Lq = lb / 5;
    if (Lq > 0) {
      c.globalCompositeOperation = 'source-atop';
      const R = Math.max(w, h) * 0.75;
      const gx = w / 2 + ux * w * 0.28, gy = h * 0.42 + uy * h * 0.28;
      const rg = c.createRadialGradient(gx, gy, 2, gx, gy, R);
      rg.addColorStop(0, 'rgba(255,238,205,' + (0.32 * Lq) + ')');
      rg.addColorStop(0.45, 'rgba(255,236,200,0)');
      rg.addColorStop(1, 'rgba(24,14,40,' + (0.46 * Lq) + ')');
      c.fillStyle = rg; c.fillRect(0, 0, w, h);
      const lg = c.createLinearGradient(0, h * 0.5, 0, h);
      lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(20,10,0,' + (0.22 * Lq) + ')');
      c.fillStyle = lg; c.fillRect(0, 0, w, h);
      // rim: the sprite's edge facing the sun
      const rc = doc.createElement('canvas'); rc.width = w; rc.height = h;
      const r = rc.getContext('2d');
      r.drawImage(src, 0, 0);
      r.globalCompositeOperation = 'source-in';
      r.fillStyle = 'rgb(255,214,150)'; r.fillRect(0, 0, w, h);
      r.globalCompositeOperation = 'destination-out';
      r.drawImage(src, -ux * 2.6, -uy * 2.6);
      c.globalCompositeOperation = 'source-atop';
      c.globalAlpha = 0.9 * Lq;
      c.drawImage(rc, 0, 0);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }
    farm.lit[k] = { key: key, cv: cv }; // one cached lighting per animal
    return cv;
  }
  function headW(part, x) {
    const v = (x - part.neck) / (part.tip - part.neck);
    return smooth01(v);
  }
  // Draw one animal with its head/tail columns bent by a smooth vertical warp (no gaps).
  function farmDrawRig(c, k, img, S) {
    const R = FARM_RIG[k], w = R.a[2], h = R.a[3], foot = R.a[6];
    const parts = [];
    if (R.head) parts.push({ p: R.head, dy: S.hy });
    if (R.tail) parts.push({ p: R.tail, dy: S.ty });
    const ranges = parts.map(o => [Math.min(o.p.tip, o.p.neck), Math.max(o.p.tip, o.p.neck)]);
    // body columns
    let x = 0;
    const segs = ranges.slice().sort((a, b) => a[0] - b[0]);
    segs.forEach(r => { if (r[0] > x) c.drawImage(img, x, 0, r[0] - x, h, x, 0, r[0] - x + 0.6, h); x = Math.max(x, r[1]); });
    if (x < w) c.drawImage(img, x, 0, w - x, h, x - 0.3, 0, w - x + 0.3, h);
    parts.forEach((o, i) => {
      const r = ranges[i], yA = Math.round(o.p.yA * h), yB = Math.round(o.p.yB * h);
      if (yB < h) c.drawImage(img, r[0], yB, r[1] - r[0], h - yB, r[0], yB - 0.3, r[1] - r[0], h - yB + 0.3);
      for (let cx = r[0]; cx < r[1]; cx += 2) {
        const cw = Math.min(2, r[1] - cx);
        const dy = o.dy * headW(o.p, cx + cw / 2);
        if (yA > 0) c.drawImage(img, cx, 0, cw, yA, cx, dy, cw + 0.6, yA + 0.4);
        if (yB > yA) c.drawImage(img, cx, yA, cw, yB - yA, cx, yA + dy, cw + 0.6, yB - yA - dy + 0.4);
      }
    });
  }
  function farmSkyClip(c, ox, oy, box) {
    c.beginPath();
    c.moveTo(box.left + ox, box.top + oy - 4);
    for (let i = 0; i < FARM_HZ.length; i++) c.lineTo(box.left + ox + i * 6 * box.scale, box.top + oy + (FARM_HZ[i] - 2) * box.scale);
    c.lineTo(box.left + ox + PHOTO_W * box.scale, box.top + oy - 4);
    c.closePath();
    c.clip();
  }
  function lerpKeys(keys, v) {
    for (let i = 1; i < keys.length; i++) if (v <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i], u = (v - a[0]) / (b[0] - a[0] || 1);
      return a[1].map((x, j) => x + (b[1][j] - x) * u);
    }
    return keys[keys.length - 1][1];
  }
  const FARM_SKY = [
    [0, [30, 40, 92, 0.8]], [0.2, [44, 50, 112, 0.72]], [0.38, [122, 82, 152, 0.46]],
    [0.58, [255, 166, 112, 0.18]], [0.8, [255, 222, 186, 0.05]], [1, [255, 255, 255, 0]]
  ];
  function drawSun(c, box, ox, oy, day) {
    const sp = farmSunPos(day);
    const sx = box.left + ox + sp.x * box.scale, sy = box.top + oy + sp.y * box.scale;
    const glow = Math.max(0.28, Math.sin(Math.PI * Math.max(0, Math.min(1, (day - 0.12) / 0.75))));
    c.save();
    farmSkyClip(c, ox, oy, box);
    c.globalCompositeOperation = 'lighter';
    if (glow > 0.01) {
      const rg = c.createRadialGradient(sx, sy, 4, sx, sy, 230 * box.scale);
      rg.addColorStop(0, 'rgba(255,190,110,' + (0.55 * glow) + ')');
      rg.addColorStop(0.4, 'rgba(255,120,70,' + (0.22 * glow) + ')');
      rg.addColorStop(1, 'rgba(120,40,80,0)');
      c.fillStyle = rg; c.fillRect(sx - 240 * box.scale, sy - 240 * box.scale, 480 * box.scale, 480 * box.scale);
    }
    c.globalCompositeOperation = 'source-over';
    const sw = FARM_SUN.w * box.scale, sh = FARM_SUN.h * box.scale;
    c.globalAlpha = Math.min(1, 0.78 + day * 0.22);
    c.drawImage(farm.img.sun, sx - (FARM_SUN.cx - FARM_SUN.x) * box.scale, sy - (FARM_SUN.cy - FARM_SUN.y) * box.scale, sw, sh);
    c.globalAlpha = 1;
    if (sp.alt < 0.85) { // low sun is redder
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = 'rgba(255,' + Math.round(130 + 125 * sp.alt) + ',' + Math.round(70 + 185 * sp.alt) + ',' + (0.9 * (1 - sp.alt / 0.85)) + ')';
      c.beginPath(); c.arc(sx, sy, 72 * box.scale, 0, 6.283); c.fill();
      c.globalCompositeOperation = 'source-over';
    }
    c.restore();
    return { x: sp.x, y: sp.y, alt: sp.alt, glow: glow };
  }
  function drawFarmScene(c, w, h, reduce) {
    farmLoad();
    if (!farm.ready) { // keep the start dark while the cut-outs load
      c.fillStyle = 'rgba(4,6,18,' + (0.9 * (1 - (life.day || 0))) + ')'; c.fillRect(0, 0, w, h);
      return;
    }
    if (!farm.st.cow) farmCast();
    const box = photoBox();
    const day = life.day || 0, T = farm.tilt;
    // 3D: whole painting drifts a touch, the land a little more, animals more again by depth.
    const zoom = reduce ? 1 : 1.03;
    const bw = box.dw * zoom, bh = box.dh * zoom;
    const B = { left: box.left - (bw - box.dw) / 2, top: box.top - (bh - box.dh) / 2, dw: bw, dh: bh, scale: box.scale * zoom };
    const bx = T.x * 5, by = T.y * 4, lx = bx + T.x * 1.6, ly = by + T.y * 1.2;
    c.drawImage(farm.img.plate, B.left + bx, B.top + by, bw, bh);
    c.drawImage(farm.img.land, B.left + lx, B.top + ly, bw, bh);
    // where the light comes from (photo px)
    const sp = farmSunPos(day), L = smooth01((day - 0.3) / 0.45);
    const order = Object.keys(FARM_RIG).sort((a, b) => (FARM_RIG[a].a[5] + FARM_RIG[a].a[6]) - (FARM_RIG[b].a[5] + FARM_RIG[b].a[6]));
    // soft ground shadows, cast away from the sun
    if (L > 0.02) order.forEach(k => {
      const R = FARM_RIG[k], S = farm.st[k];
      const fx = R.a[4] + R.a[2] / 2, fy = R.a[5] + R.a[6];
      const depth = (fy / PHOTO_H - 0.5) / 0.45;
      const ax = lx + T.x * 1.6 * depth, ay = ly + T.y * 1.2 * depth;
      const dxs = fx - sp.x, len = (1.15 - sp.alt) * 0.35 + 0.08;
      const sx = B.left + ax + (fx + S.dx + Math.sign(dxs) * R.a[2] * len * 0.5) * B.scale, sy = B.top + ay + (fy - 1) * B.scale;
      const rw = R.a[2] * (0.42 + len * 0.4) * B.scale, rh = R.a[2] * 0.08 * B.scale + 2;
      const lift = Math.max(0, -S.hop) / 6;
      c.save();
      c.translate(sx, sy); c.scale(1, rh / rw);
      const rg = c.createRadialGradient(0, 0, 1, 0, 0, rw);
      rg.addColorStop(0, 'rgba(30,20,8,' + (0.32 * L * (1 - lift * 0.5)) + ')');
      rg.addColorStop(1, 'rgba(30,20,8,0)');
      c.fillStyle = rg; c.beginPath(); c.arc(0, 0, rw, 0, 6.283); c.fill();
      c.restore();
    });
    order.forEach(k => {
      const R = FARM_RIG[k], S = farm.st[k];
      const fx = R.a[4] + R.a[2] / 2, fy = R.a[5] + R.a[6];
      const depth = (fy / PHOTO_H - 0.5) / 0.45;
      const ax = lx + T.x * 1.6 * depth, ay = ly + T.y * 1.2 * depth;
      const ang = Math.atan2(sp.y - (R.a[5] + R.a[3] / 2), sp.x - fx);
      const img = farmLit(k, (ang + 6.283) % 6.283, L);
      const br = Math.sin(S.br) * (0.006 + 0.008 * (1 - S.awake));
      c.save();
      c.translate(B.left + ax + (R.a[4] + S.dx) * B.scale, B.top + ay + (R.a[5] + S.hop) * B.scale);
      c.scale(B.scale, B.scale);
      const ox = R.a[2] / 2, oy = R.a[6];
      c.translate(ox, oy);
      c.scale((1 + S.dz) * (1 - br * 0.4), (1 + S.dz) * (1 + br));
      if (S.rot) c.rotate(S.rot);
      c.translate(-ox, -oy);
      farmDrawRig(c, k, img, S);
      c.restore();
    });
    // night: cool tint + darkness that lifts from the horizon down as the sun rises
    const k = lerpKeys(FARM_SKY, day);
    if (day < 0.999) {
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = 'rgb(' + Math.round(k[0]) + ',' + Math.round(k[1]) + ',' + Math.round(k[2]) + ')';
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'source-over';
    }
    const front = farmFront(day), d = k[3];
    const fy0 = B.top + by + (front - 0.2) * bh, fy1 = B.top + by + (front + 0.12) * bh;
    const veil = (v) => 1 - (1 - Math.min(0.93, v)) * (1 - 0.28);
    const lg = c.createLinearGradient(0, Math.min(fy0, h), 0, Math.max(fy1, fy0 + 1));
    lg.addColorStop(0, 'rgba(4,6,18,' + veil(d * 0.55) + ')');
    lg.addColorStop(1, 'rgba(4,6,18,' + veil(d * 1.18) + ')');
    c.fillStyle = lg; c.fillRect(0, 0, w, h);
    // stars fade as the sky lightens
    const sa = 1 - smooth01(day / 0.36);
    if (sa > 0.01) {
      c.save();
      farmSkyClip(c, bx, by, B);
      farm.stars.forEach(s => {
        const tw = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(life.t * s.sp + s.ph);
        c.fillStyle = 'rgba(235,240,255,' + (sa * tw * 0.85) + ')';
        c.beginPath(); c.arc(B.left + bx + s.x * B.scale, B.top + by + s.y * B.scale, s.r * 1.1, 0, 6.283); c.fill();
      });
      c.restore();
    }
    drawSun(c, B, bx, by, day);
  }
  function lifeFastForward(seconds, prog) {
    const kind = isEffect(lookIdx < 0 ? themeIdx : themeFor((g && g.level) || 1));
    if (!kind) return;
    lifeReset();
    lifeCast(kind);
    if (kind === 'farm') life.dayLock = farmDayTarget(prog, seconds);
    const step = 1 / 30;
    const beat = { on: false };
    let acc = 0, n = 0;
    const period = (TRACKS[kind === 'farm' ? 6 : 11].bpm) ? 60 / TRACKS[kind === 'farm' ? 6 : 11].bpm : 0.4;
    for (let u = 0; u < seconds; u += step) {
      acc += step;
      const on = (acc % period) < 0.05;
      lifeAdvance(step, prog, { on: on }, false);
      n++;
    }
    life.dayLock = null;
  }
  function lifeReact() { life.react = 0.45; }

  function frogLoad() {
    if (frog.img || !root.Image) return;
    frog.img = {};
    let left = Object.keys(FROG_ART).length;
    Object.keys(FROG_ART).forEach(k => {
      const im = new root.Image();
      im.onload = () => { if (--left === 0) { frog.ready = true; frogSprites(); } };
      im.onerror = () => { if (--left === 0) { frog.ready = !!frog.img.plate; frogSprites(); } };
      im.src = FROG_ART[k];
      frog.img[k] = im;
    });
  }
  function frogSprites() {
    if (!frog.img || !frog.img.atlas || !doc.createElement) return;
    const M = FROG_META, w = M.fw, h = M.fh;
    frog.spr = [0, 1, 2].map(i => {
      const cv = doc.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(frog.img.atlas, i * w, 0, w, h, 0, 0, w, h);
      return cv;
    });
  }
  function frogVocal() {
    if (!bgmAnalyser || !ac || !musicOn || !bgmNode) {
      const b = musicBeat(11);
      return b ? Math.max(0, b.pulse) * 0.75 : 0;
    }
    const n = bgmAnalyser.frequencyBinCount;
    if (!bgmBins || bgmBins.length !== n) bgmBins = new Uint8Array(n);
    bgmAnalyser.getByteFrequencyData(bgmBins);
    const binHz = (ac.sampleRate / 2) / n;
    let sum = 0, c = 0;
    for (let i = 0; i < n; i++) {
      const hz = i * binHz;
      if (hz >= 250 && hz <= 1800) { sum += bgmBins[i]; c++; }
    }
    const v = c ? sum / (c * 255) : 0;
    const f = life.frog;
    if (!f) return 0;
    f.avg = (f.avg || 0.12) * 0.985 + v * 0.015;
    f.lev = (f.lev || 0) * 0.65 + v * 0.35;
    return Math.max(0, Math.min(1, (f.lev - f.avg * 0.8) / 0.28));
  }
  function drawMusicNote(c, x, y, s, a, rot) {
    c.save();
    c.translate(x, y); c.rotate(rot || 0); c.globalAlpha = a;
    c.fillStyle = 'rgba(255, 236, 170, 0.95)';
    c.beginPath(); c.ellipse(0, 4 * s, 3.2 * s, 2.2 * s, -0.4, 0, 6.283); c.fill();
    c.strokeStyle = 'rgba(255, 236, 170, 0.95)'; c.lineWidth = 1.4 * s; c.lineCap = 'round';
    c.beginPath(); c.moveTo(2.8 * s, 4 * s); c.lineTo(2.8 * s, -8 * s); c.stroke();
    c.beginPath(); c.moveTo(2.8 * s, -8 * s); c.quadraticCurveTo(7 * s, -10 * s, 6 * s, -5 * s); c.stroke();
    c.restore();
  }

  function littleFrogCast() {
    const pads = FROG_LITTLE_PADS;
    life.little = FROG_LITTLE.map(function (meta, i) {
      const home = i === 0 ? 0 : 3;
      return {
        i: i, meta: meta, pad: home, from: home, to: home,
        hop: -1, hopDur: 0.48, squat: 0, land: 0, wait: 1.4 + i * 1.8,
        dir: i === 0 ? 1 : -1, x: meta.px, y: meta.py, sx: 1, sy: 1
      };
    });
  }
  function littleFrogPose(d, p) {
    const pads = FROG_LITTLE_PADS;
    const a = pads[d.from], b = pads[d.to];
    if (p < 0 || !a || !b) {
      const sit = pads[d.pad] || a || b;
      d.x = sit.x; d.y = sit.y; d.sx = 1; d.sy = 1;
      return;
    }
    const e = p * p * (3 - 2 * p);
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const amp = 36 + Math.min(70, dist * 0.35);
    d.x = a.x + dx * e;
    d.y = a.y + dy * e - amp * 4 * p * (1 - p);
    if (dx) d.dir = dx >= 0 ? 1 : -1;
    const mid = 4 * p * (1 - p);
    d.sx = 1 - 0.12 * mid;
    d.sy = 1 + 0.22 * mid;
  }
  function littleFrogAdvance(dt, beat, reduce, beatEdge) {
    if (!life.little || life.littleHold) return;
    const pads = FROG_LITTLE_PADS;
    for (let i = 0; i < life.little.length; i++) {
      const d = life.little[i];
      if (reduce) {
        d.hop = -1; d.squat = 0; d.land = 0; d.pad = d.i === 0 ? 0 : 3;
        d.from = d.pad; d.to = d.pad;
        d.x = d.meta.px; d.y = d.meta.py; d.sx = 1; d.sy = 1;
        continue;
      }
      if (d.hop >= 0) {
        d.hop += dt;
        const p = Math.min(1, d.hop / d.hopDur);
        littleFrogPose(d, p);
        if (p >= 1) {
          d.pad = d.to; d.from = d.to; d.hop = -1; d.land = 0.16;
          d.x = pads[d.pad].x; d.y = pads[d.pad].y;
          d.sx = 1.14; d.sy = 0.82;
          life.ripples.push({ nx: d.x / PHOTO_W, ny: d.y / PHOTO_H, t: 0, max: 0.9, big: false });
          d.wait = 1.3 + Math.random() * 2.6;
        }
        continue;
      }
      if (d.land > 0) {
        d.land -= dt;
        const u = Math.max(0, d.land / 0.16);
        d.sx = 1 + 0.14 * u; d.sy = 1 - 0.18 * u;
        continue;
      }
      d.sx = 1; d.sy = 1;
      d.x = pads[d.pad].x; d.y = pads[d.pad].y;
      if (d.squat > 0) {
        d.squat -= dt;
        const u = 1 - Math.max(0, d.squat) / 0.14;
        d.sx = 1 + 0.12 * Math.min(1, u * 1.2);
        d.sy = 1 - 0.16 * Math.min(1, u * 1.2);
        if (d.squat <= 0 && (beatEdge || d.wait <= -0.2)) {
          let to = d.pad;
          let guard = 0;
          while (to === d.pad && guard++ < 8) to = (Math.random() * pads.length) | 0;
          if (to === d.pad) to = (d.pad + 2) % pads.length;
          d.from = d.pad; d.to = to; d.hop = 0;
          d.hopDur = 0.42 + Math.random() * 0.12;
          if (pads[to].x !== pads[d.pad].x) d.dir = pads[to].x >= pads[d.pad].x ? 1 : -1;
        }
        continue;
      }
      d.wait -= dt;
      // Time a hop to the music's beat now and then, with a pause in between.
      if (d.wait <= 0 && beatEdge) d.squat = 0.14;
    }
  }
  function drawLittleFrogs(c, box, reduce) {
    if (!life.little || !frog.img || !frog.img.little || !frog.img.little.complete) return;
    const img = frog.img.little;
    // Back to front (smaller y first) so a frog closer to us sits over one further up the pond.
    const list = life.little.slice().sort(function (a, b) { return a.y - b.y; });
    for (let i = 0; i < list.length; i++) {
      const d = list[i], M = d.meta;
      const x = box.left + d.x * box.scale;
      const y = box.top + d.y * box.scale;
      const sc = box.scale;
      const dw = M.aw * sc, dh = M.ah * sc;
      // Contact shadow (3D sit); thinner and lighter mid-hop.
      const inAir = d.hop >= 0;
      const shS = inAir ? 0.45 : 1;
      c.save();
      c.translate(x, y);
      c.scale(1, 0.28);
      const rg = c.createRadialGradient(0, 0, 2, 0, 0, 28 * sc * shS);
      rg.addColorStop(0, 'rgba(10,20,8,' + (inAir ? 0.14 : 0.32) + ')');
      rg.addColorStop(1, 'rgba(10,20,8,0)');
      c.fillStyle = rg; c.beginPath(); c.arc(0, 0, 28 * sc * shS, 0, 6.283); c.fill();
      c.restore();
      c.save();
      c.translate(x, y);
      c.scale((d.dir < 0 ? -1 : 1) * (d.sx || 1), (d.sy || 1));
      c.drawImage(img, M.ax, M.ay, M.aw, M.ah, -M.ox * sc, -M.oy * sc, dw, dh);
      // Soft sun-side highlight and a little body shade (the sprite already has painted 3D form).
      c.globalCompositeOperation = 'lighter';
      const lg = c.createRadialGradient(-M.ox * sc + dw * 0.7, -M.oy * sc + dh * 0.18, 2, -M.ox * sc + dw * 0.4, -M.oy * sc + dh * 0.45, dw * 0.7);
      lg.addColorStop(0, 'rgba(255, 220, 160, 0.16)');
      lg.addColorStop(1, 'rgba(255, 220, 160, 0)');
      c.fillStyle = lg;
      c.beginPath(); c.ellipse(-M.ox * sc + dw * 0.55, -M.oy * sc + dh * 0.4, dw * 0.42, dh * 0.38, 0, 0, 6.283); c.fill();
      c.restore();
    }
  }
  // Painted frog + inpainted plate, drawn behind the board so the singer shows through empty cells.
  function drawFrogScene(c, w, h, reduce) {
    frogLoad();
    if (!frog.ready || !frog.img || !frog.img.plate) return;
    if (!frog.spr.length) frogSprites();
    const box = photoBox();
    const M = FROG_META;
    // Plate covers the original photo (frog removed) in the same center/cover box.
    c.drawImage(frog.img.plate, box.left, box.top, box.dw, box.dh);
    // Match the 28% CSS veil so the frog and the pond share the same look.
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(box.left, box.top, box.dw, box.dh);
    // Little painted frogs hop behind the singer (further up the pond).
    drawLittleFrogs(c, box, reduce);
    const f = life.frog;
    const mouth = f ? Math.max(0, Math.min(1, f.mouth)) : 0;
    const puff = f ? Math.max(0, Math.min(1, f.puff)) : 0;
    const blink = f ? Math.max(0, Math.min(1, f.blink)) : 0;
    const sway = (f && !reduce) ? (f.sway || 0) : 0;
    // Soft contact shadow on the lily pad (3D sit).
    const footX = box.left + (M.x + M.foot.x) * box.scale;
    const footY = box.top + (M.y + M.foot.y) * box.scale;
    c.save();
    c.translate(footX + sway * 10 * box.scale, footY);
    c.scale(1, 0.28);
    const sh = c.createRadialGradient(0, 0, 4, 0, 0, 90 * box.scale);
    sh.addColorStop(0, 'rgba(10,20,8,0.35)');
    sh.addColorStop(1, 'rgba(10,20,8,0)');
    c.fillStyle = sh; c.beginPath(); c.arc(0, 0, 90 * box.scale, 0, 6.283); c.fill();
    c.restore();
    // Sprite: blend adjacent mouth frames (closed / half / open).
    const x = mouth * 2, i0 = Math.max(0, Math.min(1, x | 0)), t = x - i0, i1 = Math.min(2, i0 + 1);
    const dx = box.left + M.x * box.scale, dy = box.top + M.y * box.scale;
    const dw = M.w * box.scale, dh = M.h * box.scale;
    const ox = M.foot.x * box.scale, oy = M.foot.y * box.scale;
    c.save();
    c.translate(dx + ox, dy + oy);
    c.rotate(sway);
    const puffS = 1 + puff * 0.045;
    c.scale(puffS * 1.015, (2 - puffS) * 0.985 + puff * 0.02); // slight body swell, gentle parallax scale
    c.translate(-ox, -oy);
    const a0 = frog.spr[i0], a1 = frog.spr[i1];
    if (a0) c.drawImage(a0, 0, 0, dw, dh);
    if (a1 && t > 0.02 && a1 !== a0) { c.globalAlpha = t; c.drawImage(a1, 0, 0, dw, dh); c.globalAlpha = 1; }
    // Sun-side rim light (sun is upper-right in the painting).
    if (a0) {
      c.save();
      c.globalCompositeOperation = 'source-atop';
      const rg = c.createRadialGradient(dw * 0.72, dh * 0.18, 4, dw * 0.5, dh * 0.45, dw * 0.85);
      rg.addColorStop(0, 'rgba(255, 214, 150, 0.22)');
      rg.addColorStop(0.55, 'rgba(255, 214, 150, 0)');
      rg.addColorStop(1, 'rgba(20, 10, 0, 0.12)');
      c.fillStyle = rg; c.fillRect(0, 0, dw, dh);
      c.restore();
    }
    // Throat glow on strong beats / singing.
    if (puff > 0.08) {
      const tx = M.throat.x * box.scale, ty = M.throat.y * box.scale;
      const gg = c.createRadialGradient(tx, ty, 2, tx, ty, 36 * box.scale * (0.8 + puff));
      gg.addColorStop(0, 'rgba(255, 230, 140,' + (0.32 * puff) + ')');
      gg.addColorStop(1, 'rgba(255, 230, 140, 0)');
      c.fillStyle = gg; c.beginPath(); c.arc(tx, ty, 36 * box.scale * (0.8 + puff), 0, 6.283); c.fill();
    }
    // Eyelids
    if (blink > 0.04) {
      M.eyes.forEach(e => {
        const ex = e.x * box.scale, ey = e.y * box.scale, r = e.r * box.scale;
        c.fillStyle = 'rgba(70, 120, 40, 0.92)';
        c.beginPath();
        c.ellipse(ex, ey - r * (1 - blink) * 0.15, r * 1.05, r * blink * 1.05, 0, 0, 6.283);
        c.fill();
      });
    }
    c.restore();
    if (!reduce && frog.notes) frog.notes.forEach(n => {
      const a = Math.max(0, 1 - n.t / 1.6);
      const p = photoToScreen(n.x, n.y);
      drawMusicNote(c, p.x, p.y, n.s * Math.max(0.9, p.s), a, n.rot);
    });
  }
  let stormCv = null, stormCtx = null;
  function stormInit() {
    if (stormCv || !doc.body || !doc.createElement) return;
    const cv = doc.createElement('canvas');
    cv.className = 'fx-storm';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';
    doc.body.appendChild(cv);
    stormCv = cv; stormCtx = cv.getContext('2d');
  }
  function drawStorm() {
    const lu = g && g.levelUp;
    if (!lu) {
      if (stormCtx && stormCv) stormCtx.clearRect(0, 0, stormCv.width, stormCv.height);
      return;
    }
    stormInit();
    if (!stormCtx) return;
    const d = Math.min(2, root.devicePixelRatio || 1);
    const w = root.innerWidth, h = root.innerHeight;
    if (stormCv.width !== Math.round(w * d) || stormCv.height !== Math.round(h * d)) {
      stormCv.width = Math.round(w * d); stormCv.height = Math.round(h * d);
    }
    stormCtx.setTransform(d, 0, 0, d, 0, 0);
    stormCtx.clearRect(0, 0, w, h);
    const p = lu.hold ? (lu.at || 0) : Math.min(1, lu.t / lu.dur);
    const fade = p < 0.08 ? p / 0.08 : (p > 0.82 ? Math.max(0, (1 - p) / 0.18) : 1);
    if (lu.reduce) {
      // Calm: a soft blue glow only, no flash or crackling bolts.
      const el = doc.getElementById('board');
      if (el && el.getBoundingClientRect) {
        const r = el.getBoundingClientRect();
        const a = 0.12 * fade;
        const rg = stormCtx.createRadialGradient(r.left + r.width / 2, r.top + r.height / 2, 8, r.left + r.width / 2, r.top + r.height / 2, r.width);
        rg.addColorStop(0, 'rgba(180,220,255,' + a + ')');
        rg.addColorStop(1, 'rgba(180,220,255,0)');
        stormCtx.fillStyle = rg;
        stormCtx.fillRect(r.left - 20, r.top - 20, r.width + 40, r.height + 40);
      }
      return;
    }
    const flash = 0.25 * Math.max(0, 1 - p / 0.22);
    if (flash > 0.01) {
      stormCtx.fillStyle = 'rgba(200,230,255,' + (flash * fade) + ')';
      stormCtx.fillRect(0, 0, w, h);
    }
    const el = doc.getElementById('board');
    if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    stormCtx.save();
    stormCtx.translate(r.left, r.top);
    const sx = r.width / (board && board.width ? board.width : r.width);
    const sy = r.height / (board && board.height ? board.height : r.height);
    stormCtx.scale(sx, sy);
    drawLightningBolts(stormCtx, lu.bolts, p, fade, (lu.hold ? (lu.at || 0) * lu.dur : lu.t) / 1000);
    stormCtx.restore();
  }
  function drawHopFrog(c) {
    const f = life.frog; if (!f) return;
    const stretch = f.hop >= 0;
    const spr = lifeSprite('frog-' + (stretch ? 's' : 's0'), 80, 78, (ctx, w, h) => paintFrog(ctx, w, h, stretch));
    const squat = f.squat > 0 ? 1 - 0.12 * (f.squat / 0.18) : 1;
    const s = photoToScreen(f.nx, f.ny);
    const sc = Math.max(0.95, s.s) * 1.22;
    const w = spr.w * sc, h = spr.h * sc * squat;
    c.save();
    c.translate(s.x, s.y);
    c.scale(f.dir < 0 ? -1 : 1, 1);
    c.drawImage(spr.cv, -w * 0.5, -h, w, h);
    if (life.croak > 0) {
      c.fillStyle = 'rgba(220,255,180,' + (0.7 * life.croak / 0.45) + ')';
      c.beginPath(); c.arc(8, -h * 0.55, 10 + (0.45 - life.croak) * 18, 0, 6.283); c.fill();
    }
    c.restore();
  }
  function drawRipples(c) {
    const box = photoBox();
    life.ripples.forEach(rp => {
      const s = photoToScreen(rp.nx, rp.ny);
      const p = rp.t / rp.max;
      const radX = (18 + p * (rp.big ? 70 : 44)) * box.scale;
      const radY = radX * 0.38;
      c.strokeStyle = 'rgba(200,255,240,' + ((1 - p) * (rp.big ? 0.7 : 0.45)) + ')';
      c.lineWidth = rp.big ? 2.4 : 1.6;
      c.beginPath(); c.ellipse(s.x, s.y, radX, radY, 0, 0, 6.283); c.stroke();
    });
    // continuous shimmer bands on the pond
    const t = life.t;
    for (let i = 0; i < 5; i++) {
      const ny = 0.58 + i * 0.07 + Math.sin(t * 0.8 + i) * 0.01;
      const nx = 0.35 + Math.sin(t * 0.6 + i * 1.3) * 0.22;
      const s = photoToScreen(nx, ny);
      c.strokeStyle = 'rgba(255,255,255,' + (0.14 + 0.08 * Math.sin(t * 2 + i)) + ')';
      c.lineWidth = 1.2;
      c.beginPath();
      c.ellipse(s.x, s.y, 50 * box.scale, 8 * box.scale, 0, 0, 6.283);
      c.stroke();
    }
  }
  function drawFlies(c, reduce) {
    life.flies.forEach((d, i) => {
      const wing = reduce ? 0 : ((life.t * 20 + i) | 0) % 2;
      const spr = lifeSprite('dfly' + wing, 44, 28, (ctx, w, h) => paintDragonfly(ctx, w, h, wing));
      const s = photoToScreen(d.nx, d.ny);
      const sc = Math.max(0.9, s.s);
      c.drawImage(spr.cv, s.x - spr.w * sc / 2, s.y - spr.h * sc / 2, spr.w * sc, spr.h * sc);
    });
  }
  function drawFishJump(c) {
    const f = life.fish; if (!f || f.hop < 0) return;
    const p = f.hop / 0.7;
    const ny = f.y - 4 * 0.08 * p * (1 - p);
    const s = photoToScreen(f.x, ny);
    const spr = lifeSprite('fish', 40, 20, paintFish);
    const sc = Math.max(0.9, s.s);
    c.save(); c.translate(s.x, s.y); c.rotate(-0.8 + p * 1.6);
    c.drawImage(spr.cv, -spr.w * sc / 2, -spr.h * sc / 2, spr.w * sc, spr.h * sc);
    c.restore();
  }


  function beachLoad() {
    if (beach.img || !root.Image) return;
    beach.img = {};
    let left = 4;
    Object.keys(BEACH_ART).forEach(k => {
      const im = new root.Image();
      im.onload = () => { if (--left === 0) beach.ready = true; };
      im.onerror = () => { if (--left === 0) beach.ready = !!beach.img.plate; };
      im.src = BEACH_ART[k];
      beach.img[k] = im;
    });
  }
  function beachAdvance(dt, reduce) {
    const b = life.beach;
    if (!b) return;
    const t = life.t;
    if (life.beachHold) {
      if (life.beachHold.wave != null) b.tide = life.beachHold.wave;
      if (life.beachHold.big != null) b.big = life.beachHold.big;
      if (life.beachHold.mid != null) b.mid = life.beachHold.mid;
      if (life.beachHold.fl != null) b.fl = life.beachHold.fl;
      b.wet = Math.max(b.wet, b.tide * 0.7);
      return;
    }
    if (reduce) {
      b.tide = 0.5; b.wet = 0.25; b.big = 0; b.mid = 0; b.fl = 0; b.gust = 0;
      return;
    }
    // Slow, slightly irregular wash — about 8 seconds in and out, like a real beach.
    b.tide = 0.5 + 0.42 * Math.sin(t * Math.PI * 2 / 8) + 0.08 * Math.sin(t * Math.PI * 2 / 11.5);
    const wantWet = Math.max(0, (b.tide - 0.28) / 0.72);
    b.wet += (wantWet - b.wet) * Math.min(1, dt * (wantWet > b.wet ? 2.4 : 0.35));
    // Gusty wind: a slow lean plus faster flutter, a different mix on each tree.
    const gust = Math.sin(t * 0.65) * 0.62 + Math.sin(t * 1.27 + 1.1) * 0.28 + Math.sin(t * 0.21 + 0.4) * 0.2;
    b.gust = gust;
    b.big = gust * 0.046 + Math.sin(t * 2.15) * 0.01;
    b.mid = gust * 0.033 + Math.sin(t * 2.4 + 0.9) * 0.01;
    b.fl = gust * 0.018 + Math.sin(t * 1.7 + 0.3) * 0.008;
  }
  function beachPhoto(c, box, px, py, sx, sy, dw, dh, parx, pary) {
    c.drawImage(c._beachImg, px, py, sx, sy,
      box.left + (px + parx) * box.scale, box.top + (py + pary) * box.scale,
      dw * box.scale, dh * box.scale);
  }
  function drawBeachSprite(c, img, t, ang, box, parx, pary, flutter) {
    const sc = box.scale;
    const px = box.left + (t.px + parx) * sc;
    const py = box.top + (t.py + pary) * sc;
    c.save();
    c.translate(px, py);
    c.rotate(ang);
    const dw = t.w * sc, dh = t.h * sc;
    const ox = (t.x - t.px) * sc, oy = (t.y - t.py) * sc;
    if (flutter && t.crownY != null && t.crownY > t.y && t.crownY < t.y + t.h) {
      const split = t.crownY - t.y;
      // Trunk leans less; fronds flutter more, both still pivot at the base.
      c.drawImage(img, t.ax, t.ay + split, t.aw, t.ah - split, ox, oy + split * sc, dw, (t.h - split) * sc);
      c.rotate(flutter);
      c.drawImage(img, t.ax, t.ay, t.aw, split, ox, oy, dw, split * sc);
    } else {
      c.drawImage(img, t.ax, t.ay, t.aw, t.ah, ox, oy, dw, dh);
    }
    c.restore();
  }
  function drawBeachScene(c, w, h, reduce) {
    beachLoad();
    if (!beach.ready || !beach.img || !beach.img.plate || !beach.img.plate.complete) return;
    const box = photoBox();
    const M = BEACH_META, B = life.beach || { tide: 0.5, wet: 0.25, big: 0, mid: 0, fl: 0 };
    const t = life.t;
    const par = reduce ? 0 : Math.sin(t * 0.15) * 3.2;
    const pPlate = par * 0.25, pWater = par * 0.5, pMid = par * 0.75, pBig = par * 1.0, pFl = par * 1.3;
    const tide = B.tide;
    const ix = M.inland[0] * M.washPx * (tide - 0.5);
    const iy = M.inland[1] * M.washPx * (tide - 0.5);
    const sc = box.scale;

    // Plate (sky, headland, sand) — only once the art is ready, so 0.webp is not doubled.
    c.drawImage(beach.img.plate, 0, 0, PHOTO_W, PHOTO_H,
      box.left + pPlate * sc, box.top + pPlate * 0.15 * sc, PHOTO_W * sc, PHOTO_H * sc);

    // Wet sand left behind as the water recedes: a soft darkening along the wash.
    if (B.wet > 0.02) {
      c.save();
      c.beginPath();
      c.rect(box.left, box.top, PHOTO_W * sc, PHOTO_H * sc);
      c.clip();
      const foam = M.foamBox;
      const wx = box.left + (foam.x + ix * 0.4 + pWater) * sc;
      const wy = box.top + (foam.y + iy * 0.4 + pWater * 0.15) * sc;
      const g = c.createLinearGradient(wx, wy, wx + M.inland[0] * 70 * sc, wy + M.inland[1] * 70 * sc);
      const a = 0.16 * Math.min(1, B.wet);
      g.addColorStop(0, 'rgba(40,70,90,' + (a * 0.15) + ')');
      g.addColorStop(0.35, 'rgba(30,60,80,' + a + ')');
      g.addColorStop(1, 'rgba(30,60,80,0)');
      c.fillStyle = g;
      c.fillRect(box.left + (foam.x - 20) * sc, box.top + (foam.y - 20) * sc, (foam.w + 80) * sc, (foam.h + 80) * sc);
      c.restore();
    }

    // Sea surface, with a cheap strip shimmer (not a heavy displacement).
    const sea = M.sea;
    const sx = box.left + (sea.x + ix * 0.55 + pWater) * sc;
    const sy = box.top + (sea.y + iy * 0.55 + pWater * 0.15) * sc;
    const sw = sea.w * sc, sh = sea.h * sc;
    if (beach.img.water && beach.img.water.complete) {
      if (reduce) {
        c.drawImage(beach.img.water, 0, 0, sea.w, sea.h, sx, sy, sw, sh);
      } else {
        const strips = 14;
        const sh0 = sea.h / strips;
        for (let i = 0; i < strips; i++) {
          const wob = Math.sin(t * 1.35 + i * 0.55) * 1.15 * sc;
          const srcY = Math.round(i * sh0);
          const srcH = Math.max(1, Math.round((i === strips - 1 ? sea.h : (i + 1) * sh0) - srcY));
          c.drawImage(beach.img.water, 0, srcY, sea.w, srcH, sx + wob, sy + srcY * sc, sw, srcH * sc);
        }
        // Soft highlight sweeping along the sun path.
        const sunx = box.left + (M.sun[0] + pWater) * sc;
        const suny = box.top + (M.horizon + pWater * 0.15) * sc;
        const hg = c.createLinearGradient(sunx, suny, sunx, suny + 280 * sc);
        const tw = 0.07 + 0.05 * Math.sin(t * 1.1);
        hg.addColorStop(0, 'rgba(255,240,180,' + tw + ')');
        hg.addColorStop(0.55, 'rgba(255,230,160,' + (tw * 0.45) + ')');
        hg.addColorStop(1, 'rgba(255,230,160,0)');
        c.fillStyle = hg;
        c.fillRect(sunx - 18 * sc, suny, 36 * sc, 300 * sc);
      }
    }
    // Foam edge travels with the wash, a little further than the sea body.
    if (beach.img.foam && beach.img.foam.complete) {
      const fb = M.foamBox;
      const fx_ = box.left + (fb.x + ix + pWater) * sc;
      const fy_ = box.top + (fb.y + iy + pWater * 0.15) * sc;
      c.drawImage(beach.img.foam, 0, 0, fb.w, fb.h, fx_, fy_, fb.w * sc, fb.h * sc);
    }

    // Contact shadows (trunk bases, flower clump) — a gentle 3D sit.
    function trunkShadow(px, py, rx, ry, a) {
      c.save();
      c.translate(box.left + (px + pBig) * sc, box.top + (py + pBig * 0.15) * sc);
      c.scale(1, 0.45);
      c.beginPath();
      c.arc(0, 0, rx * sc, 0, Math.PI * 2);
      c.fillStyle = 'rgba(20,10,0,' + a + ')';
      c.fill();
      c.restore();
    }
    const atlas = beach.img.atlas;
    if (atlas && atlas.complete) {
      trunkShadow(M.trees.mid.px, M.trees.mid.py, 16, 8, 0.16);
      trunkShadow(M.trees.big.px + 6, M.trees.big.py, 22, 10, 0.2);
      // Mid palm (further back) then the big foreground palm, then the flowers.
      drawBeachSprite(c, atlas, M.trees.mid, B.mid, box, pMid, pMid * 0.15, 0);
      drawBeachSprite(c, atlas, M.trees.big, B.big * 0.7, box, pBig, pBig * 0.15, B.big * 0.55);
      drawBeachSprite(c, atlas, M.flowers, B.fl, box, pFl, pFl * 0.2, 0);
    }

    // Same 28% veil as the CSS photo, so the board stays readable.
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(box.left + pPlate * sc, box.top + pPlate * 0.15 * sc, PHOTO_W * sc, PHOTO_H * sc);
  }

  // 1.9.180 Level 4 Fireworks: black sky, 3D bursts of many sizes and colours, faint rainforest
  // silhouette along the bottom, lit briefly by each burst. Launches follow the 131 BPM pulse.
  // 1.9.194: the rainforest silhouette and any painted backdrop are gone. The sky is plain
  // black, fireworks only. Occasional major bursts (scale >= 200%, after growth reaches
  // 150%) fire a full-screen white flash, at most one every 8–12s. Existing booms stay.

  function fwLoad() {
    // 1.9.194: the silhouette is no longer drawn; mark ready without loading it.
    fw.sil = null;
    fw.ready = true;
    fw.loading = false;
  }
  function fwReset() {
    fw.rockets = []; fw.parts = []; fw.flashes = [];
    fw.lit = 0; fw.beatLatch = false; fw.beatN = 0; fw.posed = false;
    fw.skyFlash = null; fw.clock = 0; fw.skyFlashNext = null;
  }
  function fwPick() { return FW_COLS[(Math.random() * FW_COLS.length) | 0]; }
  function fwAddPart(p) {
    if (fw.parts.length >= FW_MAX_P) fw.parts.shift();
    fw.parts.push(p);
  }
  function fwFlash(x, y, z, col, scale) {
    const sc = Math.max(scale || 1, 0.4);
    const pow = 0.32 * sc * (z || 1);
    fw.flashes.push({ x: x, y: y, z: z || 1, r: col[0], g: col[1], b: col[2], t: 0, max: 0.55 + 0.12 * Math.min(2, sc), pow: pow, sc: sc });
    const k = Math.min(1, pow * 1.05);
    const s = fw.lit + k;
    if (s > 0.001) {
      fw.litR = (fw.litR * fw.lit + (col[0] / 255) * k) / s;
      fw.litG = (fw.litG * fw.lit + (col[1] / 255) * k) / s;
      fw.litB = (fw.litB * fw.lit + (col[2] / 255) * k) / s;
    }
    fw.lit = Math.min(1, fw.lit + k);
  }
  function fwSize(prog) {
    // 1.9.185: start around 20% and grow to about 275% by the end, easing so it keeps building.
    const p = prog == null ? (fw.prog || 0) : Math.max(0, Math.min(1, prog));
    const e = p * p * 0.62 + p * 0.38; // still rising at the end (no flatten-out)
    return 0.20 + 2.55 * e;
  }
  function fwBurst(x, y, z, typ, col, scale) {
    typ = typ || FW_KINDS[(Math.random() * FW_KINDS.length) | 0];
    col = col || fwPick();
    scale = scale || 1;
    z = z == null ? 0.55 + Math.random() * 0.9 : z;
    const base = typ === 'ring' ? 22 : typ === 'crackle' ? 16 : typ === 'willow' ? 30 : typ === 'chrys' ? 38 : 32;
    const body = Math.max(scale, 0.45);
    const n = Math.max(scale < 0.55 ? 14 : 8, Math.round(base * body * (0.75 + 0.4 * z)));
    const spd0 = (typ === 'ring' ? 150 : typ === 'willow' ? 130 : typ === 'chrys' ? 170 : typ === 'crackle' ? 120 : 160) * scale * (0.7 + 0.35 * z);
    const life0 = typ === 'willow' ? 1.35 : typ === 'chrys' ? 1.15 : typ === 'crackle' ? 0.85 : typ === 'ring' ? 0.9 : 0.95;
    const size0 = (typ === 'willow' ? 1.7 : typ === 'crackle' ? 1.8 : 2.2) * body * z;
    const tilt = (Math.random() - 0.5) * 0.55;
    for (let i = 0; i < n; i++) {
      let vx, vy, vz, spd;
      if (typ === 'ring') {
        const a = (i / n) * Math.PI * 2;
        spd = spd0 * (0.92 + Math.random() * 0.12);
        vx = Math.cos(a) * spd;
        vy = Math.sin(a) * Math.cos(tilt) * spd * 0.72;
        vz = Math.sin(a) * Math.sin(tilt) * 0.35;
      } else {
        const a = Math.random() * Math.PI * 2;
        const el = typ === 'willow' ? (-0.15 + Math.random() * 0.85) : (Math.acos(2 * Math.random() - 1) - Math.PI / 2);
        spd = spd0 * (0.55 + Math.random() * 0.55);
        const c = Math.cos(el);
        vx = Math.cos(a) * c * spd;
        vy = Math.sin(el) * spd;
        vz = Math.sin(a) * c * 0.4;
      }
      fwAddPart({
        typ: typ, x: x, y: y, z: z, vx: vx, vy: vy, vz: vz,
        life: 0, max: life0 * (0.75 + Math.random() * 0.4),
        size: size0 * (0.7 + Math.random() * 0.6),
        r: col[0], g: col[1], b: col[2],
        trail: typ === 'chrys' || typ === 'willow' ? 1 : typ === 'ring' ? 0.4 : 0.55,
        pop: typ === 'crackle' ? 0.22 + Math.random() * 0.18 : 0, popped: false
      });
    }
    fwFlash(x, y, z, col, scale);
    playFwSfx(scale, z);
    maybeFwSkyFlash(scale);
  }
  function fwLaunch(box, destX, destY, typ, col, scale, z, flight) {
    if (fw.rockets.length >= FW_MAX_R) { fwBurst(destX, destY, z, typ, col, scale); return; }
    const x0 = destX + (Math.random() - 0.5) * 30;
    const y0 = box.top + box.dh * (0.88 + Math.random() * 0.08);
    const T = flight || (0.55 + Math.random() * 0.28);
    fw.rockets.push({
      x: x0, y: y0, x0: x0, y0: y0, destX: destX, destY: destY, t: 0, max: T,
      typ: typ, col: col, scale: scale || 1, z: z || 1
    });
    playFwWhoosh();
  }
  function fwSkyPos(box, prefer) {
    const nx = prefer && prefer.x != null ? prefer.x : (0.12 + Math.random() * 0.76);
    const ny = prefer && prefer.y != null ? prefer.y : (0.10 + Math.random() * 0.38);
    return { x: box.left + nx * box.dw, y: box.top + ny * box.dh, nx: nx, ny: ny };
  }
  function fwOnBeat() {
    const box = photoBox();
    if (!box || !box.dw) return;
    const n = fw.beatN;
    const busy = fw.flashes.filter(function (f) { return f.t < 0.28; }).length;
    if (busy >= 5 && n % 2) return;
    const typ = FW_KINDS[n % FW_KINDS.length];
    const col = fwPick();
    const big = (n % 4 === 0);
    const grow = fwSize(fw.prog);
    const depth = 0.65 + 0.55 * Math.min(2.4, grow); // boom depth grows with the show
    const z = (big ? 1.05 + Math.random() * 0.4 : 0.5 + Math.random() * 0.95) * depth;
    const scale = (big ? 1.15 + Math.random() * 0.25 : 0.7 + Math.random() * 0.45) * grow;
    if (grow < 0.45 && busy >= 2 && n % 2) return;
    const pos = fwSkyPos(box, { x: 0.18 + ((n * 0.37) % 0.64), y: 0.12 + (n % 3) * 0.1 + Math.random() * 0.08 });
    // Burst on the pulse, and send a rocket that will burst a couple of beats later.
    fwBurst(pos.x, pos.y, z, typ, col, scale);
    if (!big && fw.parts.length > FW_MAX_P * 0.85) return;
    if (grow >= 0.55 && (n % 2 === 0 || big)) {
      const later = fwSkyPos(box);
      fwLaunch(box, later.x, later.y, FW_KINDS[(n + 2) % FW_KINDS.length], fwPick(), (big ? 1.2 : 0.8) * grow, 0.6 + Math.random() * 0.7, 0.55 + Math.random() * 0.3);
    }
  }
  function fwOnClear(n) {
    const box = photoBox();
    if (!box || !box.dw) return;
    const tetris = n >= 4;
    const count = reduceMotion() ? (tetris ? 2 : 1) : (tetris ? 5 : (n >= 3 ? 3 : 2));
    const grow = fwSize(fw.prog);
    const scale = (tetris ? 1.45 : (0.9 + n * 0.12)) * Math.max(grow, tetris ? 0.85 : 0.6);
    for (let i = 0; i < count; i++) {
      const pos = fwSkyPos(box, { x: 0.16 + (i / Math.max(1, count - 1)) * 0.68, y: 0.12 + (i % 2) * 0.12 + Math.random() * 0.06 });
      const typ = tetris ? FW_KINDS[i % FW_KINDS.length] : FW_KINDS[(Math.random() * FW_KINDS.length) | 0];
      fwBurst(pos.x, pos.y, (tetris ? 1.15 + Math.random() * 0.3 : 0.8 + Math.random() * 0.4) * (0.7 + 0.45 * Math.min(2.4, grow)), typ, fwPick(), scale);
    }
    // Shane's line-clear recording is the main cue; skip the extra fireworks bangs.
  }
  function fwOnLevelUp() {
    const box = photoBox();
    if (!box || !box.dw) return;
    const count = reduceMotion() ? 3 : 7;
    for (let i = 0; i < count; i++) {
      const pos = fwSkyPos(box, { x: 0.12 + (i / Math.max(1, count - 1)) * 0.76, y: 0.08 + (i % 3) * 0.1 });
      fwBurst(pos.x, pos.y, 1.05 + Math.random() * 0.4, FW_KINDS[i % FW_KINDS.length], FW_COLS[i % FW_COLS.length], reduceMotion() ? 1.1 : 1.55);
    }
    // Shane's LEVEL UP recording is the main cue; skip the extra fireworks bangs.
  }
  function fwTickParticles(dt) {
    if (dt <= 0) return;
    // Step in modest slices so a posed age still looks right.
    let left = dt;
    while (left > 0) {
      const step = Math.min(0.032, left);
      left -= step;
      for (let i = fw.rockets.length - 1; i >= 0; i--) {
        const r = fw.rockets[i];
        r.t += step;
        const u = Math.min(1, r.t / r.max);
        const ease = u * u * (3 - 2 * u);
        const rise = Math.sin(u * Math.PI) * 18;
        r.x = r.x0 + (r.destX - r.x0) * ease;
        r.y = r.y0 + (r.destY - r.y0) * ease - rise;
        // spark trail
        if (fw.parts.length < FW_MAX_P) {
          fwAddPart({ typ: 'spark', x: r.x, y: r.y, z: r.z, vx: (Math.random() - 0.5) * 20, vy: 30 + Math.random() * 40, vz: 0, life: 0, max: 0.28, size: 1.4 * r.z, r: 255, g: 220, b: 160, trail: 0.8, pop: 0, popped: true });
        }
        if (r.t >= r.max) {
          fwBurst(r.destX, r.destY, r.z, r.typ, r.col, r.scale);
          fw.rockets.splice(i, 1);
        }
      }
      for (let i = fw.parts.length - 1; i >= 0; i--) {
        const p = fw.parts[i];
        p.life += step;
        const g = p.typ === 'willow' ? 240 : p.typ === 'spark' ? 80 : 150;
        p.vy += g * step;
        p.vx *= (1 - 0.55 * step);
        p.vy *= (1 - 0.22 * step);
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.z = Math.max(0.25, p.z + (p.vz || 0) * step);
        if (p.pop && !p.popped && p.life >= p.pop) {
          p.popped = true;
          const n = 3 + (Math.random() * 3) | 0;
          for (let k = 0; k < n; k++) {
            const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 90;
            fwAddPart({ typ: 'spark', x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 0, life: 0, max: 0.35, size: p.size * 0.7, r: p.r, g: p.g, b: p.b, trail: 0.2, pop: 0, popped: true });
          }
        }
        if (p.life >= p.max) fw.parts.splice(i, 1);
      }
      for (let i = fw.flashes.length - 1; i >= 0; i--) {
        fw.flashes[i].t += step;
        if (fw.flashes[i].t >= fw.flashes[i].max) fw.flashes.splice(i, 1);
      }
      fw.lit = Math.max(0, fw.lit - step * 1.35);
    }
  }
  function fwAdvance(dt, beat, reduce, prog) {
    if (prog != null) fw.prog = prog;
    if (!fw.hold) fw.clock = (fw.clock || 0) + dt;
    tickFwSkyFlash(dt);
    if (fw.hold) {
      if (!fw.posed) fwPose(fw.hold);
      return;
    }
    if (reduce) {
      fw.lit = Math.max(0.08, fw.lit - dt * 0.4);
      if (fw.flashes.length === 0) {
        const box = photoBox();
        if (box) {
          fw.flashes.push({ x: box.left + box.dw * 0.3, y: box.top + box.dh * 0.22, z: 0.8, r: 255, g: 210, b: 120, t: 0, max: 8, pow: 0.18 });
          fw.flashes.push({ x: box.left + box.dw * 0.7, y: box.top + box.dh * 0.18, z: 0.6, r: 120, g: 200, b: 255, t: 0, max: 8, pow: 0.14 });
        }
      }
      return;
    }
    if (beat && beat.on && !fw.beatLatch) {
      fw.beatLatch = true;
      fw.beatN++;
      fwOnBeat();
    }
    if (beat && !beat.on) fw.beatLatch = false;
    fwTickParticles(dt);
  }
  function fwPose(spec) {
    fwReset();
    fw.hold = spec;
    fw.posed = true;
    const box = photoBox();
    if (!box || !box.dw) return;
    const bursts = spec.bursts || [];
    for (let i = 0; i < bursts.length; i++) {
      const b = bursts[i];
      const x = box.left + (b.x != null ? b.x : 0.5) * box.dw;
      const y = box.top + (b.y != null ? b.y : 0.22) * box.dh;
      const col = b.col != null ? FW_COLS[b.col % FW_COLS.length] : fwPick();
      const grow = spec.size != null ? spec.size : fwSize(spec.prog != null ? spec.prog : fw.prog);
      fwBurst(x, y, b.z != null ? b.z : 1, b.typ || 'peony', col, (b.scale || 1) * (spec.size != null || spec.prog != null ? grow : 1));
    }
    const rocks = spec.rockets || [];
    for (let i = 0; i < rocks.length; i++) {
      const r = rocks[i];
      const dest = fwSkyPos(box, r);
      fwLaunch(box, dest.x, dest.y, r.typ || 'peony', r.col != null ? FW_COLS[r.col % FW_COLS.length] : fwPick(), r.scale || 0.9, r.z || 1, r.flight || 0.8);
      if (r.u != null && fw.rockets.length) fw.rockets[fw.rockets.length - 1].t = (r.u) * fw.rockets[fw.rockets.length - 1].max;
    }
    fwTickParticles(spec.at != null ? spec.at : 0.38);
    if (spec.lit != null) fw.lit = spec.lit;
  }
  function fwBedHot() {
    if (!bgmAnalyser || !bgmBins) return false;
    try {
      bgmAnalyser.getByteFrequencyData(bgmBins);
      let s = 0, n = 0;
      const hi = Math.min(bgmBins.length, 28);
      for (let i = 3; i < hi; i++) { s += bgmBins[i]; n++; }
      return n && (s / n) > 110;
    } catch (e) { return false; }
  }
  // 1.9.192: every visible burst plays a matching synthesised boom at the moment
  // it bursts, plus an optional soft low whoosh on launch. Deep and warm, high-passed
  // at 300 Hz so phone speakers can play it, low-passed at 3.5 kHz, no sharp crackle.
  // Loudness and depth follow burst size (20%–275%), with slight random pitch and a
  // cap on how many can sound at once.
  const FW_SFX_MAX = 3;
  let fwSfxN = 0;
  function playFwWhoosh() {
    if (!soundOn || !ac || !sfxGain || !noiseBuf || fw.hold) return;
    if (fwSfxN >= FW_SFX_MAX) return;
    const dest = sfxGain;
    const t0 = ac.currentTime + 0.008;
    const pit = 0.94 + Math.random() * 0.12;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 300; hp.Q.value = 0.7;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900 * pit; lp.Q.value = 0.5;
    lp.frequency.linearRampToValueAtTime(1400 * pit, t0 + 0.18);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.045, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(dest);
    src.start(t0); src.stop(t0 + 0.32);
  }
  function playFwSfx(scale, z) {
    if (!soundOn || !ac || !sfxGain || !noiseBuf || fw.hold) return;
    if (fwSfxN >= FW_SFX_MAX) return;
    const sc = Math.max(0.2, Math.min(2.75, scale == null ? 1 : scale));
    const k = (sc - 0.2) / 2.55;
    const depth = 0.75 + 0.35 * k * Math.min(1.3, z || 1);
    const pit = 0.93 + Math.random() * 0.14;
    const boom = (0.055 + 0.10 * k) * depth;
    const dur = 0.38 + 0.34 * k;
    const dest = sfxGain;
    const t0 = ac.currentTime + 0.008;
    fwSfxN++;
    const hold = dur + 0.05;
    if (typeof root.setTimeout === 'function') root.setTimeout(function () { fwSfxN = Math.max(0, fwSfxN - 1); }, hold * 1000);
    else fwSfxN = Math.max(0, fwSfxN - 1);
    // Warm tonal body at or above ~300 Hz so phone speakers can play it.
    const f0 = (310 + 40 * (1 - k)) * pit;
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(Math.max(300, f0), t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(300, f0 * 0.72), t0 + dur * 0.7);
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 300; hp.Q.value = 0.7;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 3500; lp.Q.value = 0.5;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(boom, t0 + 0.024);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(hp); hp.connect(lp); lp.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.02);
    // Soft noise bloom, same 300 Hz–3.5 kHz window. No sharp crackle.
    const rum = ac.createBufferSource();
    rum.buffer = noiseBuf;
    const rhp = ac.createBiquadFilter();
    rhp.type = 'highpass'; rhp.frequency.value = 300; rhp.Q.value = 0.7;
    const rlp = ac.createBiquadFilter();
    rlp.type = 'lowpass'; rlp.frequency.value = 1200 + 400 * k; rlp.Q.value = 0.5;
    const rg = ac.createGain();
    rg.gain.setValueAtTime(0.0001, t0);
    rg.gain.linearRampToValueAtTime(boom * 0.55, t0 + 0.03);
    rg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.85);
    rum.connect(rhp); rhp.connect(rlp); rlp.connect(rg); rg.connect(dest);
    rum.start(t0); rum.stop(t0 + dur);
  }
  function drawFireworksScene(c, w, h, reduce) {
    const box = photoBox();
    if (!box || !box.dw) return;
    if (fw.hold && !fw.posed) fwPose(fw.hold);
    const sc = box.scale;
    // 1.9.194: plain black sky, no painted backdrop.
    c.fillStyle = '#000';
    c.fillRect(0, 0, w, h);

    // Burst lighting of the sky
    c.save();
    c.beginPath();
    c.rect(box.left, box.top, box.dw, box.dh);
    c.clip();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < fw.flashes.length; i++) {
      const f = fw.flashes[i];
      const fade = Math.max(0, 1 - f.t / f.max);
      const a = fade * fade * f.pow;
      if (a < 0.01) continue;
      const rad = (90 + 140 * f.z) * sc * (0.85 + 0.4 * fade) * Math.min(2.6, 0.7 + 0.45 * (f.sc || 1));
      const rg = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, rad);
      rg.addColorStop(0, 'rgba(' + f.r + ',' + f.g + ',' + f.b + ',' + (0.55 * a) + ')');
      rg.addColorStop(0.35, 'rgba(' + f.r + ',' + f.g + ',' + f.b + ',' + (0.18 * a) + ')');
      rg.addColorStop(1, 'rgba(' + f.r + ',' + f.g + ',' + f.b + ',0)');
      c.fillStyle = rg;
      c.fillRect(f.x - rad, f.y - rad, rad * 2, rad * 2);
    }
    // Rockets
    if (!reduce) {
      for (let i = 0; i < fw.rockets.length; i++) {
        const r = fw.rockets[i];
        const a = 0.7 * r.z;
        c.strokeStyle = 'rgba(255,230,180,' + a + ')';
        c.lineWidth = 1.6 * r.z * sc;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(r.x, r.y + 14 * sc);
        c.lineTo(r.x, r.y);
        c.stroke();
        c.fillStyle = 'rgba(255,244,220,' + a + ')';
        c.beginPath();
        c.arc(r.x, r.y, 2 * r.z * sc, 0, Math.PI * 2);
        c.fill();
      }
    }
    // Particles, far to near
    if (!reduce && fw.parts.length) {
      const list = fw.parts.slice().sort(function (a, b) { return a.z - b.z; });
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        const u = Math.max(0, 1 - p.life / p.max);
        const fade = u * u * (0.45 + 0.55 * Math.min(1.3, p.z));
        if (fade < 0.03) continue;
        const sz = p.size * sc * (0.85 + 0.25 * p.z);
        if (p.trail && (Math.abs(p.vx) + Math.abs(p.vy) > 40)) {
          const tx = p.x - p.vx * 0.045 * p.trail;
          const ty = p.y - p.vy * 0.045 * p.trail;
          c.strokeStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + (fade * 0.65) + ')';
          c.lineWidth = Math.max(0.6, sz * 0.7);
          c.lineCap = 'round';
          c.beginPath();
          c.moveTo(tx, ty);
          c.lineTo(p.x, p.y);
          c.stroke();
        }
        c.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + fade + ')';
        c.beginPath();
        c.arc(p.x, p.y, Math.max(0.6, sz), 0, Math.PI * 2);
        c.fill();
      }
    } else if (reduce) {
      for (let i = 0; i < fw.flashes.length; i++) {
        const f = fw.flashes[i];
        const rad = 70 * sc * f.z;
        const rg = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, rad);
        rg.addColorStop(0, 'rgba(' + f.r + ',' + f.g + ',' + f.b + ',0.28)');
        rg.addColorStop(1, 'rgba(' + f.r + ',' + f.g + ',' + f.b + ',0)');
        c.fillStyle = rg;
        c.fillRect(f.x - rad, f.y - rad, rad * 2, rad * 2);
      }
    }
    c.restore();

    // 1.9.194: rainforest silhouette removed; fireworks only on a blank black sky.

    // Light veil so the board stays readable without muting the bursts too much.
    c.fillStyle = 'rgba(0,0,0,0.16)';
    c.fillRect(box.left, box.top, box.dw, box.dh);
    drawFwSkyFlash(c, w, h);
  }



  // 1.9.181 Ocean: the big painted dolphins swim on arcs, porpoise, and undulate.
  // 1.9.182: smooth, eased, continuous motion (layered sines, analytic velocity, no wrap pop).
  // 1.9.183: two painted dolphins (the mid-reef one is gone, plate cleaned) and more
  // painted reef fish, cut from 2.webp and swimming in small schools and as individuals.
  const ocean = { img: { plate: null, atlas: null }, ready: false, loading: false, dolphins: [], fish: [], bubbles: [], ripples: [], hold: null, posed: false, t: 0 };

  function oceanLoad() {
    if (ocean.ready || ocean.loading || !root.Image) return;
    ocean.loading = true;
    let left = 2;
    const done = function () { if (--left <= 0) { ocean.ready = true; ocean.loading = false; } };
    Object.keys(OCEAN_ART).forEach(function (k) {
      const im = new root.Image();
      im.onload = done;
      im.onerror = done;
      im.src = OCEAN_ART[k];
      ocean.img[k] = im;
    });
  }
  function oceanReset() {
    ocean.dolphins = []; ocean.fish = []; ocean.bubbles = []; ocean.ripples = [];
    ocean.t = 0; ocean.posed = false;
  }

  // Evaluate a C-infinity layered-sine path (plus a smooth porpoise) and its velocity at time t.
  // Analytic layered-sine path (no clamps). Displayed positions may wrap at the edges.
  function oceanEval(d, t) {
    const w = Math.PI * 2 / d.per;
    const a = w * t + d.ph;
    const s1 = Math.sin(a), c1 = Math.cos(a);
    const s2 = Math.sin(2 * a + d.ph2), c2 = Math.cos(2 * a + d.ph2);
    const s4 = Math.sin(2 * a + d.ph4), c4 = Math.cos(2 * a + d.ph4);
    const x = d.cx + d.ax * s1 + d.ax2 * s2;
    const up = 0.5 + 0.5 * Math.sin(a + d.phP);
    const porp = -d.porpAmp * up * up;
    const y = d.cy + d.ay * c1 + d.ay2 * s4 + porp;
    // Analytic velocity (no finite-difference stepping, path closes exactly each period).
    const vx = w * (d.ax * c1 + 2 * d.ax2 * c2);
    const dup = 0.5 * w * Math.cos(a + d.phP);
    const vPorp = -d.porpAmp * (2 * up * dup);
    const vy = w * (-d.ay * s1 + 2 * d.ay2 * c4) + vPorp;
    return { x: x, y: y, vx: vx, vy: vy, porp: porp, heading: Math.atan2(vy, vx) };
  }
  function oceanWrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  function oceanLerpAngle(from, to, k) {
    return from + oceanWrapAngle(to - from) * k;
  }
  function oceanCast() {
    oceanReset();
    const M = OCEAN_META.dolphins;
    // Wide, wandering layered-sine paths across the whole plate (same C-infinity
    // construction as 1.9.182). Drift + wrap carries them off one edge and in the other.
    const paths = [
      { cx: 270, cy: 400, per: 32, ph: 0.3, ax: 320, ay: 400, ax2: 70, ay2: 80, ph2: 1.1, ph4: 2.2, porpAmp: 24, phP: 0.0, z0: 1.05, driftX: 18, driftY: 6 },
      { cx: 260, cy: 520, per: 41, ph: 2.4, ax: 300, ay: 380, ax2: 80, ay2: 70, ph2: 0.6, ph4: 0.9, porpAmp: 16, phP: 1.2, z0: 0.86, driftX: -14, driftY: -5 }
    ];
    ocean.dolphins = M.map(function (meta, i) {
      const p = paths[i];
      const d = { i: i, meta: meta, heading: meta.ang * Math.PI / 180, facing: 1, bank: 0, und: 0, tail: 0, porp: 0, z: p.z0, primed: false };
      for (const k in p) d[k] = p[k];
      const e0 = oceanDolphinPos(d, 0);
      d.x = e0.x; d.y = e0.y; d.heading = e0.heading; d.facing = e0.vx >= 0 ? 1 : -1;
      return d;
    });
    oceanCastFish();
    oceanLoad();
  }
  function oceanEmitBubble(x, y, z) {
    if (ocean.bubbles.length > 28) ocean.bubbles.shift();
    ocean.bubbles.push({ x: x, y: y, z: z || 1, r: 1.4 + Math.random() * 2.2, vx: (Math.random() - 0.5) * 8, vy: -(16 + Math.random() * 22), t: 0, max: 1.4 + Math.random() * 0.8 });
  }
  function oceanEmitRipple(x, y) {
    if (ocean.ripples.length > 8) ocean.ripples.shift();
    ocean.ripples.push({ x: x, y: y, t: 0, max: 1.15 });
  }
  function oceanPoseAt(t) {
    ocean.t = t;
    if (!ocean.dolphins.length) oceanCast();
    oceanAdvance(0, false, true);
    ocean.bubbles = [];
    for (let i = 0; i < ocean.dolphins.length; i++) {
      const d = ocean.dolphins[i];
      const tail = d.heading + Math.PI;
      for (let k = 0; k < 3; k++) oceanEmitBubble(d.x + Math.cos(tail) * (18 + k * 12) + (k - 1) * 6, d.y + Math.sin(tail) * (10 + k * 8) - k * 8, d.z);
    }
    ocean.posed = true;
  }
  function oceanAdvance(dt, reduce, poseOnly) {
    if (ocean.hold && !poseOnly) {
      if (!ocean.posed) oceanPoseAt(ocean.hold.t != null ? ocean.hold.t : 0);
      return;
    }
    if (!ocean.dolphins.length) oceanCast();
    if (!poseOnly) ocean.t += dt;
    const t = ocean.t;
    const snap = poseOnly || dt === 0;
    const easeH = snap ? 1 : (1 - Math.exp(-5.5 * dt));
    const easeB = snap ? 1 : (1 - Math.exp(-6 * dt));
    const faceRate = 2.8;
    for (let i = 0; i < ocean.dolphins.length; i++) {
      const d = ocean.dolphins[i];
      if (reduce && !poseOnly) {
        d.x = d.meta.px; d.y = d.meta.py; d.heading = d.meta.ang * Math.PI / 180; d.z = d.z0; d.und = 0; d.tail = 0; d.porp = 0; d.bank = 0; d.facing = 1;
        continue;
      }
      const e = oceanDolphinPos(d, t);
      d.x = e.x;
      d.y = e.y;
      d.porp = e.porp;
      d.heading = snap ? e.heading : oceanLerpAngle(d.heading, e.heading, easeH);
      const v2 = e.vx * e.vx + e.vy * e.vy;
      // Analytic yaw rate → a slow bank into the turn (no sudden roll).
      const e2 = oceanDolphinPos(d, t + 1 / 120);
      const axv = (e2.vx - e.vx) * 120, ayv = (e2.vy - e.vy) * 120;
      const turn = (e.vx * ayv - e.vy * axv) / (v2 + 40);
      const bankT = Math.max(-0.38, Math.min(0.38, -0.22 * turn));
      d.bank = d.bank + (bankT - d.bank) * easeB;
      const want = e.vx >= 0 ? 1 : -1;
      if (snap) d.facing = want;
      else {
        const step = Math.min(Math.abs(want - d.facing), faceRate * dt);
        d.facing += (want > d.facing ? 1 : want < d.facing ? -1 : 0) * step;
      }
      d.z = d.z0 + 0.1 * Math.sin((Math.PI * 2 / d.per) * 0.5 * t + i);
      // Continuous body flex and a slightly quicker tail beat.
      d.und = Math.sin(t * 5.6 + i * 1.1);
      d.tail = Math.sin(t * 8.2 + i * 1.1);
      if (!poseOnly && !reduce && Math.random() < dt * 2.4) {
        const back = d.heading + Math.PI;
        oceanEmitBubble(d.x + Math.cos(back) * 36, d.y + Math.sin(back) * 22, d.z);
      }
      if (!poseOnly && !reduce && d.porp < -14 && d.y < 190 && Math.random() < dt * 2.5) oceanEmitRipple(d.x, Math.max(90, d.y - 16));
    }
    oceanAdvanceFish(dt, reduce, poseOnly, t, snap, easeH, easeB);
    if (reduce && !poseOnly) return;
    for (let i = ocean.bubbles.length - 1; i >= 0; i--) {
      const b = ocean.bubbles[i];
      if (!poseOnly) { b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx += Math.sin((ocean.t + i) * 3) * 4 * dt; }
      if (b.t >= b.max || b.y < 60) ocean.bubbles.splice(i, 1);
    }
    for (let i = ocean.ripples.length - 1; i >= 0; i--) {
      if (!poseOnly) ocean.ripples[i].t += dt;
      if (ocean.ripples[i].t >= ocean.ripples[i].max) ocean.ripples.splice(i, 1);
    }
  }

  // Wrap through a margin so a fish swims off one edge and back in the other, no pop.
  const FISH_W = 540, FISH_H = 960, FISH_MX = 90, FISH_MY = 100;
  // Dolphins are much larger, so they get a wider off-screen margin before wrapping.
  const DOLPHIN_MX = 180, DOLPHIN_MY = 200;
  function oceanWrap(v, span, m) {
    const s = span + 2 * m;
    return ((v + m) % s + s) % s - m;
  }
  function oceanWrapX(x) { return oceanWrap(x, FISH_W, FISH_MX); }
  function oceanWrapY(y) { return oceanWrap(y, FISH_H, FISH_MY); }
  function oceanDolphinWrapX(x) { return oceanWrap(x, FISH_W, DOLPHIN_MX); }
  function oceanDolphinWrapY(y) { return oceanWrap(y, FISH_H, DOLPHIN_MY); }
  function oceanDolphinPos(d, t) {
    const e = oceanEval(d, t);
    const dx = (d.driftX || 0) * t, dy = (d.driftY || 0) * t;
    const vx = e.vx + (d.driftX || 0), vy = e.vy + (d.driftY || 0);
    return { x: oceanDolphinWrapX(e.x + dx), y: oceanDolphinWrapY(e.y + dy), vx: vx, vy: vy, heading: Math.atan2(vy, vx), porp: e.porp };
  }
  function oceanFishPos(d, t) {
    const e = oceanEval(d, t);
    const dx = (d.driftX || 0) * t, dy = (d.driftY || 0) * t;
    const vx = e.vx + (d.driftX || 0), vy = e.vy + (d.driftY || 0);
    return { x: oceanWrapX(e.x + (d.lx || 0) + dx), y: oceanWrapY(e.y + (d.ly || 0) + dy), vx: vx, vy: vy, heading: Math.atan2(vy, vx), porp: e.porp };
  }
  function oceanEdgeFade(x, y, mx, my) {
    mx = mx == null ? FISH_MX : mx;
    my = my == null ? FISH_MY : my;
    let a = 1;
    if (x < 0) a = Math.max(0, 1 + x / mx);
    else if (x > FISH_W) a = Math.max(0, 1 - (x - FISH_W) / mx);
    if (y < 0) a *= Math.max(0, 1 + y / my);
    else if (y > FISH_H) a *= Math.max(0, 1 - (y - FISH_H) / my);
    return a;
  }
  function oceanFishSrc(name) {
    const list = OCEAN_META.fish;
    for (let i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    return list[0];
  }
  function oceanCastFish() {
    const list = OCEAN_META.fish || [];
    // 1.9.185: roam the whole photo (540×960), not a tight corner of the reef.
    // Shared school path + local offsets keep the school together. driftX/Y wrap off the edges.
    const schools = {
      orange: { cx: 270, cy: 500, per: 36, ax: 300, ay: 340, ax2: 80, ay2: 70, ph2: 0.8, ph4: 1.6, porpAmp: 10, phP: 0.4, z0: 0.92, dartPer: 7.5, dartAmp: 28, driftX: 16, driftY: 5 },
      yellow: { cx: 260, cy: 390, per: 28, ax: 280, ay: 360, ax2: 70, ay2: 60, ph2: 1.3, ph4: 2.1, porpAmp: 8, phP: 1.0, z0: 1.08, dartPer: 8.5, dartAmp: 22, driftX: -14, driftY: 7 }
    };
    const fish = [];
    list.forEach(function (meta, i) {
      const kind = meta.kind || 'solo';
      const school = kind === 'orange' || kind === 'yellow' ? kind : null;
      const sh = school ? schools[school] : null;
      const d = { i: i, meta: meta, kind: kind, school: school, heading: 0, facing: meta.nose || 1, bank: 0, und: 0, tail: 0, porp: 0, z: 1, primed: false, nose: meta.nose || 1, clone: false, sc: 1 };
      if (sh) {
        for (const k in sh) d[k] = sh[k];
        d.ph = i * 0.37;
        d.phP = sh.phP + i * 0.2;
        // local offset from the painted home, so the school keeps its shape
        d.lx = meta.px - sh.cx;
        d.ly = meta.py - sh.cy;
        d.z0 = sh.z0 + (i % 5) * 0.03;
      } else {
        const orbit = {
          idol: { per: 20, ax: 28, ay: 18, ax2: 7, ay2: 5, porpAmp: 7, z0: 0.88 },
          tang: { per: 21, ax: 26, ay: 14, ax2: 7, ay2: 5, porpAmp: 5, z0: 1.12 },
          butterfly: { per: 17, ax: 22, ay: 12, ax2: 6, ay2: 5, porpAmp: 4, z0: 1.16 },
          clown: { per: 14, ax: 16, ay: 9, ax2: 5, ay2: 4, porpAmp: 3, z0: 1.14 },
          purp_u: { per: 19, ax: 20, ay: 11, ax2: 6, ay2: 4, porpAmp: 4, z0: 1.08 },
          purp_l: { per: 16, ax: 18, ay: 10, ax2: 5, ay2: 4, porpAmp: 3, z0: 1.18 },
          gold: { per: 15, ax: 18, ay: 10, ax2: 5, ay2: 4, porpAmp: 4, z0: 0.8 },
          orange_L: { per: 18, ax: 22, ay: 11, ax2: 6, ay2: 5, porpAmp: 4, z0: 1.06 },
          orange_M: { per: 17, ax: 20, ay: 10, ax2: 6, ay2: 4, porpAmp: 4, z0: 1.1 }
        }[meta.name] || { per: 18, ax: 18, ay: 10, ax2: 5, ay2: 4, porpAmp: 4, z0: 1 };
        // Solo fish wander widely from mid-water, not a tight loop on their painted home.
        d.cx = 120 + ((i * 97) % 300);
        d.cy = 160 + ((i * 131) % 560);
        d.per = 16 + (i % 7) * 4;
        d.ph = i * 0.9;
        d.ax = 200 + (i % 5) * 32;
        d.ay = 230 + (i % 4) * 40;
        d.ax2 = 48 + (i % 3) * 10;
        d.ay2 = 36 + (i % 3) * 8;
        d.ph2 = 0.7 + i * 0.3; d.ph4 = 1.5 + i * 0.2;
        d.porpAmp = (orbit.porpAmp || 4) + 4; d.phP = i * 0.5;
        d.z0 = 0.7 + (i % 6) * 0.1;
        d.lx = 0; d.ly = 0; d.dartPer = 9 + (i % 4); d.dartAmp = 18;
        d.driftX = (8 + (i % 5) * 3) * (i % 2 ? 1 : -1);
        d.driftY = (3 + (i % 3) * 2) * (i % 3 === 0 ? -1 : 1);
      }
      const e0 = oceanFishPos(d, 0);
      d.x = e0.x; d.y = e0.y;
      d.heading = e0.heading; d.facing = (e0.vx >= 0 ? 1 : -1);
      fish.push(d);
    });
    // A third school, deeper and slower, also roams the whole screen (not stuck on the right reef).
    const srcNames = ['anthias_8', 'anthias_11', 'anthias_13', 'anthias_14', 'anthias_18', 'orange_L'];
    const homes = [[360, 600], [400, 630], [430, 610], [380, 670], [455, 655], [340, 650], [415, 690], [350, 625]];
    homes.forEach(function (h, i) {
      const src = oceanFishSrc(srcNames[i % srcNames.length]);
      if (!src) return;
      const d = { i: fish.length, meta: src, kind: 'orange', school: 'right', heading: 0, facing: src.nose || 1, bank: 0, und: 0, tail: 0, porp: 0, z: 0.72, primed: false, nose: src.nose || 1, clone: true, sc: 0.72 + (i % 4) * 0.07,
        cx: 280, cy: 560, per: 44, ph: i * 0.55, ax: 310, ay: 300, ax2: 60, ay2: 80, ph2: 1.1, ph4: 2.0, porpAmp: 7, phP: i * 0.3, z0: 0.62 + (i % 3) * 0.05,
        lx: (h[0] - 390) * 0.85, ly: (h[1] - 640) * 0.85, dartPer: 9.5, dartAmp: 20, driftX: 11, driftY: -6 };
      const e0 = oceanFishPos(d, 0);
      d.x = e0.x; d.y = e0.y; d.heading = e0.heading; d.facing = e0.vx >= 0 ? 1 : -1;
      fish.push(d);
    });
    ocean.fish = fish;
  }
  function oceanFishDart(d, t) {
    const per = d.dartPer || 8;
    const pulse = Math.pow(0.5 + 0.5 * Math.sin((Math.PI * 2 / per) * t + (d.ph || 0)), 8);
    return (d.dartAmp || 0) * pulse;
  }
  function oceanAdvanceFish(dt, reduce, poseOnly, t, snap, easeH, easeB) {
    if (!ocean.fish || !ocean.fish.length) return;
    const faceRate = 3.2;
    for (let i = 0; i < ocean.fish.length; i++) {
      const d = ocean.fish[i];
      if (reduce && !poseOnly) {
        if (d.clone) { d.x = -999; d.y = -999; }
        else { d.x = d.meta.px; d.y = d.meta.py; d.heading = (d.meta.ang || 0) * Math.PI / 180; d.facing = d.nose || 1; }
        d.und = 0; d.tail = 0; d.porp = 0; d.bank = 0; d.z = d.z0;
        continue;
      }
      const e = oceanFishPos(d, t);
      const dart = poseOnly ? 0 : oceanFishDart(d, t);
      const hd = e.heading;
      d.x = oceanWrapX(e.x + Math.cos(hd) * dart);
      d.y = oceanWrapY(e.y + Math.sin(hd) * dart);
      d.porp = e.porp;
      d.heading = snap ? hd : oceanLerpAngle(d.heading, hd, easeH);
      const e2 = oceanFishPos(d, t + 1 / 120);
      const v2 = e.vx * e.vx + e.vy * e.vy;
      const axv = (e2.vx - e.vx) * 120, ayv = (e2.vy - e.vy) * 120;
      const turn = (e.vx * ayv - e.vy * axv) / (v2 + 40);
      const bankT = Math.max(-0.32, Math.min(0.32, -0.18 * turn));
      d.bank = d.bank + (bankT - d.bank) * easeB;
      const want = e.vx >= 0 ? 1 : -1;
      if (snap) d.facing = want;
      else {
        const step = Math.min(Math.abs(want - d.facing), faceRate * dt);
        d.facing += (want > d.facing ? 1 : want < d.facing ? -1 : 0) * step;
      }
      d.z = d.z0 + 0.06 * Math.sin((Math.PI * 2 / d.per) * 0.5 * t + i);
      d.und = Math.sin(t * 7.2 + i * 0.9);
      d.tail = Math.sin(t * 11.5 + i * 0.9);
    }
  }

  function drawOceanSprite(c, d, box) {
    const atlas = ocean.img.atlas;
    if (!atlas || !atlas.complete) return;
    const isDolphin = !d.school && !d.clone && (!d.kind || d.kind === 'dolphin');
    const fade = isDolphin ? oceanEdgeFade(d.x, d.y, DOLPHIN_MX, DOLPHIN_MY) : oceanEdgeFade(d.x, d.y);
    if (fade <= 0.02) return;
    const M = d.meta;
    c.save();
    if (fade < 0.999) c.globalAlpha = fade;
    const sc = box.scale * (0.88 + 0.22 * d.z) * (d.sc == null ? 1 : d.sc);
    const x = box.left + d.x * box.scale;
    const y = box.top + d.y * box.scale;
    const facing = d.facing == null ? 1 : d.facing;
    const nose = d.nose == null ? 1 : d.nose;
    const flip = facing * nose;
    const painted = (M.ang || 0) * Math.PI / 180;
    // When facing eases through 0 the sprite goes edge-on, hiding the turn; belly stays down.
    const face = flip < 0 ? (Math.PI - painted) : painted;
    const rot = d.heading - face;
    const edge = 0.82 + 0.18 * Math.abs(flip);
    const sizeMul = d.sc == null ? 1 : d.sc;
    c.save();
    c.translate(x, y + 18 * box.scale);
    c.scale(1, 0.32);
    c.beginPath();
    c.arc(0, 0, 48 * sc, 0, Math.PI * 2);
    c.fillStyle = 'rgba(8,20,40,' + (0.18 * Math.min(1.1, d.z)) + ')';
    c.fill();
    c.restore();
    c.save();
    c.translate(x, y);
    c.rotate(rot + (d.bank || 0) * 0.65);
    c.scale((flip === 0 ? 0.001 : flip) * sc, edge * sc);
    c.rotate((d.und || 0) * 0.05);
    const slices = (d.kind && d.kind !== 'dolphin') ? (M.aw < 28 ? 4 : 8) : 20;
    const srcW = M.aw, srcH = M.ah;
    for (let s = 0; s < slices; s++) {
      const u0 = s / slices, u1 = (s + 1) / slices;
      const sx = M.ax + srcW * u0, sw = Math.max(1, srcW * (u1 - u0));
      const dx = -M.ox + srcW * u0, dw = srcW * (u1 - u0);
      const tailW = 1 - (u0 + u1) * 0.5;
      const wob = (d.und || 0) * 3.2 * (0.18 + 0.45 * tailW) + (d.tail || 0) * 5.6 * Math.pow(tailW, 1.4);
      c.save();
      c.translate(0, wob);
      c.drawImage(atlas, sx, M.ay, sw, srcH, dx, -M.oy, dw, srcH);
      c.restore();
    }
    c.restore();
      c.restore();
  }

  function drawOceanScene(c, w, h, reduce) {
    const box = photoBox();
    if (!box || !box.dw) return;
    if (!ocean.ready || !ocean.img.plate || !ocean.img.plate.complete) return;
    if (ocean.hold && !ocean.posed) oceanPoseAt(ocean.hold.t != null ? ocean.hold.t : 0);
    const sc = box.scale;
    c.drawImage(ocean.img.plate, box.left, box.top, box.dw, box.dh);
    // Ripples on the plate, under the dolphins
    for (let i = 0; i < ocean.ripples.length; i++) {
      const r = ocean.ripples[i];
      const u = r.t / r.max;
      const radX = (18 + u * 70) * sc, radY = radX * 0.28;
      c.beginPath();
      c.ellipse(box.left + r.x * sc, box.top + r.y * sc, radX, radY, 0, 0, Math.PI * 2);
      c.strokeStyle = 'rgba(220,245,255,' + (0.28 * (1 - u)) + ')';
      c.lineWidth = 1.6 * sc;
      c.stroke();
    }
    const list = ocean.dolphins.concat(ocean.fish || []).filter(function (o) { return o.x > -400 && o.y > -400; }).sort(function (a, b) { return a.z - b.z; });
    for (let i = 0; i < list.length; i++) drawOceanSprite(c, list[i], box);
    // Bubbles
    for (let i = 0; i < ocean.bubbles.length; i++) {
      const b = ocean.bubbles[i];
      const fade = Math.max(0, 1 - b.t / b.max);
      const rr = b.r * sc * (0.8 + 0.3 * b.z);
      const bx = box.left + b.x * sc, by = box.top + b.y * sc;
      c.beginPath();
      c.arc(bx, by, rr, 0, Math.PI * 2);
      c.strokeStyle = 'rgba(230,250,255,' + (0.55 * fade) + ')';
      c.lineWidth = 1.1 * sc;
      c.stroke();
      c.beginPath();
      c.arc(bx - rr * 0.25, by - rr * 0.3, rr * 0.28, 0, Math.PI * 2);
      c.fillStyle = 'rgba(255,255,255,' + (0.35 * fade) + ')';
      c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(box.left, box.top, box.dw, box.dh);
  }

  function effectStageDraw(now) {
    const kind = isEffect(lookIdx < 0 ? themeIdx : lookIdx);
    if (!kind) {
      if (life.cv) life.ctx && life.ctx.clearRect(0, 0, life.w, life.h);
      return false;
    }
    const reduce = reduceMotion();
    if (!fx.cv) { const was = fx.off; fx.off = false; fxInit(); fx.off = was; }
    lifeInit();
    if (!fx.ctx || !life.ctx) return true;
    if (fx.w !== root.innerWidth || fx.h !== root.innerHeight) fxSize();
    if (life.w !== root.innerWidth || life.h !== root.innerHeight) lifeSize();
    const ti = lookIdx < 0 ? themeIdx : lookIdx;
    const beat = musicBeat(ti);
    const lines = (g.clearFx ? g.clearFx.lines + g.clearFx.n : g.lines) || 0;
    const prog = effectProg(lines);
    if (!life.seeded || life.kind !== kind) lifeCast(kind);
    // Live clock: hold is used for screenshots; otherwise advance happens in effectTick.
    const c0 = fx.ctx;
    c0.clearRect(0, 0, fx.w, fx.h);
    if (kind === 'farm') drawFarmScene(c0, fx.w, fx.h, reduce);
    else if (kind === 'beach') drawBeachScene(c0, fx.w, fx.h, reduce);
    else if (kind === 'fireworks') drawFireworksScene(c0, fx.w, fx.h, reduce);
    else if (kind === 'ocean') drawOceanScene(c0, fx.w, fx.h, reduce);
    else {
      drawFrogScene(c0, fx.w, fx.h, reduce);
      // pond ripples + shimmer live on the photo, behind the board, so they show in the margins
      drawRipples(c0);
    }
    drawEfxParts(c0);

    const c = life.ctx;
    c.clearRect(0, 0, life.w, life.h);
    c.save();
    clipAroundBoard(c, life.w, life.h);
    if (kind === 'frog') {
      drawFlies(c, reduce);
      drawFishJump(c);
      // The painted frog is drawn behind the board (drawFrogScene) so it shows through empty cells.
      // also draw ripples in the visible margins in front, so the bottom pond clearly moves
      drawRipples(c);
    }
    c.restore();
    return true;
  }

  function drawStar(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 4, rad = i % 2 ? r * 0.4 : r;
      if (i === 0) ctx.moveTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad);
      else ctx.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad);
    }
    ctx.closePath();
    ctx.fill();
  }
  function drawLeaf(ctx, x, y, r, rot, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.45, 0, 0, 6.283); ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.restore();
  }
  function drawFlake(ctx, x, y, r, color) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.lineWidth = 1.15; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -r * 0.55); ctx.lineTo(-r * 0.22, -r * 0.75); ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.22, -r * 0.75); ctx.stroke();
    }
    ctx.restore();
  }
  function drawPad(ctx, x, y, r, color) {
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, 0, 6.283);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = 'rgba(20,60,20,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + r * 0.7, y - r * 0.15); ctx.stroke();
  }
  function drawFrog(ctx, x, y, r) {
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.4, y - r * 0.55, r * 0.32, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.4, y - r * 0.55, r * 0.32, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#14532d';
    ctx.beginPath(); ctx.arc(x - r * 0.4, y - r * 0.55, r * 0.14, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.4, y - r * 0.55, r * 0.14, 0, 6.283); ctx.fill();
  }
  function drawPart(ctx, o, tSec, fade, n) {
    const age = tSec - o.delay;
    if (age < 0) return;
    const life = 0.28 + n * 0.04;
    const k = Math.max(0, 1 - age / life);
    if (k <= 0) return;
    const x = o.x0 + o.vx * age;
    let y = o.y0 + o.vy * age + 70 * age * age;
    const isHop = o.kind === 'frog' && (o.rot * 10) % 3 < 1.2;
    if (isHop) {
      const hopP = Math.min(1, age / 0.28);
      y = o.y0 - o.hop * 4 * hopP * (1 - hopP);
    }
    ctx.globalAlpha = k * fade * (0.7 + 0.15 * n);
    if (o.kind === 'bubbles') {
      const by = y - age * 40;
      ctx.strokeStyle = 'rgba(220,245,255,0.95)';
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(x, by, o.size, 0, 6.283); ctx.stroke();
      ctx.fillStyle = 'rgba(220,245,255,0.18)'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.arc(x - o.size * 0.3, by - o.size * 0.3, o.size * 0.22, 0, 6.283); ctx.fill();
    } else if (o.kind === 'stars') {
      ctx.fillStyle = o.color;
      drawStar(ctx, x, y, o.size * (0.7 + 0.3 * Math.sin((age + o.rot) * 10)));
    } else if (o.kind === 'leaves') {
      drawLeaf(ctx, x, y, o.size * 1.4, o.rot + o.spin * age, o.color);
    } else if (o.kind === 'snow') {
      drawFlake(ctx, x, y, o.size * 1.3, '#e0f2fe');
    } else if (o.kind === 'frog') {
      if (isHop) drawFrog(ctx, x, y, Math.max(4.5, o.size * 0.85));
      else drawPad(ctx, x, y, o.size * 1.3, o.color);
    } else {
      ctx.fillStyle = rgbaHex(o.color, 0.35);
      ctx.beginPath(); ctx.arc(x, y, o.size * 1.8, 0, 6.283); ctx.fill();
      ctx.fillStyle = o.color;
      drawStar(ctx, x, y, o.size);
    }
    ctx.globalAlpha = 1;
  }
  function candyScale(p, reduce) {
    if (reduce) return 1;
    if (p < 0.16) {
      const k = p / 0.16;
      const e = 1 - Math.pow(1 - k, 3);
      return 0.28 + e * 1.0; // pop to 1.28
    }
    if (p < 0.28) {
      const k = (p - 0.16) / 0.12;
      return 1.28 - k * 0.28;
    }
    return 1 + 0.03 * Math.sin((p - 0.28) * 10);
  }
  function candyFade(p) {
    if (p < 0.08) return p / 0.08;
    if (p > 0.72) return Math.max(0, (1 - p) / 0.28);
    return 1;
  }
  function drawCandyWord(ctx, text, x, y, size, alpha, scale, pal) {
    pal = pal || null;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 ' + size + 'px ' + FONT;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.shadowColor = pal && pal.shadow ? pal.shadow : 'rgba(255,110,200,0.9)';
    ctx.shadowBlur = 26;
    ctx.lineWidth = Math.max(6, size * 0.18);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeText(text, 0, 0);
    const fill = ctx.createLinearGradient(0, -size * 0.7, 0, size * 0.65);
    const stops = pal && pal.stops ? pal.stops : ['#fff7fb', '#ffd6ee', '#ff6bb5', '#f472b6', '#fb7185'];
    fill.addColorStop(0, stops[0]);
    fill.addColorStop(0.22, stops[1]);
    fill.addColorStop(0.48, stops[2]);
    fill.addColorStop(0.78, stops[3]);
    fill.addColorStop(1, stops[4]);
    ctx.shadowBlur = 10;
    ctx.fillStyle = fill;
    ctx.fillText(text, 0, 0);
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-board.width, -size, board.width * 2, size * 0.48);
    ctx.clip();
    ctx.globalAlpha = alpha * 0.65;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(text, 0, -size * 0.05);
    ctx.restore();
    ctx.restore();
  }
  function drawLevelUp(ctx, lu) {
    if (!lu) return;
    const p = lu.hold ? (lu.at || 0) : Math.min(1, lu.t / lu.dur);
    const fade = candyFade(p);
    const scale = candyScale(p, lu.reduce);
    const tSec = p * (lu.dur / 1000);
    ctx.save();
    ctx.globalAlpha = 0.28 * fade;
    ctx.fillStyle = '#140814';
    ctx.fillRect(0, 0, board.width, board.height);
    ctx.restore();
    // Blue-white lightning glow + a short screen flash (about 0.25 opacity, not blinding).
    if (!lu.reduce) {
      const flash = 0.25 * Math.max(0, 1 - p / 0.22);
      if (flash > 0.01) {
        ctx.fillStyle = 'rgba(200,230,255,' + (flash * fade) + ')';
        ctx.fillRect(0, 0, board.width, board.height);
      }
      const glowA = 0.28 * fade * (p < 0.2 ? p / 0.2 : (p > 0.75 ? Math.max(0, (1 - p) / 0.25) : 1));
      const cx0 = board.width / 2, cy0 = board.height / 2 - 18;
      const rg = ctx.createRadialGradient(cx0, cy0, 8, cx0, cy0, board.width * 0.7);
      rg.addColorStop(0, 'rgba(180,220,255,' + glowA + ')');
      rg.addColorStop(0.45, 'rgba(140,190,255,' + (glowA * 0.35) + ')');
      rg.addColorStop(1, 'rgba(140,190,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, board.width, board.height);
      drawLightningBolts(ctx, lu.bolts, p, fade, (lu.hold ? (lu.at || 0) * lu.dur : lu.t) / 1000);
    }
    // Soft shimmer sweep across the board
    const sw = board.width * 0.42;
    const sx = -sw + Math.min(1, p / 0.55) * (board.width + sw * 2);
    const sg = ctx.createLinearGradient(sx, 0, sx + sw, board.height * 0.15);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.45, 'rgba(255,230,250,' + (0.22 * fade) + ')');
    sg.addColorStop(0.5, 'rgba(255,255,255,' + (0.4 * fade) + ')');
    sg.addColorStop(0.55, 'rgba(255,210,240,' + (0.22 * fade) + ')');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, board.width, board.height);
    for (const o of lu.parts) drawPart(ctx, o, tSec, fade, lu.n || 4);
    const cx = board.width / 2;
    const cy = board.height / 2 - 18;
    const size = lu.beat && lu.title.length > 10 ? 28 : 36;
    drawCandyWord(ctx, lu.title, cx, cy, size, fade, scale);
    ctx.save();
    ctx.globalAlpha = fade * (p < 0.14 ? Math.max(0, (p - 0.06) / 0.08) : 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 16px ' + FONT;
    ctx.shadowColor = 'rgba(20,8,16,0.65)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#fff7fb';
    ctx.fillText(lu.sub, cx, cy + 36);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  function drawClearFx(ctx, fx) {

    if (!fx) return;
    const p = fx.hold ? fx.at : Math.min(1, fx.t / fx.dur);
    const n = fx.n;
    const fade = p < 0.12 ? p / 0.12 : (p > 0.82 ? Math.max(0, (1 - p) / 0.18) : 1);
    const boost = fx.effect ? 1.55 : 1;
    fx.rows.forEach((row) => {
      const y = row * CELL;
      const rowCols = (fx.snap[row] || []).map(v => v ? blockColor(v, fx.lines, fx.level) : null);
      const mid = rowCols.find(Boolean) || '#ffffff';
      const mid2 = rowCols.filter(Boolean).slice(-1)[0] || mid;
      ctx.fillStyle = rgbaHex(mid, (0.12 + 0.1 * n) * fade * (fx.effect ? 1.25 : 1));
      ctx.fillRect(0, y - (fx.effect ? 3 : 0), COLS * CELL, CELL + (fx.effect ? 6 : 0));
      const bw = CELL * (1.5 + n * 0.35) * boost;
      const x = -bw + p * (COLS * CELL + bw);
      const g2 = ctx.createLinearGradient(x, y, x + bw, y);
      g2.addColorStop(0, 'rgba(255,255,255,0)');
      g2.addColorStop(0.35, rgbaHex(mid, 0.35 * fade));
      g2.addColorStop(0.5, 'rgba(255,255,255,' + (0.42 * fade) + ')');
      g2.addColorStop(0.65, rgbaHex(mid2, 0.35 * fade));
      g2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, y - 2, COLS * CELL, CELL + 4);
      if (n >= 3) {
        const x2 = x - bw * 0.55;
        const g3 = ctx.createLinearGradient(x2, y, x2 + bw * 0.8, y);
        g3.addColorStop(0, 'rgba(255,255,255,0)');
        g3.addColorStop(0.5, rgbaHex(mid, 0.18 * fade));
        g3.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g3;
        ctx.fillRect(0, y - 1, COLS * CELL, CELL + 2);
      }
    });
    const tSec = p * (fx.dur / 1000);
    for (const o of fx.parts) {
      const age = tSec - o.delay;
      if (age < 0) continue;
      const life = 0.28 + n * 0.04;
      const k = Math.max(0, 1 - age / life);
      if (k <= 0) continue;
      const x = o.x0 + o.vx * age;
      let y = o.y0 + o.vy * age + 70 * age * age;
      const isHop = o.kind === 'frog' && (o.rot * 10) % 3 < 1.2;
      if (isHop) {
        const hopP = Math.min(1, age / 0.28);
        y = o.y0 - o.hop * 4 * hopP * (1 - hopP);
      }
      ctx.globalAlpha = k * fade * (0.7 + 0.15 * n);
      if (o.kind === 'bubbles') {
        const by = y - age * 40;
        ctx.strokeStyle = 'rgba(220,245,255,0.95)';
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(x, by, o.size, 0, 6.283); ctx.stroke();
        ctx.fillStyle = 'rgba(220,245,255,0.18)'; ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.arc(x - o.size * 0.3, by - o.size * 0.3, o.size * 0.22, 0, 6.283); ctx.fill();
      } else if (o.kind === 'stars') {
        ctx.fillStyle = o.color;
        drawStar(ctx, x, y, o.size * (0.7 + 0.3 * Math.sin((age + o.rot) * 10)));
      } else if (o.kind === 'leaves') {
        drawLeaf(ctx, x, y, o.size * 1.4, o.rot + o.spin * age, o.color);
      } else if (o.kind === 'snow') {
        drawFlake(ctx, x, y, o.size * 1.3, '#e0f2fe');
      } else if (o.kind === 'frog') {
        if (isHop) drawFrog(ctx, x, y, Math.max(4.5, o.size * 0.85));
        else drawPad(ctx, x, y, o.size * 1.3, o.color);
      } else {
        ctx.fillStyle = rgbaHex(o.color, 0.35);
        ctx.beginPath(); ctx.arc(x, y, o.size * 1.8, 0, 6.283); ctx.fill();
        ctx.fillStyle = o.color;
        drawStar(ctx, x, y, o.size);
      }
    }
    ctx.globalAlpha = 1;
    if (fx.banner) {
      const a = fade * (0.85 + 0.15 * Math.sin(p * 6.28));
      const w = 210, h = 48;
      const x = (board.width - w) / 2, yb = board.height / 2 - 86;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(12, 16, 10, 0.72)';
      const rr = 14;
      ctx.beginPath();
      ctx.moveTo(x + rr, yb);
      ctx.arcTo(x + w, yb, x + w, yb + h, rr);
      ctx.arcTo(x + w, yb + h, x, yb + h, rr);
      ctx.arcTo(x, yb + h, x, yb, rr);
      ctx.arcTo(x, yb, x + w, yb, rr);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fde68a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 26px ' + FONT;
      ctx.fillText(g.popup && g.popup.indexOf('TETRIS') === 0 ? g.popup : 'TETRIS!', x + w / 2, yb + h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
    }
  }

  let last = performance.now();
  function loop(now) {
    applyLook(themeFor(g.clearFx ? g.clearFx.level : g.level));
    try { fxDraw(now); } catch (e) { fx.off = true; }
    const dt = now - last;
    last = now;
    try { effectTick(dt); } catch (e) { }
    const clearing = tickClear(g, dt);
    const leveling = tickLevelUp(g, dt);
    const highing = tickHighScore(g, dt);
    const running = started && !g.over && !g.paused && !g.demo && !clearing && !leveling && !highing;
    if (running) {
      if (themeFor(g.level) === NZ_THEME) {
        const beat = musicBeat(NZ_THEME);
        const interval = nzDropInterval(g.lines, g.level) / 1000;
        const grid = beat.period / 2;
        const off = (TRACKS[NZ_THEME] && TRACKS[NZ_THEME].offset) || 0;
        const tNow = beat.t;
        if (g.nzDropAt == null) {
          const k = Math.ceil((tNow - off + 1e-4) / grid);
          g.nzDropAt = off + k * grid;
        }
        if (tNow + 0.75 < g.nzDropAt && g.nzDropAt - tNow > 2) g.nzDropAt = off + Math.ceil((tNow - off + 1e-4) / grid) * grid;
        let dropped = 0;
        while (tNow + 1e-4 >= g.nzDropAt && dropped < 2) {
          if (!collides(g.board, g.piece.m, g.piece.x, g.piece.y + 1)) g.piece.y++;
          else { lockPiece(g); syncHud(); g.nzDropAt = null; break; }
          g.nzDropAt = nzSnapTime(g.nzDropAt + interval, grid, off);
          if (g.nzDropAt <= tNow) g.nzDropAt += grid;
          dropped++;
        }
      } else {
        g.nzDropAt = null;
        g.acc += dt;
        if (g.acc >= dropInterval(g.level)) {
          g.acc = 0;
          if (!collides(g.board, g.piece.m, g.piece.x, g.piece.y + 1)) g.piece.y++;
          else { lockPiece(g); syncHud(); }
        }
      }
    }
    try { if (!clearing) invStep(dt); } catch (e) { }
    try { if (!clearing) cityStep(dt); } catch (e) { }
    try {
      if (g && isEffect(cellThemeIdx()) === 'beach') stepStackWash(stackWash, g.board, dt, { reduce: reduceMotion() });
      else if (stackWash.ready) stackWashReset();
    } catch (e) { }
    try {
      if (g && themeFor(g.clearFx ? g.clearFx.level : g.level) === SNOW_THEME) stepBoardSnow(boardSnow, g.board, dt, snowProg(g.lines, g.level), { reduce: reduceMotion() });
      else if (boardSnow.ready) snowReset();
    } catch (e) { }
    try { tickNzFlash(dt); } catch (e) { }
    try {
      if (g && themeFor(g.clearFx ? g.clearFx.level : g.level) === NZ_THEME) {
        if (started && !g.paused && !g.over && !g.demo) tickNzSquawk(dt);
      }
    } catch (e) { }
    musicTick(g.level, musicWanted(g.level, started, g));
    if (g.flashT > 0) g.flashT -= dt;
    if (g.popupT > 0) g.popupT -= dt;
    tickCallout(g, dt);
    const ctx = board.getContext('2d');
    if (ctx) {
      ctx.save();
      if (efx.zoom !== 1 && !reduceMotion()) {
        ctx.translate(board.width / 2, board.height / 2);
        ctx.scale(efx.zoom, efx.zoom);
        ctx.translate(-board.width / 2, -board.height / 2);
      }
      ctx.clearRect(0, 0, board.width, board.height);
      ctx.fillStyle = boardBg;
      ctx.fillRect(0, 0, board.width, board.height);
      // Subtle extra dark backing so the well reads as a window over the theme photo.
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fillRect(0, 0, board.width, board.height);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL + 0.5, 0); ctx.lineTo(c * CELL + 0.5, ROWS * CELL); ctx.stroke(); }
      for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL + 0.5); ctx.lineTo(COLS * CELL, r * CELL + 0.5); ctx.stroke(); }
      const fx = g.clearFx;
      const drawBoard = fx ? fx.snap : g.board;
      const colLines = fx ? fx.lines : g.lines;
      const colLevel = fx ? fx.level : g.level;
      const hitBoard = fx && fx.snapHits ? fx.snapHits : (g.hits || null);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const v = drawBoard[r][c];
        if (v) {
          drawCell(ctx, c * CELL, r * CELL, blockColor(v, colLines, colLevel), CELL, 1, c, r);
          const hits = hitBoard && hitBoard[r] ? (hitBoard[r][c] || 0) : 0;
          if (hits) drawBlockHits(ctx, c * CELL, r * CELL, CELL, hits, now);
        }
      }
      try { if (!sparkHold) tickBlockSpark(now, drawBoard, (!g.over && !fx) ? g.piece : null, reduceMotion()); } catch (e) { }
      try { invDraw(ctx); } catch (e) { }
      try { drawCityCrew(ctx); } catch (e) { }
      try { drawStackWash(ctx); } catch (e) { }
      try { drawSnowCaps(ctx); drawBoardSnow(ctx); } catch (e) { }
      try { drawEffectTrails(ctx); drawEffectRipples(ctx); } catch (e) { }
      if (!g.over && !fx) {
        const p = g.piece;
        let gy = p.y;
        while (!collides(g.board, p.m, p.x, gy + 1)) gy++;
        p.m.forEach((row, r) => row.forEach((v, c) => {
          if (v && gy + r >= 0) drawGhost(ctx, (p.x + c) * CELL, (gy + r) * CELL, blockColor(p.t, g.lines, g.level), CELL, p.x + c, gy + r);
        }));
        p.m.forEach((row, r) => row.forEach((v, c) => {
          if (v && p.y + r >= 0) drawCell(ctx, (p.x + c) * CELL, (p.y + r) * CELL, blockColor(p.t, g.lines, g.level), CELL, 1, p.x + c, p.y + r);
        }));
      }
      try { drawBlockSparks(ctx, now, CELL); } catch (e) { }
      if (fx) drawClearFx(ctx, fx);
      if (g.levelUp) drawLevelUp(ctx, g.levelUp);
      if (g.highScore) drawHighScore(ctx, g.highScore);
      try { drawWellFrame(ctx, board.width, board.height); } catch (e) { }
      ctx.textAlign = 'right';
      ctx.font = '600 16px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(String(g.score), board.width - 8, 22);
      if (g.popupT > 0 && !(fx && fx.banner)) {
        const k = g.popupT / 1100;
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.textAlign = 'center';
        ctx.font = '700 ' + (g.clearFx && g.clearFx.n >= 2 ? '26' : '24') + 'px ' + FONT;
        ctx.fillStyle = '#facc15';
        ctx.fillText(g.popup, board.width / 2, board.height / 2 - 40 - (1 - k) * 40);
        ctx.globalAlpha = 1;
      }
      if (g.callout && g.callout.t > 0 && !g.levelUp && !g.highScore) {
        const cu = g.callout;
        const ck = cu.hold && cu.at != null ? (1 - cu.at) : (cu.t / (cu.dur || CALLOUT_DUR));
        ctx.globalAlpha = Math.min(1, Math.max(0.15, ck * 2));
        ctx.textAlign = 'center';
        ctx.font = '800 28px ' + FONT;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 5;
        ctx.fillStyle = '#fff7ed';
        const cy = board.height / 2 + 22 - (1 - ck) * 22;
        ctx.strokeText(cu.text, board.width / 2, cy);
        ctx.fillText(cu.text, board.width / 2, cy);
        ctx.globalAlpha = 1;
      }
      if (!g.demo && !g.levelUp && !g.highScore && (!started || g.over || g.paused)) {
        ctx.fillStyle = 'rgba(10,11,14,0.72)';
        ctx.fillRect(0, 0, board.width, board.height);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.font = '600 26px ' + FONT;
        ctx.fillText(g.over ? 'Game over' : g.paused ? 'Paused' : 'Tetris', board.width / 2, board.height / 2 - 14);
        ctx.font = '400 14px ' + FONT;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(g.over ? 'Score ' + g.score + '. Tap to play again' : g.paused ? 'Tap or press P to resume' : 'Tap the board to start', board.width / 2, board.height / 2 + 14);
      }
      ctx.restore();
    }
    try { drawStorm(); } catch (e) { }
    drawMini(nextCv, g.next, false);
    drawMini(holdCv, g.hold, !g.canHold);
    raf = requestAnimationFrame(loop);
  }
  function persistLive() {
    if (!g || g.demo) return;
    writeLive(snapshotGame(g, { started: started, musicOn: musicOn, soundOn: soundOn }));
  }
  function bootLive() {
    const snap = readLive(root);
    if (!snap) return;
    const got = applyLive(snap);
    if (!got) return;
    g = got.g;
    started = got.started;
    musicOn = got.musicOn;
    soundOn = got.soundOn;
    g.paused = !g.over;
    themeIdx = themeFor(g.level);
    lookIdx = -1;
    applyLook(themeIdx);
    if (isEffect(themeIdx)) {
      try { lifeCast(isEffect(themeIdx)); lifeFastForward(0, effectProg(g.lines)); } catch (e) { }
    }
    const mb = doc.getElementById('musicbtn'); if (mb) mb.textContent = musicOn ? 'Music on' : 'Music off';
    const sb = doc.getElementById('soundbtn'); if (sb) sb.textContent = soundOn ? 'Sound on' : 'Sound off';
  }
  bootLive();
  syncHud();
  raf = requestAnimationFrame(loop);
  function halt() {
    persistLive();
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (g && !g.over && !g.demo) g.paused = true;
    stopAudio();
    try { syncHud(); } catch (e) { }
  }
  function unhalt() {
    if (g && !g.demo && started && !g.over) g.paused = true;
    if (!raf) raf = requestAnimationFrame(loop);
    try { syncHud(); } catch (e) { }
  }
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) halt(); else unhalt(); });

  // 1.9.172 Full screen: fill the phone edge to edge. Driven by the parent
  // Full screen button (postMessage) or by the page itself. If the Fullscreen
  // API is missing (iPhone), a fixed 100dvw × 100dvh overlay is used instead.
  function isFull() { return !!(doc.documentElement && doc.documentElement.classList.contains('fs')); }
  function layoutBoard() {
    const cv = doc.getElementById('board');
    const row = doc.querySelector('.boardrow');
    const side = doc.querySelector('.side');
    if (!cv || !row) return;
    if (!isFull()) { cv.style.width = ''; cv.style.height = ''; return; }
    const r = row.getBoundingClientRect();
    const sideW = side && !row.classList.contains('no-side') ? side.getBoundingClientRect().width : 0;
    const gap = 8;
    const availW = Math.max(48, r.width - sideW - gap);
    const availH = Math.max(48, r.height);
    let h = availH, w = h / 2;
    if (w > availW) { w = availW; h = w * 2; }
    cv.style.width = Math.floor(w) + 'px';
    cv.style.height = Math.floor(h) + 'px';
  }
  function setFull(on, from) {
    const html = doc.documentElement, body = doc.body;
    on = !!on;
    html.classList.toggle('fs', on);
    if (body) body.classList.toggle('fs', on);
    if (from === 'parent') {
      html.classList.toggle('fs-from-parent', on);
      html.classList.toggle('fs-overlay', on);
    } else if (on) {
      const can = html.requestFullscreen || html.webkitRequestFullscreen;
      const inFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
      if (can && !inFs) {
        const p = can.call(html);
        if (p && p.catch) p.catch(() => { html.classList.add('fs-overlay'); });
      } else if (!can) html.classList.add('fs-overlay');
    } else {
      html.classList.remove('fs-overlay', 'fs-from-parent');
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        const ex = doc.exitFullscreen || doc.webkitExitFullscreen;
        if (ex) { const p = ex.call(doc); if (p && p.catch) p.catch(() => { }); }
      }
    }
    layoutBoard();
    if (root.requestAnimationFrame) root.requestAnimationFrame(layoutBoard);
  }
  root.addEventListener('message', e => {
    const d = e && e.data;
    if (!d || d.type !== 'ib-artfull') return;
    setFull(!!d.on, 'parent');
  });
  doc.addEventListener('fullscreenchange', () => {
    if (doc.documentElement.classList.contains('fs-from-parent')) return;
    setFull(!!doc.fullscreenElement, 'event');
  });
  doc.addEventListener('webkitfullscreenchange', () => {
    if (doc.documentElement.classList.contains('fs-from-parent')) return;
    setFull(!!doc.webkitFullscreenElement, 'event');
  });
  root.addEventListener('resize', layoutBoard);
  if (root.visualViewport) root.visualViewport.addEventListener('resize', layoutBoard);
  root.Tetris.setFull = setFull;
  root.Tetris.layoutBoard = layoutBoard;
  root.Tetris.isFull = isFull;
  root.addEventListener('pagehide', halt);
  root.addEventListener('pageshow', ev => { if (ev && ev.persisted) unhalt(); else unhalt(); });
  function tryAutoFull() {
    if (isFull()) return;
    setFull(true, 'auto');
  }
  if (board) board.addEventListener('pointerdown', tryAutoFull, { capture: true });
  root.Tetris.persistLive = persistLive;
  root.Tetris.bootLive = bootLive;
  root.Tetris.halt = halt;
  root.Tetris.unhalt = unhalt;
  root.Tetris.tryAutoFull = tryAutoFull;
  root.Tetris.city = () => city;
  root.Tetris.cityReset = cityReset;
  root.Tetris.citySeed = citySeed;
})(typeof window !== 'undefined' ? window : globalThis);

