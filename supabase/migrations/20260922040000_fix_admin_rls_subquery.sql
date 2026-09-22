-- Migration to fix Admin RLS subquery evaluation and backfill legacy profile emails

-- 1. Profiles: Grant SELECT and UPDATE to requesting admin (auth.uid())
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (LOWER(p.email) = 'giftmpofud@gmail.com' OR p.role = 'admin')
  )
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (LOWER(p.email) = 'giftmpofud@gmail.com' OR p.role = 'admin')
  )
);

-- 2. CVs
DROP POLICY IF EXISTS "Users can manage own CVs" ON public.cvs;
DROP POLICY IF EXISTS "Admins can view all cvs" ON public.cvs;
CREATE POLICY "Admins can view all cvs" ON public.cvs FOR ALL
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (LOWER(p.email) = 'giftmpofud@gmail.com' OR p.role = 'admin')
  )
);

-- 3. Job Descriptions
DROP POLICY IF EXISTS "Users can manage own JDs" ON public.job_descriptions;
DROP POLICY IF EXISTS "Admins can view all job_descriptions" ON public.job_descriptions;
CREATE POLICY "Admins can view all job_descriptions" ON public.job_descriptions FOR ALL
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (LOWER(p.email) = 'giftmpofud@gmail.com' OR p.role = 'admin')
  )
);

-- 4. Match Results
DROP POLICY IF EXISTS "Users can manage own match results" ON public.match_results;
DROP POLICY IF EXISTS "Admins can view all match_results" ON public.match_results;
CREATE POLICY "Admins can view all match_results" ON public.match_results FOR ALL
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (LOWER(p.email) = 'giftmpofud@gmail.com' OR p.role = 'admin')
  )
);

-- 5. Backfill any existing NULL or empty email fields in public.profiles from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');
