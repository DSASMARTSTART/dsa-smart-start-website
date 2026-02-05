// ============================================
// Checkout Success Page
// ============================================

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, BookOpen, ArrowRight, Sparkles, Mail, Key, User, Loader2, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { purchasesApi, coursesApi } from '../data/supabaseStore';
import { Course, Purchase } from '../types';

interface CheckoutSuccessPageProps {
  onNavigate: (path: string) => void;
}

// Interface for purchase with course details
interface PurchaseWithCourse extends Purchase {
  course?: Course;
}

const CheckoutSuccessPage: React.FC<CheckoutSuccessPageProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [recentPurchases, setRecentPurchases] = useState<PurchaseWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Check checkout type from URL
  const hash = window.location.hash;
  const isNewGuestCheckout = hash.includes('guest=true');
  const isExistingUserCheckout = hash.includes('guest=existing');
  const isGuestCheckout = isNewGuestCheckout || isExistingUserCheckout;

  const userId = user?.id || profile?.id;
  const userName = profile?.name || 'there';

  useEffect(() => {
    const loadRecentPurchases = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // Get user's purchases to show what was just purchased
        const purchases = await purchasesApi.getByUser(userId);
        
        // Filter to recent ones (within last 10 minutes)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recent = purchases.filter(p => new Date(p.purchasedAt) > tenMinutesAgo);
        
        // Fetch course details for each purchase
        const purchasesWithCourses: PurchaseWithCourse[] = await Promise.all(
          recent.map(async (purchase) => {
            try {
              const course = await coursesApi.getById(purchase.courseId);
              return { ...purchase, course: course || undefined };
            } catch {
              return { ...purchase };
            }
          })
        );
        
        setRecentPurchases(purchasesWithCourses);
      } catch (error) {
        console.error('Error loading recent purchases:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecentPurchases();
  }, [userId]);

  // Confetti animation effect
  useEffect(() => {
    // Simple confetti-like animation using CSS
    const container = document.getElementById('confetti-container');
    if (!container) return;

    const colors = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
    
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.cssText = `
        position: absolute;
        width: ${Math.random() * 10 + 5}px;
        height: ${Math.random() * 10 + 5}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}%;
        top: -20px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        animation: confetti-fall ${Math.random() * 3 + 2}s linear forwards;
        animation-delay: ${Math.random() * 2}s;
        opacity: 0.8;
      `;
      container.appendChild(confetti);
    }

    // Cleanup
    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 relative overflow-hidden">
      {/* Confetti container */}
      <div id="confetti-container" className="fixed inset-0 pointer-events-none z-10" />

      {/* CSS for confetti animation */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>

      <div className="max-w-3xl mx-auto px-6 text-center relative z-20">
        {/* Success Icon */}
        <div className="mb-8 animate-reveal">
          <div className="w-28 h-28 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 relative border border-emerald-500/20">
            <CheckCircle2 size={56} className="text-emerald-400" />
            <div className="absolute -top-2 -right-2">
              <Sparkles size={24} className="text-amber-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="mb-12 animate-reveal stagger-1">
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-4">
            Payment Received!
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            Thank you for your purchase, <span className="text-purple-400 font-bold">{userName}</span>!
          </p>
          <p className="text-gray-500 mt-2">
            Your payment is being verified. Your content will be available shortly.
          </p>
        </div>

        {/* Confirmation Details */}
        <div className="bg-white/5 rounded-[2rem] border border-white/10 p-8 mb-8 shadow-lg shadow-purple-500/10 animate-reveal stagger-2">
          {/* Guest User - Set Password Notice */}
          {isNewGuestCheckout && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Key size={24} className="text-amber-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-black text-amber-400 uppercase tracking-wide text-sm mb-2">
                    Check Your Email
                  </h3>
                  <p className="text-amber-300/80 text-sm mb-3">
                    We've sent you a magic link to access your account! Click the link in your email to log in instantly.
                    You can also set a password for easier future access.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
                    <Mail size={14} />
                    <span>Magic login link sent to your email</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Existing User - Magic Link Notice */}
          {isExistingUserCheckout && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail size={24} className="text-purple-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-black text-purple-400 uppercase tracking-wide text-sm mb-2">
                    Welcome Back!
                  </h3>
                  <p className="text-purple-300/80 text-sm mb-3">
                    We found your existing account! Check your email for a magic link to log in and access your new purchase.
                    Your course has been added to your account.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-purple-400 font-semibold">
                    <Mail size={14} />
                    <span>Magic login link sent to your email</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 mb-6">
            <Mail size={20} className="text-purple-400" />
            <p className="text-sm text-gray-400">
              A confirmation email will be sent to your registered email address.
            </p>
          </div>

          {/* Recent Purchases */}
          {loading ? (
            <div className="py-8">
              <div className="w-8 h-8 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : recentPurchases.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">
                Your Purchase{recentPurchases.length > 1 ? 's' : ''}
              </h3>
              {recentPurchases.map(purchase => (
                <div 
                  key={purchase.id} 
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    {purchase.course?.thumbnailUrl ? (
                      <img 
                        src={purchase.course.thumbnailUrl} 
                        alt={purchase.course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-purple-500/10 flex items-center justify-center">
                        <BookOpen size={24} className="text-purple-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-bold text-white">{purchase.course?.title || 'Course'}</h4>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      {purchase.course?.productType === 'ebook' ? 'E-book' : 
                       purchase.course?.productType === 'service' ? 'Service Program' : 'Interactive Course'}
                    </p>
                  </div>
                  {/* Status badge */}
                  {purchase.status === 'pending' ? (
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      Verifying
                    </span>
                  ) : purchase.status === 'completed' ? (
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Ready
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-white/10 text-gray-400 text-xs font-bold rounded-full">
                      {purchase.status}
                    </span>
                  )}
                </div>
              ))}
              
              {/* Pending notice */}
              {recentPurchases.some(p => p.status === 'pending') && (
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/30 mt-4">
                  <Clock size={20} className="text-amber-400" />
                  <p className="text-sm text-amber-300/80">
                    Payment verification usually takes a few moments. Your course will appear in your dashboard automatically once confirmed.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 py-4">
              Your content is now available in your dashboard.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-reveal stagger-3">
          {isGuestCheckout ? (
            // Guest user - prompt to check email
            <>
              <button
                onClick={() => onNavigate('login')}
                className="px-10 py-5 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-500/20 flex items-center justify-center gap-3"
              >
                <User size={18} />
                Log In After Setting Password
                <ArrowRight size={16} />
              </button>
              
              <button
                onClick={() => onNavigate('courses')}
                className="px-10 py-5 bg-white/5 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all border-2 border-white/10 flex items-center justify-center gap-3"
              >
                Browse More Courses
              </button>
            </>
          ) : (
            // Logged-in user - go to dashboard
            <>
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-10 py-5 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-500/20 flex items-center justify-center gap-3"
              >
                <BookOpen size={18} />
                Go to My Dashboard
                <ArrowRight size={16} />
              </button>
              
              <button
                onClick={() => onNavigate('courses')}
                className="px-10 py-5 bg-white/5 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all border-2 border-white/10 flex items-center justify-center gap-3"
              >
                Browse More Courses
              </button>
            </>
          )}
        </div>

        {/* Support Link */}
        <p className="mt-12 text-sm text-gray-500 animate-reveal stagger-4">
          Need help? <button onClick={() => onNavigate('contact')} className="text-purple-400 hover:underline font-semibold">Contact our support team</button>
        </p>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
