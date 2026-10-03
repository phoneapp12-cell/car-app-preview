/* Live driving time from home to work. Fixed coordinates only.
   Google Maps directions (usual traffic). The reply is minutes, never a street. */
const HOME = '-35.7495414,174.3646323';
const WORK = '-35.7300535,174.3273886';

export function parseGoogleDir(text) {
  let raw = String(text || '').replace(/^\uFEFF/, '');
  if (raw.startsWith(")]}'")) {
    const nl = raw.indexOf('\n');
    raw = nl >= 0 ? raw.slice(nl + 1) : '';
  }
  let data;
  try { data = JSON.parse(raw); } catch (e) { return null; }
  let best = null;
  const walk = o => {
    if (!Array.isArray(o)) return;
    if (o.length >= 4 && typeof o[1] === 'string' && o[1] && Array.isArray(o[2]) && Array.isArray(o[3])) {
      const metres = o[2][0], km = o[2][1], sec = o[3][0], label = o[3][1];
      if (typeof metres === 'number' && metres >= 4000 && metres <= 20000 &&
          typeof sec === 'number' && sec >= 60 && sec <= 3 * 3600 &&
          typeof label === 'string' && /^\d+\s*min/.test(label) &&
          typeof km === 'string' && /km/.test(km)) {
        if (!best || sec < best.seconds) best = { seconds: Math.round(sec), metres };
      }
    }
    for (const x of o) walk(x);
  };
  walk(data);
  return best ? { seconds: best.seconds } : null;
}

export async function getDrive(fetchImpl = fetch) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const pageUrl = 'https://www.google.com/maps/dir/' + HOME + '/' + WORK + '/';
    const page = await fetchImpl(pageUrl, {
      signal: ctl.signal,
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Mozilla/5.0' }
    });
    if (!page.ok) throw new Error('upstream');
    const html = await page.text();
    const m = html.match(/\/maps\/preview\/directions\?[^"\\<\s]+/);
    if (!m) throw new Error('no_preview');
    const prev = 'https://www.google.com' + m[0].replace(/&amp;/g, '&');
    const res = await fetchImpl(prev, {
      signal: ctl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
    });
    if (!res.ok) throw new Error('upstream');
    const parsed = parseGoogleDir(await res.text());
    if (!parsed) throw new Error('no_time');
    return { seconds: parsed.seconds };
  } finally { clearTimeout(timer); }
}
