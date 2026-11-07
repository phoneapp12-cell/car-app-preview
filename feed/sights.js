/* 1.9.112 A few colourful picture cards. Real Wikimedia photos and Wikipedia pages.
   One card from two of the four subjects each day, mixed in with the rest of the feed.
   Not a random site. Pictures were checked on 7 Nov 2026.
   1.9.114 shows one picture from each picture subject that is still switched on.
   Six more subjects were added in the same pass. They are spaced down the feed
   so the opening screen stays mostly the ranked mix. No extra sources. */
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
    { key: 'reinga', topic: 'looks', file: 'Cape_Reinga.jpg', url: 'https://en.wikipedia.org/wiki/Cape_Reinga', t: 'Cape Reinga', s: 'Te Rerenga Wairua, at the top of the North Island. The picture is on Wikimedia Commons.' },
    { key: 'anemone', topic: 'reef', file: 'Jewel anemones on HMNZS Canterbury wreckPA101219.JPG', url: 'https://en.wikipedia.org/wiki/HMNZS_Canterbury_(F421)', t: 'Jewel anemones on a New Zealand wreck', s: 'Bright anemones on the wreck of HMNZS Canterbury. The picture is on Wikimedia Commons. It does not say whether you can visit the wreck.' },
    { key: 'mandarin', topic: 'reef', file: 'Synchiropus splendidus 2 Luc Viatour.jpg', url: 'https://en.wikipedia.org/wiki/Mandarinfish', t: 'A mandarinfish', s: 'Photographed in an aquarium in Liège, Belgium. The colours are the fish itself. This species is not from New Zealand. The picture is on Wikimedia Commons.' },
    { key: 'mary', topic: 'dolls', file: "Queen Mary's doll house at Windsor Castle.jpg", url: 'https://en.wikipedia.org/wiki/Queen_Mary%27s_Dolls%27_House', t: "Queen Mary's doll's house", s: 'The doll’s house at Windsor Castle, with tiny furnished rooms. The picture is on Wikimedia Commons.' },
    { key: 'victoria', topic: 'dolls', file: "Kensington Palace room with Queen Victoria's Doll's House.jpg", url: 'https://en.wikipedia.org/wiki/Kensington_Palace', t: "Queen Victoria's doll's house", s: 'Her childhood doll’s house, in a room at Kensington Palace. The picture is on Wikimedia Commons.' },
    { key: 'phone', topic: 'keeps', file: 'Grey rotary dial telephone.jpg', url: 'https://en.wikipedia.org/wiki/Rotary_dial', t: 'A telephone with a dial', s: 'A desk telephone. You turned the dial for each number. The picture is on Wikimedia Commons.' },
    { key: 'type', topic: 'keeps', file: 'Vintage typewriter (Unsplash).jpg', url: 'https://en.wikipedia.org/wiki/Typewriter', t: 'A typewriter', s: 'Each key strikes the paper. The picture is on Wikimedia Commons.' },
    { key: 'tiffany', topic: 'glass', file: 'Tiffany lamp 1905 de Young.jpg', url: 'https://en.wikipedia.org/wiki/Tiffany_lamp', t: 'A Tiffany lamp from about 1905', s: 'Coloured glass in a table lamp, on display at the de Young Museum in San Francisco. The picture is on Wikimedia Commons.' },
    { key: 'favrile', topic: 'glass', file: 'Tiffany Favrile Lamp.jpg', url: 'https://en.wikipedia.org/wiki/Tiffany_lamp', t: 'A Tiffany lamp with lily shades', s: 'Favrile glass shades, about 1910. The picture is on Wikimedia Commons.' },
    { key: 'romo', topic: 'kites', file: 'Rømø Kite Festival 2016 01.jpg', url: 'https://commons.wikimedia.org/wiki/File:R%C3%B8m%C3%B8_Kite_Festival_2016_01.jpg', t: 'Kites over Rømø', s: 'Kites above the beach on Rømø, Denmark, at the 2016 kite festival. The picture is on Wikimedia Commons.' },
    { key: 'bondi', topic: 'kites', file: 'Festival of the Winds (7960182956).jpg', url: 'https://commons.wikimedia.org/wiki/File:Festival_of_the_Winds_(7960182956).jpg', t: 'Kites at Bondi', s: 'Kites at the Festival of the Winds, Bondi Beach, Sydney, in 2012. The picture is on Wikimedia Commons.' },
    { key: 'newyear', topic: 'lanterns', file: 'Chinese-lanterns-1394958.jpg', url: 'https://en.wikipedia.org/wiki/Paper_lantern', t: 'Paper lanterns', s: 'Lanterns hung for Chinese New Year. The picture does not mean a festival is on today. It is on Wikimedia Commons.' },
    { key: 'redlantern', topic: 'lanterns', file: 'Chinese Lanterns 1 (12176428205).jpg', url: 'https://en.wikipedia.org/wiki/Paper_lantern', t: 'Red paper lanterns', s: 'A string of paper lanterns. The picture is on Wikimedia Commons.' }
  ];
  const TOPICS = ['illusions', 'odd', 'colour', 'looks', 'reef', 'dolls', 'keeps', 'glass', 'kites', 'lanterns'];
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
    const on = TOPICS.filter(t => { try { return typeof root.topicOn !== 'function' || root.topicOn(t); } catch (e) { return true; } });
    return on.map((t, n) => forTopic(t, day + n));
  }
  function busy(x) { return x && (x.x === 'play' || x.x === 'zoomq' || x.x === 'fallq' || x.x === 'tetq' || x.x === 'cine' || (x.id && String(x.id).indexOf('sight-') === 0)); }
  function insert(order, nPins, now) {
    const out = (order || []).slice();
    const lo = Math.max(nPins | 0, 2);
    cards(now).forEach((item, n) => {
      if (out.some(x => x && x.id === item.id)) return;
      let at = Math.min(out.length, lo + 4 + n * 4);
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
