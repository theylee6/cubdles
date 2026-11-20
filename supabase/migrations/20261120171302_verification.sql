-- Cubdles — migration 12: photo verification. A member takes a selfie copying a randomly chosen
-- pose; a moderator compares it with their profile photos. Approval sets profiles.verified_at and
-- shows a "Verified" badge. Selfies live in a private bucket and are deleted once decided.

create type public.verification_status as enum ('awaiting_photo', 'pending', 'approved', 'rejected');

alter table public.profiles add column verified_at timestamptz;
-- Members must not set this themselves.
revoke update (verified_at) on public.profiles from authenticated;

create table public.verification_requests (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  pose         text not null check (pose in ('peace_sign', 'thumbs_up', 'hand_on_chin', 'touch_ear', 'wave', 'point_up')),
  storage_path text check (char_length(storage_path) <= 300),
  status       public.verification_status not null default 'awaiting_photo',
  note         text check (char_length(note) <= 300),
  reviewed_by  uuid references auth.users (id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
-- At most one open request per member.
create unique index verification_requests_open_uq on public.verification_requests (profile_id) where status in ('awaiting_photo', 'pending');
create index verification_requests_queue_idx on public.verification_requests (created_at) where status = 'pending';
create index verification_requests_profile_idx on public.verification_requests (profile_id, created_at desc);
create index verification_requests_reviewed_by_idx on public.verification_requests (reviewed_by);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-selfies', 'verification-selfies', false, 5242880, array['image/webp'])
on conflict (id) do nothing;

create policy "verification selfies: owner uploads to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verification-selfies' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "verification selfies: owner or moderator reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'verification-selfies' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.has_staff_role('moderator'))));
create policy "verification selfies: owner or moderator deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'verification-selfies' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.has_staff_role('moderator'))));

-- Start (or resume) verification: returns the open request with its pose.
create or replace function public.start_verification()
returns public.verification_requests language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  r public.verification_requests;
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = me and status in ('active', 'paused')) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = me and verified_at is not null) then
    raise exception 'already_verified' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.photos where profile_id = me and moderation_status <> 'rejected') then
    raise exception 'needs_photos' using errcode = 'check_violation';
  end if;
  select * into r from public.verification_requests where profile_id = me and status in ('awaiting_photo', 'pending');
  if r.id is not null then
    return r;
  end if;
  if (select count(*) from public.verification_requests where profile_id = me and created_at > now() - interval '1 day') >= 3 then
    raise exception 'rate_limited' using errcode = 'check_violation';
  end if;
  insert into public.verification_requests (profile_id, pose)
  values (me, (array['peace_sign', 'thumbs_up', 'hand_on_chin', 'touch_ear', 'wave', 'point_up'])[1 + floor(random() * 6)::int])
  returning * into r;
  return r;
end $$;

-- After uploading the selfie, hand it in for review.
create or replace function public.submit_verification(p_request uuid, p_path text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if p_path is null or split_part(p_path, '/', 1) <> me::text then
    raise exception 'invalid_path' using errcode = 'check_violation';
  end if;
  update public.verification_requests set storage_path = p_path, status = 'pending', created_at = now()
  where id = p_request and profile_id = me and status = 'awaiting_photo';
  if not found then
    raise exception 'not_found' using errcode = 'check_violation';
  end if;
end $$;

-- Moderators
create or replace function public.staff_pending_verifications(p_limit integer default 50)
returns table (request_id uuid, profile_id uuid, display_name text, pose text, selfie_path text, photo_paths text[], submitted_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_moderator();
  return query
    select v.id, v.profile_id, p.display_name::text, v.pose, v.storage_path,
           array(select ph.storage_path from public.photos ph where ph.profile_id = v.profile_id and ph.moderation_status <> 'rejected' order by ph.position),
           v.created_at
    from public.verification_requests v join public.profiles p on p.id = v.profile_id
    where v.status = 'pending'
    order by v.created_at
    limit least(greatest(coalesce(p_limit, 50), 1), 200);
end $$;

-- Returns the selfie path so the caller can delete the file.
create or replace function public.staff_decide_verification(p_request uuid, p_approve boolean, p_note text default null)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  v public.verification_requests;
begin
  perform private.require_moderator();
  if p_approve is null or (not p_approve and (p_note is null or char_length(btrim(p_note)) < 3)) then
    raise exception 'reason_required' using errcode = 'check_violation';
  end if;
  select * into v from public.verification_requests where id = p_request for update;
  if v.id is null or v.status <> 'pending' then
    raise exception 'not_found' using errcode = 'check_violation';
  end if;
  update public.verification_requests
     set status = case when p_approve then 'approved'::public.verification_status else 'rejected'::public.verification_status end,
         note = case when p_approve then null else left(btrim(p_note), 300) end,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = v.id;
  if p_approve then
    update public.profiles set verified_at = now() where id = v.profile_id;
  end if;
  perform public.write_audit_log('verification.decide', 'profile', v.profile_id::text, null,
    jsonb_build_object('approved', p_approve, 'note', p_note, 'request', v.id));
  return v.storage_path;
end $$;

-- Which of these (visible) profiles are verified. Used to show badges.
create or replace function public.verified_profiles(p_ids uuid[])
returns setof uuid language sql stable security definer set search_path = '' as $$
  select p.id from public.profiles p
  where p.id = any(p_ids) and p.verified_at is not null
    and (p.id = auth.uid() or private.can_view_profile(p.id))
$$;

alter table public.verification_requests enable row level security;
revoke all on public.verification_requests from anon, authenticated;
grant select on public.verification_requests to authenticated;
create policy verification_requests_select on public.verification_requests for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.has_staff_role('moderator')));

revoke all on function public.start_verification(), public.submit_verification(uuid, text), public.staff_pending_verifications(integer),
  public.staff_decide_verification(uuid, boolean, text), public.verified_profiles(uuid[]) from public, anon;
grant execute on function public.start_verification(), public.submit_verification(uuid, text), public.staff_pending_verifications(integer),
  public.staff_decide_verification(uuid, boolean, text), public.verified_profiles(uuid[]) to authenticated;

-- The moderator queue now includes verifications.
create or replace function public.staff_queue_counts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_moderator();
  return jsonb_build_object(
    'pending_photos', (select count(*) from public.photos where moderation_status = 'pending'),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'urgent_reports', (select count(*) from public.reports where status = 'open' and priority = 'urgent'),
    'pending_verifications', (select count(*) from public.verification_requests where status = 'pending')
  );
end $$;
