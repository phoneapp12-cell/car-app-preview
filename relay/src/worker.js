// Cloudflare Workers entry point.
import { handle } from './relay.js';
import { scheduled } from './events.js';
import { scheduledClosures } from './closures.js';
import { runAlerts } from './push.js';
const CLOSURES_CRON = '5-59/10 * * * *';
export default {
  fetch: (request, env) => handle(request, env),
  // Cron: keeps the local events list fresh in KV (list every 3 hours, event pages about once a day)
  // A second cron (minutes 5, 15, 25…) does a small step of the bridge closures check, then sends any push alerts
  scheduled: (event, env, ctx) => ctx.waitUntil(event.cron === CLOSURES_CRON ? scheduledClosures(env, fetch, Date.now(), st => runAlerts(env, st)) : scheduled(env))
};
