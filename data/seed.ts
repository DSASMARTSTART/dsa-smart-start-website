// ============================================
// DSA Smart Start - Seed Data
// ============================================

import { 
  User, Course, Enrollment, Purchase, Progress, 
  AuditLog, Activity, Module, Lesson, Homework 
} from '../types';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

// Admin email from environment variable
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@dsasmartstart.com';

// ---------- USERS ----------
export const SEED_USERS: User[] = [
  {
    id: 'admin-001',
    email: ADMIN_EMAIL,
    name: 'DSA Admin',
    role: 'admin',
    status: 'active',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2026-01-15T08:00:00Z',
    lastActivityAt: '2026-01-15T08:30:00Z',
    adminNotes: 'Platform administrator'
  },
  {
    id: 'student-001',
    email: 'marco@example.com',
    name: 'Marco Rossi',
    role: 'student',
    status: 'active',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marco',
    createdAt: '2025-09-15T14:30:00Z',
    updatedAt: '2026-01-14T10:00:00Z',
    lastActivityAt: '2026-01-14T16:45:00Z',
    adminNotes: 'A1 student, shows good progress'
  },
  {
    id: 'student-002',
    email: 'giulia@example.com',
    name: 'Giulia Bianchi',
    role: 'student',
    status: 'active',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Giulia',
    createdAt: '2025-08-20T09:00:00Z',
    updatedAt: '2026-01-12T11:00:00Z',
    lastActivityAt: '2026-01-13T14:20:00Z',
    adminNotes: 'Enrolled in both A1 and A2'
  },
  {
    id: 'student-003',
    email: 'luca@example.com',
    name: 'Luca Ferrari',
    role: 'student',
    status: 'paused',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luca',
    createdAt: '2025-10-05T16:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
    lastActivityAt: '2025-12-20T10:30:00Z',
    adminNotes: 'Paused account - requested break until February'
  }
];

// ---------- COURSES ----------
const A1_MODULES: Module[] = [
  {
    id: 'a1-m1',
    title: 'Foundations of Being',
    description: 'Master the basics of English pronouns and the verb TO BE',
    order: 1,
    lessons: [
      { 
        id: 'a1-l1', 
        title: 'Unit 1: Subject Pronouns', 
        duration: '12m', 
        type: 'video', 
        order: 1,
        videoLinks: {
          primaryVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          fallbackVideoUrl: 'https://vimeo.com/123456789',
          videoProvider: 'youtube',
          embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
        }
      },
      { 
        id: 'a1-l2', 
        title: 'Unit 2: Verb TO BE', 
        duration: '15m', 
        type: 'video', 
        order: 2,
        videoLinks: {
          primaryVideoUrl: 'https://www.youtube.com/watch?v=example2',
          videoProvider: 'youtube',
          embedUrl: 'https://www.youtube.com/embed/example2'
        }
      },
      { id: 'a1-l3', title: 'Unit 3: Regular Plural Nouns', duration: '10m', type: 'reading', order: 3 },
      { id: 'a1-l4', title: 'Unit 4: Irregular Plural Nouns', duration: '10m', type: 'reading', order: 4 },
      { 
        id: 'a1-l5', 
        title: 'Unit 5: Past Simple of Verb TO BE', 
        duration: '14m', 
        type: 'video', 
        order: 5,
        videoLinks: {
          primaryVideoUrl: 'https://www.youtube.com/watch?v=example3',
          videoProvider: 'youtube',
          embedUrl: 'https://www.youtube.com/embed/example3'
        }
      },
    ],
    homework: [
      { id: 'a1-h1', title: 'Pronouns Memory Map', description: 'Create a visual mind map of all pronouns', order: 1 },
      { id: 'a1-h2', title: 'Verb Be Visual Quiz', description: 'Complete the interactive quiz', order: 2 }
    ]
  },
  {
    id: 'a1-m2',
    title: 'Daily Expression',
    description: 'Learn everyday English expressions and tenses',
    order: 2,
    lessons: [
      { id: 'a1-l6', title: 'Unit 6: Saxon Genitive', duration: '18m', type: 'video', order: 1 },
      { id: 'a1-l7', title: 'Unit 7: Demonstratives', duration: '14m', type: 'video', order: 2 },
      { id: 'a1-l8', title: 'Unit 8: Present Simple Intro', duration: '20m', type: 'video', order: 3 },
      { id: 'a1-l9', title: 'Unit 9: Frequency Adverbs', duration: '12m', type: 'reading', order: 4 },
      { id: 'a1-l10', title: 'Unit 10: Past Simple Verbs', duration: '25m', type: 'video', order: 5 },
    ],
    homework: [
      { id: 'a1-h3', title: 'Daily Routine Designer', description: 'Design your ideal daily routine in English', order: 1 }
    ]
  },
  {
    id: 'a1-m3',
    title: 'Advanced Foundations',
    description: 'Build on your foundation with more complex structures',
    order: 3,
    lessons: [
      { id: 'a1-l11', title: 'Unit 11: Imperative Forms', duration: '10m', type: 'reading', order: 1 },
      { id: 'a1-l12', title: 'Unit 12: Modal Verb WILL', duration: '15m', type: 'video', order: 2 },
      { id: 'a1-l13', title: 'Unit 13: Have vs Have Got', duration: '12m', type: 'video', order: 3 },
      { id: 'a1-l14', title: 'Unit 14: Time Prepositions', duration: '18m', type: 'reading', order: 4 },
      { id: 'a1-l15', title: 'Unit 15: Present Continuous', duration: '22m', type: 'video', order: 5 },
    ],
    homework: []
  }
];

// A1 Grammar Topics Modules (15 units)
const A1_GRAMMAR_MODULES: Module[] = [
  {
    id: 'a1-grammar-m1',
    title: 'Foundations of Being',
    description: 'Master the basics of English pronouns and the verb TO BE',
    order: 1,
    lessons: [
      { id: 'a1-g1', title: 'Unit 1: Subject pronouns and the verb TO BE in affirmative, negative, and question form', duration: '15m', type: 'video', order: 1 },
      { id: 'a1-g2', title: 'Unit 2: Plural nouns regular and irregular', duration: '12m', type: 'video', order: 2 },
      { id: 'a1-g3', title: 'Unit 3: Past simple of the verb TO BE affirmative, negative, and question form', duration: '14m', type: 'video', order: 3 },
      { id: 'a1-g4', title: 'Unit 4: Saxon genitive and the use of the question word "whose"', duration: '10m', type: 'reading', order: 4 },
      { id: 'a1-g5', title: 'Unit 5: Demonstratives this, that, these, those', duration: '12m', type: 'video', order: 5 },
    ],
    homework: [
      { id: 'a1-gh1', title: 'Pronouns Memory Map', description: 'Create a visual mind map of all pronouns', order: 1 }
    ]
  },
  {
    id: 'a1-grammar-m2',
    title: 'Daily Expression',
    description: 'Learn everyday English expressions and tenses',
    order: 2,
    lessons: [
      { id: 'a1-g6', title: 'Unit 6: Past simple of the verb TO BE affirmative, negative, and question form', duration: '15m', type: 'video', order: 1 },
      { id: 'a1-g7', title: 'Unit 7: Present simple affirmative, negative, and question form; adverbs of frequency', duration: '18m', type: 'video', order: 2 },
      { id: 'a1-g8', title: 'Unit 8: Past simple regular and irregular verbs in affirmative, negative, and question form; past time expressions', duration: '20m', type: 'video', order: 3 },
      { id: 'a1-g9', title: 'Unit 9: Imperative forms', duration: '10m', type: 'reading', order: 4 },
      { id: 'a1-g10', title: 'Unit 10: The modal verb WILL affirmative, negative, and question form', duration: '15m', type: 'video', order: 5 },
    ],
    homework: [
      { id: 'a1-gh2', title: 'Daily Routine Designer', description: 'Design your ideal daily routine in English', order: 1 }
    ]
  },
  {
    id: 'a1-grammar-m3',
    title: 'Advanced Foundations',
    description: 'Build on your foundation with more complex structures',
    order: 3,
    lessons: [
      { id: 'a1-g11', title: 'Unit 11: The modal verbs CAN and COULD used in present and past simple', duration: '15m', type: 'video', order: 1 },
      { id: 'a1-g12', title: 'Unit 12: Object pronouns', duration: '12m', type: 'video', order: 2 },
      { id: 'a1-g13', title: 'Unit 13: Have and have got affirmative, negative, and question form', duration: '14m', type: 'video', order: 3 },
      { id: 'a1-g14', title: 'Unit 14: Prepositions of time and prepositions of place', duration: '12m', type: 'reading', order: 4 },
      { id: 'a1-g15', title: 'Unit 15: Present continuous affirmative, negative, and question form', duration: '18m', type: 'video', order: 5 },
    ],
    homework: []
  }
];

// A2 Grammar Topics Modules (15 units)
const A2_GRAMMAR_MODULES: Module[] = [
  {
    id: 'a2-grammar-m1',
    title: 'Narrative & Flow',
    description: 'Master the art of storytelling in English',
    order: 1,
    lessons: [
      { id: 'a2-g1', title: 'Unit 1: Present simple vs present continuous affirmative, negative, and question form', duration: '15m', type: 'video', order: 1 },
      { id: 'a2-g2', title: 'Unit 2: Past continuous affirmative, negative, and question form', duration: '12m', type: 'video', order: 2 },
      { id: 'a2-g3', title: 'Unit 3: Past continuous vs past simple', duration: '14m', type: 'video', order: 3 },
      { id: 'a2-g4', title: 'Unit 4: Adverbs + prepositions of time, place, and movement', duration: '12m', type: 'reading', order: 4 },
      { id: 'a2-g5', title: 'Unit 5: Articles; countable and uncountable nouns', duration: '15m', type: 'video', order: 5 },
    ],
    homework: [
      { id: 'a2-gh1', title: 'Timeline Mapping', description: 'Create a visual timeline of your week', order: 1 }
    ]
  },
  {
    id: 'a2-grammar-m2',
    title: 'Quantifiers & Modals',
    description: 'Learn to express quantities and possibilities',
    order: 2,
    lessons: [
      { id: 'a2-g6', title: 'Unit 6: Some, any, and a lot of; introduction to quantifiers', duration: '15m', type: 'video', order: 1 },
      { id: 'a2-g7', title: 'Unit 7: Quantifiers much, many, a lot of, a few, a little', duration: '12m', type: 'video', order: 2 },
      { id: 'a2-g8', title: 'Unit 8: Comparative and superlative adjectives', duration: '18m', type: 'video', order: 3 },
      { id: 'a2-g9', title: 'Unit 9: Modal verbs may and might', duration: '12m', type: 'reading', order: 4 },
      { id: 'a2-g10', title: 'Unit 10: Modal verbs should, must, and have to', duration: '15m', type: 'video', order: 5 },
    ],
    homework: []
  },
  {
    id: 'a2-grammar-m3',
    title: 'Future & Perfect',
    description: 'Master future tenses and perfect aspects',
    order: 3,
    lessons: [
      { id: 'a2-g11', title: 'Unit 11: Verb patterns like, want, remember, would like', duration: '15m', type: 'video', order: 1 },
      { id: 'a2-g12', title: 'Unit 12: Future forms will, be going to, present continuous', duration: '14m', type: 'video', order: 2 },
      { id: 'a2-g13', title: 'Unit 13: Present perfect affirmative, negative, and question form', duration: '18m', type: 'video', order: 3 },
      { id: 'a2-g14', title: 'Unit 14: Present perfect vs past simple', duration: '15m', type: 'reading', order: 4 },
      { id: 'a2-g15', title: 'Unit 15: Zero and first conditional; the use of "unless"', duration: '16m', type: 'video', order: 5 },
    ],
    homework: []
  }
];

// B1 Grammar Topics Modules (15 units)
const B1_GRAMMAR_MODULES: Module[] = [
  {
    id: 'b1-grammar-m1',
    title: 'Perfect Aspects',
    description: 'Master perfect tenses and continuous aspects',
    order: 1,
    lessons: [
      { id: 'b1-g1', title: 'Unit 1: Present perfect continuous affirmative, negative, and question form', duration: '16m', type: 'video', order: 1 },
      { id: 'b1-g2', title: 'Unit 2: Present perfect simple vs present perfect continuous', duration: '14m', type: 'video', order: 2 },
      { id: 'b1-g3', title: 'Unit 3: Past perfect simple affirmative, negative, and question form', duration: '15m', type: 'video', order: 3 },
      { id: 'b1-g4', title: 'Unit 4: Future continuous affirmative, negative, and question form', duration: '14m', type: 'video', order: 4 },
      { id: 'b1-g5', title: 'Unit 5: Passive voice in present, past, and future simple', duration: '18m', type: 'video', order: 5 },
    ],
    homework: [
      { id: 'b1-gh1', title: 'Perfect Tenses Journal', description: 'Write a personal journal using perfect tenses', order: 1 }
    ]
  },
  {
    id: 'b1-grammar-m2',
    title: 'Modal Mastery',
    description: 'Advanced modal verbs and causative structures',
    order: 2,
    lessons: [
      { id: 'b1-g6', title: 'Unit 6: Causative structures have and get something done', duration: '15m', type: 'video', order: 1 },
      { id: 'b1-g7', title: 'Unit 7: Modal verbs ought to, shall, be able to, manage to', duration: '14m', type: 'video', order: 2 },
      { id: 'b1-g8', title: 'Unit 8: Modal verbs of deduction can\'t and must', duration: '12m', type: 'video', order: 3 },
      { id: 'b1-g9', title: 'Unit 9: Modal verbs of deduction must, might, should', duration: '14m', type: 'reading', order: 4 },
      { id: 'b1-g10', title: 'Unit 10: Reported speech', duration: '18m', type: 'video', order: 5 },
    ],
    homework: []
  },
  {
    id: 'b1-grammar-m3',
    title: 'Complex Structures',
    description: 'Advanced grammar patterns and conditionals',
    order: 3,
    lessons: [
      { id: 'b1-g11', title: 'Unit 11: Indirect questions', duration: '14m', type: 'video', order: 1 },
      { id: 'b1-g12', title: 'Unit 12: Second and third conditional', duration: '16m', type: 'video', order: 2 },
      { id: 'b1-g13', title: 'Unit 13: Relative pronouns and relative clauses', duration: '15m', type: 'video', order: 3 },
      { id: 'b1-g14', title: 'Unit 14: Question tags', duration: '12m', type: 'reading', order: 4 },
      { id: 'b1-g15', title: 'Unit 15: Comparative adjectives', duration: '14m', type: 'video', order: 5 },
    ],
    homework: []
  }
];

// Kids Advanced Grammar Topics Modules (15 units)
const KIDS_ADVANCED_MODULES: Module[] = [
  {
    id: 'kids-adv-m1',
    title: 'Past & Future Foundations',
    description: 'Master past tenses and future expressions',
    order: 1,
    lessons: [
      { id: 'ka-g1', title: 'Unit 1: Past Simple vs. Past Continuous', duration: '12m', type: 'video', order: 1 },
      { id: 'ka-g2', title: 'Unit 2: Modal Verbs - May, Might, Shall', duration: '10m', type: 'video', order: 2 },
      { id: 'ka-g3', title: 'Unit 3: Will', duration: '10m', type: 'video', order: 3 },
      { id: 'ka-g4', title: 'Unit 4: Be Going To', duration: '10m', type: 'reading', order: 4 },
      { id: 'ka-g5', title: 'Unit 5: Will vs. Be Going To', duration: '12m', type: 'video', order: 5 },
    ],
    homework: [
      { id: 'ka-gh1', title: 'Future Plans Poster', description: 'Create a colorful poster about your future plans', order: 1 }
    ]
  },
  {
    id: 'kids-adv-m2',
    title: 'Present Perfect & Comparisons',
    description: 'Learn present perfect and comparative forms',
    order: 2,
    lessons: [
      { id: 'ka-g6', title: 'Unit 6: Present Perfect Simple - Affirmative and Negative', duration: '12m', type: 'video', order: 1 },
      { id: 'ka-g7', title: 'Unit 7: Present Perfect Simple - Question Form', duration: '10m', type: 'video', order: 2 },
      { id: 'ka-g8', title: 'Unit 8: Present Perfect Simple - With Common Expressions', duration: '12m', type: 'video', order: 3 },
      { id: 'ka-g9', title: 'Unit 9: Comparatives', duration: '10m', type: 'reading', order: 4 },
      { id: 'ka-g10', title: 'Unit 10: Possessive Pronouns', duration: '10m', type: 'video', order: 5 },
    ],
    homework: []
  },
  {
    id: 'kids-adv-m3',
    title: 'Preferences & Conditionals',
    description: 'Express preferences and learn conditional forms',
    order: 3,
    lessons: [
      { id: 'ka-g11', title: 'Unit 11: Verbs of Preference - Like, Love, Hate + Ing', duration: '10m', type: 'video', order: 1 },
      { id: 'ka-g12', title: 'Unit 12: Adverbs Ending in -ly', duration: '10m', type: 'video', order: 2 },
      { id: 'ka-g13', title: 'Unit 13: First Conditional', duration: '12m', type: 'video', order: 3 },
      { id: 'ka-g14', title: 'Unit 14: Second Conditional', duration: '12m', type: 'reading', order: 4 },
      { id: 'ka-g15', title: 'Unit 15: First vs. Second Conditional', duration: '14m', type: 'video', order: 5 },
    ],
    homework: []
  }
];

const A2_MODULES: Module[] = [
  {
    id: 'a2-m1',
    title: 'Narrative & Flow',
    description: 'Master the art of storytelling in English',
    order: 1,
    lessons: [
      { 
        id: 'a2-l1', 
        title: 'Unit 1: Present Simple vs Continuous', 
        duration: '15m', 
        type: 'video', 
        order: 1,
        videoLinks: {
          primaryVideoUrl: 'https://www.youtube.com/watch?v=a2example1',
          videoProvider: 'youtube',
          embedUrl: 'https://www.youtube.com/embed/a2example1'
        }
      },
      { 
        id: 'a2-l2', 
        title: 'Unit 2: Past Continuous Intro', 
        duration: '12m', 
        type: 'video', 
        order: 2,
        videoLinks: {
          primaryVideoUrl: 'https://www.youtube.com/watch?v=a2example2',
          videoProvider: 'youtube',
          embedUrl: 'https://www.youtube.com/embed/a2example2'
        }
      },
      { id: 'a2-l3', title: 'Unit 3: Continuous vs Simple', duration: '18m', type: 'video', order: 3 },
      { id: 'a2-l4', title: 'Unit 4: Adverbs of Manner', duration: '10m', type: 'reading', order: 4 },
      { id: 'a2-l5', title: 'Unit 5: Articles A/An/The', duration: '12m', type: 'video', order: 5 },
    ],
    homework: [
      { id: 'a2-h1', title: 'Timeline Mapping', description: 'Create a visual timeline of your week', order: 1 }
    ]
  },
  {
    id: 'a2-m2',
    title: 'Quantifiers & Modals',
    description: 'Learn to express quantities and possibilities',
    order: 2,
    lessons: [
      { id: 'a2-l6', title: 'Unit 6: Countable Nouns', duration: '15m', type: 'video', order: 1 },
      { id: 'a2-l7', title: 'Unit 7: Uncountable Nouns', duration: '12m', type: 'video', order: 2 },
      { id: 'a2-l8', title: 'Unit 8: Comparatives', duration: '18m', type: 'video', order: 3 },
      { id: 'a2-l9', title: 'Unit 9: Superlatives', duration: '10m', type: 'reading', order: 4 },
      { id: 'a2-l10', title: 'Unit 10: Modals MUST/SHOULD', duration: '12m', type: 'video', order: 5 },
    ],
    homework: []
  },
  {
    id: 'a2-m3',
    title: 'Future & Perfect',
    description: 'Master future tenses and perfect aspects',
    order: 3,
    lessons: [
      { id: 'a2-l11', title: 'Unit 11: Future GOING TO', duration: '15m', type: 'video', order: 1 },
      { id: 'a2-l12', title: 'Unit 12: Future WILL', duration: '12m', type: 'video', order: 2 },
      { id: 'a2-l13', title: 'Unit 13: Present Perfect', duration: '18m', type: 'video', order: 3 },
      { id: 'a2-l14', title: 'Unit 14: For vs Since', duration: '10m', type: 'reading', order: 4 },
      { id: 'a2-l15', title: 'Unit 15: Conditionals Intro', duration: '12m', type: 'video', order: 5 },
    ],
    homework: []
  }
];

export const SEED_COURSES: Course[] = [
  // Premium Programs (Top of the list)
  {
    id: 'premium',
    title: 'DSA SMART START - PREMIUM PATHWAY',
    description: 'The PREMIUM DSA Smart Start Pathway Option B is a complete and innovative program designed for students with SLD who want to learn English in a clear, stimulating, and frustration-free way. Through a multisensory method and high-readability materials, the pathway combines individual lessons, group workshops, mind maps, and video lessons to make learning easier and more effective. The DSA Smart Start Method is the only one that integrates socialization, specific support tools, and a gradual approach, to guide students step by step, with confidence and motivation.',
    level: 'Premium',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
    pricing: {
      price: 1050,
      currency: 'EUR',
      isFree: false,
      discountPrice: 750,
      discountStartDate: '2026-01-01T00:00:00Z',
      discountEndDate: '2026-12-31T23:59:59Z'
    },
    modules: [],
    isPublished: true,
    isDraft: false,
    publishedAt: '2026-01-15T10:00:00Z',
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-01-17T14:00:00Z',
    adminNotes: 'Premium flagship program'
  },
  {
    id: 'gold',
    title: 'DSA SMART START - GOLD PATHWAY',
    description: 'The GOLD DSA Smart Start Pathway is a structured and innovative program designed for students with SLD who want to learn English in a clear, engaging, and frustration-free way. Thanks to a multisensory and high-readability method, the pathway combines interactive group lessons, mind maps, video lessons, and dedicated materials to make learning easier and more effective. The DSA Smart Start method is the only one that combines socialization, specific support tools, and a step-by-step approach, to guide students in their learning journey with confidence and motivation.',
    level: 'Gold',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
    pricing: {
      price: 950,
      currency: 'EUR',
      isFree: false,
      discountPrice: 626,
      discountStartDate: '2026-01-01T00:00:00Z',
      discountEndDate: '2026-12-31T23:59:59Z'
    },
    modules: [],
    isPublished: true,
    isDraft: false,
    publishedAt: '2026-01-15T10:00:00Z',
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-01-17T14:00:00Z',
    adminNotes: 'Gold comprehensive program'
  },
  // Adult Level Courses
  {
    id: 'a1',
    title: 'DSA SMART START - A1 LEVEL',
    description: 'The DSA Smart Start Level A1 volume is designed to guide students with Specific Learning Disabilities (SLD) in their first steps in learning English. Thanks to a visual, multisensory, and inclusive approach, each teaching unit is designed to facilitate comprehension, memorization, and active use of the language, making the learning experience accessible and motivating. This program represents the first level of the DSA Smart Start program, a method that integrates effective learning techniques, visual supports, and personalized strategies. It\'s a useful tool not only for students with DSA, but also for anyone who wants to learn English in a more intuitive and gradual way. This level follows the Cambridge English A1 preparation and, as such, represents an excellent path to taking the Cambridge exams. It is a valuable tool for students wishing to obtain a recognized international certification. Suitable for students aged 8 and up, parents, support teachers and learning tutors.',
    level: 'A1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
    pricing: {
      price: 100,
      currency: 'EUR',
      isFree: false,
      discountPrice: 50,
      discountStartDate: '2026-01-01T00:00:00Z',
      discountEndDate: '2026-12-31T23:59:59Z'
    },
    modules: A1_GRAMMAR_MODULES,
    isPublished: true,
    isDraft: false,
    publishedAt: '2025-07-01T10:00:00Z',
    createdAt: '2025-06-15T09:00:00Z',
    updatedAt: '2026-01-17T14:00:00Z',
    adminNotes: 'Flagship beginner course - Cambridge A1 prep'
  },
  {
    id: 'a2',
    title: 'DSA SMART START - A2 LEVEL',
    description: 'The DSA Smart Start Level A2 volume is designed to guide students with Specific Learning Disabilities (SLD) in consolidating acquired language skills and introducing more complex grammatical structures. Thanks to a visual, multisensory, and inclusive approach, each teaching unit is structured to facilitate comprehension, memorization, and active use of the language, making the learning experience accessible and motivating. This program represents the 2nd level of the DSA Smart Start pathway, a method that integrates effective learning techniques, visual supports, and personalized strategies. It\'s a useful tool not only for students with SLD, but also for all those who want to deepen their English in a more structured and gradual way. This level follows the Cambridge English A2 Key (KET) preparation and, as such, represents an excellent path for taking the Cambridge exams. It is a valuable tool for students wishing to obtain a recognized international certification. Suitable for students aged 9 and up, parents, support teachers and learning tutors.',
    level: 'A2',
    thumbnailUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
    pricing: {
      price: 10,
      currency: 'EUR',
      isFree: false,
      discountPrice: 1,
      discountStartDate: '2026-01-01T00:00:00Z',
      discountEndDate: '2026-12-31T23:59:59Z'
    },
    modules: A2_GRAMMAR_MODULES,
    isPublished: true,
    isDraft: false,
    publishedAt: '2025-09-01T10:00:00Z',
    createdAt: '2025-08-15T09:00:00Z',
    updatedAt: '2026-01-17T11:00:00Z',
    adminNotes: 'Cambridge A2 KET prep course'
  },
  {
    id: 'b1',
    title: 'DSA SMART START - B1 LEVEL',
    description: 'The DSA Smart Start Level B1 volume is designed to guide students with Specific Learning Disabilities (SLD) in an intermediate phase of English learning, where the language becomes a more complex, articulated tool of expression closer to real use. This level introduces more advanced grammatical structures and promotes the development of 4 skills: listening, reading, writing, and speaking. This program represents the 3rd level of the DSA Smart Start pathway, a method based on visual, inclusive, and personalized strategies for learning English. It is suitable for students who want to strengthen their language skills effectively and gradually, also in preparation for international exams. This level follows the Cambridge English B1 Preliminary (PET) preparation and is ideal for guiding students toward autonomous communication in familiar, school, and daily life contexts. Suitable for students aged 10 and up, parents, support teachers and learning tutors.',
    level: 'B1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
    pricing: {
      price: 100,
      currency: 'EUR',
      isFree: false,
      discountPrice: 50,
      discountStartDate: '2026-01-01T00:00:00Z',
      discountEndDate: '2026-12-31T23:59:59Z'
    },
    modules: B1_GRAMMAR_MODULES,
    isPublished: true,
    isDraft: false,
    publishedAt: '2025-11-01T10:00:00Z',
    createdAt: '2025-10-15T09:00:00Z',
    updatedAt: '2026-01-17T16:00:00Z',
    adminNotes: 'Cambridge B1 PET prep course'
  },
  // Kids Courses
  {
    id: 'kids-basic',
    title: 'DSA SMART START KIDS - BASIC LEVEL',
    description: 'Introduction to English through songs, visuals, and sensory exploration. Perfect for early years learners with dyslexia.',
    level: 'Kids',
    thumbnailUrl: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800',
    pricing: {
      price: 99,
      currency: 'EUR',
      isFree: false
    },
    modules: [],
    isPublished: true,
    isDraft: false,
    publishedAt: '2025-08-01T10:00:00Z',
    createdAt: '2025-07-15T09:00:00Z',
    updatedAt: '2026-01-10T14:00:00Z',
    adminNotes: 'Kids basic level - early years'
  },
  {
    id: 'kids-medium',
    title: 'DSA SMART START KIDS - MEDIUM LEVEL',
    description: 'Interactive storytelling and vocabulary games for active focus. Designed for primary school children with specific learning differences.',
    level: 'Kids',
    thumbnailUrl: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=800',
    pricing: {
      price: 119,
      currency: 'EUR',
      isFree: false
    },
    modules: [],
    isPublished: true,
    isDraft: false,
    publishedAt: '2025-08-15T10:00:00Z',
    createdAt: '2025-07-20T09:00:00Z',
    updatedAt: '2026-01-10T14:00:00Z',
    adminNotes: 'Kids medium level - primary'
  },
  {
    id: 'kids-advanced',
    title: 'DSA SMART START KIDS - ADVANCED LEVEL',
    description: 'The DSA Smart Start Kids Advanced Level pathway is designed to guide, step by step, children with learning difficulties in studying the English language. Children can gradually improve, starting from A1 Starters exams, moving through Movers, up to A2 Flyers. DSA Smart Start Advanced Level completes the program, offering essential content for preparation for the A2 Flyers exams, the third level of Cambridge English Young Learners, designed for primary and lower secondary school students. Children develop the ability to: understand and use more complex sentences on familiar topics; read and listen to short texts, stories, and realistic dialogues in English; communicate and interact effectively in everyday contexts, with more articulate and confident language.',
    level: 'Kids',
    thumbnailUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800',
    pricing: {
      price: 150,
      currency: 'EUR',
      isFree: false,
      discountPrice: 70,
      discountStartDate: '2026-01-01T00:00:00Z',
      discountEndDate: '2026-12-31T23:59:59Z'
    },
    modules: KIDS_ADVANCED_MODULES,
    isPublished: true,
    isDraft: false,
    publishedAt: '2025-09-01T10:00:00Z',
    createdAt: '2025-08-01T09:00:00Z',
    updatedAt: '2026-01-17T14:00:00Z',
    adminNotes: 'Kids advanced level - Cambridge A2 Flyers prep'
  }
];

// ---------- ENROLLMENTS ----------
export const SEED_ENROLLMENTS: Enrollment[] = [
  {
    id: 'enroll-001',
    userId: 'student-001',
    courseId: 'a1',
    enrolledAt: '2025-09-16T10:00:00Z',
    status: 'active'
  },
  {
    id: 'enroll-002',
    userId: 'student-002',
    courseId: 'a1',
    enrolledAt: '2025-08-21T14:00:00Z',
    status: 'completed',
    completedAt: '2025-12-15T16:00:00Z'
  },
  {
    id: 'enroll-003',
    userId: 'student-002',
    courseId: 'a2',
    enrolledAt: '2025-12-16T09:00:00Z',
    status: 'active'
  },
  {
    id: 'enroll-004',
    userId: 'student-003',
    courseId: 'a1',
    enrolledAt: '2025-10-06T11:00:00Z',
    status: 'active'
  }
];

// ---------- PURCHASES ----------
export const SEED_PURCHASES: Purchase[] = [
  {
    id: 'purchase-001',
    userId: 'student-001',
    courseId: 'a1',
    amount: 99,
    currency: 'EUR',
    purchasedAt: '2025-09-16T10:00:00Z',
    paymentMethod: 'card',
    transactionId: 'txn_abc123'
  },
  {
    id: 'purchase-002',
    userId: 'student-002',
    courseId: 'a1',
    amount: 149,
    currency: 'EUR',
    purchasedAt: '2025-08-21T14:00:00Z',
    paymentMethod: 'card',
    transactionId: 'txn_def456'
  },
  {
    id: 'purchase-003',
    userId: 'student-002',
    courseId: 'a2',
    amount: 179,
    currency: 'EUR',
    purchasedAt: '2025-12-16T09:00:00Z',
    paymentMethod: 'paypal',
    transactionId: 'txn_ghi789'
  },
  {
    id: 'purchase-004',
    userId: 'student-003',
    courseId: 'a1',
    amount: 99,
    currency: 'EUR',
    purchasedAt: '2025-10-06T11:00:00Z',
    paymentMethod: 'card',
    transactionId: 'txn_jkl012'
  }
];

// ---------- AUDIT LOGS ----------
export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-001',
    action: 'course_published',
    entityType: 'course',
    entityId: 'a1',
    adminId: 'admin-001',
    adminName: 'Sarah Admin',
    description: 'Published DSA SMART START A1 course',
    timestamp: '2025-07-01T10:00:00Z'
  },
  {
    id: 'audit-002',
    action: 'pricing_updated',
    entityType: 'course',
    entityId: 'a1',
    adminId: 'admin-001',
    adminName: 'Sarah Admin',
    before: { price: 149, discountPrice: null },
    after: { price: 149, discountPrice: 99 },
    description: 'Added discount price €99 for A1 course',
    timestamp: '2025-12-28T09:00:00Z'
  },
  {
    id: 'audit-003',
    action: 'user_paused',
    entityType: 'user',
    entityId: 'student-003',
    adminId: 'admin-001',
    adminName: 'Sarah Admin',
    before: { status: 'active' },
    after: { status: 'paused' },
    description: 'Paused Luca Ferrari account per user request',
    timestamp: '2026-01-05T09:00:00Z'
  },
  {
    id: 'audit-004',
    action: 'video_updated',
    entityType: 'lesson',
    entityId: 'a1-l1',
    adminId: 'admin-001',
    adminName: 'Sarah Admin',
    before: { primaryVideoUrl: 'https://old-url.com' },
    after: { primaryVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    description: 'Updated video link for Unit 1: Subject Pronouns',
    timestamp: '2026-01-10T14:00:00Z'
  }
];

// ---------- ACTIVITIES ----------
export const SEED_ACTIVITIES: Activity[] = [
  {
    id: 'activity-001',
    type: 'lesson_completed',
    userId: 'student-001',
    userName: 'Marco Rossi',
    courseId: 'a1',
    courseName: 'DSA SMART START A1',
    itemId: 'a1-l5',
    itemName: 'Unit 5: Past Simple of Verb TO BE',
    description: 'Marco Rossi completed Unit 5: Past Simple of Verb TO BE',
    timestamp: '2026-01-14T16:45:00Z'
  },
  {
    id: 'activity-002',
    type: 'homework_completed',
    userId: 'student-002',
    userName: 'Giulia Bianchi',
    courseId: 'a2',
    courseName: 'DSA SMART START A2',
    itemId: 'a2-h1',
    itemName: 'Timeline Mapping',
    description: 'Giulia Bianchi completed Timeline Mapping homework',
    timestamp: '2026-01-13T14:20:00Z'
  },
  {
    id: 'activity-003',
    type: 'course_enrolled',
    userId: 'student-002',
    userName: 'Giulia Bianchi',
    courseId: 'a2',
    courseName: 'DSA SMART START A2',
    description: 'Giulia Bianchi enrolled in DSA SMART START A2',
    timestamp: '2025-12-16T09:00:00Z'
  },
  {
    id: 'activity-004',
    type: 'admin_edit',
    adminId: 'admin-001',
    adminName: 'Sarah Admin',
    courseId: 'a1',
    courseName: 'DSA SMART START A1',
    description: 'Sarah Admin updated video link for Unit 1',
    timestamp: '2026-01-10T14:00:00Z'
  },
  {
    id: 'activity-005',
    type: 'course_completed',
    userId: 'student-002',
    userName: 'Giulia Bianchi',
    courseId: 'a1',
    courseName: 'DSA SMART START A1',
    description: 'Giulia Bianchi completed DSA SMART START A1 course',
    timestamp: '2025-12-15T16:00:00Z'
  }
];

// ---------- PROGRESS RECORDS ----------
// Format: userId_itemId
export const SEED_PROGRESS: Record<string, boolean> = {
  // Marco (student-001) - A1 progress (about 40%)
  'student-001_a1-l1': true,
  'student-001_a1-l2': true,
  'student-001_a1-l3': true,
  'student-001_a1-l4': true,
  'student-001_a1-l5': true,
  'student-001_a1-h1': true,
  'student-001_a1-h2': true,
  
  // Giulia (student-002) - A1 complete, A2 partial
  'student-002_a1-l1': true,
  'student-002_a1-l2': true,
  'student-002_a1-l3': true,
  'student-002_a1-l4': true,
  'student-002_a1-l5': true,
  'student-002_a1-l6': true,
  'student-002_a1-l7': true,
  'student-002_a1-l8': true,
  'student-002_a1-l9': true,
  'student-002_a1-l10': true,
  'student-002_a1-l11': true,
  'student-002_a1-l12': true,
  'student-002_a1-l13': true,
  'student-002_a1-l14': true,
  'student-002_a1-l15': true,
  'student-002_a1-h1': true,
  'student-002_a1-h2': true,
  'student-002_a1-h3': true,
  // A2 progress
  'student-002_a2-l1': true,
  'student-002_a2-l2': true,
  'student-002_a2-l3': true,
  'student-002_a2-h1': true,
  
  // Luca (student-003) - A1 minimal progress (paused)
  'student-003_a1-l1': true,
  'student-003_a1-l2': true,
};
