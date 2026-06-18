
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_project_id_trainer_id_key;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS attempt_number int NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS proposals_one_active_per_trainer
  ON public.proposals(project_id, trainer_id) WHERE status <> 'rejected';

DROP POLICY IF EXISTS "Proposals: trainer update own pending" ON public.proposals;
CREATE POLICY "Proposals: trainer update own pending" ON public.proposals
  FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid() AND status = 'submitted')
  WITH CHECK (trainer_id = auth.uid() AND status = 'submitted');

DROP POLICY IF EXISTS "Proposals: trainer delete own pending" ON public.proposals;
CREATE POLICY "Proposals: trainer delete own pending" ON public.proposals
  FOR DELETE TO authenticated
  USING (trainer_id = auth.uid() AND status = 'submitted');
