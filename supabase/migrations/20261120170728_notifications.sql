-- Cubdles — migration 11: email notifications.
-- Events (new match, new message, fraud-ban notice) are queued in an outbox by triggers. A scheduler
-- (pg_cron → the app's dispatch endpoint; set up per environment, see supabase/setup/notifications.sql)
-- claims due rows; the app sends them through the email provider and records the result.

create type public.notification_kind as enum ('match', 'message', 'fraud_ban');

create table public.notification_settings (
  profile_id     uuid primary key references public.profiles (id) on delete cascade,
  email_matches  boolean not null default true,
  email_messages boolean not null default true,
  updated_at     timestamptz not null default now()
);

create table public.notification_outbox (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  kind        public.notification_kind not null,
  ref_id      uuid not null,
  send_after  timestamptz not null default now(),
  claimed_at  timestamptz,
  sent_at     timestamptz,
  skipped     text,
  attempts    smallint not null default 0,
  last_error  text check (char_length(last_error) <= 300),
  created_at  timestamptz not null default now()
);
-- One pending email per person, kind and thing (e.g. one per conversation until it goes out).
create unique index notification_outbox_pending_uq on public.notification_outbox (profile_id, kind, ref_id) where sent_at is null;
create index notification_outbox_due_idx on public.notification_outbox (send_after) where sent_at is null;
create index notification_outbox_recent_idx on public.notification_outbox (profile_id, kind, ref_id, sent_at desc);

-- -----------------------------------------------------------------------------
-- Triggers that queue emails
-- -----------------------------------------------------------------------------
create or replace function private.queue_match_emails()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notification_outbox (profile_id, kind, ref_id, send_after)
  values (new.user_a, 'match', new.id, now() + interval '2 minutes'),
         (new.user_b, 'match', new.id, now() + interval '2 minutes')
  on conflict do nothing;
  return new;
end $$;
create trigger matches_queue_email after insert on public.matches
  for each row execute function private.queue_match_emails();

create or replace function private.queue_message_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid;
begin
  select case when m.user_a = new.sender_id then m.user_b else m.user_a end into recipient
  from public.matches m where m.id = new.match_id;
  if recipient is not null then
    insert into public.notification_outbox (profile_id, kind, ref_id, send_after)
    values (recipient, 'message', new.match_id, now() + interval '10 minutes')
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger messages_queue_email after insert on public.messages
  for each row execute function private.queue_message_email();

create or replace function private.queue_safety_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'fraud_ban' then
    insert into public.notification_outbox (profile_id, kind, ref_id) values (new.profile_id, 'fraud_ban', new.id)
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger safety_notices_queue_email after insert on public.safety_notices
  for each row execute function private.queue_safety_email();

-- -----------------------------------------------------------------------------
-- Dispatch (server only)
-- -----------------------------------------------------------------------------
-- Claims due emails and returns what's needed to send them. Rows that no longer need sending
-- (read already, opted out, account gone, recently emailed) are closed as skipped here.
create or replace function public.claim_notifications(p_limit integer default 50)
returns table (
  id bigint, kind public.notification_kind, profile_id uuid, email text, recipient_name text,
  other_name text, ref_id uuid, last_contact_at timestamptz, timezone text
)
language plpgsql volatile security definer set search_path = '' as $$
begin
  -- Release claims that were never completed (e.g. the sender crashed).
  update public.notification_outbox set claimed_at = null
  where sent_at is null and claimed_at < now() - interval '15 minutes' and attempts < 5;

  return query
  with due as (
    select o.* from public.notification_outbox o
    where o.sent_at is null and o.claimed_at is null and o.send_after <= now() and o.attempts < 5
    order by o.send_after
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
    for update skip locked
  ),
  judged as (
    select d.id,
      case
        when p.status not in ('active', 'paused') then 'account_inactive'
        when u.email is null then 'no_email'
        when d.kind = 'match' and not coalesce(ns.email_matches, true) then 'opted_out'
        when d.kind = 'message' and not coalesce(ns.email_messages, true) then 'opted_out'
        when d.kind in ('match', 'message') and not exists (select 1 from public.matches m where m.id = d.ref_id and m.ended_at is null) then 'match_ended'
        when d.kind = 'message' and not exists (
          select 1 from public.messages x join public.matches m on m.id = x.match_id
          where x.match_id = d.ref_id and x.sender_id <> d.profile_id
            and x.created_at > coalesce((select r.last_read_at from public.match_reads r where r.match_id = d.ref_id and r.profile_id = d.profile_id), '-infinity')
        ) then 'already_read'
        when d.kind = 'message' and p.last_active_at > now() - interval '10 minutes' then 'recently_active'
        when d.kind = 'message' and exists (
          select 1 from public.notification_outbox o2
          where o2.profile_id = d.profile_id and o2.kind = 'message' and o2.ref_id = d.ref_id and o2.skipped is null
            and o2.sent_at > now() - interval '1 hour'
        ) then 'cooldown'
        when d.kind = 'fraud_ban' and not exists (select 1 from public.safety_notices s where s.id = d.ref_id) then 'notice_gone'
        else null
      end as skip
    from due d
    join public.profiles p on p.id = d.profile_id
    left join auth.users u on u.id = d.profile_id
    left join public.notification_settings ns on ns.profile_id = d.profile_id
  ),
  closed as (
    update public.notification_outbox o set sent_at = now(), skipped = j.skip
    from judged j where o.id = j.id and j.skip is not null
    returning o.id
  ),
  claimed as (
    update public.notification_outbox o set claimed_at = now(), attempts = o.attempts + 1
    from judged j where o.id = j.id and j.skip is null
    returning o.*
  )
  select c.id, c.kind, c.profile_id, u.email::text, p.display_name::text,
    case
      when c.kind in ('match', 'message') then (
        select op.display_name from public.matches m
        join public.profiles op on op.id = case when m.user_a = c.profile_id then m.user_b else m.user_a end
        where m.id = c.ref_id)
      when c.kind = 'fraud_ban' then (select s.subject_name from public.safety_notices s where s.id = c.ref_id)
    end::text,
    c.ref_id,
    case when c.kind = 'fraud_ban' then (select s.last_contact_at from public.safety_notices s where s.id = c.ref_id) end,
    (select pp.timezone from public.profile_private pp where pp.profile_id = c.profile_id)
  from claimed c
  join public.profiles p on p.id = c.profile_id
  join auth.users u on u.id = c.profile_id;
end $$;

create or replace function public.complete_notification(p_id bigint, p_ok boolean, p_error text default null)
returns void language sql volatile security definer set search_path = '' as $$
  update public.notification_outbox
     set sent_at = case when p_ok then now() else sent_at end,
         claimed_at = case when p_ok then claimed_at else null end,
         last_error = case when p_ok then null else left(p_error, 300) end,
         -- Retry failures with a growing delay.
         send_after = case when p_ok then send_after else now() + (attempts * interval '5 minutes') end
   where id = p_id
$$;

-- Whether anything is waiting (used by the scheduler so it only calls the app when needed).
create or replace function public.notifications_due()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.notification_outbox where sent_at is null and claimed_at is null and send_after <= now() and attempts < 5)
$$;

-- Members: email preferences.
create or replace function public.set_notification_settings(p_email_matches boolean, p_email_messages boolean)
returns void language sql volatile security definer set search_path = '' as $$
  insert into public.notification_settings (profile_id, email_matches, email_messages, updated_at)
  values (auth.uid(), coalesce(p_email_matches, true), coalesce(p_email_messages, true), now())
  on conflict (profile_id) do update set email_matches = excluded.email_matches, email_messages = excluded.email_messages, updated_at = now()
$$;

-- -----------------------------------------------------------------------------
-- Row-level security and grants
-- -----------------------------------------------------------------------------
alter table public.notification_settings enable row level security;
alter table public.notification_outbox enable row level security;
revoke all on public.notification_settings, public.notification_outbox from anon, authenticated;
grant select on public.notification_settings to authenticated;
create policy notification_settings_select on public.notification_settings for select to authenticated
  using (profile_id = (select auth.uid()));
-- The outbox has no member policies: only the server (service role) touches it.

revoke all on function public.claim_notifications(integer), public.complete_notification(bigint, boolean, text), public.notifications_due() from public, anon, authenticated;
grant execute on function public.claim_notifications(integer), public.complete_notification(bigint, boolean, text), public.notifications_due() to service_role;
revoke all on function public.set_notification_settings(boolean, boolean) from public, anon;
grant execute on function public.set_notification_settings(boolean, boolean) to authenticated;
