
-- 1. Prevent role escalation via profiles self-update
DROP POLICY IF EXISTS "Profiles: self update" ON public.profiles;

CREATE POLICY "Profiles: self update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
);

CREATE POLICY "Profiles: admin update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Admin delete on claims
CREATE POLICY "Claims: admin delete"
ON public.claims
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Admin delete on proposals
CREATE POLICY "Proposals: admin delete"
ON public.proposals
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
