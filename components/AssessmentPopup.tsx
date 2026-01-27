// ============================================
// Assessment Popup Component
// English Level Placement Test
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, CheckCircle2, RotateCcw, Sparkles, Clock, Trophy, Target } from 'lucide-react';
import {
  AssessmentTestType,
  AssessmentQuestion,
  AssessmentAnswer,
  AssessmentResult,
  CourseLevel,
} from '../types';
import {
  getQuestionsForTest,
  calculateLevelScores,
  getRecommendedLevel,
  getLevelInfo,
  ASSESSMENT_STORAGE_KEY,
} from '../data/assessmentData';

interface AssessmentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  testType: AssessmentTestType;
  onNavigate?: (path: string) => void;
}

type PopupStage = 'intro' | 'quiz' | 'results';

const AssessmentPopup: React.FC<AssessmentPopupProps> = ({
  isOpen,
  onClose,
  testType,
  onNavigate,
}) => {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<PopupStage>('intro');
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Mount state for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Load questions when test type changes
  useEffect(() => {
    if (isOpen) {
      const loadedQuestions = getQuestionsForTest(testType);
      setQuestions(loadedQuestions);
    }
  }, [isOpen, testType]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset state when popup opens
  useEffect(() => {
    if (isOpen) {
      setStage('intro');
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setResult(null);
      setShowConfetti(false);
    }
  }, [isOpen]);

  // Start the test
  const handleStartTest = () => {
    setStage('quiz');
  };

  // Handle answer selection
  const handleSelectAnswer = (answerId: string) => {
    setSelectedAnswer(answerId);
  };

  // Submit current answer and move to next question
  const handleNextQuestion = () => {
    if (selectedAnswer === null) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    const newAnswer: AssessmentAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer,
      isCorrect,
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setSelectedAnswer(null);

    if (currentQuestionIndex < questions.length - 1) {
      // Move to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Test complete - calculate results
      const levelScores = calculateLevelScores(
        newAnswers.map((a) => ({ questionId: a.questionId, selectedAnswer: a.selectedAnswer })),
        questions
      );
      const recommendedLevel = getRecommendedLevel(levelScores);
      const totalCorrect = newAnswers.filter((a) => a.isCorrect).length;

      const assessmentResult: AssessmentResult = {
        testType,
        answers: newAnswers,
        levelScores,
        recommendedLevel,
        totalCorrect,
        totalQuestions: questions.length,
        completedAt: new Date().toISOString(),
      };

      setResult(assessmentResult);
      setStage('results');
      setShowConfetti(true);

      // Save to localStorage
      localStorage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify(assessmentResult));

      // Hide confetti after 5 seconds
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  // Go back to previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      // Remove the last answer
      const newAnswers = answers.slice(0, -1);
      setAnswers(newAnswers);
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Restore the previous selected answer if any
      const prevAnswer = newAnswers[newAnswers.length - 1];
      setSelectedAnswer(prevAnswer ? null : null);
    }
  };

  // Retake the test
  const handleRetake = () => {
    setStage('intro');
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setResult(null);
    setShowConfetti(false);
  };

  // Navigate to courses
  const handleViewCourse = () => {
    onClose();
    onNavigate?.('courses');
  };

  // Get current level for progress indicator
  const getCurrentLevel = (): string => {
    if (questions.length === 0) return '';
    const question = questions[currentQuestionIndex];
    return question?.level || 'A1';
  };

  // Get progress percentage
  const getProgress = (): number => {
    if (questions.length === 0) return 0;
    return ((currentQuestionIndex + 1) / questions.length) * 100;
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={stage === 'quiz' ? undefined : onClose}
      />

      {/* Confetti Container */}
      {showConfetti && (
        <div
          id="assessment-confetti"
          className="absolute inset-0 pointer-events-none overflow-hidden"
        >
          <Confetti />
        </div>
      )}

      {/* Modal */}
      <div
        className={`relative bg-white rounded-[2rem] shadow-2xl w-full max-h-[90vh] flex flex-col animate-reveal ${
          stage === 'results' ? 'max-w-2xl' : 'max-w-xl'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Close button - only show on intro and results */}
        {stage !== 'quiz' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2.5 bg-gray-100 hover:bg-red-100 rounded-xl transition-colors group"
          >
            <X size={20} className="text-gray-500 group-hover:text-red-600" />
          </button>
        )}

        {/* Content based on stage */}
        {stage === 'intro' && (
          <IntroStage testType={testType} onStart={handleStartTest} />
        )}

        {stage === 'quiz' && questions.length > 0 && (
          <QuizStage
            question={questions[currentQuestionIndex]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            currentLevel={getCurrentLevel()}
            progress={getProgress()}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={handleSelectAnswer}
            onNext={handleNextQuestion}
            onPrevious={handlePreviousQuestion}
            canGoBack={currentQuestionIndex > 0}
            onClose={onClose}
          />
        )}

        {stage === 'results' && result && (
          <ResultsStage
            result={result}
            onRetake={handleRetake}
            onViewCourse={handleViewCourse}
          />
        )}
      </div>
    </div>,
    document.body
  );
};

// ---------- Intro Stage ----------
interface IntroStageProps {
  testType: AssessmentTestType;
  onStart: () => void;
}

const IntroStage: React.FC<IntroStageProps> = ({ testType, onStart }) => {
  const isKids = testType === 'kids';
  
  return (
    <div className="p-8 text-center">
      <div className={`w-20 h-20 ${isKids ? 'bg-gradient-to-br from-pink-100 to-orange-100' : 'bg-gradient-to-br from-purple-100 to-pink-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
        <Target className={`w-10 h-10 ${isKids ? 'text-pink-600' : 'text-purple-600'}`} />
      </div>

      <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-3">
        {isKids ? 'Discover Your Kid\'s Level' : 'Discover Your English Level'}
      </h2>

      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        {isKids
          ? 'A fun 30-question test designed for young learners! Find the perfect course for your child in about 10 minutes.'
          : 'Take our 40-question placement test to find the perfect course for your level. It only takes about 10-15 minutes!'}
      </p>

      {/* Test Info */}
      <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className={`text-2xl font-black ${isKids ? 'text-pink-600' : 'text-purple-600'}`}>
            {isKids ? '30' : '40'}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Questions</div>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className={`text-2xl font-black ${isKids ? 'text-pink-600' : 'text-purple-600'}`}>
            {isKids ? '3' : '4'}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Levels</div>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center justify-center gap-1">
            <Clock className={`w-5 h-5 ${isKids ? 'text-pink-600' : 'text-purple-600'}`} />
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {isKids ? '~10 min' : '~15 min'}
          </div>
        </div>
      </div>

      {/* Level Badges */}
      <div className="flex justify-center gap-2 mb-8">
        {isKids ? (
          <>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
              🟢 Starters
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              🔵 Movers
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
              🟣 Flyers
            </span>
          </>
        ) : (
          <>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
              A1
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              A2
            </span>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
              B1
            </span>
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
              B2
            </span>
          </>
        )}
      </div>

      <button
        onClick={onStart}
        className={`${isKids ? 'bg-gradient-to-r from-pink-500 to-orange-500 shadow-pink-200' : 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-purple-200'} text-white px-10 py-4 rounded-full font-black uppercase tracking-wide hover:scale-105 transition-transform shadow-xl`}
      >
        Start Assessment
      </button>

      <p className="text-xs text-gray-400 mt-4">No login required • Free assessment</p>
    </div>
  );
};

// ---------- Quiz Stage ----------
interface QuizStageProps {
  question: AssessmentQuestion;
  questionNumber: number;
  totalQuestions: number;
  currentLevel: string;
  progress: number;
  selectedAnswer: string | null;
  onSelectAnswer: (answerId: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoBack: boolean;
  onClose: () => void;
}

const QuizStage: React.FC<QuizStageProps> = ({
  question,
  questionNumber,
  totalQuestions,
  currentLevel,
  progress,
  selectedAnswer,
  onSelectAnswer,
  onNext,
  onPrevious,
  canGoBack,
  onClose,
}) => {
  const levelInfo = getLevelInfo(currentLevel as CourseLevel);

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header with progress */}
      <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-bold ${levelInfo.bgColor} ${levelInfo.color}`}
            >
              {levelInfo.emoji} {currentLevel}
            </span>
            <span className="text-sm text-gray-500">
              Question {questionNumber} of {totalQuestions}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            Exit Test
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-8 leading-relaxed">
          {question.question}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option) => (
            <button
              key={option.id}
              onClick={() => onSelectAnswer(option.id)}
              className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all ${
                selectedAnswer === option.id
                  ? 'border-purple-600 bg-purple-50 shadow-lg shadow-purple-100'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                    selectedAnswer === option.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {option.id}
                </span>
                <span
                  className={`text-lg ${
                    selectedAnswer === option.id
                      ? 'text-purple-900 font-semibold'
                      : 'text-gray-700'
                  }`}
                >
                  {option.text}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer with navigation */}
      <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={onPrevious}
            disabled={!canGoBack}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              canGoBack
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronLeft size={20} />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <button
            onClick={onNext}
            disabled={selectedAnswer === null}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              selectedAnswer !== null
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>{questionNumber === totalQuestions ? 'Finish' : 'Next'}</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Results Stage ----------
interface ResultsStageProps {
  result: AssessmentResult;
  onRetake: () => void;
  onViewCourse: () => void;
}

const ResultsStage: React.FC<ResultsStageProps> = ({ result, onRetake, onViewCourse }) => {
  const levelInfo = getLevelInfo(result.recommendedLevel);
  const percentage = Math.round((result.totalCorrect / result.totalQuestions) * 100);

  return (
    <div className="p-6 md:p-8 overflow-y-auto max-h-[90vh]">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <Trophy className="w-12 h-12 text-purple-600" />
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
          Assessment Complete! 🎉
        </h2>
        <p className="text-gray-600">
          You answered {result.totalCorrect} out of {result.totalQuestions} questions correctly ({percentage}%)
        </p>
      </div>

      {/* Recommended Level Card */}
      <div
        className={`${levelInfo.bgColor} rounded-3xl p-6 md:p-8 mb-6 text-center border-2 border-white shadow-xl`}
      >
        <p className="text-sm uppercase tracking-wide font-semibold text-gray-600 mb-2">
          Your Recommended Level
        </p>
        <div className={`text-4xl md:text-5xl font-black ${levelInfo.color} mb-3`}>
          {levelInfo.emoji} {result.recommendedLevel}
        </div>
        <h3 className={`text-xl font-bold ${levelInfo.color} mb-2`}>{levelInfo.name}</h3>
        <p className="text-gray-600 text-sm max-w-md mx-auto">{levelInfo.description}</p>
      </div>

      {/* Level Breakdown */}
      <div className="bg-gray-50 rounded-2xl p-5 mb-8">
        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          Score Breakdown by Level
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {result.levelScores.map((score) => {
            const info = getLevelInfo(score.level as CourseLevel);
            return (
              <div
                key={score.level}
                className={`p-3 rounded-xl text-center ${
                  score.passed ? 'bg-white shadow-sm border-2 border-green-200' : 'bg-white/50'
                }`}
              >
                <div className="text-sm font-semibold text-gray-500 mb-1">
                  {info.emoji} {score.level}
                </div>
                <div
                  className={`text-xl font-black ${
                    score.passed ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {score.correct}/{score.total}
                </div>
                <div
                  className={`text-xs font-semibold ${
                    score.passed ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {score.passed ? '✓ Passed' : 'Not passed'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onRetake}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border-2 border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RotateCcw size={20} />
          Retake Test
        </button>
        <button
          onClick={onViewCourse}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold hover:scale-105 transition-transform shadow-xl shadow-purple-200"
        >
          View Recommended Course
          <ChevronRight size={20} />
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        Your result has been saved locally. Create an account to track your progress!
      </p>
    </div>
  );
};

// ---------- Confetti Component ----------
const Confetti: React.FC = () => {
  const colors = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => i);

  return (
    <>
      <style>
        {`
          @keyframes confetti-fall {
            0% {
              transform: translateY(-10px) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }
        `}
      </style>
      {confettiPieces.map((i) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          width: `${Math.random() * 10 + 5}px`,
          height: `${Math.random() * 10 + 5}px`,
          background: colors[Math.floor(Math.random() * colors.length)],
          left: `${Math.random() * 100}%`,
          top: '-20px',
          borderRadius: Math.random() > 0.5 ? '50%' : '0',
          animation: `confetti-fall ${Math.random() * 3 + 2}s linear forwards`,
          animationDelay: `${Math.random() * 2}s`,
          opacity: 0.8,
        };
        return <div key={i} style={style} />;
      })}
    </>
  );
};

export default AssessmentPopup;
