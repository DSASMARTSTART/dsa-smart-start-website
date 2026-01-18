// ============================================
// Admin Courses Management
// ============================================

import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Edit, Eye, ChevronRight, DollarSign,
  Users, BarChart, ToggleLeft, ToggleRight, Image
} from 'lucide-react';
import { 
  DataTable, StatusBadge, ProgressBar, Button, Select
} from './AdminUIComponents';
import { coursesApi } from '../../data/supabaseStore';
import { Course, CourseFilters } from '../../types';

interface AdminCoursesProps {
  onNavigate: (path: string, params?: string) => void;
}

const AdminCourses: React.FC<AdminCoursesProps> = ({ onNavigate }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CourseFilters>({ search: '' });
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [avgProgress, setAvgProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    loadCourses();
  }, [filters]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await coursesApi.list(filters);
      setCourses(data);
      
      // Load enrollment counts and progress for each course
      const counts: Record<string, number> = {};
      const progress: Record<string, number> = {};
      for (const course of data) {
        counts[course.id] = await coursesApi.getEnrollmentCount(course.id);
        progress[course.id] = await coursesApi.getAvgProgress(course.id);
      }
      setEnrollmentCounts(counts);
      setAvgProgress(progress);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (course: Course) => {
    try {
      if (course.isPublished) {
        await coursesApi.unpublish(course.id);
      } else {
        await coursesApi.publish(course.id);
      }
      loadCourses();
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  const formatPrice = (course: Course) => {
    if (course.pricing.isFree) return 'FREE';
    const price = course.pricing.discountPrice || course.pricing.price;
    return `€${price}`;
  };

  const columns = [
    {
      key: 'title',
      header: 'Course',
      width: '2fr',
      render: (course: Course) => (
        <div className="flex items-center gap-4">
          <div className="w-16 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Image size={20} />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{course.title}</p>
            <p className="text-xs text-gray-400">
              Level: {course.level} • {course.modules.length} modules
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'price',
      header: 'Price',
      width: '100px',
      render: (course: Course) => (
        <div>
          <span className="text-sm font-bold text-gray-900">{formatPrice(course)}</span>
          {course.pricing.discountPrice && (
            <span className="text-xs text-gray-400 line-through ml-2">€{course.pricing.price}</span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (course: Course) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={course.isPublished ? 'published' : 'draft'} />
          {course.isDraft && (
            <span className="text-[9px] font-bold text-amber-500">Has unsaved changes</span>
          )}
        </div>
      )
    },
    {
      key: 'enrolled',
      header: 'Enrolled',
      width: '80px',
      render: (course: Course) => (
        <div className="flex items-center gap-2">
          <Users size={14} className="text-gray-400" />
          <span className="text-sm font-bold text-gray-700">
            {enrollmentCounts[course.id] || 0}
          </span>
        </div>
      )
    },
    {
      key: 'progress',
      header: 'Avg Progress',
      width: '120px',
      render: (course: Course) => (
        <ProgressBar value={avgProgress[course.id] || 0} size="sm" />
      )
    },
    {
      key: 'actions',
      header: '',
      width: '150px',
      render: (course: Course) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate('admin-course-edit', course.id); }}
            className="p-2 hover:bg-purple-50 rounded-xl text-gray-400 hover:text-purple-600 transition-all"
            title="Edit course"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); window.location.hash = `#syllabus-${course.id}`; }}
            className="p-2 hover:bg-blue-50 rounded-xl text-gray-400 hover:text-blue-600 transition-all"
            title="Preview as student"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleTogglePublish(course); }}
            className={`p-2 rounded-xl transition-all ${
              course.isPublished 
                ? 'hover:bg-amber-50 text-green-500 hover:text-amber-600' 
                : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
            }`}
            title={course.isPublished ? 'Unpublish' : 'Publish'}
          >
            {course.isPublished ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-reveal">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">
            Courses
          </h1>
          <p className="text-gray-500 font-medium">Manage your course catalog</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => onNavigate('admin-course-edit', 'new')}>
          New Course
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Courses</p>
          <p className="text-2xl font-black text-gray-900">{courses.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Published</p>
          <p className="text-2xl font-black text-green-600">{courses.filter(c => c.isPublished).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Drafts</p>
          <p className="text-2xl font-black text-amber-600">{courses.filter(c => !c.isPublished).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Enrollments</p>
          <p className="text-2xl font-black text-purple-600">
            {courses.reduce((sum, c) => sum + coursesApi.getEnrollmentCount(c.id), 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <Select
          value={filters.level || 'all'}
          onChange={(e) => setFilters({ ...filters, level: e.target.value as any })}
          options={[
            { value: 'all', label: 'All Levels' },
            { value: 'A1', label: 'A1 - Beginner' },
            { value: 'A2', label: 'A2 - Elementary' },
            { value: 'B1', label: 'B1 - Intermediate' },
            { value: 'Kids', label: 'Kids' },
          ]}
        />
        <Select
          value={filters.isPublished === undefined ? 'all' : String(filters.isPublished)}
          onChange={(e) => setFilters({ 
            ...filters, 
            isPublished: e.target.value === 'all' ? undefined : e.target.value === 'true' 
          })}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'true', label: 'Published' },
            { value: 'false', label: 'Draft' },
          ]}
        />
      </div>

      {/* Courses Table */}
      <DataTable
        columns={columns}
        data={courses}
        onRowClick={(course) => onNavigate('admin-course-edit', course.id)}
        loading={loading}
        emptyMessage="No courses found"
      />
    </div>
  );
};

export default AdminCourses;
