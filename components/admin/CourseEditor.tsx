// ============================================
// Admin Course Editor - Full Real-time Editing
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Save, Eye, Upload, Plus, Trash2, GripVertical,
  ChevronDown, ChevronUp, Play, FileText, Link, ExternalLink,
  AlertCircle, CheckCircle, DollarSign, Calendar, Percent, Loader2,
  Image, X, Users, Book, Tv, GraduationCap, Users2, FileDown, Globe,
  Sparkles, BookOpen
} from 'lucide-react';
import { 
  Button, Input, Textarea, Select, Modal, ConfirmModal, 
  UnsavedChangesBar, StatusBadge 
} from './AdminUIComponents';
import { coursesApi, videoHelpers, categoriesApi } from '../../data/supabaseStore';
import { storageHelpers } from '../../lib/supabase';
import { Course, Module, Lesson, Homework, VideoLink, CoursePricing, QuizQuestion, QuizOption, QuizQuestionType, CourseInstructor, CourseTargetAudience, Category, ProductType, TargetAudience, ContentFormat } from '../../types';

interface CourseEditorProps {
  courseId: string;
  onNavigate: (path: string) => void;
}

const CourseEditor: React.FC<CourseEditorProps> = ({ courseId, onNavigate }) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<'metadata' | 'pricing' | 'content' | 'syllabus'>('metadata');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [isNewCourse, setIsNewCourse] = useState(false);

  // Modal states
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  
  // Edit targets
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingLessonModuleId, setEditingLessonModuleId] = useState<string | null>(null);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [editingHomeworkModuleId, setEditingHomeworkModuleId] = useState<string | null>(null);

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    setLoading(true);
    try {
      // Handle 'new' courseId - create a new course
      if (courseId === 'new') {
        const newCourse = await coursesApi.create({
          title: 'New Course',
          description: '',
          level: 'A1',
          thumbnailUrl: '',
          modules: [],
          isPublished: false,
          isDraft: true,
          pricing: {
            price: 0,
            currency: 'EUR',
            isFree: true
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        setCourse(newCourse);
        setIsNewCourse(true);
        setHasChanges(true);
        // Navigate to the actual course ID URL
        window.history.replaceState(null, '', `#admin-course-edit-${newCourse.id}`);
        setLoading(false);
        return;
      }

      const data = await coursesApi.getByIdForAdmin(courseId);
      if (data) {
        setCourse(data);
        // Expand first module by default
        if (data.modules.length > 0) {
          setExpandedModules(new Set([data.modules[0].id]));
        }
      }
    } catch (error) {
      console.error('Error loading course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMetadata = async (updates: Partial<Course>) => {
    if (!course) return;
    setSaving(true);
    try {
      await coursesApi.updateMetadata(course.id, updates);
      setHasChanges(true);
      await loadCourse();
    } catch (error: any) {
      console.error('Error saving metadata:', error);
      alert(`Error saving metadata: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePricing = async (pricing: CoursePricing) => {
    if (!course) return;
    try {
      await coursesApi.updatePricing(course.id, pricing);
      setHasChanges(true);
      loadCourse();
    } catch (error: any) {
      alert(error.message || 'Error saving pricing');
    }
  };

  const handlePublish = async () => {
    if (!course) return;
    setSaving(true);
    try {
      await coursesApi.publish(course.id);
      setHasChanges(false);
      setIsNewCourse(false);
      loadCourse();
    } catch (error) {
      console.error('Error publishing course:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    if (!course) return;
    await coursesApi.discardDraft(course.id);
    setHasChanges(false);
    loadCourse();
    setShowDiscardConfirm(false);
  };

  // Module handlers
  const handleAddModule = () => {
    setEditingModule(null);
    setEditingModuleId(null);
    setShowModuleModal(true);
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setEditingModuleId(module.id);
    setShowModuleModal(true);
  };

  const handleSaveModule = async (data: { title: string; description: string }) => {
    if (!course) return;
    
    if (editingModuleId) {
      await coursesApi.updateModule(course.id, editingModuleId, data);
    } else {
      await coursesApi.addModule(course.id, { ...data, lessons: [], homework: [] });
    }
    
    setHasChanges(true);
    setShowModuleModal(false);
    loadCourse();
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!course) return;
    if (confirm('Delete this module and all its content?')) {
      await coursesApi.deleteModule(course.id, moduleId);
      setHasChanges(true);
      loadCourse();
    }
  };

  // Lesson handlers
  const handleAddLesson = (moduleId: string) => {
    setEditingLesson(null);
    setEditingLessonModuleId(moduleId);
    setShowLessonModal(true);
  };

  const handleEditLesson = (moduleId: string, lesson: Lesson) => {
    setEditingLesson(lesson);
    setEditingLessonModuleId(moduleId);
    setShowLessonModal(true);
  };

  const handleSaveLesson = async (data: Omit<Lesson, 'id' | 'order'>) => {
    if (!course || !editingLessonModuleId) return;
    
    if (editingLesson) {
      await coursesApi.updateLesson(course.id, editingLessonModuleId, editingLesson.id, data);
    } else {
      await coursesApi.addLesson(course.id, editingLessonModuleId, data);
    }
    
    setHasChanges(true);
    setShowLessonModal(false);
    loadCourse();
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!course) return;
    if (confirm('Delete this lesson?')) {
      await coursesApi.deleteLesson(course.id, moduleId, lessonId);
      setHasChanges(true);
      loadCourse();
    }
  };

  // Video link handlers
  const handleEditVideo = (moduleId: string, lesson: Lesson) => {
    setEditingLesson(lesson);
    setEditingLessonModuleId(moduleId);
    setShowVideoModal(true);
  };

  const handleSaveVideo = async (videoLinks: VideoLink) => {
    if (!course || !editingLessonModuleId || !editingLesson) return;
    
    await coursesApi.updateLesson(course.id, editingLessonModuleId, editingLesson.id, { videoLinks });
    setHasChanges(true);
    setShowVideoModal(false);
    loadCourse();
  };

  // Homework handlers
  const handleAddHomework = (moduleId: string) => {
    setEditingHomework(null);
    setEditingHomeworkModuleId(moduleId);
    setShowHomeworkModal(true);
  };

  const handleEditHomework = (moduleId: string, homework: Homework) => {
    setEditingHomework(homework);
    setEditingHomeworkModuleId(moduleId);
    setShowHomeworkModal(true);
  };

  const handleSaveHomework = async (data: Omit<Homework, 'id' | 'order'>) => {
    if (!course || !editingHomeworkModuleId) return;
    
    if (editingHomework) {
      await coursesApi.updateHomework(course.id, editingHomeworkModuleId, editingHomework.id, data);
    } else {
      await coursesApi.addHomework(course.id, editingHomeworkModuleId, data);
    }
    
    setHasChanges(true);
    setShowHomeworkModal(false);
    loadCourse();
  };

  const handleDeleteHomework = async (moduleId: string, homeworkId: string) => {
    if (!course) return;
    if (confirm('Delete this homework?')) {
      await coursesApi.deleteHomework(course.id, moduleId, homeworkId);
      setHasChanges(true);
      loadCourse();
    }
  };

  const toggleModuleExpand = (moduleId: string) => {
    const newSet = new Set(expandedModules);
    if (newSet.has(moduleId)) {
      newSet.delete(moduleId);
    } else {
      newSet.add(moduleId);
    }
    setExpandedModules(newSet);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Course not found</p>
        <Button variant="secondary" onClick={() => onNavigate('admin-courses')} className="mt-4">
          Back to Courses
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-reveal pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('admin-courses')}
            className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-purple-600 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">
                {course.title}
              </h1>
              <StatusBadge status={course.isPublished ? 'published' : 'draft'} />
            </div>
            {course.publishedAt && (
              <p className="text-xs text-gray-400">
                Last published: {new Date(course.publishedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {/* Preview as Student - opens syllabus page */}
          <Button
            variant="secondary"
            icon={Eye}
            onClick={() => window.location.hash = `#syllabus-${course.id}`}
            title="Preview how students will see the syllabus page"
          >
            Preview Syllabus
          </Button>
          {/* Preview Course Content - opens course viewer */}
          <Button
            variant="secondary"
            icon={Play}
            onClick={() => window.location.hash = `#course-${course.id}`}
            title="Preview course content as a student would see it"
          >
            Preview as Student
          </Button>
          <Button
            variant="primary"
            icon={Save}
            onClick={handlePublish}
            loading={saving}
            disabled={!course.isDraft && !hasChanges}
          >
            {course.isDraft || hasChanges ? 'Publish Changes' : 'Published'}
          </Button>
        </div>
      </div>

      {/* Section Tabs - Content tab only shown for interactive courses */}
      <div className="flex gap-2 border-b border-gray-100 pb-2 overflow-x-auto">
        {(['metadata', 'pricing', 'syllabus', ...(course.productType !== 'ebook' ? ['content'] : [])] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section as 'metadata' | 'pricing' | 'content' | 'syllabus')}
            className={`px-6 py-3 rounded-t-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeSection === section
                ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {section === 'content' ? (course.productType === 'service' ? 'Schedule' : 'Content') : 
             section === 'syllabus' ? 'Syllabus Page' : section}
          </button>
        ))}
      </div>

      {/* Metadata Section */}
      {activeSection === 'metadata' && (
        <MetadataEditor 
          course={course} 
          onSave={handleSaveMetadata}
        />
      )}

      {/* Pricing Section */}
      {activeSection === 'pricing' && (
        <PricingEditor
          pricing={course.draftData?.pricing || course.pricing}
          onSave={handleSavePricing}
          productType={course.productType}
          teachingMaterialsPrice={course.teachingMaterialsPrice}
        />
      )}

      {/* Syllabus Section - For syllabus page content */}
      {activeSection === 'syllabus' && (
        <SyllabusEditor
          course={course}
          onSave={async (syllabusContent) => {
            await handleSaveMetadata({ syllabusContent } as Partial<Course>);
          }}
        />
      )}

      {/* Content Section - Only for interactive courses and services */}
      {activeSection === 'content' && course.productType !== 'ebook' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">
              {course.productType === 'service' ? 'Course Schedule & Materials' : 'Modules & Lessons'}
            </h2>
            <Button variant="primary" size="sm" icon={Plus} onClick={handleAddModule}>
              Add Module
            </Button>
          </div>

          {course.modules.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] p-12 text-center">
              <p className="text-gray-400 mb-4">
                {course.productType === 'service' 
                  ? 'No schedule yet. Add modules to organize your live course schedule.'
                  : 'No modules yet. Add your first module to get started.'}
              </p>
              <Button variant="secondary" icon={Plus} onClick={handleAddModule}>
                Add Module
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {course.modules.map((module, idx) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  index={idx}
                  isExpanded={expandedModules.has(module.id)}
                  onToggleExpand={() => toggleModuleExpand(module.id)}
                  onEdit={() => handleEditModule(module)}
                  onDelete={() => handleDeleteModule(module.id)}
                  onAddLesson={() => handleAddLesson(module.id)}
                  onEditLesson={(l) => handleEditLesson(module.id, l)}
                  onDeleteLesson={(l) => handleDeleteLesson(module.id, l.id)}
                  onEditVideo={(l) => handleEditVideo(module.id, l)}
                  onAddHomework={() => handleAddHomework(module.id)}
                  onEditHomework={(h) => handleEditHomework(module.id, h)}
                  onDeleteHomework={(h) => handleDeleteHomework(module.id, h.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unsaved Changes Bar */}
      <UnsavedChangesBar
        show={course.isDraft || hasChanges}
        lastPublished={course.publishedAt}
        onSave={handlePublish}
        onDiscard={() => setShowDiscardConfirm(true)}
        saving={saving}
      />

      {/* Modals */}
      <ModuleModal
        isOpen={showModuleModal}
        onClose={() => setShowModuleModal(false)}
        onSave={handleSaveModule}
        module={editingModule}
      />

      <LessonModal
        isOpen={showLessonModal}
        onClose={() => setShowLessonModal(false)}
        onSave={handleSaveLesson}
        lesson={editingLesson}
      />

      <HomeworkModal
        isOpen={showHomeworkModal}
        onClose={() => setShowHomeworkModal(false)}
        onSave={handleSaveHomework}
        homework={editingHomework}
      />

      <VideoLinkModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onSave={handleSaveVideo}
        videoLinks={editingLesson?.videoLinks}
        lessonTitle={editingLesson?.title || ''}
      />

      <ConfirmModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={handleDiscard}
        title="Discard Changes"
        message="Are you sure you want to discard all unsaved changes? This cannot be undone."
        confirmText="Discard"
        confirmType="danger"
      />
    </div>
  );
};

// ============================================
// Metadata Editor - Enhanced with Image Upload & Marketing Fields
// ============================================
const MetadataEditor: React.FC<{
  course: Course;
  onSave: (updates: Partial<Course>) => void;
}> = ({ course, onSave }) => {
  const normalizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === 'string');
  };

  const normalizeTargetAudienceInfo = (value: unknown): CourseTargetAudience => {
    const v = value as Partial<CourseTargetAudience> | null | undefined;
    return {
      description: typeof v?.description === 'string' ? v.description : '',
      points: normalizeStringArray(v?.points)
    };
  };

  const [title, setTitle] = useState(course.draftData?.title || course.title);
  const [description, setDescription] = useState(course.draftData?.description || course.description);
  const [level, setLevel] = useState(course.draftData?.level || course.level);
  const [thumbnailUrl, setThumbnailUrl] = useState(course.draftData?.thumbnailUrl || course.thumbnailUrl);
  const [adminNotes, setAdminNotes] = useState(course.adminNotes || '');
  
  // Product type fields (NEW)
  const [productType, setProductType] = useState<ProductType>(course.productType || 'learndash');
  const [targetAudienceType, setTargetAudienceType] = useState<TargetAudience>(course.targetAudience || 'adults_teens');
  const [contentFormat, setContentFormat] = useState<ContentFormat>(course.contentFormat || 'interactive');
  const [teachingMaterialsPrice, setTeachingMaterialsPrice] = useState<number>(course.teachingMaterialsPrice || 50);
  
  // E-book specific fields
  const [ebookPdfUrl, setEbookPdfUrl] = useState<string>((course as any).ebookPdfUrl || '');
  const [ebookPageCount, setEbookPageCount] = useState<number>((course as any).ebookPageCount || 0);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState('');
  const pdfInputRef = useRef<HTMLInputElement>(null);
  
  // Footer visibility
  const [showInFooter, setShowInFooter] = useState<boolean>((course as any).showInFooter !== false);
  const [footerOrder, setFooterOrder] = useState<number>((course as any).footerOrder || 0);
  
  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  
  // Extended marketing fields
  const [previewVideoUrl, setPreviewVideoUrl] = useState(course.previewVideoUrl || '');
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>(
    normalizeStringArray(course.draftData?.learningOutcomes ?? course.learningOutcomes)
  );
  const [prerequisites, setPrerequisites] = useState<string[]>(
    normalizeStringArray(course.draftData?.prerequisites ?? course.prerequisites)
  );
  const [targetAudienceInfo, setTargetAudienceInfo] = useState<CourseTargetAudience>(() =>
    normalizeTargetAudienceInfo(course.draftData?.targetAudienceInfo ?? course.targetAudienceInfo)
  );
  const [instructor, setInstructor] = useState<CourseInstructor>(course.instructor || { name: '', title: '', bio: '' });
  const [estimatedWeeklyHours, setEstimatedWeeklyHours] = useState(course.estimatedWeeklyHours || 0);
  
  // Image upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // New outcome/prerequisite input
  const [newOutcome, setNewOutcome] = useState('');
  const [newPrerequisite, setNewPrerequisite] = useState('');
  const [newAudiencePoint, setNewAudiencePoint] = useState('');
  
  // Expanded sections
  const [showMarketingFields, setShowMarketingFields] = useState(false);
  
  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      const cats = await categoriesApi.list(true); // Include inactive for admin
      setCategories(cats);
      setLoadingCategories(false);
    };
    fetchCategories();
  }, []);
  
  // Generate slug from name
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };
  
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setCreatingCategory(true);
    try {
      const newCat = await categoriesApi.create({
        slug: newCategorySlug || generateSlug(newCategoryName),
        name: newCategoryName.trim(),
        color: '#6366f1',
        sortOrder: categories.length + 1,
        isActive: true,
        catalogType: 'level' // Default to level type for course categories
      });
      setCategories([...categories, newCat]);
      setLevel(newCat.slug);
      setShowNewCategory(false);
      setNewCategoryName('');
      setNewCategorySlug('');
    } catch (error: any) {
      alert(`Error creating category: ${error.message}`);
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be smaller than 5MB');
      return;
    }
    
    setUploading(true);
    setUploadError('');
    
    const { url, error } = await storageHelpers.uploadImage(file, 'thumbnails');
    
    setUploading(false);
    
    if (error) {
      setUploadError(error);
      return;
    }
    
    setThumbnailUrl(url);
  };
  
  const handleRemoveImage = async () => {
    if (thumbnailUrl && storageHelpers.isSupabaseStorageUrl(thumbnailUrl)) {
      await storageHelpers.deleteImage(thumbnailUrl);
    }
    setThumbnailUrl('');
  };
  
  const addOutcome = () => {
    if (newOutcome.trim()) {
      setLearningOutcomes([...learningOutcomes, newOutcome.trim()]);
      setNewOutcome('');
    }
  };
  
  const removeOutcome = (index: number) => {
    setLearningOutcomes(learningOutcomes.filter((_, i) => i !== index));
  };
  
  const addPrerequisite = () => {
    if (newPrerequisite.trim()) {
      setPrerequisites([...prerequisites, newPrerequisite.trim()]);
      setNewPrerequisite('');
    }
  };
  
  const removePrerequisite = (index: number) => {
    setPrerequisites(prerequisites.filter((_, i) => i !== index));
  };
  
  const addAudiencePoint = () => {
    if (newAudiencePoint.trim()) {
      setTargetAudienceInfo({
        ...targetAudienceInfo,
        points: [...(targetAudienceInfo.points || []), newAudiencePoint.trim()]
      });
      setNewAudiencePoint('');
    }
  };
  
  const removeAudiencePoint = (index: number) => {
    setTargetAudienceInfo({
      ...targetAudienceInfo,
      points: (targetAudienceInfo.points || []).filter((_, i) => i !== index)
    });
  };
  
  // PDF upload handler for e-books
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      setPdfUploadError('Please select a PDF file');
      return;
    }
    
    // Validate file size (max 50MB for PDFs)
    if (file.size > 50 * 1024 * 1024) {
      setPdfUploadError('PDF must be smaller than 50MB');
      return;
    }
    
    setUploadingPdf(true);
    setPdfUploadError('');
    
    const { url, error } = await storageHelpers.uploadImage(file, 'ebooks');
    
    setUploadingPdf(false);
    
    if (error) {
      setPdfUploadError(error);
      return;
    }
    
    setEbookPdfUrl(url);
  };
  
  const handleRemovePdf = async () => {
    if (ebookPdfUrl && storageHelpers.isSupabaseStorageUrl(ebookPdfUrl)) {
      await storageHelpers.deleteImage(ebookPdfUrl);
    }
    setEbookPdfUrl('');
  };

  const handleSave = () => {
    onSave({ 
      title, 
      description, 
      level, 
      thumbnailUrl, 
      adminNotes,
      // Product type fields
      productType,
      targetAudience: targetAudienceType,
      contentFormat,
      teachingMaterialsPrice: productType === 'service' ? teachingMaterialsPrice : undefined,
      // E-book fields
      ebookPdfUrl: productType === 'ebook' ? ebookPdfUrl : undefined,
      ebookPageCount: productType === 'ebook' ? ebookPageCount : undefined,
      // Footer visibility
      showInFooter,
      footerOrder,
      // Marketing fields
      previewVideoUrl: previewVideoUrl || undefined,
      learningOutcomes: learningOutcomes.length > 0 ? learningOutcomes : undefined,
      prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
      targetAudienceInfo:
        targetAudienceInfo.description || targetAudienceInfo.points.length > 0
          ? targetAudienceInfo
          : undefined,
      instructor: instructor.name ? instructor : undefined,
      estimatedWeeklyHours: estimatedWeeklyHours || undefined
    } as Partial<Course>);
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 p-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Course Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., DSA SMART START A1"
        />
        <div className="space-y-2">
          <Select
            label="Category / Level"
            value={level}
            onChange={(e) => {
              if (e.target.value === '__new__') {
                setShowNewCategory(true);
              } else {
                setLevel(e.target.value as any);
              }
            }}
            options={[
              ...(loadingCategories ? [
                { value: 'A1', label: 'A1 - Beginner' },
                { value: 'A2', label: 'A2 - Elementary' },
                { value: 'B1', label: 'B1 - Intermediate' },
                { value: 'Kids', label: 'Kids' },
                { value: 'Premium', label: 'Premium - Pathway' },
                { value: 'Gold', label: 'Gold - Pathway' },
              ] : categories.map(cat => ({
                value: cat.slug,
                label: cat.name
              }))),
              { value: '__new__', label: '+ Create New Category' }
            ]}
          />
          
          {/* New Category Modal */}
          {showNewCategory && (
            <div className="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-purple-700">Create New Category</span>
                <button 
                  onClick={() => setShowNewCategory(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
              <Input
                label="Category Name"
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  setNewCategorySlug(generateSlug(e.target.value));
                }}
                placeholder="e.g., Business English"
              />
              <Input
                label="Slug (URL-friendly)"
                value={newCategorySlug}
                onChange={(e) => setNewCategorySlug(e.target.value)}
                placeholder="e.g., business-english"
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowNewCategory(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || creatingCategory}
                >
                  {creatingCategory ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                  Create Category
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Type Selection - IMPORTANT: Determines how course is displayed and delivered */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 space-y-4 border border-purple-100">
        <div className="flex items-center gap-2 mb-2">
          <Globe size={16} className="text-purple-600" />
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">
            Product Configuration
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Product Type */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">
              Product Type
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: 'learndash', label: 'Interactive Course', icon: Tv, desc: 'Video lessons, quizzes, modules' },
                { value: 'service', label: 'Online Course (Live)', icon: GraduationCap, desc: 'Live classes, workshops' },
                { value: 'ebook', label: 'E-book (PDF)', icon: Book, desc: 'Downloadable PDF' },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setProductType(type.value as ProductType)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    productType === type.value
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <type.icon size={20} className={productType === type.value ? 'text-purple-600' : 'text-gray-400'} />
                  <div>
                    <p className="text-xs font-bold">{type.label}</p>
                    <p className="text-[10px] text-gray-400">{type.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Target Audience */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">
              Target Audience
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: 'adults_teens', label: 'Adults & Teens', icon: Users2, desc: 'Age 13+' },
                { value: 'kids', label: 'Kids', icon: Users, desc: 'Age 6-12' },
              ].map((aud) => (
                <button
                  key={aud.value}
                  onClick={() => setTargetAudienceType(aud.value as TargetAudience)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    targetAudienceType === aud.value
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <aud.icon size={20} className={targetAudienceType === aud.value ? 'text-purple-600' : 'text-gray-400'} />
                  <div>
                    <p className="text-xs font-bold">{aud.label}</p>
                    <p className="text-[10px] text-gray-400">{aud.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Content Format (only for non-ebooks) */}
          {productType !== 'ebook' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">
                Content Format
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: 'interactive', label: 'Interactive', desc: 'Self-paced learning' },
                  { value: 'live', label: 'Live Classes', desc: 'Scheduled sessions' },
                  { value: 'hybrid', label: 'Hybrid', desc: 'Live + self-paced' },
                ].map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => setContentFormat(fmt.value as ContentFormat)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      contentFormat === fmt.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white hover:border-purple-300'
                    }`}
                  >
                    <p className="text-xs font-bold">{fmt.label}</p>
                    <p className="text-[10px] text-gray-400">{fmt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Service-specific: Teaching Materials Price */}
        {productType === 'service' && (
          <div className="pt-4 border-t border-purple-200">
            <div className="flex items-center gap-4">
              <div className="w-48">
                <Input
                  label="Teaching Materials Price (€)"
                  type="number"
                  value={teachingMaterialsPrice}
                  onChange={(e) => setTeachingMaterialsPrice(Number(e.target.value))}
                  placeholder="50"
                />
              </div>
              <p className="text-xs text-gray-500 mt-6">
                Optional add-on price for teaching materials at checkout
              </p>
            </div>
          </div>
        )}
        
        {/* Footer Visibility */}
        <div className="pt-4 border-t border-purple-200">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showInFooter}
                onChange={(e) => setShowInFooter(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-bold text-gray-700">Show in Footer Links</span>
            </label>
            {showInFooter && (
              <div className="w-32">
                <Input
                  label="Order"
                  type="number"
                  value={footerOrder}
                  onChange={(e) => setFooterOrder(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe what students will learn..."
      />

      {/* Cover Photo / Thumbnail Section */}
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">
          Cover Photo
        </label>
        
        <div className="flex flex-col md:flex-row gap-4">
          {/* Image Preview / Upload Area */}
          <div 
            className={`relative w-full md:w-64 h-40 rounded-2xl overflow-hidden border-2 border-dashed transition-all ${
              thumbnailUrl 
                ? 'border-transparent' 
                : 'border-gray-200 hover:border-purple-300 cursor-pointer'
            }`}
            onClick={() => !thumbnailUrl && fileInputRef.current?.click()}
          >
            {thumbnailUrl ? (
              <>
                <img 
                  src={thumbnailUrl} 
                  alt="Course thumbnail" 
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                {uploading ? (
                  <Loader2 size={24} className="animate-spin text-purple-600" />
                ) : (
                  <>
                    <Image size={32} className="mb-2" />
                    <span className="text-xs font-bold">Click to upload</span>
                    <span className="text-[10px]">800x450 recommended</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Upload Controls */}
          <div className="flex-1 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                icon={Upload}
                onClick={() => fileInputRef.current?.click()}
                loading={uploading}
              >
                Upload Image
              </Button>
              {thumbnailUrl && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  icon={Trash2}
                  onClick={handleRemoveImage}
                >
                  Remove
                </Button>
              )}
            </div>
            
            <div className="text-xs text-gray-400">Or paste an image URL:</div>
            <Input
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
            />
            
            {uploadError && (
              <div className="flex items-center gap-2 text-red-500 text-xs">
                <AlertCircle size={14} />
                {uploadError}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* E-book PDF Upload Section - Only shown for e-book product type */}
      {productType === 'ebook' && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 space-y-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <FileDown size={16} className="text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">
              E-book PDF File
            </span>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            {/* PDF Preview / Upload Area */}
            <div 
              className={`relative w-full md:w-64 h-40 rounded-2xl overflow-hidden border-2 border-dashed transition-all ${
                ebookPdfUrl 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300 cursor-pointer bg-white'
              }`}
              onClick={() => !ebookPdfUrl && pdfInputRef.current?.click()}
            >
              {ebookPdfUrl ? (
                <div className="flex flex-col items-center justify-center h-full text-blue-600">
                  <Book size={32} className="mb-2" />
                  <span className="text-xs font-bold">PDF Uploaded</span>
                  <a 
                    href={ebookPdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-500 underline mt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Preview PDF
                  </a>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemovePdf(); }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  {uploadingPdf ? (
                    <Loader2 size={24} className="animate-spin text-blue-600" />
                  ) : (
                    <>
                      <FileDown size={32} className="mb-2" />
                      <span className="text-xs font-bold">Click to upload PDF</span>
                      <span className="text-[10px]">Max 50MB</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* PDF Upload Controls */}
            <div className="flex-1 space-y-3">
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfUpload}
                className="hidden"
              />
              
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  icon={Upload}
                  onClick={() => pdfInputRef.current?.click()}
                  loading={uploadingPdf}
                >
                  Upload PDF
                </Button>
                {ebookPdfUrl && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    icon={Trash2}
                    onClick={handleRemovePdf}
                  >
                    Remove
                  </Button>
                )}
              </div>
              
              <div className="text-xs text-gray-400">Or paste a PDF URL (Google Drive, Dropbox, etc.):</div>
              <Input
                value={ebookPdfUrl}
                onChange={(e) => setEbookPdfUrl(e.target.value)}
                placeholder="https://drive.google.com/... or direct PDF URL"
              />
              
              <div className="w-32">
                <Input
                  label="Page Count"
                  type="number"
                  value={ebookPageCount || ''}
                  onChange={(e) => setEbookPageCount(Number(e.target.value))}
                  placeholder="e.g., 120"
                />
              </div>
              
              {pdfUploadError && (
                <div className="flex items-center gap-2 text-red-500 text-xs">
                  <AlertCircle size={14} />
                  {pdfUploadError}
                </div>
              )}
              
              <div className="bg-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <strong>Note:</strong> For Google Drive files, make sure the sharing is set to "Anyone with the link can view". 
                The system will handle secure delivery to purchased users only.
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Preview Video URL */}
      <Input
        label="Preview Video URL (Optional)"
        value={previewVideoUrl}
        onChange={(e) => setPreviewVideoUrl(e.target.value)}
        placeholder="https://vimeo.com/... or https://youtube.com/..."
        hint="A short preview video shown on the syllabus page"
      />

      <Textarea
        label="Admin Notes (Internal)"
        value={adminNotes}
        onChange={(e) => setAdminNotes(e.target.value)}
        placeholder="Internal notes not visible to students..."
      />
      
      {/* Marketing Fields Toggle */}
      <div className="border-t border-gray-100 pt-6">
        <button
          onClick={() => setShowMarketingFields(!showMarketingFields)}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-600 hover:text-purple-700"
        >
          {showMarketingFields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Marketing & Details (Optional)
        </button>
      </div>
      
      {showMarketingFields && (
        <div className="space-y-6 animate-reveal">
          {/* Learning Outcomes */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">
              Learning Outcomes
            </label>
            <div className="space-y-2">
              {learningOutcomes.map((outcome, i) => (
                <div key={i} className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-xl">
                  <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                  <span className="text-sm flex-1">{outcome}</span>
                  <button onClick={() => removeOutcome(i)} className="text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newOutcome}
                onChange={(e) => setNewOutcome(e.target.value)}
                placeholder="Add a learning outcome..."
                onKeyDown={(e) => e.key === 'Enter' && addOutcome()}
              />
              <Button variant="secondary" size="sm" onClick={addOutcome}>Add</Button>
            </div>
          </div>
          
          {/* Prerequisites */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">
              Prerequisites
            </label>
            <div className="space-y-2">
              {prerequisites.map((prereq, i) => (
                <div key={i} className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-xl">
                  <span className="text-sm flex-1">{prereq}</span>
                  <button onClick={() => removePrerequisite(i)} className="text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newPrerequisite}
                onChange={(e) => setNewPrerequisite(e.target.value)}
                placeholder="Add a prerequisite..."
                onKeyDown={(e) => e.key === 'Enter' && addPrerequisite()}
              />
              <Button variant="secondary" size="sm" onClick={addPrerequisite}>Add</Button>
            </div>
          </div>
          
          {/* Target Audience */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">
              Target Audience
            </label>
            <Input
              value={targetAudienceInfo.description}
              onChange={(e) => setTargetAudienceInfo({ ...targetAudienceInfo, description: e.target.value })}
              placeholder="Brief description of who this course is for..."
            />
            <div className="space-y-2">
              {(targetAudienceInfo.points || []).map((point, i) => (
                <div key={i} className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-xl">
                  <Users size={14} className="text-purple-500 flex-shrink-0" />
                  <span className="text-sm flex-1">{point}</span>
                  <button onClick={() => removeAudiencePoint(i)} className="text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAudiencePoint}
                onChange={(e) => setNewAudiencePoint(e.target.value)}
                placeholder="Add a target audience point..."
                onKeyDown={(e) => e.key === 'Enter' && addAudiencePoint()}
              />
              <Button variant="secondary" size="sm" onClick={addAudiencePoint}>Add</Button>
            </div>
          </div>
          
          {/* Instructor Info */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">
              Instructor (Optional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Name"
                value={instructor.name}
                onChange={(e) => setInstructor({ ...instructor, name: e.target.value })}
                placeholder="Instructor name"
              />
              <Input
                label="Title"
                value={instructor.title}
                onChange={(e) => setInstructor({ ...instructor, title: e.target.value })}
                placeholder="e.g., Senior English Teacher"
              />
            </div>
            <Textarea
              label="Bio"
              value={instructor.bio || ''}
              onChange={(e) => setInstructor({ ...instructor, bio: e.target.value })}
              placeholder="Brief instructor bio..."
            />
          </div>
          
          {/* Estimated Weekly Hours */}
          <div className="w-48">
            <Input
              label="Estimated Weekly Hours"
              type="number"
              value={estimatedWeeklyHours || ''}
              onChange={(e) => setEstimatedWeeklyHours(Number(e.target.value))}
              placeholder="e.g., 5"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave}>
          Save Metadata
        </Button>
      </div>
    </div>
  );
};

// ============================================
// Pricing Editor
// ============================================
const PricingEditor: React.FC<{
  pricing: CoursePricing;
  onSave: (pricing: CoursePricing) => void;
  productType?: ProductType;
  teachingMaterialsPrice?: number;
}> = ({ pricing, onSave, productType, teachingMaterialsPrice }) => {
  const [price, setPrice] = useState(pricing.price);
  const [currency, setCurrency] = useState(pricing.currency);
  const [isFree, setIsFree] = useState(pricing.isFree);
  const [hasDiscount, setHasDiscount] = useState(!!pricing.discountPrice);
  const [discountPrice, setDiscountPrice] = useState(pricing.discountPrice || 0);
  const [discountStart, setDiscountStart] = useState(pricing.discountStartDate?.split('T')[0] || '');
  const [discountEnd, setDiscountEnd] = useState(pricing.discountEndDate?.split('T')[0] || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');

    if (price < 0) {
      setError('Price must be >= 0');
      return;
    }

    if (hasDiscount && discountPrice > price) {
      setError('Discount price cannot exceed base price');
      return;
    }

    if (hasDiscount && discountStart && discountEnd && new Date(discountStart) >= new Date(discountEnd)) {
      setError('Discount end date must be after start date');
      return;
    }

    onSave({
      price: isFree ? 0 : price,
      currency,
      isFree,
      discountPrice: hasDiscount ? discountPrice : undefined,
      discountStartDate: hasDiscount && discountStart ? `${discountStart}T00:00:00Z` : undefined,
      discountEndDate: hasDiscount && discountEnd ? `${discountEnd}T23:59:59Z` : undefined,
    });
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 p-8 space-y-6">
      {/* Free Toggle */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm font-bold text-gray-700">This course is FREE</span>
        </label>
      </div>

      {!isFree && (
        <>
          {/* Base Price */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">
                Base Price
              </label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <Select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              options={[
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'USD', label: 'USD ($)' },
                { value: 'GBP', label: 'GBP (£)' },
              ]}
            />
            <div className="flex items-end">
              <div className="bg-gray-50 rounded-2xl p-4 w-full text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Display Price</p>
                <p className="text-2xl font-black text-gray-900">
                  {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'}
                  {hasDiscount ? discountPrice : price}
                </p>
              </div>
            </div>
          </div>

          {/* Discount Toggle */}
          <div className="border-t border-gray-100 pt-6">
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={hasDiscount}
                onChange={(e) => setHasDiscount(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-bold text-gray-700">Enable discount pricing</span>
            </label>

            {hasDiscount && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-purple-50/50 rounded-2xl p-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">
                    Discount Price
                  </label>
                  <div className="relative">
                    <Percent size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={discountPrice}
                      onChange={(e) => setDiscountPrice(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      min="0"
                      max={price}
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">
                    Start Date
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={discountStart}
                      onChange={(e) => setDiscountStart(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">
                    End Date
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={discountEnd}
                      onChange={(e) => setDiscountEnd(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {error && (
        <div className="flex items-center gap-2 text-pink-600 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave}>
          Save Pricing
        </Button>
      </div>
    </div>
  );
};

// ============================================
// Syllabus Editor - For editing syllabus page content
// ============================================
interface SyllabusUnit {
  title: string;
  topics: string[];
}

interface SyllabusContent {
  learningOutcomes?: string[];
  whatYoullFind?: string[];
  targetAudience?: string[];
  units?: SyllabusUnit[];
}

const SyllabusEditor: React.FC<{
  course: Course;
  onSave: (syllabusContent: SyllabusContent) => void;
}> = ({ course, onSave }) => {
  // Initialize from course data or empty
  const initialContent = course.syllabusContent || {
    learningOutcomes: course.learningOutcomes || [],
    whatYoullFind: [],
    targetAudience: [],
    units: []
  };
  
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>(initialContent.learningOutcomes || []);
  const [whatYoullFind, setWhatYoullFind] = useState<string[]>(initialContent.whatYoullFind || []);
  const [targetAudience, setTargetAudience] = useState<string[]>(initialContent.targetAudience || []);
  const [units, setUnits] = useState<SyllabusUnit[]>(initialContent.units || []);
  
  // New item inputs
  const [newOutcome, setNewOutcome] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [newAudience, setNewAudience] = useState('');
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [editingUnitIndex, setEditingUnitIndex] = useState<number | null>(null);
  const [newTopic, setNewTopic] = useState('');
  
  // Expanded sections
  const [expandedSection, setExpandedSection] = useState<string | null>('outcomes');
  
  const addItem = (list: string[], setList: (items: string[]) => void, newItem: string, setNewItem: (s: string) => void) => {
    if (newItem.trim()) {
      setList([...list, newItem.trim()]);
      setNewItem('');
    }
  };
  
  const removeItem = (list: string[], setList: (items: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };
  
  const addUnit = () => {
    if (newUnitTitle.trim()) {
      setUnits([...units, { title: newUnitTitle.trim(), topics: [] }]);
      setNewUnitTitle('');
    }
  };
  
  const removeUnit = (index: number) => {
    setUnits(units.filter((_, i) => i !== index));
    if (editingUnitIndex === index) setEditingUnitIndex(null);
  };
  
  const addTopicToUnit = (unitIndex: number) => {
    if (newTopic.trim()) {
      const updated = [...units];
      updated[unitIndex] = {
        ...updated[unitIndex],
        topics: [...updated[unitIndex].topics, newTopic.trim()]
      };
      setUnits(updated);
      setNewTopic('');
    }
  };
  
  const removeTopicFromUnit = (unitIndex: number, topicIndex: number) => {
    const updated = [...units];
    updated[unitIndex] = {
      ...updated[unitIndex],
      topics: updated[unitIndex].topics.filter((_, i) => i !== topicIndex)
    };
    setUnits(updated);
  };
  
  const handleSave = () => {
    onSave({
      learningOutcomes: learningOutcomes.length > 0 ? learningOutcomes : undefined,
      whatYoullFind: whatYoullFind.length > 0 ? whatYoullFind : undefined,
      targetAudience: targetAudience.length > 0 ? targetAudience : undefined,
      units: units.length > 0 ? units : undefined
    });
  };
  
  const SectionHeader: React.FC<{ id: string; title: string; count: number; icon: React.ReactNode }> = ({ id, title, count, icon }) => (
    <button
      onClick={() => setExpandedSection(expandedSection === id ? null : id)}
      className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
          {icon}
        </div>
        <span className="font-bold text-gray-700">{title}</span>
        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      {expandedSection === id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
  );

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 p-8 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Syllabus Page Content</h2>
          <p className="text-xs text-gray-400 mt-1">Configure what appears on the public syllabus/detail page for this course</p>
        </div>
        <Button variant="secondary" size="sm" icon={Eye} onClick={() => window.location.hash = `#syllabus-${course.id}`}>
          Preview
        </Button>
      </div>
      
      {/* Learning Outcomes Section */}
      <div className="space-y-3">
        <SectionHeader id="outcomes" title="Learning Outcomes" count={learningOutcomes.length} icon={<CheckCircle size={16} />} />
        {expandedSection === 'outcomes' && (
          <div className="pl-4 space-y-3 animate-reveal">
            <p className="text-xs text-gray-400">What students will achieve by completing this course</p>
            <div className="space-y-2">
              {learningOutcomes.map((outcome, i) => (
                <div key={i} className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-xl">
                  <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                  <span className="text-sm flex-1">{outcome}</span>
                  <button onClick={() => removeItem(learningOutcomes, setLearningOutcomes, i)} className="text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newOutcome}
                onChange={(e) => setNewOutcome(e.target.value)}
                placeholder="Add a learning outcome..."
                onKeyDown={(e) => e.key === 'Enter' && addItem(learningOutcomes, setLearningOutcomes, newOutcome, setNewOutcome)}
              />
              <Button variant="secondary" size="sm" onClick={() => addItem(learningOutcomes, setLearningOutcomes, newOutcome, setNewOutcome)}>Add</Button>
            </div>
          </div>
        )}
      </div>
      
      {/* What You'll Find Section */}
      <div className="space-y-3">
        <SectionHeader id="features" title="What You'll Find" count={whatYoullFind.length} icon={<Sparkles size={16} />} />
        {expandedSection === 'features' && (
          <div className="pl-4 space-y-3 animate-reveal">
            <p className="text-xs text-gray-400">Features and materials included in this course</p>
            <div className="space-y-2">
              {whatYoullFind.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-xl">
                  <Sparkles size={14} className="text-blue-500 flex-shrink-0" />
                  <span className="text-sm flex-1">{feature}</span>
                  <button onClick={() => removeItem(whatYoullFind, setWhatYoullFind, i)} className="text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add a feature..."
                onKeyDown={(e) => e.key === 'Enter' && addItem(whatYoullFind, setWhatYoullFind, newFeature, setNewFeature)}
              />
              <Button variant="secondary" size="sm" onClick={() => addItem(whatYoullFind, setWhatYoullFind, newFeature, setNewFeature)}>Add</Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Target Audience Section */}
      <div className="space-y-3">
        <SectionHeader id="audience" title="Target Audience" count={targetAudience.length} icon={<Users size={16} />} />
        {expandedSection === 'audience' && (
          <div className="pl-4 space-y-3 animate-reveal">
            <p className="text-xs text-gray-400">Who this course is designed for</p>
            <div className="space-y-2">
              {targetAudience.map((audience, i) => (
                <div key={i} className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-xl">
                  <Users size={14} className="text-purple-500 flex-shrink-0" />
                  <span className="text-sm flex-1">{audience}</span>
                  <button onClick={() => removeItem(targetAudience, setTargetAudience, i)} className="text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAudience}
                onChange={(e) => setNewAudience(e.target.value)}
                placeholder="Add target audience..."
                onKeyDown={(e) => e.key === 'Enter' && addItem(targetAudience, setTargetAudience, newAudience, setNewAudience)}
              />
              <Button variant="secondary" size="sm" onClick={() => addItem(targetAudience, setTargetAudience, newAudience, setNewAudience)}>Add</Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Course Units/Curriculum Section */}
      <div className="space-y-3">
        <SectionHeader id="units" title="Course Units (Curriculum)" count={units.length} icon={<BookOpen size={16} />} />
        {expandedSection === 'units' && (
          <div className="pl-4 space-y-4 animate-reveal">
            <p className="text-xs text-gray-400">The curriculum structure shown on the syllabus page</p>
            
            {/* Existing Units */}
            <div className="space-y-3">
              {units.map((unit, unitIndex) => (
                <div key={unitIndex} className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">
                        {unitIndex + 1}
                      </span>
                      <span className="font-bold text-gray-700">{unit.title}</span>
                      <span className="text-xs text-gray-400">({unit.topics.length} topics)</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingUnitIndex(editingUnitIndex === unitIndex ? null : unitIndex)}
                        className="p-1.5 hover:bg-purple-100 rounded-lg text-gray-400 hover:text-purple-600"
                      >
                        {editingUnitIndex === unitIndex ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button
                        onClick={() => removeUnit(unitIndex)}
                        className="p-1.5 hover:bg-pink-100 rounded-lg text-gray-400 hover:text-pink-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Topics (expanded) */}
                  {editingUnitIndex === unitIndex && (
                    <div className="pl-11 space-y-2">
                      {unit.topics.map((topic, topicIndex) => (
                        <div key={topicIndex} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                          <span className="flex-1">{topic}</span>
                          <button onClick={() => removeTopicFromUnit(unitIndex, topicIndex)} className="text-gray-400 hover:text-red-500">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          placeholder="Add topic..."
                          onKeyDown={(e) => e.key === 'Enter' && addTopicToUnit(unitIndex)}
                        />
                        <Button variant="secondary" size="sm" onClick={() => addTopicToUnit(unitIndex)}>Add</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Add New Unit */}
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <Input
                value={newUnitTitle}
                onChange={(e) => setNewUnitTitle(e.target.value)}
                placeholder="New unit title..."
                onKeyDown={(e) => e.key === 'Enter' && addUnit()}
              />
              <Button variant="primary" size="sm" icon={Plus} onClick={addUnit}>Add Unit</Button>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <Button variant="primary" onClick={handleSave}>
          Save Syllabus Content
        </Button>
      </div>
    </div>
  );
};

// ============================================
// Module Card
// ============================================
const ModuleCard: React.FC<{
  module: Module;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
  onEditVideo: (lesson: Lesson) => void;
  onAddHomework: () => void;
  onEditHomework: (homework: Homework) => void;
  onDeleteHomework: (homework: Homework) => void;
}> = ({
  module, index, isExpanded, onToggleExpand, onEdit, onDelete,
  onAddLesson, onEditLesson, onDeleteLesson, onEditVideo,
  onAddHomework, onEditHomework, onDeleteHomework
}) => {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
      {/* Module Header */}
      <div 
        className="flex items-center gap-4 p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="p-2 text-gray-400 cursor-grab">
          <GripVertical size={16} />
        </div>
        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-black text-sm">
          {index + 1}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{module.title}</h3>
          <p className="text-xs text-gray-400">
            {module.lessons.length} lessons • {module.homework.length} homework
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 hover:bg-purple-50 rounded-xl text-gray-400 hover:text-purple-600 transition-all"
          >
            <FileText size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 hover:bg-pink-50 rounded-xl text-gray-400 hover:text-pink-600 transition-all"
          >
            <Trash2 size={16} />
          </button>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Module Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-6 space-y-4 animate-reveal">
          {/* Lessons */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Lessons</span>
              <button
                onClick={onAddLesson}
                className="text-[10px] font-black text-purple-600 uppercase tracking-widest hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Add
              </button>
            </div>
            <div className="space-y-2">
              {module.lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group">
                  <div className="p-1 text-gray-300">
                    <GripVertical size={12} />
                  </div>
                  {lesson.type === 'video' ? (
                    <Play size={14} className="text-purple-500" />
                  ) : (
                    <FileText size={14} className="text-blue-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{lesson.title}</p>
                    <p className="text-[10px] text-gray-400">{lesson.duration} • {lesson.type}</p>
                  </div>
                  {lesson.type === 'video' && (
                    <button
                      onClick={() => onEditVideo(lesson)}
                      className={`p-1.5 rounded-lg transition-all ${
                        lesson.videoLinks?.primaryVideoUrl
                          ? 'text-green-500 bg-green-50 hover:bg-green-100'
                          : 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                      }`}
                      title={lesson.videoLinks?.primaryVideoUrl ? 'Edit video link' : 'Add video link'}
                    >
                      <Link size={12} />
                    </button>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditLesson(lesson)}
                      className="p-1.5 hover:bg-purple-100 rounded-lg text-gray-400 hover:text-purple-600"
                    >
                      <FileText size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteLesson(lesson)}
                      className="p-1.5 hover:bg-pink-100 rounded-lg text-gray-400 hover:text-pink-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Homework */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Homework</span>
              <button
                onClick={onAddHomework}
                className="text-[10px] font-black text-purple-600 uppercase tracking-widest hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Add
              </button>
            </div>
            <div className="space-y-2">
              {module.homework.map((hw) => (
                <div key={hw.id} className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl group">
                  <div className="p-1 text-gray-300">
                    <GripVertical size={12} />
                  </div>
                  <FileText size={14} className="text-amber-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{hw.title}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditHomework(hw)}
                      className="p-1.5 hover:bg-amber-100 rounded-lg text-gray-400 hover:text-amber-600"
                    >
                      <FileText size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteHomework(hw)}
                      className="p-1.5 hover:bg-pink-100 rounded-lg text-gray-400 hover:text-pink-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {module.homework.length === 0 && (
                <p className="text-xs text-gray-400 italic">No homework assigned</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// Module Modal
// ============================================
const ModuleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string }) => void;
  module: Module | null;
}> = ({ isOpen, onClose, onSave, module }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (module) {
      setTitle(module.title);
      setDescription(module.description || '');
    } else {
      setTitle('');
      setDescription('');
    }
  }, [module, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={module ? 'Edit Module' : 'Add Module'} size="md">
      <div className="space-y-4">
        <Input
          label="Module Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Foundations of Being"
        />
        <Textarea
          label="Description (Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What students will learn in this module..."
        />
        <div className="flex gap-3 justify-end pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave({ title, description })} disabled={!title.trim()}>
            {module ? 'Save Changes' : 'Add Module'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================
// Lesson Modal - Enhanced with Video & PDF
// ============================================
const QuestionEditor: React.FC<{
  question: QuizQuestion;
  onSave: (q: QuizQuestion) => void;
  onCancel: () => void;
}> = ({ question, onSave, onCancel }) => {
  const [q, setQ] = useState<QuizQuestion>(question);

  const addOption = () => {
    if (!q.options) setQ({ ...q, options: [] });
    const newOption: QuizOption = {
      id: Math.random().toString(36).substr(2, 9),
      text: '',
      isCorrect: false
    };
    setQ(prev => ({ ...prev, options: [...(prev.options || []), newOption] }));
  };

  const updateOption = (id: string, updates: Partial<QuizOption>) => {
    setQ(prev => ({
      ...prev,
      options: prev.options?.map(o => o.id === id ? { ...o, ...updates } : o)
    }));
  };

  const deleteOption = (id: string) => {
    setQ(prev => ({
      ...prev,
      options: prev.options?.filter(o => o.id !== id)
    }));
  };

  const toggleCorrect = (id: string) => {
    if (q.type === 'multiple-choice') {
      // Allow multiple correct answers? Usually specialized. Let's assume single for now or multiple.
      // If single, uncheck others.
      // User requested "Multiple Choice".
      setQ(prev => ({
        ...prev,
        options: prev.options?.map(o => ({ ...o, isCorrect: o.id === id ? !o.isCorrect : false }))
      }));
    } else {
       updateOption(id, { isCorrect: !q.options?.find(o => o.id === id)?.isCorrect });
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-200">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-sm">Edit Question</h4>
      </div>
      
      <div className="space-y-3">
        <Select
          label="Question Type"
          value={q.type}
          onChange={(e) => setQ({ ...q, type: e.target.value as QuizQuestionType })}
          options={[
            { value: 'multiple-choice', label: 'Multiple Choice' },
            { value: 'true-false', label: 'True / False' },
            { value: 'photo', label: 'Photo Analysis' },
          ]}
        />

        <Textarea
          label="Question Text"
          value={q.question}
          onChange={(e) => setQ({ ...q, question: e.target.value })}
          placeholder="Enter your question here..."
        />

        {q.type === 'photo' && (
           <Input
             label="Image URL"
             value={q.imageUrl || ''}
             onChange={(e) => setQ({ ...q, imageUrl: e.target.value })}
             placeholder="https://example.com/image.jpg"
           />
        )}
        
        {/* Options Editor */}
        <div className="space-y-2">
            <div className="flex justify-between items-end">
               <label className="text-xs font-bold uppercase text-gray-500">Answer Options</label>
               {q.type !== 'true-false' && (
                 <Button size="sm" variant="secondary" onClick={addOption}><Plus size={12} className="mr-1"/> Add Option</Button>
               )}
            </div>
            
            {q.type === 'true-false' ? (
               <div className="flex gap-4">
                  <button 
                    onClick={() => setQ({...q, correctAnswer: true})}
                    className={`flex-1 py-3 rounded-lg border-2 font-bold ${q.correctAnswer === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'}`}
                  >
                    True
                  </button>
                  <button 
                    onClick={() => setQ({...q, correctAnswer: false})}
                    className={`flex-1 py-3 rounded-lg border-2 font-bold ${q.correctAnswer === false ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'}`}
                  >
                    False
                  </button>
               </div>
            ) : (
              <div className="space-y-2">
                {q.options?.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                     <button 
                       onClick={() => toggleCorrect(opt.id)}
                       className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${opt.isCorrect ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-300 hover:border-green-400'}`}
                       title="Mark as correct"
                     >
                       <CheckCircle size={14} fill={opt.isCorrect ? "currentColor" : "none"} />
                     </button>
                     <Input 
                       value={opt.text}
                       onChange={(e) => updateOption(opt.id, { text: e.target.value })}
                       placeholder={`Option ${idx + 1}`}
                       className="flex-1"
                     />
                     <button onClick={() => deleteOption(opt.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={14} /></button>
                  </div>
                ))}
                {(!q.options || q.options.length === 0) && <p className="text-xs text-red-400 italic">Add at least one option.</p>}
              </div>
            )}
        </div>

        <Textarea
             label="Explanation (Optional)"
             value={q.explanation || ''}
             onChange={(e) => setQ({ ...q, explanation: e.target.value })}
             placeholder="Explain why the answer is correct..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="primary" onClick={() => onSave(q)}>Done</Button>
      </div>
    </div>
  );
};

const LessonModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Lesson, 'id' | 'order'>) => void;
  lesson: Lesson | null;
}> = ({ isOpen, onClose, onSave, lesson }) => {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [type, setType] = useState<Lesson['type']>('video');
  const [content, setContent] = useState('');
  
  // Quiz fields
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [passingScore, setPassingScore] = useState(70);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Video fields
  const [primaryVideoUrl, setPrimaryVideoUrl] = useState('');
  const [fallbackVideoUrl, setFallbackVideoUrl] = useState('');
  const [videoProvider, setVideoProvider] = useState<VideoLink['videoProvider']>('youtube');
  const [videoTesting, setVideoTesting] = useState(false);
  const [videoTestResult, setVideoTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // PDF fields
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfTesting, setPdfTesting] = useState(false);
  const [pdfTestResult, setPdfTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Active tab for media
  const [mediaTab, setMediaTab] = useState<'video' | 'pdf'>('video');

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      setDuration(lesson.duration);
      setType(lesson.type);
      setContent(lesson.content || '');
      setQuizQuestions(lesson.quizQuestions || []);
      setPassingScore(lesson.passingScore || 70);
      setPrimaryVideoUrl(lesson.videoLinks?.primaryVideoUrl || '');
      setFallbackVideoUrl(lesson.videoLinks?.fallbackVideoUrl || '');
      setVideoProvider(lesson.videoLinks?.videoProvider || 'youtube');
      setPdfUrl(lesson.pdfUrl || '');
      setPdfTitle(lesson.pdfTitle || '');
    } else {
      setTitle('');
      setDuration('10m');
      setType('video');
      setContent('');
      setQuizQuestions([]);
      setPassingScore(70);
      setPrimaryVideoUrl('');
      setFallbackVideoUrl('');
      setVideoProvider('youtube');
      setPdfUrl('');
      setPdfTitle('');
    }
    setVideoTestResult(null);
    setPdfTestResult(null);
    setMediaTab('video');
    setEditingQuestionId(null);
  }, [lesson, isOpen]);

  const handleVideoUrlChange = (url: string) => {
    setPrimaryVideoUrl(url);
    setVideoTestResult(null);
    if (url) {
      const detected = videoHelpers.detectProvider(url);
      setVideoProvider(detected);
    }
  };

  const handleTestVideo = async () => {
    if (!primaryVideoUrl) return;
    if (!videoHelpers.isValidUrl(primaryVideoUrl)) {
      setVideoTestResult({ success: false, message: 'Invalid URL format' });
      return;
    }
    setVideoTesting(true);
    const result = await videoHelpers.testLink(primaryVideoUrl);
    setVideoTesting(false);
    setVideoTestResult({
      success: result.success,
      message: result.success ? 'Video URL is valid!' : (result.error || 'URL not reachable')
    });
  };

  const handleTestPdf = async () => {
    if (!pdfUrl) return;
    if (!pdfUrl.startsWith('http')) {
      setPdfTestResult({ success: false, message: 'Invalid URL format' });
      return;
    }
    setPdfTesting(true);
    // Mock PDF test
    await new Promise(r => setTimeout(r, 500));
    setPdfTesting(false);
    const isPdfUrl = pdfUrl.toLowerCase().includes('.pdf') || pdfUrl.includes('drive.google.com') || pdfUrl.includes('dropbox');
    setPdfTestResult({
      success: isPdfUrl,
      message: isPdfUrl ? 'PDF URL looks valid!' : 'URL may not be a direct PDF link'
    });
  };

  const handleAddQuestion = () => {
    const newQ: QuizQuestion = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'multiple-choice',
      question: '',
      order: quizQuestions.length + 1,
      options: []
    };
    setQuizQuestions([...quizQuestions, newQ]);
    setEditingQuestionId(newQ.id); // Auto open edit
  };

  const handleUpdateQuestion = (updatedQ: QuizQuestion) => {
    setQuizQuestions(quizQuestions.map(q => q.id === updatedQ.id ? updatedQ : q));
    setEditingQuestionId(null);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuizQuestions(quizQuestions.filter(q => q.id !== id));
  };
  
  const moveQuestion = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === quizQuestions.length - 1) return;
    
    const newQuestions = [...quizQuestions];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newQuestions[idx], newQuestions[swapIdx]] = [newQuestions[swapIdx], newQuestions[idx]];
    // Update order field
    newQuestions.forEach((q, i) => q.order = i + 1);
    setQuizQuestions(newQuestions);
  };

  const handleSave = () => {
    const videoLinks: VideoLink | undefined = type === 'video' && primaryVideoUrl ? {
      primaryVideoUrl,
      fallbackVideoUrl: fallbackVideoUrl || undefined,
      videoProvider,
      embedUrl: videoHelpers.getEmbedUrl(primaryVideoUrl, videoProvider)
    } : undefined;

    onSave({ 
      title, 
      duration, 
      type, 
      content: type === 'reading' ? content : undefined,
      videoLinks,
      pdfUrl: pdfUrl || undefined, 
      pdfTitle: pdfTitle || undefined,
      quizQuestions: type === 'quiz' ? quizQuestions : undefined,
      passingScore: type === 'quiz' ? passingScore : undefined
    });
  };

  const embedUrl = primaryVideoUrl ? videoHelpers.getEmbedUrl(primaryVideoUrl, videoProvider) : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lesson ? 'Edit Lesson' : 'Add Lesson'} size="lg">
      <div className="space-y-5">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Lesson Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Unit 1: Subject Pronouns"
            />
          </div>
          <Input
            label="Duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g., 15m"
          />
        </div>

        <Select
          label="Lesson Type"
          value={type}
          onChange={(e) => setType(e.target.value as Lesson['type'])}
          options={[
            { value: 'video', label: '🎬 Video Lesson' },
            { value: 'reading', label: '📖 Reading Material' },
            { value: 'quiz', label: '✏️ Quiz' },
          ]}
        />

        {type === 'quiz' && (
          <div className="space-y-4 animate-reveal">
             <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-gray-700">Quiz Questions ({quizQuestions.length})</h3>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 uppercase">Passing Score %</span>
                      <input 
                        type="number" 
                        value={passingScore} 
                        onChange={(e) => setPassingScore(Number(e.target.value))}
                        className="w-16 p-1 rounded border text-center text-sm"
                        min="0" max="100"
                      />
                   </div>
                   <Button size="sm" onClick={handleAddQuestion}><Plus size={14} className="mr-1"/> Add Question</Button>
                </div>
             </div>

             <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {quizQuestions.length === 0 && (
                   <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed text-gray-400 text-sm">
                      No questions added yet. Click "Add Question" to start.
                   </div>
                )}
                
                {quizQuestions.map((q, idx) => (
                   <div key={q.id}>
                      {editingQuestionId === q.id ? (
                        <QuestionEditor 
                          question={q} 
                          onSave={handleUpdateQuestion} 
                          onCancel={() => setEditingQuestionId(null)} 
                        />
                      ) : (
                        <div className="bg-white border rounded-xl p-3 flex items-center justify-between hover:border-purple-300 transition-colors shadow-sm">
                           <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                 <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{q.type}</span>
                                 <span className="text-xs text-gray-400">#{idx + 1}</span>
                              </div>
                              <p className="font-bold text-sm text-gray-800 line-clamp-1">{q.question || 'New Question'}</p>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="flex flex-col gap-1 mr-2">
                                <button onClick={() => moveQuestion(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-30"><ChevronUp size={12}/></button>
                                <button onClick={() => moveQuestion(idx, 'down')} disabled={idx === quizQuestions.length-1} className="p-1 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-30"><ChevronDown size={12}/></button>
                              </div>
                              <Button size="sm" variant="secondary" onClick={() => setEditingQuestionId(q.id)}>Edit</Button>
                              <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                           </div>
                        </div>
                      )}
                   </div>
                ))}
             </div>
          </div>
        )}

        {type === 'reading' && (
          <Textarea
            label="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write or paste your lesson content here..."
          />
        )}

        {/* Media Section - Tabbed Interface */}
        {type !== 'quiz' && (
        <div className="border-t border-gray-100 pt-5">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setMediaTab('video')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mediaTab === 'video'
                  ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                  : 'bg-gray-50 text-gray-500 border-2 border-transparent hover:bg-gray-100'
              }`}
            >
              <Play size={14} />
              Video
              {primaryVideoUrl && <CheckCircle size={12} className="text-green-500" />}
            </button>
            <button
              onClick={() => setMediaTab('pdf')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mediaTab === 'pdf'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-gray-50 text-gray-500 border-2 border-transparent hover:bg-gray-100'
              }`}
            >
              <FileText size={14} />
              PDF
              {pdfUrl && <CheckCircle size={12} className="text-green-500" />}
            </button>
          </div>

          {/* Video Tab */}
          {mediaTab === 'video' && (
            <div className="space-y-4 animate-reveal">
              <div className="bg-purple-50/50 rounded-2xl p-5 border border-purple-100">
                <div className="flex items-center gap-2 mb-4">
                  <Play size={16} className="text-purple-600" />
                  <span className="text-xs font-black uppercase tracking-widest text-purple-700">Video Settings</span>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Video URL"
                    value={primaryVideoUrl}
                    onChange={(e) => handleVideoUrlChange(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                    hint="Paste YouTube, Vimeo, or any video URL"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Provider"
                      value={videoProvider}
                      onChange={(e) => setVideoProvider(e.target.value as VideoLink['videoProvider'])}
                      options={[
                        { value: 'youtube', label: 'YouTube' },
                        { value: 'vimeo', label: 'Vimeo' },
                        { value: 'cloudflare', label: 'Cloudflare Stream' },
                        { value: 'custom', label: 'Custom / Other' },
                      ]}
                    />
                    <div className="flex items-end">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={handleTestVideo}
                        loading={videoTesting}
                        disabled={!primaryVideoUrl}
                        className="w-full"
                      >
                        <ExternalLink size={14} className="mr-2" />
                        Test Video
                      </Button>
                    </div>
                  </div>

                  {videoTestResult && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                      videoTestResult.success ? 'bg-green-50 text-green-700' : 'bg-pink-50 text-pink-700'
                    }`}>
                      {videoTestResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                      {videoTestResult.message}
                    </div>
                  )}

                  {/* Video Preview */}
                  {embedUrl && (videoProvider === 'youtube' || videoProvider === 'vimeo') && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Preview</p>
                      <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-lg">
                        <iframe
                          src={embedUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}

                  <Input
                    label="Fallback URL (Optional)"
                    value={fallbackVideoUrl}
                    onChange={(e) => setFallbackVideoUrl(e.target.value)}
                    placeholder="Alternative video URL if primary fails"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PDF Tab */}
          {mediaTab === 'pdf' && (
            <div className="space-y-4 animate-reveal">
              <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={16} className="text-blue-600" />
                  <span className="text-xs font-black uppercase tracking-widest text-blue-700">PDF Attachment</span>
                </div>

                <div className="space-y-4">
                  <Input
                    label="PDF URL"
                    value={pdfUrl}
                    onChange={(e) => { setPdfUrl(e.target.value); setPdfTestResult(null); }}
                    placeholder="https://example.com/worksheet.pdf"
                    hint="Direct link to PDF (Google Drive, Dropbox, or direct URL)"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Display Name"
                      value={pdfTitle}
                      onChange={(e) => setPdfTitle(e.target.value)}
                      placeholder="e.g., Worksheet - Pronouns"
                    />
                    <div className="flex items-end">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={handleTestPdf}
                        loading={pdfTesting}
                        disabled={!pdfUrl}
                        className="w-full"
                      >
                        <ExternalLink size={14} className="mr-2" />
                        Test PDF
                      </Button>
                    </div>
                  </div>

                  {pdfTestResult && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                      pdfTestResult.success ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {pdfTestResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                      {pdfTestResult.message}
                    </div>
                  )}

                  {/* PDF Preview Link */}
                  {pdfUrl && (
                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-blue-200">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <FileText size={24} className="text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{pdfTitle || 'PDF Document'}</p>
                        <p className="text-xs text-gray-400 truncate">{pdfUrl}</p>
                      </div>
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <ExternalLink size={12} />
                        Open
                      </a>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">
                    💡 Tip: For Google Drive, use "Anyone with link can view" sharing. For Dropbox, change dl=0 to dl=1 in the URL.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleSave} 
            disabled={!title.trim()}
          >
            {lesson ? 'Save Changes' : 'Add Lesson'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================
// Homework Modal
// ============================================
const HomeworkModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Homework, 'id' | 'order'>) => void;
  homework: Homework | null;
}> = ({ isOpen, onClose, onSave, homework }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [testingPdf, setTestingPdf] = useState(false);
  const [pdfTestResult, setPdfTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (homework) {
      setTitle(homework.title);
      setDescription(homework.description || '');
      setPdfUrl(homework.pdfUrl || '');
      setPdfTitle(homework.pdfTitle || '');
    } else {
      setTitle('');
      setDescription('');
      setPdfUrl('');
      setPdfTitle('');
    }
    setPdfTestResult(null);
  }, [homework, isOpen]);

  const handleTestPdf = () => {
    if (!pdfUrl.trim()) return;
    setTestingPdf(true);
    setPdfTestResult(null);
    
    // Basic validation - check if URL looks like a PDF or Google Drive/Dropbox link
    setTimeout(() => {
      const url = pdfUrl.toLowerCase();
      const isPdfUrl = url.includes('.pdf') || 
                       url.includes('drive.google.com') || 
                       url.includes('dropbox.com') ||
                       url.includes('docs.google.com');
      
      if (isPdfUrl) {
        setPdfTestResult({ success: true, message: 'URL looks valid! Students will be able to access this PDF.' });
      } else {
        setPdfTestResult({ success: false, message: 'URL may not be a PDF. Make sure the link points to a PDF file or cloud storage.' });
      }
      setTestingPdf(false);
    }, 500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={homework ? 'Edit Homework' : 'Add Homework'} size="md">
      <div className="space-y-4">
        <Input
          label="Homework Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Pronouns Memory Map"
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Instructions for the assignment..."
        />
        
        {/* PDF Section */}
        <div className="border-t border-gray-100 pt-4 mt-4">
          <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <FileText size={16} className="text-blue-500" />
            PDF Attachment (Optional)
          </h4>
          <div className="space-y-3">
            <Input
              label="PDF URL (Google Drive, Dropbox, or direct link)"
              value={pdfUrl}
              onChange={(e) => { setPdfUrl(e.target.value); setPdfTestResult(null); }}
              placeholder="https://drive.google.com/file/d/..."
            />
            <Input
              label="PDF Display Name"
              value={pdfTitle}
              onChange={(e) => setPdfTitle(e.target.value)}
              placeholder="e.g., Homework Worksheet"
            />
            
            {pdfUrl && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestPdf}
                  disabled={testingPdf}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {testingPdf ? (
                    <><Loader2 size={14} className="animate-spin" /> Testing...</>
                  ) : (
                    <><ExternalLink size={14} /> Test PDF Link</>
                  )}
                </button>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors"
                >
                  <ExternalLink size={14} /> Preview
                </a>
              </div>
            )}
            
            {pdfTestResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium ${pdfTestResult.success ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {pdfTestResult.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {pdfTestResult.message}
              </div>
            )}
            
            {/* Tips */}
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
              <p className="font-bold text-gray-600 mb-1">💡 Tips for Google Drive:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Upload your PDF to Google Drive</li>
                <li>Right-click → "Get link" → Set to "Anyone with link can view"</li>
                <li>Copy and paste the link here</li>
              </ol>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={() => onSave({ title, description, pdfUrl: pdfUrl || undefined, pdfTitle: pdfTitle || undefined })} 
            disabled={!title.trim()}
          >
            {homework ? 'Save Changes' : 'Add Homework'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================
// Video Link Modal
// ============================================
const VideoLinkModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (videoLinks: VideoLink) => void;
  videoLinks?: VideoLink;
  lessonTitle: string;
}> = ({ isOpen, onClose, onSave, videoLinks, lessonTitle }) => {
  const [primaryUrl, setPrimaryUrl] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [provider, setProvider] = useState<VideoLink['videoProvider']>('youtube');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    if (videoLinks) {
      setPrimaryUrl(videoLinks.primaryVideoUrl);
      setFallbackUrl(videoLinks.fallbackVideoUrl || '');
      setProvider(videoLinks.videoProvider);
    } else {
      setPrimaryUrl('');
      setFallbackUrl('');
      setProvider('youtube');
    }
    setTestResult(null);
    setUrlError('');
  }, [videoLinks, isOpen]);

  const handleUrlChange = (url: string) => {
    setPrimaryUrl(url);
    setUrlError('');
    setTestResult(null);
    
    if (url) {
      const detectedProvider = videoHelpers.detectProvider(url);
      setProvider(detectedProvider);
    }
  };

  const handleTest = async () => {
    if (!primaryUrl) return;
    
    if (!videoHelpers.isValidUrl(primaryUrl)) {
      setUrlError('Invalid URL format');
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    
    const result = await videoHelpers.testLink(primaryUrl);
    setTesting(false);
    
    if (result.success) {
      setTestResult({ success: true, message: 'URL is valid and reachable!' });
    } else {
      setTestResult({ success: false, message: result.error || 'URL is not reachable' });
    }
  };

  const handleSave = () => {
    if (!videoHelpers.isValidUrl(primaryUrl)) {
      setUrlError('Invalid URL format');
      return;
    }

    if (fallbackUrl && !videoHelpers.isValidUrl(fallbackUrl)) {
      setUrlError('Invalid fallback URL format');
      return;
    }

    onSave({
      primaryVideoUrl: primaryUrl,
      fallbackVideoUrl: fallbackUrl || undefined,
      videoProvider: provider,
      embedUrl: videoHelpers.getEmbedUrl(primaryUrl, provider)
    });
  };

  const embedUrl = primaryUrl ? videoHelpers.getEmbedUrl(primaryUrl, provider) : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Video Link Settings" size="lg">
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Lesson</p>
          <p className="text-sm font-bold text-gray-900">{lessonTitle}</p>
        </div>

        <Input
          label="Primary Video URL"
          value={primaryUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          error={urlError}
          hint="Paste a YouTube, Vimeo, or other video URL"
        />

        <div className="flex items-center gap-3">
          <Select
            label="Video Provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as VideoLink['videoProvider'])}
            options={[
              { value: 'youtube', label: 'YouTube' },
              { value: 'vimeo', label: 'Vimeo' },
              { value: 'cloudflare', label: 'Cloudflare Stream' },
              { value: 'custom', label: 'Custom / Other' },
            ]}
          />
          <div className="flex-shrink-0 pt-6">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleTest} 
              loading={testing}
              disabled={!primaryUrl}
            >
              Test Link
            </Button>
          </div>
        </div>

        {testResult && (
          <div className={`flex items-center gap-2 p-3 rounded-xl ${
            testResult.success ? 'bg-green-50 text-green-700' : 'bg-pink-50 text-pink-700'
          }`}>
            {testResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span className="text-sm font-medium">{testResult.message}</span>
          </div>
        )}

        {/* Video Preview */}
        {embedUrl && (provider === 'youtube' || provider === 'vimeo') && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Preview</p>
            <div className="aspect-video bg-black rounded-2xl overflow-hidden">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        <Input
          label="Fallback Video URL (Optional)"
          value={fallbackUrl}
          onChange={(e) => setFallbackUrl(e.target.value)}
          placeholder="https://..."
          hint="Alternative URL if primary fails"
        />

        <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleSave} 
            disabled={!primaryUrl || !!urlError}
          >
            Save Video Link
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CourseEditor;
