-- ============================================
-- CATALOG MIGRATION: Products & Services Structure
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Add new columns to courses table
-- ============================================

-- Add product_type column to distinguish between e-books, learndash courses, and services
ALTER TABLE courses ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'learndash';

-- Add target_audience column to distinguish between adults/teens and kids
ALTER TABLE courses ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'adults_teens';

-- Add content_format column for different content structures (pdf for ebooks, interactive for learndash, live for services)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS content_format TEXT DEFAULT 'interactive';

-- Add teaching_materials_price for services that include optional materials
ALTER TABLE courses ADD COLUMN IF NOT EXISTS teaching_materials_price DECIMAL(10,2) DEFAULT NULL;

-- Add teaching_materials_included flag (user choice at checkout)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS teaching_materials_included BOOLEAN DEFAULT false;

-- Add related_materials_id to link to the corresponding e-book/materials product
ALTER TABLE courses ADD COLUMN IF NOT EXISTS related_materials_id UUID REFERENCES courses(id) DEFAULT NULL;

-- ============================================
-- STEP 2: Add CHECK constraints for new columns
-- ============================================

-- Constraint for product_type
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_product_type_check;
ALTER TABLE courses ADD CONSTRAINT courses_product_type_check 
  CHECK (product_type IN ('ebook', 'learndash', 'service'));

-- Constraint for target_audience
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_target_audience_check;
ALTER TABLE courses ADD CONSTRAINT courses_target_audience_check 
  CHECK (target_audience IN ('adults_teens', 'kids'));

-- Constraint for content_format
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_content_format_check;
ALTER TABLE courses ADD CONSTRAINT courses_content_format_check 
  CHECK (content_format IN ('pdf', 'interactive', 'live', 'hybrid'));

-- ============================================
-- STEP 3: Create indexes for new columns
-- ============================================

CREATE INDEX IF NOT EXISTS idx_courses_product_type ON courses(product_type);
CREATE INDEX IF NOT EXISTS idx_courses_target_audience ON courses(target_audience);
CREATE INDEX IF NOT EXISTS idx_courses_content_format ON courses(content_format);

-- ============================================
-- STEP 4: Update categories table with new structure
-- ============================================

-- First, clear existing categories (be careful in production!)
DELETE FROM categories WHERE slug IN ('A1', 'A2', 'B1', 'Kids', 'Premium', 'Gold');

-- Insert new categories structure

-- Adults & Teens Levels
INSERT INTO categories (slug, name, description, color, icon, sort_order) VALUES
  ('A1', 'A1 Beginner', 'Complete beginners with little to no prior English knowledge', '#22c55e', 'star', 1),
  ('A2', 'A2 Elementary', 'Basic English speakers who can handle simple conversations', '#84cc16', 'trending-up', 2),
  ('B1', 'B1 Intermediate', 'Intermediate speakers who can discuss familiar topics', '#eab308', 'award', 3),
  ('B2', 'B2 Upper-Intermediate', 'Advanced speakers who can engage in complex discussions', '#3b82f6', 'trophy', 4)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- Kids Levels
INSERT INTO categories (slug, name, description, color, icon, sort_order) VALUES
  ('kids-basic', 'Kids Basic', 'Foundation English for young learners just starting out', '#f97316', 'smile', 10),
  ('kids-medium', 'Kids Medium', 'Intermediate English for children with some background', '#ec4899', 'heart', 11),
  ('kids-advanced', 'Kids Advanced', 'Advanced English for confident young speakers', '#8b5cf6', 'rocket', 12)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- Service Programs (Premium & Golden)
INSERT INTO categories (slug, name, description, color, icon, sort_order) VALUES
  ('premium', 'Premium Program', 'Comprehensive live online course with expert instructors', '#8b5cf6', 'crown', 20),
  ('golden', 'Golden Program', 'Our most prestigious program with 30 one-to-one lessons and VIP support', '#f59e0b', 'gem', 21)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- Product Type Categories (for filtering in catalog)
INSERT INTO categories (slug, name, description, color, icon, sort_order) VALUES
  ('products', 'Products', 'Digital products including E-books and LearnDash courses', '#6366f1', 'package', 100),
  ('services', 'Services', 'Live online courses and structured learning programs', '#10b981', 'users', 101)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- ============================================
-- STEP 5: Add catalog_type column to categories
-- to distinguish level categories from type categories
-- ============================================

ALTER TABLE categories ADD COLUMN IF NOT EXISTS catalog_type TEXT DEFAULT 'level';

-- Update catalog_type for different category purposes
UPDATE categories SET catalog_type = 'level' WHERE slug IN ('A1', 'A2', 'B1', 'B2', 'kids-basic', 'kids-medium', 'kids-advanced');
UPDATE categories SET catalog_type = 'program' WHERE slug IN ('premium', 'golden');
UPDATE categories SET catalog_type = 'section' WHERE slug IN ('products', 'services');

-- Add constraint for catalog_type
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_catalog_type_check;
ALTER TABLE categories ADD CONSTRAINT categories_catalog_type_check 
  CHECK (catalog_type IN ('level', 'program', 'section'));

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after to verify the setup:

-- Check new columns on courses:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'courses' 
-- ORDER BY ordinal_position;

-- Check updated categories:
-- SELECT slug, name, catalog_type, sort_order FROM categories ORDER BY sort_order;

-- Check constraints:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'courses'::regclass;
