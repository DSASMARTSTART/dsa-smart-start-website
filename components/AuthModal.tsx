// ============================================
// Auth Modal — Inline Login/Register for Checkout
// Shown when an unauthenticated user tries to pay.
// ============================================

import React, { useEffect, useRef, useState } from 'react';
import { Mail, Lock, User, ChevronRight, Eye, EyeOff, AlertCircle, Loader2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const { signIn, signUp, resetPassword, user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // If user becomes logged in, fire success callback
  useEffect(() => {
    if (user && !authLoading && isOpen) {
      onLoginSuccess();
    }
  }, [user, authLoading, isOpen, onLoginSuccess]);

  // Focus first input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => emailInputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Password strength
  const getPasswordStrength = (password: string) => {
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

  const validateForm = (): string | null => {
    if (!formData.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email format';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (!isLogin && !formData.name.trim()) return 'Name is required';
    if (!isLogin && formData.password !== formData.confirmPassword) return 'Passwords do not match';
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
          onLoginSuccess();
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
          setSuccessMessage('Account created! Please check your email to verify your account, then log in to complete your purchase.');
          setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!resetEmail.trim()) { setResetError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) { setResetError('Invalid email format'); return; }

    setResetLoading(true);
    try {
      const { error } = await resetPassword(resetEmail);
      if (error) { setResetError(error.message); }
      else { setResetSuccess(true); }
    } catch {
      setResetError('An unexpected error occurred. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetError(null);
    setResetSuccess(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={modalRef} className="bg-[#111] rounded-[2.5rem] p-8 sm:p-10 max-w-lg w-full shadow-2xl relative border border-white/10 max-h-[90vh] overflow-y-auto">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-gray-300 transition-colors p-1"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 id="auth-modal-title" className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase mb-2">
            {isLogin ? 'Log In to Continue' : 'Create Account'}
          </h2>
          <p className="text-gray-400 text-sm">
            {isLogin
              ? 'Please log in to complete your purchase. Your cart items are saved.'
              : 'Create an account to purchase courses and access your dashboard.'}
          </p>
        </div>

        {/* Login/Register toggle */}
        <div className="flex p-2 bg-white/5 rounded-2xl mb-8 border border-white/10">
          <button onClick={() => { setIsLogin(true); setError(null); setSuccessMessage(null); }} className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'bg-white/10 shadow-sm text-purple-400' : 'text-gray-500'}`}>Login</button>
          <button onClick={() => { setIsLogin(false); setError(null); setSuccessMessage(null); }} className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'bg-white/10 shadow-sm text-purple-400' : 'text-gray-500'}`}>Register</button>
        </div>

        {error && (
          <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
            <p className="text-green-400 text-sm font-medium">{successMessage}</p>
          </div>
        )}

        {/* Forgot Password Sub-View */}
        {showForgotPassword ? (
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Reset Password</h3>
            <p className="text-gray-400 text-sm mb-5">Enter your email and we'll send a reset link.</p>

            {resetSuccess ? (
              <div className="text-center">
                <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="text-green-400" size={28} />
                </div>
                <p className="text-gray-300 text-sm mb-5">Reset link sent to <strong className="text-white">{resetEmail}</strong></p>
                <button onClick={closeForgotPassword} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-colors">
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {resetError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                    <p className="text-red-400 text-sm">{resetError}</p>
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-13 pr-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-medium text-white placeholder-gray-500"
                  />
                </div>
                <button type="submit" disabled={resetLoading} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {resetLoading ? <><Loader2 className="animate-spin" size={18} /> Sending...</> : 'Send Reset Link'}
                </button>
                <button type="button" onClick={closeForgotPassword} className="w-full py-3 text-gray-400 hover:text-gray-300 font-medium transition-colors text-sm">Cancel</button>
              </form>
            )}
          </div>
        ) : (
          /* Main Login/Register Form */
          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-3">Full Name</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Your Name" className="w-full pl-13 pr-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold text-white placeholder-gray-500" />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-3">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input ref={emailInputRef} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" className="w-full pl-13 pr-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold text-white placeholder-gray-500" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-3">Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" className="w-full pl-13 pr-12 py-4 rounded-2xl bg-white/5 border border-white/10 focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold text-white placeholder-gray-500" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              {/* Password strength - register only */}
              {!isLogin && formData.password && (
                <div className="mt-2 px-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div key={level} className={`h-1.5 flex-1 rounded-full transition-all ${level <= passwordStrength.score ? passwordStrength.color : 'bg-white/10'}`} />
                      ))}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      passwordStrength.score <= 1 ? 'text-red-400' :
                      passwordStrength.score <= 2 ? 'text-orange-400' :
                      passwordStrength.score <= 3 ? 'text-yellow-400' : 'text-green-400'
                    }`}>{passwordStrength.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {passwordStrength.requirements.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full flex items-center justify-center ${req.met ? 'bg-green-500' : 'bg-white/10'}`}>
                          {req.met && <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className={`text-[9px] ${req.met ? 'text-green-400' : 'text-gray-500'}`}>{req.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-3">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} placeholder="••••••••" className="w-full pl-13 pr-12 py-4 rounded-2xl bg-white/5 border border-white/10 focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold text-white placeholder-gray-500" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[#8a3ffc] text-white py-5 rounded-2xl font-black uppercase tracking-[0.15em] shadow-xl shadow-purple-500/20 hover:bg-[#7a2fec] active:scale-[0.98] transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={18} /> {isLogin ? 'LOGGING IN...' : 'CREATING ACCOUNT...'}</>
              ) : (
                <>{isLogin ? 'LOG IN & CONTINUE' : 'CREATE ACCOUNT'} <ChevronRight size={18} /></>
              )}
            </button>

            {isLogin && (
              <div className="text-center">
                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-purple-400 hover:text-purple-300 text-sm font-semibold hover:underline transition-all">
                  Forgot your password?
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
