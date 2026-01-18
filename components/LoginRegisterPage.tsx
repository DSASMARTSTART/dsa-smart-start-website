
import React, { useEffect, useRef, useState } from 'react';
import { Mail, Lock, User, ChevronRight, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  onLoginSuccess?: () => void;
}

const LoginRegisterPage: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      onLoginSuccess?.();
    }
  }, [user, authLoading, onLoginSuccess]);

  const validateForm = (): string | null => {
    if (!formData.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email format';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 6) return 'Password must be at least 6 characters';
    if (!isLogin && !formData.name.trim()) return 'Name is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          setError(error.message === 'Invalid login credentials' 
            ? 'Invalid email or password. Please try again.'
            : error.message);
        } else {
          onLoginSuccess?.();
        }
      } else {
        const { error } = await signUp(formData.email, formData.password, formData.name);
        if (error) {
          if (error.message.includes('already registered')) {
            setError('An account with this email already exists. Please log in instead.');
          } else {
            setError(error.message);
          }
        } else {
          setSuccessMessage('Account created! Please check your email to verify your account.');
          setFormData({ name: '', email: '', password: '' });
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; size: number; speedX: number; speedY: number; opacity: number }[] = [];
    const particleCount = 20;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.3 + 0.1,
      }));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.speedX; p.y += p.speedY;
        if (p.x > canvas.width) p.x = 0; if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) p.y = 0; if (p.y < 0) p.y = canvas.height;
        ctx.fillStyle = `rgba(168, 85, 247, ${p.opacity})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize(); animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationFrameId); };
  }, []);

  return (
    <div className="bg-white min-h-screen pt-32 pb-20 relative">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-6">
        <div className="bg-white p-8 sm:p-14 rounded-[3.5rem] border border-gray-100 shadow-2xl shadow-purple-500/10">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-4">
              {isLogin ? 'Welcome Back' : 'Join the Family'}
            </h1>
            <p className="text-gray-500 italic font-medium">Empowering dyslexic minds through specialized English learning.</p>
          </div>

          <div className="flex p-2 bg-gray-50 rounded-3xl mb-10">
            <button onClick={() => { setIsLogin(true); setError(null); setSuccessMessage(null); }} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${isLogin ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400'}`}>Login</button>
            <button onClick={() => { setIsLogin(false); setError(null); setSuccessMessage(null); }} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${!isLogin ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400'}`}>Register</button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
              <p className="text-green-700 text-sm font-medium">{successMessage}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Full Name</label>
                <div className="relative">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Your Name" required className="w-full pl-16 pr-8 py-5 rounded-[2rem] bg-gray-50 border border-transparent focus:bg-white focus:border-purple-600 outline-none transition-all font-bold text-gray-900" />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" required className="w-full pl-16 pr-8 py-5 rounded-[2rem] bg-gray-50 border border-transparent focus:bg-white focus:border-purple-600 outline-none transition-all font-bold text-gray-900" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Password</label>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                <input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" required className="w-full pl-16 pr-14 py-5 rounded-[2rem] bg-gray-50 border border-transparent focus:bg-white focus:border-purple-600 outline-none transition-all font-bold text-gray-900" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center gap-4 bg-[#8a3ffc] text-white py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-purple-500/20 hover:bg-[#7a2fec] active:scale-95 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {isLogin ? 'LOGGING IN...' : 'CREATING ACCOUNT...'}
                </>
              ) : (
                <>
                  {isLogin ? 'LOG IN' : 'CREATE ACCOUNT'}
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginRegisterPage;
