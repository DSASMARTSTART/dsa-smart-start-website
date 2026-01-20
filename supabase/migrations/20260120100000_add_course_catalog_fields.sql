-- ============================================
-- Migration: Add Course Catalog Fields
-- Date: 2026-01-20
-- Description: Adds product type, audience, e-book, footer, and marketing fields to courses
-- ============================================

-- Step 1: Remove the restrictive level CHECK constraint
-- First, drop the old constraint
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_level_check;

-- Add new constraint with all valid levels
ALTER TABLE courses ADD CONSTRAINT courses_level_check 
  CHECK (level IN (
    'A1', 'A2', 'B1', 'B2',  -- Adults & Teens levels
    'kids-basic', 'kids-medium', 'kids-advanced', 'Kids',  -- Kids levels (including legacy 'Kids')
    'premium', 'golden', 'Premium', 'Gold'  -- Service programs (including legacy naming)
  ) OR level ~ '^[a-z0-9-]+$');  -- Allow any lowercase slug format for custom categories

-- Step 2: Add product type fields (if not exists)
DO $$ 
BEGIN
  -- Product Type: ebook, learndash (interactive), service (online/live)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'product_type') THEN
    ALTER TABLE courses ADD COLUMN product_type TEXT NOT NULL DEFAULT 'learndash' CHECK (product_type IN ('ebook', 'learndash', 'service'));
  END IF;

  -- Target Audience: adults_teens or kids
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'target_audience') THEN
    ALTER TABLE courses ADD COLUMN target_audience TEXT NOT NULL DEFAULT 'adults_teens' CHECK (target_audience IN ('adults_teens', 'kids'));
  END IF;

  -- Content Format: pdf, interactive, live, hybrid
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'content_format') THEN
    ALTER TABLE courses ADD COLUMN content_format TEXT NOT NULL DEFAULT 'interactive' CHECK (content_format IN ('pdf', 'interactive', 'live', 'hybrid'));
  END IF;

  -- Teaching Materials Price (for services)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'teaching_materials_price') THEN
    ALTER TABLE courses ADD COLUMN teaching_materials_price DECIMAL(10, 2);
  END IF;

  -- Teaching Materials Included (user's choice at checkout)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'teaching_materials_included') THEN
    ALTER TABLE courses ADD COLUMN teaching_materials_included BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Related Materials ID (links service to its materials product)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'related_materials_id') THEN
    ALTER TABLE courses ADD COLUMN related_materials_id UUID REFERENCES courses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Add E-book specific fields
DO $$ 
BEGIN
  -- E-book PDF URL (can be Supabase Storage or external like Google Drive)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'ebook_pdf_url') THEN
    ALTER TABLE courses ADD COLUMN ebook_pdf_url TEXT;
  END IF;

  -- E-book Page Count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'ebook_page_count') THEN
    ALTER TABLE courses ADD COLUMN ebook_page_count INTEGER;
  END IF;
END $$;

-- Step 4: Add Footer visibility fields
DO $$ 
BEGIN
  -- Show in Footer (whether to display in footer links)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'show_in_footer') THEN
    ALTER TABLE courses ADD COLUMN show_in_footer BOOLEAN NOT NULL DEFAULT true;
  END IF;

  -- Footer Order (sort order in footer, lower = first)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'footer_order') THEN
    ALTER TABLE courses ADD COLUMN footer_order INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Step 5: Add Marketing/Extended fields
DO $$ 
BEGIN
  -- Learning Outcomes (array of strings)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'learning_outcomes') THEN
    ALTER TABLE courses ADD COLUMN learning_outcomes JSONB DEFAULT '[]';
  END IF;

  -- Prerequisites (array of strings)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'prerequisites') THEN
    ALTER TABLE courses ADD COLUMN prerequisites JSONB DEFAULT '[]';
  END IF;

  -- Target Audience Info (detailed description + points)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'target_audience_info') THEN
    ALTER TABLE courses ADD COLUMN target_audience_info JSONB;
  END IF;

  -- Instructor Info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'instructor') THEN
    ALTER TABLE courses ADD COLUMN instructor JSONB;
  END IF;

  -- Estimated Weekly Hours
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'estimated_weekly_hours') THEN
    ALTER TABLE courses ADD COLUMN estimated_weekly_hours INTEGER;
  END IF;

  -- Preview Video URL
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'preview_video_url') THEN
    ALTER TABLE courses ADD COLUMN preview_video_url TEXT;
  END IF;

  -- Total Students Enrolled (cached count for performance)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'total_students_enrolled') THEN
    ALTER TABLE courses ADD COLUMN total_students_enrolled INTEGER DEFAULT 0;
  END IF;
END $$;

-- Step 6: Add Syllabus Content field for dynamic syllabus
DO $$ 
BEGIN
  -- Syllabus Content (stores units, topics, learning outcomes for syllabus page)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'syllabus_content') THEN
    ALTER TABLE courses ADD COLUMN syllabus_content JSONB;
  END IF;
END $$;

-- Step 7: Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_courses_product_type ON courses(product_type);
CREATE INDEX IF NOT EXISTS idx_courses_target_audience ON courses(target_audience);
CREATE INDEX IF NOT EXISTS idx_courses_show_in_footer ON courses(show_in_footer);
CREATE INDEX IF NOT EXISTS idx_courses_footer_order ON courses(footer_order);

-- Step 8: Add teaching_materials_included to purchases table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'teaching_materials_included') THEN
    ALTER TABLE purchases ADD COLUMN teaching_materials_included BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'teaching_materials_price') THEN
    ALTER TABLE purchases ADD COLUMN teaching_materials_price DECIMAL(10, 2);
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN courses.product_type IS 'Type of product: ebook (PDF), learndash (interactive course), service (live online course)';
COMMENT ON COLUMN courses.target_audience IS 'Who the course is for: adults_teens or kids';
COMMENT ON COLUMN courses.content_format IS 'How content is delivered: pdf, interactive, live, or hybrid';
COMMENT ON COLUMN courses.ebook_pdf_url IS 'URL to e-book PDF file (Supabase Storage or external)';
COMMENT ON COLUMN courses.show_in_footer IS 'Whether to display this course in the footer navigation';
COMMENT ON COLUMN courses.footer_order IS 'Sort order in footer (lower numbers appear first)';
COMMENT ON COLUMN courses.syllabus_content IS 'JSON containing syllabus units, topics, and learning outcomes for the syllabus page';
