import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseCredentials } from "@/lib/env";
import { isStepSlug } from "@/features/onboarding/steps";
import { isEditSection } from "@/features/settings/sections";

/** Paths that require a signed-in user. Real authorisation still happens on the server and in RLS. */
const PROTECTED_PREFIXES = ["/app", "/onboarding"];

/**
 * Refreshes the Supabase session cookie on every request and does an optimistic
 * redirect for protected pages. This is not the security boundary — RLS is.
 */
export async function proxy(request: NextRequest) {
  // Unknown onboarding steps are a hard 404 (Cache Components streams pages, so the page itself can't set the status).
  const stepMatch = request.nextUrl.pathname.match(/^\/onboarding\/([^/]+)\/?$/);
  const editMatch = request.nextUrl.pathname.match(/^\/app\/me\/edit\/([^/]+)\/?$/);
  if ((stepMatch && !isStepSlug(decodeURIComponent(stepMatch[1]))) || (editMatch && !isEditSection(decodeURIComponent(editMatch[1])))) {
    return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  }

  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const { url, anonKey } = supabaseCredentials();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Validates the JWT with Supabase and refreshes it when needed.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  if (!signedIn && PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static files and images.
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
