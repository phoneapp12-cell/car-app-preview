/* How busy Noel Leeming Whangarei Supa is, from Google's public Maps place payload.
   One fixed place (the Supa store Noel Leeming links on their own site). No address is returned.
   A live label is used when Google sends one. Otherwise the popular-times label for this
   hour in Pacific/Auckland, and only when that hour has a real label and a non-zero bar.
   An empty label, a closed hour, or an unknown phrase is no reading, not a guess. */
const PLACE_ID = 'ChIJWdxTnfF-C20RVO9nRj_HK7k';
const FID = '0x6d0b7ef19d53dc59:0xb92bc73f4667ef54';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const PB = '!1m13!1s' + FID +
  '!3m8!1m3!1d5000!2d174.327536!3d-35.730384!3m2!1i1024!2i768!4f13.1' +
  '!4m2!3d-35.730384!4d174.327536' +
  '!12m4!2m3!1i360!2i120!4i8' +
  '!13m57!2m2!1i203!2i100!3m2!2i4!5b1' +
  '!6m6!1m2!1i86!2i86!1m2!1i408!2i240' +
  '!7m33!1m3!1e1!2b0!3e3!1m3!1e2!2b1!3e2!1m3!1e2!2b0!3e3' +
  '!1m3!1e8!2b0!3e3!1m3!1e10!2b0!3e3!1m3!1e10!2b1!3e2' +
  '!1m3!1e10!2b0!3e4!1m3!1e9!2b1!3e2!2b1!9b0' +
  '!15m8!1m7!1m2!1m1!1e2!2m2!1i195!2i195!3i20' +
  '!14m3!1s0ahUKEwixxxxxxxxxxxxxxxxxxxxxxxxx!7e81!15i10112' +
  '!15m108!1m26!13m9!2b1!3b1!4b1!6i1!8b1!9b1!14b1!20b1!25b1' +
  '!18m15!3b1!4b1!5b1!6b1!13b1!14b1!17b1!21b1!22b1!30b1!32b1!33m1!1b1!34b1!36e2' +
  '!10m1!8e3!11m1!3e1!17b1!20m2!1e3!1e6!24b1!25b1!26b1!27b1!29b1' +
  '!30m1!2b1!36b1!37b1!39m3!2m2!2i1!3i1!43b1!52b1!54m1!1b1!55b1!56m1!1b1' +
  '!61m2!1m1!1e1!65m5!3m4!1m3!1m2!1i224!2i298' +
  '!72m22!1m8!2b1!5b1!7b1!12m4!1b1!2b1!4m1!1e1!4b1' +
  '!8m10!1m6!4m1!1e1!4m1!1e3!4m1!1e4' +
  '!3sother_user_google_review_posts__and__hotel_and_vr_partner_review_posts' +
  '!6m1!1e1!9b1!89b1!90m2!1m1!1e2!98m3!1b1!2b1!3b1!103b1!113b1' +
  '!114m3!1b1!2m1!1b1!117b1!122m1!1b1!126b1!127b1!128m1!1b0' +
  '!21m0!22m1!1e81!30m8!3b1!6m2!1b1!2b1!7m2!1e3!2b1!9b1' +
  '!34m5!7b1!10b1!14b1!15m1!1b0!37i785';

function levelOf(raw) {
  const s = String(raw || '').toLowerCase().replace(/^usually\s+/, '').replace(/\s+/g, ' ').trim();
  if (s === 'as busy as it gets') return 'packed';
  if (s === 'busier than usual') return 'busier';
  if (s === 'less busy than usual') return 'quieter';
  if (s === 'a little busy') return 'little';
  if (s === 'not too busy') return 'easy';
  if (s === 'not busy') return 'quiet';
  return '';
}

export function aucklandParts(now) {
  const fmt = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', hour: '2-digit', hourCycle: 'h23' });
  const parts = Object.fromEntries(fmt.formatToParts(now instanceof Date ? now : new Date()).map(p => [p.type, p.value]));
  const day = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[parts.weekday];
  let hour = +parts.hour;
  if (hour === 24) hour = 0;
  if (!day || !Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  return { day, hour };
}

export function readBusy(text, now) {
  let body = String(text || '').replace(/^\)\]\}'\s*/, '');
  const data = JSON.parse(body);
  const d = data && data[6];
  if (!Array.isArray(d)) throw new Error('shape');
  if (d[78] !== PLACE_ID) throw new Error('place');
  const name = String(d[11] || '');
  if (!/noel leeming/i.test(name) || !/whangarei|whangārei/i.test(name) || !/\bsupa\b/i.test(name)) throw new Error('place');
  const pop = d[84];
  if (!Array.isArray(pop)) return null;
  const live = levelOf(typeof pop[6] === 'string' ? pop[6] : '');
  if (live) return { basis: 'live', level: live };
  const when = aucklandParts(now);
  const days = pop[0];
  if (!when || !Array.isArray(days)) return null;
  const day = days.find(x => Array.isArray(x) && x[0] === when.day);
  const hours = day && day[1];
  if (!Array.isArray(hours)) return null;
  const slot = hours.find(h => Array.isArray(h) && h[0] === when.hour);
  if (!slot) return null;
  const pct = Number(slot[1]);
  const usual = levelOf(slot[2]);
  if (!usual || !Number.isFinite(pct) || pct <= 0) return null;
  return { basis: 'usual', level: usual };
}

function nidFrom(res) {
  let cookies = [];
  try { if (res.headers && typeof res.headers.getSetCookie === 'function') cookies = res.headers.getSetCookie() || []; } catch (e) { cookies = []; }
  for (const c of cookies) {
    const m = /^NID=([^;]+)/.exec(String(c || ''));
    if (m && m[1]) return m[1];
  }
  const raw = res.headers && res.headers.get ? (res.headers.get('set-cookie') || '') : '';
  const m = /(?:^|,\s*)NID=([^;,]+)/.exec(raw);
  return m ? m[1] : '';
}

export async function getStoreBusy(fetchImpl = fetch, now = new Date()) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const headers = { 'User-Agent': UA, 'Accept-Language': 'en' };
    const session = await fetchImpl('https://www.google.com/maps?hl=en', { signal: ctl.signal, headers, redirect: 'follow' });
    const nid = nidFrom(session);
    try { if (session.body && session.body.cancel) session.body.cancel(); } catch (e) { /* ignore */ }
    if (!session.ok || !nid) throw new Error('no_session');
    const url = 'https://www.google.com/maps/preview/place?authuser=0&hl=en&gl=nz&pb=' + encodeURIComponent(PB).replace(/%21/g, '!');
    const res = await fetchImpl(url, {
      signal: ctl.signal,
      headers: { ...headers, Cookie: 'NID=' + nid, Referer: 'https://www.google.com/maps' },
      redirect: 'follow'
    });
    if (!res.ok) throw new Error('place');
    const text = await res.text();
    if (!text || text.length < 50 || /unusual traffic|consent\.google\.com/i.test(text.slice(0, 500))) throw new Error('blocked');
    return readBusy(text, now);
  } finally { clearTimeout(timer); }
}
