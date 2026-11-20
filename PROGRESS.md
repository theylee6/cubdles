# Cubdles — development progress

Last updated: 2026-11-20 (all build milestones done; production live at https://cubdles.com). Remaining work is owner actions — see "Owner checklist".

**Decision (18 Nov): Cubdles launches worldwide.** See plan section 2b. Owner decisions: English first (i18n-ready), UK selfie age estimation, no extra country blocks plus safety advisories, company based in India, Razorpay primary (Stripe India is invite-only) with Stripe as a fallback.

## Supabase project

- Project **cuddles** (`babfmifxyjmesfebzewa`, region ap-northeast-1 Tokyo — owner chose to keep it). Migrations 1–13 applied; 34,246 GeoNames cities (pop. ≥ 15,000, 244 countries) loaded; interests and prompts loaded; no placeholder prices.
- Live smoke test (rolled back): sign-up trigger, onboarding completion, photo self-approval blocked, location rounding, visibility rules, under-18 suspension, private helpers not callable — 12/12 passed.
- Security advisor: remaining warnings are the intended app RPCs (each checks `auth.uid()`), and `age_gate_blocks` having no policies by design.
- Auth configured: Site URL https://cubdles.com, redirect URLs, custom SMTP via Resend (sender no-reply@cubdles.com, domain cubdles.com verified), email limit 100/h. Still to do: Google/Apple providers.
- Production: Vercel project `cubdles-o79f` (functions in Tokyo hnd1, Node 22), GitHub `theylee6/cubdles` main auto-deploys. Sign-up → confirm email → onboarding verified end to end on 2026-11-20.

## Milestone status

| Milestone | Status |
| --- | --- |
| M0 Setup | **Done** — GitHub, Vercel (cubdles.com), Supabase, Resend email |
| M1 Design system + public site | **Done (temporary UI)** — the owner is designing in Figma; current UI is a placeholder layer over reusable components |
| M2 Auth, onboarding, profiles | **Done** — 10-step resumable onboarding, photo pipeline, affection profile, prompts, editing, settings, deletion, rate limits. Phone sign-in not built (needs an SMS provider) |
| M3 Discovery + matching | **Done** — discovery (swipe + browse + filters), daily picks, transparent compatibility score, likes/super likes/passes with quotas, race-safe mutual matching, liked-you count (list is premium), matches, unmatch, block, profile pages |
| M2 extras | **Done** — profile editing (same step forms in edit mode), privacy settings, pause, incognito (premium-gated), account deletion with 30-day restore + daily purge job |
| M4 Messaging | **Done** — conversations on match, real-time delivery (with polling fallback), optimistic sending with retry, read receipts (mutual, respects privacy), unread badge, unmatch/block from chat, flood limits. Email/push notifications and reporting from chat move to M5 |
| M5 Safety | **Done** — report from profiles and chats (with optional block, urgent triage), photo moderation queue, reports queue with conversation context, warn/suspend/ban with audit log, fraud-ban notices in-app and by email (15 U.S.C. 45g), warnings |
| Notifications | **Done** — match/message/fraud-ban emails via Resend with quiet rules, preferences, one-click unsubscribe; scheduler live in production (sends once `RESEND_API_KEY` is set) |
| M6 Payments | **Done (needs keys + prices)** — Razorpay subscriptions: checkout, signature verification, webhooks, cancel at period end, plan from subscription, upgrade page, membership settings |
| M7 Verification | **Photo verification done** (pose selfie, moderator review, badge, selfie deleted after review). UK age assurance needs a provider (owner decision) |
| M8 Hardening | **Done** — CSP + security headers, DB-backed rate limits, download-my-data, social buttons only when enabled, stale-deploy recovery. Not done: error monitoring (needs Sentry), image CDN |

## Completed

- Next.js 16 app (App Router, Cache Components, TS strict), Tailwind 4, self-hosted Fraunces + Figtree.
- "Linen & Clay" tokens; contrast checked (clay darkened to #A04F37 so it passes AA on every surface).
- Cubdles wordmark (leaning **bd**) and bd mark / app icon.
- Components: Button/ButtonLink, Input/Textarea/Select/Field, Card, Chip, AffectionBadge, Eyebrow, SectionHeading, Notice, illustrations.
- Public pages: Home, How it works, About, Membership/pricing (reads plans from DB, no hardcoded prices), Safety centre, FAQ, Contact (stores to `contact_messages`), Terms, Privacy, Community guidelines (marked as drafts), Join, Log in, Reset password, 404, error boundary.
- SEO: metadata per page, sitemap, robots, web manifest, icon.
- Auth: email+password sign-up (server-validated, 18+ and terms confirmation), login, Google/Apple OAuth, email confirm + recovery routes, password reset, sign-out, session refresh in `proxy.ts`, protected `/app`.
- Database migration 1 with RLS on every table, column-level grants, storage bucket policies, age-gate (under-18 suspended + email blocked), location rounding, onboarding completion checks, audited staff status changes.
- Tests: 98 unit, 293 database permission/behaviour, 56 end-to-end (mobile + desktop, axe WCAG 2.2 AA). Live smoke tests on the Supabase project after each migration.

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

## Country safety advisories (migration 7)

- `country_rules.advisory = 'same_sex_criminalised'` for 65 countries (Human Dignity Trust list, updated with ILGA World's 2026 changes); `reviewed_on` tracks the yearly review.
- Members located there see a warning on Discover and Settings, and Incognito is free for them (`private.has_feature`).
- Safety page: "Where same-sex relationships are against the law".

## Messaging (migration 8) — how it works

- `messages` (text only, 1–2,000 chars, idempotent by sender `client_id`) and `match_reads` (per-member read position). Members can only read; all writes go through `send_message()` / `mark_conversation_read()`.
- `send_message` checks: you're in the match, it hasn't ended, nobody blocked anyone, both accounts are active/paused; strips control characters; limits 20 messages/minute and 500/day.
- RLS: messages visible only while the match is active, so unmatch/block hides the conversation for both. The other person's read position is visible only if **both** share read receipts.
- Realtime: `messages` and `match_reads` are in the `supabase_realtime` publication (RLS applies to subscribers). The chat falls back to polling every 15 s if the live connection fails, and catches up when the tab returns.
- `my_conversations()` powers the list (preview, unread count); `unread_conversations_count()` the nav badge.
- UI: `/app/matches` (conversation list, refreshes live), `/app/matches/[matchId]` (chat). Dev preview: `/dev/messages`.

## Safety and moderation (migration 9) — how it works

- Members report via `create_report()` only (no direct inserts): they must have actually come across the person; 10 reports/day; "other" needs details; under-18 and offline-safety reports are `urgent`. "Also block" is on by default.
- Staff access is by `staff_roles` (`moderator` or `admin`). The admin area (`/admin`) 404s for everyone else and every staff function re-checks the role in the database.
- `/admin/photos`: approve or reject pending photos (rejection reason is shown to the member). Members only appear in Discover once a photo is approved.
- `/admin/reports`: urgent first; detail shows the reported member, their photos, report history and the last 100 messages between the two people (opening a report is audit-logged).
- Decisions: dismiss / warn (member sees a warning notice) / suspend / ban (audited through `staff_set_profile_status`; closes their other open reports). A **fraud ban** immediately creates the fraud-ban notice for everyone who received a message from the banned member, with the banned member's name, last contact time, the false-identity and don't-send-money statements, fraud-avoidance links and how to contact us (15 U.S.C. 45g requires delivery within 24 hours).
- Notices appear at the top of every member page until dismissed.
- **Granting staff access** is an owner action (SQL editor): `insert into public.staff_roles (user_id, role) select id, 'admin' from auth.users where email = '…';`

## Pending (next up)

Build work is complete; what's left needs the owner (see checklist below). Next build candidates once those are done:
1. Phone sign-in (needs an SMS provider, e.g. Twilio Verify).
2. UK age assurance (needs a provider, e.g. Yoti) before UK marketing.
3. Error monitoring (Sentry) and an image CDN.
4. Automated photo scanning (image-moderation API) as volume grows.
5. Regenerate `src/lib/supabase/database.types.ts` from Supabase (types are currently hand-maintained per migration).

## Owner checklist

| # | What | Where | Unblocks |
| --- | --- | --- | --- |
| 1 | Make yourself admin (SQL in README step 7) | Supabase SQL editor | /admin, approving photos (nobody appears in Discover until a photo is approved) |
| 2 | Add `RESEND_API_KEY` | Resend → Vercel env | Match/message/fraud-ban emails (scheduler already running) |
| 3 | Delete duplicate Vercel projects (keep `cubdles-o79f`) | Vercel | Tidiness, avoids wrong deploys |
| 4 | Razorpay: activate account, Subscriptions + International; create Plus plans; add keys + webhook; insert prices (README "Payments") | Razorpay, Vercel, SQL editor | Selling Plus |
| 5 | Decide Plus prices per currency | You | Step 4 |
| 6 | Google sign-in (optional), then `NEXT_PUBLIC_AUTH_PROVIDERS=google` | Google Cloud, Supabase, Vercel | Google button |
| 7 | Optional: set `NEXT_PUBLIC_SUPPORT_EMAIL` to a monitored inbox | Vercel | Support address on site and in safety emails |
| 8 | Lawyer + CA: finalise Terms/Privacy, refund policy, grievance officer, GST LUT, EU OSS/UK VAT, EU/UK representatives, sanctions list | External | Launch compliance |
| 9 | Choose a UK age-assurance provider (G2) | You | UK launch |
| 10 | Staff the moderation queue (who reviews, how fast; police escalation) | You | Launch |

## Known issues / limitations

- **Legal pages are drafts** and need a lawyer's review (D8). Grievance Officer details not published.
- Database tests use a minimal Supabase stub (`tests/db/_supabase_stub.sql`); also run them against a real Supabase project (`supabase test db`) once one exists.
- Signed-in journeys (onboarding, chat) are verified manually on production and by SQL/unit tests; add Playwright journeys against a staging Supabase project.
- Messages are plain text; no images, voice notes or link previews. No typing indicator yet.
- Names ending in a dotted word (e.g. "St.John") are rejected by the anti-link rule; rare, but worth revisiting.
- Photos use plain `<img>` with signed URLs; switch to an image CDN / `next/image` loader in M8.
- Discovery scores every eligible candidate per request. Fine for launch-city scale; at larger scale, precompute scores (materialised candidate table refreshed by a job).
- Swipe deck re-queries from offset 0 when it runs low (offsets shift as people are liked/passed); browse uses offsets and may show a person twice after acting on them.
- Fraud-ban emails send only once `RESEND_API_KEY` is set; until then notices are in-app only (and queued for email).
- No automated photo scanning yet: every photo is reviewed by a person. Add an image-moderation provider before volume grows.
- UK: highly effective age assurance for UK members is needed before UK launch (decision G2). Photo verification is not age assurance.
- Verified badge isn't revoked when photos change; re-verification on photo change is a future improvement.
- Razorpay flow is built against the documented API but untested end to end until test keys exist: run one test-mode purchase before going live.
- India-based company: EU/UK representatives, EU OSS and UK VAT registration, GST LUT for exports, Razorpay international + subscriptions activation, legal review — owner actions.
- English only; strings are not yet extracted for translation (G1).
