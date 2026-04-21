// ============================================
// FinalTestRenderer — Comprehensive A1 Final Test
// ============================================
// Dedicated renderer for the multi-exercise (Vocabulary + Grammar) final test.
// Independent of QuizRenderer (Stop & Check). Adds two new question types:
//   - 'spelling-correction'  → misspelled word + (optional) image, type the corrected word.
//   - 'word-bank'            → shared list of words shown above the passage; type into blanks.

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Award,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Trophy,
  Image as ImageIcon,
  AlertTriangle,
  Download,
  GraduationCap,
  BookOpen,
  Languages,
} from 'lucide-react';
import { Module, QuizQuestion, FinalTestExercise } from '../types';
import { gradeFinalTest } from '../data/quizHelpers';
import {
  a1FinalTestExercises,
  A1_FINAL_TEST_PASS_THRESHOLD,
  A1_FINAL_TEST_PASSED_KEY,
  A1_CERTIFICATE_URL,
} from '../data/finalTestData';

type Stage = 'intro' | 'in-progress' | 'reviewing' | 'results';

interface FinalTestResult {
  score: number;
  totalQuestions: number;
  exerciseScores: Record<number, { correct: number; total: number }>;
  answers: Record<string, string>;
  percentage: number;
}

interface FinalTestRendererProps {
  courseId: string;
  module: Module;
  exercises?: FinalTestExercise[];
  passThreshold?: number;
  certificateUrl?: string;
  onPassed?: () => void;
}

// ── Component ──────────────────────────────────────────────────────
const FinalTestRenderer: React.FC<FinalTestRendererProps> = ({
  module,
  exercises = a1FinalTestExercises,
  passThreshold = A1_FINAL_TEST_PASS_THRESHOLD,
  certificateUrl = A1_CERTIFICATE_URL,
  onPassed,
}) => {
  const { t } = useTranslation('courses');

  const [stage, setStage] = useState<Stage>('intro');
  const [currentIndex, setCurrentIndex] = useState(0); // 0-based exercise index
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [result, setResult] = useState<FinalTestResult | null>(null);
  const [hasPreviouslyPassed, setHasPreviouslyPassed] = useState(false);

  useEffect(() => {
    try {
      setHasPreviouslyPassed(localStorage.getItem(A1_FINAL_TEST_PASSED_KEY) === 'true');
    } catch { /* ignore */ }
  }, []);

  const totalQuestions = useMemo(
    () => exercises.reduce((sum, e) => sum + e.questions.length, 0),
    [exercises],
  );
  const currentExercise = exercises[currentIndex];
  const currentQuestions = currentExercise?.questions ?? [];

  const handleAnswer = useCallback((questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    const graded = gradeFinalTest(exercises, answers);
    setResult(graded);
    setStage('results');
    if (graded.percentage >= passThreshold) {
      try { localStorage.setItem(A1_FINAL_TEST_PASSED_KEY, 'true'); } catch { /* ignore */ }
      setHasPreviouslyPassed(true);
      onPassed?.();
    }
  }, [exercises, answers, passThreshold, onPassed]);

  const handleRetake = useCallback(() => {
    setAnswers({});
    setResult(null);
    setCurrentIndex(0);
    setShowConfirmSubmit(false);
    setStage('intro');
  }, []);

  const exerciseAnsweredCount = useMemo(
    () => currentQuestions.filter(q => answers[q.id]?.trim()).length,
    [currentQuestions, answers],
  );

  // ── Intro Screen ────────────────────────────────────────────────
  if (stage === 'intro') {
    const vocabCount = exercises.filter(e => e.section === 'vocabulary').length;
    const grammarCount = exercises.filter(e => e.section === 'grammar').length;

    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-6">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
          <GraduationCap size={40} className="text-amber-400" />
        </div>
        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">
          {t('quiz.finalTest.label', 'Final Test')}
        </p>
        <h2 className="text-2xl md:text-3xl font-black text-white mb-3">{module.title}</h2>
        {module.description && (
          <p className="text-gray-400 max-w-lg mb-6">{module.description}</p>
        )}

        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <Stat value={String(exercises.length)} label={t('quiz.exercises', 'Exercises')} />
          <Stat value={String(totalQuestions)} label={t('quiz.questions', 'Questions')} />
          <Stat value={`${passThreshold}%`} label={t('quiz.finalTest.passThreshold', 'To Pass')} accent="green" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mb-8 text-left">
          <SectionCard
            icon={<BookOpen size={16} />}
            title={t('quiz.finalTest.sections.vocabulary', 'Vocabulary')}
            count={vocabCount}
          />
          <SectionCard
            icon={<Languages size={16} />}
            title={t('quiz.finalTest.sections.grammar', 'Grammar')}
            count={grammarCount}
          />
        </div>

        {hasPreviouslyPassed && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-xs font-bold mb-6">
            <Award size={14} />
            {t('quiz.finalTest.alreadyPassed', 'You have already passed this test — your certificate is unlocked.')}
          </div>
        )}

        <button
          onClick={() => setStage('in-progress')}
          className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all"
        >
          {t('quiz.finalTest.start', 'Start Final Test')}
        </button>
      </div>
    );
  }

  // ── Results Screen ──────────────────────────────────────────────
  if (stage === 'results' && result) {
    const isPassing = result.percentage >= passThreshold;

    return (
      <div className="py-12 px-6">
        <div className="text-center mb-10">
          <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4 ${isPassing ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
            {isPassing ? <Award size={44} className="text-green-400" /> : <Trophy size={40} className="text-amber-400" />}
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
            {isPassing
              ? t('quiz.finalTest.passed', 'Congratulations — A1 Level Complete!')
              : t('quiz.finalTest.failed', 'Almost there — try again!')}
          </h2>
          <p className="text-4xl font-black text-white mb-1">
            {result.score}<span className="text-gray-500">/{result.totalQuestions}</span>
          </p>
          <p className="text-sm text-gray-400">
            {result.percentage}% {t('quiz.correct', 'correct')} · {t('quiz.finalTest.passThresholdLine', '{{n}}% required to pass', { n: passThreshold })}
          </p>
        </div>

        {/* Per-exercise breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl mx-auto mb-10">
          {exercises.map((ex, i) => {
            const s = result.exerciseScores[ex.group];
            if (!s) return null;
            const exPercent = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            return (
              <div key={ex.group} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${ex.section === 'vocabulary' ? 'text-purple-400' : 'text-blue-400'}`}>
                    {ex.section === 'vocabulary'
                      ? t('quiz.finalTest.sections.vocabulary', 'Vocabulary')
                      : t('quiz.finalTest.sections.grammar', 'Grammar')} {i + 1}
                  </span>
                  <span className="text-sm font-black text-white">{s.correct}/{s.total}</span>
                </div>
                <p className="text-xs text-gray-400 mb-2 truncate">{t(ex.titleKey, ex.titleFallback)}</p>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div
                    className={`h-full rounded-full transition-all ${exPercent >= passThreshold ? 'bg-green-500' : 'bg-amber-500'}`}
                    style={{ width: `${exPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Certificate Card */}
        {isPassing && (
          <div className="max-w-xl mx-auto mb-8 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-6 text-center">
            <Award size={32} className="text-amber-400 mx-auto mb-3" />
            <h3 className="text-lg font-black text-white mb-1">
              {t('quiz.finalTest.certificateTitle', 'A1 Completion Certificate Unlocked')}
            </h3>
            <p className="text-sm text-gray-400 mb-5">
              {t('quiz.finalTest.certificateSubtitle', 'Download your official A1 completion certificate.')}
            </p>
            <a
              href={certificateUrl}
              download="A1-Certificate.jpg"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all"
            >
              <Download size={14} />
              {t('quiz.finalTest.downloadCertificate', 'Download Certificate')}
            </a>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => { setStage('reviewing'); setCurrentIndex(0); }}
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
  const isLast = currentIndex >= exercises.length - 1;
  const sectionAccent = currentExercise?.section === 'vocabulary' ? 'purple' : 'blue';

  return (
    <div className="py-8 px-4 md:px-8">
      {/* Section pill + Exercise header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
              sectionAccent === 'purple' ? 'bg-purple-500/15 text-purple-300' : 'bg-blue-500/15 text-blue-300'
            }`}>
              {currentExercise?.section === 'vocabulary'
                ? <BookOpen size={10} />
                : <Languages size={10} />}
              {currentExercise?.section === 'vocabulary'
                ? t('quiz.finalTest.sections.vocabulary', 'Vocabulary')
                : t('quiz.finalTest.sections.grammar', 'Grammar')}
            </span>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              {t('quiz.exerciseOf', 'Exercise {{current}} of {{total}}', { current: currentIndex + 1, total: exercises.length })}
            </span>
          </div>
          <h3 className="text-xl font-black text-white">{t(currentExercise.titleKey, currentExercise.titleFallback)}</h3>
          <p className="text-sm text-gray-400 mt-1">{t(currentExercise.instructionKey, currentExercise.instructionFallback)}</p>
        </div>
        {!isReviewing && (
          <div className="text-right">
            <p className="text-sm text-gray-400">
              {exerciseAnsweredCount}/{currentQuestions.length} {t('quiz.answered', 'answered')}
            </p>
          </div>
        )}
      </div>

      {/* Progress dots — one per exercise */}
      <div className="flex gap-1.5 mb-8">
        {exercises.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i === currentIndex ? 'bg-amber-500' : i < currentIndex ? 'bg-green-500' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {/* Word Bank (only for word-bank exercises) */}
      {currentExercise.type === 'word-bank' && currentExercise.wordBank && (
        <WordBankPanel words={currentExercise.wordBank} />
      )}

      {/* Exercise body */}
      <div className="mb-8">
        {currentExercise.type === 'image-word' && (
          <ImageWordBlock questions={currentQuestions} answers={answers} onAnswer={handleAnswer} isReviewing={isReviewing} />
        )}
        {currentExercise.type === 'multiple-choice' && (
          <MultipleChoiceBlock questions={currentQuestions} answers={answers} onAnswer={handleAnswer} isReviewing={isReviewing} />
        )}
        {currentExercise.type === 'fill-in-blank' && (
          <FillInBlankBlock questions={currentQuestions} answers={answers} onAnswer={handleAnswer} isReviewing={isReviewing} />
        )}
        {currentExercise.type === 'spelling-correction' && (
          <SpellingCorrectionBlock questions={currentQuestions} answers={answers} onAnswer={handleAnswer} isReviewing={isReviewing} />
        )}
        {currentExercise.type === 'word-bank' && (
          <WordBankBlock questions={currentQuestions} answers={answers} onAnswer={handleAnswer} isReviewing={isReviewing} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <ChevronLeft size={14} />
          {t('quiz.prevExercise', 'Previous')}
        </button>

        {!isLast ? (
          <button
            onClick={() => setCurrentIndex(prev => Math.min(exercises.length - 1, prev + 1))}
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

export default FinalTestRenderer;

// ── Small UI helpers ───────────────────────────────────────────────
const Stat: React.FC<{ value: string; label: string; accent?: 'green' }> = ({ value, label, accent }) => (
  <div className={`rounded-xl px-5 py-3 text-center border ${accent === 'green' ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
    <p className={`text-2xl font-black ${accent === 'green' ? 'text-green-400' : 'text-white'}`}>{value}</p>
    <p className={`text-[10px] font-bold uppercase tracking-widest ${accent === 'green' ? 'text-green-500/70' : 'text-gray-500'}`}>{label}</p>
  </div>
);

const SectionCard: React.FC<{ icon: React.ReactNode; title: string; count: number }> = ({ icon, title, count }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">{icon}</div>
    <div>
      <p className="text-sm font-black text-white">{title}</p>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{count} exercises</p>
    </div>
  </div>
);

const WordBankPanel: React.FC<{ words: string[] }> = ({ words }) => {
  const { t } = useTranslation('courses');
  return (
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mb-6">
      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">
        {t('quiz.finalTest.wordBank', 'Word Bank')}
      </p>
      <div className="flex flex-wrap gap-2">
        {words.map(w => (
          <span key={w} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-gray-200 font-medium">
            {w}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Block sub-renderers ────────────────────────────────────────────
interface BlockProps {
  questions: QuizQuestion[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, value: string) => void;
  isReviewing: boolean;
}

// Image-Word
const ImageWordBlock: React.FC<BlockProps> = ({ questions, answers, onAnswer, isReviewing }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
    {questions.map((q, idx) => {
      const studentAnswer = answers[q.id] ?? '';
      const norm = (s: string) => s.trim().toLowerCase();
      const isCorrect = isReviewing && norm(studentAnswer) === norm(q.correctAnswer ?? '');
      const isAcceptable = isReviewing && !isCorrect && (q.acceptableAnswers ?? []).some(a => norm(a) === norm(studentAnswer));
      const isWrong = isReviewing && studentAnswer.trim() !== '' && !isCorrect && !isAcceptable;
      const isEmpty = isReviewing && studentAnswer.trim() === '';

      return (
        <div key={q.id} className="flex flex-col items-center">
          <div className="w-full aspect-square bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-2 flex items-center justify-center">
            {q.imageUrl ? (
              <img src={q.imageUrl} alt={`Question ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <ImageIcon size={32} className="text-white/20" />
            )}
          </div>
          <span className="text-[10px] font-bold text-gray-500 mb-1">{idx + 1}.</span>
          {isReviewing ? (
            <div className="w-full text-center">
              <p className={`text-sm font-bold ${(isCorrect || isAcceptable) ? 'text-green-400' : isEmpty ? 'text-gray-500' : 'text-red-400'}`}>
                {studentAnswer || '—'}
              </p>
              {(isWrong || isEmpty) && <p className="text-xs text-green-400/70 mt-0.5">{q.correctAnswer}</p>}
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

// Multiple Choice
const MultipleChoiceBlock: React.FC<BlockProps> = ({ questions, answers, onAnswer, isReviewing }) => (
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
                if (isCorrectOption) optionStyle = 'bg-green-500/10 border-green-500/30';
                else if (isSelected && !isCorrectOption) optionStyle = 'bg-red-500/10 border-red-500/30';
                else optionStyle = 'bg-white/[0.02] border-white/5 opacity-50';
              } else if (isSelected) {
                optionStyle = 'bg-amber-500/10 border-amber-500/30';
              }

              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all ${optionStyle} ${isReviewing ? 'cursor-default' : ''}`}
                >
                  {isReviewing ? (
                    isCorrectOption ? <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                    : isSelected ? <XCircle size={16} className="text-red-400 shrink-0" />
                    : <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
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
                    isReviewing && isCorrectOption ? 'text-green-400 font-semibold'
                    : isReviewing && isSelected && !isCorrectOption ? 'text-red-400'
                    : 'text-gray-300'
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

// Fill-in-Blank (and Word-Bank — same passage layout)
const renderBlankRow = (
  q: QuizQuestion,
  idx: number,
  studentAnswer: string,
  onAnswer: (id: string, v: string) => void,
  isReviewing: boolean,
) => {
  const norm = (s: string) => s.trim().toLowerCase();
  const correct = q.correctAnswer ?? '';
  const acceptable = (q.acceptableAnswers ?? []).map(norm);
  const isCorrect = isReviewing && (norm(studentAnswer) === norm(correct) || acceptable.includes(norm(studentAnswer)));
  const isEmpty = isReviewing && studentAnswer.trim() === '';
  const isWrong = isReviewing && !isCorrect && !isEmpty;

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
                    isCorrect ? 'bg-green-500/20 text-green-400'
                    : isEmpty ? 'bg-gray-500/20 text-gray-500'
                    : 'bg-red-500/20 text-red-400'
                  }`}>
                    {studentAnswer || '—'}
                  </span>
                ) : (
                  <input
                    type="text"
                    value={studentAnswer}
                    onChange={(e) => onAnswer(q.id, e.target.value)}
                    placeholder="..."
                    className="inline-block w-32 text-center text-sm bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
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
            ✓ {correct}
            {q.acceptableAnswers && q.acceptableAnswers.length > 1 && (
              <span className="text-gray-500"> ({q.acceptableAnswers.join(' / ')})</span>
            )}
          </p>
        )}
      </div>
      {isReviewing && (
        <div className="shrink-0 mt-0.5">
          {isCorrect ? <CheckCircle2 size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
        </div>
      )}
    </div>
  );
};

const FillInBlankBlock: React.FC<BlockProps> = ({ questions, answers, onAnswer, isReviewing }) => (
  <div className="space-y-3">
    {questions.map((q, idx) => renderBlankRow(q, idx, answers[q.id] ?? '', onAnswer, isReviewing))}
  </div>
);

const WordBankBlock: React.FC<BlockProps> = ({ questions, answers, onAnswer, isReviewing }) => (
  <div className="space-y-3">
    {questions.map((q, idx) => renderBlankRow(q, idx, answers[q.id] ?? '', onAnswer, isReviewing))}
  </div>
);

// Spelling Correction
const SpellingCorrectionBlock: React.FC<BlockProps> = ({ questions, answers, onAnswer, isReviewing }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {questions.map((q, idx) => {
      const studentAnswer = answers[q.id] ?? '';
      const norm = (s: string) => s.trim().toLowerCase();
      const isCorrect = isReviewing && norm(studentAnswer) === norm(q.correctAnswer ?? '');
      const isEmpty = isReviewing && studentAnswer.trim() === '';
      const isWrong = isReviewing && !isCorrect && !isEmpty;

      return (
        <div key={q.id} className={`flex flex-col items-stretch p-4 rounded-xl border ${
          isReviewing
            ? isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
            : 'bg-white/[0.02] border-white/5'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-400 font-black text-sm">{idx + 1}.</span>
            {q.imageUrl && (
              <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 overflow-hidden shrink-0">
                <img src={q.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}
            <span className="text-base font-bold text-gray-400 line-through tracking-wide">
              {q.displayedWord ?? q.question}
            </span>
          </div>
          {isReviewing ? (
            <div>
              <p className={`text-sm font-bold ${isCorrect ? 'text-green-400' : isEmpty ? 'text-gray-500' : 'text-red-400'}`}>
                {studentAnswer || '—'}
              </p>
              {(isWrong || isEmpty) && (
                <p className="text-xs text-green-400/70 mt-1">✓ {q.correctAnswer}</p>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={studentAnswer}
              onChange={(e) => onAnswer(q.id, e.target.value)}
              placeholder="Correct spelling..."
              className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </div>
      );
    })}
  </div>
);
