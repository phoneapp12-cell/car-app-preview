/* Device sync rules shared by the page (classic script) and the Node tests.
   The worker stores only ciphertext. Merge decisions happen here, on the device.
   Whole-blob last write: records have no updatedAt of their own. S.updatedAt is the stamp.
   A device that still has only the built-in starter records never replaces a device that has real records. */
(function (root) {
  var ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function normSyncCode(raw) {
    var s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return /^[A-HJ-NP-Z2-9]{16}$/.test(s) ? s : '';
  }
  function formatSyncCode(raw) {
    var s = normSyncCode(raw);
    if (!s) return '';
    return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12) + '-' + s.slice(12, 16);
  }
  function newSyncCode() {
    var bytes = crypto.getRandomValues(new Uint8Array(16));
    var s = '';
    for (var i = 0; i < 16; i++) s += ALPHABET[bytes[i] % 32];
    return s;
  }
  function syncStamp(iso) {
    var t = Date.parse(iso || '');
    return isFinite(t) ? t : 0;
  }
  var SEED_CARS = [
    { id: 'car-mul27', name: "Shane's car", plate: 'MUL27', year: '2014', model: 'Honda Fit', colour: 'Silver', details: 'Hatch · petrol hybrid', hex: '#9AA3A8', wof: '2027-09-25', rego: '2026-12-25' },
    { id: 'car-pnu312', name: "Sarah's car", plate: 'PNU312', year: '2022', model: 'Haval H6 Ultra Hybrid', colour: 'Blue', details: 'SUV · petrol hybrid', hex: '#2F5DA8', wof: '2026-10-16', rego: '2026-11-09' },
    { id: 'car-kbz234', name: "Cass's car", plate: 'KBZ234', year: '2007', model: 'Honda Fit', colour: 'Blue', details: 'Hatch · petrol', hex: '#3C7DD9', wof: '2026-11-24', rego: '2026-11-15' }
  ];
  function carsAreSeed(cars) {
    if (!Array.isArray(cars) || cars.length !== 3) return false;
    return SEED_CARS.every(function (s) {
      var c = cars.find(function (x) { return x && x.id === s.id; });
      if (!c) return false;
      var same = ['name', 'plate', 'year', 'model', 'colour', 'details', 'hex', 'wof', 'rego'].every(function (k) { return String(c[k] || '') === s[k]; });
      return same && !c.photo && !String(c.notes || '').trim() && !String(c.odo || '').trim() && !String(c.svcDate || '').trim() && !String(c.svcKm || '').trim() && !(c.services && c.services.length) && (c.wofMonths == null || c.wofMonths === 12) && !c.lastService;
    });
  }
  function driversAreSeed(list) {
    if (!Array.isArray(list) || list.length !== 3) return false;
    var want = [['drv-shane', 'Shane'], ['drv-sarah', 'Sarah'], ['drv-cass', 'Cass']];
    return want.every(function (pair) {
      var d = list.find(function (x) { return x && x.id === pair[0]; });
      if (!d || d.name !== pair[1]) return false;
      return ['aaNo', 'aaType', 'aaExpiry', 'licNo', 'licClass', 'licExpiry', 'notes'].every(function (k) { return !String(d[k] || '').trim(); });
    });
  }
  function mealsAreSeed(m) {
    if (!m || typeof m !== 'object') return true;
    if (m.plan && typeof m.plan === 'object' && Object.keys(m.plan).some(function (k) { return m.plan[k] && String(m.plan[k].title || '').trim(); })) return false;
    var nights = Array.isArray(m.nights) ? m.nights.map(Number).filter(function (n) { return n === n; }).sort().join(',') : '5,6';
    if (nights && nights !== '5,6') return false;
    if (!Array.isArray(m.ideas)) return true;
    return !m.ideas.some(function (i) {
      if (!i || !i.id) return false;
      if (!i.builtin) return true;
      if (i.hidden || i.fav || i.photo) return true;
      return false;
    });
  }
  function listsAreSeed(lists) {
    if (!Array.isArray(lists)) return true;
    return lists.length === 3 && lists[0] === 'Home' && lists[1] === 'Cars' && lists[2] === 'Shopping';
  }
  /* True when this copy has personal records, not just the starter cars, drivers and meal ideas. */
  function hasPersonal(d) {
    if (!d || typeof d !== 'object') return false;
    var keys = ['bills', 'todos', 'appts', 'birthdays', 'ideas', 'feeds', 'pets', 'health', 'myEvents', 'loans', 'reminders', 'countdowns'];
    if (keys.some(function (k) { return Array.isArray(d[k]) && d[k].length; })) return true;
    if (d.commission && (d.commission.anchor || (Array.isArray(d.commission.entries) && d.commission.entries.length))) return true;
    if (d.shop && Array.isArray(d.shop.items) && d.shop.items.length) return true;
    if (d.garden && ((Array.isArray(d.garden.off) && d.garden.off.length) || (d.garden.done && typeof d.garden.done === 'object' && Object.keys(d.garden.done).length))) return true;
    if (!listsAreSeed(d.lists)) return true;
    if (Array.isArray(d.ideaCats) && d.ideaCats.join('|') !== 'Gifts|Home|Trips|Other') return true;
    if (!carsAreSeed(d.cars)) return true;
    if (!driversAreSeed(d.drivers)) return true;
    if (!mealsAreSeed(d.meals)) return true;
    return false;
  }
  /* remote is null when the cloud copy is empty, or { data, local } after decrypt.
     'push' uploads this device. 'pull' replaces this device with the cloud copy. 'same' does nothing.
     Last write of the whole blob when both sides have personal records (newer updatedAt). */
  function decideSync(local, remote) {
    if (!remote) return 'push';
    var rd = remote.data && typeof remote.data === 'object' ? remote.data : remote;
    var lp = hasPersonal(local), rp = hasPersonal(rd);
    if (lp && !rp) return 'push';
    if (!lp && rp) return 'pull';
    var lt = syncStamp(local && local.updatedAt), rt = syncStamp(rd && rd.updatedAt);
    if (rt > lt) return 'pull';
    if (lt > rt) return 'push';
    return 'same';
  }
  function b64enc(buf) {
    var u = new Uint8Array(buf), s = '';
    for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  }
  function b64dec(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  var keyCache = { code: '', key: null };
  function deriveSyncKey(code) {
    var n = normSyncCode(code);
    if (!n) return Promise.reject(new Error('bad_code'));
    if (keyCache.code === n && keyCache.key) return Promise.resolve(keyCache.key);
    return crypto.subtle.importKey('raw', new TextEncoder().encode(n), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: new TextEncoder().encode('due-dates-sync-v1'), iterations: 100000, hash: 'SHA-256' },
        base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
      );
    }).then(function (key) { keyCache = { code: n, key: key }; return key; });
  }
  function encryptSync(code, obj) {
    var json = JSON.stringify(obj);
    if (json.length > 1400000) return Promise.reject(new Error('too_big'));
    return deriveSyncKey(code).then(function (key) {
      var iv = crypto.getRandomValues(new Uint8Array(12));
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(json)).then(function (ct) {
        return { iv: b64enc(iv), ct: b64enc(ct) };
      });
    });
  }
  function decryptSync(code, iv, ct) {
    return deriveSyncKey(code).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64dec(iv) }, key, b64dec(ct));
    }).then(function (plain) { return JSON.parse(new TextDecoder().decode(plain)); });
  }
  root.SyncLogic = {
    normSyncCode: normSyncCode, formatSyncCode: formatSyncCode, newSyncCode: newSyncCode, syncStamp: syncStamp,
    hasPersonal: hasPersonal, decideSync: decideSync, encryptSync: encryptSync, decryptSync: decryptSync,
    carsAreSeed: carsAreSeed
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
