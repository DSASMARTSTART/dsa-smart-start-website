import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ResetPasswordPageProps {
  onComplete?: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateForm = (): string | null => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
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

    if (!supabase) {
      setError('Unable to connect to the server. Please try again later.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Redirect after 3 seconds
        setTimeout(() => {
          onComplete?.();
        }, 3000);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Canvas animation (same as login page)
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
    <div className="bg-black min-h-screen pt-32 pb-20 relative">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-6">
        <div className="bg-white/5 p-8 sm:p-14 rounded-[3.5rem] border border-white/10 shadow-2xl shadow-purple-500/20">
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                <CheckCircle className="text-green-400" size={40} />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tighter mb-4">
                Password Updated!
              </h1>
              <p className="text-gray-400 mb-6">
                Your password has been successfully reset. You will be redirected to login shortly.
              </p>
              <button
                onClick={onComplete}
                className="px-8 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-colors"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-12">
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-4">
                  Set New Password
                </h1>
                <p className="text-gray-400 italic font-medium">
                  Enter your new password below.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-16 pr-14 py-5 rounded-[2rem] bg-white/5 border border-white/10 focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold text-white placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-16 pr-14 py-5 rounded-[2rem] bg-white/5 border border-white/10 focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold text-white placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-4 bg-[#8a3ffc] text-white py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-purple-500/30 hover:bg-[#7a2fec] active:scale-95 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      UPDATING...
                    </>
                  ) : (
                    'UPDATE PASSWORD'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
