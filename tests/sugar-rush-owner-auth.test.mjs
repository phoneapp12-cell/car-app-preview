import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const scoresJs = readFileSync(new URL('../feed/scores.js', import.meta.url), 'utf8');

function loadScores(member, fetchImpl) {
  const store = new Map();
  if (member) store.set('mf.member', JSON.stringify(member));
  const context = {
    console, Intl, Date, Math, URL, Set, Map, Object, Number, String, Array, JSON,
    AbortController, setTimeout, clearTimeout, fetch: fetchImpl,
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); }
    }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(scoresJs, context, { filename: 'feed/scores.js' });
  return context.IBScores;
}

const jsonResponse = (body, ok = true) => ({ ok, json: async () => body });

test('verified owner requires the server /me response to match the current token and member id', async () => {
  let request;
  const scores = loadScores(
    { id: 'm-owner', tok: 'owner-token-for-test', name: 'Local Nickname', role: 'member' },
    async (url, options) => { request = { url, options }; return jsonResponse({ id: 'm-owner', name: 'Shane', role: 'admin', shane: 1 }); }
  );

  assert.equal(await scores.isVerifiedShane(), true);
  assert.equal(request.url, scores.API + '/me');
  assert.equal(request.options.cache, 'no-store');
  assert.equal(request.options.headers.Authorization, 'Bearer owner-token-for-test');
});

test('editable local Shane/admin labels do not authorize a regular member', async () => {
  const scores = loadScores(
    { id: 'm-member', tok: 'member-token-for-test', name: 'Shane', role: 'admin' },
    async () => jsonResponse({ id: 'm-member', name: 'Sarah', role: 'member' })
  );
  assert.equal(await scores.isVerifiedShane(), false);
});

test('a mismatched server identity, revoked token, or network error fails closed', async (t) => {
  const cases = [
    ['mismatched id', async () => jsonResponse({ id: 'm-owner', name: 'Shane', role: 'admin', shane: 1 })],
    ['revoked token', async () => jsonResponse({ err: 'not a member' }, false)],
    ['network error', async () => { throw new Error('offline'); }]
  ];
  for (const [name, fetchImpl] of cases) await t.test(name, async () => {
    const scores = loadScores({ id: 'm-member', tok: 'member-token-for-test', name: 'Shane', role: 'admin' }, fetchImpl);
    assert.equal(await scores.isVerifiedShane(), false);
  });
});

test('a phone without a family token does not make a server request or receive owner access', async () => {
  let called = false;
  const scores = loadScores(null, async () => { called = true; return jsonResponse({}); });
  assert.equal(await scores.isVerifiedShane(), false);
  assert.equal(called, false);
});
