import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(join(root, rel), 'utf8');
const src = read('feed/todos.js');
const html = read('feed/index.html');
const sw = read('feed/sw.js');
const css = read('feed/todos.css');
const todayJs = read('feed/today.js');
const appJs = read('feed/app.js');
const calJs = read('feed/cal.js');

function load(extra = {}) {
  const ctx = {
    window: {},
    globalThis: null,
    ls: { mem: {}, get(k, d) { return this.mem[k] ?? d; }, set(k, v) { this.mem[k] = v; } },
    document: undefined,
    TextEncoder,
    Intl,
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    JSON,
    encodeURIComponent,
    ...extra
  };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.runInNewContext(src, ctx);
  return ctx.ibTodos;
}

test('to-do assets are wired into the feed shell, menu and service worker', () => {
  assert.match(html, /todos\.css\?v=1\.9\.\d+/);
  assert.match(html, /todos\.js\?v=1\.9\.\d+/);
  assert.match(sw, /todos\.css\?v=' \+ VERSION/);
  assert.match(sw, /todos\.js\?v=' \+ VERSION/);
  assert.match(appJs, /data-todoopen/);
  assert.match(todayJs, /data-todoopen/);
  assert.match(calJs, /ibCalClose/);
  assert.match(css, /ib-todo-on/);
  assert.match(css, /--ink/);
});

test('Shane and Sarah are household users; other members and friends are not', () => {
  const T = load();
  assert.equal(T.householdUser(null, {}), true);
  assert.equal(T.householdUser({ role: 'admin', name: 'Shane' }, { admin: true }), true);
  assert.equal(T.householdUser({ role: 'member', name: 'Sarah Jenkins' }, {}), true);
  assert.equal(T.householdUser({ role: 'member', name: 'sarah' }, {}), true);
  assert.equal(T.householdUser({ role: 'member', name: 'Millesha' }, {}), false);
  assert.equal(T.householdUser({ role: 'friend', name: 'Sarah' }, { friend: true }), false);
  assert.equal(T.actorOf({ name: 'Sarah' }, {}), 'sarah');
  assert.equal(T.actorOf({ name: 'Shane' }, { admin: true }), 'shane');
  assert.equal(T.actorOf(null, {}), 'shane');
});

test('items can be added, ticked, edited, deleted, and done items cleared', () => {
  const T = load();
  const now = Date.parse('2026-11-21T00:00:00+13:00');
  let list = [];
  list = T.applyChange(list, { id: 'tdmilk', title: 'Buy milk', due: '2026-11-21' }, now);
  list = T.applyChange(list, { id: 'tdbin', title: 'Put the bins out', due: '2026-11-20' }, now);
  list = T.applyChange(list, { id: 'tdcall', title: 'Call Mum' }, now);
  assert.equal(list.length, 3);
  const split = T.splitItems(list);
  assert.deepEqual(split.open.map(x => x.id), ['tdbin', 'tdmilk', 'tdcall']);
  assert.equal(T.dueKind(split.open[0], '2026-11-21'), 'overdue');
  assert.equal(T.dueKind(split.open[1], '2026-11-21'), 'today');
  assert.equal(T.dueKind(split.open[2], '2026-11-21'), 'none');
  list = T.applyChange(list, { id: 'tdmilk', title: 'Buy milk', due: '2026-11-21', done: true, doneAt: now + 10, doneBy: 'shane' }, now + 10);
  assert.equal(T.splitItems(list).open.length, 2);
  assert.equal(T.splitItems(list).done[0].id, 'tdmilk');
  list = T.applyChange(list, { id: 'tdcall', title: 'Phone Mum', due: '2026-11-22' }, now + 20);
  assert.equal(list.find(x => x.id === 'tdcall').title, 'Phone Mum');
  assert.equal(list.find(x => x.id === 'tdcall').due, '2026-11-22');
  list = T.applyChange(list, { id: 'tdbin', deleted: true }, now + 30);
  assert.equal(list.some(x => x.id === 'tdbin'), false);
  list = T.applyChange(list, { clearDone: true }, now + 40);
  assert.equal(list.some(x => x.done), false);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'tdcall');
});

test('appointments and list markers stay off the to-do list', () => {
  const T = load();
  const split = T.splitItems([
    { id: 'tdok', title: 'Walk Zeus', due: '2026-11-21' },
    { id: 'lst-home', title: 'Home', list: '#lists' },
    { id: 'ap1', title: 'Dentist', list: 'Appointments', due: '2026-11-22' },
    { id: 'gone', title: 'Old', deleted: true }
  ]);
  assert.deepEqual(split.items.map(x => x.id), ['tdok']);
});

test('today and overdue items are the ones for a home card', () => {
  const T = load();
  const today = '2026-11-21';
  const card = T.todayAndOverdue([
    { id: 'tdover', title: 'Overdue job', due: '2026-11-19' },
    { id: 'tdtoday', title: 'Today job', due: '2026-11-21' },
    { id: 'tdlater', title: 'Later job', due: '2026-11-25' },
    { id: 'tddone', title: 'Done today', due: '2026-11-21', done: true },
    { id: 'tdnone', title: 'No date' }
  ], today);
  assert.deepEqual(card.map(x => x.id), ['tdover', 'tdtoday']);
});

test('all-day .ics uses VALUE=DATE and an exclusive end date', () => {
  const T = load();
  const now = Date.parse('2026-11-21T10:00:00+13:00');
  const ics = T.icsForTodo({ id: 'tdmilk', title: 'Buy milk', due: '2026-11-22', notes: 'blue top' }, now, '2026-11-21');
  assert.match(ics, /^BEGIN:VCALENDAR\r\nVERSION:2.0\r\n/);
  assert.match(ics, /PRODID:-\/\/Info Book\/\/To-do\/\/EN/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261122/);
  assert.match(ics, /DTEND;VALUE=DATE:20261123/);
  assert.doesNotMatch(ics, /DTSTART:20\d{6}T/);
  assert.match(ics, /SUMMARY:Buy milk/);
  assert.match(ics, /DESCRIPTION:blue top/);
  assert.match(ics, /UID:tdmilk@infobook-todo/);
  assert.match(ics, /END:VEVENT\r\nEND:VCALENDAR\r\n/);
});

test('a to-do with a time gets timed UTC start and end in the .ics', () => {
  const T = load();
  const now = Date.parse('2026-11-21T10:00:00+13:00');
  const ics = T.icsForTodo({ id: 'tdbin', title: 'Bins', due: '2026-11-21', time: '09:00' }, now, '2026-11-21');
  const start = T.aucklandMs('2026-11-21', '09:00');
  const stamp = (ms) => {
    const d = new Date(ms), p = n => String(n).padStart(2, '0');
    return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
  };
  assert.match(ics, new RegExp('DTSTART:' + stamp(start)));
  assert.match(ics, new RegExp('DTEND:' + stamp(start + 3600000)));
  assert.doesNotMatch(ics, /VALUE=DATE/);
});

test('ics escaping and line folding stay valid', () => {
  const T = load();
  const now = Date.parse('2026-11-21T10:00:00+13:00');
  const ics = T.icsForTodo({ id: 'tdx', title: 'Milk, bread; "tea"', notes: 'Line 1\nLine 2', due: '2026-11-22' }, now, '2026-11-21');
  assert.match(ics, /SUMMARY:Milk\\, bread\\; "tea"/);
  assert.match(ics, /DESCRIPTION:Line 1\\nLine 2/);
  const long = T.icsForTodo({ id: 'tdlong', title: 'A'.repeat(90), due: '2026-11-22' }, now, '2026-11-21');
  const lines = long.split('\r\n');
  assert.ok(lines.some(l => l.startsWith('SUMMARY:') && l.length <= 75));
  assert.ok(lines.some(l => l.startsWith(' ') && l.includes('A')));
  for (const line of lines) {
    if (!line) continue;
    assert.ok(new TextEncoder().encode(line).length <= 75, 'line too long: ' + new TextEncoder().encode(line).length + ' ' + line.slice(0, 20));
  }
});

test('Google Calendar links use an all-day exclusive end, or a timed UTC range', () => {
  const T = load();
  const all = T.googleCalUrl({ title: 'Buy milk', due: '2026-11-22', notes: 'blue top' }, '2026-11-21');
  assert.ok(all.startsWith('https://calendar.google.com/calendar/render?'));
  assert.match(all, /action=TEMPLATE/);
  assert.match(all, /text=Buy%20milk/);
  assert.match(all, /dates=20261122\/20261123/);
  assert.match(all, /details=blue%20top/);
  const timed = T.googleCalUrl({ title: 'Bins', due: '2026-11-21', time: '09:00' }, '2026-11-21');
  const start = T.aucklandMs('2026-11-21', '09:00');
  const stamp = (ms) => {
    const d = new Date(ms), p = n => String(n).padStart(2, '0');
    return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
  };
  assert.match(timed, new RegExp('dates=' + stamp(start) + '/' + stamp(start + 3600000)));
});

test('an undated to-do still gets an all-day event on today', () => {
  const T = load();
  const now = Date.parse('2026-11-21T10:00:00+13:00');
  const ics = T.icsForTodo({ id: 'tdx', title: 'Sometime' }, now, '2026-11-21');
  assert.match(ics, /DTSTART;VALUE=DATE:20261121/);
  assert.match(ics, /DTEND;VALUE=DATE:20261122/);
  const url = T.googleCalUrl({ title: 'Sometime' }, '2026-11-21');
  assert.match(url, /dates=20261121\/20261122/);
});
