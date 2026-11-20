import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const calSrc = read('../feed/cal.js');
const css = read('../feed/cal-book.css');
const extras = read('../feed/extras.js');

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

const CARS = [
  { plate: 'MUL27', mid: 'shane', name: 'Shane', at: 0, car: { name: "Shane's car", plate: 'MUL27', wof: '2026-12-04', rego: '2026-11-28', svc: '2026-12-20' } },
  { plate: 'PNU312', mid: 'cass', name: 'Cass', at: 0, car: { name: "Cass's car", plate: 'PNU312', wof: '2027-03-11', rego: '2027-01-15' } },
  { plate: 'KBZ234', mid: 'sarah', name: 'Sarah', at: 0, car: { name: "Sarah's car", plate: 'KBZ234', wof: '2026-11-30', rego: '2027-02-02' } }
];

test('the calendar card links to NZTA Check Expiry and does not pretend to look dates up', () => {
  const { ibCal } = loadCal({ IS_FRIEND: false });
  assert.equal(ibCal.NZTA_EXPIRY, 'https://transact.nzta.govt.nz/v2/check-expiry');
  const card = ibCal.plateCardHtml();
  assert.match(card, /href="https:\/\/transact\.nzta\.govt\.nz\/v2\/check-expiry"/);
  assert.match(card, /target="_blank"/);
  assert.match(card, /rel="noopener noreferrer"/);
  assert.match(card, /Check expiry on NZTA/);
  assert.match(card, /We don.t look the dates up for you/);
  assert.match(card, /name="wof"/);
  assert.match(card, /name="rego"/);
  assert.match(card, /name="name"/);
  assert.match(card, /name="plate"/);
  assert.doesNotMatch(card, /just enter your number plate/i);
  assert.doesNotMatch(card, /we will look up/i);
  assert.match(css, /\.cal-plate/);
  ibCal.setView('month');
  ibCal.setCursor('2026-11-21');
  assert.match(ibCal.viewHtml(), /data-calplateform/);
});

test('saving plate dates writes private WOF and rego events with the NZTA source noted', () => {
  const { ibCal } = loadCal({ IS_FRIEND: false, X: { cars: [], dates: [] } });
  assert.equal(ibCal.savePlateDates({ name: 'Blue Civic', plate: 'abc123' }).length, 0);
  const saved = ibCal.savePlateDates({ name: 'Blue Civic', plate: 'abc123', wof: '2026-12-10', rego: '2027-01-20', remind: 'd1' });
  assert.equal(saved.length, 2);
  assert.equal(saved[0].kind, 'wof');
  assert.equal(saved[0].title, 'Blue Civic WOF');
  assert.equal(saved[0].date, '2026-12-10');
  assert.equal(saved[0].plate, 'ABC123');
  assert.equal(saved[0].remind, 'd1');
  assert.equal(saved[0].url, 'https://transact.nzta.govt.nz/v2/check-expiry');
  assert.match(saved[0].note, /NZTA Check Expiry/);
  assert.equal(saved[1].kind, 'rego');
  assert.equal(saved[1].title, 'Blue Civic rego');
  const evs = ibCal.allEvents('2026-12-01', '2027-01-31');
  assert.ok(evs.some(e => e.kind === 'wof' && e.src === 'cal' && e.title === 'Blue Civic WOF'));
  assert.ok(evs.some(e => e.kind === 'rego' && e.src === 'cal'));
  assert.equal(ibCal.savePlateDates({ wof: 'not-a-date' }).length, 0);
});

test('Shane sees WOF, rego and service dates for Shane, Cass and Sarah from /cars, labelled by owner', () => {
  const { ibCal } = loadCal({ IS_FRIEND: false, X: { cars: CARS, dates: [] } });
  const evs = ibCal.carEvents('2026-11-01', '2027-12-31');
  const titles = evs.map(e => e.title).sort();
  assert.ok(titles.includes("Shane's car WOF"));
  assert.ok(titles.includes("Shane's car rego"));
  assert.ok(titles.includes("Shane's car service"));
  assert.ok(titles.includes("Cass's car WOF"));
  assert.ok(titles.includes("Sarah's car WOF"));
  assert.equal(evs.find(e => e.title === "Shane's car WOF").date, '2026-12-04');
  assert.equal(evs.find(e => e.title === "Shane's car WOF").src, 'cars');
  assert.equal(evs.find(e => e.title === "Shane's car WOF").readOnly, true);
  assert.ok(ibCal.allEvents('2026-11-01', '2026-12-31').some(e => e.title === "Sarah's car WOF" && e.date === '2026-11-30'));
});

test('friends never see family car dates, even if /cars data is present', () => {
  const { ibCal } = loadCal({ IS_FRIEND: true, X: { cars: CARS, dates: [{ kind: 'bday', title: 'Jess', m: 11, d: 24, days: 3 }] } });
  assert.equal(ibCal.carShareList().length, 0);
  assert.equal(ibCal.carEvents('2026-11-01', '2027-12-31').length, 0);
  const evs = ibCal.allEvents('2026-11-01', '2027-12-31');
  assert.ok(!evs.some(e => /Shane|Cass|Sarah|MUL27|PNU312|KBZ234/i.test(e.title)));
  assert.ok(!evs.some(e => e.src === 'cars' || e.src === 'family'));
  ibCal.setView('month');
  ibCal.setCursor('2026-11-21');
  const html = ibCal.viewHtml();
  assert.doesNotMatch(html, /Shane's car/);
  assert.doesNotMatch(html, />Cars</);
  assert.match(html, /data-calplateform/); // a friend can still add their own dates
});

test('a personal WOF date already entered is not duplicated from /cars', () => {
  const { ibCal } = loadCal({ IS_FRIEND: false, X: { cars: CARS, dates: [] } });
  ibCal.savePlateDates({ name: "Shane's car", plate: 'MUL27', wof: '2026-12-04', remind: 'd1' });
  const evs = ibCal.allEvents('2026-12-01', '2026-12-31').filter(e => e.date === '2026-12-04' && /WOF/.test(e.title));
  assert.equal(evs.length, 1);
  assert.equal(evs[0].src, 'cal');
});

test('this change does not add car WOF or rego cards to the feed', () => {
  assert.doesNotMatch(extras, /transact\.nzta\.govt\.nz/);
  assert.doesNotMatch(extras, /Check expiry on NZTA/);
  const diff = execSync('git diff origin/main -- feed/extras.js feed/today.js', { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.equal(diff, '');
});
