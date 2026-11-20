-- Per-environment setup for email notifications (run once in the SQL editor; NOT a migration,
-- because it contains this environment's URL and secret).
--
-- 1. Generate a secret:  openssl rand -hex 32
-- 2. Put the same value in Vercel as NOTIFY_DISPATCH_SECRET and below as <SECRET>.
-- 3. Set <SITE_URL> to the production URL, e.g. https://cubdles.com
--
-- The scheduler only calls the app when an email is actually due.

create extension if not exists pg_net;
create extension if not exists pg_cron;

select vault.create_secret('<SECRET>', 'notify_dispatch_secret', 'Bearer token for /api/notifications/dispatch');
select vault.create_secret('<SITE_URL>', 'site_url', 'Base URL of the web app');

select cron.schedule(
  'dispatch-notification-emails',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'site_url') || '/api/notifications/dispatch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'notify_dispatch_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  where public.notifications_due();
  $$
);
