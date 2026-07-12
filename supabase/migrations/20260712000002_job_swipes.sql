-- Job swipe history for tinder-style job discovery
CREATE TABLE IF NOT EXISTS public.job_swipes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  job_id uuid REFERENCES public.live_jobs(id) ON DELETE CASCADE NOT NULL,
  direction text NOT NULL CHECK (direction IN ('left', 'right')),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, job_id)
);

ALTER TABLE public.job_swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own swipes"
  ON public.job_swipes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS job_swipes_user_id_idx ON public.job_swipes (user_id);
