-- Create live_jobs table for aggregated public job listings
CREATE TABLE public.live_jobs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  company text not null,
  location text,
  description_text text not null,
  skills_required text[],
  seniority text,
  salary_range text,
  status text default 'open',
  source text default 'internal',
  creation_date timestamp with time zone default now()
);

-- Note: In a production App with generic public read access, an RLS policy is vital.
alter table public.live_jobs enable row level security;

-- Public jobs should be readable by any authenticated user
create policy "Anyone authenticated can view live jobs" 
  on public.live_jobs for select 
  using (auth.role() = 'authenticated');

-- Only admins (or service role) should be able to insert/update. 
-- For now we allow authenticated inserts for demo seeding purposess if admin RLS isn't fully defined.
create policy "Admins can insert live jobs" 
  on public.live_jobs for insert 
  with check (auth.role() = 'authenticated');

INSERT INTO public.live_jobs (title, company, location, description_text, skills_required, seniority, salary_range) VALUES 
('Senior Frontend Engineer', 'TechFlow Solutions', 'Remote (US)', 'We are looking for an experienced Frontend Engineer...', ARRAY['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Redux'], 'Senior', '120,000 - 150,000'),
('Full Stack Web Developer', 'InnovateX', 'New York, NY (Hybrid)', 'Join our agile team to build dynamic web applications...', ARRAY['JavaScript', 'Node.js', 'React', 'PostgreSQL', 'Express'], 'Mid-Level', '100,000 - 130,000'),
('Backend Systems Engineer', 'CloudScale', 'Remote', 'Scale our cloud infrastructure to support millions of daily active users...', ARRAY['Go', 'Python', 'AWS', 'Kubernetes', 'PostgreSQL'], 'Senior', '140,000 - 180,000');