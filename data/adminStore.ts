// ============================================
// DSA Smart Start - Admin Store & Mock API
// ============================================

import { 
  User, Course, Enrollment, Purchase, AuditLog, Activity,
  KPIMetrics, AnalyticsTrends, TrendData, UserFilters, CourseFilters,
  PaginatedResponse, UserDetail, UserStatus, AuditAction, Module, Lesson, Homework
} from '../types';
import { 
  SEED_USERS, SEED_COURSES, SEED_ENROLLMENTS, SEED_PURCHASES,
  SEED_AUDIT_LOGS, SEED_ACTIVITIES, SEED_PROGRESS
} from './seed';

// ============================================
// LOCAL STORAGE KEYS
// ============================================
const STORAGE_KEYS = {
  USERS: 'dsa_admin_users',
  COURSES: 'dsa_admin_courses',
  ENROLLMENTS: 'dsa_admin_enrollments',
  PURCHASES: 'dsa_admin_purchases',
  AUDIT_LOGS: 'dsa_admin_audit_logs',
  ACTIVITIES: 'dsa_admin_activities',
  PROGRESS: 'dsa_admin_progress',
  CURRENT_USER: 'dsa_current_user',
  DATA_VERSION: 'dsa_data_version'
};

// Data version - increment this to force re-seed when seed data changes
const CURRENT_DATA_VERSION = '2.0.0';

// ============================================
// INITIALIZATION
// ============================================
const initializeStore = () => {
  // Check if we need to re-seed due to version change
  const storedVersion = localStorage.getItem(STORAGE_KEYS.DATA_VERSION);
  const needsReseed = storedVersion !== CURRENT_DATA_VERSION;
  
  if (needsReseed) {
    // Clear old data and re-seed
    localStorage.removeItem(STORAGE_KEYS.COURSES);
    localStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
  }
  
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.COURSES)) {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(SEED_COURSES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ENROLLMENTS)) {
    localStorage.setItem(STORAGE_KEYS.ENROLLMENTS, JSON.stringify(SEED_ENROLLMENTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PURCHASES)) {
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(SEED_PURCHASES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(SEED_AUDIT_LOGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(SEED_ACTIVITIES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PROGRESS)) {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(SEED_PROGRESS));
  }
};

// Initialize on import
initializeStore();

// ============================================
// HELPERS
// ============================================
const generateId = () => Math.random().toString(36).substring(2, 11);
const now = () => new Date().toISOString();

const getItem = <T>(key: string): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [] as unknown as T;
};

const setItem = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// ============================================
// AUTH & AUTHORIZATION
// ============================================
export const authApi = {
  getCurrentUser: (): User | null => {
    const userData = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return userData ? JSON.parse(userData) : null;
  },

  login: (email: string, password: string): { success: boolean; user?: User; error?: string } => {
    const users = getItem<User[]>(STORAGE_KEYS.USERS);
    const user = users.find(u => u.email === email);
    
    // Mock password check (in real app, this would be hashed)
    if (user && user.status !== 'deleted') {
      const updatedUser = { ...user, lastActivityAt: now() };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      return { success: true, user: updatedUser };
    }
    return { success: false, error: 'Invalid credentials' };
  },

  logout: (): void => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  isAdmin: (): boolean => {
    const user = authApi.getCurrentUser();
    return user?.role === 'admin';
  },

  isEditor: (): boolean => {
    const user = authApi.getCurrentUser();
    return user?.role === 'admin' || user?.role === 'editor';
  },

  canAccessAdmin: (): boolean => {
    const user = authApi.getCurrentUser();
    return user?.role === 'admin' || user?.role === 'editor';
  }
};

// ============================================
// AUDIT LOGGING
// ============================================
const createAuditLog = (
  action: AuditAction,
  entityType: AuditLog['entityType'],
  entityId: string,
  description: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
): void => {
  const currentUser = authApi.getCurrentUser();
  if (!currentUser) return;

  const logs = getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS);
  const newLog: AuditLog = {
    id: `audit-${generateId()}`,
    action,
    entityType,
    entityId,
    adminId: currentUser.id,
    adminName: currentUser.name,
    before,
    after,
    description,
    timestamp: now()
  };
  logs.unshift(newLog);
  setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
};

const createActivity = (
  type: Activity['type'],
  description: string,
  extra: Partial<Activity> = {}
): void => {
  const activities = getItem<Activity[]>(STORAGE_KEYS.ACTIVITIES);
  const newActivity: Activity = {
    id: `activity-${generateId()}`,
    type,
    description,
    timestamp: now(),
    ...extra
  };
  activities.unshift(newActivity);
  setItem(STORAGE_KEYS.ACTIVITIES, activities);
};

// ============================================
// ANALYTICS API
// ============================================
export const analyticsApi = {
  getKPIs: (): KPIMetrics => {
    const users = getItem<User[]>(STORAGE_KEYS.USERS).filter(u => u.role === 'student');
    const enrollments = getItem<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS);
    const purchases = getItem<Purchase[]>(STORAGE_KEYS.PURCHASES);
    const progress = getItem<Record<string, boolean>>(STORAGE_KEYS.PROGRESS);
    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);

    const activeUsers = users.filter(u => u.status === 'active').length;
    const pausedUsers = users.filter(u => u.status === 'paused').length;
    const revenue = purchases.reduce((sum, p) => sum + p.amount, 0);

    // Calculate avg completion rate
    let totalProgress = 0;
    let enrollmentCount = 0;
    enrollments.forEach(e => {
      const course = courses.find(c => c.id === e.courseId);
      if (!course) return;
      
      let totalItems = 0;
      let completedItems = 0;
      course.modules.forEach(m => {
        m.lessons.forEach(l => {
          totalItems++;
          if (progress[`${e.userId}_${l.id}`]) completedItems++;
        });
        m.homework.forEach(h => {
          totalItems++;
          if (progress[`${e.userId}_${h.id}`]) completedItems++;
        });
      });
      
      if (totalItems > 0) {
        totalProgress += (completedItems / totalItems) * 100;
        enrollmentCount++;
      }
    });

    return {
      totalUsers: users.length,
      activeUsers,
      pausedUsers,
      totalEnrollments: enrollments.length,
      totalRevenue: revenue,
      avgCompletionRate: enrollmentCount > 0 ? Math.round(totalProgress / enrollmentCount) : 0
    };
  },

  getTrends: (): AnalyticsTrends => {
    // Generate mock trend data for demo
    const generateTrend = (baseValue: number): TrendData => {
      const value = Math.floor(baseValue + Math.random() * baseValue * 0.5);
      const previousValue = Math.floor(baseValue + Math.random() * baseValue * 0.3);
      return {
        value,
        isPositive: value >= previousValue
      };
    };

    return {
      users: generateTrend(100),
      activeUsers: generateTrend(75),
      enrollments: generateTrend(50),
      revenue: generateTrend(5000)
    };
  },

  getRecentActivity: (limit: number = 10): Activity[] => {
    const activities = getItem<Activity[]>(STORAGE_KEYS.ACTIVITIES);
    return activities.slice(0, limit);
  },

  // ============================================
  // COURSE-LEVEL ANALYTICS (Enhanced)
  // ============================================
  getCourseAnalytics: () => {
    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const enrollments = getItem<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS);
    const purchases = getItem<Purchase[]>(STORAGE_KEYS.PURCHASES);
    const progress = getItem<Record<string, boolean>>(STORAGE_KEYS.PROGRESS);

    return courses.filter(c => c.isPublished).map(course => {
      const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
      const coursePurchases = purchases.filter(p => p.courseId === course.id);
      const revenue = coursePurchases.reduce((sum, p) => sum + p.amount, 0);
      
      // Calculate completion rate
      let totalProgress = 0;
      courseEnrollments.forEach(e => {
        let totalItems = 0;
        let completedItems = 0;
        course.modules.forEach(m => {
          m.lessons.forEach(l => {
            totalItems++;
            if (progress[`${e.userId}_${l.id}`]) completedItems++;
          });
          m.homework.forEach(h => {
            totalItems++;
            if (progress[`${e.userId}_${h.id}`]) completedItems++;
          });
        });
        if (totalItems > 0) {
          totalProgress += (completedItems / totalItems) * 100;
        }
      });

      const completionRate = courseEnrollments.length > 0 
        ? Math.round(totalProgress / courseEnrollments.length) 
        : 0;

      // Get lesson completion data (mock engagement)
      const lessonEngagement = course.modules.flatMap(m => 
        m.lessons.map(l => {
          const completions = courseEnrollments.filter(e => 
            progress[`${e.userId}_${l.id}`]
          ).length;
          return {
            lessonId: l.id,
            lessonTitle: l.title,
            moduleTitle: m.title,
            completions,
            completionRate: courseEnrollments.length > 0 
              ? Math.round((completions / courseEnrollments.length) * 100)
              : 0,
            // Mock watch time (in minutes)
            avgWatchTime: Math.floor(Math.random() * 15) + 5,
            dropoffRate: Math.floor(Math.random() * 30) + 10
          };
        })
      );

      return {
        courseId: course.id,
        courseTitle: course.title,
        level: course.level,
        enrollments: courseEnrollments.length,
        activeEnrollments: courseEnrollments.filter(e => e.status === 'active').length,
        completedEnrollments: courseEnrollments.filter(e => e.status === 'completed').length,
        revenue,
        avgCompletionRate: completionRate,
        lessonEngagement,
        // Mock data for engagement
        avgTimePerSession: Math.floor(Math.random() * 20) + 10, // minutes
        returnRate: Math.floor(Math.random() * 30) + 60, // percentage
        lastEnrollment: courseEnrollments.length > 0 
          ? courseEnrollments.sort((a, b) => 
              new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()
            )[0].enrolledAt 
          : null
      };
    });
  },

  getRevenueBreakdown: () => {
    const purchases = getItem<Purchase[]>(STORAGE_KEYS.PURCHASES);
    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    
    // Revenue by course
    const byCourse = courses.map(course => {
      const coursePurchases = purchases.filter(p => p.courseId === course.id);
      return {
        courseId: course.id,
        courseName: course.title,
        revenue: coursePurchases.reduce((sum, p) => sum + p.amount, 0),
        transactions: coursePurchases.length,
        avgOrderValue: coursePurchases.length > 0 
          ? Math.round(coursePurchases.reduce((sum, p) => sum + p.amount, 0) / coursePurchases.length)
          : 0
      };
    }).filter(c => c.revenue > 0);

    // Revenue by month (mock last 6 months)
    const byMonth: { month: string; revenue: number; transactions: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      byMonth.push({
        month: monthStr,
        revenue: Math.floor(Math.random() * 500) + 200,
        transactions: Math.floor(Math.random() * 5) + 1
      });
    }

    // Payment method breakdown
    const byPaymentMethod = purchases.reduce((acc, p) => {
      const method = p.paymentMethod || 'unknown';
      if (!acc[method]) acc[method] = { count: 0, total: 0 };
      acc[method].count++;
      acc[method].total += p.amount;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    return {
      totalRevenue: purchases.reduce((sum, p) => sum + p.amount, 0),
      totalTransactions: purchases.length,
      byCourse,
      byMonth,
      byPaymentMethod: Object.entries(byPaymentMethod).map(([method, data]) => ({
        method,
        ...data,
        percentage: Math.round((data.total / purchases.reduce((sum, p) => sum + p.amount, 0)) * 100)
      }))
    };
  },

  getStudentEngagementMetrics: () => {
    const users = getItem<User[]>(STORAGE_KEYS.USERS).filter(u => u.role === 'student');
    const enrollments = getItem<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS);
    const activities = getItem<Activity[]>(STORAGE_KEYS.ACTIVITIES);
    
    // Active in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeRecently = users.filter(u => 
      u.lastActivityAt && new Date(u.lastActivityAt) > sevenDaysAgo
    ).length;

    // Mock engagement data
    return {
      activeInLast7Days: activeRecently,
      activeInLast30Days: users.filter(u => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return u.lastActivityAt && new Date(u.lastActivityAt) > thirtyDaysAgo;
      }).length,
      avgSessionDuration: Math.floor(Math.random() * 20) + 15, // minutes
      avgLessonsPerSession: (Math.random() * 2 + 1).toFixed(1),
      peakHours: [
        { hour: '9-12', percentage: 25 },
        { hour: '12-15', percentage: 15 },
        { hour: '15-18', percentage: 20 },
        { hour: '18-21', percentage: 35 },
        { hour: '21-24', percentage: 5 }
      ],
      deviceBreakdown: [
        { device: 'Desktop', percentage: 45 },
        { device: 'Mobile', percentage: 40 },
        { device: 'Tablet', percentage: 15 }
      ],
      completionsByDayOfWeek: [
        { day: 'Mon', completions: Math.floor(Math.random() * 10) + 5 },
        { day: 'Tue', completions: Math.floor(Math.random() * 10) + 5 },
        { day: 'Wed', completions: Math.floor(Math.random() * 10) + 5 },
        { day: 'Thu', completions: Math.floor(Math.random() * 10) + 5 },
        { day: 'Fri', completions: Math.floor(Math.random() * 10) + 5 },
        { day: 'Sat', completions: Math.floor(Math.random() * 15) + 8 },
        { day: 'Sun', completions: Math.floor(Math.random() * 15) + 8 }
      ]
    };
  }
};

// ============================================
// USERS API
// ============================================
export const usersApi = {
  list: (filters: UserFilters = {}, page: number = 1, pageSize: number = 10): PaginatedResponse<User> => {
    let users = getItem<User[]>(STORAGE_KEYS.USERS).filter(u => u.role === 'student' && u.status !== 'deleted');

    // Apply filters
    if (filters.search) {
      const search = filters.search.toLowerCase();
      users = users.filter(u => 
        u.name.toLowerCase().includes(search) || 
        u.email.toLowerCase().includes(search)
      );
    }
    if (filters.status && filters.status !== 'all') {
      users = users.filter(u => u.status === filters.status);
    }
    if (filters.courseId) {
      const enrollments = getItem<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS);
      const enrolledUserIds = enrollments
        .filter(e => e.courseId === filters.courseId)
        .map(e => e.userId);
      users = users.filter(u => enrolledUserIds.includes(u.id));
    }

    const total = users.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = users.slice(start, start + pageSize);

    return { data, total, page, pageSize, totalPages };
  },

  getById: (userId: string): UserDetail | null => {
    const users = getItem<User[]>(STORAGE_KEYS.USERS);
    const user = users.find(u => u.id === userId);
    if (!user) return null;

    const enrollments = getItem<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS).filter(e => e.userId === userId);
    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const purchases = getItem<Purchase[]>(STORAGE_KEYS.PURCHASES).filter(p => p.userId === userId);
    const progress = getItem<Record<string, boolean>>(STORAGE_KEYS.PROGRESS);

    const enrichedEnrollments = enrollments.map(e => ({
      ...e,
      course: courses.find(c => c.id === e.courseId)!
    })).filter(e => e.course);

    // Calculate progress per course
    const progressData = enrollments.map(e => {
      const course = courses.find(c => c.id === e.courseId);
      if (!course) return { courseId: e.courseId, percentage: 0 };

      let total = 0;
      let completed = 0;
      course.modules.forEach(m => {
        m.lessons.forEach(l => {
          total++;
          if (progress[`${userId}_${l.id}`]) completed++;
        });
        m.homework.forEach(h => {
          total++;
          if (progress[`${userId}_${h.id}`]) completed++;
        });
      });

      return {
        courseId: e.courseId,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    });

    return {
      ...user,
      enrollments: enrichedEnrollments,
      purchases,
      progress: progressData,
      totalSpent: purchases.reduce((sum, p) => sum + p.amount, 0)
    };
  },

  pause: (userId: string): { success: boolean; error?: string } => {
    if (!authApi.isAdmin()) return { success: false, error: 'Unauthorized' };

    const users = getItem<User[]>(STORAGE_KEYS.USERS);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return { success: false, error: 'User not found' };

    const before = { status: users[idx].status };
    users[idx].status = 'paused';
    users[idx].updatedAt = now();
    setItem(STORAGE_KEYS.USERS, users);

    createAuditLog('user_paused', 'user', userId, `Paused user ${users[idx].name}`, before, { status: 'paused' });
    return { success: true };
  },

  unpause: (userId: string): { success: boolean; error?: string } => {
    if (!authApi.isAdmin()) return { success: false, error: 'Unauthorized' };

    const users = getItem<User[]>(STORAGE_KEYS.USERS);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return { success: false, error: 'User not found' };

    const before = { status: users[idx].status };
    users[idx].status = 'active';
    users[idx].updatedAt = now();
    setItem(STORAGE_KEYS.USERS, users);

    createAuditLog('user_unpaused', 'user', userId, `Unpaused user ${users[idx].name}`, before, { status: 'active' });
    return { success: true };
  },

  delete: (userId: string): { success: boolean; error?: string } => {
    if (!authApi.isAdmin()) return { success: false, error: 'Unauthorized' };

    const users = getItem<User[]>(STORAGE_KEYS.USERS);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return { success: false, error: 'User not found' };

    // Soft delete
    const before = { status: users[idx].status };
    users[idx].status = 'deleted';
    users[idx].updatedAt = now();
    setItem(STORAGE_KEYS.USERS, users);

    createAuditLog('user_deleted', 'user', userId, `Deleted user ${users[idx].name}`, before, { status: 'deleted' });
    return { success: true };
  },

  revokeAccess: (userId: string, courseId: string): { success: boolean; error?: string } => {
    if (!authApi.isAdmin()) return { success: false, error: 'Unauthorized' };

    const enrollments = getItem<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS);
    const idx = enrollments.findIndex(e => e.userId === userId && e.courseId === courseId);
    if (idx === -1) return { success: false, error: 'Enrollment not found' };

    const before = { status: enrollments[idx].status };
    enrollments[idx].status = 'revoked';
    setItem(STORAGE_KEYS.ENROLLMENTS, enrollments);

    createAuditLog('enrollment_revoked', 'enrollment', enrollments[idx].id, 
      `Revoked course access for user ${userId} on course ${courseId}`, before, { status: 'revoked' });
    return { success: true };
  },

  updateNotes: (userId: string, notes: string): { success: boolean; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const users = getItem<User[]>(STORAGE_KEYS.USERS);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return { success: false, error: 'User not found' };

    const before = { adminNotes: users[idx].adminNotes };
    users[idx].adminNotes = notes;
    users[idx].updatedAt = now();
    setItem(STORAGE_KEYS.USERS, users);

    createAuditLog('admin_note_updated', 'user', userId, 
      `Updated admin notes for ${users[idx].name}`, before, { adminNotes: notes });
    return { success: true };
  },

  // Grant course access without payment (admin feature)
  grantAccess: (userId: string, courseId: string, reason?: string): { success: boolean; error?: string } => {
    if (!authApi.isAdmin()) return { success: false, error: 'Unauthorized' };

    const users = getItem<User[]>(STORAGE_KEYS.USERS);
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const course = courses.find(c => c.id === courseId);
    if (!course) return { success: false, error: 'Course not found' };

    const enrollments = getItem<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS);
    
    // Check if already enrolled
    const existingEnrollment = enrollments.find(e => e.userId === userId && e.courseId === courseId);
    if (existingEnrollment) {
      // If revoked, reactivate it
      if (existingEnrollment.status === 'revoked') {
        const idx = enrollments.findIndex(e => e.id === existingEnrollment.id);
        const before = { status: enrollments[idx].status };
        enrollments[idx].status = 'active';
        setItem(STORAGE_KEYS.ENROLLMENTS, enrollments);
        
        createAuditLog('enrollment_created', 'enrollment', existingEnrollment.id, 
          `Reactivated access for ${user.name} to ${course.title}${reason ? ` - Reason: ${reason}` : ' (Admin granted)'}`,
          before, { status: 'active' });
        
        createActivity('course_enrolled', 
          `${user.name} was granted access to ${course.title} by admin`,
          { userId, userName: user.name, courseId, courseName: course.title }
        );
        
        return { success: true };
      }
      return { success: false, error: 'User already has access to this course' };
    }

    // Create new enrollment (without purchase)
    const newEnrollment: Enrollment = {
      id: `enroll-${generateId()}`,
      userId,
      courseId,
      enrolledAt: now(),
      status: 'active'
    };
    
    enrollments.push(newEnrollment);
    setItem(STORAGE_KEYS.ENROLLMENTS, enrollments);

    createAuditLog('enrollment_created', 'enrollment', newEnrollment.id, 
      `Granted free access for ${user.name} to ${course.title}${reason ? ` - Reason: ${reason}` : ' (Admin granted)'}`,
      null, { userId, courseId, status: 'active', grantedFree: true });

    createActivity('course_enrolled', 
      `${user.name} was granted access to ${course.title} by admin`,
      { userId, userName: user.name, courseId, courseName: course.title }
    );

    return { success: true };
  },

  // Get courses a user doesn't have access to
  getAvailableCoursesForUser: (userId: string): Course[] => {
    const enrollments = getItem<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS);
    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    
    const enrolledCourseIds = enrollments
      .filter(e => e.userId === userId && e.status !== 'revoked')
      .map(e => e.courseId);
    
    return courses.filter(c => c.isPublished && !enrolledCourseIds.includes(c.id));
  }
};

// ============================================
// COURSES API
// ============================================
export const coursesApi = {
  // Create a new course
  create: (courseData?: Partial<Course>): { success: boolean; course?: Course; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const newCourse: Course = {
      id: `course-${generateId()}`,
      title: courseData?.title || 'Untitled Course',
      description: courseData?.description || '',
      level: courseData?.level || 'A1',
      thumbnailUrl: courseData?.thumbnailUrl || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800',
      pricing: courseData?.pricing || { price: 0, currency: 'EUR', isFree: true },
      modules: courseData?.modules || [],
      isPublished: false,
      isDraft: true,
      createdAt: now(),
      updatedAt: now(),
      // Required catalog fields
      productType: courseData?.productType || 'learndash',
      targetAudience: courseData?.targetAudience || 'adults_teens',
      contentFormat: courseData?.contentFormat || 'interactive',
      teachingMaterialsIncluded: courseData?.teachingMaterialsIncluded || false,
      // Wizard state fields
      wizardStep: courseData?.wizardStep || 1,
      stepsCompleted: courseData?.stepsCompleted || { metadata: false, pricing: false, syllabus: false, content: false },
      wizardCompleted: false,
    };

    courses.push(newCourse);
    setItem(STORAGE_KEYS.COURSES, courses);

    createAuditLog('course_created', 'course', newCourse.id, 
      `Created new course "${newCourse.title}"`, undefined, { title: newCourse.title });

    createActivity('admin_edit', `New course "${newCourse.title}" was created`, {
      adminId: authApi.getCurrentUser()?.id,
      adminName: authApi.getCurrentUser()?.name,
      courseId: newCourse.id,
      courseName: newCourse.title
    });

    return { success: true, course: newCourse };
  },

  list: (filters: CourseFilters = {}): Course[] => {
    let courses = getItem<Course[]>(STORAGE_KEYS.COURSES);

    if (filters.search) {
      const search = filters.search.toLowerCase();
      courses = courses.filter(c => c.title.toLowerCase().includes(search));
    }
    if (filters.level && filters.level !== 'all') {
      courses = courses.filter(c => c.level === filters.level);
    }
    if (filters.isPublished !== undefined && filters.isPublished !== 'all') {
      courses = courses.filter(c => c.isPublished === filters.isPublished);
    }

    return courses;
  },

  getById: (courseId: string): Course | null => {
    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    return courses.find(c => c.id === courseId) || null;
  },

  getEnrollmentCount: (courseId: string): number => {
    const enrollments = getItem<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS);
    return enrollments.filter(e => e.courseId === courseId && e.status !== 'revoked').length;
  },

  getAvgProgress: (courseId: string): number => {
    const enrollments = getItem<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS).filter(e => e.courseId === courseId);
    const course = coursesApi.getById(courseId);
    const progress = getItem<Record<string, boolean>>(STORAGE_KEYS.PROGRESS);

    if (!course || enrollments.length === 0) return 0;

    let totalProgress = 0;
    enrollments.forEach(e => {
      let totalItems = 0;
      let completedItems = 0;
      course.modules.forEach(m => {
        m.lessons.forEach(l => {
          totalItems++;
          if (progress[`${e.userId}_${l.id}`]) completedItems++;
        });
        m.homework.forEach(h => {
          totalItems++;
          if (progress[`${e.userId}_${h.id}`]) completedItems++;
        });
      });
      if (totalItems > 0) {
        totalProgress += (completedItems / totalItems) * 100;
      }
    });

    return Math.round(totalProgress / enrollments.length);
  },

  updateMetadata: (courseId: string, updates: Partial<Pick<Course, 'title' | 'description' | 'level' | 'thumbnailUrl' | 'adminNotes'>>): { success: boolean; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const idx = courses.findIndex(c => c.id === courseId);
    if (idx === -1) return { success: false, error: 'Course not found' };

    const before = { ...courses[idx] };
    
    // Store in draft
    courses[idx].draftData = { ...courses[idx].draftData, ...updates };
    courses[idx].isDraft = true;
    courses[idx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    createAuditLog('course_updated', 'course', courseId, 
      `Updated draft metadata for ${courses[idx].title}`, 
      { title: before.title, description: before.description },
      updates
    );
    return { success: true };
  },

  updatePricing: (courseId: string, pricing: Course['pricing']): { success: boolean; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    // Validation
    if (pricing.price < 0) return { success: false, error: 'Price must be >= 0' };
    if (pricing.discountPrice !== undefined && pricing.discountPrice > pricing.price) {
      return { success: false, error: 'Discount price cannot exceed base price' };
    }
    if (pricing.discountStartDate && pricing.discountEndDate) {
      if (new Date(pricing.discountStartDate) >= new Date(pricing.discountEndDate)) {
        return { success: false, error: 'Discount end date must be after start date' };
      }
    }

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const idx = courses.findIndex(c => c.id === courseId);
    if (idx === -1) return { success: false, error: 'Course not found' };

    const before = { pricing: courses[idx].pricing };
    courses[idx].draftData = { ...courses[idx].draftData, pricing };
    courses[idx].isDraft = true;
    courses[idx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    createAuditLog('pricing_updated', 'course', courseId,
      `Updated draft pricing for ${courses[idx].title}`,
      before, { pricing }
    );
    return { success: true };
  },

  publish: (courseId: string): { success: boolean; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const idx = courses.findIndex(c => c.id === courseId);
    if (idx === -1) return { success: false, error: 'Course not found' };

    // Apply draft data to main course
    if (courses[idx].draftData) {
      Object.assign(courses[idx], courses[idx].draftData);
      courses[idx].draftData = undefined;
    }
    
    courses[idx].isPublished = true;
    courses[idx].isDraft = false;
    courses[idx].publishedAt = now();
    courses[idx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    createAuditLog('course_published', 'course', courseId,
      `Published ${courses[idx].title}`,
      { isPublished: false }, { isPublished: true }
    );
    
    createActivity('admin_edit', `Course "${courses[idx].title}" published`, {
      adminId: authApi.getCurrentUser()?.id,
      adminName: authApi.getCurrentUser()?.name,
      courseId,
      courseName: courses[idx].title
    });

    return { success: true };
  },

  unpublish: (courseId: string): { success: boolean; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const idx = courses.findIndex(c => c.id === courseId);
    if (idx === -1) return { success: false, error: 'Course not found' };

    courses[idx].isPublished = false;
    courses[idx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    createAuditLog('course_unpublished', 'course', courseId,
      `Unpublished ${courses[idx].title}`,
      { isPublished: true }, { isPublished: false }
    );
    return { success: true };
  },

  discardDraft: (courseId: string): { success: boolean; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const idx = courses.findIndex(c => c.id === courseId);
    if (idx === -1) return { success: false, error: 'Course not found' };

    courses[idx].draftData = undefined;
    courses[idx].isDraft = false;
    courses[idx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    return { success: true };
  },

  // Module operations
  addModule: (courseId: string, module: Omit<Module, 'id' | 'order'>): { success: boolean; moduleId?: string; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const idx = courses.findIndex(c => c.id === courseId);
    if (idx === -1) return { success: false, error: 'Course not found' };

    const newModule: Module = {
      ...module,
      id: `${courseId}-m${generateId()}`,
      order: courses[idx].modules.length + 1
    };

    courses[idx].modules.push(newModule);
    courses[idx].isDraft = true;
    courses[idx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    createAuditLog('module_added', 'module', newModule.id,
      `Added module "${module.title}" to ${courses[idx].title}`,
      undefined, { title: module.title }
    );
    return { success: true, moduleId: newModule.id };
  },

  updateModule: (courseId: string, moduleId: string, updates: Partial<Module>): { success: boolean; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const courseIdx = courses.findIndex(c => c.id === courseId);
    if (courseIdx === -1) return { success: false, error: 'Course not found' };

    const moduleIdx = courses[courseIdx].modules.findIndex(m => m.id === moduleId);
    if (moduleIdx === -1) return { success: false, error: 'Module not found' };

    const before = { ...courses[courseIdx].modules[moduleIdx] };
    Object.assign(courses[courseIdx].modules[moduleIdx], updates);
    courses[courseIdx].isDraft = true;
    courses[courseIdx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    createAuditLog('module_updated', 'module', moduleId,
      `Updated module "${courses[courseIdx].modules[moduleIdx].title}"`,
      { title: before.title }, updates
    );
    return { success: true };
  },

  deleteModule: (courseId: string, moduleId: string): { success: boolean; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const courseIdx = courses.findIndex(c => c.id === courseId);
    if (courseIdx === -1) return { success: false, error: 'Course not found' };

    const moduleIdx = courses[courseIdx].modules.findIndex(m => m.id === moduleId);
    if (moduleIdx === -1) return { success: false, error: 'Module not found' };

    const deletedModule = courses[courseIdx].modules[moduleIdx];
    courses[courseIdx].modules.splice(moduleIdx, 1);
    
    // Reorder remaining modules
    courses[courseIdx].modules.forEach((m, i) => { m.order = i + 1; });
    courses[courseIdx].isDraft = true;
    courses[courseIdx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    createAuditLog('module_deleted', 'module', moduleId,
      `Deleted module "${deletedModule.title}" from ${courses[courseIdx].title}`,
      { title: deletedModule.title }, undefined
    );
    return { success: true };
  },

  reorderModules: (courseId: string, moduleIds: string[]): { success: boolean; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const courseIdx = courses.findIndex(c => c.id === courseId);
    if (courseIdx === -1) return { success: false, error: 'Course not found' };

    const reordered: Module[] = [];
    moduleIds.forEach((id, i) => {
      const module = courses[courseIdx].modules.find(m => m.id === id);
      if (module) {
        module.order = i + 1;
        reordered.push(module);
      }
    });

    courses[courseIdx].modules = reordered;
    courses[courseIdx].isDraft = true;
    courses[courseIdx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    return { success: true };
  },

  // Lesson operations
  addLesson: (courseId: string, moduleId: string, lesson: Omit<Lesson, 'id' | 'order'>): { success: boolean; lessonId?: string; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const courseIdx = courses.findIndex(c => c.id === courseId);
    if (courseIdx === -1) return { success: false, error: 'Course not found' };

    const moduleIdx = courses[courseIdx].modules.findIndex(m => m.id === moduleId);
    if (moduleIdx === -1) return { success: false, error: 'Module not found' };

    const newLesson: Lesson = {
      ...lesson,
      id: `${moduleId}-l${generateId()}`,
      order: courses[courseIdx].modules[moduleIdx].lessons.length + 1
    };

    courses[courseIdx].modules[moduleIdx].lessons.push(newLesson);
    courses[courseIdx].isDraft = true;
    courses[courseIdx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    createAuditLog('lesson_added', 'lesson', newLesson.id,
      `Added lesson "${lesson.title}"`,
      undefined, { title: lesson.title }
    );
    return { success: true, lessonId: newLesson.id };
  },

  updateLesson: (courseId: string, moduleId: string, lessonId: string, updates: Partial<Lesson>): { success: boolean; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const courseIdx = courses.findIndex(c => c.id === courseId);
    if (courseIdx === -1) return { success: false, error: 'Course not found' };

    const moduleIdx = courses[courseIdx].modules.findIndex(m => m.id === moduleId);
    if (moduleIdx === -1) return { success: false, error: 'Module not found' };

    const lessonIdx = courses[courseIdx].modules[moduleIdx].lessons.findIndex(l => l.id === lessonId);
    if (lessonIdx === -1) return { success: false, error: 'Lesson not found' };

    const before = { ...courses[courseIdx].modules[moduleIdx].lessons[lessonIdx] };
    Object.assign(courses[courseIdx].modules[moduleIdx].lessons[lessonIdx], updates);
    courses[courseIdx].isDraft = true;
    courses[courseIdx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    // Special audit for video updates
    if (updates.videoLinks) {
      createAuditLog('video_updated', 'lesson', lessonId,
        `Updated video link for "${before.title}"`,
        { videoLinks: before.videoLinks }, { videoLinks: updates.videoLinks }
      );
    } else {
      createAuditLog('lesson_updated', 'lesson', lessonId,
        `Updated lesson "${before.title}"`,
        { title: before.title, duration: before.duration },
        updates
      );
    }
    return { success: true };
  },

  deleteLesson: (courseId: string, moduleId: string, lessonId: string): { success: boolean; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const courseIdx = courses.findIndex(c => c.id === courseId);
    if (courseIdx === -1) return { success: false, error: 'Course not found' };

    const moduleIdx = courses[courseIdx].modules.findIndex(m => m.id === moduleId);
    if (moduleIdx === -1) return { success: false, error: 'Module not found' };

    const lessonIdx = courses[courseIdx].modules[moduleIdx].lessons.findIndex(l => l.id === lessonId);
    if (lessonIdx === -1) return { success: false, error: 'Lesson not found' };

    const deleted = courses[courseIdx].modules[moduleIdx].lessons[lessonIdx];
    courses[courseIdx].modules[moduleIdx].lessons.splice(lessonIdx, 1);
    courses[courseIdx].modules[moduleIdx].lessons.forEach((l, i) => { l.order = i + 1; });
    courses[courseIdx].isDraft = true;
    courses[courseIdx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    createAuditLog('lesson_deleted', 'lesson', lessonId,
      `Deleted lesson "${deleted.title}"`,
      { title: deleted.title }, undefined
    );
    return { success: true };
  },

  // Homework operations
  addHomework: (courseId: string, moduleId: string, homework: Omit<Homework, 'id' | 'order'>): { success: boolean; homeworkId?: string; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const courseIdx = courses.findIndex(c => c.id === courseId);
    if (courseIdx === -1) return { success: false, error: 'Course not found' };

    const moduleIdx = courses[courseIdx].modules.findIndex(m => m.id === moduleId);
    if (moduleIdx === -1) return { success: false, error: 'Module not found' };

    const newHomework: Homework = {
      ...homework,
      id: `${moduleId}-h${generateId()}`,
      order: courses[courseIdx].modules[moduleIdx].homework.length + 1
    };

    courses[courseIdx].modules[moduleIdx].homework.push(newHomework);
    courses[courseIdx].isDraft = true;
    courses[courseIdx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    createAuditLog('homework_added', 'homework', newHomework.id,
      `Added homework "${homework.title}"`,
      undefined, { title: homework.title }
    );
    return { success: true, homeworkId: newHomework.id };
  },

  updateHomework: (courseId: string, moduleId: string, homeworkId: string, updates: Partial<Homework>): { success: boolean; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const courseIdx = courses.findIndex(c => c.id === courseId);
    if (courseIdx === -1) return { success: false, error: 'Course not found' };

    const moduleIdx = courses[courseIdx].modules.findIndex(m => m.id === moduleId);
    if (moduleIdx === -1) return { success: false, error: 'Module not found' };

    const hwIdx = courses[courseIdx].modules[moduleIdx].homework.findIndex(h => h.id === homeworkId);
    if (hwIdx === -1) return { success: false, error: 'Homework not found' };

    const before = { ...courses[courseIdx].modules[moduleIdx].homework[hwIdx] };
    Object.assign(courses[courseIdx].modules[moduleIdx].homework[hwIdx], updates);
    courses[courseIdx].isDraft = true;
    courses[courseIdx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    createAuditLog('homework_updated', 'homework', homeworkId,
      `Updated homework "${before.title}"`,
      { title: before.title }, updates
    );
    return { success: true };
  },

  deleteHomework: (courseId: string, moduleId: string, homeworkId: string): { success: boolean; error?: string } => {
    if (!authApi.isEditor()) return { success: false, error: 'Unauthorized' };

    const courses = getItem<Course[]>(STORAGE_KEYS.COURSES);
    const courseIdx = courses.findIndex(c => c.id === courseId);
    if (courseIdx === -1) return { success: false, error: 'Course not found' };

    const moduleIdx = courses[courseIdx].modules.findIndex(m => m.id === moduleId);
    if (moduleIdx === -1) return { success: false, error: 'Module not found' };

    const hwIdx = courses[courseIdx].modules[moduleIdx].homework.findIndex(h => h.id === homeworkId);
    if (hwIdx === -1) return { success: false, error: 'Homework not found' };

    const deleted = courses[courseIdx].modules[moduleIdx].homework[hwIdx];
    courses[courseIdx].modules[moduleIdx].homework.splice(hwIdx, 1);
    courses[courseIdx].modules[moduleIdx].homework.forEach((h, i) => { h.order = i + 1; });
    courses[courseIdx].isDraft = true;
    courses[courseIdx].updatedAt = now();
    setItem(STORAGE_KEYS.COURSES, courses);

    createAuditLog('homework_deleted', 'homework', homeworkId,
      `Deleted homework "${deleted.title}"`,
      { title: deleted.title }, undefined
    );
    return { success: true };
  }
};

// ============================================
// ENROLLMENTS API (for student-facing pages)
// ============================================
export const enrollmentsApi = {
  // Get all enrollments for a user
  getByUser: (userId: string): Enrollment[] => {
    const enrollments = getItem<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS);
    return enrollments.filter(e => e.userId === userId && e.status !== 'revoked');
  },

  // Create a new enrollment (called after purchase)
  create: (userId: string, courseId: string): { success: boolean; enrollment?: Enrollment; error?: string } => {
    const enrollments = getItem<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS);
    
    // Check if already enrolled
    const existing = enrollments.find(e => e.userId === userId && e.courseId === courseId && e.status !== 'revoked');
    if (existing) {
      return { success: false, error: 'Already enrolled in this course' };
    }

    const newEnrollment: Enrollment = {
      id: `enr-${generateId()}`,
      userId,
      courseId,
      enrolledAt: now(),
      status: 'active'
    };

    enrollments.push(newEnrollment);
    setItem(STORAGE_KEYS.ENROLLMENTS, enrollments);

    createActivity('course_enrolled', `User enrolled in course`, {
      userId,
      courseId
    });

    return { success: true, enrollment: newEnrollment };
  },

  // Check if a user is enrolled in a course
  isEnrolled: (userId: string, courseId: string): boolean => {
    const enrollments = getItem<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS);
    return enrollments.some(e => e.userId === userId && e.courseId === courseId && e.status === 'active');
  }
};

// ============================================
// PURCHASES API (for checkout flow)
// ============================================
export const purchasesApi = {
  create: (params: { userId: string; courseId: string; amount: number; currency?: string; paymentMethod?: string; discountCode?: string }): { success: boolean; purchase?: Purchase; error?: string } => {
    const { userId, courseId, amount, currency = 'EUR' } = params;
    const purchases = getItem<Purchase[]>(STORAGE_KEYS.PURCHASES);
    
    const newPurchase: Purchase = {
      id: `pur-${generateId()}`,
      userId,
      courseId,
      amount,
      currency,
      purchasedAt: now(),
      transactionId: `txn-${generateId()}`
    };

    purchases.push(newPurchase);
    setItem(STORAGE_KEYS.PURCHASES, purchases);

    // Auto-enroll after purchase
    enrollmentsApi.create(userId, courseId);

    createActivity('course_purchased', `New purchase: ${amount} ${currency}`, {
      userId,
      courseId
    });

    return { success: true, purchase: newPurchase };
  },

  getByUser: (userId: string): Purchase[] => {
    const purchases = getItem<Purchase[]>(STORAGE_KEYS.PURCHASES);
    return purchases.filter(p => p.userId === userId);
  }
};

// ============================================
// PROGRESS API (for tracking user progress)
// ============================================
export const progressApi = {
  get: (userId: string): Record<string, boolean> => {
    const allProgress = getItem<Record<string, boolean>>(STORAGE_KEYS.PROGRESS);
    // Filter to only this user's progress keys
    const userProgress: Record<string, boolean> = {};
    Object.keys(allProgress).forEach(key => {
      if (key.startsWith(`${userId}_`) || !key.includes('_')) {
        userProgress[key] = allProgress[key];
      }
    });
    return userProgress;
  },

  toggle: (userId: string, courseId: string, itemId: string): boolean => {
    const key = `${courseId}_${itemId}`;
    const progress = getItem<Record<string, boolean>>(STORAGE_KEYS.PROGRESS);
    progress[key] = !progress[key];
    setItem(STORAGE_KEYS.PROGRESS, progress);
    return progress[key];
  },

  set: (courseId: string, itemId: string, completed: boolean): void => {
    const key = `${courseId}_${itemId}`;
    const progress = getItem<Record<string, boolean>>(STORAGE_KEYS.PROGRESS);
    progress[key] = completed;
    setItem(STORAGE_KEYS.PROGRESS, progress);
  }
};

// ============================================
// AUDIT LOGS API
// ============================================
export const auditApi = {
  list: (page: number = 1, pageSize: number = 20): PaginatedResponse<AuditLog> => {
    const logs = getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS);
    const total = logs.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = logs.slice(start, start + pageSize);

    return { data, total, page, pageSize, totalPages };
  },

  getByEntity: (entityType: AuditLog['entityType'], entityId: string): AuditLog[] => {
    const logs = getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS);
    return logs.filter(l => l.entityType === entityType && l.entityId === entityId);
  }
};

// ============================================
// VIDEO LINK HELPERS
// ============================================
export const videoHelpers = {
  validateUrl: (url: string): boolean => {
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

  getEmbedUrl: (url: string, provider: string): string => {
    if (provider === 'youtube') {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      if (match) return `https://www.youtube.com/embed/${match[1]}`;
    }
    if (provider === 'vimeo') {
      const match = url.match(/vimeo\.com\/(\d+)/);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }
    return url;
  },

  testLink: async (url: string): Promise<{ reachable: boolean; error?: string }> => {
    // Mock test - in real implementation would do HEAD request
    if (!videoHelpers.validateUrl(url)) {
      return { reachable: false, error: 'Invalid URL format' };
    }
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { reachable: true };
  }
};

// ============================================
// RESET STORE (for testing)
// ============================================
export const resetStore = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  initializeStore();
};
