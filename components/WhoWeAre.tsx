
import React, { useEffect, useRef, useState } from 'react';
import { Star, ShieldCheck, Heart, ChevronRight, User, Users, Search, ShoppingBag, Rocket, Quote, Camera } from 'lucide-react';
import WaveSeparator from './WaveSeparator';

const WhoWeAre: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const moveX = (clientX - window.innerWidth / 2) / 40;
      const moveY = (clientY - window.innerHeight / 2) / 40;
      setMousePos({ x: moveX, y: moveY });
    };
    window.addEventListener('mousemove', handleMouseMove);

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
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const team = [
    { name: "Shanty Sage", role: "Language Advisor", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400" },
    { name: "Pamela Smith", role: "Head Teacher", image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=400" },
    { name: "Nora Miller", role: "Head Teacher", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400" },
    { name: "James Evans", role: "Designer", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400" },
    { name: "Mary Johnson", role: "ESL Teacher", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400" },
    { name: "Michael Thompson", role: "Customers Services Specialist", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400" },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative w-full h-[70vh] min-h-[600px] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#fff5fd] via-[#fffbfd] to-white">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FFC1F2] rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#AB8FFF] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse-slow delay-1000"></div>
          <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60 pointer-events-none" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center transition-transform duration-300 ease-out"
             style={{ transform: `translate(${mousePos.x * 0.1}px, ${mousePos.y * 0.1}px)` }}>
          <div className="flex items-center gap-4 mb-6 sm:mb-8 opacity-60 animate-reveal">
            <div className="h-[1px] w-8 bg-[#AB8FFF]"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-800">Who we are</span>
            <div className="h-[1px] w-8 bg-[#AB8FFF]"></div>
          </div>

          <div className="relative flex flex-col items-center mb-10 group cursor-default w-full">
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black text-[#1a1c2d] tracking-tighter leading-none animate-reveal transition-transform duration-500 flex flex-wrap justify-center gap-x-4"
                style={{ transform: `translate(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px)` }}>
              <span>DSA</span> <span className="text-[#AB8FFF]">SMART</span>
            </h1>
            <h2 className="text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black text-[#1a1c2d] tracking-tighter leading-none animate-reveal stagger-1 -mt-2 sm:-mt-4 uppercase transition-colors group-hover:text-[#AB8FFF]">
              START
            </h2>
          </div>

          <div className="max-w-3xl animate-reveal stagger-2 mt-4 px-4" style={{ transform: `translate(${mousePos.x * 0.2}px, ${mousePos.y * 0.2}px)` }}>
            <p className="text-xl sm:text-2xl md:text-4xl font-light text-gray-600 tracking-tight leading-tight">
              “ Whatever it is, the way you tell your story can make all the difference! ”
            </p>
          </div>
        </div>

        <WaveSeparator />
      </div>

      {/* Main Intro Section */}
      <section className="py-24 sm:py-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="animate-reveal" style={{ animationName: 'fadeInLeft' }}>
            <div className="inline-block px-4 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-purple-100">
              Expertise since 2008
            </div>
            <h3 className="text-4xl sm:text-5xl md:text-7xl font-black text-gray-900 mb-8 tracking-tighter leading-none uppercase">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9b4dff] via-[#8a3ffc] to-[#ff2d85]">23 Years</span> of <br />Experience
            </h3>
            <p className="text-xl md:text-2xl text-gray-900 font-bold mb-8 leading-tight">
              DSA SMART START is a group of highly qualified language professionals, supported by psychology experts.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed mb-10">
              Since 2008, our team has supported children and adults with dyslexia in their English language studies, offering targeted tools and strategies. For over a decade, we have been passionately dedicated to helping those struggling with English learning, transforming challenges into real opportunities for growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <button className="bg-[#AB8FFF] text-white px-10 py-5 rounded-full font-black text-xs uppercase tracking-widest hover:scale-110 hover:-rotate-1 transition-all shadow-xl shadow-purple-200">
                START NOW
              </button>
              <button className="bg-gray-50 text-gray-900 px-10 py-5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-white border border-gray-100 transition-all">
                LEARN MORE
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 animate-reveal stagger-1" style={{ animationName: 'fadeInRight' }}>
            <div className="group bg-purple-50 p-8 sm:p-10 rounded-[3rem] border border-purple-100 flex flex-col gap-4 hover:shadow-2xl hover:shadow-purple-200 transition-all duration-500 hover:-translate-y-2">
              <span className="text-4xl sm:text-5xl font-black text-purple-600 group-hover:scale-110 transition-transform inline-block origin-left uppercase tracking-tighter">23+</span>
              <p className="text-lg font-bold text-gray-900 uppercase tracking-tight leading-none">Years of experience supporting DSA students</p>
            </div>
            <div className="group bg-pink-50 p-8 sm:p-10 rounded-[3rem] border border-pink-100 flex flex-col gap-4 hover:shadow-2xl hover:shadow-pink-200 transition-all duration-500 hover:-translate-y-2">
              <span className="text-4xl sm:text-5xl font-black text-pink-500 group-hover:scale-110 transition-transform inline-block origin-left uppercase tracking-tighter">3000+</span>
              <p className="text-lg font-bold text-gray-900 uppercase tracking-tight leading-none">Very satisfied DSA customers worldwide</p>
            </div>
            <div className="group bg-indigo-50 p-8 sm:p-10 rounded-[3rem] border border-indigo-100 flex flex-col gap-4 hover:shadow-2xl hover:shadow-indigo-200 transition-all duration-500 hover:-translate-y-2">
              <span className="text-4xl sm:text-5xl font-black text-indigo-600 group-hover:scale-110 transition-transform inline-block origin-left uppercase tracking-tighter">15+</span>
              <p className="text-lg font-bold text-gray-900 uppercase tracking-tight leading-none">Award-winning educational courses and programs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 sm:py-32 px-6 bg-gray-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-20 gap-8 animate-reveal">
            <div>
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-[0.4em] mb-4 block">Professional Excellence</span>
              <h3 className="text-3xl sm:text-4xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase">
                The DSA <span className="text-[#8a3ffc]">Team</span>
              </h3>
            </div>
            <p className="text-gray-500 lg:max-w-md text-lg font-medium leading-relaxed">
              Our vision is based on the belief that every individual deserves to be understood, supported and guided towards success.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member, idx) => (
              <div key={idx} className="group relative bg-white p-6 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 animate-reveal hover:-translate-y-3" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="relative w-full aspect-square rounded-[2rem] overflow-hidden mb-8 bg-purple-50">
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="px-4 pb-4">
                  <h5 className="text-2xl font-black text-gray-900 mb-1">{member.name}</h5>
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">{member.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Mission Section with Image */}
      <section className="py-24 sm:py-32 bg-[#0f172a] text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[150px] translate-x-1/2 -translate-y-1/2 opacity-30"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 sm:gap-24 items-center">
          <div className="animate-reveal" style={{ animationName: 'fadeInLeft' }}>
            <div className="inline-flex items-center gap-2 p-2 bg-white/5 rounded-full mb-8">
              <Star size={16} fill="white" className="text-white" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] px-2">Our Vision</span>
            </div>
            <h3 className="text-4xl sm:text-5xl md:text-8xl font-black mb-8 sm:mb-12 tracking-tighter uppercase">Our Mission</h3>
            <div className="space-y-10 text-xl md:text-2xl font-medium leading-relaxed text-gray-300">
              <p>
                Our vision is based on the belief that every individual deserves to be <span className="text-white font-black underline decoration-purple-500 decoration-2 underline-offset-8">understood, supported and guided</span> towards success, without being limited by labels or judgments.
              </p>
              <p>
                We believe in changing society's perception of learning disabilities, and we are committed to providing concrete tools for learning English and a positive environment for those who have not yet found the right support to achieve their personal goals.
              </p>
            </div>
            <div className="mt-12 sm:mt-16">
              <button className="bg-purple-600 text-white px-12 py-5 rounded-full font-black uppercase tracking-widest hover:scale-110 transition-all shadow-2xl shadow-purple-500/20 active:scale-95">
                BOOK NOW
              </button>
            </div>
          </div>

          <div className="relative animate-reveal stagger-1" style={{ animationName: 'fadeInRight' }}>
            <div className="absolute inset-0 bg-purple-500/20 blur-[100px] -z-10 animate-pulse"></div>
            <div className="rounded-[4rem] overflow-hidden aspect-square border-8 border-white/10 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-700 bg-white/5 flex items-center justify-center">
              <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800" alt="Collaboration" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="p-8 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 text-center">
                   <Heart size={48} className="text-pink-400 mx-auto mb-4 animate-bounce" />
                   <p className="text-sm font-black uppercase tracking-widest">Inclusive Support</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Motivational Section with Image */}
      <section className="py-24 sm:py-32 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 sm:gap-20 items-center">
          <div className="animate-reveal relative group" style={{ animationName: 'fadeInLeft' }}>
            <div className="absolute -inset-10 bg-purple-100 rounded-full blur-[120px] opacity-30 group-hover:opacity-50 transition-opacity"></div>
            <div className="relative rounded-[3.5rem] sm:rounded-[5rem] overflow-hidden aspect-[4/5] shadow-2xl border-4 border-white rotate-[-2deg] group-hover:rotate-0 transition-transform duration-700">
               <img src="https://images.unsplash.com/photo-1491013516836-7ad643eead76?auto=format&fit=crop&q=80&w=800" alt="Student success" className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 via-transparent to-transparent"></div>
               <div className="absolute bottom-12 left-12 right-12">
                  <span className="text-xs font-black text-purple-200 uppercase tracking-[0.3em] mb-4 block">Real Results</span>
                  <p className="text-2xl sm:text-3xl font-bold text-white italic leading-tight">"I finally feel understood and capable."</p>
               </div>
            </div>
          </div>

          <div className="animate-reveal stagger-1" style={{ animationName: 'fadeInRight' }}>
            <h3 className="text-4xl sm:text-5xl md:text-7xl font-black text-gray-900 mb-8 leading-tight tracking-tighter uppercase">
              You are a <br /><span className="text-[#8a3ffc]">DSA student?</span>
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-8 italic leading-snug border-l-4 border-purple-600 pl-6 sm:pl-8">
              "We are here to give hope and accompany each person on the path to reaching their potential."
            </p>
            <p className="text-gray-600 text-lg mb-12 leading-relaxed font-medium">
              With the Innovative DSA SMART START Method, we will transform your challenges into extraordinary growth opportunities. We're ready to give you the tools you need to approach the English language with confidence, determination, and passion.
            </p>
            <div className="flex flex-col gap-6">
              <button className="flex items-center justify-between bg-gray-900 text-white px-8 sm:px-10 py-6 sm:py-7 rounded-[2.5rem] font-black uppercase tracking-widest group hover:bg-[#8a3ffc] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-gray-200 text-xs sm:text-sm">
                JOIN OUR COMMUNITY
                <ChevronRight className="group-hover:translate-x-3 transition-transform" />
              </button>
              <button className="flex items-center justify-between bg-purple-50 text-[#8a3ffc] px-8 sm:px-10 py-6 sm:py-7 rounded-[2.5rem] font-black uppercase tracking-widest group border border-purple-100 hover:bg-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-100 text-[10px] sm:text-sm">
                FIND OUT MORE ABOUT METHOD
                <ChevronRight className="group-hover:translate-x-3 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Free Consultation CTA */}
      <section className="pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-[#f3e8ff] to-[#fef2f2] p-10 sm:p-12 md:p-24 rounded-[3.5rem] sm:rounded-[5rem] text-center animate-reveal relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-64 h-64 bg-white/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-1000"></div>
             
             <div className="relative z-10">
               <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-xl group-hover:rotate-12 transition-transform duration-500">
                  <Heart size={40} className="text-purple-600 animate-pulse" />
               </div>
               <h4 className="text-3xl sm:text-4xl md:text-6xl font-black text-gray-900 mb-8 tracking-tight uppercase">Do you need our help?</h4>
               <p className="text-lg sm:text-xl text-gray-600 mb-12 font-medium max-w-xl mx-auto">Book a free 15-minute consultation and let's start your journey today.</p>
               <a 
                 href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0qY73eSZNjDKlM_CQETEMDZFNGB5SONV3eJl2rbRFfK6hT6uNAwz_X4L7Jo0lIbuw-zerkbJWu"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="inline-block bg-[#8a3ffc] text-white px-10 sm:px-16 py-5 sm:py-6 rounded-full font-black uppercase tracking-widest shadow-2xl shadow-purple-500/20 hover:scale-110 active:scale-95 transition-all text-xs sm:text-base"
               >
                 BOOK FREE CONSULTATION
               </a>
             </div>
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}} />
    </div>
  );
};

export default WhoWeAre;
