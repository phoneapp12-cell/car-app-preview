/* Extra Whangārei events merged into the council list:
   Event Cinemas sessions (parsed from the public Kinoafisha schedule page) and a few
   dated local events and weekly markets. */
export const CINEMA_SCHEDULE = 'https://nz.kinoafisha.info/whangarei/cinema/8331387/schedule/';
export const CINEMA_HOME = 'https://www.eventcinemas.co.nz/Cinema/Whangarei';
const MOVIE_DAYS = 14;

const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = iso => new Date(iso + 'T00:00:00Z').getUTCDay();
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const hh = t => t.length === 4 ? '0' + t : t; // 9:00 -> 09:00

export function parseCinema(html) {
  const out = [];
  const chunks = String(html || '').split('class="schedule_showtimes');
  for (let i = 1; i < chunks.length; i++) {
    const dates = [...chunks[i - 1].matchAll(/(20\d\d-\d\d-\d\d)/g)];
    const date = dates.length ? dates[dates.length - 1][1] : '';
    if (!date) continue;
    for (const b of chunks[i].split('<div class="showtimes_item"').slice(1)) {
      const m = b.match(/data-ScheduleSearch-item="([^"]+)"/);
      if (!m) continue;
      const title = m[1].split(/\s{2,}/)[0].trim();
      const times = [...b.matchAll(/class="session_time">(\d{1,2}:\d{2})/g)].map(x => hh(x[1]));
      if (title && times.length) out.push({ title, date, times });
    }
  }
  return out;
}

function movieEvents(items, today) {
  const limit = addDays(today, 60), byDate = {};
  for (const m of items || []) { if (m.date >= today && m.date <= limit) (byDate[m.date] = byDate[m.date] || []).push(m); }
  const days = Object.keys(byDate).sort();
  const full = days.slice().sort((a, b) => byDate[b].length - byDate[a].length)[0];
  const seen = new Set(), out = [];
  const add = e => { if (!seen.has(e.id)) { seen.add(e.id); out.push(e); } };
  for (const d of days) for (const m of byDate[d]) {
    const times = [...new Set(m.times)].sort();
    add({
      id: 'mov-' + slug(m.title) + '-' + d, title: m.title, url: CINEMA_HOME, date: d, end: '',
      time: times[0], endTime: times.length > 1 ? times[times.length - 1] : '', timeKnown: true,
      venue: 'Event Cinemas, 18 James Street',
      desc: 'Sessions this day: ' + times.join(', ') + '. Times change, so check Event Cinemas before you go.',
      cats: ['Movies'], cost: ''
    });
  }
  // The schedule page lists every film for one day and only highlights the rest, so keep that day's films up for the week.
  if (full && byDate[full].length >= 4) {
    for (let i = 1; i <= 6; i++) {
      const d = addDays(full, i); if (d > limit) break;
      for (const m of byDate[full]) add({
        id: 'mov-' + slug(m.title) + '-' + d, title: m.title, url: CINEMA_HOME, date: d, end: '',
        time: '', endTime: '', timeKnown: false, venue: 'Event Cinemas, 18 James Street',
        desc: 'Now showing at Event Cinemas. Session times change each day, so check before you go.',
        cats: ['Movies'], cost: ''
      });
    }
  }
  return out;
}

// Dated events checked against the organiser's own page. Anything past its last day is left out.
const DATED = [
  { id: 'nokise-20260930', title: 'James Nokise: One Night Rant', date: '2026-09-30', time: '18:30', endTime: '19:30', venue: 'ONEONESIX, 116a Bank Street', url: 'https://www.eventfinda.co.nz/2026/james-nokise-one-night-rant-2026/whangarei', cats: ['Comedy'], cost: 'From $27', desc: 'Stand-up about the election year. R16. Early bird $27, general admission $30, door sales $35.' },
  { id: 'silver-launch-20260930', title: 'Silver Festival launch', date: '2026-09-30', time: '10:30', endTime: '12:00', venue: 'May Bain Room, Whangārei Central Library', url: 'https://www.scoop.co.nz/stories/AK2609/S00880/silver-festival-bigger-than-ever-with-70-plus-events-to-enjoy.htm', cats: ['Community'], cost: 'Free', desc: 'Pick up a festival booklet and have a cuppa. The festival itself runs from 1 to 14 October.' },
  { id: 'silver-2026', title: 'Silver Festival', date: '2026-10-01', end: '2026-10-14', time: '', venue: 'Around Whangārei', url: 'https://www.scoop.co.nz/stories/AK2609/S00880/silver-festival-bigger-than-ever-with-70-plus-events-to-enjoy.htm', cats: ['Community'], cost: '', desc: 'More than 70 events for older adults: crafts, gardens, markets, morning teas and socials. The booklet has the full list.' },
  { id: 'planet-20261007', title: 'Silver Festival at Planetarium North', date: '2026-10-07', time: '13:00', endTime: '14:15', venue: 'Planetarium North, 500 State Highway 14, Maunu', url: 'https://events.humanitix.com/silver-festival-2026', cats: ['Community'], cost: '', desc: 'A midday visit to Stonehenge Whangārei, then the night sky inside the planetarium. Made for the Silver Festival.' },
  { id: 'planet-20261014', title: 'Silver Festival at Planetarium North', date: '2026-10-14', time: '13:00', endTime: '14:15', venue: 'Planetarium North, 500 State Highway 14, Maunu', url: 'https://events.humanitix.com/silver-festival-2026', cats: ['Community'], cost: '', desc: 'A midday visit to Stonehenge Whangārei, then the night sky inside the planetarium. Made for the Silver Festival.' },
  { id: 'artisans-20261024', title: 'Artisans Market', date: '2026-10-24', time: '', venue: 'Town Basin', url: 'https://www.google.com/maps/search/?api=1&query=Whangarei+Town+Basin', cats: ['Markets'], cost: '', desc: 'Selected Saturdays at the Town Basin. This is the first date of the new season. Later dates are usually announced closer to the time, so check before you go.' }
];

function weekly(today, days, wantDow, make) {
  const out = [];
  for (let i = 0; i <= days; i++) { const iso = addDays(today, i); if (dow(iso) === wantDow) out.push(make(iso)); }
  return out;
}

export function localEvents(movies, today) {
  const until = addDays(today, 60);
  const dated = DATED.filter(e => (e.end || e.date) >= today && e.date <= until).map(e => ({
    end: '', time: '', endTime: '', cost: '', ...e, timeKnown: !!e.time
  }));
  const growers = weekly(today, 60, 6, date => ({
    id: 'growers-' + date, title: 'Whangārei Growers Market', url: 'https://www.google.com/maps/search/?api=1&query=17+Water+Street+Whangarei',
    date, end: '', time: '06:00', endTime: '12:00', timeKnown: true, venue: '17 Water Street',
    desc: 'Saturday produce market: fruit, vegetables, bread, eggs and flowers. Runs through to about midday.',
    cats: ['Markets'], cost: ''
  }));
  const tiki = weekly(today, 60, 0, date => ({
    id: 'tiki-' + date, title: 'Tikipunga Market', url: 'https://www.google.com/maps/search/?api=1&query=Tikipunga+High+School+Whangarei',
    date, end: '', time: '', endTime: '', timeKnown: false, venue: 'Tikipunga High School',
    desc: 'Sunday morning market. Check it’s on, and the time, before you go.',
    cats: ['Markets'], cost: ''
  }));
  return [...movieEvents(movies && movies.items, today), ...dated, ...growers, ...tiki];
}
