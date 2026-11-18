import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FeatureKey = "see_likes" | "advanced_filters" | "undo" | "incognito" | "note_with_like" | "boosts";
export type MyFeatures = Record<FeatureKey, boolean>;

const NONE: MyFeatures = { see_likes: false, advanced_filters: false, undo: false, incognito: false, note_with_like: false, boosts: false };

/** Which plan features the member has. Used only to shape the UI — the database enforces every one. */
export async function getMyFeatures(): Promise<MyFeatures> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_features");
  if (error || !data) return NONE;
  return { ...NONE, ...(data as Partial<MyFeatures>) };
}
