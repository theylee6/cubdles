-- =============================================================================
-- Cubdles — migration 2: profile set-up (onboarding)
-- Adds the gender group used for matching, and atomic functions for the
-- multi-row parts of a profile (photos order, interests, prompts).
-- =============================================================================

-- Gender: a matching group (closed set) plus the free-text label people see.
alter table public.profiles
  add column gender_group text check (gender_group in ('woman', 'man', 'nonbinary'));
grant update (gender_group) on public.profiles to authenticated;

-- "Show me" must use the same closed set.
alter table public.preferences
  add constraint preferences_show_genders_valid
  check (show_genders <@ array['woman', 'man', 'nonbinary']::text[]);

-- Owners may update onboarding_step, but it may only move forward (except staff/service).
create or replace function public.onboarding_step_guard()
returns trigger language plpgsql as $$
begin
  if new.onboarding_step < old.onboarding_step and auth.uid() = old.id then
    new.onboarding_step := old.onboarding_step;
  end if;
  return new;
end $$;
create trigger profiles_onboarding_step_guard before update of onboarding_step on public.profiles
  for each row execute function public.onboarding_step_guard();

-- -----------------------------------------------------------------------------
-- Photos: reorder in one statement (positions are a deferred unique constraint).
-- p_ids lists ALL of the caller's photos in the desired order.
-- -----------------------------------------------------------------------------
create or replace function public.reorder_photos(p_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  owned integer;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 or cardinality(p_ids) <> (select count(distinct x) from unnest(p_ids) x) then
    raise exception 'invalid_photo_list' using errcode = 'check_violation';
  end if;
  select count(*) into owned from public.photos where profile_id = uid;
  if owned <> cardinality(p_ids)
     or exists (select 1 from unnest(p_ids) x where not exists (select 1 from public.photos p where p.id = x and p.profile_id = uid)) then
    raise exception 'invalid_photo_list' using errcode = 'check_violation';
  end if;

  update public.photos p
     set position = o.ord - 1
    from unnest(p_ids) with ordinality as o(id, ord)
   where p.id = o.id and p.profile_id = uid;
end $$;

-- Lowest free photo slot for the caller (0–5), or null when full.
create or replace function public.next_photo_position()
returns smallint language sql stable security definer set search_path = '' as $$
  select min(s)::smallint
  from generate_series(0, 5) s
  where not exists (select 1 from public.photos p where p.profile_id = auth.uid() and p.position = s)
$$;

-- After a delete, close gaps so positions stay 0..n-1.
create or replace function public.compact_photo_positions()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.photos p
     set position = o.rn - 1
    from (
      select id, row_number() over (order by position, created_at) as rn
      from public.photos where profile_id = auth.uid()
    ) o
   where p.id = o.id and p.position <> o.rn - 1;
end $$;

-- -----------------------------------------------------------------------------
-- Interests: replace the whole set atomically (max 10, active catalogue only).
-- -----------------------------------------------------------------------------
create or replace function public.set_profile_interests(p_ids smallint[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  p_ids := coalesce(p_ids, '{}');
  if cardinality(p_ids) > 10 then
    raise exception 'profile_interests_limit_reached' using errcode = 'check_violation';
  end if;
  if exists (select 1 from unnest(p_ids) x where not exists (select 1 from public.interests i where i.id = x and i.active)) then
    raise exception 'unknown_interest' using errcode = 'check_violation';
  end if;
  delete from public.profile_interests where profile_id = uid;
  insert into public.profile_interests (profile_id, interest_id)
  select distinct uid, x from unnest(p_ids) x;
end $$;

-- -----------------------------------------------------------------------------
-- Prompts: replace all answers atomically.
-- p_answers = [{"prompt_id": 3, "answer": "..."}, ...] in display order, max 3.
-- -----------------------------------------------------------------------------
create or replace function public.set_profile_prompts(p_answers jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  n integer;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'invalid_prompts' using errcode = 'check_violation';
  end if;
  n := jsonb_array_length(p_answers);
  if n > 3 then
    raise exception 'profile_prompts_limit_reached' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_answers) e
    where not exists (select 1 from public.prompts p where p.id = (e ->> 'prompt_id')::smallint and p.active)
  ) then
    raise exception 'unknown_prompt' using errcode = 'check_violation';
  end if;
  if (select count(distinct e ->> 'prompt_id') from jsonb_array_elements(p_answers) e) <> n then
    raise exception 'duplicate_prompt' using errcode = 'check_violation';
  end if;

  delete from public.profile_prompts where profile_id = uid;
  insert into public.profile_prompts (profile_id, prompt_id, answer, position)
  select uid, (e ->> 'prompt_id')::smallint, btrim(e ->> 'answer'), (ord - 1)::smallint
  from jsonb_array_elements(p_answers) with ordinality as t(e, ord);
end $$;

-- -----------------------------------------------------------------------------
-- complete_onboarding: now also requires gender group, at least one prompt,
-- an affection profile, and who you'd like to meet.
-- -----------------------------------------------------------------------------
create or replace function public.complete_onboarding()
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  p public.profiles;
  pp public.profile_private;
  pref public.preferences;
  aff public.affection_profiles;
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
  if pp.terms_accepted_at is null or pp.privacy_accepted_at is null then
    raise exception 'consent_missing' using errcode = 'check_violation';
  end if;
  if p.display_name is null or p.gender_group is null or p.gender_identity is null or p.intention is null then
    raise exception 'profile_incomplete' using errcode = 'check_violation';
  end if;
  select * into pref from public.preferences where profile_id = uid;
  if cardinality(pref.show_genders) = 0 then
    raise exception 'preferences_missing' using errcode = 'check_violation';
  end if;
  if pp.location is null then
    raise exception 'location_missing' using errcode = 'check_violation';
  end if;
  select * into aff from public.affection_profiles where profile_id = uid;
  if aff.cuddle_style is null or aff.pace is null or aff.touch_comfort is null then
    raise exception 'affection_missing' using errcode = 'check_violation';
  end if;
  select count(*) into photo_count from public.photos where profile_id = uid and moderation_status <> 'rejected';
  if photo_count < 2 then
    raise exception 'photos_missing' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.profile_prompts where profile_id = uid) then
    raise exception 'prompts_missing' using errcode = 'check_violation';
  end if;

  update public.profiles set status = 'active', onboarding_step = 20 where id = uid;
end $$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
revoke all on function public.reorder_photos(uuid[]) from public, anon;
revoke all on function public.next_photo_position() from public, anon;
revoke all on function public.compact_photo_positions() from public, anon;
revoke all on function public.set_profile_interests(smallint[]) from public, anon;
revoke all on function public.set_profile_prompts(jsonb) from public, anon;
revoke all on function public.complete_onboarding() from public, anon;
revoke all on function public.onboarding_step_guard() from public, anon, authenticated;
grant execute on function public.reorder_photos(uuid[]) to authenticated;
grant execute on function public.next_photo_position() to authenticated;
grant execute on function public.compact_photo_positions() to authenticated;
grant execute on function public.set_profile_interests(smallint[]) to authenticated;
grant execute on function public.set_profile_prompts(jsonb) to authenticated;
grant execute on function public.complete_onboarding() to authenticated;
