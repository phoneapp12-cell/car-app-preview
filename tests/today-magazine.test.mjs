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

test('hero greeting follows NZ time of day and defaults to Onerahi', () => {
  assert.match(js, /timeZone: 'Pacific\/Auckland'/);
  assert.match(js, /Tonight in ' \+ place/);
  assert.match(js, /This ' \+ when \+ ' in ' \+ place/);
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

test('tab bar and magazine side menu expose Today, Notifications, Games and You; People stays in the menu', () => {
  assert.match(js, /data-tab="all"/);
  assert.match(js, />Today</);
  assert.match(js, /data-tab="notif"/);
  assert.doesNotMatch(js, /data-tab="people"/);
  assert.match(js, /data-mftab="people"/);
  assert.match(js, /data-tab="games"/);
  assert.match(js, /data-tab="you"/);
  assert.match(js, /data-art="sugar"/);
  assert.match(js, /data-art="scrabble"/);
  assert.match(js, /data-art="tetris"/);
  assert.match(js, /Sugar Rush/);
  assert.match(js, /function sugarLevel/);
  assert.match(js, /<p class="mfsec">Settings<\/p>/);
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

test('theme picker is gone and the feed stays on the standard light theme', () => {
  const app = read('../feed/app.js');
  assert.doesNotMatch(js, /data-appear/);
  assert.doesNotMatch(js, /Match phone/);
  assert.doesNotMatch(js, /Settings &amp; themes/);
  assert.doesNotMatch(js, /today-appear/);
  assert.doesNotMatch(app, /data-appear/);
  assert.doesNotMatch(app, /ls\.set\('appear'/);
  assert.match(app, /var APPEAR = 'light'/);
  assert.match(app, /r\.classList\.add\('force-light'\)/);
  assert.doesNotMatch(app, /prefers-color-scheme: dark/);
  assert.doesNotMatch(html, /prefers-color-scheme/);
  assert.match(html, /class="[^"]*force-light/);
  assert.match(html, /<meta name="theme-color" content="#ffffff">/);
  assert.match(html, /color-scheme:light/);
});

test('swipe hint is dark purple and CTA banners are red, not pink', () => {
  assert.match(html, /#feed \.hscroll \.btn\.pri/);
  assert.match(html, /html\.candy #feed \.hscroll \.btn\.pri/);
  assert.match(html, /linear-gradient\(135deg,#dc2626,#b91c1c\)/);
  assert.match(html, /#feed \.hdots i\.on/);
  assert.match(html, /html\.candy #feed \.hdots i\.on/);
  assert.match(html, /linear-gradient\(90deg,#dc2626,#b91c1c\)/);
  assert.match(html, /\.hrhint\{[^}]*font-weight:800;color:#5b21b6/);
  assert.match(html, /html\.candy \.btn\.pri\{background:linear-gradient\(135deg,#dc2626,#b91c1c\)/);
  assert.match(html, /\.btn\.pri\{background:linear-gradient\(135deg,#dc2626,#b91c1c\)/);
  assert.match(html, /\.pinbox \.pbtn,\.pbtn\{[^}]*linear-gradient\(135deg,#dc2626,#b91c1c\)/);
  assert.match(html, /\.obt small\{[^}]*linear-gradient\(90deg,#dc2626,#b91c1c\)/);
  assert.match(html, /\.backpill\{[^}]*linear-gradient\(90deg,#dc2626,#b91c1c\)/);
  assert.match(html, /\.fabpost\{[\s\S]*?linear-gradient\(135deg,#dc2626,#b91c1c\)/);
  assert.match(css, /\.today-celeb-actions \.btn\.pri\{background:linear-gradient\(135deg,#dc2626,#b91c1c\)/);
  assert.match(html, /--hr-title:#1e3a8a/);
  assert.match(css, /\.today-game\.sr\{background:linear-gradient\(135deg,#ff7eb6,#ffa24c\)\}/);
  assert.match(html, /\.sugar-dock\{[^}]*linear-gradient\(135deg,#ff7eb6,#ffa24c\)/);
});


test('head CSS hides the Stories row under today-look and holds the feed until ib-ready', () => {
  assert.match(html, /html\.today-look #stories-host\{display:none\}/);
  assert.match(html, /html\.today-look:not\(\.ib-ready\) #feed > :not\(\.sk\)\{display:none\}/);
  assert.match(html, /html\.today-look:not\(\.ib-ready\) #ib-tabs\{visibility:hidden\}/);
  assert.match(html, /id="ib-bootsk"/);
  assert.match(html, /html\.today-look:not\(\.ib-ready\) #ib-bootsk\{display:block\}/);
  assert.match(css, /html\.today-look #stories-host\{display:none\}/);
  assert.doesNotMatch(css, /html\.today-look\.ib-tab-all #stories-host/);
});

test('today.js hooks draw immediately after app.js and is marked ready on first paint', () => {
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  const app = scripts.findIndex(s => s.startsWith('app.js?'));
  const today = scripts.findIndex(s => s.startsWith('today.js?'));
  const extras = scripts.findIndex(s => s.startsWith('extras.js?'));
  const read = scripts.findIndex(s => s.startsWith('read.js?'));
  const todos = scripts.findIndex(s => s.startsWith('todos.js?'));
  assert.ok(app >= 0 && today === app + 1, 'today.js must load immediately after app.js, got ' + scripts.slice(Math.max(0, app), app + 3).join(', '));
  assert.ok(extras === today + 1);
  assert.ok(read > today && todos > today);
  assert.match(js, /function ready\(\)/);
  assert.match(js, /classList\.add\('ib-ready'\)/);
  assert.match(js, /injectTodoCard, wrapDrawer, hookDraw, ready/);
  assert.match(js, /if \(mfDrawer\.__ibToday\) return;/);
});

test('todos.js re-applies the Today to-do card and drawer wrap when it loads', () => {
  const todos = read('../feed/todos.js');
  assert.match(todos, /ibToday\.injectTodoCard/);
  assert.match(todos, /ibToday\.wrapDrawer/);
});

test('versioned shell files are cache-first and stale-while-revalidate; game pages and navigations stay network-first', () => {
  assert.match(sw, /searchParams\.get\('v'\) === VERSION/);
  assert.match(sw, /cache-first, then revalidated in the background/);
  assert.match(sw, /e\.waitUntil\(revalidate\)/);
  assert.match(sw, /Game pages \(pretty URLs\) stay network-first/);
  assert.match(sw, /Navigations and other same-origin GETs: network-first/);
  // Must not still force every JS file through the network before first paint
  assert.doesNotMatch(sw, /mode === 'navigate' \|\| \\.js\$/);
});
