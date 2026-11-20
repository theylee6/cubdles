"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PhotoRejectedError, processPhoto } from "@/features/photos/processing";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { verificationErrorText } from "./copy";

type Result = { ok: true } | { ok: false; message: string };
const BUCKET = "verification-selfies";

export async function startVerificationAction(): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_verification");
  if (error)
    return { ok: false, message: verificationErrorText(error.message) };
  revalidatePath("/app/me");
  return { ok: true };
}

/** Selfie: validated and re-encoded like profile photos (metadata stripped), stored privately. */
export async function submitSelfieAction(formData: FormData): Promise<Result> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Please log in again." };
  const requestId = formData.get("requestId");
  const file = formData.get("selfie");
  if (typeof requestId !== "string" || !z.uuid().safeParse(requestId).success)
    return { ok: false, message: verificationErrorText("not_found") };
  if (!(file instanceof File))
    return { ok: false, message: "Take or choose a selfie first." };

  let processed;
  try {
    processed = await processPhoto(new Uint8Array(await file.arrayBuffer()));
  } catch (e) {
    if (e instanceof PhotoRejectedError)
      return { ok: false, message: e.userMessage };
    return {
      ok: false,
      message: "We couldn't read that photo. Please try another.",
    };
  }

  const supabase = await createClient();
  const path = `${user.id}/${randomUUID()}.webp`;
  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, processed.data, {
      contentType: processed.contentType,
      upsert: false,
    });
  if (upload.error) {
    console.error("selfie upload failed", upload.error.message);
    return {
      ok: false,
      message: "The upload didn't finish. Please try again.",
    };
  }
  const { error } = await supabase.rpc("submit_verification", {
    p_request: requestId,
    p_path: path,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, message: verificationErrorText(error.message) };
  }
  revalidatePath("/app/me");
  return { ok: true };
}
