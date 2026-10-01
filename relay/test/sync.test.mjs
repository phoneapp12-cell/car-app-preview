import { handle } from '../src/relay.js';
import { normSyncCode } from '../src/sync.js';
import { createRequire } from 'module';
import vm from 'vm';
import fs from 'fs';

const require = createRequire(import.meta.url);
const logicSrc = fs.readFileSync(new URL('../../sync-logic.js', import.meta.url), 'utf8');
const sandbox = { crypto, TextEncoder, TextDecoder, btoa, atob, globalThis: {} };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(logicSrc, sandbox);
const L = sandbox.SyncLogic;

let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const O = 'https://phoneapp12-cell.github.io';
const CODE = 'ABCD-EFGH-JKLM-NPQR';

ok(normSyncCode(CODE) === 'ABCDEFGHJKLMNPQR', 'worker accepts a dashed code');
ok(normSyncCode('abcd efgh jklm npqr') === 'ABCDEFGHJKLMNPQR', 'spaces and case ignored');
ok(normSyncCode('ABCDEFGHJKLMNPQ0') === '', 'zero is rejected');
ok(normSyncCode('SHORT') === '', 'short code rejected');
ok(L.normSyncCode(CODE) === normSyncCode(CODE), 'page and worker normalise the same way');
ok(L.formatSyncCode(CODE) === 'ABCD-EFGH-JKLM-NPQR', 'code is shown in four groups');

function memKV() {
  const m = new Map();
  return {
    async get(k, o) { const v = m.get(k); if (v == null) return null; return o && o.type === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { m.set(k, v); },
    size: () => m.size
  };
}
const post = (body, origin = O) => new Request('https://relay.example/sync', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body)
});
const env = () => ({ EVENTS_KV: memKV(), ALLOWED_ORIGIN: O });

const seed = {
  cars: [
    { id: 'car-mul27', name: "Shane's car", plate: 'MUL27', year: '2014', model: 'Honda Fit', colour: 'Silver', details: 'Hatch · petrol hybrid', hex: '#9AA3A8', wof: '2027-09-25', rego: '2026-12-25', wofMonths: 12 },
    { id: 'car-pnu312', name: "Sarah's car", plate: 'PNU312', year: '2022', model: 'Haval H6 Ultra Hybrid', colour: 'Blue', details: 'SUV · petrol hybrid', hex: '#2F5DA8', wof: '2026-10-16', rego: '2026-11-09', wofMonths: 12 },
    { id: 'car-kbz234', name: "Cass's car", plate: 'KBZ234', year: '2007', model: 'Honda Fit', colour: 'Blue', details: 'Hatch · petrol', hex: '#3C7DD9', wof: '2026-11-24', rego: '2026-11-15', wofMonths: 12 }
  ],
  bills: [], todos: [], appts: [], birthdays: [], ideas: [], feeds: [], pets: [], health: [], myEvents: [], loans: [], reminders: [],
  lists: ['Home', 'Cars', 'Shopping'], ideaCats: ['Gifts', 'Home', 'Trips', 'Other'],
  drivers: [
    { id: 'drv-shane', name: 'Shane', aaNo: '', aaType: '', aaExpiry: '', licNo: '', licClass: '', licExpiry: '', notes: '' },
    { id: 'drv-sarah', name: 'Sarah', aaNo: '', aaType: '', aaExpiry: '', licNo: '', licClass: '', licExpiry: '', notes: '' },
    { id: 'drv-cass', name: 'Cass', aaNo: '', aaType: '', aaExpiry: '', licNo: '', licClass: '', licExpiry: '', notes: '' }
  ],
  meals: { nights: [5, 6], plan: {}, ideas: [{ id: 'meal-rice', title: 'Rice', builtin: true, hidden: false, fav: false }] },
  shop: { items: [] }, garden: { off: [], done: {} }, commission: { anchor: '', entries: [] },
  settings: { name: 'Shane', theme: 'teal', textSize: 'md', dailyQuote: true }
};

ok(!L.hasPersonal(seed), 'starter records are not personal');
ok(L.decideSync(seed, null) === 'push', 'empty cloud: upload this device');
const phone = JSON.parse(JSON.stringify(seed));
phone.bills.push({ id: 'bill-1', name: 'Power' });
phone.todos.push({ id: 'todo-1', title: 'Bins' });
phone.updatedAt = '2026-10-01T01:00:00.000Z';
ok(L.hasPersonal(phone), 'bills and to-dos count as personal');
const laptopSeed = JSON.parse(JSON.stringify(seed));
laptopSeed.updatedAt = '2026-10-02T01:00:00.000Z';
ok(L.decideSync(phone, { data: laptopSeed }) === 'push', 'newer starter laptop does not wipe a phone that has records');
ok(L.decideSync(laptopSeed, { data: phone }) === 'pull', 'starter laptop takes the phone records');
const other = JSON.parse(JSON.stringify(phone));
other.updatedAt = '2026-10-02T02:00:00.000Z';
other.reminders = [{ id: 'r1', title: 'Call', date: '2026-10-03', time: '09:00' }];
ok(L.decideSync(phone, { data: other }) === 'pull', 'both personal: newer updatedAt wins');
ok(L.decideSync(other, { data: phone }) === 'push', 'local newer personal blob is pushed');
ok(L.decideSync(phone, { data: JSON.parse(JSON.stringify(phone)) }) === 'same', 'equal stamp does nothing');
const meals = JSON.parse(JSON.stringify(seed));
meals.meals.plan['2026-10-02'] = { title: 'Soup' };
ok(L.hasPersonal(meals), 'a planned meal counts');
const bday = JSON.parse(JSON.stringify(seed));
bday.birthdays.push({ id: 'b1', name: 'Sam' });
ok(L.hasPersonal(bday), 'a birthday counts');

const enc = await L.encryptSync(CODE, { data: phone, local: { theme: '{"t":"dark","auto":false}', textSize: 'lg', dailyQuote: '0' } });
const back = await L.decryptSync(CODE, enc.iv, enc.ct);
ok(back.data.bills[0].name === 'Power' && back.local.textSize === 'lg', 'encrypt round trip keeps records and local settings');
let bad = false;
try { await L.decryptSync('ZZZZ-ZZZZ-ZZZZ-ZZZZ', enc.iv, enc.ct); } catch (e) { bad = true; }
ok(bad, 'wrong code cannot decrypt');

let r = await handle(post({ op: 'pull', code: CODE }), env());
ok(r.status === 200 && (await r.json()).empty === true, 'pull of a new code is empty');
const e1 = env();
r = await handle(post({ op: 'push', code: CODE, updatedAt: '2026-10-01T01:00:00.000Z', iv: enc.iv, ct: enc.ct }), e1);
ok(r.status === 200 && (await r.json()).stored === true, 'first push stores the blob');
r = await handle(post({ op: 'pull', code: 'abcd-efgh-jklm-npqr' }), e1);
let pulled = await r.json();
ok(r.status === 200 && pulled.empty === false && pulled.ct === enc.ct && pulled.updatedAt === '2026-10-01T01:00:00.000Z', 'pull returns the same ciphertext');
const enc2 = await L.encryptSync(CODE, { data: other, local: {} });
r = await handle(post({ op: 'push', code: CODE, updatedAt: '2026-09-01T00:00:00.000Z', iv: enc2.iv, ct: enc2.ct }), e1);
const older = await r.json();
ok(older.stored === false && older.reason === 'older' && older.ct === enc.ct, 'older push does not wipe the newer blob');
r = await handle(post({ op: 'push', code: CODE, updatedAt: '2026-10-02T02:00:00.000Z', iv: enc2.iv, ct: enc2.ct }), e1);
ok((await r.json()).stored === true, 'newer push replaces the blob');
r = await handle(post({ op: 'pull', code: CODE }), e1);
ok((await r.json()).ct === enc2.ct, 'pull sees the newer blob');
r = await handle(post({ op: 'push', code: CODE, updatedAt: 'nope', iv: enc.iv, ct: enc.ct }), e1);
ok(r.status === 400, 'push without a real time is refused');
r = await handle(post({ op: 'push', code: 'BAD', updatedAt: '2026-10-01T01:00:00.000Z', iv: enc.iv, ct: enc.ct }), e1);
ok(r.status === 400 && (await r.json()).error === 'bad_code', 'bad code refused');
r = await handle(post({ op: 'pull', code: CODE }, 'https://evil.example'), e1);
ok(r.status === 403, 'other origin refused');
r = await handle(post({ op: 'pull', code: CODE }), {});
ok(r.status === 503 && (await r.json()).error === 'sync_unavailable', 'missing KV is reported');
r = await handle(new Request('https://relay.example/sync', { method: 'POST', headers: { Origin: O, 'Content-Length': '3000000' }, body: '{}' }), e1);
ok(r.status === 413, 'oversized body refused');
r = await handle(new Request('https://relay.example/health'), e1);
ok(r.status === 200, 'health still works');

console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
