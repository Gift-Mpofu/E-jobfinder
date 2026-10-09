-- Reschedule the job pipeline crons.
--
-- The live jobs were broken: one called a URL with the project ref still in
-- [brackets], one pointed at the never-deployed ingest-jsearch function, and
-- the daily/categorise/cleanup jobs from earlier migrations read
-- current_setting('app.*') values that hosted Supabase does not have.
--
-- URL and key now come from Supabase Vault. Create them once per project
-- (SQL editor); they are not stored in this repo:
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<anon key>', 'anon_key');

DO $$
DECLARE j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'invoke-adzuna-ingestion', 'invoke-jsearch-ingestion',
    'ingest-adzuna-daily', 'categorise-jobs', 'cleanup-jobs'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END $$;

-- Calls an edge function with the project's anon key.
CREATE OR REPLACE FUNCTION public.invoke_edge_function(fn text, payload jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/' || fn,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key'),
      'Content-Type', 'application/json'
    ),
    body := payload
  );
$$;

REVOKE ALL ON FUNCTION public.invoke_edge_function(text, jsonb) FROM public, anon, authenticated;

-- 04:00 UTC (06:00 SAST): pull new Adzuna listings
SELECT cron.schedule('ingest-adzuna-daily', '0 4 * * *', $$SELECT public.invoke_edge_function('ingest-adzuna')$$);
-- Every 6 hours at :30, so one run follows the morning ingest: tag skills/seniority
SELECT cron.schedule('categorise-jobs', '30 */6 * * *', $$SELECT public.invoke_edge_function('categorise-jobs')$$);
-- 05:00 UTC (07:00 SAST): close stale listings
SELECT cron.schedule('cleanup-jobs', '0 5 * * *', $$SELECT public.invoke_edge_function('cleanup-jobs')$$);
