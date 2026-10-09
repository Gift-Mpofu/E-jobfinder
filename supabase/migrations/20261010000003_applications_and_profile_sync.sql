-- Catch-up for the live database: these earlier migrations were never
-- applied there (20260919000001_applications, 20260922020000_sync_profiles).

-- Applications logged from Auto Apply (Find Jobs) and shown on Profile.
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.live_jobs(id) ON DELETE SET NULL,
  job_title text,
  company text,
  cover_letter_used text,
  status text DEFAULT 'applied'
    CHECK (status IN ('applied','responded','interview','rejected','offer')),
  applied_at timestamptz DEFAULT now(),
  notes text
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own applications" ON public.applications;
CREATE POLICY "Users own applications"
ON public.applications FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid());

-- Keep public.profiles in step with auth.users (email, name, avatar).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, photo_url, last_active, role, status)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    now(),
    'user',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    photo_url = COALESCE(public.profiles.photo_url, EXCLUDED.photo_url);
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill: profiles for existing users that have none, and missing emails.
INSERT INTO public.profiles (id, email, last_active, role, status)
SELECT u.id, u.email, now(), 'user', 'active'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');
