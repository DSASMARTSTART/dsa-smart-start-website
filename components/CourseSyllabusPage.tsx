
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Star, Clock, Sparkles, BookOpen, Target, GraduationCap, ChevronRight, ChevronDown, Zap, Lock, ShoppingCart, Check, Rocket, Shield, FileText, Play, Users, Layers, Award, TrendingUp, Crown, Diamond, Video, Brain, Headphones, FileCheck, MessageCircle, Flame, BadgeCheck, Heart, RefreshCcw, UserCheck, Eye } from 'lucide-react';
import { coursesApi } from '../data/supabaseStore';
import { Course, Module } from '../types';
import { useLocalizedCourse } from '../hooks/useLocalizedCourse';
import { useAuth } from '../contexts/AuthContext';

// Level colors and configs
const LEVEL_CONFIG: Record<string, { color: string; bgColor: string; label: string; icon: React.ReactNode }> = {
  'A1': { color: 'from-blue-500 to-indigo-600', bgColor: 'bg-blue-500', label: 'Beginner', icon: <Layers size={20} /> },
  'A2': { color: 'from-indigo-500 to-purple-600', bgColor: 'bg-indigo-500', label: 'Elementary', icon: <TrendingUp size={20} /> },
  'B1': { color: 'from-purple-600 to-pink-600', bgColor: 'bg-purple-600', label: 'Intermediate', icon: <Award size={20} /> },
  'B2': { color: 'from-blue-600 to-cyan-500', bgColor: 'bg-blue-600', label: 'Upper-Intermediate', icon: <Award size={20} /> },
  'Kids': { color: 'from-pink-400 to-rose-500', bgColor: 'bg-pink-500', label: 'Advanced Young Learners', icon: <Star size={20} /> },
  'kids-basic': { color: 'from-pink-400 to-rose-500', bgColor: 'bg-pink-500', label: 'Kids Basic', icon: <Star size={20} /> },
  'kids-medium': { color: 'from-orange-400 to-pink-400', bgColor: 'bg-orange-500', label: 'Kids Medium', icon: <Play size={20} /> },
  'kids-advanced': { color: 'from-purple-400 to-pink-500', bgColor: 'bg-purple-500', label: 'Kids Advanced', icon: <Star size={20} /> },
  'Premium': { color: 'from-violet-600 to-purple-700', bgColor: 'bg-violet-600', label: 'Premium Pathway', icon: <Crown size={20} /> },
  'premium': { color: 'from-violet-600 to-purple-700', bgColor: 'bg-violet-600', label: 'Premium Program', icon: <Crown size={20} /> },
  'Gold': { color: 'from-amber-500 to-yellow-600', bgColor: 'bg-amber-500', label: 'Gold Pathway', icon: <Diamond size={20} /> },
  'golden': { color: 'from-amber-500 to-yellow-600', bgColor: 'bg-amber-500', label: 'Golden Program', icon: <Diamond size={20} /> },
  'language-lab': { color: 'from-violet-600 to-purple-700', bgColor: 'bg-violet-600', label: 'Language Lab', icon: <Users size={20} /> },
  'starter-path': { color: 'from-sky-500 to-blue-600', bgColor: 'bg-sky-500', label: 'Starter Path', icon: <Layers size={20} /> },
  'language-lab-pro': { color: 'from-emerald-500 to-teal-600', bgColor: 'bg-emerald-500', label: 'Language Lab Pro', icon: <Crown size={20} /> },
  'hybrid-pack': { color: 'from-amber-500 to-yellow-600', bgColor: 'bg-amber-500', label: 'Hybrid Pack', icon: <Diamond size={20} /> }
};

interface CourseContentData {
  description: string;
  learningOutcomes: string[];
  whatYoullFind: string[];
  targetAudience: string[];
  units: { title: string; topics: string[] }[];
  examPrep?: string;
}

// Premium/Gold course feature icons (text comes from i18n)
const PREMIUM_FEATURE_ICONS = [
  <Users size={18} />, <Video size={18} />, <Brain size={18} />, <Headphones size={18} />,
  <FileCheck size={18} />, <BookOpen size={18} />, <MessageCircle size={18} />, <GraduationCap size={18} />
];
const GOLD_FEATURE_ICONS = [
  <Video size={18} />, <Brain size={18} />, <Headphones size={18} />,
  <FileCheck size={18} />, <MessageCircle size={18} />, <GraduationCap size={18} />
];

// Format price for display
const formatPrice = (course: Course): string => {
  const pricing = course.pricing || { price: 0, currency: 'EUR', isFree: false };
  
  if (pricing.isFree) return 'FREE';
  
  const now = new Date();
  const hasActiveDiscount = pricing.discountPrice !== undefined && 
    (!pricing.discountStartDate || new Date(pricing.discountStartDate) <= now) &&
    (!pricing.discountEndDate || new Date(pricing.discountEndDate) >= now);
  
  if (hasActiveDiscount && pricing.discountPrice !== undefined) {
    return `${pricing.discountPrice.toFixed(2)}€`;
  }
  
  return `${(pricing.price || 0).toFixed(2)}€`;
};

interface SyllabusProps {
  courseId: string;
  onBack: () => void;
  onEnroll: (id: string) => void;
  onAddToCart: (id: string) => void;
  isInCart: boolean;
  teachingMaterialsSelected?: boolean;
  onToggleTeachingMaterials?: (selected: boolean) => void;
  isAddingToCart?: boolean;
}

const CourseSyllabusPage: React.FC<SyllabusProps> = ({ 
  courseId, 
  onBack, 
  onEnroll, 
  onAddToCart, 
  isInCart,
  teachingMaterialsSelected = false,
  onToggleTeachingMaterials,
  isAddingToCart = false
}) => {
  const { t } = useTranslation('courses');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rawCourse, setRawCourse] = useState<Course | null>(null);
  const course = useLocalizedCourse(rawCourse);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const { isAdmin, isEditor } = useAuth();

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
        // Admins/editors can see unpublished courses via getByIdForAdmin
        const data = isAdmin() || isEditor() 
          ? await coursesApi.getByIdForAdmin(courseId)
          : await coursesApi.getById(courseId);
        setRawCourse(data);
      } catch (error) {
        console.error('Error loading course:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCourse();
  }, [courseId, isAdmin, isEditor]);

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
          <p className="text-gray-400 font-medium">{t('shared.loading')}</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
            <BookOpen size={32} className="text-gray-500" />
          </div>
          <h3 className="text-2xl font-black text-white mb-4">{t('shared.courseNotFound')}</h3>
          <p className="text-gray-400 mb-8">{t('shared.courseNotFoundDesc')}</p>
          <button onClick={onBack} className="px-8 py-4 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors">
            {t('shared.backToCourses')}
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

  // Get course content from database (syllabusContent) or fallback to i18n courseContent
  const rawContent = t(`courseContent.${course.level}`, { returnObjects: true });
  const hardcodedContent = (typeof rawContent === 'object' && rawContent !== null) ? rawContent as CourseContentData : undefined;
  const syllabusContent = course.syllabusContent;
  
  // PRIORITY: Use course's syllabusContent first > learningOutcomes field > COURSE_CONTENT > extracted from modules > generic
  // Learning outcomes
  let outcomes: string[] = [];
  if (syllabusContent?.learningOutcomes && syllabusContent.learningOutcomes.length > 0) {
    outcomes = syllabusContent.learningOutcomes;
  } else if (course.learningOutcomes && course.learningOutcomes.length > 0) {
    outcomes = course.learningOutcomes;
  } else if (hardcodedContent?.learningOutcomes) {
    outcomes = hardcodedContent.learningOutcomes;
  } else if (modules.length > 0) {
    outcomes = modules.slice(0, 4).map(m => m.lessons?.[0]?.title || m.title).filter(Boolean);
  }
  if (outcomes.length === 0) {
    outcomes = t('syllabusPage.defaultOutcomes', { returnObjects: true }) as string[];
  }

  // Target audience: syllabusContent > course data > COURSE_CONTENT > generic
  let targetAudiencePoints: string[] = [];
  if (syllabusContent?.targetAudience && syllabusContent.targetAudience.length > 0) {
    targetAudiencePoints = syllabusContent.targetAudience;
  } else if (course.targetAudienceInfo && course.targetAudienceInfo.points && course.targetAudienceInfo.points.length > 0) {
    targetAudiencePoints = course.targetAudienceInfo.points;
  } else if (hardcodedContent?.targetAudience) {
    targetAudiencePoints = hardcodedContent.targetAudience;
  } else {
    targetAudiencePoints = t('syllabusPage.defaultTargetAudience', { returnObjects: true }) as string[];
  }
  
  const targetAudience = {
    description: course.targetAudienceInfo?.description || t('syllabusPage.defaultTargetAudienceDesc', { label: t('shared.levelLabels.' + course.level, { defaultValue: config.label }).toLowerCase() }),
    points: targetAudiencePoints
  };

  // What you'll find: syllabusContent > course prerequisites > COURSE_CONTENT > empty
  let whatYoullFind: string[] = [];
  if (syllabusContent?.whatYoullFind && syllabusContent.whatYoullFind.length > 0) {
    whatYoullFind = syllabusContent.whatYoullFind;
  } else if (hardcodedContent?.whatYoullFind) {
    whatYoullFind = hardcodedContent.whatYoullFind;
  } else if (course.prerequisites && course.prerequisites.length > 0) {
    whatYoullFind = course.prerequisites;
  }
  
  // Grammar units: syllabusContent > COURSE_CONTENT > empty
  // For custom courses, modules themselves serve as the curriculum display
  const grammarUnits = (syllabusContent?.units && syllabusContent.units.length > 0)
    ? syllabusContent.units 
    : (hardcodedContent?.units || []);
  
  // Exam prep info (from hardcoded only since it's certification-specific)
  const examPrep = hardcodedContent?.examPrep;
  
  // Course description: course data > COURSE_CONTENT > empty
  const courseDescription = course.description || hardcodedContent?.description || '';

  // Format description fallback
  const descriptionFallback = t('shared.defaultSyllabusDescription', { label: t('shared.levelLabels.' + course.level, { defaultValue: config.label }).toLowerCase() });

  // Check for original price vs discount - with null safety
  const pricing = course.pricing || { price: 0, currency: 'EUR', isFree: false };
  const hasDiscount = pricing.discountPrice !== undefined && pricing.discountPrice < pricing.price;
  const originalPrice = hasDiscount ? `${pricing.price.toFixed(2)}€` : null;
  
  // Check if this course supports teaching materials add-on (Premium/Gold programs)
  const isPremiumOrGold = course.level === 'Premium' || course.level === 'premium' || course.level === 'Gold' || course.level === 'golden';
  const teachingMaterialsPrice = isPremiumOrGold ? 50 : 0;
  
  // Calculate display price including teaching materials if selected
  const basePrice = parseFloat(price.replace('â‚¬', '')) || 0;
  const totalWithMaterials = teachingMaterialsSelected && isPremiumOrGold ? basePrice + teachingMaterialsPrice : basePrice;
  const displayPrice = pricing.isFree ? t('shared.free') : `${totalWithMaterials.toFixed(2)}€`;
  
  // Check if discount is currently active (for urgency badge)
  const now = new Date();
  const hasActiveDiscount = hasDiscount && 
    (!pricing.discountStartDate || new Date(pricing.discountStartDate) <= now) &&
    (!pricing.discountEndDate || new Date(pricing.discountEndDate) >= now);
  
  // Check if viewing as admin (for draft indicator)
  const isAdminViewing = isAdmin() || isEditor();
  const isDraft = !course.isPublished;

  return (
    <div className="bg-black min-h-screen">
      {/* Draft Warning Banner for Admins */}
      {isAdminViewing && isDraft && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white py-2 px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-bold">
            <Eye size={16} />
            <span>{t('syllabusPage.adminPreview')}</span>
            <button 
              onClick={() => window.location.hash = `#admin-course-edit-${course.id}`}
              className="ml-4 px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase hover:bg-white/30 transition-colors"
            >
              {t('syllabusPage.editCourse')}
            </button>
          </div>
        </div>
      )}
      
      {/* Light Syllabus Hero - matching Home Page style */}
      <div className={`relative w-full min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-black ${isAdminViewing && isDraft ? 'pt-12' : ''}`}>
        {/* Background Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
           {/* Soft gradient blobs using the new colors */}
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
            {t('shared.backToCourses')}
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#AB8FFF]">{t('syllabusPage.level', { level: course.level })}</span>
                  <span className="text-sm font-bold text-gray-300">{t('shared.levelLabels.' + course.level, { defaultValue: config.label })}</span>
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
                {courseDescription || descriptionFallback}
              </p>

              {/* Exam Prep Badge */}
              {examPrep && (
                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500/20 rounded-full border border-green-500/30">
                  <GraduationCap size={20} className="text-green-400" />
                  <span className="text-sm font-bold text-green-400">{t('shared.preparesFor', { exam: examPrep })}</span>
                </div>
              )}

              {/* Stats Row - Updated to match light theme */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                    <Layers size={20} className="text-[#AB8FFF]" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">{totalModules}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('shared.modules')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center">
                    <Play size={20} className="text-pink-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">{totalLessons}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('shared.lessons')}</p>
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
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">{t('shared.limitedTimeOffer')}</span>
                    </div>
                  )}
                  {/* Teaching Materials Badge */}
                  {isPremiumOrGold && teachingMaterialsSelected && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full w-fit">
                      <BookOpen size={14} className="text-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">{t('syllabusPage.teachingMaterialsBadge')}</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-3">
                    <span className={`text-4xl sm:text-5xl font-black text-white`}>
                      {displayPrice}
                    </span>
                    {originalPrice && !teachingMaterialsSelected && (
                      <span className="text-xl font-bold text-gray-500 line-through decoration-pink-500">{originalPrice}</span>
                    )}
                    {teachingMaterialsSelected && isPremiumOrGold && (
                      <span className="text-sm font-medium text-gray-400">{t('syllabusPage.materialsPrice', { price })}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => onEnroll(courseId)}
                    className={`group flex items-center gap-3 px-8 py-4 rounded-full text-[11px] font-black uppercase tracking-widest text-white shadow-xl hover:shadow-[#AB8FFF]/25 hover:-translate-y-1 transition-all bg-[#AB8FFF]`}
                  >
                    {pricing.isFree ? t('shared.cta.startFree') : t('shared.cta.enrollNow')}
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => onAddToCart(courseId)}
                    disabled={isAddingToCart}
                    className={`flex items-center gap-2 px-6 py-4 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all ${
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
                    {isAddingToCart ? t('shared.adding') : isInCart ? t('shared.added') : t('shared.addToCart')}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Course Visual Card - Light version */}
            <div className="relative animate-reveal stagger-1">
              {/* Main Card */}
              <div className="relative bg-white/5 rounded-[3rem] p-6 border border-white/10 shadow-2xl shadow-purple-500/10">
                {/* Thumbnail */}
                <div className="relative aspect-video rounded-3xl overflow-hidden mb-6 bg-white/5 shadow-inner">
                  {course.thumbnailUrl ? (
                    <img 
                      src={course.thumbnailUrl} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center`}>
                      <BookOpen size={48} className="text-gray-500" />
                    </div>
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer group">
                    <div className={`w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform border border-white/20`}>
                      <Play size={32} className="text-white ml-1" fill="currentColor" />
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
                    <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                      <CheckCircle2 size={14} />
                    </div>
                    <span className="text-base font-bold text-gray-300">{t('syllabusPage.highlights.lifetimeAccess')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-base font-bold text-gray-300">{t('syllabusPage.highlights.certificate')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-base font-bold text-gray-300">{t('syllabusPage.highlights.dyslexiaFriendly')}</span>
                  </div>
                </div>
              </div>

              {/* Decorative floating elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#FFC1F2] rounded-3xl rotate-12 opacity-20 blur-xl"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#AB8FFF] rounded-full opacity-15 blur-2xl"></div>
            </div>
          </div>
        </div>

        {/* Curved transition to white */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-[50px] sm:h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-black opacity-0"></path>
              <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="fill-black"></path>
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
                <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400 border border-purple-500/30">
                  <Target size={28} />
                </div>
                <h3 className="text-3xl font-black text-white tracking-tight uppercase">
                  {course.level.startsWith('kids') ? t('shared.whatYoullAchieveKids') : t('shared.whatYoullAchieveShort')}
                </h3>
              </div>
              <p className="text-gray-400 text-lg mb-8 font-medium">
                {course.level.startsWith('kids')
                  ? t('shared.outcomesIntroKids')
                  : t('shared.outcomesIntroShort')}
              </p>
              <div className="space-y-4">
                {outcomes.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 bg-white/5 rounded-[2rem] border border-white/10 group hover:bg-white/10 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 transition-all">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="text-green-400" size={18} />
                    </div>
                    <span className="text-base font-bold text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-10 bg-gradient-to-br from-[#1a1c2d] to-black rounded-[3rem] text-white relative overflow-hidden group border border-white/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/30 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10">
                <Sparkles className="text-purple-400 mb-6" size={32} />
                <h4 className="text-2xl font-black mb-4 uppercase tracking-tight">{t('shared.dsaAdvantageTitle')}</h4>
                <p className="text-gray-400 text-sm leading-loose mb-6">
                  {(() => {
                    const parts = (t('shared.dsaAdvantageDesc') as string).split(/<1>|<\/1>/);
                    return parts.length === 3 ? <>{parts[0]}<span className="text-white italic underline underline-offset-4 decoration-purple-500 decoration-2">{parts[1]}</span>{parts[2]}</> : t('shared.dsaAdvantageDesc');
                  })()}
                </p>
                <p className="text-white text-sm font-bold mb-4 uppercase tracking-wide">{t('shared.dsaWhatMakesTheDifference')}</p>
                <div className="space-y-2">
                   {(t('shared.dsaTags', { returnObjects: true }) as string[]).map((tag, i) => (
                     <div key={i} className="inline-block px-4 py-2 bg-white/5 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest mr-2 mb-2">{tag}</div>
                   ))}
                </div>
              </div>
            </div>

            {/* What's Included Section */}
            {whatYoullFind.length > 0 && (
              <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                    <FileCheck size={24} />
                  </div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tight">{t('shared.whatsIncluded')}</h4>
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

            {/* Who Is This For? Section */}
            <div className="p-8 bg-gradient-to-br from-purple-500/10 via-white/5 to-pink-500/10 rounded-[3rem] border border-purple-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFC1F2] rounded-full blur-[40px] translate-x-1/2 -translate-y-1/2 opacity-20"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/10 rounded-xl text-[#AB8FFF] shadow-sm border border-white/10">
                    <UserCheck size={24} />
                  </div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tight">{t('shared.whoIsThisFor')}</h4>
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

            {/* Trust & Guarantee Section */}
            <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 shadow-lg shadow-purple-500/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-500/20 rounded-xl text-green-400">
                  <Shield size={24} />
                </div>
                <h4 className="text-xl font-black text-white uppercase tracking-tight">{t('shared.ourPromise')}</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                    <RefreshCcw size={20} className="text-green-400" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-white">{t('shared.promise.moneyBackTitle')}</span>
                  <span className="text-[10px] text-gray-400 font-medium">{t('shared.promise.moneyBackDesc')}</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
                    <Heart size={20} className="text-purple-400" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-white">{t('shared.promise.dyslexiaTitle')}</span>
                  <span className="text-[10px] text-gray-400 font-medium">{t('shared.promise.dyslexiaDesc')}</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                    <BadgeCheck size={20} className="text-amber-400" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-white">{t('shared.promise.certificateTitle')}</span>
                  <span className="text-[10px] text-gray-400 font-medium">{t('shared.promise.certificateDesc')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Modules Timeline */}
          <div className="lg:col-span-7 animate-reveal stagger-1">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 border border-indigo-500/30">
                <BookOpen size={28} />
              </div>
              <h3 className="text-3xl font-black text-white tracking-tight uppercase">
                {course.level === 'Premium' || course.level === 'premium' || course.level === 'Gold' || course.level === 'golden'
                  ? t('shared.programIncludes') 
                  : grammarUnits.length > 0 
                    ? t('shared.unitContent') 
                    : t('shared.courseModules')}
              </h3>
            </div>

            {/* Premium/Gold Features Display */}
            {(course.level === 'Premium' || course.level === 'premium' || course.level === 'Gold' || course.level === 'golden') ? (
              <div className="space-y-6">
                <div className={`relative overflow-hidden rounded-[3rem] p-10 ${
                  course.level === 'Premium' || course.level === 'premium'
                    ? 'bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950' 
                    : 'bg-gradient-to-br from-amber-950 via-yellow-900 to-orange-950'
                }`}>
                  {/* Animated Background */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className={`absolute -top-1/2 -right-1/2 w-full h-full rounded-full blur-3xl opacity-20 animate-pulse ${
                      course.level === 'Premium' || course.level === 'premium' ? 'bg-violet-400' : 'bg-amber-400'
                    }`}></div>
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        course.level === 'Premium' || course.level === 'premium'
                          ? 'bg-gradient-to-br from-violet-400 to-purple-600 text-white' 
                          : 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950'
                      }`}>
                        {course.level === 'Premium' || course.level === 'premium' ? <Crown size={28} /> : <Diamond size={28} />}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-white">{t('syllabusPage.completeLearningPackage')}</h4>
                        <p className="text-white/50 text-sm">{t('syllabusPage.everythingForSuccess')}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {((course.level === 'Premium' || course.level === 'premium')
                        ? (t('premiumFeatures', { returnObjects: true }) as string[]).map((text, i) => ({ icon: PREMIUM_FEATURE_ICONS[i], text }))
                        : (t('goldFeatures', { returnObjects: true }) as string[]).map((text, i) => ({ icon: GOLD_FEATURE_ICONS[i], text }))
                      ).map((feature, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-all">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            course.level === 'Premium' || course.level === 'premium' ? 'bg-violet-500/30 text-violet-300' : 'bg-amber-500/30 text-amber-300'
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
                        {t('shared.trustBadges.securePayment')}
                      </div>
                      <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-wider">
                        <Award size={14} />
                        {t('shared.trustBadges.certificateIncluded')}
                      </div>
                      <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-wider">
                        <MessageCircle size={14} />
                        {t('shared.trustBadges.sixDaysSupport')}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Teaching Materials Add-on */}
                <div 
                  role="checkbox"
                  aria-checked={teachingMaterialsSelected}
                  aria-label="Include teaching materials add-on for €50"
                  tabIndex={0}
                  className={`rounded-[3rem] p-10 border-2 transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-black ${
                    teachingMaterialsSelected 
                      ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-400 shadow-lg shadow-amber-500/20' 
                      : 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:border-amber-500/50'
                  }`}
                  onClick={() => onToggleTeachingMaterials?.(!teachingMaterialsSelected)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleTeachingMaterials?.(!teachingMaterialsSelected); } }}
                >
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                        teachingMaterialsSelected 
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30' 
                          : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/20'
                      }`}>
                        <BookOpen size={24} className="text-white" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-white uppercase tracking-tight">{t('syllabusPage.teachingMaterials.title')}</h4>
                        <p className="text-amber-400 font-bold text-lg">{t('syllabusPage.teachingMaterials.price')} <span className="text-sm font-normal text-amber-500/70">{t('syllabusPage.teachingMaterials.priceNote')}</span></p>
                      </div>
                    </div>
                    {/* Checkbox */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTeachingMaterials?.(!teachingMaterialsSelected);
                      }}
                      className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${
                        teachingMaterialsSelected 
                          ? 'bg-amber-500 border-amber-500 text-white' 
                          : 'bg-white/5 border-amber-500/50 hover:border-amber-400'
                      }`}
                    >
                      {teachingMaterialsSelected && <Check size={18} strokeWidth={3} />}
                    </button>
                  </div>
                  <p className="text-gray-400 leading-relaxed mb-4">
                    {t('syllabusPage.teachingMaterials.description')}
                  </p>
                  <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-2 w-fit transition-all ${
                    teachingMaterialsSelected 
                      ? 'text-green-400 bg-green-500/20' 
                      : 'text-amber-400 bg-amber-500/20'
                  }`}>
                    {teachingMaterialsSelected ? (
                      <>
                        <Check size={16} />
                        <span className="font-medium">{t('syllabusPage.teachingMaterials.added')}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span className="font-medium">{t('syllabusPage.teachingMaterials.clickToAdd')}</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Method Description */}
                <div className="bg-white/5 rounded-[3rem] p-10 border border-white/10">
                  <h4 className="text-xl font-black text-white mb-4 uppercase tracking-tight">{t('syllabusPage.theEduwayMethod')}</h4>
                  <p className="text-gray-400 leading-relaxed">
                    {course.level === 'Premium' || course.level === 'premium'
                      ? t('syllabusPage.eduwayMethodPremium')
                      : t('syllabusPage.eduwayMethodGold')
                    }
                  </p>
                </div>
              </div>
            ) : grammarUnits.length > 0 ? (
              /* Unit Content Display for A1, A2, B1, Kids */
              <div className="space-y-4">
                <p className="text-gray-400 text-sm mb-6">
                  {(() => {
                    const key = (course.level === 'kids-basic' || course.level === 'kids-medium') ? 'shared.unitCountMessage' : 'shared.unitCountMessageAlt';
                    const parts = (t(key, { count: grammarUnits.length }) as string).split(/<1>|<\/1>/);
                    return parts.length === 3 ? <>{parts[0]}<span className="font-bold text-white">{parts[1]}</span>{parts[2]}</> : t(key, { count: grammarUnits.length });
                  })()}
                </p>
                
                {grammarUnits.map((unit, i) => {
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
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('shared.topics', { count: (unit.topics || []).length })}</span>
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
            ) : modules.length === 0 ? (
              <div className="bg-white/5 rounded-[3rem] p-12 text-center border border-white/10">
                <BookOpen size={48} className="text-gray-500 mx-auto mb-4" />
                <h4 className="text-xl font-black text-white mb-2">{t('shared.contentComingSoonTitle')}</h4>
                <p className="text-gray-400">{t('shared.contentComingSoonAlt')}</p>
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
                    className="text-[10px] font-black uppercase tracking-widest text-[#AB8FFF] hover:text-purple-300 transition-colors"
                  >
                    {expandedModules.size === modules.length ? t('shared.collapseAll') : t('shared.expandAll')}
                  </button>
                </div>
                
                {modules.map((module, i) => {
                  const isExpanded = expandedModules.has(module.id);
                  const lessonCount = module.lessons?.length || 0;
                  const totalModuleDuration = (module.lessons || []).reduce((sum, l) => sum + (parseInt(l.duration) || 0), 0);
                  
                  return (
                    <div key={module.id} className="bg-white/5 rounded-[2rem] border border-white/10 shadow-sm hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 overflow-hidden">
                      {/* Module Header - Clickable */}
                      <button 
                        onClick={() => toggleModule(module.id)}
                        className="w-full p-6 md:p-8 flex items-center justify-between gap-4 text-left hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white font-black text-lg shadow-lg`}>
                            {i + 1}
                          </div>
                          <div>
                            <h5 className="text-lg md:text-xl font-black text-white tracking-tight">{module.title}</h5>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('shared.lessonsCount', { count: lessonCount })}</span>
                              {totalModuleDuration > 0 && (
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('shared.durationMinutes', { count: totalModuleDuration })}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown size={20} className="text-gray-400" />
                        </div>
                      </button>
                      
                      {/* Module Content - Expandable */}
                      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        <div className="px-6 md:px-8 pb-6 md:pb-8 pt-0">
                          {module.description && (
                            <p className="text-gray-400 text-sm mb-6 pl-16">{module.description}</p>
                          )}
                          
                          <div className="pl-16 space-y-3">
                            {(module.lessons || []).map((lesson, j) => (
                              <div key={lesson.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl group hover:bg-purple-500/10 transition-colors">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                  lesson.type === 'video' ? 'bg-purple-500/20 text-purple-400' :
                                  lesson.type === 'reading' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-green-500/20 text-green-400'
                                }`}>
                                  {lesson.type === 'video' && <Play size={18} />}
                                  {lesson.type === 'reading' && <FileText size={18} />}
                                  {lesson.type === 'quiz' && <Target size={18} />}
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm font-bold text-gray-300 block">{lesson.title}</span>
                                  <span className="text-xs text-gray-500">{lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)} â€¢ {lesson.duration}</span>
                                </div>
                                <Lock size={14} className="text-gray-500 group-hover:text-purple-400" />
                              </div>
                            ))}
                            
                            {(module.homework?.length || 0) > 0 && (
                              <div className="mt-4 pt-4 border-t border-white/10">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-3">{t('shared.practiceHomework')}</span>
                                {(module.homework || []).map((hw) => (
                                  <div key={hw.id} className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-xl mb-2">
                                    <FileText size={16} className="text-amber-400" />
                                    <span className="text-sm font-medium text-gray-300">{hw.title}</span>
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

            {/* ---- Vocabulary Topics (Kids Basic & Medium) ---- */}
            {(course.level === 'kids-basic' || course.level === 'kids-medium') && (
              <div className="mt-12">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-pink-500/20 rounded-2xl text-pink-400 border border-pink-500/30">
                    <BookOpen size={28} />
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tight uppercase">{t('shared.vocabularyTopics')}</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(t(`vocabularyTopics.${course.level}`, { returnObjects: true }) as string[]).map((topic, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-pink-500/30 transition-all">
                      <CheckCircle2 size={16} className="text-pink-400 flex-shrink-0" />
                      <span className="text-sm font-bold text-gray-300">{topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BOTTOM CTAs FOR THE SYLLABUS PAGE */}
            <div className="mt-20 p-12 bg-white/5 rounded-[4rem] border border-white/10 text-center animate-reveal relative overflow-hidden">
               {/* Decorative elements */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFC1F2] rounded-full blur-[60px] opacity-15 mix-blend-screen"></div>
               <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#AB8FFF] rounded-full blur-[50px] opacity-20 mix-blend-screen"></div>
               
               <div className="relative z-10">
                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 mb-6">
                   <Rocket size={16} className="text-[#AB8FFF]" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('shared.cta.badge')}</span>
                 </div>
                 <h4 className="text-3xl font-black text-white mb-4 tracking-tight">{t('shared.cta.titleAlt')}</h4>
                 <p className="text-gray-400 mb-10 font-medium max-w-lg mx-auto">
                   {t('shared.cta.descriptionSyllabus')}
                 </p>
                 <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button 
                      onClick={() => onEnroll(courseId)}
                      className={`group flex items-center justify-center gap-3 px-10 py-5 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all bg-gradient-to-r ${config.color}`}
                    >
                      {pricing.isFree ? t('shared.cta.startLearningFree') : t('shared.cta.enrollNowPrice', { price: displayPrice })}
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => onAddToCart(courseId)}
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
                        <><div className="w-4 h-4 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin" /> {t('shared.adding')}</>
                      ) : isInCart ? (
                        <><Check size={18} /> {t('shared.addedToCart')}</>
                      ) : (
                        <><ShoppingCart size={18} /> {t('shared.saveForLater')}</>
                      )}
                    </button>
                 </div>
                 
                 {/* Trust row */}
                 <div className="flex flex-wrap items-center justify-center gap-6 mt-10 pt-8 border-t border-white/10">
                   <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold">
                     <Shield size={14} />
                     <span>{t('shared.trustBadges.moneyBack')}</span>
                   </div>
                   <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold">
                     <Lock size={14} />
                     <span>{t('shared.trustBadges.secureCheckout')}</span>
                   </div>
                   <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold">
                     <Award size={14} />
                     <span>{t('shared.trustBadges.certificateIncluded')}</span>
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
