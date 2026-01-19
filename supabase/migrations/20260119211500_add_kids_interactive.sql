-- ============================================
-- ADD KIDS INTERACTIVE COURSES
-- Basic, Medium, Advanced for Kids
-- ============================================

-- Kids Basic Interactive Course
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'Kids Basic - Interactive Course',
  'Fun animated lessons for young beginners! Games, songs, and interactive activities make learning English an adventure. Perfect for children just starting their English journey.',
  'kids-basic',
  'learndash',
  'kids',
  'interactive',
  '/assets/courses/learndash-kids-basic.jpg',
  '{"price": 59, "currency": "EUR", "isFree": false}',
  '[{"id": "mod-kids-basic-1", "title": "Hello English!", "description": "First steps in English", "lessons": [], "order": 1}]',
  true,
  false,
  NOW(),
  NOW()
);

-- Kids Medium Interactive Course
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'Kids Medium - Interactive Course',
  'Continue the fun with more challenging content! Story-based learning, creative exercises, and interactive quizzes for growing learners ready to expand their English skills.',
  'kids-medium',
  'learndash',
  'kids',
  'interactive',
  '/assets/courses/learndash-kids-medium.jpg',
  '{"price": 69, "currency": "EUR", "isFree": false}',
  '[{"id": "mod-kids-medium-1", "title": "Stories & Adventures", "description": "Learn through stories", "lessons": [], "order": 1}]',
  true,
  false,
  NOW(),
  NOW()
);

-- Kids Advanced Interactive Course
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, is_published, is_draft, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'Kids Advanced - Interactive Course',
  'Challenge young minds with advanced content! Complex grammar, creative writing projects, and preparation for school English. For confident young learners ready to excel.',
  'kids-advanced',
  'learndash',
  'kids',
  'interactive',
  '/assets/courses/learndash-kids-advanced.jpg',
  '{"price": 79, "currency": "EUR", "isFree": false}',
  '[{"id": "mod-kids-advanced-1", "title": "Becoming Fluent", "description": "Advanced skills for young learners", "lessons": [], "order": 1}]',
  true,
  false,
  NOW(),
  NOW()
);
