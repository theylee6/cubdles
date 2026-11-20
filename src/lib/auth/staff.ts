import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireUser, type SessionUser } from "./session";

/** Staff roles of the signed-in user (empty for members). */
export const getStaffRoles = cache(async (): Promise<string[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_staff_roles");
  return error ? [] : (data ?? []);
});

/**
 * Gate for the admin area. Non-staff get a 404 (we don't reveal that the area exists).
 * The database checks the role again on every staff function.
 */
export async function requireModerator(
  next = "/admin",
): Promise<SessionUser & { roles: string[] }> {
  const user = await requireUser(next);
  const roles = await getStaffRoles();
  if (!roles.includes("moderator") && !roles.includes("admin")) notFound();
  return { ...user, roles };
}
