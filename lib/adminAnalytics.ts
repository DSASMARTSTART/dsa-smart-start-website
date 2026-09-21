import { supabaseAny as db } from './supabase';
export type AnalyticsDays = 7 | 30 | 90;
export type AnalyticsCourse = {
  id: string;
  title: string;
  level: string;
  product_type: string;
  content_format: string;
  active_enrollments: number;
  new_enrollments: number;
  orders: number;
  revenue: number;
  learning_items: number;
  average_progress: number | null;
  materials: number;
  live_attendances: number;
};
export type AnalyticsTeacher = {
  id: string;
  name: string;
  status: string;
  sessions: number;
  completed_sessions: number;
  attended: number;
  missed: number;
  cancelled: number;
  missing_recordings: number;
};
export type AdminAnalytics = {
  generatedAt: string;
  from: string;
  to: string;
  timezone: string;
  days: AnalyticsDays;
  currency: string;
  currencies: string[];
  summary: {
    studentAccounts: number;
    enabledAccounts: number;
    newRegistrations: number;
    previousRegistrations: number;
    activeLearners: number;
    paidOrders: number;
    netRevenue: number;
    previousRevenue: number;
    grossRevenue: number;
    refundsOnOrders: number;
    activeEnrollments: number;
    learningItemsCompleted: number;
    quizAttempts: number;
  };
  funnel: {
    registered: number;
    confirmed: number;
    signedIn: number;
    enrolled: number;
    paying: number;
  };
  trends: {
    day: string;
    registrations: number;
    orders: number;
    revenue: number;
    learning_items: number;
  }[];
  courses: AnalyticsCourse[];
  paymentsByMethod: { method: string; orders: number; revenue: number }[];
  orderStatuses: Record<string, number>;
  live: {
    bookings: number;
    completedSessions: number;
    attendances: number;
    noShows: number;
    cancelled: number;
    awaitingAttendance: number;
    upcoming: number;
    missingRecordings: number;
    teachers: AnalyticsTeacher[];
  };
  health: Record<
    | 'accountsWithoutProfile'
    | 'profilesWithoutAccount'
    | 'paidWithoutAccess'
    | 'activeTeachersWithoutLogin'
    | 'activeTeachersWithoutHours'
    | 'failedAssets'
    | 'staleUploads'
    | 'livePackagesWithoutTeachers'
    | 'paymentOrphans',
    number
  >;
  recentActivity: {
    id: string;
    user_id: string;
    name: string;
    description: string;
    occurred_at: string;
  }[];
};
export type AnalyticsPerson = {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  guest_checkout: boolean;
  active_packages: number;
  live_attended: number;
  last_learning_activity: string | null;
};
export type AnalyticsPeople = {
  total: number;
  page: number;
  pageSize: number;
  rows: AnalyticsPerson[];
};
async function report<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(error.message);
  if (!data) throw new Error('No analytics response was returned.');
  return data as T;
}
export const adminAnalyticsApi = {
  snapshot: (days: AnalyticsDays, currency = '') =>
    report<AdminAnalytics>('admin_analytics_snapshot', {
      p_days: days,
      p_currency: currency || null,
      p_timezone: 'Europe/Belgrade',
    }),
  people: (days: AnalyticsDays, search: string, page: number) =>
    report<AnalyticsPeople>('admin_analytics_people', {
      p_days: days,
      p_search: search,
      p_page: page,
    }),
};
// Names and titles can contain spreadsheet formulas; neutralize them before exporting.
export function analyticsCsv(rows: (string | number | null)[][]) {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value ?? '');
            if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
            return '"' + text.replaceAll('"', '""') + '"';
          })
          .join(',')
      )
      .join('\r\n')
  );
}
