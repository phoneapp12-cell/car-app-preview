// Cloudflare Workers entry point.
import { handle } from './relay.js';
import { scheduled } from './events.js';
import { scheduledClosures } from './closures.js';
import { runAlerts, runReminders } from './push.js';
const CLOSURES_CRON = '5-59/10 * * * *';
const REMIND_CRON = '* * * * *'; // reminders: the minute the phone asked for (not the bridge 7 am hold)
export default {
  fetch: (request, env) => handle(request, env),
  // Cron: events list every 10 minutes; closures on the offset cron, then bridge alerts.
  // A third cron, every minute, sends due reminders. Bridge quiet hours stay inside runAlerts only.
  scheduled: (event, env, ctx) => ctx.waitUntil(event.cron === REMIND_CRON ? runReminders(env) : event.cron === CLOSURES_CRON ? scheduledClosures(env, fetch, Date.now(), st => runAlerts(env, st)) : scheduled(env))
};
