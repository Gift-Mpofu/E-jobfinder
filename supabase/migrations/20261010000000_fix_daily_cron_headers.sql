-- Fix: the daily ingest/cleanup jobs built their Authorization header as a
-- string literal containing `" || current_setting("app.anon_key")`, which is
-- neither valid JSON nor evaluated SQL, so every run failed to call the
-- function. Rebuild the headers with jsonb_build_object, matching
-- categorise-jobs.

SELECT cron.unschedule('ingest-adzuna-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ingest-adzuna-daily');
SELECT cron.unschedule('cleanup-jobs') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-jobs');

SELECT cron.schedule(
  'ingest-adzuna-daily',
  '0 4 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/ingest-adzuna',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.anon_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);

SELECT cron.schedule(
  'cleanup-jobs',
  '0 5 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/cleanup-jobs',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.anon_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);
