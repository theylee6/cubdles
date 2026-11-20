-- Cubdles — migration 9: safety. Member reports, a moderation queue for photos and reports,
-- audited staff actions, and in-app safety notices (warnings, and the fraud-ban notification
-- required by the US Romance Scam Prevention Act, 15 U.S.C. 45g).

create type public.report_reason as enum (
  'fake_profile', 'scam', 'harassment', 'inappropriate_content', 'hate', 'underage', 'offline_safety', 'spam', 'other'
);
create type public.report_status as enum ('open', 'actioned', 'dismissed');
create type public.report_priority as enum ('normal', 'urgent');
create type public.safety_notice_kind as enum ('warning', 'fraud_ban');

-- -----------------------------------------------------------------------------
-- Reports
-- -----------------------------------------------------------------------------
create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references public.profiles (id) on delete set null,
  reported_id  uuid references public.profiles (id) on delete set null,
  match_id     uuid references public.matches (id) on delete set null,
  message_id   uuid references public.messages (id) on delete set null,
  reason       public.report_reason not null,
  details      text check (char_length(details) <= 1000),
  priority     public.report_priority not null default 'normal',
  status       public.report_status not null default 'open',
  action       text check (action in ('dismiss', 'warn', 'suspend', 'ban')),
  resolution   text check (char_length(resolution) <= 1000),
  reviewed_by  uuid references auth.users (id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index reports_queue_idx on public.reports (status, priority, created_at);
create index reports_reported_idx on public.reports (reported_id, created_at desc);
create index reports_reporter_idx on public.reports (reporter_id, created_at desc);
create index reports_match_idx on public.reports (match_id);
create index reports_message_idx on public.reports (message_id);
create index reports_reviewed_by_idx on public.reports (reviewed_by);

-- -----------------------------------------------------------------------------
-- Safety notices shown to members in the app
-- -----------------------------------------------------------------------------
create table public.safety_notices (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  kind            public.safety_notice_kind not null,
  -- For fraud bans: who was banned (name as it was shown) and when you last exchanged messages.
  subject_id      uuid references public.profiles (id) on delete set null,
  subject_name    text check (char_length(subject_name) <= 80),
  last_contact_at timestamptz,
  reason          public.report_reason,
  created_at      timestamptz not null default now(),
  dismissed_at    timestamptz
);
create index safety_notices_open_idx on public.safety_notices (profile_id, created_at desc) where dismissed_at is null;
create index safety_notices_subject_idx on public.safety_notices (subject_id);

-- -----------------------------------------------------------------------------
-- Members: report someone (optionally blocking them at the same time)
-- -----------------------------------------------------------------------------
create or replace function public.create_report(
  p_reported uuid,
  p_reason public.report_reason,
  p_details text default null,
  p_match_id uuid default null,
  p_message_id uuid default null,
  p_block boolean default false
) returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  clean text;
  new_id uuid;
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_reported is null or p_reported = me or p_reason is null then
    raise exception 'invalid_report' using errcode = 'check_violation';
  end if;

  -- You can only report someone you've actually come across: visible to you, matched (now or before),
  -- liked you, or already blocked by you. Stops reports against arbitrary ids.
  if not (
    private.can_view_profile(p_reported)
    or exists (select 1 from public.matches m where m.user_a = least(me, p_reported) and m.user_b = greatest(me, p_reported))
    or exists (select 1 from public.likes l where l.from_id = p_reported and l.to_id = me)
    or exists (select 1 from public.blocks b where b.blocker_id = me and b.blocked_id = p_reported)
  ) then
    raise exception 'not_found' using errcode = 'check_violation';
  end if;

  if p_match_id is not null and not exists (
    select 1 from public.matches m where m.id = p_match_id and m.user_a = least(me, p_reported) and m.user_b = greatest(me, p_reported)
  ) then
    raise exception 'invalid_report' using errcode = 'check_violation';
  end if;
  if p_message_id is not null and not exists (
    select 1 from public.messages x join public.matches m on m.id = x.match_id
    where x.id = p_message_id and x.sender_id = p_reported and m.user_a = least(me, p_reported) and m.user_b = greatest(me, p_reported)
  ) then
    raise exception 'invalid_report' using errcode = 'check_violation';
  end if;

  if (select count(*) from public.reports where reporter_id = me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'rate_limited' using errcode = 'check_violation';
  end if;

  clean := nullif(btrim(regexp_replace(coalesce(p_details, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g')), '');
  if clean is not null and char_length(clean) > 1000 then
    raise exception 'details_too_long' using errcode = 'check_violation';
  end if;
  if p_reason = 'other' and clean is null then
    raise exception 'details_required' using errcode = 'check_violation';
  end if;

  insert into public.reports (reporter_id, reported_id, match_id, message_id, reason, details, priority)
  values (
    me, p_reported, p_match_id, p_message_id, p_reason, clean,
    case when p_reason in ('underage', 'offline_safety') then 'urgent'::public.report_priority else 'normal'::public.report_priority end
  )
  returning id into new_id;

  if p_block then
    insert into public.blocks (blocker_id, blocked_id) values (me, p_reported) on conflict do nothing;
  end if;
  return new_id;
end $$;

-- Members: dismiss one of your own notices.
create or replace function public.dismiss_safety_notice(p_id uuid)
returns void language sql volatile security definer set search_path = '' as $$
  update public.safety_notices set dismissed_at = now()
  where id = p_id and profile_id = auth.uid() and dismissed_at is null
$$;

-- What roles the signed-in member holds (for showing the admin area). Only ever about yourself.
create or replace function public.my_staff_roles()
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(role::text order by role), '{}') from public.staff_roles where user_id = auth.uid()
$$;

-- -----------------------------------------------------------------------------
-- Staff: queues
-- -----------------------------------------------------------------------------
create or replace function private.require_moderator()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_staff_role('moderator') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;

create or replace function public.staff_queue_counts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_moderator();
  return jsonb_build_object(
    'pending_photos', (select count(*) from public.photos where moderation_status = 'pending'),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'urgent_reports', (select count(*) from public.reports where status = 'open' and priority = 'urgent')
  );
end $$;

create or replace function public.staff_pending_photos(p_limit integer default 60)
returns table (photo_id uuid, profile_id uuid, storage_path text, display_name text, profile_status public.profile_status, uploaded_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_moderator();
  return query
    select ph.id, ph.profile_id, ph.storage_path, p.display_name, p.status, ph.created_at
    from public.photos ph join public.profiles p on p.id = ph.profile_id
    where ph.moderation_status = 'pending'
    order by ph.created_at
    limit least(greatest(coalesce(p_limit, 60), 1), 200);
end $$;

create or replace function public.staff_moderate_photo(p_photo uuid, p_approve boolean, p_note text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  before_status public.moderation_status;
begin
  perform private.require_moderator();
  if p_approve is null or (not p_approve and (p_note is null or char_length(btrim(p_note)) < 3)) then
    raise exception 'reason_required' using errcode = 'check_violation';
  end if;
  select moderation_status into before_status from public.photos where id = p_photo for update;
  if before_status is null then
    raise exception 'not_found' using errcode = 'check_violation';
  end if;
  update public.photos
     set moderation_status = case when p_approve then 'approved'::public.moderation_status else 'rejected'::public.moderation_status end,
         moderation_note = case when p_approve then null else left(btrim(p_note), 300) end
   where id = p_photo;
  perform public.write_audit_log('photo.moderate', 'photo', p_photo::text,
    jsonb_build_object('status', before_status),
    jsonb_build_object('status', case when p_approve then 'approved' else 'rejected' end, 'note', p_note));
end $$;

create or replace function public.staff_list_reports(p_status public.report_status default 'open', p_limit integer default 100)
returns table (
  report_id uuid, reason public.report_reason, priority public.report_priority, status public.report_status,
  details text, created_at timestamptz, reported_id uuid, reported_name text, reported_status public.profile_status,
  reporter_id uuid, reporter_name text, reports_against integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_moderator();
  return query
    select r.id, r.reason, r.priority, r.status, r.details, r.created_at,
           r.reported_id, rp.display_name, rp.status,
           r.reporter_id, rr.display_name,
           (select count(*)::int from public.reports x where x.reported_id = r.reported_id)
    from public.reports r
    left join public.profiles rp on rp.id = r.reported_id
    left join public.profiles rr on rr.id = r.reporter_id
    where r.status = p_status
    order by (r.priority = 'urgent') desc, case when p_status = 'open' then r.created_at end asc, r.created_at desc
    limit least(greatest(coalesce(p_limit, 100), 1), 500);
end $$;

-- Everything a moderator needs to decide one report. Reading private messages is always audited.
create or replace function public.staff_report_detail(p_report uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  r public.reports;
  result jsonb;
begin
  perform private.require_moderator();
  select * into r from public.reports where id = p_report;
  if r.id is null then
    raise exception 'not_found' using errcode = 'check_violation';
  end if;

  select jsonb_build_object(
    'report', to_jsonb(r),
    'reported', (select jsonb_build_object('id', p.id, 'name', p.display_name, 'status', p.status, 'status_reason', p.status_reason,
                   'joined_at', p.created_at, 'country_code', p.country_code)
                 from public.profiles p where p.id = r.reported_id),
    'reporter', (select jsonb_build_object('id', p.id, 'name', p.display_name, 'status', p.status)
                 from public.profiles p where p.id = r.reporter_id),
    'history', (select coalesce(jsonb_agg(jsonb_build_object('reason', x.reason, 'status', x.status, 'created_at', x.created_at) order by x.created_at desc), '[]')
                from public.reports x where x.reported_id = r.reported_id and x.id <> r.id),
    'photos', (select coalesce(jsonb_agg(jsonb_build_object('id', ph.id, 'path', ph.storage_path, 'status', ph.moderation_status) order by ph.position), '[]')
               from public.photos ph where ph.profile_id = r.reported_id),
    'messages', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'sender_id', x.sender_id, 'body', x.body, 'created_at', x.created_at) order by x.created_at), '[]')
                 from (select x.* from public.messages x join public.matches m on m.id = x.match_id
                       where r.reporter_id is not null and r.reported_id is not null
                         and m.user_a = least(r.reporter_id, r.reported_id) and m.user_b = greatest(r.reporter_id, r.reported_id)
                       order by x.created_at desc limit 100) x)
  ) into result;

  perform public.write_audit_log('report.view', 'report', r.id::text, null, jsonb_build_object('messages_viewed', jsonb_array_length(result->'messages')));
  return result;
end $$;

-- Resolve a report. Suspend/ban change the account (audited) and close other open reports about the
-- same person. A ban for fraud sends the fraud-ban notification to everyone who received a message
-- from them (15 U.S.C. 45g).
create or replace function public.staff_resolve_report(p_report uuid, p_action text, p_note text, p_fraud boolean default false)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  r public.reports;
  target public.profiles;
  notified integer := 0;
begin
  perform private.require_moderator();
  if p_action not in ('dismiss', 'warn', 'suspend', 'ban') then
    raise exception 'invalid_action' using errcode = 'check_violation';
  end if;
  if p_note is null or char_length(btrim(p_note)) < 3 then
    raise exception 'reason_required' using errcode = 'check_violation';
  end if;
  select * into r from public.reports where id = p_report for update;
  if r.id is null then
    raise exception 'not_found' using errcode = 'check_violation';
  end if;
  if r.status <> 'open' then
    raise exception 'already_resolved' using errcode = 'check_violation';
  end if;
  select * into target from public.profiles where id = r.reported_id;
  if p_action <> 'dismiss' and target.id is null then
    raise exception 'account_gone' using errcode = 'check_violation';
  end if;

  if p_action = 'warn' then
    insert into public.safety_notices (profile_id, kind, reason) values (target.id, 'warning', r.reason);
  elsif p_action in ('suspend', 'ban') then
    perform public.staff_set_profile_status(target.id, case when p_action = 'ban' then 'banned'::public.profile_status else 'suspended'::public.profile_status end,
      left(btrim(p_note), 300));
    update public.reports set status = 'actioned', action = p_action, resolution = 'Closed with report ' || r.id::text,
           reviewed_by = auth.uid(), reviewed_at = now()
     where reported_id = target.id and status = 'open' and id <> r.id;

    if p_action = 'ban' and coalesce(p_fraud, false) then
      insert into public.safety_notices (profile_id, kind, subject_id, subject_name, last_contact_at, reason)
      select other, 'fraud_ban', target.id, coalesce(target.display_name, 'A member'), last_contact, 'scam'
      from (
        select case when m.user_a = target.id then m.user_b else m.user_a end as other,
               max(x.created_at) as last_contact,
               bool_or(x.sender_id = target.id) as received
        from public.matches m join public.messages x on x.match_id = m.id
        where target.id in (m.user_a, m.user_b)
        group by 1
      ) c
      where c.received
        and not exists (select 1 from public.safety_notices s where s.profile_id = c.other and s.kind = 'fraud_ban' and s.subject_id = target.id);
      get diagnostics notified = row_count;
    end if;
  end if;

  update public.reports
     set status = case when p_action = 'dismiss' then 'dismissed'::public.report_status else 'actioned'::public.report_status end,
         action = p_action, resolution = left(btrim(p_note), 1000), reviewed_by = auth.uid(), reviewed_at = now()
   where id = r.id;

  perform public.write_audit_log('report.resolve', 'report', r.id::text, jsonb_build_object('status', 'open'),
    jsonb_build_object('action', p_action, 'note', p_note, 'fraud', coalesce(p_fraud, false), 'fraud_notices', notified));
  return jsonb_build_object('action', p_action, 'fraud_notices', notified);
end $$;

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
alter table public.reports enable row level security;
alter table public.safety_notices enable row level security;
revoke all on public.reports, public.safety_notices from anon, authenticated;
grant select on public.reports, public.safety_notices to authenticated;

-- Reporters see their own reports (not the outcome detail); moderators see all.
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.has_staff_role('moderator')));
create policy safety_notices_select on public.safety_notices for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.has_staff_role('moderator')));

revoke all on function public.create_report(uuid, public.report_reason, text, uuid, uuid, boolean) from public, anon;
revoke all on function public.dismiss_safety_notice(uuid) from public, anon;
revoke all on function public.my_staff_roles() from public, anon;
revoke all on function public.staff_queue_counts() from public, anon;
revoke all on function public.staff_pending_photos(integer) from public, anon;
revoke all on function public.staff_moderate_photo(uuid, boolean, text) from public, anon;
revoke all on function public.staff_list_reports(public.report_status, integer) from public, anon;
revoke all on function public.staff_report_detail(uuid) from public, anon;
revoke all on function public.staff_resolve_report(uuid, text, text, boolean) from public, anon;
grant execute on function public.create_report(uuid, public.report_reason, text, uuid, uuid, boolean) to authenticated;
grant execute on function public.dismiss_safety_notice(uuid) to authenticated;
grant execute on function public.my_staff_roles() to authenticated;
grant execute on function public.staff_queue_counts() to authenticated;
grant execute on function public.staff_pending_photos(integer) to authenticated;
grant execute on function public.staff_moderate_photo(uuid, boolean, text) to authenticated;
grant execute on function public.staff_list_reports(public.report_status, integer) to authenticated;
grant execute on function public.staff_report_detail(uuid) to authenticated;
grant execute on function public.staff_resolve_report(uuid, text, text, boolean) to authenticated;
revoke all on function private.require_moderator() from public, anon;
grant execute on function private.require_moderator() to authenticated, service_role;
