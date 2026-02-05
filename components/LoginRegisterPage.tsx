
import React, { useEffect, useRef, useState } from 'react';
import { Mail, Lock, User, ChevronRight, Eye, EyeOff, AlertCircle, Loader2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  onLoginSuccess?: () => void;
}

const LoginRegisterPage: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { signIn, signUp, resetPassword, user, loading: authLoading } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Forgot password modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  // Focus management refs
  const forgotPasswordTriggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

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
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (!isLogin && !formData.name.trim()) return 'Name is required';
    if (!isLogin && formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    
    if (!resetEmail.trim()) {
      setResetError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      setResetError('Invalid email format');
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await resetPassword(resetEmail);
      if (error) {
        setResetError(error.message);
      } else {
        setResetSuccess(true);
      }
    } catch (err) {
      setResetError('An unexpected error occurred. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetError(null);
    setResetSuccess(false);
    // Return focus to the trigger button
    setTimeout(() => forgotPasswordTriggerRef.current?.focus(), 0);
  };

  // Focus management: move focus to modal when opened
  useEffect(() => {
    if (showForgotPassword) {
      // Focus the email input when modal opens
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [showForgotPassword]);

  // Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForgotPassword) {
        closeForgotPasswordModal();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showForgotPassword]);

  // Password strength calculation
  const getPasswordStrength = (password: string): { score: number; label: string; color: string; requirements: { met: boolean; text: string }[] } => {
    const requirements = [
      { met: password.length >= 8, text: 'At least 8 characters' },
      { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
      { met: /[a-z]/.test(password), text: 'One lowercase letter' },
      { met: /[0-9]/.test(password), text: 'One number' },
      { met: /[^A-Za-z0-9]/.test(password), text: 'One special character' },
    ];
    
    const metCount = requirements.filter(r => r.met).length;
    
    if (password.length === 0) return { score: 0, label: '', color: 'bg-gray-200', requirements };
    if (metCount <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500', requirements };
    if (metCount <= 2) return { score: 2, label: 'Fair', color: 'bg-orange-500', requirements };
    if (metCount <= 3) return { score: 3, label: 'Good', color: 'bg-yellow-500', requirements };
    if (metCount <= 4) return { score: 4, label: 'Strong', color: 'bg-green-500', requirements };
    return { score: 5, label: 'Excellent', color: 'bg-emerald-500', requirements };
  };

  const passwordStrength = getPasswordStrength(formData.password);

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
          setFormData({ name: '', email: '', password: '', confirmPassword: '' });
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
    <div className="bg-black min-h-screen pt-32 pb-20 relative">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-6">
        <div className="bg-white/5 p-8 sm:p-14 rounded-[3.5rem] border border-white/10 shadow-2xl shadow-purple-500/10">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-4">
              {isLogin ? 'Welcome Back' : 'Join the Family'}
            </h1>
            <p className="text-gray-400 italic font-medium">Empowering dyslexic minds through specialized English learning.</p>
          </div>

          <div className="flex p-2 bg-white/5 rounded-3xl mb-10 border border-white/10">
            <button onClick={() => { setIsLogin(true); setError(null); setSuccessMessage(null); }} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${isLogin ? 'bg-white/10 shadow-sm text-purple-400' : 'text-gray-500'}`}>Login</button>
            <button onClick={() => { setIsLogin(false); setError(null); setSuccessMessage(null); }} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${!isLogin ? 'bg-white/10 shadow-sm text-purple-400' : 'text-gray-500'}`}>Register</button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
              <p className="text-green-400 text-sm font-medium">{successMessage}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="flex flex-col gap-2">
                <label htmlFor="register-name" className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Full Name</label>
                <div className="relative">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input id="register-name" type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Your Name" required className="w-full pl-16 pr-8 py-5 rounded-[2rem] bg-white/5 border border-white/10 focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold text-white placeholder-gray-500" />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label htmlFor="auth-email" className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input id="auth-email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" required className="w-full pl-16 pr-8 py-5 rounded-[2rem] bg-white/5 border border-white/10 focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold text-white placeholder-gray-500" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="auth-password" className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Password</label>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input id="auth-password" type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" required className="w-full pl-16 pr-14 py-5 rounded-[2rem] bg-white/5 border border-white/10 focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold text-white placeholder-gray-500" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
              {/* Password Strength Indicator - Registration only */}
              {!isLogin && formData.password && (
                <div className="mt-2 px-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            level <= passwordStrength.score ? passwordStrength.color : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      passwordStrength.score <= 1 ? 'text-red-400' :
                      passwordStrength.score <= 2 ? 'text-orange-400' :
                      passwordStrength.score <= 3 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {passwordStrength.requirements.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                          req.met ? 'bg-green-500' : 'bg-white/10'
                        }`}>
                          {req.met && (
                            <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-[9px] ${req.met ? 'text-green-400' : 'text-gray-500'}`}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {!isLogin && (
              <div className="flex flex-col gap-2">
                <label htmlFor="register-confirm-password" className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input id="register-confirm-password" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} placeholder="••••••••" required className="w-full pl-16 pr-14 py-5 rounded-[2rem] bg-white/5 border border-white/10 focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold text-white placeholder-gray-500" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>{showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </div>
              </div>
            )}
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

          {isLogin && (
            <div className="mt-6 text-center">
              <button
                ref={forgotPasswordTriggerRef}
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-purple-400 hover:text-purple-300 text-sm font-semibold hover:underline transition-all"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
        >
          <div ref={modalRef} className="bg-[#1a1a1a] rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative border border-white/10">
            <button
              onClick={closeForgotPasswordModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>
            
            <h2 id="forgot-password-title" className="text-2xl font-black text-white tracking-tight mb-2">Reset Password</h2>
            <p className="text-gray-400 text-sm mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {resetSuccess ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="text-green-400" size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Check your email</h3>
                <p className="text-gray-400 text-sm mb-6">
                  We've sent a password reset link to <strong className="text-white">{resetEmail}</strong>
                </p>
                <button
                  onClick={closeForgotPasswordModal}
                  className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {resetError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
                    <p className="text-red-400 text-sm">{resetError}</p>
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <label htmlFor="reset-email" className="sr-only">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input
                      id="reset-email"
                      ref={emailInputRef}
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      placeholder="email@example.com"
                      aria-label="Email address for password reset"
                      className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-medium text-white placeholder-gray-500"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={closeForgotPasswordModal}
                  className="w-full py-3 text-gray-400 hover:text-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginRegisterPage;
