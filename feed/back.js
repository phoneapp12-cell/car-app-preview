/* 1.9.119 Come-back notes. Opt in only. At most one every two days, and never
   between 9pm and 8am New Zealand time.
   While the page is closed, a phone can still show one if Periodic Background
   Sync runs, or if the feed worker's Web Push cron is configured. Neither is
   guaranteed: iOS is strict, and a closed PWA has no normal timer. The .ics
   file on a calendar entry is the reliable reminder. */
(function (root) {
  const TWO = 2 * 86400000;
  function nzHour(ms) {
    const p = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hourCycle: 'h23', hour: '2-digit' }).formatToParts(new Date(ms));
    return Number((p.find(x => x.type === 'hour') || {}).value || 0);
  }
  function quiet(ms) { const h = nzHour(ms); return h >= 21 || h < 8; }
  function shouldPing(lastOpen, lastNote, now) {
    if (!lastOpen || now - lastOpen < TWO) return false;
    if (lastNote && now - lastNote < TWO) return false;
    if (quiet(now)) return false;
    return true;
  }
  root.ibCome = { nzHour, quiet, shouldPing, TWO };

  if (!root.document || typeof ls === 'undefined') return;

  function mirror() {
    const body = JSON.stringify({ on: !!ls.get('comeBack', 0), lastOpen: ls.get('comeOpen', 0) || 0, lastNote: ls.get('comeNote', 0) || 0 });
    if (!root.caches) return;
    root.caches.open('ib-comeback').then(c => c.put('/feed/__comeback', new Response(body))).catch(() => {});
  }
  async function show(body) {
    let ban = root.document.getElementById('comeback');
    if (!ban) { ban = root.document.createElement('button'); ban.id = 'comeback'; ban.type = 'button'; root.document.body.append(ban); }
    ban.hidden = false; ban.textContent = body; ban.onclick = () => { ban.hidden = true; };
    if (root.Notification && Notification.permission === 'granted' && root.navigator.serviceWorker) {
      try { const reg = await navigator.serviceWorker.ready; await reg.showNotification('Info Book', { body, tag: 'comeback', icon: 'icons/icon-192.png' }); } catch (e) {}
    }
  }
  async function periodic() {
    if (!root.navigator.serviceWorker || !('permissions' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.periodicSync) return;
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (status.state !== 'granted') return;
      await reg.periodicSync.register('ib-comeback', { minInterval: TWO });
    } catch (e) {}
  }
  function b64url(bytes) {
    let s = ''; bytes = new Uint8Array(bytes); for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function keyBytes(key) {
    const s = String(key).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(s + '==='.slice((s.length + 3) % 4));
    const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
  }
  async function subscribe() {
    if (!root.navigator.serviceWorker || !root.PushManager) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const res = await fetch('https://shane-my-feed-data.phoneapp12.workers.dev/push/vapid');
      if (!res.ok) return;
      const pub = (await res.json()).publicKey || '';
      if (!pub) return;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(pub) });
      await fetch('https://shane-my-feed-data.phoneapp12.workers.dev/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sub, lastOpen: ls.get('comeOpen', 0) || Date.now() }) });
    } catch (e) {}
  }
  function boot() {
    const now = Date.now();
    const lastOpen = ls.get('comeOpen', 0) || 0;
    const lastNote = ls.get('comeNote', 0) || 0;
    if (ls.get('comeBack', 0) && shouldPing(lastOpen, lastNote, now)) {
      ls.set('comeNote', now);
      show('It has been a couple of days. Info Book is here when you want it.');
    }
    ls.set('comeOpen', now);
    mirror();
    if (ls.get('comeBack', 0)) { periodic(); subscribe(); }
  }
  root.ibComeOpt = function (on) {
    ls.set('comeBack', on ? 1 : 0);
    mirror();
    if (on) { periodic(); subscribe(); }
  };
  root.document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-comeback]');
    if (!b) return;
    e.preventDefault();
    const next = !ls.get('comeBack', 0);
    if (next && root.Notification && Notification.permission === 'default') {
      Notification.requestPermission().then(p => { if (p === 'granted') root.ibComeOpt(true); });
      return;
    }
    root.ibComeOpt(next);
    b.classList.toggle('on', next);
    b.setAttribute('aria-checked', next ? 'true' : 'false');
  });
  boot();
})(typeof window !== 'undefined' ? window : globalThis);
