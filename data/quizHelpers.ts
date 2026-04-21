// ============================================
// DSA Smart Start - Quiz Helper Functions
// ============================================

import { QuizQuestion, QuizResult } from '../types';
import { quizDataMap } from './quizData';

/**
 * Returns quiz questions for a given checkpoint module ID.
 * Returns undefined if the module is not a quiz checkpoint.
 */
export function getQuizForModule(moduleId: string): QuizQuestion[] | undefined {
  return quizDataMap[moduleId];
}

/**
 * Groups quiz questions by their exerciseGroup number.
 */
export function groupByExercise(questions: QuizQuestion[]): {
  exercise1: QuizQuestion[];
  exercise2: QuizQuestion[];
  exercise3: QuizQuestion[];
} {
  return {
    exercise1: questions.filter(q => q.exerciseGroup === 1),
    exercise2: questions.filter(q => q.exerciseGroup === 2),
    exercise3: questions.filter(q => q.exerciseGroup === 3),
  };
}

/**
 * Grades a quiz given the questions and the student's answers.
 * Answers is a map of questionId -> student's answer string.
 * Returns a partial QuizResult (without id, userId, courseId, moduleId, completedAt).
 */
export function gradeQuiz(
  questions: QuizQuestion[],
  answers: Record<string, string>
): Pick<QuizResult, 'score' | 'totalQuestions' | 'exerciseScores' | 'answers'> {
  let totalCorrect = 0;
  const exerciseScores: Record<number, { correct: number; total: number }> = {};

  for (const q of questions) {
    const group = q.exerciseGroup ?? 0;
    if (!exerciseScores[group]) {
      exerciseScores[group] = { correct: 0, total: 0 };
    }
    exerciseScores[group].total++;

    const studentAnswer = (answers[q.id] ?? '').trim().toLowerCase();
    const isCorrect = checkAnswer(q, studentAnswer);

    if (isCorrect) {
      totalCorrect++;
      exerciseScores[group].correct++;
    }
  }

  return {
    score: totalCorrect,
    totalQuestions: questions.length,
    exerciseScores,
    answers,
  };
}

/**
 * Checks whether a student's answer is correct for a given question.
 * Case-insensitive comparison with acceptable answers support.
 */
function checkAnswer(question: QuizQuestion, studentAnswer: string): boolean {
  if (!studentAnswer) return false;

  const normalize = (s: string) => s.trim().toLowerCase();

  // For multiple-choice, compare against the correct option id
  if (question.type === 'multiple-choice') {
    return normalize(studentAnswer) === normalize(question.correctAnswer ?? '');
  }

  // image-word, fill-in-blank, spelling-correction, word-bank → text compare
  const correct = question.correctAnswer ? normalize(question.correctAnswer) : '';
  const acceptable = question.acceptableAnswers?.map(normalize) ?? [];

  const normalizedStudent = normalize(studentAnswer);

  if (normalizedStudent === correct) return true;
  if (acceptable.includes(normalizedStudent)) return true;

  return false;
}

/**
 * Grades a comprehensive multi-exercise final test.
 * `exercises` is the descriptor array; `answers` maps questionId → student answer.
 */
export function gradeFinalTest(
  exercises: import('../types').FinalTestExercise[],
  answers: Record<string, string>,
): {
  score: number;
  totalQuestions: number;
  exerciseScores: Record<number, { correct: number; total: number }>;
  answers: Record<string, string>;
  percentage: number;
} {
  let totalCorrect = 0;
  let total = 0;
  const exerciseScores: Record<number, { correct: number; total: number }> = {};

  for (const ex of exercises) {
    exerciseScores[ex.group] = { correct: 0, total: ex.questions.length };
    for (const q of ex.questions) {
      total++;
      const studentAnswer = (answers[q.id] ?? '').trim();
      if (checkAnswer(q, studentAnswer)) {
        totalCorrect++;
        exerciseScores[ex.group].correct++;
      }
    }
  }

  const percentage = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;

  return {
    score: totalCorrect,
    totalQuestions: total,
    exerciseScores,
    answers,
    percentage,
  };
}
