-- 1. Add new columns to live_jobs
ALTER TABLE public.live_jobs
ADD COLUMN IF NOT EXISTS external_id text UNIQUE,
ADD COLUMN IF NOT EXISTS url text,
ADD COLUMN IF NOT EXISTS salary_min numeric,
ADD COLUMN IF NOT EXISTS salary_max numeric,
ADD COLUMN IF NOT EXISTS posted_at timestamp with time zone;

-- 2. Add partial index on status = 'open'
CREATE INDEX IF NOT EXISTS idx_live_jobs_status_open 
ON public.live_jobs (status) 
WHERE status = 'open';

-- 3. Create user_job_actions table to support the Saved Jobs tab
CREATE TABLE IF NOT EXISTS public.user_job_actions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  job_id uuid references public.live_jobs(id) on delete cascade not null,
  action_type text not null, -- 'saved', 'applied', etc.
  created_at timestamp with time zone default now(),
  UNIQUE(user_id, job_id, action_type)
);

-- Enable RLS on user_job_actions
ALTER TABLE public.user_job_actions ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own saved jobs
CREATE POLICY "Users can view own job actions" 
  ON public.user_job_actions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own job actions" 
  ON public.user_job_actions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own job actions" 
  ON public.user_job_actions FOR DELETE 
  USING (auth.uid() = user_id);
