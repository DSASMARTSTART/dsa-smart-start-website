
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Star, Clock, Sparkles, BookOpen, Target, GraduationCap, ChevronRight, ChevronDown, Zap, Lock, ShoppingCart, Check, Rocket, Shield, FileText, Play, Users, Layers, Award, TrendingUp, Crown, Diamond, Video, Brain, Headphones, FileCheck, MessageCircle, Flame, BadgeCheck, Heart, RefreshCcw, UserCheck } from 'lucide-react';
import { coursesApi } from '../data/supabaseStore';
import { Course, Module } from '../types';

// Level colors and configs
const LEVEL_CONFIG: Record<string, { color: string; bgColor: string; label: string; icon: React.ReactNode }> = {
  'A1': { color: 'from-blue-500 to-indigo-600', bgColor: 'bg-blue-500', label: 'Beginner', icon: <Layers size={20} /> },
  'A2': { color: 'from-indigo-500 to-purple-600', bgColor: 'bg-indigo-500', label: 'Elementary', icon: <TrendingUp size={20} /> },
  'B1': { color: 'from-purple-600 to-pink-600', bgColor: 'bg-purple-600', label: 'Intermediate', icon: <Award size={20} /> },
  'Kids': { color: 'from-pink-400 to-rose-500', bgColor: 'bg-pink-500', label: 'Advanced Young Learners', icon: <Star size={20} /> },
  'Premium': { color: 'from-violet-600 to-purple-700', bgColor: 'bg-violet-600', label: 'Premium Pathway', icon: <Crown size={20} /> },
  'Gold': { color: 'from-amber-500 to-yellow-600', bgColor: 'bg-amber-500', label: 'Gold Pathway', icon: <Diamond size={20} /> }
};

// ============================================
// COURSE CONTENT DATA - Full Syllabus Info
// ============================================

interface CourseContentData {
  description: string;
  learningOutcomes: string[];
  whatYoullFind: string[];
  targetAudience: string[];
  units: { title: string; topics: string[] }[];
  examPrep?: string;
}

const COURSE_CONTENT: Record<string, CourseContentData> = {
  'A1': {
    description: "The DSA Smart Start Level A1 volume is designed to guide students with Specific Learning Disabilities (SLD) in their first steps in learning English. Thanks to a visual, multisensory, and inclusive approach, each teaching unit is designed to facilitate comprehension, memorization, and active use of the language, making the learning experience accessible and motivating.",
    learningOutcomes: [
      "Master subject pronouns and the verb TO BE in all forms",
      "Form questions and negatives with confidence",
      "Use present simple and present continuous correctly",
      "Express past events using regular and irregular verbs",
      "Understand and use modal verbs CAN, COULD, and WILL"
    ],
    whatYoullFind: [
      "Guided exercises and simple explanations",
      "Illustrations and symbols to support understanding",
      "Practical activities to reinforce learning",
      "Spaces dedicated to metacognitive reflection",
      "Worksheets with highly legible fonts",
      "Access to additional digital materials (audio and video)"
    ],
    targetAudience: [
      "Students aged 8 and up starting their English journey",
      "Parents supporting their children's learning",
      "Support teachers and learning tutors",
      "Anyone who wants to learn English in a visual, gradual way"
    ],
    examPrep: "Cambridge English A1 Movers",
    units: [
      { title: "Subject Pronouns & Verb TO BE", topics: ["Affirmative form", "Negative form", "Question form"] },
      { title: "Plural Nouns", topics: ["Regular plurals", "Irregular plurals"] },
      { title: "Past Simple - Verb TO BE", topics: ["Affirmative form", "Negative form", "Question form"] },
      { title: "Saxon Genitive", topics: ["Possessive 's", "Question word 'whose'"] },
      { title: "Demonstratives", topics: ["This, that", "These, those"] },
      { title: "There Is / There Are", topics: ["Affirmative form", "Negative form", "Question form"] },
      { title: "Present Simple", topics: ["Affirmative, negative, question forms", "Adverbs of frequency"] },
      { title: "Past Simple - Regular & Irregular", topics: ["Affirmative form", "Negative form", "Question form", "Past time expressions"] },
      { title: "Imperative Forms", topics: ["Giving commands", "Instructions"] },
      { title: "Modal Verb WILL", topics: ["Affirmative form", "Negative form", "Question form"] },
      { title: "Modal Verbs CAN & COULD", topics: ["Present ability", "Past ability"] },
      { title: "Object Pronouns", topics: ["Me, you, him, her, it, us, them"] },
      { title: "Have & Have Got", topics: ["Affirmative form", "Negative form", "Question form"] },
      { title: "Prepositions", topics: ["Prepositions of time", "Prepositions of place"] },
      { title: "Present Continuous", topics: ["Affirmative form", "Negative form", "Question form"] }
    ]
  },
  'A2': {
    description: "The DSA Smart Start Level A2 volume is designed to accompany students with Specific Learning Disabilities (SLD) in consolidating acquired language skills and introducing more complex grammatical structures. Through a visual, multisensory, and inclusive approach, each teaching unit is structured to facilitate comprehension, memorization, and active use of the language, making the study experience accessible and motivating.",
    learningOutcomes: [
      "Distinguish between present simple and present continuous",
      "Use past continuous to describe ongoing past actions",
      "Master comparative and superlative adjectives",
      "Express possibility with modal verbs may and might",
      "Form and use the present perfect tense",
      "Create conditional sentences (zero and first conditional)"
    ],
    whatYoullFind: [
      "Guided exercises and detailed explanations",
      "Illustrations and symbols to support understanding",
      "Practical activities to reinforce learning",
      "Spaces dedicated to metacognitive reflection",
      "Worksheets with highly legible fonts",
      "Access to additional digital materials (audio and video)"
    ],
    targetAudience: [
      "Students aged 9 and up building on their English foundation",
      "Learners preparing for Cambridge A2 Key (KET) exam",
      "Parents and support teachers",
      "Anyone wanting a structured, gradual approach to English"
    ],
    examPrep: "Cambridge English A2 Key (KET)",
    units: [
      { title: "Present Simple vs Present Continuous", topics: ["Affirmative form", "Negative form", "Question form"] },
      { title: "Past Continuous", topics: ["Affirmative form", "Negative form", "Question form"] },
      { title: "Past Continuous vs Past Simple", topics: ["When to use each", "Combining tenses"] },
      { title: "Adverbs & Prepositions", topics: ["Prepositions of time", "Prepositions of place", "Prepositions of movement"] },
      { title: "Articles & Nouns", topics: ["Definite and indefinite articles", "Countable nouns", "Uncountable nouns"] },
      { title: "Some, Any & A Lot Of", topics: ["Introduction to quantifiers", "Usage rules"] },
      { title: "Quantifiers", topics: ["Much, many", "A lot of", "A few, a little"] },
      { title: "Comparative & Superlative", topics: ["Comparative adjectives", "Superlative adjectives"] },
      { title: "Modal Verbs: May & Might", topics: ["Expressing possibility", "Making predictions"] },
      { title: "Modal Verbs: Should, Must, Have To", topics: ["Giving advice", "Expressing obligation"] },
      { title: "Verb Patterns", topics: ["Like, want, remember", "Would like"] },
      { title: "Future Forms", topics: ["Will", "Be going to", "Present continuous for future"] },
      { title: "Present Perfect", topics: ["Affirmative form", "Negative form", "Question form"] },
      { title: "Present Perfect vs Past Simple", topics: ["When to use each", "Time expressions"] },
      { title: "Zero & First Conditional", topics: ["Zero conditional", "First conditional", "Using 'unless'"] }
    ]
  },
  'B1': {
    description: "The DSA Smart Start Level B1 volume is designed to accompany students with Specific Learning Disabilities (SLD) through an intermediate stage of English learning, where language becomes a more complex, articulated tool closer to real-world use. This level introduces more advanced grammatical structures and promotes the development of all 4 skills: listening, reading, writing, and speaking.",
    learningOutcomes: [
      "Use present perfect continuous for ongoing situations",
      "Master the past perfect for sequencing events",
      "Form passive voice in present, past, and future",
      "Report what others have said using reported speech",
      "Express deduction with modal verbs must, might, can't",
      "Create second and third conditional sentences"
    ],
    whatYoullFind: [
      "Clear and progressive explanations",
      "Worksheets with visual structure and simplified language",
      "Practical activities and metacognitive reflections",
      "Strategies to improve written and oral comprehension",
      "Highly legible fonts and visual support symbols",
      "Integrated digital materials (audio, video, and interactive exercises)"
    ],
    targetAudience: [
      "Students aged 10 and up at intermediate level",
      "Learners preparing for Cambridge B1 Preliminary (PET)",
      "Support teachers and learning tutors",
      "Anyone seeking autonomous communication in everyday contexts"
    ],
    examPrep: "Cambridge English B1 Preliminary (PET)",
    units: [
      { title: "Present Perfect Continuous", topics: ["Affirmative form", "Negative form", "Question form"] },
      { title: "Present Perfect Simple vs Continuous", topics: ["When to use each", "Duration vs result"] },
      { title: "Past Perfect Simple", topics: ["Affirmative form", "Negative form", "Question form"] },
      { title: "Future Continuous", topics: ["Affirmative form", "Negative form", "Question form"] },
      { title: "Passive Voice", topics: ["Present simple passive", "Past simple passive", "Future simple passive"] },
      { title: "Causative Structures", topics: ["Have something done", "Get something done"] },
      { title: "Modal Verbs Extended", topics: ["Ought to", "Shall", "Be able to", "Manage to"] },
      { title: "Modals of Deduction (1)", topics: ["Can't for impossibility", "Must for certainty"] },
      { title: "Modals of Deduction (2)", topics: ["Must, might, should", "Degrees of certainty"] },
      { title: "Reported Speech", topics: ["Reporting statements", "Tense changes"] },
      { title: "Indirect Questions", topics: ["Forming indirect questions", "Word order"] },
      { title: "Second & Third Conditional", topics: ["Second conditional", "Third conditional", "Mixed conditionals"] },
      { title: "Relative Clauses", topics: ["Relative pronouns", "Defining clauses", "Non-defining clauses"] },
      { title: "Question Tags", topics: ["Forming question tags", "Intonation patterns"] },
      { title: "Advanced Comparatives", topics: ["Comparative structures", "As...as", "The more...the more"] }
    ]
  },
  'Kids': {
    description: "The DSA Smart Start Advanced Level is designed to accompany young learners with learning difficulties step by step in their English language studies. Students can improve gradually, starting from A1 Starters exams, moving through Movers, and reaching A2 Flyers. This Advanced Level completes the program, offering essential content for A2 Flyers exam preparation — the third level of Cambridge English Young Learners, designed for primary and lower secondary school students.",
    learningOutcomes: [
      "Understand and use more complex sentences on familiar topics",
      "Read and listen to short texts, stories, and realistic dialogues in English",
      "Communicate and interact effectively in everyday contexts",
      "Express themselves with more articulate and confident language",
      "Master all conditional forms (first and second)",
      "Use present perfect in various contexts"
    ],
    whatYoullFind: [
      "Age-appropriate explanations with visual support",
      "Interactive activities designed for young learners",
      "Mind maps for visual memorization",
      "Progress tracking with 'Stop & Check' worksheets",
      "Engaging multimedia content",
      "Cambridge A2 Flyers exam preparation materials"
    ],
    targetAudience: [
      "Young learners aged 6-12 with learning differences",
      "Students preparing for Cambridge A2 Flyers",
      "Children who thrive with visual, multisensory learning",
      "Parents seeking dyslexia-friendly English courses for kids"
    ],
    examPrep: "Cambridge English A2 Flyers (Young Learners)",
    units: [
      { title: "Past Simple vs Past Continuous", topics: ["Comparing tenses", "When and while"] },
      { title: "Modal Verbs: May, Might, Shall", topics: ["Expressing possibility", "Making suggestions"] },
      { title: "Will for Future", topics: ["Predictions", "Spontaneous decisions"] },
      { title: "Be Going To", topics: ["Plans and intentions", "Predictions with evidence"] },
      { title: "Will vs Be Going To", topics: ["Choosing the right form", "Context clues"] },
      { title: "Present Perfect - Affirmative & Negative", topics: ["Form and usage", "Past participles"] },
      { title: "Present Perfect - Questions", topics: ["Question formation", "Short answers"] },
      { title: "Present Perfect with Expressions", topics: ["Ever, never, just", "Already, yet"] },
      { title: "Comparatives", topics: ["Comparing things", "Than and as...as"] },
      { title: "Possessive Pronouns", topics: ["Mine, yours, his, hers", "Ours, theirs"] },
      { title: "Verbs of Preference", topics: ["Like + ing", "Love + ing", "Hate + ing"] },
      { title: "Adverbs Ending in -ly", topics: ["Forming adverbs", "Position in sentences"] },
      { title: "First Conditional", topics: ["If + present, will + infinitive", "Real possibilities"] },
      { title: "Second Conditional", topics: ["If + past, would + infinitive", "Imaginary situations"] },
      { title: "First vs Second Conditional", topics: ["Choosing the right conditional", "Real vs imaginary"] }
    ]
  },
  'Premium': {
    description: "The Premium Pathway DSA Smart Start is a complete and innovative program designed for students with SLD who want to learn English in a clear, stimulating way without frustration. Through a multisensory method and high-readability materials, the pathway combines individual lessons, group workshops, mind maps, and video lessons to make learning simpler and more effective.",
    learningOutcomes: [
      "Achieve personalized progress through 1-on-1 lessons",
      "Build confidence in group workshop settings",
      "Master vocabulary through 525 visual mind maps",
      "Develop concentration and listening skills",
      "Prepare for school tests and homework independently",
      "Earn final level certification"
    ],
    whatYoullFind: [
      "7 individual lessons of 50 minutes each",
      "32 group workshops of 50 minutes",
      "525 mind maps + 15 learning units for SLD students",
      "Over 100 interactive video lessons",
      "'Stop & Check' worksheets and periodic tests",
      "School tutoring for homework and test prep",
      "Dedicated assistance 6 days a week"
    ],
    targetAudience: [
      "Students seeking intensive, personalized support",
      "Learners who benefit from combined 1-on-1 and group learning",
      "Those wanting structured progress tracking",
      "Anyone ready to commit to comprehensive transformation"
    ],
    units: []
  },
  'Gold': {
    description: "The Gold Pathway DSA Smart Start is a structured and innovative program designed for students with SLD who wish to learn English in a clear, engaging way without frustration. Thanks to a multisensory and high-readability method, the pathway combines interactive group lessons, mind maps, video lessons, and dedicated materials to make learning simpler and more effective.",
    learningOutcomes: [
      "Build confidence through twice-weekly group workshops",
      "Master vocabulary with 525 visual mind maps",
      "Develop concentration and listening skills",
      "Track progress with 'Stop & Check' worksheets",
      "Receive dedicated tutoring and support",
      "Earn final level certification"
    ],
    whatYoullFind: [
      "52 workshops of 50 minutes (twice weekly)",
      "525 mind maps + 15 learning units for SLD",
      "Over 100 interactive video lessons",
      "'Stop & Check' worksheets for progress monitoring",
      "Dedicated tutoring and assistance 6 days a week",
      "Final level certification"
    ],
    targetAudience: [
      "Students who thrive in group learning environments",
      "Learners seeking consistent, structured progress",
      "Those who benefit from peer interaction and support",
      "Anyone committed to long-term English improvement"
    ],
    units: []
  }
};

// Premium course features
const PREMIUM_FEATURES = [
  { icon: <Users size={18} />, text: '7 individual lessons of 50 minutes' },
  { icon: <Video size={18} />, text: '32 workshops of 50 minutes' },
  { icon: <Brain size={18} />, text: '525 mind maps + 15 learning units designed specifically for SLD students' },
  { icon: <Headphones size={18} />, text: 'Over 100 interactive video lessons to boost concentration, listening, and vocabulary' },
  { icon: <FileCheck size={18} />, text: '"Stop & Check" worksheets and periodic tests to monitor progress' },
  { icon: <BookOpen size={18} />, text: 'School tutoring for homework and test preparation' },
  { icon: <MessageCircle size={18} />, text: 'Dedicated assistance 6 days a week' },
  { icon: <GraduationCap size={18} />, text: 'Final level certification upon completion' },
];

const GOLD_FEATURES = [
  { icon: <Video size={18} />, text: '52 workshops of 50 minutes with twice-weekly attendance' },
  { icon: <Brain size={18} />, text: '525 mind maps + 15 learning units developed specifically for SLD' },
  { icon: <Headphones size={18} />, text: 'Over 100 interactive video lessons for concentration, listening, and vocabulary' },
  { icon: <FileCheck size={18} />, text: '"Stop & Check" worksheets to constantly monitor and adapt the pathway' },
  { icon: <MessageCircle size={18} />, text: 'Dedicated tutoring and assistance 6 days a week' },
  { icon: <GraduationCap size={18} />, text: 'Final level certification' },
];

// Format price for display
const formatPrice = (course: Course): string => {
  const pricing = course.pricing;
  
  if (pricing.isFree) return 'FREE';
  
  const now = new Date();
  const hasActiveDiscount = pricing.discountPrice !== undefined && 
    (!pricing.discountStartDate || new Date(pricing.discountStartDate) <= now) &&
    (!pricing.discountEndDate || new Date(pricing.discountEndDate) >= now);
  
  if (hasActiveDiscount && pricing.discountPrice !== undefined) {
    return `${pricing.discountPrice.toFixed(2)}€`;
  }
  
  return `${pricing.price.toFixed(2)}€`;
};

interface SyllabusProps {
  courseId: string;
  onBack: () => void;
  onEnroll: (id: string) => void;
  onAddToCart: (id: string) => void;
  isInCart: boolean;
}

const CourseSyllabusPage: React.FC<SyllabusProps> = ({ courseId, onBack, onEnroll, onAddToCart, isInCart }) => {
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
        console.error('Error loading course:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCourse();
  }, [courseId]);

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen size={32} className="text-gray-300" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-4">Course Not Found</h3>
          <p className="text-gray-500 mb-8">The course you're looking for doesn't exist or has been removed.</p>
          <button onClick={onBack} className="px-8 py-4 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors">
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const config = LEVEL_CONFIG[course.level] || LEVEL_CONFIG['A1'];
  const price = formatPrice(course);

  // Calculate course stats - with null checks
  const modules = course.modules || [];
  const totalModules = modules.length;
  const totalLessons = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  const totalDuration = modules.reduce((sum, m) => {
    return sum + (m.lessons || []).reduce((lessonSum, l) => {
      const mins = parseInt(l.duration) || 0;
      return lessonSum + mins;
    }, 0);
  }, 0);
  const formattedDuration = totalDuration > 60 
    ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`
    : `${totalDuration}m`;

  // Get course content from our comprehensive data
  const courseContent = COURSE_CONTENT[course.level];
  
  // Use COURSE_CONTENT data for outcomes, fallback to lesson extraction
  const outcomes = courseContent?.learningOutcomes || 
    (course.learningOutcomes && course.learningOutcomes.length > 0 
      ? course.learningOutcomes 
      : modules.slice(0, 4).map(m => m.lessons?.[0]?.title || m.title).filter(Boolean));
  if (outcomes.length === 0) {
    outcomes.push(
      'Master essential vocabulary through visual memory techniques',
      'Build confidence speaking in real-life situations', 
      'Develop reading comprehension with dyslexia-friendly methods',
      'Track your progress with personalized milestones'
    );
  }

  // Use COURSE_CONTENT for target audience
  const targetAudience = courseContent ? {
    description: `Perfect for ${config.label.toLowerCase()} learners who want to build a strong foundation`,
    points: courseContent.targetAudience
  } : (course.targetAudience || {
    description: `Perfect for ${config.label.toLowerCase()} learners who want to build a strong foundation`,
    points: ['Complete beginners starting their English journey', 'Visual learners who struggle with traditional textbooks', 'Students with dyslexia or learning differences', 'Anyone who wants a supportive, judgment-free environment']
  });

  // What you'll find inside - from COURSE_CONTENT
  const whatYoullFind = courseContent?.whatYoullFind || [];
  
  // Grammar units from COURSE_CONTENT
  const grammarUnits = courseContent?.units || [];
  
  // Exam prep info
  const examPrep = courseContent?.examPrep;
  
  // Course description from COURSE_CONTENT or fallback
  const courseDescription = courseContent?.description || course.description;

  // Check for original price vs discount
  const hasDiscount = course.pricing.discountPrice !== undefined && course.pricing.discountPrice < course.pricing.price;
  const originalPrice = hasDiscount ? `${course.pricing.price.toFixed(2)}€` : null;
  
  // Check if discount is currently active (for urgency badge)
  const now = new Date();
  const hasActiveDiscount = hasDiscount && 
    (!course.pricing.discountStartDate || new Date(course.pricing.discountStartDate) <= now) &&
    (!course.pricing.discountEndDate || new Date(course.pricing.discountEndDate) >= now);

  return (
    <div className="bg-white min-h-screen">
      {/* Light Syllabus Hero - matching Home Page style */}
      <div className="relative w-full min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#fff5fd] via-[#fffbfd] to-white">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
           {/* Soft gradient blobs using the new colors */}
           <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FFC1F2] rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-pulse-slow"></div>
           <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#AB8FFF] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse-slow delay-1000"></div>
           <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-20 pb-20">
          {/* Back Button */}
          <button 
            onClick={onBack}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-[#AB8FFF] transition-colors mb-12"
          >
            <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center group-hover:border-[#AB8FFF]/30 group-hover:shadow-md transition-all">
              <ArrowLeft size={16} />
            </div>
            Back to Courses
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Course Info */}
            <div className="space-y-8 animate-reveal">
              {/* Level Badge */}
              <div className="inline-flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white shadow-lg`}>
                  {config.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#AB8FFF]">Level {course.level}</span>
                  <span className="text-sm font-bold text-gray-800">{config.label}</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[#1a1c2d] leading-[0.9] tracking-tight">
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
                      <span className="text-[#1a1c2d]">{word}</span>
                    )}
                    {' '}
                   </React.Fragment>
                ))}
              </h1>

              {/* Description */}
              <p className="text-lg sm:text-xl font-medium text-gray-600 leading-relaxed max-w-xl">
                {courseDescription || `Transform your English skills with our ${config.label.toLowerCase()} course. Designed specifically for visual learners and students with dyslexia — learn at your own pace with proven, brain-friendly methods.`}
              </p>

              {/* Exam Prep Badge */}
              {examPrep && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-200">
                  <GraduationCap size={16} className="text-green-600" />
                  <span className="text-xs font-bold text-green-700">Prepares for {examPrep}</span>
                </div>
              )}

              {/* Stats Row - Updated to match light theme */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                    <Layers size={20} className="text-[#AB8FFF]" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-900">{totalModules}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Modules</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center">
                    <Play size={20} className="text-pink-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-900">{totalLessons}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lessons</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                    <Clock size={20} className="text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-900">{formattedDuration || '2h+'}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duration</p>
                  </div>
                </div>
              </div>

              {/* Price & CTA */}
              <div className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex flex-col gap-2">
                  {/* Discount Urgency Badge */}
                  {hasActiveDiscount && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full w-fit animate-pulse">
                      <Flame size={14} className="text-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Limited Time Offer</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-3">
                    <span className={`text-4xl sm:text-5xl font-black text-[#1a1c2d]`}>
                      {price}
                    </span>
                    {originalPrice && (
                      <span className="text-xl font-bold text-gray-400 line-through decoration-pink-500">{originalPrice}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => onEnroll(courseId)}
                    className={`group flex items-center gap-3 px-8 py-4 rounded-full text-[11px] font-black uppercase tracking-widest text-white shadow-xl hover:shadow-[#AB8FFF]/25 hover:-translate-y-1 transition-all bg-[#AB8FFF]`}
                  >
                    {price === 'FREE' ? 'Start Free' : 'Enroll Now'}
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => onAddToCart(courseId)}
                    className={`flex items-center gap-2 px-6 py-4 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all ${
                      isInCart 
                        ? 'bg-green-50 border-green-200 text-green-600' 
                        : 'bg-white border-gray-200 text-gray-400 hover:border-[#AB8FFF] hover:text-[#AB8FFF]'
                    }`}
                  >
                    {isInCart ? <Check size={16} /> : <ShoppingCart size={16} />}
                    {isInCart ? 'Added' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Course Visual Card - Light version */}
            <div className="relative animate-reveal stagger-1">
              {/* Main Card */}
              <div className="relative bg-white rounded-[3rem] p-6 border border-gray-100 shadow-2xl shadow-purple-500/5">
                {/* Thumbnail */}
                <div className="relative aspect-video rounded-3xl overflow-hidden mb-6 bg-gray-100 shadow-inner">
                  {course.thumbnailUrl ? (
                    <img 
                      src={course.thumbnailUrl} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center`}>
                      <BookOpen size={48} className="text-gray-300" />
                    </div>
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 hover:opacity-100 transition-opacity cursor-pointer group">
                    <div className={`w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform`}>
                      <Play size={32} className="text-[#AB8FFF] ml-1" fill="currentColor" />
                    </div>
                  </div>
                  {/* Level tag */}
                  <div className="absolute top-4 left-4">
                    <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white bg-gradient-to-r ${config.color} shadow-lg`}>
                      {course.level}
                    </span>
                  </div>
                </div>

                {/* Quick highlights */}
                <div className="space-y-3 px-2 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-100 text-green-600">
                      <CheckCircle2 size={14} />
                    </div>
                    <span className="text-sm font-bold text-gray-600">Lifetime access to all materials</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-100 text-green-600">
                      <CheckCircle2 size={14} />
                    </div>
                    <span className="text-sm font-bold text-gray-600">Certificate of completion</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-100 text-green-600">
                      <CheckCircle2 size={14} />
                    </div>
                    <span className="text-sm font-bold text-gray-600">Dyslexia-friendly design</span>
                  </div>
                </div>
              </div>

              {/* Decorative floating elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#FFC1F2] rounded-3xl rotate-12 opacity-40 blur-xl"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#AB8FFF] rounded-full opacity-30 blur-2xl"></div>
            </div>
          </div>
        </div>

        {/* Curved transition to white */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-[50px] sm:h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-white opacity-0"></path>
              <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="fill-white"></path>
          </svg>
        </div>
      </div>

      {/* Main Detail Section */}
      <section className="pb-32 px-6 relative z-30">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          
          {/* Left: Outcomes & Highlights */}
          <div className="lg:col-span-5 space-y-16 animate-reveal">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 border border-purple-100">
                  <Target size={28} />
                </div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight uppercase">What You'll Achieve</h3>
              </div>
              <p className="text-gray-500 text-lg mb-8 font-medium">
                By the end of this course, you'll be able to confidently:
              </p>
              <div className="space-y-4">
                {outcomes.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 bg-gray-50 rounded-[2rem] border border-gray-100 group hover:bg-white hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/5 transition-all">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="text-green-600" size={18} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-10 bg-gradient-to-br from-[#1a1c2d] to-black rounded-[3rem] text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/20 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10">
                <Sparkles className="text-purple-400 mb-6" size={32} />
                <h4 className="text-2xl font-black mb-4 uppercase tracking-tight">The DSA Advantage</h4>
                <p className="text-gray-400 text-sm leading-loose mb-8">
                  Unlike traditional courses, we don't just list grammar points. We teach you <span className="text-white italic underline underline-offset-4 decoration-purple-500 decoration-2">how to learn</span> through visual pegs and sensory triggers.
                </p>
                <div className="space-y-2">
                   {["Visual Mind Mapping", "Audio Memory Pegs", "Kinesthetic Learning Blocks"].map((tag, i) => (
                     <div key={i} className="inline-block px-4 py-2 bg-white/5 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest mr-2 mb-2">{tag}</div>
                   ))}
                </div>
              </div>
            </div>

            {/* What's Included Section */}
            {whatYoullFind.length > 0 && (
              <div className="p-8 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                    <FileCheck size={24} />
                  </div>
                  <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">What's Included</h4>
                </div>
                <div className="space-y-3">
                  {whatYoullFind.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
                      <CheckCircle2 size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Who Is This For? Section */}
            <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-[3rem] border border-purple-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFC1F2] rounded-full blur-[40px] translate-x-1/2 -translate-y-1/2 opacity-50"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white rounded-xl text-[#AB8FFF] shadow-sm">
                    <UserCheck size={24} />
                  </div>
                  <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">Who Is This For?</h4>
                </div>
                <p className="text-gray-600 text-sm mb-6 font-medium">{targetAudience.description}</p>
                <div className="space-y-3">
                  {targetAudience.points.map((point, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-[#AB8FFF] flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trust & Guarantee Section */}
            <div className="p-8 bg-white rounded-[3rem] border border-gray-100 shadow-lg shadow-purple-500/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-50 rounded-xl text-green-600">
                  <Shield size={24} />
                </div>
                <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">Our Promise</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-gray-50">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <RefreshCcw size={20} className="text-green-600" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-gray-900">14-Day</span>
                  <span className="text-[10px] text-gray-500 font-medium">Money Back Guarantee</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-gray-50">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                    <Heart size={20} className="text-purple-600" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-gray-900">Dyslexia</span>
                  <span className="text-[10px] text-gray-500 font-medium">Friendly Design</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-gray-50">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                    <BadgeCheck size={20} className="text-amber-600" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-gray-900">Certificate</span>
                  <span className="text-[10px] text-gray-500 font-medium">Upon Completion</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Modules Timeline */}
          <div className="lg:col-span-7 animate-reveal stagger-1">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100">
                <BookOpen size={28} />
              </div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                {course.level === 'Premium' || course.level === 'Gold' 
                  ? 'Program Includes' 
                  : grammarUnits.length > 0 
                    ? 'Grammar Units' 
                    : 'Course Modules'}
              </h3>
            </div>

            {/* Premium/Gold Features Display */}
            {(course.level === 'Premium' || course.level === 'Gold') ? (
              <div className="space-y-6">
                <div className={`relative overflow-hidden rounded-[3rem] p-10 ${
                  course.level === 'Premium' 
                    ? 'bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950' 
                    : 'bg-gradient-to-br from-amber-950 via-yellow-900 to-orange-950'
                }`}>
                  {/* Animated Background */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className={`absolute -top-1/2 -right-1/2 w-full h-full rounded-full blur-3xl opacity-20 animate-pulse ${
                      course.level === 'Premium' ? 'bg-violet-400' : 'bg-amber-400'
                    }`}></div>
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        course.level === 'Premium' 
                          ? 'bg-gradient-to-br from-violet-400 to-purple-600 text-white' 
                          : 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950'
                      }`}>
                        {course.level === 'Premium' ? <Crown size={28} /> : <Diamond size={28} />}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-white">Complete Learning Package</h4>
                        <p className="text-white/50 text-sm">Everything you need for success</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {(course.level === 'Premium' ? PREMIUM_FEATURES : GOLD_FEATURES).map((feature, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-all">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            course.level === 'Premium' ? 'bg-violet-500/30 text-violet-300' : 'bg-amber-500/30 text-amber-300'
                          }`}>
                            {feature.icon}
                          </div>
                          <span className="text-white/90 font-medium leading-relaxed">{feature.text}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Trust badges */}
                    <div className="mt-10 pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-6">
                      <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-wider">
                        <Shield size={14} />
                        Secure Payment
                      </div>
                      <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-wider">
                        <Award size={14} />
                        Certificate Included
                      </div>
                      <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-wider">
                        <MessageCircle size={14} />
                        6 Days Support
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Method Description */}
                <div className="bg-gray-50 rounded-[3rem] p-10 border border-gray-100">
                  <h4 className="text-xl font-black text-gray-900 mb-4 uppercase tracking-tight">The DSA Smart Start Method</h4>
                  <p className="text-gray-600 leading-relaxed">
                    {course.level === 'Premium' 
                      ? 'The DSA Smart Start Method is the only one that integrates socialization, specific support tools, and a gradual approach, to guide students step by step, with confidence and motivation.'
                      : 'The DSA Smart Start method is the only one that combines socialization, specific support tools, and a step-by-step approach, to guide students in their learning journey with confidence and motivation.'
                    }
                  </p>
                </div>
              </div>
            ) : grammarUnits.length > 0 ? (
              /* Grammar Units Display for A1, A2, B1, Kids */
              <div className="space-y-4">
                <p className="text-gray-500 text-sm mb-6">
                  This course covers <span className="font-bold text-gray-700">{grammarUnits.length} comprehensive units</span>, each designed with visual learning techniques and dyslexia-friendly materials.
                </p>
                
                {grammarUnits.map((unit, i) => {
                  const unitId = `unit-${i}`;
                  const isExpanded = expandedModules.has(unitId);
                  
                  return (
                    <div key={i} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 overflow-hidden">
                      {/* Unit Header - Clickable */}
                      <button 
                        onClick={() => toggleModule(unitId)}
                        className="w-full p-6 flex items-center justify-between gap-4 text-left hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white font-black text-lg shadow-lg`}>
                            {i + 1}
                          </div>
                          <div>
                            <h5 className="text-lg font-black text-gray-900 tracking-tight">{unit.title}</h5>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{unit.topics.length} Topics</span>
                          </div>
                        </div>
                        <div className={`w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown size={20} className="text-gray-500" />
                        </div>
                      </button>
                      
                      {/* Unit Topics - Expandable */}
                      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        <div className="px-6 pb-6 pt-0">
                          <div className="pl-16 space-y-2">
                            {unit.topics.map((topic, j) => (
                              <div key={j} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-700">{topic}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : modules.length === 0 ? (
              <div className="bg-gray-50 rounded-[3rem] p-12 text-center">
                <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
                <h4 className="text-xl font-black text-gray-900 mb-2">Content Coming Soon</h4>
                <p className="text-gray-500">This course is being developed. Check back soon for the full curriculum!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Expand/Collapse All */}
                <div className="flex justify-end mb-2">
                  <button 
                    onClick={() => {
                      if (expandedModules.size === modules.length) {
                        setExpandedModules(new Set());
                      } else {
                        setExpandedModules(new Set(modules.map(m => m.id)));
                      }
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-[#AB8FFF] hover:text-purple-700 transition-colors"
                  >
                    {expandedModules.size === modules.length ? 'Collapse All' : 'Expand All'}
                  </button>
                </div>
                
                {modules.map((module, i) => {
                  const isExpanded = expandedModules.has(module.id);
                  const lessonCount = module.lessons?.length || 0;
                  const totalModuleDuration = (module.lessons || []).reduce((sum, l) => sum + (parseInt(l.duration) || 0), 0);
                  
                  return (
                    <div key={module.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 overflow-hidden">
                      {/* Module Header - Clickable */}
                      <button 
                        onClick={() => toggleModule(module.id)}
                        className="w-full p-6 md:p-8 flex items-center justify-between gap-4 text-left hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white font-black text-lg shadow-lg`}>
                            {i + 1}
                          </div>
                          <div>
                            <h5 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">{module.title}</h5>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{lessonCount} Lessons</span>
                              {totalModuleDuration > 0 && (
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{totalModuleDuration} min</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={`w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown size={20} className="text-gray-500" />
                        </div>
                      </button>
                      
                      {/* Module Content - Expandable */}
                      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        <div className="px-6 md:px-8 pb-6 md:pb-8 pt-0">
                          {module.description && (
                            <p className="text-gray-500 text-sm mb-6 pl-16">{module.description}</p>
                          )}
                          
                          <div className="pl-16 space-y-3">
                            {(module.lessons || []).map((lesson, j) => (
                              <div key={lesson.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl group hover:bg-purple-50 transition-colors">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                  lesson.type === 'video' ? 'bg-purple-100 text-purple-600' :
                                  lesson.type === 'reading' ? 'bg-blue-100 text-blue-600' :
                                  'bg-green-100 text-green-600'
                                }`}>
                                  {lesson.type === 'video' && <Play size={18} />}
                                  {lesson.type === 'reading' && <FileText size={18} />}
                                  {lesson.type === 'quiz' && <Target size={18} />}
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm font-bold text-gray-700 block">{lesson.title}</span>
                                  <span className="text-xs text-gray-400">{lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)} • {lesson.duration}</span>
                                </div>
                                <Lock size={14} className="text-gray-300 group-hover:text-purple-300" />
                              </div>
                            ))}
                            
                            {(module.homework?.length || 0) > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">Practice & Homework</span>
                                {(module.homework || []).map((hw) => (
                                  <div key={hw.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl mb-2">
                                    <FileText size={16} className="text-amber-600" />
                                    <span className="text-sm font-medium text-gray-700">{hw.title}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* BOTTOM CTAs FOR THE SYLLABUS PAGE */}
            <div className="mt-20 p-12 bg-gradient-to-br from-purple-50 via-white to-pink-50 rounded-[4rem] border border-purple-100 text-center animate-reveal relative overflow-hidden">
               {/* Decorative elements */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFC1F2] rounded-full blur-[60px] opacity-40"></div>
               <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#AB8FFF] rounded-full blur-[50px] opacity-30"></div>
               
               <div className="relative z-10">
                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-purple-100 mb-6">
                   <Rocket size={16} className="text-[#AB8FFF]" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Start Your Transformation</span>
                 </div>
                 <h4 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Ready to unlock your potential?</h4>
                 <p className="text-gray-500 mb-10 font-medium max-w-lg mx-auto">
                   Join hundreds of students who've discovered a better way to learn. Your journey to confidence starts with a single step.
                 </p>
                 <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button 
                      onClick={() => onEnroll(courseId)}
                      className={`group flex items-center justify-center gap-3 px-10 py-5 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all bg-gradient-to-r ${config.color}`}
                    >
                      {price === 'FREE' ? 'Start Learning Free' : `Enroll Now — ${price}`}
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => onAddToCart(courseId)}
                      className={`flex items-center justify-center gap-3 px-8 py-5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all ${isInCart ? 'bg-green-50 border-green-500 text-green-600' : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600'}`}
                    >
                      {isInCart ? <><Check size={18} /> Added to Cart</> : <><ShoppingCart size={18} /> Save for Later</>}
                    </button>
                 </div>
                 
                 {/* Trust row */}
                 <div className="flex flex-wrap items-center justify-center gap-6 mt-10 pt-8 border-t border-gray-100">
                   <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold">
                     <Shield size={14} />
                     <span>14-Day Money Back</span>
                   </div>
                   <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold">
                     <Lock size={14} />
                     <span>Secure Checkout</span>
                   </div>
                   <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold">
                     <Award size={14} />
                     <span>Certificate Included</span>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CourseSyllabusPage;
