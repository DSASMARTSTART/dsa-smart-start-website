-- ============================================
-- CLEANUP: Remove old courses from database
-- Keep only the new catalog structure
-- ============================================

-- Delete old courses that don't match new naming convention
-- Old courses have titles like "English A1 - Foundation", "Premium Pathway", etc.
-- New courses have titles like "A1 Beginner - Interactive Course", "Premium Program", etc.

-- Delete old LearnDash courses (they have old-style titles)
DELETE FROM courses 
WHERE title LIKE 'English %' 
   OR title LIKE '% Pathway%'
   OR title LIKE 'English for Kids%';

-- Delete any courses with old-style levels that shouldn't exist in new structure
DELETE FROM courses 
WHERE level = 'Kids' AND product_type = 'learndash';

-- Verify what remains (should be our new catalog):
-- E-books: 7 (4 adults + 3 kids)
-- LearnDash: 4 (A1, A2, B1, B2 - all adults_teens)
-- Services: 2 (Premium, Golden)
-- Total: 13 courses

-- SELECT title, level, product_type, target_audience, is_published, pricing->>'price' as price
-- FROM courses 
-- ORDER BY product_type, target_audience, level;
