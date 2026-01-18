
import React, { useEffect, useState } from 'react';
import { Star, Zap, Award, Music, Play, Layers, Compass, ChevronRight, Crown, Diamond, Loader2 } from 'lucide-react';
import { coursesApi } from '../data/supabaseStore';
import { Course, CourseLevel } from '../types';

// Level configuration for icons and colors
const LEVEL_CONFIG: Record<CourseLevel, { icon: React.ReactNode; color: string; label: string; category: 'adult' | 'kids' | 'pathway' }> = {
  'A1': { icon: <Layers size={22} />, color: 'from-[#AB8FFF] to-[#d4bfff]', label: 'Beginner', category: 'adult' },
  'A2': { icon: <Compass size={22} />, color: 'from-[#9b7aff] to-[#deaaff]', label: 'Elementary', category: 'adult' },
  'B1': { icon: <Zap size={22} />, color: 'from-[#8a65ff] to-[#FFC1F2]', label: 'Intermediate', category: 'adult' },
  'Kids': { icon: <Music size={22} />, color: 'from-[#FFC1F2] to-[#ffdaeb]', label: 'Young Learners', category: 'kids' },
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
}

const CoursesSection: React.FC<CoursesSectionProps> = ({ onNavigateToSyllabus }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const data = await coursesApi.list({ isPublished: true });
        setCourses(data);
      } catch (error) {
        console.error('Error loading courses:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
  }, []);

  // Split courses into categories
  const adultCourses = courses.filter(c => ['A1', 'A2', 'B1'].includes(c.level));
  const kidsCourses = courses.filter(c => c.level === 'Kids');
  const pathwayCourses = courses.filter(c => ['Premium', 'Gold'].includes(c.level));

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
        className={`group relative bg-white rounded-[2rem] p-4 pb-10 border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-${shadowColor}/20 transition-all duration-500 overflow-hidden cursor-pointer`}
        onClick={() => handleViewDetails(course)}
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
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-purple-600" />
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
    </section>
  );
};

export default CoursesSection;
