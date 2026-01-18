// ============================================
// DSA Smart Start - Complete Type Definitions
// ============================================

// ---------- User & Auth Types ----------
export type UserRole = 'student' | 'admin' | 'editor';
export type UserStatus = 'active' | 'paused' | 'deleted';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  adminNotes?: string;
}

// ---------- Course & Content Types ----------
export type CourseLevel = 'A1' | 'A2' | 'B1' | 'Kids' | 'Premium' | 'Gold';
export type VideoProvider = 'youtube' | 'vimeo' | 'cloudflare' | 'custom';
export type LessonType = 'video' | 'reading' | 'quiz';

export interface VideoLink {
  primaryVideoUrl: string;
  fallbackVideoUrl?: string;
  videoProvider: VideoProvider;
  embedUrl?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export type QuizQuestionType = 'multiple-choice' | 'true-false' | 'photo';

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  imageUrl?: string;
  options?: QuizOption[];
  correctAnswer?: boolean; // For simple boolean logic
  explanation?: string;
  order: number;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: LessonType;
  content?: string;
  videoLinks?: VideoLink;
  pdfUrl?: string;
  pdfTitle?: string;
  // Quiz specific fields
  quizQuestions?: QuizQuestion[];
  passingScore?: number;
  order: number;
}

export interface Homework {
  id: string;
  title: string;
  description?: string;
  pdfUrl?: string;
  pdfTitle?: string;
  order: number;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  lessons: Lesson[];
  homework: Homework[];
  order: number;
}

export interface CoursePricing {
  price: number;
  currency: 'EUR' | 'USD' | 'GBP';
  isFree: boolean;
  discountPrice?: number;
  discountStartDate?: string;
  discountEndDate?: string;
}

// ---------- Course Metadata for Marketing ----------
export interface CourseInstructor {
  name: string;
  title: string;
  avatarUrl?: string;
  bio?: string;
}

export interface CourseTargetAudience {
  description: string;
  points: string[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  level: CourseLevel;
  thumbnailUrl: string;
  pricing: CoursePricing;
  modules: Module[];
  isPublished: boolean;
  isDraft: boolean;
  draftData?: Partial<Course>;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
  // Extended marketing fields
  learningOutcomes?: string[];
  prerequisites?: string[];
  targetAudience?: CourseTargetAudience;
  instructor?: CourseInstructor;
  estimatedWeeklyHours?: number;
  totalStudentsEnrolled?: number;
  previewVideoUrl?: string;
}

// ---------- Enrollment & Progress Types ----------
export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  status: 'active' | 'completed' | 'revoked';
  completedAt?: string;
}

export interface Purchase {
  id: string;
  userId: string;
  courseId: string;
  amount: number;
  currency: string;
  purchasedAt: string;
  paymentMethod?: string;
  transactionId?: string;
}

export interface Progress {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;
  homeworkId?: string;
  isCompleted: boolean;
  completedAt?: string;
}

// ---------- Audit Types ----------
export type AuditAction = 
  | 'user_created'
  | 'user_paused'
  | 'user_unpaused'
  | 'user_deleted'
  | 'user_notes_updated'
  | 'course_created'
  | 'course_updated'
  | 'course_published'
  | 'course_unpublished'
  | 'pricing_updated'
  | 'video_updated'
  | 'module_added'
  | 'module_updated'
  | 'module_deleted'
  | 'lesson_added'
  | 'lesson_updated'
  | 'lesson_deleted'
  | 'homework_added'
  | 'homework_updated'
  | 'homework_deleted'
  | 'enrollment_created'
  | 'enrollment_granted'
  | 'enrollment_revoked'
  | 'purchase_created'
  | 'admin_note_updated';

export interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: 'user' | 'course' | 'module' | 'lesson' | 'homework' | 'enrollment';
  entityId: string;
  adminId: string;
  adminName: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  description: string;
  timestamp: string;
}

// ---------- Activity Types ----------
export type ActivityType = 
  | 'lesson_completed'
  | 'homework_completed'
  | 'course_enrolled'
  | 'course_purchased'
  | 'course_completed'
  | 'admin_edit';

export interface Activity {
  id: string;
  type: ActivityType;
  userId?: string;
  userName?: string;
  courseId?: string;
  courseName?: string;
  itemId?: string;
  itemName?: string;
  adminId?: string;
  adminName?: string;
  description: string;
  timestamp: string;
}

// ---------- Analytics Types ----------
export interface KPIMetrics {
  totalUsers: number;
  activeUsers: number;
  pausedUsers: number;
  totalEnrollments: number;
  totalRevenue: number;
  avgCompletionRate?: number;
}

export interface TrendData {
  date?: string;
  value: number;
  isPositive: boolean;
}

export interface AnalyticsTrends {
  users: TrendData;
  activeUsers: TrendData;
  enrollments: TrendData;
  revenue: TrendData;
}

// ---------- API Response Types ----------
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---------- Filter & Search Types ----------
export interface UserFilters {
  search?: string;
  status?: UserStatus | 'all';
  role?: UserRole | 'all';
  courseId?: string;
}

export interface CourseFilters {
  search?: string;
  level?: CourseLevel | 'all';
  isPublished?: boolean | 'all';
  published?: boolean;
}

// ---------- User Detail Types ----------
export interface UserDetail extends User {
  enrollments: (Enrollment & { course: Course })[];
  purchases: Purchase[];
  progress: { courseId: string; percentage: number }[];
  totalSpent: number;
}
