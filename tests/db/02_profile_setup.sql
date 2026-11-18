-- Profile set-up functions (migration 2).
\set ON_ERROR_STOP on
\set QUIET on

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000201', 'dev@test.dev'),
  ('00000000-0000-0000-0000-000000000202', 'esha@test.dev');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000201","role":"authenticated"}', false);

-- ---------- onboarding step only moves forward ----------
update public.profiles set onboarding_step = 4;
update public.profiles set onboarding_step = 2;
select tests.ok((select onboarding_step from public.profiles where id = auth.uid()) = 4, 'onboarding step never moves backwards');

-- ---------- gender and preferences ----------
select tests.lives($$update public.profiles set gender_group = 'nonbinary', gender_identity = 'Genderfluid' where id = auth.uid()$$, 'owner sets gender group and own label');
select tests.throws($$update public.profiles set gender_group = 'other' where id = auth.uid()$$, 'gender group must be from the closed set');
select tests.throws($$update public.preferences set show_genders = '{women}'$$, 'show-me genders must be from the closed set');
select tests.lives($$update public.preferences set show_genders = '{woman,nonbinary}', age_min = 25, age_max = 35, max_distance_km = 15$$, 'owner sets who they want to meet');
select tests.throws($$update public.preferences set age_min = 40, age_max = 30$$, 'age range must be ordered');
select tests.throws($$update public.preferences set age_min = 17$$, 'minimum age cannot be under 18');

-- ---------- affection profile ----------
select tests.lives($$update public.affection_profiles set cuddle_style = 'big_spoon', pace = 'steady', touch_comfort = 5, public_affection = 2, love_languages = '{touch,time}'$$, 'owner saves affection profile');
select tests.throws($$update public.affection_profiles set love_languages = '{touch,time,words}'$$, 'at most two love languages');
select tests.throws($$update public.affection_profiles set love_languages = '{hugs}'$$, 'love languages from the known set only');
select tests.throws($$update public.affection_profiles set touch_comfort = 9$$, 'touch comfort is 1 to 5');

-- ---------- interests ----------
select tests.lives($$select public.set_profile_interests('{1,2,3}')$$, 'owner sets interests');
select tests.ok((select count(*) from public.profile_interests where profile_id = auth.uid()) = 3, 'three interests saved');
select tests.lives($$select public.set_profile_interests('{4,5}')$$, 'interests are replaced, not appended');
select tests.ok((select array_agg(interest_id order by interest_id) from public.profile_interests where profile_id = auth.uid()) = '{4,5}', 'only the new interests remain');
select tests.throws($$select public.set_profile_interests('{1,2,3,4,5,6,7,8,9,10,11}')$$, 'more than ten interests is rejected');
select tests.throws($$select public.set_profile_interests('{9999}')$$, 'unknown interest is rejected');
select tests.throws($$insert into public.profile_interests (profile_id, interest_id) values ('00000000-0000-0000-0000-000000000202', 1)$$, 'cannot add interests to someone else');

-- ---------- prompts ----------
select tests.lives($$select public.set_profile_prompts('[{"prompt_id": 2, "answer": "  Soup and a blanket.  "}, {"prompt_id": 6, "answer": "Little spoon, always."}]')$$, 'owner saves prompts');
select tests.ok((select answer from public.profile_prompts where profile_id = auth.uid() and position = 0) = 'Soup and a blanket.', 'prompt answers are trimmed and ordered');
select tests.throws($$select public.set_profile_prompts('[{"prompt_id": 1, "answer": "a"}, {"prompt_id": 2, "answer": "b"}, {"prompt_id": 3, "answer": "c"}, {"prompt_id": 4, "answer": "d"}]')$$, 'more than three prompts is rejected');
select tests.throws($$select public.set_profile_prompts('[{"prompt_id": 1, "answer": "a"}, {"prompt_id": 1, "answer": "b"}]')$$, 'the same prompt twice is rejected');
select tests.throws($$select public.set_profile_prompts('[{"prompt_id": 1, "answer": ""}]')$$, 'empty answers are rejected');
select tests.throws($$select public.set_profile_prompts(format('[{"prompt_id": 1, "answer": "%s"}]', repeat('x', 201))::jsonb)$$, 'answers over 200 characters are rejected');
select tests.ok((select count(*) from public.profile_prompts where profile_id = auth.uid()) = 2, 'failed saves leave the previous prompts intact');

-- ---------- photos ----------
select tests.ok(public.next_photo_position() = 0, 'first free photo slot is 0');
insert into public.photos (id, profile_id, storage_path, position) values
  ('00000000-0000-0000-0000-00000000aa01', auth.uid(), auth.uid() || '/a.webp', 0),
  ('00000000-0000-0000-0000-00000000aa02', auth.uid(), auth.uid() || '/b.webp', 1),
  ('00000000-0000-0000-0000-00000000aa03', auth.uid(), auth.uid() || '/c.webp', 2);
select tests.ok(public.next_photo_position() = 3, 'next free slot after three photos is 3');
select tests.lives($$select public.reorder_photos('{00000000-0000-0000-0000-00000000aa03,00000000-0000-0000-0000-00000000aa01,00000000-0000-0000-0000-00000000aa02}')$$, 'owner reorders photos');
select tests.ok((select position from public.photos where id = '00000000-0000-0000-0000-00000000aa03') = 0, 'reordered photo is now first');
select tests.throws($$select public.reorder_photos('{00000000-0000-0000-0000-00000000aa01,00000000-0000-0000-0000-00000000aa02}')$$, 'reorder must include every photo');
select tests.throws($$select public.reorder_photos('{00000000-0000-0000-0000-00000000aa01,00000000-0000-0000-0000-00000000aa01,00000000-0000-0000-0000-00000000aa02}')$$, 'reorder rejects duplicates');
delete from public.photos where id = '00000000-0000-0000-0000-00000000aa03';
select public.compact_photo_positions();
select tests.ok((select array_agg(position order by position) from public.photos where profile_id = auth.uid()) = '{0,1}', 'positions are compacted after a delete');

-- ---------- someone else cannot touch these photos ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000202","role":"authenticated"}', false);
select tests.throws($$select public.reorder_photos('{00000000-0000-0000-0000-00000000aa01,00000000-0000-0000-0000-00000000aa02}')$$, 'cannot reorder another member''s photos');
delete from public.photos where id = '00000000-0000-0000-0000-00000000aa01';
reset role;
select tests.ok((select count(*) from public.photos where id = '00000000-0000-0000-0000-00000000aa01') = 1, 'cannot delete another member''s photo');

-- ---------- completing onboarding needs every piece ----------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000201","role":"authenticated"}', false);
select public.submit_birth_date('1994-02-11');
select public.accept_terms(false);
select public.set_location(19.076, 72.8777, 'Mumbai');
update public.profiles set display_name = 'Dev', intention = 'long_term' where id = auth.uid();
select tests.lives('select public.complete_onboarding()', 'onboarding completes with all sections filled');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000202","role":"authenticated"}', false);
select public.submit_birth_date('1996-09-30');
select public.accept_terms(false);
select public.set_location(28.61, 77.21, 'Delhi');
update public.profiles set display_name = 'Esha', gender_identity = 'Woman', gender_group = 'woman', intention = 'long_term' where id = auth.uid();
update public.preferences set show_genders = '{man}';
insert into public.photos (profile_id, storage_path, position) values (auth.uid(), auth.uid() || '/1.webp', 0), (auth.uid(), auth.uid() || '/2.webp', 1);
select tests.throws('select public.complete_onboarding()', 'onboarding refuses to finish without an affection profile');
update public.affection_profiles set cuddle_style = 'either', pace = 'quick', touch_comfort = 3;
select tests.throws('select public.complete_onboarding()', 'onboarding refuses to finish without a prompt');
select public.set_profile_prompts('[{"prompt_id": 5, "answer": "Sunlight through the window."}]');
select tests.lives('select public.complete_onboarding()', 'onboarding completes once every requirement is met');
select tests.throws('select public.complete_onboarding()', 'onboarding cannot be completed twice');
reset role;

-- ---------- migration 3: helper functions are not callable through the API ----------
select tests.ok(not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('is_blocked_between', 'can_view_profile', 'has_staff_role', 'is_staff')
), 'policy helper functions are no longer in the API-exposed public schema');
select tests.ok(not has_function_privilege('anon', 'private.is_blocked_between(uuid, uuid)', 'execute'), 'anonymous visitors cannot call private helpers');
select tests.ok((select count(*) from pg_policies where schemaname = 'public' and (qual like '%auth.uid()%' or with_check like '%auth.uid()%')
                 and not (coalesce(qual, '') like '%SELECT auth.uid()%' or coalesce(with_check, '') like '%SELECT auth.uid()%')) = 0,
  'every policy evaluates auth.uid() once per statement');
