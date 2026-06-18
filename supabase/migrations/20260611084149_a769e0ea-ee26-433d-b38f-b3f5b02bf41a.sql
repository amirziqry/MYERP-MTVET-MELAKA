
DROP POLICY IF EXISTS "Projects: read published" ON public.projects;
CREATE POLICY "Projects: read published"
ON public.projects FOR SELECT
USING (
  (status NOT IN ('draft','archived'))
  OR public.has_role(auth.uid(), 'admin')
  OR awarded_to = auth.uid()
);

DROP POLICY IF EXISTS "project-details restricted read" ON storage.objects;
CREATE POLICY "project-details restricted read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-details'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = split_part(objects.name, '/', 1)
        AND p.status NOT IN ('draft','archived')
        AND (
          p.awarded_to = auth.uid()
          OR public.has_role(auth.uid(), 'trainer')
        )
    )
  )
);
