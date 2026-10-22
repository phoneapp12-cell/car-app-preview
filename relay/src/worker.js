// Cloudflare Workers entry point.
import { handle } from './relay.js';
import { guardKV } from './kvguard.js';
import { scheduled } from './events.js';
import { setHomeStreet } from './outages.js';
import { seal as sealMe } from './akahu.js';
async function sealMePlain(env) { const kv = env.EVENTS_KV, p = kv && await kv.get('me-plain-v1'); if (!p) return; await kv.put('me-v1', await sealMe(env, JSON.parse(p))); await kv.delete('me-plain-v1'); }
import { scheduledClosures } from './closures.js';
import { runAlerts, runReminders, runTvSeries, applyOutages } from './push.js';
import { runOutages } from './outages.js';
import { refreshSarah } from './sarah.js';
import { runSunshine } from './sunshine.js';
import { runShop } from './shop-notify.js';
import { runAkahu, runAkahuInsight } from './akahu.js';
import { runHealthDiag } from './health.js';
import { runFuel } from './fuel.js';
const CLOSURES_CRON = '5-59/10 * * * *';
const REMIND_CRON = '* * * * *'; // reminders: the minute the phone asked for (not the bridge 7 am hold)
export default {
  fetch: (request, env) => { setHomeStreet(env.HOME_STREET); return handle(request, guardKV(env)); },
  // Cron: events list every 10 minutes, then a short check of Sarah Jenkins's channel.
  // Closures on the offset cron, then bridge alerts. Every minute: due reminders.
  scheduled: (event, env0, ctx) => ctx.waitUntil((async () => { const env = guardKV(env0); setHomeStreet(env0.HOME_STREET);
    if (event.cron === REMIND_CRON) { try { await runShop(env); } catch (e) { /* next minute */ } try { await runAkahuInsight(env0); } catch (e) { } try { await runHealthDiag(env0); } catch (e) { } const sent = await runReminders(env); try { const rec = await runOutages(env, fetch, Date.now()); if (rec) await applyOutages(env, rec); } catch (e) { /* 2.27.40: Northpower outages, about every 20 minutes */ } return sent; }
    if (event.cron === CLOSURES_CRON) return scheduledClosures(env, fetch, Date.now(), st => runAlerts(env, st));
    await scheduled(env);
    try { await refreshSarah(env, fetch, Date.now(), { push: true }); } catch (e) { /* events list is already saved */ }
    try { await runSunshine(env, fetch, Date.now()); } catch (e) { /* sunshine notes wait for the next check */ }
    try { await runAkahu(env, fetch, Date.now()); } catch (e) { /* bank data waits for the next check */ }
    try { await runTvSeries(env, fetch, Date.now()); } catch (e) { /* 2.27.37: TV series links, about hourly */ }
    try { await runFuel(env, fetch, Date.now()); } catch (e) { /* 2.27.36: terminal fuel prices, once a day from 6am */ }
    try { await sealMePlain(env0); } catch (e) { /* 2.27.47: seal a freshly seeded profile */ }
  })())
};
