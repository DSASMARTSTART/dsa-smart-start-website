// ============================================
// DSA Smart Start - Assessment Test Data
// ============================================

import { AssessmentQuestion, AssessmentTestType, CourseLevel, AssessmentLevelScore } from '../types';

// ---------- Teens & Adults Test (40 Questions) ----------
export const teensAdultsQuestions: AssessmentQuestion[] = [
  // 🟢 A1 — BASIC USER (Questions 1-10)
  {
    id: 1,
    level: 'A1',
    question: 'She _____ 21 years old.',
    options: [
      { id: 'A', text: 'has' },
      { id: 'B', text: 'is' },
      { id: 'C', text: 'have' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 2,
    level: 'A1',
    question: 'I _____ very cold.',
    options: [
      { id: 'A', text: 'are' },
      { id: 'B', text: 'is' },
      { id: 'C', text: 'am' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 3,
    level: 'A1',
    question: 'There _____ two books on the table.',
    options: [
      { id: 'A', text: 'is' },
      { id: 'B', text: 'are' },
      { id: 'C', text: 'have' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 4,
    level: 'A1',
    question: 'This is _____ house.',
    options: [
      { id: 'A', text: 'she' },
      { id: 'B', text: 'her' },
      { id: 'C', text: 'hers' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 5,
    level: 'A1',
    question: "This is Anna _____ bag.",
    options: [
      { id: 'A', text: 'of' },
      { id: 'B', text: "'s" },
      { id: 'C', text: "s'" },
    ],
    correctAnswer: 'B',
  },
  {
    id: 6,
    level: 'A1',
    question: 'Yesterday I _____ at home.',
    options: [
      { id: 'A', text: 'am' },
      { id: 'B', text: 'was' },
      { id: 'C', text: 'were' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 7,
    level: 'A1',
    question: 'Where _____ you live?',
    options: [
      { id: 'A', text: 'do' },
      { id: 'B', text: 'does' },
      { id: 'C', text: 'are' },
    ],
    correctAnswer: 'A',
  },
  {
    id: 8,
    level: 'A1',
    question: 'She _____ like coffee.',
    options: [
      { id: 'A', text: "don't" },
      { id: 'B', text: "doesn't" },
      { id: 'C', text: "isn't" },
    ],
    correctAnswer: 'B',
  },
  {
    id: 9,
    level: 'A1',
    question: 'I _____ pizza yesterday.',
    options: [
      { id: 'A', text: 'eat' },
      { id: 'B', text: 'ate' },
      { id: 'C', text: 'eaten' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 10,
    level: 'A1',
    question: 'They _____ football last Sunday.',
    options: [
      { id: 'A', text: 'play' },
      { id: 'B', text: 'played' },
      { id: 'C', text: 'have played' },
    ],
    correctAnswer: 'B',
  },

  // 🔵 A2 — ELEMENTARY / PRE-INTERMEDIATE (Questions 11-20)
  {
    id: 11,
    level: 'A2',
    question: 'She usually _____ to school, but today she _____ at home.',
    options: [
      { id: 'A', text: 'goes / is staying' },
      { id: 'B', text: 'is going / stays' },
      { id: 'C', text: 'go / staying' },
    ],
    correctAnswer: 'A',
  },
  {
    id: 12,
    level: 'A2',
    question: '_____ you _____ TV right now?',
    options: [
      { id: 'A', text: 'Do / watch' },
      { id: 'B', text: 'Are / watching' },
      { id: 'C', text: 'Do / watching' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 13,
    level: 'A2',
    question: 'I _____ watching this film at the moment.',
    options: [
      { id: 'A', text: "don't" },
      { id: 'B', text: 'am not' },
      { id: 'C', text: "aren't" },
    ],
    correctAnswer: 'B',
  },
  {
    id: 14,
    level: 'A2',
    question: 'While I _____, the phone rang.',
    options: [
      { id: 'A', text: 'studied' },
      { id: 'B', text: 'was studying' },
      { id: 'C', text: 'study' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 15,
    level: 'A2',
    question: "There isn't _____ milk left.",
    options: [
      { id: 'A', text: 'many' },
      { id: 'B', text: 'any' },
      { id: 'C', text: 'a lots' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 16,
    level: 'A2',
    question: 'You _____ study more if you want to pass the exam.',
    options: [
      { id: 'A', text: 'might' },
      { id: 'B', text: 'should' },
      { id: 'C', text: 'may' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 17,
    level: 'A2',
    question: "You _____ wear a helmet. It's obligatory.",
    options: [
      { id: 'A', text: 'should' },
      { id: 'B', text: 'must' },
      { id: 'C', text: 'might' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 18,
    level: 'A2',
    question: 'I have _____ finished my homework.',
    options: [
      { id: 'A', text: 'yet' },
      { id: 'B', text: 'just' },
      { id: 'C', text: 'still' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 19,
    level: 'A2',
    question: 'If it rains, we _____ at home.',
    options: [
      { id: 'A', text: 'are staying' },
      { id: 'B', text: 'will stay' },
      { id: 'C', text: 'stay' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 20,
    level: 'A2',
    question: 'Have you ever _____ to Paris?',
    options: [
      { id: 'A', text: 'been' },
      { id: 'B', text: 'went' },
      { id: 'C', text: 'go' },
    ],
    correctAnswer: 'A',
  },

  // 🟠 B1 — INTERMEDIATE (Questions 21-30)
  {
    id: 21,
    level: 'B1',
    question: "I'm tired. I _____ all day.",
    options: [
      { id: 'A', text: 'studied' },
      { id: 'B', text: 'have been studying' },
      { id: 'C', text: 'had studied' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 22,
    level: 'B1',
    question: 'When we arrived, the film _____ already _____.',
    options: [
      { id: 'A', text: 'has / started' },
      { id: 'B', text: 'had / started' },
      { id: 'C', text: 'was / starting' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 23,
    level: 'B1',
    question: 'He said he _____ busy.',
    options: [
      { id: 'A', text: 'is' },
      { id: 'B', text: 'was' },
      { id: 'C', text: 'has been' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 24,
    level: 'B1',
    question: 'If I _____ more time, I would travel more.',
    options: [
      { id: 'A', text: 'have' },
      { id: 'B', text: 'had' },
      { id: 'C', text: 'would have' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 25,
    level: 'B1',
    question: 'If she had studied more, she _____ the exam.',
    options: [
      { id: 'A', text: 'pass' },
      { id: 'B', text: 'would pass' },
      { id: 'C', text: 'would have passed' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 26,
    level: 'B1',
    question: 'This cake is _____ than the previous one.',
    options: [
      { id: 'A', text: 'more good' },
      { id: 'B', text: 'better' },
      { id: 'C', text: 'best' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 27,
    level: 'B1',
    question: 'She is _____ than her sister.',
    options: [
      { id: 'A', text: 'more bad' },
      { id: 'B', text: 'worse' },
      { id: 'C', text: 'worst' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 28,
    level: 'B1',
    question: 'He told me that he _____ never been there before.',
    options: [
      { id: 'A', text: 'has' },
      { id: 'B', text: 'had' },
      { id: 'C', text: 'was' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 29,
    level: 'B1',
    question: 'I _____ for two hours before he arrived.',
    options: [
      { id: 'A', text: 'waited' },
      { id: 'B', text: 'have waited' },
      { id: 'C', text: 'had waited' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 30,
    level: 'B1',
    question: 'If I were you, I _____ accept that job.',
    options: [
      { id: 'A', text: 'will' },
      { id: 'B', text: 'would' },
      { id: 'C', text: 'would have' },
    ],
    correctAnswer: 'B',
  },

  // 🔴 B2 — UPPER INTERMEDIATE (Questions 31-40)
  {
    id: 31,
    level: 'B2',
    question: 'By next year, I _____ my degree.',
    options: [
      { id: 'A', text: 'will finish' },
      { id: 'B', text: 'will have finished' },
      { id: 'C', text: 'will be finishing' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 32,
    level: 'B2',
    question: 'By 6 pm, I _____ for 10 hours.',
    options: [
      { id: 'A', text: 'will work' },
      { id: 'B', text: 'will have worked' },
      { id: 'C', text: 'will have been working' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 33,
    level: 'B2',
    question: 'If he had listened to me, he _____ this mistake.',
    options: [
      { id: 'A', text: "wouldn't make" },
      { id: 'B', text: "wouldn't have made" },
      { id: 'C', text: "won't make" },
    ],
    correctAnswer: 'B',
  },
  {
    id: 34,
    level: 'B2',
    question: 'I _____ live in Rome, but now I live in Milan.',
    options: [
      { id: 'A', text: 'would' },
      { id: 'B', text: 'used to' },
      { id: 'C', text: 'was used' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 35,
    level: 'B2',
    question: 'This building _____ in 1850.',
    options: [
      { id: 'A', text: 'built' },
      { id: 'B', text: 'was built' },
      { id: 'C', text: 'has built' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 36,
    level: 'B2',
    question: 'The documents _____ tomorrow.',
    options: [
      { id: 'A', text: 'will send' },
      { id: 'B', text: 'will be sent' },
      { id: 'C', text: 'will have sent' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 37,
    level: 'B2',
    question: 'He speaks very _____.',
    options: [
      { id: 'A', text: 'good' },
      { id: 'B', text: 'well' },
      { id: 'C', text: 'best' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 38,
    level: 'B2',
    question: 'She drives more _____ than her brother.',
    options: [
      { id: 'A', text: 'careful' },
      { id: 'B', text: 'carefully' },
      { id: 'C', text: 'carefullier' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 39,
    level: 'B2',
    question: 'If I were richer, I _____ buy a bigger house.',
    options: [
      { id: 'A', text: 'will' },
      { id: 'B', text: 'would' },
      { id: 'C', text: 'would have' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 40,
    level: 'B2',
    question: 'By the time you arrive, we _____ for three hours.',
    options: [
      { id: 'A', text: 'will work' },
      { id: 'B', text: 'will have worked' },
      { id: 'C', text: 'will have been working' },
    ],
    correctAnswer: 'C',
  },
];

// ---------- Kids Test (30 Questions: Starters, Movers, Flyers) ----------
export const kidsQuestions: AssessmentQuestion[] = [
  // 🟢 STARTERS — BASIC LEVEL (Questions 1-10)
  {
    id: 1,
    level: 'kids-basic',
    question: 'I _____ a student.',
    options: [
      { id: 'A', text: 'are' },
      { id: 'B', text: 'am' },
      { id: 'C', text: 'is' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 2,
    level: 'kids-basic',
    question: 'She _____ my sister.',
    options: [
      { id: 'A', text: 'am' },
      { id: 'B', text: 'is' },
      { id: 'C', text: 'are' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 3,
    level: 'kids-basic',
    question: '_____ you happy at school?',
    options: [
      { id: 'A', text: 'Is' },
      { id: 'B', text: 'Are' },
      { id: 'C', text: 'Do' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 4,
    level: 'kids-basic',
    question: 'He _____ not tired today.',
    options: [
      { id: 'A', text: 'is' },
      { id: 'B', text: 'are' },
      { id: 'C', text: 'am' },
    ],
    correctAnswer: 'A',
  },
  {
    id: 5,
    level: 'kids-basic',
    question: 'This is _____ backpack.',
    options: [
      { id: 'A', text: 'me' },
      { id: 'B', text: 'my' },
      { id: 'C', text: 'mine' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 6,
    level: 'kids-basic',
    question: '_____ toys are on the floor.',
    options: [
      { id: 'A', text: 'This' },
      { id: 'B', text: 'That' },
      { id: 'C', text: 'These' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 7,
    level: 'kids-basic',
    question: '_____ you like ice cream?',
    options: [
      { id: 'A', text: 'Are' },
      { id: 'B', text: 'Do' },
      { id: 'C', text: 'Does' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 8,
    level: 'kids-basic',
    question: 'I _____ ride a bike.',
    options: [
      { id: 'A', text: 'am' },
      { id: 'B', text: 'can' },
      { id: 'C', text: 'am not' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 9,
    level: 'kids-basic',
    question: 'Yesterday I _____ at home with mum.',
    options: [
      { id: 'A', text: 'am' },
      { id: 'B', text: 'was' },
      { id: 'C', text: 'were' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 10,
    level: 'kids-basic',
    question: 'Tomorrow I _____ play with my friends.',
    options: [
      { id: 'A', text: 'will' },
      { id: 'B', text: 'do' },
      { id: 'C', text: 'did' },
    ],
    correctAnswer: 'A',
  },

  // 🔵 MOVERS — MEDIUM LEVEL (Questions 11-20)
  {
    id: 11,
    level: 'kids-medium',
    question: 'Look! The dog _____ in the garden.',
    options: [
      { id: 'A', text: 'runs' },
      { id: 'B', text: 'is running' },
      { id: 'C', text: 'run' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 12,
    level: 'kids-medium',
    question: 'I usually _____ breakfast at 7.',
    options: [
      { id: 'A', text: 'eat' },
      { id: 'B', text: 'am eating' },
      { id: 'C', text: 'ate' },
    ],
    correctAnswer: 'A',
  },
  {
    id: 13,
    level: 'kids-medium',
    question: "There isn't _____ juice in my glass.",
    options: [
      { id: 'A', text: 'many' },
      { id: 'B', text: 'much' },
      { id: 'C', text: 'some' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 14,
    level: 'kids-medium',
    question: 'How _____ pencils are in your bag?',
    options: [
      { id: 'A', text: 'much' },
      { id: 'B', text: 'many' },
      { id: 'C', text: 'any' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 15,
    level: 'kids-medium',
    question: 'I have _____ homework today.',
    options: [
      { id: 'A', text: 'some' },
      { id: 'B', text: 'any' },
      { id: 'C', text: 'a few' },
    ],
    correctAnswer: 'A',
  },
  {
    id: 16,
    level: 'kids-medium',
    question: 'When I was 5, I _____ read.',
    options: [
      { id: 'A', text: 'can' },
      { id: 'B', text: 'could' },
      { id: 'C', text: 'should' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 17,
    level: 'kids-medium',
    question: 'Yesterday we _____ a cartoon together.',
    options: [
      { id: 'A', text: 'watch' },
      { id: 'B', text: 'watched' },
      { id: 'C', text: 'watching' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 18,
    level: 'kids-medium',
    question: 'She _____ like vegetables.',
    options: [
      { id: 'A', text: "don't" },
      { id: 'B', text: "doesn't" },
      { id: 'C', text: "didn't" },
    ],
    correctAnswer: 'B',
  },
  {
    id: 19,
    level: 'kids-medium',
    question: 'You _____ be kind to your friends.',
    options: [
      { id: 'A', text: 'must' },
      { id: 'B', text: 'should' },
      { id: 'C', text: 'can' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 20,
    level: 'kids-medium',
    question: 'I _____ wear a uniform at school.',
    options: [
      { id: 'A', text: 'must' },
      { id: 'B', text: 'have to' },
      { id: 'C', text: 'should' },
    ],
    correctAnswer: 'B',
  },

  // 🟣 FLYERS — ADVANCED LEVEL (Questions 21-30)
  {
    id: 21,
    level: 'kids-advanced',
    question: 'I think I _____ play football later.',
    options: [
      { id: 'A', text: 'will' },
      { id: 'B', text: 'am going to' },
      { id: 'C', text: 'go' },
    ],
    correctAnswer: 'A',
  },
  {
    id: 22,
    level: 'kids-advanced',
    question: 'Look! He has the ball. He _____ score!',
    options: [
      { id: 'A', text: 'will' },
      { id: 'B', text: 'is going to' },
      { id: 'C', text: 'goes' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 23,
    level: 'kids-advanced',
    question: 'You _____ run in the classroom.',
    options: [
      { id: 'A', text: "aren't" },
      { id: 'B', text: "mustn't" },
      { id: 'C', text: "haven't" },
    ],
    correctAnswer: 'B',
  },
  {
    id: 24,
    level: 'kids-advanced',
    question: "We _____ do homework today. It's a holiday!",
    options: [
      { id: 'A', text: 'must' },
      { id: 'B', text: 'have to' },
      { id: 'C', text: "don't have to" },
    ],
    correctAnswer: 'C',
  },
  {
    id: 25,
    level: 'kids-advanced',
    question: 'Mum is calling _____.',
    options: [
      { id: 'A', text: 'I' },
      { id: 'B', text: 'me' },
      { id: 'C', text: 'my' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 26,
    level: 'kids-advanced',
    question: 'She usually plays outside, but now she _____ TV.',
    options: [
      { id: 'A', text: 'watches' },
      { id: 'B', text: 'is watching' },
      { id: 'C', text: 'watch' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 27,
    level: 'kids-advanced',
    question: 'My house is _____ than yours.',
    options: [
      { id: 'A', text: 'big' },
      { id: 'B', text: 'bigger' },
      { id: 'C', text: 'biggest' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 28,
    level: 'kids-advanced',
    question: 'This is the _____ game in the world!',
    options: [
      { id: 'A', text: 'fun' },
      { id: 'B', text: 'more fun' },
      { id: 'C', text: 'funniest' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 29,
    level: 'kids-advanced',
    question: 'These _____ can swim very well.',
    options: [
      { id: 'A', text: 'child' },
      { id: 'B', text: 'childs' },
      { id: 'C', text: 'children' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 30,
    level: 'kids-advanced',
    question: 'If it rains, we _____ at home.',
    options: [
      { id: 'A', text: 'are stay' },
      { id: 'B', text: 'will stay' },
      { id: 'C', text: 'want stay' },
    ],
    correctAnswer: 'B',
  },
];

// ---------- Helper Functions ----------

/**
 * Get questions for a specific test type
 */
export function getQuestionsForTest(testType: AssessmentTestType): AssessmentQuestion[] {
  return testType === 'teens_adults' ? teensAdultsQuestions : kidsQuestions;
}

/**
 * Calculate level scores from answers
 * For teens/adults: 10 questions per level (A1, A2, B1, B2)
 * Pass threshold: 7/10 correct
 */
export function calculateLevelScores(
  answers: { questionId: number; selectedAnswer: string }[],
  questions: AssessmentQuestion[]
): AssessmentLevelScore[] {
  const levelMap: Record<string, { correct: number; total: number }> = {};

  // Initialize level counts
  questions.forEach((q) => {
    if (!levelMap[q.level]) {
      levelMap[q.level] = { correct: 0, total: 0 };
    }
    levelMap[q.level].total++;
  });

  // Count correct answers per level
  answers.forEach((answer) => {
    const question = questions.find((q) => q.id === answer.questionId);
    if (question) {
      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      if (isCorrect) {
        levelMap[question.level].correct++;
      }
    }
  });

  // Convert to array with pass/fail status
  return Object.entries(levelMap).map(([level, scores]) => ({
    level,
    correct: scores.correct,
    total: scores.total,
    passed: scores.correct >= 7, // 7/10 or more = passed
  }));
}

/**
 * Determine recommended level based on scores
 * Final level = highest level passed
 */
export function getRecommendedLevel(levelScores: AssessmentLevelScore[]): CourseLevel {
  // Check if this is a kids test
  const isKidsTest = levelScores.some(s => s.level.startsWith('kids-'));
  
  if (isKidsTest) {
    const kidsLevelOrder = ['kids-basic', 'kids-medium', 'kids-advanced'];
    let highestPassed: CourseLevel = 'kids-basic';
    
    for (const level of kidsLevelOrder) {
      const score = levelScores.find((s) => s.level === level);
      if (score?.passed) {
        highestPassed = level as CourseLevel;
      }
    }
    return highestPassed;
  }
  
  // Adults/Teens test
  const levelOrder = ['A1', 'A2', 'B1', 'B2'];
  let highestPassed: CourseLevel = 'A1';
  
  for (const level of levelOrder) {
    const score = levelScores.find((s) => s.level === level);
    if (score?.passed) {
      highestPassed = level as CourseLevel;
    }
  }
  
  return highestPassed;
}

/**
 * Get level display info (color, name, description)
 */
export function getLevelInfo(level: CourseLevel): {
  name: string;
  color: string;
  bgColor: string;
  description: string;
  emoji: string;
} {
  const levelInfo: Record<string, { name: string; color: string; bgColor: string; description: string; emoji: string }> = {
    'A1': {
      name: 'A1 - Basic User',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'You can understand and use familiar everyday expressions and very basic phrases.',
      emoji: '🟢',
    },
    'A2': {
      name: 'A2 - Elementary',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'You can communicate in simple and routine tasks on familiar topics.',
      emoji: '🔵',
    },
    'B1': {
      name: 'B1 - Intermediate',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'You can deal with most situations likely to arise while traveling and describe experiences.',
      emoji: '🟠',
    },
    'B2': {
      name: 'B2 - Upper Intermediate',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'You can interact with a degree of fluency and spontaneity with native speakers.',
      emoji: '🔴',
    },
    'kids-basic': {
      name: 'Starters',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Perfect for young learners starting their English journey with fun activities!',
      emoji: '🟢',
    },
    'kids-medium': {
      name: 'Movers',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'For kids who have some English basics and are ready to grow their skills!',
      emoji: '🔵',
    },
    'kids-advanced': {
      name: 'Flyers',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'For confident young speakers ready for more exciting challenges!',
      emoji: '🟣',
    },
  };

  return levelInfo[level] || levelInfo['A1'];
}

// ---------- Local Storage Key ----------
export const ASSESSMENT_STORAGE_KEY = 'dsa_assessment_result';
