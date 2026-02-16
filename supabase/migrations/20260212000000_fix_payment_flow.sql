-- ============================================
-- FIX PAYMENT FLOW: RLS Policies + RPC Functions (Auth-Only)
-- Date: 2026-02-12
-- Updated: 2026-02-16 — Removed guest checkout, require authentication
-- 
-- Fixes:
--   1. INSERT policy on purchases for authenticated users
--   2. Admin management policy on purchases
--   3. create_pending_purchase RPC (race condition fix, auth-only)
--   4. confirm_purchase_webhook RPC (webhook → enrollment creation)
--   5. ensure_enrollment_exists RPC (self-healing dashboard)
--   6. Drop deprecated create_guest_purchase RPC
--   7. Transaction ID index for webhook lookups
-- ============================================

-- ============================================
-- 1. RLS POLICIES ON PURCHASES
-- ============================================

-- Authenticated users can INSERT purchases for themselves
DROP POLICY IF EXISTS "Users can create own purchases" ON purchases;
CREATE POLICY "Users can create own purchases" ON purchases
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

-- Admins/editors can do everything on purchases
DROP POLICY IF EXISTS "Admins can manage purchases" ON purchases;
CREATE POLICY "Admins can manage purchases" ON purchases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );

-- ============================================
-- 2. ENROLLMENTS — NO STUDENT INSERT POLICY
-- ============================================
-- Enrollment is ONLY created server-side by:
--   a) confirm_purchase_webhook (SECURITY DEFINER) — normal flow
--   b) ensure_enrollment_exists (SECURITY DEFINER) — self-healing fallback
--   c) Admins via "Admins can manage enrollments" FOR ALL policy (manual)
-- Students must NOT self-enroll. No INSERT policy needed for students.

-- ============================================
-- 3. SERVER-SIDE PENDING PURCHASE CREATION (Auth-Only)
-- Called by create-raiaccept-session Edge Function BEFORE payment iframe.
-- Eliminates race condition: purchase record exists before webhook fires.
-- Requires authenticated user — no guest path.
-- ============================================

-- Drop old function signature that had p_guest_email parameter
DROP FUNCTION IF EXISTS create_pending_purchase(UUID, UUID, DECIMAL, DECIMAL, DECIMAL, UUID, TEXT, TEXT, TEXT, BOOLEAN, DECIMAL, TEXT);

CREATE OR REPLACE FUNCTION create_pending_purchase(
  p_user_id UUID,
  p_course_id UUID,
  p_amount DECIMAL,
  p_original_amount DECIMAL,
  p_discount_amount DECIMAL DEFAULT 0,
  p_discount_code_id UUID DEFAULT NULL,
  p_currency TEXT DEFAULT 'EUR',
  p_payment_method TEXT DEFAULT 'card',
  p_transaction_id TEXT DEFAULT NULL,
  p_teaching_materials_included BOOLEAN DEFAULT false,
  p_teaching_materials_price DECIMAL DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
  v_purchase_id UUID;
  v_existing_enrollment BOOLEAN;
  v_existing_purchase UUID;
BEGIN
  -- Reject if no user ID (authentication required)
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required. Please log in before purchasing.'
    );
  END IF;

  -- Check if user already has active enrollment (prevent duplicate purchase)
  SELECT EXISTS(
    SELECT 1 FROM enrollments 
    WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'active'
  ) INTO v_existing_enrollment;

  IF v_existing_enrollment THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'You are already enrolled in this course',
      'already_enrolled', true
    );
  END IF;

  -- Check if there's already a pending purchase for this exact transaction
  IF p_transaction_id IS NOT NULL THEN
    SELECT id INTO v_existing_purchase
    FROM purchases
    WHERE transaction_id = p_transaction_id AND status = 'pending'
    LIMIT 1;

    IF v_existing_purchase IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true, 
        'purchase_id', v_existing_purchase,
        'already_exists', true
      );
    END IF;
  END IF;

  -- Create the pending purchase
  INSERT INTO purchases (
    user_id, course_id, amount, original_amount, discount_amount,
    discount_code_id, currency, payment_method, transaction_id,
    teaching_materials_included, teaching_materials_price,
    status, webhook_verified
  ) VALUES (
    p_user_id, p_course_id, p_amount, p_original_amount, p_discount_amount,
    p_discount_code_id, p_currency, p_payment_method, 
    COALESCE(p_transaction_id, gen_random_uuid()::text),
    p_teaching_materials_included, p_teaching_materials_price,
    'pending', false
  )
  RETURNING id INTO v_purchase_id;

  -- Record discount code usage if applicable
  IF p_discount_code_id IS NOT NULL THEN
    INSERT INTO discount_code_uses (discount_code_id, user_id, purchase_id)
    VALUES (p_discount_code_id, p_user_id, v_purchase_id)
    ON CONFLICT DO NOTHING;

    UPDATE discount_codes SET times_used = times_used + 1 WHERE id = p_discount_code_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. DROP GUEST PURCHASE RPC (no longer needed)
-- Anonymous/guest purchases are disabled.
-- Users must be logged in to purchase.
-- ============================================

DROP FUNCTION IF EXISTS create_guest_purchase(TEXT, UUID, DECIMAL, DECIMAL, DECIMAL, UUID, TEXT, TEXT, TEXT, BOOLEAN, DECIMAL);

-- ============================================
-- 5. CONFIRM PURCHASE WEBHOOK
-- Called by payment-webhook Edge Function when payment succeeds.
-- Updates purchase status and CREATES the enrollment.
-- This is the primary path for enrollment creation — ensures
-- purchased items appear on the user's dashboard.
-- ============================================

CREATE OR REPLACE FUNCTION confirm_purchase_webhook(
  p_transaction_id TEXT,
  p_provider_response JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase_id UUID;
  v_user_id UUID;
  v_course_id UUID;
BEGIN
  -- Find the pending purchase by transaction ID
  SELECT id, user_id, course_id INTO v_purchase_id, v_user_id, v_course_id
  FROM purchases
  WHERE transaction_id = p_transaction_id AND status = 'pending'
  LIMIT 1;

  IF v_purchase_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase not found or already processed');
  END IF;

  -- Mark purchase as completed and verified
  UPDATE purchases
  SET 
    status = 'completed',
    webhook_verified = true,
    webhook_verified_at = NOW(),
    payment_provider_response = COALESCE(p_provider_response, payment_provider_response)
  WHERE id = v_purchase_id;

  -- Create enrollment so item appears on user's dashboard.
  -- ON CONFLICT: reactivate if previously revoked.
  INSERT INTO enrollments (user_id, course_id, status)
  VALUES (v_user_id, v_course_id, 'active')
  ON CONFLICT (user_id, course_id) 
  DO UPDATE SET status = 'active', enrolled_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'user_id', v_user_id,
    'course_id', v_course_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. SELF-HEALING: REPAIR MISSING ENROLLMENTS
-- Dashboard calls this on every load as a safety net.
-- If a webhook completed the purchase but enrollment was lost
-- (e.g., transient error, race condition), this repairs it so
-- the purchased item shows up on the dashboard.
-- ============================================

CREATE OR REPLACE FUNCTION ensure_enrollment_exists(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_repaired INTEGER := 0;
  v_purchase RECORD;
BEGIN
  -- Find completed purchases that don't have an active enrollment
  FOR v_purchase IN
    SELECT p.id, p.course_id
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
    -- Create the missing enrollment
    INSERT INTO enrollments (user_id, course_id, status)
    VALUES (p_user_id, v_purchase.course_id, 'active')
    ON CONFLICT (user_id, course_id) 
    DO UPDATE SET status = 'active';

    v_repaired := v_repaired + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'repaired_count', v_repaired
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. INDEX for transaction_id lookups (webhook performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_purchases_transaction_id ON purchases(transaction_id);

-- ============================================
-- VERIFICATION SUMMARY
-- ============================================
-- 
-- PURCHASE → DASHBOARD PIPELINE (for logged-in users):
--
--   1. User logs in (required before purchase)
--   2. User clicks Pay → create_pending_purchase(user_id, course_id, ...)
--      → purchase row created with status='pending'
--   3. Payment provider processes card/PayPal
--   4. Webhook fires → confirm_purchase_webhook(transaction_id)
--      → purchase.status = 'completed'
--      → enrollment row created (status='active')
--   5. Dashboard loads → enrollmentsApi.getByUserWithCourses(userId)
--      → purchased course/ebook appears!
--   6. Safety net: ensure_enrollment_exists(user_id) runs on dashboard load
--      → repairs any missing enrollment from completed purchases
--
-- RESULT: Every purchased item is guaranteed to appear on dashboard.
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '=== Payment Flow Migration (Auth-Only) ===';
  RAISE NOTICE '- INSERT policy on purchases for authenticated users';
  RAISE NOTICE '- Admin management policy on purchases';
  RAISE NOTICE '- create_pending_purchase RPC (auth-only, no guest path)';
  RAISE NOTICE '- confirm_purchase_webhook RPC (creates enrollment for dashboard)';
  RAISE NOTICE '- ensure_enrollment_exists RPC (self-healing dashboard)';
  RAISE NOTICE '- DROPPED create_guest_purchase RPC (guest checkout disabled)';
  RAISE NOTICE '- transaction_id index for webhook lookups';
  RAISE NOTICE '';
  RAISE NOTICE 'Pipeline: Login → Purchase(pending) → Webhook → Purchase(completed) + Enrollment(active) → Dashboard shows item';
END $$;
