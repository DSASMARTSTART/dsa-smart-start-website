
import React from 'react';
import { Heart, ChevronRight } from 'lucide-react';

interface MissionSectionProps {
  onNavigate?: (path: string) => void;
}

const MissionSection: React.FC<MissionSectionProps> = ({ onNavigate }) => {
  const points = [
    {
      highlight: '+3,000',
      text: 'DSA students every year choose Eduway for their learning journey.',
    },
    {
      highlight: 'Method',
      text: 'Every year thousands of DSA students discover a new way to learn English with Eduway.',
    },
    {
      highlight: "Let's Help",
      text: 'We help DSA children, teens, and adults turn the impossible into possible.',
    },
  ];

  return (
    <section className="relative py-24 bg-black overflow-hidden">
      {/* Top Border Accent */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Main Heading */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center p-2 bg-pink-500/20 text-pink-400 rounded-full mb-6">
            <Heart size={20} fill="currentColor" className="opacity-80" />
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Every step forward is a victory.<br />
            <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#9b4dff] via-[#8a3ffc] to-[#ff2d85] italic font-medium px-4">
              We Walk By Your Side!
            </span>
          </h2>
        </div>

        {/* Points Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          {points.map((point, index) => (
            <div 
              key={index} 
              className="group relative flex flex-col p-8 bg-white/5 rounded-3xl border border-white/10 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-500 hover:-translate-y-2"
            >
              <div className="relative z-10">
                <div className="mb-4">
                   <span className="text-2xl font-bold text-purple-400 tracking-tight">
                    {point.highlight}
                   </span>
                </div>
                <p className="text-gray-300 text-lg leading-relaxed font-medium">
                  {point.text}
                </p>
              </div>

              {/* Decorative Corner */}
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rotate-45 bg-purple-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center mt-16">
          <button
            onClick={() => onNavigate?.('courses')}
            className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-10 py-4 rounded-full font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#25D366]/30 active:scale-95"
          >
            Explore
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-pink-600/20 rounded-full blur-[100px] pointer-events-none" />
    </section>
  );
};

export default MissionSection;
