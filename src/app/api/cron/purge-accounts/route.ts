import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env.server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Daily job: permanently deletes accounts whose deletion was requested more than 30 days ago.
 * Removes their photos from storage, then deletes the auth user (which cascades to all profile data).
 * Protected by CRON_SECRET (Vercel Cron sends it as a Bearer token).
 */
export async function GET(request: NextRequest) {
  const secret = serverEnv.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const admin = createServiceClient();
  const cutoff = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data: due, error } = await admin
    .from("profile_private")
    .select("profile_id, profiles!inner(status)")
    .lt("deletion_requested_at", cutoff)
    .eq("profiles.status", "deleted")
    .limit(100);
  if (error) return NextResponse.json({ error: "query_failed" }, { status: 500 });

  const results: { id: string; ok: boolean; step?: string }[] = [];
  for (const { profile_id: id } of due ?? []) {
    const { data: files } = await admin.storage.from("profile-photos").list(id, { limit: 1000 });
    if (files?.length) {
      const { error: rmError } = await admin.storage.from("profile-photos").remove(files.map((f) => `${id}/${f.name}`));
      if (rmError) {
        results.push({ id, ok: false, step: "storage" });
        continue;
      }
    }
    const { error: delError } = await admin.auth.admin.deleteUser(id);
    results.push(delError ? { id, ok: false, step: "auth" } : { id, ok: true });
  }

  const failed = results.filter((r) => !r.ok).length;
  console.info("purge-accounts", { purged: results.length - failed, failed });
  return NextResponse.json({ purged: results.length - failed, failed }, { status: failed ? 207 : 200 });
}
