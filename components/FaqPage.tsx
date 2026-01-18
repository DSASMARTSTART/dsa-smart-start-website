
import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpRight, ArrowDownRight, ChevronRight, Plus, Minus, Search, MessageCircle } from 'lucide-react';
import WaveSeparator from './WaveSeparator';

const FaqItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 py-6 last:border-none">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group focus:outline-none"
      >
        <span className={`text-lg md:text-xl font-bold transition-colors duration-300 ${isOpen ? 'text-[#AB8FFF]' : 'text-gray-900 group-hover:text-[#AB8FFF]'}`}>
          {question}
        </span>
        <div className={`shrink-0 ml-4 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-[#AB8FFF] text-white rotate-180' : 'bg-gray-50 text-gray-400 group-hover:bg-[#FFC1F2] group-hover:text-[#AB8FFF]'}`}>
          {isOpen ? <Minus size={18} /> : <Plus size={18} />}
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[500px] mt-6 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="text-gray-600 leading-relaxed text-lg pb-4">
          {answer}
        </p>
      </div>
    </div>
  );
};

const FaqPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; size: number; speedX: number; speedY: number; opacity: number }[] = [];
    const particleCount = 30;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.3 + 0.1,
      }));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) p.y = 0;
        if (p.y < 0) p.y = canvas.height;
        ctx.fillStyle = `rgba(171, 143, 255, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const generalFaqs = [
    {
      q: "How is the DSA SMART START program designed to support students with dyslexia in learning English?",
      a: "The DSA SMART START program is designed with an inclusive approach, using multisensory techniques, visual tools, and adaptive strategies to facilitate English learning. Each module is designed to be accessible and engaging, respecting the learning needs of students with dyslexia."
    },
    {
      q: "What are the main features of the DSA SMART START program that make it suitable for students with dyslexia?",
      a: "Key features include the use of vibrant graphics, interactive activities, mind maps, color-coding to enhance visual organization, and audio support to aid comprehension. These elements promote engaging learning that minimizes reading and memorization difficulties."
    },
    {
      q: "How does the program differ from traditional teaching methods in adapting to the needs of students with dyslexia?",
      a: "DSA SMART START differentiates itself by integrating teaching techniques that leverage shapes, colors, visual patterns, and audio. Unlike traditional methods, this program emphasizes visual and hands-on learning to strengthen comprehension and retention."
    },
    {
      q: "What visual and learning techniques are used in DSA SMART START to support memorization and comprehension?",
      a: "Mind maps, color charts, and illustrations are used to visually represent information. These techniques help students see connections between ideas and better organize their thinking, improving retention and comprehension."
    },
    {
      q: "How are shapes and colors used to improve learning in dyslexic students?",
      a: "Shapes and colors are used to highlight important parts of lessons, distinguish word categories, and represent grammatical concepts. This technique, called the SHAPE & COLOR CODING BRAIN PUZZLE, reduces visual complexity, helping students focus on key information."
    },
    {
      q: "How are mind maps integrated into the program to facilitate information organization and learning?",
      a: "Mind maps are used to summarize lessons and visually represent connections between concepts. These maps help dyslexic students structure information in a more logical and memorable way."
    },
    {
      q: "How does the program use visuals to aid comprehension and retention?",
      a: "The program integrates colorful images, charts, and visual diagrams that represent words and phrases intuitively. This visual impact allows students to easily associate meanings with images, making memorization more natural."
    }
  ];

  const visualFaqs = [
    {
      q: "What is the role of images and visual materials in teaching English to students with SMART START DSA?",
      a: "Images and visual materials are crucial for creating strong mental associations and facilitating content comprehension. They serve to transform words into visual concepts, which are easier for students with dyslexia to process and memorize."
    },
    {
      q: "How does the program use illustrations to reinforce the meaning of words and phrases?",
      a: "Illustrations are integrated into each lesson to accompany new vocabulary and key phrases. This helps students connect the images to the words, strengthening understanding and facilitating visual learning."
    },
    {
      q: "How does the visual approach contribute to accelerating memorization and creating a permanent impression?",
      a: "The visual approach creates strong connections between images and linguistic concepts, accelerating the memorization process. These visual connections help create a permanent imprint in long-term memory, making learning more effective."
    }
  ];

  const languageFaqs = [
    {
      q: "How does the program support language comprehension through adaptive learning techniques for dyslexics?",
      a: "The program includes simplified readings, video supports to improve listening comprehension, and the use of diagrams and maps to summarize content. This approach allows students to learn at their own pace and according to their needs."
    },
    {
      q: "What specific tools are used to improve the listening and writing skills of students with dyslexia?",
      a: "DSA SMART START uses guided video explanations to improve listening comprehension. For writing, visual guides, sentence templates, and interactive exercises are provided to encourage practice."
    },
    {
      q: "How does DSA SMART START make speaking and writing more accessible for dyslexic students?",
      a: "The program includes hands-on activities that encourage conversation and written expression, using visual cues to facilitate comprehension. The exercises are designed to be repetitive yet varied, to maintain interest and promote learning."
    }
  ];

  const memorizationFaqs = [
    {
      q: "What strategy does DSA SMART START use to ensure that learning is lasting and rooted?",
      a: "The program uses distributed repetition techniques and interactive practice to reinforce learned concepts. Mind maps and image-based activities help consolidate learning and make it lasting."
    },
    {
      q: "How are visual elements and multisensory techniques used to create stable mental connections?",
      a: "Visual elements and multisensory techniques, such as associating words with sounds, images, and colors, create multiple connections in the mind, facilitating the memorization and recall of information."
    }
  ];

  const benefitsFaqs = [
    {
      q: "What are the main benefits for a dyslexic student who follows the DSA SMART START program?",
      a: "Dyslexic students improve their comprehension and production of language thanks to a visual and multisensory approach that makes learning more accessible and engaging."
    },
    {
      q: "How does DSA SMART START help overcome specific difficulties related to dyslexia when learning English?",
      a: "The program uses visual techniques, audio support, and interactive activities to reduce reading and memorization difficulties, helping students overcome their specific challenges."
    },
    {
      q: "What improvements can dyslexic students expect in terms of language comprehension and production?",
      a: "Students can expect to improve their listening and reading comprehension, enrich their vocabulary, and develop greater confidence in communicating in English, thanks to a structured approach supported by visual techniques."
    }
  ];

  return (
    <div className="bg-white">
      {/* FAQ Hero - Same Style as Home */}
      <div className="relative w-full min-h-[75vh] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#fff5fd] via-[#fffbfd] to-white pt-32 pb-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FFC1F2] rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#AB8FFF] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse-slow delay-1000"></div>
          <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60 pointer-events-none" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center -translate-y-6 sm:-translate-y-8">
          <div className="flex items-center gap-4 mb-6 sm:mb-8 opacity-60 animate-reveal">
            <div className="h-[1px] w-8 bg-[#AB8FFF]"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-800">Knowledge Base</span>
            <div className="h-[1px] w-8 bg-[#AB8FFF]"></div>
          </div>

          <div className="relative flex flex-col items-center mb-6 w-full">
            <div className="hidden lg:flex absolute -left-32 top-0 items-center gap-3 bg-white/80 backdrop-blur px-5 py-3 rounded-2xl shadow-lg transform -rotate-3 animate-reveal stagger-1 border border-white">
              <div className="w-8 h-8 bg-[#FFF0FA] rounded-lg flex items-center justify-center shadow-inner">
                <Search size={16} className="text-[#AB8FFF]" />
              </div>
              <div className="text-left">
                <p className="text-[8px] font-black uppercase text-gray-400 leading-none mb-1">Support</p>
                <p className="text-xs font-black text-gray-900 leading-none">Find Answers</p>
              </div>
            </div>

            <h1 className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-4 text-4xl sm:text-6xl md:text-9xl lg:text-[8rem] font-black text-[#1a1c2d] tracking-tighter leading-none animate-reveal">
              <span>FAQ</span>
              <span className="text-[#AB8FFF] font-medium px-2 sm:px-4">&</span>
              <span>Answers</span>
            </h1>

            <div className="hidden lg:flex absolute -right-40 bottom-0 items-center gap-3 bg-white/80 backdrop-blur px-5 py-3 rounded-2xl shadow-lg transform rotate-3 animate-reveal stagger-2 border border-white">
              <div className="w-8 h-8 bg-[#AB8FFF] rounded-lg flex items-center justify-center shadow-inner">
                <MessageCircle size={16} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-[8px] font-black uppercase text-gray-400 leading-none mb-1">Contact</p>
                <p className="text-xs font-black text-gray-900 leading-none">Always Available</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center animate-reveal stagger-1">
            <p className="text-xl sm:text-3xl md:text-5xl font-black text-black tracking-[0.1em] mb-2 uppercase">
              Everything you need to
            </p>
            <p className="text-3xl sm:text-4xl md:text-6xl font-black text-[#AB8FFF] tracking-tight mb-8 uppercase">
              Know
            </p>
          </div>
        </div>

        <WaveSeparator />
      </div>

      {/* FAQ Content Sections */}
      <section className="py-24 sm:py-32 px-6 relative">
        <div className="max-w-4xl mx-auto">
          
          {/* Category 1 */}
          <div className="mb-24">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-12 animate-reveal">
              <div className="shrink-0 px-6 py-2 bg-purple-50 rounded-full border border-purple-100 w-fit">
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Section 01</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight uppercase">
                Approach for Students with DSA
              </h2>
            </div>
            
            <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 md:p-12 border border-gray-100 shadow-xl shadow-purple-500/5 animate-reveal stagger-1">
              {generalFaqs.map((faq, idx) => (
                <FaqItem key={idx} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>

          {/* ... Other categories following same pattern ... */}
          {/* Section 02 */}
          <div className="mb-24">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-12 animate-reveal">
              <div className="shrink-0 px-6 py-2 bg-pink-50 rounded-full border border-pink-100 w-fit">
                <span className="text-[10px] font-black text-pink-600 uppercase tracking-widest">Section 02</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight uppercase">
                Visual and Multisensory Approach
              </h2>
            </div>
            <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 md:p-12 border border-gray-100 shadow-xl shadow-pink-500/5 animate-reveal stagger-1">
              {visualFaqs.map((faq, idx) => (
                <FaqItem key={idx} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>

          {/* Section 03 */}
          <div className="mb-24">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-12 animate-reveal">
              <div className="shrink-0 px-6 py-2 bg-indigo-50 rounded-full border border-indigo-100 w-fit">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Section 03</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight uppercase">
                Adaptations for Language Understanding
              </h2>
            </div>
            <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 md:p-12 border border-gray-100 shadow-xl shadow-indigo-500/5 animate-reveal stagger-1">
              {languageFaqs.map((faq, idx) => (
                <FaqItem key={idx} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>

          {/* Section 04 */}
          <div className="mb-24">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-12 animate-reveal">
              <div className="shrink-0 px-6 py-2 bg-rose-50 rounded-full border border-rose-100 w-fit">
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Section 04</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight uppercase">
                Techniques for Permanent Memorization
              </h2>
            </div>
            <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 md:p-12 border border-gray-100 shadow-xl shadow-rose-500/5 animate-reveal stagger-1">
              {memorizationFaqs.map((faq, idx) => (
                <FaqItem key={idx} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>

          {/* Section 05 */}
          <div className="mb-24">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-12 animate-reveal">
              <div className="shrink-0 px-6 py-2 bg-orange-50 rounded-full border border-orange-100 w-fit">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Section 05</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight uppercase">
                Benefits and Results
              </h2>
            </div>
            <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 md:p-12 border border-gray-100 shadow-xl shadow-orange-500/5 animate-reveal stagger-1">
              {benefitsFaqs.map((faq, idx) => (
                <FaqItem key={idx} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>

          {/* Bottom CTA Card */}
          <div className="mt-20 sm:mt-32 p-10 sm:p-20 bg-[#0f172a] rounded-[3rem] sm:rounded-[4rem] text-center relative overflow-hidden group animate-reveal">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative z-10">
              <h3 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight uppercase">Still have questions?</h3>
              <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-xl mx-auto">
                Our support team is ready to help you find the best path for your learning journey.
              </p>
              <button className="bg-[#AB8FFF] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-purple-500/20 active:scale-95">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FaqPage;
