-- Run after deploying the booking migrations and send-booking-notifications.
-- Requires Vault secrets booking_notification_secret and booking_site_url.
-- Keep the worker secret identical to BOOKING_NOTIFICATION_SECRET in Edge Function secrets.
-- No keys or recipient addresses belong in this file.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='booking_notification_secret')
 OR NOT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='booking_site_url') THEN
  RAISE EXCEPTION 'Configure the private booking worker secret and Supabase function base URL in Vault first.';
 END IF;
END $$;
SELECT cron.schedule('eduway-booking-notifications','* * * * *',$task$
 SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='booking_site_url') || '/functions/v1/send-booking-notifications',
  headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='booking_notification_secret')),
  body := '{}'::jsonb,
  timeout_milliseconds := 100000
 );
$task$);
