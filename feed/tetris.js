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
        sfxGain.gain.value = 0.3;
        const sfxSoft = ac.createBiquadFilter(); // take the sharp top off every sound
        sfxSoft.type = 'lowpass'; sfxSoft.frequency.value = 1400;
        sfxGain.connect(sfxSoft); sfxSoft.connect(ac.destination);
        musicGain = ac.createGain();
        musicGain.gain.value = 0.16;
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
      bells: ['E5', 'FS5', 'GS5', 'B5', 'CS6', 'E6'] }
  ];
  // Colours and see-through backgrounds for each theme (same order as THEMES).
  const LOOKS = [
    { colors: ['#22d3ee', '#0ea5e9', '#fb923c', '#fde047', '#2dd4bf', '#f472b6', '#f87171'], bg: 'linear-gradient(180deg,#38bdf8 0%,#7dd3fc 45%,#fcd34d 85%,#f5d08a 100%)', board: 'rgba(8,47,73,0.5)' },
    { colors: ['#84cc16', '#16a34a', '#f59e0b', '#facc15', '#22c55e', '#10b981', '#f97316'], bg: 'linear-gradient(180deg,#052e16 0%,#14532d 55%,#3f6212 100%)', board: 'rgba(3,24,10,0.55)' },
    { colors: ['#22d3ee', '#3b82f6', '#06b6d4', '#a5f3fc', '#14b8a6', '#818cf8', '#38bdf8'], bg: 'linear-gradient(180deg,#0b8fb0 0%,#065a82 40%,#03263f 100%)', board: 'rgba(2,20,36,0.55)' },
    { colors: ['#a3e635', '#65a30d', '#d97706', '#fbbf24', '#4ade80', '#b45309', '#e11d48'], bg: 'linear-gradient(180deg,#365314 0%,#1a2e05 55%,#3b2a14 100%)', board: 'rgba(16,20,6,0.55)' },
    { colors: ['#f472b6', '#22d3ee', '#a855f7', '#facc15', '#34d399', '#fb923c', '#60a5fa'], bg: 'linear-gradient(180deg,#0f172a 0%,#312e81 55%,#831843 100%)', board: 'rgba(10,10,25,0.55)' },
    { colors: ['#e0e7ff', '#a78bfa', '#fde68a', '#facc15', '#93c5fd', '#c4b5fd', '#f9a8d4'], bg: 'radial-gradient(1px 1px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 70% 15%,#fff,transparent),radial-gradient(1.5px 1.5px at 45% 60%,#fff,transparent),radial-gradient(1px 1px at 85% 75%,#fff,transparent),linear-gradient(180deg,#020617 0%,#1e1b4b 60%,#312e81 100%)', board: 'rgba(5,6,25,0.5)' }
  ];
  // Faded scene pictures drawn behind the board, one per theme (same order as THEMES).
  const SCENES = [
    // Beach: sun, sea, sand and a palm tree
    '<circle cx="300" cy="170" r="60" fill="#fff7cc" opacity=".55"/><path d="M0 470 Q100 450 200 470 T400 470 V560 H0Z" fill="#0e7490" opacity=".35"/><path d="M0 520 Q60 505 120 520 T240 520 T360 520 T480 520" stroke="#fff" stroke-width="4" fill="none" opacity=".35"/><path d="M0 600 Q200 540 400 600 V800 H0Z" fill="#fde68a" opacity=".5"/><path d="M80 760 Q95 600 70 440" stroke="#7c4a1e" stroke-width="14" fill="none" opacity=".45"/><g fill="#166534" opacity=".45"><path d="M70 440 Q10 420 -10 470 Q30 430 70 445Z"/><path d="M70 440 Q130 410 170 460 Q120 425 72 446Z"/><path d="M70 440 Q60 380 110 350 Q80 395 74 442Z"/><path d="M70 440 Q20 370 -20 380 Q35 395 68 444Z"/></g>',
    // Rainforest: trunks, vines and ferns
    '<g fill="#14532d" opacity=".5"><rect x="30" y="0" width="34" height="800"/><rect x="300" y="0" width="44" height="800"/><rect x="190" y="0" width="20" height="800" opacity=".6"/></g><g stroke="#4d7c0f" stroke-width="4" fill="none" opacity=".45"><path d="M64 0 Q120 160 90 320"/><path d="M300 0 Q250 200 280 380"/><path d="M210 0 Q240 120 220 240"/></g><g fill="#65a30d" opacity=".45"><path d="M0 800 Q60 620 140 600 Q80 660 60 800Z"/><path d="M400 800 Q340 640 250 610 Q320 680 330 800Z"/><path d="M120 800 Q180 660 260 650 Q200 700 190 800Z"/></g>',
    // Ocean: waves, a dolphin and a whale tail
    '<g stroke="#e0f2fe" stroke-width="5" fill="none" opacity=".35"><path d="M0 120 Q50 95 100 120 T200 120 T300 120 T400 120"/><path d="M0 160 Q50 135 100 160 T200 160 T300 160 T400 160"/></g><path d="M90 420 Q170 340 270 380 Q300 360 310 330 Q315 375 300 395 Q330 420 340 450 Q300 420 270 425 Q190 470 120 440 Q105 470 80 480 Q95 450 90 420Z" fill="#bae6fd" opacity=".4"/><path d="M200 760 Q200 660 190 640 Q150 610 120 620 Q170 625 196 660 Q222 625 272 620 Q242 610 205 640 Q200 660 210 760Z" fill="#0c4a6e" opacity=".5"/><g fill="#e0f2fe" opacity=".35"><circle cx="60" cy="600" r="8"/><circle cx="80" cy="560" r="5"/><circle cx="340" cy="560" r="7"/><circle cx="320" cy="520" r="4"/></g>',
    // Bush walk: hills, ponga ferns, a track and a tui
    '<path d="M0 520 Q120 430 240 500 T400 470 V800 H0Z" fill="#3f6212" opacity=".45"/><path d="M0 620 Q150 560 400 630 V800 H0Z" fill="#1a2e05" opacity=".5"/><path d="M230 800 Q180 720 230 680 Q270 650 240 620" stroke="#d6b98a" stroke-width="22" fill="none" opacity=".4"/><g opacity=".45"><rect x="66" y="430" width="8" height="250" fill="#3b2a14"/><g fill="#65a30d"><path d="M70 430 Q20 420 0 460 Q30 440 70 436Z"/><path d="M70 430 Q120 420 140 460 Q110 440 70 436Z"/><path d="M70 430 Q40 390 20 380 Q50 400 70 432Z"/><path d="M70 430 Q100 390 120 380 Q90 400 70 432Z"/></g></g><g fill="#0f172a" opacity=".5"><ellipse cx="320" cy="260" rx="22" ry="12"/><circle cx="342" cy="252" r="8"/><path d="M300 262 L272 274 L300 268Z"/><circle cx="344" cy="262" r="3" fill="#fff"/></g>',
    // City: skyline with lit windows and a tower
    '<g fill="#020617" opacity=".55"><rect x="0" y="560" width="60" height="240"/><rect x="62" y="500" width="50" height="300"/><rect x="114" y="590" width="40" height="210"/><rect x="250" y="520" width="56" height="280"/><rect x="308" y="460" width="46" height="340"/><rect x="356" y="580" width="44" height="220"/><path d="M196 800 V380 L190 370 H210 L204 380 V800Z"/><ellipse cx="200" cy="420" rx="18" ry="10"/><path d="M199 370 V250 H201 V370Z"/></g><g fill="#fde68a" opacity=".45"><rect x="12" y="580" width="8" height="10"/><rect x="34" y="610" width="8" height="10"/><rect x="74" y="520" width="8" height="10"/><rect x="92" y="560" width="8" height="10"/><rect x="262" y="540" width="8" height="10"/><rect x="284" y="600" width="8" height="10"/><rect x="318" y="490" width="8" height="10"/><rect x="336" y="530" width="8" height="10"/><rect x="370" y="610" width="8" height="10"/></g>',
    // Night sky: moon, stars, Southern Cross and hills
    '<circle cx="300" cy="150" r="50" fill="#fef9c3" opacity=".55"/><circle cx="322" cy="136" r="46" fill="#1e1b4b" opacity=".9"/><g fill="#fff" opacity=".7"><circle cx="80" cy="120" r="3"/><circle cx="120" cy="230" r="4"/><circle cx="70" cy="300" r="3"/><circle cx="150" cy="170" r="2.5"/><circle cx="104" cy="200" r="2"/><circle cx="220" cy="80" r="2"/><circle cx="360" cy="300" r="2"/><circle cx="260" cy="260" r="2"/></g><path d="M0 680 Q100 600 200 660 T400 640 V800 H0Z" fill="#020617" opacity=".6"/>'
  ];
  function sceneUrl(i) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice">' + SCENES[i] + '</svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }
  let themeIdx = 0;
  function themeFor(level) { return (Math.max(1, level) - 1) % THEMES.length; }
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
    for (const [pos, k] of BELLS) add(pos, { v: 'bell', f: nf(T.bells[k]) / 2, d: 3 });
    const cr = [].concat(T.critter);
    [7, 23].forEach((p, i) => { if (cr[i % cr.length] === 'whale') add(p, { v: 'whale' }); }); // high chirps removed: too sharp
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
  root.Tetris = { THEMES, LOOKS, SCENES, sceneUrl, themeFor, SHAPES, COLORS, emptyBoard, rotateCW, rotateCCW, collides, newGame, lockPiece, act, dropInterval, spawn, stopAudio, audio: () => ac && ac.state };

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
    m.forEach((row, r) => row.forEach((v, c) => { if (v) drawCell(ctx, ox + (c - minC) * s, oy + (r - minR) * s, COLORS[t], s, dim ? 0.35 : 1); }));
  }
  let lookIdx = -1, boardBg = LOOKS[0].board;
  function applyLook(i) {
    if (i === lookIdx) return;
    lookIdx = i;
    const L = LOOKS[i];
    for (let k = 1; k < COLORS.length; k++) COLORS[k] = L.colors[k - 1];
    boardBg = L.board;
    doc.documentElement.style.background = sceneUrl(i) + ' center bottom / cover no-repeat, ' + L.bg;
    doc.documentElement.style.backgroundAttachment = 'fixed';
    doc.body.style.background = 'transparent';
    drawMini(doc.getElementById('next'), g.next, false);
    drawMini(doc.getElementById('hold'), g.hold, !g.canHold);
  }
  let last = performance.now();
  function loop(now) {
    applyLook(themeFor(g.level));
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
      ctx.clearRect(0, 0, board.width, board.height);
      ctx.fillStyle = boardBg;
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
