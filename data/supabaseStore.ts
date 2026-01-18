// ============================================
// DSA Smart Start - Supabase Data Store
// Replaces localStorage-based adminStore
// ============================================

import { supabase } from '../lib/supabase';
import type { 
  User, Course, Enrollment, Purchase, AuditLog, Activity,
  KPIMetrics, AnalyticsTrends, UserFilters, CourseFilters,
  PaginatedResponse, UserDetail, AuditAction, Module, Lesson, Homework,
  CoursePricing
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
      .select('*', { count: 'exact' })
      .eq('role', 'student');

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

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
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: enrollmentsData } = await (supabase as any)
      .from('enrollments')
      .select('*, courses(*)')
      .eq('user_id', id);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: purchasesData } = await (supabase as any)
      .from('purchases')
      .select('*')
      .eq('user_id', id);

    const totalSpent = (purchasesData || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    return {
      ...toCamelCase<User>(userData),
      enrollments: (enrollmentsData || []).map((e: Record<string, unknown>) => toCamelCase<Enrollment>(e)),
      purchases: (purchasesData || []).map((p: Record<string, unknown>) => toCamelCase<Purchase>(p)),
      progress: [],
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

  revokeEnrollment: async (userId: string, enrollmentId: string): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('enrollments')
      .update({ status: 'revoked' })
      .eq('id', enrollmentId)
      .eq('user_id', userId);
    if (error) throw error;
    await createAuditLog('enrollment_revoked', 'enrollment', enrollmentId, 'Enrollment revoked');
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

    if (filters?.level && filters.level !== 'all') {
      query = query.eq('level', filters.level);
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
      pricing: c.pricing as CoursePricing
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
      pricing: data.pricing as CoursePricing
    };
    
    // Cache the result
    cache.coursesById.set(id, { data: course, timestamp: Date.now() });
    
    return course;
  },

  create: async (courseData: Partial<Course>): Promise<Course> => {
    clearCoursesCache(); // Invalidate cache on create
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
        is_draft: true
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create course');

    await createAuditLog('course_created', 'course', data.id, `Course "${data.title}" created`);

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing
    };
  },

  updateMetadata: async (id: string, updates: Partial<Course>): Promise<Course> => {
    clearCoursesCache(); // Invalidate cache on update
    const dbUpdates: Record<string, unknown> = { updated_at: now(), is_draft: true };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.level !== undefined) dbUpdates.level = updates.level;
    if (updates.thumbnailUrl !== undefined) dbUpdates.thumbnail_url = updates.thumbnailUrl;

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
      pricing: data.pricing
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
      .update({ is_published: true, is_draft: false, published_at: now(), updated_at: now() })
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

  // Module operations
  addModule: async (courseId: string, module: Omit<Module, 'id' | 'order'>): Promise<Course> => {
    const course = await coursesApi.getById(courseId);
    if (!course) throw new Error('Course not found');

    const newModule: Module = {
      ...module,
      id: crypto.randomUUID(),
      order: course.modules.length,
      lessons: module.lessons || [],
      homework: module.homework || []
    };

    const modules = [...course.modules, newModule];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('courses')
      .update({ modules, updated_at: now(), is_draft: true })
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog('module_added', 'module', newModule.id, `Module "${newModule.title}" added`);

    return {
      ...toCamelCase<Course>(data),
      modules: data.modules || [],
      pricing: data.pricing
    };
  },

  updateModule: async (courseId: string, moduleId: string, updates: Partial<Module>): Promise<Course> => {
    const course = await coursesApi.getById(courseId);
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
    const course = await coursesApi.getById(courseId);
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
    const course = await coursesApi.getById(courseId);
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
    const course = await coursesApi.getById(courseId);
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
    const course = await coursesApi.getById(courseId);
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
    const course = await coursesApi.getById(courseId);
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
    const course = await coursesApi.getById(courseId);
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
    const course = await coursesApi.getById(courseId);
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
  create: async (purchaseData: {
    userId: string;
    courseId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    transactionId?: string;
    discountCode?: string;
  }): Promise<Purchase> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('purchases')
      .insert({
        user_id: purchaseData.userId,
        course_id: purchaseData.courseId,
        amount: purchaseData.amount,
        currency: purchaseData.currency,
        payment_method: purchaseData.paymentMethod,
        transaction_id: purchaseData.transactionId || crypto.randomUUID(),
        discount_code: purchaseData.discountCode
      })
      .select()
      .single();

    if (error) throw error;

    // Increment discount code usage if one was applied
    if (purchaseData.discountCode) {
      try {
        // Extract just the code (remove percentage/amount text like "CODE10 (10% OFF)")
        const codeOnly = purchaseData.discountCode.split(' ')[0].trim();
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('increment_discount_usage', { code_to_update: codeOnly });
      } catch (discountError) {
        // Log but don't fail the purchase if discount increment fails
        console.error('Failed to increment discount code usage:', discountError);
      }
    }

    await enrollmentsApi.create(purchaseData.userId, purchaseData.courseId);
    await createAuditLog('purchase_created', 'enrollment', data.id, `Purchase completed for course ${purchaseData.courseId}`);

    return toCamelCase<Purchase>(data);
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
