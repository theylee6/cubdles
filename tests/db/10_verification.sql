-- Photo verification (migration 12).
\set ON_ERROR_STOP on
\set QUIET on

select tests.member('a0000000-0000-0000-0000-000000000001', 'Zia', 'woman', '{man}', '1995-01-01', 12.97, 77.59);
select tests.member('a0000000-0000-0000-0000-000000000002', 'Ari', 'man', '{woman}', '1994-01-01', 12.97, 77.59);
select tests.member('a0000000-0000-0000-0000-000000000003', 'Mod', 'man', '{woman}', '1990-01-01', 12.97, 77.59);
insert into public.staff_roles (user_id, role) values ('a0000000-0000-0000-0000-000000000003', 'moderator');

set role authenticated;
select tests.as_user('a0000000-0000-0000-0000-000000000001');
select tests.throws($$update public.profiles set verified_at = now() where id = auth.uid()$$, 'members cannot mark themselves verified');
create temp table req as select * from public.start_verification();
select tests.ok((select pose in ('peace_sign', 'thumbs_up', 'hand_on_chin', 'touch_ear', 'wave', 'point_up') and status = 'awaiting_photo' from req), 'starting gives a pose to copy');
select tests.ok((select id from public.start_verification()) = (select id from req), 'starting again resumes the same request');
select tests.throws($$select public.submit_verification((select id from req), 'a0000000-0000-0000-0000-000000000002/x.webp')$$, 'selfie must be in your own folder');
select public.submit_verification((select id from req), 'a0000000-0000-0000-0000-000000000001/selfie.webp');
select tests.throws($$select * from public.staff_pending_verifications()$$, 'members cannot see the verification queue');

select tests.as_user('a0000000-0000-0000-0000-000000000003');
select tests.ok((select count(*) = 1 from public.staff_pending_verifications() where profile_id = 'a0000000-0000-0000-0000-000000000001'), 'moderators see the request');
select tests.ok((select array_length(photo_paths, 1) >= 1 from public.staff_pending_verifications() where profile_id = 'a0000000-0000-0000-0000-000000000001'), 'with the member''s photos to compare');
select tests.ok((public.staff_queue_counts() ->> 'pending_verifications')::int >= 1, 'queue counts include verifications');
select tests.throws($$select public.staff_decide_verification((select id from req), false)$$, 'rejecting needs a reason');
select tests.ok(public.staff_decide_verification((select id from req), true) = 'a0000000-0000-0000-0000-000000000001/selfie.webp', 'approval returns the selfie path for deletion');

select tests.as_user('a0000000-0000-0000-0000-000000000002');
select tests.ok(exists (select 1 from public.verified_profiles(array['a0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid]) v where v = 'a0000000-0000-0000-0000-000000000001'), 'others see the verified badge');
select tests.ok(not exists (select 1 from public.verified_profiles(array['a0000000-0000-0000-0000-000000000003'::uuid])), 'unverified people have no badge');
select tests.ok((select count(*) = 0 from public.verification_requests), 'members cannot see others'' verification requests');

select tests.as_user('a0000000-0000-0000-0000-000000000001');
select tests.throws($$select public.start_verification()$$, 'already verified members cannot start again');
reset role;
select tests.ok((select count(*) = 1 from public.audit_logs where action = 'verification.decide'), 'decisions are audited');
