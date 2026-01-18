-- ============================================
-- DSA Smart Start - Seed Published Courses
-- ============================================
-- Run this in Supabase SQL Editor to add courses
-- These courses will be visible on the public courses page

-- First, delete existing courses (optional, remove if you want to keep existing)
-- DELETE FROM courses;

-- Insert Premium Programs
INSERT INTO courses (id, title, description, level, thumbnail_url, pricing, modules, is_published, is_draft, published_at, created_at, updated_at, admin_notes)
VALUES 
  (
    'premium-001',
    'DSA SMART START - PREMIUM PATHWAY',
    'The PREMIUM DSA Smart Start Pathway Option B is a complete and innovative program designed for students with SLD who want to learn English in a clear, stimulating, and frustration-free way. Through a multisensory method and high-readability materials, the pathway combines individual lessons, group workshops, mind maps, and video lessons to make learning easier and more effective. The DSA Smart Start Method is the only one that integrates socialization, specific support tools, and a gradual approach, to guide students step by step, with confidence and motivation.',
    'Premium',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
    '{"price": 1050, "currency": "EUR", "isFree": false, "discountPrice": 750, "discountStartDate": "2026-01-01T00:00:00Z", "discountEndDate": "2026-12-31T23:59:59Z"}'::jsonb,
    '[]'::jsonb,
    true,
    false,
    NOW(),
    NOW(),
    NOW(),
    'Premium flagship program'
  ),
  (
    'gold-001',
    'DSA SMART START - GOLD PATHWAY',
    'The GOLD DSA Smart Start Pathway is a structured and innovative program designed for students with SLD who want to learn English in a clear, engaging, and frustration-free way. Thanks to a multisensory and high-readability method, the pathway combines interactive group lessons, mind maps, video lessons, and dedicated materials to make learning easier and more effective. The DSA Smart Start method is the only one that combines socialization, specific support tools, and a step-by-step approach, to guide students in their learning journey with confidence and motivation.',
    'Gold',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
    '{"price": 950, "currency": "EUR", "isFree": false, "discountPrice": 626, "discountStartDate": "2026-01-01T00:00:00Z", "discountEndDate": "2026-12-31T23:59:59Z"}'::jsonb,
    '[]'::jsonb,
    true,
    false,
    NOW(),
    NOW(),
    NOW(),
    'Gold comprehensive program'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  pricing = EXCLUDED.pricing,
  is_published = EXCLUDED.is_published,
  is_draft = EXCLUDED.is_draft,
  updated_at = NOW();

-- Insert Adult Level Courses (A1, A2, B1)
INSERT INTO courses (id, title, description, level, thumbnail_url, pricing, modules, is_published, is_draft, published_at, created_at, updated_at, admin_notes)
VALUES 
  (
    'a1-001',
    'DSA SMART START - A1 LEVEL',
    'The DSA Smart Start Level A1 volume is designed to guide students with Specific Learning Disabilities (SLD) in their first steps in learning English. Thanks to a visual, multisensory, and inclusive approach, each teaching unit is designed to facilitate comprehension, memorization, and active use of the language, making the learning experience accessible and motivating. This program represents the first level of the DSA Smart Start program, a method that integrates effective learning techniques, visual supports, and personalized strategies. Suitable for students aged 8 and up, parents, support teachers and learning tutors.',
    'A1',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
    '{"price": 100, "currency": "EUR", "isFree": false, "discountPrice": 50, "discountStartDate": "2026-01-01T00:00:00Z", "discountEndDate": "2026-12-31T23:59:59Z"}'::jsonb,
    '[{"id": "a1-m1", "title": "Foundations of Being", "description": "Master the basics of English pronouns and the verb TO BE", "order": 1, "lessons": [{"id": "a1-g1", "title": "Unit 1: Subject pronouns and the verb TO BE", "duration": "15m", "type": "video", "order": 1}, {"id": "a1-g2", "title": "Unit 2: Plural nouns regular and irregular", "duration": "12m", "type": "video", "order": 2}, {"id": "a1-g3", "title": "Unit 3: Past simple of the verb TO BE", "duration": "14m", "type": "video", "order": 3}], "homework": []}]'::jsonb,
    true,
    false,
    NOW(),
    NOW(),
    NOW(),
    'Flagship beginner course - Cambridge A1 prep'
  ),
  (
    'a2-001',
    'DSA SMART START - A2 LEVEL',
    'The DSA Smart Start Level A2 volume is designed to guide students with Specific Learning Disabilities (SLD) in consolidating acquired language skills and introducing more complex grammatical structures. Thanks to a visual, multisensory, and inclusive approach, each teaching unit is structured to facilitate comprehension, memorization, and active use of the language, making the learning experience accessible and motivating. This level follows the Cambridge English A2 Key (KET) preparation. Suitable for students aged 9 and up.',
    'A2',
    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
    '{"price": 100, "currency": "EUR", "isFree": false, "discountPrice": 50, "discountStartDate": "2026-01-01T00:00:00Z", "discountEndDate": "2026-12-31T23:59:59Z"}'::jsonb,
    '[{"id": "a2-m1", "title": "Narrative & Flow", "description": "Master the art of storytelling in English", "order": 1, "lessons": [{"id": "a2-g1", "title": "Unit 1: Present simple vs present continuous", "duration": "15m", "type": "video", "order": 1}], "homework": []}]'::jsonb,
    true,
    false,
    NOW(),
    NOW(),
    NOW(),
    'Cambridge A2 KET prep course'
  ),
  (
    'b1-001',
    'DSA SMART START - B1 LEVEL',
    'The DSA Smart Start Level B1 volume is designed to guide students with Specific Learning Disabilities (SLD) in an intermediate phase of English learning. This level introduces more advanced grammatical structures and promotes the development of 4 skills: listening, reading, writing, and speaking. This level follows the Cambridge English B1 Preliminary (PET) preparation. Suitable for students aged 10 and up.',
    'B1',
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
    '{"price": 100, "currency": "EUR", "isFree": false, "discountPrice": 50, "discountStartDate": "2026-01-01T00:00:00Z", "discountEndDate": "2026-12-31T23:59:59Z"}'::jsonb,
    '[{"id": "b1-m1", "title": "Perfect Aspects", "description": "Master perfect tenses and continuous aspects", "order": 1, "lessons": [{"id": "b1-g1", "title": "Unit 1: Present perfect continuous", "duration": "16m", "type": "video", "order": 1}], "homework": []}]'::jsonb,
    true,
    false,
    NOW(),
    NOW(),
    NOW(),
    'Cambridge B1 PET prep course'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  pricing = EXCLUDED.pricing,
  modules = EXCLUDED.modules,
  is_published = EXCLUDED.is_published,
  is_draft = EXCLUDED.is_draft,
  updated_at = NOW();

-- Insert Kids Courses
INSERT INTO courses (id, title, description, level, thumbnail_url, pricing, modules, is_published, is_draft, published_at, created_at, updated_at, admin_notes)
VALUES 
  (
    'kids-basic-001',
    'DSA SMART START KIDS - BASIC LEVEL',
    'Introduction to English through songs, visuals, and sensory exploration. Perfect for early years learners with dyslexia. A fun and engaging way to start learning English.',
    'Kids',
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800',
    '{"price": 99, "currency": "EUR", "isFree": false}'::jsonb,
    '[]'::jsonb,
    true,
    false,
    NOW(),
    NOW(),
    NOW(),
    'Kids basic level - early years'
  ),
  (
    'kids-medium-001',
    'DSA SMART START KIDS - MEDIUM LEVEL',
    'Interactive storytelling and vocabulary games for active focus. Build on basic skills with engaging activities designed for young learners with learning differences.',
    'Kids',
    'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=800',
    '{"price": 99, "currency": "EUR", "isFree": false}'::jsonb,
    '[]'::jsonb,
    true,
    false,
    NOW(),
    NOW(),
    NOW(),
    'Kids medium level - primary'
  ),
  (
    'kids-advanced-001',
    'DSA SMART START KIDS - ADVANCED LEVEL',
    'Preparing for school success with advanced visual mnemonics. Perfect for pre-teens ready to take their English skills to the next level with dyslexia-friendly methods.',
    'Kids',
    'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800',
    '{"price": 99, "currency": "EUR", "isFree": false}'::jsonb,
    '[]'::jsonb,
    true,
    false,
    NOW(),
    NOW(),
    NOW(),
    'Kids advanced level - pre-teen'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  pricing = EXCLUDED.pricing,
  is_published = EXCLUDED.is_published,
  is_draft = EXCLUDED.is_draft,
  updated_at = NOW();

-- Verify courses were inserted
SELECT id, title, level, is_published, 
       (pricing->>'price')::numeric as price,
       (pricing->>'discountPrice')::numeric as discount_price
FROM courses 
WHERE is_published = true
ORDER BY 
  CASE level 
    WHEN 'Premium' THEN 1 
    WHEN 'Gold' THEN 2 
    WHEN 'A1' THEN 3 
    WHEN 'A2' THEN 4 
    WHEN 'B1' THEN 5 
    WHEN 'Kids' THEN 6 
  END;
