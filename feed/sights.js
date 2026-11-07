/* 1.9.112 A few colourful picture cards. Real Wikimedia photos and Wikipedia pages.
   One card from two of the four subjects each day, mixed in with the rest of the feed.
   Not a random site. Pictures were checked on 7 Nov 2026.
   1.9.113 steps that rotation forward once, still using only these eight pictures. */
(function (root) {
  const pic = file => 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(file) + '?width=1200';
  const filePage = file => 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file).replace(/%20/g, '_');
  const ITEMS = [
    { key: 'muller', topic: 'illusions', file: 'Müller-Lyer_illusion.svg', url: 'https://en.wikipedia.org/wiki/M%C3%BCller-Lyer_illusion', t: 'These two lines are the same length', s: 'The arrowheads change how long each line looks. This is the Müller-Lyer illusion. The picture is on Wikimedia Commons.' },
    { key: 'cafe', topic: 'illusions', file: 'Café wall.svg', url: 'https://en.wikipedia.org/wiki/Caf%C3%A9_wall_illusion', t: 'The rows look slanted. They are straight', s: 'Café wall illusion. The grey lines are parallel. The picture is on Wikimedia Commons.' },
    { key: 'tuatara', topic: 'odd', file: 'Tuatara.jpg', url: 'https://en.wikipedia.org/wiki/Tuatara', t: 'Tuatara', s: 'A New Zealand reptile and the only living member of its group. The picture is on Wikimedia Commons.' },
    { key: 'weta', topic: 'odd', file: 'Cook Strait Giant Weta (5601688959).jpg', url: 'https://en.wikipedia.org/wiki/Deinacrida_rugosa', t: 'Cook Strait giant wētā', s: 'One of New Zealand’s giant wētā, Deinacrida rugosa. The picture is on Wikimedia Commons.' },
    { key: 'hundert', topic: 'colour', file: 'Hundertwasser Toilets - Outside 2023.jpg', url: 'https://en.wikipedia.org/wiki/Kawakawa,_New_Zealand', t: 'The Hundertwasser toilets in Kawakawa', s: 'Public toilets in Kawakawa, Northland, designed in the style of Friedensreich Hundertwasser. This is not the art centre in Whangārei. The picture is on Wikimedia Commons.' },
    { key: 'bucket', topic: 'colour', file: 'The Bucket Fountain, Wellington.jpg', url: 'https://en.wikipedia.org/wiki/Bucket_Fountain', t: 'Wellington’s bucket fountain', s: 'A playful sculpture on Cuba Street that tips water from bucket to bucket. The picture is on Wikimedia Commons.' },
    { key: 'falls', topic: 'looks', file: 'Whangarei_Falls.jpg', url: 'https://en.wikipedia.org/wiki/Whang%C4%81rei_Falls', t: 'Whangārei Falls', s: 'The falls at Tikipunga. A photograph only, so check the path before a visit. The picture is on Wikimedia Commons.' },
    { key: 'reinga', topic: 'looks', file: 'Cape_Reinga.jpg', url: 'https://en.wikipedia.org/wiki/Cape_Reinga', t: 'Cape Reinga', s: 'Te Rerenga Wairua, at the top of the North Island. The picture is on Wikimedia Commons.' }
  ];
  const TOPICS = ['illusions', 'odd', 'colour', 'looks'];
  const MIX = 1;
  function dayNum(now) { return Math.floor((now == null ? Date.now() : now) / 864e5); }
  function forTopic(topic, day) {
    const list = ITEMS.filter(i => i.topic === topic);
    const src = list[Math.abs(day) % list.length];
    return {
      id: 'sight-' + src.key, t: src.t, s: src.s, img: pic(src.file), url: src.url, topic: src.topic,
      src: 'sight-commons', sn: 'Wikimedia Commons', kind: 'photo', at: Date.now() - 60e3, file: src.file
    };
  }
  function cards(now) {
    const day = dayNum(now) + MIX;
    const a = TOPICS[Math.abs(day) % TOPICS.length];
    const b = TOPICS[(Math.abs(day) + 2) % TOPICS.length];
    return [forTopic(a, day), forTopic(b, day + 1)];
  }
  function busy(x) { return x && (x.x === 'play' || x.x === 'zoomq' || x.x === 'fallq' || x.x === 'tetq' || x.x === 'cine' || (x.id && String(x.id).indexOf('sight-') === 0)); }
  function insert(order, nPins, now) {
    const out = (order || []).slice();
    const lo = Math.max(nPins | 0, 2);
    cards(now).forEach((item, n) => {
      if (out.some(x => x && x.id === item.id)) return;
      let at = Math.min(out.length, lo + 12 + n * 8);
      let g = 0;
      while (g++ < 6 && (busy(out[at]) || busy(out[at - 1]) || busy(out[at + 1]))) at = Math.min(out.length, at + 3);
      out.splice(at, 0, item);
    });
    return out;
  }
  root.ibSights = { ITEMS, TOPICS, MIX, cards, insert, pic, filePage };
  if (!root.document) return;
  const prev = root.festive;
  root.festive = function (order, nPins) { order = prev ? prev(order, nPins) : (order || []); return insert(order, nPins); };
})(typeof window !== 'undefined' ? window : globalThis);
