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


-- ============================================
-- MIGRATION: Payment Flow Hardening (2026-04-29)
-- Source: supabase/migrations/20260429000000_payment_flow_hardening.sql
-- ============================================
-- ============================================
-- PAYMENT FLOW HARDENING — Phase 1 (foundation)
-- Date: 2026-04-29
--
-- Goals (see payment-flow-plan.md Phase 1):
--   1. Backfill any missing columns on `purchases` (status, webhook_*, billing_*).
--   2. Ensure `discount_code_uses` audit table exists (idempotent — older variant
--      with `guest_email` continues to work; new code only writes user rows).
--   3. Ensure `payment_orphans` table exists (idempotent mirror of
--      20260428000000_payment_orphans.sql so this file is self-contained).
--   4. Harden duplicate guard with a unique partial index on
--      (transaction_id, course_id) WHERE transaction_id IS NOT NULL.
--   5. Recreate `confirm_purchase_webhook` as a fully transactional, multi-item
--      RPC that returns {purchases_confirmed, enrollments_created, errors[]}
--      and ABORTS on partial failure (rollback via RAISE EXCEPTION).
--      Records discount_code_uses ONLY when webhook_verified flips false→true
--      (prevents double-counting if the client fallback already touched rows).
--   6. Recreate `confirm_purchases_by_transaction` as the client-side fallback
--      that does NOT increment discount usage.
--   7. Recreate `ensure_enrollment_exists(p_user_id)` so it also normalizes
--      `revoked` enrollments back to `active` when a completed purchase exists.
--   8. Add `get_payment_orphans()` and `resolve_payment_orphan(...)` RPCs
--      (admin-only, SECURITY DEFINER).
--   9. Add `get_course_for_enrolled_user(p_course_id)` RPC so enrolled students
--      can still load courses that have been unpublished.
--  10. Re-assert idempotent SELECT/INSERT RLS policies on purchases and
--      enrollments so this migration alone can self-heal a fresh DB.
--
-- Safe to re-run. No destructive changes.
-- ============================================

-- ============================================
-- 1. BACKFILL MISSING COLUMNS ON purchases
-- ============================================
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  ADD COLUMN IF NOT EXISTS webhook_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_provider_response JSONB,
  ADD COLUMN IF NOT EXISTS billing_name         TEXT,
  ADD COLUMN IF NOT EXISTS billing_address      TEXT,
  ADD COLUMN IF NOT EXISTS billing_city         TEXT,
  ADD COLUMN IF NOT EXISTS billing_postal_code  TEXT,
  ADD COLUMN IF NOT EXISTS billing_country      TEXT,
  ADD COLUMN IF NOT EXISTS billing_company_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_pib          TEXT,
  ADD COLUMN IF NOT EXISTS billing_vat_id       TEXT;

CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_transaction_id ON purchases(transaction_id);

-- ============================================
-- 2. discount_code_uses (audit)
-- ============================================
CREATE TABLE IF NOT EXISTS discount_code_uses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_code_uses_code     ON discount_code_uses(discount_code_id);
CREATE INDEX IF NOT EXISTS idx_discount_code_uses_user     ON discount_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_code_uses_purchase ON discount_code_uses(purchase_id);

ALTER TABLE discount_code_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own discount code uses" ON discount_code_uses;
CREATE POLICY "Users can view own discount code uses" ON discount_code_uses
  FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can view all discount code uses" ON discount_code_uses;
CREATE POLICY "Admins can view all discount code uses" ON discount_code_uses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','editor'))
  );

-- INSERTs are performed by SECURITY DEFINER RPCs (webhook / admin orphan resolve).
-- No client INSERT policy is granted here; existing "Anyone can record discount code use"
-- policy from 20260120001000 remains in place if previously applied.

-- ============================================
-- 3. payment_orphans (idempotent mirror)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_orphans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider                 TEXT NOT NULL,
  transaction_id           TEXT,
  order_identification     TEXT,
  merchant_order_reference TEXT,
  amount                   NUMERIC(10,2),
  currency                 TEXT,
  customer_email           TEXT,
  customer_name            TEXT,
  reason                   TEXT NOT NULL,
  notes                    TEXT,
  provider_response        JSONB NOT NULL,
  resolved                 BOOLEAN NOT NULL DEFAULT false,
  resolved_at              TIMESTAMPTZ,
  resolved_by              UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes         TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orphans_resolved ON payment_orphans(resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orphans_txn      ON payment_orphans(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_orphans_email    ON payment_orphans(customer_email);

ALTER TABLE payment_orphans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read payment_orphans" ON payment_orphans;
CREATE POLICY "Admins can read payment_orphans" ON payment_orphans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role IN ('admin','editor'))
  );

DROP POLICY IF EXISTS "Admins can update payment_orphans" ON payment_orphans;
CREATE POLICY "Admins can update payment_orphans" ON payment_orphans
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'admin')
  );

-- INSERTs only by service_role (edge function).

-- ============================================
-- 4. HARDEN DUPLICATE GUARD ON purchases
-- ============================================
-- Drop the older partial index that included `status='pending'` so the new
-- index can also catch double-confirmation across statuses.
DROP INDEX IF EXISTS idx_purchases_unique_pending;

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_unique_txn_course
  ON purchases (transaction_id, course_id)
  WHERE transaction_id IS NOT NULL;

-- ============================================
-- 5. RLS POLICIES — purchases & enrollments (idempotent)
-- ============================================
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can create own purchases" ON purchases;
CREATE POLICY "Users can create own purchases" ON purchases
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can manage purchases" ON purchases;
CREATE POLICY "Admins can manage purchases" ON purchases
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','editor'))
  );

DROP POLICY IF EXISTS "Users can view own enrollments" ON enrollments;
CREATE POLICY "Users can view own enrollments" ON enrollments
  FOR SELECT USING (
    user_id::text = auth.uid()::text
    OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','editor'))
  );

DROP POLICY IF EXISTS "Admins can manage enrollments" ON enrollments;
CREATE POLICY "Admins can manage enrollments" ON enrollments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','editor'))
  );

-- ============================================
-- 6. confirm_purchase_webhook — transactional multi-item confirmation
-- Returns: { success, purchases_confirmed, enrollments_created, errors[] }
-- Aborts (rollback) on any per-item failure via RAISE EXCEPTION.
-- Records discount_code_uses ONLY when webhook_verified flips false→true.
-- ============================================
CREATE OR REPLACE FUNCTION confirm_purchase_webhook(
  p_transaction_id TEXT,
  p_provider_response JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase             RECORD;
  v_purchases_confirmed  INTEGER := 0;
  v_enrollments_created  INTEGER := 0;
  v_errors               JSONB := '[]'::jsonb;
  v_was_unverified       BOOLEAN;
  v_enrollment_inserted  BOOLEAN;
BEGIN
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'purchases_confirmed', 0,
      'enrollments_created', 0,
      'errors', jsonb_build_array('transaction_id is required')
    );
  END IF;

  FOR v_purchase IN
    SELECT id, user_id, course_id, discount_code_id, webhook_verified
    FROM purchases
    WHERE transaction_id = p_transaction_id
      AND status IN ('pending', 'completed')
    FOR UPDATE
  LOOP
    BEGIN
      v_was_unverified := COALESCE(v_purchase.webhook_verified, false) = false;

      UPDATE purchases
      SET status = 'completed',
          webhook_verified = true,
          webhook_verified_at = NOW(),
          payment_provider_response = COALESCE(p_provider_response, payment_provider_response)
      WHERE id = v_purchase.id;

      -- Upsert enrollment (active). Reactivate any revoked rows.
      WITH ins AS (
        INSERT INTO enrollments (user_id, course_id, status)
        VALUES (v_purchase.user_id, v_purchase.course_id, 'active')
        ON CONFLICT (user_id, course_id)
        DO UPDATE SET status = 'active', enrolled_at = NOW()
        RETURNING (xmax = 0) AS inserted
      )
      SELECT inserted INTO v_enrollment_inserted FROM ins;

      IF v_enrollment_inserted THEN
        v_enrollments_created := v_enrollments_created + 1;
      END IF;

      -- Audit discount-code use ONLY on the transition to verified
      -- (prevents double-counting if client fallback already ran).
      IF v_was_unverified AND v_purchase.discount_code_id IS NOT NULL THEN
        INSERT INTO discount_code_uses (discount_code_id, user_id, purchase_id)
        VALUES (v_purchase.discount_code_id, v_purchase.user_id, v_purchase.id)
        ON CONFLICT DO NOTHING;
      END IF;

      v_purchases_confirmed := v_purchases_confirmed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'purchase_id', v_purchase.id,
        'sqlstate',    SQLSTATE,
        'message',     SQLERRM
      ));
    END;
  END LOOP;

  IF v_purchases_confirmed = 0 AND jsonb_array_length(v_errors) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'purchases_confirmed', 0,
      'enrollments_created', 0,
      'errors', jsonb_build_array('No pending purchase found for transaction_id')
    );
  END IF;

  -- Partial failure → abort everything so the webhook can retry / orphan.
  IF jsonb_array_length(v_errors) > 0 THEN
    RAISE EXCEPTION 'confirm_purchase_webhook partial failure: %', v_errors::text
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'purchases_confirmed', v_purchases_confirmed,
    'enrollments_created', v_enrollments_created,
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. confirm_purchases_by_transaction — client-side fallback
-- Does NOT increment discount usage (webhook is the single source of truth).
-- ============================================
CREATE OR REPLACE FUNCTION confirm_purchases_by_transaction(
  p_transaction_id TEXT,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_purchase   RECORD;
  v_confirmed  INTEGER := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  FOR v_purchase IN
    SELECT id, user_id, course_id
    FROM purchases
    WHERE transaction_id = p_transaction_id
      AND user_id = p_user_id
      AND status = 'pending'
    FOR UPDATE
  LOOP
    UPDATE purchases
    SET status = 'completed',
        -- Intentionally do NOT set webhook_verified here, so when the real
        -- webhook arrives it can still record discount_code_uses exactly once.
        payment_provider_response = COALESCE(payment_provider_response, jsonb_build_object(
          'confirmed_by', 'client_side_fallback',
          'confirmed_at', NOW()::text
        ))
    WHERE id = v_purchase.id;

    INSERT INTO enrollments (user_id, course_id, status)
    VALUES (v_purchase.user_id, v_purchase.course_id, 'active')
    ON CONFLICT (user_id, course_id)
    DO UPDATE SET status = 'active', enrolled_at = NOW();

    v_confirmed := v_confirmed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'confirmed_count', v_confirmed,
    'transaction_id', p_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. ensure_enrollment_exists — self-healing dashboard
-- Reactivates revoked enrollments AND inserts missing ones whenever a
-- completed purchase exists.
-- ============================================
CREATE OR REPLACE FUNCTION ensure_enrollment_exists(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_repaired INTEGER := 0;
  v_purchase RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_id required', 'repaired_count', 0);
  END IF;

  FOR v_purchase IN
    SELECT DISTINCT p.course_id
    FROM purchases p
    WHERE p.user_id = p_user_id
      AND p.status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.user_id = p_user_id
          AND e.course_id = p.course_id
          AND e.status = 'active'
      )
  LOOP
    INSERT INTO enrollments (user_id, course_id, status)
    VALUES (p_user_id, v_purchase.course_id, 'active')
    ON CONFLICT (user_id, course_id)
    DO UPDATE SET status = 'active', enrolled_at = NOW();

    v_repaired := v_repaired + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'repaired_count', v_repaired
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. get_payment_orphans / resolve_payment_orphan (admin-only)
-- ============================================
CREATE OR REPLACE FUNCTION get_payment_orphans(
  p_include_resolved BOOLEAN DEFAULT false
) RETURNS SETOF payment_orphans AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','editor')
  ) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT *
    FROM payment_orphans
    WHERE p_include_resolved OR resolved = false
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- p_action: 'confirm' | 'refunded' | 'dismiss'
-- For 'confirm', supply p_user_id + p_course_id so we can create the missing
-- purchase row and enrollment.
CREATE OR REPLACE FUNCTION resolve_payment_orphan(
  p_id UUID,
  p_action TEXT,
  p_user_id UUID DEFAULT NULL,
  p_course_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_admin_id      UUID;
  v_orphan        RECORD;
  v_purchase_id   UUID;
BEGIN
  v_admin_id := auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = v_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden — admin role required' USING ERRCODE = '42501';
  END IF;

  IF p_action NOT IN ('confirm', 'refunded', 'dismiss') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_orphan FROM payment_orphans WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Orphan not found');
  END IF;

  IF v_orphan.resolved THEN
    RETURN jsonb_build_object('success', false, 'error', 'Orphan already resolved');
  END IF;

  IF p_action = 'confirm' THEN
    IF p_user_id IS NULL OR p_course_id IS NULL THEN
      RAISE EXCEPTION 'p_user_id and p_course_id are required for confirm action'
        USING ERRCODE = '22023';
    END IF;

    -- Create a completed purchase row so the user has audit trail + access.
    INSERT INTO purchases (
      user_id, course_id, amount, original_amount, currency,
      payment_method, transaction_id,
      status, webhook_verified, webhook_verified_at,
      payment_provider_response
    ) VALUES (
      p_user_id, p_course_id,
      COALESCE(v_orphan.amount, 0), COALESCE(v_orphan.amount, 0),
      COALESCE(v_orphan.currency, 'EUR'),
      v_orphan.provider,
      COALESCE(v_orphan.transaction_id, gen_random_uuid()::text),
      'completed', true, NOW(),
      jsonb_build_object(
        'resolved_from_orphan_id', v_orphan.id,
        'orphan_payload', v_orphan.provider_response
      )
    )
    ON CONFLICT (transaction_id, course_id) WHERE transaction_id IS NOT NULL
    DO UPDATE SET status = 'completed',
                  webhook_verified = true,
                  webhook_verified_at = NOW()
    RETURNING id INTO v_purchase_id;

    INSERT INTO enrollments (user_id, course_id, status)
    VALUES (p_user_id, p_course_id, 'active')
    ON CONFLICT (user_id, course_id)
    DO UPDATE SET status = 'active', enrolled_at = NOW();
  END IF;

  UPDATE payment_orphans
  SET resolved         = true,
      resolved_at      = NOW(),
      resolved_by      = v_admin_id,
      resolution_notes = COALESCE(p_notes, resolution_notes)
  WHERE id = p_id;

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'orphan_id', p_id,
    'purchase_id', v_purchase_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. get_course_for_enrolled_user — bypass is_published for enrolled students
-- ============================================
CREATE OR REPLACE FUNCTION get_course_for_enrolled_user(
  p_course_id UUID
) RETURNS SETOF courses AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Admin/editor: always allow
  IF EXISTS (SELECT 1 FROM users WHERE id = v_user_id AND role IN ('admin','editor')) THEN
    RETURN QUERY SELECT * FROM courses WHERE id = p_course_id;
    RETURN;
  END IF;

  -- Student: must have an active enrollment
  IF NOT EXISTS (
    SELECT 1 FROM enrollments
    WHERE user_id = v_user_id AND course_id = p_course_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Forbidden — no active enrollment' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY SELECT * FROM courses WHERE id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=== Payment flow hardening (2026-04-29) applied ===';
  RAISE NOTICE 'Tables: discount_code_uses, payment_orphans (idempotent)';
  RAISE NOTICE 'Columns: purchases.status / webhook_* / billing_* (idempotent)';
  RAISE NOTICE 'Indexes: idx_purchases_unique_txn_course, idx_purchases_status, idx_purchases_transaction_id';
  RAISE NOTICE 'RPCs: confirm_purchase_webhook (transactional), confirm_purchases_by_transaction (no discount inc),';
  RAISE NOTICE '      ensure_enrollment_exists (revoked→active), get_payment_orphans, resolve_payment_orphan,';
  RAISE NOTICE '      get_course_for_enrolled_user';
END $$;
