import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";

const ALLOWED: EmailOtpType[] = ["signup", "email", "recovery", "email_change", "invite", "magiclink"];

/**
 * Email links (confirm signup, password recovery, email change) land here. Two shapes are accepted:
 *  - Supabase's default templates ({{ .ConfirmationURL }}): Supabase verifies the link, then redirects
 *    here with a one-time `code` (PKCE), which we exchange for a session.
 *  - Custom templates (needs custom SMTP):
 *    {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<type>&next=<path>
 *    which also works when the link is opened in a different browser.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");

  if (code && !tokenHash && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // The code only works in the browser that started sign-up; elsewhere, ask them to log in instead.
    return NextResponse.redirect(new URL(error ? "/login?error=link_other_browser" : next, origin));
  }

  if (!tokenHash || !type || !ALLOWED.includes(type) || !isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?error=link", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(new URL("/login?error=link", origin));
  }
  return NextResponse.redirect(new URL(next, origin));
}
