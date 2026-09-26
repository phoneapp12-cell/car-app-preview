// Cloudflare Workers entry point.
import { handle } from './relay.js';
import { scheduled } from './events.js';
export default {
  fetch: (request, env) => handle(request, env),
  // Cron: keeps the local events list fresh in KV (list every 3 hours, event pages about once a day)
  scheduled: (event, env, ctx) => ctx.waitUntil(scheduled(env))
};
