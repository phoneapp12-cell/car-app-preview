/* 2.28.31: Direct Cloudflare Worker SolarZero Live Updater (Zero Grok Bot Usage).
   Calls api-web.solarzero.co.nz directly from the Worker on GET /power?refresh=1 and on the scheduled() cron. */
import { seal, open } from "./akahu.js";

const SITE_ID = "SC-20-050429";
const TZ = "Pacific/Auckland";
const SESS_KEY = "sz-sess-v1";
const POWER_KEY = "power-v1";

const DEFAULT_POWER_DOC = {"updatedAt":"2026-10-24T20:31:53.840Z","source":"MySolarZero (read in browser)","today":{"date":"2026-10-25","usedKWh":12.46,"solarKWh":0.7,"gridImportKWh":12.96,"gridExportKWh":0,"fromSolarPct":3,"fromBatteryPct":15,"fromGridPct":82,"batteryPct":25,"liveHomeKW":0.49,"hourly":[{"h":0,"importKWh":1.08,"exportKWh":0,"homeKWh":0.98,"solarKWh":0},{"h":1,"importKWh":3.24,"exportKWh":0,"homeKWh":1.64,"solarKWh":0},{"h":2,"importKWh":1.32,"exportKWh":0,"homeKWh":0.72,"solarKWh":0},{"h":3,"importKWh":0.97,"exportKWh":0,"homeKWh":0.67,"solarKWh":0},{"h":4,"importKWh":2.16,"exportKWh":0,"homeKWh":2.16,"solarKWh":0},{"h":5,"importKWh":1.68,"exportKWh":0,"homeKWh":1.58,"solarKWh":0},{"h":6,"importKWh":1.32,"exportKWh":0,"homeKWh":1.32,"solarKWh":0},{"h":7,"importKWh":0.13,"exportKWh":0,"homeKWh":1.43,"solarKWh":0},{"h":8,"importKWh":0.6,"exportKWh":0,"homeKWh":1.3,"solarKWh":0.4},{"h":9,"importKWh":0.47,"exportKWh":0,"homeKWh":0.67,"solarKWh":0.3}],"cost":{"method":"hourly","bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":1.2,"cost":0.17},"offpeak":{"kWh":11.77,"cost":1.19}},"importKWh":12.97,"exportKWh":0,"daily":3.22,"exportCredit":0,"total":4.58},"periods":{"periods":[{"key":"night","label":"Night","from":0,"to":6,"hours":6,"status":"done","importKWh":10.45,"exportKWh":0,"cost":1.05,"bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":0,"cost":0},"offpeak":{"kWh":10.45,"cost":1.05}},"homeKWh":7.75,"solarKWh":0},{"key":"morning","label":"Morning","from":6,"to":12,"hours":4,"status":"partial","importKWh":2.52,"exportKWh":0,"cost":0.31,"bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":1.2,"cost":0.17},"offpeak":{"kWh":1.32,"cost":0.13}},"homeKWh":4.72,"solarKWh":0.7},{"key":"day","label":"Day","from":12,"to":18,"hours":0,"status":"todo"},{"key":"evening","label":"Evening","from":18,"to":24,"hours":0,"status":"todo"}],"mostCost":"night","daily":3.22,"hasHome":true,"hasSolar":true,"hoursIn":10}},"month":{"label":"Oct 2026","usedKWh":1017.92,"avgPerDayKWh":40.72,"days":25,"solarKWh":299.5,"gridImportKWh":775.2,"gridExportKWh":31.68,"daily":[{"date":"2026-10-01","importKWh":35.04,"exportKWh":0.12},{"date":"2026-10-02","importKWh":37.09,"exportKWh":0.36},{"date":"2026-10-03","importKWh":54.11,"exportKWh":0.6},{"date":"2026-10-04","importKWh":42.49,"exportKWh":0},{"date":"2026-10-05","importKWh":37.44,"exportKWh":0},{"date":"2026-10-06","importKWh":29.64,"exportKWh":0.96},{"date":"2026-10-07","importKWh":32.15,"exportKWh":1.32},{"date":"2026-10-08","importKWh":23.64,"exportKWh":2.04},{"date":"2026-10-09","importKWh":33.85,"exportKWh":0.36},{"date":"2026-10-10","importKWh":43.68,"exportKWh":0.12},{"date":"2026-10-11","importKWh":28.68,"exportKWh":0.24},{"date":"2026-10-12","importKWh":23.15,"exportKWh":0.72},{"date":"2026-10-13","importKWh":31.32,"exportKWh":0.6},{"date":"2026-10-14","importKWh":28.08,"exportKWh":0.24},{"date":"2026-10-15","importKWh":31.32,"exportKWh":0.12},{"date":"2026-10-16","importKWh":25.92,"exportKWh":2.28},{"date":"2026-10-17","importKWh":29.89,"exportKWh":2.64},{"date":"2026-10-18","importKWh":23.52,"exportKWh":3.96},{"date":"2026-10-19","importKWh":30,"exportKWh":3.48},{"date":"2026-10-20","importKWh":33.49,"exportKWh":5.16},{"date":"2026-10-21","importKWh":29.64,"exportKWh":0.12},{"date":"2026-10-22","importKWh":21.83,"exportKWh":3.6},{"date":"2026-10-23","importKWh":27.13,"exportKWh":2.28},{"date":"2026-10-24","importKWh":29.15,"exportKWh":0.36},{"date":"2026-10-25","importKWh":12.96,"exportKWh":0}],"cost":{"total":178.62,"days":25,"hourlyDays":10,"mixDays":15,"importKWh":775.21,"exportKWh":31.68,"daily":80.5,"mixRate":0.132,"mixSource":"Sep 2026 bill","estimate":true}},"year":{"label":"Jul 2025 – Jun 2026","usedKWh":17219.96,"solarKWh":3583,"savingsNZD":2255.26,"costWithSolarNZD":3812.88,"previousRetailerCostNZD":6068.14},"bills":[{"month":"Jul 2026","kWh":1445.51,"totalInclGST":293.23,"periodEnd":"2026-07-31","issued":"2026-08-07","due":"2026-08-21","balance":496.63},{"month":"Aug 2026","kWh":1329.6,"totalInclGST":272.9,"periodEnd":"2026-08-31","issued":"2026-09-08","due":"2026-09-22","balance":519.53},{"month":"Sep 2026","kWh":1083.33,"totalInclGST":237.87,"periodEnd":"2026-09-30","issued":"2026-10-12","due":"2026-10-26","balance":652.86,"carriedOver":414.99,"lateFee":5.46}],"tou":{"daily":3.22,"peak":0.272,"shoulder":0.144,"offpeak":0.101,"exportCredit":0.092},"compare":{"checkedAt":"2026-10-17","subscriptionNZD":143,"usageKWhYear":17220,"current":[{"month":"Jul 2026","billNZD":293.23},{"month":"Aug 2026","billNZD":272.9},{"month":"Sep 2026","billNZD":237.87}],"currentYear":{"label":"Jul 2025 – Jun 2026","gridNZD":3812.88,"note":"Grid cost from SolarZero’s savings report"},"source":"Selectra NZ price data for the Northpower network (incl GST and lines charges)","sourceUrl":"https://selectra.nz/energy/electricity-prices/compare-electricity-prices-nz","notCompared":["Ecotricity’s other plans (prices only shown for an address)","Flick (spot price, nothing published)","Contact’s standard-user plans and Nova’s single-meter plan (not in the data)","Meridian (only hot water meter plans listed)","Frank Energy (no longer sold)","Electric Kiwi Everyday (data looks wrong)"],"notes":["Estimates for your whole house use with no solar or battery, on a standard single meter.","No prompt-payment, bundle or Northpower yearly discounts, and no Electric Kiwi free hour.","Time-of-use plans assume a typical peak/off-peak split. Without the battery more of your use would be at peak, so those could cost more.","Your current cost is your Ecotricity bill plus the $143 a month SolarZero subscription."],"usageKWhMonth":1435,"plans":[{"retailer":"Octopus","plan":"Flexi / Peaker","user":"standard","dailyNZD":4.67,"avgC":21.1,"monthNZD":445,"yearNZD":5335,"checked":"2026-08-12","url":"https://octopusenergy.nz"},{"retailer":"Genesis","plan":"EVHome","user":"standard","dailyNZD":3.52,"avgC":29,"monthNZD":523,"yearNZD":6279,"checked":"2026-09-17","url":"https://www.genesisenergy.co.nz/for-home/products/electricity/plans-pricing"},{"retailer":"Powershop","plan":"Uncontrolled (Standard User)","user":"standard","dailyNZD":4.14,"avgC":27.7,"monthNZD":524,"yearNZD":6285,"checked":"2026-10-17","url":"https://www.powershop.co.nz/our-rates/"},{"retailer":"Mercury","plan":"Flex Rates","user":"standard","dailyNZD":3.93,"avgC":29,"monthNZD":535,"yearNZD":6424,"checked":"2026-08-12","url":"https://www.mercury.co.nz"},{"retailer":"Octopus","plan":"Flexi / Peaker (Low User)","user":"low","dailyNZD":1.73,"avgC":34.3,"monthNZD":545,"yearNZD":6538,"checked":"2026-08-12","url":"https://octopusenergy.nz"},{"retailer":"Electric Kiwi","plan":"Sunday Saver","user":"standard","dailyNZD":3.96,"avgC":29.6,"monthNZD":546,"yearNZD":6547,"checked":"2026-09-09","url":"https://www.electrickiwi.co.nz/power/plans"},{"retailer":"Genesis","plan":"Time-Varied Pricing","user":"standard","dailyNZD":3.37,"avgC":31,"monthNZD":548,"yearNZD":6572,"checked":"2026-08-12","url":"https://www.genesisenergy.co.nz/for-home/products/electricity/plans-pricing"},{"retailer":"Pulse Energy","plan":"Power Shift Plan","user":"standard","dailyNZD":4.26,"avgC":30,"monthNZD":561,"yearNZD":6727,"checked":"2026-09-16","url":"https://pulseenergy.co.nz"},{"retailer":"Genesis","plan":"EVHome (Low User)","user":"low","dailyNZD":1.67,"avgC":35.6,"monthNZD":562,"yearNZD":6745,"checked":"2026-09-17","url":"https://www.genesisenergy.co.nz/for-home/products/electricity/plans-pricing"},{"retailer":"Electric Kiwi","plan":"Sunday Saver (Low User)","user":"low","dailyNZD":2.07,"avgC":34.8,"monthNZD":562,"yearNZD":6746,"checked":"2026-09-09","url":"https://www.electrickiwi.co.nz/power/plans"},{"retailer":"Contact Energy","plan":"Good Charge (Low User)","user":"low","dailyNZD":2.07,"avgC":35.3,"monthNZD":570,"yearNZD":6837,"checked":"2026-08-12","url":"https://contact.co.nz/support/plans-and-pricing"},{"retailer":"Powershop","plan":"Uncontrolled (Low User)","user":"low","dailyNZD":1.96,"avgC":37.7,"monthNZD":600,"yearNZD":7203,"checked":"2026-10-17","url":"https://www.powershop.co.nz/our-rates/"},{"retailer":"Genesis","plan":"Time-Varied Pricing (Low User)","user":"low","dailyNZD":1.67,"avgC":38.7,"monthNZD":607,"yearNZD":7279,"checked":"2026-08-12","url":"https://www.genesisenergy.co.nz/for-home/products/electricity/plans-pricing"},{"retailer":"Mercury","plan":"Flex Rates (Low User)","user":"low","dailyNZD":1.73,"avgC":38.7,"monthNZD":608,"yearNZD":7300,"checked":"2026-08-12","url":"https://www.mercury.co.nz"},{"retailer":"Pulse Energy","plan":"Anytime Plan","user":"standard","dailyNZD":5.37,"avgC":31.1,"monthNZD":609,"yearNZD":7312,"checked":"2026-09-17","url":"https://pulseenergy.co.nz"},{"retailer":"Contact Energy","plan":"Good Weekends (Low User)","user":"low","dailyNZD":2.07,"avgC":38.3,"monthNZD":613,"yearNZD":7351,"checked":"2026-08-12","url":"https://contact.co.nz/support/plans-and-pricing"},{"retailer":"Electric Kiwi","plan":"MoveMaster (Low User)","user":"low","dailyNZD":1.6,"avgC":40.1,"monthNZD":624,"yearNZD":7485,"checked":"2026-09-17","url":"https://www.electrickiwi.co.nz/power/plans"},{"retailer":"Pulse Energy","plan":"Power Shift Plan (Low User)","user":"low","dailyNZD":2.07,"avgC":40,"monthNZD":637,"yearNZD":7647,"checked":"2026-09-01","url":"https://pulseenergy.co.nz"},{"retailer":"Electric Kiwi","plan":"MoveMaster","user":"standard","dailyNZD":2.5,"avgC":39.3,"monthNZD":640,"yearNZD":7681,"checked":"2026-09-17","url":"https://www.electrickiwi.co.nz/power/plans"},{"retailer":"Contact Energy","plan":"Good Nights (Low User)","user":"low","dailyNZD":2.07,"avgC":41.6,"monthNZD":660,"yearNZD":7918,"checked":"2026-09-17","url":"https://contact.co.nz/support/plans-and-pricing"}]},"week":{"from":"2026-10-19","to":"2026-10-25","days":[{"date":"2026-10-19","cost":6.93,"method":"hourly"},{"date":"2026-10-20","cost":7.22,"method":"hourly"},{"date":"2026-10-21","cost":7.04,"method":"hourly"},{"date":"2026-10-22","cost":5.6,"method":"hourly"},{"date":"2026-10-23","cost":7.01,"method":"hourly"},{"date":"2026-10-24","cost":6.77,"method":"hourly"},{"date":"2026-10-25","cost":4.58,"method":"hourly","partial":true,"hours":10}],"total":45.15,"projected":47.26,"todayProjected":6.69,"projMethod":"yesterday-rest","avgPerDay":6.75,"daysCounted":7,"missing":[],"estimate":true},"arrears":{"bill":"Sep 2026","startBalance":652.86,"periodEnd":"2026-09-30","issued":"2026-10-12","due":"2026-10-26","carriedOver":414.99,"lateFee":5.46,"billCharges":237.87,"usedSince":178.62,"usedDays":25,"gap":false,"weeklyUse":47.26,"estimate":true},"notices":[{"id":"pn-eco75","at":"2026-10-17T16:54:36+13:00","title":"Ecotricity set to $75 a week","body":"Covers your power use (about $48-60 a week) and clears the arrears (about $779) around May 2027. I'll check each new bill and adjust if needed.","kind":"payment","level":"info"}],"yesterday":{"date":"2026-10-24","hourly":[{"h":0,"importKWh":0.59,"exportKWh":0,"homeKWh":0.49,"solarKWh":0},{"h":1,"importKWh":2.77,"exportKWh":0,"homeKWh":1.07,"solarKWh":0},{"h":2,"importKWh":2.15,"exportKWh":0,"homeKWh":1.65,"solarKWh":0},{"h":3,"importKWh":1.57,"exportKWh":0,"homeKWh":1.37,"solarKWh":0},{"h":4,"importKWh":0.96,"exportKWh":0,"homeKWh":0.86,"solarKWh":0},{"h":5,"importKWh":2.4,"exportKWh":0,"homeKWh":2.4,"solarKWh":0},{"h":6,"importKWh":1.44,"exportKWh":0,"homeKWh":1.34,"solarKWh":0},{"h":7,"importKWh":0,"exportKWh":0,"homeKWh":1.1,"solarKWh":0.2},{"h":8,"importKWh":1.08,"exportKWh":0,"homeKWh":2.11,"solarKWh":0.4},{"h":9,"importKWh":0.6,"exportKWh":0,"homeKWh":1.6,"solarKWh":0.9},{"h":10,"importKWh":3.85,"exportKWh":0,"homeKWh":5.05,"solarKWh":1.3},{"h":11,"importKWh":0.14,"exportKWh":0,"homeKWh":1.64,"solarKWh":2.3},{"h":12,"importKWh":0.12,"exportKWh":0,"homeKWh":2.12,"solarKWh":1.5},{"h":13,"importKWh":0.36,"exportKWh":0.12,"homeKWh":1.64,"solarKWh":1.5},{"h":14,"importKWh":1.2,"exportKWh":0.12,"homeKWh":1.68,"solarKWh":1.7},{"h":15,"importKWh":1.45,"exportKWh":0.12,"homeKWh":2.23,"solarKWh":1.7},{"h":16,"importKWh":1.08,"exportKWh":0,"homeKWh":0.98,"solarKWh":0.5},{"h":17,"importKWh":0.12,"exportKWh":0,"homeKWh":1.22,"solarKWh":0.4},{"h":18,"importKWh":0,"exportKWh":0,"homeKWh":1.5,"solarKWh":0.1},{"h":19,"importKWh":0.96,"exportKWh":0,"homeKWh":1.76,"solarKWh":0},{"h":20,"importKWh":1.81,"exportKWh":0,"homeKWh":1.71,"solarKWh":0},{"h":21,"importKWh":1.32,"exportKWh":0,"homeKWh":1.32,"solarKWh":0},{"h":22,"importKWh":3,"exportKWh":0,"homeKWh":2.9,"solarKWh":0},{"h":23,"importKWh":0.47,"exportKWh":0,"homeKWh":0.67,"solarKWh":0}],"importKWh":29.44,"exportKWh":0.36,"cost":{"method":"hourly","bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":14.09,"cost":2.03},"offpeak":{"kWh":15.35,"cost":1.55}},"importKWh":29.44,"exportKWh":0.36,"daily":3.22,"exportCredit":0.03,"total":6.77},"periods":{"periods":[{"key":"night","label":"Night","from":0,"to":6,"hours":6,"status":"done","importKWh":10.44,"exportKWh":0,"cost":1.05,"bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":0,"cost":0},"offpeak":{"kWh":10.44,"cost":1.05}},"homeKWh":7.84,"solarKWh":0},{"key":"morning","label":"Morning","from":6,"to":12,"hours":6,"status":"done","importKWh":7.11,"exportKWh":0,"cost":0.96,"bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":5.67,"cost":0.82},"offpeak":{"kWh":1.44,"cost":0.15}},"homeKWh":12.84,"solarKWh":5.1},{"key":"day","label":"Day","from":12,"to":18,"hours":6,"status":"done","importKWh":4.33,"exportKWh":0.36,"cost":0.59,"bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":4.33,"cost":0.62},"offpeak":{"kWh":0,"cost":0}},"homeKWh":9.87,"solarKWh":7.3},{"key":"evening","label":"Evening","from":18,"to":24,"hours":6,"status":"done","importKWh":7.56,"exportKWh":0,"cost":0.94,"bands":{"peak":{"kWh":0,"cost":0},"shoulder":{"kWh":4.09,"cost":0.59},"offpeak":{"kWh":3.47,"cost":0.35}},"homeKWh":9.86,"solarKWh":0.1}],"mostCost":"night","daily":3.22,"hasHome":true,"hasSolar":true,"hoursIn":24}}};

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

async function getSzSession(env) {
  if (env && env.EVENTS_KV && env.AKAHU_ENC_KEY) {
    try {
      const enc = await env.EVENTS_KV.get(SESS_KEY);
      if (enc) {
        const s = await open(env, enc);
        if (s && s.refresh_token && s.session_id) return s;
      }
    } catch (e) {}
  }
  if (env && env.SZ_SESSION_JSON) {
    try { return JSON.parse(env.SZ_SESSION_JSON); } catch (e) {}
  }
  return null;
}

export async function refreshSolarZero(env, fetchImpl = fetch, now = Date.now()) {
  const map = await getSzSession(env);
  if (!map || !map.refresh_token || !map.session_id) return await getPowerDoc(env);

  const exp = Number(map.expiry_millis || 0);
  const expCookie = exp > now + 600e3 ? exp : 1000;
  const cookieHeader = `refresh_token=${map.refresh_token}; session_id=${map.session_id}; remember=${map.remember || "true"}; access_token=${map.access_token || ""}; id_token=${map.id_token || ""}; expiry_millis=${expCookie}`;

  const sRes = await fetchImpl("https://api-web.solarzero.co.nz/v1/auth/current/session", {
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://my.solarzero.co.nz",
      "Referer": "https://my.solarzero.co.nz/",
      "x-correlation-id": crypto.randomUUID(),
      "Cookie": cookieHeader
    }
  });
  if (!sRes.ok) return await getPowerDoc(env);
  const sess = await sRes.json();
  const updatedMap = {
    refresh_token: sess.refreshToken || map.refresh_token,
    session_id: sess.sessionId || map.session_id,
    remember: String(sess.remember ?? map.remember ?? "true"),
    access_token: sess.accessToken || map.access_token,
    id_token: sess.idToken || map.id_token,
    expiry_millis: String(sess.expiryMs || map.expiry_millis || "")
  };
  if (env && env.EVENTS_KV && env.AKAHU_ENC_KEY) {
    try { await env.EVENTS_KV.put(SESS_KEY, await seal(env, updatedMap)); } catch (e) {}
  }

  const headers = {
    "Content-Type": "application/json",
    "Origin": "https://my.solarzero.co.nz",
    "Referer": "https://my.solarzero.co.nz/",
    "Authorization": "Bearer " + updatedMap.access_token,
    "x-id": updatedMap.id_token,
    "x-session-id": updatedMap.session_id,
    "x-correlation-id": crypto.randomUUID()
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
