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
}

const EbookDetailPage: React.FC<EbookDetailPageProps> = ({ 
  courseId, 
  onBack, 
  onEnroll, 
  onAddToCart, 
  isInCart 
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-[#AB8FFF]/20 rounded-full flex items-center justify-center mb-4">
            <FileText size={32} className="text-[#AB8FFF]" />
          </div>
          <p className="text-gray-500 font-medium">Loading e-book details...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">E-book Not Found</h2>
          <p className="text-gray-500 mb-6">The e-book you're looking for doesn't exist or has been removed.</p>
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className={`relative bg-gradient-to-br ${config.color} text-white overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-white rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-12 pt-24">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white font-medium mb-8 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Courses
          </button>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: E-book Info */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-bold mb-6">
                <FileText size={16} />
                <span>Digital E-book</span>
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                <span>{config.label}</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                {course.title}
              </h1>

              <p className="text-lg text-white/90 mb-8 leading-relaxed">
                {course.description || `Comprehensive PDF guide designed for the dyslexic mind. Visual, multisensory learning approach with ${config.label} content.`}
              </p>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Download size={16} />
                  <span className="text-sm font-medium">Instant Download</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Globe size={16} />
                  <span className="text-sm font-medium">PDF Format</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Shield size={16} />
                  <span className="text-sm font-medium">Lifetime Access</span>
                </div>
              </div>

              {/* Price & CTA */}
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black">€{price}</span>
                  {hasDiscount && (
                    <span className="text-xl text-white/60 line-through">€{originalPrice}</span>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => onEnroll(course.id)}
                    className="flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                  >
                    Buy Now
                    <ArrowRight size={18} />
                  </button>
                  <button
                    onClick={() => onAddToCart(course.id)}
                    className={`flex items-center gap-2 px-6 py-4 rounded-xl font-bold transition-all ${
                      isInCart
                        ? 'bg-green-500 text-white'
                        : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                    }`}
                  >
                    {isInCart ? <Check size={18} /> : <ShoppingCart size={18} />}
                    {isInCart ? 'In Cart' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: E-book Visual */}
            <div className="relative flex justify-center">
              <div className="relative">
                {/* E-book Cover Mockup */}
                <div className="relative w-64 h-80 bg-white rounded-lg shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className={`absolute inset-0 bg-gradient-to-br ${config.color} rounded-lg opacity-90`}></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                      {config.icon}
                    </div>
                    <h3 className="text-xl font-bold text-center mb-2">{course.level}</h3>
                    <p className="text-sm text-white/80 text-center">E-book</p>
                  </div>
                  {/* Spine Effect */}
                  <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/20 to-transparent rounded-l-lg"></div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <span className="text-xs font-black text-yellow-900 text-center leading-tight">
                    PDF<br/>Format
                  </span>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-3 flex items-center gap-2">
                  <Download size={18} className="text-[#AB8FFF]" />
                  <span className="text-sm font-bold text-gray-700">Instant Access</span>
                </div>
              </div>
            </div>
          </div>
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
            <h2 className="text-3xl font-black text-gray-900">What's Included</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-white flex-shrink-0`}>
                  <CheckCircle2 size={16} />
                </div>
                <p className="text-gray-700 font-medium">{feature}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Device Compatibility */}
        <section className="mb-16 bg-gray-50 rounded-3xl p-8 md:p-12">
          <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">Read on Any Device</h2>
          <div className="flex justify-center gap-8 md:gap-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center">
                <Monitor size={28} className="text-[#AB8FFF]" />
              </div>
              <span className="text-sm font-medium text-gray-600">Computer</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center">
                <Tablet size={28} className="text-[#AB8FFF]" />
              </div>
              <span className="text-sm font-medium text-gray-600">Tablet</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center">
                <Smartphone size={28} className="text-[#AB8FFF]" />
              </div>
              <span className="text-sm font-medium text-gray-600">Phone</span>
            </div>
          </div>
        </section>

        {/* Why Choose This E-book */}
        <section className="mb-16">
          <h2 className="text-3xl font-black text-gray-900 mb-8 text-center">Why Choose Our E-books?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart size={28} className="text-pink-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Dyslexia-Friendly</h3>
              <p className="text-gray-600">
                Specially designed with fonts, colors, and layouts that make reading easier for dyslexic learners.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download size={28} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Instant Access</h3>
              <p className="text-gray-600">
                Download immediately after purchase. No waiting, start learning right away.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCcw size={28} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Lifetime Updates</h3>
              <p className="text-gray-600">
                Get free updates whenever we improve the content. Your purchase gives you lifetime access.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={`rounded-3xl bg-gradient-to-br ${config.color} text-white p-8 md:p-12 text-center`}>
          <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to Start Learning?</h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Get instant access to this comprehensive e-book and start your English learning journey today.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => onEnroll(course.id)}
              className="flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              Buy Now - €{price}
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => onAddToCart(course.id)}
              className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all ${
                isInCart
                  ? 'bg-green-500 text-white'
                  : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
              }`}
            >
              {isInCart ? <Check size={18} /> : <ShoppingCart size={18} />}
              {isInCart ? 'Added to Cart' : 'Add to Cart'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EbookDetailPage;
