import fs from 'fs';
import vm from 'vm';
import assert from 'assert';
import { execSync } from 'child_process';

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
  assert.strictEqual(specials.filter(x => x.x === 'tetq').length, 0);
  const idx = specials.map(s => out.indexOf(s));
  assert.ok(Math.min(...idx) >= 2);
  for (let i = 1; i < idx.length; i++) assert.ok(idx[i] - idx[i - 1] >= 4, 'spaced ' + idx);
}
const zoom = play.render({ id: 'zoomq-1', x: 'zoomq' });
const fall = play.render({ id: 'fallq-1', x: 'fallq' });
for (const html of [zoom, fall]) {
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
assert.strictEqual(play.render({ id: 'tetq-1', x: 'tetq' }), '');
assert.ok(!play.insert(feed, 2, 0).some(x => x && x.x === 'tetq'));
assert.strictEqual(nz.drop({ id: 'tetq-12', x: 'tetq', t: 'Tetris' }), true);
assert.strictEqual(nz.drop({ id: 'pin1', pin: 1, h: { id: 'tetq-3', x: 'tetq' } }), true);
assert.strictEqual(nz.drop({ id: 'share1', _share: { snap: { url: 'https://shane-my-app.pages.dev/feed/tetris.html' } } }), true);
assert.strictEqual(nz.drop({ id: 'keep-show', t: 'A sitcom about a board game', topic: 'sitcoms', url: 'https://www.tvnz.co.nz/shows/example' }), false);
assert.strictEqual(nz.keptItems([{ id: 'tetq-1', x: 'tetq' }, { id: 'dogs', t: 'Top 5 Dogs of the Week' }]).map(i => i.id).join(','), 'dogs');

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
assert.strictEqual([].slice.call(sights.TOPICS).join(','), 'illusions,odd,colour,looks,reef,dolls,keeps,glass,kites,lanterns');
assert.strictEqual(sights.ITEMS.length, 20);
const seenTopics = new Set(sights.ITEMS.map(i => i.topic));
assert.strictEqual(seenTopics.size, 10);
for (const t of sights.TOPICS) assert.strictEqual(sights.ITEMS.filter(i => i.topic === t).length, 2, t);
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
assert.strictEqual(day0.map(c => c.topic).join(','), sights.TOPICS.join(','));
assert.ok(day0.every(c => c.img && c.src === 'sight-commons' && c.kind === 'photo'));
const mandarin = sights.ITEMS.find(i => i.key === 'mandarin');
assert.ok(/not from New Zealand/.test(mandarin.s));
const anemone = sights.ITEMS.find(i => i.key === 'anemone');
assert.ok(/HMNZS Canterbury/.test(anemone.t + anemone.s) && /New Zealand/.test(anemone.t + anemone.s));
const off = load('feed/sights.js');
off.topicOn = t => t !== 'colour' && t !== 'kites';
assert.ok(!off.ibSights.cards(0).some(c => c.topic === 'colour' || c.topic === 'kites'));
assert.strictEqual(off.ibSights.cards(0).length, 8);
const placed = sights.insert(Array.from({ length: 50 }, (_, n) => ({ id: 'p' + n, t: 'Post ' + n })), 2, 0);
const sightsIn = placed.filter(x => x.src === 'sight-commons');
assert.strictEqual(sightsIn.length, 10);
const at = sightsIn.map(s => placed.indexOf(s));
assert.ok(at[0] >= 2 && at[0] < 12, at.join(','));
assert.ok(at.filter(n => n < 12).length <= 3, at.join(','));
for (let i = 1; i < at.length; i++) assert.ok(at[i] - at[i - 1] >= 3, at.join(','));
const appSrc = fs.readFileSync('feed/app.js', 'utf8');
for (const id of sights.TOPICS) assert.ok(appSrc.includes("'" + id + "'"), id);
assert.ok(!/Math\.pow\(baseOf\(t\), 3\)/.test(appSrc));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('sights.js?v=1.9.136'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('cal.js?v=1.9.136'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('back.js?v=1.9.136'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('.cdot.tv'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('.bd ul.sum'));
assert.ok(fs.readFileSync('feed/app.js', 'utf8').includes("const APP_VERSION = '1.9.136'"));
function swVersion(src) { const m = String(src).match(/const VERSION = '([^']+)'/); assert.ok(m, 'parent sw.js VERSION'); return m[1]; }
const parentHere = swVersion(fs.readFileSync('sw.js', 'utf8'));
let parentMain = parentHere;
try { parentMain = swVersion(execSync('git show origin/main:sw.js', { encoding: 'utf8' })); } catch (e) { }
assert.equal(parentHere, parentMain);
assert.ok(appSrc.includes("new Set(['life', 'family', 'photos', 'liked'])"));
assert.ok(!/already-seen ones/.test(appSrc));
const seenBits = [
  appSrc.match(/const seenOk = i => .*;/)[0],
  appSrc.match(/function seenUrl\(i\) \{[\s\S]*?\n\}/)[0],
  appSrc.match(/function cardSeen\(i, seen\) \{[\s\S]*?\n\}/)[0],
  appSrc.match(/function pickFresh\(list, seen\) \{[\s\S]*?\n\}/)[0]
].join('\n');
const seenCtx = {};
vm.runInNewContext(seenBits + '\nglobalThis.pickFresh = pickFresh; globalThis.seenUrl = seenUrl;', seenCtx);
const seen = new Set(['old-id', 'u:https://example.com/story']);
const fresh = seenCtx.pickFresh([
  { id: 'old-id', t: 'Already shown', url: 'https://example.com/other' },
  { id: 'same-link', t: 'Same link, new id', url: 'https://example.com/story?utm=1' },
  { id: 'gamesoon', x: 'gamesoon', t: 'Games — coming soon' },
  { id: 'next-one', t: 'A new post', url: 'https://example.com/new' }
], seen);
assert.equal([].map.call(fresh, i => i.id).join(','), 'gamesoon,next-one');
assert.equal(seenCtx.seenUrl({ url: 'https://example.com/story?utm=1#x' }), 'https://example.com/story');
const seenSights = load('feed/sights.js');
const first = seenSights.ibSights.cards(0);
seenSights.wasSeen = item => item.id === first[0].id;
const again = seenSights.ibSights.cards(0);
assert.ok(again[0] && again[0].id !== first[0].id && again[0].topic === first[0].topic);
assert.ok(!again.some(c => c.id === first[0].id));
const seenArt = load('feed/art3d.js');
const artA = seenArt.ibArt.cards(0)[0];
seenArt.wasSeen = item => item.id === artA.id;
const artB = seenArt.ibArt.cards(0);
assert.equal(artB.length, 1);
assert.notEqual(artB[0].id, artA.id);
seenArt.wasSeen = () => true;
assert.equal(seenArt.ibArt.cards(0).length, 0);
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("const VERSION = '1.9.136'"));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'art3d.js?v=' + VERSION"));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'portal.js?v=' + VERSION"));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('portal.js?v=1.9.136'));
const portalSrc = fs.readFileSync('feed/portal.js', 'utf8');
assert.ok(portalSrc.includes('prefers-reduced-motion'));
assert.ok(portalSrc.includes("sessionStorage.getItem(KEY)"));
assert.ok(portalSrc.includes('pointerdown'));
assert.ok(portalSrc.includes('animationend'));
assert.ok(portalSrc.includes('ibPortalRise'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('pointer-events:none'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('portalFade'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('html.portal-on #feed > .card:not(.portal-rise)'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('isolation:isolate'));
assert.ok(portalSrc.includes('ibRise'));
assert.ok(portalSrc.includes('ib-go'));
assert.ok(portalSrc.includes('requestAnimationFrame(() => requestAnimationFrame(arm))'));
assert.ok(portalSrc.includes("skip: 'reduced-motion'"));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('@keyframes ibRise'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('translateY(var(--dy,42vh)) scale(.4)'));
assert.ok(!fs.readFileSync('feed/index.html', 'utf8').includes('clip-path') || !/ibRise\{[^}]*clip-path/.test(fs.readFileSync('feed/index.html', 'utf8')));
assert.ok(portalSrc.includes('portaldebug'));
assert.ok(portalSrc.includes('[portal] start'));
assert.ok(portalSrc.includes('[portal] finish'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('#ibrise'));
assert.ok(portalSrc.includes('portal-rose'));
assert.ok(portalSrc.includes("ev.animationName !== 'portalFade'"));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("cache: 'reload'"));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("cache: 'no-cache'"));
assert.ok(appSrc.includes('ibPortalRise'));
assert.ok(!/portal-style\.jpg|attachments\/image/.test(portalSrc + fs.readFileSync('feed/index.html', 'utf8')));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('art3d.js?v=1.9.136'));
assert.ok(appSrc.includes("['art3d', '3D art'"));
assert.ok(appSrc.includes("['3D art', 'art3d'"));
assert.ok(appSrc.includes("'art3d'"));
assert.ok(appSrc.includes('art3d: 0.95'));
assert.ok(appSrc.includes('window.topicOn = topicOn'));
assert.ok(appSrc.includes('data-intmenu'));
assert.ok(appSrc.includes('data-intoff'));
assert.ok(appSrc.includes('data-calopen'));
assert.ok(htmlSoon(fs.readFileSync('feed/index.html', 'utf8')));
function htmlSoon(html) { return html.includes('.soonnames') && html.includes('.intsub'); }
const art = load('feed/art3d.js').ibArt;
assert.strictEqual(art.TOPIC, 'art3d');
assert.strictEqual(art.ITEMS.length, 2);
for (const i of art.ITEMS) {
  assert.ok(i.file && art.pic(i.file).includes('Special:FilePath') && art.pic(i.file).includes('width=1200'), i.key);
  assert.ok(i.s.includes('Wikimedia Commons') && /CC0|CC BY/.test(i.s), i.key);
  assert.ok(art.filePage(i.file).startsWith('https://commons.wikimedia.org/wiki/File:'), i.key);
}
assert.strictEqual([].map.call(art.ITEMS, i => i.file).join('|'), 'Earth Blender render 3.png|Two Suzanne heads.jpg');
assert.notStrictEqual(art.cards(0)[0].id, art.cards(864e5)[0].id);
assert.strictEqual(art.cards(0)[0].src, 'art3d-commons');
assert.strictEqual(art.cards(0)[0].kind, 'photo');
const artOff = load('feed/art3d.js');
artOff.topicOn = () => false;
assert.strictEqual(artOff.ibArt.cards(0).length, 0);
const mixCtx = { console, Intl, Date, Math, URL, Set, Map, Object, Number, String, Array, encodeURIComponent, decodeURIComponent, document: {} };
mixCtx.window = mixCtx; mixCtx.globalThis = mixCtx;
vm.createContext(mixCtx);
vm.runInContext(fs.readFileSync('feed/sights.js', 'utf8'), mixCtx, { filename: 'feed/sights.js' });
vm.runInContext(fs.readFileSync('feed/art3d.js', 'utf8'), mixCtx, { filename: 'feed/art3d.js' });
const artMix = mixCtx.festive(Array.from({ length: 50 }, (_, n) => ({ id: 'p' + n, t: 'Post ' + n })), 2);
const artAt = artMix.findIndex(x => x && x.src === 'art3d-commons');
const sightAt = artMix.filter(x => x && x.src === 'sight-commons').map(x => artMix.indexOf(x));
assert.strictEqual(artMix.filter(x => x && x.src === 'art3d-commons').length, 1);
assert.strictEqual(sightAt.length, 10);
assert.ok(artAt >= 8, 'art at ' + artAt);
assert.ok(sightAt.every(n => Math.abs(n - artAt) >= 2), sightAt.join(',') + ' art ' + artAt);
mixCtx.topicOn = t => t !== 'art3d';
assert.ok(!mixCtx.festive(Array.from({ length: 40 }, (_, n) => ({ id: 'q' + n })), 2).some(x => x && x.src === 'art3d-commons'));
assert.ok(fs.readFileSync('feed/app.js', 'utf8').includes('window.card(i)'));
assert.ok(!appSrc.includes('data-comeback'));
const backSrc = fs.readFileSync('feed/back.js', 'utf8');
assert.ok(backSrc.includes('Notification.requestPermission'));
assert.ok(!backSrc.includes('data-comeback'));
assert.ok(!/comeBack/.test(backSrc));
assert.ok(backSrc.includes('on: true'));
assert.ok(!fs.readFileSync('feed/sw.js', 'utf8').includes('!s.on'));
assert.ok(!fs.readFileSync('feed/extras.js', 'utf8').includes("data-np=\"comeback\"") && !fs.readFileSync('feed/extras.js', 'utf8').includes("['comeback',"));
const comeCtx = {};
vm.runInNewContext(fs.readFileSync('feed/back.js', 'utf8'), comeCtx);
const come = comeCtx.ibCome;
const day = come.TWO;
const morning = Date.parse('2026-11-09T19:00:00Z');
assert.equal(come.nzHour(morning), 8);
assert.equal(come.quiet(morning), false);
assert.equal(come.quiet(Date.parse('2026-11-09T08:00:00Z')), true);
assert.equal(come.shouldPing(morning - 3 * day, 0, morning), true);
assert.equal(come.shouldPing(morning - day / 2, 0, morning), false);
assert.equal(come.shouldPing(morning - 3 * day, morning - day / 2, morning), false);
assert.equal(come.shouldPing(morning - 3 * day, 0, Date.parse('2026-11-09T08:00:00Z')), false);
assert.ok(appSrc.includes("['Books', 'learn'"));
assert.ok(appSrc.includes('Whangārei classes'));
assert.ok(appSrc.includes('data-calopen'));
assert.ok(fs.readFileSync('feed/nz.js', 'utf8').includes('next: fut[0].t.slice(0, 16)'));
const calCtx = { ls: { mem: {}, get(k, d) { return this.mem[k] || d; }, set(k, v) { this.mem[k] = v; } } };
vm.runInNewContext(fs.readFileSync('feed/cal.js', 'utf8'), calCtx);
const cal = calCtx.ibCal;
const saved = cal.upsert({ title: 'Yoga', date: '2026-11-12', time: '18:00', note: 'Class', remind: 'h1' });
assert.equal(saved.title, 'Yoga');
assert.equal(cal.upsert({ title: '  ', date: '2026-11-12' }), null);
const when = cal.aucklandMs('2026-11-12', '18:00');
assert.equal(cal.nzParts(when).date, '2026-11-12');
assert.equal(cal.nzParts(when).time, '18:00');
assert.equal(cal.fireMs(saved), when - 3600000);
const tv = cal.prefill({ kind: 'tv', src: 'nz-tvg2', ev: when, t: 'The Chase', where: 'TVNZ 1', url: 'https://www.tvnz.co.nz/show' });
assert.equal(tv.date, '2026-11-12');
assert.equal(tv.time, '18:00');
assert.equal(cal.prefill({ kind: 'tv', src: 'tvm-us', ev: when, t: 'US show', url: 'https://www.adultswim.com/x' }), null);
assert.equal(cal.prefill({ kind: 'event', t: 'Market', url: 'https://www.eventfinda.co.nz/x' }), null);
const film = cal.prefill({ x: 'cine', film: { title: 'Pressure', next: '2026-11-12T19:30', rating: 'M', sessions: 'https://www.eventcinemas.co.nz/cinema/whangarei/sessions' } });
assert.equal(film.time, '19:30');
assert.equal(tv.tv, 1);
assert.equal(tv.kind, 'tv');
assert.equal(film.kind, 'movie');
assert.equal(cal.upsert({ title: 'Dentist', date: '2026-11-10', kind: 'nope' }).kind, 'own');
const noon = cal.aucklandMs('2026-11-04', '12:00');
const stream = cal.prefill({ x: 'watch', w: { t: 'The Chase', day: '2026-11-04', ev: noon, plat: 'TVNZ+', url: 'https://www.tvnz.co.nz/show' } });
assert.equal(stream.date, '2026-11-04');
assert.equal(stream.time, '');
assert.equal(stream.tv, 1);
const timed = cal.prefill({ x: 'watch', w: { t: 'QI', day: '2026-11-11', ev: cal.aucklandMs('2026-11-11', '19:30'), plat: 'ThreeNow', url: 'https://www.threenow.co.nz/show' } });
assert.equal(timed.time, '19:30');
assert.ok(fs.readFileSync('feed/cal.js', 'utf8').includes('Add reminder'));
assert.ok(cal.ics(saved).includes('DTSTART:20261112T050000Z'));
const summer = cal.aucklandMs('2026-11-12', '19:30');
const winter = cal.aucklandMs('2026-07-15', '19:30');
assert.equal(summer, Date.parse('2026-11-12T06:30:00Z'));
assert.equal(winter, Date.parse('2026-07-15T07:30:00Z'));
assert.equal(cal.nzParts(summer).time, '19:30');
assert.equal(cal.nzParts(winter).time, '19:30');
const beforeDst = cal.aucklandMs('2026-04-05', '01:30');
const afterDst = cal.aucklandMs('2026-04-05', '03:30');
assert.equal(beforeDst, Date.parse('2026-04-04T12:30:00Z'));
assert.equal(afterDst, Date.parse('2026-04-04T15:30:00Z'));
assert.equal(cal.nzParts(beforeDst).date, '2026-04-05');
assert.equal(cal.nzParts(afterDst).time, '03:30');
const nineForty = Date.parse('2026-11-10T08:40:00Z');
const bangEv = Date.parse('2026-11-10T04:30:00Z');
assert.equal(cal.nzParts(bangEv).date, '2026-11-10');
assert.equal(cal.nzParts(bangEv).time, '17:30');
const bang = { id: 'epgum7wlo', kind: 'tv', src: 'nz-tvg2', where: 'TVNZ 2', t: 'The Big Bang Theory', s: 'Tonight 5:30pm · TVNZ 2 · “The Locomotion Interruption”', url: 'https://www.tvnz.co.nz/', ev: bangEv };
assert.equal(cal.prefill(bang, nineForty), null);
assert.equal(nz.drop(bang, nineForty), true);
assert.equal(nz.aired(bang, nineForty), true);
const nextBang = { ...bang, id: 'later', ev: Date.parse('2026-11-11T06:30:00Z'), s: 'Wed 7:30pm · TVNZ 2' };
assert.equal(nz.drop(nextBang, nineForty), false);
assert.equal(cal.prefill(nextBang, nineForty).time, '19:30');
assert.equal(cal.prefill(nextBang, nineForty).at, nextBang.ev);
assert.ok(cal.ics(saved).includes('TRIGGER:-PT1H'));
const calFile = fs.readFileSync('feed/cal.js', 'utf8');
assert.ok(calFile.includes('coming soon'));
assert.ok(calFile.includes('data-art="tetris"'));
assert.ok(calFile.includes('Play Tetris'));
assert.ok(calFile.includes('<span>More games coming soon</span>'));
assert.ok(!/<iframe/i.test(calFile));
assert.ok(!/tetris\.html|href=[^>\n]*tetris/i.test(calFile));
const playFile = fs.readFileSync('feed/play.js', 'utf8');
assert.ok(playFile.includes("tetris: { url: 'tetris'"));
assert.ok(/tetris:[\s\S]{0,220}local: true/.test(playFile));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'tetris'"));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'tetris.js'"));
const storySrc = fs.readFileSync('feed/stories.js', 'utf8');
const pickFn = (appSrc.match(/function pickVid\(\) \{[\s\S]*?\n\}/) || [])[0];
assert.ok(pickFn && !/playVid/.test(pickFn), 'pickVid must not start playback');
assert.ok(!/autoplay\s*[:=]\s*1\b/.test(appSrc));
assert.ok(!/autoplay=1|autoplay=true/.test(appSrc + storySrc));
assert.ok(!/\sautoplay[\s>]/.test(storySrc));
assert.ok(storySrc.includes('data-stplay'));
assert.ok(storySrc.includes('no auto-advance'));
assert.ok(appSrc.includes('playVid(p, true)'));
assert.ok(!/mountVid\(el\)/.test((appSrc.match(/addEventListener\('scroll'[\s\S]*?\}, \{ passive: true \}\);/) || [])[0] || ''));
assert.ok(fs.readFileSync('feed/read.js', 'utf8').includes('.bd li'));
const bulletSrc = (appSrc.match(/function bullets\(text\) \{[\s\S]*?\n\}/) || [])[0];
const sumSrc = (appSrc.match(/function sumHtml\(text, opt\) \{[\s\S]*?\n\}/) || [])[0];
assert.ok(bulletSrc && sumSrc, 'bullets');
const bCtx = { esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) };
vm.runInNewContext(appSrc.match(/function holdBits\(s\) \{[\s\S]*?\n\}/)[0] + '\n' + appSrc.match(/function restoreBits\(s, bits\) \{[\s\S]*?\n\}/)[0] + '\n' + appSrc.match(/function sentences\(text\) \{[\s\S]*?\n\}/)[0] + '\n' + bulletSrc + '\n' + sumSrc + '\nglobalThis.bullets = bullets; globalThis.sumHtml = sumHtml;', bCtx);
const got = s => bCtx.bullets(s).join('|');
assert.strictEqual(got('Developer: “I can\u2019t be part of the Fox world.”'), 'Developer: “I can\u2019t be part of the Fox world.”');
assert.strictEqual(got('The reef is bright. The fish stay close.'), 'The reef is bright.|The fish stay close.');
assert.strictEqual(got('Mr. Shane smiled. He waved.'), 'Mr. Shane smiled.|He waved.');
assert.strictEqual(got('It costs $1.50 today. Buy it.'), 'It costs $1.50 today.|Buy it.');
assert.strictEqual(got('See https://example.com/a.b/c now. Done.'), 'See https://example.com/a.b/c now.|Done.');
assert.strictEqual(got('U.S. officials spoke. N.Z. replied.'), 'U.S. officials spoke.|N.Z. replied.');
assert.strictEqual(got('First point\n- Second point\n• Third point'), 'First point|Second point|Third point');
assert.strictEqual(got('Comedy · 2019 · A show about friends.'), 'Comedy|2019|A show about friends.');
const htmlSum = bCtx.sumHtml('A <script> tag. "Quoted".');
assert.ok(htmlSum.startsWith('<ul class="sum" data-more'));
assert.ok(htmlSum.includes('<li>A &lt;script&gt; tag.</li>'));
assert.ok(htmlSum.includes('&quot;Quoted&quot;'));
assert.strictEqual(got(''), '');
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('aspect-ratio:var(--frame, 1 / 1)!important'));
const html = fs.readFileSync('feed/index.html', 'utf8');
assert.ok(html.includes('aspect-ratio:var(--frame, 1 / 1)!important'));
assert.ok(html.includes('#feed > .card > .media.vid{flex:0 0 auto'));
assert.ok(html.includes('object-fit:contain!important'));
const picFns = (appSrc.match(/function sharper\(u\) \{[\s\S]*?\nfunction stillFrame\(w, h\) \{[\s\S]*?\n\}/) || [])[0];
assert.ok(picFns, 'sharper');
const picCtx = { URL };
vm.runInNewContext(picFns + '\nglobalThis.sharper = sharper; globalThis.stillFrame = stillFrame;', picCtx);
const ars = 'https://cdn.arstechnica.net/wp-content/uploads/2026/11/Screenshot-2026-11-06-134100-1152x648.jpg';
assert.strictEqual(picCtx.sharper(ars), 'https://cdn.arstechnica.net/wp-content/uploads/2026/11/Screenshot-2026-11-06-134100.jpg');
assert.strictEqual(picCtx.sharper('https://cdn.arstechnica.net/wp-content/uploads/2026/11/keep-2000x1000.jpg'), 'https://cdn.arstechnica.net/wp-content/uploads/2026/11/keep-2000x1000.jpg');
assert.ok(picCtx.sharper('https://commons.wikimedia.org/wiki/Special:FilePath/Tuatara.jpg?width=1200').endsWith('width=1600'));
assert.strictEqual(picCtx.sharper('https://example.com/photo.jpg'), 'https://example.com/photo.jpg');
assert.strictEqual(picCtx.stillFrame(1603, 1233), '1 / 1');
assert.strictEqual(picCtx.stillFrame(1600, 640), '4 / 3');
assert.strictEqual(picCtx.stillFrame(1382, 1720), '0.8035 / 1');
assert.strictEqual(sights.MIX, 1);
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'sights.js?v=' + VERSION"));
const dueSrc = (appSrc.match(/function topicDue\([\s\S]*?\n\}/) || [])[0];
assert.ok(dueSrc, 'topicDue');
const dueCtx = {};
vm.runInNewContext(dueSrc + '\nglobalThis.topicDue = topicDue;', dueCtx);
const BASE = { sitcoms: 1.55, dogs: 1.45, nature: 1.35, garden: 1.1, music: 1, scifi: 1.15, nz: 0.7, food: 0.95, kids: 0.9, creative: 1.15, science: 0.55, travel: 0.9, meals: 1.1, illusions: 0.9, odd: 1, colour: 0.9, looks: 0.95 };
const baseOf = t => BASE[t] || 1;
const WT = { sitcoms: 2.2, dogs: 1.8 };
function likedScore(topic, vid) {
  let f = (0.15 + 0.65) * (vid ? 1.15 : 1.1) * baseOf(topic) * (WT[topic] || 1);
  if (vid) f *= 1.35;
  if (['dogs', 'nature', 'sitcoms'].includes(topic)) f *= 1.4;
  if (['creative', 'scifi'].includes(topic)) f *= 1.25;
  if (['nz', 'science'].includes(topic) && !vid) f *= 0.55;
  if (topic === 'sitcoms') f *= 1.18;
  return f;
}
const spec = [['sitcoms', 10, true], ['dogs', 8, true], ['nature', 4, true], ['garden', 3, false], ['music', 3, false], ['scifi', 3, true], ['nz', 4, false], ['food', 3, false], ['kids', 2, false], ['creative', 3, false], ['science', 3, false], ['travel', 2, false], ['meals', 2, false], ['illusions', 1, false], ['odd', 1, false], ['colour', 1, false], ['looks', 1, false]];
const pool = [];
for (const [topic, n, vid] of spec) for (let i = 0; i < n; i++) pool.push({ topic, sc: likedScore(topic, vid) * (1 - i * 0.03) });
function spread(due) {
  const Q = {};
  for (const p of pool) (Q[p.topic] = Q[p.topic] || []).push(Object.assign({}, p));
  for (const t in Q) Q[t].sort((a, b) => b.sc - a.sc);
  const lastAt = {}, out = [];
  while (out.length < pool.length) {
    const n = out.length; let bestT = null, best = -1;
    for (const t in Q) {
      if (!Q[t].length) continue;
      const gap = n - (t in lastAt ? lastAt[t] : -8);
      const v = due(Q[t][0].sc, gap, baseOf(t), WT[t] || 1, t in lastAt);
      if (v > best) { best = v; bestT = t; }
    }
    lastAt[bestT] = n;
    out.push(Q[bestT].shift());
  }
  const head = out.slice(0, 12);
  const counts = {};
  for (const i of head) counts[i.topic] = (counts[i.topic] || 0) + 1;
  return counts;
}
const beforeDue = (sc, gap, base, topicW) => Math.sqrt(sc) * gap * Math.pow(base, 3) * topicW;
const before = spread(beforeDue);
const after = spread(dueCtx.topicDue);
const uniq = o => Object.keys(o).length;
assert.ok(uniq(before) <= 6, 'before ' + JSON.stringify(before));
assert.ok(uniq(after) >= 8, 'after ' + JSON.stringify(after));
assert.ok(after.sitcoms >= 1 && after.dogs >= 1, JSON.stringify(after));
assert.ok(after.sitcoms >= (after.science || 0));
assert.ok(!before.illusions && (after.odd || after.illusions || after.colour || after.looks), JSON.stringify(after));
const ship = fs.readFileSync('tools/ship-pages.sh', 'utf8');
const headers = ship.slice(ship.indexOf("<<'H'\n") + 6, ship.indexOf("\nH\n"));
assert.match(headers, /\/\*\n {2}X-Content-Type-Options: nosniff\n {2}Referrer-Policy: strict-origin-when-cross-origin\n {2}X-Frame-Options: DENY/);
assert.match(headers, /\/feed\/tetris\n {2}! X-Frame-Options\n {2}X-Frame-Options: SAMEORIGIN/);
assert.match(headers, /\/feed\/tetris\.html\n {2}! X-Frame-Options\n {2}X-Frame-Options: SAMEORIGIN/);
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
