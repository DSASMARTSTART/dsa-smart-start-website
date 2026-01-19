-- ============================================
-- DELETE KIDS INTERACTIVE COURSES
-- Keep only Adults & Teens LearnDash (A1, A2, B1, B2)
-- ============================================

-- Delete Kids LearnDash courses (keep Kids E-books)
DELETE FROM courses 
WHERE product_type = 'learndash' 
  AND target_audience = 'kids';

-- Verify remaining LearnDash courses (should be 4: A1, A2, B1, B2)
-- SELECT title, level, product_type, target_audience, is_published 
-- FROM courses 
-- WHERE product_type = 'learndash'
-- ORDER BY level;
