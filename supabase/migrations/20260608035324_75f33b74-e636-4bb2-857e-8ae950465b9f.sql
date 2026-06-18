
-- Trainer applications: institution
ALTER TABLE public.trainer_applications ADD COLUMN IF NOT EXISTS institution_name text;

-- Profiles: institution
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution_name text;

-- Projects: closing_date, quota, details_pdf_url
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS closing_date timestamptz;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS quota integer;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS details_pdf_url text;

-- Backfill so NOT NULL can apply
UPDATE public.projects SET closing_date = now() + interval '30 days' WHERE closing_date IS NULL;
UPDATE public.projects SET quota = 1 WHERE quota IS NULL;

ALTER TABLE public.projects ALTER COLUMN closing_date SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN quota SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN quota SET DEFAULT 1;

DO $$ BEGIN
  ALTER TABLE public.projects ADD CONSTRAINT projects_quota_min CHECK (quota >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable scheduling extensions for cron auto-close
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
