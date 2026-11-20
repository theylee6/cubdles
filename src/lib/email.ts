import "server-only";
import { serverEnv } from "@/lib/env.server";

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** e.g. List-Unsubscribe headers */
  headers?: Record<string, string>;
};

export function isEmailConfigured(): boolean {
  return Boolean(serverEnv.RESEND_API_KEY);
}

/** Sends one email through Resend's HTTP API. Throws with a short reason on failure. */
export async function sendEmail(email: Email): Promise<void> {
  const key = serverEnv.RESEND_API_KEY;
  if (!key) throw new Error("email_not_configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: serverEnv.EMAIL_FROM,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: email.headers,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`resend_${res.status}: ${body.slice(0, 200)}`);
  }
}
