// Cloudflare Workers entry point.
import { handle } from './relay.js';
import { guardKV } from './kvguard.js';
import { scheduled } from './events.js';
import { scheduledClosures } from './closures.js';
import { runAlerts, runReminders } from './push.js';
import { refreshSarah } from './sarah.js';
import { runSunshine } from './sunshine.js';
import { runShop } from './shop-notify.js';
import { runAkahu, runAkahuInsight } from './akahu.js';
import { runHealthDiag } from './health.js';
const CLOSURES_CRON = '5-59/10 * * * *';
const REMIND_CRON = '* * * * *'; // reminders: the minute the phone asked for (not the bridge 7 am hold)
export default {
  fetch: (request, env) => handle(request, guardKV(env)),
  // Cron: events list every 10 minutes, then a short check of Sarah Jenkins's channel.
  // Closures on the offset cron, then bridge alerts. Every minute: due reminders.
  scheduled: (event, env0, ctx) => ctx.waitUntil((async () => { const env = guardKV(env0);
    if (event.cron === REMIND_CRON) { try { await runShop(env); } catch (e) { /* next minute */ } try { await runAkahuInsight(env0); } catch (e) { } try { await runHealthDiag(env0); } catch (e) { } return runReminders(env); }
    if (event.cron === CLOSURES_CRON) return scheduledClosures(env, fetch, Date.now(), st => runAlerts(env, st));
    await scheduled(env);
    try { await refreshSarah(env, fetch, Date.now(), { push: true }); } catch (e) { /* events list is already saved */ }
    try { await runSunshine(env, fetch, Date.now()); } catch (e) { /* sunshine notes wait for the next check */ }
    try { await runAkahu(env, fetch, Date.now()); } catch (e) { /* bank data waits for the next check */ }
  })())
};
