/* Info Book 1.9.294 – Sugar Rush, levels 1–75. Our own match-3 sweet-shop game (own art drawn on canvas, own names).
   Swap two sweets next to each other to make a line of 3 or more. 4 in a line makes a striped sweet (clears a row or
   column), an L or T makes a wrapped sweet (clears the 3x3 around it), 5 in a line makes a sprinkle bomb (clears every
   sweet of the colour it is swapped with).
   Open to every family member since 1.9.228 (Shane-only before; the coming-soon screen is no longer used).
   1.9.285 Gameplay overhaul: countdown bombs, candy cannons, portals, boss blockers with health bars and thick frosting,
   plus timed and order levels, spread over levels 25–75 with a "New!" card the first time each appears; per-country
   board frames, animated obstacles, bigger effects, heavier shakes and a smoother cascade.
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
      badge: { id: 'swan', name: 'Black Swan', icon: '🦢' } },
    // 1.9.232 Adelaide, then Melbourne: a gentle rise after the Perth finale (neither is Hard).
    { n: 23, name: 'Adelaide City Squares', target: 0, moves: 30, stars: [0, 3800, 7600], kinds: 6,
      jelly: ['11000011', '11000011', '00000000', '00011000', '00011000', '00000000', '11000011', '11000011'],
      locks: ['00000000', '00000000', '00100100', '00000000', '00000000', '00100100', '00000000', '00000000'],
      help: "Clear the jelly in Adelaide's five city squares and free the 4 locked jars in 30 moves.",
      badge: { id: 'frogcake', name: 'Frog Cake', icon: '🐸' } },
    { n: 24, name: 'Melbourne Laneways', target: 0, moves: 31, stars: [0, 4000, 8000], kinds: 6,
      ings: [[0, 1], [0, 6]], ingStyle: 'doughnut', ingIcon: '🍩',
      bub: ['00000000', '00000000', '00000000', '00000000', '10000001', '01000010', '00000000', '00000000'],
      liq: ['00000000', '00000000', '00011000', '00000000', '00000000', '00000000', '00000000', '00000000'],
      help: 'Bring both hot jam doughnuts down the laneway, pop the sugar bubbles and free the liquorice in 31 moves.',
      badge: { id: 'tramline', name: 'Laneway Tram Bell', icon: '🔔' } },
    // 1.9.233 Brisbane: jelly along the winding river, jacaranda-blossom icing on the banks.
    { n: 25, name: 'Brisbane River Bend', target: 0, moves: 31, stars: [0, 4200, 8400], kinds: 6,
      jelly: ['00000022', '00000220', '00011100', '00110000', '02200000', '00110000', '00011120', '00000022'],
      ice: ['11000000', '10000000', '00000000', '00000001', '00000011', '00000000', '10000000', '11000000'],
      help: 'Clear the jelly all along the winding Brisbane River (double on the bends) and crack the 8 blocks of jacaranda-blossom icing on the banks in 31 moves.',
      badge: { id: 'citycat', name: 'CityCat Ticket', icon: '⛴️' } },
    // 1.9.234 Papua New Guinea: the stilt village over the water at Port Moresby.
    { n: 26, name: 'Port Moresby Paradise', target: 0, moves: 24, stars: [0, 4400, 8800], kinds: 6,
      jelly: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '11111111', '11111111'],
      bub: ['00000000', '00000000', '10000001', '01000010', '00000000', '00000000', '00000000', '00000000'],
      locks: ['00000000', '00000000', '00000000', '00000000', '00011000', '00000000', '00000000', '00000000'],
      help: 'Clear the jelly under the stilt village, pop the 4 sugar bubbles and free the 2 locked jars in 24 moves.',
      badge: { id: 'paradise', name: 'Bird of Paradise', icon: '🦜' } },
    // 1.9.235 New countries, five at a time. First five: Solomon Islands, Vanuatu, Fiji, New Caledonia, Indonesia.
    { n: 27, name: 'Honiara Reef', target: 0, moves: 30, stars: [0, 4500, 9000], kinds: 6,
      jelly: ['00000000', '00111100', '01000010', '01000010', '01000010', '01000010', '00111100', '00000000'],
      bub: ['00000000', '00000000', '00011000', '00000000', '00000000', '00011000', '00000000', '00000000'],
      help: 'Clear the reef-ring jelly around Honiara lagoon and pop the 4 sugar bubbles in 30 moves.',
      badge: { id: 'honiara', name: 'Reef Ring', icon: '🐠' } },
    { n: 28, name: 'Port Vila Waterfront', target: 0, moves: 32, stars: [0, 4600, 9200], kinds: 6,
      ings: [[0, 2], [0, 5]], ingIcon: '🥭',
      ice: ['00000000', '00000000', '00011000', '00000000', '00000000', '00000000', '00011000', '00000000'],
      help: 'Bring both market mangoes down the waterfront and crack the 4 icing blocks in 32 moves.',
      badge: { id: 'vila', name: 'Market Mango', icon: '🥭' } },
    { n: 29, name: 'Bula Beach', target: 0, moves: 36, stars: [0, 4700, 9400], kinds: 6,
      ings: [[0, 1], [0, 6]], ingStyle: 'coconut', ingIcon: '🥥',
      jelly: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '11111111', '11111111'],
      help: 'Bring both coconuts down onto the beach and clear the jelly along the sand in 36 moves.',
      badge: { id: 'bula', name: 'Bula Flower', icon: '🌸' } },
    { n: 30, name: 'Nouméa Bay', target: 0, moves: 30, stars: [0, 4800, 9600], kinds: 6,
      mask: HARBOUR,
      jelly: ['00000000', '00000000', '00000000', '00000000', '00000000', '11111111', '00000000', '00000000'],
      locks: ['00011000', '00000000', '00000000', '00000000', '00000000', '00000000', '00011000', '00000000'],
      bub: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00100100', '00000000'],
      help: 'Clear the jelly across the bay, free the 4 locked jars and pop the 2 sugar bubbles in 30 moves.',
      badge: { id: 'noumea', name: 'Bay Sail', icon: '⛵' } },
    { n: 31, name: 'Bali Beach Market', target: 0, moves: 32, stars: [0, 4900, 9800], kinds: 6,
      jelly: ['11000011', '10000001', '00000000', '00000000', '00000000', '00000000', '10000001', '11000011'],
      ice: ['00000000', '00011000', '00000000', '00000000', '00000000', '00000000', '00011000', '00000000'],
      help: 'Clear the jelly by the temple gates and crack the 4 icing blocks in the market in 32 moves.',
      badge: { id: 'bali', name: 'Temple Gate', icon: '🌴' } },
    // 1.9.243 Canberra, then Hobart. Both were map markers; now they are levels.
    { n: 32, name: 'Canberra Lake Light', target: 0, moves: 32, stars: [0, 5000, 10000], kinds: 6,
      jelly: ['00000000', '00111100', '01000010', '01000010', '01000010', '01000010', '00111100', '00000000'],
      bub: ['00000000', '00000000', '00011000', '00000000', '00000000', '00011000', '00000000', '00000000'],
      help: 'Clear the jelly around the lake and pop the 4 sugar bubbles on the water in 32 moves.',
      badge: { id: 'canberra', name: 'Capital Flag', icon: '🚩' } },
    { n: 33, name: 'Hobart Mountain Wharf', target: 0, moves: 34, stars: [0, 5100, 10200], kinds: 6,
      jelly: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '11111111', '11111111'],
      ice: ['11000011', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000'],
      help: 'Clear the jelly along the wharf and crack the 4 icing blocks on the mountain in 34 moves.',
      badge: { id: 'hobart', name: 'Mountain Apple', icon: '🍎' } },
    // 1.9.243 Next countries west of Indonesia, on the same latitude and longitude scale.
    { n: 34, name: 'Saigon Lanterns', target: 0, moves: 30, stars: [0, 5200, 10400], kinds: 6,
      jelly: ['00000000', '00111100', '01000010', '01000010', '01000010', '01000010', '00111100', '00000000'],
      bub: ['00000000', '00000000', '00011000', '00000000', '00000000', '00011000', '00000000', '00000000'],
      help: 'Clear the lantern-ring jelly along the river and pop the 4 sugar bubbles in 30 moves.',
      badge: { id: 'saigon', name: 'River Lantern', icon: '🏮' } },
    { n: 35, name: 'Kuala Lumpur Market', target: 0, moves: 32, stars: [0, 5300, 10600], kinds: 6,
      jelly: ['11000011', '10000001', '00000000', '00000000', '00000000', '00000000', '10000001', '11000011'],
      ice: ['00000000', '00011000', '00000000', '00000000', '00000000', '00000000', '00011000', '00000000'],
      help: 'Clear the jelly by the market gates and crack the 4 icing blocks in 32 moves.',
      badge: { id: 'nightmarket', name: 'Night Market', icon: '🌙' } },
    { n: 36, name: 'Bangkok Temple', target: 0, moves: 24, stars: [0, 5400, 10800], kinds: 6,
      jelly: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '11111111', '11111111'],
      bub: ['00000000', '00000000', '10000001', '01000010', '00000000', '00000000', '00000000', '00000000'],
      locks: ['00000000', '00000000', '00000000', '00000000', '00011000', '00000000', '00000000', '00000000'],
      help: 'Clear the jelly along the river steps, pop the 4 sugar bubbles and free the 2 locked jars in 24 moves.',
      badge: { id: 'lotus', name: 'Temple Lotus', icon: '🪷' } },
    { n: 37, name: 'Yangon Pagoda', target: 0, moves: 32, stars: [0, 5500, 11000], kinds: 6,
      ings: [[0, 2], [0, 5]], ingIcon: '🌼',
      ice: ['00000000', '00000000', '00011000', '00000000', '00000000', '00000000', '00011000', '00000000'],
      help: 'Bring both flowers down to the pagoda and crack the 4 icing blocks in 32 moves.',
      badge: { id: 'pagoda', name: 'Golden Pagoda', icon: '🛕' } },
    { n: 38, name: 'Delhi Sweets', target: 0, moves: 34, stars: [0, 5600, 11200], kinds: 6,
      jelly: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '11111111', '11111111'],
      ice: ['11000011', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000'],
      help: 'Clear the jelly along the market and crack the 4 icing blocks by the gate in 34 moves.',
      badge: { id: 'indiagate', name: 'India Gate', icon: '🪔' } },
    // 1.9.245 Conveyor chapter: sweets on marked lanes slide one tile after every valid move.
    { n: 39, name: 'Kathmandu Prayer Flags', target: 0, moves: 28, stars: [0, 5700, 11400], kinds: 6,
      belts: [{ row: 3, dir: 1 }],
      jelly: ['00000000', '00111100', '01111110', '01111110', '01111110', '00111100', '00000000', '00000000'],
      help: 'Clear the courtyard jelly in 28 moves. The sweets on the turquoise lane slide one space to the right after every move and loop around the end.',
      badge: { id: 'prayerflag', name: 'Prayer Flag', icon: '🎏' } },
    { n: 40, name: 'Dhaka River Lights', target: 0, moves: 30, stars: [0, 5800, 11600], kinds: 6,
      belts: [{ row: 2, dir: 1 }, { row: 5, dir: -1 }],
      bub: ['00000000', '00000000', '00111100', '00000000', '00000000', '00111100', '00000000', '00000000'],
      help: 'Pop all 8 sugar bubbles in 30 moves. Two conveyor lanes carry sweets in opposite directions; a bubbled sweet rides along with its bubble.',
      badge: { id: 'launch', name: 'River Launch', icon: '🚤' } },
    { n: 41, name: 'Colombo Monsoon Current', target: 0, moves: 34, stars: [0, 5900, 11800], kinds: 6,
      belts: [{ row: 1, dir: 1 }, { row: 6, dir: -1 }], reverseBelts: true,
      ings: [[0, 2], [0, 5]], ingIcon: '🍍',
      ice: ['00000000', '00000000', '00011000', '00000000', '00000000', '00011000', '00000000', '00000000'],
      help: 'Bring both pineapple treats down and crack the icing in 34 moves. The reversing current carries candies and pineapple treats along both conveyor lanes.',
      badge: { id: 'monsoon', name: 'Monsoon Pearl', icon: '🌧️' } },
    { n: 42, name: 'Singapore Garden Express', target: 0, moves: 36, stars: [0, 6000, 12000], kinds: 6,
      belts: [{ row: 2, dir: 1 }, { row: 5, dir: -1 }], reverseBelts: true,
      jelly: ['00000000', '00111100', '00000000', '00011000', '00011000', '00000000', '00111100', '00000000'],
      locks: ['00000000', '00000000', '00000000', '00100100', '00100100', '00000000', '00000000', '00000000'],
      help: 'Clear the garden jelly and free all 4 locked jars in 36 moves. The two conveyor lanes reverse direction after every move.',
      badge: { id: 'gardenexpress', name: 'Garden Express', icon: '🌿' } },
    // 1.9.247 Five more Asian countries: Cambodia, the Philippines, Laos, Bhutan and Pakistan.
    { n: 43, name: 'Phnom Penh River Lights', target: 0, moves: 32, stars: [0, 6100, 12200], kinds: 6,
      jelly: ['00000000', '00111100', '01100110', '01000010', '01000010', '01100110', '00111100', '00000000'],
      locks: ['00000000', '00000000', '00011000', '00000000', '00000000', '00011000', '00000000', '00000000'],
      help: 'Clear the riverfront jelly and free all 4 locked jars in 32 moves.',
      badge: { id: 'mekonglantern', name: 'Mekong Lantern', icon: '🏮' } },
    { n: 44, name: 'Manila Bay Lanterns', target: 0, moves: 32, stars: [0, 6200, 12400], kinds: 6,
      bub: ['00000000', '01000010', '00100100', '00011000', '00011000', '00100100', '01000010', '00000000'],
      help: 'Pop all 8 sugar bubbles around Manila Bay in 32 moves.',
      badge: { id: 'parol', name: 'Parol Star', icon: '⭐' } },
    { n: 45, name: 'Vientiane Golden Stupa', target: 0, moves: 34, stars: [0, 6300, 12600], kinds: 6,
      ings: [[0, 2], [0, 5]], ingIcon: '🥭',
      ice: ['00000000', '00000000', '00011000', '00000000', '00000000', '00011000', '00000000', '00000000'],
      help: 'Bring both mango treats down to the riverside market and crack the 4 icing blocks in 34 moves.',
      badge: { id: 'goldenstupa', name: 'Golden Stupa', icon: '🛕' } },
    { n: 46, name: 'Thimphu Dzong Garden', target: 0, moves: 34, stars: [0, 6400, 12800], kinds: 6,
      jelly: ['11000011', '11000011', '00000000', '00011000', '00011000', '00000000', '11000011', '11000011'],
      locks: ['00000000', '00000000', '00100100', '00000000', '00000000', '00100100', '00000000', '00000000'],
      help: 'Clear the garden-path jelly and free all 4 locked jars in 34 moves.',
      badge: { id: 'dzong', name: 'Dzong Garden', icon: '🏯' } },
    { n: 47, name: 'Islamabad Garden Gate', target: 0, moves: 36, stars: [0, 6500, 13000], kinds: 6,
      jelly: ['00000000', '00111100', '00100100', '00000000', '00000000', '00100100', '00111100', '00000000'],
      ice: ['11000011', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '11000011'],
      locks: ['00000000', '00000000', '00000000', '00011000', '00011000', '00000000', '00000000', '00000000'],
      help: 'Clear the garden jelly, crack the 4 icy corners and free all 4 locked jars in 36 moves.',
      badge: { id: 'faisal', name: 'Garden Crescent', icon: '🌙' } },
    // 1.9.249 Five more countries along the Silk Road: Afghanistan, Iran, Uzbekistan, Kazakhstan and China.
    { n: 48, name: 'Kabul Mountain Market', target: 0, moves: 34, stars: [0, 6600, 13200], kinds: 6,
      jelly: ['00000000', '00111100', '01100110', '01000010', '01000010', '01100110', '00111100', '00000000'],
      bub: ['00000000', '00000000', '01000010', '00000000', '00000000', '01000010', '00000000', '00000000'],
      help: 'Clear the market-courtyard jelly and pop all 4 sugar bubbles in 34 moves.',
      badge: { id: 'kabul', name: 'Blue Minaret', icon: '🕌' } },
    { n: 49, name: 'Tehran Rose Garden', target: 0, moves: 34, stars: [0, 6700, 13400], kinds: 6,
      ings: [[0, 2], [0, 5]], ingIcon: '🍎',
      ice: ['00000000', '00000000', '00011000', '00000000', '00000000', '00011000', '00000000', '00000000'],
      help: 'Bring both garden treats down and crack the 4 icing blocks in 34 moves.',
      badge: { id: 'rose', name: 'Persian Rose', icon: '🌹' } },
    { n: 50, name: 'Tashkent Tile Courtyard', target: 0, moves: 36, stars: [0, 6800, 13600], kinds: 6,
      jelly: ['22000022', '11000011', '00000000', '00011000', '00011000', '00000000', '11000011', '22000022'],
      locks: ['00000000', '00000000', '00100100', '00000000', '00000000', '00100100', '00000000', '00000000'],
      help: 'Clear the double-layer tilework and free all 4 locked jars in 36 moves.',
      badge: { id: 'tile', name: 'Turquoise Tile', icon: '🟦' } },
    { n: 51, name: 'Astana Steppe Lights', target: 0, moves: 36, stars: [0, 6900, 13800], kinds: 6,
      jelly: ['00000000', '00111100', '00011000', '00000000', '00000000', '00011000', '00111100', '00000000'],
      bub: ['10000001', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '10000001'],
      choco: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '10000001'],
      help: 'Clear the steppe-ring jelly, pop all 4 sugar bubbles and keep the chocolate in check in 36 moves.',
      badge: { id: 'steppe', name: 'Steppe Star', icon: '⭐' } },
    { n: 52, name: 'Beijing Great Wall', hard: 1, target: 0, moves: 38, stars: [0, 7000, 14000], kinds: 6,
      jelly: ['00000000', '00111100', '01100110', '11000011', '11000011', '01100110', '00111100', '00000000'],
      ice: ['10000001', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '10000001'],
      locks: ['00000000', '00000000', '00000000', '00011000', '00011000', '00000000', '00000000', '00000000'],
      help: 'Clear the wall-shaped jelly, crack the 4 icy corners and free all 4 locked jars in 38 moves.',
      badge: { id: 'wall', name: 'Great Wall Star', icon: '🐉' } },
    // 1.9.250 More city stops within China, following the existing Beijing route.
    { n: 53, name: "Xi'an Terracotta Trail", target: 0, moves: 36, stars: [0, 7100, 14200], kinds: 6,
      jelly: ['00011000', '00111100', '01100110', '11000011', '11000011', '01100110', '00111100', '00011000'],
      ice: ['11000011', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '11000011'],
      help: 'Clear the terracotta-ring jelly and crack all 4 icy corners in 36 moves.',
      badge: { id: 'terracotta', name: 'Terracotta Lantern', icon: '🏮' } },
    { n: 54, name: 'Chengdu Panda Picnic', target: 0, moves: 36, stars: [0, 7200, 14400], kinds: 6,
      jelly: ['00000000', '00111100', '01100110', '01000010', '01000010', '01100110', '00111100', '00000000'],
      bub: ['00000000', '10000001', '00000000', '00000000', '00000000', '00000000', '10000001', '00000000'],
      help: 'Clear the panda-garden jelly and pop all 4 sugar bubbles in 36 moves.',
      badge: { id: 'panda', name: 'Panda Picnic', icon: '🐼' } },
    { n: 55, name: 'Chongqing Mountain Rail', target: 0, moves: 38, stars: [0, 7400, 14800], kinds: 6,
      ings: [[0, 2], [0, 5]], ingIcon: '🍊',
      locks: ['00000000', '00000000', '00011000', '00011000', '00000000', '00000000', '00000000', '00000000'],
      help: 'Bring both river-market treats down and free all 4 locked jars in 38 moves.',
      badge: { id: 'mountainrail', name: 'Mountain Rail', icon: '🚇' } },
    { n: 56, name: 'Shanghai Bund Lights', target: 0, moves: 38, stars: [0, 7500, 15000], kinds: 6,
      jelly: ['22000022', '11000011', '00000000', '00011000', '00011000', '00000000', '11000011', '22000022'],
      choco: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '10000001', '00000000'],
      help: 'Clear the double-layer Bund jelly and keep the chocolate in check in 38 moves.',
      badge: { id: 'bund', name: 'Bund Skyline', icon: '🌃' } },
    { n: 57, name: 'Guangzhou Pearl River Blossom', hard: 1, target: 0, moves: 40, stars: [0, 7800, 15600], kinds: 6,
      jelly: ['00000000', '00111100', '01100110', '11000011', '11000011', '01100110', '00111100', '00000000'],
      ice: ['11000011', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '11000011'],
      locks: ['00000000', '00000000', '00000000', '00011000', '00011000', '00000000', '00000000', '00000000'],
      help: 'Clear the blossom-ring jelly, crack the icy corners and free all 4 locked jars in 40 moves.',
      badge: { id: 'pearlriver', name: 'Pearl River Blossom', icon: '🌸' } },
    // 1.9.257 Recipe orders join the regular China route, alongside familiar objectives.
    { n: 58, name: 'Nanjing Candy Workshop', target: 0, moves: 32, stars: [0, 7600, 15200], kinds: 6,
      recipe: { candies: [{ color: 0, n: 10 }, { color: 4, n: 8 }], specials: [{ kind: 'w', n: 1 }] },
      help: 'Collect 10 cherry gumdrops and 8 blueberry gems, then create 1 wrapped sweet in 32 moves.',
      badge: { id: 'nanjingrecipe', name: 'Golden Recipe', icon: '📜' } },
    { n: 59, name: 'Hangzhou Three-Scoop Lake', target: 0, moves: 36, stars: [0, 7700, 15400], kinds: 6,
      jelly: ['00000000', '00111100', '01300310', '01000010', '01000010', '03100130', '00111100', '00000000'],
      help: 'Clear the lotus-lake jelly. The marked squares have three layers and need three matches to clear.',
      badge: { id: 'hangzhou', name: 'Lotus Lake', icon: '🪷' } },
    { n: 60, name: 'Fuzhou Double-Stripe Feast', target: 0, moves: 36, stars: [0, 8000, 16000], kinds: 6,
      recipe: { candies: [{ color: 1, n: 10 }], combos: [{ kind: 'crisscross', n: 1 }] },
      help: 'Collect 10 orange jelly sweets and swap two stripe sweets together to make a double-stripe blast in 36 moves.',
      badge: { id: 'fuzhourecipe', name: 'Double-Stripe Feast', icon: '⚡' } },
    { n: 61, name: 'Xiamen Lantern Dash', hard: 1, timer: 90, target: 0, moves: 40, stars: [0, 8200, 16400], kinds: 6,
      collect: { color: 2, n: 12 },
      jelly: ['00000000', '00000000', '00110000', '01111000', '01111000', '00110000', '00000000', '00000000'],
      help: 'Hard countdown: collect 12 lemon drops and clear the small lantern-path jelly before 90 seconds run out.',
      badge: { id: 'lanterndash', name: 'Lantern Dash', icon: '🏮' } },
    { n: 62, name: 'Quanzhou Sugar Sprites', target: 0, moves: 34, stars: [0, 8000, 16000], kinds: 6,
      ice: ['00000000', '00000000', '00111100', '00000000', '00100100', '00000000', '00000000', '00000000'],
      iceGoal: false, hiddenIcon: '🧚',
      hidden: ['00000000', '00000000', '00111100', '00000000', '00100100', '00000000', '00000000', '00000000'],
      help: 'Uncover all 6 sugar sprites hidden under the frosting in 34 moves.',
      badge: { id: 'sugarsprites', name: 'Sugar Sprite Friends', icon: '🧚' } },
    { n: 63, name: 'Shenzhen Syrup Stream', target: 0, moves: 34, stars: [0, 7900, 15800], kinds: 6,
      flow: ['00000000', '00000000', '00110000', '00010000', '00010000', '00011100', '00010000', '00000000'],
      poppers: ['00000000', '00000000', '00000000', '01000000', '00100000', '00000000', '00000000', '00000000'],
      help: 'Clear the 8 candy clogs along the marked syrup channel. Matches near a Popper bomb set off a 3×3 blast that can clear nearby clogs and chain into the other bomb.',
      badge: { id: 'syrupstream', name: 'Rainbow Syrup Run', icon: '🌈' } },
    { n: 64, name: 'Hong Kong Mooncake Delivery', target: 0, moves: 38, stars: [0, 8400, 16800], kinds: 6,
      ings: [[0, 2], [0, 5]], ingIcon: '🥮',
      recipe: { candies: [{ color: 3, n: 10 }] },
      chocoGoal: true, choco: ['00000000', '00000000', '10000001', '00000000', '00000000', '00000000', '00000000', '00000000'],
      liq: ['00000000', '00000000', '00000000', '00011000', '00000000', '00000000', '00000000', '00000000'],
      help: 'A mixed order: bring both mooncakes down, collect 10 apple chews, clear the chocolate and free the liquorice in 38 moves.',
      badge: { id: 'mooncakedelivery', name: 'Mooncake Delivery', icon: '🥮' } },
    { n: 65, name: 'Hainan Starfruit Sprint', target: 0, scoreGoal: 12500, moves: 30, stars: [0, 13000, 19000], kinds: 6,
      help: 'Score 12,500 points before your 30 moves run out.',
      badge: { id: 'starfruitsprint', name: 'Starfruit Sprint', icon: '⭐' } },
    // 1.9.258 Continue east across the Taiwan Strait and the East China Sea.
    { n: 66, name: 'Taipei Lantern Market', target: 0, moves: 32, stars: [0, 7200, 14400], kinds: 6,
      collect: { color: 4, n: 12 },
      bub: ['10000001', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '10000001'],
      help: 'Collect 12 blueberry gems and pop the four sugar bubbles around Taipei’s lantern market in 32 moves.',
      badge: { id: 'taipeilantern', name: 'Lantern Market', icon: '🏮' } },
    { n: 67, name: 'Naha Coral Garden', target: 0, moves: 34, stars: [0, 7600, 15200], kinds: 6,
      jelly: ['00000000', '00111100', '01100110', '11000011', '11000011', '01100110', '00111100', '00000000'],
      help: 'Clear the reef-ring jelly surrounding the coral garden in 34 moves.',
      badge: { id: 'nahacoral', name: 'Coral Garden', icon: '🐠' } },
    { n: 68, name: 'Fukuoka Mochi Delivery', target: 0, moves: 34, stars: [0, 7800, 15600], kinds: 6,
      ings: [[0, 2], [0, 5]],
      ice: ['00000000', '00000000', '00000000', '00011000', '00011000', '00000000', '00000000', '00000000'],
      help: 'Bring both mochi treats down and crack the four icy blocks in 34 moves.',
      badge: { id: 'fukuokamochi', name: 'Mochi Delivery', icon: '🍡' } },
    { n: 69, name: 'Seoul Palace Garden', target: 0, moves: 34, stars: [0, 7900, 15800], kinds: 6,
      collect: { color: 2, n: 12 },
      locks: ['00000000', '00000000', '00000000', '00011000', '00011000', '00000000', '00000000', '00000000'],
      help: 'Collect 12 lemon drops and free the four locked jars in the palace garden in 34 moves.',
      badge: { id: 'seoulgarden', name: 'Palace Garden', icon: '🌿' } },
    { n: 70, name: 'Tokyo Star Parade', target: 0, scoreGoal: 14500, moves: 34, stars: [0, 16000, 24000], kinds: 6,
      help: 'Score 14,500 points before your 34 moves run out.',
      badge: { id: 'tokyostars', name: 'Star Parade', icon: '🌟' } },
    // 1.9.260: five new stops hop east from Japan through Micronesia and Kiribati.
    { n: 71, name: 'Koror Jelly Lagoon', target: 0, moves: 36, stars: [0, 8200, 16400], kinds: 6,
      jelly: ['00000000', '00111100', '01100110', '01000010', '01000010', '01100110', '00111100', '00000000'],
      bub: ['00000000', '01000010', '00100100', '00000000', '00000000', '00100100', '01000010', '00000000'],
      help: 'Clear the reef-ring jelly and pop all 8 sugar bubbles in 36 moves.',
      badge: { id: 'kororlagoon', name: 'Jelly Lagoon', icon: '🐠' } },
    { n: 72, name: 'Palikir Coconut Falls', target: 0, moves: 36, stars: [0, 8400, 16800], kinds: 6,
      ings: [[0, 2], [0, 5]], ingIcon: '🥥',
      ice: ['00000000', '00000000', '00000000', '00011000', '00011000', '00000000', '00000000', '00000000'],
      help: 'Bring both coconut treats down and clear all 4 blocks of icing in 36 moves.',
      badge: { id: 'palikircoconut', name: 'Coconut Falls', icon: '🥥' } },
    { n: 73, name: 'Majuro Atoll Recipe', target: 0, moves: 36, stars: [0, 8500, 17000], kinds: 6,
      recipe: { candies: [{ color: 1, n: 10 }, { color: 4, n: 8 }], specials: [{ kind: 'w', n: 1 }] },
      help: 'Collect 10 orange jellies and 8 blueberry gems, then make one wrapped sweet in 36 moves.',
      badge: { id: 'majurorecipe', name: 'Atoll Recipe', icon: '📜' } },
    { n: 74, name: 'Yaren Sugar Sprite Search', target: 0, moves: 34, stars: [0, 8200, 16400], kinds: 6,
      ice: ['00000000', '00000000', '00111100', '00000000', '00100100', '00000000', '00000000', '00000000'],
      iceGoal: false, hiddenIcon: '🧚',
      hidden: ['00000000', '00000000', '00111100', '00000000', '00100100', '00000000', '00000000', '00000000'],
      help: 'Uncover all 6 sugar sprites hidden under the frosting in 34 moves.',
      badge: { id: 'yarensprites', name: 'Yaren Sprite Search', icon: '🧚' } },
    { n: 75, name: 'South Tarawa Syrup Crossing', target: 0, moves: 40, stars: [0, 9000, 18000], kinds: 6, hard: 1,
      flow: ['00000000', '00000000', '00110000', '00010000', '00010000', '00011100', '00010000', '00000000'],
      poppers: ['00000000', '00000000', '00000000', '01000000', '00100000', '00000000', '00000000', '00000000'],
      bub: ['10000001', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '10000001'],
      help: 'Clear the 8 syrup clogs and pop all 4 lagoon bubbles in 40 moves. The two Popper bombs can blast a path through the channel.',
      badge: { id: 'tarawasyrup', name: 'Syrup Crossing', icon: '🌈' } }
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
    { icon: '🦢', goal: 'Finish every objective', detail: 'Clear the double jelly in the river, free 2 jars, pop 2 bubbles and free the liquorice, with chocolate on the loose — all in 26 moves.', tip: 'The Super Hard finale. Free the corner liquorice early and keep the chocolate in check.', mechanic: 'swan' },
    { icon: '🐸', goal: 'Clear the city-square jelly and free the jars', detail: "Clear the jelly in Adelaide's 5 city squares and free 4 locked jars in 30 moves.", tip: 'Adelaide is laid out around five squares. Work the corners early; the jars sit between them.', mechanic: 'squares' },
    { icon: '🍩', goal: 'Bring both doughnuts down, pop the bubbles and free the liquorice', detail: 'Bring both hot jam doughnuts down the laneway, pop 4 sugar bubbles and free the liquorice in 31 moves.', tip: 'Free the liquorice in the middle before it creeps, then clear the columns under each doughnut.', mechanic: 'laneway' },
    { icon: '⛴️', goal: 'Clear the river jelly and crack the blossom icing', detail: 'Clear the jelly along the winding Brisbane River (double on the bends) and crack 8 blocks of jacaranda-blossom icing in 31 moves.', tip: 'Follow the river like the CityCat: the bends are where matches pile up. Hit the corner icing with specials.', mechanic: 'river' },
    { icon: '🦜', goal: 'Clear the village jelly, pop the bubbles and free the jars', detail: 'Clear the jelly under the stilt village, pop 4 sugar bubbles and free 2 locked jars in 24 moves.', tip: 'The jelly sits along the bottom two rows. Matches down there also bring new sweets tumbling in from the top.', mechanic: 'village' },
    { icon: '🐠', goal: 'Clear the reef jelly and pop the lagoon bubbles', detail: 'Clear the reef-ring jelly around Honiara lagoon and pop the 4 sugar bubbles in 30 moves.', tip: 'The jelly is a ring. Clear a side of it and the bubbles in the middle pop together.', mechanic: 'reef' },
    { icon: '🥭', goal: 'Bring both mangoes down and crack the icing', detail: 'Bring both market mangoes down the waterfront and crack the 4 icing blocks in 32 moves.', tip: 'Match under each mango to drop it. The icing sits in two pairs on the way down.', mechanic: 'market' },
    { icon: '🥥', goal: 'Bring both coconuts down and clear the beach jelly', detail: 'Bring both coconuts down onto the beach and clear the jelly along the sand in 36 moves.', tip: 'Drop the coconuts first, then sweep the bottom two rows of jelly.', mechanic: 'beach' },
    { icon: '⛵', goal: 'Clear the bay jelly, free the jars and pop the bubbles', detail: 'Clear the jelly across the bay, free the 4 locked jars and pop the 2 sugar bubbles in 30 moves.', tip: 'The harbour arch splits the middle. Work above and below it.', mechanic: 'bay' },
    { icon: '🌴', goal: 'Clear the gate jelly and crack the market icing', detail: 'Clear the jelly by the temple gates and crack the 4 icing blocks in the market in 32 moves.', tip: 'The jelly sits in the four corners, like the gates. The icing is just inside each pair.', mechanic: 'gates' },
    { icon: '🚩', goal: 'Clear the lake jelly and pop the bubbles', detail: 'Clear the jelly around the lake and pop the 4 sugar bubbles on the water in 32 moves.', tip: 'The jelly is a ring around the lake. Pop one bubble and the one beside it follows.', mechanic: 'lake' },
    { icon: '🍎', goal: 'Clear the wharf jelly and crack the mountain icing', detail: 'Clear the jelly along the wharf and crack the 4 icing blocks on the mountain in 34 moves.', tip: 'The icing sits in the top corners, like the mountain. The jelly is the wharf along the bottom.', mechanic: 'wharf' },
    { icon: '🏮', goal: 'Clear the lantern jelly and pop the bubbles', detail: 'Clear the lantern-ring jelly along the river and pop the 4 sugar bubbles in 30 moves.', tip: 'The jelly is a ring. Pop one bubble and the one beside it follows.', mechanic: 'reef' },
    { icon: '🌙', goal: 'Clear the market jelly and crack the icing', detail: 'Clear the jelly by the market gates and crack the 4 icing blocks in 32 moves.', tip: 'The jelly sits in the four corners, like the gates. The icing is just inside each pair.', mechanic: 'gates' },
    { icon: '🪷', goal: 'Clear the river jelly, pop the bubbles and free the jars', detail: 'Clear the jelly along the river steps, pop 4 sugar bubbles and free 2 locked jars in 24 moves.', tip: 'The jelly sits along the bottom two rows. The jars are in the middle.', mechanic: 'village' },
    { icon: '🌼', goal: 'Bring both flowers down and crack the icing', detail: 'Bring both flowers down to the pagoda and crack the 4 icing blocks in 32 moves.', tip: 'Match under each flower to drop it. The icing sits in two pairs on the way down.', mechanic: 'market' },
    { icon: '🪔', goal: 'Clear the market jelly and crack the gate icing', detail: 'Clear the jelly along the market and crack the 4 icing blocks by the gate in 34 moves.', tip: 'The icing sits in the top corners, like the gate. The jelly is the market along the bottom.', mechanic: 'wharf' },
    { icon: '🎏', goal: 'Clear the courtyard jelly', detail: 'Clear every jelly in 28 moves.', tip: 'The turquoise row is a conveyor: after each move its sweets slide one place to the right and loop around. You can use the moving line to set up matches.', mechanic: 'conveyor' },
    { icon: '🚤', goal: 'Pop all the sugar bubbles', detail: 'Pop every sugar bubble in 30 moves.', tip: 'Two lanes run in opposite directions. Bubbled sweets travel with the conveyor, but still need a match beside them or a special to pop.', mechanic: 'opposing-belts' },
    { icon: '🍍', goal: 'Bring both pineapple treats down and crack the icing', detail: 'Bring both treats down and clear all the icing in 34 moves.', tip: 'Both lanes reverse after each move. Watch the arrows before you swap, then clear the icing out of the way.', mechanic: 'reversing-current' },
    { icon: '🌿', goal: 'Clear the jelly and free the jars', detail: 'Clear every jelly and free all the locked jars in 36 moves.', tip: 'The garden lanes reverse after every turn. Keep an eye on both the jelly and the four jars as the sweets travel.', mechanic: 'garden-express' },
    { icon: '🏮', goal: 'Clear the riverfront jelly and free the jars', detail: 'Clear the riverfront jelly and free all 4 locked jars in 32 moves.', tip: 'Work along the river edge first, then free the jars in the middle.', mechanic: 'mekong' },
    { icon: '⭐', goal: 'Pop all the sugar bubbles', detail: 'Pop all 8 sugar bubbles around Manila Bay in 32 moves.', tip: 'Bubbles touching each other pop together. Start near the middle of the cluster.', mechanic: 'bub' },
    { icon: '🥭', goal: 'Bring both mangoes down and crack the icing', detail: 'Bring both mango treats down and crack the 4 icing blocks in 34 moves.', tip: 'Match underneath the mangoes to bring them down, and use specials to reach the icing.', mechanic: 'market' },
    { icon: '🏯', goal: 'Clear the garden jelly and free the jars', detail: 'Clear the garden-path jelly and free all 4 locked jars in 34 moves.', tip: 'The jelly is in the outer corners; work inward toward the jars.', mechanic: 'gates' },
    { icon: '🌙', goal: 'Clear the jelly, crack the icing and free the jars', detail: 'Clear the garden jelly, crack the 4 icy corners and free all 4 locked jars in 36 moves.', tip: 'The corner icing and the central jars both need attention. Specials can help reach the edges.', mechanic: 'mix' },
    { icon: '💜', goal: 'Clear the courtyard jelly and pop the bubbles', detail: 'Clear the market-courtyard jelly and pop all 4 sugar bubbles in 34 moves.', tip: 'Work around the courtyard ring, then pop the bubbles in the middle.', mechanic: 'mekong' },
    { icon: '🎁', goal: 'Bring both treats down and crack the icing', detail: 'Bring both garden treats down and crack the 4 icing blocks in 34 moves.', tip: 'Match beneath each treat to bring it down; specials can reach the icing.', mechanic: 'market' },
    { icon: '🔒', goal: 'Clear the double jelly and free the jars', detail: 'Clear all the double-layer tilework and free the 4 locked jars in 36 moves.', tip: 'The thick jelly needs two clears. Work the outer corners while the jars wait in the courtyard.', mechanic: 'garden' },
    { icon: '🫧', goal: 'Clear the jelly, pop the bubbles and stop the chocolate', detail: 'Clear the steppe-ring jelly, pop all 4 sugar bubbles and keep the chocolate in check in 36 moves.', tip: 'Pop a corner bubble early; remember that chocolate spreads if you leave it untouched.', mechanic: 'mix' },
    { icon: '🐉', goal: 'Clear the jelly, crack the icing and free the jars', detail: 'Clear the wall-shaped jelly, crack the 4 icy corners and free all 4 locked jars in 38 moves.', tip: 'Three objectives share the board. Make matches along the jelly wall, then use specials to reach the icy corners.', mechanic: 'mix' },
    { icon: '🏮', goal: 'Clear the terracotta-ring jelly and crack the icing', detail: 'Clear the jelly and crack all 4 icy corners in 36 moves.', tip: "The wall-shaped jelly wraps around the tray. Specials can reach the four corner icing blocks.", mechanic: 'terracotta' },
    { icon: '🐼', goal: 'Clear the garden jelly and pop the bubbles', detail: 'Clear every jelly and pop all 4 sugar bubbles in 36 moves.', tip: 'Work around the garden ring, then make matches beside the bubbles at the edges.', mechanic: 'panda' },
    { icon: '🚇', goal: 'Bring both treats down and free the jars', detail: 'Bring both treats down and free all 4 locked jars in 38 moves.', tip: 'The treats and jars need attention in different parts of the board. Make a clear lane beneath each treat.', mechanic: 'mountain-rail' },
    { icon: '🌃', goal: 'Clear the double jelly and stop the chocolate', detail: 'Clear every double-layer jelly while keeping the chocolate in check in 38 moves.', tip: 'Some jelly needs two clears. Hit the chocolate when you can so it does not spread.', mechanic: 'bund' },
    { icon: '🌸', goal: 'Clear the jelly, crack the icing and free the jars', detail: 'Clear the jelly, crack the 4 icy corners and free all 4 locked jars in 40 moves.', tip: 'A little of everything in the final city stop: work the jelly ring and use specials to reach the corners.', mechanic: 'pearl-river' },
    { icon: '📜', goal: 'Fill the recipe and create a wrapped sweet', detail: 'Collect 10 cherry gumdrops and 8 blueberry gems, then create a wrapped sweet in 32 moves.', tip: 'Make a T- or L-shaped match to create a wrapped sweet. The recipe counts collected colours and each special as soon as you make it.', mechanic: 'recipe' },
    { icon: '🪷', goal: 'Clear the lotus-lake jelly', detail: 'Clear every jelly around the lotus lake in 34 moves.', tip: 'Work around the lake ring and clear the jelly underneath each sweet.', mechanic: 'jelly' },
    { icon: '⚡', goal: 'Fill the recipe and make a double-stripe blast', detail: 'Collect 10 orange jelly sweets and swap two stripe sweets together to make a double-stripe blast in 36 moves.', tip: 'First make two stripe sweets with four-in-a-line matches. Then swap them together to create the double-stripe blast.', mechanic: 'recipe' },
    { icon: '🏮', goal: 'Race the lantern clock', detail: 'Collect 12 lemon drops and clear the lantern-path jelly before time runs out.', tip: 'You have 1 minute 30 seconds. Make quick matches on the jelly path while collecting lemon drops.', mechanic: 'timer' },
    { icon: '🧚', goal: 'Uncover the sugar sprites', detail: 'Uncover all 6 sugar sprites hidden under the frosting in 34 moves.', tip: 'The tiny silhouettes mark sprites beneath the icing. Match next to the frosting or hit it with a special to uncover them.', mechanic: 'hidden' },
    { icon: '🌈', goal: 'Open the syrup stream', detail: 'Clear the 8 candy clogs along the marked syrup channel and use the two 3×3 Popper bombs to help clear the path in 34 moves.', tip: 'Match on the rainbow-marked tiles to clear the clogs. A match next to a Popper sets it off in a 3×3 blast; the bombs can chain.', mechanic: 'flow' },
    { icon: '🥮', goal: 'Finish the mooncake delivery', detail: 'Bring both mooncakes down, collect 10 apple chews, clear the chocolate and free the liquorice in 38 moves.', tip: 'This mixed order has treats to deliver and blockers to handle. Keep the chocolate and liquorice from spreading while you collect apple chews.', mechanic: 'mix' },
    { icon: '⭐', goal: 'Reach the star score', detail: 'Score 12,500 points before your 30 moves run out.', tip: 'Long matches and special sweets score more. Keep chaining matches to reach the target.', mechanic: 'score' },
    { icon: '🏮', goal: 'Collect blueberry gems and pop the bubbles', detail: 'Collect 12 blueberry gems and pop the four sugar bubbles in 32 moves.', tip: 'The bubbles are tucked into the corners. Make matches nearby while you gather the blueberry gems.', mechanic: 'collect-bubbles' },
    { icon: '🐠', goal: 'Clear the coral-ring jelly', detail: 'Clear the reef-shaped jelly in 34 moves.', tip: 'Work around the outer ring, then clear the last pieces in the corners.', mechanic: 'jelly' },
    { icon: '🍡', goal: 'Bring both mochi treats down and crack the icing', detail: 'Bring both treats down and clear the four blocks of icing in 34 moves.', tip: 'Match underneath each treat to bring it down; nearby matches will chip away at the icing.', mechanic: 'ingredients' },
    { icon: '🌿', goal: 'Collect lemon drops and free the jars', detail: 'Collect 12 lemon drops and free the four locked jars in 34 moves.', tip: 'A match that includes a locked jar frees it. Keep collecting lemon drops as you work through the middle.', mechanic: 'collect-locks' },
    { icon: '🌟', goal: 'Reach the star score', detail: 'Score 14,500 points before your 34 moves run out.', tip: 'Long matches and special sweets score more. Chain matches together to light up the Tokyo night.', mechanic: 'score' },
    { icon: '🐠', goal: 'Clear the reef jelly and pop the lagoon bubbles', detail: 'Clear the reef-ring jelly and pop all 8 sugar bubbles in 36 moves.', tip: 'Work around the jelly ring, then match beside the bubbled sweets. Bubbles touching each other pop together.', mechanic: 'reef-bubbles' },
    { icon: '🥥', goal: 'Bring both coconuts down and clear the icing', detail: 'Bring both coconut treats down and clear all 4 blocks of icing in 36 moves.', tip: 'Match underneath each coconut to bring it down; nearby matches or specials will crack the icing.', mechanic: 'ingredients-ice' },
    { icon: '📜', goal: 'Fill the atoll recipe and make a wrapped sweet', detail: 'Collect 10 orange jellies and 8 blueberry gems, then make one wrapped sweet in 36 moves.', tip: 'A T- or L-shaped match creates a wrapped sweet. The recipe counts both colours and the special as soon as you make them.', mechanic: 'recipe' },
    { icon: '🧚', goal: 'Uncover the sugar sprites', detail: 'Uncover all 6 sugar sprites hidden under the frosting in 34 moves.', tip: 'The tiny silhouettes mark sprites beneath the icing. Match next to the frosting or hit it with a special to uncover them.', mechanic: 'hidden' },
    { icon: '🌈', goal: 'Clear the syrup clogs and pop the bubbles', detail: 'Clear all 8 syrup clogs and pop the 4 lagoon bubbles in 40 moves.', tip: 'Match on the rainbow-marked channel. A match beside a Popper triggers its 3×3 blast, which can clear clogs and help pop bubbles.', mechanic: 'flow-bubbles' }
  ];
  // 1.9.285 Gameplay overhaul. Shane: "the challenges are all the same". New mechanics (countdown bombs, candy cannons,
  // portals, multi-layer frosting, bosses with a health bar, more timed and order levels) are spread through the
  // campaign so neighbouring levels feel different and every country brings something new. Goals stay objectives.
  const MIRROR_PORTALS = [0, 1, 2, 3, 4, 5, 6, 7].map(function (c) { return { from: [2, c], to: [4, 7 - c] }; });
  const SPLIT_MASK = ['XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '........', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX'];
  const SIDE_PORTALS = [0, 1, 2, 3].map(function (c) { return { from: [7, c], to: [0, c + 4] }; });
  const LEVEL_REWORK_285 = {
    25: { moves: 37, set: { ice: ['31000000', '10000000', '00000000', '00000001', '00000013', '00000000', '10000000', '31000000'] },
      intro: { icon: '🧁', goal: 'Clear the river jelly and the triple frosting', line: 'Clear the jelly along the river and crack the jacaranda frosting (the corner blocks have three layers)', tip: 'The corner frosting has three layers. Matches beside it, or a special, take one layer at a time.', mechanic: 'ice' } },
    26: { moves: 24, drop: ['bub', 'locks'], set: { jelly: ['00000000', '00000000', '00000000', '00011000', '00111100', '01111110', '11111111', '11111111'], fuses: [[0, 1, 12], [0, 6, 14], [2, 3, 16]] },
      intro: { icon: '💣', goal: 'Clear the jelly before a bomb goes off', line: 'Clear the paradise jelly before any countdown bomb reaches zero', tip: 'Countdown bombs tick down by one every move. Match one to defuse it. If one reaches zero, the level is lost.', mechanic: 'fuse' } },
    27: { moves: 28, drop: ['jelly', 'bub'], set: { recipe: { candies: [{ color: 4, n: 36 }, { color: 3, n: 30 }], specials: [{ kind: 'w', n: 2 }] } },
      intro: { icon: '🧾', goal: 'Fill the reef order', line: 'Fill the order: 36 blueberry gems, 30 apple chews and 2 wrapped sweets', tip: 'Order levels ask for exact sweets. Make a wrapped sweet with an L or T shape of five.', mechanic: 'order' } },
    28: { moves: 32, drop: ['ings'], set: { cannons: [{ c: 3, drop: 'ing', every: 6, max: 3 }] },
      intro: { icon: '🌋', goal: 'Bring down the volcano treats', line: 'The volcano cannon drops 3 treats. Bring all 3 down and crack the icing', tip: 'A candy cannon sits above a column and drops a new treat every few moves. Clear under it to bring it down.', mechanic: 'cannon' } },
    29: { moves: 36, drop: ['ings', 'ingStyle', 'ingIcon'], set: { timer: 110, jelly: ['11000011', '12222221', '02111120', '02100120', '02100120', '02111120', '12222221', '11000011'] },
      intro: { icon: '⏱️', goal: 'Clear the jelly against the clock', line: 'Clear the beach jelly', tip: 'Beat the clock! You have moves and seconds — the timer starts with your first look at the board.', mechanic: 'timer' } },
    30: { moves: 30, drop: ['locks', 'bub'], set: { mask: SPLIT_MASK, portals: MIRROR_PORTALS, jelly: ['00000000', '00000000', '00000000', '00000000', '00000000', '11111111', '11111111', '00000000'] },
      intro: { icon: '🌀', goal: 'Clear the lagoon jelly through the portals', line: 'Clear the jelly in the lower lagoon. Sweets reach it only through the portals', tip: 'Portals link the two pools: a sweet that drops into a purple portal comes out of the matching orange one below.', mechanic: 'portal' } },
    31: { moves: 32, drop: ['jelly', 'ice'], set: { liq: ['00000000', '00000000', '00011000', '00100100', '00100100', '00011000', '00000000', '00000000'], cannons: [{ c: 1, drop: 'liq', every: 5, max: 3 }, { c: 6, drop: 'liq', every: 5, max: 3 }] },
      intro: { icon: '➿', goal: 'Free all the liquorice — even the cannon’s', line: 'Free every liquorice sweet, including the 6 that the market cannons fire', tip: 'Twist: these cannons fire liquorice-wrapped sweets. Free them as they land so the liquorice cannot creep.', mechanic: 'cannon', twist: { icon: '➿', name: 'Liquorice cannons', text: 'Cannons that fire wrapped liquorice.' } } },
    32: { moves: 32, drop: ['jelly', 'bub'], set: { recipe: { candies: [{ color: 3, n: 48 }, { color: 0, n: 48 }] } },
      intro: { icon: '🧾', goal: 'Fill the lakeside order', line: 'Fill the order: 48 apple chews and 48 cherry gumdrops', tip: 'Only these two colours count. Twist: a mega order — two big piles of one colour each. Big matches and specials of the right colour go a long way.', mechanic: 'order', twist: { icon: '🧺', name: 'Mega order', text: 'Twice as many sweets on one order.' } } },
    33: { moves: 29, drop: ['jelly', 'ice'], set: { boss: { r: 2, c: 3, hp: 34, name: 'Gummy Devil', icon: '😈' } },
      intro: { icon: '😈', goal: 'Beat the Gummy Devil', line: 'Knock the Gummy Devil’s health bar down to zero', tip: 'Boss level! Every match next to the boss, and every special that hits it, takes a heart. Leave it alone for a move and it heals one.', mechanic: 'boss' } },
    34: { moves: 28, drop: ['bub'], set: { belts: [{ row: 2, dir: 1 }, { row: 5, dir: -1 }], jelly: ['11111111', '11111111', '22222222', '11111111', '11111111', '22222222', '11111111', '11111111'] },
      intro: { icon: '🛶', goal: 'Clear the jelly on the floating market', line: 'Clear all the jelly across the floating market, double on the two belts', tip: 'Conveyor belts slide their row one step after every move. Plan your match for where the sweets will be.', mechanic: 'belts' } },
    35: { moves: 36, set: { fuses: [[3, 1, 6], [3, 6, 7], [6, 3, 8]] },
      intro: { icon: '💣', goal: 'Clear the icing on a short fuse', line: 'Clear the jelly and crack the icing while you defuse 3 quick countdown bombs', tip: 'Twist: these bombs start low. Defuse the smallest number first.', mechanic: 'fuse', twist: { icon: '🧨', name: 'Short fuses', text: 'Countdown bombs that start on single digits.' } } },
    36: { moves: 20, drop: ['jelly', 'bub', 'locks'], set: { timer: 80, recipe: { candies: [{ color: 1, n: 26 }], specials: [{ kind: 'w', n: 1 }] } },
      intro: { icon: '🛺', goal: 'Rush order: oranges and a wrapped sweet', line: 'Rush order: 26 orange jellies and 1 wrapped sweet', tip: 'Twist: an order with a clock. Look for oranges first, then make the wrapped sweet.', mechanic: 'order', twist: { icon: '⏱️', name: 'Rush orders', text: 'Orders against the clock.' } } },
    37: { moves: 32, drop: ['ice'], set: { mask: SPLIT_MASK, portals: MIRROR_PORTALS, ings: [[0, 2], [0, 5]], ingIcon: '🪷' },
      intro: { icon: '🪷', goal: 'Send the lotus treats through the portals', line: 'Guide both lotus treats through the portals and down to the bottom', tip: 'Twist: ingredients travel through portals too. A treat that drops into a portal pops out of its twin below.', mechanic: 'portal', twist: { icon: '🌀', name: 'Portal deliveries', text: 'Bring treats down through the portals.' } } },
    38: { moves: 34, set: { ice: ['44000044', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000'] },
      intro: { icon: '🪔', goal: 'Clear the jelly and the four-layer frosting', line: 'Clear the bottom jelly and crack the four-layer frosting in the corners', tip: 'Twist: four layers of frosting. Specials fired into the corners crack them fastest.', mechanic: 'ice', twist: { icon: '🧁', name: 'Four-layer frosting', text: 'Frosting that takes four hits.' } } },
    39: { moves: 32, drop: ['belts'], set: { jelly: ['11000011', '12222221', '02222220', '02111120', '02111120', '12222221', '11000011', '00000000'], cannons: [{ c: 2, drop: 'fuse', every: 6, fuse: 10, max: 4 }, { c: 5, drop: 'fuse', every: 6, fuse: 10, max: 4 }] },
      intro: { icon: '🏔️', goal: 'Clear the jelly under the bomb cannons', line: 'Clear the prayer-flag jelly while two cannons fire countdown bombs', tip: 'Twist: cannons that fire countdown bombs. Defuse each one by matching it before it reaches zero.', mechanic: 'cannon', twist: { icon: '💣', name: 'Bomb cannons', text: 'Cannons that fire countdown bombs.' } } },
    40: { moves: 23, drop: ['belts'], set: { boss: { r: 3, c: 3, hp: 22, name: 'Gummy Tiger', icon: '🐯' } },
      intro: { icon: '🐯', goal: 'Beat the Gummy Tiger and pop the bubbles', line: 'Knock out the Gummy Tiger and pop every sugar bubble', tip: 'Twist: a boss behind bubbles. Pop the bubbles beside it to reach it.', mechanic: 'boss', twist: { icon: '🫧', name: 'Bubble-guarded boss', text: 'A boss hiding behind sugar bubbles.' } } },
    41: { moves: 28, set: {},
      intro: { icon: '🌧️', goal: 'Bring the pineapples down on the monsoon belts', line: 'Bring both pineapples down and crack the icing while the belts change direction', tip: 'Twist: the monsoon belts reverse direction after every move.', mechanic: 'belts', twist: { icon: '🔁', name: 'Reversing belts', text: 'Belts that switch direction every move.' } } },
    42: { moves: 26, set: { timer: 80, jelly: ['11000011', '12222221', '01000010', '01122110', '01122110', '01000010', '12222221', '11000011'] },
      intro: { icon: '🦁', goal: 'Clear the jelly and free the jars on the clock', line: 'Clear the jelly and free the locked jars on the reversing belts', tip: 'Twist: reversing belts against the clock. Match fast and watch which way the belts turn.', mechanic: 'belts', twist: { icon: '⏱️', name: 'Belts on the clock', text: 'Reversing belts with a timer.' } } },
    43: { moves: 36, drop: ['jelly', 'locks'], set: { recipe: { candies: [{ color: 2, n: 22 }], combos: [{ kind: 'crisscross', n: 1 }] } },
      intro: { icon: '🛕', goal: 'Temple order: lemons and a double-stripe blast', line: 'Fill the temple order: 22 lemon drops and 1 double-stripe blast', tip: 'Twist: an order for a combo. Make two striped sweets side by side, then swap them together.', mechanic: 'order', twist: { icon: '⚡', name: 'Combo orders', text: 'Orders that ask for a special combo.' } } },
    44: { moves: 32, set: { portals: SIDE_PORTALS, fuses: [[3, 0, 9], [3, 7, 11]], bub: ['11100111', '11100111', '01111110', '00111100', '00111100', '01111110', '11100111', '11100111'] },
      intro: { icon: '🏝️', goal: 'Island-hop the portals and pop the bubbles', line: 'Pop every sugar bubble before the 2 countdown bombs go off. The left islands feed the right ones through portals', tip: 'Twist: sweets leave the bottom of the left side and drop in at the top of the right side.', mechanic: 'portal', twist: { icon: '🏝️', name: 'Island-hop portals', text: 'Left-to-right portals.' } } },
    45: { moves: 34, drop: ['ice'], set: { fuses: [[2, 2, 12], [2, 5, 12]] },
      intro: { icon: '🥭', goal: 'Deliver the treats before the bombs go off', line: 'Bring both treats down before either countdown bomb reaches zero', tip: 'Twist: a delivery with bombs ticking. Defuse them on the way down.', mechanic: 'fuse', twist: { icon: '💣', name: 'Bomb deliveries', text: 'Deliveries with countdown bombs.' } } },
    46: { moves: 31, drop: ['jelly', 'locks'], set: { ice: ['00000000', '00222200', '02000020', '02055020', '02055020', '02000020', '00222200', '00000000'] },
      intro: { icon: '🏯', goal: 'Crack the five-layer dzong frosting', line: 'Crack every layer of frosting, right to the five-layer centre', tip: 'Twist: five layers in the middle. Break the ring first, then aim specials at the centre.', mechanic: 'ice', twist: { icon: '🧁', name: 'Five-layer frosting', text: 'The thickest frosting yet.' } } },
    47: { moves: 36, drop: ['ice', 'locks'], set: { timer: 125, jelly: ['11111111', '12222221', '12100121', '11000011', '11000011', '12100121', '12222221', '11111111'], choco: ['00000000', '00000000', '00000000', '00011000', '00011000', '00000000', '00000000', '00000000'] },
      intro: { icon: '🍫', goal: 'Clear the jelly before the chocolate spreads', line: 'Clear the jelly while the chocolate spreads, on the clock', tip: 'Twist: chocolate on the clock. Break chocolate every move or it grows.', mechanic: 'choco', twist: { icon: '⏱️', name: 'Chocolate rush', text: 'Spreading chocolate with a timer.' } } },
    48: { moves: 30, drop: ['jelly', 'bub'], set: { locks: ['00000000', '01000010', '00000000', '00011000', '00011000', '00000000', '01000010', '00000000'], cannons: [{ c: 3, drop: 'lock', every: 5, max: 4 }] },
      intro: { icon: '🔒', goal: 'Free every jar, even the cannon’s', line: 'Free all the locked jars, including the 4 the cannon fires', tip: 'Twist: a lock cannon. Each shot drops a locked jar. Match it to free it.', mechanic: 'cannon', twist: { icon: '🔒', name: 'Lock cannon', text: 'A cannon that fires locked jars.' } } },
    49: { moves: 34, drop: ['ings', 'ingIcon', 'ice'], set: { mask: SPLIT_MASK, portals: MIRROR_PORTALS, choco: ['00000000', '00011000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000'], jelly: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '11111111', '11111111'] },
      intro: { icon: '🌹', goal: 'Clear the garden jelly through the portals', line: 'Clear the lower garden jelly while chocolate grows in the pool above', tip: 'Twist: chocolate above the portals. Keep it small or it blocks the portal mouths.', mechanic: 'portal', twist: { icon: '🍫', name: 'Chocolate portals', text: 'Portals with chocolate in the way.' } } },
    50: { moves: 36, drop: ['jelly', 'locks'], set: { boss: { r: 3, c: 3, hp: 26, name: 'Gummy Camel', icon: '🐫' }, fuses: [[0, 1, 14], [0, 6, 16]] },
      intro: { icon: '🐫', goal: 'Beat the Gummy Camel before the bombs blow', line: 'Knock out the Gummy Camel before either countdown bomb reaches zero', tip: 'Milestone boss! Hit the camel and defuse the two bombs at the top.', mechanic: 'boss', twist: { icon: '💣', name: 'Boss with bombs', text: 'A boss with countdown bombs.' } } },
    51: { moves: 17, drop: ['jelly', 'bub', 'choco'], set: { belts: [{ row: 3, dir: 1 }, { row: 4, dir: -1 }], fuses: [[0, 1, 10], [0, 6, 12]], recipe: { candies: [{ color: 4, n: 48 }, { color: 5, n: 48 }] } },
      intro: { icon: '🦅', goal: 'Steppe order on the belts', line: 'Fill the order: 48 blueberry gems and 48 grape twists, with two belts running and 2 countdown bombs ticking', tip: 'Twist: an order on the belts. Watch both rows slide in opposite directions.', mechanic: 'order', twist: { icon: '🛞', name: 'Belt orders', text: 'An order with belts running.' } } },
    52: { moves: 21, set: { timer: 75 },
      intro: { icon: '🏯', goal: 'Clear the jelly, icing and jars on the clock', line: 'Clear the jelly, crack the icing and free the jars', tip: 'Twist: a Hard level with a clock as well as moves. Specials save time.', mechanic: 'mix', twist: { icon: '⏱️', name: 'Hard and timed', text: 'A hard level against the clock.' } } },
    53: { moves: 36, drop: ['ice'], set: { belts: [{ row: 3, dir: 1 }], fuses: [[3, 0, 8], [3, 7, 10]], jelly: ['00022000', '00222200', '02211220', '22100122', '22100122', '02211220', '00222200', '00022000'] },
      intro: { icon: '🚄', goal: 'Clear the jelly with bombs on the belt', line: 'Clear the jelly while two countdown bombs ride the belt', tip: 'Twist: bombs on a conveyor belt. They slide every move, so catch them as they pass.', mechanic: 'fuse', twist: { icon: '🚄', name: 'Bomb belt', text: 'Countdown bombs on a conveyor belt.' } } },
    54: { moves: 36, drop: ['jelly'], set: { bub: ['11000011', '10000001', '00011000', '00000000', '00000000', '00011000', '10000001', '11000011'], recipe: { candies: [{ color: 3, n: 40 }], specials: [{ kind: 'w', n: 3 }] } },
      intro: { icon: '🐼', goal: 'Panda order and the bamboo bubbles', line: 'Fill the panda order (40 apple chews and 3 wrapped sweets) and pop every bubble', tip: 'An order plus bubbles. Wrapped sweets pop bubbles nicely.', mechanic: 'order' } },
    56: { moves: 38, set: { portals: SIDE_PORTALS },
      intro: { icon: '🌶️', goal: 'Clear the jelly while chocolate spreads across the portals', line: 'Clear the jelly while the chocolate spreads. The left side feeds the right through portals', tip: 'Chocolate and side portals together. Break chocolate on the left so the portals keep flowing.', mechanic: 'portal' } },
    59: { moves: 42, set: { liq: ['00000000', '00000000', '00000000', '00011000', '00011000', '00000000', '00000000', '00000000'], cannons: [{ c: 0, drop: 'liq', every: 4, max: 2 }, { c: 7, drop: 'liq', every: 4, max: 2 }] },
      intro: { icon: '🧶', goal: 'Clear the triple jelly and the liquorice', line: 'Clear the triple jelly and free all the liquorice, including 4 cannon shots', tip: 'Liquorice cannons on both edges. Free the wrapped sweets as they land.', mechanic: 'cannon' } },
    65: { moves: 30, drop: ['scoreGoal'], set: { boss: { r: 2, c: 3, hp: 30, name: 'Gummy Dragon', icon: '🐉' }, jelly: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '11111111', '00000000'] },
      intro: { icon: '🐉', goal: 'Beat the Gummy Dragon and clear the jelly', line: 'Knock out the Gummy Dragon and clear the jelly at the bottom', tip: 'China’s finale boss. The dragon heals when you leave it alone, so keep hitting.', mechanic: 'boss' } },
    66: { moves: 24, set: { timer: 90, collect: { color: 4, n: 30 }, bub: ['11000011', '10011001', '00000000', '01000010', '01000010', '00000000', '10011001', '11000011'] },
      intro: { icon: '🧋', goal: 'Night-market rush', line: 'Collect 30 blueberry gems and pop all 20 bubbles before the market closes', tip: 'Twist: a collect level with a clock. Big matches first.', mechanic: 'collect', twist: { icon: '🏮', name: 'Night-market rush', text: 'Collecting against the clock.' } } },
    67: { moves: 26, set: { cannons: [{ c: 3, drop: 'fuse', every: 5, fuse: 9, max: 4 }, { c: 4, drop: 'fuse', every: 7, fuse: 11, max: 3 }] },
      intro: { icon: '🌸', goal: 'Clear the jelly under the blossom bomb cannons', line: 'Clear the jelly while two cannons drop countdown bombs', tip: 'Twist: two bomb cannons in the middle. Keep the centre moving.', mechanic: 'cannon', twist: { icon: '🌸', name: 'Blossom bomb cannons', text: 'Two bomb cannons side by side.' } } },
    69: { moves: 24, set: { cannons: [{ c: 2, drop: 'lock', every: 6, max: 3 }, { c: 5, drop: 'lock', every: 6, max: 3 }] },
      intro: { icon: '🥢', goal: 'Collect the sweets and free every jar', line: 'Collect the sweets and free every locked jar, including 6 cannon shots', tip: 'Twist: lock cannons on a collect level.', mechanic: 'cannon', twist: { icon: '🔒', name: 'Twin lock cannons', text: 'Two cannons firing locked jars.' } } },
    70: { moves: 26, drop: ['scoreGoal'], set: { recipe: { candies: [{ color: 0, n: 30 }], specials: [{ kind: 'w', n: 2 }] } },
      intro: { icon: '🌟', goal: 'Star order: 30 cherries and 2 wrapped sweets', line: 'Fill the star order: 30 cherry gumdrops and 2 wrapped sweets', tip: 'Twist: this order needs wrapped sweets too. Make L and T shapes.', mechanic: 'order', twist: { icon: '🎀', name: 'Special order', text: 'An order that asks for wrapped sweets.' } } },
    71: { moves: 24, set: { fuses: [[0, 2, 14], [0, 5, 14]] },
      intro: { icon: '🐠', goal: 'Clear the reef jelly and pop the bubbles', line: 'Clear the reef jelly and pop the bubbles before the countdown bombs go off', tip: 'Twist: bombs in the reef. Defuse them while you clear.', mechanic: 'fuse', twist: { icon: '🐠', name: 'Reef bombs', text: 'Countdown bombs on a jelly-and-bubble level.' } } },
    72: { moves: 36, set: { cannons: [{ c: 4, drop: 'ing', every: 7, max: 1 }] },
      intro: { icon: '🪨', goal: 'Bring down the stone money and crack the icing', line: 'Bring every stone-money treat down (one comes from the cannon) and crack the icing', tip: 'Twist: an extra treat arrives by cannon.', mechanic: 'cannon', twist: { icon: '🪨', name: 'Treat cannon', text: 'One more treat drops from a cannon.' } } },
    73: { moves: 32, set: { timer: 90, recipe: { candies: [{ color: 1, n: 30 }, { color: 4, n: 26 }], specials: [{ kind: 'w', n: 2 }, { kind: 'row', n: 1 }] } },
      intro: { icon: '🛶', goal: 'Atoll rush order', line: 'Fill the atoll order: 30 orange jellies, 26 blueberry gems, 2 wrapped sweets and 1 striped sweet', tip: 'Twist: an order against the clock.', mechanic: 'order', twist: { icon: '⏱️', name: 'Atoll rush', text: 'A full order with a timer.' } } },
    74: { moves: 16, set: { belts: [{ row: 4, dir: 1 }], ice: ['00000000', '03000030', '00333300', '00000000', '00300300', '03000030', '00000000', '00000000'], hidden: ['00000000', '01000010', '00111100', '00000000', '00100100', '01000010', '00000000', '00000000'] },
      intro: { icon: '🧚', goal: 'Find the hidden sprites on the belt', line: 'Crack the frosting and find every hidden sugar sprite', tip: 'Twist: a belt runs under the frosting row.', mechanic: 'ice', twist: { icon: '🧚', name: 'Sprites on the belt', text: 'Hidden sprites with a belt.' } } },
    75: { moves: 26, set: { boss: { r: 0, c: 3, hp: 22, name: 'King Gummy Crab', icon: '🦀' } },
      intro: { icon: '🦀', goal: 'Clear the syrup, pop the bubbles and beat the King Crab', line: 'Clear the syrup clogs, pop the bubbles and knock out the King Gummy Crab', tip: 'The grand finale boss! Poppers blast 3×3 — aim them at the crab.', mechanic: 'boss', twist: { icon: '🦀', name: 'Finale boss', text: 'A boss on the syrup crossing.' } } }
  };
  function reworkDetail(lv, line) {
    return line + ' in ' + lv.moves + ' moves' + (lv.timer ? ' and ' + lv.timer + ' seconds' : '') + '.';
  }
  Object.keys(LEVEL_REWORK_285).forEach(function (k) {
    const n = +k, lv = LEVELS[n - 1], w = LEVEL_REWORK_285[k];
    (w.drop || []).forEach(function (key) { delete lv[key]; });
    Object.assign(lv, w.set || {});
    if (w.moves) lv.moves = w.moves;
    const old = LEVEL_INTROS[n - 1] || {};
    LEVEL_INTROS[n - 1] = Object.assign({}, old, w.intro, { detail: reworkDetail(lv, w.intro.line) });
    lv.help = LEVEL_INTROS[n - 1].detail;
  });
  // 1.9.285 Balance: a few older levels the play-test bot cleared every time get bigger goals.
  const TUNE_285 = {
    58: { moves: 24, set: { recipe: { candies: [{ color: 0, n: 22 }, { color: 4, n: 20 }], specials: [{ kind: 'w', n: 2 }] } }, detail: 'Collect 22 cherry gumdrops and 20 blueberry gems, then create 2 wrapped sweets in 32 moves.' },
    61: { moves: 25, set: { collect: { color: 2, n: 24 }, jelly: ['00000000', '01100110', '11111111', '11111111', '11111111', '11111111', '01100110', '00000000'] }, detail: 'Collect 24 lemon drops and clear the lantern-path jelly before time runs out.' },
    62: { moves: 25, set: { ice: ['00000000', '03000030', '00333300', '00000000', '00300300', '03000030', '00000000', '00000000'], hidden: ['00000000', '01000010', '00111100', '00000000', '00100100', '01000010', '00000000', '00000000'] }, detail: 'Uncover all 10 sugar sprites hidden under the thick frosting in 34 moves.' }
  };
  Object.keys(TUNE_285).forEach(function (k) {
    const n = +k, lv = LEVELS[n - 1], w = TUNE_285[k], it = LEVEL_INTROS[n - 1] = Object.assign({}, LEVEL_INTROS[n - 1]);
    Object.assign(lv, w.set || {});
    if (w.moves) lv.moves = w.moves;
    it.detail = String(w.detail || it.detail || lv.help || '').replace(/in \d+ moves/, 'in ' + lv.moves + ' moves');
    lv.help = it.detail;
  });
  // The "New!" card: the first level that uses a mechanic introduces it. Other levels can carry a "New twist".
  const MECHANICS = [
    { id: 'collect', icon: '🍒', name: 'Collect', text: 'Collect the sweets shown on the goal.', on: lv => !!lv.collect },
    { id: 'jelly', icon: '🟩', name: 'Jelly', text: 'Match on jelly tiles to clear them.', on: lv => !!lv.jelly },
    { id: 'locks', icon: '🔒', name: 'Locked jars', text: 'Include a locked jar in a match to free it.', on: lv => !!lv.locks },
    { id: 'ice', icon: '🧁', name: 'Frosting', text: 'Match next to frosting to chip it away.', on: lv => !!lv.ice },
    { id: 'ings', icon: '🎁', name: 'Ingredients', text: 'Bring treats down to the bottom row.', on: lv => !!(lv.ings && lv.ings.length) },
    { id: 'choco', icon: '🍫', name: 'Chocolate', text: 'Chocolate spreads if you do not break some each move.', on: lv => !!lv.choco },
    { id: 'bub', icon: '🫧', name: 'Sugar bubbles', text: 'Pop bubbles with a match next to them.', on: lv => !!lv.bub },
    { id: 'liq', icon: '➿', name: 'Liquorice', text: 'Liquorice creeps unless you free some.', on: lv => !!lv.liq },
    { id: 'frost3', icon: '🧁', name: 'Thick frosting', text: 'Frosting with three or more layers — each hit takes one.', on: lv => !!(lv.ice && lv.ice.some(r => /[3-9]/.test(r))) },
    { id: 'fuse', icon: '💣', name: 'Countdown bombs', text: 'They tick down every move. Match one to defuse it before it reaches zero.', on: lv => !!((lv.fuses && lv.fuses.length) || (lv.cannons || []).some(c => c.drop === 'fuse')) },
    { id: 'order', icon: '🧾', name: 'Orders', text: 'Collect exactly the sweets and specials on the order.', on: lv => !!lv.recipe },
    { id: 'cannon', icon: '🌋', name: 'Candy cannons', text: 'A cannon above a column drops a new treat or obstacle every few moves.', on: lv => !!(lv.cannons && lv.cannons.length) },
    { id: 'timer', icon: '⏱️', name: 'Beat the clock', text: 'Moves and seconds: finish before either runs out.', on: lv => !!lv.timer },
    { id: 'portal', icon: '🌀', name: 'Portals', text: 'Sweets that drop into a portal come out of its twin.', on: lv => !!(lv.portals && lv.portals.length) },
    { id: 'boss', icon: '👾', name: 'Boss', text: 'Knock its health bar to zero with matches and specials beside it. It heals if left alone.', on: lv => !!lv.boss },
    { id: 'belts', icon: '🛞', name: 'Conveyor belts', text: 'Belts slide their row one step after every move.', on: lv => !!(lv.belts && lv.belts.length) },
    { id: 'hidden', icon: '🧚', name: 'Hidden sprites', text: 'Crack the frosting to find what is hiding under it.', on: lv => !!lv.hidden },
    { id: 'flow', icon: '🌈', name: 'Syrup clogs and Poppers', text: 'Poppers blast 3×3. Clear the syrup channel.', on: lv => !!lv.flow }
  ];
  const MECHANIC_FIRST = {};
  LEVELS.forEach(function (lv) { MECHANICS.forEach(function (m) { if (MECHANIC_FIRST[m.id] == null && m.on(lv)) MECHANIC_FIRST[m.id] = lv.n; }); });
  function newsFor(n) {
    const lv = LEVELS[(n | 0) - 1]; if (!lv) return null;
    const fresh = MECHANICS.filter(function (m) { return MECHANIC_FIRST[m.id] === lv.n && lv.n > 2; });
    if (fresh.length) { const m = fresh[fresh.length - 1]; return { kind: 'new', icon: m.icon, name: m.name, text: m.text, id: m.id }; }
    const w = LEVEL_REWORK_285[lv.n];
    if (w && w.intro && w.intro.twist) return Object.assign({ kind: 'twist' }, w.intro.twist);
    return null;
  }
  function levelIntro(n, p) {
    const lv = LEVELS[(n | 0) - 1]; if (!lv) return null;
    const info = LEVEL_INTROS[(n | 0) - 1] || LEVEL_INTROS[0];
    const stop = stopForLevel(n) || { place: '' };
    const stars = (p && p.stars && p.stars[n - 1]) || 0;
    return {
      n: lv.n, name: lv.name, place: stop.place, title: lv.name,
      stopLine: 'Level ' + lv.n + ' · ' + stop.place,
      icon: info.icon, goal: info.goal, detail: info.detail, tip: info.tip, mechanic: info.mechanic,
      moves: lv.moves, timer: lv.timer || 0, badge: lv.badge, stars: stars, theme: lv.theme || '',
      strip: info.goal + ' · ' + (lv.timer ? lv.timer + ' seconds' : lv.moves + ' moves'),
      news: newsFor(n)
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
    ],
    // 1.9.232 Adelaide and Melbourne recaps.
    23: [
      {
        id: 'recap23', kind: 'recap',
        title: 'Adelaide',
        bubble: 'Five city squares and a frog cake waiting at the end.',
        items: [
          { icon: '💜', text: 'Clear the jelly in the five squares' },
          { icon: '🔒', text: 'Free the locked jars' }
        ]
      }
    ],
    24: [
      {
        id: 'recap24', kind: 'recap',
        title: 'Melbourne',
        bubble: 'Laneway lights, trams and hot jam doughnuts.',
        items: [
          { icon: '🍩', text: 'Bring both doughnuts down' },
          { icon: '🫧', text: 'Pop the sugar bubbles' },
          { icon: '➿', text: 'Free the liquorice' }
        ]
      }
    ],
    // 1.9.233 Brisbane recap.
    25: [
      {
        id: 'recap25', kind: 'recap',
        title: 'Brisbane',
        bubble: 'Jacarandas, the Story Bridge and a CityCat on the river.',
        items: [
          { icon: '💜', text: 'Clear the jelly along the river' },
          { icon: '🧁', text: 'Crack the blossom icing' }
        ]
      }
    ],
    // 1.9.234 Papua New Guinea recap.
    26: [
      {
        id: 'recap26', kind: 'recap',
        title: 'Papua New Guinea',
        bubble: 'Port Moresby: a stilt village, a lakatoi and a bird of paradise.',
        items: [
          { icon: '💜', text: 'Clear the jelly under the stilt village' },
          { icon: '🫧', text: 'Pop the sugar bubbles' },
          { icon: '🔒', text: 'Free the locked jars' }
        ]
      }
    ],
    27: [{ id: 'recap27', kind: 'recap', title: 'Solomon Islands', bubble: 'Honiara: a reef ring around the lagoon.',
      items: [{ icon: '💜', text: 'Clear the reef-ring jelly' }, { icon: '🫧', text: 'Pop the sugar bubbles' }] }],
    28: [{ id: 'recap28', kind: 'recap', title: 'Vanuatu', bubble: 'Port Vila: mangoes on the waterfront.',
      items: [{ icon: '🥭', text: 'Bring both mangoes down' }, { icon: '🧁', text: 'Crack the icing' }] }],
    29: [{ id: 'recap29', kind: 'recap', title: 'Fiji', bubble: 'A bula from the beach: coconuts and sand jelly.',
      items: [{ icon: '🥥', text: 'Bring both coconuts down' }, { icon: '💜', text: 'Clear the beach jelly' }] }],
    30: [{ id: 'recap30', kind: 'recap', title: 'New Caledonia', bubble: 'Nouméa: a bay, a sail and jars on the quay.',
      items: [{ icon: '💜', text: 'Clear the bay jelly' }, { icon: '🔒', text: 'Free the locked jars' }, { icon: '🫧', text: 'Pop the sugar bubbles' }] }],
    31: [{ id: 'recap31', kind: 'recap', title: 'Indonesia', bubble: 'Bali: temple gates and a beach market.',
      items: [{ icon: '💜', text: 'Clear the jelly by the gates' }, { icon: '🧁', text: 'Crack the market icing' }] }],
    32: [{ id: 'recap32', kind: 'recap', title: 'Canberra', bubble: 'A lake, a flag and autumn trees.',
      items: [{ icon: '💜', text: 'Clear the jelly around the lake' }, { icon: '🫧', text: 'Pop the sugar bubbles' }] }],
    33: [{ id: 'recap33', kind: 'recap', title: 'Hobart', bubble: 'The mountain behind the wharf.',
      items: [{ icon: '💜', text: 'Clear the wharf jelly' }, { icon: '🧁', text: 'Crack the mountain icing' }] }],
    34: [{ id: 'recap34', kind: 'recap', title: 'Vietnam', bubble: 'Saigon: lanterns along the river.',
      items: [{ icon: '💜', text: 'Clear the lantern-ring jelly' }, { icon: '🫧', text: 'Pop the sugar bubbles' }] }],
    35: [{ id: 'recap35', kind: 'recap', title: 'Malaysia', bubble: 'Kuala Lumpur: a night market.',
      items: [{ icon: '💜', text: 'Clear the jelly by the gates' }, { icon: '🧁', text: 'Crack the market icing' }] }],
    36: [{ id: 'recap36', kind: 'recap', title: 'Thailand', bubble: 'Bangkok: a temple beside the river.',
      items: [{ icon: '💜', text: 'Clear the jelly along the steps' }, { icon: '🫧', text: 'Pop the sugar bubbles' }, { icon: '🔒', text: 'Free the locked jars' }] }],
    37: [{ id: 'recap37', kind: 'recap', title: 'Myanmar', bubble: 'Yangon: flowers on the way to the pagoda.',
      items: [{ icon: '🌼', text: 'Bring both flowers down' }, { icon: '🧁', text: 'Crack the icing' }] }],
    38: [{ id: 'recap38', kind: 'recap', title: 'India', bubble: 'Delhi: sweets by the gate.',
      items: [{ icon: '💜', text: 'Clear the market jelly' }, { icon: '🧁', text: 'Crack the gate icing' }] }],
    39: [{ id: 'recap39', kind: 'recap', title: 'Kathmandu', bubble: 'A new kind of sweet shop: the conveyor moves after every turn.',
      items: [{ icon: '➡️', text: 'The highlighted lane carries sweets one space right, looping around' }, { icon: '💜', text: 'Clear all of the courtyard jelly' }] }],
    40: [{ id: 'recap40', kind: 'recap', title: 'Dhaka', bubble: 'Two river lanes carry sweets in opposite directions.',
      items: [{ icon: '➡️', text: 'The upper lane moves right; the lower lane moves left' }, { icon: '🫧', text: 'Bubbled sweets travel too; pop every bubble' }] }],
    41: [{ id: 'recap41', kind: 'recap', title: 'Colombo', bubble: 'The monsoon current changes course after every move.',
      items: [{ icon: '↔️', text: 'Both lanes carry candies and pineapple treats, then reverse direction' }, { icon: '🍍', text: 'Bring both treats down and crack the icing' }] }],
    42: [{ id: 'recap42', kind: 'recap', title: 'Singapore', bubble: 'The Garden Express combines moving lanes with two objectives.',
      items: [{ icon: '↔️', text: 'Two conveyor lanes reverse after every move' }, { icon: '💜', text: 'Clear the jelly and free all four jars' }] }],
    43: [{ id: 'recap43', kind: 'recap', title: 'Cambodia', bubble: 'Phnom Penh: lanterns glow along the Mekong riverfront.',
      items: [{ icon: '💜', text: 'Clear the riverfront jelly' }, { icon: '🔒', text: 'Free all four locked jars' }] }],
    44: [{ id: 'recap44', kind: 'recap', title: 'Philippines', bubble: 'Manila Bay: pop the bubbles beneath the evening lights.',
      items: [{ icon: '🫧', text: 'Pop all eight sugar bubbles' }] }],
    45: [{ id: 'recap45', kind: 'recap', title: 'Laos', bubble: 'Vientiane: mango treats travel toward the golden stupa.',
      items: [{ icon: '🥭', text: 'Bring both mangoes down' }, { icon: '🧁', text: 'Crack the four icing blocks' }] }],
    46: [{ id: 'recap46', kind: 'recap', title: 'Bhutan', bubble: 'Thimphu: a mountain dzong and its garden paths.',
      items: [{ icon: '💜', text: 'Clear the garden-path jelly' }, { icon: '🔒', text: 'Free all four locked jars' }] }],
    47: [{ id: 'recap47', kind: 'recap', title: 'Pakistan', bubble: 'Islamabad: gardens, fountains and the Faisal Mosque.',
      items: [{ icon: '💜', text: 'Clear the garden jelly' }, { icon: '🧁', text: 'Crack the icy corners' }, { icon: '🔒', text: 'Free all four locked jars' }] }],
    48: [{ id: 'recap48', kind: 'recap', title: 'Afghanistan', bubble: 'Kabul: a mountain valley, market courtyards and blue minarets.',
      items: [{ icon: '💜', text: 'Clear the courtyard jelly' }, { icon: '🫧', text: 'Pop all four sugar bubbles' }] }],
    49: [{ id: 'recap49', kind: 'recap', title: 'Iran', bubble: 'Tehran: rose gardens beneath the Alborz mountains.',
      items: [{ icon: '🍎', text: 'Bring both garden treats down' }, { icon: '🧁', text: 'Crack the four icing blocks' }] }],
    50: [{ id: 'recap50', kind: 'recap', title: 'Uzbekistan', bubble: 'Tashkent: a courtyard bright with turquoise tilework.',
      items: [{ icon: '💜', text: 'Clear the double-layer tilework' }, { icon: '🔒', text: 'Free all four locked jars' }] }],
    51: [{ id: 'recap51', kind: 'recap', title: 'Kazakhstan', bubble: 'Astana: steppe skies, river lights and a bright city tower.',
      items: [{ icon: '💜', text: 'Clear the steppe-ring jelly' }, { icon: '🫧', text: 'Pop all four sugar bubbles' }, { icon: '🍫', text: 'Keep the chocolate in check' }] }],
    52: [{ id: 'recap52', kind: 'recap', title: 'China', bubble: 'Beijing: the Great Wall winds across the mountain ridges.',
      items: [{ icon: '💜', text: 'Clear the wall-shaped jelly' }, { icon: '🧁', text: 'Crack the four icy corners' }, { icon: '🔒', text: 'Free all four locked jars' }] }]
  };
  // 1.9.285 Reworked levels: the arrival card lists the level's real goals and hazards.
  function goalItems285(lv) {
    const out = [], has = function (g) { return !!(g && g.some(function (r) { return /[1-9]/.test(r); })); };
    if (lv.boss) out.push({ icon: lv.boss.icon || '👾', text: 'Beat the ' + (lv.boss.name || 'boss') });
    if (lv.recipe) out.push({ icon: '🧾', text: 'Fill the order' });
    if (lv.collect) out.push({ icon: '🍬', text: 'Collect the sweets' });
    if (has(lv.jelly)) out.push({ icon: '💜', text: lv.jelly.some(function (r) { return /[2-9]/.test(r); }) ? 'Clear the jelly (some is double)' : 'Clear the jelly' });
    if ((lv.ings && lv.ings.length) || (lv.cannons || []).some(function (c) { return c.drop === 'ing'; })) out.push({ icon: lv.ingIcon || '🎁', text: 'Bring the treats down' });
    if (has(lv.hidden)) out.push({ icon: lv.hiddenIcon || '🧚', text: 'Find the hidden sprites' });
    else if (has(lv.ice) && lv.iceGoal !== false) out.push({ icon: '🧁', text: lv.ice.some(function (r) { return /[3-9]/.test(r); }) ? 'Crack the thick frosting' : 'Crack the icing' });
    if (has(lv.bub)) out.push({ icon: '🫧', text: 'Pop the sugar bubbles' });
    if (has(lv.locks)) out.push({ icon: '🔒', text: 'Free the locked jars' });
    if (has(lv.liq)) out.push({ icon: '➿', text: 'Free the liquorice' });
    if (has(lv.choco) && lv.chocoGoal) out.push({ icon: '🍫', text: 'Clear the chocolate' });
    if (has(lv.flow)) out.push({ icon: '🌈', text: 'Clear the syrup channel' });
    if ((lv.fuses && lv.fuses.length) || (lv.cannons || []).some(function (c) { return c.drop === 'fuse'; })) out.push({ icon: '💣', text: 'Don’t let a countdown bomb reach zero' });
    if (lv.cannons && lv.cannons.length) out.push({ icon: '🌋', text: 'Watch the candy cannons' });
    if (lv.portals && lv.portals.length) out.push({ icon: '🌀', text: 'Sweets travel through portals' });
    if (lv.belts && lv.belts.length) out.push({ icon: '🛞', text: 'Conveyor belts move each turn' });
    if (has(lv.choco) && !lv.chocoGoal) out.push({ icon: '🍫', text: 'Stop the chocolate spreading' });
    if (lv.timer) out.push({ icon: '⏱️', text: 'Beat the clock: ' + lv.timer + ' seconds' });
    return out.slice(0, 5);
  }
  Object.keys(LEVEL_REWORK_285).concat(Object.keys(TUNE_285)).forEach(function (k) {
    (TUTORIALS[k] || []).forEach(function (step) { if (step.kind === 'recap') step.items = goalItems285(LEVELS[k - 1]); });
  });
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
  // 1.9.234 West Pacific inset (Solomons, Vanuatu, New Caledonia, Fiji): 156-180°E across x 60-340, 8-23°S down y 1580-1668.
  function westPacXY(lat, lon) { return { x: 60 + (lon - 156) * 280 / 24, y: 1580 + (-lat - 8) * 88 / 15 }; }
  function pacXY(lat, lon) { return { x: 70 + 16.86 * (((lon % 360) + 360) % 360 - 184.8), y: 1350 + 21.6 * (-lat - 13.83) }; }
  function ausXY(lat, lon) { return { x: 8.533 * lon - 937.8, y: 1808 + 10.97 * (-lat - 10.707) }; }
  // 1.9.283 One world projection. Everything is drawn on the ausXY scale, so New Zealand is its true size next to
  // Australia, and the Pacific islands sit in their real places. New Zealand art drawn on nzXY is re-projected exactly.
  function nzToWorld(x, y) {
    const a = (x - NZ_PROJ.ox) / NZ_PROJ.sx, b = (y - NZ_PROJ.oy) / NZ_PROJ.sy, c = Math.cos(NZ_PROJ.rot), s = Math.sin(NZ_PROJ.rot);
    const u = a * c + b * s, v = -a * s + b * c;
    return ausXY(-v - 40.5, u / NZ_PROJ.cos + 173.5);
  }
  function mapPairs(d, f) {
    return d.replace(/(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)/g, function (m, x, y) { const q = f(+x, +y); return q.x.toFixed(1) + ' ' + q.y.toFixed(1); });
  }
  function nzWorldPath(d) { return mapPairs(d, nzToWorld); }
  // The Whangārei close-up keeps its 30x picture, now as a small panel in the Tasman Sea west of Northland.
  const NZ_INSET_BOX = { x0: 4, y0: 334, wx: 484, wy: 2049, k: 46 / 256 };
  function insetWorld(x, y) { return { x: NZ_INSET_BOX.wx + (x - NZ_INSET_BOX.x0) * NZ_INSET_BOX.k, y: NZ_INSET_BOX.wy + (y - NZ_INSET_BOX.y0) * NZ_INSET_BOX.k }; }
  function worldXY(lat, lon) { return ausXY(lat, ((lon % 360) + 360) % 360); }
  const MAP_X0 = -600, MAP_W = 820, MAP_Y0 = 1040, MAP_H = 2250, MAP_VW = MAP_W - MAP_X0, MAP_VH = MAP_H - MAP_Y0;
  function mapXPct(x) { return ((x - MAP_X0) / MAP_VW * 100) + '%'; }
  function mapYPct(y) { return ((y - MAP_Y0) / MAP_VH * 100) + '%'; }
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
    { n: 20, x: 352, y: 2062, place: "Sydney", kind: 'city', label: 'left', lift: true, lat: -33.87, lon: 151.21, via: [{ x: 270, y: 1900 }, { x: 310, y: 2040 }] },
    { n: 21, x: 371, y: 1998, place: "Gold Coast", kind: 'city', label: 'left', lat: -28.0, lon: 153.43 },
    { n: 22, x: 51, y: 2041, place: "Perth", kind: 'city', label: 'right', lat: -31.95, lon: 115.86, via: [{ x: 310, y: 1965 }] },
    // 1.9.232 Along the Great Australian Bight to Adelaide, then on to Melbourne.
    { n: 23, x: 245, y: 2074, place: "Adelaide", kind: 'city', label: 'left', lat: -34.93, lon: 138.6, via: [{ x: 154, y: 2075 }] },
    { n: 24, x: 299, y: 2105, place: "Melbourne", kind: 'city', label: 'left', lat: -37.81, lon: 144.96 },
    // 1.9.233 Up the east coast to Brisbane. Its true spot is under the Gold Coast pin, so the pin is nudged ~38 px north (nudged).
    { n: 25, x: 362, y: 1954, place: "Brisbane", kind: 'city', label: 'left', lat: -27.47, lon: 153.03, nudged: true, via: [{ x: 318, y: 2030 }] },
    // 1.9.234 North across the Coral Sea to Port Moresby, Papua New Guinea (true position; kept east of Cairns).
    { n: 26, x: 318, y: 1794, place: "Port Moresby", kind: 'city', label: 'below', lat: -9.44, lon: 147.18, via: [{ x: 356, y: 1880 }] },
    // 1.9.243 On the same map as Australia and Papua New Guinea (ausXY), not in a separate panel.
    { n: 27, x: 427, y: 1794, place: "Solomon Islands", kind: 'island', label: 'below', lat: -9.43, lon: 159.95 },
    { n: 28, x: 499, y: 1885, place: "Vanuatu", kind: 'island', label: 'left', lat: -17.73, lon: 168.32 },
    { n: 29, x: 585, y: 1890, place: "Fiji", kind: 'island', label: 'right', lat: -18.14, lon: 178.44 },
    { n: 30, x: 483, y: 1935, place: "New Caledonia", kind: 'island', label: 'below', lat: -22.27, lon: 166.45, via: [{ x: 560, y: 1930 }] },
    { n: 31, x: 45, y: 1785, place: "Indonesia", kind: 'island', label: 'right', lat: -8.65, lon: 115.22, via: [{ x: 520, y: 1748 }, { x: 340, y: 1696 }, { x: 160, y: 1710 }, { x: 80, y: 1748 }] },
    // 1.9.243 Canberra is nudged clear of the Sydney and Melbourne pins. Hobart sits on Tasmania.
    { n: 32, x: 338, y: 2103, place: "Canberra", kind: 'city', label: 'below', lat: -35.28, lon: 149.13, nudged: true, via: [{ x: 140, y: 1980 }, { x: 260, y: 2088 }] },
    { n: 33, x: 319, y: 2161, place: "Hobart", kind: 'city', label: 'left', lat: -42.88, lon: 147.33, via: [{ x: 360, y: 2148 }] },
    // 1.9.243 West from Indonesia: real positions. The road up from Hobart stays over the sea.
    { n: 34, x: -27.9, y: 1571.8, place: "Vietnam", kind: 'city', label: 'right', lat: 10.8231, lon: 106.6297, via: [{ x: 400, y: 2088 }, { x: 430, y: 1920 }, { x: 360, y: 1760 }, { x: 160, y: 1688 }, { x: 40, y: 1630 }] },
    { n: 35, x: -70.1, y: 1656.1, place: "Malaysia", kind: 'city', label: 'left', lat: 3.139, lon: 101.6869 },
    { n: 36, x: -80.2, y: 1539.6, place: "Thailand", kind: 'city', label: 'right', lat: 13.7563, lon: 100.5018 },
    { n: 37, x: -117.2, y: 1505.8, place: "Myanmar", kind: 'city', label: 'left', lat: 16.8409, lon: 96.1735 },
    { n: 38, x: -279, y: 1376.6, place: "India", kind: 'city', label: 'right', lat: 28.6139, lon: 77.209, via: [{ x: -190, y: 1520 }, { x: -240, y: 1460 }] },
    // 1.9.245 Continue east from Delhi through the Himalayan foothills and the Bay of Bengal.
    { n: 39, x: -209.7, y: 1386.5, place: 'Nepal', kind: 'city', label: 'left', lat: 27.7172, lon: 85.3240, via: [{ x: -236, y: 1376 }] },
    { n: 40, x: -166.3, y: 1429.3, place: 'Bangladesh', kind: 'city', label: 'right', lat: 23.8103, lon: 90.4125, via: [{ x: -184, y: 1408 }] },
    { n: 41, x: -256.3, y: 1614.6, place: 'Sri Lanka', kind: 'island', label: 'left', lat: 6.9271, lon: 79.8612, via: [{ x: -205, y: 1508 }, { x: -246, y: 1570 }] },
    { n: 42, x: -51.9, y: 1675.7, place: 'Singapore', kind: 'city', label: 'right', lat: 1.3521, lon: 103.8198, via: [{ x: -200, y: 1658 }, { x: -104, y: 1670 }] },
    // 1.9.247 North from Singapore through mainland Southeast Asia, then west along the Himalaya.
    { n: 43, x: -42.4, y: 1563.8, place: 'Cambodia', kind: 'city', label: 'left', lat: 11.5564, lon: 104.9282, via: [{ x: -32, y: 1620 }] },
    { n: 44, x: 94.6, y: 1530.4, place: 'Philippines', kind: 'island', label: 'right', lat: 14.5995, lon: 120.9842 },
    { n: 45, x: -62.0, y: 1493.4, place: 'Laos', kind: 'city', label: 'left', lat: 17.9757, lon: 102.6331 },
    { n: 46, x: -172.9, y: 1389.2, place: 'Bhutan', kind: 'city', label: 'right', lat: 27.4728, lon: 89.6390, via: [{ x: -137, y: 1430 }] },
    { n: 47, x: -314.4, y: 1321.0, place: 'Pakistan', kind: 'city', label: 'left', lat: 33.6844, lon: 73.0551 },
    // 1.9.249 From Islamabad through the Silk Road, with each capital on the existing Asia projection.
    { n: 48, x: -347.3, y: 1277.5, place: 'Afghanistan', kind: 'city', label: 'right', nudged: true, lat: 34.5553, lon: 69.2075, via: [{ x: -347.3, y: 1311.5 }] },
    { n: 49, x: -499.3, y: 1299.0, place: 'Iran', kind: 'city', label: 'below', lat: 35.6892, lon: 51.3890 },
    { n: 50, x: -315.0, y: 1237.5, place: 'Uzbekistan', kind: 'city', label: 'left', nudged: true, lat: 41.2995, lon: 69.2401, via: [{ x: -347.0, y: 1237.5 }] },
    { n: 51, x: -328.1, y: 1129.2, place: 'Kazakhstan', kind: 'city', label: 'right', lat: 51.1694, lon: 71.4491 },
    { n: 52, x: 55.5, y: 1252.8, place: 'Beijing', kind: 'city', label: 'right', lat: 39.9042, lon: 116.4074 },
    // 1.9.250 The route stays in China; Chengdu's pin is nudged slightly west to keep it clear of Chongqing.
    { n: 53, x: -8.2, y: 1313.8, place: "Xi'an", kind: 'city', label: 'right', lat: 34.3416, lon: 108.9398 },
    { n: 54, x: -100, y: 1360, place: 'Chengdu', kind: 'city', label: 'left', nudged: true, lat: 30.5728, lon: 104.0668, via: [{ x: -49.8, y: 1355.2 }] },
    { n: 55, x: -28.6, y: 1366.2, place: 'Chongqing', kind: 'city', label: 'right', lat: 29.5630, lon: 106.5516 },
    { n: 56, x: 98.7, y: 1347.9, place: 'Shanghai', kind: 'city', label: 'right', lat: 31.2304, lon: 121.4737 },
    { n: 57, x: 28.7, y: 1436.8, place: 'Guangzhou', kind: 'city', label: 'left', lat: 23.1291, lon: 113.2644 },
    { n: 58, x: 151, y: 1286, place: 'Nanjing', kind: 'city', label: 'right', lat: 32.0603, lon: 118.7969 },
    { n: 59, x: 169, y: 1361, place: 'Hangzhou', kind: 'city', label: 'right', lat: 30.2741, lon: 120.1551 },
    { n: 60, x: 225, y: 1430, place: 'Fuzhou', kind: 'city', label: 'right', lat: 26.0745, lon: 119.2965 },
    { n: 61, x: 286, y: 1475, place: 'Xiamen', kind: 'city', label: 'right', lat: 24.4798, lon: 118.0894 },
    { n: 62, x: 248, y: 1398, place: 'Quanzhou', kind: 'city', label: 'right', lat: 24.8741, lon: 118.6757 },
    { n: 63, x: 110, y: 1513, place: 'Shenzhen', kind: 'city', label: 'right', lat: 22.5431, lon: 114.0579 },
    { n: 64, x: 118, y: 1544, place: 'Hong Kong', kind: 'city', label: 'right', lat: 22.3193, lon: 114.1694 },
    { n: 65, x: -70, y: 1580, place: 'Haikou', kind: 'city', label: 'left', lat: 20.044, lon: 110.1999 },
    // East Asian city stops use the same geographic projection as the China route.
    { n: 66, x: 99.5, y: 1415.9, place: 'Taipei', kind: 'city', label: 'left', lat: 25.0330, lon: 121.5654 },
    { n: 67, x: 151.7, y: 1403.0, place: 'Naha', kind: 'city', label: 'right', lat: 26.2124, lon: 127.6809 },
    { n: 68, x: 174.9, y: 1322.1, place: 'Fukuoka', kind: 'city', label: 'right', lat: 33.5902, lon: 130.4017 },
    { n: 69, x: 145.7, y: 1278.4, place: 'Seoul', kind: 'city', label: 'left', lat: 37.5665, lon: 126.9780 },
    { n: 70, x: 253.8, y: 1299.2, place: 'Tokyo', kind: 'city', label: 'right', lat: 35.6762, lon: 139.6503 },
    { n: 71, x: 209.7, y: 1610.0, place: 'Koror', kind: 'city', label: 'left', lat: 7.3426, lon: 134.4789 },
    { n: 72, x: 411.8, y: 1614.6, place: 'Palikir', kind: 'city', label: 'below', lat: 6.9248, lon: 158.1610 },
    { n: 73, x: 524.6, y: 1612.8, place: 'Majuro', kind: 'city', label: 'right', lat: 7.0897, lon: 171.3803 },
    { n: 74, x: 486.5, y: 1696.6, place: 'Yaren', kind: 'city', label: 'left', lat: -0.5477, lon: 166.9209 },
    { n: 75, x: 538.2, y: 1674.6, place: 'South Tarawa', kind: 'city', label: 'left', lat: 1.4518, lon: 172.9717 }
  ];
  // Country is a separate atlas layer from the level stop (city/island) label.
  const MAP_COUNTRIES = Array(16).fill('New Zealand').concat(
    ['Cook Islands', 'Tonga', 'Samoa'],
    Array(6).fill('Australia'),
    ['Papua New Guinea', 'Solomon Islands', 'Vanuatu', 'Fiji', 'New Caledonia', 'Indonesia', 'Australia', 'Australia',
      'Vietnam', 'Malaysia', 'Thailand', 'Myanmar', 'India', 'Nepal', 'Bangladesh', 'Sri Lanka', 'Singapore', 'Cambodia', 'Philippines', 'Laos', 'Bhutan', 'Pakistan',
      'Afghanistan', 'Iran', 'Uzbekistan', 'Kazakhstan', 'China'],
    Array(13).fill('China'),
    ['Taiwan', 'Japan', 'Japan', 'South Korea', 'Japan'],
    ['Palau', 'Federated States of Micronesia', 'Marshall Islands', 'Nauru', 'Kiribati']
  );
  function countryForLevel(n) { return MAP_COUNTRIES[(n | 0) - 1] || ''; }
  // 1.9.283 Every stop at its real place on the one world projection (the three Whangārei close-up stops stay
  // in their panel). Cities closer than a pin's width are eased apart inside their own country only.
  function placeWorldStops(stops) {
    stops.forEach(function (s, i) {
      // NZ road waypoints were drawn for the old blown-up NZ panel; on the true-scale map the road goes direct.
      if (s.via && MAP_COUNTRIES[i] === 'New Zealand') delete s.via;
      if (s.inset === 'whangarei') { const q = insetWorld(s.x, s.y); s.x = +q.x.toFixed(1); s.y = +q.y.toFixed(1); return; }
      if (s.lat == null || s.lon == null) return;
      const q = worldXY(s.lat, s.lon);
      s.x = +q.x.toFixed(1); s.y = +q.y.toFixed(1);
    });
    const groups = {};
    stops.forEach(function (s, i) { if (s.inset) return; const c = MAP_COUNTRIES[i] || s.place; (groups[c] = groups[c] || []).push(s); });
    Object.keys(groups).forEach(function (c) {
      const g = groups[c];
      if (g.length < 2) return;
      const xs = g.map(function (s) { return s.x; }), ys = g.map(function (s) { return s.y; });
      const extent = Math.max(Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys));
      const min = Math.max(6, extent * 0.045);
      for (let it = 0; it < 80; it++) {
        for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
          let dx = g[j].x - g[i].x, dy = g[j].y - g[i].y, d = Math.hypot(dx, dy);
          if (d >= min) continue;
          if (d < 0.01) { dx = 1; dy = 0.5; d = Math.hypot(dx, dy); }
          const push = (min - d) / 2 * 0.5;
          g[i].x -= dx / d * push; g[i].y -= dy / d * push; g[j].x += dx / d * push; g[j].y += dy / d * push;
        }
      }
      g.forEach(function (s) { s.x = +s.x.toFixed(1); s.y = +s.y.toFixed(1); });
    });
    return stops;
  }
  placeWorldStops(MAP_STOPS);
  const POSTCARD_COUNT = 4;
  // Keep the separate Postcard Hunt's original 65-level country roster stable as the campaign grows.
  const POSTCARD_COUNTRIES = [...new Set(MAP_COUNTRIES.slice(0, 65))];
  const POSTCARD_ICONS = {
    'New Zealand': '🥝', 'Cook Islands': '🌺', Tonga: '🥥', Samoa: '🌴', Australia: '🦘',
    'Papua New Guinea': '🐦', 'Solomon Islands': '🐚', Vanuatu: '🌋', Fiji: '🌊',
    'New Caledonia': '🐠', Indonesia: '🛕', Vietnam: '🛶', Malaysia: '🦋', Thailand: '🐘',
    Myanmar: '🏯', India: '🪷', Nepal: '🏔️', Bangladesh: '🛺', 'Sri Lanka': '🐘',
    Singapore: '🌆', Cambodia: '🛕', Philippines: '⛵', Laos: '🌿', Bhutan: '🏔️',
    Pakistan: '🏔️', Afghanistan: '🧿', Iran: '🌷', Uzbekistan: '🕌', Kazakhstan: '🐎', China: '🐉'
  };
  function normalizePostcardProgress(raw) {
    const source = raw && raw.countries && typeof raw.countries === 'object' ? raw.countries : {};
    const countries = {};
    POSTCARD_COUNTRIES.forEach(country => {
      const entry = source[country] || {}, pieces = Array.isArray(entry.pieces)
        ? [...new Set(entry.pieces.filter(n => Number.isInteger(n) && n >= 0 && n < POSTCARD_COUNT))].sort()
        : [];
      countries[country] = { pieces, complete: pieces.length === POSTCARD_COUNT };
    });
    return { v: 1, countries };
  }
  function addPostcardPiece(progress, country, piece) {
    const next = normalizePostcardProgress(progress), entry = next.countries[country];
    if (!entry || !Number.isInteger(piece) || piece < 0 || piece >= POSTCARD_COUNT) return next;
    if (!entry.pieces.includes(piece)) entry.pieces.push(piece);
    entry.pieces.sort(); entry.complete = entry.pieces.length === POSTCARD_COUNT;
    return next;
  }
  // Coming soon: other Australian cities. Shown as markers only (no trail), so they never look like the route.
  // Brisbane is a stop since 1.9.233. Canberra and Hobart are stops since 1.9.243.
  const FUTURE_STOPS = [
    { place: 'Darwin', x: 179, y: 1827, label: 'left', lat: -12.46, lon: 130.84 },
    { place: 'Cairns', x: 306, y: 1876, label: 'left', lat: -16.92, lon: 145.77 }
  ];
  FUTURE_STOPS.forEach(function (s) { if (s.lat != null) { const q = worldXY(s.lat, s.lon); s.x = +q.x.toFixed(1); s.y = +q.y.toFixed(1); } });
  const LV_COUNT = LEVELS.length;
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
  function flightPath(a, b) {
    if (!a || !b) return '';
    const bend = Math.min(190, Math.max(36, Math.hypot(b.x - a.x, b.y - a.y) * .16));
    return 'M ' + a.x + ' ' + a.y + ' Q ' + ((a.x + b.x) / 2) + ' ' + ((a.y + b.y) / 2 - bend) + ' ' + b.x + ' ' + b.y;
  }
  function journeyPath(stops, firstLevel) {
    if (!stops || stops.length < 2) return '';
    firstLevel = firstLevel || 1;
    const parts = [];
    let road = [stops[0]];
    for (let i = 1; i < stops.length; i++) {
      const fromN = firstLevel + i - 1, toN = fromN + 1;
      if (countryForLevel(fromN) !== countryForLevel(toN)) {
        const d = icingPath(road);
        if (d) parts.push(d);
        parts.push(flightPath(stops[i - 1], stops[i]));
        road = [stops[i]];
      } else road.push(stops[i]);
    }
    if (road.length > 1) parts.push(icingPath(road));
    return parts.filter(Boolean).join(' ');
  }
  // The icing only covers stops already cleared. The road still to come is a faint dotted line.
  function clearedCount(stars) {
    stars = stars || [];
    let n = 0;
    while (n < MAP_STOPS.length && (stars[n] || 0) > 0) n++;
    return n;
  }
  function beenPath(stars) {
    return journeyPath(MAP_STOPS.slice(0, clearedCount(stars)), 1);
  }
  function aheadPath(stars) {
    const n = clearedCount(stars);
    if (n >= MAP_STOPS.length) return '';
    return journeyPath(MAP_STOPS.slice(Math.max(0, n - 1)), Math.max(1, n));
  }
  // 1.9.222 Australia outline (from real coastline points; x = lon, y = lat, scaled into the map).
  const AUS_PATH = 'M 28 1932 L 32 1960 L 33 1976 L 38 2004 L 41 2020 L 47 2040 L 47 2058 L 41 2067 L 54 2075 L 67 2075 L 84 2063 L 114 2063 L 136 2045 L 162 2038 L 179 2036 L 196 2043 L 206 2052 L 218 2073 L 226 2062 L 236 2053 L 237 2071 L 243 2073 L 242 2082 L 252 2097 L 261 2108 L 273 2112 L 286 2117 L 296 2109 L 304 2114 L 311 2120 L 321 2108 L 341 2102 L 344 2082 L 353 2062 L 364 2044 L 370 2026 L 373 2005 L 370 1989 L 368 1970 L 355 1954 L 349 1938 L 335 1921 L 325 1910 L 310 1897 L 307 1877 L 303 1860 L 302 1850 L 291 1846 L 285 1828 L 278 1808 L 273 1822 L 270 1840 L 269 1860 L 263 1882 L 252 1881 L 239 1873 L 226 1864 L 218 1855 L 221 1840 L 229 1824 L 220 1822 L 205 1821 L 193 1815 L 181 1823 L 172 1833 L 167 1854 L 155 1858 L 144 1846 L 132 1850 L 120 1868 L 115 1880 L 103 1887 L 95 1903 L 76 1910 L 58 1917 L 46 1921 L 34 1931 Z';
  const TAS_PATH = 'M 296 2138 L 312 2142 L 328 2140 L 328 2154 L 323 2165 L 315 2170 L 307 2167 L 301 2154 L 297 2143 Z';
  function planeAt(x, y, deg) {
    return '<g class="sr-plane" transform="translate(' + x + ' ' + y + ') rotate(' + deg + ')"><path d="M0 -14 L3 -4 L14 2 L14 5 L3 2 L2 10 L6 13 L6 15 L0 13 L-6 15 L-6 13 L-2 10 L-3 2 L-14 5 L-14 2 L-3 -4 Z" fill="#fff" stroke="#3d8bfd" stroke-width="1.5"/></g>';
  }
  // 1.9.234 Papua New Guinea coast points (lat, lon) and the West Pacific islands (lat, lon, rx, ry, rotate).
  const PNG_PTS = [[-2.6, 141.0], [-3.1, 142.2], [-3.4, 143.5], [-3.9, 144.5], [-4.6, 145.6], [-5.4, 145.8], [-6.0, 147.0], [-6.1, 147.8], [-7.5, 147.7], [-8.3, 148.3], [-9.0, 149.3], [-9.6, 149.9], [-10.3, 150.6], [-10.6, 150.3], [-10.2, 149.7], [-9.9, 148.6], [-9.5, 147.4], [-8.9, 146.6], [-8.0, 145.8], [-7.6, 144.6], [-8.0, 143.6], [-8.6, 143.2], [-9.1, 142.6], [-9.1, 141.0]];
  const NEW_BRITAIN_PTS = [[-5.6, 148.4], [-5.1, 150.0], [-4.3, 151.6], [-4.2, 152.3], [-4.8, 152.0], [-5.6, 150.9], [-6.2, 149.5], [-6.0, 148.5]];
  // 1.9.243 Islands on the Australia projection: Solomons, Vanuatu, New Caledonia, Fiji, then Bali and the islands just east of it.
  const EAST_ISLES = [[-8.1, 157.2, 16, 5, 28], [-9.4, 160.0, 18, 6, 32], [-10.6, 161.5, 12, 5, 30], [-15.4, 167.2, 5, 11, -8], [-17.7, 168.3, 6, 10, 0], [-21.3, 165.5, 26, 7, 38], [-17.8, 178.0, 14, 8, -8], [-16.5, 179.4, 13, 6, -18], [-8.3, 114.4, 9, 5, 18], [-8.65, 115.22, 7, 4, 12], [-8.8, 116.5, 8, 4, 10], [-8.9, 118.0, 12, 5, 6],
    [7.34, 134.48, 8, 5, 12], [7.5, 134.6, 11, 4, -8], [8.15, 138.2, 6, 4, -10], [7.45, 151.85, 8, 4, 10], [6.97, 158.21, 7, 5, 18], [5.33, 163.0, 5, 4, 5], [7.09, 171.38, 8, 4, -18], [8.72, 167.73, 5, 3, 12], [-0.55, 166.92, 5, 4, 0], [1.45, 172.97, 6, 4, 10], [3.1, 172.8, 4, 3, -10], [0.9, 173.0, 4, 3, 0], [-1.2, 175.0, 4, 3, 5]];
  // 1.9.243 Simplified coasts, west of Indonesia, on the Australia scale.
  const ASIA_LAND = [
    [[8.6, 104.7], [10.4, 106.7], [12.3, 109.2], [16.2, 108.3], [21.0, 105.9], [22.2, 103.9], [18.2, 105.4], [14.2, 108.6], [11.2, 107.1], [8.8, 104.9]],
    [[1.2, 103.6], [1.5, 104.2], [3.2, 103.4], [5.4, 103.0], [6.4, 101.8], [6.2, 100.2], [4.2, 100.6], [2.4, 101.3], [1.3, 102.9]],
    [[7.2, 100.3], [10.2, 99.2], [13.2, 100.1], [16.4, 102.4], [19.2, 100.2], [16.8, 98.2], [13.0, 99.6], [9.4, 98.6], [7.6, 98.8]],
    [[10.2, 98.3], [14.2, 98.0], [16.8, 96.2], [19.4, 93.6], [23.6, 94.2], [25.2, 97.4], [21.4, 99.2], [16.2, 98.4], [12.2, 98.5]],
    [[8.1, 77.5], [15.2, 73.9], [19.2, 72.8], [23.0, 68.8], [23.4, 72.8], [28.8, 76.2], [30.2, 78.2], [27.2, 80.4], [22.4, 86.2], [16.2, 82.2], [8.9, 78.0]],
    // Simplified country coastlines for the new stops (lat, lon): Pakistan, Bhutan, Laos, Cambodia and the Philippines.
    [[23.5, 68.1], [24.7, 66.8], [26.8, 67.1], [28.7, 68.2], [30.7, 68.5], [32.5, 69.5], [34.4, 71.1], [36.2, 72.9], [37.0, 74.1], [35.8, 75.2], [33.7, 74.5], [31.7, 72.6], [29.4, 71.5], [27.1, 70.5], [25.0, 69.4]],
    [[26.7, 88.7], [27.3, 88.8], [28.2, 89.8], [28.1, 91.1], [27.4, 92.0], [26.8, 91.9], [26.5, 90.4]],
    [[14.1, 100.8], [16.0, 100.6], [18.0, 100.1], [20.3, 100.0], [22.4, 101.0], [22.5, 102.9], [21.3, 104.0], [19.8, 104.7], [18.2, 105.2], [16.4, 105.8], [14.8, 105.6], [14.0, 104.5]],
    [[10.4, 103.0], [11.8, 102.4], [13.5, 102.7], [14.7, 104.2], [14.5, 106.0], [13.4, 107.2], [11.8, 107.4], [10.5, 106.0]],
    [[18.5, 120.0], [20.4, 121.0], [20.8, 122.0], [19.2, 123.2], [17.2, 122.5], [16.0, 123.4], [14.5, 122.2], [13.0, 121.8], [13.7, 120.4], [15.3, 119.7], [16.9, 120.8]],
    [[13.5, 120.5], [13.8, 121.3], [13.2, 121.8], [12.3, 121.2], [12.6, 120.5]],
    [[11.8, 119.8], [11.0, 120.4], [10.0, 120.0], [9.3, 118.8], [10.0, 117.0], [9.5, 116.0], [10.1, 114.9], [11.5, 115.4], [12.1, 117.2]],
    [[11.0, 124.0], [9.3, 125.0], [7.0, 125.5], [5.5, 125.2], [5.5, 124.0], [6.5, 123.0], [8.3, 123.6], [9.6, 123.7]],
    // Central Asia and the Silk Road countries, simplified in lat/lon for the same map projection.
    [[29.4, 60.5], [31.7, 60.3], [33.8, 62.2], [35.5, 65.1], [37.4, 66.6], [38.5, 70.0], [37.4, 74.9], [35.1, 74.5], [33.1, 72.0], [31.0, 69.0], [29.5, 65.0]],
    [[25.0, 60.0], [26.7, 56.1], [28.9, 50.9], [30.5, 48.2], [33.3, 47.6], [36.4, 44.1], [38.5, 46.0], [39.8, 48.3], [39.1, 54.8], [37.9, 58.2], [35.8, 61.0], [31.8, 61.8], [29.0, 61.3]],
    [[37.0, 56.0], [40.0, 55.9], [43.0, 58.2], [45.6, 58.4], [45.5, 64.0], [43.8, 68.0], [42.0, 71.2], [39.5, 70.0], [37.5, 66.0]],
    [[40.5, 46.5], [44.0, 47.0], [49.0, 50.0], [53.8, 54.0], [55.2, 61.0], [54.0, 70.0], [50.5, 79.0], [47.0, 86.0], [44.0, 81.0], [42.0, 74.0], [40.0, 67.0], [40.5, 59.0]],
    [[22.0, 101.0], [21.0, 108.0], [19.0, 110.0], [21.0, 115.0], [24.0, 119.0], [29.0, 121.0], [34.0, 120.0], [37.0, 122.0], [40.0, 121.0], [42.0, 124.0], [47.0, 131.0], [50.0, 127.0], [53.0, 122.0], [49.0, 118.0], [49.0, 110.0], [47.0, 106.0], [45.0, 99.0], [44.0, 95.0], [41.0, 91.0], [39.0, 87.0], [40.0, 80.0], [37.0, 75.0], [34.0, 78.0], [30.0, 80.0], [27.0, 85.0], [24.0, 89.0]]
  ];
  // Simplified East Asian island and peninsula outlines, in lat/lon on the same projection.
  const ASIA_EAST_LAND = [
    // Taiwan
    [[25.3, 121.5], [25.3, 122.0], [24.8, 121.9], [24.2, 121.8], [23.6, 121.5], [23.1, 121.4], [22.6, 121.0], [22.0, 120.8], [21.9, 120.4], [22.3, 120.2], [22.9, 120.1], [23.5, 120.0], [24.1, 120.2], [24.7, 120.4], [25.1, 120.8]],
    // Korean Peninsula
    [[38.6, 128.4], [38.2, 127.7], [38.0, 126.7], [37.4, 126.4], [36.7, 126.5], [36.2, 126.6], [35.8, 126.5], [35.3, 126.4], [34.7, 126.6], [34.3, 127.0], [34.5, 127.7], [34.7, 128.2], [35.1, 128.6], [35.7, 129.1], [36.4, 129.5], [37.1, 129.5], [37.8, 129.2], [38.4, 129.0]],
    // Kyushu, Shikoku, Honshu and Hokkaido
    [[33.9, 130.9], [33.5, 130.6], [32.8, 130.5], [31.8, 130.0], [31.4, 130.1], [31.2, 130.9], [31.6, 131.3], [32.3, 131.3], [32.8, 131.8], [33.3, 131.7], [33.8, 131.2]],
    [[34.4, 132.2], [34.4, 133.5], [33.9, 134.5], [33.5, 134.7], [33.1, 134.3], [33.0, 133.3], [33.3, 132.5]],
    [[34.6, 130.8], [34.8, 131.5], [34.3, 132.0], [34.1, 133.0], [34.4, 134.2], [34.6, 135.3], [34.8, 136.2], [35.1, 137.0], [35.3, 138.0], [35.5, 139.3], [36.0, 140.2], [37.0, 140.9], [38.0, 140.9], [39.0, 140.0], [40.0, 140.1], [40.7, 140.6], [41.5, 140.8], [41.5, 139.9], [40.8, 139.0], [40.6, 138.2], [39.8, 137.6], [39.0, 138.3], [38.0, 138.9], [37.0, 138.8], [36.0, 137.4], [35.0, 136.8], [34.8, 135.3], [34.5, 134.5], [34.1, 133.5], [33.7, 132.5], [33.9, 131.3]],
    [[41.4, 140.3], [41.7, 139.4], [42.4, 139.3], [43.0, 140.0], [43.8, 140.6], [44.4, 141.2], [45.0, 141.7], [45.5, 142.7], [45.4, 143.5], [44.8, 144.1], [43.9, 145.0], [43.2, 145.4], [42.6, 144.3], [42.0, 143.0], [41.5, 142.2], [41.3, 141.2]],
    // Okinawa's main island, where the level-67 stop sits.
    [[26.8, 127.7], [26.6, 128.0], [26.3, 128.1], [26.0, 127.9], [26.1, 127.6], [26.4, 127.5], [26.7, 127.5]]
  ];
  function ausPath(pts) { return pts.map(function (q, i) { const a = ausXY(q[0], q[1]); return (i ? 'L' : 'M') + a.x.toFixed(1) + ' ' + a.y.toFixed(1); }).join(' ') + ' Z'; }
  // 1.9.251: add airy drift and tiny travel-day accents, kept in open sea away from route pins.
  const MAP_CLOUDS = [[330, 140, 1, 26], [40, 640, 0.8, 34], [350, 860, 0.9, 30], [60, 1120, 1.1, 38], [330, 1200, 0.8, 28], [64, 1722, 0.7, 32], [40, 1880, 0.9, 36], [370, 2200, 0.8, 30], [540, 320, 0.68, 35], [510, 500, 0.75, 39], [535, 980, 0.72, 36], [510, 1360, 0.7, 40], [540, 1550, 0.76, 33], [520, 1740, 0.8, 38], [535, 1985, 0.75, 41], [500, 2160, 0.72, 34], [-540, 820, 0.6, 38], [-535, 1810, 0.7, 35]];
  const MAP_WINDS = [[500, 725, 0.85, -7, 38], [530, 1390, 0.7, 12, 42], [-520, 1695, 0.75, -13, 36], [500, 2040, 0.78, 9, 46]];
  function mapClouds() {
    return '<g class="sr-clouds" pointer-events="none">' + MAP_CLOUDS.map(function (c, i) {
      const x = c[0], y = c[1], k = c[2];
      return '<g class="sr-cloud" style="--d:' + c[3] + 's;--dl:' + (-i * 4) + 's"><g transform="translate(' + x + ' ' + y + ') scale(' + k + ')" opacity=".62">' +
        '<ellipse cx="0" cy="0" rx="34" ry="11" fill="#fff"/><ellipse cx="-13" cy="-7" rx="15" ry="11" fill="#fff"/><ellipse cx="11" cy="-10" rx="18" ry="13" fill="#fff"/></g></g>';
    }).join('') + '</g>';
  }
  function mapWindSwirls() {
    return '<g class="sr-winds">' + MAP_WINDS.map(function (w, i) {
      return '<g class="sr-wind" style="--d:' + w[4] + 's;--dl:' + (-i * 7) + 's"><g transform="translate(' + w[0] + ' ' + w[1] + ') rotate(' + w[3] + ') scale(' + w[2] + ')">' +
        '<path class="sr-wind-line" d="M-43 -6 C-30 -17 -12 -18 0 -9 C12 0 7 10 -3 7 C-11 4 -8 -4 0 -4"/>' +
        '<path class="sr-wind-line sr-wind-second" d="M-38 10 C-23 19 -6 17 10 8 C23 1 35 3 43 11"/>' +
        '<path class="sr-wind-line sr-wind-short" d="M-24 -23 C-10 -28 7 -26 20 -21"/></g></g>';
    }).join('') + '</g>';
  }
  function mapAtmosphere() {
    const star = 'M0 -8 L2.2 -2.2 L8 0 L2.2 2.2 L0 8 L-2.2 2.2 L-8 0 L-2.2 -2.2 Z';
    return '<g class="sr-map-atmosphere" aria-hidden="true" pointer-events="none">' + mapWindSwirls() +
      '<g class="sr-map-spark" style="--dl:-1s"><g transform="translate(505 1185) scale(.75)"><path d="' + star + '"/><circle cx="12" cy="-7" r="1.7"/></g></g>' +
      '<g class="sr-map-spark" style="--dl:-2.8s"><g transform="translate(-520 730) scale(.9)"><path d="' + star + '"/><circle cx="-13" cy="8" r="1.5"/></g></g>' +
      '<g class="sr-map-spark" style="--dl:-4.2s"><g transform="translate(470 1870)"><path d="' + star + '"/><circle cx="12" cy="10" r="1.6"/></g></g>' +
      '<g class="sr-map-balloon" style="--dl:-2s"><g transform="translate(-500 520)">' +
      '<path d="M0 -22 C-15 -22 -20 -8 -15 6 C-11 14 -6 19 -5 22 L5 22 C6 18 11 13 15 6 C20 -8 15 -22 0 -22 Z" fill="#ff8ab8" stroke="#fff" stroke-width="2.2"/>' +
      '<path d="M-8 -16 C-4 -8 -3 1 -4 12 M0 -20 C4 -8 5 2 4 16" fill="none" stroke="#fff5c8" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M-6 22 L-4 27 M6 22 L4 27" fill="none" stroke="#9a5b72" stroke-width="1.6"/><rect x="-5" y="27" width="10" height="7" rx="2" fill="#d99a5e" stroke="#fff" stroke-width="1.5"/>' +
      '</g></g></g>';
  }
  // 1.9.252 Gentle tide rings in open water; drawn beneath coastlines, routes, and stop labels.
  const MAP_RIPPLES = [[420, 465, 0.9], [410, 760, 1], [32, 850, 0.8], [430, 1090, 1.05], [420, 1550, 0.8], [600, 2030, 0.9]];
  function mapRipples() {
    const rx = [10, 18, 27], ry = [3.4, 6, 8.6];
    return '<g class="sr-ripples" aria-hidden="true" pointer-events="none">' + MAP_RIPPLES.map(function (r, i) {
      return '<g transform="translate(' + r[0] + ' ' + r[1] + ') scale(' + r[2] + ')">' +
        rx.map(function (x, j) {
          const delay = (-j * 1.65 - i * 0.38).toFixed(2), duration = (5.2 + (i % 3) * 0.55).toFixed(2);
          return '<ellipse class="sr-ripple-ring" cx="0" cy="0" rx="' + x + '" ry="' + ry[j] + '" style="--d:' + duration + 's;--dl:' + delay + 's"/>';
      }).join('') + '</g>';
    }).join('') + '</g>';
  }
  function atlasPill(x, y, w, kicker, title, note) {
    const cx = w / 2;
    return '<g transform="translate(' + x + ' ' + y + ')" pointer-events="none">' +
      '<rect class="sr-atlas-box" x="0" y="0" width="' + w + '" height="48" rx="11"/>' +
      '<text class="sr-atlas-kicker" x="' + cx + '" y="12">' + kicker + '</text>' +
      '<text class="sr-atlas-title" x="' + cx + '" y="29">' + title + '</text>' +
      '<text class="sr-atlas-note" x="' + cx + '" y="41">' + note + '</text></g>';
  }
  function mapAtlasType() {
    return '<g class="sr-atlas" aria-hidden="true">' +
      atlasPill(386, 790, 176, '01 / AOTEAROA', 'NEW ZEALAND', 'LEVELS 01–16') +
      atlasPill(104, 1212, 192, '02 / OCEANIA', 'Pacific Islands', 'COOK ISLANDS · TONGA · SAMOA') +
      atlasPill(405, 1708, 198, '03 / WEST PACIFIC', 'MELANESIA', 'PAPUA NEW GUINEA · SOLOMONS · FIJI') +
      atlasPill(104, 1745, 192, '04 / AUSTRALASIA', 'AUSTRALIA', 'LEVELS 20–25 · 32–33') +
      atlasPill(-350, 1695, 195, '05 / ISLAND SOUTHEAST ASIA', 'SOUTHEAST ASIA', 'INDONESIA · MALAYSIA · SINGAPORE') +
      atlasPill(-560, 1350, 195, '06 / HIMALAYAS', 'SOUTH ASIA', 'INDIA · NEPAL · BHUTAN · PAKISTAN') +
      atlasPill(-565, 1137, 190, '07 / THE SILK ROAD', 'CENTRAL ASIA', 'AFGHANISTAN · IRAN · UZBEKISTAN') +
      atlasPill(370, 1438, 220, '08 / EAST ASIA', 'EAST ASIA', 'TAIWAN · SOUTH KOREA · JAPAN') +
      atlasPill(344, 1492, 246, '09 / MICRONESIA', 'WESTERN PACIFIC', 'LEVELS 71–75 · FIVE NEW COUNTRIES') +
      '</g>';
  }
  function mapTerrain() {
    const hills = [[311, 158, .72], [106, 1000, .62], [177, 1948, 1.05], [224, 1916, .74], [-270, 1238, .72], [-132, 1520, .58], [288, 1240, .62]];
    const groves = [[326, 210, .55], [318, 251, .48], [93, 980, .55], [194, 1927, .68], [148, 1980, .62], [252, 1867, .5], [-148, 1548, .52], [281, 1460, .48]];
    // 1.9.283 entries above y 1150 were drawn on the old New Zealand scale; move them onto the world map.
    const toWorld = function (p) { if (p[1] >= 1150) return p; const q = nzToWorld(p[0], p[1]); return [+q.x.toFixed(1), +q.y.toFixed(1), +(p[2] * 0.18).toFixed(3)]; };
    hills.forEach(function (p, i) { hills[i] = toWorld(p); });
    groves.forEach(function (p, i) { groves[i] = toWorld(p); });
    const hillSvg = hills.map(function (p, i) {
      const fill = ['#9ed9a7', '#b7e5a7', '#a9dfb2'][i % 3];
      return '<g transform="translate(' + p[0] + ' ' + p[1] + ') scale(' + p[2] + ')" opacity=".72"><path d="M-34 12 C-28 -1 -19 -9 -9 -6 C-1 -22 12 -20 19 -6 C29 -12 38 -3 40 12 Z" fill="' + fill + '" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><path d="M-20 5 Q-8 -2 3 5 T27 5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".8"/></g>';
    }).join('');
    const groveSvg = groves.map(function (p, i) {
      return '<g transform="translate(' + p[0] + ' ' + p[1] + ') scale(' + p[2] + ')" opacity=".84"><ellipse cx="0" cy="8" rx="19" ry="4" fill="#5e9977" opacity=".2"/><circle cx="-9" cy="1" r="8" fill="#72c89a" stroke="#fff" stroke-width="1.8"/><circle cx="1" cy="-4" r="10" fill="' + (i % 2 ? '#80d3a2' : '#63bd8d') + '" stroke="#fff" stroke-width="1.8"/><circle cx="12" cy="2" r="7" fill="#9bdfaa" stroke="#fff" stroke-width="1.8"/><circle cx="-2" cy="-7" r="2.2" fill="#d9f7ce" opacity=".9"/></g>';
    }).join('');
    return '<g class="sr-terrain" aria-hidden="true" pointer-events="none">' + hillSvg + groveSvg + '</g>';
  }
  function mapLandmarks() {
    const image = function (id, file, x, y, w, h, kind, opacity) {
      if (y < 1150) { const c = nzToWorld(x + w / 2, y + h / 2); w = +(w * 0.18).toFixed(1); h = +(h * 0.18).toFixed(1); x = +(c.x - w / 2).toFixed(1); y = +(c.y - h / 2).toFixed(1); }
      else if (kind === 'volcano') { const cx = x + w / 2, cy = y + h / 2; w = +(w * 0.36).toFixed(1); h = +(h * 0.36).toFixed(1); x = +(cx - w / 2).toFixed(1); y = +(cy - h / 2).toFixed(1); } // true-scale volcanoes
      return '<g id="' + id + '" class="sr-landmark sr-' + kind + '" pointer-events="none" opacity="' + (opacity == null ? 1 : opacity) + '"><image href="img/sugar-rush/landmarks/' + file + '.webp" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" preserveAspectRatio="xMidYMid meet"/></g>';
    };
    const plaque = function (id, x, y, text) {
      const w = Math.max(42, text.length * 5.2 + 12);
      let k = 1;
      if (y < 1150) { const c = nzToWorld(x, y); x = +c.x.toFixed(1); y = +c.y.toFixed(1); k = 0.22; }
      return '<g id="' + id + '" class="sr-landmark-label" transform="translate(' + x + ' ' + y + ') scale(' + k + ')" pointer-events="none"><rect x="' + (-w / 2) + '" y="-8" width="' + w + '" height="16" rx="8" fill="#fff8e9" fill-opacity=".94" stroke="#fff" stroke-width="1.8" filter="url(#sr-soft)"/><text x="0" y="3" text-anchor="middle" font-size="8" font-weight="900" letter-spacing=".65" fill="#326f7e" font-family="ui-rounded,system-ui,sans-serif">' + text + '</text></g>';
    };
    return '<g class="sr-landmarks" aria-hidden="true" pointer-events="none">' +
      image('landmark-lake-taupo', 'lake', 257, 310, 80, 40, 'lake') +
      image('landmark-lake-pukaki', 'lake', 204, 805, 59, 30, 'lake') +
      image('landmark-lake-wakatipu', 'lake', 97, 889, 62, 31, 'lake') +
      image('landmark-himalaya', 'mountains', -297, 1215, 166, 91, 'mountains', .78) +
      image('landmark-great-dividing-range', 'mountains', 219, 1894, 142, 78, 'mountains', .82) +
      image('landmark-southern-alps', 'mountains', 122, 820, 104, 57, 'mountains') +
      image('landmark-mt-fuji', 'volcano', 205, 1244, 57, 46, 'volcano', .86) +
      image('landmark-tongariro-volcano', 'volcano', 222, 348, 68, 55, 'volcano') +
      image('landmark-java-volcano', 'volcano', -18, 1738, 58, 47, 'volcano', .86) +
      image('landmark-yasur-volcano', 'volcano', 512, 1817, 58, 47, 'volcano', .86) +
      plaque('landmark-label-taupo', 298, 350, 'LAKE TAUPŌ') +
      plaque('landmark-label-tongariro', 256, 414, 'TONGARIRO') +
      '</g>';
  }
  function nzLand(sw, d) {
    return '<path fill="url(#sr-land)" stroke="#fff" stroke-width="' + sw + '" stroke-linejoin="round" d="' + nzWorldPath(d) + '"/>';
  }
  // 1.9.283 Whangārei close-up panel on the world map, with a leader line to where Whangārei really is.
  function insetSvg() {
    const w = worldXY(WHANGAREI_INSET.lat, WHANGAREI_INSET.lon), a = insetWorld(4, 334), b = insetWorld(260, 522), t = insetWorld(18, 512);
    return '<g class="sr-inset">' +
      '<path d="M ' + w.x.toFixed(1) + ' ' + w.y.toFixed(1) + ' L ' + b.x.toFixed(1) + ' ' + ((a.y + b.y) / 2).toFixed(1) + '" stroke="#fff" stroke-width=".5" stroke-dasharray="1 1" stroke-linecap="round"/>' +
      '<circle cx="' + w.x.toFixed(1) + '" cy="' + w.y.toFixed(1) + '" r="1.2" fill="none" stroke="#ff4f93" stroke-width=".5"/>' +
      '<rect x="' + a.x.toFixed(1) + '" y="' + a.y.toFixed(1) + '" width="' + (b.x - a.x).toFixed(1) + '" height="' + (b.y - a.y).toFixed(1) + '" rx="4" fill="#d8f4ff" stroke="#fff" stroke-width=".8"/>' +
      '<path d="' + mapPairs('M 24 336 L 240 336 L 258 406 C 128 418 88 442 130 472 C 64 488 24 462 6 472 Z', insetWorld) + '" fill="url(#sr-land)" opacity=".9"/>' +
      '<text x="' + t.x.toFixed(1) + '" y="' + t.y.toFixed(1) + '" text-anchor="start" font-size="2.1" font-weight="900" fill="#2a6a88" font-family="ui-rounded,system-ui,sans-serif">Whangārei close-up</text>' +
      '</g>';
  }
  // 1.9.283 Samoa, Tonga and Rarotonga in their real places (no inset panel). Small islands get a minimum visible
  // size of about 2 map units (roughly 20 km) and are never drawn bigger than that.
  const PACIFIC_ISLES = [
    ['Savaiʻi', -13.62, -172.45, 3.6, 2.3, -10], ['Upolu', -13.92, -171.75, 3.4, 1.5, -12],
    ['Tongatapu', -21.17, -175.2, 3, 1.9, 0], ['Haʻapai', -19.8, -174.35, 1.2, 1.2, 0], ['Vavaʻu', -18.65, -174.0, 1.5, 1.3, 0],
    ['Rarotonga', -21.23, -159.78, 2.6, 2.6, 0]
  ];
  function pacificSvg() {
    return '<g class="sr-pacific">' + PACIFIC_ISLES.map(function (q) {
      const a = worldXY(q[1], q[2]), x = a.x.toFixed(1), y = a.y.toFixed(1);
      const reef = q[0] === 'Rarotonga' ? '<circle cx="' + x + '" cy="' + y + '" r="3.8" fill="#bff5ec" opacity=".8"/><circle cx="' + x + '" cy="' + y + '" r="3.4" fill="none" stroke="#fff" stroke-width=".35" stroke-dasharray=".8 .8"/>' : '';
      return reef + '<ellipse data-island="' + q[0] + '" cx="' + x + '" cy="' + y + '" rx="' + q[3] + '" ry="' + q[4] + '" transform="rotate(' + q[5] + ' ' + x + ' ' + y + ')" fill="url(#sr-land)" stroke="#fff" stroke-width=".6"/>';
    }).join('') + '</g>';
  }
  function nzMapSvg() {
    const live = ''; // the icing is filled in from the stops this player has already cleared
    const future = ''; // 1.9.222 coming-soon cities are markers only
    const asiaCandy = ['sr-candy-strawberry', 'sr-candy-peach', 'sr-candy-lemon', 'sr-candy-mint', 'sr-candy-blueberry',
      'sr-candy-grape', 'sr-candy-lemon', 'sr-candy-mint', 'sr-candy-peach', 'sr-candy-blueberry', 'sr-candy-strawberry',
      'sr-candy-grape', 'sr-candy-lemon', 'sr-candy-grape', 'sr-candy-peach', 'sr-candy-lemon', 'sr-candy-mint', 'sr-candy-blueberry'];
    const islandCandy = ['sr-candy-mint', 'sr-candy-blueberry', 'sr-candy-grape', 'sr-candy-strawberry', 'sr-candy-peach', 'sr-candy-lemon'];
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + MAP_X0 + ' ' + MAP_Y0 + ' ' + MAP_VW + ' ' + MAP_VH + '" width="' + MAP_VW + '" height="' + MAP_VH + '" aria-hidden="true" class="nzsvg sr-world">' +
      '<defs>' +
      '<linearGradient id="sr-sea" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#7ee8f5"/><stop offset=".45" stop-color="#8fe8f0"/><stop offset="1" stop-color="#b6f3e6"/>' +
      '</linearGradient>' +
      '<linearGradient id="sr-land" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#d8efc4"/><stop offset=".34" stop-color="#c2e8b9"/><stop offset=".7" stop-color="#a5dcae"/><stop offset="1" stop-color="#8ecdb1"/>' +
      '</linearGradient>' +
      '<linearGradient id="sr-candy-strawberry" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff6f2"/><stop offset=".55" stop-color="#f8d4c4"/><stop offset="1" stop-color="#f0c0ae"/></linearGradient>' +
      '<linearGradient id="sr-candy-peach" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff8f4"/><stop offset=".55" stop-color="#f7d8c8"/><stop offset="1" stop-color="#efc4b4"/></linearGradient>' +
      '<linearGradient id="sr-candy-lemon" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7fff9"/><stop offset=".55" stop-color="#cfead8"/><stop offset="1" stop-color="#b7dfc6"/></linearGradient>' +
      '<linearGradient id="sr-candy-mint" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4fff8"/><stop offset=".55" stop-color="#c8ead4"/><stop offset="1" stop-color="#b4e0c4"/></linearGradient>' +
      '<linearGradient id="sr-candy-blueberry" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#faf6ff"/><stop offset=".55" stop-color="#e4d4f0"/><stop offset="1" stop-color="#d4c0e6"/></linearGradient>' +
      '<linearGradient id="sr-candy-grape" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fbf7ff"/><stop offset=".55" stop-color="#e6d6f2"/><stop offset="1" stop-color="#d8c4e8"/></linearGradient>' +
      '<linearGradient id="sr-icing" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#ff8ab8"/><stop offset=".55" stop-color="#ffb347"/><stop offset="1" stop-color="#ff6fa8"/>' +
      '</linearGradient>' +
      '<filter id="sr-soft" x="-6%" y="-6%" width="112%" height="112%">' +
      '<feDropShadow dx="0" dy="3" stdDeviation="3.2" flood-color="#5aa0c0" flood-opacity=".32"/>' +
      '</filter>' +
      '</defs>' +
      '<rect x="' + MAP_X0 + '" y="' + MAP_Y0 + '" width="' + MAP_VW + '" height="' + MAP_VH + '" fill="url(#sr-sea)"/>' +
      mapRipples() +
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
      nzLand(1.4, 'M 223 572 L 228 570 L 241 536 L 248 527 L 250 525 L 248 534 L 251 538 L 251 555 L 254 550 L 253 539 L 255 535 L 252 530 L 261 524 L 262 527 L 266 525 L 265 537 L 260 547 L 265 545 L 271 529 L 273 535 L 270 547 L 266 554 L 266 559 L 274 566 L 273 576 L 276 573 L 283 576 L 283 586 L 277 613 L 279 625 L 273 649 L 271 690 L 261 708 L 257 722 L 254 726 L 260 729 L 255 742 L 261 736 L 264 736 L 270 746 L 283 743 L 288 750 L 288 757 L 282 762 L 277 763 L 273 761 L 263 769 L 265 762 L 259 761 L 257 774 L 255 776 L 240 771 L 251 781 L 235 809 L 227 816 L 226 826 L 222 830 L 226 831 L 234 878 L 228 882 L 236 883 L 236 888 L 234 905 L 236 944 L 242 949 L 244 955 L 230 969 L 228 975 L 226 990 L 220 1009 L 216 1030 L 203 1044 L 193 1051 L 178 1054 L 171 1062 L 166 1063 L 163 1067 L 159 1064 L 156 1057 L 151 1055 L 143 1056 L 134 1063 L 123 1055 L 116 1055 L 111 1066 L 88 1078 L 83 1079 L 81 1075 L 85 1057 L 79 1069 L 76 1070 L 77 1062 L 75 1058 L 72 1065 L 67 1068 L 64 1057 L 77 1046 L 82 1038 L 74 1042 L 72 1038 L 77 1026 L 66 1033 L 65 1022 L 71 1018 L 66 1013 L 81 1013 L 77 1007 L 81 1002 L 71 1003 L 68 996 L 70 988 L 74 990 L 76 987 L 71 983 L 76 965 L 82 973 L 78 962 L 83 945 L 86 939 L 93 941 L 86 931 L 97 889 L 106 874 L 113 871 L 120 856 L 126 857 L 122 851 L 123 847 L 133 828 L 144 814 L 142 808 L 145 806 L 142 805 L 147 796 L 151 777 L 153 774 L 158 775 L 156 772 L 153 772 L 157 763 L 165 763 L 159 759 L 164 752 L 169 755 L 166 748 L 170 728 L 173 730 L 176 738 L 172 725 L 174 707 L 178 701 L 174 698 L 168 649 L 176 638 L 181 620 L 178 592 L 174 573 L 174 557 L 179 542 L 186 527 L 196 523 L 188 530 L 190 540 L 195 545 L 206 545 Z') +
      nzLand(1.4, 'M 66 120 L 68 123 L 71 109 L 73 116 L 74 116 L 85 115 L 91 117 L 92 112 L 106 114 L 112 124 L 114 123 L 118 116 L 136 134 L 136 141 L 142 148 L 134 152 L 135 153 L 165 179 L 168 193 L 174 200 L 175 219 L 179 218 L 184 219 L 185 214 L 191 216 L 203 215 L 212 228 L 219 224 L 219 220 L 203 189 L 196 182 L 195 178 L 197 174 L 213 188 L 216 185 L 227 198 L 244 229 L 252 233 L 253 236 L 250 237 L 250 240 L 254 241 L 262 239 L 288 242 L 312 237 L 318 230 L 321 223 L 323 205 L 331 187 L 342 182 L 356 184 L 358 206 L 367 251 L 364 266 L 360 271 L 365 294 L 370 301 L 370 309 L 362 303 L 350 307 L 342 316 L 335 328 L 334 342 L 338 356 L 340 358 L 348 360 L 349 400 L 344 448 L 342 489 L 334 518 L 323 541 L 318 541 L 312 531 L 307 532 L 300 539 L 296 526 L 294 525 L 293 526 L 295 530 L 292 535 L 287 537 L 291 475 L 286 449 L 268 432 L 257 430 L 246 433 L 232 426 L 211 427 L 202 421 L 198 414 L 198 403 L 205 390 L 217 377 L 220 359 L 211 317 L 211 299 L 206 291 L 209 282 L 191 262 L 190 253 L 187 253 L 176 240 L 177 238 L 179 238 L 186 245 L 186 236 L 190 231 L 181 224 L 174 232 L 168 232 L 158 219 L 144 207 L 146 205 L 156 210 L 156 206 L 154 198 L 148 195 L 146 184 L 139 182 L 141 189 L 128 185 L 118 173 L 121 181 L 139 196 L 138 202 L 87 160 L 90 138 L 86 145 L 85 157 L 76 149 L 74 149 L 66 143 L 67 136 L 64 128 L 30 100 L 43 90 L 43 100 Z') +
      nzLand(0.9, 'M 159 1091 L 160 1094 L 156 1095 L 157 1098 L 163 1099 L 166 1097 L 169 1103 L 160 1112 L 158 1119 L 152 1122 L 150 1129 L 144 1134 L 143 1130 L 145 1123 L 144 1116 L 146 1112 L 146 1102 L 140 1088 L 147 1084 Z') +
      nzLand(0.9, 'M 195 159 L 197 162 L 193 163 L 185 159 L 183 154 L 184 147 L 191 152 Z') +
      nzLand(0.9, 'M 70 1040 L 71 1046 L 63 1049 L 62 1044 L 66 1039 Z') +
      nzLand(0.9, 'M 245 523 L 241 531 L 239 521 L 241 516 L 244 511 Z') +
      // Ferry across Cook Strait (Wellington to Picton)
      '<path d="' + nzWorldPath('M 286 536 C 278 552 274 547 264 551') + '" fill="none" stroke="#fff" stroke-width=".45" stroke-dasharray="1 1.3" stroke-linecap="round" opacity=".85"/>' +
      // 1.9.227 Whangārei close-up (30x): Whangārei and Onerahi at their real relative places, Sarah\'s House beside Onerahi,
      // linked by a dashed leader line to the ring where Whangārei really sits on the coast.
      insetSvg() +
      // A little plane on the flight out of Dunedin
      // 1.9.222 Australia: same full-screen style as New Zealand, with Tasmania and a heading pill.
      '<g class="sr-aus">' +
      '<path filter="url(#sr-soft)" fill="url(#sr-land)" stroke="#fff" stroke-width="8" stroke-linejoin="round" d="' + AUS_PATH + '"/>' +
      '<path filter="url(#sr-soft)" fill="url(#sr-land)" stroke="#fff" stroke-width="6" stroke-linejoin="round" d="' + TAS_PATH + '"/>' +
      // 1.9.234 Papua New Guinea (mainland + New Britain), from real coast points through ausXY.
      '<path filter="url(#sr-soft)" fill="url(#sr-candy-strawberry)" stroke="#fff" stroke-width="5" stroke-linejoin="round" d="' + ausPath(PNG_PTS) + '"/>' +
      '<path fill="url(#sr-candy-strawberry)" stroke="#fff" stroke-width="4" stroke-linejoin="round" d="' + ausPath(NEW_BRITAIN_PTS) + '"/>' +
      '<text x="306" y="1711" text-anchor="middle" font-size="10" font-weight="900" fill="#2f7a4a" font-family="ui-rounded,system-ui,sans-serif">Papua New Guinea</text>' +
      EAST_ISLES.map(function (q, i) { const a = ausXY(q[0], q[1]), rx = i >= 12 ? Math.min(q[2], 2.4) : q[2], ry = i >= 12 ? Math.min(q[3], 1.5) : q[3]; return '<ellipse cx="' + a.x.toFixed(1) + '" cy="' + a.y.toFixed(1) + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + q[4] + ' ' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ')" fill="url(#' + islandCandy[i % islandCandy.length] + ')" stroke="#fff" stroke-width="3"/>'; }).join('') +
      // Asia polygon order: Southeast/South Asia and Silk Road countries, followed by East Asia.
      ASIA_LAND.map(function (pts, i) { return '<path filter="url(#sr-soft)" fill="url(#' + asiaCandy[i % asiaCandy.length] + ')" stroke="#fff" stroke-width="4" stroke-linejoin="round" d="' + ausPath(pts) + '"/>'; }).join('') +
      ASIA_EAST_LAND.map(function (pts, i) { return '<path filter="url(#sr-soft)" fill="url(#' + asiaCandy[(i + 3) % asiaCandy.length] + ')" stroke="#fff" stroke-width="4" stroke-linejoin="round" d="' + ausPath(pts) + '"/>'; }).join('') +
      // 1.9.269 Pacific inset is painted after Asia so Samoa, Tonga and Rarotonga stay on top.
      // 1.9.220 Pacific Islands inset: a lagoon-blue panel with Rarotonga, Tonga and Samoa.
      pacificSvg() +
      mapTerrain() +
      mapLandmarks() +
      '<path d="M120 1960 C150 1940 190 1950 210 1980 C190 1990 150 1990 120 1960 Z" fill="#ffd9a8" opacity=".6"/>' +
      '<path d="M236 1930 C250 1918 270 1922 276 1936 C264 1944 246 1942 236 1930 Z" fill="#ffd9a8" opacity=".55"/>' +
      '<circle class="sr-bob" cx="380" cy="1860" r="6" fill="#ffb347" opacity=".5"/><circle class="sr-bob" cx="30" cy="2160" r="7" fill="#ff8ab8" opacity=".45"/>' +
      '</g>' +
      planeAt(220, 1712, 172) + planeAt(180, 2003, -106) + planeAt(330, 2140, 110) +
      mapClouds() +
      mapAtmosphere() +
      mapAtlasType() +
      '<g class="sr-plane" transform="translate(219 1195) rotate(166)"><path d="M0 -14 L3 -4 L14 2 L14 5 L3 2 L2 10 L6 13 L6 15 L0 13 L-6 15 L-6 13 L-2 10 L-3 2 L-14 5 L-14 2 L-3 -4 Z" fill="#fff" stroke="#3d8bfd" stroke-width="1.5"/></g>' +
      '<path id="sr-future-border" d="' + future + '" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 8" opacity=".92"/>' +
      '<path id="sr-future" d="' + future + '" fill="none" stroke="#ff6fa8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 8" opacity=".96"/>' +
      '<path id="sr-path-wide" d="' + live + '" fill="none" stroke="url(#sr-icing)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path id="sr-path-dash" d="' + live + '" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 10" opacity=".9"/>' +
      '<path id="sr-path-win" d="" fill="none" stroke="#fff6a8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<g id="sr-travel-plane" display="none" pointer-events="none" filter="url(#sr-soft)"><g transform="scale(1.7)"><circle r="24" fill="#fff6c8" fill-opacity=".92" stroke="#fff" stroke-width="4"/><circle r="18" fill="none" stroke="#ff6fa8" stroke-width="2.5"/><path d="M0 -14 L3 -4 L14 2 L14 5 L3 2 L2 10 L6 13 L6 15 L0 13 L-6 15 L-6 13 L-2 10 L-3 2 L-14 5 L-14 2 L-3 -4 Z" fill="#fff" stroke="#2878c8" stroke-width="2"/></g></g>' +
      '<g id="sr-travel-car" display="none" pointer-events="none" filter="url(#sr-soft)"><ellipse cx="0" cy="11" rx="27" ry="6" fill="#3e6674" opacity=".28"/><path d="M-25 5 L-23 -4 Q-22 -7 -17 -8 L-10 -10 L-4 -20 Q-2 -22 2 -22 L12 -22 Q16 -21 18 -17 L24 -8 L29 -5 Q31 -3 31 2 L29 7 Q28 10 24 10 L-20 10 Q-25 9 -25 5 Z" fill="#ee4055" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><path d="M-8 -10 L-3 -18 Q-2 -19 1 -19 L5 -19 L5 -10 Z M8 -19 L12 -19 Q14 -18 16 -15 L19 -10 L8 -10 Z" fill="#bceeff" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M-22 -2 L-17 -5 M24 -2 L28 0" fill="none" stroke="#fff6c8" stroke-width="2.3" stroke-linecap="round"/><circle cx="-15" cy="9" r="6" fill="#3e3844" stroke="#fff" stroke-width="1.7"/><circle cx="18" cy="9" r="6" fill="#3e3844" stroke="#fff" stroke-width="1.7"/><circle cx="-15" cy="9" r="2.5" fill="#dcebf0"/><circle cx="18" cy="9" r="2.5" fill="#dcebf0"/><path d="M-9 -21 Q2 -24 12 -21" fill="none" stroke="#ffb0b4" stroke-width="2" stroke-linecap="round"/></g>' +
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
  const isBlock = t => !!(t && (t.ice > 0 || t.choco > 0 || t.bub > 0 || t.popper > 0 || t.boss > 0));
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
      if (!t || !t.s || t.used || isBlock(t) || isIng(t)) continue; // used: spent in a special + special combo
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
  // 1.9.230 Two super powers together: swapping two special sweets always works (even with no normal match) and
  // makes a combo, centred where the dragged sweet lands:
  //   stripe + stripe   'crisscross'  the whole row and the whole column
  //   stripe + wrapped  'bigcross'    a giant cross: 3 full rows and 3 full columns
  //   wrapped + wrapped 'bigblast'    a 5x5 double blast
  //   bomb + stripe     'stripestorm' every free sweet of the stripe's colour turns striped, then they all fire
  //   bomb + wrapped    'wrapstorm'   every free sweet of that colour turns wrapped, then they all explode
  //   bomb + bomb       'sugarstorm'  clears the whole board
  // (The sprinkle bomb is the game's colour bomb; stripes and wrapped sweets are the only other specials.)
  // Everything goes through the normal clear/hit sets, so jelly, jars, icing, bubbles, liquorice, chocolate and
  // ingredients all behave exactly as for any other clear.
  const COMBO_KINDS = ['crisscross', 'bigcross', 'bigblast', 'stripestorm', 'wrapstorm', 'sugarstorm'];
  const COMBO_BONUS = { crisscross: 400, bigcross: 600, bigblast: 600, stripestorm: 900, wrapstorm: 900, sugarstorm: 1500 };
  const isSpecialTile = t => !!(t && t.s && (isCandy(t) || isBomb(t)));
  function comboKind(A, Z) {
    if (!isSpecialTile(A) || !isSpecialTile(Z)) return '';
    const k = [A, Z].map(t => isBomb(t) ? 'b' : t.s === 'w' ? 'w' : 's').sort().join('');
    return { bb: 'sugarstorm', bs: 'stripestorm', bw: 'wrapstorm', ss: 'crisscross', sw: 'bigcross', ww: 'bigblast' }[k] || '';
  }
  function comboSwap(b, A, Z, a, z, mask, rand, kind) {
    kind = kind || comboKind(A, Z);
    if (kind === 'sugarstorm') { const s = bombSwap(b, A, Z, key(z[0], z[1]), mask); s.combo = kind; s.comboAt = { r: z[0], c: z[1] }; s.comboBonus = COMBO_BONUS[kind]; return s; }
    rand = typeof rand === 'function' ? rand : Math.random;
    const clear = new Set(), fired = [], hit = new Set(), converted = [];
    const [r0, c0] = z;
    const add = (r, c) => {
      if (r < 0 || r >= N || c < 0 || c >= N || !isOpen(mask, r, c)) return;
      const t = b[r][c], k = key(r, c);
      if (!t || isHole(t) || isIng(t)) return;
      if (isBlock(t)) { hit.add(k); return; }
      clear.add(k);
    };
    let bomb = false;
    if (kind === 'stripestorm' || kind === 'wrapstorm') {
      const bt = isBomb(A) ? A : Z, other = bt === A ? Z : A, col = other.c;
      bt.armed = true; bomb = true;
      add(z[0], z[1]); add(a[0], a[1]);
      let n = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const t = b[r][c];
        if (!t || t === bt || t.c !== col || !isOpen(mask, r, c)) continue;
        if (isBlock(t)) { hit.add(key(r, c)); continue; }
        if (!isCandy(t)) continue;
        if (t !== other && !t.s && !t.lock && !t.liq) {
          const sp = kind === 'wrapstorm' ? 'w' : (n++ % 2 ? 'col' : 'row');
          converted.push({ t, r, c, s: sp }); t.s = sp;
        }
        add(r, c);
      }
      const bk = bt === A ? z : a;
      fired.push({ r: bk[0], c: bk[1], s: 'b', color: col });
      expand(b, clear, fired, hit, mask);
      for (const cv of converted) cv.t.s = ''; // shown turning special by the UI, just before they fire
    } else {
      A.used = true; Z.used = true;
      add(z[0], z[1]); add(a[0], a[1]);
      if (kind === 'crisscross') {
        for (let j = 0; j < N; j++) add(r0, j);
        for (let i = 0; i < N; i++) add(i, c0);
        fired.push({ r: r0, c: c0, s: 'row' }, { r: r0, c: c0, s: 'col' });
      } else if (kind === 'bigcross') {
        for (let d = -1; d <= 1; d++) {
          if (r0 + d >= 0 && r0 + d < N) { for (let j = 0; j < N; j++) add(r0 + d, j); fired.push({ r: r0 + d, c: c0, s: 'row' }); }
          if (c0 + d >= 0 && c0 + d < N) { for (let i = 0; i < N; i++) add(i, c0 + d); fired.push({ r: r0, c: c0 + d, s: 'col' }); }
        }
      } else { // bigblast
        for (let i = r0 - 2; i <= r0 + 2; i++) for (let j = c0 - 2; j <= c0 + 2; j++) add(i, j);
        fired.push({ r: r0, c: c0, s: 'w', big: 2 }, { r: a[0], c: a[1], s: 'w', big: 2 });
      }
      expand(b, clear, fired, hit, mask); // other specials caught in the blast go off too
    }
    neighbourHits(b, clear, hit, mask);
    return { kind: 'clear', clear, made: [], fired, hit, groups: 1, bomb, combo: kind, comboAt: { r: r0, c: c0 }, converted, comboBonus: COMBO_BONUS[kind] };
  }
  // 1.9.230 Two specials side by side (the first time, a quick combo tip points at them).
  function adjacentSpecials(b, mask) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = b[r][c]; if (!canSwap(t) || !isSpecialTile(t)) continue;
      for (const [i, j] of [[r, c + 1], [r + 1, c]]) {
        if (i >= N || j >= N || (mask && !isOpen(mask, i, j))) continue;
        const o = b[i][j]; if (canSwap(o) && isSpecialTile(o)) return [[r, c], [i, j]];
      }
    }
    return null;
  }
  // 1.9.285 Candy cannons sit above a column and load an obstacle into the next sweet that drops there.
  function cannonTile(st, c, rand, kinds) {
    const due = st && st.cannonDue;
    if (!due || !(due[c] > 0)) return null;
    const cn = (st.lv.cannons || []).find(function (x) { return x.c === c; });
    if (!cn) return null;
    due[c]--;
    st.cannonFired = (st.cannonFired || 0) + 1;
    if (cn.drop === 'ing') return Object.assign(mk(-3), { ing: 1, cannon: 1 });
    const t = mk(randKind(rand, kinds));
    if (cn.drop === 'fuse') t.fuse = cn.fuse || 9;
    else if (cn.drop === 'lock') t.lock = 1;
    else t.liq = 1;
    t.cannon = 1;
    return t;
  }
  function freshTile(st, c, rand, kinds) { return cannonTile(st, c, rand, kinds) || mk(randKind(rand, kinds)); }
  // 1.9.285 Portals: a sweet that drops out of a portal's mouth comes out of its exit, in another part of the tray.
  function collapsePortals(b, rand, kinds, mask, st) {
    const portals = st.lv.portals, exits = new Set(portals.map(function (p) { return key(p.to[0], p.to[1]); }));
    const open = function (r, c) { return isOpen(mask, r, c) && !isHole(b[r][c]); };
    const start = new Map(), via = new Map(), fresh = new Map();
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = b[r][c]; if (t && !isHole(t)) start.set(t.id, [r, c]); }
    for (let guard = 0; guard < 600; guard++) {
      let moved = false;
      for (let c = 0; c < N; c++) for (let r = N - 1; r >= 0; r--) {
        if (!open(r, c) || b[r][c]) continue;
        for (let i = r - 1; i >= 0 && open(i, c) && !isBlock(b[i][c]); i--) {
          if (b[i][c]) { b[r][c] = b[i][c]; b[i][c] = null; moved = true; break; }
        }
      }
      for (const p of portals) {
        const [fr, fc] = p.from, [tr, tc] = p.to, t = b[fr] && b[fr][fc];
        if (!open(tr, tc) || b[tr][tc] || !t || isHole(t) || isBlock(t)) continue;
        b[tr][tc] = t; b[fr][fc] = null; via.set(t.id, [tr, tc]); moved = true;
      }
      if (moved) continue;
      let spawned = false;
      for (let c = 0; c < N; c++) for (let r = 0; r < N; r++) {
        if (!open(r, c) || b[r][c] || exits.has(key(r, c))) continue;
        if (r > 0 && open(r - 1, c) && !isBlock(b[r - 1][c])) continue; // not the top of its run
        const t = freshTile(st, c, rand, kinds); b[r][c] = t; fresh.set(t.id, (fresh.get('c' + c) || 0) + 1); fresh.set('c' + c, (fresh.get('c' + c) || 0) + 1); spawned = true;
      }
      if (!spawned) break;
    }
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (isOpen(mask, r, c) && !b[r][c]) { const t = freshTile(st, c, rand, kinds); b[r][c] = t; fresh.set(t.id, 1); }
    const falls = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = b[r][c]; if (!t || isHole(t)) continue;
      const s0 = start.get(t.id), pv = via.get(t.id);
      if (s0 && s0[0] === r && s0[1] === c) continue;
      if (pv) falls.push({ t, r, c, from: pv[0] - 1, portal: true });
      else if (!s0) falls.push({ t, r, c, from: r - (fresh.get(t.id) || 1) - 1, fresh: true });
      else falls.push({ t, r, c, from: s0[0] });
    }
    return falls;
  }
  function collapse(b, rand, kinds, mask, st) {
    if (st && st.lv && st.lv.portals && st.lv.portals.length) return collapsePortals(b, rand, kinds, mask, st);
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
          const t = (st && st.cannonDue) ? freshTile(st, c, rand, kinds) : mk(randKind(rand, kinds));
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
      if (st && st.lv && st.lv.portals && st.lv.portals.some(function (p) { return p.from[0] === bottom && p.from[1] === c; })) continue;
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
    step.blasts = [];
    const exploded = new Set(), pending = Array.from(hit);
    // Poppers are blockers until a match or special hits one; each burst clears a 3×3 patch.
    // Other Poppers in the patch join the chain, while frosting and other blockers take a hit.
    for (let q = 0; q < pending.length; q++) {
      const k = pending[q], [r, c] = rc(k), bomb = b[r][c];
      if (!bomb || !bomb.popper || exploded.has(k)) continue;
      exploded.add(k); b[r][c] = null; step.blasts.push({ r: r, c: c });
      for (let i = r - 1; i <= r + 1; i++) for (let j = c - 1; j <= c + 1; j++) {
        if (!isOpen(mask, i, j)) continue;
        const at = key(i, j), t = b[i][j];
        if (!t || isHole(t) || t === bomb) continue;
        if (t.popper || isBlock(t)) {
          if (!hit.has(at)) hit.add(at);
          if (t.popper && !exploded.has(at)) pending.push(at);
        } else if (isCandy(t) || isBomb(t)) step.clear.add(at);
      }
    }
    step.popped = [];
    step.delivered = step.delivered || [];
    step.jellyCleared = 0;
    step.brokeLock = false;
    step.liqFreed = 0;
    step.bubPopped = 0;
    step.clear.forEach(k => {
      const [r, c] = rc(k), t = b[r][c];
      if (t && !isHole(t) && !isBlock(t)) {
        step.popped.push({ id: t.id, r, c, color: t.c, s: t.s, lock: t.lock, liq: t.liq, fuse: t.fuse || 0,
          postcardPiece: Number.isInteger(t.postcardPiece) ? t.postcardPiece : null });
        if (t.lock) step.brokeLock = true;
        if (t.liq) step.liqFreed++;
        if (t.fuse) { step.defused = (step.defused || 0) + 1; if (st) st.defused = (st.defused || 0) + 1; }
        if (st && t.c >= 0) st.collected[t.c] = (st.collected[t.c] || 0) + 1;
        b[r][c] = null;
        if (st && st.jelly) {
          const before = st.jelly[r][c] || 0;
          st.jelly[r][c] = Math.max(0, before - 1);
          if (before > 0) step.jellyCleared++;
        }
        if (st && st.flow) st.flow[r][c] = Math.max(0, (st.flow[r][c] || 0) - 1);
      }
    });
    step.blocked = [];
    hit.forEach(k => {
      const [r, c] = rc(k), t = b[r][c];
      if (!t) return;
      if (t.boss > 0) {
        // 1.9.285 Boss: every hit on one of its four squares takes one heart off its health bar.
        if (st && st.boss && st.boss.hp > 0) {
          st.boss.hp = Math.max(0, st.boss.hp - 1); st.boss.hitThisMove = true;
          step.bossHit = (step.bossHit || 0) + 1;
          step.blocked.push({ r, c, kind: 'boss', left: st.boss.hp });
          if (st.boss.hp <= 0) {
            step.bossDown = { r: st.boss.r, c: st.boss.c };
            for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const o = b[st.boss.r + i] && b[st.boss.r + i][st.boss.c + j]; if (o && o.boss) b[st.boss.r + i][st.boss.c + j] = null; }
          }
        }
        return;
      }
      if (t.ice > 0) {
        t.ice--;
        step.blocked.push({ r, c, kind: 'ice', left: t.ice });
        if (t.ice <= 0) {
          b[r][c] = null;
          if (t.hidden && st) { st.hiddenLeft = Math.max(0, (st.hiddenLeft || 0) - 1); step.blocked.push({ r, c, kind: 'hidden' }); }
          if (st && st.jelly) { const before = st.jelly[r][c] || 0; st.jelly[r][c] = Math.max(0, before - 1); if (before > 0) step.jellyCleared++; }
        }
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
    step.madeTiles = (step.made || []).map(m => {
      const [r, c] = rc(m.k), under = b[r][c], t = mk(m.color, m.s);
      if (under && Number.isInteger(under.postcardPiece)) t.postcardPiece = under.postcardPiece;
      b[r][c] = t; return { t, r, c };
    });
    if (st && step.made) step.made.forEach(function (m) {
      if (m && m.s) st.specialsMade[m.s] = (st.specialsMade[m.s] || 0) + 1;
    });
    if (st && step.combo) st.combosMade[step.combo] = (st.combosMade[step.combo] || 0) + 1;
    step.cascade = cascade;
    step.points = step.popped.length * PTS * cascade + (step.made || []).reduce((n, m) => n + (BONUS[m.s] || 0), 0) + (step.comboBonus || 0);
    step.falls = [];
    for (let guard = 0; guard < 8; guard++) {
      const f = collapse(b, rand, kinds, mask, st);
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
    if (comboKind(A, Z)) return true; // 1.9.230 two specials always combine
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
      if (isCandy(t) && !t.lock && !t.liq && !t.fuse) { cells.push([r, c]); tiles.push(t); }
    }
    for (let tries = 0; tries < 300; tries++) {
      for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const x = tiles[i]; tiles[i] = tiles[j]; tiles[j] = x; }
      cells.forEach((p, i) => { b[p[0]][p[1]] = tiles[i]; });
      if (!findRuns(b).length && hasMove(b, mask)) return true;
    }
    const fresh = newBoard(rand, kinds, mask);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (isHole(b[r][c]) || isBlock(b[r][c]) || isIng(b[r][c]) || (b[r][c] && (b[r][c].lock || b[r][c].liq || b[r][c].fuse))) continue;
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
    grid(lv.hidden, (r, c, n) => { const t = board[r][c]; if (t && t.ice > 0) { t.hidden = n; t.hiddenIcon = lv.hiddenIcon || '🧚'; } });
    grid(lv.choco, (r, c) => { board[r][c] = Object.assign(mk(-5), { choco: 1 }); });
    grid(lv.poppers, (r, c, n) => { board[r][c] = Object.assign(mk(-6), { popper: n }); });
    (lv.ings || []).forEach(([r, c]) => { if (isOpen(mask, r, c)) board[r][c] = Object.assign(mk(-3), { ing: 1 }); });
    (lv.fuses || []).forEach(([r, c, n]) => { const t = board[r] && board[r][c]; if (isCandy(t) && isOpen(mask, r, c)) { t.fuse = n || 9; t.lock = 0; t.liq = 0; t.bub = 0; } });
    if (lv.boss) {
      const { r, c } = lv.boss;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) board[r + i][c + j] = Object.assign(mk(-7), { boss: 1, part: i * 2 + j });
    }
    if (!hasMove(board, mask)) shuffle(board, rand, kinds, mask);
    return board;
  }
  function countIngs(b) { let n = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (isIng(b[r][c])) n++; return n; }
  function ingTotal(lv) {
    lv = lv || {};
    return (lv.ings || []).length + (lv.cannons || []).reduce(function (n, cn) { return n + (cn.drop === 'ing' ? (cn.max || 0) : 0); }, 0);
  }
  function fusesOn(b) { const out = []; if (!b) return out; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = b[r][c]; if (t && t.fuse > 0) out.push({ r, c, n: t.fuse }); } return out; }
  function jellyLeft(st) {
    if (!st.jelly) return 0;
    let n = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) n += st.jelly[r][c] || 0;
    return n;
  }
  function flowLeft(st) {
    if (!st.flow) return 0;
    let n = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) n += st.flow[r][c] || 0;
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
  // 1.9.285 Lock and liquorice cannons with a set number of shots: the jars and liquorice still to come count as goals.
  function cannonGoal(lv, kind) { return (lv.cannons || []).some(function (c) { return c.drop === kind && c.max > 0; }); }
  function cannonLeft(st, kind) {
    let n = 0;
    ((st && st.lv && st.lv.cannons) || []).forEach(function (c) {
      if (c.drop !== kind || !(c.max > 0)) return;
      n += Math.max(0, c.max - ((st.cannonShots && st.cannonShots[c.c]) || 0)) + ((st.cannonDue && st.cannonDue[c.c]) || 0);
    });
    return n;
  }
  function goalsMet(st) {
    const lv = st.lv || LEVEL;
    if (st.challenge) return Array.isArray(st.postcardFound) && st.postcardFound.length >= POSTCARD_COUNT;
    // Score is never the win condition — only objectives are.
    if (lv.jelly && jellyLeft(st) > 0) return false;
    if (lv.ice && lv.iceGoal !== false && iceLeft(st.board) > 0) return false;
    if (lv.hidden && (st.hiddenLeft || 0) > 0) return false;
    if (lv.flow && flowLeft(st) > 0) return false;
    if (lv.collect && (st.collected[lv.collect.color] || 0) < lv.collect.n) return false;
    if (lv.recipe) {
      if ((lv.recipe.candies || []).some(function (item) { return (st.collected[item.color] || 0) < item.n; })) return false;
      if ((lv.recipe.specials || []).some(function (item) { return ((st.specialsMade || {})[item.kind] || 0) < item.n; })) return false;
      if ((lv.recipe.combos || []).some(function (item) { return ((st.combosMade || {})[item.kind] || 0) < item.n; })) return false;
    }
    if (ingTotal(lv) && (st.ingsLeft || 0) > 0) return false;
    if (lv.boss && st.boss && st.boss.hp > 0) return false;
    if ((lv.locks || cannonGoal(lv, 'lock')) && locksLeft(st.board) + cannonLeft(st, 'lock') > 0) return false;
    if (lv.bub && bubLeft(st.board) > 0) return false;
    if ((lv.liq || cannonGoal(lv, 'liq')) && liqLeft(st.board) + cannonLeft(st, 'liq') > 0) return false;
    if (lv.chocoGoal && chocoLeft(st.board) > 0) return false;
    if (lv.scoreGoal && st.score < lv.scoreGoal) return false;
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
  function beltDirection(lv, lane, turns) {
    let dir = lane.dir < 0 ? -1 : 1;
    if (lv && lv.reverseBelts && ((turns | 0) % 2 === 1)) dir *= -1;
    return dir;
  }
  function shiftBelts(st, turns) {
    const moves = [], lv = st.lv || {}, b = st.board;
    for (const lane of lv.belts || []) {
      const r = lane.row | 0, cols = lane.cols || Array.from({ length: N }, function (_, c) { return c; });
      if (r < 0 || r >= N || cols.length < 2) continue;
      const tiles = cols.map(function (c) { return b[r][c]; });
      const carryable = function (t) { return isBomb(t) || isIng(t) || !!(t && t.c >= 0 && !t.ice && !t.choco && !t.ing); };
      // A solid lane moves as a loop. Fixed blockers stop it rather than letting sweets jump over them.
      if (tiles.some(function (t) { return !carryable(t); })) continue;
      const dir = beltDirection(lv, lane, turns);
      tiles.forEach(function (t, i) {
        const from = cols[i], to = cols[(i + dir + cols.length) % cols.length];
        if (from !== to) moves.push({ t: t, from: { r: r, c: from }, to: { r: r, c: to } });
      });
      tiles.forEach(function (t, i) { b[r][cols[(i + dir + cols.length) % cols.length]] = t; });
    }
    return moves;
  }
  function starsFor(score, lv) { lv = lv || LEVEL; return lv.stars.filter(s => score >= s).length; }
  function starsOf(st) {
    if (!st.won) return 0;
    return Math.max(1, starsFor(st.score, st.lv || LEVEL));
  }
  const RECIPE_COLOR_ICONS = ['🍒', '🍊', '🍋', '🍏', '🫐', '🍇'];
  const RECIPE_SPECIALS = {
    w: { icon: '🎁', name: 'wrapped sweet' },
    b: { icon: '🌈', name: 'sprinkle bomb' },
    row: { icon: '↔️', name: 'striped sweet' },
    col: { icon: '↕️', name: 'striped sweet' }
  };
  const RECIPE_COMBOS = {
    crisscross: { icon: '⚡', name: 'double-stripe blast' },
    bigcross: { icon: '💥', name: 'wide stripe blast' },
    bigblast: { icon: '🎁', name: 'double-wrap blast' },
    stripestorm: { icon: '🌈', name: 'rainbow stripe storm' },
    wrapstorm: { icon: '🎁', name: 'rainbow wrap storm' },
    sugarstorm: { icon: '🌟', name: 'sweet-shop storm' }
  };
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
      flow: parseDigits(lv.flow),
      collected: new Array(KINDS).fill(0),
      specialsMade: {},
      combosMade: {},
      hiddenLeft: lv.hidden ? parseDigits(lv.hidden).reduce((sum, row) => sum + row.reduce((a, n) => a + n, 0), 0) : 0,
      ingsLeft: countIngs(board) + (lv.cannons || []).reduce(function (n, cn) { return n + (cn.drop === 'ing' ? (cn.max || 0) : 0); }, 0),
      boss: lv.boss ? { r: lv.boss.r, c: lv.boss.c, hp: lv.boss.hp, max: lv.boss.hp, heal: lv.boss.heal == null ? 1 : lv.boss.heal, hitThisMove: false } : null,
      cannonDue: lv.cannons ? Object.fromEntries(lv.cannons.map(function (cn) { return [cn.c, cn.drop === 'ing' ? 1 : 0]; })) : null,
      cannonShots: lv.cannons ? Object.fromEntries(lv.cannons.map(function (cn) { return [cn.c, cn.drop === 'ing' ? 1 : 0]; })) : null,
      defused: 0,
      score: 0, moves: lv.moves, target: lv.target || 0, timerLeft: lv.timer || 0, timerMsLeft: (lv.timer || 0) * 1000, timerUpdatedAt: Date.now(),
      turns: 0, over: false, won: false, stars: 0
    };
  }
  function isScoreOnly(lv) {
    lv = lv || {};
    // Kept for older tests; no live level is score-only any more.
    return !lv.jelly && !lv.flow && !lv.ice && !lv.hidden && !lv.collect && !lv.recipe && !ingTotal(lv) && !lv.locks && !lv.bub && !lv.liq && !lv.chocoGoal && !lv.scoreGoal && !lv.boss;
  }
  function tickTimer(st, at) {
    if (!st || !st.lv || !st.lv.timer || st.over) return false;
    at = at == null ? Date.now() : at;
    const before = st.timerLeft;
    const elapsed = Math.max(0, at - (st.timerUpdatedAt || at));
    st.timerUpdatedAt = at;
    st.timerMsLeft = Math.max(0, (st.timerMsLeft == null ? st.lv.timer * 1000 : st.timerMsLeft) - elapsed);
    st.timerLeft = Math.ceil(st.timerMsLeft / 1000);
    if (st.timerMsLeft <= 0) {
      st.timerLeft = 0;
      st.over = true;
      st.timerExpired = true;
      st.won = goalsMet(st);
      st.stars = st.won ? starsOf(st) : 0;
    }
    return before !== st.timerLeft || !!st.timerExpired;
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
    if (lv.recipe) {
      (lv.recipe.candies || []).forEach(function (item) {
        const have = stt ? (stt.collected[item.color] || 0) : 0;
        const left = Math.max(0, item.n - have);
        const icon = RECIPE_COLOR_ICONS[item.color] || '🍬';
        const name = NAMES[item.color] || 'sweets';
        out.push({ kind: 'recipe-candy', icon: icon, left: left, have: have, n: item.n, lab: 'collect', text: icon + ' ' + name + ' ' + have + '/' + item.n });
      });
      (lv.recipe.specials || []).forEach(function (item) {
        const def = RECIPE_SPECIALS[item.kind] || { icon: '✨', name: 'special sweet' };
        const have = stt ? ((stt.specialsMade || {})[item.kind] || 0) : 0;
        const left = Math.max(0, item.n - have);
        out.push({ kind: 'recipe-special', icon: def.icon, left: left, have: have, n: item.n, lab: 'make', text: def.icon + ' ' + def.name + ' ' + have + '/' + item.n });
      });
      (lv.recipe.combos || []).forEach(function (item) {
        const def = RECIPE_COMBOS[item.kind] || { icon: '✨', name: 'special combo' };
        const have = stt ? ((stt.combosMade || {})[item.kind] || 0) : 0;
        const left = Math.max(0, item.n - have);
        out.push({ kind: 'recipe-combo', icon: def.icon, left: left, have: have, n: item.n, lab: 'make', text: def.icon + ' ' + def.name + ' ' + have + '/' + item.n });
      });
    }
    if (ingTotal(lv)) {
      const n = ingTotal(lv);
      const have = stt ? (n - (stt.ingsLeft || 0)) : 0;
      const left = stt ? (stt.ingsLeft || 0) : n;
      const ii = lv.ingIcon || '🎁';
      out.push({ kind: 'ings', icon: ii, left: left, have: have, n: n, lab: have + '/' + n, text: ii + ' ' + have + '/' + n });
    }
    if (lv.jelly) {
      const left = stt ? jellyLeft(stt) : 0;
      out.push({ kind: 'jelly', icon: '🟩', left: left, have: 0, n: left, lab: 'Jelly ' + left + ' left', text: '🟩 Jelly ' + left + ' left' });
    }
    if (lv.flow) {
      const left = stt ? flowLeft(stt) : 0;
      out.push({ kind: 'flow', icon: '🌈', left: left, have: 0, n: left, lab: 'Clogs left', text: '🌈 Syrup Stream clogs ' + left + ' left' });
    }
    if (lv.ice && lv.iceGoal !== false) {
      const left = stt && stt.board ? iceLeft(stt.board) : 0;
      out.push({ kind: 'ice', icon: '🧁', left: left, have: 0, n: left, lab: 'Icing ' + left + ' left', text: '🧁 ' + left + ' left' });
    }
    if (lv.hidden) {
      const n = parseDigits(lv.hidden).reduce((sum, row) => sum + row.reduce((a, k) => a + k, 0), 0);
      const left = stt ? (stt.hiddenLeft || 0) : n;
      out.push({ kind: 'hidden', icon: '🧚', left: left, have: n - left, n: n, lab: 'Sprites left', text: '🧚 Sugar sprites ' + (n - left) + '/' + n });
    }
    if (lv.chocoGoal) {
      const left = stt && stt.board ? chocoLeft(stt.board) : 0;
      out.push({ kind: 'choco', icon: '🍫', left: left, have: 0, n: left, lab: 'Chocolate left', text: '🍫 Chocolate ' + left + ' left' });
    }
    if (lv.scoreGoal) {
      const have = stt ? stt.score : 0;
      const left = Math.max(0, lv.scoreGoal - have);
      out.push({ kind: 'score', icon: '⭐', left: left, have: have, n: lv.scoreGoal, lab: 'points left', text: '⭐ Score ' + have + '/' + lv.scoreGoal });
    }
    if (lv.locks || cannonGoal(lv, 'lock')) {
      const left = stt && stt.board ? locksLeft(stt.board) + cannonLeft(stt, 'lock') : 0;
      out.push({ kind: 'locks', icon: '🔒', left: left, have: 0, n: left, lab: left + ' left', text: '🔒 ' + left + ' left' });
    }
    if (lv.bub) {
      const left = stt && stt.board ? bubLeft(stt.board) : 0;
      out.push({ kind: 'bub', icon: '🫧', left: left, have: 0, n: left, lab: 'Bubbles ' + left + ' left', text: '🫧 Bubbles ' + left + ' left' });
    }
    if (lv.liq || cannonGoal(lv, 'liq')) {
      const left = stt && stt.board ? liqLeft(stt.board) + cannonLeft(stt, 'liq') : 0;
      out.push({ kind: 'liq', icon: '➿', left: left, have: 0, n: left, lab: 'Liquorice ' + left + ' left', text: '➿ Liquorice ' + left + ' left' });
    }
    if (lv.boss) {
      const max = lv.boss.hp, left = stt && stt.boss ? stt.boss.hp : max;
      const icon = lv.boss.icon || '🐻';
      out.push({ kind: 'boss', icon: icon, left: left, have: max - left, n: max, lab: 'Boss ' + left + '/' + max, text: icon + ' ' + (lv.boss.name || 'Boss') + ' ' + left + '/' + max });
    }
    return out;
  }
  function finishIfDone(st) {
    if (st.fuseBlown) { st.over = true; st.won = false; st.stars = 0; return; }
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
    const ck = comboKind(A, Z);
    if (ck) { const s = applyStep(b, comboSwap(b, A, Z, a, z, mask, st.rand, ck), st.rand, st.kinds, cascade++, st); steps.push(s); st.score += s.points; }
    else if (isBomb(A) || isBomb(Z)) { const s = applyStep(b, bombSwap(b, A, Z, key(z[0], z[1]), mask), st.rand, st.kinds, cascade++, st); steps.push(s); st.score += s.points; }
    let pref = steps.length ? null : [z, a];
    for (let guard = 0; guard < 60; guard++) {
      const s = resolve(b, pref, mask); if (!s) break;
      pref = null;
      applyStep(b, s, st.rand, st.kinds, cascade++, st);
      steps.push(s); st.score += s.points;
    }
    const beltStepIndex = steps.length, beltTurns = st.turns || 0;
    const beltMoves = (st.lv && st.lv.belts) ? shiftBelts(st, beltTurns) : [];
    if (st.lv && st.lv.belts) {
      st.turns = beltTurns + 1;
      const beltSteps = settleBoard(st, cascade);
      beltSteps.forEach(function (s) { steps.push(s); st.score += s.points; });
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
    const extra = endOfMove(st);
    if (!st.tutorial) finishIfDone(st);
    return Object.assign({ valid: true, steps, shuffled, swapped: [A, Z], spread, liqSpread, beltMoves, beltStepIndex }, extra);
  }


  // 1.9.285 After every move: cannons load their next shot, a boss that took no hit heals,
  // and every countdown bomb ticks down. One that reaches zero ends the level (unless the goals are already met).
  function endOfMove(st) {
    const out = { cannonLoaded: [], bossHealed: 0, fuseTicks: [], fuseBlown: null };
    st.moveNo = (st.moveNo || 0) + 1;
    const lv = st.lv || {};
    (lv.cannons || []).forEach(function (cn) {
      const shots = st.cannonShots[cn.c] || 0;
      if (cn.max && shots >= cn.max) return;
      if (st.moveNo % (cn.every || 4) !== 0) return;
      st.cannonDue[cn.c] = (st.cannonDue[cn.c] || 0) + 1; st.cannonShots[cn.c] = shots + 1;
      out.cannonLoaded.push(cn.c);
    });
    if (st.boss && st.boss.hp > 0) {
      if (!st.boss.hitThisMove && st.boss.heal > 0 && st.boss.hp < st.boss.max) { st.boss.hp = Math.min(st.boss.max, st.boss.hp + st.boss.heal); out.bossHealed = st.boss.heal; }
      st.boss.hitThisMove = false;
    }
    if (!st.tutorial) {
      const b = st.board;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const t = b[r][c];
        if (!t || !(t.fuse > 0)) continue;
        t.fuse--; out.fuseTicks.push({ r, c, n: t.fuse });
        if (t.fuse <= 0 && !out.fuseBlown) out.fuseBlown = { r, c };
      }
      if (out.fuseBlown) {
        if (goalsMet(st)) { fusesOn(b).forEach(function (f) { b[f.r][f.c].fuse = Math.max(1, b[f.r][f.c].fuse); }); out.fuseBlown = null; }
        else { st.fuseBlown = out.fuseBlown; st.over = true; st.won = false; st.stars = 0; }
      }
    }
    return out;
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
      flow: st.flow ? st.flow.map(r => r.slice()) : null,
      collected: st.collected.slice(),
      specialsMade: Object.assign({}, st.specialsMade || {}), combosMade: Object.assign({}, st.combosMade || {}), hiddenLeft: st.hiddenLeft || 0,
      ingsLeft: st.ingsLeft, liqIdle: st.liqIdle || 0, turns: st.turns || 0,
      boss: st.boss ? Object.assign({}, st.boss) : null,
      cannonDue: st.cannonDue ? Object.assign({}, st.cannonDue) : null, cannonShots: st.cannonShots ? Object.assign({}, st.cannonShots) : null,
      defused: st.defused || 0, fuseBlown: st.fuseBlown || null, moveNo: st.moveNo || 0,
      score: st.score, moves: st.moves, target: st.target, timerLeft: st.timerLeft, timerMsLeft: st.timerMsLeft, timerUpdatedAt: st.timerUpdatedAt,
      over: st.over, won: st.won, stars: st.stars
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
    if (before.lv && before.lv.recipe) {
      (before.lv.recipe.candies || []).forEach(function (item) { h += ((after.collected[item.color] || 0) - (before.collected[item.color] || 0)) * 350; });
      (before.lv.recipe.specials || []).forEach(function (item) { h += (((after.specialsMade || {})[item.kind] || 0) - ((before.specialsMade || {})[item.kind] || 0)) * 1000; });
      (before.lv.recipe.combos || []).forEach(function (item) { h += (((after.combosMade || {})[item.kind] || 0) - ((before.combosMade || {})[item.kind] || 0)) * 1400; });
    }
    if (before.jelly) h += (jellyLeft(before) - jellyLeft(after)) * 250;
    if (before.flow) h += (flowLeft(before) - flowLeft(after)) * 450;
    if (before.lv && before.lv.ice && before.lv.iceGoal !== false) h += (iceLeft(before.board) - iceLeft(after.board)) * 300;
    if (before.lv && before.lv.hidden) h += ((before.hiddenLeft || 0) - (after.hiddenLeft || 0)) * 500;
    if (before.lv && before.lv.chocoGoal) h += (chocoLeft(before.board) - chocoLeft(after.board)) * 400;
    if (before.lv && before.lv.locks) h += (locksLeft(before.board) - locksLeft(after.board)) * 350;
    if (before.lv && before.lv.bub) h += (bubLeft(before.board) - bubLeft(after.board)) * 320;
    if (before.lv && before.lv.liq) h += (liqLeft(before.board) - liqLeft(after.board)) * 420;
    h += ((before.ingsLeft || 0) - (after.ingsLeft || 0)) * 800;
    if (before.boss && after.boss) h += (before.boss.hp - after.boss.hp) * 600;
    if (after.fuseBlown) h -= 5e6;
    const fb = fusesOn(before.board), fa = fusesOn(after.board);
    if (fb.length) { const urgent = function (fs) { return fs.reduce(function (n, f) { return n + 1 / Math.max(1, f.n); }, 0); }; h += (urgent(fb) - urgent(fa)) * 2600; }
    if (res && res.steps) h += res.steps.reduce((n, s) => n + (s.madeTiles ? s.madeTiles.length * 80 : 0), 0);
    if (res && res.steps && res.steps[0] && res.steps[0].combo) h += 2500; // 1.9.230 hints prefer a super power combo
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
  const SAY_REST_MS = 3000, SAY_BIG = ['combo', 'bomb', 'wrap', 'stripe', 'crisscross', 'bigcross', 'bigblast', 'stripestorm', 'wrapstorm', 'sugarstorm'];
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
    stripe: ['sparkle', 'arp'], wrap: ['pops', 'arp'], bomb: ['sparkle', 'arp'], combo: ['arp', 'sparkle'],
    crisscross: ['arp', 'sparkle'], bigcross: ['arp', 'sparkle'], bigblast: ['pops', 'arp'], stripestorm: ['sparkle', 'arp'], wrapstorm: ['pops', 'sparkle'], sugarstorm: ['arp', 'sparkle']
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
    'sugar-rush-aussie.mp3': '20b03a59',
    'sugar-rush-india.mp3': '3ff84a23',
    'sugar-rush-l1.mp3': '3fd00f38', 'sugar-rush-l2.mp3': '34c4b4be',
    'sugar-rush-voice-yay.mp3': '6ca043f6', 'sugar-rush-voice-great.mp3': 'c287c114', 'sugar-rush-voice-awesome.mp3': 'a56af295',
    'sugar-rush-voice-sweetas.mp3': '50b435e6', 'sugar-rush-voice-succulent.mp3': '1d5018ba',
    // 1.9.224 Shane's songs (made with Suno), -17 LUFS like the other tunes, AAC 96k with an mp3 twin.
    'sugar-rush-travel.m4a': 'd4c901aa', 'sugar-rush-travel.mp3': '662a7337',
    'sugar-rush-kiss.m4a': '24aced8c', 'sugar-rush-kiss.mp3': '8c1174e4',
    'sugar-rush-song.m4a': 'fb999cd1', 'sugar-rush-song.mp3': '586f9ee6',
    // 1.9.225 Every saying pre-recorded in a female and a male NZ voice, one small sprite per voice.
    // 1.9.227 More room: reverb RT60 ~1.4 s and echoes at 120/260/420 ms, about 34% wet, ~0.9 s tail inside each clip.
    'sugar-rush-say-f.m4a': 'c16ab81b', 'sugar-rush-say-f.mp3': '25067d1f',
    'sugar-rush-say-m.m4a': '9e645d94', 'sugar-rush-say-m.mp3': '8e05c831'
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
    "Super Hard level!": [43.374, 1.728, 42.664, 1.853],
    "Criss-cross crunch!": [45.352, 1.678, 44.767, 1.552],
    "Stripes times two!": [47.28, 2.013, 46.569, 1.91],
    "Giant candy cross!": [49.543, 1.889, 48.729, 1.701],
    "Cross my heart!": [51.683, 1.492, 50.681, 1.417],
    "Double wrap blast!": [53.425, 1.713, 52.347, 1.619],
    "Kaboom of yum!": [55.388, 1.598, 54.216, 1.448],
    "Stripes everywhere!": [57.236, 1.818, 55.914, 1.692],
    "Rainbow stripes!": [59.304, 1.595, 57.856, 1.501],
    "Wrapped rainbow!": [61.15, 1.64, 59.607, 1.623],
    "Parcel party!": [63.04, 1.579, 61.48, 1.547],
    "Sugar storm!": [64.869, 1.482, 63.277, 1.558],
    "Clean sweep!": [66.6, 1.433, 65.085, 1.435],
    "X marks the sweet!": [68.284, 1.725, 66.771, 1.663],
    "Mega cross!": [70.259, 1.418, 68.684, 1.38],
    "Double parcel pop!": [71.927, 1.675, 70.314, 1.663],
    "Stripe storm!": [73.852, 1.59, 72.227, 1.635],
    "Gift wrap frenzy!": [75.692, 1.842, 74.112, 1.773],
    "Sugar tornado!": [77.784, 1.758, 76.135, 1.673]
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
  // 1.9.223 Shane's songs for later levels, picked by mood. 1.9.250 uses the supplied India MP3 for the
  // existing South Asia atlas group (India, Nepal, Bhutan, Pakistan: levels 38–39 and 46–47).
  // The supplied Aussie Oi Oil MP3 covers Australia (20–25 and 32–33); both audio streams remain unmodified.
  // The calm song suits the Pacific islands; the upbeat one covers the rest. Levels 1 and 2 keep their own songs.
  const SONG_PLAN = { india: [38, 39, 46, 47], aussie: [20, 21, 22, 23, 24, 25, 32, 33], intense: [13, 15, 19, 52, 75], calm: [10, 17, 18], upbeat: [3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 16, 26] };
  // "Sugar Rush travel" (~136 BPM, the loudest and punchiest) drives the designated Hard stages; country tracks remain mapped separately.
  // "Sugar Rush Kiss" (~89 BPM, the softest, "let it linger") floats over the Pacific islands; "Sugar Rush" ("now I can't sit still") for the rest.
  const SONG_FILES = { india: 'sugar-rush-india.mp3', aussie: 'sugar-rush-aussie.mp3', intense: 'sugar-rush-travel.m4a', calm: 'sugar-rush-kiss.m4a', upbeat: 'sugar-rush-song.m4a' };
  const SONG_FROM = 3;
  function songMood(level) {
    if (!(level >= SONG_FROM)) return null;
    for (const k in SONG_PLAN) if (SONG_PLAN[k].indexOf(level) >= 0) return k;
    return 'upbeat';
  }
  // Level 1 plays Shane's "Sugar Rush" song, level 2 plays "Sarah's Sugar Sprint";
  // from level 3 every level has one of Shane's songs (the usual loop is only a fallback).
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
    // 1.9.230 Super power combos (two specials swapped together): each has its own spoken lines.
    crisscross: ['Criss-cross crunch!', 'Stripes times two!', 'X marks the sweet!'], bigcross: ['Giant candy cross!', 'Cross my heart!', 'Mega cross!'],
    bigblast: ['Double wrap blast!', 'Kaboom of yum!', 'Double parcel pop!'], stripestorm: ['Stripes everywhere!', 'Rainbow stripes!', 'Stripe storm!'],
    wrapstorm: ['Wrapped rainbow!', 'Parcel party!', 'Gift wrap frenzy!'], sugarstorm: ['Sugar storm!', 'Clean sweep!', 'Sugar tornado!'],
    comeback: ['Still in it!', 'Not done yet!', 'Clutch play!', 'Comeback sweet!'],
    bub: ['Pop pop!', 'Fizz-tastic!', 'Bubble pop!', 'Popping candy!'],
    liq: ['Liquorice-free!', 'Unwrapped!', 'Untangled!', 'Black magic!']
  };
  const SAYING_COLORS = {
    cascade: '#ff3d8a', stripe: '#1aa7ff', wrap: '#ffb400', bomb: '#c84dff',
    jelly: '#e649cf', locks: '#ff8c2a', ice: '#3bc9ff', ings: '#ff6b2c',
    choco: '#c26a2d', gumdrop: '#ff2d55', lemon: '#ffd43b', combo: '#ff5ad5',
    crisscross: '#1aa7ff', bigcross: '#00b4d8', bigblast: '#ff8c00', stripestorm: '#c84dff', wrapstorm: '#ff3d8a', sugarstorm: '#7b2cbf',
    comeback: '#ff7a1a', bub: '#29b6f6', liq: '#6a3d9a'
  };
  const SAYING_VOICE = {
    cascade: 'great', stripe: 'great', wrap: 'sweetas', bomb: 'succulent',
    jelly: 'great', locks: 'great', ice: 'great', ings: 'sweetas',
    choco: 'great', gumdrop: 'great', lemon: 'great', combo: 'awesome',
    crisscross: 'awesome', bigcross: 'awesome', bigblast: 'awesome', stripestorm: 'succulent', wrapstorm: 'succulent', sugarstorm: 'succulent',
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
    if (s.combo && SAYINGS[s.combo]) kind = s.combo;
    else if (nFire >= 2) kind = 'combo';
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
    if (low && kind && !sayBig(kind)) kind = 'comeback';
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
      ] },
    // 1.9.232 Adelaide: the Hills behind the city, the Mall's Balls, a tram to Glenelg and balloons over the parklands.
    { n: 23, id: 'adelaide', place: 'Adelaide', title: 'City squares and the Hills, Adelaide', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#5cc2ff'], [0.65, '#c8ecff'], [1, '#fff6dc']]) + scGrad('ms', [[0, '#ffffff'], [0.5, '#c8d2dc'], [1, '#7c8a98']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(90, 120, 0.8, 0.85) + scCloud(300, 80, 0.6, 0.7) +
          '<circle cx="64" cy="96" r="30" fill="#fff3a0"/>' +
          '<path d="M0 470 C60 420 120 440 180 410 C240 380 300 420 390 400 L390 560 L0 560 Z" fill="#8cc06a"/>' +
          '<path d="M0 500 C70 470 150 490 220 466 C290 446 340 470 390 460 L390 580 L0 580 Z" fill="#6ea85a"/>' +
          [[30, 500, 30, 80], [70, 470, 26, 110], [104, 520, 34, 60], [146, 480, 24, 100], [178, 450, 30, 130], [216, 500, 28, 80], [252, 476, 32, 104], [292, 510, 26, 70], [326, 490, 34, 90]].map(function (b, i) {
            let w = '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" fill="' + (i % 2 ? '#f2e6d0' : '#e2d2b8') + '"/>';
            for (let yy = b[1] + 10; yy < b[1] + b[3] - 6; yy += 14) w += '<rect x="' + (b[0] + 4) + '" y="' + yy + '" width="' + (b[2] - 8) + '" height="4" fill="#7ec8ef" opacity=".7"/>';
            return w;
          }).join('') +
          '<rect y="580" width="390" height="80" fill="#9ad27a"/>' +
          [[40, 600], [120, 630], [200, 600], [280, 630], [350, 604]].map(function (t) { return '<rect x="' + (t[0] - 2) + '" y="' + t[1] + '" width="4" height="18" fill="#7a4a2a"/><circle cx="' + t[0] + '" cy="' + (t[1] - 4) + '" r="14" fill="#4f9a48"/>'; }).join('') +
          '<rect y="660" width="390" height="10" fill="#c9b79a"/><path d="M0 664 H390" stroke="#7a6a5a" stroke-width="2"/><path d="M0 670 H390" stroke="#7a6a5a" stroke-width="2"/>' +
          '<rect y="670" width="390" height="100" fill="#ead9bc"/>' +
          '<path d="M0 700 H390 M0 740 H390" stroke="#d8c4a2" stroke-width="2"/>' +
          '<rect x="186" y="752" width="18" height="14" fill="#8a7a6a"/>' +
          '<circle cx="195" cy="736" r="17" fill="url(#ms)"/><circle cx="195" cy="704" r="15" fill="url(#ms)"/>' +
          '<circle cx="189" cy="730" r="4" fill="#fff" opacity=".8"/><circle cx="190" cy="699" r="3.5" fill="#fff" opacity=".8"/>' +
          '<path d="M0 770 C90 758 190 780 290 764 C340 758 370 762 390 764 L390 844 L0 844 Z" fill="#7bbf5a"/>' +
          '<path d="M0 796 C100 784 200 806 300 792 C350 786 375 788 390 790 L390 844 L0 844 Z" fill="#62a84a"/>';
      },
      sprites: [
        { x: 10, y: 76, w: 26, cls: 'sc-roll', d: 10, svg: 'tram' },
        { x: 12, y: 10, w: 11, cls: 'sc-float', d: 10, svg: 'balloon', col: '#ff6fa8' },
        { x: 72, y: 16, w: 9, cls: 'sc-float', d: 12, dl: -5, svg: 'balloon', col: '#3fbf6a' },
        { x: 46, y: 84, w: 4, cls: 'sc-twinkle', d: 2, svg: 'glint' },
        { x: 40, y: 22, w: 8, cls: 'sc-drift', d: 11, svg: 'gull' },
        { x: 30, y: 4, w: 24, cls: 'sc-drift', d: 24, svg: 'cloud' }
      ] },
    // 1.9.232 Melbourne: laneway fairy lights at dusk, Flinders Street Station, a green-and-gold tram and the Yarra.
    { n: 24, id: 'melbourne', place: 'Melbourne', title: 'Laneway lights, Melbourne', night: true,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#1d1b4a'], [0.5, '#4a3a8a'], [0.85, '#d86a9a'], [1, '#ffb27a']]) + scGrad('yr', [[0, '#4a3a8a'], [1, '#1d1b4a']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' +
          [[30, 70], [90, 40], [160, 90], [250, 50], [320, 100], [360, 30]].map(function (t) { return '<circle cx="' + t[0] + '" cy="' + t[1] + '" r="1.6" fill="#fff"/>'; }).join('') +
          [[10, 400, 34, 200], [50, 440, 28, 160], [84, 360, 30, 240], [122, 420, 26, 180], [300, 380, 30, 220], [336, 430, 40, 170]].map(function (b) {
            let w = '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" fill="#2a2556"/>';
            for (let yy = b[1] + 12; yy < b[1] + b[3] - 10; yy += 18) w += '<rect x="' + (b[0] + 5) + '" y="' + yy + '" width="' + (b[2] - 10) + '" height="5" fill="#ffd77a" opacity=".55"/>';
            return w;
          }).join('') +
          '<rect x="244" y="250" width="34" height="350" fill="#2e2a60"/><rect x="244" y="250" width="34" height="40" fill="#ffd43b"/><path d="M244 250 L261 222 L278 250 Z" fill="#ffd43b"/>' +
          '<rect x="150" y="520" width="90" height="80" fill="#f2b24a"/><rect x="150" y="510" width="90" height="12" fill="#d8902a"/>' +
          '<path d="M170 510 Q195 450 220 510 Z" fill="#3a9a6a"/><rect x="192" y="440" width="6" height="20" fill="#3a9a6a"/>' +
          [0, 1, 2, 3].map(function (i) { return '<path d="M' + (160 + i * 20) + ' 600 v-34 a6 6 0 0 1 12 0 v34" fill="#7a3a1a"/>'; }).join('') +
          '<circle cx="195" cy="540" r="9" fill="#fff6c8"/><path d="M195 540 V534 M195 540 L199 542" stroke="#333" stroke-width="1.5"/>' +
          '<rect y="600" width="390" height="70" fill="#3a3466"/>' +
          '<path d="M0 640 H390" stroke="#8a84b8" stroke-width="2"/><path d="M0 652 H390" stroke="#8a84b8" stroke-width="2"/>' +
          '<path d="M0 560 Q60 590 120 562 Q180 592 240 564 Q300 594 390 566" stroke="#ffe7a0" stroke-width="1.5" fill="none" opacity=".8"/>' +
          [20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320, 350, 380].map(function (x, i) { return '<circle cx="' + x + '" cy="' + (566 + (i % 2 ? 20 : 6)) + '" r="4" fill="' + ['#ffd43b', '#ff6fa8', '#7fe0ff'][i % 3] + '"/>'; }).join('') +
          '<rect y="670" width="390" height="100" fill="url(#yr)"/>' +
          '<path d="M60 700 h50 M220 720 h60 M120 750 h40" stroke="#ffd77a" stroke-width="3" opacity=".45" stroke-linecap="round"/>' +
          '<path d="M0 770 C90 758 190 780 290 764 C340 758 370 762 390 764 L390 844 L0 844 Z" fill="#3a5a4a"/>' +
          '<path d="M0 796 C100 784 200 806 300 792 C350 786 375 788 390 790 L390 844 L0 844 Z" fill="#2e4a3c"/>';
      },
      sprites: [
        { x: 8, y: 70, w: 28, cls: 'sc-roll', d: 9, svg: 'tram' },
        { x: 10, y: 67, w: 3, cls: 'sc-twinkle', d: 1.6, svg: 'glint' },
        { x: 34, y: 69, w: 3, cls: 'sc-twinkle', d: 2.1, dl: -0.7, svg: 'glint' },
        { x: 62, y: 67, w: 3, cls: 'sc-twinkle', d: 1.9, dl: -1.1, svg: 'glint' },
        { x: 86, y: 69, w: 3, cls: 'sc-twinkle', d: 2.3, dl: -0.4, svg: 'glint' },
        { x: 30, y: 84, w: 14, cls: 'sc-bob', d: 3.4, svg: 'boat' },
        { x: 70, y: 6, w: 4, cls: 'sc-twinkle', d: 2.6, svg: 'glint' }
      ] },
    // 1.9.233 Brisbane: the river, the Story Bridge, a CityCat and jacarandas dropping purple blossom.
    { n: 25, id: 'brisbane', place: 'Brisbane', title: 'Story Bridge and jacarandas, Brisbane', night: false,
      art: function () {
        const truss = function (x0, x1, top, deck) {
          let w = '';
          for (let x = x0; x < x1; x += 12) w += '<path d="M' + x + ' ' + deck + ' L' + (x + 6) + ' ' + top(x + 6) + ' L' + (x + 12) + ' ' + deck + '" stroke="#5a6f8a" stroke-width="2" fill="none"/>';
          return w;
        };
        const arc = function (x) { return 470 + Math.pow((x - 195) / 150, 2) * 70; };
        return '<defs>' + scGrad('sk', [[0, '#7ccfff'], [0.6, '#d4f0ff'], [1, '#fff3dc']]) + scGrad('rv', [[0, '#5aa7c8'], [1, '#2f6f8f']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(300, 110, 0.8, 0.85) +
          '<circle cx="70" cy="110" r="32" fill="#fff3a0"/>' +
          [[150, 380, 30, 180], [184, 330, 26, 230], [214, 400, 34, 160], [252, 350, 28, 210], [284, 420, 30, 140], [318, 390, 36, 170]].map(function (b, i) {
            let w = '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" fill="' + (i % 2 ? '#e4ecf6' : '#cbd8ea') + '"/>';
            for (let yy = b[1] + 10; yy < b[1] + b[3] - 8; yy += 15) w += '<rect x="' + (b[0] + 4) + '" y="' + yy + '" width="' + (b[2] - 8) + '" height="4" fill="#7ec8ef" opacity=".7"/>';
            return w;
          }).join('') +
          '<path d="M0 560 C80 548 160 562 240 554 C300 548 350 556 390 560 L390 580 L0 580 Z" fill="#7cae5a"/>' +
          '<rect y="576" width="390" height="190" fill="url(#rv)"/>' +
          // Story Bridge: two towers, a cantilever truss rising to each tower, the deck across the river.
          '<rect x="96" y="470" width="10" height="120" fill="#4a5f7a"/><rect x="284" y="470" width="10" height="120" fill="#4a5f7a"/>' +
          '<path d="M20 560 Q60 548 101 470 Q195 545 289 470 Q330 548 370 560" stroke="#4a5f7a" stroke-width="5" fill="none"/>' +
          truss(24, 366, function (x) { return x < 101 ? 560 - (x - 20) * 1.0 : x > 289 ? 470 + (x - 289) * 1.1 : arc(x) + 6; }, 560) +
          '<rect x="10" y="558" width="370" height="7" fill="#3e526a"/>' +
          '<path d="M30 640 h40 M200 680 h60 M120 720 h40 M300 700 h40" stroke="#fff" stroke-width="3" opacity=".35" stroke-linecap="round"/>' +
          '<path d="M0 766 C90 752 190 774 290 758 C340 752 370 756 390 758 L390 844 L0 844 Z" fill="#7cbf5a"/>' +
          '<path d="M0 792 C100 780 200 802 300 788 C350 782 375 784 390 786 L390 844 L0 844 Z" fill="#66a84c"/>' +
          [[44, 760, 1], [346, 756, 0.9], [196, 790, 0.7]].map(function (t) {
            const x = t[0], y = t[1], k = t[2];
            return '<path d="M' + x + ' ' + y + ' v' + (-46 * k) + '" stroke="#6b4a2e" stroke-width="' + (6 * k) + '"/>' +
              '<circle cx="' + x + '" cy="' + (y - 60 * k) + '" r="' + (30 * k) + '" fill="#9b6fd8"/>' +
              '<circle cx="' + (x - 22 * k) + '" cy="' + (y - 46 * k) + '" r="' + (20 * k) + '" fill="#b48ae6"/>' +
              '<circle cx="' + (x + 22 * k) + '" cy="' + (y - 48 * k) + '" r="' + (22 * k) + '" fill="#8a5ccc"/>';
          }).join('') +
          '<ellipse cx="196" cy="836" rx="120" ry="8" fill="#b48ae6" opacity=".5"/>';
      },
      sprites: [
        { x: 20, y: 76, w: 24, cls: 'sc-glide', d: 11, svg: 'citycat' },
        { x: 8, y: 80, w: 4, cls: 'sc-float', d: 6, svg: 'petal' },
        { x: 30, y: 84, w: 3, cls: 'sc-float', d: 7.5, dl: -2, svg: 'petal' },
        { x: 82, y: 79, w: 4, cls: 'sc-float', d: 6.5, dl: -3, svg: 'petal' },
        { x: 60, y: 88, w: 3, cls: 'sc-float', d: 8, dl: -1, svg: 'petal' },
        { x: 50, y: 20, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' },
        { x: 10, y: 6, w: 24, cls: 'sc-drift', d: 22, svg: 'cloud' }
      ] },
    // 1.9.234 Port Moresby, Papua New Guinea: the Owen Stanley Range, Hanuabada stilt village, a lakatoi and a bird of paradise.
    { n: 26, id: 'portmoresby', place: 'Port Moresby', title: 'Stilt village and lagoon, Port Moresby', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#3fb4ff'], [0.6, '#b8ecff'], [1, '#fff6d6']]) + scGrad('lg', [[0, '#3fd0c8'], [1, '#1590a8']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(90, 100, 0.9, 0.9) + scCloud(300, 160, 0.7, 0.8) +
          '<circle cx="320" cy="90" r="34" fill="#fff3a0"/>' +
          '<path d="M0 520 L60 430 L110 480 L170 400 L230 470 L290 410 L350 470 L390 440 L390 600 L0 600 Z" fill="#5f9a7a"/>' +
          '<path d="M0 560 L70 490 L130 530 L200 470 L260 520 L330 480 L390 520 L390 610 L0 610 Z" fill="#4a8a5a"/>' +
          '<rect y="600" width="390" height="170" fill="url(#lg)"/>' +
          [[30, 600], [130, 590], [240, 604], [320, 596]].map(function (h, i) {
            const x = h[0], y = h[1];
            let w = '<path d="M' + (x + 4) + ' ' + (y + 30) + ' v40 M' + (x + 30) + ' ' + (y + 30) + ' v40 M' + (x + 56) + ' ' + (y + 30) + ' v40" stroke="#7a5236" stroke-width="3"/>';
            w += '<rect x="' + x + '" y="' + y + '" width="60" height="30" fill="' + ['#f2d29a', '#e8b878', '#f6dcaa', '#ecc488'][i] + '"/>';
            w += '<path d="M' + (x - 6) + ' ' + y + ' L' + (x + 30) + ' ' + (y - 22) + ' L' + (x + 66) + ' ' + y + ' Z" fill="#b8763a"/>';
            w += '<rect x="' + (x + 24) + '" y="' + (y + 12) + '" width="12" height="18" fill="#7a4a2a"/>';
            return w;
          }).join('') +
          '<path d="M90 640 H130 M200 644 H240 M300 640 H320" stroke="#a87a4a" stroke-width="5"/>' +
          '<path d="M20 700 q14 -5 28 0 M180 720 q14 -5 28 0 M300 690 q14 -5 28 0" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>' +
          '<path d="M0 768 C90 754 190 776 290 760 C340 754 370 758 390 760 L390 844 L0 844 Z" fill="#f4dca0"/>' +
          '<path d="M0 794 C100 782 200 804 300 790 C350 784 375 786 390 788 L390 844 L0 844 Z" fill="#ffe8b6"/>';
      },
      sprites: [
        { x: 2, y: 84, w: 16, cls: 'sc-sway', d: 4, svg: 'palm' },
        { x: 84, y: 82, w: 15, cls: 'sc-sway', d: 4.6, dl: -1.5, svg: 'palm' },
        { x: 40, y: 80, w: 18, cls: 'sc-bob', d: 3.4, svg: 'vaka' },
        { x: 60, y: 22, w: 12, cls: 'sc-float', d: 7, svg: 'paradise' },
        { x: 20, y: 30, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' },
        { x: 30, y: 6, w: 26, cls: 'sc-drift', d: 22, svg: 'cloud' }
      ] },
    // 1.9.235 Solomon Islands: Honiara lagoon and its reef ring.
    { n: 27, id: 'honiara', place: 'Solomon Islands', title: 'Reef ring, Honiara', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#3fb4ff'], [0.55, '#b8ecff'], [1, '#fff6d6']]) + scGrad('lg', [[0, '#2ec8c0'], [1, '#0e7898']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(80, 90, 0.9, 0.85) + scCloud(280, 140, 0.7, 0.75) +
          '<circle cx="300" cy="80" r="32" fill="#fff3a0"/>' +
          '<path d="M0 520 L80 470 L150 510 L230 450 L310 500 L390 460 L390 600 L0 600 Z" fill="#3f9a62"/>' +
          '<rect y="590" width="390" height="254" fill="url(#lg)"/>' +
          '<ellipse cx="195" cy="700" rx="120" ry="46" fill="none" stroke="#fff6c8" stroke-width="10" opacity=".85"/>' +
          '<ellipse cx="195" cy="700" rx="78" ry="28" fill="#7ee0ea" opacity=".55"/>' +
          '<path d="M0 790 C90 774 180 806 280 784 C340 774 370 780 390 782 L390 844 L0 844 Z" fill="#f6e2b0"/>';
      },
      sprites: [
        { x: 4, y: 78, w: 16, cls: 'sc-sway', d: 4, svg: 'palm' },
        { x: 82, y: 76, w: 15, cls: 'sc-sway', d: 4.4, dl: -1, svg: 'palm' },
        { x: 36, y: 78, w: 16, cls: 'sc-bob', d: 3.6, svg: 'vaka' },
        { x: 18, y: 28, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' },
        { x: 28, y: 6, w: 24, cls: 'sc-drift', d: 22, svg: 'cloud' }
      ] },
    // 1.9.235 Vanuatu: Port Vila waterfront, with a quiet green cone behind the town.
    { n: 28, id: 'vila', place: 'Vanuatu', title: 'Waterfront, Port Vila', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#5ec4ff'], [0.6, '#d8f4ff'], [1, '#fff4d0']]) + scGrad('lg', [[0, '#49c8d8'], [1, '#147a98']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(70, 110, 0.8, 0.8) +
          '<circle cx="80" cy="96" r="30" fill="#fff3a0"/>' +
          '<path d="M250 560 L310 360 L370 560 Z" fill="#6aaa62"/>' +
          '<path d="M286 430 L310 372 L328 424 Z" fill="#8fd0ea" opacity=".8"/>' +
          '<rect y="560" width="390" height="150" fill="url(#lg)"/>' +
          '<path d="M0 700 H390" stroke="#c9894a" stroke-width="10"/>' +
          '<rect x="40" y="640" width="70" height="60" fill="#f2d2a0"/><path d="M34 640 L75 608 L116 640 Z" fill="#c46a3a"/>' +
          '<rect x="150" y="650" width="64" height="50" fill="#f6e0b4"/><path d="M144 650 L182 620 L220 650 Z" fill="#d4844a"/>' +
          '<rect x="56" y="662" width="14" height="18" fill="#7a4a2a"/><rect x="168" y="666" width="12" height="16" fill="#7a4a2a"/>' +
          '<path d="M0 760 C100 746 200 774 300 752 C350 744 375 748 390 750 L390 844 L0 844 Z" fill="#f4d8a4"/>';
      },
      sprites: [
        { x: 78, y: 80, w: 14, cls: 'sc-sway', d: 4.2, svg: 'palm' },
        { x: 20, y: 74, w: 16, cls: 'sc-bob', d: 3.2, svg: 'vaka' },
        { x: 40, y: 24, w: 8, cls: 'sc-drift', d: 11, svg: 'gull' },
        { x: 8, y: 8, w: 26, cls: 'sc-drift', d: 20, svg: 'cloud' }
      ] },
    // 1.9.235 Fiji: a beach bure and white sand.
    { n: 29, id: 'fiji', place: 'Fiji', title: 'Bula beach, Fiji', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#49b8ff'], [0.5, '#c6f0ff'], [1, '#fff8dc']]) + scGrad('lg', [[0, '#3ad0d4'], [1, '#1288a4']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(240, 100, 0.85, 0.8) +
          '<circle cx="310" cy="86" r="34" fill="#fff3a0"/>' +
          '<rect y="560" width="390" height="180" fill="url(#lg)"/>' +
          '<path d="M40 620 v70 M90 620 v70 M140 620 v70" stroke="#8a5a32" stroke-width="4"/>' +
          '<path d="M20 620 Q90 540 160 620 Z" fill="#c9843c"/>' +
          '<path d="M28 618 Q90 560 152 618" fill="none" stroke="#a86a28" stroke-width="6"/>' +
          '<rect x="70" y="640" width="22" height="36" fill="#6a3e22"/>' +
          '<path d="M0 740 C80 724 160 756 250 732 C320 718 360 726 390 730 L390 844 L0 844 Z" fill="#fff4d2"/>' +
          '<path d="M0 790 C120 776 220 804 320 784 C360 776 380 780 390 782 L390 844 L0 844 Z" fill="#ffe8b4"/>';
      },
      sprites: [
        { x: 2, y: 78, w: 16, cls: 'sc-sway', d: 3.8, svg: 'palm' },
        { x: 70, y: 74, w: 18, cls: 'sc-sway', d: 4.5, dl: -1.2, svg: 'palm' },
        { x: 48, y: 70, w: 16, cls: 'sc-bob', d: 3.5, svg: 'vaka' },
        { x: 22, y: 18, w: 8, cls: 'sc-drift', d: 9, svg: 'gull' }
      ] },
    // 1.9.235 New Caledonia: Nouméa bay, red roofs and a small lighthouse.
    { n: 30, id: 'noumea', place: 'New Caledonia', title: 'Bay and lighthouse, Nouméa', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#6ec8f0'], [0.55, '#dff6ff'], [1, '#fff2d4']]) + scGrad('lg', [[0, '#3aa8d8'], [1, '#166090']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(100, 120, 0.8, 0.75) +
          '<circle cx="70" cy="90" r="28" fill="#fff3a0"/>' +
          '<path d="M0 500 L70 460 L140 500 L210 450 L280 500 L350 470 L390 490 L390 580 L0 580 Z" fill="#6aaa72"/>' +
          '<rect y="560" width="390" height="200" fill="url(#lg)"/>' +
          '<rect x="250" y="470" width="18" height="90" fill="#f4f0e4" stroke="#d8d0c0" stroke-width="2"/>' +
          '<path d="M246 470 h26 l-4 -16 h-18 Z" fill="#e05848"/>' +
          '<rect x="268" y="500" width="22" height="10" fill="#fff6a8"/>' +
          '<rect x="60" y="500" width="46" height="36" fill="#f6e2c4"/><path d="M56 500 L83 478 L110 500 Z" fill="#d85040"/>' +
          '<rect x="120" y="508" width="40" height="30" fill="#f3d7b0"/><path d="M116 508 L140 488 L164 508 Z" fill="#e06048"/>' +
          '<path d="M0 760 C100 744 200 776 300 754 C350 746 376 750 390 752 L390 844 L0 844 Z" fill="#f3d7a6"/>';
      },
      sprites: [
        { x: 8, y: 80, w: 14, cls: 'sc-sway', d: 4, svg: 'palm' },
        { x: 30, y: 76, w: 18, cls: 'sc-bob', d: 3.8, svg: 'vaka' },
        { x: 55, y: 22, w: 8, cls: 'sc-drift', d: 12, svg: 'gull' },
        { x: 16, y: 6, w: 24, cls: 'sc-drift', d: 22, svg: 'cloud' }
      ] },
    // 1.9.235 Indonesia: Bali rice terraces and a split temple gate above the beach.
    { n: 31, id: 'bali', place: 'Indonesia', title: 'Temple gate and beach, Bali', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#4eb6ff'], [0.5, '#d2f3ff'], [1, '#fff6d8']]) + scGrad('lg', [[0, '#2ec4c8'], [1, '#0e7090']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(260, 90, 0.75, 0.8) +
          '<circle cx="300" cy="78" r="32" fill="#fff3a0"/>' +
          '<path d="M0 430 H390 V470 H0 Z" fill="#7dba58"/>' +
          '<path d="M0 470 H390 V510 H0 Z" fill="#69a84a"/>' +
          '<path d="M0 510 H390 V548 H0 Z" fill="#8ec86a"/>' +
          '<path d="M20 430 H370 M20 470 H370 M20 510 H370" stroke="#f2e2a0" stroke-width="3" opacity=".7"/>' +
          '<rect x="70" y="548" width="28" height="90" fill="#f4e6c8" stroke="#e0c898" stroke-width="2"/>' +
          '<rect x="292" y="548" width="28" height="90" fill="#f4e6c8" stroke="#e0c898" stroke-width="2"/>' +
          '<path d="M60 548 h48 l-6 -22 h-36 Z" fill="#d85040"/><path d="M282 548 h48 l-6 -22 h-36 Z" fill="#d85040"/>' +
          '<rect y="640" width="390" height="120" fill="url(#lg)"/>' +
          '<path d="M0 760 C90 744 190 778 290 756 C340 746 370 752 390 754 L390 844 L0 844 Z" fill="#fff1cc"/>';
      },
      sprites: [
        { x: 2, y: 82, w: 14, cls: 'sc-sway', d: 4, svg: 'palm' },
        { x: 84, y: 80, w: 14, cls: 'sc-sway', d: 4.6, dl: -1, svg: 'palm' },
        { x: 40, y: 78, w: 16, cls: 'sc-bob', d: 3.4, svg: 'vaka' },
        { x: 20, y: 16, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' }
      ] },
    // 1.9.243 Canberra: a round lake, a low white building and a flag, with autumn trees.
    { n: 32, id: 'canberra', place: 'Canberra', title: 'Lake and flag, Canberra', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#7ec4f2'], [0.6, '#e7f6ff'], [1, '#fff6e4']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(70, 90, 0.8, 0.8) +
          '<circle cx="310" cy="80" r="30" fill="#fff3a0"/>' +
          '<path d="M0 520 H390 V640 H0 Z" fill="#8fbe6a"/>' +
          '<ellipse cx="195" cy="700" rx="150" ry="48" fill="#3aa0d0"/>' +
          '<ellipse cx="195" cy="692" rx="120" ry="28" fill="#7ec8ef" opacity=".7"/>' +
          '<rect x="168" y="470" width="70" height="36" fill="#f7f4ee" stroke="#e0d8cc" stroke-width="2"/>' +
          '<path d="M160 470 H246 L230 448 H176 Z" fill="#f4f7fb"/>' +
          '<rect x="200" y="400" width="4" height="70" fill="#6a7a88"/>' +
          '<path d="M204 404 h28 l-4 16 h-24 Z" fill="#2a6a88"/>' +
          '<circle cx="70" cy="500" r="16" fill="#e07a32"/><circle cx="92" cy="488" r="12" fill="#d4a017"/>' +
          '<circle cx="320" cy="496" r="15" fill="#c45a28"/><circle cx="300" cy="484" r="11" fill="#e08a20"/>' +
          '<path d="M0 800 C100 784 200 816 300 792 C350 784 376 788 390 790 L390 844 L0 844 Z" fill="#7aaa58"/>';
      },
      sprites: [
        { x: 18, y: 20, w: 8, cls: 'sc-drift', d: 11, svg: 'gull' },
        { x: 48, y: 8, w: 24, cls: 'sc-drift', d: 24, svg: 'cloud' }
      ] },
    // 1.9.243 Hobart: a dark mountain behind a cool harbour and stone warehouses.
    { n: 33, id: 'hobart', place: 'Hobart', title: 'Mountain and wharf, Hobart', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#8eb4d4'], [0.55, '#d5e6f2'], [1, '#f3eee4']]) + scGrad('se', [[0, '#4d88b0'], [1, '#2a5878']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(240, 70, 0.7, 0.75) +
          '<path d="M40 560 L150 300 L210 420 L250 340 L360 560 Z" fill="#5d6b78"/>' +
          '<path d="M150 300 L178 360 L128 352 Z" fill="#f4f7fb"/>' +
          '<rect y="620" width="390" height="90" fill="url(#se)"/>' +
          '<rect x="20" y="560" width="54" height="70" fill="#c4a882"/><rect x="80" y="548" width="48" height="82" fill="#b89470"/>' +
          '<rect x="136" y="566" width="60" height="64" fill="#d2b48c"/><rect x="204" y="552" width="46" height="78" fill="#c2a078"/>' +
          '<rect x="28" y="578" width="12" height="16" fill="#6a8aaa"/><rect x="90" y="568" width="12" height="16" fill="#6a8aaa"/>' +
          '<rect x="148" y="582" width="14" height="16" fill="#6a8aaa"/><rect x="214" y="572" width="12" height="16" fill="#6a8aaa"/>' +
          '<path d="M0 780 C90 766 190 798 300 772 C350 762 376 768 390 770 L390 844 L0 844 Z" fill="#6e9a52"/>' +
          scPine(40, 820, 50) + scPine(340, 824, 46);
      },
      sprites: [
        { x: 12, y: 72, w: 16, cls: 'sc-roll', d: 12, svg: 'boat' },
        { x: 36, y: 18, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' },
        { x: 8, y: 6, w: 26, cls: 'sc-drift', d: 26, svg: 'cloud' }
      ] },
    { n: 34, id: 'saigon', place: 'Vietnam', title: 'Lanterns on the river, Saigon', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#ffb07a'], [0.45, '#ffd6a8'], [1, '#fff1d6']]) + scGrad('rv', [[0, '#3a88b0'], [1, '#1d5878']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(60, 80, 0.7, 0.7) +
          '<circle cx="300" cy="90" r="28" fill="#ffe08a"/>' +
          '<path d="M0 500 H390 V640 H0 Z" fill="#7aaa58"/>' +
          '<rect y="560" width="390" height="70" fill="url(#rv)"/>' +
          '<path d="M40 560 h36 l-8 -70 h-20 Z" fill="#e24b4b"/><path d="M120 560 h32 l-6 -56 h-20 Z" fill="#f0c040"/>' +
          '<path d="M210 560 h40 l-8 -80 h-24 Z" fill="#e24b4b"/><path d="M300 560 h30 l-6 -48 h-18 Z" fill="#f28a2e"/>' +
          '<path d="M0 760 C90 746 200 782 300 756 C350 746 376 752 390 754 L390 844 L0 844 Z" fill="#6e9a52"/>';
      },
      sprites: [{ x: 8, y: 70, w: 16, cls: 'sc-roll', d: 11, svg: 'boat' }, { x: 40, y: 16, w: 8, cls: 'sc-drift', d: 9, svg: 'gull' }] },
    { n: 35, id: 'nightmarket', place: 'Malaysia', title: 'Night market, Kuala Lumpur', night: true,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#1c2450'], [0.6, '#3a3a78'], [1, '#6a4a88']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' +
          '<circle cx="70" cy="80" r="3" fill="#fff"/><circle cx="140" cy="50" r="2" fill="#fff"/><circle cx="250" cy="70" r="2" fill="#fff"/><circle cx="320" cy="40" r="3" fill="#fff"/>' +
          '<rect x="150" y="280" width="28" height="280" fill="#d8d2ea"/><rect x="210" y="280" width="28" height="280" fill="#c8c0e0"/>' +
          '<path d="M146 280 h36 l-4 -40 h-28 Z" fill="#f2f4ff"/><path d="M206 280 h36 l-4 -40 h-28 Z" fill="#f2f4ff"/>' +
          '<path d="M20 520 h70 l-8 -36 h-54 Z" fill="#ff5a7a"/><path d="M280 530 h80 l-8 -40 h-64 Z" fill="#ffb020"/>' +
          '<rect y="560" width="390" height="284" fill="#2a2348"/>';
      },
      sprites: [{ x: 6, y: 40, w: 10, cls: 'sc-twinkle', d: 2.2, svg: 'gull' }] },
    { n: 36, id: 'bangkok', place: 'Thailand', title: 'Temple by the river, Bangkok', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#8fd0f2'], [0.55, '#fff0c8'], [1, '#ffe0a8']]) + scGrad('rv', [[0, '#3a90c0'], [1, '#1d6088']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(240, 70, 0.75, 0.8) +
          '<circle cx="80" cy="86" r="26" fill="#ffe08a"/>' +
          '<path d="M0 500 H390 V620 H0 Z" fill="#8fbe6a"/>' +
          '<path d="M150 500 L195 360 L240 500 Z" fill="#f0c040"/><rect x="178" y="430" width="34" height="70" fill="#f4e2a0"/>' +
          '<path d="M120 500 L155 420 L190 500 Z" fill="#e8a030"/><path d="M200 500 L245 400 L290 500 Z" fill="#e8a030"/>' +
          '<rect y="620" width="390" height="80" fill="url(#rv)"/>' +
          '<path d="M0 780 C100 764 200 800 300 772 C350 762 376 768 390 770 L390 844 L0 844 Z" fill="#6e9a52"/>';
      },
      sprites: [{ x: 10, y: 68, w: 16, cls: 'sc-roll', d: 12, svg: 'boat' }, { x: 70, y: 14, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' }] },
    { n: 37, id: 'yangon', place: 'Myanmar', title: 'Golden pagoda, Yangon', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#f2c27a'], [0.5, '#ffe6b0'], [1, '#fff6e0']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(40, 80, 0.7, 0.75) +
          '<circle cx="300" cy="78" r="26" fill="#fff3a0"/>' +
          '<path d="M0 560 H390 V844 H0 Z" fill="#7aaa58"/>' +
          '<path d="M150 560 L195 300 L240 560 Z" fill="#f0c040"/>' +
          '<path d="M168 400 h54 l-6 -28 h-42 Z" fill="#ffe08a"/><circle cx="195" cy="292" r="10" fill="#fff6c8"/>' +
          '<rect x="40" y="500" width="16" height="60" fill="#6aaa48"/><rect x="320" y="510" width="16" height="50" fill="#6aaa48"/>';
      },
      sprites: [{ x: 18, y: 20, w: 8, cls: 'sc-drift', d: 11, svg: 'gull' }, { x: 60, y: 8, w: 24, cls: 'sc-drift', d: 22, svg: 'cloud' }] },
    { n: 38, id: 'delhi', place: 'India', title: 'Sweets by the gate, Delhi', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#ffb070'], [0.5, '#ffd8a0'], [1, '#fff0d4']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(200, 60, 0.8, 0.7) +
          '<circle cx="70" cy="84" r="28" fill="#ffe08a"/>' +
          '<path d="M0 520 H390 V844 H0 Z" fill="#c4a06a"/>' +
          '<rect x="70" y="360" width="250" height="160" fill="#f2d2a0" stroke="#e0b888" stroke-width="3"/>' +
          '<path d="M60 360 H330 L310 300 H80 Z" fill="#e8a050"/>' +
          '<path d="M160 520 L195 430 L230 520 Z" fill="#f0c040"/>' +
          '<rect x="40" y="470" width="18" height="50" fill="#6aaa48"/><rect x="330" y="480" width="18" height="40" fill="#6aaa48"/>';
      },
      sprites: [{ x: 8, y: 16, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' }, { x: 50, y: 6, w: 26, cls: 'sc-drift', d: 24, svg: 'cloud' }] },
    // 1.9.245 Kathmandu: the Himalaya behind a white stupa and colourful prayer flags.
    { n: 39, id: 'kathmandu', place: 'Nepal', title: 'Stupa and prayer flags, Kathmandu', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#78b9e8'], [0.55, '#e5f4ff'], [1, '#fff1d2']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(80, 80, 0.75, 0.8) +
          '<path d="M0 500 L65 360 L110 430 L178 250 L240 420 L300 320 L390 500 Z" fill="#8296a4"/>' +
          '<path d="M178 250 L200 300 L158 292 Z M300 320 L322 366 L280 358 Z" fill="#f8fbff"/>' +
          '<path d="M0 520 H390 V844 H0 Z" fill="#8fb85c"/>' +
          '<rect x="145" y="555" width="100" height="100" rx="48" fill="#f4e8d0"/><path d="M130 558 Q195 495 260 558 Z" fill="#f3d36a"/>' +
          '<rect x="181" y="515" width="28" height="42" fill="#f7e8c8"/><path d="M195 515 L195 450 M195 452 L232 466 L195 480 M195 480 L229 493 L195 505" stroke="#b54048" stroke-width="3" fill="#e45b52"/>' +
          '<path d="M0 760 C100 744 200 778 300 752 C350 744 376 750 390 752 L390 844 L0 844 Z" fill="#6d984d"/>';
      },
      sprites: [{ x: 48, y: 48, w: 8, cls: 'sc-bob', d: 4, emoji: '🎏' }, { x: 70, y: 12, w: 8, cls: 'sc-drift', d: 11, svg: 'gull' }] },
    // 1.9.245 Dhaka: river ferries crossing in front of a lively city skyline.
    { n: 40, id: 'dhaka', place: 'Bangladesh', title: 'River lights, Dhaka', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#e9a77a'], [0.55, '#ffe0b8'], [1, '#fff4dc']]) + scGrad('rv', [[0, '#4c9fbd'], [1, '#245d80']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(280, 90, 0.75, 0.8) +
          '<circle cx="68" cy="92" r="28" fill="#ffe08a"/>' +
          '<path d="M0 540 H390 V844 H0 Z" fill="#85a85e"/>' +
          '<rect x="38" y="370" width="46" height="170" fill="#d6a06d"/><rect x="92" y="420" width="54" height="120" fill="#b98068"/>' +
          '<rect x="156" y="340" width="54" height="200" fill="#d3b17d"/><rect x="220" y="395" width="48" height="145" fill="#a87e65"/><rect x="276" y="355" width="72" height="185" fill="#d0a370"/>' +
          '<path d="M0 570 Q80 550 160 570 T320 570 T480 570 V760 H0 Z" fill="url(#rv)"/>' +
          '<path d="M72 635 H190 L178 662 H88 Z" fill="#f8f0df"/><rect x="104" y="612" width="48" height="23" fill="#e75c53"/><path d="M114 612 L128 592 L145 612 Z" fill="#f3d46e"/>' +
          '<path d="M0 770 C90 754 190 782 290 758 C340 750 376 754 390 756 L390 844 L0 844 Z" fill="#689750"/>';
      },
      sprites: [{ x: 20, y: 70, w: 18, cls: 'sc-roll', d: 12, svg: 'boat' }, { x: 12, y: 16, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' }] },
    // 1.9.245 Colombo: the old lighthouse, Indian Ocean surf and palms.
    { n: 41, id: 'colombo', place: 'Sri Lanka', title: 'Lighthouse by the sea, Colombo', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#71c4f0'], [0.55, '#e2f7ff'], [1, '#fff4d9']]) + scGrad('oc', [[0, '#3fc2cf'], [1, '#126789']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(220, 84, 0.8, 0.8) +
          '<circle cx="310" cy="82" r="30" fill="#fff0a0"/>' +
          '<path d="M0 560 Q60 530 120 560 T240 560 T360 560 T480 560 V844 H0 Z" fill="url(#oc)"/>' +
          '<path d="M0 610 Q75 592 150 610 T300 610 T450 610 M0 665 Q70 647 140 665 T280 665 T420 665" stroke="#b9f4ed" stroke-width="4" fill="none" opacity=".8"/>' +
          '<rect x="260" y="350" width="42" height="210" fill="#fff0d2" stroke="#d9c39e" stroke-width="3"/><path d="M252 352 H310 L300 320 H262 Z" fill="#d84a4a"/><path d="M258 320 H304 L296 304 H266 Z" fill="#fff2d4"/>' +
          '<rect x="270" y="386" width="22" height="38" fill="#ffdf69" opacity=".8"/><path d="M0 760 C100 746 200 780 300 754 C350 744 376 750 390 752 L390 844 L0 844 Z" fill="#e9cd91"/>';
      },
      sprites: [{ x: 8, y: 72, w: 14, cls: 'sc-sway', d: 4, svg: 'palm' }, { x: 22, y: 76, w: 18, cls: 'sc-bob', d: 4, svg: 'vaka' }, { x: 70, y: 14, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' }] },
    // 1.9.245 Singapore: the bay, skyline and garden Supertrees.
    { n: 42, id: 'singapore', place: 'Singapore', title: 'Garden city lights, Singapore', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#89c9ef'], [0.6, '#e1f4f5'], [1, '#fff4da']]) + scGrad('bay', [[0, '#4db9ca'], [1, '#176e93']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(70, 76, 0.8, 0.8) +
          '<circle cx="310" cy="86" r="28" fill="#fff1a0"/>' +
          '<rect x="46" y="410" width="42" height="150" fill="#9fb8b9"/><rect x="94" y="360" width="54" height="200" fill="#b9c9c4"/><rect x="154" y="430" width="42" height="130" fill="#93afb4"/>' +
          '<rect x="218" y="350" width="28" height="210" rx="12" fill="#e8eee5"/><rect x="250" y="350" width="28" height="210" rx="12" fill="#e8eee5"/><rect x="282" y="350" width="28" height="210" rx="12" fill="#e8eee5"/><path d="M214 348 Q264 322 314 348 L310 362 H218 Z" fill="#61a66b"/>' +
          '<rect y="560" width="390" height="190" fill="url(#bay)"/><path d="M0 615 Q70 600 140 615 T280 615 T420 615 M20 672 Q90 657 160 672 T300 672" stroke="#a9e7df" stroke-width="4" fill="none" opacity=".75"/>' +
          '<path d="M54 760 V610 M56 650 Q15 620 32 584 Q66 600 56 650 M56 666 Q94 628 98 592 Q60 604 56 666 M180 760 V600 M182 646 Q142 616 155 582 Q188 602 182 646 M182 662 Q218 620 226 590 Q190 602 182 662" stroke="#4d854f" stroke-width="8" fill="none" stroke-linecap="round"/>' +
          '<circle cx="55" cy="584" r="24" fill="#80c878"/><circle cx="100" cy="592" r="25" fill="#8cd180"/><circle cx="158" cy="582" r="22" fill="#9bd98c"/><circle cx="226" cy="590" r="24" fill="#7bc472"/>' +
          '<path d="M0 770 C90 754 190 780 290 756 C340 748 376 752 390 754 L390 844 L0 844 Z" fill="#68a250"/>';
      },
      sprites: [{ x: 20, y: 72, w: 16, cls: 'sc-glide', d: 11, svg: 'citycat' }, { x: 16, y: 12, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' }] },
    // 1.9.247 Cambodia: riverfront lights and the Royal Palace in Phnom Penh.
    { n: 43, id: 'phnompenh', place: 'Cambodia', title: 'Riverfront lights, Phnom Penh', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#ffb47c'], [0.55, '#ffe3b5'], [1, '#fff4dc']]) + scGrad('rv', [[0, '#44a8c2'], [1, '#245f83']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(90, 86, 0.75, 0.8) +
          '<circle cx="312" cy="88" r="28" fill="#ffe08a"/>' +
          '<path d="M0 550 H390 V650 H0 Z" fill="#82ad63"/>' +
          '<path d="M70 550 V430 L100 382 L130 430 V550 M150 550 V395 L195 330 L240 395 V550 M260 550 V438 L288 390 L316 438 V550" fill="#f1d49a" stroke="#c98f52" stroke-width="4"/>' +
          '<path d="M92 390 L100 360 L108 390 M183 340 L195 292 L207 340 M280 398 L288 368 L296 398" fill="#d84c47"/>' +
          '<rect y="630" width="390" height="156" fill="url(#rv)"/>' +
          '<path d="M0 684 Q60 666 120 684 T240 684 T360 684 T480 684 M10 730 Q80 714 150 730 T290 730" stroke="#b9eee4" stroke-width="4" fill="none" opacity=".8"/>' +
          '<path d="M0 780 C90 764 190 790 290 770 C340 762 376 766 390 768 L390 844 L0 844 Z" fill="#e7cf9b"/>';
      },
      sprites: [{ x: 14, y: 74, w: 17, cls: 'sc-roll', d: 12, svg: 'boat' }, { x: 40, y: 18, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' }] },
    // Manila Bay at dusk: ferry silhouettes and colourful star lanterns.
    { n: 44, id: 'manila', place: 'Philippines', title: 'Lanterns over Manila Bay', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#f58e83'], [0.52, '#ffd2a1'], [1, '#fff0d0']]) + scGrad('bay', [[0, '#42b5c3'], [1, '#17628a']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(250, 76, 0.8, 0.75) +
          '<circle cx="78" cy="96" r="30" fill="#ffe08a"/>' +
          '<path d="M0 560 H390 V640 H0 Z" fill="#8da967"/>' +
          '<rect x="36" y="426" width="48" height="134" fill="#8daab0"/><rect x="92" y="376" width="54" height="184" fill="#a8b8b5"/><rect x="154" y="445" width="44" height="115" fill="#788f9d"/><rect x="206" y="398" width="56" height="162" fill="#a1ada8"/><rect x="270" y="430" width="74" height="130" fill="#879da3"/>' +
          '<rect y="630" width="390" height="174" fill="url(#bay)"/>' +
          '<path d="M74 692 H190 L176 714 H90 Z" fill="#fff0d7"/><rect x="112" y="672" width="42" height="20" fill="#e95b50"/><path d="M122 672 L134 650 L148 672 Z" fill="#f5d76b"/>' +
          '<path d="M0 740 Q80 724 160 740 T320 740 T480 740" stroke="#b5eee5" stroke-width="4" fill="none" opacity=".8"/>' +
          '<path d="M0 790 C90 772 190 800 290 778 C340 770 376 774 390 776 L390 844 L0 844 Z" fill="#e8d3a3"/>';
      },
      sprites: [{ x: 28, y: 72, w: 18, cls: 'sc-roll', d: 12, svg: 'boat' }, { x: 62, y: 28, w: 9, cls: 'sc-bob', d: 4.2, emoji: '⭐' }] },
    // 1.9.247 Laos: the golden That Luang stupa above Vientiane's riverside.
    { n: 45, id: 'vientiane', place: 'Laos', title: 'Golden stupa, Vientiane', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#81c9ec'], [0.55, '#e5f5f3'], [1, '#fff0c9']]) + scGrad('rv', [[0, '#45b8bd'], [1, '#1c7087']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(74, 82, 0.8, 0.75) +
          '<circle cx="312" cy="84" r="29" fill="#fff0a0"/>' +
          '<path d="M0 556 H390 V650 H0 Z" fill="#82ad5e"/>' +
          '<path d="M110 556 Q110 520 140 510 Q145 458 170 445 Q180 415 195 385 Q210 415 220 445 Q245 458 250 510 Q280 520 280 556 Z" fill="#f4c84e" stroke="#d99d31" stroke-width="4"/>' +
          '<path d="M168 465 Q195 440 222 465 M145 520 Q195 500 245 520 M125 545 H265" stroke="#fff1a7" stroke-width="5" fill="none"/>' +
          '<rect y="650" width="390" height="150" fill="url(#rv)"/>' +
          '<path d="M0 692 Q70 676 140 692 T280 692 T420 692 M30 744 Q100 730 170 744 T310 744" stroke="#afe9dd" stroke-width="4" fill="none"/>' +
          '<path d="M0 788 C90 770 190 802 290 780 C340 772 376 776 390 778 L390 844 L0 844 Z" fill="#81aa59"/>';
      },
      sprites: [{ x: 20, y: 74, w: 18, cls: 'sc-roll', d: 12, svg: 'boat' }, { x: 26, y: 18, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' }] },
    // 1.9.247 Bhutan: Tashichho Dzong framed by the Himalayan foothills.
    { n: 46, id: 'thimphu', place: 'Bhutan', title: 'Dzong garden, Thimphu', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#8ac8e6'], [0.6, '#e9f4ec'], [1, '#fff0d4']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(280, 76, 0.75, 0.8) +
          '<path d="M0 520 L56 420 L104 474 L170 330 L230 450 L292 360 L390 510 V600 H0 Z" fill="#718e8d"/>' +
          '<path d="M170 330 L190 372 L152 365 Z M292 360 L310 404 L276 395 Z" fill="#f7fbff"/>' +
          '<path d="M0 560 Q95 526 190 560 T390 552 V844 H0 Z" fill="#82ad61"/>' +
          '<rect x="104" y="456" width="182" height="118" fill="#c5573d" stroke="#9d4035" stroke-width="4"/><rect x="124" y="476" width="142" height="98" fill="#f0d4a2"/>' +
          '<path d="M94 458 H296 L278 420 H112 Z" fill="#d69b41"/><path d="M150 420 L195 392 L240 420 Z" fill="#bd4b3e"/>' +
          '<rect x="146" y="500" width="20" height="32" fill="#6b91a1"/><rect x="184" y="500" width="22" height="32" fill="#6b91a1"/><rect x="224" y="500" width="20" height="32" fill="#6b91a1"/>' +
          '<path d="M0 774 C90 758 190 786 290 766 C340 758 376 762 390 764 L390 844 L0 844 Z" fill="#6e984d"/>';
      },
      sprites: [{ x: 40, y: 68, w: 9, cls: 'sc-bob', d: 4.5, emoji: '🎏' }, { x: 16, y: 15, w: 8, cls: 'sc-drift', d: 10, svg: 'gull' }] },
    // 1.9.247 Pakistan: the Faisal Mosque and Margalla Hills above Islamabad.
    { n: 47, id: 'islamabad', place: 'Pakistan', title: 'Garden crescent, Islamabad', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#73bce8'], [0.55, '#e0f1f0'], [1, '#fff1d0']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(80, 82, 0.8, 0.75) +
          '<circle cx="310" cy="86" r="28" fill="#fff0a0"/>' +
          '<path d="M0 510 L55 420 L104 478 L164 348 L230 480 L290 390 L390 510 V620 H0 Z" fill="#718f78"/>' +
          '<path d="M82 590 L195 408 L308 590 Z" fill="#f2ead8" stroke="#d7c9ac" stroke-width="4"/>' +
          '<path d="M112 590 L195 446 L278 590 Z" fill="#d7e2de"/>' +
          '<path d="M122 575 L195 450 L268 575" stroke="#f9f8ec" stroke-width="6" fill="none"/>' +
          '<rect x="116" y="530" width="8" height="66" fill="#eee8d8"/><rect x="266" y="530" width="8" height="66" fill="#eee8d8"/>' +
          '<path d="M0 620 H390 V780 H0 Z" fill="#78aa5b"/>' +
          '<path d="M0 690 Q95 668 195 690 T390 690 M0 732 Q95 710 195 732 T390 732" stroke="#b7d67a" stroke-width="5" fill="none"/>' +
          '<path d="M0 780 C90 764 190 792 290 770 C340 762 376 766 390 768 L390 844 L0 844 Z" fill="#64934c"/>';
      },
      sprites: [{ x: 74, y: 76, w: 12, cls: 'sc-sway', d: 4.5, svg: 'palm' }, { x: 10, y: 16, w: 8, cls: 'sc-drift', d: 11, svg: 'gull' }] },
    // 1.9.249 Five soft illustrated scenes continue north and west along the Silk Road.
    { n: 48, id: 'kabul', place: 'Afghanistan', title: 'Mountain market, Kabul', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#76bde2'], [0.55, '#e7e8d4'], [1, '#ffe2b1']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(275, 82, 0.8, 0.8) + '<circle cx="68" cy="105" r="31" fill="#fff0a4"/>' +
          '<path d="M0 500 L46 418 L90 478 L150 360 L202 474 L270 390 L326 480 L372 420 L390 454 V640 H0 Z" fill="#8b927e"/>' +
          '<path d="M0 580 Q100 546 196 576 T390 564 V844 H0 Z" fill="#98b66f"/>' +
          '<path d="M0 594 H390 V760 H0 Z" fill="#d99b68"/>' +
          '<path d="M26 594 V520 H88 V594 M103 594 V490 H174 V594 M204 594 V526 H270 V594 M286 594 V508 H366 V594" fill="#f3d1a0" stroke="#b97755" stroke-width="5"/>' +
          '<path d="M147 594 V480 Q147 452 165 452 Q183 452 183 480 V594 Z" fill="#55a6b5" stroke="#f7e7c9" stroke-width="5"/>' +
          '<path d="M157 452 Q165 424 173 452 Z" fill="#3e8f9f"/><path d="M0 760 Q90 742 190 764 T390 754 V844 H0 Z" fill="#789c55"/>' +
          '<path d="M44 844 Q76 774 104 844 M300 844 Q330 778 360 844" stroke="#e7bd72" stroke-width="8" fill="none"/>';
      },
      sprites: [{ x: 74, y: 72, w: 9, cls: 'sc-bob', d: 4.5, emoji: '🪻' }, { x: 18, y: 18, w: 8, cls: 'sc-drift', d: 12, svg: 'gull' }] },
    { n: 49, id: 'tehran', place: 'Iran', title: 'Rose garden, Tehran', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#75c5eb'], [0.55, '#f1edda'], [1, '#ffe7bd']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(88, 76, 0.85, 0.8) +
          '<path d="M0 506 L50 444 L112 474 L174 370 L240 480 L302 410 L390 496 V640 H0 Z" fill="#93a28c"/>' +
          '<path d="M0 590 Q95 554 195 586 T390 578 V844 H0 Z" fill="#87b56b"/>' +
          '<path d="M76 610 V500 Q76 420 195 404 Q314 420 314 500 V610 Z" fill="#f3dbad" stroke="#d2a866" stroke-width="6"/>' +
          '<path d="M116 610 V520 Q116 470 195 454 Q274 470 274 520 V610 Z" fill="#62b7c3"/>' +
          '<path d="M100 501 Q195 352 290 501 Q242 470 195 464 Q148 470 100 501 Z" fill="#3e9cae" stroke="#e6d4a7" stroke-width="7"/>' +
          '<path d="M160 610 V552 Q195 504 230 552 V610 Z" fill="#f7e8c9"/>' +
          '<path d="M0 712 Q98 684 195 712 T390 706 V844 H0 Z" fill="#6f9e56"/>' +
          '<path d="M0 772 Q98 738 195 772 T390 766" stroke="#f1d798" stroke-width="10" fill="none"/><circle cx="52" cy="718" r="8" fill="#e75b77"/><circle cx="338" cy="704" r="9" fill="#e75b77"/>';
      },
      sprites: [{ x: 16, y: 74, w: 9, cls: 'sc-bob', d: 4.8, emoji: '🌹' }, { x: 78, y: 72, w: 9, cls: 'sc-bob', d: 5.2, emoji: '🌷' }] },
    { n: 50, id: 'tashkent', place: 'Uzbekistan', title: 'Tile courtyard, Tashkent', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#84c8e8'], [0.6, '#f3ecd4'], [1, '#ffdfb4']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(290, 78, 0.75, 0.85) +
          '<path d="M0 574 H390 V844 H0 Z" fill="#d8b67f"/>' +
          '<path d="M48 574 V458 H342 V574 Z" fill="#e8cb9b" stroke="#b98952" stroke-width="6"/>' +
          '<path d="M82 574 V490 Q82 440 125 440 Q168 440 168 490 V574 Z M222 574 V490 Q222 440 265 440 Q308 440 308 490 V574 Z" fill="#48aabb" stroke="#f1d9a7" stroke-width="7"/>' +
          '<path d="M62 462 Q125 356 188 462 Q150 435 125 435 Q100 435 62 462 Z M202 462 Q265 356 328 462 Q290 435 265 435 Q240 435 202 462 Z" fill="#398fa6" stroke="#f3dca9" stroke-width="6"/>' +
          '<path d="M170 574 V510 Q195 478 220 510 V574 Z" fill="#f8e8c4"/>' +
          '<path d="M95 505 l30 -24 30 24 -30 24 Z M235 505 l30 -24 30 24 -30 24 Z" fill="#f5d079"/>' +
          '<path d="M0 744 L195 640 L390 744 V844 H0 Z" fill="#9fc875"/><path d="M195 640 V844 M0 744 H390" stroke="#f4dfae" stroke-width="9"/>';
      },
      sprites: [{ x: 20, y: 17, w: 8, cls: 'sc-drift', d: 13, svg: 'gull' }, { x: 78, y: 75, w: 9, cls: 'sc-bob', d: 4.4, emoji: '🟦' }] },
    { n: 51, id: 'astana', place: 'Kazakhstan', title: 'Steppe lights, Astana', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#5faed8'], [0.55, '#d7edf1'], [1, '#ffe1ab']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(90, 78, 0.8, 0.8) + '<circle cx="322" cy="114" r="35" fill="#fff0aa"/>' +
          '<path d="M0 554 Q90 520 190 552 T390 544 V844 H0 Z" fill="#94bd72"/>' +
          '<path d="M0 632 Q98 610 196 632 T390 626 V844 H0 Z" fill="#6cb3c4"/>' +
          '<path d="M0 678 Q95 650 195 678 T390 670 V844 H0 Z" fill="#62a9b9" opacity=".8"/>' +
          '<path d="M46 632 V480 H82 V632 M100 632 V430 H140 V632 M160 632 V500 H196 V632 M220 632 V450 H266 V632 M288 632 V492 H338 V632" fill="#e9dfc4" stroke="#b2c4c0" stroke-width="4"/>' +
          '<path d="M237 450 Q244 365 252 450 Z" fill="#f5c74e"/><rect x="240" y="448" width="24" height="158" rx="11" fill="#f8d45f" stroke="#fff0b0" stroke-width="5"/>' +
          '<path d="M0 760 Q100 736 196 760 T390 754 V844 H0 Z" fill="#729b58"/><path d="M38 703 Q100 690 154 703 M268 706 Q324 692 370 705" stroke="#fff" stroke-width="4" fill="none" opacity=".65"/>';
      },
      sprites: [{ x: 78, y: 75, w: 10, cls: 'sc-bob', d: 4.6, emoji: '⭐' }, { x: 16, y: 17, w: 8, cls: 'sc-drift', d: 11, svg: 'gull' }] },
    { n: 52, id: 'beijing', place: 'China', title: 'Great Wall, Beijing', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#81c6e7'], [0.58, '#f1e9d2'], [1, '#ffdda8']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(270, 74, 0.8, 0.8) + '<circle cx="70" cy="104" r="30" fill="#fff0aa"/>' +
          '<path d="M0 520 L60 404 L110 470 L176 344 L236 462 L310 374 L390 492 V640 H0 Z" fill="#8caa83"/>' +
          '<path d="M0 600 Q95 568 194 600 T390 590 V844 H0 Z" fill="#9dbc78"/>' +
          '<path d="M0 604 Q54 536 106 576 T210 570 T312 554 T390 570" stroke="#c94e3e" stroke-width="21" fill="none"/>' +
          '<path d="M0 596 Q54 528 106 568 T210 562 T312 546 T390 562" stroke="#f1d28a" stroke-width="8" fill="none"/>' +
          '<path d="M35 570 V526 H67 V570 M154 568 V520 H186 V568 M290 555 V506 H322 V555" fill="#c84d3d" stroke="#f0d28b" stroke-width="5"/>' +
          '<path d="M25 526 L51 504 L78 526 Z M144 520 L170 498 L196 520 Z M280 506 L306 484 L332 506 Z" fill="#a94037"/>' +
          '<path d="M0 768 Q100 744 196 768 T390 762 V844 H0 Z" fill="#729b57"/>';
      },
      sprites: [{ x: 18, y: 19, w: 8, cls: 'sc-drift', d: 12, svg: 'gull' }, { x: 82, y: 69, w: 9, cls: 'sc-bob', d: 4.2, emoji: '🏮' }] },
    { n: 53, id: 'xian', place: "Xi'an", title: 'Terracotta lane, Xi’an', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#78c4e8'], [0.58, '#f7e8ca'], [1, '#ffd0a4']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(286, 76, 0.78, 0.8) +
          '<path d="M0 520 L58 420 L112 476 L174 350 L236 470 L308 392 L390 502 V640 H0 Z" fill="#9b9b82"/>' +
          '<rect y="590" width="390" height="254" fill="#b9b07f"/>' +
          '<path d="M0 590 V500 H75 V590 M315 590 V500 H390 V590" fill="#cf754c" stroke="#a6503a" stroke-width="5"/>' +
          '<path d="M72 548 V476 Q195 390 318 476 V548 Z" fill="#d76b47" stroke="#a84b3a" stroke-width="6"/>' +
          '<path d="M112 548 V500 Q195 430 278 500 V548 Z" fill="#f0bf73"/>' +
          '<path d="M0 706 Q98 682 196 706 T390 700 V844 H0 Z" fill="#8baa61"/>' +
          '<path d="M30 760 H360 M44 784 H346" stroke="#f3d59a" stroke-width="7" opacity=".8"/>';
      },
      sprites: [{ x: 12, y: 70, w: 8, cls: 'sc-bob', d: 4.4, emoji: '🏮' }, { x: 76, y: 17, w: 8, cls: 'sc-drift', d: 11, svg: 'gull' }] },
    { n: 54, id: 'chengdu', place: 'Chengdu', title: 'Panda garden, Chengdu', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#a8def0'], [0.5, '#e8f1c9'], [1, '#ffe5ba']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' +
          '<path d="M0 494 Q84 434 164 484 T326 470 T440 486 V650 H0 Z" fill="#75a979"/>' +
          '<path d="M0 570 Q90 540 192 570 T390 560 V844 H0 Z" fill="#9cca78"/>' +
          '<path d="M48 610 V330 M82 600 V290 M322 606 V310 M354 618 V362" stroke="#438957" stroke-width="14" stroke-linecap="round"/>' +
          '<path d="M40 390 Q18 358 20 330 M88 356 Q110 328 110 298 M316 378 Q290 350 290 320 M356 414 Q380 385 382 360" stroke="#75bd75" stroke-width="10" fill="none"/>' +
          '<circle cx="196" cy="572" r="100" fill="#fffaf0" stroke="#dfdfd6" stroke-width="6"/>' +
          '<circle cx="124" cy="506" r="32" fill="#252b2b"/><circle cx="268" cy="506" r="32" fill="#252b2b"/>' +
          '<ellipse cx="164" cy="570" rx="22" ry="30" transform="rotate(28 164 570)" fill="#252b2b"/><ellipse cx="228" cy="570" rx="22" ry="30" transform="rotate(-28 228 570)" fill="#252b2b"/>' +
          '<circle cx="166" cy="570" r="7" fill="#fff"/><circle cx="226" cy="570" r="7" fill="#fff"/><ellipse cx="196" cy="607" rx="15" ry="10" fill="#252b2b"/>' +
          '<path d="M178 625 Q196 643 214 625" stroke="#8d5c55" stroke-width="4" fill="none" stroke-linecap="round"/>';
      },
      sprites: [{ x: 76, y: 70, w: 12, cls: 'sc-bob', d: 4.2, emoji: '🐼' }, { x: 12, y: 20, w: 8, cls: 'sc-drift', d: 12, svg: 'softcloud' }] },
    { n: 55, id: 'chongqing', place: 'Chongqing', title: 'Riverside lights, Chongqing', night: true,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#232b61'], [0.58, '#62518d'], [1, '#f29b9e']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' +
          '<circle cx="316" cy="116" r="42" fill="#fff0bd" opacity=".84"/>' +
          '<path d="M0 536 L46 466 L84 500 L132 424 L180 488 L236 420 L280 482 L332 438 L390 516 V680 H0 Z" fill="#475273"/>' +
          '<path d="M0 610 H390 V844 H0 Z" fill="#394b77"/>' +
          '<path d="M0 742 Q68 674 132 732 T258 720 T390 732 V844 H0 Z" fill="#377cb5"/>' +
          '<path d="M0 770 Q72 702 140 762 T270 748 T390 758" stroke="#a8e8ff" stroke-width="5" fill="none" opacity=".75"/>' +
          '<path d="M20 610 V520 H62 V610 M70 610 V478 H112 V610 M128 610 V548 H164 V610 M230 610 V500 H270 V610 M278 610 V458 H320 V610 M328 610 V526 H370 V610" fill="#4b4c76" stroke="#f3a8b9" stroke-width="3"/>' +
          '<path d="M40 540 V554 M90 500 V514 M248 520 V536 M298 480 V496 M348 548 V562" stroke="#ffe29a" stroke-width="6" stroke-linecap="round"/>' +
          '<path d="M182 600 V444 Q196 414 210 444 V600" fill="#7bd4dc" stroke="#fff1c6" stroke-width="4"/>';
      },
      sprites: [{ x: 80, y: 68, w: 15, cls: 'sc-roll', d: 10, svg: 'boat' }, { x: 12, y: 16, w: 7, cls: 'sc-bob', d: 4.8, emoji: '✨' }] },
    { n: 56, id: 'shanghai', place: 'Shanghai', title: 'Bund skyline, Shanghai', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#9ed9ee'], [0.55, '#f5e6d8'], [1, '#ffcaa7']]) + scGrad('rv', [[0, '#56b9dc'], [1, '#2e87bf']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(90, 80, 0.85, 0.8) + '<circle cx="322" cy="120" r="35" fill="#fff1ba"/>' +
          '<rect y="622" width="390" height="222" fill="url(#rv)"/>' +
          '<path d="M0 620 H390" stroke="#f8e3c1" stroke-width="8"/>' +
          '<path d="M18 620 V470 H74 V620 M82 620 V510 H126 V620 M136 620 V430 H168 V620 M216 620 V490 H250 V620 M260 620 V455 H292 V620 M300 620 V512 H370 V620" fill="#e8d0b8" stroke="#fff0dc" stroke-width="4"/>' +
          '<path d="M176 620 V360 H210 V620" fill="#d9d5cf" stroke="#fff1da" stroke-width="4"/><path d="M176 360 L193 320 L210 360 Z" fill="#e8b76b"/>' +
          '<path d="M193 346 V576 M177 400 H209 M177 460 H209 M177 520 H209" stroke="#88c5d4" stroke-width="5"/>' +
          '<circle cx="193" cy="404" r="15" fill="#ee7b79" stroke="#fff0d8" stroke-width="4"/><circle cx="193" cy="452" r="10" fill="#f3b97b" stroke="#fff0d8" stroke-width="3"/>' +
          '<path d="M0 704 Q80 688 156 704 T312 700 T430 704" stroke="#a6e8f5" stroke-width="5" fill="none" opacity=".75"/>';
      },
      sprites: [{ x: 74, y: 70, w: 9, cls: 'sc-bob', d: 4.5, emoji: '✨' }, { x: 12, y: 17, w: 8, cls: 'sc-drift', d: 12, svg: 'gull' }] },
    { n: 57, id: 'guangzhou', place: 'Guangzhou', title: 'Pearl River blossom, Guangzhou', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#92d5ee'], [0.58, '#ffefce'], [1, '#ffc2a3']]) + scGrad('rv', [[0, '#6cc8dc'], [1, '#328eb8']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(280, 78, 0.8, 0.8) +
          '<path d="M0 600 Q84 560 170 600 T340 586 T430 604 V710 H0 Z" fill="#8fb77d"/>' +
          '<rect y="680" width="390" height="164" fill="url(#rv)"/>' +
          '<path d="M0 680 H390" stroke="#f7d8aa" stroke-width="8"/>' +
          '<path d="M42 680 V526 H96 V680 M104 680 V480 H154 V680 M256 680 V500 H300 V680 M306 680 V542 H364 V680" fill="#f3d6bb" stroke="#fff0d8" stroke-width="4"/>' +
          '<path d="M180 680 Q195 620 190 542 Q186 474 204 414 Q222 474 218 542 Q214 620 230 680 Z" fill="#f5a7a0" stroke="#fff0db" stroke-width="5"/>' +
          '<path d="M196 414 Q204 362 212 414 M198 468 L210 468 M194 526 L216 526 M190 586 L220 586" stroke="#fff3d9" stroke-width="5" fill="none" stroke-linecap="round"/>' +
          '<path d="M0 730 Q90 712 178 730 T350 728 T430 730" stroke="#c5f1ef" stroke-width="5" fill="none" opacity=".8"/>' +
          [[44, 472], [74, 444], [320, 456], [352, 480]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="9" fill="#ff92ad"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="#fff7d1"/>'; }).join('');
      },
      sprites: [{ x: 12, y: 70, w: 9, cls: 'sc-bob', d: 4.2, emoji: '🌸' }, { x: 78, y: 17, w: 8, cls: 'sc-drift', d: 12, svg: 'gull' }] },
    { n: 71, id: 'koror', place: 'Koror', title: 'Rock Islands lagoon, Koror', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#8bd9f3'], [0.5, '#d8f2e8'], [1, '#ffe4b8']]) + scGrad('sea', [[0, '#51c8d4'], [1, '#1686b6']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(286, 78, 0.82, 0.8) +
          '<circle cx="315" cy="152" r="42" fill="#fff0ab" opacity=".88"/>' +
          '<path d="M0 486 Q50 440 98 478 T194 468 T294 470 T390 454 V570 H0 Z" fill="#72bb91"/>' +
          '<rect y="510" width="390" height="334" fill="url(#sea)"/>' +
          '<path d="M0 594 Q56 570 114 594 T232 590 T390 586" stroke="#baf4e8" stroke-width="8" fill="none" opacity=".8"/>' +
          '<path d="M20 510 Q32 438 72 420 Q98 424 108 510 Z M116 520 Q128 408 170 390 Q202 398 210 520 Z M233 514 Q246 432 282 416 Q312 423 321 514 Z M318 520 Q330 460 354 448 Q376 452 386 520 Z" fill="#59a878" stroke="#fff2cf" stroke-width="6"/>' +
          '<path d="M60 510 Q70 477 88 456 M155 520 Q169 475 185 437 M270 514 Q280 478 298 453" stroke="#c9efb0" stroke-width="7" fill="none" stroke-linecap="round"/>' +
          '<ellipse cx="190" cy="682" rx="118" ry="22" fill="none" stroke="#a9f2df" stroke-width="5" opacity=".72"/>';
      },
      sprites: [{ x: 64, y: 75, w: 12, cls: 'sc-drift', d: 15, svg: 'boat' }, { x: 82, y: 60, w: 8, cls: 'sc-bob', d: 5, svg: 'fish' }, { x: 14, y: 20, w: 9, cls: 'sc-drift', d: 12, svg: 'gull' }] },
    { n: 72, id: 'palikir', place: 'Palikir', title: 'Fern falls, Palikir', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#a5dbf1'], [0.55, '#d8f0dc'], [1, '#ffe2b8']]) + scGrad('water', [[0, '#d7fff2'], [1, '#4daec7']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(70, 82, 0.8, 0.8) +
          '<path d="M0 542 L72 408 L132 474 L204 322 L278 474 L334 390 L410 516 V670 H0 Z" fill="#5c9c79"/>' +
          '<path d="M0 608 Q72 558 142 604 T286 594 T420 598 V844 H0 Z" fill="#3f895f"/>' +
          '<path d="M195 348 Q187 420 198 470 Q208 522 193 570 Q184 600 194 634 L220 634 Q208 596 220 558 Q235 514 220 464 Q209 414 218 348 Z" fill="url(#water)" stroke="#effff2" stroke-width="5"/>' +
          '<path d="M158 632 Q202 607 245 634 L273 690 Q214 711 151 690 Z" fill="#58b7bf" stroke="#bdf5e7" stroke-width="6"/>' +
          '<path d="M44 580 V404 M86 556 V372 M318 574 V410 M348 590 V442" stroke="#387c51" stroke-width="13" stroke-linecap="round"/>' +
          '<path d="M42 450 Q18 420 22 390 M88 424 Q114 395 112 368 M315 454 Q293 426 296 399 M350 482 Q376 452 378 424" stroke="#77bd79" stroke-width="10" fill="none"/>' +
          '<path d="M0 734 Q92 700 192 734 T390 728 V844 H0 Z" fill="#a7cf83"/>';
      },
      sprites: [{ x: 52, y: 76, w: 10, cls: 'sc-bob', d: 4.7, emoji: '💧' }, { x: 83, y: 19, w: 9, cls: 'sc-drift', d: 13, svg: 'gull' }] },
    { n: 73, id: 'majuro', place: 'Majuro', title: 'Blue atoll passage, Majuro', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#85d4f1'], [0.55, '#e1f5dd'], [1, '#ffdcb0']]) + scGrad('sea', [[0, '#62d7dc'], [1, '#198db8']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(282, 76, 0.8, 0.8) +
          '<circle cx="82" cy="144" r="35" fill="#fff1b7" opacity=".86"/>' +
          '<rect y="480" width="390" height="364" fill="url(#sea)"/>' +
          '<path d="M0 520 Q70 474 140 512 T280 508 T420 500 V574 H0 Z" fill="#59b77f"/>' +
          '<path d="M0 588 Q75 570 148 592 T292 588 T410 586" fill="none" stroke="#b8f4e8" stroke-width="8"/>' +
          '<path d="M30 520 Q94 490 147 520 L125 546 Q76 553 30 520 Z M245 520 Q300 488 370 514 L344 543 Q294 552 245 520 Z" fill="#f3dca4" stroke="#fff3d4" stroke-width="4"/>' +
          '<path d="M66 519 V468 M66 470 Q37 448 20 464 M66 470 Q93 445 111 461 M317 519 V466 M317 468 Q291 446 274 461 M317 468 Q343 445 361 460" stroke="#8a5a2a" stroke-width="5" fill="none" stroke-linecap="round"/>' +
          '<path d="M0 710 Q100 690 196 712 T390 704" stroke="#d2ffff" stroke-width="6" fill="none" opacity=".75"/>';
      },
      sprites: [{ x: 38, y: 73, w: 13, cls: 'sc-drift', d: 16, svg: 'vaka' }, { x: 80, y: 67, w: 9, cls: 'sc-bob', d: 5.2, svg: 'turtle' }, { x: 12, y: 18, w: 8, cls: 'sc-drift', d: 12, svg: 'gull' }] },
    { n: 74, id: 'yaren', place: 'Yaren', title: 'Limestone coast, Yaren', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#9bdcf3'], [0.52, '#e7efd9'], [1, '#ffd6ad']]) + scGrad('sea', [[0, '#57cad8'], [1, '#277da8']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(78, 82, 0.78, 0.8) +
          '<rect y="498" width="390" height="346" fill="url(#sea)"/>' +
          '<path d="M0 574 Q64 548 128 574 T256 570 T390 568 V670 H0 Z" fill="#f4d89f"/>' +
          '<path d="M0 572 L25 500 L54 474 L75 490 L96 442 L128 461 L147 414 L171 450 L197 428 L218 482 L243 490 L266 454 L292 470 L320 425 L347 446 L376 420 L390 426 V578 Z" fill="#d7a26b" stroke="#fff0d2" stroke-width="6"/>' +
          '<path d="M20 542 L50 520 L71 533 L94 492 L117 506 L145 460 L165 500 L191 470 L214 520 L240 529 L266 495 L288 510 L315 466 L340 494 L366 458" fill="none" stroke="#f5d9a0" stroke-width="8" stroke-linejoin="round"/>' +
          '<path d="M0 628 Q97 604 193 628 T390 620" stroke="#c1f5ec" stroke-width="8" fill="none"/>' +
          '<path d="M0 730 Q80 710 160 730 T320 726 T420 728 V844 H0 Z" fill="#dfc488"/>';
      },
      sprites: [{ x: 22, y: 68, w: 11, cls: 'sc-bob', d: 4.4, emoji: '🐚' }, { x: 78, y: 17, w: 9, cls: 'sc-drift', d: 12, svg: 'gull' }] },
    { n: 75, id: 'south-tarawa', place: 'South Tarawa', title: 'Lagoon crossing, South Tarawa', night: false,
      art: function () {
        return '<defs>' + scGrad('sk', [[0, '#87d9f4'], [0.52, '#e4f6df'], [1, '#ffe3b4']]) + scGrad('lagoon', [[0, '#5bd6df'], [1, '#178cb8']]) + '</defs>' +
          '<rect width="390" height="844" fill="url(#sk)"/>' + scCloud(278, 78, 0.8, 0.8) +
          '<circle cx="86" cy="145" r="38" fill="#fff0af" opacity=".9"/>' +
          '<rect y="476" width="390" height="368" fill="url(#lagoon)"/>' +
          '<path d="M0 520 Q62 477 122 508 T250 502 T390 492 V562 H0 Z" fill="#4eac73"/>' +
          '<path d="M0 596 Q94 576 185 598 T390 590" fill="none" stroke="#c3fff0" stroke-width="9"/>' +
          '<path d="M0 648 Q98 624 194 648 T390 640" fill="none" stroke="#a4f2e6" stroke-width="5" opacity=".85"/>' +
          '<path d="M35 518 V456 M35 458 Q10 435 2 448 M35 458 Q60 432 76 447 M326 516 V452 M326 454 Q302 432 286 446 M326 454 Q351 430 372 446" stroke="#85572d" stroke-width="5" fill="none" stroke-linecap="round"/>' +
          '<path d="M141 710 H250 L238 730 H154 Z" fill="#e65352" stroke="#fff2cf" stroke-width="4"/><path d="M196 710 V610 L238 710 Z" fill="#fff2cf" stroke="#df7a75" stroke-width="3"/><path d="M194 642 L159 710 H194 Z" fill="#ffd6e3"/>' +
          '<path d="M0 760 Q98 736 196 760 T390 752" fill="none" stroke="#d8ffff" stroke-width="7" opacity=".76"/>';
      },
      sprites: [{ x: 64, y: 73, w: 12, cls: 'sc-drift', d: 15, svg: 'vaka' }, { x: 83, y: 61, w: 9, cls: 'sc-bob', d: 4.8, svg: 'fish' }, { x: 14, y: 18, w: 8, cls: 'sc-drift', d: 12, svg: 'gull' }] }
  ];
  // 1.9.234 "Some clouds": every daytime outdoor scene gets one more soft cloud drifting slowly across the top of the sky
  // (pink-gold at sunset). Night scenes keep their clear skies.
  const SUNSET_SCENES = ['samoa', 'perth'];
  SCENES.forEach(function (sc, i) {
    if (sc.night) return;
    (sc.sprites = sc.sprites || []).push({ x: i % 2 ? 58 : 6, y: 3 + (i % 3) * 3, w: 30, cls: 'sc-drift', d: 34 + (i % 4) * 4, dl: -(i % 5) * 5, svg: 'softcloud', col: SUNSET_SCENES.indexOf(sc.id) >= 0 ? '#ffd2e0' : '#ffffff' });
  });
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
    // 1.9.233 Brisbane: a blue-and-white CityCat and a jacaranda petal.
    // 1.9.234 A soft, see-through cloud (colour from the sprite) and a bird of paradise.
    softcloud: '<svg viewBox="-46 -30 92 48" opacity=".7"><ellipse cx="0" cy="0" rx="42" ry="13" fill="currentColor"/><ellipse cx="-17" cy="-8" rx="18" ry="14" fill="currentColor"/><ellipse cx="14" cy="-12" rx="22" ry="17" fill="currentColor"/></svg>',
    paradise: '<svg viewBox="0 0 60 50"><path d="M24 22 C14 30 8 44 4 48 C14 42 22 36 28 28 Z" fill="#ffb43b"/><path d="M26 24 C22 34 22 44 24 50 C28 42 30 34 30 26 Z" fill="#ffd36a"/><ellipse cx="32" cy="20" rx="10" ry="7" fill="#8a3a1a"/><circle cx="41" cy="14" r="5" fill="#ffe44a"/><circle cx="43" cy="13" r="1.2" fill="#222"/><path d="M46 14 l6 1 -6 2 Z" fill="#9ad0ff"/><path d="M38 18 q4 4 8 3" stroke="#2a9a5a" stroke-width="2" fill="none"/></svg>',
    citycat: '<svg viewBox="0 0 100 36"><path d="M4 22 H96 L90 30 H10 Z" fill="#1d5fae"/><path d="M8 30 H40 M60 30 H92" stroke="#0e3a6e" stroke-width="3"/><rect x="18" y="10" width="64" height="12" rx="4" fill="#fff"/><rect x="22" y="13" width="56" height="5" fill="#3d8bfd"/><rect x="40" y="4" width="22" height="7" rx="2" fill="#fff"/></svg>',
    petal: '<svg viewBox="-10 -10 20 20"><ellipse cx="0" cy="0" rx="8" ry="5" fill="#a77ae0" transform="rotate(30)"/><ellipse cx="0" cy="0" rx="4" ry="2" fill="#d6c0f5" transform="rotate(30)"/></svg>',
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
  function sceneFor(n) { return SCENES.find(function (sc) { return sc.n === (n | 0); }) || SCENES[0]; }
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
  const SESSION_UNLOCK_TAPS = 5;
  function createSessionLevelAccess() {
    let allOpen = false, unlimitedLives = false, taps = 0;
    return {
      allows(n, savedOpen) { return allOpen || n <= savedOpen; },
      tap() {
        if (!allOpen) {
          taps = Math.min(SESSION_UNLOCK_TAPS, taps + 1);
        }
        return { unlocked: allOpen, taps };
      },
      authorizeOwner(isOwner) {
        if (!allOpen && isOwner && taps >= SESSION_UNLOCK_TAPS) { allOpen = true; unlimitedLives = true; }
        return { unlocked: allOpen, taps };
      },
      clearTaps() { if (!allOpen) taps = 0; },
      reset() { allOpen = false; unlimitedLives = false; taps = 0; },
      hasUnlimitedLives() { return unlimitedLives; },
      isUnlocked() { return allOpen; }
    };
  }
  function shuffleBooster(st) {
    if (!st || st.over || st.tutorial) return false;
    shuffle(st.board, st.rand, st.kinds, st.mask);
    return true;
  }

  root.SugarRush = { N, KINDS, PTS, LEVEL, LEVELS, BONUS, NAMES, HOLE, LEVEL_INTROS, levelIntro, TUTORIAL_STEPS, TUTORIALS, tutorialFor, TUTORIAL_KEY, sameTutMove, MAP_W, MAP_H, MAP_X0, MAP_VW, MAP_Y0, MAP_VH, worldXY, nzToWorld, PACIFIC_ISLES, MAP_STOPS, FUTURE_STOPS, MECHANICS, MECHANIC_FIRST, newsFor, LEVEL_REWORK_285, ingTotal, fusesOn, endOfMove, NZ_PROJ, nzXY, WHANGAREI_INSET, insetXY, pacXY, ausXY, westPacXY, LV_COUNT, lvId, levelIds, stopId, LEGACY_220_IDS, migrateProg, stopForLevel, icingPath, beenPath, aheadPath, nzMapSvg, RACE_ICONS, raceIcon, isRaceIcon, raceStars, raceStop, allocateIcon, rankRacers, stackOffsets, racerFirst, rng, fromRows, toRows, findRuns, groups, specialFor, resolve, collapse, applyStep, validSwap, findMove, hasMove, shuffle, newBoard, newGame, play, grantPlayOutSpecial, runPlayOut, fireSpecialAt, settleBoard, listSpecials, listPlayOutCandies, starsFor, starsOf, goalsMet, jellyLeft, iceLeft, locksLeft, bubLeft, liqLeft, flowLeft, chocoLeft, tickTimer, spreadLiq, beltDirection, shiftBelts, LIQ_IDLE, goalCounts, cloneState, bestMove, hintMoveFor, tryBeat, lvOf, isHole, isCandy, isIng, isBlock,
    allowed: () => true, // 1.9.228 open to every family member
    SAY_REST_MS, SAY_BIG, sayBig, COMBO_KINDS, COMBO_BONUS, comboKind, comboSwap, adjacentSpecials, isSpecialTile, HARD_LINES, hardLine, CANDY_STYLES, candySfxPlan, playCandySfx, SAY_SHOW_MS, SAY_AFTER_MS, sayShowGap, SPEAK_GAP, SPEAK_PITCH, SPEAK_RATE, SPEAK_VOL, pickSpeechVoice, speechGender, speakWorthy, SAY_SPRITES, SAY_CLIPS, sayClip, nextSayVoice, SCALE, SFX_MAX_HZ, SFX_LP, SFX_NOTE, SFX_MASTER, VOICE_VOL, CHIME_VOL, CHIME_DUR, VOICE_GAP, BGM_VOL, BGM_DUCK, END_VOL, MENU_VOL, XF,
    VOICE_FILES, VOICE_RANK, MEDIA_HASH, mediaUrl, gameTrack, SONG_PLAN, SONG_FILES, SONG_FROM, songMood, attachSfxBus, playTone, playChime, playMovesWarnChime, playClip, voiceForStep,
    SAYINGS, SAYING_COLORS, SAYING_VOICE, sayingKind, pickSaying, sayingColor, MOVES_WARN_AT, MOVES_WARN_MS, HINT_IDLE_MS, HINT_REPEAT_MS,
    SPARKLE_MIN_MS, SPARKLE_MAX_MS, SPARKLE_MAX, SPARKLE_MAX_REDUCE, SHIMMER_MS, sparkleCap, sparkleEase, shimmerAt, drawStarGlint, drawCandyShine,
    SCENES, sceneFor, sceneSvg, sceneSprites, STREAK_STEP, STREAK_MAX_TIER, STREAK_NAMES, streakStepGain, streakGain, streakNext, streakTier, streakFill, shakeLevel,
    BOOSTERS, EXTRA_MOVES, normBoosters, addPrize, takeBooster, SPIN_PRIZES, nzDay, canSpin, spinPick, spinAngle, prizeAt, chestReward, boosterInfo, hammerAt, shuffleBooster, LIVES_MAX, LIFE_MS, regenLives, changeLives, nextLifeMs, mmss };
  root.SugarRush.MAP_COUNTRIES = MAP_COUNTRIES;
  root.SugarRush.POSTCARD_COUNT = POSTCARD_COUNT;
  root.SugarRush.POSTCARD_COUNTRIES = POSTCARD_COUNTRIES;
  root.SugarRush.POSTCARD_ICONS = POSTCARD_ICONS;
  root.SugarRush.normalizePostcardProgress = normalizePostcardProgress;
  root.SugarRush.addPostcardPiece = addPostcardPiece;
  root.SugarRush.countryForLevel = countryForLevel;
  root.SugarRush.journeyPath = journeyPath;
  root.SugarRush.createSessionLevelAccess = createSessionLevelAccess;

  if (!root.document) return;
  const doc = root.document;
  const $ = id => doc.getElementById(id);
  const ls = {
    get(k, f) { try { const v = root.localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch (e) { return f; } },
    set(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  if (!root.SugarRush.allowed()) { $('soon').hidden = false; return; }
  const sessionLevelAccess = createSessionLevelAccess();
  const SESSION_LIFE_GESTURE_WINDOW_MS = 650;
  let lifeGestureTimer = 0, lifeVerifyEpoch = 0, lifeVerifyPending = false;

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
  const POSTCARD_KEY = 'ib-sugar-postcards';
  let postcardProgress = normalizePostcardProgress(ls.get(POSTCARD_KEY, null));
  let challengeRun = null;
  function savePostcardProgress() { ls.set(POSTCARD_KEY, postcardProgress); }
  let race = { racers: [], friends: [], friendCount: 0, group: 'family', offline: true, mine: null };
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
    if (t.boss) { if (t.part === 0) drawBoss(x, y, al); return; }
    if (t.popper) {
      ctx.save(); ctx.translate(x, y); if (wob) ctx.rotate(wob); ctx.scale(sc, sc); ctx.globalAlpha = al;
      ctx.fillStyle = 'rgba(70,10,40,.2)'; ctx.beginPath(); ctx.ellipse(0, R * .78, R * .72, R * .2, 0, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createRadialGradient(-R * .28, -R * .35, R * .06, 0, 0, R * .9);
      g.addColorStop(0, '#ffb36b'); g.addColorStop(.42, '#f05252'); g.addColorStop(1, '#8d2146');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, R * .08, R * .72, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#60233b'; ctx.lineWidth = R * .12; ctx.beginPath(); ctx.moveTo(R * .1, -R * .55); ctx.quadraticCurveTo(R * .42, -R * .98, R * .58, -R * .7); ctx.stroke();
      ctx.fillStyle = '#fff4a8'; ctx.beginPath(); ctx.arc(R * .59, -R * .7, R * (.1 + .025 * Math.sin(performance.now() / 90)), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = R * .08; ctx.beginPath(); ctx.arc(-R * .12, R * .03, R * .5, -.8, .5); ctx.stroke();
      ctx.restore(); return;
    }
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
    if (t.ing && st && st.lv && st.lv.ingStyle === 'doughnut') {
      // 1.9.232 Melbourne: the ingredients are hot jam doughnuts, sugar-dusted with a jam dot.
      const g = ctx.createRadialGradient(-R * .2, -R * .25, R * .1, 0, 0, R * .85);
      g.addColorStop(0, '#f2b867'); g.addColorStop(1, '#b8702e');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * .8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,250,240,.75)';
      for (let i = 0; i < 14; i++) { const a = i * 2.4, rr2 = R * (.25 + (i % 5) * .11); ctx.beginPath(); ctx.arc(Math.cos(a) * rr2, Math.sin(a) * rr2, R * .045, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#c8203a'; ctx.beginPath(); ctx.arc(R * .3, -R * .05, R * .17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff6a7a'; ctx.beginPath(); ctx.arc(R * .25, -R * .1, R * .06, 0, Math.PI * 2); ctx.fill();
      drawCandyShine(ctx, R * 0.8, .7);
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
      // Frosting: a thick white swirl with a drip, darker when it still has two layers.
      const thick = t.ice > 1;
      const g = ctx.createRadialGradient(-R * .25, -R * .4, R * .06, 0, R * .05, R * 1.15);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(.35, thick ? '#c5ebff' : '#e7f6ff');
      g.addColorStop(1, thick ? '#3d92cc' : '#6eb6e4');
      ctx.fillStyle = g; rr(-R * .88, -R * .84, R * 1.76, R * 1.68, R * .34); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-R * .22, R * .5); ctx.quadraticCurveTo(-R * .02, R * 1.08, R * .2, R * .48); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = R * .14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-R * .02, -R * .06, R * .46, .25, Math.PI * 1.75); ctx.stroke();
      ctx.strokeStyle = thick ? 'rgba(70,150,200,.6)' : 'rgba(120,180,215,.45)'; ctx.lineWidth = R * .055;
      ctx.beginPath(); ctx.arc(R * .02, R * .02, R * .16, .2, Math.PI * 1.25); ctx.stroke();
      if (t.hidden) {
        ctx.font = '900 ' + Math.round(R * .72) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(100,42,150,.9)'; ctx.fillText(t.hiddenIcon || '🧚', 0, R * .08);
      }
      if (t.ice >= 3) {
        // 1.9.285 Thick frosting: extra drips and a layer count.
        ctx.fillStyle = 'rgba(30,90,150,.32)'; rr(-R * .88, R * .34, R * 1.76, R * .5, R * .2); ctx.fill();
        ctx.fillStyle = '#1d5f99'; ctx.beginPath(); ctx.arc(R * .5, R * .5, R * .34, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = R * .08; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '900 ' + Math.round(R * .46) + 'px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(t.ice), R * .5, R * .53);
      }
      if (!reduce) {
        const gl = (performance.now() / 2600 + (t.id || 0) * .37) % 1;
        if (gl < .18) drawStarGlint(ctx, -R * .45 + gl * R * 4, -R * .5, R * .22, Math.sin(gl / .18 * Math.PI), 0);
      }
      drawCandyShine(ctx, R * 0.82, thick ? 1 : .65);
      ctx.restore(); return;
    }
    if (t.choco) {
      const g = ctx.createLinearGradient(-R, -R, R, R * .6);
      g.addColorStop(0, '#a86a3c'); g.addColorStop(.45, '#6b3a1f'); g.addColorStop(1, '#3a1c10');
      ctx.fillStyle = g; rr(-R * .86, -R * .86, R * 1.72, R * 1.72, R * .24); ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,170,.4)'; ctx.lineWidth = R * .06; ctx.beginPath();
      ctx.moveTo(-R * .62, 0); ctx.lineTo(R * .62, 0); ctx.moveTo(0, -R * .62); ctx.lineTo(0, R * .62); ctx.stroke();
      ctx.fillStyle = 'rgba(90,40,18,.45)'; ctx.beginPath(); ctx.ellipse(R * .1, R * .55, R * .28, R * .1, 0, 0, Math.PI * 2); ctx.fill();
      if (!reduce) {
        // 1.9.285 A slow glossy sheen slides across the chocolate.
        const sh = ((performance.now() / 1800 + (t.id || 0) * .21) % 1.6) - .3;
        ctx.save(); rr(-R * .86, -R * .86, R * 1.72, R * 1.72, R * .24); ctx.clip();
        ctx.fillStyle = 'rgba(255,225,190,.22)'; ctx.beginPath(); ctx.moveTo(-R + sh * R * 2, -R); ctx.lineTo(-R * .6 + sh * R * 2, -R); ctx.lineTo(-R * 1.2 + sh * R * 2, R); ctx.lineTo(-R * 1.6 + sh * R * 2, R); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      drawCandyShine(ctx, R * 0.8, 0.9);
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
    if (t.fuse > 0) drawFuseBadge(t, body);
    if (t.lock) {
      ctx.fillStyle = 'rgba(70,40,20,.8)'; rr(-R * .28, -R * .05, R * .56, R * .45, R * .08); ctx.fill();
      ctx.strokeStyle = 'rgba(70,40,20,.8)'; ctx.lineWidth = R * .1; ctx.beginPath(); ctx.arc(0, -R * .08, R * .2, Math.PI, 0); ctx.stroke();
    }
    if (t.liq) drawLiqWrap(R);
    ctx.restore();
  }
  // 1.9.285 Countdown bomb: a dark casing ring, a sparking fuse and the moves left. Pulses red at 3 or less.
  function drawFuseBadge(t, R) {
    const T = performance.now(), low = t.fuse <= 3, pulse = reduce ? 0 : (low ? .5 + .5 * Math.sin(T / 110) : .5 + .5 * Math.sin(T / 400));
    ctx.save();
    ctx.strokeStyle = low ? 'rgba(200,20,40,' + (.6 + .4 * pulse) + ')' : 'rgba(40,24,40,.85)'; ctx.lineWidth = R * .16;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.02, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = R * .09; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(R * .55, -R * .8); ctx.quadraticCurveTo(R * .9, -R * 1.25, R * 1.1, -R * 1.05); ctx.stroke();
    const sp = R * (.14 + .1 * pulse);
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(R * 1.1, -R * 1.05, sp, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(R * 1.1, -R * 1.05, sp * .45, 0, Math.PI * 2); ctx.fill();
    const bz = R * (.44 + (low ? .08 * pulse : 0));
    ctx.fillStyle = low ? '#e0182f' : '#2b1830'; ctx.beginPath(); ctx.arc(R * .62, R * .62, bz, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = R * .09; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '900 ' + Math.round(bz * 1.25) + 'px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(t.fuse), R * .62, R * .66);
    ctx.restore();
  }
  // 1.9.285 Boss: a big gummy creature over its 2×2 cells, with a health bar. Wobbles, flashes when hit.
  function drawBoss(x, y, al) {
    const b = st && st.boss, info = (st && st.lv && st.lv.boss) || {};
    const T = performance.now(), cx = x + CS / 2, cy = y + CS / 2, S = CS * .92;
    const hitAge = b && b.hitAt ? T - b.hitAt : 1e9, healAge = b && b.healAt ? T - b.healAt : 1e9;
    const wob = reduce ? 0 : Math.sin(T / 520) * .035, jolt = hitAge < 300 ? (1 - hitAge / 300) : 0;
    const col = info.col || ['#c86bff', '#8a2be2', '#4b0f7a'];
    ctx.save(); ctx.translate(cx + (jolt ? Math.sin(T / 18) * CS * .05 * jolt : 0), cy); ctx.globalAlpha = al;
    ctx.fillStyle = 'rgba(60,10,60,.22)'; ctx.beginPath(); ctx.ellipse(0, S * .92, S * .9, S * .16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.scale(1 + wob + jolt * .08, 1 - wob - jolt * .05);
    const g = ctx.createRadialGradient(-S * .35, -S * .4, S * .1, 0, 0, S * 1.1);
    g.addColorStop(0, col[0]); g.addColorStop(.55, col[1]); g.addColorStop(1, col[2]);
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(-S * .9, S * .8);
    ctx.bezierCurveTo(-S * 1.02, -S * .2, -S * .7, -S * .95, 0, -S * .95);
    ctx.bezierCurveTo(S * .7, -S * .95, S * 1.02, -S * .2, S * .9, S * .8);
    for (let i = 0; i < 4; i++) { const x0 = S * .9 - i * S * .45; ctx.quadraticCurveTo(x0 - S * .22, S * (.98 + (reduce ? 0 : .04 * Math.sin(T / 300 + i))), x0 - S * .45, S * .8); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = S * .06; ctx.beginPath(); ctx.arc(-S * .2, -S * .3, S * .55, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
    ctx.font = '900 ' + Math.round(S * 1.0) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(info.icon || '👾', 0, S * .02);
    if (jolt) { ctx.globalAlpha = al * .7 * jolt; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, S * .95, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function drawBossBar() {
    const b = st && st.boss; if (!b || !(b.hp > 0)) return;
    const T = performance.now(), healAge = b.healAt ? T - b.healAt : 1e9, al = 1;
    const cx = (b.c + 1) * CS, y = b.r * CS;
    const bw = CS * 1.6, bh = CS * .24, bx = cx - bw / 2, by = y + CS * .02, f = Math.max(0, b.hp / (b.max || 1));
    ctx.save(); ctx.globalAlpha = al;
    ctx.fillStyle = 'rgba(40,8,40,.78)'; rr(bx - 2, by - 2, bw + 4, bh + 4, bh * .6); ctx.fill();
    const hg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    hg.addColorStop(0, '#ff3b5c'); hg.addColorStop(.5, '#ffb400'); hg.addColorStop(1, '#5dd47a');
    ctx.fillStyle = hg; if (f > 0) { rr(bx, by, Math.max(bh, bw * f), bh, bh * .5); ctx.fill(); }
    if (healAge < 600) { ctx.fillStyle = 'rgba(120,255,160,' + (1 - healAge / 600) * .7 + ')'; rr(bx, by, bw * f, bh, bh * .5); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.font = '900 ' + Math.round(bh * .95) + 'px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('♥ ' + b.hp + ' / ' + b.max, cx, by + bh * .55);
    ctx.restore();
  }
  // 1.9.285 Portals: a purple swirl where sweets fall in, an orange one where they come out.
  function drawPortals(lv, T) {
    (lv.portals || []).forEach(function (p) {
      [[p.from, 1, '#a35cff', '#e3c8ff'], [p.to, -1, '#ff9a2e', '#ffe0b8']].forEach(function (q) {
        const r = q[0][0], c = q[0][1], x = c * CS + CS / 2, y = r * CS + (q[1] > 0 ? CS * .95 : CS * .05);
        ctx.save(); ctx.translate(x, y); ctx.scale(1, .34);
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, CS * .44);
        g.addColorStop(0, '#fff'); g.addColorStop(.35, q[3]); g.addColorStop(1, rgbaOf(q[2], 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, CS * .44, 0, Math.PI * 2); ctx.fill();
        ctx.rotate((reduce ? 0 : T / 500) * q[1]);
        ctx.strokeStyle = q[2]; ctx.lineWidth = CS * .07; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, CS * (.18 + i * .09), i * 2.1, i * 2.1 + 2.2); ctx.stroke(); }
        ctx.restore();
      });
    });
  }
  // 1.9.285 Candy cannons: a striped barrel above the column with its shots left.
  function drawCannons(lv, T) {
    (lv.cannons || []).forEach(function (cn) {
      const x = cn.c * CS + CS / 2, shots = (st.cannonShots && st.cannonShots[cn.c]) || 0, left = cn.max ? Math.max(0, cn.max - shots) : null;
      const fired = st.cannonPuff && st.cannonPuff[cn.c] ? T - st.cannonPuff[cn.c] : 1e9, kick = fired < 300 ? Math.sin(fired / 300 * Math.PI) * CS * .06 : 0;
      ctx.save(); ctx.translate(x, -kick); ctx.scale(1.4, 1.4);
      const col = cn.drop === 'fuse' ? ['#4a4a5a', '#1c1c26'] : cn.drop === 'liq' ? ['#5a3a5a', '#1c0f18'] : cn.drop === 'lock' ? ['#a87a4a', '#5a3a1a'] : ['#ff7eb3', '#c2185b'];
      const g = ctx.createLinearGradient(-CS * .2, 0, CS * .2, 0); g.addColorStop(0, col[1]); g.addColorStop(.5, col[0]); g.addColorStop(1, col[1]);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(-CS * .34, -CS * .04, CS * .68, CS * .44, CS * .14); ctx.fill();
      ctx.fillStyle = g; rr(-CS * .26, 0, CS * .52, CS * .3, CS * .08); ctx.fill();
      ctx.strokeStyle = 'rgba(60,10,40,.55)'; ctx.lineWidth = Math.max(1, CS * .025); ctx.stroke();
      ctx.fillStyle = col[1]; rr(-CS * .31, CS * .24, CS * .62, CS * .12, CS * .06); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-CS * .16, CS * .04, CS * .06, CS * .2);
      ctx.font = Math.round(CS * .2) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(cn.drop === 'ing' ? ((st.lv && st.lv.ingIcon) || '🎁') : cn.drop === 'fuse' ? '💣' : cn.drop === 'lock' ? '🔒' : '➿', CS * .05, CS * .15);
      if (left != null) {
        ctx.fillStyle = left ? '#fff' : 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(CS * .32, CS * .06, CS * .12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c2185b'; ctx.lineWidth = Math.max(1, CS * .02); ctx.stroke();
        ctx.fillStyle = '#c2185b'; ctx.font = '900 ' + Math.round(CS * .15) + 'px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(left), CS * .32, CS * .07);
      }
      const due = st.cannonDue && st.cannonDue[cn.c] > 0;
      if (due && !reduce) { ctx.fillStyle = 'rgba(255,224,102,' + (.5 + .5 * Math.sin(T / 120)) + ')'; ctx.beginPath(); ctx.arc(0, CS * .3, CS * .07, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });
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
  function moveTo(s, r, c, dur, ease, delay) { s.tw = { fx: s.x, fy: s.y, tx: c, ty: r, t0: now() + (delay || 0) * SP, dur: Math.max(1, dur * SP), ease: ease || easeOut }; s.r = r; s.c = c; }
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
  // 1.9.243 Each open tile is a little glass well. Jelly is a glossy dome; two layers read darker.
  // 1.9.285 Each country gets its own board frame and tile colours.
  const BOARD_THEMES = [
    { id: 'pink', frame: '#ff7eb3', deep: '#e25a96', tileA: 'rgba(255,255,255,.8)', tileB: 'rgba(255,214,232,.72)', well: 'rgba(176,64,112,.16)', bg: 'rgba(255,228,240,.46)' },
    { id: 'reef', frame: '#2ec4d6', deep: '#138a9e', tileA: 'rgba(240,255,255,.82)', tileB: 'rgba(196,240,246,.74)', well: 'rgba(20,110,140,.16)', bg: 'rgba(200,245,250,.5)' },
    { id: 'sand', frame: '#f5a524', deep: '#c27a0e', tileA: 'rgba(255,252,240,.84)', tileB: 'rgba(255,232,190,.74)', well: 'rgba(160,100,30,.16)', bg: 'rgba(255,240,210,.5)' },
    { id: 'jungle', frame: '#4cbf6a', deep: '#2b8a47', tileA: 'rgba(245,255,245,.82)', tileB: 'rgba(206,242,210,.74)', well: 'rgba(40,120,60,.16)', bg: 'rgba(214,248,220,.5)' },
    { id: 'grape', frame: '#a066e8', deep: '#6d3cbc', tileA: 'rgba(250,245,255,.82)', tileB: 'rgba(226,210,252,.74)', well: 'rgba(100,50,170,.16)', bg: 'rgba(232,220,255,.5)' },
    { id: 'sky', frame: '#4aa8ff', deep: '#2a74c8', tileA: 'rgba(245,250,255,.84)', tileB: 'rgba(208,230,255,.74)', well: 'rgba(40,90,160,.16)', bg: 'rgba(214,234,255,.5)' },
    { id: 'coral', frame: '#ff7a5c', deep: '#d24e30', tileA: 'rgba(255,248,244,.84)', tileB: 'rgba(255,218,204,.74)', well: 'rgba(170,70,40,.16)', bg: 'rgba(255,226,214,.5)' },
    { id: 'gold', frame: '#e8b923', deep: '#a8820a', tileA: 'rgba(255,253,240,.84)', tileB: 'rgba(250,236,180,.74)', well: 'rgba(140,110,20,.16)', bg: 'rgba(252,242,200,.5)' }
  ];
  function boardThemeFor(n) {
    const country = countryForLevel(n), list = [];
    MAP_COUNTRIES.forEach(function (c) { if (list.indexOf(c) < 0) list.push(c); });
    const i = Math.max(0, list.indexOf(country));
    return BOARD_THEMES[i % BOARD_THEMES.length];
  }
  let boardTheme = BOARD_THEMES[0];
  function applyBoardTheme(n) {
    boardTheme = boardThemeFor(n);
    const tray = doc.querySelector('#game .tray');
    if (tray) { tray.dataset.board = boardTheme.id; tray.style.setProperty('--bf', boardTheme.frame); tray.style.setProperty('--bfd', boardTheme.deep); tray.style.setProperty('--bbg', boardTheme.bg); }
  }
  function drawTile(x, y, s, jelly, blush, flow) {
    const rad = s * .2;
    ctx.fillStyle = boardTheme.well;
    rr(x + 2, y + 4, s - 4, s - 5, rad); ctx.fill();
    if (jelly) {
      const deep = jelly >= 2;
      const g = ctx.createLinearGradient(x, y, x, y + s);
      g.addColorStop(0, deep ? 'rgba(255,186,236,.86)' : 'rgba(255,168,214,.74)');
      g.addColorStop(1, deep ? 'rgba(132, 28, 160, .62)' : 'rgba(226, 48, 132, .48)');
      ctx.fillStyle = g;
      rr(x + 1.6, y + 1.6, s - 3.2, s - 3.2, rad); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath(); ctx.ellipse(x + s * .48, y + s * .3, s * .26, s * .09, -.3, 0, Math.PI * 2); ctx.fill();
      if (deep) {
        ctx.fillStyle = 'rgba(96, 16, 128, .28)';
        rr(x + s * .16, y + s * .18, s * .68, s * .64, rad * .6); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.42)';
        ctx.beginPath(); ctx.ellipse(x + s * .44, y + s * .36, s * .14, s * .05, -.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = deep ? 'rgba(110, 20, 150, .55)' : 'rgba(214, 40, 120, .4)';
      ctx.lineWidth = Math.max(1.5, 1.4 * DPR);
      rr(x + 4, y + 4, s - 8, s - 8, rad * .8); ctx.stroke();
      if (jelly >= 3) {
        ctx.strokeStyle = 'rgba(255,212,70,.9)'; ctx.lineWidth = Math.max(1.5, 1.8 * DPR);
        rr(x + 2.5, y + 2.5, s - 5, s - 5, rad); ctx.stroke();
      }
    } else {
      ctx.fillStyle = blush ? boardTheme.tileA : boardTheme.tileB;
      rr(x + 1.6, y + 1.6, s - 3.2, s - 3.2, rad); ctx.fill();
    }
    if (flow > 0) {
      const colors = ['#ff5375', '#ffab3d', '#ffe44d', '#50c979', '#48b6f3', '#9867df'];
      ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = .82;
      colors.forEach(function (color, i) {
        ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.4, s * .055); ctx.beginPath();
        const y0 = y + s * (.77 + (i - 2.5) * .045);
        ctx.moveTo(x + s * .1, y0); ctx.quadraticCurveTo(x + s * .48, y0 - s * .05, x + s * .9, y0 + s * .01); ctx.stroke();
      }); ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    rr(x + s * .16, y + s * .07, s * .66, s * .1, s * .05); ctx.fill();
  }
  function drawBeltLane(lane, dir) {
    const row = lane.row | 0, cols = lane.cols || Array.from({ length: N }, function (_, c) { return c; });
    if (row < 0 || row >= N) return;
    ctx.save();
    cols.forEach(function (c) {
      if (c < 0 || c >= N) return;
      const x = c * CS, y = row * CS, cy = y + CS * .91;
      ctx.fillStyle = 'rgba(22, 174, 190, .13)';
      rr(x + 1.5, y + 1.5, CS - 3, CS - 3, CS * .18); ctx.fill();
      ctx.strokeStyle = 'rgba(8, 112, 136, .78)';
      ctx.lineWidth = Math.max(1.4, CS * .045);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      if (dir > 0) {
        ctx.moveTo(x + CS * .27, cy); ctx.lineTo(x + CS * .72, cy);
        ctx.moveTo(x + CS * .60, cy - CS * .09); ctx.lineTo(x + CS * .72, cy); ctx.lineTo(x + CS * .60, cy + CS * .09);
      } else {
        ctx.moveTo(x + CS * .73, cy); ctx.lineTo(x + CS * .28, cy);
        ctx.moveTo(x + CS * .40, cy - CS * .09); ctx.lineTo(x + CS * .28, cy); ctx.lineTo(x + CS * .40, cy + CS * .09);
      }
      ctx.stroke();
    });
    ctx.restore();
  }
  function frame() {
    if (screen === 'game' && st) {
      if (!livePaused && tickTimer(st, Date.now())) hud();
      if (st.timerExpired && !st.timerEndHandled && !busy) {
        st.timerEndHandled = true;
        if (st.won) beginGoalFinish(); else showEnd();
      }
      const t = sparkleHoldT != null ? sparkleHoldT : now();
      ctx.clearRect(0, 0, W, W);
      const sarah = st.lv && st.lv.theme === 'sarah';
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const open = isOpen(st.mask, r, c);
        if (!open) {
          if (sarah) drawHeart(c * CS + CS / 2, r * CS + CS / 2, CS * .018, 'rgba(255,140,180,.22)');
          continue;
        }
        drawTile(c * CS, r * CS, CS, st.jelly ? (st.jelly[r][c] || 0) : 0, (r + c) % 2, st.flow ? (st.flow[r][c] || 0) : 0);
      }
      if (st.lv && st.lv.belts) st.lv.belts.forEach(function (lane) { drawBeltLane(lane, beltDirection(st.lv, lane, st.turns)); });
      if (st.lv && st.lv.portals) drawPortals(st.lv, t);
      if (sel && !busy) { ctx.strokeStyle = '#ff4f9a'; ctx.lineWidth = 3 * DPR; rr(sel[1] * CS + 3, sel[0] * CS + 3, CS - 6, CS - 6, CS * .2); ctx.stroke(); }
      for (const f of fx) if (f.type === 'beam') {
        const p = Math.min(1, (t - f.t0) / f.dur); ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - p)) + ')';
        if (f.s === 'row') ctx.fillRect(0, f.r * CS + CS * (.5 - .4 * (1 - p)), W, CS * .8 * (1 - p)); else ctx.fillRect(f.c * CS + CS * (.5 - .4 * (1 - p)), 0, CS * .8 * (1 - p), W);
      } else if (f.type === 'ring') {
        const p = Math.min(1, Math.max(0, (t - f.t0) / f.dur)); ctx.strokeStyle = f.col ? rgbaOf(f.col, 0.85 * (1 - p)) : 'rgba(255,255,255,' + (0.8 * (1 - p)) + ')'; ctx.lineWidth = CS * .2 * (1 - p);
        ctx.beginPath(); ctx.arc(f.x, f.y, CS * (.4 + (f.big || 1.3) * p), 0, Math.PI * 2); ctx.stroke();
      } else if (f.type === 'blast') {
        const p = Math.min(1, Math.max(0, (t - f.t0) / f.dur)), radius = CS * (.45 + 2.4 * easeOut(p));
        const g = ctx.createRadialGradient(f.x, f.y, radius * .1, f.x, f.y, radius);
        g.addColorStop(0, rgbaOf('#fff4a8', .72 * (1 - p))); g.addColorStop(.55, rgbaOf('#ff6b39', .38 * (1 - p))); g.addColorStop(1, rgbaOf('#e92f69', 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, radius, 0, Math.PI * 2); ctx.fill();
      }
      const hint = tickHint(t);
      const R = CS * .37;
      if (hint) drawHintGlow(hint, t, true);
      const crushing = !!(crush && crush.active);
      for (const s of sprites.values()) {
        if (s.tw) { const p = Math.max(0, Math.min(1, (t - s.tw.t0) / s.tw.dur)), e = s.tw.ease(p); s.x = s.tw.fx + (s.tw.tx - s.tw.fx) * e; s.y = s.tw.fy + (s.tw.ty - s.tw.fy) * e; if (p >= 1) { if (s.tw.ease === easeIn && !reduce) s.land = t; s.tw = null; } }
        if (s.pop) { const p = Math.min(1, (t - s.pop) / (220 * SP)); s.sc = 1 + .3 * p; s.al = 1 - p; }
        if (s.grow) { const p = Math.min(1, (t - s.grow) / (260 * SP)); s.sc = .3 + .7 * easeOut(p) + (p < 1 ? .25 * Math.sin(p * Math.PI) : 0); if (p >= 1) { s.grow = 0; s.sc = 1; } }
        if (s.y < -0.5) continue;
        if (s.t.c === -4 && !(s.t.ice > 0)) continue; // 1.9.230 icing already broken by this move: never drawn as a sweet
        let wob = 0;
        if (hint && !reduce && hint.some(h => h[0] === s.r && h[1] === s.c)) wob = Math.sin(t / 180) * .12;
        // Gentle idle bob (off with reduced motion) and a little squash when a sweet lands.
        let bob = 0, land = 1;
        if (!reduce && !s.tw && !s.pop) bob = Math.sin(t / 640 + s.t.id * 1.37) * CS * 0.022;
        if (s.land) { const p = (t - s.land) / 240; if (p >= 1) s.land = 0; else land = 1 + 0.12 * Math.sin(p * Math.PI) * (1 - p) - 0.04 * Math.sin(p * Math.PI * 2) * p; }
        const px = s.x * CS + CS / 2, py = s.y * CS + CS / 2 + bob;
        if (s.t.s && !s.pop && !crushing && (isCandy(s.t) || isBomb(s.t))) drawSpecialGlow(s.t, px, py, R, t, s.al);
        drawSweet(s.t, px, py, R, s.sc * land, s.al, wob);
        if (challengeRun && Number.isInteger(s.t.postcardPiece) && !s.pop) {
          ctx.save(); ctx.globalAlpha = .82; ctx.fillStyle = 'rgba(255,255,255,.86)';
          ctx.strokeStyle = '#d6246e'; ctx.lineWidth = Math.max(1, DPR);
          rr(s.x * CS + CS * .73, s.y * CS + CS * .04, CS * .23, CS * .2, CS * .04); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#c2185b'; ctx.font = '900 ' + Math.max(8, CS * .15) + 'px ui-rounded, system-ui, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✉', s.x * CS + CS * .845, s.y * CS + CS * .14); ctx.restore();
        }
      }
      drawBossBar();
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
          drawTile(c * CS, r * CS, CS, jelly, (r + c) % 2, st.flow ? (st.flow[r][c] || 0) : 0);
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
      if (st.lv && st.lv.cannons) drawCannons(st.lv, t);
      for (const f of fx) if (f.type === 'screenflash') {
        // 1.9.285 Big combos light up the whole tray for a moment.
        const p = Math.min(1, Math.max(0, (t - f.t0) / f.dur));
        ctx.fillStyle = rgbaOf(f.col || '#ffffff', .45 * (1 - p)); ctx.fillRect(0, 0, W, W);
      } else if (f.type === 'boom') {
        // 1.9.285 Boss defeat and countdown bomb blasts: a fireball with flying debris rings.
        const p = Math.min(1, Math.max(0, (t - f.t0) / f.dur)), radius = CS * (.5 + (f.big || 3) * easeOut(p));
        const g = ctx.createRadialGradient(f.x, f.y, radius * .05, f.x, f.y, radius);
        g.addColorStop(0, rgbaOf('#ffffff', .95 * (1 - p))); g.addColorStop(.3, rgbaOf('#ffe066', .8 * (1 - p))); g.addColorStop(.65, rgbaOf(f.col || '#ff5a36', .55 * (1 - p))); g.addColorStop(1, rgbaOf('#7a1040', 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, radius, 0, Math.PI * 2); ctx.fill();
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
  function resetSessionBenefits() {
    clearTimeout(lifeGestureTimer); lifeGestureTimer = 0;
    lifeVerifyEpoch++; lifeVerifyPending = false;
    sessionLevelAccess.reset();
  }
  function requestCloseSugar() {
    try { settleLife(); } catch (e) { }
    resetSessionBenefits();
    try { saveProg(); } catch (e) { }
    try { clearLive(); } catch (e) { }
    try { stopAllMusic(); } catch (e) { }
    try {
      if (root.parent && root.parent !== root) root.parent.postMessage({ type: 'ib-sugar-close' }, '*');
    } catch (e) { }
  }
  function requestMinimiseSugar() {
    try { pauseLive(true); } catch (e) { }
    try {
      if (root.parent && root.parent !== root) root.parent.postMessage({ type: 'ib-sugar-minimise' }, '*');
    } catch (e) { }
  }


  let tut = null, crush = null;
  /* ---- 1.9.222 Lives (1.9.223: one regenerates every hour up to 3). Losing or leaving a level part-way costs one.
     Family members can send a life (the Worker carries it); gifted lives can go above 3. ---- */
  let livesDemo = false, livesTimer = 0, livesInfo = null, heartsTimer = 0;
  function livesKey() { return 'ib-sugar-lives' + memberTag(); }
  function livesState() { const v = regenLives(ls.get(livesKey(), null)); ls.set(livesKey(), v); return v; }
  function lives() { return sessionLevelAccess.hasUnlimitedLives() ? LIVES_MAX : livesState().n; }
  function addLives(delta) { if (sessionLevelAccess.hasUnlimitedLives()) { paintHearts(); return; } ls.set(livesKey(), changeLives(ls.get(livesKey(), null), delta)); paintHearts(); }
  function setLives(n) { if (sessionLevelAccess.hasUnlimitedLives()) return; const cur = livesState(); addLives((n | 0) - cur.n); }
  function nextLife() { return sessionLevelAccess.hasUnlimitedLives() ? 0 : nextLifeMs(ls.get(livesKey(), null)); }
  function settleLife() {
    if (!st || st.challenge || st.tutorial || st.won || st.lifeDone) return;
    if (!(st.played || st.over)) return;
    st.lifeDone = true;
    if (!sessionLevelAccess.hasUnlimitedLives()) addLives(-1);
  }
  function paintHearts() {
    const unlimited = sessionLevelAccess.hasUnlimitedLives(), n = lives(), ms = nextLife(), count = unlimited ? '∞' : String(n);
    ['maphearts', 'hearts2'].forEach(function (id) {
      const el = $(id); if (!el) return;
      el.innerHTML = (n ? '<i aria-hidden="true">❤️</i>' : '<i aria-hidden="true">💔</i>') + '<b>' + count + '</b>' + (ms ? '<em class="hn">' + mmss(ms) + '</em>' : '');
      el.classList.toggle('out', !n);
      el.setAttribute('aria-label', unlimited ? 'Unlimited lives for this session' : n + (n === 1 ? ' life' : ' lives') + ' left' + (ms ? '. Next life in ' + Math.ceil(ms / 60000) + ' minutes.' : ''));
    });
    if (unlimited && heartsTimer) { clearInterval(heartsTimer); heartsTimer = 0; }
    // Tick the mm:ss countdown once a second while a life is on its way.
    if (ms && !heartsTimer) heartsTimer = setInterval(function () { if (!nextLife()) { clearInterval(heartsTimer); heartsTimer = 0; } paintHearts(); }, 1000);
  }
  function livesApi() { const S = root.IBScores; return !livesDemo && S && S.who && S.who() && S.loadLives && S.postLives ? S : null; }
  // On each open of the map: collect any lives the family has sent.
  async function syncLives() {
    const S = livesApi(); if (!S || sessionLevelAccess.hasUnlimitedLives()) return;
    let info = null;
    try { info = await S.loadLives(); } catch (e) { info = null; }
    if (sessionLevelAccess.hasUnlimitedLives()) return;
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
    const unlimited = sessionLevelAccess.hasUnlimitedLives();
    if (unlimited && mode === 'out') mode = 'send';
    const n = lives(), count = unlimited ? '∞' : String(n), info = data.info || livesInfo;
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
        '<p class="lv-plus">+' + (data.claimed || 1) + ' ❤️</p><p>You now have ' + count + (unlimited ? ' lives this session.' : n === 1 ? ' life.' : ' lives.') + '</p>' +
        '<button type="button" class="pri" data-lives="close">Thanks!</button>';
      ov.className = 'ov livesov gift';
    } else {
      html = '<div class="lv-hd"><span class="lv-hearts">' + (n ? '❤️' : '💔') + ' <b>' + count + '</b></span><h2>Lives</h2></div>' +
        (unlimited ? '<p>Unlimited lives are active for this session. Your saved lives stay unchanged.</p>' : '<p>Up to ' + LIVES_MAX + ' lives, with a new one every hour' + (nextLife() ? ' (next in ' + mmss(nextLife()) + ')' : '') + '. Losing or leaving a level uses one; tutorials and +3 moves never do.</p>') +
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
  function openLivesButtonPanel() {
    if (screen === 'map') openLivesPanel();
    else showLives(lives() ? 'send' : 'out');
  }
  function handleLivesButtonTap() {
    unlockAudio();
    if (lifeVerifyPending) return;
    if (sessionLevelAccess.hasUnlimitedLives()) { openLivesButtonPanel(); return; }
    const result = sessionLevelAccess.tap();
    clearTimeout(lifeGestureTimer);
    lifeGestureTimer = 0;
    if (result.taps >= SESSION_UNLOCK_TAPS) {
      const verifyEpoch = ++lifeVerifyEpoch;
      lifeVerifyPending = true;
      Promise.resolve()
        .then(() => root.IBScores && typeof root.IBScores.isVerifiedShane === 'function' ? root.IBScores.isVerifiedShane() : false)
        .catch(() => false)
        .then(isOwner => {
          if (verifyEpoch !== lifeVerifyEpoch) return;
          lifeVerifyPending = false;
          const granted = sessionLevelAccess.authorizeOwner(!!isOwner);
          if (granted.unlocked) {
            if (screen === 'map') renderMap();
            paintHearts();
            return;
          }
          sessionLevelAccess.clearTaps();
          openLivesButtonPanel();
        });
      return;
    }
    lifeGestureTimer = setTimeout(() => {
      lifeGestureTimer = 0;
      sessionLevelAccess.clearTaps();
      openLivesButtonPanel();
    }, SESSION_LIFE_GESTURE_WINDOW_MS);
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
  const LIVE_TTL = 36 * 3600 * 1000;
  const LIVE_ST_KEYS = ['score', 'moves', 'target', 'timerLeft', 'timerMsLeft', 'timerUpdatedAt', 'turns', 'over', 'won', 'stars', 'collected', 'specialsMade', 'combosMade', 'hiddenLeft', 'ingsLeft', 'liqIdle', 'defused', 'fuseBlown', 'moveNo', 'played', 'lifeDone', 'challenge', 'tutorial', 'postcardFound', 'timerExpired', 'timerEndHandled', 'cannonDue', 'cannonShots', 'boss', 'jelly', 'flow', 'kinds'];
  let liveMem = null, livePaused = false, holdPaused = false, liveSaveTimer = 0;
  function liveKey() { return 'ib-sugar-live' + memberTag(); }
  function snapBoard(b) {
    return (b || []).map(function (row) {
      return (row || []).map(function (tile) {
        if (!tile) return null;
        if (tile.hole || isHole(tile)) return { hole: 1 };
        return Object.assign({}, tile);
      });
    });
  }
  function loadBoard(rows) {
    return (rows || []).map(function (row) {
      return (row || []).map(function (o) {
        if (!o) return null;
        if (o.hole) return HOLE;
        const tile = mk(o.c, o.s);
        Object.keys(o).forEach(function (k) { if (k !== 'c' && k !== 's') tile[k] = o[k]; });
        return tile;
      });
    });
  }
  function buildLive() {
    const view = $('mapview');
    const payload = {
      v: 1,
      at: Date.now(),
      screen: screen,
      level: lvNum,
      map: {
        x: view ? view.scrollLeft : 0,
        y: view ? view.scrollTop : 0,
        open: (prog && prog.open) || 1
      },
      st: null
    };
    if (screen === 'game' && st && st.board && !st.tutorial) {
      const snap = { level: (st.lv && st.lv.n) || lvNum, board: snapBoard(st.board) };
      LIVE_ST_KEYS.forEach(function (k) {
        const val = st[k];
        if (val == null || typeof val === 'function') return;
        try { snap[k] = JSON.parse(JSON.stringify(val)); } catch (e) { }
      });
      payload.st = snap;
    }
    return payload;
  }
  function writeLive(payload) {
    liveMem = payload || buildLive();
    try { ls.set(liveKey(), liveMem); } catch (e) { }
  }
  function readLive() {
    if (liveMem && liveMem.v === 1 && Date.now() - (liveMem.at || 0) < LIVE_TTL) return liveMem;
    const v = ls.get(liveKey(), null);
    if (v && v.v === 1 && Date.now() - (v.at || 0) < LIVE_TTL) { liveMem = v; return v; }
    return null;
  }
  function clearLive() {
    liveMem = null;
    try { if (root.localStorage) root.localStorage.removeItem(liveKey()); } catch (e) { }
  }
  function scheduleSaveLive() {
    try { liveMem = buildLive(); } catch (e) { }
    if (liveSaveTimer) return;
    try {
      liveSaveTimer = root.setTimeout(function () { liveSaveTimer = 0; try { writeLive(liveMem || buildLive()); } catch (e) { } }, 400);
    } catch (e) { try { writeLive(); } catch (err) { } }
  }
  function loadLiveState(snap, lv) {
    const stt = newGame({ level: lv });
    if (snap && snap.board) stt.board = loadBoard(snap.board);
    LIVE_ST_KEYS.forEach(function (k) {
      if (k === 'board') return;
      if (snap && snap[k] != null) {
        try { stt[k] = JSON.parse(JSON.stringify(snap[k])); } catch (e) { stt[k] = snap[k]; }
      }
    });
    stt.lv = lv;
    stt.rand = rng(Date.now());
    return stt;
  }
  function applyLive(snap) {
    snap = snap || readLive();
    if (!snap) return false;
    if (snap.screen === 'game' && snap.st && snap.st.board) {
      const n = snap.st.level || snap.level || 1;
      bootLevel(n, { restore: snap.st });
      return true;
    }
    showMap({ behavior: 'auto', scroll: (snap.map && snap.map.open) || (prog && prog.open) || 1, keepSong: true });
    const view = $('mapview');
    if (view && snap.map) {
      const go = function () { view.scrollLeft = snap.map.x || 0; view.scrollTop = snap.map.y || 0; };
      if (root.requestAnimationFrame) root.requestAnimationFrame(function () { root.requestAnimationFrame(go); });
      else go();
    }
    return true;
  }
  function queryFlag(name) {
    try { return new URLSearchParams((root.location && root.location.search) || '').has(name); } catch (e) { return false; }
  }
  function isResumeOpen() {
    if (queryFlag('resume')) return !!readLive();
    if (queryFlag('fresh') || queryFlag('afterIntro')) return false;
    return !!readLive();
  }
  function parentIntroStatus() {
    try {
      if (root.parent && root.parent !== root && root.parent.ibSugarIntro)
        return root.parent.ibSugarIntro.status || '';
    } catch (e) { }
    return '';
  }
  function parentIsClosing() {
    try {
      if (root.parent && root.parent !== root && root.parent.ibSugarClosing) return true;
    } catch (e) { }
    try { return (root.sessionStorage && root.sessionStorage.getItem('ib-sugar-closing')) === '1'; } catch (e) { return false; }
  }
  function pauseLive(fromParent) {
    if (fromParent) holdPaused = true;
    livePaused = true;
    try { scheduleSaveLive(); writeLive(); } catch (e) { }
    try { stopAllMusic(); } catch (e) { }
    try { stopSpeech(); } catch (e) { }
    try { if (ac) ac.suspend().catch(function () { }); } catch (e) { }
  }
  function resumeLiveSession(fromParent) {
    if (fromParent) holdPaused = false;
    if (holdPaused) return;
    if (doc.hidden) return;
    livePaused = false;
    if (st && st.lv && st.lv.timer && !st.over) st.timerUpdatedAt = Date.now();
    try { if (ac && (soundOn || musicOn)) ac.resume().catch(function () { }); } catch (e) { }
    if (musicOn) playKind(wantKind());
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
    if (kind === 'squares') return '<span class="jelly"></span><span class="lock">🔒</span><span class="jelly"></span>';
    if (kind === 'river') return '<span class="jelly"></span><span class="jelly"></span><span class="ice"></span>';
    if (kind === 'village') return '<span class="jelly"></span><span class="bubp sm"></span><span class="lock">🔒</span>';
    if (kind === 'laneway') return '<span class="ing">🍩</span><span class="bubp sm"></span><span class="liqp sm"></span>';
    if (kind === 'coconut') return '<span class="ing">🥥</span><span class="liqp sm"></span>';
    if (kind === 'sunset') return '<span class="jelly"></span><span class="lock">🔒</span><span class="liqp sm"></span>';
    if (kind === 'factory') return '<span class="choco"></span><span class="bubp sm"></span><span class="liqp sm"></span>';
    if (kind === 'ice') return '<span class="ice"></span>';
    if (kind === 'ings') return '<span class="ing">🍒</span><span class="ing">🍋</span>';
    if (kind === 'choco') return '<span class="choco"></span>';
    if (kind === 'mix') return '<span class="jelly"></span><span class="lock">🔒</span><span class="ing">🎁</span>';
    // 1.9.285 New mechanics.
    if (kind === 'fuse') return '<span class="fusep"><b>9</b></span><span class="fusep low"><b>3</b></span>';
    if (kind === 'boss') return '<span class="bossp">' + ((LEVELS[(pendingLv || 1) - 1] || {}).boss || {}).icon + '<i><u></u></i></span>'.replace('undefined', '👾');
    if (kind === 'cannon') return '<span class="cannonp"></span><span class="ing">🎁</span>';
    if (kind === 'portal') return '<span class="portalp in"></span><span class="pip c1"></span><span class="portalp out"></span>';
    if (kind === 'order') return '<span class="orderp">🧾</span><span class="pip c0"></span><span class="pip c2"></span>';
    if (kind === 'timer') return '<span class="timerp">⏱️</span>';
    if (kind === 'belts') return '<span class="beltp"></span>';
    return '<span class="pip c0"></span><span class="pip c1"></span><span class="pip c0"></span>';
  }
  function paintGoalStrip(lv, stt) {
    const info = levelIntro(lv && lv.n || 1, prog);
    const counts = goalCounts(lv, stt);
    const hold = $('cditems');
    if (hold) {
      const prev = (hold.dataset.sig || '').split(',');
      hold.innerHTML = counts.map(function (c, i) {
        const customLab = c.kind.indexOf('recipe-') === 0 || c.kind === 'hidden' || c.kind === 'flow' || c.kind === 'choco' || c.kind === 'score' || c.kind === 'boss';
        const lab = c.kind === 'ings' || customLab ? c.lab : (c.kind === 'jelly' ? 'Jelly left' : c.kind === 'ice' ? 'Icing left' : c.kind === 'bub' ? 'Bubbles left' : c.kind === 'locks' ? 'Jars left' : c.kind === 'liq' ? 'Liquorice left' : 'left');
        const num = c.kind === 'ings' ? c.lab : String(c.left);
        const iconId = i === 0 ? ' id="gicon"' : '';
        const face = c.kind === 'jelly' ? '<i class="cd-swatch jelly"></i>' : c.kind === 'ice' ? '<i class="cd-swatch ice"></i>' : c.icon;
        return '<div class="cd-item" data-kind="' + c.kind + '" data-left="' + c.left + '"><span class="cd-icon"' + iconId + '>' + face + '</span><span class="cd-num">' + num + '</span><span class="cd-lab">' + lab + '</span></div>';
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
      if (stt) bits.push(stt.lv && stt.lv.timer ? ('Time ' + Math.floor(stt.timerLeft / 60) + ':' + String(stt.timerLeft % 60).padStart(2, '0')) : (stt.moves + ' moves left'));
      $('help').textContent = bits.length ? bits.join(' · ') : (stt ? info.goal : info.strip);
    }
    const strip = $('goalstrip');
    if (strip) strip.dataset.n = String(info.n);
    const mc = $('movecount');
    if (mc && stt) {
      const timedLow = stt.lv && stt.lv.timer && stt.timerLeft <= 15 && stt.timerLeft > 0;
      mc.classList.toggle('timer', !!(stt.lv && stt.lv.timer));
      mc.classList.toggle('low', timedLow || (stt.moves <= 5 && stt.moves > 0 && !goalsMet(stt)));
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
    $('intromoves').textContent = info.timer ? Math.floor(info.timer / 60) + ':' + String(info.timer % 60).padStart(2, '0') + ' on the clock' : info.moves + ' moves';
    $('introbody').textContent = info.tip;
    $('introstars').innerHTML = [0, 1, 2].map(i => '<span class="' + (i < info.stars ? 'on' : '') + '">★</span>').join('');
    $('introstars').setAttribute('aria-label', info.stars ? info.stars + ' stars earned' : 'No stars yet');
    const b = info.badge;
    $('introbadge').textContent = b ? ('Badge: ' + b.icon + ' ' + b.name) : '';
    pendingLv = n;
    $('introprev').innerHTML = mechanicPreview(info.mechanic);
    const nw = $('intronew'), news = info.news;
    if (nw) {
      nw.hidden = !news;
      nw.className = 'intronew' + (news ? ' ' + news.kind : '');
      nw.innerHTML = news ? '<span class="nw-tag">' + (news.kind === 'new' ? 'New!' : 'New twist') + '</span><span class="nw-ic">' + news.icon + '</span><span class="nw-tx"><b>' + news.name + '</b>' + news.text + '</span>' : '';
    }
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
    hideComboTip();
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
  // 1.9.230 Quick combo tutorial: the first time two specials sit side by side, point at them with a short tip.
  const COMBO_TIP_KEY = 'ib-sugar-combo-tip';
  let comboTipTimer = 0;
  function comboTipSeen() { return !!ls.get(COMBO_TIP_KEY + memberTag(), false); }
  function hideComboTip() { clearTimeout(comboTipTimer); const el = $('combotip'); if (el) el.hidden = true; }
  function maybeComboTip(force) {
    if (!st || st.over || st.tutorial || (tut && tut.active)) return false;
    if (!force && comboTipSeen()) return false;
    const pair = adjacentSpecials(st.board, st.mask);
    if (!pair) return false;
    ls.set(COMBO_TIP_KEY + memberTag(), true);
    const el = $('combotip');
    if (el) {
      el.innerHTML = '<b>⚡ Super power combo!</b><span>Swap two special sweets together for a mega blast: stripes, wrapped sweets and sprinkle bombs all combine.</span>';
      el.hidden = false; el.onclick = hideComboTip;
      clearTimeout(comboTipTimer); comboTipTimer = setTimeout(hideComboTip, 6500);
    }
    hintMove = pair; hintOn = false; lastAct = now() - HINT_IDLE_MS - 50;
    return pair;
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
    challengeRun = opt.challengeCountry ? { country: opt.challengeCountry, pieces: (postcardProgress.countries[opt.challengeCountry] || { pieces: [] }).pieces.slice() } : null;
    $('intro').hidden = true; $('end').hidden = true; $('map').hidden = true; $('postcards').hidden = true; $('game').hidden = false;
    if ($('goalban')) $('goalban').hidden = true;
    if ($('goalnext')) $('goalnext').hidden = true;
    if (!opt.tutorial) hideTutUi();
    hideRecap();
    doc.body.classList.remove('onmap', 'onpostcards', 'oncrush');
    doc.body.classList.toggle('postcard-game', !!challengeRun);
    if (!opt.tutorial) doc.body.classList.remove('sarah');
    const fresh = screen !== 'game' || lvNum !== n || !!challengeRun;
    screen = 'game';
    loadSayClips();
    lvNum = n;
    const lv = challengeRun
      ? { n: n, name: 'Postcard Hunt', target: 0, moves: 26, stars: [0, 0, 0], kinds: KINDS }
      : LEVELS[n - 1];
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
    $('lvname').textContent = challengeRun ? (challengeRun.country + ' · Postcard') : ('Level ' + n + ' · ' + lv.name + (hard ? ' · ' + (hard === 2 ? 'Super Hard' : 'Hard') : ''));
    $('mapbtn').textContent = challengeRun ? 'Postcards' : 'Levels';
    $('endmap').textContent = challengeRun ? 'Postcard shelf' : 'Levels';
    $('restartbtn').textContent = challengeRun ? 'Restart hunt' : 'Restart';
    paintGoalStrip(lv);
    if (opt.restore) {
      st = loadLiveState(opt.restore, lv);
      sel = null; busy = false; lastAct = now();
      crush = null; warned3 = false; hintOn = false; hintHold = false; hintMove = null; hideHintHand(); hideMovesWarn(); lastSaying = ''; sayUntil = 0; clearSayQueue(); hideSaying();
      resetStreak(); hideCrushBan();
      fitCanvas(); syncAll(); hud();
      paintGoalStrip(lv, st);
      hintMove = opt.tutorial ? null : findMove(st.board, st.mask);
      revealSugarUi();
      return;
    }
    st = newGame(opt.board ? { level: lv, board: fromRows(opt.board) } : { level: lv });
    try { applyBoardTheme(lv.n); } catch (e) { }
    if (challengeRun) {
      st.challenge = true;
      st.postcardFound = challengeRun.pieces.slice();
      const missing = Array.from({ length: POSTCARD_COUNT }, (_, i) => i).filter(i => !challengeRun.pieces.includes(i));
      const cells = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (isCandy(st.board[r][c])) cells.push(st.board[r][c]);
      for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(st.rand() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
      missing.forEach((piece, i) => { if (cells[i]) cells[i].postcardPiece = piece; });
    }
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
    revealSugarUi();
  }
  function beginLevel(n) {
    hideIntro();
    if (tutorialFor(n) && !tutorialDone(n)) startTutorial({ level: n });
    else startLevel(n);
  }

  function revealSugarUi() {
    try { doc.documentElement.classList.remove('sr-wait'); } catch (e) { }
  }
  function paintPickIcon() {
    const btn = $('pickicon');
    if (!btn) return;
    const id = (race && race.mine && race.mine.icon) || ls.get('ib-sugar-icon', null);
    const ic = isRaceIcon(id) ? raceIcon(id) : null;
    if (ic) {
      btn.innerHTML = '<span class="face" style="--ic:' + ic.color + '">' + ic.emoji + '</span><span class="lab">Icon</span>';
      btn.setAttribute('aria-label', 'Change your icon, currently ' + ic.name);
      btn.hidden = false;
      btn.disabled = false;
    } else {
      btn.textContent = 'Pick your icon';
      btn.setAttribute('aria-label', 'Pick your icon');
      btn.hidden = false;
      btn.disabled = false;
    }
    const alt = $('raceicon');
    if (alt) {
      alt.hidden = false;
      alt.disabled = false;
      alt.textContent = ic ? ('Change icon') : 'Pick your icon';
    }
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
    paintPickIcon();
  }
  function objText(g) {
    if (!g || !g.lv) return '';
    const lv = g.lv, bits = [];
    if (lv.collect) bits.push((NAMES[lv.collect.color] || 'Sweets') + ' ' + (g.collected[lv.collect.color] || 0) + ' / ' + lv.collect.n);
    if (lv.jelly) bits.push('Jelly ' + jellyLeft(g) + ' left');
    if (lv.ice && lv.iceGoal !== false) bits.push('Icing ' + iceLeft(g.board) + ' left');
    if (lv.ings && lv.ings.length) bits.push('Ingredients ' + ((lv.ings.length - (g.ingsLeft || 0))) + ' / ' + lv.ings.length);
    if (lv.locks) bits.push('Locks ' + locksLeft(g.board) + ' left');
    if (lv.bub) bits.push('Bubbles ' + bubLeft(g.board) + ' left');
    if (lv.liq) bits.push('Liquorice ' + liqLeft(g.board) + ' left');
    if (lv.recipe) {
      (lv.recipe.candies || []).forEach(function (item) { bits.push((NAMES[item.color] || 'Sweets') + ' ' + (g.collected[item.color] || 0) + ' / ' + item.n); });
      (lv.recipe.specials || []).forEach(function (item) { bits.push((RECIPE_SPECIALS[item.kind] || { name: 'Special sweet' }).name + ' ' + ((g.specialsMade || {})[item.kind] || 0) + ' / ' + item.n); });
      (lv.recipe.combos || []).forEach(function (item) { bits.push((RECIPE_COMBOS[item.kind] || { name: 'Special combo' }).name + ' ' + ((g.combosMade || {})[item.kind] || 0) + ' / ' + item.n); });
    }
    if (lv.hidden) bits.push('Sugar sprites ' + (lv.hidden.reduce((sum, row) => sum + Array.from(row).reduce((a, n) => a + (+n || 0), 0), 0) - (g.hiddenLeft || 0)) + ' found');
    if (lv.flow) bits.push('Syrup clogs ' + flowLeft(g) + ' left');
    if (lv.chocoGoal) bits.push('Chocolate ' + chocoLeft(g.board) + ' left');
    if (lv.scoreGoal) bits.push('Score ' + g.score.toLocaleString('en-NZ') + ' / ' + lv.scoreGoal);
    return bits.join(' · ');
  }
  function paintPostcardHud() {
    const el = $('postcardHud'); if (!el) return;
    if (!challengeRun) { el.hidden = true; el.innerHTML = ''; return; }
    const pieces = challengeRun.pieces || [], icon = POSTCARD_ICONS[challengeRun.country] || '🌍';
    el.hidden = false;
    el.innerHTML = '<div class="pc-hunt-copy"><b>📮 ' + challengeRun.country + ' postcard</b><span>Match sweets to uncover the hidden pieces.</span><strong class="pc-moves">Moves left: ' + (st ? st.moves : 0) + '</strong></div>' +
      '<div class="pc-hunt-pieces" aria-label="' + pieces.length + ' of 4 pieces found">' +
      Array.from({ length: POSTCARD_COUNT }, function (_, i) { return '<span class="pc-fragment' + (pieces.includes(i) ? ' found' : '') + '">' + (pieces.includes(i) ? icon : '✦') + '</span>'; }).join('') +
      '</div><strong>' + pieces.length + ' / ' + POSTCARD_COUNT + '</strong>';
  }
  function hud() {
    if (!st) return;
    try { if (screen === 'game') scheduleSaveLive(); } catch (e) { }
    $('score').textContent = st.score.toLocaleString('en-NZ');
    const timed = !!(st.lv && st.lv.timer && !st.challenge);
    const moveLabel = $('movecount') && $('movecount').querySelector('span');
    if (moveLabel) moveLabel.textContent = timed ? 'Time left' : 'Moves left';
    $('moves').textContent = timed ? Math.floor(st.timerLeft / 60) + ':' + String(st.timerLeft % 60).padStart(2, '0') : st.moves;
    if ($('movecount')) $('movecount').classList.toggle('timer', timed);
    $('best').textContent = Math.max(prog.best[st.lv.n - 1] || 0, st.score).toLocaleString('en-NZ');
    $('obj').textContent = objText(st);
    if (st.lv) paintGoalStrip(st.lv, st);
    const stars = st.lv.stars, max = stars[2] || 1, p = Math.min(1, st.score / max);
    $('fill').style.width = (p * 100).toFixed(1) + '%';
    stars.forEach((s, i) => { const el = $('st' + i); el.style.left = (s / max * 100) + '%'; el.classList.toggle('got', st.score >= s && (s > 0 || st.won)); });
    paintBoosters();
    paintPostcardHud();
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
        el.style.left = mapXPct(stop.x);
        el.style.top = mapYPct(stop.y);
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
    const friendsOnly = race.group === 'friends';
    const heading = $('raceheading');
    if (heading) heading.textContent = friendsOnly ? '🤝 Friends progress' : '🏁 Family progress';
    board.setAttribute('aria-label', friendsOnly ? 'Friends progress' : 'Family and friends progress');
    function paintRows(target, entries, showLevel) {
      if (!target) return;
      target.replaceChildren();
      entries.forEach(function (r, i) {
        const ic = raceIcon(r.icon) || RACE_ICONS[0];
        const li = doc.createElement('li');
        if (r.mine) li.className = 'me';
        const rank = doc.createElement('span'); rank.className = 'rk'; rank.textContent = String(i + 1); li.appendChild(rank);
        const face = doc.createElement('span'); face.className = 'face'; face.style.setProperty('--ic', ic.color); face.textContent = ic.emoji; li.appendChild(face);
        const who = doc.createElement('span'); who.className = 'who'; who.appendChild(doc.createTextNode(racerFirst(r.name)));
        if (r.mine) { const you = doc.createElement('em'); you.textContent = 'you'; who.appendChild(you); }
        li.appendChild(who);
        const at = doc.createElement('span'); at.className = 'at'; at.textContent = 'Level ' + Math.max(1, r.stop | 0); li.appendChild(at);
        const stars = doc.createElement('span'); stars.className = 'rs'; stars.textContent = (r.stars || 0) + '★'; li.appendChild(stars);
        target.appendChild(li);
      });
    }
    paintRows(list, rows, false);
    if (note) {
      note.hidden = !race.offline;
      note.textContent = race.offline ? 'Just you on this phone (offline).' : '';
    }
    const friendboard = $('friendboard'), friendlist = $('friendlist'), friendnote = $('friendnote');
    if (friendboard) {
      const showFriends = !race.offline && !raceDemo && !friendsOnly;
      friendboard.hidden = !showFriends;
      if (showFriends) {
        let linked = (race.friends || []).slice();
        if (!linked.some(function (r) { return r.mine; })) linked.push(race.mine || myLocalRacer());
        else linked = linked.map(function (r) { return r.mine ? Object.assign({}, r, race.mine || myLocalRacer()) : r; });
        paintRows(friendlist, rankRacers(linked), true);
        if (friendnote) {
          const others = linked.filter(function (r) { return !r.mine; }).length;
          friendnote.hidden = false;
          friendnote.textContent = race.friendCount < 1
            ? 'No friends are linked to you yet.'
            : others ? 'Only you and your linked friends can see this progress.' : 'Your linked friends have not shared Sugar Rush progress yet.';
        }
      }
    }
    const chip = $('racechip');
    if (chip) {
      const lead = rows[0];
      const ic = lead && (raceIcon(lead.icon) || RACE_ICONS[0]);
      if (lead && ic) {
        chip.replaceChildren();
        const face = doc.createElement('span'); face.className = 'face'; face.style.setProperty('--ic', ic.color); face.textContent = ic.emoji; chip.appendChild(face);
        const label = doc.createElement('span'); label.textContent = '🏁 ' + racerFirst(lead.name) + ' ' + (lead.stars || 0) + '★'; chip.appendChild(label);
        chip.setAttribute('aria-label', (friendsOnly ? 'Friends progress' : 'Family progress') + ', ' + racerFirst(lead.name) + ' is in the lead with ' + (lead.stars || 0) + ' stars. Tap to open.');
      } else {
        chip.innerHTML = '🏁 Race';
        chip.setAttribute('aria-label', friendsOnly ? 'Friends progress' : 'Family progress');
      }
    }
  }
  function applyRace(data, offline) {
    const self = myLocalRacer();
    const group = data && data.group === 'friends' ? 'friends' : 'family';
    let racers = (data && Array.isArray(data.racers)) ? data.racers.map(function (r) {
      return { name: r.name, icon: r.icon, stop: r.stop, stars: r.stars, mine: !!r.mine };
    }) : [];
    if (!racers.some(function (r) { return r.mine; })) racers.push(self);
    else racers = racers.map(function (r) { return r.mine ? Object.assign({}, r, self) : r; });
    let friends = group === 'family' && data && Array.isArray(data.friends) ? data.friends.map(function (r) {
      return { name: r.name, icon: r.icon, stop: r.stop, stars: r.stars, mine: !!r.mine };
    }) : [];
    if (group === 'family') {
      if (!friends.some(function (r) { return r.mine; })) friends.push(self);
      else friends = friends.map(function (r) { return r.mine ? Object.assign({}, r, self) : r; });
    }
    race = { racers: racers, friends: friends, friendCount: Math.max(0, Number(data && data.friendCount) || 0), group: group, offline: !!offline, mine: self, event: raceDemo ? race.event : ((!offline && data && data.event) || null) };
    renderRacers();
    renderRaceBoard();
    renderRaceEvent(true);
    paintPickIcon();
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
          renderRacers(); renderRaceBoard(); paintPickIcon();
        } else {
          syncRace(true);
        }
      });
      grid.appendChild(b);
    });
    ov.hidden = false;
  }

  function renderPostcards() {
    const list = $('postcardlist'); if (!list) return;
    postcardProgress = normalizePostcardProgress(postcardProgress);
    list.innerHTML = POSTCARD_COUNTRIES.map(function (country) {
      const entry = postcardProgress.countries[country], icon = POSTCARD_ICONS[country] || '🌍';
      const fragments = Array.from({ length: POSTCARD_COUNT }, function (_, i) {
        const found = entry.pieces.includes(i);
        return '<span class="pc-fragment' + (found ? ' found' : '') + '">' + (found ? icon : '✦') + '</span>';
      }).join('');
      const action = entry.complete ? 'Postcard complete' : (entry.pieces.length ? 'Continue hunt' : 'Find the pieces');
      return '<article class="pc-card' + (entry.complete ? ' done' : '') + '"><div class="pc-preview" aria-label="' + country + ' postcard, ' + entry.pieces.length + ' of 4 pieces found">' + fragments + '</div>' +
        '<h2>' + country + '</h2><p>' + (entry.complete ? 'Postcard assembled' : entry.pieces.length + ' of 4 pieces found') + '</p>' +
        '<button type="button" class="' + (entry.complete ? '' : 'pri') + '" data-postcard-country="' + country + '"' + (entry.complete ? ' disabled' : '') + '>' + action + '</button></article>';
    }).join('');
  }
  function showPostcards() {
    leaveEnd();
    challengeRun = null;
    screen = 'postcards';
    $('game').hidden = true; $('map').hidden = true; $('postcards').hidden = false;
    if ($('intro')) $('intro').hidden = true;
    doc.body.classList.remove('onmap', 'ingame', 'sarah', 'oncrush', 'postcard-game', 'hard1', 'hard2');
    doc.body.classList.add('onpostcards');
    hideHardBan(); setHammer(false); stopOverlay();
    renderPostcards();
    if (musicOn) playKind(wantKind());
  }
  function startPostcardChallenge(country) {
    if (!POSTCARD_COUNTRIES.includes(country)) return;
    const record = postcardProgress.countries[country];
    if (!record || record.complete) return;
    const n = MAP_COUNTRIES.indexOf(country) + 1;
    if (n < 1) return;
    bootLevel(n, { challengeCountry: country });
  }
  function collectPostcardFinds(steps) {
    if (!challengeRun || !st || !Array.isArray(steps)) return 0;
    let found = 0;
    steps.forEach(function (step) {
      (step.popped || []).forEach(function (tile) {
        if (!Number.isInteger(tile.postcardPiece)) return;
        const before = postcardProgress.countries[challengeRun.country].pieces.length;
        postcardProgress = addPostcardPiece(postcardProgress, challengeRun.country, tile.postcardPiece);
        const after = postcardProgress.countries[challengeRun.country].pieces.length;
        if (after > before) { found++; addText('Postcard piece!', cellXY(tile.r, tile.c)[0], cellXY(tile.r, tile.c)[1], 18, '#ffe066'); }
      });
    });
    if (found) {
      challengeRun.pieces = postcardProgress.countries[challengeRun.country].pieces.slice();
      st.postcardFound = challengeRun.pieces.slice();
      savePostcardProgress(); hud();
      playRise(found);
    }
    return found;
  }
  function renderMap() {
    const stage = $('mapstage'), path = $('path'), shelf = $('shelf');
    if (stage && !stage.querySelector('svg.nzsvg')) {
      const hold = path;
      stage.insertAdjacentHTML('afterbegin', nzMapSvg());
      if (hold && hold.parentNode !== stage) stage.appendChild(hold);
    }
    const live = beenPath(prog.stars);
    const future = aheadPath(prog.stars);
    const wide = stage && stage.querySelector('#sr-path-wide');
    const dash = stage && stage.querySelector('#sr-path-dash');
    const fut = stage && stage.querySelector('#sr-future');
    const futBorder = stage && stage.querySelector('#sr-future-border');
    if (wide) wide.setAttribute('d', live);
    if (dash) dash.setAttribute('d', live);
    if (fut) fut.setAttribute('d', future);
    if (futBorder) futBorder.setAttribute('d', future);
    path.innerHTML = '';
    const here = Math.min(LV_COUNT, Math.max(1, prog.open));
    LEVELS.forEach((lv, i) => {
      const n = i + 1, open = sessionLevelAccess.allows(n, prog.open), stars = prog.stars[i] || 0, stop = MAP_STOPS[i], country = countryForLevel(n);
      const countryStop = country && country.toLowerCase() === stop.place.toLowerCase();
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'lv lab-' + (stop.label || 'right') + (stop.lift ? ' lift' : '') + (lv.theme === 'sarah' ? ' sarah' : '') + (lv.hard ? ' hard hard' + lv.hard : '') + (countryStop ? ' country-stop' : '') + (open ? ' open' : '') + (stars ? ' done' : '') + (n === here ? ' here' : '') + ' kind-' + (stop.kind || 'town');
      if (!open) { b.classList.add('locked'); b.setAttribute('aria-disabled', 'true'); }
      b.dataset.n = String(n);
      b.dataset.country = country;
      b.style.left = mapXPct(stop.x);
      b.style.top = mapYPct(stop.y);
      const mark = stop.kind === 'house' ? '🏠' : (stop.kind === 'post' ? '✉️' : (stop.kind === 'station' ? '🚂' : (stop.kind === 'island' ? '🌴' : '')));
      const starHtml = [0, 1, 2].map(k => '<span class="' + (k < stars ? 'on' : '') + '">★</span>').join('');
      const badge = prog.badges[i] && lv.badge ? '<span class="gotbadge" aria-hidden="true">' + lv.badge.icon + '</span>' : '';
      b.innerHTML = '<span class="pin"><span class="no">' + n + '</span>' + (mark ? '<span class="mark" aria-hidden="true">' + mark + '</span>' : '') + (lv.hard ? '<span class="hardmark" aria-hidden="true">🔥</span>' : '') + '</span><span class="st">' + starHtml + '</span>' +
        '<span class="meta"><b>' + stop.place + '</b><em>' + lv.name + '</em>' + (country && !countryStop ? '<i class="country">' + country + '</i>' : '') + '</span>' + badge;
      b.setAttribute('aria-label', (open ? 'Play ' : 'Locked: ') + 'level ' + n + ', ' + lv.name + ', ' + stop.place + (country && !countryStop ? ', ' + country : '') + (lv.hard ? ', ' + hardLabel(lv.hard) : '') + (stars ? ', ' + stars + ' stars' : '') + (prog.badges[i] && lv.badge ? ', badge ' + lv.badge.name : ''));
      b.addEventListener('click', () => {
        const card = typeof window !== 'undefined' && window.SugarRushMap && window.SugarRushMap.showPlace;
        const play = () => { unlockAudio(); openLevel(n); };
        if (card) { card({ n, place: stop.place, country, name: lv.name, open, play }); return; }
        if (open) play();
      });
      path.appendChild(b);
    });
    FUTURE_STOPS.forEach(function (stop) {
      const el = doc.createElement('div');
      el.className = 'future-stop lab-' + (stop.label || 'right') + (stop.inset ? ' inset-' + stop.inset : '');
      el.dataset.place = stop.place;
      el.style.left = mapXPct(stop.x);
      el.style.top = mapYPct(stop.y);
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
    challengeRun = null;
    if ($('postcards')) $('postcards').hidden = true;
    if (!(opts && opts.keepSong)) stopEnd();
    const wasScreen = screen;
    screen = 'map';
    if ($('goalnext') && !(opts && opts.keepNext)) $('goalnext').hidden = true;
    const winPath = doc.querySelector('#sr-path-win');
    if (winPath && !(opts && opts.keepPath)) { winPath.classList.remove('on'); winPath.setAttribute('d', ''); }
    const fromGame = wasScreen !== 'map' || !$('map').dataset.seen;
    $('game').hidden = true; $('intro').hidden = true; $('end').hidden = true; $('map').hidden = false;
    $('map').dataset.seen = '1';
    doc.body.classList.remove('sarah', 'ingame', 'hammering', 'hard1', 'hard2', 'postcard-game', 'onpostcards');
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
    if (musicOn && !livePaused) playKind(wantKind());
    try { scheduleSaveLive(); } catch (e) { }
    revealSugarUi();
  }
  function openLevel(n) {
    const lv = LEVELS[n - 1]; if (!lv || !sessionLevelAccess.allows(n, prog.open)) return;
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

  async function animateBeltMoves(moves) {
    if (!moves || !moves.length) return;
    for (const m of moves) {
      const s = sprites.get(m.t.id);
      if (s) moveTo(s, m.to.r, m.to.c, 210);
    }
    await wait(230);
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
    const beltAt = Number.isInteger(res.beltStepIndex) ? res.beltStepIndex : res.steps.length;
    for (let i = 0; i < beltAt; i++) await showStep(res.steps[i], i, { streak: !plain });
    if (res.beltMoves && res.beltMoves.length) await animateBeltMoves(res.beltMoves);
    for (let i = beltAt; i < res.steps.length; i++) await showStep(res.steps[i], i, { streak: !plain });
    collectPostcardFinds(res.steps);
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
    // 1.9.285 End-of-move mechanics: the boss heals, cannons load, countdown bombs tick or go off.
    if (res.bossHealed && st.boss && st.boss.hp > 0) {
      st.boss.healAt = performance.now();
      addText('+' + res.bossHealed + ' ♥', (st.boss.c + 1) * CS, st.boss.r * CS + CS * .2, 22, '#7dffa8');
    }
    if (res.cannonLoaded && res.cannonLoaded.length) {
      res.cannonLoaded.forEach(function (c) { fx.push({ type: 'ring', x: c * CS + CS / 2, y: CS * .15, t0: now(), dur: 380, col: '#ffffff', big: .8 }); });
    }
    if (res.fuseBlown) {
      const [x, y] = cellXY(res.fuseBlown.r, res.fuseBlown.c);
      fx.push({ type: 'boom', x, y, t0: now(), dur: 900, big: 5, col: '#ff3b2f' });
      fx.push({ type: 'screenflash', t0: now(), dur: 520, col: '#ffb27a' });
      addText('BOOM!', x, y, 40, '#ffe066');
      shake(3); playZap(true);
      await wait(800);
    } else if (res.fuseTicks && res.fuseTicks.some(function (f) { return f.n <= 3; })) {
      const f = res.fuseTicks.reduce(function (a, b) { return b.n < a.n ? b : a; });
      const [x, y] = cellXY(f.r, f.c);
      fx.push({ type: 'ring', x, y, t0: now(), dur: 420, col: '#ff3b2f', big: 1.2 });
      if (f.n <= 2) addText(f.n === 1 ? 'Last move!' : '2 moves!', x, y - CS * .4, 18, '#ffd0d0');
    }
    maybeComboTip();
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
  // 1.9.230 Each super power combo gets its own big moment before the clear.
  async function comboIntro(s) {
    if (crush && crush.skip) return;
    const t = now(), k = s.combo, at = s.comboAt || { r: (N / 2) | 0, c: (N / 2) | 0 };
    const [x0, y0] = cellXY(at.r, at.c), colr = SAYING_COLORS[k] || '#ffffff';
    shake(2);
    fx.push({ type: 'flash', x: x0, y: y0, col: colr, t0: t, dur: 520 });
    fx.push({ type: 'ring', x: x0, y: y0, t0: t, dur: 620 * SP, col: '#ffffff', big: k === 'sugarstorm' ? 7 : k === 'bigblast' ? 3.6 : 2.6 });
    fx.push({ type: 'ring', x: x0, y: y0, t0: t + 90, dur: 640 * SP, col: colr, big: k === 'sugarstorm' ? 6 : 3 });
    const edge = (r, c) => cellXY(Math.max(0, Math.min(N - 1, r)), Math.max(0, Math.min(N - 1, c)));
    const bolts = [];
    if (k === 'crisscross' || k === 'bigcross') {
      const ds = k === 'bigcross' ? [-1, 0, 1] : [0];
      for (const d of ds) { bolts.push(edge(at.r + d, 0), edge(at.r + d, N - 1), edge(0, at.c + d), edge(N - 1, at.c + d)); }
    } else if (k === 'bigblast') {
      for (let a = 0; a < 8; a++) bolts.push([x0 + Math.cos(a * Math.PI / 4) * CS * 2.4, y0 + Math.sin(a * Math.PI / 4) * CS * 2.4]);
    } else if (k === 'stripestorm' || k === 'wrapstorm') {
      // The colour bomb's lightning turns every sweet of that colour striped / wrapped, then they all go off.
      for (const cv of s.converted || []) {
        cv.t.s = cv.s;
        const sp = sprites.get(cv.t.id); if (sp) sp.grow = t + 60;
        bolts.push(cellXY(cv.r, cv.c));
      }
    } else if (k === 'sugarstorm') {
      for (let n = 0; n < 24; n++) bolts.push(cellXY((n * 5 + 3) % N, (n * 3 + 1) % N));
    }
    if (!reduce) bolts.slice(0, 40).forEach((p, n) => fx.push({ type: 'bolt', x0, y0, x1: p[0], y1: p[1], col: n % 2 ? '#ffffff' : colr, w: k === 'bigblast' ? .9 : .75, seed: n * 13 + 5, t0: t + n * 8, dur: 560 }));
    playZap(true);
    await wait((s.converted && s.converted.length ? 520 : 300) * (crush && crush.fast ? 0.3 : 1));
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
    if (s.combo) await comboIntro(s);
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
    // 1.9.285 Boss hits: a flash and a damage number; defeat is a huge explosion.
    if (s.bossHit && st.boss) {
      st.boss.hitAt = performance.now();
      const bx = (st.boss.c + 1) * CS, by = (st.boss.r + 1) * CS;
      addText('-' + s.bossHit, bx + (Math.random() - .5) * CS * .6, by - CS * .4, 26, '#ff5a7a');
      fx.push({ type: 'ring', x: bx, y: by, t0: t, dur: 420, col: '#ff5a7a', big: 1.8 });
      if (!reduce) for (let k = 0; k < 6; k++) { const a = Math.random() * Math.PI * 2, v = .6 + Math.random() * .6; pushFx({ type: 'shard', x: bx, y: by, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .5, rot: a, vr: (Math.random() - .5) * 10, sz: .1, col: k % 2 ? '#c86bff' : '#ff8ad8', t0: t, dur: 600 }); }
    }
    if (s.bossDown) {
      const bx = (s.bossDown.c + 1) * CS, by = (s.bossDown.r + 1) * CS;
      for (const sp of sprites.values()) if (sp.t.boss) sp.pop = t;
      fx.push({ type: 'boom', x: bx, y: by, t0: t, dur: 900, big: 4.5, col: '#c86bff' });
      fx.push({ type: 'screenflash', t0: t, dur: 500, col: '#ffffff' });
      for (let k = 0; k < 3; k++) fx.push({ type: 'ring', x: bx, y: by, t0: t + k * 110, dur: 700, col: ['#ffe066', '#ff8ad8', '#ffffff'][k], big: 3 + k });
      if (!reduce) for (let k = 0; k < 24; k++) { const a = Math.random() * Math.PI * 2, v = .9 + Math.random() * 1.4; pushFx({ type: 'shard', x: bx, y: by, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .8, rot: a, vr: (Math.random() - .5) * 14, sz: .12 + Math.random() * .08, col: COL[k % 6][1], t0: t, dur: 900 }); }
      addText('Boss beaten!', W / 2, W * .3, 34, '#ffe066');
      try { confetti(70, root.innerWidth / 2, root.innerHeight * .4); } catch (e) { }
      shake(3);
    }
    if (s.defused) {
      for (const p of s.popped) if (p.fuse) { const [x, y] = cellXY(p.r, p.c); fx.push({ type: 'ring', x, y, t0: t, dur: 480, col: '#5dd47a', big: 1.6 }); addText('Defused!', x, y - CS * .3, 18, '#b8ffcc'); }
    }
    for (const b of s.blasts || []) {
      const [x, y] = cellXY(b.r, b.c);
      fx.push({ type: 'blast', x, y, t0: t, dur: 460 });
      fx.push({ type: 'ring', x, y, t0: t, dur: 520, col: '#ff8352', big: 2.2 });
      addText('POP!', x, y, 23, '#ffe184');
      playZap(true);
    }
    for (const f of s.fired || []) {
      const [fx0, fy0] = cellXY(f.r, f.c);
      const t0 = st.board[f.r] && st.board[f.r][f.c];
      const col = f.s === 'b' ? (f.color >= 0 ? COL[f.color][1] : '#ffffff') : (COL[(s.popped.find(p => p.r === f.r && p.c === f.c) || {}).color] || COL[(t0 && t0.c >= 0) ? t0.c : 0])[1];
      if (f.s === 'row' || f.s === 'col') {
        fx.push({ type: 'beam', s: f.s, r: f.r, c: f.c, t0: t, dur: 420 * SP });
        if (!reduce) fx.push({ type: 'beam2', s: f.s, r: f.r, c: f.c, col, t0: t, dur: 480 });
      } else if (f.s === 'w') {
        fx.push({ type: 'ring', x: fx0, y: fy0, t0: t, dur: 480 * SP, col, big: f.big ? 2.6 : 1.6 });
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
    if (s.combo) showSaying(s, i); // 1.9.230 a super power combo's line goes first (ahead of a streak line)
    if (opt.streak !== false) addStreak(streakStepGain(s, i));
    callout(s, i);
    if (n) addText('+' + s.points, cx / n, cy / n, 22, '#fff');
    if (!s.combo) showSaying(s, i);
    if (opt.shake !== false) {
      // 1.9.285 Bigger feedback: colour-bomb combos and huge clears get a heavy shake and a flash; long cascades build up.
      const lvl = shakeLevel([s]), huge = !!s.combo || s.popped.length >= 24;
      shake(huge ? 3 : lvl >= 2 ? 2 : (i >= 4 ? 2 : i >= 2 ? 1 : lvl));
      if (huge && !reduce) fx.push({ type: 'screenflash', t0: t, dur: 380, col: '#fff6c8' });
    }
    for (const m of s.madeTiles || []) { const sp = sprite(m.t, m.r, m.c); sp.grow = t; if (!reduce) { const [x, y] = cellXY(m.r, m.c); pushFx({ type: 'glint', x, y, dx: 0, dy: 0, sz: .45, rot: 0, t0: t, dur: 520 }); } }
    if (s.delivered) for (const d of s.delivered) { const sp = sprites.get(d.t.id); if (sp) sp.pop = t; }
    await wait(230);
    let longest = 0;
    const fallCols = {};
    for (const f of s.falls || []) {
      let sp = sprites.get(f.t.id);
      if (!sp || sp.pop) { sp = sprite(f.t, f.from, f.c); }
      if (f.portal) { sp.x = f.c; sp.y = f.from; } // 1.9.285 out of the portal's twin
      const d = f.r - (f.fresh || f.portal ? f.from : sp.y), dur = 120 + 70 * Math.sqrt(Math.max(1, Math.abs(d)));
      // 1.9.285 Smoother cascade: columns land one after another, lower sweets first, with a soft bounce.
      const delay = reduce ? 0 : (f.c * 16 + (fallCols[f.c] = (fallCols[f.c] || 0) + 1) * 10);
      longest = Math.max(longest, dur + delay);
      moveTo(sp, f.r, f.c, dur, easeIn, delay);
      if (f.fresh && f.t.cannon) {
        if (!st.cannonPuff) st.cannonPuff = {};
        st.cannonPuff[f.c] = performance.now();
        const x = f.c * CS + CS / 2;
        fx.push({ type: 'ring', x, y: CS * .2, t0: t + 230, dur: 420, col: '#ffe066', big: 1 });
        addText(f.t.ing ? 'Treat!' : f.t.fuse ? 'Bomb!' : f.t.liq ? 'Liquorice!' : 'Cannon!', x, CS * .55, 16, '#fff');
      }
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
    if ((el.classList.contains('shk2') || el.classList.contains('shk3')) && level < 2) return;
    el.classList.remove('shk1', 'shk2', 'shk3'); void el.offsetWidth; el.classList.add(level >= 3 ? 'shk3' : level >= 2 ? 'shk2' : 'shk1');
    if (shakeT) clearTimeout(shakeT);
    shakeT = setTimeout(function () { el.classList.remove('shk1', 'shk2', 'shk3'); }, 640);
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
  function boostOk() { return !!(screen === 'game' && st && !st.challenge && !st.over && !st.tutorial && !(tut && tut.active) && !(crush && crush.active)); }
  function paintBoosters() {
    const bar = $('boosters'); if (!bar) return;
    const have = inv(), ok = boostOk();
    BOOSTERS.forEach(function (b) {
      const btn = bar.querySelector('[data-boost="' + b.id + '"]'); if (!btn) return;
      btn.hidden = b.id === 'moves' && !!(st && st.lv && st.lv.timer);
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
    // 1.9.285 A blown countdown bomb is re-armed with 5 more moves; a timed level gets 20 more seconds.
    if (st.fuseBlown) {
      st.fuseBlown = null;
      for (const row of st.board) for (const t of row) if (t && t.fuse != null && t.fuse <= 5) t.fuse = Math.max(0, t.fuse) + 5;
    }
    if (st.timerExpired && st.lv && st.lv.timer) {
      st.timerExpired = false; st.timerEndHandled = false;
      st.timerMsLeft = (st.timerMsLeft || 0) + 20000; st.timerLeft = Math.ceil(st.timerMsLeft / 1000); st.timerUpdatedAt = Date.now();
      addText('+20 seconds', W / 2, W / 2 + CS, 22, '#bfe9ff');
    }
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
    if (st.challenge) {
      st.won = true; st.over = true; st.stars = POSTCARD_COUNT; busy = true;
      paintPostcardHud(); playSting(); ovFit(); confetti(64, ovW / 2, ovH * 0.42, { speed: 470 });
      await wait(reduce ? 80 : 500);
      await showEnd(); return;
    }
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
    if (st && st.challenge) { showEnd(); return; }
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
    const d = journeyPath(MAP_STOPS.slice(fromN - 1, toN), fromN);
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
    me.style.left = mapXPct(a.x);
    me.style.top = mapYPct(a.y);
    await wait(reduce ? 20 : 40);
    me.style.left = mapXPct(b.x);
    me.style.top = mapYPct(b.y);
    await wait(reduce ? 80 : 750);
    me.classList.remove('hopping');
  }
  // 1.9.283 The route strokes are sized in screen px, so they look the same at any zoom of the true-scale map.
  const ROUTE_STROKES = [['#sr-future-border', 9, [2.2, 6]], ['#sr-future', 5, [2.2, 6]], ['#sr-path-wide', 7], ['#sr-path-dash', 2.2, [5, 7]], ['#sr-path-win', 8]];
  function fitRouteStrokes(pxPerUnit) {
    const u = Math.max(0.01, pxPerUnit || 1);
    ROUTE_STROKES.forEach(function (r) {
      const el = doc.querySelector(r[0]);
      if (!el) return;
      el.style.strokeWidth = (r[1] / u).toFixed(3);
      if (r[2] && r[0] !== '#sr-path-win') el.style.strokeDasharray = (r[2][0] / u).toFixed(2) + ' ' + (r[2][1] / u).toFixed(2);
    });
  }
  async function cinematicTravel(fromN, toN) {
    const view = $('mapview'), stage = $('mapstage'), svg = stage && stage.querySelector('svg.nzsvg');
    const plane = svg && svg.querySelector('#sr-travel-plane');
    const car = svg && svg.querySelector('#sr-travel-car');
    const isFlight = countryForLevel(fromN) !== countryForLevel(toN);
    const vehicle = isFlight ? plane : car;
    const a = MAP_STOPS[fromN - 1], b = MAP_STOPS[toN - 1];
    if (reduce || !view || !stage || !svg || !plane || !car || !vehicle || !a || !b || toN <= fromN) return false;
    const track = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    track.setAttribute('d', journeyPath(MAP_STOPS.slice(fromN - 1, toN), fromN));
    track.setAttribute('fill', 'none');
    track.setAttribute('stroke', isFlight ? '#77d2e5' : '#ff6fa8');
    track.setAttribute('stroke-width', isFlight ? '5.5' : '11');
    track.setAttribute('stroke-linecap', 'round');
    track.setAttribute('opacity', isFlight ? '.94' : '.88');
    track.setAttribute('stroke-dasharray', '1');
    track.setAttribute('stroke-dashoffset', '1');
    track.style.filter = isFlight ? 'drop-shadow(0 1px 4px rgba(44,120,152,.34))' : 'drop-shadow(0 2px 4px rgba(72,67,112,.38))';
    svg.insertBefore(track, vehicle);
    let length = 0;
    try { length = track.getTotalLength(); } catch (e) { }
    if (!(length > 0)) { track.remove(); return false; }
    const saved = {
      transform: stage.style.transform, transition: stage.style.transition,
      origin: stage.style.transformOrigin, pointer: stage.style.pointerEvents,
      overflow: view.style.overflow, touchAction: view.style.touchAction,
      planeDisplay: plane.getAttribute('display'), carDisplay: car.getAttribute('display'), travelClass: stage.classList.contains('travel-shot')
    };
    let completed = false;
    try {
      stage.classList.add('travel-shot');
      view.style.overflow = 'hidden';
      view.style.touchAction = 'none';
      stage.style.pointerEvents = 'none';
      view.scrollLeft = 0; view.scrollTop = 0;
      stage.style.transformOrigin = '0 0';
      stage.style.transition = 'none';
      stage.style.transform = 'none';
      const sw = stage.clientWidth, sh = stage.clientHeight, vw = view.clientWidth, vh = view.clientHeight;
      if (!sw || !sh || !vw || !vh) return false;
      const sx = sw / MAP_VW, sy = sh / MAP_VH;
      const toStage = function (p) { return { x: (p.x - MAP_X0) * sx, y: (p.y - MAP_Y0) * sy }; };
      // 1.9.283 On the true-scale world map a road trip can be a few map units long: zoom in to fit the trip,
      // and keep the car, plane and track the same size on screen as before.
      let tb = { width: 40, height: 40 };
      try { tb = track.getBBox(); } catch (e) { }
      const span = Math.max(tb.width * sx, tb.height * sy, 1);
      const closeScaleFit = Math.max(1.45, Math.min(9, Math.min(vw, vh) * 0.5 / span));
      const vk = 0.7 / (closeScaleFit * sx);
      track.setAttribute('stroke-width', ((isFlight ? 5.5 : 11) * vk).toFixed(2));
      fitRouteStrokes(closeScaleFit * sx);
      const camera = function (scale, p) {
        const tx = vw / 2 - p.x * scale, ty = vh / 2 - p.y * scale;
        stage.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scale(' + scale.toFixed(3) + ')';
      };
      const setVehicle = function (p, p1, p2) {
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const deg = Math.atan2(dy, dx) * 180 / Math.PI + (isFlight ? 90 : 0);
        vehicle.setAttribute('transform', 'translate(' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ') rotate(' + deg.toFixed(1) + ') scale(' + vk.toFixed(3) + ')');
      };
      const first = track.getPointAtLength(0), last = track.getPointAtLength(length);
      const farScale = Math.min(vw / sw, vh / sh) * .92, closeScale = closeScaleFit;
      stage.style.transform = 'translate3d(0,0,0) scale(1)';
      void stage.offsetWidth;
      stage.style.transition = 'transform 460ms cubic-bezier(.2,.8,.2,1)';
      camera(farScale, { x: sw / 2, y: sh / 2 });
      await wait(650);
      vehicle.setAttribute('display', 'inline');
      setVehicle(first, first, track.getPointAtLength(Math.min(length, 5)));
      stage.style.transition = 'transform 420ms cubic-bezier(.2,.8,.2,1)';
      camera(closeScale, toStage(first));
      await wait(450);
      stage.style.transition = 'none';
      track.setAttribute('stroke-dasharray', String(length));
      track.setAttribute('stroke-dashoffset', String(length));
      await new Promise(function (resolve) {
        const raf = root.requestAnimationFrame || function (fn) { return setTimeout(function () { fn(Date.now()); }, 16); };
        let started = null;
        function frame(stamp) {
          if (started == null) started = stamp;
          const t = Math.min(1, Math.max(0, (stamp - started) / 1250));
          const eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          const d = length * eased, p = track.getPointAtLength(d);
          const p1 = track.getPointAtLength(Math.max(0, d - 5)), p2 = track.getPointAtLength(Math.min(length, d + 5));
          setVehicle(p, p1, p2);
          track.setAttribute('stroke-dashoffset', String(length * (1 - eased)));
          camera(closeScale, toStage(p));
          if (t < 1) raf(frame); else resolve();
        }
        raf(frame);
      });
      stage.style.transition = 'transform 520ms cubic-bezier(.2,.75,.25,1)';
      camera(1, toStage(last));
      await wait(550);
      completed = true;
    } catch (e) {
      completed = false;
    } finally {
      stage.style.transition = saved.transition;
      stage.style.transform = saved.transform;
      stage.style.transformOrigin = saved.origin;
      stage.style.pointerEvents = saved.pointer;
      if (!saved.travelClass) stage.classList.remove('travel-shot');
      view.style.overflow = saved.overflow;
      view.style.touchAction = saved.touchAction;
      if (saved.planeDisplay == null) plane.removeAttribute('display');
      else plane.setAttribute('display', saved.planeDisplay);
      if (saved.carDisplay == null) car.removeAttribute('display');
      else car.setAttribute('display', saved.carDisplay);
      plane.removeAttribute('transform');
      car.removeAttribute('transform');
      track.remove();
    }
    if (completed) scrollMapTo(toN, { behavior: 'auto' });
    return completed;
  }
  async function celebrateOnMap(fromN, toN) {
    const traveling = !!(fromN && toN && toN > fromN && toN <= LV_COUNT);
    const cinematic = traveling && !reduce;
    showMap({ scroll: cinematic ? 'start' : (toN || 'start'), behavior: cinematic || reduce ? 'auto' : 'smooth', keepSong: true });
    await wait(reduce ? 60 : 280);
    animatePathSegment(traveling ? fromN : (fromN > 1 ? fromN - 1 : fromN), traveling ? toN : fromN);
    if (cinematic) {
      const result = await Promise.all([cinematicTravel(fromN, toN), hopRacer(fromN, toN)]);
      if (!result[0]) scrollMapTo(toN, { behavior: 'smooth' });
    } else {
      await hopRacer(fromN, toN);
    }
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
    if (st.challenge) {
      $('endtitle').textContent = won ? 'Postcard assembled!' : 'Keep searching!';
      $('endstars').innerHTML = Array.from({ length: POSTCARD_COUNT }, (_, i) => '<span class="' + (i < (challengeRun.pieces || []).length ? 'on' : '') + '">✦</span>').join('');
      $('endscore').textContent = (challengeRun.pieces || []).length + ' of ' + POSTCARD_COUNT + ' pieces';
      $('endbadge').hidden = true; $('endbadgecap').hidden = true;
      $('endchest').hidden = true; $('endloot').hidden = true; $('morebtn').hidden = true;
      $('endmsg').textContent = won
        ? 'You found every piece of the ' + challengeRun.country + ' postcard. Your postcard progress is saved separately from the levels.'
        : 'Your ' + challengeRun.country + ' postcard progress is saved. Find the remaining pieces on your next hunt.';
      $('againbtn').textContent = won ? 'Postcard shelf' : 'Try again';
      $('nextbtn').hidden = true; $('endmap').hidden = false; $('endmap').textContent = 'Postcard shelf';
      $('end').hidden = false;
      return;
    }
    const fly = !!(won && opts.animateStars && n > 0);
    $('endtitle').textContent = won ? (lv.theme === 'sarah' ? "Sarah's level complete!" : ('Level ' + lv.n + ' complete!')) : (st.fuseBlown ? 'Boom! A bomb went off' : st.timerExpired ? "Time's up!" : 'So close!');
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
      if (st.fuseBlown) $('endmsg').textContent = 'A countdown bomb reached zero. Match the lowest numbers first next time!';
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
    if (challengeRun) { const country = challengeRun.country; leaveEnd(); startPostcardChallenge(country); return; }
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
    if (challengeRun) { showPostcards(); return; }
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
  $('againbtn').addEventListener('click', () => { if (challengeRun && challengeRun.pieces.length >= POSTCARD_COUNT) showPostcards(); else restart(); });
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
  if ($('raceicon')) $('raceicon').addEventListener('click', () => { unlockAudio(); openIconPicker(); });
  if ($('racefoot')) $('racefoot').addEventListener('click', () => { unlockAudio(); setRaceOpen(true); });
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
  ['maphearts', 'hearts2'].forEach(id => { if ($(id)) $(id).addEventListener('click', handleLivesButtonTap); });
  if ($('raceon')) $('raceon').addEventListener('click', e => {
    if (e.target === $('raceon') || e.target === $('raceonbtn')) $('raceon').hidden = true;
  });
  if ($('mapexit')) $('mapexit').addEventListener('click', requestCloseSugar);
  if ($('gameexit')) $('gameexit').addEventListener('click', requestCloseSugar);
  if ($('mapmin')) $('mapmin').addEventListener('click', requestMinimiseSugar);
  if ($('gamemin')) $('gamemin').addEventListener('click', requestMinimiseSugar);
  root.addEventListener('message', function (e) {
    const d = e && e.data;
    if (!d || !d.type) return;
    if (d.type === 'ib-sugar-pause') pauseLive(true);
    else if (d.type === 'ib-sugar-resume') resumeLiveSession(true);
    else if (d.type === 'ib-sugar-intro-done') { /* boot waiter also listens */ }
    else if (d.type === 'ib-sugar-exit') requestCloseSugar();
  });
  if (root.addEventListener) {
    root.addEventListener('pagehide', resetSessionBenefits);
    root.addEventListener('pageshow', e => {
      if (e.persisted) { resetSessionBenefits(); if (!$('map').hidden) { renderMap(); paintHearts(); } }
    });
  }
  if ($('racechip')) $('racechip').addEventListener('click', () => { unlockAudio(); setRaceOpen(true); });
  if ($('raceboard')) $('raceboard').addEventListener('click', e => {
    if (e.target.closest && e.target.closest('[data-race=close]')) setRaceOpen(false);
  });
  if ($('postcardbtn')) $('postcardbtn').addEventListener('click', () => { unlockAudio(); showPostcards(); });
  if ($('postcardsBack')) $('postcardsBack').addEventListener('click', showMap);
  if ($('postcardlist')) $('postcardlist').addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-postcard-country]');
    if (b && !b.disabled) { unlockAudio(); startPostcardChallenge(b.dataset.postcardCountry); }
  });
  if ($('badgebtn')) $('badgebtn').addEventListener('click', () => { unlockAudio(); if ($('badgeov')) $('badgeov').hidden = false; });
  if ($('badgeov')) $('badgeov').addEventListener('click', e => {
    if (e.target === $('badgeov') || (e.target.closest && e.target.closest('[data-badge=close]'))) $('badgeov').hidden = true;
  });
  doc.addEventListener('pointerdown', function (e) { unlockAudio(); if (screen === 'game') noteActivity(); }, { passive: true });
  doc.addEventListener('pointerup', unlockAudio, { passive: true });
  doc.addEventListener('touchend', unlockAudio, { passive: true });
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) pauseLive(false);
    else resumeLiveSession(false);
  });
  root.addEventListener('pagehide', () => {
    try {
      if (parentIsClosing()) { try { settleLife(); } catch (e) { } try { saveProg(); } catch (e) { } clearLive(); }
      else writeLive();
    } catch (e) { }
    try { stopAllMusic(); } catch (e) { }
    try { if (ac) ac.suspend().catch(() => { }); } catch (e) { }
  });
  root.addEventListener('resize', () => { ovFit(); fitCanvas(); if (tut && tut.active && tut.step && tut.step.move) placeTutHand(tut.step.move[0], tut.step.move[1]); if (hintOn && hintMove) placeHintHand(hintMove[0], hintMove[1], hintHold); });

  paintButtons();
  root.requestAnimationFrame(frame);
  (function bootOpen() {
    if (isResumeOpen() && applyLive()) return;
    const after = queryFlag('afterIntro') || parentIntroStatus() === 'playing' || parentIntroStatus() === 'done';
    if (after) {
      let opened = false;
      function goMap() { if (opened) return; opened = true; showMap(); }
      if (parentIntroStatus() === 'done') { goMap(); return; }
      const to = root.setTimeout(goMap, 15000);
      function onMsg(e) {
        if (e && e.data && e.data.type === 'ib-sugar-intro-done') {
          try { root.clearTimeout(to); } catch (err) { }
          root.removeEventListener('message', onMsg);
          goMap();
        }
      }
      root.addEventListener('message', onMsg);
      const iv = root.setInterval(function () {
        if (parentIntroStatus() === 'done') {
          try { root.clearInterval(iv); root.clearTimeout(to); } catch (err) { }
          root.removeEventListener('message', onMsg);
          goMap();
        }
      }, 200);
      return;
    }
    if (typeof root.playSugarIntro === 'function') {
      root.playSugarIntro({ doc: doc, root: root, onDone: function () { showMap(); } });
      return;
    }
    showMap();
  })();

  root.SugarRush.ui = {
    state: () => st, attempt, comboTip: maybeComboTip, hud, paintGoalStrip, showEnd, showMap, scrollMapTo, openLevel, startLevel, showIntro, startTutorial, skipTutorial, finishTutorial, showTutStep, beginLevel, beginGoalFinish, showGoalBanner, celebrateOnMap, progress: () => prog, tutorial: () => tut, crush: () => crush,
    seedLives, showLives, openLivesPanel, lives: () => lives(), settleLife, nextLife: () => nextLife(),
    seedRace, seedRaceEvent, showRaceOn, showRaceResult, racePrize, syncRace, openIconPicker, setRaceOpen, requestCloseSugar, requestMinimiseSugar, saveLive: writeLive, readLive, applyLive, clearLive, pauseLive, resumeLiveSession, isResumeOpen, race: () => race,
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

// 1.9.275 Load the map extras even if the page was saved before the script tag existed.
(function () {
  if (typeof document === 'undefined') return;
  function ensureMapExtras() {
    if (document.querySelector('script[src*="sugar-rush-map"]')) return;
    var s = document.createElement('script');
    s.src = 'sugar-rush-map.js?v=1.9.294';
    s.async = false;
    document.body.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureMapExtras, { once: true });
  else ensureMapExtras();
})();
