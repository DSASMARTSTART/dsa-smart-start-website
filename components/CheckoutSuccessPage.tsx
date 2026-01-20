// ============================================
// Checkout Success Page
// ============================================

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, BookOpen, ArrowRight, Sparkles, Mail, Key, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { enrollmentsApi } from '../data/supabaseStore';
import { Course } from '../types';

interface CheckoutSuccessPageProps {
  onNavigate: (path: string) => void;
}

const CheckoutSuccessPage: React.FC<CheckoutSuccessPageProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [recentPurchases, setRecentPurchases] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Check if this was a guest checkout
  const isGuestCheckout = window.location.hash.includes('guest=true');

  const userId = user?.id || profile?.id;
  const userName = profile?.name || 'there';

  useEffect(() => {
    const loadRecentPurchases = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // Get recent enrollments (last 10 minutes) to show what was just purchased
        const enrollments = await enrollmentsApi.getByUserWithCourses(userId);
        
        // Filter to recent ones (within last 10 minutes)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recent = enrollments
          .filter(e => new Date(e.enrolledAt) > tenMinutesAgo)
          .map(e => e.course);
        
        setRecentPurchases(recent);
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white pt-32 pb-20 relative overflow-hidden">
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
          <div className="w-28 h-28 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-200/50 relative">
            <CheckCircle2 size={56} className="text-emerald-500" />
            <div className="absolute -top-2 -right-2">
              <Sparkles size={24} className="text-amber-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="mb-12 animate-reveal stagger-1">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tight mb-4">
            Payment Successful!
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            Thank you for your purchase, <span className="text-purple-600 font-bold">{userName}</span>!
          </p>
          <p className="text-gray-500 mt-2">
            Your order has been confirmed and you now have full access to your content.
          </p>
        </div>

        {/* Confirmation Details */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-8 mb-8 shadow-lg shadow-purple-500/5 animate-reveal stagger-2">
          {/* Guest User - Set Password Notice */}
          {isGuestCheckout && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Key size={24} className="text-amber-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-black text-amber-900 uppercase tracking-wide text-sm mb-2">
                    Set Your Password
                  </h3>
                  <p className="text-amber-800 text-sm mb-3">
                    We've created an account for you! Check your email for a link to set your password. 
                    Once set, you can log in to access your courses anytime.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-amber-600 font-semibold">
                    <Mail size={14} />
                    <span>Password reset email sent</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 mb-6">
            <Mail size={20} className="text-purple-500" />
            <p className="text-sm text-gray-600">
              A confirmation email will be sent to your registered email address.
            </p>
          </div>

          {/* Recent Purchases */}
          {loading ? (
            <div className="py-8">
              <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : recentPurchases.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">
                Your Purchase{recentPurchases.length > 1 ? 's' : ''}
              </h3>
              {recentPurchases.map(course => (
                <div 
                  key={course.id} 
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    {course.thumbnailUrl ? (
                      <img 
                        src={course.thumbnailUrl} 
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-purple-100 flex items-center justify-center">
                        <BookOpen size={24} className="text-purple-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-bold text-gray-900">{course.title}</h4>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      {course.productType === 'ebook' ? 'E-book' : 
                       course.productType === 'service' ? 'Service Program' : 'Interactive Course'}
                    </p>
                  </div>
                  {course.productType === 'ebook' && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                      Ready to Download
                    </span>
                  )}
                </div>
              ))}
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
                className="px-10 py-5 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 flex items-center justify-center gap-3"
              >
                <User size={18} />
                Log In After Setting Password
                <ArrowRight size={16} />
              </button>
              
              <button
                onClick={() => onNavigate('courses')}
                className="px-10 py-5 bg-white text-gray-900 rounded-full font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all border-2 border-gray-200 flex items-center justify-center gap-3"
              >
                Browse More Courses
              </button>
            </>
          ) : (
            // Logged-in user - go to dashboard
            <>
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-10 py-5 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 flex items-center justify-center gap-3"
              >
                <BookOpen size={18} />
                Go to My Dashboard
                <ArrowRight size={16} />
              </button>
              
              <button
                onClick={() => onNavigate('courses')}
                className="px-10 py-5 bg-white text-gray-900 rounded-full font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all border-2 border-gray-200 flex items-center justify-center gap-3"
              >
                Browse More Courses
              </button>
            </>
          )}
        </div>

        {/* Support Link */}
        <p className="mt-12 text-sm text-gray-400 animate-reveal stagger-4">
          Need help? <button onClick={() => onNavigate('contact')} className="text-purple-600 hover:underline font-semibold">Contact our support team</button>
        </p>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
