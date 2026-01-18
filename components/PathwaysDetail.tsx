
import React from 'react';
import { CheckCircle2, Award, ChevronRight, Sparkles } from 'lucide-react';

const PathwaysDetail: React.FC = () => {
  const kidBenefits = [
    "Improvement in grades",
    "Reducing school-related stress",
    "Development of self-esteem and motivation",
    "Flexibility and comfort",
    "Continuous feedback and parental involvement"
  ];

  const exams = [
    { title: "Cambridge English", detail: "KET, PET, FCE, CAE, CPE" },
    { title: "IELTS", detail: "For Study or Work Abroad" },
    { title: "TOEFL", detail: "International University Admission" },
    { title: "Trinity College London", detail: "Graded Exams" },
    { title: "ESOL", detail: "Practical language skills" }
  ];

  return (
    <section className="py-32 px-6 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-40">
        
        {/* Story & Kids Path */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="relative group animate-reveal">
             <div className="absolute -inset-6 bg-pink-100 rounded-[3rem] blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
             <div className="relative overflow-hidden rounded-[3rem] aspect-[4/5] shadow-2xl border-4 border-white">
                <img 
                  src="https://images.unsplash.com/photo-1491013516836-7ad643eead76?auto=format&fit=crop&q=80&w=1200" 
                  alt="Child learning" 
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-pink-900/60 to-transparent"></div>
                <div className="absolute bottom-10 left-10 text-white">
                   <p className="text-xs font-black uppercase tracking-widest mb-2">Success Journey</p>
                   <p className="text-2xl font-bold italic">"Making English a happy adventure"</p>
                </div>
             </div>
          </div>
          
          <div className="flex flex-col animate-reveal">
            <div className="flex items-center gap-3 mb-6">
               <span className="w-10 h-[1px] bg-pink-300"></span>
               <span className="text-xs font-black text-pink-600 uppercase tracking-widest">Parental Support</span>
            </div>
            <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-8 leading-[1.1] tracking-tight">
              Does your child have dyslexia and learning English seems <span className="text-pink-600">impossible?</span>
            </h3>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed font-medium italic">
              "With DSA SMART START it's possible! Your child will have the keys and methods to achieve amazing results and make learning fun."
            </p>
            <div className="grid grid-cols-1 gap-5 mb-12">
              {kidBenefits.map((b, i) => (
                <div key={i} className="flex items-center gap-4 bg-pink-50/50 p-4 rounded-2xl border border-pink-100/50 hover:bg-pink-50 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="text-pink-600" size={14} />
                  </div>
                  <span className="text-gray-800 font-bold text-sm tracking-tight">{b}</span>
                </div>
              ))}
            </div>
            <button className="flex items-center justify-center gap-3 bg-pink-600 text-white px-12 py-5 rounded-full font-black uppercase tracking-widest hover:bg-pink-700 transition-all shadow-xl shadow-pink-100 active:scale-95">
              BOOK NOW
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Exams & Professional Path */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div className="order-2 lg:order-1 flex flex-col animate-reveal">
            <div className="flex items-center gap-3 mb-6">
               <span className="w-10 h-[1px] bg-blue-300"></span>
               <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Global Opportunities</span>
            </div>
            <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-8 leading-[1.1] tracking-tight">
              Do you need to pass an International English Exam and <span className="text-blue-600">want to do it well?</span>
            </h3>
            <p className="text-lg text-gray-500 mb-10 leading-relaxed">
              Our programs are designed specifically to prepare DSA students for exams recognized by the <span className="font-black text-gray-900 underline decoration-blue-500 decoration-2">MIUR</span>, using tools that align with neurodiverse learning styles.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
              {exams.map((exam, i) => (
                <div key={i} className="group p-5 bg-gray-50 rounded-[2rem] border border-gray-100 hover:border-blue-200 hover:bg-white transition-all">
                  <h4 className="text-sm font-black text-gray-900 mb-1">{exam.title}</h4>
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">{exam.detail}</p>
                </div>
              ))}
            </div>

            <button className="flex items-center justify-center gap-3 bg-gray-900 text-white px-12 py-5 rounded-full font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-gray-100 active:scale-95">
              BOOK NOW
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="relative order-1 lg:order-2 group animate-reveal">
             <div className="absolute -inset-6 bg-blue-100 rounded-[3rem] blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
             <div className="relative overflow-hidden rounded-[3rem] aspect-[4/5] shadow-2xl border-4 border-white">
                <img 
                  src="https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=1200" 
                  alt="Young professionals" 
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 to-transparent"></div>
                <div className="absolute top-10 right-10 flex flex-col items-end text-white">
                   <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4">
                     <Award size={24} />
                   </div>
                   <p className="text-xs font-black uppercase tracking-widest">Certified Success</p>
                </div>
             </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default PathwaysDetail;
