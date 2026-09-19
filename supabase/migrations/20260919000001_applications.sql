-- Migration for applications table and RLS policies

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  job_id uuid REFERENCES live_jobs(id) ON DELETE SET NULL,
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
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
