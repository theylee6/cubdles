-- Cubdles — migration 7: safety advisories for countries that criminalise same-sex relationships.
-- Source: Human Dignity Trust list (via PinkNews, 9 Jul 2025) updated with ILGA World's June 2026 changes
-- (Burkina Faso added; Saint Lucia decriminalised). Re-check at least yearly; laws change.

alter table public.country_rules
  add column advisory text check (advisory in ('same_sex_criminalised')),
  add column reviewed_on date;

comment on column public.country_rules.advisory is 'Safety advisory shown to members located in this country.';

insert into public.country_rules (country_code, allowed, advisory, reviewed_on, note)
select code, true, 'same_sex_criminalised', date '2026-11-18', 'Same-sex relations criminalised (HDT/ILGA)'
from unnest(array[
  -- Asia and Middle East (22)
  'AF','BD','BN','ID','IR','IQ','KW','LB','MY','MV','MM','OM','PK','PS','QA','SA','LK','SY','TM','AE','UZ','YE',
  -- Africa (32)
  'DZ','BI','BF','CM','TD','KM','EG','ER','SZ','ET','GH','GN','KE','LR','LY','MW','ML','MR','MA','NG','SN','SL',
  'SO','SS','SD','TZ','GM','TG','TN','UG','ZM','ZW',
  -- Americas (5)
  'GD','GY','JM','VC','TT',
  -- Pacific (6)
  'KI','PG','WS','SB','TO','TV'
]) as code
on conflict (country_code) do update
  set advisory = excluded.advisory, reviewed_on = excluded.reviewed_on;

-- The advisory for the signed-in member's current country, if any.
create or replace function public.my_safety_advisory()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('country_code', p.country_code, 'advisory', r.advisory)
  from public.profiles p
  join public.country_rules r on r.country_code = p.country_code
  where p.id = (select auth.uid()) and r.advisory is not null
$$;
revoke all on function public.my_safety_advisory() from public, anon;
grant execute on function public.my_safety_advisory() to authenticated;

-- Incognito is a paid feature, except where being seen could put someone at legal risk: free there.
create or replace function private.has_feature(p_uid uuid, p_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when p_key = 'incognito' and exists (
      select 1 from public.profiles p
      join public.country_rules r on r.country_code = p.country_code
      where p.id = p_uid and r.advisory = 'same_sex_criminalised'
    ) then true
    else (select (l ->> 'limit') is null or (l ->> 'limit')::int > 0
          from (select private.feature_limit(p_uid, p_key) as l) s)
  end
$$;
