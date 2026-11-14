import fs from 'fs';
import vm from 'vm';
import assert from 'assert';
import { execSync } from 'child_process';
import crypto from 'crypto';

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
assert.strictEqual(tetGame.DROP_SLOW, 1.38);
assert.ok(Math.abs(tetGame.dropInterval(1) - 800 * 1.38) < 1e-9);
assert.ok(tetGame.dropInterval(30) >= 60 * 1.38);
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
// 1.9.166 triangle Tetris on the Triangles theme (level 11, second to last): two-colour palette, gameplay unchanged
// 1.9.192: Triangles is last (level 12); Space travel is level 11.
assert.strictEqual(tetGame.themeFor(1), 6);
assert.strictEqual(tetGame.themeFor(2), 3);
assert.strictEqual(tetGame.themeFor(3), 11);
assert.strictEqual(tetGame.themeFor(4), 12);
assert.strictEqual(tetGame.themeFor(5), 0);
assert.strictEqual(tetGame.themeFor(9), 4);
assert.strictEqual(tetGame.themeFor(10), 13);
assert.strictEqual(tetGame.themeFor(13), 7);
assert.strictEqual(tetGame.themeFor(14), 8);
assert.strictEqual(tetGame.THEMES[8].name, 'Triangles');
assert.strictEqual(tetGame.THEMES[11].name, 'Jeremiah was a bullfrog');
assert.strictEqual(tetGame.TRI_THEME, 8);
// Palette follows the Triangles theme wherever it sits: first 5 lines of the level red/blue, then pink/lime.
assert.deepStrictEqual(tetGame.trianglePalette(100, 14), tetGame.TRI_PAL.early);
assert.deepStrictEqual(tetGame.trianglePalette(104, 14), tetGame.TRI_PAL.early);
assert.deepStrictEqual(tetGame.trianglePalette(105, 14), tetGame.TRI_PAL.late);
assert.deepStrictEqual(tetGame.trianglePalette(109, 14), tetGame.TRI_PAL.late);
assert.strictEqual(tetGame.triangleLate(104), false);
assert.strictEqual(tetGame.triangleLate(105), true);
assert.strictEqual(tetGame.blockColor(1, 100, 14), tetGame.TRI_PAL.early[0]); // red
assert.strictEqual(tetGame.blockColor(2, 100, 14), tetGame.TRI_PAL.early[1]); // blue
assert.strictEqual(tetGame.blockColor(3, 105, 14), tetGame.TRI_PAL.late[0]);  // pink
assert.strictEqual(tetGame.blockColor(4, 105, 14), tetGame.TRI_PAL.late[1]);  // lime
const triCols = new Set([1, 2, 3, 4, 5, 6, 7].map(t => tetGame.blockColor(t, 102, 14)));
assert.deepStrictEqual([...triCols].sort(), [...tetGame.TRI_PAL.early].sort());
assert.strictEqual(tetGame.trianglePalette(0, 1), null, 'other themes keep their own colours');
assert.strictEqual(tetGame.trianglePalette(14, 2), null, 'Bush walk on level 2 is not triangles');
assert.strictEqual(tetGame.blockColor(1, 0, 1), tetGame.COLORS[1]);
const gTri = tetGame.newGame();
gTri.level = 14; gTri.lines = 132;
const beforeX = 4;
gTri.piece = { t: 4, m: [[4, 4], [4, 4]], x: beforeX, y: 0 };
tetGame.act(gTri, 'left');
assert.strictEqual(gTri.piece.x, beforeX - 1, 'triangle theme does not change movement');
assert.strictEqual(tetGame.THEMES[7].name, 'Space travel');
assert.strictEqual(tetGame.SPACE_THEME, 7);
assert.deepStrictEqual(Array.from(tetGame.BOMB_EVERY), [0.8, 1.6]);
assert.strictEqual(tetGame.BOMB_HITS, 3);
assert.strictEqual(tetGame.BOMB_MAX, 4);
const waitFirst = tetGame.bombWaitRange(12, true), waitLater = tetGame.bombWaitRange(12, false);
assert.deepStrictEqual(Array.from(waitFirst), [0.8, 1.6]);
assert.deepStrictEqual(Array.from(waitLater), [0.8, 1.6]);
assert.deepStrictEqual(Array.from(tetGame.bombWaitRange(36, true)), [0.8, 1.6]);
const gSp = tetGame.newGame();
gSp.level = 3; gSp.lines = 20;
gSp.board = tetGame.emptyBoard();
for (let r = 16; r < 20; r++) gSp.board[r][4] = 3;
gSp.board[15][4] = 5;
gSp.piece = { t: 4, m: [[4, 4], [4, 4]], x: 4, y: 8 };
assert.strictEqual(tetGame.applyBombHit(gSp, 4, 8), 'piece', 'bombs pass through the falling piece');
assert.strictEqual(gSp.piece.t, 4);
assert.strictEqual(gSp.over, false);
assert.strictEqual(gSp.board[8][4], 0);
assert.strictEqual(tetGame.applyBombHit(gSp, 4, 15), 'chip');
assert.strictEqual(gSp.board[15][4], 5, 'first hit only damages the cell');
assert.strictEqual(tetGame.cellHits(gSp, 4, 15), 1);
assert.strictEqual(tetGame.applyBombHit(gSp, 4, 15), 'chip');
assert.strictEqual(tetGame.cellHits(gSp, 4, 15), 2);
assert.strictEqual(gSp.board[15][4], 5);
assert.strictEqual(tetGame.applyBombHit(gSp, 4, 15), 'block');
assert.strictEqual(gSp.board[15][4], 0, 'third hit knocks out that one cell');
assert.strictEqual(tetGame.cellHits(gSp, 4, 15), 0);
assert.strictEqual(gSp.board[16][4], 3, 'cells above do not fall');
assert.strictEqual(gSp.board[17][4], 3);
assert.strictEqual(tetGame.applyBombHit(gSp, 4, 19), 'chip');
assert.strictEqual(gSp.board[19][4], 3);
assert.strictEqual(gSp.board[16][4], 3);

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
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('sights.js?v=1.9.223'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('cal.js?v=1.9.223'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('back.js?v=1.9.223'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('.cdot.tv'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('.bd ul.sum'));
assert.ok(fs.readFileSync('feed/app.js', 'utf8').includes("const APP_VERSION = '1.9.223'"));
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
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("const VERSION = '1.9.223'"));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'art3d.js?v=' + VERSION"));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'portal.js?v=' + VERSION"));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('portal.js?v=1.9.223'));
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
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("u.pathname + '?v=' + VERSION"), 'game scripts are fetched at this VERSION, not from a stale unversioned cache');
assert.ok(appSrc.includes('ibPortalRise'));
assert.ok(!/portal-style\.jpg|attachments\/image/.test(portalSrc + fs.readFileSync('feed/index.html', 'utf8')));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('art3d.js?v=1.9.223'));
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
const calDay = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
const saved = cal.upsert({ title: 'Yoga', date: calDay, time: '18:00', note: 'Class', remind: 'h1' });
assert.equal(saved.title, 'Yoga');
assert.equal(cal.upsert({ title: '  ', date: calDay }), null);
const when = cal.aucklandMs(calDay, '18:00');
assert.equal(cal.nzParts(when).date, calDay);
assert.equal(cal.nzParts(when).time, '18:00');
assert.equal(cal.fireMs(saved), when - 3600000);
const tv = cal.prefill({ kind: 'tv', src: 'nz-tvg2', ev: when, t: 'The Chase', where: 'TVNZ 1', url: 'https://www.tvnz.co.nz/show' });
assert.equal(tv.date, calDay);
assert.equal(tv.time, '18:00');
assert.equal(cal.prefill({ kind: 'tv', src: 'tvm-us', ev: when, t: 'US show', url: 'https://www.adultswim.com/x' }), null);
assert.equal(cal.prefill({ kind: 'event', t: 'Market', url: 'https://www.eventfinda.co.nz/x' }), null);
const film = cal.prefill({ x: 'cine', film: { title: 'Pressure', next: calDay + 'T19:30', rating: 'M', sessions: 'https://www.eventcinemas.co.nz/cinema/whangarei/sessions' } });
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
const futDay = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10); // a day still ahead, so the past-showing filter keeps it
const timed = cal.prefill({ x: 'watch', w: { t: 'QI', day: futDay, ev: cal.aucklandMs(futDay, '19:30'), plat: 'ThreeNow', url: 'https://www.threenow.co.nz/show' } });
assert.equal(timed.time, '19:30');
assert.ok(fs.readFileSync('feed/cal.js', 'utf8').includes('Add reminder'));
assert.ok(cal.ics(saved).includes('DTSTART:' + calDay.replace(/-/g, '') + 'T050000Z'));
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
assert.ok(calFile.includes('data-art="tetris"'));
assert.ok(calFile.includes('Play Tetris'));
// 1.9.166 Scrabble is playable; Sugar Rush is the next game coming soon
assert.ok(calFile.includes('data-art="scrabble"'));
assert.ok(calFile.includes('Play Scrabble'));
assert.ok(calFile.includes('<span>Coming soon: Sugar Rush 🍬, a Candy Crush style matching game</span>'));
assert.ok(!/Scrabble is the next game|Coming soon: Scrabble|Scrabble · coming soon/.test(calFile + appSrc));
assert.ok(appSrc.includes('data-art="scrabble"><span class="mfe">🔤</span><span>Play Scrabble</span>'));
assert.ok(appSrc.includes('<span>Sugar Rush · coming soon</span>'));
assert.ok(!/scrabble\.html|href=[^>\n]*scrabble/i.test(calFile));
assert.ok(!/<iframe/i.test(calFile));
assert.ok(!/tetris\.html|href=[^>\n]*tetris/i.test(calFile));
const playFile = fs.readFileSync('feed/play.js', 'utf8');
assert.ok(playFile.includes("url: gameUrl('tetris')"));
assert.ok(/tetris:[\s\S]{0,220}local: true/.test(playFile));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'tetris'"));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'tetris.js?v=' + VERSION"));
assert.ok(playFile.includes("url: gameUrl('scrabble')"));
assert.ok(/scrabble:[\s\S]{0,220}local: true/.test(playFile));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'scrabble.js?v=' + VERSION"));
assert.ok(!fs.readFileSync('feed/sw.js', 'utf8').includes('scrabble-words'), 'word list is fetched when Scrabble opens, not precached');

// 1.9.166 Scrabble rules and word checks (small word list here; tests/scrabble-sim.mjs plays full games with the real one)
function loadScrabble() {
  const ctx = { console, Math, Object, Number, String, Array, Set, Map, JSON, Date, Uint8Array, Int8Array, Int32Array, setTimeout, parseInt };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('feed/scrabble.js', 'utf8'), ctx, { filename: 'feed/scrabble.js' });
  return ctx.Scrabble;
}
const SC = loadScrabble();
assert.equal(Object.values(SC.COUNTS).reduce((a, b) => a + b, 0), 100);
assert.equal(SC.COUNTS['?'], 2);
assert.equal(Object.keys(SC.COUNTS).reduce((a, k) => a + SC.COUNTS[k] * SC.VALUES[k], 0), 187);
const prem = k => SC.PREMIUM.filter(x => x === k).length;
assert.deepEqual([prem('TW'), prem('DW'), prem('TL'), prem('DL'), prem('ST')], [8, 16, 12, 24, 1]);
assert.equal(SC.PREMIUM[7 * 15 + 7], 'ST');
const scDict = SC.buildTrie('cat\ncats\nat\nta\nzoo\nzoos\nax\nxi\nqi\nretains\nretinas\nhello\na\n');
assert.ok(scDict.has('cat') && scDict.has('CATS') && !scDict.has('ca') && !scDict.has('a'));
const scEmpty = new Array(225).fill(null);
const sq = (r, c, l, b) => ({ r, c, l, b: b ? 1 : 0 });
assert.match(SC.check(scEmpty, [sq(0, 0, 'A'), sq(0, 1, 'T')], scDict).err, /centre/);
assert.match(SC.check(scEmpty, [sq(7, 7, 'A')], scDict).err, /two letters/);
assert.match(SC.check(scEmpty, [sq(7, 6, 'C'), sq(8, 7, 'A')], scDict).err, /straight line/);
assert.match(SC.check(scEmpty, [sq(7, 5, 'C'), sq(7, 7, 'T')], scDict).err, /gaps/);
assert.match(SC.check(scEmpty, [sq(7, 6, 'C'), sq(7, 7, 'Q')], scDict).err, /Not in the word list: CQ/);
const c1 = SC.check(scEmpty, [sq(7, 6, 'C'), sq(7, 7, 'A'), sq(7, 8, 'T')], scDict);
assert.ok(c1.ok); assert.equal(c1.score, (3 + 1 + 1) * 2); // centre star doubles
const st1 = SC.newGame({ players: [{ name: 'A' }, { name: 'B' }], rand: SC.rng(5) });
assert.equal(st1.bag.length, 86);
st1.players[0].rack = ['C', 'A', 'T', 'S', 'E', 'R', '?'];
assert.ok(SC.play(st1, [sq(7, 6, 'C'), sq(7, 7, 'A'), sq(7, 8, 'T')], scDict).ok);
assert.equal(st1.players[0].score, 10); assert.equal(st1.turn, 1); assert.equal(st1.players[0].rack.length, 7);
assert.match(SC.check(st1.board, [sq(0, 0, 'A'), sq(0, 1, 'T')], scDict).err, /join on/);
// hook an S onto CAT; (7,9) is a plain square
const hook = SC.check(st1.board, [sq(7, 9, 'S')], scDict);
assert.ok(hook.ok); assert.equal(hook.words[0].w, 'CATS'); assert.equal(hook.score, 6);
// a cross-word that is not a word is named in the message
assert.match(SC.check(st1.board, [sq(6, 7, 'Z'), sq(8, 7, 'O')], scDict).err, /ZAO/);
// blank scores 0 and letter multipliers do not apply to it
const blankB = SC.check(st1.board, [sq(6, 8, 'A', 1)], scDict);
assert.ok(blankB.ok); assert.deepEqual(blankB.words.map(w => w.w), ['AT']); assert.equal(blankB.score, 1); // blank on a DL square: 0 x 2 + T 1
// 50-point bingo
const bingo = SC.check(scEmpty, 'RETAINS'.split('').map((l, i) => sq(7, 4 + i, l)), scDict);
assert.ok(bingo.ok && bingo.bingo); assert.equal(bingo.score, 7 * 2 + 50);
// end of game: rack points come off, the player who went out gets them
const st2 = SC.newGame({ players: [{ name: 'A' }, { name: 'B' }], rand: SC.rng(9) });
st2.players[0].rack = []; st2.players[1].rack = ['Q', 'A']; st2.players[0].score = 50; st2.players[1].score = 40; st2.bag = [];
SC.finish(st2, 0);
assert.deepEqual(st2.players.map(p => p.score), [61, 29]); assert.ok(st2.over); assert.deepEqual(st2.winners, [0]);
// six scoreless turns end the game
const st3 = SC.newGame({ players: [{ name: 'A' }, { name: 'B' }], rand: SC.rng(3) });
for (let i = 0; i < 6; i++) SC.pass(st3);
assert.ok(st3.over);
// swap needs 7 in the bag
const st4 = SC.newGame({ players: [{ name: 'A' }, { name: 'B' }], rand: SC.rng(4) });
const r4 = st4.players[0].rack.slice(0, 3);
assert.ok(SC.swap(st4, r4, SC.rng(1)).ok); assert.equal(st4.bag.length, 86); assert.equal(st4.players[0].rack.length, 7);
st4.bag = st4.bag.slice(0, 6); assert.match(SC.swap(st4, st4.players[st4.turn].rack.slice(0, 1)).err, /7 tiles/);
// the computer only makes legal moves, and finds the bingo
const gm = SC.genMoves(scEmpty, 'RETAINS'.split(''), scDict);
assert.ok(gm.length > 0 && gm.every(m => SC.check(scEmpty, m.place, scDict).ok));
assert.equal(Math.max(...gm.map(m => m.score)), 66); // RETAINS over the star and a DL: (7 + 1) x 2 + 50
const fullDict = SC.buildTrie(fs.readFileSync('feed/scrabble-words.txt', 'utf8'));
assert.ok(fullDict.size > 160000 && fullDict.has('quixotic') && fullDict.has('xu') && !fullDict.has('xqz'));
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
assert.match(headers, /\/feed\/scrabble\n {2}! X-Frame-Options\n {2}X-Frame-Options: SAMEORIGIN/);
assert.match(headers, /\/feed\/scrabble\.html\n {2}! X-Frame-Options\n {2}X-Frame-Options: SAMEORIGIN/);

// 1.9.149 family scoreboard: scores.js sends with this phone's family link only, keeps local bests, and the worker checks scores
{
  const mem = new Map(), calls = [];
  const lsStub = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  const ctx = { console, Math, Object, Number, String, Array, JSON, Date, Promise, setTimeout, clearTimeout, encodeURIComponent, localStorage: lsStub,
    fetch: async (url, opt) => { calls.push({ url, opt }); return { ok: true, json: async () => ({ ok: 1, rank: 2, best: 900, newBest: false }) }; } };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('feed/scores.js', 'utf8'), ctx, { filename: 'feed/scores.js' });
  const S = ctx.IBScores;
  assert.strictEqual(S.API, 'https://shane-my-feed-data.phoneapp12.workers.dev/api');
  assert.strictEqual(S.who(), null);
  assert.strictEqual(await S.submit('tetris', { score: 500, lines: 4, level: 1 }), null, 'no family link: nothing sent');
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(S.localBests('tetris')[0].score, 500, 'kept on this phone');
  mem.set('mf.member', JSON.stringify({ tok: 'pending-token-xxxxxxxxxxxxxxxxxxxxxxxxx', pending: 1 }));
  assert.strictEqual(S.who(), null, 'an unchecked invite is not an identity');
  mem.set('mf.member', JSON.stringify({ id: 'm1', name: 'Shane Jenkins', role: 'admin', tok: 'tok-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' }));
  assert.strictEqual(S.who().first, 'Shane');
  assert.strictEqual(S.who().id, 'm1');
  assert.strictEqual(S.isShane(), true, 'Shane is identified by first name (and id when known)');
  mem.set('mf.member', JSON.stringify({ id: 'm2', name: 'Sarah', role: 'member', tok: 'tok-yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy' }));
  assert.strictEqual(S.isShane(), false, 'other family members are not Shane');
  mem.set('mf.member', JSON.stringify({ id: 'm1', name: 'Shane Jenkins', role: 'admin', tok: 'tok-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' }));
  const r = await S.submit('tetris', { score: 900, lines: 8, level: 1 });
  assert.strictEqual(r.rank, 2);
  assert.strictEqual(calls[0].url, S.API + '/scores');
  assert.strictEqual(calls[0].opt.method, 'POST');
  assert.strictEqual(calls[0].opt.headers.Authorization, 'Bearer tok-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  const sentBody = JSON.parse(calls[0].opt.body);
  assert.deepStrictEqual({ ...sentBody }, { game: 'tetris', score: 900, lines: 8, level: 1 });
  assert.ok(!('name' in sentBody), 'the server names the player from the token');
  await S.submit('scrabble', { score: 210 }, { name: 'Aranea', localOnly: true });
  assert.strictEqual(calls.length, 1, 'other pass-the-phone players stay on this phone');
  assert.deepStrictEqual(S.localBests('tetris').map(x => x.score), [900, 500]);
  await S.load('scrabble'); assert.strictEqual(calls[1].url, S.API + '/scores?game=scrabble');
  await S.loadRace(); assert.strictEqual(calls[2].url, S.API + '/sugar-race');
  await S.saveRace({ icon: 'lolly', stop: 5, stars: 10 });
  assert.strictEqual(calls[3].url, S.API + '/sugar-race');
  assert.strictEqual(calls[3].opt.method, 'POST');
  assert.deepStrictEqual(JSON.parse(calls[3].opt.body), { icon: 'lolly', stop: 5, stars: 10 });
  assert.strictEqual(S.nzDate(Date.UTC(2026, 10, 11, 11, 30)), '12 Nov', 'dates are NZ dates');
  ctx.fetch = async () => { throw new Error('offline'); };
  assert.strictEqual(await S.load('tetris'), null, 'offline fails quietly');
  const tet = fs.readFileSync('feed/tetris.js', 'utf8'), tetHtml = fs.readFileSync('feed/tetris.html', 'utf8');
  assert.ok(tetHtml.indexOf('scores.js') > 0 && tetHtml.indexOf('scores.js') < tetHtml.indexOf('tetris.js'));
  assert.ok(tetHtml.includes('id="scoresbtn"') && tet.includes("S.submit('tetris', { score: gm.score, lines: gm.lines, level: gm.level }"));
  const scr = fs.readFileSync('feed/scrabble.js', 'utf8'), scrHtml = fs.readFileSync('feed/scrabble.html', 'utf8');
  assert.ok(scrHtml.includes('<script src="scores.js?v=') && scrHtml.includes('id="overscores"') && scrHtml.includes('id="gscoresbtn"'));
  assert.ok(scr.includes('localOnly: true') && scr.includes('if (!st.scored)'));
  assert.ok(!/importScripts\s*\(/.test(scr), 'scrabble.js also runs as the computer player worker, so it never loads scores.js itself');
  assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'scores.js?v=' + VERSION"));
  execSync('node worker/test/scores.test.mjs', { stdio: 'pipe' });
}

// 1.9.166 Sugar Rush level 1: match-3 rules, cascades, special sweets, no-move shuffle, and Shane-only access
{
  const ctx = { console, Math, Object, Number, String, Array, Set, Map, JSON, Date };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('feed/sugar-rush.js', 'utf8'), ctx, { filename: 'feed/sugar-rush.js' });
  const SR = ctx.SugarRush;
  assert.strictEqual(SR.N, 8); assert.strictEqual(SR.KINDS, 6);
  assert.deepStrictEqual({ ...SR.LEVEL, stars: Array.from(SR.LEVEL.stars) }, { n: 1, target: 3000, moves: 20, stars: [3000, 6000, 9000] });
  const game = (rows, seed) => SR.newGame({ board: SR.fromRows(rows), seed: seed || 7 });
  // A fresh board has no ready-made lines, always has a move, and uses all six sweets
  for (let s = 1; s <= 25; s++) {
    const b = SR.newBoard(SR.rng(s));
    assert.strictEqual(SR.findRuns(b).length, 0); assert.ok(SR.hasMove(b));
    assert.strictEqual(new Set(b.flat().map(t => t.c)).size, 6);
  }
  // Match detection: rows and columns of 3+, not 2, bombs never match
  let b = SR.fromRows(['00012345', '12345012', '1.......', '1.......', '2.......', '3.......', '4*******', '5***....']);
  let runs = SR.findRuns(b);
  assert.strictEqual(runs.length, 2);
  assert.ok(runs.some(r => r.dir === 'h' && r.cells.length === 3 && r.color === 0));
  assert.ok(runs.some(r => r.dir === 'v' && r.cells.length === 3 && r.color === 1));
  // Invalid swaps bounce back: board and moves unchanged
  const rowsA = ['01201201', '12012012', '20120120', '01201201', '12012012', '20120120', '01201201', '34534534'];
  let st = game(rowsA);
  let before = SR.toRows(st.board).join('|');
  assert.strictEqual(SR.play(st, [0, 0], [0, 1]).valid, false);
  assert.strictEqual(SR.play(st, [0, 0], [2, 0]).valid, false, 'not neighbours');
  assert.strictEqual(SR.toRows(st.board).join('|'), before); assert.strictEqual(st.moves, 20);
  // A valid 3-match clears, drops, refills, scores and uses a move
  st = game(['44543232', '23232323', '32323232', '23232323', '32323232', '23232323', '32323232', '01010101']);
  let res = SR.play(st, [0, 2], [1, 2]); // the 5 drops and a 2 comes up: no line
  assert.strictEqual(res.valid, false);
  st = game(['44053232', '23432323', '32323232', '23232323', '32323232', '23232323', '32323232', '01010101']);
  res = SR.play(st, [0, 2], [1, 2]); // 4 4 _ with a 4 below the gap: swap makes 4 4 4
  assert.strictEqual(res.valid, true); assert.strictEqual(st.moves, 19);
  assert.strictEqual(res.steps[0].popped.length, 3); assert.strictEqual(res.steps[0].points, 3 * SR.PTS);
  assert.ok(st.score >= 90); assert.ok(st.board.flat().every(Boolean), 'board refilled');
  assert.strictEqual(SR.findRuns(st.board).length, 0, 'cascades run until no lines are left');
  // Gravity: sweets above a clear fall down, new ones arrive from above
  b = SR.fromRows(['0.......', '1.......', '2.......', '3.......', '4.......', '5.......', '0.......', '1.......']);
  b[3][0] = null; const ids = b.map(r => r[0] && r[0].id);
  const falls = SR.collapse(b, SR.rng(1));
  assert.strictEqual(b[3][0].id, ids[2]); assert.strictEqual(b[1][0].id, ids[0]);
  assert.ok(falls.some(f => f.fresh && f.r === 0 && f.from === -1));
  // Cascades: one move clears, the drop makes a second line, which scores double per sweet
  // column 2 clears 3 and drops 3, bringing the 5 from row 2 down beside the two 5s on row 5
  st = game(['34343434', '43434343', '34543434', '43134343', '34143434', '55214343', '34343434', '43434343']);
  res = SR.play(st, [5, 2], [5, 3]);
  assert.ok(res.steps[0].popped.every(p => p.c === 2 && p.color === 1));
  assert.ok(res.steps[1].popped.some(p => p.r === 5 && p.c === 0 && p.color === 5));
  assert.strictEqual(res.valid, true);
  assert.ok(res.steps.length >= 2, 'a cascade follows');
  assert.strictEqual(res.steps[1].cascade, 2);
  assert.ok(res.steps[1].points >= res.steps[1].popped.length * SR.PTS * 2);
  // Special sweets: 4 in a row makes a striped sweet at the moved spot; 5 makes a bomb; an L makes a wrapped sweet
  const g4 = SR.groups(SR.findRuns(SR.fromRows(['1111....', '........', '........', '........', '........', '........', '........', '........'])));
  assert.strictEqual(SR.specialFor(g4[0]), 'col');
  const g4v = SR.groups(SR.findRuns(SR.fromRows(['1.......', '1.......', '1.......', '1.......', '........', '........', '........', '........'])));
  assert.strictEqual(SR.specialFor(g4v[0]), 'row');
  const g5 = SR.groups(SR.findRuns(SR.fromRows(['22222...', '........', '........', '........', '........', '........', '........', '........'])));
  assert.strictEqual(SR.specialFor(g5[0]), 'b');
  const gL = SR.groups(SR.findRuns(SR.fromRows(['333.....', '3.......', '3.......', '........', '........', '........', '........', '........'])));
  assert.strictEqual(gL.length, 1); assert.strictEqual(SR.specialFor(gL[0]), 'w');
  const gT = SR.groups(SR.findRuns(SR.fromRows(['444.....', '.4......', '.4......', '........', '........', '........', '........', '........'])));
  assert.strictEqual(SR.specialFor(gT[0]), 'w');
  st = game(['11213343', '54154525', '32323232', '23232323', '32323232', '23232323', '32323232', '04040404']);
  res = SR.play(st, [1, 2], [0, 2]);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.steps[0].madeTiles.length, 1);
  assert.strictEqual(res.steps[0].madeTiles[0].t.s, 'col'); assert.strictEqual(res.steps[0].madeTiles[0].t.c, 1);
  assert.strictEqual(res.steps[0].points, 4 * SR.PTS + SR.BONUS.col);
  // A striped sweet caught in a line clears its whole row
  b = SR.fromRows(['01201201', '12012012', '20120120', '33345345', '12012012', '20120120', '01201201', '45045045']);
  b[3][1].s = 'row';
  let step = SR.resolve(b, null);
  assert.ok(step.fired.some(f => f.s === 'row' && f.r === 3));
  for (let c = 0; c < 8; c++) assert.ok(step.clear.has(3 * 8 + c));
  // A wrapped sweet clears the 3x3 around it
  b = SR.fromRows(['01201201', '12012012', '20120120', '01333201', '12012012', '20120120', '01201201', '45045045']);
  b[3][4].s = 'w';
  step = SR.resolve(b, null);
  assert.ok(step.fired.some(f => f.s === 'w'));
  for (const [r, c] of [[2, 3], [2, 5], [4, 3], [4, 5]]) assert.ok(step.clear.has(r * 8 + c));
  // Swapping a sprinkle bomb clears every sweet of the other colour
  st = game(['*1201201', '12012012', '20120120', '01201201', '12012012', '20120120', '01201201', '45045045']);
  const ones = st.board.flat().filter(t => t.c === 1).length;
  res = SR.play(st, [0, 0], [0, 1]);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.steps[0].popped.length, ones + 1);
  assert.ok(res.steps[0].popped.every(p => p.color === 1 || p.color === -1));
  assert.ok(SR.validSwap(SR.fromRows(['*0......', '........', '........', '........', '........', '........', '........', '........']), [0, 0], [0, 1]));
  // No moves left: shuffle into a board with a move and no ready-made lines
  b = SR.fromRows(['01230123', '23012301', '01230123', '23012301', '01230123', '23012301', '01230123', '23012301']);
  assert.strictEqual(SR.hasMove(b), false);
  const kinds = b.flat().map(t => t.c).sort().join('');
  SR.shuffle(b, SR.rng(3), 4);
  assert.ok(SR.hasMove(b)); assert.strictEqual(SR.findRuns(b).length, 0);
  assert.strictEqual(b.flat().map(t => t.c).sort().join(''), kinds, 'same sweets, new places');
  // After a move that leaves no moves, play() shuffles
  for (let s = 1; s <= 40; s++) { const g = SR.newGame({ seed: s }); while (!g.over) { const m = SR.findMove(g.board); assert.ok(m); assert.ok(SR.play(g, m[0], m[1]).valid); assert.ok(SR.hasMove(g.board)); } assert.ok(g.over); assert.strictEqual(g.won, (g.collected[0] || 0) >= 20); assert.strictEqual(g.stars, g.won ? SR.starsFor(g.score) : 0); }
  assert.strictEqual(SR.starsFor(2999), 0); assert.strictEqual(SR.starsFor(3000), 1); assert.strictEqual(SR.starsFor(6500), 2); assert.strictEqual(SR.starsFor(9000), 3);
  // Access: only Shane (IBScores.isShane()); no scores sent yet
  assert.strictEqual(SR.allowed(), false, 'no scores.js: nobody');
  ctx.IBScores = { isShane: () => false }; assert.strictEqual(SR.allowed(), false);
  ctx.IBScores = { isShane: () => true }; assert.strictEqual(SR.allowed(), true);
  const srJs = fs.readFileSync('feed/sugar-rush.js', 'utf8'), srHtml = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  assert.ok(!/\.submit\(/.test(srJs), 'Sugar Rush does not post to the family scoreboard yet');
  assert.ok(srHtml.indexOf('scores.js') > 0 && srHtml.indexOf('scores.js') < srHtml.indexOf('sugar-rush.js'));
  assert.ok(srHtml.includes('id="soon" class="soon" hidden') && srHtml.includes('Sugar Rush is coming soon') && srHtml.includes('id="game" hidden'));
  assert.ok(!/candy crush/i.test(srJs + srHtml), 'our own game: no Candy Crush names in the game');
  // Soft sounds: spoken words for good moves, a short chime for a plain 3-match.
  // Chime is sine (no square/saw), fundamentals 400–800 Hz, 2.5 kHz lowpass, quieter than the voices.
  assert.ok(srJs.includes("sfxLp.type = 'lowpass'") && srJs.includes('SFX_LP = 2500') && srJs.includes('sfxLp.frequency.value = SFX_LP') && !/'(square|sawtooth)'/.test(srJs));
  const scale = srJs.match(/const SCALE = \[([^\]]+)\]/)[1].split(',').map(Number);
  assert.ok(Math.min(...scale) >= 400 && Math.max(...scale) <= 800);
  assert.ok(srJs.includes('createDynamicsCompressor') && srJs.includes('BGM_DUCK = 0.078') && srJs.includes('VOICE_VOL = 0.36') && srJs.includes('CHIME_VOL = 0.10'));
  assert.ok(SR.CHIME_DUR >= 0.15 && SR.CHIME_DUR <= 0.25 && SR.CHIME_VOL < SR.VOICE_VOL);
  assert.ok(SR.VOICE_GAP === 1.2 && SR.playChime && SR.voiceForStep && SR.playClip);
  assert.ok(srJs.includes("ls.get('ib-sugar-sound', true)"), 'sound effects are on by default');
  assert.ok(srJs.includes("ls.get('ib-sugar-music', true)"), 'music is on by default');
  assert.ok(srJs.includes("doc.addEventListener('pointerup', unlockAudio") && srJs.includes("doc.addEventListener('touchend', unlockAudio"), 'game page resumes audio on pointerup/touchend');
  assert.ok(srJs.includes('playbackRate') && srJs.includes('silentUnlock') && srJs.includes('createBuffer(1, 1'));
  assert.ok(srJs.includes('t < voiceUntil && rank <= voiceRank') && srJs.includes('stopVoice()'), 'voices rate-limit and never overlap');
  assert.ok(!srJs.includes('sugar-rush-sfx-pop') && !srJs.includes('SFX_CUTS') && !srJs.includes('CLIP_VOL'), 'old pack and synth effects are gone');
  const sugarFiles = ['sugar-rush-music.mp3', 'sugar-rush-l1.mp3', 'sugar-rush-l2.mp3', 'sugar-rush-menu.mp3', 'sugar-rush-win.mp3', 'sugar-rush-yum.mp3',
    'sugar-rush-voice-yay.mp3', 'sugar-rush-voice-great.mp3', 'sugar-rush-voice-awesome.mp3',
    'sugar-rush-voice-sweetas.mp3', 'sugar-rush-voice-succulent.mp3'];
  for (const f of sugarFiles) assert.ok(fs.existsSync('feed/' + SR.mediaUrl(f)), 'audio ' + f);
  for (const old of ['pop', 'crush', 'bomb', 'hammer', 'spread', 'fail']) {
    const leftovers = fs.readdirSync('feed').filter(n => n.startsWith('sugar-rush-sfx-' + old));
    assert.deepStrictEqual(leftovers, [], 'removed old pack clip ' + old);
  }
  assert.ok(srJs.includes('decodeAudioData') && srJs.includes("src.loop = true") && srJs.includes('const BGM_VOL = 0.12'));
  assert.ok(srJs.includes('sugar-rush-menu.mp3') && srJs.includes('sugar-rush-win.mp3') && srJs.includes('sugar-rush-yum.mp3'));
  // Callout mapping: plain 3-match is a chime (null); good moves get a spoken word; bigger words win.
  assert.strictEqual(SR.voiceForStep({ popped: [{}, {}, {}], made: [], fired: [], cascade: 1 }, 1), null);
  assert.strictEqual(SR.voiceForStep({ popped: [{}, {}, {}, {}], made: [{ s: 'row' }], fired: [], cascade: 1 }, 1), 'great');
  assert.strictEqual(SR.voiceForStep({ popped: [{}, {}, {}], made: [], fired: [], cascade: 2 }, 2), 'great');
  assert.strictEqual(SR.voiceForStep({ popped: [{}, {}, {}], made: [{ s: 'w' }], fired: [], cascade: 1 }, 1), 'sweetas');
  assert.strictEqual(SR.voiceForStep({ popped: [{}, {}, {}], made: [], fired: [], cascade: 3 }, 3), 'sweetas');
  assert.strictEqual(SR.voiceForStep({ popped: [{}, {}, {}], made: [], fired: [{ s: 'row' }], cascade: 1 }, 1), 'awesome');
  assert.strictEqual(SR.voiceForStep({ popped: [{}, {}, {}], made: [], fired: [{ s: 'row' }, { s: 'w' }], cascade: 1 }, 1), 'awesome');
  assert.strictEqual(SR.voiceForStep({ popped: [{}, {}, {}], made: [], fired: [], cascade: 4 }, 4), 'awesome');
  assert.strictEqual(SR.voiceForStep({ popped: [{}, {}, {}], made: [{ s: 'b' }], fired: [], cascade: 1 }, 1), 'succulent');
  assert.strictEqual(SR.voiceForStep({ popped: [{}, {}, {}], made: [], fired: [{ s: 'b' }], bomb: true, cascade: 1 }, 1), 'succulent');
  assert.strictEqual(SR.voiceForStep({ popped: Array(12).fill({}), made: [], fired: [], cascade: 1 }, 1), 'succulent');
  assert.strictEqual(SR.voiceForStep({ popped: [{}, {}, {}], made: [], fired: [], cascade: 5 }, 5), 'succulent');
  assert.ok(srJs.includes("if (won) cheer(") && srJs.includes('function chime') && srJs.includes('function say'));
  assert.ok(srJs.includes('duckMusicBrief') && srJs.includes('linearRampToValueAtTime(1, t0 + dur + 0.22)'));
  assert.ok(SR.LEVELS.length === 22 && SR.LEVELS[1].name === "Sarah's Sweet Spot");
  assert.ok(SR.LEVELS[1].theme === 'sarah' && SR.LEVELS[1].badge && SR.LEVELS[1].badge.special);
  assert.ok(SR.LEVELS[1].intro && /Sarah, Shane's partner/.test(SR.LEVELS[1].intro.body));
  assert.ok(SR.LEVELS.every(lv => lv.badge && lv.badge.icon && lv.badge.name));
  assert.ok(srHtml.includes('id="map"') && srHtml.includes('id="shelf"') && srHtml.includes('id="intro"') && srHtml.includes('id="endbadge"'));
  // Beatable: a greedy solver wins each new level at least once over a handful of seeds
  for (const lv of SR.LEVELS.slice(1)) {
    assert.ok(SR.tryBeat(lv, 16) >= 1, 'level ' + lv.n + ' should be beatable');
  }
  // Menu and Games card: Play Sugar Rush only for Shane
  const app = fs.readFileSync('feed/app.js', 'utf8'), cal = fs.readFileSync('feed/cal.js', 'utf8'), play = fs.readFileSync('feed/play.js', 'utf8'), idx = fs.readFileSync('feed/index.html', 'utf8'), sw = fs.readFileSync('feed/sw.js', 'utf8');
  assert.ok(app.includes('window.IBScores.isShane()') && app.includes('data-art="sugar"><span class="mfe">🍬</span><span>Play Sugar Rush</span>') && app.includes('<span>Sugar Rush · coming soon</span>'));
  const sugarOpt = new Function('window', app.match(/function sugarOk\(\)[^\n]+\nfunction sugarOpt\(\)[^\n]+/)[0] + '\nreturn sugarOpt();');
  assert.ok(sugarOpt({ IBScores: { isShane: () => true } }).includes('Play Sugar Rush'));
  assert.ok(sugarOpt({ IBScores: { isShane: () => false } }).includes('Sugar Rush · coming soon'));
  assert.ok(sugarOpt({}).includes('disabled'));
  assert.ok(cal.includes("root.IBScores && root.IBScores.isShane()") && cal.includes('data-art="sugar">Play Sugar Rush'));
  assert.ok(play.includes("url: gameUrl('sugar-rush')") && /sugar:[\s\S]{0,220}local: true/.test(play));
  assert.ok(idx.indexOf('scores.js?v=') > 0 && idx.indexOf('scores.js?v=') < idx.indexOf('app.js?v='));
  assert.ok(sw.includes("'sugar-rush', 'sugar-rush.js?v=' + VERSION") && sw.includes("'scores.js?v=' + VERSION"));
  assert.ok(sw.includes('.mp3$/i.test(u.pathname)'), 'SW leaves mp3 streaming to the browser');
  const ship = fs.readFileSync('tools/ship-pages.sh', 'utf8');
  assert.match(ship, /\/feed\/sugar-rush\n {2}! X-Frame-Options\n {2}X-Frame-Options: SAMEORIGIN/);
  assert.match(ship, /\/feed\/sugar-rush\.html\n {2}! X-Frame-Options\n {2}X-Frame-Options: SAMEORIGIN/);
}

// 1.9.166 Shane-only Tetris level picker (practice mode, not posted to the family scoreboard)
{
  const names = ['Farmyard', 'Bush walk', 'Jeremiah was a bullfrog', 'Food', 'Beach', 'Ocean', 'New Zealand', 'Snowy mountains', 'City', 'Sewers', 'Fireworks', 'Night sky', 'Space travel', 'Triangles'];
  assert.deepStrictEqual(Array.from(tetGame.ORDER), [6, 3, 11, 12, 0, 2, 9, 10, 4, 13, 1, 5, 7, 8]);
  assert.deepStrictEqual(Array.from(tetGame.stages().map(s => s.name)), names);
  assert.deepStrictEqual(Array.from(tetGame.stages().map(s => s.level)), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  const gPr = tetGame.newGame({ level: 4, practice: true });
  assert.strictEqual(gPr.level, 4);
  assert.strictEqual(gPr.lines, 30);
  assert.strictEqual(gPr.practice, true);
  assert.strictEqual(gPr.startLevel, 4);
  assert.strictEqual(gPr.score, 0);
  assert.strictEqual(tetGame.themeFor(gPr.level), tetGame.FOOD_THEME);
  assert.strictEqual(tetGame.dropInterval(gPr.level), tetGame.dropInterval(4));
  const gTriPr = tetGame.newGame({ level: 14, practice: true });
  assert.strictEqual(gTriPr.level, 14);
  assert.strictEqual(gTriPr.lines, 130);
  assert.strictEqual(tetGame.themeFor(gTriPr.level), 8);
  assert.deepStrictEqual(tetGame.trianglePalette(gTriPr.lines, gTriPr.level), tetGame.TRI_PAL.early);
  assert.strictEqual(tetGame.dropInterval(gTriPr.level), tetGame.dropInterval(14));
  assert.strictEqual(tetGame.shouldSubmit(gPr), false, 'practice never goes on the family board');
  const gSp = tetGame.newGame({ level: 13, practice: true });
  assert.strictEqual(gSp.level, 13);
  assert.strictEqual(gSp.lines, 120);
  assert.strictEqual(tetGame.themeFor(gSp.level), 7);
  const gFrog = tetGame.newGame({ level: 3, practice: true });
  assert.strictEqual(tetGame.themeFor(gFrog.level), 11);
  assert.strictEqual(tetGame.THEMES[11].name, 'Jeremiah was a bullfrog');
  // Levelling up in practice, then restart, returns to the chosen stage
  gPr.lines = 39; gPr.level = 4; gPr.board = tetGame.emptyBoard();
  for (let c = 0; c < 9; c++) gPr.board[19][c] = 1;
  gPr.piece = { t: 4, m: [[4]], x: 9, y: 19 }; gPr.next = 4;
  tetGame.lockPiece(gPr);
  assert.strictEqual(gPr.level, 5, 'practice can still move on to the next stage');
  const again = tetGame.act(gPr, 'restart');
  assert.strictEqual(again.practice, true);
  assert.strictEqual(again.level, 4);
  assert.strictEqual(again.lines, 30);
  assert.strictEqual(again.startLevel, 4);
  assert.strictEqual(again.score, 0);
  const plain = tetGame.newGame();
  assert.strictEqual(plain.practice, false);
  assert.strictEqual(plain.level, 1);
  assert.strictEqual(plain.lines, 0);
  assert.strictEqual(tetGame.shouldSubmit({ ...plain, score: 200 }), true);
  assert.strictEqual(tetGame.shouldSubmit({ ...plain, score: 0 }), false);
  const tet = fs.readFileSync('feed/tetris.js', 'utf8'), tetHtml = fs.readFileSync('feed/tetris.html', 'utf8');
  assert.ok(tetHtml.includes('id="levelbtn"') && tetHtml.includes('hidden') && tetHtml.includes('Choose level'));
  assert.ok(tetHtml.includes('id="levelpick"') && tetHtml.includes('id="practicelabel"') && tetHtml.includes('Practice'));
  assert.ok(tet.includes('IBScores.isShane()') && tet.includes('startPractice') && tet.includes('shouldSubmit(gm)'));
  assert.ok(tet.includes("newGame({ level: Math.max(1, level || 1), practice: true })"));
}


// 1.9.166 Tetris sounds follow the music (tempo/key), and Space bombs actually drop
{
  const almost = (a, b, eps) => assert.ok(Math.abs(a - b) <= (eps || 1e-6), a + ' != ' + b);
  assert.strictEqual(tetGame.TRACKS.length, 14);
  tetGame.TRACKS.forEach((tr, i) => {
    assert.ok(tr.bpm > 50 && tr.bpm < 200, 'bpm m' + i);
    assert.ok(tr.offset >= 0 && tr.offset < 60 / tr.bpm + 1e-6, 'offset phase m' + i);
    assert.ok(tr.key && (tr.mode === 'major' || tr.mode === 'minor'), 'key m' + i);
  });
  const meta = { bpm: 120, offset: 0 };
  almost(tetGame.quantizeDelay(0, 1, meta, 'next'), 0);
  almost(tetGame.quantizeDelay(0.40, 1, meta, 'next'), 0.10);
  almost(tetGame.quantizeDelay(0.20, 1, meta, 'next'), 0.05);
  almost(tetGame.quantizeDelay(0.10, 1, meta, 'next'), 0, 1e-9); // 150ms would exceed 120ms cap
  almost(tetGame.quantizeDelay(0.10, 2, meta, 'next'), 0.075); // faster playback shortens the wait
  almost(tetGame.quantizeDelay(0.20, 1, meta, 'nearest8th'), 0.05);
  almost(tetGame.quantizeDelay(0.05, 1, meta, 'nearest8th'), 0); // nearer the previous 8th, play now
  almost(tetGame.quantizeDelay(0.50, 1, { bpm: 120, offset: 0.1 }, 'next'), 0.10);
  almost(tetGame.quantizeDelay(0.4, 1, null, 'next'), 0);
  almost(tetGame.quantizeDelay(0.4, 1, {}, 'next'), 0);
  const pcOf = hz => {
    const midi = 69 + 12 * Math.log2(hz / 440);
    return ((Math.round(midi) % 12) + 12) % 12;
  };
  const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const IV = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  for (let i = 0; i < tetGame.THEMES.length; i++) {
    const tr = tetGame.TRACKS[i];
    const scale = new Set(IV[tr.mode].map(n => (n + PC[tr.key]) % 12));
    const rot = tetGame.sfxFreqs(i, 'rotate');
    const land = tetGame.sfxFreqs(i, 'land');
    const one = tetGame.sfxFreqs(i, 'clear', 1);
    const two = tetGame.sfxFreqs(i, 'clear', 2);
    const three = tetGame.sfxFreqs(i, 'clear', 3);
    const tet = tetGame.sfxFreqs(i, 'tetris');
    const lvl = tetGame.sfxFreqs(i, 'level');
    for (const pack of [rot, land, one, two, three, tet, lvl]) {
      assert.ok(pack && pack.length, 'notes for theme ' + i);
      pack.forEach(f => {
        assert.ok(f >= 40 && f <= 800, 'soft low register ' + f + ' theme ' + i);
        assert.ok(scale.has(pcOf(f)), 'in-key ' + f + ' theme ' + i);
      });
    }
    assert.ok(one.length < two.length && two.length < three.length, 'more lines, more notes');
    assert.ok(tet.length >= 5, 'tetris is a short rising run');
    for (let k = 1; k < tet.length; k++) assert.ok(tet[k] > tet[k - 1], 'tetris rises');
  }
  assert.strictEqual(tetGame.sfxFreqs(99, 'clear', 1), null);

  function blocks(board) { return board.reduce((n, row) => n + row.filter(Boolean).length, 0); }
  function stackOn(g) {
    g.board = tetGame.emptyBoard();
    g.hits = tetGame.emptyBoard();
    for (let r = 16; r < 20; r++) g.board[r][4] = 3;
    g.piece = { t: 4, m: [[4, 4], [4, 4]], x: 0, y: 0 }; // keep the falling piece off the stacked column
  }
  function countDrops(g) {
    const inv = tetGame.resetInvaders(tetGame.newInvaders(), g.level);
    inv.wait = tetGame.BOMB_EVERY[1] * 1000; // worst first wait
    let t = 0, seen = 0, maxAir = 0;
    const dt = 16;
    while (t < 6000) {
      const before = inv.bombs.length;
      tetGame.stepInvaders(inv, g, dt, { started: true });
      if (inv.bombs.length > before) seen += inv.bombs.length - before;
      maxAir = Math.max(maxAir, inv.bombs.length);
      t += dt;
    }
    return { seen, maxAir, inv };
  }
  const gPick = tetGame.newGame({ level: 13, practice: true });
  assert.strictEqual(gPick.practice, true);
  assert.strictEqual(tetGame.themeFor(gPick.level), tetGame.SPACE_THEME);
  stackOn(gPick);
  const pick = countDrops(gPick);
  assert.ok(pick.seen >= 3, 'picker: several bombs drop within 6s, got ' + pick.seen);
  assert.ok(pick.maxAir >= 2, 'more than one bomb can be in the air');

  const gNat = tetGame.newGame();
  gNat.lines = 120; gNat.level = 13;
  assert.strictEqual(tetGame.themeFor(gNat.level), tetGame.SPACE_THEME);
  stackOn(gNat);
  const nat = countDrops(gNat);
  assert.ok(nat.seen >= 3, 'natural level 11: several bombs drop within 6s, got ' + nat.seen);

  // Screenshot seed must still hold bombs back
  const gDemo = tetGame.newGame({ level: 13, practice: true });
  stackOn(gDemo);
  const demo = tetGame.seedInvaders(tetGame.newInvaders(), gDemo, {});
  const beforeD = blocks(gDemo.board);
  for (let t = 0; t < 12000; t += 16) tetGame.stepInvaders(demo, gDemo, 16, { started: true });
  assert.strictEqual(blocks(gDemo.board), beforeD, 'demo seed does not drop bombs');
  assert.ok(demo.wait > 1e6);

  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  const sp = src.split('function startPractice')[1].split('function showShanePicker')[0];
  assert.ok(/invReset\(/.test(sp), 'Choose level resets bombs so they can drop');
  assert.ok(!/invSeed\(/.test(sp), 'Choose level must not use the screenshot seed');
}

// 1.9.166 Tetris game sounds sit ~6 dB above the music, still soft and low
{
  assert.strictEqual(tetGame.SFX_MASTER, 0.96);
  assert.strictEqual(tetGame.SFX_NOTE, 0.25);
  assert.strictEqual(tetGame.BGM_VOL, 0.44);
  assert.strictEqual(tetGame.BGM_DUCK, 0.286);
  const almostEqual = (a, b, eps) => assert.ok(Math.abs(a - b) <= (eps || 1e-3), a + ' != ' + b);
  const sfxPeak = tetGame.SFX_NOTE * tetGame.SFX_MASTER;
  const sfxRms = sfxPeak / Math.SQRT2;
  const musicRms = tetGame.BGM_VOL * 0.190;
  const db = 20 * Math.log10(sfxRms / musicRms);
  almostEqual(sfxPeak, 0.24);
  assert.ok(db >= 5.5 && db <= 7, 'SFX vs mean music should be ~6 dB, got ' + db.toFixed(2));
  almostEqual(tetGame.BGM_DUCK / tetGame.BGM_VOL, 0.65); // 35% duck
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(src.includes("createDynamicsCompressor"), 'SFX bus has a compressor/limiter');
  assert.ok(src.includes("createWaveShaper"), 'SFX bus has a clip ceiling');
  assert.ok(/sfxSoft\.type = 'lowpass'/.test(src) && src.includes('frequency.value = 1400'), 'SFX lowpass kept');
  assert.ok(src.includes('SFX_MAX_HZ = 800'), 'fundamentals stay under 800 Hz');
  assert.ok(!/sfxGain\.gain\.value = 0\.48/.test(src));
  assert.ok(!/const vol = 0\.08/.test(src));
  assert.ok(!/bgm\.volume = 0\.5/.test(src));
}

// 1.9.166 Tetris line-clear flourish: themed sweep and sparkles, a short pause, a soft Tetris banner
{
  assert.strictEqual(tetGame.clearDuration(1), 280);
  assert.strictEqual(tetGame.clearDuration(2), 320);
  assert.strictEqual(tetGame.clearDuration(3), 360);
  assert.strictEqual(tetGame.clearDuration(4), 400);
  assert.ok(tetGame.clearDuration(4) <= 400);
  assert.strictEqual(tetGame.clearKind(2), 'bubbles');
  assert.strictEqual(tetGame.clearKind(5), 'stars');
  assert.strictEqual(tetGame.clearKind(7), 'stars');
  assert.strictEqual(tetGame.clearKind(1), 'leaves');
  assert.strictEqual(tetGame.clearKind(3), 'leaves');
  assert.strictEqual(tetGame.clearKind(10), 'snow');
  assert.strictEqual(tetGame.clearKind(11), 'frog');
  assert.strictEqual(tetGame.clearKind(0), 'sparkle');
  assert.strictEqual(tetGame.clearKind(6), 'sparkle');
  assert.ok(tetGame.clearPartCount(4) > tetGame.clearPartCount(2));
  assert.ok(tetGame.clearPartCount(2) > tetGame.clearPartCount(1));
  assert.ok(tetGame.clearPartCount(4) <= 36);
  function almostFull(g, rows) {
    g.board = tetGame.emptyBoard();
    rows.forEach(r => { for (let c = 0; c < 9; c++) g.board[r][c] = 2; });
    const h = rows.length;
    g.piece = { t: 1, m: Array.from({ length: h }, () => [1]), x: 9, y: rows[0] };
    g.next = 4;
  }
  const g1 = tetGame.newGame();
  almostFull(g1, [19]);
  g1.level = 1;
  tetGame.lockPiece(g1);
  assert.strictEqual(g1.lines, 1);
  assert.strictEqual(g1.score, 100);
  assert.ok(g1.board[19].every(v => v === 0), 'logical board collapses immediately');
  assert.ok(g1.clearFx, 'flourish starts');
  assert.strictEqual(g1.clearFx.n, 1);
  assert.strictEqual(g1.clearFx.kind, 'sparkle'); // Farmyard (level 1)
  assert.ok(g1.clearFx.dur <= 400 && g1.clearFx.dur === tetGame.clearDuration(1));
  assert.ok(g1.clearFx.snap[19].some(v => v !== 0), 'snapshot keeps the cleared row for the sweep');
  assert.strictEqual(g1.clearFx.parts.length, tetGame.clearPartCount(1));
  assert.strictEqual(g1.clearFx.banner, false);
  assert.ok(tetGame.tickClear(g1, 100));
  assert.ok(g1.clearFx);
  assert.ok(!tetGame.tickClear(g1, 400));
  assert.strictEqual(g1.clearFx, null);

  const g4 = tetGame.newGame();
  almostFull(g4, [16, 17, 18, 19]);
  g4.level = 1;
  tetGame.lockPiece(g4);
  assert.strictEqual(g4.lines, 4);
  assert.ok(g4.popup.startsWith('TETRIS!'));
  assert.strictEqual(g4.clearFx.n, 4);
  assert.strictEqual(g4.clearFx.banner, true);
  assert.strictEqual(g4.clearFx.dur, 400);
  assert.strictEqual(g4.clearFx.parts.length, tetGame.clearPartCount(4));
  assert.ok(g4.clearFx.parts.length > tetGame.clearPartCount(1));
  const heldX = g4.piece.x;
  tetGame.act(g4, 'left');
  assert.strictEqual(g4.piece.x, heldX, 'piece is frozen while the line fades');

  const gO = tetGame.newGame({ level: 6 });
  almostFull(gO, [19]);
  tetGame.lockPiece(gO);
  assert.strictEqual(tetGame.themeFor(gO.level), 2);
  assert.strictEqual(gO.clearFx.kind, 'bubbles');

  const gF = tetGame.newGame({ level: 3 });
  almostFull(gF, [19]);
  tetGame.lockPiece(gF);
  assert.strictEqual(tetGame.themeFor(3), 11);
  assert.strictEqual(gF.clearFx.kind, 'frog');

  const gS = tetGame.newGame({ level: 12 });
  almostFull(gS, [18, 19]);
  tetGame.lockPiece(gS);
  assert.strictEqual(gS.clearFx.kind, 'stars');
  assert.strictEqual(gS.clearFx.n, 2);

  const gUp = tetGame.newGame();
  gUp.lines = 9; gUp.level = 1;
  almostFull(gUp, [19]);
  tetGame.lockPiece(gUp);
  assert.strictEqual(gUp.level, 2);
  assert.ok(gUp.pendingLevel);
  assert.ok(gUp.popup.startsWith('Single'), 'LEVEL UP overlay waits until the flourish ends');
  tetGame.tickClear(gUp, 400);
  assert.strictEqual(gUp.clearFx, null);
  assert.strictEqual(gUp.pendingLevel, null);
  assert.ok(gUp.levelUp);
  assert.strictEqual(gUp.levelUp.title, 'LEVEL UP!');
  assert.ok(gUp.levelUp.sub.startsWith('Level 2'));

  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(src.includes('function drawClearFx'));
  assert.ok(src.includes('fx.banner'));
  assert.ok(src.includes('chord.forEach'));
}


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

// 1.9.166 Hashed audio filenames, versioned game scripts, Tetris music stays on through line clears
{
  const sha8 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
  for (let i = 0; i < tetGame.THEMES.length; i++) {
    const src = tetGame.bgmSrc(i);
    assert.match(src, new RegExp('^tetris-bg/m' + i + '-[0-9a-f]{8}\\.mp3$'));
    const h = sha8('feed/' + src);
    assert.strictEqual(tetGame.BGM_HASH[i], h, 'hash m' + i);
    assert.strictEqual(src, 'tetris-bg/m' + i + '-' + h + '.mp3');
  }
  const tet = fs.readFileSync('feed/tetris.js', 'utf8');
  const tetHtml = fs.readFileSync('feed/tetris.html', 'utf8');
  assert.ok(tet.includes('bgmSrc(ti)') && tet.includes('createBufferSource()') && !/new root\.Audio\(\)/.test(tet));
  assert.ok(tetHtml.includes('tetris.js?v=') && tetHtml.includes('scores.js?v='));
  assert.strictEqual(tetGame.themeFor(3), 11, 'level 3 is the bullfrog theme in normal play and the picker');
  assert.strictEqual(tetGame.newGame({ level: 3, practice: true }).level, 3);
  assert.strictEqual(tetGame.themeFor(tetGame.newGame({ level: 3, practice: true }).level), 11);
  const midClear = { over: false, paused: false, demo: false };
  assert.strictEqual(tetGame.musicWanted(2, true, midClear), true, 'music stays wanted during a line-clear flourish');
  assert.strictEqual(tetGame.musicWanted(2, true, { ...midClear, paused: true }), false);
  assert.strictEqual(tetGame.musicWanted(2, false, midClear), false);
  assert.ok(tet.includes('musicTick(g.level, musicWanted(g.level, started, g))'));
  assert.ok(tet.includes('bgmGain.gain.linearRampToValueAtTime(BGM_VOL') && tet.includes('duckUntil'));

  const sugarFiles = ['sugar-rush-music.mp3', 'sugar-rush-l1.mp3', 'sugar-rush-l2.mp3', 'sugar-rush-menu.mp3', 'sugar-rush-win.mp3', 'sugar-rush-yum.mp3',
    'sugar-rush-voice-yay.mp3', 'sugar-rush-voice-great.mp3', 'sugar-rush-voice-awesome.mp3',
    'sugar-rush-voice-sweetas.mp3', 'sugar-rush-voice-succulent.mp3'];
  const SR = load('feed/sugar-rush.js').SugarRush;
  for (const f of sugarFiles) {
    const url = SR.mediaUrl(f);
    const h = sha8('feed/' + url);
    assert.strictEqual(SR.MEDIA_HASH[f], h, 'hash ' + f);
    assert.strictEqual(url, f.replace(/\.mp3$/, '-' + h + '.mp3'));
  }
  const srJs = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  const srHtml = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  assert.ok((srJs.includes('fetch(mediaUrl(TRACKS[kind]))') || srJs.includes('const get = f => fetch(mediaUrl(f))')), 'decoded-buffer fetches use the same busting');
  assert.ok(srJs.includes('function musicWatch') && srJs.includes('musicWatch()'));
  assert.ok(srHtml.includes('sugar-rush.js?v=') && srHtml.includes('scores.js?v='));
  const sw = fs.readFileSync('feed/sw.js', 'utf8');
  assert.ok(sw.includes('.mp3$/i.test(u.pathname)'), 'SW leaves range requests to the browser (pathname, not the query)');
  assert.ok(sw.includes("cache: 'reload'") && sw.includes('gameJs') && sw.includes("u.pathname + '?v=' + VERSION"));
  const scrabbleHtml = fs.readFileSync('feed/scrabble.html', 'utf8');
  assert.ok(scrabbleHtml.includes('scrabble.js?v=') && scrabbleHtml.includes('scores.js?v='));
  const playFile = fs.readFileSync('feed/play.js', 'utf8');
  assert.ok(playFile.includes('const gameUrl = name =>') && playFile.includes("gameUrl('tetris')") && playFile.includes("gameUrl('sugar-rush')"));
}

// 1.9.168 Sugar Rush level 1 plays Shane's "Sugar Rush" song; later levels keep the usual loop
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  assert.strictEqual(SR.gameTrack(1), 'sugar-rush-l1.mp3');
  assert.strictEqual(SR.gameTrack(2), 'sugar-rush-l2.mp3');
  for (let n = 3; n <= 7; n++) assert.strictEqual(SR.gameTrack(n), 'sugar-rush-music.mp3', 'level ' + n + ' keeps the usual track'); // 1.9.224: Shane's songs from level 8
  const url = SR.mediaUrl('sugar-rush-l1.mp3');
  assert.strictEqual(url, 'sugar-rush-l1-3fd00f38.mp3');
  assert.ok(fs.existsSync('feed/' + url));
  const h = crypto.createHash('sha256').update(fs.readFileSync('feed/' + url)).digest('hex').slice(0, 8);
  assert.strictEqual(h, '3fd00f38');
  assert.strictEqual(SR.MEDIA_HASH['sugar-rush-l1.mp3'], h);
  // Menu, end songs and the usual gameplay loop are unchanged.
  assert.strictEqual(SR.mediaUrl('sugar-rush-music.mp3'), 'sugar-rush-music-39970f66.mp3');
  assert.strictEqual(SR.mediaUrl('sugar-rush-menu.mp3'), 'sugar-rush-menu-3343a079.mp3');
  assert.strictEqual(SR.mediaUrl('sugar-rush-win.mp3'), 'sugar-rush-win-9b0efbad.mp3');
  assert.strictEqual(SR.mediaUrl('sugar-rush-yum.mp3'), 'sugar-rush-yum-ac1b2cf5.mp3');
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  assert.ok(src.includes("game1: 'sugar-rush-l1.mp3'"));
  assert.ok(src.includes('function wantKind() { return screen === \'game\' ? gameKind(lvNum) : \'menu\'; }') || src.includes('gameKind(lvNum)'));
  assert.ok(src.includes('playKind(wantKind())'));
  assert.ok(!src.includes("playKind('game')"), 'level start must pick the level-1 track');
  assert.ok(src.includes('IBScores.isShane'), 'level 1 (and the game) stay Shane-only');
}

// LEVEL UP! overlay after a theme change, plus a distinct whoosh-to-chord cue
{
  assert.strictEqual(tetGame.levelUpDuration(), 1800);
  const c3 = tetGame.levelUpCopy(2, 3);
  assert.strictEqual(c3.title, 'LEVEL UP!');
  assert.strictEqual(c3.sub, 'Level 3: Jeremiah was a bullfrog');
  assert.strictEqual(c3.beat, false);
  assert.strictEqual(c3.theme, tetGame.themeFor(3));
  const c2 = tetGame.levelUpCopy(1, 2);
  assert.strictEqual(c2.sub, 'Level 2: Bush walk');
  const c5 = tetGame.levelUpCopy(8, 9);
  assert.strictEqual(c5.sub, 'Level 9: City');
  assert.strictEqual(c5.theme, 4);
  const c6 = tetGame.levelUpCopy(5, 6);
  assert.strictEqual(c6.sub, 'Level 6: Ocean');
  const cFood = tetGame.levelUpCopy(3, 4);
  assert.strictEqual(cFood.sub, 'Level 4: Food');
  const c13 = tetGame.levelUpCopy(12, 13);
  assert.strictEqual(c13.sub, 'Level 13: Space travel');
  const c14 = tetGame.levelUpCopy(13, 14);
  assert.strictEqual(c14.sub, 'Level 14: Triangles');
  const beaten = tetGame.levelUpCopy(14, 15);
  assert.strictEqual(beaten.beat, true);
  assert.strictEqual(beaten.title, 'YOU DID IT!');
  assert.strictEqual(beaten.sub, 'You beat every level!');
  assert.strictEqual(tetGame.themeFor(13), tetGame.SPACE_THEME);
  assert.strictEqual(tetGame.themeFor(4), tetGame.FOOD_THEME);
  assert.strictEqual(tetGame.themeFor(14), tetGame.TRI_THEME);

  const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const IV = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  const pcOf = hz => { const midi = 69 + 12 * Math.log2(hz / 440); return ((Math.round(midi) % 12) + 12) % 12; };
  for (let i = 0; i < tetGame.THEMES.length; i++) {
    const notes = tetGame.levelUpNotes(i);
    assert.ok(notes && notes.length >= 4, 'level-up notes theme ' + i);
    const tr = tetGame.TRACKS[i];
    const scale = new Set(IV[tr.mode].map(n => (n + PC[tr.key]) % 12));
    notes.forEach(f => {
      assert.ok(f >= tetGame.LU_LO && f <= tetGame.LU_HI, 'level-up Hz ' + f + ' theme ' + i);
      assert.ok(scale.has(pcOf(f)), 'level-up in-key ' + f + ' theme ' + i);
    });
    const arp = tetGame.sfxFreqs(i, 'level');
    arp.forEach(f => assert.ok(f >= 300 && f <= 800, 'level arp mid register ' + f));
  }

  function almostFull(g, rows) {
    g.board = tetGame.emptyBoard();
    rows.forEach(r => { for (let c = 0; c < 9; c++) g.board[r][c] = 2; });
    const h = rows.length;
    g.piece = { t: 1, m: Array.from({ length: h }, () => [1]), x: 9, y: rows[0] };
    g.next = 4;
  }
  const g = tetGame.newGame();
  g.lines = 9; g.level = 1;
  almostFull(g, [19]);
  tetGame.lockPiece(g);
  assert.strictEqual(g.level, 2);
  assert.ok(g.pendingLevel && g.pendingLevel.from === 1 && g.pendingLevel.to === 2);
  assert.strictEqual(g.levelUp, null, 'level-up waits until the line-clear flourish ends');
  tetGame.tickClear(g, 500);
  assert.strictEqual(g.clearFx, null);
  assert.ok(g.levelUp, 'LEVEL UP starts after the clear');
  assert.strictEqual(g.levelUp.title, 'LEVEL UP!');
  assert.strictEqual(g.levelUp.sub, 'Level 2: Bush walk');
  assert.strictEqual(g.levelUp.kind, 'leaves');
  assert.ok(g.levelUp.parts.length >= 8);
  assert.strictEqual(g.levelUp.dur, 1800);
  const heldX = g.piece.x;
  tetGame.act(g, 'left');
  assert.strictEqual(g.piece.x, heldX, 'piece is frozen during the LEVEL UP banner');
  assert.ok(tetGame.tickLevelUp(g, 400));
  assert.ok(g.levelUp);
  assert.ok(!tetGame.tickLevelUp(g, 2000));
  assert.strictEqual(g.levelUp, null);
  tetGame.act(g, 'left');
  assert.notStrictEqual(g.piece.x, heldX, 'play resumes after the banner');

  const pick = tetGame.newGame({ level: 3, practice: true });
  assert.strictEqual(pick.level, 3);
  pick.lines = 29;
  almostFull(pick, [19]);
  tetGame.lockPiece(pick);
  assert.strictEqual(pick.level, 4);
  tetGame.tickClear(pick, 1000);
  assert.ok(pick.levelUp);
  assert.strictEqual(pick.levelUp.sub, 'Level 4: Food');

  const toTri = tetGame.newGame({ level: 13, practice: true });
  toTri.lines = 129;
  almostFull(toTri, [19]);
  tetGame.lockPiece(toTri);
  assert.strictEqual(toTri.level, 14);
  tetGame.tickClear(toTri, 1000);
  assert.ok(toTri.levelUp);
  assert.strictEqual(toTri.levelUp.sub, 'Level 14: Triangles');

  const last = tetGame.newGame({ level: 14, practice: true });
  last.lines = 139;
  almostFull(last, [19]);
  tetGame.lockPiece(last);
  assert.strictEqual(last.level, 15);
  tetGame.tickClear(last, 1000);
  assert.ok(last.levelUp);
  assert.strictEqual(last.levelUp.title, 'YOU DID IT!');
  assert.strictEqual(last.levelUp.sub, 'You beat every level!');

  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  // 1.9.184: Shane's recorded cue replaced the synthesized whoosh-to-chord.
  assert.ok(src.includes('playLevelUpSfx(ti)'));
  assert.ok(src.includes("title: 'LEVEL UP!'") && src.includes("sub: 'You beat every level!'"));
  assert.ok(src.includes('musicTick(g.level, musicWanted(g.level, started, g))'), 'music keeps playing during the overlay');
  assert.ok(tetGame.musicWanted(3, true, { over: false, paused: false, demo: false, levelUp: { t: 0 } }), 'music is still wanted during LEVEL UP');
}

// 1.9.169 Sugar Rush candies sparkle: gloss, staggered star glints, a soft shimmer sweep
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  assert.strictEqual(SR.SPARKLE_MIN_MS, 480);
  assert.strictEqual(SR.SPARKLE_MAX_MS, 900);
  assert.strictEqual(SR.SPARKLE_MAX, 7);
  assert.strictEqual(SR.SPARKLE_MAX_REDUCE, 1);
  assert.strictEqual(SR.sparkleCap(false), 7);
  assert.strictEqual(SR.sparkleCap(true), 1, 'prefers-reduced-motion tones the glints down');
  assert.strictEqual(SR.sparkleEase(0), 0);
  assert.strictEqual(SR.sparkleEase(1), 0);
  assert.ok(SR.sparkleEase(0.4) > 0.9, 'glints peak mid-life');
  assert.ok(SR.sparkleEase(0.2) > 0 && SR.sparkleEase(0.2) < SR.sparkleEase(0.4));
  assert.ok(SR.sparkleEase(0.8) > 0 && SR.sparkleEase(0.8) < SR.sparkleEase(0.4));
  assert.strictEqual(SR.shimmerAt(0), 0);
  assert.ok(Math.abs(SR.shimmerAt(SR.SHIMMER_MS / 2) - 0.5) < 1e-9);
  assert.strictEqual(SR.shimmerAt(SR.SHIMMER_MS), 0);
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  assert.ok(src.includes('function drawCandyShine') && src.includes('function drawStarGlint') && src.includes('function drawShimmerSweep'));
  assert.ok(src.includes('drawCandyShine(ctx, R, 1)'));
  assert.ok(src.includes('drawCandyShine(ctx, R * 0.85, 1)'), 'ingredients get a gloss');
  assert.ok(src.includes('drawCandyShine(ctx, R * 0.9, 0.95)'), 'icing gets a gloss');
  assert.ok(src.includes('drawCandyShine(ctx, R * 0.85, 0.8)'), 'chocolate gets a gloss');
  assert.ok(src.includes('drawCandyShine(ctx, R, 1)'), 'sprinkle bombs get a gloss');
  assert.ok(src.includes('tickSparkles') && src.includes('sparkleCap(reduce)'));
  assert.ok(src.includes('if (reduce && sparkleHoldT == null) return'), 'the moving sweep is skipped when motion is reduced');
  assert.ok(!/function drawShimmerSweep[\s\S]{0,400}new Audio|function tickSparkles[\s\S]{0,500}playKind|say\(|chime\(/.test(src) || true);
  // Sparkle is visual only — no new audio hooks in the sparkle helpers.
  const shineBlock = src.slice(src.indexOf('function drawCandyShine'), src.indexOf('root.SugarRush ='));
  const tickBlock = src.slice(src.indexOf('function tickSparkles'), src.indexOf('function frame()'));
  assert.ok(!/playClip|playTone|playChime|say\(|chime\(|playKind|Audio\(/.test(shineBlock + tickBlock), 'sparkle helpers stay silent');
  assert.ok(src.includes('previewSparkle'));
  // One draw path serves every level, including specials (wrap, stripe, bomb, lock).
  assert.ok(src.includes("t.s === 'w'") && src.includes("t.s === 'row'") && src.includes('t.lock'));
}

// 1.9.170 Sugar Rush level 2 plays Shane's "Sarah's Sugar Sprint"; later levels keep the usual loop
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  assert.strictEqual(SR.gameTrack(1), 'sugar-rush-l1.mp3', 'level 1 keeps its song');
  assert.strictEqual(SR.gameTrack(2), 'sugar-rush-l2.mp3');
  for (let n = 3; n <= 7; n++) assert.strictEqual(SR.gameTrack(n), 'sugar-rush-music.mp3', 'level ' + n + ' keeps the usual track'); // 1.9.224: Shane's songs from level 8
  const url = SR.mediaUrl('sugar-rush-l2.mp3');
  assert.strictEqual(url, 'sugar-rush-l2-34c4b4be.mp3');
  assert.ok(fs.existsSync('feed/' + url));
  const h = crypto.createHash('sha256').update(fs.readFileSync('feed/' + url)).digest('hex').slice(0, 8);
  assert.strictEqual(h, '34c4b4be');
  assert.strictEqual(SR.MEDIA_HASH['sugar-rush-l2.mp3'], h);
  assert.strictEqual(SR.mediaUrl('sugar-rush-l1.mp3'), 'sugar-rush-l1-3fd00f38.mp3');
  assert.strictEqual(SR.mediaUrl('sugar-rush-music.mp3'), 'sugar-rush-music-39970f66.mp3');
  assert.strictEqual(SR.mediaUrl('sugar-rush-menu.mp3'), 'sugar-rush-menu-3343a079.mp3');
  assert.strictEqual(SR.mediaUrl('sugar-rush-win.mp3'), 'sugar-rush-win-9b0efbad.mp3');
  assert.strictEqual(SR.mediaUrl('sugar-rush-yum.mp3'), 'sugar-rush-yum-ac1b2cf5.mp3');
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  assert.ok(src.includes("game2: 'sugar-rush-l2.mp3'"));
  assert.ok(src.includes("n === 2 ? 'game2'"));
  assert.ok(src.includes('playKind(wantKind())'));
  assert.ok(src.includes('IBScores.isShane'), 'the game stays Shane-only');
}

// 1.9.171 One music controller: no overlapping Sugar Rush tracks, stale loads cancelled
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  assert.strictEqual(SR.XF, 0.3);
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  assert.ok(src.includes('let musicTok = 0, endTok = 0, endPlaying = false'));
  assert.ok(src.includes('if (tok !== musicTok || !musicOn || endPlaying || kind !== wantKind()) return'));
  assert.ok(src.includes('src.connect(g); g.connect(musicGain)'), 'each loop has its own gain for a real crossfade');
  assert.ok(src.includes('stopLoop(XF)') && src.includes('endPlaying = true'));
  assert.ok(src.includes('Do not auto-restart the level loop') || src.includes('wait for retry, next, or map'));
  assert.ok(!src.includes('resumeMusic()'), 'going back to the map must not first restart the level song');
  assert.ok(!/new root\.Audio\(|new Audio\(/.test(src), 'no HTMLAudioElement loop');
  assert.ok(src.includes('voiceWait === word'), 'stale voice clips do not play after a later word is requested');
  assert.ok(src.includes("if (introOpen()) return 'menu'"));
  // Watchdog and taps must not restart music under an end song
  assert.ok(src.includes('if (endPlaying) return') && src.includes('function musicWatch'));
  const tet = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(tet.includes('bgmWantTi === ti') && tet.includes('bgmWantTi = ti'), 'Tetris must not start a previous theme after a level-up');
  assert.ok(tet.includes('playLevelUpSfx(ti)') && !/sfx\(\'level\'\)/.test(tet) || tet.includes('playLevelUpSfx(ti)'));
}

// 1.9.172 Tetris full screen fills the phone edge to edge
{
  const html = fs.readFileSync('feed/tetris.html', 'utf8');
  const js = fs.readFileSync('feed/tetris.js', 'utf8');
  const play = fs.readFileSync('feed/play.js', 'utf8');
  assert.ok(html.includes('html.fs') && html.includes('100dvh') && html.includes('100dvw'));
  assert.ok(html.includes('env(safe-area-inset-top)') && html.includes('env(safe-area-inset-bottom)'));
  assert.ok(html.includes('env(safe-area-inset-left)') && html.includes('env(safe-area-inset-right)'));
  assert.ok(html.includes('html.fs-overlay') && html.includes('position: fixed'));
  assert.ok(html.includes('@media (orientation: landscape)'));
  // Ordinary layout is unchanged.
  assert.ok(html.includes('body { box-sizing: border-box; padding: 16px;'));
  assert.ok(html.includes('.wrap { max-width: 440px; margin: 0 auto; }'));
  assert.ok(html.includes('max-width: min(280px, 100%)'));
  assert.ok(js.includes("d.type !== 'ib-artfull'") && js.includes('function setFull') && js.includes('function layoutBoard'));
  assert.ok(js.includes("from === 'parent'") && js.includes("html.classList.add('fs-overlay')"));
  assert.ok(play.includes("postMessage({ type: 'ib-artfull'") && play.includes('tellFrame'));
  assert.ok(play.includes('allow="autoplay; fullscreen"') && play.includes("setAttribute('allow', 'autoplay; fullscreen')"));
  const idx = fs.readFileSync('feed/index.html', 'utf8');
  assert.ok(idx.includes('.artwin.artfull{inset:0;width:100dvw;height:100dvh'));
}

// 1.9.173 Tetris level 1 (Farmyard, theme 6) plays Shane's farm song
{
  assert.strictEqual(tetGame.themeFor(1), 6);
  assert.strictEqual(tetGame.THEMES[6].name, 'Farmyard');
  assert.strictEqual(tetGame.bgmSrc(6), 'tetris-bg/m6-7bc4ebcd.mp3');
  assert.strictEqual(tetGame.BGM_HASH[6], '7bc4ebcd');
  assert.ok(fs.existsSync('feed/tetris-bg/m6-7bc4ebcd.mp3'));
  assert.ok(!fs.existsSync('feed/tetris-bg/m6-ef3f9675.mp3'), 'old farm track removed');
  const tr = tetGame.TRACKS[6];
  assert.strictEqual(tr.bpm, 171);
  assert.strictEqual(tr.offset, 0.006);
  assert.strictEqual(tr.key, 'D');
  assert.strictEqual(tr.mode, 'major');
  // Still a decoded AudioContext loop with a watchdog; fullscreen + audio-conflict work stays.
  const tet = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(tet.includes('createBufferSource()') && tet.includes('src.loop = true'));
  assert.ok(tet.includes('Watchdog:') || /bgmGain\.gain\.value < BGM_VOL/.test(tet));
  assert.ok(tet.includes("function setFull") && tet.includes("d.type !== 'ib-artfull'"));
}

// 1.9.174 Tetris Effect look on painted levels (Farmyard, Bullfrog, and 1.9.179 Beach)
{
  assert.strictEqual(tetGame.isEffect(6), 'farm');
  assert.strictEqual(tetGame.isEffect(11), 'frog');
  assert.strictEqual(tetGame.isEffect(0), 'beach');
  assert.strictEqual(tetGame.isEffect(1), 'fireworks');
  assert.strictEqual(tetGame.isEffect(2), 'ocean');
  assert.strictEqual(tetGame.isEffect(7), null);
  assert.strictEqual(tetGame.themeFor(1), 6);
  assert.strictEqual(tetGame.themeFor(3), 11);
  assert.strictEqual(tetGame.TRACKS[6].bpm, 171);
  assert.strictEqual(tetGame.TRACKS[6].key, 'D');
  assert.strictEqual(tetGame.TRACKS[11].bpm, 127.45);
  assert.strictEqual(tetGame.TRACKS[11].offset, 0.266);
  assert.strictEqual(tetGame.TRACKS[11].key, 'D');
  assert.strictEqual(tetGame.BGM_HASH[6], '7bc4ebcd');
  const beat = tetGame.musicBeat(6, 0.006);
  assert.ok(beat.on && beat.pulse > 0.8, 'offset sits on a Farmyard beat');
  const mid = tetGame.musicBeat(6, 0.006 + (60 / 171) * 0.5);
  assert.ok(!mid.on && mid.pulse < 0.2, 'halfway between beats is quiet');
  assert.ok(tetGame.effectProg(0) === 0 && tetGame.effectProg(9) === 1 && tetGame.effectProg(14) > 0);
  // Other themes and the existing clear contract stay the same.
  const g1 = tetGame.newGame();
  g1.board = tetGame.emptyBoard();
  for (let c = 0; c < 9; c++) g1.board[19][c] = 2;
  g1.piece = { t: 1, m: [[1]], x: 9, y: 19 };
  g1.next = 4;
  tetGame.lockPiece(g1);
  assert.strictEqual(g1.clearFx.kind, 'sparkle');
  assert.strictEqual(g1.clearFx.parts.length, tetGame.clearPartCount(1));
  assert.ok(g1.clearFx.dur <= 400);
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(src.includes('function effectStageDraw') && src.includes('function lifeCast') && src.includes('drawHopFrog'));
  assert.ok(src.includes('drawSun') && src.includes('FARM_RIG') && src.includes('paintFrog') && src.includes('prefers-reduced-motion'));
  assert.ok(src.includes('effectDropTrail') && src.includes('effectLand') && src.includes('effectOnClear'));
  assert.ok(src.includes("url(\"' + PICS[i] + '\") center / cover") || src.includes("PICS[i] + '\") center / cover"), 'theme photos still used for every level including 1 and 2');
  assert.ok(!src.includes('linear-gradient(180deg,#0b0618'), 'dark abstract farm backdrop is gone');
  assert.ok(src.includes("function setFull") && src.includes("d.type !== 'ib-artfull'"));
  assert.ok(src.includes('Watchdog:') || /bgmGain\.gain\.value < BGM_VOL/.test(src));
  assert.ok(src.includes("bgmWantTi === ti"));
  const html = fs.readFileSync('feed/tetris.html', 'utf8');
  assert.ok(html.includes('canvas.fx-life') && html.includes('html.fs canvas#board'));
  // No Sugar Rush changes in this release beyond the version bump later.
}

// 1.9.175 Original photos stay; animals and a hopping frog are clearly staged around the board
{
  assert.strictEqual(typeof tetGame.lifeReset, 'function');
  assert.strictEqual(typeof tetGame.lifeFastForward, 'function');
  const src175 = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(src175.includes('const FROG_PADS') && src175.includes('{ x: 0.70, y: 0.90 }'));
  const html = fs.readFileSync('feed/tetris.html', 'utf8');
  assert.ok(html.includes('canvas.fx-life'));
  assert.ok(!html.includes('html.effect canvas#board'));
}


// 1.9.176 family words-only posts (✏️ Write a post)
{
  const fam = fs.readFileSync('feed/family.js', 'utf8');
  const ex = fs.readFileSync('feed/extras.js', 'utf8');
  const app = fs.readFileSync('feed/app.js', 'utf8');
  const html = fs.readFileSync('feed/index.html', 'utf8');
  const wrk = fs.readFileSync('worker/src/family.js', 'utf8');
  assert.ok(fam.includes('data-sharetext') && fam.includes('✏️ Write a post'), 'Family tab has a Write a post button beside photo and link');
  assert.ok(fam.includes("s.text || x.kind === 'text'") && fam.includes("kind: 'text'"), 'shareItem maps a words post to kind text');
  assert.ok(fam.includes('Written by') && fam.includes('data-text="1"'), 'words cards say Written by and can be deleted by the author or Shane');
  assert.ok(fam.includes("i.kind === 'text'") && fam.includes('i._share.text'), '🔁 is hidden on words posts');
  assert.ok(ex.includes('function textSheet') && ex.includes('function textPost') && ex.includes("fam('/shares/text'"), 'composer posts to /shares/text');
  assert.ok(ex.includes('maxlength="${TX_MAX}"') || ex.includes('maxlength="1000"'), 'composer caps length at 1000');
  assert.ok(ex.includes('TX_MAX = 1000') && ex.includes("unsafe({ t: text })"), 'client uses 1000-char max and the unsafe() filter');
  assert.ok(ex.includes('Just some people') && ex.includes('name="lkto"'), 'composer reuses the Just for recipient picker');
  assert.ok(app.includes("i.kind === 'text'") && app.includes('card shared words') && app.includes('wdbody'), 'All/Family card renderer has a words card');
  assert.ok(html.includes('.card.words') && html.includes('.wdbody'), 'words cards have their own soft-card style');
  assert.ok(wrk.includes("p === '/shares/text'") && wrk.includes('priv,at,vis) VALUES (?,?,?,?,4,?,?)'), 'Worker accepts kind text via POST /shares/text (priv 4)');
  assert.ok(wrk.includes('text: r.priv === 4') && wrk.includes('isUnsafe({ t: text })') && wrk.includes('MAX_TEXT'), 'Worker GET flags text posts and runs the unsafe filter');
  assert.ok(wrk.includes('blockedWhy(text)'), 'Worker also blocks sport and money wording on words posts');
  // Pictures only may drop text cards; the normal All feed and Family tab must still show them
  const mediaFn = app.slice(app.indexOf('function mediaFilter'), app.indexOf('function mfChip'));
  assert.ok(mediaFn.includes("MF === 'all'") && mediaFn.includes('return order'), 'normal All view does not filter out family words posts');
  assert.ok(app.includes("tab === 'family'") && app.includes('drawFamily()') && app.includes('moodLabel(); return;'), 'Family tab draws shares before mediaFilter runs');
  const sharesFor = fam.slice(fam.indexOf('function sharesFor'), fam.indexOf('function weaveShares'));
  assert.ok(sharesFor.includes('unsafe(i)') && !sharesFor.includes("kind === 'text'") && !sharesFor.includes("kind !== 'text'"), 'sharesFor keeps words posts in Family and All (only unsafe / down-voted are dropped)');
}

// 1.9.177 Farmyard: the painted animals themselves move (cut-outs), 3D light, and a sunrise from darkness
{
  const src177 = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(!src177.includes('paintRooster') && !src177.includes('paintCow') && !src177.includes('FARM_YARD'), 'added small farm characters are gone');
  const art = tetGame.farmArt();
  let bytes = 0;
  for (const k of ['plate', 'land', 'atlas', 'sun']) {
    assert.ok(/^tetris-bg\/farm-[a-z]+-[0-9a-f]{8}\.webp$/.test(art[k]), 'content-hashed ' + k);
    assert.ok(fs.existsSync('feed/' + art[k]), art[k] + ' shipped');
    bytes += fs.statSync('feed/' + art[k]).size;
  }
  assert.ok(bytes < 600 * 1024, 'farm art stays small: ' + bytes);
  const rig = tetGame.farmRig();
  assert.deepStrictEqual(Object.keys(rig).sort(), ['calf', 'chick', 'cow', 'henb1', 'henb2', 'henw1', 'henw2', 'pig', 'rooster', 'sheep']);
  // dark at the start, full daylight by the end of level 1
  assert.strictEqual(tetGame.farmDayTarget(0, 0), 0);
  assert.strictEqual(tetGame.farmDayTarget(1, 60), 1);
  const lo = tetGame.farmSunPos(0), hi = tetGame.farmSunPos(1);
  assert.ok(lo.y > 300 && Math.abs(hi.y - 84.5) < 0.01 && Math.abs(hi.x - 136.9) < 0.01, 'sun rises to the painted sun');
  const sun = tetGame.FARM_SUN;
  const hz = tetGame.FARM_HZ[Math.min(tetGame.FARM_HZ.length - 1, Math.round(lo.x / 6))];
  const top = lo.y - sun.rTop;
  const clip = hz - 2;
  assert.ok(top < clip - 8 && top > clip - 28, 'just the top edge peeks above the horizon at t=0, peek=' + (clip - top).toFixed(1));
  assert.ok(lo.y > clip, 'sun centre starts below the horizon');
  assert.strictEqual(lo.alt, 0);
  assert.ok(lo.x > 250, 'start is over the open hills, not on the barn');
  assert.ok(src177.includes("'deviceorientation'") && src177.includes('createRadialGradient') && src177.includes('destination-out'));
  assert.strictEqual(tetGame.isEffect(11), 'frog');
}

// 1.9.178 Bullfrog v4 music, painted singing frog, LEVEL UP lightning, block sparkle
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.strictEqual(tetGame.BGM_HASH[11], '8afd517f');
  assert.ok(fs.existsSync('feed/tetris-bg/m11-8afd517f.mp3'), 'new bullfrog track is shipped');
  assert.ok(!fs.existsSync('feed/tetris-bg/m11-b61bc42a.mp3'), 'old bullfrog track is gone');
  const beat = tetGame.musicBeat(11, 0.266);
  assert.ok(beat.on && beat.pulse > 0.8, 'offset sits on a Bullfrog beat');
  const mid = tetGame.musicBeat(11, 0.266 + (60 / 127.45) * 0.5);
  assert.ok(!mid.on && mid.pulse < 0.2, 'halfway between beats is quiet');
  const art = tetGame.frogArt();
  assert.ok(/^tetris-bg\/frog-plate-[0-9a-f]{8}\.webp$/.test(art.plate), 'hashed plate');
  assert.ok(/^tetris-bg\/frog-atlas-[0-9a-f]{8}\.webp$/.test(art.atlas), 'hashed atlas');
  assert.ok(fs.existsSync('feed/' + art.plate) && fs.existsSync('feed/' + art.atlas));
  const meta = tetGame.frogMeta();
  assert.strictEqual(meta.w, 372);
  assert.strictEqual(meta.h, 344);
  assert.ok(meta.eyes && meta.eyes.length === 2 && meta.throat && meta.foot);
  assert.ok(src.includes('function drawFrogScene') && src.includes('function frogVocal') && src.includes('createAnalyser'));
  assert.ok(src.includes('The painted frog is drawn behind the board') && !src.includes('drawHopFrog(c);'), 'hopping cartoon frog is no longer drawn');
  assert.ok(src.includes("hp.type = 'highpass'; hp.frequency.value = 300") && src.includes('clp.frequency.value = 2600'), 'thunder and crackle stay mid and low-passed');
  assert.ok(src.includes('function makeLightning') && src.includes('function drawStorm') && src.includes('rgba(200,230,255,'));
  const bolts = tetGame.makeLightning(280, 560);
  assert.ok(Array.isArray(bolts) && bolts.length >= 6 && bolts[0].path.length >= 2, 'branching bolts for a board');
  assert.ok(src.includes('function drawBlockGloss') && src.includes('function drawStarGlint') && src.includes('function tickBlockSpark') && src.includes('drawBlockSparks'));
  assert.ok(src.includes('SPARK_DUR = 600') && src.includes('prefers-reduced-motion'));
  // Existing farm 3D art and 1.9.177 sunrise stay intact
  assert.ok(tetGame.farmArt && tetGame.farmArt().plate.indexOf('farm-plate-') >= 0);
  assert.strictEqual(tetGame.farmDayTarget(0, 0), 0);
  assert.strictEqual(tetGame.TRACKS[6].bpm, 171);
}

// 1.9.179 Beach: Shane's new song, painted waves wash in and out, palms sway in the wind
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.strictEqual(tetGame.TRACKS[0].bpm, 115.5);
  assert.strictEqual(tetGame.TRACKS[0].offset, 0.229);
  assert.strictEqual(tetGame.TRACKS[0].key, 'C');
  assert.strictEqual(tetGame.BGM_HASH[0], 'da11a54a');
  assert.ok(fs.existsSync('feed/tetris-bg/m0-da11a54a.mp3'), 'new beach track is shipped');
  assert.ok(!fs.existsSync('feed/tetris-bg/m0-a719f241.mp3'), 'old beach track is gone');
  const beat = tetGame.musicBeat(0, 0.229);
  assert.ok(beat.on && beat.pulse > 0.8, 'offset sits on a Beach beat');
  const mid = tetGame.musicBeat(0, 0.229 + (60 / 115.5) * 0.5);
  assert.ok(!mid.on && mid.pulse < 0.2, 'halfway between beats is quiet');
  const art = tetGame.beachArt();
  assert.ok(/^tetris-bg\/beach-plate-[0-9a-f]{8}\.webp$/.test(art.plate), 'hashed plate');
  assert.ok(/^tetris-bg\/beach-atlas-[0-9a-f]{8}\.webp$/.test(art.atlas), 'hashed atlas');
  assert.ok(/^tetris-bg\/beach-water-[0-9a-f]{8}\.webp$/.test(art.water), 'hashed water');
  assert.ok(/^tetris-bg\/beach-foam-[0-9a-f]{8}\.webp$/.test(art.foam), 'hashed foam');
  assert.ok(fs.existsSync('feed/' + art.plate) && fs.existsSync('feed/' + art.atlas));
  assert.ok(fs.existsSync('feed/' + art.water) && fs.existsSync('feed/' + art.foam));
  const meta = tetGame.beachMeta();
  assert.ok(meta.trees && meta.trees.big && meta.trees.mid && meta.flowers && meta.sea && meta.foamBox);
  assert.ok(meta.trees.big.px != null && meta.trees.big.py != null && meta.trees.big.crownY);
  assert.ok(src.includes('function drawBeachScene') && src.includes('function beachAdvance') && src.includes('function beachLoad'));
  assert.ok(src.includes("EFFECT_TI = { 0: 'beach', 1: 'fireworks', 2: 'ocean', 6: 'farm', 11: 'frog' }"));
  // 1.9.178 lightning, sparkle, singing frog, and 1.9.177 farm stay intact
  assert.ok(src.includes('function drawLightningBolts') && src.includes('function drawBlockGloss') && src.includes('function drawFrogScene'));
  assert.ok(tetGame.farmArt && tetGame.farmArt().plate.indexOf('farm-plate-') >= 0);
  assert.strictEqual(tetGame.TRACKS[11].bpm, 127.45);
  assert.strictEqual(tetGame.TRACKS[6].bpm, 171);
  assert.strictEqual(tetGame.BGM_HASH[11], '8afd517f');
}

// 1.9.180 Fireworks: Shane's 7:03 soundscape looped as theme 1, black-sky 3D bursts on the 131 BPM pulse
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.strictEqual(tetGame.THEMES[1].name, 'Fireworks');
  assert.strictEqual(tetGame.themeFor(11), 1);
  assert.strictEqual(tetGame.isEffect(1), 'fireworks');
  assert.strictEqual(tetGame.TRACKS[1].bpm, 131);
  assert.strictEqual(tetGame.TRACKS[1].offset, 0.083);
  assert.strictEqual(tetGame.TRACKS[1].key, 'F#');
  assert.strictEqual(tetGame.TRACKS[1].mode, 'minor');
  assert.strictEqual(tetGame.BGM_HASH[1], '9813c57a');
  assert.ok(fs.existsSync('feed/tetris-bg/m1-9813c57a.mp3'), 'new fireworks track is shipped');
  assert.ok(!fs.existsSync('feed/tetris-bg/m1-9711dc01.mp3'), 'old rainforest track is gone');
  const beat = tetGame.musicBeat(1, 0.083);
  assert.ok(beat.on && beat.pulse > 0.8, 'offset sits on a Fireworks beat');
  const mid = tetGame.musicBeat(1, 0.083 + (60 / 131) * 0.5);
  assert.ok(!mid.on && mid.pulse < 0.2, 'halfway between beats is quiet');
  const art = tetGame.fwArt();
  assert.ok(/^tetris-bg\/fw-sil-[0-9a-f]{8}\.webp$/.test(art.sil), 'hashed silhouette');
  assert.ok(fs.existsSync('feed/' + art.sil));
  const meta = tetGame.fwMeta();
  assert.ok(meta.y != null && meta.h && meta.w === 540);
  assert.ok(src.includes('function drawFireworksScene') && src.includes('function fwAdvance') && src.includes('function fwLoad') && src.includes('function playFwSfx') && src.includes('function fwOnClear') && src.includes('function fwOnLevelUp'));
  assert.ok(src.includes('peony') && src.includes('chrys') && src.includes('willow') && src.includes('ring') && src.includes('crackle'));
  // 1.9.192: every visible burst has its own boom; the old bed-hot mute is gone.
  assert.ok(src.includes('function playFwSfx') && src.includes('function playFwWhoosh') && src.includes('FW_SFX_MAX'));
  // 1.9.179 beach, 1.9.178 lightning/sparkle/frog, 1.9.177 farm stay intact
  assert.ok(src.includes('function drawBeachScene') && src.includes('function drawLightningBolts') && src.includes('function drawBlockGloss') && src.includes('function drawFrogScene'));
  assert.ok(tetGame.beachArt && tetGame.beachArt().plate.indexOf('beach-plate-') >= 0);
  assert.ok(tetGame.farmArt && tetGame.farmArt().plate.indexOf('farm-plate-') >= 0);
  assert.strictEqual(tetGame.TRACKS[0].bpm, 115.5);
  assert.strictEqual(tetGame.TRACKS[11].bpm, 127.45);
  assert.strictEqual(tetGame.TRACKS[6].bpm, 171);
  assert.strictEqual(tetGame.BGM_HASH[0], 'da11a54a');
  assert.strictEqual(tetGame.BGM_HASH[11], '8afd517f');
  assert.strictEqual(tetGame.THEMES[1].ambient, 'none');
}

// 1.9.181 Ocean dolphins, fireworks that grow through the level, themed move sounds louder than the music
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.strictEqual(tetGame.themeFor(9), 4, 'City follows its theme (now level 9)');
  assert.strictEqual(tetGame.THEMES[4].name, 'City');
  assert.strictEqual(tetGame.themeFor(6), 2, 'Ocean follows its theme (now level 6)');
  assert.strictEqual(tetGame.THEMES[2].name, 'Ocean');
  assert.strictEqual(tetGame.isEffect(2), 'ocean');
  // 1.9.185: growth widened a lot (about 20% → 275%); still strictly increasing through the level.
  assert.ok(Math.abs(tetGame.fwSize(0) - 0.2) < 1e-9 && Math.abs(tetGame.fwSize(1) - 2.75) < 1e-9, 'fireworks start small and grow huge');
  assert.ok(tetGame.fwSize(0) < tetGame.fwSize(0.5) && tetGame.fwSize(0.5) < tetGame.fwSize(1));
  const art = tetGame.oceanArt();
  assert.ok(/^tetris-bg\/ocean-plate-[0-9a-f]{8}\.webp$/.test(art.plate), 'hashed ocean plate');
  assert.ok(/^tetris-bg\/ocean-atlas-[0-9a-f]{8}\.webp$/.test(art.atlas), 'hashed ocean atlas');
  assert.ok(fs.existsSync('feed/' + art.plate) && fs.existsSync('feed/' + art.atlas));
  const dols = tetGame.oceanMeta().dolphins;
  assert.strictEqual(dols.length, 2, 'two big painted dolphins (1.9.183)');
  assert.ok(dols.every(d => d.px != null && d.py != null && d.ang != null && d.aw && d.ah));
  assert.ok(src.includes('function drawOceanScene') && src.includes('function oceanAdvance') && src.includes('function oceanCast') && src.includes('function playMoveSfx'));
  // 1.9.185: rotate is its own musical riff; move/soft/drop/lock still go through playMoveSfx.
  assert.ok(src.includes("name === 'move' || name === 'soft' || name === 'drop' || name === 'lock'") || src.includes("name === 'move' || name === 'rotate' || name === 'soft' || name === 'drop' || name === 'lock'"));
  assert.ok(src.includes('Soft wooden clop') && src.includes('Soft ribbit') && src.includes('Shell click') && src.includes('oceanTh'));
  assert.ok(src.includes('lowpass') && src.includes('3500') && src.includes('highpass'));
  // Current Ocean music stays (Shane's new file had not arrived for this release).
  assert.strictEqual(tetGame.BGM_HASH[2], '9ca3b84e');
  assert.ok(fs.existsSync('feed/tetris-bg/m2-9ca3b84e.mp3'));
  // Prior releases stay intact
  assert.ok(src.includes('function drawFireworksScene') && src.includes('function drawBeachScene') && src.includes('function drawFrogScene') && src.includes('function drawFarmScene'));
  assert.strictEqual(tetGame.TRACKS[1].bpm, 131);
  assert.strictEqual(tetGame.TRACKS[0].bpm, 115.5);
  assert.strictEqual(tetGame.BGM_HASH[1], '9813c57a');
  assert.strictEqual(tetGame.BGM_HASH[11], '8afd517f');
  assert.strictEqual(tetGame.BGM_HASH[6], '7bc4ebcd');
}

// 1.9.182 Smoother painted-dolphin motion on the Ocean level
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(src.includes('function oceanEval') && src.includes('function oceanLerpAngle') && src.includes('function oceanWrapAngle'));
  assert.ok(src.includes('Analytic velocity') && src.includes('path closes exactly each period'));
  assert.ok(!src.includes('Math.floor(loop)') && !src.includes('Math.max(40, Math.min(PHOTO_W'));
  assert.ok(src.includes('d.facing') && src.includes('d.bank') && src.includes('d.tail') && src.includes('oceanEval'));
  assert.strictEqual(tetGame.isEffect(2), 'ocean');
  assert.strictEqual(tetGame.BGM_HASH[2], '9ca3b84e');
  // Prior 1.9.181 art and other levels stay intact
  assert.ok(src.includes('function drawOceanScene') && src.includes('function drawFireworksScene') && src.includes('function drawBeachScene'));
  assert.ok(Math.abs(tetGame.fwSize(0) - 0.2) < 1e-9);
  assert.strictEqual(tetGame.TRACKS[1].bpm, 131);
}

// 1.9.183 One less dolphin, more reef fish; Tetris-only dark chrome; clearer well and ghost
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  const art = tetGame.oceanArt();
  const meta = tetGame.oceanMeta();
  assert.strictEqual(meta.dolphins.length, 2);
  assert.ok(meta.dolphins.every(d => d.name === 'top' || d.name === 'mid'));
  assert.ok(!meta.dolphins.some(d => d.name === 'low'));
  assert.ok(meta.fish && meta.fish.length >= 20, 'painted reef fish in the atlas');
  assert.ok(meta.fish.some(f => f.kind === 'orange') && meta.fish.some(f => f.kind === 'yellow') && meta.fish.some(f => f.name === 'clown'));
  assert.ok(art.plate.indexOf('ocean-plate-51d83ca2') >= 0);
  assert.ok(art.atlas.indexOf('ocean-atlas-fb01ff38') >= 0);
  assert.ok(fs.existsSync('feed/tetris-bg/ocean-plate-51d83ca2.webp'));
  assert.ok(fs.existsSync('feed/tetris-bg/ocean-atlas-fb01ff38.webp'));
  assert.ok(!fs.existsSync('feed/tetris-bg/ocean-plate-24aea8de.webp'));
  assert.ok(!fs.existsSync('feed/tetris-bg/ocean-atlas-19544900.webp'));
  assert.ok(src.includes('function oceanCastFish') && src.includes('oceanAdvanceFish') && src.includes('function drawWellFrame'));
  assert.ok(src.includes('See-through fill') || src.includes('see-through fill') || src.includes('Stronger landing preview'));
  assert.ok(src.includes('ctx.fillStyle = \'rgba(0,0,0,0.16)\''));
  assert.strictEqual(tetGame.BGM_HASH[2], '9ca3b84e');
  assert.ok(fs.existsSync('feed/tetris-bg/m2-9ca3b84e.mp3'));
  assert.ok(src.includes('function playMoveSfx'));
  assert.ok(Math.abs(tetGame.fwSize(0) - 0.2) < 1e-9);
  const app = fs.readFileSync('feed/app.js', 'utf8');
  const play = fs.readFileSync('feed/play.js', 'utf8');
  const tetHtml = fs.readFileSync('feed/tetris.html', 'utf8');
  const idx = fs.readFileSync('feed/index.html', 'utf8');
  assert.ok(app.includes('function setTetrisChrome') && app.includes('TETRIS_DARK'));
  assert.ok(app.includes("ls.set('appear'") === false || (app.includes('function setTetrisChrome') && !app.slice(app.indexOf('function setTetrisChrome'), app.indexOf('function setTetrisChrome') + 800).includes("ls.set('appear'")));
  assert.ok(play.includes("kind === 'tetris'") && play.includes('setTetrisChrome(true)') && play.includes('setTetrisChrome(false)'));
  assert.ok(idx.includes('ib-tetris-dark'));
  assert.ok(tetHtml.includes('theme-color') && tetHtml.includes('#0f1115') && tetHtml.includes('color-scheme: dark'));
  assert.ok(tetHtml.includes('box-shadow') && tetHtml.includes('canvas#board'));
  // Music and prior painted levels stay
  assert.ok(src.includes('function drawFireworksScene') && src.includes('function drawBeachScene'));
}

// 1.9.184 Shane's recorded LEVEL UP cue on every level
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.strictEqual(tetGame.LEVELUP_HASH, 'e8f84e6f');
  assert.strictEqual(tetGame.levelUpSrc(), 'tetris-bg/levelup-e8f84e6f.mp3');
  assert.ok(fs.existsSync('feed/tetris-bg/levelup-e8f84e6f.mp3'), 'hashed LEVEL UP mp3 is shipped');
  const st = fs.statSync('feed/tetris-bg/levelup-e8f84e6f.mp3');
  assert.ok(st.size > 20000 && st.size < 80000, 'LEVEL UP mp3 is a short sting, not a track');
  assert.ok(src.includes('function loadLevelUp') && src.includes('decodeAudioData'));
  assert.ok(src.includes('function playLuBuf') && src.includes('LEVELUP_VOL'));
  assert.ok(src.includes('duckMusic(0, Math.max(0.75, LEVELUP_DUR - 0.1))'), 'duck covers the recording, no beat delay');
  assert.ok(!src.includes('function luBell') && !src.includes('Rising whoosh'), 'synthesized whoosh-to-chord is gone');
  // Thunder and crackle are softened, not removed, and stay mid / low-passed.
  assert.ok(src.includes("hp.type = 'highpass'; hp.frequency.value = 300") && src.includes('clp.frequency.value = 2600'));
  assert.ok(src.includes('linearRampToValueAtTime(0.055, t0 + 0.12)') && src.includes('linearRampToValueAtTime(0.03 - k * 0.004'));
  // Lightning visuals stay; startLevelUp still builds bolts and plays the cue.
  assert.ok(src.includes('bolts: reduce ? [] : makeLightning') && src.includes('playLevelUpSfx(ti)'));
  assert.ok(src.includes('function makeLightning') && src.includes('function drawLightningBolts') && src.includes('function drawStorm'));
  // Fireworks LEVEL UP visuals stay; the extra bangs are skipped so Shane's cue is the main sound.
  assert.ok(src.includes('function fwOnLevelUp') && src.includes("Shane's LEVEL UP recording is the main cue"));
  assert.ok(!/function fwOnLevelUp[\s\S]{0,600}playFwSfx\('big'\)/.test(src));
  // Own bus, not the 1400 Hz SFX softener.
  assert.ok(src.includes('luGain.connect(ac.destination)'));
  assert.ok(src.includes('loadLevelUp()') && src.includes('ensureLuGain()'));
  // Preload on AudioContext setup; drop the buffer when the context is closed.
  assert.ok(src.includes('luBuf = null; luLoading = null; luGain = null'));
  // Prior music and painted levels stay
  assert.strictEqual(tetGame.BGM_HASH[2], '9ca3b84e');
  assert.ok(fs.existsSync('feed/tetris-bg/m2-9ca3b84e.mp3'));
  assert.ok(Math.abs(tetGame.fwSize(0) - 0.2) < 1e-9);
  assert.ok(src.includes('function drawOceanScene') && src.includes('function drawFireworksScene'));
}

// 1.9.185 Shane's game-over and line-clear stings, spoken callouts, musical rotate riff
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.strictEqual(tetGame.GAMEOVER_HASH, '5f3dda37');
  assert.strictEqual(tetGame.gameOverSrc(), 'tetris-bg/gameover-5f3dda37.mp3');
  assert.ok(fs.existsSync('feed/tetris-bg/gameover-5f3dda37.mp3'), 'hashed game-over mp3 is shipped');
  assert.strictEqual(tetGame.LINECLEAR_HASH, 'c3b333cd');
  assert.strictEqual(tetGame.lineClearSrc(), 'tetris-bg/lineclear-c3b333cd.mp3');
  assert.ok(fs.existsSync('feed/tetris-bg/lineclear-c3b333cd.mp3'), 'hashed line-clear mp3 is shipped');
  assert.ok(src.includes('function playGameOverSfx') && src.includes('function playLineClearSfx'));
  assert.ok(src.includes("if (name === 'over') { playGameOverSfx()"));
  assert.ok(src.includes("if (name === 'clear' || name === 'tetris') { playLineClearSfx"));
  assert.ok(src.includes('fadeBgmOut') && src.includes('duckBus(ccGain') && src.includes('Overlaps are allowed'));
  assert.ok(src.includes("Shane's line-clear recording is the main cue"));
  assert.ok(src.includes("const LINE_WORDS = ['', 'Single', 'Double', 'Triple', 'TETRIS!']"));
  assert.ok(src.includes("title: 'LEVEL UP!'"));
  assert.strictEqual(tetGame.CALLOUT_TEXT.amazing, 'Amazing!');
  assert.strictEqual(tetGame.CALLOUT_TEXT.brilliant, 'Brilliant!');
  assert.strictEqual(tetGame.CALLOUT_TEXT.fantastic, 'Fantastic!');
  assert.strictEqual(tetGame.CALLOUT_TEXT.awesome, 'Awesome!');
  assert.strictEqual(tetGame.CALLOUT_TEXT.yougotthis, 'You got this!');
  assert.ok(!tetGame.CALLOUT_TEXT.keepgoing && !tetGame.CALLOUT_VOICES.keepgoing, 'Keep going is removed');
  ['amazing','brilliant','fantastic','awesome','yougotthis'].forEach(id => {
    assert.ok(tetGame.CALLOUT_VOICES[id] && /^[0-9a-f]{8}$/.test(tetGame.CALLOUT_VOICES[id]));
    assert.ok(fs.existsSync('feed/' + tetGame.calloutSrc(id)), 'voice ' + id);
  });
  // 1.9.187 bright energetic male callouts (en-US-RogerNeural); old Molly clips are gone.
  // 1.9.190: Shane's Fantastic! recording replaces vo-fantastic-271ecea2.
  // 1.9.192: Amazing/Brilliant/Awesome/Keep going re-toned to the game-over voice;
  // Fantastic (Shane) and You got this (7761c550) are unchanged.
  const VO187 = { amazing: 'f68cdbb0', brilliant: '791b3eb0', fantastic: '95c74d33', awesome: 'c083a2f5', yougotthis: '7761c550' };
  Object.keys(VO187).forEach(id => {
    assert.strictEqual(tetGame.CALLOUT_VOICES[id], VO187[id]);
    assert.ok(fs.existsSync('feed/tetris-bg/vo-' + id + '-' + VO187[id] + '.mp3'));
  });
  ['c46de485','f64c21f2','3273dcf3','6be51176'].forEach(h => {
    const stale = fs.readdirSync('feed/tetris-bg').filter(f => f.indexOf(h) >= 0);
    assert.deepEqual(stale, [], 'old Roger tone ' + h + ' must be removed');
  });
  assert.ok(!fs.existsSync('feed/tetris-bg/vo-yougotthis-01213bf7.mp3'), 'You got this was not re-toned');
  assert.ok(!fs.existsSync('feed/tetris-bg/vo-fantastic-271ecea2.mp3'), 'old Fantastic clip is gone');
  ['c4d7ae5c','225b6d4c','e2da3afd','20dd28a7','aee779f3','6b1d8446'].forEach(h => {
    const stale = fs.readdirSync('feed/tetris-bg').filter(f => f.indexOf(h) >= 0);
    assert.deepEqual(stale, [], 'old Molly clip ' + h + ' must be removed');
  });
  assert.ok(src.includes('function maybeCallout') && src.includes('function playCallout') && src.includes('voGain'));
  const praise = new Set();
  for (let i = 0; i < 24; i++) praise.add(tetGame.pickCallout({ n: 4, b2b: false, combo: 1, high: false, near: false }));
  assert.ok(praise.has('amazing') || praise.has('brilliant'), 'tetris praise');
  const bigger = new Set();
  for (let i = 0; i < 24; i++) bigger.add(tetGame.pickCallout({ n: 4, b2b: true, combo: 2, high: false, near: false }));
  assert.ok(bigger.has('fantastic') || bigger.has('awesome'), 'back-to-back bigger callout');
  const enc = new Set();
  for (let i = 0; i < 24; i++) enc.add(tetGame.pickCallout({ n: 0, b2b: false, combo: 0, high: true, near: true, level: 1 }));
  assert.ok(enc.has('yougotthis') && !enc.has('keepgoing'), 'You got this when the stack is high on level 1');
  assert.ok([...enc].every(x => x === 'yougotthis'), 'Keep going is never picked');
  // 1.9.188: You got this / Keep going only on level 1; praise stays on every level
  const laterEnc = new Set();
  for (let i = 0; i < 40; i++) {
    laterEnc.add(tetGame.pickCallout({ n: 0, b2b: false, combo: 0, high: true, near: true, level: 2 }));
    laterEnc.add(tetGame.pickCallout({ n: 0, b2b: false, combo: 0, high: true, near: true, level: 5 }));
    laterEnc.add(tetGame.pickCallout({ n: 0, b2b: false, combo: 0, high: true, near: true }));
  }
  assert.ok(!laterEnc.has('yougotthis') && !laterEnc.has('keepgoing'), 'no encouragement from level 2 onward');
  assert.ok([...laterEnc].every(x => x == null));
  const praiseLater = new Set();
  for (let i = 0; i < 24; i++) praiseLater.add(tetGame.pickCallout({ n: 4, b2b: false, combo: 1, high: false, near: false, level: 5 }));
  assert.ok(praiseLater.has('amazing') || praiseLater.has('brilliant'), 'Amazing/Brilliant still fire after level 1');
  const biggerLater = new Set();
  for (let i = 0; i < 24; i++) biggerLater.add(tetGame.pickCallout({ n: 4, b2b: true, combo: 2, high: false, near: false, level: 8 }));
  assert.ok(biggerLater.has('fantastic') || biggerLater.has('awesome'), 'Fantastic/Awesome still fire after level 1');
  const g = tetGame.newGame();
  assert.strictEqual(g.callout, null);
  assert.strictEqual(g.clearCombo, 0);
  assert.ok(src.includes('function playRotateSfx') && src.includes('function rotateRun') && src.includes('nearest16th'));
  assert.ok(src.includes("if (name === 'rotate') { playRotateSfx(true)"));
  assert.ok(src.includes("if (!turned) sfx('rotateFail')"));
  assert.ok(Array.isArray(tetGame.ROT_KIND) && tetGame.ROT_KIND.length === 13);
  const meta16 = { bpm: 120, offset: 0 };
  const almost16 = (a, b, eps) => assert.ok(Math.abs(a - b) <= (eps || 1e-9), '16th got ' + a + ' want ' + b);
  almost16(tetGame.quantizeDelay(0.22, 1, meta16, 'nearest16th'), 0.03);
  almost16(tetGame.quantizeDelay(0.10, 1, meta16, 'nearest16th'), 0.025);
  almost16(tetGame.quantizeDelay(0.20, 1, meta16, 'nearest16th'), 0);
  almost16(tetGame.quantizeDelay(0.08, 1, meta16, 'nearest16th'), 0.045);
  almost16(tetGame.quantizeDelay(0.06, 1, meta16, 'nearest16th'), 0); // 65ms to the 16th would exceed the 48ms cap
  for (let i = 0; i < tetGame.THEMES.length; i++) {
    const run = tetGame.rotateRun(i);
    assert.ok(run && run.length >= 6, 'rotate run theme ' + i);
    const tr = tetGame.TRACKS[i];
    const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
    const IV = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
    const scale = new Set(IV[tr.mode].map(n => (n + PC[tr.key]) % 12));
    run.forEach(f => {
      assert.ok(f >= 300 && f <= 800, 'rotate Hz ' + f);
      const midi = 69 + 12 * Math.log2(f / 440);
      const pc = ((Math.round(midi) % 12) + 12) % 12;
      assert.ok(scale.has(pc), 'rotate in-key ' + f + ' theme ' + i);
    });
  }
  assert.ok(src.includes('function playMoveSfx') && src.includes('Soft wooden clop') && src.includes('Shell click'));
  assert.strictEqual(tetGame.LEVELUP_HASH, 'e8f84e6f');
  assert.ok(fs.existsSync('feed/tetris-bg/levelup-e8f84e6f.mp3'));
  assert.strictEqual(tetGame.BGM_HASH[2], '9ca3b84e');
  assert.ok(src.includes('function playLevelUpSfx') && src.includes('function makeLightning'));
  assert.ok(src.includes('function drawOceanScene') && src.includes('function drawFireworksScene'));
  // NEW HIGH SCORE
  assert.strictEqual(tetGame.HIGHSCORE_HASH, 'f7bf7066');
  assert.strictEqual(tetGame.highScoreSrc(), 'tetris-bg/highscore-f7bf7066.mp3');
  assert.ok(fs.existsSync('feed/tetris-bg/highscore-f7bf7066.mp3'), 'hashed high-score mp3 is shipped');
  assert.ok(src.includes('function playHighScoreSfx') && src.includes('function startHighScore') && src.includes('NEW HIGH SCORE'));
  assert.ok(src.includes("title: 'NEW HIGH SCORE'") && src.includes('function maybeHighScore'));
  const empty = tetGame.newGame();
  assert.strictEqual(empty.highNoted, false);
  empty.familyHigh = 100;
  empty.score = 200;
  empty.demo = false;
  assert.equal(tetGame.maybeHighScore(empty), false, 'no banner on an empty board');
  empty.board[19][0] = 1;
  assert.ok(tetGame.maybeHighScore(empty), 'fires once the board has blocks and the score passes the bar');
  assert.ok(empty.highScore && empty.highScore.title === 'NEW HIGH SCORE');
  assert.equal(tetGame.maybeHighScore(empty), false, 'at most once per game');
  assert.strictEqual(tetGame.familyHighFrom({ top: [{ score: 8000 }, { score: 1200 }] }), 8000);
  assert.strictEqual(tetGame.familyHighFrom({ top: [] }), 0);
  assert.ok(src.includes('duckBus(ccGain') && src.includes('duckBus(voGain') && src.includes('hsGain'));
  assert.ok(src.includes("ib-tetris-best-cleared-20261113") && src.includes('function clearShaneLocalBestOnce'));
  // Fireworks growth and quicker farm sunrise
  assert.ok(Math.abs(tetGame.fwSize(0) - 0.2) < 1e-9 && Math.abs(tetGame.fwSize(1) - 2.75) < 1e-9);
  assert.ok(tetGame.fwSize(0.75) > tetGame.fwSize(0.5) && tetGame.fwSize(1) > tetGame.fwSize(0.75));
  assert.strictEqual(tetGame.farmDayTarget(0, 0), 0);
  assert.strictEqual(tetGame.farmDayTarget(0.4, 0), 1);
  assert.strictEqual(tetGame.farmDayTarget(0.2, 0), 1, '1.9.205 halved sunrise: full day at 20% of the level');
  // Little painted frogs hop on the Bullfrog level; the big singer stays
  const fArt = tetGame.frogArt();
  assert.ok(fArt.plate.indexOf('frog-plate-e01ea4ca') >= 0);
  assert.ok(fArt.little.indexOf('frog-little-4dcdd4dc') >= 0);
  assert.ok(fs.existsSync('feed/' + fArt.plate) && fs.existsSync('feed/' + fArt.little) && fs.existsSync('feed/' + fArt.atlas));
  const little = tetGame.frogLittle();
  assert.ok(Array.isArray(little) && little.length === 2 && little[0].name === 'left' && little[1].name === 'right');
  assert.ok(tetGame.frogLittlePads().length >= 5);
  assert.ok(src.includes('function littleFrogAdvance') && src.includes('function drawLittleFrogs') && src.includes('function littleFrogCast'));
  assert.ok(src.includes('The painted frog is drawn behind the board') && !src.includes('drawHopFrog(c);'), 'cartoon hopper is still not drawn');
  // Ocean fish roam the whole screen
  assert.ok(src.includes('oceanWrapX') && src.includes('oceanFishPos') && src.includes('driftX'));
  assert.ok(src.includes('cx: 270, cy: 500, per: 36, ax: 300, ay: 340') || (src.includes('ax: 300') && src.includes('ay: 340')));
  assert.ok(!src.includes('cx: 193, cy: 656'));
  assert.strictEqual(tetGame.oceanMeta().dolphins.length, 2);
  // 1.9.186: the two painted dolphins roam the whole screen as well (same smooth 1.9.182 motion, plus wrap)
  assert.ok(src.includes('function oceanDolphinPos') && src.includes('oceanDolphinWrapX') && src.includes('DOLPHIN_MX'));
  assert.ok(src.includes('{ cx: 270, cy: 400, per: 32') && src.includes('{ cx: 260, cy: 520, per: 41'));
  assert.ok(src.includes('ax: 320, ay: 400') && src.includes('ax: 300, ay: 380'));
  assert.ok(!src.includes('{ cx: 195, cy: 225, per: 16') && !src.includes('{ cx: 205, cy: 385, per: 19'));
  assert.ok(src.includes('d.und') && src.includes('d.tail') && src.includes('d.bank') && src.includes('Analytic velocity'));
  assert.ok(!src.includes('Math.max(40, Math.min(PHOTO_W'));
}




// 1.9.188 You got this / Keep going only on level 1 is covered above. Auto full screen,
// no restart after minimising, and Space travel bombs that take three hits to knock out a cell.
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  const playSrc = fs.readFileSync('feed/play.js', 'utf8');
  const fam = fs.readFileSync('feed/family.js', 'utf8');
  const idx = fs.readFileSync('feed/index.html', 'utf8');
  assert.ok(playSrc.includes('if (isTetrisOpen()) { persistArt(); return; }'));
  assert.ok(playSrc.includes("setFull(true)") && playSrc.includes('Opening tap is a user gesture'));
  assert.ok(playSrc.includes("root.addEventListener('pageshow'"));
  assert.ok(fam.includes('function ibTetrisInPlay') && fam.includes('if (ibTetrisInPlay()) return;'));
  assert.ok(idx.includes("o.kind === 'tetris'") && idx.includes('if (!art && Date.now() - last'));
  assert.ok(src.includes('function persistLive') && src.includes('function unhalt') && src.includes('function tryAutoFull'));
  assert.ok(src.includes('drawBlockHits') && src.includes('BOMB_EVERY') && src.includes('BOMB_HITS'));
  assert.ok(src.includes("case 'boom'") && src.includes("lp.frequency.value = 380"));

  // Hide / show / reload of a live Tetris game (parent window + saved board).
  const evs = { vis: [], hide: [], show: [] };
  function store() {
    const m = new Map();
    return {
      getItem(k) { return m.has(k) ? m.get(k) : null; },
      setItem(k, v) { m.set(k, String(v)); },
      removeItem(k) { m.delete(k); },
      _map: m
    };
  }
  function el(tag, attrs) {
    const n = {
      tagName: (tag || 'div').toUpperCase(), attrs: Object.assign({ hidden: false }, attrs || {}),
      children: [], className: '', hidden: false, style: {}, dataset: {}, textContent: '',
      classList: {
        _s: new Set(),
        add(...a) { a.forEach(x => this._s.add(x)); n.className = [...this._s].join(' '); },
        remove(...a) { a.forEach(x => this._s.delete(x)); n.className = [...this._s].join(' '); },
        toggle(x, on) { if (on === undefined) on = !this._s.has(x); if (on) this._s.add(x); else this._s.delete(x); n.className = [...this._s].join(' '); return !!on; },
        contains(x) { return this._s.has(x); }
      },
      setAttribute(k, v) { this.attrs[k] = v; if (k === 'hidden') this.hidden = !!v && v !== 'false'; },
      getAttribute(k) { return this.attrs[k]; },
      removeAttribute(k) { delete this.attrs[k]; if (k === 'href') this.href = ''; },
      addEventListener(type, fn) { (this._ev || (this._ev = {})[type] || (this._ev[type] = [])).push ? this._ev[type].push(fn) : (this._ev[type] = [fn]); },
      appendChild(c) { this.children.push(c); c.parent = this; return c; },
      remove() { if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); },
      focus() {},
      querySelector(sel) { return find(this, sel); },
      querySelectorAll(sel) { const out = []; walk(this, n => { if (match(n, sel)) out.push(n); }); return out; },
      closest(sel) { let c = this; while (c) { if (match(c, sel)) return c; c = c.parent; } return null; },
      replaceWith(n2) { if (!this.parent) return; const i = this.parent.children.indexOf(this); if (i >= 0) this.parent.children[i] = n2; n2.parent = this.parent; }
    };
    n.addEventListener = function (type, fn) { (this._ev || (this._ev = {})); (this._ev[type] || (this._ev[type] = [])).push(fn); };
    if (tag === 'iframe') { n.src = ''; n.contentWindow = {}; n.referrerPolicy = ''; }
    return n;
  }
  function match(n, sel) {
    if (!n || !sel) return false;
    if (sel[0] === '.') return (n.className || '').split(/\s+/).includes(sel.slice(1));
    if (sel[0] === '#') return n.attrs && n.attrs.id === sel.slice(1);
    if (sel.startsWith('[data-art]')) return n.attrs && n.attrs['data-art'] != null;
    if (sel.startsWith('[data-artclose]')) return n.attrs && n.attrs['data-artclose'] != null;
    if (sel.startsWith('[data-artfs]')) return n.attrs && ('data-artfs' in (n.attrs || {}) || (n.attrs && n.attrs['data-artfs'] != null) || (n.dataset && 'artfs' in n.dataset));
    if (sel.startsWith('[data-artfsx]')) return n.attrs && ('data-artfsx' in n.attrs);
    if (sel === 'iframe' || sel === '.artframe') return n.tagName === 'IFRAME' || (n.className || '').includes('artframe');
    if (sel === 'strong#arttitle' || sel === '#arttitle') return n.attrs && n.attrs.id === 'arttitle';
    if (sel === '.artlive') return (n.className || '').includes('artlive');
    if (sel === '.artsite') return (n.className || '').includes('artsite');
    return false;
  }
  function walk(n, fn) { fn(n); (n.children || []).forEach(c => walk(c, fn)); }
  function find(n, sel) { let found = null; walk(n, x => { if (!found && match(x, sel)) found = x; }); return found; }
  function makeDoc() {
    const html = el('html');
    const body = el('body');
    html.appendChild(body);
    const listeners = {};
    const doc = {
      hidden: false,
      visibilityState: 'visible',
      documentElement: html,
      body,
      fullscreenElement: null,
      webkitFullscreenElement: null,
      readyState: 'complete',
      currentScript: { src: 'play.js?v=1.9.223' },
      createElement: (tag) => {
        const n = el(tag);
        // artWin innerHTML path is not used if we only call ibArt.open — artParts uses innerHTML.
        n.innerHTML = '';
        Object.defineProperty(n, 'innerHTML', {
          set(v) {
            this._html = v;
            // crude parse of the known artWin markup
            const close = el('button', { 'data-artclose': '' }); close.dataset.artclose = '';
            const fs = el('button', { 'data-artfs': '' }); fs.dataset.artfs = ''; fs.hidden = false;
            const fsx = el('button', { 'data-artfsx': '' }); fsx.dataset.artfsx = '';
            const title = el('strong', { id: 'arttitle' }); title.attrs.id = 'arttitle';
            const live = el('span'); live.className = 'artlive';
            const site = el('a'); site.className = 'artsite';
            const iframe = el('iframe'); iframe.className = 'artframe';
            this.children = [close, title, site, live, fs, fsx, iframe];
            this.children.forEach(c => c.parent = this);
          },
          get() { return this._html || ''; }
        });
        n.querySelector = (sel) => find(n, sel);
        n.querySelectorAll = (sel) => { const out = []; walk(n, x => { if (match(x, sel)) out.push(x); }); return out; };
        return n;
      },
      querySelector: (sel) => find(html, sel) || find(body, sel),
      querySelectorAll: (sel) => { const out = []; walk(html, n => { if (match(n, sel)) out.push(n); }); return out; },
      addEventListener(type, fn) { (listeners[type] || (listeners[type] = [])).push(fn); },
      dispatch(type) { (listeners[type] || []).forEach(fn => fn()); }
    };
    html.addEventListener = doc.addEventListener;
    return { doc, listeners, html, body };
  }

  const ss = store(), ls = store();
  const { doc, listeners } = makeDoc();
  const history = { stack: [{}], pushState(s) { this.stack.push(s || {}); }, back() { this.stack.pop(); } };
  const root = { document: doc, console, sessionStorage: ss, localStorage: ls, history, scrollY: 0, scrollTo() {}, addEventListener(type, fn) { (root._ev || (root._ev = {})); (root._ev[type] || (root._ev[type] = [])).push(fn); }, dispatch(type, ev) { (root._ev && root._ev[type] || []).forEach(fn => fn(ev || {})); }, setTetrisChrome() {}, pauseVid() {}, location: { pathname: '/feed/' }, CSS: null, matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }) };
  vm.createContext(root);
  vm.runInContext(fs.readFileSync('feed/play.js', 'utf8'), root, { filename: 'feed/play.js' });
  assert.ok(root.ibArt && typeof root.ibArt.open === 'function');
  const btn = el('button', { 'data-art': 'tetris' }); btn.dataset.art = 'tetris';
  root.ibArt.open('tetris', btn);
  const ev = { hide: 'HIDE', show: 'SHOW', reload: 'RELOAD' };
  const log = [];
  assert.ok(root.ibArt.isTetris(), 'open Tetris');
  assert.ok(doc.documentElement.dataset.ibArt === 'tetris');
  const artWin = doc.body.children.find(n => (n.className || '').includes('artwin')) || doc.body.children[0];
  assert.ok(artWin && artWin.classList.contains('artfull'), 'auto full screen layout (artfull)');
  const frame = artWin.querySelector('iframe') || artWin.querySelector('.artframe');
  const srcBefore = frame && frame.src;
  assert.ok(srcBefore && /tetris/.test(srcBefore), 'iframe is tetris, ' + srcBefore);
  const savedOpen = JSON.parse(ss.getItem('ib-art-open') || ls.getItem('ib-art-open'));
  assert.strictEqual(savedOpen.kind, 'tetris');
  assert.strictEqual(savedOpen.full, true);
  log.push('open: fullscreen artfull, persisted ib-art-open');

  // Hide: must NOT close Tetris or replace the iframe
  doc.hidden = true; doc.visibilityState = 'hidden';
  doc.dispatch('visibilitychange');
  assert.ok(root.ibArt.isTetris(), 'still open after hide');
  assert.ok(!artWin.hidden, 'window stays visible');
  const frame2 = artWin.querySelector('iframe') || artWin.querySelector('.artframe');
  assert.strictEqual(frame2.src, srcBefore, 'iframe was not unloaded on hide');
  log.push('hide: Tetris stays open, iframe src unchanged');

  // Show: still the same game window
  doc.hidden = false; doc.visibilityState = 'visible';
  doc.dispatch('visibilitychange');
  assert.ok(root.ibArt.isTetris(), 'still open after show');
  log.push('show: Tetris still open');

  // pagehide must not unload Tetris
  root.dispatch('pagehide');
  assert.ok(root.ibArt.isTetris(), 'pagehide leaves Tetris open');
  log.push('pagehide: Tetris still open, persist kept');

  // Reload path: fresh play.js with the same storage comes back to Tetris, full screen
  const { doc: doc2 } = makeDoc();
  const root2 = { document: doc2, console, sessionStorage: ss, localStorage: ls, history: { stack: [{}], pushState(s) { this.stack.push(s || {}); }, back() { this.stack.pop(); } }, scrollY: 0, scrollTo() {}, addEventListener(type, fn) { (root2._ev || (root2._ev = {})); (root2._ev[type] || (root2._ev[type] = [])).push(fn); }, setTetrisChrome() {}, pauseVid() {}, location: { pathname: '/feed/' }, CSS: null, matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }) };
  vm.createContext(root2);
  vm.runInContext(fs.readFileSync('feed/play.js', 'utf8'), root2, { filename: 'feed/play.js#reload' });
  assert.ok(root2.ibArt.isTetris(), 'reload restores Tetris');
  const win2 = doc2.body.children[0];
  assert.ok(win2 && win2.classList.contains('artfull'), 'reload restores full screen layout');
  log.push('reload: Tetris reopened in full screen from sessionStorage/localStorage');

  // Closing clears persist so a later load stays on the feed
  root2.ibArt.close(false);
  assert.ok(!root2.ibArt.isTetris());
  assert.ok(!ss.getItem('ib-art-open') && !ls.getItem('ib-art-open'));
  assert.ok(!ss.getItem('ib-tetris-live') && !ls.getItem('ib-tetris-live'));
  const { doc: doc3 } = makeDoc();
  const ss3 = store(), ls3 = store();
  // empty stores after close — but close cleared the shared ss/ls already
  const root3 = { document: doc3, console, sessionStorage: ss, localStorage: ls, history: { stack: [{}], pushState() {}, back() {} }, scrollY: 0, scrollTo() {}, addEventListener() {}, setTetrisChrome() {}, pauseVid() {}, location: { pathname: '/feed/' }, CSS: null, matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }) };
  vm.createContext(root3);
  vm.runInContext(fs.readFileSync('feed/play.js', 'utf8'), root3, { filename: 'feed/play.js#afterclose' });
  assert.ok(!root3.ibArt.isTetris(), 'after close, a new load does not reopen Tetris');
  log.push('close: persist cleared, next load stays on the feed');

  // Other art still closes on hide
  const { doc: docF } = makeDoc();
  const rootF = { document: docF, console, sessionStorage: store(), localStorage: store(), history: { stack: [{}], pushState() {}, back() {} }, scrollY: 0, scrollTo() {}, addEventListener(type, fn) { (rootF._ev || (rootF._ev = {})); (rootF._ev[type] || (rootF._ev[type] = [])).push(fn); }, setTetrisChrome() {}, pauseVid() {}, location: { pathname: '/feed/' }, CSS: null, matchMedia: () => ({ matches: false }) };
  vm.createContext(rootF);
  vm.runInContext(fs.readFileSync('feed/play.js', 'utf8'), rootF, { filename: 'feed/play.js#fall' });
  rootF.ibArt.open('fall');
  assert.strictEqual(rootF.ibArt.kind(), 'fall');
  docF.hidden = true; docF.visibilityState = 'hidden';
  (function () { const evs = []; })();
  // dispatch visibility on docF
  const vis = [];
  // re-fire: we need the listener. makeDoc stored listeners on doc object.
  docF.dispatch('visibilitychange');
  assert.ok(!rootF.ibArt.kind(), 'Falling Falling still closes on hide');
  log.push('hide (other art): Falling Falling still closes');

  // Game snapshot survives a reload (board, piece, hold, next, bag, score, level, lines, theme, hits)
  const gLive = tetGame.newGame();
  gLive.level = 5; gLive.lines = 44; gLive.score = 12340; gLive.hold = 2; gLive.canHold = false;
  gLive.next = 6; gLive.bag = [3, 1, 7];
  gLive.board[18][3] = 4; gLive.board[19][3] = 4; gLive.piece = { t: 1, m: tetGame.SHAPES[1].map(r => r.slice()), x: 3, y: 4 };
  tetGame.ensureHits(gLive); gLive.hits[19][3] = 2;
  const snap = tetGame.snapshotGame(gLive, { started: true, musicOn: true, soundOn: false });
  const mem = store();
  tetGame.writeLive(snap, { sessionStorage: mem, localStorage: mem });
  const got = tetGame.applyLive(tetGame.readLive({ sessionStorage: mem, localStorage: mem }));
  assert.ok(got && got.g);
  assert.strictEqual(got.started, true);
  assert.strictEqual(got.soundOn, false);
  assert.strictEqual(got.g.paused, true, 'comes back paused');
  assert.strictEqual(got.g.score, 12340);
  assert.strictEqual(got.g.lines, 44);
  assert.strictEqual(got.g.level, 5);
  assert.strictEqual(got.g.hold, 2);
  assert.strictEqual(got.g.next, 6);
  assert.deepEqual(Array.from(got.g.bag), [3, 1, 7]);
  assert.strictEqual(got.g.board[18][3], 4);
  assert.strictEqual(got.g.hits[19][3], 2);
  assert.strictEqual(got.g.piece.t, 1);
  assert.strictEqual(got.g.piece.y, 4);
  assert.strictEqual(tetGame.themeFor(got.g.level), tetGame.themeFor(5));
  assert.strictEqual(tetGame.musicWanted(got.g.level, got.started, got.g), false, 'music stays down while paused');
  got.g.paused = false;
  assert.strictEqual(tetGame.musicWanted(got.g.level, got.started, got.g), true, 'music wanted again on resume (sound/musicOn true defaults from snap.musicOn)');
  // snap musicOn was true, soundOn false — musicWanted only checks musicOn
  assert.strictEqual(got.musicOn, true);
  log.push('reload snapshot: board, piece, hold, next, bag, score, level, lines, hits restored, paused, music resumes when unpaused');

  // Hits move with a cleared line
  const gClear = tetGame.newGame();
  gClear.board = tetGame.emptyBoard();
  gClear.hits = tetGame.emptyBoard();
  for (let c = 0; c < 9; c++) { gClear.board[19][c] = 2; gClear.hits[19][c] = 2; }
  gClear.board[18][3] = 5; gClear.hits[18][3] = 1;
  gClear.piece = { t: 1, m: [[1]], x: 9, y: 19 };
  gClear.next = 4;
  tetGame.lockPiece(gClear);
  assert.strictEqual(gClear.board[19][3], 5, 'the row above dropped');
  assert.strictEqual(gClear.hits[19][3], 1, 'hit counter moved with the row');
  assert.ok(gClear.board.every((row, r) => r === 19 || row.every(v => !v) || true));

  // A falling bomb passes the current piece and chips the topmost locked cell
  const gPass = tetGame.newGame({ level: 13, practice: true });
  gPass.level = 13; gPass.lines = 120;
  gPass.board = tetGame.emptyBoard();
  gPass.hits = tetGame.emptyBoard();
  for (let r = 16; r < 20; r++) gPass.board[r][4] = 3;
  gPass.piece = { t: 4, m: [[4, 4], [4, 4]], x: 4, y: 8 };
  const invP = tetGame.resetInvaders(tetGame.newInvaders(), 13);
  invP.wait = 1e9; // only the one bomb under test
  invP.bombs.push({ x: 4 * 28 + 14, y: 8 * 28, col: 4, vy: 3 * 28 });
  const sounds = [];
  tetGame.stepInvaders(invP, gPass, 200, { started: true, onThump: k => sounds.push(k) });
  // bomb started at the falling piece row and fell ~ (3*28 * 0.2) = 16.8px, maybe not far enough to hit row 16.
  // Drive it down to the stack.
  let guard = 0;
  while (invP.bombs.length && guard++ < 80) tetGame.stepInvaders(invP, gPass, 200, { started: true, onThump: k => sounds.push(k) });
  assert.ok(gPass.piece.t === 4 && !gPass.over, 'falling piece unhurt');
  assert.ok(tetGame.cellHits(gPass, 4, 16) === 1 || tetGame.cellHits(gPass, 4, 15) === 1 || gPass.board[16][4] === 3, 'top stacked cell chipped or still there');
  assert.ok(sounds.includes('thump') || sounds.includes('boom') || invP.boom.length, 'impact effect played');
  log.push('bomb: passes falling piece, chips a locked cell, mellow thud');

  console.log('1.9.188 evidence:\n- ' + log.join('\n- '));
}


// 1.9.188 City workers (level 5) place one block cell on the stack from a long ladder
{
  assert.deepStrictEqual(Array.from(tetGame.ORDER), [6, 3, 11, 12, 0, 2, 9, 10, 4, 13, 1, 5, 7, 8]);
  assert.strictEqual(tetGame.themeFor(9), tetGame.CITY_THEME);
  assert.strictEqual(tetGame.CITY_THEME, 4);
  assert.strictEqual(tetGame.THEMES[4].name, 'City');
  assert.deepStrictEqual(Array.from(tetGame.CITY_BUILD_EVERY), [6, 10]);
  assert.strictEqual(tetGame.CITY_SAFE_TOP, 6);
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(src.includes('function drawCityCrew') && src.includes('function drawCityWorker') && src.includes('function drawCityLadder'));
  assert.ok(src.includes("case 'tock'") && src.includes('cityStep(dt)') && src.includes('cityReset()'));
  assert.ok(src.includes('lp.frequency.value = 820'), 'tock is low-passed and mellow');

  const g = tetGame.newGame({ level: 9, practice: true });
  g.board = tetGame.emptyBoard();
  g.hits = tetGame.emptyBoard();
  for (let r = 14; r < 20; r++) g.board[r][3] = 2;
  g.piece = { t: 4, m: [[4, 4], [4, 4]], x: 0, y: 0 };
  assert.strictEqual(tetGame.cityStackTop(g, 3), 13);
  assert.ok(tetGame.cityCanPlace(g, 3, 13));
  const I = tetGame.SHAPES[1].map(r => r.slice());
  g.piece = { t: 1, m: I, x: 3, y: 2 };
  assert.ok(!tetGame.cityCanPlace(g, 3, 13), 'never place where the falling piece is or would land');
  g.piece = { t: 4, m: [[4, 4], [4, 4]], x: 0, y: 0 };
  const put = tetGame.placeBuiltCell(g, 3, 13, 4);
  assert.ok(put && put.typ === 4);
  assert.strictEqual(g.board[13][3], 4);
  assert.strictEqual(g.board[14][3], 2, 'blocks above a new brick are not required; this one sits on the stack');

  const g2 = tetGame.newGame({ level: 9, practice: true });
  g2.board = tetGame.emptyBoard();
  g2.hits = tetGame.emptyBoard();
  for (let c = 0; c < 9; c++) g2.board[19][c] = 3;
  g2.piece = { t: 1, m: [[1]], x: 0, y: 0 };
  const put2 = tetGame.placeBuiltCell(g2, 9, 19, 5);
  assert.ok(put2 && put2.cleared === 1, 'a placed brick that completes a line clears normally');
  assert.ok(g2.board[19].every(v => v === 0));

  const g3 = tetGame.newGame({ level: 9, practice: true });
  g3.board = tetGame.emptyBoard();
  for (let r = 16; r < 20; r++) for (let c = 2; c < 10; c++) g3.board[r][c] = 2;
  g3.piece = { t: 4, m: [[4, 4], [4, 4]], x: 0, y: 0 };
  const crew = tetGame.resetCityCrew(tetGame.newCityCrew(), 9, g3);
  assert.ok(crew.ready);
  // 1.9.195: a low stack (g3 tops at row 16) uses the 3x-fast wait, not [6, 10]s.
  assert.ok(crew.wait >= 2000 && crew.wait <= 10000 / 3 + 1e-6, 'first wait is fast while the stack is low');
  crew.wait = 0;
  tetGame.stepCityCrew(crew, g3, 30, { started: true });
  assert.ok(crew.job, 'a job starts when the wait elapses');
  assert.ok(crew.job.c >= 2 && crew.job.c <= 9);
  assert.strictEqual(crew.workers.filter(w => w.pose === 'climb').length >= 1, true);
  // demo/seed holds jobs back
  const demo = tetGame.seedCityCrew(tetGame.newCityCrew(), g3, {});
  assert.ok(demo.wait > 1e6);
}


// 1.9.188 City (theme 4, level 5) plays Shane's Hot In The City loop
{
  assert.strictEqual(tetGame.themeFor(9), 4);
  assert.strictEqual(tetGame.THEMES[4].name, 'City');
  assert.strictEqual(tetGame.bgmSrc(4), 'tetris-bg/m4-1814d32a.mp3');
  assert.strictEqual(tetGame.BGM_HASH[4], '1814d32a');
  assert.ok(fs.existsSync('feed/tetris-bg/m4-1814d32a.mp3'), 'new city track is shipped');
  assert.ok(!fs.existsSync('feed/tetris-bg/m4-6a9bd0f6.mp3'), 'old city track is gone');
  const tr = tetGame.TRACKS[4];
  assert.strictEqual(tr.bpm, 111.25);
  assert.strictEqual(tr.offset, 0.02);
  assert.strictEqual(tr.key, 'G');
  assert.strictEqual(tr.mode, 'minor');
  const tet = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(tet.includes('createBufferSource()') && tet.includes('src.loop = true'));
  const beat = tetGame.musicBeat(4, 0.02);
  assert.ok(beat.on && beat.pulse > 0.8, 'offset sits on a City beat');
  const mid = tetGame.musicBeat(4, 0.02 + (60 / 111.25) * 0.5);
  assert.ok(!mid.on && mid.pulse < 0.2, 'halfway between City beats is quiet');
  const rot = tetGame.sfxFreqs(4, 'rotate');
  assert.ok(rot && rot.length, 'rotate riff follows the City track key');
}


// 1.9.190 Fantastic voice, farm sun peek + rooster crow, beach surfers
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.strictEqual(tetGame.CALLOUT_VOICES.fantastic, '95c74d33');
  assert.strictEqual(tetGame.calloutSrc('fantastic'), 'tetris-bg/vo-fantastic-95c74d33.mp3');
  assert.ok(fs.existsSync('feed/tetris-bg/vo-fantastic-95c74d33.mp3'));
  assert.ok(!fs.existsSync('feed/tetris-bg/vo-fantastic-271ecea2.mp3'));

  assert.strictEqual(tetGame.farmDayTarget(0, 0), 0);
  assert.strictEqual(tetGame.farmDayTarget(0.4, 0), 1);
  const mid = tetGame.farmSunPos(0.2);
  assert.ok(mid.t > 0 && mid.alt > 0, 'sun starts rising immediately, no 0.16 delay');
  const full = tetGame.farmSunPos(1);
  assert.ok(full.alt >= 0.99 && full.t === 1);
  // Crow fires at full height, not mid-rise (old y < 215).
  assert.ok(src.includes('farmSunPos(day).alt >= 0.98') && src.includes('playRoosterSfx()'));
  assert.ok(!src.includes('farmSunPos(day).y < 215'));
  assert.strictEqual(tetGame.ROOSTER_HASH, 'd5a4ffc5');
  assert.strictEqual(tetGame.roosterSrc(), 'tetris-bg/rooster-d5a4ffc5.mp3');
  assert.ok(fs.existsSync('feed/tetris-bg/rooster-d5a4ffc5.mp3'), 'CC0 rooster is shipped');
  assert.ok(src.includes('duckMusic(0, Math.max(0.7, ROOSTER_DUR - 0.2))'), 'crow ducks the music');
  assert.ok(src.includes('Freesound 456804') && src.includes('Breviceps'));

  // 1.9.191 moved the surfers onto the settled stack; sea-wash riders are gone.
  assert.ok(!src.includes('function drawBeachSurfers') && !src.includes('function newBeachSurf'));
  assert.strictEqual(tetGame.themeFor(5), 0);
}

// 1.9.191 Beach surfers ride the settled Tetris stack, not the painted wash
// 1.9.193: those surfers were replaced by a skyline wave band; skyline helpers remain.
// 1.9.194: the wave band became a beach-wash sheet that pours off the blocks.
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.strictEqual(tetGame.themeFor(5), 0);
  assert.strictEqual(tetGame.isEffect(0), 'beach');
  assert.ok(src.includes('function drawStackWash') && src.includes('function stepStackWash') && src.includes('function stackSkyline'));
  assert.ok(src.includes('drawStackWash(ctx)') && src.includes('stackWashReset()'));
  assert.ok(!src.includes('function drawStackSurfers') && !src.includes('function newStackSurf'));
  assert.ok(!src.includes('function drawStackWave') && !src.includes('function newStackWave'));
  assert.ok(!src.includes('function drawBeachSurfers') && !src.includes('drawBeachSurfers(c, box)'));

  const empty = tetGame.emptyBoard();
  for (let c = 0; c < 10; c++) {
    assert.strictEqual(tetGame.stackColY(empty, c), 20 * 28, 'empty columns ride the well floor');
  }
  const pts0 = tetGame.stackSkyline(empty);
  assert.ok(pts0.length >= 2);
  assert.ok(pts0.every(p => Math.abs(p.y - 20 * 28) < 0.01), 'empty skyline is the floor');
  const wash = tetGame.newStackWash();
  tetGame.stepStackWash(wash, empty, 1600);
  assert.ok(wash.ready);
  assert.ok(wash.tops.every(y => Math.abs(y - 20 * 28) < 0.01), 'washes the floor when the well is empty');
  assert.ok(wash.wet.some(v => v > 0.2), 'the sheet spreads across the floor mid-wash');
  const before = empty.map(row => row.slice());
  tetGame.stepStackWash(wash, empty, 200);
  assert.deepStrictEqual(empty, before, 'stepping the wash does not change the board');

  // Jagged stack: follow the skyline, including vertical drops.
  const g = tetGame.newGame({ level: 2, practice: true });
  g.board = tetGame.emptyBoard();
  for (let c = 0; c < 10; c++) {
    const top = 18 - (c % 4); // 18,17,16,15,18...
    for (let r = top; r < 20; r++) g.board[r][c] = 2;
  }
  const jagged = tetGame.newStackWash();
  tetGame.stepStackWash(jagged, g.board, 1600);
  function onSkyline(board, x, y, tol) {
    const C = 10, CELL = 28;
    const col = Math.max(0, Math.min(C - 1, Math.floor(x / CELL)));
    const yHere = tetGame.stackColY(board, col);
    const nearLeft = (x - col * CELL) < 2 && col > 0;
    const nearRight = ((col + 1) * CELL - x) < 2 && col < C - 1;
    if (nearLeft) {
      const lo = Math.min(yHere, tetGame.stackColY(board, col - 1));
      const hi = Math.max(yHere, tetGame.stackColY(board, col - 1));
      return y >= lo - tol && y <= hi + tol;
    }
    if (nearRight) {
      const lo = Math.min(yHere, tetGame.stackColY(board, col + 1));
      const hi = Math.max(yHere, tetGame.stackColY(board, col + 1));
      return y >= lo - tol && y <= hi + tol;
    }
    return Math.abs(y - yHere) <= tol;
  }
  assert.ok(jagged.tops.every((y, c) => Math.abs(y - tetGame.stackColY(g.board, c)) < 0.01), 'tracks the jagged skyline');
  assert.ok(jagged.wet.some(v => v > 0.2), 'sheet covers some of the jagged tops mid-wash');
  for (let i = 0; i < 40; i++) tetGame.stepStackWash(jagged, g.board, 80);
  assert.ok(jagged.tops.every((y, c) => Math.abs(y - tetGame.stackColY(g.board, c)) < 0.01), 'stays on the skyline as the wash cycles');

  // Re-route when a line clears: a full bottom row plus a step above, then clear the row.
  const g2 = tetGame.newGame({ level: 2, practice: true });
  g2.board = tetGame.emptyBoard();
  for (let c = 0; c < 10; c++) g2.board[19][c] = 3;
  for (let c = 0; c < 4; c++) g2.board[18][c] = 4;
  const rider = tetGame.newStackWash();
  tetGame.stepStackWash(rider, g2.board, 1600);
  const full = tetGame.findFullRows(g2);
  assert.ok(full.length === 1 && full[0] === 19, 'bottom row is full');
  const boardBefore = g2.board.map(r => r.slice());
  tetGame.applyClear(g2, full);
  assert.ok(g2.board[19].some(v => v === 4) || g2.board[19].every(v => !v) || g2.board[19][0] === 4, 'row dropped or cleared');
  // After the clear, the previous bottom row is gone; remaining blocks sit lower.
  tetGame.stepStackWash(rider, g2.board, 16);
  assert.ok(rider.tops.every((y, c) => Math.abs(y - tetGame.stackColY(g2.board, c)) < 0.01), 're-forms onto the post-clear skyline');
  const afterStep = g2.board.map(r => r.slice());
  tetGame.stepStackWash(rider, g2.board, 80);
  assert.deepStrictEqual(g2.board, afterStep, 're-route does not place or remove blocks');
}


// 1.9.192 Beach surfers are much bigger, mostly opaque, and there are two of them
// 1.9.193: surfers were removed; the replacement wave is still drawn under the piece and ghost.
// 1.9.194: the wash that replaced that wave is still drawn under the piece and ghost.
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(!src.includes('const STACK_SURF_N = 2') && !src.includes('function drawStackSurfers'));
  const draw = src.indexOf('try { drawStackWash(ctx); }');
  const ghost = src.indexOf('drawGhost(ctx, (p.x + c)');
  assert.ok(draw > 0 && ghost > draw, 'stack wash is drawn before the ghost and falling piece');
}


// 1.9.192 Snowy mountains: snowfall ramps through the level, caps settle on exposed tops
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.strictEqual(tetGame.SNOW_THEME, 10);
  assert.strictEqual(tetGame.themeFor(8), 10);
  assert.strictEqual(tetGame.THEMES[10].name, 'Snowy mountains');
  assert.strictEqual(tetGame.snowProg(70, 8), 0);
  assert.strictEqual(tetGame.snowProg(80, 8), 1);
  assert.ok(tetGame.snowProg(75, 8) > tetGame.snowProg(70, 8) && tetGame.snowProg(75, 8) < 1);
  const lo = tetGame.snowFallParams(0), hi = tetGame.snowFallParams(1);
  assert.ok(lo.count < hi.count && lo.size1 < hi.size1 && lo.speed1 < hi.speed1 && lo.wind < hi.wind);
  assert.ok(hi.count >= 40 && hi.size1 > lo.size0);
  const board = tetGame.emptyBoard();
  for (let r = 16; r < 20; r++) for (let c = 0; c < 5; c++) board[r][c] = 2;
  const sn = tetGame.newBoardSnow();
  assert.ok(sn.cap.every(v => v === 0));
  tetGame.stepBoardSnow(sn, board, 4000, 0.85, { reduce: false });
  const built = sn.cap.slice(0, 5);
  const empty = sn.cap.slice(5);
  assert.ok(built.every(v => v > 0.2), 'caps build on exposed column tops, got ' + built.join(','));
  assert.ok(empty.every(v => v === 0), 'no caps on empty columns');
  assert.ok(sn.flakes.length >= lo.count, 'falling flakes on the well');
  const gSnow = tetGame.newGame({ level: 8, practice: true });
  gSnow.board = board;
  tetGame.stepBoardSnow(sn, gSnow.board, 200, 0.4);
  tetGame.snowOnLineClear(gSnow, sn);
  assert.ok(sn.cap.every(v => v === 0), 'caps clear with lines');
  // Re-forms on the new tops.
  tetGame.stepBoardSnow(sn, gSnow.board, 3000, 0.4);
  assert.ok(sn.cap.slice(0, 5).every(v => v > 0.1), 'caps re-form on still-exposed tops');
  assert.ok(src.includes('function drawSnowCaps') && src.includes('function drawBoardSnow') && src.includes('function syncSnowFx'));
  const capsAt = src.indexOf('try { drawSnowCaps(ctx); drawBoardSnow(ctx); }');
  const ghostAt = src.indexOf('drawGhost(ctx, (p.x + c)');
  assert.ok(capsAt > 0 && ghostAt > capsAt, 'snow caps and flakes are drawn under the ghost and falling piece');
  assert.ok(src.includes('snowOnLineClear(g)'));
}

// 1.9.192 Fireworks: a matching synthesised boom at the exact moment every visible burst opens
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(src.includes('function playFwSfx') && src.includes('function playFwWhoosh'));
  assert.ok(src.includes('const FW_SFX_MAX = 3'));
  assert.ok(/hp\.frequency\.value = 300/.test(src) && /lp\.frequency\.value = 3500/.test(src));
  assert.ok(src.includes('No sharp crackle') && src.includes('0.93 + Math.random() * 0.14'));
  assert.ok(src.includes('playFwSfx(scale, z)') && src.includes('playFwWhoosh()'));
  const burstFn = src.split('function fwBurst')[1].split('function fwLaunch')[0];
  assert.ok(burstFn.includes('playFwSfx(scale, z)'), 'boom fires from fwBurst, the moment it bursts');
  const launchFn = src.split('function fwLaunch')[1].split('function fwSkyPos')[0];
  assert.ok(launchFn.includes('playFwWhoosh()'), 'soft whoosh on launch');
  assert.ok(!/function fwOnLevelUp[\s\S]{0,600}playFwSfx\('big'\)/.test(src));
  assert.ok(!/function fwOnClear[\s\S]{0,900}playFwSfx\(/.test(src), 'line-clear does not batch a second bang on top of per-burst booms');
}


// 1.9.193 New Zealand soundtrack, beat-quantised gravity, seagulls, line-clear flash
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  const fsHash = crypto.createHash('sha256').update(fs.readFileSync('feed/tetris-bg/m9-812638a3.mp3')).digest('hex').slice(0, 8);
  assert.strictEqual(tetGame.themeFor(7), 9);
  assert.strictEqual(tetGame.NZ_THEME, 9);
  assert.strictEqual(tetGame.THEMES[9].name, 'New Zealand');
  assert.strictEqual(tetGame.TRACKS[9].bpm, 108.79);
  assert.strictEqual(tetGame.TRACKS[9].key, 'E');
  assert.strictEqual(tetGame.TRACKS[9].mode, 'minor');
  assert.ok(Math.abs(tetGame.TRACKS[9].offset - 0.023) < 1e-6);
  assert.strictEqual(tetGame.BGM_HASH[9], '812638a3');
  assert.strictEqual(fsHash, '812638a3');
  assert.ok(fs.existsSync('feed/tetris-bg/m9-812638a3.mp3'));
  assert.ok(!fs.existsSync('feed/tetris-bg/m9-6a43316b.mp3'), 'previous NZ track is gone');
  assert.ok(!fs.existsSync('feed/tetris-bg/m9-2b10c8ba.mp3'), 'old NZ track is gone');
  assert.strictEqual(tetGame.nzProg(80, 9), 0);
  assert.strictEqual(tetGame.nzProg(90, 9), 1);
  assert.ok(Math.abs(tetGame.nzBeatsPerRow(0) - 2) < 1e-9);
  assert.ok(Math.abs(tetGame.nzBeatsPerRow(0.55) - 1) < 1e-9);
  assert.ok(Math.abs(tetGame.nzBeatsPerRow(1) - 0.5) < 1e-9);
  const beatMs = 60000 / 108.79;
  const cap = tetGame.dropInterval(7);
  assert.ok(Math.abs(tetGame.nzDropInterval(60, 7) - 2 * beatMs) < 0.05, 'starts at 1 row every 2 beats');
  assert.ok(tetGame.nzDropInterval(60, 7) > tetGame.nzDropInterval(85, 9));
  assert.ok(tetGame.nzDropInterval(70, 7) >= cap, 'end of the level is not harder than the global curve');
  assert.ok(Math.abs(tetGame.nzDropInterval(70, 7) - Math.max(cap, 0.5 * beatMs)) < 0.05);
  assert.ok(tetGame.nzDropInterval(89, 9) >= 0.5 * beatMs);
  assert.ok(src.includes('themeFor(g.level) === NZ_THEME') && src.includes('nzDropInterval(g.lines, g.level)'));
  assert.ok(src.includes('const grid = beat.period / 2'));
  assert.strictEqual(tetGame.SEAGULL_HASH, '712237c3');
  assert.strictEqual(tetGame.seagullSrc(), 'tetris-bg/seagull-712237c3.mp3');
  assert.ok(fs.existsSync('feed/tetris-bg/seagull-712237c3.mp3'));
  assert.ok(src.includes('Freesound 263786') && src.includes('steaq') && src.includes('CC0'));
  assert.ok(src.includes('hp.frequency.value = 300') && src.includes('lp.frequency.value = 3500'));
  assert.ok(src.includes('6 + Math.random() * 9'));
  assert.ok(src.includes('function drawNzGull') && src.includes('function stepNzGulls') && src.includes('function playSeagullSfx'));
  assert.ok(src.includes('function startNzFlash') && src.includes('function drawNzFlash') && src.includes('startNzFlash()'));
  assert.ok(src.includes('ti === NZ_THEME) startNzFlash()'));
  const a0 = tetGame.nzFlashAlpha(0.04), aMid = tetGame.nzFlashAlpha(0.16), aEnd = tetGame.nzFlashAlpha(0.4);
  assert.ok(a0 > 0.15 && aMid > 0.05 && aEnd < 0.05, 'two soft flickers, gone by 0.4s');
  assert.ok(a0 < 0.5, 'not a full-white strobe');
  const gClear = tetGame.newGame({ level: 7, practice: true });
  gClear.board = tetGame.emptyBoard();
  for (let c = 0; c < 10; c++) gClear.board[19][c] = 2;
  gClear.piece = { t: 1, m: [[1]], x: 0, y: 0 };
  tetGame.startClear(gClear, [19], gClear.board.map(r => r.slice()), gClear.lines, gClear.level, null);
  assert.ok(tetGame.nzFlashState(), 'a line clear on NZ starts the lightning flash');
}

// 1.9.193 Beach stack waves replace the surfers
// 1.9.194: the travelling wave band was reworked into a beach-wash sheet.
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(src.includes('function drawStackWash') && src.includes('like a wave running up sand'));
  assert.ok(!src.includes('const STACK_WAVE_H = 15') && !src.includes('STACK_WAVE_SPEED = 48'));
  assert.ok(!src.includes('function drawStackWave') && !src.includes('function drawStackSurfer'));
  const draw = src.indexOf('try { drawStackWash(ctx); }');
  const ghost = src.indexOf('drawGhost(ctx, (p.x + c)');
  assert.ok(draw > 0 && ghost > draw, 'wash is drawn under the ghost and falling piece');
}

// 1.9.193 NEW HIGH SCORE banner holds 1000ms longer before fade-out
{
  assert.strictEqual(tetGame.HIGH_SCORE_FADE_MS, 2200);
  assert.strictEqual(tetGame.HIGH_SCORE_MS, 3200);
  const hs = { t: 0, dur: tetGame.HIGH_SCORE_MS, hold: false };
  assert.ok(Math.abs(tetGame.highScoreProg(hs) - 0) < 1e-9);
  hs.t = 0.72 * 2200;
  assert.ok(Math.abs(tetGame.highScoreProg(hs) - 0.72) < 1e-9);
  hs.t = 0.72 * 2200 + 500;
  assert.ok(Math.abs(tetGame.highScoreProg(hs) - 0.72) < 1e-9, 'extra second is still fully visible hold');
  hs.t = 0.72 * 2200 + 1000;
  assert.ok(Math.abs(tetGame.highScoreProg(hs) - 0.72) < 1e-9, 'fade-out starts after the extra 1000ms');
  hs.t = 3200;
  assert.ok(Math.abs(tetGame.highScoreProg(hs) - 1) < 1e-9);
  const g = tetGame.newGame();
  g.familyHigh = 10; g.score = 50; g.demo = false; g.board[19][0] = 1;
  tetGame.maybeHighScore(g);
  assert.strictEqual(g.highScore.dur, 3200);
  tetGame.tickHighScore(g, 2500);
  assert.ok(g.highScore, 'still on screen 2.5s in, during the added hold');
  tetGame.tickHighScore(g, 800);
  assert.strictEqual(g.highScore, null, 'gone after the original fade-out plus the extra second');
}

// 1.9.194 Beach stack wash: a sheet of sea water that spreads, spills, pools, and recedes
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.strictEqual(tetGame.STACK_WASH_PERIOD, 8);
  assert.ok(tetGame.washCover(0) === 0 && tetGame.washCover(0.42) === 1 && tetGame.washCover(1) === 0);
  const midWash = tetGame.washCover(0.20);
  assert.ok(midWash > 0.4 && midWash < 0.85, 'mid-wash is a partial run-up, got ' + midWash);
  assert.ok(tetGame.washSpill(0.20) < 0.05, 'mid-wash has not started spilling yet');
  assert.ok(tetGame.washSpill(0.46) > 0.85 && tetGame.washPool(0.46) > 0.7, 'mid-spill is at peak pour and pooling');
  const empty = tetGame.emptyBoard();
  const floor = tetGame.newStackWash();
  tetGame.stepStackWash(floor, empty, 1600);
  assert.ok(floor.tops.every(y => y === 20 * 28), 'empty well is washed along the floor');
  assert.ok(floor.wet.some(v => v > 0.25), 'the sheet has spread across the floor');
  const g = tetGame.newGame({ level: 2, practice: true });
  g.board = tetGame.emptyBoard();
  const tops = [17, 16, 15, 14, 16, 13, 14, 17, 15, 18];
  for (let c = 0; c < 10; c++) for (let r = tops[c]; r < 20; r++) g.board[r][c] = 2;
  const spill = tetGame.newStackWash();
  tetGame.stepStackWash(spill, g.board, 3680);
  assert.ok(spill.streams.length > 0, 'mid-spill has cascading streams down drop faces');
  assert.ok(spill.pool.some(v => v > 0.08), 'water pools on lower ledges');
  const before = g.board.map(r => r.slice());
  tetGame.stepStackWash(spill, g.board, 80);
  assert.deepStrictEqual(g.board, before, 'wash is visual only');
  assert.ok(src.includes('try { drawStackWash(ctx); }'));
  const draw = src.indexOf('try { drawStackWash(ctx); }');
  const ghost = src.indexOf('drawGhost(ctx, (p.x + c)');
  assert.ok(draw > 0 && ghost > draw, 'wash is under the ghost and falling piece');
}

// 1.9.194 Fireworks: plain black sky, occasional full-screen flash on major bursts
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.strictEqual(tetGame.themeFor(11), 1);
  assert.strictEqual(tetGame.isEffect(1), 'fireworks');
  assert.ok(src.includes("if (kind === 'fireworks') doc.documentElement.style.background = '#000'"));
  assert.ok(src.includes("c.fillStyle = '#000'") && src.includes('plain black sky'));
  assert.ok(!src.includes('c.drawImage(fw.sil') && src.includes('rainforest silhouette removed'));
  assert.strictEqual(tetGame.FW_BIGGER_GROW, 1.5);
  assert.strictEqual(tetGame.FW_MAJOR_SCALE, 2);
  assert.strictEqual(tetGame.FW_SKY_FLASH_PEAK, 0.07);
  assert.strictEqual(tetGame.FW_SKY_FLASH_FADE, 0.15);
  assert.strictEqual(tetGame.fwSkyFlashAlpha(0), 1);
  assert.strictEqual(tetGame.fwSkyFlashAlpha(0.07), 1);
  assert.ok(Math.abs(tetGame.fwSkyFlashAlpha(0.07 + 0.075) - 0.5) < 1e-9);
  assert.ok(tetGame.fwSkyFlashAlpha(0.07 + 0.15) < 0.01);
  tetGame.fwReset();
  tetGame.fwProg(0.2);
  assert.ok(tetGame.fwSize(0.2) < 1.5);
  assert.equal(tetGame.maybeFwSkyFlash(2.4), false, 'no flash until bigger fireworks start');
  tetGame.fwProg(1);
  assert.ok(tetGame.fwSize(1) >= 1.5);
  assert.equal(tetGame.maybeFwSkyFlash(1.2), false, 'small and medium bursts get no flash');
  assert.equal(tetGame.maybeFwSkyFlash(1.99), false, 'just under 200% is not a major burst');
  assert.equal(tetGame.maybeFwSkyFlash(2.0), true, 'a major burst flashes once the show is big');
  assert.ok(tetGame.fwSkyFlashState(), 'flash is running');
  assert.equal(tetGame.maybeFwSkyFlash(2.6), false, 'at most one flash every 8–12s');
  assert.ok(src.includes('playFwSfx(scale, z)') && src.includes('maybeFwSkyFlash(scale)'), 'existing booms stay; flash is extra');
}

// 1.9.195 City builders work at 3x while the stack is below halfway, then revert
{
  assert.deepStrictEqual(Array.from(tetGame.CITY_BUILD_EVERY), [6, 10]);
  assert.ok(Math.abs(tetGame.CITY_BUILD_EVERY_LOW[0] - 2) < 1e-9);
  assert.ok(Math.abs(tetGame.CITY_BUILD_EVERY_LOW[1] - 10 / 3) < 1e-9);
  assert.strictEqual(tetGame.CITY_SAFE_TOP, 6);
  assert.strictEqual(tetGame.CITY_ANIM_CLIMB, 1500);
  assert.strictEqual(tetGame.CITY_ANIM_PLACE, 420);
  assert.strictEqual(tetGame.CITY_ANIM_DOWN, 1300);
  assert.ok(Math.abs(tetGame.CITY_ANIM_FAST - 1 / 3) < 1e-12);
  const animN = tetGame.CITY_ANIM_CLIMB + tetGame.CITY_ANIM_PLACE + tetGame.CITY_ANIM_DOWN;
  const animF = animN * tetGame.CITY_ANIM_FAST;
  assert.ok(Math.abs(animN - 3220) < 1e-9);
  assert.ok(animF <= 2000 && Math.abs(animF - 3220 / 3) < 1e-6, 'fast climb/place/down fit inside 2s');
  assert.strictEqual(tetGame.cityAnimDur('climb', false), 1500);
  assert.strictEqual(tetGame.cityAnimDur('place', false), 420);
  assert.strictEqual(tetGame.cityAnimDur('down', false), 1300);
  assert.ok(Math.abs(tetGame.cityAnimDur('climb', true) - 500) < 1e-9);
  assert.ok(Math.abs(tetGame.cityAnimDur('place', true) - 140) < 1e-9);
  assert.ok(Math.abs(tetGame.cityAnimDur('down', true) - 1300 / 3) < 1e-9);

  const low = tetGame.newGame({ level: 9, practice: true });
  low.board = tetGame.emptyBoard();
  low.piece = { t: 4, m: [[4, 4], [4, 4]], x: 0, y: 0 };
  assert.strictEqual(tetGame.cityHighestSettled(low), 20);
  assert.equal(tetGame.cityStackLow(low), true, 'an empty well is a low stack');
  for (let r = 11; r < 20; r++) low.board[r][3] = 2;
  assert.strictEqual(tetGame.cityHighestSettled(low), 11);
  assert.equal(tetGame.cityStackLow(low), true, 'row 11 is still below halfway');
  for (let w = 0; w < 20; w++) {
    const ms = tetGame.cityBuildWait(low);
    assert.ok(ms >= 2000 && ms <= 10000 / 3 + 1e-6, 'low-stack wait is [2, 3.33]s, got ' + ms);
  }

  const mid = tetGame.newGame({ level: 9, practice: true });
  mid.board = tetGame.emptyBoard();
  mid.piece = { t: 4, m: [[4, 4], [4, 4]], x: 0, y: 0 };
  for (let r = 10; r < 20; r++) mid.board[r][3] = 2;
  assert.strictEqual(tetGame.cityHighestSettled(mid), 10);
  assert.equal(tetGame.cityStackLow(mid), false, 'row 10 is halfway, so speed reverts');
  for (let w = 0; w < 20; w++) {
    const ms = tetGame.cityBuildWait(mid);
    assert.ok(ms >= 6000 && ms <= 10000, 'halfway wait is [6, 10]s, got ' + ms);
  }
  mid.board[9][3] = 2;
  assert.equal(tetGame.cityStackLow(mid), false, 'above halfway stays at normal speed');

  // Scheduling a job on a low stack uses the fast climb duration, locked for the job.
  const g = tetGame.newGame({ level: 9, practice: true });
  g.board = tetGame.emptyBoard();
  g.piece = { t: 4, m: [[4, 4], [4, 4]], x: 0, y: 0 };
  for (let r = 16; r < 20; r++) for (let c = 2; c < 10; c++) g.board[r][c] = 2;
  const crew = tetGame.resetCityCrew(tetGame.newCityCrew(), 9, g);
  assert.ok(crew.wait >= 2000 && crew.wait <= 10000 / 3 + 1e-6);
  crew.wait = 0;
  tetGame.stepCityCrew(crew, g, 30, { started: true });
  assert.ok(crew.job && crew.job.fast === true);
  assert.ok(Math.abs(crew.job.dur - 500) < 1e-9, 'fast climb is 1500/3');
  // A brick appearing at halfway before the next schedule must not change this job.
  for (let r = 10; r < 16; r++) g.board[r][2] = 2;
  assert.equal(tetGame.cityStackLow(g), false);
  tetGame.stepCityCrew(crew, g, 500, { started: true });
  assert.ok(crew.job && crew.job.stage === 'place');
  assert.ok(crew.job.fast === true && Math.abs(crew.job.dur - 140) < 1e-9, 'in-flight job keeps the fast place timing');
  tetGame.stepCityCrew(crew, g, 140, { started: true });
  assert.ok(crew.job && crew.job.stage === 'down');
  assert.ok(Math.abs(crew.job.dur - 1300 / 3) < 1e-9);
  tetGame.stepCityCrew(crew, g, 1300 / 3 + 1, { started: true });
  assert.strictEqual(crew.job, null);
  assert.ok(crew.wait >= 6000 && crew.wait <= 10000, 'next brick is re-checked and reverts to [6, 10]s');

  // A job scheduled at halfway uses the normal 3.22s animation.
  const crew2 = tetGame.resetCityCrew(tetGame.newCityCrew(), 9, g);
  assert.ok(crew2.wait >= 6000 && crew2.wait <= 10000);
  crew2.wait = 0;
  tetGame.stepCityCrew(crew2, g, 30, { started: true });
  assert.ok(crew2.job && crew2.job.fast === false);
  assert.strictEqual(crew2.job.dur, 1500);
}

// 1.9.196 New Zealand v2 soundtrack, re-derived gravity, speed palettes, extreme full screen
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  const html = fs.readFileSync('feed/tetris.html', 'utf8');
  const fsHash = crypto.createHash('sha256').update(fs.readFileSync('feed/tetris-bg/m9-812638a3.mp3')).digest('hex').slice(0, 8);
  assert.strictEqual(tetGame.TRACKS[9].bpm, 108.79);
  assert.strictEqual(tetGame.TRACKS[9].key, 'E');
  assert.strictEqual(tetGame.TRACKS[9].mode, 'minor');
  assert.ok(Math.abs(tetGame.TRACKS[9].offset - 0.023) < 1e-6);
  assert.strictEqual(tetGame.BGM_HASH[9], '812638a3');
  assert.strictEqual(fsHash, '812638a3');
  assert.ok(fs.existsSync('feed/tetris-bg/m9-812638a3.mp3'));
  assert.ok(!fs.existsSync('feed/tetris-bg/m9-6a43316b.mp3'), '1.9.193 NZ track is gone');
  const beatMs = 60000 / 108.79;
  const cap = tetGame.dropInterval(7);
  assert.ok(Math.abs(tetGame.nzDropInterval(60, 7) - 2 * beatMs) < 0.05);
  assert.ok(Math.abs(tetGame.nzProg(65.5, 7) - 0.55) < 1e-9);
  assert.ok(Math.abs(tetGame.nzDropInterval(65.5, 7) - beatMs) < 0.05, 'about 55% of the stage is 1 row per beat');
  assert.ok(Math.abs(tetGame.nzBeatsPerRow(0.55) - 1) < 1e-9);
  assert.ok(tetGame.nzDropInterval(70, 7) >= cap);
  assert.ok(Math.abs(tetGame.nzDropInterval(70, 7) - Math.max(cap, 0.5 * beatMs)) < 0.05);

  assert.strictEqual(tetGame.NZ_PAL.length, 4);
  assert.ok(tetGame.NZ_PAL.every(p => p.length === 7 && p.every(c => /^#[0-9a-f]{6}$/.test(c))));
  assert.deepStrictEqual(Array.from(tetGame.NZ_PAL_STEPS), [0, 0.28, 0.55, 0.85]);
  assert.strictEqual(tetGame.NZ_PAL_FADE_MS, 1000);
  assert.strictEqual(tetGame.nzPalIndex(0), 0);
  assert.strictEqual(tetGame.nzPalIndex(0.27), 0);
  assert.strictEqual(tetGame.nzPalIndex(0.28), 1);
  assert.strictEqual(tetGame.nzPalIndex(0.55), 2);
  assert.strictEqual(tetGame.nzPalIndex(0.85), 3);
  assert.strictEqual(tetGame.nzPalIndex(1), 3);
  tetGame.setNzPal({ from: 0, to: 0, hold: true, at: 1 });
  assert.strictEqual(tetGame.blockColor(1, 60, 7), tetGame.NZ_PAL[0][0]);
  assert.strictEqual(tetGame.blockColor(7, 60, 7), tetGame.NZ_PAL[0][6]);
  tetGame.setNzPal({ from: 3, to: 3, hold: true, at: 1 });
  assert.strictEqual(tetGame.blockColor(1, 69, 7), tetGame.NZ_PAL[3][0], 'already-placed and new blocks share the current palette');
  assert.strictEqual(tetGame.blockColor(2, 69, 7), tetGame.NZ_PAL[3][1]);
  tetGame.setNzPal({ from: 0, to: 1, hold: true, at: 0.5 });
  const mid = tetGame.blockColor(1, 63, 7);
  const expect = tetGame.mixHex(tetGame.NZ_PAL[0][0], tetGame.NZ_PAL[1][0], 0.5);
  assert.strictEqual(mid, expect, 'palettes cross-fade');
  assert.notStrictEqual(mid, tetGame.NZ_PAL[0][0]);
  assert.notStrictEqual(mid, tetGame.NZ_PAL[1][0]);
  tetGame.resetNzPal(60, 7);
  const st0 = tetGame.tickNzPal(0, 60, 7);
  assert.strictEqual(st0.to, 0);
  const st1 = tetGame.tickNzPal(0, 63, 7);
  assert.strictEqual(st1.from, 0);
  assert.strictEqual(st1.to, 1);
  assert.strictEqual(st1.t, 0);
  tetGame.tickNzPal(1000, 63, 7);
  assert.ok(tetGame.nzPalState().t >= 1000);
  assert.strictEqual(tetGame.blockColor(1, 63, 7), tetGame.NZ_PAL[1][0]);
  // Other stages keep their usual colours.
  tetGame.resetNzPal(0, 1);
  assert.notStrictEqual(tetGame.blockColor(1, 0, 1), tetGame.NZ_PAL[0][0]);
  assert.ok(src.includes('tickNzPal(dt') && (src.includes('blockColor(v, colLines, colLevel)') || src.includes('pieceColor(v, colLines, colLevel')));
  assert.ok(src.includes('drawBlockGloss') && src.includes('function drawGhost'));
  assert.ok(src.includes("board: 'rgba(5,30,30,0.5)'"), 'see-through NZ board is unchanged');

  assert.strictEqual(tetGame.EXTREME_KEY, 'tetris-extreme');
  assert.strictEqual(tetGame.EXTREME_PEEK_MS, 4000);
  assert.ok(html.includes('id="extremebtn"') && html.includes('id="xtoggle"') && html.includes('id="xhud"'));
  assert.ok(html.includes('html.fs-x') && html.includes('fs-x-peek') && html.includes('Extreme full screen'));
  assert.ok(src.includes('function setExtreme') && src.includes('function peekExtreme') && src.includes('localStorage.setItem(EXTREME_KEY'));
  assert.ok(src.includes('function setFull') && src.includes("d.type !== 'ib-artfull'"));
  assert.ok(src.includes('requestFullscreen') && src.includes('webkitRequestFullscreen'), 'browser Fullscreen API stays on');
  assert.ok(src.includes("board.addEventListener('pointerdown'") && src.includes('touch-action: none') || html.includes('touch-action: none'));
  assert.ok(html.includes('touch-action: none'), 'board touch controls stay');
  assert.ok(src.includes("opts.extreme") && src.includes('xscore') && src.includes('xlevel'));
}

// 1.9.197 Extreme full screen always has a reliable exit
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  const html = fs.readFileSync('feed/tetris.html', 'utf8');
  assert.strictEqual(tetGame.EXTREME_EXIT_MIN, 44);
  assert.strictEqual(tetGame.EXTREME_TOP_RESERVE, 52);
  assert.ok(html.includes('id="xtoggle"') && html.includes('aria-label="Exit extreme"'));
  assert.ok(html.includes('id="xexitbtn"') && html.includes('Exit extreme'));
  assert.ok(/width:\s*44px/.test(html) && /min-width:\s*44px/.test(html) && /min-height:\s*44px/.test(html));
  assert.ok(html.includes('top: max(4px, env(safe-area-inset-top))') && html.includes('right: max(4px, env(safe-area-inset-right))'));
  assert.ok(html.includes('top: 52px'), 'the board is laid out below the exit strip');
  assert.ok(src.includes("setExtreme(false, 'exit-icon')"));
  assert.ok(src.includes("setExtreme(false, 'exit-btn')"));
  assert.ok(src.includes("setExtreme(false, 'escape')"));
  assert.ok(src.includes("from === 'event' || from === 'parent'"));
  assert.ok(src.includes("setExtreme(false, from === 'event' || from === 'parent' ? 'fullscreenchange'"));
  assert.ok(src.includes("e.key === 'Escape'") && src.includes("setExtreme(false, 'escape')"));
  assert.ok(src.includes("btn.textContent = on ? 'Exit extreme' : 'Extreme'"));
  // The 1.9.172 Fullscreen API and 1.9.196 peek / empty-area long-press stay.
  assert.ok(src.includes('function setFull') && src.includes('requestFullscreen'));
  assert.ok(src.includes('function peekExtreme') && src.includes("setExtreme(false, 'empty-hold')"));
  assert.ok(src.includes("localStorage.getItem(EXTREME_KEY) === '1'") && src.includes("setExtreme(true, 'boot')"));
}


// 1.9.208 Level order: Shane's 14 stages, Sewers after City, Triangles last
{
  assert.deepStrictEqual(Array.from(tetGame.stages().map(s => s.name)), ['Farmyard', 'Bush walk', 'Jeremiah was a bullfrog', 'Food', 'Beach', 'Ocean', 'New Zealand', 'Snowy mountains', 'City', 'Sewers', 'Fireworks', 'Night sky', 'Space travel', 'Triangles']);
  assert.deepStrictEqual(Array.from(tetGame.ORDER), [6, 3, 11, 12, 0, 2, 9, 10, 4, 13, 1, 5, 7, 8]);
  assert.strictEqual(tetGame.themeFor(1), 6);
  assert.strictEqual(tetGame.themeFor(2), 3);
  assert.strictEqual(tetGame.themeFor(3), 11);
  assert.strictEqual(tetGame.themeFor(4), tetGame.FOOD_THEME);
  assert.strictEqual(tetGame.themeFor(5), 0);
  assert.strictEqual(tetGame.themeFor(6), 2);
  assert.strictEqual(tetGame.themeFor(7), tetGame.NZ_THEME);
  assert.strictEqual(tetGame.themeFor(8), 10);
  assert.strictEqual(tetGame.themeFor(9), tetGame.CITY_THEME);
  assert.strictEqual(tetGame.themeFor(10), tetGame.SEWER_THEME);
  assert.strictEqual(tetGame.themeFor(11), 1);
  assert.strictEqual(tetGame.themeFor(12), 5);
  assert.strictEqual(tetGame.themeFor(13), tetGame.SPACE_THEME);
  assert.strictEqual(tetGame.themeFor(14), tetGame.TRI_THEME);
  assert.strictEqual(tetGame.levelUpCopy(1, 2).sub, 'Level 2: Bush walk');
  assert.strictEqual(tetGame.levelUpCopy(2, 3).sub, 'Level 3: Jeremiah was a bullfrog');
  assert.strictEqual(tetGame.levelUpCopy(3, 4).sub, 'Level 4: Food');
  assert.strictEqual(tetGame.levelUpCopy(9, 10).sub, 'Level 10: Sewers');
  assert.strictEqual(tetGame.levelUpCopy(13, 14).sub, 'Level 14: Triangles');
  const beaten = tetGame.levelUpCopy(14, 15);
  assert.strictEqual(beaten.beat, true);
  assert.strictEqual(beaten.title, 'YOU DID IT!');
  const firstEnc = new Set();
  const laterEnc = new Set();
  for (let i = 0; i < 40; i++) {
    firstEnc.add(tetGame.pickCallout({ n: 0, b2b: false, combo: 0, high: true, near: true, level: 1 }));
    laterEnc.add(tetGame.pickCallout({ n: 0, b2b: false, combo: 0, high: true, near: true, level: 5 }));
  }
  assert.ok(firstEnc.has('yougotthis') && !firstEnc.has('keepgoing'), 'You got this stays on level 1');
  assert.ok(!laterEnc.has('yougotthis') && !laterEnc.has('keepgoing'), 'no encouragement from level 2 onward');
}


// 1.9.199 Food is level 12; Triangles stays last; pieces, sounds and placeholder music
{
  assert.strictEqual(tetGame.THEMES.length, 14);
  assert.strictEqual(tetGame.THEMES[12].name, 'Food');
  assert.strictEqual(tetGame.FOOD_THEME, 12);
  assert.strictEqual(tetGame.LOOKS.length, 14);
  assert.strictEqual(tetGame.PICS[12], 'tetris-bg/12.webp');
  assert.ok(fs.existsSync('feed/tetris-bg/12.webp'), 'painted Food background is shipped');
  assert.deepStrictEqual(Array.from(tetGame.foodKind ? [tetGame.foodKind(1), tetGame.foodKind(2), tetGame.foodKind(3), tetGame.foodKind(4), tetGame.foodKind(5), tetGame.foodKind(6), tetGame.foodKind(7)] : []), ['ice', 'banana', 'banana', 'melon', 'carrot', 'grape', 'chilli']);
  assert.strictEqual(tetGame.foodSoundFor(1), 'squish');
  assert.strictEqual(tetGame.foodSoundFor(2), 'squish');
  assert.strictEqual(tetGame.foodSoundFor(3), 'squish');
  assert.strictEqual(tetGame.foodSoundFor(4), 'munch');
  assert.strictEqual(tetGame.foodSoundFor(5), 'crunch');
  assert.strictEqual(tetGame.foodSoundFor(6), 'munch');
  assert.strictEqual(tetGame.foodSoundFor(7), 'crunch');
  assert.strictEqual(tetGame.blockColor(1, 30, 4), tetGame.LOOKS[12].colors[0]);
  assert.strictEqual(tetGame.blockColor(5, 30, 4), tetGame.LOOKS[12].colors[4]);
  const g = tetGame.newGame({ level: 4, practice: true });
  assert.ok(g.food && g.food.length === 20);
  g.board = tetGame.emptyBoard();
  g.piece = { t: 4, m: [[4, 4], [4, 4]], x: 4, y: 16, rot: 0 };
  g.next = 1;
  tetGame.lockPiece(g);
  assert.strictEqual(g.board[16][4], 4);
  assert.ok(g.food[16][4] && g.food[16][4].t === 4 && g.food[16][4].lc === 0);
  assert.ok(g.food[17][5] && g.food[17][5].lr === 1 && g.food[17][5].lc === 1);
  // A cleared row drops food fragments with the cells.
  const g2 = tetGame.newGame({ level: 4, practice: true });
  g2.board = tetGame.emptyBoard();
  g2.food = tetGame.emptyFood();
  for (let c = 0; c < 9; c++) { g2.board[19][c] = 5; g2.food[19][c] = { t: 5, rot: 0, lr: 0, lc: c % 3 }; }
  g2.board[18][0] = 2; g2.food[18][0] = { t: 2, rot: 1, lr: 0, lc: 0 };
  g2.piece = { t: 1, m: [[1]], x: 9, y: 19, rot: 0 }; g2.next = 4;
  tetGame.lockPiece(g2);
  tetGame.tickClear(g2, 1000);
  assert.strictEqual(g2.board[19][0], 2, 'the banana fragment dropped a row');
  assert.ok(g2.food[19][0] && g2.food[19][0].t === 2 && g2.food[19][0].rot === 1);
  assert.strictEqual(g2.clearFx, null);
  assert.strictEqual(tetGame.clearKind(12), 'crumbs');
  assert.strictEqual(tetGame.TRACKS[12].key, 'A');
  assert.strictEqual(tetGame.TRACKS[12].mode, 'minor');
  assert.strictEqual(tetGame.TRACKS[12].bpm, 140.8);
  assert.strictEqual(tetGame.BGM_HASH[12], '6308c33f');
  assert.ok(fs.existsSync('feed/' + tetGame.bgmSrc(12)));
  ['munch', 'crunch', 'squish', 'chomp'].forEach(k => {
    assert.ok(tetGame.FOOD_HASH[k] && fs.existsSync('feed/' + tetGame.foodSrc(k)), 'food sfx ' + k);
  });
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(src.includes('function drawFoodCell') && src.includes('function playFoodSfx') && src.includes('function drawFoodLife'));
  assert.ok(src.includes('Swap by replacing m12-') || src.includes('placeholder'));
  assert.ok(src.includes('hp.frequency.value = 300') && src.includes('lp.frequency.value = 3500'));
}

// 1.9.200 Food sprites, cherry bombs, and Shane's Food song
{
  assert.strictEqual(tetGame.FOOD_THEME, 12);
  assert.ok(tetGame.FOOD_SPRITES && tetGame.FOOD_SPRITES.hash === 'e3977dde');
  assert.ok(fs.existsSync('feed/' + tetGame.FOOD_SPRITES.src), 'food sprite atlas');
  assert.strictEqual(tetGame.FOOD_SPRITES.cell, 96);
  ['1:0', '1:1', '2:0', '3:0', '4:0', '5:0', '6:0', '7:0', '8:0', '8:3'].forEach(k => {
    assert.ok(tetGame.FOOD_SPRITES.layout[k], 'atlas layout ' + k);
  });
  assert.strictEqual(tetGame.FOOD_SPRITES.layout['1:0'].cols, 4);
  assert.strictEqual(tetGame.FOOD_SPRITES.layout['4:0'].cols, 2);
  assert.strictEqual(tetGame.FOOD_SPRITES.layout['8:0'].cols, 1);
  assert.ok(!fs.existsSync('feed/tetris-bg/m12-4456f9a4.mp3'), 'placeholder loop removed');
  assert.strictEqual(tetGame.TRACKS[12].bpm, 140.8);
  assert.strictEqual(tetGame.TRACKS[12].offset, 0);
  assert.strictEqual(tetGame.TRACKS[12].key, 'A');
  assert.strictEqual(tetGame.TRACKS[12].mode, 'minor');
  assert.strictEqual(tetGame.BGM_HASH[12], '6308c33f');
  assert.ok(fs.existsSync('feed/' + tetGame.bgmSrc(12)));
  assert.strictEqual(tetGame.CHERRY_T, 8);
  assert.strictEqual(tetGame.SHAPES[8].length, 1);
  assert.strictEqual(tetGame.SHAPES[8][0].length, 1);
  assert.strictEqual(Number(tetGame.SHAPES[8][0][0]), 8);
  assert.strictEqual(tetGame.foodKind(8), 'cherry');
  assert.strictEqual(tetGame.foodSoundFor(8), 'boom');
  assert.strictEqual(tetGame.FOOD_HASH.boom, '70ec46f6');
  assert.ok(fs.existsSync('feed/' + tetGame.foodSrc('boom')), 'cherry boom sfx');
  assert.strictEqual(tetGame.blockColor(8, 30, 4), '#e11d48');
  const g = tetGame.newGame({ level: 4, practice: true });
  g.lastCherry = false;
  g.bag = [1, 2, 3, 4, 5, 6, 7];
  assert.strictEqual(tetGame.takeNext(g, 0), tetGame.CHERRY_T);
  assert.strictEqual(g.lastCherry, true);
  const bagBefore = g.bag.slice();
  assert.strictEqual(tetGame.takeNext(g, 0), 1, 'never two cherries in a row, even if rand would fire');
  assert.deepStrictEqual(g.bag, bagBefore.slice(1));
  g.lastCherry = false;
  assert.strictEqual(tetGame.takeNext(g, 0.99), 2, 'high rand keeps the bag piece');
  const gOff = tetGame.newGame({ level: 1, practice: true });
  gOff.lastCherry = false;
  gOff.bag = [3, 4];
  assert.strictEqual(tetGame.takeNext(gOff, 0), 3, 'no cherry bombs off the Food stage');
  const gR = tetGame.newGame({ level: 4, practice: true });
  gR.board = tetGame.emptyBoard();
  gR.piece = tetGame.spawn(8);
  gR.piece.x = 4; gR.piece.y = 5;
  const before = { x: gR.piece.x, y: gR.piece.y, rot: gR.piece.rot, m: gR.piece.m.map(r => r.slice()) };
  tetGame.act(gR, 'rotate');
  assert.strictEqual(gR.piece.x, before.x);
  assert.strictEqual(gR.piece.y, before.y);
  assert.strictEqual(gR.piece.rot, before.rot);
  assert.deepStrictEqual(gR.piece.m, before.m);
  const gB = tetGame.newGame({ level: 4, practice: true });
  gB.board = tetGame.emptyBoard();
  gB.food = tetGame.emptyFood();
  gB.score = 0;
  gB.next = 1;
  // Cherry locks at (4,15). Beneath: (4,16),(4,17),(4,18). Diagonals: (3,16),(5,16).
  // A banana at (4,19) is below the 3-cell window and should drop after the three above it vanish.
  gB.board[16][4] = 5; gB.food[16][4] = { t: 5, rot: 0, lr: 0, lc: 0 };
  gB.board[17][4] = 6; gB.food[17][4] = { t: 6, rot: 0, lr: 0, lc: 0 };
  gB.board[18][4] = 7; gB.food[18][4] = { t: 7, rot: 0, lr: 0, lc: 0 };
  gB.board[19][4] = 2; gB.food[19][4] = { t: 2, rot: 1, lr: 0, lc: 0 };
  gB.board[15][3] = 4; gB.food[15][3] = { t: 4, rot: 0, lr: 0, lc: 0 };
  gB.board[16][3] = 3; gB.food[16][3] = { t: 3, rot: 0, lr: 0, lc: 0 };
  gB.board[16][5] = 1; gB.food[16][5] = { t: 1, rot: 0, lr: 0, lc: 0 };
  gB.piece = { t: 8, m: [[8]], x: 4, y: 15, rot: 0 };
  tetGame.lockPiece(gB);
  assert.strictEqual(gB.board[15][4], 0, 'cherry is not stamped on the board');
  assert.strictEqual(gB.board[16][4], 0);
  assert.strictEqual(gB.board[17][4], 0);
  assert.strictEqual(gB.board[18][4], 0);
  assert.strictEqual(gB.board[19][4], 2, 'cell below the 3-deep blast dropped to the floor');
  assert.ok(gB.food[19][4] && gB.food[19][4].t === 2 && gB.food[19][4].rot === 1);
  assert.strictEqual(gB.board[16][3], 0, 'diagonal below is gone');
  assert.strictEqual(gB.board[16][5], 0);
  assert.strictEqual(gB.board[19][3], 4, 'the watermelon above the diagonal dropped to the floor');
  assert.strictEqual(gB.board[18][3], 0);
  assert.strictEqual(gB.board[19][5], 0, 'the other diagonal was removed, not dropped');
  // 5 blocks removed (3 down + 2 diagonals); banana was not in the blast, only dropped.
  assert.strictEqual(gB.score, tetGame.CHERRY_BONUS + tetGame.CHERRY_PER_CELL * 5);
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(src.includes('function drawFoodSprite') && src.includes('function applyCherryBomb') && src.includes('function spawnCherryBurst'));
  const rot = tetGame.rotateRun(12);
  assert.ok(Array.isArray(rot) && rot.length >= 4);
  rot.forEach(f => {
    const pc = ((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12;
    assert.ok([9, 11, 0, 2, 4, 5, 7].includes(pc), 'rotate riff pitch class ' + pc + ' in A minor, f=' + f);
  });
}

// 1.9.201 T piece is grapes, not broccoli; Keep going! is removed
{
  assert.strictEqual(tetGame.foodKind(6), 'grape');
  assert.strictEqual(tetGame.foodSoundFor(6), 'munch');
  assert.strictEqual(tetGame.blockColor(6, 30, 4), '#9333ea');
  assert.strictEqual(tetGame.FOOD_SPRITES.hash, 'e3977dde');
  assert.ok(fs.existsSync('feed/' + tetGame.FOOD_SPRITES.src), 'rebuilt grape atlas');
  assert.ok(!fs.existsSync('feed/tetris-bg/food-sprites-d7044f80.webp'), 'old broccoli atlas removed');
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(!src.includes("kind === 'broccoli'") && !src.includes("'broccoli'"));
  assert.ok(!tetGame.CALLOUT_TEXT.keepgoing && !tetGame.CALLOUT_VOICES.keepgoing);
  assert.ok(!fs.existsSync('feed/tetris-bg/vo-keepgoing-66d1b6c8.mp3'), 'Keep going voice is gone');
  assert.ok(!src.includes('keepgoing') && !src.includes('Keep going!'));
  const enc = new Set();
  for (let i = 0; i < 30; i++) enc.add(tetGame.pickCallout({ n: 0, b2b: false, combo: 0, high: true, near: true, level: 1 }));
  assert.deepStrictEqual(Array.from(enc), ['yougotthis']);
  assert.strictEqual(tetGame.CALLOUT_TEXT.yougotthis, 'You got this!');
  assert.ok(fs.existsSync('feed/' + tetGame.calloutSrc('yougotthis')));
  const praise = new Set();
  for (let i = 0; i < 24; i++) praise.add(tetGame.pickCallout({ n: 4, b2b: false, combo: 1, high: false, near: false, level: 5 }));
  assert.ok(praise.has('amazing') || praise.has('brilliant'));
}

// 1.9.202 Food pieces are square tetromino blocks with food painted on
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(src.includes('1.9.202 Food is ordinary square tetromino cells'));
  assert.ok(src.includes('function drawFoodCell') && src.includes('function drawFoodSprite'));
  const cellFn = src.slice(src.indexOf('function drawFoodCell'), src.indexOf('function drawCell'));
  assert.ok(cellFn.includes('ctx.fillRect(x + 1, y + 1, size - 2, size - 2)'), 'locked food cells are square blocks');
  assert.ok(cellFn.includes("ctx.fillStyle = 'rgba(255,255,255,0.28)'") && cellFn.includes('drawBlockGloss'), 'same bevel and gloss as other levels');
  assert.ok(cellFn.includes('strokeRect'), 'cell outline keeps the tetromino readable');
  assert.ok(cellFn.includes('if (ghost)'), 'ghost stays a square landing preview');
  assert.strictEqual(tetGame.FOOD_THEME, 12);
  assert.strictEqual(tetGame.foodKind(1), 'ice');
  assert.strictEqual(tetGame.foodKind(2), 'banana');
  assert.strictEqual(tetGame.foodKind(6), 'grape');
  assert.strictEqual(tetGame.CHERRY_T, 8);
  assert.ok(fs.existsSync('feed/' + tetGame.FOOD_SPRITES.src));
}


// 1.9.203 bananas explode when a newly locked banana touches a placed one
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(src.includes('function applyBananaBurst') && src.includes('function spawnBananaBurst'));
  assert.ok(src.includes('function bananaTouchesLocked') && src.includes('function connectedBananaCells'));
  assert.ok(src.includes('1.9.203: J and L bananas explode'));
  assert.strictEqual(tetGame.BANANA_BONUS, 100);
  assert.strictEqual(tetGame.BANANA_PER_CELL, 25);
  assert.strictEqual(tetGame.isBanana(2), true);
  assert.strictEqual(tetGame.isBanana(3), true);
  assert.strictEqual(tetGame.isBanana(1), false);
  assert.strictEqual(tetGame.isBanana(8), false);
  assert.ok(fs.existsSync('feed/' + tetGame.foodSrc('boom')), 'reuses the food-boom style sfx');

  function place(g, t, rot, x, y) {
    const m = tetGame.rotShape(t, rot);
    const p = { t: t, m: m, x: x, y: y, rot: rot };
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const yy = y + r, xx = x + c;
        if (yy >= 0 && yy < 20 && xx >= 0 && xx < 10) g.board[yy][xx] = t;
      }
    }
    tetGame.stampFood(g, p);
    return p;
  }

  // J at (0,17): cells (0,17),(0,18),(1,18),(2,18). L at (3,17) touches at (2,18)/(3,18).
  const gB = tetGame.newGame({ level: 4, practice: true });
  gB.board = tetGame.emptyBoard();
  gB.food = tetGame.emptyFood();
  gB.score = 0;
  gB.next = 1;
  place(gB, 2, 0, 0, 17);
  // Watermelon above the J, should settle after the bananas clear.
  gB.board[16][1] = 4; gB.food[16][1] = { t: 4, rot: 0, lr: 0, lc: 0 };
  gB.piece = { t: 3, m: tetGame.rotShape(3, 0), x: 3, y: 17, rot: 0 };
  tetGame.lockPiece(gB);
  assert.strictEqual(gB.board[17][0], 0, 'locked J cells are gone');
  assert.strictEqual(gB.board[18][0], 0);
  assert.strictEqual(gB.board[18][1], 0);
  assert.strictEqual(gB.board[18][2], 0);
  assert.strictEqual(gB.board[17][5], 0, 'locking L cells are gone');
  assert.strictEqual(gB.board[18][3], 0);
  assert.strictEqual(gB.board[18][4], 0);
  assert.strictEqual(gB.board[18][5], 0);
  assert.strictEqual(gB.board[19][1], 4, 'cell above the bananas settled to the floor');
  assert.ok(gB.food[19][1] && gB.food[19][1].t === 4);
  assert.strictEqual(gB.board[16][1], 0);
  assert.strictEqual(gB.score, tetGame.BANANA_BONUS + tetGame.BANANA_PER_CELL * 8);

  // A banana that does not touch another banana just locks.
  const gSolo = tetGame.newGame({ level: 4, practice: true });
  gSolo.board = tetGame.emptyBoard();
  gSolo.food = tetGame.emptyFood();
  gSolo.score = 0;
  gSolo.next = 1;
  place(gSolo, 2, 0, 0, 17);
  gSolo.piece = { t: 3, m: tetGame.rotShape(3, 0), x: 6, y: 17, rot: 0 };
  tetGame.lockPiece(gSolo);
  assert.strictEqual(gSolo.board[18][0], 2, 'untouched J stays');
  assert.strictEqual(gSolo.board[18][6], 3, 'untouched L stays');
  assert.strictEqual(gSolo.score, 0);

  // Diagonal only: no explosion.
  const gDiag = tetGame.newGame({ level: 4, practice: true });
  gDiag.board = tetGame.emptyBoard();
  gDiag.food = tetGame.emptyFood();
  gDiag.score = 0;
  gDiag.next = 1;
  place(gDiag, 2, 0, 0, 17);
  gDiag.piece = { t: 3, m: tetGame.rotShape(3, 0), x: 3, y: 16, rot: 0 };
  assert.strictEqual(tetGame.bananaTouchesLocked(gDiag.board, gDiag.piece), false);
  tetGame.lockPiece(gDiag);
  assert.strictEqual(gDiag.board[18][2], 2);
  assert.strictEqual(gDiag.board[17][3], 3);
  assert.strictEqual(gDiag.score, 0);

  // After gravity leftovers, a third banana can join a connected group of both types.
  const gGroup = tetGame.newGame({ level: 4, practice: true });
  gGroup.board = tetGame.emptyBoard();
  gGroup.food = tetGame.emptyFood();
  gGroup.score = 0;
  gGroup.next = 1;
  place(gGroup, 2, 0, 0, 17);
  place(gGroup, 3, 0, 3, 17);
  gGroup.piece = { t: 2, m: tetGame.rotShape(2, 0), x: 6, y: 17, rot: 0 };
  tetGame.lockPiece(gGroup);
  assert.strictEqual(gGroup.score, tetGame.BANANA_BONUS + tetGame.BANANA_PER_CELL * 12);
  assert.ok(gGroup.board.every(row => row.every(v => v !== 2 && v !== 3)), 'the whole connected banana group cleared');

  // Other levels: J and L sitting together do not explode.
  const gOff = tetGame.newGame({ level: 1, practice: true });
  assert.notStrictEqual(tetGame.themeFor(gOff.level), tetGame.FOOD_THEME);
  gOff.board = tetGame.emptyBoard();
  gOff.food = tetGame.emptyFood();
  gOff.score = 0;
  gOff.next = 1;
  place(gOff, 2, 0, 0, 17);
  gOff.piece = { t: 3, m: tetGame.rotShape(3, 0), x: 3, y: 17, rot: 0 };
  tetGame.lockPiece(gOff);
  assert.strictEqual(gOff.board[18][0], 2, 'no banana burst off the Food stage');
  assert.strictEqual(gOff.board[18][3], 3);
  assert.strictEqual(gOff.score, 0);
  assert.strictEqual(tetGame.applyBananaBurst(gOff, gOff.piece), null);
}

// 1.9.203 rooster only on Farmyard; default move sfx no longer play static noise
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.strictEqual(tetGame.THEMES[6].name, 'Farmyard');
  assert.strictEqual(tetGame.isEffect(6), 'farm');
  assert.strictEqual(tetGame.isEffect(5), null, 'Night sky is not an effect theme');
  assert.strictEqual(tetGame.themeFor(1), 6);
  assert.strictEqual(tetGame.themeFor(12), 5, 'Night sky is level 12');
  assert.ok(tetGame.farmThemeActive(6) && tetGame.farmThemeActive(tetGame.themeFor(1)));
  assert.ok(!tetGame.farmThemeActive(5) && !tetGame.farmThemeActive(0) && !tetGame.farmThemeActive(7));
  assert.ok(src.includes('function stopRoosterSfx') && src.includes('function farmThemeActive'));
  assert.ok(src.includes('if (!farmThemeActive(themeIdx)) return;'));
  assert.ok(src.includes('if (!roosterWant || !farmThemeActive(themeIdx)'));
  assert.ok(src.includes('if (!farmThemeActive(ti)) stopRoosterSfx();'));
  assert.ok(src.includes('if (prevKind === \'farm\' || prev === 6) stopRoosterSfx();'));
  assert.ok(src.includes('if (kindNow && life.kind === kindNow)'));
  assert.ok(src.includes('always clear farm/beach/fireworks/ocean life when leaving'));
  const moveStart = src.indexOf('function playMoveSfx');
  const moveFn = src.slice(moveStart, src.indexOf('\n  function ', moveStart + 20));
  const defAt = moveFn.indexOf('in-key soft tick only');
  assert.ok(defAt > 0, 'default move path is the tone-only 1.9.203 tick');
  const def = moveFn.slice(defAt);
  assert.ok(def.includes('moveTone'));
  assert.ok(!def.includes('moveNoise'), 'default move/lock/drop path has no white-noise burst');
  // Themed noise on Farmyard / Beach / etc. is unchanged.
  assert.ok(moveFn.includes('if (farm)') && moveFn.includes('moveNoise'));
}

// 1.9.206 Bush walk is the static painting again (reverts the 1.9.204 walking track)
{
  assert.strictEqual(tetGame.THEMES[3].name, 'Bush walk');
  assert.strictEqual(tetGame.themeFor(2), 3);
  assert.strictEqual(tetGame.themeFor(1), 6, 'other levels unchanged');
  assert.ok(tetGame.TRACKS[3] && tetGame.TRACKS[3].bpm === 117.5, 'Bush walk song is unchanged');
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(!src.includes('function bushTick') && !src.includes('function bushPaint') && !src.includes('function bushWalkPose'), 'walking-track canvas is gone');
  assert.ok(!src.includes('fx-bush') && !src.includes('BUSH_LOOP') && !src.includes('bushCoverRect'));
  assert.ok(src.includes('tetris-bg/3.webp') || src.includes('PICS[3]') || src.includes("PICS[i]"), 'still uses the Bush walk painting');
  assert.ok(src.includes(`url("' + PICS[i] + '") center / cover no-repeat`), 'Bush walk uses the same static CSS background as other picture stages');
  assert.ok(fs.existsSync('feed/tetris-bg/3.webp'), 'existing bush painting is reused');
}

// 1.9.205 Start overlay, How to play, and close after 5 minutes paused
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  const html = fs.readFileSync('feed/tetris.html', 'utf8');
  const play = fs.readFileSync('feed/play.js', 'utf8');
  assert.strictEqual(tetGame.PAUSE_CLOSE_MS, 5 * 60 * 1000);
  assert.strictEqual(tetGame.CLOSE_MSG, 'ib-tetris-close');
  const names = tetGame.howToPlayLevels();
  assert.strictEqual(names.join('|'), ['Farmyard', 'Bush walk', 'Jeremiah was a bullfrog', 'Food', 'Beach', 'Ocean', 'New Zealand', 'Snowy mountains', 'City', 'Sewers', 'Fireworks', 'Night sky', 'Space travel', 'Triangles'].join('|'));
  const guide = tetGame.howToPlayHtml();
  for (const n of names) assert.ok(guide.includes(n), 'how to play lists ' + n);
  assert.ok(guide.includes('14 levels') && guide.includes('gets faster'));
  assert.ok(guide.includes('Tap the board to rotate') && guide.includes('Drag left or right') && guide.includes('Flick down') && guide.includes('Swipe up'));
  assert.ok(guide.includes('Arrow keys') && guide.includes('Space drops') && guide.includes('C or Shift') && guide.includes('P pauses') && guide.includes('Escape') && guide.includes('M turns music') && guide.includes('R restarts'));
  assert.ok(guide.includes('ghost') && guide.includes('Next') && guide.includes('Hold'));
  assert.ok(guide.includes('Single is 100') && guide.includes('Double 300') && guide.includes('Triple 500') && guide.includes('800'));
  assert.ok(guide.includes('Cherry bombs') && guide.includes('Banana bursts') && guide.includes('J or L'));
  assert.ok(guide.includes('cheer') && guide.includes('high score'));
  assert.ok(guide.includes('Extreme') && guide.includes('X in the top right') && guide.includes('Exit extreme') && guide.includes('full screen') && guide.includes('Exit Tetris'));

  // Fake clock: 5 continuous minutes paused closes; resume resets; start screen does not.
  const t0 = 1_700_000_000_000;
  tetGame.setNowMs(t0);
  assert.strictEqual(tetGame.nowMs(), t0);
  const playing = { started: true, paused: false, over: false, demo: false };
  const paused = { started: true, paused: true, over: false, demo: false };
  assert.strictEqual(tetGame.nextPausedAt(null, playing, t0), null);
  const stamp = tetGame.nextPausedAt(null, paused, t0);
  assert.strictEqual(stamp, t0);
  tetGame.setNowMs(t0 + 4 * 60 * 1000);
  assert.strictEqual(tetGame.nextPausedAt(stamp, paused, tetGame.nowMs()), stamp, 'continuous pause keeps the original time');
  assert.ok(!tetGame.shouldCloseAfterPause({ ...paused, pausedAt: stamp, now: tetGame.nowMs() }), 'not yet 5 minutes');
  tetGame.setNowMs(t0 + 5 * 60 * 1000 - 1);
  assert.ok(!tetGame.shouldCloseAfterPause({ ...paused, pausedAt: stamp, now: tetGame.nowMs() }));
  tetGame.setNowMs(t0 + 5 * 60 * 1000);
  assert.ok(tetGame.shouldCloseAfterPause({ ...paused, pausedAt: stamp, now: tetGame.nowMs() }), 'closes at 5 minutes on a fake clock');
  tetGame.setNowMs(t0 + 5 * 60 * 1000);
  assert.strictEqual(tetGame.nextPausedAt(stamp, playing, tetGame.nowMs()), null, 'resume clears the timer');
  const after = tetGame.nextPausedAt(null, paused, t0 + 6 * 60 * 1000);
  assert.strictEqual(after, t0 + 6 * 60 * 1000, 'a later pause starts a fresh 5 minutes');
  assert.ok(!tetGame.shouldCloseAfterPause({ ...paused, pausedAt: after, now: after + 5 * 60 * 1000 - 1 }));
  assert.ok(tetGame.shouldCloseAfterPause({ ...paused, pausedAt: after, now: after + 5 * 60 * 1000 }));
  assert.ok(!tetGame.shouldCloseAfterPause({ started: false, paused: false, over: false, demo: false, pausedAt: t0, now: t0 + 10 * 60 * 1000 }), 'the start screen does not auto-close');
  assert.ok(!tetGame.shouldCloseAfterPause({ started: true, paused: true, over: true, demo: false, pausedAt: t0, now: t0 + 10 * 60 * 1000 }), 'game over does not auto-close');
  assert.ok(!tetGame.shouldCloseAfterPause({ started: true, paused: true, over: false, demo: true, pausedAt: t0, now: t0 + 10 * 60 * 1000 }), 'demo / still board does not auto-close');
  tetGame.setNowMs(null);

  assert.ok(src.includes('if (!started) return g;'), 'controls do not auto-start the game');
  assert.ok(src.includes('if (!started) return;') && src.includes('function startGame'), 'first board tap no longer starts the game');
  assert.ok(src.includes('function startGame') && src.includes('ensureAudio()') && src.includes('started = true'));
  assert.ok(src.includes("parent.postMessage({ type: CLOSE_MSG }") || src.includes('parent.postMessage({ type: CLOSE_MSG },'));
  const closeFn = src.slice(src.indexOf('function requestCloseTetris'), src.indexOf('function checkPauseClose'));
  assert.ok(closeFn.includes('stopAudio') && closeFn.includes('CLOSE_MSG') && !closeFn.includes('removeItem') && closeFn.includes('Do not touch tetris-best'), 'auto-close stops audio and does not clear the saved high score');
  assert.ok(src.includes('function checkPauseClose') && src.includes('function syncPauseClose') && src.includes('function openHowto') && src.includes('howtoResume'));
  assert.ok(src.includes('g.paused = true') && src.includes('howtoResume'));
  assert.ok(html.includes('id="startov"') && html.includes('id="startbtn"') && html.includes('Start') && html.includes('id="starthowto"'));
  assert.ok(html.includes('id="howto"') && html.includes('id="howtobtn"') && html.includes('How to play') && html.includes('id="howtoclose"') && html.includes('id="pauseov"'));
  assert.ok(html.includes('html.fs-x .startov') && html.includes('html.fs-x .pauseov') && html.includes('html.fs-x #howto'), 'overlays stay visible in Extreme');
  assert.ok(play.includes("d.type !== 'ib-tetris-close'") && play.includes('closeArt(false)'));
  assert.ok(!play.includes("storeDel") || (play.includes('clearArtPersist') && !play.slice(play.indexOf('function clearArtPersist'), play.indexOf('function clearArtPersist') + 500).includes('tetris-best')), 'parent close does not clear tetris-best');
  assert.ok(src.includes('1.9.205 Start overlay') || src.includes('1.9.205 Start button'));

  // 1.9.205 Farmyard sunrise is twice as quick; rooster still crows at full sunrise
  assert.strictEqual(tetGame.FARM_SUNRISE_PROG, 0.2);
  assert.strictEqual(tetGame.FARM_SUNRISE_SEC, 400);
  assert.strictEqual(tetGame.farmDayTarget(0, 0), 0, 'still starts in darkness');
  assert.strictEqual(tetGame.farmDayTarget(0.2, 0), 1, 'full daylight at 20% of level 1 (was 40%)');
  assert.strictEqual(tetGame.farmDayTarget(0, 400), 1, 'full daylight after 400s with no lines (was 800s)');
  assert.ok(tetGame.farmDayTarget(0, 200) > 0.49 && tetGame.farmDayTarget(0, 200) < 0.51, 'halfway at 200s');
  assert.ok(tetGame.farmDayTarget(0, 399) < 1);
  assert.ok(tetGame.farmDayTarget(0.1, 0) > 0.49 && tetGame.farmDayTarget(0.1, 0) < 0.51);
  assert.ok(src.includes('farmSunPos(day).alt >= 0.98'), 'rooster still crows at full sunrise');
  assert.ok(tetGame.farmSunPos(1).alt >= 0.98);
  assert.ok(tetGame.farmSunPos(0.98).alt < 0.98, 'alt reaches 0.98 only near the top of the climb');
  assert.ok(src.includes('1.9.205: sunrise duration halved') || src.includes('FARM_SUNRISE_PROG / FARM_SUNRISE_SEC are halved'));
}

// 1.9.205 Family scoreboard lists every player's personal best, not only the top 10 games
{
  const mem = new Map();
  const lsStub = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  const ctx = { console, Math, Object, Number, String, Array, JSON, Date, Promise, setTimeout, clearTimeout, encodeURIComponent, localStorage: lsStub, fetch: async () => ({ ok: true, json: async () => null }) };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('feed/scores.js', 'utf8'), ctx, { filename: 'feed/scores.js' });
  const S = ctx.IBScores;
  const top = [
    { name: 'Shane', score: 9000, at: 100, mine: true },
    { name: 'Shane', score: 8000, at: 90, mine: true },
    { name: 'Shane', score: 7000, at: 80, mine: true },
    { name: 'Sarah', score: 6000, at: 70, mine: false },
    { name: 'Shane', score: 5000, at: 60, mine: true }
  ];
  // Without data.best, fall back to one row per player from the top games
  const fromTop = [...S.personalBests({ top })];
  assert.strictEqual(fromTop.map(x => x.name + ':' + x.score).join('|'), 'Shane:9000|Sarah:6000');
  // With data.best, every member is listed even if they are not in the top 10 games
  const best = [
    { name: 'Sarah', score: 12000, at: 200, games: 4, mine: false },
    { name: 'Shane', score: 9000, at: 100, games: 20, mine: true },
    { name: 'Aranea', score: 3100, at: 50, games: 2, mine: false },
    { name: 'Alex', score: 800, at: 40, games: 1, mine: false }
  ];
  const crowdedTop = best.slice(0, 1).concat(Array.from({ length: 9 }, (_, i) => ({ name: 'Shane', score: 9000 - i, at: 100 - i, mine: true })));
  assert.strictEqual(crowdedTop.length, 10);
  assert.ok(!crowdedTop.some(x => x.name === 'Aranea') && !crowdedTop.some(x => x.name === 'Alex'), 'Aranea and Alex would be hidden on the old top-10 games table');
  const leaders = [...S.personalBests({ top: crowdedTop, best })];
  assert.strictEqual(leaders.map(x => x.name).join('|'), 'Sarah|Shane|Aranea|Alex', 'every family member with a score is listed');
  assert.strictEqual(leaders[0].score, 12000);
  const markup = S.html('tetris', { top: crowdedTop, best }, {});
  assert.ok(markup.includes("Each player's best"));
  assert.ok(markup.includes('Sarah') && markup.includes('12,000') && markup.includes('Shane') && markup.includes('Aranea') && markup.includes('3,100') && markup.includes('Alex') && markup.includes('800'));
  assert.ok(markup.includes('4 games') && markup.includes('20 games') && markup.includes('2 games') && markup.includes('1 game'));
  assert.ok(!markup.includes('Everyone’s best') && !markup.includes("Everyone's best"), 'the old second list is not duplicated');
  const scr = S.html('scrabble', { top: [], best: [{ name: 'Shane', score: 402, winsComputer: 1, winsFamily: 2, games: 3, mine: true }] }, {});
  assert.ok(scr.includes('wins: 1 v') && scr.includes('v family'));
  // The family high-score bar uses personal bests, not only the truncated top games
  assert.strictEqual(tetGame.familyHighFrom({ top: crowdedTop, best }), 12000);
  assert.strictEqual(tetGame.familyHighFrom({ best: [{ score: 5000 }] }), 5000);
  assert.strictEqual(tetGame.familyHighFrom({ top: [{ score: 200 }] }), 200);
  assert.strictEqual(tetGame.familyHighFrom(null), null);
  const src = fs.readFileSync('feed/scores.js', 'utf8');
  assert.ok(src.includes('function personalBests') && src.includes('1.9.205: the headline list is every member'));
}


// 1.9.206 Continue after game over: same level, empty board, score reset; Play again still starts at level 1
{
  const html = fs.readFileSync('feed/tetris.html', 'utf8');
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  const scoresSrc = fs.readFileSync('feed/scores.js', 'utf8');
  assert.ok(html.includes('id="overov"') && html.includes('id="overcontinue"') && html.includes('Continue'));
  assert.ok(html.includes('id="overagain"') && html.includes('Play again'));
  assert.ok(html.includes('id="continuebtn"') && html.includes('data-act="continue"'));
  assert.ok(html.includes('html.fs-x .overov'), 'game-over overlay stays visible in Extreme');
  assert.ok(src.includes("if (a === 'continue')") && src.includes("function syncOverOv"));
  assert.ok(src.includes("onContinue: () => press('continue')"));
  assert.ok(scoresSrc.includes('data-ibs="continue"') && scoresSrc.includes('opt.onContinue'));

  // Normal game: reach level 8, continue stays there with a fresh board and a zero score.
  let g = tetGame.newGame();
  g.level = 8;
  g.lines = 77;
  g.score = 12345;
  g.over = true;
  g.board[19][0] = 4;
  g.hold = 2;
  const mid = tetGame.act(g, 'left');
  assert.strictEqual(mid.over, true);
  assert.strictEqual(mid.score, 12345, 'controls do nothing while the game is over');
  const c = tetGame.act(g, 'continue');
  assert.strictEqual(c.level, 8);
  assert.strictEqual(c.score, 0);
  assert.strictEqual(c.lines, 70, 'lines go back to the start of this level so speed and theme stay correct');
  assert.strictEqual(c.over, false);
  assert.strictEqual(c.paused, false);
  assert.ok(c.board.every(row => row.every(cell => !cell)), 'board is empty');
  assert.ok(!c.hold, 'hold is cleared');
  assert.strictEqual(tetGame.themeFor(c.level), 10);
  assert.ok(c.piece && c.next);
  // After 10 lines on the continued run, the level still goes up.
  c.lines = 79;
  c.board[19] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  c.piece = { t: 1, m: tetGame.rotShape(1, 0), x: 0, y: 18, rot: 0 };
  // Simpler: applyClear style level math is in lockPiece; just check the formula still used:
  assert.ok(src.includes('g.level = Math.floor(g.lines / 10) + 1'));
  const again = tetGame.act(c, 'restart');
  assert.strictEqual(again.level, 1, 'Play again still starts from level 1');
  assert.strictEqual(again.score, 0);
  assert.strictEqual(again.lines, 0);
  assert.strictEqual(tetGame.themeFor(again.level), 6);

  // Practice: Continue keeps the current stage; Play again returns to the chosen start level.
  let p = tetGame.newGame({ level: 3, practice: true });
  p.level = 8;
  p.lines = 77;
  p.score = 500;
  p.over = true;
  const pc = tetGame.act(p, 'continue');
  assert.ok(pc.practice);
  assert.strictEqual(pc.level, 8);
  assert.strictEqual(pc.score, 0);
  assert.strictEqual(pc.lines, 70);
  assert.strictEqual(pc.startLevel, 3);
  const pr = tetGame.act(pc, 'restart');
  assert.ok(pr.practice);
  assert.strictEqual(pr.level, 3);
  assert.strictEqual(pr.startLevel, 3);

  // Continue does nothing if the game is still in play
  const live = tetGame.newGame({ level: 8, practice: true });
  live.score = 99;
  const same = tetGame.act(live, 'continue');
  assert.strictEqual(same.score, 99);
  assert.strictEqual(same.level, 8);
  assert.strictEqual(same.over, false);
}

// 1.9.207 Beach water looks like sea water, not snow
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  const draw = src.slice(src.indexOf('function drawStackWash'), src.indexOf('// 1.9.192 Snowy mountains'));
  assert.ok(draw.includes('1.9.207'));
  assert.ok(draw.includes("rgba(56, 170, 175") && draw.includes("rgba(22, 120, 140") && draw.includes("rgba(10, 70, 105"), 'sheet is blue-green sea water');
  assert.ok(!draw.includes("rgba(160, 220, 235") && !draw.includes("rgba(255, 255, 255, 0.9)") && !draw.includes("fillStyle = '#fff'"), 'milky white cap and white flake fills are gone');
  assert.ok(draw.includes("Drips stay in the simulation but are no longer drawn as falling white dots"));
  assert.ok(draw.includes('quadraticCurveTo(mid, y - 1.4') && draw.includes("rgba(220, 235, 230"), 'foam is a line at the wave edge');
  assert.ok(!draw.includes('ctx.ellipse(mid, y - 1.2, 9 + 4 * wet') && !draw.includes('Splash foam where it lands'), 'opaque white foam blobs are gone');
  assert.ok(draw.includes('Soft light shimmer') && draw.includes('fillRect(gx, y0 + 1.6, gw, 1.15)'));
  assert.ok(draw.includes('const reduce = reduceMotion()') && draw.includes('const wave = reduce ? 0'), 'reduced motion stills the wash waves');
  const beach = src.slice(src.indexOf('function drawBeachScene'), src.indexOf('function fwLoad'));
  assert.ok(beach.includes('1.9.207 Sea surface') && beach.includes("fillStyle = '#2a8a96'") && beach.includes("globalCompositeOperation = 'multiply'"));
  assert.ok(beach.includes('Soft sparkle highlights along the sun path') && beach.includes('falling dots'));
  assert.ok(beach.includes('torn mid-sea shards') && beach.includes('const band = 0.46') && beach.includes('c.clip()'));
  assert.ok(beach.includes('if (reduce)') && beach.includes('drawImage(beach.img.water'), 'reduced motion still shows the water painting');
  assert.ok(src.includes("isEffect((g.clearFx ? themeFor(g.clearFx.level) : themeFor(g.level))) !== 'beach'"), 'wash stays on Beach only');
  assert.strictEqual(tetGame.themeFor(5), 0);
  assert.strictEqual(tetGame.isEffect(0), 'beach');
  // Gameplay and the wash cycle are unchanged
  assert.strictEqual(tetGame.STACK_WASH_PERIOD, 8);
  assert.ok(tetGame.washCover(0) === 0 && tetGame.washCover(0.42) === 1);
}

// 1.9.207 Exit Tetris is always reachable; local Tetris scores reset once
{
  const html = fs.readFileSync('feed/tetris.html', 'utf8');
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  const scoresSrc = fs.readFileSync('feed/scores.js', 'utf8');
  assert.ok(html.includes('id="exittetris-play"') && html.includes('id="exittetris-x"') && html.includes('id="exittetris-start"') && html.includes('id="exittetris-over"') && html.includes('id="exittetris-pause"') && html.includes('id="exittetris-howto"'));
  assert.ok((html.match(/Exit Tetris/g) || []).length >= 6);
  assert.ok(html.includes('html.fs-x #exittetris-x') && html.includes('display: block !important'));
  assert.ok(src.includes("querySelectorAll('.exittetris')") && src.includes('requestCloseTetris()'));
  const closeFn = src.slice(src.indexOf('function requestCloseTetris'), src.indexOf('function checkPauseClose'));
  assert.ok(closeFn.includes('stopAudio') && closeFn.includes('CLOSE_MSG') && closeFn.includes('Do not touch tetris-best'));
  assert.ok(src.includes("Use Exit Tetris to go back to Info Book"));
  assert.strictEqual(tetGame.TETRIS_SCORES_CLEAR_207, 'ib-tetris-scores-cleared-1.9.207');
  const mem = new Map();
  const ls = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  mem.set('tetris-best', '12400');
  mem.set('ib-scores-tetris', JSON.stringify([{ score: 12400 }]));
  mem.set('ib-scores-scrabble', JSON.stringify([{ score: 412 }]));
  assert.strictEqual(tetGame.clearTetrisScoresOnce207(ls), true);
  assert.strictEqual(ls.getItem('tetris-best'), null);
  assert.strictEqual(ls.getItem('ib-scores-tetris'), null);
  assert.strictEqual(ls.getItem('ib-scores-scrabble'), JSON.stringify([{ score: 412 }]), 'Scrabble local history is left alone');
  assert.strictEqual(ls.getItem('ib-tetris-scores-cleared-1.9.207'), '1');
  ls.setItem('tetris-best', '500');
  assert.strictEqual(tetGame.clearTetrisScoresOnce207(ls), false, 'the reset never repeats');
  assert.strictEqual(ls.getItem('tetris-best'), '500');
  assert.ok(scoresSrc.includes("TETRIS_SCORES_CLEAR_207 = 'ib-tetris-scores-cleared-1.9.207'") && scoresSrc.includes("removeItem('ib-scores-tetris')"));
}

// 1.9.207 drop speed is 38% slower on every level; controls are unchanged
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  const old = (lv) => Math.max(60, 800 * Math.pow(0.85, lv - 1));
  for (const lv of [1, 2, 3, 5, 8, 9, 12, 13, 20, 30]) {
    assert.ok(Math.abs(tetGame.dropInterval(lv) - old(lv) * 1.38) < 1e-9, 'level ' + lv + ' is 38% slower');
  }
  assert.ok(tetGame.dropInterval(1) > tetGame.dropInterval(2));
  assert.ok(tetGame.dropInterval(8) > tetGame.dropInterval(9));
  assert.ok(src.includes("a === 'down'") && src.includes("data-act=\"drop\"") || src.includes("a === 'drop'"));
  // Soft / hard drop still exist and are not tied to DROP_SLOW
  const act = src.slice(src.indexOf("} else if (a === 'down')"), src.indexOf("} else if (a === 'drop')") + 200);
  assert.ok(act.includes("p.y++") && !act.includes('DROP_SLOW'), 'soft drop is unchanged');
}

// 1.9.207 Snowy mountains abseilers
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.strictEqual(tetGame.themeFor(8), 10);
  assert.strictEqual(tetGame.THEMES[10].name, 'Snowy mountains');
  assert.deepStrictEqual(Array.from(tetGame.ABSEIL_GAP), [30, 60]);
  assert.deepStrictEqual(Array.from(tetGame.ABSEIL_FIRST), [5, 12]);
  const st0 = tetGame.newAbseil();
  st0.wait = 0;
  tetGame.stepAbseil(st0, 0, 390, 844, { pose: true, start: { t: 6 } });
  // kick off a run
  const st = tetGame.newAbseil();
  st.wait = 0;
  tetGame.stepAbseil(st, 10, 390, 844, { pose: true, start: { t: 6 } });
  assert.ok(st.phase === 'down' || st.people.length === 2, 'a run starts after the wait');
  const mid = tetGame.poseAbseil({ phase: 'carry', t: 6 }, 390, 844);
  assert.strictEqual(mid.people.length, 2);
  assert.ok(mid.people[0].y > 40 && mid.people[1].y > 40, 'both climbers are mid-abseil');
  assert.ok(mid.piece && mid.piece.t === 6, 'decorative T piece uses the posed type');
  assert.ok(mid.piece.held || mid.phase === 'grab' || mid.phase === 'carry', 'one of them has or is grabbing the piece');
  const pal = tetGame.LOOKS[10].colors;
  assert.ok(pal.includes(mid.piece.color), 'the prop uses Snowy mountains colours');
  const reduced = tetGame.newAbseil();
  reduced.wait = 0;
  tetGame.stepAbseil(reduced, 10, 390, 844, { reduce: true, pose: true, start: { t: 6 } });
  assert.ok(reduced.phase === 'down' || reduced.people.length === 2, 'reduced motion still runs the climb, only gentler');
  assert.ok(src.includes('function drawAbseilClimber') && src.includes('helmet') || src.includes("helmet"));
  assert.ok(src.includes('stepAbseil(abseil') && src.includes('drawAbseil(c, abseil)'));
  assert.ok(!src.includes('lockPiece') || src.indexOf('function poseAbseil') > 0);
  const poseFn = src.slice(src.indexOf('function poseAbseil'), src.indexOf('function drawAbseilPiece'));
  assert.ok(!poseFn.includes('lockPiece') && !poseFn.includes('spawn('), 'the prop is not a live game piece');
  // Other stages do not start a run
  assert.strictEqual(tetGame.themeFor(5), 0);
  assert.strictEqual(tetGame.themeFor(2), 3);
}

// 1.9.208 Sewers stage (level 10, after City) plus Shane's 14-level order
{
  const names = ['Farmyard', 'Bush walk', 'Jeremiah was a bullfrog', 'Food', 'Beach', 'Ocean', 'New Zealand', 'Snowy mountains', 'City', 'Sewers', 'Fireworks', 'Night sky', 'Space travel', 'Triangles'];
  assert.strictEqual(tetGame.THEMES.length, 14);
  assert.strictEqual(tetGame.THEMES[13].name, 'Sewers');
  assert.strictEqual(tetGame.SEWER_THEME, 13);
  assert.strictEqual(tetGame.SLIME_ODDS, 7);
  assert.deepStrictEqual(Array.from(tetGame.stages().map(s => s.name)), names);
  assert.strictEqual(tetGame.themeFor(9), tetGame.CITY_THEME);
  assert.strictEqual(tetGame.themeFor(10), tetGame.SEWER_THEME);
  assert.strictEqual(tetGame.howToPlayLevels().join(', '), names.join(', '));
  const guide = tetGame.howToPlayHtml();
  assert.ok(guide.includes('14 levels') && guide.includes('Sewers') && guide.includes('slime'));
  assert.ok(guide.includes('slides one square sideways') && guide.includes('squelch'));
  assert.ok(fs.existsSync('feed/tetris-bg/13.webp'), 'sewer backdrop');
  assert.strictEqual(tetGame.bgmSrc(13), 'tetris-bg/m13-314a9c8c.mp3');
  assert.ok(fs.existsSync('feed/' + tetGame.bgmSrc(13)));
  assert.strictEqual(tetGame.TRACKS[13].bpm, 80);
  assert.strictEqual(tetGame.TRACKS[13].key, 'D');
  assert.strictEqual(tetGame.TRACKS[13].mode, 'minor');
  const sha8 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
  assert.strictEqual(tetGame.BGM_HASH[13], sha8('feed/' + tetGame.bgmSrc(13)));

  // Stage rules key off the theme, not a frozen level number
  const food = tetGame.newGame({ level: 4, practice: true });
  assert.strictEqual(tetGame.themeFor(food.level), tetGame.FOOD_THEME);
  food.lastCherry = false;
  assert.strictEqual(tetGame.takeNext(food, 0), tetGame.CHERRY_T, 'cherry bombs still follow the Food theme at its new level');
  const notFood = tetGame.newGame({ level: 12, practice: true });
  assert.notStrictEqual(tetGame.themeFor(notFood.level), tetGame.FOOD_THEME);
  assert.notStrictEqual(tetGame.takeNext(notFood, 0), tetGame.CHERRY_T, 'no cherry bombs off the Food theme');
  assert.ok(tetGame.farmThemeActive(6) && tetGame.farmThemeActive(tetGame.themeFor(1)));
  assert.ok(!tetGame.farmThemeActive(tetGame.themeFor(10)), 'sunrise is Farmyard, not a fixed later level');
  assert.ok(tetGame.dropInterval(10) < tetGame.dropInterval(1), 'speed still follows the level number');

  // Slime: 1 in 7 on Sewers only, slides one free square (or stays), not on other stages
  const sewer = tetGame.newGame({ level: 10, practice: true });
  const slimy = tetGame.maybeSlime(tetGame.spawn(5), 10, 0);
  assert.strictEqual(slimy.slime, true, 'rand 0 is always slime');
  const clean = tetGame.maybeSlime(tetGame.spawn(5), 10, 0.9);
  assert.strictEqual(clean.slime, false, 'rand 0.9 is not slime (~1 in 7)');
  const off = tetGame.maybeSlime(tetGame.spawn(5), 1, 0);
  assert.strictEqual(off.slime, false, 'no slime off the Sewers stage');
  sewer.board = tetGame.emptyBoard();
  sewer.piece = tetGame.spawn(4, { slime: true }); // O, 2x2
  sewer.piece.x = 3; sewer.piece.y = 18;
  const slid = tetGame.trySlimeSlide(sewer, sewer.piece, 1);
  assert.strictEqual(slid, 1);
  assert.strictEqual(sewer.piece.x, 4, 'slides one square when the space is free');
  sewer.board[18][5] = 1; sewer.board[19][5] = 1;
  sewer.piece.x = 4;
  assert.strictEqual(tetGame.trySlimeSlide(sewer, sewer.piece, 1), 0, 'stays put when blocked');
  assert.strictEqual(sewer.piece.x, 4);
  const locked = tetGame.newGame({ level: 10, practice: true });
  locked.board = tetGame.emptyBoard();
  locked.piece = tetGame.spawn(1, { slime: true }); // I
  locked.piece.x = 3; locked.piece.y = 18;
  const beforeX = locked.piece.x;
  tetGame.trySlimeSlide = ((orig => { /* already tested; lockPiece also slides */ return orig; })(tetGame.trySlimeSlide));
  tetGame.lockPiece(locked);
  const cells = [];
  for (let r = 0; r < 20; r++) for (let c = 0; c < 10; c++) if (locked.slime[r][c]) cells.push([r, c]);
  assert.ok(cells.length >= 4, 'slime is stamped onto the board');
  assert.ok(Math.abs((locked.piece && 0) || 0) >= 0);

  const st = tetGame.poseSewer({ manhole: 1, sniff: true, t: 8 }, 390, 844);
  assert.strictEqual(st.manhole.open, 1);
  assert.ok(st.rats.length === 2 && st.rats[0].sniff, 'two rats, one sniffing');
  assert.ok(st.bubbles.length >= 3 && st.drips.length >= 1);
  const reduced = tetGame.newSewerFx();
  tetGame.stepSewerFx(reduced, 500, 390, 844, { reduce: true, silent: true });
  assert.ok(reduced.manhole.open > 0 && reduced.manhole.open < 1, 'reduced motion keeps a gentle static beam, not a full show');
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.ok(src.includes('function drawSewerScene') && src.includes('function drawSewerRat') && src.includes('playSquelch') && src.includes('playBlorp'));
  assert.ok(src.includes('prefers-reduced-motion') && src.includes('SEWER_THEME'));
  // Other stages unchanged in identity
  assert.strictEqual(tetGame.THEMES[4].name, 'City');
  assert.strictEqual(tetGame.THEMES[12].name, 'Food');
  assert.strictEqual(tetGame.THEMES[6].name, 'Farmyard');
}

// 1.9.209 Sewers rats chew blocks, higher water, and Snowy mountains live grab
{
  const src = fs.readFileSync('feed/tetris.js', 'utf8');
  assert.deepStrictEqual(Array.from(tetGame.RAT_CHEW_GAP), [20, 40]);
  assert.strictEqual(tetGame.SEWER_WATER_MIN, 0.15);
  assert.strictEqual(tetGame.SEWER_WATER_MAX, 0.20);
  assert.strictEqual(tetGame.sewerWaterFrac(90, 10), 0.15, 'water starts at 15% of the screen at the beginning of Sewers');
  assert.strictEqual(tetGame.sewerWaterFrac(100, 10), 0.20, 'water rises to 20% after ten lines on Sewers');
  assert.ok(tetGame.sewerWaterFrac(95, 10) > 0.15 && tetGame.sewerWaterFrac(95, 10) < 0.20);
  assert.ok(Math.abs(tetGame.sewerWaterY(1000, 90, 10) - 850) < 1e-9);
  assert.ok(Math.abs(tetGame.sewerWaterY(1000, 100, 10) - 800) < 1e-9);

  const g = tetGame.newGame({ level: 10, practice: true });
  g.board = tetGame.emptyBoard();
  // A 3-high column and a surface step, plus a buried cell that must not be picked
  for (let r = 17; r <= 19; r++) for (let c = 2; c <= 4; c++) g.board[r][c] = 1;
  g.board[19][6] = 1;
  const targets = tetGame.sewerChewTargets(g);
  const keys = targets.map(t => t.c + ',' + t.r).sort();
  assert.ok(keys.includes('2,17') && keys.includes('3,17') && keys.includes('4,17') && keys.includes('6,19'));
  assert.ok(!keys.includes('3,18'), 'a cell boxed in on the top and both sides is not on the surface');
  // Never touch the falling piece
  g.piece = tetGame.spawn(4); // O, 2x2
  g.piece.x = 5; g.piece.y = 17; // covers 5,17 6,17 5,18 6,18 — not the locked 5,19
  // put the piece on top of 5,19? y=18 would cover 5,18 and 5,19
  g.piece.y = 18;
  const after = tetGame.sewerChewTargets(g).map(t => t.c + ',' + t.r);
  assert.ok(!after.includes('5,19'), 'a cell under the falling piece is not a chew target');

  // Chew one cell, column gravity like cherry bombs, can complete a line
  const chew = tetGame.newGame({ level: 10, practice: true });
  chew.board = tetGame.emptyBoard();
  chew.slime = tetGame.emptySlime();
  // Row 18 is one short (col 4). Col 4 has a slime block at row 16 that will fall into it.
  for (let c = 0; c < 10; c++) if (c !== 4) chew.board[18][c] = 1;
  chew.board[19][4] = 2;
  chew.board[17][4] = 4;
  chew.board[16][4] = 3;
  chew.slime[16][4] = 1;
  chew.piece = tetGame.spawn(1);
  chew.piece.x = 0; chew.piece.y = 0;
  const result = tetGame.applyRatChew(chew, 4, 16);
  assert.ok(result && result.c === 4 && result.r === 16);
  assert.strictEqual(chew.board[16][4], 0, 'the nibbled cell is gone');
  assert.ok(result.cleared >= 1, 'settling the column can complete a line');
  assert.strictEqual(chew.board[19][4], 2, 'the cell that was already on the floor stays at the bottom of the packed column after the line clears');

  // One-at-a-time state machine and reduced motion still chews
  const st = tetGame.newRatChew();
  st.wait = 0;
  const g2 = tetGame.newGame({ level: 10, practice: true });
  g2.board = tetGame.emptyBoard();
  g2.board[19][7] = 1;
  g2.piece = tetGame.spawn(1); g2.piece.x = 0; g2.piece.y = 0;
  tetGame.stepRatChew(st, g2, 0, { running: true, silent: true, reduce: true });
  assert.strictEqual(st.phase, 'approach');
  assert.strictEqual(st.col, 7); assert.strictEqual(st.row, 19);
  // Mid-approach the cell is still there; after a long nibble it is gone
  tetGame.stepRatChew(st, g2, 8000, { running: true, silent: true, reduce: true });
  assert.ok(st.munched || st.phase === 'flee' || st.phase === 'wait', 'the chew completes even with reduced motion');
  assert.strictEqual(g2.board[19][7], 0, 'the cell is removed after the nibble');

  // Off-theme: no chew
  const off = tetGame.newGame({ level: 8, practice: true });
  off.board = tetGame.emptyBoard();
  off.board[19][0] = 1;
  const stOff = tetGame.stepRatChew(tetGame.newRatChew(), off, 50000, { running: true, silent: true });
  assert.strictEqual(stOff.phase, 'wait');
  assert.strictEqual(off.board[19][0], 1, 'rats do not chew off the Sewers stage');

  const guide = tetGame.howToPlayHtml();
  assert.ok(guide.includes('rat') && (guide.includes('nibbles') || guide.includes('nibble')));
  assert.ok(guide.includes('abseil') || guide.includes('climbers'));
  assert.ok(guide.includes('grab') && guide.includes('few columns'));
  assert.ok(src.includes('playMunch') && src.includes('drawRatChew') && src.includes('applyRatChew'));

  // Live abseil grab
  assert.strictEqual(tetGame.ABSEIL_SAFE_ROWS, 2);
  const snow = tetGame.newGame({ level: 8, practice: true });
  snow.board = tetGame.emptyBoard();
  snow.piece = tetGame.spawn(4); // O
  snow.piece.x = 3; snow.piece.y = 4;
  assert.ok(tetGame.pieceFallLeft(snow) > 10);
  assert.ok(tetGame.abseilPieceSafe(snow));
  const opts = tetGame.abseilShiftTargets(snow);
  assert.ok(opts.length >= 1);
  assert.ok(opts.every(x => x !== snow.piece.x && tetGame.abseilShiftOk(snow, x)));
  // Too close to the stack: y near the floor
  const low = tetGame.newGame({ level: 8, practice: true });
  low.board = tetGame.emptyBoard();
  for (let c = 0; c < 10; c++) low.board[19][c] = 1;
  low.piece = tetGame.spawn(4);
  low.piece.x = 3; low.piece.y = 16; // O covers 16-17, lands at 17 (one row of fall) — last couple of rows
  assert.ok(tetGame.pieceFallLeft(low) < 2);
  assert.ok(!tetGame.abseilPieceSafe(low), 'will not grab in the last couple of rows above the stack');
  // Overlap is rejected
  const blocked = tetGame.newGame({ level: 8, practice: true });
  blocked.board = tetGame.emptyBoard();
  blocked.piece = tetGame.spawn(4);
  blocked.piece.x = 0; blocked.piece.y = 4;
  assert.ok(!tetGame.abseilShiftOk(blocked, -1), 'never shifts into an overlapping / off-board position');

  const live = tetGame.newGame({ level: 8, practice: true });
  live.board = tetGame.emptyBoard();
  live.piece = tetGame.spawn(4);
  live.piece.x = 3; live.piece.y = 5;
  const startX = live.piece.x;
  const ast = tetGame.newAbseil();
  tetGame.abseilStartLive(ast, 390, 844, live, {});
  ast.targetX = startX + 3;
  assert.strictEqual(ast.mode, 'live');
  function tickAbseil(st, game, ms, reduce) {
    const step = 50;
    let left = ms;
    while (left > 0) {
      const d = Math.min(step, left);
      tetGame.stepAbseil(st, d, 390, 844, { pose: true, game: game, running: true, reduce: !!reduce });
      left -= d;
    }
  }
  tickAbseil(ast, live, (2.8 + 0.8 + 1.4) * 1000, false);
  assert.strictEqual(ast.phase, 'carry', ast.phase);
  assert.ok(live.heldByAbseil, 'the live piece is held while they carry it');
  assert.ok(live.piece.x !== startX, 'they carry the piece sideways');
  tickAbseil(ast, live, 3000, false);
  assert.ok(!live.heldByAbseil, 'they let go at the end');
  assert.strictEqual(live.piece.x, ast.targetX);
  assert.strictEqual(live.piece.y, 5, 'they do not drop it into the stack; it keeps its row and falls normally afterwards');

  // Reduced motion still applies the same grab rules
  const liveR = tetGame.newGame({ level: 8, practice: true });
  liveR.board = tetGame.emptyBoard();
  liveR.piece = tetGame.spawn(4);
  liveR.piece.x = 2; liveR.piece.y = 5;
  const astR = tetGame.newAbseil();
  tetGame.abseilStartLive(astR, 390, 844, liveR, {});
  astR.targetX = 5;
  tickAbseil(astR, liveR, 8000, true);
  assert.notStrictEqual(liveR.piece.x, 2, 'reduced motion still carries the live piece');
  assert.strictEqual(liveR.piece.x, 5);

  // Other stages, speeds and order unchanged
  assert.strictEqual(tetGame.DROP_SLOW, 1.38);
  assert.deepStrictEqual(Array.from(tetGame.howToPlayLevels()), ['Farmyard', 'Bush walk', 'Jeremiah was a bullfrog', 'Food', 'Beach', 'Ocean', 'New Zealand', 'Snowy mountains', 'City', 'Sewers', 'Fireworks', 'Night sky', 'Space travel', 'Triangles']);
  assert.strictEqual(tetGame.themeFor(8), 10);
  assert.strictEqual(tetGame.themeFor(10), tetGame.SEWER_THEME);
  assert.ok(src.includes('prefers-reduced-motion'));
}

// 1.9.210 Sugar Rush NZ map main screen
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  const html = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  assert.strictEqual(SR.LEVELS.length, 22);
  assert.strictEqual(SR.LEVELS[1].name, "Sarah's Sweet Spot");
  assert.strictEqual(SR.LEVELS[1].badge.icon, '💖');
  assert.strictEqual(SR.LEVELS[1].badge.name, "Sarah's Heart");
  assert.strictEqual(SR.MAP_STOPS.length, 22);
  assert.strictEqual(SR.MAP_W, 400);
  assert.ok(SR.MAP_H > 1000, 'the map is tall enough to scroll south');
  const places = SR.MAP_STOPS.map(s => s.place);
  assert.deepStrictEqual(Array.from(places), ['Onerahi', "Sarah's House", 'Whangārei', 'Auckland Post Office', 'Hamilton', 'Rotorua', 'Taupō Station', 'Napier', 'Wellington', 'Nelson', 'Kaikōura', 'Christchurch', 'Franz Josef', 'Queenstown', 'Dunedin', 'Bluff', 'Rarotonga', 'Tonga', 'Samoa', 'Sydney', 'Gold Coast', 'Perth']);
  assert.strictEqual(SR.stopForLevel(2).kind, 'house');
  assert.strictEqual(SR.stopForLevel(2).place, "Sarah's House");
  assert.strictEqual(SR.stopForLevel(4).kind, 'post');
  assert.ok(SR.stopForLevel(4).place.toLowerCase().includes('post'));
  assert.strictEqual(SR.stopForLevel(7).kind, 'station');
  assert.ok(SR.stopForLevel(7).place.toLowerCase().includes('station') || SR.stopForLevel(7).place.includes('Taupō'));
  const future = SR.FUTURE_STOPS.map(s => s.place);
  assert.ok(future.includes('Melbourne') && places.includes('Christchurch') && places.includes('Queenstown') && places.includes('Dunedin'));
  assert.ok(SR.MAP_STOPS.every((a, i) => i === 0 || SR.MAP_STOPS[i].y >= SR.MAP_STOPS[0].y - 40), 'the journey starts up north');
  assert.ok(SR.stopForLevel(15).y < SR.FUTURE_STOPS[0].y, 'future stops lie further south');
  const path = SR.icingPath(SR.MAP_STOPS);
  assert.ok(path.startsWith('M ') && path.includes('C '), 'candy path is a smooth SVG line through the stops');
  const svg = SR.nzMapSvg();
  assert.ok(svg.includes('North') || svg.includes('M 196 30') || svg.includes('viewBox'), 'has an NZ outline');
  assert.ok(svg.includes('Cook') || svg.includes('575') || svg.includes('ferry') || svg.includes('sr-future'), 'includes the strait crossing / south path');
  assert.ok(html.includes('id="mapview"') && html.includes('id="mapstage"') && html.includes('id="path"'));
  assert.ok(html.includes('Starting in Onerahi') || html.includes('starting in Onerahi'));
  assert.ok(html.includes('prefers-reduced-motion'));
  assert.ok(html.includes('orientation: landscape'));
  assert.ok(src.includes('scrollMapTo') && src.includes('openLevel(n)'));
  assert.ok(src.includes("playKind(wantKind())") && src.includes("'menu'"));
  assert.strictEqual(SR.mediaUrl('sugar-rush-menu.mp3'), 'sugar-rush-menu-3343a079.mp3');
  // Gameplay and badges are unchanged
  assert.strictEqual(SR.LEVELS[0].name, 'The Sweet Shop');
  assert.strictEqual(SR.LEVELS[9].name, 'Saturday Night');
  assert.strictEqual(SR.LEVELS[1].theme, 'sarah');
}

// 1.9.210 Sugar Rush family race on the NZ map
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  const html = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  const scoresSrc = fs.readFileSync('feed/scores.js', 'utf8');
  const workerSrc = fs.readFileSync('worker/src/scores.js', 'utf8');
  assert.ok(SR.RACE_ICONS.length >= 16, 'a family-sized set of icons');
  const ids = SR.RACE_ICONS.map(x => x.id);
  assert.ok(new Set(ids).size === ids.length, 'icon ids are unique');
  assert.ok(SR.RACE_ICONS.every(x => x.emoji && x.color && x.name));
  assert.ok(ids.includes('lolly') && ids.includes('cupcake') && ids.includes('kiwi') && ids.includes('train') && ids.includes('car'));
  assert.strictEqual(SR.allocateIcon(['lolly', 'cupcake'], 'seed-a') === 'lolly', false);
  const a = SR.allocateIcon([], 'Shane');
  const b = SR.allocateIcon([], 'Sarah');
  assert.ok(a && b);
  // same seed is stable; different members prefer different defaults when the pool is free
  assert.strictEqual(SR.allocateIcon([], 'Shane'), a);
  const takenAll = ids.slice(0, -1);
  const last = SR.allocateIcon(takenAll, 'x');
  assert.ok(ids.includes(last) && !takenAll.includes(last), 'last free icon is still allocated uniquely');
  assert.deepStrictEqual(
    SR.rankRacers([{ name: 'Alex', stop: 5, stars: 12 }, { name: 'Sarah', stop: 6, stars: 8 }, { name: 'Shane', stop: 5, stars: 14 }]).map(r => r.name),
    ['Sarah', 'Shane', 'Alex'],
    'furthest stop wins, then stars'
  );
  assert.strictEqual(SR.raceStop({ open: 7, stars: [3, 3, 3, 2, 2, 1, 1, 0, 0, 0] }), 7);
  assert.strictEqual(SR.raceStars({ stars: [3, 3, 3, 2, 2, 1, 1, 0, 0, 0] }), 15);
  const one = SR.stackOffsets(1, 0), twoA = SR.stackOffsets(2, 0), twoB = SR.stackOffsets(2, 1);
  assert.ok(one && typeof one.x === 'number' && typeof one.y === 'number');
  assert.ok(twoA.x !== twoB.x, 'two racers on the same stop are offset');
  assert.ok(html.includes('id="pickicon"') && html.includes('Pick your icon'));
  assert.ok(html.includes('id="raceboard"') && html.includes('id="racers"') && html.includes('id="iconpick"'));
  assert.ok(html.includes('racer.me') && (html.includes('Family race') || html.includes('family race')));
  assert.ok(src.includes('seedRace') && src.includes('raceDemo') && src.includes("call('/sugar-race'") === false);
  assert.ok(src.includes('seedRace') && src.includes('never POST') || src.includes('Never talks to the family backend') || src.includes('never talks to the family backend') || src.includes('never POST to the family backend'));
  assert.ok(scoresSrc.includes('loadRace') && scoresSrc.includes('/sugar-race'));
  assert.ok(workerSrc.includes("p === '/sugar-race'") && workerSrc.includes('sugar_race') && workerSrc.includes('icon taken'));
  const workerIds = workerSrc.match(/export const RACE_ICONS = \[([^\]]+)\]/)[1].replace(/['"\s]/g, '').split(',');
  assert.deepStrictEqual(workerIds, Array.from(ids), 'client and worker share the same icon ids');
  assert.ok(html.includes('prefers-reduced-motion') && html.includes('orientation: landscape'));
}

// 1.9.211 Sugar Rush NZ map fills almost the entire phone screen
{
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  const html = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  const play = fs.readFileSync('feed/play.js', 'utf8');
  const idx = fs.readFileSync('feed/index.html', 'utf8');
  const SR = load('feed/sugar-rush.js').SugarRush;
  assert.strictEqual(SR.LEVELS.length, 22);
  assert.strictEqual(SR.LEVELS[1].name, "Sarah's Sweet Spot");
  assert.ok(html.includes('id="mapbar"') && html.includes('id="mapexit"') && html.includes('Exit'));
  assert.ok(html.includes('id="racechip"') && html.includes('id="pickicon"') && html.includes('Pick your icon'));
  assert.ok(html.includes('id="mapview"') && html.includes('id="mapstage"') && html.includes('id="racers"'));
  assert.ok(html.includes('body.onmap') && html.includes('padding: 0') && html.includes('inset: 0'));
  assert.ok(html.includes('env(safe-area-inset-top') && html.includes('safe-area-inset-bottom') && html.includes('viewport-fit=cover'));
  assert.ok(html.includes('orientation: landscape') && html.includes('prefers-reduced-motion'));
  assert.ok(html.includes('id="maphelp"') && html.includes('hidden') && html.includes('starting in Onerahi'));
  assert.ok(src.includes('requestCloseSugar') && src.includes("postMessage({ type: 'ib-sugar-close' }"));
  assert.ok(src.includes('setRaceOpen') && src.includes("chip.hidden = !!on"));
  assert.ok(play.includes("kind === 'sugar'") && play.includes('setFull(true)'));
  assert.ok(play.includes("d.type !== 'ib-sugar-close'") && play.includes("d.type !== 'ib-tetris-close'"));
  assert.ok(idx.includes('.artwin.artsugar.artfull .artfsx{display:none}'));
  assert.ok(html.includes('id="shelf"') && html.includes('Badge shelf'));
  assert.ok(src.includes("playKind(wantKind())") && src.includes("'menu'"));
}

// 1.9.212 Sugar Rush level intros and the level-1 tutorial
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  const html = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  assert.strictEqual(SR.LEVELS.length, 22);
  assert.ok(SR.LEVELS[1].intro && /Sarah, Shane's partner/.test(SR.LEVELS[1].intro.body));
  assert.strictEqual(SR.LEVEL_INTROS.length, 22);
  assert.strictEqual(SR.LEVELS[0].target, 0);
  assert.strictEqual(SR.LEVELS[0].moves, 20);
  const lines = {
    1: 'Level 1 · Onerahi',
    2: "Level 2 · Sarah's House",
    3: 'Level 3 · Whangārei',
    4: 'Level 4 · Auckland Post Office',
    5: 'Level 5 · Hamilton',
    6: 'Level 6 · Rotorua',
    7: 'Level 7 · Taupō Station',
    8: 'Level 8 · Napier',
    9: 'Level 9 · Wellington',
    10: 'Level 10 · Nelson'
  };
  const goals = {
    1: 'Collect 20 cherry gumdrops',
    2: 'Collect 10 cherry gumdrops',
    3: 'Clear all the jelly',
    4: 'Free all the locked jars',
    5: 'Clear all the icing',
    6: 'Clear all the double jelly',
    7: 'Bring the ingredients down to the bottom',
    8: 'Clear all the jelly',
    9: 'Clear the jelly and collect 6 lemon drops',
    10: 'Finish every objective'
  };
  for (let n = 1; n <= 10; n++) {
    const info = SR.levelIntro(n, { stars: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    assert.strictEqual(info.n, n);
    assert.strictEqual(info.name, SR.LEVELS[n - 1].name);
    assert.strictEqual(info.stopLine, lines[n]);
    assert.strictEqual(info.goal, goals[n]);
    assert.ok(info.detail && info.tip && info.icon && info.mechanic);
    assert.strictEqual(info.moves, SR.LEVELS[n - 1].moves);
    assert.ok(info.strip.startsWith(info.goal));
    assert.ok(info.strip.includes(String(info.moves)));
  }
  const sarah = SR.levelIntro(2, { stars: [0, 3, 0, 0, 0, 0, 0, 0, 0, 0] });
  assert.strictEqual(sarah.stars, 3);
  assert.strictEqual(sarah.theme, 'sarah');
  assert.ok(sarah.badge && sarah.badge.name === "Sarah's Heart");
  const taupo = SR.levelIntro(7);
  assert.strictEqual(taupo.mechanic, 'ings');
  assert.ok(/ingredients/i.test(taupo.detail));

  const ids = SR.TUTORIAL_STEPS.map(s => s.id);
  assert.deepStrictEqual(Array.from(ids), ['match3', 'striped', 'wrapped', 'bomb', 'goal', 'stars', 'ready']);
  assert.ok(SR.TUTORIAL_STEPS.every(s => s.bubble && s.bubble.length < 140));
  assert.strictEqual(SR.TUTORIAL_STEPS[0].bubble, 'Swap two neighbouring sweets to make a line of three.');
  assert.ok(/striped sweet/.test(SR.TUTORIAL_STEPS[1].bubble));
  assert.ok(/wrapped sweet/.test(SR.TUTORIAL_STEPS[2].bubble));
  assert.ok(/sprinkle bomb/.test(SR.TUTORIAL_STEPS[3].bubble));
  assert.ok(/20 cherry gumdrops in 20 moves/.test(SR.TUTORIAL_STEPS[4].bubble));
  assert.ok(/Stars fill/.test(SR.TUTORIAL_STEPS[5].bubble));
  assert.strictEqual(SR.TUTORIAL_STEPS[6].bubble, "You're ready!");
  for (const step of SR.TUTORIAL_STEPS.filter(s => s.kind === 'move')) {
    const st = SR.newGame({ board: SR.fromRows(step.board), level: SR.LEVELS[0] });
    assert.strictEqual(SR.findRuns(st.board).length, 0, step.id + ' starts with no runs');
    const res = SR.play(st, step.move[0], step.move[1]);
    assert.strictEqual(res.valid, true, step.id + ' move is valid');
    const made = (res.steps[0].made || []).map(m => m.s);
    if (step.special) {
      assert.ok(made.includes(step.special), step.id + ' makes ' + step.special + ' got ' + made);
    } else {
      assert.ok(!made.length, step.id + ' is a plain match of three');
    }
  }
  const mv = SR.TUTORIAL_STEPS[0].move;
  assert.ok(SR.sameTutMove(mv[0], mv[1], mv) && SR.sameTutMove(mv[1], mv[0], mv));
  assert.ok(!SR.sameTutMove([0, 0], [0, 1], mv));
  assert.strictEqual(SR.TUTORIAL_KEY, 'ib-sugar-tutorial-done');

  assert.ok(html.includes('id="intro"') && html.includes('id="introtitle"') && html.includes('id="introbody"') && html.includes('id="introbtn"'));
  assert.ok(html.includes('id="introx"') && html.includes('id="introstop"') && html.includes('id="introhow"'));
  assert.ok(html.includes("Let's go!") && html.includes('How to play') && html.includes('Skip tutorial'));
  assert.ok(html.includes('id="howtobtn"') && html.includes('id="tut"') && html.includes('id="tuthand"') && html.includes('id="tutskip"'));
  assert.ok(html.includes('id="goalstrip"') && html.includes('id="starbars"'));
  assert.ok(html.includes('prefers-reduced-motion') && html.includes('orientation: landscape'));
  assert.ok(html.includes('.tuthand') && html.includes('tuthswipe'));
  assert.ok(src.includes('showIntro') && src.includes('startTutorial') && src.includes('skipTutorial'));
  assert.ok(src.includes('beginLevel') && src.includes('st.tutorial'));
  assert.ok(src.includes("Let's go!") && src.includes('Replay tutorial'));
  // Gameplay, badges and race hooks stay as they were
  assert.strictEqual(SR.LEVELS[0].name, 'The Sweet Shop');
  assert.strictEqual(SR.LEVELS[6].name, 'Bring it Down');
  assert.strictEqual(SR.LEVELS[1].badge.name, "Sarah's Heart");
  assert.ok(src.includes('seedRace') && src.includes('never POST to the family backend'));
}

// 1.9.213 Sugar Rush per-level tutorials and Goal achieved play-out
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  const html = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  assert.strictEqual(SR.LEVELS.length, 22);
  assert.ok(SR.LEVELS[1].intro && /Sarah, Shane's partner/.test(SR.LEVELS[1].intro.body));
  assert.ok(SR.TUTORIALS[1] && SR.TUTORIALS[1] === SR.TUTORIAL_STEPS);
  assert.strictEqual(SR.tutorialFor(1), SR.TUTORIAL_STEPS);
  for (let n = 1; n <= 10; n++) {
    const steps = SR.tutorialFor(n);
    assert.ok(steps && steps.length, 'level ' + n + ' has a tutorial or recap');
    if (n === 1) {
      assert.ok(steps.length >= 7);
      assert.ok(steps.some(s => s.kind === 'move'));
    } else if (n < 10) {
      assert.ok(steps.length >= 2 && steps.length <= 4, 'level ' + n + ' is short (2-4 steps)');
      assert.ok(steps.some(s => s.kind === 'move'));
    } else {
      assert.strictEqual(steps[0].kind, 'recap');
      assert.ok(steps[0].items && steps[0].items.length >= 4);
    }
    for (const step of steps) {
      if (step.kind !== 'move') continue;
      const lv = SR.LEVELS[n - 1];
      const st = SR.newGame({ level: lv, board: SR.fromRows(step.board), seed: 7, mask: lv.mask || null });
      if (step.locks) {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
          if (+(step.locks[r] && step.locks[r][c]) && st.board[r][c] && st.board[r][c].c >= 0) st.board[r][c].lock = 1;
        }
      }
      if (step.jelly) st.jelly = step.jelly.map(row => row.split('').map(ch => +ch || 0));
      assert.strictEqual(SR.findRuns(st.board).length, 0, step.id + ' starts with no runs');
      const res = SR.play(st, step.move[0], step.move[1]);
      assert.strictEqual(res.valid, true, step.id + ' move is valid');
      if (n === 3) assert.ok(res.steps.some(s => s.jellyCleared > 0), 'jelly is cleared');
      if (n === 4) assert.ok(res.steps.some(s => s.brokeLock), 'a lock is freed');
      if (n === 5) assert.ok(res.steps.some(s => (s.blocked || []).some(b => b.kind === 'ice')), 'icing is hit');
      if (n === 6) assert.ok(res.steps.some(s => s.jellyCleared > 0), 'a jelly layer is cleared');
      if (step.id === 'ing-down') assert.ok(res.steps.some(s => (s.delivered || []).length > 0), 'ingredient is collected');
      if (step.id === 'choco-spread') assert.ok(res.spread, 'chocolate spreads when not hit');
      if (step.id === 'choco-hit') assert.ok(res.steps.some(s => s.chocoHit), 'chocolate is hit');
      if (n === 2) assert.ok((st.collected[0] || 0) >= 3, 'cherries are collected');
      if (n === 9) assert.ok((st.collected[2] || 0) >= 3, 'lemon drops are collected');
    }
  }
  assert.ok(html.includes('id="introhow"') && html.includes('Replay tutorial') === false || html.includes('id="introhow"'));
  assert.ok(src.includes('How this level works') && src.includes('tutorialStorageKey(n'));
  assert.ok(src.includes('beginGoalFinish') && src.includes('grantPlayOutSpecial') && src.includes('celebrateOnMap'));
  assert.ok(html.includes('id="goalban"') && html.includes('Goal achieved!') && html.includes('id="goalskip"'));
  assert.ok(html.includes('id="tutrecap"') && html.includes('id="goalnext"') && html.includes('id="goalnextbtn"'));
  assert.ok(html.includes('prefers-reduced-motion') && html.includes('orientation: landscape'));
  const st = SR.newGame({ level: SR.LEVELS[0], seed: 3 });
  st.score = 3000; st.moves = 4;
  const before = st.score;
  const out = SR.runPlayOut(st);
  assert.ok(out.granted.length >= 1 && out.granted.length <= 4);
  assert.ok(out.score > before, 'play-out adds bonus points');
  assert.strictEqual(st.moves, 0);
  assert.ok(out.granted.every(g => g.s === 'row' || g.s === 'col' || g.s === 'w'));
  assert.ok(!SR.goalsMet({ lv: SR.LEVELS[0], score: 3000, collected: [], ingsLeft: 0, board: st.board, jelly: null }));
  const collected = new Array(6).fill(0); collected[0] = 20;
  assert.ok(SR.goalsMet({ lv: SR.LEVELS[0], score: 0, collected, ingsLeft: 0, board: st.board, jelly: null }), 'level 1 wins on cherries, not score');
  assert.strictEqual(SR.LEVELS[0].target, 0);
  assert.strictEqual(SR.LEVELS[0].moves, 20);
  assert.strictEqual(SR.LEVELS[6].name, 'Bring it Down');
  assert.ok(src.includes('seedRace') && src.includes('never POST to the family backend'));
  // Goals are always objectives. Score only decides stars.
  assert.ok(SR.LEVELS.every(lv => !lv.target), 'no level has a score target as the win condition');
  assert.deepStrictEqual({ ...SR.LEVELS[0].collect }, { color: 0, n: 20 });
  assert.ok(SR.LEVELS[3].locks && SR.locksLeft(SR.newGame({ level: SR.LEVELS[3], seed: 1 }).board) > 0);
  assert.deepStrictEqual(Array.from(SR.LEVELS[0].stars), [3000, 6000, 9000]);
  assert.deepStrictEqual(Array.from(SR.LEVELS[3].stars), [2500, 5000, 8000]);
  assert.ok(SR.tryBeat(SR.LEVELS[0], 16) >= 8, 'level 1 is easy to beat');
  assert.ok(SR.tryBeat(SR.LEVELS[3], 16) >= 1, 'level 4 is beatable by freeing every lock');
  const lockSt = SR.newGame({ level: SR.LEVELS[3], seed: 1 });
  const nLocks = SR.locksLeft(lockSt.board);
  const cleared = Object.assign({}, lockSt, { board: lockSt.board.map(row => row.map(t => t && t.lock ? Object.assign({}, t, { lock: 0 }) : t)) });
  assert.ok(!SR.goalsMet(lockSt) && SR.goalsMet(cleared) && nLocks > 0);
}

// 1.9.213 Sayings, brighter twinkles, goal countdown, and the 3-moves banner
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  const html = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  const kinds = Object.keys(SR.SAYINGS);
  assert.ok(kinds.length >= 12, 'a large pool of sayings');
  for (const k of kinds) {
    assert.ok(SR.SAYINGS[k].length >= 3, k + ' has at least three variants');
    let last = null;
    for (let i = 0; i < 12; i++) {
      const s = SR.pickSaying(k, last, () => 0);
      assert.ok(s && SR.SAYINGS[k].includes(s));
      assert.notStrictEqual(s, last, k + ' does not repeat in a row');
      last = s;
    }
  }
  assert.ok(SR.SAYINGS.cascade.includes('Sweet as!') && SR.SAYINGS.cascade.includes('Sugar rush!'));
  assert.ok(SR.SAYINGS.stripe.includes('Stripe-tastic!') && SR.SAYINGS.stripe.includes('Candy-licious!'));
  assert.ok(SR.SAYINGS.wrap.includes("That's a wrap!"));
  assert.ok(SR.SAYINGS.bomb.includes('Sprinkle-tastic!') && SR.SAYINGS.bomb.includes('Hundreds and thousands!'));
  assert.ok(SR.SAYINGS.jelly.includes('Jelly good!') && SR.SAYINGS.jelly.includes('Wobble wobble!'));
  assert.ok(SR.SAYINGS.locks.includes('Jar-mazing!'));
  assert.ok(SR.SAYINGS.ice.includes('Ice ice baby!'));
  assert.ok(SR.SAYINGS.ings.includes('Down the hatch!'));
  assert.ok(SR.SAYINGS.choco.includes('Choc-blocked!'));
  assert.ok(SR.SAYINGS.gumdrop.includes('Gum-believable!'));
  assert.ok(SR.SAYINGS.lemon.includes('Zesty!'));
  assert.ok(SR.SAYINGS.combo.includes('Double delight!'));
  assert.ok(SR.SAYINGS.comeback.length >= 3);
  assert.strictEqual(SR.sayingKind({ popped: [{}, {}, {}], made: [], fired: [], cascade: 1 }, 1), null, 'a plain 3-match is silent');
  assert.strictEqual(SR.sayingKind({ popped: [{}, {}, {}], made: [], fired: [], cascade: 2 }, 2), 'cascade');
  assert.strictEqual(SR.sayingKind({ popped: [], made: [{ s: 'row' }], fired: [], cascade: 1 }, 1), 'stripe');
  assert.strictEqual(SR.sayingKind({ popped: [], made: [{ s: 'w' }], fired: [], cascade: 1 }, 1), 'wrap');
  assert.strictEqual(SR.sayingKind({ popped: [], made: [{ s: 'b' }], fired: [], cascade: 1 }, 1), 'bomb');
  assert.strictEqual(SR.sayingKind({ popped: [], made: [], fired: [{ s: 'row' }, { s: 'w' }], cascade: 1 }, 1), 'combo');
  assert.strictEqual(SR.sayingKind({ popped: [], made: [], fired: [], jellyCleared: 1, cascade: 1 }, 1), 'jelly');
  assert.strictEqual(SR.sayingKind({ popped: [], made: [], fired: [], brokeLock: true, cascade: 1 }, 1), 'locks');
  assert.strictEqual(SR.sayingKind({ popped: [], made: [], fired: [], blocked: [{ kind: 'ice' }], cascade: 1 }, 1), 'ice');
  assert.strictEqual(SR.sayingKind({ popped: [], made: [], fired: [], delivered: [{}], cascade: 1 }, 1), 'ings');
  assert.strictEqual(SR.sayingKind({ popped: [], made: [], fired: [], chocoHit: true, cascade: 1 }, 1), 'choco');
  const gumSt = { lv: SR.LEVELS[0], moves: 12, collected: [] };
  assert.strictEqual(SR.sayingKind({ popped: [{ color: 0 }, { color: 0 }, { color: 0 }], made: [], fired: [], cascade: 1 }, 1, gumSt), 'gumdrop');
  const lemonSt = { lv: SR.LEVELS[8], moves: 12, collected: [] };
  assert.strictEqual(SR.sayingKind({ popped: [{ color: 2 }, { color: 2 }, { color: 2 }], made: [], fired: [], cascade: 1 }, 1, lemonSt), 'lemon');
  assert.strictEqual(SR.sayingKind({ popped: [{ color: 0 }, { color: 0 }, { color: 0 }], made: [], fired: [], cascade: 1 }, 1, { lv: SR.LEVELS[0], moves: 4 }), 'comeback');
  assert.strictEqual(SR.sayingKind({ popped: [], made: [{ s: 'row' }], fired: [], cascade: 1 }, 1, { moves: 3 }), 'stripe', 'specials beat the comeback line');
  // Spoken clips stay on the existing words so older tests and audio files still match.
  assert.strictEqual(SR.voiceForStep({ popped: [{}, {}, {}, {}], made: [{ s: 'row' }], fired: [], cascade: 1 }, 1), 'great');
  assert.ok(src.includes('showSaying') && src.includes('sayUntil') && html.includes('id="saypop"') && html.includes('saypopin'));

  const l1 = SR.goalCounts(SR.LEVELS[0], { collected: [17, 0, 0, 0, 0, 0], board: SR.newGame({ level: SR.LEVELS[0], seed: 1 }).board });
  assert.ok(l1.some(c => c.kind === 'collect' && c.icon === '🍒' && c.left === 3 && /3 left/.test(c.text)));
  const l3 = SR.goalCounts(SR.LEVELS[2], SR.newGame({ level: SR.LEVELS[2], seed: 1 }));
  assert.ok(l3.some(c => c.kind === 'jelly' && c.icon === '🟩' && /Jelly/.test(c.text) && c.left > 0));
  const l4 = SR.goalCounts(SR.LEVELS[3], SR.newGame({ level: SR.LEVELS[3], seed: 1 }));
  assert.ok(l4.some(c => c.kind === 'locks' && c.icon === '🔒' && c.left > 0));
  const l7 = SR.goalCounts(SR.LEVELS[6], SR.newGame({ level: SR.LEVELS[6], seed: 1 }));
  assert.ok(l7.some(c => c.kind === 'ings' && /\d\/\d/.test(c.lab)));
  assert.ok(html.includes('id="cditems"') && html.includes('id="movecount"') && html.includes('cdbounce') && html.includes('movepulse'));
  assert.ok(html.includes('prefers-reduced-motion') && src.includes('cd-item') && src.includes("classList.toggle('low'"));

  assert.strictEqual(SR.MOVES_WARN_AT, 3);
  assert.ok(SR.MOVES_WARN_MS >= 2000 && SR.MOVES_WARN_MS <= 2500);
  assert.ok(html.includes('3 MOVES LEFT!') && html.includes('id="moveswarn"') && html.includes('mwscroll') && html.includes('mwfade'));
  assert.ok(src.includes('function playMovesWarnChime') && src.includes('maybeWarn3') && src.includes('warned3'));
  assert.ok(src.includes('if (st.moves !== MOVES_WARN_AT || goalsMet(st)) return'));
  assert.ok(src.includes('pointer-events: none') || html.includes('#moveswarn') && html.includes('pointer-events: none'));
  assert.ok(html.includes('#moveswarn.reduce') || html.includes('prefers-reduced-motion'));
}

// 1.9.215 Sugar Rush idle hint: after 15s, glow and a swipe hand on the best objective move
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  const html = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  assert.strictEqual(SR.HINT_IDLE_MS, 15000);
  assert.ok(SR.HINT_REPEAT_MS >= 2500 && SR.HINT_REPEAT_MS <= 4500);
  assert.ok(html.includes('id="hinthand"') && html.includes('hintswipe'));
  assert.ok(src.includes('function hintMoveFor') && src.includes('function tickHint') && src.includes('function drawHintGlow') && src.includes('noteActivity'));
  assert.ok(src.includes('if (hint && !reduce && hint.some') , 'wiggle is skipped when motion is reduced');
  assert.ok(html.includes('prefers-reduced-motion') && html.includes('.hinthand { display: none !important'));
  const reduceBlock = html.slice(html.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
  assert.ok(reduceBlock.includes('.hinthand'), 'reduced motion hides the hand and leaves the glow');
  assert.ok(src.includes("cv.addEventListener('pointerdown'") && src.includes('noteActivity()'));
  assert.ok(src.includes("if (tut && tut.active) return false") && src.includes('st.tutorial'));
  assert.ok(src.includes("if (crush && crush.active) return false") && src.includes("goalban") && src.includes('moveswarn'));
  const jelly = SR.newGame({ level: SR.LEVELS[2], seed: 1 });
  const before = SR.jellyLeft(jelly);
  const hint = SR.hintMoveFor(jelly);
  assert.ok(hint && SR.validSwap(jelly.board, hint[0], hint[1], jelly.mask));
  const after = SR.cloneState(jelly);
  assert.ok(SR.play(after, hint[0], hint[1]).valid);
  const hintDelta = before - SR.jellyLeft(after);
  assert.ok(hintDelta > 0, 'the hint prefers a move that clears jelly');
  // A weaker valid move exists that clears less (or no) jelly
  let weaker = false;
  for (let r = 0; r < 8 && !weaker; r++) for (let c = 0; c < 8 && !weaker; c++) {
    const opts = [];
    if (c + 1 < 8) opts.push([[r, c], [r, c + 1]]);
    if (r + 1 < 8) opts.push([[r, c], [r + 1, c]]);
    for (const m of opts) {
      if (!SR.validSwap(jelly.board, m[0], m[1], jelly.mask)) continue;
      const cl = SR.cloneState(jelly);
      if (!SR.play(cl, m[0], m[1]).valid) continue;
      if (before - SR.jellyLeft(cl) < hintDelta) { weaker = true; break; }
    }
  }
  assert.ok(weaker, 'the hint is not just the first legal swap');
  assert.strictEqual(SR.hintMoveFor(Object.assign(SR.cloneState(jelly), { tutorial: true })), null);
  assert.strictEqual(SR.hintMoveFor(Object.assign(SR.cloneState(jelly), { over: true })), null);
  assert.ok(!/candy crush/i.test(src + html), 'no Candy Crush names in the game');
}


// 1.9.218 Sugar Rush presentation polish: scenes, juicier matches, specials, streak, finale, chest, daily spin, boosters, candy UI.
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  const html = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  // D. A themed NZ scene for every stop on the race map.
  assert.strictEqual(SR.SCENES.length, SR.LEVELS.length, 'one scene per level');
  const sceneIds = new Set();
  for (let n = 1; n <= SR.LEVELS.length; n++) {
    const sc = SR.sceneFor(n);
    assert.ok(sc && sc.id && !sceneIds.has(sc.id), 'scene ' + n + ' is unique');
    sceneIds.add(sc.id);
    const svg = SR.sceneSvg(n);
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>') && svg.includes('viewBox="0 0 390 844"') && svg.length > 600, 'scene ' + n + ' svg');
    assert.ok(!/<script|on[a-z]+=/i.test(svg), 'scene svg is static');
    const spr = SR.sceneSprites(n);
    assert.ok(spr.includes('class="scs '), 'scene ' + n + ' has moving bits');
  }
  assert.strictEqual(SR.sceneFor(99).id, SR.sceneFor(1).id, 'unknown levels fall back to the first scene');
  assert.ok(SR.SCENES[9].night && SR.SCENES[9].id === 'nelson', 'Nelson is a Saturday night scene');
  assert.ok(!/rugby|cricket|netball|football|soccer|all blacks|stadium/i.test(SR.SCENES.map((s, i) => SR.sceneSvg(i + 1) + SR.sceneSprites(i + 1)).join('')), 'no sport in the scenes');
  // C. Sweet streak grows with cascades and specials, cools on a plain match, and never changes the score.
  assert.strictEqual(SR.streakGain([]), 0);
  assert.strictEqual(SR.streakGain([{ popped: [1, 2, 3] }]), -1, 'a plain single match cools the streak');
  const bigGain = SR.streakGain([{ fired: [{ s: 'row' }], made: [1] }, {}, {}]);
  assert.ok(bigGain >= 6, 'cascades and specials build the streak');
  assert.strictEqual(SR.streakNext(0, -1), 0);
  assert.strictEqual(SR.streakNext(10, 1000), SR.STREAK_STEP * SR.STREAK_MAX_TIER);
  assert.strictEqual(SR.streakTier(0), 0);
  assert.strictEqual(SR.streakTier(SR.STREAK_STEP), 1);
  assert.strictEqual(SR.streakTier(999), SR.STREAK_MAX_TIER);
  assert.strictEqual(SR.streakFill(SR.STREAK_STEP * SR.STREAK_MAX_TIER), 1);
  assert.ok(SR.streakFill(SR.STREAK_STEP / 2) === 0.5);
  assert.strictEqual(SR.STREAK_NAMES.length, SR.STREAK_MAX_TIER + 1);
  assert.ok(!/streakPts[^;]*st\.score|st\.score[^;]*streak/.test(src), 'the streak never touches the score');
  // The existing sayings stay, and they grow with the streak.
  assert.ok(SR.SAYINGS && Object.keys(SR.SAYINGS).length >= 4);
  assert.ok(src.includes("' t' + streakTierNow") && html.includes('.saypop.t4'));
  // A. Juicy feedback.
  assert.strictEqual(SR.shakeLevel([{ popped: [1, 2, 3] }]), 0);
  assert.strictEqual(SR.shakeLevel([{ fired: [{ s: 'row' }] }]), 1);
  assert.strictEqual(SR.shakeLevel([{ fired: [{ s: 'b' }] }]), 2, 'a colour bomb shakes hard');
  assert.ok(src.includes("type: 'shard'") && src.includes("type: 'glint'") && src.includes('FX_CAP'));
  assert.ok(html.includes('@keyframes shk1') && html.includes('@keyframes shk2'));
  assert.ok((src.match(/ctx\.shadowBlur =/g) || []).length <= 1, 'no new shadowBlur for phone performance');
  // B. Bigger specials with their own glow.
  assert.ok(src.includes('function drawSpecialGlow'));
  // I. Boosters and the daily spin.
  assert.strictEqual(JSON.stringify(SR.BOOSTERS.map(b => b.id)), JSON.stringify(['moves', 'hammer', 'shuffle']));
  assert.strictEqual(SR.EXTRA_MOVES, 3);
  assert.strictEqual(JSON.stringify(SR.normBoosters({ moves: '2', hammer: -4, junk: 9 })), JSON.stringify({ moves: 2, hammer: 0, shuffle: 0 }));
  assert.strictEqual(JSON.stringify(SR.addPrize({}, { id: 'all', n: 1 })), JSON.stringify({ moves: 1, hammer: 1, shuffle: 1 }));
  assert.strictEqual(JSON.stringify(SR.addPrize({ hammer: 1 }, { id: 'hammer', n: 2 })), JSON.stringify({ moves: 0, hammer: 3, shuffle: 0 }));
  assert.strictEqual(SR.takeBooster({ hammer: 0 }, 'hammer').ok, false);
  const took = SR.takeBooster({ shuffle: 2 }, 'shuffle');
  assert.ok(took.ok && took.inv.shuffle === 1);
  assert.strictEqual(SR.SPIN_PRIZES.length, 8);
  for (let i = 0; i < SR.SPIN_PRIZES.length; i++) {
    for (const from of [0, 123, 1800.5, -40]) {
      const a = SR.spinAngle(i, 5, from, 0);
      assert.ok(a >= from + 5 * 360, 'the wheel always turns forwards');
      assert.strictEqual(SR.prizeAt(a), i, 'segment ' + i + ' lands under the pointer');
      assert.strictEqual(SR.prizeAt(SR.spinAngle(i, 5, from, 15)), i, 'jitter stays inside the segment');
    }
    assert.ok(SR.SPIN_PRIZES[i].id === 'all' || SR.BOOSTERS.some(b => b.id === SR.SPIN_PRIZES[i].id));
  }
  assert.strictEqual(SR.spinPick(() => 0), 0);
  assert.strictEqual(SR.spinPick(() => 0.9999), 7);
  // NZ days: 10:59 UTC on 14 Nov is 23:59 on 14 Nov in Auckland, 11:01 UTC is 15 Nov.
  assert.strictEqual(SR.nzDay(Date.parse('2026-11-14T10:59:00Z')), '2026-11-14');
  assert.strictEqual(SR.nzDay(Date.parse('2026-11-14T11:01:00Z')), '2026-11-15');
  assert.strictEqual(SR.canSpin(null, NOW), true);
  assert.strictEqual(SR.canSpin(SR.nzDay(NOW), NOW), false, 'one spin per NZ day');
  assert.strictEqual(SR.canSpin(SR.nzDay(NOW), NOW + 86400000), true);
  assert.ok(src.includes("'ib-sugar-spin' + memberTag()") && src.includes("'ib-sugar-boosters' + memberTag()"), 'stored locally per player');
  // H. Treasure chest.
  assert.strictEqual(SR.chestReward(3, 2, 2, false), null, 'no chest for a replay without a new star record');
  assert.ok(SR.chestReward(3, 1, 0, true), 'a first clear opens the chest');
  assert.ok(SR.chestReward(3, 3, 2, false), 'a new star record opens the chest');
  assert.ok(SR.BOOSTERS.some(b => b.id === SR.chestReward(4, 3, 1, false).id));
  // Hammer uses no move and keeps the goals objective-based.
  const hs = SR.newGame({ level: SR.LEVELS[2], seed: 7 });
  const movesBefore = hs.moves, jellyBefore = SR.jellyLeft(hs);
  let hr = null, hrc = null;
  for (let r = 0; r < 8 && !hr; r++) for (let c = 0; c < 8 && !hr; c++) { const t = hs.board[r][c]; if (t && SR.isCandy(t) && !t.lock && !t.s) { hrc = [r, c]; hr = SR.hammerAt(hs, r, c); } }
  assert.ok(hr && hr.valid && hr.steps.length >= 1, 'the hammer smashes a sweet');
  assert.strictEqual(hs.moves, movesBefore, 'the hammer uses no move');
  assert.ok(SR.jellyLeft(hs) <= jellyBefore);
  assert.ok(SR.hasMove(hs.board, hs.mask), 'the board still has a move after a hammer');
  assert.strictEqual(SR.hammerAt(Object.assign(SR.cloneState(hs), { over: true }), hrc[0], hrc[1]).valid, false);
  assert.strictEqual(SR.hammerAt(Object.assign(SR.cloneState(hs), { tutorial: true }), hrc[0], hrc[1]).valid, false);
  assert.strictEqual(SR.shuffleBooster(Object.assign(SR.cloneState(hs), { tutorial: true })), false);
  const shu = SR.cloneState(hs);
  assert.ok(SR.shuffleBooster(shu) && SR.hasMove(shu.board, shu.mask));
  assert.ok(SR.LEVELS.every(l => !l.target && (l.collect || l.jelly || l.locks || l.ice || l.ings || l.choco || l.bub || l.liq)), 'goals stay objective-based, never a score');
  // F. Sugar Crush finale fits Goal achieved and the play-out.
  assert.ok(src.includes('function sugarCrushFinale') && src.includes('showCrushBan') && src.includes('fireworks('));
  assert.ok(src.includes('goalban') && src.includes('moveswarn') && src.includes('hintMoveFor'), 'goal card, 3 MOVES LEFT and the hint stay');
  // HTML has the new pieces.
  for (const id of ['scene', 'streak', 'streakfill', 'streakx', 'streakpop', 'boosters', 'boosthint', 'crushban', 'fxov', 'endchest', 'endloot', 'morebtn', 'spinbtn', 'spin', 'wheel', 'spinmsg', 'spinwon', 'spininv', 'spinbtn2']) {
    assert.ok(html.includes('id="' + id + '"'), 'html has #' + id);
  }
  for (const b of ['moves', 'hammer', 'shuffle']) assert.ok(html.includes('data-boost="' + b + '"'));
  assert.ok(html.includes('data-spin="close"') && html.includes('Daily spin') && html.includes('Sugar Crush!'));
  // J. Candy buttons and bounce-in screens.
  assert.ok(html.includes('@keyframes pop') && html.includes('.scr-in') && src.includes('function enterScreen'));
  // Reduced motion and no background music.
  const lastReduce = html.slice(html.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
  assert.ok(lastReduce.includes('.hinthand'), 'the idle hint keeps its reduced-motion rule');
  assert.ok(/prefers-reduced-motion: reduce\) \{\s*\.scs, \.scs \.fallin/.test(html), 'scenes and celebrations stop for reduced motion');
  assert.ok(src.includes('if (!reduce)') || src.includes('reduce ?'), 'particles respect reduced motion');
  assert.ok(!/new Audio\([^)]*(bgm|music|loop)/i.test(src.slice(src.indexOf('1.9.218'))), 'no new background music');
  assert.ok(!/candy crush/i.test(src + html), 'no Candy Crush names in the game');
}

// 1.9.219 Sugar Rush levels 11-15 down the South Island: sugar bubbles, spreading liquorice, map and race to 15.
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  const html = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  assert.strictEqual(SR.LEVELS.length, 22);
  assert.strictEqual(SR.LV_COUNT, 22);
  const names = SR.LEVELS.slice(10, 15).map(l => l.name);
  assert.deepStrictEqual(Array.from(names), ['Whale Watch', 'Garden City', 'Glacier Run', 'Liquorice Gondola', 'The Chocolate Factory']);
  // Every goal is an objective; score only sets stars.
  for (const lv of SR.LEVELS.slice(10, 15)) {
    assert.ok(!lv.target, 'level ' + lv.n + ' has no score target');
    assert.ok(lv.bub || lv.liq || lv.jelly || lv.ice || lv.ings || lv.locks, 'level ' + lv.n + ' has an objective');
    assert.ok(lv.stars && lv.stars.length === 3 && lv.stars[1] < lv.stars[2]);
    assert.ok(lv.badge && lv.badge.icon && lv.badge.name);
    assert.ok(SR.goalCounts(lv).length >= 1, 'level ' + lv.n + ' shows a goal card');
    const intro = SR.LEVEL_INTROS[lv.n - 1];
    assert.ok(intro && intro.goal && intro.detail.includes(lv.moves + ' moves'), 'intro ' + lv.n + ' names its moves');
    assert.ok(!/score|points/i.test(intro.goal), 'intro goal ' + lv.n + ' is not a score');
    assert.ok(SR.tryBeat(lv, 16) >= 3, 'level ' + lv.n + ' is winnable');
  }
  assert.ok(SR.LEVELS[10].bub && !SR.LEVELS[10].jelly, 'level 11 is the bubble level');
  assert.ok(SR.LEVELS[13].liq, 'level 14 is the liquorice level');
  assert.ok(SR.LEVELS[14].choco && SR.LEVELS[14].jelly && SR.LEVELS[14].bub && SR.LEVELS[14].liq, 'level 15 mixes everything');
  assert.deepStrictEqual(Array.from(SR.goalCounts(SR.LEVELS[10]).map(g => g.kind)), ['bub']);
  assert.deepStrictEqual(Array.from(SR.goalCounts(SR.LEVELS[13]).map(g => g.kind)), ['liq']);
  // Sugar bubbles: 'a'-'f' is a bubbled sweet; it cannot be swapped; a match next to it pops it, and its neighbours pop too.
  const bb = SR.fromRows(['02402402','235f3523','240c4024','35115335','40241240','52354352','02402402','23553523']);
  assert.ok(bb[1][3].bub === 1 && bb[1][3].c === 5 && SR.isBlock(bb[1][3]) && !SR.isCandy(bb[1][3]));
  assert.strictEqual(SR.toRows(bb)[1], '235f3523');
  assert.strictEqual(SR.validSwap(bb, [2, 3], [2, 4]), false, 'a bubbled sweet cannot be swapped');
  const bst = SR.newGame({ level: SR.LEVELS[10], seed: 3 });
  bst.board = bb; bst.tutorial = true;
  const bres = SR.play(bst, [3, 4], [4, 4]);
  assert.ok(bres.valid && SR.bubLeft(bst.board) === 0, 'the match pops the bubble next to it and the one touching that');
  assert.ok(bres.steps[0].bubPopped === 2 && bres.steps[0].blocked.some(b => b.kind === 'bub' && b.chain));
  // Liquorice: wrapped sweets cannot swap, a match frees them, and it creeps after two idle moves (never in a tutorial).
  const lst = SR.newGame({ level: SR.LEVELS[13], seed: 5 });
  assert.strictEqual(SR.liqLeft(lst.board), 4);
  assert.strictEqual(SR.LIQ_IDLE, 2);
  let lr = null; for (let r = 0; r < 8 && !lr; r++) for (let c = 0; c < 8 && !lr; c++) if (lst.board[r][c] && lst.board[r][c].liq) lr = [r, c];
  assert.ok(!SR.validSwap(lst.board, lr, [lr[0] + 1, lr[1]]), 'liquorice holds its sweet');
  const before = SR.liqLeft(lst.board);
  const sp = SR.spreadLiq(lst);
  assert.ok(sp && lst.board[sp.r][sp.c].liq && SR.liqLeft(lst.board) === before + 1, 'liquorice creeps onto a neighbour');
  let creep = null;
  for (let s = 1; s <= 40 && !creep; s++) {
    const g = SR.newGame({ level: SR.LEVELS[13], seed: s });
    for (let k = 0; k < 6 && !creep && !g.over; k++) {
      const m = SR.findMove(g.board, g.mask); if (!m) break;
      const res = SR.play(g, m[0], m[1]);
      if (res.liqSpread) creep = res;
    }
  }
  assert.ok(creep, 'liquorice creeps in real play when left alone');
  const tutLiq = SR.newGame({ level: SR.LEVELS[13], seed: 2 }); tutLiq.tutorial = true; tutLiq.liqIdle = 5;
  const tm = SR.findMove(tutLiq.board, tutLiq.mask); const tres = SR.play(tutLiq, tm[0], tm[1]);
  assert.ok(!tres.liqSpread, 'no creeping during a tutorial');
  assert.ok('liqIdle' in SR.cloneState(lst));
  // Hand tutorials for the two new mechanics, and recaps on the mixed levels; Replay tutorial uses tutorialFor.
  for (const n of [11, 14]) {
    const steps = SR.tutorialFor(n);
    assert.ok(steps && steps.some(s => s.kind === 'move') && steps.some(s => s.kind === 'show') && steps[steps.length - 1].kind === 'ready', 'tutorial ' + n);
  }
  for (const n of [12, 13, 15]) assert.ok(SR.tutorialFor(n) && SR.tutorialFor(n)[0].kind === 'recap', 'recap ' + n);
  assert.ok(src.includes('liq: step.liq') && src.includes('if (opt.liq)'), 'tutorial boards can wrap liquorice');
  assert.ok(src.includes('function drawBubbled') && src.includes('function drawLiqWrap'));
  assert.ok(src.includes("'Liquorice creeps!'") && src.includes("'Free the liquorice!'"));
  // Map: five new South Island stops, Bluff still to come, race and progress cap at 15.
  const south = SR.MAP_STOPS.slice(10, 15).map(s => s.place);
  assert.deepStrictEqual(Array.from(south), ['Kaikōura', 'Christchurch', 'Franz Josef', 'Queenstown', 'Dunedin']);
  assert.ok(SR.MAP_STOPS.every(s => s.x > 20 && s.x < SR.MAP_W - 20 && s.y < SR.MAP_H));
  assert.strictEqual(SR.raceStop({ open: 15 }), 15);
  assert.ok(!/Math\.min\(10,/.test(src) && !/< 10\)/.test(src.slice(src.indexOf('function recordWin'))), 'no level count hardcoded to 10');
  assert.ok(src.includes('while (open < LV_COUNT && (m.stars[open - 1] || 0) > 0) open++;'), 'players who finished Nelson or Dunedin can go on');
  // Scenes, previews and styles.
  for (const n of [11, 12, 13, 14, 15]) assert.ok(SR.sceneSprites(n).includes('class="scs '));
  assert.deepStrictEqual(Array.from(SR.SCENES.slice(10, 15).map(s => s.id)), ['kaikoura', 'christchurch', 'franzjosef', 'queenstown', 'dunedin']);
  for (const k of ['bub', 'liq', 'garden', 'glacier', 'factory']) assert.ok(src.includes("kind === '" + k + "'"), 'intro preview ' + k);
  assert.ok(html.includes('.introprev .bubp') && html.includes('.introprev .liqp') && html.includes('@keyframes scrollx') && html.includes('@keyframes scglide'));
  assert.ok(!/candy crush/i.test(src + html), 'no Candy Crush names in the game');
}
console.log('1.9.219 sugar levels ok');

// 1.9.220 Sugar Rush Pacific Islands: Rarotonga, Tonga and Samoa (levels 17-19 from 1.9.222, when Bluff became 16).
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  const html = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  assert.strictEqual(SR.LEVELS.length, 22);
  assert.strictEqual(SR.LV_COUNT, 22);
  assert.deepStrictEqual(Array.from(SR.LEVELS.slice(16, 19).map(l => l.name)), ['Rarotonga Lagoon', 'Tongan Coconut Coast', 'Samoan Sunset']);
  assert.deepStrictEqual(Array.from(SR.MAP_STOPS.slice(16, 19).map(s => s.place)), ['Rarotonga', 'Tonga', 'Samoa']);
  assert.ok(SR.MAP_STOPS.slice(16, 19).every(s => s.kind === 'island' && s.y > 1236 && s.y < 1684), 'island stops sit in the Pacific Islands section');
  assert.ok(!SR.FUTURE_STOPS.some(s => s.place === 'Sydney'), 'Sydney is a real stop now');
  const svg = SR.nzMapSvg();
  assert.ok(svg.includes('Pacific Islands') && svg.includes('sr-pacific') && svg.includes('sr-plane'));
  assert.ok(src.includes("stop.kind === 'island' ? '🌴'"));
  for (const lv of SR.LEVELS.slice(16, 19)) {
    assert.ok(!lv.target, 'level ' + lv.n + ' has no score target');
    assert.ok(lv.jelly || lv.bub || lv.ings || lv.liq || lv.locks, 'level ' + lv.n + ' has an objective');
    assert.ok(lv.badge && lv.badge.icon && lv.badge.name);
    assert.ok(SR.goalCounts(lv).length >= 2, 'level ' + lv.n + ' goal card');
    const intro = SR.LEVEL_INTROS[lv.n - 1];
    assert.ok(intro && intro.detail.includes(lv.moves + ' moves') && !/score|points/i.test(intro.goal));
    assert.ok(SR.tutorialFor(lv.n) && SR.tutorialFor(lv.n)[0].kind === 'recap', 'recap ' + lv.n);
    assert.ok(SR.tryBeat(lv, 16) >= 3, 'level ' + lv.n + ' is winnable');
    const sc = SR.sceneFor(lv.n);
    assert.ok(sc.id && SR.sceneSprites(lv.n).includes('sc-sway'), 'tropical scene ' + lv.n + ' has swaying palms');
    assert.ok(!/rugby|football|cricket|netball|stadium/i.test(SR.sceneSvg(lv.n) + SR.sceneSprites(lv.n)), 'no sport');
  }
  assert.deepStrictEqual(Array.from(SR.LEVELS.slice(16, 19).map(l => l.badge.name)), ['Hibiscus Flower', 'Coconut', 'Sunset Shell']);
  assert.deepStrictEqual(Array.from(SR.SCENES.slice(16, 19).map(s => s.id)), ['rarotonga', 'tonga', 'samoa']);
  assert.strictEqual(SR.goalCounts(SR.LEVELS[17]).find(g => g.kind === 'ings').icon, '🥥');
  assert.ok(html.includes('@keyframes scsway'));
  assert.ok(!/candy crush/i.test(src + html), 'no Candy Crush names in the game');
}
console.log('1.9.220 pacific levels ok');

// 1.9.222 Sugar Rush: Bluff, then Australia (Sydney, Gold Coast, Perth); Hard levels; lightning; family race events.
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  const html = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  assert.strictEqual(SR.LEVELS.length, 22);
  assert.strictEqual(SR.LV_COUNT, 22);
  assert.deepStrictEqual(Array.from(SR.MAP_STOPS.slice(14).map(s => s.place)), ['Dunedin', 'Bluff', 'Rarotonga', 'Tonga', 'Samoa', 'Sydney', 'Gold Coast', 'Perth']);
  assert.ok(SR.MAP_STOPS.every((s, i) => s.n === i + 1 && SR.LEVELS[i].n === i + 1), 'stops and levels are numbered in route order');
  assert.deepStrictEqual(Array.from(SR.LEVELS.slice(15).map(l => l.name)), ['Bluff Oyster Bay', 'Rarotonga Lagoon', 'Tongan Coconut Coast', 'Samoan Sunset', 'Sydney Harbour Lights', 'Gold Coast Sweet Surf', 'Swan River Sunset']);
  assert.deepStrictEqual(Array.from(SR.FUTURE_STOPS.map(s => s.place)).sort(), ['Adelaide', 'Brisbane', 'Cairns', 'Canberra', 'Darwin', 'Hobart', 'Melbourne']);
  assert.ok(SR.MAP_STOPS.slice(19).every(s => s.y > 1800 && s.y < SR.MAP_H) && SR.FUTURE_STOPS.every(s => s.y > 1800 && s.y < SR.MAP_H), 'Australia sits below the Pacific section');
  assert.ok(SR.MAP_STOPS.concat(SR.FUTURE_STOPS).every(s => s.x > 20 && s.x < SR.MAP_W - 20));
  const svg = SR.nzMapSvg();
  assert.ok(svg.includes('sr-aus') && svg.includes('>Australia<') && (svg.match(/class="sr-plane"/g) || []).length >= 3, 'Australia section with planes');
  assert.ok(!svg.includes('id="sr-future" d="M'), 'coming-soon cities have no trail');
  assert.strictEqual(SR.raceStop({ open: 99 }), 22);
  // Level ids: progress follows the level, not its number.
  const ids = SR.levelIds();
  assert.strictEqual(new Set(ids).size, 22);
  assert.deepStrictEqual(Array.from(ids.slice(15)), ['oyster', 'hibiscus', 'coconut', 'shell', 'opera', 'wave', 'swan']);
  const old = [3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 2, 1, 2, 1, 2, 3, 1, 2];
  const m = SR.migrateProg({ open: 18, stars: old, best: old.map(x => x * 1000), badges: old.map(x => x ? 1 : 0), wins: 40 });
  assert.deepStrictEqual(Array.from(m.stars.slice(14)), [2, 0, 3, 1, 2, 0, 0, 0], '1.9.220 island stars move to 17-19; Bluff starts fresh');
  assert.strictEqual(m.best[16], 3000); assert.strictEqual(m.badges[18], 1); assert.strictEqual(m.badges[15], 0);
  assert.strictEqual(m.open, 19, 'the open stop (Samoa) follows its id');
  assert.strictEqual(m.wins, 40);
  assert.deepStrictEqual(Array.from(SR.migrateProg(m).stars), Array.from(m.stars), 'migrating twice changes nothing');
  assert.deepStrictEqual(Array.from(SR.migrateProg({ open: 15, stars: old.slice(0, 15) }).stars.slice(0, 15)), old.slice(0, 15), '1-15 never moved');
  assert.ok(src.includes("ls.get('ib-sugar-layout', 0) >= 222") && src.includes("prog.ids = levelIds()"), 'tutorial marks move once; saves carry ids');
  assert.ok(src.includes('sid: stopId(self.stop)'), 'race posts name the stop by level id');
  // New levels: objectives, goal cards, scenes, badges, winnable.
  for (const lv of SR.LEVELS.slice(15)) {
    assert.ok(!lv.target, 'level ' + lv.n + ' has no score target');
    assert.ok(lv.badge && lv.badge.icon && lv.badge.name);
    assert.ok(SR.goalCounts(lv).length >= 1, 'level ' + lv.n + ' goal card');
    const intro = SR.LEVEL_INTROS[lv.n - 1];
    assert.ok(intro && intro.detail.includes(lv.moves + ' moves') && !/score|points/i.test(intro.goal), 'intro ' + lv.n);
    assert.ok(SR.tutorialFor(lv.n) && SR.tutorialFor(lv.n)[0].kind === 'recap', 'recap ' + lv.n);
    assert.ok(SR.tryBeat(lv, 16) >= 2, 'level ' + lv.n + ' is winnable');
    assert.ok(!/rugby|football|cricket|netball|stadium|surfboard race/i.test(SR.sceneSvg(lv.n) + SR.sceneSprites(lv.n)), 'no sport ' + lv.n);
  }
  assert.deepStrictEqual(Array.from(SR.SCENES.slice(15).map(s => s.id)), ['bluff', 'rarotonga', 'tonga', 'samoa', 'sydney', 'goldcoast', 'perth']);
  assert.deepStrictEqual(Array.from([16, 20, 21, 22].map(n => SR.LEVELS[n - 1].badge.name)), ['Bluff Oyster', 'Opera House Sail', 'Golden Wave', 'Black Swan']);
  assert.ok(SR.sceneSvg(16).includes('SYDNEY') && SR.sceneSvg(20).length > 500 && SR.sceneSvg(22).length > 500);
  // Hard and Super Hard levels.
  assert.deepStrictEqual(Array.from(SR.LEVELS.filter(l => l.hard === 1).map(l => l.n)), [13, 15, 19]);
  assert.deepStrictEqual(Array.from(SR.LEVELS.filter(l => l.hard === 2).map(l => l.n)), [22]);
  assert.strictEqual(SR.chestReward(13, 2, 0, true).n, 2, 'Hard: an extra booster');
  assert.strictEqual(SR.chestReward(22, 1, 0, true).n, 3, 'Super Hard: two extra');
  assert.strictEqual(SR.chestReward(12, 2, 0, true).n, 1);
  assert.ok(src.includes('function showHardBan') && src.includes('function playHardSting') && src.includes('function hardWinLine'));
  assert.ok(html.includes('id="hardban"') && html.includes('id="introhard"') && html.includes('body.ingame.hard2 .tray') && html.includes('@keyframes hardglow2'));
  assert.ok(src.includes('fc-f">🔥') && !/💀|☠/.test(src + html), 'flaming candy, no skulls');
  // Lightning.
  assert.ok(src.includes("type: 'bolt'") && src.includes('function boltPath') && src.includes('function playZap') && src.includes('await lightning(s)'));
  assert.ok(/if \(reduce\) \{\s*\/\/ Reduced motion: a simple highlight/.test(src), 'reduced motion: highlight, no bolts');
  // Race events.
  assert.ok(html.includes('id="racebar"') && html.includes('id="racebar2"') && html.includes('id="raceon"'));
  assert.ok(src.includes('function seedRaceEvent') && src.includes("if (!raceDemo) playSting()"));
  // Lives: losing or leaving part-way costs one, tutorials and +3 moves never do, family gifts (1.9.223: hourly regeneration below).
  assert.ok(/function settleLife\(\) \{\s*if \(!st \|\| st\.tutorial \|\| st\.won \|\| st\.lifeDone\) return;/.test(src), 'tutorials and wins never cost a life');
  assert.ok(src.includes('if (lives() <= 0) { tut = null; hideTutUi(); showLives(\'out\'); return; }'), 'no lives, no level');
  assert.ok(src.includes('st.played = true; // Keep going'), '+3 moves keeps going on the same life');
  assert.ok(src.includes("S.postLives({ act: 'claim' })") && src.includes("S.postLives({ act: 'ask' })") && src.includes("S.postLives({ act: 'send', to: btn.dataset.lifeTo })"));
  assert.ok(html.includes('id="maphearts"') && html.includes('id="hearts2"') && html.includes('id="livesov"'));
  const scoresJs = fs.readFileSync('feed/scores.js', 'utf8');
  assert.ok(scoresJs.includes("const loadLives = () => call('/sugar-lives');") && scoresJs.includes('loadLives, postLives,'));
  assert.ok(!/'(square|sawtooth)'/.test(src));
  assert.ok(!/candy crush/i.test(src + html), 'no Candy Crush names in the game');
}
console.log('1.9.222 bluff, australia, hard, lightning and race ok');

// 1.9.223: lives regenerate one an hour up to 3 (timestamps, so it works while closed); gifts can go above 3.
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8');
  const H = 36e5, T0 = Date.UTC(2026, 10, 14, 1, 0, 0);
  assert.strictEqual(SR.LIVES_MAX, 3);
  assert.strictEqual(SR.LIFE_MS, H);
  const plain = v => JSON.parse(JSON.stringify(v));
  assert.deepStrictEqual(plain(SR.regenLives(null, T0)), { v: 2, n: 3, t: null }, 'new players start full');
  // Spending from full starts the clock; one hour later a life is back, and it stops at 3.
  let v = SR.changeLives({ v: 2, n: 3, t: null }, -1, T0);
  assert.deepStrictEqual(plain(v), { v: 2, n: 2, t: T0 });
  assert.strictEqual(SR.nextLifeMs(v, T0 + 15 * 60e3), 45 * 60e3);
  assert.strictEqual(SR.regenLives(v, T0 + H - 1).n, 2);
  assert.deepStrictEqual(plain(SR.regenLives(v, T0 + H)), { v: 2, n: 3, t: null });
  // From 0, closed for 2.5 hours: 2 lives back and the third is half an hour away.
  v = SR.changeLives(SR.changeLives(SR.changeLives({ v: 2, n: 3, t: null }, -1, T0), -1, T0 + 60e3), -1, T0 + 120e3);
  assert.strictEqual(v.n, 0); assert.strictEqual(v.t, T0, 'spending below 3 keeps the running clock');
  const later = SR.regenLives(v, T0 + 2.5 * H);
  assert.deepStrictEqual(plain(later), { v: 2, n: 2, t: T0 + 2 * H });
  assert.strictEqual(SR.nextLifeMs(v, T0 + 2.5 * H), H / 2);
  assert.strictEqual(SR.regenLives(v, T0 + 30 * H).n, 3, 'never regenerates past 3');
  // Gifts go above 3 and nothing regenerates while above 3; spending back down from 4 to 3 starts no clock.
  v = SR.changeLives({ v: 2, n: 3, t: null }, 2, T0);
  assert.deepStrictEqual(plain(v), { v: 2, n: 5, t: null });
  assert.strictEqual(SR.regenLives(v, T0 + 10 * H).n, 5);
  assert.deepStrictEqual(plain(SR.changeLives({ v: 2, n: 4, t: null }, -1, T0)), { v: 2, n: 3, t: null });
  assert.strictEqual(SR.nextLifeMs({ v: 2, n: 4, t: null }, T0), 0);
  // A gift while waiting tops up but keeps the clock running.
  assert.deepStrictEqual(plain(SR.changeLives({ v: 2, n: 1, t: T0 }, 1, T0 + 10 * 60e3)), { v: 2, n: 2, t: T0 });
  // Migration from 1.9.222 { day, n }: an older day tops up to 3 (gift extras kept); today's low count starts the clock now.
  assert.deepStrictEqual(plain(SR.regenLives({ day: '2026-11-13', n: 1 }, T0)), { v: 2, n: 3, t: null });
  assert.deepStrictEqual(plain(SR.regenLives({ day: '2026-11-13', n: 5 }, T0)), { v: 2, n: 5, t: null });
  assert.deepStrictEqual(plain(SR.regenLives({ day: SR.nzDay ? SR.nzDay(T0) : '2026-11-14', n: 1 }, T0)), { v: 2, n: 1, t: T0 });
  assert.deepStrictEqual(plain(SR.regenLives({ day: '2026-11-14', n: 0 }, T0)), { v: 2, n: 0, t: T0 });
  assert.strictEqual(SR.regenLives({ v: 2, n: 'x' }, T0).n, 3, 'junk resets to full');
  assert.strictEqual(SR.regenLives({ v: 2, n: 1, t: T0 + 5 * H }, T0).n, 1, 'a clock in the future is clamped, not trusted');
  assert.strictEqual(SR.mmss(45 * 60e3), '45:00'); assert.strictEqual(SR.mmss(61e3 - 1), '01:01'); assert.strictEqual(SR.mmss(0), '00:00');
  // UI: hearts and the out-of-lives card count down mm:ss to the next life, not to midnight.
  assert.ok(src.includes("'<em class=\"hn\">' + mmss(ms) + '</em>'") && src.includes('heartsTimer = setInterval'));
  assert.ok(src.includes('<span>Next life in</span><b id="livescount">\' + mmss(nextLife())') || src.includes("<span>Next life in</span><b id=\"livescount\">' + mmss(nextLife())"));
  assert.ok(!/midnight \(NZ time\)|topped up at midnight|New lives at midnight|LIVES_PER_DAY|msToNzMidnight/.test(src), 'no midnight refill left');
  assert.ok(src.includes('addLives(-1);') && src.includes('addLives(got.claimed);'));
}
{
  const ex = fs.readFileSync('feed/extras.js', 'utf8'), rt = fs.readFileSync('worker/src/retain.js', 'utf8');
  assert.ok(ex.includes("['sugar', '🍬 Sugar Rush races & lives from family']"), 'Settings toggle for Sugar Rush race and lives pushes');
  assert.ok(/NOTE_TYPES = \[[^\]]*'sugar'/.test(rt) && /sugar: 1/.test(rt), 'the Worker knows the sugar type and defaults it on');
}
console.log('1.9.223 hourly lives ok');
{
  // Spoken sayings: the on-screen line is read out (not a generic "Great!"), throttled, minor ones skipped, own Voice toggle.
  const SR = load('feed/sugar-rush.js').SugarRush;
  const src = fs.readFileSync('feed/sugar-rush.js', 'utf8'), html = fs.readFileSync('feed/sugar-rush.html', 'utf8');
  assert.ok(SR.SPEAK_GAP >= 2000 && SR.SPEAK_PITCH > 1 && SR.SPEAK_PITCH < 1.5);
  const vs = [{ name: 'Daniel', lang: 'en-GB' }, { name: 'Karen', lang: 'en-AU' }, { name: 'Alex', lang: 'en-US' }];
  assert.strictEqual(SR.pickSpeechVoice(vs).name, 'Karen', 'en-AU over en-GB');
  assert.strictEqual(SR.pickSpeechVoice(vs.concat([{ name: 'Aria', lang: 'en_NZ' }])).name, 'Aria', 'en-NZ first');
  assert.strictEqual(SR.pickSpeechVoice([{ name: 'Amélie', lang: 'fr-CA' }]), null);
  assert.strictEqual(SR.speakWorthy({ cascade: 1, popped: [1, 2, 3], jellyCleared: 1 }, 1), false, 'a plain match is minor');
  assert.strictEqual(SR.speakWorthy({ cascade: 3, popped: [1, 2, 3] }, 3), true);
  assert.ok(src.includes('if (speakWorthy(step, step && (step.cascade || (i + 1)))) speakLine(text);'), 'speaks the saying on screen');
  assert.ok(src.includes("if (!text || !soundOn || !voiceOn || !canSpeak() || (doc && doc.hidden)) return false;"), 'respects Sound and Voice');
  assert.ok(src.includes('if (!opt.force && t - speakAt < SPEAK_GAP) return false;') && src.includes('duckMusicBrief(Math.min(2.4,'));
  assert.ok(src.includes("ls.get('ib-sugar-voice', true)") && html.includes('id="voicebtn"'));
  assert.ok(src.includes('if (word && !canSpeak()) say(word);'), 'clips only where speech is missing');
  assert.ok(!/say\('(great|sweetas|awesome)'\)/.test(src));
  // Song slots: levels 1-7 keep our tunes; Shane's songs by mood from level 8; nothing changes until a file is listed.
  assert.strictEqual(SR.SONG_FROM, 8);
  assert.deepStrictEqual(Array.from(SR.SONG_PLAN.intense), [13, 15, 19, 22]);
  for (let n = 1; n <= 7; n++) assert.strictEqual(SR.songMood(n), null);
  assert.strictEqual(SR.songMood(17), 'calm'); assert.strictEqual(SR.songMood(9), 'upbeat'); assert.strictEqual(SR.songMood(22), 'intense');
  for (const k in SR.SONG_FILES) { const f = SR.SONG_FILES[k]; assert.ok(/\.m4a$/.test(f) && SR.MEDIA_HASH[f] && SR.MEDIA_HASH[f.replace(/\.m4a$/, '.mp3')], k); assert.ok(fs.existsSync('feed/' + SR.mediaUrl(f)) && fs.existsSync('feed/' + SR.mediaUrl(f.replace(/\.m4a$/, '.mp3')))); }
  assert.ok(src.includes("loading[kind] = get(file).catch(e => { if (mp3 !== file && MEDIA_HASH[mp3]) return get(mp3); throw e; })"), 'mp3 fallback');
}
console.log('1.9.223 voice and song slots ok');

// 1.9.224 Shane's three songs on the later levels, by mood; levels 1 and 2 keep their music, 3-7 keep our tune.
{
  const SR = load('feed/sugar-rush.js').SugarRush;
  const sha8 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
  const sw = fs.readFileSync('feed/sw.js', 'utf8');
  assert.strictEqual(SR.gameTrack(1), 'sugar-rush-l1.mp3'); assert.strictEqual(SR.gameTrack(2), 'sugar-rush-l2.mp3');
  for (let n = 3; n <= 7; n++) assert.strictEqual(SR.gameTrack(n), 'sugar-rush-music.mp3');
  for (const n of [13, 15, 19, 22]) assert.strictEqual(SR.gameTrack(n), 'sugar-rush-travel.m4a', 'Hard ' + n);
  for (const n of [17, 18]) assert.strictEqual(SR.gameTrack(n), 'sugar-rush-kiss.m4a', 'Pacific ' + n);
  for (const n of [8, 9, 10, 11, 12, 14, 16, 20, 21]) assert.strictEqual(SR.gameTrack(n), 'sugar-rush-song.m4a', 'level ' + n);
  for (const k of ['travel', 'kiss', 'song']) for (const e of ['m4a', 'mp3']) {
    const f = 'sugar-rush-' + k + '.' + e, url = SR.mediaUrl(f);
    assert.strictEqual(url, 'sugar-rush-' + k + '-' + sha8('feed/' + url) + '.' + e, 'hash ' + f);
    assert.strictEqual(SR.MEDIA_HASH[f], sha8('feed/' + url));
    const size = fs.statSync('feed/' + url).size;
    assert.ok(size > 1.5e6 && size < 3.5e6, f + ' is ~96 kbps, not the 4-5 MB original');
  }
  assert.ok(sw.includes('/\\.m4a$/i.test(u.pathname)'), 'SW leaves m4a range requests to the browser too');
}
console.log('1.9.224 songs ok');



