-- Requested teacher profiles. Email addresses and personal introductions come later.
-- Do not turn Erika's explicitly dated, past Tuesday into recurring availability.
-- Do not overwrite an existing teacher or their calendar when reapplying this seed.
BEGIN;
WITH supplied(profile) AS (VALUES
  ('{
  "id": "7f728974-cd84-4dd3-9643-f5f532df2b01",
  "name": "Ana",
  "email": "",
  "bio": "",
  "photo": "",
  "video": "",
  "timezone": "Europe/Rome",
  "languages": "",
  "programs": [
    "language-lab",
    "language-lab-pro",
    "starter-path",
    "hybrid-pack"
  ],
  "status": "draft",
  "weekly": [
    {
      "id": "ana-1",
      "day": 0,
      "start": "16:00",
      "end": "19:00"
    },
    {
      "id": "ana-2",
      "day": 1,
      "start": "16:00",
      "end": "19:00"
    },
    {
      "id": "ana-3",
      "day": 2,
      "start": "16:00",
      "end": "19:00"
    },
    {
      "id": "ana-4",
      "day": 3,
      "start": "16:00",
      "end": "19:00"
    },
    {
      "id": "ana-5",
      "day": 4,
      "start": "16:00",
      "end": "19:00"
    }
  ],
  "daysOff": [],
  "groups": []
}'::jsonb),
  ('{
  "id": "7f728974-cd84-4dd3-9643-f5f532df2b02",
  "name": "Erika",
  "email": "",
  "bio": "",
  "photo": "",
  "video": "",
  "timezone": "Europe/Rome",
  "languages": "",
  "programs": [
    "language-lab",
    "language-lab-pro",
    "starter-path",
    "hybrid-pack"
  ],
  "status": "draft",
  "weekly": [
    {
      "id": "erika-1",
      "day": 0,
      "start": "17:30",
      "end": "19:00"
    },
    {
      "id": "erika-2",
      "day": 2,
      "start": "17:30",
      "end": "18:30"
    },
    {
      "id": "erika-3",
      "day": 3,
      "start": "15:00",
      "end": "18:30"
    },
    {
      "id": "erika-4",
      "day": 4,
      "start": "14:30",
      "end": "18:00"
    }
  ],
  "daysOff": [],
  "groups": [],
  "availabilityNotes": "Supplied Tuesday availability: 13 October 2026, 15:30–19:00. Confirm whether this repeats every Tuesday before adding it to the weekly schedule."
}'::jsonb),
  ('{
  "id": "7f728974-cd84-4dd3-9643-f5f532df2b03",
  "name": "Juliana",
  "email": "",
  "bio": "",
  "photo": "",
  "video": "",
  "timezone": "Europe/Rome",
  "languages": "",
  "programs": [
    "language-lab",
    "language-lab-pro",
    "starter-path",
    "hybrid-pack"
  ],
  "status": "draft",
  "weekly": [
    {
      "id": "juliana-1",
      "day": 1,
      "start": "15:00",
      "end": "18:00"
    },
    {
      "id": "juliana-2",
      "day": 2,
      "start": "15:00",
      "end": "20:00"
    },
    {
      "id": "juliana-3",
      "day": 4,
      "start": "15:00",
      "end": "18:00"
    },
    {
      "id": "juliana-4",
      "day": 4,
      "start": "19:00",
      "end": "20:00"
    }
  ],
  "daysOff": [],
  "groups": []
}'::jsonb)
)
INSERT INTO public.live_teachers(id,email,profile)
SELECT (profile->>'id')::uuid,NULL,profile FROM supplied s
WHERE NOT EXISTS(SELECT 1 FROM public.live_teachers t WHERE lower(trim(t.profile->>'name'))=lower(s.profile->>'name'))
ON CONFLICT(id) DO NOTHING;
COMMIT;
