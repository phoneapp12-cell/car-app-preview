import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const js = read('../feed/today.js');
const css = read('../feed/today.css');
const html = read('../feed/index.html');
const sw = read('../feed/sw.js');
const family = read('../feed/family.js');

test('Today magazine assets are wired into the feed shell', () => {
  assert.match(html, /today\.css\?v=1\.9\.\d+/);
  assert.match(html, /today\.js\?v=1\.9\.\d+/);
  assert.match(html, /class="[^"]*today-look/);
  assert.match(sw, /today\.css\?v=' \+ VERSION/);
  assert.match(sw, /today\.js\?v=' \+ VERSION/);
  assert.match(sw, /fonts\/Fraunces\.ttf/);
  assert.match(sw, /fonts\/IBMPlexSans\.ttf/);
});

test('hero greeting follows NZ time of day and uses Onerahi', () => {
  assert.match(js, /timeZone: 'Pacific\/Auckland'/);
  assert.match(js, /Tonight in Onerahi/);
  assert.match(js, /This ' \+ when \+ ' in Onerahi/);
  assert.match(js, /morning/);
  assert.match(js, /afternoon/);
  assert.match(js, /evening/);
  const ctx = { window: {}, document: { documentElement: { classList: { add() {} } }, querySelector() { return null; }, addEventListener() {} }, localStorage: { getItem() { return null; }, setItem() {} }, addEventListener() {}, Date };
  ctx.window = ctx;
  ctx.document.documentElement.classList.toggle = () => {};
  vm.runInNewContext(js.replace("(() => {", "void function(){") .replace(/\}\)\(\);\s*$/, "};"), ctx, { filename: 'today.js' });
  // Re-run by extracting functions — the IIFE already ran; ibToday is on ctx.window or ctx
});

test('nzParts returns morning / afternoon / evening / night in Auckland time', () => {
  const start = js.indexOf('function nzParts');
  const end = js.indexOf('function wxLabel');
  const ctx = {};
  vm.runInNewContext(js.slice(start, end) + '\nthis.nzParts = nzParts;', ctx);
  const at = iso => ctx.nzParts(new Date(iso));
  assert.equal(at('2026-11-21T06:22:00+13:00').when, 'morning'); // 6:22am NZ
  assert.equal(at('2026-11-21T06:22:00+13:00').kicker, 'This morning in Onerahi');
  assert.equal(at('2026-11-21T06:22:00+13:00').weekday, 'Saturday');
  assert.equal(at('2026-11-21T01:00:00+13:00').when, 'night');
  assert.equal(at('2026-11-21T01:00:00+13:00').kicker, 'Tonight in Onerahi');
  assert.equal(at('2026-11-21T13:00:00+13:00').when, 'afternoon');
  assert.equal(at('2026-11-21T18:30:00+13:00').when, 'evening');
});

test('friends never get a family birthday tile', () => {
  const start = js.indexOf('function nextBirthday');
  const end = js.indexOf('function triviaTile');
  const ctx = { FAM_ON: true, IS_FRIEND: true, X: { dates: [{ kind: 'bday', title: 'Jess', days: 3 }] } };
  vm.runInNewContext(js.slice(start, end) + '\nthis.nextBirthday = nextBirthday;', ctx);
  assert.equal(ctx.nextBirthday(), null);
  ctx.IS_FRIEND = false;
  vm.runInNewContext(js.slice(start, end) + '\nthis.nextBirthday = nextBirthday;', ctx);
  assert.equal(ctx.nextBirthday().title, 'Jess');
});

test('double-tap waits 250–300ms and ignores controls', () => {
  assert.match(js, /const TAP_WAIT = 280;/);
  assert.match(js, /already liked: keep it, do not toggle off/);
  assert.match(js, /button, input, textarea, select/);
  assert.match(js, /\[data-like\]/);
  assert.match(js, /\[data-cmt\]/);
  assert.match(js, /\.rxl/);
  assert.match(js, /scrolled/);
  assert.match(js, /pointerdown/);
  assert.match(js, /showHeart/);
  assert.match(css, /@keyframes ibHeart/);
});

test('tab bar and magazine side menu expose Today, People, Games and You', () => {
  assert.match(js, /data-tab="all"/);
  assert.match(js, />Today</);
  assert.match(js, /data-tab="people"/);
  assert.match(js, /data-tab="games"/);
  assert.match(js, /data-tab="you"/);
  assert.match(js, /data-art="sugar"/);
  assert.match(js, /data-art="scrabble"/);
  assert.match(js, /data-art="tetris"/);
  assert.match(js, /You’re on level/);
  assert.match(js, /Settings &amp; themes/);
  assert.match(js, /IS_ADMIN/);
  assert.match(css, /\.mf-games/);
  assert.match(css, /\.mf-cal/);
  assert.match(css, /\.ib-tabs/);
  assert.match(css, /\.today-hero/);
  assert.match(js, /data-calopen="1"/);
  assert.match(js, /function calMenuBlock/);
  assert.match(js, /function calPreview/);
  assert.match(js, /ibCalOpen|data-calopen/);
});

test('calendar menu preview uses existing dates and hides family events from friends', () => {
  const fn = js.slice(js.indexOf('function isoDate('), js.indexOf('function heroHtml('));
  assert.ok(fn.length > 40);
  const ctx = { console };
  vm.runInNewContext(fn + '; this.calPreview = calPreview; this.calWhen = calWhen; this.fmtTime = fmtTime; this.daysUntil = daysUntil; this.isoDate = isoDate; this.calIcon = calIcon;', ctx);
  const dates = [
    { kind: 'bday', title: 'Jess', days: 3 },
    { kind: 'event', title: 'Family lunch', days: 10 },
  ];
  const cal = [
    { title: 'Shortland Street', date: '2026-11-22', time: '19:30', kind: 'tv' },
    { title: 'Past thing', date: '2026-11-01', time: '09:00', kind: 'own' },
  ];
  const family = ctx.calPreview(dates, cal, false, '2026-11-21');
  assert.equal(family.length, 2);
  assert.equal(family[0].title, 'Shortland Street');
  assert.match(family[0].when, /tomorrow/);
  assert.equal(family[1].title, 'Jess');
  assert.match(family[1].when, /in 3 days/);
  const friend = ctx.calPreview(dates, cal, true, '2026-11-21');
  assert.ok(friend.every(x => x.src !== 'family'));
  assert.ok(!friend.some(x => x.title === 'Jess' || x.title === 'Family lunch'));
  assert.equal(friend[0].title, 'Shortland Street');
  const empty = ctx.calPreview([], [], false, '2026-11-21');
  assert.equal(empty.length, 0);
});

test('friends still cannot see family members via the People page filter', () => {
  assert.match(js, /filter\(x => x\.role !== 'friend'\)/);
  assert.match(js, /if \(friend\)/);
  assert.match(family, /IS_FRIEND = FAM_ON && MEMBER\.role === 'friend'/);
  assert.match(family, /never the family's things/);
});

test('existing appearance themes are still offered', () => {
  assert.match(js, /ocean/);
  assert.match(js, /spring/);
  assert.match(js, /candy/);
  assert.match(js, /Match phone/);
  assert.match(css, /force-dark/);
  assert.match(css, /th-ocean/);
  assert.match(css, /th-spring/);
  assert.match(css, /th-candy/);
});
