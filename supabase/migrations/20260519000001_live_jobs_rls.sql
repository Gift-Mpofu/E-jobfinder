-- Enable RLS on both tables if not already enabled
ALTER TABLE public.live_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_job_actions ENABLE ROW LEVEL SECURITY;

-- Allow logged-in users to read open jobs
CREATE POLICY "Authenticated users can view open jobs"
ON public.live_jobs
FOR SELECT
TO authenticated
USING (status = 'open');

-- Allow users to manage only their own saved job actions
CREATE POLICY "Users manage own job actions"
ON public.user_job_actions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
