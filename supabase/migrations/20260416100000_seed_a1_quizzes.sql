-- Seed Stop & Check quiz checkpoint modules into the A1 course's modules JSONB column.
-- Inserts 3 checkpoint modules after each of the 3 existing grammar modules,
-- adjusting order values: m1=1, quiz1=2, m2=3, quiz2=4, m3=5, quiz3=6.

-- Step 1: Update existing module orders in the A1 course
UPDATE courses
SET modules = (
  SELECT jsonb_agg(
    CASE
      -- Bump a1-grammar-m2 from order 2 to order 3
      WHEN elem->>'id' = 'a1-grammar-m2' THEN jsonb_set(elem, '{order}', '3'::jsonb)
      -- Bump a1-grammar-m3 from order 3 to order 5
      WHEN elem->>'id' = 'a1-grammar-m3' THEN jsonb_set(elem, '{order}', '5'::jsonb)
      ELSE elem
    END
    ORDER BY (elem->>'order')::int
  )
  FROM jsonb_array_elements(modules) AS elem
)
WHERE id = 'a1'
  AND modules IS NOT NULL
  AND jsonb_array_length(modules) > 0;

-- Step 2: Append the 3 checkpoint modules
UPDATE courses
SET modules = modules || '[
  {
    "id": "a1-quiz1",
    "title": "Stop & Check: Units 1-5",
    "description": "Test your knowledge from Units 1-5 with image-word matching, multiple choice, and fill-in-the-blank exercises.",
    "order": 2,
    "isCheckpoint": true,
    "lessons": [
      {
        "id": "a1-quiz1-l1",
        "title": "Stop & Check: Units 1-5",
        "duration": "20m",
        "type": "quiz",
        "order": 1
      }
    ],
    "homework": []
  },
  {
    "id": "a1-quiz2",
    "title": "Stop & Check: Units 6-10",
    "description": "Test your knowledge from Units 6-10 with image-word matching, multiple choice, and fill-in-the-blank exercises.",
    "order": 4,
    "isCheckpoint": true,
    "lessons": [
      {
        "id": "a1-quiz2-l1",
        "title": "Stop & Check: Units 6-10",
        "duration": "20m",
        "type": "quiz",
        "order": 1
      }
    ],
    "homework": []
  },
  {
    "id": "a1-quiz3",
    "title": "Stop & Check: Units 11-15",
    "description": "Test your knowledge from Units 11-15 with image-word matching, multiple choice, and fill-in-the-blank exercises.",
    "order": 6,
    "isCheckpoint": true,
    "lessons": [
      {
        "id": "a1-quiz3-l1",
        "title": "Stop & Check: Units 11-15",
        "duration": "20m",
        "type": "quiz",
        "order": 1
      }
    ],
    "homework": []
  }
]'::jsonb
WHERE id = 'a1';

-- Step 3: Re-sort modules by order so they appear in correct sequence
UPDATE courses
SET modules = (
  SELECT jsonb_agg(elem ORDER BY (elem->>'order')::int)
  FROM jsonb_array_elements(modules) AS elem
)
WHERE id = 'a1';
