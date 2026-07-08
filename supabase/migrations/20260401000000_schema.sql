-- Create profiles table
CREATE TABLE public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  target_role text,
  scans_used integer default 0,
  photo_url text,
  last_active timestamp with time zone,
  role text default 'user',
  status text default 'active',
  location text,
  experience_level text,
  career_goals text,
  skills text[],
  last_scan_reset timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Create cvs table
CREATE TABLE public.cvs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  upload_date timestamp with time zone default now(),
  file_content text not null,
  flagged boolean default false
);

-- Create job_descriptions table
CREATE TABLE public.job_descriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  description_text text not null,
  creation_date timestamp with time zone default now()
);

-- Create match_results table
CREATE TABLE public.match_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  cv_id uuid references public.cvs(id) on delete cascade not null,
  job_description_id uuid references public.job_descriptions(id) on delete cascade not null,
  job_title text not null,
  match_score integer not null,
  analysis_date timestamp with time zone default now(),
  strengths text[],
  missing_keywords text[],
  improvement_suggestions text,
  reasoning text,
  hire_rate_data jsonb
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.cvs enable row level security;
alter table public.job_descriptions enable row level security;
alter table public.match_results enable row level security;

-- Profiles: Users can select, insert, update their own profile. Admin can do all.
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- CVs
create policy "Users can manage own CVs" on public.cvs for all using (auth.uid() = user_id);

-- Job Descriptions
create policy "Users can manage own JDs" on public.job_descriptions for all using (auth.uid() = user_id);

-- Match Results
create policy "Users can manage own match results" on public.match_results for all using (auth.uid() = user_id);

-- Add Admin policies (example logic: admin can bypass RLS, or add literal policies for admin role if desired based on users tracking. By default, Service Role key bypasses RLS for the Admin Panel)
