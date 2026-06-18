DROP POLICY IF EXISTS "Ann: admin write" ON public.announcements;

CREATE POLICY "Ann: admin insert"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Ann: admin update"
  ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Ann: admin delete own"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND author_id = auth.uid());