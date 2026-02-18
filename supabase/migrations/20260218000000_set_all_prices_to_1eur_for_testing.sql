-- ============================================
-- TESTING: Set all prices to €1 for live payment testing
-- Date: 2026-02-18
--
-- This migration sets every course/product/service price to €1 (EUR).
-- The checkout converts EUR→RSD at the fixed rate (117.15) before
-- sending to RaiAccept, so €1 ≈ 117.15 RSD at the gateway.
--
-- TO REVERT: Run the revert migration or re-seed with real prices.
-- ============================================

-- 1. Update the pricing JSONB for ALL non-free courses:
--    - Set price to 1 EUR
--    - If there's a discountPrice, set it to 1 EUR as well
--    - Keep currency as EUR (display currency), isFree, dates intact

-- Courses/products/services that are NOT free: set price=1, discountPrice=1 (if exists)
UPDATE courses
SET pricing = pricing
  || '{"price": 1, "currency": "EUR"}'::jsonb
  || CASE 
       WHEN pricing ? 'discountPrice' THEN '{"discountPrice": 1}'::jsonb
       ELSE '{}'::jsonb
     END,
    updated_at = NOW()
WHERE (pricing->>'isFree')::boolean IS NOT TRUE;

-- 2. Set teaching_materials_price to €1 where it exists
UPDATE courses
SET teaching_materials_price = 1,
    updated_at = NOW()
WHERE teaching_materials_price IS NOT NULL AND teaching_materials_price > 0;

-- 3. Verify the changes
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== ALL PRICES SET TO €1 (EUR) FOR TESTING ===';
  RAISE NOTICE '=== Card payments will be charged ~117.15 RSD per item ===';
  FOR r IN
    SELECT title, 
           pricing->>'price' AS price,
           pricing->>'currency' AS currency,
           pricing->>'discountPrice' AS discount_price,
           pricing->>'isFree' AS is_free,
           teaching_materials_price
    FROM courses
    ORDER BY title
  LOOP
    RAISE NOTICE '  % | price=% % | discount=% | free=% | materials=%',
      r.title, r.price, r.currency, r.discount_price, r.is_free, r.teaching_materials_price;
  END LOOP;
END $$;
