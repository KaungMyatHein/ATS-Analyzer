-- Supabase tables for Resume Builder
BEGIN;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  password_hash text NOT NULL,
  gemini_api_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resumes (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Resume',
  data text NOT NULL DEFAULT '{}',
  settings text NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id);

CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company text NOT NULL,
  position text NOT NULL,
  link text,
  jd text NOT NULL,
  result text NOT NULL DEFAULT '{}',
  match_score integer,
  match_score_flex integer,
  match_score_phrase integer,
  status text NOT NULL DEFAULT 'pending',
  applied_at timestamptz,
  variant_resume_id uuid REFERENCES public.resumes(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);

COMMIT;

