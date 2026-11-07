/* 1.9.114 daily picture subjects. The 10-minute cron still refreshes ordinary sources.
   This job runs at most once per New Zealand day, inside the 4am hour, and makes at most
   one small Workers AI call to choose two ids from a fixed catalog. The pictures and
   captions come from Wikimedia Commons, and only after the image URL checks out.
   Set the Worker variable SUBJECTS_OFF to "1" to skip the job.
   Set SUBJECTS_AI to "0" to skip the model and use the day's fixed pair instead.
   Cloudflare's free Workers AI allocation is 10,000 neurons a day (the same note as Info Bot).
   One short call is a small slice of that. It does not promise the account will never be billed
   if the allocation is already used or the account is on a paid plan. */
import { isUnsafe } from './safe.js';

export const AI_MODEL = '@cf/meta/llama-3.2-1b-instruct';
export const CAP = {
  subjects: 2,
  items: 2,
  aiCalls: 1,
  maxTokens: 60,
  fetches: 6,
  timeoutMs: 8000,
  lockSec: 900,
  failBackoffMs: 6 * 3600e3,
  keep: 20,
  hour: 4
};

export const CATALOG = [
  { id: 'illusions', name: 'Optical illusions', q: 'optical illusion diagram' },
  { id: 'odd', name: 'Unusual animals', q: 'tuatara New Zealand' },
  { id: 'colour', name: 'Playful colour', q: 'colourful public art' },
  { id: 'looks', name: 'Wow places', q: 'New Zealand landscape' },
  { id: 'reef', name: 'Colourful sea life', q: 'jewel anemone New Zealand' },
  { id: 'dolls', name: "Doll's houses", q: 'dollhouse interior furnished' },
  { id: 'keeps', name: 'Everyday keepsakes', q: 'rotary dial telephone' },
  { id: 'glass', name: 'Stained glass', q: 'Tiffany stained glass lamp' },
  { id: 'kites', name: 'Kites', q: 'colorful kites festival' },
  { id: 'lanterns', name: 'Paper lanterns', q: 'paper lanterns' }
];

const ALLOWED = new Set(CATALOG.map(s => s.id));
const BLOCK = /\b(sport|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic|nude|naked|nsfw|porn|sex|bikini|\$\s?\d|invest|stock|crypto|bitcoin|mortgage|tax|budget|murder|stabbing|shooting|court|jailed|charged|election|parliament|politic|trump|reddit|tetris|comedy central|paywall|subscribe to read|sign in to read)\b|\b(stan|neon|nbc|fox)\b.{0,24}\b(only|exclusive|promo|premiere|episode)\b|\b(only|exclusive|new) on (stan|neon|nbc|fox)\b/i;
const BAD_URL = /javascript:|data:|reddit\.com|redd\.it|stan\.|neon|youtube\.com\/watch/i;

export function nzParts(t) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit' }).formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return { day: p.year + '-' + p.month + '-' + p.day, hour: Number(p.hour) };
}

export function isAutoItem(i) { return !!(i && typeof i.src === 'string' && i.src.startsWith('auto-') && ALLOWED.has(i.topic)); }

export function autoSourceRows(st) {
  const meta = Array.isArray(st && st.autoSubjects) ? st.autoSubjects : [];
  return meta.filter(s => s && ALLOWED.has(s.id)).map(s => ({ id: 'auto-' + s.id, name: s.name || s.id, topic: s.id, ok: s.ok || 0, n: s.n || 0 }));
}

export function parseChoice(text) {
  const raw = String(text || '');
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return [];
  let j; try { j = JSON.parse(m[0]); } catch (e) { return []; }
  const ids = Array.isArray(j.ids) ? j.ids : [];
  const out = [];
  for (const id of ids) {
    if (typeof id !== 'string' || !ALLOWED.has(id) || out.includes(id)) continue;
    out.push(id);
    if (out.length >= CAP.subjects) break;
  }
  return out;
}

export function fallbackIds(day, recent) {
  const skip = new Set(recent || []);
  const pool = CATALOG.map(s => s.id).filter(id => !skip.has(id));
  const list = pool.length >= CAP.subjects ? pool : CATALOG.map(s => s.id);
  const n = Math.abs(hash(day)) % list.length;
  return [0, 1].map(k => list[(n + k * 3) % list.length]).filter((id, i, a) => a.indexOf(id) === i).slice(0, CAP.subjects);
}

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return h; }

export function searchUrl(query) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  u.searchParams.set('action', 'query');
  u.searchParams.set('format', 'json');
  u.searchParams.set('generator', 'search');
  u.searchParams.set('gsrsearch', query);
  u.searchParams.set('gsrnamespace', '6');
  u.searchParams.set('gsrlimit', '5');
  u.searchParams.set('prop', 'imageinfo');
  u.searchParams.set('iiprop', 'url|mime|extmetadata');
  u.searchParams.set('iiurlwidth', '1200');
  return u.href;
}

const clip = (s, n) => { s = String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };

export function candidatesFromCommons(json, subject) {
  const pages = json && json.query && json.query.pages || {};
  const out = [];
  for (const page of Object.values(pages)) {
    const info = (page.imageinfo || [])[0];
    if (!info) continue;
    const mime = String(info.mime || '');
    const img = info.thumburl || (mime.startsWith('image/') ? info.url : '');
    const file = String(page.title || '').replace(/^File:/, '');
    const desc = clip((info.extmetadata && info.extmetadata.ImageDescription && info.extmetadata.ImageDescription.value) || file, 180);
    const title = clip(file.replace(/[_-]+/g, ' ').replace(/\.[a-z0-9]+$/i, ''), 120);
    const pageUrl = info.descriptionurl || ('https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file).replace(/%20/g, '_'));
    out.push({ topic: subject.id, t: title, s: desc, url: pageUrl, img, mime, file });
    if (out.length >= 5) break;
  }
  return out;
}

export function acceptCandidate(c, seen) {
  if (!c || !ALLOWED.has(c.topic)) return null;
  const img = String(c.img || '');
  const url = String(c.url || '');
  if (!/^https:\/\/(upload\.wikimedia\.org|commons\.wikimedia\.org)\//.test(img)) return null;
  if (!/^https:\/\/commons\.wikimedia\.org\//.test(url)) return null;
  if (BAD_URL.test(url) || BAD_URL.test(img)) return null;
  if (!/^image\/(jpeg|png|webp|gif)$/.test(c.mime || '')) return null;
  const blob = c.t + ' ' + c.s;
  if (!c.t || BLOCK.test(blob) || isUnsafe({ t: c.t, s: c.s, url, topic: c.topic })) return null;
  if (/new episode|streaming on|available on|tonight on|airing/i.test(blob)) return null;
  const id = 'auto-' + c.topic + '-' + hash(url);
  if (seen.has(id) || seen.has(url)) return null;
  return { id, t: c.t, s: c.s, url, img, topic: c.topic, src: 'auto-' + c.topic, sn: 'Wikimedia Commons', kind: 'photo', at: Date.now() };
}

export function trimAuto(items) {
  const auto = [], rest = [];
  for (const i of items || []) (isAutoItem(i) ? auto : rest).push(i);
  auto.sort((a, b) => (b.at || 0) - (a.at || 0));
  return rest.concat(auto.slice(0, CAP.keep));
}

async function withTimeout(p, ms) {
  let timer;
  const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), ms); });
  try { return await Promise.race([p, timeout]); } finally { clearTimeout(timer); }
}

async function defaultAi(env, allowed) {
  if (!env || !env.AI) throw new Error('no-ai');
  const sys = 'You pick picture subjects for a New Zealand family photo feed. Reply with JSON only: {"ids":["id1","id2"]}. Use only ids from the user message. No articles, no links, no other words.';
  const user = 'Ids: ' + (allowed || []).join(', ');
  const r = await env.AI.run(AI_MODEL, { messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], max_tokens: CAP.maxTokens, temperature: 0 });
  return String((r && (r.response || (r.result && r.result.response))) || '');
}

export async function runSubjects(env, st, deps = {}) {
  const nowFn = deps.now || (() => Date.now());
  const now = nowFn();
  const fetchImpl = deps.fetch || fetch;
  const aiImpl = deps.ai || ((e, list) => defaultAi(e, list));
  const parts = nzParts(now);
  if (!env || env.SUBJECTS_OFF === '1') return { skipped: 'off' };
  if (!env.FEED_KV) return { skipped: 'no-kv' };
  if (st.subjectsDay === parts.day && st.subjectsOk) return { skipped: 'done', aiCalls: 0 };
  if (st.subjectsFailUntil && now < st.subjectsFailUntil) return { skipped: 'backoff', aiCalls: 0 };
  if (!deps.force && parts.hour !== CAP.hour) return { skipped: 'window', aiCalls: 0 };
  const lock = await env.FEED_KV.get('subjects:lock');
  if (lock) return { skipped: 'locked', aiCalls: 0 };
  let aiCalls = 0, fetches = 0, owned = false;
  try {
    const token = String(now);
    await env.FEED_KV.put('subjects:lock', token, { expirationTtl: CAP.lockSec });
    if (await env.FEED_KV.get('subjects:lock') !== token) return { skipped: 'locked', aiCalls: 0 };
    owned = true;
    const recent = Array.isArray(st.subjectRecent) ? st.subjectRecent : [];
    let ids = [];
    const aiKey = 'subjects:ai:' + parts.day;
    let allowAi = env.SUBJECTS_AI !== '0' && (deps.ai || env.AI) && st.subjectsAiDay !== parts.day && aiCalls < CAP.aiCalls;
    if (allowAi && await env.FEED_KV.get(aiKey)) allowAi = false;
    if (allowAi) {
      await env.FEED_KV.put(aiKey, '1', { expirationTtl: 36 * 3600 });
      if (await env.FEED_KV.get(aiKey) !== '1') return { skipped: 'locked', aiCalls: 0 };
      st.subjectsAiDay = parts.day;
      aiCalls = 1;
      const allowed = CATALOG.map(s => s.id).filter(id => !recent.includes(id));
      const list = (allowed.length >= CAP.subjects ? allowed : CATALOG.map(s => s.id));
      let text = '';
      try { text = await withTimeout(aiImpl(env, list), CAP.timeoutMs); } catch (e) { text = ''; }
      ids = parseChoice(text).filter(id => list.includes(id));
    }
    if (!ids.length) ids = fallbackIds(parts.day, recent);
    ids = ids.slice(0, CAP.subjects);
    const seen = new Set((st.items || []).flatMap(i => [i.id, i.url]));
    const accepted = [];
    for (const id of ids) {
      if (fetches >= CAP.fetches) break;
      const subject = CATALOG.find(s => s.id === id);
      fetches++;
      let json = null;
      try {
        const r = await withTimeout(fetchImpl(searchUrl(subject.q), { headers: { Accept: 'application/json' } }), CAP.timeoutMs);
        if (!r || !r.ok) throw new Error('search');
        json = await r.json();
      } catch (e) { continue; }
      let n = 0;
      for (const c of candidatesFromCommons(json, subject)) {
        if (n >= CAP.items) break;
        if (fetches >= CAP.fetches) break;
        fetches++;
        let ok = false;
        try {
          const head = await withTimeout(fetchImpl(c.img, { method: 'HEAD' }), CAP.timeoutMs);
          const ctype = String(head && head.headers && (head.headers.get ? head.headers.get('content-type') : head.headers['content-type']) || '');
          c.mime = ctype.split(';')[0].trim().toLowerCase();
          ok = !!(head && head.ok && /^image\/(jpeg|png|webp|gif)$/.test(c.mime));
        } catch (e) { ok = false; }
        if (!ok) continue;
        const item = acceptCandidate(c, seen);
        if (!item) continue;
        item.at = now - n * 60e3;
        accepted.push(item);
        seen.add(item.id); seen.add(item.url);
        n++;
      }
    }
    st.items = trimAuto((st.items || []).filter(i => !(isAutoItem(i) && ids.includes(i.topic))).concat(accepted));
    st.subjectRecent = ids;
    st.autoSubjects = ids.map(id => { const s = CATALOG.find(x => x.id === id); return { id, name: s.name, ok: now, n: accepted.filter(i => i.topic === id).length }; });
    st.subjectsDay = parts.day;
    st.subjectsOk = 1;
    delete st.subjectsFailUntil;
    st.subjectsChanged = 1;
    return { ok: 1, changed: accepted.length, ids, aiCalls, fetches };
  } catch (e) {
    st.subjectsFailUntil = now + CAP.failBackoffMs;
    st.subjectsErr = String(e && e.message || e).slice(0, 160);
    return { err: st.subjectsErr, aiCalls };
  } finally {
    if (owned) { try { await env.FEED_KV.delete('subjects:lock'); } catch (e) { } }
  }
}
