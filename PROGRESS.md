# Cubdles — development progress

Last updated: 2026-11-18. Defaults D2–D10 from the Phase 1 plan are assumed (India launch, romantic only, mutual-match messaging) until the owner says otherwise.

## Milestone status

| Milestone | Status |
| --- | --- |
| M0 Setup | **Mostly done** — repo, scripts, env example, CI workflow, README. Waiting on: GitHub repo, Vercel and Supabase accounts |
| M1 Design system + public site | **Done (first pass)** — tokens, fonts, components, all 11 public pages, auth pages. Owner review of the visual direction pending |
| M2 Auth, onboarding, profiles | **Started** — migration 1 (identity, privacy, photos, blocks, staff, plans) with RLS and 51 passing DB tests; sign-up/login/reset/OAuth actions. Onboarding screens not built |
| M3–M8 | Not started |

## Completed

- Next.js 16 app (App Router, Cache Components, TS strict), Tailwind 4, self-hosted Fraunces + Figtree.
- "Linen & Clay" tokens; contrast checked (clay darkened to #A04F37 so it passes AA on every surface).
- Cubdles wordmark (leaning **bd**) and bd mark / app icon.
- Components: Button/ButtonLink, Input/Textarea/Select/Field, Card, Chip, AffectionBadge, Eyebrow, SectionHeading, Notice, illustrations.
- Public pages: Home, How it works, About, Membership/pricing (reads plans from DB, no hardcoded prices), Safety centre, FAQ, Contact (stores to `contact_messages`), Terms, Privacy, Community guidelines (marked as drafts), Join, Log in, Reset password, 404, error boundary.
- SEO: metadata per page, sitemap, robots, web manifest, icon.
- Auth: email+password sign-up (server-validated, 18+ and terms confirmation), login, Google/Apple OAuth, email confirm + recovery routes, password reset, sign-out, session refresh in `proxy.ts`, protected `/app`.
- Database migration 1 with RLS on every table, column-level grants, storage bucket policies, age-gate (under-18 suspended + email blocked), location rounding, onboarding completion checks, audited staff status changes.
- Tests: 24 unit, 51 database permission, 36 end-to-end (mobile + desktop, axe WCAG 2.2 AA).

## Pending (next up)

1. Onboarding flow screens (M2): date of birth → name/gender → intentions → location → affection profile → interests/lifestyle → photos (upload, EXIF strip, reorder) → prompts → review.
2. Phone OTP (needs SMS provider + DLT registration).
3. Rate limiting (Upstash) on sign-up, login, contact form.
4. Profile editing, privacy settings, account deletion workflow.

## Known issues / limitations

- **Contact form has no rate limiting yet** (honeypot only). Add Upstash before launch.
- **Legal pages are drafts** and need a lawyer's review (D8). Grievance Officer details not published.
- **Signed-in `/app` page is an interim home**: it says plainly that profile set-up is coming next.
- `profiles.is_incognito` is owner-editable; the premium entitlement check will move it behind a function in M6.
- Database tests use a minimal Supabase stub (`tests/db/_supabase_stub.sql`); also run them against a real Supabase project (`supabase test db`) once one exists.
- E2E tests run against an unconfigured build; auth journeys against a real Supabase staging project come with M2.
