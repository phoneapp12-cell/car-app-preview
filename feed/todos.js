/* Info Book to-do list.
   Shane and Sarah share the existing My App / Sarah's To-do list: on this phone
   that is IndexedDB database "due-dates", store "kv", key "data", field "todos",
   kept in sync through POST https://due-dates-calendar-relay.phoneapp12.workers.dev/shared-todo
   (the same endpoint My App already uses, with localStorage "sharedKey").
   Other family members get their own list in the same per-member localStorage (ls)
   as the rest of the feed. No Worker changes. */
(function (root) {
  const STORE_KEY = 'todos';
  const SHARED_URL = 'https://due-dates-calendar-relay.phoneapp12.workers.dev/shared-todo';
  const SKIP_LISTS = { '#lists': 1, Appointments: 1 };
  const ID_RE = /^[A-Za-z0-9_-]{4,64}$/;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function nzToday(now) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now || new Date());
  }
  function nzParts(ms) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
    return { date: p.year + '-' + p.month + '-' + p.day, time: p.hour + ':' + p.minute };
  }
  function aucklandMs(date, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return NaN;
    const clock = /^\d{2}:\d{2}$/.test(time || '') ? time : '09:00';
    for (const off of ['+13:00', '+12:00']) {
      const ms = Date.parse(date + 'T' + clock + ':00' + off);
      if (!isFinite(ms)) continue;
      const got = nzParts(ms);
      if (got.date === date && got.time === clock) return ms;
    }
    return NaN;
  }
  function addDaysIso(iso, n) {
    const [y, m, d] = String(iso).split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + n));
    return dt.getUTCFullYear() + '-' + String(dt.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dt.getUTCDate()).padStart(2, '0');
  }
  function compactIso(iso) { return String(iso || '').replace(/-/g, ''); }
  function itemTime(t) {
    const v = t && (t.time || t.dueTime);
    return /^\d{2}:\d{2}$/.test(v || '') ? v : '';
  }
  function isTodoItem(t) {
    if (!t || typeof t !== 'object' || t.deleted) return false;
    if (SKIP_LISTS[t.list]) return false;
    if (!String(t.title || '').trim()) return false;
    return true;
  }
  function householdUser(member, flags) {
    flags = flags || {};
    if (flags.friend) return false;
    if (flags.admin) return true;
    if (!member) return true;
    const first = String(member.name || '').trim().split(/\s+/)[0].toLowerCase();
    return first === 'sarah';
  }
  function actorOf(member, flags) {
    if (householdUser(member, flags) && member && String(member.name || '').trim().split(/\s+/)[0].toLowerCase() === 'sarah') return 'sarah';
    return 'shane';
  }
  function uid(now) {
    now = now || Date.now();
    return 'td' + now.toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function cleanItem(raw, now) {
    now = now || Date.now();
    if (!raw || typeof raw !== 'object' || raw.deleted) return null;
    const title = String(raw.title || '').trim().slice(0, 120);
    if (!title) return null;
    const id = String(raw.id || uid(now));
    if (!ID_RE.test(id)) return null;
    const due = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.due || '')) ? raw.due : '';
    const time = itemTime(raw);
    const updated = Number(raw.updated) || now;
    const created = Number(raw.created) || updated;
    const done = !!raw.done;
    const item = {
      id, title,
      list: String(raw.list || 'To-do').trim().slice(0, 24) || 'To-do',
      due, notes: String(raw.notes || '').slice(0, 1000),
      priority: (raw.priority === 'high' || raw.priority === 'low') ? raw.priority : 'normal',
      done, doneAt: done ? (Number(raw.doneAt) || updated) : 0,
      created, updated, by: raw.by === 'sarah' ? 'sarah' : (raw.by === 'shane' ? 'shane' : raw.by)
    };
    if (time) item.time = time;
    if (raw.sharedS) item.sharedS = true;
    if (raw.from) item.from = raw.from;
    if (done && (raw.doneBy === 'sarah' || raw.doneBy === 'shane')) item.doneBy = raw.doneBy;
    return item;
  }
  function sortOpen(a, b) {
    const ad = a.due || '9999-99-99', bd = b.due || '9999-99-99';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (a.created || 0) - (b.created || 0);
  }
  function sortDone(a, b) { return (b.doneAt || b.updated || 0) - (a.doneAt || a.updated || 0); }
  function splitItems(list) {
    const items = (Array.isArray(list) ? list : []).map(x => cleanItem(x)).filter(isTodoItem);
    const open = items.filter(t => !t.done).sort(sortOpen);
    const done = items.filter(t => t.done).sort(sortDone);
    return { open, done, items: open.concat(done) };
  }
  function dueKind(t, today) {
    today = today || nzToday();
    if (!t || !t.due) return 'none';
    if (t.due < today) return 'overdue';
    if (t.due === today) return 'today';
    return 'later';
  }
  function dueLabel(t, today) {
    today = today || nzToday();
    const kind = dueKind(t, today);
    if (kind === 'none') return '';
    const time = itemTime(t);
    const pretty = prettyDate(t.due, today);
    if (kind === 'overdue') return 'Overdue · ' + pretty + (time ? ' · ' + time : '');
    if (kind === 'today') return 'Due today' + (time ? ' · ' + time : '');
    return pretty + (time ? ' · ' + time : '');
  }
  function prettyDate(iso, today) {
    today = today || nzToday();
    if (!iso) return '';
    if (iso === today) return 'Today';
    if (iso === addDaysIso(today, 1)) return 'Tomorrow';
    const [y, m, d] = iso.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return d + ' ' + months[m - 1] + (String(y) !== today.slice(0, 4) ? ' ' + y : '');
  }
  function todayAndOverdue(list, today) {
    today = today || nzToday();
    return splitItems(list).open.filter(t => dueKind(t, today) === 'overdue' || dueKind(t, today) === 'today');
  }

  function icsEscape(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&');
  }
  function byteLen(s) {
    try { return new TextEncoder().encode(s).length; } catch (e) { return String(s).length; }
  }
  function icsFold(text) {
    const lines = [];
    String(text).split('\r\n').forEach(line => {
      let buf = '';
      for (const ch of line) {
        const next = buf + ch;
        if (byteLen(next) > 75) {
          lines.push(buf);
          buf = ' ' + ch;
        } else buf = next;
      }
      lines.push(buf);
    });
    return lines.join('\r\n');
  }
  function icsUtc(ms) {
    const d = new Date(ms), p = n => String(n).padStart(2, '0');
    return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
  }
  function eventDates(t, today) {
    const due = (t && t.due) || today || nzToday();
    const time = itemTime(t);
    if (time) {
      const start = aucklandMs(due, time);
      const end = isFinite(start) ? start + 3600000 : NaN;
      return { due, time, start, end, allDay: false };
    }
    return { due, time: '', start: NaN, end: NaN, allDay: true, endDate: addDaysIso(due, 1) };
  }
  function icsForTodo(t, now, today) {
    now = now || Date.now();
    today = today || nzToday(new Date(now));
    const ev = eventDates(t, today);
    const eventUid = String((t && t.id) || ('td' + now)).replace(/[^A-Za-z0-9_-]/g, '') + '@infobook-todo';
    let when;
    if (ev.allDay) when = 'DTSTART;VALUE=DATE:' + compactIso(ev.due) + '\r\nDTEND;VALUE=DATE:' + compactIso(ev.endDate) + '\r\n';
    else when = 'DTSTART:' + icsUtc(ev.start) + '\r\nDTEND:' + icsUtc(ev.end) + '\r\n';
    const body = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Info Book//To-do//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nBEGIN:VEVENT\r\nUID:' + eventUid + '\r\nDTSTAMP:' + icsUtc(now) + '\r\n' + when + 'SUMMARY:' + icsEscape(t && t.title) + '\r\nDESCRIPTION:' + icsEscape(t && t.notes) + '\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
    return icsFold(body);
  }
  function googleCalUrl(t, today) {
    today = today || nzToday();
    const ev = eventDates(t, today);
    let dates;
    if (ev.allDay) dates = compactIso(ev.due) + '/' + compactIso(ev.endDate);
    else dates = icsUtc(ev.start).replace(/Z$/, '') + 'Z/' + icsUtc(ev.end).replace(/Z$/, '') + 'Z';
    const q = 'action=TEMPLATE&text=' + encodeURIComponent((t && t.title) || '') + '&dates=' + dates + (t && t.notes ? '&details=' + encodeURIComponent(t.notes) : '');
    return 'https://calendar.google.com/calendar/render?' + q;
  }

  function applyChange(list, patch, now) {
    now = now || Date.now();
    const items = (Array.isArray(list) ? list : []).slice();
    if (patch && patch.clearDone) return items.map(x => x && x.done ? Object.assign({}, x, { deleted: true, updated: now }) : x).filter(x => !(x && x.deleted));
    if (patch && patch.deleted && patch.id) {
      return items.filter(x => !(x && x.id === patch.id));
    }
    if (patch && patch.id) {
      const i = items.findIndex(x => x && x.id === patch.id);
      if (i < 0) {
        const made = cleanItem(Object.assign({ created: now, updated: now }, patch), now);
        return made ? items.concat([made]) : items;
      }
      const next = cleanItem(Object.assign({}, items[i], patch, { updated: now, id: items[i].id, created: items[i].created || now }), now);
      if (!next) return items;
      items[i] = next;
      return items;
    }
    const made = cleanItem(Object.assign({ created: now, updated: now }, patch || {}), now);
    return made ? items.concat([made]) : items;
  }
  function pendingPayload(item, now, from) {
    now = now || Date.now();
    if (item.deleted) return { id: item.id, deleted: true, updated: now };
    return {
      id: item.id, title: item.title, list: item.list || 'To-do', due: item.due || '', notes: item.notes || '',
      priority: item.priority || 'normal', done: !!item.done, doneAt: item.done ? (item.doneAt || now) : 0,
      created: item.created || now, by: item.by || from || 'shane', updated: now,
      ...(item.done && (item.doneBy === 'sarah' || item.doneBy === 'shane') ? { doneBy: item.doneBy } : {})
    };
  }

  const api = {
    STORE_KEY, SHARED_URL, SKIP_LISTS, nzToday, addDaysIso, compactIso, itemTime, isTodoItem,
    householdUser, actorOf, uid, cleanItem, splitItems, dueKind, dueLabel, prettyDate, todayAndOverdue,
    icsEscape, icsFold, icsForTodo, googleCalUrl, eventDates, applyChange, pendingPayload, aucklandMs
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.ibTodos = api;

  if (!root.document) return;

  let on = false, edit = null, calFor = null, doneOpen = false, busy = false, err = '', cache = [];
  let mode = 'local'; // 'local' | 'household' | 'need-key'

  function flagsNow() {
    return {
      admin: typeof IS_ADMIN !== 'undefined' && !!IS_ADMIN,
      friend: typeof IS_FRIEND !== 'undefined' && !!IS_FRIEND
    };
  }
  function memberNow() { try { return typeof MEMBER !== 'undefined' ? MEMBER : null; } catch (e) { return null; } }
  function isHousehold() { return householdUser(memberNow(), flagsNow()); }
  function sharedKey() { try { return root.localStorage.getItem('sharedKey') || ''; } catch (e) { return ''; } }
  function cfKey() { try { return root.localStorage.getItem('cfKey') || ''; } catch (e) { return ''; } }

  function localLoad() {
    let list = [];
    try { list = (typeof ls !== 'undefined' && ls.get(STORE_KEY, [])) || []; } catch (e) { list = []; }
    return Array.isArray(list) ? list : [];
  }
  function localSave(list) {
    try { if (typeof ls !== 'undefined') ls.set(STORE_KEY, list); } catch (e) { }
    cache = list;
  }

  function openDueDb() {
    return new Promise((res, rej) => {
      const r = root.indexedDB.open('due-dates', 1);
      r.onupgradeneeded = () => { try { if (!r.result.objectStoreNames.contains('kv')) r.result.createObjectStore('kv'); } catch (e) { } };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbGetData() {
    if (!root.indexedDB) return null;
    const db = await openDueDb();
    return new Promise((res, rej) => {
      try {
        const q = db.transaction('kv').objectStore('kv').get('data');
        q.onsuccess = () => res(q.result || null);
        q.onerror = () => rej(q.error);
      } catch (e) { res(null); }
    });
  }
  async function idbSetData(data) {
    const db = await openDueDb();
    return new Promise((res, rej) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(data, 'data');
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }
  async function idbTodos() {
    try {
      const data = await idbGetData();
      if (data && Array.isArray(data.todos)) return { data, todos: data.todos };
    } catch (e) { }
    return null;
  }
  async function idbApply(mutator) {
    const got = await idbTodos();
    if (!got) return null;
    got.data.todos = mutator(got.data.todos.slice());
    got.data.updatedAt = new Date().toISOString();
    await idbSetData(got.data);
    return got.data.todos;
  }

  async function ensureKey() {
    if (sharedKey()) return sharedKey();
    const k = cfKey();
    if (!k) return '';
    try {
      const r = await fetch('https://due-dates-calendar-relay.phoneapp12.workers.dev/pair/shane', {
        method: 'POST', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Cash-Key': k },
        body: '{}'
      });
      const j = r.ok ? await r.json() : null;
      if (j && /^st_[A-Za-z0-9_-]{40,}$/.test(j.key || '')) {
        try { root.localStorage.setItem('sharedKey', j.key); } catch (e) { }
        return j.key;
      }
    } catch (e) { }
    return sharedKey();
  }
  async function sharedPost(items, from) {
    const key = await ensureKey();
    if (!key) throw new Error('no_key');
    const r = await fetch(SHARED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, items: items || [], from: from || actorOf(memberNow(), flagsNow()) })
    });
    if (!r.ok) throw new Error('http_' + r.status);
    const d = await r.json();
    if (!d || !Array.isArray(d.items)) throw new Error('bad_reply');
    return d.items;
  }

  async function loadAll() {
    err = '';
    if (!isHousehold()) {
      mode = 'local';
      cache = localLoad();
      return cache;
    }
    const fromIdb = await idbTodos();
    let remote = null;
    try { remote = await sharedPost([]); } catch (e) {
      if (String(e.message || e) === 'no_key' && !fromIdb) {
        mode = 'need-key';
        cache = [];
        err = 'need-key';
        return cache;
      }
      if (!fromIdb) { mode = 'need-key'; cache = []; err = 'offline'; return cache; }
    }
    if (remote) {
      mode = 'household';
      cache = remote.filter(isTodoItem);
      return cache;
    }
    mode = 'household';
    cache = (fromIdb.todos || []).filter(isTodoItem);
    return cache;
  }

  async function writeHousehold(patch, now) {
    now = now || Date.now();
    const from = actorOf(memberNow(), flagsNow());
    let sent;
    if (patch.clearDone) {
      sent = splitItems(cache).done.map(t => pendingPayload(Object.assign({}, t, { deleted: true }), now, from));
    } else if (patch.deleted) {
      sent = [pendingPayload({ id: patch.id, deleted: true }, now, from)];
    } else {
      const nextList = applyChange(cache, patch, now);
      const item = nextList.find(x => x.id === (patch.id || (nextList[nextList.length - 1] && nextList[nextList.length - 1].id)));
      if (!item) return;
      if (!item.by) item.by = from;
      if (from === 'shane') item.sharedS = true;
      sent = [pendingPayload(item, now, from)];
    }
    let remote = null;
    try { remote = await sharedPost(sent, from); } catch (e) { err = String(e.message || e) === 'no_key' ? 'need-key' : 'offline'; }
    const applyIdb = list => {
      if (patch.clearDone) return list.map(x => x && x.done ? Object.assign({}, x, { deleted: true, updated: now }) : x).filter(x => !(x && x.deleted));
      if (patch.deleted) return list.filter(x => !(x && x.id === patch.id));
      return applyChange(list.map(x => {
        if (!x || x.id !== (patch.id || sent[0].id)) return x;
        return Object.assign({}, x, patch, { updated: now, sharedS: x.sharedS || from === 'shane', from: x.from || (from === 'sarah' ? 'sarah' : x.from) });
      }).concat(list.some(x => x && x.id === (patch.id || sent[0].id)) ? [] : [Object.assign({}, sent[0], { sharedS: true, from: from === 'sarah' ? 'sarah' : undefined })]), patch, now);
    };
    try { await idbApply(applyIdb); } catch (e) { }
    if (remote) { cache = remote.filter(isTodoItem); err = ''; }
    else cache = applyChange(cache, patch, now);
  }

  async function commit(patch) {
    if (busy) return;
    busy = true;
    try {
      if (isHousehold()) await writeHousehold(patch);
      else localSave(applyChange(localLoad(), patch));
    } finally { busy = false; }
    if (on) draw();
  }

  function setOpenClass(v) {
    const h = root.document.documentElement;
    if (h && h.classList) h.classList.toggle('ib-todo-on', !!v);
  }
  function closeTodo() {
    on = false; root.ibTodoOn = false; setOpenClass(false); edit = null; calFor = null;
  }
  function whoLine() {
    if (mode === 'need-key') return 'This is Shane and Sarah’s shared to-do list from My App.';
    if (mode === 'household') return 'Shane and Sarah’s shared list — the same one as in My App.';
    return 'Your own to-do list on this phone.';
  }

  function itemRow(t, today) {
    const kind = dueKind(t, today);
    const lab = dueLabel(t, today);
    const calOpen = calFor && calFor === t.id;
    return `<article class="td-row${t.done ? ' done' : ''}${kind === 'overdue' ? ' overdue' : ''}${kind === 'today' ? ' today' : ''}" data-tdid="${esc(t.id)}">
      <button type="button" class="td-tick" data-tdtick="${esc(t.id)}" aria-pressed="${t.done ? 'true' : 'false'}" aria-label="${t.done ? 'Mark not done' : 'Mark done'}: ${esc(t.title)}">${t.done ? '✓' : ''}</button>
      <div class="td-body">
        <b>${esc(t.title)}</b>
        ${lab ? `<small class="td-due">${esc(lab)}</small>` : ''}
        <div class="td-acts">
          <button type="button" data-tdedit="${esc(t.id)}">Edit</button>
          <button type="button" data-tdcal="${esc(t.id)}">Add to calendar</button>
          <button type="button" class="td-del" data-tddel="${esc(t.id)}">Delete</button>
        </div>
        ${calOpen ? `<div class="td-calout">
          <p>Add “${esc(t.title)}” to your calendar${t.due ? '' : ' (today, all day)'}.</p>
          <div class="td-calbtns">
            <button type="button" class="btn pri" data-tdics="${esc(t.id)}">Download .ics</button>
            <a class="btn" data-tdgcal="${esc(t.id)}" href="${esc(googleCalUrl(t, today))}" target="_blank" rel="noopener">Google Calendar</a>
          </div>
        </div>` : ''}
      </div>
    </article>`;
  }
  function formHtml() {
    const e = edit && edit.id ? edit : { title: '', due: '', time: '' };
    const adding = !e.id;
    return `<form class="td-form" data-tdform>
      <h3>${adding ? 'Add a to-do' : 'Edit to-do'}</h3>
      <label>To-do <input name="title" maxlength="120" required value="${esc(e.title || '')}" placeholder="What needs doing?"></label>
      <label>Due date <span class="td-opt">(optional)</span> <input name="due" type="date" value="${esc(e.due || '')}"></label>
      <div class="xbtns"><button class="btn pri" type="submit">${adding ? 'Add' : 'Save'}</button><button class="btn" type="button" data-tdcancel>Cancel</button></div>
    </form>`;
  }
  function viewHtml() {
    const today = nzToday();
    const parts = splitItems(cache);
    const need = mode === 'need-key';
    let empty;
    if (need) empty = `<p class="td-empty">Shane and Sarah already have a shared to-do list in My App (and Sarah’s To-do). Open <a href="../">My App</a> on this phone, or open Info Book on a phone that already has that list, so both of you keep seeing the same items. A new list is not created here.</p>`;
    else if (!parts.items.length && !edit) empty = `<p class="td-empty">Nothing on the list yet. Add something below.</p>`;
    else empty = '';
    const openH = parts.open.length ? parts.open.map(t => itemRow(t, today)).join('') : (edit || need ? '' : empty);
    const doneH = parts.done.length ? `<details class="td-done" ${doneOpen ? 'open' : ''} data-tddone>
      <summary>Done (${parts.done.length})</summary>
      <div class="td-done-acts"><button type="button" class="btn" data-tdclear>Clear done</button></div>
      ${parts.done.map(t => itemRow(t, today)).join('')}
    </details>` : '';
    return `<div class="tdwrap"><button type="button" class="backpill" data-tdclose>← Back to feed</button>
      <header class="td-hd"><h2>To-do</h2><p class="td-sub">${esc(whoLine())}</p></header>
      ${err && err === 'offline' ? '<p class="td-warn">Couldn’t reach the shared list just now. Changes are kept on this phone and will sync when you next open My App.</p>' : ''}
      ${need ? empty : ''}
      ${edit ? formHtml() : (need ? '' : `<button type="button" class="btn pri td-add" data-tdnew>Add a to-do</button>`)}
      ${need ? '' : `<div class="td-list">${openH}${doneH}</div>`}
    </div>`;
  }

  async function draw() {
    setOpenClass(on);
    const feed = root.document.getElementById('feed');
    if (!feed) return;
    feed.innerHTML = viewHtml();
    const sh = root.document.getElementById('stories-host');
    if (sh) sh.innerHTML = '';
    const titleIn = feed.querySelector('.td-form input[name="title"]');
    if (titleIn) try { titleIn.focus(); } catch (e) { }
  }
  async function openTodo() {
    if (root.ibCalOn && typeof root.ibCalClose === 'function') root.ibCalClose();
    on = true; root.ibTodoOn = true; setOpenClass(true);
    try { root.document.documentElement.classList.remove('portal-on'); } catch (e) { }
    edit = null; calFor = null;
    await loadAll();
    await draw();
    if (root.scrollTo) root.scrollTo(0, 0);
  }
  root.ibTodoOpen = openTodo;
  root.ibTodoDraw = function () { if (on) draw(); };
  root.ibTodoClose = closeTodo;
  Object.assign(root.ibTodos, { loadAll, localLoad, isHousehold, sharedKey, viewHtml, split: () => splitItems(cache), cache: () => cache });

  function downloadIcs(t) {
    const ics = icsForTodo(t);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = root.document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'todo-' + (t.due || nzToday()) + '.ics';
    root.document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) { } }, 1000);
  }

  if (root.document.addEventListener) root.document.addEventListener('click', e => {
    const t = e.target; if (!t || !t.closest) return;
    if (t.closest('[data-todoopen]')) {
      e.preventDefault();
      try { if (typeof mfDrawer === 'function') mfDrawer(false); } catch (err2) { }
      openTodo(); return;
    }
    if (!on) return;
    if (t.closest('[data-tdclose]')) { closeTodo(); if (typeof root.draw === 'function') root.draw(); return; }
    if (t.closest('[data-tdnew]')) { edit = { title: '', due: '' }; calFor = null; draw(); return; }
    if (t.closest('[data-tdcancel]')) { edit = null; draw(); return; }
    const ed = t.closest('[data-tdedit]');
    if (ed) { edit = (cache || []).find(x => x.id === ed.dataset.tdedit) || { id: ed.dataset.tdedit, title: '', due: '' }; calFor = null; draw(); return; }
    const del = t.closest('[data-tddel]');
    if (del) { if (root.confirm && !root.confirm('Delete this to-do?')) return; commit({ id: del.dataset.tddel, deleted: true }); return; }
    const tick = t.closest('[data-tdtick]');
    if (tick) {
      const cur = (cache || []).find(x => x.id === tick.dataset.tdtick);
      if (!cur) return;
      const done = !cur.done;
      commit({ id: cur.id, title: cur.title, list: cur.list, due: cur.due, notes: cur.notes, priority: cur.priority, done, doneAt: done ? Date.now() : 0, doneBy: done ? actorOf(memberNow(), flagsNow()) : undefined, created: cur.created, by: cur.by });
      return;
    }
    const cal = t.closest('[data-tdcal]');
    if (cal) { calFor = calFor === cal.dataset.tdcal ? null : cal.dataset.tdcal; draw(); return; }
    const icsBtn = t.closest('[data-tdics]');
    if (icsBtn) { const item = (cache || []).find(x => x.id === icsBtn.dataset.tdics); if (item) downloadIcs(item); return; }
    if (t.closest('[data-tdclear]')) { if (root.confirm && !root.confirm('Clear all done items from the list?')) return; commit({ clearDone: true }); return; }
    const det = t.closest('[data-tddone]');
    if (det && t.closest('summary')) { setTimeout(() => { const d = root.document.querySelector('[data-tddone]'); doneOpen = !!(d && d.open); }, 0); }
  });
  if (root.document.addEventListener) root.document.addEventListener('submit', e => {
    const form = e.target && e.target.closest && e.target.closest('[data-tdform]');
    if (!form || !on) return;
    e.preventDefault();
    const title = String((form.title && form.title.value) || '').trim();
    if (!title) return;
    const due = form.due && form.due.value || '';
    const cur = edit && edit.id ? edit : null;
    const patch = {
      id: cur ? cur.id : uid(),
      title, due: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : '',
      notes: cur && cur.notes || '',
      list: (cur && cur.list) || 'To-do',
      priority: (cur && cur.priority) || 'normal',
      done: !!(cur && cur.done),
      created: cur && cur.created,
      by: (cur && cur.by) || actorOf(memberNow(), flagsNow())
    };
    edit = null;
    commit(patch);
  });

  if (root.setTimeout) root.setTimeout(function () { loadAll().catch(function () {}); }, 600);
  try { if (root.ibToday && typeof ibToday.injectTodoCard === 'function') ibToday.injectTodoCard(); } catch (e) { }
  try { if (root.ibToday && typeof ibToday.wrapDrawer === 'function') ibToday.wrapDrawer(); } catch (e) { }
})(typeof window !== 'undefined' ? window : globalThis);
