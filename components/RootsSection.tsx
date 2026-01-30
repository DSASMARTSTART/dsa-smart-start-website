
import React, { useState } from 'react';
import { Star, Zap, Award, BookOpen, Music, Play, Layers, Compass, ChevronRight, Sparkles, GraduationCap, Baby, ClipboardCheck } from 'lucide-react';
import AssessmentPopup from './AssessmentPopup';
import { AssessmentTestType } from '../types';

interface RootsSectionProps {
  onNavigate?: (path: string) => void;
}

const RootsSection: React.FC<RootsSectionProps> = ({ onNavigate }) => {
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentType, setAssessmentType] = useState<AssessmentTestType>('teens_adults');

  const handleOpenAssessment = (type: AssessmentTestType) => {
    setAssessmentType(type);
    setShowAssessment(true);
  };

  const adultCourses = [
    { name: "A1 LEVEL", level: "Beginner", icon: <Layers size={22} />, color: "from-blue-500 to-indigo-600", desc: "Foundation strategies for complete beginners with dyslexia." },
    { name: "A2 LEVEL", level: "Elementary", icon: <Compass size={22} />, color: "from-indigo-500 to-purple-600", desc: "Developing confidence in daily communication and basic structures." },
    { name: "B1 LEVEL", level: "Intermediate", icon: <Zap size={22} />, color: "from-purple-600 to-pink-600", desc: "Independent usage with specialized DSA tools for advanced reasoning." },
  ];

  const kidsCourses = [
    { name: "BASIC", level: "Early Years", icon: <Music size={22} />, color: "from-pink-500 to-rose-500", desc: "Introduction through songs, visuals, and sensory exploration." },
    { name: "MEDIUM", level: "Primary", icon: <Play size={22} />, color: "from-rose-500 to-orange-500", desc: "Interactive storytelling and vocabulary games for active focus." },
    { name: "ADVANCED", level: "Pre-Teen", icon: <Award size={22} />, color: "from-orange-500 to-amber-500", desc: "Preparing for school success with advanced visual mnemonics." },
  ];

  return (
    <section className="py-32 bg-slate-50 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-purple-100 rounded-full blur-[120px] opacity-30 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-pink-100 rounded-full blur-[120px] opacity-30 animate-pulse delay-700"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-24 animate-reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 mb-6">
            <Sparkles size={14} className="text-purple-500" />
            <span className="text-[10px] uppercase tracking-widest text-purple-600 font-bold">Comprehensive Curriculum</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tighter">
            Discover Your <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#9b4dff] via-[#8a3ffc] to-[#ff2d85] italic px-4">Level</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Take the test to discover your English level and learning program designed for you.
          </p>
        </div>

        {/* Teens & Adults Section */}
        <div className="mb-32">
          <div className="flex items-center gap-6 mb-8 animate-reveal stagger-1">
            <div className="flex items-center gap-3">
              <GraduationCap className="text-indigo-600" size={24} />
              <h4 className="text-2xl font-black text-gray-900 tracking-tight">Teens & Adults</h4>
            </div>
            <div className="h-[1px] flex-grow bg-gradient-to-r from-indigo-200 to-transparent"></div>
          </div>

          {/* Teens & Adults Assessment Test CTA */}
          <div className="flex justify-center mb-10 animate-reveal stagger-1">
            <button 
              onClick={() => handleOpenAssessment('teens_adults')}
              className="inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-8 py-4 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#25D366]/30 active:scale-95"
            >
              <ClipboardCheck size={20} />
              Take the Test — Teens & Adults
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {adultCourses.map((course, i) => (
              <div key={i} className="group relative bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-200/20 transition-all duration-500 animate-reveal" style={{ animationDelay: `${0.1 + (i * 0.1)}s` }}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${course.color} text-white flex items-center justify-center mb-8 shadow-lg shadow-indigo-200 transform group-hover:-translate-y-2 transition-transform duration-500`}>
                  {course.icon}
                </div>
                <div className="mb-6">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1 block">{course.level}</span>
                  <h5 className="text-2xl font-black text-gray-900 tracking-tight">SMART START {course.name}</h5>
                </div>
                <p className="text-gray-500 leading-relaxed mb-8 text-sm">
                  {course.desc}
                </p>
                <div className="pt-8 border-t border-gray-50 flex items-center justify-between">
                   <button 
                     onClick={() => onNavigate?.('courses')}
                     className="text-[11px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2 group-hover:gap-4 transition-all"
                   >
                     View Details
                     <ChevronRight size={14} />
                   </button>
                   <Star size={16} className="text-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kids Section */}
        <div>
          <div className="flex items-center gap-6 mb-8 animate-reveal stagger-2">
            <div className="flex items-center gap-3">
              <Baby className="text-pink-600" size={24} />
              <h4 className="text-2xl font-black text-gray-900 tracking-tight">Kids</h4>
            </div>
            <div className="h-[1px] flex-grow bg-gradient-to-r from-pink-200 to-transparent"></div>
          </div>

          {/* Kids Assessment Test CTA */}
          <div className="flex justify-center mb-10 animate-reveal stagger-2">
            <button 
              onClick={() => handleOpenAssessment('kids')}
              className="inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-8 py-4 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#25D366]/30 active:scale-95"
            >
              <ClipboardCheck size={20} />
              Take the Test — Kids
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {kidsCourses.map((course, i) => (
              <div key={i} className="group relative bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-pink-200/20 transition-all duration-500 animate-reveal" style={{ animationDelay: `${0.2 + (i * 0.1)}s` }}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${course.color} text-white flex items-center justify-center mb-8 shadow-lg shadow-pink-200 transform group-hover:-translate-y-2 transition-transform duration-500`}>
                  {course.icon}
                </div>
                <div className="mb-6">
                  <span className="text-[10px] font-black text-pink-500 uppercase tracking-[0.2em] mb-1 block">{course.level}</span>
                  <h5 className="text-2xl font-black text-gray-900 tracking-tight">KIDS {course.name}</h5>
                </div>
                <p className="text-gray-500 leading-relaxed mb-8 text-sm">
                  {course.desc}
                </p>
                <div className="pt-8 border-t border-gray-50 flex items-center justify-between">
                   <button 
                     onClick={() => onNavigate?.('courses')}
                     className="text-[11px] font-black uppercase tracking-widest text-pink-600 flex items-center gap-2 group-hover:gap-4 transition-all"
                   >
                     View Details
                     <ChevronRight size={14} />
                   </button>
                   <Star size={16} className="text-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Still Not Sure CTA */}
        <div className="mt-20 text-center animate-reveal stagger-3">
          <div className="bg-white p-10 sm:p-12 rounded-[3rem] shadow-lg border border-gray-100 max-w-2xl mx-auto">
            <h5 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4 tracking-tight">
              Still not sure which level is right for you?
            </h5>
            <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg">
              Book a free consultation and one of our specialists will guide you to the perfect learning path.
            </p>
            <a 
              href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0qY73eSZNjDKlM_CQETEMDZFNGB5SONV3eJl2rbRFfK6hT6uNAwz_X4L7Jo0lIbuw-zerkbJWu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-[#25D366] text-white px-10 py-4 rounded-full font-black uppercase tracking-widest hover:bg-[#1ebe5d] transition-all shadow-xl shadow-[#25D366]/30 active:scale-95"
            >
              Book a Free Call
              <ChevronRight size={20} />
            </a>
          </div>
        </div>
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

export default RootsSection;
