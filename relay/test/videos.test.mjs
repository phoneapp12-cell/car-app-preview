import { handle } from '../src/relay.js';
import { normaliseVideoQuery, VIDEO_SEARCH_URL } from '../src/videos.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const O = 'https://phoneapp12-cell.github.io';

ok(normaliseVideoQuery('woodworking').q === 'woodworking' && normaliseVideoQuery('woodworking').food === false, 'plain topic stays as typed');
ok(normaliseVideoQuery('pizza').q === 'pizza gluten free' && normaliseVideoQuery('pizza').food === true, 'food topic adds gluten free');
ok(normaliseVideoQuery('gluten-free bread').q === 'gluten-free bread', 'already gluten-free is not doubled');
let threw = false; try { normaliseVideoQuery('https://evil.example/x'); } catch (e) { threw = e.message === 'bad_query'; }
ok(threw, 'links are refused');
threw = false; try { normaliseVideoQuery('木工'); } catch (e) { threw = e.message === 'bad_query'; }
ok(threw, 'non-English letters are refused');

const queries = [];
const oem = id => 'https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id) + '&format=json';
const titles = {
  aaaaaaaaaaa: { title: 'Gluten Free Pizza at home', author_name: 'GF Kitchen' },
  ccccccccccc: { title: 'Pepperoni pizza recipe', author_name: 'Chef' },
  ddddddddddd: { title: 'How to keep bees', author_name: 'Bee People' }
};
const fetchImpl = async (url, opts = {}) => {
  if (url === VIDEO_SEARCH_URL) {
    const body = JSON.parse(opts.body);
    queries.push(body.query);
    if (body.query.includes('gluten free')) {
      return new Response(JSON.stringify({
        items: [
          { videoRenderer: { videoId: 'aaaaaaaaaaa', lengthText: { simpleText: '10:00' } } },
          { videoRenderer: { videoId: 'bbbbbbbbbbb', lengthText: { simpleText: '0:20' } } },
          { videoRenderer: { videoId: 'ccccccccccc', lengthText: { simpleText: '8:00' } } },
          { videoRenderer: { videoId: 'not-an-id' } }
        ]
      }));
    }
    return new Response(JSON.stringify({
      items: [
        { videoRenderer: { videoId: 'ddddddddddd', lengthText: { simpleText: '5:12' } } },
        { videoRenderer: { videoId: 'eeeeeeeeeee' } }
      ]
    }));
  }
  if (titles[decodeURIComponent(url).match(/v=([A-Za-z0-9_-]{11})/)?.[1] || '']) {
    const id = decodeURIComponent(url).match(/v=([A-Za-z0-9_-]{11})/)[1];
    return new Response(JSON.stringify(titles[id]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (String(url).includes('eeeeeeeeeee')) return new Response('no', { status: 404 });
  if (String(url).includes('bbbbbbbbbbb')) return new Response(JSON.stringify({ title: 'Short', author_name: 'X' }));
  throw new Error('unexpected ' + url);
};
const post = (q, origin = O) => new Request('https://relay.example/videos', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ q }) });

let r = await handle(post('pizza'), {}, fetchImpl);
let j = await r.json();
ok(r.status === 200 && queries.includes('pizza gluten free') && j.videos.length === 1 && j.videos[0].id === 'aaaaaaaaaaa' && j.videos[0].title === 'Gluten Free Pizza at home' && j.videos[0].channel === 'GF Kitchen', 'food search is gluten-free and drops a non-gluten title and a short');
ok(r.headers.get('access-control-allow-origin') === O && r.headers.get('cache-control') === 'no-store', 'videos response has CORS and no-store');

r = await handle(post('beekeeping'), {}, fetchImpl);
j = await r.json();
ok(r.status === 200 && j.videos.length === 1 && j.videos[0].id === 'ddddddddddd' && j.videos[0].title === 'How to keep bees', 'a normal topic returns the oembed title and skips a dead id');

r = await handle(post('pizza', 'https://evil.example'), {}, fetchImpl);
ok(r.status === 403 && !r.headers.get('access-control-allow-origin'), 'other origins are refused');
r = await handle(new Request('https://relay.example/videos?q=pizza', { headers: { Origin: O } }), {}, fetchImpl);
ok(r.status === 405, 'GET is refused so the topic is not in the query string');
r = await handle(post('木工'), {}, fetchImpl);
ok(r.status === 400 && (await r.json()).error === 'bad_query', 'bad topic is 400');
r = await handle(post('beekeeping'), { EXTRA_ORIGINS: '' }, async () => { throw new Error('down'); });
ok(r.status === 502 && (await r.json()).error === 'videos_unavailable', 'upstream failure is 502');

console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
