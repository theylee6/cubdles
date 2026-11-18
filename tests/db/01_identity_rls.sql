-- Identity, visibility and permission tests for migration 1.
-- Runs as superuser; switches to anon/authenticated with SET ROLE + JWT claims.
\set ON_ERROR_STOP on
\set QUIET on

-- ---------- fixtures (superuser) ----------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'asha@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'bilal@test.dev'),
  ('00000000-0000-0000-0000-00000000000c', 'chitra@test.dev'),
  ('00000000-0000-0000-0000-0000000000dd', 'mod@test.dev'),
  ('00000000-0000-0000-0000-00000000000f', 'young@test.dev');

select tests.ok((select count(*) from public.profiles) = 5, 'signup trigger creates a profile per auth user');
select tests.ok((select count(*) from public.preferences) = 5, 'signup trigger creates preferences');

update public.profile_private set birth_date = '1995-04-02',
  location = extensions.st_setsrid(extensions.st_makepoint(77.59, 12.97), 4326)::extensions.geography
  where profile_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
update public.profiles set display_name = 'Asha', gender_identity = 'woman', intention = 'long_term', status = 'active'
  where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set display_name = 'Bilal', gender_identity = 'man', intention = 'long_term', status = 'active'
  where id = '00000000-0000-0000-0000-00000000000b';
insert into public.staff_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000dd', 'moderator');
update public.profiles set display_name = 'Mod', status = 'active' where id = '00000000-0000-0000-0000-0000000000dd';

-- ---------- anonymous visitor ----------
set role anon;
select set_config('request.jwt.claims', '', false);
select tests.throws('select * from public.profiles', 'anon cannot read profiles');
select tests.ok((select count(*) from public.plans) >= 1, 'anon can read active plans for the pricing page');
select tests.lives($$insert into public.contact_messages (name, email, topic, message) values ('Ravi', 'ravi@example.com', 'general', 'Hello there, a question.')$$,
  'anon can submit the contact form');
select tests.throws('select * from public.contact_messages', 'anon cannot read contact messages');
select tests.throws($$insert into public.contact_messages (name, email, topic, message, status) values ('X', 'x@example.com', 'general', 'Trying to set status', 'closed')$$,
  'anon cannot set contact message status');
reset role;

-- ---------- Asha (active member) ----------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', false);

select tests.ok((select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 1, 'member reads own profile');
select tests.ok((select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 1, 'member sees another active member');
select tests.ok((select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000c') = 0, 'member cannot see a profile still in onboarding');
select tests.ok((select count(*) from public.profile_private) = 1, 'member reads only own private row');
select tests.ok((select count(*) from public.preferences) = 1, 'member reads only own preferences');
select tests.ok(public.profile_age('00000000-0000-0000-0000-00000000000b') between 18 and 99, 'age of a visible profile is available');
select tests.ok(public.profile_age('00000000-0000-0000-0000-00000000000c') is null, 'age of a hidden profile is not available');

select tests.throws($$update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-00000000000a'$$, 'member cannot change own status');
select tests.lives($$update public.profiles set bio = 'Tea, blankets, long talks.' where id = '00000000-0000-0000-0000-00000000000a'$$, 'member can edit own bio');
update public.profiles set bio = 'hacked' where id = '00000000-0000-0000-0000-00000000000b';
reset role;
select tests.ok((select bio from public.profiles where id = '00000000-0000-0000-0000-00000000000b') is null, 'member cannot edit someone else''s profile');
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', false);

select tests.throws($$update public.profile_private set birth_date = '2000-01-01'$$, 'member cannot rewrite birth date directly');
select tests.throws($$select public.submit_birth_date('2000-01-01')$$, 'birth date can only be set once');
select tests.throws($$insert into public.staff_roles (user_id, role, granted_by) values ('00000000-0000-0000-0000-00000000000a', 'admin', '00000000-0000-0000-0000-00000000000a')$$,
  'member cannot grant themselves a staff role');
select tests.throws($$select public.staff_set_profile_status('00000000-0000-0000-0000-00000000000b', 'banned', 'no reason')$$, 'member cannot ban someone');
select tests.ok((select count(*) from public.audit_logs) = 0, 'member cannot read audit logs');
select tests.ok((select count(*) from public.contact_messages) = 0, 'member cannot read contact messages');

-- Blocking hides both people from each other.
insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
select tests.ok((select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 0, 'blocker no longer sees blocked member');
select tests.throws($$insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c')$$,
  'member cannot create a block on someone else''s behalf');

-- Storage: only your own folder.
select tests.throws($$insert into storage.objects (bucket_id, name) values ('profile-photos', '00000000-0000-0000-0000-00000000000b/x.jpg')$$,
  'member cannot upload into another member''s folder');
select tests.lives($$insert into storage.objects (bucket_id, name) values ('profile-photos', '00000000-0000-0000-0000-00000000000a/x.jpg')$$,
  'member can upload into own folder');

-- ---------- Bilal (blocked by Asha) ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', false);
select tests.ok((select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 0, 'blocked member does not see the blocker');
select tests.ok((select count(*) from public.blocks) = 0, 'blocked member cannot see who blocked them');

-- Photos always start in moderation and must sit in the owner's folder.
insert into public.photos (profile_id, storage_path, position, moderation_status)
  values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b/0.jpg', 0, 'approved');
select tests.ok((select moderation_status from public.photos where position = 0) = 'pending', 'client cannot self-approve a photo');
select tests.throws($$insert into public.photos (profile_id, storage_path, position) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a/evil.jpg', 1)$$,
  'photo path must be in the owner''s folder');
select tests.throws($$update public.photos set moderation_status = 'approved'$$, 'owner cannot approve own photo');
insert into public.photos (profile_id, storage_path, position)
  select '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b/' || i || '.jpg', i from generate_series(1, 5) i;
select tests.throws($$insert into public.photos (profile_id, storage_path, position) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b/7.jpg', 5)$$,
  'a seventh photo is rejected');
reset role;

-- Unblock, then check photo visibility for Asha.
delete from public.blocks;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', false);
select tests.ok((select count(*) from public.photos where profile_id = '00000000-0000-0000-0000-00000000000b') = 0, 'pending photos are hidden from others');
reset role;
update public.photos set moderation_status = 'approved' where position = 0;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', false);
select tests.ok((select count(*) from public.photos where profile_id = '00000000-0000-0000-0000-00000000000b') = 1, 'approved photos are visible to others');
select tests.ok((select count(*) from storage.objects) = 1, 'member sees only own storage objects plus approved visible ones');

-- ---------- Chitra (onboarding) ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', false);
select tests.ok(public.submit_birth_date('1998-06-15') = true, 'adult birth date accepted');
select tests.throws('select public.complete_onboarding()', 'onboarding cannot finish without name, location, consent and photos');
select public.accept_terms(false);
select public.set_location(12.971598, 77.594566, 'Bengaluru');
select tests.ok((select extensions.st_y(location::extensions.geometry) from public.profile_private) = 12.97, 'location is rounded to about 1 km before storage');
update public.profiles set display_name = 'Chitra', gender_identity = 'woman', gender_group = 'woman', intention = 'figuring_out';
update public.preferences set show_genders = '{man}';
update public.affection_profiles set cuddle_style = 'little_spoon', pace = 'slow', touch_comfort = 4;
select public.set_profile_prompts('[{"prompt_id": 1, "answer": "Chai and a long book."}]');
insert into public.photos (profile_id, storage_path, position) values
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c/0.jpg', 0),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c/1.jpg', 1);
select tests.lives('select public.complete_onboarding()', 'onboarding completes when every requirement is met');
select tests.ok((select status from public.profiles where id = '00000000-0000-0000-0000-00000000000c') = 'active', 'profile is active after onboarding');

-- ---------- Under-18 attempt ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}', false);
select tests.ok(public.submit_birth_date((current_date - interval '15 years')::date) = false, 'under-18 birth date is refused');
select tests.ok((select status from public.profiles where id = '00000000-0000-0000-0000-00000000000f') = 'suspended',
  'under-18 owner sees their suspended status (so the app can explain why)');
update public.profiles set bio = 'still here' where id = '00000000-0000-0000-0000-00000000000f';
reset role;
select tests.ok((select bio from public.profiles where id = '00000000-0000-0000-0000-00000000000f') is null,
  'suspended owner cannot keep editing their profile');
select tests.ok((select status from public.profiles where id = '00000000-0000-0000-0000-00000000000f') = 'suspended', 'under-18 account is suspended');
delete from auth.users where id = '00000000-0000-0000-0000-00000000000f';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ff', 'YOUNG@test.dev');
select tests.ok((select status from public.profiles where id = '00000000-0000-0000-0000-0000000000ff') = 'suspended',
  're-registering with the same email (any case) stays suspended');

-- ---------- Moderator ----------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000dd","role":"authenticated"}', false);
select tests.lives($$select public.staff_set_profile_status('00000000-0000-0000-0000-00000000000b', 'suspended', 'spam reports')$$, 'moderator can suspend a member');
select tests.throws($$select public.staff_set_profile_status('00000000-0000-0000-0000-00000000000b', 'banned', '')$$, 'moderator must give a reason');
select tests.ok((select count(*) from public.audit_logs) = 0, 'moderators cannot read the audit log (admins only)');
reset role;
select tests.ok((select count(*) from public.audit_logs where action = 'profile.status') = 1, 'status change is written to the audit log');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', false);
select tests.ok((select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 0, 'suspended members disappear from view');
reset role;
