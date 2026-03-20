
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, ChevronRight, Plus, Minus, Search, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import WaveSeparator from './WaveSeparator';

const FaqItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/10 py-6 last:border-none">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group focus:outline-none"
      >
        <span className={`text-lg md:text-xl font-bold transition-colors duration-300 ${isOpen ? 'text-[#AB8FFF]' : 'text-white group-hover:text-[#AB8FFF]'}`}>
          {question}
        </span>
        <div className={`shrink-0 ml-4 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-[#AB8FFF] text-white rotate-180' : 'bg-white/10 text-gray-400 group-hover:bg-[#FFC1F2]/20 group-hover:text-[#AB8FFF]'}`}>
          {isOpen ? <Minus size={18} /> : <Plus size={18} />}
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[500px] mt-6 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="text-gray-400 leading-relaxed text-lg pb-4">
          {answer}
        </p>
      </div>
    </div>
  );
};

const FaqPage: React.FC = () => {
  const { t } = useTranslation('faq');
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

  const generalFaqs = t('general', { returnObjects: true }) as { q: string; a: string }[];

  const visualFaqs = t('visual', { returnObjects: true }) as { q: string; a: string }[];

  const languageFaqs = t('language', { returnObjects: true }) as { q: string; a: string }[];

  const memorizationFaqs = t('memorization', { returnObjects: true }) as { q: string; a: string }[];

  const benefitsFaqs = t('benefits', { returnObjects: true }) as { q: string; a: string }[];

  return (
    <div className="bg-black">
      {/* FAQ Hero - Same Style as Home */}
      <div className="relative w-full min-h-[75vh] flex flex-col items-center justify-center overflow-hidden bg-black pt-32 pb-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FFC1F2] rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#AB8FFF] rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-pulse-slow delay-1000"></div>
          <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60 pointer-events-none" />
        </div>

        {/* Back Button */}
        <div className="absolute top-32 left-6 z-20">
          <button
            onClick={() => { window.location.hash = '#home'; }}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#AB8FFF] transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#AB8FFF]/30 group-hover:shadow-md transition-all">
              <ArrowLeft size={16} />
            </div>
            {t('goBack', { ns: 'common' })}
          </button>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center -translate-y-6 sm:-translate-y-8">
          <div className="flex items-center gap-4 mb-6 sm:mb-8 opacity-60 animate-reveal">
            <div className="h-[1px] w-8 bg-[#AB8FFF]"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400">{t('hero.badge')}</span>
            <div className="h-[1px] w-8 bg-[#AB8FFF]"></div>
          </div>

          <div className="relative flex flex-col items-center mb-6 w-full">
            <div className="hidden lg:flex absolute -left-32 top-0 items-center gap-3 bg-white/5 backdrop-blur px-5 py-3 rounded-2xl shadow-lg transform -rotate-3 animate-reveal stagger-1 border border-white/10">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center shadow-inner">
                <Search size={16} className="text-[#AB8FFF]" />
              </div>
              <div className="text-left">
                <p className="text-[8px] font-black uppercase text-gray-500 leading-none mb-1">{t('hero.supportLabel')}</p>
                <p className="text-xs font-black text-white leading-none">{t('hero.findAnswers')}</p>
              </div>
            </div>

            <h1 className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-4 text-4xl sm:text-6xl md:text-9xl lg:text-[8rem] font-black text-white tracking-tighter leading-none animate-reveal">
              <span>{t('hero.title1')}</span>
              <span className="text-[#AB8FFF] font-medium px-2 sm:px-4">{t('hero.titleAnd')}</span>
              <span>{t('hero.title2')}</span>
            </h1>

            <div className="hidden lg:flex absolute -right-40 bottom-0 items-center gap-3 bg-white/5 backdrop-blur px-5 py-3 rounded-2xl shadow-lg transform rotate-3 animate-reveal stagger-2 border border-white/10">
              <div className="w-8 h-8 bg-[#AB8FFF] rounded-lg flex items-center justify-center shadow-inner">
                <MessageCircle size={16} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-[8px] font-black uppercase text-gray-500 leading-none mb-1">{t('hero.contactLabel')}</p>
                <p className="text-xs font-black text-white leading-none">{t('hero.alwaysAvailable')}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center animate-reveal stagger-1">
            <p className="text-xl sm:text-3xl md:text-5xl font-black text-gray-300 tracking-[0.1em] mb-2 uppercase">
              {t('hero.subtitleTop')}
            </p>
            <p className="text-3xl sm:text-4xl md:text-6xl font-black text-[#AB8FFF] tracking-tight mb-8 uppercase">
              {t('hero.subtitleBottom')}
            </p>
          </div>
        </div>

        <WaveSeparator color="fill-black" />
      </div>

      {/* FAQ Content Sections */}
      <section className="py-24 sm:py-32 px-6 relative bg-black">
        <div className="max-w-4xl mx-auto">
          
          {/* Category 1 */}
          <div className="mb-24">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-12 animate-reveal">
              <div className="shrink-0 px-6 py-2 bg-purple-500/10 rounded-full border border-purple-500/20 w-fit">
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{t('sections.section01')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight uppercase">
                {t('sections.heading01')}
              </h2>
            </div>
            
            <div className="bg-white/5 rounded-[2.5rem] sm:rounded-[3rem] p-6 md:p-12 border border-white/10 shadow-xl shadow-purple-500/10 animate-reveal stagger-1">
              {generalFaqs.map((faq, idx) => (
                <FaqItem key={idx} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>

          {/* ... Other categories following same pattern ... */}
          {/* Section 02 */}
          <div className="mb-24">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-12 animate-reveal">
              <div className="shrink-0 px-6 py-2 bg-pink-500/10 rounded-full border border-pink-500/20 w-fit">
                <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">{t('sections.section02')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight uppercase">
                {t('sections.heading02')}
              </h2>
            </div>
            <div className="bg-white/5 rounded-[2.5rem] sm:rounded-[3rem] p-6 md:p-12 border border-white/10 shadow-xl shadow-pink-500/10 animate-reveal stagger-1">
              {visualFaqs.map((faq, idx) => (
                <FaqItem key={idx} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>

          {/* Section 03 */}
          <div className="mb-24">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-12 animate-reveal">
              <div className="shrink-0 px-6 py-2 bg-indigo-500/10 rounded-full border border-indigo-500/20 w-fit">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('sections.section03')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight uppercase">
                {t('sections.heading03')}
              </h2>
            </div>
            <div className="bg-white/5 rounded-[2.5rem] sm:rounded-[3rem] p-6 md:p-12 border border-white/10 shadow-xl shadow-indigo-500/10 animate-reveal stagger-1">
              {languageFaqs.map((faq, idx) => (
                <FaqItem key={idx} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>

          {/* Section 04 */}
          <div className="mb-24">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-12 animate-reveal">
              <div className="shrink-0 px-6 py-2 bg-rose-500/10 rounded-full border border-rose-500/20 w-fit">
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{t('sections.section04')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight uppercase">
                {t('sections.heading04')}
              </h2>
            </div>
            <div className="bg-white/5 rounded-[2.5rem] sm:rounded-[3rem] p-6 md:p-12 border border-white/10 shadow-xl shadow-rose-500/10 animate-reveal stagger-1">
              {memorizationFaqs.map((faq, idx) => (
                <FaqItem key={idx} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>

          {/* Section 05 */}
          <div className="mb-24">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-12 animate-reveal">
              <div className="shrink-0 px-6 py-2 bg-orange-500/10 rounded-full border border-orange-500/20 w-fit">
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">{t('sections.section05')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight uppercase">
                {t('sections.heading05')}
              </h2>
            </div>
            <div className="bg-white/5 rounded-[2.5rem] sm:rounded-[3rem] p-6 md:p-12 border border-white/10 shadow-xl shadow-orange-500/10 animate-reveal stagger-1">
              {benefitsFaqs.map((faq, idx) => (
                <FaqItem key={idx} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>

          {/* Bottom CTA Card */}
          <div className="mt-20 sm:mt-32 p-10 sm:p-20 bg-white/5 rounded-[3rem] sm:rounded-[4rem] text-center relative overflow-hidden group animate-reveal border border-white/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 mix-blend-screen"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 mix-blend-screen"></div>
            
            <div className="relative z-10">
              <h3 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight uppercase">{t('cta.title')}</h3>
              <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-xl mx-auto">
                {t('cta.description')}
              </p>
              <a href="https://api.whatsapp.com/send/?phone=393518459607&text&type=phone_number&app_absent=0" target="_blank" rel="noopener noreferrer" className="inline-block bg-[#25D366] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-[#25D366]/30 active:scale-95">
                {t('cta.button')}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FaqPage;
