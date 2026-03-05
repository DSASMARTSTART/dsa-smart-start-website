import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, Download, FileText, CheckCircle2, Star, ShoppingCart, Check, ArrowRight, Layers, TrendingUp, Award, Music, Play, Clock, Shield, RefreshCcw, Sparkles, Target, GraduationCap, ChevronRight, ChevronDown, Heart, BadgeCheck, UserCheck, Rocket, Lock, FileCheck } from 'lucide-react';
import { coursesApi } from '../data/supabaseStore';
import { Course } from '../types';

// Fallback cover images for e-books (local assets)
const EBOOK_COVERS: Record<string, string> = {
  'A1': '/assets/ebooks/a1-cover.jpg',
  'A2': '/assets/ebooks/a2-cover.jpg',
  'B1': '/assets/ebooks/b1-cover.jpg',
  'B2': '/assets/ebooks/b2-cover.jpg',
  'kids-basic': '/assets/ebooks/kids-basic-cover.jpg',
  'kids-medium': '/assets/ebooks/kids-medium-cover.jpg',
  'kids-advanced': '/assets/ebooks/kids-advanced-cover.jpg',
};

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

interface EbookContentData {
  description: string;
  learningOutcomes: string[];
  whatYoullFind: string[];
  targetAudience: string[];
  units: { title: string; topics: string[] }[];
  examPrep?: string;
}

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
  const { t } = useTranslation('courses');
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
          <p className="text-gray-400 font-medium">{t('shared.loadingEbook')}</p>
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
          <h3 className="text-2xl font-black text-white mb-4">{t('shared.ebookNotFound')}</h3>
          <p className="text-gray-400 mb-8">{t('shared.ebookNotFoundDesc')}</p>
          <button onClick={onBack} className="px-8 py-4 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors">
            {t('shared.backToProducts')}
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
  const displayPrice = pricing.isFree ? t('shared.free') : `€${price}`;

  // Coming Soon: only B2 ebook is "coming soon" (no PDF yet)
  const isComingSoon = course.productType === 'ebook' && course.level === 'B2' && !course.ebookPdfUrl;
  
  // Content lookup: i18n ebookContent > syllabusContent > generic
  const rawEbookContent = t(`ebookContent.${course.level}`, { returnObjects: true });
  const hardcodedContent = typeof rawEbookContent === 'object' ? rawEbookContent as EbookContentData : undefined;
  const syllabusContent = course.syllabusContent;

  // Description
  const ebookDescription = course.description || hardcodedContent?.description || t('shared.defaultDescription', { label: t('shared.levelLabels.' + course.level, { defaultValue: config.label }) });

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
    outcomes = t('ebookDetail.defaultOutcomes', { returnObjects: true }) as string[];
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
    whatYoullFind = t('ebookDetail.defaultWhatYoullFind', { returnObjects: true }) as string[];
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
    targetAudiencePoints = t('ebookDetail.defaultTargetAudience', { returnObjects: true }) as string[];
  }
  const targetAudience = {
    description: course.targetAudienceInfo?.description || t('ebookDetail.defaultTargetAudienceDesc', { label: t('shared.levelLabels.' + course.level, { defaultValue: config.label }).toLowerCase() }),
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
            {t('shared.backToProducts')}
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#AB8FFF]">{t('shared.digitalEbook')}</span>
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
                {ebookDescription}
              </p>

              {/* Cambridge Exam Prep Badge */}
              {examPrep && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full border border-green-500/30">
                  <GraduationCap size={16} className="text-green-400" />
                  <span className="text-xs font-bold text-green-400">{t('shared.preparesFor', { exam: examPrep })}</span>
                </div>
              )}

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                    <Download size={20} className="text-[#AB8FFF]" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">{t('shared.instant')}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('shared.downloadLabel')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center">
                    <FileText size={20} className="text-pink-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">{t('shared.pdf')}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('shared.format')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                    <Shield size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">{t('shared.lifetime')}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('shared.access')}</p>
                  </div>
                </div>
              </div>

              {/* Price & CTA */}
              <div className="flex flex-wrap items-center gap-6 pt-4">
                {isComingSoon ? (
                  <div className="flex flex-col gap-4">
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#AB8FFF]/20 to-pink-500/20 rounded-full border border-[#AB8FFF]/30 animate-pulse">
                      <Clock size={18} className="text-[#AB8FFF]" />
                      <span className="text-lg font-black text-[#AB8FFF] uppercase tracking-widest">{t('shared.comingSoon')}</span>
                    </div>
                    <p className="text-gray-400 text-sm font-medium">{t('shared.comingSoonEbookDesc')}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      {hasActiveDiscount && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full w-fit animate-pulse">
                          <Sparkles size={14} className="text-white" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">{t('shared.limitedTimeOffer')}</span>
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
                        {t('shared.buyNow')}
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
                        {isAddingToCart ? t('shared.adding') : isInCart ? t('shared.added') : t('shared.addToCart')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right: E-book Cover & Video */}
            <div className="relative animate-reveal stagger-1">
              <div className="relative bg-white/5 rounded-[3rem] p-6 border border-white/10 shadow-2xl shadow-purple-500/10">
                {/* Cover Photo */}
                {(course.thumbnailUrl || EBOOK_COVERS[course.level]) ? (
                  <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden mb-4 shadow-lg">
                    <img 
                      src={course.thumbnailUrl || EBOOK_COVERS[course.level]} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Level badge on cover */}
                    <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-widest backdrop-blur-sm ${config.bgColor}/80 text-white border-white/30`}>
                      {course.level}
                    </div>
                  </div>
                ) : (
                  <div className={`relative w-full aspect-[3/4] rounded-3xl overflow-hidden mb-4 bg-gradient-to-br ${config.color} flex flex-col items-center justify-center`}>
                    <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                      <BookOpen size={36} className="text-white" />
                    </div>
                    <p className="text-lg font-bold text-white/80">{t('shared.digitalEbook')}</p>
                    <p className="text-sm text-white/60 mt-1">{t('shared.levelLabels.' + course.level, { defaultValue: config.label })}</p>
                  </div>
                )}

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
                    ? t('ebookDetail.videoDescriptionKids')
                    : t('ebookDetail.videoDescription')}
                </p>

                {/* Quick highlights */}
                <div className="space-y-3 px-2 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-base font-bold text-gray-300">{t('ebookDetail.highlights.lifetimeAccess')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-base font-bold text-gray-300">{t('ebookDetail.highlights.dyslexiaFriendly')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-base font-bold text-gray-300">{t('ebookDetail.highlights.worksOnAnyDevice')}</span>
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
                      {isAddingToCart ? t('shared.adding') : isInCart ? t('shared.added') : t('shared.addToCart')}
                    </button>
                    <button
                      onClick={() => {
                        onAddToCart(course.id);
                        window.location.hash = '#checkout';
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#AB8FFF] text-white px-4 py-3 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-[#9a7eef] transition-all shadow-lg shadow-purple-500/30 hover:-translate-y-0.5"
                    >
                      {t('shared.buyNow')}
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
                  {course.level.startsWith('kids') ? t('shared.whatYoullAchieveKids') : t('shared.whatYoullAchieve')}
                </h3>
              </div>
              <p className="text-gray-400 text-lg mb-8 font-medium">
                {course.level.startsWith('kids')
                  ? t('shared.outcomesIntroKids')
                  : t('shared.outcomesIntro')}
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
                <h4 className="text-2xl font-black mb-4 uppercase tracking-tight">{t('shared.dsaAdvantageTitle')}</h4>
                <p className="text-gray-400 text-sm leading-loose mb-6">
                  {(() => { const parts = (t('shared.dsaAdvantageDesc') as string).split(/<1>|<\/1>/); return parts.length === 3 ? <>{parts[0]}<span className="text-white italic underline underline-offset-4 decoration-purple-500 decoration-2">{parts[1]}</span>{parts[2]}</> : t('shared.dsaAdvantageDesc'); })()}
                </p>
                <p className="text-white text-sm font-bold mb-4 uppercase tracking-wide">{t('shared.dsaWhatMakesTheDifference')}</p>
                <div className="space-y-2">
                  {(t('shared.dsaTags', { returnObjects: true }) as string[]).map((tag, i) => (
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

            {/* ---- Who Is This For? ---- */}
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

            {/* ---- Our Promise ---- */}
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
                  <span className="text-xs font-black uppercase tracking-wider text-white">{t('shared.promise.lifetimeTitle')}</span>
                  <span className="text-[10px] text-gray-400 font-medium">{t('shared.promise.lifetimeDesc')}</span>
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
              <h3 className="text-3xl font-black text-white tracking-tight uppercase">{t('shared.unitContent')}</h3>
            </div>

            {units.length > 0 ? (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm mb-6">
                  {(() => { const parts = (t('shared.unitCountMessage', { count: units.length }) as string).split(/<1>|<\/1>/); return parts.length === 3 ? <>{parts[0]}<span className="font-bold text-white">{parts[1]}</span>{parts[2]}</> : t('shared.unitCountMessage', { count: units.length }); })()}
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
            ) : (
              <div className="bg-white/5 rounded-[3rem] p-12 text-center border border-white/10">
                <BookOpen size={48} className="text-gray-500 mx-auto mb-4" />
                <h4 className="text-xl font-black text-white mb-2">{t('shared.contentComingSoonTitle')}</h4>
                <p className="text-gray-400">{t('shared.contentComingSoonDesc')}</p>
              </div>
            )}

            {/* ---- Vocabulary Topics ---- */}
            {(course.level === 'kids-basic' || course.level === 'kids-medium' || course.level === 'kids-advanced' || course.level === 'A1' || course.level === 'A2' || course.level === 'B1') && (
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
                      <span className="text-sm font-black text-[#AB8FFF] uppercase tracking-widest">{t('shared.comingSoon')}</span>
                    </div>
                    <h4 className="text-3xl font-black text-white mb-4 tracking-tight">{t('shared.comingSoonEbookTitle')}</h4>
                    <p className="text-gray-400 mb-6 font-medium max-w-lg mx-auto">
                      {t('shared.comingSoonEbookDesc')}
                    </p>
                    <button
                      onClick={onBack}
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-xs font-black uppercase tracking-widest bg-white/5 border border-white/10 text-gray-400 hover:border-[#AB8FFF]/50 hover:text-[#AB8FFF] transition-all"
                    >
                      <ArrowLeft size={16} />
                      {t('shared.browseOtherEbooks')}
                    </button>
                  </>
                ) : (
                  <>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 mb-6">
                  <Rocket size={16} className="text-[#AB8FFF]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('shared.cta.badge')}</span>
                </div>
                <h4 className="text-3xl font-black text-white mb-4 tracking-tight">{t('shared.cta.title')}</h4>
                <p className="text-gray-400 mb-10 font-medium max-w-lg mx-auto">
                  {t('shared.cta.descriptionEbook')}
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button 
                    onClick={() => {
                      onAddToCart(course.id);
                      window.location.hash = '#checkout';
                    }}
                    className={`group flex items-center justify-center gap-3 px-10 py-5 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all bg-gradient-to-r ${config.color}`}
                  >
                    {t('shared.cta.buyNowPrice', { price: displayPrice })}
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
                    <Download size={14} />
                    <span>{t('shared.trustBadges.instantDownload')}</span>
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
