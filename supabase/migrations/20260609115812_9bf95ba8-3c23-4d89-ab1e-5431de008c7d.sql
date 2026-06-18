
REVOKE EXECUTE ON FUNCTION public.notify_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_trainer_application_approved() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_project_opened() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_proposal_submitted() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_proposal_decided() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_proposal_number() FROM PUBLIC, anon, authenticated;
