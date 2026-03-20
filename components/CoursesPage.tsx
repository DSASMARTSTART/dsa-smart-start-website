
import React, { useEffect, useRef, useState } from 'react';
import { Layers, Compass, Zap, Music, Play, Award, Star, ChevronRight, CheckCircle2, Clock, Sparkles, BookOpen, ShoppingCart, Check, Rocket, Shield, ArrowDown, Filter, Search, BarChart3, Globe, ArrowRight, Plus, Crown, Diamond, Users, Video, FileCheck, GraduationCap, FileText, MonitorPlay, Package, Briefcase, Eye, Baby } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { coursesApi, catalogApi } from '../data/supabaseStore';
import { Course, ProductType, TargetAudience } from '../types';
import { useLocalizedCourses } from '../hooks/useLocalizedCourse';
import WaveSeparator from './WaveSeparator';
import AssessmentPopup from './AssessmentPopup';

// Tab type for navigation
type CatalogTab = 'live' | 'ebooks';

// Category Selector Component — Two large visual cards matching the design
const CategorySelector: React.FC<{ activeTab: CatalogTab; onTabChange: (tab: CatalogTab) => void }> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation('courses');
  return (
    <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto">
      {/* Live Courses Card */}
      <button
        onClick={() => onTabChange('live')}
        className={`group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl border-2 transition-all duration-300 ${
          activeTab === 'live'
            ? 'border-[#25D366] bg-[#25D366]/10 shadow-lg shadow-[#25D366]/20 scale-[1.02]'
            : 'border-white/20 bg-white/5 hover:border-[#25D366]/50 hover:bg-white/10'
        }`}
      >
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform">
          <Users size={36} className="text-white" />
        </div>
        <span className="text-sm sm:text-base font-black text-white uppercase tracking-widest leading-tight text-center">{t('coursesPage.tabs.liveCourses').split('\n').map((l, i) => <React.Fragment key={i}>{i > 0 && <br/>}{l}</React.Fragment>)}</span>
      </button>

      {/* Ebook Card */}
      <button
        onClick={() => onTabChange('ebooks')}
        className={`group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl border-2 transition-all duration-300 ${
          activeTab === 'ebooks'
            ? 'border-[#25D366] bg-[#25D366]/10 shadow-lg shadow-[#25D366]/20 scale-[1.02]'
            : 'border-white/20 bg-white/5 hover:border-[#25D366]/50 hover:bg-white/10'
        }`}
      >
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#AB8FFF] to-pink-500 flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform">
          <FileText size={36} className="text-white" />
        </div>
        <span className="text-sm sm:text-base font-black text-white uppercase tracking-widest leading-tight text-center">{t('coursesPage.tabs.ebook')}</span>
      </button>

      {/* Interactive Courses Card — Coming Soon */}
      <div
        className="group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl border-2 border-white/20 bg-white/5 opacity-60 cursor-default"
      >
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[#AB8FFF] text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider">
          {t('coursesPage.tabs.comingSoon')}
        </span>
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg">
          <MonitorPlay size={36} className="text-white" />
        </div>
        <span className="text-sm sm:text-base font-black text-white uppercase tracking-widest leading-tight text-center">{t('coursesPage.tabs.interactiveCourses').split('\n').map((l, i) => <React.Fragment key={i}>{i > 0 && <br/>}{l}</React.Fragment>)}</span>
      </div>
    </div>
  );
};

// Level-based icons and colors
const LEVEL_CONFIG: Record<string, { icon: React.ReactNode; color: string; isPink?: boolean; isGold?: boolean; isPremium?: boolean }> = {
  'A1': { icon: <Layers size={28} />, color: 'from-blue-500 to-indigo-600' },
  'A2': { icon: <Compass size={28} />, color: 'from-indigo-500 to-purple-600' },
  'B1': { icon: <Zap size={28} />, color: 'from-purple-500 to-pink-500', isPink: true },
  'B2': { icon: <Award size={28} />, color: 'from-blue-600 to-cyan-500' },
  'kids-basic': { icon: <Music size={28} />, color: 'from-pink-400 to-rose-400', isPink: true },
  'kids-medium': { icon: <Play size={28} />, color: 'from-orange-400 to-pink-400', isPink: true },
  'kids-advanced': { icon: <Star size={28} />, color: 'from-purple-400 to-pink-500', isPink: true },
  'Kids': { icon: <Music size={28} />, color: 'from-pink-400 to-rose-400', isPink: true },
  'language-lab': { icon: <Users size={28} />, color: 'from-violet-600 to-purple-700' },
  'starter-path': { icon: <Compass size={28} />, color: 'from-sky-500 to-blue-600' },
  'language-lab-pro': { icon: <Crown size={28} />, color: 'from-emerald-500 to-teal-600' },
  'hybrid-pack': { icon: <Diamond size={28} />, color: 'from-amber-500 to-yellow-600' },
};

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

// Returns the best available cover image for an ebook
const getEbookCover = (course: { thumbnailUrl?: string; level: string }): string | undefined => {
  // Use DB thumbnail only if it's a real URL (not a placeholder path that doesn't exist)
  if (course.thumbnailUrl && !course.thumbnailUrl.startsWith('/assets/courses/')) {
    return course.thumbnailUrl;
  }
  return EBOOK_COVERS[course.level];
};

// Product type icons
const PRODUCT_TYPE_ICONS: Record<ProductType, React.ReactNode> = {
  'ebook': <FileText size={16} />,
  'learndash': <MonitorPlay size={16} />,
  'service': <Users size={16} />,
};

// Live course feature icons — keyed by level slug
const FEATURE_ICONS: Record<string, React.ReactNode[]> = {
  'language-lab': [<Users size={18} />, <Clock size={18} />, <FileCheck size={18} />],
  'starter-path': [<Video size={18} />, <Clock size={18} />, <FileCheck size={18} />],
  'language-lab-pro': [<Users size={18} />, <Clock size={18} />, <BookOpen size={18} />],
  'hybrid-pack': [<Users size={18} />, <Video size={18} />, <Clock size={18} />, <BookOpen size={18} />],
};

// Style config per live course level
const SERVICE_STYLES: Record<string, {
  bg: string; glow1: string; glow2: string;
  badgeGradient: string; badgeText: string; badgeShadow: string;
  iconGradient: string; iconText: string; iconShadow: string;
  priceText: string; featureBg: string; featureText: string;
  ctaGradient: string; ctaText: string; ctaShadow: string;
  label: string; icon: React.ReactNode;
}> = {
  'language-lab': {
    bg: 'bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950',
    glow1: 'bg-violet-400', glow2: 'bg-purple-500',
    badgeGradient: 'bg-gradient-to-r from-violet-500 to-purple-600', badgeText: 'text-white', badgeShadow: 'shadow-violet-500/30',
    iconGradient: 'bg-gradient-to-br from-violet-400 to-purple-600', iconText: 'text-white', iconShadow: 'shadow-violet-500/30',
    priceText: 'text-violet-300', featureBg: 'bg-violet-500/20', featureText: 'text-violet-400',
    ctaGradient: 'bg-gradient-to-r from-violet-500 to-purple-600', ctaText: 'text-white', ctaShadow: 'shadow-violet-500/30 hover:shadow-violet-500/50',
    label: 'Language Lab', icon: <Users size={14} />,
  },
  'starter-path': {
    bg: 'bg-gradient-to-br from-sky-950 via-blue-900 to-indigo-950',
    glow1: 'bg-sky-400', glow2: 'bg-blue-500',
    badgeGradient: 'bg-gradient-to-r from-sky-500 to-blue-600', badgeText: 'text-white', badgeShadow: 'shadow-sky-500/30',
    iconGradient: 'bg-gradient-to-br from-sky-400 to-blue-600', iconText: 'text-white', iconShadow: 'shadow-sky-500/30',
    priceText: 'text-sky-300', featureBg: 'bg-sky-500/20', featureText: 'text-sky-400',
    ctaGradient: 'bg-gradient-to-r from-sky-500 to-blue-600', ctaText: 'text-white', ctaShadow: 'shadow-sky-500/30 hover:shadow-sky-500/50',
    label: 'Starter Path', icon: <Compass size={14} />,
  },
  'language-lab-pro': {
    bg: 'bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-950',
    glow1: 'bg-emerald-400', glow2: 'bg-teal-500',
    badgeGradient: 'bg-gradient-to-r from-emerald-500 to-teal-600', badgeText: 'text-white', badgeShadow: 'shadow-emerald-500/30',
    iconGradient: 'bg-gradient-to-br from-emerald-400 to-teal-600', iconText: 'text-white', iconShadow: 'shadow-emerald-500/30',
    priceText: 'text-emerald-300', featureBg: 'bg-emerald-500/20', featureText: 'text-emerald-400',
    ctaGradient: 'bg-gradient-to-r from-emerald-500 to-teal-600', ctaText: 'text-white', ctaShadow: 'shadow-emerald-500/30 hover:shadow-emerald-500/50',
    label: 'Language Lab Pro', icon: <Crown size={14} />,
  },
  'hybrid-pack': {
    bg: 'bg-gradient-to-br from-amber-950 via-yellow-900 to-orange-950',
    glow1: 'bg-amber-400', glow2: 'bg-yellow-500',
    badgeGradient: 'bg-gradient-to-r from-amber-400 to-yellow-500', badgeText: 'text-amber-950', badgeShadow: 'shadow-amber-500/30',
    iconGradient: 'bg-gradient-to-br from-amber-400 to-yellow-500', iconText: 'text-amber-950', iconShadow: 'shadow-amber-500/30',
    priceText: 'text-amber-300', featureBg: 'bg-amber-500/20', featureText: 'text-amber-400',
    ctaGradient: 'bg-gradient-to-r from-amber-400 to-yellow-500', ctaText: 'text-amber-950', ctaShadow: 'shadow-amber-500/30 hover:shadow-amber-500/50',
    label: 'Hybrid Pack', icon: <Diamond size={14} />,
  },
};

const DEFAULT_SERVICE_STYLE = SERVICE_STYLES['language-lab'];

interface CourseCardProps {
  course: Course;
  idx: number;
  isInCart: boolean;
  onAddToCart: (course: Course) => void;
  onRemoveFromCart: (courseId: string) => void;
  onDetail?: () => void;
  onBuyNow?: () => void;
}

// Live Course Card Component — data-driven for all service levels
const PremiumCourseCard: React.FC<CourseCardProps> = ({ course, idx, isInCart, onAddToCart, onRemoveFromCart, onDetail, onBuyNow }) => {
  const { t } = useTranslation('courses');
  const s = SERVICE_STYLES[course.level] || DEFAULT_SERVICE_STYLE;
  const featureTexts = (t(`courseFeatures.${course.level}`, { returnObjects: true }) as string[]) || [];
  const featureIcons = FEATURE_ICONS[course.level] || [];
  
  const coursePrice = course.pricing?.price;
  const discountPrice = course.pricing?.discountPrice;
  
  const price = discountPrice !== undefined 
    ? `€${discountPrice.toFixed(0)}` 
    : (coursePrice !== undefined ? `€${coursePrice.toFixed(0)}` : t('shared.free'));
    
  const originalPrice = discountPrice !== undefined && coursePrice !== undefined
    ? `€${coursePrice.toFixed(0)}`
    : null;

  const savings = discountPrice !== undefined && coursePrice !== undefined
    ? coursePrice - discountPrice
    : 0;

  const navigateToDetail = () => {
    if (onDetail) { onDetail(); } else { window.location.hash = `#live-course-${course.id}`; }
  };

  return (
    <div className="pt-6">
      <div 
        onClick={navigateToDetail}
        className={`group relative overflow-visible rounded-[2rem] transition-all duration-700 hover:-translate-y-3 cursor-pointer ${s.bg}`}
      >
        {/* Animated Background Effects */}
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
          <div className={`absolute -top-1/2 -right-1/2 w-full h-full rounded-full blur-3xl opacity-20 animate-pulse ${s.glow1}`}></div>
          <div className={`absolute -bottom-1/2 -left-1/2 w-full h-full rounded-full blur-3xl opacity-10 animate-pulse delay-1000 ${s.glow2}`}></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        </div>

        {/* Top Badge */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-2xl ${s.badgeGradient} ${s.badgeText} ${s.badgeShadow}`}>
            {s.icon}
            {s.label}
          </div>
        </div>

        <div className="relative z-10 p-10 pt-14">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ${s.iconGradient} ${s.iconText} shadow-lg ${s.iconShadow}`}>
              {(SERVICE_STYLES[course.level] || DEFAULT_SERVICE_STYLE).icon ? React.cloneElement(s.icon as React.ReactElement, { size: 36 }) : <Users size={36} />}
            </div>
            {originalPrice && (
              <div className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider ${s.featureBg} ${s.priceText}`}>
                {t('coursesPage.liveCard.save', { amount: savings })}
              </div>
            )}
          </div>

          {/* Title & Price */}
          <div className="mb-8">
            <h3 className="text-2xl md:text-3xl font-black text-white mb-4 leading-tight">
              {course.title}
            </h3>
            
            <div className="flex items-end gap-4 mb-4">
              <span className={`text-5xl md:text-6xl font-black ${s.priceText}`}>{price}</span>
              {originalPrice && (
                <span className="text-xl font-bold text-white/40 line-through mb-2">{originalPrice}</span>
              )}
            </div>
            
            <p className="text-white/60 leading-relaxed text-sm line-clamp-3">
              {course.description}
            </p>
          </div>

          {/* Features List */}
          <div className="mb-10">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">{t('coursesPage.liveCard.whatsIncluded')}</div>
            <div className="space-y-3">
              {featureTexts.map((text, i) => (
                <div key={i} className="flex items-start gap-3 group/item">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover/item:scale-110 ${s.featureBg} ${s.featureText}`}>
                    {featureIcons[i] || <CheckCircle2 size={18} />}
                  </div>
                  <span className="text-white/80 text-sm font-medium leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Add to Cart */}
              <button 
                onClick={(e) => { e.stopPropagation(); isInCart ? onRemoveFromCart(course.id) : onAddToCart(course); }}
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                  isInCart
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                }`}
              >
                {isInCart ? <Check size={16} /> : <ShoppingCart size={16} />}
                {isInCart ? t('coursesPage.liveCard.inCart') : t('coursesPage.liveCard.addToCart')}
              </button>
              
              {/* Buy Now */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onBuyNow) { onBuyNow(); } else { onAddToCart(course); window.location.hash = '#checkout'; }
                }}
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all transform hover:scale-[1.02] active:scale-[0.98] ${s.ctaGradient} ${s.ctaText} shadow-xl ${s.ctaShadow}`}
              >
                {t('coursesPage.liveCard.buyNow')}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-wider">
              <Shield size={14} />
              {t('coursesPage.liveCard.securePayment')}
            </div>
            <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-wider">
              <Award size={14} />
              {t('coursesPage.liveCard.certificateIncluded')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CourseCard: React.FC<CourseCardProps> = ({ course, idx, isInCart, onAddToCart, onRemoveFromCart, onDetail, onBuyNow }) => {
  const { t } = useTranslation('courses');
  const config = LEVEL_CONFIG[course.level] || LEVEL_CONFIG['A1'];
  const isPink = config.isPink;
  const features = (course as any).features ? JSON.parse((course as any).features) : [];
  
  // Coming Soon: only B2 ebook is "coming soon" (no PDF yet)
  const isComingSoon = course.productType === 'ebook' && course.level === 'B2' && !course.ebookPdfUrl;

  // Calculate price with discount logic for display
  const coursePrice = course.pricing?.price;
  const discountPrice = course.pricing?.discountPrice;
  
  const price = discountPrice !== undefined 
    ? `€${discountPrice.toFixed(2)}` 
    : (coursePrice !== undefined ? `€${coursePrice.toFixed(2)}` : t('coursesPage.ebookCard.free'));
    
  const originalPrice = discountPrice !== undefined && coursePrice !== undefined
    ? `€${coursePrice.toFixed(2)}`
    : null;

  const navigateToDetail = () => {
    if (onDetail) { onDetail(); } else { window.location.hash = `#ebook-${course.id}`; }
  };

  return (
    <div className={`group relative bg-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl flex flex-col h-full border border-white/10 ${isPink ? 'hover:shadow-pink-500/20 hover:border-pink-500/30' : 'hover:shadow-purple-500/20 hover:border-purple-500/30'}`}>
      
      {/* Popular Badge */}
      {idx === 1 && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[#AB8FFF] to-pink-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/30 flex items-center gap-2 z-10">
          <Star size={12} fill="currentColor" />
          {t('coursesPage.ebookCard.mostPopular')}
        </div>
      )}

      {/* Clickable Thumbnail Photo (vertical/portrait) */}
      <div 
        className="relative w-full aspect-[3/4] bg-white/5 cursor-pointer"
        onClick={navigateToDetail}
      >
        {getEbookCover(course) ? (
          <img 
            src={getEbookCover(course)} 
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${config.color} flex flex-col items-center justify-center text-white`}>
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
              {config.icon}
            </div>
            <p className="text-sm font-bold text-white/80">{t('coursesPage.ebookCard.digitalEbook')}</p>
          </div>
        )}
        {/* Level Badge */}
        <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-widest backdrop-blur-sm ${isPink ? 'bg-pink-500/80 text-white border-pink-400/50' : 'bg-indigo-500/80 text-white border-indigo-400/50'}`}>
          {t('coursesPage.ebookCard.level', { level: course.level })}
        </div>
        {/* Coming Soon overlay */}
        {isComingSoon && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-black/60 backdrop-blur-sm rounded-full border border-[#AB8FFF]/40 animate-pulse">
              <Clock size={14} className="text-[#AB8FFF]" />
              <span className="text-sm font-black text-[#AB8FFF] uppercase tracking-widest">{t('coursesPage.ebookCard.comingSoon')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-6 flex flex-col flex-grow">
        <div className="cursor-pointer" onClick={navigateToDetail}>
          <h3 className="text-xl font-black text-white mb-3 leading-tight group-hover:text-[#AB8FFF] transition-colors">
            {course.title}
          </h3>
          
          {!isComingSoon && (
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-black text-white">{price}</span>
              {originalPrice && (
                <span className="text-sm font-bold text-gray-500 line-through decoration-pink-500">{originalPrice}</span>
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        {!isComingSoon && (
          <div className="grid grid-cols-2 gap-2 mt-auto">
            {/* Add to Cart */}
            <button 
              onClick={(e) => { e.stopPropagation(); isInCart ? onRemoveFromCart(course.id) : onAddToCart(course); }}
              className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                isInCart
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {isInCart ? <Check size={12} /> : <ShoppingCart size={12} />}
              {isInCart ? t('coursesPage.ebookCard.inCart') : t('coursesPage.ebookCard.addToCart')}
            </button>
            
            {/* Buy Now */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onBuyNow) { onBuyNow(); } else { onAddToCart(course); window.location.hash = '#checkout'; }
              }}
              className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-white text-[10px] font-black uppercase tracking-wider shadow-lg transition-all transform active:scale-95 ${
                isPink
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:shadow-pink-500/30'
                  : 'bg-[#AB8FFF] hover:bg-[#9a7eef] hover:shadow-purple-500/30'
              }`}>
              {t('coursesPage.ebookCard.buyNow')}
              <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface CoursesPageProps {
  onNavigate?: (path: string, params?: string) => void;
  onSelectCourse?: (id: string) => void;
  onEnroll?: (id: string) => void;
  cart?: string[];
  onAddToCart?: (id: string) => void;
  defaultTab?: CatalogTab;
}

const CoursesPage: React.FC<CoursesPageProps> = ({ 
  onNavigate, 
  onSelectCourse, 
  onEnroll, 
  cart: externalCart = [], 
  onAddToCart: externalAddToCart,
  defaultTab 
}) => {
  const { t } = useTranslation('courses');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [internalCart, setInternalCart] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<CatalogTab>(defaultTab || 'live');
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentType, setAssessmentType] = useState<'teens_adults' | 'kids'>('teens_adults');
  const [showEbookAssessment, setShowEbookAssessment] = useState(false);
  const [ebookAssessmentType, setEbookAssessmentType] = useState<'teens_adults' | 'kids'>('teens_adults');

  const handleOpenAssessment = (type: 'teens_adults' | 'kids') => {
    setAssessmentType(type);
    setShowAssessment(true);
  };

  // Sync activeTab when defaultTab prop changes
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const handleOpenEbookAssessment = (type: 'teens_adults' | 'kids') => {
    setEbookAssessmentType(type);
    setShowEbookAssessment(true);
  };

  // Navigate to a specific ebook by matching level + audience
  const handleRecommendEbook = (level: string) => {
    const audience = ebookAssessmentType === 'kids' ? 'kids' : 'adults_teens';
    const match = courses.find(
      (c) => c.productType === 'ebook' && c.level === level && c.targetAudience === audience
    );
    if (match) {
      if (onNavigate) { onNavigate('ebook', match.id); } else { window.location.hash = `#ebook-${match.id}`; }
    } else {
      // Fallback: just go to ebooks tab
      setActiveTab('ebooks');
    }
  };

  // Use external cart if provided, otherwise internal
  const cartIds = externalCart.length > 0 ? externalCart : internalCart.map(c => c.id);

  const addToCart = (course: Course) => {
    if (externalAddToCart) {
      externalAddToCart(course.id);
    } else {
      setInternalCart(prev => [...prev, course]);
    }
  };

  const removeFromCart = (courseId: string) => {
    setInternalCart(prev => prev.filter(c => c.id !== courseId));
  };

  const cartTotal = internalCart.reduce((sum, c) => {
    const price = c.pricing?.discountPrice ?? c.pricing?.price ?? 0;
    return sum + price;
  }, 0);

  // Localise course titles & descriptions for the current language
  const localizedCourses = useLocalizedCourses(courses);

  // Separate courses by category - New catalog structure
  const serviceCourses = localizedCourses.filter(c => c.productType === 'service');
  const ebookCourses = localizedCourses.filter(c => c.productType === 'ebook');
  const learndashCourses = localizedCourses.filter(c => c.productType === 'learndash');
  
  // Split by audience and sort by level
  const LEVEL_ORDER: Record<string, number> = {
    'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4,
    'kids-basic': 1, 'kids-medium': 2, 'kids-advanced': 3,
  };
  const sortByLevel = (a: Course, b: Course) => (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99);
  
  const adultEbooks = ebookCourses.filter(c => c.targetAudience === 'adults_teens').sort(sortByLevel);
  const kidsEbooks = ebookCourses.filter(c => c.targetAudience === 'kids').sort(sortByLevel);
  const adultLearndash = learndashCourses.filter(c => c.targetAudience === 'adults_teens');
  const kidsLearndash = learndashCourses.filter(c => c.targetAudience === 'kids');
  
  // Services (Premium & Golden programs) — Language Lab first, then Language Lab Pro
  const SERVICE_ORDER: Record<string, number> = { 'language-lab': 1, 'language-lab-pro': 2 };
  const premiumCourses = serviceCourses.sort((a, b) => (SERVICE_ORDER[a.level] ?? 99) - (SERVICE_ORDER[b.level] ?? 99));

  useEffect(() => {
    const loadCourses = async () => {
      setLoadError(null);
      try {
        const data = await coursesApi.list({ isPublished: true });
        console.log('Loaded courses:', data?.length || 0, 'courses');
        setCourses(data || []);
      } catch (error) {
        console.error("Failed to load courses", error);
        setCourses([]); // Ensure we set empty array on error
        setLoadError('Unable to load courses. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
  }, []);

  // Retry function for manual retry
  const retryLoadCourses = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await coursesApi.list({ isPublished: true });
      setCourses(data || []);
    } catch (error) {
      console.error("Failed to load courses on retry", error);
      setLoadError('Unable to load courses. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const moveX = (clientX - window.innerWidth / 2) / 50;
      const moveY = (clientY - window.innerHeight / 2) / 50;
      setMousePos({ x: moveX, y: moveY });
    };
    window.addEventListener('mousemove', handleMouseMove);

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
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.3 + 0.1,
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
        ctx.fillStyle = `rgba(171, 143, 255, ${p.opacity})`;
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
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        {/* Hero Skeleton */}
        <div className="relative w-full min-h-[70vh] flex flex-col items-center justify-center bg-black pt-36 pb-24">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FFC1F2] rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#AB8FFF] rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-pulse-slow delay-1000"></div>
          </div>
          <div className="flex flex-col items-center gap-8 animate-pulse relative z-10">
            <div className="h-4 w-48 bg-white/10 rounded-full"></div>
            <div className="flex gap-4">
              <div className="h-16 sm:h-24 w-48 sm:w-64 bg-white/10 rounded-2xl"></div>
              <div className="h-16 sm:h-24 w-56 sm:w-72 bg-purple-500/20 rounded-2xl"></div>
            </div>
            <div className="h-6 w-96 max-w-full bg-white/5 rounded-full"></div>
            <div className="h-14 w-48 bg-purple-500/20 rounded-full mt-4"></div>
          </div>
        </div>
        
        {/* Course Cards Skeleton */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="flex items-center gap-6 mb-12 animate-pulse">
            <div className="h-4 w-32 bg-white/10 rounded-full"></div>
            <div className="h-[1px] flex-grow bg-white/10"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 rounded-[2rem] border border-white/10 p-8 animate-pulse">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl"></div>
                  <div className="h-6 w-16 bg-white/5 rounded-full"></div>
                </div>
                <div className="h-6 w-3/4 bg-white/10 rounded-lg mb-3"></div>
                <div className="h-4 w-full bg-white/5 rounded mb-2"></div>
                <div className="h-4 w-2/3 bg-white/5 rounded mb-6"></div>
                <div className="flex gap-2 mb-6">
                  <div className="h-6 w-20 bg-purple-500/20 rounded-full"></div>
                  <div className="h-6 w-24 bg-purple-500/20 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <div className="h-8 w-20 bg-white/10 rounded-lg"></div>
                  <div className="h-10 w-28 bg-purple-500/20 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">{t('coursesPage.error.title')}</h2>
          <p className="text-gray-400 mb-6">{loadError}</p>
          <button
            onClick={retryLoadCourses}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-full hover:shadow-lg hover:shadow-purple-500/30 transition-all hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('coursesPage.error.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen">
      {/* Hero Header Section */}
      <div className="relative w-full min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-black pt-36 pb-32">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FFC1F2] rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#AB8FFF] rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-pulse-slow delay-1000"></div>
          <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60 pointer-events-none" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center -translate-y-6 sm:-translate-y-8"
             style={{ transform: `translate(${mousePos.x * 0.15}px, ${mousePos.y * 0.15}px)` }}>
          
          <div className="flex items-center gap-4 mb-8 sm:mb-12 opacity-80 animate-reveal">
            <div className="h-[1px] w-8 bg-[#AB8FFF]"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-300">{t('coursesPage.hero.badge')}</span>
            <div className="h-[1px] w-8 bg-[#AB8FFF]"></div>
          </div>

          <div className="relative flex flex-col items-center mb-10 w-full">
            <h1 className="text-4xl sm:text-7xl md:text-9xl font-black text-white tracking-tighter leading-[0.9] animate-reveal transition-transform duration-500 flex flex-wrap justify-center gap-x-2 sm:gap-x-6"
                style={{ transform: `translate(${mousePos.x * 0.3}px, ${mousePos.y * 0.3}px)` }}>
              <span>{t('coursesPage.hero.titleLine1')}</span> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-[#AB8FFF] to-pink-500 ">{t('coursesPage.hero.titleLine2')}</span>
            </h1>
          </div>

          <div className="max-w-3xl animate-reveal stagger-1 flex flex-col items-center" style={{ transform: `translate(${mousePos.x * 0.1}px, ${mousePos.y * 0.1}px)` }}>
             <p className="text-lg sm:text-xl md:text-3xl font-medium text-gray-300 text-center uppercase tracking-tight leading-snug mb-10">
               {t('coursesPage.hero.subtitle', { returnObjects: false }).split('<1>').map((part: string, i: number) => {
                 if (i === 0) return part;
                 const [highlighted, rest] = part.split('</1>');
                 return <React.Fragment key={i}><span className="text-[#AB8FFF] font-bold">{highlighted}</span>{rest}</React.Fragment>;
               })}
               <br/>
               <span className="text-base sm:text-lg md:text-xl text-gray-400 normal-case mt-4 block">{t('coursesPage.hero.subtitleSecondary')}</span>
             </p>


          </div>
        </div>

        <WaveSeparator color="fill-black" />
      </div>

      {/* Course Listing */}
      <div id="courses-grid" className="max-w-7xl mx-auto px-6 py-24">
        
        {/* ============================================ */}
        {/* PILL TAB NAVIGATION                          */}
        {/* ============================================ */}
        <div className="flex justify-center mb-16">
          <CategorySelector activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* ============================================ */}
        {/* LIVE COURSES TAB                             */}
        {/* ============================================ */}
        {activeTab === 'live' && (
          <div className="animate-fadeIn">
            {/* Section Header */}
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-violet-400"></div>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-amber-500/20 border border-violet-500/30">
                  <Briefcase size={14} className="text-violet-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">{t('coursesPage.liveSection.badge')}</span>
                </div>
                <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-amber-400"></div>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                {t('coursesPage.liveSection.title', { returnObjects: false }).split('<1>').map((part: string, i: number) => {
                  if (i === 0) return part;
                  const [highlighted, rest] = part.split('</1>');
                  return <React.Fragment key={i}><span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-amber-400">{highlighted}</span>{rest}</React.Fragment>;
                })}
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                {t('coursesPage.liveSection.description')}
              </p>
            </div>
            
            {/* Premium Cards Grid */}
            {premiumCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-reveal stagger-1">
                {premiumCourses.map((course, idx) => (
                  <PremiumCourseCard 
                    key={course.id || idx} 
                    course={course} 
                    idx={idx}
                    isInCart={cartIds.includes(course.id)}
                    onAddToCart={addToCart}
                    onRemoveFromCart={removeFromCart}
                    onDetail={onNavigate ? () => onNavigate('live-course', course.id) : undefined}
                    onBuyNow={onEnroll ? () => onEnroll(course.id) : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-violet-400">
                  <Users size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t('coursesPage.emptyStates.liveComingSoonTitle')}</h3>
                <p className="text-gray-400 font-medium max-w-md mx-auto">
                  {t('coursesPage.emptyStates.liveComingSoonDesc')}
                </p>
              </div>
            )}

            {/* Interactive Courses Sub-section */}
            {(adultLearndash.length > 0 || kidsLearndash.length > 0) && (
              <div className="mt-24">
                <div className="text-center mb-16">
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-[#AB8FFF]"></div>
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#AB8FFF]/20 border border-[#AB8FFF]/30">
                      <MonitorPlay size={14} className="text-[#AB8FFF]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#AB8FFF]">{t('coursesPage.interactiveSection.badge')}</span>
                    </div>
                    <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-[#AB8FFF]"></div>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                    {t('coursesPage.interactiveSection.title', { returnObjects: false }).split('<1>').map((part: string, i: number) => {
                      if (i === 0) return part;
                      const [highlighted, rest] = part.split('</1>');
                      return <React.Fragment key={i}><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#AB8FFF] to-pink-500">{highlighted}</span>{rest}</React.Fragment>;
                    })}
                  </h2>
                  <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    {t('coursesPage.interactiveSection.description')}
                  </p>
                </div>

                {/* Adults & Teens Interactive */}
                {adultLearndash.length > 0 && (
                  <div className="mb-16">
                    <div className="flex items-center gap-6 mb-6">
                      <div className="flex items-center gap-3">
                        <MonitorPlay size={20} className="text-[#AB8FFF]" />
                        <h3 className="text-2xl font-black text-white whitespace-nowrap">{t('coursesPage.audienceLabels.adultsTeens')}</h3>
                      </div>
                      <div className="h-[2px] flex-grow bg-gradient-to-r from-[#AB8FFF] to-transparent rounded-full"></div>
                    </div>

                    <div className="mb-8 flex justify-center">
                      <button 
                        onClick={() => handleOpenAssessment('teens_adults')}
                        className="inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-8 py-4 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#25D366]/30 active:scale-95"
                      >
                        <GraduationCap size={20} />
                        {t('coursesPage.assessmentButtons.takeTestTeens')}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-reveal stagger-1">
                      {adultLearndash.map((course, idx) => (
                        <CourseCard 
                          key={course.id || idx} 
                          course={course} 
                          idx={idx}
                          isInCart={cartIds.includes(course.id)}
                          onAddToCart={addToCart}
                          onRemoveFromCart={removeFromCart}
                          onDetail={onNavigate ? () => onNavigate('ebook', course.id) : undefined}
                          onBuyNow={onEnroll ? () => onEnroll(course.id) : undefined}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Kids Interactive */}
                {kidsLearndash.length > 0 && (
                  <div className="mb-16">
                    <div className="flex items-center gap-6 mb-6">
                      <div className="flex items-center gap-3">
                        <MonitorPlay size={20} className="text-pink-400" />
                        <h3 className="text-2xl font-black text-white whitespace-nowrap">{t('coursesPage.audienceLabels.kids')}</h3>
                      </div>
                      <div className="h-[2px] flex-grow bg-gradient-to-r from-pink-400 to-transparent rounded-full"></div>
                    </div>

                    <div className="mb-8 flex justify-center">
                      <button 
                        onClick={() => handleOpenAssessment('kids')}
                        className="inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-8 py-4 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#25D366]/30 active:scale-95"
                      >
                        <Baby size={20} />
                        {t('coursesPage.assessmentButtons.takeTestKids')}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-reveal stagger-1">
                      {kidsLearndash.map((course, idx) => (
                        <CourseCard 
                          key={course.id || idx} 
                          course={course} 
                          idx={idx}
                          isInCart={cartIds.includes(course.id)}
                          onAddToCart={addToCart}
                          onRemoveFromCart={removeFromCart}
                          onDetail={onNavigate ? () => onNavigate('ebook', course.id) : undefined}
                          onBuyNow={onEnroll ? () => onEnroll(course.id) : undefined}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* E-BOOKS TAB                                  */}
        {/* ============================================ */}
        {activeTab === 'ebooks' && (
          <div className="animate-fadeIn">
            {/* Section Header */}
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-[#AB8FFF]"></div>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#AB8FFF]/20 border border-[#AB8FFF]/30">
                  <FileText size={14} className="text-[#AB8FFF]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#AB8FFF]">{t('coursesPage.ebookSection.badge')}</span>
                </div>
                <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-[#AB8FFF]"></div>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                {t('coursesPage.ebookSection.title', { returnObjects: false }).split('<1>').map((part: string, i: number) => {
                  if (i === 0) return part;
                  const [highlighted, rest] = part.split('</1>');
                  return <React.Fragment key={i}><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#AB8FFF] to-pink-500">{highlighted}</span>{rest}</React.Fragment>;
                })}
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                {t('coursesPage.ebookSection.description')}
              </p>
            </div>

            {/* Adults & Teens E-books */}
            {adultEbooks.length > 0 && (
              <div className="mb-16">
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-[#AB8FFF]" />
                    <h3 className="text-2xl font-black text-white whitespace-nowrap">{t('coursesPage.audienceLabels.adultsTeens')}</h3>
                  </div>
                  <div className="h-[2px] flex-grow bg-gradient-to-r from-[#AB8FFF] to-transparent rounded-full"></div>
                </div>

                {/* Adults Assessment Test Button */}
                <div className="mb-8 flex justify-center">
                  <button 
                    onClick={() => handleOpenEbookAssessment('teens_adults')}
                    className="inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-8 py-4 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#25D366]/30 active:scale-95"
                  >
                    <GraduationCap size={20} />
                    {t('coursesPage.assessmentButtons.findLevelTeens')}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-reveal stagger-1">
                  {adultEbooks.map((course, idx) => (
                    <CourseCard 
                      key={course.id || idx} 
                      course={course} 
                      idx={idx}
                      isInCart={cartIds.includes(course.id)}
                      onAddToCart={addToCart}
                      onRemoveFromCart={removeFromCart}
                      onDetail={onNavigate ? () => onNavigate('ebook', course.id) : undefined}
                      onBuyNow={onEnroll ? () => onEnroll(course.id) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Kids E-books */}
            {kidsEbooks.length > 0 && (
              <div className="mb-16">
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-pink-400" />
                    <h3 className="text-2xl font-black text-white whitespace-nowrap">{t('coursesPage.audienceLabels.kids')}</h3>
                  </div>
                  <div className="h-[2px] flex-grow bg-gradient-to-r from-pink-400 to-transparent rounded-full"></div>
                </div>

                {/* Kids Assessment Test Button */}
                <div className="mb-8 flex justify-center">
                  <button 
                    onClick={() => handleOpenEbookAssessment('kids')}
                    className="inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-8 py-4 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#25D366]/30 active:scale-95"
                  >
                    <Baby size={20} />
                    {t('coursesPage.assessmentButtons.findLevelKids')}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-reveal stagger-1">
                  {kidsEbooks.map((course, idx) => (
                    <CourseCard 
                      key={course.id || idx} 
                      course={course} 
                      idx={idx}
                      isInCart={cartIds.includes(course.id)}
                      onAddToCart={addToCart}
                      onRemoveFromCart={removeFromCart}
                      onDetail={onNavigate ? () => onNavigate('ebook', course.id) : undefined}
                      onBuyNow={onEnroll ? () => onEnroll(course.id) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {adultEbooks.length === 0 && kidsEbooks.length === 0 && (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-400">
                  <FileText size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t('coursesPage.emptyStates.ebooksComingSoonTitle')}</h3>
                <p className="text-gray-400 font-medium max-w-md mx-auto">
                  {t('coursesPage.emptyStates.ebooksComingSoonDesc')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Global Empty State - No courses at all */}
        {courses.length === 0 && !loading && (
           <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
             <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
               <BookOpen size={24} />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">{t('coursesPage.emptyStates.coursesComingSoonTitle')}</h3>
             <p className="text-gray-400 font-medium max-w-md mx-auto">
               {t('coursesPage.emptyStates.coursesComingSoonDesc')}
             </p>
           </div>
        )}
      </div>

      {/* Assessment Popup (Interactive Courses) */}
      <AssessmentPopup
        isOpen={showAssessment}
        onClose={() => setShowAssessment(false)}
        testType={assessmentType}
        onNavigate={onNavigate}
      />

      {/* Assessment Popup (E-books — recommends next level) */}
      <AssessmentPopup
        isOpen={showEbookAssessment}
        onClose={() => setShowEbookAssessment(false)}
        testType={ebookAssessmentType}
        onNavigate={onNavigate}
        recommendNextLevel
        onRecommendEbook={handleRecommendEbook}
      />
    </div>
  );
};

export default CoursesPage;
