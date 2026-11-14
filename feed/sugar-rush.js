/* Info Book 1.9.166 – Sugar Rush, levels 1–22. Our own match-3 sweet-shop game (own art drawn on canvas, own names).
   Swap two sweets next to each other to make a line of 3 or more. 4 in a line makes a striped sweet (clears a row or
   column), an L or T makes a wrapped sweet (clears the 3x3 around it), 5 in a line makes a sprinkle bomb (clears every
   sweet of the colour it is swapped with).
   Open to every family member since 1.9.228 (Shane-only before; the coming-soon screen is no longer used).
   Scores are not sent to the family scoreboard yet. 1.9.229: only major moments are spoken; minor sayings play candy sounds. Good moves were spoken in a bright, punchy callout voice (matched to Shane's "Great!" clip)
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
  // 1.9.219 South Island trays: a glacier valley (Franz Josef) and a factory floor (Dunedin).
  const GLACIER = ['XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '.XXXXXX.', '..XXXX..', '..XXXX..', '.XXXXXX.', 'XXXXXXXX'];
  const FACTORY = ['XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXX..XXX', 'XXX..XXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX'];
  // 1.9.220 Pacific Islands: a round island with its reef (Rarotonga) and two islands side by side (Samoa).
  const ATOLL = ['..XXXX..', '.XXXXXX.', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..'];
  const TWIN_ISLES = ['XXXX.XXX', 'XXXX.XXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXX.XXXX', 'XXX.XXXX'];
  // 1.9.222 Sydney: the board has a harbour-bridge arch cut out of it.
  const HARBOUR = ['XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXX..XXX', 'XX....XX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX'];

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
      badge: { id: 'night', name: 'Night Light', icon: '🌟' } },
    // 1.9.219 Levels 11–15 continue south. Goals are always objectives; score only sets stars.
    { n: 11, name: 'Whale Watch', target: 0, moves: 22, stars: [0, 2300, 4600], kinds: 6,
      bub: ['10000001', '01000010', '00100100', '00011000', '00011000', '00100100', '01000010', '10000001'],
      help: 'Sugar bubbles hold a sweet in place. Make a match next to a bubble, or hit it with a special sweet, to pop it, and the bubbles touching it pop too. Pop every bubble in 22 moves.',
      badge: { id: 'whale', name: 'Whale Tail', icon: '🐋' } },
    { n: 12, name: 'Garden City', target: 0, moves: 24, stars: [0, 4000, 8000], kinds: 6,
      jelly: ['00000000', '02200220', '02000020', '00011000', '00011000', '02000020', '02200220', '00000000'],
      locks: ['00000000', '00000000', '00000000', '00011000', '00011000', '00000000', '00000000', '00000000'],
      bub: ['00011000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00011000'],
      help: 'Double jelly in the garden beds, locked jars in the middle and a few sugar bubbles. Clear the jelly, free the jars and pop the bubbles in 24 moves.',
      badge: { id: 'tram', name: 'Tram Ticket', icon: '🚋' } },
    { n: 13, name: 'Glacier Run', hard: 1, target: 0, moves: 34, stars: [0, 3500, 7000], kinds: 6, mask: GLACIER,
      ings: [[0, 2], [0, 5]],
      ice: ['00000000', '00000000', '01000010', '00000000', '00200200', '00000000', '00000000', '00000000'],
      help: 'Bring both ingredients down the glacier. Some of the icing is packed twice as thick. Bring both down and clear all the icing in 34 moves.',
      badge: { id: 'glacier', name: 'Glacier Gem', icon: '💎' } },
    { n: 14, name: 'Liquorice Gondola', target: 0, moves: 28, stars: [0, 2600, 5200], kinds: 6,
      liq: ['11000011', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000'],
      help: 'Liquorice wraps a sweet so it cannot be swapped. Include it in a match, or hit it with a special, to free it. If two moves in a row free none, the liquorice creeps onto a sweet next to it. Free all the liquorice in 28 moves.',
      badge: { id: 'gondola', name: 'Gondola Pass', icon: '🚡' } },
    { n: 15, name: 'The Chocolate Factory', hard: 1, target: 0, moves: 26, stars: [0, 2200, 4400], kinds: 6, mask: FACTORY,
      choco: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '11000011'],
      jelly: ['00000000', '00111100', '01000010', '01000010', '01000010', '01000010', '00111100', '00000000'],
      bub: ['10000001', '10000001', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000'],
      liq: ['00011000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000'],
      help: 'The big finish: keep the chocolate in check, clear the jelly, pop the sugar bubbles and free the liquorice in 26 moves.',
      badge: { id: 'ticket', name: 'Golden Ticket', icon: '🎫' } },
    // 1.9.222 Bluff, at the bottom of the South Island.
    { n: 16, name: 'Bluff Oyster Bay', target: 0, moves: 18, stars: [0, 2200, 4400], kinds: 6,
      ice: ['00000000', '00000000', '00000000', '00000000', '01200210', '00100100', '21011012', '00000000'],
      locks: ['00000000', '00000000', '00011000', '00000000', '00000000', '00000000', '00000000', '00000000'],
      help: 'Crack all 16 layers of oyster-shell icing (some shells are thick) and free the 2 locked jars by the signpost in 18 moves.',
      badge: { id: 'oyster', name: 'Bluff Oyster', icon: '🦪' } },
    // 1.9.220 Pacific Islands (levels 17-19 since 1.9.222).
    { n: 17, name: 'Rarotonga Lagoon', target: 0, moves: 28, stars: [0, 3300, 6600], kinds: 6, mask: ATOLL,
      jelly: ['00111100', '01000010', '00000000', '00000000', '00000000', '00000000', '01000010', '00111100'],
      bub: ['00000000', '00000000', '00100100', '00011000', '00011000', '00100100', '00000000', '00000000'],
      help: 'Clear the jelly reef at the top and bottom of the island and pop the sugar bubbles in the lagoon in 28 moves.',
      badge: { id: 'hibiscus', name: 'Hibiscus Flower', icon: '🌺' } },
    { n: 18, name: 'Tongan Coconut Coast', target: 0, moves: 34, stars: [0, 4400, 8800], kinds: 6,
      ings: [[0, 2], [0, 5]], ingStyle: 'coconut', ingIcon: '🥥',
      liq: ['00000000', '00100100', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000'],
      help: 'Free the liquorice under the two coconut treats, then bring both down to the beach in 34 moves.',
      badge: { id: 'coconut', name: 'Coconut', icon: '🥥' } },
    { n: 19, name: 'Samoan Sunset', hard: 1, target: 0, moves: 34, stars: [0, 3100, 6200], kinds: 6, mask: TWIN_ISLES,
      jelly: ['00000000', '00000000', '00000000', '00000000', '00000000', '11000011', '11100111', '00000000'],
      locks: ['00000000', '00000000', '00000000', '00011000', '00011000', '00000000', '00000000', '00000000'],
      liq: ['00000000', '00000000', '01000010', '00000000', '00000000', '00000000', '00000000', '00000000'],
      help: 'Clear the jelly on both islands, free the locked jars and free the liquorice in 34 moves.',
      badge: { id: 'shell', name: 'Sunset Shell', icon: '🐚' } },
    // 1.9.222 Australia.
    { n: 20, name: 'Sydney Harbour Lights', target: 0, moves: 28, stars: [0, 1600, 3200], kinds: 6, mask: HARBOUR,
      jelly: ['00000000', '00000000', '00000000', '00000000', '00000000', '11111111', '00000000', '00000000'],
      bub: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '01000010', '10100101'],
      help: 'Clear the jelly along the harbour and pop the sugar bubbles under the bridge in 28 moves.',
      badge: { id: 'opera', name: 'Opera House Sail', icon: '🎭' } },
    { n: 21, name: 'Gold Coast Sweet Surf', target: 0, moves: 32, stars: [0, 3600, 7200], kinds: 6,
      ings: [[0, 2], [0, 5]],
      ice: ['00000000', '00000000', '00000000', '00000000', '00000000', '11000011', '00000000', '00000000'],
      liq: ['00000000', '00000000', '00000000', '00011000', '00000000', '00000000', '00000000', '00000000'],
      help: 'Bring both beach treats down past the high-rises, clear the sea-foam icing and free the liquorice in 32 moves.',
      badge: { id: 'wave', name: 'Golden Wave', icon: '🌊' } },
    { n: 22, name: 'Swan River Sunset', hard: 2, target: 0, moves: 26, stars: [0, 4000, 8000], kinds: 6,
      choco: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '10000001'],
      jelly: ['00000000', '00000000', '00000000', '22222222', '11111111', '00000000', '00000000', '00000000'],
      locks: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00011000', '00000000'],
      bub: ['00000000', '01000010', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000'],
      liq: ['10000001', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000'],
      help: 'The Swan River finale: clear the double jelly in the river, free the jars, pop the bubbles and free the liquorice, with chocolate on the loose, in 26 moves.',
      badge: { id: 'swan', name: 'Black Swan', icon: '🦢' } }
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
    { icon: '🌟', goal: 'Finish every objective', detail: 'Clear the jelly, bring both ingredients down, break the icing and free the locked jars — all in 32 moves.', tip: 'A little of everything. Take it one match at a time.', mechanic: 'mix' },
    { icon: '🫧', goal: 'Pop all the sugar bubbles', detail: 'Pop every sugar bubble in 22 moves.', tip: 'A bubble holds a sweet in place. Match next to it, or hit it with a special, to pop it — and the bubbles touching it pop too.', mechanic: 'bub' },
    { icon: '🚋', goal: 'Clear the jelly, free the jars and pop the bubbles', detail: 'Clear every double jelly, free the 4 locked jars and pop the 4 sugar bubbles in 24 moves.', tip: 'The garden beds have two layers of jelly. Work the corners while the middle jars wait.', mechanic: 'garden' },
    { icon: '🎁', goal: 'Bring both ingredients down and clear the icing', detail: 'Guide both ingredients down the glacier and clear all the icing in 34 moves.', tip: 'Thick icing needs two hits. Clear a path under each ingredient.', mechanic: 'glacier' },
    { icon: '➿', goal: 'Free all the liquorice', detail: 'Free every liquorice-wrapped sweet in 28 moves.', tip: 'Include a wrapped sweet in a match to free it. If two moves in a row free none, the liquorice creeps onto a sweet next to it.', mechanic: 'liq' },
    { icon: '🎫', goal: 'Finish every objective', detail: 'Clear the jelly, pop the sugar bubbles and free the liquorice, with chocolate on the loose — all in 26 moves.', tip: 'The big finish. Hit the chocolate when you can, and never leave the liquorice alone for long.', mechanic: 'factory' },
    { icon: '🦪', goal: 'Crack the oyster shells and free the jars', detail: 'Crack all 16 layers of oyster-shell icing (some shells are thick) and free the 2 locked jars in 18 moves.', tip: 'Thick shells need two hits. Specials crack lots at once.', mechanic: 'oyster' },
    { icon: '🌺', goal: 'Clear the reef jelly and pop the lagoon bubbles', detail: 'Clear the jelly reef at the top and bottom of the island and pop the 8 sugar bubbles in the lagoon in 28 moves.', tip: 'Bubbles touching each other pop together. Pop one in the middle of the lagoon and watch the rest follow.', mechanic: 'reef' },
    { icon: '🥥', goal: 'Bring both coconuts down to the beach', detail: 'Free the liquorice under the two coconuts, then bring both down to the bottom in 34 moves.', tip: 'The coconuts sit on liquorice. Free it first, then match underneath to drop them. Do not leave the liquorice alone for long.', mechanic: 'coconut' },
    { icon: '🐚', goal: 'Clear the jelly, free the jars and the liquorice', detail: 'Clear the jelly on both islands, free the 4 locked jars and free the liquorice in 34 moves.', tip: 'Two islands side by side. Free the liquorice early, then work the jelly on each beach.', mechanic: 'sunset' },
    { icon: '🎭', goal: 'Clear the harbour jelly and pop the bubbles', detail: 'Clear the jelly along the harbour and pop the 6 sugar bubbles under the bridge in 28 moves.', tip: 'The bridge arch splits the board. Work the bottom rows to reach the bubbles.', mechanic: 'harbour' },
    { icon: '🌊', goal: 'Bring both treats down, clear the foam and free the liquorice', detail: 'Bring both beach treats down, clear the 4 sea-foam icing blocks and free the liquorice in 32 moves.', tip: 'Free the liquorice in the middle before it creeps, and clear the foam under each treat.', mechanic: 'surf' },
    { icon: '🦢', goal: 'Finish every objective', detail: 'Clear the double jelly in the river, free 2 jars, pop 2 bubbles and free the liquorice, with chocolate on the loose — all in 26 moves.', tip: 'The Super Hard finale. Free the corner liquorice early and keep the chocolate in check.', mechanic: 'swan' }
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
    ],
    // 1.9.219 Sugar bubbles (level 11) and liquorice (level 14) each get a short hand tutorial.
    11: [
      {
        id: 'bub-show', kind: 'show',
        board: ['02402402','235f3523','240c4024','35115335','40241240','52354352','02402402','23553523'],
        hl: [[1, 3], [2, 3]],
        bubble: 'These are sugar bubbles. A bubble holds a sweet in place, so it cannot be swapped.'
      },
      {
        id: 'bub-pop', kind: 'move',
        board: ['02402402','235f3523','240c4024','35115335','40241240','52354352','02402402','23553523'],
        move: [[3, 4], [4, 4]],
        hl: [[1, 3], [2, 3], [3, 2], [3, 3], [3, 4], [4, 4]],
        bubble: 'Match next to a bubble to pop it. The bubbles touching it pop too!'
      },
      { id: 'ready11', kind: 'ready', bubble: "Pop every bubble to finish. A special sweet pops them too. You're ready!" }
    ],
    12: [
      {
        id: 'recap12', kind: 'recap',
        title: 'The Garden City',
        bubble: 'Three things to finish on this level. Take it one match at a time.',
        items: [
          { icon: '🍨', text: 'Clear the double jelly in the garden beds' },
          { icon: '🔒', text: 'Free the 4 locked jars in the middle' },
          { icon: '🫧', text: 'Pop the 4 sugar bubbles' }
        ]
      }
    ],
    13: [
      {
        id: 'recap13', kind: 'recap',
        title: 'Down the glacier',
        bubble: 'Bring both ingredients to the bottom and clear the icing.',
        items: [
          { icon: '🎁', text: 'Match under an ingredient to drop it down' },
          { icon: '🧁', text: 'Thick icing needs two hits' }
        ]
      }
    ],
    14: [
      {
        id: 'liq-show', kind: 'show',
        board: ['03405403','13513513','34004034','35225135','40142440','51351351','03405403','13513513'],
        liq: ['00000000','00000000','00000000','00110000','00000000','00000000','00000000','00000000'],
        hl: [[3, 2], [3, 3]],
        bubble: 'This is liquorice. It wraps a sweet, so the sweet cannot be swapped.'
      },
      {
        id: 'liq-free', kind: 'move',
        board: ['03405403','13513513','34004034','35225135','40142440','51351351','03405403','13513513'],
        liq: ['00000000','00000000','00000000','00110000','00000000','00000000','00000000','00000000'],
        move: [[3, 4], [4, 4]],
        hl: [[3, 2], [3, 3], [3, 4], [4, 4]],
        bubble: 'Include it in a match to free it.'
      },
      {
        id: 'liq-creep', kind: 'show',
        board: ['03405403','13513513','34004034','35225135','40142440','51351351','03405403','13513513'],
        liq: ['00000000','00000000','00000000','00100000','00000000','00000000','00000000','00000000'],
        hl: [[3, 2], [3, 3], [2, 2], [4, 2], [3, 1]],
        bubble: 'Careful: if two moves in a row free none, the liquorice creeps onto a sweet next to it.'
      },
      { id: 'ready14', kind: 'ready', bubble: "Free all the liquorice to finish. You're ready!" }
    ],
    15: [
      {
        id: 'recap15', kind: 'recap',
        title: 'The Chocolate Factory',
        bubble: 'The big finish. You have seen all of these before.',
        items: [
          { icon: '🍫', text: 'Keep the chocolate in check' },
          { icon: '💜', text: 'Clear the jelly' },
          { icon: '🫧', text: 'Pop the sugar bubbles' },
          { icon: '➿', text: 'Free the liquorice before it creeps' }
        ]
      }
    ],
    // 1.9.222 Bluff recap.
    16: [
      {
        id: 'recap16b', kind: 'recap',
        title: 'Bluff, the bottom of New Zealand',
        bubble: 'Oysters are famous here. Crack them open!',
        items: [
          { icon: '🦪', text: 'Crack the oyster shells (thick ones need two hits)' },
          { icon: '🔒', text: 'Free the 2 locked jars' }
        ]
      }
    ],
    // 1.9.220 Pacific Islands recaps (levels 17-19 since 1.9.222).
    17: [
      {
        id: 'recap16', kind: 'recap',
        title: 'Kia orana, Rarotonga!',
        bubble: 'Welcome to the Pacific Islands. Two things to finish here.',
        items: [
          { icon: '💜', text: 'Clear the jelly reef at the top and bottom' },
          { icon: '🫧', text: 'Pop the sugar bubbles in the lagoon' }
        ]
      }
    ],
    18: [
      {
        id: 'recap17', kind: 'recap',
        title: "Mālō e lelei, Tonga!",
        bubble: 'Bring the coconuts down to the beach.',
        items: [
          { icon: '➿', text: 'Free the liquorice under each coconut' },
          { icon: '🥥', text: 'Match under a coconut to drop it down' }
        ]
      }
    ],
    19: [
      {
        id: 'recap18', kind: 'recap',
        title: 'Talofa, Samoa!',
        bubble: 'Two islands, one sunset. Three things to finish.',
        items: [
          { icon: '💜', text: 'Clear the jelly on both islands' },
          { icon: '🔒', text: 'Free the 4 locked jars' },
          { icon: '➿', text: 'Free the liquorice' }
        ]
      }
    ],
    // 1.9.222 Australia recaps.
    20: [
      {
        id: 'recap20', kind: 'recap',
        title: "G'day, Sydney!",
        bubble: 'Welcome to Australia. Two things to finish under the bridge.',
        items: [
          { icon: '💜', text: 'Clear the jelly along the harbour' },
          { icon: '🫧', text: 'Pop the sugar bubbles' }
        ]
      }
    ],
    21: [
      {
        id: 'recap21', kind: 'recap',
        title: 'Gold Coast',
        bubble: 'Sun, sea foam and high-rises.',
        items: [
          { icon: '🎁', text: 'Bring both beach treats down' },
          { icon: '🧁', text: 'Clear the sea-foam icing' },
          { icon: '➿', text: 'Free the liquorice' }
        ]
      }
    ],
    22: [
      {
        id: 'recap22', kind: 'recap',
        title: 'Perth: Super Hard!',
        bubble: 'The Swan River finale. Everything at once.',
        items: [
          { icon: '🍫', text: 'Keep the chocolate in check' },
          { icon: '💜', text: 'Clear the double jelly in the river' },
          { icon: '🔒', text: 'Free the jars' },
          { icon: '🫧', text: 'Pop the bubbles' },
          { icon: '➿', text: 'Free the corner liquorice' }
        ]
      }
    ]
  };
  function tutorialFor(n) { return TUTORIALS[n] || null; }


  // 1.9.210 Sugar Rush main screen: an illustrated candy map of New Zealand (1.9.227: true geography).
  // Stops start in Onerahi / Whangārei and travel south. Level 2 is Sarah's house.
  // 1.9.227 Real geography. NZ is drawn from real coastline points (Natural Earth 1:50m) through one projection:
  // a local equirectangular (cos 41°), turned 25° so the long islands stand up the phone, then scaled 61 px/° across
  // and 78 px/° down (squeezed sideways a little, like Australia, to fit 400 px). Every stop sits at its real
  // latitude/longitude through that projection. Onerahi and Whangārei are a few km apart, so they sit
  // in a zoomed-in Whangārei inset (30x, same orientation) that keeps their real relative positions. Sarah's House is
  // in Onerahi, east of central Whangārei (1.9.228); its pin is nudged (nudged: true) just east of the Onerahi pin so
  // both labels stay readable.
  const NZ_PROJ = { cos: 0.754709580222772, rot: -0.4363323129985824, sx: 61.0, sy: 78.0, ox: 218.7531847020796, oy: 507.8180402772627 };
  function nzXY(lat, lon) {
    const x = (lon - 173.5) * NZ_PROJ.cos, y = -(lat + 40.5), c = Math.cos(NZ_PROJ.rot), s = Math.sin(NZ_PROJ.rot);
    return { x: NZ_PROJ.ox + NZ_PROJ.sx * (x * c - y * s), y: NZ_PROJ.oy + NZ_PROJ.sy * (x * s + y * c) };
  }
  const WHANGAREI_INSET = { k: 30, x: 54, y: 372, lat: -35.725, lon: 174.323 };
  function insetXY(lat, lon) {
    const a = nzXY(lat, lon), b = nzXY(WHANGAREI_INSET.lat, WHANGAREI_INSET.lon);
    return { x: WHANGAREI_INSET.x + WHANGAREI_INSET.k * (a.x - b.x), y: WHANGAREI_INSET.y + WHANGAREI_INSET.k * (a.y - b.y) };
  }
  // Pacific Islands panel and Australia: plain longitude/latitude scales (east longitudes wrap past 180°).
  function pacXY(lat, lon) { return { x: 70 + 16.86 * (((lon % 360) + 360) % 360 - 184.8), y: 1350 + 21.6 * (-lat - 13.83) }; }
  function ausXY(lat, lon) { return { x: 8.533 * lon - 937.8, y: 1808 + 10.97 * (-lat - 10.707) }; }
  const MAP_W = 400, MAP_H = 2240;
  const MAP_STOPS = [
    { n: 1, x: 148, y: 432, place: "Onerahi", kind: 'town', label: 'left', lat: -35.77, lon: 174.37, inset: 'whangarei' },
    { n: 2, x: 204, y: 432, place: "Sarah's House", kind: 'house', label: 'below', lat: -35.762, lon: 174.385, inset: 'whangarei', nudged: true },
    { n: 3, x: 54, y: 372, place: "Whangārei", kind: 'town', label: 'right', lat: -35.725, lon: 174.323, inset: 'whangarei' },
    { n: 4, x: 177, y: 218, place: "Auckland Post Office", kind: 'post', label: 'right', lat: -36.848, lon: 174.763, via: [{ x: 114, y: 302 }] },
    { n: 5, x: 223, y: 272, place: "Hamilton", kind: 'town', label: 'left', lat: -37.787, lon: 175.279 },
    { n: 6, x: 273, y: 272, place: "Rotorua", kind: 'town', label: 'right', lat: -38.137, lon: 176.251 },
    { n: 7, x: 279, y: 316, place: "Taupō Station", kind: 'station', label: 'left', lat: -38.686, lon: 176.07 },
    { n: 8, x: 335, y: 352, place: "Napier", kind: 'town', label: 'below', lat: -39.49, lon: 176.912 },
    { n: 9, x: 292, y: 532, place: "Wellington", kind: 'town', label: 'below', lat: -41.287, lon: 174.776 },
    { n: 10, x: 230, y: 568, place: "Nelson", kind: 'town', label: 'left', lat: -41.271, lon: 173.284 },
    { n: 11, x: 275, y: 638, place: "Kaikōura", kind: 'town', label: 'right', lat: -42.4, lon: 173.681 },
    { n: 12, x: 261, y: 744, place: "Christchurch", kind: 'town', label: 'right', lat: -43.532, lon: 172.636 },
    { n: 13, x: 155, y: 795, place: "Franz Josef", kind: 'town', label: 'left', lat: -43.389, lon: 170.183 },
    { n: 14, x: 134, y: 948, place: "Queenstown", kind: 'town', label: 'left', lat: -45.031, lon: 168.663 },
    { n: 15, x: 232, y: 962, place: "Dunedin", kind: 'town', label: 'right', lat: -45.874, lon: 170.504 },
    { n: 16, x: 160, y: 1068, place: "Bluff", kind: 'town', label: 'right', lat: -46.6, lon: 168.333 },
    { n: 17, x: 330, y: 1509, place: "Rarotonga", kind: 'island', label: 'below', lat: -21.21, lon: -159.78 },
    { n: 18, x: 70, y: 1508, place: "Tonga", kind: 'island', label: 'right', lat: -21.14, lon: -175.2 },
    { n: 19, x: 128, y: 1350, place: "Samoa", kind: 'island', label: 'right', lat: -13.83, lon: -171.76 },
    { n: 20, x: 352, y: 2062, place: "Sydney", kind: 'city', label: 'left', lat: -33.87, lon: 151.21, via: [{ x: 270, y: 1900 }, { x: 310, y: 2040 }] },
    { n: 21, x: 371, y: 1998, place: "Gold Coast", kind: 'city', label: 'left', lat: -28.0, lon: 153.43 },
    { n: 22, x: 51, y: 2041, place: "Perth", kind: 'city', label: 'right', lat: -31.95, lon: 115.86, via: [{ x: 310, y: 1965 }] }
  ];
  // Coming soon: other Australian cities. Shown as markers only (no trail), so they never look like the route.
  // Brisbane and Canberra are nudged a few pixels clear of the Gold Coast and Sydney pins (marked nudged).
  const FUTURE_STOPS = [
    { place: 'Melbourne', x: 299, y: 2105, label: 'left', lat: -37.81, lon: 144.96 },
    { place: 'Brisbane', x: 366, y: 1956, label: 'left', lat: -27.47, lon: 153.03, nudged: true },
    { place: 'Adelaide', x: 245, y: 2074, label: 'left', lat: -34.93, lon: 138.6 },
    { place: 'Canberra', x: 327, y: 2089, label: 'left', lat: -35.28, lon: 149.13, nudged: true },
    { place: 'Hobart', x: 319, y: 2161, label: 'left', lat: -42.88, lon: 147.33 },
    { place: 'Darwin', x: 179, y: 1827, label: 'left', lat: -12.46, lon: 130.84 },
    { place: 'Cairns', x: 306, y: 1876, label: 'left', lat: -16.92, lon: 145.77 }
  ];
  const LV_COUNT = 22;
  function stopForLevel(n) { return MAP_STOPS[(n | 0) - 1] || null; }
  function icingPath(pts) {
    if (!pts || pts.length < 2) return '';
    // 1.9.222 A stop can name waypoints (via) the trail passes through on its way in, so it can avoid labels.
    pts = pts.reduce(function (a, q, i) { if (i && q.via) q.via.forEach(function (v) { a.push(v); }); a.push(q); return a; }, []);
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
  // 1.9.222 Australia outline (from real coastline points; x = lon, y = lat, scaled into the map).
  const AUS_PATH = 'M 28 1932 L 32 1960 L 33 1976 L 38 2004 L 41 2020 L 47 2040 L 47 2058 L 41 2067 L 54 2075 L 67 2075 L 84 2063 L 114 2063 L 136 2045 L 162 2038 L 179 2036 L 196 2043 L 206 2052 L 218 2073 L 226 2062 L 236 2053 L 237 2071 L 243 2073 L 242 2082 L 252 2097 L 261 2108 L 273 2112 L 286 2117 L 296 2109 L 304 2114 L 311 2120 L 321 2108 L 341 2102 L 344 2082 L 353 2062 L 364 2044 L 370 2026 L 373 2005 L 370 1989 L 368 1970 L 355 1954 L 349 1938 L 335 1921 L 325 1910 L 310 1897 L 307 1877 L 303 1860 L 302 1850 L 291 1846 L 285 1828 L 278 1808 L 273 1822 L 270 1840 L 269 1860 L 263 1882 L 252 1881 L 239 1873 L 226 1864 L 218 1855 L 221 1840 L 229 1824 L 220 1822 L 205 1821 L 193 1815 L 181 1823 L 172 1833 L 167 1854 L 155 1858 L 144 1846 L 132 1850 L 120 1868 L 115 1880 L 103 1887 L 95 1903 L 76 1910 L 58 1917 L 46 1921 L 34 1931 Z';
  const TAS_PATH = 'M 296 2138 L 312 2142 L 328 2140 L 328 2154 L 323 2165 L 315 2170 L 307 2167 L 301 2154 L 297 2143 Z';
  function planeAt(x, y, deg) {
    return '<g class="sr-plane" transform="translate(' + x + ' ' + y + ') rotate(' + deg + ')"><path d="M0 -14 L3 -4 L14 2 L14 5 L3 2 L2 10 L6 13 L6 15 L0 13 L-6 15 L-6 13 L-2 10 L-3 2 L-14 5 L-14 2 L-3 -4 Z" fill="#fff" stroke="#3d8bfd" stroke-width="1.5"/></g>';
  }
  function nzMapSvg() {
    const live = icingPath(MAP_STOPS);
    const future = ''; // 1.9.222 coming-soon cities are markers only
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
      '<circle class="sr-bob" cx="250" cy="60" r="7" fill="#ff8ab8" opacity=".55"/>' +
      '<circle class="sr-bob" cx="264" cy="74" r="5" fill="#ffe066" opacity=".65"/>' +
      '<circle class="sr-bob" cx="372" cy="200" r="6" fill="#7ee0a8" opacity=".5"/>' +
      '<circle class="sr-bob" cx="40" cy="640" r="8" fill="#ffb347" opacity=".45"/>' +
      '<circle class="sr-bob" cx="370" cy="900" r="7" fill="#ff8ab8" opacity=".45"/>' +
      '<circle class="sr-bob" cx="330" cy="1110" r="6" fill="#fff" opacity=".55"/>' +
      // True north: the map is turned so New Zealand stands up the phone, so north points 20° to the left.
      '<g transform="rotate(-20 360 82)"><text x="360" y="58" text-anchor="middle" font-size="13" font-weight="800" fill="#2a6a88" font-family="ui-rounded,system-ui,sans-serif">N</text>' +
      '<path d="M360 64 L360 100 M360 64 L353 74 M360 64 L367 74" fill="none" stroke="#2a6a88" stroke-width="2.4" stroke-linecap="round"/></g>' +
      // North and South Islands and Stewart Island, from real coastline points (see NZ_PROJ).
      '<path filter="url(#sr-soft)" fill="url(#sr-land)" stroke="#fff" stroke-width="7" stroke-linejoin="round" d="M 223 572 L 228 570 L 241 536 L 248 527 L 250 525 L 248 534 L 251 538 L 251 555 L 254 550 L 253 539 L 255 535 L 252 530 L 261 524 L 262 527 L 266 525 L 265 537 L 260 547 L 265 545 L 271 529 L 273 535 L 270 547 L 266 554 L 266 559 L 274 566 L 273 576 L 276 573 L 283 576 L 283 586 L 277 613 L 279 625 L 273 649 L 271 690 L 261 708 L 257 722 L 254 726 L 260 729 L 255 742 L 261 736 L 264 736 L 270 746 L 283 743 L 288 750 L 288 757 L 282 762 L 277 763 L 273 761 L 263 769 L 265 762 L 259 761 L 257 774 L 255 776 L 240 771 L 251 781 L 235 809 L 227 816 L 226 826 L 222 830 L 226 831 L 234 878 L 228 882 L 236 883 L 236 888 L 234 905 L 236 944 L 242 949 L 244 955 L 230 969 L 228 975 L 226 990 L 220 1009 L 216 1030 L 203 1044 L 193 1051 L 178 1054 L 171 1062 L 166 1063 L 163 1067 L 159 1064 L 156 1057 L 151 1055 L 143 1056 L 134 1063 L 123 1055 L 116 1055 L 111 1066 L 88 1078 L 83 1079 L 81 1075 L 85 1057 L 79 1069 L 76 1070 L 77 1062 L 75 1058 L 72 1065 L 67 1068 L 64 1057 L 77 1046 L 82 1038 L 74 1042 L 72 1038 L 77 1026 L 66 1033 L 65 1022 L 71 1018 L 66 1013 L 81 1013 L 77 1007 L 81 1002 L 71 1003 L 68 996 L 70 988 L 74 990 L 76 987 L 71 983 L 76 965 L 82 973 L 78 962 L 83 945 L 86 939 L 93 941 L 86 931 L 97 889 L 106 874 L 113 871 L 120 856 L 126 857 L 122 851 L 123 847 L 133 828 L 144 814 L 142 808 L 145 806 L 142 805 L 147 796 L 151 777 L 153 774 L 158 775 L 156 772 L 153 772 L 157 763 L 165 763 L 159 759 L 164 752 L 169 755 L 166 748 L 170 728 L 173 730 L 176 738 L 172 725 L 174 707 L 178 701 L 174 698 L 168 649 L 176 638 L 181 620 L 178 592 L 174 573 L 174 557 L 179 542 L 186 527 L 196 523 L 188 530 L 190 540 L 195 545 L 206 545 Z"/>' +
      '<path filter="url(#sr-soft)" fill="url(#sr-land)" stroke="#fff" stroke-width="7" stroke-linejoin="round" d="M 66 120 L 68 123 L 71 109 L 73 116 L 74 116 L 85 115 L 91 117 L 92 112 L 106 114 L 112 124 L 114 123 L 118 116 L 136 134 L 136 141 L 142 148 L 134 152 L 135 153 L 165 179 L 168 193 L 174 200 L 175 219 L 179 218 L 184 219 L 185 214 L 191 216 L 203 215 L 212 228 L 219 224 L 219 220 L 203 189 L 196 182 L 195 178 L 197 174 L 213 188 L 216 185 L 227 198 L 244 229 L 252 233 L 253 236 L 250 237 L 250 240 L 254 241 L 262 239 L 288 242 L 312 237 L 318 230 L 321 223 L 323 205 L 331 187 L 342 182 L 356 184 L 358 206 L 367 251 L 364 266 L 360 271 L 365 294 L 370 301 L 370 309 L 362 303 L 350 307 L 342 316 L 335 328 L 334 342 L 338 356 L 340 358 L 348 360 L 349 400 L 344 448 L 342 489 L 334 518 L 323 541 L 318 541 L 312 531 L 307 532 L 300 539 L 296 526 L 294 525 L 293 526 L 295 530 L 292 535 L 287 537 L 291 475 L 286 449 L 268 432 L 257 430 L 246 433 L 232 426 L 211 427 L 202 421 L 198 414 L 198 403 L 205 390 L 217 377 L 220 359 L 211 317 L 211 299 L 206 291 L 209 282 L 191 262 L 190 253 L 187 253 L 176 240 L 177 238 L 179 238 L 186 245 L 186 236 L 190 231 L 181 224 L 174 232 L 168 232 L 158 219 L 144 207 L 146 205 L 156 210 L 156 206 L 154 198 L 148 195 L 146 184 L 139 182 L 141 189 L 128 185 L 118 173 L 121 181 L 139 196 L 138 202 L 87 160 L 90 138 L 86 145 L 85 157 L 76 149 L 74 149 L 66 143 L 67 136 L 64 128 L 30 100 L 43 90 L 43 100 Z"/>' +
      '<path filter="url(#sr-soft)" fill="url(#sr-land)" stroke="#fff" stroke-width="4" stroke-linejoin="round" d="M 159 1091 L 160 1094 L 156 1095 L 157 1098 L 163 1099 L 166 1097 L 169 1103 L 160 1112 L 158 1119 L 152 1122 L 150 1129 L 144 1134 L 143 1130 L 145 1123 L 144 1116 L 146 1112 L 146 1102 L 140 1088 L 147 1084 Z"/>' +
      '<path filter="url(#sr-soft)" fill="url(#sr-land)" stroke="#fff" stroke-width="4" stroke-linejoin="round" d="M 195 159 L 197 162 L 193 163 L 185 159 L 183 154 L 184 147 L 191 152 Z"/>' +
      '<path filter="url(#sr-soft)" fill="url(#sr-land)" stroke="#fff" stroke-width="4" stroke-linejoin="round" d="M 70 1040 L 71 1046 L 63 1049 L 62 1044 L 66 1039 Z"/>' +
      '<path filter="url(#sr-soft)" fill="url(#sr-land)" stroke="#fff" stroke-width="4" stroke-linejoin="round" d="M 245 523 L 241 531 L 239 521 L 241 516 L 244 511 Z"/>' +
      '<ellipse cx="275" cy="328" rx="9" ry="11" fill="#7ec8ef" stroke="#fff" stroke-width="2"/>' +
      // Soft icing alps along the Southern Alps
      '<path d="M 184 746 C 194 704 206 704 216 746 C 206 738 194 738 184 746 Z" fill="#fff" opacity=".9"/>' +
      '<path d="M 142 828 C 152 786 164 786 174 828 C 164 820 152 820 142 828 Z" fill="#fff" opacity=".9"/>' +
      '<path d="M 112 932 C 122 890 134 890 144 932 C 134 924 122 924 112 932 Z" fill="#fff" opacity=".9"/>' +
      // Ferry across Cook Strait (Wellington to Picton)
      '<path d="M 286 536 C 278 552 274 547 264 551" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="5 7" stroke-linecap="round" opacity=".85"/>' +
      // 1.9.227 Whangārei close-up (30x): Whangārei and Onerahi at their real relative places, Sarah\'s House beside Onerahi,
      // linked by a dashed leader line to the ring where Whangārei really sits on the coast.
      '<g class="sr-inset">' +
      '<path d="M 130 150 L 54 334" stroke="#fff" stroke-width="2.5" stroke-dasharray="4 5" stroke-linecap="round"/>' +
      '<circle cx="130" cy="150" r="6" fill="none" stroke="#ff4f93" stroke-width="2.5"/>' +
      '<rect x="4" y="334" width="256" height="188" rx="22" fill="#d8f4ff" stroke="#fff" stroke-width="4"/>' +
      // Whangārei Harbour opens to the south-east, below Onerahi
      '<path d="M 24 336 L 240 336 L 258 406 C 128 418 88 442 130 472 C 64 488 24 462 6 472 Z" fill="url(#sr-land)" opacity=".9"/>' +
      '<text x="18" y="512" text-anchor="start" font-size="11" font-weight="900" fill="#2a6a88" font-family="ui-rounded,system-ui,sans-serif">Whangārei close-up</text>' +
      '</g>' +
      // 1.9.220 Pacific Islands inset: a lagoon-blue panel with Rarotonga, Tonga and Samoa.
      '<g class="sr-pacific">' +
      '<rect x="16" y="1236" width="368" height="448" rx="30" fill="#7fe6dc" opacity=".55" stroke="#fff" stroke-width="4" stroke-dasharray="10 8"/>' +
      '<rect x="120" y="1222" width="160" height="30" rx="15" fill="#fff" stroke="#3fc1b0" stroke-width="3"/>' +
      '<text x="200" y="1243" text-anchor="middle" font-size="15" font-weight="900" fill="#1b8a7c" font-family="ui-rounded,system-ui,sans-serif">Pacific Islands</text>' +
      // 1.9.227 Islands at their real relative positions (see pacXY): Samoa north, Tonga and Rarotonga side by side.
      // Samoa: Savai\'i and Upolu
      '<ellipse cx="122" cy="1348" rx="30" ry="20" fill="#bff5ec" opacity=".8"/><ellipse cx="110" cy="1345" rx="13" ry="8" fill="url(#sr-land)" stroke="#fff" stroke-width="3"/>' +
      '<ellipse cx="138" cy="1356" rx="12" ry="6" fill="url(#sr-land)" stroke="#fff" stroke-width="3"/>' +
      // Tonga: Tongatapu, with Ha\'apai and Vava\'u to the north
      '<ellipse cx="70" cy="1508" rx="34" ry="20" fill="#bff5ec" opacity=".8"/><path d="M48 1510 c6 -10 30 -12 44 -4 c4 8 -10 14 -24 13 c-10 1 -18 -3 -20 -9 Z" fill="url(#sr-land)" stroke="#fff" stroke-width="3"/>' +
      '<circle cx="90" cy="1454" r="5" fill="url(#sr-land)" stroke="#fff" stroke-width="2"/><circle cx="84" cy="1479" r="4" fill="url(#sr-land)" stroke="#fff" stroke-width="2"/>' +
      // Rarotonga: a round island with its reef ring
      '<circle cx="330" cy="1509" r="30" fill="#bff5ec" opacity=".85"/><circle cx="330" cy="1509" r="26" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 4"/><circle cx="330" cy="1509" r="16" fill="url(#sr-land)" stroke="#fff" stroke-width="4"/>' +
      '<path d="M323 1507 l9 -9 5 11 Z" fill="#7ac77a"/>' +
      [[102, 1339], [150, 1354], [94, 1522], [350, 1503]].map(function (q) { return '<path d="M' + q[0] + ' ' + q[1] + ' v-12 M' + q[0] + ' ' + (q[1] - 12) + ' q-6 -2 -9 3 M' + q[0] + ' ' + (q[1] - 12) + ' q6 -2 9 3 M' + q[0] + ' ' + (q[1] - 12) + ' q-2 -6 -7 -6 M' + q[0] + ' ' + (q[1] - 12) + ' q2 -6 7 -6" stroke="#2f9a5a" stroke-width="2.4" fill="none" stroke-linecap="round"/>'; }).join('') +
      '<path d="M40 1600 q12 -5 24 0 M300 1620 q12 -5 24 0 M90 1660 q12 -5 24 0 M250 1440 q12 -5 24 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7"/>' +
      '</g>' +
      // A little plane on the flight out of Dunedin
      // 1.9.222 Australia: same full-screen style as New Zealand, with Tasmania and a heading pill.
      '<g class="sr-aus">' +
      '<rect x="130" y="1752" width="140" height="30" rx="15" fill="#fff" stroke="#ff9f43" stroke-width="3"/>' +
      '<text x="200" y="1773" text-anchor="middle" font-size="15" font-weight="900" fill="#c0601a" font-family="ui-rounded,system-ui,sans-serif">Australia</text>' +
      '<path filter="url(#sr-soft)" fill="url(#sr-land)" stroke="#fff" stroke-width="8" stroke-linejoin="round" d="' + AUS_PATH + '"/>' +
      '<path filter="url(#sr-soft)" fill="url(#sr-land)" stroke="#fff" stroke-width="6" stroke-linejoin="round" d="' + TAS_PATH + '"/>' +
      '<path d="M120 1960 C150 1940 190 1950 210 1980 C190 1990 150 1990 120 1960 Z" fill="#ffd9a8" opacity=".6"/>' +
      '<path d="M236 1930 C250 1918 270 1922 276 1936 C264 1944 246 1942 236 1930 Z" fill="#ffd9a8" opacity=".55"/>' +
      '<circle class="sr-bob" cx="380" cy="1860" r="6" fill="#ffb347" opacity=".5"/><circle class="sr-bob" cx="30" cy="2160" r="7" fill="#ff8ab8" opacity=".45"/>' +
      '</g>' +
      planeAt(250, 1700, 172) + planeAt(180, 2003, -106) +
      '<g class="sr-plane" transform="translate(219 1195) rotate(166)"><path d="M0 -14 L3 -4 L14 2 L14 5 L3 2 L2 10 L6 13 L6 15 L0 13 L-6 15 L-6 13 L-2 10 L-3 2 L-14 5 L-14 2 L-3 -4 Z" fill="#fff" stroke="#3d8bfd" stroke-width="1.5"/></g>' +
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
  // 1.9.219 Sugar bubbles (t.bub) hold a sweet in place like a block until a match next to them, or a special, pops them.
  // Liquorice (t.liq) wraps a sweet like a lock, and creeps to a neighbour when a move frees none.
  const isBlock = t => !!(t && (t.ice > 0 || t.choco > 0 || t.bub > 0));
  const isIng = t => !!(t && t.ing);
  const isBomb = t => !!(t && t.s === 'b' && t.c < 0 && !t.ing && !t.ice && !t.choco);
  const isCandy = t => !!(t && t.c >= 0 && !t.ice && !t.choco && !t.ing && !t.bub);
  const canSwap = t => !!(t && !isHole(t) && (isCandy(t) || isBomb(t)) && !t.lock && !t.liq);
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

  // Tests: '0'-'5' plain sweets, '*' a sprinkle bomb, '.' empty, '#' a hole, 'I' icing, 'C' chocolate, 'G' an ingredient,
  // 'a'-'f' a sweet of colour 0-5 inside a sugar bubble.
  function fromRows(rows) {
    return rows.map(row => row.split('').map(ch => {
      if (ch === '.') return null;
      if (ch === '#') return HOLE;
      if (ch === '*') return mk(-1, 'b');
      if (ch === 'I') return Object.assign(mk(-4), { ice: 1 });
      if (ch === 'C') return Object.assign(mk(-5), { choco: 1 });
      if (ch === 'G') return Object.assign(mk(-3), { ing: 1 });
      if (ch >= 'a' && ch <= 'f') return Object.assign(mk(ch.charCodeAt(0) - 97), { bub: 1 });
      return mk(+ch);
    }));
  }
  const toRows = b => b.map(row => row.map(t => {
    if (!t) return '.';
    if (isHole(t)) return '#';
    if (t.ice > 0) return 'I';
    if (t.choco) return 'C';
    if (t.ing) return 'G';
    if (t.bub > 0) return String.fromCharCode(97 + t.c);
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
      for (let k = 0; k < N * N; k++) { const [r, c] = rc(k), t = b[r][c]; if (t === bomb || (t && t.c === other.c)) { if (t !== bomb && isBlock(t)) hit.add(k); else clear.add(k); } }
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
    step.liqFreed = 0;
    step.bubPopped = 0;
    step.clear.forEach(k => {
      const [r, c] = rc(k), t = b[r][c];
      if (t && !isHole(t) && !isBlock(t)) {
        step.popped.push({ id: t.id, r, c, color: t.c, s: t.s, lock: t.lock, liq: t.liq });
        if (t.lock) step.brokeLock = true;
        if (t.liq) step.liqFreed++;
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
      } else if (t.bub > 0) {
        // Pop the bubble (the sweet inside stays), and the bubbles right next to it pop too.
        const popBub = (i, j, chain) => { const o = b[i][j]; o.bub = 0; step.bubPopped++; step.blocked.push({ r: i, c: j, kind: 'bub', left: 0, chain: !!chain }); };
        popBub(r, c, false);
        [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([i, j]) => { if (isOpen(mask, i, j) && b[i][j] && b[i][j].bub > 0) popBub(i, j, true); });
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
      if (isCandy(t) && !t.lock && !t.liq) { cells.push([r, c]); tiles.push(t); }
    }
    for (let tries = 0; tries < 300; tries++) {
      for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const x = tiles[i]; tiles[i] = tiles[j]; tiles[j] = x; }
      cells.forEach((p, i) => { b[p[0]][p[1]] = tiles[i]; });
      if (!findRuns(b).length && hasMove(b, mask)) return true;
    }
    const fresh = newBoard(rand, kinds, mask);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (isHole(b[r][c]) || isBlock(b[r][c]) || isIng(b[r][c]) || (b[r][c] && (b[r][c].lock || b[r][c].liq))) continue;
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
    grid(lv.liq, (r, c) => { if (isCandy(board[r][c]) && !board[r][c].lock) board[r][c].liq = 1; });
    grid(lv.bub, (r, c) => { if (isCandy(board[r][c]) && !board[r][c].lock && !board[r][c].liq) board[r][c].bub = 1; });
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
  function bubLeft(b) { if (!b) return 0; let n = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c] && b[r][c].bub > 0) n++; return n; }
  function liqLeft(b) { if (!b) return 0; let n = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c] && b[r][c].liq) n++; return n; }
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
    if (lv.bub && bubLeft(st.board) > 0) return false;
    if (lv.liq && liqLeft(st.board) > 0) return false;
    return true;
  }
  // Liquorice creeps: one plain sweet next to it gets wrapped, after LIQ_IDLE moves in a row that freed none.
  const LIQ_IDLE = 2;
  function spreadLiq(st) {
    const b = st.board, mask = st.mask, neigh = [], seen = new Set();
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (!(b[r][c] && b[r][c].liq)) continue;
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([i, j]) => {
        if (!isOpen(mask, i, j) || seen.has(key(i, j))) return;
        const t = b[i][j];
        if (!isCandy(t) || t.s || t.lock || t.liq) return;
        seen.add(key(i, j)); neigh.push([i, j]);
      });
    }
    if (!neigh.length) return null;
    const [i, j] = neigh[Math.floor(st.rand() * neigh.length)];
    b[i][j].liq = 1;
    return { r: i, c: j };
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
    return !lv.jelly && !lv.ice && !lv.collect && !(lv.ings && lv.ings.length) && !lv.locks && !lv.bub && !lv.liq;
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
      const ii = lv.ingIcon || '🎁';
      out.push({ kind: 'ings', icon: ii, left: left, have: have, n: n, lab: have + '/' + n, text: ii + ' ' + have + '/' + n });
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
    if (lv.bub) {
      const left = stt && stt.board ? bubLeft(stt.board) : 0;
      out.push({ kind: 'bub', icon: '🫧', left: left, have: 0, n: left, lab: 'Bubbles ' + left + ' left', text: '🫧 Bubbles ' + left + ' left' });
    }
    if (lv.liq) {
      const left = stt && stt.board ? liqLeft(stt.board) : 0;
      out.push({ kind: 'liq', icon: '➿', left: left, have: 0, n: left, lab: 'Liquorice ' + left + ' left', text: '➿ Liquorice ' + left + ' left' });
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
    // Liquorice creeps after two moves in a row that free none of it (LIQ_IDLE).
    const liqHit = steps.some(s => s.liqFreed > 0);
    let liqSpread = null;
    if (liqHit || !liqLeft(b)) st.liqIdle = 0;
    else if (!st.tutorial) {
      st.liqIdle = (st.liqIdle || 0) + 1;
      if (st.liqIdle >= LIQ_IDLE) { liqSpread = spreadLiq(st); st.liqIdle = 0; }
    }
    // 1.9.219 A spread can take the last swap away; shuffle so the board never gets stuck.
    if (!st.tutorial && !shuffled && (spread || liqSpread) && !hasMove(b, mask)) { shuffle(b, st.rand, st.kinds, mask); shuffled = true; }
    if (!st.tutorial) finishIfDone(st);
    return { valid: true, steps, shuffled, swapped: [A, Z], spread, liqSpread };
  }


  function listPlayOutCandies(st) {
    const cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = st.board[r][c];
      if (isCandy(t) && !t.s && !t.lock && !t.liq) cells.push([r, c]);
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
      ingsLeft: st.ingsLeft, liqIdle: st.liqIdle || 0,
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
    if (before.lv && before.lv.bub) h += (bubLeft(before.board) - bubLeft(after.board)) * 320;
    if (before.lv && before.lv.liq) h += (liqLeft(before.board) - liqLeft(after.board)) * 420;
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
  // 1.9.223 Spoken sayings: the game reads out the same inventive line that pops up on screen, instead of a generic
  // "Great!" clip. 1.9.226: every line that shows is spoken in full. Nothing is skipped; instead a new saying only
  // appears once the last one has been said (SAY_SHOW_MS at least), and voice lines queue rather than cut each other.
  // 1.9.227 At least SAY_REST_MS of quiet after a spoken saying finishes before the next one shows. Minor sayings that
  // land in that rest are simply not shown; big ones (specials, streak level-ups) wait, at most one in the queue.
  // 1.9.229 Only the major moments are spoken: special sweets made or set off (stripe, wrap, sprinkle bomb), combos,
  // streak level-ups, the Hard level start, Goal achieved and Sugar Crush. Every other saying still pops up on screen
  // but plays a short candy sound instead (candySfxPlan), at normal pace. SAY_REST_MS applies to spoken lines only.
  const SAY_REST_MS = 3000, SAY_BIG = ['combo', 'bomb', 'wrap', 'stripe'];
  function sayBig(kind) { return SAY_BIG.indexOf(kind) >= 0; }
  const HARD_LINES = { 1: 'Hard level!', 2: 'Super Hard level!' };
  function hardLine(h) { return HARD_LINES[h] || ''; }
  // 1.9.229 Candy sounds for the minor sayings: procedural sine/triangle notes on the soft pentatonic scale
  // (fundamentals 400-800 Hz, through the same 2.5 kHz-lowpassed bus as the chime). Each kind has a few styles; a
  // style never repeats twice running, the key and timing are jittered, and arpeggios grow with the chain.
  // Returns a list of notes { t, f, dur, vol, type, glide, vib } that playCandySfx renders.
  const CANDY_STYLES = {
    cascade: ['arp', 'arp', 'sparkle'], jelly: ['wobble', 'plink'], locks: ['unlock', 'plink'], ice: ['glass', 'sparkle'],
    ings: ['drop', 'plink'], choco: ['thud', 'pop'], gumdrop: ['pop', 'pops'], lemon: ['zing', 'plink'],
    comeback: ['arp', 'unlock'], bub: ['pops', 'pop'], liq: ['sparkle', 'glass'], win: ['arp'],
    stripe: ['sparkle', 'arp'], wrap: ['pops', 'arp'], bomb: ['sparkle', 'arp'], combo: ['arp', 'sparkle']
  };
  function candySfxPlan(kind, chain, rand, last) {
    rand = typeof rand === 'function' ? rand : Math.random;
    chain = Math.max(1, chain | 0);
    const styles = CANDY_STYLES[kind] || ['plink', 'sparkle'];
    let opts = styles.filter(x => x !== last); if (!opts.length) opts = styles;
    const style = opts[(rand() * opts.length) | 0];
    const root = (rand() * SCALE.length) | 0, v = SFX_NOTE * 0.9, notes = [];
    const det = () => 1 + (rand() - 0.5) * 0.03;
    const sc = k => SCALE[((k % SCALE.length) + SCALE.length) % SCALE.length]; // wraps within the 440-784 Hz scale
    const push = (t, f, dur, vol, type, extra) => notes.push(Object.assign({ t: +t.toFixed(3), f: Math.round(Math.max(400, Math.min(SFX_MAX_HZ, f * det()))), dur, vol, type: type || 'sine' }, extra || {}));
    if (style === 'arp') {
      // Rising arpeggio: 3 notes for a small chain, up to 8 for a big one, quicker as it grows.
      const n = Math.min(8, 2 + chain), step = Math.max(0.045, 0.085 - chain * 0.006);
      // Runs up the scale; a long chain climbs again with more shimmer (the scale tops out at SFX_MAX_HZ).
      const lo = root % 3;
      for (let k = 0; k < n; k++) push(k * step, SCALE[(lo + k) % SCALE.length], k === n - 1 ? 0.26 : 0.12, v * (0.75 + 0.25 * k / n), k % 2 ? 'triangle' : 'sine', { spark: k === n - 1 || lo + k >= SCALE.length });
    } else if (style === 'sparkle') {
      const n = 3 + Math.min(4, chain) + ((rand() * 2) | 0);
      for (let k = 0; k < n; k++) push(k * (0.035 + rand() * 0.025), sc((rand() * SCALE.length) | 0), 0.09, v * 0.7, 'sine', { spark: true });
    } else if (style === 'pop') {
      push(0, 760 - rand() * 80, 0.09, v * 1.1, 'sine', { glide: 430 + rand() * 40 });
      push(0.07, sc(root), 0.12, v * 0.6, 'triangle');
    } else if (style === 'pops') {
      const n = 2 + Math.min(3, chain - 1) + ((rand() * 2) | 0);
      for (let k = 0; k < n; k++) push(k * (0.06 + rand() * 0.03), 720 + rand() * 70, 0.07, v * 0.9, 'sine', { glide: 420 + rand() * 60 });
    } else if (style === 'plink') {
      push(0, sc(root), 0.14, v, 'triangle'); push(0.09 + rand() * 0.03, sc(root + 2), 0.2, v * 0.85, 'triangle', { spark: true });
    } else if (style === 'wobble') {
      push(0, sc(root), 0.32, v, 'sine', { vib: 7 + rand() * 3 }); push(0.12, sc(root + 1), 0.22, v * 0.5, 'sine', { vib: 9 });
    } else if (style === 'unlock') {
      push(0, sc(root), 0.08, v, 'triangle'); push(0.07, sc(root + 1), 0.08, v, 'triangle'); push(0.15, sc(root + 3), 0.24, v, 'sine', { spark: true });
    } else if (style === 'glass') {
      for (let k = 0; k < 3; k++) push(k * 0.05, sc(root + 4 - k), 0.18, v * 0.75, 'sine', { spark: true });
    } else if (style === 'drop') {
      for (let k = 0; k < 4; k++) push(k * 0.06, sc(root + 4 - k), 0.1, v * 0.85, k === 3 ? 'triangle' : 'sine');
    } else if (style === 'thud') {
      push(0, 520, 0.14, v * 1.1, 'triangle', { glide: 400 }); push(0.08, sc(root), 0.12, v * 0.5, 'sine');
    } else { // zing
      push(0, 600, 0.12, v, 'sine', { glide: 800 }); push(0.1, sc(root + 3), 0.16, v * 0.7, 'triangle', { spark: true });
    }
    return { style, notes };
  }
  function playCandySfx(ctx, dest, at, plan) {
    if (!ctx || !dest || !plan) return;
    for (const nt of plan.notes) {
      const t0 = at + nt.t, end = t0 + Math.max(0.05, nt.dur), att = 0.008;
      const parts = [[nt.f, nt.vol, nt.type]];
      parts.push([nt.f * 2, nt.vol * (nt.spark ? 0.3 : 0.16), 'sine']); // sparkle: a brighter octave shimmer
      if (nt.spark) parts.push([nt.f * 3, nt.vol * 0.08, 'sine']);
      for (const [hz, peak, typ] of parts) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = typ === 'triangle' ? 'triangle' : 'sine';
        const ratio = hz / nt.f;
        o.frequency.setValueAtTime(hz, t0);
        if (nt.glide) o.frequency.exponentialRampToValueAtTime(Math.max(400, Math.min(SFX_MAX_HZ, nt.glide)) * ratio, end);
        if (nt.vib && ctx.createOscillator) {
          const l = ctx.createOscillator(), lg = ctx.createGain();
          l.type = 'sine'; l.frequency.setValueAtTime(nt.vib, t0); lg.gain.setValueAtTime(hz * 0.025, t0);
          l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(end + 0.03);
        }
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), t0 + att);
        g.gain.exponentialRampToValueAtTime(0.0001, end);
        o.connect(g); g.connect(dest);
        o.start(t0); o.stop(end + 0.03);
      }
    }
  }
  const SAY_SHOW_MS = 1100, SAY_AFTER_MS = 350, SPEAK_GAP = SAY_SHOW_MS, SPEAK_PITCH = 1.25, SPEAK_RATE = 1.05, SPEAK_VOL = 0.9;
  const SPEAK_LANGS = ['en-nz', 'en-au', 'en-gb', 'en-ie', 'en-za', 'en-us', 'en'];
  const SPEAK_FEMALE = /(female|woman|aria|natasha|karen|catherine|matilda|serena|samantha|libby|sonia|molly|zira|tessa|moira|fiona|victoria|allison|ava|susan|hazel|kate|jenny|clara|google uk english female)/i;
  const SPEAK_MALE = /(\bmale\b|\bman\b|mitchell|william|lee|daniel|gordon|arthur|oliver|fred|ryan|guy|rishi|aaron|alex|tom|thomas|james|george|david|mark|ralph|google uk english male)/i;
  function speechGender(v) {
    const n = String(v && v.name || '');
    if (/female|woman/i.test(n)) return 'f';
    if (SPEAK_MALE.test(n)) return 'm';
    if (SPEAK_FEMALE.test(n)) return 'f';
    return null;
  }
  function pickSpeechVoice(list, gender) {
    list = Array.from(list || []);
    let best = null, bestScore = -1;
    list.forEach(function (v) {
      const lang = String(v && v.lang || '').toLowerCase().replace('_', '-');
      let i = SPEAK_LANGS.findIndex(function (l) { return lang === l || lang.indexOf(l + '-') === 0 || (l === 'en' && lang.indexOf('en') === 0); });
      if (i < 0) return;
      const g = speechGender(v);
      const score = (gender ? (g === gender ? 100 : g ? -100 : 0) : (g === 'f' ? 3 : 0)) + (SPEAK_LANGS.length - i) * 10 + (v.localService ? 1 : 0);
      if (score > bestScore) { bestScore = score; best = v; }
    });
    return best;
  }
  // Minor sayings are not spoken: a lone plain match that only chipped a goal tile. Specials, cascades and combos are.
  function speakWorthy(step, cascade) { return !!voiceForStep(step, cascade); }
  // How long before the next saying may appear: the display time, or the spoken line plus a breath if longer.
  function sayShowGap(spokenSec, reduce) { return Math.max(reduce ? 1400 : SAY_SHOW_MS, spokenSec > 0 ? Math.round(spokenSec * 1000) + SAY_AFTER_MS : 0); }
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
    'sugar-rush-voice-sweetas.mp3': '50b435e6', 'sugar-rush-voice-succulent.mp3': '1d5018ba',
    // 1.9.224 Shane's songs (made with Suno), -17 LUFS like the other tunes, AAC 96k with an mp3 twin.
    'sugar-rush-travel.m4a': 'd4c901aa', 'sugar-rush-travel.mp3': '662a7337',
    'sugar-rush-kiss.m4a': '24aced8c', 'sugar-rush-kiss.mp3': '8c1174e4',
    'sugar-rush-song.m4a': 'fb999cd1', 'sugar-rush-song.mp3': '586f9ee6',
    // 1.9.225 Every saying pre-recorded in a female and a male NZ voice, one small sprite per voice.
    // 1.9.227 More room: reverb RT60 ~1.4 s and echoes at 120/260/420 ms, about 34% wet, ~0.9 s tail inside each clip.
    'sugar-rush-say-f.m4a': 'a4d17597', 'sugar-rush-say-f.mp3': 'd67a2872',
    'sugar-rush-say-m.m4a': '33cd967e', 'sugar-rush-say-m.mp3': 'f1cbab26'
  };
  // 1.9.225 Spoken sayings as recorded clips, a female voice (Microsoft neural "Molly", en-NZ) and a male one
  // ("Mitchell", en-NZ), so the game mixes the two reliably instead of relying on the phone's voices.
  // Each sprite is mono AAC 48 kbps; clips sit 0.25 s apart and already include their lead-in and reverb tail.
  // SAY_CLIPS[text] = [fStart, fDur, mStart, mDur] in seconds. 1.9.226 adds the streak lines, which show on screen too.
  const SAY_SPRITES = { f: 'sugar-rush-say-f.m4a', m: 'sugar-rush-say-m.m4a' };
  const SAY_CLIPS = {
    "Stripe-tastic!": [0.25, 1.543, 0.25, 1.55],
    "Candy-licious!": [2.043, 1.418, 2.05, 1.414],
    "Looking sharp!": [3.711, 1.437, 3.714, 1.405],
    "Stripe me pink!": [5.398, 1.503, 5.37, 1.456],
    "That's a wrap!": [7.15, 1.399, 7.075, 1.328],
    "All wrapped up!": [8.799, 1.423, 8.654, 1.299],
    "Parcel of yum!": [10.472, 1.46, 10.202, 1.494],
    "Tied with a bow!": [12.183, 1.68, 11.947, 1.619],
    "Sprinkle-tastic!": [14.112, 1.673, 13.816, 1.628],
    "Hundreds and thousands!": [16.035, 1.803, 15.694, 1.714],
    "Sprinkle party!": [18.089, 1.672, 17.657, 1.676],
    "Lolly bomb!": [20.011, 1.369, 19.584, 1.416],
    "Double delight!": [21.631, 1.477, 21.25, 1.414],
    "Two for tea!": [23.358, 1.501, 22.914, 1.462],
    "Special times two!": [25.109, 1.984, 24.626, 1.904],
    "Pair of treats!": [27.343, 1.444, 26.78, 1.448],
    "Goal achieved!": [29.037, 1.515, 28.479, 1.396],
    "Sugar Crush!": [30.802, 1.463, 30.124, 1.386],
    "Voice on!": [32.515, 1.403, 31.761, 1.406],
    "Sweet streak!": [34.168, 1.54, 33.417, 1.546],
    "Sweeter streak!": [35.958, 1.521, 35.214, 1.549],
    "Sugar-high streak!": [37.729, 1.685, 37.012, 1.624],
    "Ultimate sweet streak!": [39.665, 1.869, 38.886, 1.763],
    "Hard level!": [41.784, 1.34, 40.899, 1.515],
    "Super Hard level!": [43.374, 1.728, 42.664, 1.853]
  };
  function sayClip(text, g) {
    const c = SAY_CLIPS[text]; if (!c) return null;
    return g === 'm' ? { start: c[2], dur: c[3] } : { start: c[0], dur: c[1] };
  }
  // Mostly alternate female and male, with the odd repeat so it doesn't feel mechanical.
  function nextSayVoice(last, r) {
    if (last !== 'f' && last !== 'm') return r < 0.5 ? 'f' : 'm';
    return r < 0.75 ? (last === 'f' ? 'm' : 'f') : last;
  }
  function mediaUrl(file) { return file.replace(/\.(mp3|m4a)$/, '-' + MEDIA_HASH[file] + '.$1'); }
  // 1.9.223 Shane's songs for the later levels, picked by mood: the most intense for the Hard and Super Hard levels,
  // the calmest for the Pacific islands, the upbeat one for the rest. Levels 1-7 keep our own tunes (Shane likes
  // them for the early stages). Each song ships as AAC (.m4a, ~96 kbps) with an .mp3 fallback; a mood with no
  // file yet simply keeps the usual loop, so this is safe before the songs land.
  const SONG_PLAN = { intense: [13, 15, 19, 22], calm: [17, 18], upbeat: [8, 9, 10, 11, 12, 14, 16, 20, 21] };
  // "Sugar Rush travel" (~136 BPM, the loudest and punchiest) drives the Hard levels; "Sugar Rush Kiss" (~89 BPM,
  // the softest, "let it linger") floats over the Pacific islands; "Sugar Rush" ("now I can't sit still") for the rest.
  const SONG_FILES = { intense: 'sugar-rush-travel.m4a', calm: 'sugar-rush-kiss.m4a', upbeat: 'sugar-rush-song.m4a' };
  const SONG_FROM = 8;
  function songMood(level) {
    if (!(level >= SONG_FROM)) return null;
    for (const k in SONG_PLAN) if (SONG_PLAN[k].indexOf(level) >= 0) return k;
    return 'upbeat';
  }
  // Level 1 plays Shane's "Sugar Rush" song, level 2 plays "Sarah's Sugar Sprint";
  // later levels keep the usual gameplay loop until their song is in.
  function gameTrack(level) {
    const mood = songMood(level);
    if (mood && SONG_FILES[mood]) return SONG_FILES[mood];
    return level === 1 ? 'sugar-rush-l1.mp3' : level === 2 ? 'sugar-rush-l2.mp3' : 'sugar-rush-music.mp3';
  }

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
    comeback: ['Still in it!', 'Not done yet!', 'Clutch play!', 'Comeback sweet!'],
    bub: ['Pop pop!', 'Fizz-tastic!', 'Bubble pop!', 'Popping candy!'],
    liq: ['Liquorice-free!', 'Unwrapped!', 'Untangled!', 'Black magic!']
  };
  const SAYING_COLORS = {
    cascade: '#ff3d8a', stripe: '#1aa7ff', wrap: '#ffb400', bomb: '#c84dff',
    jelly: '#e649cf', locks: '#ff8c2a', ice: '#3bc9ff', ings: '#ff6b2c',
    choco: '#c26a2d', gumdrop: '#ff2d55', lemon: '#ffd43b', combo: '#ff5ad5',
    comeback: '#ff7a1a', bub: '#29b6f6', liq: '#6a3d9a'
  };
  const SAYING_VOICE = {
    cascade: 'great', stripe: 'great', wrap: 'sweetas', bomb: 'succulent',
    jelly: 'great', locks: 'great', ice: 'great', ings: 'sweetas',
    choco: 'great', gumdrop: 'great', lemon: 'great', combo: 'awesome',
    comeback: 'awesome', bub: 'great', liq: 'great'
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
    else if (fired.some(f => f.s === 'w')) kind = 'wrap'; // 1.9.229 setting one off is a major moment too
    else if (fired.some(f => f.s === 'row' || f.s === 'col')) kind = 'stripe';
    else if (s.delivered && s.delivered.length) kind = 'ings';
    else if (s.chocoHit) kind = 'choco';
    else if (s.brokeLock) kind = 'locks';
    else if (s.liqFreed) kind = 'liq';
    else if (s.bubPopped) kind = 'bub';
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
  function raceStop(p) { return Math.max(1, Math.min(LV_COUNT, (p && p.open) || 1)); }
  // 1.9.222 Levels have a stable id (their badge id), so saved progress and the race follow the level, not its number.
  function lvId(lv) { return (lv && lv.badge && lv.badge.id) || ''; }
  function levelIds() { return LEVELS.map(lvId); }
  function stopId(n) { return lvId(LEVELS[(n | 0) - 1]); }
  // The order 1.9.220 saved progress in: levels 1-15, then the three islands as 16-18.
  const LEGACY_220_IDS = ['shop', 'sarah', 'jelly', 'lock', 'icing', 'double', 'down', 'choco', 'path', 'night', 'whale', 'tram', 'glacier', 'gondola', 'ticket', 'hibiscus', 'coconut', 'shell'];
  function migrateProg(p) {
    p = p || {};
    const ids = levelIds();
    const arr = function (a) { return Array.isArray(a) ? a : []; };
    const len = Math.max(arr(p.stars).length, arr(p.best).length, arr(p.badges).length);
    // Saved with ids: follow them. Saved without ids and longer than 15: 1.9.220's order. Otherwise 1-15 never moved.
    const src = Array.isArray(p.ids) && p.ids.length ? p.ids : (len > 15 ? LEGACY_220_IDS : ids.slice(0, 15));
    const out = { stars: [], best: [], badges: [] };
    for (let i = 0; i < LV_COUNT; i++) { out.stars.push(0); out.best.push(0); out.badges.push(0); }
    ['stars', 'best', 'badges'].forEach(function (k) {
      arr(p[k]).forEach(function (v, i) { const j = ids.indexOf(src[i]); if (j >= 0) out[k][j] = Math.max(out[k][j], v || 0); });
    });
    let open = Math.max(1, (p.open | 0) || 1);
    const oid = src[open - 1];
    if (oid && ids.indexOf(oid) >= 0) open = ids.indexOf(oid) + 1;
    open = Math.min(LV_COUNT, open);
    // Never close a level someone has already played.
    for (let i = LV_COUNT - 1; i >= 0; i--) if (out.stars[i] > 0 || out.badges[i] > 0) { open = Math.max(open, Math.min(LV_COUNT, i + 1)); break; }
    return { open: open, stars: out.stars, best: out.best, badges: out.badges, ids: ids, wins: Math.max(0, p.wins | 0) };
  }
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


  // 1.9.218 Presentation polish (pure helpers, no DOM): themed backgrounds for
  // each NZ stop, the Sweet streak meter, boosters and the daily spin wheel,
  // and the treasure-chest reward. Goals stay objective-based; none of this
  // changes how a level is won, and the streak never changes the score.
  const VB_W = 390, VB_H = 844;
  function scCloud(x, y, s, o) {
    return '<g opacity="' + (o == null ? 0.92 : o) + '" transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<ellipse cx="0" cy="0" rx="36" ry="13" fill="#fff"/><ellipse cx="-15" cy="-8" rx="16" ry="13" fill="#fff"/><ellipse cx="12" cy="-12" rx="20" ry="16" fill="#fff"/></g>';
  }
  function scGrad(id, stops, horiz) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (horiz ? 1 : 0) + '" y2="' + (horiz ? 0 : 1) + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"/>'; }).join('') + '</linearGradient>';
  }
  function scHeart(x, y, s, col, o) {
    return '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 8 C-12 -2 -8 -12 0 -6 C8 -12 12 -2 0 8 Z" fill="' + col + '" opacity="' + (o == null ? 1 : o) + '"/>';
  }
  function scHouses(xs, y, cols) {
    return xs.map(function (x, i) {
      const c = cols[i % cols.length], h = 14 + (i * 7) % 10;
      return '<rect x="' + x + '" y="' + (y - h) + '" width="16" height="' + h + '" fill="' + c + '"/>' +
        '<path d="M' + (x - 2) + ' ' + (y - h) + ' L' + (x + 8) + ' ' + (y - h - 8) + ' L' + (x + 18) + ' ' + (y - h) + ' Z" fill="#d9485f"/>' +
        '<rect x="' + (x + 5) + '" y="' + (y - h + 4) + '" width="5" height="5" fill="#fff6c8"/>';
    }).join('');
  }
  function scPine(x, y, h) {
    return '<rect x="' + (x - 2) + '" y="' + (y - h * 0.25) + '" width="4" height="' + (h * 0.25) + '" fill="#6b4a2a"/>' +
      [0, 1, 2, 3].map(function (i) { const w = 6 + i * 4, yy = y - h + i * h * 0.19; return '<path d="M' + x + ' ' + yy + ' L' + (x + w) + ' ' + (yy + h * 0.24) + ' L' + (x - w) + ' ' + (yy + h * 0.24) + ' Z" fill="#2f6e46"/>'; }).join('');
  }
  const SCENES = [
    { n: 1, id: 'beach', place: 'Onerahi', title: 'Onerahi beach', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#5cc8ff'], [0.5, '#a9e6ff'], [1, '#fff0cf']]) + scGrad('se', [[0, '#39c0ef'], [1, '#1683c4']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' +
          '<circle cx="316" cy="96" r="74" fill="#fff6c2" opacity=".45"/><circle cx="316" cy="96" r="40" fill="#fff3a0"/>' +
          scCloud(80, 70, 1.1) + scCloud(230, 150, 0.8, 0.8) +
          '<path d="M0 520 L22 470 L34 492 L52 436 L64 470 L80 448 L100 498 L130 486 L160 520 Z" fill="#4f9d74"/>' +
          '<path d="M150 520 C200 494 250 500 290 512 C330 500 370 498 390 506 L390 520 Z" fill="#7fc39a"/>' +
          '<rect y="518" width="390" height="210" fill="url(#se)"/>' +
          '<path d="M10 560 q20 -8 40 0 t40 0 M140 600 q20 -8 40 0 t40 0 M260 570 q20 -8 40 0 t40 0 M60 650 q20 -8 40 0 t40 0 M220 680 q20 -8 40 0 t40 0" stroke="#fff" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>' +
          '<path d="M0 712 C80 696 160 724 240 708 C300 698 350 706 390 700 L390 844 L0 844 Z" fill="#f3cd86"/>' +
          '<path d="M0 730 C90 716 170 742 250 728 C310 718 352 724 390 720 L390 844 L0 844 Z" fill="#ffe2a6"/>' +
          '<path d="M300 790 l6 12 13 2 -10 9 3 13 -12 -7 -12 7 3 -13 -10 -9 13 -2 Z" fill="#ff8a5c"/>' +
          '<ellipse cx="236" cy="806" rx="9" ry="6" fill="#fff4e6"/>' +
          '<path d="M46 844 C52 790 58 760 70 730 C74 750 70 790 66 844 Z" fill="#7a4a2a"/>' +
          '<circle cx="40" cy="712" r="36" fill="#2f7d4f"/><circle cx="84" cy="700" r="40" fill="#3d9460"/><circle cx="16" cy="676" r="28" fill="#2f7d4f"/><circle cx="62" cy="662" r="32" fill="#3d9460"/>' +
          [[30, 690], [52, 676], [80, 690], [96, 714], [20, 706], [64, 712], [44, 652], [76, 652], [10, 670], [104, 690]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#e8304a"/>'; }).join('');
      },
      sprites: [
        { x: 2, y: 4, w: 30, cls: 'sc-drift', d: 18, svg: 'cloud' },
        { x: 60, y: 22, w: 22, cls: 'sc-drift', d: 24, dl: -7, svg: 'cloud' },
        { x: 70, y: 70, w: 12, cls: 'sc-bob', d: 3.4, svg: 'boat' },
        { x: 40, y: 12, w: 8, cls: 'sc-drift', d: 9, svg: 'gull' }
      ] },
    { n: 2, id: 'sarah', place: "Sarah's House", title: "Sarah's garden", night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#ffa9cf'], [0.55, '#ffd2b0'], [1, '#fff1e6']]) + scGrad('gr', [[0, '#a6e8a0'], [1, '#6cc77a']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' +
          '<circle cx="78" cy="118" r="80" fill="#fff4c2" opacity=".4"/><circle cx="78" cy="118" r="46" fill="#fff0b0"/>' +
          scHeart(300, 90, 2.4, '#fff', 0.7) + scHeart(220, 160, 1.6, '#fff', 0.55) +
          '<path d="M0 600 C70 560 140 570 200 590 C260 560 330 560 390 584 L390 700 L0 700 Z" fill="#f2b3d0"/>' +
          '<path d="M0 640 C90 610 180 630 260 618 C320 610 360 614 390 620 L390 700 L0 700 Z" fill="#e79bc2"/>' +
          '<rect y="680" width="390" height="164" fill="url(#gr)"/>' +
          '<rect x="226" y="612" width="128" height="98" fill="#fff3f7" stroke="#f4a0c4" stroke-width="3"/>' +
          '<path d="M216 616 L290 556 L364 616 Z" fill="#e2457f"/><rect x="326" y="566" width="14" height="30" fill="#c93a6e"/>' +
          '<rect x="276" y="652" width="28" height="58" rx="12" fill="#ff8ab8"/><circle cx="298" cy="682" r="2.5" fill="#fff"/>' +
          scHeart(250, 646, 1.4, '#ffd0e4') + scHeart(330, 646, 1.4, '#ffd0e4') +
          '<path d="M0 748 H390" stroke="#fff" stroke-width="5"/><path d="M0 770 H390" stroke="#fff" stroke-width="5"/>' +
          [6, 34, 62, 90, 118, 146, 174, 202, 230, 258, 286, 314, 342, 370].map(function (x) { return '<path d="M' + x + ' 784 V738 l7 -8 7 8 V784 Z" fill="#fff"/>'; }).join('') +
          [[20, 800, '#ff6fa8'], [60, 810, '#ffd43b'], [110, 798, '#ff8ab8'], [160, 812, '#c77dff'], [210, 800, '#ff6fa8'], [260, 812, '#ffd43b'], [310, 800, '#ff8ab8'], [360, 812, '#c77dff']].map(function (f) { return '<circle cx="' + f[0] + '" cy="' + f[1] + '" r="7" fill="' + f[2] + '"/><circle cx="' + f[0] + '" cy="' + f[1] + '" r="2.5" fill="#fff6c8"/>'; }).join('') +
          '<rect x="72" y="640" width="10" height="80" fill="#9a5b3a"/>' + scHeart(77, 626, 5.2, '#ff7fb0');
      },
      sprites: [
        { x: 8, y: 30, w: 7, cls: 'sc-float', d: 6, emoji: '💗' },
        { x: 80, y: 40, w: 6, cls: 'sc-float', d: 7.5, dl: -3, emoji: '💖' },
        { x: 46, y: 9, w: 7, cls: 'sc-float', d: 8, dl: -5, emoji: '💗' },
        { x: 30, y: 82, w: 7, cls: 'sc-bob', d: 2.6, emoji: '🦋' },
        { x: 55, y: 14, w: 24, cls: 'sc-drift', d: 20, svg: 'cloud' }
      ] },
    { n: 3, id: 'falls', place: 'Whangārei', title: 'Whangārei Falls', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#7fd4ff'], [1, '#dff6ff']]) + scGrad('wf', [[0, '#ffffff'], [1, '#bfe9ff']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(300, 80, 1) + scCloud(90, 130, 0.7, 0.8) +
          '<path d="M0 540 C60 470 140 480 190 520 C250 460 330 470 390 510 L390 844 L0 844 Z" fill="#3f8f5a"/>' +
          '<path d="M0 600 C70 560 130 570 170 590 L170 844 L0 844 Z" fill="#5fae6f"/><path d="M230 590 C280 560 340 566 390 584 L390 844 L230 844 Z" fill="#5fae6f"/>' +
          '<path d="M150 560 L170 560 L170 740 L150 760 Z M230 560 L250 562 L252 760 L230 740 Z" fill="#7d7268"/>' +
          '<rect x="168" y="556" width="64" height="196" fill="url(#wf)"/>' +
          '<path d="M178 560 V748 M192 560 V748 M206 560 V748 M220 560 V748" stroke="#9fdcff" stroke-width="3" opacity=".6"/>' +
          '<ellipse cx="200" cy="772" rx="130" ry="34" fill="#4fb6e0"/><ellipse cx="200" cy="756" rx="60" ry="12" fill="#fff" opacity=".85"/>' +
          '<path d="M0 844 L0 790 C60 776 120 800 170 808 L170 844 Z M390 844 L390 790 C330 776 270 800 232 808 L232 844 Z" fill="#2e7d4a"/>' +
          [[44, 700], [338, 690]].map(function (p) { const x = p[0], y = p[1]; return '<rect x="' + (x - 3) + '" y="' + y + '" width="6" height="' + (844 - y) + '" fill="#5a3e2a"/>' +
            [-70, -40, -10, 20, 50, 80, 110].map(function (a) { const r = a * Math.PI / 180; return '<path d="M' + x + ' ' + y + ' Q' + (x + Math.sin(r) * 30) + ' ' + (y - 34) + ' ' + (x + Math.sin(r) * 58) + ' ' + (y - Math.cos(r) * 26) + '" stroke="#2f8a4a" stroke-width="7" fill="none" stroke-linecap="round"/>'; }).join(''); }).join('');
      },
      sprites: [
        { x: 40, y: 85, w: 18, cls: 'sc-rise', d: 4.5, puff: 1 },
        { x: 52, y: 86, w: 14, cls: 'sc-rise', d: 5.2, dl: -2, puff: 1 },
        { x: 43.1, y: 66, w: 16.4, h: 23, cls: 'sc-fallbox', fall: 1 },
        { x: 6, y: 16, w: 24, cls: 'sc-drift', d: 22, svg: 'cloud' }
      ] },
    { n: 4, id: 'auckland', place: 'Auckland Post Office', title: 'Auckland harbour', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#7b86f5'], [0.5, '#ff9ac1'], [1, '#ffd59e']]) + scGrad('se', [[0, '#5aa8e6'], [1, '#2f7dc4']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(70, 90, 0.9, 0.7) + scCloud(250, 60, 1.1, 0.6) +
          '<rect x="296" y="300" width="10" height="330" fill="#ece6f4"/><path d="M299 236 h4 v66 h-4 Z" fill="#ece6f4"/>' +
          '<ellipse cx="301" cy="404" rx="24" ry="9" fill="#fff"/><rect x="284" y="394" width="34" height="14" rx="5" fill="#d9d0ee"/><ellipse cx="301" cy="420" rx="16" ry="5" fill="#fff"/>' +
          [[0, 600, 30, 60], [30, 580, 26, 80], [56, 610, 40, 50], [96, 570, 24, 90], [120, 596, 36, 64], [160, 560, 30, 100], [190, 590, 40, 70], [230, 576, 28, 84], [258, 600, 34, 60], [318, 584, 30, 76], [348, 604, 42, 56]].map(function (b) {
            let w = '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" fill="#a99ae0"/>';
            for (let yy = b[1] + 8; yy < b[1] + b[3] - 6; yy += 12) for (let xx = b[0] + 5; xx < b[0] + b[2] - 4; xx += 9) w += '<rect x="' + xx + '" y="' + yy + '" width="4" height="5" fill="#fff3b0" opacity=".8"/>';
            return w;
          }).join('') +
          '<rect y="660" width="390" height="110" fill="url(#se)"/>' +
          '<path d="M-10 690 Q100 610 210 690" stroke="#8fb3a8" stroke-width="7" fill="none"/><path d="M-10 690 H230" stroke="#8fb3a8" stroke-width="6"/>' +
          '<path d="M20 690 V668 M60 690 V646 M100 690 V636 M140 690 V646 M180 690 V668" stroke="#8fb3a8" stroke-width="3"/>' +
          '<path d="M250 700 q16 -6 32 0 M300 730 q16 -6 32 0 M40 740 q16 -6 32 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6"/>' +
          '<rect x="40" y="756" width="310" height="88" fill="#f2dcb6"/><path d="M30 760 H360 L346 744 H44 Z" fill="#e6c79a"/>' +
          '<rect x="60" y="748" width="270" height="10" fill="#d9b886"/>' +
          [70, 110, 150, 190, 230, 270, 310].map(function (x) { return '<rect x="' + x + '" y="770" width="10" height="74" fill="#e8cfa4"/><path d="M' + (x + 14) + ' 844 V800 a10 10 0 0 1 20 0 V844 Z" fill="#7a5a8a" opacity=".55"/>'; }).join('') +
          '<text x="195" y="756" text-anchor="middle" font-size="9" font-weight="800" fill="#8a6a3a" font-family="ui-rounded,system-ui,sans-serif" letter-spacing="2">POST OFFICE</text>' +
          '<rect x="14" y="796" width="18" height="40" rx="6" fill="#e0333a"/><rect x="17" y="806" width="12" height="3" fill="#2a1a1a"/>';
      },
      sprites: [
        { x: 66, y: 81, w: 9, cls: 'sc-bob', d: 3.2, svg: 'boat' },
        { x: 14, y: 83, w: 7, cls: 'sc-bob', d: 3.8, dl: -1.5, svg: 'boat' },
        { x: 74, y: 47, w: 6, cls: 'sc-twinkle', d: 1.6, svg: 'glint' },
        { x: 30, y: 6, w: 26, cls: 'sc-drift', d: 26, svg: 'cloud' }
      ] },
    { n: 5, id: 'hamilton', place: 'Hamilton', title: 'Hamilton Gardens', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#6fcfff'], [1, '#e6f8ff']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(310, 110, 1) + scCloud(60, 60, 0.8, 0.85) +
          '<path d="M0 590 C80 548 160 560 220 580 C290 552 350 556 390 570 L390 844 L0 844 Z" fill="#9bd67a"/>' +
          '<path d="M0 650 C90 620 190 640 270 626 C320 618 360 622 390 628 L390 844 L0 844 Z" fill="#7cc463"/>' +
          '<path d="M-10 700 C80 680 140 730 220 712 C300 694 340 730 400 716 L400 744 C340 758 300 722 220 740 C140 758 80 708 -10 728 Z" fill="#5ab9e6"/>' +
          '<path d="M0 760 C100 744 200 770 300 754 C340 748 370 750 390 752 L390 844 L0 844 Z" fill="#58a84a"/>' +
          '<path d="M150 844 V800 a45 45 0 0 1 90 0 V844 h-14 V802 a31 31 0 0 0 -62 0 V844 Z" fill="#2f7a3e"/>' +
          [0, 1, 2].map(function (row) { return [20, 46, 72, 98, 270, 296, 322, 348, 374].map(function (x, i) { const cols = ['#ff6fa8', '#ffd43b', '#ff8c2a', '#c77dff']; return '<circle cx="' + x + '" cy="' + (792 + row * 18) + '" r="6" fill="' + cols[(i + row) % 4] + '"/>'; }).join(''); }).join('');
      },
      sprites: [
        { x: 8, y: 14, w: 13, cls: 'sc-float', d: 9, svg: 'balloon', col: '#ff5ea8' },
        { x: 70, y: 6, w: 11, cls: 'sc-float', d: 11, dl: -4, svg: 'balloon', col: '#ffb400' },
        { x: 82, y: 32, w: 9, cls: 'sc-float', d: 10, dl: -7, svg: 'balloon', col: '#3d8bfd' },
        { x: 40, y: 18, w: 22, cls: 'sc-drift', d: 24, svg: 'cloud' }
      ] },
    { n: 6, id: 'rotorua', place: 'Rotorua', title: 'Rotorua steam', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#b4e2ff'], [1, '#f4fbff']]) + scGrad('gy', [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,.85)'], [1, '#ffffff']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(280, 90, 1, 0.8) +
          '<path d="M0 560 C80 520 150 530 210 552 C270 520 340 524 390 540 L390 844 L0 844 Z" fill="#3c7f5a"/>' +
          '<rect y="600" width="390" height="40" fill="#7ec8ef" opacity=".7"/>' +
          '<path d="M0 640 C80 626 170 646 250 634 C310 626 360 630 390 634 L390 844 L0 844 Z" fill="#f3e7da"/>' +
          '<path d="M0 680 C90 668 160 690 240 678 C300 670 350 676 390 674" stroke="#e7a65a" stroke-width="6" fill="none" opacity=".7"/>' +
          '<path d="M0 720 C80 706 170 728 260 716 C320 708 360 712 390 714" stroke="#f0c27a" stroke-width="5" fill="none" opacity=".7"/>' +
          '<path d="M96 700 C104 640 108 580 116 500 C124 580 128 640 136 700 Z" fill="url(#gy)"/>' +
          '<ellipse cx="116" cy="704" rx="34" ry="9" fill="#d9cfc4"/>' +
          '<ellipse cx="282" cy="776" rx="70" ry="22" fill="#9b8a7a"/><ellipse cx="282" cy="772" rx="58" ry="16" fill="#b09f8e"/>' +
          '<circle cx="262" cy="772" r="6" fill="#c9b8a6"/><circle cx="296" cy="768" r="4" fill="#c9b8a6"/><circle cx="310" cy="778" r="5" fill="#c9b8a6"/>' +
          '<ellipse cx="60" cy="800" rx="46" ry="14" fill="#7fd6d0"/><ellipse cx="60" cy="797" rx="34" ry="9" fill="#aeeae4"/>';
      },
      sprites: [
        { x: 22, y: 56, w: 20, cls: 'sc-rise', d: 4, puff: 1 },
        { x: 27, y: 58, w: 16, cls: 'sc-rise', d: 4.6, dl: -1.6, puff: 1 },
        { x: 64, y: 86, w: 18, cls: 'sc-rise', d: 5, dl: -0.8, puff: 1 },
        { x: 70, y: 87, w: 14, cls: 'sc-rise', d: 5.6, dl: -3, puff: 1 },
        { x: 8, y: 90, w: 16, cls: 'sc-rise', d: 6, dl: -2, puff: 1 }
      ] },
    { n: 7, id: 'taupo', place: 'Taupō Station', title: 'Lake Taupō and the mountains', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#8ad2ff'], [1, '#eaf8ff']]) + scGrad('lk', [[0, '#5fbbe8'], [1, '#2f8fc8']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(80, 80, 1) + scCloud(300, 140, 0.8, 0.85) +
          '<path d="M0 600 L70 520 L110 560 L170 470 L230 560 L280 500 L340 572 L390 540 L390 620 L0 620 Z" fill="#8a9cc4"/>' +
          '<path d="M150 494 L170 470 L192 498 L180 494 L170 502 L160 492 Z M58 534 L70 520 L82 534 Z M266 516 L280 500 L294 518 Z" fill="#fff"/>' +
          '<rect y="612" width="390" height="100" fill="url(#lk)"/>' +
          '<path d="M30 640 q14 -5 28 0 M200 660 q14 -5 28 0 M300 640 q14 -5 28 0 M110 690 q14 -5 28 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6"/>' +
          '<rect y="708" width="390" height="136" fill="#9ccf7a"/>' +
          '<rect x="200" y="716" width="150" height="62" fill="#fff6e6" stroke="#c94f3c" stroke-width="3"/><path d="M190 720 L275 690 L360 720 Z" fill="#c94f3c"/>' +
          '<rect x="226" y="736" width="18" height="18" fill="#7ec8ef"/><rect x="306" y="736" width="18" height="18" fill="#7ec8ef"/><rect x="264" y="740" width="22" height="38" fill="#a0522d"/>' +
          '<rect x="232" y="700" width="86" height="14" rx="4" fill="#fff"/><text x="275" y="711" text-anchor="middle" font-size="10" font-weight="900" fill="#c94f3c" font-family="ui-rounded,system-ui,sans-serif">Taupō</text>' +
          '<rect y="784" width="390" height="10" fill="#b8a48a"/><path d="M0 806 H390 M0 822 H390" stroke="#6b5a4a" stroke-width="3"/>' +
          [0, 26, 52, 78, 104, 130, 156, 182, 208, 234, 260, 286, 312, 338, 364].map(function (x) { return '<rect x="' + (x + 6) + '" y="800" width="8" height="28" fill="#8a6a4a"/>'; }).join('');
      },
      sprites: [
        { x: 6, y: 86, w: 26, cls: 'sc-bob', d: 1.8, svg: 'train' },
        { x: 10, y: 80, w: 9, cls: 'sc-rise', d: 3.4, puff: 1 },
        { x: 13, y: 79, w: 7, cls: 'sc-rise', d: 3.9, dl: -1.4, puff: 1 },
        { x: 54, y: 8, w: 24, cls: 'sc-drift', d: 22, svg: 'cloud' }
      ] },
    { n: 8, id: 'napier', place: 'Napier', title: 'Art Deco Napier', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#7fd8ff'], [0.6, '#cdf0ff'], [1, '#fff1cf']]) + scGrad('se', [[0, '#3cc0ef'], [1, '#1e94d0']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(90, 120, 0.9) + scCloud(260, 70, 0.7, 0.85) +
          '<rect y="610" width="390" height="110" fill="url(#se)"/>' +
          '<path d="M20 640 q14 -5 28 0 M160 670 q14 -5 28 0 M300 650 q14 -5 28 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6"/>' +
          '<rect y="712" width="390" height="16" fill="#e9dcc4"/>' +
          scPine(30, 712, 90) + scPine(140, 712, 100) + scPine(250, 712, 92) + scPine(360, 712, 96) +
          [[0, 742, 96, '#ffd1dc'], [96, 728, 104, '#c8f0e0'], [200, 736, 94, '#fff0b3'], [294, 724, 96, '#d9d0ff']].map(function (b) {
            const x = b[0], y = b[1], w = b[2];
            return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (844 - y) + '" fill="' + b[3] + '"/>' +
              '<rect x="' + (x + w * 0.3) + '" y="' + (y - 14) + '" width="' + (w * 0.4) + '" height="16" fill="' + b[3] + '"/>' +
              '<rect x="' + (x + w * 0.42) + '" y="' + (y - 24) + '" width="' + (w * 0.16) + '" height="12" fill="' + b[3] + '"/>' +
              '<path d="M' + (x + 6) + ' ' + (y + 12) + ' h' + (w - 12) + '" stroke="#e86a9a" stroke-width="3"/>' +
              '<path d="M' + (x + 8) + ' ' + (y + 22) + ' l8 8 8 -8 8 8 8 -8 8 8 8 -8 8 8 8 -8" stroke="#3aa58a" stroke-width="2" fill="none"/>' +
              [0, 1, 2].map(function (i) { return '<rect x="' + (x + 12 + i * (w - 24) / 3) + '" y="' + (y + 40) + '" width="' + ((w - 24) / 3 - 8) + '" height="22" rx="3" fill="#fff" opacity=".75"/>'; }).join('');
          }).join('') +
          '<path d="M222 736 a26 26 0 0 1 52 0 Z" fill="#ffc94a"/>' + [0, 30, 60, 90, 120, 150, 180].map(function (a) { const r = a * Math.PI / 180; return '<path d="M248 736 L' + (248 + Math.cos(r) * -24) + ' ' + (736 - Math.sin(r) * 24) + '" stroke="#fff3b0" stroke-width="2"/>'; }).join('');
      },
      sprites: [
        { x: 66, y: 2, w: 30, cls: 'sc-spin', d: 60, svg: 'sunburst' },
        { x: 10, y: 10, w: 24, cls: 'sc-drift', d: 20, svg: 'cloud' },
        { x: 50, y: 66, w: 8, cls: 'sc-drift', d: 8, svg: 'gull' }
      ] },
    { n: 9, id: 'wellington', place: 'Wellington', title: 'Wellington harbour', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#7cc9ff'], [1, '#e9f6ff']]) + scGrad('se', [[0, '#4aa6de'], [1, '#2a7fbe']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' +
          '<path d="M30 110 h90 M60 140 h120 M220 90 h110 M250 170 h90" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>' +
          '<path d="M0 520 C60 470 120 480 170 510 C230 450 320 460 390 500 L390 700 L0 700 Z" fill="#5ea36f"/>' +
          scHouses([20, 50, 84, 120, 200, 236, 270, 306, 340], 600, ['#fff', '#ffe066', '#7ec8ef', '#ffb3d3', '#c8f0e0']) +
          scHouses([40, 100, 160, 260, 320], 650, ['#ffe066', '#fff', '#ffb3d3', '#7ec8ef']) +
          '<path d="M210 700 L330 560" stroke="#6b5a4a" stroke-width="4"/>' +
          '<g transform="translate(262 636) rotate(-49)"><rect x="-16" y="-10" width="32" height="20" rx="4" fill="#e0333a"/><rect x="-11" y="-6" width="9" height="7" fill="#fff6c8"/><rect x="2" y="-6" width="9" height="7" fill="#fff6c8"/></g>' +
          '<rect y="690" width="390" height="120" fill="url(#se)"/>' +
          '<path d="M30 720 q14 -5 28 0 M180 750 q14 -5 28 0 M300 724 q14 -5 28 0 M100 780 q14 -5 28 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6"/>' +
          '<path d="M0 804 C100 792 200 812 300 798 C340 792 370 794 390 796 L390 844 L0 844 Z" fill="#d8c8a8"/>' +
          '<rect x="330" y="404" width="5" height="100" fill="#fff"/>';
      },
      sprites: [
        { x: 79, y: 43, w: 16, cls: 'sc-spin', d: 4, svg: 'blades' },
        { x: 18, y: 86, w: 9, cls: 'sc-bob', d: 2.6, svg: 'boat' },
        { x: 60, y: 89, w: 13, cls: 'sc-bob', d: 3.4, dl: -1, svg: 'ferry' },
        { x: 4, y: 8, w: 26, cls: 'sc-drift', d: 9, svg: 'cloud' },
        { x: 60, y: 20, w: 20, cls: 'sc-drift', d: 11, dl: -4, svg: 'cloud' }
      ] },
    { n: 10, id: 'nelson', place: 'Nelson', title: 'Saturday night in Nelson', night: true,
      art: function () {
        let stars = '';
        for (let i = 0; i < 46; i++) { const x = (i * 83) % 390, y = (i * 137) % 520, r = (i % 5 === 0) ? 1.8 : 1.1; stars += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff" opacity="' + (0.5 + (i % 3) * 0.2) + '"/>'; }
        return '<defs>' + scGrad('sk', [[0, '#15123f'], [0.55, '#3b2f7a'], [1, '#8a5aa8']]) + scGrad('se', [[0, '#2c3e7a'], [1, '#1c2756']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + stars +
          '<path d="M0 160 C120 120 260 220 390 170" stroke="#c9b8ff" stroke-width="40" fill="none" opacity=".12"/>' +
          '<circle cx="300" cy="110" r="60" fill="#fff8d6" opacity=".18"/><circle cx="300" cy="110" r="32" fill="#fff4c2"/><circle cx="314" cy="102" r="28" fill="#2a2468"/>' +
          '<path d="M0 600 C70 560 150 570 210 590 C270 556 340 560 390 576 L390 700 L0 700 Z" fill="#2b2550"/>' +
          '<rect y="640" width="390" height="130" fill="url(#se)"/>' +
          '<path d="M250 660 h40 M240 690 h60 M256 720 h30 M246 748 h50" stroke="#fff4c2" stroke-width="3" opacity=".45" stroke-linecap="round"/>' +
          '<path d="M0 764 C100 752 200 774 300 760 C340 754 370 756 390 758 L390 844 L0 844 Z" fill="#b9934e"/>' +
          '<rect x="60" y="640" width="14" height="58" fill="#f4f0ff"/><rect x="60" y="652" width="14" height="8" fill="#e0333a"/><rect x="60" y="672" width="14" height="8" fill="#e0333a"/>' +
          '<path d="M56 640 L67 626 L78 640 Z" fill="#e0333a"/><rect x="62" y="630" width="10" height="8" fill="#fff4a0"/>';
      },
      sprites: [
        { x: 8, y: 50, w: 22, h: 10, cls: 'sc-pulse', d: 2.4, beam: 1 },
        { x: 20, y: 8, w: 4, cls: 'sc-twinkle', d: 1.8, svg: 'glint' },
        { x: 46, y: 18, w: 3, cls: 'sc-twinkle', d: 2.2, dl: -0.6, svg: 'glint' },
        { x: 80, y: 30, w: 4, cls: 'sc-twinkle', d: 1.6, dl: -1, svg: 'glint' },
        { x: 10, y: 34, w: 3, cls: 'sc-twinkle', d: 2.6, dl: -1.4, svg: 'glint' },
        { x: 62, y: 44, w: 3.5, cls: 'sc-twinkle', d: 2, dl: -0.3, svg: 'glint' },
        { x: 30, y: 4, w: 16, cls: 'sc-shoot', d: 7, svg: 'shoot' }
      ] },
    // 1.9.219 South Island scenes for levels 11-15.
    { n: 11, id: 'kaikoura', place: 'Kaikōura', title: 'Whales off Kaikōura', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#6cc6ff'], [0.6, '#bfe8ff'], [1, '#f2fbff']]) + scGrad('se', [[0, '#2fa4dc'], [1, '#14699e']]) + scGrad('mt', [[0, '#8b9cc8'], [1, '#6a7cae']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(300, 90, 1, 0.85) + scCloud(70, 160, 0.7, 0.75) +
          '<path d="M0 560 L40 470 L80 520 L130 420 L178 500 L220 440 L262 506 L310 430 L356 500 L390 470 L390 600 L0 600 Z" fill="url(#mt)"/>' +
          '<path d="M112 450 L130 420 L150 452 L138 446 L130 456 L120 446 Z M292 460 L310 430 L330 462 L318 456 L310 466 L300 456 Z M206 462 L220 440 L236 464 L226 460 L220 468 Z" fill="#fff"/>' +
          '<path d="M0 590 C80 566 160 580 240 572 C300 566 350 572 390 578 L390 620 L0 620 Z" fill="#5c9f6c"/>' +
          '<rect y="612" width="390" height="232" fill="url(#se)"/>' +
          '<path d="M20 650 q16 -6 32 0 M150 680 q16 -6 32 0 M290 660 q16 -6 32 0 M70 730 q16 -6 32 0 M240 760 q16 -6 32 0 M30 800 q16 -6 32 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".55"/>' +
          '<path d="M300 844 C304 800 320 778 350 772 C374 768 390 776 390 790 L390 844 Z" fill="#6b6b78"/><path d="M318 790 C330 778 352 776 370 782" stroke="#8a8a96" stroke-width="4" fill="none"/>' +
          '<ellipse cx="352" cy="772" rx="18" ry="8" fill="#5a4a40"/><circle cx="366" cy="766" r="6" fill="#5a4a40"/><circle cx="369" cy="764" r="1.4" fill="#111"/>';
      },
      sprites: [
        { x: 30, y: 74, w: 22, cls: 'sc-bob', d: 2.8, svg: 'whale' },
        { x: 34, y: 70, w: 12, cls: 'sc-rise', d: 3.6, puff: 1 },
        { x: 37, y: 71, w: 9, cls: 'sc-rise', d: 4.2, dl: -1.8, puff: 1 },
        { x: 70, y: 80, w: 10, cls: 'sc-bob', d: 3.4, dl: -1, svg: 'boat' },
        { x: 50, y: 14, w: 8, cls: 'sc-drift', d: 9, svg: 'gull' },
        { x: 8, y: 6, w: 26, cls: 'sc-drift', d: 22, svg: 'cloud' }
      ] },
    { n: 12, id: 'christchurch', place: 'Christchurch', title: 'The Garden City', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#8fd6ff'], [0.6, '#dff4ff'], [1, '#fff4e6']]) + scGrad('rv', [[0, '#6cc4e8'], [1, '#3b9ccc']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(90, 90, 1) + scCloud(290, 140, 0.8, 0.85) +
          '<rect x="210" y="470" width="150" height="150" fill="#cfc4ae"/><path d="M200 474 L285 420 L370 474 Z" fill="#7d8a9a"/>' +
          '<rect x="262" y="380" width="46" height="100" fill="#d8ccb4"/><path d="M256 384 L285 330 L314 384 Z" fill="#7d8a9a"/>' +
          [228, 254, 316, 342].map(function (x) { return '<path d="M' + x + ' 560 V520 a8 8 0 0 1 16 0 V560 Z" fill="#7ec8ef" opacity=".8"/>'; }).join('') +
          '<path d="M276 420 a9 9 0 0 1 18 0 V440 H276 Z" fill="#7ec8ef"/><circle cx="285" cy="406" r="7" fill="#fff6c8"/>' +
          '<path d="M0 600 C80 580 160 594 240 586 C300 580 350 584 390 590 L390 844 L0 844 Z" fill="#8fd27a"/>' +
          '<rect y="606" width="390" height="10" fill="#9a8a7a"/><path d="M0 610 H390" stroke="#6b5a4a" stroke-width="2"/>' +
          '<path d="M-10 700 C70 680 140 720 220 702 C300 684 340 716 400 704 L400 750 C340 762 300 730 220 748 C140 766 70 726 -10 746 Z" fill="url(#rv)"/>' +
          '<path d="M40 720 q12 -4 24 0 M200 718 q12 -4 24 0 M320 714 q12 -4 24 0" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/>' +
          '<path d="M0 770 C100 756 200 780 300 766 C340 760 370 762 390 764 L390 844 L0 844 Z" fill="#6cbf5e"/>' +
          [[30, 640], [120, 650], [350, 646]].map(function (p) { return '<rect x="' + (p[0] - 3) + '" y="' + p[1] + '" width="6" height="40" fill="#7a4a2a"/><circle cx="' + p[0] + '" cy="' + (p[1] - 6) + '" r="22" fill="#ffb3d3"/><circle cx="' + (p[0] - 12) + '" cy="' + (p[1] + 4) + '" r="14" fill="#ff9ac6"/><circle cx="' + (p[0] + 12) + '" cy="' + (p[1] + 2) + '" r="15" fill="#ffc8e0"/>'; }).join('') +
          [0, 1].map(function (row) { return [24, 52, 80, 108, 280, 308, 336, 364].map(function (x, i) { const cols = ['#ff6fa8', '#ffd43b', '#c77dff', '#ff8c2a']; return '<circle cx="' + x + '" cy="' + (800 + row * 20) + '" r="6" fill="' + cols[(i + row) % 4] + '"/><circle cx="' + x + '" cy="' + (800 + row * 20) + '" r="2" fill="#fff6c8"/>'; }).join(''); }).join('');
      },
      sprites: [
        { x: 30, y: 67, w: 30, cls: 'sc-roll', d: 9, svg: 'tram' },
        { x: 40, y: 82, w: 14, cls: 'sc-bob', d: 3, svg: 'punt' },
        { x: 10, y: 30, w: 6, cls: 'sc-float', d: 7, emoji: '🌸' },
        { x: 70, y: 40, w: 5, cls: 'sc-float', d: 8.5, dl: -3, emoji: '🌸' },
        { x: 45, y: 12, w: 24, cls: 'sc-drift', d: 22, svg: 'cloud' }
      ] },
    { n: 13, id: 'franzjosef', place: 'Franz Josef', title: 'Franz Josef Glacier', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#7cc8f6'], [1, '#e8f7ff']]) + scGrad('gl', [[0, '#ffffff'], [0.6, '#cdeeff'], [1, '#9fd8f4']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(320, 80, 0.9, 0.85) + scCloud(60, 120, 0.8, 0.8) +
          '<path d="M0 520 L60 340 L120 450 L170 300 L200 360 L230 290 L290 440 L340 330 L390 420 L390 700 L0 700 Z" fill="#5d6a86"/>' +
          '<path d="M44 386 L60 340 L78 380 L66 372 L58 384 Z M150 344 L170 300 L190 340 L178 334 L170 346 Z M212 330 L230 290 L250 336 L238 328 L230 340 Z M324 370 L340 330 L358 366 L346 360 L338 372 Z" fill="#fff"/>' +
          '<path d="M160 360 C176 420 150 480 170 540 C186 600 160 660 150 720 L250 720 C236 660 220 600 232 540 C246 470 230 410 240 352 C220 340 180 344 160 360 Z" fill="url(#gl)"/>' +
          '<path d="M178 420 l14 6 M200 470 l18 4 M184 530 l16 6 M206 600 l14 4 M176 660 l18 6" stroke="#8fcbea" stroke-width="3" stroke-linecap="round"/>' +
          '<path d="M0 640 C40 610 80 630 120 650 L130 844 L0 844 Z M390 640 C350 610 300 628 270 650 L260 844 L390 844 Z" fill="#2f6e46"/>' +
          '<path d="M120 720 C160 740 230 740 270 720 L280 844 L110 844 Z" fill="#a7a49a"/><path d="M150 760 C180 770 210 770 240 760" stroke="#7ec8ef" stroke-width="8" fill="none" stroke-linecap="round"/>' +
          [[34, 760], [86, 790], [312, 770], [360, 800]].map(function (p) { const x = p[0], y = p[1]; return '<rect x="' + (x - 3) + '" y="' + y + '" width="6" height="' + (844 - y) + '" fill="#4a3424"/>' +
            [-80, -45, -10, 25, 60, 95].map(function (a) { const r = a * Math.PI / 180; return '<path d="M' + x + ' ' + y + ' Q' + (x + Math.sin(r) * 26) + ' ' + (y - 30) + ' ' + (x + Math.sin(r) * 50) + ' ' + (y - Math.cos(r) * 22) + '" stroke="#3f9a5a" stroke-width="6" fill="none" stroke-linecap="round"/>'; }).join(''); }).join('');
      },
      sprites: [
        { x: 60, y: 22, w: 16, cls: 'sc-drift', d: 10, svg: 'heli' },
        { x: 46, y: 50, w: 4, cls: 'sc-twinkle', d: 1.8, svg: 'glint' },
        { x: 54, y: 62, w: 3.5, cls: 'sc-twinkle', d: 2.3, dl: -0.8, svg: 'glint' },
        { x: 42, y: 74, w: 3, cls: 'sc-twinkle', d: 2, dl: -1.3, svg: 'glint' },
        { x: 12, y: 80, w: 7, cls: 'sc-bob', d: 2.4, emoji: '🦜' },
        { x: 6, y: 10, w: 24, cls: 'sc-drift', d: 24, svg: 'cloud' }
      ] },
    { n: 14, id: 'queenstown', place: 'Queenstown', title: 'Lake Wakatipu and the Remarkables', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#7a7ef0'], [0.5, '#ff9fc6'], [1, '#ffd6a6']]) + scGrad('lk', [[0, '#4c9fd6'], [1, '#2a6fa8']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(80, 110, 0.9, 0.6) +
          '<circle cx="300" cy="200" r="34" fill="#fff1b8" opacity=".85"/>' +
          '<path d="M0 600 L40 520 L70 552 L110 470 L150 540 L190 480 L230 556 L270 486 L310 540 L350 470 L390 530 L390 620 L0 620 Z" fill="#7d6aa8"/>' +
          '<path d="M96 496 L110 470 L124 498 L114 494 L110 502 Z M176 506 L190 480 L204 508 L194 504 L190 512 Z M256 512 L270 486 L284 514 L274 508 L270 516 Z M336 496 L350 470 L364 498 L354 494 L350 502 Z" fill="#fff"/>' +
          '<rect y="612" width="390" height="120" fill="url(#lk)"/>' +
          '<path d="M30 640 q14 -5 28 0 M200 660 q14 -5 28 0 M310 646 q14 -5 28 0 M110 700 q14 -5 28 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6"/>' +
          '<path d="M0 520 C40 520 60 600 90 640 L90 844 L0 844 Z" fill="#3f7a52"/>' +
          '<path d="M20 600 L380 470" stroke="#4a3a4a" stroke-width="2.5"/><path d="M20 610 L380 480" stroke="#4a3a4a" stroke-width="1.5" opacity=".7"/>' +
          '<rect x="0" y="726" width="390" height="118" fill="#8fc86f"/>' +
          scHouses([120, 150, 186, 222, 260, 296, 334], 760, ['#fff', '#ffe066', '#ffb3d3', '#7ec8ef', '#c8f0e0']) +
          '<path d="M0 790 C100 778 200 798 300 784 C340 778 370 780 390 782 L390 844 L0 844 Z" fill="#6cb85a"/>' +
          scPine(30, 760, 80) + scPine(60, 790, 70) + scPine(366, 800, 74);
      },
      sprites: [
        { x: 30, y: 66, w: 9, cls: 'sc-glide', d: 7, svg: 'gondola' },
        { x: 58, y: 80, w: 22, cls: 'sc-bob', d: 3.4, svg: 'steamer' },
        { x: 66, y: 74, w: 10, cls: 'sc-rise', d: 3.8, puff: 1 },
        { x: 68, y: 75, w: 8, cls: 'sc-rise', d: 4.4, dl: -2, puff: 1 },
        { x: 40, y: 10, w: 24, cls: 'sc-drift', d: 24, svg: 'cloud' }
      ] },
    { n: 15, id: 'dunedin', place: 'Dunedin', title: 'The Chocolate Factory, Dunedin', night: true,
      art: function () {
        let stars = '';
        for (let i = 0; i < 36; i++) { const x = (i * 97) % 390, y = (i * 131) % 460, r = (i % 4 === 0) ? 1.7 : 1; stars += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff" opacity="' + (0.45 + (i % 3) * 0.2) + '"/>'; }
        return '<defs>' + scGrad('sk', [[0, '#1d1650'], [0.55, '#5a3a8a'], [1, '#e08aa8']]) + scGrad('ch', [[0, '#8a4a2a'], [1, '#4a2414']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + stars +
          '<circle cx="80" cy="120" r="28" fill="#fff4c2"/><circle cx="92" cy="112" r="24" fill="#2a1f5e"/>' +
          '<path d="M0 600 C70 570 150 576 210 590 C270 566 340 568 390 580 L390 700 L0 700 Z" fill="#3a2a5a"/>' +
          '<rect x="210" y="520" width="150" height="180" fill="#8a5a3a"/><rect x="230" y="440" width="22" height="90" fill="#6b3a1f"/><rect x="300" y="460" width="20" height="70" fill="#6b3a1f"/>' +
          '<rect x="226" y="436" width="30" height="10" fill="#4a2414"/><rect x="296" y="456" width="28" height="10" fill="#4a2414"/>' +
          [0, 1, 2].map(function (row) { return [224, 256, 288, 320].map(function (x) { return '<rect x="' + x + '" y="' + (546 + row * 44) + '" width="20" height="24" rx="3" fill="#ffd27a" opacity=".9"/>'; }).join(''); }).join('') +
          '<rect x="232" y="500" width="106" height="20" rx="6" fill="#ffd43b"/><text x="285" y="514" text-anchor="middle" font-size="10" font-weight="900" fill="#6b3a1f" font-family="ui-rounded,system-ui,sans-serif">CHOCOLATE</text>' +
          '<rect x="20" y="560" width="150" height="140" fill="#f2e6d0"/><rect x="20" y="560" width="150" height="10" fill="#7a3a3a"/>' +
          '<rect x="80" y="480" width="30" height="90" fill="#f2e6d0"/><path d="M74 484 L95 444 L116 484 Z" fill="#7a3a3a"/><circle cx="95" cy="506" r="9" fill="#fff8d6" stroke="#7a3a3a" stroke-width="2"/>' +
          [34, 62, 120, 148].map(function (x) { return '<path d="M' + x + ' 640 V600 a8 8 0 0 1 16 0 V640 Z" fill="#ffd27a" opacity=".9"/>'; }).join('') +
          '<path d="M0 700 C80 690 160 712 250 698 C310 690 360 694 390 696 L390 760 L0 760 Z" fill="url(#ch)"/>' +
          '<path d="M30 720 q16 -6 32 0 M170 728 q16 -6 32 0 M300 716 q16 -6 32 0" stroke="#c0825a" stroke-width="3" fill="none" opacity=".7"/>' +
          '<rect y="760" width="390" height="10" fill="#7a6a5a"/><path d="M0 782 H390 M0 798 H390" stroke="#4a3a2a" stroke-width="3"/>' +
          [0, 26, 52, 78, 104, 130, 156, 182, 208, 234, 260, 286, 312, 338, 364].map(function (x) { return '<rect x="' + (x + 6) + '" y="776" width="8" height="28" fill="#6a4a3a"/>'; }).join('') +
          '<rect y="804" width="390" height="40" fill="#2a2240"/>';
      },
      sprites: [
        { x: 57, y: 47, w: 12, cls: 'sc-rise', d: 4, puff: 1 },
        { x: 75, y: 50, w: 10, cls: 'sc-rise', d: 4.6, dl: -1.8, puff: 1 },
        { x: 4, y: 88, w: 26, cls: 'sc-roll', d: 8, svg: 'train' },
        { x: 30, y: 60, w: 6, cls: 'sc-float', d: 6, emoji: '🎫' },
        { x: 20, y: 8, w: 4, cls: 'sc-twinkle', d: 1.8, svg: 'glint' },
        { x: 66, y: 22, w: 3.5, cls: 'sc-twinkle', d: 2.2, dl: -0.7, svg: 'glint' },
        { x: 46, y: 4, w: 16, cls: 'sc-shoot', d: 8, svg: 'shoot' }
      ] },
    // 1.9.222 Bluff: the famous signpost, oyster boats and shells on the shore.
    { n: 16, id: 'bluff', place: 'Bluff', title: 'Stirling Point, Bluff', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#8cc4e8'], [0.6, '#d4ecf8'], [1, '#f4f8fb']]) + scGrad('se', [[0, '#3f88b8'], [1, '#235f8a']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(80, 90, 1.1, 0.95) + scCloud(280, 130, 1, 0.9) + scCloud(190, 60, 0.7, 0.8) +
          '<path d="M0 560 C80 520 160 530 220 556 C280 530 340 532 390 548 L390 600 L0 600 Z" fill="#6a9a74"/>' +
          '<rect y="596" width="390" height="150" fill="url(#se)"/>' +
          '<path d="M20 630 q14 -5 28 0 M160 660 q14 -5 28 0 M300 640 q14 -5 28 0 M90 700 q14 -5 28 0 M240 716 q14 -5 28 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".55"/>' +
          '<path d="M0 740 C90 724 190 750 290 734 C340 728 370 732 390 734 L390 844 L0 844 Z" fill="#9a9488"/>' +
          '<path d="M0 768 C100 754 200 778 300 762 C350 756 375 758 390 760 L390 844 L0 844 Z" fill="#c9bfa8"/>' +
          // the signpost
          '<rect x="186" y="560" width="10" height="210" fill="#e8e2d4" stroke="#8a8478" stroke-width="2"/><circle cx="191" cy="556" r="8" fill="#e0333a"/>' +
          [[600, 1, 'SYDNEY'], [624, -1, 'LONDON'], [648, 1, 'EQUATOR'], [672, -1, 'TOKYO'], [696, 1, 'SOUTH POLE']].map(function (q) {
            const y = q[0], d = q[1], x0 = d > 0 ? 196 : 186, w = 84, x1 = x0 + d * w;
            return '<path d="M' + x0 + ' ' + y + ' H' + (x1 - d * 8) + ' L' + x1 + ' ' + (y + 8) + ' L' + (x1 - d * 8) + ' ' + (y + 16) + ' H' + x0 + ' Z" fill="#fff6e6" stroke="#c94f3c" stroke-width="2"/>' +
              '<text x="' + (x0 + d * (w / 2 - 2)) + '" y="' + (y + 12) + '" text-anchor="middle" font-size="8" font-weight="900" fill="#c94f3c" font-family="ui-rounded,system-ui,sans-serif">' + q[2] + '</text>';
          }).join('') +
          // oysters on the shore
          [[50, 800], [92, 812], [300, 806], [340, 818], [130, 826]].map(function (o) { return '<ellipse cx="' + o[0] + '" cy="' + o[1] + '" rx="16" ry="9" fill="#8a8a8a"/><ellipse cx="' + o[0] + '" cy="' + (o[1] - 2) + '" rx="12" ry="6" fill="#f2ece4"/><circle cx="' + (o[0] + 2) + '" cy="' + (o[1] - 2) + '" r="3" fill="#fff" opacity=".9"/>'; }).join('');
      },
      sprites: [
        { x: 62, y: 76, w: 18, cls: 'sc-bob', d: 3.2, svg: 'oysterboat' },
        { x: 10, y: 80, w: 9, cls: 'sc-bob', d: 3.8, dl: -1.2, svg: 'boat' },
        { x: 40, y: 14, w: 8, cls: 'sc-drift', d: 9, svg: 'gull' },
        { x: 70, y: 22, w: 7, cls: 'sc-drift', d: 11, dl: -4, svg: 'gull' },
        { x: 6, y: 6, w: 28, cls: 'sc-drift', d: 22, svg: 'cloud' }
      ] },
    // 1.9.220 Pacific Islands scenes: lagoons, palms and reefs.
    { n: 17, id: 'rarotonga', place: 'Rarotonga', title: 'Muri Lagoon, Rarotonga', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#4fc3ff'], [0.6, '#aee9ff'], [1, '#fff6d8']]) + scGrad('lg', [[0, '#5fe0d6'], [1, '#22b3c9']]) + scGrad('oc', [[0, '#1f7fc4'], [1, '#14619e']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(300, 100, 1, 0.9) + scCloud(80, 170, 0.7, 0.8) +
          '<circle cx="80" cy="96" r="62" fill="#fff6c2" opacity=".45"/><circle cx="80" cy="96" r="34" fill="#fff3a0"/>' +
          '<path d="M0 560 C40 440 110 400 170 470 C200 420 250 390 300 450 C340 420 370 440 390 470 L390 600 L0 600 Z" fill="#2f8a52"/>' +
          '<path d="M150 470 C176 430 196 420 214 452 C200 446 184 450 170 470 Z" fill="#256e42"/>' +
          '<rect y="590" width="390" height="40" fill="url(#oc)"/>' +
          '<path d="M0 626 C60 616 120 634 190 624 C260 614 330 630 390 622" stroke="#fff" stroke-width="7" fill="none" opacity=".85" stroke-dasharray="14 8"/>' +
          '<rect y="628" width="390" height="130" fill="url(#lg)"/>' +
          '<path d="M30 660 q14 -5 28 0 M170 690 q14 -5 28 0 M290 670 q14 -5 28 0 M90 720 q14 -5 28 0 M250 736 q14 -5 28 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6"/>' +
          '<ellipse cx="300" cy="650" rx="44" ry="10" fill="#f6e2a8"/><path d="M300 648 V620" stroke="#7a4a2a" stroke-width="3"/>' +
          '<path d="M0 752 C90 738 190 760 290 744 C340 738 370 742 390 744 L390 844 L0 844 Z" fill="#f6dfa0"/>' +
          '<path d="M0 772 C90 760 200 782 300 768 C350 762 375 764 390 766 L390 844 L0 844 Z" fill="#ffecb8"/>' +
          [[60, 800, '#ff6fa8'], [330, 812, '#ff8a5c']].map(function (f) { return '<circle cx="' + f[0] + '" cy="' + f[1] + '" r="9" fill="' + f[2] + '"/><circle cx="' + f[0] + '" cy="' + f[1] + '" r="3" fill="#fff3a0"/>'; }).join('') +
          '<ellipse cx="210" cy="818" rx="10" ry="6" fill="#fff4e6"/>';
      },
      sprites: [
        { x: 2, y: 66, w: 26, cls: 'sc-sway', d: 3.6, svg: 'palm' },
        { x: 76, y: 70, w: 22, cls: 'sc-sway', d: 4.2, dl: -1.4, svg: 'palm' },
        { x: 40, y: 78, w: 16, cls: 'sc-bob', d: 3, svg: 'vaka' },
        { x: 22, y: 84, w: 7, cls: 'sc-drift', d: 8, svg: 'fish' },
        { x: 60, y: 86, w: 6, cls: 'sc-drift', d: 10, dl: -3, svg: 'fish' },
        { x: 50, y: 12, w: 24, cls: 'sc-drift', d: 22, svg: 'cloud' },
        { x: 14, y: 40, w: 6, cls: 'sc-float', d: 7, emoji: '🌺' }
      ] },
    { n: 18, id: 'tonga', place: 'Tonga', title: 'Coconut coast, Tongatapu', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#62cfff'], [0.6, '#c6f1ff'], [1, '#fff3d6']]) + scGrad('lg', [[0, '#3fd0d8'], [1, '#1592b8']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(90, 90, 1) + scCloud(280, 150, 0.8, 0.85) +
          '<rect y="560" width="390" height="190" fill="url(#lg)"/>' +
          '<path d="M0 600 C70 590 140 606 210 596 C280 586 340 600 390 594" stroke="#bff5ec" stroke-width="5" fill="none" opacity=".8"/>' +
          '<path d="M20 640 q14 -5 28 0 M160 660 q14 -5 28 0 M300 640 q14 -5 28 0 M80 700 q14 -5 28 0 M230 712 q14 -5 28 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6"/>' +
          // blowholes along the reef
          '<path d="M250 600 C246 570 252 540 258 520 C264 540 270 570 266 600 Z" fill="#fff" opacity=".85"/><path d="M110 606 C108 590 112 574 116 564 C120 574 124 590 122 606 Z" fill="#fff" opacity=".75"/>' +
          '<path d="M0 600 L60 606 L120 604 L180 610 L250 604 L320 608 L390 602 L390 616 L0 616 Z" fill="#8a7a6a"/>' +
          '<path d="M0 740 C90 726 190 748 290 732 C340 726 370 730 390 732 L390 844 L0 844 Z" fill="#f4d998"/>' +
          '<path d="M0 768 C100 754 200 778 300 762 C350 756 375 758 390 760 L390 844 L0 844 Z" fill="#ffe8b0"/>' +
          [[70, 790], [96, 800], [82, 812]].map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="11" fill="#7a4a24"/><circle cx="' + (c[0] - 3) + '" cy="' + (c[1] - 3) + '" r="2" fill="#2e1a0c"/>'; }).join('') +
          '<rect x="250" y="770" width="80" height="44" rx="4" fill="#c98a4a"/><path d="M240 772 L290 744 L340 772 Z" fill="#8a5a2a"/><rect x="282" y="788" width="16" height="26" fill="#6b3a1f"/>';
      },
      sprites: [
        { x: 0, y: 62, w: 28, cls: 'sc-sway', d: 4, svg: 'palm' },
        { x: 18, y: 66, w: 20, cls: 'sc-sway', d: 3.4, dl: -1, svg: 'palm' },
        { x: 80, y: 64, w: 24, cls: 'sc-sway', d: 4.6, dl: -2, svg: 'palm' },
        { x: 60, y: 62, w: 10, cls: 'sc-rise', d: 3.2, puff: 1 },
        { x: 44, y: 78, w: 10, cls: 'sc-drift', d: 12, svg: 'turtle' },
        { x: 10, y: 14, w: 8, cls: 'sc-drift', d: 9, svg: 'gull' },
        { x: 46, y: 8, w: 24, cls: 'sc-drift', d: 24, svg: 'cloud' }
      ] },
    { n: 19, id: 'samoa', place: 'Samoa', title: 'Sunset over Samoa', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#5a4ab8'], [0.45, '#ff7aa8'], [0.75, '#ffb35c'], [1, '#ffe39a']]) + scGrad('se', [[0, '#ff9a6a'], [0.4, '#c25a8a'], [1, '#3a3a8a']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' +
          '<circle cx="195" cy="560" r="80" fill="#ffe08a" opacity=".5"/><circle cx="195" cy="560" r="52" fill="#fff0a0"/>' +
          '<path d="M0 560 C40 520 90 510 130 540 L150 580 L0 580 Z" fill="#3a2a5a"/><path d="M250 570 C290 520 340 516 390 540 L390 580 L240 580 Z" fill="#3a2a5a"/>' +
          '<rect y="576" width="390" height="190" fill="url(#se)"/>' +
          '<path d="M150 600 h90 M160 626 h70 M172 652 h46 M182 678 h26" stroke="#fff3a0" stroke-width="4" opacity=".6" stroke-linecap="round"/>' +
          '<path d="M20 700 q14 -5 28 0 M300 690 q14 -5 28 0 M90 740 q14 -5 28 0 M260 736 q14 -5 28 0" stroke="#fff" stroke-width="2" fill="none" opacity=".45"/>' +
          '<path d="M0 760 C90 746 190 768 290 752 C340 746 370 750 390 752 L390 844 L0 844 Z" fill="#e8b878"/>' +
          '<path d="M0 786 C100 774 200 796 300 782 C350 776 375 778 390 780 L390 844 L0 844 Z" fill="#f4cc8a"/>' +
          // a fale on the beach
          '<rect x="276" y="756" width="70" height="40" fill="none"/><path d="M262 762 Q311 714 360 762 Z" fill="#8a5a2a"/>' + [272, 292, 312, 332, 350].map(function (x) { return '<rect x="' + x + '" y="760" width="4" height="40" fill="#6b3a1f"/>'; }).join('') +
          '<path d="M60 830 c4 -10 18 -10 22 0 Z" fill="#ffd0e4"/><path d="M200 826 c3 -8 14 -8 17 0 Z" fill="#fff4e6"/>';
      },
      sprites: [
        { x: 4, y: 68, w: 26, cls: 'sc-sway', d: 4, svg: 'palmdusk' },
        { x: 40, y: 72, w: 16, cls: 'sc-bob', d: 3.4, svg: 'vaka' },
        { x: 30, y: 10, w: 4, cls: 'sc-twinkle', d: 1.8, svg: 'glint' },
        { x: 72, y: 16, w: 3.5, cls: 'sc-twinkle', d: 2.2, dl: -0.7, svg: 'glint' },
        { x: 56, y: 24, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' },
        { x: 80, y: 44, w: 6, cls: 'sc-float', d: 7, emoji: '🌺' }
      ] },
    // 1.9.222 Australia scenes.
    { n: 20, id: 'sydney', place: 'Sydney', title: 'Sydney Harbour', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#5aa8f0'], [0.6, '#bfe2ff'], [1, '#fff0e0']]) + scGrad('se', [[0, '#2f8fd0'], [1, '#1a5f9e']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(300, 80, 0.9, 0.85) + scCloud(70, 130, 0.8, 0.8) +
          [[0, 520, 34, 80], [36, 500, 26, 100], [66, 530, 40, 70], [300, 510, 30, 90], [334, 530, 56, 70]].map(function (b) { return '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" fill="#9fb2d8"/>'; }).join('') +
          '<rect y="596" width="390" height="170" fill="url(#se)"/>' +
          // the Harbour Bridge
          '<path d="M30 600 Q195 410 360 600" stroke="#6b7a8c" stroke-width="12" fill="none"/><path d="M30 600 Q195 440 360 600" stroke="#6b7a8c" stroke-width="5" fill="none"/>' +
          '<path d="M10 600 H380" stroke="#5a6878" stroke-width="8"/>' +
          [70, 110, 150, 195, 240, 280, 320].map(function (x) { const y = 600 - (1 - Math.pow((x - 195) / 165, 2)) * 150; return '<path d="M' + x + ' 600 V' + y.toFixed(0) + '" stroke="#6b7a8c" stroke-width="3"/>'; }).join('') +
          '<rect x="14" y="560" width="22" height="44" fill="#c9b89a"/><rect x="354" y="560" width="22" height="44" fill="#c9b89a"/>' +
          // the Opera House sails
          '<rect x="200" y="700" width="170" height="20" fill="#e8dcc4"/>' +
          [[214, 700, 40], [244, 700, 52], [282, 700, 46], [316, 700, 36], [340, 700, 28]].map(function (q) { return '<path d="M' + q[0] + ' ' + q[1] + ' Q' + (q[0] + q[2] * 0.15) + ' ' + (q[1] - q[2] * 1.4) + ' ' + (q[0] + q[2]) + ' ' + (q[1] - q[2] * 1.1) + ' Q' + (q[0] + q[2] * 0.8) + ' ' + (q[1] - q[2] * 0.4) + ' ' + (q[0] + q[2] * 0.6) + ' ' + q[1] + ' Z" fill="#fbfaf4" stroke="#d8d0c0" stroke-width="2"/>'; }).join('') +
          '<path d="M30 650 q14 -5 28 0 M120 690 q14 -5 28 0 M60 730 q14 -5 28 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6"/>' +
          '<path d="M0 760 C100 750 200 770 300 756 C340 750 370 752 390 754 L390 844 L0 844 Z" fill="#7cc463"/>' +
          scPine(40, 800, 60) + scPine(350, 806, 56);
      },
      sprites: [
        { x: 10, y: 80, w: 16, cls: 'sc-roll', d: 10, svg: 'ferry' },
        { x: 46, y: 50, w: 5, cls: 'sc-twinkle', d: 1.8, svg: 'glint' },
        { x: 80, y: 78, w: 4, cls: 'sc-twinkle', d: 2.2, dl: -0.6, svg: 'glint' },
        { x: 30, y: 16, w: 8, cls: 'sc-drift', d: 9, svg: 'gull' },
        { x: 50, y: 6, w: 26, cls: 'sc-drift', d: 22, svg: 'cloud' }
      ] },
    { n: 21, id: 'goldcoast', place: 'Gold Coast', title: 'Surfers Paradise, Gold Coast', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#3fb4ff'], [0.6, '#b4e6ff'], [1, '#fff4d6']]) + scGrad('se', [[0, '#22b8d8'], [1, '#1580b4']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(80, 90, 0.9, 0.85) +
          '<circle cx="320" cy="110" r="38" fill="#fff3a0"/>' +
          [[20, 380, 30, 260], [56, 320, 26, 320], [88, 420, 36, 220], [130, 300, 30, 340], [166, 360, 40, 280], [212, 280, 26, 360], [244, 400, 34, 240], [284, 340, 30, 300], [320, 430, 40, 210], [356, 380, 30, 260]].map(function (b, i) {
            let w = '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" fill="' + (i % 2 ? '#e8f0fa' : '#cfdcef') + '"/>';
            for (let yy = b[1] + 10; yy < b[1] + b[3] - 8; yy += 16) w += '<rect x="' + (b[0] + 4) + '" y="' + yy + '" width="' + (b[2] - 8) + '" height="4" fill="#7ec8ef" opacity=".7"/>';
            return w;
          }).join('') +
          '<rect y="640" width="390" height="40" fill="#f6e2a8"/>' +
          '<rect y="676" width="390" height="100" fill="url(#se)"/>' +
          '<path d="M0 690 C40 680 80 700 120 690 C160 680 200 700 240 690 C280 680 320 700 390 688" stroke="#fff" stroke-width="6" fill="none" opacity=".9"/>' +
          '<path d="M0 726 C50 716 100 736 150 726 C200 716 250 736 300 726 C340 718 370 724 390 722" stroke="#fff" stroke-width="4" fill="none" opacity=".7"/>' +
          '<path d="M0 770 C90 758 190 780 290 764 C340 758 370 762 390 764 L390 844 L0 844 Z" fill="#f4d998"/>' +
          '<path d="M0 794 C100 782 200 804 300 790 C350 784 375 786 390 788 L390 844 L0 844 Z" fill="#ffe8b0"/>' +
          [[70, 812, '#ff6fa8'], [250, 820, '#ffd43b']].map(function (u) { return '<path d="M' + u[0] + ' ' + u[1] + ' a26 14 0 0 1 52 0 Z" fill="' + u[2] + '"/><path d="M' + (u[0] + 26) + ' ' + u[1] + ' v24" stroke="#7a4a2a" stroke-width="3"/>'; }).join('');
      },
      sprites: [
        { x: 0, y: 80, w: 40, cls: 'sc-roll', d: 6, svg: 'wave' },
        { x: 50, y: 84, w: 36, cls: 'sc-roll', d: 7.5, dl: -2, svg: 'wave' },
        { x: 60, y: 30, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' },
        { x: 20, y: 6, w: 26, cls: 'sc-drift', d: 22, svg: 'cloud' }
      ] },
    { n: 22, id: 'perth', place: 'Perth', title: 'Swan River sunset, Perth', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#3a2f7a'], [0.4, '#ff6f91'], [0.7, '#ffa45c'], [1, '#ffe08a']]) + scGrad('rv', [[0, '#ff9a6a'], [0.5, '#b0507a'], [1, '#3a3a7a']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' +
          '<circle cx="110" cy="540" r="70" fill="#ffe08a" opacity=".5"/><circle cx="110" cy="540" r="44" fill="#fff0a0"/>' +
          [[180, 470, 26, 130], [210, 420, 30, 180], [244, 450, 24, 150], [272, 400, 34, 200], [310, 460, 28, 140], [342, 490, 40, 110]].map(function (b) { return '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" fill="#3a2a5a"/>'; }).join('') +
          '<path d="M286 400 V370" stroke="#3a2a5a" stroke-width="3"/>' +
          '<path d="M0 590 C80 580 160 594 240 586 C300 580 350 586 390 590 L390 604 L0 604 Z" fill="#3a2a5a"/>' +
          '<rect y="600" width="390" height="170" fill="url(#rv)"/>' +
          '<path d="M80 620 h60 M86 646 h48 M94 672 h32 M100 698 h20" stroke="#fff3a0" stroke-width="4" opacity=".6" stroke-linecap="round"/>' +
          '<path d="M200 650 q14 -5 28 0 M300 690 q14 -5 28 0 M40 730 q14 -5 28 0" stroke="#fff" stroke-width="2" fill="none" opacity=".45"/>' +
          '<path d="M0 766 C90 752 190 774 290 758 C340 752 370 756 390 758 L390 844 L0 844 Z" fill="#5a8a4a"/>' +
          '<path d="M0 792 C100 780 200 802 300 788 C350 782 375 784 390 786 L390 844 L0 844 Z" fill="#4a7a3a"/>';
      },
      sprites: [
        { x: 50, y: 78, w: 12, cls: 'sc-bob', d: 3, svg: 'swan' },
        { x: 70, y: 82, w: 9, cls: 'sc-bob', d: 3.6, dl: -1.2, svg: 'swan' },
        { x: 20, y: 74, w: 14, cls: 'sc-bob', d: 3.4, dl: -0.6, svg: 'boat' },
        { x: 70, y: 10, w: 4, cls: 'sc-twinkle', d: 1.8, svg: 'glint' },
        { x: 40, y: 20, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' }
      ] }
  ];
  const SCENE_SPRITE_SVG = {
    cloud: '<svg viewBox="-40 -30 80 46"><ellipse cx="0" cy="0" rx="36" ry="13" fill="#fff"/><ellipse cx="-15" cy="-8" rx="16" ry="13" fill="#fff"/><ellipse cx="12" cy="-12" rx="20" ry="16" fill="#fff"/></svg>',
    boat: '<svg viewBox="0 0 40 40"><path d="M20 4 L20 28 L6 28 Z" fill="#fff"/><path d="M22 8 L22 28 L34 28 Z" fill="#ffd0e4"/><path d="M4 30 H36 L31 37 H9 Z" fill="#e0333a"/></svg>',
    ferry: '<svg viewBox="0 0 60 30"><path d="M2 18 H58 L52 28 H8 Z" fill="#fff"/><rect x="14" y="8" width="30" height="10" rx="2" fill="#fff"/><rect x="18" y="11" width="22" height="4" fill="#3d8bfd"/><rect x="26" y="2" width="6" height="7" fill="#e0333a"/></svg>',
    gull: '<svg viewBox="0 0 40 16"><path d="M2 12 Q11 2 20 11 Q29 2 38 12" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
    glint: '<svg viewBox="-10 -10 20 20"><path d="M0 -10 L2 -2 L10 0 L2 2 L0 10 L-2 2 L-10 0 L-2 -2 Z" fill="#fff8c0"/></svg>',
    balloon: '<svg viewBox="0 0 40 56"><ellipse cx="20" cy="18" rx="17" ry="18" fill="currentColor"/><path d="M8 10 Q20 -2 32 10 M5 20 Q20 30 35 20" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7"/><path d="M10 32 L16 44 M30 32 L24 44" stroke="#7a4a2a" stroke-width="1.5"/><rect x="15" y="44" width="10" height="8" rx="2" fill="#9a5b3a"/></svg>',
    train: '<svg viewBox="0 0 100 40"><rect x="40" y="10" width="34" height="20" rx="3" fill="#e0333a"/><rect x="62" y="2" width="14" height="28" rx="2" fill="#3d3d6b"/><rect x="65" y="6" width="8" height="8" fill="#fff6c8"/><rect x="44" y="4" width="8" height="8" fill="#3d3d6b"/><rect x="2" y="14" width="34" height="16" rx="3" fill="#3d8bfd"/><rect x="6" y="17" width="8" height="6" fill="#fff6c8"/><rect x="18" y="17" width="8" height="6" fill="#fff6c8"/><circle cx="10" cy="33" r="5" fill="#333"/><circle cx="28" cy="33" r="5" fill="#333"/><circle cx="50" cy="33" r="5" fill="#333"/><circle cx="66" cy="33" r="5" fill="#333"/><path d="M74 26 L84 32 H74 Z" fill="#ffd43b"/></svg>',
    sunburst: '<svg viewBox="-50 -50 100 100">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (i) { return '<path d="M0 0 L' + (Math.cos(i * Math.PI / 6 - 0.13) * 50).toFixed(1) + ' ' + (Math.sin(i * Math.PI / 6 - 0.13) * 50).toFixed(1) + ' L' + (Math.cos(i * Math.PI / 6 + 0.13) * 50).toFixed(1) + ' ' + (Math.sin(i * Math.PI / 6 + 0.13) * 50).toFixed(1) + ' Z" fill="#fff6c2" opacity=".35"/>'; }).join('') + '</svg>',
    blades: '<svg viewBox="-30 -30 60 60"><path d="M0 0 L-3 -28 L3 -28 Z M0 0 L25.7 12.4 L22.7 17.6 Z M0 0 L-22.7 17.6 L-25.7 12.4 Z" fill="#fff"/><circle r="3.5" fill="#ddd"/></svg>',
    shoot: '<svg viewBox="0 0 80 20"><path d="M2 2 L70 16" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/><circle cx="72" cy="16" r="3" fill="#fff"/></svg>',
    whale: '<svg viewBox="0 0 100 40"><path d="M6 30 C20 20 50 18 74 24 C82 26 88 30 92 34 L6 34 Z" fill="#3a4a66"/><path d="M60 22 C62 10 66 4 72 2 C70 10 74 14 80 12 C76 18 70 22 64 24 Z" fill="#2c3a52"/><circle cx="20" cy="28" r="1.6" fill="#fff"/><path d="M0 36 q10 -4 20 0 t20 0 t20 0 t20 0 t20 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".75"/></svg>',
    tram: '<svg viewBox="0 0 100 44"><path d="M40 2 L46 8 M60 2 L54 8" stroke="#333" stroke-width="1.6"/><rect x="6" y="8" width="88" height="28" rx="5" fill="#2f7a3e"/><rect x="6" y="8" width="88" height="7" rx="3" fill="#ffd43b"/><rect x="12" y="17" width="12" height="10" rx="2" fill="#fff6c8"/><rect x="28" y="17" width="12" height="10" rx="2" fill="#fff6c8"/><rect x="44" y="17" width="12" height="10" rx="2" fill="#fff6c8"/><rect x="60" y="17" width="12" height="10" rx="2" fill="#fff6c8"/><rect x="76" y="17" width="12" height="10" rx="2" fill="#fff6c8"/><circle cx="24" cy="38" r="5" fill="#333"/><circle cx="76" cy="38" r="5" fill="#333"/></svg>',
    punt: '<svg viewBox="0 0 60 40"><path d="M2 30 H58 L54 36 H6 Z" fill="#9a5b3a"/><rect x="20" y="20" width="10" height="10" rx="3" fill="#ff8ab8"/><circle cx="25" cy="16" r="4" fill="#f2c79a"/><path d="M44 30 L50 2" stroke="#7a4a2a" stroke-width="2"/><rect x="38" y="20" width="8" height="10" rx="2" fill="#fff"/><rect x="38" y="13" width="8" height="3" fill="#333"/><circle cx="42" cy="17" r="3" fill="#f2c79a"/></svg>',
    heli: '<svg viewBox="0 0 80 40"><path d="M10 6 H70" stroke="#333" stroke-width="2.5" stroke-linecap="round"/><rect x="38" y="6" width="3" height="6" fill="#333"/><ellipse cx="38" cy="20" rx="16" ry="9" fill="#e0333a"/><path d="M24 20 H4 L2 14" stroke="#e0333a" stroke-width="4" fill="none"/><path d="M46 16 a8 7 0 0 1 6 8 H44 Z" fill="#bfe9ff"/><path d="M28 32 H52 M32 29 V32 M48 29 V32" stroke="#333" stroke-width="2"/></svg>',
    gondola: '<svg viewBox="0 0 40 50"><path d="M20 0 V10" stroke="#4a3a4a" stroke-width="2"/><rect x="6" y="10" width="28" height="30" rx="6" fill="#e0333a"/><rect x="10" y="15" width="20" height="12" rx="3" fill="#bfe9ff"/><rect x="6" y="34" width="28" height="6" rx="3" fill="#b0262c"/></svg>',
    oysterboat: '<svg viewBox="0 0 80 40"><path d="M2 24 H78 L70 36 H10 Z" fill="#e0333a"/><rect x="40" y="10" width="22" height="14" fill="#fff"/><rect x="44" y="13" width="14" height="5" fill="#7ec8ef"/><path d="M20 24 V4 L34 24" stroke="#5a4a40" stroke-width="2" fill="none"/></svg>',
    wave: '<svg viewBox="0 0 120 40"><path d="M0 30 C20 30 24 8 46 8 C62 8 66 22 56 26 C66 30 80 20 90 30 C100 36 110 30 120 30 V40 H0 Z" fill="#fff" opacity=".9"/><path d="M0 34 C30 30 60 38 120 32" stroke="#bfefff" stroke-width="3" fill="none"/></svg>',
    swan: '<svg viewBox="0 0 60 40"><path d="M8 30 C10 20 30 18 44 24 C50 26 52 32 46 34 H12 Z" fill="#1c1c24"/><path d="M40 24 C34 14 36 4 44 4 C48 4 48 10 44 10 C40 12 42 18 46 22" stroke="#1c1c24" stroke-width="4" fill="none"/><path d="M46 6 L54 8 L46 10 Z" fill="#e0333a"/></svg>',
    palm: '<svg viewBox="0 0 80 120"><path d="M40 118 C42 90 44 60 40 34" stroke="#8a5a2a" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M40 34 C24 22 10 26 2 38 C16 32 28 34 40 36 Z M40 34 C56 22 70 26 78 38 C64 32 52 34 40 36 Z M40 34 C30 14 16 8 6 12 C20 16 30 24 40 36 Z M40 34 C50 14 64 8 74 12 C60 16 50 24 40 36 Z M40 34 C38 18 42 6 48 2 C46 14 44 24 40 36 Z" fill="#2fa65a"/><circle cx="36" cy="38" r="4" fill="#7a4a24"/><circle cx="44" cy="39" r="4" fill="#7a4a24"/></svg>',
    palmdusk: '<svg viewBox="0 0 80 120"><path d="M40 118 C42 90 44 60 40 34" stroke="#3a2a4a" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M40 34 C24 22 10 26 2 38 C16 32 28 34 40 36 Z M40 34 C56 22 70 26 78 38 C64 32 52 34 40 36 Z M40 34 C30 14 16 8 6 12 C20 16 30 24 40 36 Z M40 34 C50 14 64 8 74 12 C60 16 50 24 40 36 Z M40 34 C38 18 42 6 48 2 C46 14 44 24 40 36 Z" fill="#3a2a5a"/></svg>',
    vaka: '<svg viewBox="0 0 80 50"><path d="M40 4 L40 34 L18 34 Z" fill="#fff6e6"/><path d="M42 10 L42 34 L60 34 Z" fill="#ffb3a0"/><path d="M4 36 H76 L68 44 H12 Z" fill="#8a4a2a"/><path d="M14 44 V48 M66 44 V48 M10 48 H70" stroke="#6b3a1f" stroke-width="2.5"/></svg>',
    fish: '<svg viewBox="0 0 40 24"><path d="M4 12 C10 2 26 2 32 12 C26 22 10 22 4 12 Z" fill="#ffb400"/><path d="M30 12 L40 4 L40 20 Z" fill="#ff7a3a"/><path d="M14 5 V19" stroke="#fff" stroke-width="2.5"/><circle cx="9" cy="10" r="1.6" fill="#222"/></svg>',
    turtle: '<svg viewBox="0 0 60 40"><ellipse cx="30" cy="22" rx="18" ry="13" fill="#3f8a5a"/><path d="M20 16 L30 12 L40 16 L38 26 L30 30 L22 26 Z" fill="#2f6e46" stroke="#8fd27a" stroke-width="1.5"/><circle cx="50" cy="20" r="5" fill="#7ac77a"/><path d="M14 12 L6 6 M14 32 L6 38 M44 32 L50 38 M44 12 L50 8" stroke="#7ac77a" stroke-width="5" stroke-linecap="round"/></svg>',
    steamer: '<svg viewBox="0 0 100 40"><path d="M2 24 H98 L90 36 H10 Z" fill="#fff"/><path d="M2 30 H96" stroke="#e0333a" stroke-width="3"/><rect x="20" y="14" width="56" height="10" fill="#fff"/><rect x="24" y="17" width="48" height="3" fill="#3d3d6b"/><rect x="44" y="2" width="10" height="13" fill="#e0333a"/><rect x="44" y="2" width="10" height="3" fill="#222"/></svg>'
  };
  function sceneFor(n) { return SCENES[(n | 0) - 1] || SCENES[0]; }
  function sceneSvg(n) {
    const sc = sceneFor(n);
    return '<svg class="scene-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + VB_W + ' ' + VB_H + '" preserveAspectRatio="none" aria-hidden="true" data-scene="' + sc.id + '">' + sc.art() + '</svg>';
  }
  function sceneSprites(n) {
    const sc = sceneFor(n);
    return (sc.sprites || []).map(function (p) {
      const style = 'left:' + p.x + '%;top:' + p.y + '%;width:' + p.w + '%;' + (p.h ? 'height:' + p.h + '%;' : '') +
        '--d:' + (p.d || 4) + 's;--dl:' + (p.dl || 0) + 's;' + (p.col ? 'color:' + p.col + ';' : '');
      let inner = '';
      if (p.svg) inner = SCENE_SPRITE_SVG[p.svg] || '';
      else if (p.emoji) inner = '<i>' + p.emoji + '</i>';
      else if (p.fall) inner = '<i class="fallin"></i>';
      const kind = p.puff ? ' sc-puff' : p.beam ? ' sc-beam' : p.emoji ? ' sc-emoji' : '';
      return '<span class="scs ' + p.cls + kind + '" style="' + style + '">' + inner + '</span>';
    }).join('');
  }

  // Sweet streak: grows with cascades and specials, cools a little on a plain single match.
  // It only changes how big and bright the sayings are; it never changes the score.
  const STREAK_STEP = 6, STREAK_MAX_TIER = 4;
  const STREAK_NAMES = ['', 'Sweet streak!', 'Sweeter streak!', 'Sugar-high streak!', 'Ultimate sweet streak!'];
  function streakStepGain(s, i) {
    if (!s) return 0;
    const fired = (s.fired || []).filter(function (f) { return f.s === 'row' || f.s === 'col' || f.s === 'w' || f.s === 'b'; }).length;
    const made = (s.madeTiles || s.made || []).length;
    return 1 + (i > 0 ? 1 : 0) + fired + made;
  }
  function streakGain(steps) {
    steps = steps || [];
    if (!steps.length) return 0;
    let g = 0;
    steps.forEach(function (s, i) { g += streakStepGain(s, i); });
    return g <= 1 ? -1 : g;
  }
  function streakNext(pts, gain) { return Math.max(0, Math.min(STREAK_STEP * STREAK_MAX_TIER, (pts || 0) + (gain || 0))); }
  function streakTier(pts) { return Math.max(0, Math.min(STREAK_MAX_TIER, Math.floor((pts || 0) / STREAK_STEP))); }
  function streakFill(pts) {
    const tier = streakTier(pts);
    if (tier >= STREAK_MAX_TIER) return 1;
    return ((pts || 0) - tier * STREAK_STEP) / STREAK_STEP;
  }
  // Juicy feedback level for a whole move: 0 none, 1 a small shake, 2 a big shake.
  function shakeLevel(steps) {
    steps = steps || [];
    let popped = 0, fired = 0, bomb = false;
    steps.forEach(function (s) {
      popped += (s.popped && s.popped.length) || 0;
      (s.fired || []).forEach(function (f) { fired++; if (f.s === 'b') bomb = true; });
      if (s.bomb) bomb = true;
    });
    if (bomb || fired >= 2 || steps.length >= 5 || popped >= 18) return 2;
    if (fired >= 1 || steps.length >= 3 || popped >= 9) return 1;
    return 0;
  }

  // Boosters: free from the daily spin and the treasure chest. Stored on this phone, per player.
  const BOOSTERS = [
    { id: 'moves', icon: '🍬', name: '+3 moves', label: '+3 moves' },
    { id: 'hammer', icon: '🔨', name: 'Lolly hammer', label: 'Hammer' },
    { id: 'shuffle', icon: '🔀', name: 'Shuffle', label: 'Shuffle' }
  ];
  const EXTRA_MOVES = 3, BOOST_MAX = 99;
  function normBoosters(v) {
    v = v || {};
    const out = {};
    BOOSTERS.forEach(function (b) { const n = Math.floor(+v[b.id] || 0); out[b.id] = Math.max(0, Math.min(BOOST_MAX, n)); });
    return out;
  }
  function addPrize(inv, prize) {
    const out = normBoosters(inv);
    if (!prize) return out;
    const n = Math.max(1, prize.n | 0);
    const ids = prize.id === 'all' ? BOOSTERS.map(function (b) { return b.id; }) : [prize.id];
    ids.forEach(function (id) { if (id in out) out[id] = Math.min(BOOST_MAX, out[id] + n); });
    return out;
  }
  function takeBooster(inv, id) {
    const out = normBoosters(inv);
    if (!(id in out) || out[id] <= 0) return { ok: false, inv: out };
    out[id]--;
    return { ok: true, inv: out };
  }
  const SPIN_PRIZES = [
    { id: 'moves', n: 1, icon: '🍬', label: '+3 moves', col: '#ff6fa8' },
    { id: 'hammer', n: 1, icon: '🔨', label: 'Hammer', col: '#ffb347' },
    { id: 'shuffle', n: 1, icon: '🔀', label: 'Shuffle', col: '#6ed0ff' },
    { id: 'moves', n: 2, icon: '🍬', label: '+3 moves ×2', col: '#c77dff' },
    { id: 'hammer', n: 1, icon: '🔨', label: 'Hammer', col: '#5dd47a' },
    { id: 'shuffle', n: 2, icon: '🔀', label: 'Shuffle ×2', col: '#ffd43b' },
    { id: 'all', n: 1, icon: '🎁', label: 'One of each', col: '#ff4f7a' },
    { id: 'hammer', n: 2, icon: '🔨', label: 'Hammer ×2', col: '#4aa8ff' }
  ];
  function nzDay(ms) {
    const d = new Date(ms == null ? Date.now() : ms);
    try {
      const parts = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
      const get = function (t) { const p = parts.find(function (x) { return x.type === t; }); return p ? p.value : ''; };
      return get('year') + '-' + get('month') + '-' + get('day');
    } catch (e) { return d.toISOString().slice(0, 10); }
  }
  function canSpin(lastDay, ms) { return !lastDay || lastDay !== nzDay(ms); }
  function spinPick(rand) { const r = typeof rand === 'function' ? rand() : Math.random(); return Math.min(SPIN_PRIZES.length - 1, Math.floor(r * SPIN_PRIZES.length)); }
  // Segment i is centred at i * (360 / count) degrees clockwise from the top pointer.
  // Returns the wheel's final rotation (degrees, clockwise) so that segment i lands under the pointer.
  function spinAngle(i, turns, from, jitter) {
    const seg = 360 / SPIN_PRIZES.length;
    const want = ((360 - i * seg) % 360 + 360) % 360;
    const cur = ((from || 0) % 360 + 360) % 360;
    const j = Math.max(-seg * 0.35, Math.min(seg * 0.35, jitter || 0));
    return (from || 0) + (turns == null ? 5 : turns) * 360 + ((want - cur + 360) % 360) + j;
  }
  function prizeAt(rotation) {
    const seg = 360 / SPIN_PRIZES.length;
    const a = ((-(rotation || 0)) % 360 + 360) % 360;
    return Math.round(a / seg) % SPIN_PRIZES.length;
  }
  // Treasure chest at the end of a won level: a free booster for a first clear or a new star record.
  function chestReward(levelN, stars, prevStars, firstWin) {
    if (!firstWin && !((stars || 0) > (prevStars || 0))) return null;
    const ids = ['moves', 'hammer', 'shuffle'];
    // 1.9.222 Hard levels give an extra booster; Super Hard gives two extra.
    const lv = LEVELS[(levelN | 0) - 1], hard = (lv && lv.hard) || 0;
    return { id: ids[((levelN | 0) + (firstWin ? 0 : (stars | 0))) % 3], n: 1 + hard };
  }
  // 1.9.223 Lives regenerate: one every hour up to 3, worked out from timestamps so it carries on while the app is closed.
  // Gifted lives can go above 3; nothing regenerates while above 3. v = { v: 2, n, t } where t is when the next hour started.
  const LIVES_MAX = 3, LIFE_MS = 36e5;
  function regenLives(v, now) {
    now = now == null ? Date.now() : now;
    if (!v || typeof v !== 'object' || typeof v.n !== 'number' || !isFinite(v.n)) return { v: 2, n: LIVES_MAX, t: null };
    let n = Math.max(0, Math.floor(v.n));
    if (v.v !== 2) {
      // 1.9.222 saved { day, n } with a midnight top-up: an older day tops up to 3 first; below 3, the hourly clock starts now.
      if (typeof v.day === 'string' && v.day !== nzDay(now)) n = Math.max(LIVES_MAX, n);
      return { v: 2, n: n, t: n < LIVES_MAX ? now : null };
    }
    let t = typeof v.t === 'number' && isFinite(v.t) ? Math.min(v.t, now) : null;
    if (n >= LIVES_MAX) return { v: 2, n: n, t: null };
    if (t == null) t = now;
    const gained = Math.floor((now - t) / LIFE_MS);
    if (gained > 0) { n = Math.min(LIVES_MAX, n + gained); t = n >= LIVES_MAX ? null : t + gained * LIFE_MS; }
    return { v: 2, n: n, t: t };
  }
  // Spend (or add) lives on a regenerated state: dropping below 3 from 3 or more starts the hourly clock.
  function changeLives(v, delta, now) {
    now = now == null ? Date.now() : now;
    const cur = regenLives(v, now);
    const n = Math.max(0, cur.n + delta);
    if (n >= LIVES_MAX) return { v: 2, n: n, t: null };
    return { v: 2, n: n, t: cur.n >= LIVES_MAX ? now : (cur.t == null ? now : cur.t) };
  }
  function nextLifeMs(v, now) {
    now = now == null ? Date.now() : now;
    const cur = regenLives(v, now);
    return cur.n >= LIVES_MAX || cur.t == null ? 0 : Math.max(0, cur.t + LIFE_MS - now);
  }
  function mmss(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function hardWinLine(h) {
    return h === 2 ? 'Super Hard level conquered! You are a true sweet legend! 🔥🔥 ' : h === 1 ? 'Hard level beaten! Brilliant sweet skills! 🔥 ' : '';
  }
  function boosterInfo(id) { return BOOSTERS.find(function (b) { return b.id === id; }) || null; }
  // Lolly hammer: smash one tile without using a move. Specials it hits still fire.
  function hammerAt(st, r, c) {
    if (!st || st.over || st.tutorial) return { valid: false };
    if (!isOpen(st.mask, r, c)) return { valid: false };
    const b = st.board, t = b[r] && b[r][c];
    if (!t || isHole(t) || isIng(t)) return { valid: false };
    const k = key(r, c), clear = new Set(), fired = [], hit = new Set();
    if (isBlock(t)) hit.add(k);
    else { clear.add(k); expand(b, clear, fired, hit, st.mask); }
    const first = { kind: 'clear', clear, made: [], fired, hit, groups: 1, hammer: true };
    applyStep(b, first, st.rand, st.kinds, 1, st);
    st.score += first.points;
    const steps = [first].concat(settleBoard(st, 2));
    let shuffled = false;
    if (!hasMove(b, st.mask)) { shuffle(b, st.rand, st.kinds, st.mask); shuffled = true; }
    return { valid: true, steps, shuffled, at: [r, c] };
  }
  function shuffleBooster(st) {
    if (!st || st.over || st.tutorial) return false;
    shuffle(st.board, st.rand, st.kinds, st.mask);
    return true;
  }

  root.SugarRush = { N, KINDS, PTS, LEVEL, LEVELS, BONUS, NAMES, HOLE, LEVEL_INTROS, levelIntro, TUTORIAL_STEPS, TUTORIALS, tutorialFor, TUTORIAL_KEY, sameTutMove, MAP_W, MAP_H, MAP_STOPS, FUTURE_STOPS, NZ_PROJ, nzXY, WHANGAREI_INSET, insetXY, pacXY, ausXY, LV_COUNT, lvId, levelIds, stopId, LEGACY_220_IDS, migrateProg, stopForLevel, icingPath, nzMapSvg, RACE_ICONS, raceIcon, isRaceIcon, raceStars, raceStop, allocateIcon, rankRacers, stackOffsets, racerFirst, rng, fromRows, toRows, findRuns, groups, specialFor, resolve, collapse, applyStep, validSwap, findMove, hasMove, shuffle, newBoard, newGame, play, grantPlayOutSpecial, runPlayOut, fireSpecialAt, settleBoard, listSpecials, listPlayOutCandies, starsFor, starsOf, goalsMet, jellyLeft, iceLeft, locksLeft, bubLeft, liqLeft, spreadLiq, LIQ_IDLE, goalCounts, cloneState, bestMove, hintMoveFor, tryBeat, lvOf, isHole, isCandy, isIng, isBlock,
    allowed: () => true, // 1.9.228 open to every family member
    SAY_REST_MS, SAY_BIG, sayBig, HARD_LINES, hardLine, CANDY_STYLES, candySfxPlan, playCandySfx, SAY_SHOW_MS, SAY_AFTER_MS, sayShowGap, SPEAK_GAP, SPEAK_PITCH, SPEAK_RATE, SPEAK_VOL, pickSpeechVoice, speechGender, speakWorthy, SAY_SPRITES, SAY_CLIPS, sayClip, nextSayVoice, SCALE, SFX_MAX_HZ, SFX_LP, SFX_NOTE, SFX_MASTER, VOICE_VOL, CHIME_VOL, CHIME_DUR, VOICE_GAP, BGM_VOL, BGM_DUCK, END_VOL, MENU_VOL, XF,
    VOICE_FILES, VOICE_RANK, MEDIA_HASH, mediaUrl, gameTrack, SONG_PLAN, SONG_FILES, SONG_FROM, songMood, attachSfxBus, playTone, playChime, playMovesWarnChime, playClip, voiceForStep,
    SAYINGS, SAYING_COLORS, SAYING_VOICE, sayingKind, pickSaying, sayingColor, MOVES_WARN_AT, MOVES_WARN_MS, HINT_IDLE_MS, HINT_REPEAT_MS,
    SPARKLE_MIN_MS, SPARKLE_MAX_MS, SPARKLE_MAX, SPARKLE_MAX_REDUCE, SHIMMER_MS, sparkleCap, sparkleEase, shimmerAt, drawStarGlint, drawCandyShine,
    SCENES, sceneFor, sceneSvg, sceneSprites, STREAK_STEP, STREAK_MAX_TIER, STREAK_NAMES, streakStepGain, streakGain, streakNext, streakTier, streakFill, shakeLevel,
    BOOSTERS, EXTRA_MOVES, normBoosters, addPrize, takeBooster, SPIN_PRIZES, nzDay, canSpin, spinPick, spinAngle, prizeAt, chestReward, boosterInfo, hammerAt, shuffleBooster, LIVES_MAX, LIFE_MS, regenLives, changeLives, nextLifeMs, mmss };

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
  let soundOn = ls.get('ib-sugar-sound', true), musicOn = ls.get('ib-sugar-music', true), voiceOn = ls.get('ib-sugar-voice', true);
  let screen = 'map', lvNum = 1, st = null, pendingLv = 1;
  let busy = false, sel = null, down = null, lastAct = performance.now();
  let sprites = new Map(), fx = [], hintMove = null;
  let winInfo = { newBadge: false, yum: false };
  let sparkles = [], sparkleNext = 0, sparkleHoldT = null;
  // 1.9.218 Sweet streak, boosters (hammer mode) and a freeze flag for screenshots.
  let streakPts = 0, streakTierNow = 0, hammerMode = false, ovHold = false, boosts = null, endTap = false;

  // 1.9.222 Move "seen this tutorial" marks for the 1.9.220 island levels (16-18) to their new numbers (17-19), once.
  function migrateTutorialKeys() {
    if (ls.get('ib-sugar-layout', 0) >= 222) return;
    const tag = memberTag();
    for (let n = 18; n >= 16; n--) {
      [TUTORIAL_KEY + ':' + n + tag, TUTORIAL_KEY + ':' + n].forEach(function (k) {
        if (ls.get(k, false)) { ls.set(k.replace(':' + n, ':' + (n + 1)), true); try { localStorage.removeItem(k); } catch (e) { } }
      });
    }
    ls.set('ib-sugar-layout', 222);
  }
  function loadProg() {
    const raw = ls.get('ib-sugar-progress', null) || {};
    const m = migrateProg(raw);
    try { migrateTutorialKeys(); } catch (e) { }
    // 1.9.219+ Anyone who already finished the last level of an older release (stars on it) can go on to the next.
    let open = m.open;
    while (open < LV_COUNT && (m.stars[open - 1] || 0) > 0) open++;
    m.open = open;
    if (!Array.isArray(raw.ids) && (raw.stars || raw.open)) { try { ls.set('ib-sugar-progress', m); } catch (e) { } }
    return m;
  }
  function saveProg() { prog.ids = levelIds(); ls.set('ib-sugar-progress', prog); }
  const prog = loadProg();
  let race = { racers: [], offline: true, mine: null };
  let raceDemo = false; // test / screenshot only: never POST to the family backend
  let raceLw = 0; // 1.9.222 the level just won, sent once with the next race post


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
    const file = TRACKS[kind] || (kind.indexOf('song_') === 0 ? SONG_FILES[kind.slice(5)] : null);
    if (!file) return Promise.resolve(null);
    const get = f => fetch(mediaUrl(f)).then(r => { if (!r.ok) throw new Error('media ' + r.status); return r.arrayBuffer(); }).then(ab => ac.decodeAudioData(ab.slice(0)));
    // AAC first (smaller); if this phone cannot fetch or decode it, the mp3 twin.
    const mp3 = file.replace(/\.m4a$/, '.mp3');
    loading[kind] = get(file).catch(e => { if (mp3 !== file && MEDIA_HASH[mp3]) return get(mp3); throw e; })
      .then(b => { bufs[kind] = b; return b; }).catch(() => { loading[kind] = null; return null; });
    return loading[kind];
  }
  const TRACKS = { say_f: SAY_SPRITES.f, say_m: SAY_SPRITES.m, game: 'sugar-rush-music.mp3', game1: 'sugar-rush-l1.mp3', game2: 'sugar-rush-l2.mp3', menu: 'sugar-rush-menu.mp3', win: 'sugar-rush-win.mp3', yum: 'sugar-rush-yum.mp3', yay: VOICE_FILES.yay, great: VOICE_FILES.great, awesome: VOICE_FILES.awesome, sweetas: VOICE_FILES.sweetas, succulent: VOICE_FILES.succulent };
  function volFor(kind) { return kind === 'menu' ? MENU_VOL : BGM_VOL; }
  function gameKind(level) {
    const n = level == null ? lvNum : level;
    const mood = songMood(n);
    if (mood && SONG_FILES[mood]) return 'song_' + mood;
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
    if (soundOn && voiceOn) { primeSpeech(); loadSayClips(); } // 1.9.226 on the first touch, so clips are ready before the first match
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
  let candyLast = '', candyAt = 0;
  function candySfx(kind, chain) {
    const t = now();
    if (t - candyAt < 90) return; // a cascade can fire several steps at once: keep it to one sound per beat
    candyAt = t;
    runAudio(() => {
      if (!out) return;
      const plan = candySfxPlan(kind, chain, Math.random, candyLast);
      candyLast = plan.style;
      playCandySfx(ac, out, ac.currentTime + 0.01, plan);
    });
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
    if (!rank || !voiceOn) return;
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
    // 1.9.223 With speech available the saying itself is spoken (from showSaying); the clips are the fallback.
    // 1.9.229 Minor sayings play a candy sound (from showSaying); only major ones may fall back to the old word clips.
    const cas = step && (step.cascade || (i + 1)), word = voiceForStep(step, cas), kind = sayingKind(step, cas, st);
    if (kind && sayBig(kind) && word && voiceOn && !canSpeak() && !clipsReady()) say(word);
    else if (!kind) chime();
  }
  // ---- 1.9.223 Spoken sayings (speechSynthesis) ----
  const synth = root.speechSynthesis || null;
  let speakVoice = null, speakVoices = { f: null, m: null }, speakAt = -1e9, speakPrimed = false, sayVoice = null, saySrc = null;
  function canSpeak() { return !!(synth && root.SpeechSynthesisUtterance); }
  function loadSpeechVoice() {
    try { const l = synth.getVoices(); speakVoice = pickSpeechVoice(l); speakVoices = { f: pickSpeechVoice(l, 'f'), m: pickSpeechVoice(l, 'm') }; } catch (e) { speakVoice = null; }
  }
  // 1.9.225 Lazy-load the two saying sprites (about 400 KB each) once sound and voice are on and a level is in play.
  function loadSayClips() { if (soundOn && voiceOn && audio()) { loadBuf('say_f'); loadBuf('say_m'); } }
  function clipsReady() { return !!(bufs.say_f || bufs.say_m); }
  // Plays the clip after whatever is still being said (a queue, never a cut). Returns the gender used, or ''.
  let sayEndAt = 0;
  function playSayClip(line, g) {
    if (!ac || !clipOut) return '';
    if (!bufs['say_' + g]) g = g === 'f' ? 'm' : 'f';
    const buf = bufs['say_' + g], c = sayClip(line, g);
    if (!buf || !c) return '';
    runAudio(() => {
      const at = Math.max(ac.currentTime + 0.01, sayEndAt), src = ac.createBufferSource(), gn = ac.createGain();
      src.buffer = buf; gn.gain.setValueAtTime(VOICE_VOL * 1.6, at);
      src.connect(gn); gn.connect(clipOut);
      src.start(at, c.start, c.dur);
      sayEndAt = at + c.dur - 0.25; // the reverb tail may overlap the next line's lead-in
      src.onended = () => { if (saySrc === src) saySrc = null; };
      saySrc = src;
      const wait = at - ac.currentTime;
      if (wait > 0.05) setTimeout(() => duckMusicBrief(Math.min(2.6, c.dur)), wait * 1000); else duckMusicBrief(Math.min(2.6, c.dur));
    });
    return g;
  }
  if (canSpeak()) { loadSpeechVoice(); try { synth.addEventListener('voiceschanged', loadSpeechVoice); } catch (e) { } }
  function primeSpeech() {
    // iOS only lets speech start from a tap: speak a silent blank once on the first touch.
    if (speakPrimed || !canSpeak()) return;
    speakPrimed = true;
    try { const u = new root.SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) { }
  }
  // 1.9.226 Returns how many seconds the line will take (0 if it can't be said). Never skips: lines queue.
  function sayLineKey(text) { return String(text || '').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu, '').replace(/\s*×\d+\s*$/, '').replace(/\s+/g, ' ').trim(); }
  function speakLine(text, opt) {
    opt = opt || {};
    if (!text || !soundOn || !voiceOn || (doc && doc.hidden)) return 0;
    const t = now();
    const line = sayLineKey(text);
    if (!line) return 0;
    // Female and male take turns (mostly); the recorded clip first, the phone's voice of that gender if it is missing.
    const g = nextSayVoice(sayVoice, Math.random());
    const queued = ac ? Math.max(0, sayEndAt - ac.currentTime) : 0;
    const used = playSayClip(line, g);
    if (used) { sayVoice = used; speakAt = t; return queued + sayClip(line, used).dur; }
    // Clips still downloading (the first seconds of a level): wait for them briefly rather than fall back.
    if (SAY_CLIPS[line] && audio()) {
      loadSayClips();
      const p = loading['say_' + g] || loading['say_' + (g === 'f' ? 'm' : 'f')];
      if (p) {
        p.then(() => { if (now() - t < 1800 && soundOn && voiceOn) { const u2 = playSayClip(line, g); if (u2) sayVoice = u2; } });
        speakAt = t; return SAY_CLIPS[line][1];
      }
    }
    if (!canSpeak()) return 0;
    try {
      if (opt.force) synth.cancel(); // otherwise the phone queues utterances itself
      const u = new root.SpeechSynthesisUtterance(line);
      if (!speakVoice) loadSpeechVoice();
      const gv = speakVoices[g] || speakVoice;
      if (gv) { u.voice = gv; u.lang = gv.lang; } else u.lang = 'en-NZ';
      sayVoice = g;
      u.pitch = SPEAK_PITCH; u.rate = SPEAK_RATE; u.volume = SPEAK_VOL;
      speakAt = t;
      const est = 0.45 + line.length * 0.065;
      duckMusicBrief(Math.min(2.4, est));
      synth.speak(u);
      return est;
    } catch (e) { return 0; }
  }
  function stopSpeech() { try { if (synth) synth.cancel(); } catch (e) { } if (saySrc) { try { saySrc.stop(); } catch (e) { } saySrc = null; } }
  // Big moments: speak the banner words when speech works, otherwise the old clip.
  // Goal achieved / Sugar Crush / the win line go with their banners: always said, ahead of any waiting saying.
  function cheer(text, word) {
    if (sayPendTimer) clearTimeout(sayPendTimer); sayPendTimer = 0; sayPending = null;
    const d = speakLine(text);
    if (d > 0) { sayFreeAt = now() + d * 1000 + SAY_REST_MS; return; }
    if (!((canSpeak() || clipsReady() || audio()) && voiceOn)) say(word);
  }
  function setVoice(on) { voiceOn = !!on; ls.set('ib-sugar-voice', voiceOn); if (!voiceOn) stopSpeech(); paintButtons(); if (voiceOn) { primeSpeech(); loadSayClips(); speakLine('Voice on!', { force: true }); } }

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
  function rgbaOf(hex, a) {
    const h = String(hex || '#ffffff').replace('#', '');
    const v = parseInt(h.length === 3 ? h.split('').map(function (x) { return x + x; }).join('') : h, 16);
    return 'rgba(' + ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + a + ')';
  }
  // 1.9.218 Glossier, rounder sweets: a soft contact shadow, a darker rim, bounce light
  // from below and a crisp specular. No shadowBlur, so it stays cheap on a phone.
  function drawSweet(t, x, y, R, sc, al, wob) {
    if (t.bub > 0) { drawBubbled(t, x, y, R, sc, al, wob); return; }
    ctx.save(); ctx.translate(x, y); if (wob) ctx.rotate(wob); ctx.scale(sc, sc); ctx.globalAlpha = al;
    ctx.fillStyle = 'rgba(70,10,40,.16)'; ctx.beginPath(); ctx.ellipse(0, R * .88, R * .72, R * .18, 0, 0, Math.PI * 2); ctx.fill();
    if (t.ing && st && st.lv && st.lv.ingStyle === 'coconut') {
      // 1.9.220 Tonga: the ingredients are coconuts.
      const g = ctx.createRadialGradient(-R * .25, -R * .3, R * .1, 0, 0, R * .85);
      g.addColorStop(0, '#a8714a'); g.addColorStop(1, '#5a3418');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * .78, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,190,.35)'; ctx.lineWidth = R * .05;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(0, 0, R * (.3 + i * .1), -2.6 + i * .2, -1.6 + i * .2); ctx.stroke(); }
      ctx.fillStyle = '#2e1a0c'; [[-.2, -.3], [.12, -.36], [-.04, -.12]].forEach(function (d) { ctx.beginPath(); ctx.arc(R * d[0], R * d[1], R * .09, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#3fbf6a'; ctx.beginPath(); ctx.ellipse(R * .42, -R * .62, R * .28, R * .1, -0.6, 0, Math.PI * 2); ctx.fill();
      drawCandyShine(ctx, R * 0.78, .7);
      ctx.restore(); return;
    }
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
      // Sprinkle bomb: a bigger glossy chocolate ball covered in hundreds and thousands.
      const B = R * 1.06;
      const g = ctx.createRadialGradient(-B * .3, -B * .35, B * .08, 0, 0, B);
      g.addColorStop(0, '#b07a5a'); g.addColorStop(.5, '#6b3c27'); g.addColorStop(.85, '#46251a'); g.addColorStop(1, '#2e160e');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, B * .95, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 20; i++) { const a = i * 2.39996, d = B * (.18 + .66 * ((i * 37) % 10) / 10); ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d); ctx.rotate(a * 1.7); ctx.fillStyle = COL[i % 6][0]; rr(-B * .14, -B * .055, B * .28, B * .11, B * .055); ctx.fill(); ctx.restore(); }
      ctx.strokeStyle = 'rgba(255,220,190,.35)'; ctx.lineWidth = B * .06; ctx.beginPath(); ctx.arc(0, 0, B * .9, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
      drawCandyShine(ctx, R, 1);
      ctx.restore(); return;
    }
    const c = COL[t.c];
    const RR = t.s ? R * 1.08 : R; // specials are bigger and bolder
    if (t.c === 5) {
      ctx.fillStyle = c[1];
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * RR * .6, 0); ctx.lineTo(s * RR * 1.08, -RR * .45); ctx.quadraticCurveTo(s * RR * .95, 0, s * RR * 1.08, RR * .45); ctx.closePath(); ctx.fill(); }
    }
    if (t.s === 'w') {
      // Wrapped sweet: twisted wrapper ends, then the sweet inside a shiny foil.
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * RR * .62, 0); ctx.lineTo(s * RR * 1.2, -RR * .52); ctx.quadraticCurveTo(s * RR * 1.02, 0, s * RR * 1.2, RR * .52); ctx.closePath();
        ctx.fillStyle = c[1]; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = RR * .06; ctx.beginPath(); ctx.moveTo(s * RR * .75, -RR * .12); ctx.lineTo(s * RR * 1.08, -RR * .36); ctx.moveTo(s * RR * .75, RR * .12); ctx.lineTo(s * RR * 1.08, RR * .36); ctx.stroke();
      }
      ctx.save(); ctx.fillStyle = rgbaOf(c[0], .55); rr(-RR * .86, -RR * .86, RR * 1.72, RR * 1.72, RR * .42); ctx.fill();
      ctx.strokeStyle = c[2]; ctx.lineWidth = RR * .09; ctx.stroke(); ctx.restore();
    }
    const body = RR * (t.s === 'w' ? .74 : 1);
    const g = ctx.createRadialGradient(-body * .38, -body * .44, body * .08, 0, 0, body * 1.12);
    g.addColorStop(0, c[0]); g.addColorStop(.5, c[1]); g.addColorStop(.86, c[2]); g.addColorStop(1, c[2]);
    shapePath(t.c, body); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = rgbaOf(c[2], .65); ctx.lineWidth = body * .07; ctx.stroke();
    ctx.save(); shapePath(t.c, body); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(body * .12, body * .66, body * .58, body * .24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (!reduce) {
      const breathe = 0.5 + 0.5 * Math.sin((performance.now() / 1100) + (t.c || 0) * 0.85);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.07 + 0.08 * breathe) + ')';
      shapePath(t.c, body * 0.72);
      ctx.fill();
    }
    if (t.s === 'row' || t.s === 'col') {
      // Bold stripes with a candy-coloured edge, so the direction reads at a glance.
      ctx.save(); shapePath(t.c, body); ctx.clip();
      for (let i = -1; i <= 1; i++) {
        const o = i * body * .52;
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        if (t.s === 'row') ctx.fillRect(-body * 1.2, o - body * .13, body * 2.4, body * .26); else ctx.fillRect(o - body * .13, -body * 1.2, body * .26, body * 2.4);
        ctx.fillStyle = rgbaOf(c[2], .55);
        if (t.s === 'row') ctx.fillRect(-body * 1.2, o + body * .13, body * 2.4, body * .05); else ctx.fillRect(o + body * .13, -body * 1.2, body * .05, body * 2.4);
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = body * .08; shapePath(t.c, body * 1.02); ctx.stroke();
    }
    drawCandyShine(ctx, body, 1);
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(-body * .44, -body * .3, body * .055, 0, Math.PI * 2); ctx.fill();
    if (t.lock) {
      ctx.fillStyle = 'rgba(70,40,20,.8)'; rr(-R * .28, -R * .05, R * .56, R * .45, R * .08); ctx.fill();
      ctx.strokeStyle = 'rgba(70,40,20,.8)'; ctx.lineWidth = R * .1; ctx.beginPath(); ctx.arc(0, -R * .08, R * .2, Math.PI, 0); ctx.stroke();
    }
    if (t.liq) drawLiqWrap(R);
    ctx.restore();
  }
  // 1.9.219 Liquorice: two twisted black ropes crossed over the sweet, with a glossy edge.
  function drawLiqWrap(R) {
    ctx.save();
    ctx.lineCap = 'round';
    const ropes = [[-R * .78, -R * .62, R * .78, R * .62], [-R * .78, R * .62, R * .78, -R * .62], [-R * .86, 0, R * .86, 0]];
    ropes.forEach(function (q, i) {
      ctx.strokeStyle = i === 2 ? '#3a1f33' : '#1c0f18'; ctx.lineWidth = R * (i === 2 ? .2 : .26);
      ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.stroke();
      ctx.strokeStyle = 'rgba(190,120,200,.55)'; ctx.lineWidth = R * .05;
      ctx.setLineDash([R * .12, R * .14]);
      ctx.beginPath(); ctx.moveTo(q[0], q[1] - R * .05); ctx.lineTo(q[2], q[3] - R * .05); ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.fillStyle = '#ff7ab6'; ctx.beginPath(); ctx.arc(0, 0, R * .13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c0f18'; ctx.beginPath(); ctx.arc(0, 0, R * .06, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // 1.9.219 Sugar bubble: the sweet sits a little smaller inside a shimmering glass sphere.
  function drawBubbled(t, x, y, R, sc, al, wob) {
    const inner = Object.assign({}, t, { bub: 0 });
    drawSweet(inner, x, y, R * .74, sc, al, wob);
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
    const sh = reduce ? 0 : Math.sin(now / 520 + (t.id || 0)) * .03;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc * (1 + sh), sc * (1 - sh)); ctx.globalAlpha = al;
    const g = ctx.createRadialGradient(-R * .2, -R * .25, R * .1, 0, 0, R * .96);
    g.addColorStop(0, 'rgba(255,255,255,.06)'); g.addColorStop(.7, 'rgba(150,215,255,.22)'); g.addColorStop(1, 'rgba(90,170,240,.5)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * .94, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = R * .07; ctx.beginPath(); ctx.arc(0, 0, R * .92, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(41,182,246,.55)'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.arc(0, 0, R * .84, Math.PI * .15, Math.PI * .85); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(-R * .38, -R * .44, R * .22, R * .11, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(R * .42, R * .3, R * .06, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // Specials glow and pulse behind the sweet; the sprinkle bomb gets a turning rainbow ring.
  function drawSpecialGlow(t, x, y, R, time, al) {
    const pulse = reduce ? 0.6 : 0.55 + 0.45 * Math.sin(time / 260 + (t.id || 0));
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, al)) * (0.5 + 0.4 * pulse);
    if (t.c < 0) {
      const rot = reduce ? 0 : time / 900;
      ctx.lineWidth = R * .16;
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = COL[i][1];
        ctx.beginPath(); ctx.arc(x, y, R * 1.2, rot + i * Math.PI / 3, rot + (i + 1) * Math.PI / 3 - 0.12); ctx.stroke();
      }
    } else {
      const col = COL[t.c][1];
      const g = ctx.createRadialGradient(x, y, R * .3, x, y, R * 1.5);
      g.addColorStop(0, rgbaOf(col, .7)); g.addColorStop(.6, rgbaOf(col, .25)); g.addColorStop(1, rgbaOf(col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 1.5, 0, Math.PI * 2); ctx.fill();
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
        // Candy-glass tiles: the scene shows faintly through the board.
        ctx.fillStyle = jelly >= 2 ? 'rgba(180,80,200,.42)' : jelly === 1 ? 'rgba(255,120,190,.36)' : ((r + c) % 2 ? 'rgba(255,255,255,.52)' : 'rgba(255,232,244,.66)');
        rr(c * CS + 1.5, r * CS + 1.5, CS - 3, CS - 3, CS * .18); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.4)'; rr(c * CS + CS * .14, r * CS + 3, CS * .72, CS * .12, CS * .06); ctx.fill();
        if (jelly) { ctx.strokeStyle = jelly >= 2 ? 'rgba(140,40,180,.55)' : 'rgba(230,70,150,.45)'; ctx.lineWidth = 2 * DPR; rr(c * CS + 4, r * CS + 4, CS - 8, CS - 8, CS * .16); ctx.stroke(); }
      }
      if (sel && !busy) { ctx.strokeStyle = '#ff4f9a'; ctx.lineWidth = 3 * DPR; rr(sel[1] * CS + 3, sel[0] * CS + 3, CS - 6, CS - 6, CS * .2); ctx.stroke(); }
      for (const f of fx) if (f.type === 'beam') {
        const p = Math.min(1, (t - f.t0) / f.dur); ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - p)) + ')';
        if (f.s === 'row') ctx.fillRect(0, f.r * CS + CS * (.5 - .4 * (1 - p)), W, CS * .8 * (1 - p)); else ctx.fillRect(f.c * CS + CS * (.5 - .4 * (1 - p)), 0, CS * .8 * (1 - p), W);
      } else if (f.type === 'ring') {
        const p = Math.min(1, Math.max(0, (t - f.t0) / f.dur)); ctx.strokeStyle = f.col ? rgbaOf(f.col, 0.85 * (1 - p)) : 'rgba(255,255,255,' + (0.8 * (1 - p)) + ')'; ctx.lineWidth = CS * .2 * (1 - p);
        ctx.beginPath(); ctx.arc(f.x, f.y, CS * (.4 + (f.big || 1.3) * p), 0, Math.PI * 2); ctx.stroke();
      }
      const hint = tickHint(t);
      const R = CS * .37;
      if (hint) drawHintGlow(hint, t, true);
      const crushing = !!(crush && crush.active);
      for (const s of sprites.values()) {
        if (s.tw) { const p = Math.min(1, (t - s.tw.t0) / s.tw.dur), e = s.tw.ease(p); s.x = s.tw.fx + (s.tw.tx - s.tw.fx) * e; s.y = s.tw.fy + (s.tw.ty - s.tw.fy) * e; if (p >= 1) { if (s.tw.ease === easeIn && !reduce) s.land = t; s.tw = null; } }
        if (s.pop) { const p = Math.min(1, (t - s.pop) / (220 * SP)); s.sc = 1 + .3 * p; s.al = 1 - p; }
        if (s.grow) { const p = Math.min(1, (t - s.grow) / (260 * SP)); s.sc = .3 + .7 * easeOut(p) + (p < 1 ? .25 * Math.sin(p * Math.PI) : 0); if (p >= 1) { s.grow = 0; s.sc = 1; } }
        if (s.y < -0.5) continue;
        let wob = 0;
        if (hint && !reduce && hint.some(h => h[0] === s.r && h[1] === s.c)) wob = Math.sin(t / 180) * .12;
        // Gentle idle bob (off with reduced motion) and a little squash when a sweet lands.
        let bob = 0, land = 1;
        if (!reduce && !s.tw && !s.pop) bob = Math.sin(t / 640 + s.t.id * 1.37) * CS * 0.022;
        if (s.land) { const p = (t - s.land) / 170; if (p >= 1) s.land = 0; else land = 1 + 0.08 * Math.sin(p * Math.PI); }
        const px = s.x * CS + CS / 2, py = s.y * CS + CS / 2 + bob;
        if (s.t.s && !s.pop && !crushing && (isCandy(s.t) || isBomb(s.t))) drawSpecialGlow(s.t, px, py, R, t, s.al);
        drawSweet(s.t, px, py, R, s.sc * land, s.al, wob);
      }
      if (hint) drawHintGlow(hint, t, false);
      for (const f of fx) {
        if (f.type === 'beam2') {
          // Striped blast: a bright candy beam shooting out both ways from the striped sweet.
          const p = Math.min(1, Math.max(0, (t - f.t0) / f.dur)), reach = easeOut(Math.min(1, p * 1.8)) * W, fade = 1 - p;
          const ox = f.c * CS + CS / 2, oy = f.r * CS + CS / 2;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = rgbaOf(f.col, 0.5 * fade);
          if (f.s === 'row') ctx.fillRect(ox - reach, oy - CS * .42 * fade - 2, reach * 2, CS * .84 * fade + 4); else ctx.fillRect(ox - CS * .42 * fade - 2, oy - reach, CS * .84 * fade + 4, reach * 2);
          ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * fade) + ')';
          if (f.s === 'row') ctx.fillRect(ox - reach, oy - CS * .1, reach * 2, CS * .2); else ctx.fillRect(ox - CS * .1, oy - reach, CS * .2, reach * 2);
          ctx.restore();
        } else if (f.type === 'flash') {
          const p = Math.min(1, Math.max(0, (t - f.t0) / f.dur));
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, CS * 1.9);
          g.addColorStop(0, 'rgba(255,255,255,' + (0.85 * (1 - p)) + ')'); g.addColorStop(.5, rgbaOf(f.col || '#ffe066', 0.45 * (1 - p))); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, CS * (1 + .9 * easeOut(p)), 0, Math.PI * 2); ctx.fill();
        } else if (f.type === 'bolt') {
          // 1.9.222 Crackling bolt: re-jittered every ~45ms, grows out from the bomb, then fades.
          const p = (t - f.t0) / f.dur;
          if (p >= 0 && p <= 1) {
            const g = boltPath(f, Math.floor(t / 45));
            const reach = Math.min(1, p * 4.5), fade = p < .12 ? .6 + p * 3.3 : Math.max(0, 1 - (p - .12) / .88);
            const n = Math.max(1, Math.ceil((g.main.length - 1) * reach)), w = f.w || 1;
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.strokeStyle = rgbaOf(f.col, .5 * fade); ctx.lineWidth = CS * .24 * w; strokePts(g.main, n);
            ctx.strokeStyle = rgbaOf(f.col, 1 * fade); ctx.lineWidth = CS * .1 * w; strokePts(g.main, n);
            ctx.strokeStyle = 'rgba(255,255,255,' + (.95 * fade) + ')'; ctx.lineWidth = CS * .035 * w + .6; strokePts(g.main, n);
            if (n > g.bi) {
              ctx.strokeStyle = rgbaOf(f.col, .7 * fade); ctx.lineWidth = CS * .05 * w; strokePts(g.branch, 3);
              ctx.strokeStyle = 'rgba(255,255,255,' + (.8 * fade) + ')'; ctx.lineWidth = CS * .02 * w + .4; strokePts(g.branch, 3);
            }
            if (reach >= 1) { ctx.fillStyle = 'rgba(255,255,255,' + (.7 * fade) + ')'; ctx.beginPath(); ctx.arc(f.x1, f.y1, CS * .14 * w, 0, Math.PI * 2); ctx.fill(); }
            ctx.restore();
          }
        } else if (f.type === 'ray') {
          // Sprinkle bomb: a zap from the bomb to every sweet of the chosen colour.
          const p = Math.min(1, Math.max(0, (t - f.t0) / f.dur)), reach = easeOut(Math.min(1, p * 2.2));
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
          ctx.strokeStyle = rgbaOf(f.col, 0.75 * (1 - p)); ctx.lineWidth = CS * .14;
          ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(f.x0 + (f.x1 - f.x0) * reach, f.y0 + (f.y1 - f.y0) * reach); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * (1 - p)) + ')'; ctx.lineWidth = CS * .05; ctx.stroke();
          ctx.restore();
        }
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
      } else if (f.type === 'shard') {
        // Flying candy shards: little glossy chips that spin and fall.
        const p = Math.min(1, Math.max(0, (t - f.t0) / f.dur));
        const x = f.x + f.vx * p * CS, y = f.y + f.vy * p * CS + p * p * CS * 1.1;
        ctx.save(); ctx.translate(x, y); ctx.rotate(f.rot + f.vr * p); ctx.globalAlpha = p > .7 ? (1 - p) / .3 : 1;
        const z = CS * f.sz * (1 - p * .35);
        ctx.fillStyle = f.col; ctx.beginPath(); ctx.moveTo(0, -z); ctx.lineTo(z * .8, z * .2); ctx.lineTo(-z * .6, z * .7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(0, -z); ctx.lineTo(z * .25, -z * .1); ctx.lineTo(-z * .2, z * .05); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (f.type === 'glint') {
        const p = Math.min(1, Math.max(0, (t - f.t0) / f.dur));
        drawStarGlint(ctx, f.x + f.dx * p * CS, f.y + f.dy * p * CS, CS * f.sz * (0.4 + sparkleEase(p)), sparkleEase(p), f.rot + p * 2);
      } else if (f.type === 'text') {
        const p = Math.min(1, (t - f.t0) / f.dur); ctx.globalAlpha = p < .7 ? 1 : (1 - p) / .3;
        const pop = p < .18 ? 0.6 + 0.4 * easeOut(p / .18) + 0.15 * Math.sin(p / .18 * Math.PI) : 1;
        ctx.font = '900 ' + Math.round(f.size * DPR * pop) + 'px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 5 * DPR; ctx.strokeStyle = 'rgba(120,20,70,.85)'; ctx.strokeText(f.str, f.x, f.y - p * CS * .8); ctx.fillStyle = f.col || '#fff'; ctx.fillText(f.str, f.x, f.y - p * CS * .8); ctx.globalAlpha = 1;
      }
      fx = fx.filter(f => t - f.t0 < f.dur);
      for (const [id, s] of sprites) if (s.pop && t - s.pop > 230 * SP) sprites.delete(id);
    }
    tickOverlay(now());
    try { musicWatch(); } catch (e) { }
    root.requestAnimationFrame(frame);
  }

  // 1.9.218 Overlay canvas for fireworks and confetti (Sugar Crush finale, the chest, the daily spin).
  const ovc = $('fxov'), octx = ovc && ovc.getContext ? ovc.getContext('2d') : null;
  let ovp = [], ovOn = false, ovW = 0, ovH = 0, ovLast = 0, ovDpr = 1;
  const OV_CAP = 360;
  function ovFit() {
    if (!ovc) return;
    const w = root.innerWidth || 390, h = root.innerHeight || 844, d = Math.min(2, root.devicePixelRatio || 1);
    if (w !== ovW || h !== ovH || d !== ovDpr) { ovW = w; ovH = h; ovDpr = d; ovc.width = Math.round(w * d); ovc.height = Math.round(h * d); }
  }
  function ovStart() {
    if (!octx) return false;
    if (!ovOn) { ovOn = true; ovc.hidden = false; ovFit(); ovLast = now(); }
    return true;
  }
  function ovPush(p) { if (ovp.length >= OV_CAP) ovp.shift(); ovp.push(p); }
  const CONF_COLS = ['#ff4f9a', '#ffb400', '#ffe066', '#5dd47a', '#4aa8ff', '#c77dff', '#ff8c2a', '#ffffff'];
  function confetti(n, x, y, opt) {
    if (reduce || !ovStart()) return;
    opt = opt || {};
    const t = now();
    for (let i = 0; i < n; i++) {
      const a = opt.down ? (Math.PI / 2 + (Math.random() - 0.5) * 1.2) : (-Math.PI / 2 + (Math.random() - 0.5) * (opt.spread || 2.4));
      const sp = (opt.speed || 420) * (0.45 + Math.random() * 0.75);
      ovPush({ k: 'c', x: x + (opt.wide ? (Math.random() - 0.5) * opt.wide : 0), y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
        w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, col: CONF_COLS[(Math.random() * CONF_COLS.length) | 0], ph: Math.random() * 6, t0: t, life: 2200 + Math.random() * 1600 });
    }
  }
  function confettiAt(el, n, opt) {
    if (!el || !el.getBoundingClientRect) return;
    const b = el.getBoundingClientRect();
    confetti(n, b.left + b.width / 2, b.top + b.height / 2, opt);
  }
  function firework(x, y, col) {
    if (reduce || !ovStart()) return;
    ovPush({ k: 'r', x0: x + (Math.random() - 0.5) * 60, y0: ovH + 10, x, y, col: col || CONF_COLS[(Math.random() * 6) | 0], t0: now(), life: 620 + Math.random() * 200 });
  }
  function fireworkBurst(x, y, col) {
    const t = now(), n = 42;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.2, sp = 150 + Math.random() * 130;
      ovPush({ k: 's', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col: i % 5 === 0 ? '#ffffff' : col, t0: t, life: 900 + Math.random() * 500 });
    }
    ovPush({ k: 'f', x, y, col, t0: t, life: 260 });
    runAudio(() => { if (out && ac) playTone(ac, out, 420 + Math.random() * 160, ac.currentTime + 0.01, 0.12, CHIME_VOL * 0.55, 'triangle'); });
  }
  function fireworks(n, opt) {
    if (reduce) return;
    opt = opt || {};
    ovFit();
    for (let i = 0; i < n; i++) {
      setTimeout(function () { firework(ovW * (0.18 + Math.random() * 0.64), ovH * (0.12 + Math.random() * 0.3)); }, (opt.gap || 260) * i);
    }
  }
  function stopOverlay() { ovp = []; if (octx) octx.clearRect(0, 0, ovc.width, ovc.height); ovOn = false; if (ovc) ovc.hidden = true; }
  function tickOverlay(t) {
    if (!ovOn || !octx) return;
    ovFit();
    const dt = ovHold ? 0 : Math.min(0.05, Math.max(0, (t - ovLast) / 1000));
    ovLast = t;
    octx.setTransform(ovDpr, 0, 0, ovDpr, 0, 0);
    octx.clearRect(0, 0, ovW, ovH);
    const keep = [];
    for (const p of ovp) {
      const age = ovHold ? (p.age || 0) : (p.age = (p.age || 0) + dt * 1000);
      if (age > p.life) { if (p.k === 'r') fireworkBurst(p.x, p.y, p.col); continue; }
      const q = age / p.life;
      if (p.k === 'c') {
        p.vy += 520 * dt; p.vx *= (1 - 1.6 * dt); p.vy *= (1 - 1.2 * dt);
        p.x += (p.vx + Math.sin(age / 180 + p.ph) * 40) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.y > ovH + 20) continue;
        octx.save(); octx.translate(p.x, p.y); octx.rotate(p.rot); octx.scale(1, Math.cos(age / 120 + p.ph));
        octx.globalAlpha = q > 0.8 ? (1 - q) / 0.2 : 1; octx.fillStyle = p.col; octx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); octx.restore();
      } else if (p.k === 'r') {
        const e = 1 - Math.pow(1 - q, 2), x = p.x0 + (p.x - p.x0) * e, y = p.y0 + (p.y - p.y0) * e;
        octx.globalCompositeOperation = 'lighter';
        octx.fillStyle = p.col; octx.globalAlpha = 0.9; octx.beginPath(); octx.arc(x, y, 3.2, 0, Math.PI * 2); octx.fill();
        octx.globalAlpha = 0.35; octx.beginPath(); octx.arc(x, y + 10, 2.2, 0, Math.PI * 2); octx.fill(); octx.beginPath(); octx.arc(x, y + 20, 1.4, 0, Math.PI * 2); octx.fill();
        octx.globalCompositeOperation = 'source-over'; octx.globalAlpha = 1;
      } else if (p.k === 's') {
        p.vy += 160 * dt; p.vx *= (1 - 1.4 * dt); p.vy *= (1 - 1.4 * dt); p.x += p.vx * dt; p.y += p.vy * dt;
        octx.globalCompositeOperation = 'lighter'; octx.globalAlpha = Math.max(0, 1 - q); octx.fillStyle = p.col;
        octx.beginPath(); octx.arc(p.x, p.y, 3.4 * (1 - q * 0.5), 0, Math.PI * 2); octx.fill();
        octx.strokeStyle = p.col; octx.lineWidth = 2; octx.globalAlpha *= 0.55; octx.beginPath(); octx.moveTo(p.x, p.y); octx.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06); octx.stroke();
        octx.globalCompositeOperation = 'source-over'; octx.globalAlpha = 1;
      } else if (p.k === 'f') {
        const g = octx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 70);
        g.addColorStop(0, rgbaOf(p.col, 0.55 * (1 - q))); g.addColorStop(1, rgbaOf(p.col, 0));
        octx.fillStyle = g; octx.beginPath(); octx.arc(p.x, p.y, 70, 0, Math.PI * 2); octx.fill();
      }
      keep.push(p);
    }
    ovp = keep;
    if (!ovp.length) stopOverlay();
  }
  const FX_CAP = 240;
  function pushFx(f) { if (fx.length >= FX_CAP) { const i = fx.findIndex(function (x) { return x.type === 'shard' || x.type === 'glint' || x.type === 'bit'; }); fx.splice(i >= 0 ? i : 0, 1); } fx.push(f); }


  function setRaceOpen(on) {
    const board = $('raceboard'), chip = $('racechip');
    if (board) board.hidden = !on;
    if (chip) { chip.hidden = !!on; chip.setAttribute('aria-expanded', on ? 'true' : 'false'); }
  }
  function requestCloseSugar() {
    try { settleLife(); } catch (e) { }
    try { stopAllMusic(); } catch (e) { }
    try {
      if (root.parent && root.parent !== root) root.parent.postMessage({ type: 'ib-sugar-close' }, '*');
    } catch (e) { }
  }


  let tut = null, crush = null;
  /* ---- 1.9.222 Lives (1.9.223: one regenerates every hour up to 3). Losing or leaving a level part-way costs one.
     Family members can send a life (the Worker carries it); gifted lives can go above 3. ---- */
  let livesDemo = false, livesTimer = 0, livesInfo = null, heartsTimer = 0;
  function livesKey() { return 'ib-sugar-lives' + memberTag(); }
  function livesState() { const v = regenLives(ls.get(livesKey(), null)); ls.set(livesKey(), v); return v; }
  function lives() { return livesState().n; }
  function addLives(delta) { ls.set(livesKey(), changeLives(ls.get(livesKey(), null), delta)); paintHearts(); }
  function setLives(n) { const cur = livesState(); addLives((n | 0) - cur.n); }
  function nextLife() { return nextLifeMs(ls.get(livesKey(), null)); }
  function settleLife() {
    if (!st || st.tutorial || st.won || st.lifeDone) return;
    if (!(st.played || st.over)) return;
    st.lifeDone = true;
    addLives(-1);
  }
  function paintHearts() {
    const n = lives(), ms = nextLife();
    ['maphearts', 'hearts2'].forEach(function (id) {
      const el = $(id); if (!el) return;
      el.innerHTML = (n ? '<i aria-hidden="true">❤️</i>' : '<i aria-hidden="true">💔</i>') + '<b>' + n + '</b>' + (ms ? '<em class="hn">' + mmss(ms) + '</em>' : '');
      el.classList.toggle('out', !n);
      el.setAttribute('aria-label', n + (n === 1 ? ' life' : ' lives') + ' left' + (ms ? '. Next life in ' + Math.ceil(ms / 60000) + ' minutes.' : ''));
    });
    // Tick the mm:ss countdown once a second while a life is on its way.
    if (ms && !heartsTimer) heartsTimer = setInterval(function () { if (!nextLife()) { clearInterval(heartsTimer); heartsTimer = 0; } paintHearts(); }, 1000);
  }
  function livesApi() { const S = root.IBScores; return !livesDemo && S && S.who && S.who() && S.loadLives && S.postLives ? S : null; }
  // On each open of the map: collect any lives the family has sent.
  async function syncLives() {
    const S = livesApi(); if (!S) return;
    let info = null;
    try { info = await S.loadLives(); } catch (e) { info = null; }
    if (info) livesInfo = info;
    if (!info || !info.pending) return;
    let got = null;
    try { got = await S.postLives({ act: 'claim' }); } catch (e) { got = null; }
    if (got && got.claimed > 0) { livesInfo = got; addLives(got.claimed); showLives('gift', { claimed: got.claimed, from: got.from || [] }); }
  }
  function familyRows(info) {
    const fam = (info && info.family) || [];
    if (!fam.length) return '<p class="lv-none">Family members show up here once they have a family link.</p>';
    return '<ul class="lv-fam">' + fam.map(function (f) {
      const ic = raceIcon(f.icon);
      return '<li><span class="lf-i" aria-hidden="true">' + (ic ? ic.emoji : '🙂') + '</span><b>' + racerFirst(f.name) + '</b>' +
        '<button type="button" class="lf-send' + (f.sent ? ' sent' : '') + '" data-life-to="' + f.key + '"' + (f.sent ? ' disabled' : '') + '>' + (f.sent ? 'Sent today ✓' : 'Send ❤️') + '</button></li>';
    }).join('') + '</ul>';
  }
  function showLives(mode, data) {
    const ov = $('livesov'), card = $('livescard'); if (!ov || !card) return;
    data = data || {};
    clearInterval(livesTimer);
    const n = lives(), info = data.info || livesInfo;
    let html = '';
    if (mode === 'out') {
      html = '<div class="lv-big" aria-hidden="true">💔</div><h2>Out of lives</h2>' +
        '<p>A new life arrives every hour, up to ' + LIVES_MAX + '. Or ask the family to send you one.</p>' +
        '<div class="lv-count"><span>Next life in</span><b id="livescount">' + mmss(nextLife()) + '</b></div>' +
        '<button type="button" class="pri" id="askbtn"' + (info && info.asked ? ' disabled' : '') + '>' + (info && info.asked ? 'Asked today ✓' : '🙏 Ask family for lives') + '</button>' +
        '<p class="lv-msg" id="livesmsg" aria-live="polite">' + (data.msg || '') + '</p>' +
        '<button type="button" data-lives="close">Back to map</button>';
      ov.className = 'ov livesov out';
    } else if (mode === 'gift') {
      const from = data.from || [];
      const who = from.length ? Array.from(new Set(from)).join(' and ') : 'The family';
      html = '<div class="lv-big gift" aria-hidden="true">💝</div><h2>' + who + (from.length > 1 ? ' sent you lives!' : ' sent you a life!') + '</h2>' +
        '<p class="lv-plus">+' + (data.claimed || 1) + ' ❤️</p><p>You now have ' + n + (n === 1 ? ' life' : ' lives') + '.</p>' +
        '<button type="button" class="pri" data-lives="close">Thanks!</button>';
      ov.className = 'ov livesov gift';
    } else {
      html = '<div class="lv-hd"><span class="lv-hearts">' + (n ? '❤️' : '💔') + ' <b>' + n + '</b></span><h2>Lives</h2></div>' +
        '<p>Up to ' + LIVES_MAX + ' lives, with a new one every hour' + (nextLife() ? ' (next in ' + mmss(nextLife()) + ')' : '') + '. Losing or leaving a level uses one; tutorials and +3 moves never do.</p>' +
        '<h3>Send a life</h3><p class="lv-sub">One life a day to each family member.</p>' + familyRows(info) +
        (n ? '' : '<button type="button" class="pri" id="askbtn"' + (info && info.asked ? ' disabled' : '') + '>' + (info && info.asked ? 'Asked today ✓' : '🙏 Ask family for lives') + '</button>') +
        '<p class="lv-msg" id="livesmsg" aria-live="polite">' + (data.msg || '') + '</p>' +
        '<button type="button" data-lives="close">Close</button>';
      ov.className = 'ov livesov send';
    }
    card.innerHTML = html;
    ov.hidden = false;
    if (mode === 'out') livesTimer = setInterval(function () {
      const el = $('livescount'); if (!el || ov.hidden) { clearInterval(livesTimer); return; }
      el.textContent = mmss(nextLife());
      if (lives() > 0) { clearInterval(livesTimer); ov.hidden = true; paintHearts(); }
    }, 1000);
  }
  async function openLivesPanel() {
    showLives('send');
    const S = livesApi(); if (!S) return;
    try { const info = await S.loadLives(); if (info) { livesInfo = info; if (!$('livesov').hidden && $('livesov').classList.contains('send')) showLives('send'); } } catch (e) { }
  }
  async function livesAction(btn) {
    const msg = function (t) { const el = $('livesmsg'); if (el) el.textContent = t; };
    if (livesDemo) { msg('Demo: nothing was sent.'); return; }
    const S = livesApi();
    if (!S) { msg('Sending and asking need this phone\'s family link.'); return; }
    btn.disabled = true;
    if (btn.id === 'askbtn') {
      const r = await S.postLives({ act: 'ask' });
      if (r && r.ok) { livesInfo = r; btn.textContent = 'Asked today ✓'; msg('Asked! We told ' + r.told + (r.told === 1 ? ' family member.' : ' family members.')); }
      else if (r && r.err === 'already asked today') { btn.textContent = 'Asked today ✓'; msg('You already asked today.'); }
      else { btn.disabled = false; msg('Could not reach the family just now. Try again soon.'); }
      return;
    }
    const r = await S.postLives({ act: 'send', to: btn.dataset.lifeTo });
    if (r && (r.ok || r.err === 'already sent today')) { if (r.family) livesInfo = r; btn.textContent = 'Sent today ✓'; btn.classList.add('sent'); msg(r.ok ? 'Sent! ' + r.sent + ' gets a life ❤️' : 'Already sent today.'); }
    else { btn.disabled = false; msg('Could not send just now. Try again soon.'); }
  }
  // Test / screenshot helpers: never talk to the family backend.
  function seedLives(n, info, ageMs) {
    livesDemo = true; if (info) livesInfo = info;
    if (typeof ageMs === 'number') { ls.set(livesKey(), { v: 2, n: Math.max(0, n | 0), t: n < LIVES_MAX ? Date.now() - ageMs : null }); paintHearts(); } else setLives(n);
  }
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
    if (kind === 'bub') return '<span class="bubp"></span><span class="bubp sm"></span><span class="bubp"></span>';
    if (kind === 'liq') return '<span class="liqp"></span>';
    if (kind === 'garden') return '<span class="dbl"><i></i><i></i></span><span class="lock">🔒</span><span class="bubp sm"></span>';
    if (kind === 'glacier') return '<span class="ing">🎁</span><span class="ice thick"></span>';
    if (kind === 'oyster') return '<span class="ice thick"></span><span class="lock">🔒</span>';
    if (kind === 'harbour') return '<span class="jelly"></span><span class="bubp"></span>';
    if (kind === 'surf') return '<span class="ing">🎁</span><span class="ice"></span><span class="liqp sm"></span>';
    if (kind === 'swan') return '<span class="choco"></span><span class="jelly"></span><span class="bubp sm"></span><span class="liqp sm"></span>';
    if (kind === 'reef') return '<span class="jelly"></span><span class="bubp"></span><span class="bubp sm"></span>';
    if (kind === 'coconut') return '<span class="ing">🥥</span><span class="liqp sm"></span>';
    if (kind === 'sunset') return '<span class="jelly"></span><span class="lock">🔒</span><span class="liqp sm"></span>';
    if (kind === 'factory') return '<span class="choco"></span><span class="bubp sm"></span><span class="liqp sm"></span>';
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
    // 1.9.222 Hard / Super Hard levels get a dramatic banner on the goal card.
    const hard = hardOf(n);
    const ht = $('introhard');
    if (ht) {
      ht.hidden = !hard;
      ht.className = 'hardtag hard' + hard;
      ht.innerHTML = hard ? FLAME_CANDY + '<b>' + hardLabel(hard) + '</b>' + FLAME_CANDY : '';
    }
    if ($('introcard')) { $('introcard').classList.toggle('hard1', hard === 1); $('introcard').classList.toggle('hard2', hard === 2); }
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
  // 1.9.222 Hard levels: lv.hard is 1 (Hard) or 2 (Super Hard).
  const FLAME_CANDY = '<span class="flamecandy" aria-hidden="true"><i class="fc-c">🍬</i><i class="fc-f">🔥</i></span>';
  function hardOf(n) { const lv = LEVELS[(n | 0) - 1]; return (lv && lv.hard) || 0; }
  function hardLabel(h) { return h === 2 ? 'Super Hard Level' : h === 1 ? 'Hard Level' : ''; }
  let hardTimer = 0;
  function hideHardBan() { clearTimeout(hardTimer); if ($('hardban')) $('hardban').hidden = true; }
  function showHardBan(h) {
    const el = $('hardban'); if (!el || !h) return;
    el.className = 'hardban hard' + h;
    el.innerHTML = '<div class="hb-in">' + FLAME_CANDY + '<b>' + hardLabel(h) + '</b><em>' + (h === 2 ? 'The toughest stop yet. Make every move count!' : 'A tricky one. Plan your moves!') + '</em></div>';
    el.hidden = false;
    el.onclick = hideHardBan;
    playHardSting(h);
    // 1.9.229 The Hard level start is a major moment: said (with reverb) just after the sting.
    setTimeout(function () { if (st && st.lv && st.lv.hard === h && !st.over && screen === 'game' && voiceLive()) cheer(hardLine(h)); }, h === 2 ? 900 : 750);
    clearTimeout(hardTimer);
    hardTimer = setTimeout(hideHardBan, reduce ? 1500 : 2200);
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
    if (needBoot) bootLevel(n, { board: step.board, jelly: step.jelly, locks: step.locks, liq: step.liq, tutorial: true });
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
    const fresh = screen !== 'game' || lvNum !== n;
    screen = 'game';
    loadSayClips();
    lvNum = n;
    const lv = LEVELS[n - 1];
    doc.body.classList.add('ingame');
    paintScene(n);
    if (fresh) enterScreen($('game'));
    setHammer(false);
    stopOverlay();
    doc.body.classList.toggle('sarah', lv.theme === 'sarah');
    const hard = lv.hard || 0;
    doc.body.classList.toggle('hard1', hard === 1);
    doc.body.classList.toggle('hard2', hard === 2);
    hideHardBan();
    if (hard && !opt.tutorial) showHardBan(hard);
    paintHearts();
    $('lvname').textContent = 'Level ' + n + ' · ' + lv.name + (hard ? ' · ' + (hard === 2 ? 'Super Hard' : 'Hard') : '');
    paintGoalStrip(lv);
    st = newGame(opt.board ? { level: lv, board: fromRows(opt.board) } : { level: lv });
    if (opt.locks) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (+(opt.locks[r] && opt.locks[r][c]) && st.board[r][c] && st.board[r][c].c >= 0) st.board[r][c].lock = 1;
      }
    }
    if (opt.liq) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (+(opt.liq[r] && opt.liq[r][c]) && st.board[r][c] && st.board[r][c].c >= 0) st.board[r][c].liq = 1;
      }
    }
    if (opt.jelly) st.jelly = parseDigits(opt.jelly);
    if (opt.tutorial) st.tutorial = true;
    sel = null; busy = false; lastAct = now();
    crush = null; warned3 = false; hintOn = false; hintHold = false; hintMove = null; hideHintHand(); hideMovesWarn(); lastSaying = ''; sayUntil = 0; clearSayQueue(); hideSaying();
    resetStreak(); hideCrushBan();
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
    const v = voiceOn ? '🗣️ Voice on' : '🤐 Voice off';
    if ($('voicebtn')) $('voicebtn').textContent = v;
    if ($('mapvoice')) { $('mapvoice').textContent = voiceOn ? '🗣️' : '🤐'; $('mapvoice').setAttribute('aria-label', v); $('mapvoice').classList.toggle('off', !voiceOn); }
  }
  function objText(g) {
    if (!g || !g.lv) return '';
    const lv = g.lv, bits = [];
    if (lv.collect) bits.push((NAMES[lv.collect.color] || 'Sweets') + ' ' + (g.collected[lv.collect.color] || 0) + ' / ' + lv.collect.n);
    if (lv.jelly) bits.push('Jelly ' + jellyLeft(g) + ' left');
    if (lv.ice) bits.push('Icing ' + iceLeft(g.board) + ' left');
    if (lv.ings && lv.ings.length) bits.push('Ingredients ' + ((lv.ings.length - (g.ingsLeft || 0))) + ' / ' + lv.ings.length);
    if (lv.locks) bits.push('Locks ' + locksLeft(g.board) + ' left');
    if (lv.bub) bits.push('Bubbles ' + bubLeft(g.board) + ' left');
    if (lv.liq) bits.push('Liquorice ' + liqLeft(g.board) + ' left');
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
    paintBoosters();
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
  // ---- 1.9.227 Saying pace: shown and spoken together, then SAY_REST_MS of quiet. ----
  let sayFreeAt = 0, sayPending = null, sayPendTimer = 0;
  function voiceLive() { return soundOn && voiceOn && !(doc && doc.hidden); }
  function sayFree() { return now() >= sayFreeAt && !sayPending; }
  function sayShowNow(text, show) {
    show();
    const d = speakLine(text);
    sayFreeAt = now() + (d > 0 ? d * 1000 : SAY_SHOW_MS) + SAY_REST_MS;
  }
  // Show-and-speak if the rest is over; otherwise a big line waits (queue of one) and a minor one is dropped unseen.
  function sayGate(text, big, show) {
    if (!voiceLive()) { show(); return true; }
    if (sayFree()) { sayShowNow(text, show); return true; }
    if (!big || sayPending) return false;
    sayPending = { text: text, show: show, st: st };
    sayPendTimer = setTimeout(flushSay, Math.max(0, sayFreeAt - now()));
    return true;
  }
  function flushSay() {
    const p = sayPending; sayPending = null; sayPendTimer = 0;
    if (!p || p.st !== st || screen !== 'game' || !st || st.over) return;
    if (!voiceLive()) { p.show(); return; }
    sayShowNow(p.text, p.show);
  }
  function clearSayQueue() { if (sayPendTimer) clearTimeout(sayPendTimer); sayPendTimer = 0; sayPending = null; sayFreeAt = 0; }
  function showSaying(step, i) {
    const chain = step && (step.cascade || (i + 1));
    const kind = sayingKind(step, chain, st);
    if (!kind) return null;
    const t = now(), big = sayBig(kind), live = voiceLive();
    // 1.9.229 Minor sayings: a candy sound every time, the line on screen at normal pace (no spoken rest).
    // Major ones with Voice off do the same. Major ones with Voice on are spoken, with the SAY_REST_MS rest.
    if (!big || !live) {
      candySfx(kind, chain);
      if (t < sayUntil || sayPending) return null;
      const text = pickSaying(kind, lastSaying);
      if (!text) return null;
      paintSaying(text, kind);
      return text;
    }
    if (!sayFree() && sayPending) return null;
    const text = pickSaying(kind, lastSaying);
    if (!text) return null;
    return sayGate(text, big, () => paintSaying(text, kind)) ? text : null;
  }
  function paintSaying(text, kind) {
    lastSaying = text;
    sayUntil = now() + sayShowGap(0, reduce);
    const el = $('saypop');
    if (el) {
      el.textContent = text;
      el.style.color = sayingColor(kind);
      el.hidden = false;
      el.className = 'saypop kind-' + kind + (streakTierNow ? ' t' + streakTierNow : '');
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
      if (sayTimer) clearTimeout(sayTimer);
      sayTimer = setTimeout(hideSaying, reduce ? 900 : 1100);
    }
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
      const n = Math.max(1, Math.min(LV_COUNT, r.stop || 1));
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
    race = { racers: racers, offline: !!offline, mine: self, event: raceDemo ? race.event : ((!offline && data && data.event) || null) };
    renderRacers();
    renderRaceBoard();
    renderRaceEvent(true);
  }
  /* ---- 1.9.222 Family race events: "Race on!" card, a 0-5 progress bar on the map and level screens, prizes. ---- */
  const RACE_GOAL = 5;
  function raceSeen(kind) { const v = ls.get('ib-sugar-race-' + kind, []); return Array.isArray(v) ? v : []; }
  function markRace(kind, id) { const v = raceSeen(kind); if (v.indexOf(id) < 0) { v.push(id); ls.set('ib-sugar-race-' + kind, v.slice(-30)); } }
  function raceTimeLeft(ev) {
    const ms = Math.max(0, (ev.ends || 0) - Date.now()), h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4);
    return h >= 1 ? h + 'h ' + m + 'm left' : m + 'm left';
  }
  function raceBarHtml(ev) {
    const goal = ev.goal || RACE_GOAL;
    const rows = ev.racers.slice().sort(function (a, b) { return (b.n - a.n) || ((b.mine ? 1 : 0) - (a.mine ? 1 : 0)); }).map(function (r) {
      const ic = raceIcon(r.icon) || RACE_ICONS[0];
      const pct = Math.round(Math.min(goal, r.n) / goal * 100);
      return '<li class="' + (r.mine ? 'mine' : '') + (r.winner ? ' won' : '') + '"><span class="rb-name">' + (r.mine ? 'You' : racerFirst(r.name)) + '</span>' +
        '<span class="rb-track" style="--c:' + ic.color + '"><i class="rb-fill" style="width:' + pct + '%"></i>' +
        Array.from({ length: goal - 1 }, function (_, k) { return '<i class="rb-tick" style="left:' + ((k + 1) / goal * 100) + '%"></i>'; }).join('') +
        '<span class="rb-icon" style="left:' + pct + '%" aria-hidden="true">' + ic.emoji + '</span></span>' +
        '<b class="rb-n">' + Math.min(goal, r.n) + '/' + goal + '</b>' + (r.winner ? '<span class="rb-cup" aria-hidden="true">🏆</span>' : '') + '</li>';
    }).join('');
    const head = ev.done
      ? (ev.winner ? '🏆 ' + (ev.won ? 'You won the race!' : racerFirst(ev.winner) + ' won the race') : '🏁 Race over')
      : '🏁 Race on! First to ' + goal + ' wins';
    return '<div class="rb-hd"><b>' + head + '</b>' + (ev.done ? '' : '<em>' + raceTimeLeft(ev) + '</em>') + '</div><ol>' + rows + '</ol>';
  }
  // In a level: one shared 0-5 track with everyone's icon on it, so the board keeps its room.
  function raceBarMini(ev) {
    const goal = ev.goal || RACE_GOAL;
    const pos = {};
    const icons = ev.racers.map(function (r) {
      const ic = raceIcon(r.icon) || RACE_ICONS[0], n = Math.min(goal, r.n), k = pos[n] = (pos[n] || 0) + 1;
      return '<span class="rm-icon' + (r.mine ? ' mine' : '') + '" style="left:' + (n / goal * 100) + '%;margin-top:' + ((k - 1) * -9) + 'px" title="' + (r.mine ? 'You' : racerFirst(r.name)) + ' ' + n + '/' + goal + '">' + ic.emoji + '</span>';
    }).join('');
    const me = ev.racers.find(function (r) { return r.mine; });
    return '<div class="rm"><b class="rm-l">' + (ev.done ? '🏆' : '🏁') + '</b><span class="rm-track">' +
      Array.from({ length: goal + 1 }, function (_, k) { return '<i class="rm-tick" style="left:' + (k / goal * 100) + '%"><em>' + k + '</em></i>'; }).join('') + icons +
      '</span><b class="rm-r">' + (me ? 'You ' + Math.min(goal, me.n) + '/' + goal : '') + '</b></div>';
  }
  function renderRaceEvent(cards) {
    const ev = race.event;
    ['racebar', 'racebar2'].forEach(function (id) {
      const el = $(id); if (!el) return;
      el.hidden = !ev;
      el.classList.toggle('done', !!(ev && ev.done));
      el.innerHTML = ev ? (id === 'racebar2' ? raceBarMini(ev) : raceBarHtml(ev)) : '';
      el.setAttribute('aria-label', ev ? 'Family race: ' + ev.racers.map(function (r) { return (r.mine ? 'you' : racerFirst(r.name)) + ' ' + r.n + ' of ' + (ev.goal || RACE_GOAL); }).join(', ') : '');
    });
    if (!ev || !cards || screen === 'game') return;
    if (!ev.done && raceSeen('seen').indexOf(ev.id) < 0) showRaceOn(ev);
    else if (ev.done && raceSeen('claimed').indexOf(ev.id) < 0) showRaceResult(ev);
  }
  function showRaceOn(ev) {
    const ov = $('raceon'); if (!ov) return;
    const others = ev.racers.filter(function (r) { return !r.mine; }).map(function (r) { return racerFirst(r.name); });
    const stop = stopForLevel(ev.stop);
    $('raceontitle').textContent = 'Race on!';
    $('raceonmsg').textContent = 'You vs ' + (others.join(', ') || 'the family') + (stop ? ', from ' + stop.place : '') + '. First to win ' + (ev.goal || RACE_GOAL) + ' levels wins boosters and a trophy!';
    $('raceonlist').innerHTML = ev.racers.map(function (r) { const ic = raceIcon(r.icon) || RACE_ICONS[0]; return '<li style="--c:' + ic.color + '"><span class="ri">' + ic.emoji + '</span><b>' + (r.mine ? 'You' : racerFirst(r.name)) + '</b></li>'; }).join('<li class="vs" aria-hidden="true">vs</li>');
    $('raceonprize').textContent = '48 hours. If nobody gets to ' + (ev.goal || RACE_GOAL) + ', whoever is in front wins.';
    $('raceonbtn').textContent = "Let's race!";
    ov.className = 'ov raceov';
    ov.hidden = false;
    markRace('seen', ev.id);
    if (!raceDemo) playSting();
  }
  // Prizes: the winner gets one of every booster and a trophy; everyone else gets a +3 moves consolation.
  function racePrize(ev) { return ev.won ? { id: 'all', n: 1 } : { id: 'moves', n: 1 }; }
  function trophies() { return Math.max(0, ls.get('ib-sugar-trophies', 0) | 0); }
  function showRaceResult(ev) {
    const ov = $('raceon'); if (!ov) return;
    const prize = racePrize(ev);
    if (raceSeen('claimed').indexOf(ev.id) < 0) {
      boosts = addPrize(inv(), prize); saveBoosts();
      if (ev.won) ls.set('ib-sugar-trophies', trophies() + 1);
      markRace('claimed', ev.id);
    }
    $('raceontitle').textContent = ev.won ? 'You won the race!' : (ev.winner ? racerFirst(ev.winner) + ' won the race' : 'Race over');
    $('raceonmsg').textContent = ev.won
      ? (ev.why === 'timeout' ? "Time's up and you were in front. Sweet victory!" : 'First to ' + (ev.goal || RACE_GOAL) + ' wins. You are the family champion!')
      : (ev.winner ? 'Great racing! Here is a consolation prize.' : 'Time ran out. Here is a little something for racing.');
    $('raceonlist').innerHTML = ev.won ? '<li class="trophy"><span class="ri">🏆</span><b>Race Champion' + (trophies() > 1 ? ' ×' + trophies() : '') + '</b></li>' : '';
    $('raceonprize').textContent = ev.won ? 'Prize: 🍬 +3 moves, 🔨 Hammer and 🔀 Shuffle, plus a trophy badge.' : 'Consolation: 🍬 +3 moves booster.';
    $('raceonbtn').textContent = ev.won ? 'Yay!' : 'Thanks!';
    ov.className = 'ov raceov result' + (ev.won ? ' won' : '');
    ov.hidden = false;
    if (ev.won && !raceDemo) playSting();
  }
  // Local test / screenshot helper: show a race with demo data. Never talks to the family backend.
  function seedRaceEvent(ev, opt) {
    raceDemo = true;
    race.event = ev || null;
    if (ev && opt && opt.quiet) markRace(ev.done ? 'claimed' : 'seen', ev.id);
    renderRaceEvent(!(opt && opt.quiet));
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
  function racePayload(icon, self, lwAgain) {
    const b = { icon: icon, stop: self.stop, stars: self.stars, sid: stopId(self.stop), wins: Math.max(0, prog.wins | 0) };
    const lw = raceLw || lwAgain || 0;
    if (lw) b.lw = lw;
    raceLw = 0;
    return b;
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
      if (push && S.saveRace) { try { await S.saveRace(racePayload(self.icon, self)); } catch (e) { } }
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
        const raceLwSent = raceLw;
        const saved = await S.saveRace(racePayload(icon, self));
        if (saved && saved.err === 'icon taken') saved.lw = raceLwSent;
        if (saved && saved.err === 'icon taken' && saved.suggested && isRaceIcon(saved.suggested)) {
          icon = saved.suggested;
          ls.set('ib-sugar-icon', icon);
          self.icon = icon;
          await S.saveRace(racePayload(icon, self, saved && saved.lw));
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
    const future = '';
    const wide = stage && stage.querySelector('#sr-path-wide');
    const dash = stage && stage.querySelector('#sr-path-dash');
    const fut = stage && stage.querySelector('#sr-future');
    if (wide) wide.setAttribute('d', live);
    if (dash) dash.setAttribute('d', live);
    if (fut) fut.setAttribute('d', future);
    path.innerHTML = '';
    const here = Math.min(LV_COUNT, Math.max(1, prog.open));
    LEVELS.forEach((lv, i) => {
      const n = i + 1, open = n <= prog.open, stars = prog.stars[i] || 0, stop = MAP_STOPS[i];
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'lv lab-' + (stop.label || 'right') + (lv.theme === 'sarah' ? ' sarah' : '') + (lv.hard ? ' hard hard' + lv.hard : '') + (open ? ' open' : '') + (stars ? ' done' : '') + (n === here ? ' here' : '') + ' kind-' + (stop.kind || 'town');
      b.disabled = !open;
      b.dataset.n = String(n);
      b.style.left = (stop.x / MAP_W * 100) + '%';
      b.style.top = (stop.y / MAP_H * 100) + '%';
      const mark = stop.kind === 'house' ? '🏠' : (stop.kind === 'post' ? '✉️' : (stop.kind === 'station' ? '🚂' : (stop.kind === 'island' ? '🌴' : '')));
      const starHtml = [0, 1, 2].map(k => '<span class="' + (k < stars ? 'on' : '') + '">★</span>').join('');
      const badge = prog.badges[i] && lv.badge ? '<span class="gotbadge" aria-hidden="true">' + lv.badge.icon + '</span>' : '';
      b.innerHTML = '<span class="pin"><span class="no">' + n + '</span>' + (mark ? '<span class="mark" aria-hidden="true">' + mark + '</span>' : '') + (lv.hard ? '<span class="hardmark" aria-hidden="true">🔥</span>' : '') + '</span><span class="st">' + starHtml + '</span>' +
        '<span class="meta"><b>' + stop.place + '</b><em>' + lv.name + '</em></span>' + badge;
      b.setAttribute('aria-label', (open ? 'Play ' : 'Locked: ') + 'level ' + n + ', ' + lv.name + ', ' + stop.place + (lv.hard ? ', ' + hardLabel(lv.hard) : '') + (stars ? ', ' + stars + ' stars' : '') + (prog.badges[i] && lv.badge ? ', badge ' + lv.badge.name : ''));
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
    if (trophies()) {
      const el = doc.createElement('div');
      el.className = 'badge got trophy';
      el.innerHTML = '<i>🏆</i><b>Race Champion' + (trophies() > 1 ? ' ×' + trophies() : '') + '</b>';
      shelf.appendChild(el);
      if (mini) { const d = doc.createElement('i'); d.className = 'got'; d.textContent = '🏆'; d.title = 'Race Champion'; mini.appendChild(d); }
    }
    renderRacers();
    renderRaceBoard();
    renderRaceEvent(false);
  }
  function scrollMapTo(target, opts) {
    const view = $('mapview');
    if (!view) return;
    opts = opts || {};
    const motion = (opts.behavior) || (reduce ? 'auto' : 'smooth');
    let el = null, top = 0, left = 0, useEl = true;
    if (target === 'start' || target === 'north') {
      useEl = false; top = 0; left = Math.max(0, view.scrollWidth / 2 - view.clientWidth / 2);
    } else if (target === 'australia') {
      el = view.querySelector('.lv[data-n="21"]') || view.querySelector('.lv[data-n="20"]');
    } else if (target === 'pacific') {
      el = view.querySelector('.lv[data-n="18"]') || view.querySelector('.lv[data-n="17"]');
    } else if (target === 'south') {
      // 1.9.219 'south' frames the South Island stops, Kaikōura down to Dunedin.
      const n9 = view.querySelector('.lv[data-n="11"]') || view.querySelector('.lv[data-n="9"]');
      const chch = view.querySelector('.lv[data-n="15"]') || view.querySelector('.future-stop[data-place="Bluff"]');
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
      const n = target == null ? Math.min(LV_COUNT, Math.max(1, prog.open)) : target;
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
    settleLife();
    if (!(opts && opts.keepSong)) stopEnd();
    const wasScreen = screen;
    screen = 'map';
    if ($('goalnext') && !(opts && opts.keepNext)) $('goalnext').hidden = true;
    const winPath = doc.querySelector('#sr-path-win');
    if (winPath && !(opts && opts.keepPath)) { winPath.classList.remove('on'); winPath.setAttribute('d', ''); }
    const fromGame = wasScreen !== 'map' || !$('map').dataset.seen;
    $('game').hidden = true; $('intro').hidden = true; $('end').hidden = true; $('map').hidden = false;
    $('map').dataset.seen = '1';
    doc.body.classList.remove('sarah', 'ingame', 'hammering', 'hard1', 'hard2');
    hideHardBan();
    hammerMode = false;
    doc.body.classList.add('onmap');
    if (fromGame && !(opts && opts.keepSong)) enterScreen($('map'));
    renderMap(); paintButtons(); paintSpinBtn();
    syncRace(true);
    paintHearts(); syncLives();
    const scrollTo = opts && opts.scroll != null ? opts.scroll : Math.min(LV_COUNT, Math.max(1, prog.open));
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
    // 1.9.222 Lives: settle the level being left, then a level needs a life to start (tutorials never cost one).
    settleLife();
    if (lives() <= 0) { tut = null; hideTutUi(); showLives('out'); return; }
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
    if (res && res.valid && !st.tutorial) st.played = true; // 1.9.222 a real move: leaving now costs a life
    if (A) moveTo(A, z[0], z[1], 160); if (Z) moveTo(Z, a[0], a[1], 160);
    await wait(170);
    if (!res.valid) { if (A) moveTo(A, a[0], a[1], 180); if (Z) moveTo(Z, z[0], z[1], 180); await wait(190); busy = false; return; }
    hud();
    const plain = streakGain(res.steps) < 0;
    for (let i = 0; i < res.steps.length; i++) await showStep(res.steps[i], i, { streak: !plain });
    if (plain) addStreak(-1);
    if (res.spread) { const t = st.board[res.spread.r][res.spread.c]; if (t) { const s = sprite(t, res.spread.r, res.spread.c); s.grow = now(); } }
    // 1.9.219 Liquorice creeps after two moves in a row that free none; the move before, it gives a warning.
    if (res.liqSpread) {
      const lr = res.liqSpread.r, lc = res.liqSpread.c, t = st.board[lr] && st.board[lr][lc];
      if (t) {
        const s = sprites.get(t.id) || sprite(t, lr, lc); s.t = t; s.grow = now();
        const [x, y] = cellXY(lr, lc);
        fx.push({ type: 'ring', x, y, t0: now(), dur: 520, col: '#4a2a44', big: 1.3 });
        addText('Liquorice creeps!', x, y, 20, '#f3d1ff');
        await wait(360);
      }
    } else if (!st.tutorial && st.lv && st.lv.liq && st.liqIdle === LIQ_IDLE - 1 && liqLeft(st.board)) {
      addText('Free the liquorice!', W / 2, W * .12, 18, '#f3d1ff');
    }
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
  // 1.9.222 Lightning: crackling, branching bolts from a colour bomb to every sweet it takes,
  // in the matched colour with a white core. Smaller arcs link striped/wrapped combos.
  function boltTargets(s, f) {
    const out = [];
    for (const p of s.popped) {
      if (p.r === f.r && p.c === f.c) continue;
      if (f.color >= 0 && p.color !== f.color) continue;
      out.push(p); if (out.length >= 36) break;
    }
    return out;
  }
  async function lightning(s) {
    const fired = s.fired || [];
    const bombs = fired.filter(function (f) { return f.s === 'b'; });
    const others = fired.filter(function (f) { return f.s !== 'b'; });
    const combo = !bombs.length && others.length >= 2;
    if (!bombs.length && !combo) return;
    if (crush && crush.skip) return;
    const t = now();
    if (reduce) {
      // Reduced motion: a simple highlight on the targets, no bolts.
      for (const f of bombs) for (const p of boltTargets(s, f)) { const [x, y] = cellXY(p.r, p.c); fx.push({ type: 'ring', x, y, t0: t, dur: 360, col: '#ffffff', big: 0.9 }); }
      return;
    }
    let made = 0;
    for (const f of bombs) {
      const [x0, y0] = cellXY(f.r, f.c);
      fx.push({ type: 'flash', x: x0, y: y0, col: '#ffffff', t0: t, dur: 300 });
      for (const p of boltTargets(s, f)) {
        if (made >= 40) break;
        const [x1, y1] = cellXY(p.r, p.c);
        const col = COL[p.color >= 0 ? p.color : made % 6][0];
        fx.push({ type: 'bolt', x0, y0, x1, y1, col, w: 1, seed: made * 7 + 3, t0: t + made * 6, dur: 560 }); made++;
      }
      // A bomb combined with other specials: arcs from the bomb to each one too.
      for (const o of others) { if (made >= 46) break; const [x1, y1] = cellXY(o.r, o.c); fx.push({ type: 'bolt', x0, y0, x1, y1, col: '#ffe066', w: .8, seed: made * 5 + 1, t0: t, dur: 520 }); made++; }
    }
    if (combo) {
      for (let k = 0; k < others.length && k < 8; k++) {
        const a = others[k], b = others[(k + 1) % others.length];
        if (a === b) continue;
        const [x0, y0] = cellXY(a.r, a.c), [x1, y1] = cellXY(b.r, b.c);
        fx.push({ type: 'bolt', x0, y0, x1, y1, col: '#9fe8ff', w: .55, seed: k * 11 + 2, t0: t, dur: 420 });
      }
    }
    playZap(!!bombs.length);
    // Let the zap land before the sweets clear.
    await wait((crush && crush.fast ? 50 : bombs.length ? 240 : 110) * SP);
  }
  function boltPath(f, bucket) {
    const R = rng(f.seed * 131 + bucket * 17 + 1);
    const dx = f.x1 - f.x0, dy = f.y1 - f.y0, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const segs = Math.max(4, Math.min(12, Math.round(len / (CS * .34))));
    const amp = CS * .32 * (f.w || 1);
    const main = [];
    for (let k = 0; k <= segs; k++) {
      const u = k / segs, j = (k === 0 || k === segs) ? 0 : (R() - .5) * amp * 2 * Math.sin(Math.PI * u + .2);
      main.push([f.x0 + dx * u + nx * j, f.y0 + dy * u + ny * j]);
    }
    const bi = Math.max(1, Math.floor(segs * (.35 + R() * .3)));
    const ang = Math.atan2(dy, dx) + (R() < .5 ? -1 : 1) * (.5 + R() * .4);
    const bl = len * (.18 + R() * .16), branch = [main[bi]];
    for (let k = 1; k <= 3; k++) {
      const [px, py] = branch[k - 1];
      branch.push([px + Math.cos(ang) * bl / 3 + (R() - .5) * amp * .8, py + Math.sin(ang) * bl / 3 + (R() - .5) * amp * .8]);
    }
    return { main, branch, bi };
  }
  function strokePts(pts, n) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k <= n && k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.stroke();
  }
  async function showStep(s, i, opt) {
    opt = opt || {};
    await lightning(s);
    const t = now();
    let cx = 0, cy = 0, n = 0;
    const many = s.popped.length;
    const per = reduce ? 0 : many > 20 ? 2 : many > 10 ? 3 : 5;
    for (const p of s.popped) {
      const sp = sprites.get(p.id); if (sp) sp.pop = t;
      const [x, y] = cellXY(p.r, p.c); cx += x; cy += y; n++;
      if (p.color >= 0 && per) {
        // 1.9.218 Juicier matches: glossy candy shards fly out, with a sparkle burst on each sweet.
        for (let k = 0; k < per; k++) { const a = Math.random() * Math.PI * 2, v = .5 + Math.random() * .7; pushFx({ type: 'shard', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .45, rot: Math.random() * 6, vr: (Math.random() - .5) * 10, sz: .07 + Math.random() * .06, col: COL[p.color][(k % 2) ? 0 : 1], t0: t, dur: 520 + Math.random() * 180 }); }
        pushFx({ type: 'glint', x, y, dx: (Math.random() - .5) * .3, dy: -.25, sz: .16 + Math.random() * .08, rot: Math.random() * 3, t0: t + Math.random() * 60, dur: 420 });
      }
      // 1.9.219 Freed liquorice snaps into dark twisty bits.
      if (p.liq && !reduce) for (let k = 0; k < 6; k++) { const a = k * 1.05 + Math.random() * .4, v = .6 + Math.random() * .5; pushFx({ type: 'shard', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .4, rot: a, vr: (Math.random() - .5) * 12, sz: .09, col: k % 2 ? '#1c0f18' : '#4a2a44', t0: t, dur: 620 }); }
    }
    // 1.9.219 Popped sugar bubbles burst in a blue ring with a twinkle; chained pops follow a beat later.
    for (const b of s.blocked || []) {
      if (b.kind !== 'bub') continue;
      const [x, y] = cellXY(b.r, b.c), t1 = t + (b.chain ? 90 : 0);
      fx.push({ type: 'ring', x, y, t0: t1, dur: 440, col: '#7fd3ff', big: 1.2 });
      if (!reduce) for (let k = 0; k < 3; k++) pushFx({ type: 'glint', x: x + (Math.random() - .5) * .4, y: y + (Math.random() - .5) * .4, dx: 0, dy: -.2, sz: .12 + Math.random() * .08, rot: 0, t0: t1 + k * 50, dur: 380 });
      const sp = st.board[b.r] && st.board[b.r][b.c] && sprites.get(st.board[b.r][b.c].id); if (sp) sp.grow = t1;
    }
    for (const f of s.fired || []) {
      const [fx0, fy0] = cellXY(f.r, f.c);
      const t0 = st.board[f.r] && st.board[f.r][f.c];
      const col = f.s === 'b' ? (f.color >= 0 ? COL[f.color][1] : '#ffffff') : (COL[(s.popped.find(p => p.r === f.r && p.c === f.c) || {}).color] || COL[(t0 && t0.c >= 0) ? t0.c : 0])[1];
      if (f.s === 'row' || f.s === 'col') {
        fx.push({ type: 'beam', s: f.s, r: f.r, c: f.c, t0: t, dur: 420 * SP });
        if (!reduce) fx.push({ type: 'beam2', s: f.s, r: f.r, c: f.c, col, t0: t, dur: 480 });
      } else if (f.s === 'w') {
        fx.push({ type: 'ring', x: fx0, y: fy0, t0: t, dur: 480 * SP, col, big: 1.6 });
        if (!reduce) { fx.push({ type: 'ring', x: fx0, y: fy0, t0: t, dur: 620, col: '#ffffff', big: 2.4 }); fx.push({ type: 'flash', x: fx0, y: fy0, col, t0: t, dur: 380 }); }
      } else {
        fx.push({ type: 'ring', x: fx0, y: fy0, t0: t, dur: 480 * SP });
        if (!reduce) {
          fx.push({ type: 'flash', x: fx0, y: fy0, col: '#ffffff', t0: t, dur: 420 });
          let rays = 36; // 1.9.222 lightning bolts (drawn before the clear) replace the old straight rays
          for (const p of s.popped) {
            if (rays >= 36 || (p.r === f.r && p.c === f.c)) continue;
            if (f.color >= 0 && p.color !== f.color) continue;
            const [x1, y1] = cellXY(p.r, p.c);
            fx.push({ type: 'ray', x0: fx0, y0: fy0, x1, y1, col: f.color >= 0 ? COL[f.color][0] : COL[rays % 6][0], t0: t, dur: 460 }); rays++;
          }
        }
      }
    }
    if (opt.streak !== false) addStreak(streakStepGain(s, i));
    callout(s, i);
    if (n) addText('+' + s.points, cx / n, cy / n, 22, '#fff');
    showSaying(s, i);
    if (opt.shake !== false) shake(shakeLevel([s]) >= 2 ? 2 : (i >= 2 ? 1 : shakeLevel([s])));
    for (const m of s.madeTiles || []) { const sp = sprite(m.t, m.r, m.c); sp.grow = t; if (!reduce) { const [x, y] = cellXY(m.r, m.c); pushFx({ type: 'glint', x, y, dx: 0, dy: 0, sz: .45, rot: 0, t0: t, dur: 520 }); } }
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
  // Screen shake on big combos (none with reduced motion). Shakes the tray, not the page.
  let shakeT = 0;
  function shake(level) {
    if (reduce || !level) return;
    const el = doc.querySelector('#game .tray');
    if (!el) return;
    if (el.classList.contains('shk2') && level < 2) return;
    el.classList.remove('shk1', 'shk2'); void el.offsetWidth; el.classList.add(level >= 2 ? 'shk2' : 'shk1');
    if (shakeT) clearTimeout(shakeT);
    shakeT = setTimeout(function () { el.classList.remove('shk1', 'shk2'); }, 520);
  }
  // ---------- Sweet streak meter ----------
  function addStreak(gain) {
    if (!st || st.tutorial || (tut && tut.active) || !gain) return;
    const before = streakTier(streakPts);
    streakPts = streakNext(streakPts, gain);
    paintStreak(streakTier(streakPts) > before);
  }
  function resetStreak() { streakPts = 0; streakTierNow = 0; paintStreak(false); }
  function paintStreak(up) {
    const el = $('streak'); if (!el) return;
    const tier = streakTier(streakPts);
    streakTierNow = tier;
    const fill = $('streakfill'); if (fill) fill.style.width = (streakFill(streakPts) * 100).toFixed(0) + '%';
    const x = $('streakx'); if (x) x.textContent = tier ? '×' + (tier + 1) : '';
    for (let i = 0; i <= STREAK_MAX_TIER; i++) el.classList.toggle('t' + i, i === tier);
    if (up && tier > 0) {
      el.classList.remove('up'); void el.offsetWidth; el.classList.add('up');
      const pop = $('streakpop');
      // 1.9.227 A streak level-up is a big line: shown and said together, waiting its turn if a saying was just said.
      if (pop) { const name = STREAK_NAMES[tier], label = name + ' ×' + (tier + 1); sayGate(name, true, function () { pop.textContent = label; pop.hidden = false; pop.classList.remove('go'); void pop.offsetWidth; pop.classList.add('go'); setTimeout(function () { pop.hidden = true; }, reduce ? 900 : 1400); }); }
      playStarChime(Math.min(2, tier - 1));
    }
  }
  // ---------- 1.9.218 Scenes, screen transitions, boosters, daily spin ----------
  function paintScene(n) {
    const el = $('scene'); if (!el) return;
    if (el.dataset.n === String(n)) return;
    el.dataset.n = String(n);
    const sc = sceneFor(n);
    el.className = 'scene scene-' + sc.id + (sc.night ? ' night' : '');
    el.innerHTML = '<div class="scene-in">' + sceneSvg(n) + sceneSprites(n) + '</div>';
    doc.body.classList.toggle('night', !!sc.night);
  }
  function enterScreen(el) {
    if (!el || reduce) return;
    el.classList.remove('scr-in'); void el.offsetWidth; el.classList.add('scr-in');
    setTimeout(function () { el.classList.remove('scr-in'); }, 600);
  }
  function boostKey() { return 'ib-sugar-boosters' + memberTag(); }
  function inv() { if (!boosts) boosts = normBoosters(ls.get(boostKey(), null)); return boosts; }
  function saveBoosts() { ls.set(boostKey(), normBoosters(boosts)); }
  function boostOk() { return !!(screen === 'game' && st && !st.over && !st.tutorial && !(tut && tut.active) && !(crush && crush.active)); }
  function paintBoosters() {
    const bar = $('boosters'); if (!bar) return;
    const have = inv(), ok = boostOk();
    BOOSTERS.forEach(function (b) {
      const btn = bar.querySelector('[data-boost="' + b.id + '"]'); if (!btn) return;
      const n = have[b.id] || 0;
      const num = btn.querySelector('.bn'); if (num) num.textContent = String(n);
      btn.classList.toggle('zero', !n);
      btn.classList.toggle('on', b.id === 'hammer' && hammerMode);
      btn.disabled = !ok || (!n && !(b.id === 'hammer' && hammerMode));
      btn.setAttribute('aria-label', b.name + ', ' + n + ' left');
    });
  }
  function setHammer(on) {
    hammerMode = !!on;
    doc.body.classList.toggle('hammering', hammerMode);
    const hint = $('boosthint');
    if (hint) { hint.hidden = !hammerMode; hint.textContent = hammerMode ? 'Tap a sweet to smash it with the lolly hammer.' : ''; }
    paintBoosters();
  }
  function boostFlash(id) {
    const btn = doc.querySelector('[data-boost="' + id + '"]');
    if (btn && !reduce) { btn.classList.remove('used'); void btn.offsetWidth; btn.classList.add('used'); }
  }
  async function useBoost(id) {
    if (!boostOk() || busy) return;
    if (id === 'hammer') { if (hammerMode) { setHammer(false); return; } if (inv().hammer > 0) setHammer(true); return; }
    const took = takeBooster(inv(), id);
    if (!took.ok) return;
    setHammer(false);
    noteActivity();
    if (id === 'moves') {
      boosts = took.inv; saveBoosts(); boostFlash(id);
      st.moves += EXTRA_MOVES;
      if (st.moves > MOVES_WARN_AT) warned3 = false;
      addText('+' + EXTRA_MOVES + ' moves', W / 2, W / 2, 28, '#ffe066');
      playRise(3);
      const mc = $('movecount'); if (mc && !reduce) { mc.classList.remove('tick'); void mc.offsetWidth; mc.classList.add('tick'); }
      hud();
    } else if (id === 'shuffle') {
      if (!shuffleBooster(st)) return;
      boosts = took.inv; saveBoosts(); boostFlash(id);
      busy = true; hintMove = null; hintOn = false; hideHintHand();
      playWhoosh('w');
      addText('Shuffle!', W / 2, W / 2, 30, '#fff');
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const t = st.board[r][c]; if (!t || isHole(t)) continue;
        const s = sprites.get(t.id) || sprite(t, r, c); moveTo(s, r, c, 420);
      }
      await wait(440);
      busy = false; lastAct = now(); hud();
    }
  }
  async function hammerSmash(p) {
    if (!hammerMode || busy || !boostOk()) return;
    const took = takeBooster(inv(), 'hammer');
    if (!took.ok) { setHammer(false); return; }
    const res = hammerAt(st, p[0], p[1]);
    if (!res.valid) return;
    boosts = took.inv; saveBoosts(); boostFlash('hammer');
    setHammer(false);
    busy = true; sel = null; hintMove = null; hintOn = false; hideHintHand();
    const [x, y] = cellXY(p[0], p[1]);
    addText('🔨', x, y - CS * .2, 34, '#fff');
    fx.push({ type: 'ring', x, y, t0: now(), dur: 420, col: '#ffe066', big: 1.4 });
    playWhoosh('w');
    shake(1);
    hud();
    for (let i = 0; i < res.steps.length; i++) await showStep(res.steps[i], i, { shake: i > 0 });
    if (res.shuffled) {
      addText('Shuffle!', W / 2, W / 2, 30, '#fff'); await wait(450);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const t = st.board[r][c]; if (!t || isHole(t)) continue;
        const s = sprites.get(t.id) || sprite(t, r, c); moveTo(s, r, c, 420);
      }
      await wait(440);
    }
    hud();
    busy = false; lastAct = now();
    if (goalsMet(st) && !st.tutorial) { await beginGoalFinish(); return; }
    maybeWarn3();
  }
  function keepGoing() {
    if (!st || !st.over || st.won) return;
    const took = takeBooster(inv(), 'moves');
    if (!took.ok) return;
    boosts = took.inv; saveBoosts();
    st.played = true; // Keep going: +3 moves continues this level; no life is used unless it is finally lost or left
    $('end').hidden = true;
    stopEnd();
    st.over = false; st.won = false; st.stars = 0;
    st.moves += EXTRA_MOVES;
    warned3 = st.moves <= MOVES_WARN_AT;
    busy = false; lastAct = now();
    addText('+' + EXTRA_MOVES + ' moves', W / 2, W / 2, 28, '#ffe066');
    playRise(3);
    hud();
    if (musicOn) playKind(wantKind());
  }
  function showCrushBan() {
    const el = $('crushban'); if (!el) return;
    el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  }
  function hideCrushBan() { const el = $('crushban'); if (el) { el.hidden = true; el.classList.remove('go'); } }

  // Daily spin wheel: once per New Zealand day per player, stored on this phone.
  let spinRot = 0, spinBusy = false, spinTimers = [];
  function spinKey() { return 'ib-sugar-spin' + memberTag(); }
  function spinReady() { return canSpin(ls.get(spinKey(), ''), Date.now()); }
  function paintSpinBtn() {
    const b = $('spinbtn'); if (!b) return;
    const ready = spinReady();
    b.classList.toggle('ready', ready);
    b.textContent = ready ? '🎡 Daily spin' : '🎡 Spin';
    b.setAttribute('aria-label', ready ? 'Daily spin is ready' : 'Daily spin: already spun today');
  }
  function wheelSvg() {
    const cx = 130, cy = 130, r = 122, seg = 360 / SPIN_PRIZES.length;
    const pt = function (deg, rad) { const a = (deg - 90) * Math.PI / 180; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; };
    let out = '<svg viewBox="0 0 260 260" class="wheelsvg" aria-hidden="true"><defs><radialGradient id="whub" cx="40%" cy="35%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#ff8ab8"/></radialGradient></defs>';
    out += '<circle cx="130" cy="130" r="128" fill="#e23d84"/>';
    SPIN_PRIZES.forEach(function (p, i) {
      const a0 = i * seg - seg / 2, a1 = i * seg + seg / 2, p0 = pt(a0, r), p1 = pt(a1, r);
      out += '<path d="M130 130 L' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + r + ' ' + r + ' 0 0 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + ' Z" fill="' + p.col + '" stroke="#fff" stroke-width="2"/>';
      const ic = pt(i * seg, 84), lb = pt(i * seg, 52);
      out += '<text x="' + ic[0].toFixed(2) + '" y="' + (ic[1] + 10).toFixed(2) + '" text-anchor="middle" font-size="28">' + p.icon + '</text>';
      const tag = p.n > 1 ? '×' + p.n : (p.id === 'all' ? 'All 3' : '');
      if (tag) {
        const w = tag.length > 2 ? 40 : 28;
        out += '<rect x="' + (lb[0] - w / 2).toFixed(2) + '" y="' + (lb[1] - 10).toFixed(2) + '" width="' + w + '" height="20" rx="10" fill="#fff" stroke="rgba(90,18,56,.25)" stroke-width="1.5"/>' +
          '<text x="' + lb[0].toFixed(2) + '" y="' + (lb[1] + 5).toFixed(2) + '" text-anchor="middle" font-size="13" font-weight="900" fill="#b0185c" font-family="ui-rounded,system-ui,sans-serif">' + tag + '</text>';
      }
    });
    for (let i = 0; i < 16; i++) { const b = pt(i * 22.5 + 11.25, 124); out += '<circle cx="' + b[0].toFixed(2) + '" cy="' + b[1].toFixed(2) + '" r="3.4" fill="#fff6c2" class="bulb' + (i % 2) + '"/>'; }
    out += '<circle cx="130" cy="130" r="26" fill="url(#whub)" stroke="#fff" stroke-width="4"/><text x="130" y="139" text-anchor="middle" font-size="24">🍬</text></svg>';
    return out;
  }
  function paintSpinInv() {
    const el = $('spininv'); if (!el) return;
    const have = inv();
    el.innerHTML = BOOSTERS.map(function (b) { return '<span><i>' + b.icon + '</i>' + b.label + ' <b>' + (have[b.id] || 0) + '</b></span>'; }).join('');
  }
  function openSpin() {
    const ov = $('spin'); if (!ov) return;
    const w = $('wheel');
    if (w && !w.dataset.built) { w.innerHTML = wheelSvg(); w.dataset.built = '1'; }
    const ready = spinReady();
    $('spinbtn2').hidden = !ready || spinBusy;
    $('spinmsg').textContent = ready ? 'One free spin every day. Spin to win a booster!' : 'You have had today’s spin. Come back tomorrow for another!';
    $('spinwon').hidden = true;
    paintSpinInv();
    ov.hidden = false;
  }
  function closeSpin() {
    if (spinBusy) return;
    if ($('spin')) $('spin').hidden = true;
    paintSpinBtn();
  }
  function doSpin(forceIdx) {
    if (spinBusy || !spinReady()) return null;
    const idx = forceIdx != null ? forceIdx : spinPick(Math.random);
    const prize = SPIN_PRIZES[idx];
    // Record the day and award straight away, so closing mid-spin cannot lose the prize or allow a second spin.
    ls.set(spinKey(), nzDay(Date.now()));
    boosts = addPrize(inv(), prize); saveBoosts();
    spinBusy = true;
    $('spinbtn2').hidden = true;
    $('spinmsg').textContent = 'Round and round it goes…';
    const wh = doc.querySelector('#wheel .wheelsvg');
    const dur = reduce ? 0 : 4200;
    spinRot = spinAngle(idx, 5, spinRot, (Math.random() - 0.5) * 20);
    if (wh) { wh.style.transition = dur ? 'transform ' + dur + 'ms cubic-bezier(.12,.72,.16,1)' : 'none'; wh.style.transform = 'rotate(' + spinRot + 'deg)'; }
    spinTimers.forEach(clearTimeout); spinTimers = [];
    if (dur) {
      const ticks = 22;
      for (let k = 1; k <= ticks; k++) {
        const at = dur * (1 - Math.pow(1 - k / ticks, 1 / 3)) * 0.92;
        spinTimers.push(setTimeout(function () { runAudio(() => { if (out && ac) playTone(ac, out, 620, ac.currentTime + 0.005, 0.05, CHIME_VOL * 0.55, 'triangle'); }); }, at));
      }
    }
    spinTimers.push(setTimeout(function () { spinDone(prize); }, dur + 120));
    paintSpinBtn();
    return prize;
  }
  function spinDone(prize) {
    spinBusy = false;
    const won = $('spinwon');
    if (won) { won.innerHTML = '<span class="wonicon">' + prize.icon + '</span><b>You won ' + prize.label + '!</b>'; won.hidden = false; }
    $('spinmsg').textContent = 'Your boosters are waiting in the booster bar. Come back tomorrow for another spin.';
    paintSpinInv();
    paintSpinBtn();
    playSting();
    confettiAt($('wheel'), 70, { speed: 460 });
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
    // 1.9.222 Every level win counts toward a family race (the Worker only counts wins on the race stop or beyond).
    prog.wins = (prog.wins | 0) + 1; raceLw = g.lv.n;
    if (g.lv.n >= prog.open && g.lv.n < LV_COUNT) prog.open = g.lv.n + 1;
    saveProg();
    syncRace(true);
    const firstThree = stars === 3 && prevStars < 3;
    // 1.9.218 Treasure chest: a free booster for a first clear or a new star record.
    const reward = chestReward(g.lv.n, stars, prevStars, newBadge);
    if (reward) { boosts = addPrize(inv(), reward); saveBoosts(); }
    // Yum! when a new badge is earned (first win) or the first 3-star on a level;
    // Sweet Sparkle for a later ordinary win.
    return { newBadge, yum: newBadge || firstThree, firstThree, stars, prevStars, reward };
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
  // 1.9.222 A short, low, dramatic sting for Hard levels (deeper for Super Hard).
  function playHardSting(h) {
    runAudio(() => {
      if (!out || !ac) return;
      const t0 = ac.currentTime + 0.02;
      const notes = h === 2 ? [196, 185, 147, 98, 73.4] : [220, 208, 165, 110];
      notes.forEach(function (f, i) { playTone(ac, out, f, t0 + i * 0.15, i === notes.length - 1 ? 0.7 : 0.2, CHIME_VOL * 1.3, 'triangle'); });
    });
  }
  // 1.9.222 Crackle/zap for colour bomb lightning.
  function playZap(big) {
    runAudio(() => {
      if (!out || !ac) return;
      const t0 = ac.currentTime + 0.005;
      const fs = big ? [1800, 700, 2400, 950, 1500, 600] : [1500, 2100, 900];
      fs.forEach(function (f, i) { playTone(ac, out, f + Math.random() * 200, t0 + i * 0.032, 0.045, CHIME_VOL * (big ? 0.8 : 0.5), 'triangle'); });
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
        for (let i = 0; i < extra.length; i++) await showStep(extra[i], i, { streak: false });
        continue;
      }
      const [r, c] = specs[0];
      const t = st.board[r][c];
      playWhoosh(t && t.s);
      const res = fireSpecialAt(st, r, c);
      for (let i = 0; i < res.steps.length; i++) await showStep(res.steps[i], i, { streak: false });
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
    cheer('Goal achieved!', 'yay');
    // 1.9.218 Confetti and the first fireworks as the goal lands.
    ovFit(); confetti(80, ovW / 2, ovH * 0.42, { speed: 520 }); fireworks(2, { gap: 320 });
    await crushWait(reduce ? 200 : 900);
    if ($('goalban')) $('goalban').classList.add('playing');
    while (st && st.moves > 0) {
      const g = grantPlayOutSpecial(st);
      if (!g) break;
      await animateGrant(g);
      if (!reduce && !crush.skip && crush.n % 3 === 1) fireworks(1);
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
    await sugarCrushFinale();
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
  // Sugar Crush finale: a big candy banner while fireworks and confetti erupt over the board.
  async function sugarCrushFinale() {
    if (!st) return;
    showCrushBan();
    playSting();
    cheer('Sugar Crush!', 'succulent');
    ovFit();
    fireworks(6, { gap: 220 });
    confetti(110, ovW / 2, -10, { down: true, speed: 260, wide: ovW });
    await crushWait(reduce ? 400 : 1700);
    hideCrushBan();
  }
  function finish() {
    if ((tut && tut.active) || (st && st.tutorial)) return;
    if (st && st.won && goalsMet(st) && !st.crushing) { beginGoalFinish(); return; }
    const won = st.won;
    if (st.score > (prog.best[st.lv.n - 1] || 0)) { prog.best[st.lv.n - 1] = st.score; saveProg(); }
    winInfo = won ? recordWin(st) : { newBadge: false, yum: false, stars: 0 };
    if (won) candySfx('win', 6); // 1.9.229 a sparkly arpeggio (Goal achieved and Sugar Crush were already said)
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
    if (ov && toN && toN <= LV_COUNT && fromN < LV_COUNT) {
      $('goalnexttitle').textContent = 'On to ' + (stopForLevel(toN) && stopForLevel(toN).place || ('level ' + toN));
      $('goalnextmsg').textContent = 'Level ' + toN + ' is open.';
      $('goalnextbtn').hidden = false;
      ov.hidden = false;
    }
  }
  function lootHtml(info, g) {
    const bits = [];
    const lv = g && g.lv;
    if (info && info.reward) { const b = boosterInfo(info.reward.id); if (b) bits.push({ cls: 'b', icon: b.icon, text: b.label + (info.reward.n > 1 ? ' ×' + info.reward.n : '') }); }
    if (info && info.newBadge && lv && lv.badge) bits.push({ cls: 'g', icon: lv.badge.icon, text: 'New badge' });
    bits.push({ cls: 's', icon: '⭐', text: '×' + ((g && g.stars) || 0) });
    bits.push({ cls: 'p', icon: '🍬', text: ((g && g.score) || 0).toLocaleString('en-NZ') + ' pts' });
    return bits.map(function (x, i) { return '<span class="lootchip ' + x.cls + '" style="--i:' + i + '"><i>' + x.icon + '</i>' + x.text + '</span>'; }).join('');
  }
  async function showEnd(opts) {
    if (!st) return;
    opts = opts || {};
    const won = st.won, n = st.stars || 0, lv = st.lv;
    const fly = !!(won && opts.animateStars && n > 0);
    $('endtitle').textContent = won ? (lv.theme === 'sarah' ? "Sarah's level complete!" : ('Level ' + lv.n + ' complete!')) : 'So close!';
    if (fly) {
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
    // 1.9.218 Treasure chest of rewards on a win.
    const chest = $('endchest'), loot = $('endloot');
    if (chest) {
      chest.hidden = !won;
      chest.className = 'chest' + (won && !fly ? ' open' : '');
    }
    if (loot) {
      loot.hidden = !won;
      loot.innerHTML = won ? lootHtml(winInfo, st) : '';
      loot.classList.toggle('show', !!(won && !fly));
    }
    const more = $('morebtn');
    if (more) {
      const left = inv().moves || 0;
      more.hidden = won || !left;
      more.textContent = '🍬 Keep going: +' + EXTRA_MOVES + ' moves (' + left + ' left)';
    }
    if (won) {
      const extra = n === 3 ? 'Three stars!' : n === 2 ? 'Two stars.' : 'One star.';
      const next = lv.n < LV_COUNT ? ' Level ' + (lv.n + 1) + ' is open.' : ' You have finished every level in the shop.';
      $('endmsg').textContent = hardWinLine(lv.hard || 0) + extra + next;
      if ($('end')) { $('end').classList.toggle('hardwin', !!lv.hard); $('end').classList.toggle('hard2', lv.hard === 2); }
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
    $('nextbtn').hidden = !(won && lv.n < LV_COUNT);
    if (won && opts.animateStars) {
      $('nextbtn').hidden = true;
      if ($('endmap')) $('endmap').hidden = true;
    } else if ($('endmap')) $('endmap').hidden = false;
    $('end').hidden = false;
    if (fly) {
      endTap = true;
      const kids = $('endstars').children;
      // Stars fly in one at a time, each with a sparkle burst.
      for (let i = 0; i < n; i++) {
        await crushWait(reduce ? 80 : 380);
        if (kids[i]) kids[i].className = 'on fillin fly';
        playStarChime(i);
        if (kids[i]) setTimeout(function (el) { return function () { confettiAt(el, 16, { speed: 260 }); }; }(kids[i]), reduce ? 0 : 330);
      }
      await crushWait(reduce ? 80 : 520);
      // Then the treasure chest wobbles, pops open, and the rewards float out.
      if (chest) chest.classList.add('shake');
      await crushWait(reduce ? 60 : 560);
      if (chest) { chest.classList.remove('shake'); chest.classList.add('open'); }
      playRise(4);
      if (chest) confettiAt(chest, 44, { speed: 380 });
      if (loot) loot.classList.add('show');
      await crushWait(reduce ? 160 : 1900);
      endTap = false;
      $('end').hidden = true;
      if ($('endmap')) $('endmap').hidden = false;
      await celebrateOnMap(lv.n, lv.n < LV_COUNT ? lv.n + 1 : lv.n);
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
    if (lvNum < LV_COUNT) openLevel(lvNum + 1);
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
  cv.addEventListener('pointerdown', e => { unlockAudio(); noteActivity(); if (crush && crush.active) { speedCrush(); e.preventDefault(); return; } if (hammerMode) { const hp = cellAt(e); e.preventDefault(); if (hp && !busy) hammerSmash(hp); return; } const p = cellAt(e); if (!p) return; down = { p, x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch (er) { } e.preventDefault(); });
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

  function toggleSound() { soundOn = !soundOn; ls.set('ib-sugar-sound', soundOn); if (!soundOn) stopSpeech(); paintButtons(); unlockAudio(); }
  $('soundbtn').addEventListener('click', toggleSound);
  $('mapsound').addEventListener('click', toggleSound);
  $('musicbtn').addEventListener('click', () => setMusic(!musicOn));
  $('mapmusic').addEventListener('click', () => setMusic(!musicOn));
  if ($('voicebtn')) $('voicebtn').addEventListener('click', () => setVoice(!voiceOn));
  if ($('mapvoice')) $('mapvoice').addEventListener('click', () => setVoice(!voiceOn));
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
  if ($('boosters')) $('boosters').addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-boost]');
    if (b) { unlockAudio(); useBoost(b.dataset.boost); }
  });
  if ($('morebtn')) $('morebtn').addEventListener('click', () => { unlockAudio(); keepGoing(); });
  if ($('end')) $('end').addEventListener('click', e => { if (endTap && crush && !(e.target.closest && e.target.closest('button'))) crush.skip = true; });
  if ($('spinbtn')) $('spinbtn').addEventListener('click', () => { unlockAudio(); openSpin(); });
  if ($('spinbtn2')) $('spinbtn2').addEventListener('click', () => { unlockAudio(); doSpin(); });
  if ($('spin')) $('spin').addEventListener('click', e => {
    if (e.target === $('spin') || (e.target.closest && e.target.closest('[data-spin=close]'))) closeSpin();
  });
  if ($('iconpick')) $('iconpick').addEventListener('click', e => {
    if (e.target === $('iconpick') || (e.target.closest && e.target.closest('[data-iconpick=close]'))) $('iconpick').hidden = true;
  });
  if ($('livesov')) $('livesov').addEventListener('click', e => {
    const t = e.target;
    if (t === $('livesov') || (t.closest && t.closest('[data-lives=close]'))) { $('livesov').hidden = true; clearInterval(livesTimer); if (screen !== 'map') showMap(); return; }
    const b = t.closest && t.closest('#askbtn, [data-life-to]');
    if (b && !b.disabled) { unlockAudio(); livesAction(b); }
  });
  ['maphearts', 'hearts2'].forEach(id => { if ($(id)) $(id).addEventListener('click', () => { unlockAudio(); if (screen === 'map') openLivesPanel(); else showLives(lives() ? 'send' : 'out'); }); });
  if ($('raceon')) $('raceon').addEventListener('click', e => {
    if (e.target === $('raceon') || e.target === $('raceonbtn')) $('raceon').hidden = true;
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
    if (doc.hidden) { if (ac) ac.suspend().catch(() => { }); stopSpeech(); }
    else {
      if (ac && (soundOn || musicOn)) ac.resume().catch(() => { });
      if (musicOn && !doc.hidden) playKind(wantKind());
    }
  });
  root.addEventListener('pagehide', () => { stopAllMusic(); if (ac) ac.close().catch(() => { }); });
  root.addEventListener('resize', () => { ovFit(); fitCanvas(); if (tut && tut.active && tut.step && tut.step.move) placeTutHand(tut.step.move[0], tut.step.move[1]); if (hintOn && hintMove) placeHintHand(hintMove[0], hintMove[1], hintHold); });

  paintButtons();
  showMap();
  root.requestAnimationFrame(frame);

  root.SugarRush.ui = {
    state: () => st, attempt, hud, paintGoalStrip, showEnd, showMap, scrollMapTo, openLevel, startLevel, showIntro, startTutorial, skipTutorial, finishTutorial, showTutStep, beginLevel, beginGoalFinish, showGoalBanner, celebrateOnMap, progress: () => prog, tutorial: () => tut, crush: () => crush,
    seedLives, showLives, openLivesPanel, lives: () => lives(), settleLife, nextLife: () => nextLife(),
    seedRace, seedRaceEvent, showRaceOn, showRaceResult, racePrize, syncRace, openIconPicker, setRaceOpen, requestCloseSugar, race: () => race,
    say, chime, callout, unlockAudio, audio, showSaying, hideSaying, showMovesWarn, hideMovesWarn, maybeWarn3, showHint, hideHintHand, noteActivity,
    clipsReady: () => Object.keys(VOICE_FILES).every(k => !!bufs[k]),
    setSound(on) { soundOn = !!on; ls.set('ib-sugar-sound', soundOn); paintButtons(); },
    setVoice(on) { setVoice(on); }, voiceState: () => ({ voiceOn, sayVoice, clips: clipsReady(), canSpeak: canSpeak(), voice: speakVoice ? speakVoice.name + ' ' + speakVoice.lang : null }), speakLine: (t, o) => speakLine(t, o), sayLineKey,
    setScore(n) { if (!st) return; st.score = n; st.moves = 0; st.over = true; st.won = goalsMet(st); st.stars = starsOf(st); hud(); },
    previewWin(opts) { opts = opts || {}; const n = opts.level || (st && st.lv && st.lv.n) || 2; if (!st || st.lv.n !== n) startLevel(n); st.score = opts.score || Math.max(st.lv.stars[2] || 0, 2400); st.moves = Math.max(st.moves, 1); st.won = true; st.over = true; st.stars = opts.stars || 3; if (opts.resetBadge) prog.badges[n - 1] = 0; winInfo = recordWin(st); hud(); showEnd(); },
    view: () => ({ score: st && st.score, moves: st && st.moves, busy, soundOn, musicOn, screen, level: st && st.lv && st.lv.n, acState: ac && ac.state, sparkles: sparkles.length, hold: sparkleHoldT != null, warned3, lastSaying, hintOn, hintMove: hintMove && hintMove.map(function (p) { return p.slice(); }), lastAct, streak: streakPts, streakTier: streakTier(streakPts), boosts: normBoosters(inv()), hammerMode, spinReady: spinReady(), overlay: ovp.length, scene: ($('scene') && $('scene').dataset.n) || '' }),
    useBoost, hammerSmash, keepGoing, openSpin, doSpin, closeSpin, spinReady, addStreak, paintScene, confetti, fireworks, stopOverlay, showCrushBan, hideCrushBan,
    setBoosters(v) { boosts = normBoosters(v); saveBoosts(); paintBoosters(); },
    // Test / screenshot helper: start a level on a fixed board.
    bootBoard(n, rows) { tut = null; hideTutUi(); bootLevel(n, { board: rows }); },
    holdOverlay(on) { ovHold = !!on; },
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
