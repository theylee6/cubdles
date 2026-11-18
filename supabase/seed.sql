-- =============================================================================
-- Development / test seed data. NEVER run against production.
-- Catalogue rows (interests, prompts) are also needed in production and are
-- duplicated in migration 2 when we lock them; plans here are PLACEHOLDERS.
-- =============================================================================

insert into public.interests (slug, label, category) values
  ('slow-mornings', 'Slow mornings', 'Cozy'),
  ('movie-nights', 'Movie nights', 'Cozy'),
  ('baking', 'Baking', 'Cozy'),
  ('board-games', 'Board games', 'Cozy'),
  ('reading', 'Reading', 'Cozy'),
  ('rainy-days', 'Rainy days', 'Cozy'),
  ('cooking', 'Cooking', 'Food'),
  ('chai', 'Chai', 'Food'),
  ('coffee', 'Coffee', 'Food'),
  ('street-food', 'Street food', 'Food'),
  ('hiking', 'Hiking', 'Outdoors'),
  ('beaches', 'Beaches', 'Outdoors'),
  ('road-trips', 'Road trips', 'Outdoors'),
  ('gardening', 'Gardening', 'Outdoors'),
  ('yoga', 'Yoga', 'Wellbeing'),
  ('running', 'Running', 'Wellbeing'),
  ('meditation', 'Meditation', 'Wellbeing'),
  ('live-music', 'Live music', 'Culture'),
  ('indie-films', 'Indie films', 'Culture'),
  ('museums', 'Museums', 'Culture'),
  ('poetry', 'Poetry', 'Culture'),
  ('dogs', 'Dogs', 'Pets'),
  ('cats', 'Cats', 'Pets'),
  ('gaming', 'Gaming', 'Play'),
  ('anime', 'Anime', 'Play'),
  ('travel', 'Travel', 'Adventure'),
  ('photography', 'Photography', 'Creative'),
  ('painting', 'Painting', 'Creative'),
  ('music-making', 'Making music', 'Creative'),
  ('volunteering', 'Volunteering', 'Community')
on conflict (slug) do nothing;

insert into public.prompts (text) values
  ('My ideal lazy Sunday looks like'),
  ('The way to my heart is'),
  ('I feel most cared for when'),
  ('My go-to comfort movie is'),
  ('A small thing that makes my day'),
  ('Big spoon or little spoon, and why'),
  ('I''ll know it''s going well when'),
  ('My love language, explained badly'),
  ('Together we could'),
  ('The coziest place I know is')
on conflict (text) do nothing;

-- PLACEHOLDER plans for local development only. Real prices are set by the
-- owner in the admin dashboard (decision D7).
with free as (
  insert into public.plans (code, name, description, is_free, sort_order)
  values ('free', 'Free', 'Everything you need to meet someone.', true, 0)
  on conflict (code) do update set name = excluded.name returning id
), plus as (
  insert into public.plans (code, name, description, is_free, sort_order)
  values ('plus', 'Cubdles Plus', 'More ways to find your person, sooner.', false, 1)
  on conflict (code) do update set name = excluded.name returning id
), prices as (
  insert into public.plan_prices (plan_id, period_months, currency, amount_minor)
  select id, p.months, 'INR', p.amount from plus,
    (values (1, 49900), (3, 119900), (6, 179900)) as p(months, amount)
  on conflict do nothing
  returning 1
), ent_free as (
  insert into public.entitlements (plan_id, feature_key, limit_value, period)
  select id, e.k, e.v, e.p from free,
    (values ('daily_likes', 25, 'day'), ('super_likes', 1, 'week'), ('see_likes', 0, null),
            ('advanced_filters', 0, null), ('undo', 0, null), ('incognito', 0, null), ('boosts', 0, 'month'))
      as e(k, v, p)
  on conflict do nothing
  returning 1
)
insert into public.entitlements (plan_id, feature_key, limit_value, period)
select id, e.k, e.v, e.p from plus,
  (values ('daily_likes', null::int, 'day'), ('super_likes', 5, 'week'), ('see_likes', null, null),
          ('advanced_filters', null, null), ('undo', null, null), ('incognito', null, null), ('boosts', 1, 'month'))
    as e(k, v, p)
on conflict do nothing;
