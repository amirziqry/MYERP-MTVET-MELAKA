DROP TRIGGER IF EXISTS trg_trainer_application_approved ON public.trainer_applications;
DROP TRIGGER IF EXISTS trg_project_opened ON public.projects;
DROP TRIGGER IF EXISTS trg_proposal_submitted ON public.proposals;
DROP TRIGGER IF EXISTS trg_proposal_decided ON public.proposals;

DROP FUNCTION IF EXISTS public.trg_trainer_application_approved();
DROP FUNCTION IF EXISTS public.trg_project_opened();
DROP FUNCTION IF EXISTS public.trg_proposal_submitted();
DROP FUNCTION IF EXISTS public.trg_proposal_decided();
DROP FUNCTION IF EXISTS public.notify_email(text, jsonb);