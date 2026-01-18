
import React from 'react';
import { ChevronRight, Users, Sparkles } from 'lucide-react';

const AboutSection: React.FC = () => {
  return (
    <section className="relative bg-white py-24 md:py-32 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Text Content */}
        <div className="flex flex-col animate-reveal">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 shadow-sm border border-purple-100">
              <Users size={28} />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">
              Who are we?
            </h2>
          </div>

          <div className="space-y-8">
            <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
              We are here to break down every <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9b4dff] via-[#8a3ffc] to-[#ff2d85]">barrier</span> and prejudice built against those with learning disabilities.
            </p>

            <div className="w-20 h-1.5 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full" />

            <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
              <span className="font-black text-gray-900 uppercase tracking-tighter">DSA SMART START</span> is a group of highly qualified language professionals, supported by psychology experts. 
              <br /><br />
              Since 2008, our team has supported children and adults with dyslexia in their English language studies, offering targeted tools and strategies. We transform challenges into real opportunities for growth.
            </p>
          </div>

          <div className="mt-12">
            <button className="group flex items-center gap-3 bg-gray-900 text-white px-10 py-4 rounded-full font-black text-xs tracking-widest transition-all duration-300 uppercase hover:bg-purple-600 hover:-translate-y-1 shadow-xl shadow-gray-200">
              Find out more
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Placeholder Photo */}
        <div className="relative group animate-reveal stagger-1">
          <div className="absolute -inset-4 bg-purple-100 rounded-[3rem] blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
          <div className="relative overflow-hidden rounded-[3rem] aspect-[4/3] lg:aspect-square shadow-2xl border-8 border-white">
            <img 
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1200" 
              alt="Our professional team collaborating" 
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 to-transparent"></div>
            
            {/* Floating Badge */}
            <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/50 max-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="text-purple-600" size={16} />
                <span className="text-[10px] font-black uppercase text-purple-600">Experts</span>
              </div>
              <p className="text-xs font-bold text-gray-900">Dedicated specialists working for your success.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-purple-50 rounded-full blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-pink-50 rounded-full blur-[120px] opacity-40 pointer-events-none" />
    </section>
  );
};

export default AboutSection;
