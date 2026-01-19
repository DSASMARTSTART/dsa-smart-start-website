
import React, { useEffect, useRef, useState } from 'react';
import { Layers, Compass, Zap, Music, Play, Award, Star, ChevronRight, CheckCircle2, Clock, Sparkles, BookOpen, ShoppingCart, Check, Rocket, Shield, ArrowDown, Filter, Search, BarChart3, Globe, ArrowRight, Plus, Crown, Diamond, Users, Video, Brain, Headphones, FileCheck, MessageCircle, GraduationCap, FileText, MonitorPlay, Package, Briefcase, Eye } from 'lucide-react';
import { coursesApi, catalogApi } from '../data/supabaseStore';
import { Course, ProductType, TargetAudience } from '../types';
import WaveSeparator from './WaveSeparator';

// Tab type for navigation
type CatalogTab = 'services' | 'interactive' | 'ebooks';

// Pill Tab Navigation Component
const TabNavigation: React.FC<{ activeTab: CatalogTab; onTabChange: (tab: CatalogTab) => void }> = ({ activeTab, onTabChange }) => {
  const tabs: { id: CatalogTab; label: string; icon: React.ReactNode }[] = [
    { id: 'services', label: 'Online Courses', icon: <Users size={18} /> },
    { id: 'interactive', label: 'Interactive Courses', icon: <MonitorPlay size={18} /> },
    { id: 'ebooks', label: 'E-books', icon: <FileText size={18} /> },
  ];

  return (
    <div className="flex items-center justify-center gap-2 p-2 bg-gray-100/80 backdrop-blur-sm rounded-full shadow-inner">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 ${
            activeTab === tab.id
              ? 'bg-gradient-to-r from-[#AB8FFF] to-purple-600 text-white shadow-lg shadow-purple-200 scale-105'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          {tab.icon}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
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
  'premium': { icon: <Crown size={28} />, color: 'from-violet-600 to-purple-700', isPremium: true },
  'golden': { icon: <Diamond size={28} />, color: 'from-amber-500 to-yellow-600', isGold: true },
  'Premium': { icon: <Crown size={28} />, color: 'from-violet-600 to-purple-700', isPremium: true },
  'Gold': { icon: <Diamond size={28} />, color: 'from-amber-500 to-yellow-600', isGold: true },
};

// Product type icons
const PRODUCT_TYPE_ICONS: Record<ProductType, React.ReactNode> = {
  'ebook': <FileText size={16} />,
  'learndash': <MonitorPlay size={16} />,
  'service': <Users size={16} />,
};

// Premium course features data
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

interface CourseCardProps {
  course: Course;
  idx: number;
  isInCart: boolean;
  onAddToCart: (course: Course) => void;
  onRemoveFromCart: (courseId: string) => void;
}

// Premium/Gold Exclusive Card Component
const PremiumCourseCard: React.FC<CourseCardProps> = ({ course, idx, isInCart, onAddToCart, onRemoveFromCart }) => {
  const isPremium = course.level === 'Premium' || course.level === 'premium';
  const isGold = course.level === 'Gold' || course.level === 'golden';
  const features = isPremium ? PREMIUM_FEATURES : GOLD_FEATURES;
  
  const coursePrice = course.pricing?.price;
  const discountPrice = course.pricing?.discountPrice;
  const teachingMaterialsPrice = course.teachingMaterialsPrice;
  
  const price = discountPrice !== undefined 
    ? `€${discountPrice.toFixed(0)}` 
    : (coursePrice !== undefined ? `€${coursePrice.toFixed(0)}` : 'Free');
    
  const originalPrice = discountPrice !== undefined && coursePrice !== undefined
    ? `€${coursePrice.toFixed(0)}`
    : null;

  const savings = discountPrice !== undefined && coursePrice !== undefined
    ? coursePrice - discountPrice
    : 0;

  return (
    <div className="pt-6"> {/* Wrapper to give space for the badge */}
      <div className={`group relative overflow-visible rounded-[2rem] transition-all duration-700 hover:-translate-y-3 ${
        isPremium 
          ? 'bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950' 
          : 'bg-gradient-to-br from-amber-950 via-yellow-900 to-orange-950'
      }`}>
        {/* Animated Background Effects */}
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
          <div className={`absolute -top-1/2 -right-1/2 w-full h-full rounded-full blur-3xl opacity-20 animate-pulse ${
            isPremium ? 'bg-violet-400' : 'bg-amber-400'
          }`}></div>
          <div className={`absolute -bottom-1/2 -left-1/2 w-full h-full rounded-full blur-3xl opacity-10 animate-pulse delay-1000 ${
            isPremium ? 'bg-purple-500' : 'bg-yellow-500'
          }`}></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        </div>

        {/* Top Badge */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-2xl ${
            isPremium 
              ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-violet-500/30' 
              : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 shadow-amber-500/30'
          }`}>
            {isPremium ? <Crown size={14} /> : <Diamond size={14} />}
            {isPremium ? 'Premium Pathway' : 'Gold Pathway'}
          </div>
        </div>

        <div className="relative z-10 p-10 pt-14">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ${
            isPremium 
              ? 'bg-gradient-to-br from-violet-400 to-purple-600 text-white shadow-lg shadow-violet-500/30' 
              : 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950 shadow-lg shadow-amber-500/30'
          }`}>
            {isPremium ? <Crown size={36} /> : <Diamond size={36} />}
          </div>
          {originalPrice && (
            <div className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider ${
              isPremium ? 'bg-violet-500/20 text-violet-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              Save €{savings}
            </div>
          )}
        </div>

        {/* Title & Price */}
        <div className="mb-8">
          <h3 className="text-2xl md:text-3xl font-black text-white mb-4 leading-tight">
            {course.title}
          </h3>
          
          <div className="flex items-end gap-4 mb-4">
            <span className={`text-5xl md:text-6xl font-black ${
              isPremium ? 'text-violet-300' : 'text-amber-300'
            }`}>{price}</span>
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
          <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">What's Included</div>
          <div className="space-y-3">
            {features.map((feature, i) => (
              <div key={i} className="flex items-start gap-3 group/item">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover/item:scale-110 ${
                  isPremium ? 'bg-violet-500/20 text-violet-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {feature.icon}
                </div>
                <span className="text-white/80 text-sm font-medium leading-relaxed">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <button 
            onClick={() => {
              onAddToCart(course);
              window.location.hash = '#checkout';
            }}
            className={`w-full flex items-center justify-center gap-3 py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
              isPremium 
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50' 
                : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50'
            }`}
          >
            Enroll Now
            <ArrowRight size={18} />
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={() => window.location.hash = `#syllabus-${course.id}`}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                isPremium 
                  ? 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10' 
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
              }`}
            >
              View Details
            </button>
            <button 
              onClick={() => isInCart ? onRemoveFromCart(course.id) : onAddToCart(course)}
              className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                isInCart
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
              }`}
            >
              {isInCart ? <Check size={16} /> : <ShoppingCart size={16} />}
            </button>
          </div>
        </div>

        {/* Trust Badge */}
        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-wider">
            <Shield size={14} />
            Secure Payment
          </div>
          <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-wider">
            <Award size={14} />
            Certificate Included
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

const CourseCard: React.FC<CourseCardProps> = ({ course, idx, isInCart, onAddToCart, onRemoveFromCart }) => {
  const config = LEVEL_CONFIG[course.level] || LEVEL_CONFIG['A1'];
  const isPink = config.isPink;
  const features = (course as any).features ? JSON.parse((course as any).features) : [];
  
  // Calculate price with discount logic for display
  const coursePrice = course.pricing?.price;
  const discountPrice = course.pricing?.discountPrice;
  
  const price = discountPrice !== undefined 
    ? `€${discountPrice.toFixed(2)}` 
    : (coursePrice !== undefined ? `€${coursePrice.toFixed(2)}` : 'Free');
    
  const originalPrice = discountPrice !== undefined && coursePrice !== undefined
    ? `€${coursePrice.toFixed(2)}`
    : null;

  return (
    <div className={`group relative bg-white rounded-[2.5rem] p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl flex flex-col h-full border border-gray-100 ${isPink ? 'hover:shadow-pink-500/10 hover:border-pink-200' : 'hover:shadow-purple-500/10 hover:border-purple-200'}`}>
      
      {/* Popular Badge */}
      {idx === 1 && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[#AB8FFF] to-pink-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-200 flex items-center gap-2 z-10">
          <Star size={12} fill="currentColor" />
          Most Popular
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
          {config.icon}
        </div>
        <div className={`px-4 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-widest ${isPink ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
          Level {course.level}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight group-hover:text-[#AB8FFF] transition-colors">
          {course.title}
        </h3>
        
        {/* Price Tag */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">{price}</span>
            {originalPrice && (
              <span className="text-sm font-bold text-gray-400 line-through decoration-pink-500">{originalPrice}</span>
            )}
          </div>
          {originalPrice && <span className="text-[10px] font-black text-[#AB8FFF] uppercase tracking-widest">Limited Time Offer</span>}
        </div>

        <p className="text-gray-600 leading-relaxed mb-8 text-sm flex-grow font-medium line-clamp-4">
          {course.description || 'Scientifically designed for the dyslexic mind. Visual, multisensory, and inclusive learning approach.'}
        </p>

        <div className="space-y-3 mb-10">
          {features.slice(0, 3).map((f: string, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <CheckCircle2 size={16} className={isPink ? 'text-pink-500' : 'text-[#AB8FFF]'} />
              <span className="text-sm font-bold text-gray-700">{f}</span>
            </div>
          ))}
          {features.length > 3 && (
             <div className="flex items-center gap-3">
              <CheckCircle2 size={16} className={isPink ? 'text-pink-500' : 'text-[#AB8FFF]'} />
              <span className="text-sm font-bold text-gray-400 italic">...and {features.length - 3} more</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-gray-50 flex flex-col gap-3">
        {/* Three Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {/* See More Button */}
          <button 
            onClick={() => {
              // Navigate to appropriate detail page based on product type
              const detailRoute = course.productType === 'ebook' 
                ? `#ebook-${course.id}` 
                : `#syllabus-${course.id}`;
              window.location.hash = detailRoute;
            }}
            className={`flex items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              isPink 
                ? 'bg-pink-50 text-pink-600 hover:bg-pink-100' 
                : 'bg-[#AB8FFF]/10 text-[#AB8FFF] hover:bg-[#AB8FFF]/20'
            }`}>
            <Eye size={12} />
            <span className="hidden lg:inline">See More</span>
          </button>
          
          {/* Add to Cart Button */}
          <button 
            onClick={() => isInCart ? onRemoveFromCart(course.id) : onAddToCart(course)}
            className={`flex items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              isInCart
                ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {isInCart ? <Check size={12} /> : <ShoppingCart size={12} />}
            <span className="hidden lg:inline">{isInCart ? 'In Cart' : 'Add'}</span>
          </button>
          
          {/* Enroll Now Button */}
          <button 
            onClick={() => {
              onAddToCart(course);
              window.location.hash = '#checkout';
            }}
            className={`flex items-center justify-center gap-1 py-3 rounded-xl text-white text-[10px] font-black uppercase tracking-wider shadow-lg transition-all transform active:scale-95 ${
              isPink
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:shadow-pink-200'
                : 'bg-[#AB8FFF] hover:bg-[#9a7eef] hover:shadow-purple-200'
            }`}>
            <span className="hidden lg:inline">Enroll</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

interface CoursesPageProps {
  onNavigate?: (path: string) => void;
  onSelectCourse?: (id: string) => void;
  onEnroll?: (id: string) => void;
  cart?: string[];
  onAddToCart?: (id: string) => void;
}

const CoursesPage: React.FC<CoursesPageProps> = ({ 
  onNavigate, 
  onSelectCourse, 
  onEnroll, 
  cart: externalCart = [], 
  onAddToCart: externalAddToCart 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [internalCart, setInternalCart] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<CatalogTab>('interactive'); // Default to Interactive Courses

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

  // Separate courses by category - New catalog structure
  const serviceCourses = courses.filter(c => c.productType === 'service');
  const ebookCourses = courses.filter(c => c.productType === 'ebook');
  const learndashCourses = courses.filter(c => c.productType === 'learndash');
  
  // Split by audience
  const adultEbooks = ebookCourses.filter(c => c.targetAudience === 'adults_teens');
  const kidsEbooks = ebookCourses.filter(c => c.targetAudience === 'kids');
  const adultLearndash = learndashCourses.filter(c => c.targetAudience === 'adults_teens');
  const kidsLearndash = learndashCourses.filter(c => c.targetAudience === 'kids');
  
  // Services (Premium & Golden programs)
  const premiumCourses = serviceCourses;

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const data = await coursesApi.list({ isPublished: true });
        console.log('Loaded courses:', data?.length || 0, 'courses');
        setCourses(data || []);
      } catch (error) {
        console.error("Failed to load courses", error);
        setCourses([]); // Ensure we set empty array on error
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
  }, []);

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#AB8FFF] border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Header Section */}
      <div className="relative w-full min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#fff5fd] via-[#fffbfd] to-white pt-36 pb-32">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FFC1F2] rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#AB8FFF] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse-slow delay-1000"></div>
          <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60 pointer-events-none" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center -translate-y-6 sm:-translate-y-8"
             style={{ transform: `translate(${mousePos.x * 0.15}px, ${mousePos.y * 0.15}px)` }}>
          
          <div className="flex items-center gap-4 mb-8 sm:mb-12 opacity-80 animate-reveal">
            <div className="h-[1px] w-8 bg-[#AB8FFF]"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-800">Premium Learning Path</span>
            <div className="h-[1px] w-8 bg-[#AB8FFF]"></div>
          </div>

          <div className="relative flex flex-col items-center mb-10 w-full">
            <h1 className="text-4xl sm:text-7xl md:text-9xl font-black text-[#1a1c2d] tracking-tighter leading-[0.9] animate-reveal transition-transform duration-500 flex flex-wrap justify-center gap-x-2 sm:gap-x-6"
                style={{ transform: `translate(${mousePos.x * 0.3}px, ${mousePos.y * 0.3}px)` }}>
              <span>EXPLORE</span> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-[#AB8FFF] to-pink-500 ">COURSES</span>
            </h1>
          </div>

          <div className="max-w-3xl animate-reveal stagger-1 flex flex-col items-center" style={{ transform: `translate(${mousePos.x * 0.1}px, ${mousePos.y * 0.1}px)` }}>
             <p className="text-lg sm:text-xl md:text-3xl font-medium text-gray-600 text-center uppercase tracking-tight leading-snug mb-10">
               Scientifically designed for the <span className="text-[#AB8FFF] font-bold">dyslexic mind</span>.
               <br/>
               <span className="text-base sm:text-lg md:text-xl text-gray-500 normal-case mt-4 block">Visual, multisensory, and inclusive learning approach.</span>
             </p>

            <button 
              onClick={() => { const el = document.getElementById('courses-grid'); if(el) el.scrollIntoView({behavior: 'smooth'}) }}
              className="flex items-center gap-3 bg-[#AB8FFF] text-white px-10 py-5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-[#9a7eef] shadow-xl shadow-purple-200 transition-all hover:scale-105 active:scale-95"
            >
              CHOOSE A COURSE
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <WaveSeparator />
      </div>

      {/* Floating Cart */}
      {cartIds.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-reveal">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#AB8FFF] rounded-xl flex items-center justify-center text-white">
              <ShoppingCart size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{cartIds.length} course{cartIds.length > 1 ? 's' : ''} in cart</p>
              <p className="text-xl font-black text-gray-900">€{cartTotal.toFixed(2)}</p>
            </div>
            <button 
              onClick={() => onNavigate?.('checkout')}
              className="ml-4 bg-[#AB8FFF] text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#9a7eef] transition-all"
            >
              Checkout
            </button>
          </div>
        </div>
      )}

      {/* Course Listing */}
      <div id="courses-grid" className="max-w-7xl mx-auto px-6 py-24">
        
        {/* ============================================ */}
        {/* PILL TAB NAVIGATION                          */}
        {/* ============================================ */}
        <div className="flex justify-center mb-16 sticky top-4 z-40">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* ============================================ */}
        {/* SERVICES TAB - Premium & Golden Programs    */}
        {/* ============================================ */}
        {activeTab === 'services' && (
          <div className="animate-fadeIn">
            {/* Section Header */}
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-violet-400"></div>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-violet-500/20">
                  <Briefcase size={14} className="text-violet-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-violet-600">Live Programs</span>
                </div>
                <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-amber-400"></div>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Live Online <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-amber-500">Learning Programs</span>
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                Our most comprehensive programs combining individual lessons, group workshops, and full support for transformative English learning.
              </p>
            </div>
            
            {/* Premium Cards Grid */}
            {premiumCourses.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-reveal stagger-1">
                {premiumCourses.map((course, idx) => (
                  <PremiumCourseCard 
                    key={course.id || idx} 
                    course={course} 
                    idx={idx}
                    isInCart={cartIds.includes(course.id)}
                    onAddToCart={addToCart}
                    onRemoveFromCart={removeFromCart}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4 text-violet-400">
                  <Users size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Online Courses Coming Soon!</h3>
                <p className="text-gray-500 font-medium max-w-md mx-auto">
                  Our Premium and Golden programs are being prepared. Check back soon!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* INTERACTIVE COURSES TAB - LearnDash         */}
        {/* ============================================ */}
        {activeTab === 'interactive' && (
          <div className="animate-fadeIn">
            {/* Section Header */}
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-[#AB8FFF]"></div>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#AB8FFF]/10 border border-[#AB8FFF]/20">
                  <MonitorPlay size={14} className="text-[#AB8FFF]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#AB8FFF]">Interactive Learning</span>
                </div>
                <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-[#AB8FFF]"></div>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Interactive <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#AB8FFF] to-pink-500">Video Courses</span>
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                Self-paced video lessons, quizzes, and exercises designed for the dyslexic mind. Learn at your own pace with our engaging content.
              </p>
            </div>

            {/* Adults & Teens Interactive Courses */}
            {adultLearndash.length > 0 && (
              <div className="mb-16">
                <div className="flex items-center gap-6 mb-8">
                  <div className="flex items-center gap-3">
                    <MonitorPlay size={20} className="text-[#AB8FFF]" />
                    <h3 className="text-2xl font-black text-gray-900 whitespace-nowrap">Adults & Teens</h3>
                  </div>
                  <div className="h-[2px] flex-grow bg-gradient-to-r from-[#AB8FFF] to-transparent rounded-full"></div>
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
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Kids Interactive Courses */}
            {kidsLearndash.length > 0 && (
              <div className="mb-16">
                <div className="flex items-center gap-6 mb-8">
                  <div className="flex items-center gap-3">
                    <MonitorPlay size={20} className="text-pink-500" />
                    <h3 className="text-2xl font-black text-gray-900 whitespace-nowrap">Kids</h3>
                  </div>
                  <div className="h-[2px] flex-grow bg-gradient-to-r from-pink-400 to-transparent rounded-full"></div>
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
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {adultLearndash.length === 0 && kidsLearndash.length === 0 && (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-400">
                  <MonitorPlay size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Interactive Courses Coming Soon!</h3>
                <p className="text-gray-500 font-medium max-w-md mx-auto">
                  We're preparing our interactive video courses. Check back soon!
                </p>
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
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#AB8FFF]/10 border border-[#AB8FFF]/20">
                  <FileText size={14} className="text-[#AB8FFF]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#AB8FFF]">Digital Books</span>
                </div>
                <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-[#AB8FFF]"></div>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Comprehensive <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#AB8FFF] to-pink-500">E-books</span>
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                Downloadable PDF guides with vocabulary, grammar, and exercises. Perfect for offline study and reference.
              </p>
            </div>

            {/* Adults & Teens E-books */}
            {adultEbooks.length > 0 && (
              <div className="mb-16">
                <div className="flex items-center gap-6 mb-8">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-[#AB8FFF]" />
                    <h3 className="text-2xl font-black text-gray-900 whitespace-nowrap">Adults & Teens</h3>
                  </div>
                  <div className="h-[2px] flex-grow bg-gradient-to-r from-[#AB8FFF] to-transparent rounded-full"></div>
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
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Kids E-books */}
            {kidsEbooks.length > 0 && (
              <div className="mb-16">
                <div className="flex items-center gap-6 mb-8">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-pink-500" />
                    <h3 className="text-2xl font-black text-gray-900 whitespace-nowrap">Kids</h3>
                  </div>
                  <div className="h-[2px] flex-grow bg-gradient-to-r from-pink-400 to-transparent rounded-full"></div>
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
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {adultEbooks.length === 0 && kidsEbooks.length === 0 && (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-400">
                  <FileText size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">E-books Coming Soon!</h3>
                <p className="text-gray-500 font-medium max-w-md mx-auto">
                  We're preparing our comprehensive e-books. Check back soon!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Global Empty State - No courses at all */}
        {courses.length === 0 && !loading && (
           <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
               <BookOpen size={24} />
             </div>
             <h3 className="text-xl font-bold text-gray-700 mb-2">Courses Coming Soon!</h3>
             <p className="text-gray-500 font-medium max-w-md mx-auto">
               We're preparing our courses for you. Check back soon for our complete learning paths designed for all levels.
             </p>
           </div>
        )}
      </div>
    </div>
  );
};

export default CoursesPage;
