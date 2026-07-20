-- ============================================
-- SERVER-SIDE PRICING SUPPORT, DISCOUNT VALIDATION & REFUNDS
-- Date: 2026-07-20
--
-- Adds the server-authoritative pieces the edge functions need so that price,
-- discount and currency can no longer be dictated by the browser, plus a real,
-- guarded refund record with access revocation and an audit trail.
--
-- Safe to re-run.
-- ============================================

-- ── 1. Server-side discount validation ───────────────────────────────
-- Authoritative discount calculation. The edge functions call this (never trust a
-- browser-supplied discount amount); the client may also call it to display the
-- discount. Returns the EUR discount for a given EUR subtotal, or an error.
CREATE OR REPLACE FUNCTION validate_discount(
  p_discount_code_id UUID,
  p_subtotal NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_code   RECORD;
  v_disc   NUMERIC := 0;
BEGIN
  -- No code applied → zero discount, valid.
  IF p_discount_code_id IS NULL THEN
    RETURN jsonb_build_object('valid', true, 'discount_amount', 0, 'discount_code_id', NULL);
  END IF;

  IF p_subtotal IS NULL OR p_subtotal < 0 THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0, 'error', 'Invalid subtotal');
  END IF;

  SELECT * INTO v_code FROM discount_codes WHERE id = p_discount_code_id;

  IF NOT FOUND OR v_code.is_active = false THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0, 'error', 'Discount code is not valid');
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0, 'error', 'Discount code has expired');
  END IF;

  IF v_code.max_uses IS NOT NULL AND v_code.times_used >= v_code.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0, 'error', 'Discount code usage limit reached');
  END IF;

  IF v_code.min_order_amount IS NOT NULL AND p_subtotal < v_code.min_order_amount THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0,
      'error', 'Order does not meet the minimum for this code');
  END IF;

  IF v_code.discount_type = 'percentage' THEN
    v_disc := ROUND(p_subtotal * v_code.discount_value / 100.0, 2);
    IF v_code.max_discount IS NOT NULL AND v_disc > v_code.max_discount THEN
      v_disc := v_code.max_discount;
    END IF;
  ELSE -- 'fixed'
    v_disc := v_code.discount_value;
  END IF;

  -- Never let a discount exceed the order (no negative totals).
  IF v_disc > p_subtotal THEN
    v_disc := p_subtotal;
  END IF;
  IF v_disc < 0 THEN
    v_disc := 0;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'discount_amount', v_disc,
    'discount_code_id', v_code.id,
    'discount_type', v_code.discount_type,
    'discount_value', v_code.discount_value
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION validate_discount(UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION validate_discount(UUID, NUMERIC) TO authenticated, anon, service_role;

-- ── 2. Refund support on purchases ───────────────────────────────────
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS refunded_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_reason     TEXT,
  ADD COLUMN IF NOT EXISTS refund_provider_ref TEXT;

ALTER TABLE purchases
  DROP CONSTRAINT IF EXISTS purchases_refunded_amount_valid;
ALTER TABLE purchases
  ADD CONSTRAINT purchases_refunded_amount_valid
    CHECK (refunded_amount >= 0 AND refunded_amount <= amount);

-- Allow 'purchase' as an audit-log entity type (needed for refund logging).
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_check;
ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_entity_type_check
    CHECK (entity_type IN ('user', 'course', 'module', 'lesson', 'homework', 'enrollment', 'purchase'));

-- ── 3. record_refund — atomic, guarded, revokes access, audited ───────
-- Called ONLY by the refund-purchase edge function (service_role), which verifies
-- the caller is an admin and performs/records the provider-side refund first.
-- Guards against double-refund and over-refund; fully-refunded purchases revoke
-- the enrollment so access is removed.
CREATE OR REPLACE FUNCTION record_refund(
  p_purchase_id UUID,
  p_amount NUMERIC,
  p_provider_ref TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase   RECORD;
  v_new_total  NUMERIC;
  v_fully      BOOLEAN;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Refund amount must be positive');
  END IF;

  SELECT * INTO v_purchase FROM purchases WHERE id = p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase not found');
  END IF;

  IF v_purchase.status NOT IN ('completed', 'refunded') THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Only completed purchases can be refunded');
  END IF;

  v_new_total := COALESCE(v_purchase.refunded_amount, 0) + p_amount;
  IF v_new_total > v_purchase.amount THEN
    RETURN jsonb_build_object('success', false,
      'error', format('Refund exceeds refundable balance (already refunded %s of %s)',
        COALESCE(v_purchase.refunded_amount, 0), v_purchase.amount));
  END IF;

  v_fully := v_new_total >= v_purchase.amount;

  UPDATE purchases
  SET refunded_amount     = v_new_total,
      refunded_at         = NOW(),
      refund_reason       = COALESCE(p_reason, refund_reason),
      refund_provider_ref = COALESCE(p_provider_ref, refund_provider_ref),
      status              = CASE WHEN v_fully THEN 'refunded' ELSE status END
  WHERE id = p_purchase_id;

  -- Fully refunded → revoke course access.
  IF v_fully THEN
    UPDATE enrollments
    SET status = 'revoked'
    WHERE user_id = v_purchase.user_id AND course_id = v_purchase.course_id;
  END IF;

  -- Audit trail (best-effort — never block the refund on a logging failure).
  BEGIN
    INSERT INTO audit_logs (action, entity_type, entity_id, admin_id, admin_name, description)
    VALUES (
      CASE WHEN v_fully THEN 'purchase_refunded_full' ELSE 'purchase_refunded_partial' END,
      'purchase',
      p_purchase_id::text,
      p_admin_id,
      COALESCE((SELECT name FROM users WHERE id = p_admin_id), 'admin'),
      format('Refunded %s (provider ref: %s). Reason: %s',
        p_amount, COALESCE(p_provider_ref, 'n/a'), COALESCE(p_reason, 'n/a'))
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'record_refund audit log insert failed: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', p_purchase_id,
    'refunded_amount', v_new_total,
    'fully_refunded', v_fully
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Only the refund edge function (service_role) may call this. It enforces admin
-- identity itself before calling.
REVOKE EXECUTE ON FUNCTION record_refund(UUID, NUMERIC, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_refund(UUID, NUMERIC, TEXT, TEXT, UUID) TO service_role;

DO $$
BEGIN
  RAISE NOTICE '=== Pricing/discount/refund support (2026-07-20) applied ===';
  RAISE NOTICE 'Added: validate_discount(), record_refund(), purchases.refunded_* columns.';
END $$;
