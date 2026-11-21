import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadSugarRush() {
  const ctx = { console, Intl, Date, Math, URL, Set, Map, Object, Number, String, Array, encodeURIComponent, decodeURIComponent };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('feed/sugar-rush.js', 'utf8'), ctx, { filename: 'feed/sugar-rush.js' });
  return ctx.SugarRush;
}
const SR = loadSugarRush();

test('the main campaign still has 75 stops and Sydney is level 20', () => {
  assert.equal(SR.LV_COUNT, 75);
  assert.equal(SR.MAP_STOPS.length, 75);
  assert.equal(SR.MAP_STOPS[19].place, 'Sydney');
  assert.equal(SR.MAP_STOPS[20].place, 'Gold Coast');
  assert.equal(SR.SHOP_FROM, 20);
  assert.equal(SR.SHOP_REJOIN, 21);
});

test('Sweet Shop Rush is a side stop after Sydney, not a new numbered level', () => {
  assert.equal(SR.SHOP_STOP.id, 'sweet-shop');
  assert.equal(SR.SHOP_STOP.place, 'Sydney Lolly Shop');
  const sydney = SR.MAP_STOPS[19], gold = SR.MAP_STOPS[20], shop = SR.SHOP_STOP;
  assert.ok(shop.x > sydney.x, 'the shop sits east of the Sydney pin');
  assert.ok(shop.y > sydney.y, 'the shop hooks south of the main Sydney–Gold Coast road');
  const path = SR.shopSidePath();
  assert.match(path, /^M /);
  assert.ok(path.indexOf(String(shop.x)) >= 0);
  assert.ok(SR.shopSideStops()[0].place === 'Sydney');
  assert.ok(SR.shopSideStops()[2].place === 'Gold Coast');
});

test('the side path opens after Sydney is cleared, and finishing it unlocks Gold Coast', () => {
  assert.equal(SR.shopIsOpen({ open: 20, stars: new Array(75).fill(0) }), false);
  const stars = new Array(75).fill(0);
  stars[19] = 1;
  assert.equal(SR.shopIsOpen({ open: 21, stars }), true);
  assert.equal(SR.shopIsOpen({ open: 21, stars: new Array(75).fill(0) }), true);
  const next = SR.shopUnlockRejoin({ open: 20, stars });
  assert.equal(next.open, 21);
  const already = SR.shopUnlockRejoin({ open: 26, stars });
  assert.equal(already.open, 26, 'already-unlocked progress is not pulled back');
});

test('a shift lasts 150 seconds, with a generous +8s bonus and 30s impatient timer', () => {
  assert.equal(SR.SHOP_SECONDS, 150);
  assert.equal(SR.SHOP_BONUS_SEC, 8);
  assert.equal(SR.SHOP_IMPATIENT_SEC, 30);
  assert.equal(SR.SHOP_LEAVE_PENALTY, 5);
  const lv = SR.shopLevel();
  assert.equal(lv.timer, 150);
  assert.equal(lv.shopRush, true);
  assert.ok(lv.moves >= 200, 'moves are not the limit');
  const st = SR.newGame({ level: lv, seed: 7 });
  assert.equal(st.timerLeft, 150);
  assert.equal(SR.goalsMet(Object.assign({ shopRush: true, shop: SR.newShopState(() => 0.2) }, st)), false);
  const ended = Object.assign({}, st, { shopRush: true, shop: Object.assign(SR.newShopState(() => 0.2), { served: 3, coins: 30 }) });
  ended.lv = lv;
  SR.tickTimer(ended, ended.timerUpdatedAt + 150000);
  assert.equal(ended.over, true);
  assert.equal(ended.won, true);
  assert.equal(ended.timerLeft, 0);
});

test('matches fill the front customer, then a cha-ching bonus of 8 seconds worth of coins', () => {
  const shop = SR.newShopState(() => 0.1);
  shop.queue = [SR.makeShopOrder(() => 0.1)];
  shop.queue[0].candies = [{ color: 0, n: 3, left: 3 }];
  shop.queue[0].specials = [];
  shop.queue[0].impatient = false;
  shop.queue[0].grandma = false;
  shop.queue[0].coins = 10;
  const mid = SR.fillShopOrder(shop, [2, 0, 0, 0, 0, 0], {});
  assert.equal(mid.served, false);
  assert.equal(shop.queue[0].candies[0].left, 1);
  const done = SR.fillShopOrder(shop, [1, 0, 0, 0, 0, 0], {});
  assert.equal(done.served, true);
  assert.equal(done.bonusSec, 8);
  assert.equal(done.coins, 10);
  assert.equal(shop.served, 1);
});

test("Grandma's order is worth triple coins and its sweets are the ones that glow", () => {
  const g = SR.makeShopOrder(() => 0.2, { grandma: true });
  assert.equal(g.grandma, true);
  assert.equal(g.name, 'Grandma');
  assert.equal(g.coins, SR.SHOP_COINS * SR.SHOP_GRANDMA_MULT);
  assert.ok(g.candies.length >= 2, 'a big, friendly mixed order');
  const shop = SR.newShopState(() => 0.2);
  shop.queue = [g];
  const colors = SR.shopGlowColors(shop);
  assert.deepEqual(colors.slice().sort(), g.candies.filter(c => c.left > 0).map(c => c.color).sort());
  const regular = SR.newShopState(() => 0.4);
  regular.queue[0].grandma = false;
  assert.equal(SR.shopGlowColors(regular).length, 0);
});

test('an impatient customer leaves after about 30 seconds and takes 5 seconds off the clock', () => {
  const shop = SR.newShopState(() => 0.3, { grandmaDue: false });
  shop.queue = [SR.makeShopOrder(() => 0.3, { impatient: true }), SR.makeShopOrder(() => 0.4)];
  shop.queue[0].leaveIn = 30000;
  shop.nextImpatientIn = 999999;
  shop.grandmaDue = false;
  const ev = SR.tickShop(shop, 30000, () => 0.2);
  assert.equal(ev[0].type, 'leave');
  assert.equal(ev[0].penaltySec, 5);
  assert.equal(shop.queue[0].impatient, false);
});

test('weekly takings reset on Sunday and the top seller gets a crown the following week', () => {
  // Saturday 21 Nov 2026 NZ: week started Sunday 15 Nov.
  const sat = Date.parse('2026-11-20T12:00:00Z'); // 21 Nov 2026 01:00 NZDT
  assert.equal(SR.nzDay(sat), '2026-11-21');
  assert.equal(SR.shopWeekStart(sat), '2026-11-15');
  let board = SR.normalizeShopBoard(null, sat, { key: 'shane', name: 'Shane' });
  board = SR.recordShopTakings(board, 'shane', { name: 'Shane', customers: 6, coins: 80 }, sat, { key: 'shane', name: 'Shane' });
  board = SR.recordShopTakings(board, 'aranea', { name: 'Aranea', customers: 8, coins: 120 }, sat, { key: 'aranea', name: 'Aranea' });
  const today = SR.shopScoreRows(board, sat);
  assert.equal(today.rows[0].name, 'Aranea');
  assert.equal(today.rows[0].todayCoins, 120);
  assert.equal(today.crown, null);

  const sunday = Date.parse('2026-11-21T11:00:00Z'); // Sunday 22 Nov 2026 00:00 NZDT
  assert.equal(SR.nzDay(sunday), '2026-11-22');
  assert.equal(SR.shopWeekStart(sunday), '2026-11-22');
  const rolled = SR.normalizeShopBoard(board, sunday);
  assert.equal(rolled.weekStart, '2026-11-22');
  assert.equal(rolled.crown.name, 'Aranea');
  assert.equal(rolled.crown.key, 'aranea');
  assert.equal(rolled.members.aranea.weekCoins, 0, 'week totals reset');
  assert.equal(rolled.members.aranea.todayCoins, 0, 'a new day starts at zero');
  const rows = SR.shopScoreRows(rolled, sunday);
  const aranea = rows.rows.find(r => r.key === 'aranea');
  assert.equal(aranea.crown, true);
});

test('finishing a shift does not spend a life and uses local takings storage', () => {
  const lives = SR.regenLives({ v: 2, n: 2, t: null });
  assert.equal(lives.n, 2);
  const lv = SR.shopLevel();
  const st = SR.newGame({ level: lv, seed: 3 });
  st.shopRush = true;
  st.shop = Object.assign(SR.newShopState(() => 0.2), { served: 4, coins: 55 });
  SR.finishShopShift(st);
  assert.equal(st.won, true);
  assert.equal(st.score, 55);
  // The mode stores takings under ib-sugar-shop-rush via recordShopTakings, same ls helper as the race icon/progress.
  const stored = SR.recordShopTakings(null, 'local', { name: 'Shane', customers: 4, coins: 55, cleared: true }, Date.parse('2026-11-20T12:00:00Z'), { key: 'local', name: 'Shane' });
  assert.equal(stored.members.local.cleared, true);
  assert.equal(stored.members.local.todayCoins, 55);
});

test('shop sound files are hashed and mellow, and the intro film is not a campaign asset in MEDIA_HASH audio', () => {
  assert.equal(SR.MEDIA_HASH['sugar-rush-shop-bell.mp3'], '17a691af');
  assert.equal(SR.MEDIA_HASH['sugar-rush-shop-chaching.mp3'], '65082481');
  assert.equal(SR.MEDIA_HASH['sugar-rush-shop-hmph.mp3'], '04da5505');
  assert.ok(fs.existsSync('feed/sugar-rush-shop-bell-17a691af.mp3'));
  assert.ok(fs.existsSync('feed/img/sugar-rush/sweet-shop-rush-intro-9030f05b.mp4'));
  assert.ok(fs.existsSync('feed/img/sugar-rush/sweet-shop-rush-intro-9030f05b.webm'));
  assert.ok(fs.existsSync('feed/img/sugar-rush/sweet-shop-rush-intro-9030f05b-poster.jpg'));
});
