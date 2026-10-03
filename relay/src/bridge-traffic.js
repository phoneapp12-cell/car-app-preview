/* NZTA Traffic and Travel for Northland, read server-side because the public API
   sends no CORS header. Fixed URL, no caller input. The phone decides whether an
   event is this bridge (core.js judgeBridgeTraffic). Nothing is stored. */
const NZTA_NORTHLAND_EVENTS = 'https://trafficnz.info/service/traffic/rest/4/events/byregion/1/-1';

function slim(ev) {
  const cut = v => String(v || '').slice(0, 500);
  return {
    status: cut(ev && ev.status),
    eventType: cut(ev && ev.eventType),
    eventDescription: cut(ev && ev.eventDescription),
    eventComments: cut(ev && ev.eventComments),
    locationArea: cut(ev && ev.locationArea),
    locations: cut(ev && ev.locations),
    impact: cut(ev && ev.impact)
  };
}

export async function getBridgeTraffic(fetchImpl = fetch) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetchImpl(NZTA_NORTHLAND_EVENTS, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'DueDatesApp/1.0' },
      signal: ctl.signal
    });
    if (!r.ok) throw new Error('upstream');
    const data = await r.json();
    const box = data && data.response && data.response.roadevent;
    const list = Array.isArray(box) ? box : box && typeof box === 'object' ? [box] : [];
    return { source: 'NZTA Traffic and Travel', read: true, count: list.length, events: list.slice(0, 80).map(slim) };
  } finally { clearTimeout(timer); }
}
