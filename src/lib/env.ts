import { z } from "zod";

/**
 * Public environment variables (safe for the browser).
 * Server-only secrets are read in src/lib/env.server.ts and never imported by client code.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.email().optional(),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
  NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || undefined,
});

/** True only when Supabase has been configured. Features that need it say so instead of pretending. */
export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function supabaseCredentials() {
  if (!isSupabaseConfigured()) {
    throw new SupabaseNotConfiguredError();
  }
  return {
    url: publicEnv.NEXT_PUBLIC_SUPABASE_URL as string,
    anonKey: publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  };
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see README).",
    );
    this.name = "SupabaseNotConfiguredError";
  }
}
