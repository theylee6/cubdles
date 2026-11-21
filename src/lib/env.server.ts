import "server-only";
import { cleanValue } from "./env-parse";

/**
 * Server-only secrets. Importing this file from a client component fails the build.
 * A missing or malformed secret never breaks the build: the feature that needs it refuses to run
 * and logs why (e.g. the purge cron refuses every call without a valid CRON_SECRET).
 */
type SecretName =
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "CRON_SECRET"
  | "NOTIFY_DISPATCH_SECRET"
  | "RESEND_API_KEY"
  | "RAZORPAY_KEY_SECRET"
  | "RAZORPAY_WEBHOOK_SECRET"
  | "VAPID_PRIVATE_KEY";

function secret(name: SecretName, minLength: number): string | undefined {
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
  /** Shared with the database scheduler that calls /api/notifications/dispatch. */
  NOTIFY_DISPATCH_SECRET: secret("NOTIFY_DISPATCH_SECRET", 32),
  RESEND_API_KEY: secret("RESEND_API_KEY", 10),
  EMAIL_FROM:
    cleanValue(process.env.EMAIL_FROM) ?? "Cubdles <no-reply@cubdles.com>",
  RAZORPAY_KEY_ID: cleanValue(process.env.RAZORPAY_KEY_ID),
  RAZORPAY_KEY_SECRET: secret("RAZORPAY_KEY_SECRET", 10),
  RAZORPAY_WEBHOOK_SECRET: secret("RAZORPAY_WEBHOOK_SECRET", 8),
  VAPID_PRIVATE_KEY: secret("VAPID_PRIVATE_KEY", 20),
  VAPID_SUBJECT: cleanValue(process.env.VAPID_SUBJECT) ?? "https://cubdles.com",
} as const;
