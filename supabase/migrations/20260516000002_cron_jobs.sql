-- Enable the pg_cron extension if it is not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable the pg_net extension to allow making HTTP POST requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Note for the engineer:
-- You MUST update the URL 'https://[PROJECT-REF].supabase.co' in the cron jobs below 
-- with your actual Supabase project reference URL before running this in production.
-- The authorization header also requires your anon or service_role key to invoke the functions.
-- For local development, this URL might be http://host.docker.internal:54321, 
-- but in production it will be your edge function URL.

-- Schedule Adzuna ingestion at minute 0 every 6 hours (0 0,6,12,18 * * *)
SELECT cron.schedule(
  'invoke-adzuna-ingestion',
  '0 0,6,12,18 * * *',
  $$
  SELECT net.http_post(
      url:='https://[PROJECT-REF].supabase.co/functions/v1/ingest-adzuna',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer [ANON_OR_SERVICE_ROLE_KEY]"}'::jsonb,
      body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Schedule JSearch ingestion at minute 30 every 6 hours (30 0,6,12,18 * * *)
SELECT cron.schedule(
  'invoke-jsearch-ingestion',
  '30 0,6,12,18 * * *',
  $$
  SELECT net.http_post(
      url:='https://[PROJECT-REF].supabase.co/functions/v1/ingest-jsearch',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer [ANON_OR_SERVICE_ROLE_KEY]"}'::jsonb,
      body:='{}'::jsonb
  ) as request_id;
  $$
);
