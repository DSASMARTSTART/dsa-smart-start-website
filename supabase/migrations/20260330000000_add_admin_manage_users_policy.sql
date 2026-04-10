-- ============================================
-- FIX: Admin cannot change user roles
-- Date: 2026-03-30
--
-- Root cause: The "Admins can manage all users" RLS policy was defined
-- in schema.sql but never applied via a migration. Without it, admin
-- UPDATE operations on other users' rows silently match 0 rows.
--
-- The naive approach (EXISTS subquery on users inside a users policy)
-- causes infinite recursion → HTTP 500 on every query.
-- Fix: use a SECURITY DEFINER function that bypasses RLS.
-- ============================================

-- Step 1: Create a SECURITY DEFINER helper (bypasses RLS, no recursion)
CREATE OR REPLACE FUNCTION public.is_admin_or_editor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text
    AND role IN ('admin', 'editor')
  );
$$;

-- Step 2: Drop the old (broken) policy if it exists
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Step 3: Recreate using the safe function
CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (public.is_admin_or_editor());
