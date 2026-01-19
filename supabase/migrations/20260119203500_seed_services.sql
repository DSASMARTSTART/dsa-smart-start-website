-- ============================================
-- SEED SERVICES: Premium & Golden Programs
-- ============================================

-- ============================================
-- PREMIUM PROGRAM (€530 + €50 optional materials)
-- ============================================

INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules, 
  teaching_materials_price, teaching_materials_included,
  is_published, is_draft, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'Premium Program',
  'Our comprehensive Premium Program is a structured live online course designed for serious learners. Get access to expert instructors, interactive group sessions, and personalized feedback. This program includes regular live classes, homework assignments, progress tracking, and direct support from our teaching team.

✓ Live online group sessions with expert instructors
✓ Interactive learning with real-time feedback
✓ Structured curriculum with clear milestones
✓ Progress tracking and performance reports
✓ Access to exclusive learning community
✓ Certificate of completion

Optional: Add teaching materials (€50) for the complete learning experience with our comprehensive study guides and workbooks.',
  'premium',
  'service',
  'adults_teens',
  'live',
  '/assets/courses/premium-program.jpg',
  '{"price": 530, "currency": "EUR", "isFree": false}',
  '[
    {"id": "premium-mod-1", "title": "Foundation & Assessment", "description": "Initial assessment and personalized learning path setup", "lessons": [{"id": "premium-l1", "title": "Welcome & Orientation", "type": "live"}, {"id": "premium-l2", "title": "Level Assessment", "type": "live"}, {"id": "premium-l3", "title": "Learning Path Planning", "type": "live"}], "order": 1},
    {"id": "premium-mod-2", "title": "Core Language Skills", "description": "Building strong foundations in all language areas", "lessons": [{"id": "premium-l4", "title": "Grammar Foundations", "type": "live"}, {"id": "premium-l5", "title": "Vocabulary Building", "type": "live"}, {"id": "premium-l6", "title": "Pronunciation Workshop", "type": "live"}], "order": 2},
    {"id": "premium-mod-3", "title": "Practical Communication", "description": "Real-world communication practice", "lessons": [{"id": "premium-l7", "title": "Conversation Practice", "type": "live"}, {"id": "premium-l8", "title": "Listening Comprehension", "type": "live"}, {"id": "premium-l9", "title": "Writing Skills", "type": "live"}], "order": 3},
    {"id": "premium-mod-4", "title": "Advanced Application", "description": "Applying skills in complex scenarios", "lessons": [{"id": "premium-l10", "title": "Professional English", "type": "live"}, {"id": "premium-l11", "title": "Presentations & Public Speaking", "type": "live"}, {"id": "premium-l12", "title": "Final Assessment & Certification", "type": "live"}], "order": 4}
  ]',
  50.00,
  false,
  true,
  false,
  NOW(),
  NOW()
);

-- ============================================
-- GOLDEN PROGRAM (€600 + €50 optional materials)
-- 30 One-to-One Lessons
-- ============================================

INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules,
  teaching_materials_price, teaching_materials_included,
  is_published, is_draft, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'Golden Program',
  'Our most prestigious offering - the Golden Program provides an exclusive one-to-one learning experience. With 30 personalized private lessons, you''ll receive undivided attention from our top instructors, a completely customized curriculum, and VIP support throughout your journey.

✓ 30 Private One-to-One Lessons
✓ Fully personalized curriculum tailored to your goals
✓ Flexible scheduling - learn at your own pace
✓ VIP support with priority response times
✓ Dedicated instructor assigned to your journey
✓ Detailed progress reports after each session
✓ Access to all premium learning resources
✓ Certificate of completion with detailed skill assessment

Optional: Add teaching materials (€50) to complement your private lessons with our premium study guides and exclusive workbooks.',
  'golden',
  'service',
  'adults_teens',
  'live',
  '/assets/courses/golden-program.jpg',
  '{"price": 600, "currency": "EUR", "isFree": false}',
  '[
    {"id": "golden-mod-1", "title": "Personal Assessment & Goal Setting", "description": "5 lessons focused on understanding your needs and creating your personalized path", "lessons": [{"id": "golden-l1", "title": "Welcome & Deep Assessment", "type": "one-to-one"}, {"id": "golden-l2", "title": "Strengths & Weaknesses Analysis", "type": "one-to-one"}, {"id": "golden-l3", "title": "Goal Setting Session", "type": "one-to-one"}, {"id": "golden-l4", "title": "Custom Curriculum Planning", "type": "one-to-one"}, {"id": "golden-l5", "title": "Learning Style Optimization", "type": "one-to-one"}], "order": 1},
    {"id": "golden-mod-2", "title": "Intensive Skill Building", "description": "10 lessons of focused skill development", "lessons": [{"id": "golden-l6", "title": "Grammar Mastery 1", "type": "one-to-one"}, {"id": "golden-l7", "title": "Grammar Mastery 2", "type": "one-to-one"}, {"id": "golden-l8", "title": "Vocabulary Expansion 1", "type": "one-to-one"}, {"id": "golden-l9", "title": "Vocabulary Expansion 2", "type": "one-to-one"}, {"id": "golden-l10", "title": "Pronunciation Perfection 1", "type": "one-to-one"}, {"id": "golden-l11", "title": "Pronunciation Perfection 2", "type": "one-to-one"}, {"id": "golden-l12", "title": "Listening Skills Deep Dive", "type": "one-to-one"}, {"id": "golden-l13", "title": "Speaking Confidence Builder", "type": "one-to-one"}, {"id": "golden-l14", "title": "Reading Comprehension", "type": "one-to-one"}, {"id": "golden-l15", "title": "Writing Excellence", "type": "one-to-one"}], "order": 2},
    {"id": "golden-mod-3", "title": "Real-World Application", "description": "10 lessons applying skills to real scenarios", "lessons": [{"id": "golden-l16", "title": "Business Communication", "type": "one-to-one"}, {"id": "golden-l17", "title": "Academic English", "type": "one-to-one"}, {"id": "golden-l18", "title": "Travel & Social English", "type": "one-to-one"}, {"id": "golden-l19", "title": "Presentation Skills", "type": "one-to-one"}, {"id": "golden-l20", "title": "Interview Preparation", "type": "one-to-one"}, {"id": "golden-l21", "title": "Negotiation & Persuasion", "type": "one-to-one"}, {"id": "golden-l22", "title": "Cultural Communication", "type": "one-to-one"}, {"id": "golden-l23", "title": "Creative Expression", "type": "one-to-one"}, {"id": "golden-l24", "title": "Critical Thinking in English", "type": "one-to-one"}, {"id": "golden-l25", "title": "Advanced Conversation", "type": "one-to-one"}], "order": 3},
    {"id": "golden-mod-4", "title": "Mastery & Certification", "description": "5 final lessons to achieve mastery", "lessons": [{"id": "golden-l26", "title": "Comprehensive Review", "type": "one-to-one"}, {"id": "golden-l27", "title": "Mock Examination", "type": "one-to-one"}, {"id": "golden-l28", "title": "Feedback & Refinement", "type": "one-to-one"}, {"id": "golden-l29", "title": "Final Assessment", "type": "one-to-one"}, {"id": "golden-l30", "title": "Certification & Future Path", "type": "one-to-one"}], "order": 4}
  ]',
  50.00,
  false,
  true,
  false,
  NOW(),
  NOW()
);
