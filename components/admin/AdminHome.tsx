// ============================================
// Admin Dashboard Home - World-Class Analytics
// ============================================

import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, UserX, GraduationCap, DollarSign, TrendingUp,
  Activity, BarChart3, ArrowRight, Zap, PieChart, Clock, Target,
  Award, BookOpen, Monitor, Smartphone, Tablet, Calendar, ArrowUpRight,
  ArrowDownRight, Eye, ChevronRight
} from 'lucide-react';
import { KPICard, ActivityItem, Button, ProgressBar } from './AdminUIComponents';
import { analyticsApi } from '../../data/supabaseStore';
import { KPIMetrics, AnalyticsTrends, Activity as ActivityType } from '../../types';

interface AdminHomeProps {
  onNavigate: (path: string) => void;
}

interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  level: string;
  enrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  revenue: number;
  avgCompletionRate: number;
  avgTimePerSession: number;
  returnRate: number;
  lastEnrollment: string | null;
}

interface RevenueBreakdown {
  totalRevenue: number;
  totalTransactions: number;
  byCourse: { courseId: string; courseName: string; revenue: number; transactions: number }[];
  byMonth: { month: string; revenue: number; transactions: number }[];
  byPaymentMethod: { method: string; count: number; total: number; percentage: number }[];
}

interface EngagementMetrics {
  activeInLast7Days: number;
  activeInLast30Days: number;
  avgSessionDuration: number;
  avgLessonsPerSession: string;
  peakHours: { hour: string; percentage: number }[];
  deviceBreakdown: { device: string; percentage: number }[];
  completionsByDayOfWeek: { day: string; completions: number }[];
}

const AdminHome: React.FC<AdminHomeProps> = ({ onNavigate }) => {
  const [kpis, setKpis] = useState<KPIMetrics | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [courseAnalytics, setCourseAnalytics] = useState<CourseAnalytics[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueBreakdown | null>(null);
  const [engagementData, setEngagementData] = useState<EngagementMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'revenue' | 'engagement'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [kpisData, trendsData, activitiesData, courseData, revenue, engagement] = await Promise.all([
        analyticsApi.getKPIs(),
        analyticsApi.getTrends(),
        analyticsApi.getRecentActivity(8),
        analyticsApi.getCourseAnalytics(),
        analyticsApi.getRevenueBreakdown(),
        analyticsApi.getStudentEngagementMetrics()
      ]);
      setKpis(kpisData);
      setTrends(trendsData);
      setActivities(activitiesData);
      setCourseAnalytics(courseData);
      setRevenueData(revenue);
      setEngagementData(engagement);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (loading || !kpis) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-reveal">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-500 px-3 py-1 bg-purple-50 rounded-full border border-purple-100">
              Admin Dashboard
            </span>
            <span className="text-[10px] font-bold text-gray-400">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase">
            Analytics Center
          </h1>
          <p className="text-gray-500 font-medium">Real-time insights into your learning platform</p>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => onNavigate('admin-users')}>
            View Users
          </Button>
          <Button variant="primary" size="sm" onClick={() => onNavigate('admin-courses')}>
            Manage Courses
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'courses', label: 'Course Performance', icon: BookOpen },
          { id: 'revenue', label: 'Revenue', icon: DollarSign },
          { id: 'engagement', label: 'Engagement', icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                : 'bg-white text-gray-500 border border-gray-100 hover:border-purple-200 hover:text-purple-600'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard
              title="Total Users"
              value={kpis.totalUsers}
              icon={Users}
              color="purple"
              trend={{ value: 12, isPositive: true }}
            />
            <KPICard
              title="Active Users"
              value={kpis.activeUsers}
              icon={UserCheck}
              color="green"
            />
            <KPICard
              title="Paused Users"
              value={kpis.pausedUsers}
              icon={UserX}
              color="amber"
            />
            <KPICard
              title="Enrollments"
              value={kpis.totalEnrollments}
              icon={GraduationCap}
              color="blue"
              trend={{ value: 8, isPositive: true }}
            />
            <KPICard
              title="Revenue"
              value={formatCurrency(kpis.revenue)}
              icon={DollarSign}
              color="green"
              trend={{ value: 15, isPositive: true }}
            />
            <KPICard
              title="Avg Completion"
              value={`${kpis.avgCompletionRate}%`}
              icon={TrendingUp}
              color="pink"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Trends Section */}
            <div className="lg:col-span-8 space-y-6">
              {/* Time Range Toggle */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
                  <BarChart3 size={18} className="text-purple-600" />
                  Trends
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimeRange('7d')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      timeRange === '7d' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    7 Days
                  </button>
                  <button
                    onClick={() => setTimeRange('30d')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      timeRange === '30d' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    30 Days
                  </button>
                </div>
              </div>

              {/* Trend Charts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TrendCard
                  title="New Users"
                  data={timeRange === '7d' ? trends?.newUsers7d || [] : trends?.newUsers30d || []}
                  color="purple"
                />
                <TrendCard
                  title="Enrollments"
                  data={timeRange === '7d' ? trends?.enrollments7d || [] : trends?.enrollments30d || []}
                  color="blue"
                />
                <TrendCard
                  title="Completions"
                  data={timeRange === '7d' ? trends?.completions7d || [] : trends?.completions30d || []}
                  color="green"
                />
              </div>

              {/* Quick Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[2rem] p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2" />
                  <div className="relative z-10">
                    <Zap size={24} className="mb-4" />
                    <h3 className="text-2xl font-black mb-2">{kpis.totalEnrollments}</h3>
                    <p className="text-purple-200 text-sm font-medium">Total course enrollments</p>
                    <button 
                      onClick={() => onNavigate('admin-courses')}
                      className="mt-6 flex items-center gap-2 text-white/80 hover:text-white text-xs font-bold transition-colors"
                    >
                      View Courses <ArrowRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Top Course</h3>
                    <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Most Enrolled</span>
                  </div>
                  {courseAnalytics[0] && (
                    <>
                      <h4 className="text-xl font-black text-gray-900 mb-2">{courseAnalytics[0].courseTitle}</h4>
                      <p className="text-sm text-gray-500 mb-4">{courseAnalytics[0].enrollments} enrolled students</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-purple-600">{formatCurrency(courseAnalytics[0].revenue)}</span>
                        <span className="text-xs text-green-500 flex items-center gap-1">
                          <ArrowUpRight size={12} />
                          {courseAnalytics[0].avgCompletionRate}% completion
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
                    <Activity size={16} className="text-purple-600" />
                    Recent Activity
                  </h3>
                  <button 
                    onClick={() => onNavigate('admin-audit')}
                    className="text-[10px] font-black text-purple-600 uppercase tracking-widest hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-1">
                  {activities.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">No recent activity</p>
                  ) : (
                    activities.map((activity) => (
                      <ActivityItem
                        key={activity.id}
                        type={activity.type}
                        description={activity.description}
                        timestamp={activity.timestamp}
                        userName={activity.userName}
                        courseName={activity.courseName}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Course Performance Tab */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {courseAnalytics.map((course) => (
              <CoursePerformanceCard
                key={course.courseId}
                course={course}
                formatCurrency={formatCurrency}
                onViewDetails={() => onNavigate(`admin-course-edit-${course.courseId}`)}
              />
            ))}
          </div>

          {courseAnalytics.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-[2rem]">
              <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No published courses yet</p>
            </div>
          )}
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && revenueData && (
        <div className="space-y-6">
          {/* Revenue Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-[2rem] p-6 text-white">
              <DollarSign size={24} className="mb-3 opacity-80" />
              <p className="text-green-100 text-xs font-bold uppercase tracking-widest mb-1">Total Revenue</p>
              <p className="text-3xl font-black">{formatCurrency(revenueData.totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6">
              <Target size={24} className="mb-3 text-purple-500" />
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Transactions</p>
              <p className="text-3xl font-black text-gray-900">{revenueData.totalTransactions}</p>
            </div>
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6">
              <TrendingUp size={24} className="mb-3 text-blue-500" />
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Avg Order Value</p>
              <p className="text-3xl font-black text-gray-900">
                {formatCurrency(revenueData.totalTransactions > 0 
                  ? revenueData.totalRevenue / revenueData.totalTransactions 
                  : 0)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Course */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <PieChart size={16} className="text-purple-500" />
                Revenue by Course
              </h3>
              <div className="space-y-4">
                {revenueData.byCourse.map((course, idx) => (
                  <div key={course.courseId} className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      idx === 0 ? 'bg-purple-500' : idx === 1 ? 'bg-blue-500' : 'bg-green-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{course.courseName}</p>
                      <p className="text-xs text-gray-400">{course.transactions} sales</p>
                    </div>
                    <p className="text-sm font-black text-gray-900">{formatCurrency(course.revenue)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Trend */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" />
                Monthly Revenue
              </h3>
              <div className="space-y-3">
                {revenueData.byMonth.map((month) => (
                  <div key={month.month} className="flex items-center gap-4">
                    <span className="text-xs font-medium text-gray-500 w-20">{month.month}</span>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all"
                          style={{ 
                            width: `${Math.min((month.revenue / Math.max(...revenueData.byMonth.map(m => m.revenue))) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-20 text-right">{formatCurrency(month.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6 lg:col-span-2">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Payment Methods</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {revenueData.byPaymentMethod.map((pm) => (
                  <div key={pm.method} className="bg-gray-50 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-gray-900 mb-1">{pm.percentage}%</p>
                    <p className="text-xs font-bold text-gray-500 uppercase capitalize">{pm.method}</p>
                    <p className="text-xs text-gray-400 mt-1">{pm.count} transactions</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Tab */}
      {activeTab === 'engagement' && engagementData && (
        <div className="space-y-6">
          {/* Engagement Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6">
              <Users size={24} className="mb-3 text-purple-500" />
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Active (7 days)</p>
              <p className="text-3xl font-black text-gray-900">{engagementData.activeInLast7Days}</p>
            </div>
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6">
              <Clock size={24} className="mb-3 text-blue-500" />
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Avg Session</p>
              <p className="text-3xl font-black text-gray-900">{engagementData.avgSessionDuration}m</p>
            </div>
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6">
              <BookOpen size={24} className="mb-3 text-green-500" />
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Lessons/Session</p>
              <p className="text-3xl font-black text-gray-900">{engagementData.avgLessonsPerSession}</p>
            </div>
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6">
              <Activity size={24} className="mb-3 text-pink-500" />
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Active (30 days)</p>
              <p className="text-3xl font-black text-gray-900">{engagementData.activeInLast30Days}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Peak Hours */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Clock size={16} className="text-purple-500" />
                Peak Learning Hours
              </h3>
              <div className="space-y-3">
                {engagementData.peakHours.map((peak) => (
                  <div key={peak.hour} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 w-16">{peak.hour}</span>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                          style={{ width: `${peak.percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-10 text-right">{peak.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Monitor size={16} className="text-blue-500" />
                Device Usage
              </h3>
              <div className="space-y-4">
                {engagementData.deviceBreakdown.map((device) => (
                  <div key={device.device} className="flex items-center gap-4">
                    {device.device === 'Desktop' && <Monitor size={20} className="text-gray-400" />}
                    {device.device === 'Mobile' && <Smartphone size={20} className="text-gray-400" />}
                    {device.device === 'Tablet' && <Tablet size={20} className="text-gray-400" />}
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{device.device}</p>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${device.percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-lg font-black text-gray-900">{device.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Completions by Day */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Award size={16} className="text-green-500" />
                Completions by Day
              </h3>
              <div className="flex items-end justify-between gap-2 h-32">
                {engagementData.completionsByDayOfWeek.map((day) => (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-gradient-to-t from-green-400 to-green-500 rounded-t-lg transition-all hover:from-green-500 hover:to-green-600"
                      style={{ 
                        height: `${Math.max((day.completions / Math.max(...engagementData.completionsByDayOfWeek.map(d => d.completions))) * 100, 10)}%` 
                      }}
                    />
                    <span className="text-[10px] font-bold text-gray-500">{day.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// ============================================
// Course Performance Card Component
// ============================================
interface CoursePerformanceCardProps {
  course: CourseAnalytics;
  formatCurrency: (amount: number) => string;
  onViewDetails: () => void;
}

const CoursePerformanceCard: React.FC<CoursePerformanceCardProps> = ({ course, formatCurrency, onViewDetails }) => {
  const levelColors: Record<string, string> = {
    A1: 'bg-green-100 text-green-700',
    A2: 'bg-blue-100 text-blue-700',
    B1: 'bg-purple-100 text-purple-700',
    Kids: 'bg-pink-100 text-pink-700'
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 p-6 hover:shadow-lg transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${levelColors[course.level] || 'bg-gray-100 text-gray-700'}`}>
            {course.level}
          </span>
        </div>
        <button 
          onClick={onViewDetails}
          className="p-2 rounded-xl text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-all opacity-0 group-hover:opacity-100"
        >
          <Eye size={16} />
        </button>
      </div>

      <h3 className="text-lg font-black text-gray-900 mb-4 line-clamp-2">{course.courseTitle}</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Enrollments</p>
          <p className="text-xl font-black text-gray-900">{course.enrollments}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Revenue</p>
          <p className="text-xl font-black text-green-600">{formatCurrency(course.revenue)}</p>
        </div>
      </div>

      {/* Completion Rate Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completion Rate</p>
          <p className="text-sm font-black text-purple-600">{course.avgCompletionRate}%</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all"
            style={{ width: `${course.avgCompletionRate}%` }}
          />
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock size={12} />
          <span>{course.avgTimePerSession}m avg session</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-500">
          <TrendingUp size={12} />
          <span>{course.returnRate}% return rate</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Trend Card with Mini Chart
// ============================================
interface TrendCardProps {
  title: string;
  data: { date: string; value: number }[];
  color: 'purple' | 'blue' | 'green';
}

const TrendCard: React.FC<TrendCardProps> = ({ title, data, color }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const max = Math.max(...data.map(d => d.value), 1);

  const colors = {
    purple: { bg: 'bg-purple-500', light: 'bg-purple-100' },
    blue: { bg: 'bg-blue-500', light: 'bg-blue-100' },
    green: { bg: 'bg-green-500', light: 'bg-green-100' },
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{title}</p>
      <p className="text-2xl font-black text-gray-900 mb-4">{total}</p>
      
      {/* Mini Bar Chart */}
      <div className="flex items-end gap-1 h-16">
        {data.slice(-7).map((d, i) => (
          <div
            key={i}
            className={`flex-1 ${colors[color].bg} rounded-t-sm transition-all hover:opacity-80 cursor-pointer`}
            style={{ height: `${(d.value / max) * 100}%`, minHeight: '4px' }}
            title={`${d.date}: ${d.value}`}
          />
        ))}
      </div>
    </div>
  );
};

export default AdminHome;
