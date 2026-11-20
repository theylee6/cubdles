-- Safety: reports, moderation, staff actions, fraud-ban notices (migration 9).
\set ON_ERROR_STOP on
\set QUIET on

select tests.member('70000000-0000-0000-0000-000000000001', 'Rhea',  'woman', '{man}',   '1995-01-01', 12.97, 77.59);
select tests.member('70000000-0000-0000-0000-000000000002', 'Sam',   'man',   '{woman}', '1994-01-01', 12.97, 77.59); -- the scammer
select tests.member('70000000-0000-0000-0000-000000000003', 'Tara',  'woman', '{man}',   '1993-01-01', 12.97, 77.59);
select tests.member('70000000-0000-0000-0000-000000000004', 'Uma',   'woman', '{man}',   '1992-01-01', 40.71, -74.00); -- far away, never met Sam
select tests.member('70000000-0000-0000-0000-000000000005', 'Vik',   'man',   '{woman}', '1991-01-01', 12.97, 77.59); -- moderator
insert into public.staff_roles (user_id, role) values ('70000000-0000-0000-0000-000000000005', 'moderator');
update public.profiles set status = 'paused' where id = '70000000-0000-0000-0000-000000000004'; -- hidden: never seen by Rhea
-- A pending photo awaiting review.
insert into public.photos (id, profile_id, storage_path, position) values ('7f000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003/1.webp', 1);
-- Sam matched with Rhea and Tara.
insert into public.matches (id, user_a, user_b) values
  ('7a000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002'),
  ('7a000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000003');

set role authenticated;
select tests.as_user('70000000-0000-0000-0000-000000000002');
select public.send_message('7a000000-0000-0000-0000-000000000001', 'Hi Rhea, can you help me with a gift card?', '7b000000-0000-0000-0000-000000000001');
select tests.as_user('70000000-0000-0000-0000-000000000003');
select public.send_message('7a000000-0000-0000-0000-000000000002', 'Hi Sam', '7b000000-0000-0000-0000-000000000002'); -- Tara wrote, Sam never replied

-- ---------- reporting ----------
select tests.as_user('70000000-0000-0000-0000-000000000001');
select tests.ok(public.create_report('70000000-0000-0000-0000-000000000002', 'scam', 'Asked for gift cards',
  '7a000000-0000-0000-0000-000000000001', (select id from public.messages where client_id = '7b000000-0000-0000-0000-000000000001'), false) is not null,
  'a member can report someone they matched with, pointing at a message');
select tests.ok((select count(*) = 1 from public.reports), 'reporters see their own report');
select tests.throws($$select public.create_report('70000000-0000-0000-0000-000000000001', 'spam')$$, 'cannot report yourself');
select tests.throws($$select public.create_report('70000000-0000-0000-0000-000000000004', 'spam')$$, 'cannot report someone you have never come across');
select tests.throws($$select public.create_report('70000000-0000-0000-0000-000000000002', 'other')$$, '"other" needs details');
select tests.throws($$select public.create_report('70000000-0000-0000-0000-000000000002', 'scam', null, '7a000000-0000-0000-0000-000000000002')$$, 'cannot attach someone else''s match');
select tests.throws($$insert into public.reports (reporter_id, reported_id, reason) values (auth.uid(), '70000000-0000-0000-0000-000000000002', 'spam')$$, 'reports cannot be inserted directly');
select tests.throws($$select public.staff_queue_counts()$$, 'members cannot see the moderation queue');
select tests.throws($$select public.staff_list_reports()$$, 'members cannot list reports');
select tests.throws($$select public.staff_moderate_photo('7f000000-0000-0000-0000-000000000001', true)$$, 'members cannot moderate photos');
select tests.ok(public.my_staff_roles() = '{}', 'members hold no staff roles');

-- Urgent reasons jump the queue; report-and-block blocks.
select tests.as_user('70000000-0000-0000-0000-000000000003');
select public.create_report('70000000-0000-0000-0000-000000000002', 'offline_safety', 'Followed me home', null, null, true);
select tests.ok((select priority = 'urgent' from public.reports where reporter_id = auth.uid()), 'offline safety reports are urgent');
select tests.ok(exists (select 1 from public.blocks where blocker_id = auth.uid() and blocked_id = '70000000-0000-0000-0000-000000000002'), 'report and block also blocks');
select tests.ok(public.create_report('70000000-0000-0000-0000-000000000002', 'harassment') is not null, 'you can still report someone after blocking them');
select tests.ok((select count(*) = 2 from public.reports), 'Tara sees only her own two reports');

-- ---------- moderation ----------
select tests.as_user('70000000-0000-0000-0000-000000000005');
select tests.ok(public.my_staff_roles() = '{moderator}', 'moderators see their role');
select tests.ok((public.staff_queue_counts() ->> 'open_reports')::int = 3 and (public.staff_queue_counts() ->> 'urgent_reports')::int = 1, 'queue counts');
select tests.ok((select reason = 'offline_safety' from public.staff_list_reports() limit 1), 'urgent reports are listed first');
select tests.ok(exists (select 1 from public.staff_pending_photos() where photo_id = '7f000000-0000-0000-0000-000000000001'), 'pending photos are queued');
select tests.throws($$select public.staff_moderate_photo('7f000000-0000-0000-0000-000000000001', false)$$, 'rejecting a photo needs a reason');
select public.staff_moderate_photo('7f000000-0000-0000-0000-000000000001', false, 'Not a clear photo of you');
select tests.ok((select moderation_status = 'rejected' and moderation_note = 'Not a clear photo of you' from public.photos where id = '7f000000-0000-0000-0000-000000000001'), 'photo rejected with note');

select tests.ok(
  (select jsonb_array_length(public.staff_report_detail(r.report_id) -> 'messages') = 1 from public.staff_list_reports() r where r.reason = 'scam'),
  'report detail includes the conversation');
reset role;
select tests.ok((select count(*) >= 2 from public.audit_logs where actor_id = '70000000-0000-0000-0000-000000000005' and action in ('photo.moderate', 'report.view')), 'moderation and message viewing are audited');
set role authenticated;
select tests.as_user('70000000-0000-0000-0000-000000000005');

select tests.throws($$select public.staff_resolve_report((select report_id from public.staff_list_reports() where reason = 'scam'), 'ban', '')$$, 'actions need a reason');
select tests.ok(
  (public.staff_resolve_report((select report_id from public.staff_list_reports() where reason = 'scam'), 'ban', 'Gift card scam', true) ->> 'fraud_notices')::int = 1,
  'a fraud ban notifies people who received messages from the banned member');
reset role;
select tests.ok((select status = 'banned' from public.profiles where id = '70000000-0000-0000-0000-000000000002'), 'the scammer is banned');
select tests.ok((select count(*) = 0 from public.reports where reported_id = '70000000-0000-0000-0000-000000000002' and status = 'open'), 'their other open reports are closed');
select tests.ok(not exists (select 1 from public.safety_notices where profile_id = '70000000-0000-0000-0000-000000000003'), 'Tara (never received a message from him) gets no notice');
set role authenticated;

-- ---------- notices ----------
select tests.as_user('70000000-0000-0000-0000-000000000001');
select tests.ok((select subject_name = 'Sam' and last_contact_at is not null and kind = 'fraud_ban' from public.safety_notices), 'Rhea sees who was banned and when they last talked');
select public.dismiss_safety_notice((select id from public.safety_notices limit 1));
select tests.ok((select dismissed_at is not null from public.safety_notices), 'notices can be dismissed');
select tests.as_user('70000000-0000-0000-0000-000000000003');
select tests.ok((select count(*) = 0 from public.safety_notices), 'notices are private');

-- A warning lands with the warned member.
select tests.as_user('70000000-0000-0000-0000-000000000003');
select public.create_report('70000000-0000-0000-0000-000000000001', 'spam');
select tests.as_user('70000000-0000-0000-0000-000000000005');
select public.staff_resolve_report((select report_id from public.staff_list_reports() where reason = 'spam'), 'warn', 'Repeated links');
select tests.throws($$select public.staff_resolve_report((select report_id from public.staff_list_reports('actioned') where reason = 'spam'), 'dismiss', 'again')$$, 'resolved reports cannot be resolved twice');
select tests.as_user('70000000-0000-0000-0000-000000000001');
select tests.ok((select kind = 'warning' and reason = 'spam' from public.safety_notices where dismissed_at is null), 'warned member sees a warning');

reset role;
