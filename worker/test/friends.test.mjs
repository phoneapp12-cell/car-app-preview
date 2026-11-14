// node worker/test/friends.test.mjs : 1.9.230 friends, end to end through the Family Durable Object's fetch(), against an
// in-memory SQLite that behaves like ctx.storage.sql. No network, no live data: every member and invite here is made up.
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { DatabaseSync } from 'node:sqlite';

// cloudflare:workers (DurableObject) and the Worker's Text rule for .txt files, for Node
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(s, c, next) {
  if (s === 'cloudflare:workers') return { url: 'data:text/javascript,export class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }', shortCircuit: true };
  return next(s, c);
}
export async function load(u, c, next) {
  if (u.endsWith('.txt')) return { format: 'module', source: 'export default ' + JSON.stringify('AA\\nAB\\nCAT\\nDOG\\n'), shortCircuit: true };
  return next(u, c);
}`));
const { Family } = await import('../src/family.js');
const { sees, shareVisible, friendMay, FAMILY_CARD } = await import('../src/circle.js');
globalThis.fetch = async () => { throw new Error('no network in tests'); };

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
fam.bot.consider = async () => { }; fam.bot.muted = () => false; // no AI here
const H = 'https://do/api';
async function call(tok, path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' }; if (tok) headers.Authorization = 'Bearer ' + tok;
  const r = await fam.fetch(new Request(H + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
  let j = null; try { j = await r.clone().json(); } catch (e) { }
  return { status: r.status, body: j };
}
const ok = (r, msg) => { assert.ok(r.status >= 200 && r.status < 300, (msg || '') + ' ' + r.status + ' ' + JSON.stringify(r.body)); return r.body; };

// ---- family: Shane (admin, via bootstrap) + Sarah and Aranea (members)
const boot = await fam.fetch(new Request(H + '/bootstrap?key=test-seed&name=Shane%20Demo'));
const SH = await boot.json();
const sarah = ok(await call(SH.token, '/members', 'POST', { name: 'Sarah Demo' }));
const aranea = ok(await call(SH.token, '/members', 'POST', { name: 'Aranea Demo' }));
// a fake push subscription for everyone, so rt.note queues notes we can inspect
const sub = mid => sql.exec(`INSERT INTO subs (endpoint, mid, at) VALUES (?,?,?)`, 'https://push.example/' + mid, mid, 1);
const notesFor = mid => sql.exec(`SELECT type, text, card FROM notes WHERE mid=?`, mid).toArray();
for (const m of [SH, sarah, aranea]) sub(m.id);

// ---- invites: family make them; one use; 7-day expiry; revocable
let r = await call(sarah.token, '/friends/invite', 'POST', { name: 'Fern' }); const invF = ok(r, 'sarah invites');
assert.ok(invF.code.length >= 30 && invF.exp > Date.now() + 6.9 * 864e5 && invF.exp < Date.now() + 7.1 * 864e5, '7 days');
r = await call(null, '/join?code=' + invF.code); assert.equal(r.body.host, 'Sarah', 'join screen shows the host first name');
r = await call(null, '/join', 'POST', { code: invF.code, name: '' }); assert.equal(r.status, 400, 'name needed');
const fern = ok(await call(null, '/join', 'POST', { code: invF.code, name: 'Fern Friend' }), 'Fern joins');
assert.equal(fern.role, 'friend');
r = await call(null, '/join', 'POST', { code: invF.code, name: 'Second Use' }); assert.equal(r.status, 404, 'an invite works once');
r = await call(null, '/join?code=' + invF.code); assert.equal(r.status, 404);
r = await call(null, '/join', 'POST', { code: 'x'.repeat(43), name: 'Guess' }); assert.equal(r.status, 404, 'made-up code');
assert.ok(notesFor(sarah.id).some(n => /Fern Friend joined/.test(n.text)), 'host hears that the friend joined');

const gus = ok(await call(null, '/join', 'POST', { code: ok(await call(sarah.token, '/friends/invite', 'POST', {})).code, name: 'Gus Friend' }));
const hana = ok(await call(null, '/join', 'POST', { code: ok(await call(aranea.token, '/friends/invite', 'POST', {})).code, name: 'Hana Friend' }));
for (const m of [fern, gus, hana]) sub(m.id);

// expiry
const old = ok(await call(sarah.token, '/friends/invite', 'POST', {}));
sql.exec(`UPDATE finv SET exp=? WHERE id=?`, Date.now() - 1000, old.id);
r = await call(null, '/join', 'POST', { code: old.code, name: 'Too Late' }); assert.equal(r.status, 404, 'expired invite refused');
// revoke (own) and Shane revokes anyone's
const rv = ok(await call(sarah.token, '/friends/invite', 'POST', {}));
ok(await call(sarah.token, '/friends/invite/' + rv.id, 'DELETE'), 'host cancels own invite');
r = await call(null, '/join', 'POST', { code: rv.code, name: 'Revoked' }); assert.equal(r.status, 404, 'revoked invite refused');
const rv2 = ok(await call(aranea.token, '/friends/invite', 'POST', {}));
assert.equal((await call(sarah.token, '/friends/invite/' + rv2.id, 'DELETE')).status, 403, 'not someone else’s invite');
ok(await call(SH.token, '/friends/invite/' + rv2.id, 'DELETE'), 'Shane revokes any pending invite');
assert.equal((await call(null, '/join', 'POST', { code: rv2.code, name: 'X' })).status, 404);

// friends can't invite, and can't reach family-only routes (default deny)
assert.equal((await call(fern.token, '/friends/invite', 'POST', {})).status, 403, 'friends cannot invite');
for (const [p, m] of [['/members', 'GET'], ['/reno', 'GET'], ['/dates', 'GET'], ['/poll', 'GET'], ['/daily', 'GET'], ['/trivia', 'GET'], ['/trivia/board', 'GET'], ['/memories', 'GET'], ['/streaks', 'GET'], ['/cars', 'GET'], ['/sappts', 'GET'], ['/interest', 'GET'], ['/weather', 'GET'], ['/power', 'GET'], ['/bdays', 'GET'], ['/admin/people', 'GET'], ['/devices', 'GET'], ['/comeback', 'GET'], ['/purge', 'POST'], ['/stages', 'GET'], ['/anything-new', 'GET']])
  assert.equal((await call(fern.token, p, m)).status, 403, 'friend denied ' + p);
r = ok(await call(fern.token, '/profile'), 'a friend reads their own profile'); assert.equal(r.id, fern.id); assert.ok(!r.birthday);
assert.equal((await call(fern.token, '/profile?id=' + sarah.id)).status, 404, 'not the host’s profile');
assert.equal((await call(fern.token, '/profile?id=' + gus.id)).status, 404, 'but not other people’s, even in their circle');
assert.ok(friendMay('/comments', 'POST') && !friendMay('/members', 'GET') && !friendMay('/reno', 'GET'));

// ---- /me and /people: a friend sees their circle only
r = ok(await call(fern.token, '/me')); assert.equal(r.friend, 1); assert.equal(r.host, 'Sarah');
const names = list => list.map(p => p.name).sort();
assert.deepEqual(names(ok(await call(fern.token, '/people'))), ['Fern Friend', 'Gus Friend', 'Sarah Demo'], 'Fern: host + host’s friends');
assert.deepEqual(names(ok(await call(hana.token, '/people'))), ['Aranea Demo', 'Hana Friend'], 'Hana: her circle only');
assert.deepEqual(names(ok(await call(sarah.token, '/people'))), ['Aranea Demo', 'Fern Friend', 'Gus Friend', 'Sarah Demo', 'Shane Demo'], 'Sarah: family + her own friends');
assert.deepEqual(names(ok(await call(aranea.token, '/people'))), ['Aranea Demo', 'Hana Friend', 'Sarah Demo', 'Shane Demo'], 'Aranea doesn’t see Sarah’s friends');
r = ok(await call(fern.token, '/friends')); assert.deepEqual(r.circle.map(x => x.name), ['Gus Friend']); assert.equal(r.host.name, 'Sarah Demo');

// ---- posts and audiences
const famPost = ok(await call(SH.token, '/shares/text', 'POST', { text: 'Family dinner on Sunday' }));          // default Family
const sarahFr = ok(await call(sarah.token, '/shares/text', 'POST', { text: 'Friends only from Sarah', aud: 'fr' }));
const sarahBoth = ok(await call(sarah.token, '/shares/text', 'POST', { text: 'Hello everyone from Sarah', aud: 'both' }));
const fernPost = ok(await call(fern.token, '/shares/text', 'POST', { text: 'Fern says hi to the circle', aud: 'fam' })); // a friend can't pick Family
const hanaPost = ok(await call(hana.token, '/shares/text', 'POST', { text: 'Hana says hi' }));
const texts = list => list.map(s => s.snap.t).sort();
assert.deepEqual(texts(ok(await call(fern.token, '/shares'))), ['Fern says hi to the circle', 'Friends only from Sarah', 'Hello everyone from Sarah'], 'Fern never sees family-only posts');
assert.deepEqual(texts(ok(await call(hana.token, '/shares'))), ['Hana says hi'], 'Hana sees nothing from Sarah’s circle');
assert.deepEqual(texts(ok(await call(aranea.token, '/shares'))), ['Family dinner on Sunday', 'Hana says hi', 'Hello everyone from Sarah'], 'Aranea: family posts, Both posts, her own friend’s post');
assert.deepEqual(texts(ok(await call(SH.token, '/shares'))), ['Family dinner on Sunday', 'Hello everyone from Sarah'], 'Shane: family + Both (not other people’s friends circles)');
assert.deepEqual(texts(ok(await call(sarah.token, '/shares'))), ['Family dinner on Sunday', 'Fern says hi to the circle', 'Friends only from Sarah', 'Hello everyone from Sarah'], 'Sarah: family + her circle');
const fernList = ok(await call(fern.token, '/shares'));
assert.ok(fernList.every(s => s.aud === 'fr' || s.aud === 'both'), 'aud shown');
assert.equal((await call(fern.token, '/comments?card=sh' + famPost.id)).body.length, 0);
assert.equal((await call(fern.token, '/comments', 'POST', { card: 'sh' + famPost.id, text: 'sneaky' })).status, 400, 'no comments on a family post');
assert.equal((await call(fern.token, '/likes', 'POST', { card: 'sh' + famPost.id, kind: 'love' })).status, 404, 'no reactions on a family post');

// chosen people: only people the poster can see
r = await call(fern.token, '/shares/text', 'POST', { text: 'Just for Shane', to: [SH.id] }); assert.equal(r.status, 400, 'friend can’t pick family');
r = await call(sarah.token, '/shares/text', 'POST', { text: 'Pick Hana', to: [hana.id] }); assert.equal(r.status, 400, 'Sarah can’t pick Aranea’s friend');
const pick = ok(await call(sarah.token, '/shares/text', 'POST', { text: 'For Fern and Aranea', to: [fern.id, aranea.id] }));
r = ok(await call(fern.token, '/shares')).find(s => s.id === pick.id); assert.deepEqual(r.to, ['You'], 'Fern never sees Aranea’s name in the “to” list');
r = ok(await call(aranea.token, '/shares')).find(s => s.id === pick.id); assert.deepEqual(r.to, ['You'], 'and Aranea never sees Fern’s');

// notifications go to the post's audience only
const noteTexts = mid => notesFor(mid).map(n => n.text).join('\n');
assert.ok(!/Family dinner/.test(noteTexts(fern.id)) && /Family dinner/.test(noteTexts(sarah.id)), 'family post: family told, not friends');
assert.ok(/Friends only from Sarah/.test(noteTexts(fern.id)) && /Friends only from Sarah/.test(noteTexts(gus.id)), 'friends post: Sarah’s friends told');
assert.ok(!/Friends only from Sarah/.test(noteTexts(SH.id)) && !/Friends only from Sarah/.test(noteTexts(hana.id)), 'friends post: nobody else');
assert.ok(/Hello everyone/.test(noteTexts(SH.id)) && /Hello everyone/.test(noteTexts(fern.id)) && !/Hello everyone/.test(noteTexts(hana.id)), 'Both: family + Sarah’s circle');
assert.ok(/Fern says hi/.test(noteTexts(sarah.id)) && !/Fern says hi/.test(noteTexts(SH.id)) && !/Fern says hi/.test(noteTexts(aranea.id)), 'friend post: their circle');

// ---- comments: on a Both post, family and friends don't see each other's comments (the poster's are seen by both)
ok(await call(SH.token, '/comments', 'POST', { card: 'sh' + sarahBoth.id, text: 'Shane here' }));
ok(await call(fern.token, '/comments', 'POST', { card: 'sh' + sarahBoth.id, text: 'Fern here' }));
ok(await call(sarah.token, '/comments', 'POST', { card: 'sh' + sarahBoth.id, text: 'Sarah here' }));
const who = list => list.map(c => c.name).sort();
assert.deepEqual(who(ok(await call(fern.token, '/comments?card=sh' + sarahBoth.id))), ['Fern Friend', 'Sarah Demo'], 'Fern can’t see Shane’s comment');
assert.deepEqual(who(ok(await call(SH.token, '/comments?card=sh' + sarahBoth.id))), ['Sarah Demo', 'Shane Demo'], 'Shane can’t see Fern’s comment');
assert.deepEqual(who(ok(await call(sarah.token, '/comments?card=sh' + sarahBoth.id))), ['Fern Friend', 'Sarah Demo', 'Shane Demo'], 'the host sees both');
assert.ok(!/Fern/.test(noteTexts(SH.id)), 'Shane is not told about Fern’s reply');
// counts follow the same rule
r = ok(await call(fern.token, '/counts?ids=sh' + sarahBoth.id + '&last=3')); assert.equal(r['sh' + sarahBoth.id][0], 2);
r = ok(await call(SH.token, '/shares')).find(s => s.id === sarahBoth.id); assert.equal(r.nc, 2);
// public feed cards: comments are scoped by who can see whom
ok(await call(aranea.token, '/comments', 'POST', { card: 'abc123news', text: 'Aranea on the news' }));
ok(await call(hana.token, '/comments', 'POST', { card: 'abc123news', text: 'Hana on the news' }));
ok(await call(gus.token, '/comments', 'POST', { card: 'abc123news', text: 'Gus on the news' }));
assert.deepEqual(who(ok(await call(gus.token, '/comments?card=abc123news'))), ['Gus Friend']);
assert.deepEqual(who(ok(await call(hana.token, '/comments?card=abc123news'))), ['Aranea Demo', 'Hana Friend'], 'Hana sees her host, not Gus');
assert.deepEqual(who(ok(await call(SH.token, '/comments?card=abc123news'))), ['Aranea Demo'], 'Shane sees family only');
r = ok(await call(gus.token, '/recent'));
assert.equal(r.find(x => x.card === 'abc123news').n, 1, 'recent counts only visible comments');
// reactions: names scoped
ok(await call(SH.token, '/likes', 'POST', { card: 'sh' + sarahBoth.id, kind: 'love' }));
ok(await call(gus.token, '/likes', 'POST', { card: 'sh' + sarahBoth.id, kind: 'love' }));
r = ok(await call(fern.token, '/shares')).find(s => s.id === sarahBoth.id); assert.deepEqual(r.likes.map(l => l.name), ['Gus Friend'], 'Fern doesn’t see Shane’s ❤️');
r = ok(await call(SH.token, '/shares')).find(s => s.id === sarahBoth.id); assert.deepEqual(r.likes.map(l => l.name), ['Shane Demo']);
r = ok(await call(fern.token, '/popular')); assert.ok(!JSON.stringify(r).includes('Shane'), 'popular leaks no family names');
// family-only card ids can't be read or commented on by friends
for (const card of ['reno', 'poll20261114', 'dq20261114', 'trivia', 'streaks', 'date12']) {
  assert.ok(FAMILY_CARD.test(card));
  assert.equal((await call(fern.token, '/comments', 'POST', { card, text: 'hi' })).status, 400, 'friend comment on ' + card);
}
ok(await call(sarah.token, '/comments', 'POST', { card: 'reno', text: 'Reno note from Sarah' }));
assert.deepEqual(ok(await call(fern.token, '/comments?card=reno')), [], 'friend can’t read the reno thread, even the host’s comments');

// ---- games: scoreboards, race board, lives and Scrabble scoped to the circle
const post = (m, p, b) => call(m.token, p, 'POST', b);
sql.exec(`INSERT INTO scores (game, mid, score, lines, level, at) VALUES ('tetris',?,5000,30,4,1),('tetris',?,4000,25,3,2),('tetris',?,3000,20,3,3),('tetris',?,2000,15,2,4)`, SH.id, fern.id, hana.id, sarah.id);
r = ok(await call(fern.token, '/scores?game=tetris')); assert.deepEqual(r.best.map(x => x.name).sort(), ['Fern Friend', 'Sarah Demo'], 'Fern’s board: her circle');
r = ok(await call(SH.token, '/scores?game=tetris')); assert.deepEqual(r.best.map(x => x.name).sort(), ['Sarah Demo', 'Shane Demo'], 'family board: family only');
r = ok(await call(hana.token, '/scores?game=tetris')); assert.deepEqual(r.best.map(x => x.name), ['Hana Friend'], 'Hana: her circle (Aranea has no score)');
ok(await post(SH, '/sugar-race', { icon: 'lolly', stop: 3, stars: 6 }));
ok(await post(fern, '/sugar-race', { icon: 'lolly', stop: 3, stars: 6 }), 'same icon is fine across groups that never share a board');
assert.equal((await post(gus, '/sugar-race', { icon: 'lolly', stop: 3, stars: 6 })).status, 409, 'but not inside one circle');
ok(await post(gus, '/sugar-race', { icon: 'cat', stop: 3, stars: 6 }));
r = ok(await call(fern.token, '/sugar-race')); assert.deepEqual(r.racers.map(x => x.name).sort(), ['Fern Friend', 'Gus Friend']);
assert.ok(r.event, 'a race starts between Fern and Gus'); assert.deepEqual(r.event.racers.map(x => x.name).sort(), ['Fern Friend', 'Gus Friend'], 'friends race each other, not the family');
r = ok(await call(SH.token, '/sugar-race')); assert.deepEqual(r.racers.map(x => x.name), ['Shane Demo']); assert.equal(r.event, null, 'Shane isn’t pulled into a friends race');
r = ok(await call(fern.token, '/sugar-lives')); assert.deepEqual(r.family.map(x => x.name).sort(), ['Gus Friend', 'Sarah Demo'], 'lives: circle only');
r = await post(fern, '/sugar-lives', { act: 'ask' }); assert.equal(r.body.told, 2);
assert.ok(!/out of lives/.test(noteTexts(SH.id)), 'Shane isn’t asked by Fern');
r = await call(fern.token, '/scrabble', 'POST', { players: [SH.id] }); assert.equal(r.status, 400, 'friend can’t challenge family');
r = await call(sarah.token, '/scrabble', 'POST', { players: [fern.id, aranea.id] }); assert.equal(r.status, 400, 'no mixing a friend with other family');
r = await call(sarah.token, '/scrabble', 'POST', { players: [fern.id] }); assert.equal(r.status, 200, 'host vs own friend is fine');
r = await call(fern.token, '/scrabble', 'POST', { players: [gus.id] }); assert.equal(r.status, 200, 'friends in one circle');

// ---- family-only notifications never reach friends
await fam.rt.note(fern.id, 'daily', 'Today’s family poll', 'poll1');
await fam.rt.note(fern.id, 'dates', 'Sarah’s birthday', 'date1');
await fam.rt.note(fern.id, 'comeback', 'Miss you', 'comeback');
await fam.rt.note(sarah.id, 'daily', 'Today’s family poll', 'poll1');
assert.ok(!notesFor(fern.id).some(n => ['daily', 'dates', 'comeback'].includes(n.type)));
assert.ok(notesFor(sarah.id).some(n => n.type === 'daily'));

// ---- Shane-only People page and removal
assert.equal((await call(sarah.token, '/admin/people')).status, 403, 'family members can’t open People');
r = ok(await call(SH.token, '/admin/people'));
const row = n => r.people.find(p => p.name === n);
assert.equal(row('Fern Friend').group, 'friend'); assert.equal(row('Fern Friend').host.name, 'Sarah Demo');
assert.equal(row('Hana Friend').host.name, 'Aranea Demo'); assert.equal(row('Sarah Demo').group, 'family');
assert.ok(row('Fern Friend').joined > 0 && 'seen' in row('Fern Friend'));
assert.equal(r.people.length, 6);
const pend = ok(await call(SH.token, '/friends/invite', 'POST', { name: 'Ivy' }));
r = ok(await call(SH.token, '/admin/people')); assert.ok(r.invites.some(i => i.id === pend.id && i.label === 'Ivy' && i.host === 'Shane Demo'), 'pending invites listed');
assert.equal((await call(sarah.token, '/admin/people/' + fern.id, 'DELETE')).status, 403, 'only Shane removes');
// a member named Shane who isn't the admin is not Shane
const fake = ok(await call(SH.token, '/members', 'POST', { name: 'Shane Other' }));
assert.equal((await call(fake.token, '/admin/people')).status, 403, 'name alone isn’t enough');
assert.equal((await call(SH.token, '/admin/people/' + SH.id, 'DELETE')).status, 400, 'not yourself');
ok(await call(SH.token, '/admin/people/' + fern.id, 'DELETE'), 'Shane removes Fern');
assert.equal((await call(fern.token, '/me')).status, 401, 'revoked token rejected straight away');
assert.equal((await call(fern.token, '/shares')).status, 401);
assert.ok(!texts(ok(await call(sarah.token, '/shares'))).includes('Fern says hi to the circle'), 'a removed friend’s posts are hidden');
assert.ok(!who(ok(await call(sarah.token, '/comments?card=sh' + sarahBoth.id))).includes('Fern Friend'), 'and their comments');
assert.deepEqual(names(ok(await call(gus.token, '/people'))), ['Gus Friend', 'Sarah Demo']);
// removing a host revokes their unused invites
const sInv = ok(await call(aranea.token, '/friends/invite', 'POST', {}));
ok(await call(SH.token, '/admin/people/' + aranea.id, 'DELETE'));
assert.equal((await call(aranea.token, '/me')).status, 401);
assert.equal((await call(null, '/join', 'POST', { code: sInv.code, name: 'Late' })).status, 404, 'a removed host’s invite stops working');
ok(await call(SH.token, '/friends/invite/' + pend.id, 'DELETE'));
r = ok(await call(SH.token, '/admin/people')); assert.ok(!r.invites.some(i => i.id === pend.id));
// tokens: short, wrong and missing are refused
assert.equal((await call('short', '/me')).status, 401);
assert.equal((await call('y'.repeat(43), '/me')).status, 401);
assert.equal((await call(null, '/people')).status, 401);

// ---- existing posts stay Family
sql.exec(`INSERT INTO shares (mid, orig, snap, caption, priv, at) VALUES (?, 'old1', '{"t":"An old family post"}', '', 4, ?)`, SH.id, Date.now());
assert.ok(!texts(ok(await call(gus.token, '/shares'))).includes('An old family post'), 'old posts (no audience) are family-only');
assert.ok(texts(ok(await call(sarah.token, '/shares'))).includes('An old family post'));

// ---- pure rules
const F = { id: 'f', role: 'member' }, G = { id: 'g', role: 'member' }, X = { id: 'x', role: 'friend', host: 'f' }, Y = { id: 'y', role: 'friend', host: 'f' }, Z = { id: 'z', role: 'friend', host: 'g' };
assert.ok(sees(F, G) && sees(F, X) && sees(X, F) && sees(X, Y) && !sees(X, G) && !sees(G, X) && !sees(X, Z) && !sees(Z, F));
assert.ok(shareVisible(X, { mid: 'f', aud: 'fr', circ: 'f' }) && !shareVisible(Z, { mid: 'f', aud: 'fr', circ: 'f' }) && !shareVisible(G, { mid: 'f', aud: 'fr', circ: 'f' }));
assert.ok(shareVisible(G, { mid: 'f', aud: 'both', circ: 'f' }) && shareVisible(Y, { mid: 'f', aud: 'both', circ: 'f' }) && !shareVisible(Z, { mid: 'f', aud: 'both', circ: 'f' }));
assert.ok(!shareVisible(X, { mid: 'f' }) && shareVisible(G, { mid: 'f' }), 'no audience = family');
console.log('friends tests ok');
