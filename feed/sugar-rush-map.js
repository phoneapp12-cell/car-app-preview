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

  function info(country) {
    var key = String(country || '').trim().toLowerCase();
    return COUNTRIES[key] || ['📍', [['📍', 'a new stop'], ['🗺️', 'on the trail'], ['🍬', 'sweet shop']]];
  }

  /* 1.9.281 Three unique things for every real place on the trail.
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
    card.hidden = false;
    map.classList.add('sr-placing');
  }

  function stageScale(stage) {
    var m = /scale\(([\d.]+)\)/.exec(stage.style.transform || '');
    var k = m ? parseFloat(m[1]) : 1;
    return k > 0 ? k : 1;
  }

  /* Keep the player and country badges a fixed size on screen when a small
     country is zoomed in, and slide the player beside the stop so the land
     and the star pin stay visible. */
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
      /* 1.9.281 player + badges stay a fixed size on screen when zoomed */
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
      '.sr-place-card{position:absolute;left:50%;top:58px;transform:translateX(-50%);z-index:22;width:min(90%,340px);box-sizing:border-box;padding:16px 18px 14px;border-radius:24px;background:#fff;box-shadow:0 10px 28px rgba(60,110,140,.25),0 2px 0 rgba(255,255,255,.9) inset;text-align:left;font-family:ui-rounded,system-ui,sans-serif}',
      '.sr-place-card[hidden]{display:none}',
      'body:not(.onmap) .sr-place-card{display:none}',
      '#map.sr-placing .sr-country-card{display:none}',
      '.sr-pc-x{position:absolute;right:10px;top:8px;width:32px;height:32px;border:0;border-radius:50%;background:#f1f6f8;color:#6b7f90;font:700 20px/1 ui-rounded,system-ui,sans-serif;cursor:pointer}',
      '.sr-pc-name{margin:0 34px 0 0;color:#159a9c;font:900 21px/1.1 ui-rounded,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase}',
      '.sr-pc-country{margin:3px 0 0;color:#7c8ea0;font:700 12px/1.2 ui-rounded,system-ui,sans-serif}',
      '.sr-pc-rule{border:0;border-top:1.5px solid #e3edf0;margin:10px 0 9px}',
      '.sr-pc-head{margin:0 0 8px;color:#f2706a;font:900 12px/1.2 ui-rounded,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase}',
      '.sr-pc-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}',
      '.sr-pc-list li{display:flex;align-items:center;gap:10px;color:#3d4a62;font:700 14px/1.25 ui-rounded,system-ui,sans-serif}',
      '.sr-pc-list i{flex:0 0 34px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:18px;box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 2px 4px rgba(90,140,170,.15)}',
      '.sr-pc-play{display:block;width:100%;margin-top:12px;padding:11px 12px;border:0;border-radius:16px;background:#ff4f88;color:#fff;font:900 15px/1.2 ui-rounded,system-ui,sans-serif;box-shadow:0 3px 0 #d6246e;cursor:pointer}',
      '.sr-pc-lock{margin:12px 0 0;padding:9px 12px;border-radius:14px;background:#fdf1f5;color:#b45a7f;font:800 13px/1.2 ui-rounded,system-ui,sans-serif;text-align:center}',
      '.stops .lv.locked{cursor:pointer}'
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
      medal.innerHTML = '<i aria-hidden="true">' + pair[0] + '</i><b>' + country + '</b>';
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
    if (!picked || list.indexOf(picked) < 0) picked = here || list[0];
    return picked;
  }

  function frameCountry(country) {
    var stage = document.getElementById('mapstage');
    var view = document.getElementById('mapview');
    if (!stage || !view || !country) return;
    if (stage.classList.contains('travel-shot')) return;
    var all = document.querySelectorAll('.stops .lv, .stops .future-stop');
    var pins = [];
    all.forEach(function (pin) {
      var on = pin.dataset.country === country;
      pin.style.visibility = on ? '' : 'hidden';
      if (on && pin.classList.contains('lv')) pins.push(pin);
    });
    if (!pins.length) return;
    var key = country + ':' + pins.length;
    if (stage.dataset.framed === key) return;
    stage.dataset.framed = key;
    var sw = stage.clientWidth, sh = stage.clientHeight, vw = view.clientWidth, vh = view.clientHeight;
    if (!sw || !sh || !vw || !vh) return;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pins.forEach(function (p) {
      var x = parseFloat(p.style.left) / 100 * sw;
      var y = parseFloat(p.style.top) / 100 * sh;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
    var pad = 90;
    var bw = Math.max(140, maxX - minX + pad * 2);
    var bh = Math.max(180, maxY - minY + pad * 2);
    var cx = (minX + maxX) / 2;
    var cy = (minY + maxY) / 2;
    var scale = Math.min(vw / bw, (vh - 120) / bh, 2.2);
    if (scale < 0.9) scale = 0.9;
    var tx = vw / 2 - cx * scale;
    var ty = (vh / 2 + 10) - cy * scale;
    view.style.overflow = 'hidden';
    stage.style.transformOrigin = '0 0';
    stage.style.transition = 'transform .35s ease';
    stage.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scale(' + scale.toFixed(3) + ')';
  }

  function stepCountry(dir) {
    var list = countryList();
    if (!list.length) return;
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
    var list = countryList();
    var country = ensurePicked();
    var i = list.indexOf(country);
    nav.querySelector('#sr-prev').disabled = i <= 0;
    nav.querySelector('#sr-next').disabled = i < 0 || i >= list.length - 1;
    if (nav.dataset.country !== country) {
      nav.dataset.country = country;
      nav.querySelector('span').innerHTML = (country || 'Country') + '<small style="display:block;font-size:10px;color:#7a4a62">1.9.281</small>';
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
    var pair = info(country);
    card.dataset.country = country;
    card.querySelector('.sr-cname').textContent = country;
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

  window.SugarRushMap = { showPlace: showPlace, hidePlace: hidePlace, placeFacts: placeFacts, PLACES: PLACES };
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
