/* Sugar Rush map look. Small file so the big game stays untouched.
   Candy-atlas style: soft land, country medallions, a three-thing card,
   a pink ribbon path, and a car inside a country / plane between. */
(function () {
  'use strict';
  if (window.__sugarRushMapLoaded) return;
  window.__sugarRushMapLoaded = true;

  var COUNTRIES = {
    'new zealand': ['🥝', [['🌿', 'silver fern'], ['🌊', 'harbours'], ['🥝', 'kiwi']]],
    'cook islands': ['🌺', [['🏝️', 'lagoon'], ['🌺', 'hibiscus'], ['🛶', 'outrigger']]],
    tonga: ['🥥', [['🥥', 'coconut'], ['🐋', 'whales'], ['👑', 'royal']]],
    samoa: ['🌴', [['🏝️', 'two islands'], ['🏠', 'fale'], ['🌅', 'sunset']]],
    australia: ['🦘', [['🦘', 'kangaroo'], ['🐠', 'reef'], ['🎭', 'opera']]],
    'papua new guinea': ['🐦', [['🐦', 'bird of paradise'], ['⛰️', 'highlands'], ['🎭', 'masks']]],
    'solomon islands': ['🐚', [['🐚', 'shells'], ['🐠', 'reefs'], ['🛶', 'canoes']]],
    vanuatu: ['🌋', [['🌋', 'volcano'], ['💦', 'waterfall'], ['🌿', 'kava']]],
    fiji: ['🌊', [['🐠', 'reef'], ['🌴', 'palm'], ['🌺', 'bula']]],
    'new caledonia': ['🐠', [['🏝️', 'lagoon'], ['🌲', 'pine'], ['🐠', 'reef']]],
    indonesia: ['🛕', [['🛕', 'temples'], ['🌾', 'rice'], ['🏝️', 'islands']]],
    vietnam: ['🏮', [['🏮', 'lanterns'], ['🛶', 'river'], ['👘', 'ao dai']]],
    malaysia: ['🦋', [['🏙️', 'towers'], ['🌳', 'rainforest'], ['🦋', 'butterfly']]],
    thailand: ['🐘', [['🛕', 'temples'], ['🐘', 'elephant'], ['🛶', 'longtail']]],
    myanmar: ['🏯', [['🏯', 'pagodas'], ['✨', 'gold'], ['🛶', 'river']]],
    india: ['🪷', [['🪷', 'lotus'], ['🐯', 'tigers'], ['🚪', 'gates']]],
    nepal: ['🏔️', [['🏔️', 'mountains'], ['🚩', 'prayer flags'], ['🛕', 'temples']]],
    bangladesh: ['🛺', [['🛶', 'rivers'], ['🛺', 'rickshaw'], ['🍵', 'tea']]],
    'sri lanka': ['🍵', [['🍵', 'tea'], ['🐘', 'elephants'], ['🏰', 'fort']]],
    singapore: ['🌆', [['🌿', 'gardens'], ['🌆', 'skyline'], ['🦁', 'merlion']]],
    cambodia: ['🛕', [['🛕', 'temples'], ['🛶', 'river'], ['🪷', 'lotus']]],
    philippines: ['⛵', [['🏝️', 'islands'], ['🚌', 'jeepney'], ['⛵', 'boats']]],
    laos: ['🌿', [['🛶', 'river'], ['🛕', 'stupas'], ['🥭', 'mango']]],
    bhutan: ['🐉', [['🏔️', 'mountains'], ['🏯', 'dzong'], ['🐉', 'dragon']]],
    pakistan: ['🏔️', [['🏔️', 'mountains'], ['🍵', 'tea'], ['🚛', 'truck art']]],
    afghanistan: ['🪁', [['🏔️', 'mountains'], ['🏪', 'bazaar'], ['🪁', 'kites']]],
    iran: ['🌷', [['🌷', 'roses'], ['🟦', 'tiles'], ['🏪', 'bazaar']]],
    uzbekistan: ['🕌', [['🟦', 'blue tiles'], ['🧵', 'silk'], ['🕌', 'mosques']]],
    kazakhstan: ['🐎', [['🌾', 'steppe'], ['🐎', 'horses'], ['🦅', 'eagles']]],
    china: ['🐉', [['🐉', 'dragon'], ['🧱', 'great wall'], ['🏮', 'lanterns']]],
    taiwan: ['🧋', [['🌃', 'night markets'], ['🍵', 'tea'], ['🧋', 'bubble tea']]],
    japan: ['🗻', [['🌸', 'cherry blossoms'], ['⛩️', 'ancient temples'], ['🌊', 'coastlines']]],
    'south korea': ['🎌', [['🏯', 'palace'], ['👘', 'hanbok'], ['🥬', 'kimchi']]],
    korea: ['🎌', [['🏯', 'palace'], ['👘', 'hanbok'], ['🥬', 'kimchi']]],
    palau: ['🪼', [['🪨', 'rock islands'], ['🪼', 'jellyfish lake'], ['🌊', 'ocean']]],
    'federated states of micronesia': ['🪸', [['🪸', 'reef'], ['🏛️', 'ancient city'], ['🌊', 'ocean']]],
    'marshall islands': ['🛶', [['⭕', 'atolls'], ['🛶', 'canoe'], ['🌊', 'ocean']]],
    nauru: ['🌴', [['🌴', 'palm'], ['🌊', 'ocean'], ['🏝️', 'island']]],
    kiribati: ['🌅', [['🌅', 'sunrise'], ['⭕', 'atolls'], ['🛶', 'canoe']]]
  };

  var SHORT = { 'federated states of micronesia': 'Micronesia' };

  function info(country) {
    var key = String(country || '').trim().toLowerCase();
    return COUNTRIES[key] || ['📍', [['📍', 'a new stop'], ['🗺️', 'on the trail'], ['🍬', 'sweet shop']]];
  }

  /* 1.9.282 Three unique things for every real place on the trail.
     Short, checked facts. No sport. Icons sit in round pastel chips. */
  var PLACES = {
    'onerahi': [['🌊', 'Sits on the shore of Whangārei Harbour'], ['✈️', 'Home to Whangārei\'s airport'], ['🚂', 'An old railway line is now a harbour walkway']],
    "sarah's house": [['🏡', 'Sarah\'s home in Onerahi, Whangārei'], ['🌅', 'Morning sun over Whangārei Harbour'], ['💖', 'Level 2\'s sweet shop is hers']],
    'whangārei': [['💦', 'Whangārei Falls drop about 26 m'], ['🎨', 'Hundertwasser Art Centre opened in 2022'], ['⚓', 'Town Basin marina full of yachts']],
    'auckland post office': [['🌋', 'Auckland is built on about 50 volcanoes'], ['🗼', 'The Sky Tower stands 328 m tall'], ['⛵', 'Nicknamed the City of Sails']],
    'hamilton': [['🌸', 'Hamilton Gardens has themed gardens'], ['🏞️', 'The Waikato, NZ\'s longest river, runs through'], ['🎈', 'Hot-air balloons fill the autumn sky']],
    'rotorua': [['♨️', 'Geysers and bubbling mud pools'], ['🌲', 'A treewalk high in the giant redwoods'], ['🥚', 'Sulphur gives the air an eggy smell']],
    'taupō station': [['🏞️', 'Lake Taupō is NZ\'s largest lake'], ['🌋', 'The lake fills an ancient volcano'], ['💦', 'Huka Falls roar just up the river']],
    'napier': [['🏛️', 'Rebuilt in Art Deco after the 1931 quake'], ['🍇', 'Hawke\'s Bay fruit and wine country'], ['🌊', 'Marine Parade runs along the sea']],
    'wellington': [['🏛️', 'New Zealand\'s capital city'], ['🚋', 'A red cable car climbs to the gardens'], ['💨', 'Famous for its windy days']],
    'nelson': [['☀️', 'One of NZ\'s sunniest places'], ['📍', 'A hilltop marks the Centre of NZ'], ['🏖️', 'Abel Tasman National Park is close by']],
    'kaikōura': [['🐋', 'Sperm whales feed close to shore'], ['🦭', 'Fur seals lounge on the rocks'], ['⛰️', 'Mountains rise straight from the sea']],
    'christchurch': [['🌳', 'Known as the Garden City'], ['🛶', 'Punts glide along the Avon River'], ['🚋', 'Heritage trams loop the city centre']],
    'franz josef': [['🧊', 'A glacier flows down toward rainforest'], ['🚁', 'Helicopters land up on the ice'], ['🌿', 'Lush West Coast rainforest']],
    'queenstown': [['🚠', 'A gondola climbs Bob\'s Peak'], ['⛰️', 'The Remarkables tower over the lake'], ['⛴️', 'TSS Earnslaw, a 1912 steamship']],
    'dunedin': [['🚂', 'A grand old railway station'], ['🐧', 'Albatross and penguins on the peninsula'], ['🏴', 'Its name is Gaelic for Edinburgh']],
    'bluff': [['🦪', 'Famous for Bluff oysters'], ['🪧', 'Stirling Point signpost to the world'], ['⛴️', 'Ferries cross to Stewart Island']],
    'rarotonga': [['🏝️', 'A turquoise lagoon rings the island'], ['🛣️', 'One road loops the coast, about 32 km'], ['🌺', 'Main island of the Cook Islands']],
    'tonga': [['👑', 'The Pacific\'s only kingdom'], ['🐋', 'Humpback whales visit July to October'], ['💨', 'Blowholes spout along Tongatapu']],
    'samoa': [['🏠', 'Open-sided fale homes'], ['🌊', 'To Sua Ocean Trench swimming hole'], ['🌄', 'Among the first places to see each day']],
    'sydney': [['🎭', 'The Opera House has sail-shaped roofs'], ['🌉', 'Harbour Bridge, nicknamed the Coathanger'], ['⛴️', 'Ferries criss-cross the harbour']],
    'gold coast': [['🏖️', 'Long golden beaches'], ['🏙️', 'High-rise towers along the beachfront'], ['🌿', 'Rainforest in the hills behind']],
    'perth': [['🦢', 'Black swans on the Swan River'], ['🐾', 'Quokkas live on nearby Rottnest Island'], ['🌳', 'Kings Park, a huge inner-city park']],
    'adelaide': [['🟩', 'A city planned around leafy squares'], ['🐸', 'Home of the frog cake'], ['🍇', 'Barossa Valley vineyards nearby']],
    'melbourne': [['🚋', 'The world\'s largest tram network'], ['☕', 'Laneway cafés and street art'], ['🕰️', 'Flinders Street Station\'s clocks']],
    'brisbane': [['🌉', 'Story Bridge over the Brisbane River'], ['⛴️', 'CityCat ferries zip along the river'], ['🐨', 'Lone Pine, the first koala sanctuary']],
    'port moresby': [['🏛️', 'Capital of Papua New Guinea'], ['🏘️', 'Hanuabada stilt village over the sea'], ['🐦', 'A bird of paradise is on PNG\'s flag']],
    'solomon islands': [['🏝️', 'Nearly 1,000 islands'], ['🐚', 'Shell money is still used in custom'], ['🌊', 'Marovo, a giant saltwater lagoon']],
    'vanuatu': [['🌋', 'Mount Yasur, an active volcano'], ['📮', 'A post office under the sea'], ['🗣️', 'Over 100 local languages']],
    'fiji': [['🏝️', 'More than 300 islands'], ['👋', '"Bula!" means hello'], ['🪸', 'Called the soft coral capital']],
    'new caledonia': [['🪸', 'One of the world\'s largest lagoons'], ['🌲', 'Tall column pines line the coast'], ['🥖', 'French-speaking, with fresh baguettes']],
    'indonesia': [['🏝️', 'More than 17,000 islands'], ['🌾', 'Bali\'s terraced rice fields'], ['🛕', 'Borobudur, the largest Buddhist temple']],
    'canberra': [['🏛️', 'Australia\'s planned capital city'], ['🏞️', 'Lake Burley Griffin at its heart'], ['🎈', 'Hot-air balloons each autumn']],
    'hobart': [['⛰️', 'kunanyi / Mount Wellington above the city'], ['⚓', 'Australia\'s second-oldest capital'], ['🧺', 'Salamanca Market every Saturday']],
    'vietnam': [['🛵', 'Saigon streets buzz with motorbikes'], ['🍜', 'Home of phở noodle soup'], ['🏝️', 'Hạ Long Bay\'s limestone islands']],
    'malaysia': [['🏙️', 'Petronas Twin Towers, 452 m tall'], ['🌳', 'Some of the oldest rainforests on Earth'], ['🌺', 'Rafflesia, the world\'s biggest flower']],
    'thailand': [['🛕', 'Wat Arun, the Temple of Dawn'], ['🐘', 'The elephant is a national symbol'], ['🛶', 'Floating markets on canals']],
    'myanmar': [['✨', 'Golden Shwedagon Pagoda in Yangon'], ['🛕', 'Thousands of temples at Bagan'], ['🚣', 'Inle Lake fishers row with one leg']],
    'india': [['🕌', 'The Taj Mahal, built of white marble'], ['🐯', 'Home to most of the world\'s wild tigers'], ['🍬', 'Sweets like jalebi and laddoo']],
    'nepal': [['🏔️', 'Home to Everest, the highest peak'], ['🚩', 'The only non-rectangular national flag'], ['🎏', 'Prayer flags flutter on the passes']],
    'bangladesh': [['🐯', 'The Sundarbans, a vast mangrove forest'], ['🛺', 'Dhaka\'s colourful cycle rickshaws'], ['🏖️', 'Cox\'s Bazar, a very long sandy beach']],
    'sri lanka': [['🍵', 'Famous for Ceylon tea'], ['🪨', 'Sigiriya, an ancient rock fortress'], ['🐘', 'Elephant herds gather at Minneriya']],
    'singapore': [['🌳', 'Supertrees at Gardens by the Bay'], ['🦁', 'The Merlion, half lion and half fish'], ['🏝️', 'A city, island and country in one']],
    'cambodia': [['🛕', 'Angkor Wat, the largest religious monument'], ['🏞️', 'The Tonlé Sap river reverses each year'], ['🚩', 'Angkor Wat is on the national flag']],
    'philippines': [['🏝️', 'More than 7,000 islands'], ['🚙', 'Colourful jeepneys carry passengers'], ['🍫', 'Bohol\'s Chocolate Hills']],
    'laos': [['✨', 'Golden Pha That Luang in Vientiane'], ['🛶', 'The Mekong River runs along its border'], ['🧡', 'Morning alms walk in Luang Prabang']],
    'bhutan': [['😊', 'It measures Gross National Happiness'], ['🏯', 'Tiger\'s Nest monastery clings to a cliff'], ['🐉', 'Land of the Thunder Dragon']],
    'pakistan': [['🏔️', 'K2, the world\'s second-highest peak'], ['🕌', 'Faisal Mosque in Islamabad'], ['🚛', 'Brightly painted truck art']],
    'afghanistan': [['💎', 'Lapis lazuli mined for 6,000 years'], ['🏞️', 'Band-e-Amir\'s deep blue lakes'], ['🍎', 'Famous for juicy pomegranates']],
    'iran': [['🕌', 'Isfahan\'s great tiled square'], ['🧶', 'Hand-knotted Persian carpets'], ['🌹', 'Rosewater made from Kashan\'s roses']],
    'uzbekistan': [['🟦', 'Samarkand\'s blue-tiled Registan'], ['🐫', 'Old cities on the Silk Road'], ['🍞', 'Round non bread from clay ovens']],
    'kazakhstan': [['🌍', 'The world\'s largest landlocked country'], ['🚀', 'Baikonur, the first spaceport'], ['🍎', 'Wild apples first grew here']],
    'beijing': [['🧱', 'The Great Wall winds north of the city'], ['🏯', 'The Forbidden City, 600 years old'], ['🦆', 'Home of Peking duck']],
    "xi'an": [['🗿', 'The Terracotta Army of 8,000 figures'], ['🧱', 'Ancient city walls still stand'], ['🐫', 'A start of the old Silk Road']],
    'chengdu': [['🐼', 'Giant panda breeding base'], ['🌶️', 'Spicy Sichuan cooking'], ['🍵', 'Teahouses in People\'s Park']],
    'chongqing': [['🚝', 'A monorail runs through a building'], ['🌁', 'Nicknamed the Fog City'], ['🏞️', 'Where the Jialing meets the Yangtze']],
    'shanghai': [['🏛️', 'The Bund\'s riverside buildings'], ['🗼', 'Shanghai Tower, 632 m tall'], ['🥟', 'Xiaolongbao soup dumplings']],
    'guangzhou': [['🌸', 'Known as the City of Flowers'], ['🗼', 'Canton Tower beside the Pearl River'], ['🥟', 'Home of Cantonese dim sum']],
    'nanjing': [['🏯', 'A former capital of China'], ['🧱', 'A huge Ming-era city wall'], ['🌸', 'Plum blossoms on Purple Mountain']],
    'hangzhou': [['🏞️', 'West Lake, a World Heritage site'], ['🍵', 'Longjing (Dragon Well) green tea'], ['🌉', 'The Broken Bridge of the White Snake tale']],
    'fuzhou': [['🌳', 'Called the Banyan City'], ['🏘️', 'Three Lanes and Seven Alleys'], ['♨️', 'Hot springs bubble under the city']],
    'xiamen': [['🎹', 'Gulangyu, the Piano Island'], ['🏝️', 'A city built on an island'], ['🛕', 'Nanputuo Temple by the hills']],
    'quanzhou': [['⛵', 'A great Maritime Silk Road port'], ['🌉', 'Luoyang Bridge, nearly 1,000 years old'], ['🗿', 'A giant stone statue of Laozi']],
    'shenzhen': [['🏙️', 'Grew from towns to a megacity in 40 years'], ['📱', 'A world hub for electronics'], ['🗼', 'Ping An Finance Centre, 599 m']],
    'hong kong': [['🌃', 'Victoria Harbour\'s glittering skyline'], ['⛴️', 'The Star Ferry has sailed since 1888'], ['🥮', 'Mooncakes at Mid-Autumn Festival']],
    'haikou': [['🌴', 'Capital of tropical Hainan Island'], ['🥥', 'Famous for fresh coconuts'], ['🌋', 'Ancient volcano craters nearby']],
    'taipei': [['🗼', 'Taipei 101, once the world\'s tallest'], ['🌃', 'Busy night markets like Shilin'], ['🧋', 'Bubble tea was invented in Taiwan']],
    'naha': [['🏯', 'Shuri Castle of the Ryukyu Kingdom'], ['🦁', 'Shisa lion-dogs guard the rooftops'], ['🪸', 'Coral reefs and turquoise seas']],
    'fukuoka': [['🍜', 'Famous for Hakata ramen'], ['🏮', 'Yatai food stalls by the river'], ['🌸', 'Cherry blossoms at the castle ruins']],
    'seoul': [['🏯', 'Gyeongbokgung, a grand royal palace'], ['👘', 'Visitors stroll in colourful hanbok'], ['🥬', 'Kimchi with every meal']],
    'tokyo': [['🗼', 'Tokyo Skytree, 634 m tall'], ['🚅', 'Bullet trains since 1964'], ['🌸', 'Cherry blossoms in Ueno Park']],
    'koror': [['🪼', 'Jellyfish Lake full of golden jellies'], ['🪨', 'The Rock Islands, a World Heritage site'], ['🦈', 'Palau made the first shark sanctuary']],
    'palikir': [['🏛️', 'Capital of the Federated States of Micronesia'], ['🗿', 'Nan Madol, an ancient city on islets'], ['🌧️', 'Pohnpei is one of the rainiest places']],
    'majuro': [['⭕', 'A ring-shaped coral atoll'], ['🗺️', 'Stick charts once guided navigators'], ['🛶', 'Outrigger canoes on the lagoon']],
    'yaren': [['🏝️', 'Nauru is the third-smallest country'], ['🏛️', 'Nauru has no official capital'], ['🛣️', 'One road rings the whole island']],
    'south tarawa': [['🌐', 'Kiribati spans all four hemispheres'], ['⭕', 'Built along a narrow coral atoll'], ['🌄', 'Kiribati greets each new day first']]
  };
  var CHIPS = ['#d9f5e6', '#ffe3d6', '#e6e0ff', '#d8f0ff', '#fff1c7'];

  function placeFacts(place, country) {
    var key = String(place || '').trim().toLowerCase();
    if (PLACES[key]) return PLACES[key];
    var c = info(country)[1];
    return c.map(function (bit) { return [bit[0], bit[1].charAt(0).toUpperCase() + bit[1].slice(1)]; });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  var placeOpen = null;
  function hidePlace() {
    var card = document.getElementById('sr-place-card');
    if (card) card.hidden = true;
    placeOpen = null;
    var map = document.getElementById('map');
    if (map) map.classList.remove('sr-placing');
    var stage = document.getElementById('mapstage');
    if (stage && stage.dataset.placeShift) { stage.dataset.placeShift = ''; stage.dataset.framed = ''; }
  }

  function showPlace(opts) {
    opts = opts || {};
    var map = document.getElementById('map');
    if (!map) { if (opts.open && opts.play) opts.play(); return; }
    injectStyle();
    var card = document.getElementById('sr-place-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'sr-place-card';
      card.className = 'sr-place-card';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'false');
      card.hidden = true;
      map.appendChild(card);
      card.addEventListener('click', function (e) {
        var t = e.target.closest ? e.target.closest('[data-sr-place]') : null;
        if (!t) return;
        if (t.dataset.srPlace === 'close') hidePlace();
        else if (t.dataset.srPlace === 'play' && placeOpen && placeOpen.play) { var go = placeOpen.play; hidePlace(); go(); }
      });
    }
    var facts = placeFacts(opts.place, opts.country);
    var title = opts.place === "Sarah's House" ? "Sarah's House" : opts.place;
    card.dataset.n = String(opts.n || '');
    card.setAttribute('aria-label', 'Three unique things about ' + title);
    card.innerHTML = '<button type="button" class="sr-pc-x" data-sr-place="close" aria-label="Close">×</button>' +
      '<h3 class="sr-pc-name">' + esc(title) + '</h3>' +
      (opts.country && opts.country.toLowerCase() !== String(opts.place || '').toLowerCase() ? '<p class="sr-pc-country">' + esc(opts.country) + '</p>' : '') +
      '<hr class="sr-pc-rule">' +
      '<p class="sr-pc-head">Three unique things</p>' +
      '<ul class="sr-pc-list">' + facts.map(function (f, i) {
        return '<li><i aria-hidden="true" style="background:' + CHIPS[(i + (opts.n || 0)) % CHIPS.length] + '">' + f[0] + '</i><span>' + esc(f[1]) + '</span></li>';
      }).join('') + '</ul>' +
      (opts.open
        ? '<button type="button" class="sr-pc-play" data-sr-place="play"' + (opts.name ? ' title="' + esc(opts.name) + '"' : '') + '>▶ Play level ' + esc(opts.n) + '</button>'
        : '<p class="sr-pc-lock">🔒 Finish level ' + esc((opts.n || 2) - 1) + ' to unlock</p>');
    placeOpen = opts;
    var cc = document.getElementById('sr-country-card');
    var ctop = cc && !cc.hidden && cc.offsetHeight ? cc.getBoundingClientRect().bottom + 8 : 64;
    card.style.setProperty('--sr-pc-top', Math.round(ctop) + 'px');
    card.hidden = false;
    map.classList.add('sr-placing');
    clearStop(opts.n, card);
  }

  /* Keep the tapped stop (and the star) visible: slide the map so the stop sits in the open sea
     between the place card and the country buttons. */
  function clearStop(n, card) {
    var stage = document.getElementById('mapstage');
    var pin = document.querySelector('.stops .lv[data-n="' + n + '"] .pin');
    if (!stage || !pin || stage.classList.contains('travel-shot')) return;
    var m = /translate(?:3d)?\(\s*([-\d.]+)px,\s*([-\d.]+)px/.exec(stage.style.transform || '');
    if (!m) return;
    var r = pin.getBoundingClientRect(), c = card.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var zoneTop = c.bottom + 56, zoneBot = vh - 175;
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var want = zoneBot > zoneTop ? (zoneTop + zoneBot) / 2 : zoneTop;
    var dy = (y >= zoneTop && y <= zoneBot) ? 0 : want - y;
    var dx = x < 40 ? 40 - x : (x > vw - 40 ? vw - 40 - x : 0);
    if (!dx && !dy) return;
    stage.style.transition = 'transform .35s ease';
    stage.style.transform = stage.style.transform.replace(m[0], m[0].replace(m[1] + 'px', (+m[1] + dx).toFixed(1) + 'px').replace(m[2] + 'px', (+m[2] + dy).toFixed(1) + 'px'));
    stage.dataset.placeShift = '1';
  }

  function stageScale(stage) {
    var m = /scale\(([\d.]+)\)/.exec(stage.style.transform || '');
    var k = m ? parseFloat(m[1]) : 1;
    return k > 0 ? k : 1;
  }

  /* Keep the player and country badges a fixed size on screen when a small
     country is zoomed in, and slide the player beside the stop so the land
     and the star pin stay visible. */
  /* In the world view the country badges sit on their countries; where several share a few pixels
     (South and Southeast Asia) they are eased apart so each stays tappable. */
  function spreadWorldBadges(stage) {
    if (!stage.classList.contains('sr-world-view')) { stage.dataset.spread = ''; return; }
    var key = stage.dataset.framed + ':' + stage.style.transform;
    if (stage.dataset.spread === key) return;
    stage.dataset.spread = key;
    var medals = Array.prototype.slice.call(document.querySelectorAll('.stops .lv .sr-medal'));
    var pts = medals.map(function (m) {
      var pin = m.parentNode.querySelector('.pin') || m.parentNode;
      var r = pin.getBoundingClientRect();
      return { m: m, x0: r.left + r.width / 2, y0: r.top + r.height / 2, dx: 0, dy: 0 };
    });
    var min = 31;
    for (var it = 0; it < 90; it++) {
      for (var i = 0; i < pts.length; i++) for (var j = i + 1; j < pts.length; j++) {
        var a = pts[i], b = pts[j];
        var dx = (b.x0 + b.dx) - (a.x0 + a.dx), dy = (b.y0 + b.dy) - (a.y0 + a.dy), d = Math.sqrt(dx * dx + dy * dy);
        if (d >= min) continue;
        if (d < 0.01) { dx = 1; dy = 0.3 * (i % 3 - 1); d = Math.sqrt(dx * dx + dy * dy); }
        var push = (min - d) / 2 * 0.6;
        a.dx -= dx / d * push; a.dy -= dy / d * push; b.dx += dx / d * push; b.dy += dy / d * push;
      }
      pts.forEach(function (p) { p.dx *= 0.995; p.dy *= 0.995; });
    }
    pts.forEach(function (p) { p.m.style.setProperty('--dx', p.dx.toFixed(1) + 'px'); p.m.style.setProperty('--dy', p.dy.toFixed(1) + 'px'); });
  }

  function fitMarkers() {
    var stage = document.getElementById('mapstage');
    if (!stage) return;
    var k = stage.classList.contains('travel-shot') ? 1 : stageScale(stage);
    var ks = k.toFixed(3);
    if (stage.style.getPropertyValue('--sr-k') !== ks) stage.style.setProperty('--sr-k', ks);
    document.querySelectorAll('#racers .racer').forEach(function (el) {
      if (!el.dataset.srBase) el.dataset.srBase = el.style.transform || '';
      var nums = (el.dataset.srBase.match(/[+-] ?-?[\d.]+px/g) || []).map(function (t) { return parseFloat(t.replace(/^\+ ?/, '').replace(/^- ?/, '-')); });
      var x = nums[0] || 0, y = nums[1] || 0;
      if (el.classList.contains('me')) {
        var pin = document.querySelector('.stops .lv[data-n="' + el.dataset.stop + '"]');
        var side = pin && pin.classList.contains('lab-left') ? 1 : -1;
        var small = k >= 1.6; /* zoomed in on a small country: sit out in the sea */
        x += side * (small ? 44 : 14); y -= small ? 12 : 6;
      }
      var want = 'translate(-50%, -50%) translate(' + (x / k).toFixed(1) + 'px, ' + (y / k).toFixed(1) + 'px) scale(' + (1 / k).toFixed(3) + ')';
      if (el.style.transform !== want) el.style.transform = want;
    });
    spreadWorldBadges(stage);
    var here = document.querySelector('.stops .lv.here');
    document.querySelectorAll('.stops .lv .sr-star').forEach(function (s) { if (s.parentNode !== here) s.remove(); });
    if (here && !here.querySelector('.sr-star')) {
      var star = document.createElement('span');
      star.className = 'sr-star';
      star.setAttribute('aria-hidden', 'true');
      star.innerHTML = '<svg viewBox="0 0 40 52" width="34" height="44"><defs><radialGradient id="srStarRed" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#ff7a86"/><stop offset=".55" stop-color="#f0283f"/><stop offset="1" stop-color="#b8102a"/></radialGradient></defs>' +
        '<path d="M20 50 C20 50 4 31 4 19 A16 16 0 1 1 36 19 C36 31 20 50 20 50 Z" fill="url(#srStarRed)" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M20 9.5 L22.9 15.6 L29.5 16.4 L24.6 20.9 L25.9 27.4 L20 24.2 L14.1 27.4 L15.4 20.9 L10.5 16.4 L17.1 15.6 Z" fill="#ffd54a" stroke="#f0a400" stroke-width="1" stroke-linejoin="round"/>' +
        '<ellipse cx="14" cy="12" rx="4" ry="2.4" fill="#fff" opacity=".45" transform="rotate(-30 14 12)"/></svg>';
      here.appendChild(star);
    }
    var lab = here && here.querySelector('.sr-star-label');
    if (here && !lab) {
      lab = document.createElement('b');
      lab.className = 'sr-star-label';
      here.querySelector('.sr-star').appendChild(lab);
    }
    if (lab) {
      var lt = "You're here · Level " + here.dataset.n;
      if (lab.textContent !== lt) lab.textContent = lt;
    }
  }

  /* 1.9.282 Map art v2, after Shane's two references: raised pastel land with
     cliff sides and a soft shadow, white foam along every coast, a turquoise
     swirl sea, rocky islets, bushes and pebbles, and a thick pink route with
     cream nodes. Painted once per map, no SVG filters, so phones stay smooth. */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var V2_FILL = {
    'sr-land': 'v2-meadow', 'sr-candy-strawberry': 'v2-peach', 'sr-candy-peach': 'v2-peach',
    'sr-candy-lemon': 'v2-mint', 'sr-candy-mint': 'v2-mint', 'sr-candy-blueberry': 'v2-lilac', 'sr-candy-grape': 'v2-lilac'
  };
  var V2_DEFS =
    '<linearGradient id="v2-meadow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4f0c6"/><stop offset=".42" stop-color="#c3e9bd"/><stop offset=".7" stop-color="#f3dcc0"/><stop offset="1" stop-color="#f6c2ab"/></linearGradient>' +
    '<linearGradient id="v2-mint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2f8ea"/><stop offset="1" stop-color="#b9e8cf"/></linearGradient>' +
    '<linearGradient id="v2-peach" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7d9"/><stop offset="1" stop-color="#f8c4ad"/></linearGradient>' +
    '<linearGradient id="v2-lilac" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eee4fb"/><stop offset="1" stop-color="#d3c1f0"/></linearGradient>' +
    '<pattern id="v2-swirl" width="260" height="260" patternUnits="userSpaceOnUse">' +
    '<path d="M-10 60 C 40 20 90 100 140 60 S 230 30 270 70" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>' +
    '<path d="M20 180 C 60 150 100 210 150 180 C 190 156 210 196 240 176" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".28"/>' +
    '<path d="M150 118 c 18 -16 46 -10 44 10 c -2 16 -24 18 -28 6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".3"/>' +
    '<path d="M30 240 c 14 -12 36 -8 34 8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".25"/>' +
    '</pattern>' +
    '<g id="v2-bush"><ellipse cx="0" cy="3.2" rx="7.5" ry="2.6" fill="#5b9b78" opacity=".28"/><circle cx="-3.6" cy="0" r="3.6" fill="#78c08a"/><circle cx="3.6" cy="0.4" r="3.4" fill="#6cb682"/><circle cx="0" cy="-2.6" r="4" fill="#8fd09a"/><circle cx="-1.2" cy="-4" r="1.5" fill="#c4ecc0"/></g>' +
    '<g id="v2-pebbles" fill="#fff6e8"><circle cx="0" cy="0" r="1.5"/><circle cx="4" cy="1" r="1.3"/><circle cx="8" cy="0" r="1.5"/><circle cx="2" cy="3.5" r="1.3"/><circle cx="6" cy="4" r="1.5"/><circle cx="10" cy="3" r="1.2"/><circle cx="4" cy="7" r="1.3"/></g>' +
    '<g id="v2-islet"><ellipse cx="0" cy="5" rx="15" ry="6.5" fill="#fff" opacity=".55"/><path d="M-9 2 L-7 -5 L-2 -8 L5 -7 L9 -2 L9 3 Q0 6 -9 2 Z" fill="#e4bfa8"/><path d="M-9 -1 L-7 -6 L-2 -9 L5 -8 L9 -3 L8 0 Q0 2.5 -9 -1 Z" fill="#f6e3d2" stroke="#fff" stroke-width="1"/></g>' +
    '<g id="v2-islet-green"><ellipse cx="0" cy="6" rx="18" ry="7" fill="#fff" opacity=".55"/><path d="M-12 1 Q-12 -6 0 -7 Q12 -6 12 1 L11 5 Q0 8 -11 5 Z" fill="#e8b49e"/><ellipse cx="0" cy="-2" rx="12" ry="6" fill="#bfe6b3" stroke="#fff" stroke-width="1"/><circle cx="-3" cy="-4" r="3.5" fill="#7cc48c"/><circle cx="3" cy="-3.4" r="3" fill="#6cb682"/></g>';

  function v2rng(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function el(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function stopPoints(svg) {
    var vb = svg.viewBox.baseVal;
    return Array.prototype.map.call(document.querySelectorAll('.stops .lv'), function (b) {
      return { n: +b.dataset.n, country: b.dataset.country, done: b.classList.contains('done'), here: b.classList.contains('here'),
        x: vb.x + parseFloat(b.style.left) / 100 * vb.width, y: vb.y + parseFloat(b.style.top) / 100 * vb.height };
    });
  }

  function paintMap() {
    var svg = document.querySelector('#mapstage svg.nzsvg');
    if (!svg || svg.__v2) return;
    if (!document.querySelector('.stops .lv')) return;
    svg.__v2 = true;
    var t0 = performance.now();
    svg.classList.add('sr-v2');
    var defs = svg.querySelector('defs');
    var holder = el('g', {});
    holder.innerHTML = V2_DEFS;
    while (holder.firstChild) defs.appendChild(holder.firstChild);
    var sea = svg.querySelector('#sr-sea');
    if (sea) {
      var cols = ['#5ad6ea', '#43c9e2', '#62d7e6'];
      sea.querySelectorAll('stop').forEach(function (s, i) { s.setAttribute('stop-color', cols[Math.min(i, 2)]); });
    }
    var seaRect = svg.querySelector('rect[fill="url(#sr-sea)"]');
    var vb = svg.viewBox.baseVal;
    var swirl = el('rect', { x: vb.x, y: vb.y, width: vb.width, height: vb.height, fill: 'url(#v2-swirl)', 'class': 'sr-v2-swirl', 'pointer-events': 'none' });
    if (seaRect) seaRect.parentNode.insertBefore(swirl, seaRect.nextSibling);
    svg.querySelectorAll('.sr-pacific > rect').forEach(function (r) {
      r.setAttribute('fill', '#8ae8ee'); r.setAttribute('opacity', '.5'); r.setAttribute('stroke', '#fff'); r.setAttribute('stroke-width', '3'); r.removeAttribute('stroke-dasharray');
    });

    var lands = Array.prototype.filter.call(svg.querySelectorAll('path[fill^="url(#sr-"],ellipse[fill^="url(#sr-"],circle[fill^="url(#sr-"]'), function (n) {
      var id = (n.getAttribute('fill').match(/#([\w-]+)/) || [])[1];
      return V2_FILL[id] && !n.closest('.sr-terrain,.sr-landmarks');
    });
    var stops = stopPoints(svg);
    var byParent = new Map();
    lands.forEach(function (n) {
      var id = n.getAttribute('fill').match(/#([\w-]+)/)[1];
      n.setAttribute('fill', 'url(#' + V2_FILL[id] + ')');
      n.removeAttribute('filter');
      if (n.closest('.sr-inset')) return;
      if (!byParent.has(n.parentNode)) byParent.set(n.parentNode, []);
      byParent.get(n.parentNode).push(n);
    });
    var rand = v2rng(20261120);
    var bushes = 0, pebbles = 0;
    var bigLands = [];
    byParent.forEach(function (list, parent) {
      var under = el('g', { 'class': 'sr-v2-under', 'pointer-events': 'none' });
      var shadow = el('g', { opacity: '.17' }), foamOut = el('g', { opacity: '.2' }), foamIn = el('g', { opacity: '.6' }), cliff = el('g', {});
      under.appendChild(shadow); under.appendChild(foamOut); under.appendChild(foamIn); under.appendChild(cliff);
      var tex = el('g', { 'class': 'sr-v2-texture', 'pointer-events': 'none' });
      list.forEach(function (n) {
        var bb; try { bb = n.getBBox(); } catch (e) { return; }
        var size = Math.max(bb.width, bb.height);
        var d = Math.max(0.5, Math.min(12, size * 0.03));
        var foam = Math.max(0.6, Math.min(10, size * 0.03));
        var sw = parseFloat(n.getAttribute('stroke-width') || '3');
        function copy(dy, attrs, into) {
          var g = el('g', { transform: 'translate(0 ' + dy.toFixed(1) + ')' });
          var c = n.cloneNode(false);
          c.removeAttribute('class'); c.removeAttribute('id');
          for (var k in attrs) c.setAttribute(k, attrs[k]);
          g.appendChild(c); into.appendChild(g);
        }
        copy(d + Math.max(0.6, d * 0.7), { fill: '#1d7d9c', stroke: '#1d7d9c', 'stroke-width': sw + d * 0.3 }, shadow);
        copy(d, { fill: 'none', stroke: '#fff', 'stroke-width': sw + foam * 2.6 }, foamOut);
        copy(d, { fill: 'none', stroke: '#fff', 'stroke-width': sw + foam }, foamIn);
        copy(d, { fill: '#d98f7c', stroke: '#d98f7c', 'stroke-width': sw }, cliff);
        if (d >= 1.2) copy(d * 0.6, { fill: '#e8a68f', stroke: '#e8a68f', 'stroke-width': sw }, cliff);
        copy(d * 0.28, { fill: '#f2bda6', stroke: '#f2bda6', 'stroke-width': sw }, cliff);
        var s0 = Math.max(0.12, Math.min(0.8, size * 0.0022)); // bush scale follows the land, so it reads the same zoomed in
        if (n.tagName.toLowerCase() !== 'path' || n.getAttribute('transform') || size < 18) return;
        bigLands.push(n);
        var area = bb.width * bb.height;
        var wantB = Math.min(38, Math.round(area / (1500 * s0 * s0))), wantP = Math.min(22, Math.round(area / (2600 * s0 * s0)));
        var pt = svg.createSVGPoint();
        function inside(x, y, m) {
          pt.x = x; pt.y = y; if (!n.isPointInFill(pt)) return false;
          pt.x = x - m; if (!n.isPointInFill(pt)) return false;
          pt.x = x + m; if (!n.isPointInFill(pt)) return false;
          pt.x = x; pt.y = y + m; return n.isPointInFill(pt);
        }
        function nearStop(x, y, r) {
          for (var i = 0; i < stops.length; i++) { var dx = stops[i].x - x, dy = stops[i].y - y; if (dx * dx + dy * dy < r * r) return true; }
          return false;
        }
        var tries = 0, gotB = 0, gotP = 0;
        while ((gotB < wantB || gotP < wantP) && tries < (wantB + wantP) * 4 && bushes < 320 && pebbles < 200) {
          tries++;
          var x = bb.x + rand() * bb.width, y = bb.y + rand() * bb.height;
          if (nearStop(x, y, Math.max(1.5, 20 * s0)) || !inside(x, y, 12 * s0)) continue;
          var s = (s0 * (0.75 + rand() * 0.6)).toFixed(3);
          if (gotB < wantB && (gotP >= wantP || rand() < 0.62)) {
            var cl = el('g', { transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + s + ')' });
            cl.appendChild(el('use', { href: '#v2-bush' }));
            if (rand() < 0.55) cl.appendChild(el('use', { href: '#v2-bush', x: (6 + rand() * 4).toFixed(1), y: (2 + rand() * 3).toFixed(1) }));
            tex.appendChild(cl); gotB++; bushes++;
          } else {
            tex.appendChild(el('use', { href: '#v2-pebbles', transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + s + ')' }));
            gotP++; pebbles++;
          }
        }
      });
      parent.insertBefore(under, list[0]);
      var last = list[list.length - 1];
      parent.insertBefore(tex, last.nextSibling);
    });

    // Rocky islets out at sea, away from coasts, stops and the inset panels.
    var panels = Array.prototype.map.call(svg.querySelectorAll('.sr-inset > rect'), function (r) { return r.getBBox(); });
    var isle = el('g', { 'class': 'sr-v2-islets', 'pointer-events': 'none' });
    var placed = [], pt2 = svg.createSVGPoint(), tries2 = 0;
    function onLand(x, y) {
      for (var i = 0; i < lands.length; i++) {
        pt2.x = x; pt2.y = y;
        try { if (lands[i].isPointInFill(pt2)) return true; } catch (e) {}
      }
      return false;
    }
    while (placed.length < 34 && tries2 < 800) {
      tries2++;
      var x = vb.x + 20 + rand() * (vb.width - 40), y = vb.y + 20 + rand() * (vb.height - 40);
      var bad = panels.some(function (b) { return x > b.x - 8 && x < b.x + b.width + 8 && y > b.y - 8 && y < b.y + b.height + 8; });
      if (bad) continue;
      if (stops.some(function (s) { return Math.abs(s.x - x) < 22 && Math.abs(s.y - y) < 22; })) continue;
      if (placed.some(function (p) { return Math.abs(p[0] - x) < 60 && Math.abs(p[1] - y) < 60; })) continue;
      if (onLand(x, y) || onLand(x - 14, y) || onLand(x + 14, y) || onLand(x, y - 14) || onLand(x, y + 14)) continue;
      placed.push([x, y]);
      var big = rand() < 0.4;
      isle.appendChild(el('use', { href: big ? '#v2-islet-green' : '#v2-islet', transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (0.3 + rand() * 0.25).toFixed(2) + ')' }));
    }
    swirl.parentNode.insertBefore(isle, swirl.nextSibling);
    svg.dataset.v2 = bushes + '/' + pebbles + '/' + placed.length + '/' + Math.round(performance.now() - t0) + 'ms';
  }

  /* Thick pink route through the framed country's stops, cream nodes on top. */
  function catmull(p) {
    if (p.length < 2) return '';
    var d = 'M' + p[0].x.toFixed(1) + ' ' + p[0].y.toFixed(1);
    for (var i = 0; i < p.length - 1; i++) {
      var a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      d += ' C' + (b.x + (c.x - a.x) / 6).toFixed(1) + ' ' + (b.y + (c.y - a.y) / 6).toFixed(1) + ' ' +
        (c.x - (e.x - b.x) / 6).toFixed(1) + ' ' + (c.y - (e.y - b.y) / 6).toFixed(1) + ' ' + c.x.toFixed(1) + ' ' + c.y.toFixed(1);
    }
    return d;
  }
  function syncRoute(country) {
    var svg = document.querySelector('#mapstage svg.nzsvg');
    var stage = document.getElementById('mapstage');
    if (!svg || !stage || !svg.__v2) return;
    var k = stageScale(stage);
    var unit = (stage.clientWidth || 1) / svg.viewBox.baseVal.width * k; // screen px per map unit
    var winPath = svg.querySelector('#sr-path-win');
    if (winPath && !stage.classList.contains('travel-shot')) winPath.style.strokeWidth = (8 / unit).toFixed(3);
    var swirlPat = svg.querySelector('#v2-swirl');
    if (swirlPat) { var ps = 'scale(' + (1.2 / unit).toFixed(4) + ')'; if (swirlPat.getAttribute('patternTransform') !== ps) swirlPat.setAttribute('patternTransform', ps); }
    var pts = stopPoints(svg).filter(function (s) { return country === WORLD || s.country === country; }).sort(function (a, b) { return a.n - b.n; });
    var hereI = -1;
    pts.forEach(function (p, i) { if (p.here) hereI = i; else if (p.done && hereI < 0) hereI = Math.max(hereI, -1); });
    var lastDone = -1;
    pts.forEach(function (p, i) { if (p.done || p.here) lastDone = i; });
    var key = country + ':' + pts.length + ':' + lastDone + ':' + unit.toFixed(2);
    var g = svg.querySelector('#sr-v2-route');
    if (g && g.dataset.key === key) return;
    if (!g) {
      g = el('g', { id: 'sr-v2-route', 'pointer-events': 'none' });
      var before = svg.querySelector('#sr-path-win') || svg.querySelector('#sr-travel-plane');
      if (before && before.parentNode) before.parentNode.insertBefore(g, before); else svg.appendChild(g);
    }
    g.dataset.key = key;
    var w = (country === WORLD ? 5 : 9) / unit;
    var all = catmull(pts), done = lastDone > 0 ? catmull(pts.slice(0, lastDone + 1)) : '';
    g.innerHTML = all ? (
      '<path d="' + all + '" fill="none" stroke="#c9547f" stroke-opacity=".18" stroke-width="' + (w * 2.1).toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 ' + (2.5 / unit).toFixed(2) + ')"/>' +
      '<path d="' + all + '" fill="none" stroke="#fff" stroke-width="' + (w * 1.75).toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + all + '" fill="none" stroke="#f9bcd2" stroke-width="' + w.toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      (done ? '<path d="' + done + '" fill="none" stroke="#f483ac" stroke-width="' + w.toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>' : '') +
      '<path d="' + all + '" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="' + (1.6 / unit).toFixed(2) + '" stroke-dasharray="' + (7 / unit).toFixed(1) + ' ' + (8 / unit).toFixed(1) + '" stroke-linecap="round"/>'
    ) : '';
  }

  /* Big puffy clouds in the corners of the screen, like the reference. */
  var CLOUD = '<svg viewBox="0 0 200 110" aria-hidden="true"><ellipse cx="100" cy="98" rx="86" ry="9" fill="#2a8fb0" opacity=".14"/><path d="M30 92 C6 92 4 64 26 60 C22 36 52 26 66 42 C72 16 112 10 122 36 C134 22 164 26 164 50 C188 48 198 72 182 86 C176 94 166 96 156 94 Z" fill="#fff"/><path d="M30 92 C14 90 10 78 18 70 C30 82 60 86 90 84 C120 86 158 82 184 76 C186 88 174 96 156 94 Z" fill="#dbe9f2" opacity=".75"/><ellipse cx="70" cy="48" rx="16" ry="9" fill="#fff" opacity=".9"/></svg>';
  function syncClouds() {
    var map = document.getElementById('map');
    if (!map || document.getElementById('sr-v2-clouds')) return;
    var box = document.createElement('div');
    box.id = 'sr-v2-clouds';
    box.className = 'sr-v2-clouds';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = ['tl', 'tr', 'ml', 'br'].map(function (c) { return '<i class="sr-v2-cloud c-' + c + '">' + CLOUD + '</i>'; }).join('');
    map.appendChild(box);
  }

  function injectStyle() {
    if (document.getElementById('sr-map-extra-style')) return;
    var css = document.createElement('style');
    css.id = 'sr-map-extra-style';
    css.textContent = [
      '.mapview{background:#7ee8f5}',
      '.nzsvg .sr-atlas,.nzsvg .sr-bob{display:none}',
      '.nzsvg path{stroke-linejoin:round}',
      '.stops .lv .pin{width:18px;height:18px;border:2px solid #fff;background:#fff;box-shadow:0 1px 0 rgba(180,40,90,.12);color:#d6246e}',
      '.stops .lv .pin .no{font-size:0}',
      '.stops .lv .pin .mark,.stops .lv .pin .hardmark{display:none}',
      '.stops .lv.done .pin{background:#fff6d8;border-color:#f0c14b}',
      '.stops .lv.here .pin{width:22px;height:22px;background:#fff;border-color:#f0c14b;box-shadow:0 0 0 6px rgba(255,180,0,.35)}',
      '.stops .lv .meta,.stops .st{opacity:0;max-height:0;overflow:hidden;pointer-events:none}',
      '.sr-medal{position:absolute;z-index:3;left:50%;top:50%;transform:translate(-50%,-58%);display:flex;flex-direction:column;align-items:center;pointer-events:none}',
      '.sr-medal i{width:42px;height:42px;border-radius:50%;background:#fff;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:22px;box-shadow:0 3px 0 rgba(180,90,120,.12),0 6px 12px rgba(90,140,170,.18)}',
      '.sr-medal b{margin-top:3px;padding:2px 7px;border-radius:9px;background:rgba(255,255,255,.94);color:#3d4a62;font:800 10px/1.15 ui-rounded,system-ui,sans-serif;white-space:nowrap;box-shadow:0 1px 0 rgba(255,255,255,.8)}',
      '.stops .lv.here .sr-medal i{box-shadow:0 0 0 4px rgba(255,180,0,.4),0 4px 10px rgba(90,140,170,.2)}',
      '.sr-country-card{position:absolute;left:50%;top:58px;transform:translateX(-50%);z-index:9;width:min(92%,340px);padding:10px 14px 12px;border-radius:22px;background:rgba(255,255,255,.97);box-shadow:0 6px 16px rgba(90,140,170,.18);pointer-events:none;text-align:center}',
      '.sr-country-card[hidden]{display:none}',
      'body:not(.onmap) .sr-country-card{display:none}',
      '.sr-country-card .sr-cname{display:block;font:900 22px/1.1 ui-rounded,system-ui,sans-serif;color:#f25d8a;margin:0 0 8px}',
      '.sr-country-card .sr-bits{display:flex;justify-content:space-between;gap:6px}',
      '.sr-country-card .sr-bit{flex:1 1 0;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0}',
      '.sr-country-card .sr-bit i{font-style:normal;font-size:16px;line-height:1}',
      '.sr-country-card .sr-bit span{font:700 10px/1.15 ui-rounded,system-ui,sans-serif;color:#5c6b82;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
      '#sr-path-wide{stroke:#f48fb1;stroke-width:10}',
      '#sr-path-dash{stroke:#fff;stroke-width:2.4;opacity:.9}',
      '#sr-future{stroke:#ff6fa8;stroke-width:7;stroke-dasharray:3 8;opacity:.96}',
      '.sr-zoom{position:absolute;inset:0;z-index:12;display:none;background:linear-gradient(180deg,#8eecf6,#7ee0ee 40%,#b7f3e4);overflow:hidden}',
      '.sr-zoom.on{display:block}',
      '.sr-zoom svg{position:absolute;inset:0;width:100%;height:100%}',
      '.sr-zoom .sr-ride{position:absolute;left:8%;top:68%;animation:srRide 2.6s ease-in-out forwards}',
      '@keyframes srRide{from{transform:translate(0,0)}to{transform:translate(62vw,-34vh)}}',
      '.sr-zoom .sr-fly{position:absolute;left:10%;top:46%;animation:srFly 2.6s ease-in-out forwards}',
      '@keyframes srFly{from{transform:translate(0,10px) rotate(-8deg)}to{transform:translate(70vw,-26vh) rotate(6deg)}}',
      '.sr-zoom-label{position:absolute;left:50%;top:64px;transform:translateX(-50%);padding:8px 14px;border-radius:16px;background:rgba(255,255,255,.96);color:#d6246e;font:900 16px/1.2 ui-rounded,system-ui,sans-serif;box-shadow:0 4px 12px rgba(90,140,170,.18);white-space:nowrap}',
      '.sr-nav{position:absolute;left:50%;bottom:72px;transform:translateX(-50%);z-index:20;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:24px;background:#fff;border:2px solid #ff8ab8;box-shadow:0 4px 0 #f4a0c4}',
      'body:not(.onmap) .sr-nav{display:none}',
      '.sr-nav button{width:48px;height:48px;border:0;border-radius:50%;background:#ff4f88;color:#fff;font:900 26px/1 ui-rounded,system-ui,sans-serif;box-shadow:0 3px 0 #d6246e}',
      '.sr-nav button:disabled{opacity:.35}',
      '.sr-nav span{min-width:120px;text-align:center;font:900 14px/1.1 ui-rounded,system-ui,sans-serif;color:#d6246e}',
      /* 1.9.282 player + badges stay a fixed size on screen when zoomed */
      '#racers .racer.me .face{width:30px;height:30px;font-size:16px;border-width:2.5px}',
      '#racers .racer .nm{opacity:.92}',
      '.stops .lv .sr-medal{transform-origin:0 0;scale:calc(1 / var(--sr-k, 1))}',
      '.stops .lv.here .sr-medal{display:none}',
      /* glowing red star pin on the current stop */
      '.stops .lv.here .pin,.stops .lv.here:not(.locked) .pin{background:transparent;border-color:transparent;box-shadow:none;animation:none}',
      '.sr-star{position:absolute;left:50%;top:50%;z-index:6;width:34px;height:44px;margin-left:-17px;margin-top:-43px;transform-origin:50% 98%;scale:calc(1 / var(--sr-k, 1));pointer-events:none;filter:drop-shadow(0 0 6px rgba(255,70,90,.75)) drop-shadow(0 3px 2px rgba(120,10,30,.25));animation:srStarGlow 2.2s ease-in-out infinite}',
      '.sr-star svg{display:block}',
      '.sr-star::after{content:"";position:absolute;left:50%;bottom:-5px;width:26px;height:10px;margin-left:-13px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,90,110,.55),rgba(255,90,110,0));z-index:-1}',
      '@keyframes srStarGlow{0%,100%{filter:drop-shadow(0 0 5px rgba(255,70,90,.6)) drop-shadow(0 3px 2px rgba(120,10,30,.25))}50%{filter:drop-shadow(0 0 13px rgba(255,90,110,.95)) drop-shadow(0 3px 2px rgba(120,10,30,.25))}}',
      '@media (prefers-reduced-motion:reduce){.sr-star{animation:none}}',
      /* three unique things card */
      '.sr-place-card{position:fixed;left:10px;right:10px;top:var(--sr-pc-top,140px);transform:none;z-index:40;width:auto;max-width:430px;margin:0 auto;max-height:calc(100% - var(--sr-pc-top,140px) - 160px);overflow-y:auto;overflow-x:hidden;box-sizing:border-box;padding:16px 18px 14px;border-radius:24px;background:#fff;box-shadow:0 10px 28px rgba(60,110,140,.25),0 2px 0 rgba(255,255,255,.9) inset;text-align:left;font-family:ui-rounded,system-ui,sans-serif}',
      '.sr-place-card[hidden]{display:none}',
      'body:not(.onmap) .sr-place-card{display:none}',
      '.sr-pc-x{position:absolute;right:10px;top:8px;width:32px;height:32px;border:0;border-radius:50%;background:#f1f6f8;color:#6b7f90;font:700 20px/1 ui-rounded,system-ui,sans-serif;cursor:pointer}',
      '.sr-pc-name{overflow-wrap:anywhere;margin:0 34px 0 0;color:#159a9c;font:900 21px/1.1 ui-rounded,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase}',
      '.sr-pc-country{margin:3px 0 0;color:#7c8ea0;font:700 12px/1.2 ui-rounded,system-ui,sans-serif}',
      '.sr-pc-rule{border:0;border-top:1.5px solid #e3edf0;margin:10px 0 9px}',
      '.sr-pc-head{margin:0 0 8px;color:#f2706a;font:900 12px/1.2 ui-rounded,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase}',
      '.sr-pc-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}',
      '.sr-pc-list li span{min-width:0;overflow-wrap:anywhere}','.sr-pc-list li{display:flex;align-items:center;gap:10px;color:#3d4a62;font:700 14px/1.25 ui-rounded,system-ui,sans-serif}',
      '.sr-pc-list i{flex:0 0 34px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:18px;box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 2px 4px rgba(90,140,170,.15)}',
      '.sr-pc-play{display:block;width:100%;margin-top:12px;padding:11px 12px;border:0;border-radius:16px;background:#ff4f88;color:#fff;font:900 15px/1.2 ui-rounded,system-ui,sans-serif;box-shadow:0 3px 0 #d6246e;cursor:pointer}',
      '.sr-pc-lock{margin:12px 0 0;padding:9px 12px;border-radius:14px;background:#fdf1f5;color:#b45a7f;font:800 13px/1.2 ui-rounded,system-ui,sans-serif;text-align:center}',
      '.stops .lv.locked{cursor:pointer}',
      /* 1.9.282 map art v2 */
      '.mapview{background:#4fcfe6}',
      '.nzsvg.sr-v2 .sr-ripples{display:none}',
      '.mapstage:not(.travel-shot) .nzsvg.sr-v2 #sr-future,.mapstage:not(.travel-shot) .nzsvg.sr-v2 #sr-future-border,.mapstage:not(.travel-shot) .nzsvg.sr-v2 #sr-path-wide,.mapstage:not(.travel-shot) .nzsvg.sr-v2 #sr-path-dash{display:none}',
      '.mapstage.travel-shot #sr-v2-route{display:none}',
      '.stops .lv .pin{width:13px;height:13px;border:2.5px solid #fff;background:#fff6e4;box-shadow:0 0 0 1.5px #e9bf98,0 2px 3px rgba(150,80,60,.22);scale:calc(1 / var(--sr-k, 1))}',
      '.stops .lv.done .pin{background:#fff1cf;box-shadow:0 0 0 1.5px #f0a7c0,0 2px 3px rgba(150,80,60,.22)}',
      '.stops .lv.locked .pin{background:#fff8ee;border-color:#fff;box-shadow:0 0 0 1.5px #eed6c4,0 2px 3px rgba(150,80,60,.16)}',
      '.stops .lv .pin::before{content:"";position:absolute;inset:-14px;border-radius:50%}',
      '.sr-medal{transform:translate(-50%,calc(-100% - 16px))}',
      '.sr-medal i{width:54px;height:54px;flex-direction:column;gap:1px;border:0;background:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.9),0 4px 0 rgba(200,120,150,.16),0 8px 14px rgba(40,110,140,.22)}',
      '.sr-medal i u{text-decoration:none;font-size:19px;line-height:1}',
      '.sr-medal i b{margin:0;padding:0 3px;background:none;box-shadow:none;color:#2f4a5c;font:800 8px/1.05 ui-rounded,system-ui,sans-serif;white-space:normal;text-align:center;max-width:50px}',
      '.sr-country-card{padding:10px 12px 12px;border-radius:24px;box-shadow:0 6px 0 rgba(255,255,255,.6) inset,0 8px 18px rgba(40,110,140,.22)}',
      '.sr-country-card .sr-cname{font-size:26px;color:#ee5f8f}',
      '.sr-country-card .sr-bit{flex-direction:row;justify-content:center;gap:4px}',
      '.sr-country-card .sr-bit+.sr-bit{border-left:1.5px solid #f0e2ea}',
      '.sr-country-card .sr-bit i{font-size:17px}',
      '.sr-country-card .sr-bit span{display:inline-block;font-size:10.5px;color:#3d4a62;white-space:normal;line-height:1.1;text-align:left}','.sr-country-card .sr-bit span::first-letter{text-transform:uppercase}',
      '.sr-v2-clouds{position:absolute;inset:0;z-index:8;pointer-events:none;overflow:hidden}',
      'body:not(.onmap) .sr-v2-clouds{display:none}',
      '.sr-v2-cloud{position:absolute;display:block;width:190px;animation:srV2Cloud 28s ease-in-out infinite alternate}',
      '.sr-v2-cloud svg{display:block;width:100%;height:auto}',
      '.sr-v2-cloud.c-tl{left:-70px;top:150px;width:170px;animation-duration:31s}',
      '.sr-v2-cloud.c-tr{right:-80px;top:240px;width:210px;animation-duration:26s}',
      '.sr-v2-cloud.c-ml{left:-90px;bottom:190px;width:220px;animation-duration:34s}',
      '.sr-v2-cloud.c-br{right:-60px;bottom:150px;width:180px;animation-duration:29s}',
      '@keyframes srV2Cloud{from{transform:translateX(0)}to{transform:translateX(18px)}}',
      '@media (prefers-reduced-motion:reduce){.sr-v2-cloud{animation:none}}',
      /* 1.9.283 world map: every country at true size on one projection, mini badges you can tap */
      '.sr-world-btn{position:absolute;right:12px;bottom:152px;z-index:21;padding:9px 13px;border:2px solid #ff8ab8;border-radius:18px;background:#fff;color:#d6246e;font:900 13px/1 ui-rounded,system-ui,sans-serif;box-shadow:0 3px 0 #f4a0c4;cursor:pointer}',
      'body:not(.onmap) .sr-world-btn{display:none}',
      '.mapstage.sr-world-view .stops .lv .pin{opacity:0}',
      '.mapstage.sr-world-view .sr-medal{transform:translate(calc(-50% + var(--dx, 0px)),calc(-50% + var(--dy, 0px)));pointer-events:auto;cursor:pointer}',
      '.mapstage.sr-world-view .stops .lv.here .sr-medal{display:flex}',
      '.mapstage.sr-world-view .sr-medal i{width:28px;height:28px;box-shadow:0 0 0 2px #fff,0 3px 6px rgba(40,110,140,.28)}',
      '.mapstage.sr-world-view .sr-medal i u{font-size:15px}',
      '.mapstage.sr-world-view .sr-medal i b{display:none}',
      '.mapstage.sr-world-view .stops .lv.here .sr-medal i{box-shadow:0 0 0 2.5px #ff4f88,0 3px 6px rgba(40,110,140,.28)}',
      '.stops .lv .gotbadge{scale:calc(1 / var(--sr-k, 1))}',
      '.mapstage.sr-world-view .stops .lv .gotbadge{display:none}',
      /* 1.9.284 find my level: numbered stops, a labelled star, a level chip with Play, Find me */
      '.mapstage .stops.path{margin:0}', /* the old grid .path margin pushed every pin ~90px off the route when zoomed */
      '.stops .lv .pin{width:20px;height:20px}',
      '.stops .lv .pin .no{font:900 10px/1 ui-rounded,system-ui,sans-serif;color:#c2477a;letter-spacing:-.02em}',
      '.stops .lv.locked .pin .no{color:#a8948a}',
      '.stops .lv.here .pin .no{opacity:0}',
      '.stops .lv.here{z-index:30}',
      '.sr-star-label{position:absolute;left:50%;bottom:100%;transform:translateX(-50%);margin-bottom:4px;white-space:nowrap;padding:5px 10px;border-radius:13px;background:#ff3d6e;color:#fff;font:900 12px/1 ui-rounded,system-ui,sans-serif;box-shadow:0 2px 0 #c41d4f,0 4px 10px rgba(120,10,40,.25);pointer-events:none}',
      '.stops .lv.here.sr-pulse .sr-star{animation:srFindMe .5s ease-in-out 3}',
      '@keyframes srFindMe{0%,100%{transform:scale(1)}50%{transform:scale(1.35)}}',
      '.racer.me .nm{background:#ff3d6e;color:#fff}',
      '.sr-level-chip{position:absolute;left:10px;right:10px;top:var(--sr-lc-top,140px);z-index:20;max-width:430px;margin:0 auto;display:flex;align-items:center;gap:8px;box-sizing:border-box;padding:6px 6px 6px 12px;border-radius:22px;background:#fff;box-shadow:0 3px 0 #f4a0c4,0 6px 14px rgba(40,110,140,.2);font-family:ui-rounded,system-ui,sans-serif}',
      '.sr-level-chip[hidden],body:not(.onmap) .sr-level-chip,#map.sr-placing .sr-level-chip{display:none}',
      '.sr-lc-where{flex:1 1 auto;min-width:0;display:flex;align-items:baseline;gap:5px;border:0;background:none;padding:4px 0;color:#3d4a62;font:800 14px/1.2 ui-rounded,system-ui,sans-serif;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden}',
      '.sr-lc-where b{color:#e0306c;font-weight:900;flex:none}',
      '.sr-lc-where span{overflow:hidden;text-overflow:ellipsis}',
      '.sr-lc-play{flex:none;border:0;border-radius:17px;padding:11px 18px;background:#ff4f88;color:#fff;font:900 16px/1 ui-rounded,system-ui,sans-serif;box-shadow:0 3px 0 #d6246e;cursor:pointer}',
      '.sr-findme-btn{position:absolute;left:12px;bottom:152px;z-index:21;padding:9px 13px;border:2px solid #ff8ab8;border-radius:18px;background:#fff;color:#d6246e;font:900 13px/1 ui-rounded,system-ui,sans-serif;box-shadow:0 3px 0 #f4a0c4;cursor:pointer}',
      'body:not(.onmap) .sr-findme-btn{display:none}'
    ].join('');
    document.head.appendChild(css);
  }

  function decorate() {
    var seen = {};
    var pins = document.querySelectorAll('.stops .lv[data-country]');
    pins.forEach(function (pin) {
      var country = pin.dataset.country || '';
      var key = country.toLowerCase();
      var prefer = pin.classList.contains('country-stop');
      if (seen[key] && !prefer) return;
      if (seen[key] && prefer) {
        var old = document.querySelector('.sr-medal[data-country="' + country.replace(/"/g, '') + '"]');
        if (old && old.parentNode !== pin) old.remove();
      }
      seen[key] = true;
      if (pin.querySelector('.sr-medal')) return;
      var pair = info(country);
      var medal = document.createElement('span');
      medal.className = 'sr-medal';
      medal.dataset.country = country;
      medal.innerHTML = '<i aria-hidden="true"><u>' + pair[0] + '</u><b>' + (SHORT[key] || country) + '</b></i>';
      pin.appendChild(medal);
    });
  }

  var picked = '';
  var lastHere = '';

  function countryList() {
    var seen = {};
    var list = [];
    var pins = Array.prototype.slice.call(document.querySelectorAll('.stops .lv[data-country]'));
    pins.sort(function (a, b) { return (+a.dataset.n) - (+b.dataset.n); });
    pins.forEach(function (pin) {
      var c = pin.dataset.country;
      if (!c || seen[c]) return;
      seen[c] = true;
      list.push(c);
    });
    return list;
  }

  function currentCountry() {
    var here = document.querySelector('.stops .lv.here');
    return (here && here.dataset.country) || '';
  }

  function ensurePicked() {
    var list = countryList();
    if (!list.length) return '';
    var here = currentCountry();
    if (here && here !== lastHere) {
      lastHere = here;
      picked = here;
      var stage = document.getElementById('mapstage');
      if (stage) stage.dataset.framed = '';
    }
    if (picked === WORLD) return WORLD;
    if (!picked || list.indexOf(picked) < 0) picked = here || list[0];
    return picked;
  }

  var WORLD = '__world';
  function frameCountry(country) {
    var stage = document.getElementById('mapstage');
    var view = document.getElementById('mapview');
    if (!stage || !view || !country) return;
    if (stage.classList.contains('travel-shot')) return;
    var world = country === WORLD;
    stage.classList.toggle('sr-world-view', world);
    var all = document.querySelectorAll('.stops .lv, .stops .future-stop');
    var pins = [];
    all.forEach(function (pin) {
      var on = world ? pin.classList.contains('lv') : pin.dataset.country === country;
      pin.style.visibility = on ? '' : 'hidden';
      if (on && pin.classList.contains('lv')) pins.push(pin);
    });
    if (!pins.length) return;
    // 1.9.284 the game's showMap scrolls #mapview to the stop; the overlay frames with a transform, so keep the view unscrolled
    if (view.scrollLeft || view.scrollTop) { view.scrollLeft = 0; view.scrollTop = 0; }
    var key = country + ':' + pins.length;
    if (stage.dataset.framed === key) return;
    stage.dataset.framed = key;
    var sw = stage.clientWidth, sh = stage.clientHeight, vw = view.clientWidth, vh = view.clientHeight;
    if (!sw || !sh || !vw || !vh) return;
    var svg = stage.querySelector('svg.nzsvg');
    var perUnit = svg && svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? sw / svg.viewBox.baseVal.width : 1;
    var top = 175, bottom = 200; // title card (and the level chip) above; Find me / World and the country buttons below
    var chipEl = document.getElementById('sr-level-chip');
    if (chipEl && !chipEl.hidden && chipEl.offsetHeight) top = Math.max(top, chipEl.offsetTop + chipEl.offsetHeight + 14);
    var herePin = document.querySelector('.stops .lv.here');
    var scale, cx, cy;
    if (world) {
      scale = Math.min(vw / sw, (vh - top - bottom) / sh) * 0.98;
      cx = sw / 2; cy = sh / 2;
    } else {
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pins.forEach(function (p) {
        var x = parseFloat(p.style.left) / 100 * sw;
        var y = parseFloat(p.style.top) / 100 * sh;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
      // One world projection: frame the country's stops with a margin, but never closer than ~300 km across,
      // so a one-stop island still shows its neighbourhood at the same scale as everything else.
      var pad = 16 * perUnit, minBox = 130 * perUnit;
      var bw = Math.max(minBox, maxX - minX + pad * 2);
      var bh = Math.max(minBox, maxY - minY + pad * 2);
      cx = (minX + maxX) / 2;
      cy = (minY + maxY) / 2;
      scale = Math.min(vw / bw, (vh - top - bottom) / bh);
      // 1.9.284 at most 7x: keeps the neighbours in view and keeps phones from running out of map tiles
      scale = Math.max(0.3, Math.min(scale, 7));
      if (herePin && herePin.dataset.country === country) {
        cx = parseFloat(herePin.style.left) / 100 * sw;
        cy = parseFloat(herePin.style.top) / 100 * sh;
      }
    }
    var tx = vw / 2 - cx * scale;
    var ty = (top + (vh - bottom - top) / 2) - cy * scale;
    view.style.overflow = 'hidden';
    stage.style.transformOrigin = '0 0';
    stage.style.transition = 'transform .35s ease';
    stage.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + scale.toFixed(3) + ')';
  }

  function stepCountry(dir) {
    var list = countryList();
    if (!list.length) return;
    if (ensurePicked() === WORLD) { picked = currentCountry() || list[0]; var st0 = document.getElementById('mapstage'); if (st0) st0.dataset.framed = ''; frameCountry(picked); showCard(); syncNav(); return; }
    var i = list.indexOf(ensurePicked());
    if (i < 0) i = 0;
    var next = i + dir;
    if (next < 0 || next >= list.length) return;
    picked = list[next];
    var stage = document.getElementById('mapstage');
    if (stage) stage.dataset.framed = '';
    frameCountry(picked);
    showCard();
    syncNav();
  }

  function findMe() {
    hidePlace();
    picked = currentCountry() || countryList()[0] || '';
    var stage = document.getElementById('mapstage');
    if (stage) stage.dataset.framed = '';
    frameCountry(picked);
    showCard();
    syncNav();
    var here = document.querySelector('.stops .lv.here');
    if (here) {
      here.classList.remove('sr-pulse');
      void here.offsetWidth;
      here.classList.add('sr-pulse');
      setTimeout(function () { here.classList.remove('sr-pulse'); }, 1700);
    }
  }

  function hereInfo() {
    var here = document.querySelector('.stops .lv.here');
    if (!here) return null;
    var b = here.querySelector('.meta b');
    return { n: +here.dataset.n, place: b ? b.textContent : '', country: here.dataset.country || '', open: !here.classList.contains('locked') };
  }

  function syncLevelChip() {
    var map = document.getElementById('map');
    if (!map) return;
    var chip = document.getElementById('sr-level-chip');
    if (!chip) {
      chip = document.createElement('div');
      chip.id = 'sr-level-chip';
      chip.className = 'sr-level-chip';
      chip.innerHTML = '<button type="button" class="sr-lc-where" aria-label="Find my level"></button><button type="button" class="sr-lc-play">▶ Play</button>';
      chip.querySelector('.sr-lc-where').addEventListener('click', findMe);
      chip.querySelector('.sr-lc-play').addEventListener('click', function () {
        var h = hereInfo(), ui = window.SugarRush && window.SugarRush.ui;
        if (!h || !ui || !ui.openLevel) return;
        try { if (ui.unlockAudio) ui.unlockAudio(); } catch (e) {}
        ui.openLevel(h.n);
      });
      map.appendChild(chip);
    }
    var h = hereInfo();
    chip.hidden = !h;
    if (!h) return;
    var card = document.getElementById('sr-country-card');
    var top = card && !card.hidden && card.offsetHeight ? card.offsetTop + card.offsetHeight + 8 : 140;
    var tv = top + 'px';
    if (chip.style.getPropertyValue('--sr-lc-top') !== tv) chip.style.setProperty('--sr-lc-top', tv);
    var html = '<b>Level ' + h.n + '</b><span>· ' + esc(h.place) + '</span>';
    var where = chip.querySelector('.sr-lc-where');
    if (where.dataset.key !== html) { where.dataset.key = html; where.innerHTML = html; }
    chip.querySelector('.sr-lc-play').setAttribute('aria-label', 'Play level ' + h.n + ', ' + h.place);
    var fb = document.getElementById('sr-findme-btn');
    if (!fb) {
      fb = document.createElement('button');
      fb.type = 'button';
      fb.id = 'sr-findme-btn';
      fb.className = 'sr-findme-btn';
      fb.textContent = '◎ Find me';
      fb.setAttribute('aria-label', 'Find me: show my level on the map');
      fb.addEventListener('click', findMe);
      map.appendChild(fb);
    }
  }

  var wasOnMap = false;
  function openOnMyLevel() {
    var on = document.body.classList.contains('onmap');
    if (on && !wasOnMap && currentCountry()) {
      picked = currentCountry();
      lastHere = picked;
      var stage = document.getElementById('mapstage');
      if (stage) stage.dataset.framed = '';
    }
    wasOnMap = on;
  }

  function gotoCountry(c) {
    picked = c;
    var stage = document.getElementById('mapstage');
    if (stage) stage.dataset.framed = '';
    frameCountry(picked);
    showCard();
    syncNav();
  }

  function syncNav() {
    var map = document.getElementById('map');
    if (!map) return;
    var nav = document.getElementById('sr-nav');
    if (!nav) {
      nav = document.createElement('div');
      nav.id = 'sr-nav';
      nav.className = 'sr-nav';
      nav.innerHTML = '<button type="button" id="sr-prev" aria-label="Previous country">‹</button><span></span><button type="button" id="sr-next" aria-label="Next country">›</button>';
      nav.querySelector('#sr-prev').addEventListener('click', function () { stepCountry(-1); });
      nav.querySelector('#sr-next').addEventListener('click', function () { stepCountry(1); });
      map.appendChild(nav);
    }
    var wb = document.getElementById('sr-world-btn');
    if (!wb) {
      wb = document.createElement('button');
      wb.type = 'button';
      wb.id = 'sr-world-btn';
      wb.className = 'sr-world-btn';
      wb.addEventListener('click', function () { gotoCountry(ensurePicked() === WORLD ? (currentCountry() || countryList()[0]) : WORLD); });
      map.appendChild(wb);
    }
    var inWorld = ensurePicked() === WORLD;
    var wbText = inWorld ? '← Back to ' + (currentCountry() || 'my stop') : '🌏 World map';
    if (wb.textContent !== wbText) wb.textContent = wbText;
    wb.setAttribute('aria-pressed', inWorld ? 'true' : 'false');
    wb.style.display = document.body.classList.contains('onmap') ? '' : 'none';
    var list = countryList();
    var country = ensurePicked();
    var i = list.indexOf(country);
    nav.querySelector('#sr-prev').disabled = !inWorld && i <= 0;
    nav.querySelector('#sr-next').disabled = !inWorld && (i < 0 || i >= list.length - 1);
    if (nav.dataset.country !== country) {
      nav.dataset.country = country;
      nav.querySelector('span').innerHTML = (inWorld ? 'World map' : (country || 'Country')) + '<small style="display:block;font-size:10px;color:#7a4a62">1.9.286</small>';
    }
    nav.style.display = document.body.classList.contains('onmap') ? '' : 'none';
  }

  function showCard() {
    var map = document.getElementById('map');
    if (!map) return;
    var card = document.getElementById('sr-country-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'sr-country-card';
      card.className = 'sr-country-card';
      card.hidden = true;
      card.innerHTML = '<b class="sr-cname"></b><div class="sr-bits"></div>';
      map.appendChild(card);
    }
    var country = ensurePicked();
    if (!country || !document.body.classList.contains('onmap')) {
      card.hidden = true;
      return;
    }
    if (card.dataset.country === country) {
      card.hidden = false;
      return;
    }
    var pair = country === WORLD
      ? ['🌏', [['🗺️', countryList().length + ' countries'], ['📍', document.querySelectorAll('.stops .lv').length + ' stops'], ['⭐', document.querySelectorAll('.stops .lv.done').length + ' cleared']]]
      : info(country);
    card.dataset.country = country;
    card.querySelector('.sr-cname').textContent = country === WORLD ? 'World tour' : country;
    card.querySelector('.sr-bits').innerHTML = pair[1].map(function (bit) {
      return '<div class="sr-bit"><i aria-hidden="true">' + bit[0] + '</i><span>' + bit[1] + '</span></div>';
    }).join('');
    card.hidden = false;
  }

  function svgNode(markup) {
    var doc = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + markup + '</svg>', 'image/svg+xml');
    return doc.documentElement.firstElementChild;
  }

  function carBits() {
    return '<rect class="sr-car-bit" x="-14" y="-6" width="28" height="13" rx="4" fill="#e23b4a" stroke="#fff" stroke-width="1.4"/>' +
      '<rect class="sr-car-bit" x="-8" y="-11" width="16" height="7" rx="2.5" fill="#7ec8ff" stroke="#fff" stroke-width="1"/>' +
      '<circle class="sr-car-bit" cx="-7" cy="7" r="3.2" fill="#243044"/>' +
      '<circle class="sr-car-bit" cx="8" cy="7" r="3.2" fill="#243044"/>';
  }

  function rememberPlane(plane) {
    if (plane.dataset.planePath) return;
    var path = plane.querySelector('path');
    if (path) plane.dataset.planePath = path.outerHTML;
  }

  function setMode(plane, car) {
    rememberPlane(plane);
    var bits = plane.querySelectorAll('.sr-car-bit');
    var path = plane.querySelector('path');
    if (car) {
      if (path) path.setAttribute('display', 'none');
      if (!bits.length) {
        var wrapped = svgNode('<g>' + carBits() + '</g>');
        while (wrapped && wrapped.firstChild) plane.appendChild(wrapped.firstChild);
      } else {
        bits.forEach(function (bit) { bit.removeAttribute('display'); });
      }
      plane.dataset.mode = 'car';
    } else {
      plane.querySelectorAll('.sr-car-bit').forEach(function (bit) { bit.remove(); });
      if (path) path.removeAttribute('display');
      else if (plane.dataset.planePath) plane.insertAdjacentHTML('beforeend', plane.dataset.planePath);
      plane.dataset.mode = 'plane';
    }
  }

  function sameCountryTrip() {
    var here = document.querySelector('.stops .lv.here');
    if (!here) return false;
    var n = parseInt(here.dataset.n, 10);
    if (!n || n < 2) return false;
    var prev = document.querySelector('.stops .lv[data-n="' + (n - 1) + '"]');
    if (!prev) return false;
    var a = (here.dataset.country || '').trim().toLowerCase();
    var b = (prev.dataset.country || '').trim().toLowerCase();
    return !!(a && b && a === b);
  }

  function syncTravel() {
    var plane = document.getElementById('sr-travel-plane');
    if (!plane) return;
    var shown = plane.getAttribute('display') !== 'none';
    if (!shown) {
      if (plane.dataset.mode === 'car') setMode(plane, false);
      return;
    }
    setMode(plane, sameCountryTrip());
  }

  function zoomScene(car) {
    var ride = car
      ? '<g class="sr-ride"><rect x="0" y="0" width="54" height="26" rx="8" fill="#e23b4a" stroke="#fff" stroke-width="2"/><rect x="10" y="-10" width="28" height="14" rx="5" fill="#7ec8ff" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="26" r="7" fill="#243044"/><circle cx="42" cy="26" r="7" fill="#243044"/></g>'
      : '<g class="sr-fly"><path d="M28 4 L34 16 L52 22 L52 26 L34 24 L32 36 L40 40 L40 44 L28 40 L16 44 L16 40 L24 36 L22 24 L4 26 L4 22 L22 16 Z" fill="#fff" stroke="#2878c8" stroke-width="2"/><ellipse cx="28" cy="24" rx="8" ry="4" fill="#7ec8ff"/></g>';
    return '<svg viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs><linearGradient id="srzsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8eecf6"/><stop offset="1" stop-color="#b7f3e4"/></linearGradient></defs>' +
      '<rect width="360" height="640" fill="url(#srzsea)"/>' +
      '<path d="M0 210 C 80 190 140 230 220 200 C 280 180 320 210 360 190 L360 640 L0 640 Z" fill="#d7f4ea" opacity=".7"/>' +
      '<path d="M-10 250 C 70 220 120 280 190 250 C 250 226 300 270 370 240 L370 640 L-10 640 Z" fill="#cfead8" stroke="#fff" stroke-width="8"/>' +
      '<path d="M-10 430 C 40 390 90 450 150 410 C 210 372 250 430 310 400 C 340 388 370 410 380 400" fill="none" stroke="#f48fb1" stroke-width="16" stroke-linecap="round"/>' +
      '<path d="M-10 430 C 40 390 90 450 150 410 C 210 372 250 430 310 400 C 340 388 370 410 380 400" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="8 10" opacity=".8"/>' +
      '<circle cx="300" cy="392" r="16" fill="#fff" stroke="#f0c14b" stroke-width="4"/>' +
      '<circle cx="300" cy="392" r="28" fill="none" stroke="#ffe08a" stroke-width="6" opacity=".7"/>' +
      '<ellipse cx="70" cy="90" rx="34" ry="16" fill="#fff" opacity=".85"/>' +
      '<ellipse cx="250" cy="70" rx="40" ry="18" fill="#fff" opacity=".8"/>' +
      ride +
      '</svg>';
  }

  function syncZoom() {
    var map = document.getElementById('map');
    var stage = document.getElementById('mapstage');
    if (!map || !stage) return;
    var panel = document.getElementById('sr-zoom');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'sr-zoom';
      panel.className = 'sr-zoom';
      map.appendChild(panel);
    }
    var traveling = stage.classList.contains('travel-shot');
    if (!traveling) {
      panel.classList.remove('on');
      panel.dataset.mode = '';
      return;
    }
    var car = sameCountryTrip();
    var mode = car ? 'car' : 'plane';
    if (panel.dataset.mode === mode && panel.classList.contains('on')) return;
    panel.dataset.mode = mode;
    panel.innerHTML = zoomScene(car) +
      '<div class="sr-zoom-label">' + (car ? 'Driving' : 'Flying') + ' · ' +
      ((document.querySelector('.stops .lv.here') || {}).dataset || {}).country + '</div>';
    panel.classList.add('on');
  }

  var busy = false;
  function tick() {
    if (busy) return;
    busy = true;
    try { obs.disconnect(); } catch (e) {}
    try {
      injectStyle();
      decorate();
      openOnMyLevel();
      showCard();
      syncLevelChip();
      var stage = document.getElementById('mapstage');
      if (stage && stage.classList.contains('travel-shot')) {
        stage.dataset.wasTravel = '1';
      } else {
        if (stage && stage.dataset.wasTravel === '1') {
          stage.dataset.wasTravel = '';
          stage.dataset.framed = '';
        }
        frameCountry(ensurePicked());
      }
      paintMap();
      syncRoute(ensurePicked());
      syncClouds();
      showCard();
      syncNav();
      fitMarkers();
      if (placeOpen && !document.body.classList.contains('onmap')) hidePlace();
    } finally {
      busy = false;
      var root = document.getElementById('map');
      if (root) obs.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
  }

  document.addEventListener('click', function (e) {
    var stage = document.getElementById('mapstage');
    if (!stage || !stage.classList.contains('sr-world-view')) return;
    var lv = e.target && e.target.closest ? e.target.closest('.stops .lv') : null;
    if (!lv || !lv.dataset.country) return;
    e.preventDefault();
    e.stopPropagation();
    gotoCountry(lv.dataset.country);
  }, true);
  window.SugarRushMap = { gotoCountry: function (c) { gotoCountry(c || WORLD); }, findMe: findMe, WORLD: WORLD, showPlace: showPlace, hidePlace: hidePlace, placeFacts: placeFacts, PLACES: PLACES };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && placeOpen) hidePlace(); });

  var obs = new MutationObserver(function () { tick(); });
  function arm() {
    var root = document.getElementById('map') || document.body;
    if (!root) return;
    obs.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    tick();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm);
  else arm();
  setInterval(tick, 1500);
})();
