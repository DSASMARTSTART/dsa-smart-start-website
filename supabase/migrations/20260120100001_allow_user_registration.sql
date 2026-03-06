-- ============================================
-- Migration: Allow User Registration
-- ============================================
-- This migration adds the missing INSERT policy for the users table
-- so that new users can register and have their profile created.

-- Drop policy if it exists (safe to run multiple times)
DROP POLICY IF EXISTS "Users can create own profile" ON users;

-- Allow authenticated users to insert their own profile
-- This is needed during the registration flow when AuthContext
-- creates the user profile after Supabase Auth signup succeeds
CREATE POLICY "Users can create own profile" ON users
  FOR INSERT 
  WITH CHECK (auth.uid()::text = id::text);

-- Verify the policy was created
DO $$
BEGIN
  RAISE NOTICE 'User registration policy created successfully';
END $$;
