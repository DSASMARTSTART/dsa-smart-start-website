-- ============================================
-- SEED PRODUCTS: E-books & LearnDash Courses
-- Run this AFTER catalog-migration.sql
-- ============================================

-- ============================================
-- ADULTS & TEENS E-BOOKS (4 products)
-- ============================================

-- A1 E-book
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'A1 Beginner E-book',
  'Complete digital e-book for absolute beginners. Learn English fundamentals with our comprehensive PDF guide covering vocabulary, grammar, and essential phrases.',
  'A1',
  'ebook',
  'adults_teens',
  'pdf',
  '/assets/courses/ebook-a1.jpg',
  '{"price": 29, "currency": "EUR", "isFree": false}',
  '[]', -- E-books don't have interactive modules
  true,
  false,
  NOW(),
  NOW()
);

-- A2 E-book
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'A2 Elementary E-book',
  'Build on your basics with our A2 e-book. Expand your vocabulary, improve grammar, and gain confidence in everyday conversations.',
  'A2',
  'ebook',
  'adults_teens',
  'pdf',
  '/assets/courses/ebook-a2.jpg',
  '{"price": 35, "currency": "EUR", "isFree": false}',
  '[]',
  true,
  false,
  NOW(),
  NOW()
);

-- B1 E-book
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'B1 Intermediate E-book',
  'Take your English to the next level. Our B1 e-book covers complex grammar structures, advanced vocabulary, and professional communication skills.',
  'B1',
  'ebook',
  'adults_teens',
  'pdf',
  '/assets/courses/ebook-b1.jpg',
  '{"price": 39, "currency": "EUR", "isFree": false}',
  '[]',
  true,
  false,
  NOW(),
  NOW()
);

-- B2 E-book (DRAFT - Not published)
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'B2 Upper-Intermediate E-book',
  'Master advanced English with our comprehensive B2 e-book. Perfect for those aiming for fluency in professional and academic contexts.',
  'B2',
  'ebook',
  'adults_teens',
  'pdf',
  '/assets/courses/ebook-b2.jpg',
  '{"price": 45, "currency": "EUR", "isFree": false}',
  '[]',
  false,  -- NOT PUBLISHED
  true,   -- IS DRAFT
  NOW(),
  NOW()
);

-- ============================================
-- KIDS E-BOOKS (3 products)
-- ============================================

-- Kids Basic E-book
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'Kids Basic E-book',
  'Fun and colorful e-book designed for young learners! Introduces basic English through engaging stories, pictures, and simple exercises.',
  'kids-basic',
  'ebook',
  'kids',
  'pdf',
  '/assets/courses/ebook-kids-basic.jpg',
  '{"price": 25, "currency": "EUR", "isFree": false}',
  '[]',
  true,
  false,
  NOW(),
  NOW()
);

-- Kids Medium E-book
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'Kids Medium E-book',
  'Continue the English adventure! This e-book builds vocabulary and introduces more complex sentences through fun activities and games.',
  'kids-medium',
  'ebook',
  'kids',
  'pdf',
  '/assets/courses/ebook-kids-medium.jpg',
  '{"price": 29, "currency": "EUR", "isFree": false}',
  '[]',
  true,
  false,
  NOW(),
  NOW()
);

-- Kids Advanced E-book
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'Kids Advanced E-book',
  'For confident young learners ready to excel! Advanced grammar, expanded vocabulary, and creative writing exercises in a kid-friendly format.',
  'kids-advanced',
  'ebook',
  'kids',
  'pdf',
  '/assets/courses/ebook-kids-advanced.jpg',
  '{"price": 35, "currency": "EUR", "isFree": false}',
  '[]',
  true,
  false,
  NOW(),
  NOW()
);

-- ============================================
-- ADULTS & TEENS LEARNDASH COURSES (4 products)
-- ============================================

-- A1 LearnDash Course
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'A1 Beginner - Interactive Course',
  'Start your English journey with our interactive A1 course. Video lessons, quizzes, and exercises designed for complete beginners.',
  'A1',
  'learndash',
  'adults_teens',
  'interactive',
  '/assets/courses/learndash-a1.jpg',
  '{"price": 79, "currency": "EUR", "isFree": false}',
  '[
    {
      "id": "mod-a1-1",
      "title": "Getting Started",
      "description": "Introduction to English basics",
      "lessons": [],
      "order": 1
    }
  ]',
  true,
  false,
  NOW(),
  NOW()
);

-- A2 LearnDash Course
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'A2 Elementary - Interactive Course',
  'Build on your foundation with our A2 interactive course. Engaging video content, practice exercises, and real-world conversation scenarios.',
  'A2',
  'learndash',
  'adults_teens',
  'interactive',
  '/assets/courses/learndash-a2.jpg',
  '{"price": 89, "currency": "EUR", "isFree": false}',
  '[
    {
      "id": "mod-a2-1",
      "title": "Everyday Conversations",
      "description": "Master daily communication",
      "lessons": [],
      "order": 1
    }
  ]',
  true,
  false,
  NOW(),
  NOW()
);

-- B1 LearnDash Course
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'B1 Intermediate - Interactive Course',
  'Advance your skills with our comprehensive B1 course. Complex grammar, professional vocabulary, and interactive speaking practice.',
  'B1',
  'learndash',
  'adults_teens',
  'interactive',
  '/assets/courses/learndash-b1.jpg',
  '{"price": 99, "currency": "EUR", "isFree": false}',
  '[
    {
      "id": "mod-b1-1",
      "title": "Professional Communication",
      "description": "English for work and study",
      "lessons": [],
      "order": 1
    }
  ]',
  true,
  false,
  NOW(),
  NOW()
);

-- B2 LearnDash Course (DRAFT - Not published)
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'B2 Upper-Intermediate - Interactive Course',
  'Achieve near-fluency with our advanced B2 course. Academic English, nuanced grammar, and sophisticated communication strategies.',
  'B2',
  'learndash',
  'adults_teens',
  'interactive',
  '/assets/courses/learndash-b2.jpg',
  '{"price": 119, "currency": "EUR", "isFree": false}',
  '[
    {
      "id": "mod-b2-1",
      "title": "Advanced Fluency",
      "description": "Master complex English",
      "lessons": [],
      "order": 1
    }
  ]',
  false,  -- NOT PUBLISHED
  true,   -- IS DRAFT
  NOW(),
  NOW()
);

-- ============================================
-- KIDS LEARNDASH COURSES (3 products)
-- ============================================

-- Kids Basic LearnDash Course
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'Kids Basic - Interactive Course',
  'Fun animated lessons for young beginners! Games, songs, and interactive activities make learning English an adventure.',
  'kids-basic',
  'learndash',
  'kids',
  'interactive',
  '/assets/courses/learndash-kids-basic.jpg',
  '{"price": 59, "currency": "EUR", "isFree": false}',
  '[
    {
      "id": "mod-kids-basic-1",
      "title": "Hello English!",
      "description": "First steps in English",
      "lessons": [],
      "order": 1
    }
  ]',
  true,
  false,
  NOW(),
  NOW()
);

-- Kids Medium LearnDash Course
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'Kids Medium - Interactive Course',
  'Continue the fun with more challenging content! Story-based learning, creative exercises, and interactive quizzes for growing learners.',
  'kids-medium',
  'learndash',
  'kids',
  'interactive',
  '/assets/courses/learndash-kids-medium.jpg',
  '{"price": 69, "currency": "EUR", "isFree": false}',
  '[
    {
      "id": "mod-kids-medium-1",
      "title": "Stories & Adventures",
      "description": "Learn through stories",
      "lessons": [],
      "order": 1
    }
  ]',
  true,
  false,
  NOW(),
  NOW()
);

-- Kids Advanced LearnDash Course
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'Kids Advanced - Interactive Course',
  'Challenge young minds with advanced content! Complex grammar, creative writing projects, and preparation for school English.',
  'kids-advanced',
  'learndash',
  'kids',
  'interactive',
  '/assets/courses/learndash-kids-advanced.jpg',
  '{"price": 79, "currency": "EUR", "isFree": false}',
  '[
    {
      "id": "mod-kids-advanced-1",
      "title": "Becoming Fluent",
      "description": "Advanced skills for young learners",
      "lessons": [],
      "order": 1
    }
  ]',
  true,
  false,
  NOW(),
  NOW()
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after to verify:

-- Check all products by type:
-- SELECT title, product_type, target_audience, level, is_published, pricing->>'price' as price 
-- FROM courses 
-- ORDER BY product_type, target_audience, level;

-- Count products by type:
-- SELECT product_type, target_audience, COUNT(*) 
-- FROM courses 
-- GROUP BY product_type, target_audience;
