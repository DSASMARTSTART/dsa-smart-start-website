import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Download, FileText, CheckCircle2, Star, ShoppingCart, Check, ArrowRight, Layers, TrendingUp, Award, Music, Play, Clock, Globe, Smartphone, Tablet, Monitor, Heart, Shield, RefreshCcw, Sparkles } from 'lucide-react';
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

// E-book features based on level
const EBOOK_FEATURES: Record<string, string[]> = {
  'A1': [
    'Complete beginner vocabulary guide',
    'Essential grammar explanations',
    'Practice exercises with answers',
    'Visual learning aids & illustrations',
    'Dyslexia-friendly formatting',
    'Audio companion access'
  ],
  'A2': [
    'Elementary vocabulary expansion',
    'Progressive grammar structures',
    'Reading comprehension exercises',
    'Writing practice sections',
    'Dyslexia-friendly formatting',
    'Audio companion access'
  ],
  'B1': [
    'Intermediate vocabulary building',
    'Complex grammar patterns',
    'Professional communication tips',
    'Self-assessment quizzes',
    'Dyslexia-friendly formatting',
    'Audio companion access'
  ],
  'B2': [
    'Advanced vocabulary & idioms',
    'Academic writing structures',
    'Exam preparation strategies',
    'Critical thinking exercises',
    'Dyslexia-friendly formatting',
    'Audio companion access'
  ],
  'kids-basic': [
    'Colorful illustrations throughout',
    'Simple vocabulary with pictures',
    'Fun activities & games',
    'Parent guidance included',
    'Dyslexia-friendly fonts & colors',
    'Engaging storytelling approach'
  ],
  'kids-medium': [
    'Story-based learning chapters',
    'Building vocabulary through context',
    'Creative writing prompts',
    'Interactive exercises',
    'Dyslexia-friendly formatting',
    'Parent-child activity suggestions'
  ],
  'kids-advanced': [
    'Advanced reading passages',
    'Grammar foundations for school',
    'Creative expression activities',
    'Self-study guidance',
    'Dyslexia-friendly formatting',
    'Preparation for school English'
  ]
};

// Default features for any level not explicitly defined
const DEFAULT_FEATURES = [
  'Comprehensive PDF guide',
  'Visual learning approach',
  'Practice exercises included',
  'Dyslexia-friendly formatting',
  'Instant download access',
  'Compatible with all devices'
];

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
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-[#AB8FFF]/20 rounded-full flex items-center justify-center mb-4">
            <FileText size={32} className="text-[#AB8FFF]" />
          </div>
          <p className="text-gray-400 font-medium">Loading e-book details...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <FileText size={32} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">E-book Not Found</h2>
          <p className="text-gray-400 mb-6">The e-book you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-[#AB8FFF] font-bold hover:underline"
          >
            <ArrowLeft size={18} />
            Back to Courses
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
  
  const features = EBOOK_FEATURES[course.level] || DEFAULT_FEATURES;
  const isKids = course.targetAudience === 'kids' || course.level?.startsWith('kids');
  
  const price = course.pricing?.discountPrice ?? course.pricing?.price ?? 0;
  const originalPrice = course.pricing?.discountPrice ? course.pricing.price : null;
  const hasDiscount = originalPrice && originalPrice > price;

  return (
    <div className="bg-black min-h-screen">
      {/* Dark Hero - matching CourseSyllabusPage style */}
      <div className="relative w-full min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-black">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Soft gradient blobs using brand colors */}
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FFC1F2] rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#AB8FFF] rounded-full mix-blend-screen filter blur-[100px] opacity-10 animate-pulse"></div>
          <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] bg-[#FFC1F2] rounded-full mix-blend-screen filter blur-[80px] opacity-10"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-20 pb-20">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#AB8FFF] transition-colors mb-12"
          >
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#AB8FFF]/30 group-hover:shadow-md transition-all">
              <ArrowLeft size={16} />
            </div>
            Back to Courses
          </button>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: E-book Info */}
            <div className="space-y-8">
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
                {course.description || `Comprehensive PDF guide designed for the dyslexic mind. Visual, multisensory learning approach with ${config.label} content.`}
              </p>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <Download size={20} className="text-[#AB8FFF]" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white">Instant</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Download</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                    <FileText size={20} className="text-pink-400" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white">PDF</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Format</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Shield size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white">Lifetime</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Access</p>
                  </div>
                </div>
              </div>

              {/* Price & CTA */}
              <div className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-black text-white">€{price}</span>
                  {hasDiscount && (
                    <span className="text-xl text-gray-500 line-through decoration-pink-500">€{originalPrice}</span>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      onAddToCart(course.id);
                      window.location.hash = '#checkout';
                    }}
                    className="group flex items-center gap-3 bg-[#AB8FFF] text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest hover:bg-[#9a7eef] transition-all shadow-lg shadow-purple-500/30 transform hover:scale-105 active:scale-95"
                  >
                    Buy Now
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => onAddToCart(course.id)}
                    className={`flex items-center gap-2 px-6 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all ${
                      isInCart
                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                        : 'bg-white/5 text-gray-300 border border-white/10 hover:border-[#AB8FFF]/30 hover:shadow-md'
                    }`}
                  >
                    {isInCart ? <Check size={16} /> : <ShoppingCart size={16} />}
                    {isInCart ? 'In Cart' : 'Add'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: E-book Visual */}
            <div className="relative flex justify-center">
              <div className="relative">
                {/* E-book Cover Mockup */}
                <div className="relative w-72 h-96 bg-white rounded-2xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500 border border-gray-100">
                  <div className={`absolute inset-0 bg-gradient-to-br ${config.color} rounded-2xl opacity-90`}></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8">
                    <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                      {config.icon}
                    </div>
                    <h3 className="text-2xl font-black text-center mb-2">{course.level}</h3>
                    <p className="text-sm text-white/80 text-center font-medium">Digital E-book</p>
                    <div className="mt-6 px-4 py-2 bg-white/20 rounded-full">
                      <span className="text-xs font-bold uppercase tracking-wider">Eduway</span>
                    </div>
                  </div>
                  {/* Spine Effect */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/20 to-transparent rounded-l-2xl"></div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-[#FFC1F2] to-pink-400 rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
                  <span className="text-xs font-black text-white text-center leading-tight">
                    PDF<br/>Format
                  </span>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white/5 rounded-2xl shadow-lg p-4 flex items-center gap-3 border border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-[#AB8FFF]/10 flex items-center justify-center">
                    <Download size={18} className="text-[#AB8FFF]" />
                  </div>
                  <span className="text-sm font-black text-gray-300">Instant Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z" fill="black"/>
          </svg>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* What's Included */}
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white`}>
              <Sparkles size={24} />
            </div>
            <h2 className="text-3xl font-black text-white">What's Included</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-4 p-6 bg-white/5 rounded-2xl border border-white/10 shadow-sm hover:shadow-md hover:shadow-purple-500/10 transition-shadow">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-white flex-shrink-0`}>
                  <CheckCircle2 size={16} />
                </div>
                <p className="text-gray-300 font-medium">{feature}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Device Compatibility */}
        <section className="mb-16 bg-white/5 rounded-3xl p-8 md:p-12 border border-white/10">
          <h2 className="text-2xl font-black text-white mb-6 text-center">Read on Any Device</h2>
          <div className="flex justify-center gap-8 md:gap-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-white/5 rounded-2xl shadow-md flex items-center justify-center border border-white/10">
                <Monitor size={28} className="text-[#AB8FFF]" />
              </div>
              <span className="text-sm font-medium text-gray-400">Computer</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-white/5 rounded-2xl shadow-md flex items-center justify-center border border-white/10">
                <Tablet size={28} className="text-[#AB8FFF]" />
              </div>
              <span className="text-sm font-medium text-gray-400">Tablet</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-white/5 rounded-2xl shadow-md flex items-center justify-center border border-white/10">
                <Smartphone size={28} className="text-[#AB8FFF]" />
              </div>
              <span className="text-sm font-medium text-gray-400">Phone</span>
            </div>
          </div>
        </section>

        {/* Why Choose This E-book */}
        <section className="mb-16">
          <h2 className="text-3xl font-black text-white mb-8 text-center">Why Choose Our E-books?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-pink-500/20">
                <Heart size={28} className="text-pink-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Dyslexia-Friendly</h3>
              <p className="text-gray-400">
                Specially designed with fonts, colors, and layouts that make reading easier for dyslexic learners.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                <Download size={28} className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Instant Access</h3>
              <p className="text-gray-400">
                Download immediately after purchase. No waiting, start learning right away.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                <RefreshCcw size={28} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Lifetime Updates</h3>
              <p className="text-gray-400">
                Get free updates whenever we improve the content. Your purchase gives you lifetime access.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="rounded-3xl bg-gradient-to-br from-[#AB8FFF] to-purple-600 text-white p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to Start Learning?</h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Get instant access to this comprehensive e-book and start your English learning journey today.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => {
                onAddToCart(course.id);
                window.location.hash = '#checkout';
              }}
              className="flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              Buy Now - €{price}
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => !isAddingToCart && onAddToCart(course.id)}
              disabled={isAddingToCart}
              className={`flex items-center gap-2 px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all ${
                isAddingToCart
                  ? 'bg-white/10 text-white/50 cursor-wait'
                  : isInCart
                    ? 'bg-green-500 text-white'
                    : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
              }`}
            >
              {isAddingToCart ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : isInCart ? <Check size={18} /> : <ShoppingCart size={18} />}
              {isAddingToCart ? 'Checking...' : isInCart ? 'Added to Cart' : 'Add to Cart'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EbookDetailPage;
