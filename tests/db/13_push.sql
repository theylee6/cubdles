-- Web push (migration 16).
\set ON_ERROR_STOP on
\set QUIET on

select tests.member('d0000000-0000-0000-0000-000000000001', 'Lio', 'man', '{woman}', '1995-01-01', 12.97, 77.59);
select tests.member('d0000000-0000-0000-0000-000000000002', 'Mae', 'woman', '{man}', '1994-01-01', 12.97, 77.59);
update public.notification_outbox set sent_at = now(), skipped = 'other_test' where sent_at is null;
insert into public.matches (id, user_a, user_b) values ('da000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002');

set role authenticated;
select tests.as_user('d0000000-0000-0000-0000-000000000002');
select public.save_push_subscription('https://push.example/abc', 'p256dh-key', 'auth-key', 'Test browser');
select tests.ok((select count(*) = 1 from public.push_subscriptions), 'members can register a device');
select tests.throws($$select public.save_push_subscription('http://insecure.example/x', 'a', 'b')$$, 'push endpoints must be https');
select tests.throws($$select * from public.push_targets(auth.uid())$$, 'members cannot read push targets');
select tests.as_user('d0000000-0000-0000-0000-000000000001');
select tests.ok((select count(*) = 0 from public.push_subscriptions), 'devices are private');
select public.send_message('da000000-0000-0000-0000-000000000001', 'hi', gen_random_uuid());
reset role;

update public.notification_outbox set send_after = now() - interval '1 second' where sent_at is null;
set role service_role;
create temp table c1 as select * from public.claim_notifications(50);
reset role;
select tests.ok(exists (select 1 from c1 where channel = 'push' and kind = 'message' and other_name = 'Lio'), 'a message to someone with a device is pushed');
select tests.ok(exists (select 1 from c1 where channel = 'push' and kind = 'match'), 'and new matches are pushed');
select tests.ok((select skipped = 'no_device' from public.notification_outbox where profile_id = 'd0000000-0000-0000-0000-000000000001' and channel = 'push' and kind = 'match'), 'people without a device are skipped for push');
select tests.ok(not exists (select 1 from c1 where channel = 'email' and kind = 'message'), 'the message email still waits (10 minutes)');

set role service_role;
select public.complete_notification(id, true) from c1;
select tests.ok((select count(*) = 1 from public.push_targets('d0000000-0000-0000-0000-000000000002')), 'server finds the device');
select public.push_result((select id from public.push_targets('d0000000-0000-0000-0000-000000000002')), false, true);
select tests.ok((select count(*) = 0 from public.push_targets('d0000000-0000-0000-0000-000000000002')), 'expired devices are removed');
reset role;

set role authenticated;
select tests.as_user('d0000000-0000-0000-0000-000000000002');
select public.set_push_settings(true, false);
select tests.ok((select push_matches and not push_messages from public.notification_settings), 'members can turn off message pushes');
reset role;
