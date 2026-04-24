import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

let browserClient = null;
let adminClient = null;
const serverClientByAdapter = new WeakMap();
const serverClientByCookieStore = new WeakMap();

function getRequiredEnv(key) {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Missing Supabase env: ${key}`);
	}
	return value;
}

function getBrowserEnv() {
	return {
		url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
		anonKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
	};
}

function getServerEnv() {
	return {
		url: getRequiredEnv("SUPABASE_URL"),
		serviceKey: getRequiredEnv("SUPABASE_SERVICE_KEY"),
	};
}

export function createBrowserSupabaseClient() {
	const { url, anonKey } = getBrowserEnv();

	if (!browserClient) {
		browserClient = createBrowserClient(url, anonKey);
	}

	return browserClient;
}

export async function createServerSupabaseClient(adapter) {
	const { url, serviceKey } = getServerEnv();

	if (adapter) {
		const existingClient = serverClientByAdapter.get(adapter);
		if (existingClient) {
			return existingClient;
		}

		const createdClient = createServerClient(url, serviceKey, {
			cookies: {
				getAll: adapter.getAll,
				setAll: adapter.setAll,
			},
		});

		serverClientByAdapter.set(adapter, createdClient);
		return createdClient;
	}

	const { cookies, headers } = await import("next/headers");
	const headerStore = await headers();
	void headerStore;
	const cookieStore = await cookies();

	const existingClient = serverClientByCookieStore.get(cookieStore);
	if (existingClient) {
		return existingClient;
	}

	const createdClient = createServerClient(url, serviceKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
			},
			setAll(cookiesToSet) {
				for (const cookie of cookiesToSet) {
					try {
						cookieStore.set(cookie.name, cookie.value, cookie.options);
					} catch {
						// Server Components can be read-only for cookie writes.
					}
				}
			},
		},
	});

	serverClientByCookieStore.set(cookieStore, createdClient);
	return createdClient;
}

export function createAdminSupabaseClient() {
	if (typeof window !== "undefined") {
		throw new Error("createAdminSupabaseClient() can only run on the server");
	}

	const { url, serviceKey } = getServerEnv();

	if (!adminClient) {
		adminClient = createClient(url, serviceKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
			},
		});
	}

	return adminClient;
}