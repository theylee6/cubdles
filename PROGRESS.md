# Cubdles — development progress

Last updated: 2026-11-18 (profile set-up added). Defaults D2–D10 from the Phase 1 plan are assumed (India launch, romantic only, mutual-match messaging) until the owner says otherwise.

## Milestone status

| Milestone | Status |
| --- | --- |
| M0 Setup | **Mostly done** — repo, scripts, env example, CI workflow, README. Waiting on: GitHub repo, Vercel and Supabase accounts |
| M1 Design system + public site | **Done (temporary UI)** — the owner is designing in Figma; current UI is a placeholder layer over reusable components |
| M2 Auth, onboarding, profiles | **Profile set-up done** — 10-step resumable onboarding, photo pipeline, affection profile, prompts, migration 2. Still to do: phone OTP, profile editing/settings, account deletion, rate limiting |
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
- Tests: 47 unit (incl. EXIF/GPS stripping), 90 database permission, 40 end-to-end (mobile + desktop, axe WCAG 2.2 AA).

## Profile set-up (onboarding) — how it works

- Steps live in `src/features/onboarding/steps.ts` (single registry). `profiles.onboarding_step` = steps completed; a DB trigger stops it moving backwards. `/onboarding` resumes at the first unfinished step; members can revisit finished steps but not skip ahead.
- Each step = presentational client component (`components/`) + Zod schema (`schemas.ts`) + server action (`actions.ts`, shared `runStep` wrapper: auth → must be onboarding → validate → write → record progress → next step).
- Multi-row writes are atomic SQL functions: `set_profile_interests`, `set_profile_prompts`, `reorder_photos`, `compact_photo_positions`, `next_photo_position`. `complete_onboarding` checks every requirement server-side.
- Photos: browser downscales/re-encodes (handles HEIC on Safari) → server checks magic bytes, size (≤4 MB), dimensions (≥400 px) → sharp applies orientation, strips all metadata (EXIF/GPS), caps at 1600 px, re-encodes WebP → private bucket `<uid>/<uuid>.webp` → `photos` row as `pending`. Shown to the owner via 1-hour signed URLs.
- Location: device location rounded to 2 decimals in the browser and again in the DB, or a launch city. Only the city name is shown.
- Dev-only preview of every step: `pnpm dev` → `/dev/onboarding` (404 in production).

## Pending (next up)

1. Profile editing and settings (reuse the step components and `PhotoManager`), privacy settings, account deletion workflow.
2. Photo moderation: automated scan provider + moderator queue (M5). Until then photos stay `pending` and need approving in the database.
3. Phone OTP (needs SMS provider + DLT registration).
4. Rate limiting (Upstash) on sign-up, login, contact form and uploads.
5. Generated TypeScript types for the database (`supabase gen types`) once a project exists.

## Known issues / limitations

- **Contact form has no rate limiting yet** (honeypot only). Add Upstash before launch.
- **Legal pages are drafts** and need a lawyer's review (D8). Grievance Officer details not published.
- **Signed-in `/app` page is an interim home**: it says plainly that profile set-up is coming next.
- `profiles.is_incognito` is owner-editable; the premium entitlement check will move it behind a function in M6.
- Database tests use a minimal Supabase stub (`tests/db/_supabase_stub.sql`); also run them against a real Supabase project (`supabase test db`) once one exists.
- **The full signed-in onboarding journey hasn't been run end to end yet**: it needs a real Supabase project (auth + storage). SQL rules, validation and photo processing are tested separately. Add a Playwright journey against staging once it exists.
- Names ending in a dotted word (e.g. "St.John") are rejected by the anti-link rule; rare, but worth revisiting.
- Photos use plain `<img>` with signed URLs; switch to an image CDN / `next/image` loader in M8.
