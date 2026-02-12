-- ============================================
-- FIX PAYMENT FLOW: RLS Policies + RPC Functions
-- Date: 2026-02-12
-- Fixes:
--   1. Missing INSERT policy on purchases (blocks all client-side purchase creation)
--   2. Missing INSERT policy on enrollments for students
--   3. Add create_pending_purchase RPC for server-side purchase creation (race condition fix)
--   4. Add create_guest_purchase RPC for guest checkout (existing users who aren't signed in)
--   5. Add repair_missing_enrollments RPC for self-healing dashboard
--   6. Add ensure_enrollment_exists RPC for dashboard fallback
-- ============================================

-- ============================================
-- 1. ADD MISSING RLS POLICIES ON PURCHASES
-- ============================================

-- Allow authenticated users to INSERT purchases for themselves
DROP POLICY IF EXISTS "Users can create own purchases" ON purchases;
CREATE POLICY "Users can create own purchases" ON purchases
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

-- Allow admins to UPDATE purchases (webhook uses SECURITY DEFINER so doesn't need this)
DROP POLICY IF EXISTS "Admins can manage purchases" ON purchases;
CREATE POLICY "Admins can manage purchases" ON purchases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );

-- ============================================
-- 2. ADD MISSING INSERT POLICY ON ENROLLMENTS
-- ============================================
-- Note: The webhook's confirm_purchase_webhook uses SECURITY DEFINER and bypasses RLS.
-- This policy is for admin manual enrollment and future direct enrollment needs.

-- (The existing "Admins can manage enrollments" FOR ALL policy already handles admin inserts)
-- No additional student INSERT policy needed — students should NOT self-enroll.
-- Enrollment is always created server-side by confirm_purchase_webhook (SECURITY DEFINER).

-- ============================================
-- 3. SERVER-SIDE PENDING PURCHASE CREATION
-- Called by create-raiaccept-session Edge Function BEFORE sending user to payment iframe.
-- Eliminates race condition: purchase record exists before webhook fires.
-- ============================================

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
  p_teaching_materials_price DECIMAL DEFAULT 0,
  p_guest_email TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase_id UUID;
  v_existing_enrollment BOOLEAN;
  v_existing_purchase UUID;
BEGIN
  -- Check if user already has active enrollment (prevent duplicate purchase)
  SELECT EXISTS(
    SELECT 1 FROM enrollments 
    WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'active'
  ) INTO v_existing_enrollment;

  IF v_existing_enrollment THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User already enrolled in this course',
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
    INSERT INTO discount_code_uses (discount_code_id, user_id, guest_email, purchase_id)
    VALUES (p_discount_code_id, p_user_id, p_guest_email, v_purchase_id)
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
-- 4. GUEST PURCHASE RPC (for existing users who aren't signed in)
-- Called by client when guest checkout detects an existing user.
-- Since the existing user isn't signed in, client can't INSERT due to RLS.
-- ============================================

CREATE OR REPLACE FUNCTION create_guest_purchase(
  p_email TEXT,
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
  v_user_id UUID;
  v_purchase_id UUID;
  v_existing_enrollment BOOLEAN;
BEGIN
  -- Look up user by email
  SELECT id INTO v_user_id FROM users WHERE email = lower(p_email) LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Check for existing enrollment
  SELECT EXISTS(
    SELECT 1 FROM enrollments 
    WHERE user_id = v_user_id AND course_id = p_course_id AND status = 'active'
  ) INTO v_existing_enrollment;

  IF v_existing_enrollment THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User already enrolled in this course',
      'already_enrolled', true
    );
  END IF;

  -- Create pending purchase
  INSERT INTO purchases (
    user_id, course_id, amount, original_amount, discount_amount,
    discount_code_id, currency, payment_method, transaction_id,
    teaching_materials_included, teaching_materials_price,
    status, webhook_verified
  ) VALUES (
    v_user_id, p_course_id, p_amount, p_original_amount, p_discount_amount,
    p_discount_code_id, p_currency, p_payment_method,
    COALESCE(p_transaction_id, gen_random_uuid()::text),
    p_teaching_materials_included, p_teaching_materials_price,
    'pending', false
  )
  RETURNING id INTO v_purchase_id;

  -- Record discount code usage
  IF p_discount_code_id IS NOT NULL THEN
    INSERT INTO discount_code_uses (discount_code_id, user_id, guest_email, purchase_id)
    VALUES (p_discount_code_id, v_user_id, p_email, v_purchase_id)
    ON CONFLICT DO NOTHING;

    UPDATE discount_codes SET times_used = times_used + 1 WHERE id = p_discount_code_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'user_id', v_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. REPAIR MISSING ENROLLMENTS
-- Self-healing: finds completed purchases without matching active enrollments
-- and creates the missing enrollments. Called by dashboard as fallback.
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
    -- Create missing enrollment
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
-- 6. Update confirm_purchase_webhook to handle ON CONFLICT better
-- If enrollment was previously revoked, reactivate it instead of DO NOTHING
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

  -- Update purchase to completed
  UPDATE purchases
  SET 
    status = 'completed',
    webhook_verified = true,
    webhook_verified_at = NOW(),
    payment_provider_response = COALESCE(p_provider_response, payment_provider_response)
  WHERE id = v_purchase_id;

  -- Create enrollment (reactivate if previously revoked)
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
-- 7. Add index for transaction_id lookups (used by webhook)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_purchases_transaction_id ON purchases(transaction_id);

-- ============================================
-- SUCCESS
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE 'Payment flow fix migration completed successfully!';
  RAISE NOTICE '- Added INSERT policy on purchases for authenticated users';
  RAISE NOTICE '- Added admin management policy on purchases';
  RAISE NOTICE '- Added create_pending_purchase RPC (race condition fix)';
  RAISE NOTICE '- Added create_guest_purchase RPC (guest checkout fix)';
  RAISE NOTICE '- Added ensure_enrollment_exists RPC (self-healing dashboard)';
  RAISE NOTICE '- Updated confirm_purchase_webhook to reactivate revoked enrollments';
  RAISE NOTICE '- Added transaction_id index for faster webhook lookups';
END $$;
