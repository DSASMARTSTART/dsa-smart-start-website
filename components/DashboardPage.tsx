
import React, { useEffect, useState } from 'react';
import { Rocket, Clock, ChevronRight, Star, BookOpen, Layout, Zap, Layers, Compass, Music, CheckCircle2, LogIn, Download, FileText, AlertCircle, Loader2, Key, X, Mail } from 'lucide-react';
import { enrollmentsApi, purchasesApi, coursesApi } from '../data/supabaseStore';
import { Course, Enrollment, Purchase } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUserProgress } from '../hooks/useUserProgress';

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

const DashboardPage: React.FC<DashboardProps> = ({ user, onOpenCourse }) => {
  const { user: authUser, profile, loading: authLoading, resetPassword } = useAuth();
  const { progress } = useUserProgress(); // Now using hook directly - only loads when Dashboard is rendered
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [purchasedEbooks, setPurchasedEbooks] = useState<PurchasedEbook[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<PendingPurchase[]>([]);
  const [loading, setLoading] = useState(true);
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

    const loadEnrolledCourses = async () => {
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
      if (!isCancelled) setLoading(true);

      try {
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
        }
      } catch (error) {
        console.error('Error loading enrolled courses:', error);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadEnrolledCourses();
    
    // Cleanup to prevent state updates on unmounted component
    return () => { isCancelled = true; };
  }, [userId, authLoading]);

  const calculateProgress = (courseId: string, totalItems: number) => {
    const completedCount = Object.keys(progress).filter(key => 
      key.startsWith(`${courseId}_`) && progress[key]
    ).length;
    
    return Math.min(100, Math.round((completedCount / totalItems) * 100));
  };

  if (loading && authLoading) {
    // Only show loading spinner if both are loading (initial load)
    return (
      <div className="bg-[#f8f9fb] min-h-screen pt-32 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading your courses...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login prompt
  if (!userId) {
    return (
      <div className="bg-[#f8f9fb] min-h-screen pt-32 pb-20 flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center px-6">
          <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <LogIn size={40} className="text-purple-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 uppercase tracking-tight">
            Sign In Required
          </h1>
          <p className="text-gray-500 text-lg mb-8">
            Please log in to access your dashboard and enrolled courses.
          </p>
          <button 
            onClick={() => window.location.hash = '#login'}
            className="px-12 py-5 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors shadow-xl shadow-purple-200"
          >
            Log In / Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f9fb] min-h-screen pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Welcome Header */}
        <div className="mb-12 animate-reveal">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-500 px-3 py-1 bg-purple-50 rounded-full border border-purple-100">Student Dashboard</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter uppercase leading-tight mb-2">
            Welcome back, <span className="text-purple-600">{displayName}</span>!
          </h1>
          <p className="text-gray-500 text-lg font-medium italic">Keep pushing forward. Your neurodiversity is your superpower.</p>
        </div>

        {/* Set Password Prompt for Guest Checkout Users */}
        {showSetPasswordPrompt && (
          <div className="mb-8 animate-reveal">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Key size={24} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-purple-800">Welcome! Set Your Password</h3>
                    <button 
                      onClick={() => setShowSetPasswordPrompt(false)}
                      className="text-purple-400 hover:text-purple-600 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  {passwordResetSent ? (
                    <div className="flex items-center gap-3 bg-white/60 rounded-lg px-4 py-3">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      <span className="text-sm text-emerald-800">
                        Password reset email sent! Check your inbox to set your password.
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="text-purple-700 text-sm mb-4">
                        You're logged in via magic link. Set a password to make future logins easier!
                      </p>
                      <button
                        onClick={handleSendPasswordReset}
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors"
                      >
                        <Mail size={16} />
                        Send Password Setup Email
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
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Loader2 size={24} className="text-amber-600 animate-spin" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-800 mb-2">Payment Processing</h3>
                  <p className="text-amber-700 text-sm mb-4">
                    {pendingPurchases.length === 1 
                      ? 'Your recent purchase is being verified. This usually takes a few moments.'
                      : `You have ${pendingPurchases.length} purchases being verified. This usually takes a few moments.`
                    }
                  </p>
                  <div className="space-y-2">
                    {pendingPurchases.map((purchase) => (
                      <div key={purchase.id} className="flex items-center gap-3 bg-white/60 rounded-lg px-4 py-3">
                        <AlertCircle size={18} className="text-amber-500" />
                        <span className="text-sm font-medium text-amber-900">
                          {purchase.course?.title || 'Course'} - {purchase.currency} {purchase.amount.toFixed(2)}
                        </span>
                        <span className="text-xs text-amber-600 ml-auto">
                          Verifying payment...
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-amber-600 mt-4">
                    Your course will appear below automatically once payment is confirmed. If this takes longer than expected, please contact support.
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
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
                <BookOpen size={20} className="text-purple-600" />
                My Learning Path
              </h2>
            </div>

            {enrolledCourses.length === 0 ? (
              // No enrolled courses - show empty state
              <div className="bg-white rounded-[3rem] border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen size={32} className="text-purple-400" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-4">No Courses Yet</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  You haven't enrolled in any courses yet. Browse our catalog to find the perfect learning path for you!
                </p>
                <button 
                  onClick={() => window.location.hash = '#courses'}
                  className="px-10 py-4 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
                >
                  Browse Courses
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {enrolledCourses.map((course, idx) => {
                  const completion = calculateProgress(course.id, course.totalItems);
                  const config = LEVEL_CONFIG[course.level] || LEVEL_CONFIG['A1'];
                  const levelLabel = LEVEL_LABELS[course.level] || course.level;
                  
                  return (
                    <div key={course.id} className="group bg-white rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-500 p-10 flex flex-col animate-reveal" style={{ animationDelay: `${idx * 0.1}s` }}>
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.color} text-white flex items-center justify-center mb-8 shadow-lg shadow-purple-100`}>
                        {config.icon}
                      </div>
                      <div className="mb-8">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">{levelLabel}</span>
                          {completion === 100 && (
                            <span className="text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
                              <Star size={10} fill="currentColor" />
                              Completed
                            </span>
                          )}
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase leading-none">{course.title}</h3>
                      </div>
                      
                      <div className="mb-10">
                        <div className="flex justify-between items-end mb-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Progress</span>
                          <span className="text-sm font-black text-gray-900">{completion}%</span>
                        </div>
                        <div className="h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                          <div 
                            className={`h-full bg-gradient-to-r ${config.color} transition-all duration-1000 ease-out`}
                            style={{ width: `${completion}%` }}
                          ></div>
                        </div>
                      </div>

                      <button 
                        onClick={() => onOpenCourse(course.id)}
                        className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-purple-600 transition-all active:scale-95"
                      >
                        {completion === 100 ? 'REVIEW CONTENT' : 'CONTINUE LEARNING'}
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  );
                })}

                {/* Browse New Courses Placeholder */}
                <div className="bg-white/50 border-2 border-dashed border-gray-200 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center animate-reveal stagger-2">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-6">
                    <Star size={24} />
                  </div>
                  <h4 className="text-lg font-black text-gray-400 uppercase tracking-tight mb-2">Next Path?</h4>
                  <p className="text-xs font-bold text-gray-400 mb-8 max-w-[150px]">Explore more courses to continue your learning journey.</p>
                  <button 
                    onClick={() => window.location.hash = '#courses'}
                    className="text-[10px] font-black uppercase tracking-widest text-purple-600 hover:underline"
                  >
                    Browse Catalog
                  </button>
                </div>
              </div>
            )}

            {/* My E-books Section */}
            {purchasedEbooks.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
                    <FileText size={20} className="text-emerald-600" />
                    My E-books
                  </h2>
                  <span className="text-xs font-bold text-gray-400">{purchasedEbooks.length} {purchasedEbooks.length === 1 ? 'e-book' : 'e-books'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {purchasedEbooks.map((ebook, idx) => {
                    // Get download URL from the first module's first lesson or homework PDF
                    const downloadUrl = ebook.modules?.[0]?.lessons?.[0]?.pdfUrl 
                      || ebook.modules?.[0]?.homework?.[0]?.pdfUrl
                      || '';
                    
                    return (
                      <div 
                        key={ebook.id} 
                        className="group bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 overflow-hidden animate-reveal"
                        style={{ animationDelay: `${idx * 0.1}s` }}
                      >
                        {/* E-book Cover */}
                        <div className="relative h-48 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
                          {ebook.thumbnailUrl ? (
                            <img 
                              src={ebook.thumbnailUrl} 
                              alt={ebook.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileText size={64} className="text-emerald-200" />
                          )}
                          <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                            PDF
                          </div>
                        </div>

                        {/* E-book Info */}
                        <div className="p-6">
                          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2 line-clamp-2">
                            {ebook.title}
                          </h3>
                          <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                            {ebook.description}
                          </p>

                          {/* Download Button */}
                          {downloadUrl ? (
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95"
                            >
                              <Download size={14} />
                              Download E-book
                            </a>
                          ) : (
                            <button
                              disabled
                              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gray-200 text-gray-500 font-black text-[10px] uppercase tracking-widest cursor-not-allowed"
                            >
                              <Download size={14} />
                              Coming Soon
                            </button>
                          )}

                          <p className="text-[9px] text-gray-400 text-center mt-3">
                            Purchased {new Date(ebook.enrollment.enrolledAt).toLocaleDateString()}
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
            <div className="bg-white rounded-[3rem] border border-gray-100 p-10 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                <Zap size={20} className="text-amber-500" />
                Live Stats
              </h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 border border-purple-100">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Items Completed</p>
                    <p className="text-xl font-black text-gray-900">
                      {Object.values(progress).filter(v => v).length} Total
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Enrolled Courses</p>
                    <p className="text-xl font-black text-gray-900">{enrolledCourses.length}</p>
                  </div>
                </div>
                {purchasedEbooks.length > 0 && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">E-books Owned</p>
                      <p className="text-xl font-black text-gray-900">{purchasedEbooks.length}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center text-pink-600 border border-pink-100">
                    <Rocket size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Current Status</p>
                    <p className="text-xl font-black text-gray-900">Active Learner</p>
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
