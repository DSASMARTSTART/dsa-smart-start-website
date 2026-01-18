
import React, { useEffect, useState } from 'react';
import { Rocket, Clock, ChevronRight, Star, BookOpen, Layout, Zap, Layers, Compass, Music, CheckCircle2, LogIn } from 'lucide-react';
import { enrollmentsApi } from '../data/supabaseStore';
import { Course, Enrollment } from '../types';
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

const DashboardPage: React.FC<DashboardProps> = ({ user, onOpenCourse }) => {
  const { user: authUser, profile, loading: authLoading } = useAuth();
  const { progress } = useUserProgress(); // Now using hook directly - only loads when Dashboard is rendered
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  // Get the authenticated user ID
  const userId = authUser?.id || profile?.id;
  const displayName = profile?.name || user?.name || 'Student';

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
        
        // Map to EnrolledCourse format
        const courses: EnrolledCourse[] = enrollmentsWithCourses.map(({ course, ...enrollment }) => {
          // Calculate total items (lessons + homework)
          let totalItems = 0;
          (course.modules || []).forEach(m => {
            totalItems += (m.lessons || []).length;
            totalItems += (m.homework || []).length;
          });
          
          return {
            ...course,
            enrollment: enrollment as Enrollment,
            totalItems: Math.max(totalItems, 1) // Minimum 1 to avoid division by zero
          };
        });

        if (!isCancelled) setEnrolledCourses(courses);
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
