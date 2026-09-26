// Alternative host: Deno Deploy (console.deno.com). Entry point: deno-main.js
import { handle } from './src/relay.js';
Deno.serve(req => handle(req, { ALLOWED_ORIGIN: Deno.env.get('ALLOWED_ORIGIN') || 'https://phoneapp12-cell.github.io' }));
