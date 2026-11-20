-- Cubdles — migration 14: housekeeping.
--  1. Adding a new photo removes the Verified badge until the member verifies again
--     (the badge vouches for the photos that were checked).
--  2. Orphaned storage files (no database row any more, or abandoned verification selfies) are
--     listed for the daily clean-up job, which deletes them through the Storage API.

create or replace function private.reset_verification_on_new_photo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set verified_at = null where id = new.profile_id and verified_at is not null;
  return new;
end $$;
create trigger photos_reset_verification after insert on public.photos
  for each row execute function private.reset_verification_on_new_photo();

-- Files older than a day with nothing pointing at them. Server (service role) only.
create or replace function public.orphaned_storage_files(p_limit integer default 500)
returns table (bucket text, path text)
language sql stable security definer set search_path = '' as $$
  (
    select o.bucket_id::text, o.name::text from storage.objects o
    where o.bucket_id = 'profile-photos' and o.created_at < now() - interval '1 day'
      and not exists (select 1 from public.photos ph where ph.storage_path = o.name)
    limit least(greatest(coalesce(p_limit, 500), 1), 1000)
  )
  union all
  (
    select o.bucket_id::text, o.name::text from storage.objects o
    where o.bucket_id = 'verification-selfies' and o.created_at < now() - interval '2 days'
      and not exists (select 1 from public.verification_requests v where v.storage_path = o.name and v.status = 'pending')
    limit least(greatest(coalesce(p_limit, 500), 1), 1000)
  )
$$;
revoke all on function public.orphaned_storage_files(integer) from public, anon, authenticated;
grant execute on function public.orphaned_storage_files(integer) to service_role;
