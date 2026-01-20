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
// CourseLevel allows predefined levels or custom category names
export type CourseLevel = 
  | 'A1' | 'A2' | 'B1' | 'B2'  // Adults & Teens levels
  | 'kids-basic' | 'kids-medium' | 'kids-advanced'  // Kids levels
  | 'premium' | 'golden'  // Service programs
  | string;  // Allow custom categories

// Product type distinguishes e-books, interactive courses, and services
export type ProductType = 'ebook' | 'learndash' | 'service';

// Target audience for the product
export type TargetAudience = 'adults_teens' | 'kids';

// Content format determines how the content is delivered
export type ContentFormat = 'pdf' | 'interactive' | 'live' | 'hybrid';

export type VideoProvider = 'youtube' | 'vimeo' | 'cloudflare' | 'custom';
export type LessonType = 'video' | 'reading' | 'quiz' | 'live' | 'one-to-one';

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

// ---------- Wizard State Types ----------
export interface WizardStepsCompleted {
  metadata: boolean;
  pricing: boolean;
  syllabus: boolean;
  content: boolean;
}

export type WizardStep = 1 | 2 | 3 | 4;

export type PaymentProvider = 'paypal' | 'raiffeisen';

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
  // ---------- Wizard state fields ----------
  wizardStep: WizardStep;  // Current step (1-4)
  stepsCompleted: WizardStepsCompleted;  // Which steps are done
  wizardCompleted: boolean;  // True when all 4 steps complete
  // ---------- Payment integration ----------
  paymentProductId?: string;  // Product ID from PayPal/Raiffeisen
  paymentProvider?: PaymentProvider;  // Which payment provider
  // ---------- NEW: Catalog fields ----------
  productType: ProductType;  // 'ebook' | 'learndash' | 'service'
  targetAudience: TargetAudience;  // 'adults_teens' | 'kids'
  contentFormat: ContentFormat;  // 'pdf' | 'interactive' | 'live' | 'hybrid'
  teachingMaterialsPrice?: number;  // €50 for services
  teachingMaterialsIncluded: boolean;  // User's choice at checkout
  relatedMaterialsId?: string;  // Links service to its materials product
  // ---------- E-book specific fields ----------
  ebookPdfUrl?: string;  // URL to the PDF file (Supabase Storage or external)
  ebookPageCount?: number;  // Number of pages in the e-book
  // ---------- Footer visibility fields ----------
  showInFooter?: boolean;  // Whether to show this product in the footer
  footerOrder?: number;  // Order in footer (lower = first)
  // ---------- Extended marketing fields ----------
  learningOutcomes?: string[];
  prerequisites?: string[];
  targetAudienceInfo?: CourseTargetAudience;
  instructor?: CourseInstructor;
  estimatedWeeklyHours?: number;
  totalStudentsEnrolled?: number;
  previewVideoUrl?: string;
  // ---------- Syllabus content for dynamic pages ----------
  syllabusContent?: {
    learningOutcomes?: string[];
    whatYoullFind?: string[];
    targetAudience?: string[];
    units?: Array<{
      title: string;
      topics: string[];
    }>;
  };
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

export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Purchase {
  id: string;
  userId: string;
  courseId: string;
  amount: number;
  originalAmount?: number;
  discountAmount?: number;
  discountCodeId?: string;
  currency: string;
  purchasedAt: string;
  paymentMethod?: string;
  transactionId?: string;
  // New fields for webhook verification flow
  status: PurchaseStatus;
  webhookVerified: boolean;
  webhookVerifiedAt?: string;
  paymentProviderResponse?: Record<string, unknown>;
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
  | 'course_deleted'
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
  | 'purchase_confirmed'
  | 'purchase_failed'
  | 'purchase_manual_confirm'
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
  productType?: ProductType | 'all';
  targetAudience?: TargetAudience | 'all';
  contentFormat?: ContentFormat | 'all';
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

// ---------- Category Types ----------
export type CatalogType = 'level' | 'program' | 'section';

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  catalogType: CatalogType;  // 'level' for A1/A2/etc, 'program' for Premium/Golden, 'section' for Products/Services
  createdAt: string;
  updatedAt: string;
}

// ---------- Cart & Checkout Types ----------
export interface CartItem {
  courseId: string;
  course: Course;
  includeTeachingMaterials: boolean;  // For services with optional materials
}

export interface CheckoutSummary {
  items: CartItem[];
  subtotal: number;
  teachingMaterialsTotal: number;
  discountAmount: number;
  discountCode?: string;
  total: number;
  currency: 'EUR' | 'USD' | 'GBP';
}

// ---------- Catalog Filter Types ----------
export interface CatalogFilters {
  search?: string;
  productType?: ProductType | 'all';
  targetAudience?: TargetAudience | 'all';
  level?: CourseLevel | 'all';
  priceRange?: { min: number; max: number };
  isPublished?: boolean;
}
