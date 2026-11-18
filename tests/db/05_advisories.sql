-- Migration 7: country safety advisories and free incognito where it matters.
\set ON_ERROR_STOP on
\set QUIET on

select tests.ok((select count(*) = 65 from public.country_rules where advisory = 'same_sex_criminalised'), '65 advisory countries');
select tests.ok((select not allowed from public.country_rules where country_code = 'IR'), 'sanctions block survives the advisory upsert');
select tests.ok((select allowed from public.country_rules where country_code = 'KE'), 'advisory countries stay open');
select tests.ok(not exists (select 1 from public.country_rules where country_code = 'LC'), 'Saint Lucia not listed (decriminalised)');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a701', 'adv1@test.local'),
  ('00000000-0000-0000-0000-00000000a702', 'adv2@test.local');
update public.profiles set country_code = 'KE' where id = '00000000-0000-0000-0000-00000000a701';
update public.profiles set country_code = 'DE' where id = '00000000-0000-0000-0000-00000000a702';

select tests.ok(private.has_feature('00000000-0000-0000-0000-00000000a701', 'incognito'), 'incognito free in advisory country');
select tests.ok(not private.has_feature('00000000-0000-0000-0000-00000000a702', 'incognito'), 'incognito still paid elsewhere');
select tests.ok(not private.has_feature('00000000-0000-0000-0000-00000000a701', 'see_likes'), 'other paid features unchanged');

set role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000a701');
select tests.ok(public.my_safety_advisory() ->> 'country_code' = 'KE', 'member sees their advisory');
select tests.lives($$select public.set_incognito(true)$$, 'member can turn incognito on');
select tests.as_user('00000000-0000-0000-0000-00000000a702');
select tests.ok(public.my_safety_advisory() is null, 'no advisory for Germany');
select tests.throws($$select public.set_incognito(true)$$, 'incognito still gated in Germany');
reset role;
