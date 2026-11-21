-- Email notification outbox (migration 11).
\set ON_ERROR_STOP on
\set QUIET on

grant usage on schema tests to service_role;
grant execute on all functions in schema tests to service_role;

select tests.member('90000000-0000-0000-0000-000000000001', 'Wen', 'woman', '{man}',   '1995-01-01', 12.97, 77.59);
select tests.member('90000000-0000-0000-0000-000000000002', 'Xav', 'man',   '{woman}', '1994-01-01', 12.97, 77.59);
select tests.member('90000000-0000-0000-0000-000000000003', 'Yas', 'woman', '{man}',   '1993-01-01', 12.97, 77.59);
insert into public.matches (id, user_a, user_b) values
  ('9a000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002');

select tests.ok((select count(*) = 2 from public.notification_outbox where kind = 'match' and channel = 'email' and ref_id = '9a000000-0000-0000-0000-000000000001'), 'a new match queues an email for both people');

set role authenticated;
select tests.as_user('90000000-0000-0000-0000-000000000001');
select public.send_message('9a000000-0000-0000-0000-000000000001', 'hello', gen_random_uuid());
select public.send_message('9a000000-0000-0000-0000-000000000001', 'hello again', gen_random_uuid());
reset role;
select tests.ok((select count(*) = 1 from public.notification_outbox where kind = 'message' and channel = 'email' and profile_id = '90000000-0000-0000-0000-000000000002'), 'several messages queue one email per conversation');

-- Ignore rows queued by earlier test files; make ours due now. Xav hasn't been active.
update public.notification_outbox set sent_at = now(), skipped = 'other_test' where profile_id::text not like '90000000-%';
update public.notification_outbox set send_after = now() - interval '1 second' where sent_at is null;
update public.profiles set last_active_at = now() - interval '1 hour' where id in ('90000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002');

set role authenticated;
select tests.throws($$select * from public.claim_notifications()$$, 'members cannot claim notifications');
select tests.throws($$select * from public.notification_outbox$$, 'members cannot read the outbox');
select tests.as_user('90000000-0000-0000-0000-000000000001');
select public.set_notification_settings(false, true);
select tests.ok((select not email_matches and email_messages from public.notification_settings), 'members can change their email preferences');
reset role;

set role service_role;
create temp table claimed as select * from public.claim_notifications(50);
select tests.ok((select count(*) = 2 from claimed), 'two emails to send: Xav''s match and message (Wen opted out of match emails)');
select tests.ok((select other_name = 'Wen' and email = 'xav@m.test' from claimed where kind = 'message'), 'claimed rows carry the recipient and who it is from');
select tests.ok((select skipped = 'opted_out' from public.notification_outbox where profile_id = '90000000-0000-0000-0000-000000000001' and kind = 'match' and channel = 'email'), 'opted-out emails are closed as skipped');
select tests.ok((select count(*) = 0 from public.claim_notifications(50)), 'claimed rows are not handed out twice');
select public.complete_notification(id, true) from claimed where kind = 'message';
select public.complete_notification(id, false, 'provider down') from claimed where kind = 'match';
select tests.ok((select sent_at is null and claimed_at is null and last_error = 'provider down' and send_after > now() from public.notification_outbox where profile_id = '90000000-0000-0000-0000-000000000002' and kind = 'match' and channel = 'email'), 'failures are retried later');
reset role;

-- Another message within the hour: queued, but held back by the cooldown.
set role authenticated;
select tests.as_user('90000000-0000-0000-0000-000000000001');
select public.send_message('9a000000-0000-0000-0000-000000000001', 'are you there?', gen_random_uuid());
reset role;
update public.notification_outbox set send_after = now() - interval '1 second' where kind = 'message' and sent_at is null;
set role service_role;
select count(*) from public.claim_notifications(50);
reset role;
select tests.ok((select skipped = 'cooldown' from public.notification_outbox where kind = 'message' and channel = 'email' and profile_id = '90000000-0000-0000-0000-000000000002' order by id desc limit 1), 'at most one message email per conversation per hour');

-- Read before the email goes out: skipped.
update public.notification_outbox set sent_at = now() - interval '2 hours' where kind = 'message' and channel = 'email' and skipped is null;
set role authenticated;
select tests.as_user('90000000-0000-0000-0000-000000000001');
select public.send_message('9a000000-0000-0000-0000-000000000001', 'ping', gen_random_uuid());
select tests.as_user('90000000-0000-0000-0000-000000000002');
select public.mark_conversation_read('9a000000-0000-0000-0000-000000000001');
reset role;
update public.notification_outbox set send_after = now() - interval '1 second' where kind = 'message' and sent_at is null;
set role service_role;
select count(*) from public.claim_notifications(50);
reset role;
select tests.ok((select skipped = 'already_read' from public.notification_outbox where kind = 'message' and channel = 'email' order by id desc limit 1), 'messages already read are not emailed');

-- Fraud-ban notices are always emailed (no opt-out).
insert into public.safety_notices (profile_id, kind, subject_name, last_contact_at) values ('90000000-0000-0000-0000-000000000003', 'fraud_ban', 'Zed', now());
set role service_role;
select tests.ok((select kind = 'fraud_ban' and other_name = 'Zed' and last_contact_at is not null from public.claim_notifications(50) where profile_id = '90000000-0000-0000-0000-000000000003' and channel = 'email'), 'fraud-ban notices are emailed with who and when');
select tests.ok(not public.notifications_due() or true, 'notifications_due runs');
reset role;
