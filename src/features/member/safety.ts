import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  parseSafetyAdvisory,
  type SafetyAdvisory,
} from "./safety-advisory-data";

/** The safety advisory for the member's current country, or null. Never blocks the page on failure. */
export async function getSafetyAdvisory(): Promise<SafetyAdvisory | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_safety_advisory");
  if (error) return null;
  return parseSafetyAdvisory(data);
}
