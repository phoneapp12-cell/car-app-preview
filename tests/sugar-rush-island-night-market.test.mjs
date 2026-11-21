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

test('the main campaign still has 75 stops and Rarotonga is level 17', () => {
  assert.equal(SR.LV_COUNT, 75);
  assert.equal(SR.MAP_STOPS.length, 75);
  assert.equal(SR.MAP_STOPS[16].place, 'Rarotonga');
  assert.equal(SR.LEVELS[16].name, 'Rarotonga Lagoon');
  assert.equal(SR.MAP_STOPS[17].place, 'Tonga');
  assert.equal(SR.LEVELS[17].name, 'Tongan Coconut Coast');
  assert.equal(SR.MARKET_FROM, 17);
  assert.equal(SR.MARKET_REJOIN, 18);
  assert.equal(SR.SHOP_FROM, 20, 'Sweet Shop Rush is unchanged');
});

test('Island Night Market is a side stop after Rarotonga, not a new numbered level', () => {
  assert.equal(SR.MARKET_STOP.id, 'island-market');
  assert.equal(SR.MARKET_STOP.place, 'Punanga Nui Market');
  const raro = SR.MAP_STOPS[16], tonga = SR.MAP_STOPS[17], stop = SR.MARKET_STOP;
  assert.ok(stop.x < raro.x && stop.x > tonga.x, 'the market sits between Tonga and Rarotonga');
  assert.ok(stop.y > raro.y, 'the market hooks south of the Rarotonga–Tonga road');
  const path = SR.marketSidePath();
  assert.match(path, /^M /);
  assert.ok(path.indexOf(String(stop.x)) >= 0);
  assert.equal(SR.marketSideStops()[0].place, 'Rarotonga');
  assert.equal(SR.marketSideStops()[2].place, 'Tonga');
});

test('the side path opens after Rarotonga is cleared, and finishing it unlocks Tonga', () => {
  assert.equal(SR.marketIsOpen({ open: 17, stars: new Array(75).fill(0) }), false);
  const stars = new Array(75).fill(0);
  stars[16] = 1;
  assert.equal(SR.marketIsOpen({ open: 18, stars }), true);
  assert.equal(SR.marketIsOpen({ open: 18, stars: new Array(75).fill(0) }), true);
  const next = SR.marketUnlockRejoin({ open: 17, stars });
  assert.equal(next.open, 18);
  const already = SR.marketUnlockRejoin({ open: 26, stars });
  assert.equal(already.open, 26, 'already-unlocked progress is not pulled back');
});

test('a night lasts 150 seconds, with a generous +8s bonus per basket', () => {
  assert.equal(SR.MARKET_SECONDS, 150);
  assert.equal(SR.MARKET_BONUS_SEC, 8);
  const lv = SR.marketLevel();
  assert.equal(lv.timer, 150);
  assert.equal(lv.marketRush, true);
  assert.ok(lv.moves >= 200, 'moves are not the limit');
  const st = SR.newGame({ level: lv, seed: 7 });
  assert.equal(st.timerLeft, 150);
  assert.equal(SR.goalsMet(Object.assign({ marketRush: true, market: SR.newMarketState(() => 0.2) }, st)), false);
  const ended = Object.assign({}, st, { marketRush: true, market: Object.assign(SR.newMarketState(() => 0.2), { served: 3, coins: 30 }) });
  ended.lv = lv;
  SR.tickTimer(ended, ended.timerUpdatedAt + 150000);
  assert.equal(ended.over, true);
  assert.equal(ended.won, true);
  assert.equal(ended.timerLeft, 0);
});

test('matches fill the front basket, then a bonus of 8 seconds and coins', () => {
  const market = SR.newMarketState(() => 0.1);
  market.queue = [SR.makeMarketOrder(() => 0.1)];
  market.queue[0].candies = [{ color: 0, n: 3, left: 3 }];
  market.queue[0].specials = [];
  market.queue[0].coins = 10;
  const mid = SR.fillMarketOrder(market, [2, 0, 0, 0, 0, 0], {});
  assert.equal(mid.served, false);
  assert.equal(market.queue[0].candies[0].left, 1);
  const done = SR.fillMarketOrder(market, [1, 0, 0, 0, 0, 0], {});
  assert.equal(done.served, true);
  assert.equal(done.bonusSec, 8);
  assert.equal(done.coins, 10);
  assert.equal(market.served, 1);
});

test('stallholders call out orders such as 3 pineapple chews!', () => {
  assert.equal(SR.MARKET_SWEETS[3], 'pineapple chews');
  const order = SR.makeMarketOrder(() => 0.1);
  order.candies = [{ color: 3, n: 3, left: 3 }];
  order.specials = [];
  const call = SR.marketOrderLabel(order);
  assert.equal(call, '3 pineapple chews!');
  const mixed = { candies: [{ color: 3, n: 3, left: 3 }, { color: 2, n: 2, left: 2 }], specials: [] };
  assert.equal(SR.marketOrderLabel(mixed), '3 pineapple chews and 2 lemon drops!');
});

test('front-basket sweets are the ones that glow', () => {
  const market = SR.newMarketState(() => 0.2);
  market.queue = [SR.makeMarketOrder(() => 0.2)];
  market.queue[0].candies = [{ color: 3, n: 4, left: 4 }, { color: 1, n: 2, left: 2 }];
  const colors = SR.marketGlowColors(market).slice().sort();
  assert.deepEqual(colors, [1, 3]);
});

test('the music speeds up a gentle two semitones as the night goes on', () => {
  const st0 = { marketRush: true, market: { nightMs: 0 } };
  const stMid = { marketRush: true, market: { nightMs: 75000 } };
  const stEnd = { marketRush: true, market: { nightMs: 150000 } };
  assert.equal(SR.MARKET_TEMPO_SEMITONES, 2);
  assert.equal(SR.marketTempoRate(st0), 1);
  assert.ok(SR.marketTempoRate(stMid) > SR.marketTempoRate(st0));
  assert.equal(SR.marketTempoRate(stEnd), SR.MARKET_TEMPO_MAX);
  const twoSemis = Math.pow(2, 2 / 12);
  assert.ok(Math.abs(SR.MARKET_TEMPO_MAX - twoSemis) < 1e-12);
  // Mid-night is halfway in cents, not halfway in raw rate, so it stays musical.
  const midWant = Math.pow(2, 1 / 12);
  assert.ok(Math.abs(SR.marketTempoRate(stMid) - midWant) < 1e-10);
  assert.ok(SR.MARKET_TEMPO_MAX > 1 && SR.MARKET_TEMPO_MAX < 1.13, 'two semitones keeps vocals musical');
});

test('weekly takings reset on Sunday and the top seller gets a crown the following week', () => {
  const sat = Date.parse('2026-11-20T12:00:00Z'); // 21 Nov 2026 01:00 NZDT
  assert.equal(SR.nzDay(sat), '2026-11-21');
  assert.equal(SR.shopWeekStart(sat), '2026-11-15');
  let board = SR.normalizeShopBoard(null, sat, { key: 'shane', name: 'Shane' });
  board = SR.recordShopTakings(board, 'shane', { name: 'Shane', customers: 5, coins: 50 }, sat, { key: 'shane', name: 'Shane' });
  board = SR.recordShopTakings(board, 'aranea', { name: 'Aranea', customers: 9, coins: 90 }, sat, { key: 'aranea', name: 'Aranea' });
  const sunday = Date.parse('2026-11-21T11:00:00Z'); // Sunday 22 Nov 2026 00:00 NZDT
  const rolled = SR.normalizeShopBoard(board, sunday);
  assert.equal(rolled.weekStart, '2026-11-22');
  assert.equal(rolled.crown.name, 'Aranea');
  assert.equal(rolled.members.aranea.weekCoins, 0, 'week totals reset');
});

test('finishing a night does not spend a life and uses local takings storage', () => {
  const lives = SR.regenLives({ v: 2, n: 2, t: null });
  assert.equal(lives.n, 2);
  const lv = SR.marketLevel();
  const st = SR.newGame({ level: lv, seed: 3 });
  st.marketRush = true;
  st.market = Object.assign(SR.newMarketState(() => 0.2), { served: 4, coins: 40 });
  SR.finishMarketShift(st);
  assert.equal(st.won, true);
  assert.equal(st.score, 40);
  const stored = SR.recordShopTakings(null, 'local', { name: 'Shane', customers: 4, coins: 40, cleared: true }, Date.parse('2026-11-20T12:00:00Z'), { key: 'local', name: 'Shane' });
  assert.equal(stored.members.local.cleared, true);
  assert.equal(stored.members.local.todayCoins, 40);
});

test('market sound files are hashed and mellow, and the intro film is present', () => {
  assert.equal(SR.MEDIA_HASH['sugar-rush-market-call.mp3'], '8f3686d1');
  assert.equal(SR.MEDIA_HASH['sugar-rush-market-basket.mp3'], '9d329487');
  assert.equal(SR.MEDIA_HASH['sugar-rush-market.m4a'], '1277099c');
  assert.equal(SR.MEDIA_HASH['sugar-rush-market.mp3'], 'b0e77ad5');
  assert.ok(fs.existsSync('feed/sugar-rush-market-call-8f3686d1.mp3'));
  assert.ok(fs.existsSync('feed/sugar-rush-market-basket-9d329487.mp3'));
  assert.ok(fs.existsSync('feed/sugar-rush-market-1277099c.m4a'));
  assert.ok(fs.existsSync('feed/sugar-rush-market-b0e77ad5.mp3'));
  assert.equal(fs.existsSync('feed/sugar-rush-market-1acbd24c.mp3'), false);
  assert.ok(fs.existsSync('feed/img/sugar-rush/island-night-market-intro-9a01c1f8.mp4'));
  assert.ok(fs.existsSync('feed/img/sugar-rush/island-night-market-intro-9a01c1f8.webm'));
  assert.ok(fs.existsSync('feed/img/sugar-rush/island-night-market-intro-9a01c1f8-poster.jpg'));
  const intro = fs.readFileSync('feed/sugar-rush-intro-assets.js', 'utf8');
  assert.match(intro, /SUGAR_MARKET_INTRO/);
  assert.match(intro, /island-night-market-intro-9a01c1f8/);
});
