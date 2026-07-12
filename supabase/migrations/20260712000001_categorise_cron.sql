SELECT cron.schedule(
  'categorise-jobs',
  '30 */6 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/categorise-jobs',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.anon_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);
