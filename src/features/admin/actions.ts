"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; message?: string } | { ok: false; message: string };

function staffError(raw: string | undefined): string {
  const t = raw ?? "";
  if (t.includes("forbidden")) return "You don't have permission to do that.";
  if (t.includes("reason_required"))
    return "Please give a reason (at least 3 characters).";
  if (t.includes("already_resolved"))
    return "Someone already resolved this report.";
  if (t.includes("account_gone"))
    return "That account no longer exists; you can only dismiss this report.";
  if (t.includes("not_found")) return "We couldn't find that.";
  return "That didn't work. Please try again.";
}

export async function moderatePhotoAction(
  photoId: string,
  approve: boolean,
  note?: string,
): Promise<Result> {
  if (!z.uuid().safeParse(photoId).success)
    return { ok: false, message: "That didn't work." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_moderate_photo", {
    p_photo: photoId,
    p_approve: approve,
    p_note: note ?? null,
  });
  if (error) return { ok: false, message: staffError(error.message) };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const resolveSchema = z.object({
  reportId: z.uuid(),
  action: z.enum(["dismiss", "warn", "suspend", "ban"]),
  note: z
    .string()
    .trim()
    .min(3, "Please give a reason (at least 3 characters).")
    .max(1000),
  fraud: z.boolean(),
});

export async function resolveReportAction(
  input: z.input<typeof resolveSchema>,
): Promise<Result> {
  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Please check the form.",
    };
  const { reportId, action, note, fraud } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_resolve_report", {
    p_report: reportId,
    p_action: action,
    p_note: note,
    p_fraud: action === "ban" && fraud,
  });
  if (error) return { ok: false, message: staffError(error.message) };
  revalidatePath("/admin", "layout");
  const notified = Number(
    (data as { fraud_notices?: number } | null)?.fraud_notices ?? 0,
  );
  return {
    ok: true,
    message: notified
      ? `Fraud-ban notice sent to ${notified} member${notified === 1 ? "" : "s"}.`
      : undefined,
  };
}

export async function decideVerificationAction(
  requestId: string,
  approve: boolean,
  note?: string,
): Promise<Result> {
  if (!z.uuid().safeParse(requestId).success)
    return { ok: false, message: "That didn't work." };
  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc(
    "staff_decide_verification",
    { p_request: requestId, p_approve: approve, p_note: note ?? null },
  );
  if (error) return { ok: false, message: staffError(error.message) };
  // The selfie is only needed for this decision: delete it now.
  if (path) {
    const { error: rmError } = await supabase.storage
      .from("verification-selfies")
      .remove([path]);
    if (rmError) console.error("selfie delete failed", rmError.message);
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}
