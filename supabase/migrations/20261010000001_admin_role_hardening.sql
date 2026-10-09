-- 1. Admin checks go through a SECURITY DEFINER helper. Policies on
--    public.profiles that sub-select public.profiles re-enter their own RLS
--    (Postgres raises "infinite recursion detected in policy"); a definer
--    function reads the table without RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Profiles: users see and edit their own row, admins see and edit all.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_admin());

-- CVs, job descriptions, match results: owner or admin.
DROP POLICY IF EXISTS "Users can manage own CVs" ON public.cvs;
DROP POLICY IF EXISTS "Admins can view all cvs" ON public.cvs;
CREATE POLICY "Admins can view all cvs" ON public.cvs FOR ALL
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can manage own JDs" ON public.job_descriptions;
DROP POLICY IF EXISTS "Admins can view all job_descriptions" ON public.job_descriptions;
CREATE POLICY "Admins can view all job_descriptions" ON public.job_descriptions FOR ALL
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can manage own match results" ON public.match_results;
DROP POLICY IF EXISTS "Admins can view all match_results" ON public.match_results;
CREATE POLICY "Admins can view all match_results" ON public.match_results FOR ALL
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 2. The update policy lets users edit their own row, which included `role`
--    and `status`, so any user could make themselves admin. Only admins (or
--    the service role, where auth.uid() is null) may change those columns.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status)
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change role or status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- New rows inserted by a signed-in user always start as a plain, active user.
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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS default_profile_role ON public.profiles;
CREATE TRIGGER default_profile_role
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.default_profile_role();

-- 3. Any signed-in user could insert rows into live_jobs. Ingestion runs
--    in edge functions with the service role, which bypasses RLS anyway.
DROP POLICY IF EXISTS "Admins can insert live jobs" ON public.live_jobs;
