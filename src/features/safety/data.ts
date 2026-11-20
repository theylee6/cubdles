import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type SafetyNotice = Pick<
  Tables<"safety_notices">,
  "id" | "kind" | "subject_name" | "last_contact_at" | "reason" | "created_at"
>;

export async function getOpenSafetyNotices(): Promise<SafetyNotice[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("safety_notices")
    .select("id, kind, subject_name, last_contact_at, reason, created_at")
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(5);
  return data ?? [];
}
