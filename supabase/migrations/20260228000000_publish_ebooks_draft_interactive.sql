-- ============================================
-- PUBLISH E-BOOKS WITH SALE PRICING
-- DRAFT ALL INTERACTIVE COURSES
-- Date: 2026-02-28
--
-- This migration:
--   1. Sets all interactive (learndash) courses to draft
--   2. Publishes all e-books with correct sale pricing
--   3. B2 e-book is published as "Coming Soon" (no ebook_pdf_url)
--   4. "Limited Time Offer" banners auto-appear via discountPrice
-- ============================================

-- ============================================
-- 1. DRAFT ALL INTERACTIVE COURSES
-- ============================================
UPDATE courses
SET is_published = false,
    is_draft = true,
    updated_at = NOW()
WHERE product_type = 'learndash';

-- ============================================
-- 2. ADULTS & TEENS E-BOOKS — Sale Pricing
-- ============================================

-- A1 E-book: €35 (was €60)
UPDATE courses
SET pricing = '{"price": 60, "discountPrice": 35, "currency": "EUR", "isFree": false}'::jsonb,
    is_published = true,
    is_draft = false,
    updated_at = NOW()
WHERE product_type = 'ebook'
  AND target_audience = 'adults_teens'
  AND level = 'A1';

-- A2 E-book: €35 (was €70)
UPDATE courses
SET pricing = '{"price": 70, "discountPrice": 35, "currency": "EUR", "isFree": false}'::jsonb,
    is_published = true,
    is_draft = false,
    updated_at = NOW()
WHERE product_type = 'ebook'
  AND target_audience = 'adults_teens'
  AND level = 'A2';

-- B1 E-book: €35 (was €85)
UPDATE courses
SET pricing = '{"price": 85, "discountPrice": 35, "currency": "EUR", "isFree": false}'::jsonb,
    is_published = true,
    is_draft = false,
    updated_at = NOW()
WHERE product_type = 'ebook'
  AND target_audience = 'adults_teens'
  AND level = 'B1';

-- B2 E-book: COMING SOON (published but no PDF, no discount price)
UPDATE courses
SET pricing = '{"price": 45, "currency": "EUR", "isFree": false}'::jsonb,
    is_published = true,
    is_draft = false,
    ebook_pdf_url = NULL,
    updated_at = NOW()
WHERE product_type = 'ebook'
  AND target_audience = 'adults_teens'
  AND level = 'B2';

-- ============================================
-- 3. KIDS E-BOOKS — Sale Pricing
-- ============================================

-- Kids Basic (Starters): €35 (was €60)
UPDATE courses
SET pricing = '{"price": 60, "discountPrice": 35, "currency": "EUR", "isFree": false}'::jsonb,
    is_published = true,
    is_draft = false,
    updated_at = NOW()
WHERE product_type = 'ebook'
  AND target_audience = 'kids'
  AND level = 'kids-basic';

-- Kids Medium (Movers): €35 (was €65)
UPDATE courses
SET pricing = '{"price": 65, "discountPrice": 35, "currency": "EUR", "isFree": false}'::jsonb,
    is_published = true,
    is_draft = false,
    updated_at = NOW()
WHERE product_type = 'ebook'
  AND target_audience = 'kids'
  AND level = 'kids-medium';

-- Kids Advanced (Flyers): €35 (was €70)
UPDATE courses
SET pricing = '{"price": 70, "discountPrice": 35, "currency": "EUR", "isFree": false}'::jsonb,
    is_published = true,
    is_draft = false,
    updated_at = NOW()
WHERE product_type = 'ebook'
  AND target_audience = 'kids'
  AND level = 'kids-advanced';

-- ============================================
-- 4. Also draft any service products for now
-- ============================================
UPDATE courses
SET is_published = false,
    is_draft = true,
    updated_at = NOW()
WHERE product_type = 'service';

-- ============================================
-- 5. Verify changes
-- ============================================
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== PRODUCT STATUS AFTER MIGRATION ===';
  FOR r IN
    SELECT title, 
           level,
           product_type,
           target_audience,
           is_published,
           is_draft,
           pricing->>'price' AS original_price,
           pricing->>'discountPrice' AS sale_price,
           pricing->>'currency' AS currency,
           ebook_pdf_url
    FROM courses
    ORDER BY product_type, target_audience, level
  LOOP
    RAISE NOTICE '% | % | pub=% draft=% | price=% sale=% % | pdf=%',
      r.title, r.product_type, r.is_published, r.is_draft,
      r.original_price, COALESCE(r.sale_price, 'N/A'), r.currency,
      COALESCE(r.ebook_pdf_url, 'NULL');
  END LOOP;
END $$;
