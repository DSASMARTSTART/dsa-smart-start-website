-- ============================================
-- PUBLISH EBOOKS & LIVE COURSES FOR SALE
-- Date: 2026-03-02
--
-- This migration ensures:
--   1. All adult e-books (A1, A2, B1) are published with sale pricing
--   2. B2 e-book is published as "Coming Soon" (no ebook_pdf_url)
--   3. All kids e-books are published with sale pricing
--   4. All live courses (service) are published
--   5. Interactive (learndash) courses remain drafted
-- ============================================

-- ============================================
-- 1. ENSURE B2 E-BOOK EXISTS
--    If it doesn't exist (e.g. seed never ran), insert it.
-- ============================================
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules,
  ebook_pdf_url,
  is_published, is_draft, created_at, updated_at
)
SELECT
  uuid_generate_v4(),
  'B2 Upper-Intermediate E-book',
  'Master advanced English with our comprehensive B2 e-book. Perfect for those aiming for fluency in professional and academic contexts.',
  'B2',
  'ebook',
  'adults_teens',
  'pdf',
  '/assets/courses/ebook-b2.jpg',
  '{"price": 45, "currency": "EUR", "isFree": false}'::jsonb,
  '[]'::jsonb,
  NULL,   -- No PDF = Coming Soon
  true,   -- Published so it shows on the page
  false,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM courses
  WHERE product_type = 'ebook'
    AND target_audience = 'adults_teens'
    AND level = 'B2'
);

-- ============================================
-- 2. ADULTS & TEENS E-BOOKS — Publish with Sale Pricing
-- ============================================

-- A1 E-book: €35 (was €60)
UPDATE courses
SET pricing = '{"price": 60, "discountPrice": 35, "currency": "EUR", "isFree": false}'::jsonb,
    is_published = true,
    is_draft = false,
    ebook_pdf_url = COALESCE(ebook_pdf_url, 'pending-upload'),
    updated_at = NOW()
WHERE product_type = 'ebook'
  AND target_audience = 'adults_teens'
  AND level = 'A1';

-- A2 E-book: €35 (was €70)
UPDATE courses
SET pricing = '{"price": 70, "discountPrice": 35, "currency": "EUR", "isFree": false}'::jsonb,
    is_published = true,
    is_draft = false,
    ebook_pdf_url = COALESCE(ebook_pdf_url, 'pending-upload'),
    updated_at = NOW()
WHERE product_type = 'ebook'
  AND target_audience = 'adults_teens'
  AND level = 'A2';

-- B1 E-book: €35 (was €85)
UPDATE courses
SET pricing = '{"price": 85, "discountPrice": 35, "currency": "EUR", "isFree": false}'::jsonb,
    is_published = true,
    is_draft = false,
    ebook_pdf_url = COALESCE(ebook_pdf_url, 'pending-upload'),
    updated_at = NOW()
WHERE product_type = 'ebook'
  AND target_audience = 'adults_teens'
  AND level = 'B1';

-- B2 E-book: COMING SOON — published but NO PDF url, no discount
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
-- 3. KIDS E-BOOKS — Publish with Sale Pricing
-- ============================================

-- Kids Basic (Starters): €35 (was €60)
UPDATE courses
SET pricing = '{"price": 60, "discountPrice": 35, "currency": "EUR", "isFree": false}'::jsonb,
    is_published = true,
    is_draft = false,
    ebook_pdf_url = COALESCE(ebook_pdf_url, 'pending-upload'),
    updated_at = NOW()
WHERE product_type = 'ebook'
  AND target_audience = 'kids'
  AND level = 'kids-basic';

-- Kids Medium (Movers): €35 (was €65)
UPDATE courses
SET pricing = '{"price": 65, "discountPrice": 35, "currency": "EUR", "isFree": false}'::jsonb,
    is_published = true,
    is_draft = false,
    ebook_pdf_url = COALESCE(ebook_pdf_url, 'pending-upload'),
    updated_at = NOW()
WHERE product_type = 'ebook'
  AND target_audience = 'kids'
  AND level = 'kids-medium';

-- Kids Advanced (Flyers): €35 (was €70)
UPDATE courses
SET pricing = '{"price": 70, "discountPrice": 35, "currency": "EUR", "isFree": false}'::jsonb,
    is_published = true,
    is_draft = false,
    ebook_pdf_url = COALESCE(ebook_pdf_url, 'pending-upload'),
    updated_at = NOW()
WHERE product_type = 'ebook'
  AND target_audience = 'kids'
  AND level = 'kids-advanced';

-- ============================================
-- 4. LIVE COURSES — Publish all service courses
-- ============================================
UPDATE courses
SET is_published = true,
    is_draft = false,
    updated_at = NOW()
WHERE product_type = 'service';

-- ============================================
-- 5. INTERACTIVE COURSES — Keep drafted
-- ============================================
UPDATE courses
SET is_published = false,
    is_draft = true,
    updated_at = NOW()
WHERE product_type = 'learndash';

-- ============================================
-- 6. Verify final state
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
    RAISE NOTICE '% | % | % | pub=% draft=% | price=% sale=% | pdf=%',
      r.title, r.product_type, r.target_audience,
      r.is_published, r.is_draft,
      r.original_price, COALESCE(r.sale_price, 'N/A'),
      COALESCE(r.ebook_pdf_url, 'NULL (Coming Soon)');
  END LOOP;
END $$;
