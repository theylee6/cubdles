"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/features/onboarding/errors";
import { loadOwnPhotos, type OwnPhoto } from "@/features/onboarding/data";
import { PhotoRejectedError, processPhoto } from "./processing";

export type PhotoActionResult = { ok: true; photos: OwnPhoto[] } | { ok: false; message: string };

const BUCKET = "profile-photos";

async function context() {
  if (!isSupabaseConfigured()) return null;
  const user = await getSessionUser();
  if (!user) return null;
  return { user, supabase: await createClient() };
}

const SIGNED_OUT: PhotoActionResult = { ok: false, message: "Your session has ended. Please log in again." };

/** Upload one photo: validate + re-encode on the server, store privately, record it as pending review. */
export async function uploadPhoto(formData: FormData): Promise<PhotoActionResult> {
  const ctx = await context();
  if (!ctx) return SIGNED_OUT;
  const { user, supabase } = ctx;

  const file = formData.get("photo");
  if (!(file instanceof File)) return { ok: false, message: "Choose a photo to upload." };

  const { data: position, error: posError } = await supabase.rpc("next_photo_position");
  if (posError) return { ok: false, message: friendlyDbError(posError) };
  if (position === null) return { ok: false, message: "You can have up to 6 photos. Remove one to add another." };

  let processed;
  try {
    processed = await processPhoto(new Uint8Array(await file.arrayBuffer()));
  } catch (e) {
    if (e instanceof PhotoRejectedError) return { ok: false, message: e.userMessage };
    console.error("photo processing failed", e);
    return { ok: false, message: "We couldn't process that photo. Please try another." };
  }

  const path = `${user.id}/${randomUUID()}.webp`;
  const upload = await supabase.storage.from(BUCKET).upload(path, processed.data, {
    contentType: processed.contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (upload.error) {
    console.error("photo upload failed", upload.error.message);
    return { ok: false, message: "The upload didn't finish. Please try again." };
  }

  const { error: insertError } = await supabase.from("photos").insert({
    profile_id: user.id,
    storage_path: path,
    position,
    width: processed.width,
    height: processed.height,
  });
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]); // don't leave orphaned files
    return { ok: false, message: friendlyDbError(insertError) };
  }

  revalidatePath("/onboarding/photos");
  return { ok: true, photos: await loadOwnPhotos(user.id) };
}

/** Delete a photo (row first, then file), then close the gap in positions. */
export async function deletePhoto(photoId: string): Promise<PhotoActionResult> {
  const ctx = await context();
  if (!ctx) return SIGNED_OUT;
  const { user, supabase } = ctx;

  const { data: removed, error } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId)
    .eq("profile_id", user.id)
    .select("storage_path")
    .maybeSingle();
  if (error) return { ok: false, message: friendlyDbError(error) };
  if (removed) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([removed.storage_path]);
    if (storageError) console.error("orphaned photo file", removed.storage_path, storageError.message); // swept by cleanup job (M8)
  }
  await supabase.rpc("compact_photo_positions");

  revalidatePath("/onboarding/photos");
  return { ok: true, photos: await loadOwnPhotos(user.id) };
}

/** Save a new order. `orderedIds` must contain every one of the member's photos. */
export async function reorderPhotos(orderedIds: string[]): Promise<PhotoActionResult> {
  const ctx = await context();
  if (!ctx) return SIGNED_OUT;
  const { user, supabase } = ctx;

  if (!Array.isArray(orderedIds) || orderedIds.length > 6 || orderedIds.some((id) => typeof id !== "string")) {
    return { ok: false, message: "That didn't work. Please refresh and try again." };
  }
  const { error } = await supabase.rpc("reorder_photos", { p_ids: orderedIds });
  if (error) return { ok: false, message: friendlyDbError(error) };

  revalidatePath("/onboarding/photos");
  return { ok: true, photos: await loadOwnPhotos(user.id) };
}
