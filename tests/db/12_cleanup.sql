-- Housekeeping (migration 14).
\set ON_ERROR_STOP on
\set QUIET on

grant usage on schema tests to service_role;
grant execute on all functions in schema tests to service_role;

select tests.member('c0000000-0000-0000-0000-000000000001', 'Kai', 'man', '{woman}', '1995-01-01', 12.97, 77.59);
update public.profiles set verified_at = now() where id = 'c0000000-0000-0000-0000-000000000001';

set role authenticated;
select tests.as_user('c0000000-0000-0000-0000-000000000001');
insert into public.photos (profile_id, storage_path, position) values ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001/new.webp', 1);
reset role;
select tests.ok((select verified_at is null from public.profiles where id = 'c0000000-0000-0000-0000-000000000001'), 'adding a photo removes the Verified badge');

insert into storage.buckets (id, name) values ('profile-photos', 'profile-photos') on conflict do nothing;
insert into storage.objects (bucket_id, name, created_at) values
  ('profile-photos', 'c0000000-0000-0000-0000-000000000001/new.webp', now() - interval '3 days'),    -- referenced
  ('profile-photos', 'c0000000-0000-0000-0000-000000000001/gone.webp', now() - interval '3 days'),   -- orphaned
  ('profile-photos', 'c0000000-0000-0000-0000-000000000001/fresh.webp', now()),                     -- too new to judge
  ('verification-selfies', 'c0000000-0000-0000-0000-000000000001/old-selfie.webp', now() - interval '3 days');

set role authenticated;
select tests.throws($$select * from public.orphaned_storage_files()$$, 'members cannot list storage files');
reset role;
set role service_role;
create temp table orphans as select * from public.orphaned_storage_files();
reset role;
select tests.ok((select count(*) = 1 from orphans where path like '%gone.webp'), 'unreferenced old photo files are found');
select tests.ok(not exists (select 1 from orphans where path like '%new.webp' or path like '%fresh.webp'), 'referenced or recent files are kept');
select tests.ok(exists (select 1 from orphans where bucket = 'verification-selfies'), 'abandoned selfies are found');
