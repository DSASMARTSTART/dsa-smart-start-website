-- ============================================
-- RESTORE REAL PRICES (manual, NOT auto-applied)
-- Date: 2026-07-06
--
-- Reverts the €1 test pricing left by
-- 20260218000000_set_all_prices_to_1eur_for_testing.sql for the products that
-- were never re-priced afterwards: interactive/learndash courses, and any legacy
-- services / teaching-materials still priced at €1.
--
-- SAFETY: every statement only rewrites rows whose price is currently exactly 1,
-- so it will NOT clobber prices that later migrations already restored (e-books,
-- live courses). Run inside the transaction below, review the final SELECT, then
-- COMMIT (or ROLLBACK if anything looks off).
--
-- Prices below are the original seed values. Adjust any that no longer match your
-- current price list, then run the whole file in the Supabase SQL editor.
-- ============================================

BEGIN;

-- ── Interactive / LearnDash courses (adults & teens) ─────────────────
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '79'::jsonb),  updated_at = NOW()
  WHERE product_type = 'learndash' AND target_audience = 'adults_teens' AND level = 'A1' AND (pricing->>'price')::numeric = 1;
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '89'::jsonb),  updated_at = NOW()
  WHERE product_type = 'learndash' AND target_audience = 'adults_teens' AND level = 'A2' AND (pricing->>'price')::numeric = 1;
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '99'::jsonb),  updated_at = NOW()
  WHERE product_type = 'learndash' AND target_audience = 'adults_teens' AND level = 'B1' AND (pricing->>'price')::numeric = 1;
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '119'::jsonb), updated_at = NOW()
  WHERE product_type = 'learndash' AND target_audience = 'adults_teens' AND level = 'B2' AND (pricing->>'price')::numeric = 1;

-- ── Interactive / LearnDash courses (kids) ───────────────────────────
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '59'::jsonb), updated_at = NOW()
  WHERE product_type = 'learndash' AND target_audience = 'kids' AND level = 'kids-basic'    AND (pricing->>'price')::numeric = 1;
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '69'::jsonb), updated_at = NOW()
  WHERE product_type = 'learndash' AND target_audience = 'kids' AND level = 'kids-medium'   AND (pricing->>'price')::numeric = 1;
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '79'::jsonb), updated_at = NOW()
  WHERE product_type = 'learndash' AND target_audience = 'kids' AND level = 'kids-advanced' AND (pricing->>'price')::numeric = 1;

-- ── Any remaining interactive course still at €1 (safety net, generic default) ──
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '79'::jsonb), updated_at = NOW()
  WHERE product_type = 'learndash' AND (pricing->>'price')::numeric = 1;

-- ── Legacy services still at €1 (Premium / Golden original seed values) ──
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '530'::jsonb), updated_at = NOW()
  WHERE product_type = 'service' AND (pricing->>'price')::numeric = 1
    AND (title ILIKE '%premium%' OR level ILIKE '%premium%');
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '600'::jsonb), updated_at = NOW()
  WHERE product_type = 'service' AND (pricing->>'price')::numeric = 1
    AND (title ILIKE '%gold%' OR level ILIKE '%gold%');
-- Any other service still at €1 → generic default.
UPDATE courses SET pricing = jsonb_set(pricing, '{price}', '199'::jsonb), updated_at = NOW()
  WHERE product_type = 'service' AND (pricing->>'price')::numeric = 1;

-- ── teaching_materials_price left at €1 by the wipe ──────────────────
UPDATE courses SET teaching_materials_price = 50, updated_at = NOW()
  WHERE teaching_materials_price = 1;

-- Show what remains at €1 after the fix (should be empty for published products).
SELECT product_type, target_audience, level, title, pricing->>'price' AS price
FROM courses
WHERE is_published = true
  AND COALESCE((pricing->>'isFree')::boolean, false) = false
  AND (pricing->>'price')::numeric = 1
ORDER BY product_type, level;

-- Review the output above. COMMIT if empty/correct; otherwise ROLLBACK and edit.
COMMIT;
