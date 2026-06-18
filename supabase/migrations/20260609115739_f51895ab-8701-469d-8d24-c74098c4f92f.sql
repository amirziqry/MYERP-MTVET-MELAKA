
-- 1. Proposal number
CREATE SEQUENCE IF NOT EXISTS public.proposals_number_seq;

ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS proposal_number TEXT;

CREATE OR REPLACE FUNCTION public.set_proposal_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.proposal_number IS NULL OR NEW.proposal_number = '' THEN
    NEW.proposal_number := 'MTVET-' || EXTRACT(YEAR FROM now())::int || '-' ||
      LPAD(nextval('public.proposals_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_proposal_number ON public.proposals;
CREATE TRIGGER trg_set_proposal_number
BEFORE INSERT ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.set_proposal_number();

-- Backfill existing rows in created_at order
DO $$
DECLARE
  r RECORD;
  yr INT;
BEGIN
  FOR r IN SELECT id, created_at FROM public.proposals WHERE proposal_number IS NULL ORDER BY created_at ASC LOOP
    yr := EXTRACT(YEAR FROM r.created_at)::int;
    UPDATE public.proposals
       SET proposal_number = 'MTVET-' || yr || '-' || LPAD(nextval('public.proposals_number_seq')::text, 4, '0')
     WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.proposals ALTER COLUMN proposal_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS proposals_proposal_number_key ON public.proposals(proposal_number);

-- 2. pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 3. app_config table
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role / SECURITY DEFINER funcs can read.

INSERT INTO public.app_config(key, value) VALUES
  ('notification_function_url', 'https://vzaujbxnwjchntutwzgl.supabase.co/functions/v1/send-notification'),
  ('notification_hook_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- 4. Helper to call edge function asynchronously
CREATE OR REPLACE FUNCTION public.notify_email(event_name TEXT, record_payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  url TEXT;
  secret TEXT;
BEGIN
  SELECT value INTO url FROM public.app_config WHERE key = 'notification_function_url';
  SELECT value INTO secret FROM public.app_config WHERE key = 'notification_hook_secret';

  IF url IS NULL OR secret IS NULL THEN
    RETURN;
  END IF;

  PERFORM extensions.http_post(
    url := url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Notification-Secret', secret
    ),
    body := jsonb_build_object('event', event_name, 'record', record_payload)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_email failed: %', SQLERRM;
END;
$$;

-- 5. Triggers
-- trainer_applications: pending -> approved
CREATE OR REPLACE FUNCTION public.trg_trainer_application_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    PERFORM public.notify_email('application_approved', to_jsonb(NEW));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_trainer_application_approved ON public.trainer_applications;
CREATE TRIGGER trg_trainer_application_approved
AFTER UPDATE ON public.trainer_applications
FOR EACH ROW EXECUTE FUNCTION public.trg_trainer_application_approved();

-- projects: draft -> open
CREATE OR REPLACE FUNCTION public.trg_project_opened()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = 'draft' AND NEW.status = 'open' THEN
    PERFORM public.notify_email('project_opened', to_jsonb(NEW));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_project_opened ON public.projects;
CREATE TRIGGER trg_project_opened
AFTER UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.trg_project_opened();

-- proposals: insert
CREATE OR REPLACE FUNCTION public.trg_proposal_submitted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_email('proposal_submitted', to_jsonb(NEW));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_proposal_submitted ON public.proposals;
CREATE TRIGGER trg_proposal_submitted
AFTER INSERT ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.trg_proposal_submitted();

-- proposals: status change to accepted/rejected
CREATE OR REPLACE FUNCTION public.trg_proposal_decided()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('accepted','rejected') AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.notify_email('proposal_decided', to_jsonb(NEW));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_proposal_decided ON public.proposals;
CREATE TRIGGER trg_proposal_decided
AFTER UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.trg_proposal_decided();
