"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { type FormState, contactSchema, fieldErrors } from "@/lib/auth/schemas";
import { createAnonClient } from "@/lib/supabase/server";
import { LIMITS, allow, clientIp } from "@/lib/rate-limit";

export async function sendContactMessage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = contactSchema.safeParse(raw);
  const values = {
    name: raw.name ?? "",
    email: raw.email ?? "",
    topic: raw.topic ?? "general",
    message: raw.message ?? "",
  };

  if (!parsed.success) {
    // Honeypot filled: pretend success so bots learn nothing.
    if (raw.website)
      return { ok: true, message: "Thanks — we've received your message." };
    return { ok: false, errors: fieldErrors(parsed.error), values };
  }
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Our contact form isn't connected yet. Please try again later.",
      values,
    };
  }

  if (!(await allow(LIMITS.contactIp, await clientIp()))) {
    return {
      ok: false,
      message:
        "You've sent several messages already. Please wait an hour, or email us directly.",
      values,
    };
  }

  const { name, email, topic, message } = parsed.data;
  const supabase = createAnonClient();
  const { error } = await supabase
    .from("contact_messages")
    .insert({ name, email, topic, message });
  if (error) {
    console.error("contact insert failed", error.code);
    return {
      ok: false,
      message: "We couldn't send that just now. Please try again.",
      values,
    };
  }
  return {
    ok: true,
    message: "Thanks — we've received your message and will reply by email.",
  };
}
