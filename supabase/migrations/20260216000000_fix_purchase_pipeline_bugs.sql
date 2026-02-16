-- ============================================
-- FIX PURCHASE → DASHBOARD PIPELINE BUGS
-- Date: 2026-02-16
--
-- Bugs Fixed:
--   1. Add fail_purchase_webhook RPC (was missing from migration)
--   2. Add confirm_purchase_by_user RPC (broader lookup for PayPal)
--   3. Add stale pending purchase cleanup function
--   4. Unique index on (user_id, course_id, transaction_id) to prevent duplicates
--   5. SELECT policy so users can read their own purchases
--
-- Context:
--   - Card payments: Edge Function creates pending purchase → webhook confirms
--   - PayPal: Client creates pending purchase → webhook can't match transaction_id
--     because PayPal returns its own capture ID, not our orderId
--   - handlePaymentSuccess() was creating DUPLICATE purchase rows for card payments
--     (Edge Function already created one). Client-side code is now fixed separately.
--
-- Related code changes (applied in parallel):
--   - CheckoutPage.tsx: Skip purchasesApi.create() for card payments
--   - payment-webhook/index.ts: Broader PayPal lookup by user_id + course_id
--   - paymentService.ts: Set invoice_id in PayPal order to match our orderId
-- ============================================

-- ============================================
-- 1. FAIL PURCHASE WEBHOOK RPC (was missing from migration)
-- Called by payment-webhook Edge Function when payment fails.
-- Marks purchase as failed so it doesn't show as "pending" forever.
-- ============================================

CREATE OR REPLACE FUNCTION fail_purchase_webhook(
  p_transaction_id TEXT,
  p_provider_response JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase_id UUID;
BEGIN
  -- Find the pending purchase by transaction ID
  SELECT id INTO v_purchase_id
  FROM purchases
  WHERE transaction_id = p_transaction_id AND status = 'pending'
  LIMIT 1;

  IF v_purchase_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase not found or already processed');
  END IF;

  -- Mark purchase as failed
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

-- ============================================
-- 2. BROADER PURCHASE CONFIRMATION
-- When webhook transaction_id doesn't match (PayPal sends its own ID),
-- fall back to matching by user_id + course_id + recent pending status.
-- Called by payment-webhook Edge Function as a second attempt.
-- ============================================

CREATE OR REPLACE FUNCTION confirm_purchase_by_user_course(
  p_user_id UUID,
  p_course_id UUID,
  p_provider_transaction_id TEXT DEFAULT NULL,
  p_provider_response JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase_id UUID;
  v_user_id UUID;
  v_course_id UUID;
BEGIN
  -- Find the most recent pending purchase for this user+course
  SELECT id, user_id, course_id 
  INTO v_purchase_id, v_user_id, v_course_id
  FROM purchases
  WHERE user_id = p_user_id 
    AND course_id = p_course_id 
    AND status = 'pending'
  ORDER BY purchased_at DESC
  LIMIT 1;

  IF v_purchase_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending purchase found for this user and course');
  END IF;

  -- Mark purchase as completed and verified
  UPDATE purchases
  SET 
    status = 'completed',
    webhook_verified = true,
    webhook_verified_at = NOW(),
    transaction_id = COALESCE(p_provider_transaction_id, transaction_id),
    payment_provider_response = COALESCE(p_provider_response, payment_provider_response)
  WHERE id = v_purchase_id;

  -- Create enrollment so item appears on user's dashboard
  INSERT INTO enrollments (user_id, course_id, status)
  VALUES (v_user_id, v_course_id, 'active')
  ON CONFLICT (user_id, course_id) 
  DO UPDATE SET status = 'active', enrolled_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'user_id', v_user_id,
    'course_id', v_course_id,
    'matched_by', 'user_course_fallback'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. CLEAN UP STALE PENDING PURCHASES
-- Purchases that stay "pending" for > 24 hours are likely abandoned.
-- Mark them as 'expired' so they don't clutter the dashboard.
-- Can be called by a cron job or admin action.
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_stale_pending_purchases(
  p_hours_threshold INTEGER DEFAULT 24
) RETURNS JSONB AS $$
DECLARE
  v_cleaned INTEGER := 0;
BEGIN
  UPDATE purchases
  SET status = 'failed',
      payment_provider_response = jsonb_build_object(
        'auto_expired', true,
        'reason', 'Pending purchase exceeded ' || p_hours_threshold || ' hour threshold',
        'expired_at', NOW()::text
      )
  WHERE status = 'pending'
    AND purchased_at < NOW() - (p_hours_threshold || ' hours')::interval;

  GET DIAGNOSTICS v_cleaned = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'cleaned_count', v_cleaned
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. SELECT POLICY ON PURCHASES
-- Users need to read their own purchases for the dashboard
-- (pending purchases section, checkout success page).
-- ============================================

DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

-- ============================================
-- 5. UPDATE POLICY ON PURCHASES  
-- Users should NOT be able to update their own purchases
-- (only webhook SECURITY DEFINER functions should do that).
-- But ensure the policy doesn't block authenticated inserts.
-- ============================================

-- (No user-level UPDATE policy needed — SECURITY DEFINER RPCs bypass RLS)

-- ============================================
-- 6. PREVENT DUPLICATE PURCHASE ROWS
-- When Edge Function creates a pending purchase server-side and
-- client-side code accidentally tries to create another one,
-- this unique partial index prevents the second INSERT.
-- Only applies to 'pending' status (completed/failed can coexist).
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_unique_pending
  ON purchases (user_id, course_id, transaction_id)
  WHERE status = 'pending';

-- ============================================
-- VERIFICATION SUMMARY
-- ============================================
--
-- FIXES APPLIED:
--   1. fail_purchase_webhook RPC — webhook can now properly mark failed payments
--   2. confirm_purchase_by_user_course RPC — PayPal fallback matching
--   3. cleanup_stale_pending_purchases RPC — auto-expire old pending purchases
--   4. SELECT policy on purchases — dashboard can read user's purchases
--   5. Unique partial index — prevents duplicate pending purchases
--
-- FULL PIPELINE (after all code + SQL fixes):
--
--   Card Payment:
--     1. User clicks Pay → Edge Function → create_pending_purchase RPC
--        (purchase row exists BEFORE payment iframe)
--     2. User completes card entry in iframe
--     3. Iframe posts success → client shows success page (NO duplicate insert)
--     4. Webhook fires → confirm_purchase_webhook(transaction_id)
--        → purchase.status='completed' + enrollment created
--     5. Dashboard loads → enrollment shows purchased item ✅
--
--   PayPal Payment:
--     1. User clicks PayPal → client creates pending purchase via purchasesApi
--        (with orderId as transaction_id + invoice_id set in PayPal order)
--     2. PayPal processes payment
--     3. onApprove fires → client shows success page
--     4. Webhook fires → tries confirm_purchase_webhook(paypal_capture_id)
--        → if not found, falls back to confirm_purchase_by_user_course
--        → purchase.status='completed' + enrollment created
--     5. Dashboard loads → enrollment shows purchased item ✅
--
--   Safety Net (unchanged):
--     Dashboard load → ensure_enrollment_exists(user_id)
--     → repairs any completed purchases missing enrollments
--
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '=== Purchase Pipeline Bug Fixes (2026-02-16) ===';
  RAISE NOTICE '+ fail_purchase_webhook RPC (was missing)';
  RAISE NOTICE '+ confirm_purchase_by_user_course RPC (PayPal fallback)';
  RAISE NOTICE '+ cleanup_stale_pending_purchases RPC (housekeeping)';
  RAISE NOTICE '+ SELECT policy on purchases (dashboard reads)';
  RAISE NOTICE '+ Unique partial index on pending purchases (prevent duplicates)';
  RAISE NOTICE '';
  RAISE NOTICE 'Apply code changes: CheckoutPage.tsx, payment-webhook/index.ts, paymentService.ts';
END $$;
