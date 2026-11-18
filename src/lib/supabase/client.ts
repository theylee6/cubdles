"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseCredentials } from "@/lib/env";

/** Browser client: only ever uses the public anon key. Row-level security applies. */
export function createClient() {
  const { url, anonKey } = supabaseCredentials();
  return createBrowserClient(url, anonKey);
}
