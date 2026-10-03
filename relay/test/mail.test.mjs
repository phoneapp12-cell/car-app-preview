import { handle } from '../src/relay.js';
import { mailSummaryLine } from '../src/mail.js';
import fs from 'fs';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const O = 'https://phoneapp12-cell.github.io';
const REDIR = 'https://phoneapp12-cell.github.io/car-app-preview/';
const GID = '1234567890-abc.apps.googleusercontent.com';
const MID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const GSEC = 'super-secret-value';
const MSEC = 'ms-secret-value';
const envIds = { ALLOWED_ORIGIN: O, GOOGLE_CLIENT_ID: GID, MICROSOFT_CLIENT_ID: MID };
const envFull = { ...envIds, GOOGLE_CLIENT_SECRET: GSEC, MICROSOFT_CLIENT_SECRET: MSEC };
const calls = [];
const fetchImpl = async (url, opts) => {
  calls.push({ url, body: String(opts.body || ''), method: opts.method });
  const b = String(opts.body || '');
  if (b.includes('code=goodcode') || b.includes('refresh_token=rtk-refresh-token')) {
    return new Response(JSON.stringify({ access_token: 'atk-real-token', refresh_token: 'rtk-refresh-token', expires_in: 3600, token_type: 'Bearer' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (b.includes('code=needsecret')) return new Response(JSON.stringify({ error: 'invalid_client', error_description: 'secret required' }), { status: 401 });
  return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });
};
const post = (body, origin = O, env = envIds) => handle(new Request('https://relay.example/mail/token', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
}), env, fetchImpl);
const verifier = 'a'.repeat(43);

let r = await handle(new Request('https://relay.example/mail/config', { headers: { Origin: O } }), envIds, fetchImpl);
let cfg = await r.json();
ok(r.status === 200 && cfg.google.clientId === GID && cfg.microsoft.clientId === MID && cfg.google.pkce === true && cfg.google.secretSet === false && cfg.microsoft.secretSet === false && cfg.redirect === REDIR, 'config returns public client ids, no secret flag');
ok(!JSON.stringify(cfg).includes(GSEC) && !JSON.stringify(cfg).includes(MSEC), 'config JSON has no secret material');
r = await handle(new Request('https://relay.example/mail/config', { headers: { Origin: O } }), envFull, fetchImpl);
cfg = await r.json();
ok(cfg.google.secretSet === true && cfg.microsoft.secretSet === true && !JSON.stringify(cfg).includes(GSEC) && !JSON.stringify(cfg).includes(MSEC), 'secretSet true does not reveal the secret');
r = await handle(new Request('https://relay.example/mail/config', { headers: { Origin: O } }), { ALLOWED_ORIGIN: O }, fetchImpl);
cfg = await r.json();
ok(cfg.google.clientId === '' && cfg.microsoft.clientId === '' && cfg.google.secretSet === false && cfg.microsoft.secretSet === false, 'missing client ids stay empty');
r = await handle(new Request('https://relay.example/mail/config', { headers: { Origin: 'https://evil.example' } }), envIds, fetchImpl);
ok(r.status === 403, 'config refuses other origins');

calls.length = 0;
r = await post({ provider: 'google', code: 'goodcode', codeVerifier: verifier, redirectUri: REDIR });
let data = await r.json();
ok(r.status === 200 && data.accessToken === 'atk-real-token' && data.refreshToken === 'rtk-refresh-token' && data.tokenType === 'Bearer', 'code exchanged');
ok(calls.length === 1 && calls[0].url === 'https://oauth2.googleapis.com/token' && calls[0].body.includes('code_verifier=' + verifier) && calls[0].body.includes('code=good') && !calls[0].body.includes('client_secret'), 'PKCE verifier sent and no client secret when unset');
ok(!JSON.stringify(data).includes(GSEC), 'token response has no client secret');

calls.length = 0;
r = await post({ provider: 'google', code: 'goodcode', codeVerifier: verifier, redirectUri: REDIR }, O, envFull);
data = await r.json();
ok(r.status === 200 && calls[0].body.includes('client_secret=' + encodeURIComponent(GSEC)) && calls[0].body.includes('code_verifier='), 'client secret sent only from Worker env');
ok(!JSON.stringify(data).includes(GSEC), 'secret still not in the response');

r = await post({ provider: 'microsoft', code: 'goodcode', codeVerifier: verifier, redirectUri: REDIR });
ok(r.status === 200 && calls[calls.length - 1].url.includes('login.microsoftonline.com') && !calls[calls.length - 1].body.includes('client_secret'), 'Microsoft PKCE works without a secret');

r = await post({ provider: 'google', code: 'needsecret', codeVerifier: verifier, redirectUri: REDIR }, O, envIds);
data = await r.json();
ok(r.status === 400 && data.error === 'client_secret_missing' && data.missing === 'GOOGLE_CLIENT_SECRET', 'Google invalid_client without a secret is reported as missing');

r = await post({ provider: 'google', code: 'goodcode', codeVerifier: verifier, redirectUri: REDIR }, O, { ALLOWED_ORIGIN: O });
data = await r.json();
ok(r.status === 400 && data.error === 'client_id_missing' && data.missing === 'GOOGLE_CLIENT_ID', 'missing Google client id');
r = await post({ provider: 'microsoft', code: 'goodcode', codeVerifier: verifier, redirectUri: REDIR }, O, { ALLOWED_ORIGIN: O, GOOGLE_CLIENT_ID: GID });
data = await r.json();
ok(data.error === 'client_id_missing' && data.missing === 'MICROSOFT_CLIENT_ID', 'missing Microsoft client id');
r = await post({ provider: 'google', code: 'goodcode', codeVerifier: verifier, redirectUri: 'https://evil.example/cb' });
ok(r.status === 400 && (await r.json()).error === 'bad_redirect', 'bad redirect refused');
r = await post({ provider: 'google', code: 'goodcode', codeVerifier: verifier, redirectUri: REDIR }, 'https://evil.example');
ok(r.status === 403, 'token exchange refuses other origins');
r = await post({ provider: 'google', code: 'x', codeVerifier: 'short', redirectUri: REDIR });
ok(r.status === 400 && (await r.json()).error === 'bad_request', 'short verifier refused');

ok(mailSummaryLine([], { connected: 0 }) === '', 'no bullet when nothing is connected');
ok(mailSummaryLine([], { connected: 2, failed: 0, count: 0 }) === 'No new mail in the last 2 hours.', 'no new mail');
ok(mailSummaryLine([{ subject: 'Hello there' }], { connected: 1, count: 1 }) === '1 new email in the last 2 hours: “Hello there”.', 'one real subject');
ok(mailSummaryLine([{ subject: 'Hello there' }, { subject: 'Invoice 12' }], { connected: 2, count: 2 }) === '2 new emails in the last 2 hours: “Hello there” and “Invoice 12”.', 'two subjects');
ok(mailSummaryLine([{ subject: 'Hello there' }, { subject: 'Invoice 12' }, { subject: 'Extra' }], { connected: 2, count: 4 }) === '4 new emails in the last 2 hours, including “Hello there” and “Invoice 12”.', 'count plus two subjects');
ok(mailSummaryLine([], { connected: 1, failed: 1, count: 0 }) === 'Couldn’t check mail just now.', 'failed check invents nothing');
ok(mailSummaryLine([{ subject: 'Hello there' }], { connected: 2, failed: 1, count: 1 }) === '1 new email in the last 2 hours: “Hello there” (one inbox couldn’t be checked).', 'partial failure keeps the real subject');
ok(mailSummaryLine([{ subject: 'Hello there' }, { subject: 'Invoice 12' }], { connected: 1, count: 20, atLeast: true }).startsWith('At least 20 new emails'), 'capped list says at least');
const canned = [
  mailSummaryLine([], { connected: 1, count: 0 }),
  mailSummaryLine([{ subject: 'Rates notice' }], { connected: 1, count: 1 })
];
ok(canned.every(s => !/\b(television|roadworks)\b/i.test(s)), 'summary wording skips television and roadworks');
ok(!mailSummaryLine([], { connected: 1, count: 3 }).includes('“'), 'a count without subjects does not invent quotes');

function grab(src) {
  const key = 'function mailSummaryLine';
  const i = src.indexOf(key);
  if (i < 0) return '';
  let n = 0, started = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === '{') { n++; started = true; }
    else if (c === '}') { n--; if (started && n === 0) return src.slice(i, j + 1); }
  }
  return '';
}
const app = fs.readFileSync(new URL('../../app.js', import.meta.url), 'utf8');
const src = fs.readFileSync(new URL('../src/mail.js', import.meta.url), 'utf8');
ok(grab(app) === grab(src) && grab(app).includes('No new mail in the last 2 hours.'), 'app uses the same mail summary wording');

console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
