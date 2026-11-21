/* Info Book To-do list: local-only, scoped to this Info Book profile on this device. */
(() => {
  'use strict';

  const PROFILE_KEY = typeof MEMBER !== 'undefined' && MEMBER && MEMBER.id && !MEMBER.pending
    ? 'member.' + encodeURIComponent(String(MEMBER.id))
    : 'unlinked';
  const STORE_KEY = 'ib.todos.v1.' + PROFILE_KEY;
  const MAX_TASKS = 500;
  const MAX_TITLE = 160;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function readTasks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(task => task && typeof task === 'object' && typeof task.title === 'string')
        .map(task => ({
          id: String(task.id || ''),
          title: task.title.slice(0, MAX_TITLE),
          due: /^\d{4}-\d{2}-\d{2}$/.test(task.due || '') ? task.due : '',
          done: task.done === true,
          createdAt: Number(task.createdAt) || Date.now()
        }))
        .filter(task => task.id && task.title.trim());
    } catch (error) {
      return [];
    }
  }

  let tasks = readTasks();

  function saveTasks() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(tasks.slice(0, MAX_TASKS)));
      return true;
    } catch (error) {
      if (typeof toast === 'function') toast('Could not save on this device');
      return false;
    }
  }

  function localToday() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  }

  function formatDue(date) {
    if (!date) return '';
    const [year, month, day] = date.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: year !== new Date().getFullYear() ? 'numeric' : undefined });
  }

  function makeId() {
    return window.crypto && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function sortedTasks() {
    return tasks.slice().sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.done && a.due !== b.due) {
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due.localeCompare(b.due);
      }
      return a.createdAt - b.createdAt;
    });
  }

  function taskHtml(task) {
    const dueLabel = task.due ? formatDue(task.due) : '';
    const overdue = !task.done && task.due && task.due < localToday();
    return `<li class="ib-todo-item${task.done ? ' is-done' : ''}">
      <label class="ib-todo-check"><input type="checkbox" data-todo-toggle="${escapeHtml(task.id)}"${task.done ? ' checked' : ''} aria-label="Mark ${escapeHtml(task.title)} ${task.done ? 'not done' : 'done'}"><span>${escapeHtml(task.title)}</span></label>
      ${dueLabel ? `<small class="ib-todo-due${overdue ? ' overdue' : ''}">${overdue ? 'Overdue · ' : 'Due · '}${escapeHtml(dueLabel)}</small>` : ''}
      <button type="button" class="ib-todo-delete" data-todo-delete="${escapeHtml(task.id)}" aria-label="Delete ${escapeHtml(task.title)}" title="Delete task">×</button>
    </li>`;
  }

  function render() {
    const container = document.getElementById('sheetin');
    const sheet = document.getElementById('sheet');
    if (!container || !sheet) return;
    const open = tasks.filter(task => !task.done).length;
    const complete = tasks.length - open;
    const entries = sortedTasks();
    container.innerHTML = `<div class="ib-todo">
      <div class="ib-todo-heading"><span class="ib-todo-icon" aria-hidden="true">✓</span><div><h2>To-do list</h2><p>${open ? `${open} ${open === 1 ? 'task' : 'tasks'} to do` : 'You’re all caught up'}${complete ? ` · ${complete} done` : ''}</p></div><button type="button" class="ib-todo-close" data-close aria-label="Close to-do list">✕</button></div>
      <p class="ib-todo-private">Private to this Info Book profile on this device. Not shared with Family or Friends.</p>
      <form class="ib-todo-form" id="ibTodoForm">
        <label for="ibTodoTitle">New task</label>
        <div class="ib-todo-entry"><input id="ibTodoTitle" name="title" type="text" maxlength="${MAX_TITLE}" placeholder="What needs doing?" autocomplete="off" required><button type="submit" class="btn pri">Add</button></div>
        <label for="ibTodoDue" class="ib-todo-date-label">Due date <span>(optional)</span></label>
        <input id="ibTodoDue" name="due" type="date">
      </form>
      ${entries.length ? `<div class="ib-todo-list-head"><h3>Tasks</h3>${complete ? `<button type="button" class="ib-todo-clear" data-todo-clear>Clear done</button>` : ''}</div>
        <ul class="ib-todo-list">${entries.map(taskHtml).join('')}</ul>` : '<div class="ib-todo-empty"><span aria-hidden="true">📝</span><b>Your list is empty</b><small>Add a task above to get started.</small></div>'}
      <button type="button" class="btn ib-todo-done" data-close>Done</button>
    </div>`;
    sheet.classList.add('on');
    const title = document.getElementById('ibTodoTitle');
    if (title && !entries.length) title.focus({ preventScroll: true });
  }

  function openTodo() {
    render();
    const drawer = document.getElementById('mfdrawer');
    if (drawer) drawer.classList.remove('on');
  }

  document.addEventListener('click', event => {
    const target = event.target;
    if (!target || !target.closest) return;
    if (target.closest('[data-todo-open]')) {
      event.preventDefault();
      openTodo();
      return;
    }
    const deleteButton = target.closest('[data-todo-delete]');
    if (deleteButton) {
      const id = deleteButton.dataset.todoDelete;
      const task = tasks.find(item => item.id === id);
      if (!task || !window.confirm(`Delete “${task.title}”?`)) return;
      tasks = tasks.filter(item => item.id !== id);
      saveTasks();
      render();
      return;
    }
    if (target.closest('[data-todo-clear]')) {
      const count = tasks.filter(task => task.done).length;
      if (!count || !window.confirm(`Clear ${count} completed ${count === 1 ? 'task' : 'tasks'}?`)) return;
      tasks = tasks.filter(task => !task.done);
      saveTasks();
      render();
    }
  });

  document.addEventListener('change', event => {
    const input = event.target;
    if (!input || !input.matches || !input.matches('[data-todo-toggle]')) return;
    const task = tasks.find(item => item.id === input.dataset.todoToggle);
    if (!task) return;
    task.done = input.checked;
    saveTasks();
    render();
  });

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!form || form.id !== 'ibTodoForm') return;
    event.preventDefault();
    const titleInput = form.elements.title;
    const title = String(titleInput.value || '').trim().slice(0, MAX_TITLE);
    if (!title) { titleInput.focus(); return; }
    if (tasks.length >= MAX_TASKS) {
      if (typeof toast === 'function') toast('This list has reached its 500-task limit');
      return;
    }
    const dueInput = form.elements.due;
    const due = /^\d{4}-\d{2}-\d{2}$/.test(dueInput.value) ? dueInput.value : '';
    tasks.unshift({ id: makeId(), title, due, done: false, createdAt: Date.now() });
    if (saveTasks()) {
      render();
      const nextTitle = document.getElementById('ibTodoTitle');
      if (nextTitle) nextTitle.focus({ preventScroll: true });
      if (typeof toast === 'function') toast('Task added');
    }
  });
})();
