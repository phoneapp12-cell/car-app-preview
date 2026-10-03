/* Live driving time from home to work. Fixed coordinates only.
   Bing Maps driving route with current traffic, using the public directions page.
   The reply is seconds, never a street. */
const HOME = '-35.7495414,174.3646323';
const WORK = '-35.7300535,174.3273886';

export async function getDrive(fetchImpl = fetch) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const pageUrl = 'https://www.bing.com/maps/directions?rtp=pos.' + HOME.replace(',', '_') + '~pos.' + WORK.replace(',', '_') + '&style=d';
    const page = await fetchImpl(pageUrl, {
      signal: ctl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en' }
    });
    if (!page.ok) throw new Error('page');
    const html = await page.text();
    const key = (html.match(/sessionKey":"([^"]+)"/) || [])[1];
    if (!key || key.length < 8 || key.length > 200) throw new Error('no_key');
    const routeUrl = 'https://dev.virtualearth.net/REST/v1/Routes/Driving?wp.0=' + encodeURIComponent(HOME) + '&wp.1=' + encodeURIComponent(WORK) + '&optimize=timeWithTraffic&du=km&key=' + encodeURIComponent(key);
    const res = await fetchImpl(routeUrl, {
      signal: ctl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Referer': 'https://www.bing.com/maps/' }
    });
    if (!res.ok) throw new Error('route');
    const data = await res.json();
    const sets = data && data.resourceSets;
    const resource = sets && sets[0] && sets[0].resources && sets[0].resources[0];
    const sec = resource && Number(resource.travelDurationTraffic);
    const km = resource && Number(resource.travelDistance);
    if (!Number.isFinite(sec) || sec < 60 || sec > 3 * 3600) throw new Error('no_time');
    if (!Number.isFinite(km) || km < 4 || km > 20) throw new Error('no_time');
    return { seconds: Math.round(sec) };
  } finally { clearTimeout(timer); }
}
