/**
 * Taskify — task list persisted in localStorage (local mode) or the Taskify API on AWS (cloud mode).
 * Preserves original flows: add, double-click to edit, checkbox, delete.
 */

const STORAGE_THEME = 'taskify.theme.v1';

const listTodo = document.getElementById('listTodo');
const inpTodo = document.getElementById('inpTodo');
const addTaskForm = document.getElementById('addTaskForm');
const alertTask = document.getElementById('taskData');
const emptyState = document.getElementById('emptyState');
const taskFeedback = document.getElementById('taskFeedback');
const clearCompletedBtn = document.getElementById('clearCompleted');
const themeToggle = document.getElementById('themeToggle');

/** @type {{ id: string, text: string, completed: boolean }[]} */
let tasks = [];

const store = createTaskStore(() => tasks);

function uid() {
	return typeof crypto !== 'undefined' && crypto.randomUUID
		? crypto.randomUUID()
		: `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function reloadTasks() {
	try {
		tasks = await store.load();
	} catch (err) {
		showFeedback(err.message);
	}
	render();
}

let pendingSave = Promise.resolve();

// The screen is already updated (optimistic). Saves run one at a time so the API sees them in order;
// on failure tell the user and, in cloud mode, re-sync from the server.
function persist(save) {
	pendingSave = pendingSave.then(save).catch((err) => {
		showFeedback(err.message);
		if (store.remote) return reloadTasks();
	});
}

function showFeedback(message) {
	taskFeedback.textContent = message;
	taskFeedback.hidden = false;
	clearTimeout(showFeedback._t);
	showFeedback._t = setTimeout(() => {
		taskFeedback.hidden = true;
		taskFeedback.textContent = '';
	}, 4000);
}

function getExplicitTheme() {
	const v = localStorage.getItem(STORAGE_THEME);
	return v === 'light' || v === 'dark' ? v : null;
}

function resolveTheme() {
	const explicit = getExplicitTheme();
	if (explicit) return explicit;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
	document.documentElement.setAttribute('data-theme', theme);
	themeToggle.setAttribute(
		'aria-label',
		theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
	);
}

function syncTheme() {
	applyTheme(resolveTheme());
}

function initTheme() {
	syncTheme();
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (!getExplicitTheme()) syncTheme();
	});
	themeToggle.addEventListener('click', () => {
		const current = resolveTheme();
		const next = current === 'dark' ? 'light' : 'dark';
		localStorage.setItem(STORAGE_THEME, next);
		applyTheme(next);
	});
}

function ensureStatsText() {
	let el = alertTask.querySelector('.stats-panel__text');
	if (!el) {
		el = document.createElement('span');
		el.className = 'stats-panel__text';
		alertTask.appendChild(el);
	}
	return el;
}

function updateStats() {
	const total = tasks.length;
	const done = tasks.filter((t) => t.completed).length;
	const el = ensureStatsText();
	if (total === 0) {
		el.textContent = 'No tasks yet.';
	} else {
		el.textContent = `Completed ${done} of ${total}`;
	}
	emptyState.hidden = total > 0;
	listTodo.hidden = total === 0;

	const completedCount = tasks.filter((t) => t.completed).length;
	clearCompletedBtn.hidden = completedCount === 0;
}

function render() {
	listTodo.innerHTML = '';
	for (const task of tasks) {
		listTodo.appendChild(createTaskRow(task));
	}
	updateStats();
}

function createTaskRow(task) {
	const li = document.createElement('li');
	li.className = 'task-row input-group';
	li.dataset.taskId = task.id;

	const divInputCheckbox = document.createElement('div');
	divInputCheckbox.className = 'div-input-checkbox';

	const checkBox = document.createElement('input');
	checkBox.type = 'checkbox';
	checkBox.checked = task.completed;
	checkBox.setAttribute('aria-label', `Complete: ${task.text}`);

	const taskLabel = document.createElement('label');
	taskLabel.className = 'form-control task-label';
	if (task.completed) taskLabel.classList.add('task-label--done');
	taskLabel.textContent = task.text;

	const taskBtn = document.createElement('button');
	taskBtn.type = 'button';
	taskBtn.className = 'btn btn-delete';
	taskBtn.setAttribute('aria-label', `Delete: ${task.text}`);
	taskBtn.innerHTML = '<span aria-hidden="true">×</span>';

	li.appendChild(divInputCheckbox);
	divInputCheckbox.appendChild(checkBox);
	li.appendChild(taskLabel);
	li.appendChild(taskBtn);

	return li;
}

function addTask(text) {
	const task = { id: uid(), text, completed: false };
	tasks.push(task);
	render();
	persist(() => store.add(task));
	inpTodo.value = '';
	inpTodo.focus();
}

addTaskForm.addEventListener('submit', (e) => {
	e.preventDefault();
	const value = inpTodo.value.trim();
	if (!value) {
		showFeedback('Enter a task description first.');
		inpTodo.focus();
		return;
	}
	addTask(value);
});

listTodo.addEventListener('change', (ev) => {
	const target = ev.target;
	if (target.type !== 'checkbox') return;
	const row = target.closest('.task-row');
	if (!row) return;
	const id = row.dataset.taskId;
	const task = tasks.find((t) => t.id === id);
	if (!task) return;
	task.completed = target.checked;
	const label = row.querySelector('.task-label');
	if (label) {
		label.classList.toggle('task-label--done', task.completed);
	}
	updateStats();
	persist(() => store.update(id, { completed: task.completed }));
});

listTodo.addEventListener('click', (ev) => {
	const btn = ev.target.closest('.btn-delete');
	if (!btn) return;
	const row = btn.closest('.task-row');
	if (!row) return;
	const id = row.dataset.taskId;
	tasks = tasks.filter((t) => t.id !== id);
	render();
	persist(() => store.remove(id));
});

listTodo.addEventListener('dblclick', (ev) => {
	const label = ev.target.closest('.task-label');
	if (!label || label.querySelector('input')) return;
	const row = label.closest('.task-row');
	if (!row) return;
	const id = row.dataset.taskId;
	const task = tasks.find((t) => t.id === id);
	if (!task || task.completed) {
		showFeedback('Completed tasks cannot be renamed. Uncheck the box first.');
		return;
	}

	const previous = task.text;
	const inpTaskUpdate = document.createElement('input');
	inpTaskUpdate.type = 'text';
	inpTaskUpdate.className = label.className.replace('task-label--done', '').trim();
	inpTaskUpdate.value = previous;
	inpTaskUpdate.setAttribute('aria-label', 'Edit task');
	label.replaceWith(inpTaskUpdate);

	requestAnimationFrame(() => {
		inpTaskUpdate.focus();
		inpTaskUpdate.select();
	});

	let settled = false;

	function finish(save) {
		if (settled) return;
		settled = true;
		const raw = inpTaskUpdate.value;
		inpTaskUpdate.replaceWith(label);
		if (save) {
			const next = raw.trim();
			if (!next) {
				label.textContent = previous;
				showFeedback('Task text cannot be empty.');
				return;
			}
			task.text = next.slice(0, 500);
			label.textContent = task.text;
			persist(() => store.update(id, { text: task.text }));
		} else {
			label.textContent = previous;
		}
	}

	inpTaskUpdate.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			e.preventDefault();
			finish(false);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			finish(true);
		}
	});

	inpTaskUpdate.addEventListener('focusout', () => {
		if (!inpTaskUpdate.isConnected || settled) return;
		const next = inpTaskUpdate.value.trim();
		if (!next) {
			inpTaskUpdate.focus();
			inpTaskUpdate.placeholder = 'Task cannot be empty';
			return;
		}
		finish(true);
	});
});

clearCompletedBtn.addEventListener('click', () => {
	const before = tasks.length;
	tasks = tasks.filter((t) => !t.completed);
	if (tasks.length === before) return;
	render();
	persist(() => store.clearCompleted());
});

async function bootstrap() {
	initTheme();
	ensureStatsText().textContent = store.remote ? 'Loading tasks…' : 'No tasks yet.';
	inpTodo.focus();
	await reloadTasks();
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', bootstrap);
} else {
	bootstrap();
}
