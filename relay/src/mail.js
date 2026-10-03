/* Gmail and Outlook sign-in for the Due Dates app.
 * Authorization-code + PKCE. The client secret, if a provider requires one, is read from the
 * Worker env (a wrangler secret) and is never written to a response, a log, or the repo.
 * This file does not fetch mailbox contents. Subjects stay on the phone.
 */
export const MAIL_REDIRECT = 'https://phoneapp12-cell.github.io/car-app-preview/';

const PROVIDERS = {
  google: {
    idKey: 'GOOGLE_CLIENT_ID',
    secretKey: 'GOOGLE_CLIENT_SECRET',
    token: 'https://oauth2.googleapis.com/token',
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'https://www.googleapis.com/auth/gmail.readonly'
  },
  microsoft: {
    idKey: 'MICROSOFT_CLIENT_ID',
    secretKey: 'MICROSOFT_CLIENT_SECRET',
    token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    authorize: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    scope: 'offline_access Mail.Read User.Read'
  }
};

function cleanId(v) {
  const s = String(v || '').trim();
  if (s.length < 8 || s.length > 200) return '';
  if (!/^[A-Za-z0-9._~-]+$/.test(s)) return '';
  return s;
}

function secretValue(env, key) {
  return String((env && env[key]) || '').trim();
}

export function mailConfig(env = {}) {
  const out = { redirect: MAIL_REDIRECT };
  for (const [name, p] of Object.entries(PROVIDERS)) {
    out[name] = {
      clientId: cleanId(env[p.idKey]),
      secretSet: !!secretValue(env, p.secretKey),
      authorize: p.authorize,
      scope: p.scope,
      pkce: true
    };
  }
  return out;
}

function form(obj) {
  return Object.entries(obj).filter(([, v]) => v != null && v !== '').map(([k, v]) =>
    encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
}

function piece(s, min, max) {
  if (typeof s !== 'string' || s.length < min || s.length > max) return false;
  return !/[\s\u0000-\u001f]/.test(s);
}

/* One English line for the homepage. Real subjects only. No invented mail. */
export function mailSummaryLine(items, opts) {
  opts = opts || {};
  const connected = opts.connected | 0;
  if (connected <= 0) return '';
  const failed = opts.failed | 0;
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const subjects = (Array.isArray(items) ? items : []).map(x => clean(x && x.subject)).filter(Boolean);
  const count = typeof opts.count === 'number' && opts.count >= 0 ? opts.count : subjects.length;
  const quote = (s) => '“' + s + '”';
  if (count <= 0 && failed >= connected) return 'Couldn’t check mail just now.';
  if (count <= 0 && failed > 0) return 'Couldn’t check every inbox just now.';
  if (count <= 0) return 'No new mail in the last 2 hours.';
  const shown = subjects.slice(0, 2).map(quote);
  const head = opts.atLeast ? 'At least ' + count + ' new emails' : (count === 1 ? '1 new email' : count + ' new emails');
  let line;
  if (!shown.length) line = head + ' in the last 2 hours.';
  else if (shown.length === 1 || count === 1) line = head + ' in the last 2 hours: ' + shown[0] + '.';
  else if (count === 2) line = head + ' in the last 2 hours: ' + shown[0] + ' and ' + shown[1] + '.';
  else line = head + ' in the last 2 hours, including ' + shown[0] + ' and ' + shown[1] + '.';
  if (failed > 0) line = line.slice(0, -1) + ' (one inbox couldn’t be checked).';
  return line;
}

export async function exchangeMail(env, body, fetchImpl = fetch) {
  const provider = body && body.provider;
  const p = PROVIDERS[provider];
  if (!p) return { status: 400, data: { error: 'bad_provider' } };
  const clientId = cleanId(env && env[p.idKey]);
  if (!clientId) return { status: 400, data: { error: 'client_id_missing', provider, missing: p.idKey } };
  if (!body || body.redirectUri !== MAIL_REDIRECT) return { status: 400, data: { error: 'bad_redirect' } };
  const secret = secretValue(env, p.secretKey);
  const params = { client_id: clientId, redirect_uri: MAIL_REDIRECT };
  if (body.refreshToken) {
    if (!piece(body.refreshToken, 8, 4096)) return { status: 400, data: { error: 'bad_request' } };
    params.grant_type = 'refresh_token';
    params.refresh_token = body.refreshToken;
    if (provider === 'microsoft') params.scope = p.scope;
  } else {
    if (!piece(body.code, 8, 2048) || !/^[A-Za-z0-9._~-]{43,128}$/.test(String(body.codeVerifier || ''))) {
      return { status: 400, data: { error: 'bad_request' } };
    }
    params.grant_type = 'authorization_code';
    params.code = body.code;
    params.code_verifier = body.codeVerifier;
  }
  if (secret) params.client_secret = secret;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  let res, json = {};
  try {
    res = await fetchImpl(p.token, {
      method: 'POST',
      signal: ctl.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: form(params)
    });
    try { json = await res.json(); } catch (e) { json = {}; }
  } catch (e) {
    return { status: 502, data: { error: 'mail_unavailable', provider } };
  } finally { clearTimeout(timer); }
  if (!res || !res.ok || !json.access_token || !piece(String(json.access_token), 8, 8192)) {
    const codeErr = String((json && json.error) || '').slice(0, 40);
    if (!secret && (codeErr === 'invalid_client' || codeErr === 'unauthorized_client')) {
      return { status: 400, data: { error: 'client_secret_missing', provider, missing: p.secretKey } };
    }
    return { status: 502, data: { error: 'mail_unavailable', provider, providerError: codeErr } };
  }
  const refresh = json.refresh_token ? String(json.refresh_token) : '';
  return {
    status: 200,
    data: {
      accessToken: String(json.access_token),
      refreshToken: piece(refresh, 8, 4096) ? refresh : '',
      expiresIn: Number(json.expires_in) || 3600,
      tokenType: 'Bearer'
    }
  };
}
