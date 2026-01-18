
import React from 'react';
import { Heart } from 'lucide-react';

const MissionSection: React.FC = () => {
  const points = [
    {
      number: '01.',
      highlight: '+3,000',
      text: 'Every year, students with learning disabilities choose DSA SMART START for their learning.',
    },
    {
      number: '02.',
      highlight: 'Method',
      text: 'Every year thousands DSA Students Discover a New Method for Learning English with DSA SMART START',
    },
    {
      number: '03.',
      highlight: "Let's help",
      text: 'Children, teenagers and adults with learning disabilities transform the impossible into possible',
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
              {/* Numbering Background */}
              <span className="absolute -top-6 left-8 text-7xl font-black text-purple-100/50 group-hover:text-purple-100 transition-colors pointer-events-none">
                {point.number}
              </span>

              <div className="relative z-10 pt-4">
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
      </div>

      {/* Background decoration */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-100/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-pink-100/30 rounded-full blur-[100px] pointer-events-none" />
    </section>
  );
};

export default MissionSection;
