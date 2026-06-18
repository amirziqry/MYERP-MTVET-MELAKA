
-- 1) Tighten project-details storage read policy
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
        AND p.status <> 'draft'
        AND (
          p.awarded_to = auth.uid()
          OR public.has_role(auth.uid(), 'trainer')
        )
    )
  )
);

-- 2) Realtime messages: restrict subscriptions to topics scoped to the user's own id
DROP POLICY IF EXISTS "Users read own-topic realtime messages" ON realtime.messages;
CREATE POLICY "Users read own-topic realtime messages"
ON realtime.messages FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR realtime.topic() LIKE '%' || auth.uid()::text || '%'
);

DROP POLICY IF EXISTS "Users write own-topic realtime messages" ON realtime.messages;
CREATE POLICY "Users write own-topic realtime messages"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR realtime.topic() LIKE '%' || auth.uid()::text || '%'
);
