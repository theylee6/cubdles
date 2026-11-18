-- Global launch: cities, nearest-city, country rules, time zones, units (migration 6).
\set ON_ERROR_STOP on
\set QUIET on

insert into auth.users (id, email) values
  ('40000000-0000-0000-0000-000000000001', 'g1@test.dev'),
  ('40000000-0000-0000-0000-000000000002', 'g2@test.dev');

set role authenticated;
select tests.as_user('40000000-0000-0000-0000-000000000001');

-- ---------- city search ----------
select tests.ok((select name from public.search_cities('lon') limit 1) = 'London', 'city search finds by prefix');
select tests.ok((select count(*) from public.search_cities('m')) = 0, 'single-letter searches return nothing');
select tests.ok((select count(*) from public.search_cities('%')) = 0, 'wildcards are not interpreted');
select tests.ok((select array_agg(name order by population desc) from public.search_cities('m')) is null, 'no results for too-short query');

-- ---------- location from device coordinates: the server picks the city and country ----------
select tests.ok((public.set_location(51.51, -0.13, null, 'Europe/London') ->> 'city') = 'London', 'device location resolves to the nearest city');
select tests.ok((select country_code from public.profiles where id = auth.uid()) = 'GB', 'country is recorded');
select tests.ok((select timezone from public.profile_private where profile_id = auth.uid()) = 'Europe/London', 'time zone is recorded');
select tests.ok((select distance_unit from public.preferences where profile_id = auth.uid()) = 'mi', 'UK members get miles');

-- ---------- location from a chosen city ----------
select tests.ok((public.set_location(null, null, 2950159, 'Not/AZone') ->> 'country_code') = 'DE', 'choosing a city sets its country');
select tests.ok((select timezone from public.profile_private where profile_id = auth.uid()) = 'Europe/London', 'invalid time zone names are ignored');
select tests.ok((select distance_unit from public.preferences where profile_id = auth.uid()) = 'km', 'German members get kilometres');
select tests.throws('select public.set_location(null, null, 999999999)', 'unknown city ids are rejected');
select tests.throws('select public.set_location()', 'a location is required');
select tests.throws('select public.set_location(null, null, 3553478)', 'sign-up from a restricted country is refused');
select tests.ok((select country_code from public.profiles where id = auth.uid()) = 'DE', 'a refused location changes nothing');

-- ---------- time zones ----------
select public.set_timezone('America/New_York');
select tests.ok((select timezone from public.profile_private where profile_id = auth.uid()) = 'America/New_York', 'members can update their time zone');
select public.set_timezone('Mars/Olympus');
select tests.ok((select timezone from public.profile_private where profile_id = auth.uid()) = 'America/New_York', 'unknown time zones are ignored');
select tests.ok(private.period_start('day') = (date_trunc('day', now() at time zone 'America/New_York') at time zone 'America/New_York'),
  'daily quotas reset at the member''s local midnight');
select tests.ok(private.member_today(auth.uid()) = (now() at time zone 'America/New_York')::date, 'daily picks use the member''s local date');

-- ---------- data access ----------
select tests.throws($$insert into public.country_rules values ('FR', false, 'x')$$, 'members cannot change country rules');
select tests.throws($$insert into public.cities (id, name, ascii_name, country_code, location) values (1, 'X', 'X', 'XX', extensions.st_setsrid(extensions.st_makepoint(0, 0), 4326)::extensions.geography)$$,
  'members cannot add cities');
reset role;
set role anon;
select tests.throws('select * from public.search_cities(''lon'')', 'anonymous visitors cannot search cities');
reset role;
