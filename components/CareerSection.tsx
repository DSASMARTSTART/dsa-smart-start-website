
import React from 'react';
import { Search, Map, Rocket } from 'lucide-react';

const CareerSection: React.FC = () => {
  const steps = [
    {
      icon: <Search className="text-purple-400" />,
      title: "1. Discover your abilities",
      desc: "Take our Career Advisor Test and get an accurate assessment of your knowledge"
    },
    {
      icon: <Map className="text-blue-400" />,
      title: "2. Get your plan",
      desc: "Our team, supported by scientific research, will calculate your ideal study plan to guarantee your success."
    },
    {
      icon: <Rocket className="text-pink-400" />,
      title: "3. Start the Journey",
      desc: "With the Satisfaction Guarantee you start your journey and if you are not satisfied after 60 days, we will refund you"
    }
  ];

  return (
    <section className="py-32 px-6 bg-[#0f172a] text-white overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] -translate-x-1/2 translate-y-1/2"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24 animate-reveal">
          <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter leading-tight">
            Your future deserves a <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">confident guide.</span>
          </h2>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-12 font-medium">
            Discover our Career Advisor service and turn your dreams into concrete results with expert mentorship.
          </p>
          <button className="bg-gradient-to-r from-purple-600 to-blue-600 px-14 py-5 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-purple-500/20 active:scale-95">
            BOOK NOW
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((step, i) => (
            <div key={i} className="group bg-white/5 p-10 rounded-[2.5rem] border border-white/10 hover:border-purple-500/50 transition-all duration-500 animate-reveal" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 group-hover:bg-white/10 transition-all">
                {step.icon}
              </div>
              <h4 className="text-2xl font-bold mb-4 tracking-tight">{step.title}</h4>
              <p className="text-gray-400 leading-relaxed font-medium">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CareerSection;
