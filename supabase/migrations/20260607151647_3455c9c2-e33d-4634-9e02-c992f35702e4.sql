
-- Authenticated can upload to own folder (first path segment = user id) in all 4 buckets
CREATE POLICY "Auth upload own folder" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('trainer-credentials','project-proposals','project-reports','claim-invoices')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated can read their own files in all 4 buckets
CREATE POLICY "Auth read own files" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('trainer-credentials','project-proposals','project-reports','claim-invoices')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins read everything in these buckets
CREATE POLICY "Admin read all bucket files" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('trainer-credentials','project-proposals','project-reports','claim-invoices')
  AND public.has_role(auth.uid(), 'admin')
);

-- Update/delete own
CREATE POLICY "Auth update own files" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('trainer-credentials','project-proposals','project-reports','claim-invoices')
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Auth delete own files" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('trainer-credentials','project-proposals','project-reports','claim-invoices')
  AND (storage.foldername(name))[1] = auth.uid()::text
);
