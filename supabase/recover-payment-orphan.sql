-- ============================================
-- RECOVER: Manually backfill a paid-but-not-granted RaiAccept purchase.
--
-- USE ONLY AFTER:
--   1. You have confirmed the payment in your RaiAccept merchant portal
--      (real money was received).
--   2. You have run diagnose-payment-orphan.sql and confirmed there is
--      NO existing purchase row for this attempt.
--
-- BEFORE RUNNING: replace every <PLACEHOLDER> below with real values
-- captured from the RaiAccept order page or payment-webhook logs.
-- ============================================

BEGIN;

-- ── Inputs ─────────────────────────────────────
-- Edit these and run as a single transaction.
DO $$
DECLARE
  v_user_email      TEXT  := '<USER_EMAIL>';
  v_course_title    TEXT  := '<EXACT_COURSE_TITLE_OR_USE_ID>';
  v_amount          DECIMAL := <AMOUNT_PAID_EUR>;
  v_currency        TEXT  := 'EUR';
  v_transaction_id  TEXT  := '<RAIACCEPT_MERCHANT_ORDER_REFERENCE>'; -- our orderId
  v_provider_resp   JSONB := jsonb_build_object(
                               'manual_backfill', true,
                               'reason', 'edge function silently failed; payment confirmed in RaiAccept portal',
                               'backfilled_at', NOW()
                             );

  v_user_id   UUID;
  v_course_id UUID;
  v_purchase_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = v_user_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User % not found', v_user_email;
  END IF;

  SELECT id INTO v_course_id FROM courses WHERE title = v_course_title;
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Course "%" not found (use exact title or paste the UUID directly)', v_course_title;
  END IF;

  -- Guard: don't double-insert if a row somehow appeared between diagnose and recover
  IF EXISTS (
    SELECT 1 FROM purchases
     WHERE user_id = v_user_id
       AND course_id = v_course_id
       AND transaction_id = v_transaction_id
  ) THEN
    RAISE EXCEPTION 'Purchase already exists for this transaction; aborting to avoid duplicate.';
  END IF;

  INSERT INTO purchases (
    user_id, course_id, amount, original_amount, discount_amount,
    currency, payment_method, transaction_id,
    status, webhook_verified, webhook_verified_at,
    payment_provider_response, purchased_at
  ) VALUES (
    v_user_id, v_course_id, v_amount, v_amount, 0,
    v_currency, 'card', v_transaction_id,
    'completed', true, NOW(),
    v_provider_resp, NOW()
  )
  RETURNING id INTO v_purchase_id;

  INSERT INTO enrollments (user_id, course_id, status, enrolled_at)
  VALUES (v_user_id, v_course_id, 'active', NOW())
  ON CONFLICT (user_id, course_id)
  DO UPDATE SET status = 'active', enrolled_at = NOW();

  RAISE NOTICE 'Backfilled purchase % for user % / course %', v_purchase_id, v_user_id, v_course_id;
END $$;

-- Inspect before committing.
-- If everything looks correct, run COMMIT;  otherwise ROLLBACK;
COMMIT;

-- ── After commit (optional): trigger invoice generation ──
-- Run this from a shell where you have a Supabase service-role token, NOT in SQL Editor:
--
--   curl -X POST "$SUPABASE_URL/functions/v1/generate-invoice" \
--        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
--        -H "Content-Type: application/json" \
--        -d '{"transactionId":"<RAIACCEPT_MERCHANT_ORDER_REFERENCE>","paymentMethod":"card"}'
