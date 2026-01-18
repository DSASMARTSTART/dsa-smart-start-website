
import React from 'react';
import { ChevronRight, GraduationCap, Baby, Sparkles } from 'lucide-react';

const RoutesSection: React.FC = () => {
  return (
    <section id="routes" className="py-32 bg-white px-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
        <div className="absolute top-1/4 left-0 w-64 h-64 bg-purple-100 rounded-full blur-[120px] opacity-30 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-pink-100 rounded-full blur-[120px] opacity-30 animate-pulse delay-700"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 mb-6">
            <Sparkles size={14} className="text-purple-500" />
            <span className="text-[10px] uppercase tracking-widest text-purple-600 font-bold">Educational Excellence</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-4 tracking-tight">
            Discover Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9b4dff] via-[#8a3ffc] to-[#ff2d85]">Routes</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-lg">
            Choose the path that fits your current stage of life and learning goals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Teens & Adults */}
          <div className="group relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-1 lg:p-1.5 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-200">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-700 to-blue-800 opacity-90 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 bg-black/10 backdrop-blur-sm rounded-[2.3rem] p-10 lg:p-14 h-full flex flex-col justify-between border border-white/10">
              <div>
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8 border border-white/20 group-hover:scale-110 transition-transform duration-500">
                  <GraduationCap size={32} className="text-white" />
                </div>
                <h4 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                  TEENS & <br /> <span className="text-purple-300">ADULTS</span>
                </h4>
                <p className="text-purple-100/70 text-lg mb-8 max-w-sm">
                  Advanced cognitive tools and strategies designed for mature learners with dyslexia.
                </p>
              </div>
              <button className="group/btn flex items-center gap-3 w-fit bg-white text-gray-900 px-8 py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-purple-50 transition-all duration-300">
                Explore Adult Courses
                <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Kids */}
          <div className="group relative overflow-hidden rounded-[2.5rem] bg-rose-900 p-1 lg:p-1.5 transition-all duration-500 hover:shadow-2xl hover:shadow-pink-200">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-600 to-orange-500 opacity-90 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 bg-black/10 backdrop-blur-sm rounded-[2.3rem] p-10 lg:p-14 h-full flex flex-col justify-between border border-white/10">
              <div>
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8 border border-white/20 group-hover:scale-110 transition-transform duration-500">
                  <Baby size={32} className="text-white" />
                </div>
                <h4 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                  DSA SMART <br /> <span className="text-pink-100">KIDS</span>
                </h4>
                <p className="text-pink-100/70 text-lg mb-8 max-w-sm">
                  Gamified and multisensory learning paths to make English a fun adventure for children.
                </p>
              </div>
              <button className="group/btn flex items-center gap-3 w-fit bg-white text-gray-900 px-8 py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-pink-50 transition-all duration-300">
                Explore Kids Courses
                <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RoutesSection;
