import React, { useEffect, useRef, useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle, Sparkles } from 'lucide-react';
import WaveSeparator from './WaveSeparator';

const ContactPage: React.FC = () => {
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
    const particleCount = 40;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.1,
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
        ctx.fillStyle = `rgba(171, 143, 255, ${p.opacity})`; // #AB8FFF
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

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative w-full h-[60vh] min-h-[500px] flex flex-col items-center justify-center overflow-hidden bg-[#f8f5ff]">
        {/* Background Gradients */}
        <div className="absolute inset-0 w-full h-full bg-[#f8f5ff]">
          <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] rounded-full bg-gradient-to-r from-[#FFC1F2] to-[#AB8FFF] opacity-20 blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#AB8FFF] opacity-15 blur-[100px] animate-float" />
        </div>

        <div className="absolute inset-0 z-0">
          <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center transition-transform duration-300 ease-out"
             style={{ transform: `translate(${mousePos.x * 0.1}px, ${mousePos.y * 0.1}px)` }}>
          
          <div className="flex items-center gap-4 mb-6 opacity-80 animate-reveal">
            <div className="h-[2px] w-12 bg-[#AB8FFF]"></div>
            <span className="text-[13px] font-black uppercase tracking-[0.2em] text-[#AB8FFF]">Contact us</span>
            <div className="h-[2px] w-12 bg-[#AB8FFF]"></div>
          </div>

          <div className="relative flex flex-col items-center mb-10 group cursor-default w-full">
            <h1 className="flex flex-wrap items-center justify-center gap-x-4 text-5xl sm:text-7xl md:text-8xl lg:text-[9rem] font-black text-[#1a1c2d] tracking-tight leading-none animate-reveal transition-transform duration-500"
                style={{ transform: `translate(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px)` }}>
              <span className="uppercase tracking-tight">CONTACT</span>
              <span className="inline-block text-[#AB8FFF] drop-shadow-sm select-none">
                US
              </span>
            </h1>
          </div>

          <div className="max-w-3xl animate-reveal stagger-2 mt-4" style={{ transform: `translate(${mousePos.x * 0.2}px, ${mousePos.y * 0.2}px)` }}>
            <p className="text-xl sm:text-2xl font-medium text-gray-700 tracking-tight leading-relaxed px-4">
              We're here to walk by your side, quite literally every step of the way.
            </p>
          </div>
        </div>

        {/* Wave Separator */}
        <WaveSeparator position="bottom" />
      </div>

      {/* Main Content Area */}
      <section className="py-24 px-6 relative z-30">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          
          {/* Left Column: Contact Info */}
          <div className="lg:col-span-5 space-y-12 animate-reveal">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 border border-purple-100 mb-6">
                <Sparkles size={16} className="text-[#AB8FFF]" />
                <span className="text-[12px] uppercase tracking-widest text-[#AB8FFF] font-black">Connections</span>
              </div>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#1a1c2d] mb-8 tracking-tight leading-none uppercase">
                Available to <br /><span className="text-[#AB8FFF]">Support You</span>
              </h3>
              <p className="text-gray-500 text-lg leading-relaxed font-medium">
                Our team of specialists is ready to provide guidance and answer any questions about our DSA English programs.
              </p>
            </div>

            <div className="space-y-6">
              {/* Phone */}
              <div className="flex items-center gap-6 p-6 sm:p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-[#AB8FFF]/20 transition-all duration-500 group">
                <div className="w-14 h-14 bg-[#AB8FFF] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#AB8FFF]/40 shrink-0 group-hover:scale-110 transition-transform duration-500">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">Call Us</p>
                  <a href="tel:+393518459607" className="text-xl font-black text-[#1a1c2d] hover:text-[#AB8FFF] transition-colors tracking-tight">+39 351 8459607</a>
                </div>
              </div>

              {/* Emails */}
              <div className="flex items-center gap-6 p-6 sm:p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-[#FFC1F2]/30 transition-all duration-500 group">
                <div className="w-14 h-14 bg-[#FFC1F2] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#FFC1F2]/40 shrink-0 group-hover:scale-110 transition-transform duration-500">
                  <Mail size={24} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">Email Us</p>
                  <p className="text-lg font-black text-[#1a1c2d] leading-tight mb-1 truncate">dsa.smart.start@gmail.com</p>
                  <p className="text-base font-bold text-gray-500 leading-tight truncate">smartstart.dsa@gmail.com</p>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-center gap-6 p-6 sm:p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-[#AB8FFF]/20 transition-all duration-500 group">
                <div className="w-14 h-14 bg-[#AB8FFF] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#AB8FFF]/40 shrink-0 group-hover:scale-110 transition-transform duration-500">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">Visit Us</p>
                  <p className="text-lg font-black text-[#1a1c2d]">Viale Bonaria, 90</p>
                  <p className="text-base font-bold text-gray-500">09125 Cagliari, Italy</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-7 animate-reveal stagger-1">
            <div className="bg-white p-8 sm:p-12rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-[#AB8FFF]/10 relative overflow-hidden rounded-[3rem]">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#AB8FFF] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-20"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-[#1a1c2d] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#1a1c2d]/20">
                    <MessageCircle size={24} />
                  </div>
                  <h4 className="text-3xl font-black text-[#1a1c2d] tracking-tight uppercase">Get In Touch!</h4>
                </div>

                <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(e) => e.preventDefault()}>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-4">First Name</label>
                    <input 
                      type="text" 
                      placeholder="First Name"
                      className="w-full px-8 py-5 rounded-[2rem] bg-gray-50 border border-transparent focus:bg-white focus:border-[#AB8FFF] focus:outline-none transition-all font-bold text-[#1a1c2d] placeholder-gray-300"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-4">Last Name</label>
                    <input 
                      type="text" 
                      placeholder="Last Name"
                      className="w-full px-8 py-5 rounded-[2rem] bg-gray-50 border border-transparent focus:bg-white focus:border-[#AB8FFF] focus:outline-none transition-all font-bold text-[#1a1c2d] placeholder-gray-300"
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-4">Email *</label>
                    <input 
                      type="email" 
                      placeholder="hello@example.com"
                      className="w-full px-8 py-5 rounded-[2rem] bg-gray-50 border border-transparent focus:bg-white focus:border-[#AB8FFF] focus:outline-none transition-all font-bold text-[#1a1c2d] placeholder-gray-300"
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-4">Message</label>
                    <textarea 
                      rows={4}
                      placeholder="How can we help you?"
                      className="w-full px-8 py-5 rounded-[2rem] bg-gray-50 border border-transparent focus:bg-white focus:border-[#AB8FFF] focus:outline-none transition-all font-bold text-[#1a1c2d] placeholder-gray-300 resize-none"
                    />
                  </div>

                  <div className="md:col-span-2 mt-4">
                    <button className="w-full p-5 rounded-[2rem] bg-[#1a1c2d] text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#AB8FFF] hover:shadow-lg hover:shadow-[#AB8FFF]/30 hover:-translate-y-1 transition-all duration-300 group">
                      <span>Send Message</span>
                      <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default ContactPage;
