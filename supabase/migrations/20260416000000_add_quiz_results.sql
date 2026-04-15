-- ============================================
-- QUIZ RESULTS TABLE
-- Stores student quiz attempt results for Stop & Check quizzes
-- ============================================

CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  exercise_scores JSONB,
  answers JSONB,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_course_module
  ON quiz_results(user_id, course_id, module_id);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user
  ON quiz_results(user_id);

-- Enable RLS
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS policies (matching progress table patterns)
CREATE POLICY "Users can view own quiz results" ON quiz_results
  FOR SELECT USING (user_id::text = auth.uid()::text OR public.is_admin_or_editor());

CREATE POLICY "Users can insert own quiz results" ON quiz_results
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own quiz results" ON quiz_results
  FOR UPDATE USING (user_id::text = auth.uid()::text);
