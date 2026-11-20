# Cubdles

**Cubdles** (pronounced "cuddles") is a dating platform for adults who love closeness. The **b** and **d** lean in toward each other like two people curled up — never "correct" the spelling.

- Plan and architecture: see the Phase 1 plan doc in the Claude project "dating website".
- Progress, pending work and known issues: [`PROGRESS.md`](./PROGRESS.md)
- Database design: [`docs/database.md`](./docs/database.md)

## Stack

Next.js 16 (App Router, Cache Components, TypeScript strict) · Tailwind CSS 4 · Supabase (Postgres + PostGIS, Auth, Realtime, Storage) · Vercel · Vitest · Playwright + axe.

## Getting started

Requirements: Node 22+, pnpm 10+.

```bash
pnpm install
cp .env.example .env.local     # fill in the Supabase values (see below)
pnpm dev                       # http://localhost:3000
```

The site runs without Supabase configured: public pages work, and anything that needs the database (sign-up, contact form, pricing) says clearly that it isn't connected yet. Nothing is faked.

## Setting up Supabase (you need to do this — requires your account)

1. Create two projects at [supabase.com](https://supabase.com): **cubdles-staging** and **cubdles-prod**. Choose the Mumbai (ap-south-1) region for an India launch.
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from this folder:
   ```bash
   supabase init            # creates supabase/config.toml (keep our migrations folder)
   supabase link --project-ref babfmifxyjmesfebzewa   # the "cuddles" project
   supabase db push         # applies supabase/migrations/*
   ```
   Load the world cities once per project with the `load-cities` Edge Function (instructions at the top of `supabase/functions/load-cities/index.ts`). Load development catalogue and placeholder plans on **staging only**: run `supabase/seed.sql` in the SQL editor. Never run the seed on production — set real prices in the admin dashboard (M5) or the SQL editor.
3. **Auth → URL configuration:** Site URL = your domain; add `http://localhost:3000/**` and your Vercel preview URL pattern to Redirect URLs.
4. **Auth → Email templates** (optional; editable only once custom SMTP is set up). Supabase's default templates work as they are: the link must be opened in the same browser that signed up. These custom links also work across browsers:
   - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/app`
   - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password/new`
   - Change email: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/app`
5. **Auth → Providers:**
   - Google: create an OAuth client in Google Cloud Console; callback URL is shown in Supabase.
   - Apple: needs an Apple Developer membership ($99/yr), a Services ID and key.
   - Then list them in `NEXT_PUBLIC_AUTH_PROVIDERS` (e.g. `google,apple`). Buttons are hidden until then.
6. **Auth → SMTP:** Supabase's built-in email is rate-limited and for testing only. Production uses Resend SMTP (sender `no-reply@cubdles.com`).
6a. **Notification emails:** set `RESEND_API_KEY` in Vercel, then run `supabase/setup/notifications.sql` once per project (pg_cron + pg_net + two Vault secrets; the same dispatch secret goes in Vercel as `NOTIFY_DISPATCH_SECRET`). Production is already set up.
7. **Make yourself an admin** (SQL editor, once you've signed up):
   ```sql
   insert into public.staff_roles (user_id, role) select id, 'admin' from auth.users where email = 'you@example.com';
   ```
8. Copy the project URL, the **publishable** key (`sb_publishable_…`) and the **secret** key into `.env.local` and Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

## Development previews

`pnpm dev`, then open `/dev/onboarding`, `/dev/discovery`, `/dev/messages` or `/dev/safety` to see screens with sample data (404 in production). Useful when translating Figma designs.

## Deploying to Vercel (requires your account)

1. Push this repo to GitHub and import it in Vercel.
2. Add the environment variables from `.env.example` for **Preview** (staging Supabase) and **Production** (prod Supabase).
3. Set `NEXT_PUBLIC_SITE_URL` to the real domain in Production.
4. Set `CRON_SECRET` (32+ random characters). `vercel.json` schedules the daily account purge and a daily notification safety-net; Vercel sends the secret automatically.

## Payments (Razorpay)

1. In Razorpay, enable **Subscriptions** and **International payments**, then create one **Plan** per price (e.g. Plus monthly in INR, USD, EUR, GBP).
2. Add each price to the database with its Razorpay plan id (SQL editor):
   ```sql
   insert into public.plan_prices (plan_id, period_months, currency, amount_minor, provider, provider_plan_id)
   select id, 1, 'INR', 49900, 'razorpay', 'plan_XXXXXXXX' from public.plans where code = 'plus';
   ```
   `amount_minor` is in the smallest unit (paise, cents) and must match the Razorpay plan.
3. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` in Vercel.
4. Razorpay → Webhooks: `https://cubdles.com/api/webhooks/razorpay`, events `subscription.*`, with the same secret.
5. What Plus includes is data (`entitlements` for plan `plus`); change it in the SQL editor.

Until keys and prices exist, the upgrade page says Plus isn't on sale yet (no fake checkout).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Local dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` · `pnpm typecheck` | ESLint · TypeScript |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:db` | Applies all migrations to a throwaway Postgres + PostGIS database and runs the RLS/permission tests in `tests/db` |
| `pnpm test:e2e` | Builds must exist first (`pnpm build`). Playwright on mobile + desktop, with axe accessibility checks. Set `PLAYWRIGHT_CHROME_PATH` to use a system Chrome |

## Security rules (non-negotiable)

- The browser only ever receives the anon key. `SUPABASE_SERVICE_ROLE_KEY` is imported only via `src/lib/env.server.ts` (`server-only`).
- Every table has row-level security. Writes that touch two users, or change status, go through `security definer` SQL functions that check permissions themselves.
- Redirect targets are validated (`safeNextPath`) to prevent open redirects.
- Never show a "verified" badge unless a verification record is `approved`.
- Legal pages are drafts until reviewed by a lawyer.
