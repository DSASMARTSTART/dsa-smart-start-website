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

  const userId = user?.id || profile?.id;
  const userName = profile?.name || 'there';

  useEffect(() => {
    let isCancelled = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

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
        
        if (!isCancelled) {
          setRecentPurchases(purchasesWithCourses);
          
          // Check if any purchases are still pending — if so, start polling
          const hasPending = purchasesWithCourses.some(p => p.status === 'pending');
          if (hasPending && !pollInterval) {
            pollInterval = setInterval(async () => {
              try {
                const refreshed = await purchasesApi.getByUser(userId);
                const recentRefreshed = refreshed.filter(p => new Date(p.purchasedAt) > tenMinutesAgo);
                const withCourses: PurchaseWithCourse[] = await Promise.all(
                  recentRefreshed.map(async (purchase) => {
                    try {
                      const course = await coursesApi.getById(purchase.courseId);
                      return { ...purchase, course: course || undefined };
                    } catch {
                      return { ...purchase };
                    }
                  })
                );
                
                if (!isCancelled) {
                  setRecentPurchases(withCourses);
                  
                  // Stop polling if all purchases are confirmed
                  const stillPending = withCourses.some(p => p.status === 'pending');
                  if (!stillPending && pollInterval) {
                    clearInterval(pollInterval);
                    pollInterval = null;
                  }
                }
              } catch (err) {
                console.error('Error polling purchases:', err);
              }
            }, 5000); // Poll every 5 seconds
          }
        }
      } catch (error) {
        console.error('Error loading recent purchases:', error);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadRecentPurchases();

    // Cleanup: stop polling on unmount
    return () => {
      isCancelled = true;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
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
            Your payment is being verified. Your digital content will be available in your Dashboard shortly.
          </p>
          <p className="text-gray-600 text-sm mt-1">
            All purchased courses and materials are delivered digitally — no shipping required.
          </p>
        </div>

        {/* Confirmation Details */}
        <div className="bg-white/5 rounded-[2rem] border border-white/10 p-8 mb-8 shadow-lg shadow-purple-500/10 animate-reveal stagger-2">
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

        {/* Action Buttons — user is always logged in */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-reveal stagger-3">
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
