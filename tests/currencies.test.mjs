// 2.29.26: world currencies against the NZ dollar (helpers in app.js).
// Run: node tests/currencies.test.mjs
import fs from 'fs';
import assert from 'assert/strict';

const src = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const a = src.indexOf('/* ---- 2.29.26 World currencies: live rates against the NZ dollar ---- */');
const b = src.indexOf('/* ---- end world currencies helpers ---- */');
assert.ok(a >= 0 && b > a, 'currency helpers found in app.js');

const store = {};
const localStorage = {
  getItem: k => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
const api = new Function('localStorage', src.slice(a, b) + '; return { FX_LIST, FX_CACHE_KEY, fxNzDate, fxPrevWeekday, fxInvert, fxMergeRates, fxUnit, fxFmtNzd, fxFmtForeign, fxSym, fxChange, fxConvert, fxParseEr, fxParseFrank, fxUpdatedLabel, fxLoadCache, fxSaveCache, fxPromotePrev };')(localStorage);
const {
  FX_LIST, FX_CACHE_KEY, fxNzDate, fxPrevWeekday, fxInvert, fxMergeRates, fxUnit,
  fxFmtNzd, fxFmtForeign, fxSym, fxChange, fxConvert, fxParseEr, fxParseFrank,
  fxUpdatedLabel, fxLoadCache, fxSaveCache, fxPromotePrev
} = api;

let n = 0;
const ok = (name, f) => { f(); n++; console.log('ok', name); };

ok('USD is first, then the named travel currencies', () => {
  const codes = FX_LIST.map(x => x.code);
  assert.equal(codes[0], 'USD');
  for (const c of ['AUD', 'GBP', 'EUR', 'JPY', 'CNY', 'FJD', 'CAD', 'SGD', 'THB', 'KRW', 'PHP', 'IDR', 'PGK', 'WST', 'TOP', 'VUV', 'SBD', 'XPF']) {
    assert.ok(codes.includes(c), c);
  }
  assert.equal(new Set(codes).size, codes.length);
});

ok('inverts foreign-per-NZD rates to NZD per one unit', () => {
  const r = fxInvert({ USD: 0.5, JPY: 80, IDR: 10000, NZD: 1, BAD: 0 });
  assert.equal(r.USD, 2);
  assert.equal(r.JPY, 1 / 80);
  assert.equal(r.IDR, 0.0001);
  assert.equal(r.NZD, undefined);
  assert.equal(r.BAD, undefined);
});

ok('1 USD and 100 USD convert using NZD-per-unit rates', () => {
  const rates = { USD: 1.8207, AUD: 1.214 };
  assert.equal(fxConvert(1, 'USD', rates), 1.8207);
  assert.equal(fxConvert(100, 'USD', rates), 182.07);
  assert.ok(Math.abs(fxConvert(50, 'AUD', rates) - 60.7) < 1e-10);
  assert.equal(fxConvert('x', 'USD', rates), null);
  assert.equal(fxConvert(1, 'FJD', rates), null);
});

ok('formats NZD rates and converted amounts in en-NZ', () => {
  assert.equal(fxFmtNzd(1.8207), 'NZ$1.821');
  assert.equal(fxFmtNzd(182.07, true), 'NZ$182.07');
  assert.equal(fxFmtNzd(0.000104), 'NZ$0.000104');
  assert.equal(fxFmtForeign(87.75, 'JPY'), '88 JPY');
  assert.ok(fxSym('USD', 0.5492).startsWith('US$'));
});

ok('uses 100, 1,000 or 10,000 units for small rates', () => {
  assert.equal(fxUnit(1.82), 1);
  assert.equal(fxUnit(0.05), 100);
  assert.equal(fxUnit(0.005), 1000);
  assert.equal(fxUnit(0.0001), 10000);
});

ok('day change is up, down or flat from the previous day', () => {
  assert.equal(fxChange(1.82, 1.80).dir, 'up');
  assert.ok(fxChange(1.82, 1.80).label.startsWith('▲ '));
  assert.equal(fxChange(1.80, 1.82).dir, 'down');
  assert.equal(fxChange(1.82, 1.82).dir, 'flat');
  assert.equal(fxChange(1.82, 0).dir, '');
});

ok('previous weekday skips the weekend', () => {
  assert.equal(fxPrevWeekday('2026-11-20'), '2026-11-19'); // Friday -> Thursday
  assert.equal(fxPrevWeekday('2026-11-16'), '2026-11-13'); // Monday -> Friday
  assert.equal(fxPrevWeekday('2026-11-15'), '2026-11-13'); // Sunday -> Friday
});

ok('parses open.er-api.com and Frankfurter payloads', () => {
  const er = fxParseEr({ result: 'success', time_last_update_unix: 1795132952, rates: { USD: 0.5, FJD: 1.25, NZD: 1 } });
  assert.equal(er.source, 'open.er-api.com');
  assert.equal(er.rates.USD, 2);
  assert.ok(Math.abs(er.rates.FJD - 0.8) < 1e-12);
  assert.equal(er.date, fxNzDate(1795132952 * 1000));
  assert.equal(fxParseEr({ result: 'error' }), null);
  const fr = fxParseFrank({ amount: 1, base: 'NZD', date: '2026-11-19', rates: { USD: 0.55, THB: 18.7 } });
  assert.equal(fr.source, 'Frankfurter (ECB)');
  assert.equal(fr.date, '2026-11-19');
  assert.ok(Math.abs(fr.rates.USD - (1 / 0.55)) < 1e-12);
});

ok('updated label uses NZ time and names the zone', () => {
  const label = fxUpdatedLabel({ at: Date.parse('2026-11-20T00:02:32Z'), offline: false });
  assert.ok(label.startsWith('Updated '));
  assert.ok(label.includes('(NZ time)'));
  assert.ok(/20.*Nov|Nov.*20/.test(label));
  const off = fxUpdatedLabel({ at: Date.parse('2026-11-20T00:02:32Z'), offline: true });
  assert.ok(off.startsWith('Showing saved rates from '));
});

ok('cache keeps yesterday’s rates when a new day arrives', () => {
  const cached = { v: 1, date: '2026-11-19', rates: { USD: 1.80, FJD: 0.79 }, prev: { USD: 1.79 }, prevDate: '2026-11-18', at: 1, source: 'open.er-api.com' };
  fxSaveCache(cached);
  const loaded = fxLoadCache();
  assert.equal(loaded.rates.USD, 1.80);
  assert.equal(loaded.v, 1);
  assert.equal(FX_CACHE_KEY, 'fxRatesV1');
  const moved = fxPromotePrev(cached, { date: '2026-11-20', rates: { USD: 1.82 } });
  assert.equal(moved.prevDate, '2026-11-19');
  assert.equal(moved.prev.USD, 1.80);
  assert.equal(moved.prev.FJD, 0.79);
  const sameDay = fxPromotePrev(cached, { date: '2026-11-19', rates: { USD: 1.81 } });
  assert.equal(sameDay.prev.USD, 1.79);
  const filled = fxMergeRates({ FJD: 0.79 }, { USD: 1.80, FJD: 0.99 });
  assert.equal(filled.FJD, 0.79);
  assert.equal(filled.USD, 1.80);
});

ok('NZ calendar date is Pacific/Auckland', () => {
  // 20 Nov 2026 00:02 UTC is already 1:02 pm Friday in NZ (UTC+13)
  assert.equal(fxNzDate(Date.parse('2026-11-20T00:02:32Z')), '2026-11-20');
  // 19 Nov 2026 12:00 UTC is 1:00 am 20 Nov in NZ
  assert.equal(fxNzDate(Date.parse('2026-11-19T12:00:00Z')), '2026-11-20');
});

console.log(n + ' passed');
