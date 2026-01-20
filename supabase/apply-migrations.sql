-- ============================================
-- DSA Smart Start - Apply Missing Migrations
-- Run this in Supabase SQL Editor
-- Date: 2026-01-20
-- ============================================

-- ============================================
-- MIGRATION: Add Course Catalog Fields
-- ============================================

-- Step 1: Remove the restrictive level CHECK constraint
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

-- Step 8: Add teaching_materials fields to purchases table
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

-- ============================================
-- MIGRATION: Add Wizard State Fields
-- For multi-step course creation wizard
-- ============================================

-- Step 1: Add wizard_step field to track current step (1-4)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'wizard_step') THEN
    ALTER TABLE courses ADD COLUMN wizard_step INTEGER NOT NULL DEFAULT 1 CHECK (wizard_step >= 1 AND wizard_step <= 4);
  END IF;
END $$;

-- Step 2: Add steps_completed JSONB field to track which steps are complete
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'steps_completed') THEN
    ALTER TABLE courses ADD COLUMN steps_completed JSONB NOT NULL DEFAULT '{"metadata": false, "pricing": false, "syllabus": false, "content": false}';
  END IF;
END $$;

-- Step 3: Add wizard_completed flag (true when all 4 steps done, required for publishing)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'wizard_completed') THEN
    ALTER TABLE courses ADD COLUMN wizard_completed BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Step 4: Add payment_product_id for PayPal/payment provider integration
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'payment_product_id') THEN
    ALTER TABLE courses ADD COLUMN payment_product_id TEXT;
  END IF;
END $$;

-- Step 5: Add payment_provider field (paypal, raiffeisen, etc.)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'payment_provider') THEN
    ALTER TABLE courses ADD COLUMN payment_provider TEXT DEFAULT 'paypal';
  END IF;
END $$;

-- Step 6: Create indexes for filtering drafts/incomplete courses
CREATE INDEX IF NOT EXISTS idx_courses_wizard_completed ON courses(wizard_completed);
CREATE INDEX IF NOT EXISTS idx_courses_wizard_step ON courses(wizard_step);

-- Comments for wizard fields
COMMENT ON COLUMN courses.wizard_step IS 'Current step in the 4-step creation wizard (1=Metadata, 2=Pricing, 3=Syllabus, 4=Content)';
COMMENT ON COLUMN courses.steps_completed IS 'JSON tracking which wizard steps are completed: {metadata, pricing, syllabus, content}';
COMMENT ON COLUMN courses.wizard_completed IS 'True when all 4 wizard steps are completed - required before publishing';
COMMENT ON COLUMN courses.payment_product_id IS 'Product ID from payment provider (PayPal/Raiffeisen) for checkout integration';
COMMENT ON COLUMN courses.payment_provider IS 'Which payment provider handles this course: paypal, raiffeisen';

-- ============================================
-- MIGRATION: Add Purchase Status & Webhook Support
-- For pending purchases until payment webhook confirms
-- ============================================

-- Step 1: Add status field to purchases table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'status') THEN
    ALTER TABLE purchases ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));
  END IF;
END $$;

-- Step 2: Add webhook_verified field to track if payment was verified by webhook
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'webhook_verified') THEN
    ALTER TABLE purchases ADD COLUMN webhook_verified BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Step 3: Add webhook_verified_at timestamp
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'webhook_verified_at') THEN
    ALTER TABLE purchases ADD COLUMN webhook_verified_at TIMESTAMPTZ;
  END IF;
END $$;

-- Step 4: Add payment_provider_response JSONB for storing raw webhook data
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'payment_provider_response') THEN
    ALTER TABLE purchases ADD COLUMN payment_provider_response JSONB;
  END IF;
END $$;

-- Step 5: Create index for purchase status (for filtering pending/completed)
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_webhook_verified ON purchases(webhook_verified);

-- Step 6: Add guest_checkout fields to users table for magic link flow
DO $$ 
BEGIN
  -- Flag to indicate user was created via guest checkout
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_via_guest_checkout') THEN
    ALTER TABLE users ADD COLUMN created_via_guest_checkout BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Flag to track if user has set their password (completed onboarding)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_set') THEN
    ALTER TABLE users ADD COLUMN password_set BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Step 7: Function to confirm purchase via webhook
CREATE OR REPLACE FUNCTION confirm_purchase_webhook(
  p_transaction_id TEXT,
  p_provider_response JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase_id UUID;
  v_user_id UUID;
  v_course_id UUID;
  v_result JSONB;
BEGIN
  -- Find the pending purchase by transaction ID
  SELECT id, user_id, course_id INTO v_purchase_id, v_user_id, v_course_id
  FROM purchases
  WHERE transaction_id = p_transaction_id AND status = 'pending'
  LIMIT 1;

  IF v_purchase_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase not found or already processed');
  END IF;

  -- Update purchase to completed
  UPDATE purchases
  SET 
    status = 'completed',
    webhook_verified = true,
    webhook_verified_at = NOW(),
    payment_provider_response = COALESCE(p_provider_response, payment_provider_response)
  WHERE id = v_purchase_id;

  -- Create enrollment (this grants course access)
  INSERT INTO enrollments (user_id, course_id, status)
  VALUES (v_user_id, v_course_id, 'active')
  ON CONFLICT (user_id, course_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'user_id', v_user_id,
    'course_id', v_course_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Function to mark purchase as failed
CREATE OR REPLACE FUNCTION fail_purchase_webhook(
  p_transaction_id TEXT,
  p_provider_response JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase_id UUID;
BEGIN
  -- Find the pending purchase
  SELECT id INTO v_purchase_id
  FROM purchases
  WHERE transaction_id = p_transaction_id AND status = 'pending'
  LIMIT 1;

  IF v_purchase_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase not found or already processed');
  END IF;

  -- Update purchase to failed
  UPDATE purchases
  SET 
    status = 'failed',
    webhook_verified = true,
    webhook_verified_at = NOW(),
    payment_provider_response = COALESCE(p_provider_response, payment_provider_response)
  WHERE id = v_purchase_id;

  RETURN jsonb_build_object('success', true, 'purchase_id', v_purchase_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for new fields
COMMENT ON COLUMN purchases.status IS 'Purchase status: pending (awaiting webhook), completed (payment confirmed), failed, refunded';
COMMENT ON COLUMN purchases.webhook_verified IS 'True if payment was verified by webhook callback';
COMMENT ON COLUMN purchases.webhook_verified_at IS 'Timestamp when webhook verification occurred';
COMMENT ON COLUMN purchases.payment_provider_response IS 'Raw response data from payment provider webhook';
COMMENT ON COLUMN users.created_via_guest_checkout IS 'True if user account was created during guest checkout';
COMMENT ON COLUMN users.password_set IS 'True if user has set their own password (false for guest checkout until they set it)';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE 'All migrations completed successfully! Purchase status, webhook support, and guest checkout fields have been added.';
END $$;
