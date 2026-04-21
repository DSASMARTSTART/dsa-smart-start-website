// ============================================
// DSA Smart Start - A1 Final Test Data
// ============================================
// 10 exercises (5 Vocabulary + 5 Grammar) covering all A1 skills.
// Pass threshold: 70% — unlocks the A1 Completion Certificate.
//
// Question content is English-only (matches existing Stop & Check pattern).
// Images live in /public/assets/quiz/a1-final/<word>.png (lowercase, spaces → '-').

import { FinalTestExercise, QuizQuestion } from '../types';

// ── Helpers (local, keeps data terse) ──────────────────────────────
const img = (name: string) => `/assets/quiz/a1-final/${name}.png`;

const mc = (
  id: string,
  question: string,
  group: number,
  order: number,
  options: Array<[string, string]>,
  correctId: string
): QuizQuestion => ({
  id,
  type: 'multiple-choice',
  question,
  options: options.map(([oid, text]) => ({ id: oid, text, isCorrect: oid === correctId })),
  correctAnswer: correctId,
  exerciseGroup: group,
  order,
});

const spell = (
  id: string,
  displayedWord: string,
  correct: string,
  group: number,
  order: number,
  imageName?: string,
): QuizQuestion => ({
  id,
  type: 'spelling-correction',
  question: 'Correct the spelling of the word.',
  displayedWord,
  imageUrl: imageName ? img(imageName) : undefined,
  correctAnswer: correct,
  acceptableAnswers: [correct],
  exerciseGroup: group,
  order,
});

const wb = (
  id: string,
  question: string,
  correct: string,
  group: number,
  order: number,
): QuizQuestion => ({
  id,
  type: 'word-bank',
  question,
  correctAnswer: correct,
  acceptableAnswers: [correct],
  exerciseGroup: group,
  order,
});

const fib = (
  id: string,
  question: string,
  correct: string,
  group: number,
  order: number,
  acceptable?: string[],
): QuizQuestion => ({
  id,
  type: 'fill-in-blank',
  question,
  correctAnswer: correct,
  acceptableAnswers: acceptable ?? [correct],
  exerciseGroup: group,
  order,
});

const iw = (
  id: string,
  imageName: string,
  correct: string,
  group: number,
  order: number,
  acceptable: string[] = [],
): QuizQuestion => ({
  id,
  type: 'image-word',
  question: 'What do you see in the image?',
  imageUrl: img(imageName),
  correctAnswer: correct,
  acceptableAnswers: [correct, ...acceptable],
  exerciseGroup: group,
  order,
});

// ── Vocabulary Exercise 1: Image → Word (10) ──────────────────────
const vocabEx1: QuizQuestion[] = [
  iw('a1f-v1-1', 'glasses',     'glasses',     1, 1),
  iw('a1f-v1-2', 'duck',        'duck',        1, 2, ['a duck']),
  iw('a1f-v1-3', 'living-room', 'living room', 1, 3, ['a living room', 'livingroom']),
  iw('a1f-v1-4', 'sand',        'sand',        1, 4),
  iw('a1f-v1-5', 'classroom',   'classroom',   1, 5, ['a classroom']),
  iw('a1f-v1-6', 'wall',        'wall',        1, 6, ['a wall']),
  iw('a1f-v1-7', 'wake-up',     'wake up',     1, 7, ['waking up', 'wakeup']),
  iw('a1f-v1-8', 'neck',        'neck',        1, 8, ['a neck']),
  iw('a1f-v1-9', 'hand',        'hand',        1, 9, ['a hand']),
  iw('a1f-v1-10', 'moustache',  'moustache',   1, 10, ['a moustache', 'mustache']),
];

// ── Vocabulary Exercise 2: Spelling Correction (15) ───────────────
// Images optional — to be added later by the user. Filenames listed for convenience.
const vocabEx2: QuizQuestion[] = [
  spell('a1f-v2-1',  'biehnd',      'behind',     2, 1,  'behind'),
  spell('a1f-v2-2',  'perpul',      'purple',     2, 2,  'purple'),
  spell('a1f-v2-3',  'breacelt',    'bracelet',   2, 3,  'bracelet'),
  spell('a1f-v2-4',  'pokcet',      'pocket',     2, 4,  'pocket'),
  spell('a1f-v2-5',  'taechre',     'teacher',    2, 5,  'teacher'),
  spell('a1f-v2-6',  'peepol',      'people',     2, 6,  'people'),
  spell('a1f-v2-7',  'capbuord',    'cupboard',   2, 7,  'cupboard'),
  spell('a1f-v2-8',  'aneswr',      'answer',     2, 8,  'answer'),
  spell('a1f-v2-9',  'asseingmnet', 'assignment', 2, 9,  'assignment'),
  spell('a1f-v2-10', 'deughtar',    'daughter',   2, 10, 'daughter'),
  spell('a1f-v2-11', 'shuoledr',    'shoulder',   2, 11, 'shoulder'),
  spell('a1f-v2-12', 'straghit',    'straight',   2, 12, 'straight'),
  spell('a1f-v2-13', 'busciit',     'biscuit',    2, 13, 'biscuit'),
  spell('a1f-v2-14', 'drame',       'dream',      2, 14, 'dream'),
  spell('a1f-v2-15', 'ppepre',      'pepper',     2, 15, 'pepper'),
];

// ── Vocabulary Exercise 3: Choose the correct alternative (15) ────
const vocabEx3: QuizQuestion[] = [
  mc('a1f-v3-1',  'The ___ is with his little boy.',                         3, 1,  [['a', 'father'], ['b', 'mother']], 'a'),
  mc('a1f-v3-2',  '___ is that woman with green eyes?',                       3, 2,  [['a', 'Why'], ['b', 'Who']], 'b'),
  mc('a1f-v3-3',  "The television isn't ___ the shop.",                       3, 3,  [['a', 'in'], ['b', 'on']], 'a'),
  mc('a1f-v3-4',  'There are 3 ___ in the zoo.',                              3, 4,  [['a', 'tables'], ['b', 'monkeys']], 'b'),
  mc('a1f-v3-5',  "I need new ___ because I can't see well.",                 3, 5,  [['a', 'contact lenses'], ['b', 'earrings']], 'a'),
  mc('a1f-v3-6',  'She usually carries documents in her ___.',                3, 6,  [['a', 'briefcase'], ['b', 'tracksuit']], 'a'),
  mc('a1f-v3-7',  'When did Jacob finally get his ___?',                      3, 7,  [['a', 'school'], ['b', 'degree']], 'b'),
  mc('a1f-v3-8',  'Our ___ Lisa is our favourite relative.',                  3, 8,  [['a', 'cousin'], ['b', 'friend']], 'a'),
  mc('a1f-v3-9',  'Will all the kids ___ to the library?',                    3, 9,  [['a', 'walk'], ['b', 'like']], 'a'),
  mc('a1f-v3-10', "They didn't ___ the lesson on time.",                      3, 10, [['a', 'begin'], ['b', 'bring']], 'a'),
  mc('a1f-v3-11', 'We all wanted to ___ after we finished work.',             3, 11, [['a', 'get up'], ['b', 'go home']], 'b'),
  mc('a1f-v3-12', 'When will the tutor ___ us about the exam tomorrow?',      3, 12, [['a', 'tell'], ['b', 'find']], 'a'),
  mc('a1f-v3-13', "My mom's sister Mary is my oldest ___.",                   3, 13, [['a', 'son'], ['b', 'aunt']], 'b'),
  mc('a1f-v3-14', "She had a ___ ache last night and didn't sleep.",          3, 14, [['a', 'head'], ['b', 'face']], 'a'),
  mc('a1f-v3-15', 'The manager is ___ – only 1 metre 50 centimetres.',        3, 15, [['a', 'tall'], ['b', 'short']], 'b'),
];

// ── Vocabulary Exercise 4: Word Bank — A Day at the Café (15) ─────
const vocabEx4Bank = [
  'enjoy', 'hour', 'dessert', 'sister', 'fry', 'fashionable', 'sea', 'stand',
  'think', 'women', 'today', 'casual', 'grey', 'man', 'street',
];

const vocabEx4: QuizQuestion[] = [
  wb('a1f-v4-1',  '___, Jane and her sister Emma walk down the street to a nice café.',                                    'today',       4, 1),
  wb('a1f-v4-2',  'Jane and her ___, Emma, walk down the street to a nice café.',                                          'sister',      4, 2),
  wb('a1f-v4-3',  'They walk down the ___ to a nice café.',                                                                'street',      4, 3),
  wb('a1f-v4-4',  'It is a ___ and rainy morning, but they think it will be a good day.',                                  'grey',        4, 4),
  wb('a1f-v4-5',  'They ___ spending time together.',                                                                       'enjoy',       4, 5),
  wb('a1f-v4-6',  'Jane decides to wear a ___ Prada suit.',                                                                 'fashionable', 4, 6),
  wb('a1f-v4-7',  'Emma chooses a ___ tracksuit and trainers.',                                                             'casual',      4, 7),
  wb('a1f-v4-8',  'Inside the café, they see a ___ who will probably fry eggs ...',                                         'man',         4, 8),
  wb('a1f-v4-9',  '... a man who will probably ___ eggs ...',                                                               'fry',         4, 9),
  wb('a1f-v4-10', '... and two ___ making a chocolate dessert.',                                                            'women',       4, 10),
  wb('a1f-v4-11', '... two women making a chocolate ___.',                                                                  'dessert',     4, 11),
  wb('a1f-v4-12', 'They ___ in line for a few minutes and finally decide to order vegetable omelettes and apple cake.',     'stand',       4, 12),
  wb('a1f-v4-13', 'An ___ later, they sit by the window and enjoy their food.',                                             'hour',        4, 13),
  wb('a1f-v4-14', 'They talk about their plans to go to the ___ next week.',                                                'sea',         4, 14),
  wb('a1f-v4-15', 'They ___ about coming back to the café soon.',                                                           'think',       4, 15),
].map(q => ({ ...q, wordBank: vocabEx4Bank }));

// ── Vocabulary Exercise 5: Choose the correct ending (15) ─────────
const vocabEx5: QuizQuestion[] = [
  mc('a1f-v5-1',  'Andy and Meg are Sue\'s children. Sue is …',                       5, 1,
    [['a', 'their sister.'], ['b', 'their mum.'], ['c', 'their aunt.']], 'b'),
  mc('a1f-v5-2',  'Their house is in Fulton Street. And yours? …',                    5, 2,
    [['a', 'Where is your house?'], ['b', 'When is your house?'], ['c', 'How is your house?']], 'a'),
  mc('a1f-v5-3',  'During the summer, he loved driving…',                             5, 3,
    [['a', 'his bike in the mountains.'], ['b', 'his car in the mountains.'], ['c', 'his boat in the mountains.']], 'b'),
  mc('a1f-v5-4',  'Did she wear that elegant long pearl …',                           5, 4,
    [['a', 'earrings to the party?'], ['b', 'purses to the party?'], ['c', 'necklace to the party?']], 'c'),
  mc('a1f-v5-5',  'Bill\'s new Valentino suit is perfect for …',                      5, 5,
    [['a', 'a casual occasion.'], ['b', 'an oversized occasion.'], ['c', 'a formal occasion.']], 'c'),
  mc('a1f-v5-6',  'William is my dad\'s dad. He is …',                                5, 6,
    [['a', 'my uncle.'], ['b', 'my grandfather.'], ['c', 'my relatives.']], 'b'),
  mc('a1f-v5-7',  'There was a very strange ...',                                     5, 7,
    [['a', 'people in our class last year.'], ['b', 'women in our class last year.'], ['c', 'person in our class last year.']], 'c'),
  mc('a1f-v5-8',  'Ice cream contains…',                                              5, 8,
    [['a', 'a lot of pepper.'], ['b', 'a lot of milk.'], ['c', 'a lot of dessert.']], 'b'),
  mc('a1f-v5-9',  "The kids hate to clean so they don't often...",                    5, 9,
    [['a', 'do housework.'], ['b', 'wake up.'], ['c', 'have lunch.']], 'a'),
  mc('a1f-v5-10', 'Will the team practice how to…',                                   5, 10,
    [['a', 'ask a ball?'], ['b', 'catch a ball?'], ['c', 'play a ball?']], 'b'),
  mc('a1f-v5-11', 'Mr. and Mrs. Jackson have a child, Matthew. Matthew is…',          5, 11,
    [['a', 'their cousin.'], ['b', 'their uncle.'], ['c', 'their son.']], 'c'),
  mc('a1f-v5-12', "For her birthday last month, she didn't …",                        5, 12,
    [['a', 'grill a cake.'], ['b', 'bake a cake.'], ['c', 'fry a cake.']], 'b'),
  mc('a1f-v5-13', "After his accident, Andrew's arm sometimes…",                      5, 13,
    [['a', 'pain.'], ['b', 'rests.'], ['c', 'aches.']], 'c'),
  mc('a1f-v5-14', 'Go to the supermarket that is …',                                  5, 14,
    [['a', 'between the hospital.'], ['b', 'in front of the hospital.'], ['c', 'on the hospital.']], 'b'),
  mc('a1f-v5-15', 'I need some fresh air. Could you please…',                         5, 15,
    [['a', 'close the window?'], ['b', 'take the window?'], ['c', 'open the window?']], 'c'),
];

// ── Grammar Exercise 1: Choose the correct alternative (10) ───────
const grammarEx1: QuizQuestion[] = [
  mc('a1f-g1-1',  'We loved to eat snacks ___ we watched films.',                    6, 1,
    [['a', 'during'], ['b', 'while']], 'b'),
  mc('a1f-g1-2',  '___ to the beach now, or this afternoon?',                        6, 2,
    [['a', 'Is she go'], ['b', 'Is she going']], 'b'),
  mc('a1f-g1-3',  'The dentist and doctor ___ appointments tomorrow.',               6, 3,
    [['a', 'will take'], ['b', 'will to take']], 'a'),
  mc('a1f-g1-4',  '___ you throw the basketball to your friend?',                    6, 4,
    [['a', 'Does'], ['b', 'Did']], 'b'),
  mc('a1f-g1-5',  'The old clothes ___ in the box in the living room when I checked.',6, 5,
    [['a', "weren't"], ['b', "aren't"]], 'a'),
  mc('a1f-g1-6',  'Our relatives almost always gave ___ presents on our birthdays.', 6, 6,
    [['a', 'us'], ['b', 'we']], 'a'),
  mc('a1f-g1-7',  'Those two lawyers ___ formal suits.',                             6, 7,
    [['a', "haven't"], ['b', "haven't got"]], 'b'),
  mc('a1f-g1-8',  'The ___ games are behind the bookcase.',                          6, 8,
    [['a', "childrens'"], ['b', "children's"]], 'b'),
  mc('a1f-g1-9',  'The old woman on our street ___ drinking tea with my mum.',       6, 9,
    [['a', 'enjoys'], ['b', 'enjoies']], 'a'),
  mc('a1f-g1-10', 'Did you like ___ vanilla ice cream I bought yesterday?',          6, 10,
    [['a', 'that'], ['b', 'those']], 'a'),
];

// ── Grammar Exercise 2: Word Bank — Anna's Busy Day (10) ──────────
const grammarEx2Bank = [
  'her', 'will go', 'see', 'me', 'this', "Anna's", 'work', 'wakes up', 'is', 'them',
];

const grammarEx2: QuizQuestion[] = [
  wb('a1f-g2-1',  'Anna usually ___ early.',                                       'wakes up', 7, 1),
  wb('a1f-g2-2',  'She can ___ the sun through her window.',                       'see',      7, 2),
  wb('a1f-g2-3',  '___ dress is very comfortable. (her favourite blue dress)',     'this',     7, 3),
  wb('a1f-g2-4',  '___ brother is cooking breakfast in the kitchen.',              "Anna's",   7, 4),
  wb('a1f-g2-5',  "Anna's brother ___ cooking breakfast in the kitchen.",          'is',       7, 5),
  wb('a1f-g2-6',  'Anna and her family enjoy ___. (the pancakes)',                 'them',     7, 6),
  wb('a1f-g2-7',  '"___ in pairs," she says. (the teacher gives a project)',       'work',     7, 7),
  wb('a1f-g2-8',  'After school, Anna goes to the park. She plays with ___ dog, Max.', 'her',  7, 8),
  wb('a1f-g2-9',  '"Help ___ set the table," she says. (Anna\'s mom asks for help)', 'me',     7, 9),
  wb('a1f-g2-10', 'After dinner, Anna feels tired. She ___ to bed early tonight.', 'will go',  7, 10),
].map(q => ({ ...q, wordBank: grammarEx2Bank }));

// ── Grammar Exercise 3: Fill in the blank (10) ────────────────────
const grammarEx3: QuizQuestion[] = [
  fib('a1f-g3-1',  'My guitar and books ___ here now! Where are they? Help me find them.', "aren't", 8, 1, ["aren't", 'are not']),
  fib('a1f-g3-2',  '___ there an international train station near the square?',             'Is',     8, 2, ['is', 'Is', 'was', 'Was']),
  fib('a1f-g3-3',  'These are ___ parents, Anne and Carl, and this is my sister, Molly.',   'my',     8, 3, ['my']),
  fib('a1f-g3-4',  '"Are these your sandals at the door?" "Yes, they are ___."',            'mine',   8, 4, ['mine']),
  fib('a1f-g3-5',  'Whose are ___ sporty trainers over there?',                              'those',  8, 5, ['those']),
  fib('a1f-g3-6',  'His grandfather ___ an engineer; he was a lawyer.',                      "wasn't", 8, 6, ["wasn't", 'was not']),
  fib('a1f-g3-7',  'What time ___ the bus arrive at the station last night?',                'did',    8, 7, ['did']),
  fib('a1f-g3-8',  "I don't think that the teachers ___ listen to our questions tomorrow in class.", 'will', 8, 8, ['will', "'ll"]),
  fib('a1f-g3-9',  '___ she got a big family and many friends?',                              'Has',    8, 9, ['has', 'Has']),
  fib('a1f-g3-10', 'My friends ___ listening to music in their room at the moment.',          'are',    8, 10, ['are', "aren't", 'are not']),
];

// ── Grammar Exercise 4: Choose the correct ending (10) ────────────
const grammarEx4: QuizQuestion[] = [
  mc('a1f-g4-1',  'Katy bought a new skirt, but it…',                                9, 1,
    [['a', 'are a little tight.'], ['b', 'is a little tight.'], ['c', 'were a little tight.']], 'b'),
  mc('a1f-g4-2',  'David loves Alison very much, but…',                              9, 2,
    [['a', "she doesn't love he."], ['b', "she don't love him."], ['c', "she doesn't love him."]], 'c'),
  mc('a1f-g4-3',  "There's a new train station here, but ….",                        9, 3,
    [['a', 'there are a new bus station.'], ['b', "there isn't a new bus station."], ['c', 'is there a new bus station.']], 'b'),
  mc('a1f-g4-4',  'She went to visit her…',                                          9, 4,
    [['a', "children's new school."], ['b', 'chidrens new school.'], ['c', "childrens' new school."]], 'a'),
  mc('a1f-g4-5',  'Can you please pass me…',                                         9, 5,
    [['a', 'these salt?'], ['b', 'that salt?'], ['c', 'those salt?']], 'b'),
  mc('a1f-g4-6',  'The class went to Paris last year but they…',                     9, 6,
    [['a', "don't go to the Louvre."], ['b', "aren't go to the Louvre."], ['c', "didn't go to the Louvre."]], 'c'),
  mc('a1f-g4-7',  'When you were in elementary school, where …',                     9, 7,
    [['a', 'do you live?'], ['b', 'did you live?'], ['c', 'are you living?']], 'b'),
  mc('a1f-g4-8',  'Can you hear that music? Who …',                                  9, 8,
    [['a', 'is singing?'], ['b', 'does sings?'], ['c', 'sings?']], 'a'),
  mc('a1f-g4-9',  'When I was a little girl, I …',                                   9, 9,
    [['a', 'can run very fast.'], ['b', "can't run very fast."], ['c', 'could run very fast.']], 'c'),
  mc('a1f-g4-10', 'Be careful! …',                                                   9, 10,
    [['a', "Don't walk on the broken glass."], ['b', "Don't to walk on the broken glass."], ['c', "Don't you walk on the broken glass."]], 'a'),
];

// ── Final Test Exercise Descriptors ────────────────────────────────
export const a1FinalTestExercises: FinalTestExercise[] = [
  {
    group: 1, section: 'vocabulary', type: 'image-word',
    titleKey: 'finalTest.exercise.1.title', titleFallback: 'Vocabulary 1: Picture Words',
    instructionKey: 'finalTest.exercise.1.instruction', instructionFallback: 'Write the correct word under each image.',
    questions: vocabEx1,
  },
  {
    group: 2, section: 'vocabulary', type: 'spelling-correction',
    titleKey: 'finalTest.exercise.2.title', titleFallback: 'Vocabulary 2: Fix the Spelling',
    instructionKey: 'finalTest.exercise.2.instruction', instructionFallback: 'Correct the spelling of each word, using the image as a reference.',
    questions: vocabEx2,
  },
  {
    group: 3, section: 'vocabulary', type: 'multiple-choice',
    titleKey: 'finalTest.exercise.3.title', titleFallback: 'Vocabulary 3: Choose the Right Word',
    instructionKey: 'finalTest.exercise.3.instruction', instructionFallback: 'Choose the correct alternative to complete the sentence.',
    questions: vocabEx3,
  },
  {
    group: 4, section: 'vocabulary', type: 'word-bank',
    titleKey: 'finalTest.exercise.4.title', titleFallback: 'Vocabulary 4: A Day at the Café',
    instructionKey: 'finalTest.exercise.4.instruction', instructionFallback: 'Use the Word Bank above to complete the text. Each word is used once.',
    wordBank: vocabEx4Bank,
    questions: vocabEx4,
  },
  {
    group: 5, section: 'vocabulary', type: 'multiple-choice',
    titleKey: 'finalTest.exercise.5.title', titleFallback: 'Vocabulary 5: Complete the Sentence',
    instructionKey: 'finalTest.exercise.5.instruction', instructionFallback: 'Choose the correct ending (a, b, or c) to complete the sentence.',
    questions: vocabEx5,
  },
  {
    group: 6, section: 'grammar', type: 'multiple-choice',
    titleKey: 'finalTest.exercise.6.title', titleFallback: 'Grammar 1: Choose the Right Form',
    instructionKey: 'finalTest.exercise.6.instruction', instructionFallback: 'Choose the correct alternative to complete the sentence.',
    questions: grammarEx1,
  },
  {
    group: 7, section: 'grammar', type: 'word-bank',
    titleKey: 'finalTest.exercise.7.title', titleFallback: "Grammar 2: Anna's Busy Day",
    instructionKey: 'finalTest.exercise.7.instruction', instructionFallback: 'Use the Word Bank above to complete the text. Each word is used once.',
    wordBank: grammarEx2Bank,
    questions: grammarEx2,
  },
  {
    group: 8, section: 'grammar', type: 'fill-in-blank',
    titleKey: 'finalTest.exercise.8.title', titleFallback: 'Grammar 3: Complete the Sentence',
    instructionKey: 'finalTest.exercise.8.instruction', instructionFallback: 'Complete the sentence so it is grammatically correct.',
    questions: grammarEx3,
  },
  {
    group: 9, section: 'grammar', type: 'multiple-choice',
    titleKey: 'finalTest.exercise.9.title', titleFallback: 'Grammar 4: Choose the Right Ending',
    instructionKey: 'finalTest.exercise.9.instruction', instructionFallback: 'Choose the correct ending (a, b, or c) to complete the sentence.',
    questions: grammarEx4,
  },
];

// Flat list (all 105 questions) — convenient for grading + persistence.
export const a1FinalTestAllQuestions: QuizQuestion[] = a1FinalTestExercises.flatMap(e => e.questions);

/** Pass threshold for unlocking the certificate (overall percentage). */
export const A1_FINAL_TEST_PASS_THRESHOLD = 70;

/** localStorage key used to remember that the student has passed the A1 Final Test. */
export const A1_FINAL_TEST_PASSED_KEY = 'a1_final_test_passed';

/** Module ID of the A1 Final Test (matches seed/migration). */
export const A1_FINAL_TEST_MODULE_ID = 'a1-final-test';

/** Path to the static A1 completion certificate image (same JPEG for every student). */
export const A1_CERTIFICATE_URL = '/assets/certificates/a1-certificate.jpg';
