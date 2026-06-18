
-- Storage policies for project-details bucket
CREATE POLICY "project-details admin write"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'project-details' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'project-details' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "project-details auth read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-details');

-- Function to auto-award expired open projects + reject pending proposals
CREATE OR REPLACE FUNCTION public.close_expired_projects()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.proposals
     SET status = 'rejected'
   WHERE status = 'submitted'
     AND project_id IN (
       SELECT id FROM public.projects
        WHERE status = 'open' AND closing_date < now()
     );

  UPDATE public.projects
     SET status = 'awarded'
   WHERE status = 'open' AND closing_date < now();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.close_expired_projects() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_expired_projects() TO service_role;
