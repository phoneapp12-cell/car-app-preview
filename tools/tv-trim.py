#!/usr/bin/env python3
"""2.27.37: trim the public i.mjh.nz XMLTV guides (Freeview NZ + Sky) to My App's channels, drop sport,
and write one small JSON file per New Zealand day plus index.json. Run by .github/workflows/tv-guide.yml
twice a day; the output goes to the tv-data branch, which the app and the relay read. Nothing else is fetched."""
import gzip, io, json, os, re, sys, time, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
HERE = os.path.dirname(os.path.abspath(__file__))
CH = json.load(open(os.path.join(HERE, 'tv-channels.json')))
SKIP = {'sky.62', 'sky.63'}  # Trackside 1 and 2: horse racing only
IDS = {c['id']: c for c in CH if c['id'] not in SKIP}
# 2.27.38: Sky's channel changes from 22 Oct 2026. Ids (and numbers) stay the same, so links and flags carry over.
RENAMES = {'sky.5': ('2026-10-22', 'Sky Justice'), 'sky.6': ('2026-10-22', 'Sky Suspect'), 'sky.83': ('2026-10-22', 'Channel 83')}
meta = {}
SPORT = re.compile(open(os.path.join(HERE, 'sport-re.txt')).read().strip(), re.I)  # the app's SPORT_RE
RACING = re.compile(r'^(racing|horse racing|trots)$', re.I)
# 2.27.71: the Sky guide stopped updating these channels (its file is from 1 Oct), but the Freeview guide carries them,
# so their programmes come from Freeview under the same app ids (names, numbers and logos still from Sky).
ALIAS = {'mjh-prime': 'sky.4', 'mjh-bravo': 'sky.12', 'mjh-eden': 'sky.13', 'mjh-maori-tv': 'sky.19', 'mjh-sky-hgtv': 'sky.21', 'mjh-tvnz-duke': 'sky.23',
         'mjh-rush-nz': 'sky.24', 'mjh-mood-1290': 'sky.25', 'mjh-mood-1289': 'sky.26', 'mjh-parliament-tv': 'sky.86', 'mjh-al-jazeera': 'sky.90',
         'mjh-shine-tv': 'sky.201', 'mjh-hope-channel': 'sky.204', 'mjh-firstlight': 'sky.206', 'mjh-tvnz-1-plus1': 'sky.501', 'mjh-tvnz-2-plus1': 'sky.502',
         'mjh-three-plus1': 'sky.503', 'mjh-tvnz-duke-plus1': 'sky.504'}
ALIASED = set(ALIAS.values())
FEEDS = {'freeview': 'https://i.mjh.nz/nz/epg.xml.gz', 'sky': 'https://i.mjh.nz/SkyGo/epg.xml.gz'}
NZ = ZoneInfo('Pacific/Auckland')
OUT = sys.argv[1] if len(sys.argv) > 1 else 'out'
now = time.time()
def stamp(s):
    m = re.match(r'(\d{14})\s*([+-]\d{4})?', s or '')
    if not m: return None
    dt = datetime.strptime(m.group(1), '%Y%m%d%H%M%S')
    off = m.group(2) or '+0000'
    tz = timezone(timedelta(hours=int(off[0] + off[1:3]), minutes=int(off[0] + off[3:5])))
    return int(dt.replace(tzinfo=tz).timestamp())
days, until, chu = {}, {}, {}
for feed, url in FEEDS.items():
    req = urllib.request.Request(url, headers={'User-Agent': 'car-app-preview tv-trim (personal guide, twice a day)'})
    data = urllib.request.urlopen(req, timeout=180).read()
    last = ''
    for ev, el in ET.iterparse(io.BytesIO(gzip.decompress(data)), events=('end',)):
        if el.tag == 'channel' and el.get('id') in IDS and IDS[el.get('id')]['feed'] == feed:
            ic = el.find('icon'); src = ic.get('src') if ic is not None else ''
            if 'images.skyone.co.nz' in (src or ''): src += '?w=96'
            meta[el.get('id')] = {'name': (el.findtext('display-name') or '').strip(), 'lcn': (el.findtext('lcn') or '').strip(), 'logo': src or ''}
            el.clear(); continue
        if el.tag != 'programme': continue
        ch = el.get('channel')
        if feed == 'freeview' and ch in ALIAS: ch = ALIAS[ch]
        elif feed == 'sky' and ch in ALIASED: ch = None
        if ch in IDS and (IDS[ch]['feed'] == feed or ch in ALIASED):
            s, u = stamp(el.get('start')), stamp(el.get('stop'))
            title = re.sub(r'\s+', ' ', (el.findtext('title') or '')).strip()
            cats = [re.sub(r'\s+', ' ', c.text or '').strip() for c in el.findall('category') if (c.text or '').strip()]
            desc = re.sub(r'\s+', ' ', (el.findtext('desc') or '')).strip()
            if s and u and u > now - 3600 and title and not SPORT.search(title + ' ' + ' '.join(cats)) and not any(RACING.match(c) for c in cats):
                d = datetime.fromtimestamp(s, NZ).strftime('%Y-%m-%d'); d2 = datetime.fromtimestamp(u - 1, NZ).strftime('%Y-%m-%d')
                row = [s, u, title[:120], '/'.join(dict.fromkeys(cats))[:60], desc[:110]]
                for dd in sorted({d, d2}): days.setdefault(dd, {}).setdefault(ch, []).append(row)  # shows across midnight are on both days
                last = max(last, d); chu[ch] = max(chu.get(ch, ''), d)
        el.clear()
    until[feed] = last
os.makedirs(os.path.join(OUT, 'tv'), exist_ok=True)
nzt = datetime.fromtimestamp(now, NZ).strftime('%Y-%m-%d')
names = {k: (RENAMES[k][1] if k in RENAMES and nzt >= RENAMES[k][0] else (meta.get(k, {}).get('name') or v['name'])) for k, v in IDS.items()}
today = datetime.fromtimestamp(now, NZ).strftime('%Y-%m-%d')
keep = sorted(d for d in days if d >= today)[:16]
for d in keep:
    for L in days[d].values(): L.sort()
    json.dump({'d': d, 'ch': days[d]}, open(os.path.join(OUT, 'tv', d + '.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
json.dump({'at': int(now), 'days': keep, 'until': until, 'chUntil': chu, 'names': names, 'logos': {k: m['logo'] for k, m in meta.items() if m.get('logo')}, 'lcn': {k: (meta.get(k, {}).get('lcn') or re.sub(r'\D', '', k.split('.')[-1]) or {'mjh-tvnz-1': '1', 'mjh-tvnz-2': '2', 'mjh-three': '3'}.get(k, '')) for k in IDS}, 'renames': {k: list(v) for k, v in RENAMES.items()}, 'source': 'https://i.mjh.nz (Freeview NZ and Sky guides)'}, open(os.path.join(OUT, 'tv', 'index.json'), 'w'), separators=(',', ':'))
print('days', keep, 'until', until)
