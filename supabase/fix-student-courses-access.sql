-- ============================================
-- DSA Smart Start - Fix Student Courses Access
-- ============================================
-- Run this in Supabase SQL Editor to fix courses not showing for logged-in students

-- Step 1: Check current policies
SELECT '=== CURRENT COURSES POLICIES ===' as section;
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'courses';

-- Step 2: Check if there are any published courses
SELECT '=== PUBLISHED COURSES ===' as section;
SELECT id, title, level, is_published 
FROM courses 
WHERE is_published = true;

-- Step 3: Drop all existing courses policies and recreate them properly
DROP POLICY IF EXISTS "Anyone can view published courses" ON courses;
DROP POLICY IF EXISTS "Public can view published courses" ON courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
DROP POLICY IF EXISTS "Students can view published courses" ON courses;

-- Step 4: Create a policy that allows EVERYONE (anon + authenticated) to view published courses
-- This policy explicitly uses TRUE for published courses regardless of auth status
CREATE POLICY "Anyone can view published courses" ON courses
  FOR SELECT 
  USING (is_published = true);

-- Step 5: Create separate policy for admins/editors to view ALL courses and manage them
CREATE POLICY "Admins can view all courses" ON courses
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins can insert courses" ON courses
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins can update courses" ON courses
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins can delete courses" ON courses
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );

-- Step 6: Verify the new policies
SELECT '=== NEW POLICIES ===' as section;
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'courses';

-- Step 7: Test that published courses are accessible
SELECT '=== TEST: Published courses should show ===' as section;
SELECT id, title, level, is_published
FROM courses
WHERE is_published = true
ORDER BY created_at DESC;
