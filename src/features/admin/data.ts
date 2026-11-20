import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

const SIGNED_TTL = 60 * 10;
type Client = Awaited<ReturnType<typeof createClient>>;

async function sign(
  supabase: Client,
  paths: string[],
): Promise<Map<string, string>> {
  if (!paths.length) return new Map();
  const { data } = await supabase.storage
    .from("profile-photos")
    .createSignedUrls(paths, SIGNED_TTL);
  return new Map(
    (data ?? []).flatMap((d) =>
      d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [],
    ),
  );
}

export type QueueCounts = {
  pendingPhotos: number;
  openReports: number;
  urgentReports: number;
};

export async function getQueueCounts(): Promise<QueueCounts> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_queue_counts");
  const c = z
    .object({
      pending_photos: z.number(),
      open_reports: z.number(),
      urgent_reports: z.number(),
    })
    .safeParse(data);
  return c.success
    ? {
        pendingPhotos: c.data.pending_photos,
        openReports: c.data.open_reports,
        urgentReports: c.data.urgent_reports,
      }
    : { pendingPhotos: 0, openReports: 0, urgentReports: 0 };
}

export type PendingPhoto = {
  id: string;
  profileId: string;
  name: string;
  profileStatus: string;
  uploadedAt: string;
  url: string | null;
};

export async function getPendingPhotos(): Promise<PendingPhoto[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_pending_photos", { p_limit: 60 });
  const rows = data ?? [];
  const urls = await sign(
    supabase,
    rows.map((r) => r.storage_path),
  );
  return rows.map((r) => ({
    id: r.photo_id,
    profileId: r.profile_id,
    name: r.display_name ?? "(no name yet)",
    profileStatus: r.profile_status,
    uploadedAt: r.uploaded_at,
    url: urls.get(r.storage_path) ?? null,
  }));
}

export type ReportRow = NonNullable<
  Awaited<ReturnType<typeof listReports>>
>[number];

export async function listReports(status: Enums<"report_status">) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_list_reports", {
    p_status: status,
    p_limit: 200,
  });
  return data ?? [];
}

const detailSchema = z.object({
  report: z.object({
    id: z.string(),
    reason: z.string(),
    details: z.string().nullable(),
    priority: z.string(),
    status: z.string(),
    action: z.string().nullable(),
    resolution: z.string().nullable(),
    created_at: z.string(),
    reviewed_at: z.string().nullable(),
    match_id: z.string().nullable(),
    message_id: z.string().nullable(),
    reporter_id: z.string().nullable(),
    reported_id: z.string().nullable(),
  }),
  reported: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      status: z.string(),
      status_reason: z.string().nullable(),
      joined_at: z.string(),
      country_code: z.string().nullable(),
    })
    .nullable(),
  reporter: z
    .object({ id: z.string(), name: z.string().nullable(), status: z.string() })
    .nullable(),
  history: z.array(
    z.object({
      reason: z.string(),
      status: z.string(),
      created_at: z.string(),
    }),
  ),
  photos: z.array(
    z.object({ id: z.string(), path: z.string(), status: z.string() }),
  ),
  messages: z.array(
    z.object({
      id: z.string(),
      sender_id: z.string(),
      body: z.string(),
      created_at: z.string(),
    }),
  ),
});

export type ReportDetail = z.infer<typeof detailSchema> & {
  photoUrls: Record<string, string>;
};

/** Full context for one report. Opening it is recorded in the audit log by the database. */
export async function getReportDetail(
  id: string,
): Promise<ReportDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_report_detail", {
    p_report: id,
  });
  if (error) return null;
  const parsed = detailSchema.safeParse(data);
  if (!parsed.success) {
    console.error(
      "staff_report_detail: unexpected shape",
      parsed.error.issues[0]?.path,
    );
    return null;
  }
  const urls = await sign(
    supabase,
    parsed.data.photos.map((p) => p.path),
  );
  return { ...parsed.data, photoUrls: Object.fromEntries(urls) };
}

export type PendingVerification = {
  id: string;
  profileId: string;
  name: string;
  pose: string;
  selfieUrl: string | null;
  photoUrls: string[];
  submittedAt: string;
};

export async function getPendingVerifications(): Promise<
  PendingVerification[]
> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_pending_verifications", {
    p_limit: 50,
  });
  const rows = data ?? [];
  const selfiePaths = rows.flatMap((r) =>
    r.selfie_path ? [r.selfie_path] : [],
  );
  const { data: selfies } = selfiePaths.length
    ? await supabase.storage
        .from("verification-selfies")
        .createSignedUrls(selfiePaths, SIGNED_TTL)
    : { data: [] };
  const selfieUrls = new Map(
    (selfies ?? []).flatMap((d) =>
      d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [],
    ),
  );
  const photoUrls = await sign(
    supabase,
    rows.flatMap((r) => r.photo_paths ?? []),
  );
  return rows.map((r) => ({
    id: r.request_id,
    profileId: r.profile_id,
    name: r.display_name ?? "(no name)",
    pose: r.pose,
    selfieUrl: r.selfie_path ? (selfieUrls.get(r.selfie_path) ?? null) : null,
    photoUrls: (r.photo_paths ?? []).flatMap((p) =>
      photoUrls.get(p) ? [photoUrls.get(p)!] : [],
    ),
    submittedAt: r.submitted_at,
  }));
}
