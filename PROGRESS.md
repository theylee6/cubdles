# Cubdles — development progress

Last updated: 2026-11-18 (global launch support).

**Decision (18 Nov): Cubdles launches worldwide.** See plan section 2b for regional requirements and decisions G1–G5.

## Supabase project

- Project **cuddles** (`babfmifxyjmesfebzewa`, region ap-northeast-1 Tokyo — owner chose to keep it). Migrations 1–6 applied; 34,246 GeoNames cities (pop. ≥ 15,000, 244 countries) loaded; interests and prompts loaded; no placeholder prices.
- Live smoke test (rolled back): sign-up trigger, onboarding completion, photo self-approval blocked, location rounding, visibility rules, under-18 suspension, private helpers not callable — 12/12 passed.
- Security advisor: remaining warnings are the intended app RPCs (each checks `auth.uid()`), and `age_gate_blocks` having no policies by design.
- Still to configure in the dashboard: Auth URLs, email templates, Google/Apple providers, SMTP (see README). Defaults D2–D10 from the Phase 1 plan are assumed (India launch, romantic only, mutual-match messaging) until the owner says otherwise.

## Milestone status

| Milestone | Status |
| --- | --- |
| M0 Setup | **Mostly done** — repo, scripts, env example, CI workflow, README. Waiting on: GitHub repo, Vercel and Supabase accounts |
| M1 Design system + public site | **Done (temporary UI)** — the owner is designing in Figma; current UI is a placeholder layer over reusable components |
| M2 Auth, onboarding, profiles | **Profile set-up done** — 10-step resumable onboarding, photo pipeline, affection profile, prompts, migration 2. Still to do: phone OTP, profile editing/settings, account deletion, rate limiting |
| M3 Discovery + matching | **Done** — discovery (swipe + browse + filters), daily picks, transparent compatibility score, likes/super likes/passes with quotas, race-safe mutual matching, liked-you count (list is premium), matches, unmatch, block, profile pages |
| M2 extras | **Done** — profile editing (same step forms in edit mode), privacy settings, pause, incognito (premium-gated), account deletion with 30-day restore + daily purge job |
| M4–M8 | Not started (next: M4 messaging + notifications) |

## Completed

- Next.js 16 app (App Router, Cache Components, TS strict), Tailwind 4, self-hosted Fraunces + Figtree.
- "Linen & Clay" tokens; contrast checked (clay darkened to #A04F37 so it passes AA on every surface).
- Cubdles wordmark (leaning **bd**) and bd mark / app icon.
- Components: Button/ButtonLink, Input/Textarea/Select/Field, Card, Chip, AffectionBadge, Eyebrow, SectionHeading, Notice, illustrations.
- Public pages: Home, How it works, About, Membership/pricing (reads plans from DB, no hardcoded prices), Safety centre, FAQ, Contact (stores to `contact_messages`), Terms, Privacy, Community guidelines (marked as drafts), Join, Log in, Reset password, 404, error boundary.
- SEO: metadata per page, sitemap, robots, web manifest, icon.
- Auth: email+password sign-up (server-validated, 18+ and terms confirmation), login, Google/Apple OAuth, email confirm + recovery routes, password reset, sign-out, session refresh in `proxy.ts`, protected `/app`.
- Database migration 1 with RLS on every table, column-level grants, storage bucket policies, age-gate (under-18 suspended + email blocked), location rounding, onboarding completion checks, audited staff status changes.
- Tests: 54 unit, 146 database permission/behaviour, 46 end-to-end (mobile + desktop, axe WCAG 2.2 AA). Live smoke tests on the Supabase project after each migration.

## Profile set-up (onboarding) — how it works

- Steps live in `src/features/onboarding/steps.ts` (single registry). `profiles.onboarding_step` = steps completed; a DB trigger stops it moving backwards. `/onboarding` resumes at the first unfinished step; members can revisit finished steps but not skip ahead.
- Each step = presentational client component (`components/`) + Zod schema (`schemas.ts`) + server action (`actions.ts`, shared `runStep` wrapper: auth → must be onboarding → validate → write → record progress → next step).
- Multi-row writes are atomic SQL functions: `set_profile_interests`, `set_profile_prompts`, `reorder_photos`, `compact_photo_positions`, `next_photo_position`. `complete_onboarding` checks every requirement server-side.
- Photos: browser downscales/re-encodes (handles HEIC on Safari) → server checks magic bytes, size (≤4 MB), dimensions (≥400 px) → sharp applies orientation, strips all metadata (EXIF/GPS), caps at 1600 px, re-encodes WebP → private bucket `<uid>/<uuid>.webp` → `photos` row as `pending`. Shown to the owner via 1-hour signed URLs.
- Location: device location rounded to 2 decimals in the browser and again in the DB, or a launch city. Only the city name is shown.
- Dev-only preview of every step: `pnpm dev` → `/dev/onboarding` (404 in production).

## Discovery and matching — how it works

- `discover()` (SQL) filters by mutual gender preference, both age ranges, distance (PostGIS), approved photo, not blocked either way, not already liked/passed/matched (ever), incognito rules, then ranks by `private.compatibility()`.
- Compatibility = weighted mix of intention, affection (pace, spoons, touch comfort, love languages), shared interests and lifestyle conflicts. Weights live in `compatibility_config` (versioned). Reasons come back as codes; `features/discovery/copy.ts` turns them into words.
- `swipe()` takes a per-pair advisory lock so simultaneous likes always create exactly one match. Quotas: 25 likes/day and 1 super like/week on free (India time), from `entitlements` when plans exist.
- Received likes are hidden by RLS unless the plan includes `see_likes`; free members get a count via `likes_received_summary()`.
- Paid features (`my_features()`): see_likes, advanced_filters, undo, incognito, note_with_like, boosts — all off until subscriptions (M6). Everyone is on `free` (`private.current_plan_code`).
- Account deletion: `request_account_deletion()` hides the profile and ends matches; `restore_account()` within 30 days returns to the exact previous status (a suspension can't be lifted this way); `/api/cron/purge-accounts` (Vercel Cron, daily 03:00 IST, needs `CRON_SECRET`) removes photos and deletes the auth user.
- Dev-only previews: `/dev/onboarding`, `/dev/discovery`.

## Global support (migration 6)

- `cities` (GeoNames CC BY 4.0, attribution in the footer) with `search_cities()`; `set_location()` takes a city id or device coordinates and the server resolves city + country (nearest city, PostGIS KNN). Coordinates are rounded to ~1 km.
- Members' IANA time zone (captured from the browser at the location step and on each session via `set_timezone()`); quotas and daily picks reset at local midnight.
- `preferences.distance_unit` (mi for US/GB/LR/MM, else km); distance labels are computed server-side in the viewer's unit.
- `country_rules`: CU, IR, KP, SY blocked at the location step (confirm list with counsel).
- Pricing shows the visitor's currency (Vercel `x-vercel-ip-country`) when `plan_prices` has it, else USD.
- Safety centre states that Cubdles does not run criminal background checks (US state disclosure laws).
- New environments: load cities with `supabase/functions/load-cities` (see header comment).

## Pending (next up)

1. M4: real-time messaging (conversations created on match), notifications, reporting.
2. Photo moderation: automated scan provider + moderator queue (M5). Until then photos stay `pending` and need approving in the database.
3. Phone OTP (global SMS provider, e.g. Twilio Verify).
4. Rate limiting (Upstash) on sign-up, login, contact form and uploads.
5. Regenerate `src/lib/supabase/database.types.ts` after every migration.

## Known issues / limitations

- **Contact form has no rate limiting yet** (honeypot only). Add Upstash before launch.
- **Legal pages are drafts** and need a lawyer's review (D8). Grievance Officer details not published.
- **Signed-in `/app` page is an interim home**: it says plainly that profile set-up is coming next.
- Database tests use a minimal Supabase stub (`tests/db/_supabase_stub.sql`); also run them against a real Supabase project (`supabase test db`) once one exists.
- **The full signed-in onboarding journey hasn't been run end to end yet**: it needs a real Supabase project (auth + storage). SQL rules, validation and photo processing are tested separately. Add a Playwright journey against staging once it exists.
- Names ending in a dotted word (e.g. "St.John") are rejected by the anti-link rule; rare, but worth revisiting.
- Photos use plain `<img>` with signed URLs; switch to an image CDN / `next/image` loader in M8.
- Discovery scores every eligible candidate per request. Fine for launch-city scale; at larger scale, precompute scores (materialised candidate table refreshed by a job).
- Swipe deck re-queries from offset 0 when it runs low (offsets shift as people are liked/passed); browse uses offsets and may show a person twice after acting on them.
- Reporting a profile isn't built yet (M5); blocking is available everywhere.
- UK: highly effective age assurance for UK members is needed before UK launch (decision G2, verification provider in M7).
- EU/UK representatives (GDPR Art. 27, DSA) and legal review are owner actions (G4, G5).
- English only; strings are not yet extracted for translation (G1).
