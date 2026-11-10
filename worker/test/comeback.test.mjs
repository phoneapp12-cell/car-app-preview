import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptPayload, nzHour, quiet, shouldPing } from '../src/comeback.js';

const morning = Date.parse('2026-11-09T19:00:00Z');
const night = Date.parse('2026-11-09T08:00:00Z');
const TWO = 2 * 86400000;

test('a note waits two days and stays quiet overnight', () => {
  assert.equal(nzHour(morning), 8);
  assert.equal(quiet(morning), false);
  assert.equal(quiet(night), true);
  const sub = { endpoint: 'https://push.example/1' };
  assert.equal(shouldPing({ sub, lastOpen: morning - 3 * TWO, lastSent: 0 }, morning), true);
  assert.equal(shouldPing({ sub, lastOpen: morning - 3 * TWO, lastSent: 0, on: false }, morning), true);
  assert.equal(shouldPing({ sub, lastOpen: morning - TWO / 2, lastSent: 0 }, morning), false);
  assert.equal(shouldPing({ sub, lastOpen: morning - 3 * TWO, lastSent: morning - TWO / 2 }, morning), false);
  assert.equal(shouldPing({ sub, lastOpen: night - 3 * TWO, lastSent: 0 }, night), false);
});

test('the push body encrypts so the plaintext is not visible', async () => {
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const b64 = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const packed = await encryptPayload({ keys: { p256dh: b64(raw), auth: b64(auth) } }, 'come back');
  assert.ok(packed.length > 20);
  assert.equal(new TextDecoder().decode(packed).includes('come back'), false);
});
