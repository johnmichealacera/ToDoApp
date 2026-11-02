/**
 * Sign-in with Amazon Cognito's hosted page: OAuth 2.0 authorization code flow with PKCE.
 * Active only when config.js has authDomain and clientId (cloud mode).
 * Tokens live in sessionStorage: they end with the tab and are never sent anywhere except Cognito and the Taskify API.
 */

const AUTH_TOKENS = 'taskify.auth.tokens';
const AUTH_PENDING = 'taskify.auth.pending';

function base64Url(bytes) {
	let binary = '';
	for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString() {
	return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

async function pkceChallenge(verifier) {
	return base64Url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
}

function decodeJwtPayload(token) {
	try {
		const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
		return JSON.parse(decodeURIComponent(escape(atob(part))));
	} catch {
		return {};
	}
}

function readJson(key) {
	try {
		return JSON.parse(sessionStorage.getItem(key) || 'null');
	} catch {
		return null;
	}
}

class SessionExpiredError extends Error {
	constructor() {
		super('Your session expired. Please sign in again.');
		this.sessionExpired = true;
	}
}

function createAuth(config) {
	const enabled = Boolean(config.apiUrl && config.authDomain && config.clientId);
	const domain = (config.authDomain || '').replace(/\/+$/, '');
	const redirectUri = `${location.origin}/`;
	let tokens = readJson(AUTH_TOKENS);

	function saveTokens(next) {
		tokens = next;
		if (next) sessionStorage.setItem(AUTH_TOKENS, JSON.stringify(next));
		else sessionStorage.removeItem(AUTH_TOKENS);
	}

	async function requestTokens(params) {
		let res;
		try {
			res = await fetch(`${domain}/oauth2/token`, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ client_id: config.clientId, ...params }),
			});
		} catch {
			throw new Error('Could not reach the sign-in service. Check your connection and try again.');
		}
		if (!res.ok) return null;
		const data = await res.json();
		return {
			accessToken: data.access_token,
			idToken: data.id_token,
			refreshToken: data.refresh_token || tokens?.refreshToken,
			expiresAt: Date.now() + data.expires_in * 1000,
		};
	}

	return {
		enabled,

		isSignedIn() {
			return Boolean(tokens?.accessToken);
		},

		email() {
			return tokens ? decodeJwtPayload(tokens.idToken).email || '' : '';
		},

		async signIn() {
			const verifier = randomString();
			const state = randomString();
			sessionStorage.setItem(AUTH_PENDING, JSON.stringify({ verifier, state }));
			const query = new URLSearchParams({
				response_type: 'code',
				client_id: config.clientId,
				redirect_uri: redirectUri,
				scope: 'openid email',
				state,
				code_challenge: await pkceChallenge(verifier),
				code_challenge_method: 'S256',
			});
			location.assign(`${domain}/oauth2/authorize?${query}`);
		},

		signOut() {
			saveTokens(null);
			const query = new URLSearchParams({ client_id: config.clientId, logout_uri: redirectUri });
			location.assign(`${domain}/logout?${query}`);
		},

		// Finishes a sign-in when Cognito sends the user back with ?code=…&state=…
		async handleRedirect() {
			const params = new URLSearchParams(location.search);
			if (!params.has('code') && !params.has('error')) return;
			history.replaceState(null, '', location.pathname);

			const pending = readJson(AUTH_PENDING);
			sessionStorage.removeItem(AUTH_PENDING);
			if (params.has('error')) {
				throw new Error(`Sign-in was cancelled or failed (${params.get('error_description') || params.get('error')}).`);
			}
			if (!pending || pending.state !== params.get('state')) {
				throw new Error('Sign-in could not be verified. Please try again.');
			}
			const next = await requestTokens({
				grant_type: 'authorization_code',
				code: params.get('code'),
				redirect_uri: redirectUri,
				code_verifier: pending.verifier,
			});
			if (!next) throw new Error('Sign-in expired before it finished. Please try again.');
			saveTokens(next);
		},

		async accessToken() {
			if (!tokens) throw new SessionExpiredError();
			if (Date.now() > tokens.expiresAt - 60_000) await this.refresh();
			return tokens.accessToken;
		},

		async refresh() {
			const next = tokens?.refreshToken
				? await requestTokens({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken })
				: null;
			if (!next) {
				saveTokens(null);
				throw new SessionExpiredError();
			}
			saveTokens(next);
		},
	};
}
