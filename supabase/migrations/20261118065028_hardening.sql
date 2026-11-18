-- =============================================================================
-- Cubdles — migration 3: hardening from Supabase advisors
--  1. Policy helper functions move to a `private` schema that the REST API does
--     not expose (they were callable via /rpc — e.g. anyone could ask whether two
--     OTHER members had blocked each other).
--  2. RLS policies use (select auth.uid()) so it is evaluated once per query.
--  3. Fixed search_path on the remaining functions; indexes for foreign keys.
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- RLS policies store functions by OID, so moving them keeps every policy working.
alter function public.is_staff() set schema private;
alter function public.has_staff_role(public.staff_role) set schema private;
alter function public.is_blocked_between(uuid, uuid) set schema private;
alter function public.can_view_profile(uuid) set schema private;

-- Function bodies refer to each other by name, so update the ones that changed schema.
create or replace function private.can_view_profile(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    auth.uid() is not null
    and (
      target = auth.uid()
      or private.is_staff()
      or (
        exists (select 1 from public.profiles p where p.id = target and p.status = 'active')
        and exists (select 1 from public.profiles me where me.id = auth.uid() and me.status in ('active', 'paused'))
        and not private.is_blocked_between(auth.uid(), target)
      )
    )
$$;

create or replace function public.profile_age(target uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select public.age_in_years(pp.birth_date)
  from public.profile_private pp
  where pp.profile_id = target and private.can_view_profile(target)
$$;

create or replace function public.photos_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.photos where profile_id = new.profile_id) >= 6 then
      raise exception 'photo_limit_reached' using errcode = 'check_violation';
    end if;
    if not private.is_staff() then
      new.moderation_status := 'pending';
      new.moderation_note := null;
    end if;
    if split_part(new.storage_path, '/', 1) <> new.profile_id::text then
      raise exception 'invalid_storage_path' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

create or replace function public.staff_set_profile_status(target uuid, new_status public.profile_status, reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  old_status public.profile_status;
begin
  if not private.has_staff_role('moderator') then
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

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

-- Fixed search_path for the remaining functions.
alter function public.set_updated_at() set search_path = '';
alter function public.age_in_years(date) set search_path = '';
alter function public.onboarding_step_guard() set search_path = '';

-- -----------------------------------------------------------------------------
-- Policies: (select auth.uid()) and (select private.has_staff_role(...)) are
-- evaluated once per statement instead of once per row.
-- -----------------------------------------------------------------------------
drop policy profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()) and status in ('onboarding', 'active', 'paused'))
  with check (id = (select auth.uid()));

drop policy profile_private_select on public.profile_private;
create policy profile_private_select on public.profile_private for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.has_staff_role('support')));
drop policy profile_private_update_own on public.profile_private;
create policy profile_private_update_own on public.profile_private for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

drop policy staff_roles_select on public.staff_roles;
create policy staff_roles_select on public.staff_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('admin')));
drop policy staff_roles_insert on public.staff_roles;
create policy staff_roles_insert on public.staff_roles for insert to authenticated
  with check ((select private.has_staff_role('admin')) and granted_by = (select auth.uid()));
drop policy staff_roles_delete on public.staff_roles;
create policy staff_roles_delete on public.staff_roles for delete to authenticated
  using ((select private.has_staff_role('admin')) and user_id <> (select auth.uid()));

drop policy audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs for select to authenticated
  using ((select private.has_staff_role('admin')));

drop policy blocks_select on public.blocks;
create policy blocks_select on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()) or (select private.has_staff_role('moderator')));
drop policy blocks_insert on public.blocks;
create policy blocks_insert on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
drop policy blocks_delete on public.blocks;
create policy blocks_delete on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

drop policy photos_select on public.photos;
create policy photos_select on public.photos for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (select private.has_staff_role('moderator'))
    or (moderation_status = 'approved' and private.can_view_profile(profile_id))
  );
drop policy photos_insert on public.photos;
create policy photos_insert on public.photos for insert to authenticated
  with check (profile_id = (select auth.uid()));
drop policy photos_update_own on public.photos;
create policy photos_update_own on public.photos for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
drop policy photos_delete_own on public.photos;
create policy photos_delete_own on public.photos for delete to authenticated
  using (profile_id = (select auth.uid()));

drop policy profile_interests_insert on public.profile_interests;
create policy profile_interests_insert on public.profile_interests for insert to authenticated
  with check (profile_id = (select auth.uid()));
drop policy profile_interests_delete on public.profile_interests;
create policy profile_interests_delete on public.profile_interests for delete to authenticated
  using (profile_id = (select auth.uid()));

drop policy profile_prompts_insert on public.profile_prompts;
create policy profile_prompts_insert on public.profile_prompts for insert to authenticated
  with check (profile_id = (select auth.uid()));
drop policy profile_prompts_update on public.profile_prompts;
create policy profile_prompts_update on public.profile_prompts for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
drop policy profile_prompts_delete on public.profile_prompts;
create policy profile_prompts_delete on public.profile_prompts for delete to authenticated
  using (profile_id = (select auth.uid()));

drop policy affection_update on public.affection_profiles;
create policy affection_update on public.affection_profiles for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
drop policy lifestyle_update on public.lifestyle;
create policy lifestyle_update on public.lifestyle for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

drop policy preferences_own on public.preferences;
create policy preferences_own on public.preferences for select to authenticated
  using (profile_id = (select auth.uid()));
drop policy preferences_update on public.preferences;
create policy preferences_update on public.preferences for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

drop policy privacy_own on public.privacy_settings;
create policy privacy_own on public.privacy_settings for select to authenticated
  using (profile_id = (select auth.uid()));
drop policy privacy_update on public.privacy_settings;
create policy privacy_update on public.privacy_settings for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

drop policy contact_select on public.contact_messages;
create policy contact_select on public.contact_messages for select to authenticated
  using ((select private.has_staff_role('support')));

-- Storage policies, same treatment.
drop policy "profile photos: owner uploads to own folder" on storage.objects;
create policy "profile photos: owner uploads to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy "profile photos: owner deletes own files" on storage.objects;
create policy "profile photos: owner deletes own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy "profile photos: read own, approved visible, or staff" on storage.objects;
create policy "profile photos: read own, approved visible, or staff" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.has_staff_role('moderator'))
      or exists (
        select 1 from public.photos ph
        where ph.storage_path = name
          and ph.moderation_status = 'approved'
          and private.can_view_profile(ph.profile_id)
      )
    )
  );

-- age_gate_blocks deliberately has RLS on and no policies: only security-definer functions touch it.
comment on table public.age_gate_blocks is 'Hashed emails that failed the 18+ check. No client access by design (RLS on, no policies).';

-- Indexes for foreign keys.
create index if not exists contact_messages_user_idx on public.contact_messages (user_id);
create index if not exists profile_prompts_prompt_idx on public.profile_prompts (prompt_id);
create index if not exists staff_roles_granted_by_idx on public.staff_roles (granted_by);
