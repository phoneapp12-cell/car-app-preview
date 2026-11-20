// node worker/test/celeb.test.mjs : celebrity news opt-in is asked only of the named family members,
// stored per user, and never turned on for anyone else. In-memory SQLite only; no live data.
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { DatabaseSync } from 'node:sqlite';

register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(s, c, next) {
  if (s === 'cloudflare:workers') return { url: 'data:text/javascript,export class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }', shortCircuit: true };
  return next(s, c);
}
export async function load(u, c, next) {
  if (u.endsWith('.txt')) return { format: 'module', source: 'export default ' + JSON.stringify('AA\\nAB\\nCAT\\nDOG\\n'), shortCircuit: true };
  return next(u, c);
}`));

const { Family, CELEB_ASK, celebState } = await import('../src/family.js');
const { SOURCES } = await import('../src/sources.js');

function stubSql() {
  const db = new DatabaseSync(':memory:');
  return {
    db,
    exec(q, ...a) {
      if (!a.length && q.trim().replace(/;\s*$/, '').includes(';')) { db.exec(q); return { toArray: () => [] }; }
      const st = db.prepare(q);
      const out = /^\s*(select|with)/i.test(q) ? st.all(...a) : (st.run(...a), []);
      return { toArray: () => out.map(r => ({ ...r })) };
    }
  };
}
const sql = stubSql();
const ctx = { storage: { sql, getAlarm: async () => null, setAlarm: async () => { }, transactionSync: f => f() } };
const fam = new Family(ctx, { SEED_KEY: 'test-seed' });
fam.bot.consider = async () => { }; fam.bot.muted = () => false;
const H = 'https://do/api';
async function call(tok, path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' }; if (tok) headers.Authorization = 'Bearer ' + tok;
  const r = await fam.fetch(new Request(H + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
  let j = null; try { j = await r.clone().json(); } catch (e) { }
  return { status: r.status, body: j };
}
const ok = (r, msg) => { assert.ok(r.status >= 200 && r.status < 300, (msg || '') + ' ' + r.status + ' ' + JSON.stringify(r.body)); return r.body; };

assert.equal(CELEB_ASK.size, 5);
assert.deepEqual(celebState({ id: 'm8e5feaf41519' }, null), { canCeleb: true, celebNews: null, askCeleb: true });
assert.deepEqual(celebState({ id: 'nope' }, { celebNews: true }), { canCeleb: false, celebNews: true, askCeleb: false });

const boot = await fam.fetch(new Request(H + '/bootstrap?key=test-seed&name=Shane'));
const SH = await boot.json();
const dion = ok(await call(SH.token, '/members', 'POST', { name: 'Dion' }));
const sarah = ok(await call(SH.token, '/members', 'POST', { name: 'Sarah' }));
const targetId = [...CELEB_ASK][0]; // Sarah's live id
sql.exec(`UPDATE members SET id=? WHERE id=?`, targetId, sarah.id);
sarah.id = targetId;

const shPrefs = ok(await call(SH.token, '/prefs'));
assert.equal(shPrefs.canCeleb, false, 'Shane is not asked');
assert.equal(shPrefs.askCeleb, false);
assert.equal(shPrefs.celebNews, null);

const dionPrefs = ok(await call(dion.token, '/prefs'));
assert.equal(dionPrefs.canCeleb, false, 'a family member not in the list is not asked');
assert.equal(dionPrefs.askCeleb, false);

const asked = ok(await call(sarah.token, '/prefs'));
assert.equal(asked.canCeleb, true);
assert.equal(asked.askCeleb, true);
assert.equal(asked.celebNews, null);

const yes = ok(await call(sarah.token, '/prefs', 'PUT', { pick: ['kids', 'celeb'], celebNews: true }));
assert.equal(yes.canCeleb, true);
assert.equal(yes.celebNews, true);
assert.equal(yes.askCeleb, false);
const afterYes = ok(await call(sarah.token, '/prefs'));
assert.equal(afterYes.celebNews, true);
assert.equal(afterYes.askCeleb, false);
assert.ok(afterYes.prefs.pick.includes('celeb'));

// a later prefs save without celebNews must not wipe the answer
ok(await call(sarah.token, '/prefs', 'PUT', { pick: ['kids', 'garden'] }));
const kept = ok(await call(sarah.token, '/prefs'));
assert.equal(kept.celebNews, true, 'celebNews survives a pick-only save');
assert.deepEqual(kept.prefs.pick, ['kids', 'garden']);

const no = ok(await call(sarah.token, '/prefs', 'PUT', { pick: ['kids'], celebNews: false }));
assert.equal(no.celebNews, false);
assert.equal(no.askCeleb, false);

// Shane cannot turn it on for himself
ok(await call(SH.token, '/prefs', 'PUT', { celebNews: true, pick: ['celeb'] }));
const shAfter = ok(await call(SH.token, '/prefs'));
assert.equal(shAfter.canCeleb, false);
assert.equal(shAfter.celebNews, null);
assert.ok(!shAfter.prefs || shAfter.prefs.celebNews === undefined, 'Shane’s celebNews is not stored');

// Dion cannot turn it on either
ok(await call(dion.token, '/prefs', 'PUT', { celebNews: true, pick: ['celeb'] }));
const dionAfter = ok(await call(dion.token, '/prefs'));
assert.equal(dionAfter.canCeleb, false);
assert.equal(dionAfter.celebNews, null);
assert.ok(!dionAfter.prefs || dionAfter.prefs.celebNews === undefined);

const celebSrc = SOURCES.filter(s => s.topic === 'celeb');
assert.deepEqual(celebSrc.map(s => s.id).sort(), ['eonline', 'ntl-nz', 'nzh-ent', 'usweekly']);
assert.ok(celebSrc.every(s => s.kind === 'rss'));
assert.ok(celebSrc.find(s => s.id === 'nzh-ent').nz);
assert.ok(celebSrc.find(s => s.id === 'ntl-nz').nz);
assert.match(celebSrc.find(s => s.id === 'nzh-ent').url, /entertainment/);
assert.match(celebSrc.find(s => s.id === 'eonline').url, /eonline/);
console.log('celeb worker tests ok');
