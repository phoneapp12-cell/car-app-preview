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

  function ensureAudio() {
    try {
      if (!ac) {
        const Ctor = root.AudioContext || root.webkitAudioContext;
        if (!Ctor) return;
        ac = new Ctor();
        sfxGain = ac.createGain();
        sfxGain.gain.value = 0.48;
        const sfxSoft = ac.createBiquadFilter(); // take the sharp top off every sound
        sfxSoft.type = 'lowpass'; sfxSoft.frequency.value = 1400;
        sfxGain.connect(sfxSoft); sfxSoft.connect(ac.destination);
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
  // Six calm themes (Beach, Rainforest, Ocean, Bush walk, City, Night sky); music, sounds, colours and background change every level, cycling round (1-5, 6-10, ... 26-30 and beyond).
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
    { name: 'Rainforest', beat: 0.7, pad: 'triangle', ambient: 'rain', critter: 'bird', pitch: 1.122, sfx: 'triangle',
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
    { colors: ['#84cc16', '#16a34a', '#f59e0b', '#facc15', '#22c55e', '#10b981', '#f97316'], bg: 'linear-gradient(180deg,#052e16 0%,#14532d 55%,#3f6212 100%)', board: 'rgba(3,24,10,0.55)' },
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
  // Level order (indexes into THEMES): Farmyard, Jeremiah was a bullfrog, Beach, Rainforest, Ocean, Bush walk, New Zealand, Snowy mountains, City, Night sky, Triangles, Space travel last.
  const ORDER = [6, 11, 0, 1, 2, 3, 9, 10, 4, 5, 8, 7];
  function themeFor(level) { return ORDER[(Math.max(1, level) - 1) % ORDER.length]; }
  // 1.9.151 Triangle Tetris (theme 8, level 11, second to last): blocks are triangles, and only two colours at a time.
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
  // never the falling piece, and blocks above do not drop.
  const SPACE_THEME = 7;
  function bombWaitRange(level) {
    const t = Math.max(0, Math.min(1, (Math.max(1, level) - 12) / 24));
    return [11 - 3 * t, 15 - 3 * t];
  }
  function bombWait(level) {
    const [lo, hi] = bombWaitRange(level);
    return (lo + Math.random() * (hi - lo)) * 1000;
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
    if (g.board[r][c]) { g.board[r][c] = 0; return 'block'; }
    return 'empty';
  }
  function sfx(name) {
    if (!soundOn || !ac) return;
    const d = sfxGain, T = THEMES[themeIdx], m = T.pitch * 0.5, w = 'sine', lo = f => nf(f) / 2;
    switch (name) {
      // Soft chimes and drops, pitched and voiced to the current theme.
      case 'move': tone(880 * m, 0.05, w, 0.05, 0, 0, d); break;
      case 'rotate': tone(700 * m, 0.09, w, 0.09, 0, 1200 * m, d); break;
      case 'soft': tone(520 * m, 0.03, w, 0.03, 0, 0, d); break;
      case 'drop': tone(420 * m, 0.22, w, 0.12, 0, 160 * m, d); break;
      case 'lock': tone(330 * m, 0.12, 'triangle', 0.08, 0, 260 * m, d); break;
      case 'hold': tone(784 * m, 0.18, w, 0.08, 0, 0, d); tone(1047 * m, 0.22, w, 0.07, 0.08, 0, d); break;
      case 'clear': [0, 2, 3].forEach((k, i) => tone(lo(T.bells[k]), 0.5, w, 0.09, i * 0.09, 0, d)); break;
      case 'tetris': [0, 1, 2, 3, 4, 5].forEach((k, i) => tone(lo(T.bells[k]), 0.7, w, 0.09, i * 0.09, 0, d)); break;
      case 'level': [1, 2, 3, 5].forEach((k, i) => tone(lo(T.bells[k]), 0.6, w, 0.08, i * 0.12, 0, d)); break;
      case 'over': [5, 3, 2, 0].forEach((k, i) => tone(nf(T.bells[k]) / 2, 0.9, 'sine', 0.09, i * 0.3, 0, d)); break;
      case 'thump': {
        // Muffled low thump for a space-invader bomb (extra-low lowpass, no zap or chirp).
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 400;
        lp.connect(d);
        tone(88, 0.28, 'sine', 0.07, 0, 46, lp);
        tone(56, 0.36, 'triangle', 0.045, 0.03, 34, lp);
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
  function newGame() {
    const g = { board: emptyBoard(), piece: spawn(1), bag: refillBag(), next: 0, hold: 0, canHold: true, score: 0, lines: 0, level: 1, over: false, paused: false, acc: 0, flashT: 0, popup: '', popupT: 0 };
    g.piece = spawn(takeNext(g));
    g.next = takeNext(g);
    return g;
  }
  function dropInterval(level) { return Math.max(60, 800 * Math.pow(0.85, level - 1)); }
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
    const full = [];
    for (let r = 0; r < ROWS; r++) if (g.board[r].every(v => v !== 0)) full.push(r);
    if (full.length) {
      const oldLevel = g.level;
      g.board = g.board.filter((_, i) => full.indexOf(i) < 0);
      while (g.board.length < ROWS) g.board.unshift(Array(COLS).fill(0));
      const pts = LINE_POINTS[full.length] * g.level;
      g.lines += full.length;
      g.score += pts;
      g.level = Math.floor(g.lines / 10) + 1;
      g.flashT = 180;
      g.popup = LINE_WORDS[full.length] + ' +' + pts;
      g.popupT = 1100;
      sfx(full.length === 4 ? 'tetris' : 'clear');
      if (g.level > oldLevel) { themeIdx = themeFor(g.level); noteIdx = 0; setTimeout(() => sfx('level'), 350); g.popup = 'Level ' + g.level + '! +' + pts; }
    } else sfx('lock');
    g.piece = spawn(g.next);
    g.next = takeNext(g);
    g.canHold = true;
    if (collides(g.board, g.piece.m, g.piece.x, g.piece.y)) { g.over = true; sfx('over'); }
    return g;
  }
  function act(g, a) {
    ensureAudio();
    if (a === 'pause') { if (!g.over) g.paused = !g.paused; return g; }
    if (a === 'restart') { noteIdx = 0; themeIdx = 0; return newGame(); }
    if (g.over || g.paused) return g;
    const p = g.piece;
    if (a === 'left' || a === 'right') {
      const dx = a === 'left' ? -1 : 1;
      if (!collides(g.board, p.m, p.x + dx, p.y)) { p.x += dx; sfx('move'); }
    } else if (a === 'down') {
      if (!collides(g.board, p.m, p.x, p.y + 1)) { p.y++; g.score += 1; g.acc = 0; sfx('soft'); }
      else lockPiece(g);
    } else if (a === 'drop') {
      let d = 0;
      while (!collides(g.board, p.m, p.x, p.y + 1)) { p.y++; d++; }
      g.score += d * 2;
      sfx('drop');
      lockPiece(g);
    } else if (a === 'rotate' || a === 'rotateBack') {
      const m = a === 'rotate' ? rotateCW(p.m) : rotateCCW(p.m);
      const kicks = [0, -1, 1, -2, 2];
      for (const k of kicks) {
        if (!collides(g.board, m, p.x + k, p.y)) { p.m = m; p.x += k; sfx('rotate'); break; }
        if (!collides(g.board, m, p.x + k, p.y - 1)) { p.m = m; p.x += k; p.y -= 1; sfx('rotate'); break; }
      }
    } else if (a === 'hold' && g.canHold) {
      const cur = p.t;
      if (g.hold) g.piece = spawn(g.hold);
      else { g.piece = spawn(g.next); g.next = takeNext(g); }
      g.hold = cur;
      g.canHold = false;
      sfx('hold');
    }
    return g;
  }
  // 1.9.145 Real recorded music, one track per theme (tetris-bg/m<theme>.mp3, Kevin MacLeod, CC BY 4.0).
  // It speeds up a little each level (pitch kept), and the old generated music is no longer played.
  let bgm = null, bgmIdx = -1, bgmWant = false;
  function bgmEl() {
    if (!bgm && root.Audio) { bgm = new root.Audio(); bgm.loop = true; bgm.preload = 'auto'; bgm.volume = 0.5; try { bgm.preservesPitch = true; } catch (e) { } }
    return bgm;
  }
  function musicTick(level, running) {
    const a = bgmEl(); if (!a) return;
    const want = !!(musicOn && running);
    if (!want) { if (bgmWant) { bgmWant = false; a.pause(); } return; }
    const ti = themeFor(level || 1);
    if (ti !== bgmIdx) { bgmIdx = ti; a.src = 'tetris-bg/m' + ti + '.mp3'; bgmWant = false; }
    const lv = Math.max(1, level || 1), rate = Math.min(1.25, 1 + (lv - 1) * 0.02);
    if (Math.abs(a.playbackRate - rate) > 0.001) a.playbackRate = rate;
    if (!bgmWant) { bgmWant = true; try { const p = a.play(); if (p && p.catch) p.catch(() => { bgmWant = false; }); } catch (e) { bgmWant = false; } }
  }
  function stopAudio() {
    if (bgm) { try { bgm.pause(); } catch (e) { } bgmWant = false; }
    if (ac) { try { ac.close(); } catch (e) { } }
    ac = null; sfxGain = null; musicGain = null; melodyBus = null; noiseBuf = null;
  }
  root.Tetris = { THEMES, LOOKS, PICS, themeFor, SHAPES, COLORS, TRI_THEME, TRI_PAL, triangleLate, trianglePalette, blockColor, SPACE_THEME, bombWaitRange, bombWait, pieceCovers, applyBombHit, emptyBoard, rotateCW, rotateCCW, collides, newGame, lockPiece, act, dropInterval, spawn, stopAudio, audio: () => ac && ac.state };

  if (!root.document) return;
  const doc = root.document;
  let g = newGame();
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
    set('best', Math.max(best, g.score));
    const pb = doc.getElementById('pausebtn'); if (pb) pb.textContent = g.paused ? 'Resume' : 'Pause';
    const rb = doc.getElementById('restartbtn'); if (rb) rb.textContent = g.over ? 'Play again' : 'Restart';
    if (g.over) {
      best = Math.max(best, g.score);
      try { root.localStorage.setItem('tetris-best', String(best)); } catch (e) { }
      if (!g.scored) { g.scored = true; gameOverScores(g); }
    }
  }
  // 1.9.149 family scoreboard (scores.js): send the finished game once, then show the board over the game
  const SB = { acc: '#facc15', btn: '#3f3a12' };
  function gameOverScores(gm) {
    const S = root.IBScores; if (!S || !started) return;
    const sent = gm.score > 0 ? S.submit('tetris', { score: gm.score, lines: gm.lines, level: gm.level }, { note: gm.lines + ' lines' }) : null;
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
    if (a === 'restart') { g = next; if (root.IBScores) root.IBScores.close(); }
    syncHud();
  }
  root.Tetris.press = press;
  root.Tetris.view = () => ({ x: g.piece.x, y: g.piece.y, t: g.piece.t, score: g.score, lines: g.lines, paused: g.paused, over: g.over, started, musicOn, soundOn });
  // Seed a still board (used for screenshots and checks). No overlay, no gravity, music off.
  root.Tetris.show = function (opts) {
    opts = opts || {};
    started = true; musicOn = false; soundOn = false;
    g = newGame();
    g.lines = opts.lines || 0;
    g.level = Math.floor(g.lines / 10) + 1;
    g.score = opts.score || 0;
    g.paused = false; g.over = false; g.demo = true; g.acc = 0; g.popupT = 0; g.flashT = 0;
    if (opts.board) g.board = opts.board;
    if (opts.piece) g.piece = opts.piece;
    if (opts.next != null) g.next = opts.next;
    if (opts.hold != null) { g.hold = opts.hold; g.canHold = true; }
    themeIdx = themeFor(g.level);
    lookIdx = -1;
    applyLook(themeIdx);
    syncHud();
    const mb = doc.getElementById('musicbtn'); if (mb) mb.textContent = 'Music off';
    const sb = doc.getElementById('soundbtn'); if (sb) sb.textContent = 'Sound off';
    invSeed(opts);
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
  doc.getElementById('soundbtn').addEventListener('click', () => {
    soundOn = !soundOn; ensureAudio();
    doc.getElementById('soundbtn').textContent = soundOn ? 'Sound on' : 'Sound off';
  });
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rotate', x: 'rotate', X: 'rotate', z: 'rotateBack', Z: 'rotateBack', ' ': 'drop', c: 'hold', C: 'hold', Shift: 'hold', p: 'pause', P: 'pause', Escape: 'pause', r: 'restart', R: 'restart' };
  root.addEventListener('keydown', e => {
    if (e.key === 'm' || e.key === 'M') { musicOn = !musicOn; ensureAudio(); const b = doc.getElementById('musicbtn'); if (b) b.textContent = musicOn ? 'Music on' : 'Music off'; return; }
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
    ctx.globalAlpha = 1;
  }
  function drawGhost(ctx, x, y, color, size, col, row) {
    if (themeFor(g.level) === TRI_THEME) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, size * 0.08);
      triPath(ctx, x, y, size, col, row);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(x + 2.5, y + 2.5, size - 5, size - 5);
    ctx.globalAlpha = 1;
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
    doc.documentElement.style.background = 'linear-gradient(rgba(0,0,0,.28),rgba(0,0,0,.28)), url("' + PICS[i] + '") center / cover no-repeat, ' + L.bg;
    try { const nx = new root.Image(); nx.src = PICS[(i + 1) % PICS.length]; } catch (e) { }
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
    if (fx.off) return;
    fxInit(); if (!fx.ctx) return;
    if (fx.theme !== lookIdx) fxTheme(lookIdx < 0 ? 0 : lookIdx);
    const t = now / 1000, dt = Math.min(0.05, fx.last ? t - fx.last : 0); fx.last = t;
    const c = fx.ctx; c.clearRect(0, 0, fx.w, fx.h);
    for (let i = 0; i < fx.list.length; i++) {
      let o = fx.list[i]; const k = o.k, m = k.m;
      let a = k.a, rot = 0, flip = o.dir > 0;
      if (k.vy) o.y0 += k.vy * dt;
      if (m === 'snow') { o.y += o.sp * dt; o.x += Math.sin(t * 0.7 + o.ph) * 10 * dt; }
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
  }
  // Pixel invaders on the Space travel board. They drift; bombs fall slowly down a column.
  const INV_PX = 2, INV_GAP = 48, INV_COUNT = 5;
  const INV_W = 11 * INV_PX, INV_H = 8 * INV_PX;
  const INV_SPRITES = [
    [['..#.....#..','...#...#...','..#######..','.##.#.#.##.','###########','#.#.###.#.#','#.#.....#.#','...##.##...'],
     ['..#.....#..','#..#...#..#','#.#######.#','###.#.#.###','.#########.','..#.###.#..','..#.....#..','.#.......#.' ]],
    [['...#.#.....','..#####....','.#######...','.#.#.#.#...','#########..','.#####.#...','#.#...#.#..','.#.#.......'],
     ['...#.#.....','..#####....','.#######...','#.#.#.#.#..','#########..','.#.#####...','..#...#.#..','.......#.#.']]
  ];
  const inv = { ready: false, x: 12, dir: 1, wait: 0, bombs: [], boom: [], t: 0 };
  function invReset() {
    inv.ready = true; inv.x = 12; inv.dir = 1; inv.bombs = []; inv.boom = []; inv.t = 0;
    inv.wait = themeFor(g.level) === SPACE_THEME ? bombWait(g.level) : 0;
  }
  function invSeed(opts) {
    opts = opts || {};
    if (themeFor(g.level) !== SPACE_THEME) { inv.ready = false; inv.bombs = []; inv.boom = []; return; }
    invReset();
    inv.wait = 1e9;
    if (opts.invX != null) inv.x = opts.invX;
    if (opts.bomb) inv.bombs.push(opts.bomb);
    if (opts.boom) inv.boom = opts.boom.slice();
  }
  function invDrop() {
    const choices = [];
    for (let i = 0; i < INV_COUNT; i++) {
      const cx = inv.x + i * INV_GAP + INV_W / 2;
      const col = Math.max(0, Math.min(COLS - 1, Math.floor(cx / CELL)));
      choices.push({ cx, col, stacked: g.board.some(row => row[col]) });
    }
    const stacked = choices.filter(c => c.stacked);
    const pool = stacked.length ? stacked : choices;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    inv.bombs.push({ x: pick.cx, y: INV_H + 10, col: pick.col, vy: 2.2 * CELL });
  }
  function invMoveBombs(dt) {
    const keep = [];
    for (const b of inv.bombs) {
      const from = Math.floor(b.y / CELL);
      b.y += b.vy * dt / 1000;
      const to = Math.floor(b.y / CELL);
      let dead = false;
      for (let r = from; r <= to; r++) {
        const hit = applyBombHit(g, b.col, r);
        if (hit === 'block') {
          inv.boom.push({ c: b.col, r: r, t: 420 });
          sfx('thump');
          dead = true;
          break;
        }
        if (hit === 'gone') { dead = true; break; }
      }
      if (!dead && b.y < ROWS * CELL + 10) keep.push(b);
    }
    inv.bombs = keep;
  }
  function invStep(dt) {
    if (themeFor(g.level) !== SPACE_THEME) { if (inv.ready) { inv.ready = false; inv.bombs = []; inv.boom = []; } return; }
    if (!inv.ready) invReset();
    inv.t += dt;
    if (g.demo) return; // keep a seeded still for screenshots
    if (inv.boom.length) {
      for (const e of inv.boom) e.t -= dt;
      inv.boom = inv.boom.filter(e => e.t > 0);
    }
    const moving = started && !g.over && !g.paused;
    if (!moving) return;
    const span = COLS * CELL - ((INV_COUNT - 1) * INV_GAP + INV_W) - 36; // leave room for the on-board score
    inv.x += inv.dir * 22 * (dt / 1000);
    if (inv.x < 4) { inv.x = 4; inv.dir = 1; }
    if (inv.x > span - 4) { inv.x = span - 4; inv.dir = -1; }
    if (!g.demo) {
      if (inv.bombs.length === 0) {
        inv.wait -= dt;
        if (inv.wait <= 0) { invDrop(); inv.wait = bombWait(g.level); }
      }
      invMoveBombs(dt);
    }
  }
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
      const k = Math.max(0, e.t / 420), cx = e.c * CELL + CELL / 2, cy = e.r * CELL + CELL / 2;
      const rad = 5 + 12 * (1 - k);
      ctx.globalAlpha = 0.35 * k;
      ctx.fillStyle = '#f3d7a0';
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 0.7 * k;
      ctx.fillStyle = '#e8b86a';
      ctx.beginPath(); ctx.arc(cx, cy, rad * 0.45, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  let last = performance.now();
  function loop(now) {
    applyLook(themeFor(g.level));
    try { fxDraw(now); } catch (e) { fx.off = true; }
    const dt = now - last;
    last = now;
    const running = started && !g.over && !g.paused && !g.demo;
    if (running) {
      g.acc += dt;
      if (g.acc >= dropInterval(g.level)) {
        g.acc = 0;
        if (!collides(g.board, g.piece.m, g.piece.x, g.piece.y + 1)) g.piece.y++;
        else { lockPiece(g); syncHud(); }
      }
    }
    try { invStep(dt); } catch (e) { }
    musicTick(g.level, running);
    if (g.flashT > 0) g.flashT -= dt;
    if (g.popupT > 0) g.popupT -= dt;
    const ctx = board.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, board.width, board.height);
      ctx.fillStyle = boardBg;
      ctx.fillRect(0, 0, board.width, board.height);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL + 0.5, 0); ctx.lineTo(c * CELL + 0.5, ROWS * CELL); ctx.stroke(); }
      for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL + 0.5); ctx.lineTo(COLS * CELL, r * CELL + 0.5); ctx.stroke(); }
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const v = g.board[r][c];
        if (v) drawCell(ctx, c * CELL, r * CELL, blockColor(v, g.lines, g.level), CELL, 1, c, r);
      }
      try { invDraw(ctx); } catch (e) { }
      if (!g.over) {
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
      if (g.flashT > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (g.flashT / 180) * 0.35 + ')';
        ctx.fillRect(0, 0, board.width, board.height);
      }
      ctx.textAlign = 'right';
      ctx.font = '600 16px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(String(g.score), board.width - 8, 22);
      if (g.popupT > 0) {
        const k = g.popupT / 1100;
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.textAlign = 'center';
        ctx.font = '700 24px ' + FONT;
        ctx.fillStyle = '#facc15';
        ctx.fillText(g.popup, board.width / 2, board.height / 2 - 40 - (1 - k) * 40);
        ctx.globalAlpha = 1;
      }
      if (!g.demo && (!started || g.over || g.paused)) {
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
    }
    drawMini(nextCv, g.next, false);
    drawMini(holdCv, g.hold, !g.canHold);
    raf = requestAnimationFrame(loop);
  }
  syncHud();
  raf = requestAnimationFrame(loop);
  function halt() { if (raf) cancelAnimationFrame(raf); raf = 0; g.paused = true; stopAudio(); }
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) halt(); });
  root.addEventListener('pagehide', halt);
})(typeof window !== 'undefined' ? window : globalThis);
