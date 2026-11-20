-- Paid membership from subscriptions (migration 13).
\set ON_ERROR_STOP on
\set QUIET on

select tests.member('b0000000-0000-0000-0000-000000000001', 'Pia', 'woman', '{man}', '1995-01-01', 12.97, 77.59);
-- A real price row as the owner would add it (amount + provider plan id).
insert into public.plan_prices (id, plan_id, period_months, currency, amount_minor, provider, provider_plan_id)
select 'b1000000-0000-0000-0000-000000000001', id, 1, 'USD', 999, 'razorpay', 'plan_test_123' from public.plans where code = 'plus'
on conflict (plan_id, period_months, currency) do update set provider_plan_id = excluded.provider_plan_id
returning 1;

select tests.ok(private.current_plan_code('b0000000-0000-0000-0000-000000000001') = 'free', 'members start on the free plan');
select tests.ok(not private.has_feature('b0000000-0000-0000-0000-000000000001', 'see_likes'), 'free members cannot see who liked them');

set role authenticated;
select tests.as_user('b0000000-0000-0000-0000-000000000001');
select tests.throws($$select public.upsert_subscription(auth.uid(), 'b1000000-0000-0000-0000-000000000001', 'sub_fake', 'active')$$, 'members cannot grant themselves a subscription');
select tests.throws($$insert into public.subscriptions (profile_id, plan_id, provider_subscription_id) select auth.uid(), id, 'x' from public.plans where code = 'plus'$$, 'or insert one directly');
select tests.ok((public.my_membership() ->> 'plan_code') = 'free', 'my_membership says free');
reset role;

set role service_role;
select public.upsert_subscription('b0000000-0000-0000-0000-000000000001', (select id from public.plan_prices where provider_plan_id = 'plan_test_123'), 'sub_test_1', 'created');
reset role;
select tests.ok(private.current_plan_code('b0000000-0000-0000-0000-000000000001') = 'free', 'a created (unpaid) subscription grants nothing');

set role service_role;
select public.update_subscription_status('sub_test_1', 'active', now() + interval '30 days');
reset role;
select tests.ok(private.current_plan_code('b0000000-0000-0000-0000-000000000001') = 'plus', 'an active subscription grants Plus');
select tests.ok(private.has_feature('b0000000-0000-0000-0000-000000000001', 'see_likes'), 'Plus members can see who liked them');
select tests.ok((private.feature_limit('b0000000-0000-0000-0000-000000000001', 'daily_likes') ->> 'limit') is null, 'Plus has unlimited likes');
select tests.ok(not private.has_feature('b0000000-0000-0000-0000-000000000001', 'boosts'), 'boosts are not sold (not built)');

set role authenticated;
select tests.as_user('b0000000-0000-0000-0000-000000000001');
select tests.ok((public.my_membership() -> 'subscription' ->> 'status') = 'active', 'members see their own subscription');
select tests.ok((select count(*) = 1 from public.subscriptions), 'and only their own');
reset role;

-- Cancelled at period end: keeps Plus until the paid period ends.
set role service_role;
select public.update_subscription_status('sub_test_1', 'cancelled');
reset role;
select tests.ok(private.current_plan_code('b0000000-0000-0000-0000-000000000001') = 'plus', 'cancelled keeps Plus until the period ends');
update public.subscriptions set current_period_end = now() - interval '1 hour' where provider_subscription_id = 'sub_test_1';
select tests.ok(private.current_plan_code('b0000000-0000-0000-0000-000000000001') = 'free', 'then returns to free');

-- Halted (payments failed for good) loses Plus.
set role service_role;
select public.update_subscription_status('sub_test_1', 'halted', now() + interval '10 days');
reset role;
select tests.ok(private.current_plan_code('b0000000-0000-0000-0000-000000000001') = 'free', 'halted subscriptions grant nothing');
