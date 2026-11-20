-- Cubdles — migration 10: request rate limits (for sign-up, log-in, password reset and the contact
-- form) and "download my data" (DPDP / GDPR right of access).

-- -----------------------------------------------------------------------------
-- Rate limits: fixed windows keyed by a hash (we never store raw IPs or emails here).
-- Only the server (service role) can call this.
-- -----------------------------------------------------------------------------
create table private.rate_limits (
  bucket       text not null check (char_length(bucket) <= 40),
  key_hash     text not null check (char_length(key_hash) <= 128),
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (bucket, key_hash, window_start)
);
create index rate_limits_window_idx on private.rate_limits (window_start);

create or replace function public.rate_limit_hit(p_bucket text, p_key_hash text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into private.rate_limits (bucket, key_hash, window_start, hits)
  values (p_bucket, p_key_hash, w, 1)
  on conflict (bucket, key_hash, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into n;
  -- Opportunistic clean-up of old windows (cheap: indexed, small table).
  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;
  return n <= p_max;
end $$;
revoke all on function public.rate_limit_hit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, text, integer, integer) to service_role;

-- -----------------------------------------------------------------------------
-- Download my data: everything we hold about the signed-in member, as JSON.
-- -----------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at) from auth.users u where u.id = me),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = me),
    'private', (select to_jsonb(pp) - 'location' || jsonb_build_object('has_location', pp.location is not null) from public.profile_private pp where pp.profile_id = me),
    'preferences', (select to_jsonb(x) from public.preferences x where x.profile_id = me),
    'privacy_settings', (select to_jsonb(x) from public.privacy_settings x where x.profile_id = me),
    'affection', (select to_jsonb(x) from public.affection_profiles x where x.profile_id = me),
    'lifestyle', (select to_jsonb(x) from public.lifestyle x where x.profile_id = me),
    'photos', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'position', x.position, 'status', x.moderation_status, 'note', x.moderation_note, 'created_at', x.created_at) order by x.position), '[]') from public.photos x where x.profile_id = me),
    'interests', (select coalesce(jsonb_agg(i.label order by i.label), '[]') from public.profile_interests pi join public.interests i on i.id = pi.interest_id where pi.profile_id = me),
    'prompts', (select coalesce(jsonb_agg(jsonb_build_object('question', q.text, 'answer', pp.answer)), '[]') from public.profile_prompts pp join public.prompts q on q.id = pp.prompt_id where pp.profile_id = me),
    'likes_sent', (select coalesce(jsonb_agg(jsonb_build_object('to', l.to_id, 'kind', l.kind, 'note', l.note, 'created_at', l.created_at)), '[]') from public.likes l where l.from_id = me),
    'passes', (select count(*) from public.passes x where x.from_id = me),
    'matches', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'with', case when m.user_a = me then m.user_b else m.user_a end, 'created_at', m.created_at, 'ended_at', m.ended_at, 'ended_reason', m.ended_reason)), '[]') from public.matches m where me in (m.user_a, m.user_b)),
    'messages_sent', (select coalesce(jsonb_agg(jsonb_build_object('match', x.match_id, 'body', x.body, 'created_at', x.created_at) order by x.created_at), '[]') from public.messages x where x.sender_id = me),
    'blocks', (select coalesce(jsonb_agg(jsonb_build_object('blocked', b.blocked_id, 'created_at', b.created_at)), '[]') from public.blocks b where b.blocker_id = me),
    'reports_made', (select coalesce(jsonb_agg(jsonb_build_object('about', r.reported_id, 'reason', r.reason, 'details', r.details, 'status', r.status, 'created_at', r.created_at)), '[]') from public.reports r where r.reporter_id = me),
    'safety_notices', (select coalesce(jsonb_agg(jsonb_build_object('kind', s.kind, 'created_at', s.created_at, 'dismissed_at', s.dismissed_at)), '[]') from public.safety_notices s where s.profile_id = me)
  );
end $$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
