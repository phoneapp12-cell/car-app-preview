/* 1.9.104 💎 Crystal of the week (Nicolle's idea) + ✨ What's new card (shown once per update, ✕ to hide) */
(() => {
const CRYSTALS = [
{
"n": "Amethyst",
"img": "https://upload.wikimedia.org/wikipedia/commons/b/b5/Amatista_Laye_2.jpg",
"what": "Purple quartz that gets its colour from tiny bits of iron and natural radiation.",
"say": "Crystal fans keep it by the bed for calm and better sleep.",
"fact": "The name comes from ancient Greek for \"not drunk\", because people thought it stopped you getting tipsy.",
"wiki": "https://en.wikipedia.org/wiki/Amethyst"
},
{
"n": "Rose quartz",
"img": "https://upload.wikimedia.org/wikipedia/commons/3/3a/Rose_quartz_12.jpg",
"what": "Soft pink quartz, usually found in big chunky pieces rather than pointy crystals.",
"say": "Known as the love and kindness stone.",
"fact": "Real rose quartz can fade a little if it sits in bright sunlight for years.",
"wiki": "https://en.wikipedia.org/wiki/Rose_quartz"
},
{
"n": "Citrine",
"img": "https://upload.wikimedia.org/wikipedia/commons/d/d0/Citrine_taillee.jpg",
"what": "Sunny yellow to orange quartz.",
"say": "Called the happy, sunshine stone, for good energy and confidence.",
"fact": "Natural citrine is rare. Lots of what's sold is amethyst that has been heated.",
"wiki": "https://en.wikipedia.org/wiki/Citrine"
},
{
"n": "Labradorite",
"img": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Labradorite_polie_3%28Madagascar%29.jpg/800px-Labradorite_polie_3%28Madagascar%29.jpg",
"what": "A grey stone that flashes blue, green and gold when you tilt it.",
"say": "A favourite for creativity and a bit of magic.",
"fact": "The colour flash has its own name: labradorescence.",
"wiki": "https://en.wikipedia.org/wiki/Labradorite"
},
{
"n": "Moonstone",
"img": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/AdulaireSuisse2.jpg/800px-AdulaireSuisse2.jpg",
"what": "A milky stone with a soft blue glow that seems to float inside it.",
"say": "Linked with new beginnings and calm.",
"fact": "That glow is light bouncing between super-thin layers inside the stone.",
"wiki": "https://en.wikipedia.org/wiki/Moonstone_(gemstone)"
},
{
"n": "Tiger's eye",
"img": "https://upload.wikimedia.org/wikipedia/commons/b/be/Tiger%27s_eye.jpg",
"what": "Golden brown stripes that shimmer like silk.",
"say": "Said to bring courage and focus.",
"fact": "Turn it in the light and the stripes move, just like a cat's eye.",
"wiki": "https://en.wikipedia.org/wiki/Tiger's_eye"
},
{
"n": "Lapis lazuli",
"img": "https://upload.wikimedia.org/wikipedia/commons/d/da/Lapis-lazuli_hg.jpg",
"what": "Deep royal blue with tiny gold flecks of pyrite.",
"say": "Linked with wisdom and honesty.",
"fact": "Old painters ground it up to make ultramarine, once pricier than gold.",
"wiki": "https://en.wikipedia.org/wiki/Lapis_lazuli"
},
{
"n": "Turquoise",
"img": "https://upload.wikimedia.org/wikipedia/commons/7/7d/Turquoise-40031.jpg",
"what": "Sky blue to green stone, often with dark veins.",
"say": "A traditional good-luck and protection stone.",
"fact": "It's one of the oldest gems ever worn. Ancient Egyptians loved it.",
"wiki": "https://en.wikipedia.org/wiki/Turquoise"
},
{
"n": "Malachite",
"img": "https://upload.wikimedia.org/wikipedia/commons/5/55/Malachite%2C_Zaire.jpg",
"what": "Bright green with swirly light and dark bands.",
"say": "Known as a stone for change and growth.",
"fact": "It's made of copper, which is why it's so green.",
"wiki": "https://en.wikipedia.org/wiki/Malachite"
},
{
"n": "Obsidian",
"img": "https://upload.wikimedia.org/wikipedia/commons/1/17/Lipari-Obsidienne_%285%29.jpg",
"what": "Shiny black volcanic glass.",
"say": "Seen as a grounding, protective stone.",
"fact": "It's sharper than steel. NZ has lots of it, especially on Mayor Island near Tauranga.",
"wiki": "https://en.wikipedia.org/wiki/Obsidian"
},
{
"n": "Fluorite",
"img": "https://upload.wikimedia.org/wikipedia/commons/0/0d/3192M-fluorite1.jpg",
"what": "Comes in purple, green and blue, often all in one piece.",
"say": "Called the tidy-mind stone, for focus.",
"fact": "Many pieces glow under UV light. The word \"fluorescent\" comes from fluorite.",
"wiki": "https://en.wikipedia.org/wiki/Fluorite"
},
{
"n": "Aventurine",
"img": "https://upload.wikimedia.org/wikipedia/commons/8/84/Aventurine.jpg",
"what": "Green quartz with a gentle sparkle.",
"say": "Known as the lucky stone.",
"fact": "The sparkle comes from tiny mica flakes trapped inside.",
"wiki": "https://en.wikipedia.org/wiki/Aventurine"
},
{
"n": "Carnelian",
"img": "https://upload.wikimedia.org/wikipedia/commons/1/12/Carnelian_sard_%28mineral_specimen%29.jpg",
"what": "Glowing orange-red stone.",
"say": "Said to boost energy and motivation.",
"fact": "Romans used it for seal rings, because hot wax doesn't stick to it.",
"wiki": "https://en.wikipedia.org/wiki/Carnelian"
},
{
"n": "Jade",
"img": "https://upload.wikimedia.org/wikipedia/commons/0/00/Jadestein.jpg",
"what": "Smooth green stone, very tough.",
"say": "Linked with good fortune and long life.",
"fact": "It's so tough that people made axes and tools from it thousands of years ago.",
"wiki": "https://en.wikipedia.org/wiki/Jade"
},
{
"n": "Pounamu (NZ greenstone)",
"img": "https://upload.wikimedia.org/wikipedia/commons/1/1f/Pounamu_pendant.jpg",
"what": "New Zealand's own greenstone from the West Coast of the South Island.",
"say": "Traditionally given as a gift, not bought for yourself, and treasured for generations.",
"fact": "It's a type of jade, and it's so special in NZ that it's protected by law.",
"wiki": "https://en.wikipedia.org/wiki/Pounamu"
},
{
"n": "Opal",
"img": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Opal-53714.jpg",
"what": "Flashes every colour of the rainbow.",
"say": "Linked with creativity and fun.",
"fact": "Opal has water inside it, sometimes up to 20 percent. Most comes from Australia.",
"wiki": "https://en.wikipedia.org/wiki/Opal"
},
{
"n": "Garnet",
"img": "https://upload.wikimedia.org/wikipedia/commons/5/5e/Garnet_Andradite20.jpg",
"what": "Usually deep red, but comes in nearly every colour.",
"say": "Known as a stone of friendship and loyalty.",
"fact": "January's birthstone. Garnet sand is even used for sandpaper.",
"wiki": "https://en.wikipedia.org/wiki/Garnet"
},
{
"n": "Agate",
"img": "https://upload.wikimedia.org/wikipedia/commons/2/26/Malawi_Agate_%28Malawi%2C_southeastern_Africa%29_%2832734668126%29.jpg",
"what": "Stripy stone with rings of colour, often found inside old volcanic rock.",
"say": "Seen as calming and steadying.",
"fact": "You can find agates on some NZ beaches, like Ocean Beach near Whangārei Heads.",
"wiki": "https://en.wikipedia.org/wiki/Agate"
},
{
"n": "Smoky quartz",
"img": "https://upload.wikimedia.org/wikipedia/commons/3/32/Smoky-quartz-TUCQTZ09-03-arkenstone-irocks.png",
"what": "See-through quartz in shades of brown to almost black.",
"say": "A grounding, stress-busting stone.",
"fact": "The smoky colour comes from natural radiation in the ground.",
"wiki": "https://en.wikipedia.org/wiki/Smoky_quartz"
},
{
"n": "Pyrite",
"img": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Pyrite_-_Huanzala_mine%2C_Huallanca%2C_Bolognesi%2C_Ancash%2C_Peru.jpg/800px-Pyrite_-_Huanzala_mine%2C_Huallanca%2C_Bolognesi%2C_Ancash%2C_Peru.jpg",
"what": "Shiny gold cubes that look almost machine-made.",
"say": "Called a stone for success.",
"fact": "It's nicknamed \"fool's gold\". Lots of gold rush hopefuls got excited for nothing.",
"wiki": "https://en.wikipedia.org/wiki/Pyrite"
},
{
"n": "Hematite",
"img": "https://upload.wikimedia.org/wikipedia/commons/1/19/WLA_hmns_Hematite.jpg",
"what": "Heavy, shiny, silvery-black stone.",
"say": "A grounding stone.",
"fact": "It's iron ore. Rub it on rough tile and it leaves a red streak like blood.",
"wiki": "https://en.wikipedia.org/wiki/Hematite"
},
{
"n": "Sodalite",
"img": "https://upload.wikimedia.org/wikipedia/commons/f/ff/Sodalith_-_Rohstein.jpg",
"what": "Deep blue with white veins.",
"say": "Linked with calm thinking and clear talking.",
"fact": "Some sodalite glows orange under UV light.",
"wiki": "https://en.wikipedia.org/wiki/Sodalite"
},
{
"n": "Peridot",
"img": "https://upload.wikimedia.org/wikipedia/commons/a/ad/Forsterite-Olivine-tmu14a.jpg",
"what": "Bright lime-green gem.",
"say": "Known as a happy, refreshing stone.",
"fact": "Some peridot has been found in meteorites from space.",
"wiki": "https://en.wikipedia.org/wiki/Peridot"
},
{
"n": "Rhodochrosite",
"img": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rhodochrosite_on_Matrix_-_Peru.jpg/800px-Rhodochrosite_on_Matrix_-_Peru.jpg",
"what": "Raspberry pink, sometimes with candy-like stripes.",
"say": "Linked with self-love and kindness.",
"fact": "It's the national gemstone of Argentina.",
"wiki": "https://en.wikipedia.org/wiki/Rhodochrosite"
},
{
"n": "Amber",
"img": "https://upload.wikimedia.org/wikipedia/commons/b/b6/Amber2.jpg",
"what": "Warm golden fossilised tree resin.",
"say": "Seen as a warm, cheerful stone.",
"fact": "Some amber has insects trapped inside from millions of years ago. NZ has kauri gum too, a younger cousin found in Northland.",
"wiki": "https://en.wikipedia.org/wiki/Amber"
},
{
"n": "Celestite",
"img": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Celestine_-_Sakoany_deposit%2C_Katsepy%2C_Mitsinjo%2C_Boeny%2C_Madagascar.jpg/800px-Celestine_-_Sakoany_deposit%2C_Katsepy%2C_Mitsinjo%2C_Boeny%2C_Madagascar.jpg",
"what": "Pale sky-blue crystals, often in clusters.",
"say": "A peaceful, dreamy stone.",
"fact": "It contains strontium, the same stuff that makes fireworks glow red.",
"wiki": "https://en.wikipedia.org/wiki/Celestine_(mineral)"
}
];
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nzNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Pacific/Auckland' }));
const weekNo = () => { const d = nzNow(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return Math.floor(d.getTime() / 6048e5); }; // Monday-start weeks
const crystal = () => CRYSTALS[(weekNo() * 7) % CRYSTALS.length];
const WN_ID = 'wn-1.9.108';
const WN = [
  ['🧩', 'Little puzzles in the feed: picture match, sitcom questions and NZ animal questions. Two discovery cards link out to Zoomquilt and Falling Falling.'],
  ['📺', 'Streaming cards only if they’re on TVNZ, Three or Sky. Stan and Neon are left out. Garden posts are NZ ones, for the season it is here.'],
  ['🎬', 'Sometimes a film from Event Cinemas Whangārei, with their poster. Times stay on their site.'],
  ['▶️', 'Videos in the feed play large, across the card. Tiny video rows are gone.'],
  ['📖', 'A row of tiles at the top: weather, the Joke of the day and short funny or cute videos. Tap one to open it.'],
  ['⚠️', 'Whangārei weather warnings and power cuts show as a tile up top, only when something is happening.'],
  ['💎', 'New: Crystal of the week, every Monday.'],
  ['🍝', 'New: Easy weeknight meals.'],
  ['🎨', 'New themes: open ☰, then Appearance, and try Ocean, Spring or Candy Crush.'],
  ['😂', 'More animals, sitcom clips and wow pictures, and less news.'],
];
const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
function crystalCard(i) {
  const c = i.c, xh = typeof xHead === 'function' ? xHead('💎', 'Crystal of the week: ' + c.n, 'A new one every Monday', 'Crystals') : '';
  return `<article class="card xc crys" data-id="${esc(i.id)}">${xh}<a class="media" href="${esc(c.wiki)}" target="_blank" rel="noopener"><img src="${esc(c.img)}" alt="${esc(c.n)}" loading="lazy" referrerpolicy="no-referrer"></a>
    <div class="bd"><p class="xwho"><b>${esc(c.what)}</b></p><p class="xwho">🔮 ${esc(c.say)}</p><p class="xwho">🤓 ${esc(c.fact)}</p>
    <div class="xbtns"><a class="btn" href="${esc(c.wiki)}" target="_blank" rel="noopener">Read more ↗</a></div></div></article>`;
}
function wnCard(i) {
  const xh = typeof xHead === 'function' ? xHead('✨', "What's new in Info Book", 'The latest update', 'New') : '';
  return `<article class="card xc wnew" data-id="${WN_ID}">${xh}<div class="bd"><ul class="wnl">${WN.map(([e, t]) => `<li><span>${e}</span><span>${esc(t)}</span></li>`).join('')}</ul>
    <div class="xbtns"><button type="button" class="btn pri" data-wnok>Got it 👍</button></div></div></article>`;
}
const basePinsW = window.pins;
window.pins = function () {
  const out = basePinsW ? basePinsW() : [];
  if (!ls.get('wnSeen', {})[WN_ID]) out.unshift({ id: WN_ID, x: 'wnew', topic: 'family', t: "What's new" });
  const c = crystal(); if (c && !ls.get('crysHide', {})[weekNo()]) out.push({ id: 'crys-' + weekNo(), x: 'crys', c, topic: 'family', t: '💎 Crystal of the week: ' + c.n });
  return out;
};
const baseCardW = window.card;
window.card = function (i) { if (i && i.x === 'crys') return crystalCard(i); if (i && i.x === 'wnew') return wnCard(i); return baseCardW(i); };
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-wnok]'); if (!b) return;
  const m = ls.get('wnSeen', {}); m[WN_ID] = 1; ls.set('wnSeen', m);
  const a = b.closest('article'); if (a) { a.style.transition = 'opacity .3s, transform .3s'; a.style.opacity = '0'; a.style.transform = 'scale(.96)'; setTimeout(() => a.remove(), 320); }
});
})();
