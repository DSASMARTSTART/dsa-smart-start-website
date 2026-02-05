
import React from 'react';
import { Zap, TrendingUp, Globe, Heart, Star, Layout, Users, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';

interface MethodSectionProps {
  onNavigate?: (path: string) => void;
}

const MethodSection: React.FC<MethodSectionProps> = ({ onNavigate }) => {
  const metrics = [
    { label: 'CLEAR AND GUIDED LEARNING', value: '100%', suffix: 'STRUCTURED METHOD', color: 'text-purple-600' },
    { label: 'NATURAL AND INTUITIVE PROCESS', value: '100%', suffix: 'EFFORTLESS LEARNING', color: 'text-pink-500' },
    { label: 'FASTER RESULTS THAN TRADITIONAL METHODS', value: '6x', suffix: 'FASTER', color: 'text-blue-500' },
    { label: 'INDEPENDENT LEARNING SKILLS', value: '90%', suffix: 'MORE AUTONOMY', color: 'text-indigo-600' },
    { label: 'SPEAKING WITHOUT FEAR', value: '95%', suffix: 'HIGHER CONFIDENCE', color: 'text-orange-500' },
    { label: 'IMPROVED ATTENTION SPAN', value: '80%', suffix: 'BETTER FOCUS', color: 'text-green-500' },
  ];

  return (
    <section id="methods" className="bg-black py-32 px-6 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24 animate-reveal">
          <div className="inline-block px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold tracking-[0.2em] mb-6 border border-purple-500/30 uppercase">
            Innovative Methodology
          </div>
          <h3 className="text-4xl md:text-7xl font-black text-white mb-8 tracking-tight">
            English with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9b4dff] via-[#8a3ffc] to-[#ff2d85]">DSA!</span>
          </h3>
          <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto font-medium leading-relaxed">
            "You deserve the best for yourself! Enough with traditional, boring and ineffective methods."
          </p>
        </div>

        {/* Dynamic Performance Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-32">
          {metrics.map((m, i) => (
            <div key={i} className="group p-8 rounded-[2rem] bg-white/5 border border-white/10 text-center hover:bg-white/10 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 animate-reveal" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={`text-4xl md:text-5xl font-black ${m.color} mb-2 group-hover:scale-110 transition-transform`}>{m.value}</div>
              <div className="text-[10px] font-black text-white mb-1 tracking-widest leading-tight">{m.suffix}</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Passport Section - The "World Class" Card */}
        <div className="relative group animate-reveal">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative bg-white/5 rounded-[3rem] p-12 lg:p-24 border border-white/10 shadow-xl overflow-hidden">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <ShieldCheck className="text-purple-400" size={20} />
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Premium Learning Experience</span>
                </div>
                <h4 className="text-4xl md:text-5xl font-black text-white mb-8 leading-[1.1]">
                  It's a real <span className="italic font-medium">"Passport"</span> to the World!
                </h4>
                <p className="text-gray-400 text-lg mb-10 leading-loose">
                  Eduway is the first program in the world specifically designed for the dyslexic mind, transforming obstacles into clear pathways.
                </p>
                <div className="space-y-4">
                  {['Scientifically Validated', 'Multisensory Design', 'Success Guarantee'].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm font-bold text-white">
                      <CheckCircle size={18} className="text-green-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl mb-4">🌍</div>
                  <p className="text-gray-400 text-lg">Open doors worldwide with confidence</p>
                </div>
              </div>
            </div>

            {/* CTA Overlay */}
            <div className="mt-24 pt-16 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <h5 className="text-2xl font-bold text-white mb-2">Ready to change your future?</h5>
                <p className="text-gray-400">Join over 3,000 successful students every year.</p>
              </div>
              <button 
                onClick={() => onNavigate?.('courses')}
                className="bg-[#25D366] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest hover:bg-[#1ebe5d] transition-all shadow-xl shadow-[#25D366]/30 hover:-translate-y-1 active:scale-95"
              >
                Explore Courses
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MethodSection;
