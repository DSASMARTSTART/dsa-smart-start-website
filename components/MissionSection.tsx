
import React from 'react';
import { Heart, ChevronRight } from 'lucide-react';

interface MissionSectionProps {
  onNavigate?: (path: string) => void;
}

const MissionSection: React.FC<MissionSectionProps> = ({ onNavigate }) => {
  const points = [
    {
      highlight: '+3,000',
      text: 'DSA students every year choose DSA SMART START for their learning journey.',
    },
    {
      highlight: 'Method',
      text: 'Every year thousands of DSA students discover a new way to learn English with DSA SMART START.',
    },
    {
      highlight: "Let's Help",
      text: 'We help DSA children, teens, and adults turn the impossible into possible.',
    },
  ];

  return (
    <section className="relative py-24 bg-[#fafafa] overflow-hidden">
      {/* Top Border Accent */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-200 to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Main Heading */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center p-2 bg-pink-50 text-pink-500 rounded-full mb-6">
            <Heart size={20} fill="currentColor" className="opacity-80" />
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
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
              className="group relative flex flex-col p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-500 hover:-translate-y-2"
            >
              <div className="relative z-10">
                <div className="mb-4">
                   <span className="text-2xl font-bold text-purple-600 tracking-tight">
                    {point.highlight}
                   </span>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed font-medium">
                  {point.text}
                </p>
              </div>

              {/* Decorative Corner */}
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
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
            className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-4 rounded-full font-bold uppercase tracking-wider hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-200 active:scale-95"
          >
            Explore Courses
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-100/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-pink-100/30 rounded-full blur-[100px] pointer-events-none" />
    </section>
  );
};

export default MissionSection;
