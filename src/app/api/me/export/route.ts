import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { LIMITS, allow } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

/** "Download my data": everything we hold about the signed-in member, as a JSON file. */
export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!(await allow(LIMITS.exportUser, user.id)))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_my_data");
  if (error || !data) {
    console.error("export_my_data failed", error?.code);
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="cubdles-data-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
