-- Rate limits and data export (migration 10).
\set ON_ERROR_STOP on
\set QUIET on

select tests.ok(public.rate_limit_hit('test', 'k1', 2, 60), 'first hit allowed');
select tests.ok(public.rate_limit_hit('test', 'k1', 2, 60), 'second hit allowed');
select tests.ok(not public.rate_limit_hit('test', 'k1', 2, 60), 'third hit refused');
select tests.ok(public.rate_limit_hit('test', 'k2', 2, 60), 'other keys are independent');

set role authenticated;
select tests.throws($$select public.rate_limit_hit('x', 'y', 1, 60)$$, 'members cannot call the rate limiter');
select tests.throws($$select * from private.rate_limits$$, 'members cannot read rate limits');

select tests.as_user('70000000-0000-0000-0000-000000000001');
select tests.ok((public.export_my_data() -> 'profile' ->> 'id') = '70000000-0000-0000-0000-000000000001', 'export contains your own profile');
select tests.ok(jsonb_array_length(public.export_my_data() -> 'reports_made') >= 1, 'export includes reports you made');
select tests.ok(not (public.export_my_data() -> 'private' ? 'location'), 'export omits raw location coordinates');
select tests.ok((public.export_my_data() -> 'private' ->> 'has_location')::boolean, 'but says a location is stored');
reset role;
