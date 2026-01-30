
import React, { useEffect, useState } from 'react';
import { Star, Zap, Award, Music, Play, Layers, Compass, ChevronRight, Crown, Diamond, Loader2, GraduationCap, Baby } from 'lucide-react';
import { coursesApi } from '../data/supabaseStore';
import { Course, CourseLevel } from '../types';
import AssessmentPopup from './AssessmentPopup';

// Level configuration for icons and colors
const LEVEL_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string; category: 'adult' | 'kids' | 'pathway' }> = {
  'A1': { icon: <Layers size={22} />, color: 'from-[#AB8FFF] to-[#d4bfff]', label: 'Beginner', category: 'adult' },
  'A2': { icon: <Compass size={22} />, color: 'from-[#9b7aff] to-[#deaaff]', label: 'Elementary', category: 'adult' },
  'B1': { icon: <Zap size={22} />, color: 'from-[#8a65ff] to-[#FFC1F2]', label: 'Intermediate', category: 'adult' },
  'B2': { icon: <Award size={22} />, color: 'from-blue-600 to-cyan-500', label: 'Upper-Intermediate', category: 'adult' },
  'Kids': { icon: <Music size={22} />, color: 'from-[#FFC1F2] to-[#ffdaeb]', label: 'Young Learners', category: 'kids' },
  'kids-basic': { icon: <Music size={22} />, color: 'from-[#FFC1F2] to-[#ffdaeb]', label: 'Kids Basic', category: 'kids' },
  'kids-medium': { icon: <Play size={22} />, color: 'from-[#fface0] to-[#fbcfe8]', label: 'Kids Medium', category: 'kids' },
  'kids-advanced': { icon: <Award size={22} />, color: 'from-[#FFC1F2] to-[#AB8FFF]', label: 'Kids Advanced', category: 'kids' },
  'premium': { icon: <Crown size={22} />, color: 'from-violet-600 to-purple-700', label: 'Premium Program', category: 'pathway' },
  'golden': { icon: <Diamond size={22} />, color: 'from-amber-500 to-yellow-600', label: 'Golden Program', category: 'pathway' },
  'Premium': { icon: <Crown size={22} />, color: 'from-violet-600 to-purple-700', label: 'Premium Pathway', category: 'pathway' },
  'Gold': { icon: <Diamond size={22} />, color: 'from-amber-500 to-yellow-600', label: 'Gold Pathway', category: 'pathway' },
};

// Fallback static courses for when database is empty
const FALLBACK_ADULT_COURSES = [
  { name: "A1 LEVEL", level: "Beginner", icon: <Layers size={22} />, color: "from-[#AB8FFF] to-[#d4bfff]", desc: "Foundation strategies for complete beginners with dyslexia.", image: "/assets/courses/adult-a1.svg" },
  { name: "A2 LEVEL", level: "Elementary", icon: <Compass size={22} />, color: "from-[#9b7aff] to-[#deaaff]", desc: "Developing confidence in daily communication and basic structures.", image: "/assets/courses/adult-a2.svg" },
  { name: "B1 LEVEL", level: "Intermediate", icon: <Zap size={22} />, color: "from-[#8a65ff] to-[#FFC1F2]", desc: "Independent usage with specialized DSA tools for advanced reasoning.", image: "/assets/courses/adult-b1.svg" },
];

const FALLBACK_KIDS_COURSES = [
  { name: "BASIC", level: "Early Years", icon: <Music size={22} />, color: "from-[#FFC1F2] to-[#ffdaeb]", desc: "Introduction through songs, visuals, and sensory exploration.", image: "/assets/courses/kids-basic.svg" },
  { name: "MEDIUM", level: "Primary", icon: <Play size={22} />, color: "from-[#fface0] to-[#fbcfe8]", desc: "Interactive storytelling and vocabulary games for active focus.", image: "/assets/courses/kids-medium.svg" },
  { name: "ADVANCED", level: "Pre-Teen", icon: <Award size={22} />, color: "from-[#FFC1F2] to-[#AB8FFF]", desc: "Preparing for school success with advanced visual mnemonics.", image: "/assets/courses/kids-advanced.svg" },
];

interface CoursesSectionProps {
  onNavigateToSyllabus?: (courseId: string) => void;
  onNavigate?: (path: string) => void;
}

const CoursesSection: React.FC<CoursesSectionProps> = ({ onNavigateToSyllabus, onNavigate }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentType, setAssessmentType] = useState<'teens_adults' | 'kids'>('teens_adults');

  const handleOpenAssessment = (type: 'teens_adults' | 'kids') => {
    setAssessmentType(type);
    setShowAssessment(true);
  };

  const loadCourses = async () => {
    setLoadError(null);
    try {
      const data = await coursesApi.list({ isPublished: true });
      setCourses(data);
    } catch (error) {
      console.error('Error loading courses:', error);
      setLoadError('Unable to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // Split courses into categories - Updated for new catalog structure
  const adultCourses = courses.filter(c => 
    (['A1', 'A2', 'B1', 'B2'].includes(c.level) && c.productType !== 'ebook') ||
    (c.targetAudience === 'adults_teens' && c.productType === 'learndash')
  );
  const kidsCourses = courses.filter(c => 
    c.level === 'Kids' || 
    c.level?.startsWith('kids-') ||
    (c.targetAudience === 'kids' && c.productType === 'learndash')
  );
  const pathwayCourses = courses.filter(c => 
    ['Premium', 'Gold', 'premium', 'golden'].includes(c.level) ||
    c.productType === 'service'
  );

  // Check if we have database courses or should use fallback
  const hasDbCourses = courses.length > 0;

  const handleViewDetails = (course: Course) => {
    if (onNavigateToSyllabus) {
      onNavigateToSyllabus(course.id);
    } else {
      window.location.hash = `#syllabus-${course.id}`;
    }
  };

  const renderCourseCard = (course: Course, shadowColor: string) => {
    const config = LEVEL_CONFIG[course.level] || LEVEL_CONFIG['A1'];
    
    return (
      <div 
        key={course.id} 
        role="button"
        tabIndex={0}
        aria-label={`View details for ${course.title}`}
        className={`group relative bg-white rounded-[2rem] p-4 pb-10 border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-${shadowColor}/20 transition-all duration-500 overflow-hidden cursor-pointer focus:outline-none focus:ring-4 focus:ring-purple-300 focus:ring-offset-2`}
        onClick={() => handleViewDetails(course)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleViewDetails(course); } }}
      >
        <div className="relative w-full aspect-[3/4] rounded-[1.5rem] overflow-hidden mb-8 bg-gray-100">
          {course.thumbnailUrl ? (
            <img 
              src={course.thumbnailUrl} 
              alt={course.title} 
              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${config.color} flex items-center justify-center`}>
              <span className="text-white text-6xl font-black opacity-30">{course.level}</span>
            </div>
          )}
          <div className={`absolute top-4 left-4 w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} text-white flex items-center justify-center shadow-lg`}>
            {config.icon}
          </div>
          
          {/* Price Badge */}
          {!course.pricing.isFree && (
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
              <span className="font-black text-sm text-gray-900">
                {course.pricing.discountPrice !== undefined 
                  ? `€${course.pricing.discountPrice}`
                  : `€${course.pricing.price}`
                }
              </span>
            </div>
          )}
        </div>
        <div className="px-6">
          <span className="text-[10px] font-black text-[#AB8FFF] uppercase tracking-[0.2em] mb-1 block">{config.label}</span>
          <h5 className="text-2xl font-black text-gray-900 tracking-tight mb-4">{course.title}</h5>
          <p className="text-gray-500 leading-relaxed mb-8 text-sm line-clamp-2">
            {course.description}
          </p>
          <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
            <button className="text-[11px] font-black uppercase tracking-widest text-[#AB8FFF] flex items-center gap-2 group-hover:gap-4 transition-all">
              View Details
              <ChevronRight size={14} />
            </button>
            <Star size={16} className="text-gray-200" />
          </div>
        </div>
      </div>
    );
  };

  // Render static fallback card (for when no DB courses exist)
  const renderFallbackCard = (course: typeof FALLBACK_ADULT_COURSES[0], shadowColor: string) => (
    <div key={course.name} className={`group relative bg-white rounded-[2rem] p-4 pb-10 border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-${shadowColor}/20 transition-all duration-500 overflow-hidden`}>
      <div className="relative w-full aspect-[3/4] rounded-[1.5rem] overflow-hidden mb-8">
        <img 
          src={course.image} 
          alt={`${course.name} Course`} 
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
        />
        <div className={`absolute top-4 left-4 w-12 h-12 rounded-xl bg-gradient-to-br ${course.color} text-white flex items-center justify-center shadow-lg`}>
          {course.icon}
        </div>
      </div>
      <div className="px-6">
        <span className="text-[10px] font-black text-[#AB8FFF] uppercase tracking-[0.2em] mb-1 block">{course.level}</span>
        <h5 className="text-2xl font-black text-gray-900 tracking-tight mb-4">DSA SMART START {course.name}</h5>
        <p className="text-gray-500 leading-relaxed mb-8 text-sm">
          {course.desc}
        </p>
        <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
          <button className="text-[11px] font-black uppercase tracking-widest text-[#AB8FFF] flex items-center gap-2 group-hover:gap-4 transition-all">
            Coming Soon
            <ChevronRight size={14} />
          </button>
          <Star size={16} className="text-gray-200" />
        </div>
      </div>
    </div>
  );

  return (
    <section className="py-32 bg-white relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#AB8FFF] rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 opacity-20"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FFC1F2] rounded-full blur-[120px] translate-x-1/2 translate-y-1/2 opacity-30"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row justify-between items-end mb-24 gap-8">
          <div className="max-w-2xl">
            <span className="text-[10px] font-black text-[#AB8FFF] uppercase tracking-[0.4em] mb-4 block">Our Curriculum</span>
            <h3 className="text-4xl md:text-6xl font-black text-[#1a1c2d] leading-[1.1] tracking-tighter">
              Tailored Programs for <br /> Every <span className="text-[#AB8FFF]">Learning Stage</span>
            </h3>
          </div>
          <p className="text-gray-500 lg:max-w-sm text-lg font-medium leading-relaxed">
            Meticulously structured pathways to accommodate neurodiversity, ensuring progress without frustration.
          </p>
        </div>

        {loading ? (
          <div className="py-12">
            {/* Section Header Skeleton */}
            <div className="flex items-center gap-6 mb-12 animate-pulse">
              <div className="h-4 w-28 bg-gray-200 rounded-full"></div>
              <div className="h-[1px] flex-grow bg-gray-200"></div>
            </div>
            {/* Course Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-[2rem] border border-gray-100 p-8 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 bg-gray-200 rounded-2xl"></div>
                    <div className="h-6 w-16 bg-gray-100 rounded-full"></div>
                  </div>
                  <div className="h-6 w-3/4 bg-gray-200 rounded-lg mb-3"></div>
                  <div className="h-4 w-full bg-gray-100 rounded mb-2"></div>
                  <div className="h-4 w-2/3 bg-gray-100 rounded mb-6"></div>
                  <div className="flex gap-2 mb-6">
                    <div className="h-6 w-20 bg-purple-100 rounded-full"></div>
                    <div className="h-6 w-24 bg-purple-100 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                    <div className="h-8 w-20 bg-gray-200 rounded-lg"></div>
                    <div className="h-10 w-28 bg-purple-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">{loadError}</p>
            <button
              onClick={() => { setLoading(true); loadCourses(); }}
              className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600 text-white text-sm font-bold rounded-full hover:bg-purple-700 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Adults & Teens Section */}
            <div className="mb-32">
              <div className="flex items-center gap-6 mb-12">
                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Adults & Teens</h4>
                <div className="h-[1px] flex-grow bg-gradient-to-r from-gray-200 to-transparent"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {hasDbCourses && adultCourses.length > 0
                  ? adultCourses.map(course => renderCourseCard(course, '[#AB8FFF]'))
                  : FALLBACK_ADULT_COURSES.map(course => renderFallbackCard(course, '[#AB8FFF]'))
                }
              </div>

              {/* Adults Assessment Test Button */}
              <div className="mt-10 flex justify-center">
                <button 
                  onClick={() => handleOpenAssessment('teens_adults')}
                  className="inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-8 py-4 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#25D366]/30 active:scale-95"
                >
                  <GraduationCap size={20} />
                  Take the Test — Teens & Adults
                </button>
              </div>
            </div>

            {/* Kids Section */}
            <div className="mb-32">
              <div className="flex items-center gap-6 mb-12">
                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Kids</h4>
                <div className="h-[1px] flex-grow bg-gradient-to-r from-gray-200 to-transparent"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {hasDbCourses && kidsCourses.length > 0
                  ? kidsCourses.map(course => renderCourseCard(course, '[#FFC1F2]'))
                  : FALLBACK_KIDS_COURSES.map(course => renderFallbackCard(course, '[#FFC1F2]'))
                }
              </div>

              {/* Kids Assessment Test Button */}
              <div className="mt-10 flex justify-center">
                <button 
                  onClick={() => handleOpenAssessment('kids')}
                  className="inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-8 py-4 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#25D366]/30 active:scale-95"
                >
                  <Baby size={20} />
                  Take the Test — Kids
                </button>
              </div>
            </div>

            {/* Pathway Courses (Premium/Gold) - Only show if they exist */}
            {pathwayCourses.length > 0 && (
              <div>
                <div className="flex items-center gap-6 mb-12">
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Premium Pathways</h4>
                  <div className="h-[1px] flex-grow bg-gradient-to-r from-gray-200 to-transparent"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {pathwayCourses.map(course => renderCourseCard(course, '[#AB8FFF]'))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Assessment Popup */}
      <AssessmentPopup
        isOpen={showAssessment}
        onClose={() => setShowAssessment(false)}
        testType={assessmentType}
        onNavigate={onNavigate}
      />
    </section>
  );
};

export default CoursesSection;
