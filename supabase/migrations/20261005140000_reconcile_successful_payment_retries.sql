-- A bank checkout can fail and then succeed on the same order. A verified paid
-- notification must recover that order, even after a previous failed attempt.
-- Fully refunded purchases remain excluded. Only trusted server callers may
-- invoke these functions; never infer payment success from browser callbacks.

CREATE OR REPLACE FUNCTION public.confirm_purchase_webhook(
  p_transaction_id TEXT,
  p_provider_response JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase RECORD;
  v_purchases_confirmed INTEGER := 0;
  v_enrollments_created INTEGER := 0;
  v_errors JSONB := '[]'::jsonb;
  v_needs_discount_record BOOLEAN;
  v_enrollment_inserted BOOLEAN;
BEGIN
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) = 0 THEN
    RETURN jsonb_build_object(
      'success', false, 'purchases_confirmed', 0, 'enrollments_created', 0,
      'errors', jsonb_build_array('transaction_id is required')
    );
  END IF;

  FOR v_purchase IN
    SELECT id, user_id, course_id, discount_code_id, status, webhook_verified
    FROM purchases
    WHERE transaction_id = p_transaction_id
      AND status IN ('pending', 'failed', 'completed')
    ORDER BY id
    FOR UPDATE
  LOOP
    BEGIN
      -- Failed callbacks also set webhook_verified. That flag alone cannot
      -- tell us whether the discount has been used by a successful payment.
      v_needs_discount_record := v_purchase.status <> 'completed'
        OR NOT COALESCE(v_purchase.webhook_verified, false);

      UPDATE purchases
      SET status = 'completed',
          webhook_verified = true,
          webhook_verified_at = NOW(),
          payment_provider_response = COALESCE(p_provider_response, payment_provider_response)
      WHERE id = v_purchase.id;

      WITH ins AS (
        INSERT INTO enrollments (user_id, course_id, status)
        VALUES (v_purchase.user_id, v_purchase.course_id, 'active')
        ON CONFLICT (user_id, course_id)
        DO UPDATE SET status = 'active', enrolled_at = NOW()
        -- A duplicate success must not restart an active course or undo an
        -- administrator's later revocation. A genuinely new/retried purchase
        -- can reactivate an existing enrollment.
        WHERE v_purchase.status <> 'completed'
          OR NOT COALESCE(v_purchase.webhook_verified, false)
        RETURNING (xmax = 0) AS inserted
      )
      SELECT inserted INTO v_enrollment_inserted FROM ins;

      IF v_enrollment_inserted THEN
        v_enrollments_created := v_enrollments_created + 1;
      END IF;

      IF v_needs_discount_record AND v_purchase.discount_code_id IS NOT NULL THEN
        -- The purchase row lock serializes retries. Older installations do not
        -- have a unique purchase_id constraint on discount_code_uses.
        INSERT INTO discount_code_uses (discount_code_id, user_id, purchase_id)
        SELECT v_purchase.discount_code_id, v_purchase.user_id, v_purchase.id
        WHERE NOT EXISTS (
          SELECT 1 FROM discount_code_uses WHERE purchase_id = v_purchase.id
        )
        ON CONFLICT DO NOTHING;
      END IF;

      v_purchases_confirmed := v_purchases_confirmed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'purchase_id', v_purchase.id, 'sqlstate', SQLSTATE, 'message', SQLERRM
      ));
    END;
  END LOOP;

  IF v_purchases_confirmed = 0 AND jsonb_array_length(v_errors) = 0 THEN
    RETURN jsonb_build_object(
      'success', false, 'purchases_confirmed', 0, 'enrollments_created', 0,
      'errors', jsonb_build_array('No eligible purchase found for transaction_id')
    );
  END IF;

  IF jsonb_array_length(v_errors) > 0 THEN
    RAISE EXCEPTION 'confirm_purchase_webhook partial failure: %', v_errors::text
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'purchases_confirmed', v_purchases_confirmed,
    'enrollments_created', v_enrollments_created, 'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.fail_purchase_webhook(
  p_transaction_id TEXT,
  p_provider_response JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase_ids UUID[];
BEGIN
  -- Use the same lock order as confirmation for concurrent multi-item events.
  PERFORM id FROM purchases
  WHERE transaction_id = p_transaction_id AND status = 'pending'
  ORDER BY id FOR UPDATE;

  -- Keep the status predicate on the UPDATE itself. A concurrent confirmation
  -- must not be overwritten after an earlier SELECT saw a pending purchase.
  -- Update the whole cart, rather than an arbitrary single item.
  WITH failed AS (
    UPDATE purchases
    SET status = 'failed',
        webhook_verified = true,
        webhook_verified_at = NOW(),
        payment_provider_response = COALESCE(p_provider_response, payment_provider_response)
    WHERE transaction_id = p_transaction_id AND status = 'pending'
    RETURNING id
  )
  SELECT array_agg(id) INTO v_purchase_ids FROM failed;

  IF v_purchase_ids IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase not found or already processed');
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'purchase_id', v_purchase_ids[1],
    'purchases_failed', cardinality(v_purchase_ids)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.confirm_purchase_webhook(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_purchase_webhook(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_purchase_webhook(TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_purchase_webhook(TEXT, JSONB) TO service_role;
