-- ============================================
-- REPLACE LIVE COURSES
-- Date: 2026-02-28
--
-- This migration:
--   1. Deletes old Premium & Golden service courses
--   2. Inserts 4 new live courses:
--      - Language Lab (€160, 8 lab sessions, 3-4 students)
--      - Starter Path (€200, 5 one-to-one lessons)
--      - Language Lab Pro (€599, 30 lab sessions, material included)
--      - Hybrid Pack (€599, 25 labs + 5 one-to-one, material included)
-- ============================================

-- ============================================
-- 1. DELETE OLD SERVICE COURSES
-- ============================================
DELETE FROM courses WHERE product_type = 'service';

-- ============================================
-- 2. LANGUAGE LAB (€160, no materials)
-- ============================================
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules,
  teaching_materials_price, teaching_materials_included,
  is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'Language Lab',
  'Small group live sessions designed for focused, interactive learning. Join a class of 3-4 students for 8 dynamic lab sessions, each lasting 50 minutes. Perfect for learners who thrive in collaborative environments with personalised attention.',
  'language-lab',
  'service',
  'adults_teens',
  'live',
  '/assets/courses/language-lab.jpg',
  '{"price": 160, "currency": "EUR", "isFree": false}',
  '[
    {
      "id": "ll-mod-1",
      "title": "Lab Sessions 1–4",
      "description": "Foundation lab sessions in a small group setting",
      "lessons": [
        {"id": "ll-l1", "title": "Lab Session 1", "type": "live"},
        {"id": "ll-l2", "title": "Lab Session 2", "type": "live"},
        {"id": "ll-l3", "title": "Lab Session 3", "type": "live"},
        {"id": "ll-l4", "title": "Lab Session 4", "type": "live"}
      ],
      "order": 1
    },
    {
      "id": "ll-mod-2",
      "title": "Lab Sessions 5–8",
      "description": "Consolidation and practice lab sessions",
      "lessons": [
        {"id": "ll-l5", "title": "Lab Session 5", "type": "live"},
        {"id": "ll-l6", "title": "Lab Session 6", "type": "live"},
        {"id": "ll-l7", "title": "Lab Session 7", "type": "live"},
        {"id": "ll-l8", "title": "Lab Session 8", "type": "live"}
      ],
      "order": 2
    }
  ]',
  NULL,
  false,
  true,
  false,
  NOW(),
  NOW()
);

-- ============================================
-- 3. STARTER PATH (€200, no materials)
-- ============================================
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules,
  teaching_materials_price, teaching_materials_included,
  is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'Starter Path',
  'Begin your English journey with personalised one-to-one attention. This starter programme includes 5 individual lessons of 30 minutes each, tailored entirely to your needs and learning pace. Ideal for beginners or anyone looking for a focused introduction.',
  'starter-path',
  'service',
  'adults_teens',
  'live',
  '/assets/courses/starter-path.jpg',
  '{"price": 200, "currency": "EUR", "isFree": false}',
  '[
    {
      "id": "sp-mod-1",
      "title": "One-to-One Lessons",
      "description": "5 personalised individual lessons",
      "lessons": [
        {"id": "sp-l1", "title": "Lesson 1 — Assessment & Introduction", "type": "one-to-one"},
        {"id": "sp-l2", "title": "Lesson 2 — Core Skills", "type": "one-to-one"},
        {"id": "sp-l3", "title": "Lesson 3 — Building Confidence", "type": "one-to-one"},
        {"id": "sp-l4", "title": "Lesson 4 — Practical Application", "type": "one-to-one"},
        {"id": "sp-l5", "title": "Lesson 5 — Review & Next Steps", "type": "one-to-one"}
      ],
      "order": 1
    }
  ]',
  NULL,
  false,
  true,
  false,
  NOW(),
  NOW()
);

-- ============================================
-- 4. LANGUAGE LAB PRO (€599, materials included)
-- ============================================
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules,
  teaching_materials_price, teaching_materials_included,
  is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'Language Lab Pro',
  'Our most intensive small-group programme with 30 live lab sessions. Join a class of 3-4 students for 50-minute sessions packed with interactive exercises, real conversation practice, and progressive skill building. All teaching materials are included.',
  'language-lab-pro',
  'service',
  'adults_teens',
  'live',
  '/assets/courses/language-lab-pro.jpg',
  '{"price": 599, "currency": "EUR", "isFree": false}',
  '[
    {
      "id": "llp-mod-1",
      "title": "Lab Sessions 1–10",
      "description": "Foundation and skills assessment",
      "lessons": [
        {"id": "llp-l1", "title": "Lab Session 1", "type": "live"},
        {"id": "llp-l2", "title": "Lab Session 2", "type": "live"},
        {"id": "llp-l3", "title": "Lab Session 3", "type": "live"},
        {"id": "llp-l4", "title": "Lab Session 4", "type": "live"},
        {"id": "llp-l5", "title": "Lab Session 5", "type": "live"},
        {"id": "llp-l6", "title": "Lab Session 6", "type": "live"},
        {"id": "llp-l7", "title": "Lab Session 7", "type": "live"},
        {"id": "llp-l8", "title": "Lab Session 8", "type": "live"},
        {"id": "llp-l9", "title": "Lab Session 9", "type": "live"},
        {"id": "llp-l10", "title": "Lab Session 10", "type": "live"}
      ],
      "order": 1
    },
    {
      "id": "llp-mod-2",
      "title": "Lab Sessions 11–20",
      "description": "Developing fluency and accuracy",
      "lessons": [
        {"id": "llp-l11", "title": "Lab Session 11", "type": "live"},
        {"id": "llp-l12", "title": "Lab Session 12", "type": "live"},
        {"id": "llp-l13", "title": "Lab Session 13", "type": "live"},
        {"id": "llp-l14", "title": "Lab Session 14", "type": "live"},
        {"id": "llp-l15", "title": "Lab Session 15", "type": "live"},
        {"id": "llp-l16", "title": "Lab Session 16", "type": "live"},
        {"id": "llp-l17", "title": "Lab Session 17", "type": "live"},
        {"id": "llp-l18", "title": "Lab Session 18", "type": "live"},
        {"id": "llp-l19", "title": "Lab Session 19", "type": "live"},
        {"id": "llp-l20", "title": "Lab Session 20", "type": "live"}
      ],
      "order": 2
    },
    {
      "id": "llp-mod-3",
      "title": "Lab Sessions 21–30",
      "description": "Advanced communication and mastery",
      "lessons": [
        {"id": "llp-l21", "title": "Lab Session 21", "type": "live"},
        {"id": "llp-l22", "title": "Lab Session 22", "type": "live"},
        {"id": "llp-l23", "title": "Lab Session 23", "type": "live"},
        {"id": "llp-l24", "title": "Lab Session 24", "type": "live"},
        {"id": "llp-l25", "title": "Lab Session 25", "type": "live"},
        {"id": "llp-l26", "title": "Lab Session 26", "type": "live"},
        {"id": "llp-l27", "title": "Lab Session 27", "type": "live"},
        {"id": "llp-l28", "title": "Lab Session 28", "type": "live"},
        {"id": "llp-l29", "title": "Lab Session 29", "type": "live"},
        {"id": "llp-l30", "title": "Lab Session 30", "type": "live"}
      ],
      "order": 3
    }
  ]',
  NULL,
  true,
  true,
  false,
  NOW(),
  NOW()
);

-- ============================================
-- 5. HYBRID PACK (€599, materials included)
-- ============================================
INSERT INTO courses (
  id, title, description, level, product_type, target_audience, content_format,
  thumbnail_url, pricing, modules,
  teaching_materials_price, teaching_materials_included,
  is_published, is_draft, created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'Hybrid Pack',
  'The best of both worlds — combining the energy of small-group labs with the personalised focus of one-to-one lessons. Includes 25 lab sessions (50 minutes, 3-4 students) plus 5 individual lessons (30 minutes). All teaching materials are included.',
  'hybrid-pack',
  'service',
  'adults_teens',
  'hybrid',
  '/assets/courses/hybrid-pack.jpg',
  '{"price": 599, "currency": "EUR", "isFree": false}',
  '[
    {
      "id": "hp-mod-1",
      "title": "Lab Sessions 1–13",
      "description": "Group lab sessions — building foundations",
      "lessons": [
        {"id": "hp-l1", "title": "Lab Session 1", "type": "live"},
        {"id": "hp-l2", "title": "Lab Session 2", "type": "live"},
        {"id": "hp-l3", "title": "Lab Session 3", "type": "live"},
        {"id": "hp-l4", "title": "Lab Session 4", "type": "live"},
        {"id": "hp-l5", "title": "Lab Session 5", "type": "live"},
        {"id": "hp-l6", "title": "Lab Session 6", "type": "live"},
        {"id": "hp-l7", "title": "Lab Session 7", "type": "live"},
        {"id": "hp-l8", "title": "Lab Session 8", "type": "live"},
        {"id": "hp-l9", "title": "Lab Session 9", "type": "live"},
        {"id": "hp-l10", "title": "Lab Session 10", "type": "live"},
        {"id": "hp-l11", "title": "Lab Session 11", "type": "live"},
        {"id": "hp-l12", "title": "Lab Session 12", "type": "live"},
        {"id": "hp-l13", "title": "Lab Session 13", "type": "live"}
      ],
      "order": 1
    },
    {
      "id": "hp-mod-2",
      "title": "One-to-One Lessons",
      "description": "5 personalised individual lessons",
      "lessons": [
        {"id": "hp-o1", "title": "One-to-One Lesson 1", "type": "one-to-one"},
        {"id": "hp-o2", "title": "One-to-One Lesson 2", "type": "one-to-one"},
        {"id": "hp-o3", "title": "One-to-One Lesson 3", "type": "one-to-one"},
        {"id": "hp-o4", "title": "One-to-One Lesson 4", "type": "one-to-one"},
        {"id": "hp-o5", "title": "One-to-One Lesson 5", "type": "one-to-one"}
      ],
      "order": 2
    },
    {
      "id": "hp-mod-3",
      "title": "Lab Sessions 14–25",
      "description": "Group lab sessions — advanced practice",
      "lessons": [
        {"id": "hp-l14", "title": "Lab Session 14", "type": "live"},
        {"id": "hp-l15", "title": "Lab Session 15", "type": "live"},
        {"id": "hp-l16", "title": "Lab Session 16", "type": "live"},
        {"id": "hp-l17", "title": "Lab Session 17", "type": "live"},
        {"id": "hp-l18", "title": "Lab Session 18", "type": "live"},
        {"id": "hp-l19", "title": "Lab Session 19", "type": "live"},
        {"id": "hp-l20", "title": "Lab Session 20", "type": "live"},
        {"id": "hp-l21", "title": "Lab Session 21", "type": "live"},
        {"id": "hp-l22", "title": "Lab Session 22", "type": "live"},
        {"id": "hp-l23", "title": "Lab Session 23", "type": "live"},
        {"id": "hp-l24", "title": "Lab Session 24", "type": "live"},
        {"id": "hp-l25", "title": "Lab Session 25", "type": "live"}
      ],
      "order": 3
    }
  ]',
  NULL,
  true,
  true,
  false,
  NOW(),
  NOW()
);

-- ============================================
-- 6. Verify changes
-- ============================================
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== LIVE COURSES AFTER MIGRATION ===';
  FOR r IN
    SELECT title,
           level,
           product_type,
           content_format,
           is_published,
           is_draft,
           pricing->>'price' AS price,
           pricing->>'discountPrice' AS discount_price,
           teaching_materials_included
    FROM courses
    WHERE product_type = 'service'
    ORDER BY pricing->>'price', title
  LOOP
    RAISE NOTICE '% | level=% | format=% | pub=% draft=% | price=€% discount=% | materials=%',
      r.title, r.level, r.content_format,
      r.is_published, r.is_draft,
      r.price, COALESCE(r.discount_price, 'N/A'),
      r.teaching_materials_included;
  END LOOP;
END $$;
