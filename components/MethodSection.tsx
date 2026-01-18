
import React from 'react';
import { Zap, TrendingUp, Globe, Heart, Star, Layout, Users, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';

const MethodSection: React.FC = () => {
  const metrics = [
    { label: 'LEARNING EFFECTIVENESS', value: '6x', suffix: 'MORE EFFECTIVE', color: 'text-purple-600' },
    { label: 'MEMORY RETENTION', value: '70%', suffix: 'FASTER STORAGE', color: 'text-pink-500' },
    { label: 'DIFFICULTY REDUCTION', value: '85%', suffix: 'LESS STRESS', color: 'text-blue-500' },
    { label: 'SPEAKING IMPROVEMENT', value: '110%', suffix: 'BETTER FLUENCY', color: 'text-indigo-600' },
    { label: 'MEASURABLE PROGRESS', value: '4', suffix: 'WEEKS TARGET', color: 'text-orange-500' },
  ];

  const benefits = [
    {
      title: 'GREATER AUTONOMY',
      desc: "Fun, dynamic activities designed to make you more independent in learning English.",
      icon: <Layout className="text-purple-500" />
    },
    {
      title: 'IMPROVED SELF-ESTEEM',
      desc: "Successes achieved during the program build motivation and long-term confidence.",
      icon: <Heart className="text-pink-500" />
    },
    {
      title: 'INTERNATIONAL EXAMS',
      desc: "Prepare for official exams with techniques aimed specifically at neurodiverse needs.",
      icon: <Globe className="text-blue-500" />
    },
    {
      title: 'ENGAGING PROGRAM',
      desc: "Interactive materials and video lessons designed to maintain focus and curiosity.",
      icon: <Star className="text-yellow-500" />
    },
    {
      title: 'MULTISENSORY TOOLS',
      desc: "Visual, auditory, and hands-on tools make memorization natural and easy.",
      icon: <Sparkles className="text-purple-400" />
    },
    {
      title: 'PERSONAL TUTOR',
      desc: "Receive dedicated assistance from our specialists to overcome every roadblock.",
      icon: <Users className="text-indigo-500" />
    },
  ];

  return (
    <section id="methods" className="bg-white py-32 px-6 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24 animate-reveal">
          <div className="inline-block px-4 py-1.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold tracking-[0.2em] mb-6 border border-purple-100 uppercase">
            Innovative Methodology
          </div>
          <h3 className="text-4xl md:text-7xl font-black text-gray-900 mb-8 tracking-tight">
            English with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9b4dff] via-[#8a3ffc] to-[#ff2d85]">DSA!</span>
          </h3>
          <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto font-medium leading-relaxed">
            "You deserve the best for yourself! Enough with traditional, boring and ineffective methods."
          </p>
        </div>

        {/* Dynamic Performance Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-32">
          {metrics.map((m, i) => (
            <div key={i} className="group p-8 rounded-[2rem] bg-gray-50 border border-gray-100 text-center hover:bg-white hover:shadow-2xl hover:shadow-purple-100 transition-all duration-500 animate-reveal" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={`text-4xl md:text-5xl font-black ${m.color} mb-2 group-hover:scale-110 transition-transform`}>{m.value}</div>
              <div className="text-[10px] font-black text-gray-900 mb-1 tracking-widest leading-tight">{m.suffix}</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Passport Section - The "World Class" Card */}
        <div className="relative group animate-reveal">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative bg-white rounded-[3rem] p-12 lg:p-24 border border-gray-100 shadow-xl overflow-hidden">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-50/50 to-transparent pointer-events-none"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start relative z-10">
              <div className="lg:col-span-5">
                <div className="flex items-center gap-2 mb-6">
                  <ShieldCheck className="text-purple-600" size={20} />
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">Premium Learning Experience</span>
                </div>
                <h4 className="text-4xl md:text-5xl font-black text-gray-900 mb-8 leading-[1.1]">
                  It's a real <span className="italic font-medium">"Passport"</span> to the World!
                </h4>
                <p className="text-gray-500 text-lg mb-10 leading-loose">
                  DSA SMART START is the first program in the world specifically designed for the dyslexic mind, transforming obstacles into clear pathways.
                </p>
                <div className="space-y-4">
                  {['Scientifically Validated', 'Multisensory Design', 'Success Guarantee'].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm font-bold text-gray-800">
                      <CheckCircle size={18} className="text-green-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12">
                {benefits.map((b, i) => (
                  <div key={i} className="flex flex-col gap-4 group/item">
                    <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-2xl group-hover/item:bg-purple-50 transition-colors group-hover/item:scale-110 duration-300">
                      {b.icon}
                    </div>
                    <div>
                      <h6 className="font-bold text-gray-900 tracking-tight text-lg mb-2">{b.title}</h6>
                      <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Overlay */}
            <div className="mt-24 pt-16 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <h5 className="text-2xl font-bold text-gray-900 mb-2">Ready to change your future?</h5>
                <p className="text-gray-500">Join over 3,000 successful students every year.</p>
              </div>
              <button className="bg-purple-600 text-white px-12 py-5 rounded-full font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 hover:-translate-y-1 active:scale-95">
                BOOK NOW
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MethodSection;
