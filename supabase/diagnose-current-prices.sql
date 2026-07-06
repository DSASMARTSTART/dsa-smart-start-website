-- ============================================
-- DIAGNOSTIC (READ-ONLY): current catalog prices
-- Date: 2026-07-06
--
-- Purpose: establish ground truth before running restore-real-prices.sql.
-- The testing migration 20260218000000_set_all_prices_to_1eur_for_testing.sql
-- set every non-free price to €1. Later migrations (20260228*, 20260302*)
-- re-priced e-books and inserted live courses at real prices, but the
-- interactive/learndash courses (and any legacy services) were NEVER
-- re-priced after the wipe — so they are the products still at risk of €1.
--
-- This script only SELECTs. It changes nothing. Run it in the Supabase SQL
-- editor and read the output before applying any fix.
-- ============================================

-- 1. Every sellable product with its current price. Anything showing price = 1
--    (and not intentionally a €1 promo) is a live pricing bug.
SELECT
  product_type,
  target_audience,
  level,
  title,
  is_published,
  is_draft,
  pricing->>'price'          AS price,
  pricing->>'discountPrice'  AS discount_price,
  pricing->>'currency'       AS currency,
  (pricing->>'isFree')       AS is_free,
  teaching_materials_price
FROM courses
WHERE COALESCE((pricing->>'isFree')::boolean, false) = false
ORDER BY product_type, target_audience, level, title;

-- 2. Fast red-flag count: published, non-free products currently priced at €1.
--    Expected to be > 0 for interactive/learndash if the wipe is still in effect.
SELECT
  product_type,
  count(*) AS products_at_1_eur
FROM courses
WHERE is_published = true
  AND COALESCE((pricing->>'isFree')::boolean, false) = false
  AND (pricing->>'price')::numeric = 1
GROUP BY product_type
ORDER BY product_type;
