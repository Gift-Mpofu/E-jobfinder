-- Feedback users leave on a CV scan result (Scanner page "Provide Feedback").
CREATE TABLE IF NOT EXISTS public.scan_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title text,
  match_score integer,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can add own feedback" ON public.scan_feedback;
CREATE POLICY "Users can add own feedback" ON public.scan_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users and admins can read feedback" ON public.scan_feedback;
CREATE POLICY "Users and admins can read feedback" ON public.scan_feedback FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());
