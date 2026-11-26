import "server-only";
import Link from "next/link";
import { Notice } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/server";

type PhotoCounts = { total: number; approved: number; pending: number };

/** Counts of the member's own photos by review state (own rows are readable under RLS). */
async function myPhotoCounts(memberId: string): Promise<PhotoCounts | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("moderation_status")
    .eq("profile_id", memberId);
  if (error) return null;
  return {
    total: data.length,
    approved: data.filter((p) => p.moderation_status === "approved").length,
    pending: data.filter((p) => p.moderation_status === "pending").length,
  };
}

/**
 * Tells members when others can't see them yet: profiles appear in Discover only
 * with at least one approved photo. Renders nothing once they're visible.
 */
export async function VisibilityNotice({
  memberId,
  className,
}: {
  memberId: string;
  className?: string;
}) {
  const c = await myPhotoCounts(memberId);
  if (!c || c.approved > 0) return null;
  const link = (
    <Link
      href="/app/me/edit/photos"
      className="text-clay underline underline-offset-4"
    >
      {c.total ? "Manage photos" : "Add a photo"}
    </Link>
  );
  if (c.pending > 0) {
    return (
      <Notice title="You're not visible to others yet" className={className}>
        Your {c.pending === 1 ? "photo is" : "photos are"} waiting for a quick
        safety review. You&rsquo;ll appear in Discover as soon as one is
        approved — usually within a few hours. {link}.
      </Notice>
    );
  }
  return (
    <Notice
      tone="warning"
      title="You're not visible to others yet"
      className={className}
    >
      {c.total
        ? "None of your photos were approved. Add a clear photo of yourself to appear in Discover."
        : "Add at least one photo of yourself — people only appear in Discover once a photo is approved."}{" "}
      {link}.
    </Notice>
  );
}
