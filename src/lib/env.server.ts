import "server-only";
import { cleanValue } from "./env-parse";

/**
 * Server-only secrets. Importing this file from a client component fails the build.
 * A missing or malformed secret never breaks the build: the feature that needs it refuses to run
 * and logs why (e.g. the purge cron refuses every call without a valid CRON_SECRET).
 */
function secret(
  name: "SUPABASE_SERVICE_ROLE_KEY" | "CRON_SECRET",
  minLength: number,
): string | undefined {
  const v = cleanValue(process.env[name]);
  if (v && v.length < minLength) {
    console.warn(
      `${name} is shorter than ${minLength} characters and will be ignored.`,
    );
    return undefined;
  }
  return v;
}

export const serverEnv = {
  SUPABASE_SERVICE_ROLE_KEY: secret("SUPABASE_SERVICE_ROLE_KEY", 20),
  CRON_SECRET: secret("CRON_SECRET", 32),
} as const;
