
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Rocket, Clock, ChevronRight, Star, BookOpen, Layout, Zap, Layers, Compass, Music, CheckCircle2, LogIn, Download, FileText, AlertCircle, Loader2, Key, X, Mail } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { enrollmentsApi, purchasesApi, coursesApi } from '../data/supabaseStore';
import { Course, Enrollment, Purchase } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLocalizedCourses, getLocalizedTitle } from '../hooks/useLocalizedCourse';
import { useUserProgress } from '../hooks/useUserProgress';
import { useLocaleFormat } from '../hooks/useLocaleFormat';
import { supabase } from '../lib/supabase';

// Fallback cover images for e-books (local assets)
const EBOOK_COVERS: Record<string, string> = {
  'A1': '/assets/ebooks/a1-cover.jpg',
  'A2': '/assets/ebooks/a2-cover.jpg',
  'B1': '/assets/ebooks/b1-cover.jpg',
  'B2': '/assets/ebooks/b2-cover.jpg',
  'kids-basic': '/assets/ebooks/kids-basic-cover.jpg',
  'kids-medium': '/assets/ebooks/kids-medium-cover.jpg',
  'kids-advanced': '/assets/ebooks/kids-advanced-cover.jpg',
};

const getEbookCover = (ebook: { thumbnailUrl?: string; level: string }): string | undefined => {
  if (ebook.thumbnailUrl && ebook.thumbnailUrl !== 'pending-upload' && !ebook.thumbnailUrl.startsWith('/assets/courses/')) {
    return ebook.thumbnailUrl;
  }
  return EBOOK_COVERS[ebook.level];
};

// Level-based icons and colors
const LEVEL_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  'A1': { icon: <Layers size={22} />, color: 'from-blue-500 to-indigo-600' },
  'A2': { icon: <Compass size={22} />, color: 'from-indigo-500 to-purple-600' },
  'B1': { icon: <Zap size={22} />, color: 'from-purple-600 to-pink-600' },
  'Kids': { icon: <Music size={22} />, color: 'from-pink-400 to-rose-500' },
};

const LEVEL_LABELS: Record<string, string> = {
  'A1': 'Beginner',
  'A2': 'Elementary',
  'B1': 'Intermediate',
  'Kids': 'Young Learners'
};

interface DashboardProps {
  user: { name: string, email: string } | null;
  onOpenCourse: (id: string) => void;
  onNavigate?: (path: string) => void;
}

interface EnrolledCourse extends Course {
  enrollment: Enrollment;
  totalItems: number;
}

// Interface for purchased e-books
interface PurchasedEbook extends Course {
  enrollment: Enrollment;
}

// Interface for pending purchases
interface PendingPurchase extends Purchase {
  course?: Course;
}

const DashboardPage: React.FC<DashboardProps> = ({ user, onOpenCourse, onNavigate }) => {
  const { t, i18n } = useTranslation('dashboard');
  const { user: authUser, profile, loading: authLoading, resetPassword } = useAuth();
  const currentLang = i18n.language || 'en';
  const { progress } = useUserProgress(); // Now using hook directly - only loads when Dashboard is rendered
  const { formatDate, formatCurrency } = useLocaleFormat();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [purchasedEbooks, setPurchasedEbooks] = useState<PurchasedEbook[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<PendingPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSetPasswordPrompt, setShowSetPasswordPrompt] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  // Get the authenticated user ID
  const userId = authUser?.id || profile?.id;
  const displayName = profile?.name || user?.name || 'Student';

  // Check if user came from magic link login (guest checkout)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('login=magic') && hash.includes('newuser=true')) {
      setShowSetPasswordPrompt(true);
      // Clean up the URL
      window.history.replaceState(null, '', window.location.pathname + '#/dashboard');
    }
  }, []);

  // Handle sending password reset email
  const handleSendPasswordReset = async () => {
    if (!authUser?.email) return;
    
    const { error } = await resetPassword(authUser.email);
    if (!error) {
      setPasswordResetSent(true);
    }
  };
  useEffect(() => {
    // Track if component is still mounted to prevent state updates after unmount
    let isCancelled = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let pollCount = 0;
    const MAX_POLLS = 24; // Poll for up to 2 minutes (24 × 5s)

    const loadEnrolledCourses = async (isPolling = false) => {
      // Still waiting for auth - keep showing loading
      if (authLoading) {
        return;
      }
      
      // Not authenticated - stop loading and show login prompt
      if (!userId) {
        if (!isCancelled) setLoading(false);
        return;
      }

      // Reset loading to true for fresh fetch (important for remounts!)
      // Only show loading spinner on initial load, not on poll refreshes
      if (!isPolling && !isCancelled) {
        setLoading(true);
        setError(null);
      }

      try {
        // Validate that the session is still valid before fetching data
        const { data: { user: validUser }, error: sessionError } = await supabase.auth.getUser();
        if (sessionError || !validUser) {
          console.error('Session invalid, signing out:', sessionError?.message);
          await supabase.auth.signOut();
          if (!isCancelled) setLoading(false);
          return;
        }
        // SELF-HEALING: Repair any completed purchases that are missing enrollments
        // This handles edge cases where webhook confirmed payment but enrollment wasn't created
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: repairResult } = await (supabase as any).rpc('ensure_enrollment_exists', {
            p_user_id: userId
          });
          if (repairResult && repairResult.repaired_count > 0) {
            console.log(`Self-healing: repaired ${repairResult.repaired_count} missing enrollment(s)`);
          }
        } catch (repairErr) {
          // Don't block dashboard loading if repair fails
          console.warn('Enrollment repair check failed (non-critical):', repairErr);
        }

        // Optimized: Get enrollments WITH course data in a single query (no N+1!)
        const enrollmentsWithCourses = await enrollmentsApi.getByUserWithCourses(userId);
        
        if (isCancelled) return;
        
        // Separate e-books from interactive courses
        const ebooks: PurchasedEbook[] = [];
        const courses: EnrolledCourse[] = [];
        
        enrollmentsWithCourses.forEach(({ course, ...enrollment }) => {
          // Check if it's an e-book (PDF product)
          if (course.productType === 'ebook' || course.contentFormat === 'pdf') {
            ebooks.push({
              ...course,
              enrollment: enrollment as Enrollment
            });
          } else {
            // Interactive course - calculate total items
            let totalItems = 0;
            (course.modules || []).forEach(m => {
              totalItems += (m.lessons || []).length;
              totalItems += (m.homework || []).length;
            });
            
            courses.push({
              ...course,
              enrollment: enrollment as Enrollment,
              totalItems: Math.max(totalItems, 1) // Minimum 1 to avoid division by zero
            });
          }
        });

        // Also fetch pending purchases (awaiting payment confirmation)
        const userPurchases = await purchasesApi.getByUser(userId);
        const pendingOnes = userPurchases.filter(p => p.status === 'pending');
        
        // Fetch course details for pending purchases
        const pendingWithCourses: PendingPurchase[] = await Promise.all(
          pendingOnes.map(async (purchase) => {
            try {
              const course = await coursesApi.getById(purchase.courseId);
              return { ...purchase, course: course || undefined };
            } catch {
              return { ...purchase };
            }
          })
        );

        if (!isCancelled) {
          setEnrolledCourses(courses);
          setPurchasedEbooks(ebooks);
          setPendingPurchases(pendingWithCourses);

          // AUTO-POLL: If there are pending purchases, start polling every 5s
          // so the dashboard auto-updates when webhook confirms payment
          if (pendingWithCourses.length > 0 && !pollInterval) {
            console.log(`Dashboard: ${pendingWithCourses.length} pending purchase(s), starting auto-refresh...`);
            pollInterval = setInterval(() => {
              pollCount++;
              if (pollCount >= MAX_POLLS) {
                console.log('Dashboard: stopping auto-refresh (max polls reached)');
                if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
                return;
              }
              loadEnrolledCourses(true);
            }, 5000);
          }

          // Stop polling if no more pending purchases
          if (pendingWithCourses.length === 0 && pollInterval) {
            console.log('Dashboard: no more pending purchases, stopping auto-refresh');
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
      } catch (err) {
        console.error('Error loading enrolled courses:', err);
        if (!isCancelled) {
          setError(t('errorLoading', { defaultValue: 'Failed to load your courses. Please try again.' }));
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadEnrolledCourses();
    
    // Cleanup to prevent state updates on unmounted component
    return () => { 
      isCancelled = true; 
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    };
  }, [userId, authLoading]);

  const calculateProgress = (courseId: string, totalItems: number) => {
    const completedCount = Object.keys(progress).filter(key => 
      key.startsWith(`${courseId}_`) && progress[key]
    ).length;
    
    return Math.min(100, Math.round((completedCount / totalItems) * 100));
  };

  const localizedEnrolledCourses = useLocalizedCourses(enrolledCourses);
  const localizedEbooks = useLocalizedCourses(purchasedEbooks);

  // Retry handler for error state
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Trigger re-fetch by toggling a dependency — simplest: reload
    window.location.reload();
  };

  if (loading && authLoading) {
    // Only show loading spinner if both are loading (initial load)
    return (
      <div className="bg-black min-h-screen pt-32 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Error state - show error with retry
  if (error && !loading) {
    return (
      <div className="bg-black min-h-screen pt-32 pb-20 flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center px-6">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <AlertCircle size={40} className="text-red-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4 uppercase tracking-tight">
            {t('errorTitle', { defaultValue: 'Something went wrong' })}
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            {error}
          </p>
          <button 
            onClick={handleRetry}
            className="px-12 py-5 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors shadow-xl shadow-purple-500/20"
          >
            {t('retry', { defaultValue: 'Try Again' })}
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated - show login prompt
  if (!userId) {
    return (
      <div className="bg-black min-h-screen pt-32 pb-20 flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center px-6">
          <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <LogIn size={40} className="text-purple-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4 uppercase tracking-tight">
            {t('loginRequired.title')}
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            {t('loginRequired.description')}
          </p>
          <button 
            onClick={() => onNavigate ? onNavigate('login') : window.location.hash = '#login'}
            className="px-12 py-5 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors shadow-xl shadow-purple-500/20"
          >
            {t('loginRequired.button')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Back Button */}
        <button
          onClick={() => { window.location.hash = '#home'; }}
          className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#AB8FFF] transition-colors mb-8"
        >
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#AB8FFF]/30 group-hover:shadow-md transition-all">
            <ArrowLeft size={16} />
          </div>
          {t('goBack', { ns: 'common' })}
        </button>

        {/* Welcome Header */}
        <div className="mb-12 animate-reveal">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 px-3 py-1 bg-purple-500/10 rounded-full border border-purple-500/20">{t('badge')}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-tight mb-2">
            <Trans i18nKey="welcome" ns="dashboard" values={{ name: displayName }} components={{ highlight: <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400" /> }} />
          </h1>
          <p className="text-gray-400 text-lg font-medium italic">{t('subtitle')}</p>
        </div>

        {/* Set Password Prompt for Guest Checkout Users */}
        {showSetPasswordPrompt && (
          <div className="mb-8 animate-reveal">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Key size={24} className="text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-purple-300">{t('setPassword.title')}</h3>
                    <button 
                      onClick={() => setShowSetPasswordPrompt(false)}
                      className="text-purple-500 hover:text-purple-300 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  {passwordResetSent ? (
                    <div className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3">
                      <CheckCircle2 size={18} className="text-emerald-400" />
                      <span className="text-sm text-emerald-300">
                        {t('setPassword.sent')}
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="text-purple-300/80 text-sm mb-4">
                        {t('setPassword.description')}
                      </p>
                      <button
                        onClick={handleSendPasswordReset}
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors"
                      >
                        <Mail size={16} />
                        {t('setPassword.button')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Purchases Alert */}
        {pendingPurchases.length > 0 && (
          <div className="mb-8 animate-reveal">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Loader2 size={24} className="text-amber-400 animate-spin" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-300 mb-2">{t('pendingPurchases.title')}</h3>
                  <p className="text-amber-300/80 text-sm mb-4">
                    {pendingPurchases.length === 1 
                      ? t('pendingPurchases.descriptionSingle')
                      : t('pendingPurchases.descriptionMultiple', { count: pendingPurchases.length })
                    }
                  </p>
                  <div className="space-y-2">
                    {pendingPurchases.map((purchase) => (
                      <div key={purchase.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3">
                        <AlertCircle size={18} className="text-amber-400" />
                        <span className="text-sm font-medium text-amber-200">
                          {purchase.course ? getLocalizedTitle(purchase.course, currentLang) : 'Course'} - {formatCurrency(purchase.amount, purchase.currency)}
                        </span>
                        <span className="text-xs text-amber-400 ml-auto">
                          {t('pendingPurchases.verifying')}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-amber-400/70 mt-4">
                    {t('pendingPurchases.supportNote')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Main Content - Courses */}
          <div className="lg:col-span-8 space-y-10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                <BookOpen size={20} className="text-purple-400" />
                {t('courses.title')}
              </h2>
            </div>

            {localizedEnrolledCourses.length === 0 ? (
              // No enrolled courses - show empty state
              <div className="bg-white/5 rounded-[3rem] border border-white/10 p-12 text-center">
                <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen size={32} className="text-purple-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4">{t('courses.emptyTitle')}</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  {t('courses.emptyDescription')}
                </p>
                <button 
                  onClick={() => onNavigate ? onNavigate('courses') : window.location.hash = '#courses'}
                  className="px-10 py-4 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/20"
                >
                  {t('courses.browseCourses')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {localizedEnrolledCourses.map((course, idx) => {
                  const completion = calculateProgress(course.id, course.totalItems);
                  const config = LEVEL_CONFIG[course.level] || LEVEL_CONFIG['A1'];
                  const levelLabel = t(`levelLabels.${course.level}`, { defaultValue: course.level });
                  
                  return (
                    <div key={course.id} className="group bg-white/5 rounded-[3rem] border border-white/10 shadow-sm hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 p-10 flex flex-col animate-reveal" style={{ animationDelay: `${idx * 0.1}s` }}>
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.color} text-white flex items-center justify-center mb-8 shadow-lg shadow-purple-500/20`}>
                        {config.icon}
                      </div>
                      <div className="mb-8">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">{levelLabel}</span>
                          {completion === 100 && (
                            <span className="text-[9px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1">
                              <Star size={10} fill="currentColor" />
                              {t('courses.completed')}
                            </span>
                          )}
                        </div>
                        <h3 className="text-2xl font-black text-white tracking-tight uppercase leading-none">{course.title}</h3>
                      </div>
                      
                      <div className="mb-10">
                        <div className="flex justify-between items-end mb-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('courses.progress')}</span>
                          <span className="text-sm font-black text-white">{completion}%</span>
                        </div>
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/10">
                          <div 
                            className={`h-full bg-gradient-to-r ${config.color} transition-all duration-1000 ease-out`}
                            style={{ width: `${completion}%` }}
                          ></div>
                        </div>
                      </div>

                      <button 
                        onClick={() => onOpenCourse(course.id)}
                        className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all active:scale-95"
                      >
                        {completion === 100 ? t('courses.reviewContent') : t('courses.continueLearning')}
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  );
                })}

                {/* Browse New Courses Placeholder */}
                <div className="bg-white/5 border-2 border-dashed border-white/10 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center animate-reveal stagger-2">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 text-gray-500 flex items-center justify-center mb-6">
                    <Star size={24} />
                  </div>
                  <h4 className="text-lg font-black text-gray-500 uppercase tracking-tight mb-2">{t('courses.nextPath')}</h4>
                  <p className="text-xs font-bold text-gray-500 mb-8 max-w-[150px]">{t('courses.nextPathDescription')}</p>
                  <button 
                    onClick={() => onNavigate ? onNavigate('courses') : window.location.hash = '#courses'}
                    className="text-[10px] font-black uppercase tracking-widest text-purple-400 hover:underline"
                  >
                    {t('courses.browseCatalog')}
                  </button>
                </div>
              </div>
            )}

            {/* My E-books Section */}
            {localizedEbooks.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                    <FileText size={20} className="text-emerald-400" />
                    {t('ebooks.title')}
                  </h2>
                  <span className="text-xs font-bold text-gray-500">{t('ebooks.count', { count: localizedEbooks.length })}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {localizedEbooks.map((ebook, idx) => {
                    // Get downloadable files from ebookFiles array, fall back to ebookPdfUrl
                    const downloadFiles = ebook.ebookFiles && ebook.ebookFiles.length > 0
                      ? ebook.ebookFiles.filter(f => f.url)
                      : ebook.ebookPdfUrl 
                        ? [{ label: t('ebooks.download'), url: ebook.ebookPdfUrl }]
                        : [];
                    const coverUrl = getEbookCover(ebook);
                    
                    return (
                      <div 
                        key={ebook.id} 
                        className="group bg-white/5 rounded-[2rem] border border-white/10 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-500 overflow-hidden animate-reveal"
                        style={{ animationDelay: `${idx * 0.1}s` }}
                      >
                        {/* E-book Cover */}
                        <div className="relative h-48 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center">
                          {coverUrl ? (
                            <>
                              <img 
                                src={coverUrl} 
                                alt={ebook.title}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  // Hide broken image and show fallback icon
                                  const target = e.currentTarget;
                                  target.style.display = 'none';
                                  const fallback = target.parentElement?.querySelector('.ebook-fallback-icon');
                                  if (fallback) (fallback as HTMLElement).style.display = 'block';
                                }}
                              />
                              <FileText size={64} className="text-emerald-500/30 ebook-fallback-icon" style={{ display: 'none' }} />
                            </>
                          ) : (
                            <FileText size={64} className="text-emerald-500/30" />
                          )}
                          <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                            PDF
                          </div>
                        </div>

                        {/* E-book Info */}
                        <div className="p-6">
                          <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2 line-clamp-2">
                            {ebook.title}
                          </h3>
                          <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                            {ebook.description}
                          </p>

                          {/* Download Buttons */}
                          {downloadFiles.length > 0 ? (
                            <div className="space-y-2">
                              {downloadFiles.map((file, fileIdx) => (
                                <a
                                  key={fileIdx}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95"
                                >
                                  <Download size={14} />
                                  {file.label || t('ebooks.download')}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <button
                              disabled
                              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/10 text-gray-500 font-black text-[10px] uppercase tracking-widest cursor-not-allowed"
                            >
                              <Download size={14} />
                              {t('ebooks.comingSoon')}
                            </button>
                          )}

                          <p className="text-[9px] text-gray-500 text-center mt-3">
                            {t('ebooks.purchased', { date: formatDate(ebook.enrollment.enrolledAt) })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Stats & Activity */}
          <div className="lg:col-span-4 space-y-8 animate-reveal stagger-1">
            <div className="bg-white/5 rounded-[3rem] border border-white/10 p-10 shadow-sm">
              <h3 className="text-lg font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                <Zap size={20} className="text-amber-500" />
                {t('stats.title')}
              </h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('stats.itemsCompleted')}</p>
                    <p className="text-xl font-black text-white">
                      {Object.values(progress).filter(v => v).length} {t('stats.total')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('stats.enrolledCourses')}</p>
                    <p className="text-xl font-black text-white">{enrolledCourses.length}</p>
                  </div>
                </div>
                {purchasedEbooks.length > 0 && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('stats.ebooksOwned')}</p>
                      <p className="text-xl font-black text-white">{purchasedEbooks.length}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-400 border border-pink-500/20">
                    <Rocket size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('stats.currentStatus')}</p>
                    <p className="text-xl font-black text-white">{t('stats.activeLearner')}</p>
                  </div>
                </div>
              </div>
            </div>


          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
