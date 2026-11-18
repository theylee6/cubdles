import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseCredentials } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Acts as the signed-in user, so row-level security always applies.
 */
export async function createClient() {
  const { url, anonKey } = supabaseCredentials();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Anonymous client with no cookies, for public data (e.g. pricing) that can be cached.
 * Still subject to row-level security as the `anon` role.
 */
export function createAnonClient() {
  const { url, anonKey } = supabaseCredentials();
  return createPlainClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Service-role client. BYPASSES row-level security.
 * Only for webhooks, cron jobs and audited admin operations — never for user requests.
 */
export function createServiceClient() {
  const { url } = supabaseCredentials();
  const key = serverEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (see README).");
  }
  return createPlainClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
