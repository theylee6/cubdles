-- Discovery, likes, matches, compatibility and account lifecycle (migration 4).
\set ON_ERROR_STOP on
\set QUIET on

-- Fixture helper (superuser): an active member with everything discovery needs.
create function tests.member(
  p_id uuid, p_name text, p_group text, p_show text[], p_birth date, p_lat float8, p_lng float8,
  p_intention public.relationship_intention default 'long_term', p_style public.cuddle_style default 'either',
  p_pace public.affection_pace default 'steady', p_touch smallint default 3, p_photo boolean default true
) returns uuid language plpgsql as $$
begin
  insert into auth.users (id, email) values (p_id, lower(p_name) || '@m.test');
  update public.profiles set display_name = p_name, gender_group = p_group, gender_identity = initcap(p_group),
    intention = p_intention, status = 'active', onboarding_step = 20 where id = p_id;
  update public.profile_private set birth_date = p_birth, terms_accepted_at = now(), privacy_accepted_at = now(),
    location = extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography where profile_id = p_id;
  update public.preferences set show_genders = p_show, age_min = 18, age_max = 60, max_distance_km = 25 where profile_id = p_id;
  update public.affection_profiles set cuddle_style = p_style, pace = p_pace, touch_comfort = p_touch where profile_id = p_id;
  if p_photo then
    insert into public.photos (profile_id, storage_path, position) values (p_id, p_id || '/0.webp', 0);
    update public.photos set moderation_status = 'approved' where profile_id = p_id; -- as a moderator would
  end if;
  return p_id;
end $$;

create function tests.as_user(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, false);
$$;
grant execute on all functions in schema tests to authenticated;

-- Bengaluru centre ~ (12.97, 77.59)
select tests.member('10000000-0000-0000-0000-000000000001', 'Asha',  'woman', '{man}',   '1995-01-01', 12.97, 77.59, 'long_term', 'little_spoon', 'slow', 5::smallint);
select tests.member('10000000-0000-0000-0000-000000000002', 'Bilal', 'man',   '{woman}', '1993-01-01', 12.98, 77.60, 'long_term', 'big_spoon',    'slow', 5::smallint);
select tests.member('10000000-0000-0000-0000-000000000003', 'Kiran', 'man',   '{woman}', '1990-01-01', 12.95, 77.58, 'figuring_out', 'not_sure', 'quick', 1::smallint);
select tests.member('10000000-0000-0000-0000-000000000004', 'Dev',   'man',   '{man}',   '1992-01-01', 12.97, 77.59);                  -- wants men only
select tests.member('10000000-0000-0000-0000-000000000005', 'Farah', 'woman', '{man}',   '1994-01-01', 12.97, 77.59);                  -- same gender as Asha
select tests.member('10000000-0000-0000-0000-000000000006', 'Gopal', 'man',   '{woman}', '1991-01-01', 19.07, 72.87);                  -- Mumbai, too far
select tests.member('10000000-0000-0000-0000-000000000007', 'Hari',  'man',   '{woman}', '1989-01-01', 12.97, 77.59, p_photo => false); -- no approved photo
select tests.member('10000000-0000-0000-0000-000000000008', 'Ishan', 'man',   '{woman}', '1960-01-01', 12.97, 77.59);                  -- outside Asha's age range
select tests.member('10000000-0000-0000-0000-000000000009', 'Jai',   'man',   '{woman}', '1996-01-01', 12.97, 77.59);                  -- will block Asha
insert into public.profile_interests values ('10000000-0000-0000-0000-000000000001', 1), ('10000000-0000-0000-0000-000000000001', 2),
  ('10000000-0000-0000-0000-000000000002', 1), ('10000000-0000-0000-0000-000000000002', 2), ('10000000-0000-0000-0000-000000000002', 3);
insert into public.blocks values ('10000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001');

set role authenticated;
select tests.as_user('10000000-0000-0000-0000-000000000001');

-- ---------- discovery eligibility ----------
create temp table seen as select * from public.discover(50, 0, '{}');
select tests.ok((select array_agg(profile_id order by profile_id) from seen) =
  '{10000000-0000-0000-0000-000000000002,10000000-0000-0000-0000-000000000003}'::uuid[],
  'discovery shows only mutually-eligible, nearby, photographed, unblocked people');
select tests.ok((select profile_id from seen order by score desc limit 1) = '10000000-0000-0000-0000-000000000002',
  'the more compatible person ranks first');
select tests.ok((select reasons from seen where profile_id = '10000000-0000-0000-0000-000000000002') @> '[{"code":"spoons_fit"},{"code":"same_pace","value":"slow"},{"code":"both_cuddly"}]',
  'compatibility explains itself with reason codes');
select tests.ok((select reasons from seen where profile_id = '10000000-0000-0000-0000-000000000002') @> '[{"code":"shared_interests","count":2}]',
  'shared interests are counted');
select tests.ok((select count(*) from public.discover(50, 0, '{"intentions":["figuring_out"]}')) = 1, 'free intention filter works');
select tests.throws($$select * from public.discover(20, 0, '{"cuddle_styles":["big_spoon"]}')$$, 'advanced filters need premium');

-- ---------- profile cards ----------
select tests.ok(jsonb_array_length(public.profile_cards('{10000000-0000-0000-0000-000000000002,10000000-0000-0000-0000-000000000009}')) = 1,
  'cards are only returned for profiles you may see');
select tests.ok((public.profile_cards('{10000000-0000-0000-0000-000000000002}') -> 0 ->> 'distance') = 'under_5', 'distance is a rough bucket');
select tests.ok(not (public.profile_cards('{10000000-0000-0000-0000-000000000002}') -> 0 ? 'location'), 'cards never include coordinates');
reset role;
update public.privacy_settings set hide_age = true, hide_distance = true where profile_id = '10000000-0000-0000-0000-000000000002';
set role authenticated;
select tests.as_user('10000000-0000-0000-0000-000000000001');
select tests.ok((public.profile_cards('{10000000-0000-0000-0000-000000000002}') -> 0 -> 'age') = 'null'::jsonb
  and (public.profile_cards('{10000000-0000-0000-0000-000000000002}') -> 0 -> 'distance') = 'null'::jsonb,
  'hidden age and distance stay hidden');

-- ---------- likes, passes, quotas ----------
select tests.throws($$insert into public.likes (from_id, to_id) values ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002')$$,
  'likes cannot be inserted directly');
select tests.ok((public.swipe('10000000-0000-0000-0000-000000000003', 'pass') ->> 'matched')::boolean = false, 'pass works');
select tests.ok(not exists (select 1 from public.discover(50, 0, '{}') where profile_id = '10000000-0000-0000-0000-000000000003'), 'passed people do not reappear');
select tests.throws($$select public.undo_last_pass()$$, 'undo needs premium');
select tests.throws($$select public.swipe('10000000-0000-0000-0000-000000000009', 'like')$$, 'cannot like someone who blocked you');
select tests.throws($$select public.swipe('10000000-0000-0000-0000-000000000001', 'like')$$, 'cannot like yourself');
select tests.throws($$select public.swipe('10000000-0000-0000-0000-000000000002', 'like', 'hi!')$$, 'notes with likes need premium');
select tests.ok((public.swipe('10000000-0000-0000-0000-000000000002', 'like') ->> 'matched')::boolean = false, 'one-way like is not a match');
select tests.ok((public.swipe('10000000-0000-0000-0000-000000000002', 'like') ->> 'already_liked')::boolean, 'liking twice is harmless');

-- Bilal sees a count but not who, then likes back → match.
select tests.as_user('10000000-0000-0000-0000-000000000002');
select tests.ok((public.likes_received_summary() ->> 'count')::int = 1 and not (public.likes_received_summary() ->> 'can_see')::boolean,
  'free members see how many liked them, not who');
select tests.ok((select count(*) from public.likes where to_id = auth.uid()) = 0, 'received likes are hidden without premium');
create temp table m as select public.swipe('10000000-0000-0000-0000-000000000001', 'like') as r;
select tests.ok(((select r from m) ->> 'matched')::boolean, 'a like back creates a match');
select tests.ok((select count(*) from public.matches) = 1, 'exactly one match row');
select tests.ok((public.likes_received_summary() ->> 'count')::int = 0, 'matched likes leave the liked-you list');

-- Super likes: one a week on free.
select tests.as_user('10000000-0000-0000-0000-000000000003');
select tests.lives($$select public.swipe('10000000-0000-0000-0000-000000000005', 'super')$$, 'first super like of the week');
select tests.throws($$select public.swipe('10000000-0000-0000-0000-000000000001', 'super')$$, 'second super like hits the weekly limit');

-- ---------- paused match stays visible to the match only ----------
select tests.as_user('10000000-0000-0000-0000-000000000002');
select public.set_paused(true);
select tests.as_user('10000000-0000-0000-0000-000000000001');
select tests.ok((select count(*) from public.profiles where id = '10000000-0000-0000-0000-000000000002') = 1, 'a paused match is still visible to their match');
select tests.as_user('10000000-0000-0000-0000-000000000005');
select tests.ok((select count(*) from public.profiles where id = '10000000-0000-0000-0000-000000000002') = 0, 'a paused member is hidden from everyone else');
select tests.as_user('10000000-0000-0000-0000-000000000002');
select public.set_paused(false);

-- ---------- unmatch ----------
select tests.as_user('10000000-0000-0000-0000-000000000005');
select tests.throws(format('select public.unmatch(%L)', (select (r ->> 'match_id') from m)), 'outsiders cannot end a match');
select tests.as_user('10000000-0000-0000-0000-000000000001');
select public.unmatch(((select r from m) ->> 'match_id')::uuid);
select tests.ok((select ended_reason from public.matches) = 'unmatch', 'unmatch ends the match');
select tests.ok((select count(*) from public.likes where from_id = auth.uid() and to_id = '10000000-0000-0000-0000-000000000002') = 0, 'unmatch removes the likes');
select tests.ok(not exists (select 1 from public.discover(50, 0, '{}') where profile_id = '10000000-0000-0000-0000-000000000002'), 'an ended match never reappears');
select tests.throws($$select public.swipe('10000000-0000-0000-0000-000000000002', 'like')$$, 'cannot re-like an ended match');

-- ---------- blocking ends a live match ----------
reset role;
select tests.member('10000000-0000-0000-0000-000000000010', 'Kabir', 'man', '{woman}', '1994-05-05', 12.97, 77.59);
set role authenticated;
select tests.as_user('10000000-0000-0000-0000-000000000010');
select public.swipe('10000000-0000-0000-0000-000000000001', 'like');
select tests.as_user('10000000-0000-0000-0000-000000000001');
select public.swipe('10000000-0000-0000-0000-000000000010', 'like');
insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), '10000000-0000-0000-0000-000000000010');
reset role;
select tests.ok((select ended_reason from public.matches where user_b = '10000000-0000-0000-0000-000000000010' or user_a = '10000000-0000-0000-0000-000000000010') = 'block',
  'blocking ends the match');
select tests.ok((select count(*) from public.likes where '10000000-0000-0000-0000-000000000010' in (from_id, to_id)) = 0, 'blocking removes likes both ways');

-- ---------- daily picks are stable ----------
select tests.member('10000000-0000-0000-0000-000000000011', 'Laila', 'woman', '{man}', '1995-03-03', 12.97, 77.59);
select tests.member('10000000-0000-0000-0000-000000000012', 'Manav', 'man', '{woman}', '1993-03-03', 12.97, 77.59);
set role authenticated;
select tests.as_user('10000000-0000-0000-0000-000000000011');
select tests.ok((select count(*) from public.get_daily_picks()) >= 1, 'daily picks are generated');
select tests.ok((select array_agg(profile_id) from public.get_daily_picks()) = (select array_agg(profile_id) from public.get_daily_picks()), 'daily picks are stable within the day');

-- ---------- account deletion and restore ----------
select tests.as_user('10000000-0000-0000-0000-000000000012');
select public.request_account_deletion();
select tests.as_user('10000000-0000-0000-0000-000000000011');
select tests.ok((select count(*) from public.profiles where id = '10000000-0000-0000-0000-000000000012') = 0, 'a deleted profile disappears immediately');
select tests.ok(not exists (select 1 from public.get_daily_picks() where profile_id = '10000000-0000-0000-0000-000000000012'), 'and leaves daily picks');
select tests.as_user('10000000-0000-0000-0000-000000000012');
select tests.throws($$select * from public.discover()$$, 'a deleted account cannot browse');
select tests.lives('select public.restore_account()', 'deletion can be undone within 30 days');
reset role;
select tests.ok((select status from public.profiles where id = '10000000-0000-0000-0000-000000000012') = 'active', 'restored account is active again');
update public.profiles set status = 'deleted', status_reason = 'user_request' where id = '10000000-0000-0000-0000-000000000012';
update public.profile_private set deletion_requested_at = now() - interval '31 days', status_before_deletion = 'active' where profile_id = '10000000-0000-0000-0000-000000000012';
select tests.ok((select count(*) from private.accounts_due_for_purge()) = 1, 'accounts past 30 days are due for purge');
select tests.ok(not has_function_privilege('authenticated', 'private.accounts_due_for_purge(integer)', 'execute'), 'only the server can list accounts to purge');
set role authenticated;
select tests.as_user('10000000-0000-0000-0000-000000000012');
select tests.throws('select public.restore_account()', 'restore is refused after 30 days');
reset role;

-- ---------- suspended accounts cannot restore themselves ----------
update public.profiles set status = 'suspended', status_reason = 'spam' where id = '10000000-0000-0000-0000-000000000003';
set role authenticated;
select tests.as_user('10000000-0000-0000-0000-000000000003');
select tests.throws('select public.restore_account()', 'a suspended account cannot restore itself');
select tests.lives('select public.request_account_deletion()', 'a suspended member can still delete their account');
select tests.throws('select public.restore_account()', 'deleting then restoring does not lift a suspension');
reset role;
select tests.ok((select status from public.profiles where id = '10000000-0000-0000-0000-000000000003') = 'deleted', 'the suspended account stays deleted');

-- ---------- migration 5: feature flags and incognito ----------
set role authenticated;
select tests.as_user('10000000-0000-0000-0000-000000000001');
select tests.ok(public.my_features() = '{"see_likes": false, "advanced_filters": false, "undo": false, "incognito": false, "note_with_like": false, "boosts": false}'::jsonb,
  'free members have no paid features');
select tests.throws($$update public.profiles set is_incognito = true where id = auth.uid()$$, 'incognito cannot be set directly');
select tests.throws($$select public.set_incognito(true)$$, 'incognito needs premium');
select tests.lives($$select public.set_incognito(false)$$, 'turning incognito off is always allowed');
reset role;
