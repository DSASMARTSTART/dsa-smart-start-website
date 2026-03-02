import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Download, FileText, CheckCircle2, Star, ShoppingCart, Check, ArrowRight, Layers, TrendingUp, Award, Music, Play, Clock, Shield, RefreshCcw, Sparkles, Target, GraduationCap, ChevronRight, ChevronDown, Heart, BadgeCheck, UserCheck, Rocket, Lock, FileCheck } from 'lucide-react';
import { coursesApi } from '../data/supabaseStore';
import { Course } from '../types';

// Level colors and configs for e-books
const LEVEL_CONFIG: Record<string, { color: string; bgColor: string; label: string; icon: React.ReactNode }> = {
  'A1': { color: 'from-blue-500 to-indigo-600', bgColor: 'bg-blue-500', label: 'Beginner', icon: <Layers size={20} /> },
  'A2': { color: 'from-indigo-500 to-purple-600', bgColor: 'bg-indigo-500', label: 'Elementary', icon: <TrendingUp size={20} /> },
  'B1': { color: 'from-purple-600 to-pink-600', bgColor: 'bg-purple-600', label: 'Intermediate', icon: <Award size={20} /> },
  'B2': { color: 'from-blue-600 to-cyan-500', bgColor: 'bg-blue-600', label: 'Upper-Intermediate', icon: <Award size={20} /> },
  'kids-basic': { color: 'from-pink-400 to-rose-500', bgColor: 'bg-pink-500', label: 'Kids Basic', icon: <Music size={20} /> },
  'kids-medium': { color: 'from-orange-400 to-pink-400', bgColor: 'bg-orange-500', label: 'Kids Medium', icon: <Play size={20} /> },
  'kids-advanced': { color: 'from-purple-400 to-pink-500', bgColor: 'bg-purple-500', label: 'Kids Advanced', icon: <Star size={20} /> },
};

// ============================================
// E-BOOK CONTENT DATA - Full Info Per Level
// ============================================

interface EbookContentData {
  description: string;
  learningOutcomes: string[];
  whatYoullFind: string[];
  targetAudience: string[];
  units: { title: string; topics: string[] }[];
  examPrep?: string;
}

const EBOOK_CONTENT: Record<string, EbookContentData> = {
  'A1': {
    description: "Start your English journey with our interactive A1 Beginner E-book, featuring visual brain maps and structured practice designed for complete beginners.",
    learningOutcomes: [
      "Master basic tenses.",
      "Develop simple conversation skills.",
      "Express past events and talk about your preferences in everyday situations.",
      "Spell words and build basic reading and writing skills with confidence."
    ],
    whatYoullFind: [
      "Illustrated e-books",
      "Creative writing prompts with structured templates",
      "Vocabulary-building games",
      "Grammar introduced through practical examples",
      "A progress quiz at the end of each unit"
    ],
    targetAudience: [
      "Students aged 9 and up"
    ],
    examPrep: "Cambridge English A1 Movers",
    units: [
      { title: "Subject Pronouns and the Verb To Be", topics: [] },
      { title: "There Is / There Are and Numbers", topics: [] },
      { title: "Possessive Adjectives and Possessive Pronouns", topics: [] },
      { title: "Possessive Genitive ('S)", topics: [] },
      { title: "Demonstratives", topics: [] },
      { title: "Past Simple of the Verb To Be", topics: [] },
      { title: "Present Simple (Action Verbs)", topics: [] },
      { title: "Past Simple (Action Verbs)", topics: [] },
      { title: "Imperatives", topics: [] },
      { title: "Future with Will", topics: [] },
      { title: "Modal Verbs: Can and Could", topics: [] },
      { title: "Object Pronouns", topics: [] },
      { title: "Have and Have Got", topics: [] },
      { title: "Prepositions of Time and Place", topics: [] },
      { title: "Present Continuous", topics: [] }
    ]
  },
  'A2': {
    description: "Continue building your English with our structured A2 E-book, designed to strengthen grammar foundations, expand vocabulary, and develop real-life communication skills with clarity and confidence.",
    learningOutcomes: [
      "Use a wider range of tenses with greater accuracy.",
      "Communicate confidently in everyday situations.",
      "Describe past experiences and future plans clearly.",
      "Improve your reading, writing, listening, and speaking skills with structured support."
    ],
    whatYoullFind: [
      "Illustrated e-books",
      "Creative writing prompts with structured templates",
      "Vocabulary-building games",
      "Grammar introduced through practical examples",
      "A progress quiz at the end of each unit"
    ],
    targetAudience: [
      "Students aged 9 and up"
    ],
    examPrep: "Cambridge English A2 Key (KET)",
    units: [
      { title: "Present Simple vs Present Continuous", topics: [] },
      { title: "Past Continuous", topics: [] },
      { title: "Past Continuous vs Past Simple", topics: [] },
      { title: "Adverbs and Prepositions of Time and Place", topics: [] },
      { title: "Countable and Uncountable Nouns", topics: [] },
      { title: "Some, Any, A Lot of", topics: [] },
      { title: "Much, Many, A Lot of, A Little, A Few", topics: [] },
      { title: "Comparative and Superlative Adjectives", topics: [] },
      { title: "Modal Verbs: May and Might", topics: [] },
      { title: "Modal Verbs: Should, Must, Have To", topics: [] },
      { title: "Verb Patterns", topics: [] },
      { title: "Future Forms: Will, Be Going To, Present Continuous", topics: [] },
      { title: "Present Perfect Simple", topics: [] },
      { title: "Present Perfect Simple vs Past Simple", topics: [] },
      { title: "Zero and First Conditional", topics: [] }
    ]
  },
  'B1': {
    description: "Strengthen your English with our structured B1 Intermediate E-book, designed to help you communicate fluently, think in English, and confidently manage real-life and professional situations.",
    learningOutcomes: [
      "Use advanced grammar structures with confidence.",
      "Express opinions, ideas, and arguments clearly.",
      "Describe past experiences, present situations, and future plans in detail.",
      "Communicate effectively in academic, social, and professional contexts."
    ],
    whatYoullFind: [
      "Illustrated e-books",
      "Creative writing prompts with structured templates",
      "Vocabulary-building games",
      "Grammar introduced through practical examples",
      "A progress quiz at the end of each unit"
    ],
    targetAudience: [
      "Students aged 12 and up"
    ],
    examPrep: "Cambridge English B1 Preliminary (PET)",
    units: [
      { title: "Present Perfect Continuous", topics: [] },
      { title: "Present Perfect Simple vs Present Perfect Continuous", topics: [] },
      { title: "Past Perfect Simple", topics: [] },
      { title: "Future Continuous", topics: [] },
      { title: "Passive Voice", topics: [] },
      { title: "Causative Forms", topics: [] },
      { title: "Modal Verbs: Ought To, Shall, Be Able To, Manage To", topics: [] },
      { title: "Modal Verbs of Deduction (Present)", topics: [] },
      { title: "Modal Verbs of Deduction (Past)", topics: [] },
      { title: "Reported Speech", topics: [] },
      { title: "Indirect Questions", topics: [] },
      { title: "Second and Third Conditional", topics: [] },
      { title: "Relative Pronouns and Relative Clauses", topics: [] },
      { title: "Question Tags", topics: [] },
      { title: "Comparative Adjectives", topics: [] }
    ]
  },
  'B2': {
    description: "The Eduway Level B2 volume represents the culmination of our structured learning pathway, designed for students with Specific Learning Disabilities (SLD) who are ready to achieve upper-intermediate proficiency. This advanced level focuses on nuanced language use, academic English, and sophisticated communication strategies that prepare learners for professional and educational contexts.",
    learningOutcomes: [
      "Master all conditional forms including mixed conditionals",
      "Use advanced passive structures and causative forms",
      "Express hypothetical situations with ease",
      "Understand and produce complex relative clauses",
      "Navigate formal and informal registers appropriately",
      "Prepare for Cambridge B2 First (FCE) examination"
    ],
    whatYoullFind: [
      "Advanced grammar explanations with visual support",
      "Academic vocabulary building exercises",
      "Complex text comprehension strategies",
      "Advanced writing techniques and templates",
      "Highly legible fonts and structured layouts",
      "Integrated digital materials including exam practice"
    ],
    targetAudience: [
      "Students aged 12 and up at upper-intermediate level",
      "Learners preparing for Cambridge B2 First (FCE)",
      "Those seeking academic or professional English skills",
      "Anyone ready for near-fluency communication"
    ],
    examPrep: "Cambridge English B2 First (FCE)",
    units: [
      { title: "Mixed Conditionals", topics: ["Third + second conditional mix", "Second + third conditional mix", "Hypothetical past with present result"] },
      { title: "Advanced Passive Voice", topics: ["Passive with modals", "Passive reporting verbs", "Have/Get something done"] },
      { title: "Inversion", topics: ["Negative adverbials", "Only + time expressions", "Formal emphasis"] },
      { title: "Cleft Sentences", topics: ["It clefts", "What clefts", "All clefts"] },
      { title: "Advanced Relative Clauses", topics: ["Reduced relatives", "Preposition placement", "Relative clause position"] },
      { title: "Subjunctive Mood", topics: ["Wish + past perfect", "If only structures", "It's time + past"] },
      { title: "Discourse Markers", topics: ["Linking expressions", "Hedging language", "Emphasis markers"] },
      { title: "Reported Speech Advanced", topics: ["Reporting verbs patterns", "Questions in reported speech", "Mixed tense reports"] },
      { title: "Advanced Modal Verbs", topics: ["Modal perfects", "Degrees of certainty", "Speculating about past"] },
      { title: "Participle Clauses", topics: ["Present participle clauses", "Past participle clauses", "Perfect participle clauses"] },
      { title: "Noun Clauses", topics: ["Subject clauses", "Object clauses", "Complement clauses"] },
      { title: "Advanced Comparisons", topics: ["Double comparatives", "Comparative idioms", "Superlative emphasis"] },
      { title: "Formal vs Informal Register", topics: ["Academic vocabulary", "Colloquial expressions", "Register shifting"] },
      { title: "Cohesion & Coherence", topics: ["Reference words", "Substitution", "Ellipsis"] },
      { title: "Exam Skills", topics: ["Reading strategies", "Writing formats", "Speaking frameworks"] }
    ]
  },
  'kids-basic': {
    description: "The Eduway Kids Basic e-book is specially crafted for young learners aged 5-8 who are just beginning their English adventure. Using a playful, multisensory approach with colorful visuals, songs, and interactive pages, this e-book makes learning English an exciting journey. Every page is designed with dyslexia-friendly techniques to ensure every child can succeed.",
    learningOutcomes: [
      "Recognize and use basic greetings and introductions",
      "Identify colors, numbers 1-20, and common shapes",
      "Name family members, pets, and classroom objects",
      "Follow simple instructions in English",
      "Sing along to English songs and rhymes",
      "Build confidence in speaking first English words"
    ],
    whatYoullFind: [
      "Illustrated e-books",
      "Creative writing prompts with structured templates",
      "Vocabulary-building games",
      "Grammar introduced through practical examples",
      "A progress quiz at the end of each unit"
    ],
    targetAudience: [
      "Children aged 5-8 starting English",
      "Young learners with learning differences",
      "Kids who learn best through play and visuals",
      "Parents seeking dyslexia-friendly English for children"
    ],
    examPrep: "Cambridge English A1 Starters",
    units: [
      { title: "Subject Pronouns and Verb To Be (Affirmative Form)", topics: [] },
      { title: "Verb To Be (Negative and Question Forms)", topics: [] },
      { title: "Possessive Adjectives and Possessive 'S", topics: [] },
      { title: "Demonstratives (This, That, These, Those)", topics: [] },
      { title: "Question Words (Wh- Questions)", topics: [] },
      { title: 'Modal Verb "Can"', topics: [] },
      { title: "There Is / There Are", topics: [] },
      { title: "Plural Nouns (Regular and Irregular) and Numbers", topics: [] },
      { title: "Present Simple (Affirmative and Negative Forms)", topics: [] },
      { title: "Present Simple (Question Form and Short Answers)", topics: [] },
      { title: "Past Simple of the Verb To Be (Affirmative and Negative Forms)", topics: [] },
      { title: "Past Simple of the Verb To Be (Question Form)", topics: [] },
      { title: "Past Simple (Regular Verbs)", topics: [] },
      { title: "Future with Will (Affirmative and Negative Forms)", topics: [] },
      { title: "Future with Will (Question Form)", topics: [] }
    ]
  },
  'kids-medium': {
    description: "The Eduway Kids Medium e-book builds on the basics, designed for young learners aged 7-10 who are ready to expand their English skills. Through story-based learning, creative activities, and interactive exercises, children develop reading, writing, and speaking confidence. Every page incorporates dyslexia-friendly methods to support all learning styles.",
    learningOutcomes: [
      "Read and understand simple English stories",
      "Write short sentences about familiar topics",
      "Ask and answer simple questions",
      "Describe people, places, and things",
      "Use present simple for daily routines",
      "Expand vocabulary to 500+ words"
    ],
    whatYoullFind: [
      "Illustrated e-books",
      "Creative writing prompts with structured templates",
      "Vocabulary-building games",
      "Grammar introduced through practical examples",
      "A progress quiz at the end of each unit"
    ],
    targetAudience: [
      "Children aged 7-10 with basic English",
      "Young learners progressing from basic level",
      "Kids who enjoy stories and creative activities",
      "Students preparing for Cambridge A1 Movers"
    ],
    examPrep: "Cambridge English A1 Movers",
    units: [
      { title: "Present Continuous (Affirmative, Negative, Question Form)", topics: [] },
      { title: "Present Continuous vs Present Simple", topics: [] },
      { title: "Modals: Can & Could", topics: [] },
      { title: "Countable & Uncountable Nouns (Much / Many)", topics: [] },
      { title: "Quantifiers (Some / Any / A lot of)", topics: [] },
      { title: "Past Simple – Regular Verbs", topics: [] },
      { title: "Past Simple – Irregular Verbs (Affirmative Form)", topics: [] },
      { title: "Past Simple – Irregular Verbs (Negative & Question Form)", topics: [] },
      { title: "Modal Verbs: Have to & Must", topics: [] },
      { title: "Modal Verb: Should", topics: [] },
      { title: "Comparatives", topics: [] },
      { title: "Superlatives", topics: [] },
      { title: "Past Continuous – Affirmative Form", topics: [] },
      { title: "Past Continuous – Negative & Question Form", topics: [] },
      { title: "Imperatives", topics: [] }
    ]
  },
  'kids-advanced': {
    description: "The Eduway Kids Advanced e-book is designed for confident young learners aged 9-12 who are ready to master English at a higher level. This comprehensive guide prepares students for school English requirements and Cambridge A2 Flyers exam. Complex grammar is taught through engaging contexts, and creative expression is encouraged throughout.",
    learningOutcomes: [
      "Read and comprehend longer, more complex texts",
      "Write paragraphs and short compositions",
      "Use past simple and past continuous confidently",
      "Form and use present perfect tense",
      "Understand and create first conditional sentences",
      "Achieve vocabulary of 1000+ words"
    ],
    whatYoullFind: [
      "Illustrated e-books",
      "Creative writing prompts with structured templates",
      "Vocabulary-building games",
      "Grammar introduced through practical examples",
      "A progress quiz at the end of each unit"
    ],
    targetAudience: [
      "Children aged 9-12 at intermediate level",
      "Students preparing for Cambridge A2 Flyers",
      "Kids transitioning to secondary school English",
      "Young learners ready for advanced challenges"
    ],
    examPrep: "Cambridge English A2 Flyers",
    units: [
      { title: "Past Simple vs Past Continuous", topics: [] },
      { title: "Modal Verbs: May, Might, Shall", topics: [] },
      { title: "Future with Will", topics: [] },
      { title: "Future with Be Going To", topics: [] },
      { title: "Will vs Be Going To", topics: [] },
      { title: "Present Perfect Simple (Affirmative Form)", topics: [] },
      { title: "Present Perfect Simple (Negative and Question Forms)", topics: [] },
      { title: "Present Perfect Simple with Common Adverbs & Expressions", topics: [] },
      { title: "Comparatives", topics: [] },
      { title: "Possessive Pronouns", topics: [] },
      { title: "Preference Verbs + -ing", topics: [] },
      { title: "Adverbs Ending in -ly", topics: [] },
      { title: "First Conditional", topics: [] },
      { title: "Second Conditional", topics: [] },
      { title: "First Conditional vs Second Conditional", topics: [] }
    ]
  }
};

interface EbookDetailPageProps {
  courseId: string;
  onBack: () => void;
  onEnroll: (id: string) => void;
  onAddToCart: (id: string) => void;
  isInCart: boolean;
  isAddingToCart?: boolean;
}

const EbookDetailPage: React.FC<EbookDetailPageProps> = ({ 
  courseId, 
  onBack, 
  onEnroll, 
  onAddToCart, 
  isInCart,
  isAddingToCart = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const data = await coursesApi.getById(courseId);
        setCourse(data);
      } catch (error) {
        console.error('Failed to load e-book:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCourse();
  }, [courseId]);

  // Particle canvas animation (matching CourseSyllabusPage)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; size: number; speedX: number; speedY: number; opacity: number }[] = [];
    const particleCount = 30;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.4 + 0.1,
      }));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) p.y = 0;
        if (p.y < 0) p.y = canvas.height;
        ctx.fillStyle = `rgba(168, 85, 247, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">Loading e-book details...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
            <FileText size={32} className="text-gray-500" />
          </div>
          <h3 className="text-2xl font-black text-white mb-4">E-book Not Found</h3>
          <p className="text-gray-400 mb-8">The e-book you're looking for doesn't exist or has been removed.</p>
          <button onClick={onBack} className="px-8 py-4 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const config = LEVEL_CONFIG[course.level] || { 
    color: 'from-[#AB8FFF] to-purple-600', 
    bgColor: 'bg-[#AB8FFF]', 
    label: course.level,
    icon: <BookOpen size={20} />
  };
  
  const price = course.pricing?.discountPrice ?? course.pricing?.price ?? 0;
  const originalPrice = course.pricing?.discountPrice ? course.pricing.price : null;
  const hasDiscount = originalPrice && originalPrice > price;
  const pricing = course.pricing || { price: 0, currency: 'EUR', isFree: false };
  const displayPrice = pricing.isFree ? 'FREE' : `€${price}`;

  // Coming Soon: only B2 ebook is "coming soon" (no PDF yet)
  const isComingSoon = course.productType === 'ebook' && course.level === 'B2' && !course.ebookPdfUrl;
  
  // Content lookup: syllabusContent > hardcoded EBOOK_CONTENT > generic
  const hardcodedContent = EBOOK_CONTENT[course.level];
  const syllabusContent = course.syllabusContent;

  // Description
  const ebookDescription = course.description || hardcodedContent?.description || `Comprehensive PDF guide designed for the dyslexic mind. Visual, multisensory learning approach with ${config.label} content.`;

  // Learning outcomes
  let outcomes: string[] = [];
  if (syllabusContent?.learningOutcomes && syllabusContent.learningOutcomes.length > 0) {
    outcomes = syllabusContent.learningOutcomes;
  } else if (course.learningOutcomes && course.learningOutcomes.length > 0) {
    outcomes = course.learningOutcomes;
  } else if (hardcodedContent?.learningOutcomes) {
    outcomes = hardcodedContent.learningOutcomes;
  }
  if (outcomes.length === 0) {
    outcomes = [
      'Master essential vocabulary through visual memory techniques',
      'Build confidence reading in real-life situations',
      'Develop comprehension with dyslexia-friendly methods',
      'Track your progress with self-assessment exercises'
    ];
  }

  // What you'll find
  let whatYoullFind: string[] = [];
  if (syllabusContent?.whatYoullFind && syllabusContent.whatYoullFind.length > 0) {
    whatYoullFind = syllabusContent.whatYoullFind;
  } else if (hardcodedContent?.whatYoullFind) {
    whatYoullFind = hardcodedContent.whatYoullFind;
  } else if (course.prerequisites && course.prerequisites.length > 0) {
    whatYoullFind = course.prerequisites;
  }
  if (whatYoullFind.length === 0) {
    whatYoullFind = [
      'Comprehensive PDF guide',
      'Visual learning approach',
      'Practice exercises included',
      'Dyslexia-friendly formatting',
      'Instant download access',
      'Compatible with all devices'
    ];
  }

  // Target audience
  let targetAudiencePoints: string[] = [];
  if (syllabusContent?.targetAudience && syllabusContent.targetAudience.length > 0) {
    targetAudiencePoints = syllabusContent.targetAudience;
  } else if (course.targetAudienceInfo && course.targetAudienceInfo.points && course.targetAudienceInfo.points.length > 0) {
    targetAudiencePoints = course.targetAudienceInfo.points;
  } else if (hardcodedContent?.targetAudience) {
    targetAudiencePoints = hardcodedContent.targetAudience;
  } else {
    targetAudiencePoints = [
      'Visual learners who struggle with traditional textbooks',
      'Students with dyslexia or learning differences',
      'Parents supporting their children\'s learning',
      'Anyone who wants a supportive, judgment-free approach'
    ];
  }
  const targetAudience = {
    description: course.targetAudienceInfo?.description || `Perfect for ${config.label.toLowerCase()} learners who want to build a strong foundation`,
    points: targetAudiencePoints
  };

  // Units
  const units = (syllabusContent?.units && syllabusContent.units.length > 0)
    ? syllabusContent.units 
    : (hardcodedContent?.units || []);

  // Exam prep
  const examPrep = hardcodedContent?.examPrep;

  // Check for active discount
  const now = new Date();
  const hasActiveDiscount = hasDiscount && 
    (!pricing.discountStartDate || new Date(pricing.discountStartDate) <= now) &&
    (!pricing.discountEndDate || new Date(pricing.discountEndDate) >= now);

  return (
    <div className="bg-black min-h-screen">
      {/* ============================================ */}
      {/* HERO SECTION                                 */}
      {/* ============================================ */}
      <div className="relative w-full min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-black">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FFC1F2] rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#AB8FFF] rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-pulse-slow delay-1000"></div>
          <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-32 pb-20">
          {/* Back Button */}
          <button 
            onClick={onBack}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#AB8FFF] transition-colors mb-12"
          >
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#AB8FFF]/30 group-hover:shadow-md transition-all">
              <ArrowLeft size={16} />
            </div>
            Back to Products
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: E-book Info */}
            <div className="space-y-8 animate-reveal">
              {/* Level Badge */}
              <div className="inline-flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white shadow-lg`}>
                  {config.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#AB8FFF]">Digital E-book</span>
                  <span className="text-sm font-bold text-gray-300">{config.label}</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[0.9] tracking-tight">
                {course.title.split(' ').map((word, i) => (
                  <React.Fragment key={i}>
                    {i === 0 ? (
                      <span className="relative inline-block text-[#AB8FFF]">
                        {word}
                        <svg className="absolute w-full h-3 -bottom-1 left-0 text-[#FFC1F2]" viewBox="0 0 100 10" preserveAspectRatio="none">
                          <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                        </svg>
                      </span>
                    ) : (
                      <span className="text-white">{word}</span>
                    )}
                    {' '}
                  </React.Fragment>
                ))}
              </h1>

              {/* Description */}
              <p className="text-lg sm:text-xl font-medium text-gray-400 leading-relaxed max-w-xl">
                {ebookDescription}
              </p>

              {/* Cambridge Exam Prep Badge */}
              {examPrep && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full border border-green-500/30">
                  <GraduationCap size={16} className="text-green-400" />
                  <span className="text-xs font-bold text-green-400">Prepares for {examPrep}</span>
                </div>
              )}

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                    <Download size={20} className="text-[#AB8FFF]" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">Instant</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Download</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center">
                    <FileText size={20} className="text-pink-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">PDF</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Format</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                    <Shield size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">Lifetime</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Access</p>
                  </div>
                </div>
              </div>

              {/* Price & CTA */}
              <div className="flex flex-wrap items-center gap-6 pt-4">
                {isComingSoon ? (
                  <div className="flex flex-col gap-4">
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#AB8FFF]/20 to-pink-500/20 rounded-full border border-[#AB8FFF]/30 animate-pulse">
                      <Clock size={18} className="text-[#AB8FFF]" />
                      <span className="text-lg font-black text-[#AB8FFF] uppercase tracking-widest">Coming Soon!</span>
                    </div>
                    <p className="text-gray-400 text-sm font-medium">This e-book is currently being prepared. Check back soon!</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      {hasActiveDiscount && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full w-fit animate-pulse">
                          <Sparkles size={14} className="text-white" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">Limited Time Offer</span>
                        </div>
                      )}
                      <div className="flex items-baseline gap-3">
                        <span className="text-4xl sm:text-5xl font-black text-white">{displayPrice}</span>
                        {hasDiscount && originalPrice && (
                          <span className="text-xl font-bold text-gray-500 line-through decoration-pink-500">€{originalPrice}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => {
                          onAddToCart(course.id);
                          window.location.hash = '#checkout';
                        }}
                        className="group flex items-center gap-3 bg-[#AB8FFF] text-white px-8 py-4 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-[#9a7eef] transition-all shadow-xl shadow-purple-500/30 hover:-translate-y-1 hover:shadow-[#AB8FFF]/25"
                      >
                        Buy Now
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                      <button
                        onClick={() => onAddToCart(course.id)}
                        disabled={isAddingToCart}
                        className={`flex items-center gap-2 px-6 py-4 rounded-full font-black text-[11px] uppercase tracking-widest border transition-all ${
                          isInCart
                            ? 'bg-green-500/20 border-green-500/30 text-green-400'
                            : isAddingToCart
                              ? 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:border-[#AB8FFF]/50 hover:text-[#AB8FFF]'
                        }`}
                      >
                        {isAddingToCart ? (
                          <div className="w-4 h-4 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin" />
                        ) : isInCart ? <Check size={16} /> : <ShoppingCart size={16} />}
                        {isAddingToCart ? 'Adding...' : isInCart ? 'Added' : 'Add to Cart'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right: E-book Video & Card */}
            <div className="relative animate-reveal stagger-1">
              <div className="relative bg-white/5 rounded-[3rem] p-6 border border-white/10 shadow-2xl shadow-purple-500/10">
                {/* Vimeo Video */}
                <div className="relative aspect-video rounded-3xl overflow-hidden mb-4 bg-black">
                  <iframe
                    src={(() => {
                      const vimeoMap: Record<string, string> = {
                        'A1': 'https://player.vimeo.com/video/76979871',
                        'A2': 'https://player.vimeo.com/video/76979872',
                        'B1': 'https://player.vimeo.com/video/76979873',
                        'B2': 'https://player.vimeo.com/video/76979874',
                        'kids-basic': 'https://player.vimeo.com/video/76979875',
                        'kids-medium': 'https://player.vimeo.com/video/76979876',
                        'kids-advanced': 'https://player.vimeo.com/video/76979877',
                      };
                      return vimeoMap[course.level] || 'https://player.vimeo.com/video/76979871';
                    })()}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title={`${course.title} preview`}
                  />
                </div>
                <p className="text-sm text-gray-400 text-center mb-4 font-medium">
                  {course.level.startsWith('kids')
                    ? "Watch our video and discover how your child can finally learn English with clarity, confidence, and the right method."
                    : "Watch our video and discover how you can finally learn English with clarity, confidence, and the right method."}
                </p>

                {/* Quick highlights */}
                <div className="space-y-3 px-2 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-base font-bold text-gray-300">Lifetime access — download anytime</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-base font-bold text-gray-300">Dyslexia-friendly formatting</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-base font-bold text-gray-300">Works on any device</span>
                  </div>
                </div>

                {/* Bubble Buttons: Add to Cart & Buy Now */}
                {!isComingSoon && (
                  <div className="flex gap-3 px-2 pt-4">
                    <button
                      onClick={() => onAddToCart(course.id)}
                      disabled={isAddingToCart}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full font-black text-[11px] uppercase tracking-widest border transition-all ${
                        isInCart
                          ? 'bg-green-500/20 border-green-500/30 text-green-400'
                          : isAddingToCart
                            ? 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-[#AB8FFF]/50 hover:text-[#AB8FFF]'
                      }`}
                    >
                      {isAddingToCart ? (
                        <div className="w-4 h-4 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin" />
                      ) : isInCart ? <Check size={16} /> : <ShoppingCart size={16} />}
                      {isAddingToCart ? 'Adding...' : isInCart ? 'Added' : 'Add to Cart'}
                    </button>
                    <button
                      onClick={() => {
                        onAddToCart(course.id);
                        window.location.hash = '#checkout';
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#AB8FFF] text-white px-4 py-3 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-[#9a7eef] transition-all shadow-lg shadow-purple-500/30 hover:-translate-y-0.5"
                    >
                      Buy Now
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Decorative floating elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#FFC1F2] rounded-3xl rotate-12 opacity-20 blur-xl"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#AB8FFF] rounded-full opacity-15 blur-2xl"></div>
            </div>
          </div>
        </div>

        {/* Curved transition */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-[50px] sm:h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="fill-black"></path>
          </svg>
        </div>
      </div>



      {/* ============================================ */}
      {/* MAIN DETAIL SECTION (2-Column Layout)        */}
      {/* ============================================ */}
      <section className="pb-32 px-6 relative z-30">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          
          {/* Left: Outcomes & Highlights */}
          <div className="lg:col-span-5 space-y-16 animate-reveal">
            
            {/* ---- What You'll Achieve ---- */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400 border border-purple-500/30">
                  <Target size={28} />
                </div>
                <h3 className="text-3xl font-black text-white tracking-tight uppercase">
                  {course.level.startsWith('kids') ? "What Your Child Will Achieve by the End of the Course" : "What You Will Achieve by the End of the Course"}
                </h3>
              </div>
              <p className="text-gray-400 text-lg mb-8 font-medium">
                {course.level.startsWith('kids')
                  ? "By the end of this course, your child will be able to confidently:"
                  : "By the end of this course, you will be able to:"}
              </p>
              <div className="space-y-4">
                {outcomes.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 bg-white/5 rounded-[2rem] border border-white/10 group hover:bg-white/10 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 transition-all">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="text-green-400" size={18} />
                    </div>
                    <span className="text-base font-bold text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ---- DSA Smart Start Advantage ---- */}
            <div className="p-10 bg-gradient-to-br from-[#1a1c2d] to-black rounded-[3rem] text-white relative overflow-hidden group border border-white/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/30 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10">
                <Sparkles className="text-purple-400 mb-6" size={32} />
                <h4 className="text-2xl font-black mb-4 uppercase tracking-tight">DSA Smart Start Advantage</h4>
                <p className="text-gray-400 text-sm leading-loose mb-6">
                  Unlike traditional methods, we don't overload students with abstract grammar explanations. We teach students to understand through <span className="text-white italic underline underline-offset-4 decoration-purple-500 decoration-2">visual learning paths</span> and sensory triggers that make English clear, structured, and memorable.
                </p>
                <p className="text-white text-sm font-bold mb-4 uppercase tracking-wide">What makes the difference:</p>
                <div className="space-y-2">
                  {["Visual Mind Mapping", "Multisensory Learning Approach", "Structured Step-by-Step System", "Confidence-Building Method"].map((tag, i) => (
                    <div key={i} className="inline-block px-4 py-2 bg-white/5 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest mr-2 mb-2">{tag}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* ---- What's Included ---- */}
            {whatYoullFind.length > 0 && (
              <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                    <FileCheck size={24} />
                  </div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tight">What's Included</h4>
                </div>
                <div className="space-y-3">
                  {whatYoullFind.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl hover:bg-blue-500/10 transition-colors">
                      <CheckCircle2 size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
                      <span className="text-base font-medium text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---- Who Is This For? ---- */}
            <div className="p-8 bg-gradient-to-br from-purple-500/10 via-white/5 to-pink-500/10 rounded-[3rem] border border-purple-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFC1F2] rounded-full blur-[40px] translate-x-1/2 -translate-y-1/2 opacity-20"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/10 rounded-xl text-[#AB8FFF] shadow-sm border border-white/10">
                    <UserCheck size={24} />
                  </div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tight">Who Is This For?</h4>
                </div>
                <p className="text-gray-400 text-sm mb-6 font-medium">{targetAudience.description}</p>
                <div className="space-y-3">
                  {targetAudience.points.map((point, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-[#AB8FFF] flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-300">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ---- Our Promise ---- */}
            <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 shadow-lg shadow-purple-500/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-500/20 rounded-xl text-green-400">
                  <Shield size={24} />
                </div>
                <h4 className="text-xl font-black text-white uppercase tracking-tight">Our Promise</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                    <RefreshCcw size={20} className="text-green-400" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-white">14-Day</span>
                  <span className="text-[10px] text-gray-400 font-medium">Money Back Guarantee</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
                    <Heart size={20} className="text-purple-400" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-white">Dyslexia</span>
                  <span className="text-[10px] text-gray-400 font-medium">Friendly Design</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                    <BadgeCheck size={20} className="text-amber-400" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-white">Lifetime</span>
                  <span className="text-[10px] text-gray-400 font-medium">Free Updates</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Unit Content + Final CTA */}
          <div className="lg:col-span-7 animate-reveal stagger-1">
            
            {/* ---- Unit Content ---- */}
            <div className="flex items-center gap-3 mb-10">
              <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 border border-indigo-500/30">
                <BookOpen size={28} />
              </div>
              <h3 className="text-3xl font-black text-white tracking-tight uppercase">Unit Content</h3>
            </div>

            {units.length > 0 ? (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm mb-6">
                  {course.level === 'kids-basic' || course.level === 'kids-medium' || course.level === 'kids-advanced'
                    ? <>This course includes <span className="font-bold text-white">{units.length} comprehensive units</span> designed to build structure, clarity, and confidence step by step.</>
                    : <>This course includes <span className="font-bold text-white">{units.length} comprehensive units</span> designed to build structure, clarity, and confidence step by step.</>}
                </p>
                
                {units.map((unit, i) => {
                  const unitId = `unit-${i}`;
                  const isExpanded = expandedModules.has(unitId);
                  
                  return (
                    <div key={i} className="bg-white/5 rounded-[2rem] border border-white/10 shadow-sm hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 overflow-hidden">
                      {/* Unit Header - Clickable */}
                      <button 
                        onClick={() => toggleModule(unitId)}
                        className="w-full p-6 flex items-center justify-between gap-4 text-left hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white font-black text-lg shadow-lg`}>
                            {i + 1}
                          </div>
                          <div>
                            <h5 className="text-lg font-black text-white tracking-tight">{unit.title}</h5>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{(unit.topics || []).length} Topics</span>
                          </div>
                        </div>
                        <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown size={20} className="text-gray-400" />
                        </div>
                      </button>
                      
                      {/* Unit Topics - Expandable */}
                      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        <div className="px-6 pb-6 pt-0">
                          <div className="pl-16 space-y-2">
                            {(unit.topics || []).map((topic, j) => (
                              <div key={j} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                                <span className="text-base font-medium text-gray-300">{topic}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/5 rounded-[3rem] p-12 text-center border border-white/10">
                <BookOpen size={48} className="text-gray-500 mx-auto mb-4" />
                <h4 className="text-xl font-black text-white mb-2">Content Coming Soon</h4>
                <p className="text-gray-400">Detailed unit content is being prepared. Check back soon!</p>
              </div>
            )}

            {/* ---- Vocabulary Topics ---- */}
            {(course.level === 'kids-basic' || course.level === 'kids-medium' || course.level === 'kids-advanced' || course.level === 'A1' || course.level === 'A2' || course.level === 'B1') && (
              <div className="mt-12">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-pink-500/20 rounded-2xl text-pink-400 border border-pink-500/30">
                    <BookOpen size={28} />
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tight uppercase">Vocabulary Topics</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(course.level === 'B1' ? [
                    "Personal identity and life experiences", "Relationships and social life",
                    "Education and career choices", "Work and workplace situations",
                    "Travel and cultural experiences", "Health, lifestyle and well-being",
                    "Technology and digital life", "Media and communication",
                    "Environment and global issues", "Money, consumerism and advertising",
                    "Crime and social problems", "Science and innovation",
                    "Feelings, opinions and personal beliefs", "Future plans and ambitions",
                    "Society and modern challenges"
                  ] : course.level === 'A2' ? [
                    "Daily life and routines", "School and education",
                    "Free time and hobbies", "Places in town",
                    "Travel and transport", "Food and healthy living",
                    "Shopping and money", "Technology and communication",
                    "The natural world and environment", "People and relationships",
                    "Jobs and future plans", "Health and the body",
                    "Entertainment and media", "Describing experiences",
                    "Global topics and society"
                  ] : course.level === 'A1' ? [
                    "Daily routines and responsibilities", "Free time activities and interests",
                    "Places in town", "Directions and giving instructions",
                    "Travel and holidays", "Health and the body",
                    "Shopping and money", "Jobs and professions",
                    "Technology and communication", "The environment",
                    "Festivals and celebrations", "Friendship and relationships",
                    "Sports and competitions", "Future plans and ambitions"
                  ] : course.level === 'kids-advanced' ? [
                    "Daily routines and responsibilities", "Free time activities and interests",
                    "Places in town", "Directions and giving instructions",
                    "Travel and holidays", "Health and the body",
                    "Shopping and money", "Jobs and professions",
                    "Technology and communication", "The environment",
                    "Festivals and celebrations", "School subjects",
                    "Friendship and relationships", "Sports and competitions",
                    "Future plans and ambitions"
                  ] : course.level === 'kids-medium' ? [
                    "Emotions and feelings", "Family", "Daily routines", "School",
                    "Friends & relationships", "Describing your home", "Weather", "Food & drinks",
                    "Numbers", "Days of the week", "Months of the year", "Hobbies and free time",
                    "Sports", "Clothing", "Cities", "Adjectives"
                  ] : [
                    "Emotions and feelings", "Family", "Daily routines", "School",
                    "Home", "Colors", "Nations", "Countries",
                    "Numbers", "Days of the week", "Months of the year", "Hobbies and free time",
                    "Sports", "Clothing", "Cities", "Adjectives"
                  ]).map((topic, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-pink-500/30 transition-all">
                      <CheckCircle2 size={16} className="text-pink-400 flex-shrink-0" />
                      <span className="text-sm font-bold text-gray-300">{topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---- Final CTA Section ---- */}
            <div className="mt-20 p-12 bg-white/5 rounded-[4rem] border border-white/10 text-center animate-reveal relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFC1F2] rounded-full blur-[60px] opacity-15 mix-blend-screen"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#AB8FFF] rounded-full blur-[50px] opacity-20 mix-blend-screen"></div>
              
              <div className="relative z-10">
                {isComingSoon ? (
                  <>
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#AB8FFF]/20 to-pink-500/20 rounded-full border border-[#AB8FFF]/30 mb-6 animate-pulse">
                      <Clock size={18} className="text-[#AB8FFF]" />
                      <span className="text-sm font-black text-[#AB8FFF] uppercase tracking-widest">Coming Soon!</span>
                    </div>
                    <h4 className="text-3xl font-black text-white mb-4 tracking-tight">This E-book Is On Its Way!</h4>
                    <p className="text-gray-400 mb-6 font-medium max-w-lg mx-auto">
                      We're putting the finishing touches on this e-book. Stay tuned — it will be available for purchase soon!
                    </p>
                    <button
                      onClick={onBack}
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-xs font-black uppercase tracking-widest bg-white/5 border border-white/10 text-gray-400 hover:border-[#AB8FFF]/50 hover:text-[#AB8FFF] transition-all"
                    >
                      <ArrowLeft size={16} />
                      Browse Other E-books
                    </button>
                  </>
                ) : (
                  <>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 mb-6">
                  <Rocket size={16} className="text-[#AB8FFF]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Start Your Transformation</span>
                </div>
                <h4 className="text-3xl font-black text-white mb-4 tracking-tight">Ready to Start Learning?</h4>
                <p className="text-gray-400 mb-10 font-medium max-w-lg mx-auto">
                  Get instant access to this comprehensive e-book and begin your English learning journey today. Designed for the way your brain works best.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button 
                    onClick={() => {
                      onAddToCart(course.id);
                      window.location.hash = '#checkout';
                    }}
                    className={`group flex items-center justify-center gap-3 px-10 py-5 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all bg-gradient-to-r ${config.color}`}
                  >
                    Buy Now — {displayPrice}
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => !isAddingToCart && onAddToCart(course.id)}
                    disabled={isAddingToCart}
                    className={`flex items-center justify-center gap-3 px-8 py-5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                      isInCart 
                        ? 'bg-green-500/10 border-green-500 text-green-400' 
                        : isAddingToCart
                          ? 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:border-purple-500/50 hover:text-purple-400'
                    }`}
                  >
                    {isAddingToCart ? (
                      <><div className="w-4 h-4 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin" /> Adding...</>
                    ) : isInCart ? (
                      <><Check size={18} /> Added to Cart</>
                    ) : (
                      <><ShoppingCart size={18} /> Save for Later</>
                    )}
                  </button>
                </div>
                
                {/* Trust row */}
                <div className="flex flex-wrap items-center justify-center gap-6 mt-10 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold">
                    <Shield size={14} />
                    <span>14-Day Money Back</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold">
                    <Lock size={14} />
                    <span>Secure Checkout</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold">
                    <Download size={14} />
                    <span>Instant Download</span>
                  </div>
                </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EbookDetailPage;
