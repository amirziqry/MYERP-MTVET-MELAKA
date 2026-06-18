
-- Claims: insert only if trainer owns an accepted proposal on the project (or is awarded_to)
DROP POLICY IF EXISTS "Claims: trainer insert" ON public.claims;
CREATE POLICY "Claims: trainer insert"
ON public.claims
FOR INSERT
TO authenticated
WITH CHECK (
  trainer_id = auth.uid()
  AND (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.awarded_to = auth.uid())
    OR EXISTS (SELECT 1 FROM public.proposals pr WHERE pr.project_id = claims.project_id AND pr.trainer_id = auth.uid() AND pr.status = 'accepted')
  )
);

-- Claims: trainer can only update their own claims while still pending; admins unrestricted
DROP POLICY IF EXISTS "Claims: trainer update own" ON public.claims;
CREATE POLICY "Claims: trainer update own"
ON public.claims
FOR UPDATE
TO authenticated
USING (
  (trainer_id = auth.uid() AND status = 'pending')
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (trainer_id = auth.uid() AND status = 'pending')
  OR public.has_role(auth.uid(), 'admin')
);

-- Project reports: insert only if trainer owns an accepted proposal on the project (or is awarded_to)
DROP POLICY IF EXISTS "Reports: trainer insert" ON public.project_reports;
CREATE POLICY "Reports: trainer insert"
ON public.project_reports
FOR INSERT
TO authenticated
WITH CHECK (
  trainer_id = auth.uid()
  AND (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.awarded_to = auth.uid())
    OR EXISTS (SELECT 1 FROM public.proposals pr WHERE pr.project_id = project_reports.project_id AND pr.trainer_id = auth.uid() AND pr.status = 'accepted')
  )
);
