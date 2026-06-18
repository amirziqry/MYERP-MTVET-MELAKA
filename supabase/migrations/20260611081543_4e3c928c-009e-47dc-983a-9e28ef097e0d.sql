DROP POLICY IF EXISTS "project-details auth read" ON storage.objects;

CREATE POLICY "project-details restricted read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-details'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = split_part(storage.objects.name, '/', 1)
        AND p.status <> 'draft'
    )
  )
);