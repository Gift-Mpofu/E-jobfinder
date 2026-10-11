-- Enforce the weekly free-scan limit in the database instead of the browser.
--
-- consume_scan() is called by the scanner server action before each AI scan.
-- It resets the counter at the start of each week (Monday, SAST), refuses
-- once the limit is reached (admins are exempt) and otherwise counts the scan,
-- all under a row lock. When the AI call itself fails the server action gives
-- the scan back using the service role.

CREATE OR REPLACE FUNCTION public.consume_scan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  weekly_limit constant integer := 20; -- keep in sync with WEEKLY_SCAN_LIMIT in src/ai/require-user.ts
  week_start timestamptz := date_trunc('week', now() AT TIME ZONE 'Africa/Johannesburg') AT TIME ZONE 'Africa/Johannesburg';
  p public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  PERFORM set_config('app.scan_counter', 'on', true);

  IF p.last_scan_reset IS NULL OR p.last_scan_reset < week_start THEN
    UPDATE public.profiles SET scans_used = 0, last_scan_reset = now() WHERE id = p.id;
    p.scans_used := 0;
  END IF;

  IF p.role IS DISTINCT FROM 'admin' AND coalesce(p.scans_used, 0) >= weekly_limit THEN
    RETURN jsonb_build_object('allowed', false, 'scans_used', p.scans_used, 'limit', weekly_limit);
  END IF;

  UPDATE public.profiles SET scans_used = coalesce(scans_used, 0) + 1 WHERE id = p.id;
  RETURN jsonb_build_object('allowed', true, 'scans_used', coalesce(p.scans_used, 0) + 1, 'limit', weekly_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_scan() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.consume_scan() TO authenticated;

-- Users may still edit their own profile, but not the scan counter (or role
-- and status). Only the functions above, admins and the service role can.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Only admins can change role or status';
  END IF;

  IF (NEW.scans_used IS DISTINCT FROM OLD.scans_used OR NEW.last_scan_reset IS DISTINCT FROM OLD.last_scan_reset)
     AND coalesce(current_setting('app.scan_counter', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Scan usage can only change through a scan';
  END IF;

  RETURN NEW;
END;
$$;

-- Profiles a user creates for themselves start with a clean counter.
CREATE OR REPLACE FUNCTION public.default_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.role := 'user';
    NEW.status := 'active';
    NEW.scans_used := 0;
    NEW.last_scan_reset := NULL;
  END IF;
  RETURN NEW;
END;
$$;
