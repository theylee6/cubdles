-- Cubdles — migration 16: web push notifications.
-- The outbox now has a channel (email | push). Triggers queue both; push goes out sooner
-- (30 s for messages) and is skipped if the message was read meanwhile or the member has no device.

create type public.notification_channel as enum ('email', 'push');

alter table public.notification_outbox add column channel public.notification_channel not null default 'email';
drop index public.notification_outbox_pending_uq;
create unique index notification_outbox_pending_uq on public.notification_outbox (profile_id, kind, ref_id, channel) where sent_at is null;
drop index public.notification_outbox_recent_idx;
create index notification_outbox_recent_idx on public.notification_outbox (profile_id, kind, ref_id, channel, sent_at desc);

alter table public.notification_settings
  add column push_matches boolean not null default true,
  add column push_messages boolean not null default true;

create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  endpoint     text not null unique check (char_length(endpoint) <= 1000 and endpoint like 'https://%'),
  p256dh       text not null check (char_length(p256dh) <= 200),
  auth         text not null check (char_length(auth) <= 100),
  user_agent   text check (char_length(user_agent) <= 300),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

-- Members: register this device (an endpoint moves to whoever registers it last, e.g. a shared browser).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if (select count(*) from public.push_subscriptions where profile_id = auth.uid()) >= 10 then
    delete from public.push_subscriptions where id in (
      select id from public.push_subscriptions where profile_id = auth.uid() order by coalesce(last_used_at, created_at) limit 1);
  end if;
  insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set profile_id = excluded.profile_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent, created_at = now();
end $$;

create or replace function public.set_push_settings(p_push_matches boolean, p_push_messages boolean)
returns void language sql volatile security definer set search_path = '' as $$
  insert into public.notification_settings (profile_id, push_matches, push_messages, updated_at)
  values (auth.uid(), coalesce(p_push_matches, true), coalesce(p_push_messages, true), now())
  on conflict (profile_id) do update set push_matches = excluded.push_matches, push_messages = excluded.push_messages, updated_at = now()
$$;

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;
create policy push_subscriptions_select on public.push_subscriptions for select to authenticated using (profile_id = (select auth.uid()));
create policy push_subscriptions_delete on public.push_subscriptions for delete to authenticated using (profile_id = (select auth.uid()));

revoke all on function public.save_push_subscription(text, text, text, text), public.set_push_settings(boolean, boolean) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text), public.set_push_settings(boolean, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Triggers queue both channels
-- -----------------------------------------------------------------------------
create or replace function private.queue_match_emails()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notification_outbox (profile_id, kind, ref_id, send_after, channel)
  values (new.user_a, 'match', new.id, now() + interval '2 minutes', 'email'),
         (new.user_b, 'match', new.id, now() + interval '2 minutes', 'email'),
         (new.user_a, 'match', new.id, now(), 'push'),
         (new.user_b, 'match', new.id, now(), 'push')
  on conflict do nothing;
  return new;
end $$;

create or replace function private.queue_message_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid;
begin
  select case when m.user_a = new.sender_id then m.user_b else m.user_a end into recipient
  from public.matches m where m.id = new.match_id;
  if recipient is not null then
    insert into public.notification_outbox (profile_id, kind, ref_id, send_after, channel)
    values (recipient, 'message', new.match_id, now() + interval '10 minutes', 'email'),
           (recipient, 'message', new.match_id, now() + interval '30 seconds', 'push')
    on conflict do nothing;
  end if;
  return new;
end $$;

create or replace function private.queue_safety_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'fraud_ban' then
    insert into public.notification_outbox (profile_id, kind, ref_id, channel)
    values (new.profile_id, 'fraud_ban', new.id, 'email'), (new.profile_id, 'fraud_ban', new.id, 'push')
    on conflict do nothing;
  end if;
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Claiming now knows about channels
-- -----------------------------------------------------------------------------
drop function public.claim_notifications(integer);
create function public.claim_notifications(p_limit integer default 50)
returns table (
  id bigint, kind public.notification_kind, channel public.notification_channel, profile_id uuid, email text,
  recipient_name text, other_name text, ref_id uuid, last_contact_at timestamptz, timezone text
)
language plpgsql volatile security definer set search_path = '' as $$
begin
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
        when d.channel = 'email' and u.email is null then 'no_email'
        when d.channel = 'push' and not exists (select 1 from public.push_subscriptions ps where ps.profile_id = d.profile_id) then 'no_device'
        when d.channel = 'email' and d.kind = 'match' and not coalesce(ns.email_matches, true) then 'opted_out'
        when d.channel = 'email' and d.kind = 'message' and not coalesce(ns.email_messages, true) then 'opted_out'
        when d.channel = 'push' and d.kind = 'match' and not coalesce(ns.push_matches, true) then 'opted_out'
        when d.channel = 'push' and d.kind = 'message' and not coalesce(ns.push_messages, true) then 'opted_out'
        when d.kind in ('match', 'message') and not exists (select 1 from public.matches m where m.id = d.ref_id and m.ended_at is null) then 'match_ended'
        when d.kind = 'message' and not exists (
          select 1 from public.messages x
          where x.match_id = d.ref_id and x.sender_id <> d.profile_id
            and x.created_at > coalesce((select r.last_read_at from public.match_reads r where r.match_id = d.ref_id and r.profile_id = d.profile_id), '-infinity')
        ) then 'already_read'
        when d.channel = 'email' and d.kind = 'message' and p.last_active_at > now() - interval '10 minutes' then 'recently_active'
        when d.kind = 'message' and exists (
          select 1 from public.notification_outbox o2
          where o2.profile_id = d.profile_id and o2.kind = 'message' and o2.ref_id = d.ref_id and o2.channel = d.channel
            and o2.skipped is null
            and o2.sent_at > now() - case when d.channel = 'email' then interval '1 hour' else interval '10 minutes' end
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
  select c.id, c.kind, c.channel, c.profile_id, u.email::text, p.display_name::text,
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
  left join auth.users u on u.id = c.profile_id;
end $$;
revoke all on function public.claim_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_notifications(integer) to service_role;

-- Server: devices to push to, and housekeeping for dead endpoints.
create or replace function public.push_targets(p_profile uuid)
returns table (id uuid, endpoint text, p256dh text, auth text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.endpoint, s.p256dh, s.auth from public.push_subscriptions s where s.profile_id = p_profile
$$;
create or replace function public.push_result(p_id uuid, p_ok boolean, p_gone boolean default false)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_gone then
    delete from public.push_subscriptions where id = p_id;
  elsif p_ok then
    update public.push_subscriptions set last_used_at = now() where id = p_id;
  end if;
end $$;
revoke all on function public.push_targets(uuid), public.push_result(uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function public.push_targets(uuid), public.push_result(uuid, boolean, boolean) to service_role;
