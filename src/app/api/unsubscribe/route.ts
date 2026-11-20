import { NextResponse, type NextRequest } from "next/server";
import { verifyUnsubscribeToken } from "@/features/notifications/tokens";
import { createServiceClient } from "@/lib/supabase/server";

/** RFC 8058 one-click unsubscribe (mail apps POST here). Also used by the /unsubscribe page. */
export async function POST(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const u = p.get("u") ?? "";
  const k = p.get("k") ?? "";
  const t = p.get("t") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(u) || !verifyUnsubscribeToken(u, k, t)) {
    return NextResponse.json({ error: "invalid_link" }, { status: 400 });
  }
  const supabase = createServiceClient();
  const { data: current } = await supabase
    .from("notification_settings")
    .select("email_matches, email_messages")
    .eq("profile_id", u)
    .maybeSingle();
  const { error } = await supabase.from("notification_settings").upsert({
    profile_id: u,
    email_matches: k === "matches" ? false : (current?.email_matches ?? true),
    email_messages:
      k === "messages" ? false : (current?.email_messages ?? true),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("unsubscribe failed", error.code);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
