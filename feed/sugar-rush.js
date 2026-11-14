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
    { n: 1, name: 'The Sweet Shop', target: 0, moves: 20, stars: [3000, 6000, 9000], kinds: 6,
      collect: { color: 0, n: 20 },
      help: 'Swipe a sweet into its neighbour, or tap one then the other, to line up 3 or more of the same. Collect 20 cherry gumdrops in 20 moves.',
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
    { n: 4, name: 'Locked Jars', target: 0, moves: 22, stars: [2500, 5000, 8000], kinds: 6,
      locks: ['00000000', '00011000', '00111100', '01100110', '01100110', '00111100', '00011000', '00000000'],
      help: 'A few sweets are locked. They cannot be swapped, but a match that includes them still counts and frees them. Free all the locked jars in 22 moves.',
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


  // 1.9.212 Level intro copy and the level-1 tutorial. Gameplay rules are unchanged.
  const LEVEL_INTROS = [
    { icon: '🍒', goal: 'Collect 20 cherry gumdrops', detail: 'Collect 20 cherry gumdrops in 20 moves.', tip: 'Swap two neighbours to make a line of three. Cherry gumdrops are the red ones. Longer lines and special sweets score more, and more stars.', mechanic: 'match' },
    { icon: '🍒', goal: 'Collect 10 cherry gumdrops', detail: 'Collect 10 cherry gumdrops in 25 moves.', tip: "This heart-shaped tray is Sarah's corner of the shop. Take your time and gather the cherry gumdrops.", mechanic: 'collect' },
    { icon: '💜', goal: 'Clear all the jelly', detail: 'Clear every jelly in 22 moves.', tip: 'Make a match on a jelly tile to clear it.', mechanic: 'jelly' },
    { icon: '🔒', goal: 'Free all the locked jars', detail: 'Free all the locked jars in 22 moves.', tip: 'Locked jars cannot be swapped, but a match that includes them still counts and frees them.', mechanic: 'locks' },
    { icon: '🧁', goal: 'Clear all the icing', detail: 'Clear all the icing in 24 moves.', tip: 'A match next to a block of icing, or a special sweet that hits it, chips it away.', mechanic: 'ice' },
    { icon: '🍨', goal: 'Clear all the double jelly', detail: 'Clear every jelly in 24 moves.', tip: 'These jellies have two layers, so some tiles need two clears.', mechanic: 'double' },
    { icon: '🎁', goal: 'Bring the ingredients down to the bottom', detail: 'Guide both ingredients down to the bottom in 34 moves.', tip: 'A little icing sits in the way. Match under an ingredient to drop it down.', mechanic: 'ings' },
    { icon: '🍫', goal: 'Clear all the jelly', detail: 'Keep the chocolate in check and clear every jelly in 24 moves.', tip: 'Chocolate spreads to a neighbouring tile at the end of a move if you did not hit it.', mechanic: 'choco' },
    { icon: '🍋', goal: 'Clear the jelly and collect 6 lemon drops', detail: 'Clear the jelly and collect 6 lemon drops in 28 moves.', tip: 'The path runs around the edge of the tray. Stay on it.', mechanic: 'path' },
    { icon: '🌟', goal: 'Finish every objective', detail: 'Clear the jelly, bring both ingredients down, break the icing and free the locked jars — all in 32 moves.', tip: 'A little of everything. Take it one match at a time.', mechanic: 'mix' }
  ];
  function levelIntro(n, p) {
    const lv = LEVELS[(n | 0) - 1]; if (!lv) return null;
    const info = LEVEL_INTROS[(n | 0) - 1] || LEVEL_INTROS[0];
    const stop = stopForLevel(n) || { place: '' };
    const stars = (p && p.stars && p.stars[n - 1]) || 0;
    return {
      n: lv.n, name: lv.name, place: stop.place, title: lv.name,
      stopLine: 'Level ' + lv.n + ' · ' + stop.place,
      icon: info.icon, goal: info.goal, detail: info.detail, tip: info.tip, mechanic: info.mechanic,
      moves: lv.moves, badge: lv.badge, stars: stars, theme: lv.theme || '',
      strip: info.goal + ' · ' + lv.moves + ' moves'
    };
  }
  const TUTORIAL_KEY = 'ib-sugar-tutorial-done';
  const TUTORIAL_STEPS = [
    {
      id: 'match3', kind: 'move',
      board: ['02402402','13513513','24024024','35101035','40240240','51351351','02402402','13513513'],
      move: [[3, 4], [4, 4]],
      hl: [[3, 3], [3, 4], [3, 5], [4, 4]],
      bubble: 'Swap two neighbouring sweets to make a line of three.',
      special: ''
    },
    {
      id: 'striped', kind: 'move',
      board: ['02402402','13513513','24024024','30010135','40200240','51351351','02402402','13513513'],
      move: [[3, 3], [4, 3]],
      hl: [[3, 1], [3, 2], [3, 3], [3, 4], [4, 3]],
      bubble: 'A match of four makes a striped sweet. It clears a whole row or column.',
      special: 'col'
    },
    {
      id: 'wrapped', kind: 'move',
      board: ['02402402','13013513','20100324','35035135','40040240','51351351','02402402','13513513'],
      move: [[2, 2], [1, 2]],
      hl: [[1, 2], [2, 1], [2, 2], [2, 3], [2, 4], [3, 2], [4, 2]],
      bubble: 'An L or a T shape makes a wrapped sweet. It clears the 3×3 around it.',
      special: 'w'
    },
    {
      id: 'bomb', kind: 'move',
      board: ['02402402','13513513','24024024','30010035','40200240','51351351','02402402','13513513'],
      move: [[3, 3], [4, 3]],
      hl: [[3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [4, 3]],
      bubble: 'Five in a line makes a sprinkle bomb. Swap it with a colour to clear every sweet of that colour.',
      special: 'b'
    },
    {
      id: 'goal', kind: 'hud', hlHud: ['goalstrip', 'score', 'moves'],
      bubble: 'Your goal is up the top. On this level, collect 20 cherry gumdrops in 20 moves.'
    },
    {
      id: 'stars', kind: 'hud', hlHud: ['starbars'],
      bubble: 'Stars fill as you score. Hit 3,000, 6,000 and 9,000 points for one, two or three stars.'
    },
    {
      id: 'ready', kind: 'ready',
      bubble: "You're ready!"
    }
  ];
  function sameTutMove(a, z, move) {
    if (!a || !z || !move) return false;
    const b = move[0], c = move[1];
    return (a[0] === b[0] && a[1] === b[1] && z[0] === c[0] && z[1] === c[1]) ||
      (a[0] === c[0] && a[1] === c[1] && z[0] === b[0] && z[1] === b[1]);
  }

  const TUTORIALS = {
    1: TUTORIAL_STEPS,
    2: [
      {
        id: 'cherries', kind: 'move',
        board: ['##4131##','#342413#','24132241','31200312','41332013','#241312#','##4241##','###32###'],
        move: [[3, 5], [4, 5]],
        hl: [[3, 3], [3, 4], [3, 5], [4, 5]],
        bubble: 'Cherry gumdrops are the red ones. Match three to collect them.'
      },
      {
        id: 'counter', kind: 'hud', hlHud: ['goalstrip'],
        bubble: 'Watch the counter up the top. You need 10 cherry gumdrops.'
      },
      { id: 'ready2', kind: 'ready', bubble: "You're ready! Collect 10 cherry gumdrops." }
    ],
    3: [
      {
        id: 'jelly', kind: 'move',
        board: ['02402402','23553523','24024024','35115335','40241240','52354352','02402402','23553523'],
        move: [[3, 4], [4, 4]],
        hl: [[3, 2], [3, 3], [3, 4], [4, 4]],
        bubble: 'This shiny layer is jelly. Match on a jelly tile to clear it.'
      },
      {
        id: 'jellyhud', kind: 'hud', hlHud: ['goalstrip'],
        bubble: 'Clear every jelly to finish the level.'
      },
      { id: 'ready3', kind: 'ready', bubble: "You're ready!" }
    ],
    4: [
      {
        id: 'locks-show', kind: 'show',
        board: ['03405403','13513513','34004034','35225135','40142440','51351351','03405403','13513513'],
        locks: ['00000000','00000000','00000000','00110000','00000000','00000000','00000000','00000000'],
        hl: [[3, 2], [3, 3]],
        bubble: 'Locked jars cannot be swapped.'
      },
      {
        id: 'locks-free', kind: 'move',
        board: ['03405403','13513513','34004034','35225135','40142440','51351351','03405403','13513513'],
        locks: ['00000000','00000000','00000000','00110000','00000000','00000000','00000000','00000000'],
        move: [[3, 4], [4, 4]],
        hl: [[3, 2], [3, 3], [3, 4], [4, 4]],
        bubble: 'Include them in a match to free them.'
      },
      { id: 'ready4', kind: 'ready', bubble: "Free every locked jar to finish. You're ready!" }
    ],
    5: [
      {
        id: 'ice-show', kind: 'show',
        board: ['12442412','13513513','24524224','351I0035','41243201','51351351','12442412','13513513'],
        hl: [[3, 3]],
        bubble: 'Icing blocks a tile.'
      },
      {
        id: 'ice-chip', kind: 'move',
        board: ['12442412','13513513','24524224','351I0035','41243201','51351351','12442412','13513513'],
        move: [[3, 6], [4, 6]],
        hl: [[3, 3], [3, 4], [3, 5], [3, 6], [4, 6]],
        bubble: 'Match next to it to chip it away. A special sweet can hit it too.'
      },
      { id: 'ready5', kind: 'ready', bubble: "Clear all the icing to finish. You're ready!" }
    ],
    6: [
      {
        id: 'double', kind: 'move',
        board: ['02402402','14510514','24024024','45335145','40243240','51251551','02402402','14510514'],
        jelly: ['00000000','00000000','00000000','00222000','00002000','00000000','00000000','00000000'],
        move: [[3, 4], [4, 4]],
        hl: [[3, 2], [3, 3], [3, 4], [4, 4]],
        bubble: 'These jellies have two layers. A match clears one layer.'
      },
      {
        id: 'double2', kind: 'move',
        board: ['02402402','14510514','24024024','45335145','40243240','51251551','02402402','14510514'],
        jelly: ['00000000','00000000','00000000','00111000','00001000','00000000','00000000','00000000'],
        move: [[3, 4], [4, 4]],
        hl: [[3, 2], [3, 3], [3, 4], [4, 4]],
        bubble: 'Match on it again to clear the last layer.'
      },
      { id: 'ready6', kind: 'ready', bubble: "Clear every jelly to finish. You're ready!" }
    ],
    7: [
      {
        id: 'ing-show', kind: 'show',
        board: ['#240240#','#451051#','##0240##','##1151##','##2402##','##G515##','#243340#','#431051#'],
        hl: [[5, 2]],
        bubble: 'This is an ingredient. It needs to reach the bottom.'
      },
      {
        id: 'ing-drop', kind: 'move',
        board: ['#240240#','#451051#','##0240##','##1151##','##2402##','##G515##','#243340#','#431051#'],
        move: [[6, 2], [7, 2]],
        hl: [[5, 2], [6, 2], [6, 3], [6, 4], [7, 2]],
        bubble: 'Match underneath it to drop it down.'
      },
      {
        id: 'ing-down', kind: 'move',
        board: ['#230200#','#351351#','##0210##','##1351##','##2202##','##3513##','#2G0200#','#454451#'],
        move: [[7, 2], [7, 1]],
        hl: [[6, 2], [7, 1], [7, 2], [7, 3], [7, 4]],
        bubble: 'Get it to the bottom to collect it. A little icing sits in the way on this level.'
      }
    ],
    8: [
      {
        id: 'choco-spread', kind: 'move',
        board: ['CC302002','CC513513','25021025','35135135','50220250','51441351','02304002','13513513'],
        move: [[5, 4], [6, 4]],
        hl: [[0, 0], [0, 1], [1, 0], [1, 1], [5, 2], [5, 3], [5, 4], [6, 4]],
        bubble: 'Chocolate spreads at the end of a move if you did not hit it.'
      },
      {
        id: 'choco-hit', kind: 'move',
        board: ['CC402402','CC455113','24524024','30132130','40240240','01331301','02402402','13413113'],
        move: [[1, 2], [2, 2]],
        hl: [[1, 1], [1, 2], [1, 3], [1, 4], [2, 2]],
        bubble: 'Match next to it to clear a square.'
      },
      { id: 'ready8', kind: 'ready', bubble: 'Keep it in check and clear the jelly. You\'re ready!' }
    ],
    9: [
      {
        id: 'path-show', kind: 'show',
        board: ['23413034','1######0','2######1','20####01','41####13','0######4','1######0','34130341'],
        hl: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [1, 0], [1, 7], [2, 0], [2, 7]],
        bubble: 'The path runs around the edge of the tray. Stay on it.'
      },
      {
        id: 'path-lemon', kind: 'move',
        board: ['23413034','1######0','2######1','20####01','41####13','0######4','1######0','34130341'],
        move: [[1, 0], [0, 0]],
        hl: [[0, 0], [1, 0], [2, 0], [3, 0]],
        bubble: 'Match lemon drops to collect them, and clear the jelly as you go.'
      },
      { id: 'ready9', kind: 'ready', bubble: 'Collect 6 lemon drops and clear the jelly. You\'re ready!' }
    ],
    10: [
      {
        id: 'recap', kind: 'recap',
        title: 'A little of everything',
        bubble: 'You have seen all of these before. Take it one match at a time.',
        items: [
          { icon: '💜', text: 'Clear the jelly' },
          { icon: '🎁', text: 'Bring both ingredients down to the bottom' },
          { icon: '🧁', text: 'Break the icing' },
          { icon: '🔒', text: 'Free the locked jars' }
        ]
      }
    ]
  };
  function tutorialFor(n) { return TUTORIALS[n] || null; }


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
      '<path id="sr-path-win" d="" fill="none" stroke="#fff6a8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
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
  function locksLeft(b) {
    if (!b) return 0;
    let n = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c] && b[r][c].lock) n++;
    return n;
  }
  function goalsMet(st) {
    const lv = st.lv || LEVEL;
    // Score is never the win condition — only objectives are.
    if (lv.jelly && jellyLeft(st) > 0) return false;
    if (lv.ice && iceLeft(st.board) > 0) return false;
    if (lv.collect && (st.collected[lv.collect.color] || 0) < lv.collect.n) return false;
    if ((lv.ings && lv.ings.length) && (st.ingsLeft || 0) > 0) return false;
    if (lv.locks && locksLeft(st.board) > 0) return false;
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
    // Kept for older tests; no live level is score-only any more.
    return !lv.jelly && !lv.ice && !lv.collect && !(lv.ings && lv.ings.length) && !lv.locks;
  }
  function goalCounts(lv, stt) {
    lv = lv || {};
    const out = [];
    if (lv.collect) {
      const have = stt ? (stt.collected[lv.collect.color] || 0) : 0;
      const n = lv.collect.n;
      const left = Math.max(0, n - have);
      const icon = lv.collect.color === 0 ? '🍒' : lv.collect.color === 2 ? '🍋' : '🍬';
      out.push({ kind: 'collect', icon: icon, left: left, have: have, n: n, lab: 'left', text: icon + ' ' + left + ' left' });
    }
    if (lv.ings && lv.ings.length) {
      const n = lv.ings.length;
      const have = stt ? (n - (stt.ingsLeft || 0)) : 0;
      const left = stt ? (stt.ingsLeft || 0) : n;
      out.push({ kind: 'ings', icon: '🎁', left: left, have: have, n: n, lab: have + '/' + n, text: '🎁 ' + have + '/' + n });
    }
    if (lv.jelly) {
      const left = stt ? jellyLeft(stt) : 0;
      out.push({ kind: 'jelly', icon: '🟩', left: left, have: 0, n: left, lab: 'Jelly ' + left + ' left', text: '🟩 Jelly ' + left + ' left' });
    }
    if (lv.ice) {
      const left = stt && stt.board ? iceLeft(stt.board) : 0;
      out.push({ kind: 'ice', icon: '🧁', left: left, have: 0, n: left, lab: 'Icing ' + left + ' left', text: '🧁 ' + left + ' left' });
    }
    if (lv.locks) {
      const left = stt && stt.board ? locksLeft(stt.board) : 0;
      out.push({ kind: 'locks', icon: '🔒', left: left, have: 0, n: left, lab: left + ' left', text: '🔒 ' + left + ' left' });
    }
    return out;
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
    if (!st.tutorial && !hasMove(b, mask)) { shuffle(b, st.rand, st.kinds, mask); shuffled = true; }
    const chocoHit = steps.some(s => s.chocoHit);
    const spread = (!chocoHit && chocoLeft(b)) ? spreadChoco(st) : null;
    if (!st.tutorial) finishIfDone(st);
    return { valid: true, steps, shuffled, swapped: [A, Z], spread };
  }


  function listPlayOutCandies(st) {
    const cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = st.board[r][c];
      if (isCandy(t) && !t.s && !t.lock) cells.push([r, c]);
    }
    return cells;
  }
  function grantPlayOutSpecial(st) {
    const cells = listPlayOutCandies(st);
    if (!cells.length || st.moves <= 0) return null;
    const [r, c] = cells[Math.floor((st.rand ? st.rand() : Math.random()) * cells.length)];
    const stripe = (r + c) % 2 ? 'row' : 'col';
    const s = (st.moves > 6 && (st.rand ? st.rand() : Math.random()) < 0.22) ? 'w' : stripe;
    st.board[r][c].s = s;
    const points = BONUS[s] || 120;
    st.score += points;
    st.moves--;
    return { r, c, s, points };
  }
  function settleBoard(st, cascade0) {
    const steps = [];
    let cascade = cascade0 || 1;
    for (let guard = 0; guard < 60; guard++) {
      const s = resolve(st.board, null, st.mask);
      if (!s) break;
      applyStep(st.board, s, st.rand, st.kinds, cascade++, st);
      st.score += s.points;
      steps.push(s);
    }
    return steps;
  }
  function listSpecials(st) {
    const out = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = st.board[r][c];
      if (t && t.s && (isCandy(t) || isBomb(t))) out.push([r, c]);
    }
    return out;
  }
  function fireSpecialAt(st, r, c) {
    const t = st.board[r][c];
    if (!t || !t.s) return { steps: [] };
    const clear = new Set([key(r, c)]);
    const fired = [], hit = new Set();
    expand(st.board, clear, fired, hit, st.mask);
    neighbourHits(st.board, clear, hit, st.mask);
    const first = { kind: 'clear', clear, made: [], fired, hit, groups: 1 };
    applyStep(st.board, first, st.rand, st.kinds, 1, st);
    st.score += first.points;
    return { steps: [first].concat(settleBoard(st, 2)) };
  }
  function runPlayOut(st) {
    const granted = [], fired = [];
    while (st.moves > 0) {
      const g = grantPlayOutSpecial(st);
      if (!g) break;
      granted.push(g);
    }
    for (let guard = 0; guard < 40; guard++) {
      const specs = listSpecials(st);
      if (!specs.length) {
        const extra = settleBoard(st);
        if (!extra.length) break;
        fired.push.apply(fired, extra);
        continue;
      }
      const res = fireSpecialAt(st, specs[0][0], specs[0][1]);
      fired.push.apply(fired, res.steps);
    }
    return { granted, fired, score: st.score, moves: st.moves };
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
    if (before.lv && before.lv.locks) h += (locksLeft(before.board) - locksLeft(after.board)) * 350;
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
  // Idle hint: after HINT_IDLE_MS with no input, point at the move that
  // best helps the current objective (jelly, locks, icing, ingredients,
  // collect, specials). Falls back to any valid move. The UI repeats the
  // hand every HINT_REPEAT_MS until the player touches the board.
  const HINT_IDLE_MS = 15000, HINT_REPEAT_MS = 3200;
  function hintMoveFor(st) {
    if (!st || st.over || st.tutorial) return null;
    return bestMove(st);
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

  // Inventive, candy-themed sayings in NZ flavour. Matched to the achievement,
  // never the generic "Great". At least three variants of each; pickSaying
  // skips the line that just appeared so the same one does not land twice in a row.
  const SAYINGS = {
    cascade: ['Sweet as!', 'Sugar rush!', 'Choice!', 'Mean as!'],
    stripe: ['Stripe-tastic!', 'Candy-licious!', 'Looking sharp!', 'Stripe me pink!'],
    wrap: ["That's a wrap!", 'All wrapped up!', 'Parcel of yum!', 'Tied with a bow!'],
    bomb: ['Sprinkle-tastic!', 'Hundreds and thousands!', 'Sprinkle party!', 'Lolly bomb!'],
    jelly: ['Jelly good!', 'Wobble wobble!', 'Jelly well done!', 'Wobbly wonder!'],
    locks: ['Jar-mazing!', 'Lock-busted!', 'Jar-fully done!', 'Set those jars free!'],
    ice: ['Ice ice baby!', 'Icing on the cake!', 'Chip chip hooray!', 'Frost-busted!'],
    ings: ['Down the hatch!', 'Coming through!', 'And down she goes!', 'Nice drop!'],
    choco: ['Choc-blocked!', 'No more spreading!', 'Held the line!', 'Choc stop!'],
    gumdrop: ['Gum-believable!', 'Cherry on top!', 'Pop those cherries!', 'Gumdrop gorgeous!'],
    lemon: ['Zesty!', 'Lemon-sational!', 'Zing!', 'Squeeze the day!'],
    combo: ['Double delight!', 'Two for tea!', 'Special times two!', 'Pair of treats!'],
    comeback: ['Still in it!', 'Not done yet!', 'Clutch play!', 'Comeback sweet!']
  };
  const SAYING_COLORS = {
    cascade: '#ff3d8a', stripe: '#1aa7ff', wrap: '#ffb400', bomb: '#c84dff',
    jelly: '#e649cf', locks: '#ff8c2a', ice: '#3bc9ff', ings: '#ff6b2c',
    choco: '#c26a2d', gumdrop: '#ff2d55', lemon: '#ffd43b', combo: '#ff5ad5',
    comeback: '#ff7a1a'
  };
  const SAYING_VOICE = {
    cascade: 'great', stripe: 'great', wrap: 'sweetas', bomb: 'succulent',
    jelly: 'great', locks: 'great', ice: 'great', ings: 'sweetas',
    choco: 'great', gumdrop: 'great', lemon: 'great', combo: 'awesome',
    comeback: 'awesome'
  };
  function sayingKind(s, cascade, st) {
    if (!s) return null;
    const i = cascade != null ? cascade : (s.cascade || 1);
    const fired = s.fired || [];
    const made = s.madeTiles || s.made || [];
    const nFire = fired.filter(f => f.s === 'row' || f.s === 'col' || f.s === 'w' || f.s === 'b').length;
    const hasBomb = !!(s.bomb || fired.some(f => f.s === 'b') || made.some(m => madeKind(m) === 'b'));
    const madeWrap = made.some(m => madeKind(m) === 'w');
    const madeStripe = made.some(m => { const k = madeKind(m); return k === 'row' || k === 'col'; });
    const low = !!(st && st.moves <= 5 && st.moves > 0);
    let kind = null;
    if (nFire >= 2) kind = 'combo';
    else if (hasBomb) kind = 'bomb';
    else if (madeWrap) kind = 'wrap';
    else if (madeStripe) kind = 'stripe';
    else if (s.delivered && s.delivered.length) kind = 'ings';
    else if (s.chocoHit) kind = 'choco';
    else if (s.brokeLock) kind = 'locks';
    else if (s.jellyCleared) kind = 'jelly';
    else if ((s.blocked || []).some(b => b.kind === 'ice')) kind = 'ice';
    else {
      const popped = s.popped || [];
      const nLemon = popped.filter(p => p.color === 2).length;
      const nGum = popped.filter(p => p.color === 0).length;
      const want = st && st.lv && st.lv.collect;
      if (want && want.color === 2 && nLemon) kind = 'lemon';
      else if (want && want.color === 0 && nGum) kind = 'gumdrop';
      else if (nLemon >= 3) kind = 'lemon';
      else if (nGum >= 3) kind = 'gumdrop';
      else if (i >= 2) kind = 'cascade';
    }
    if (low && kind && kind !== 'combo' && kind !== 'bomb' && kind !== 'wrap' && kind !== 'stripe') kind = 'comeback';
    return kind;
  }
  function pickSaying(kind, last, rand) {
    const pool = SAYINGS[kind];
    if (!pool || !pool.length) return null;
    const opts = pool.filter(t => t !== last);
    const list = opts.length ? opts : pool;
    const r = typeof rand === 'function' ? rand() : Math.random();
    return list[(r * list.length) | 0];
  }
  function sayingColor(kind) { return SAYING_COLORS[kind] || '#ff4f9a'; }

  function playMovesWarnChime(ctx, dest, at) {
    if (!ctx || !dest) return;
    if (at == null) at = (ctx.currentTime || 0) + 0.01;
    const notes = [SCALE[0], SCALE[2], SCALE[SCALE.length - 1]];
    const v = CHIME_VOL * 1.55;
    notes.forEach(function (f, i) {
      playTone(ctx, dest, f, at + i * 0.13, 0.28, v);
    });
  }
  const MOVES_WARN_AT = 3, MOVES_WARN_MS = 2300;

  // 1.9.169 Tasteful candy sparkle: a glossy highlight on each sweet, a few
  // staggered star glints (~0.6–1s), and a soft shimmer sweep. Cheap on a
  // phone; prefers-reduced-motion keeps the gloss and tones the motion down.
  const SPARKLE_MIN_MS = 480, SPARKLE_MAX_MS = 900, SPARKLE_MAX = 7, SPARKLE_MAX_REDUCE = 1, SHIMMER_MS = 4200;
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
    ctx.fillStyle = 'rgba(255,255,255,1)';
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
    ctx.fillStyle = 'rgba(255,252,180,0.95)';
    cross(r * 0.52, r * 0.1);
    ctx.restore();
  }
  // Soft candy gloss: a sheen oval and a tiny specular, kept light so colours stay clear.
  function drawCandyShine(ctx, R, amt) {
    if (!ctx || !(R > 0)) return;
    const a = amt == null ? 1 : amt;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.62 * a) + ')';
    ctx.beginPath();
    ctx.ellipse(-R * .32, -R * .44, R * .38, R * .18, -.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * a) + ')';
    ctx.beginPath();
    ctx.ellipse(-R * .16, -R * .54, R * .11, R * .065, -.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * a) + ')';
    ctx.beginPath();
    ctx.ellipse(R * .22, -R * .18, R * .07, R * .04, .5, 0, Math.PI * 2);
    ctx.fill();
  }


  // 1.9.210 Family race: each member gets a distinct candy / animal / vehicle icon
  // and stands on the NZ map stop they have reached.
  const RACE_ICONS = [
    { id: 'lolly', emoji: '🍭', color: '#ff5ea8', name: 'Lolly' },
    { id: 'cupcake', emoji: '🧁', color: '#ff8ab5', name: 'Cupcake' },
    { id: 'donut', emoji: '🍩', color: '#c97b4a', name: 'Donut' },
    { id: 'cherry', emoji: '🍒', color: '#e63946', name: 'Cherry' },
    { id: 'icecream', emoji: '🍦', color: '#7ec8e3', name: 'Ice cream' },
    { id: 'cookie', emoji: '🍪', color: '#d4a017', name: 'Cookie' },
    { id: 'kiwi', emoji: '🥝', color: '#7cb518', name: 'Kiwi' },
    { id: 'cat', emoji: '🐱', color: '#ffb347', name: 'Cat' },
    { id: 'dog', emoji: '🐶', color: '#c4a484', name: 'Dog' },
    { id: 'bunny', emoji: '🐰', color: '#e8a0bf', name: 'Bunny' },
    { id: 'unicorn', emoji: '🦄', color: '#c77dff', name: 'Unicorn' },
    { id: 'car', emoji: '🚗', color: '#3d8bfd', name: 'Car' },
    { id: 'train', emoji: '🚂', color: '#e85d04', name: 'Train' },
    { id: 'bike', emoji: '🚲', color: '#2a9d8f', name: 'Bike' },
    { id: 'rocket', emoji: '🚀', color: '#6c63ff', name: 'Rocket' },
    { id: 'star', emoji: '🌟', color: '#ffd166', name: 'Star' },
    { id: 'bear', emoji: '🧸', color: '#c27b4f', name: 'Bear' },
    { id: 'bee', emoji: '🐝', color: '#f4d35e', name: 'Bee' },
    { id: 'butterfly', emoji: '🦋', color: '#7b68ee', name: 'Butterfly' },
    { id: 'boat', emoji: '⛵', color: '#00b4d8', name: 'Boat' }
  ];
  function raceIcon(id) { return RACE_ICONS.find(function (x) { return x.id === id; }) || null; }
  function isRaceIcon(id) { return !!raceIcon(id); }
  function raceStars(p) { return (p && p.stars || []).reduce(function (a, n) { return a + (n || 0); }, 0); }
  function raceStop(p) { return Math.max(1, Math.min(10, (p && p.open) || 1)); }
  function hashStr(s) {
    let h = 2166136261;
    s = String(s || '');
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function allocateIcon(taken, seed) {
    const used = new Set((taken || []).filter(Boolean));
    const start = hashStr(seed) % RACE_ICONS.length;
    for (let i = 0; i < RACE_ICONS.length; i++) {
      const id = RACE_ICONS[(start + i) % RACE_ICONS.length].id;
      if (!used.has(id)) return id;
    }
    return RACE_ICONS[start].id;
  }
  function rankRacers(list) {
    return (list || []).slice().sort(function (a, b) {
      return (b.stop || 0) - (a.stop || 0) || (b.stars || 0) - (a.stars || 0) || String(a.name || '').localeCompare(String(b.name || ''), 'en');
    });
  }
  function stackOffsets(count, i, label) {
    const side = label === 'left' ? 1 : -1; // sit on the opposite side from the place name
    if (count <= 1) return { x: 22 * side, y: -30 };
    const spread = Math.min(34, 64 / Math.max(1, count - 1));
    const mid = (count - 1) / 2;
    return { x: (i - mid) * spread + 8 * side, y: -34 - (Math.abs(i - mid) < 0.2 ? 10 : 0) };
  }
  function racerFirst(name) { return String(name || 'Player').trim().split(/\s+/)[0] || 'Player'; }

  root.SugarRush = { N, KINDS, PTS, LEVEL, LEVELS, BONUS, NAMES, HOLE, LEVEL_INTROS, levelIntro, TUTORIAL_STEPS, TUTORIALS, tutorialFor, TUTORIAL_KEY, sameTutMove, MAP_W, MAP_H, MAP_STOPS, FUTURE_STOPS, stopForLevel, icingPath, nzMapSvg, RACE_ICONS, raceIcon, isRaceIcon, raceStars, raceStop, allocateIcon, rankRacers, stackOffsets, racerFirst, rng, fromRows, toRows, findRuns, groups, specialFor, resolve, collapse, applyStep, validSwap, findMove, hasMove, shuffle, newBoard, newGame, play, grantPlayOutSpecial, runPlayOut, fireSpecialAt, settleBoard, listSpecials, listPlayOutCandies, starsFor, starsOf, goalsMet, jellyLeft, iceLeft, locksLeft, goalCounts, cloneState, bestMove, hintMoveFor, tryBeat, lvOf, isHole, isCandy, isIng, isBlock,
    allowed: () => !!(root.IBScores && root.IBScores.isShane && root.IBScores.isShane()),
    SCALE, SFX_MAX_HZ, SFX_LP, SFX_NOTE, SFX_MASTER, VOICE_VOL, CHIME_VOL, CHIME_DUR, VOICE_GAP, BGM_VOL, BGM_DUCK, END_VOL, MENU_VOL, XF,
    VOICE_FILES, VOICE_RANK, MEDIA_HASH, mediaUrl, gameTrack, attachSfxBus, playTone, playChime, playMovesWarnChime, playClip, voiceForStep,
    SAYINGS, SAYING_COLORS, SAYING_VOICE, sayingKind, pickSaying, sayingColor, MOVES_WARN_AT, MOVES_WARN_MS, HINT_IDLE_MS, HINT_REPEAT_MS,
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
  let race = { racers: [], offline: true, mine: null };
  let raceDemo = false; // test / screenshot only: never POST to the family backend


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
        // After a win song on the map, ease back into the menu loop.
        if (musicOn && screen === 'map') playKind(wantKind());
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
  const COL = [['#ff6b88', '#ff1a4a', '#c40032'], ['#ffb347', '#ff6a00', '#c44e00'], ['#ffe566', '#ffc107', '#d99400'], ['#5dff7a', '#12d04a', '#0b8a2c'], ['#6ed0ff', '#1a8cff', '#0b5ad6'], ['#d894ff', '#c026f0', '#7a12b0']];
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
      drawCandyShine(ctx, R * 0.85, 1);
      ctx.restore(); return;
    }
    if (t.ice > 0) {
      const g = ctx.createLinearGradient(-R, -R, R, R);
      g.addColorStop(0, t.ice > 1 ? 'rgba(230,248,255,.95)' : 'rgba(210,240,255,.85)');
      g.addColorStop(1, 'rgba(160,210,240,.8)');
      ctx.fillStyle = g; rr(-R * .85, -R * .85, R * 1.7, R * 1.7, R * .28); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = R * .08; rr(-R * .85, -R * .85, R * 1.7, R * 1.7, R * .28); ctx.stroke();
      drawCandyShine(ctx, R * 0.9, 0.95);
      ctx.restore(); return;
    }
    if (t.choco) {
      ctx.fillStyle = '#6b3a1f'; rr(-R * .85, -R * .85, R * 1.7, R * 1.7, R * .2); ctx.fill();
      ctx.fillStyle = '#4a2414'; rr(-R * .6, -R * .6, R * 1.2, R * 1.2, R * .12); ctx.fill();
      drawCandyShine(ctx, R * 0.85, 0.8);
      ctx.restore(); return;
    }
    if (t.c < 0) {
      const g = ctx.createRadialGradient(-R * .3, -R * .35, R * .1, 0, 0, R);
      g.addColorStop(0, '#9a6a4f'); g.addColorStop(.6, '#5b3423'); g.addColorStop(1, '#3a1f14');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * .95, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 14; i++) { const a = i * 2.39996, d = R * (.25 + .55 * ((i * 37) % 10) / 10); ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d); ctx.rotate(a * 1.7); ctx.fillStyle = COL[i % 6][1]; rr(-R * .13, -R * .05, R * .26, R * .1, R * .05); ctx.fill(); ctx.restore(); }
      drawCandyShine(ctx, R, 1);
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
    if (!reduce) {
      const breathe = 0.5 + 0.5 * Math.sin((performance.now() / 1100) + (t.c || 0) * 0.85);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.07 + 0.08 * breathe) + ')';
      shapePath(t.c, R * (t.s === 'w' ? .8 : 1) * 0.72);
      ctx.fill();
    }
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
    sparkleNext = t + (reduce ? 900 : (90 + Math.random() * 180));
  }
  function drawShimmerSweep(t) {
    if (reduce && sparkleHoldT == null) return;
    const p = shimmerAt(t);
    const x = (p * 1.7 - 0.35) * W;
    const g = ctx.createLinearGradient(x - CS * 1.4, -CS * 0.2, x + CS * 1.4, CS * 0.5);
    const peak = reduce ? 0.05 : 0.18;
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
      const hint = tickHint(t);
      const R = CS * .37;
      if (hint) drawHintGlow(hint, t, true);
      for (const s of sprites.values()) {
        if (s.tw) { const p = Math.min(1, (t - s.tw.t0) / s.tw.dur), e = s.tw.ease(p); s.x = s.tw.fx + (s.tw.tx - s.tw.fx) * e; s.y = s.tw.fy + (s.tw.ty - s.tw.fy) * e; if (p >= 1) s.tw = null; }
        if (s.pop) { const p = Math.min(1, (t - s.pop) / (220 * SP)); s.sc = 1 + .25 * p; s.al = 1 - p; }
        if (s.grow) { const p = Math.min(1, (t - s.grow) / (260 * SP)); s.sc = .3 + .7 * easeOut(p); if (p >= 1) s.grow = 0; }
        if (s.y < -0.5) continue;
        let wob = 0;
        if (hint && !reduce && hint.some(h => h[0] === s.r && h[1] === s.c)) wob = Math.sin(t / 180) * .12;
        drawSweet(s.t, s.x * CS + CS / 2, s.y * CS + CS / 2, R, s.sc, s.al, wob);
      }
      if (hint) drawHintGlow(hint, t, false);
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
        drawStarGlint(ctx, x, y, R * (0.24 + 0.22 * life) * s.sc, 1 * life * s.al, sp.rot);
      }
      if (tut && tut.active && tut.step && tut.step.hl && (tut.step.kind === 'move' || tut.step.kind === 'show')) {
        ctx.fillStyle = 'rgba(40, 8, 28, 0.55)';
        ctx.fillRect(0, 0, W, W);
        const lit = new Set(tut.step.hl.map(function (p) { return p[0] + ',' + p[1]; }));
        for (const key of lit) {
          const r = +key.split(',')[0], c = +key.split(',')[1];
          const jelly = st.jelly ? (st.jelly[r][c] || 0) : 0;
          ctx.fillStyle = jelly ? 'rgba(255,120,190,.28)' : ((r + c) % 2 ? 'rgba(255,255,255,.7)' : 'rgba(255,228,240,.85)');
          rr(c * CS + 1.5, r * CS + 1.5, CS - 3, CS - 3, CS * .18); ctx.fill();
        }
        const R2 = CS * .37;
        for (const s of sprites.values()) {
          if (s.y < -0.5) continue;
          if (!lit.has((Math.round(s.r)) + ',' + Math.round(s.c)) && !lit.has(Math.round(s.y) + ',' + Math.round(s.x))) continue;
          drawSweet(s.t, s.x * CS + CS / 2, s.y * CS + CS / 2, R2, s.sc, s.al, 0);
        }
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


  function setRaceOpen(on) {
    const board = $('raceboard'), chip = $('racechip');
    if (board) board.hidden = !on;
    if (chip) { chip.hidden = !!on; chip.setAttribute('aria-expanded', on ? 'true' : 'false'); }
  }
  function requestCloseSugar() {
    try { stopAllMusic(); } catch (e) { }
    try {
      if (root.parent && root.parent !== root) root.parent.postMessage({ type: 'ib-sugar-close' }, '*');
    } catch (e) { }
  }


  let tut = null, crush = null;
  function memberTag() {
    const me = root.IBScores && root.IBScores.who && root.IBScores.who();
    return (me && me.id) ? ':' + me.id : '';
  }
  function tutorialStorageKey(n) {
    return TUTORIAL_KEY + ':' + (n || 1) + memberTag();
  }
  function tutorialDone(n) {
    n = n || 1;
    if (ls.get(tutorialStorageKey(n), false)) return true;
    if (n === 1) {
      const old = TUTORIAL_KEY + memberTag();
      if (ls.get(old, false) || ls.get(TUTORIAL_KEY, false)) return true;
    }
    return false;
  }
  function markTutorialDone(n) { ls.set(tutorialStorageKey(n || 1), true); }
  function mechanicPreview(kind) {
    if (kind === 'collect' || kind === 'path') return '<span class="hearts">' + (kind === 'collect' ? '💖' : '🍋') + '</span>';
    if (kind === 'jelly' || kind === 'double') return kind === 'double' ? '<span class="dbl"><i></i><i></i></span>' : '<span class="jelly"></span>';
    if (kind === 'locks') return '<span class="lock">🔒</span>';
    if (kind === 'ice') return '<span class="ice"></span>';
    if (kind === 'ings') return '<span class="ing">🍒</span><span class="ing">🍋</span>';
    if (kind === 'choco') return '<span class="choco"></span>';
    if (kind === 'mix') return '<span class="jelly"></span><span class="lock">🔒</span><span class="ing">🎁</span>';
    return '<span class="pip c0"></span><span class="pip c1"></span><span class="pip c0"></span>';
  }
  function paintGoalStrip(lv, stt) {
    const info = levelIntro(lv && lv.n || 1, prog);
    const counts = goalCounts(lv, stt);
    const hold = $('cditems');
    if (hold) {
      const prev = (hold.dataset.sig || '').split(',');
      hold.innerHTML = counts.map(function (c, i) {
        const lab = c.kind === 'ings' ? c.lab : (c.kind === 'jelly' ? 'Jelly left' : 'left');
        const num = c.kind === 'ings' ? c.lab : String(c.left);
        const iconId = i === 0 ? ' id="gicon"' : '';
        return '<div class="cd-item" data-kind="' + c.kind + '" data-left="' + c.left + '"><span class="cd-icon"' + iconId + '>' + c.icon + '</span><span class="cd-num">' + num + '</span><span class="cd-lab">' + lab + '</span></div>';
      }).join('');
      const sig = counts.map(function (c) { return c.kind + ':' + c.left; }).join(',');
      if (stt && prev && prev[0] && prev.join(',') !== sig) {
        const items = hold.querySelectorAll('.cd-item');
        counts.forEach(function (c, i) {
          const was = prev[i] && +String(prev[i]).split(':')[1];
          if (items[i] && was != null && c.left < was) {
            items[i].classList.remove('tick');
            void items[i].offsetWidth;
            items[i].classList.add('tick');
          }
        });
      }
      hold.dataset.sig = sig;
    } else if ($('gicon')) $('gicon').textContent = (counts[0] && counts[0].icon) || info.icon;
    if ($('help')) {
      const bits = counts.map(function (c) { return c.text; });
      if (stt) bits.push(stt.moves + ' moves left');
      $('help').textContent = bits.length ? bits.join(' · ') : (stt ? info.goal : info.strip);
    }
    const strip = $('goalstrip');
    if (strip) strip.dataset.n = String(info.n);
    const mc = $('movecount');
    if (mc && stt) {
      mc.classList.toggle('low', stt.moves <= 5 && stt.moves > 0 && !goalsMet(stt));
    } else if (mc) mc.classList.remove('low');
  }
  function showIntro(n) {
    const info = levelIntro(n, prog); if (!info) return;
    pendingLv = n;
    doc.body.classList.toggle('sarah', info.theme === 'sarah');
    $('introstop').textContent = info.stopLine;
    $('introtitle').textContent = info.name;
    $('introicon').textContent = info.icon;
    $('introgoal').textContent = info.detail;
    $('intromoves').textContent = info.moves + ' moves';
    $('introbody').textContent = info.tip;
    $('introstars').innerHTML = [0, 1, 2].map(i => '<span class="' + (i < info.stars ? 'on' : '') + '">★</span>').join('');
    $('introstars').setAttribute('aria-label', info.stars ? info.stars + ' stars earned' : 'No stars yet');
    const b = info.badge;
    $('introbadge').textContent = b ? ('Badge: ' + b.icon + ' ' + b.name) : '';
    $('introprev').innerHTML = mechanicPreview(info.mechanic);
    $('introprev').dataset.mechanic = info.mechanic;
    $('introbtn').textContent = "Let's go!";
    const how = $('introhow');
    if (how) {
      how.hidden = !tutorialFor(n);
      how.textContent = tutorialDone(n) ? 'Replay tutorial' : (n === 1 ? 'How to play' : 'How this level works');
    }
    $('intro').hidden = false;
    if (musicOn) playKind(wantKind());
  }
  function hideIntro() {
    if ($('intro')) $('intro').hidden = true;
    doc.body.classList.remove('sarah');
  }
  function paintTutHud(on, ids) {
    const mark = function (el, yes) { if (el) el.classList.toggle('tut-hl', !!yes); };
    mark($('goalstrip'), on && ids && ids.indexOf('goalstrip') >= 0);
    if ($('score')) mark($('score').parentNode, on && ids && ids.indexOf('score') >= 0);
    if ($('moves')) mark($('moves').parentNode, on && ids && ids.indexOf('moves') >= 0);
    mark($('starbars') || doc.querySelector('.goal'), on && ids && ids.indexOf('starbars') >= 0);
  }
  function placeTutHand(a, z) {
    const el = $('tuthand');
    if (!el || !a || !z) { if (el) el.hidden = true; return; }
    const b = cv.getBoundingClientRect();
    const p = function (r, c) { return [b.left + (c + 0.5) * b.width / N, b.top + (r + 0.5) * b.height / N]; };
    const p1 = p(a[0], a[1]), p2 = p(z[0], z[1]);
    el.style.setProperty('--x1', p1[0] + 'px');
    el.style.setProperty('--y1', p1[1] + 'px');
    el.style.setProperty('--x2', p2[0] + 'px');
    el.style.setProperty('--y2', p2[1] + 'px');
    el.hidden = false;
  }
  let hintOn = false, hintHold = false;
  function noteActivity() {
    lastAct = now();
    hideHintHand();
    hintOn = false;
    hintMove = null;
  }
  function boardIdle() {
    if (!st || screen !== 'game' || st.over || st.tutorial || busy) return false;
    if (tut && tut.active) return false;
    if (crush && crush.active) return false;
    const ban = $('goalban'); if (ban && !ban.hidden) return false;
    const mw = $('moveswarn'); if (mw && !mw.hidden) return false;
    const recap = $('tutrecap'); if (recap && !recap.hidden) return false;
    for (const s of sprites.values()) if (s.tw || s.pop || s.grow) return false;
    return true;
  }
  function hideHintHand() {
    const el = $('hinthand');
    if (el) { el.hidden = true; el.classList.remove('mid'); }
  }
  function placeHintHand(a, z, mid) {
    const el = $('hinthand');
    if (!el || !a || !z || reduce) { hideHintHand(); return; }
    const b = cv.getBoundingClientRect();
    const p = function (r, c) { return [b.left + (c + 0.5) * b.width / N, b.top + (r + 0.5) * b.height / N]; };
    const p1 = p(a[0], a[1]), p2 = p(z[0], z[1]);
    el.style.setProperty('--x1', p1[0] + 'px');
    el.style.setProperty('--y1', p1[1] + 'px');
    el.style.setProperty('--x2', p2[0] + 'px');
    el.style.setProperty('--y2', p2[1] + 'px');
    el.classList.toggle('mid', !!mid);
    el.hidden = false;
  }
  function drawHintGlow(move, t, under) {
    if (!move) return;
    const pulse = reduce ? 1 : (0.7 + 0.3 * Math.sin((t || now()) / 280));
    for (const p of move) {
      const x = p[1] * CS, y = p[0] * CS;
      ctx.save();
      if (under) {
        ctx.fillStyle = 'rgba(255, 215, 70, ' + (0.22 * pulse) + ')';
        rr(x + 2, y + 2, CS - 4, CS - 4, CS * .2); ctx.fill();
      } else {
        ctx.shadowColor = 'rgba(255, 200, 40, ' + (0.9 * pulse) + ')';
        ctx.shadowBlur = 16 * DPR;
        ctx.strokeStyle = 'rgba(255, 214, 60, ' + (0.95 * pulse) + ')';
        ctx.lineWidth = 4 * DPR;
        rr(x + 3, y + 3, CS - 6, CS - 6, CS * .2); ctx.stroke();
      }
      ctx.restore();
    }
  }
  function tickHint(t) {
    if (hintHold) {
      if (hintMove && !reduce) placeHintHand(hintMove[0], hintMove[1], true);
      return hintMove;
    }
    if (!boardIdle() || (t - lastAct) < HINT_IDLE_MS) {
      if (hintOn) { hideHintHand(); hintOn = false; }
      return null;
    }
    if (!hintMove) hintMove = hintMoveFor(st);
    if (!hintMove) { hideHintHand(); hintOn = false; return null; }
    if (!hintOn) {
      hintOn = true;
      if (!reduce) placeHintHand(hintMove[0], hintMove[1]);
    }
    return hintMove;
  }
  function showHint(opt) {
    opt = opt || {};
    if (!st) return null;
    hintHold = !!opt.hold;
    lastAct = now() - HINT_IDLE_MS - 50;
    hintMove = hintMoveFor(st) || findMove(st.board, st.mask);
    hintOn = !!hintMove;
    if (hintOn && !reduce) placeHintHand(hintMove[0], hintMove[1], !!opt.mid);
    else hideHintHand();
    return hintMove && hintMove.map(function (p) { return p.slice(); });
  }
  function hideTutUi() {
    hideHintHand();
    hintOn = false;
    hintHold = false;
    if ($('tut')) $('tut').hidden = true;
    if ($('tuthand')) $('tuthand').hidden = true;
    if ($('tutnext')) $('tutnext').hidden = true;
    paintTutHud(false, []);
    doc.body.classList.remove('ontut');
  }
  function hideRecap() { if ($('tutrecap')) $('tutrecap').hidden = true; }
  function showRecap(step) {
    const ov = $('tutrecap'), list = $('recaplist');
    if (!ov) { finishTutorial(true); return; }
    $('recaptitle').textContent = step.title || 'A little of everything';
    $('recapbody').textContent = step.bubble || '';
    list.innerHTML = (step.items || []).map(function (it) {
      return '<li><span>' + it.icon + '</span>' + it.text + '</li>';
    }).join('');
    hideTutUi();
    ov.hidden = false;
  }
  function showTutStep(i) {
    const steps = tutorialFor((tut && tut.n) || 1) || [];
    const step = steps[i];
    if (!step) { finishTutorial(true); return; }
    tut = { active: true, i: i, step: step, n: (tut && tut.n) || 1 };
    doc.body.classList.add('ontut');
    if (step.kind === 'recap') { showRecap(step); return; }
    hideRecap();
    const n = tut.n;
    const needBoot = (step.board && !step.keepBoard) || !st || (st.lv && st.lv.n !== n);
    if (needBoot) bootLevel(n, { board: step.board, jelly: step.jelly, locks: step.locks, tutorial: true });
    if (step.kind === 'hud' || step.kind === 'ready' || step.kind === 'show') {
      if (!st) bootLevel(n, { board: (steps[0] && steps[0].board) || null, tutorial: true });
      if (st) { st.over = false; hud(); }
    }
    $('tut').hidden = false;
    $('tuttext').textContent = step.bubble;
    const next = $('tutnext');
    next.hidden = step.kind === 'move';
    next.textContent = step.kind === 'ready' ? "Let's play!" : 'Next';
    paintTutHud(step.kind === 'hud', step.hlHud || []);
    const goHand = function () { placeTutHand(step.kind === 'move' ? step.move[0] : null, step.kind === 'move' ? step.move[1] : null); };
    if (root.requestAnimationFrame) root.requestAnimationFrame(function () { root.requestAnimationFrame(goHand); });
    else goHand();
    if (step.kind !== 'move' && $('tuthand')) $('tuthand').hidden = true;
  }
  function finishTutorial(playOn) {
    const n = (tut && tut.n) || pendingLv || 1;
    markTutorialDone(n);
    tut = null;
    hideTutUi();
    hideRecap();
    if (playOn !== false) startLevel(n);
    else showMap();
  }
  function skipTutorial() { finishTutorial(true); }
  function startTutorial(opts) {
    opts = opts || {};
    hideIntro();
    hideRecap();
    if ($('end')) $('end').hidden = true;
    const n = opts.level || pendingLv || 1;
    if (!tutorialFor(n)) { startLevel(n); return; }
    tut = { active: true, i: opts.step || 0, n: n };
    showTutStep(tut.i);
  }
  function bootLevel(n, opt) {
    opt = opt || {};
    $('intro').hidden = true; $('end').hidden = true; $('map').hidden = true; $('game').hidden = false;
    if ($('goalban')) $('goalban').hidden = true;
    if ($('goalnext')) $('goalnext').hidden = true;
    if (!opt.tutorial) hideTutUi();
    hideRecap();
    doc.body.classList.remove('onmap', 'oncrush');
    if (!opt.tutorial) doc.body.classList.remove('sarah');
    screen = 'game';
    lvNum = n;
    const lv = LEVELS[n - 1];
    doc.body.classList.toggle('sarah', lv.theme === 'sarah');
    $('lvname').textContent = 'Level ' + n + ' · ' + lv.name;
    paintGoalStrip(lv);
    st = newGame(opt.board ? { level: lv, board: fromRows(opt.board) } : { level: lv });
    if (opt.locks) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (+(opt.locks[r] && opt.locks[r][c]) && st.board[r][c] && st.board[r][c].c >= 0) st.board[r][c].lock = 1;
      }
    }
    if (opt.jelly) st.jelly = parseDigits(opt.jelly);
    if (opt.tutorial) st.tutorial = true;
    sel = null; busy = false; lastAct = now();
    crush = null; warned3 = false; hintOn = false; hintHold = false; hintMove = null; hideHintHand(); hideMovesWarn(); lastSaying = ''; sayUntil = 0; hideSaying();
    fitCanvas(); syncAll(); hud();
    paintGoalStrip(lv, st);
    hintMove = opt.tutorial ? null : findMove(st.board, st.mask);
    for (const s of sprites.values()) { s.y = s.r - N - 1 + (N - s.r) * .2; moveTo(s, s.r, s.c, 300 + (N - s.r) * 40, easeOut); }
    if (musicOn) playKind(wantKind());
  }
  function beginLevel(n) {
    hideIntro();
    if (tutorialFor(n) && !tutorialDone(n)) startTutorial({ level: n });
    else startLevel(n);
  }

  function paintButtons() {
    const s = soundOn ? '🔉 Sound on' : '🔇 Sound off', m = musicOn ? '🎵 Music on' : '🎵 Music off';
    if ($('soundbtn')) $('soundbtn').textContent = s;
    if ($('musicbtn')) $('musicbtn').textContent = m;
    if ($('mapsound')) { $('mapsound').textContent = soundOn ? '🔉' : '🔇'; $('mapsound').setAttribute('aria-label', s); }
    if ($('mapmusic')) { $('mapmusic').textContent = '🎵'; $('mapmusic').setAttribute('aria-label', m); $('mapmusic').classList.toggle('off', !musicOn); }
  }
  function objText(g) {
    if (!g || !g.lv) return '';
    const lv = g.lv, bits = [];
    if (lv.collect) bits.push((NAMES[lv.collect.color] || 'Sweets') + ' ' + (g.collected[lv.collect.color] || 0) + ' / ' + lv.collect.n);
    if (lv.jelly) bits.push('Jelly ' + jellyLeft(g) + ' left');
    if (lv.ice) bits.push('Icing ' + iceLeft(g.board) + ' left');
    if (lv.ings && lv.ings.length) bits.push('Ingredients ' + ((lv.ings.length - (g.ingsLeft || 0))) + ' / ' + lv.ings.length);
    if (lv.locks) bits.push('Locks ' + locksLeft(g.board) + ' left');
    return bits.join(' · ');
  }
  function hud() {
    if (!st) return;
    $('score').textContent = st.score.toLocaleString('en-NZ');
    $('moves').textContent = st.moves;
    $('best').textContent = Math.max(prog.best[st.lv.n - 1] || 0, st.score).toLocaleString('en-NZ');
    $('obj').textContent = objText(st);
    if (st.lv) paintGoalStrip(st.lv, st);
    const stars = st.lv.stars, max = stars[2] || 1, p = Math.min(1, st.score / max);
    $('fill').style.width = (p * 100).toFixed(1) + '%';
    stars.forEach((s, i) => { const el = $('st' + i); el.style.left = (s / max * 100) + '%'; el.classList.toggle('got', st.score >= s && (s > 0 || st.won)); });
  }
  function praise(step, i) {
    // Kept as a thin wrapper for older call sites; the on-board line now comes from pickSaying.
    const kind = sayingKind(step, step && (step.cascade || (i + 1)), st);
    return kind ? pickSaying(kind, lastSaying) : '';
  }

  let lastSaying = '', sayUntil = 0, sayTimer = 0, warned3 = false, warnTimer = 0;
  function hideSaying() {
    const el = $('saypop');
    if (el) { el.hidden = true; el.textContent = ''; el.className = 'saypop'; }
    if (sayTimer) { clearTimeout(sayTimer); sayTimer = 0; }
  }
  function showSaying(step, i) {
    const kind = sayingKind(step, step && (step.cascade || (i + 1)), st);
    if (!kind) return null;
    const t = now();
    if (t < sayUntil) return null;
    const text = pickSaying(kind, lastSaying);
    if (!text) return null;
    lastSaying = text;
    sayUntil = t + (reduce ? 1400 : 1100);
    const el = $('saypop');
    if (el) {
      el.textContent = text;
      el.style.color = sayingColor(kind);
      el.hidden = false;
      el.className = 'saypop kind-' + kind;
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
      if (sayTimer) clearTimeout(sayTimer);
      sayTimer = setTimeout(hideSaying, reduce ? 900 : 1100);
    }
    return text;
  }
  function hideMovesWarn() {
    const el = $('moveswarn');
    if (el) { el.hidden = true; el.classList.remove('run', 'mid', 'reduce'); }
    if (warnTimer) { clearTimeout(warnTimer); warnTimer = 0; }
  }
  function showMovesWarn(opt) {
    opt = opt || {};
    const el = $('moveswarn');
    if (!el) return;
    el.hidden = false;
    el.classList.toggle('reduce', !!reduce);
    el.classList.toggle('mid', !!opt.mid);
    el.classList.remove('run');
    void el.offsetWidth;
    el.classList.add('run');
    if (!opt.silent) {
      runAudio(() => {
        if (!out) return;
        playMovesWarnChime(ac, out, ac.currentTime + 0.01);
      });
    }
    if (warnTimer) { clearTimeout(warnTimer); warnTimer = 0; }
    if (!opt.hold) {
      const dur = reduce ? 2000 : MOVES_WARN_MS;
      warnTimer = setTimeout(hideMovesWarn, dur + 40);
    }
    return el;
  }
  function maybeWarn3() {
    if (!st || warned3 || st.tutorial || (tut && tut.active) || (crush && crush.active) || st.over) return;
    if (st.moves !== MOVES_WARN_AT || goalsMet(st)) return;
    warned3 = true;
    showMovesWarn();
  }


  function myLocalRacer() {
    const S = root.IBScores;
    const me = S && S.who && S.who();
    const taken = (race.racers || []).filter(function (r) { return !r.mine; }).map(function (r) { return r.icon; });
    let icon = ls.get('ib-sugar-icon', null);
    if (!isRaceIcon(icon) || (taken.indexOf(icon) >= 0 && !(race.mine && race.mine.icon === icon))) {
      icon = allocateIcon(taken, (me && (me.id || me.name)) || 'me');
      ls.set('ib-sugar-icon', icon);
    }
    return { name: (me && (me.first || me.name)) || 'You', icon: icon, stop: raceStop(prog), stars: raceStars(prog), mine: true };
  }
  function renderRacers() {
    const hold = $('racers');
    if (!hold) return;
    hold.innerHTML = '';
    const list = race.racers && race.racers.length ? race.racers : (race.mine ? [race.mine] : []);
    const byStop = new Map();
    list.forEach(function (r) {
      const n = Math.max(1, Math.min(10, r.stop || 1));
      if (!byStop.has(n)) byStop.set(n, []);
      byStop.get(n).push(r);
    });
    byStop.forEach(function (group, n) {
      const stop = stopForLevel(n);
      if (!stop) return;
      const ordered = group.slice().sort(function (a, b) { return (a.mine ? 1 : 0) - (b.mine ? 1 : 0); });
      ordered.forEach(function (r, i) {
        const ic = raceIcon(r.icon) || RACE_ICONS[0];
        const off = stackOffsets(ordered.length, i, stop.label);
        const el = doc.createElement('div');
        el.className = 'racer' + (r.mine ? ' me' : '');
        el.dataset.name = racerFirst(r.name);
        el.dataset.stop = String(n);
        el.style.left = (stop.x / MAP_W * 100) + '%';
        el.style.top = (stop.y / MAP_H * 100) + '%';
        el.style.transform = 'translate(calc(-50% + ' + off.x + 'px), calc(-50% + ' + off.y + 'px))';
        el.innerHTML = '<span class="face" style="--ic:' + ic.color + '">' + ic.emoji + '</span><span class="nm">' + racerFirst(r.name) + '</span>';
        el.setAttribute('aria-label', racerFirst(r.name) + ' is at ' + stop.place + (r.mine ? ' (you)' : ''));
        hold.appendChild(el);
      });
    });
  }
  function renderRaceBoard() {
    const board = $('raceboard'), list = $('racelist'), note = $('racenote');
    if (!board || !list) return;
    const rows = rankRacers(race.racers && race.racers.length ? race.racers : (race.mine ? [race.mine] : []));
    list.innerHTML = '';
    rows.forEach(function (r, i) {
      const ic = raceIcon(r.icon) || RACE_ICONS[0];
      const stop = stopForLevel(r.stop) || { place: 'Start' };
      const li = doc.createElement('li');
      if (r.mine) li.className = 'me';
      li.innerHTML = '<span class="rk">' + (i + 1) + '</span><span class="face" style="--ic:' + ic.color + '">' + ic.emoji + '</span><span class="who">' + racerFirst(r.name) + (r.mine ? ' <em>you</em>' : '') + '</span><span class="at">' + stop.place + '</span><span class="rs">' + (r.stars || 0) + '★</span>';
      list.appendChild(li);
    });
    if (note) {
      note.hidden = !race.offline;
      note.textContent = race.offline ? 'Just you on this phone (offline).' : '';
    }
    const chip = $('racechip');
    if (chip) {
      const lead = rows[0];
      const ic = lead && (raceIcon(lead.icon) || RACE_ICONS[0]);
      if (lead && ic) {
        chip.innerHTML = '<span class="face" style="--ic:' + ic.color + '">' + ic.emoji + '</span><span>🏁 ' + racerFirst(lead.name) + ' ' + (lead.stars || 0) + '★</span>';
        chip.setAttribute('aria-label', 'Family race, ' + racerFirst(lead.name) + ' is in the lead with ' + (lead.stars || 0) + ' stars. Tap to open.');
      } else {
        chip.innerHTML = '🏁 Race';
        chip.setAttribute('aria-label', 'Family race');
      }
    }
  }
  function applyRace(data, offline) {
    const self = myLocalRacer();
    let racers = (data && Array.isArray(data.racers)) ? data.racers.map(function (r) {
      return { name: r.name, icon: r.icon, stop: r.stop, stars: r.stars, mine: !!r.mine };
    }) : [];
    if (!racers.some(function (r) { return r.mine; })) racers.push(self);
    else racers = racers.map(function (r) { return r.mine ? Object.assign({}, r, self) : r; });
    race = { racers: racers, offline: !!offline, mine: self };
    renderRacers();
    renderRaceBoard();
  }
  // Local test / screenshot helper. Never talks to the family backend.
  function seedRace(list) {
    raceDemo = true;
    const self = myLocalRacer();
    const racers = (list || []).map(function (r) {
      return { name: r.name, icon: r.icon, stop: r.stop, stars: r.stars || 0, mine: !!r.mine };
    });
    if (!racers.some(function (r) { return r.mine; })) {
      const mine = racers.find(function (r) { return racerFirst(r.name) === self.name; });
      if (mine) mine.mine = true;
      else racers.push(self);
    }
    const me = racers.find(function (r) { return r.mine; });
    if (me) ls.set('ib-sugar-icon', me.icon);
    race = { racers: racers, offline: false, mine: me || self };
    renderRacers();
    renderRaceBoard();
    return racers;
  }
  async function syncRace(push) {
    if (raceDemo) { renderRacers(); renderRaceBoard(); return race; }
    const S = root.IBScores;
    const me = S && S.who && S.who();
    const self = myLocalRacer();
    race.mine = self;
    if (!me || !S || !S.loadRace) {
      applyRace({ racers: [self] }, true);
      return race;
    }
    let data = null;
    try { data = await S.loadRace(); } catch (e) { data = null; }
    const family = data && Array.isArray(data.racers) ? data.racers : null;
    if (!family) {
      applyRace({ racers: [self] }, true);
      if (push && S.saveRace) { try { await S.saveRace({ icon: self.icon, stop: self.stop, stars: self.stars }); } catch (e) { } }
      return race;
    }
    const taken = family.filter(function (r) { return !r.mine; }).map(function (r) { return r.icon; });
    const mineRow = family.find(function (r) { return r.mine; });
    let icon = self.icon;
    if (mineRow && isRaceIcon(mineRow.icon) && (!isRaceIcon(ls.get('ib-sugar-icon', null)) || mineRow.icon === ls.get('ib-sugar-icon', null))) {
      icon = mineRow.icon;
      ls.set('ib-sugar-icon', icon);
    } else if (taken.indexOf(icon) >= 0) {
      icon = allocateIcon(taken, (me && (me.id || me.name)) || 'me');
      ls.set('ib-sugar-icon', icon);
    }
    self.icon = icon;
    if (push !== false && S.saveRace) {
      try {
        const saved = await S.saveRace({ icon: icon, stop: self.stop, stars: self.stars });
        if (saved && saved.err === 'icon taken' && saved.suggested && isRaceIcon(saved.suggested)) {
          icon = saved.suggested;
          ls.set('ib-sugar-icon', icon);
          self.icon = icon;
          await S.saveRace({ icon: icon, stop: self.stop, stars: self.stars });
        }
        data = await S.loadRace() || data;
      } catch (e) { }
    }
    applyRace(data || { racers: family }, false);
    return race;
  }
  function openIconPicker() {
    const ov = $('iconpick');
    if (!ov) return;
    const grid = $('icongrid');
    const takenBy = {};
    (race.racers || []).forEach(function (r) { if (r.icon && !r.mine) takenBy[r.icon] = racerFirst(r.name); });
    const mine = (race.mine && race.mine.icon) || ls.get('ib-sugar-icon', null) || allocateIcon(Object.keys(takenBy), 'me');
    grid.innerHTML = '';
    RACE_ICONS.forEach(function (ic) {
      const b = doc.createElement('button');
      b.type = 'button';
      const taken = takenBy[ic.id];
      b.className = 'iconopt' + (ic.id === mine ? ' on' : '') + (taken ? ' taken' : '');
      b.disabled = !!taken;
      b.dataset.id = ic.id;
      b.innerHTML = '<span class="face" style="--ic:' + ic.color + '">' + ic.emoji + '</span><span class="lab">' + (taken ? taken : ic.name) + '</span>';
      b.setAttribute('aria-label', taken ? (ic.name + ' is used by ' + taken) : ('Pick ' + ic.name));
      if (!taken) b.addEventListener('click', function () {
        ls.set('ib-sugar-icon', ic.id);
        ov.hidden = true;
        if (raceDemo && race.mine) {
          race.mine.icon = ic.id;
          race.racers = race.racers.map(function (r) { return r.mine ? Object.assign({}, r, { icon: ic.id }) : r; });
          renderRacers(); renderRaceBoard();
        } else {
          syncRace(true);
        }
      });
      grid.appendChild(b);
    });
    ov.hidden = false;
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
    const mini = $('minishelf');
    if (mini) mini.innerHTML = '';
    LEVELS.forEach((lv, i) => {
      const got = !!(prog.badges[i]);
      const el = doc.createElement('div');
      el.className = 'badge' + (got ? ' got' : '') + (lv.badge && lv.badge.special ? ' heart' : '');
      el.innerHTML = '<i>' + (got ? lv.badge.icon : '·') + '</i><b>' + (got ? lv.badge.name : 'Level ' + (i + 1)) + '</b>';
      shelf.appendChild(el);
      if (mini && got && lv.badge) {
        const d = doc.createElement('i');
        d.className = 'got';
        d.textContent = lv.badge.icon;
        d.title = lv.badge.name;
        mini.appendChild(d);
      }
    });
    renderRacers();
    renderRaceBoard();
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
    if (!(opts && opts.keepSong)) stopEnd();
    screen = 'map';
    if ($('goalnext') && !(opts && opts.keepNext)) $('goalnext').hidden = true;
    const winPath = doc.querySelector('#sr-path-win');
    if (winPath && !(opts && opts.keepPath)) { winPath.classList.remove('on'); winPath.setAttribute('d', ''); }
    $('game').hidden = true; $('intro').hidden = true; $('end').hidden = true; $('map').hidden = false;
    doc.body.classList.remove('sarah');
    doc.body.classList.add('onmap');
    renderMap(); paintButtons();
    syncRace(true);
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
    showIntro(n);
  }
  function startLevel(n) {
    tut = null;
    hideTutUi();
    bootLevel(n);
  }

  async function attempt(a, z) {
    if (busy || !st || st.over) return;
    if (tut && tut.active && tut.step && tut.step.kind === 'move' && !sameTutMove(a, z, tut.step.move)) {
      // bounce any other swap; the player must make the shown move
      const Atb = st.board[a[0]][a[1]], Ztb = st.board[z[0]][z[1]];
      if (!Atb || !Ztb) return;
      sel = null; busy = true;
      const As = sprites.get(Atb.id), Zs = sprites.get(Ztb.id);
      if (As) moveTo(As, z[0], z[1], 160); if (Zs) moveTo(Zs, a[0], a[1], 160);
      await wait(170);
      if (As) moveTo(As, a[0], a[1], 180); if (Zs) moveTo(Zs, z[0], z[1], 180);
      await wait(190); busy = false; return;
    }
    const At = st.board[a[0]][a[1]], Zt = st.board[z[0]][z[1]];
    if (!At || !Zt || isHole(At) || isHole(Zt)) return;
    sel = null; busy = true; lastAct = now(); hintMove = null; hintOn = false; hideHintHand();
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
    hintMove = null; hintOn = false; hideHintHand();
    busy = false; lastAct = now();
    if (tut && tut.active && tut.step && tut.step.kind === 'move') {
      await wait(500 * SP);
      showTutStep(tut.i + 1);
      return;
    }
    if (goalsMet(st) && !st.tutorial) { await beginGoalFinish(); return; }
    maybeWarn3();
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
    showSaying(s, i);
    for (const m of s.madeTiles || []) { const sp = sprite(m.t, m.r, m.c); sp.grow = t; }
    if (s.delivered) for (const d of s.delivered) { const sp = sprites.get(d.t.id); if (sp) sp.pop = t; }
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
    syncRace(true);
    const firstThree = stars === 3 && prevStars < 3;
    // Yum! when a new badge is earned (first win) or the first 3-star on a level;
    // Sweet Sparkle for a later ordinary win.
    return { newBadge, yum: newBadge || firstThree, firstThree, stars };
  }
  function crushWait(ms) {
    if (crush && crush.skip) return Promise.resolve();
    if (crush && crush.fast) ms = Math.min(ms, 55);
    if (reduce) ms = Math.min(ms, 90);
    return wait(ms * SP);
  }
  function playSting() {
    runAudio(() => {
      if (!out || !ac) return;
      const t0 = ac.currentTime + 0.01;
      const notes = [SCALE[1], SCALE[3], SCALE[4], SCALE[4] * 1.25 > 800 ? SCALE[4] : SCALE[4] * 5 / 4];
      notes.forEach(function (f, i) { playTone(ac, out, f, t0 + i * 0.09, 0.22, CHIME_VOL * 1.15); });
    });
  }
  function playRise(n) {
    runAudio(() => {
      if (!out || !ac) return;
      playChime(ac, out, ac.currentTime + 0.01, n);
    });
  }
  function playWhoosh(kind) {
    runAudio(() => {
      if (!out || !ac) return;
      const t0 = ac.currentTime + 0.01;
      if (kind === 'w' || kind === 'b') playTone(ac, out, 400, t0, 0.28, CHIME_VOL * 1.05, 'triangle');
      else playTone(ac, out, SCALE[2], t0, 0.18, CHIME_VOL * 0.9);
    });
  }
  function playStarChime(i) {
    runAudio(() => {
      if (!out || !ac) return;
      playChime(ac, out, ac.currentTime + 0.01, 2 + i);
    });
  }
  function showGoalBanner(on) {
    const el = $('goalban');
    if (!el) return;
    if (on) el.classList.remove('playing');
    el.hidden = !on;
  }
  function speedCrush() {
    if (!crush || !crush.active) return;
    if (crush.fast) crush.skip = true;
    else crush.fast = true;
  }
  async function animateGrant(g) {
    if (!g) return;
    const t = st.board[g.r][g.c];
    if (t) {
      const s = sprites.get(t.id) || sprite(t, g.r, g.c);
      s.grow = now();
      s.t = t;
    }
    playRise(crush && crush.n != null ? crush.n++ : 0);
    addText('+' + g.points, cellXY(g.r, g.c)[0], cellXY(g.r, g.c)[1], 22, '#ffe066');
    hud();
    await crushWait(380);
  }
  async function runCrushFire() {
    for (let guard = 0; guard < 40; guard++) {
      if (!st) break;
      const specs = listSpecials(st);
      if (!specs.length) {
        const extra = settleBoard(st);
        if (!extra.length) break;
        for (let i = 0; i < extra.length; i++) await showStep(extra[i], i);
        continue;
      }
      const [r, c] = specs[0];
      const t = st.board[r][c];
      playWhoosh(t && t.s);
      const res = fireSpecialAt(st, r, c);
      for (let i = 0; i < res.steps.length; i++) await showStep(res.steps[i], i);
      if (crush && crush.skip) {
        // apply any remaining instantly after this volley
        const rest = runPlayOut(Object.assign(st, { moves: 0 }));
        if (rest.fired && rest.fired.length) {
          /* already applied inside runPlayOut on same state with moves 0: only fires. */
        }
        hud();
        syncAll();
        break;
      }
    }
  }
  async function beginGoalFinish() {
    if ((tut && tut.active) || (st && st.tutorial) || (crush && crush.active)) return;
    if (!st || !goalsMet(st)) return;
    st.won = true;
    st.over = true;
    st.crushing = true;
    busy = true;
    hintMove = null; hintOn = false; hintHold = false; hideHintHand();
    sel = null;
    crush = { active: true, skip: false, fast: !!reduce, n: 0, from: st.lv.n };
    doc.body.classList.add('oncrush');
    hud();
    showGoalBanner(true);
    playSting();
    say('yay');
    await crushWait(reduce ? 200 : 900);
    if ($('goalban')) $('goalban').classList.add('playing');
    while (st && st.moves > 0) {
      const g = grantPlayOutSpecial(st);
      if (!g) break;
      await animateGrant(g);
      if (crush.skip) {
        while (st.moves > 0) {
          const more = grantPlayOutSpecial(st);
          if (!more) break;
        }
        hud();
        syncAll();
        break;
      }
    }
    await runCrushFire();
    if ($('goalban')) $('goalban').classList.remove('playing');
    showGoalBanner(false);
    if (st) {
      st.stars = starsOf(Object.assign({}, st, { won: true }));
      if (st.score > (prog.best[st.lv.n - 1] || 0)) { prog.best[st.lv.n - 1] = st.score; saveProg(); }
      winInfo = recordWin(st);
    }
    crush.active = false;
    doc.body.classList.remove('oncrush');
    if (musicOn) playEndSong(winInfo && winInfo.yum ? 'yum' : 'win');
    await showEnd({ animateStars: true });
  }
  function finish() {
    if ((tut && tut.active) || (st && st.tutorial)) return;
    if (st && st.won && goalsMet(st) && !st.crushing) { beginGoalFinish(); return; }
    const won = st.won;
    if (st.score > (prog.best[st.lv.n - 1] || 0)) { prog.best[st.lv.n - 1] = st.score; saveProg(); }
    winInfo = won ? recordWin(st) : { newBadge: false, yum: false, stars: 0 };
    if (won) say('yay');
    if (won && musicOn) setTimeout(() => { if (musicOn) playEndSong(winInfo.yum ? 'yum' : 'win'); }, 480);
    setTimeout(() => showEnd(), 500 * SP);
  }
  function animatePathSegment(fromN, toN) {
    const el = doc.querySelector('#sr-path-win');
    if (!el || !fromN || !toN || toN <= fromN) return;
    const d = icingPath([MAP_STOPS[fromN - 1], MAP_STOPS[toN - 1]]);
    el.setAttribute('d', d);
    el.classList.add('on');
    try {
      const len = el.getTotalLength();
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
      if (reduce) { el.style.strokeDashoffset = '0'; return; }
      el.style.transition = 'none';
      el.getBoundingClientRect();
      el.style.transition = 'stroke-dashoffset .8s ease';
      el.style.strokeDashoffset = '0';
    } catch (e) { }
  }
  async function hopRacer(fromN, toN) {
    const me = doc.querySelector('.racer.me');
    if (!me || !fromN || !toN || fromN === toN) return;
    const a = MAP_STOPS[fromN - 1], b = MAP_STOPS[toN - 1];
    if (!a || !b) return;
    me.classList.add('hopping');
    me.style.left = (a.x / MAP_W * 100) + '%';
    me.style.top = (a.y / MAP_H * 100) + '%';
    await wait(reduce ? 20 : 40);
    me.style.left = (b.x / MAP_W * 100) + '%';
    me.style.top = (b.y / MAP_H * 100) + '%';
    await wait(reduce ? 80 : 750);
    me.classList.remove('hopping');
  }
  async function celebrateOnMap(fromN, toN) {
    showMap({ scroll: toN || 'start', behavior: reduce ? 'auto' : 'smooth', keepSong: true });
    await wait(reduce ? 60 : 280);
    animatePathSegment(fromN, toN);
    await hopRacer(fromN, toN);
    const ov = $('goalnext');
    if (ov && toN && toN <= 10 && fromN < 10) {
      $('goalnexttitle').textContent = 'On to ' + (stopForLevel(toN) && stopForLevel(toN).place || ('level ' + toN));
      $('goalnextmsg').textContent = 'Level ' + toN + ' is open.';
      $('goalnextbtn').hidden = false;
      ov.hidden = false;
    }
  }
  async function showEnd(opts) {
    if (!st) return;
    opts = opts || {};
    const won = st.won, n = st.stars || 0, lv = st.lv;
    $('endtitle').textContent = won ? (lv.theme === 'sarah' ? "Sarah's level complete!" : ('Level ' + lv.n + ' complete!')) : 'So close!';
    if (won && opts.animateStars && n > 0) {
      $('endstars').innerHTML = [0, 1, 2].map(() => '<span>★</span>').join('');
    } else {
      $('endstars').innerHTML = [0, 1, 2].map(i => '<span class="' + (i < n ? 'on' : '') + '">★</span>').join('');
    }
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
      if (lv.collect) bits.push('you needed ' + lv.collect.n + ' ' + (NAMES[lv.collect.color] || 'sweets').toLowerCase());
      if (lv.jelly) bits.push('some jelly is still on the tray');
      if (lv.ice) bits.push('some icing is still in the way');
      if (lv.ings && lv.ings.length) bits.push('an ingredient did not make it down');
      if (lv.locks) bits.push('some jars are still locked');
      $('endmsg').textContent = bits.length ? ('Not quite — ' + bits.join(', ') + '. Have another go!') : 'Have another go!';
    }
    $('againbtn').textContent = won ? 'Play again' : 'Try again';
    $('nextbtn').hidden = !(won && lv.n < 10);
    if (won && opts.animateStars) {
      $('nextbtn').hidden = true;
      if ($('endmap')) $('endmap').hidden = true;
    } else if ($('endmap')) $('endmap').hidden = false;
    $('end').hidden = false;
    if (won && opts.animateStars && n > 0) {
      const kids = $('endstars').children;
      for (let i = 0; i < n; i++) {
        await crushWait(reduce ? 80 : 420);
        if (kids[i]) kids[i].className = 'on fillin';
        playStarChime(i);
      }
      await crushWait(reduce ? 120 : 700);
      $('end').hidden = true;
      if ($('endmap')) $('endmap').hidden = false;
      await celebrateOnMap(lv.n, lv.n < 10 ? lv.n + 1 : lv.n);
    }
  }
  function leaveEnd() { stopEnd(); $('end').hidden = true; }
  function restart() {
    if (tut && tut.active) return;
    leaveEnd();
    startLevel(lvNum);
  }
  function goNext() {
    leaveEnd();
    if ($('goalnext')) $('goalnext').hidden = true;
    if (lvNum < 10) openLevel(lvNum + 1);
    else showMap();
    if (musicOn && !endPlaying) playKind(wantKind());
  }
  function backToMap() {
    leaveEnd();
    if ($('goalnext')) $('goalnext').hidden = true;
    if (tut) { tut = null; hideTutUi(); hideRecap(); }
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
  cv.addEventListener('pointerdown', e => { unlockAudio(); noteActivity(); if (crush && crush.active) { speedCrush(); e.preventDefault(); return; } const p = cellAt(e); if (!p) return; down = { p, x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch (er) { } e.preventDefault(); });
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
    noteActivity();
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
  $('introbtn').addEventListener('click', () => { unlockAudio(); beginLevel(pendingLv); });
  if ($('introx')) $('introx').addEventListener('click', () => { unlockAudio(); hideIntro(); });
  if ($('intro')) $('intro').addEventListener('click', e => { if (e.target === $('intro')) hideIntro(); });
  if ($('introhow')) $('introhow').addEventListener('click', () => { unlockAudio(); startTutorial({ level: pendingLv }); });
  if ($('howtobtn')) $('howtobtn').addEventListener('click', () => { unlockAudio(); startTutorial({ level: 1 }); });
  if ($('tutskip')) $('tutskip').addEventListener('click', () => { unlockAudio(); skipTutorial(); });
  if ($('tutnext')) $('tutnext').addEventListener('click', () => {
    unlockAudio();
    if (!tut || !tut.active) return;
    if (tut.step && tut.step.kind === 'ready') finishTutorial(true);
    else showTutStep(tut.i + 1);
  });
  if ($('recapgo')) $('recapgo').addEventListener('click', () => { unlockAudio(); finishTutorial(true); });
  if ($('tutrecap')) $('tutrecap').addEventListener('click', e => { if (e.target === $('tutrecap')) finishTutorial(true); });
  if ($('goalskip')) $('goalskip').addEventListener('click', () => { unlockAudio(); speedCrush(); });
  if ($('goalban')) $('goalban').addEventListener('click', () => { unlockAudio(); speedCrush(); });
  if ($('goalnextbtn')) $('goalnextbtn').addEventListener('click', () => { unlockAudio(); goNext(); });
  if ($('goalmapbtn')) $('goalmapbtn').addEventListener('click', () => { unlockAudio(); if ($('goalnext')) $('goalnext').hidden = true; });
  if ($('pickicon')) $('pickicon').addEventListener('click', () => { unlockAudio(); openIconPicker(); });
  if ($('iconpick')) $('iconpick').addEventListener('click', e => {
    if (e.target === $('iconpick') || (e.target.closest && e.target.closest('[data-iconpick=close]'))) $('iconpick').hidden = true;
  });
  if ($('mapexit')) $('mapexit').addEventListener('click', () => { unlockAudio(); requestCloseSugar(); });
  if ($('racechip')) $('racechip').addEventListener('click', () => { unlockAudio(); setRaceOpen(true); });
  if ($('raceboard')) $('raceboard').addEventListener('click', e => {
    if (e.target.closest && e.target.closest('[data-race=close]')) setRaceOpen(false);
  });
  if ($('badgebtn')) $('badgebtn').addEventListener('click', () => { unlockAudio(); if ($('badgeov')) $('badgeov').hidden = false; });
  if ($('badgeov')) $('badgeov').addEventListener('click', e => {
    if (e.target === $('badgeov') || (e.target.closest && e.target.closest('[data-badge=close]'))) $('badgeov').hidden = true;
  });
  doc.addEventListener('pointerdown', function (e) { unlockAudio(); if (screen === 'game') noteActivity(); }, { passive: true });
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
  root.addEventListener('resize', () => { fitCanvas(); if (tut && tut.active && tut.step && tut.step.move) placeTutHand(tut.step.move[0], tut.step.move[1]); if (hintOn && hintMove) placeHintHand(hintMove[0], hintMove[1], hintHold); });

  paintButtons();
  showMap();
  root.requestAnimationFrame(frame);

  root.SugarRush.ui = {
    state: () => st, attempt, hud, paintGoalStrip, showEnd, showMap, scrollMapTo, openLevel, startLevel, showIntro, startTutorial, skipTutorial, finishTutorial, showTutStep, beginLevel, beginGoalFinish, showGoalBanner, celebrateOnMap, progress: () => prog, tutorial: () => tut, crush: () => crush,
    seedRace, syncRace, openIconPicker, setRaceOpen, requestCloseSugar, race: () => race,
    say, chime, callout, unlockAudio, audio, showSaying, hideSaying, showMovesWarn, hideMovesWarn, maybeWarn3, showHint, hideHintHand, noteActivity,
    clipsReady: () => Object.keys(VOICE_FILES).every(k => !!bufs[k]),
    setSound(on) { soundOn = !!on; ls.set('ib-sugar-sound', soundOn); paintButtons(); },
    setScore(n) { if (!st) return; st.score = n; st.moves = 0; st.over = true; st.won = goalsMet(st); st.stars = starsOf(st); hud(); },
    previewWin(opts) { opts = opts || {}; const n = opts.level || (st && st.lv && st.lv.n) || 2; if (!st || st.lv.n !== n) startLevel(n); st.score = opts.score || Math.max(st.lv.stars[2] || 0, 2400); st.moves = Math.max(st.moves, 1); st.won = true; st.over = true; st.stars = opts.stars || 3; if (opts.resetBadge) prog.badges[n - 1] = 0; winInfo = recordWin(st); hud(); showEnd(); },
    view: () => ({ score: st && st.score, moves: st && st.moves, busy, soundOn, musicOn, screen, level: st && st.lv && st.lv.n, acState: ac && ac.state, sparkles: sparkles.length, hold: sparkleHoldT != null, warned3, lastSaying, hintOn, hintMove: hintMove && hintMove.map(function (p) { return p.slice(); }), lastAct }),
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
      const picks = opts.glints || [1, 8, 14, 19, 24, 28, 35];
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
