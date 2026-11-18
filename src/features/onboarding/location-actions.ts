"use server";

import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { countryName } from "./options";

export type CityResult = { id: number; name: string; country: string; countryCode: string };

/** City search for the location step (2+ characters, world cities, largest first). */
export async function searchCitiesAction(query: string): Promise<CityResult[]> {
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 80) return [];
  const user = await getSessionUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_cities", { p_query: query.trim(), p_limit: 8 });
  return (data ?? []).map((c) => ({ id: c.id, name: c.name, countryCode: c.country_code, country: countryName(c.country_code) ?? c.country_code }));
}

/** Keep the stored time zone current (travel, DST region changes). Invalid names are ignored by the DB. */
export async function syncTimezoneAction(timezone: string): Promise<void> {
  if (typeof timezone !== "string" || timezone.length > 64) return;
  const user = await getSessionUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.rpc("set_timezone", { p_timezone: timezone });
}
