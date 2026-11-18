-- =============================================================================
-- Cubdles — migration 1: identity, privacy, photos, blocks, staff, plans
-- Every table has RLS enabled and starts with no access for anon/authenticated.
-- Access is then granted table-by-table and column-by-column.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.profile_status as enum ('onboarding', 'active', 'paused', 'suspended', 'banned', 'deleted');
create type public.moderation_status as enum ('pending', 'approved', 'rejected');
create type public.staff_role as enum ('admin', 'moderator', 'support');
create type public.relationship_intention as enum ('life_partner', 'long_term', 'long_term_open', 'short_term_open', 'figuring_out');
create type public.cuddle_style as enum ('big_spoon', 'little_spoon', 'either', 'not_sure');
create type public.affection_pace as enum ('slow', 'steady', 'quick');

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.age_in_years(birth date)
returns integer language sql immutable as $$
  select extract(year from age(current_date, birth))::int
$$;
-- current_date makes the above STABLE in practice; mark it so.
alter function public.age_in_years(date) stable;

-- -----------------------------------------------------------------------------
-- Profiles (public-facing columns only)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  display_name     text check (char_length(display_name) between 1 and 40),
  gender_identity  text check (char_length(gender_identity) <= 40),
  pronouns         text check (char_length(pronouns) <= 30),
  bio              text check (char_length(bio) <= 500),
  job_title        text check (char_length(job_title) <= 60),
  education        text check (char_length(education) <= 80),
  city             text check (char_length(city) <= 80),
  intention        public.relationship_intention,
  status           public.profile_status not null default 'onboarding',
  status_reason    text,
  onboarding_step  smallint not null default 0 check (onboarding_step between 0 and 20),
  is_incognito     boolean not null default false,
  last_active_at   timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index profiles_status_idx on public.profiles (status);
create index profiles_last_active_idx on public.profiles (last_active_at desc);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Private profile data: owner and staff only.
create table public.profile_private (
  profile_id     uuid primary key references public.profiles (id) on delete cascade,
  birth_date     date,
  phone_e164     text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  phone_verified_at timestamptz,
  -- Rounded to ~1 km before storage (see set_location()). Never exposed to other users.
  location       extensions.geography(Point, 4326),
  terms_accepted_at   timestamptz,
  privacy_accepted_at timestamptz,
  marketing_consent   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index profile_private_location_idx on public.profile_private using gist (location);
create trigger profile_private_updated_at before update on public.profile_private
  for each row execute function public.set_updated_at();

-- Hashed identifiers of people who failed the 18+ check, so they can't simply retry.
create table public.age_gate_blocks (
  email_hash  text primary key,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Staff roles + audit log
-- -----------------------------------------------------------------------------
create table public.staff_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.staff_role not null,
  granted_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null check (char_length(action) <= 80),
  target_type text not null check (char_length(target_type) <= 40),
  target_id   text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_target_idx on public.audit_logs (target_type, target_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

create or replace function public.has_staff_role(r public.staff_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_roles s
    where s.user_id = auth.uid() and (s.role = r or s.role = 'admin')
  )
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_roles s where s.user_id = auth.uid())
$$;

create or replace function public.write_audit_log(
  p_action text, p_target_type text, p_target_id text, p_before jsonb default null, p_after jsonb default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_logs (actor_id, action, target_type, target_id, before, after)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_before, p_after);
end $$;

-- -----------------------------------------------------------------------------
-- Blocks (needed by every visibility check)
-- -----------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

-- Can the current user see this profile at all?
create or replace function public.can_view_profile(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    auth.uid() is not null
    and (
      target = auth.uid()
      or public.is_staff()
      or (
        exists (select 1 from public.profiles p where p.id = target and p.status = 'active')
        and exists (select 1 from public.profiles me where me.id = auth.uid() and me.status in ('active', 'paused'))
        and not public.is_blocked_between(auth.uid(), target)
      )
    )
$$;

-- Age of a visible profile (birth date itself is never exposed).
create or replace function public.profile_age(target uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select public.age_in_years(pp.birth_date)
  from public.profile_private pp
  where pp.profile_id = target and public.can_view_profile(target)
$$;

-- -----------------------------------------------------------------------------
-- Photos
-- -----------------------------------------------------------------------------
create table public.photos (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  storage_path      text not null unique check (char_length(storage_path) <= 300),
  position          smallint not null check (position between 0 and 5),
  moderation_status public.moderation_status not null default 'pending',
  moderation_note   text,
  width             integer check (width > 0),
  height            integer check (height > 0),
  blurhash          text check (char_length(blurhash) <= 100),
  created_at        timestamptz not null default now(),
  constraint photos_position_unique unique (profile_id, position) deferrable initially deferred
);
create index photos_profile_idx on public.photos (profile_id, position);
create index photos_pending_idx on public.photos (created_at) where moderation_status = 'pending';

create or replace function public.photos_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.photos where profile_id = new.profile_id) >= 6 then
      raise exception 'photo_limit_reached' using errcode = 'check_violation';
    end if;
    -- New photos always start in moderation, whatever the client sent.
    if not public.is_staff() then
      new.moderation_status := 'pending';
      new.moderation_note := null;
    end if;
    -- Path must live in the owner's folder.
    if split_part(new.storage_path, '/', 1) <> new.profile_id::text then
      raise exception 'invalid_storage_path' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger photos_guard before insert on public.photos
  for each row execute function public.photos_guard();

-- -----------------------------------------------------------------------------
-- Interests, prompts, affection profile, lifestyle
-- -----------------------------------------------------------------------------
create table public.interests (
  id       smallint generated always as identity primary key,
  slug     text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  label    text not null check (char_length(label) <= 40),
  category text not null check (char_length(category) <= 40),
  active   boolean not null default true
);

create table public.profile_interests (
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  interest_id smallint not null references public.interests (id) on delete cascade,
  primary key (profile_id, interest_id)
);
create index profile_interests_interest_idx on public.profile_interests (interest_id);

create table public.prompts (
  id     smallint generated always as identity primary key,
  text   text not null unique check (char_length(text) <= 120),
  active boolean not null default true
);

create table public.profile_prompts (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  prompt_id  smallint not null references public.prompts (id),
  answer     text not null check (char_length(answer) between 1 and 200),
  position   smallint not null check (position between 0 and 2),
  primary key (profile_id, prompt_id),
  constraint profile_prompts_position_unique unique (profile_id, position) deferrable initially deferred
);

create or replace function public.limit_children()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  n integer;
  max_n integer := tg_argv[0]::integer;
begin
  execute format('select count(*) from public.%I where profile_id = $1', tg_table_name)
    into n using new.profile_id;
  if n >= max_n then
    raise exception '%_limit_reached', tg_table_name using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger profile_interests_limit before insert on public.profile_interests
  for each row execute function public.limit_children('10');
create trigger profile_prompts_limit before insert on public.profile_prompts
  for each row execute function public.limit_children('3');

create table public.affection_profiles (
  profile_id      uuid primary key references public.profiles (id) on delete cascade,
  touch_comfort   smallint check (touch_comfort between 1 and 5),
  pace            public.affection_pace,
  cuddle_style    public.cuddle_style,
  public_affection smallint check (public_affection between 1 and 5),
  love_languages  text[] not null default '{}' check (
    love_languages <@ array['words', 'time', 'touch', 'acts', 'gifts']::text[]
    and cardinality(love_languages) <= 2
  ),
  updated_at      timestamptz not null default now()
);
create trigger affection_profiles_updated_at before update on public.affection_profiles
  for each row execute function public.set_updated_at();

create table public.lifestyle (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  drinking   text check (drinking in ('never', 'sometimes', 'often', 'prefer_not')),
  smoking    text check (smoking in ('never', 'sometimes', 'often', 'prefer_not')),
  exercise   text check (exercise in ('rarely', 'sometimes', 'often')),
  kids       text check (kids in ('have', 'want', 'dont_want', 'open', 'prefer_not')),
  pets       text check (pets in ('dog', 'cat', 'both', 'other', 'none', 'want')),
  diet       text check (diet in ('vegetarian', 'vegan', 'eggetarian', 'non_vegetarian', 'jain', 'other')),
  religion   text check (char_length(religion) <= 40),
  updated_at timestamptz not null default now()
);
create trigger lifestyle_updated_at before update on public.lifestyle
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Preferences and privacy settings (owner only)
-- -----------------------------------------------------------------------------
create table public.preferences (
  profile_id      uuid primary key references public.profiles (id) on delete cascade,
  age_min         smallint not null default 21 check (age_min between 18 and 99),
  age_max         smallint not null default 40 check (age_max between 18 and 99),
  max_distance_km smallint not null default 25 check (max_distance_km between 1 and 500),
  show_genders    text[] not null default '{}' check (cardinality(show_genders) <= 10),
  intentions      public.relationship_intention[] not null default '{}',
  dealbreakers    jsonb not null default '{}'::jsonb,
  weights         jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now(),
  check (age_min <= age_max)
);
create trigger preferences_updated_at before update on public.preferences
  for each row execute function public.set_updated_at();

create table public.privacy_settings (
  profile_id          uuid primary key references public.profiles (id) on delete cascade,
  show_online_status  boolean not null default true,
  show_last_active    boolean not null default true,
  send_read_receipts  boolean not null default true,
  hide_age            boolean not null default false,
  hide_distance       boolean not null default false,
  updated_at          timestamptz not null default now()
);
create trigger privacy_settings_updated_at before update on public.privacy_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Plans and entitlements (prices are data, never hardcoded in the app)
-- -----------------------------------------------------------------------------
create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  name        text not null check (char_length(name) <= 40),
  description text check (char_length(description) <= 300),
  is_free     boolean not null default false,
  active      boolean not null default true,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now()
);

create table public.plan_prices (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references public.plans (id) on delete cascade,
  period_months  smallint not null check (period_months in (1, 3, 6, 12)),
  currency       char(3) not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor   integer not null check (amount_minor >= 0), -- paise / cents
  provider       text,           -- e.g. 'razorpay'
  provider_plan_id text,         -- the provider's plan id, set by admin
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (plan_id, period_months, currency)
);

create table public.entitlements (
  plan_id     uuid not null references public.plans (id) on delete cascade,
  feature_key text not null check (feature_key ~ '^[a-z0-9_]{2,40}$'),
  -- null = unlimited / enabled; 0 = disabled; n = limit per period
  limit_value integer check (limit_value >= 0),
  period      text check (period in ('day', 'week', 'month')),
  primary key (plan_id, feature_key)
);

-- -----------------------------------------------------------------------------
-- Contact form messages (public site)
-- -----------------------------------------------------------------------------
create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  email      text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  topic      text not null check (topic in ('general', 'safety', 'billing', 'press', 'privacy')),
  message    text not null check (char_length(message) between 10 and 4000),
  user_id    uuid references auth.users (id) on delete set null,
  status     text not null default 'new' check (status in ('new', 'open', 'closed')),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- New-user bootstrap
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  blocked boolean;
begin
  blocked := new.email is not null and exists (
    select 1 from public.age_gate_blocks
    where email_hash = encode(extensions.digest(lower(new.email), 'sha256'), 'hex')
  );

  insert into public.profiles (id, status, status_reason)
  values (new.id,
          case when blocked then 'suspended'::public.profile_status else 'onboarding'::public.profile_status end,
          case when blocked then 'age_gate' else null end);
  insert into public.profile_private (profile_id) values (new.id);
  insert into public.preferences (profile_id) values (new.id);
  insert into public.privacy_settings (profile_id) values (new.id);
  insert into public.affection_profiles (profile_id) values (new.id);
  insert into public.lifestyle (profile_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Owner actions that need server-side rules
-- -----------------------------------------------------------------------------

-- Date of birth can be set once. Under 18 suspends the account and blocks the email.
create or replace function public.submit_birth_date(p_birth_date date)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  existing date;
  user_email text;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select birth_date into existing from public.profile_private where profile_id = uid for update;
  if existing is not null then
    raise exception 'birth_date_already_set' using errcode = 'check_violation';
  end if;

  if p_birth_date is null or p_birth_date > current_date or p_birth_date < current_date - interval '100 years' then
    raise exception 'invalid_birth_date' using errcode = 'check_violation';
  end if;

  update public.profile_private set birth_date = p_birth_date where profile_id = uid;

  if public.age_in_years(p_birth_date) < 18 then
    update public.profiles set status = 'suspended', status_reason = 'age_gate' where id = uid;
    select email into user_email from auth.users where id = uid;
    if user_email is not null then
      insert into public.age_gate_blocks (email_hash)
      values (encode(extensions.digest(lower(user_email), 'sha256'), 'hex'))
      on conflict do nothing;
    end if;
    return false;
  end if;
  return true;
end $$;

-- Location is rounded to 2 decimal places (~1.1 km) before it is stored.
create or replace function public.set_location(p_lat double precision, p_lng double precision, p_city text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid_coordinates' using errcode = 'check_violation';
  end if;
  update public.profile_private
     set location = extensions.st_setsrid(
           extensions.st_makepoint(round(p_lng::numeric, 2)::float8, round(p_lat::numeric, 2)::float8), 4326
         )::extensions.geography
   where profile_id = uid;
  update public.profiles set city = left(p_city, 80) where id = uid;
end $$;

-- Finishing onboarding: only the server decides when a profile becomes active.
create or replace function public.complete_onboarding()
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  p public.profiles;
  pp public.profile_private;
  photo_count integer;
begin
  select * into p from public.profiles where id = uid for update;
  if p.id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p.status <> 'onboarding' then
    raise exception 'not_in_onboarding' using errcode = 'check_violation';
  end if;

  select * into pp from public.profile_private where profile_id = uid;
  if pp.birth_date is null or public.age_in_years(pp.birth_date) < 18 then
    raise exception 'age_not_verified' using errcode = 'check_violation';
  end if;
  if p.display_name is null or p.gender_identity is null or p.intention is null then
    raise exception 'profile_incomplete' using errcode = 'check_violation';
  end if;
  if pp.location is null then
    raise exception 'location_missing' using errcode = 'check_violation';
  end if;
  if pp.terms_accepted_at is null or pp.privacy_accepted_at is null then
    raise exception 'consent_missing' using errcode = 'check_violation';
  end if;
  select count(*) into photo_count from public.photos
   where profile_id = uid and moderation_status <> 'rejected';
  if photo_count < 2 then
    raise exception 'photos_missing' using errcode = 'check_violation';
  end if;

  update public.profiles set status = 'active', onboarding_step = 20 where id = uid;
end $$;

create or replace function public.accept_terms(p_marketing boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.profile_private
     set terms_accepted_at = now(), privacy_accepted_at = now(), marketing_consent = coalesce(p_marketing, false)
   where profile_id = auth.uid();
end $$;

-- Staff: change a profile's status, always audited.
create or replace function public.staff_set_profile_status(target uuid, new_status public.profile_status, reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  old_status public.profile_status;
begin
  if not public.has_staff_role('moderator') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if reason is null or char_length(reason) < 3 then
    raise exception 'reason_required' using errcode = 'check_violation';
  end if;
  select status into old_status from public.profiles where id = target for update;
  update public.profiles set status = new_status, status_reason = reason where id = target;
  perform public.write_audit_log('profile.status', 'profile', target::text,
    jsonb_build_object('status', old_status), jsonb_build_object('status', new_status, 'reason', reason));
end $$;

-- =============================================================================
-- Row-level security and grants
-- =============================================================================
alter table public.profiles          enable row level security;
alter table public.profile_private   enable row level security;
alter table public.age_gate_blocks   enable row level security;
alter table public.staff_roles       enable row level security;
alter table public.audit_logs        enable row level security;
alter table public.blocks            enable row level security;
alter table public.photos            enable row level security;
alter table public.interests         enable row level security;
alter table public.profile_interests enable row level security;
alter table public.prompts           enable row level security;
alter table public.profile_prompts   enable row level security;
alter table public.affection_profiles enable row level security;
alter table public.lifestyle         enable row level security;
alter table public.preferences       enable row level security;
alter table public.privacy_settings  enable row level security;
alter table public.plans             enable row level security;
alter table public.plan_prices       enable row level security;
alter table public.entitlements      enable row level security;
alter table public.contact_messages  enable row level security;

-- Start from zero: Supabase grants broad table privileges by default.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

-- Functions the app may call
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.profile_age(uuid) to authenticated;
grant execute on function public.submit_birth_date(date) to authenticated;
grant execute on function public.set_location(double precision, double precision, text) to authenticated;
grant execute on function public.complete_onboarding() to authenticated;
grant execute on function public.accept_terms(boolean) to authenticated;
grant execute on function public.staff_set_profile_status(uuid, public.profile_status, text) to authenticated;
grant execute on function public.has_staff_role(public.staff_role) to authenticated;
grant execute on function public.is_staff() to authenticated;
-- Used inside RLS policies
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.age_in_years(date) to authenticated;

-- profiles: read via visibility rule; owners edit only the safe columns.
grant select on public.profiles to authenticated;
grant update (display_name, gender_identity, pronouns, bio, job_title, education, intention, onboarding_step, is_incognito)
  on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (public.can_view_profile(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid() and status in ('onboarding', 'active', 'paused'))
  with check (id = auth.uid());

-- profile_private: owner reads; staff (support+) reads. Writes only through functions,
-- except marketing consent which the owner can toggle.
grant select on public.profile_private to authenticated;
grant update (marketing_consent) on public.profile_private to authenticated;
create policy profile_private_select on public.profile_private for select to authenticated
  using (profile_id = auth.uid() or public.has_staff_role('support'));
create policy profile_private_update_own on public.profile_private for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- staff_roles: you can see your own roles; admins see and manage all.
grant select, insert, delete on public.staff_roles to authenticated;
create policy staff_roles_select on public.staff_roles for select to authenticated
  using (user_id = auth.uid() or public.has_staff_role('admin'));
create policy staff_roles_insert on public.staff_roles for insert to authenticated
  with check (public.has_staff_role('admin') and granted_by = auth.uid());
create policy staff_roles_delete on public.staff_roles for delete to authenticated
  using (public.has_staff_role('admin') and user_id <> auth.uid());

-- audit_logs: admins read; nobody writes directly; nobody edits or deletes.
grant select on public.audit_logs to authenticated;
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (public.has_staff_role('admin'));

-- blocks: you manage your own blocks; staff can read for moderation.
grant select, insert, delete on public.blocks to authenticated;
create policy blocks_select on public.blocks for select to authenticated
  using (blocker_id = auth.uid() or public.has_staff_role('moderator'));
create policy blocks_insert on public.blocks for insert to authenticated
  with check (blocker_id = auth.uid());
create policy blocks_delete on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());

-- photos: others see approved photos of visible profiles; owners manage their own.
grant select, insert, delete on public.photos to authenticated;
grant update (position) on public.photos to authenticated;
create policy photos_select on public.photos for select to authenticated
  using (
    profile_id = auth.uid()
    or public.has_staff_role('moderator')
    or (moderation_status = 'approved' and public.can_view_profile(profile_id))
  );
create policy photos_insert on public.photos for insert to authenticated
  with check (profile_id = auth.uid());
create policy photos_update_own on public.photos for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy photos_delete_own on public.photos for delete to authenticated
  using (profile_id = auth.uid());

-- Catalogues: readable by everyone signed in; admins edit through the dashboard (service role).
grant select on public.interests, public.prompts to authenticated;
create policy interests_select on public.interests for select to authenticated using (active);
create policy prompts_select on public.prompts for select to authenticated using (active);

-- Profile children: visible with the profile, editable by the owner.
grant select, insert, delete on public.profile_interests to authenticated;
create policy profile_interests_select on public.profile_interests for select to authenticated
  using (public.can_view_profile(profile_id));
create policy profile_interests_insert on public.profile_interests for insert to authenticated
  with check (profile_id = auth.uid());
create policy profile_interests_delete on public.profile_interests for delete to authenticated
  using (profile_id = auth.uid());

grant select, insert, update, delete on public.profile_prompts to authenticated;
create policy profile_prompts_select on public.profile_prompts for select to authenticated
  using (public.can_view_profile(profile_id));
create policy profile_prompts_insert on public.profile_prompts for insert to authenticated
  with check (profile_id = auth.uid());
create policy profile_prompts_update on public.profile_prompts for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy profile_prompts_delete on public.profile_prompts for delete to authenticated
  using (profile_id = auth.uid());

grant select on public.affection_profiles, public.lifestyle to authenticated;
grant update (touch_comfort, pace, cuddle_style, public_affection, love_languages) on public.affection_profiles to authenticated;
grant update (drinking, smoking, exercise, kids, pets, diet, religion) on public.lifestyle to authenticated;
create policy affection_select on public.affection_profiles for select to authenticated
  using (public.can_view_profile(profile_id));
create policy affection_update on public.affection_profiles for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy lifestyle_select on public.lifestyle for select to authenticated
  using (public.can_view_profile(profile_id));
create policy lifestyle_update on public.lifestyle for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Preferences and privacy settings: owner only.
grant select on public.preferences, public.privacy_settings to authenticated;
grant update (age_min, age_max, max_distance_km, show_genders, intentions, dealbreakers, weights)
  on public.preferences to authenticated;
grant update (show_online_status, show_last_active, send_read_receipts, hide_age, hide_distance)
  on public.privacy_settings to authenticated;
create policy preferences_own on public.preferences for select to authenticated using (profile_id = auth.uid());
create policy preferences_update on public.preferences for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy privacy_own on public.privacy_settings for select to authenticated using (profile_id = auth.uid());
create policy privacy_update on public.privacy_settings for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Plans: public pricing page reads active plans, anonymously too.
grant select on public.plans, public.plan_prices, public.entitlements to anon, authenticated;
create policy plans_select on public.plans for select to anon, authenticated using (active);
create policy plan_prices_select on public.plan_prices for select to anon, authenticated using (active);
create policy entitlements_select on public.entitlements for select to anon, authenticated
  using (exists (select 1 from public.plans p where p.id = plan_id and p.active));

-- Contact form: anyone may submit; only support staff read.
grant insert (name, email, topic, message) on public.contact_messages to anon, authenticated;
grant select on public.contact_messages to authenticated;
create policy contact_insert on public.contact_messages for insert to anon, authenticated
  with check (status = 'new');
create policy contact_select on public.contact_messages for select to authenticated
  using (public.has_staff_role('support'));

-- age_gate_blocks: no policies, no grants. Only security-definer functions touch it.

-- =============================================================================
-- Storage: private photo bucket. Files live under <user_id>/...
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "profile photos: owner uploads to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profile photos: owner deletes own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profile photos: read own, approved visible, or staff" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_staff_role('moderator')
      or exists (
        select 1 from public.photos ph
        where ph.storage_path = name
          and ph.moderation_status = 'approved'
          and public.can_view_profile(ph.profile_id)
      )
    )
  );
