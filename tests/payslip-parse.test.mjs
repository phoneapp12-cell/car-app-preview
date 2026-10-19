// 2.27.12 regression test (commission): the commission payslip reader (cpParse) and the payslip ↔ work fortnight match.
// Run: node tests/payslip-parse.test.mjs. Amounts are invented; no real payslip is kept in this repo.
import fs from 'fs'; import assert from 'assert/strict';
const src = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const a = src.indexOf('// 2.27.12: tolerant payslip reader'), b = src.indexOf('function myPending');
assert.ok(a > 0 && b > a, 'payslip reader found in app.js');
const DAY = 864e5, parseD = s => Date.parse(s + 'T00:00:00Z'), dayGap = (x, y) => Math.round((parseD(x) - parseD(y)) / DAY);
const addDays = (s, n) => new Date(parseD(s) + n * DAY).toISOString().slice(0, 10);
let SLIPS = []; const CM = () => ({ slips: SLIPS });
const api = new Function('dayGap', 'addDays', 'CM', 'parseD', src.slice(a, b) + '; return { cpParse, cpSlipForWork, myLandFor };')(dayGap, addDays, CM, parseD);
const { cpParse, cpSlipForWork, myLandFor } = api;
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const HEAD = 'Noel Leeming   SALESPERSON COMMISSION REPORT   October 19, 2026, 7:27:29 AM   Page 1\n FOR 5/10/2026 to 18/10/2026\n SALESPERSON:\nBRANCH:\n';
const COLS = ' DATE   TURNOVER   SFM   SALES   TS AND PP   TS AND PP   SPIVs   BONUS   TOTAL\nEX GST   EX GST   COMMISSION   EX GST   COMMISSION   COMMISSION\n';
const ROWS = [['01/10/26', '100.00   5.00   1.00   0.00   0.00   0.00   0.00   10.00'], ['05/10/26', '900.00   45.00   9.00   10.00   1.00   20.00   0.00   30.00'],
  ['10/10/26', '50.00-   2.50-   0.50-   0.00   0.00   0.00   0.00   2.50-'], ['18/10/26', '1,200.00   60.00   12.00   0.00   0.00   15.00   0.00   1,012.50']];
const TOT = ' 2,150.00   107.50   21.50   10.00   1.00   35.00   0.00   1,050.00\n SPIVs\nDATE   REFERENCE   ITEM   QUANTITY   SELLING   BONUS\n 05/10/26   1234567   7654321   SOME PHONE CASE   1   69.00   10.00\n';
const pdfjsText = HEAD + COLS + ROWS.map(r => ' ' + r[0] + '   ' + r[1]).join('\n') + '\n' + TOT;
const want = { from: '2026-10-05', to: '2026-10-18', cents: 105000, days: { '2026-10-01': 1000, '2026-10-05': 3000, '2026-10-10': -250, '2026-10-18': 101250 } };
ok('pdf.js line layout (as in the app)', () => assert.deepEqual(cpParse(pdfjsText), want));
ok('pdftotext -layout style spacing', () => assert.deepEqual(cpParse(pdfjsText.replace(/   /g, '          ')), want));
ok('one text stream (no line breaks between cells)', () => assert.deepEqual(cpParse(pdfjsText.replace(/\n/g, ' ')), want));
ok('minus sign split off the number, $ signs', () => assert.deepEqual(cpParse(pdfjsText.replace('2.50-   0.00   0.00   0.00   0.00   2.50-', '2.50 -   0.00   0.00   0.00   0.00   $2.50 -')).cents, 105000));
ok('dates with dashes and 2-digit years in the period', () => assert.equal(cpParse(pdfjsText.replace('FOR 5/10/2026 to 18/10/2026', 'Period 05-10-26 – 18-10-26')).from, '2026-10-05'));
ok('month-name period', () => assert.equal(cpParse(pdfjsText.replace('FOR 5/10/2026 to 18/10/2026', '5 October 2026 to 18 October 2026')).to, '2026-10-18'));
ok('no period in the text: from the attachment name', () => { const r = cpParse(pdfjsText.replace(/ FOR 5\/10\/2026 to 18\/10\/2026\n/, ''), 'Commission Payslip Ending 18-10-2026.pdf'); assert.equal(r.from, '2026-10-05'); assert.equal(r.to, '2026-10-18'); assert.equal(r.cents, 105000); });
ok('rows that do not add up: payroll total is used', () => { const r = cpParse(pdfjsText.replace('1,012.50\n', '1,000.00\n')); assert.equal(r.cents, 105000); assert.equal(r.approx, true); });
ok('nothing readable: null (never guesses)', () => assert.equal(cpParse('Hello\nNo table here'), null));
ok('his pay lands on the Wednesday nearest the Bills payday', () => { ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-24'].forEach(d => assert.equal(myLandFor({ start: d }), '2026-10-21', d)); });
ok('Wed 21 Oct pay uses the 5-18 Oct payslip ($799.87)', () => { SLIPS = [{ from: '2026-10-05', to: '2026-10-18', cents: 79987 }, { from: '2026-09-21', to: '2026-10-04', cents: 50000 }];
  assert.equal(cpSlipForWork({ start: '2026-10-05', end: '2026-10-18' }).cents, 79987); assert.equal(cpSlipForWork({ start: '2026-10-06', end: '2026-10-19' }).cents, 79987); });
ok('payslip matches the work fortnight by overlap, not exact dates', () => {
  SLIPS = [{ from: '2026-10-04', to: '2026-10-17', cents: 105000 }]; assert.equal(cpSlipForWork({ start: '2026-10-05', end: '2026-10-18' }).cents, 105000);
  SLIPS = [{ from: '2026-10-05', to: '2026-10-18', cents: 105000 }]; assert.equal(cpSlipForWork({ start: '2026-10-05', end: '2026-10-18' }).cents, 105000);
  SLIPS = [{ from: '2026-10-12', to: '2026-10-25', cents: 105000 }]; assert.equal(cpSlipForWork({ start: '2026-10-05', end: '2026-10-18' }), null);
  SLIPS = [{ from: '2026-10-05', to: '2026-10-18', cents: 1, mine: true }]; assert.equal(cpSlipForWork({ start: '2026-10-05', end: '2026-10-18' }), null); });
console.log(n + ' passed');
