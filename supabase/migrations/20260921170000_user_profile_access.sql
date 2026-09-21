BEGIN;
-- Live teacher/admin permissions are meaningful only if a user cannot bootstrap
-- their own elevated role, and public directory access must not expose emails.
DROP POLICY IF EXISTS "Public read access for users" ON public.users;
CREATE OR REPLACE FUNCTION public.is_admin_or_editor() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND role IN ('admin','editor') AND status='active');
$$;
CREATE FUNCTION public.is_active_administrator() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND role='admin' AND status='active');
$$;
CREATE FUNCTION public.safe_user_profile_create(p_id uuid,p_email text,p_role text,p_status text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT p_id=auth.uid() AND p_role='student' AND p_status='active' AND
 EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND lower(email)=lower(p_email));
$$;
REVOKE ALL ON FUNCTION public.is_active_administrator(),public.safe_user_profile_create(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_active_administrator(),public.safe_user_profile_create(uuid,text,text,text) TO authenticated;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" ON public.users FOR ALL TO authenticated
 USING (is_active_administrator()) WITH CHECK (is_active_administrator());
DROP POLICY IF EXISTS "Users can create own profile" ON public.users;
CREATE POLICY "Users can create own profile" ON public.users FOR INSERT TO authenticated
 WITH CHECK (safe_user_profile_create(id,email,role,status));
-- The existing own-profile SELECT/UPDATE policies remain in place. Editors retain
-- read access through is_admin_or_editor(), but role changes require an admin.
COMMIT;
