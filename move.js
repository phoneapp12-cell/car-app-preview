/* 2.27.46: My App's move from phoneapp12-cell.github.io/car-app-preview to its own address.
   Old address: shows the "My App has moved" banner, packs everything on this phone (IndexedDB + local settings),
   encrypts it with a fresh random key and hands the ciphertext to the relay for up to 2 hours, then opens the new
   address with the key in the #fragment (never sent to any server). Once the new copy confirms, the old copy stops
   its notifications and offline worker. New address: unpacks the parcel before the app starts. */
(function () {
  'use strict';
  var NEW = 'https://shane-my-app.pages.dev', OLD_HOST = 'phoneapp12-cell.github.io';
  var RELAY = 'https://due-dates-calendar-relay.phoneapp12.workers.dev';
  var CHUNK = 4 * 1024 * 1024;
  var isOld = location.hostname === OLD_HOST, isNew = location.origin === NEW;
  var ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
  var SKIP_LS = /^(moveStarted|movedTo|movedClean|movedBannerHidden|moveJustDone|mergeDone|mergeHide|mergeAt|oldPushEp|shopPushReg|shopPushEp)$/;

  // mail sign-in started on the new address returns to the old one (the address Google/Microsoft know); pass it on
  if (isOld) {
    try {
      var q = new URLSearchParams(location.search), st = q.get('state') || '';
      if ((q.get('code') || q.get('error')) && /^mv/.test(st)) { window.__MOVING = true; location.replace(NEW + '/' + location.search); return; }
    } catch (e) { }
  }
  window.MOVE_STATE_PREFIX = isNew ? 'mv' : '';

  /* ---------- helpers ---------- */
  var b64u = function (u8) { var s = '', i; for (i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  var unb64u = function (s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  var pipe = async function (u8, stream) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer()); };
  var post = async function (path, body, opts) {
    opts = opts || {}; var h = { 'Content-Type': opts.text ? 'text/plain' : 'application/json' }; var k = ls('cfKey'); if (k && opts.key) h['X-Cash-Key'] = k;
    var r = await fetch(RELAY + path, { method: 'POST', headers: h, body: opts.text ? body : JSON.stringify(body || {}), cache: 'no-store' });
    var j = null; try { j = await r.json(); } catch (e) { }
    if (!r.ok) { var err = new Error((j && j.error) || ('http_' + r.status)); err.status = r.status; throw err; }
    return j || {};
  };
  async function ser(v) {
    if (v instanceof Blob) { var u = new Uint8Array(await v.arrayBuffer()); return { __mv: 'blob', type: v.type, name: v.name || '', d: b64u(u) }; }
    if (v instanceof ArrayBuffer) return { __mv: 'ab', d: b64u(new Uint8Array(v)) };
    if (ArrayBuffer.isView(v)) return { __mv: 'u8', d: b64u(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) };
    if (v instanceof Date) return { __mv: 'date', d: v.toISOString() };
    if (Array.isArray(v)) { var a = []; for (var i = 0; i < v.length; i++) a.push(await ser(v[i])); return a; }
    if (v && typeof v === 'object') { var o = {}; for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) o[k] = await ser(v[k]); return o; }
    return v;
  }
  function des(v) {
    if (Array.isArray(v)) return v.map(des);
    if (v && typeof v === 'object') {
      if (v.__mv === 'blob') { var b = new Blob([unb64u(v.d)], { type: v.type }); if (v.name) { try { return new File([b], v.name, { type: v.type }); } catch (e) { } } return b; }
      if (v.__mv === 'ab') return unb64u(v.d).buffer;
      if (v.__mv === 'u8') return unb64u(v.d);
      if (v.__mv === 'date') return new Date(v.d);
      var o = {}; for (var k in v) o[k] = des(v[k]); return o;
    }
    return v;
  }
  var req = function (r) { return new Promise(function (ok, no) { r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); }; }); };

  /* ---------- pack (old address) ---------- */
  async function packAll() {
    var out = { v: 1, at: new Date().toISOString(), ls: {}, idb: [] };
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (!SKIP_LS.test(k)) out.ls[k] = localStorage.getItem(k); }
    var names = (await indexedDB.databases()).map(function (d) { return d.name; }).filter(Boolean);
    for (var n = 0; n < names.length; n++) {
      var db = await req(indexedDB.open(names[n])); var D = { name: db.name, version: db.version, stores: [] };
      for (var s = 0; s < db.objectStoreNames.length; s++) {
        var sn = db.objectStoreNames[s], st = db.transaction(sn).objectStore(sn);
        var S = { name: sn, keyPath: st.keyPath, autoIncrement: st.autoIncrement, indexes: [], rows: [] };
        for (var x = 0; x < st.indexNames.length; x++) { var ix = st.index(st.indexNames[x]); S.indexes.push({ name: ix.name, keyPath: ix.keyPath, unique: ix.unique, multiEntry: ix.multiEntry }); }
        var keys = await req(st.getAllKeys()), vals = await req(db.transaction(sn).objectStore(sn).getAll());
        for (var r = 0; r < keys.length; r++) S.rows.push([keys[r], await ser(vals[r])]);
        D.stores.push(S);
      }
      db.close(); out.idb.push(D);
    }
    return out;
  }
  async function startMove() {
    var btn = document.getElementById('mvgo'), msg = document.getElementById('mvmsg');
    var say = function (t, bad) { if (msg) { msg.textContent = t; msg.style.color = bad ? '#b91c1c' : ''; } };
    if (!ls('cfKey')) { say('This phone hasn’t got My App’s device key, so it can’t hand over safely. Ask Grok Bot to help with the move.', true); return; }
    if (btn) btn.disabled = true;
    try {
      say('Packing your data…');
      var url = await packAndSend('move', say);
      ls('moveStarted', String(Date.now()));
      var w = window.open(url, '_blank', 'noopener');
      say('Ready. The new My App is opening in Chrome. If it didn’t open, tap “Open new My App”.');
      var link = document.getElementById('mvopen'); if (link) { link.href = url; link.style.display = ''; }
      if (!w) { /* popup blocked: the link above does it */ }
    } catch (e) {
      say(e && e.status === 401 ? 'The relay didn’t recognise this phone’s device key. Nothing was moved.' : 'That didn’t work (' + (e && e.message || 'error') + '). Nothing was lost; try again.', true);
    } finally { if (btn) btn.disabled = false; }
  }
  // 2.27.49: pack everything on this phone, encrypt it with a fresh key and hand the ciphertext to the relay; returns the new address link
  async function packAndSend(kind, say) {
    say = say || function () { };
    {
      var plain = new TextEncoder().encode(JSON.stringify(await packAll()));
      var zip = await pipe(plain, new CompressionStream('gzip'));
      var raw = crypto.getRandomValues(new Uint8Array(32)), iv = crypto.getRandomValues(new Uint8Array(12));
      var key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
      var ct = b64u(iv) + '.' + b64u(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, zip)));
      var parts = []; for (var i = 0; i < ct.length; i += CHUNK) parts.push(ct.slice(i, i + CHUNK));
      say('Sending it securely…');
      var id = (await post('/move/start', { chunks: parts.length }, { key: true })).id;
      for (var p = 0; p < parts.length; p++) { await post('/move/put?id=' + encodeURIComponent(id) + '&i=' + p, parts[p], { key: true, text: true }); say('Sending it securely… ' + Math.round((p + 1) / parts.length * 100) + '%'); }
      return NEW + '/#' + kind + '=' + id + '.' + b64u(raw);
    }
  }
  // after the new copy confirms: stop this old copy's pushes and offline worker; keep its data as a fallback
  var within = function (p, ms) { return Promise.race([p, new Promise(function (ok) { setTimeout(ok, ms); })]); };
  async function retireOld() {
    try {
      var regs = (navigator.serviceWorker ? await within(navigator.serviceWorker.getRegistrations(), 5000) : []) || [];
      for (var i = 0; i < regs.length; i++) {
        try {
          var sub = regs[i].pushManager && await within(regs[i].pushManager.getSubscription(), 5000);
          if (sub) {
            try { await post('/push/unsubscribe', { endpoint: sub.endpoint }); } catch (e) { }
            try { if (ls('sharedKey')) await post('/shared-push/unsubscribe', { key: ls('sharedKey'), who: 'shane', endpoint: sub.endpoint }); } catch (e) { }
            await within(sub.unsubscribe(), 5000);
          }
        } catch (e) { }
        try { await within(regs[i].unregister(), 5000); } catch (e) { }
      }
    } catch (e) { }
  }
  function banner(done) {
    var el = document.getElementById('mvban'); if (el) el.remove();
    el = document.createElement('div'); el.id = 'mvban'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'My App has moved');
    el.style.cssText = 'position:fixed;left:8px;right:8px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:9999;background:#0F766E;color:#fff;border-radius:14px;padding:14px 14px 12px;box-shadow:0 6px 24px rgba(0,0,0,.25);font:15px/1.4 system-ui,sans-serif;max-height:70vh;overflow:auto';
    el.innerHTML = done
      ? '<b style="font-size:16px">All moved \u2713</b><p style="margin:6px 0">Your data is in the new My App. This old copy no longer sends notifications. You can remove its home-screen icon (press and hold it, then Remove or Uninstall).</p>'
        + '<a href="' + NEW + '/" target="_blank" rel="noopener" style="display:inline-block;background:#fff;color:#0F766E;border-radius:10px;padding:9px 14px;font-weight:600;text-decoration:none">Open new My App</a> '
        + '<button type="button" id="mvhide" style="background:transparent;color:#fff;border:1px solid #fff;border-radius:10px;padding:8px 12px;margin-left:6px">Hide</button>'
      : '<b style="font-size:16px">My App has moved</b><p style="margin:6px 0 4px">It now has its own address, which keeps your information more private. Moving takes a minute:</p>'
        + '<ol style="margin:4px 0 8px;padding-left:20px"><li>Tap <b>Move my data</b> and keep this screen open until it says Ready.</li>'
        + '<li>The new My App opens in Chrome with everything in it. Tap <b>Install</b> (or \u22ee then <b>Add to Home screen</b>).</li>'
        + '<li>Open the new My App from its icon and tap <b>Turn on notifications</b>, then Allow.</li>'
        + '<li>Open this old icon once more. It confirms the move and switches itself off. Then remove the old icon.</li></ol>'
        + '<button type="button" id="mvgo" style="background:#fff;color:#0F766E;border:0;border-radius:10px;padding:10px 16px;font-weight:700">Move my data</button> '
        + '<a id="mvopen" target="_blank" rel="noopener" style="display:none;color:#fff;font-weight:600;margin-left:8px">Open new My App</a>'
        + '<p id="mvmsg" aria-live="polite" style="margin:8px 0 0;font-size:14px"></p>';
    document.body.appendChild(el);
    var go = document.getElementById('mvgo'); if (go) go.onclick = startMove;
    var hide = document.getElementById('mvhide'); if (hide) hide.onclick = function () { el.remove(); ls('movedBannerHidden', '1'); };
  }
  async function bringFromOld() {
    if (!ls('cfKey')) { overlay('This old copy hasn’t got My App’s device key, so it can’t send anything.', true, 'Bring missing items across'); return; }
    try { overlay('Packing your items…', false, 'Bring missing items across'); var url = await packAndSend('merge', function (t) { overlay(t, false, 'Bring missing items across'); }); location.replace(url); }
    catch (e) { overlay('That didn’t work (' + (e && e.message || 'error') + '). Nothing was changed. Try again from the new My App.', true, 'Bring missing items across'); }
  }
  async function oldAddress() {
    if (!/^\/car-app-preview\/?(index\.html)?$/.test(location.pathname)) return;
    var moved = 0; try { moved = (await post('/move/status', {})).moved || 0; } catch (e) { }
    if (moved && ls('moveStarted')) { var first = !ls('movedTo'); ls('movedTo', NEW); if (!ls('movedBannerHidden')) banner(true); if (first || !ls('movedClean')) retireOld().then(function () { ls('movedClean', '1'); }); return; }
    banner(false);
  }

  /* ---------- unpack (new address) ---------- */
  async function unpackAll(data) {
    var keys = Object.keys(data.ls || {});
    for (var i = 0; i < keys.length; i++) if (!SKIP_LS.test(keys[i])) ls(keys[i], data.ls[keys[i]]);
    if (data.ls && data.ls.shopPushEp) ls('oldPushEp', data.ls.shopPushEp); // the old copy's push address, dropped once this copy has its own
    for (var d = 0; d < (data.idb || []).length; d++) {
      var D = data.idb[d];
      await new Promise(function (ok) { var r = indexedDB.deleteDatabase(D.name); r.onsuccess = r.onerror = function () { ok(); }; r.onblocked = function () { setTimeout(ok, 1500); }; });
      var open = indexedDB.open(D.name, D.version);
      open.onupgradeneeded = function () {
        var db = open.result;
        D.stores.forEach(function (S) {
          if (db.objectStoreNames.contains(S.name)) return;
          var o = {}; if (S.keyPath !== null && S.keyPath !== undefined) o.keyPath = S.keyPath; if (S.autoIncrement) o.autoIncrement = true;
          var st = db.createObjectStore(S.name, o);
          (S.indexes || []).forEach(function (ix) { try { st.createIndex(ix.name, ix.keyPath, { unique: ix.unique, multiEntry: ix.multiEntry }); } catch (e) { } });
        });
      };
      var db = await withinMs(req(open), 15000, 'storage busy'); // 2.27.49: never hang on a busy store
      for (var s = 0; s < D.stores.length; s++) {
        var S = D.stores[s]; if (!db.objectStoreNames.contains(S.name)) continue;
        await new Promise(function (ok, no) {
          var tx = db.transaction(S.name, 'readwrite'), st = tx.objectStore(S.name); st.clear();
          S.rows.forEach(function (row) { var v = des(row[1]); if (st.keyPath !== null && st.keyPath !== undefined) st.put(v); else st.put(v, row[0]); });
          tx.oncomplete = function () { ok(); }; tx.onerror = function () { no(tx.error); };
        });
      }
      db.close();
    }
  }
  var withinMs = function (p, ms, what) { return Promise.race([p, new Promise(function (ok, no) { setTimeout(function () { no(new Error(what || 'timeout')); }, ms); })]); };
  var idOf = function (x) { return x && typeof x === 'object' && (x.id != null ? 'i:' + x.id : null); };
  // add old records whose id this copy hasn't got; for other values only fill gaps
  function mergeData(cur, old) {
    var added = {};
    if (!cur || typeof cur !== 'object') return { d: old, added: { all: 1 } };
    Object.keys(old || {}).forEach(function (k) {
      var a = cur[k], b = old[k];
      if (a === undefined || a === null) { cur[k] = b; if (Array.isArray(b) && b.length) added[k] = b.length; return; }
      if (Array.isArray(a) && Array.isArray(b)) {
        var have = new Set(a.map(idOf).filter(Boolean)), n = 0;
        b.forEach(function (x) { var i = idOf(x); if (i && !have.has(i)) { a.push(x); have.add(i); n++; } });
        if (n) added[k] = n;
      } else if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && k !== 'settings') {
        Object.keys(b).forEach(function (kk) { if (a[kk] === undefined) a[kk] = b[kk]; });
      }
    });
    return { d: cur, added: added };
  }
  async function mergeAll(data) {
    var keys = Object.keys(data.ls || {}), summary = {};
    for (var i = 0; i < keys.length; i++) if (!SKIP_LS.test(keys[i]) && ls(keys[i]) === null) ls(keys[i], data.ls[keys[i]]);
    var have = (await indexedDB.databases()).map(function (d) { return d.name; });
    for (var d = 0; d < (data.idb || []).length; d++) {
      var D = data.idb[d], exists = have.indexOf(D.name) >= 0;
      var open = exists ? indexedDB.open(D.name) : indexedDB.open(D.name, D.version);
      if (!exists) open.onupgradeneeded = (function (D, open) { return function () { var db = open.result; D.stores.forEach(function (S) { var o = {}; if (S.keyPath !== null && S.keyPath !== undefined) o.keyPath = S.keyPath; if (S.autoIncrement) o.autoIncrement = true; var st = db.createObjectStore(S.name, o); (S.indexes || []).forEach(function (ix) { try { st.createIndex(ix.name, ix.keyPath, { unique: ix.unique, multiEntry: ix.multiEntry }); } catch (e) { } }); }); }; })(D, open);
      var db = await withinMs(req(open), 15000, 'storage busy');
      for (var s = 0; s < D.stores.length; s++) {
        var S0 = D.stores[s]; if (!db.objectStoreNames.contains(S0.name)) continue;
        var curKeys = await req(db.transaction(S0.name).objectStore(S0.name).getAllKeys());
        var curSet = new Set(curKeys.map(function (k) { return JSON.stringify(k); }));
        var mainData = D.name === 'due-dates' && S0.name === 'kv';
        var cur = mainData ? await req(db.transaction(S0.name).objectStore(S0.name).get('data')) : null;
        await new Promise(function (ok, no) {
          var tx = db.transaction(S0.name, 'readwrite'), st = tx.objectStore(S0.name);
          S0.rows.forEach(function (row) {
            if (mainData && row[0] === 'data') { var m = mergeData(cur, des(row[1])); Object.keys(m.added).forEach(function (k) { summary[k] = (summary[k] || 0) + m.added[k]; }); if (Object.keys(m.added).length) { m.d.updatedAt = new Date().toISOString(); st.put(m.d, 'data'); } return; }
            if (curSet.has(JSON.stringify(row[0]))) return; // this copy already has it: keep the newer one here
            var v = des(row[1]); if (st.keyPath !== null && st.keyPath !== undefined) st.put(v); else st.put(v, row[0]); summary[D.name] = (summary[D.name] || 0) + 1;
          });
          tx.oncomplete = function () { ok(); }; tx.onerror = function () { no(tx.error); };
        });
      }
      db.close();
    }
    return summary;
  }
  async function newAddressMerge(id, rawKey) {
    var T = 'Bring missing items across';
    try {
      overlay('Fetching your items…', false, T);
      var meta = await post('/move/get?id=' + encodeURIComponent(id), {}), parts = [];
      for (var i = 0; i < meta.n; i++) parts.push((await post('/move/get?id=' + encodeURIComponent(id) + '&i=' + i, {})).c);
      var ct = parts.join(''), dot = ct.indexOf('.');
      var key = await crypto.subtle.importKey('raw', unb64u(rawKey), 'AES-GCM', false, ['decrypt']);
      var zip = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(ct.slice(0, dot)) }, key, unb64u(ct.slice(dot + 1))));
      var data = JSON.parse(new TextDecoder().decode(await pipe(zip, new DecompressionStream('gzip'))));
      overlay('Adding what’s missing…', false, T);
      var sum = await mergeAll(data);
      try { await post('/move/done', { id: id }, { key: true }); } catch (e) { }
      ls('mergeDone', String(Date.now())); ls('mergeAt', String(Date.now())); // the open My App window reloads with the merged data
      try { history.replaceState(null, '', location.pathname); } catch (e) { }
      var names = { birthdays: 'birthdays', bills: 'bills', todos: 'to-dos', appts: 'appointments', pets: 'pets', notes: 'notes', ideas: 'ideas', loans: 'loans', countdowns: 'countdowns', myEvents: 'events', health: 'health items', 'claim-photos': 'claim photos', 'strip-photos': 'photos' };
      var bits = Object.keys(sum).filter(function (k) { return names[k]; }).map(function (k) { return sum[k] + ' ' + names[k]; });
      overlay((bits.length ? 'Added ' + bits.join(', ') + '.' : 'Nothing was missing.') + ' Nothing already in the new My App was changed. You can close this tab and go back to My App.', false, T);
      setTimeout(function () { location.replace(NEW + '/'); }, 6000);
    } catch (e) {
      overlay(e && e.status === 404 ? 'That link has already been used or has run out. Tap Bring missing items across again.' : 'That didn’t finish (' + (e && e.message || 'error') + '). Nothing was lost. Try again.', true, T);
    }
  }
  function mergeBanner() {
    try { if (typeof S === 'undefined' || !S || !Array.isArray(S.birthdays)) return; } catch (e) { return; }
    if (S.birthdays.length || ls('mergeDone') || ls('mergeHide') || !ls('cfKey') || document.getElementById('mgban')) return;
    var el = document.createElement('div'); el.id = 'mgban';
    el.style.cssText = 'position:fixed;left:8px;right:8px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:9999;background:#0F766E;color:#fff;border-radius:14px;padding:14px;box-shadow:0 6px 24px rgba(0,0,0,.25);font:15px/1.4 system-ui,sans-serif';
    el.innerHTML = '<b style="font-size:16px">Some items didn’t come across</b><p style="margin:6px 0">Your birthdays (and anything else missing) are still in the old My App. One tap brings across only what’s missing. Nothing here is replaced.</p>'
      + '<button type="button" id="mggo" style="background:#fff;color:#0F766E;border:0;border-radius:10px;padding:9px 14px;font-weight:700">Bring missing items across</button> '
      + '<button type="button" id="mghide" style="background:transparent;color:#fff;border:1px solid #fff;border-radius:10px;padding:8px 12px;margin-left:4px">Not now</button>';
    document.body.appendChild(el);
    document.getElementById('mggo').onclick = function () { window.open('https://' + OLD_HOST + '/car-app-preview/#bring', '_blank'); el.remove(); };
    document.getElementById('mghide').onclick = function () { el.remove(); ls('mergeHide', '1'); };
  }
  function overlay(text, bad, title) {
    var el = document.getElementById('mvover');
    if (!el) { el = document.createElement('div'); el.id = 'mvover'; el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#F4F6F5;color:#111;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font:17px/1.5 system-ui,sans-serif'; document.body.appendChild(el); }
    el.innerHTML = '<div><div style="font-size:20px;font-weight:700;margin-bottom:8px">' + (title || 'My App is moving in') + '</div><p id="mvtxt"></p></div>';
    var t = document.getElementById('mvtxt'); t.textContent = text; t.style.color = bad ? '#b91c1c' : '';
  }
  async function newAddressMove(id, rawKey) {
    try {
      overlay('Bringing your data across…');
      var meta = await post('/move/get?id=' + encodeURIComponent(id), {});
      var parts = [];
      for (var i = 0; i < meta.n; i++) { parts.push((await post('/move/get?id=' + encodeURIComponent(id) + '&i=' + i, {})).c); overlay('Bringing your data across… ' + Math.round((i + 1) / meta.n * 100) + '%'); }
      var ct = parts.join(''), dot = ct.indexOf('.');
      var key = await crypto.subtle.importKey('raw', unb64u(rawKey), 'AES-GCM', false, ['decrypt']);
      var zip = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(ct.slice(0, dot)) }, key, unb64u(ct.slice(dot + 1))));
      var data = JSON.parse(new TextDecoder().decode(await pipe(zip, new DecompressionStream('gzip'))));
      overlay('Saving it on this phone…');
      await unpackAll(data);
      try { await post('/move/done', { id: id }, { key: true }); } catch (e) { }
      ls('moveJustDone', '1');
      location.replace(NEW + '/');
    } catch (e) {
      overlay(e && e.status === 404 ? 'This move link has already been used or has expired. Go back to the old My App and tap Move my data again.' : 'The move didn’t finish (' + (e && e.message || 'error') + '). Nothing was lost. Go back to the old My App and tap Move my data again.', true);
    }
  }
  function newAddressWelcome() {
    var el = document.createElement('div'); el.id = 'mvban';
    el.style.cssText = 'position:fixed;left:8px;right:8px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:9999;background:#0F766E;color:#fff;border-radius:14px;padding:14px;box-shadow:0 6px 24px rgba(0,0,0,.25);font:15px/1.4 system-ui,sans-serif';
    el.innerHTML = '<b style="font-size:16px">Welcome to the new My App</b><p style="margin:6px 0">Everything came across. Next: tap <b>Install</b> (or \u22ee then <b>Add to Home screen</b>). Then open it from the new icon and turn on notifications.</p>'
      + '<button type="button" id="mvinst" style="background:#fff;color:#0F766E;border:0;border-radius:10px;padding:9px 14px;font-weight:700">Install</button> '
      + '<button type="button" id="mvpush" style="background:#fff;color:#0F766E;border:0;border-radius:10px;padding:9px 14px;font-weight:700;margin-left:4px">Turn on notifications</button> '
      + '<button type="button" id="mvhide" style="background:transparent;color:#fff;border:1px solid #fff;border-radius:10px;padding:8px 12px;margin-left:4px">Done</button>';
    document.body.appendChild(el);
    document.getElementById('mvinst').onclick = function () { try { installApp(); } catch (e) { } };
    document.getElementById('mvpush').onclick = async function () { try { await enableReminderPush(); try { localStorage.removeItem('shopPushReg'); scheduleReminders(); } catch (e) { } } catch (e) { } };
    document.getElementById('mvhide').onclick = function () { el.remove(); ls('moveJustDone', null); };
  }

  if (isNew && /^#merge=/.test(location.hash)) {
    window.__MOVING = true;
    var mm = location.hash.slice(7).split('.');
    var run2 = function () { newAddressMerge(mm[0], mm[1] || ''); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run2); else run2();
    return;
  }
  if (isOld && location.hash === '#bring') {
    window.__MOVING = true;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bringFromOld); else bringFromOld();
    return;
  }
  if (isNew) window.addEventListener('storage', function (e) { if (e.key === 'mergeAt' && e.newValue) location.reload(); });
  if (isNew && /^#move=/.test(location.hash)) {
    window.__MOVING = true;
    var m = location.hash.slice(6).split('.');
    var run = function () { newAddressMove(m[0], m[1] || ''); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
    return;
  }
  var later = function (fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(fn, 800); }); else setTimeout(fn, 800); };
  if (isOld) later(oldAddress);
  if (isNew && ls('moveJustDone')) later(newAddressWelcome);
  if (isNew) { later(function () { setTimeout(mergeBanner, 3000); }); }
  // 2.27.47: once the new copy can get notifications, stop the old copy's push address on the relay
  async function dropOldPush() {
    var ep = ls('oldPushEp'); if (!ep || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try { var reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); var sub = reg && reg.pushManager && await reg.pushManager.getSubscription(); if (!sub || sub.endpoint === ep) return; } catch (e) { return; }
    try { await post('/push/unsubscribe', { endpoint: ep }); } catch (e) { }
    try { if (ls('sharedKey')) await post('/shared-push/unsubscribe', { key: ls('sharedKey'), who: 'shane', endpoint: ep }); } catch (e) { }
    ls('oldPushEp', null);
  }
  if (isNew) { later(dropOldPush); setInterval(dropOldPush, 60000); }
})();
