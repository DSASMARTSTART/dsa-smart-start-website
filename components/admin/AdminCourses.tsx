// ============================================
// Admin Courses Management
// ============================================

import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Edit, Eye, ChevronRight, DollarSign,
  Users, BarChart, ToggleLeft, ToggleRight, Image, Trash2,
  ChevronLeft, Square, CheckSquare, XCircle
} from 'lucide-react';
import { 
  DataTable, StatusBadge, ProgressBar, Button, Select, ConfirmModal
} from './AdminUIComponents';
import { coursesApi } from '../../data/supabaseStore';
import { Course, CourseFilters } from '../../types';

interface AdminCoursesProps {
  onNavigate: (path: string, params?: string) => void;
}

const ITEMS_PER_PAGE = 10;

const AdminCourses: React.FC<AdminCoursesProps> = ({ onNavigate }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]); // For stats calculation
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CourseFilters>({ search: '' });
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [avgProgress, setAvgProgress] = useState<Record<string, number>>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);
  
  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Multi-select state for bulk operations
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  useEffect(() => {
    loadCourses();
  }, [filters, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      // Use listForAdmin to include ALL courses (drafts, unpublished, etc.)
      let data = await coursesApi.listForAdmin();
      
      // Store all courses for stats (before filtering)
      setAllCourses(data);
      
      // Apply search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        data = data.filter(c => 
          c.title.toLowerCase().includes(searchLower) ||
          c.description?.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply level filter
      if (filters.level && filters.level !== 'all') {
        data = data.filter(c => c.level === filters.level);
      }
      
      // Apply status filter
      if (filters.isPublished !== undefined) {
        data = data.filter(c => c.isPublished === filters.isPublished);
      }
      
      setTotalCourses(data.length);
      
      // Apply pagination
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const paginatedData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
      setCourses(paginatedData);
      
      // Load enrollment counts and progress for each course
      const counts: Record<string, number> = {};
      const progress: Record<string, number> = {};
      for (const course of paginatedData) {
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

  const handleDeleteClick = (course: Course) => {
    setDeleteTarget(course);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    setDeleting(true);
    try {
      await coursesApi.delete(deleteTarget.id);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      setSelectedCourses(prev => {
        const newSet = new Set(prev);
        newSet.delete(deleteTarget.id);
        return newSet;
      });
      loadCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Bulk selection handlers
  const toggleSelectCourse = (courseId: string) => {
    setSelectedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCourses.size === courses.length) {
      // Deselect all
      setSelectedCourses(new Set());
    } else {
      // Select all on current page
      setSelectedCourses(new Set(courses.map(c => c.id)));
    }
  };

  const clearSelection = () => {
    setSelectedCourses(new Set());
  };

  const confirmBulkDelete = async () => {
    if (selectedCourses.size === 0) return;
    
    setDeleting(true);
    try {
      // Delete all selected courses
      const courseIds: string[] = Array.from(selectedCourses);
      for (const id of courseIds) {
        try {
          await coursesApi.delete(id);
        } catch (err) {
          console.error(`Error deleting course ${id}:`, err);
        }
      }
      
      setShowBulkDeleteConfirm(false);
      setSelectedCourses(new Set());
      loadCourses();
    } catch (error) {
      console.error('Error during bulk delete:', error);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCourses / ITEMS_PER_PAGE);

  const formatPrice = (course: Course) => {
    if (course.pricing.isFree) return 'FREE';
    const price = course.pricing.discountPrice || course.pricing.price;
    return `€${price}`;
  };

  const columns = [
    {
      key: 'select',
      header: (
        <button
          onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title={selectedCourses.size === courses.length ? 'Deselect all' : 'Select all'}
        >
          {selectedCourses.size === courses.length && courses.length > 0 ? (
            <CheckSquare size={18} className="text-purple-600" />
          ) : (
            <Square size={18} className="text-gray-400" />
          )}
        </button>
      ),
      width: '50px',
      render: (course: Course) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleSelectCourse(course.id); }}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          {selectedCourses.has(course.id) ? (
            <CheckSquare size={18} className="text-purple-600" />
          ) : (
            <Square size={18} className="text-gray-400" />
          )}
        </button>
      )
    },
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
      width: '140px',
      render: (course: Course) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={course.isPublished ? 'published' : 'draft'} />
          {!course.isPublished && !course.wizardCompleted && (
            <span className="text-[9px] font-bold text-amber-600">
              Step {course.wizardStep || 1} of {course.productType === 'ebook' ? 3 : 4}
            </span>
          )}
          {course.isDraft && course.wizardCompleted && (
            <span className="text-[9px] font-bold text-blue-500">Ready to publish</span>
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
      width: '180px',
      render: (course: Course) => (
        <div className="flex items-center gap-1 justify-end">
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
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(course); }}
            className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-600 transition-all"
            title="Delete course"
          >
            <Trash2 size={16} />
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
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Courses</p>
          <p className="text-2xl font-black text-gray-900">{allCourses.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Published</p>
          <p className="text-2xl font-black text-green-600">{allCourses.filter(c => c.isPublished).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">In Progress</p>
          <p className="text-2xl font-black text-amber-600">{allCourses.filter(c => !c.isPublished && !c.wizardCompleted).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Ready to Publish</p>
          <p className="text-2xl font-black text-blue-600">{allCourses.filter(c => !c.isPublished && c.wizardCompleted).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Enrollments</p>
          <p className="text-2xl font-black text-purple-600">
            {(Object.values(enrollmentCounts) as number[]).reduce((sum, count) => sum + count, 0)}
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
            { value: 'false', label: 'All Drafts' },
          ]}
        />
      </div>

      {/* Bulk Action Bar - shows when courses are selected */}
      {selectedCourses.size > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between animate-reveal">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-purple-700">
              {selectedCourses.size} course{selectedCourses.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
            >
              <XCircle size={14} />
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => setShowBulkDeleteConfirm(true)}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Courses Table */}
      <DataTable
        columns={columns}
        data={courses}
        onRowClick={(course) => onNavigate('admin-course-edit', course.id)}
        loading={loading}
        emptyMessage="No courses found"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCourses)} of {totalCourses} courses
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                    page === currentPage
                      ? 'bg-purple-600 text-white'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Course"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will also remove all enrollments and student progress. This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete Course"}
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        title="Delete Multiple Courses"
        message={`Are you sure you want to delete ${selectedCourses.size} course${selectedCourses.size > 1 ? 's' : ''}? This will also remove all enrollments and student progress for these courses. This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : `Delete ${selectedCourses.size} Course${selectedCourses.size > 1 ? 's' : ''}`}
        confirmVariant="danger"
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />
    </div>
  );
};

export default AdminCourses;
