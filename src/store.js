/**
 * Task storage. Two interchangeable stores with the same methods:
 * load(), add(task), update(id, changes), remove(id), clearCompleted().
 * config.apiUrl empty → localStorage (offline), set → Taskify API on AWS (with the Cognito token when sign-in is configured).
 */

const STORAGE_TASKS = 'taskify.tasks.v1';

function normalizeTasks(value) {
	if (!Array.isArray(value)) return [];
	return value
		.filter(
			(t) =>
				t &&
				typeof t.id === 'string' &&
				typeof t.text === 'string' &&
				typeof t.completed === 'boolean',
		)
		.map((t) => ({
			id: t.id,
			text: t.text.slice(0, 500),
			completed: Boolean(t.completed),
		}));
}

function createLocalStore(getTasks) {
	function save() {
		try {
			localStorage.setItem(STORAGE_TASKS, JSON.stringify(getTasks()));
		} catch {
			throw new Error('Could not save tasks. Your browser storage may be full or disabled.');
		}
	}

	return {
		remote: false,
		async load() {
			try {
				return normalizeTasks(JSON.parse(localStorage.getItem(STORAGE_TASKS) || '[]'));
			} catch {
				return [];
			}
		},
		async add() {
			save();
		},
		async update() {
			save();
		},
		async remove() {
			save();
		},
		async clearCompleted() {
			save();
		},
	};
}

function createApiStore(apiUrl, auth) {
	const base = apiUrl.replace(/\/+$/, '');

	async function send(method, path, body) {
		const headers = {};
		if (body) headers['content-type'] = 'application/json';
		if (auth.enabled) headers.authorization = `Bearer ${await auth.accessToken()}`;
		try {
			return await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
		} catch {
			throw new Error('Could not reach the server. Check your connection and try again.');
		}
	}

	async function request(method, path, body) {
		let res = await send(method, path, body);
		if (res.status === 401 && auth.enabled) {
			await auth.refresh();
			res = await send(method, path, body);
			if (res.status === 401) throw new SessionExpiredError();
		}
		if (!res.ok) {
			let detail = `server answered ${res.status}`;
			try {
				const data = await res.json();
				if (data && data.message) detail = data.message;
			} catch {
				// non-JSON error body: keep the status code
			}
			const action = method === 'GET' ? 'load your tasks' : 'save your change';
			throw new Error(`Could not ${action} (${detail}).`);
		}
		return res.status === 204 ? null : res.json();
	}

	const taskPath = (id) => `/tasks/${encodeURIComponent(id)}`;

	return {
		remote: true,
		async load() {
			return normalizeTasks(await request('GET', '/tasks'));
		},
		async add(task) {
			await request('POST', '/tasks', { id: task.id, text: task.text });
		},
		async update(id, changes) {
			await request('PATCH', taskPath(id), changes);
		},
		async remove(id) {
			await request('DELETE', taskPath(id));
		},
		async clearCompleted() {
			await request('DELETE', '/tasks');
		},
	};
}

function createTaskStore(config, auth, getTasks) {
	return config.apiUrl ? createApiStore(config.apiUrl, auth) : createLocalStore(getTasks);
}
