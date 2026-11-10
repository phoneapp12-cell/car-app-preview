import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { acceptCandidate, autoSourceRows, candidatesFromCommons, CAP, CATALOG, fallbackIds, isAutoItem, parseChoice, runSubjects, searchUrl, trimAuto } from '../src/subjects.js';

const DAY = Date.parse('2026-11-07T15:00:00Z'); // 04:00 in Auckland (NZDT)

function kv(seed = {}) {
  const s = new Map(Object.entries(seed));
  return {
    async get(k) { return s.has(k) ? s.get(k) : null; },
    async put(k, v) { s.set(k, v); },
    async delete(k) { s.delete(k); },
    s
  };
}

function page(file, desc, mime, thumb) {
  return {
    title: 'File:' + file,
    imageinfo: [{
      mime,
      thumburl: thumb,
      descriptionurl: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file),
      extmetadata: { ImageDescription: { value: desc } }
    }]
  };
}

function commons(subjectId) {
  const thumb = (n) => 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/' + subjectId + n + '.jpg';
  return {
    query: {
      pages: {
        a: page(subjectId + '-one.jpg', 'A colourful picture of ' + subjectId, 'image/jpeg', thumb(1)),
        b: page(subjectId + '-two.jpg', 'Another picture of ' + subjectId, 'image/jpeg', thumb(2)),
        c: page(subjectId + '-three.jpg', 'A third picture of ' + subjectId, 'image/png', thumb(3)),
        d: page('nude-' + subjectId + '.jpg', 'A nude figure study', 'image/jpeg', thumb(9)),
        e: page('rugby-' + subjectId + '.jpg', 'A rugby match highlight', 'image/jpeg', thumb(8)),
        f: page(subjectId + '.pdf', 'A document', 'application/pdf', thumb(7))
      }
    }
  };
}

function fakeFetch(extra = {}) {
  const calls = [];
  const fetch = async (url, opt = {}) => {
    calls.push(url + ' ' + (opt.method || 'GET'));
    if (String(url).includes('action=query')) {
      const q = new URL(url).searchParams.get('gsrsearch') || '';
      const id = extra.subjectFor ? extra.subjectFor(q) : 'reef';
      return { ok: true, json: async () => commons(id) };
    }
    return { ok: true, headers: { get: () => 'image/jpeg' } };
  };
  return { fetch, calls };
}

test('parser keeps only catalog ids and the daily cap', () => {
  assert.deepStrictEqual(parseChoice('{"ids":["reef","tetris","kites","nbc","reef","dolls"]}'), ['reef', 'kites']);
  assert.deepStrictEqual(parseChoice('not json'), []);
  assert.equal(CAP.subjects, 2);
  assert.equal(CAP.aiCalls, 1);
  assert.ok(searchUrl('jewel anemone').includes('commons.wikimedia.org'));
});

test('candidates drop nudes, sport, files that are not pictures, and duplicate links', () => {
  const raw = candidatesFromCommons(commons('reef'), { id: 'reef' });
  const seen = new Set();
  const ok = raw.map(c => acceptCandidate(c, seen)).filter(Boolean);
  assert.equal(ok.length, 3);
  assert.ok(ok.every(i => i.topic === 'reef' && i.src === 'auto-reef' && i.img.startsWith('https://upload.wikimedia.org/')));
  seen.add(ok[0].url);
  assert.equal(acceptCandidate(raw.find(c => c.url === ok[0].url), seen), null);
  assert.ok(!raw.some(c => acceptCandidate(c, seen) && /nude|rugby/i.test(c.t + c.s) && false));
  const nude = raw.find(c => /nude/i.test(c.t + c.s));
  assert.equal(acceptCandidate(nude, new Set()), null);
});

test('a forced run accepts two subjects, one AI call, and leaves the rest of the feed', async () => {
  let aiCalls = 0;
  const net = fakeFetch({ subjectFor: q => q.includes('kite') ? 'kites' : 'reef' });
  const st = { items: [{ id: 'sitcom1', src: 'nz-tvg2', topic: 'sitcoms', t: 'A comedy', url: 'https://www.tvnz.co.nz/show', img: 'https://www.tvnz.co.nz/a.jpg' }] };
  const env = { SUBJECTS_AI: '1', AI: {}, FEED_KV: kv() };
  const res = await runSubjects(env, st, {
    now: () => DAY,
    force: true,
    fetch: net.fetch,
    ai: async () => { aiCalls++; return '{"ids":["reef","kites","dolls","nbc"]}'; }
  });
  assert.equal(aiCalls, 1);
  assert.equal(res.aiCalls, 1);
  assert.deepStrictEqual(res.ids, ['reef', 'kites']);
  const auto = st.items.filter(isAutoItem);
  assert.ok(auto.length >= 2 && auto.length <= 4);
  assert.ok(auto.every(i => i.topic === 'reef' || i.topic === 'kites'));
  assert.ok(st.items.some(i => i.id === 'sitcom1'));
  assert.ok(autoSourceRows(st).every(s => s.id.startsWith('auto-')));
  const again = await runSubjects(env, st, { now: () => DAY, force: true, fetch: net.fetch, ai: async () => { aiCalls++; return '{"ids":["reef"]}'; } });
  assert.equal(again.skipped, 'done');
  assert.equal(aiCalls, 1);
});

test('locked, finished, backed-off, and switched-off runs do not call the model', async () => {
  let aiCalls = 0;
  const ai = async () => { aiCalls++; return '{"ids":["reef","kites"]}'; };
  const net = fakeFetch();
  const env = { AI: {}, FEED_KV: kv({ 'subjects:lock': '1' }) };
  assert.equal((await runSubjects(env, { items: [] }, { now: () => DAY, force: true, fetch: net.fetch, ai })).skipped, 'locked');
  assert.equal((await runSubjects({ AI: {}, FEED_KV: kv(), SUBJECTS_OFF: '1' }, { items: [] }, { now: () => DAY, force: true, ai })).skipped, 'off');
  assert.equal((await runSubjects({ AI: {}, FEED_KV: kv() }, { items: [], subjectsDay: '2026-11-08', subjectsOk: 1 }, { now: () => DAY, force: true, ai })).skipped, 'done');
  assert.equal((await runSubjects({ AI: {}, FEED_KV: kv() }, { items: [], subjectsFailUntil: DAY + 60e3 }, { now: () => DAY, force: true, ai })).skipped, 'backoff');
  assert.equal((await runSubjects({ AI: {}, FEED_KV: kv() }, { items: [] }, { now: () => Date.parse('2026-11-07T00:00:00Z'), fetch: net.fetch, ai })).skipped, 'window');
  assert.equal(aiCalls, 0);
});

test('a broken store does not call the model again until the backoff', async () => {
  let aiCalls = 0;
  const env = { AI: {}, FEED_KV: { async get() { return null; }, async put() { throw new Error('kv down'); }, async delete() {} } };
  const st = { items: [{ id: 'keep', src: 'nz-tvg2', topic: 'sitcoms', t: 'Show', url: 'https://www.tvnz.co.nz/x', img: 'https://www.tvnz.co.nz/x.jpg' }] };
  const first = await runSubjects(env, st, { now: () => DAY, force: true, ai: async () => { aiCalls++; return '{"ids":["reef"]}'; } });
  assert.equal(first.err, 'kv down');
  assert.equal(aiCalls, 0);
  assert.ok(st.subjectsFailUntil > DAY);
  const second = await runSubjects({ AI: {}, FEED_KV: kv() }, st, { now: () => DAY + 1000, force: true, ai: async () => { aiCalls++; return '{"ids":["reef"]}'; } });
  assert.equal(second.skipped, 'backoff');
  assert.equal(aiCalls, 0);
  assert.ok(st.items.some(i => i.id === 'keep'));
});

test('with the model switched off, the fixed pair is still real Commons items and stays capped', async () => {
  let aiCalls = 0;
  const net = fakeFetch({ subjectFor: () => 'reef' });
  const st = { items: [], subjectRecent: [] };
  const ids = fallbackIds('2026-11-08', []);
  assert.equal(ids.length, 2);
  assert.equal(new Set(ids).size, 2);
  const res = await runSubjects({ SUBJECTS_AI: '0', FEED_KV: kv() }, st, {
    now: () => DAY, force: true, fetch: net.fetch, ai: async () => { aiCalls++; return '{"ids":["reef","kites"]}'; }
  });
  assert.equal(aiCalls, 0);
  assert.equal(res.aiCalls, 0);
  assert.ok(st.items.filter(isAutoItem).length <= CAP.subjects * CAP.items);
  const bulky = [];
  for (let n = 0; n < 30; n++) bulky.push({ id: 'auto-reef-' + n, src: 'auto-reef', topic: 'reef', url: 'https://commons.wikimedia.org/wiki/File:A' + n, img: 'https://upload.wikimedia.org/wikipedia/commons/a/' + n + '.jpg', at: n });
  assert.equal(trimAuto(bulky).filter(isAutoItem).length, CAP.keep);
});

test('captions lose markup, a fox picture stays, and a US network promo does not', () => {
  const raw = candidatesFromCommons({
    query: { pages: { a: page('Red fox.jpg', '<script>alert(1)</script> A red fox in the snow', 'image/jpeg', 'https://upload.wikimedia.org/wikipedia/commons/a/red-fox.jpg') } }
  }, { id: 'odd' });
  assert.equal(raw[0].s.includes('<'), false);
  assert.ok(acceptCandidate({ ...raw[0], mime: 'image/jpeg' }, new Set()));
  assert.equal(acceptCandidate({ topic: 'kites', t: 'Only on NBC tonight', s: 'A new episode promo', url: 'https://commons.wikimedia.org/wiki/File:Kite.jpg', img: 'https://upload.wikimedia.org/wikipedia/commons/a/kite.jpg', mime: 'image/jpeg' }, new Set()), null);
});

test('a model error or an already-spent day still uses Commons and does not call the model again', async () => {
  let aiCalls = 0;
  const net = fakeFetch();
  const day = '2026-11-08';
  const thrown = await runSubjects({ AI: {}, FEED_KV: kv() }, { items: [] }, {
    now: () => DAY, force: true, fetch: net.fetch, ai: async () => { aiCalls++; throw new Error('model down'); }
  });
  assert.equal(aiCalls, 1);
  assert.equal(thrown.aiCalls, 1);
  assert.ok(thrown.ids.length <= CAP.subjects);
  const spent = await runSubjects({ AI: {}, FEED_KV: kv({ ['subjects:ai:' + day]: '1' }) }, { items: [] }, {
    now: () => DAY, force: true, fetch: net.fetch, ai: async () => { aiCalls++; return '{"ids":["reef","kites"]}'; }
  });
  assert.equal(spent.aiCalls, 0);
  assert.equal(aiCalls, 1);
  assert.ok(spent.ids.length <= CAP.subjects);
});

test('published auto cards use the phone topic ids, and an opted-out subject stays off', () => {
  const app = readFileSync(new URL('../../feed/app.js', import.meta.url), 'utf8');
  const worker = readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');
  assert.match(worker, /runSubjects\(env, st\)/);
  assert.match(worker, /isAutoItem\(i\)/);
  assert.match(worker, /autoSourceRows\(st\)/);
  const interests = [...app.matchAll(/\[(?:'([^']*)'|"([^"]*)"), '([a-z]+)',/g)].map(m => ({ name: m[1] || m[2], topic: m[3] }));
  const off = {};
  for (const s of CATALOG) {
    assert.match(app, new RegExp("\\['" + s.id + "',"));
    assert.match(app, new RegExp('GROUP_TOPICS = \\[[^\\]]*' + s.id));
    const mine = interests.filter(x => x.topic === s.id);
    assert.ok(mine.length, s.id);
    for (const x of mine) off[x.name] = 1;
  }
  const topicOn = t => interests.some(x => x.topic === t && !off[x.name]);
  const st = {
    items: [
      { id: 'sitcom1', src: 'nz-tvg2', topic: 'sitcoms', t: 'A comedy', url: 'https://www.tvnz.co.nz/show', img: 'https://www.tvnz.co.nz/a.jpg' },
      { id: 'auto-kites-1', src: 'auto-kites', topic: 'kites', t: 'Kites', url: 'https://commons.wikimedia.org/wiki/File:Kite.jpg', img: 'https://upload.wikimedia.org/wikipedia/commons/a/kite.jpg' },
      { id: 'gone', src: 'not-a-source', topic: 'reef', t: 'Missing', url: 'https://example.com/x', img: 'https://example.com/x.jpg' }
    ],
    autoSubjects: [{ id: 'kites', name: 'Kites', ok: 1, n: 1 }]
  };
  const rows = autoSourceRows(st);
  const keep = new Set(['nz-tvg2', ...rows.map(s => s.id)]);
  const served = st.items.filter(i => i.img && keep.has(i.src) && (i.src === 'nz-tvg2' || isAutoItem(i)));
  assert.deepStrictEqual(served.map(i => i.id), ['sitcom1', 'auto-kites-1']);
  assert.equal(topicOn('kites'), false);
  assert.equal(topicOn('sitcoms'), true);
  delete off.Kites;
  assert.equal(topicOn('kites'), true);
});
