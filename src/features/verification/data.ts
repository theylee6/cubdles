import "server-only";
import { createClient } from "@/lib/supabase/server";

export type VerificationState =
  | { state: "verified"; since: string }
  | { state: "awaiting_photo"; requestId: string; pose: string }
  | { state: "pending" }
  | { state: "none"; lastRejection: string | null };

export async function getVerificationState(
  userId: string,
): Promise<VerificationState> {
  const supabase = await createClient();
  const [{ data: profile }, { data: requests }] = await Promise.all([
    supabase.from("profiles").select("verified_at").eq("id", userId).single(),
    supabase
      .from("verification_requests")
      .select("id, pose, status, note")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (profile?.verified_at)
    return { state: "verified", since: profile.verified_at };
  const last = requests?.[0];
  if (last?.status === "awaiting_photo")
    return { state: "awaiting_photo", requestId: last.id, pose: last.pose };
  if (last?.status === "pending") return { state: "pending" };
  return {
    state: "none",
    lastRejection:
      last?.status === "rejected" ? (last.note ?? "It didn't match") : null,
  };
}
