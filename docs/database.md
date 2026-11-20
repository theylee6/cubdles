# Database architecture

Postgres on Supabase, with PostGIS. Migrations live in `supabase/migrations` and are the only way the schema changes.

## Principles

1. **RLS on every table, no access by default.** Migration 1 revokes Supabase's default grants, then grants table- and column-level privileges explicitly.
2. **Column-level grants** stop owners from editing fields like `status`, `moderation_status` or `birth_date` directly.
3. **Security-definer functions** (with `set search_path = ''`) carry every rule that spans rows or users: `submit_birth_date`, `set_location`, `complete_onboarding`, `accept_terms`, `staff_set_profile_status`.
4. **Visibility in one place:** `can_view_profile(target)` — you, staff, or an active profile not blocked in either direction, while you are active/paused.
5. **Private data is split out:** `profile_private` (birth date, phone, location, consents) is readable only by the owner and support staff. Others get age via `profile_age()` and never see coordinates.
6. **Every staff action is audited** in `audit_logs` (admins read; nobody updates or deletes).

## Migration 1 — identity (2026-11-18)

| Table | Purpose | Who can read | Who can write |
| --- | --- | --- | --- |
| `profiles` | Public profile fields + status | `can_view_profile` | Owner: safe columns only. Status via functions |
| `profile_private` | Birth date, phone, ~1 km location, consents | Owner, support+ | Via functions; owner toggles marketing consent |
| `age_gate_blocks` | SHA-256 of emails that failed the 18+ check | Nobody | Functions only |
| `photos` | Photo metadata, order, moderation | Owner; others if approved + visible; moderators | Owner insert (forced to `pending`, max 6, own folder), reorder, delete |
| `interests`, `prompts` | Catalogues | Signed-in users | Admin via service role |
| `profile_interests` (≤10), `profile_prompts` (≤3) | Profile answers | With profile | Owner |
| `affection_profiles`, `lifestyle` | Cuddle style, pace, touch comfort, love languages; lifestyle | With profile | Owner (listed columns) |
| `preferences`, `privacy_settings` | Discovery prefs; privacy toggles | Owner | Owner (listed columns) |
| `blocks` | Who blocked whom | Blocker, moderators | Blocker |
| `staff_roles` | admin / moderator / support | Self, admins | Admins (cannot remove themselves) |
| `audit_logs` | Append-only staff action log | Admins | `write_audit_log()` only |
| `plans`, `plan_prices`, `entitlements` | Membership catalogue (prices in minor units) | Everyone (active rows) | Admin via service role |
| `contact_messages` | Public contact form | Support staff | Anyone (insert only, status fixed to `new`) |

Storage bucket `profile-photos` is private: files under `<user_id>/…`; owners upload/delete in their folder; others can read a file only if its `photos` row is approved and the owner is visible.

## Migration 2 — profile set-up (2026-11-18)

- `profiles.gender_group` (`woman` / `man` / `nonbinary`) for matching; `gender_identity` stays free text for display. `preferences.show_genders` must use the same set.
- Trigger keeps `onboarding_step` from moving backwards.
- Functions: `reorder_photos(uuid[])`, `next_photo_position()`, `compact_photo_positions()`, `set_profile_interests(smallint[])`, `set_profile_prompts(jsonb)` — each replaces data atomically and checks ownership.
- `complete_onboarding()` now also requires gender group, who-to-meet, affection profile (cuddle style, pace, touch comfort) and at least one prompt.

## Migration 3 — hardening (2026-11-18, from Supabase advisors)

- Policy helpers (`can_view_profile`, `is_blocked_between`, `has_staff_role`, `is_staff`) moved to a `private` schema the API does not expose. Before this, any signed-in user could call `/rpc/is_blocked_between` to learn whether two other members had blocked each other.
- Every policy uses `(select auth.uid())` so it is evaluated once per statement, not per row.
- Fixed `search_path` on the remaining functions; indexes on three foreign keys.

## Migration 4 — matching (2026-11-18)

| Table | Purpose | Client access |
| --- | --- | --- |
| `likes` | like / super like, optional note (premium) | read own sent; received only with `see_likes`; writes via `swipe()` |
| `passes` | not-now decisions | read own; writes via `swipe()` |
| `matches` | one row per pair (`user_a < user_b`), ended with a reason | participants read; writes via functions |
| `daily_picks` | top 5 per member per day (India time) | read own |
| `compatibility_config` | versioned scoring weights | none (admin only) |

Functions: `discover`, `profile_cards`, `swipe`, `undo_last_pass`, `unmatch`, `likes_received_summary`, `get_daily_picks`, `set_paused`, `request_account_deletion`, `restore_account`, `touch_last_active`; private helpers `compatibility`, `feature_limit`, `has_feature`, `period_start`, `distance_bucket`, `on_block` (trigger: blocking ends matches and removes likes), `accounts_due_for_purge`. `can_view_profile` now also lets matched members see each other while paused.

## Migration 5 — member features (2026-11-18)

`my_features()` for UI gating; `is_incognito` can only change through `set_incognito()`, which checks the entitlement.

## Migration 6 — global (2026-11-18)

| Object | Purpose |
| --- | --- |
| `cities` | World gazetteer (GeoNames, CC BY 4.0), read-only to members; prefix indexes + GiST |
| `country_rules` | Countries where sign-up is refused (read-only to members) |
| `profiles.country_code`, `profile_private.timezone`, `preferences.distance_unit` | Where a member is, their local midnight, km/mi |
| `search_cities()`, `set_location(lat, lng, city_id, timezone)`, `set_timezone()` | City search; server-side city/country resolution; travel updates |
| `private.member_timezone/member_today/period_start` | Quotas and daily picks in local time |

## Migration 7 — country advisories (2026-11-18)

| Object | Purpose |
| --- | --- |
| `country_rules.advisory`, `country_rules.reviewed_on` | Safety advisory per country (65 rows, reviewed yearly) |
| `my_safety_advisory()` | The signed-in member's advisory, or null |
| `private.has_feature` | Incognito is free where `advisory = 'same_sex_criminalised'` |

## Migration 8 — messaging (2026-11-20)

| Object | Purpose |
| --- | --- |
| `messages` | Text messages per match (RLS: participants of an active match; no direct writes) |
| `match_reads` | Each member's read position per conversation (other's row visible only with mutual read receipts) |
| `matches.last_message_at` | Orders the conversation list |
| `send_message(match, body, client_id)` | Validated, idempotent, rate-limited send |
| `mark_conversation_read`, `conversation_seen_at` | Read state and "Seen" |
| `my_conversations()`, `unread_conversations_count()` | Conversation list and nav badge |
| `private.in_active_match`, `private.shares_read_receipts` | Policy helpers |

## Migration 9 — safety (2026-11-20)

| Object | Purpose |
| --- | --- |
| `reports` | Member reports (reason, details, priority, status, decision); reporters see their own, moderators all |
| `safety_notices` | In-app notices: `warning`, `fraud_ban` (15 U.S.C. 45g) |
| `create_report()`, `dismiss_safety_notice()`, `my_staff_roles()` | Member-facing |
| `staff_queue_counts`, `staff_pending_photos`, `staff_moderate_photo`, `staff_list_reports`, `staff_report_detail`, `staff_resolve_report` | Moderator-only, audited |

## Migration 10 — limits and export

| Object | Purpose |
| --- | --- |
| `private.rate_limits`, `rate_limit_hit()` | Fixed-window limits keyed by hash (server only): sign-up, log-in, reset, contact, data export |
| `export_my_data()` | "Download my data" (everything about the signed-in member, no raw coordinates) |

## Migration 11 — notifications

| Object | Purpose |
| --- | --- |
| `notification_settings` | Email preferences (matches, messages); safety notices have no opt-out |
| `notification_outbox` | Queue filled by triggers on matches, messages, fraud-ban notices |
| `claim_notifications`, `complete_notification`, `notifications_due` | Server-only dispatch with skip rules (read, active, opted out, cooldown) and retries |
| pg_cron job `dispatch-notification-emails` | Every 2 min, calls the app only when something is due (per-environment setup script) |

## Migration 12 — verification

| Object | Purpose |
| --- | --- |
| `profiles.verified_at`, `verification_requests`, bucket `verification-selfies` | Pose-selfie verification reviewed by moderators; selfie deleted after decision |
| `start_verification`, `submit_verification`, `staff_pending_verifications`, `staff_decide_verification`, `verified_profiles` | Flow and badge |

## Migration 13 — payments

| Object | Purpose |
| --- | --- |
| `subscriptions`, `payment_events` | Razorpay subscriptions; webhook idempotency |
| `private.current_plan_code` | Plan from subscription (active/authenticated/pending; cancelled until period end) |
| `my_membership`, `upsert_subscription`, `update_subscription_status` | Member view; server-only writes |
| plans `free`, `plus` + entitlements | What each plan includes (prices added by the owner) |

## Coming in later migrations

Messaging, notifications, billing (`subscriptions`, `payments`, `payment_events`, `refunds`), trust (`reports`, `verifications`, `moderation_actions`, `appeals`, `risk_signals`), analytics — as in the Phase 1 plan.

## Testing

`pnpm test:db` creates a throwaway database, loads a minimal Supabase stub (roles, `auth.uid()`, storage), applies all migrations and the seed, then runs `tests/db/*.sql`. Each test switches role (`anon` / `authenticated`) and JWT claims to check what each kind of user can and can't do.
