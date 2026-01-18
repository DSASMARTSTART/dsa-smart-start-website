-- ============================================
-- CATEGORIES TABLE AND MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Remove the CHECK constraint on courses.level
-- This allows custom category names
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_level_check;

-- Step 2: Create categories table for dynamic category management
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL, -- e.g., 'kids', 'premium', 'business'
  name TEXT NOT NULL,        -- e.g., 'Kids English', 'Premium', 'Business English'
  description TEXT,          -- Optional description for the category
  color TEXT DEFAULT '#6366f1', -- Hex color for UI display
  icon TEXT,                 -- Optional icon name (e.g., 'star', 'crown', 'book')
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);

-- Step 3: Seed default categories (matching existing levels)
INSERT INTO categories (slug, name, description, color, icon, sort_order) VALUES
  ('A1', 'A1 Beginner', 'Complete beginners with little to no prior English knowledge', '#22c55e', 'star', 1),
  ('A2', 'A2 Elementary', 'Basic English speakers who can handle simple conversations', '#84cc16', 'trending-up', 2),
  ('B1', 'B1 Intermediate', 'Intermediate speakers who can discuss familiar topics', '#eab308', 'award', 3),
  ('Kids', 'Kids English', 'Fun and engaging English lessons designed for children', '#f97316', 'smile', 4),
  ('Premium', 'Premium Course', 'Advanced comprehensive courses with exclusive content', '#8b5cf6', 'crown', 5),
  ('Gold', 'Gold Course', 'Our most prestigious courses with VIP support', '#f59e0b', 'gem', 6)
ON CONFLICT (slug) DO NOTHING;

-- Step 4: Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for categories

-- Everyone can read active categories
CREATE POLICY "Anyone can view active categories"
ON categories FOR SELECT
TO public
USING (is_active = true);

-- Admins can read all categories (including inactive)
CREATE POLICY "Admins can view all categories"
ON categories FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'editor')
  )
);

-- Only admins can insert categories
CREATE POLICY "Admins can create categories"
ON categories FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Only admins can update categories
CREATE POLICY "Admins can update categories"
ON categories FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Only admins can delete categories
CREATE POLICY "Admins can delete categories"
ON categories FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after to verify the setup:

-- Check categories table exists and has data:
-- SELECT * FROM categories ORDER BY sort_order;

-- Check constraint was removed (should not show courses_level_check):
-- SELECT conname FROM pg_constraint WHERE conrelid = 'courses'::regclass;
