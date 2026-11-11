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
// 1.9.157 triangle Tetris on the Triangles theme (level 11, second to last): two-colour palette, gameplay unchanged
assert.strictEqual(tetGame.themeFor(1), 6);
assert.strictEqual(tetGame.themeFor(2), 11);
assert.strictEqual(tetGame.themeFor(3), 0);
assert.strictEqual(tetGame.themeFor(11), 8);
assert.strictEqual(tetGame.themeFor(12), 7);
assert.strictEqual(tetGame.THEMES[8].name, 'Triangles');
assert.strictEqual(tetGame.THEMES[11].name, 'Jeremiah was a bullfrog');
assert.strictEqual(tetGame.TRI_THEME, 8);
// Palette follows the Triangles theme wherever it sits: first 5 lines of the level red/blue, then pink/lime.
assert.deepStrictEqual(tetGame.trianglePalette(100, 11), tetGame.TRI_PAL.early);
assert.deepStrictEqual(tetGame.trianglePalette(104, 11), tetGame.TRI_PAL.early);
assert.deepStrictEqual(tetGame.trianglePalette(105, 11), tetGame.TRI_PAL.late);
assert.deepStrictEqual(tetGame.trianglePalette(109, 11), tetGame.TRI_PAL.late);
assert.strictEqual(tetGame.triangleLate(104), false);
assert.strictEqual(tetGame.triangleLate(105), true);
assert.strictEqual(tetGame.blockColor(1, 100, 11), tetGame.TRI_PAL.early[0]); // red
assert.strictEqual(tetGame.blockColor(2, 100, 11), tetGame.TRI_PAL.early[1]); // blue
assert.strictEqual(tetGame.blockColor(3, 105, 11), tetGame.TRI_PAL.late[0]);  // pink
assert.strictEqual(tetGame.blockColor(4, 105, 11), tetGame.TRI_PAL.late[1]);  // lime
const triCols = new Set([1, 2, 3, 4, 5, 6, 7].map(t => tetGame.blockColor(t, 102, 11)));
assert.deepStrictEqual([...triCols].sort(), [...tetGame.TRI_PAL.early].sort());
assert.strictEqual(tetGame.trianglePalette(0, 1), null, 'other themes keep their own colours');
assert.strictEqual(tetGame.trianglePalette(14, 2), null, 'bullfrog on level 2 is not triangles');
assert.strictEqual(tetGame.blockColor(1, 0, 1), tetGame.COLORS[1]);
const gTri = tetGame.newGame();
gTri.level = 11; gTri.lines = 102;
const beforeX = 4;
gTri.piece = { t: 4, m: [[4, 4], [4, 4]], x: beforeX, y: 0 };
tetGame.act(gTri, 'left');
assert.strictEqual(gTri.piece.x, beforeX - 1, 'triangle theme does not change movement');
assert.strictEqual(tetGame.THEMES[7].name, 'Space travel');
assert.strictEqual(tetGame.SPACE_THEME, 7);
const waitFirst = tetGame.bombWaitRange(12, true), waitLater = tetGame.bombWaitRange(12, false);
assert.deepStrictEqual(Array.from(waitFirst), [4, 6]);
assert.deepStrictEqual(Array.from(waitLater), [6, 10]);
assert.deepStrictEqual(Array.from(tetGame.bombWaitRange(36, true)), [4, 6]);
assert.deepStrictEqual(Array.from(tetGame.bombWaitRange(36, false)), [6, 10]);
const gSp = tetGame.newGame();
gSp.level = 12; gSp.lines = 110;
gSp.board = tetGame.emptyBoard();
for (let r = 16; r < 20; r++) gSp.board[r][4] = 3;
gSp.board[15][4] = 5;
gSp.piece = { t: 4, m: [[4, 4], [4, 4]], x: 4, y: 8 };
assert.strictEqual(tetGame.applyBombHit(gSp, 4, 8), 'piece', 'bombs pass through the falling piece');
assert.strictEqual(gSp.piece.t, 4);
assert.strictEqual(gSp.over, false);
assert.strictEqual(gSp.board[8][4], 0);
assert.strictEqual(tetGame.applyBombHit(gSp, 4, 15), 'block');
assert.strictEqual(gSp.board[15][4], 0, 'only the hit block is cleared');
assert.strictEqual(gSp.board[16][4], 3, 'cells above do not fall');
assert.strictEqual(gSp.board[17][4], 3);
assert.strictEqual(tetGame.applyBombHit(gSp, 4, 19), 'block');
assert.strictEqual(gSp.board[16][4], 3);
assert.strictEqual(gSp.board[19][4], 0);

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
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('sights.js?v=1.9.157'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('cal.js?v=1.9.157'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('back.js?v=1.9.157'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('.cdot.tv'));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('.bd ul.sum'));
assert.ok(fs.readFileSync('feed/app.js', 'utf8').includes("const APP_VERSION = '1.9.157'"));
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
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("const VERSION = '1.9.157'"));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'art3d.js?v=' + VERSION"));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'portal.js?v=' + VERSION"));
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('portal.js?v=1.9.157'));
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
assert.ok(fs.readFileSync('feed/index.html', 'utf8').includes('art3d.js?v=1.9.157'));
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
const futDay = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10); // a day still ahead, so the past-showing filter keeps it
const timed = cal.prefill({ x: 'watch', w: { t: 'QI', day: futDay, ev: cal.aucklandMs(futDay, '19:30'), plat: 'ThreeNow', url: 'https://www.threenow.co.nz/show' } });
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
assert.ok(calFile.includes('data-art="tetris"'));
assert.ok(calFile.includes('Play Tetris'));
// 1.9.157 Scrabble is playable; Sugar Rush is the next game coming soon
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
assert.ok(playFile.includes("tetris: { url: 'tetris'"));
assert.ok(/tetris:[\s\S]{0,220}local: true/.test(playFile));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'tetris'"));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'tetris.js'"));
assert.ok(playFile.includes("scrabble: { url: 'scrabble'"));
assert.ok(/scrabble:[\s\S]{0,220}local: true/.test(playFile));
assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'scrabble', 'scrabble.js'"));
assert.ok(!fs.readFileSync('feed/sw.js', 'utf8').includes('scrabble-words'), 'word list is fetched when Scrabble opens, not precached');

// 1.9.157 Scrabble rules and word checks (small word list here; tests/scrabble-sim.mjs plays full games with the real one)
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
  assert.strictEqual(S.nzDate(Date.UTC(2026, 10, 11, 11, 30)), '12 Nov', 'dates are NZ dates');
  ctx.fetch = async () => { throw new Error('offline'); };
  assert.strictEqual(await S.load('tetris'), null, 'offline fails quietly');
  const tet = fs.readFileSync('feed/tetris.js', 'utf8'), tetHtml = fs.readFileSync('feed/tetris.html', 'utf8');
  assert.ok(tetHtml.indexOf('scores.js') > 0 && tetHtml.indexOf('scores.js') < tetHtml.indexOf('tetris.js'));
  assert.ok(tetHtml.includes('id="scoresbtn"') && tet.includes("S.submit('tetris', { score: gm.score, lines: gm.lines, level: gm.level }"));
  const scr = fs.readFileSync('feed/scrabble.js', 'utf8'), scrHtml = fs.readFileSync('feed/scrabble.html', 'utf8');
  assert.ok(scrHtml.includes('<script src="scores.js"></script>') && scrHtml.includes('id="overscores"') && scrHtml.includes('id="gscoresbtn"'));
  assert.ok(scr.includes('localOnly: true') && scr.includes('if (!st.scored)'));
  assert.ok(!/importScripts\s*\(/.test(scr), 'scrabble.js also runs as the computer player worker, so it never loads scores.js itself');
  assert.ok(fs.readFileSync('feed/sw.js', 'utf8').includes("'scores.js'"));
  execSync('node worker/test/scores.test.mjs', { stdio: 'pipe' });
}

// 1.9.157 Sugar Rush level 1: match-3 rules, cascades, special sweets, no-move shuffle, and Shane-only access
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
  for (let s = 1; s <= 40; s++) { const g = SR.newGame({ seed: s }); while (!g.over) { const m = SR.findMove(g.board); assert.ok(m); assert.ok(SR.play(g, m[0], m[1]).valid); assert.ok(SR.hasMove(g.board)); } assert.strictEqual(g.moves, 0); assert.strictEqual(g.won, g.score >= 3000); assert.strictEqual(g.stars, SR.starsFor(g.score)); }
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
  // Soft sounds: lowpass, sine/triangle only, nothing above 400 Hz
  assert.ok(srJs.includes("lp.type = 'lowpass'") && !/'(square|sawtooth)'/.test(srJs));
  const scale = srJs.match(/const SCALE = \[([^\]]+)\]/)[1].split(',').map(Number);
  assert.ok(Math.max(...scale) <= 400);
  assert.ok(srJs.includes("ls.get('ib-sugar-music', false)"), 'music is off by default');
  // Menu and Games card: Play Sugar Rush only for Shane
  const app = fs.readFileSync('feed/app.js', 'utf8'), cal = fs.readFileSync('feed/cal.js', 'utf8'), play = fs.readFileSync('feed/play.js', 'utf8'), idx = fs.readFileSync('feed/index.html', 'utf8'), sw = fs.readFileSync('feed/sw.js', 'utf8');
  assert.ok(app.includes('window.IBScores.isShane()') && app.includes('data-art="sugar"><span class="mfe">🍬</span><span>Play Sugar Rush</span>') && app.includes('<span>Sugar Rush · coming soon</span>'));
  const sugarOpt = new Function('window', app.match(/function sugarOk\(\)[^\n]+\nfunction sugarOpt\(\)[^\n]+/)[0] + '\nreturn sugarOpt();');
  assert.ok(sugarOpt({ IBScores: { isShane: () => true } }).includes('Play Sugar Rush'));
  assert.ok(sugarOpt({ IBScores: { isShane: () => false } }).includes('Sugar Rush · coming soon'));
  assert.ok(sugarOpt({}).includes('disabled'));
  assert.ok(cal.includes("root.IBScores && root.IBScores.isShane()") && cal.includes('data-art="sugar">Play Sugar Rush'));
  assert.ok(play.includes("sugar: { url: 'sugar-rush'") && /sugar:[\s\S]{0,220}local: true/.test(play));
  assert.ok(idx.indexOf('scores.js?v=') > 0 && idx.indexOf('scores.js?v=') < idx.indexOf('app.js?v='));
  assert.ok(sw.includes("'sugar-rush', 'sugar-rush.js'") && sw.includes("'scores.js?v=' + VERSION"));
  const ship = fs.readFileSync('tools/ship-pages.sh', 'utf8');
  assert.match(ship, /\/feed\/sugar-rush\n {2}! X-Frame-Options\n {2}X-Frame-Options: SAMEORIGIN/);
  assert.match(ship, /\/feed\/sugar-rush\.html\n {2}! X-Frame-Options\n {2}X-Frame-Options: SAMEORIGIN/);
}

// 1.9.157 Shane-only Tetris level picker (practice mode, not posted to the family scoreboard)
{
  const names = ['Farmyard', 'Jeremiah was a bullfrog', 'Beach', 'Rainforest', 'Ocean', 'Bush walk', 'New Zealand', 'Snowy mountains', 'City', 'Night sky', 'Triangles', 'Space travel'];
  assert.deepStrictEqual(Array.from(tetGame.ORDER), [6, 11, 0, 1, 2, 3, 9, 10, 4, 5, 8, 7]);
  assert.deepStrictEqual(Array.from(tetGame.stages().map(s => s.name)), names);
  assert.deepStrictEqual(Array.from(tetGame.stages().map(s => s.level)), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const gPr = tetGame.newGame({ level: 11, practice: true });
  assert.strictEqual(gPr.level, 11);
  assert.strictEqual(gPr.lines, 100);
  assert.strictEqual(gPr.practice, true);
  assert.strictEqual(gPr.startLevel, 11);
  assert.strictEqual(gPr.score, 0);
  assert.strictEqual(tetGame.themeFor(gPr.level), 8);
  assert.deepStrictEqual(tetGame.trianglePalette(gPr.lines, gPr.level), tetGame.TRI_PAL.early);
  assert.strictEqual(tetGame.dropInterval(gPr.level), tetGame.dropInterval(11));
  assert.strictEqual(tetGame.shouldSubmit(gPr), false, 'practice never goes on the family board');
  const gSp = tetGame.newGame({ level: 12, practice: true });
  assert.strictEqual(gSp.level, 12);
  assert.strictEqual(gSp.lines, 110);
  assert.strictEqual(tetGame.themeFor(gSp.level), 7);
  const gFrog = tetGame.newGame({ level: 2, practice: true });
  assert.strictEqual(tetGame.themeFor(gFrog.level), 11);
  assert.strictEqual(tetGame.THEMES[11].name, 'Jeremiah was a bullfrog');
  // Levelling up in practice, then restart, returns to the chosen stage
  gPr.lines = 109; gPr.level = 11; gPr.board = tetGame.emptyBoard();
  for (let c = 0; c < 9; c++) gPr.board[19][c] = 1;
  gPr.piece = { t: 4, m: [[4]], x: 9, y: 19 }; gPr.next = 4;
  tetGame.lockPiece(gPr);
  assert.strictEqual(gPr.level, 12, 'practice can still move on to the next stage');
  const again = tetGame.act(gPr, 'restart');
  assert.strictEqual(again.practice, true);
  assert.strictEqual(again.level, 11);
  assert.strictEqual(again.lines, 100);
  assert.strictEqual(again.startLevel, 11);
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


// 1.9.157 Tetris sounds follow the music (tempo/key), and Space bombs actually drop
{
  const almost = (a, b, eps) => assert.ok(Math.abs(a - b) <= (eps || 1e-6), a + ' != ' + b);
  assert.strictEqual(tetGame.TRACKS.length, 12);
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
  for (let i = 0; i < 12; i++) {
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
    for (let r = 16; r < 20; r++) g.board[r][4] = 3;
    g.piece = { t: 4, m: [[4, 4], [4, 4]], x: 0, y: 0 }; // keep the falling piece off the stacked column
  }
  function simSpace(g) {
    const inv = tetGame.resetInvaders(tetGame.newInvaders(), g.level);
    const first = tetGame.bombWaitRange(g.level, true);
    inv.wait = first[1] * 1000; // worst first wait (6s)
    const before = blocks(g.board);
    let t = 0, hitAt = null;
    const dt = 16;
    while (t < 12000) {
      tetGame.stepInvaders(inv, g, dt, { started: true });
      t += dt;
      if (hitAt == null && blocks(g.board) < before) hitAt = t;
    }
    return { hitAt, left: blocks(g.board), before, inv };
  }
  const gPick = tetGame.newGame({ level: 12, practice: true });
  assert.strictEqual(gPick.practice, true);
  assert.strictEqual(tetGame.themeFor(gPick.level), tetGame.SPACE_THEME);
  stackOn(gPick);
  const pick = simSpace(gPick);
  assert.ok(pick.hitAt != null && pick.hitAt <= 12000, 'picker: a settled block is destroyed within 12s, got ' + pick.hitAt);
  assert.strictEqual(pick.left, pick.before - 1);

  const gNat = tetGame.newGame();
  gNat.lines = 110; gNat.level = 12;
  assert.strictEqual(tetGame.themeFor(gNat.level), tetGame.SPACE_THEME);
  stackOn(gNat);
  const nat = simSpace(gNat);
  assert.ok(nat.hitAt != null && nat.hitAt <= 12000, 'natural level 12: a settled block is destroyed within 12s, got ' + nat.hitAt);
  assert.strictEqual(nat.left, nat.before - 1);

  // Screenshot seed must still hold bombs back
  const gDemo = tetGame.newGame({ level: 12, practice: true });
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

// 1.9.157 Tetris game sounds sit ~6 dB above the music, still soft and low
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
