import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Star, ShoppingCart, Check, ChevronRight, ChevronDown, Layers, TrendingUp, Award, Clock, Shield, RefreshCcw, Sparkles, Target, GraduationCap, Heart, BadgeCheck, UserCheck, Rocket, Lock, Users, Crown, Diamond, Compass, Video, BookOpen, Brain, Headphones, FileCheck, MessageCircle, X, Calendar, Zap } from 'lucide-react';
import { coursesApi } from '../data/supabaseStore';
import { Course } from '../types';

// ============================================
// LEVEL CONFIG — colours & icons per live-course slug
// ============================================
const LEVEL_CONFIG: Record<string, { color: string; bgColor: string; label: string; icon: React.ReactNode }> = {
  'starter-path':     { color: 'from-sky-500 to-blue-600',     bgColor: 'bg-sky-500',     label: 'Starter Path',     icon: <Compass size={20} /> },
  'language-lab':     { color: 'from-violet-600 to-purple-700', bgColor: 'bg-violet-600',  label: 'Language Lab',     icon: <Users size={20} /> },
  'language-lab-pro': { color: 'from-emerald-500 to-teal-600', bgColor: 'bg-emerald-500',  label: 'Language Lab Pro', icon: <Crown size={20} /> },
  'hybrid-pack':      { color: 'from-amber-500 to-yellow-600', bgColor: 'bg-amber-500',    label: 'Hybrid Pack',      icon: <Diamond size={20} /> },
};

// ============================================
// LIVE COURSE CONTENT DATA (translated to English)
// ============================================
interface LiveCourseContentData {
  description: string;
  duration: string;
  lessons: string;
  totalHours: string;
  includes: string[];
  notIncluded: string[];
  learningOutcomes: string[];
  targetAudience: string[];
}

const LIVE_COURSE_CONTENT: Record<string, LiveCourseContentData> = {
  'starter-path': {
    description: "Begin your English journey with personalised one-to-one attention. This starter programme is tailored entirely to your needs using the DSA Smart Start® Method, perfect for anyone looking for a focused introduction with a dedicated certified native-speaking tutor specialised in SLD.",
    duration: '5 weeks',
    lessons: '10 lessons of 30 minutes',
    totalHours: '5 hours',
    includes: [
      'Initial level assessment',
      'DSA Smart Start® Method',
      'Personalised one-to-one sessions',
      'Creation of customised Mind Maps',
      'Multisensory and visual method',
      'Guided conversation',
      'Mini personalised study plan',
      'Certified native-speaking tutors specialised in SLD',
      'Basic digital material',
      'Progressive monitoring',
    ],
    notIncluded: [
      'Language Lab',
      'DSA Smart Start Teaching Material — unlimited access',
      'Access to 500+ Brain Mapping resources',
      'Access to 700+ video lessons',
      'Test and exam preparation',
      'Homework help',
      'Direct contact with school representatives',
      'Final Teaching Report on competencies',
      'Level certification',
      'Extended duration up to 9 months',
    ],
    learningOutcomes: [
      'Receive a personalised learning assessment',
      'Build foundational English skills one-to-one',
      'Gain confidence speaking with individual attention',
      'Develop a customised learning roadmap',
      'Get targeted feedback on your specific challenges',
    ],
    targetAudience: [
      'Beginners wanting a personal start to English',
      'Learners who prefer one-to-one attention',
      'Those needing a flexible, short-term programme',
      'Anyone wanting to assess their level and build a plan',
    ],
  },
  'language-lab': {
    description: "Small group live sessions designed for focused, interactive learning. Join a class of 3–4 students for 8 dynamic workshops, each lasting 50 minutes. Perfect for learners who thrive in collaborative environments with personalised attention from certified native-speaking tutors specialised in SLD.",
    duration: '8 weeks',
    lessons: '8 workshops of 50 minutes',
    totalHours: '6.5 hours',
    includes: [
      'Initial level assessment',
      'DSA Smart Start® Method',
      'Language Lab — max 3–4 students',
      'Circle Talk Lab',
      'Role Play & Team Challenges',
      'Multisensory and visual method',
      'Certified native-speaking tutors specialised in SLD',
      'Progressive monitoring',
    ],
    notIncluded: [
      'Personalised one-to-one sessions',
      'DSA Smart Start Teaching Material — unlimited access',
      'Access to 500+ Brain Mapping resources',
      'Access to 700+ video lessons',
      'Test and exam preparation',
      'Homework help',
      'Direct contact with school representatives',
      'Final Teaching Report on competencies',
      'Level certification',
      'Extended duration up to 9 months',
    ],
    learningOutcomes: [
      'Build conversational confidence in small group settings',
      'Develop real-time communication skills with peer interaction',
      'Receive personalised feedback from expert instructors',
      'Practice speaking, listening and responding naturally',
      'Gain exposure to diverse communication styles',
    ],
    targetAudience: [
      'Learners who thrive in collaborative settings',
      'Students wanting real-time speaking practice',
      'Anyone looking for an affordable group learning option',
      'Those who enjoy interactive, social learning',
    ],
  },
  'language-lab-pro': {
    description: "Our most intensive micro-group programme with 30 live workshops. Micro-Labs with max 3\u20134 students of the same age and level, 50-minute sessions packed with interactive exercises, real conversation practice, and progressive skill building. All teaching materials are included for a complete learning experience.",
    duration: 'Up to 9 months',
    lessons: '30 workshops of 50 minutes',
    totalHours: '25 hours',
    includes: [
      'Initial level assessment',
      'DSA Smart Start\u00ae Method',
      'DSA Smart Start\u00ae Teaching Material \u2014 Unlimited access',
      'Multisensory and visual method',
      'Access to 500+ Brain Mapping resources',
      'Access to 700+ video lessons',
      'Language Lab in micro-group (max 3\u20134 students)',
      'Circle Talk Lab',
      'Role Play & Team Challenges',
      'Certified native-speaking tutors specialised in SLD',
      'Progressive monitoring',
      'Written test and oral exam preparation',
      'Direct contact with school representatives',
      'Final Teaching Report with acquired competencies',
      'Official level certification',
      'Extended duration up to 9 months',
    ],
    notIncluded: [
      'Personalised one-to-one sessions',
      'Personalised study plan',
      'Creation of customised Mind Maps',
      'Individual Stop & Check',
      'Individual homework help',
    ],
    learningOutcomes: [
      'Achieve significant fluency improvement over 30 sessions',
      'Master complex conversation patterns and responses',
      'Build advanced vocabulary through immersive practice',
      'Develop natural pronunciation and intonation',
      'Gain confidence for professional and social English use',
    ],
    targetAudience: [
      'Committed learners seeking intensive group practice',
      'Students wanting long-term structured progression',
      'Those who benefit from peer learning and collaboration',
      'Learners aiming for significant fluency improvement',
    ],
  },
  'hybrid-pack': {
    description: "The best of both worlds \u2014 combining the energy of micro-group labs with the personalised focus of one-to-one sessions. Includes 25 workshops (50 minutes, max 3\u20134 students) plus 5 individual sessions (30 minutes). All teaching materials are included for the most comprehensive learning experience.",
    duration: 'Up to 9 months',
    lessons: '25 workshops of 50 min + 5 individual sessions of 30 min',
    totalHours: '23.5 hours',
    includes: [
      'Initial level assessment',
      'DSA Smart Start\u00ae Method',
      'DSA Smart Start\u00ae Teaching Material \u2014 Unlimited access',
      'Multisensory and visual method',
      'Access to 500+ Brain Mapping resources',
      'Access to 700+ video lessons',
      'Personalised one-to-one sessions',
      'Personalised study plan',
      'Creation of customised Mind Maps',
      'Language Lab max 3\u20134 students',
      'Circle Talk Lab',
      'Role Play & Team Challenges',
      'Certified native-speaking tutors specialised in SLD',
      'Progressive monitoring',
      'Personalised Stop & Check',
      'Test and exam preparation',
      'Homework help',
      'Direct contact with school representatives',
      'Final Teaching Report on competencies',
      'Level certification',
      'Extended duration up to 9 months',
    ],
    notIncluded: [],
    learningOutcomes: [
      'Combine group interaction with personalised attention',
      'Master both social and academic English skills',
      'Receive tailored feedback in one-to-one sessions',
      'Practice real conversation in small group labs',
      'Achieve comprehensive language development',
    ],
    targetAudience: [
      'Learners wanting the most comprehensive programme',
      'Students who benefit from both group and individual learning',
      'Those seeking maximum progress in a structured format',
      'Anyone committed to achieving English fluency',
    ],
  },
};

// ============================================
// COMPONENT
// ============================================
interface LiveCourseDetailPageProps {
  courseId: string;
  onBack: () => void;
  onEnroll: (id: string) => void;
  onAddToCart: (id: string) => void;
  isInCart: boolean;
  isAddingToCart?: boolean;
}

const LiveCourseDetailPage: React.FC<LiveCourseDetailPageProps> = ({
  courseId,
  onBack,
  onEnroll,
  onAddToCart,
  isInCart,
  isAddingToCart = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const data = await coursesApi.getById(courseId);
        setCourse(data);
      } catch (error) {
        console.error('Failed to load course:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCourse();
  }, [courseId]);

  // Particle canvas animation
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

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">Loading course details...</p>
        </div>
      </div>
    );
  }

  /* ---- Not found ---- */
  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
            <Users size={32} className="text-gray-500" />
          </div>
          <h3 className="text-2xl font-black text-white mb-4">Course Not Found</h3>
          <p className="text-gray-400 mb-8">The course you're looking for doesn't exist or has been removed.</p>
          <button onClick={onBack} className="px-8 py-4 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  // ---- Resolve config & content ----
  const config = LEVEL_CONFIG[course.level] || {
    color: 'from-[#AB8FFF] to-purple-600',
    bgColor: 'bg-[#AB8FFF]',
    label: course.level,
    icon: <Users size={20} />,
  };

  const price = course.pricing?.discountPrice ?? course.pricing?.price ?? 0;
  const originalPrice = course.pricing?.discountPrice ? course.pricing.price : null;
  const hasDiscount = originalPrice && originalPrice > price;
  const pricing = course.pricing || { price: 0, currency: 'EUR', isFree: false };
  const displayPrice = pricing.isFree ? 'FREE' : `\u20AC${price}`;

  const contentData = LIVE_COURSE_CONTENT[course.level];

  const courseDescription =
    course.description || contentData?.description || 'Live English course with certified native-speaking tutors specialised in SLD.';

  const includes = contentData?.includes || [];
  const notIncluded = contentData?.notIncluded || [];
  const outcomes = contentData?.learningOutcomes || [];
  const targetAudiencePoints = contentData?.targetAudience || [];
  const duration = contentData?.duration || '';
  const lessons = contentData?.lessons || '';
  const totalHours = contentData?.totalHours || '';

  // Check for active discount
  const now = new Date();
  const hasActiveDiscount =
    hasDiscount &&
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
            {/* Left: Course Info */}
            <div className="space-y-8 animate-reveal">
              {/* Level Badge */}
              <div className="inline-flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white shadow-lg`}>
                  {config.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#AB8FFF]">Live Course</span>
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
                {courseDescription}
              </p>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6">
                {duration && (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                      <Calendar size={20} className="text-[#AB8FFF]" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-white">{duration}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Duration</p>
                    </div>
                  </div>
                )}
                {lessons && (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center">
                      <Video size={20} className="text-pink-400" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-white leading-tight">{lessons}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sessions</p>
                    </div>
                  </div>
                )}
                {totalHours && (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                      <Clock size={20} className="text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-white">{totalHours}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Price & CTA */}
              <div className="flex flex-wrap items-center gap-6 pt-4">
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
                      <span className="text-xl font-bold text-gray-500 line-through decoration-pink-500">{'\u20AC'}{originalPrice}</span>
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
              </div>
            </div>

            {/* Right: Video & Card */}
            <div className="relative animate-reveal stagger-1">
              <div className="relative bg-white/5 rounded-[3rem] p-6 border border-white/10 shadow-2xl shadow-purple-500/10">
                {/* Vimeo Video Placeholder */}
                <div className="relative aspect-video rounded-3xl overflow-hidden mb-4 bg-black">
                  <iframe
                    src={(() => {
                      const vimeoMap: Record<string, string> = {
                        'starter-path': 'https://player.vimeo.com/video/76979871',
                        'language-lab': 'https://player.vimeo.com/video/76979872',
                        'language-lab-pro': 'https://player.vimeo.com/video/76979873',
                        'hybrid-pack': 'https://player.vimeo.com/video/76979874',
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
                  Watch our video and discover how you can finally learn English with clarity, confidence, and the right method.
                </p>

                {/* Quick highlights */}
                <div className="space-y-3 px-2 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-base font-bold text-gray-300">Certified native-speaking tutors</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-base font-bold text-gray-300">DSA Smart Start® Method</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-base font-bold text-gray-300">Personalised learning experience</span>
                  </div>
                </div>

                {/* Bubble Buttons */}
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

          {/* Left Column — Outcomes, Advantages, Who-it's-for, Our Promise */}
          <div className="lg:col-span-5 space-y-16 animate-reveal">

            {/* ---- What You'll Achieve ---- */}
            {outcomes.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400 border border-purple-500/30">
                    <Target size={28} />
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tight uppercase">What You Will Achieve</h3>
                </div>
                <p className="text-gray-400 text-lg mb-8 font-medium">By the end of this course you will be able to:</p>
                <div className="space-y-4">
                  {outcomes.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-5 bg-white/5 rounded-[2rem] border border-white/10 group hover:bg-white/10 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 transition-all">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="text-green-400" size={18} />
                      </div>
                      <span className="text-base font-bold text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---- DSA Smart Start Advantage ---- */}
            <div className="p-10 bg-gradient-to-br from-[#1a1c2d] to-black rounded-[3rem] text-white relative overflow-hidden group border border-white/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/30 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10">
                <Sparkles className="text-purple-400 mb-6" size={32} />
                <h4 className="text-2xl font-black mb-4 uppercase tracking-tight">DSA Smart Start Advantage</h4>
                <p className="text-gray-400 text-sm leading-loose mb-6">
                  Unlike traditional methods, we don't overload students with abstract grammar explanations. We teach students to understand through{' '}
                  <span className="text-white italic underline underline-offset-4 decoration-purple-500 decoration-2">visual learning paths</span>{' '}
                  and sensory triggers that make English clear, structured, and memorable.
                </p>
                <p className="text-white text-sm font-bold mb-4 uppercase tracking-wide">What makes the difference:</p>
                <div className="space-y-2">
                  {['Visual Mind Mapping', 'Multisensory Learning Approach', 'Structured Step-by-Step System', 'Confidence-Building Method'].map((tag, i) => (
                    <div key={i} className="inline-block px-4 py-2 bg-white/5 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest mr-2 mb-2">
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ---- Who Is This For? ---- */}
            {targetAudiencePoints.length > 0 && (
              <div className="p-8 bg-gradient-to-br from-purple-500/10 via-white/5 to-pink-500/10 rounded-[3rem] border border-purple-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFC1F2] rounded-full blur-[40px] translate-x-1/2 -translate-y-1/2 opacity-20"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-white/10 rounded-xl text-[#AB8FFF] shadow-sm border border-white/10">
                      <UserCheck size={24} />
                    </div>
                    <h4 className="text-xl font-black text-white uppercase tracking-tight">Who Is This For?</h4>
                  </div>
                  <p className="text-gray-400 text-sm mb-6 font-medium">
                    Perfect for learners who want personalised, confidence-building English instruction.
                  </p>
                  <div className="space-y-3">
                    {targetAudiencePoints.map((point, i) => (
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
            )}

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
                  <span className="text-[10px] text-gray-400 font-medium">Friendly Approach</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                    <BadgeCheck size={20} className="text-amber-400" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-white">Certified</span>
                  <span className="text-[10px] text-gray-400 font-medium">Native Tutors</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column — Includes / Not Included / Final CTA */}
          <div className="lg:col-span-7 animate-reveal stagger-1">

            {/* ---- What's Included ---- */}
            {includes.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-10">
                  <div className="p-3 bg-green-500/20 rounded-2xl text-green-400 border border-green-500/30">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tight uppercase">What's Included</h3>
                </div>
                <div className="space-y-4">
                  {includes.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-5 bg-white/5 rounded-[2rem] border border-white/10 hover:bg-white/10 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/10 transition-all">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="text-green-400" size={18} />
                      </div>
                      <span className="text-base font-bold text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---- Not Included ---- */}
            {notIncluded.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-10">
                  <div className="p-3 bg-red-500/20 rounded-2xl text-red-400 border border-red-500/30">
                    <X size={28} />
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tight uppercase">Not Included</h3>
                </div>
                <div className="space-y-4">
                  {notIncluded.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-5 bg-white/5 rounded-[2rem] border border-white/10 hover:bg-white/10 hover:border-red-500/20 transition-all">
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <X className="text-red-400" size={18} />
                      </div>
                      <span className="text-base font-bold text-gray-500">{item}</span>
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
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 mb-6">
                  <Rocket size={16} className="text-[#AB8FFF]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Start Your Transformation</span>
                </div>
                <h4 className="text-3xl font-black text-white mb-4 tracking-tight">Ready to Start Learning?</h4>
                <p className="text-gray-400 mb-10 font-medium max-w-lg mx-auto">
                  Enrol today and begin your English learning journey with certified native-speaking tutors who understand the way your brain works best.
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
                    <GraduationCap size={14} />
                    <span>Certified Tutors</span>
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

export default LiveCourseDetailPage;
