// Cloudflare Workers entry point.
import { handle } from './relay.js';
export default { fetch: (request, env) => handle(request, env) };
