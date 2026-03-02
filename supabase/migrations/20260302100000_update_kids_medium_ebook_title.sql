-- ============================================
-- UPDATE KIDS MEDIUM EBOOK TITLE & DESCRIPTION
-- Date: 2026-03-02
--
-- Sets the correct branded title for the kids-medium ebook:
--   "DSA SMART START KIDS – MOVERS EBOOK"
-- Removes any stale "Preparation" wording and ensures
-- the description matches the branded copy.
-- ============================================

UPDATE courses
SET title = 'DSA SMART START KIDS – MOVERS EBOOK',
    description = 'The DSA Smart Start Kids Medium e-book builds on the basics, designed for young learners aged 7-10 who are ready to expand their English skills. Through story-based learning, creative activities, and interactive exercises, children develop reading, writing, and speaking confidence. Every page incorporates dyslexia-friendly methods to support all learning styles.',
    updated_at = NOW()
WHERE product_type = 'ebook'
  AND target_audience = 'kids'
  AND level = 'kids-medium';
