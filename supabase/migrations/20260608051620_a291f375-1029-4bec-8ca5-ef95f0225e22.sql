-- Tighten storage INSERT policy to verify project eligibility for sensitive buckets
DROP POLICY IF EXISTS "Auth upload own folder" ON storage.objects;

-- Uploads to trainer-credentials and project-proposals: folder-owner check is sufficient
CREATE POLICY "Auth upload own folder basic" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = ANY (ARRAY['trainer-credentials'::text, 'project-proposals'::text])
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Uploads to claim-invoices: must own folder AND have accepted proposal or awarded project
-- Path convention: <trainer_id>/<project_id>/...
CREATE POLICY "Claim invoices upload eligible" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'claim-invoices'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.awarded_to = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.proposals pr
      WHERE pr.project_id::text = (storage.foldername(name))[2]
        AND pr.trainer_id = auth.uid()
        AND pr.status = 'accepted'::proposal_status
    )
  )
);

-- Uploads to project-reports: same eligibility rules
CREATE POLICY "Project reports upload eligible" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-reports'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.awarded_to = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.proposals pr
      WHERE pr.project_id::text = (storage.foldername(name))[2]
        AND pr.trainer_id = auth.uid()
        AND pr.status = 'accepted'::proposal_status
    )
  )
);