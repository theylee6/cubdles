"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS, reportErrorKey, reportErrorText } from "./copy";

const reportSchema = z.object({
  reportedId: z.uuid(),
  reason: z.enum(REPORT_REASONS.map((r) => r.value) as [string, ...string[]]),
  details: z
    .string()
    .trim()
    .max(1000, "Please keep the details under 1,000 characters.")
    .optional(),
  matchId: z.uuid().optional(),
  block: z.boolean(),
});

export type ReportResult =
  | { ok: true; blocked: boolean }
  | { ok: false; message: string; field?: "reason" | "details" };

export async function reportAction(
  input: z.input<typeof reportSchema>,
): Promise<ReportResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field =
      issue?.path[0] === "details"
        ? "details"
        : issue?.path[0] === "reason"
          ? "reason"
          : undefined;
    return {
      ok: false,
      message:
        field === "reason"
          ? "Choose what happened."
          : (issue?.message ?? "Please check the form."),
      field,
    };
  }
  const { reportedId, reason, details, matchId, block } = parsed.data;
  if (reason === "other" && !details)
    return {
      ok: false,
      message: reportErrorText("details_required"),
      field: "details",
    };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_report", {
    p_reported: reportedId,
    p_reason: reason as (typeof REPORT_REASONS)[number]["value"],
    p_details: details || undefined,
    p_match_id: matchId ?? undefined,
    p_block: block,
  });
  if (error) {
    const code = reportErrorKey(error.message);
    if (code === "unknown") console.error("create_report failed", error.code);
    return {
      ok: false,
      message: reportErrorText(code),
      field:
        code === "details_required" || code === "details_too_long"
          ? "details"
          : undefined,
    };
  }
  if (block) revalidatePath("/app", "layout");
  return { ok: true, blocked: block };
}

export async function dismissNoticeAction(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.rpc("dismiss_safety_notice", { p_id: id });
  revalidatePath("/app", "layout");
}
