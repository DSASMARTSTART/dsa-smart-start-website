
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle2, Circle, ChevronRight, PlayCircle, BookOpen, Clock, FileText, ChevronDown, ChevronUp, ClipboardCheck, Download, ExternalLink, Lock, Trophy, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { coursesApi, enrollmentsApi, videoHelpers } from '../data/supabaseStore';
import { Course, Module, Lesson, Homework, QuizResult } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUserProgress } from '../hooks/useUserProgress';
import QuizRenderer from './QuizRenderer';
import FinalTestRenderer from './FinalTestRenderer';
import { getQuizForModule } from '../data/quizHelpers';
import { A1_FINAL_TEST_PASSED_KEY } from '../data/finalTestData';

interface CourseViewerProps {
  courseId: string;
  onBack: () => void;
  onNavigateToCheckout?: (courseId: string) => void;
}

const CourseViewer: React.FC<CourseViewerProps> = ({ courseId, onBack, onNavigateToCheckout }) => {
  const { t } = useTranslation('courses');
  const { user, isAdmin, isEditor } = useAuth();
  const { progress, toggleProgress } = useUserProgress(); // Now using hook directly
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null); // null = checking
  const [activeModuleId, setActiveModuleId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quizAttempts, setQuizAttempts] = useState<Record<string, QuizResult[]>>({});

  // Quiz completion handler
  const handleQuizComplete = useCallback((moduleId: string, result: Pick<QuizResult, 'score' | 'totalQuestions' | 'exerciseScores' | 'answers'>) => {
    const newResult: QuizResult = {
      id: crypto.randomUUID(),
      userId: user?.id ?? '',
      courseId,
      moduleId,
      score: result.score,
      totalQuestions: result.totalQuestions,
      exerciseScores: result.exerciseScores,
      answers: result.answers,
      attemptNumber: (quizAttempts[moduleId]?.length ?? 0) + 1,
      completedAt: new Date().toISOString(),
    };
    setQuizAttempts(prev => ({
      ...prev,
      [moduleId]: [...(prev[moduleId] ?? []), newResult],
    }));
    // Mark checkpoint as completed in progress
    if (!progress[`${courseId}_${moduleId}`]) {
      toggleProgress(courseId, moduleId);
    }
  }, [user, courseId, quizAttempts, progress, toggleProgress]);

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
          <p className="text-gray-400 font-medium">{t('courseViewer.loading')}</p>
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
          <h3 className="text-2xl font-black text-white mb-4">{t('courseViewer.accessDenied')}</h3>
          <p className="text-gray-400 mb-2">
            {course?.title && <span className="font-semibold text-gray-300">"{course.title}"</span>}
          </p>
          <p className="text-gray-400 mb-8">
            {user 
              ? t('courseViewer.noAccessLoggedIn')
              : t('courseViewer.noAccessLoggedOut')
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={onBack} 
              className="px-6 py-3 bg-white/5 text-gray-300 rounded-full font-bold text-sm hover:bg-white/10 transition-colors border border-white/10"
            >
              {t('courseViewer.goBack')}
            </button>
            {onNavigateToCheckout && course && (
              <button 
                onClick={() => onNavigateToCheckout(courseId)} 
                className="px-6 py-3 bg-purple-600 text-white rounded-full font-bold text-sm hover:bg-purple-700 transition-colors"
              >
                {t('courseViewer.purchaseCourse')}
              </button>
            )}
            {!user && (
              <button 
                onClick={() => window.location.hash = '#login'} 
                className="px-6 py-3 bg-purple-600 text-white rounded-full font-bold text-sm hover:bg-purple-700 transition-colors"
              >
                {t('courseViewer.logIn')}
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
          <h3 className="text-2xl font-black text-white mb-4">{t('courseViewer.courseNotAvailable')}</h3>
          <p className="text-gray-400 mb-8">{t('courseViewer.courseNotAvailableDesc')}</p>
          <button onClick={onBack} className="px-8 py-4 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors">
            {t('courseViewer.backToDashboard')}
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

  // Checkpoint quiz detection
  const isCheckpointActive = !!currentModule?.isCheckpoint;
  const isFinalTestActive = !!currentModule?.isFinalTest;
  const quizQuestions = isCheckpointActive && !isFinalTestActive ? getQuizForModule(currentModule.id) : undefined;

  // A1 Final Test passed flag (localStorage) — drives certificate pill in sidebar.
  const [finalTestPassed, setFinalTestPassed] = useState(false);
  useEffect(() => {
    try { setFinalTestPassed(localStorage.getItem(A1_FINAL_TEST_PASSED_KEY) === 'true'); } catch { /* ignore */ }
  }, []);

  const isCompleted = (id: string) => !!progress[`${courseId}_${id}`];
  
  const calculateCourseProgress = () => {
    let total = 0;
    let done = 0;
    course.modules.forEach(m => {
      if (m.isCheckpoint) {
        total++;
        if (isCompleted(m.id)) done++;
      } else {
        (m.lessons || []).forEach(l => { total++; if (isCompleted(l.id)) done++; });
        (m.homework || []).forEach(h => { total++; if (isCompleted(h.id)) done++; });
      }
    });
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const handleNext = () => {
    // If currently on a checkpoint, go to next module
    if (isCheckpointActive) {
      if (currentModuleIndex < course.modules.length - 1) {
        const nextModule = course.modules[currentModuleIndex + 1];
        setActiveModuleId(nextModule.id);
        if (nextModule.isCheckpoint) {
          setSelectedItemId(nextModule.id);
        } else {
          setSelectedItemId((nextModule.lessons || [])[0]?.id || '');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        onBack();
      }
      return;
    }

    const currentItems = [...moduleLessons, ...moduleHomework];
    const currentIndex = currentItems.findIndex(item => item.id === selectedItemId);

    if (currentIndex < currentItems.length - 1) {
      setSelectedItemId(currentItems[currentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentModuleIndex < course.modules.length - 1) {
      const nextModule = course.modules[currentModuleIndex + 1];
      setActiveModuleId(nextModule.id);
      if (nextModule.isCheckpoint) {
        setSelectedItemId(nextModule.id);
      } else {
        setSelectedItemId((nextModule.lessons || [])[0]?.id || '');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onBack();
    }
  };

  const getNextLabel = () => {
    // If on checkpoint, next is the next module
    if (isCheckpointActive) {
      if (currentModuleIndex < course.modules.length - 1) {
        return t('courseViewer.nextModule', { title: course.modules[currentModuleIndex + 1].title });
      }
      return t('courseViewer.courseComplete');
    }

    const currentItems = [...moduleLessons, ...moduleHomework];
    const currentIndex = currentItems.findIndex(item => item.id === selectedItemId);

    if (currentIndex < currentItems.length - 1) {
      return t('courseViewer.nextItem', { title: currentItems[currentIndex + 1].title });
    } else if (currentModuleIndex < course.modules.length - 1) {
      return t('courseViewer.nextModule', { title: course.modules[currentModuleIndex + 1].title });
    }
    return t('courseViewer.courseComplete');
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
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1 block">{t('courseViewer.classroomEnvironment')}</span>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">{course.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-8 w-full md:w-auto">
          <div className="flex-grow md:flex-initial min-w-[150px]">
             <div className="flex justify-between items-end mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{t('courseViewer.courseProgress')}</span>
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
            {t('courseViewer.continueNext')}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 pt-32 lg:pt-24 min-h-[calc(100vh-100px)]">
        
        {/* Sidebar */}
        <div className="lg:col-span-4 bg-white/5 border-r border-white/10 h-full lg:sticky lg:top-[184px] lg:h-[calc(100vh-184px)] overflow-y-auto custom-scrollbar p-6">
          <div className="space-y-6">
            {course.modules.map((module, idx) => {
              // ── Checkpoint Module ──
              if (module.isCheckpoint) {
                const checkpointCompleted = isCompleted(module.id);
                const bestScore = quizAttempts[module.id]?.reduce((best, a) => a.score > best ? a.score : best, 0);
                const bestTotal = quizAttempts[module.id]?.[0]?.totalQuestions;
                const isFinal = !!module.isFinalTest;
                return (
                  <div key={module.id}>
                    <button
                      onClick={() => { setActiveModuleId(module.id); setSelectedItemId(module.id); }}
                      className={`w-full text-left p-4 rounded-2xl flex items-center justify-between transition-all ${
                        activeModuleId === module.id
                          ? 'bg-amber-500/10 border border-amber-500/20'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          activeModuleId === module.id ? 'bg-amber-500 text-black' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {isFinal ? <Award size={16} /> : <ClipboardCheck size={16} />}
                        </div>
                        <div>
                          <h4 className={`text-sm font-black uppercase tracking-tight ${
                            activeModuleId === module.id ? 'text-amber-300' : 'text-white'
                          }`}>
                            {module.title}
                          </h4>
                          <span className="text-[9px] font-bold text-amber-500/60 uppercase tracking-widest flex items-center gap-1.5">
                            {isFinal
                              ? t('courseViewer.finalTest', 'Final Test')
                              : t('courseViewer.stopAndCheck', 'Stop & Check')}
                            {isFinal && finalTestPassed && (
                              <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[8px]">
                                {t('courseViewer.certificateUnlocked', 'CERT UNLOCKED')}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {checkpointCompleted && bestScore != null && bestTotal && (
                          <span className="text-[10px] font-black text-green-400">{bestScore}/{bestTotal}</span>
                        )}
                        {checkpointCompleted ? (
                          <CheckCircle2 size={16} className="text-green-400" />
                        ) : (
                          <Trophy size={16} className="text-amber-500/40" />
                        )}
                      </div>
                    </button>
                  </div>
                );
              }

              // ── Regular Module ──
              return (
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
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 pl-3">{t('courseViewer.assignments')}</p>
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
              );
            })}
          </div>
        </div>

        {/* Main Viewer Area */}
        <div className="lg:col-span-8 p-6 md:p-12 overflow-y-auto h-full animate-reveal">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{t('courseViewer.learningCenter')}</span>
            <ChevronRight size={10} className="text-gray-600" />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{course.title}</span>
            <ChevronRight size={10} className="text-gray-600" />
            <span className={`text-[9px] font-bold uppercase tracking-widest ${isCheckpointActive ? 'text-amber-400' : 'text-purple-400'}`}>
              {isCheckpointActive ? currentModule.title : selectedItem?.title}
            </span>
          </div>

          {/* ── Final Test View ── */}
          {isFinalTestActive ? (
            <div className="bg-white/5 rounded-[3rem] border border-amber-500/20 shadow-xl shadow-amber-500/10 overflow-hidden mb-12">
              <FinalTestRenderer
                courseId={courseId}
                module={currentModule}
                onPassed={() => {
                  setFinalTestPassed(true);
                  if (!progress[`${courseId}_${currentModule.id}`]) {
                    toggleProgress(courseId, currentModule.id);
                  }
                }}
              />
            </div>
          ) : isCheckpointActive && quizQuestions ? (
            <div className="bg-white/5 rounded-[3rem] border border-amber-500/20 shadow-xl shadow-amber-500/10 overflow-hidden mb-12">
              <QuizRenderer
                courseId={courseId}
                module={currentModule}
                quizQuestions={quizQuestions}
                onComplete={(result) => handleQuizComplete(currentModule.id, result)}
                previousAttempts={quizAttempts[currentModule.id] ?? []}
              />
            </div>
          ) : (
          <>
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
                      <p className="text-white/40 text-sm">{t('courseViewer.noVideoUploaded')}</p>
                    </div>
                    <div className="absolute bottom-6 left-6 text-white/40 text-[10px] font-black uppercase tracking-widest">{t('courseViewer.eduwayPlayer')}</div>
                  </div>
                )
              ) : (
                <div className="p-12 md:p-20 text-center">
                  <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center text-purple-400 mx-auto mb-8 border border-purple-500/20">
                    <BookOpen size={40} />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-6 uppercase tracking-tight">{t('courseViewer.readingResource')}</h3>
                  <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
                    {selectedLesson.content || t('courseViewer.readingResourceDefault')}
                  </p>
                </div>
              )
            ) : (
              <div className="p-12 md:p-20 text-center bg-white/5">
                <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-400 mx-auto mb-8 border border-indigo-500/20 shadow-sm">
                  <ClipboardCheck size={40} />
                </div>
                <h3 className="text-3xl font-black text-white mb-6 uppercase tracking-tight">{t('courseViewer.practiceAssignment')}</h3>
                <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
                  {selectedHomework?.description || t('courseViewer.practiceAssignmentDefault')}
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
                    <p className="text-sm font-bold text-white">{selectedLesson.pdfTitle || t('courseViewer.lessonPdf')}</p>
                    <p className="text-xs text-gray-400">{t('courseViewer.pdfAttachment')}</p>
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
                    {t('courseViewer.open')}
                  </a>
                  <a 
                    href={selectedLesson.pdfUrl} 
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    <Download size={14} />
                    {t('courseViewer.download')}
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
                    <p className="text-sm font-bold text-white">{selectedHomework.pdfTitle || t('courseViewer.homeworkPdf')}</p>
                    <p className="text-xs text-gray-400">{t('courseViewer.downloadToComplete')}</p>
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
                    {t('courseViewer.open')}
                  </a>
                  <a 
                    href={selectedHomework.pdfUrl} 
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
                  >
                    <Download size={14} />
                    {t('courseViewer.download')}
                  </a>
                </div>
              </div>
            )}

            <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-white/10">
               <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase mb-2">{selectedItem?.title}</h2>
                  <p className="text-gray-400 font-medium">{selectedLesson ? t('courseViewer.partOf', { module: currentModule.title }) : t('courseViewer.independentAssignment')}</p>
               </div>
               <button 
                 onClick={() => selectedItem && toggleProgress(courseId, selectedItem.id)}
                 className={`flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all ${selectedItem && isCompleted(selectedItem.id) ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-white text-black hover:bg-purple-600 hover:text-white shadow-white/10'}`}
               >
                 {selectedItem && isCompleted(selectedItem.id) ? (
                   <><CheckCircle2 size={18} /> {t('courseViewer.completed')}</>
                 ) : (
                   t('courseViewer.markAsCompleted')
                 )}
               </button>
            </div>
          </div>
          </>
          )}

          <button 
            onClick={handleNext}
            className="w-full bg-purple-500/10 rounded-[3rem] border border-purple-500/20 p-10 flex flex-col md:flex-row items-center justify-between gap-8 group transition-all hover:bg-purple-500/20"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-purple-400 shadow-sm border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Clock size={28} />
              </div>
              <div className="text-left">
                <h4 className="text-xl font-black text-white tracking-tight uppercase mb-1">{t('courseViewer.comingUpNext')}</h4>
                <p className="text-gray-400 font-medium">{getNextLabel()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-purple-400 group-hover:gap-6 transition-all">
              {t('courseViewer.goToNext')}
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
