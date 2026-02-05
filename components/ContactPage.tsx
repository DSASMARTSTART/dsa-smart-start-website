import React, { useEffect, useRef, useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import WaveSeparator from './WaveSeparator';
import { submitContactForm, getContactConfig } from '../lib/contactService';

const ContactPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Please enter a valid email';
    if (!formData.message.trim()) return 'Message is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const result = await submitContactForm({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        message: formData.message.trim(),
      });

      if (result.success) {
        setSuccess(true);
        setFormData({ firstName: '', lastName: '', email: '', message: '' });
      } else {
        setError(result.error || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="bg-black">
      {/* Hero Section */}
      <div className="relative w-full h-[60vh] min-h-[500px] flex flex-col items-center justify-center overflow-hidden bg-black">
        {/* Background Gradients */}
        <div className="absolute inset-0 w-full h-full bg-black">
          <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] rounded-full bg-gradient-to-r from-[#FFC1F2] to-[#AB8FFF] opacity-10 blur-[120px] animate-pulse-slow mix-blend-screen" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#AB8FFF] opacity-10 blur-[100px] animate-float mix-blend-screen" />
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
            <h1 className="flex flex-wrap items-center justify-center gap-x-4 text-5xl sm:text-7xl md:text-8xl lg:text-[9rem] font-black text-white tracking-tight leading-none animate-reveal transition-transform duration-500"
                style={{ transform: `translate(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px)` }}>
              <span className="uppercase tracking-tight">CONTACT</span>
              <span className="inline-block text-[#AB8FFF] drop-shadow-sm select-none">
                US
              </span>
            </h1>
          </div>

          <div className="max-w-3xl animate-reveal stagger-2 mt-4" style={{ transform: `translate(${mousePos.x * 0.2}px, ${mousePos.y * 0.2}px)` }}>
            <p className="text-xl sm:text-2xl font-medium text-gray-300 tracking-tight leading-relaxed px-4">
              We're here to walk by your side, quite literally every step of the way.
            </p>
          </div>
        </div>

        {/* Wave Separator */}
        <WaveSeparator position="bottom" color="fill-black" />
      </div>

      {/* Main Content Area */}
      <section className="py-24 px-6 relative z-30 bg-black">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          
          {/* Left Column: Contact Info */}
          <div className="lg:col-span-5 space-y-12 animate-reveal">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
                <Sparkles size={16} className="text-[#AB8FFF]" />
                <span className="text-[12px] uppercase tracking-widest text-[#AB8FFF] font-black">Connections</span>
              </div>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-8 tracking-tight leading-none uppercase">
                Available to <br /><span className="text-[#AB8FFF]">Support You</span>
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed font-medium">
                Our team of specialists is ready to provide guidance and answer any questions about our DSA English programs.
              </p>
            </div>

            <div className="space-y-6">
              {/* Phone */}
              <div className="flex items-center gap-6 p-6 sm:p-8 bg-white/5 rounded-[2rem] border border-white/10 shadow-sm hover:shadow-xl hover:shadow-[#AB8FFF]/10 transition-all duration-500 group">
                <div className="w-14 h-14 bg-[#AB8FFF] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#AB8FFF]/40 shrink-0 group-hover:scale-110 transition-transform duration-500">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1">Call Us</p>
                  <a href="tel:+393518459607" className="text-xl font-black text-white hover:text-[#AB8FFF] transition-colors tracking-tight">+39 351 8459607</a>
                </div>
              </div>

              {/* Emails */}
              <div className="flex items-center gap-6 p-6 sm:p-8 bg-white/5 rounded-[2rem] border border-white/10 shadow-sm hover:shadow-xl hover:shadow-[#FFC1F2]/10 transition-all duration-500 group">
                <div className="w-14 h-14 bg-[#FFC1F2] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#FFC1F2]/40 shrink-0 group-hover:scale-110 transition-transform duration-500">
                  <Mail size={24} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1">Email Us</p>
                  <p className="text-lg font-black text-white leading-tight mb-1 truncate">dsa.smart.start@gmail.com</p>
                  <p className="text-base font-bold text-gray-400 leading-tight truncate">smartstart.dsa@gmail.com</p>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-center gap-6 p-6 sm:p-8 bg-white/5 rounded-[2rem] border border-white/10 shadow-sm hover:shadow-xl hover:shadow-[#AB8FFF]/10 transition-all duration-500 group">
                <div className="w-14 h-14 bg-[#AB8FFF] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#AB8FFF]/40 shrink-0 group-hover:scale-110 transition-transform duration-500">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1">Visit Us</p>
                  <p className="text-lg font-black text-white">Viale Bonaria, 90</p>
                  <p className="text-base font-bold text-gray-400">09125 Cagliari, Italy</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-7 animate-reveal stagger-1">
            <div className="bg-white/5 p-8 sm:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl shadow-[#AB8FFF]/5 relative overflow-hidden rounded-[3rem]">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#AB8FFF] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-10 mix-blend-screen"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-white/5 border border-white/10">
                    <MessageCircle size={24} />
                  </div>
                  <h4 className="text-3xl font-black text-white tracking-tight uppercase">Get In Touch!</h4>
                </div>

                {/* Success Message */}
                {success ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={40} className="text-green-400" />
                    </div>
                    <h4 className="text-2xl font-black text-white mb-4">Message Sent!</h4>
                    <p className="text-gray-400 mb-8">
                      Thank you for reaching out. We'll get back to you as soon as possible.
                    </p>
                    <button
                      onClick={() => setSuccess(false)}
                      className="px-8 py-4 rounded-full bg-white/10 text-gray-300 font-bold hover:bg-white/20 transition-colors border border-white/10"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
                    {/* Error Message */}
                    {error && (
                      <div className="md:col-span-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                        <p className="text-red-400 text-sm font-medium">{error}</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 ml-4">First Name *</label>
                      <input 
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="First Name"
                        required
                        className="w-full px-8 py-5 rounded-[2rem] bg-white/5 border border-white/10 focus:bg-white/10 focus:border-[#AB8FFF] focus:outline-none transition-all font-bold text-white placeholder-gray-500"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 ml-4">Last Name</label>
                      <input 
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Last Name"
                        className="w-full px-8 py-5 rounded-[2rem] bg-white/5 border border-white/10 focus:bg-white/10 focus:border-[#AB8FFF] focus:outline-none transition-all font-bold text-white placeholder-gray-500"
                      />
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 ml-4">Email *</label>
                      <input 
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="hello@example.com"
                        required
                        className="w-full px-8 py-5 rounded-[2rem] bg-white/5 border border-white/10 focus:bg-white/10 focus:border-[#AB8FFF] focus:outline-none transition-all font-bold text-white placeholder-gray-500"
                      />
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 ml-4">Message *</label>
                      <textarea 
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder="How can we help you?"
                        required
                        className="w-full px-8 py-5 rounded-[2rem] bg-white/5 border border-white/10 focus:bg-white/10 focus:border-[#AB8FFF] focus:outline-none transition-all font-bold text-white placeholder-gray-500 resize-none"
                      />
                    </div>

                    <div className="md:col-span-2 mt-4">
                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full p-5 rounded-[2rem] bg-[#AB8FFF] text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#9a7eef] hover:shadow-lg hover:shadow-[#AB8FFF]/30 hover:-translate-y-1 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-[#AB8FFF]"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <span>Send Message</span>
                            <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default ContactPage;
