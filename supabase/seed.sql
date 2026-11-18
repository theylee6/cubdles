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

-- A handful of cities for local development and tests. Production loads ~24k via scripts/load-cities.mjs.
insert into public.cities (id, name, ascii_name, country_code, admin_code, population, location) values
  (1277333, 'Bengaluru', 'Bengaluru', 'IN', '19', 5104047, extensions.st_setsrid(extensions.st_makepoint(77.59369, 12.97194), 4326)::extensions.geography),
  (1275339, 'Mumbai', 'Mumbai', 'IN', '16', 12691836, extensions.st_setsrid(extensions.st_makepoint(72.88261, 19.07283), 4326)::extensions.geography),
  (1273294, 'Delhi', 'Delhi', 'IN', '07', 10927986, extensions.st_setsrid(extensions.st_makepoint(77.23149, 28.65195), 4326)::extensions.geography),
  (2643743, 'London', 'London', 'GB', 'ENG', 8961989, extensions.st_setsrid(extensions.st_makepoint(-0.12574, 51.50853), 4326)::extensions.geography),
  (5128581, 'New York City', 'New York City', 'US', 'NY', 8804190, extensions.st_setsrid(extensions.st_makepoint(-74.00597, 40.71427), 4326)::extensions.geography),
  (2147714, 'Sydney', 'Sydney', 'AU', '02', 4627345, extensions.st_setsrid(extensions.st_makepoint(151.20732, -33.86785), 4326)::extensions.geography),
  (2950159, 'Berlin', 'Berlin', 'DE', '16', 3426354, extensions.st_setsrid(extensions.st_makepoint(13.41053, 52.52437), 4326)::extensions.geography),
  (3553478, 'Havana', 'Havana', 'CU', '03', 2163824, extensions.st_setsrid(extensions.st_makepoint(-82.38304, 23.13302), 4326)::extensions.geography),
  (3117735, 'Madrid', 'Madrid', 'ES', '29', 3255944, extensions.st_setsrid(extensions.st_makepoint(-3.70256, 40.4165), 4326)::extensions.geography)
on conflict (id) do nothing;
