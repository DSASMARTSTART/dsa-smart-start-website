-- ============================================
-- INTERACTIVE COURSE PRICES (off €1) + INSTALLMENT ELIGIBILITY
-- Date: 2026-07-07
--
-- 1. The retired €1 test wipe (20260218…) left interactive/learndash courses and
--    any legacy services priced at €1 (e-books and live courses were re-priced by
--    later migrations, these were not). Set them to real prices. Every UPDATE is
--    scoped to rows still at exactly €1, so it never clobbers a correct price.
-- 2. Enable the UPC installment rail (card_installments) on all non-ebook paid
--    products so the "Pay by installments" option can appear at checkout.
--    Idempotent — only adds the method where it isn't already present.
-- ============================================

-- ── 1. Prices: interactive / learndash courses ──────────────────────
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '79'::jsonb),  updated_at = NOW()
  WHERE product_type = 'learndash' AND target_audience = 'adults_teens' AND level = 'A1' AND (pricing->>'price')::numeric = 1;
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '89'::jsonb),  updated_at = NOW()
  WHERE product_type = 'learndash' AND target_audience = 'adults_teens' AND level = 'A2' AND (pricing->>'price')::numeric = 1;
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '99'::jsonb),  updated_at = NOW()
  WHERE product_type = 'learndash' AND target_audience = 'adults_teens' AND level = 'B1' AND (pricing->>'price')::numeric = 1;
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '119'::jsonb), updated_at = NOW()
  WHERE product_type = 'learndash' AND target_audience = 'adults_teens' AND level = 'B2' AND (pricing->>'price')::numeric = 1;

UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '59'::jsonb), updated_at = NOW()
  WHERE product_type = 'learndash' AND target_audience = 'kids' AND level = 'kids-basic'    AND (pricing->>'price')::numeric = 1;
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '69'::jsonb), updated_at = NOW()
  WHERE product_type = 'learndash' AND target_audience = 'kids' AND level = 'kids-medium'   AND (pricing->>'price')::numeric = 1;
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '79'::jsonb), updated_at = NOW()
  WHERE product_type = 'learndash' AND target_audience = 'kids' AND level = 'kids-advanced' AND (pricing->>'price')::numeric = 1;

-- Any remaining interactive course still at €1 → generic default.
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '79'::jsonb), updated_at = NOW()
  WHERE product_type = 'learndash' AND (pricing->>'price')::numeric = 1;

-- ── 1b. Prices: legacy services still at €1 ─────────────────────────
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '530'::jsonb), updated_at = NOW()
  WHERE product_type = 'service' AND (pricing->>'price')::numeric = 1
    AND (title ILIKE '%premium%' OR level ILIKE '%premium%');
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '600'::jsonb), updated_at = NOW()
  WHERE product_type = 'service' AND (pricing->>'price')::numeric = 1
    AND (title ILIKE '%gold%' OR level ILIKE '%gold%');
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '199'::jsonb), updated_at = NOW()
  WHERE product_type = 'service' AND (pricing->>'price')::numeric = 1;

-- teaching_materials_price left at €1 by the wipe.
UPDATE courses SET teaching_materials_price = 50, updated_at = NOW()
  WHERE teaching_materials_price = 1;

-- ── 2. Installment eligibility on non-ebook paid products ───────────
-- Adds "card_installments" to allowed_payment_methods where absent. The column
-- constraint (20260603…) already whitelists this value, so this is safe.
UPDATE courses
SET allowed_payment_methods = allowed_payment_methods || '["card_installments"]'::jsonb,
    updated_at = NOW()
WHERE product_type IN ('learndash', 'service')
  AND COALESCE((pricing->>'isFree')::boolean, false) = false
  AND NOT (allowed_payment_methods @> '["card_installments"]'::jsonb);

DO $$
BEGIN
  RAISE NOTICE 'Interactive/service prices restored off €1; card_installments enabled on non-ebook paid products.';
END $$;
