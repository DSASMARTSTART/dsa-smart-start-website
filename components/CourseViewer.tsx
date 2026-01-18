
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
              if (data.modules[0].lessons.length > 0) {
                setSelectedItemId(data.modules[0].lessons[0].id);
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
            if (data.modules[0].lessons.length > 0) {
              setSelectedItemId(data.modules[0].lessons[0].id);
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
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading course...</p>
        </div>
      </div>
    );
  }

  // ACCESS DENIED - Not enrolled
  if (!isEnrolled) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={32} className="text-red-500" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-4">Access Denied</h3>
          <p className="text-gray-500 mb-2">
            {course?.title && <span className="font-semibold text-gray-700">"{course.title}"</span>}
          </p>
          <p className="text-gray-500 mb-8">
            {user 
              ? "You don't have access to this course. Please purchase it to continue learning."
              : "Please log in and purchase this course to access its content."
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={onBack} 
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors"
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
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen size={32} className="text-gray-300" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-4">Course Not Available</h3>
          <p className="text-gray-500 mb-8">This course doesn't have any content yet or doesn't exist.</p>
          <button onClick={onBack} className="px-8 py-4 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentModuleIndex = course.modules.findIndex(m => m.id === activeModuleId);
  const currentModule = course.modules[currentModuleIndex] || course.modules[0];
  
  const selectedLesson = currentModule.lessons.find(l => l.id === selectedItemId);
  const selectedHomework = currentModule.homework.find(h => h.id === selectedItemId);
  const selectedItem = selectedLesson || selectedHomework || currentModule.lessons[0];

  const isCompleted = (id: string) => !!progress[`${courseId}_${id}`];
  
  const calculateCourseProgress = () => {
    let total = 0;
    let done = 0;
    course.modules.forEach(m => {
      m.lessons.forEach(l => { total++; if (isCompleted(l.id)) done++; });
      m.homework.forEach(h => { total++; if (isCompleted(h.id)) done++; });
    });
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const handleNext = () => {
    const currentItems = [...currentModule.lessons, ...currentModule.homework];
    const currentIndex = currentItems.findIndex(item => item.id === selectedItemId);

    if (currentIndex < currentItems.length - 1) {
      setSelectedItemId(currentItems[currentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentModuleIndex < course.modules.length - 1) {
      const nextModule = course.modules[currentModuleIndex + 1];
      setActiveModuleId(nextModule.id);
      setSelectedItemId(nextModule.lessons[0]?.id || '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onBack();
    }
  };

  const getNextLabel = () => {
    const currentItems = [...currentModule.lessons, ...currentModule.homework];
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
    <div className="bg-[#f8f9fb] min-h-screen pt-24">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-100 py-6 px-8 flex flex-col md:flex-row items-center justify-between gap-6 fixed top-24 left-0 right-0 z-40">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-purple-600 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="h-10 w-px bg-gray-100"></div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-1 block">Classroom Environment</span>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">{course.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-8 w-full md:w-auto">
          <div className="flex-grow md:flex-initial min-w-[150px]">
             <div className="flex justify-between items-end mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Course Progress</span>
                <span className="text-xs font-black text-gray-900">{calculateCourseProgress()}%</span>
             </div>
             <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-600 transition-all duration-500"
                  style={{ width: `${calculateCourseProgress()}%` }}
                ></div>
             </div>
          </div>
          <button 
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#8a3ffc] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-100 hover:scale-105 active:scale-95 transition-all"
          >
            Continue Next
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 pt-32 lg:pt-24 min-h-[calc(100vh-100px)]">
        
        {/* Sidebar */}
        <div className="lg:col-span-4 bg-white border-r border-gray-100 h-full lg:sticky lg:top-[184px] lg:h-[calc(100vh-184px)] overflow-y-auto custom-scrollbar p-6">
          <div className="space-y-6">
            {course.modules.map((module, idx) => (
              <div key={module.id} className="space-y-3">
                <button 
                  onClick={() => setActiveModuleId(module.id)}
                  className={`w-full text-left p-4 rounded-2xl flex items-center justify-between transition-all ${activeModuleId === module.id ? 'bg-purple-50 border border-purple-100' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${activeModuleId === module.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {idx + 1}
                    </div>
                    <h4 className={`text-sm font-black uppercase tracking-tight ${activeModuleId === module.id ? 'text-purple-900' : 'text-gray-900'}`}>
                      {module.title}
                    </h4>
                  </div>
                  {activeModuleId === module.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {activeModuleId === module.id && (
                  <div className="pl-4 space-y-2 animate-reveal">
                    {module.lessons.map(lesson => (
                      <button 
                        key={lesson.id}
                        onClick={() => setSelectedItemId(lesson.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${selectedItemId === lesson.id ? 'bg-gray-50 shadow-sm ring-1 ring-purple-100' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          {isCompleted(lesson.id) ? (
                            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                          ) : (
                            <Circle size={16} className="text-gray-300 shrink-0" />
                          )}
                          <div className="overflow-hidden">
                            <p className={`text-xs font-bold leading-tight truncate ${selectedItemId === lesson.id ? 'text-purple-600' : 'text-gray-700'}`}>
                              {lesson.title}
                            </p>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{lesson.duration} • {lesson.type}</span>
                          </div>
                        </div>
                        {lesson.type === 'video' && <PlayCircle size={14} className="text-gray-400 shrink-0" />}
                        {lesson.pdfUrl && <FileText size={14} className="text-blue-400 shrink-0" />}
                      </button>
                    ))}

                    {module.homework.length > 0 && (
                      <div className="pt-2 border-t border-gray-50 mt-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 pl-3">Assignments</p>
                        {module.homework.map(h => (
                          <button 
                            key={h.id}
                            onClick={() => setSelectedItemId(h.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedItemId === h.id ? 'bg-gray-50 shadow-sm ring-1 ring-purple-100' : 'hover:bg-gray-50'}`}
                          >
                            {isCompleted(h.id) ? (
                               <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                             ) : (
                               <FileText size={16} className="text-gray-300 shrink-0" />
                             )}
                            <p className={`text-xs font-bold truncate ${selectedItemId === h.id ? 'text-purple-600' : 'text-gray-600'}`}>{h.title}</p>
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
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Learning Center</span>
            <ChevronRight size={10} className="text-gray-300" />
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{course.title}</span>
            <ChevronRight size={10} className="text-gray-300" />
            <span className="text-[9px] font-bold text-purple-600 uppercase tracking-widest">{selectedItem?.title}</span>
          </div>

          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-purple-500/5 overflow-hidden mb-12">
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
                    <div className="absolute bottom-6 left-6 text-white/40 text-[10px] font-black uppercase tracking-widest">DSA SMART START PLAYER</div>
                  </div>
                )
              ) : (
                <div className="p-12 md:p-20 text-center">
                  <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center text-purple-600 mx-auto mb-8 border border-purple-100">
                    <BookOpen size={40} />
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 mb-6 uppercase tracking-tight">Reading Resource</h3>
                  <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
                    {selectedLesson.content || 'Access visual materials. High-contrast viewing mode recommended.'}
                  </p>
                </div>
              )
            ) : (
              <div className="p-12 md:p-20 text-center bg-gray-50/50">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto mb-8 border border-indigo-100 shadow-sm">
                  <ClipboardCheck size={40} />
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-6 uppercase tracking-tight">Practice Assignment</h3>
                <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
                  {selectedHomework?.description || 'Complete this assignment to reinforce your learning.'}
                </p>
              </div>
            )}

            {/* PDF Attachment Section */}
            {selectedLesson?.pdfUrl && (
              <div className="p-6 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{selectedLesson.pdfTitle || 'Lesson PDF'}</p>
                    <p className="text-xs text-gray-500">PDF Attachment</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a 
                    href={selectedLesson.pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 rounded-xl text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors"
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
              <div className="p-6 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{selectedHomework.pdfTitle || 'Homework PDF'}</p>
                    <p className="text-xs text-gray-500">Download to complete this assignment</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a 
                    href={selectedHomework.pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 rounded-xl text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors"
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

            <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-gray-50">
               <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase mb-2">{selectedItem?.title}</h2>
                  <p className="text-gray-500 font-medium">{selectedLesson ? `Part of ${currentModule.title}` : 'Independent Assignment'}</p>
               </div>
               <button 
                 onClick={() => selectedItem && toggleProgress(courseId, selectedItem.id)}
                 className={`flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all ${selectedItem && isCompleted(selectedItem.id) ? 'bg-green-500 text-white shadow-green-100' : 'bg-gray-900 text-white hover:bg-purple-600 shadow-gray-100'}`}
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
            className="w-full bg-[#f3e8ff]/50 rounded-[3rem] border border-purple-100 p-10 flex flex-col md:flex-row items-center justify-between gap-8 group transition-all hover:bg-purple-100/50"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-purple-600 shadow-sm border border-purple-50 group-hover:scale-110 transition-transform">
                <Clock size={28} />
              </div>
              <div className="text-left">
                <h4 className="text-xl font-black text-gray-900 tracking-tight uppercase mb-1">Coming Up Next</h4>
                <p className="text-gray-500 font-medium">{getNextLabel()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-purple-600 group-hover:gap-6 transition-all">
              GO TO NEXT
              <ChevronRight size={18} />
            </div>
          </button>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8f9fb; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default CourseViewer;
