
-- 1. Profiles: remove overly broad read policy
DROP POLICY IF EXISTS "Profiles: trainers visible to all auth" ON public.profiles;

-- 2. user_roles: explicit admin-only write policies
DROP POLICY IF EXISTS "Roles: admin insert" ON public.user_roles;
DROP POLICY IF EXISTS "Roles: admin update" ON public.user_roles;
DROP POLICY IF EXISTS "Roles: admin delete" ON public.user_roles;

CREATE POLICY "Roles: admin insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Roles: admin update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Roles: admin delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Revoke EXECUTE on trigger-only SECURITY DEFINER functions from end-users
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
