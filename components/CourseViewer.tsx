
import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Circle, ChevronRight, PlayCircle, BookOpen, Clock, FileText, ChevronDown, ChevronUp, ClipboardCheck, Download, ExternalLink, Lock } from 'lucide-react';
import { coursesApi, enrollmentsApi, videoHelpers } from '../data/supabaseStore';
import { Course, Module, Lesson, Homework } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUserProgress } from '../hooks/useUserProgress';

interface CourseViewerProps {
  courseId: string;
  onBack: () => void;
  onNavigateToCheckout?: (courseId: string) => void;
}

const CourseViewer: React.FC<CourseViewerProps> = ({ courseId, onBack, onNavigateToCheckout }) => {
  const { user, isAdmin, isEditor } = useAuth();
  const { progress, toggleProgress } = useUserProgress(); // Now using hook directly
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null); // null = checking
  const [activeModuleId, setActiveModuleId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Load course and check enrollment IN PARALLEL for faster loading
  useEffect(() => {
    const loadCourseAndCheckAccess = async () => {
      setLoading(true);
      
      // Admins and editors can always access - use admin API to see unpublished/draft courses
      if (isAdmin() || isEditor()) {
        try {
          // Use getByIdForAdmin to bypass is_published filter
          const data = await coursesApi.getByIdForAdmin(courseId);
          if (data) {
            setCourse(data);
            if (data.modules.length > 0) {
              setActiveModuleId(data.modules[0].id);
              const firstLessons = data.modules[0].lessons || [];
              if (firstLessons.length > 0) {
                setSelectedItemId(firstLessons[0].id);
              }
            }
          }
          setIsEnrolled(true);
        } catch (error) {
          console.error('Error loading course:', error);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Not logged in = not enrolled, but still load course info
      if (!user) {
        try {
          const data = await coursesApi.getById(courseId);
          setCourse(data);
        } catch (error) {
          console.error('Error loading course info:', error);
        }
        setIsEnrolled(false);
        setLoading(false);
        return;
      }

      // PARALLEL fetch: enrollment check + course data at the same time!
      try {
        const [enrolled, data] = await Promise.all([
          enrollmentsApi.checkEnrollment(user.id, courseId),
          coursesApi.getById(courseId)
        ]);
        
        setIsEnrolled(enrolled);
        
        if (data) {
          setCourse(data);
          if (enrolled && data.modules.length > 0) {
            setActiveModuleId(data.modules[0].id);
            const firstLessons = data.modules[0].lessons || [];
            if (firstLessons.length > 0) {
              setSelectedItemId(firstLessons[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Error loading course:', error);
        setIsEnrolled(false);
      } finally {
        setLoading(false);
      }
    };

    loadCourseAndCheckAccess();
  }, [user, courseId, isAdmin, isEditor]);

  if (loading || isEnrolled === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">Loading course...</p>
        </div>
      </div>
    );
  }

  // ACCESS DENIED - Not enrolled
  if (!isEnrolled) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={32} className="text-red-400" />
          </div>
          <h3 className="text-2xl font-black text-white mb-4">Access Denied</h3>
          <p className="text-gray-400 mb-2">
            {course?.title && <span className="font-semibold text-gray-300">"{course.title}"</span>}
          </p>
          <p className="text-gray-400 mb-8">
            {user 
              ? "You don't have access to this course. Please purchase it to continue learning."
              : "Please log in and purchase this course to access its content."
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={onBack} 
              className="px-6 py-3 bg-white/5 text-gray-300 rounded-full font-bold text-sm hover:bg-white/10 transition-colors border border-white/10"
            >
              Go Back
            </button>
            {onNavigateToCheckout && course && (
              <button 
                onClick={() => onNavigateToCheckout(courseId)} 
                className="px-6 py-3 bg-purple-600 text-white rounded-full font-bold text-sm hover:bg-purple-700 transition-colors"
              >
                Purchase Course
              </button>
            )}
            {!user && (
              <button 
                onClick={() => window.location.hash = '#login'} 
                className="px-6 py-3 bg-purple-600 text-white rounded-full font-bold text-sm hover:bg-purple-700 transition-colors"
              >
                Log In
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!course || course.modules.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen size={32} className="text-gray-500" />
          </div>
          <h3 className="text-2xl font-black text-white mb-4">Course Not Available</h3>
          <p className="text-gray-400 mb-8">This course doesn't have any content yet or doesn't exist.</p>
          <button onClick={onBack} className="px-8 py-4 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentModuleIndex = course.modules.findIndex(m => m.id === activeModuleId);
  const currentModule = course.modules[currentModuleIndex] || course.modules[0];
  
  // Defensive: ensure lessons and homework are arrays (might be null from DB)
  const moduleLessons = currentModule?.lessons || [];
  const moduleHomework = currentModule?.homework || [];
  
  const selectedLesson = moduleLessons.find(l => l.id === selectedItemId);
  const selectedHomework = moduleHomework.find(h => h.id === selectedItemId);
  const selectedItem = selectedLesson || selectedHomework || moduleLessons[0];

  const isCompleted = (id: string) => !!progress[`${courseId}_${id}`];
  
  const calculateCourseProgress = () => {
    let total = 0;
    let done = 0;
    course.modules.forEach(m => {
      (m.lessons || []).forEach(l => { total++; if (isCompleted(l.id)) done++; });
      (m.homework || []).forEach(h => { total++; if (isCompleted(h.id)) done++; });
    });
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const handleNext = () => {
    const currentItems = [...moduleLessons, ...moduleHomework];
    const currentIndex = currentItems.findIndex(item => item.id === selectedItemId);

    if (currentIndex < currentItems.length - 1) {
      setSelectedItemId(currentItems[currentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentModuleIndex < course.modules.length - 1) {
      const nextModule = course.modules[currentModuleIndex + 1];
      setActiveModuleId(nextModule.id);
      setSelectedItemId((nextModule.lessons || [])[0]?.id || '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onBack();
    }
  };

  const getNextLabel = () => {
    const currentItems = [...moduleLessons, ...moduleHomework];
    const currentIndex = currentItems.findIndex(item => item.id === selectedItemId);

    if (currentIndex < currentItems.length - 1) {
      return `Next: ${currentItems[currentIndex + 1].title}`;
    } else if (currentModuleIndex < course.modules.length - 1) {
      return `Next Module: ${course.modules[currentModuleIndex + 1].title}`;
    }
    return "Course Complete! Return to Dashboard";
  };

  // Get video embed URL if lesson has video
  const getVideoEmbed = () => {
    if (!selectedLesson?.videoLinks?.primaryVideoUrl) return null;
    const provider = selectedLesson.videoLinks.videoProvider;
    const url = selectedLesson.videoLinks.primaryVideoUrl;
    return videoHelpers.getEmbedUrl(url, provider);
  };

  const embedUrl = getVideoEmbed();

  return (
    <div className="bg-black min-h-screen pt-24">
      {/* Top Header */}
      <div className="bg-black border-b border-white/10 py-6 px-8 flex flex-col md:flex-row items-center justify-between gap-6 fixed top-24 left-0 right-0 z-40">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-purple-400 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="h-10 w-px bg-white/10"></div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1 block">Classroom Environment</span>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">{course.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-8 w-full md:w-auto">
          <div className="flex-grow md:flex-initial min-w-[150px]">
             <div className="flex justify-between items-end mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Course Progress</span>
                <span className="text-xs font-black text-white">{calculateCourseProgress()}%</span>
             </div>
             <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-600 transition-all duration-500"
                  style={{ width: `${calculateCourseProgress()}%` }}
                ></div>
             </div>
          </div>
          <button 
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#8a3ffc] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            Continue Next
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 pt-32 lg:pt-24 min-h-[calc(100vh-100px)]">
        
        {/* Sidebar */}
        <div className="lg:col-span-4 bg-white/5 border-r border-white/10 h-full lg:sticky lg:top-[184px] lg:h-[calc(100vh-184px)] overflow-y-auto custom-scrollbar p-6">
          <div className="space-y-6">
            {course.modules.map((module, idx) => (
              <div key={module.id} className="space-y-3">
                <button 
                  onClick={() => setActiveModuleId(module.id)}
                  className={`w-full text-left p-4 rounded-2xl flex items-center justify-between transition-all ${activeModuleId === module.id ? 'bg-purple-500/10 border border-purple-500/20' : 'hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${activeModuleId === module.id ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400'}`}>
                      {idx + 1}
                    </div>
                    <h4 className={`text-sm font-black uppercase tracking-tight ${activeModuleId === module.id ? 'text-purple-300' : 'text-white'}`}>
                      {module.title}
                    </h4>
                  </div>
                  {activeModuleId === module.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-500" />}
                </button>

                {activeModuleId === module.id && (
                  <div className="pl-4 space-y-2 animate-reveal">
                    {(module.lessons || []).map(lesson => (
                      <button 
                        key={lesson.id}
                        onClick={() => setSelectedItemId(lesson.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${selectedItemId === lesson.id ? 'bg-white/5 shadow-sm ring-1 ring-purple-500/30' : 'hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-3">
                          {isCompleted(lesson.id) ? (
                            <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                          ) : (
                            <Circle size={16} className="text-gray-500 shrink-0" />
                          )}
                          <div className="overflow-hidden">
                            <p className={`text-xs font-bold leading-tight truncate ${selectedItemId === lesson.id ? 'text-purple-400' : 'text-gray-300'}`}>
                              {lesson.title}
                            </p>
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{lesson.duration} • {lesson.type}</span>
                          </div>
                        </div>
                        {lesson.type === 'video' && <PlayCircle size={14} className="text-gray-500 shrink-0" />}
                        {lesson.pdfUrl && <FileText size={14} className="text-blue-400 shrink-0" />}
                      </button>
                    ))}

                    {(module.homework || []).length > 0 && (
                      <div className="pt-2 border-t border-white/10 mt-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 pl-3">Assignments</p>
                        {(module.homework || []).map(h => (
                          <button 
                            key={h.id}
                            onClick={() => setSelectedItemId(h.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedItemId === h.id ? 'bg-white/5 shadow-sm ring-1 ring-purple-500/30' : 'hover:bg-white/5'}`}
                          >
                            {isCompleted(h.id) ? (
                               <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                             ) : (
                               <FileText size={16} className="text-gray-500 shrink-0" />
                             )}
                            <p className={`text-xs font-bold truncate ${selectedItemId === h.id ? 'text-purple-400' : 'text-gray-300'}`}>{h.title}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Viewer Area */}
        <div className="lg:col-span-8 p-6 md:p-12 overflow-y-auto h-full animate-reveal">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Learning Center</span>
            <ChevronRight size={10} className="text-gray-600" />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{course.title}</span>
            <ChevronRight size={10} className="text-gray-600" />
            <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">{selectedItem?.title}</span>
          </div>

          <div className="bg-white/5 rounded-[3rem] border border-white/10 shadow-xl shadow-purple-500/10 overflow-hidden mb-12">
            {selectedLesson ? (
              selectedLesson.type === 'video' ? (
                embedUrl ? (
                  <div className="aspect-video bg-[#0f172a]">
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={selectedLesson.title}
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-[#0f172a] flex items-center justify-center relative group">
                    <div className="text-center">
                      <PlayCircle size={80} className="text-white/20 mx-auto mb-4" />
                      <p className="text-white/40 text-sm">No video uploaded yet</p>
                    </div>
                    <div className="absolute bottom-6 left-6 text-white/40 text-[10px] font-black uppercase tracking-widest">Eduway PLAYER</div>
                  </div>
                )
              ) : (
                <div className="p-12 md:p-20 text-center">
                  <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center text-purple-400 mx-auto mb-8 border border-purple-500/20">
                    <BookOpen size={40} />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-6 uppercase tracking-tight">Reading Resource</h3>
                  <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
                    {selectedLesson.content || 'Access visual materials. High-contrast viewing mode recommended.'}
                  </p>
                </div>
              )
            ) : (
              <div className="p-12 md:p-20 text-center bg-white/5">
                <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-400 mx-auto mb-8 border border-indigo-500/20 shadow-sm">
                  <ClipboardCheck size={40} />
                </div>
                <h3 className="text-3xl font-black text-white mb-6 uppercase tracking-tight">Practice Assignment</h3>
                <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
                  {selectedHomework?.description || 'Complete this assignment to reinforce your learning.'}
                </p>
              </div>
            )}

            {/* PDF Attachment Section */}
            {selectedLesson?.pdfUrl && (
              <div className="p-6 bg-blue-500/10 border-t border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{selectedLesson.pdfTitle || 'Lesson PDF'}</p>
                    <p className="text-xs text-gray-400">PDF Attachment</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a 
                    href={selectedLesson.pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-blue-500/30 rounded-xl text-blue-400 text-xs font-bold hover:bg-blue-500/10 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Open
                  </a>
                  <a 
                    href={selectedLesson.pdfUrl} 
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    <Download size={14} />
                    Download
                  </a>
                </div>
              </div>
            )}

            {/* Homework PDF Attachment Section */}
            {selectedHomework?.pdfUrl && (
              <div className="p-6 bg-indigo-500/10 border-t border-indigo-500/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{selectedHomework.pdfTitle || 'Homework PDF'}</p>
                    <p className="text-xs text-gray-400">Download to complete this assignment</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a 
                    href={selectedHomework.pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-indigo-500/30 rounded-xl text-indigo-400 text-xs font-bold hover:bg-indigo-500/10 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Open
                  </a>
                  <a 
                    href={selectedHomework.pdfUrl} 
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
                  >
                    <Download size={14} />
                    Download
                  </a>
                </div>
              </div>
            )}

            <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-white/10">
               <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase mb-2">{selectedItem?.title}</h2>
                  <p className="text-gray-400 font-medium">{selectedLesson ? `Part of ${currentModule.title}` : 'Independent Assignment'}</p>
               </div>
               <button 
                 onClick={() => selectedItem && toggleProgress(courseId, selectedItem.id)}
                 className={`flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all ${selectedItem && isCompleted(selectedItem.id) ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-white text-black hover:bg-purple-600 hover:text-white shadow-white/10'}`}
               >
                 {selectedItem && isCompleted(selectedItem.id) ? (
                   <><CheckCircle2 size={18} /> Completed</>
                 ) : (
                   'Mark as Completed'
                 )}
               </button>
            </div>
          </div>

          <button 
            onClick={handleNext}
            className="w-full bg-purple-500/10 rounded-[3rem] border border-purple-500/20 p-10 flex flex-col md:flex-row items-center justify-between gap-8 group transition-all hover:bg-purple-500/20"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-purple-400 shadow-sm border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Clock size={28} />
              </div>
              <div className="text-left">
                <h4 className="text-xl font-black text-white tracking-tight uppercase mb-1">Coming Up Next</h4>
                <p className="text-gray-400 font-medium">{getNextLabel()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-purple-400 group-hover:gap-6 transition-all">
              GO TO NEXT
              <ChevronRight size={18} />
            </div>
          </button>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0a0a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default CourseViewer;
