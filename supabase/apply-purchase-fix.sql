-- ============================================
-- QUICK FIX: Run this in Supabase SQL Editor NOW
-- Fixes: purchased items not showing on dashboard
-- ============================================

-- 1. SELECT policy so users can read their own purchases
-- (Without this, RLS silently blocks all reads → dashboard shows nothing)
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

-- 2. fail_purchase_webhook RPC (was missing)
CREATE OR REPLACE FUNCTION fail_purchase_webhook(
  p_transaction_id TEXT,
  p_provider_response JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase_id UUID;
BEGIN
  SELECT id INTO v_purchase_id
  FROM purchases
  WHERE transaction_id = p_transaction_id AND status = 'pending'
  LIMIT 1;

  IF v_purchase_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase not found or already processed');
  END IF;

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

-- 3. PayPal fallback: confirm by user+course when transaction_id doesn't match
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

  UPDATE purchases
  SET 
    status = 'completed',
    webhook_verified = true,
    webhook_verified_at = NOW(),
    transaction_id = COALESCE(p_provider_transaction_id, transaction_id),
    payment_provider_response = COALESCE(p_provider_response, payment_provider_response)
  WHERE id = v_purchase_id;

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

-- 4. Cleanup stale pending purchases
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

  RETURN jsonb_build_object('success', true, 'cleaned_count', v_cleaned);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Prevent duplicate pending purchases
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_unique_pending
  ON purchases (user_id, course_id, transaction_id)
  WHERE status = 'pending';

-- ============================================
-- 6. FIX YOUR CURRENT PURCHASE
-- If you have a pending purchase that should be completed,
-- run the self-healing function for your user:
-- ============================================

-- First, let's see all pending purchases:
SELECT id, user_id, course_id, amount, status, transaction_id, purchased_at
FROM purchases 
WHERE status = 'pending'
ORDER BY purchased_at DESC;

-- To manually confirm a specific pending purchase, run:
-- UPDATE purchases SET status = 'completed', webhook_verified = true, webhook_verified_at = NOW() WHERE id = '<purchase-id-from-above>';
-- INSERT INTO enrollments (user_id, course_id, status) VALUES ('<user-id>', '<course-id>', 'active') ON CONFLICT (user_id, course_id) DO UPDATE SET status = 'active';

DO $$ 
BEGIN
  RAISE NOTICE 'Purchase pipeline fixes applied successfully!';
  RAISE NOTICE 'Check the SELECT results above for any pending purchases that need manual confirmation.';
END $$;
