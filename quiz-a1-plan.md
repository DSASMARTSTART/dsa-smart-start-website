# Plan: Stop & Check Quizzes for A1 Level

## TL;DR

Add three "Stop & Check" checkpoint quizzes to the A1 course, appearing as special modules in the course sidebar after units 5, 10, and 15. Each quiz contains 3 exercise types: image-word matching, multiple-choice, and fill-in-the-blank. Results are saved to a new `quiz_results` DB table and displayed on the student dashboard. No gamification for now. Quizzes are optional (no gating) with unlimited retakes.

---

## Phase 1: Data Model Updates

1. **Extend `QuizQuestionType`** in `types/index.ts` — add `'fill-in-blank'` and `'image-word'` to the union type
2. **Change `QuizQuestion.correctAnswer`** from `boolean` to `string` — currently unused (no quiz rendering exists), so safe to change. For multiple-choice the `QuizOption.isCorrect` field handles correctness; `correctAnswer` string is needed for fill-in-blank and image-word types
3. **Add `acceptableAnswers?: string[]`** to `QuizQuestion` — for fill-in-blank questions that accept multiple valid answers (e.g., "aren't" and "are not")
4. **Add `exerciseGroup?: number`** to `QuizQuestion` — values 1, 2, or 3 to group questions into exercises within a single quiz lesson
5. **Add `isCheckpoint?: boolean`** to `Module` interface — flag that triggers special sidebar rendering and quiz behavior
6. **Add `QuizResult` type** — `{ id, userId, courseId, moduleId, score, totalQuestions, exerciseScores, answers, completedAt, attemptNumber }`

**Files:** `types/index.ts`

---

## Phase 2: Database Migration

7. **Create `quiz_results` table** via new Supabase migration:

```sql
quiz_results (
  id UUID PK,
  user_id UUID NOT NULL REFERENCES users(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  module_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  exercise_scores JSONB,
  answers JSONB,
  attempt_number INTEGER DEFAULT 1,
  completed_at TIMESTAMPTZ DEFAULT now()
)
```

With index on `(user_id, course_id, module_id)` and RLS policies matching `progress` table patterns.

**Files:** new `supabase/migrations/XXXXXX_add_quiz_results.sql`

---

## Phase 3: Quiz Data

8. **Create `data/quizData.ts`** containing all three Stop & Check quizzes as structured data:
   - `a1Quiz1` (Units 1-5): 20 image-word + 20 multiple-choice + 20 fill-in-blank = 60 questions
   - `a1Quiz2` (Units 6-10): 20 + 20 + 20 = 60 questions
   - `a1Quiz3` (Units 11-15): 20 + 20 + 20 = 60 questions
   - Each question mapped to `QuizQuestion` interface with proper types, options, correctAnswer, acceptableAnswers
   - Exercise 1 image URLs: placeholder external URLs for now (the 20 vocabulary items per quiz)
   - Exercise 3 fill-in-blank: `question` field uses `___` as the blank marker in the sentence

9. **Create helper `data/quizHelpers.ts`** — exports:
   - `getQuizForModule(moduleId: string): QuizQuestion[]` — returns quiz data for a checkpoint module
   - `gradeQuiz(questions: QuizQuestion[], answers: Record<string, string>): QuizResult` — grades answers with case-insensitive matching, acceptable answers support
   - `groupByExercise(questions: QuizQuestion[]): { exercise1, exercise2, exercise3 }` — groups questions by `exerciseGroup`

**Files:** new `data/quizData.ts`, new `data/quizHelpers.ts`

---

## Phase 4: Quiz Renderer Component

10. **Create `components/QuizRenderer.tsx`** — the main quiz-taking UI:
    - **States:** `'intro' | 'in-progress' | 'reviewing' | 'results'`
    - **Intro screen:** Quiz title, description (Units covered), number of exercises/questions, "Start Quiz" button
    - **In-progress:** Three exercise sections shown sequentially:
      - **Exercise 1 (Image-Word):** Grid of images (4-5 per row), each with an image and a text input below. Student types the word they see
      - **Exercise 2 (Multiple Choice):** Numbered questions with 3 radio-button options (a/b/c). Standard MC layout
      - **Exercise 3 (Fill-in-Blank):** Sentences displayed with an inline text input replacing `___`. Student types the missing word/form
    - **Navigation:** "Next Exercise" / "Previous Exercise" buttons between exercise sections. Progress indicator (1/3, 2/3, 3/3)
    - **Submit:** After Exercise 3, "Submit Quiz" button with confirmation dialog
    - **Results screen:** Overall score (X/60), per-exercise scores (X/20 each), question review with correct/incorrect indicators, correct answers for wrong responses, "Retake Quiz" button
    - **Props:** `courseId`, `module`, `quizQuestions`, `onComplete`, `previousAttempts`

**Files:** new `components/QuizRenderer.tsx`

---

## Phase 5: CourseViewer Integration

11. **Update sidebar rendering** in `components/CourseViewer.tsx`:
    - Detect `module.isCheckpoint` flag
    - Render checkpoint modules with distinct styling: `ClipboardCheck` icon, amber/gold accent color, "Stop & Check" label
    - Checkpoint modules show a single clickable item (the quiz) instead of expanding into lessons list
    - Show completion badge (green checkmark) with best score if completed

12. **Update content area rendering** in `components/CourseViewer.tsx`:
    - When a checkpoint module/quiz lesson is selected, render `<QuizRenderer>` instead of video/reading content
    - Pass quiz questions from `data/quizData.ts` via helper
    - On quiz completion, save result via `quizResultsApi` and update progress

13. **Update navigation ("Continue Next" button)**:
    - After last lesson of Unit 5 → navigate to Stop & Check 1 module
    - After completing Stop & Check → navigate to Unit 6 (first lesson of next module)
    - Quiz completion is optional for navigation (no gating)

**Files:** `components/CourseViewer.tsx`

---

## Phase 6: Scoring & Persistence

14. **Add `quizResultsApi`** to `data/supabaseStore.ts`:
    - `saveResult(result)` — upsert to `quiz_results` table
    - `getResults(userId, courseId)` — fetch all quiz attempts for a course
    - `getBestResult(userId, courseId, moduleId)` — fetch highest score attempt

15. **Update `components/DashboardPage.tsx`**:
    - Below each course's progress bar, show quiz results if available
    - Display: "Stop & Check 1: 54/60 ✓" style badges for completed quizzes
    - Checkpoint modules count toward overall course progress

**Files:** `data/supabaseStore.ts`, `components/DashboardPage.tsx`

---

## Phase 7: Seed Quiz Modules into A1 Course

16. **Update `data/seed.ts`** — insert 3 checkpoint modules into the A1 course's modules array:
    - After `a1-m1` (order 2): `{ id: 'a1-quiz1', title: 'Stop & Check: Units 1-5', isCheckpoint: true, ... }`
    - After `a1-m2` (order 4): `{ id: 'a1-quiz2', title: 'Stop & Check: Units 6-10', ... }`
    - After `a1-m3` (order 6): `{ id: 'a1-quiz3', title: 'Stop & Check: Units 11-15', ... }`
    - Adjusted module orders: a1-m1→1, quiz1→2, a1-m2→3, quiz2→4, a1-m3→5, quiz3→6

17. **Create SQL migration** to add checkpoint modules to production A1 course's JSONB `modules` column

**Files:** `data/seed.ts`, new `supabase/migrations/XXXXXX_seed_a1_quizzes.sql`

---

## Quiz Content Summary

### Stop & Check 1 (Units 1-5)

**Exercise 1 — Write the correct word under the image (20 items):**
hair, eye, tiger, bathroom, game, shop, tree, bird, kitchen, drawing, boat, black, beach, shell, keys, tie, stapler, hoodie, desk, oversized

**Exercise 2 — Multiple choice (20 questions):**
Topics: to be (negatives), question words, plural nouns, subject pronouns, there is/are, possessive adjectives/pronouns, whose/who's, possessive 's, demonstratives (this/that/these/those)

**Exercise 3 — Fill in the blank (20 questions):**
Topics: to be (affirmative/negative/questions), there is/are, possessive adjectives/pronouns, whose, possessive 's, demonstratives

### Stop & Check 2 (Units 6-10)

**Exercise 1 — Write the correct word under the image (20 items):**
mirror, day, clothes, bookcase, men, chicken, grapes, run, rubber, ruler, bookcase, draw, midnight, alarm, morning, evening, listen, read, coach, teach

**Exercise 2 — Multiple choice (20 questions):**
Topics: was/were, past simple (regular/irregular), present simple, imperatives (let's/don't), will/won't (future simple)

**Exercise 3 — Fill in the blank (20 questions):**
Topics: was/were, present simple, past simple, imperatives, will/won't

### Stop & Check 3 (Units 11-15)

**Exercise 1 — Write the correct word under the image (20 items):**
sleep, stay, egg, sausage, arm, foot, dentist, call, hairdresser, cleaner, short, tall, roundabout, car park, between, in front of, vegetables, salt, meat, sing

**Exercise 2 — Multiple choice (20 questions):**
Topics: can/can't/could, object pronouns, have/has got, prepositions of time/place, present continuous

**Exercise 3 — Fill in the blank (20 questions):**
Topics: can/could, object pronouns, have/has got, prepositions, present continuous

---

## Relevant Files

| File | Change |
|------|--------|
| `types/index.ts` | Extend `QuizQuestionType`, `QuizQuestion`, `Module`; add `QuizResult` |
| `components/QuizRenderer.tsx` | **New** — full quiz UI with 3 exercise types |
| `data/quizData.ts` | **New** — 180 questions across 3 A1 quizzes |
| `data/quizHelpers.ts` | **New** — grading, grouping, validation |
| `components/CourseViewer.tsx` | Sidebar checkpoint styling, quiz rendering, navigation |
| `data/supabaseStore.ts` | Add `quizResultsApi` |
| `components/DashboardPage.tsx` | Show quiz scores |
| `data/seed.ts` | Add checkpoint modules to A1 course |
| `supabase/migrations/` | New migration for `quiz_results` table + A1 quiz seed |

---

## Verification

1. `tsc --noEmit` passes after type changes
2. Each quiz validates to exactly 60 questions (20 per exercise)
3. Take quiz with known answers — score matches expected
4. Complete quiz → refresh → result persists and shows on dashboard
5. Retake → new attempt saves, best score displayed
6. "Continue Next" navigates correctly through checkpoints
7. Mobile responsive — image grid stacks, inputs are touch-friendly

---

## Decisions

- **Optional** — no gating for now; architecture supports adding it later via `isCheckpoint` flag
- **Unlimited retakes** — all attempts saved, best score displayed
- **No gamification** for now — no confetti, stars, or timers. Can be added later
- **Images from internet** — Exercise 1 uses placeholder URLs, client will provide final images later
- **Quiz data hardcoded** in `data/quizData.ts`, not in JSONB `quizQuestions` — avoids bloating the course document
- **English-only content** — UI labels (Exercise 1/2/3, Submit, etc.) will use i18n keys
- **Grading** — case-insensitive, trimmed whitespace, `acceptableAnswers` array for fill-in-blank

---

## Further Considerations

1. **Admin quiz editor** — currently quizzes are hardcoded. For future levels (A2, B1, etc.), consider adding a quiz editor to the admin CourseEditor wizard. *Recommend: defer to follow-up*
2. **Exercise 1 images** — client needs to provide/approve 60 images across 3 quizzes. *Recommend: use royalty-free placeholders for now, flag for client review*
3. **Future gating** — if gating is enabled later, the `isCheckpoint` flag on modules and `quiz_results` table already support checking pass status before unlocking subsequent modules
