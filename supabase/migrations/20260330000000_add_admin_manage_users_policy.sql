-- ============================================
-- FIX: Admin cannot change user roles
-- Date: 2026-03-30
--
-- Root cause: The "Admins can manage all users" RLS policy was defined
-- in schema.sql but never applied via a migration. Without it, admin
-- UPDATE operations on other users' rows silently match 0 rows.
-- ============================================

-- Drop if exists to make this migration idempotent
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Allow admins and editors full access to all user rows
CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );
