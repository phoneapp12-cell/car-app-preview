/* 1.9.122 Colourful 3D art. Two real Wikimedia Commons renders, checked 10 Nov 2026.
   One card a day, spaced in with the other picture subjects. Not a random site. */
(function (root) {
  const pic = file => 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(file) + '?width=1200';
  const filePage = file => 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file).replace(/%20/g, '_');
  const TOPIC = 'art3d';
  const ITEMS = [
    { key: 'earth', file: 'Earth Blender render 3.png', t: 'Earth, rendered in Blender', s: 'Wikideas1 rendered Earth in Blender from NASA data and released it under CC0. The picture is on Wikimedia Commons.' },
    { key: 'suzanne', file: 'Two Suzanne heads.jpg', t: 'Two Suzanne heads, rendered in Blender', s: 'GrinningIodize made this computer-generated picture of two Suzanne heads and released it under CC0. Suzanne is the chimpanzee head that comes with Blender, and the picture is on Wikimedia Commons.' }
  ];
  function dayNum(now) { return Math.floor((now == null ? Date.now() : now) / 864e5); }
  function one(src) {
    return {
      id: 'art3d-' + src.key, t: src.t, s: src.s, img: pic(src.file), url: filePage(src.file), topic: TOPIC,
      src: 'art3d-commons', sn: 'Wikimedia Commons', kind: 'photo', at: Date.now() - 60e3, file: src.file
    };
  }
  function cards(now) {
    try { if (typeof root.topicOn === 'function' && !root.topicOn(TOPIC)) return []; } catch (e) { }
    const start = Math.abs(dayNum(now)) % ITEMS.length;
    for (let n = 0; n < ITEMS.length; n++) {
      const item = one(ITEMS[(start + n) % ITEMS.length]);
      try { if (typeof root.wasSeen === 'function' && root.wasSeen(item)) continue; } catch (e) { }
      return [item];
    }
    return [];
  }
  function busy(x) { return x && (x.x === 'play' || x.x === 'zoomq' || x.x === 'fallq' || x.x === 'tetq' || x.x === 'cine' || (x.id && (String(x.id).indexOf('sight-') === 0 || String(x.id).indexOf('art3d-') === 0))); }
  function insert(order, nPins, now) {
    const out = (order || []).slice();
    const item = cards(now)[0];
    if (!item) return out;
    if (out.some(x => x && x.id === item.id)) return out;
    const lo = Math.max(nPins | 0, 2);
    let at = Math.min(out.length, lo + 8);
    let g = 0;
    while (g++ < 5 && at < lo + 18 && (busy(out[at]) || busy(out[at - 1]) || busy(out[at + 1]))) at = Math.min(out.length, at + 2);
    out.splice(at, 0, item);
    return out;
  }
  root.ibArt = { ITEMS, TOPIC, cards, insert, pic, filePage };
  if (!root.document) return;
  const prev = root.festive;
  root.festive = function (order, nPins) { order = prev ? prev(order, nPins) : (order || []); return insert(order, nPins); };
})(typeof window !== 'undefined' ? window : globalThis);
