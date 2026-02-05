
import React, { useEffect, useRef } from 'react';
import { ArrowUpRight, ArrowDownRight, ChevronRight, Star, ShieldCheck } from 'lucide-react';

interface HeroProps {
  onNavigate?: (path: string) => void;
}

const HeroSection: React.FC<HeroProps> = ({ onNavigate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; size: number; speedX: number; speedY: number; opacity: number }[] = [];
    const particleCount = 30; // Reduced count for cleaner look

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1, // Slightly larger, softer particles
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
        
        // Use the Lavender color for particles
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

  return (
    <div className="relative w-full min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-black">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         {/* Soft gradient blobs using the new colors */}
         <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FFC1F2] rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse-slow"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#AB8FFF] rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-pulse-slow delay-1000"></div>
         <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60" />
      </div>

      <div className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center pt-20 pb-16">
        
{/* Badge Removed */}

        {/* Main Title */}
        <h1 className="flex flex-col items-center justify-center text-5xl sm:text-7xl md:text-8xl font-extrabold text-white tracking-tight leading-[1.1] mb-4 animate-reveal">
          <span className="flex items-center gap-3 sm:gap-6">
            English 
            <span className="relative inline-block text-[#AB8FFF]">
              & DSA
               {/* Underline decoration */}
              <svg className="absolute w-full h-3 -bottom-1 left-0 text-[#FFC1F2]" viewBox="0 0 100 10" preserveAspectRatio="none">
                 <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
              </svg>
            </span>
          </span>
        </h1>

{/* Subtitle Removed */}

        {/* Subtitle - Dyslexia friendly sans-serif, good line height */}
        <p className="text-lg sm:text-2xl font-medium text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed animate-reveal stagger-1">
          The First Method for <span className="font-bold text-[#AB8FFF]">DSA students</span>.
          <span className="block mt-2 text-gray-400 font-normal">Learning made effortless, engaging, and effective.</span>
        </p>

        {/* Features Row - Replaces floating cards for better mobile definition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12 w-full max-w-2xl animate-reveal stagger-2">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl shadow-md border border-white/10 hover:border-[#AB8FFF]/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-[#AB8FFF]">
                    <ShieldCheck size={24} />
                </div>
                <div className="text-left">
                    <h3 className="text-sm font-bold text-white">Proven Methodology</h3>
                    <p className="text-xs text-gray-400">Eduway Framework</p>
                </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl shadow-md border border-white/10 hover:border-[#AB8FFF]/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-[#AB8FFF]">
                    <ArrowUpRight size={24} />
                </div>
                <div className="text-left">
                    <h3 className="text-sm font-bold text-white">Premium Courses</h3>
                    <p className="text-xs text-gray-400">Tailored for your success</p>
                </div>
            </div>
        </div>

        {/* CTA Button */}
        <div className="animate-reveal stagger-2">
          <button 
            onClick={() => onNavigate?.('courses')}
            className="group relative inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-10 sm:px-12 py-4 sm:py-5 rounded-full font-bold text-sm sm:text-base tracking-widest shadow-xl shadow-[#25D366]/30 transition-all duration-300 transform hover:-translate-y-1 active:scale-95 uppercase"
          >
            Explore Our Courses
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
      
       {/* Bottom Curve Separator - Smoother SVG */}
       <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
         <svg className="relative block w-full h-[50px] sm:h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
             <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-black opacity-0"></path>
             {/* Simple black curve */}
             <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="fill-black"></path>
         </svg>
       </div>
    </div>
  );
};

export default HeroSection;
