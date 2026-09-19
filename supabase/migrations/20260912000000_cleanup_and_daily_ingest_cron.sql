-- Migration for Job Staleness: Daily Adzuna ingest & Stale Jobs cleanup cron schedule

-- Unscheduling old 6-hourly cron jobs if they exist
SELECT cron.unschedule('invoke-adzuna-ingestion') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'invoke-adzuna-ingestion');
SELECT cron.unschedule('ingest-adzuna-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ingest-adzuna-daily');
SELECT cron.unschedule('cleanup-jobs') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-jobs');

-- FIX 1: Run Adzuna ingestion daily at 04:00 UTC (06:00 SAST)
SELECT cron.schedule(
  'ingest-adzuna-daily',
  '0 4 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') 
    || '/functions/v1/ingest-adzuna',
    headers := '{"Authorization": "Bearer " 
    || current_setting("app.anon_key")}'
  )$$
);

-- FIX 2: Run cleanup-jobs daily at 05:00 UTC (07:00 SAST)
SELECT cron.schedule(
  'cleanup-jobs',
  '0 5 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') 
    || '/functions/v1/cleanup-jobs',
    headers := '{"Authorization": "Bearer " 
    || current_setting("app.anon_key")}'
  )$$
);
