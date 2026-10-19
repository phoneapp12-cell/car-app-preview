import assert from 'node:assert/strict';
import { parseSessions, parseComingSoon, merge, toScheduleItems, fetchCinema } from '../src/cinema.js';
const day = { Data: { Movies: [
  { Id: 1, Name: 'Film A', Rating: 'M', MovieUrl: '/movie/film-a', PosterUrl: 'https://cdn.eventcinemas.co.nz/a.jpg', RunningTime: 100, ReleasedAt: '2026-10-15T00:00', Trailers: ['GM_o3JzrTMQ'],
    CinemaModels: [{ Id: 503, Sessions: [{ StartTime: '2026-10-20T18:30', BookingUrl: 'https://www.eventcinemas.co.nz/orders/tickets#sessionId=9', ScreenTypeName: 'Original', SeatsAvailable: 5 }] }, { Id: 502, Sessions: [{ StartTime: '2026-10-20T11:00' }] }] },
  { Id: 2, Name: 'Elsewhere only', CinemaModels: [{ Id: 502, Sessions: [{ StartTime: '2026-10-20T11:00' }] }] },
  { Id: 3, Name: 'Bad url', MovieUrl: 'https://evil.example/x', PosterUrl: 'javascript:x', CinemaModels: [{ Id: 503, Sessions: [{ StartTime: '2026-10-20T20:00', BookingUrl: 'https://evil.example' }] }] }] } };
const d = parseSessions(day);
assert.equal(d.length, 2);
assert.equal(d[0].m.url, 'https://www.eventcinemas.co.nz/movie/film-a');
assert.equal(d[0].m.trailer, 'GM_o3JzrTMQ');
assert.equal(d[0].ses[0].t, '2026-10-20T18:30');
assert.equal(d[1].m.poster, ''); assert.equal(d[1].ses[0].url, 'https://www.eventcinemas.co.nz/cinema/whangarei/sessions');
const soon = parseComingSoon({ Data: { Movies: [{ Id: 1, Name: 'Film A', CinemaIds: [503], ReleasedAt: '2026-10-29T00:00' }, { Id: 4, Name: 'Soon B', CinemaIds: [502, 503], ReleasedAt: '2026-11-05T00:00' }, { Id: 5, Name: 'Not here', CinemaIds: [502], ReleasedAt: '2026-11-05T00:00' }, { Id: 6, Name: 'Old', CinemaIds: [503], ReleasedAt: '2026-01-01T00:00' }] } }, '2026-10-19');
assert.deepEqual(soon.map(x => x.title), ['Film A', 'Soon B']);
const all = merge([d], soon);
assert.deepEqual(all.map(x => [x.title, x.soon]), [['Film A', false], ['Bad url', false], ['Soon B', true]]);
assert.deepEqual(toScheduleItems({ movies: all })[0], { title: 'Film A', date: '2026-10-20', times: ['18:30'], url: 'https://www.eventcinemas.co.nz/movie/film-a' });
let calls = 0;
const c = await fetchCinema(async u => { calls++; return { ok: true, json: async () => /GetSessions/.test(u) ? day : { Data: { Movies: [] } } }; }, Date.parse('2026-10-19T08:00:00Z'));
assert.equal(calls, 8); assert.equal(c.movies.length, 2); assert.equal(c.movies[0].sessions.length, 7);
await assert.rejects(fetchCinema(async () => ({ ok: false, status: 503 })));
console.log('cinema tests passed');
