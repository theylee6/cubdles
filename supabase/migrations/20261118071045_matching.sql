-- =============================================================================
-- Cubdles — migration 4: discovery, likes, passes, matches, compatibility,
-- feature limits, and the account lifecycle (pause / delete / restore).
-- All writes go through security-definer functions; tables are read-only to clients.
-- =============================================================================

create type public.like_kind as enum ('like', 'super');
create type public.match_end_reason as enum ('unmatch', 'block', 'moderation', 'account_deleted');

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table public.likes (
  from_id    uuid not null references public.profiles (id) on delete cascade,
  to_id      uuid not null references public.profiles (id) on delete cascade,
  kind       public.like_kind not null default 'like',
  note       text check (char_length(note) between 1 and 140),
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
create index likes_to_idx on public.likes (to_id, created_at desc);
create index likes_from_created_idx on public.likes (from_id, created_at desc);

create table public.passes (
  from_id    uuid not null references public.profiles (id) on delete cascade,
  to_id      uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
create index passes_to_idx on public.passes (to_id);
create index passes_from_created_idx on public.passes (from_id, created_at desc);

create table public.matches (
  id           uuid primary key default gen_random_uuid(),
  user_a       uuid not null references public.profiles (id) on delete cascade,
  user_b       uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  ended_at     timestamptz,
  ended_by     uuid references public.profiles (id) on delete set null,
  ended_reason public.match_end_reason,
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index matches_user_b_idx on public.matches (user_b);
create index matches_ended_by_idx on public.matches (ended_by);
create index matches_active_a_idx on public.matches (user_a, created_at desc) where ended_at is null;
create index matches_active_b_idx on public.matches (user_b, created_at desc) where ended_at is null;

-- Transparent, versioned scoring weights (editable from the admin dashboard later).
create table public.compatibility_config (
  version    integer generated always as identity primary key,
  weights    jsonb not null,
  active     boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
create unique index compatibility_config_one_active on public.compatibility_config (active) where active;
create index compatibility_config_created_by_idx on public.compatibility_config (created_by);
insert into public.compatibility_config (weights, active)
values ('{"intention": 0.25, "affection": 0.35, "interests": 0.25, "lifestyle": 0.15}', true);

create table public.daily_picks (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  pick_date date not null,
  pick_id   uuid not null references public.profiles (id) on delete cascade,
  rank      smallint not null,
  score     numeric(5, 4) not null,
  reasons   jsonb not null default '[]'::jsonb,
  primary key (user_id, pick_date, pick_id)
);
create index daily_picks_pick_idx on public.daily_picks (pick_id);

alter table public.profile_private add column deletion_requested_at timestamptz;
-- What the account was before deletion was requested, so a restore can't lift a suspension.
alter table public.profile_private add column status_before_deletion public.profile_status;
create index profile_private_deletion_idx on public.profile_private (deletion_requested_at) where deletion_requested_at is not null;

-- Discovery filters on location, so index the joins it uses.
create index profiles_active_gender_idx on public.profiles (gender_group) where status = 'active';

-- -----------------------------------------------------------------------------
-- Private helpers
-- -----------------------------------------------------------------------------

-- The member's plan. Everyone is on 'free' until subscriptions arrive (milestone 6).
create or replace function private.current_plan_code(p_uid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select 'free'::text
$$;

-- Feature limit for a member: {"limit": n|null, "period": "day"|"week"|"month"|null}.
-- limit null = unlimited, 0 = not included. Plan rows win; built-in defaults apply when no plan is configured.
create or replace function private.feature_limit(p_uid uuid, p_key text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  r record;
begin
  select e.limit_value, e.period into r
  from public.entitlements e
  join public.plans p on p.id = e.plan_id
  where p.code = private.current_plan_code(p_uid) and p.active and e.feature_key = p_key;
  if found then
    return jsonb_build_object('limit', r.limit_value, 'period', r.period);
  end if;
  return case p_key
    when 'daily_likes' then '{"limit": 25, "period": "day"}'
    when 'super_likes' then '{"limit": 1, "period": "week"}'
    else '{"limit": 0, "period": null}'
  end::jsonb;
end $$;

create or replace function private.has_feature(p_uid uuid, p_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (l ->> 'limit') is null or (l ->> 'limit')::int > 0
  from (select private.feature_limit(p_uid, p_key) as l) s
$$;

-- Start of the current quota period, in India time (launch market).
create or replace function private.period_start(p_period text)
returns timestamptz language sql stable set search_path = '' as $$
  select (date_trunc(coalesce(p_period, 'day'), now() at time zone 'Asia/Kolkata')) at time zone 'Asia/Kolkata'
$$;

-- Distances are only ever shown as rough buckets.
create or replace function private.distance_bucket(km double precision)
returns text language sql immutable set search_path = '' as $$
  select case
    when km is null then null
    when km < 5 then 'under_5'
    when km < 10 then '5_10'
    when km < 25 then '10_25'
    when km < 50 then '25_50'
    else '50_plus'
  end
$$;

-- Transparent compatibility score in [0,1] plus reason codes the app turns into copy.
create or replace function private.compatibility(p_viewer uuid, p_cand uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  w jsonb;
  vi text; ci text;
  va public.affection_profiles; ca public.affection_profiles;
  vl public.lifestyle; cl public.lifestyle;
  s_int numeric; s_aff numeric; s_pace numeric; s_spoon numeric; s_touch numeric; s_love numeric;
  s_interests numeric; s_life numeric := 1;
  shared integer;
  total_w numeric;
  score numeric;
  reasons jsonb := '[]'::jsonb;
  long_group text[] := array['life_partner', 'long_term', 'long_term_open'];
  open_group text[] := array['long_term_open', 'short_term_open', 'figuring_out'];
begin
  select weights into w from public.compatibility_config where active;
  w := coalesce(w, '{"intention": 0.25, "affection": 0.35, "interests": 0.25, "lifestyle": 0.15}'::jsonb);

  -- Intentions
  select intention::text into vi from public.profiles where id = p_viewer;
  select intention::text into ci from public.profiles where id = p_cand;
  s_int := case
    when vi = ci then 1
    when vi = any(long_group) and ci = any(long_group) then 0.8
    when vi = any(open_group) and ci = any(open_group) then 0.6
    else 0.2 end;
  if vi = ci then reasons := reasons || jsonb_build_object('code', 'same_intention', 'value', vi); end if;

  -- Affection profile
  select * into va from public.affection_profiles where profile_id = p_viewer;
  select * into ca from public.affection_profiles where profile_id = p_cand;
  s_pace := case
    when va.pace is null or ca.pace is null then 0.5
    when va.pace = ca.pace then 1
    when va.pace = 'steady' or ca.pace = 'steady' then 0.6
    else 0.2 end;
  s_spoon := case
    when va.cuddle_style is null or ca.cuddle_style is null then 0.5
    when (va.cuddle_style, ca.cuddle_style) in (('big_spoon', 'little_spoon'), ('little_spoon', 'big_spoon')) then 1
    when va.cuddle_style = 'either' and ca.cuddle_style = 'either' then 0.9
    when va.cuddle_style = 'either' or ca.cuddle_style = 'either' then 0.85
    when va.cuddle_style = 'not_sure' or ca.cuddle_style = 'not_sure' then 0.6
    else 0.4 end;
  s_touch := case
    when va.touch_comfort is null or ca.touch_comfort is null then 0.5
    else 1 - abs(va.touch_comfort - ca.touch_comfort) / 4.0 end;
  s_love := case when coalesce(va.love_languages && ca.love_languages, false) then 1 else 0.5 end;
  s_aff := s_pace * 0.35 + s_spoon * 0.25 + s_touch * 0.3 + s_love * 0.1;
  if va.pace is not null and va.pace = ca.pace then
    reasons := reasons || jsonb_build_object('code', 'same_pace', 'value', va.pace);
  end if;
  if s_spoon = 1 then reasons := reasons || jsonb_build_object('code', 'spoons_fit'); end if;
  if va.touch_comfort >= 4 and ca.touch_comfort >= 4 then reasons := reasons || jsonb_build_object('code', 'both_cuddly'); end if;
  if coalesce(va.love_languages && ca.love_languages, false) then
    reasons := reasons || jsonb_build_object('code', 'same_love_language',
      'value', (select x from unnest(va.love_languages) x where x = any(ca.love_languages) limit 1));
  end if;

  -- Interests: three or more shared counts as a full match.
  select count(*) into shared
  from public.profile_interests a
  join public.profile_interests b on b.interest_id = a.interest_id
  where a.profile_id = p_viewer and b.profile_id = p_cand;
  s_interests := least(1, shared / 3.0);
  if shared > 0 then reasons := reasons || jsonb_build_object('code', 'shared_interests', 'count', shared); end if;

  -- Lifestyle: only clear conflicts lower the score.
  select * into vl from public.lifestyle where profile_id = p_viewer;
  select * into cl from public.lifestyle where profile_id = p_cand;
  if (vl.smoking = 'never' and cl.smoking = 'often') or (cl.smoking = 'never' and vl.smoking = 'often') then s_life := s_life - 0.4; end if;
  if (vl.kids = 'want' and cl.kids = 'dont_want') or (cl.kids = 'want' and vl.kids = 'dont_want') then s_life := s_life - 0.5; end if;
  if (vl.drinking = 'never' and cl.drinking = 'often') or (cl.drinking = 'never' and vl.drinking = 'often') then s_life := s_life - 0.2; end if;
  s_life := greatest(0, s_life);

  total_w := coalesce((w ->> 'intention')::numeric, 0) + coalesce((w ->> 'affection')::numeric, 0)
           + coalesce((w ->> 'interests')::numeric, 0) + coalesce((w ->> 'lifestyle')::numeric, 0);
  score := (coalesce((w ->> 'intention')::numeric, 0) * s_int
          + coalesce((w ->> 'affection')::numeric, 0) * s_aff
          + coalesce((w ->> 'interests')::numeric, 0) * s_interests
          + coalesce((w ->> 'lifestyle')::numeric, 0) * s_life) / nullif(total_w, 0);

  return jsonb_build_object(
    'score', round(coalesce(score, 0), 4),
    'reasons', reasons,
    'parts', jsonb_build_object('intention', round(s_int, 3), 'affection', round(s_aff, 3), 'interests', round(s_interests, 3), 'lifestyle', round(s_life, 3))
  );
end $$;

-- Visibility now also covers people you're matched with (even if they've paused).
create or replace function private.can_view_profile(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    auth.uid() is not null
    and (
      target = auth.uid()
      or private.is_staff()
      or (
        not private.is_blocked_between(auth.uid(), target)
        and exists (select 1 from public.profiles me where me.id = auth.uid() and me.status in ('active', 'paused'))
        and (
          exists (select 1 from public.profiles p where p.id = target and p.status = 'active')
          or (
            exists (select 1 from public.profiles p where p.id = target and p.status = 'paused')
            and exists (
              select 1 from public.matches m
              where m.user_a = least(auth.uid(), target) and m.user_b = greatest(auth.uid(), target) and m.ended_at is null
            )
          )
        )
      )
    )
$$;

-- -----------------------------------------------------------------------------
-- Discovery
-- -----------------------------------------------------------------------------

-- Candidates for the signed-in member, best first. Excludes anyone already liked,
-- passed, matched (even past matches), blocked either way, out of mutual preferences,
-- without an approved photo, or incognito (unless they liked you).
-- p_filters keys: intentions (free); interest_ids, cuddle_styles, paces, recently_active_days (premium).
create or replace function public.discover(p_limit integer default 20, p_offset integer default 0, p_filters jsonb default '{}'::jsonb)
returns table (profile_id uuid, score numeric, reasons jsonb)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  my public.profiles;
  my_pp public.profile_private;
  my_pref public.preferences;
  my_age integer;
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into my from public.profiles where id = me;
  if my.status is distinct from 'active' then
    raise exception 'profile_not_active' using errcode = 'check_violation';
  end if;
  p_filters := coalesce(p_filters, '{}'::jsonb);
  if p_filters ?| array['interest_ids', 'cuddle_styles', 'paces', 'recently_active_days'] and not private.has_feature(me, 'advanced_filters') then
    raise exception 'premium_required' using errcode = 'check_violation';
  end if;

  select * into my_pp from public.profile_private where profile_id = me;
  select * into my_pref from public.preferences where profile_id = me;
  my_age := public.age_in_years(my_pp.birth_date);
  p_limit := least(greatest(coalesce(p_limit, 20), 1), 50);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  return query
  with cands as (
    select c.id
    from public.profiles c
    join public.profile_private cp on cp.profile_id = c.id
    join public.preferences cpref on cpref.profile_id = c.id
    where c.status = 'active'
      and c.id <> me
      and c.gender_group = any (my_pref.show_genders)
      and my.gender_group = any (cpref.show_genders)
      and public.age_in_years(cp.birth_date) between my_pref.age_min and my_pref.age_max
      and my_age between cpref.age_min and cpref.age_max
      and extensions.st_dwithin(cp.location, my_pp.location, my_pref.max_distance_km * 1000.0)
      and not exists (select 1 from public.blocks b where (b.blocker_id = me and b.blocked_id = c.id) or (b.blocker_id = c.id and b.blocked_id = me))
      and not exists (select 1 from public.likes l where l.from_id = me and l.to_id = c.id)
      and not exists (select 1 from public.passes x where x.from_id = me and x.to_id = c.id)
      and not exists (select 1 from public.matches m where m.user_a = least(me, c.id) and m.user_b = greatest(me, c.id))
      and exists (select 1 from public.photos ph where ph.profile_id = c.id and ph.moderation_status = 'approved')
      and (not c.is_incognito or exists (select 1 from public.likes l2 where l2.from_id = c.id and l2.to_id = me))
      and (not (p_filters ? 'intentions')
           or c.intention::text in (select jsonb_array_elements_text(p_filters -> 'intentions')))
      and (not (p_filters ? 'interest_ids')
           or exists (select 1 from public.profile_interests pi where pi.profile_id = c.id
                      and pi.interest_id::text in (select jsonb_array_elements_text(p_filters -> 'interest_ids'))))
      and (not (p_filters ? 'cuddle_styles')
           or exists (select 1 from public.affection_profiles a where a.profile_id = c.id
                      and a.cuddle_style::text in (select jsonb_array_elements_text(p_filters -> 'cuddle_styles'))))
      and (not (p_filters ? 'paces')
           or exists (select 1 from public.affection_profiles a where a.profile_id = c.id
                      and a.pace::text in (select jsonb_array_elements_text(p_filters -> 'paces'))))
      and (not (p_filters ? 'recently_active_days')
           or (c.last_active_at > now() - make_interval(days => least(greatest((p_filters ->> 'recently_active_days')::int, 1), 30))
               and exists (select 1 from public.privacy_settings ps where ps.profile_id = c.id and ps.show_last_active)))
  ), scored as (
    select c.id, private.compatibility(me, c.id) as compat from cands c
  )
  select s.id, (s.compat ->> 'score')::numeric, s.compat -> 'reasons'
  from scored s
  order by (s.compat ->> 'score')::numeric desc, s.id
  limit p_limit offset p_offset;
end $$;

-- Full profile cards for up to 50 visible profiles, in the order given.
-- Respects each person's privacy settings (hidden age/distance, last active).
create or replace function public.profile_cards(p_ids uuid[])
returns jsonb language sql stable security definer set search_path = '' as $$
  with me as (
    select auth.uid() as id, (select location from public.profile_private where profile_id = auth.uid()) as location
  )
  select coalesce(jsonb_agg(s.card order by s.ord), '[]'::jsonb)
  from (
    select ids.ord, jsonb_build_object(
      'id', p.id,
      'display_name', p.display_name,
      'age', case when ps.hide_age and p.id <> me.id then null else public.age_in_years(pp.birth_date) end,
      'gender', p.gender_identity,
      'pronouns', p.pronouns,
      'city', p.city,
      'intention', p.intention,
      'bio', p.bio,
      'job_title', p.job_title,
      'education', p.education,
      'distance', case when p.id = me.id or ps.hide_distance then null
                       else private.distance_bucket(extensions.st_distance(pp.location, me.location) / 1000.0) end,
      'last_active_at', case when ps.show_last_active then p.last_active_at end,
      'affection', (select jsonb_build_object('cuddle_style', a.cuddle_style, 'pace', a.pace, 'touch_comfort', a.touch_comfort,
                                              'public_affection', a.public_affection, 'love_languages', a.love_languages)
                    from public.affection_profiles a where a.profile_id = p.id),
      'lifestyle', (select to_jsonb(l) - 'profile_id' - 'updated_at' - 'religion' from public.lifestyle l where l.profile_id = p.id),
      'interests', (select coalesce(jsonb_agg(i.label order by i.label), '[]'::jsonb)
                    from public.profile_interests pi join public.interests i on i.id = pi.interest_id where pi.profile_id = p.id),
      'prompts', (select coalesce(jsonb_agg(jsonb_build_object('question', q.text, 'answer', pr.answer) order by pr.position), '[]'::jsonb)
                  from public.profile_prompts pr join public.prompts q on q.id = pr.prompt_id where pr.profile_id = p.id),
      'photos', (select coalesce(jsonb_agg(jsonb_build_object('id', ph.id, 'path', ph.storage_path, 'width', ph.width, 'height', ph.height)
                                           order by ph.position), '[]'::jsonb)
                 from public.photos ph
                 where ph.profile_id = p.id and (ph.moderation_status = 'approved' or p.id = me.id)),
      'compatibility', case when p.id = me.id then null else private.compatibility(me.id, p.id) end,
      'match_id', (select m.id from public.matches m
                   where m.user_a = least(me.id, p.id) and m.user_b = greatest(me.id, p.id) and m.ended_at is null)
    ) as card
    from unnest((p_ids)[1:50]) with ordinality as ids(id, ord)
    join public.profiles p on p.id = ids.id
    join public.profile_private pp on pp.profile_id = p.id
    join public.privacy_settings ps on ps.profile_id = p.id
    cross join me
    where private.can_view_profile(p.id)
  ) s
$$;

-- -----------------------------------------------------------------------------
-- Likes, passes, matches
-- -----------------------------------------------------------------------------

-- Like, super like or pass. Serialised per pair, so two people liking each other
-- at the same moment always produce exactly one match.
create or replace function public.swipe(p_target uuid, p_action text, p_note text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  lim jsonb;
  used integer;
  quota_key text;
  match_id uuid;
  clean_note text := nullif(btrim(p_note), '');
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_action not in ('like', 'super', 'pass') then
    raise exception 'invalid_action' using errcode = 'check_violation';
  end if;
  if (select status from public.profiles where id = me) is distinct from 'active' then
    raise exception 'profile_not_active' using errcode = 'check_violation';
  end if;
  if p_target is null or p_target = me
     or not exists (select 1 from public.profiles where id = p_target and status = 'active')
     or private.is_blocked_between(me, p_target) then
    raise exception 'target_unavailable' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(least(me, p_target)::text || greatest(me, p_target)::text, 0));

  if p_action = 'pass' then
    insert into public.passes (from_id, to_id) values (me, p_target)
    on conflict (from_id, to_id) do update set created_at = now();
    return jsonb_build_object('matched', false);
  end if;

  if exists (select 1 from public.likes where from_id = me and to_id = p_target) then
    select m.id into match_id from public.matches m
    where m.user_a = least(me, p_target) and m.user_b = greatest(me, p_target) and m.ended_at is null;
    return jsonb_build_object('matched', match_id is not null, 'match_id', match_id, 'already_liked', true);
  end if;
  if exists (select 1 from public.matches m where m.user_a = least(me, p_target) and m.user_b = greatest(me, p_target)) then
    raise exception 'target_unavailable' using errcode = 'check_violation'; -- a past match was ended
  end if;

  quota_key := case when p_action = 'super' then 'super_likes' else 'daily_likes' end;
  lim := private.feature_limit(me, quota_key);
  if (lim ->> 'limit') is not null then
    if (lim ->> 'limit')::int = 0 then
      raise exception 'premium_required' using errcode = 'check_violation';
    end if;
    select count(*) into used from public.likes
    where from_id = me
      and kind = (case when p_action = 'super' then 'super' else 'like' end)::public.like_kind
      and created_at >= private.period_start(lim ->> 'period');
    if used >= (lim ->> 'limit')::int then
      raise exception '%', case when p_action = 'super' then 'super_like_limit_reached' else 'like_limit_reached' end
        using errcode = 'check_violation';
    end if;
  end if;

  if clean_note is not null then
    if not private.has_feature(me, 'note_with_like') then
      raise exception 'premium_required' using errcode = 'check_violation';
    end if;
    if char_length(clean_note) > 140 then
      raise exception 'note_too_long' using errcode = 'check_violation';
    end if;
  end if;

  insert into public.likes (from_id, to_id, kind, note)
  values (me, p_target, (case when p_action = 'super' then 'super' else 'like' end)::public.like_kind, clean_note);
  delete from public.passes where from_id = me and to_id = p_target;

  if exists (select 1 from public.likes where from_id = p_target and to_id = me) then
    insert into public.matches (user_a, user_b) values (least(me, p_target), greatest(me, p_target))
    on conflict (user_a, user_b) do nothing
    returning id into match_id;
    return jsonb_build_object('matched', match_id is not null, 'match_id', match_id);
  end if;
  return jsonb_build_object('matched', false);
end $$;

-- Premium: take back the most recent pass (within the last hour).
create or replace function public.undo_last_pass()
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  target uuid;
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not private.has_feature(me, 'undo') then
    raise exception 'premium_required' using errcode = 'check_violation';
  end if;
  delete from public.passes
  where (from_id, to_id) = (
    select from_id, to_id from public.passes
    where from_id = me and created_at > now() - interval '1 hour'
    order by created_at desc limit 1
  )
  returning to_id into target;
  return target;
end $$;

-- End a match. Both likes are removed and the pair never reappear in discovery.
create or replace function public.unmatch(p_match_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  m public.matches;
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into m from public.matches where id = p_match_id and me in (user_a, user_b) for update;
  if m.id is null then
    raise exception 'match_not_found' using errcode = 'check_violation';
  end if;
  if m.ended_at is not null then
    return;
  end if;
  update public.matches set ended_at = now(), ended_by = me, ended_reason = 'unmatch' where id = m.id;
  delete from public.likes where (from_id = m.user_a and to_id = m.user_b) or (from_id = m.user_b and to_id = m.user_a);
end $$;

-- Blocking ends any match and removes likes between the two people.
create or replace function private.on_block()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.matches
     set ended_at = now(), ended_by = new.blocker_id, ended_reason = 'block'
   where user_a = least(new.blocker_id, new.blocked_id) and user_b = greatest(new.blocker_id, new.blocked_id)
     and ended_at is null;
  delete from public.likes
   where (from_id = new.blocker_id and to_id = new.blocked_id) or (from_id = new.blocked_id and to_id = new.blocker_id);
  return new;
end $$;
create trigger blocks_end_match after insert on public.blocks
  for each row execute function private.on_block();

-- How many people are waiting in "Liked you", and whether this member can see who.
create or replace function public.likes_received_summary()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'count', count(*),
    'can_see', private.has_feature(auth.uid(), 'see_likes')
  )
  from public.likes l
  join public.profiles p on p.id = l.from_id and p.status = 'active'
  where l.to_id = auth.uid()
    and not private.is_blocked_between(auth.uid(), l.from_id)
    and not exists (select 1 from public.likes back where back.from_id = auth.uid() and back.to_id = l.from_id)
    and not exists (select 1 from public.passes x where x.from_id = auth.uid() and x.to_id = l.from_id)
$$;

-- Today's picks: the top 5 candidates, fixed for the day (India time).
create or replace function public.get_daily_picks()
returns table (profile_id uuid, score numeric, reasons jsonb)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.daily_picks d where d.user_id = me and d.pick_date = today) then
    insert into public.daily_picks (user_id, pick_date, pick_id, rank, score, reasons)
    select me, today, d.profile_id, (row_number() over ())::smallint, d.score, d.reasons
    from public.discover(5, 0, '{}'::jsonb) d
    on conflict do nothing;
  end if;
  return query
  select d.pick_id, d.score, d.reasons
  from public.daily_picks d
  where d.user_id = me and d.pick_date = today
    and not exists (select 1 from public.likes l where l.from_id = me and l.to_id = d.pick_id)
    and not exists (select 1 from public.passes x where x.from_id = me and x.to_id = d.pick_id)
    and private.can_view_profile(d.pick_id)
  order by d.rank;
end $$;

-- -----------------------------------------------------------------------------
-- Account lifecycle
-- -----------------------------------------------------------------------------
create or replace function public.set_paused(p_paused boolean)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  st public.profile_status;
begin
  select status into st from public.profiles where id = auth.uid() for update;
  if st not in ('active', 'paused') then
    raise exception 'not_allowed' using errcode = 'check_violation';
  end if;
  update public.profiles set status = case when p_paused then 'paused' else 'active' end::public.profile_status
  where id = auth.uid();
end $$;

-- Hides the profile at once; the account is permanently purged after 30 days unless restored.
create or replace function public.request_account_deletion()
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  st public.profile_status;
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select status into st from public.profiles where id = me for update;
  if st in ('banned', 'deleted') then
    raise exception 'not_allowed' using errcode = 'check_violation';
  end if;
  update public.profiles set status = 'deleted', status_reason = 'user_request' where id = me;
  update public.profile_private set deletion_requested_at = now(), status_before_deletion = st where profile_id = me;
  update public.matches set ended_at = now(), ended_by = me, ended_reason = 'account_deleted'
   where me in (user_a, user_b) and ended_at is null;
end $$;

-- Undo a deletion request within the 30-day grace period, back to exactly the previous status.
-- Accounts that were suspended before deleting can't restore themselves (they contact support).
create or replace function public.restore_account()
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  p public.profiles;
  pp public.profile_private;
begin
  select * into p from public.profiles where id = me for update;
  select * into pp from public.profile_private where profile_id = me;
  if p.status is distinct from 'deleted' or p.status_reason is distinct from 'user_request'
     or pp.deletion_requested_at < now() - interval '30 days'
     or pp.status_before_deletion not in ('onboarding', 'active', 'paused') then
    raise exception 'not_allowed' using errcode = 'check_violation';
  end if;
  update public.profiles set status = pp.status_before_deletion, status_reason = null where id = me;
  update public.profile_private set deletion_requested_at = null, status_before_deletion = null where profile_id = me;
end $$;

-- Accounts past the grace period, for the purge job (service role only).
create or replace function private.accounts_due_for_purge(p_limit integer default 100)
returns table (profile_id uuid) language sql stable security definer set search_path = '' as $$
  select pp.profile_id
  from public.profile_private pp
  join public.profiles p on p.id = pp.profile_id
  where p.status = 'deleted' and pp.deletion_requested_at < now() - interval '30 days'
  order by pp.deletion_requested_at
  limit p_limit
$$;

-- Mark the member as active now (throttled to once every 5 minutes).
create or replace function public.touch_last_active()
returns void language sql volatile security definer set search_path = '' as $$
  update public.profiles set last_active_at = now()
  where id = auth.uid() and last_active_at < now() - interval '5 minutes'
$$;

-- -----------------------------------------------------------------------------
-- RLS and grants (tables are read-only to clients; writes go through functions)
-- -----------------------------------------------------------------------------
alter table public.likes enable row level security;
alter table public.passes enable row level security;
alter table public.matches enable row level security;
alter table public.compatibility_config enable row level security;
alter table public.daily_picks enable row level security;

revoke all on public.likes, public.passes, public.matches, public.compatibility_config, public.daily_picks from anon, authenticated;
grant select on public.likes, public.passes, public.matches, public.daily_picks to authenticated;

-- Sent likes are always visible; received likes only with the "see who liked you" feature.
create policy likes_select on public.likes for select to authenticated
  using (
    from_id = (select auth.uid())
    or (to_id = (select auth.uid()) and (select private.has_feature((select auth.uid()), 'see_likes')))
  );
create policy passes_select on public.passes for select to authenticated
  using (from_id = (select auth.uid()));
create policy matches_select on public.matches for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
create policy daily_picks_select on public.daily_picks for select to authenticated
  using (user_id = (select auth.uid()));
-- compatibility_config: no client access; admins manage it through audited server actions.

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
revoke execute on function private.accounts_due_for_purge(integer) from authenticated;

revoke all on function public.discover(integer, integer, jsonb) from public, anon;
revoke all on function public.profile_cards(uuid[]) from public, anon;
revoke all on function public.swipe(uuid, text, text) from public, anon;
revoke all on function public.undo_last_pass() from public, anon;
revoke all on function public.unmatch(uuid) from public, anon;
revoke all on function public.likes_received_summary() from public, anon;
revoke all on function public.get_daily_picks() from public, anon;
revoke all on function public.set_paused(boolean) from public, anon;
revoke all on function public.request_account_deletion() from public, anon;
revoke all on function public.restore_account() from public, anon;
revoke all on function public.touch_last_active() from public, anon;
grant execute on function public.discover(integer, integer, jsonb) to authenticated;
grant execute on function public.profile_cards(uuid[]) to authenticated;
grant execute on function public.swipe(uuid, text, text) to authenticated;
grant execute on function public.undo_last_pass() to authenticated;
grant execute on function public.unmatch(uuid) to authenticated;
grant execute on function public.likes_received_summary() to authenticated;
grant execute on function public.get_daily_picks() to authenticated;
grant execute on function public.set_paused(boolean) to authenticated;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.restore_account() to authenticated;
grant execute on function public.touch_last_active() to authenticated;
