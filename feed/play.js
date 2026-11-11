/* 1.9.109 In-feed puzzles and two hand-picked discovery cards.
   Original puzzles only. Zoomquilt and Falling Falling stay still on the card.
   A tap opens the live site in this app's window. Checked 7 Nov 2026: neither site
   sends X-Frame-Options or CSP frame-ancestors, and both draw inside a frame.
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
  function render(i) {
    if (!i) return '';
    if (i.x === 'zoomq') return `<article class="card xc zoomq" data-id="${esc(i.id)}" data-topic="learn" style="${styleFor('learn')}">${zoomHtml(i)}</article>`;
    if (i.x === 'fallq') return `<article class="card xc fallq" data-id="${esc(i.id)}" data-topic="creative" style="${styleFor('creative')}">${fallHtml(i)}</article>`;
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
    return spec;
  }
  function itemFor(kind, day, n) {
    if (kind === 'zoom') return { id: 'zoomq-' + day, x: 'zoomq', topic: 'learn', t: 'Zoomquilt' };
    if (kind === 'fall') return { id: 'fallq-' + day, x: 'fallq', topic: 'creative', t: 'Falling Falling' };
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
  root.ibPlay = { SITCOM, ANIMAL, TILES, hash, insert, render, slots, quizState, matchState, grade(bank, qi, choice) { const list = bank === 'animal' ? ANIMAL : SITCOM; const q = list[qi]; return !!q && choice === q.a; } };
  if (!root.document) return;
  const prevCard = root.card;
  root.card = function (i) {
    if (i && (i.x === 'play' || i.x === 'zoomq' || i.x === 'fallq')) return render(i);
    return prevCard ? prevCard(i) : '';
  };
  const prevFest = root.festive;
  root.festive = function (order, nPins) { order = prevFest ? prevFest(order, nPins) : order; return insert(order, nPins); };
  // Live sites that publish no X-Frame-Options and no CSP frame-ancestors.
  // Checked 2026-11-07: fallingfalling.com and zoomquilt.org both HTTP 200 with neither header.
  // The frame is created only after a tap. Closing or hiding the page sets the frame to about:blank
  // so their canvas and looping sound unload. No top-navigation, so the framed page cannot take over Info Book.
  const ART = {
    fall: { url: 'https://fallingfalling.com/', title: 'Falling Falling', host: 'fallingfalling.com', live: 'Moves, and plays a looping sound' },
    zoom: { url: 'https://zoomquilt.org/', title: 'Zoomquilt', host: 'zoomquilt.org', live: 'Zooms on its own' },
    // Relative tetris.html is /feed/tetris.html. ship-pages.sh already sends SAMEORIGIN for /feed/tetris.html and /feed/tetris.
    tetris: { url: 'tetris.html', title: 'Tetris', host: 'Info Book', live: 'Sound starts when you tap', local: true }
  };
  let artWin, artFrame, artScroll = 0, artHist = false, artBtn = null;
  function artParts() {
    if (artWin) return;
    artWin = root.document.createElement('div');
    artWin.className = 'artwin';
    artWin.hidden = true;
    artWin.setAttribute('role', 'dialog');
    artWin.setAttribute('aria-modal', 'true');
    artWin.setAttribute('aria-labelledby', 'arttitle');
    artWin.innerHTML = '<div class="artbar"><button type="button" class="artx" data-artclose>Close</button><div class="artmeta"><strong id="arttitle"></strong><a class="artsite" target="_blank" rel="noopener"></a><span class="artlive"></span></div></div><iframe class="artframe" title="" sandbox="allow-scripts allow-same-origin" allow="autoplay" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
    root.document.body.appendChild(artWin);
    artFrame = artWin.querySelector('iframe');
    artWin.addEventListener('click', e => { if (e.target.closest('[data-artclose]')) closeArt(false); });
  }
  function pauseFeed() {
    root.document.querySelectorAll('.media.vid.playing, .media.vid.armed').forEach(el => { try { root.pauseVid(el); } catch (e) { } });
  }
  function lockFeed(on) {
    const body = root.document.body;
    if (on) {
      artScroll = root.scrollY || root.document.documentElement.scrollTop || 0;
      body.dataset.artopen = '1';
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
      delete body.dataset.artopen;
      root.scrollTo(0, artScroll);
    }
  }
  function unloadArt() {
    if (!artFrame) return;
    const next = root.document.createElement('iframe');
    next.className = 'artframe';
    next.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    next.setAttribute('allow', 'autoplay');
    next.referrerPolicy = 'strict-origin-when-cross-origin';
    artFrame.replaceWith(next);
    artFrame = next;
  }
  function openArt(kind, btn) {
    const spec = ART[kind]; if (!spec) return;
    artParts();
    pauseFeed();
    artBtn = btn || null;
    artWin.querySelector('#arttitle').textContent = spec.title;
    artWin.querySelector('.artlive').textContent = spec.local ? spec.host + ' · ' + spec.live : spec.live;
    const site = artWin.querySelector('.artsite');
    if (spec.local) { site.hidden = true; site.removeAttribute('href'); }
    else { site.hidden = false; site.href = spec.url; site.textContent = spec.host; }
    artFrame.title = spec.local ? spec.title : spec.title + ' on ' + spec.host;
    artFrame.src = spec.url;
    artWin.hidden = false;
    lockFeed(true);
    const close = artWin.querySelector('[data-artclose]');
    if (close) close.focus();
    if (!artHist) { try { root.history.pushState({ ibArt: kind }, ''); artHist = true; } catch (e) { artHist = false; } }
  }
  function closeArt(fromPop) {
    if (!artWin || artWin.hidden) return;
    unloadArt();
    artWin.hidden = true;
    lockFeed(false);
    const back = artHist && !fromPop;
    artHist = false;
    if (back) { try { root.history.back(); } catch (e) { } }
    if (artBtn && artBtn.focus) artBtn.focus();
  }
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && artWin && !artWin.hidden) { e.preventDefault(); closeArt(false); } });
  root.addEventListener('popstate', () => { if (artWin && !artWin.hidden) closeArt(true); });
  root.document.addEventListener('visibilitychange', () => { if (root.document.hidden && artWin && !artWin.hidden) closeArt(false); });
  root.addEventListener('pagehide', unloadArt);
  root.document.addEventListener('click', e => {
    const art = e.target && e.target.closest && e.target.closest('[data-art]');
    if (art) { e.preventDefault(); openArt(art.dataset.art, art); return; }
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
