/* 2.28.31: Direct Cloudflare Worker SolarZero Live Updater (Zero Grok Bot Usage).
   Calls api-web.solarzero.co.nz directly from the Worker on GET /power?refresh=1 and on the scheduled() cron. */
import { seal, open } from "./akahu.js";

const SITE_ID = "SC-20-050429";
const TZ = "Pacific/Auckland";
const SESS_KEY = "sz-sess-v3";
const POWER_KEY = "power-v2";

const DEFAULT_POWER_DOC = {"updatedAt":"2026-10-26T09:44:20.592Z","source":"MySolarZero (read in browser)","today":{"date":"2026-10-26","usedKWh":39.28,"solarKWh":10.3,"gridImportKWh":30.38,"gridExportKWh":0.24,"fromSolarPct":16,"fromBatteryPct":17,"fromGridPct":67,"batteryPct":20,"liveHomeKW":3.07,"hourly":[{"h":0,"importKWh":1.07,"exportKWh":0,"homeKWh":0.97,"solarKWh":0},{"h":1,"importKWh":2.52,"exportKWh":0,"homeKWh":0.92,"solarKWh":0},{"h":2,"importKWh":2.41,"exportKWh":0,"homeKWh":1.91,"solarKWh":0},{"h":3,"importKWh":0.83,"exportKWh":0,"homeKWh":0.73,"solarKWh":0},{"h":4,"importKWh":1.21,"exportKWh":0,"homeKWh":0.91,"solarKWh":0},{"h":5,"importKWh":1.8,"exportKWh":0,"homeKWh":1.8,"solarKWh":0},{"h":6,"importKWh":1.32,"exportKWh":0,"homeKWh":1.32,"solarKWh":0},{"h":7,"importKWh":0.49,"exportKWh":0,"homeKWh":1.59,"solarKWh":0.1},{"h":8,"importKWh":0.36,"exportKWh":0,"homeKWh":1.74,"solarKWh":0.8},{"h":9,"importKWh":0.08,"exportKWh":0,"homeKWh":1.2,"solarKWh":1.2},{"h":10,"importKWh":0.47,"exportKWh":0.12,"homeKWh":1.31,"solarKWh":1.2},{"h":11,"importKWh":0.07,"exportKWh":0,"homeKWh":1.1,"solarKWh":1.3},{"h":12,"importKWh":0.12,"exportKWh":0,"homeKWh":1.52,"solarKWh":1.4},{"h":13,"importKWh":0.48,"exportKWh":0,"homeKWh":2.04,"solarKWh":1.2},{"h":14,"importKWh":1.93,"exportKWh":0.12,"homeKWh":1.75,"solarKWh":0.8},{"h":15,"importKWh":1.91,"exportKWh":0,"homeKWh":1.31,"solarKWh":0.9},{"h":16,"importKWh":1.68,"exportKWh":0,"homeKWh":2.08,"solarKWh":0.7},{"h":17,"importKWh":1.09,"exportKWh":0,"homeKWh":3.35,"solarKWh":0.6},{"h":18,"importKWh":0.36,"exportKWh":0,"homeKWh":1.26,"solarKWh":0.1},{"h":19,"importKWh":1.2,"exportKWh":0,"homeKWh":1.7,"solarKWh":0},{"h":20,"importKWh":2.88,"exportKWh":0,"homeKWh":2.78,"solarKWh":0},{"h":21,"importKWh":3.25,"exportKWh":0,"homeKWh":3.25,"solarKWh":0},{"h":22,"importKWh":2.87,"exportKWh":0,"homeKWh":2.77,"solarKWh":0}],"cost":{"method":"hourly","bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":16.37,"cost":2.36},"offpeak":{"kWh":14.03,"cost":1.42}},"importKWh":30.4,"exportKWh":0.24,"daily":3.22,"exportCredit":0.02,"total":6.97},"periods":{"periods":[{"key":"night","label":"Night","from":0,"to":6,"hours":6,"status":"done","importKWh":9.84,"exportKWh":0,"cost":0.99,"bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":0,"cost":0},"offpeak":{"kWh":9.84,"cost":0.99}},"homeKWh":7.24,"solarKWh":0},{"key":"morning","label":"Morning","from":6,"to":12,"hours":6,"status":"done","importKWh":2.79,"exportKWh":0.12,"cost":0.33,"bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":1.47,"cost":0.21},"offpeak":{"kWh":1.32,"cost":0.13}},"homeKWh":8.26,"solarKWh":4.6},{"key":"day","label":"Day","from":12,"to":18,"hours":6,"status":"done","importKWh":7.21,"exportKWh":0.12,"cost":1.03,"bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":7.21,"cost":1.04},"offpeak":{"kWh":0,"cost":0}},"homeKWh":12.05,"solarKWh":5.6},{"key":"evening","label":"Evening","from":18,"to":24,"hours":5,"status":"partial","importKWh":10.56,"exportKWh":0,"cost":1.4,"bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":7.69,"cost":1.11},"offpeak":{"kWh":2.87,"cost":0.29}},"homeKWh":11.76,"solarKWh":0.1}],"mostCost":"evening","daily":3.22,"hasHome":true,"hasSolar":true,"hoursIn":23}},"month":{"label":"Oct 2026","usedKWh":1086.36,"avgPerDayKWh":41.78,"days":26,"solarKWh":317.8,"gridImportKWh":826.68,"gridExportKWh":31.92,"daily":[{"date":"2026-10-01","importKWh":35.04,"exportKWh":0.12},{"date":"2026-10-02","importKWh":37.09,"exportKWh":0.36},{"date":"2026-10-03","importKWh":54.11,"exportKWh":0.6},{"date":"2026-10-04","importKWh":42.49,"exportKWh":0},{"date":"2026-10-05","importKWh":37.44,"exportKWh":0},{"date":"2026-10-06","importKWh":29.64,"exportKWh":0.96},{"date":"2026-10-07","importKWh":32.15,"exportKWh":1.32},{"date":"2026-10-08","importKWh":23.64,"exportKWh":2.04},{"date":"2026-10-09","importKWh":33.85,"exportKWh":0.36},{"date":"2026-10-10","importKWh":43.68,"exportKWh":0.12},{"date":"2026-10-11","importKWh":28.68,"exportKWh":0.24},{"date":"2026-10-12","importKWh":23.15,"exportKWh":0.72},{"date":"2026-10-13","importKWh":31.32,"exportKWh":0.6},{"date":"2026-10-14","importKWh":28.08,"exportKWh":0.24},{"date":"2026-10-15","importKWh":31.32,"exportKWh":0.12},{"date":"2026-10-16","importKWh":25.92,"exportKWh":2.28},{"date":"2026-10-17","importKWh":29.89,"exportKWh":2.64},{"date":"2026-10-18","importKWh":23.52,"exportKWh":3.96},{"date":"2026-10-19","importKWh":30,"exportKWh":3.48},{"date":"2026-10-20","importKWh":33.49,"exportKWh":5.16},{"date":"2026-10-21","importKWh":29.64,"exportKWh":0.12},{"date":"2026-10-22","importKWh":21.83,"exportKWh":3.6},{"date":"2026-10-23","importKWh":27.13,"exportKWh":2.28},{"date":"2026-10-24","importKWh":29.15,"exportKWh":0.36},{"date":"2026-10-25","importKWh":34.21,"exportKWh":0},{"date":"2026-10-26","importKWh":30.23,"exportKWh":0.24}],"cost":{"total":188.48,"days":26,"hourlyDays":11,"mixDays":15,"importKWh":826.69,"exportKWh":31.92,"daily":83.72,"mixRate":0.132,"mixSource":"Sep 2026 bill","estimate":true}},"year":{"label":"Jul 2025 – Jun 2026","usedKWh":17219.96,"solarKWh":3583,"savingsNZD":2255.26,"costWithSolarNZD":3812.88,"previousRetailerCostNZD":6068.14},"bills":[{"month":"Jul 2026","kWh":1445.51,"totalInclGST":293.23,"periodEnd":"2026-07-31","issued":"2026-08-07","due":"2026-08-21","balance":496.63},{"month":"Aug 2026","kWh":1329.6,"totalInclGST":272.9,"periodEnd":"2026-08-31","issued":"2026-09-08","due":"2026-09-22","balance":519.53},{"month":"Sep 2026","kWh":1083.33,"totalInclGST":237.87,"periodEnd":"2026-09-30","issued":"2026-10-12","due":"2026-10-26","balance":652.86,"carriedOver":414.99,"lateFee":5.46}],"tou":{"daily":3.22,"peak":0.272,"shoulder":0.144,"offpeak":0.101,"exportCredit":0.092},"compare":{"checkedAt":"2026-10-17","subscriptionNZD":143,"usageKWhYear":17220,"current":[{"month":"Jul 2026","billNZD":293.23},{"month":"Aug 2026","billNZD":272.9},{"month":"Sep 2026","billNZD":237.87}],"currentYear":{"label":"Jul 2025 – Jun 2026","gridNZD":3812.88,"note":"Grid cost from SolarZero’s savings report"},"source":"Selectra NZ price data for the Northpower network (incl GST and lines charges)","sourceUrl":"https://selectra.nz/energy/electricity-prices/compare-electricity-prices-nz","notCompared":["Ecotricity’s other plans (prices only shown for an address)","Flick (spot price, nothing published)","Contact’s standard-user plans and Nova’s single-meter plan (not in the data)","Meridian (only hot water meter plans listed)","Frank Energy (no longer sold)","Electric Kiwi Everyday (data looks wrong)"],"notes":["Estimates for your whole house use with no solar or battery, on a standard single meter.","No prompt-payment, bundle or Northpower yearly discounts, and no Electric Kiwi free hour.","Time-of-use plans assume a typical peak/off-peak split. Without the battery more of your use would be at peak, so those could cost more.","Your current cost is your Ecotricity bill plus the $143 a month SolarZero subscription."],"usageKWhMonth":1435,"plans":[{"retailer":"Octopus","plan":"Flexi / Peaker","user":"standard","dailyNZD":4.67,"avgC":21.1,"monthNZD":445,"yearNZD":5335,"checked":"2026-08-12","url":"https://octopusenergy.nz"},{"retailer":"Genesis","plan":"EVHome","user":"standard","dailyNZD":3.52,"avgC":29,"monthNZD":523,"yearNZD":6279,"checked":"2026-09-17","url":"https://www.genesisenergy.co.nz/for-home/products/electricity/plans-pricing"},{"retailer":"Powershop","plan":"Uncontrolled (Standard User)","user":"standard","dailyNZD":4.14,"avgC":27.7,"monthNZD":524,"yearNZD":6285,"checked":"2026-10-17","url":"https://www.powershop.co.nz/our-rates/"},{"retailer":"Mercury","plan":"Flex Rates","user":"standard","dailyNZD":3.93,"avgC":29,"monthNZD":535,"yearNZD":6424,"checked":"2026-08-12","url":"https://www.mercury.co.nz"},{"retailer":"Octopus","plan":"Flexi / Peaker (Low User)","user":"low","dailyNZD":1.73,"avgC":34.3,"monthNZD":545,"yearNZD":6538,"checked":"2026-08-12","url":"https://octopusenergy.nz"},{"retailer":"Electric Kiwi","plan":"Sunday Saver","user":"standard","dailyNZD":3.96,"avgC":29.6,"monthNZD":546,"yearNZD":6547,"checked":"2026-09-09","url":"https://www.electrickiwi.co.nz/power/plans"},{"retailer":"Genesis","plan":"Time-Varied Pricing","user":"standard","dailyNZD":3.37,"avgC":31,"monthNZD":548,"yearNZD":6572,"checked":"2026-08-12","url":"https://www.genesisenergy.co.nz/for-home/products/electricity/plans-pricing"},{"retailer":"Pulse Energy","plan":"Power Shift Plan","user":"standard","dailyNZD":4.26,"avgC":30,"monthNZD":561,"yearNZD":6727,"checked":"2026-09-16","url":"https://pulseenergy.co.nz"},{"retailer":"Genesis","plan":"EVHome (Low User)","user":"low","dailyNZD":1.67,"avgC":35.6,"monthNZD":562,"yearNZD":6745,"checked":"2026-09-17","url":"https://www.genesisenergy.co.nz/for-home/products/electricity/plans-pricing"},{"retailer":"Electric Kiwi","plan":"Sunday Saver (Low User)","user":"low","dailyNZD":2.07,"avgC":34.8,"monthNZD":562,"yearNZD":6746,"checked":"2026-09-09","url":"https://www.electrickiwi.co.nz/power/plans"},{"retailer":"Contact Energy","plan":"Good Charge (Low User)","user":"low","dailyNZD":2.07,"avgC":35.3,"monthNZD":570,"yearNZD":6837,"checked":"2026-08-12","url":"https://contact.co.nz/support/plans-and-pricing"},{"retailer":"Powershop","plan":"Uncontrolled (Low User)","user":"low","dailyNZD":1.96,"avgC":37.7,"monthNZD":600,"yearNZD":7203,"checked":"2026-10-17","url":"https://www.powershop.co.nz/our-rates/"},{"retailer":"Genesis","plan":"Time-Varied Pricing (Low User)","user":"low","dailyNZD":1.67,"avgC":38.7,"monthNZD":607,"yearNZD":7279,"checked":"2026-08-12","url":"https://www.genesisenergy.co.nz/for-home/products/electricity/plans-pricing"},{"retailer":"Mercury","plan":"Flex Rates (Low User)","user":"low","dailyNZD":1.73,"avgC":38.7,"monthNZD":608,"yearNZD":7300,"checked":"2026-08-12","url":"https://www.mercury.co.nz"},{"retailer":"Pulse Energy","plan":"Anytime Plan","user":"standard","dailyNZD":5.37,"avgC":31.1,"monthNZD":609,"yearNZD":7312,"checked":"2026-09-17","url":"https://pulseenergy.co.nz"},{"retailer":"Contact Energy","plan":"Good Weekends (Low User)","user":"low","dailyNZD":2.07,"avgC":38.3,"monthNZD":613,"yearNZD":7351,"checked":"2026-08-12","url":"https://contact.co.nz/support/plans-and-pricing"},{"retailer":"Electric Kiwi","plan":"MoveMaster (Low User)","user":"low","dailyNZD":1.6,"avgC":40.1,"monthNZD":624,"yearNZD":7485,"checked":"2026-09-17","url":"https://www.electrickiwi.co.nz/power/plans"},{"retailer":"Pulse Energy","plan":"Power Shift Plan (Low User)","user":"low","dailyNZD":2.07,"avgC":40,"monthNZD":637,"yearNZD":7647,"checked":"2026-09-01","url":"https://pulseenergy.co.nz"},{"retailer":"Electric Kiwi","plan":"MoveMaster","user":"standard","dailyNZD":2.5,"avgC":39.3,"monthNZD":640,"yearNZD":7681,"checked":"2026-09-17","url":"https://www.electrickiwi.co.nz/power/plans"},{"retailer":"Contact Energy","plan":"Good Nights (Low User)","user":"low","dailyNZD":2.07,"avgC":41.6,"monthNZD":660,"yearNZD":7918,"checked":"2026-09-17","url":"https://contact.co.nz/support/plans-and-pricing"}]},"week":{"from":"2026-10-20","to":"2026-10-26","days":[{"date":"2026-10-20","cost":7.22,"method":"hourly"},{"date":"2026-10-21","cost":7.04,"method":"hourly"},{"date":"2026-10-22","cost":5.6,"method":"hourly"},{"date":"2026-10-23","cost":7.01,"method":"hourly"},{"date":"2026-10-24","cost":6.77,"method":"hourly"},{"date":"2026-10-25","cost":7.47,"method":"hourly"},{"date":"2026-10-26","cost":6.97,"method":"hourly","partial":true,"hours":23}],"total":48.08,"projected":48.32,"todayProjected":7.21,"projMethod":"yesterday-rest","avgPerDay":6.9,"daysCounted":7,"missing":[],"estimate":true},"arrears":{"bill":"Sep 2026","startBalance":652.86,"periodEnd":"2026-09-30","issued":"2026-10-12","due":"2026-10-26","carriedOver":414.99,"lateFee":5.46,"billCharges":237.87,"usedSince":188.48,"usedDays":26,"gap":false,"weeklyUse":48.32,"estimate":true},"notices":[{"id":"pn-eco75","at":"2026-10-17T16:54:36+13:00","title":"Ecotricity set to $75 a week","body":"Covers your power use (about $48-60 a week) and clears the arrears (about $779) around May 2027. I'll check each new bill and adjust if needed.","kind":"payment","level":"info"}],"yesterday":{"date":"2026-10-25","hourly":[{"h":0,"importKWh":1.08,"exportKWh":0,"homeKWh":0.98,"solarKWh":0},{"h":1,"importKWh":3.24,"exportKWh":0,"homeKWh":1.64,"solarKWh":0},{"h":2,"importKWh":1.32,"exportKWh":0,"homeKWh":0.72,"solarKWh":0},{"h":3,"importKWh":0.97,"exportKWh":0,"homeKWh":0.67,"solarKWh":0},{"h":4,"importKWh":2.16,"exportKWh":0,"homeKWh":2.16,"solarKWh":0},{"h":5,"importKWh":1.68,"exportKWh":0,"homeKWh":1.58,"solarKWh":0},{"h":6,"importKWh":1.32,"exportKWh":0,"homeKWh":1.32,"solarKWh":0},{"h":7,"importKWh":0.13,"exportKWh":0,"homeKWh":1.43,"solarKWh":0},{"h":8,"importKWh":0.6,"exportKWh":0,"homeKWh":1.3,"solarKWh":0.4},{"h":9,"importKWh":0.47,"exportKWh":0,"homeKWh":0.97,"solarKWh":0.8},{"h":10,"importKWh":0.96,"exportKWh":0,"homeKWh":2.36,"solarKWh":1.1},{"h":11,"importKWh":0.12,"exportKWh":0,"homeKWh":0.91,"solarKWh":0.9},{"h":12,"importKWh":3.49,"exportKWh":0,"homeKWh":4.11,"solarKWh":0.8},{"h":13,"importKWh":2.87,"exportKWh":0,"homeKWh":3.87,"solarKWh":0.9},{"h":14,"importKWh":2.04,"exportKWh":0,"homeKWh":2.12,"solarKWh":1.4},{"h":15,"importKWh":2.52,"exportKWh":0,"homeKWh":2.22,"solarKWh":1},{"h":16,"importKWh":0.72,"exportKWh":0,"homeKWh":1.42,"solarKWh":0.7},{"h":17,"importKWh":0.6,"exportKWh":0,"homeKWh":1.1,"solarKWh":0.5},{"h":18,"importKWh":0.96,"exportKWh":0,"homeKWh":1.16,"solarKWh":0.2},{"h":19,"importKWh":0.97,"exportKWh":0,"homeKWh":2.87,"solarKWh":0},{"h":20,"importKWh":1.07,"exportKWh":0,"homeKWh":1.37,"solarKWh":0},{"h":21,"importKWh":1.08,"exportKWh":0,"homeKWh":1.08,"solarKWh":0},{"h":22,"importKWh":1.44,"exportKWh":0,"homeKWh":1.34,"solarKWh":0},{"h":23,"importKWh":2.41,"exportKWh":0,"homeKWh":2.41,"solarKWh":0}],"importKWh":34.22,"exportKWh":0,"cost":{"method":"hourly","bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":18.6,"cost":2.68},"offpeak":{"kWh":15.62,"cost":1.58}},"importKWh":34.22,"exportKWh":0,"daily":3.22,"exportCredit":0,"total":7.47},"periods":{"periods":[{"key":"night","label":"Night","from":0,"to":6,"hours":6,"status":"done","importKWh":10.45,"exportKWh":0,"cost":1.05,"bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":0,"cost":0},"offpeak":{"kWh":10.45,"cost":1.05}},"homeKWh":7.75,"solarKWh":0},{"key":"morning","label":"Morning","from":6,"to":12,"hours":6,"status":"done","importKWh":3.6,"exportKWh":0,"cost":0.46,"bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":2.28,"cost":0.33},"offpeak":{"kWh":1.32,"cost":0.13}},"homeKWh":8.29,"solarKWh":3.2},{"key":"day","label":"Day","from":12,"to":18,"hours":6,"status":"done","importKWh":12.24,"exportKWh":0,"cost":1.76,"bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":12.24,"cost":1.76},"offpeak":{"kWh":0,"cost":0}},"homeKWh":14.84,"solarKWh":5.3},{"key":"evening","label":"Evening","from":18,"to":24,"hours":6,"status":"done","importKWh":7.93,"exportKWh":0,"cost":0.98,"bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":4.08,"cost":0.59},"offpeak":{"kWh":3.85,"cost":0.39}},"homeKWh":10.23,"solarKWh":0.2}],"mostCost":"day","daily":3.22,"hasHome":true,"hasSolar":true,"hoursIn":24}}};

const R = {
  energy: 0.08, loss: 0.0764, levy: 0.0016,
  net: { peak: 0.1491, shoulder: 0.0374, offpeak: 0 },
  exp: 0.08, expNet: { peakWinter: -0.0347, shoulder: 0.01, offpeak: 0.01 },
  daily: 2.80, gst: 1.15
};
const MIX = { peak: 96.66, shoulder: 391.59, offpeak: 595.08, src: "Sep 2026 bill" };
const HOL = new Set(["2026-01-01","2026-01-02","2026-02-02","2026-02-06","2026-04-03","2026-04-06","2026-04-27","2026-06-01","2026-07-10","2026-10-26","2026-12-25","2026-12-28","2027-01-01","2027-01-04","2027-02-01","2027-02-08","2027-03-26","2027-03-29","2027-04-26","2027-06-07","2027-06-25","2027-10-25","2027-12-27","2027-12-28"]);
const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
const workday = date => { const w = new Date(date + "T12:00:00Z").getUTCDay(); return w > 0 && w < 6 && !HOL.has(date); };
function bandAt(date, mins) {
  if (mins < 420 || mins >= 1320) return "offpeak";
  if (!workday(date)) return "shoulder";
  return (mins < 570 || (mins >= 1050 && mins < 1200)) ? "peak" : "shoulder";
}
const impRate = b => R.energy * (1 + R.loss) + R.levy + R.net[b];
const winter = d => { const m = +d.slice(5, 7); return m >= 5 && m <= 9; };
const expNet = (d, b) => b === "peak" ? (winter(d) ? R.expNet.peakWinter : 0) : R.expNet[b];

export function dayCost(date, hourly) {
  const k = { peak: 0, shoulder: 0, offpeak: 0 }, c = { peak: 0, shoulder: 0, offpeak: 0 };
  let exp = 0, expC = 0;
  for (const x of (hourly || [])) for (const half of [0, 30]) {
    const b = bandAt(date, x.h * 60 + half), i = (+x.importKWh || 0) / 2, e = (+x.exportKWh || 0) / 2;
    k[b] += i; c[b] += i * impRate(b); exp += e; expC += e * (R.exp - expNet(date, b));
  }
  const out = { method: "hourly", bands: {} };
  for (const b of ["peak", "shoulder", "offpeak"]) out.bands[b] = { kWh: r2(k[b]), cost: r2(c[b] * R.gst) };
  out.importKWh = r2(k.peak + k.shoulder + k.offpeak); out.exportKWh = r2(exp);
  out.daily = r2(R.daily * R.gst); out.exportCredit = r2(expC * R.gst);
  out.total = r2((c.peak + c.shoulder + c.offpeak + R.daily - expC) * R.gst);
  return out;
}

const PERIODS = [["night", "Night", 0, 6], ["morning", "Morning", 6, 12], ["day", "Day", 12, 18], ["evening", "Evening", 18, 24]];
function periodSplit(date, hourly, isToday) {
  const by = new Map((hourly || []).map(x => [+x.h, x]));
  const hasHome = (hourly || []).some(x => x.homeKWh != null), hasSolar = (hourly || []).some(x => x.solarKWh != null);
  const out = PERIODS.map(([key, label, a, b]) => {
    const hrs = []; for (let h = a; h < b; h++) if (by.has(h)) hrs.push(by.get(h));
    const p = { key, label, from: a, to: b, hours: hrs.length, status: hrs.length === 0 ? (isToday ? "todo" : "nodata") : hrs.length < b - a ? "partial" : "done" };
    if (hrs.length) {
      const c = dayCost(date, hrs);
      p.importKWh = c.importKWh; p.exportKWh = c.exportKWh;
      p.cost = r2(c.total - c.daily);
      p.bands = { peak: c.bands.peak, shoulder: c.bands.shoulder, offpeak: c.bands.offpeak };
      if (hasHome) p.homeKWh = r2(hrs.reduce((s, x) => s + (+x.homeKWh || 0), 0));
      if (hasSolar) p.solarKWh = r2(hrs.reduce((s, x) => s + (+x.solarKWh || 0), 0));
    }
    return p;
  });
  const done = out.filter(p => p.cost != null), top = done.slice().sort((x, y) => y.cost - x.cost)[0];
  return { periods: out, mostCost: top ? top.key : null, daily: r2(R.daily * R.gst), hasHome, hasSolar, hoursIn: (hourly || []).length };
}

const mixT = MIX.peak + MIX.shoulder + MIX.offpeak;
const mixRate = (MIX.peak * impRate("peak") + MIX.shoulder * impRate("shoulder") + MIX.offpeak * impRate("offpeak")) / mixT;
const dayCostMix = (imp, exp) => r2((imp * mixRate + R.daily - exp * (R.exp - R.expNet.shoulder)) * R.gst);

function nzParts(ms = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour, year: p.year, month: +p.month };
}

let pwrMem = null;

export async function getPowerDoc(env) {
  if (pwrMem && pwrMem.updatedAt) return pwrMem;
  if (env && env.EVENTS_KV) {
    try {
      const raw = await env.EVENTS_KV.get(POWER_KEY);
      if (raw) {
        const d = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (d && d.updatedAt && d.today && d.today.date >= DEFAULT_POWER_DOC.today.date) {
          pwrMem = d;
          return d;
        }
      }
    } catch (e) {}
  }
  pwrMem = JSON.parse(JSON.stringify(DEFAULT_POWER_DOC));
  return pwrMem;
}

async function getSzSessionList(env) {
  const list = [];
  if (env && env.EVENTS_KV && env.AKAHU_ENC_KEY) {
    try {
      const enc = await env.EVENTS_KV.get(SESS_KEY);
      if (enc) {
        const s = await open(env, enc);
        if (s && s.refresh_token && s.session_id) list.push({ src: "kv", map: s });
      }
    } catch (e) {}
  }
  if (env && env.SZ_SESSION_JSON) {
    try {
      const s = JSON.parse(env.SZ_SESSION_JSON);
      if (s && s.refresh_token && s.session_id) list.push({ src: "secret", map: s });
    } catch (e) {}
  }
  return list;
}

export async function refreshSolarZero(env, fetchImpl = fetch, now = Date.now()) {
  const candidates = await getSzSessionList(env);
  if (!candidates.length) return await getPowerDoc(env);

  let updatedCookieMap = null;
  let authTokens = null;
  for (const cand of candidates) {
    const map = cand.map;
    const cookieHeader = `refresh_token=${map.refresh_token}; session_id=${map.session_id}; remember=${map.remember || "true"}; access_token=${map.access_token || ""}; id_token=${map.id_token || ""}; expiry_millis=1000`;
    try {
      const sRes = await fetchImpl("https://api-web.solarzero.co.nz/v1/auth/current/session", {
        headers: {
          "Content-Type": "application/json",
          "Origin": "https://my.solarzero.co.nz",
          "Referer": "https://my.solarzero.co.nz/",
          "x-correlation-id": crypto.randomUUID(),
          "Cookie": cookieHeader
        }
      });
      if (!sRes.ok) continue;
      const nextCookies = { ...map };
      const sc = typeof sRes.headers.getSetCookie === "function" ? sRes.headers.getSetCookie() : [];
      for (const line of sc) {
        const kv = String(line).split(";")[0];
        const eq = kv.indexOf("=");
        if (eq > 0) {
          const k = kv.slice(0, eq).trim();
          const v = kv.slice(eq + 1).trim();
          if (v) nextCookies[k] = v;
        }
      }
      const sess = await sRes.json();
      if (!sess || !sess.accessToken || !sess.idToken) continue;
      updatedCookieMap = nextCookies;
      authTokens = {
        accessToken: sess.accessToken,
        idToken: sess.idToken,
        sessionId: sess.sessionId || map.session_id
      };
      break;
    } catch (e) {}
  }
  if (!updatedCookieMap || !authTokens) return await getPowerDoc(env);

  if (env && env.EVENTS_KV && env.AKAHU_ENC_KEY) {
    try { await env.EVENTS_KV.put(SESS_KEY, await seal(env, updatedCookieMap)); } catch (e) {}
  }

  const newCookieHeader = `refresh_token=${updatedCookieMap.refresh_token}; session_id=${updatedCookieMap.session_id}; remember=${updatedCookieMap.remember}; access_token=${updatedCookieMap.access_token}; id_token=${updatedCookieMap.id_token}; expiry_millis=${updatedCookieMap.expiry_millis || "1000"}`;
  const headers = {
    "Content-Type": "application/json",
    "Origin": "https://my.solarzero.co.nz",
    "Referer": "https://my.solarzero.co.nz/",
    "Authorization": "Bearer " + authTokens.accessToken,
    "x-id": authTokens.idToken,
    "x-session-id": authTokens.sessionId,
    "x-correlation-id": crypto.randomUUID(),
    "Cookie": newCookieHeader
  };

  const today = nzParts(now);
  const yest = nzParts(now - 86400e3);

  const [dash, perfToday, perfYest, perfMonth] = await Promise.all([
    fetchImpl("https://api-web.solarzero.co.nz/v1/dashboard/data", {
      method: "POST", headers,
      body: JSON.stringify({ siteId: SITE_ID, timezone: TZ, providerId: "nz-ecotricity", hasTou: false })
    }).then(r => r.json()),
    fetchImpl("https://api-web.solarzero.co.nz/v1/performance/data", {
      method: "POST", headers,
      body: JSON.stringify({ siteId: SITE_ID, timezone: TZ, date: today.date, hasTou: false, interval: "hour" })
    }).then(r => r.json()),
    fetchImpl("https://api-web.solarzero.co.nz/v1/performance/data", {
      method: "POST", headers,
      body: JSON.stringify({ siteId: SITE_ID, timezone: TZ, date: yest.date, hasTou: false, interval: "hour" })
    }).then(r => r.json()),
    fetchImpl("https://api-web.solarzero.co.nz/v1/performance/data", {
      method: "POST", headers,
      body: JSON.stringify({ siteId: SITE_ID, timezone: TZ, date: today.date, hasTou: false, interval: "day" })
    }).then(r => r.json())
  ]);

  const extractHourly = (rep, maxHour = 23) => {
    if (!rep || !rep.grid || !rep.grid.series) return [];
    const imp = rep.grid.series.import || [];
    const exp = rep.grid.series.export || [];
    const home = (rep.home && rep.home.series) || [];
    const sol = (rep.solar && rep.solar.series) || [];
    const out = [];
    for (let h = 0; h <= maxHour && h < 24; h++) {
      out.push({
        h,
        importKWh: r3(+(imp[h] || 0)),
        exportKWh: r3(Math.abs(+(exp[h] || 0))),
        homeKWh: r3(+(home[h] || 0)),
        solarKWh: r3(+(sol[h] || 0))
      });
    }
    return out;
  };

  const tRep = perfToday && perfToday.reports && perfToday.reports[0];
  const yRep = perfYest && perfYest.reports && perfYest.reports[0];
  const mRep = perfMonth && perfMonth.reports && perfMonth.reports[0];

  const tHourly = extractHourly(tRep, today.hour);
  const yHourly = extractHourly(yRep, 23);

  if ((!dash || !dash.cards) && (!tRep || !tRep.grid)) return await getPowerDoc(env);
  const P = JSON.parse(JSON.stringify(await getPowerDoc(env)));
  P.updatedAt = new Date(now).toISOString();
  P.source = "MySolarZero (live API)";

  const tCost = tHourly.length ? dayCost(today.date, tHourly) : null;
  P.today = {
    date: today.date,
    usedKWh: +(dash?.cards?.homeUsageTotal?.value ?? tRep?.home?.total ?? 0),
    solarKWh: +(dash?.cards?.solarUtilTotal?.value ?? tRep?.solar?.total ?? 0),
    gridImportKWh: +(dash?.cards?.gridImportTotal?.value ?? tRep?.grid?.total ?? 0),
    gridExportKWh: Math.abs(+(dash?.cards?.gridExportTotal?.value ?? tRep?.grid?.total2 ?? 0)),
    fromSolarPct: +(tRep?.home?.summarySolar ?? 0),
    fromBatteryPct: +(tRep?.home?.summaryBattery ?? 0),
    fromGridPct: +(tRep?.home?.summaryGrid ?? 100),
    batteryPct: +(dash?.monitor?.battery?.charged ?? 0),
    liveHomeKW: +(dash?.energyFlow?.home ?? 0),
    hourly: tHourly,
    cost: tCost,
    periods: tHourly.length ? periodSplit(today.date, tHourly, true) : null
  };

  if (yHourly.length) {
    const yCost = dayCost(yest.date, yHourly);
    P.yesterday = {
      date: yest.date,
      hourly: yHourly,
      importKWh: yCost.importKWh,
      exportKWh: yCost.exportKWh,
      cost: yCost,
      periods: periodSplit(yest.date, yHourly, false)
    };
  }

  const MON_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mName = MON_NAMES[today.month - 1] || "Oct";
  if (mRep && mRep.grid && mRep.grid.series) {
    const mImp = mRep.grid.series.import || [];
    const mExp = mRep.grid.series.export || [];
    const mHome = (mRep.home && mRep.home.series) || [];
    const daily = [];
    for (let i = 0; i < mImp.length; i++) {
      const iv = +(mImp[i] || 0), ev = Math.abs(+(mExp[i] || 0)), hv = +(mHome[i] || 0);
      if (iv > 0 || ev > 0 || hv > 0) {
        daily.push({
          date: `${today.year}-${String(today.month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
          importKWh: iv,
          exportKWh: ev
        });
      }
    }
    let tot = 0, impSum = 0, expSum = 0;
    for (const d of daily) {
      if (d.date === today.date && tCost) tot += tCost.total;
      else if (d.date === yest.date && P.yesterday && P.yesterday.cost) tot += P.yesterday.cost.total;
      else tot += dayCostMix(d.importKWh, d.exportKWh);
      impSum += d.importKWh;
      expSum += d.exportKWh;
    }
    P.month = {
      label: `${mName} ${today.year}`,
      usedKWh: +(mRep.home?.total ?? 0),
      avgPerDayKWh: +(mRep.home?.average ?? 0),
      days: daily.length,
      solarKWh: +(mRep.solar?.total ?? 0),
      gridImportKWh: +(mRep.grid?.total ?? 0),
      gridExportKWh: Math.abs(+(mRep.grid?.total2 ?? 0)),
      daily,
      cost: {
        total: r2(tot),
        days: daily.length,
        hourlyDays: 2,
        mixDays: Math.max(0, daily.length - 2),
        importKWh: r2(impSum),
        exportKWh: r2(expSum),
        daily: r2(R.daily * R.gst * daily.length),
        mixRate: r3(mixRate * R.gst),
        mixSource: MIX.src,
        estimate: true
      }
    };
    // Update 7-day week block
    const addD = (iso, n) => { const x = new Date(iso + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
    const byDate = new Map(daily.map(d => [d.date, d]));
    const wkDays = [];
    for (let k = 6; k >= 0; k--) {
      const dStr = addD(today.date, -k);
      if (k === 0 && tCost) wkDays.push({ date: dStr, cost: tCost.total, method: "hourly", partial: true, hours: tHourly.length });
      else if (dStr === yest.date && P.yesterday && P.yesterday.cost) wkDays.push({ date: dStr, cost: P.yesterday.cost.total, method: "hourly" });
      else if (byDate.has(dStr)) { const dd = byDate.get(dStr); wkDays.push({ date: dStr, cost: dayCostMix(dd.importKWh, dd.exportKWh), method: "daily-mix" }); }
      else wkDays.push({ date: dStr, cost: null, method: "missing" });
    }
    const have = wkDays.filter(d => d.cost != null), wkTot = r2(have.reduce((a, d) => a + d.cost, 0));
    let todayProj = tCost ? tCost.total : 0;
    if (yHourly.length && tCost) {
      const rest = yHourly.filter(x => +x.h > today.hour);
      const rc = dayCost(today.date, rest);
      todayProj = r2(tCost.total + rc.total - rc.daily);
    }
    const projected = r2(wkTot - (tCost ? tCost.total : 0) + todayProj);
    P.week = {
      from: wkDays[0].date, to: wkDays[6].date, days: wkDays,
      total: wkTot, projected, todayProjected: todayProj, projMethod: "yesterday-rest",
      avgPerDay: r2(projected / Math.max(1, have.length)), daysCounted: have.length, missing: []
    };
    if (P.arrears) {
      P.arrears.usedSince = P.month.cost.total;
      P.arrears.usedDays = daily.length;
      P.arrears.weeklyUse = projected;
    }
  }

  pwrMem = P;
  if (env && env.EVENTS_KV) {
    try { await env.EVENTS_KV.put(POWER_KEY, JSON.stringify(P)); } catch (e) {}
  }
  return P;
}
