import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { scoresInit, board, raceBoard, livesView, lifeKey } from '../src/scores.js';
import { AiFriends, PERSONAS, TEXT_MODEL, IMAGE_MODEL, isAiFriend, unsafeText, pickPostCount, modestTetris, modestRace } from '../src/friends.js';

function stubSql() {
  const db = new DatabaseSync(':memory:');
  return {
    db,
    exec(q, ...a) {
      if (!a.length && q.trim().replace(/;\s*$/, '').includes(';')) { db.exec(q); return { toArray: () => [] }; }
      const st = db.prepare(q);
      const out = /^\s*select/i.test(q) ? st.all(...a) : (st.run(...a), []);
      return { toArray: () => out.map(r => ({ ...r })) };
    }
  };
}

assert.equal(isAiFriend('ai:maisie'), true);
assert.equal(isAiFriend('m1'), false);
assert.equal(PERSONAS.length, 2);
assert.equal(PERSONAS[0].name, 'Chloe');
assert.equal(PERSONAS[0].id, 'ai:maisie');
assert.equal(PERSONAS[0].pron, 'she');
assert.match(PERSONAS[0].bio, /florist/i);
assert.match(PERSONAS[0].bio + PERSONAS[0].voice, /early thirties/);
assert.equal(/retired|60s|teacher/i.test(PERSONAS[0].bio + PERSONAS[0].voice), false);
assert.equal(PERSONAS[1].name, 'Liam');
assert.equal(PERSONAS[1].id, 'ai:ned');
assert.equal(PERSONAS[1].pron, 'he');
assert.match(PERSONAS[1].bio + PERSONAS[1].voice, /early to mid-30s/);
const shown = PERSONAS.map(p => p.name + ' ' + p.bio + ' ' + p.voice).join('\n');
assert.equal(/(Maisie|Cole|Ned|Farley|Turner|Parker|Chloe Turner|Liam Parker)/i.test(shown), false);
assert.match(PERSONAS[0].voice, /\bChloe\b/);
assert.match(PERSONAS[1].voice, /\bLiam\b/);
assert.match(TEXT_MODEL, /@cf\/meta\/llama-3/);
assert.match(IMAGE_MODEL, /^@cf\//);

assert.equal(unsafeText('A quiet walk to the Falls'), false);
assert.equal(unsafeText('The All Blacks won last night'), true, 'sport is skipped');
assert.equal(unsafeText('Vote for the Labour Party this year'), true, 'politics is skipped');
assert.equal(unsafeText('As an AI language model I cannot'), true);
assert.equal(unsafeText('Can someone send me a life?'), true);
assert.equal(unsafeText(''), true);

const counts = new Set();
for (let i = 0; i < 40; i++) counts.add(pickPostCount(() => i / 40));
assert.ok(counts.has(0) && counts.has(1) && counts.has(2));

const t1 = modestTetris(10000, 0);
assert.ok(t1.score < 10000, 'never takes tetris #1 from a higher human best');
assert.equal(t1.level, Math.floor(t1.lines / 10) + 1);
assert.ok(t1.score <= (200 * t1.lines * t1.level + 10 * (t1.lines * 10 + 200) + 1000));
const t2 = modestTetris(0, 0);
assert.ok(t2.score >= 800 && t2.score <= 14000);
const race = modestRace(8, 3);
assert.ok(race.stop < 8 || race.stop <= 7, 'stays behind or just under a human leader');
assert.ok(race.stop >= 2 && race.stars > 0);

const sql = stubSql();
sql.db.exec(`CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, tok TEXT, created INTEGER, seen INTEGER, removed INTEGER DEFAULT 0, pron TEXT, pshow INTEGER DEFAULT 0);
  CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT);
  CREATE TABLE photos (id INTEGER PRIMARY KEY AUTOINCREMENT, mid TEXT NOT NULL, post INTEGER, w INTEGER, h INTEGER, size INTEGER NOT NULL, data BLOB NOT NULL, at INTEGER NOT NULL);
  CREATE TABLE shares (id INTEGER PRIMARY KEY AUTOINCREMENT, mid TEXT NOT NULL, orig TEXT, snap TEXT NOT NULL, caption TEXT, priv INTEGER DEFAULT 0, at INTEGER NOT NULL, del INTEGER DEFAULT 0, tag TEXT, aud TEXT, circ TEXT);
  CREATE TABLE comments (id INTEGER PRIMARY KEY AUTOINCREMENT, card TEXT NOT NULL, mid TEXT NOT NULL, text TEXT NOT NULL, at INTEGER NOT NULL, snap TEXT, del INTEGER DEFAULT 0);`);
sql.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES ('m1','Shane','admin',1,0)`).run();
sql.db.prepare(`INSERT INTO members (id,name,role,created,removed) VALUES ('m2','Sarah','member',1,0)`).run();
scoresInit(sql);

const notes = [];
let replies = ['Just back from a slow walk up to the Falls — the spray off the top step was lovely this morning.',
  'Picked up a soft green cardigan that will be just right for the harbour wind.',
  'My chipped blue mug is doing the early-tea honours again today.'];
const mockAi = {
  async run(model, input) {
    if (String(model).includes('dreamshaper') || String(model).includes('stable-diffusion') || String(model).includes('flux')) {
      return { image: new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 16, ...new Array(600).fill(1)]) };
    }
    return { response: replies.shift() || 'A quiet cuppa after the school run, watching the clouds over the basin.' };
  }
};
const f = {
  sql,
  env: { AI: mockAi },
  one(q, ...a) { return sql.exec(q, ...a).toArray()[0] || null; },
  all(q, ...a) { return sql.exec(q, ...a).toArray(); }
};
const friends = new AiFriends(f);
const now = Date.parse('2026-11-23T22:00:00Z'); // 11am NZDT

assert.equal(friends.cfg().on, true);
friends.ensureMembers(now);
assert.ok(f.one(`SELECT id, name, pron, role, tok FROM members WHERE id='ai:maisie'`).tok == null);
assert.equal(f.one(`SELECT pron FROM members WHERE id='ai:ned'`).pron, 'he');
assert.equal(f.one(`SELECT name FROM members WHERE id='ai:maisie'`).name, 'Chloe');
assert.equal(f.one(`SELECT name FROM members WHERE id='ai:ned'`).name, 'Liam');

const kick = await friends.kick(now);
assert.equal(kick.ok, 1);
assert.equal(kick.posts.length, 2);
assert.ok(kick.posts.every(p => p.id), 'one live-style post each');
const posts = f.all(`SELECT mid, priv, aud FROM shares WHERE del=0`);
assert.equal(posts.length, 2);
assert.ok(posts.every(p => p.aud === 'fam'), 'family only');
assert.equal(notes.length, 0, 'kick must not send notifications (friends never call note)');
f.sql.exec(`UPDATE shares SET snap=? WHERE mid='ai:maisie'`, JSON.stringify({ t: 'old mug post', sn: 'Maisie Cole', kind: 'upload' }));
assert.equal(friends.renameSnaps() > 0, true);
assert.equal(JSON.parse(f.one(`SELECT snap FROM shares WHERE mid='ai:maisie'`).snap).sn, 'Chloe');
assert.equal(JSON.parse(f.one(`SELECT snap FROM shares WHERE mid='ai:ned'`).snap).sn, 'Liam');

// off switch stops tick work
friends.save({ on: 0 });
assert.equal(friends.cfg().on, false);
const off = await friends.tick(now);
assert.equal(off.off, 1);
friends.save({ on: 1 });

// unsafe generate is skipped
replies.unshift('As an AI language model I cannot discuss this');
const bad = await friends.publish(PERSONAS[0], 'life', now + 1000, false);
assert.equal(bad.skip, 'unsafe');

// tetris scores stay modest and tagged
await friends.maybeScores(now, true);
sql.db.prepare(`INSERT INTO scores (game,mid,score,lines,level,won,opp,at) VALUES ('tetris','m2',20000,40,5,NULL,NULL,?)`).run(now);
await friends.maybeScores(now + 864e5, true); // new day so it runs again
const b = board(sql, { id: 'm1', name: 'Shane', role: 'admin' }, 'tetris');
const chloe = (b.body.best || []).find(x => x.name === 'Chloe');
assert.ok(chloe && chloe.ai === 1);
assert.ok(chloe.score < 20000, 'does not overtake a strong human best on the next update');
const rb = raceBoard(sql, { id: 'm1', name: 'Shane', role: 'admin' }, now);
assert.ok((rb.body.racers || []).some(r => r.ai && r.name === 'Liam'));

// lives list omits AI friends
const lv = livesView(sql, { id: 'm1', name: 'Shane', role: 'admin' }, now);
assert.ok(!(lv.family || []).some(x => /Chloe|Liam/.test(x.name)), 'AI friends are not in the lives send list');
assert.equal(JSON.stringify(lv).includes('ai:'), false);

console.log('aifriends tests ok');
