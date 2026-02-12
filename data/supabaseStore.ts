// ============================================
// DSA Smart Start - Supabase Data Store
// Replaces localStorage-based adminStore
// ============================================

import { supabase } from '../lib/supabase';
import type { 
  User, Course, Enrollment, Purchase, AuditLog, Activity,
  KPIMetrics, AnalyticsTrends, UserFilters, CourseFilters,
  PaginatedResponse, UserDetail, AuditAction, Module, Lesson, Homework,
  CoursePricing, Category, ProductType, TargetAudience, ContentFormat,
  CatalogFilters, WizardStepsCompleted, WizardStep, PaymentProvider
} from '../types';

// ============================================
// SIMPLE IN-MEMORY CACHE
// ============================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = {
  courses: null as CacheEntry<Course[]> | null,
  coursesById: new Map<string, CacheEntry<Course>>(),
};

const CACHE_TTL = 60 * 1000; // 1 minute cache for courses

const isCacheValid = <T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> => {
  return entry != null && Date.now() - entry.timestamp < CACHE_TTL;
};

// Clear cache (call when courses are modified)
export const clearCoursesCache = () => {
  cache.courses = null;
  cache.coursesById.clear();
};

// ============================================
// HELPERS
// ============================================
const now = () => new Date().toISOString();

// Convert snake_case DB row to camelCase
const toCamelCase = <T>(obj: Record<string, unknown>): T => {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result as T;
};

// Helper function to create audit logs
const createAuditLog = async (
  action: AuditAction,
  entityType: 'user' | 'course' | 'module' | 'lesson' | 'homework' | 'enrollment',
  entityId: string,
  description: string,
  _beforeData?: unknown,
  _afterData?: unknown
): Promise<void> => {
  const user = await getCurrentUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('audit_logs').insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    admin_id: user?.id || 'system',
    admin_name: user?.name || 'System',
    description,
    timestamp: now()
  });
};

// Get current user from Supabase auth
const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return data ? toCamelCase<User>(data as Record<string, unknown>) : null;
};

// ============================================
// AUTH API
// ============================================
export const authApi = {
  getCurrentUser,
  
  login: async (email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    if (data.user) {
      const user = await getCurrentUser();
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('users')
          .update({ last_activity_at: now() })
          .eq('id', data.user.id);
        return { success: true, user };
      }
    }
    
    return { success: false, error: 'User not found' };
  },

  logout: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  isAdmin: async (): Promise<boolean> => {
    const user = await getCurrentUser();
    return user?.role === 'admin';
  },

  isEditor: async (): Promise<boolean> => {
    const user = await getCurrentUser();
    return user?.role === 'admin' || user?.role === 'editor';
  },

  canAccessAdmin: async (): Promise<boolean> => {
    const user = await getCurrentUser();
    return user?.role === 'admin' || user?.role === 'editor';
  },

  /**
   * Create a guest user account for checkout
   * Uses magic link for easy first login, then prompts to set password
   * Returns the user ID to use for purchases
   */
  createGuestCheckout: async (email: string, name: string): Promise<{ success: boolean; userId?: string; error?: string; isExistingUser?: boolean }> => {
    try {
      // First check if user already exists in our users table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingUser } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        // User exists - send magic link so they can complete purchase easily
        const { error: magicLinkError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}`,
            shouldCreateUser: false // Don't create new user, just send login link
          }
        });

        if (magicLinkError) {
          console.error('Magic link error for existing user:', magicLinkError);
          return { 
            success: false, 
            error: 'An account with this email already exists. Please log in to complete your purchase.',
            isExistingUser: true
          };
        }

        // Return success with existing user ID - they'll get a magic link email
        return { 
          success: true, 
          userId: existingUser.id,
          isExistingUser: true
        };
      }

      // Generate a secure random password (user will set their own via prompt after magic link login)
      const tempPassword = crypto.randomUUID() + '!' + Math.random().toString(36).substring(2);
      
      // Create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: { name },
          // Don't send confirmation email - we'll send magic link instead
          emailRedirectTo: `${window.location.origin}`
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create account' };
      }

      const userId = authData.user.id;

      // Create user profile in users table with guest checkout flags
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = await (supabase as any)
        .from('users')
        .insert({
          id: userId,
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          role: 'student',
          status: 'active',
          created_via_guest_checkout: true,
          password_set: false, // Will be set to true when user sets their password
          created_at: now(),
          updated_at: now(),
          last_activity_at: now()
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Continue anyway - auth user was created
      }

      // Send magic link email for easy first login
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}`,
          shouldCreateUser: false // User already created above
        }
      });

      if (magicLinkError) {
        console.error('Magic link email error:', magicLinkError);
        // Fall back to password reset if magic link fails
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`
        });
      }

      return { success: true, userId };
    } catch (err) {
      console.error('Guest checkout error:', err);
      return { success: false, error: 'Failed to create guest account' };
    }
  },

  /**
   * Find user by email (for guest checkout lookup)
   */
  findUserByEmail: async (email: string): Promise<User | null> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
      
      return data ? toCamelCase<User>(data) : null;
    } catch {
      return null;
    }
  }
};

// ============================================
// USERS API
// ============================================
export const usersApi = {
  getStudents: async (
    filters?: UserFilters,
    page = 1,
    pageSize = 10
  ): Promise<PaginatedResponse<User>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('users')
      .select('*', { count: 'exact' });

    // Filter by role (default to student, but allow 'all' to see everyone)
    if (filters?.role && filters.role !== 'all') {
      query = query.eq('role', filters.role);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    
    // Only filter by status if explicitly set (not 'all')
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    
    // Note: Don't filter out by status='deleted' - let admins see all users
    // If you want to hide deleted users, uncomment the line below:
    // query = query.or('status.neq.deleted,status.is.null');
    
    // Filter by course enrollment
    if (filters?.courseId) {
      // Get user IDs enrolled in this course
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: enrollments } = await (supabase as any)
        .from('enrollments')
        .select('user_id')
        .eq('course_id', filters.courseId)
        .eq('status', 'active');
      
      const enrolledUserIds = (enrollments || []).map((e: { user_id: string }) => e.user_id);
      
      if (enrolledUserIds.length === 0) {
        return { data: [], total: 0, page, pageSize, totalPages: 0 };
      }
      
      query = query.in('id', enrolledUserIds);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
    
    console.log(`Loaded ${data?.length || 0} users (total: ${count})`);

    const users = (data || []).map((u: Record<string, unknown>) => toCamelCase<User>(u));
    
    return {
      data: users,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  },

  getUserDetail: async (id: string): Promise<UserDetail> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userData, error: userError } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (userError) throw userError;
    
    // Fetch enrollments with nested course data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: enrollmentsData, error: enrollmentsError } = await (supabase as any)
      .from('enrollments')
      .select('*, courses(*)')
      .eq('user_id', id)
      .neq('status', 'revoked');
    
    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: purchasesData } = await (supabase as any)
      .from('purchases')
      .select('*')
      .eq('user_id', id);

    const totalSpent = (purchasesData || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    // Map enrollments with properly nested course object
    const enrollments = (enrollmentsData || [])
      .filter((e: Record<string, unknown>) => e.courses) // Only include enrollments where course exists
      .map((e: Record<string, unknown>) => {
        const courseData = e.courses as Record<string, unknown>;
        return {
          ...toCamelCase<Enrollment>(e),
          course: {
            ...toCamelCase<Course>(courseData),
            modules: (courseData.modules as Module[]) || [],
            pricing: courseData.pricing as CoursePricing
          }
        };
      });

    // Calculate progress per course (simplified - would need progress table for real implementation)
    const progress = enrollments.map(e => ({
      courseId: e.courseId,
      percentage: e.status === 'completed' ? 100 : 0
    }));

    return {
      ...toCamelCase<User>(userData),
      enrollments,
      purchases: (purchasesData || []).map((p: Record<string, unknown>) => toCamelCase<Purchase>(p)),
      progress,
      totalSpent
    } as UserDetail;
  },

  pauseUser: async (id: string): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('users')
      .update({ status: 'paused', updated_at: now() })
      .eq('id', id);
    if (error) throw error;
    await createAuditLog('user_paused', 'user', id, 'User paused');
  },

  unpauseUser: async (id: string): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('users')
      .update({ status: 'active', updated_at: now() })
      .eq('id', id);
    if (error) throw error;
    await createAuditLog('user_unpaused', 'user', id, 'User unpaused');
  },

  deleteUser: async (id: string): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('users')
      .update({ status: 'deleted', updated_at: now() })
      .eq('id', id);
    if (error) throw error;
    await createAuditLog('user_deleted', 'user', id, 'User deleted');
  },

  updateRole: async (id: string, role: 'student' | 'admin' | 'editor'): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('users')
      .update({ role, updated_at: now() })
      .eq('id', id);
    if (error) throw error;
    await createAuditLog('user_notes_updated', 'user', id, `User role changed to ${role}`);
  },

  revokeEnrollment: async (userId: string, courseId: string): Promise<void> => {
    // Find the enrollment by user_id and course_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('enrollments')
      .update({ status: 'revoked' })
      .eq('course_id', courseId)
      .eq('user_id', userId);
    if (error) throw error;
    await createAuditLog('enrollment_revoked', 'enrollment', `${userId}-${courseId}`, 'Enrollment revoked');
  },

  updateAdminNotes: async (id: string, notes: string): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('users')
      .update({ admin_notes: notes, updated_at: now() })
      .eq('id', id);
    if (error) throw error;
    await createAuditLog('user_notes_updated', 'user', id, 'Admin notes updated');
  },

  grantCourseAccess: async (userId: string, courseId: string): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('enrollments')
      .insert({ user_id: userId, course_id: courseId, status: 'active' });
    if (error) throw error;
    await createAuditLog('enrollment_granted', 'enrollment', `${userId}-${courseId}`, 'Course access granted');
  },

  getAvailableCourses: async (userId: string): Promise<Course[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: enrollments } = await (supabase as any)
      .from('enrollments')
      .select('course_id')
      .eq('user_id', userId)
      .neq('status', 'revoked');

    const enrolledCourseIds = (enrollments || []).map((e: { course_id: string }) => e.course_id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('courses')
      .select('*')
      .eq('is_published', true);

    if (enrolledCourseIds.length > 0) {
      query = query.not('id', 'in', `(${enrolledCourseIds.join(',')})`);
    }

    const { data } = await query;

    return (data || []).map((c: Record<string, unknown>) => ({
      ...toCamelCase<Course>(c),
      modules: (c.modules as Module[]) || [],
      pricing: c.pricing as CoursePricing
    }));
  },

  // Aliases for backward compatibility
  list: async (filters?: UserFilters, page = 1, pageSize = 10) => usersApi.getStudents(filters, page, pageSize),
  getById: async (id: string) => usersApi.getUserDetail(id),
  pause: async (id: string) => usersApi.pauseUser(id),
  unpause: async (id: string) => usersApi.unpauseUser(id),
  delete: async (id: string) => usersApi.deleteUser(id),
  changeRole: async (id: string, role: 'student' | 'admin' | 'editor') => usersApi.updateRole(id, role),
  revokeAccess: async (userId: string, courseId: string) => usersApi.revokeEnrollment(userId, courseId),
  updateNotes: async (id: string, notes: string) => usersApi.updateAdminNotes(id, notes),
  grantAccess: async (userId: string, courseId: string, _reason?: string) => {
    await usersApi.grantCourseAccess(userId, courseId);
    return { success: true };
  },
  getAvailableCoursesForUser: async (userId: string) => usersApi.getAvailableCourses(userId)
};

// ============================================
// COURSES API
// ============================================
export const coursesApi = {
  list: async (filters?: CourseFilters): Promise<Course[]> => {
    // Check if Supabase client is available
    if (!supabase) {
      console.warn('Supabase client not initialized - check environment variables');
      return [];
    }
    
    // Use cache for public course list (no filters or just isPublished)
    const isPublicRequest = !filters?.level || filters.level === 'all';
    const wantsPublished = filters?.published !== false && filters?.isPublished !== false;
    
    if (isPublicRequest && wantsPublished && isCacheValid(cache.courses)) {
      console.log('Returning cached courses');
      return cache.courses.data;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any).from('courses').select('*');

    // Filter by level/category
    if (filters?.level && filters.level !== 'all') {
      query = query.eq('level', filters.level);
    }
    
    // Filter by product type (ebook, learndash, service)
    if (filters?.productType && filters.productType !== 'all') {
      query = query.eq('product_type', filters.productType);
    }
    
    // Filter by target audience (adults_teens, kids)
    if (filters?.targetAudience && filters.targetAudience !== 'all') {
      query = query.eq('target_audience', filters.targetAudience);
    }
    
    // Filter by content format (pdf, interactive, live, hybrid)
    if (filters?.contentFormat && filters.contentFormat !== 'all') {
      query = query.eq('content_format', filters.contentFormat);
    }
    
    // Always explicitly filter for published courses on public pages
    // This ensures logged-in users can still see published courses
    const publishedFilter = filters?.published ?? filters?.isPublished;
    if (publishedFilter === false) {
      // Only filter for unpublished if explicitly requested (admin pages)
      query = query.eq('is_published', false);
    } else {
      // For public pages (including logged-in users), always filter for published
      query = query.eq('is_published', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching courses:', error);
      return []; // Return empty array instead of throwing for public-facing pages
    }

    const courses = (data || []).map((c: Record<string, unknown>) => ({
      ...toCamelCase<Course>(c),
      modules: (c.modules as Module[]) || [],
      pricing: c.pricing as CoursePricing,
      // Map new catalog fields
      productType: (c.product_type as ProductType) || 'learndash',
      targetAudience: (c.target_audience as TargetAudience) || 'adults_teens',
      contentFormat: (c.content_format as ContentFormat) || 'interactive',
      teachingMaterialsPrice: c.teaching_materials_price as number | undefined,
      teachingMaterialsIncluded: (c.teaching_materials_included as boolean) || false,
      relatedMaterialsId: c.related_materials_id as string | undefined
    }));
    
    // Cache the result for public requests
    if (isPublicRequest && wantsPublished) {
      cache.courses = { data: courses, timestamp: Date.now() };
    }
    
    return courses;
  },

  getById: async (id: string): Promise<Course | null> => {
    // Check if Supabase client is available
    if (!supabase) {
      console.warn('Supabase client not initialized - check environment variables');
      return null;
    }
    
    // Check cache first
    const cachedCourse = cache.coursesById.get(id);
    if (isCacheValid(cachedCourse)) {
      return cachedCourse.data;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)  // Ensure we only get published courses
      .single();

    if (error) {
      console.error('Error fetching course by id:', error);
      return null;
    }
    if (!data) return null;

    const course = {
      ...toCamelCase<Course>(data),
      modules: (data.modules as Module[]) || [],
      pricing: data.pricing as CoursePricing,
      // Map new catalog fields
      productType: (data.product_type as ProductType) || 'learndash',
      targetAudience: (data.target_audience as TargetAudience) || 'adults_teens',
      contentFormat: (data.content_format as ContentFormat) || 'interactive',
      teachingMaterialsPrice: data.teaching_materials_price as number | undefined,
      teachingMaterialsIncluded: (data.teaching_materials_included as boolean) || false,
      relatedMaterialsId: data.related_materials_id as string | undefined
    };
    
    // Cache the result
    cache.coursesById.set(id, { data: course, timestamp: Date.now() });
    
    return course;
  },

  // Admin-specific getById that can fetch unpublished/draft courses
  getByIdForAdmin: async (id: string): Promise<Course | null> => {
    if (!supabase) {
      console.warn('Supabase client not initialized');
      return null;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .select('*')
      .eq('id', id)
      .single(); // No is_published filter - admins can see all

    if (error) {
      console.error('Error fetching course by id for admin:', error);
      return null;
    }
    if (!data) return null;

    return {
      ...toCamelCase<Course>(data),
      modules: (data.modules as Module[]) || [],
      pricing: data.pricing as CoursePricing,
      // Map new catalog fields
      productType: (data.product_type as ProductType) || 'learndash',
      targetAudience: (data.target_audience as TargetAudience) || 'adults_teens',
      contentFormat: (data.content_format as ContentFormat) || 'interactive',
      teachingMaterialsPrice: data.teaching_materials_price as number | undefined,
      teachingMaterialsIncluded: (data.teaching_materials_included as boolean) || false,
      relatedMaterialsId: data.related_materials_id as string | undefined,
      // E-book fields
      ebookPdfUrl: data.ebook_pdf_url as string | undefined,
      ebookPageCount: data.ebook_page_count as number | undefined,
      // Footer visibility
      showInFooter: data.show_in_footer !== false,
      footerOrder: data.footer_order || 0,
      // Marketing fields
      learningOutcomes: data.learning_outcomes || [],
      prerequisites: data.prerequisites || [],
      targetAudienceInfo: data.target_audience_info || undefined,
      instructor: data.instructor || undefined,
      estimatedWeeklyHours: data.estimated_weekly_hours || undefined,
      previewVideoUrl: data.preview_video_url || undefined,
      totalStudentsEnrolled: data.total_students_enrolled || 0,
      syllabusContent: data.syllabus_content || undefined,
      // Wizard state fields
      wizardStep: (data.wizard_step as WizardStep) || 1,
      stepsCompleted: (data.steps_completed as WizardStepsCompleted) || { metadata: false, pricing: false, syllabus: false, content: false },
      wizardCompleted: (data.wizard_completed as boolean) || false,
      paymentProductId: data.payment_product_id as string | undefined,
      paymentProvider: (data.payment_provider as PaymentProvider) || 'paypal'
    };
  },

  // Get all courses for admin (including unpublished)
  listForAdmin: async (): Promise<Course[]> => {
    if (!supabase) {
      console.warn('Supabase client not initialized');
      return [];
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching courses for admin:', error);
      return [];
    }

    return (data || []).map((c: Record<string, unknown>) => ({
      ...toCamelCase<Course>(c),
      modules: (c.modules as Module[]) || [],
      pricing: c.pricing as CoursePricing,
      // Map new catalog fields
      productType: (c.product_type as ProductType) || 'learndash',
      targetAudience: (c.target_audience as TargetAudience) || 'adults_teens',
      contentFormat: (c.content_format as ContentFormat) || 'interactive',
      teachingMaterialsPrice: c.teaching_materials_price as number | undefined,
      teachingMaterialsIncluded: (c.teaching_materials_included as boolean) || false,
      relatedMaterialsId: c.related_materials_id as string | undefined,
      // E-book fields
      ebookPdfUrl: c.ebook_pdf_url as string | undefined,
      ebookPageCount: c.ebook_page_count as number | undefined,
      // Footer visibility
      showInFooter: c.show_in_footer !== false,
      footerOrder: (c.footer_order as number) || 0,
      // Marketing fields
      learningOutcomes: c.learning_outcomes || [],
      prerequisites: c.prerequisites || [],
      targetAudienceInfo: c.target_audience_info || undefined,
      instructor: c.instructor || undefined,
      estimatedWeeklyHours: c.estimated_weekly_hours || undefined,
      previewVideoUrl: c.preview_video_url || undefined,
      totalStudentsEnrolled: (c.total_students_enrolled as number) || 0,
      syllabusContent: c.syllabus_content || undefined,
      // Wizard state fields
      wizardStep: (c.wizard_step as WizardStep) || 1,
      stepsCompleted: (c.steps_completed as WizardStepsCompleted) || { metadata: false, pricing: false, syllabus: false, content: false },
      wizardCompleted: (c.wizard_completed as boolean) || false,
      paymentProductId: c.payment_product_id as string | undefined,
      paymentProvider: (c.payment_provider as PaymentProvider) || 'paypal'
    }));
  },

  create: async (courseData: Partial<Course>): Promise<Course> => {
    clearCoursesCache(); // Invalidate cache on create
    
    // Default wizard state for new courses
    const defaultStepsCompleted: WizardStepsCompleted = {
      metadata: false,
      pricing: false,
      syllabus: false,
      content: false
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .insert({
        title: courseData.title || 'New Course',
        description: courseData.description || '',
        level: courseData.level || 'A1',
        thumbnail_url: courseData.thumbnailUrl || '',
        pricing: courseData.pricing || { price: 0, currency: 'EUR', isFree: true },
        modules: courseData.modules || [],
        is_published: false,
        is_draft: true,
        // New catalog fields
        product_type: courseData.productType || 'learndash',
        target_audience: courseData.targetAudience || 'adults_teens',
        content_format: courseData.contentFormat || 'interactive',
        teaching_materials_price: courseData.teachingMaterialsPrice || null,
        teaching_materials_included: courseData.teachingMaterialsIncluded || false,
        related_materials_id: courseData.relatedMaterialsId || null,
        // Wizard state fields
        wizard_step: courseData.wizardStep || 1,
        steps_completed: courseData.stepsCompleted || defaultStepsCompleted,
        wizard_completed: false,
        payment_product_id: null,
        payment_provider: 'paypal'
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create course');

    await createAuditLog('course_created', 'course', data.id, `Course "${data.title}" created`);

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing,
      productType: (data.product_type as ProductType) || 'learndash',
      targetAudience: (data.target_audience as TargetAudience) || 'adults_teens',
      contentFormat: (data.content_format as ContentFormat) || 'interactive',
      teachingMaterialsPrice: data.teaching_materials_price as number | undefined,
      teachingMaterialsIncluded: (data.teaching_materials_included as boolean) || false,
      relatedMaterialsId: data.related_materials_id as string | undefined,
      // Wizard state fields
      wizardStep: (data.wizard_step as WizardStep) || 1,
      stepsCompleted: (data.steps_completed as WizardStepsCompleted) || { metadata: false, pricing: false, syllabus: false, content: false },
      wizardCompleted: (data.wizard_completed as boolean) || false,
      paymentProductId: data.payment_product_id as string | undefined,
      paymentProvider: (data.payment_provider as PaymentProvider) || 'paypal'
    };
  },

  updateMetadata: async (id: string, updates: Partial<Course>): Promise<Course> => {
    clearCoursesCache(); // Invalidate cache on update
    const dbUpdates: Record<string, unknown> = { updated_at: now(), is_draft: true };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.level !== undefined) dbUpdates.level = updates.level;
    if (updates.thumbnailUrl !== undefined) dbUpdates.thumbnail_url = updates.thumbnailUrl;
    // New catalog fields
    if (updates.productType !== undefined) dbUpdates.product_type = updates.productType;
    if (updates.targetAudience !== undefined) dbUpdates.target_audience = updates.targetAudience;
    if (updates.contentFormat !== undefined) dbUpdates.content_format = updates.contentFormat;
    if (updates.teachingMaterialsPrice !== undefined) dbUpdates.teaching_materials_price = updates.teachingMaterialsPrice;
    if (updates.teachingMaterialsIncluded !== undefined) dbUpdates.teaching_materials_included = updates.teachingMaterialsIncluded;
    if (updates.relatedMaterialsId !== undefined) dbUpdates.related_materials_id = updates.relatedMaterialsId;
    // E-book specific fields
    if ((updates as any).ebookPdfUrl !== undefined) dbUpdates.ebook_pdf_url = (updates as any).ebookPdfUrl;
    if ((updates as any).ebookPageCount !== undefined) dbUpdates.ebook_page_count = (updates as any).ebookPageCount;
    // Footer visibility fields
    if ((updates as any).showInFooter !== undefined) dbUpdates.show_in_footer = (updates as any).showInFooter;
    if ((updates as any).footerOrder !== undefined) dbUpdates.footer_order = (updates as any).footerOrder;
    // Marketing fields
    if (updates.learningOutcomes !== undefined) dbUpdates.learning_outcomes = updates.learningOutcomes;
    if (updates.prerequisites !== undefined) dbUpdates.prerequisites = updates.prerequisites;
    if ((updates as any).targetAudienceInfo !== undefined) dbUpdates.target_audience_info = (updates as any).targetAudienceInfo;
    if (updates.instructor !== undefined) dbUpdates.instructor = updates.instructor;
    if (updates.estimatedWeeklyHours !== undefined) dbUpdates.estimated_weekly_hours = updates.estimatedWeeklyHours;
    if (updates.previewVideoUrl !== undefined) dbUpdates.preview_video_url = updates.previewVideoUrl;
    // Syllabus content
    if (updates.syllabusContent !== undefined) dbUpdates.syllabus_content = updates.syllabusContent;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Course not found');

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing,
      productType: (data.product_type as ProductType) || 'learndash',
      targetAudience: (data.target_audience as TargetAudience) || 'adults_teens',
      contentFormat: (data.content_format as ContentFormat) || 'interactive',
      teachingMaterialsPrice: data.teaching_materials_price as number | undefined,
      teachingMaterialsIncluded: (data.teaching_materials_included as boolean) || false,
      relatedMaterialsId: data.related_materials_id as string | undefined,
      ebookPdfUrl: data.ebook_pdf_url as string | undefined,
      ebookPageCount: data.ebook_page_count as number | undefined,
      showInFooter: data.show_in_footer !== false,
      footerOrder: data.footer_order || 0,
      learningOutcomes: data.learning_outcomes || [],
      prerequisites: data.prerequisites || [],
      targetAudienceInfo: data.target_audience_info || undefined,
      instructor: data.instructor || undefined,
      estimatedWeeklyHours: data.estimated_weekly_hours || undefined,
      previewVideoUrl: data.preview_video_url || undefined
    };
  },

  // Update wizard state (step, completion status)
  updateWizardState: async (id: string, updates: { 
    wizardStep?: WizardStep; 
    stepsCompleted?: WizardStepsCompleted;
    wizardCompleted?: boolean;
  }): Promise<Course> => {
    clearCoursesCache();
    const dbUpdates: Record<string, unknown> = { updated_at: now() };
    
    if (updates.wizardStep !== undefined) dbUpdates.wizard_step = updates.wizardStep;
    if (updates.stepsCompleted !== undefined) dbUpdates.steps_completed = updates.stepsCompleted;
    if (updates.wizardCompleted !== undefined) dbUpdates.wizard_completed = updates.wizardCompleted;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Course not found');

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing,
      wizardStep: (data.wizard_step as WizardStep) || 1,
      stepsCompleted: (data.steps_completed as WizardStepsCompleted) || { metadata: false, pricing: false, syllabus: false, content: false },
      wizardCompleted: (data.wizard_completed as boolean) || false
    };
  },

  // Save draft and update wizard state together (for auto-save on close)
  saveDraft: async (id: string, courseData: Partial<Course>): Promise<Course> => {
    clearCoursesCache();
    
    const dbUpdates: Record<string, unknown> = { 
      updated_at: now(), 
      is_draft: true 
    };
    
    // Update all provided fields
    if (courseData.title !== undefined) dbUpdates.title = courseData.title;
    if (courseData.description !== undefined) dbUpdates.description = courseData.description;
    if (courseData.level !== undefined) dbUpdates.level = courseData.level;
    if (courseData.thumbnailUrl !== undefined) dbUpdates.thumbnail_url = courseData.thumbnailUrl;
    if (courseData.pricing !== undefined) dbUpdates.pricing = courseData.pricing;
    if (courseData.modules !== undefined) dbUpdates.modules = courseData.modules;
    if (courseData.productType !== undefined) dbUpdates.product_type = courseData.productType;
    if (courseData.targetAudience !== undefined) dbUpdates.target_audience = courseData.targetAudience;
    if (courseData.contentFormat !== undefined) dbUpdates.content_format = courseData.contentFormat;
    if (courseData.teachingMaterialsPrice !== undefined) dbUpdates.teaching_materials_price = courseData.teachingMaterialsPrice;
    if (courseData.ebookPdfUrl !== undefined) dbUpdates.ebook_pdf_url = courseData.ebookPdfUrl;
    if (courseData.ebookPageCount !== undefined) dbUpdates.ebook_page_count = courseData.ebookPageCount;
    if (courseData.showInFooter !== undefined) dbUpdates.show_in_footer = courseData.showInFooter;
    if (courseData.footerOrder !== undefined) dbUpdates.footer_order = courseData.footerOrder;
    if (courseData.syllabusContent !== undefined) dbUpdates.syllabus_content = courseData.syllabusContent;
    if (courseData.learningOutcomes !== undefined) dbUpdates.learning_outcomes = courseData.learningOutcomes;
    if (courseData.prerequisites !== undefined) dbUpdates.prerequisites = courseData.prerequisites;
    
    // Wizard state
    if (courseData.wizardStep !== undefined) dbUpdates.wizard_step = courseData.wizardStep;
    if (courseData.stepsCompleted !== undefined) dbUpdates.steps_completed = courseData.stepsCompleted;
    if (courseData.wizardCompleted !== undefined) dbUpdates.wizard_completed = courseData.wizardCompleted;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Course not found');

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing,
      productType: (data.product_type as ProductType) || 'learndash',
      targetAudience: (data.target_audience as TargetAudience) || 'adults_teens',
      contentFormat: (data.content_format as ContentFormat) || 'interactive',
      wizardStep: (data.wizard_step as WizardStep) || 1,
      stepsCompleted: (data.steps_completed as WizardStepsCompleted) || { metadata: false, pricing: false, syllabus: false, content: false },
      wizardCompleted: (data.wizard_completed as boolean) || false
    };
  },

  updatePricing: async (id: string, pricing: CoursePricing): Promise<Course> => {
    clearCoursesCache(); // Invalidate cache on update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update({ pricing, is_draft: true, updated_at: now() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Course not found');

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing
    };
  },

  publish: async (id: string): Promise<Course> => {
    clearCoursesCache(); // Invalidate cache on publish
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update({ 
        is_published: true, 
        is_draft: false, 
        published_at: now(), 
        updated_at: now(),
        // Ensure course is visible in footer and has payment provider set
        show_in_footer: true,
        payment_provider: 'paypal',  // Default to PayPal for now
        wizard_completed: true
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Course not found');

    await createAuditLog('course_published', 'course', id, `Course "${data.title}" published`);

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing
    };
  },

  unpublish: async (id: string): Promise<Course> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update({ is_published: false, updated_at: now() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Course not found');

    await createAuditLog('course_unpublished', 'course', id, `Course "${data.title}" unpublished`);

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing
    };
  },

  discardDraft: async (id: string): Promise<Course> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update({ draft_data: null, is_draft: false, updated_at: now() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Course not found');

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing
    };
  },

  delete: async (id: string): Promise<void> => {
    clearCoursesCache(); // Invalidate cache
    
    // First, get the course title for audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: course } = await (supabase as any)
      .from('courses')
      .select('title')
      .eq('id', id)
      .single();
    
    // Delete related enrollments first (foreign key constraint)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: enrollmentsError } = await (supabase as any)
      .from('enrollments')
      .delete()
      .eq('course_id', id);

    if (enrollmentsError) throw enrollmentsError;
    
    // Delete the course
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await createAuditLog('course_deleted', 'course', id, `Course "${course?.title || id}" deleted`);
  },

  // Module operations
  addModule: async (courseId: string, module: Omit<Module, 'id' | 'order'>): Promise<Course> => {
    const course = await coursesApi.getByIdForAdmin(courseId);
    if (!course) throw new Error('Course not found');

    const newModule: Module = {
      ...module,
      id: crypto.randomUUID(),
      order: course.modules.length,
      lessons: module.lessons || [],
      homework: module.homework || []
    };

    const modules = [...course.modules, newModule];
    
    // Build update object - include wizard progress update when first module is added
    const updateData: Record<string, unknown> = { 
      modules, 
      updated_at: now(), 
      is_draft: true 
    };
    
    // If this is the first module, update wizard progress to show step 4 is started
    if (course.modules.length === 0) {
      // Mark content step as started by moving wizard to step 4
      updateData.wizard_step = 4;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update(updateData)
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog('module_added', 'module', newModule.id, `Module "${newModule.title}" added`);

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing,
      wizardStep: data.wizard_step || 1,
      stepsCompleted: data.steps_completed || { metadata: false, pricing: false, syllabus: false, content: false },
      wizardCompleted: data.wizard_completed || false
    };
  },

  updateModule: async (courseId: string, moduleId: string, updates: Partial<Module>): Promise<Course> => {
    const course = await coursesApi.getByIdForAdmin(courseId);
    if (!course) throw new Error('Course not found');

    const modules = course.modules.map(m => m.id === moduleId ? { ...m, ...updates } : m);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update({ modules, updated_at: now(), is_draft: true })
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw error;
    await createAuditLog('module_updated', 'module', moduleId, 'Module updated');

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing
    };
  },

  deleteModule: async (courseId: string, moduleId: string): Promise<Course> => {
    const course = await coursesApi.getByIdForAdmin(courseId);
    if (!course) throw new Error('Course not found');

    const modules = course.modules.filter(m => m.id !== moduleId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update({ modules, updated_at: now(), is_draft: true })
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw error;
    await createAuditLog('module_deleted', 'module', moduleId, 'Module deleted');

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing
    };
  },

  // Lesson operations
  addLesson: async (courseId: string, moduleId: string, lesson: Omit<Lesson, 'id' | 'order'>): Promise<Course> => {
    const course = await coursesApi.getByIdForAdmin(courseId);
    if (!course) throw new Error('Course not found');

    const modules = course.modules.map(m => {
      if (m.id !== moduleId) return m;
      const newLesson: Lesson = { ...lesson, id: crypto.randomUUID(), order: m.lessons.length };
      return { ...m, lessons: [...m.lessons, newLesson] };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update({ modules, updated_at: now(), is_draft: true })
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw error;

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing
    };
  },

  updateLesson: async (courseId: string, moduleId: string, lessonId: string, updates: Partial<Lesson>): Promise<Course> => {
    const course = await coursesApi.getByIdForAdmin(courseId);
    if (!course) throw new Error('Course not found');

    const modules = course.modules.map(m => {
      if (m.id !== moduleId) return m;
      const lessons = m.lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l);
      return { ...m, lessons };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update({ modules, updated_at: now(), is_draft: true })
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw error;

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing
    };
  },

  deleteLesson: async (courseId: string, moduleId: string, lessonId: string): Promise<Course> => {
    const course = await coursesApi.getByIdForAdmin(courseId);
    if (!course) throw new Error('Course not found');

    const modules = course.modules.map(m => {
      if (m.id !== moduleId) return m;
      return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update({ modules, updated_at: now(), is_draft: true })
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw error;

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing
    };
  },

  // Homework operations
  addHomework: async (courseId: string, moduleId: string, homework: Omit<Homework, 'id' | 'order'>): Promise<Course> => {
    const course = await coursesApi.getByIdForAdmin(courseId);
    if (!course) throw new Error('Course not found');

    const modules = course.modules.map(m => {
      if (m.id !== moduleId) return m;
      const newHomework: Homework = { ...homework, id: crypto.randomUUID(), order: m.homework.length };
      return { ...m, homework: [...m.homework, newHomework] };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update({ modules, updated_at: now(), is_draft: true })
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw error;

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing
    };
  },

  updateHomework: async (courseId: string, moduleId: string, homeworkId: string, updates: Partial<Homework>): Promise<Course> => {
    const course = await coursesApi.getByIdForAdmin(courseId);
    if (!course) throw new Error('Course not found');

    const modules = course.modules.map(m => {
      if (m.id !== moduleId) return m;
      const homework = m.homework.map(h => h.id === homeworkId ? { ...h, ...updates } : h);
      return { ...m, homework };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update({ modules, updated_at: now(), is_draft: true })
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw error;

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing
    };
  },

  deleteHomework: async (courseId: string, moduleId: string, homeworkId: string): Promise<Course> => {
    const course = await coursesApi.getByIdForAdmin(courseId);
    if (!course) throw new Error('Course not found');

    const modules = course.modules.map(m => {
      if (m.id !== moduleId) return m;
      return { ...m, homework: m.homework.filter(h => h.id !== homeworkId) };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update({ modules, updated_at: now(), is_draft: true })
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw error;

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing
    };
  },

  getPublished: async (): Promise<Course[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((c: Record<string, unknown>) => ({
      ...toCamelCase<Course>(c),
      modules: (c.modules as Module[]) || [],
      pricing: c.pricing as CoursePricing
    }));
  },

  getEnrollmentCount: async (courseId: string): Promise<number> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase as any)
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'active');

    if (error) return 0;
    return count || 0;
  },

  getAvgProgress: async (courseId: string): Promise<number> => {
    // This would require a progress table and more complex calculation
    // For now return a placeholder
    const enrollments = await enrollmentsApi.getByCourse(courseId);
    if (enrollments.length === 0) return 0;
    
    // Calculate average - for now just return a placeholder
    return 0;
  }
};

// ============================================
// ENROLLMENTS API
// ============================================
export const enrollmentsApi = {
  getByUser: async (userId: string): Promise<Enrollment[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'revoked');

    if (error) throw error;
    return (data || []).map((e: Record<string, unknown>) => toCamelCase<Enrollment>(e));
  },

  // Optimized: Fetch enrollments with course data in a single query (avoids N+1)
  getByUserWithCourses: async (userId: string): Promise<Array<Enrollment & { course: Course }>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('enrollments')
      .select(`
        *,
        courses:course_id (*)
      `)
      .eq('user_id', userId)
      .neq('status', 'revoked');

    if (error) {
      console.error('Error fetching enrollments with courses:', error);
      throw error;
    }
    
    return (data || [])
      .filter((e: Record<string, unknown>) => e.courses && (e.courses as Record<string, unknown>).is_published)
      .map((e: Record<string, unknown>) => {
        const courseData = e.courses as Record<string, unknown>;
        return {
          ...toCamelCase<Enrollment>(e),
          course: {
            ...toCamelCase<Course>(courseData),
            modules: (courseData.modules as Module[]) || [],
            pricing: courseData.pricing as CoursePricing
          }
        };
      });
  },

  getByCourse: async (courseId: string): Promise<Enrollment[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('enrollments')
      .select('*')
      .eq('course_id', courseId);

    if (error) throw error;
    return (data || []).map((e: Record<string, unknown>) => toCamelCase<Enrollment>(e));
  },

  // Check if a user has active enrollment for a specific course
  // Used by CourseViewer to verify access before showing content
  checkEnrollment: async (userId: string, courseId: string): Promise<boolean> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('enrollments')
      .select('id, status')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error checking enrollment:', error);
      return false;
    }
    return !!data;
  },

  create: async (userId: string, courseId: string): Promise<Enrollment> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('enrollments')
      .insert({ user_id: userId, course_id: courseId, status: 'active' })
      .select()
      .single();

    if (error) throw error;
    return toCamelCase<Enrollment>(data);
  }
};

// ============================================
// PURCHASES API
// ============================================
export const purchasesApi = {
  /**
   * Create a purchase record with PENDING status
   * Enrollment is NOT created until webhook confirms payment
   */
  create: async (purchaseData: {
    userId: string;
    courseId: string;
    amount: number;
    originalAmount?: number;
    discountAmount?: number;
    discountCodeId?: string;
    currency: string;
    paymentMethod: string;
    transactionId?: string;
    discountCode?: string;
    includeTeachingMaterials?: boolean;
    teachingMaterialsAmount?: number;
    guestEmail?: string; // For tracking guest discount code uses
  }): Promise<Purchase> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('purchases')
      .insert({
        user_id: purchaseData.userId,
        course_id: purchaseData.courseId,
        amount: purchaseData.amount,
        original_amount: purchaseData.originalAmount || purchaseData.amount,
        discount_amount: purchaseData.discountAmount || 0,
        discount_code_id: purchaseData.discountCodeId || null,
        currency: purchaseData.currency,
        payment_method: purchaseData.paymentMethod,
        transaction_id: purchaseData.transactionId || crypto.randomUUID(),
        include_teaching_materials: purchaseData.includeTeachingMaterials || false,
        teaching_materials_amount: purchaseData.teachingMaterialsAmount || 0,
        status: 'pending', // Start as pending, webhook will confirm
        webhook_verified: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Record discount code usage if one was applied (for per-user tracking)
    if (purchaseData.discountCodeId) {
      try {
        // Insert into discount_code_uses table for per-user tracking
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('discount_code_uses')
          .insert({
            discount_code_id: purchaseData.discountCodeId,
            user_id: purchaseData.userId,
            guest_email: purchaseData.guestEmail?.toLowerCase() || null,
            purchase_id: data.id
          });
      } catch (useError) {
        console.warn('Failed to record discount code use:', useError);
        // Continue anyway - the primary purchase was successful
      }
    }

    // Increment discount code usage if one was applied
    if (purchaseData.discountCodeId) {
      try {
        // Use RPC to atomically increment the usage count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('increment_discount_usage_by_id', { 
          code_id: purchaseData.discountCodeId 
        });
      } catch (discountError) {
        console.warn('RPC increment failed, trying direct update:', discountError);
        // Fallback: direct SQL increment
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: currentCode } = await (supabase as any)
            .from('discount_codes')
            .select('times_used')
            .eq('id', purchaseData.discountCodeId)
            .single();
          
          if (currentCode) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('discount_codes')
              .update({ times_used: (currentCode.times_used || 0) + 1 })
              .eq('id', purchaseData.discountCodeId);
          }
        } catch (e) {
          console.error('Failed to increment discount code usage:', e);
        }
      }
    }

    // NOTE: Enrollment is NOT created here anymore
    // It will be created by the webhook when payment is confirmed via confirm_purchase_webhook()
    await createAuditLog('purchase_created', 'enrollment', data.id, `Pending purchase for course ${purchaseData.courseId} - awaiting payment confirmation`);

    return toCamelCase<Purchase>(data);
  },

  /**
   * Confirm a purchase after webhook verification
   * Creates the enrollment and marks purchase as completed
   */
  confirmPurchase: async (transactionId: string, providerResponse?: Record<string, unknown>): Promise<{ success: boolean; error?: string }> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('confirm_purchase_webhook', {
        p_transaction_id: transactionId,
        p_provider_response: providerResponse || null
      });

      if (error) {
        console.error('Webhook confirmation error:', error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Unknown error' };
      }

      await createAuditLog('purchase_confirmed', 'enrollment', data.purchase_id, `Payment confirmed for transaction ${transactionId}`);
      return { success: true };
    } catch (err) {
      console.error('Confirm purchase error:', err);
      return { success: false, error: 'Failed to confirm purchase' };
    }
  },

  /**
   * Mark a purchase as failed after webhook verification
   */
  failPurchase: async (transactionId: string, providerResponse?: Record<string, unknown>): Promise<{ success: boolean; error?: string }> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('fail_purchase_webhook', {
        p_transaction_id: transactionId,
        p_provider_response: providerResponse || null
      });

      if (error) {
        console.error('Webhook failure error:', error);
        return { success: false, error: error.message };
      }

      await createAuditLog('purchase_failed', 'enrollment', data?.purchase_id, `Payment failed for transaction ${transactionId}`);
      return { success: true };
    } catch (err) {
      console.error('Fail purchase error:', err);
      return { success: false, error: 'Failed to mark purchase as failed' };
    }
  },

  /**
   * Manually confirm a purchase (for admin or fallback)
   * Use when webhook doesn't work - creates enrollment directly
   */
  manualConfirm: async (purchaseId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get the purchase details
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: purchase, error: fetchError } = await (supabase as any)
        .from('purchases')
        .select('user_id, course_id, status, transaction_id')
        .eq('id', purchaseId)
        .single();

      if (fetchError || !purchase) {
        return { success: false, error: 'Purchase not found' };
      }

      if (purchase.status === 'completed') {
        return { success: false, error: 'Purchase already confirmed' };
      }

      // Update purchase status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('purchases')
        .update({
          status: 'completed',
          webhook_verified: true,
          webhook_verified_at: now()
        })
        .eq('id', purchaseId);

      // Create enrollment
      await enrollmentsApi.create(purchase.user_id, purchase.course_id);

      await createAuditLog('purchase_manual_confirm', 'enrollment', purchaseId, `Manual confirmation for transaction ${purchase.transaction_id}`);
      return { success: true };
    } catch (err) {
      console.error('Manual confirm error:', err);
      return { success: false, error: 'Failed to manually confirm purchase' };
    }
  },

  getByUser: async (userId: string): Promise<Purchase[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('purchases')
      .select('*')
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((p: Record<string, unknown>) => toCamelCase<Purchase>(p));
  },

  /**
   * Get pending purchases (for admin dashboard or reconciliation)
   */
  getPending: async (): Promise<Purchase[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('purchases')
      .select('*')
      .eq('status', 'pending')
      .order('purchased_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((p: Record<string, unknown>) => toCamelCase<Purchase>(p));
  }
};

// ============================================
// PROGRESS API
// ============================================
export const progressApi = {
  getByUser: async (userId: string): Promise<Array<{ lessonId: string; completed: boolean; completedAt?: string }>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('progress')
      .select('*')
      .eq('user_id', userId);

    if (error) return [];

    return (data || []).map((p: Record<string, unknown>) => ({
      lessonId: p.lesson_id as string,
      completed: p.completed as boolean,
      completedAt: p.completed_at as string | undefined
    }));
  },

  markLessonComplete: async (userId: string, lessonId: string): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('progress')
      .upsert({ user_id: userId, lesson_id: lessonId, completed: true, completed_at: now() });
  },

  getCourseProgress: async (userId: string, courseId: string): Promise<number> => {
    const course = await coursesApi.getById(courseId);
    if (!course) return 0;

    const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    if (totalLessons === 0) return 0;

    const progress = await progressApi.getByUser(userId);
    const lessonIds = course.modules.flatMap(m => m.lessons.map(l => l.id));
    const completedCount = progress.filter(p => p.completed && lessonIds.includes(p.lessonId)).length;

    return Math.round((completedCount / totalLessons) * 100);
  }
};

// ============================================
// AUDIT API
// ============================================
export const auditApi = {
  list: async (page = 1, pageSize = 15): Promise<PaginatedResponse<AuditLog>> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, count, error } = await (supabase as any)
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: (data || []).map((log: Record<string, unknown>) => toCamelCase<AuditLog>(log)),
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  }
};

// ============================================
// ANALYTICS API
// ============================================
export const analyticsApi = {
  getKPIs: async (): Promise<KPIMetrics> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    
    const { count: totalUsers } = await sb.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
    const { count: activeUsers } = await sb.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('status', 'active');
    const { count: pausedUsers } = await sb.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('status', 'paused');
    const { count: totalEnrollments } = await sb.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { data: purchases } = await sb.from('purchases').select('amount');

    const totalRevenue = (purchases || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      pausedUsers: pausedUsers || 0,
      totalEnrollments: totalEnrollments || 0,
      totalRevenue
    };
  },

  getTrends: async (): Promise<AnalyticsTrends> => {
    return {
      users: { value: 0, isPositive: true },
      activeUsers: { value: 0, isPositive: true },
      enrollments: { value: 0, isPositive: true },
      revenue: { value: 0, isPositive: true }
    };
  },

  getRecentActivity: async (limit = 10): Promise<Activity[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    return (data || []).map((log: Record<string, unknown>) => ({
      id: log.id as string,
      type: log.action as string,
      title: log.description as string,
      timestamp: log.timestamp as string,
      userId: log.admin_id as string,
      userName: log.admin_name as string
    }));
  },

  getCourseAnalytics: async () => {
    const courses = await coursesApi.list();
    return courses.map(course => ({
      courseId: course.id,
      courseTitle: course.title,
      level: course.level,
      enrollments: 0,
      activeEnrollments: 0,
      completedEnrollments: 0,
      revenue: 0,
      avgCompletionRate: 0,
      avgTimePerSession: 0,
      returnRate: 0,
      lastEnrollment: null
    }));
  },

  getRevenueBreakdown: async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: purchases } = await (supabase as any).from('purchases').select('*');
    const totalRevenue = (purchases || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    return {
      totalRevenue,
      totalTransactions: (purchases || []).length,
      byCourse: [],
      byMonth: [],
      byPaymentMethod: []
    };
  },

  getStudentEngagementMetrics: async () => {
    return {
      activeInLast7Days: 0,
      activeInLast30Days: 0,
      avgSessionDuration: 0,
      avgLessonsPerSession: '0',
      peakHours: [],
      deviceBreakdown: [],
      completionsByDayOfWeek: []
    };
  }
};

// ============================================
// VIDEO HELPERS
// ============================================
export const videoHelpers = {
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  detectProvider: (url: string): 'youtube' | 'vimeo' | 'cloudflare' | 'custom' => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('cloudflare')) return 'cloudflare';
    return 'custom';
  },

  getEmbedUrl: (url: string, _provider?: string): string => {
    const provider = _provider || videoHelpers.detectProvider(url);
    
    if (provider === 'youtube') {
      const videoId = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/)?.[1];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    
    if (provider === 'vimeo') {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    }
    
    return url;
  },

  testLink: async (url: string): Promise<{ success: boolean; error?: string }> => {
    try {
      new URL(url);
      return { success: true };
    } catch {
      return { success: false, error: 'Invalid URL format' };
    }
  }
};

// ============================================
// CATEGORIES API
// ============================================
export const categoriesApi = {
  list: async (includeInactive = false): Promise<Category[]> => {
    if (!supabase) {
      console.warn('Supabase client not initialized');
      return [];
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any).from('categories').select('*');
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    query = query.order('sort_order', { ascending: true });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
    
    return (data || []).map((row: Record<string, unknown>) => toCamelCase<Category>(row));
  },
  
  getBySlug: async (slug: string): Promise<Category | null> => {
    if (!supabase) return null;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error || !data) return null;
    return toCamelCase<Category>(data as Record<string, unknown>);
  },
  
  create: async (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> => {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('categories')
      .insert({
        slug: category.slug,
        name: category.name,
        description: category.description || null,
        color: category.color || '#6366f1',
        icon: category.icon || null,
        sort_order: category.sortOrder || 0,
        is_active: category.isActive ?? true
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return toCamelCase<Category>(data as Record<string, unknown>);
  },
  
  update: async (id: string, updates: Partial<Category>): Promise<Category> => {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const dbUpdates: Record<string, unknown> = { updated_at: now() };
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('categories')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return toCamelCase<Category>(data as Record<string, unknown>);
  },
  
  delete: async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  }
};

// ============================================
// CATALOG API - Products & Services
// ============================================
export const catalogApi = {
  // Get all products (e-books and learndash courses)
  getProducts: async (filters?: CatalogFilters): Promise<Course[]> => {
    return coursesApi.list({
      ...filters,
      productType: filters?.productType === 'all' ? undefined : filters?.productType,
      isPublished: true
    } as CourseFilters).then(courses => 
      courses.filter(c => c.productType === 'ebook' || c.productType === 'learndash')
    );
  },

  // Get all services (Premium, Golden programs)
  getServices: async (): Promise<Course[]> => {
    return coursesApi.list({ isPublished: true } as CourseFilters).then(courses => 
      courses.filter(c => c.productType === 'service')
    );
  },

  // Get products by audience
  getProductsByAudience: async (audience: TargetAudience): Promise<Course[]> => {
    return coursesApi.list({ 
      targetAudience: audience,
      isPublished: true 
    } as CourseFilters).then(courses => 
      courses.filter(c => c.productType !== 'service')
    );
  },

  // Get e-books only
  getEbooks: async (audience?: TargetAudience): Promise<Course[]> => {
    return coursesApi.list({ 
      productType: 'ebook',
      targetAudience: audience,
      isPublished: true 
    } as CourseFilters);
  },

  // Get LearnDash courses only
  getLearnDashCourses: async (audience?: TargetAudience): Promise<Course[]> => {
    return coursesApi.list({ 
      productType: 'learndash',
      targetAudience: audience,
      isPublished: true 
    } as CourseFilters);
  },

  // Get catalog summary (for admin dashboard)
  getCatalogSummary: async (): Promise<{
    totalProducts: number;
    totalServices: number;
    ebooksCount: number;
    learndashCount: number;
    adultsTeensCount: number;
    kidsCount: number;
    publishedCount: number;
    draftCount: number;
  }> => {
    const allCourses = await coursesApi.listForAdmin();
    
    return {
      totalProducts: allCourses.filter(c => c.productType !== 'service').length,
      totalServices: allCourses.filter(c => c.productType === 'service').length,
      ebooksCount: allCourses.filter(c => c.productType === 'ebook').length,
      learndashCount: allCourses.filter(c => c.productType === 'learndash').length,
      adultsTeensCount: allCourses.filter(c => c.targetAudience === 'adults_teens').length,
      kidsCount: allCourses.filter(c => c.targetAudience === 'kids').length,
      publishedCount: allCourses.filter(c => c.isPublished).length,
      draftCount: allCourses.filter(c => c.isDraft || !c.isPublished).length
    };
  },

  // Calculate cart total with optional teaching materials
  calculateCartTotal: (
    items: Array<{ course: Course; includeTeachingMaterials: boolean }>
  ): { subtotal: number; materialsTotal: number; total: number; currency: string } => {
    let subtotal = 0;
    let materialsTotal = 0;

    for (const item of items) {
      const price = item.course.pricing.discountPrice ?? item.course.pricing.price;
      subtotal += price;
      
      if (item.includeTeachingMaterials && item.course.teachingMaterialsPrice) {
        materialsTotal += item.course.teachingMaterialsPrice;
      }
    }

    return {
      subtotal,
      materialsTotal,
      total: subtotal + materialsTotal,
      currency: items[0]?.course.pricing.currency || 'EUR'
    };
  }
};
