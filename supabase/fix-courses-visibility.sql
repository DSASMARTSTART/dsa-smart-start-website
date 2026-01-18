-- ============================================
-- DSA Smart Start - Fix Courses Visibility
-- ============================================
-- Run this in Supabase SQL Editor to fix courses not showing

-- Step 1: Check current courses status
SELECT '=== CURRENT COURSES STATUS ===' as section;
SELECT id, title, level, is_published, is_draft, created_at 
FROM courses 
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Check if ANY published courses exist
SELECT '=== PUBLISHED COURSES COUNT ===' as section;
SELECT COUNT(*) as published_count FROM courses WHERE is_published = true;

-- Step 3: Check RLS policies on courses table
SELECT '=== COURSES POLICIES ===' as section;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'courses';

-- Step 4: If there are courses but they're not published, publish them
UPDATE courses 
SET is_published = true, is_draft = false 
WHERE is_published = false;

-- Step 5: Drop and recreate the courses SELECT policy to ensure it works
-- The issue might be that auth.uid() returns NULL for anonymous users
-- and the OR condition might not be evaluated correctly

DROP POLICY IF EXISTS "Anyone can view published courses" ON courses;
DROP POLICY IF EXISTS "Public can view published courses" ON courses;

-- Create a simpler, more explicit policy for public access to published courses
CREATE POLICY "Public can view published courses" ON courses
  FOR SELECT 
  USING (is_published = true);

-- Keep admin policy for full access
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
CREATE POLICY "Admins can manage courses" ON courses
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );

-- Step 6: Verify the policies are correct
SELECT '=== UPDATED POLICIES ===' as section;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'courses';

-- Step 7: Test query - this should return published courses
SELECT '=== TEST QUERY ===' as section;
SELECT id, title, level, is_published, 
       (pricing->>'price')::numeric as price
FROM courses 
WHERE is_published = true
ORDER BY created_at DESC;
