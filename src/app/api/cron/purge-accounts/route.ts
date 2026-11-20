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
  if (error)
    return NextResponse.json({ error: "query_failed" }, { status: 500 });

  const results: { id: string; ok: boolean; step?: string }[] = [];
  for (const { profile_id: id } of due ?? []) {
    let storageOk = true;
    for (const bucket of ["profile-photos", "verification-selfies"]) {
      const { data: files } = await admin.storage.from(bucket).list(id, { limit: 1000 });
      if (files?.length) {
        const { error: rmError } = await admin.storage.from(bucket).remove(files.map((f) => `${id}/${f.name}`));
        if (rmError) storageOk = false;
      }
    }
    if (!storageOk) {
      results.push({ id, ok: false, step: "storage" });
      continue;
    }
    const { error: delError } = await admin.auth.admin.deleteUser(id);
    results.push(delError ? { id, ok: false, step: "auth" } : { id, ok: true });
  }

  // Daily sweep of files nothing points at any more (failed deletes, abandoned selfies).
  let swept = 0;
  const { data: orphans, error: orphanError } = await admin.rpc("orphaned_storage_files", { p_limit: 500 });
  if (orphanError) console.error("orphan listing failed", orphanError.code);
  for (const bucket of ["profile-photos", "verification-selfies"]) {
    const paths = (orphans ?? []).filter((o) => o.bucket === bucket).map((o) => o.path);
    if (!paths.length) continue;
    const { error: sweepError } = await admin.storage.from(bucket).remove(paths);
    if (sweepError) console.error("orphan sweep failed", bucket, sweepError.message);
    else swept += paths.length;
  }

  const failed = results.filter((r) => !r.ok).length;
  console.info("purge-accounts", { purged: results.length - failed, failed, swept });
  return NextResponse.json(
    { purged: results.length - failed, failed, swept },
    { status: failed ? 207 : 200 },
  );
}
