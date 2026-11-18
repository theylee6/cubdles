import "server-only";
import { z } from "zod";

/** Server-only secrets. Importing this file from a client component fails the build. */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  CRON_SECRET: z.string().min(32).optional(),
});

export const serverEnv = serverSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
  CRON_SECRET: process.env.CRON_SECRET || undefined,
});
