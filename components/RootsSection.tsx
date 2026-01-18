
import React from 'react';
import { Star, Zap, Award, BookOpen, Music, Play, Layers, Compass, ChevronRight, Sparkles, GraduationCap, Baby } from 'lucide-react';

interface RootsSectionProps {
  onNavigate?: (path: string) => void;
}

const RootsSection: React.FC<RootsSectionProps> = ({ onNavigate }) => {
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
            Discover Our <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#9b4dff] via-[#8a3ffc] to-[#ff2d85] italic px-4">Roots</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Meticulously structured pathways to accommodate neurodiversity, ensuring progress without frustration across all age groups.
          </p>
        </div>

        {/* Adults & Teens Section */}
        <div className="mb-32">
          <div className="flex items-center gap-6 mb-12 animate-reveal stagger-1">
            <div className="flex items-center gap-3">
              <GraduationCap className="text-indigo-600" size={24} />
              <h4 className="text-2xl font-black text-gray-900 tracking-tight">Adults & Teens</h4>
            </div>
            <div className="h-[1px] flex-grow bg-gradient-to-r from-indigo-200 to-transparent"></div>
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
          <div className="flex items-center gap-6 mb-12 animate-reveal stagger-2">
            <div className="flex items-center gap-3">
              <Baby className="text-pink-600" size={24} />
              <h4 className="text-2xl font-black text-gray-900 tracking-tight">Kids Program</h4>
            </div>
            <div className="h-[1px] flex-grow bg-gradient-to-r from-pink-200 to-transparent"></div>
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
        
        {/* Unified Booking CTA Area */}
        <div className="mt-24 text-center animate-reveal stagger-3">
          <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-gray-100 inline-block relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <h5 className="text-2xl font-bold text-gray-900 mb-6">Not sure which root is for you?</h5>
              <a 
                href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0qY73eSZNjDKlM_CQETEMDZFNGB5SONV3eJl2rbRFfK6hT6uNAwz_X4L7Jo0lIbuw-zerkbJWu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-purple-600 text-white px-12 py-5 rounded-full font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 active:scale-95"
              >
                Book A Consultation
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RootsSection;
