import { NextResponse, type NextRequest } from "next/server";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { bearerMatches } from "@/features/notifications/tokens";
import { isEmailConfigured } from "@/lib/email";
import { isPushConfigured } from "@/lib/push";
import { serverEnv } from "@/lib/env.server";

/**
 * Sends due notification emails. Called every few minutes by the database scheduler (pg_cron + pg_net,
 * see supabase/setup/notifications.sql) and once a day by Vercel Cron as a safety net.
 */
async function handle(request: NextRequest) {
  if (
    !bearerMatches(
      request.headers.get("authorization"),
      serverEnv.NOTIFY_DISPATCH_SECRET,
      serverEnv.CRON_SECRET,
    )
  ) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  // With no channel set up, leave everything queued so nothing is lost.
  if ((!isEmailConfigured() && !isPushConfigured()) || !serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }
  try {
    const result = await dispatchNotifications(50);
    return NextResponse.json(result);
  } catch (e) {
    console.error("dispatch failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "dispatch_failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
