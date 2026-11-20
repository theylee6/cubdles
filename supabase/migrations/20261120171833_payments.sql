-- Cubdles — migration 13: paid membership (Razorpay subscriptions).
-- A member's plan comes from their subscription; prices and the provider's plan ids live in
-- plan_prices (set by the owner). Only the server (service role) writes subscriptions, after
-- verifying the provider's signatures.

create type public.subscription_status as enum ('created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired');

create table public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  profile_id                uuid not null references public.profiles (id) on delete cascade,
  plan_id                   uuid not null references public.plans (id),
  price_id                  uuid references public.plan_prices (id) on delete set null,
  provider                  text not null default 'razorpay' check (provider in ('razorpay')),
  provider_subscription_id  text not null unique check (char_length(provider_subscription_id) <= 100),
  status                    public.subscription_status not null default 'created',
  current_period_end        timestamptz,
  cancel_at_period_end      boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index subscriptions_profile_idx on public.subscriptions (profile_id, created_at desc);
create index subscriptions_plan_idx on public.subscriptions (plan_id);
create index subscriptions_price_idx on public.subscriptions (price_id);

-- Every webhook we accept, once (idempotency + audit trail).
create table public.payment_events (
  provider_event_id text primary key check (char_length(provider_event_id) <= 100),
  provider          text not null default 'razorpay',
  event_type        text not null check (char_length(event_type) <= 80),
  payload           jsonb not null,
  received_at       timestamptz not null default now()
);

-- A subscription grants its plan while active, while a renewal payment is being retried,
-- or after cancellation until the period that was paid for ends.
create or replace function private.current_plan_code(p_uid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((
    select pl.code
    from public.subscriptions s join public.plans pl on pl.id = s.plan_id and pl.active
    where s.profile_id = p_uid
      and (
        s.status in ('active', 'authenticated', 'pending')
        or (s.status = 'cancelled' and s.current_period_end > now())
      )
      and (s.current_period_end is null or s.current_period_end > now() - interval '3 days')
    order by s.created_at desc
    limit 1
  ), 'free')
$$;

-- Members: what plan am I on, and my subscription details.
create or replace function public.my_membership()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'plan_code', private.current_plan_code(auth.uid()),
    'subscription', (
      select jsonb_build_object('id', s.id, 'status', s.status, 'current_period_end', s.current_period_end,
                                'cancel_at_period_end', s.cancel_at_period_end, 'plan_name', pl.name,
                                'period_months', pp.period_months, 'currency', pp.currency, 'amount_minor', pp.amount_minor)
      from public.subscriptions s join public.plans pl on pl.id = s.plan_id left join public.plan_prices pp on pp.id = s.price_id
      where s.profile_id = auth.uid() and s.status not in ('created', 'expired', 'completed')
      order by s.created_at desc limit 1
    )
  )
$$;

-- Server: record or update a subscription from the provider (after signature checks).
create or replace function public.upsert_subscription(
  p_profile uuid, p_price uuid, p_provider_subscription_id text, p_status public.subscription_status,
  p_current_period_end timestamptz default null, p_cancel_at_period_end boolean default null
) returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  pr public.plan_prices;
  sid uuid;
begin
  select * into pr from public.plan_prices where id = p_price;
  insert into public.subscriptions (profile_id, plan_id, price_id, provider_subscription_id, status, current_period_end, cancel_at_period_end)
  values (p_profile, pr.plan_id, p_price, p_provider_subscription_id, p_status, p_current_period_end, coalesce(p_cancel_at_period_end, false))
  on conflict (provider_subscription_id) do update
    set status = excluded.status,
        current_period_end = coalesce(excluded.current_period_end, public.subscriptions.current_period_end),
        cancel_at_period_end = coalesce(p_cancel_at_period_end, public.subscriptions.cancel_at_period_end),
        updated_at = now()
  returning id into sid;
  return sid;
end $$;

-- Server: update by provider id only (webhooks don't need to know the member).
create or replace function public.update_subscription_status(
  p_provider_subscription_id text, p_status public.subscription_status, p_current_period_end timestamptz default null
) returns boolean language sql volatile security definer set search_path = '' as $$
  update public.subscriptions
     set status = p_status, current_period_end = coalesce(p_current_period_end, current_period_end), updated_at = now()
   where provider_subscription_id = p_provider_subscription_id
  returning true
$$;

alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;
revoke all on public.subscriptions, public.payment_events from anon, authenticated;
grant select on public.subscriptions to authenticated;
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.has_staff_role('support')));

revoke all on function public.my_membership() from public, anon;
grant execute on function public.my_membership() to authenticated;
revoke all on function public.upsert_subscription(uuid, uuid, text, public.subscription_status, timestamptz, boolean),
  public.update_subscription_status(text, public.subscription_status, timestamptz) from public, anon, authenticated;
grant execute on function public.upsert_subscription(uuid, uuid, text, public.subscription_status, timestamptz, boolean),
  public.update_subscription_status(text, public.subscription_status, timestamptz) to service_role;

-- Plans and what they include (prices are added by the owner, per currency, with the provider's plan id).
insert into public.plans (code, name, description, is_free, sort_order)
values ('free', 'Free', 'Everything you need to meet someone.', true, 0),
       ('plus', 'Cubdles Plus', 'More ways to find your person, sooner.', false, 1)
on conflict (code) do nothing;

insert into public.entitlements (plan_id, feature_key, limit_value, period)
select p.id, e.k, e.v, e.per from public.plans p,
  (values ('daily_likes', 25, 'day'), ('super_likes', 1, 'week'), ('see_likes', 0, null), ('advanced_filters', 0, null),
          ('undo', 0, null), ('incognito', 0, null), ('note_with_like', 0, null), ('boosts', 0, null)) as e(k, v, per)
where p.code = 'free'
on conflict do nothing;

insert into public.entitlements (plan_id, feature_key, limit_value, period)
select p.id, e.k, e.v, e.per from public.plans p,
  (values ('daily_likes', null::int, 'day'), ('super_likes', 5, 'week'), ('see_likes', null, null), ('advanced_filters', null, null),
          ('undo', null, null), ('incognito', null, null), ('note_with_like', null, null), ('boosts', 0, null)) as e(k, v, per)
where p.code = 'plus'
on conflict do nothing;
