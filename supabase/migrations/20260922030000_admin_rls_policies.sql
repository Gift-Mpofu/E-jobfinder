-- Migration to grant full Admin RLS access to giftmpofud@gmail.com across all public tables

-- 1. Profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT
USING (
  LOWER(auth.jwt()->>'email') = 'giftmpofud@gmail.com'
  OR role = 'admin'
  OR auth.uid() = id
);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE
USING (
  LOWER(auth.jwt()->>'email') = 'giftmpofud@gmail.com'
  OR role = 'admin'
  OR auth.uid() = id
);

-- 2. CVs
DROP POLICY IF EXISTS "Admins can view all cvs" ON public.cvs;
CREATE POLICY "Admins can view all cvs" ON public.cvs FOR ALL
USING (
  LOWER(auth.jwt()->>'email') = 'giftmpofud@gmail.com'
  OR auth.uid() = user_id
);

-- 3. Job Descriptions
DROP POLICY IF EXISTS "Admins can view all job_descriptions" ON public.job_descriptions;
CREATE POLICY "Admins can view all job_descriptions" ON public.job_descriptions FOR ALL
USING (
  LOWER(auth.jwt()->>'email') = 'giftmpofud@gmail.com'
  OR auth.uid() = user_id
);

-- 4. Match Results
DROP POLICY IF EXISTS "Admins can view all match_results" ON public.match_results;
CREATE POLICY "Admins can view all match_results" ON public.match_results FOR ALL
USING (
  LOWER(auth.jwt()->>'email') = 'giftmpofud@gmail.com'
  OR auth.uid() = user_id
);
