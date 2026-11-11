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
        sfxGain.gain.value = 0.4;
        sfxGain.connect(ac.destination);
        musicGain = ac.createGain();
        musicGain.gain.value = 0.22;
        musicGain.connect(ac.destination);
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
  // Six calm themes; music and sounds change every 5 levels (1-5, 6-10, ... 26-30 and beyond).
  const SEMI = { C: 0, CS: 1, D: 2, DS: 3, E: 4, F: 5, FS: 6, G: 7, GS: 8, A: 9, AS: 10, B: 11 };
  function nf(n) {
    const oct = parseInt(n.slice(-1), 10);
    const midi = 12 * (oct + 1) + SEMI[n.slice(0, -1)];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  const THEMES = [
    { name: 'Ocean', beat: 0.75, pad: 'sine', ambient: 'wave', critter: 'dolphin', pitch: 1, sfx: 'sine',
      chords: [['F3', 'A3', 'C4', 'E4'], ['C3', 'G3', 'B3', 'E4'], ['A2', 'E3', 'G3', 'C4'], ['G2', 'D3', 'G3', 'B3']],
      bells: ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'] },
    { name: 'Rainforest', beat: 0.7, pad: 'triangle', ambient: 'rain', critter: 'bird', pitch: 1.122, sfx: 'triangle',
      chords: [['D3', 'A3', 'D4', 'FS4'], ['B2', 'FS3', 'A3', 'D4'], ['G2', 'D3', 'B3', 'D4'], ['A2', 'E3', 'A3', 'CS4']],
      bells: ['D5', 'E5', 'FS5', 'A5', 'B5', 'D6'] },
    { name: 'Starry night', beat: 0.85, pad: 'sine', ambient: 'shimmer', critter: 'twinkle', pitch: 1.335, sfx: 'sine',
      chords: [['E3', 'B3', 'DS4', 'GS4'], ['CS3', 'GS3', 'B3', 'E4'], ['A2', 'E3', 'GS3', 'CS4'], ['B2', 'FS3', 'A3', 'DS4']],
      bells: ['E5', 'FS5', 'GS5', 'B5', 'CS6', 'E6'] },
    { name: 'Coral reef', beat: 0.65, pad: 'triangle', ambient: 'bubbles', critter: 'bubble', pitch: 0.891, sfx: 'triangle',
      chords: [['AS2', 'F3', 'A3', 'D4'], ['G2', 'D3', 'F3', 'AS3'], ['DS3', 'AS3', 'D4', 'G4'], ['F2', 'C3', 'F3', 'A3']],
      bells: ['AS4', 'C5', 'D5', 'F5', 'G5', 'AS5'] },
    { name: 'Northern lights', beat: 0.9, pad: 'sine', ambient: 'shimmer', critter: 'twinkle', pitch: 0.794, sfx: 'sine',
      chords: [['A2', 'E3', 'B3', 'C4'], ['F2', 'C3', 'G3', 'A3'], ['C3', 'G3', 'B3', 'E4'], ['G2', 'D3', 'A3', 'B3']],
      bells: ['A4', 'B4', 'C5', 'E5', 'G5', 'A5'] },
    { name: 'Deep sea', beat: 1, pad: 'sine', ambient: 'wave', critter: 'whale', pitch: 0.667, sfx: 'sine',
      chords: [['D2', 'A2', 'F3', 'C4'], ['AS1', 'F2', 'D3', 'A3'], ['G2', 'D3', 'AS3', 'D4'], ['A2', 'E3', 'G3', 'CS4']],
      bells: ['D4', 'F4', 'G4', 'A4', 'C5', 'D5'] }
  ];
  let themeIdx = 0;
  function themeFor(level) { return Math.max(0, Math.min(THEMES.length - 1, Math.floor((level - 1) / 5))); }
  function sfx(name) {
    if (!soundOn || !ac) return;
    const d = sfxGain, T = THEMES[themeIdx], m = T.pitch, w = T.sfx;
    switch (name) {
      // Soft chimes and drops, pitched and voiced to the current theme.
      case 'move': tone(880 * m, 0.05, w, 0.05, 0, 0, d); break;
      case 'rotate': tone(700 * m, 0.09, w, 0.09, 0, 1200 * m, d); break;
      case 'soft': tone(520 * m, 0.03, w, 0.03, 0, 0, d); break;
      case 'drop': tone(420 * m, 0.22, w, 0.12, 0, 160 * m, d); break;
      case 'lock': tone(330 * m, 0.12, 'triangle', 0.08, 0, 260 * m, d); break;
      case 'hold': tone(784 * m, 0.18, w, 0.08, 0, 0, d); tone(1047 * m, 0.22, w, 0.07, 0.08, 0, d); break;
      case 'clear': [0, 2, 3].forEach((k, i) => tone(nf(T.bells[k]), 0.5, w, 0.09, i * 0.09, 0, d)); break;
      case 'tetris': [0, 1, 2, 3, 4, 5].forEach((k, i) => tone(nf(T.bells[k]), 0.7, w, 0.09, i * 0.09, 0, d)); break;
      case 'level': [1, 2, 3, 5].forEach((k, i) => tone(nf(THEMES[themeIdx].bells[k]), 0.6, w, 0.08, i * 0.12, 0, d)); break;
      case 'over': [5, 3, 2, 0].forEach((k, i) => tone(nf(T.bells[k]) / 2, 0.9, 'sine', 0.09, i * 0.3, 0, d)); break;
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
      if (T.ambient === 'wave' && b % 2 === 0) add(b * 4, { v: 'wave', d: 8 });
      if (T.ambient === 'rain') add(b * 4, { v: 'rain', d: 4.2 });
      if (T.ambient === 'shimmer' && b % 2 === 1) add(b * 4, { v: 'shimmer', f: nf(T.bells[5]), d: 6 });
      if (T.ambient === 'bubbles') [0.5, 1.75, 3].forEach(p => add(b * 4 + p, { v: 'bubble' }));
    }
    for (const [pos, k] of BELLS) add(pos, { v: 'bell', f: nf(T.bells[k]), d: 3 });
    [7, 23].forEach(p => add(p, { v: T.critter }));
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
  function playEvent(e, at, beat, T) {
    if (!ac || !musicGain) return;
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
      [1, 2.01].forEach((m, i) => {
        const o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(e.f * m, at);
        const g = ac.createGain();
        const d = e.d * beat * (i ? 0.5 : 1);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(i ? 0.025 : 0.09, at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, at + d);
        o.connect(g); g.connect(melodyBus); o.start(at); o.stop(at + d + 0.05);
      });
    } else if (e.v === 'wave' && noiseBuf) noiseSwell(at, e.d * beat, 0.12, 250, 900);
    else if (e.v === 'rain' && noiseBuf) {
      const src = ac.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      const f = ac.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.6;
      const g = ac.createGain();
      const d = e.d * beat;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(0.05, at + 0.6);
      g.gain.setValueAtTime(0.05, at + d - 0.6);
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
    } else if (e.v === 'whale') {
      blip(180, 320, 140, at, 2.6, 0.05, melodyBus);
      blip(240, 400, 200, at + 2, 2.2, 0.035, melodyBus);
    }
  }
  function scheduleMusic(level) {
    if (!ac || !musicGain) return;
    const ti = themeFor(level || 1);
    if (ti !== themeIdx) { themeIdx = ti; noteIdx = 0; }
    const T = THEMES[themeIdx], steps = STEPS[themeIdx], beat = T.beat;
    if (nextNoteTime < ac.currentTime) nextNoteTime = ac.currentTime + 0.05;
    while (nextNoteTime < ac.currentTime + 0.25) {
      const evs = steps[noteIdx % steps.length];
      for (const e of evs) playEvent(e, nextNoteTime, beat, T);
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
  function stopAudio() {
    if (ac) { try { ac.close(); } catch (e) { } }
    ac = null; sfxGain = null; musicGain = null; melodyBus = null; noiseBuf = null;
  }
  root.Tetris = { THEMES, themeFor, SHAPES, COLORS, emptyBoard, rotateCW, rotateCCW, collides, newGame, lockPiece, act, dropInterval, spawn, stopAudio, audio: () => ac && ac.state };

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
    }
  }
  function press(a) {
    if (!started) started = true;
    const next = act(g, a);
    if (a === 'restart') g = next;
    syncHud();
  }
  root.Tetris.press = press;
  root.Tetris.view = () => ({ x: g.piece.x, y: g.piece.y, t: g.piece.t, score: g.score, lines: g.lines, paused: g.paused, over: g.over, started, musicOn, soundOn });
  doc.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-act]');
    if (b) press(b.dataset.act);
  });
  doc.getElementById('musicbtn').addEventListener('click', () => {
    musicOn = !musicOn; ensureAudio();
    doc.getElementById('musicbtn').textContent = musicOn ? 'Music on' : 'Music off';
  });
  doc.getElementById('soundbtn').addEventListener('click', () => {
    soundOn = !soundOn; ensureAudio();
    doc.getElementById('soundbtn').textContent = soundOn ? 'Sound on' : 'Sound off';
  });
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rotate', x: 'rotate', X: 'rotate', z: 'rotateBack', Z: 'rotateBack', ' ': 'drop', c: 'hold', C: 'hold', Shift: 'hold', p: 'pause', P: 'pause', Escape: 'pause', r: 'restart', R: 'restart' };
  root.addEventListener('keydown', e => {
    if (e.key === 'm' || e.key === 'M') { musicOn = !musicOn; ensureAudio(); const b = doc.getElementById('musicbtn'); if (b) b.textContent = musicOn ? 'Music on' : 'Music off'; return; }
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
  function drawCell(ctx, x, y, color, size, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(x + 1, y + 1, size - 2, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + 1, y + size - 5, size - 2, 4);
    ctx.globalAlpha = 1;
  }
  function drawMini(cv, t, dim) {
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#14161c';
    ctx.fillRect(0, 0, cv.width, cv.height);
    if (!t) return;
    const m = SHAPES[t];
    const s = 16;
    let minR = 9, maxR = -1, minC = 9, maxC = -1;
    m.forEach((row, r) => row.forEach((v, c) => { if (v) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); } }));
    const w = (maxC - minC + 1) * s, h = (maxR - minR + 1) * s;
    const ox = (cv.width - w) / 2, oy = (cv.height - h) / 2;
    m.forEach((row, r) => row.forEach((v, c) => { if (v) drawCell(ctx, ox + (c - minC) * s, oy + (r - minR) * s, COLORS[t], s, dim ? 0.35 : 1); }));
  }
  let last = performance.now();
  function loop(now) {
    const dt = now - last;
    last = now;
    const running = started && !g.over && !g.paused;
    if (running) {
      g.acc += dt;
      if (g.acc >= dropInterval(g.level)) {
        g.acc = 0;
        if (!collides(g.board, g.piece.m, g.piece.x, g.piece.y + 1)) g.piece.y++;
        else { lockPiece(g); syncHud(); }
      }
      if (musicOn && ac && ac.state === 'running') scheduleMusic(g.level);
      else if (ac) nextNoteTime = ac.currentTime + 0.05;
    } else if (ac) nextNoteTime = ac.currentTime + 0.05;
    if (g.flashT > 0) g.flashT -= dt;
    if (g.popupT > 0) g.popupT -= dt;
    const ctx = board.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#14161c';
      ctx.fillRect(0, 0, board.width, board.height);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL + 0.5, 0); ctx.lineTo(c * CELL + 0.5, ROWS * CELL); ctx.stroke(); }
      for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL + 0.5); ctx.lineTo(COLS * CELL, r * CELL + 0.5); ctx.stroke(); }
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const v = g.board[r][c];
        if (v) drawCell(ctx, c * CELL, r * CELL, COLORS[v], CELL, 1);
      }
      if (!g.over) {
        const p = g.piece;
        let gy = p.y;
        while (!collides(g.board, p.m, p.x, gy + 1)) gy++;
        p.m.forEach((row, r) => row.forEach((v, c) => {
          if (v && gy + r >= 0) {
            ctx.strokeStyle = COLORS[p.t];
            ctx.globalAlpha = 0.5;
            ctx.strokeRect((p.x + c) * CELL + 2.5, (gy + r) * CELL + 2.5, CELL - 5, CELL - 5);
            ctx.globalAlpha = 1;
          }
        }));
        p.m.forEach((row, r) => row.forEach((v, c) => {
          if (v && p.y + r >= 0) drawCell(ctx, (p.x + c) * CELL, (p.y + r) * CELL, COLORS[p.t], CELL, 1);
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
      if (!started || g.over || g.paused) {
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
