-- =============================================================================
-- Cubdles — migration 6: global launch
--  * World city gazetteer (GeoNames, CC BY 4.0) with search + nearest-city lookup
--  * Each member's country and IANA time zone; quotas and daily picks use local midnight
--  * Distance unit (km / mi) per member
--  * Country rules (e.g. sanctioned countries can't sign up)
-- City rows are loaded by scripts/load-cities.mjs (data, not schema).
-- =============================================================================

create table public.cities (
  id           integer primary key,           -- GeoNames id
  name         text not null,
  ascii_name   text not null,
  country_code char(2) not null,
  admin_code   text,
  population   integer not null default 0,
  location     extensions.geography(Point, 4326) not null
);
create index cities_location_idx on public.cities using gist (location);
create index cities_name_prefix_idx on public.cities (lower(name) text_pattern_ops);
create index cities_ascii_prefix_idx on public.cities (lower(ascii_name) text_pattern_ops);
create index cities_country_idx on public.cities (country_code);
comment on table public.cities is 'World cities with population >= 15,000. Data: GeoNames (geonames.org), CC BY 4.0.';

create table public.country_rules (
  country_code char(2) primary key check (country_code ~ '^[A-Z]{2}$'),
  allowed      boolean not null default true,
  note         text
);
comment on table public.country_rules is 'Countries where sign-up is restricted. Absent = allowed. Review with counsel before launch.';
insert into public.country_rules (country_code, allowed, note) values
  ('CU', false, 'Comprehensive sanctions — confirm with counsel'),
  ('IR', false, 'Comprehensive sanctions — confirm with counsel'),
  ('KP', false, 'Comprehensive sanctions — confirm with counsel'),
  ('SY', false, 'Comprehensive sanctions — confirm with counsel');

alter table public.profiles add column country_code char(2);
create index profiles_country_idx on public.profiles (country_code);
alter table public.profile_private add column timezone text;
alter table public.preferences add column distance_unit text not null default 'km' check (distance_unit in ('km', 'mi'));
grant update (distance_unit) on public.preferences to authenticated;

-- -----------------------------------------------------------------------------
-- Time zones: quotas and daily picks follow the member's own midnight.
-- -----------------------------------------------------------------------------
create or replace function private.member_timezone(p_uid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select timezone from public.profile_private where profile_id = p_uid), 'UTC')
$$;

-- Replaces the India-time version: start of the current quota period in the caller's time zone.
create or replace function private.period_start(p_period text)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select date_trunc(coalesce(p_period, 'day'), now() at time zone private.member_timezone(auth.uid()))
         at time zone private.member_timezone(auth.uid())
$$;

create or replace function private.member_today(p_uid uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone private.member_timezone(p_uid))::date
$$;

create or replace function public.get_daily_picks()
returns table (profile_id uuid, score numeric, reasons jsonb)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  today date := private.member_today(auth.uid());
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.daily_picks d where d.user_id = me and d.pick_date = today) then
    insert into public.daily_picks (user_id, pick_date, pick_id, rank, score, reasons)
    select me, today, d.profile_id, (row_number() over ())::smallint, d.score, d.reasons
    from public.discover(5, 0, '{}'::jsonb) d
    on conflict do nothing;
  end if;
  return query
  select d.pick_id, d.score, d.reasons
  from public.daily_picks d
  where d.user_id = me and d.pick_date = today
    and not exists (select 1 from public.likes l where l.from_id = me and l.to_id = d.pick_id)
    and not exists (select 1 from public.passes x where x.from_id = me and x.to_id = d.pick_id)
    and private.can_view_profile(d.pick_id)
  order by d.rank;
end $$;

-- Keep the stored time zone current when a member travels (invalid names are ignored).
create or replace function public.set_timezone(p_timezone text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_timezone is not null and exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    update public.profile_private set timezone = p_timezone where profile_id = auth.uid() and timezone is distinct from p_timezone;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Cities and location
-- -----------------------------------------------------------------------------

-- Prefix search over city names (and their ASCII forms), biggest first.
create or replace function public.search_cities(p_query text, p_limit integer default 8)
returns table (id integer, name text, country_code text, admin_code text, population integer)
language sql stable security definer set search_path = '' as $$
  with q as (select replace(replace(lower(btrim(coalesce(p_query, ''))), '%', ''), '_', '') as v)
  select c.id, c.name, c.country_code::text, c.admin_code, c.population
  from public.cities c, q
  where char_length(q.v) >= 2
    and (lower(c.name) like q.v || '%' or lower(c.ascii_name) like q.v || '%')
  order by c.population desc
  limit least(greatest(coalesce(p_limit, 8), 1), 20)
$$;

-- Replaces set_location(lat, lng, city_text): the server decides the city and country.
drop function public.set_location(double precision, double precision, text);

create or replace function public.set_location(
  p_lat double precision default null,
  p_lng double precision default null,
  p_city_id integer default null,
  p_timezone text default null
) returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  c public.cities;
  lat double precision;
  lng double precision;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_city_id is not null then
    select * into c from public.cities where id = p_city_id;
    if c.id is null then
      raise exception 'unknown_city' using errcode = 'check_violation';
    end if;
    lat := extensions.st_y(c.location::extensions.geometry);
    lng := extensions.st_x(c.location::extensions.geometry);
  elsif p_lat is not null and p_lng is not null then
    if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
      raise exception 'invalid_coordinates' using errcode = 'check_violation';
    end if;
    lat := p_lat;
    lng := p_lng;
    select * into c from public.cities
    order by location operator(extensions.<->) extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
    limit 1;
    if c.id is null then
      raise exception 'unknown_city' using errcode = 'check_violation';
    end if;
  else
    raise exception 'invalid_location' using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.country_rules r where r.country_code = c.country_code and not r.allowed) then
    raise exception 'country_unavailable' using errcode = 'check_violation';
  end if;

  if p_timezone is not null and not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    p_timezone := null;
  end if;

  update public.profile_private
     set location = extensions.st_setsrid(
           extensions.st_makepoint(round(lng::numeric, 2)::float8, round(lat::numeric, 2)::float8), 4326
         )::extensions.geography,
         timezone = coalesce(p_timezone, timezone)
   where profile_id = uid;
  update public.profiles set city = left(c.name, 80), country_code = c.country_code where id = uid;
  update public.preferences
     set distance_unit = case when c.country_code in ('US', 'GB', 'LR', 'MM') then 'mi' else 'km' end
   where profile_id = uid;

  return jsonb_build_object('city', c.name, 'country_code', c.country_code);
end $$;

-- -----------------------------------------------------------------------------
-- RLS and grants
-- -----------------------------------------------------------------------------
alter table public.cities enable row level security;
alter table public.country_rules enable row level security;
revoke all on public.cities, public.country_rules from anon, authenticated;
grant select on public.cities, public.country_rules to authenticated;
create policy cities_select on public.cities for select to authenticated using (true);
create policy country_rules_select on public.country_rules for select to authenticated using (true);

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
revoke execute on function private.accounts_due_for_purge(integer) from authenticated;

revoke all on function public.search_cities(text, integer) from public, anon;
revoke all on function public.set_location(double precision, double precision, integer, text) from public, anon;
revoke all on function public.set_timezone(text) from public, anon;
grant execute on function public.search_cities(text, integer) to authenticated;
grant execute on function public.set_location(double precision, double precision, integer, text) to authenticated;
grant execute on function public.set_timezone(text) to authenticated;
