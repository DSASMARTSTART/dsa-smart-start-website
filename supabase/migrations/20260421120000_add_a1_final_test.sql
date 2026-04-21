-- Append the A1 Final Test module to the production A1 course's modules JSONB.
-- Idempotent: only appends if a module with id 'a1-final-test' is not already present.

UPDATE courses
SET modules = modules || '[
  {
    "id": "a1-final-test",
    "title": "A1 Final Test",
    "description": "A comprehensive final test covering all A1 vocabulary and grammar. Score 70% or higher to unlock your A1 completion certificate.",
    "order": 7,
    "isCheckpoint": true,
    "isFinalTest": true,
    "lessons": [
      {
        "id": "a1-final-test-l1",
        "title": "A1 Final Test",
        "duration": "60m",
        "type": "quiz",
        "order": 1
      }
    ],
    "homework": []
  }
]'::jsonb
WHERE level = 'A1'
  AND modules IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(modules) elem
    WHERE elem->>'id' = 'a1-final-test'
  );
