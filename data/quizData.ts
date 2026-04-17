// ============================================
// DSA Smart Start - A1 Stop & Check Quiz Data
// ============================================
// 3 quizzes × 3 exercises × 20 questions = 180 total

import { QuizQuestion } from '../types';

// ============================================
// Stop & Check 1 — Units 1-5
// ============================================

const a1Quiz1Exercise1: QuizQuestion[] = [
  // Exercise 1: Write the correct word under the image (image-word)
  { id: 'q1-1-1', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/hair.png', correctAnswer: 'hair', acceptableAnswers: ['hair'], exerciseGroup: 1, order: 1 },
  { id: 'q1-1-2', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/eye.png', correctAnswer: 'eye', acceptableAnswers: ['eye', 'an eye'], exerciseGroup: 1, order: 2 },
  { id: 'q1-1-3', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/tiger.png', correctAnswer: 'tiger', acceptableAnswers: ['tiger', 'a tiger'], exerciseGroup: 1, order: 3 },
  { id: 'q1-1-4', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/bathroom.png', correctAnswer: 'bathroom', acceptableAnswers: ['bathroom', 'a bathroom'], exerciseGroup: 1, order: 4 },
  { id: 'q1-1-5', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/game.png', correctAnswer: 'game', acceptableAnswers: ['game', 'a game'], exerciseGroup: 1, order: 5 },
  { id: 'q1-1-6', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/shop.png', correctAnswer: 'shop', acceptableAnswers: ['shop', 'a shop', 'store', 'a store'], exerciseGroup: 1, order: 6 },
  { id: 'q1-1-7', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/tree.png', correctAnswer: 'tree', acceptableAnswers: ['tree', 'a tree'], exerciseGroup: 1, order: 7 },
  { id: 'q1-1-8', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/bird.png', correctAnswer: 'bird', acceptableAnswers: ['bird', 'a bird'], exerciseGroup: 1, order: 8 },
  { id: 'q1-1-9', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/kitchen.png', correctAnswer: 'kitchen', acceptableAnswers: ['kitchen', 'a kitchen'], exerciseGroup: 1, order: 9 },
  { id: 'q1-1-10', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/drawing.png', correctAnswer: 'drawing', acceptableAnswers: ['drawing', 'a drawing'], exerciseGroup: 1, order: 10 },
  { id: 'q1-1-11', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/boat.png', correctAnswer: 'boat', acceptableAnswers: ['boat', 'a boat'], exerciseGroup: 1, order: 11 },
  { id: 'q1-1-12', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/black.png', correctAnswer: 'black', acceptableAnswers: ['black'], exerciseGroup: 1, order: 12 },
  { id: 'q1-1-13', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/beach.png', correctAnswer: 'beach', acceptableAnswers: ['beach', 'a beach'], exerciseGroup: 1, order: 13 },
  { id: 'q1-1-14', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/shell.png', correctAnswer: 'shell', acceptableAnswers: ['shell', 'a shell', 'seashell', 'a seashell'], exerciseGroup: 1, order: 14 },
  { id: 'q1-1-15', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/keys.png', correctAnswer: 'keys', acceptableAnswers: ['keys', 'key'], exerciseGroup: 1, order: 15 },
  { id: 'q1-1-16', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/tie.png', correctAnswer: 'tie', acceptableAnswers: ['tie', 'a tie', 'necktie'], exerciseGroup: 1, order: 16 },
  { id: 'q1-1-17', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/stapler.png', correctAnswer: 'stapler', acceptableAnswers: ['stapler', 'a stapler'], exerciseGroup: 1, order: 17 },
  { id: 'q1-1-18', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/hoodie.png', correctAnswer: 'hoodie', acceptableAnswers: ['hoodie', 'a hoodie', 'hoody'], exerciseGroup: 1, order: 18 },
  { id: 'q1-1-19', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/desk.png', correctAnswer: 'desk', acceptableAnswers: ['desk', 'a desk'], exerciseGroup: 1, order: 19 },
  { id: 'q1-1-20', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q1/oversized.png', correctAnswer: 'oversized', acceptableAnswers: ['oversized', 'over-sized'], exerciseGroup: 1, order: 20 },
];

const a1Quiz1Exercise2: QuizQuestion[] = [
  // Exercise 2: Multiple choice (to be, question words, plurals, pronouns, there is/are, possessives, demonstratives)
  {
    id: 'q1-2-1', type: 'multiple-choice', question: 'They _____ from Italy.',
    options: [
      { id: 'a', text: 'isn\'t', isCorrect: false },
      { id: 'b', text: 'aren\'t', isCorrect: true },
      { id: 'c', text: 'not are', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 21,
  },
  {
    id: 'q1-2-2', type: 'multiple-choice', question: '_____ is your teacher?',
    options: [
      { id: 'a', text: 'What', isCorrect: false },
      { id: 'b', text: 'Who', isCorrect: true },
      { id: 'c', text: 'Where', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 22,
  },
  {
    id: 'q1-2-3', type: 'multiple-choice', question: 'There are three _____ on the table.',
    options: [
      { id: 'a', text: 'boxs', isCorrect: false },
      { id: 'b', text: 'boxies', isCorrect: false },
      { id: 'c', text: 'boxes', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 23,
  },
  {
    id: 'q1-2-4', type: 'multiple-choice', question: '_____ is a doctor. (about a woman)',
    options: [
      { id: 'a', text: 'He', isCorrect: false },
      { id: 'b', text: 'She', isCorrect: true },
      { id: 'c', text: 'It', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 24,
  },
  {
    id: 'q1-2-5', type: 'multiple-choice', question: 'There _____ a cat in the garden.',
    options: [
      { id: 'a', text: 'is', isCorrect: true },
      { id: 'b', text: 'are', isCorrect: false },
      { id: 'c', text: 'be', isCorrect: false },
    ],
    correctAnswer: 'a', exerciseGroup: 2, order: 25,
  },
  {
    id: 'q1-2-6', type: 'multiple-choice', question: 'This is _____ book. (belonging to me)',
    options: [
      { id: 'a', text: 'me', isCorrect: false },
      { id: 'b', text: 'mine', isCorrect: false },
      { id: 'c', text: 'my', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 26,
  },
  {
    id: 'q1-2-7', type: 'multiple-choice', question: '_____ car is that? — It\'s John\'s.',
    options: [
      { id: 'a', text: 'Whose', isCorrect: true },
      { id: 'b', text: 'Who\'s', isCorrect: false },
      { id: 'c', text: 'Who', isCorrect: false },
    ],
    correctAnswer: 'a', exerciseGroup: 2, order: 27,
  },
  {
    id: 'q1-2-8', type: 'multiple-choice', question: 'The _____ toys are in the box.',
    options: [
      { id: 'a', text: 'childrens', isCorrect: false },
      { id: 'b', text: 'children\'s', isCorrect: true },
      { id: 'c', text: 'childrens\'', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 28,
  },
  {
    id: 'q1-2-9', type: 'multiple-choice', question: '_____ shoes are too big for me.',
    options: [
      { id: 'a', text: 'This', isCorrect: false },
      { id: 'b', text: 'That', isCorrect: false },
      { id: 'c', text: 'These', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 29,
  },
  {
    id: 'q1-2-10', type: 'multiple-choice', question: 'He _____ a student.',
    options: [
      { id: 'a', text: 'aren\'t', isCorrect: false },
      { id: 'b', text: 'isn\'t', isCorrect: true },
      { id: 'c', text: 'don\'t', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 30,
  },
  {
    id: 'q1-2-11', type: 'multiple-choice', question: '_____ do you live?',
    options: [
      { id: 'a', text: 'Where', isCorrect: true },
      { id: 'b', text: 'What', isCorrect: false },
      { id: 'c', text: 'Who', isCorrect: false },
    ],
    correctAnswer: 'a', exerciseGroup: 2, order: 31,
  },
  {
    id: 'q1-2-12', type: 'multiple-choice', question: 'I have two _____.',
    options: [
      { id: 'a', text: 'childs', isCorrect: false },
      { id: 'b', text: 'childes', isCorrect: false },
      { id: 'c', text: 'children', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 32,
  },
  {
    id: 'q1-2-13', type: 'multiple-choice', question: '_____ are my friends. (pointing at people nearby)',
    options: [
      { id: 'a', text: 'Those', isCorrect: false },
      { id: 'b', text: 'These', isCorrect: true },
      { id: 'c', text: 'That', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 33,
  },
  {
    id: 'q1-2-14', type: 'multiple-choice', question: 'The book is _____. (belongs to her)',
    options: [
      { id: 'a', text: 'her', isCorrect: false },
      { id: 'b', text: 'she', isCorrect: false },
      { id: 'c', text: 'hers', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 34,
  },
  {
    id: 'q1-2-15', type: 'multiple-choice', question: 'There _____ many people in the park.',
    options: [
      { id: 'a', text: 'is', isCorrect: false },
      { id: 'b', text: 'are', isCorrect: true },
      { id: 'c', text: 'has', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 35,
  },
  {
    id: 'q1-2-16', type: 'multiple-choice', question: '_____ is your favourite colour? — Blue.',
    options: [
      { id: 'a', text: 'Who', isCorrect: false },
      { id: 'b', text: 'Where', isCorrect: false },
      { id: 'c', text: 'What', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 36,
  },
  {
    id: 'q1-2-17', type: 'multiple-choice', question: '_____ bag is over there. (pointing far away)',
    options: [
      { id: 'a', text: 'That', isCorrect: true },
      { id: 'b', text: 'This', isCorrect: false },
      { id: 'c', text: 'These', isCorrect: false },
    ],
    correctAnswer: 'a', exerciseGroup: 2, order: 37,
  },
  {
    id: 'q1-2-18', type: 'multiple-choice', question: '_____ coming to the party? — Tom is.',
    options: [
      { id: 'a', text: 'Whose', isCorrect: false },
      { id: 'b', text: 'Who\'s', isCorrect: true },
      { id: 'c', text: 'Who', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 38,
  },
  {
    id: 'q1-2-19', type: 'multiple-choice', question: 'We _____ happy today.',
    options: [
      { id: 'a', text: 'is', isCorrect: false },
      { id: 'b', text: 'am', isCorrect: false },
      { id: 'c', text: 'are', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 39,
  },
  {
    id: 'q1-2-20', type: 'multiple-choice', question: 'My _____ name is Sarah.',
    options: [
      { id: 'a', text: 'sister\'s', isCorrect: true },
      { id: 'b', text: 'sisters', isCorrect: false },
      { id: 'c', text: 'sister', isCorrect: false },
    ],
    correctAnswer: 'a', exerciseGroup: 2, order: 40,
  },
];

const a1Quiz1Exercise3: QuizQuestion[] = [
  // Exercise 3: Fill in the blank (to be, there is/are, possessives, demonstratives)
  { id: 'q1-3-1', type: 'fill-in-blank', question: 'I ___ a student.', correctAnswer: 'am', acceptableAnswers: ['am', "'m"], exerciseGroup: 3, order: 41 },
  { id: 'q1-3-2', type: 'fill-in-blank', question: 'She ___ not at home.', correctAnswer: 'is', acceptableAnswers: ['is'], exerciseGroup: 3, order: 42 },
  { id: 'q1-3-3', type: 'fill-in-blank', question: 'They ___ my friends.', correctAnswer: 'are', acceptableAnswers: ['are', "'re"], exerciseGroup: 3, order: 43 },
  { id: 'q1-3-4', type: 'fill-in-blank', question: '___ you a teacher? — Yes, I am.', correctAnswer: 'Are', acceptableAnswers: ['are', 'Are'], exerciseGroup: 3, order: 44 },
  { id: 'q1-3-5', type: 'fill-in-blank', question: 'There ___ a book on the desk.', correctAnswer: 'is', acceptableAnswers: ['is', "'s"], exerciseGroup: 3, order: 45 },
  { id: 'q1-3-6', type: 'fill-in-blank', question: 'There ___ five chairs in the room.', correctAnswer: 'are', acceptableAnswers: ['are'], exerciseGroup: 3, order: 46 },
  { id: 'q1-3-7', type: 'fill-in-blank', question: 'This is ___ car. (belonging to us)', correctAnswer: 'our', acceptableAnswers: ['our'], exerciseGroup: 3, order: 47 },
  { id: 'q1-3-8', type: 'fill-in-blank', question: 'The pen is ___. (belonging to me)', correctAnswer: 'mine', acceptableAnswers: ['mine'], exerciseGroup: 3, order: 48 },
  { id: 'q1-3-9', type: 'fill-in-blank', question: '___ jacket is this? — It\'s Tom\'s.', correctAnswer: 'Whose', acceptableAnswers: ['whose', 'Whose'], exerciseGroup: 3, order: 49 },
  { id: 'q1-3-10', type: 'fill-in-blank', question: 'That is my _____ bag. (father)', correctAnswer: "father's", acceptableAnswers: ["father's", "fathers"], exerciseGroup: 3, order: 50 },
  { id: 'q1-3-11', type: 'fill-in-blank', question: '___ is a nice restaurant. (pointing nearby)', correctAnswer: 'This', acceptableAnswers: ['this', 'This'], exerciseGroup: 3, order: 51 },
  { id: 'q1-3-12', type: 'fill-in-blank', question: '___ are my favourite shoes. (pointing nearby)', correctAnswer: 'These', acceptableAnswers: ['these', 'These'], exerciseGroup: 3, order: 52 },
  { id: 'q1-3-13', type: 'fill-in-blank', question: 'He ___ not tired.', correctAnswer: 'is', acceptableAnswers: ['is'], exerciseGroup: 3, order: 53 },
  { id: 'q1-3-14', type: 'fill-in-blank', question: 'We ___ from Serbia.', correctAnswer: 'are', acceptableAnswers: ['are', "'re"], exerciseGroup: 3, order: 54 },
  { id: 'q1-3-15', type: 'fill-in-blank', question: '___ he your brother? — Yes, he is.', correctAnswer: 'Is', acceptableAnswers: ['is', 'Is'], exerciseGroup: 3, order: 55 },
  { id: 'q1-3-16', type: 'fill-in-blank', question: 'There ___ no milk in the fridge.', correctAnswer: 'is', acceptableAnswers: ['is', "'s"], exerciseGroup: 3, order: 56 },
  { id: 'q1-3-17', type: 'fill-in-blank', question: '___ house is far away. (pointing far)', correctAnswer: 'That', acceptableAnswers: ['that', 'That'], exerciseGroup: 3, order: 57 },
  { id: 'q1-3-18', type: 'fill-in-blank', question: 'The toys are ___. (belonging to them)', correctAnswer: 'theirs', acceptableAnswers: ['theirs'], exerciseGroup: 3, order: 58 },
  { id: 'q1-3-19', type: 'fill-in-blank', question: 'It ___ a beautiful day.', correctAnswer: 'is', acceptableAnswers: ['is', "'s"], exerciseGroup: 3, order: 59 },
  { id: 'q1-3-20', type: 'fill-in-blank', question: '___ phone is this? — It\'s ___. (belonging to you)', correctAnswer: 'yours', acceptableAnswers: ['yours'], exerciseGroup: 3, order: 60 },
];

// ============================================
// Stop & Check 2 — Units 6-10
// ============================================

const a1Quiz2Exercise1: QuizQuestion[] = [
  { id: 'q2-1-1', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/mirror.png', correctAnswer: 'mirror', acceptableAnswers: ['mirror', 'a mirror'], exerciseGroup: 1, order: 1 },
  { id: 'q2-1-2', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/day.png', correctAnswer: 'day', acceptableAnswers: ['day'], exerciseGroup: 1, order: 2 },
  { id: 'q2-1-3', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/clothes.png', correctAnswer: 'clothes', acceptableAnswers: ['clothes', 'clothing'], exerciseGroup: 1, order: 3 },
  { id: 'q2-1-4', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/bookcase.png', correctAnswer: 'bookcase', acceptableAnswers: ['bookcase', 'a bookcase', 'bookshelf'], exerciseGroup: 1, order: 4 },
  { id: 'q2-1-5', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/men.png', correctAnswer: 'men', acceptableAnswers: ['men'], exerciseGroup: 1, order: 5 },
  { id: 'q2-1-6', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/chicken.png', correctAnswer: 'chicken', acceptableAnswers: ['chicken', 'a chicken'], exerciseGroup: 1, order: 6 },
  { id: 'q2-1-7', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/grapes.png', correctAnswer: 'grapes', acceptableAnswers: ['grapes', 'grape'], exerciseGroup: 1, order: 7 },
  { id: 'q2-1-8', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/run.png', correctAnswer: 'run', acceptableAnswers: ['run', 'running'], exerciseGroup: 1, order: 8 },
  { id: 'q2-1-9', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/rubber.png', correctAnswer: 'rubber', acceptableAnswers: ['rubber', 'a rubber', 'eraser', 'an eraser'], exerciseGroup: 1, order: 9 },
  { id: 'q2-1-10', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/ruler.png', correctAnswer: 'ruler', acceptableAnswers: ['ruler', 'a ruler'], exerciseGroup: 1, order: 10 },
  { id: 'q2-1-11', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/draw.png', correctAnswer: 'draw', acceptableAnswers: ['draw', 'drawing'], exerciseGroup: 1, order: 11 },
  { id: 'q2-1-12', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/midnight.png', correctAnswer: 'midnight', acceptableAnswers: ['midnight'], exerciseGroup: 1, order: 12 },
  { id: 'q2-1-13', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/alarm.png', correctAnswer: 'alarm', acceptableAnswers: ['alarm', 'alarm clock', 'an alarm', 'an alarm clock'], exerciseGroup: 1, order: 13 },
  { id: 'q2-1-14', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/morning.png', correctAnswer: 'morning', acceptableAnswers: ['morning'], exerciseGroup: 1, order: 14 },
  { id: 'q2-1-15', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/evening.png', correctAnswer: 'evening', acceptableAnswers: ['evening'], exerciseGroup: 1, order: 15 },
  { id: 'q2-1-16', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/listen.png', correctAnswer: 'listen', acceptableAnswers: ['listen', 'listening'], exerciseGroup: 1, order: 16 },
  { id: 'q2-1-17', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/read.png', correctAnswer: 'read', acceptableAnswers: ['read', 'reading'], exerciseGroup: 1, order: 17 },
  { id: 'q2-1-18', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/coach.png', correctAnswer: 'coach', acceptableAnswers: ['coach', 'a coach', 'bus', 'a bus'], exerciseGroup: 1, order: 18 },
  { id: 'q2-1-19', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/teach.png', correctAnswer: 'teach', acceptableAnswers: ['teach', 'teaching', 'teacher'], exerciseGroup: 1, order: 19 },
  { id: 'q2-1-20', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q2/bookcase2.png', correctAnswer: 'bookcase', acceptableAnswers: ['bookcase', 'a bookcase', 'bookshelf'], exerciseGroup: 1, order: 20 },
];

const a1Quiz2Exercise2: QuizQuestion[] = [
  // Exercise 2: Multiple choice (was/were, past simple, present simple, imperatives, will/won't)
  {
    id: 'q2-2-1', type: 'multiple-choice', question: 'She _____ at school yesterday.',
    options: [
      { id: 'a', text: 'were', isCorrect: false },
      { id: 'b', text: 'was', isCorrect: true },
      { id: 'c', text: 'is', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 21,
  },
  {
    id: 'q2-2-2', type: 'multiple-choice', question: 'They _____ to the cinema last night.',
    options: [
      { id: 'a', text: 'go', isCorrect: false },
      { id: 'b', text: 'goed', isCorrect: false },
      { id: 'c', text: 'went', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 22,
  },
  {
    id: 'q2-2-3', type: 'multiple-choice', question: 'He _____ breakfast every morning.',
    options: [
      { id: 'a', text: 'have', isCorrect: false },
      { id: 'b', text: 'has', isCorrect: true },
      { id: 'c', text: 'having', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 23,
  },
  {
    id: 'q2-2-4', type: 'multiple-choice', question: '_____ open the window, please.',
    options: [
      { id: 'a', text: "Let's", isCorrect: false },
      { id: 'b', text: "Don't", isCorrect: true },
      { id: 'c', text: 'Do', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 24,
  },
  {
    id: 'q2-2-5', type: 'multiple-choice', question: 'I _____ help you tomorrow.',
    options: [
      { id: 'a', text: 'will', isCorrect: true },
      { id: 'b', text: 'did', isCorrect: false },
      { id: 'c', text: 'do', isCorrect: false },
    ],
    correctAnswer: 'a', exerciseGroup: 2, order: 25,
  },
  {
    id: 'q2-2-6', type: 'multiple-choice', question: 'We _____ at the party last Saturday.',
    options: [
      { id: 'a', text: 'was', isCorrect: false },
      { id: 'b', text: 'are', isCorrect: false },
      { id: 'c', text: 'were', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 26,
  },
  {
    id: 'q2-2-7', type: 'multiple-choice', question: 'She _____ the answer yesterday.',
    options: [
      { id: 'a', text: 'knowed', isCorrect: false },
      { id: 'b', text: 'knew', isCorrect: true },
      { id: 'c', text: 'know', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 27,
  },
  {
    id: 'q2-2-8', type: 'multiple-choice', question: 'He _____ to work by bus.',
    options: [
      { id: 'a', text: 'goes', isCorrect: true },
      { id: 'b', text: 'go', isCorrect: false },
      { id: 'c', text: 'going', isCorrect: false },
    ],
    correctAnswer: 'a', exerciseGroup: 2, order: 28,
  },
  {
    id: 'q2-2-9', type: 'multiple-choice', question: '_____ go to the cinema tonight!',
    options: [
      { id: 'a', text: "Don't", isCorrect: false },
      { id: 'b', text: "Let's", isCorrect: true },
      { id: 'c', text: 'Will', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 29,
  },
  {
    id: 'q2-2-10', type: 'multiple-choice', question: 'I _____ be late, I promise.',
    options: [
      { id: 'a', text: 'will', isCorrect: false },
      { id: 'b', text: "don't", isCorrect: false },
      { id: 'c', text: "won't", isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 30,
  },
  {
    id: 'q2-2-11', type: 'multiple-choice', question: 'The weather _____ cold last week.',
    options: [
      { id: 'a', text: 'were', isCorrect: false },
      { id: 'b', text: 'was', isCorrect: true },
      { id: 'c', text: 'is', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 31,
  },
  {
    id: 'q2-2-12', type: 'multiple-choice', question: 'They _____ their homework every day.',
    options: [
      { id: 'a', text: 'does', isCorrect: false },
      { id: 'b', text: 'do', isCorrect: true },
      { id: 'c', text: 'did', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 32,
  },
  {
    id: 'q2-2-13', type: 'multiple-choice', question: 'She _____ a new dress yesterday.',
    options: [
      { id: 'a', text: 'buyed', isCorrect: false },
      { id: 'b', text: 'buy', isCorrect: false },
      { id: 'c', text: 'bought', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 33,
  },
  {
    id: 'q2-2-14', type: 'multiple-choice', question: '_____ sit down, everyone.',
    options: [
      { id: 'a', text: 'Please', isCorrect: true },
      { id: 'b', text: "Won't", isCorrect: false },
      { id: 'c', text: 'Did', isCorrect: false },
    ],
    correctAnswer: 'a', exerciseGroup: 2, order: 34,
  },
  {
    id: 'q2-2-15', type: 'multiple-choice', question: 'It _____ rain tomorrow.',
    options: [
      { id: 'a', text: 'did', isCorrect: false },
      { id: 'b', text: 'will', isCorrect: true },
      { id: 'c', text: 'was', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 35,
  },
  {
    id: 'q2-2-16', type: 'multiple-choice', question: 'I _____ my keys. Have you seen them?',
    options: [
      { id: 'a', text: 'losed', isCorrect: false },
      { id: 'b', text: 'lose', isCorrect: false },
      { id: 'c', text: 'lost', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 36,
  },
  {
    id: 'q2-2-17', type: 'multiple-choice', question: 'She _____ English and French.',
    options: [
      { id: 'a', text: 'speak', isCorrect: false },
      { id: 'b', text: 'speaks', isCorrect: true },
      { id: 'c', text: 'speaking', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 37,
  },
  {
    id: 'q2-2-18', type: 'multiple-choice', question: '_____ touch that! It\'s hot!',
    options: [
      { id: 'a', text: "Don't", isCorrect: true },
      { id: 'b', text: "Let's", isCorrect: false },
      { id: 'c', text: 'Will', isCorrect: false },
    ],
    correctAnswer: 'a', exerciseGroup: 2, order: 38,
  },
  {
    id: 'q2-2-19', type: 'multiple-choice', question: 'We _____ visit our grandmother next Sunday.',
    options: [
      { id: 'a', text: 'went', isCorrect: false },
      { id: 'b', text: 'go', isCorrect: false },
      { id: 'c', text: 'will', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 39,
  },
  {
    id: 'q2-2-20', type: 'multiple-choice', question: 'He _____ tired because he worked all day.',
    options: [
      { id: 'a', text: 'was', isCorrect: true },
      { id: 'b', text: 'were', isCorrect: false },
      { id: 'c', text: 'is', isCorrect: false },
    ],
    correctAnswer: 'a', exerciseGroup: 2, order: 40,
  },
];

const a1Quiz2Exercise3: QuizQuestion[] = [
  // Exercise 3: Fill in the blank (was/were, present simple, past simple, imperatives, will/won't)
  { id: 'q2-3-1', type: 'fill-in-blank', question: 'She ___ at home yesterday.', correctAnswer: 'was', acceptableAnswers: ['was'], exerciseGroup: 3, order: 41 },
  { id: 'q2-3-2', type: 'fill-in-blank', question: 'They ___ not at school last Monday.', correctAnswer: 'were', acceptableAnswers: ['were'], exerciseGroup: 3, order: 42 },
  { id: 'q2-3-3', type: 'fill-in-blank', question: 'He ___ football every weekend.', correctAnswer: 'plays', acceptableAnswers: ['plays'], exerciseGroup: 3, order: 43 },
  { id: 'q2-3-4', type: 'fill-in-blank', question: 'I ___ to the shop yesterday.', correctAnswer: 'went', acceptableAnswers: ['went'], exerciseGroup: 3, order: 44 },
  { id: 'q2-3-5', type: 'fill-in-blank', question: '___ run in the classroom!', correctAnswer: "Don't", acceptableAnswers: ["don't", "Don't", "Do not", "do not"], exerciseGroup: 3, order: 45 },
  { id: 'q2-3-6', type: 'fill-in-blank', question: 'She ___ like coffee.', correctAnswer: "doesn't", acceptableAnswers: ["doesn't", "does not"], exerciseGroup: 3, order: 46 },
  { id: 'q2-3-7', type: 'fill-in-blank', question: 'We ___ a great time at the party last night.', correctAnswer: 'had', acceptableAnswers: ['had'], exerciseGroup: 3, order: 47 },
  { id: 'q2-3-8', type: 'fill-in-blank', question: '___ go swimming!', correctAnswer: "Let's", acceptableAnswers: ["let's", "Let's", "Lets", "lets"], exerciseGroup: 3, order: 48 },
  { id: 'q2-3-9', type: 'fill-in-blank', question: 'I ___ call you after dinner.', correctAnswer: 'will', acceptableAnswers: ['will', "'ll"], exerciseGroup: 3, order: 49 },
  { id: 'q2-3-10', type: 'fill-in-blank', question: 'It ___ cold yesterday evening.', correctAnswer: 'was', acceptableAnswers: ['was'], exerciseGroup: 3, order: 50 },
  { id: 'q2-3-11', type: 'fill-in-blank', question: 'She ___ to school by bus every day.', correctAnswer: 'goes', acceptableAnswers: ['goes'], exerciseGroup: 3, order: 51 },
  { id: 'q2-3-12', type: 'fill-in-blank', question: 'They ___ the film last Saturday.', correctAnswer: 'watched', acceptableAnswers: ['watched', 'saw'], exerciseGroup: 3, order: 52 },
  { id: 'q2-3-13', type: 'fill-in-blank', question: 'He ___ be here at 5 o\'clock.', correctAnswer: 'will', acceptableAnswers: ['will', "'ll"], exerciseGroup: 3, order: 53 },
  { id: 'q2-3-14', type: 'fill-in-blank', question: '___ be quiet in the library!', correctAnswer: 'Please', acceptableAnswers: ['please', 'Please'], exerciseGroup: 3, order: 54 },
  { id: 'q2-3-15', type: 'fill-in-blank', question: 'I ___ not forget, I promise.', correctAnswer: 'will', acceptableAnswers: ['will'], exerciseGroup: 3, order: 55 },
  { id: 'q2-3-16', type: 'fill-in-blank', question: 'She ___ dinner for the family every evening.', correctAnswer: 'cooks', acceptableAnswers: ['cooks', 'makes'], exerciseGroup: 3, order: 56 },
  { id: 'q2-3-17', type: 'fill-in-blank', question: 'We ___ very tired after the long walk.', correctAnswer: 'were', acceptableAnswers: ['were'], exerciseGroup: 3, order: 57 },
  { id: 'q2-3-18', type: 'fill-in-blank', question: 'He ___ the window and sat down.', correctAnswer: 'opened', acceptableAnswers: ['opened'], exerciseGroup: 3, order: 58 },
  { id: 'q2-3-19', type: 'fill-in-blank', question: 'I ___ think it ___ rain tomorrow.', correctAnswer: "don't", acceptableAnswers: ["don't", "do not"], exerciseGroup: 3, order: 59 },
  { id: 'q2-3-20', type: 'fill-in-blank', question: 'She ___ eat the cake. She\'s not hungry.', correctAnswer: "won't", acceptableAnswers: ["won't", "will not"], exerciseGroup: 3, order: 60 },
];

// ============================================
// Stop & Check 3 — Units 11-15
// ============================================

const a1Quiz3Exercise1: QuizQuestion[] = [
  { id: 'q3-1-1', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/sleep.png', correctAnswer: 'sleep', acceptableAnswers: ['sleep', 'sleeping'], exerciseGroup: 1, order: 1 },
  { id: 'q3-1-2', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/stay.png', correctAnswer: 'stay', acceptableAnswers: ['stay', 'staying'], exerciseGroup: 1, order: 2 },
  { id: 'q3-1-3', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/egg.png', correctAnswer: 'egg', acceptableAnswers: ['egg', 'an egg', 'eggs'], exerciseGroup: 1, order: 3 },
  { id: 'q3-1-4', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/sausage.png', correctAnswer: 'sausage', acceptableAnswers: ['sausage', 'a sausage', 'sausages'], exerciseGroup: 1, order: 4 },
  { id: 'q3-1-5', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/arm.png', correctAnswer: 'arm', acceptableAnswers: ['arm', 'an arm'], exerciseGroup: 1, order: 5 },
  { id: 'q3-1-6', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/foot.png', correctAnswer: 'foot', acceptableAnswers: ['foot', 'a foot'], exerciseGroup: 1, order: 6 },
  { id: 'q3-1-7', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/dentist.png', correctAnswer: 'dentist', acceptableAnswers: ['dentist', 'a dentist'], exerciseGroup: 1, order: 7 },
  { id: 'q3-1-8', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/call.png', correctAnswer: 'call', acceptableAnswers: ['call', 'calling', 'phone call'], exerciseGroup: 1, order: 8 },
  { id: 'q3-1-9', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/hairdresser.png', correctAnswer: 'hairdresser', acceptableAnswers: ['hairdresser', 'a hairdresser'], exerciseGroup: 1, order: 9 },
  { id: 'q3-1-10', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/cleaner.png', correctAnswer: 'cleaner', acceptableAnswers: ['cleaner', 'a cleaner'], exerciseGroup: 1, order: 10 },
  { id: 'q3-1-11', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/short.png', correctAnswer: 'short', acceptableAnswers: ['short'], exerciseGroup: 1, order: 11 },
  { id: 'q3-1-12', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/tall.png', correctAnswer: 'tall', acceptableAnswers: ['tall'], exerciseGroup: 1, order: 12 },
  { id: 'q3-1-13', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/roundabout.png', correctAnswer: 'roundabout', acceptableAnswers: ['roundabout', 'a roundabout'], exerciseGroup: 1, order: 13 },
  { id: 'q3-1-14', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/car-park.png', correctAnswer: 'car park', acceptableAnswers: ['car park', 'a car park', 'parking', 'parking lot'], exerciseGroup: 1, order: 14 },
  { id: 'q3-1-15', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/between.png', correctAnswer: 'between', acceptableAnswers: ['between'], exerciseGroup: 1, order: 15 },
  { id: 'q3-1-16', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/in-front-of.png', correctAnswer: 'in front of', acceptableAnswers: ['in front of', 'in front'], exerciseGroup: 1, order: 16 },
  { id: 'q3-1-17', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/vegetables.png', correctAnswer: 'vegetables', acceptableAnswers: ['vegetables', 'vegetable'], exerciseGroup: 1, order: 17 },
  { id: 'q3-1-18', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/salt.png', correctAnswer: 'salt', acceptableAnswers: ['salt'], exerciseGroup: 1, order: 18 },
  { id: 'q3-1-19', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/meat.png', correctAnswer: 'meat', acceptableAnswers: ['meat'], exerciseGroup: 1, order: 19 },
  { id: 'q3-1-20', type: 'image-word', question: 'What do you see in the image?', imageUrl: '/assets/quiz/a1-q3/sing.png', correctAnswer: 'sing', acceptableAnswers: ['sing', 'singing'], exerciseGroup: 1, order: 20 },
];

const a1Quiz3Exercise2: QuizQuestion[] = [
  // Exercise 2: Multiple choice (can/can't/could, object pronouns, have/has got, prepositions, present continuous)
  {
    id: 'q3-2-1', type: 'multiple-choice', question: 'She _____ speak three languages.',
    options: [
      { id: 'a', text: 'can', isCorrect: true },
      { id: 'b', text: 'cans', isCorrect: false },
      { id: 'c', text: 'could to', isCorrect: false },
    ],
    correctAnswer: 'a', exerciseGroup: 2, order: 21,
  },
  {
    id: 'q3-2-2', type: 'multiple-choice', question: 'I saw _____ at the shop yesterday.',
    options: [
      { id: 'a', text: 'she', isCorrect: false },
      { id: 'b', text: 'her', isCorrect: true },
      { id: 'c', text: 'hers', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 22,
  },
  {
    id: 'q3-2-3', type: 'multiple-choice', question: 'He _____ got a new car.',
    options: [
      { id: 'a', text: 'have', isCorrect: false },
      { id: 'b', text: 'has', isCorrect: true },
      { id: 'c', text: 'is', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 23,
  },
  {
    id: 'q3-2-4', type: 'multiple-choice', question: 'The meeting is _____ Monday.',
    options: [
      { id: 'a', text: 'in', isCorrect: false },
      { id: 'b', text: 'at', isCorrect: false },
      { id: 'c', text: 'on', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 24,
  },
  {
    id: 'q3-2-5', type: 'multiple-choice', question: 'They _____ playing football right now.',
    options: [
      { id: 'a', text: 'is', isCorrect: false },
      { id: 'b', text: 'are', isCorrect: true },
      { id: 'c', text: 'am', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 25,
  },
  {
    id: 'q3-2-6', type: 'multiple-choice', question: 'When I was little, I _____ ride a bike.',
    options: [
      { id: 'a', text: "can't", isCorrect: false },
      { id: 'b', text: 'can', isCorrect: false },
      { id: 'c', text: "couldn't", isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 26,
  },
  {
    id: 'q3-2-7', type: 'multiple-choice', question: 'Please give _____ the book. (to me)',
    options: [
      { id: 'a', text: 'I', isCorrect: false },
      { id: 'b', text: 'my', isCorrect: false },
      { id: 'c', text: 'me', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 27,
  },
  {
    id: 'q3-2-8', type: 'multiple-choice', question: 'We _____ got any milk.',
    options: [
      { id: 'a', text: "haven't", isCorrect: true },
      { id: 'b', text: "hasn't", isCorrect: false },
      { id: 'c', text: "don't", isCorrect: false },
    ],
    correctAnswer: 'a', exerciseGroup: 2, order: 28,
  },
  {
    id: 'q3-2-9', type: 'multiple-choice', question: 'The library is _____ the bank and the hotel.',
    options: [
      { id: 'a', text: 'in front of', isCorrect: false },
      { id: 'b', text: 'between', isCorrect: true },
      { id: 'c', text: 'next', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 29,
  },
  {
    id: 'q3-2-10', type: 'multiple-choice', question: 'Look! She _____ dancing.',
    options: [
      { id: 'a', text: 'are', isCorrect: false },
      { id: 'b', text: 'is', isCorrect: true },
      { id: 'c', text: 'am', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 30,
  },
  {
    id: 'q3-2-11', type: 'multiple-choice', question: '_____ you swim when you were five?',
    options: [
      { id: 'a', text: 'Can', isCorrect: false },
      { id: 'b', text: 'Could', isCorrect: true },
      { id: 'c', text: 'Do', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 31,
  },
  {
    id: 'q3-2-12', type: 'multiple-choice', question: 'I told _____ to come early. (them)',
    options: [
      { id: 'a', text: 'they', isCorrect: false },
      { id: 'b', text: 'their', isCorrect: false },
      { id: 'c', text: 'them', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 32,
  },
  {
    id: 'q3-2-13', type: 'multiple-choice', question: '_____ she got any brothers or sisters?',
    options: [
      { id: 'a', text: 'Has', isCorrect: true },
      { id: 'b', text: 'Have', isCorrect: false },
      { id: 'c', text: 'Is', isCorrect: false },
    ],
    correctAnswer: 'a', exerciseGroup: 2, order: 33,
  },
  {
    id: 'q3-2-14', type: 'multiple-choice', question: 'School starts _____ 8 o\'clock.',
    options: [
      { id: 'a', text: 'on', isCorrect: false },
      { id: 'b', text: 'in', isCorrect: false },
      { id: 'c', text: 'at', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 34,
  },
  {
    id: 'q3-2-15', type: 'multiple-choice', question: 'What _____ you doing? — I\'m reading.',
    options: [
      { id: 'a', text: 'are', isCorrect: true },
      { id: 'b', text: 'is', isCorrect: false },
      { id: 'c', text: 'do', isCorrect: false },
    ],
    correctAnswer: 'a', exerciseGroup: 2, order: 35,
  },
  {
    id: 'q3-2-16', type: 'multiple-choice', question: 'He _____ play the piano. He never learned.',
    options: [
      { id: 'a', text: 'can', isCorrect: false },
      { id: 'b', text: "can't", isCorrect: true },
      { id: 'c', text: 'could', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 36,
  },
  {
    id: 'q3-2-17', type: 'multiple-choice', question: 'Do you know _____? (him)',
    options: [
      { id: 'a', text: 'he', isCorrect: false },
      { id: 'b', text: 'his', isCorrect: false },
      { id: 'c', text: 'him', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 37,
  },
  {
    id: 'q3-2-18', type: 'multiple-choice', question: 'They _____ got a big house.',
    options: [
      { id: 'a', text: 'has', isCorrect: false },
      { id: 'b', text: 'have', isCorrect: true },
      { id: 'c', text: 'is', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 38,
  },
  {
    id: 'q3-2-19', type: 'multiple-choice', question: 'My birthday is _____ July.',
    options: [
      { id: 'a', text: 'on', isCorrect: false },
      { id: 'b', text: 'in', isCorrect: true },
      { id: 'c', text: 'at', isCorrect: false },
    ],
    correctAnswer: 'b', exerciseGroup: 2, order: 39,
  },
  {
    id: 'q3-2-20', type: 'multiple-choice', question: 'Shh! The baby _____ sleeping.',
    options: [
      { id: 'a', text: 'am', isCorrect: false },
      { id: 'b', text: 'are', isCorrect: false },
      { id: 'c', text: 'is', isCorrect: true },
    ],
    correctAnswer: 'c', exerciseGroup: 2, order: 40,
  },
];

const a1Quiz3Exercise3: QuizQuestion[] = [
  // Exercise 3: Fill in the blank (can/could, object pronouns, have/has got, prepositions, present continuous)
  { id: 'q3-3-1', type: 'fill-in-blank', question: 'She ___ swim very well.', correctAnswer: 'can', acceptableAnswers: ['can'], exerciseGroup: 3, order: 41 },
  { id: 'q3-3-2', type: 'fill-in-blank', question: 'Please help ___. (us)', correctAnswer: 'us', acceptableAnswers: ['us'], exerciseGroup: 3, order: 42 },
  { id: 'q3-3-3', type: 'fill-in-blank', question: 'He ___ got two sisters.', correctAnswer: 'has', acceptableAnswers: ['has', "'s"], exerciseGroup: 3, order: 43 },
  { id: 'q3-3-4', type: 'fill-in-blank', question: 'The concert is ___ Saturday.', correctAnswer: 'on', acceptableAnswers: ['on'], exerciseGroup: 3, order: 44 },
  { id: 'q3-3-5', type: 'fill-in-blank', question: 'I ___ reading a book right now.', correctAnswer: 'am', acceptableAnswers: ['am', "'m"], exerciseGroup: 3, order: 45 },
  { id: 'q3-3-6', type: 'fill-in-blank', question: 'When he was young, he ___ run very fast.', correctAnswer: 'could', acceptableAnswers: ['could'], exerciseGroup: 3, order: 46 },
  { id: 'q3-3-7', type: 'fill-in-blank', question: 'I like ___. (her)', correctAnswer: 'her', acceptableAnswers: ['her'], exerciseGroup: 3, order: 47 },
  { id: 'q3-3-8', type: 'fill-in-blank', question: 'We ___ got a dog and a cat.', correctAnswer: 'have', acceptableAnswers: ['have', "'ve"], exerciseGroup: 3, order: 48 },
  { id: 'q3-3-9', type: 'fill-in-blank', question: 'The supermarket is ___ the post office.', correctAnswer: 'next to', acceptableAnswers: ['next to', 'beside', 'near'], exerciseGroup: 3, order: 49 },
  { id: 'q3-3-10', type: 'fill-in-blank', question: 'Look! They ___ playing in the garden.', correctAnswer: 'are', acceptableAnswers: ['are', "'re"], exerciseGroup: 3, order: 50 },
  { id: 'q3-3-11', type: 'fill-in-blank', question: 'I ___ drive a car. I don\'t have a licence.', correctAnswer: "can't", acceptableAnswers: ["can't", "cannot", "can not"], exerciseGroup: 3, order: 51 },
  { id: 'q3-3-12', type: 'fill-in-blank', question: 'Tell ___ the answer. (him)', correctAnswer: 'him', acceptableAnswers: ['him'], exerciseGroup: 3, order: 52 },
  { id: 'q3-3-13', type: 'fill-in-blank', question: '___ you got a pen I can borrow?', correctAnswer: 'Have', acceptableAnswers: ['have', 'Have'], exerciseGroup: 3, order: 53 },
  { id: 'q3-3-14', type: 'fill-in-blank', question: 'We have a meeting ___ 3 o\'clock.', correctAnswer: 'at', acceptableAnswers: ['at'], exerciseGroup: 3, order: 54 },
  { id: 'q3-3-15', type: 'fill-in-blank', question: 'She ___ cooking dinner right now.', correctAnswer: 'is', acceptableAnswers: ['is', "'s"], exerciseGroup: 3, order: 55 },
  { id: 'q3-3-16', type: 'fill-in-blank', question: '___ you play the guitar when you were ten?', correctAnswer: 'Could', acceptableAnswers: ['could', 'Could'], exerciseGroup: 3, order: 56 },
  { id: 'q3-3-17', type: 'fill-in-blank', question: 'Can you see ___? (them)', correctAnswer: 'them', acceptableAnswers: ['them'], exerciseGroup: 3, order: 57 },
  { id: 'q3-3-18', type: 'fill-in-blank', question: 'She ___ got a beautiful garden.', correctAnswer: 'has', acceptableAnswers: ['has', "'s"], exerciseGroup: 3, order: 58 },
  { id: 'q3-3-19', type: 'fill-in-blank', question: 'The school is ___ the library and the park.', correctAnswer: 'between', acceptableAnswers: ['between'], exerciseGroup: 3, order: 59 },
  { id: 'q3-3-20', type: 'fill-in-blank', question: 'What ___ he doing? — He\'s studying.', correctAnswer: 'is', acceptableAnswers: ['is', "'s"], exerciseGroup: 3, order: 60 },
];

// ============================================
// Exported Quiz Collections
// ============================================

export const a1Quiz1: QuizQuestion[] = [
  ...a1Quiz1Exercise1,
  ...a1Quiz1Exercise2,
  ...a1Quiz1Exercise3,
];

export const a1Quiz2: QuizQuestion[] = [
  ...a1Quiz2Exercise1,
  ...a1Quiz2Exercise2,
  ...a1Quiz2Exercise3,
];

export const a1Quiz3: QuizQuestion[] = [
  ...a1Quiz3Exercise1,
  ...a1Quiz3Exercise2,
  ...a1Quiz3Exercise3,
];

/** Map of checkpoint module IDs to their quiz data */
export const quizDataMap: Record<string, QuizQuestion[]> = {
  'a1-quiz1': a1Quiz1,
  'a1-quiz2': a1Quiz2,
  'a1-quiz3': a1Quiz3,
};
