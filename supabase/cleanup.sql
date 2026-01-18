-- ============================================
-- DSA Smart Start - Cleanup Script
-- ============================================
-- Run this to fix mismatches between schema and actual database
-- Review each section before running!

-- ============================================
-- 1. FIX TABLE NAME: user_progress → progress
-- ============================================
-- Option A: Rename the table (if you want to use 'progress')
-- Uncomment below if user_progress exists and you want to rename it:

-- ALTER TABLE IF EXISTS user_progress RENAME TO progress;

-- Option B: If you prefer to keep 'user_progress', update the codebase instead
-- (skip this section)

-- ============================================
-- 2. CLEAN UP EXTRA COURSE POLICIES
-- ============================================
-- Remove the extra/misnamed policies on courses table

DROP POLICY IF EXISTS "Anyone can read published courses" ON courses;
DROP POLICY IF EXISTS "Authenticated users full access" ON courses;

-- Now create the correct policies (from schema.sql)
DROP POLICY IF EXISTS "Anyone can view published courses" ON courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;

CREATE POLICY "Anyone can view published courses" ON courses
  FOR SELECT USING (is_published = true OR 
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins can manage courses" ON courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );

-- ============================================
-- 3. FIX PROGRESS TABLE POLICIES
-- ============================================
-- If table is named 'progress', run these:

-- First clean up any existing
DROP POLICY IF EXISTS "Users can view own progress" ON progress;
DROP POLICY IF EXISTS "Users can update own progress" ON progress;
DROP POLICY IF EXISTS "Users can modify own progress" ON progress;

-- Create correct policies
CREATE POLICY "Users can view own progress" ON progress
  FOR SELECT USING (user_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Users can update own progress" ON progress
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can modify own progress" ON progress
  FOR UPDATE USING (user_id::text = auth.uid()::text);

-- ============================================
-- 4. IF USING user_progress (alternative)
-- ============================================
-- If you kept the table as 'user_progress', run these instead:
-- (Comment out section 3 above first)

/*
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can modify own progress" ON user_progress;

CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (user_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Users can update own progress" ON user_progress
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can modify own progress" ON user_progress
  FOR UPDATE USING (user_id::text = auth.uid()::text);
*/

-- ============================================
-- 5. VERIFY AFTER RUNNING
-- ============================================
-- Run this to see current state:
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
