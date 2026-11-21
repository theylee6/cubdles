import { cleanValue, EnvError, isEmail, normalizeUrl } from "./env-parse";

/**
 * Public environment variables (safe for the browser).
 * Server-only secrets are read in src/lib/env.server.ts and never imported by client code.
 * NEXT_PUBLIC_* values are inlined at build time, so each is read by its literal name.
 */
function siteUrl(): string {
  const explicit = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit;
  if (explicit === null) {
    console.warn(
      "NEXT_PUBLIC_SITE_URL is not a valid web address; falling back to the deployment URL.",
    );
  }
  // Vercel exposes the production domain automatically.
  return (
    normalizeUrl(process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) ||
    "http://localhost:3000"
  );
}

function supabaseUrl(): string | undefined {
  const url = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (url === null) {
    throw new EnvError(
      "NEXT_PUBLIC_SUPABASE_URL",
      "is not a valid web address (expected https://<ref>.supabase.co)",
    );
  }
  return url;
}

function supportEmail(): string | undefined {
  const v = cleanValue(process.env.NEXT_PUBLIC_SUPPORT_EMAIL);
  if (v && !isEmail(v)) {
    console.warn(
      "NEXT_PUBLIC_SUPPORT_EMAIL is not a valid email address; ignoring it.",
    );
    return undefined;
  }
  return v;
}

function publishableKey(): string | undefined {
  const v = cleanValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (v && v.length < 20)
    throw new EnvError(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "looks incomplete",
    );
  return v;
}

/** Social sign-in providers switched on in Supabase (comma-separated, e.g. "google,apple"). Hidden otherwise. */
function authProviders(): ("google" | "apple")[] {
  const raw = cleanValue(process.env.NEXT_PUBLIC_AUTH_PROVIDERS) ?? "";
  return raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is "google" | "apple" => p === "google" || p === "apple");
}

export const publicEnv = {
  NEXT_PUBLIC_SITE_URL: siteUrl(),
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey(),
  NEXT_PUBLIC_SUPPORT_EMAIL: supportEmail(),
  NEXT_PUBLIC_AUTH_PROVIDERS: authProviders(),
  /** Registered business name and address, shown on Contact and Refunds (required by payment providers). */
  NEXT_PUBLIC_BUSINESS_NAME: cleanValue(process.env.NEXT_PUBLIC_BUSINESS_NAME),
  NEXT_PUBLIC_BUSINESS_ADDRESS: cleanValue(
    process.env.NEXT_PUBLIC_BUSINESS_ADDRESS,
  ),
  /** Web push public key (VAPID); push is offered only when set. */
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: cleanValue(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  ),
} as const;

/** True only when Supabase has been configured. Features that need it say so instead of pretending. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL &&
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function supabaseCredentials() {
  if (!isSupabaseConfigured()) {
    throw new SupabaseNotConfiguredError();
  }
  return {
    url: publicEnv.NEXT_PUBLIC_SUPABASE_URL as string,
    anonKey: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
  };
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see README).",
    );
    this.name = "SupabaseNotConfiguredError";
  }
}
