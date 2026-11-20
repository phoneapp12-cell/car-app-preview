import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const calSrc = read('../feed/cal.js');
const coreSrc = read('../core.js');
const css = read('../feed/cal-book.css');
const html = read('../feed/index.html');
const sw = read('../feed/sw.js');

function loadCal(extra = {}) {
  const ctx = {
    ls: { mem: {}, get(k, d) { return this.mem[k] || d; }, set(k, v) { this.mem[k] = v; } },
    document: {
      documentElement: { classList: { toggle() {} } },
      getElementById() { return null; },
      querySelector() { return null; },
      addEventListener() {},
      createElement() { return { id: '', type: '', hidden: true, textContent: '', onclick: null }; },
      body: { append() {} }
    },
    addEventListener() {},
    setInterval() {},
    setTimeout() {},
    matchMedia() { return { matches: false }; },
    Date,
    Intl,
    ...extra
  };
  vm.runInNewContext(calSrc, ctx);
  return ctx;
}

test('book calendar assets are wired into the feed shell', () => {
  assert.match(html, /cal-book\.css\?v=1\.9\.\d+/);
  assert.match(sw, /cal-book\.css\?v=' \+ VERSION/);
  assert.match(css, /cal-turn-next/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /cal-seg/);
  assert.match(calSrc, /data-calview/);
  assert.match(calSrc, /data-calnav/);
  assert.match(calSrc, /ibCalOpen/);
});

test('week starts on Monday in New Zealand civil dates', () => {
  const { ibCal } = loadCal();
  assert.equal(ibCal.weekStart('2026-11-21'), '2026-11-16'); // Saturday → Monday
  assert.equal(ibCal.weekStart('2026-11-16'), '2026-11-16');
  assert.equal(ibCal.weekStart('2026-11-15'), '2026-11-09'); // Sunday
  const grid = ibCal.monthGrid('2026-11');
  assert.equal(grid[0].date, '2026-10-26');
  assert.equal(grid[0].mute, true);
  assert.equal(grid.find(c => c.date === '2026-11-01').mute, false);
  assert.equal(grid[grid.length - 1].date, '2026-12-06');
});

test('NZ holidays come from the existing Holidays Act / Matariki source', () => {
  const core = {};
  vm.runInNewContext(coreSrc, core);
  const { ibCal } = loadCal();
  const names = list => list.map(h => h.date + ' ' + h.name).join('\n');
  assert.equal(names(ibCal.localNzHolidays(2026)), names(core.DD.nzHolidays(2026)));
  assert.equal(names(ibCal.localNzHolidays(2027)), names(core.DD.nzHolidays(2027)));
  const h = ibCal.holidaysOfYear(2026);
  assert.ok(h.some(x => x.date === '2026-01-26' && x.name === 'Auckland Anniversary Day'));
  assert.ok(h.some(x => x.date === '2026-02-06' && x.name === 'Waitangi Day'));
  assert.ok(h.some(x => x.date === '2026-07-10' && x.name === 'Matariki'));
  const viaDD = loadCal({ DD: core.DD });
  assert.equal(viaDD.ibCal.holidaysOfYear(2026)[0].name, core.DD.nzHolidays(2026)[0].name);
});

test('allEvents uses only personal calendar, family dates, and known holidays', () => {
  const { ibCal } = loadCal({
    IS_FRIEND: false,
    X: { dates: [{ kind: 'bday', title: 'Jess', m: 11, d: 24, days: 3 }] }
  });
  ibCal.upsert({ title: 'Shortland Street', date: '2026-11-22', time: '19:00', kind: 'tv' });
  const evs = ibCal.allEvents('2026-11-01', '2026-11-30');
  assert.ok(evs.some(e => e.title === 'Shortland Street' && e.src === 'cal'));
  assert.ok(evs.some(e => e.title === 'Jess' && e.src === 'family' && e.date === '2026-11-24'));
  assert.ok(!evs.some(e => e.src !== 'cal' && e.src !== 'family' && e.src !== 'holiday'));
  assert.ok(!evs.some(e => /invent|sample|demo event/i.test(e.title)));
});

test('friends never see family birthdays or events on the calendar', () => {
  const { ibCal } = loadCal({
    IS_FRIEND: true,
    X: { dates: [{ kind: 'bday', title: 'Jess', m: 11, d: 24, days: 3 }] }
  });
  assert.equal(ibCal.familyEvents('2026-11-01', '2026-11-30').length, 0);
  const evs = ibCal.allEvents('2026-11-01', '2026-11-30');
  assert.ok(!evs.some(e => e.title === 'Jess' || e.src === 'family'));
  ibCal.setView('month');
  ibCal.setCursor('2026-11-21');
  const html = ibCal.viewHtml();
  assert.doesNotMatch(html, /Jess/);
  assert.match(html, />Day</);
  assert.match(html, />Week</);
  assert.match(html, />Month</);
  assert.match(html, />Year</);
  assert.match(html, /calbook/);
  assert.match(html, /NZ holidays/);
  assert.doesNotMatch(html, /Family/);
});

test('family members see birthdays and the Day/Week/Month/Year chrome', () => {
  const { ibCal } = loadCal({
    IS_FRIEND: false,
    X: { dates: [{ kind: 'bday', title: 'Jess', m: 11, d: 24, days: 3 }] }
  });
  ibCal.setView('year');
  ibCal.setCursor('2026-11-21');
  const year = ibCal.viewHtml();
  assert.match(year, /data-calview="month"/);
  assert.match(year, /November/);
  assert.match(year, />2026</);
  ibCal.setView('week');
  const week = ibCal.viewHtml();
  assert.match(week, /16–22 November 2026/);
  ibCal.setView('day');
  ibCal.setCursor('2026-11-24');
  const day = ibCal.viewHtml();
  assert.match(day, /Jess/);
  assert.match(day, /Tuesday 24 November 2026/);
});
