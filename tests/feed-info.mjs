import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

function load(file) {
  const ctx = { console, Intl, Date, Math, URL, Set, Map, Object, Number, String, Array, encodeURIComponent, decodeURIComponent };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  return ctx;
}
const play = load('feed/play.js').ibPlay;
const nz = load('feed/nz.js').ibNz;
const read = load('feed/read.js').ibRead;
const NOW = Date.parse('2026-11-06T20:00:00Z'); // 7 Nov 2026, 09:00 in Auckland

function gaps(order, ids) {
  const at = ids.map(kind => order.findIndex(x => x.x === kind || x.kind === kind));
  return at.filter(n => n >= 0);
}

// puzzles and discoveries
for (const bank of [play.SITCOM, play.ANIMAL]) {
  const seen = new Set();
  for (const q of bank) {
    assert.strictEqual(q.opts.length, 4, q.q);
    assert.ok(q.a >= 0 && q.a < 4);
    assert.strictEqual(new Set(q.opts).size, 4, q.q);
    assert.ok(q.note && q.src.startsWith('https://'), q.q);
    assert.ok(!seen.has(q.q));
    seen.add(q.q);
    assert.strictEqual(play.grade(bank === play.ANIMAL ? 'animal' : 'sitcom', bank.indexOf(q), q.a), true);
    assert.strictEqual(play.grade(bank === play.ANIMAL ? 'animal' : 'sitcom', bank.indexOf(q), (q.a + 1) % 4), false);
  }
}
assert.strictEqual(play.SITCOM[0].opts[0], 'Central Perk');
assert.strictEqual(play.ANIMAL.find(q => q.opts.includes('Kororā')).opts[0], 'Kororā');
assert.ok(!/sport|rugby|nude|bill|election/i.test(JSON.stringify(play.SITCOM.concat(play.ANIMAL))));

const feed = Array.from({ length: 40 }, (_, n) => ({ id: 'p' + n, t: 'Post ' + n }));
for (const day of [0, 1, 2]) {
  const when = day * 864e5;
  const out = play.insert(feed, 2, when);
  const specials = out.filter(x => x.x === 'play' || x.x === 'zoomq' || x.x === 'fallq' || x.x === 'tetq');
  assert.ok(specials.some(x => x.kind === 'sitcom' || x.x === 'play' && x.kind === 'sitcom'), 'sitcom puzzle each day');
  assert.strictEqual(specials.filter(x => x.x === 'zoomq').length, 1);
  assert.strictEqual(specials.filter(x => x.x === 'fallq').length, 1);
  assert.strictEqual(specials.filter(x => x.x === 'tetq').length, 1);
  const idx = specials.map(s => out.indexOf(s));
  assert.ok(Math.min(...idx) >= 2);
  for (let i = 1; i < idx.length; i++) assert.ok(idx[i] - idx[i - 1] >= 4, 'spaced ' + idx);
}
const zoom = play.render({ id: 'zoomq-1', x: 'zoomq' });
const fall = play.render({ id: 'fallq-1', x: 'fallq' });
const tet = play.render({ id: 'tetq-1', x: 'tetq' });
for (const html of [zoom, fall, tet]) {
  assert.ok(!/<audio|<iframe|autoplay/i.test(html));
  assert.ok(!/boredbutton|cloudhiker/i.test(html));
}
assert.ok(zoom.includes('https://zoomquilt.org/'));
assert.ok(zoom.includes('data-art="zoom"'));
assert.ok(!/isn’t part of Zoomquilt/.test(zoom));
assert.ok(zoom.includes('Nikolaus Baumgarten'));
assert.ok(fall.includes('https://fallingfalling.com/'));
assert.ok(fall.includes('data-art="fall"'));
assert.ok(/looping sound/i.test(fall) && /keeps moving/i.test(fall));
assert.ok(/Rafaël Rozendaal/.test(fall));
assert.ok(!/isn’t part of this artwork/.test(fall));
assert.ok(fall.includes('img/play/falling.svg'));
assert.ok(!fall.includes('2011-falling-falling.png'));
assert.ok(tet.includes('data-art="tet"'));
assert.ok(tet.includes('img/play/tetris.svg'));
assert.ok(/No sign-in/.test(tet) && /stays still/.test(tet));
assert.ok(!/cursor\.com/.test(tet));
assert.ok(!tet.includes('tetris.html'));

function loadTetris() {
  const ctx = { console, Math, Object, Number, String, Array, setTimeout, parseInt, Date };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('feed/tetris.js', 'utf8'), ctx, { filename: 'feed/tetris.js' });
  return ctx.Tetris;
}
const tetGame = loadTetris();
assert.strictEqual(tetGame.dropInterval(1), 800);
assert.ok(tetGame.dropInterval(30) >= 60);
const spun = tetGame.rotateCW(tetGame.rotateCW(tetGame.rotateCW(tetGame.rotateCW(tetGame.SHAPES[1]))));
assert.deepStrictEqual(spun, tetGame.SHAPES[1]);
const gMove = tetGame.newGame();
gMove.piece = { t: 4, m: [[4, 4], [4, 4]], x: 4, y: 0 };
tetGame.act(gMove, 'left');
assert.strictEqual(gMove.piece.x, 3);
assert.strictEqual(tetGame.collides(gMove.board, gMove.piece.m, -1, 0), true);
const gClear = tetGame.newGame();
gClear.board = tetGame.emptyBoard();
for (let c = 0; c < 9; c++) gClear.board[19][c] = 1;
gClear.piece = { t: 4, m: [[4]], x: 9, y: 19 };
gClear.next = 4;
gClear.level = 1;
tetGame.lockPiece(gClear);
assert.strictEqual(gClear.lines, 1);
assert.strictEqual(gClear.score, 100);
assert.ok(gClear.popup.startsWith('Single'));
assert.ok(gClear.board[19].every(v => v === 0));
const gTet = tetGame.newGame();
gTet.board = tetGame.emptyBoard();
for (let r = 16; r < 20; r++) for (let c = 0; c < 9; c++) gTet.board[r][c] = 2;
gTet.piece = { t: 1, m: [[1], [1], [1], [1]], x: 9, y: 16 };
gTet.next = 4;
gTet.level = 1;
tetGame.lockPiece(gTet);
assert.strictEqual(gTet.lines, 4);
assert.strictEqual(gTet.score, 800);
assert.ok(gTet.popup.startsWith('TETRIS!'));
const gHold = tetGame.newGame();
const held = gHold.piece.t;
gHold.hold = 0;
gHold.canHold = true;
tetGame.act(gHold, 'hold');
assert.strictEqual(gHold.hold, held);
assert.strictEqual(gHold.canHold, false);

// TV and garden filters, from labels seen on the live feed
assert.strictEqual(nz.neon({ src: 'yt-neon', sn: 'Neon NZ', t: 'The Good Daughter' }), true);
assert.strictEqual(nz.drop({ src: 'mentalfloss', sn: 'Mental Floss', t: 'Why Neon Signs Were So Common on Route 66', url: 'https://www.mentalfloss.com/history/neon-route-66' }), false);
assert.strictEqual(nz.tvDrop({ src: 'nz-tvg2', kind: 'tv', url: 'https://www.tvnz.co.nz/', where: 'TVNZ 2', t: 'The Big Bang Theory' }), false);
assert.strictEqual(nz.tvDrop({ src: 'tvm-us', kind: 'tv', url: 'https://www.cbs.com/shows/elsbeth/', where: 'CBS' }), true);
assert.strictEqual(nz.tvDrop({ src: 'tvm-web', kind: 'tv', url: 'https://www.crave.ca/en/series/i-kill-the-bear-62120', where: 'Crave' }), true);
assert.strictEqual(nz.tvDrop({ src: 'tvm-prem', kind: 'tv', url: 'https://www.bbc.co.uk/programmes/m0033jdb', where: 'BBC iPlayer' }), true);
assert.strictEqual(nz.tvDrop({ src: 'you-tvmaze', kind: 'tv', url: 'https://www.tvmaze.com/shows/1', t: 'Friends' }), false);
assert.strictEqual(nz.watchDrop({ plat: 'Netflix', pk: 'nfx', url: 'https://www.netflix.com/title/1', t: 'Taskmaster' }), true);
assert.strictEqual(nz.watchDrop({ plat: 'TVNZ+', pk: 'tnz', url: 'https://www.tvnz.co.nz/tvseries/ludwig' }), false);
assert.strictEqual(nz.watchDrop({ plat: 'ThreeNow', url: 'https://www.threenow.co.nz/shows/step-brothers/mac_10131162' }), false);
const stan = { id: 'tvm3803006', t: 'Unskilled Adult', s: 'New episode tomorrow · S1 E3 · Stan. After years of successfully mucking around for a living, Hamish Blake has realised when it comes to practical skills, he doesn\'t have many.', sn: 'New on streaming', src: 'tvm-web', kind: 'tv', where: 'Stan', url: 'https://www.stan.news/hamish-blake-becomes-useful-in-the-stan-original-unskilled-adult', topic: 'sitcoms' };
const stanPin = Object.assign({}, stan, { pin: true, src: '' });
const stanShare = { id: 'share-stan', t: stan.t, s: stan.s, sn: stan.sn, src: stan.src, kind: stan.kind, where: stan.where, url: stan.url, topic: stan.topic, _share: { snap: stan } };
const stanCache = { id: stan.id, t: stan.t, s: stan.s, sn: stan.sn, src: stan.src, kind: stan.kind, where: stan.where, url: stan.url, topic: stan.topic };
const onTvnz = { id: 'nz-unskilled', t: 'Unskilled Adult', s: 'Tonight 8:30pm · TVNZ 2', sn: 'On NZ TV tonight (TVNZ & Three)', src: 'nz-tvg2', kind: 'tv', where: 'TVNZ 2', url: 'https://www.tvnz.co.nz/shows/unskilled-adult', topic: 'sitcoms' };
const neonCard = { id: 'neon-stream', t: 'Break Clause', s: 'New series · Neon.', sn: 'New on streaming', src: 'tvm-web', kind: 'tv', where: 'Neon', url: 'https://www.neontv.co.nz/break-clause', topic: 'sitcoms' };
const neonClip = { src: 'yt-neon', sn: 'Neon NZ', kind: 'video', t: 'The Good Daughter | Official Trailer | Neon', url: 'https://www.youtube.com/watch?v=UF8SUUnT6UM', topic: 'sitcoms' };
for (const item of [stan, stanPin, stanShare, stanCache, neonCard, neonClip]) assert.strictEqual(nz.drop(item), true, item.id || item.t);
assert.strictEqual(nz.drop(onTvnz), false);
const nbc = { id: 'ytREHUssPBsZk', t: 'St. Denis Medical Season 3 | Official Trailer | NBC', s: '', sn: 'NBC', src: 'yt-nbc', kind: 'video', url: 'https://www.youtube.com/watch?v=REHUssPBsZk', vid: 'REHUssPBsZk', topic: 'sitcoms' };
const dogs = { id: 'yth_e5npg-ibE', t: 'Top 5 Dogs of the Week', s: '', sn: 'WeRateDogs', src: 'cosy-weratedogs', kind: 'video', url: 'https://www.youtube.com/watch?v=h_e5npg-ibE', vid: 'h_e5npg-ibE', topic: 'dogs' };
for (const item of [nbc, Object.assign({}, nbc, { pin: true, src: '' }), { id: 'share-nbc', t: nbc.t, s: nbc.s, sn: nbc.sn, src: nbc.src, kind: nbc.kind, url: nbc.url, vid: nbc.vid, topic: nbc.topic, _share: { snap: nbc } }]) assert.strictEqual(nz.drop(item), true, item.id);
assert.strictEqual(nz.drop(dogs), false);
assert.strictEqual(nz.drop({ src: 'yt-fox', sn: 'FOX', kind: 'video', t: 'Animal Control clip', url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', vid: 'aaaaaaaaaaa', topic: 'sitcoms' }), true);
assert.strictEqual(nz.keptItems([nbc, dogs, onTvnz]).map(i => i.id).join(','), 'yth_e5npg-ibE,nz-unskilled');
assert.deepStrictEqual(nz.keptItems([stanPin, onTvnz, { id: 'fw', pin: true, t: 'Fireworks' }]).map(i => i.id), ['nz-unskilled', 'fw']);
assert.strictEqual(nz.keptItems([stanCache]).length, 0);
assert.strictEqual(nz.watchDrop({ plat: 'Neon', pk: 'neon', url: 'https://www.neontv.co.nz/show' }), true);
assert.strictEqual(nz.drop({ x: 'watch', w: { plat: 'Neon', pk: 'neon', url: 'https://www.neontv.co.nz/x' } }), true);

assert.strictEqual(nz.gardenDrop({ topic: 'garden', src: 'gw', t: 'BBC Gardeners’ World Spring Fair 2027', url: 'https://www.gardenersworld.com/x' }, NOW), true);
assert.strictEqual(nz.gardenDrop({ topic: 'garden', src: 'yt-epic', t: 'I tricked garlic into thinking it’s winter', url: 'https://www.youtube.com/watch?v=1' }, NOW), true);
assert.strictEqual(nz.gardenDrop({ topic: 'garden', src: 'yt-gardenau', t: 'Save Seed in Spring', url: 'https://www.youtube.com/watch?v=2' }, NOW), true);
assert.strictEqual(nz.gardenDrop({ topic: 'garden', src: 'kings-sow', t: 'What to Plant in Autumn in New Zealand', url: 'https://www.kingsseeds.co.nz/blogs/sowing-and-growing/what-to-plant-in-autumn' }, NOW), true);
assert.strictEqual(nz.gardenDrop({ topic: 'garden', src: 'yates', t: 'Winter is Rose Planting Season', url: 'https://www.yates.co.nz/rose' }, NOW), true);
assert.strictEqual(nz.gardenDrop({ topic: 'garden', src: 'kings-veg', t: 'How To Grow Garlic In NZ', url: 'https://www.kingsseeds.co.nz/garlic' }, NOW), false);
assert.strictEqual(nz.gardenDrop({ topic: 'garden', src: 'nz-tui-guides', t: 'November Gardening Guide', url: 'https://tuigarden.co.nz/november' }, NOW), false);
assert.strictEqual(nz.gardenDrop({ topic: 'garden', src: 'nz-tui-qa', t: 'What month can I plant spring onions?', url: 'https://tuigarden.co.nz/qa' }, NOW), false);
assert.strictEqual(nz.gardenDrop({ topic: 'garden', src: 'tips', t: 'Northland garden, November' }, NOW), false);
assert.strictEqual(nz.gardenDrop({ topic: 'garden', src: 'nz-sarahgardener', t: 'Garden list for October', url: 'https://sarahthegardener.co.nz/october' }, NOW), true);
assert.strictEqual(nz.gardenDrop({ cat: 'garden', mine: 1, topic: 'life', t: 'Bare-root time', src: 'myapp-garden' }, NOW), false);

// cinema: only current Whangārei sessions, family ratings, no ticket links, no showtime text
const cinema = {
  name: 'Event Cinemas Whangārei', address: '18 James Street',
  movies: [
    { id: 1, title: 'Wicker', rating: 'R16', soon: false, poster: 'https://cdn.eventcinemas.co.nz/cdn/resources/movies/1/images/large.jpg', url: 'https://www.eventcinemas.co.nz/movie/wicker', sessions: [{ t: '2026-11-07T20:40', url: 'https://www.eventcinemas.co.nz/orders/tickets#sessionId=1' }] },
    { id: 2, title: 'Past Film', rating: 'G', soon: false, poster: 'https://cdn.eventcinemas.co.nz/cdn/resources/movies/2/images/large.jpg', url: 'https://www.eventcinemas.co.nz/movie/past', sessions: [{ t: '2026-11-06T10:00', url: 'https://www.eventcinemas.co.nz/orders/tickets#sessionId=2' }] },
    { id: 3, title: 'Soon Only', rating: 'PG', soon: true, poster: 'https://cdn.eventcinemas.co.nz/cdn/resources/movies/3/images/large.jpg', url: 'https://www.eventcinemas.co.nz/movie/soon', sessions: [] },
    { id: 4, title: 'Wildwood', rating: 'M', soon: false, poster: 'https://cdn.eventcinemas.co.nz/cdn/resources/movies/4/images/large.jpg', url: 'https://www.eventcinemas.co.nz/movie/wildwood', sessions: [{ t: '2026-11-07T12:40', url: 'https://www.eventcinemas.co.nz/orders/tickets#sessionId=4' }] },
    { id: 5, title: 'Auckland Only', rating: 'PG', soon: false, poster: 'https://cdn.eventcinemas.co.nz/cdn/resources/movies/5/images/large.jpg', url: 'https://www.eventcinemas.co.nz/movie/akl', sessions: [] }
  ]
};
const films = nz.currentFilms(cinema, NOW);
assert.strictEqual(films.map(f => f.title).join('|'), 'Wildwood');
assert.ok(films[0].link.includes('/movie/wildwood'));
assert.ok(!films[0].link.includes('/orders/'));
assert.strictEqual(films[0].sessions, 'https://www.eventcinemas.co.nz/cinema/whangarei/sessions');
assert.strictEqual(nz.currentFilms({ name: 'Event Cinemas Auckland', address: 'Queen Street', movies: cinema.movies }, NOW).length, 0);
const card = nz.cineCard({ id: 'cine-4', film: films[0] });
assert.ok(!/\/orders\//.test(card));
assert.ok(!/T\d\d:\d\d/.test(card));
assert.ok(card.includes('18 James Street'));
assert.ok(card.includes(films[0].poster));
const picked = nz.pickFilm(films.concat([{ ...films[0], id: 9, title: 'Other' }]), 1);
assert.strictEqual(picked.title, 'Other');
const mixed = nz.insertCinema(play.insert(feed, 2, NOW), 2, films[0], NOW);
const cineAt = mixed.findIndex(x => x.x === 'cine');
assert.ok(cineAt >= 2);
for (const j of [-1, 1]) {
  const n = mixed[cineAt + j];
  if (n) assert.ok(!['play', 'zoomq', 'fallq'].includes(n.x));
}

// reading time
assert.strictEqual(read.creditMs(true, false, 800), 0);
assert.strictEqual(read.creditMs(false, true, 10000), 0);
assert.strictEqual(read.creditMs(true, true, 5000), 0);
assert.strictEqual(read.creditMs(true, true, 1000), 1000);
assert.strictEqual(read.articleOk('short'), false);
assert.strictEqual(read.articleOk('x'.repeat(90), { video: true }), false);
assert.strictEqual(read.articleOk('x'.repeat(90)), true);
let m = read.blank();
m = read.note(m, { id: 'fast', topic: 'sitcoms', ms: 2000, active: true }, NOW);
m = read.finish(m, 'fast', NOW);
assert.ok(!m.items.fast, 'fast scroll is not stored');
m = read.note(m, { id: 'read', topic: 'sitcoms', ms: 20000, active: true }, NOW);
m = read.finish(m, 'read', NOW);
assert.strictEqual(m.items.read.sec, 20000);
m = read.note(m, { id: 'read', topic: 'sitcoms', ms: 200000, active: true }, NOW);
m = read.finish(m, 'read', NOW);
assert.strictEqual(m.items.read.sec, 120000, 'repeat visits cap');
const other = read.blank();
let o = read.note(other, { id: 'n', topic: 'nature', ms: 30000, active: true }, NOW);
o = read.finish(o, 'n', NOW);
assert.ok(!m.items.n && o.items.n, 'members do not share a store');
const away = read.note(m, { id: 'off', topic: 'sitcoms', ms: 60000, active: true, away: true }, NOW);
assert.ok(!away.items.off, 'away time is not reading');
const idle = read.note(m, { id: 'idle', topic: 'sitcoms', ms: 60000, active: false }, NOW);
assert.ok(!idle.items.idle);
const freshBoost = read.boost(m, 'sitcoms', NOW);
assert.ok(freshBoost > 0.2 && freshBoost <= 0.22);
const aged = read.blank();
aged.items.old = { sec: 90000, at: NOW - 21 * 864e5, topic: 'sitcoms' };
const half = read.boost(aged, 'sitcoms', NOW);
assert.ok(Math.abs(half - 0.11) < 0.015, half);
assert.ok(read.factor(0.3, 0.22) < 0.4, 'a thumbs-down still outweighs reading');
assert.ok(read.factor(2.5, 0.22) <= 2.5);
const src = fs.readFileSync('feed/read.js', 'utf8');
assert.ok(src.includes("ls.get(KEY") && src.includes('redraws: false'));
assert.ok(src.includes('(root.scrollY || 0) < 8'), 'a startup repaint only happens before scrolling');
assert.ok(!src.includes('finish(model, id') || !/function flush[\s\S]{0,400}draw\(/.test(src));

const many = read.blank();
for (let i = 0; i < 6; i++) many.items['i' + i] = { sec: 120000, at: NOW, topic: 'dogs' };
assert.strictEqual(read.boost(many, 'dogs', NOW), 0.22);

const nzVid = load('feed/nz.js').ibNz;
assert.strictEqual(nzVid.videoFate({ vid: 'dQw4w9WgXcQ', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }), 'full');
assert.strictEqual(nzVid.videoFate({ url: 'https://www.youtube.com/shorts/abcdefghijk' }), 'full');
assert.strictEqual(nzVid.videoFate({ url: 'https://vimeo.com/123456789' }), 'full');
assert.strictEqual(nzVid.videoFate({ url: 'https://cdn.example.com/clip.mp4' }), 'full');
assert.strictEqual(nzVid.videoFate({ url: 'https://www.tiktok.com/@name/video/1234567890123456789' }), 'drop');
assert.strictEqual(nzVid.videoFate({ url: 'https://www.instagram.com/reel/AbCdEf/' }), 'drop');
assert.strictEqual(nzVid.videoFate({ url: 'https://www.facebook.com/page/videos/1234567890/' }), 'drop');
assert.strictEqual(nzVid.videoFate({ url: 'https://v.redd.it/abcdefghij' }), 'drop');
assert.strictEqual(nzVid.videoFate({ kind: 'video', url: 'https://example.com/not-a-player' }), 'drop');
assert.strictEqual(nzVid.videoFate({ kind: 'photo', img: 'https://example.com/a.jpg', url: 'https://example.com/story' }), 'photo');
const rowed = nzVid.presentVideos([
  { id: 'a' },
  { x: 'row', k: 'vid', items: [{ id: 'v1', vid: 'dQw4w9WgXcQ' }, { id: 'v2', vid: 'abcdefghijk' }, { id: 'v3', url: 'https://www.tiktok.com/@a/video/1234567890123' }] },
  { x: 'row', k: 'ani', items: [{ id: 'p1', img: 'a' }, { id: 'p2', img: 'b' }, { id: 'p3', img: 'c' }, { id: 'bad', url: 'https://v.redd.it/zzzzzzzzzz' }] }
]);
assert.ok(!rowed.some(x => x.x === 'row' && x.k === 'vid'), 'no narrow video row');
assert.ok(rowed.some(x => x.id === 'v1' && !x.x));
assert.ok(!rowed.some(x => x.id === 'v3'));
const ani = rowed.find(x => x.x === 'row' && x.k === 'ani');
assert.ok(ani && ani.items.every(it => it.id !== 'bad'));
assert.strictEqual(ani.items.length, 3);

const sights = load('feed/sights.js').ibSights;
assert.strictEqual([].slice.call(sights.TOPICS).join(','), 'illusions,odd,colour,looks');
assert.strictEqual(sights.ITEMS.length, 8);
const seenTopics = new Set(sights.ITEMS.map(i => i.topic));
assert.strictEqual(seenTopics.size, 4);
for (const i of sights.ITEMS) {
  assert.ok(i.url.startsWith('https://'), i.key);
  assert.ok(!/reddit|stan\.|neon|nbc|\/orders\//i.test(i.url + i.t + i.s), i.key);
  assert.ok(!/open today|tickets from|admission/i.test(i.s), i.key);
  const img = sights.pic(i.file);
  assert.ok(img.includes('Special:FilePath') && img.includes('width=1200'), i.key);
}
const hundert = sights.ITEMS.find(i => i.key === 'hundert');
assert.ok(/Kawakawa/.test(hundert.t) && /not the art centre in Whangārei/.test(hundert.s));
assert.ok(!/Dent Street/.test(hundert.t + hundert.s));
assert.ok(hundert.url.includes('Kawakawa'));
const day0 = sights.cards(0);
assert.strictEqual(day0.length, 2);
assert.notStrictEqual(day0[0].topic, day0[1].topic);
assert.ok(day0.every(c => c.img && c.src === 'sight-commons' && c.kind === 'photo'));
const placed = sights.insert(Array.from({ length: 40 }, (_, n) => ({ id: 'p' + n, t: 'Post ' + n })), 2, 0);
const sightsIn = placed.filter(x => x.src === 'sight-commons');
assert.strictEqual(sightsIn.length, 2);
const at = sightsIn.map(s => placed.indexOf(s));
assert.ok(at[0] >= 2 && at[1] - at[0] >= 4, at.join(','));
const appSrc = fs.readFileSync('feed/app.js', 'utf8');
for (const id of sights.TOPICS) assert.ok(appSrc.includes("'" + id + "'"), id);
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('sights.js?v=1.9.112'));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'sights.js?v=' + VERSION"));
const ship = fs.readFileSync('tools/ship-pages.sh', 'utf8');
const headers = ship.slice(ship.indexOf("<<'H'\n") + 6, ship.indexOf("\nH\n"));
assert.match(headers, /\/\*\n {2}X-Content-Type-Options: nosniff\n {2}Referrer-Policy: strict-origin-when-cross-origin\n {2}X-Frame-Options: DENY/);
assert.match(headers, /\/feed\/tetris\n {2}X-Frame-Options: SAMEORIGIN/);
assert.match(headers, /\/feed\/tetris\.html\n {2}X-Frame-Options: SAMEORIGIN/);
assert.ok(!/\/feed\/tetris(?:\.html)?\n {2}X-Frame-Options: DENY/.test(headers));

console.log('feed-info tests ok');

const live = process.env.SKIP_LIVE ? null : await fetch('https://due-dates-calendar-relay.phoneapp12.workers.dev/events', { headers: { Accept: 'application/json', Origin: 'https://shane-my-app.pages.dev' } });
if (live) {
  assert.strictEqual(live.status, 200);
  const data = await live.json();
  const list = nz.currentFilms(data.cinema, Date.now());
  assert.ok(list.length > 0, 'live Whangārei list has a current family film');
  for (const f of list) {
    assert.ok(/^https:\/\/cdn\.eventcinemas\.co\.nz\//.test(f.poster));
    assert.ok(/^https:\/\/www\.eventcinemas\.co\.nz\//.test(f.link));
    assert.ok(!f.link.includes('/orders/'));
    assert.ok(/^(G|PG|M|E)$/.test(f.rating));
  }
  console.log('live cinema films', list.length, list.slice(0, 3).map(f => f.rating + ' ' + f.title).join('; '));
}
