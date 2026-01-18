
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Star, Clock, Sparkles, BookOpen, Target, GraduationCap, ChevronRight, Zap, Lock, ShoppingCart, Check, Rocket, Shield, FileText, Play, Users, Layers, Award, TrendingUp, Crown, Diamond, Video, Brain, Headphones, FileCheck, MessageCircle } from 'lucide-react';
import { coursesApi } from '../data/supabaseStore';
import { Course, Module } from '../types';

// Level colors and configs
const LEVEL_CONFIG: Record<string, { color: string; bgColor: string; label: string; icon: React.ReactNode }> = {
  'A1': { color: 'from-blue-500 to-indigo-600', bgColor: 'bg-blue-500', label: 'Beginner', icon: <Layers size={20} /> },
  'A2': { color: 'from-indigo-500 to-purple-600', bgColor: 'bg-indigo-500', label: 'Elementary', icon: <TrendingUp size={20} /> },
  'B1': { color: 'from-purple-600 to-pink-600', bgColor: 'bg-purple-600', label: 'Intermediate', icon: <Award size={20} /> },
  'Kids': { color: 'from-pink-400 to-rose-500', bgColor: 'bg-pink-500', label: 'Young Learners', icon: <Star size={20} /> },
  'Premium': { color: 'from-violet-600 to-purple-700', bgColor: 'bg-violet-600', label: 'Premium Pathway', icon: <Crown size={20} /> },
  'Gold': { color: 'from-amber-500 to-yellow-600', bgColor: 'bg-amber-500', label: 'Gold Pathway', icon: <Diamond size={20} /> }
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

  // Extract outcomes from first few lessons - with null checks
  const outcomes = modules.slice(0, 4).map(m => 
    m.lessons?.[0]?.title || m.title
  ).filter(Boolean);
  if (outcomes.length === 0) {
    outcomes.push('Master core language skills', 'Build confidence in communication', 'Develop visual learning strategies', 'Track your progress effectively');
  }

  // Check for original price vs discount
  const hasDiscount = course.pricing.discountPrice !== undefined && course.pricing.discountPrice < course.pricing.price;
  const originalPrice = hasDiscount ? `${course.pricing.price.toFixed(2)}€` : null;

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
              <p className="text-lg sm:text-x font-medium text-gray-600 leading-relaxed max-w-xl">
                {course.description || 'A comprehensive course designed for the dyslexic mind. Visual, multisensory, and inclusive learning approach.'}
              </p>

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
                <div className="flex items-baseline gap-3">
                  <span className={`text-4xl sm:text-5xl font-black text-[#1a1c2d]`}>
                    {price}
                  </span>
                  {originalPrice && (
                    <span className="text-xl font-bold text-gray-400 line-through Decoration-pink-500">{originalPrice}</span>
                  )}
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
                  <GraduationCap size={28} />
                </div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight uppercase">What You'll Learn</h3>
              </div>
              <p className="text-gray-500 text-lg mb-8 font-medium">
                Our curriculum is built to ensure tangible progress. Key topics covered:
              </p>
              <div className="space-y-4">
                {outcomes.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 bg-gray-50 rounded-[2rem] border border-gray-100 group hover:bg-white hover:border-purple-200 transition-all">
                    <CheckCircle2 className="text-green-500 shrink-0" size={20} />
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
          </div>

          {/* Right: Modules Timeline */}
          <div className="lg:col-span-7 animate-reveal stagger-1">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100">
                <BookOpen size={28} />
              </div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                {course.level === 'Premium' || course.level === 'Gold' ? 'Program Includes' : 'Course Modules'}
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
            ) : modules.length === 0 ? (
              <div className="bg-gray-50 rounded-[3rem] p-12 text-center">
                <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
                <h4 className="text-xl font-black text-gray-900 mb-2">Content Coming Soon</h4>
                <p className="text-gray-500">This course is being developed. Check back soon for the full curriculum!</p>
              </div>
            ) : (
              <div className="relative pl-8 md:pl-12 border-l-2 border-dashed border-gray-100 space-y-12">
                {modules.map((module, i) => (
                  <div key={module.id} className="relative group">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[41px] md:-left-[49px] top-0 w-4 h-4 rounded-full border-4 border-white bg-gradient-to-r ${config.color} ring-4 ring-gray-50 group-hover:scale-150 transition-transform duration-500 shadow-sm z-10`}></div>
                    
                    <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-500 overflow-hidden relative">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <h5 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Module {i+1}: {module.title}</h5>
                        <div className="px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {(module.lessons?.length || 0)} Lessons
                        </div>
                      </div>
                      
                      {module.description && (
                        <p className="text-gray-500 text-sm mb-6">{module.description}</p>
                      )}
                      
                      <div className="relative min-h-[80px]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(module.lessons || []).map((lesson, j) => (
                            <div key={lesson.id} className="flex items-start gap-3">
                              <div className="mt-1">
                                {lesson.type === 'video' && <Play size={14} className="text-purple-500" />}
                                {lesson.type === 'reading' && <FileText size={14} className="text-blue-500" />}
                                {lesson.type === 'quiz' && <Target size={14} className="text-green-500" />}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-gray-600 leading-tight block">{lesson.title}</span>
                                <span className="text-[10px] text-gray-400">{lesson.duration}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {(module.homework?.length || 0) > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Homework</span>
                            {(module.homework || []).map((hw) => (
                              <div key={hw.id} className="flex items-center gap-2 text-xs text-gray-600">
                                <CheckCircle2 size={12} className="text-purple-500" />
                                {hw.title}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* BOTTOM CTAs FOR THE SYLLABUS PAGE */}
            <div className="mt-20 p-12 bg-gray-50 rounded-[4rem] border border-gray-100 text-center animate-reveal">
               <h4 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tight">Ready to start this course?</h4>
               <p className="text-gray-500 mb-10 font-medium">Join our community and transform your learning journey today.</p>
               <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button 
                    onClick={() => onEnroll(courseId)}
                    className={`flex items-center justify-center gap-3 px-10 py-5 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-xl hover:scale-105 transition-all bg-gradient-to-r ${config.color}`}
                  >
                    {price === 'FREE' ? 'ENROLL FREE' : `ENROLL FOR ${price}`}
                    <ChevronRight size={18} />
                  </button>
                  <button 
                    onClick={() => onAddToCart(courseId)}
                    className={`flex items-center justify-center gap-3 px-8 py-5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all ${isInCart ? 'bg-green-50 border-green-500 text-green-600' : 'bg-white border-gray-100 text-gray-400 hover:border-purple-200 hover:text-purple-600'}`}
                  >
                    {isInCart ? <><Check size={18} /> Added to Cart</> : <><ShoppingCart size={18} /> Add to Cart</>}
                  </button>
               </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CourseSyllabusPage;
