/* 1.9.109 In-feed puzzles and hand-picked discovery cards.
   Original puzzles only. Zoomquilt, Falling Falling and the later discovery sites
   stay still on the card. A tap opens the live site in this app's window.
   Checked 7 Nov 2026 for Zoomquilt and Falling Falling, and 21 Nov 2026 for the
   twelve added sites: none sent X-Frame-Options or CSP frame-ancestors.
   If a framed site still frame-busts or comes up blank, it opens in a new tab.
   Falling Falling moves at 60fps and starts a looping sound only after that tap.
   Closing the window sets the frame to about:blank so the picture and sound stop. */
(function (root) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const dayNum = now => (now == null && typeof root.seenDayN === 'function') ? root.seenDayN() : Math.floor((now == null ? Date.now() : now) / 864e5);
  const TILES = [
    ['kiwi', 'Kiwi', 'img/play/kiwi.svg'],
    ['tui', 'Tūī', 'img/play/tui.svg'],
    ['pukeko', 'Pūkeko', 'img/play/pukeko.svg'],
    ['korora', 'Kororā', 'img/play/korora.svg'],
    ['kea', 'Kea', 'img/play/kea.svg'],
    ['fantail', 'Pīwakawaka', 'img/play/fantail.svg'],
    ['ruru', 'Ruru', 'img/play/ruru.svg'],
    ['dog', 'Dog', 'img/play/dog.svg']
  ];
  /* Sitcom answers are show facts, each with a public source. Distractors are other well-known shows, not invented plot points. */
  const SITCOM = [
    { q: 'In Friends, what is the name of the coffee shop?', opts: ['Central Perk', 'MacLaren’s Pub', 'Monk’s Café', 'Cheers'], a: 0, note: 'Central Perk is the coffee shop in Friends.', src: 'https://en.wikipedia.org/wiki/Central_Perk', srcName: 'Wikipedia: Central Perk' },
    { q: 'What is the paper company in the US version of The Office?', opts: ['Dunder Mifflin', 'Wernham Hogg', 'Initech', 'Sterling Cooper'], a: 0, note: 'Dunder Mifflin is the paper company in Scranton. Wernham Hogg is the UK Office.', src: 'https://en.wikipedia.org/wiki/Dunder_Mifflin', srcName: 'Wikipedia: Dunder Mifflin' },
    { q: 'In The Big Bang Theory, where does Penny work as a waitress at the start?', opts: ['The Cheesecake Factory', 'Central Perk', 'MacLaren’s Pub', 'Café Nervosa'], a: 0, note: 'Penny waits tables at the Cheesecake Factory.', src: 'https://en.wikipedia.org/wiki/Penny_(The_Big_Bang_Theory)', srcName: 'Wikipedia: Penny' },
    { q: 'Parks and Recreation is set in which fictional town?', opts: ['Pawnee', 'Scranton', 'Springfield', 'Stars Hollow'], a: 0, note: 'The parks department is in Pawnee, Indiana.', src: 'https://en.wikipedia.org/wiki/Parks_and_Recreation', srcName: 'Wikipedia: Parks and Recreation' },
    { q: 'What is the bar called in How I Met Your Mother?', opts: ['MacLaren’s Pub', 'Central Perk', 'Paddy’s Pub', 'Cheers'], a: 0, note: 'The friends meet at MacLaren’s Pub.', src: 'https://en.wikipedia.org/wiki/MacLaren%27s_Pub', srcName: 'Wikipedia: MacLaren’s Pub' },
    { q: 'What is Kramer’s first name in Seinfeld?', opts: ['Cosmo', 'Newman', 'Jerry', 'George'], a: 0, note: 'Kramer’s first name is Cosmo.', src: 'https://en.wikipedia.org/wiki/Cosmo_Kramer', srcName: 'Wikipedia: Cosmo Kramer' },
    { q: 'Frasier Crane’s own sitcom is set in which city?', opts: ['Seattle', 'Boston', 'Chicago', 'Philadelphia'], a: 0, note: 'Frasier moves from Boston, the Cheers city, to Seattle.', src: 'https://en.wikipedia.org/wiki/Frasier', srcName: 'Wikipedia: Frasier' },
    { q: 'Where do the Golden Girls share a house?', opts: ['Miami', 'New York', 'Los Angeles', 'Phoenix'], a: 0, note: 'Dorothy, Blanche, Rose and Sophia live in Miami.', src: 'https://en.wikipedia.org/wiki/The_Golden_Girls', srcName: 'Wikipedia: The Golden Girls' },
    { q: 'The bar in Cheers is in which city?', opts: ['Boston', 'New York', 'Seattle', 'Chicago'], a: 0, note: 'Cheers is the Boston bar “where everybody knows your name”.', src: 'https://en.wikipedia.org/wiki/Cheers', srcName: 'Wikipedia: Cheers' },
    { q: 'In Schitt’s Creek, what was Johnny Rose’s video-store company called?', opts: ['Rose Video', 'Rose Apothecary', 'Rosebud Motel', 'Blouse Barn'], a: 0, note: 'Johnny ran Rose Video before the family moved to the motel. Rose Apothecary and the Rosebud Motel come later.', src: 'https://www.thecanadianencyclopedia.ca/en/article/schitts-creek', srcName: 'The Canadian Encyclopedia' },
    { q: 'Abbott Elementary is set in which city?', opts: ['Philadelphia', 'Chicago', 'Baltimore', 'Atlanta'], a: 0, note: 'Abbott Elementary is a Philadelphia public school.', src: 'https://en.wikipedia.org/wiki/Abbott_Elementary', srcName: 'Wikipedia: Abbott Elementary' },
    { q: 'What town do the Simpsons live in?', opts: ['Springfield', 'Shelbyville', 'Quahog', 'Pawnee'], a: 0, note: 'The Simpsons live in Springfield.', src: 'https://en.wikipedia.org/wiki/Springfield_(The_Simpsons)', srcName: 'Wikipedia: Springfield' }
  ];
  const ANIMAL = [
    { q: 'Kiwi are flightless birds found only in New Zealand. They are unusual among birds for a strong sense of what?', opts: ['Smell', 'Bright colour vision', 'Echolocation', 'Electricity'], a: 0, note: 'Te Ara: kiwi have nostrils at the tip of the beak and a powerful sense of smell. They do not rely on smell alone.', src: 'https://teara.govt.nz/en/kiwi/page-1', srcName: 'Te Ara: Kiwi' },
    { q: 'What is the Māori name for the little penguin, the world’s smallest penguin species?', opts: ['Kororā', 'Hoiho', 'Kea', 'Ruru'], a: 0, note: 'DOC: little penguins that breed in New Zealand are called kororā. Hoiho is the yellow-eyed penguin. Little penguins also live in Australia.', src: 'https://www.doc.govt.nz/nature/native-animals/birds/birds-a-z/penguins/', srcName: 'DOC: penguins' },
    { q: 'Which parrot lives only in New Zealand and is the one DOC describes in the South Island mountains?', opts: ['Kea', 'Kākāpō', 'Kākā', 'Tūī'], a: 0, note: 'DOC: kea live in alpine areas and forests across the South Island, and only in New Zealand. Kākāpō is also a New Zealand parrot, but it is flightless and not the mountain one.', src: 'https://www.doc.govt.nz/nature/native-animals/birds/birds-a-z/kea/', srcName: 'DOC: kea' },
    { q: 'Which New Zealand bird has a white tuft of feathers at its throat?', opts: ['Tūī', 'Kiwi', 'Pūkeko', 'Kea'], a: 0, note: 'The tūī is known for the white throat tuft.', src: 'https://en.wikipedia.org/wiki/T%C5%AB%C4%AB', srcName: 'Wikipedia: Tūī' },
    { q: 'What is the English name for ruru, which DOC’s conservation blog calls New Zealand’s only surviving native owl?', opts: ['Morepork', 'Kea', 'Kiwi', 'Tūī'], a: 0, note: 'DOC’s blog: the morepork is New Zealand’s only surviving native owl. The same bird is called a boobook in Tasmania.', src: 'https://blog.doc.govt.nz/2015/05/07/the-call-of-the-morepork/', srcName: 'DOC blog: morepork' },
    { q: 'Which dolphin species does Te Ara say is the only one confined to New Zealand waters?', opts: ['Hector’s dolphin', 'Orca', 'Common dolphin', 'Bottlenose dolphin'], a: 0, note: 'Te Ara: Hector’s dolphin is the only dolphin species confined to New Zealand waters. Māui dolphin is its North Island subspecies.', src: 'https://teara.govt.nz/en/dolphins', srcName: 'Te Ara: Dolphins' },
    { q: 'Pūkeko is the New Zealand name for which bird?', opts: ['Australasian swamphen', 'Kiwi', 'Tūī', 'Kea'], a: 0, note: 'In New Zealand the Australasian swamphen is called pūkeko.', src: 'https://en.wikipedia.org/wiki/Australasian_swamphen', srcName: 'Wikipedia: Australasian swamphen' },
    { q: 'What is the English name for pīwakawaka, the small bird that fans its tail?', opts: ['Fantail', 'Morepork', 'Kea', 'Tūī'], a: 0, note: 'Pīwakawaka is the New Zealand fantail.', src: 'https://www.doc.govt.nz/nature/native-animals/birds/birds-a-z/fantail-piwakawaka/', srcName: 'DOC: fantail' },
    { q: 'Which New Zealand parrot cannot fly?', opts: ['Kākāpō', 'Kea', 'Kākā', 'Tūī'], a: 0, note: 'The kākāpō is a large nocturnal flightless parrot. Kea and kākā can fly. The tūī is not a parrot.', src: 'https://en.wikipedia.org/wiki/K%C4%81k%C4%81p%C5%8D', srcName: 'Wikipedia: Kākāpō' },
    { q: 'DOC says one form of brown kiwi lives in Northland. Which is it?', opts: ['Northland brown kiwi', 'Haast tokoeka', 'Stewart Island tokoeka', 'Great spotted kiwi'], a: 0, note: 'DOC: brown kiwi live in the North Island. The four forms include the Northland brown kiwi, from Whakaangi in the north to Tāwharanui.', src: 'https://www.doc.govt.nz/nature/native-animals/birds/birds-a-z/kiwi/brown-kiwi/', srcName: 'DOC: brown kiwi' },
    { q: 'The tuatara looks a little like a lizard. What is it?', opts: ['A New Zealand reptile from its own ancient group', 'A kind of gecko', 'A skink', 'A turtle'], a: 0, note: 'Tuatara are reptiles found only in New Zealand. They are the last of the order Rhynchocephalia, not lizards.', src: 'https://en.wikipedia.org/wiki/Tuatara', srcName: 'Wikipedia: Tuatara' }
  ];
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(list, seed) { const a = list.slice(), r = rng(seed); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function head(em, who, sub, tag) {
    if (typeof root.xHead === 'function') return root.xHead(em, who, sub, tag);
    return `<div class="hd"><div class="av">${em}</div><div class="who"><b>${esc(who)}</b><small>${esc(sub)}</small></div><span class="tp">${esc(tag)}</span></div>`;
  }
  function styleFor(topic) { const T = root.TOPIC && root.TOPIC[topic]; return T ? `--c1:${T[3]};--c2:${T[4]}` : '--c1:#7c3aed;--c2:#ec4899'; }
  const mem = new Map();
  function matchState(id, round) {
    const seed = (hash(id + ':' + round) ^ 0x9e3779b9) >>> 0;
    const picks = shuffle(TILES, seed).slice(0, 4);
    const faces = shuffle(picks.concat(picks), seed ^ 0x85ebca6b).map(t => t.slice());
    return { kind: 'match', round, faces, open: [], locked: false, msg: 'Tap two pictures that match.', tone: '' };
  }
  function quizState(id, bank, round) {
    const list = bank === 'animal' ? ANIMAL : SITCOM;
    const qi = (hash(id) + round) % list.length;
    const order = shuffle(list[qi].opts.map((_, n) => n), hash(id + ':' + qi + ':' + round));
    return { kind: 'quiz', bank, round, qi, order, picked: null };
  }
  function ensure(i) {
    let st = mem.get(i.id);
    if (!st || st.cardKind !== i.kind) {
      st = i.kind === 'match' ? matchState(i.id, 0) : quizState(i.id, i.kind, 0);
      st.cardKind = i.kind;
      mem.set(i.id, st);
    }
    return st;
  }
  function matchHtml(i, st) {
    const tiles = st.faces.map((tile, n) => {
      const up = st.open.includes(n) || tile.done;
      const label = up ? tile[1] + (tile.done ? ', matched' : ', face up') : 'Face-down picture ' + (n + 1);
      return `<button type="button" class="pltile${up ? ' up' : ''}${tile.done ? ' match' : ''}" data-pl="tile" data-i="${n}" aria-pressed="${up ? 'true' : 'false'}" aria-label="${esc(label)}"${tile.done ? ' disabled' : ''}>${up ? `<img src="${esc(tile[2])}" alt="">` : '<span class="plback" aria-hidden="true">?</span>'}${up ? `<span class="plcap">${esc(tile[1])}</span>` : ''}</button>`;
    }).join('');
    const done = st.faces.every(t => t.done);
    return `${head('🧩', 'Picture match', 'Find the pairs. No timer.', 'Puzzle')}
      <div class="media"><img src="img/play/banner-match.svg" alt="Illustrated cards and New Zealand birds"></div>
      <div class="bd"><p class="plmsg${st.tone ? ' ' + st.tone : ''}" role="status">${esc(done ? 'You found every pair.' : st.msg)}</p>
      <div class="plgrid">${tiles}</div>
      <button type="button" class="btn plact" data-pl="replay">Shuffle again</button></div>`;
  }
  function quizHtml(i, st) {
    const list = st.bank === 'animal' ? ANIMAL : SITCOM;
    const q = list[st.qi];
    const answered = st.picked != null;
    const right = answered && st.picked === q.a;
    const opts = st.order.map(k => {
      const cls = !answered ? '' : k === q.a ? ' ok' : k === st.picked ? ' no' : '';
      return `<button type="button" class="plopt${cls}" data-pl="opt" data-k="${k}"${answered ? ' disabled' : ''}>${esc(q.opts[k])}</button>`;
    }).join('');
    const msg = !answered ? 'Pick one answer.' : right ? 'Yes. ' + q.note : 'Not this time. ' + q.note;
    const banner = st.bank === 'animal' ? 'img/play/banner-animal.svg' : 'img/play/banner-sitcom.svg';
    const alt = st.bank === 'animal' ? 'Illustrated New Zealand birds and a dolphin' : 'Illustrated lounge with a couch and mugs, not a real sitcom set';
    return `${head(st.bank === 'animal' ? '🥝' : '😂', st.bank === 'animal' ? 'Animal question' : 'Sitcom question', st.bank === 'animal' ? 'New Zealand animals, from DOC, Te Ara or Wikipedia' : 'Well-known sitcoms', 'Puzzle')}
      <div class="media"><img src="${banner}" alt="${esc(alt)}"></div>
      <div class="bd"><h3 class="xq">${esc(q.q)}</h3>
      <p class="plmsg${answered ? (right ? ' ok' : ' no') : ''}" role="status">${esc(msg)}</p>
      <div class="plopts" role="group" aria-label="Answers">${opts}</div>
      <button type="button" class="btn plact" data-pl="next">Another question</button>
      <p class="plsrc">Source: <a href="${esc(q.src)}" target="_blank" rel="noopener">${esc(q.srcName)}</a></p></div>`;
  }
  function zoomHtml(i) {
    return `${head('🌀', 'Zoomquilt', 'Still sketch. The picture opens here when you ask.', 'Discover')}
      <div class="media"><img src="img/play/zoomquilt.svg" alt="Our sketch of frames shrinking toward a small moon. Not the Zoomquilt painting."></div>
      <div class="bd"><h3>The Zoomquilt</h3>
      <p>Nikolaus Baumgarten, 2004, with other illustrators. The picture zooms in on its own. This card stays still.</p>
      <div class="xbtns"><button type="button" class="btn pri" data-art="zoom">Play Zoomquilt</button></div>
      <p class="plsrc"><a href="https://zoomquilt.org/" target="_blank" rel="noopener">zoomquilt.org</a></p></div>`;
  }
  function fallHtml(i) {
    return `${head('⬇️', 'Falling Falling', 'Still sketch. The artwork opens here when you ask.', 'Discover')}
      <div class="media"><img src="img/play/falling.svg" alt="Our still sketch of flat colour bands. Not the artwork."></div>
      <div class="bd"><h3>Falling Falling</h3>
      <p class="plwarn">Rafaël Rozendaal, 2011. It keeps moving, colours change, and it plays a looping sound. Nothing on this card moves or makes a sound.</p>
      <div class="xbtns"><button type="button" class="btn pri" data-art="fall">Play Falling Falling</button></div>
      <p class="plsrc"><a href="https://fallingfalling.com/" target="_blank" rel="noopener">fallingfalling.com</a> · Reinier Feijen wrote the code · sound by gloumouth1</p></div>`;
  }
  /* Twelve more discovery sites, added 21 Nov 2026. Cards stay still; the live site
     opens in the same in-app window as Zoomquilt. Two of these rotate into the feed each day. */
  const DISCOVER = [
    { key: 'zq2', title: 'Zoomquilt 2', emoji: '🌀', topic: 'learn', url: 'https://zoomquilt2.com/', host: 'zoomquilt2.com', live: 'Zooms on its own', img: 'img/play/zq2.svg', alt: 'Our sketch of nested frames. Not the Zoomquilt 2 painting.', blurb: 'A second collaborative infinitely zooming painting, 2007, with a new group of illustrators. This card stays still.', btn: 'Play Zoomquilt 2' },
    { key: 'arkadia', title: 'Arkadia', emoji: '🌿', topic: 'learn', url: 'https://arkadia.xyz/', host: 'arkadia.xyz', live: 'Zooms on its own', img: 'img/play/arkadia.svg', alt: 'Our still sketch of simple leaves. Not the Arkadia painting.', blurb: 'A lush botanical infinite zoom by Sophia Schomberg and Nikolaus Baumgarten, 2015. This card stays still.', btn: 'Play Arkadia' },
    { key: 'flowers', title: 'Infinite Flowers', emoji: '🌸', topic: 'learn', url: 'https://infiniteflowers.net/', host: 'infiniteflowers.net', live: 'Zooms on its own', img: 'img/play/flowers.svg', alt: 'Our still sketch of simple flowers. Not the Infinite Flowers painting.', blurb: 'Nikolaus Baumgarten’s 2023 infinite-zoom painting of flowers and plants. This card stays still.', btn: 'Play Infinite Flowers' },
    { key: 'hydromeda', title: 'Hydromeda', emoji: '🌺', topic: 'learn', url: 'https://hydromeda.org/', host: 'hydromeda.org', live: 'Zooms on its own. You can change the speed.', img: 'img/play/hydromeda.svg', alt: 'Our still sketch of simple colour shapes. Not the Hydromeda painting.', blurb: 'Sophia Schomberg’s infinite zoom through vivid botanical forms. You can change the speed once it is open. This card stays still.', btn: 'Play Hydromeda' },
    { key: 'organic', title: 'Organic City', emoji: '🏙️', topic: 'learn', url: 'https://organiccity.org/', host: 'organiccity.org', live: 'Zooms on its own', img: 'img/play/organic.svg', alt: 'Our still sketch of simple buildings. Not the Organic City painting.', blurb: 'A 2026 infinite zoom through a surreal cityscape, by Sophia Schomberg and Nikolaus Baumgarten. This card stays still.', btn: 'Play Organic City' },
    { key: 'worldzoom', title: 'World Zoom Quilt', emoji: '🧭', topic: 'learn', url: 'https://worldzoom.nikkki.net/', host: 'worldzoom.nikkki.net', live: 'A zoom you can drag', img: 'img/play/worldzoom.svg', alt: 'Our still sketch of a circle with four arrows. Not the World Zoom Quilt.', blurb: 'A multidirectional infinite zoom you can drag, by Nikolaus Baumgarten, 2019. This card stays still.', btn: 'Play World Zoom Quilt' },
    { key: 'patatap', title: 'Patatap', emoji: '🎹', topic: 'creative', url: 'https://patatap.com/', host: 'patatap.com', live: 'Tap to make shapes and notes', img: 'img/play/patatap.svg', alt: 'Our still sketch of three coloured circles. Not Patatap.', blurb: 'Tap the screen to make colours, shapes and notes.', warn: 'Warning: contains flashing images. Nothing on this card flashes or makes a sound.', btn: 'Play Patatap' },
    { key: 'silk', title: 'Silk', emoji: '✨', topic: 'creative', url: 'https://weavesilk.com/', host: 'weavesilk.com', live: 'Draw glowing threads', img: 'img/play/silk.svg', alt: 'Our still sketch of symmetrical curved lines. Not a Silk drawing.', blurb: 'Drag to paint soft, symmetrical glowing threads, by Yuri Vishnevsky. This card stays still.', btn: 'Play Silk' },
    { key: 'neon', title: 'Neon Flames', emoji: '🔥', topic: 'creative', url: 'https://29a.ch/sandbox/2011/neonflames/', host: '29a.ch', live: 'Draw neon fire trails', img: 'img/play/neon.svg', alt: 'Our still sketch of a neon-coloured curve. Not Neon Flames.', blurb: 'Draw drifting neon fire trails in the browser, by Jonas Wagner. This card stays still.', btn: 'Play Neon Flames' },
    { key: 'sand', title: 'This Is Sand', emoji: '🏜️', topic: 'creative', url: 'https://thisissand.com/', host: 'thisissand.com', live: 'Pour coloured sand', img: 'img/play/sand.svg', alt: 'Our still sketch of layered sand dunes. Not This Is Sand.', blurb: 'Pour coloured sand into slow, layered pictures. This card stays still.', btn: 'Play This Is Sand' },
    { key: 'windowswap', title: 'Window-Swap', emoji: '🪟', topic: 'learn', url: 'https://www.window-swap.com/', host: 'window-swap.com', live: 'A real window view, with sound once you open it', img: 'img/play/windowswap.svg', alt: 'Our still sketch of a window frame. Not a Window-Swap view.', blurb: 'Open a real window view somewhere in the world, with the sound of that place. This card stays still and silent.', btn: 'Open Window-Swap' },
    { key: 'earth', title: 'Earth wind map', emoji: '🌍', topic: 'learn', url: 'https://earth.nullschool.net/', host: 'earth.nullschool.net', live: 'A slowly moving map of wind and weather', img: 'img/play/earth.svg', alt: 'Our still sketch of a globe with wind lines. Not the Earth wind map.', blurb: 'A slowly moving map of wind, weather and ocean currents, by Cameron Beccario. This card stays still.', btn: 'Open Earth wind map' }
  ];
  const DISCOVER_BY = Object.fromEntries(DISCOVER.map(d => [d.key, d]));
  function discoHtml(d) {
    const warn = d.warn ? `<p class="plwarn">${esc(d.warn)}</p>` : '';
    return `${head(d.emoji, d.title, 'Still sketch. It opens here when you ask.', 'Discover')}
      <div class="media"><img src="${esc(d.img)}" alt="${esc(d.alt)}"></div>
      <div class="bd"><h3>${esc(d.title)}</h3>
      <p>${esc(d.blurb)}</p>${warn}
      <div class="xbtns"><button type="button" class="btn pri" data-art="${esc(d.key)}">${esc(d.btn)}</button></div>
      <p class="plsrc"><a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.host)}</a></p></div>`;
  }
  function render(i) {
    if (!i) return '';
    if (i.x === 'zoomq') return `<article class="card xc zoomq" data-id="${esc(i.id)}" data-topic="learn" style="${styleFor('learn')}">${zoomHtml(i)}</article>`;
    if (i.x === 'fallq') return `<article class="card xc fallq" data-id="${esc(i.id)}" data-topic="creative" style="${styleFor('creative')}">${fallHtml(i)}</article>`;
    if (i.x === 'artq' && DISCOVER_BY[i.art]) {
      const d = DISCOVER_BY[i.art];
      return `<article class="card xc artq" data-id="${esc(i.id)}" data-topic="${esc(d.topic)}" style="${styleFor(d.topic)}">${discoHtml(d)}</article>`;
    }
    if (i.x !== 'play') return '';
    const st = ensure(i);
    const topic = i.kind === 'sitcom' ? 'sitcoms' : i.kind === 'animal' ? 'nature' : 'kids';
    const body = st.kind === 'match' ? matchHtml(i, st) : quizHtml(i, st);
    return `<article class="card xc puzzle ${esc(i.kind)}" data-id="${esc(i.id)}" data-topic="${esc(topic)}" style="${styleFor(topic)}">${body}</article>`;
  }
  function paint(id) {
    const el = root.document && root.document.querySelector(`article[data-id="${(root.CSS && CSS.escape) ? CSS.escape(id) : id}"]`);
    if (!el) return;
    const st = mem.get(id); if (!st) return;
    el.outerHTML = render({ id, x: 'play', kind: st.cardKind, topic: st.bank === 'animal' ? 'nature' : st.cardKind === 'sitcom' ? 'sitcoms' : 'kids' });
  }
  function onTile(id, n) {
    const st = mem.get(id); if (!st || st.kind !== 'match' || st.locked) return;
    const tile = st.faces[n]; if (!tile || tile.done || st.open.includes(n)) return;
    st.open.push(n);
    if (st.open.length < 2) { st.msg = 'Now tap the picture that matches.'; st.tone = ''; paint(id); return; }
    const [a, b] = st.open;
    if (st.faces[a][0] === st.faces[b][0]) {
      st.faces[a].done = st.faces[b].done = true;
      st.open = [];
      st.msg = 'Yes — a pair of ' + st.faces[a][1] + '.';
      st.tone = 'ok';
      paint(id);
    } else {
      st.locked = true; st.msg = 'Not a pair. They will turn back.'; st.tone = 'no'; paint(id);
      setTimeout(() => { const cur = mem.get(id); if (!cur) return; cur.open = []; cur.locked = false; if (cur.tone === 'no') { cur.msg = 'Tap two pictures that match.'; cur.tone = ''; } paint(id); }, 700);
    }
  }
  function slots(n, pins, day) {
    const lo = Math.max(pins | 0, 2), spec = [], used = [];
    const add = (at, kind) => { if (at < lo || at > n) return; if (used.some(u => Math.abs(u - at) < 4)) return; used.push(at); spec.push({ at, kind }); };
    if (n < lo + 1) return spec;
    const other = day % 2 ? 'animal' : 'match';
    const first = day % 3 === 2 ? other : 'sitcom';
    add(lo + 1 + (day % 2), first);
    add(lo + 8, 'zoom');
    add(lo + 14, 'fall');
    if (n - lo >= 20) add(lo + 19, first === 'sitcom' ? other : 'sitcom');
    // Two of the twelve discovery sites a day, later in the feed so Zoomquilt and Falling Falling stay put.
    const da = DISCOVER[(day * 2) % DISCOVER.length].key;
    const db = DISCOVER[(day * 2 + 1) % DISCOVER.length].key;
    add(lo + 25, da);
    add(lo + 31, db);
    return spec;
  }
  function itemFor(kind, day, n) {
    if (kind === 'zoom') return { id: 'zoomq-' + day, x: 'zoomq', topic: 'learn', t: 'Zoomquilt' };
    if (kind === 'fall') return { id: 'fallq-' + day, x: 'fallq', topic: 'creative', t: 'Falling Falling' };
    if (DISCOVER_BY[kind]) {
      const d = DISCOVER_BY[kind];
      return { id: 'artq-' + d.key + '-' + day, x: 'artq', art: d.key, topic: d.topic, t: d.title };
    }
    const topic = kind === 'sitcom' ? 'sitcoms' : kind === 'animal' ? 'nature' : 'kids';
    const title = kind === 'sitcom' ? 'Sitcom question' : kind === 'animal' ? 'Animal question' : 'Picture match';
    return { id: 'play-' + kind + '-' + day + '-' + n, x: 'play', kind, topic, t: title };
  }
  function insert(order, nPins, now) {
    const out = (order || []).slice();
    const day = dayNum(now);
    const plan = slots(out.length, nPins, day);
    plan.sort((a, b) => b.at - a.at);
    plan.forEach((p, n) => out.splice(Math.min(p.at, out.length), 0, itemFor(p.kind, day, n)));
    return out;
  }
  root.ibPlay = { SITCOM, ANIMAL, TILES, DISCOVER, hash, insert, render, slots, quizState, matchState, grade(bank, qi, choice) { const list = bank === 'animal' ? ANIMAL : SITCOM; const q = list[qi]; return !!q && choice === q.a; } };
  if (!root.document) return;
  const prevCard = root.card;
  root.card = function (i) {
    if (i && (i.x === 'play' || i.x === 'zoomq' || i.x === 'fallq' || i.x === 'artq')) return render(i);
    return prevCard ? prevCard(i) : '';
  };
  const prevFest = root.festive;
  root.festive = function (order, nPins) { order = prevFest ? prevFest(order, nPins) : order; return insert(order, nPins); };
  // Live sites that publish no X-Frame-Options and no CSP frame-ancestors.
  // Checked 2026-11-07: fallingfalling.com and zoomquilt.org both HTTP 200 with neither header.
  // Checked 2026-11-21: the twelve added discovery sites also had neither header.
  // The frame is created only after a tap. Closing or hiding the page sets the frame to about:blank
  // so their canvas and looping sound unload. No top-navigation, so the framed page cannot take over Info Book.
  // If a site still frame-busts or the frame comes up blank, open it in a new tab instead.
  // 1.9.164 Version the iframe URL from this script's own ?v= so a cached /feed/tetris page is not reused.
  const VER = ((root.document && root.document.currentScript && /[?&]v=([^&]+)/.exec(root.document.currentScript.src)) || [])[1] || '';
  const gameUrl = name => name + (VER ? '?v=' + VER : '');
  const ART = {
    fall: { url: 'https://fallingfalling.com/', title: 'Falling Falling', host: 'fallingfalling.com', live: 'Moves, and plays a looping sound' },
    zoom: { url: 'https://zoomquilt.org/', title: 'Zoomquilt', host: 'zoomquilt.org', live: 'Zooms on its own' },
    zq2: { url: 'https://zoomquilt2.com/', title: 'Zoomquilt 2', host: 'zoomquilt2.com', live: 'Zooms on its own' },
    arkadia: { url: 'https://arkadia.xyz/', title: 'Arkadia', host: 'arkadia.xyz', live: 'Zooms on its own' },
    flowers: { url: 'https://infiniteflowers.net/', title: 'Infinite Flowers', host: 'infiniteflowers.net', live: 'Zooms on its own' },
    hydromeda: { url: 'https://hydromeda.org/', title: 'Hydromeda', host: 'hydromeda.org', live: 'Zooms on its own. You can change the speed.' },
    organic: { url: 'https://organiccity.org/', title: 'Organic City', host: 'organiccity.org', live: 'Zooms on its own' },
    worldzoom: { url: 'https://worldzoom.nikkki.net/', title: 'World Zoom Quilt', host: 'worldzoom.nikkki.net', live: 'A zoom you can drag' },
    patatap: { url: 'https://patatap.com/', title: 'Patatap', host: 'patatap.com', live: 'Tap to make shapes and notes' },
    silk: { url: 'https://weavesilk.com/', title: 'Silk', host: 'weavesilk.com', live: 'Draw glowing threads' },
    neon: { url: 'https://29a.ch/sandbox/2011/neonflames/', title: 'Neon Flames', host: '29a.ch', live: 'Draw neon fire trails' },
    sand: { url: 'https://thisissand.com/', title: 'This Is Sand', host: 'thisissand.com', live: 'Pour coloured sand' },
    windowswap: { url: 'https://www.window-swap.com/', title: 'Window-Swap', host: 'window-swap.com', live: 'A real window view, with sound once you open it' },
    earth: { url: 'https://earth.nullschool.net/', title: 'Earth wind map', host: 'earth.nullschool.net', live: 'A slowly moving map of wind and weather' },
    // Relative tetris.html is /feed/tetris.html. ship-pages.sh already sends SAMEORIGIN for /feed/tetris.html and /feed/tetris.
    tetris: { url: gameUrl('tetris'), title: 'Tetris', host: 'Info Book', live: 'Sound starts when you tap', local: true },
    // 1.9.147 Scrabble, our own page like Tetris. ship-pages.sh sends SAMEORIGIN for /feed/scrabble too.
    scrabble: { url: gameUrl('scrabble'), title: 'Scrabble', host: 'Info Book', live: 'Play the computer, pass the phone, or challenge family', local: true },
    // 1.9.156 Sugar Rush level 1 (Shane only for now; the page itself checks too). ship-pages.sh sends SAMEORIGIN for /feed/sugar-rush.
    sugar: { url: gameUrl('sugar-rush'), title: 'Sugar Rush', host: 'Info Book', live: 'Levels 1–31 · five new countries, from the Solomon Islands to Indonesia', local: true }
  };
  let artWin, artFrame, artScroll = 0, artHist = false, artBtn = null, artKind = null;
  const ART_KEY = 'ib-art-open';
  const TETRIS_LIVE_KEY = 'ib-tetris-live';
  const ART_TTL = 36 * 3600 * 1000;
  let sugarMinimised = false, sugarSkipPop = false, sugarDock = null;
  function artParts() {
    if (artWin) return;
    artWin = root.document.createElement('div');
    artWin.className = 'artwin';
    artWin.hidden = true;
    artWin.setAttribute('role', 'dialog');
    artWin.setAttribute('aria-modal', 'true');
    artWin.setAttribute('aria-labelledby', 'arttitle');
    artWin.innerHTML = '<div class="artbar"><button type="button" class="artx" data-artclose>Close</button><div class="artmeta"><strong id="arttitle"></strong><a class="artsite" target="_blank" rel="noopener"></a><span class="artlive"></span></div><button type="button" class="artfs" data-artfs hidden>Full screen</button></div><button type="button" class="artfsx" data-artfsx>Exit full screen</button><iframe class="artframe" title="" sandbox="allow-scripts allow-same-origin" allow="autoplay; fullscreen; encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
    root.document.body.appendChild(artWin);
    artFrame = artWin.querySelector('iframe');
    artFrame.setAttribute('allow', 'autoplay; fullscreen; encrypted-media');
    artFrame.addEventListener('load', onArtFrameLoad);
    artWin.addEventListener('click', e => {
      if (e.target.closest('[data-artclose]')) closeArt(false);
      else if (e.target.closest('[data-artfs]')) setFull(true);
      else if (e.target.closest('[data-artfsx]')) setFull(false);
      else if (e.target.closest('[data-artmin]')) minimiseArt();
    });
    ensureSugarDock();
    root.document.addEventListener('fullscreenchange', () => { if (!root.document.fullscreenElement && artWin) { artWin.classList.remove('artfull'); tellFrame(false); } });
    root.document.addEventListener('webkitfullscreenchange', () => { if (!root.document.webkitFullscreenElement && artWin) { artWin.classList.remove('artfull'); tellFrame(false); } });
  }
  // Full screen: real browser full screen where allowed (Android tab), otherwise the window just fills the screen without its bar (iPhone / installed PWA).
  // An installed PWA is already full screen, so requestFullscreen is skipped — Chrome would otherwise toast “drag from the top to exit full screen”.
  function isPwaShell() {
    try {
      const mm = q => !!(root.matchMedia && root.matchMedia(q).matches);
      return mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)') || root.navigator.standalone === true;
    } catch (e) { return false; }
  }
  function tellFrame(on) {
    if (!artFrame || !artFrame.contentWindow) return;
    try { artFrame.contentWindow.postMessage({ type: 'ib-artfull', on: !!on }, '*'); } catch (e) { }
  }
  function setFull(on) {
    if (!artWin) return;
    const d = root.document;
    artWin.classList.toggle('artfull', !!on);
    try {
      if (!isPwaShell()) {
        if (on) { const req = artWin.requestFullscreen || artWin.webkitRequestFullscreen; if (req) { const p = req.call(artWin); if (p && p.catch) p.catch(() => { }); } }
        else if (d.fullscreenElement || d.webkitFullscreenElement) { const ex = d.exitFullscreen || d.webkitExitFullscreen; if (ex) { const p = ex.call(d); if (p && p.catch) p.catch(() => { }); } }
      }
    } catch (e) { }
    tellFrame(on);
    if (artKind === 'tetris' || artKind === 'sugar') persistArt();
  }
  function storePut(st, k, v) { try { if (st) st.setItem(k, v); } catch (e) { } }
  function storeDel(st, k) { try { if (st) st.removeItem(k); } catch (e) { } }
  function markArt(kind) {
    try {
      const el = root.document && root.document.documentElement;
      if (!el) return;
      if (kind) el.dataset.ibArt = kind;
      else { try { delete el.dataset.ibArt; } catch (e) { el.dataset.ibArt = ''; } }
    } catch (e) { }
  }
  function isSugarOpen() { return !!(artWin && !artWin.hidden && artKind === 'sugar'); }
  function isSugarSession() { return artKind === 'sugar' && !!(isSugarOpen() || sugarMinimised); }
  function sugarFrameLoaded() {
    if (!artFrame) return false;
    const src = artFrame.getAttribute('src') || artFrame.src || '';
    return /sugar-rush/i.test(src) && src !== 'about:blank';
  }
  function ensureSugarDock() {
    if (sugarDock || !root.document || !root.document.body) return;
    sugarDock = root.document.createElement('button');
    sugarDock.type = 'button';
    sugarDock.className = 'sugar-dock';
    sugarDock.id = 'sugardock';
    sugarDock.hidden = true;
    sugarDock.setAttribute('data-sugar-dock', '1');
    sugarDock.textContent = '🍬 Sugar Rush · Continue';
    sugarDock.addEventListener('click', () => { restoreSugar(); });
    root.document.body.appendChild(sugarDock);
  }
  function showSugarDock(on) {
    ensureSugarDock();
    if (sugarDock) sugarDock.hidden = !on;
  }
  function persistArt() {
    if (!artWin) return;
    if (artKind === 'tetris') {
      if (artWin.hidden) return;
    } else if (artKind === 'sugar') {
      if (artWin.hidden && !sugarMinimised) return;
    } else return;
    const payload = JSON.stringify({ v: 1, kind: artKind, full: !!artWin.classList.contains('artfull'), minimised: artKind === 'sugar' && !!sugarMinimised, at: Date.now() });
    storePut(root.sessionStorage, ART_KEY, payload);
    storePut(root.localStorage, ART_KEY, payload);
    markArt(artKind);
    if (root.ibArt) root.ibArt._open = artKind;
  }
  function clearArtPersist() {
    storeDel(root.sessionStorage, ART_KEY);
    storeDel(root.localStorage, ART_KEY);
    storeDel(root.sessionStorage, TETRIS_LIVE_KEY);
    storeDel(root.localStorage, TETRIS_LIVE_KEY);
    markArt('');
    if (root.ibArt) root.ibArt._open = null;
  }
  function readArtPersist() {
    for (const st of [root.sessionStorage, root.localStorage]) {
      try {
        const o = JSON.parse((st && st.getItem(ART_KEY)) || 'null');
        if (o && o.v === 1 && (o.kind === 'tetris' || o.kind === 'sugar') && Date.now() - (o.at || 0) < ART_TTL) return o;
      } catch (e) { }
    }
    return null;
  }
  function isTetrisOpen() { return !!(artWin && !artWin.hidden && artKind === 'tetris'); }
  function tellSugar(type) {
    if (!artFrame || !artFrame.contentWindow) return;
    try { artFrame.contentWindow.postMessage({ type: type }, '*'); } catch (e) { }
  }
  function startParentSugarIntro(onDone) {
    root.ibSugarIntro = { status: 'playing' };
    const done = () => {
      root.ibSugarIntro = { status: 'done' };
      tellSugar('ib-sugar-intro-done');
      if (onDone) onDone();
    };
    if (typeof root.playSugarIntro === 'function') {
      root.playSugarIntro({ doc: root.document, root: root, host: artWin || root.document.body, onDone: done });
    } else {
      done();
    }
  }
  function minimiseArt() {
    if (artKind !== 'sugar' || !artWin) return;
    tellSugar('ib-sugar-pause');
    setFull(false);
    sugarMinimised = true;
    artWin.hidden = true;
    lockFeed(false);
    persistArt();
    showSugarDock(true);
    if (artHist) {
      sugarSkipPop = true;
      artHist = false;
      try { root.history.back(); } catch (e) { sugarSkipPop = false; }
    }
  }
  function restoreSugar() {
    if (artKind !== 'sugar' || !sugarFrameLoaded()) {
      openArt('sugar', null, { resume: true });
      return;
    }
    sugarMinimised = false;
    artWin.hidden = false;
    lockFeed(true);
    artWin.classList.add('artsugar');
    setFull(true);
    persistArt();
    showSugarDock(false);
    tellSugar('ib-sugar-resume');
    if (!artHist) { try { root.history.pushState({ ibArt: 'sugar' }, ''); artHist = true; } catch (e) { artHist = false; } }
  }
  function maybeRestoreArt() {
    if (isTetrisOpen() || isSugarOpen()) return true;
    if (artKind === 'sugar' && sugarMinimised && sugarFrameLoaded()) return true;
    const saved = readArtPersist();
    if (!saved) return false;
    if (saved.kind === 'sugar') {
      openArt('sugar', null, { resume: true });
      if (saved.minimised) minimiseArt();
      else if (saved.full) setFull(true);
      return isSugarOpen() || sugarMinimised;
    }
    openArt('tetris');
    if (saved.full) setFull(true);
    return isTetrisOpen();
  }
  function pauseFeed() {
    root.document.querySelectorAll('.media.vid.playing, .media.vid.armed').forEach(el => { try { root.pauseVid(el); } catch (e) { } });
  }
  function lockFeed(on) {
    const body = root.document.body;
    if (on) {
      artScroll = root.scrollY || root.document.documentElement.scrollTop || 0;
      body.dataset.artopen = '1';
      root.document.documentElement.style.overscrollBehavior = 'none'; // no pull-to-refresh while a game or window is open
      body.style.overscrollBehavior = 'none';
      body.style.position = 'fixed';
      body.style.top = '-' + artScroll + 'px';
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
    } else {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      root.document.documentElement.style.overscrollBehavior = '';
      body.style.overscrollBehavior = '';
      delete body.dataset.artopen;
      root.scrollTo(0, artScroll);
    }
  }
  function unloadArt() {
    if (!artFrame) return;
    const next = root.document.createElement('iframe');
    next.className = 'artframe';
    next.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    next.setAttribute('allow', 'autoplay; fullscreen; encrypted-media');
    next.referrerPolicy = 'strict-origin-when-cross-origin';
    next.addEventListener('load', onArtFrameLoad);
    artFrame.replaceWith(next);
    artFrame = next;
  }
  function onArtFrameLoad() {
    if (artWin && artWin.classList.contains('artfull')) tellFrame(true);
    checkArtEmbed();
  }
  // Cross-origin success throws when reading location. A blocked or busted frame often stays on about:blank.
  function checkArtEmbed() {
    const spec = artKind && ART[artKind];
    if (!spec || spec.local || !artFrame) return;
    const src = artFrame.getAttribute('src') || artFrame.src || '';
    if (!src || src === 'about:blank') return;
    let blocked = false;
    try {
      const w = artFrame.contentWindow;
      if (!w) blocked = true;
      else {
        const href = String(w.location.href || '');
        if (!href || href === 'about:blank' || href === 'about:srcdoc') blocked = true;
      }
    } catch (e) { blocked = false; }
    if (blocked) openArtInTab(spec);
  }
  function openArtInTab(spec) {
    if (!spec || !spec.url) return;
    try { if (typeof closeArt === 'function') closeArt(false); } catch (e) { }
    try { root.open(spec.url, '_blank', 'noopener,noreferrer'); } catch (e) { }
    try { if (typeof root.toast === 'function') root.toast(spec.title + ' opened in a new tab'); } catch (e) { }
  }
  function openArt(kind, btn, opts) {
    const spec = ART[kind]; if (!spec) return;
    opts = opts || {};
    artParts();
    pauseFeed();
    artBtn = btn || null;
    artWin.querySelector('#arttitle').textContent = spec.title;
    artWin.querySelector('.artlive').textContent = spec.local ? spec.host + ' · ' + spec.live : spec.live;
    const site = artWin.querySelector('.artsite');
    if (spec.local) { site.hidden = true; site.removeAttribute('href'); }
    else { site.hidden = false; site.href = spec.url; site.textContent = spec.host; }
    artFrame.title = spec.local ? spec.title : spec.title + ' on ' + spec.host;
    artKind = kind;
    let url = spec.url;
    const openId = opts && opts.open && /^g[0-9a-f]{16}$/.test(String(opts.open)) ? String(opts.open) : '';
    if (kind === 'scrabble' && openId) {
      // Put the game id on the iframe URL. sessionStorage is not always visible to a
      // sandboxed same-origin iframe on Android WebView, so the Your turn card was
      // opening Scrabble on the start screen instead of that game.
      try { root.sessionStorage.setItem('scrabble-open', openId); } catch (e) { }
      url = spec.url + (spec.url.indexOf('?') >= 0 ? '&' : '?') + 'open=' + encodeURIComponent(openId) + '#' + openId;
    }
    if (kind === 'sugar' && sugarFrameLoaded() && (sugarMinimised || isSugarOpen() || (opts && opts.resume))) {
      restoreSugar();
      return;
    }
    if (kind === 'sugar') {
      const q = spec.url.indexOf('?') >= 0 ? '&' : '?';
      url = (opts && opts.resume)
        ? spec.url + q + 'resume=1'
        : spec.url + q + 'afterIntro=1&fresh=' + Date.now();
    }
    if (kind === 'sugar') root.ibSugarClosing = false;
    if (kind === 'sugar' && !(opts && opts.resume)) {
      // Start the intro unmuted in this same tap, before the iframe finishes loading.
      artWin.classList.add('artsugar');
      artWin.hidden = false;
      lockFeed(true);
      startParentSugarIntro();
    } else if (kind === 'sugar') {
      root.ibSugarIntro = { status: 'done' };
    }
    artFrame.src = url;
    artWin.querySelector('[data-artfs]').hidden = !spec.local;
    artWin.hidden = false;
    lockFeed(true);
    artWin.classList.toggle('artsugar', kind === 'sugar');
    if (kind === 'tetris') {
      if (typeof root.setTetrisChrome === 'function') root.setTetrisChrome(true);
      else if (typeof setTetrisChrome === 'function') setTetrisChrome(true);
      // Opening tap is a user gesture: request Fullscreen API, or fall back to the existing fill-the-phone layout (iOS / PWA).
      setFull(true);
      persistArt();
    }
    // 1.9.211 Sugar Rush map fills the phone, same artfull path as Tetris.
    // Scrabble uses the same fill so the board and Cancel game are reachable on a phone.
    if (kind === 'sugar' || kind === 'scrabble') setFull(true);
    if (kind === 'sugar') persistArt();
    if (kind === 'scrabble' && openId) {
      const send = () => { try { if (artFrame && artFrame.contentWindow) artFrame.contentWindow.postMessage({ type: 'ib-scrabble-open', id: openId }, '*'); } catch (e) { } };
      artFrame.addEventListener('load', send, { once: true });
    }
    const close = artWin.querySelector('[data-artclose]');
    if (close) close.focus();
    if (!artHist) { try { root.history.pushState({ ibArt: kind }, ''); artHist = true; } catch (e) { artHist = false; } }
  }

  // 1.9.214 A clear Your turn notice in Info Book when a family Scrabble game is waiting.
  function scrabbleNotice() {
    let me = null;
    try { me = JSON.parse(root.localStorage.getItem('mf.member') || 'null'); } catch (e) { }
    if (!me || !me.tok || !me.id || me.pending || !root.document) return;
    const ctl = root.AbortController ? new AbortController() : null;
    const tm = ctl && setTimeout(() => ctl.abort(), 8000);
    root.fetch('https://shane-my-feed-data.phoneapp12.workers.dev/api/scrabble', { headers: { Authorization: 'Bearer ' + me.tok }, signal: ctl && ctl.signal })
      .then(r => { if (tm) clearTimeout(tm); return r.ok ? r.json() : null; })
      .then(data => {
        const n = data && data.yourTurn || 0;
        root.ibScrabbleTurn = n;
        root.document.querySelectorAll('[data-gplay="scrabble"]').forEach(el => { el.textContent = n ? 'Your turn' : 'Play'; });
        root.document.querySelectorAll('[data-art="scrabble"] span:last-child').forEach(el => { if (el.closest && el.closest('[data-gplay]')) return; el.textContent = n ? 'Play Scrabble · your turn' : 'Play Scrabble'; });
        let host = root.document.getElementById('scrayourhost');
        if (!host) {
          host = root.document.createElement('div');
          host.id = 'scrayourhost';
          const feed = root.document.getElementById('feed');
          if (!feed || !feed.parentNode) return;
          feed.parentNode.insertBefore(host, feed);
        }
        if (!n) { host.innerHTML = ''; return; }
        const g = (data.games || []).find(x => x.yourTurn && !x.over);
        const vsNames = g && g.players ? g.players.filter(p => !p.me && !p.resigned).map(p => p.name) : [];
        const vs = !vsNames.length ? '' : vsNames.length === 1 ? vsNames[0] : vsNames.length === 2 ? vsNames[0] + ' and ' + vsNames[1] : vsNames.slice(0, -1).join(', ') + ' and ' + vsNames[vsNames.length - 1];
        const gid = g && g.id && /^g[0-9a-f]{16}$/.test(g.id) ? g.id : '';
        let html = '<button type="button" class="scrayour" data-art="scrabble"' + (gid ? ' data-open="' + gid + '"' : '') + '><b>Your turn</b> in Scrabble' + (vs ? ' vs ' + vs : '') + '<small>' + (n > 1 ? n + ' games waiting · tap to play' : 'Tap to play') + '</small></button>';
        if (data.admin && gid) html += '<button type="button" class="scraycancel" data-scrcancel="' + gid + '">Cancel this game</button>';
        host.innerHTML = html;
      }).catch(() => { if (tm) clearTimeout(tm); });
  }
  function closeArt(fromPop) {
    if (!artWin || (artWin.hidden && !sugarMinimised)) return;
    const wasTetris = artKind === 'tetris';
    const wasScrabble = artKind === 'scrabble';
    const wasSugar = artKind === 'sugar';
    if (wasSugar) {
      root.ibSugarClosing = true;
      storePut(root.sessionStorage, 'ib-sugar-closing', '1');
      tellSugar('ib-sugar-exit');
    }
    setFull(false);
    unloadArt();
    artWin.hidden = true;
    artWin.classList.remove('artsugar');
    sugarMinimised = false;
    showSugarDock(false);
    root.ibSugarIntro = { status: 'idle' };
    artKind = null;
    lockFeed(false);
    if (wasTetris || wasSugar) clearArtPersist();
    if (wasScrabble) scrabbleNotice();
    if (typeof root.setTetrisChrome === 'function') root.setTetrisChrome(false);
    else if (typeof setTetrisChrome === 'function') setTetrisChrome(false);
    const back = artHist && !fromPop;
    artHist = false;
    if (back) { try { root.history.back(); } catch (e) { } }
    if (artBtn && artBtn.focus) artBtn.focus();
  }
  root.addEventListener('message', e => {
    const d = e && e.data;
    if (!d || !d.type) return;
    if (artFrame && e.source && e.source !== artFrame.contentWindow) {
      if (d.type === 'ib-tetris-close' || d.type === 'ib-sugar-close' || d.type === 'ib-sugar-minimise') return;
    }
    if (d.type === 'ib-sugar-minimise') {
      if (artKind === 'sugar') minimiseArt();
      return;
    }
    if (d.type !== 'ib-tetris-close' && d.type !== 'ib-sugar-close') return;
    if (d.type === 'ib-tetris-close' && !isTetrisOpen()) return;
    if (d.type === 'ib-sugar-close' && artKind !== 'sugar') return;
    closeArt(false);
  });
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && artWin && !artWin.hidden) { e.preventDefault(); closeArt(false); } });
  root.addEventListener('popstate', () => {
    if (sugarSkipPop) { sugarSkipPop = false; return; }
    if (artWin && !artWin.hidden) closeArt(true);
  });
  // 1.9.188: leaving Tetris open when Info Book is minimised. Sugar Rush now stays too, paused, so a resume picks up the same board.
  root.document.addEventListener('visibilitychange', () => {
    if (root.document.hidden) {
      if (isTetrisOpen()) { persistArt(); return; }
      if (isSugarSession()) { persistArt(); tellSugar('ib-sugar-pause'); return; }
      if (artWin && !artWin.hidden) closeArt(false);
      return;
    }
    maybeRestoreArt();
    if (isSugarOpen()) tellSugar('ib-sugar-resume');
  });
  root.addEventListener('pagehide', () => {
    if (isTetrisOpen() || isSugarSession()) { persistArt(); return; }
    unloadArt();
  });
  root.addEventListener('pageshow', () => { maybeRestoreArt(); if (isSugarOpen()) tellSugar('ib-sugar-resume'); });
  root.ibArt = { isTetris: isTetrisOpen, kind: () => (artWin && !artWin.hidden ? artKind : (sugarMinimised ? 'sugar' : null)), open: openArt, close: closeArt, persist: persistArt, restore: maybeRestoreArt, read: readArtPersist, minimise: minimiseArt };
  scrabbleNotice();
  if (typeof root.setInterval === 'function') root.setInterval(() => { if (!root.document.hidden) scrabbleNotice(); }, 60000);
  if (root.document && root.document.addEventListener) root.document.addEventListener('visibilitychange', () => { if (!root.document.hidden) scrabbleNotice(); });
  maybeRestoreArt();
  function cancelFamilyGame(id) {
    if (!/^g[0-9a-f]{16}$/.test(id || '')) return;
    if (!root.confirm || !root.confirm('Cancel this game for everyone?')) return;
    let me = null;
    try { me = JSON.parse(root.localStorage.getItem('mf.member') || 'null'); } catch (e) { }
    if (!me || !me.tok) return;
    const api = 'https://shane-my-feed-data.phoneapp12.workers.dev/api';
    const headers = { Authorization: 'Bearer ' + me.tok, 'Content-Type': 'application/json' };
    root.fetch(api + '/scrabble/' + id, { headers: { Authorization: 'Bearer ' + me.tok } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(v => root.fetch(api + '/scrabble/' + id + '/cancel', { method: 'POST', headers, body: JSON.stringify({ rev: v.rev }) }))
      .then(r => { if (!r.ok) throw new Error('cancel'); return r.json(); })
      .then(() => { scrabbleNotice(); })
      .catch(() => { try { root.alert('Could not cancel the game just now. Open Scrabble and try Cancel game there.'); } catch (e) { } });
  }
  root.document.addEventListener('click', e => {
    const c = e.target && e.target.closest && e.target.closest('[data-scrcancel]');
    if (c) { e.preventDefault(); e.stopPropagation(); cancelFamilyGame(c.getAttribute('data-scrcancel')); return; }
    const art = e.target && e.target.closest && e.target.closest('[data-art]');
    if (art) { e.preventDefault(); openArt(art.dataset.art, art, art.getAttribute('data-open') ? { open: art.getAttribute('data-open') } : undefined); return; }
    const b = e.target && e.target.closest && e.target.closest('[data-pl]');
    if (!b) return;
    const card = b.closest('article[data-id]'); if (!card) return;
    const id = card.dataset.id, st = mem.get(id); if (!st) return;
    if (b.dataset.pl === 'tile') onTile(id, +b.dataset.i);
    else if (b.dataset.pl === 'replay') { const next = matchState(id, st.round + 1); next.cardKind = 'match'; mem.set(id, next); paint(id); }
    else if (b.dataset.pl === 'opt') { if (st.picked != null) return; st.picked = +b.dataset.k; paint(id); }
    else if (b.dataset.pl === 'next') { const next = quizState(id, st.bank, st.round + 1); next.cardKind = st.cardKind; mem.set(id, next); paint(id); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
