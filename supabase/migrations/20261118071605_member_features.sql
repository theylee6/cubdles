-- =============================================================================
-- Cubdles — migration 5: member feature flags for the UI, incognito behind its entitlement.
-- =============================================================================

-- Which plan features the signed-in member has (UI hints only; every feature is enforced server-side).
create or replace function public.my_features()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(k, private.has_feature(auth.uid(), k))
  from unnest(array['see_likes', 'advanced_filters', 'undo', 'incognito', 'note_with_like', 'boosts']) as k
$$;

-- Incognito is a paid feature: members can no longer flip the column directly.
revoke update (is_incognito) on public.profiles from authenticated;

create or replace function public.set_incognito(p_on boolean)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_on and not private.has_feature(auth.uid(), 'incognito') then
    raise exception 'premium_required' using errcode = 'check_violation';
  end if;
  update public.profiles set is_incognito = coalesce(p_on, false)
  where id = auth.uid() and status in ('active', 'paused');
end $$;

comment on table public.compatibility_config is 'Scoring weights. No client access by design (RLS on, no policies); admins change it via audited server actions.';

revoke all on function public.my_features() from public, anon;
revoke all on function public.set_incognito(boolean) from public, anon;
grant execute on function public.my_features() to authenticated;
grant execute on function public.set_incognito(boolean) to authenticated;
