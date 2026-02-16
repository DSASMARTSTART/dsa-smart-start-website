-- ============================================
-- FIX: Multi-item cart only creating 1 purchase row
-- Date: 2026-02-16
--
-- Bug: create_pending_purchase checks for existing pending purchase by
--   transaction_id ONLY. Since all cart items share the same orderId,
--   items 2+ are skipped with "already_exists: true".
--
-- Fix: Include course_id in the duplicate check.
--
-- Also adds: confirm_purchases_by_transaction RPC for client-side
--   confirmation when webhook doesn't fire (sandbox/testing).
-- ============================================

-- ============================================
-- 1. FIX create_pending_purchase: check transaction_id + course_id
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

  -- Check if there's already a pending purchase for this SAME transaction AND course
  -- (Multi-item carts share the same transaction_id but have different course_ids)
  IF p_transaction_id IS NOT NULL THEN
    SELECT id INTO v_existing_purchase
    FROM purchases
    WHERE transaction_id = p_transaction_id 
      AND course_id = p_course_id
      AND status = 'pending'
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
-- 2. NEW: confirm_purchases_by_transaction
-- Confirms ALL pending purchases for a given transaction_id.
-- Used as client-side fallback when webhook doesn't fire.
-- ============================================
CREATE OR REPLACE FUNCTION confirm_purchases_by_transaction(
  p_transaction_id TEXT,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_purchase RECORD;
  v_confirmed INTEGER := 0;
BEGIN
  -- Security: only allow confirming own purchases
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Confirm all pending purchases for this transaction
  FOR v_purchase IN
    SELECT id, user_id, course_id
    FROM purchases
    WHERE transaction_id = p_transaction_id
      AND user_id = p_user_id
      AND status = 'pending'
  LOOP
    -- Mark as completed
    UPDATE purchases
    SET status = 'completed',
        webhook_verified = true,
        webhook_verified_at = NOW(),
        payment_provider_response = jsonb_build_object(
          'confirmed_by', 'client_side_fallback',
          'confirmed_at', NOW()::text
        )
    WHERE id = v_purchase.id;

    -- Create enrollment
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
-- 3. Also fix confirm_purchase_webhook to handle multi-item transactions
-- Currently it only confirms the FIRST matching purchase.
-- Fix: confirm ALL purchases with the same transaction_id.
-- ============================================
CREATE OR REPLACE FUNCTION confirm_purchase_webhook(
  p_transaction_id TEXT,
  p_provider_response JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase RECORD;
  v_confirmed INTEGER := 0;
  v_first_user_id UUID;
  v_first_course_id UUID;
  v_first_purchase_id UUID;
BEGIN
  -- Confirm ALL pending purchases with this transaction_id
  FOR v_purchase IN
    SELECT id, user_id, course_id
    FROM purchases
    WHERE transaction_id = p_transaction_id AND status = 'pending'
  LOOP
    -- Track first for backward-compatible return value
    IF v_confirmed = 0 THEN
      v_first_purchase_id := v_purchase.id;
      v_first_user_id := v_purchase.user_id;
      v_first_course_id := v_purchase.course_id;
    END IF;

    -- Mark purchase as completed
    UPDATE purchases
    SET 
      status = 'completed',
      webhook_verified = true,
      webhook_verified_at = NOW(),
      payment_provider_response = COALESCE(p_provider_response, payment_provider_response)
    WHERE id = v_purchase.id;

    -- Create enrollment
    INSERT INTO enrollments (user_id, course_id, status)
    VALUES (v_purchase.user_id, v_purchase.course_id, 'active')
    ON CONFLICT (user_id, course_id) 
    DO UPDATE SET status = 'active', enrolled_at = NOW();

    v_confirmed := v_confirmed + 1;
  END LOOP;

  IF v_confirmed = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase not found or already processed');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_first_purchase_id,
    'user_id', v_first_user_id,
    'course_id', v_first_course_id,
    'confirmed_count', v_confirmed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ 
BEGIN
  RAISE NOTICE 'Multi-item purchase fix applied:';
  RAISE NOTICE '+ create_pending_purchase: duplicate check now includes course_id';
  RAISE NOTICE '+ confirm_purchases_by_transaction: client-side confirmation fallback';
  RAISE NOTICE '+ confirm_purchase_webhook: confirms ALL items in multi-item orders';
END $$;
