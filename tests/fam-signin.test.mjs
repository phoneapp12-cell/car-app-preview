import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const family = read('../feed/family.js');
const today = read('../feed/today.js');
const html = read('../feed/index.html');

function flags(member) {
  const FAM_ON = !!(member && member.id && !member.pending);
  const IS_ADMIN = FAM_ON && member.role === 'admin';
  const IS_FRIEND = FAM_ON && member.role === 'friend';
  const PRIVATE_OK = !member || IS_ADMIN;
  return { FAM_ON, IS_ADMIN, IS_FRIEND, PRIVATE_OK };
}

function planInvite(member, inv) {
  if (!inv) return { member, tryInv: '' };
  if (member && member.id && !member.pending && member.tok !== inv) return { member, tryInv: inv };
  if (!member || member.tok !== inv) return { member: { tok: inv, pending: 1 }, tryInv: '' };
  return { member, tryInv: '' };
}

function shouldReload({ already, stuck, ios }) {
  return !already && stuck && !!ios;
}

test('FAM_ON and IS_ADMIN are false while the invite is still pending', () => {
  const f = flags({ tok: 'x', pending: 1 });
  assert.equal(f.FAM_ON, false);
  assert.equal(f.IS_ADMIN, false);
});

test('a completed admin session turns FAM_ON and IS_ADMIN on', () => {
  const f = flags({ tok: 'x', id: 'm41', name: 'Shane', role: 'admin', shane: 1 });
  assert.equal(f.FAM_ON, true);
  assert.equal(f.IS_ADMIN, true);
  assert.equal(f.PRIVATE_OK, true);
});

test('a stale Home Screen invite does not overwrite a working session', () => {
  const session = { tok: 'newtokennewtokennewtokennewtoken', id: 'm41', role: 'admin' };
  const plan = planInvite(session, 'oldtokenoldtokenoldtokenoldtoken');
  assert.equal(plan.member.tok, session.tok);
  assert.equal(plan.member.id, 'm41');
  assert.equal(plan.tryInv, 'oldtokenoldtokenoldtokenoldtoken');
});

test('no session + invite becomes a pending member', () => {
  const plan = planInvite(null, 'fresh-token-fresh-token-fresh-token');
  assert.equal(plan.member.pending, 1);
  assert.equal(plan.tryInv, '');
});

test('do not reload when the ibPendRel flag did not stick (avoids a skeleton loop)', () => {
  assert.equal(shouldReload({ already: false, stuck: false, ios: true }), false);
  assert.equal(shouldReload({ already: false, stuck: true, ios: false }), false);
  assert.equal(shouldReload({ already: false, stuck: true, ios: true }), true);
  assert.equal(shouldReload({ already: true, stuck: true, ios: true }), false);
});

test('family.js applies flags on the pending path and guards the reload', () => {
  assert.match(family, /function applyMemberFlags\(\)/);
  assert.match(family, /URL_TRY_INV/);
  assert.match(family, /MEMBER && MEMBER\.id && !MEMBER\.pending && MEMBER\.tok !== inv/);
  assert.match(family, /stuck = localStorage\.getItem\(key\) === me\.id/);
  assert.match(family, /!already && stuck && typeof IOS !== 'undefined' && IOS/);
  assert.match(family, /pasteLink\(\)/);
});

test('Today marks ib-ready immediately and draw always calls ready()', () => {
  assert.match(today, /classList\.add\('ib-ready'\)/);
  assert.match(today, /finally \{\s*ready\(\);\s*\}/);
});

test('self-heal banner is attached to the body so it is visible before ib-ready', () => {
  assert.match(html, /document\.body\.appendChild\(box\)/);
  assert.match(html, /stuckBoot/);
});
