// ============================================
// QuizRenderer — Stop & Check Quiz UI
// ============================================

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Trophy,
  Image as ImageIcon,
  ListChecks,
  PenLine,
  AlertTriangle,
} from 'lucide-react';
import { Module, QuizQuestion, QuizResult } from '../types';
import { groupByExercise, gradeQuiz } from '../data/quizHelpers';

// ── Types ──────────────────────────────────────────────────────────
type QuizStage = 'intro' | 'in-progress' | 'reviewing' | 'results';

interface QuizRendererProps {
  courseId: string;
  module: Module;
  quizQuestions: QuizQuestion[];
  onComplete: (result: Pick<QuizResult, 'score' | 'totalQuestions' | 'exerciseScores' | 'answers'>) => void;
  previousAttempts: QuizResult[];
}

// ── Component ──────────────────────────────────────────────────────
const QuizRenderer: React.FC<QuizRendererProps> = ({
  courseId,
  module,
  quizQuestions,
  onComplete,
  previousAttempts,
}) => {
  const { t } = useTranslation('courses');

  // State
  const [stage, setStage] = useState<QuizStage>('intro');
  const [currentExercise, setCurrentExercise] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [result, setResult] = useState<Pick<QuizResult, 'score' | 'totalQuestions' | 'exerciseScores' | 'answers'> | null>(null);

  // Derived
  const exercises = useMemo(() => groupByExercise(quizQuestions), [quizQuestions]);
  const currentQuestions = useMemo(() => {
    if (currentExercise === 1) return exercises.exercise1;
    if (currentExercise === 2) return exercises.exercise2;
    return exercises.exercise3;
  }, [currentExercise, exercises]);

  const bestAttempt = useMemo(() => {
    if (!previousAttempts.length) return null;
    return previousAttempts.reduce((best, a) => (a.score > best.score ? a : best), previousAttempts[0]);
  }, [previousAttempts]);

  // Handlers
  const handleAnswer = useCallback((questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    const graded = gradeQuiz(quizQuestions, answers);
    setResult(graded);
    setStage('results');
    onComplete(graded);
  }, [quizQuestions, answers, onComplete]);

  const handleRetake = useCallback(() => {
    setAnswers({});
    setResult(null);
    setCurrentExercise(1);
    setShowConfirmSubmit(false);
    setStage('intro');
  }, []);

  const exerciseAnsweredCount = useMemo(() => {
    return currentQuestions.filter(q => answers[q.id]?.trim()).length;
  }, [currentQuestions, answers]);

  // ── Intro Screen ────────────────────────────────────────────────
  if (stage === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-6">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
          <ClipboardCheck size={36} className="text-amber-400" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white mb-3">{module.title}</h2>
        {module.description && (
          <p className="text-gray-400 max-w-md mb-6">{module.description}</p>
        )}

        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-center">
            <p className="text-2xl font-black text-white">3</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('quiz.exercises', 'Exercises')}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-center">
            <p className="text-2xl font-black text-white">{quizQuestions.length}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('quiz.questions', 'Questions')}</p>
          </div>
          {bestAttempt && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-black text-green-400">{bestAttempt.score}/{bestAttempt.totalQuestions}</p>
              <p className="text-[10px] font-bold text-green-500/70 uppercase tracking-widest">{t('quiz.bestScore', 'Best Score')}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 items-center text-left text-sm text-gray-400 mb-8 max-w-sm">
          <div className="flex items-start gap-3 w-full">
            <ImageIcon size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <span>{t('quiz.ex1Desc', 'Exercise 1: Write the correct word under each image')}</span>
          </div>
          <div className="flex items-start gap-3 w-full">
            <ListChecks size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <span>{t('quiz.ex2Desc', 'Exercise 2: Choose the correct answer (a, b, or c)')}</span>
          </div>
          <div className="flex items-start gap-3 w-full">
            <PenLine size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <span>{t('quiz.ex3Desc', 'Exercise 3: Fill in the missing word')}</span>
          </div>
        </div>

        <button
          onClick={() => setStage('in-progress')}
          className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all"
        >
          {t('quiz.startQuiz', 'Start Quiz')}
        </button>
      </div>
    );
  }

  // ── Results Screen ──────────────────────────────────────────────
  if (stage === 'results' && result) {
    const percentage = Math.round((result.score / result.totalQuestions) * 100);
    const isPassing = percentage >= 60;

    return (
      <div className="py-12 px-6">
        {/* Score Header */}
        <div className="text-center mb-10">
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 ${isPassing ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
            <Trophy size={36} className={isPassing ? 'text-green-400' : 'text-amber-400'} />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
            {isPassing ? t('quiz.greatJob', 'Great Job!') : t('quiz.keepPracticing', 'Keep Practicing!')}
          </h2>
          <p className="text-4xl font-black text-white mb-1">
            {result.score}<span className="text-gray-500">/{result.totalQuestions}</span>
          </p>
          <p className="text-sm text-gray-400">{percentage}% {t('quiz.correct', 'correct')}</p>
        </div>

        {/* Per-Exercise Scores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto mb-10">
          {([1, 2, 3] as const).map(ex => {
            const s = result.exerciseScores[ex];
            if (!s) return null;
            const exPercent = Math.round((s.correct / s.total) * 100);
            const exLabels = [
              t('quiz.exercise1Title', 'Image & Word'),
              t('quiz.exercise2Title', 'Multiple Choice'),
              t('quiz.exercise3Title', 'Fill in the Blank'),
            ];
            return (
              <div key={ex} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{exLabels[ex - 1]}</p>
                <p className="text-xl font-black text-white">{s.correct}/{s.total}</p>
                <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-full rounded-full transition-all ${exPercent >= 60 ? 'bg-green-500' : 'bg-amber-500'}`}
                    style={{ width: `${exPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Review Button + Retake */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => { setStage('reviewing'); setCurrentExercise(1); }}
            className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
          >
            {t('quiz.reviewAnswers', 'Review Answers')}
          </button>
          <button
            onClick={handleRetake}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 justify-center"
          >
            <RotateCcw size={14} />
            {t('quiz.retakeQuiz', 'Retake Quiz')}
          </button>
        </div>
      </div>
    );
  }

  // ── In-Progress / Reviewing ─────────────────────────────────────
  const isReviewing = stage === 'reviewing';

  const exerciseTitle = currentExercise === 1
    ? t('quiz.exercise1Title', 'Image & Word')
    : currentExercise === 2
      ? t('quiz.exercise2Title', 'Multiple Choice')
      : t('quiz.exercise3Title', 'Fill in the Blank');

  const exerciseInstruction = currentExercise === 1
    ? t('quiz.exercise1Instruction', 'Write the correct word under each image.')
    : currentExercise === 2
      ? t('quiz.exercise2Instruction', 'Choose the correct answer.')
      : t('quiz.exercise3Instruction', 'Fill in the missing word in each sentence.');

  return (
    <div className="py-8 px-4 md:px-8">
      {/* Exercise Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">
            {t('quiz.exerciseOf', 'Exercise {{current}} of {{total}}', { current: currentExercise, total: 3 })}
          </p>
          <h3 className="text-xl font-black text-white">{exerciseTitle}</h3>
          <p className="text-sm text-gray-400 mt-1">{exerciseInstruction}</p>
        </div>
        {!isReviewing && (
          <div className="text-right">
            <p className="text-sm text-gray-400">
              {exerciseAnsweredCount}/{currentQuestions.length} {t('quiz.answered', 'answered')}
            </p>
          </div>
        )}
      </div>

      {/* Progress Dots */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map(ex => (
          <div
            key={ex}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              ex === currentExercise ? 'bg-amber-500' : ex < currentExercise ? 'bg-green-500' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {/* Exercise Content */}
      <div className="mb-8">
        {currentExercise === 1 && (
          <ImageWordExercise
            questions={currentQuestions}
            answers={answers}
            onAnswer={handleAnswer}
            isReviewing={isReviewing}
          />
        )}
        {currentExercise === 2 && (
          <MultipleChoiceExercise
            questions={currentQuestions}
            answers={answers}
            onAnswer={handleAnswer}
            isReviewing={isReviewing}
          />
        )}
        {currentExercise === 3 && (
          <FillInBlankExercise
            questions={currentQuestions}
            answers={answers}
            onAnswer={handleAnswer}
            isReviewing={isReviewing}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentExercise(prev => Math.max(1, prev - 1))}
          disabled={currentExercise === 1}
          className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <ChevronLeft size={14} />
          {t('quiz.prevExercise', 'Previous')}
        </button>

        {currentExercise < 3 ? (
          <button
            onClick={() => setCurrentExercise(prev => Math.min(3, prev + 1))}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
          >
            {t('quiz.nextExercise', 'Next Exercise')}
            <ChevronRight size={14} />
          </button>
        ) : isReviewing ? (
          <button
            onClick={handleRetake}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
          >
            <RotateCcw size={14} />
            {t('quiz.retakeQuiz', 'Retake Quiz')}
          </button>
        ) : (
          <>
            {showConfirmSubmit ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 mr-2 flex items-center gap-1">
                  <AlertTriangle size={12} className="text-amber-400" />
                  {t('quiz.confirmSubmit', 'Are you sure?')}
                </span>
                <button
                  onClick={() => setShowConfirmSubmit(false)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
                >
                  {t('quiz.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
                >
                  {t('quiz.confirmYes', 'Submit')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmSubmit(true)}
                className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
              >
                {t('quiz.submitQuiz', 'Submit Quiz')}
                <CheckCircle2 size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QuizRenderer;

// ── Exercise Sub-Components ────────────────────────────────────────

interface ExerciseProps {
  questions: QuizQuestion[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, value: string) => void;
  isReviewing: boolean;
}

// ── Exercise 1: Image-Word ─────────────────────────────────────────
const ImageWordExercise: React.FC<ExerciseProps> = ({ questions, answers, onAnswer, isReviewing }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
      {questions.map((q, idx) => {
        const studentAnswer = answers[q.id] ?? '';
        const isCorrect = isReviewing && studentAnswer.trim().toLowerCase() === (q.correctAnswer ?? '').toLowerCase();
        const isAcceptable = isReviewing && !isCorrect && (q.acceptableAnswers ?? []).some(
          a => a.toLowerCase() === studentAnswer.trim().toLowerCase()
        );
        const isWrong = isReviewing && studentAnswer.trim() !== '' && !isCorrect && !isAcceptable;
        const isEmpty = isReviewing && studentAnswer.trim() === '';

        return (
          <div key={q.id} className="flex flex-col items-center">
            <div className="w-full aspect-square bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-2 flex items-center justify-center">
              {q.imageUrl ? (
                <img
                  src={q.imageUrl}
                  alt={`Question ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <ImageIcon size={32} className="text-white/20" />
              )}
            </div>
            <span className="text-[10px] font-bold text-gray-500 mb-1">{idx + 1}.</span>
            {isReviewing ? (
              <div className="w-full text-center">
                <p className={`text-sm font-bold ${
                  (isCorrect || isAcceptable) ? 'text-green-400' : isEmpty ? 'text-gray-500' : 'text-red-400'
                }`}>
                  {studentAnswer || '—'}
                </p>
                {(isWrong || isEmpty) && (
                  <p className="text-xs text-green-400/70 mt-0.5">{q.correctAnswer}</p>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={studentAnswer}
                onChange={(e) => onAnswer(q.id, e.target.value)}
                placeholder="..."
                className="w-full text-center text-sm bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Exercise 2: Multiple Choice ────────────────────────────────────
const MultipleChoiceExercise: React.FC<ExerciseProps> = ({ questions, answers, onAnswer, isReviewing }) => {
  return (
    <div className="space-y-5">
      {questions.map((q, idx) => {
        const studentAnswer = answers[q.id] ?? '';
        const correctOptionId = q.correctAnswer ?? '';

        return (
          <div key={q.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <p className="text-sm text-white font-medium mb-3">
              <span className="text-amber-400 font-black mr-2">{idx + 1}.</span>
              {q.question}
            </p>
            <div className="space-y-2">
              {(q.options ?? []).map(opt => {
                const isSelected = studentAnswer === opt.id;
                const isCorrectOption = opt.id === correctOptionId;

                let optionStyle = 'bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer';
                if (isReviewing) {
                  if (isCorrectOption) {
                    optionStyle = 'bg-green-500/10 border-green-500/30';
                  } else if (isSelected && !isCorrectOption) {
                    optionStyle = 'bg-red-500/10 border-red-500/30';
                  } else {
                    optionStyle = 'bg-white/[0.02] border-white/5 opacity-50';
                  }
                } else if (isSelected) {
                  optionStyle = 'bg-amber-500/10 border-amber-500/30';
                }

                return (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all ${optionStyle} ${isReviewing ? 'cursor-default' : ''}`}
                  >
                    {isReviewing ? (
                      isCorrectOption ? (
                        <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                      ) : isSelected ? (
                        <XCircle size={16} className="text-red-400 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                      )
                    ) : (
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt.id}
                        checked={isSelected}
                        onChange={() => onAnswer(q.id, opt.id)}
                        className="accent-amber-500"
                      />
                    )}
                    <span className={`text-sm ${
                      isReviewing && isCorrectOption ? 'text-green-400 font-semibold' :
                      isReviewing && isSelected && !isCorrectOption ? 'text-red-400' :
                      'text-gray-300'
                    }`}>
                      <span className="font-bold text-gray-500 mr-1.5">{opt.id})</span>
                      {opt.text}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Exercise 3: Fill-in-Blank ──────────────────────────────────────
const FillInBlankExercise: React.FC<ExerciseProps> = ({ questions, answers, onAnswer, isReviewing }) => {
  return (
    <div className="space-y-4">
      {questions.map((q, idx) => {
        const studentAnswer = answers[q.id] ?? '';
        const normalizedStudent = studentAnswer.trim().toLowerCase();
        const correctAnswer = q.correctAnswer ?? '';
        const acceptable = q.acceptableAnswers?.map(a => a.toLowerCase()) ?? [];
        const isCorrect = isReviewing && (
          normalizedStudent === correctAnswer.toLowerCase() ||
          acceptable.includes(normalizedStudent)
        );
        const isWrong = isReviewing && normalizedStudent !== '' && !isCorrect;
        const isEmpty = isReviewing && normalizedStudent === '';

        // Split sentence around ___
        const parts = q.question.split('___');

        return (
          <div key={q.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
            isReviewing
              ? isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
              : 'bg-white/[0.02] border-white/5'
          }`}>
            <span className="text-amber-400 font-black text-sm mt-0.5 shrink-0">{idx + 1}.</span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-1 text-sm text-gray-300">
                {parts.map((part, i) => (
                  <React.Fragment key={i}>
                    <span>{part}</span>
                    {i < parts.length - 1 && (
                      isReviewing ? (
                        <span className={`inline-block px-2 py-0.5 rounded font-bold ${
                          isCorrect ? 'bg-green-500/20 text-green-400' :
                          isEmpty ? 'bg-gray-500/20 text-gray-500' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {studentAnswer || '—'}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={studentAnswer}
                          onChange={(e) => onAnswer(q.id, e.target.value)}
                          placeholder="..."
                          className="inline-block w-28 text-center text-sm bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                          autoComplete="off"
                          spellCheck={false}
                        />
                      )
                    )}
                  </React.Fragment>
                ))}
              </div>
              {isReviewing && (isWrong || isEmpty) && (
                <p className="text-xs text-green-400/70 mt-1">
                  ✓ {correctAnswer}
                  {q.acceptableAnswers && q.acceptableAnswers.length > 1 && (
                    <span className="text-gray-500"> ({q.acceptableAnswers.join(' / ')})</span>
                  )}
                </p>
              )}
            </div>
            {isReviewing && (
              <div className="shrink-0 mt-0.5">
                {isCorrect ? (
                  <CheckCircle2 size={16} className="text-green-400" />
                ) : (
                  <XCircle size={16} className="text-red-400" />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
