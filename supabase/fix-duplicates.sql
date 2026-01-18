-- ============================================
-- FIX: Duplicate Progress Tables
-- ============================================
-- You have both 'progress' and 'user_progress' tables
-- The codebase uses 'progress', so we need to:
-- 1. Check if user_progress has any data
-- 2. Migrate data if needed
-- 3. Drop the duplicate table

-- ============================================
-- STEP 1: Check row counts in both tables
-- ============================================
SELECT 'progress' as table_name, COUNT(*) as row_count FROM progress
UNION ALL
SELECT 'user_progress' as table_name, COUNT(*) as row_count FROM user_progress;

-- ============================================
-- STEP 2: If user_progress has data, migrate it
-- ============================================
-- Only run this if user_progress has rows you want to keep:
/*
INSERT INTO progress (user_id, course_id, lesson_id, homework_id, is_completed, completed_at)
SELECT user_id, course_id, lesson_id, homework_id, is_completed, completed_at
FROM user_progress
ON CONFLICT (user_id, course_id, lesson_id, homework_id) DO NOTHING;
*/

-- ============================================
-- STEP 3: Drop the duplicate table and its policies
-- ============================================
-- Run these AFTER confirming data is migrated (or if user_progress is empty):

DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP TABLE IF EXISTS user_progress;

-- ============================================
-- STEP 4: Clean up extra course policies
-- ============================================
DROP POLICY IF EXISTS "Anyone can read published courses" ON courses;
DROP POLICY IF EXISTS "Authenticated users full access" ON courses;

-- ============================================
-- STEP 5: Verify cleanup
-- ============================================
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
