// Local test server: runs the same relay code under Node 18+ (for Playwright tests on this machine).
// EXTRA_ORIGINS=http://localhost:8080 PORT=8787 node local-server.mjs
// TEST_UPSTREAM=http://127.0.0.1:9999 lets tests map https://calendar.google.com/test/... to a local file server.
import http from 'node:http';
import { handle } from './src/relay.js';
const env = { ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || 'https://phoneapp12-cell.github.io', EXTRA_ORIGINS: process.env.EXTRA_ORIGINS || '' };
const port = +(process.env.PORT || 8787);
const up = process.env.TEST_UPSTREAM;
// In test mode, requests for https://calendar.google.com/__test__/<file> are served from TEST_UPSTREAM/<file>.
const fetchImpl = up ? (url, opts) => { const u = new URL(url); if (u.pathname.startsWith('/__test__/')) return fetch(up + u.pathname.slice(9), opts); return fetch(url, opts); } : fetch;
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request('http://localhost:' + port + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
  const r = await handle(request, env, fetchImpl);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(port, () => process.stdout.write('relay on http://localhost:' + port + '\n'));
