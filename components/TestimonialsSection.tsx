
import React from 'react';
import { Quote, Star } from 'lucide-react';

const TestimonialsSection: React.FC = () => {
  const reviews = [
    {
      name: "Marco",
      role: "University student with DSA",
      text: "Thanks to this method, I was able to pass an important English exam without any anxiety. I never thought I could do it so easily.",
      rating: 5
    },
    {
      name: "Elena",
      role: "Mother of a student with DSA",
      text: "This method has made English fun and accessible for my son. Seeing his progress stress-free has been a real joy!",
      rating: 5
    },
    {
      name: "Marta",
      role: "High school student with DSA",
      text: "I never imagined that an English language course could be so suited to my needs. Now I study without anxiety and with excellent results.",
      rating: 5
    },
    {
      name: "Roberto",
      role: "Father of a DSA student",
      text: "I purchased DSA Smart Start for my dyslexic son and have seen a real change. The material is well-structured and easy to follow.",
      rating: 5
    },
    {
      name: "Lucia",
      role: "Mother of a student with SLD",
      text: "The method has transformed my son's learning. He finally studies English without frustration and with incredible results!",
      rating: 5
    },
    {
      name: "Francesco",
      role: "DSA student",
      text: "After years of struggling with English, I've finally found a program that accommodates my learning pace and makes me feel capable.",
      rating: 5
    }
  ];

  return (
    <section className="py-32 px-6 bg-gray-50/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-sm font-bold text-purple-600 uppercase tracking-[0.3em] mb-4">Success Stories</h2>
          <h3 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight">What They <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9b4dff] via-[#8a3ffc] to-[#ff2d85]">Say About Us</span></h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((rev, i) => (
            <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm relative group hover:-translate-y-2 transition-all duration-500 flex flex-col">
              <div className="flex gap-1 mb-6">
                {[...Array(rev.rating)].map((_, i) => (
                  <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <Quote className="absolute top-10 right-10 text-purple-50 opacity-50 group-hover:text-purple-100 transition-colors" size={60} />
              
              <div className="relative z-10 flex-grow">
                <p className="text-gray-700 italic text-lg leading-relaxed mb-8">"{rev.text}"</p>
              </div>
              
              <div className="pt-6 border-t border-gray-50">
                <h4 className="font-black text-gray-900">{rev.name}</h4>
                <p className="text-[10px] text-purple-600 font-bold uppercase tracking-widest mt-1">{rev.role}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200"></div>
              ))}
            </div>
            <p className="text-sm font-bold text-gray-600">Joined by <span className="text-purple-600">+3,000 successful students</span> every year</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
