// ============================================
// Admin Users Management
// ============================================

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, ChevronRight, Mail, Calendar, 
  MoreVertical, Pause, Play, Trash2, Eye, BookOpen, Gift, Plus
} from 'lucide-react';
import { 
  DataTable, StatusBadge, ProgressBar, Button, Input, Select,
  ConfirmModal, Modal
} from './AdminUIComponents';
import { usersApi, coursesApi } from '../../data/supabaseStore';
import { User, UserFilters, Course, UserDetail } from '../../types';

interface AdminUsersProps {
  initialUserId?: string | null;
  onNavigate: (path: string) => void;
}

const AdminUsers: React.FC<AdminUsersProps> = ({ onNavigate, initialUserId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({ search: '', status: 'all' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revokeData, setRevokeData] = useState<{ userId: string; courseId: string } | null>(null);
  const [actionUser, setActionUser] = useState<User | null>(null);
  
  // Grant access modal state
  const [showGrantAccess, setShowGrantAccess] = useState(false);
  const [grantCourseId, setGrantCourseId] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [availableCoursesForGrant, setAvailableCoursesForGrant] = useState<Course[]>([]);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [filters, page]);

  const [detailError, setDetailError] = useState('');
  useEffect(() => {
    if (!initialUserId) return;
    let cancelled = false;
    setDetailError('');
    void usersApi.getById(initialUserId).then(detail => {
      if (cancelled) return;
      if (detail) { setSelectedUser(detail); setShowUserDetail(true); }
      else setDetailError('This student profile could not be found.');
    }).catch(() => { if (!cancelled) setDetailError('Could not load the student profile. Select the student from the list to retry.'); });
    return () => { cancelled = true; };
  }, [initialUserId]);

  // Load available courses when grant modal opens
  useEffect(() => {
    const loadAvailableCourses = async () => {
      if (showGrantAccess && selectedUser) {
        try {
          const available = await usersApi.getAvailableCoursesForUser(selectedUser.id);
          setAvailableCoursesForGrant(available);
        } catch (error) {
          console.error('Error loading available courses:', error);
        }
      }
    };
    loadAvailableCourses();
  }, [showGrantAccess, selectedUser]);

  const loadCourses = async () => {
    try {
      const data = await coursesApi.list();
      setCourses(data);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await usersApi.list(filters, page, 10);
      setUsers(result.data);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = async (user: User) => {
    setDetailError('');
    try {
      const detail = await usersApi.getById(user.id);
      if (detail) {
        setSelectedUser(detail);
        setShowUserDetail(true);
      }
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Could not load user details.');
    }
  };

  const handlePause = (user: User) => {
    setActionUser(user);
    setShowPauseConfirm(true);
  };

  const confirmPause = async () => {
    if (!actionUser) return;
    
    try {
      if (actionUser.status === 'paused') {
        await usersApi.unpause(actionUser.id);
      } else {
        await usersApi.pause(actionUser.id);
      }
      
      setShowPauseConfirm(false);
      setActionUser(null);
      loadUsers();
      
      // Refresh detail if open
      if (selectedUser?.id === actionUser.id) {
        const updated = await usersApi.getById(actionUser.id);
        if (updated) setSelectedUser(updated);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleDelete = (user: User) => {
    setActionUser(user);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!actionUser) return;
    try {
      await usersApi.delete(actionUser.id);
      setShowDeleteConfirm(false);
      setActionUser(null);
      setShowUserDetail(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleRevokeAccess = (userId: string, courseId: string) => {
    setRevokeData({ userId, courseId });
    setShowRevokeConfirm(true);
  };

  const confirmRevoke = async () => {
    if (!revokeData) return;
    try {
      await usersApi.revokeAccess(revokeData.userId, revokeData.courseId);
      setShowRevokeConfirm(false);
      setRevokeData(null);
      
      // Refresh user detail
      if (selectedUser) {
        const updated = await usersApi.getById(selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    } catch (error) {
      console.error('Error revoking access:', error);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedUser || !grantCourseId) return;
    try {
      const result = await usersApi.grantAccess(selectedUser.id, grantCourseId, grantReason);
      if (result.success) {
        setShowGrantAccess(false);
        setGrantCourseId('');
        setGrantReason('');
        // Refresh user detail
        const updated = await usersApi.getById(selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    } catch (error) {
      console.error('Error granting access:', error);
      alert('Failed to grant access');
    }
  };

  const [userDetailsCache, setUserDetailsCache] = useState<Record<string, { enrollments: number | null; avgProgress: number | null }>>({});
  useEffect(() => {
    let cancelled = false;
    setUserDetailsCache({});
    void Promise.all(users.map(async user => {
      try {
        const detail = await usersApi.getById(user.id);
        const avgProgress = detail.progress.length
          ? Math.round(detail.progress.reduce((sum, p) => sum + p.percentage, 0) / detail.progress.length)
          : null;
        return [user.id, { enrollments: detail.enrollments.length, avgProgress }] as const;
      } catch {
        return [user.id, { enrollments: null, avgProgress: null }] as const;
      }
    })).then(rows => { if (!cancelled) setUserDetailsCache(Object.fromEntries(rows)); });
    return () => { cancelled = true; };
  }, [users]);

  const columns = [
    {
      key: 'name',
      header: 'User',
      width: '2fr',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            {user.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Role',
      width: '100px',
      render: (user: User) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${
          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
          user.role === 'editor' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {user.role}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (user: User) => <StatusBadge status={user.status} />
    },
    {
      key: 'enrolled',
      header: 'Enrolled',
      width: '80px',
      render: (user: User) => {
        const enrollments = userDetailsCache[user.id]?.enrollments;
        return <span className="text-sm font-bold text-gray-700">{enrollments === undefined ? '…' : enrollments === null ? 'Unavailable' : enrollments}</span>;
      }
    },
    {
      key: 'progress',
      header: 'Progress',
      width: '150px',
      render: (user: User) => {
        const avgProgress = userDetailsCache[user.id]?.avgProgress;
        return avgProgress == null ? <span className="text-gray-400">—</span> : <ProgressBar value={avgProgress} size="sm" />;
      }
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      render: (user: User) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); handleViewUser(user); }}
            className="p-2 hover:bg-purple-50 rounded-xl text-gray-400 hover:text-purple-600 transition-all"
            title="View details"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handlePause(user); }}
            className="p-2 hover:bg-amber-50 rounded-xl text-gray-400 hover:text-amber-600 transition-all"
            title={user.status === 'paused' ? 'Unpause' : 'Pause'}
          >
            {user.status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(user); }}
            className="p-2 hover:bg-pink-50 rounded-xl text-gray-400 hover:text-pink-600 transition-all"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-reveal">
      {detailError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{detailError}</p>}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">
            Users
          </h1>
          <p className="text-gray-500 font-medium">Manage your students and their access</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <Select
          value={filters.role || 'all'}
          onChange={(e) => setFilters({ ...filters, role: e.target.value as any })}
          options={[
            { value: 'all', label: 'All Roles' },
            { value: 'student', label: 'Students' },
            { value: 'admin', label: 'Admins' },
            { value: 'editor', label: 'Editors' },
          ]}
        />
        <Select
          value={filters.status || 'all'}
          onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'paused', label: 'Paused' },
          ]}
        />
        <Select
          value={filters.courseId || ''}
          onChange={(e) => setFilters({ ...filters, courseId: e.target.value || undefined })}
          options={[
            { value: '', label: 'All Courses' },
            ...courses.map(c => ({ value: c.id, label: c.title }))
          ]}
        />
      </div>

      {/* Users Table */}
      <DataTable
        columns={columns}
        data={users}
        onRowClick={handleViewUser}
        loading={loading}
        emptyMessage="No users found"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                page === i + 1
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* User Detail Modal */}
      <UserDetailDrawer
        user={selectedUser}
        isOpen={showUserDetail}
        onClose={() => { setShowUserDetail(false); setSelectedUser(null); }}
        onPause={handlePause}
        onDelete={handleDelete}
        onRevokeAccess={handleRevokeAccess}
        onGrantAccess={() => setShowGrantAccess(true)}
        onUpdateNotes={async (notes) => {
          if (selectedUser) {
            await usersApi.updateNotes(selectedUser.id, notes);
            const updated = await usersApi.getById(selectedUser.id);
            if (updated) setSelectedUser(updated);
          }
        }}
        onChangeRole={async (role) => {
          if (selectedUser) {
            try {
              await usersApi.changeRole(selectedUser.id, role);
              const updated = await usersApi.getById(selectedUser.id);
              if (updated) setSelectedUser(updated);
              loadUsers();
            } catch (error) {
              console.error('Error changing role:', error);
              alert('Failed to change role');
            }
          }
        }}
      />

      {/* Pause Confirmation */}
      <ConfirmModal
        isOpen={showPauseConfirm}
        onClose={() => { setShowPauseConfirm(false); setActionUser(null); }}
        onConfirm={confirmPause}
        title={actionUser?.status === 'paused' ? 'Unpause Account' : 'Pause Account'}
        message={actionUser?.status === 'paused' 
          ? `Are you sure you want to unpause ${actionUser?.name}'s account?`
          : `Are you sure you want to pause ${actionUser?.name}'s account? They will lose access to all courses.`
        }
        confirmText={actionUser?.status === 'paused' ? 'Unpause' : 'Pause'}
        confirmType="warning"
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setActionUser(null); }}
        onConfirm={confirmDelete}
        title="Delete Account"
        message={`This will permanently delete ${actionUser?.name}'s account and all their progress. This action cannot be undone.`}
        confirmText="Delete"
        confirmType="danger"
        requireTypedConfirmation="DELETE"
      />

      {/* Revoke Access Confirmation */}
      <ConfirmModal
        isOpen={showRevokeConfirm}
        onClose={() => { setShowRevokeConfirm(false); setRevokeData(null); }}
        onConfirm={confirmRevoke}
        title="Revoke Course Access"
        message="Are you sure you want to revoke this user's access to this course? Their progress will be preserved but they won't be able to access the content."
        confirmText="Revoke Access"
        confirmType="warning"
      />

      {/* Grant Access Modal */}
      <Modal 
        isOpen={showGrantAccess} 
        onClose={() => { setShowGrantAccess(false); setGrantCourseId(''); setGrantReason(''); }} 
        title="Grant Course Access" 
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-purple-50 rounded-2xl p-4 flex items-center gap-3">
            <Gift size={20} className="text-purple-600" />
            <p className="text-sm text-purple-700">
              Grant <span className="font-bold">{selectedUser?.name}</span> free access to a course without payment.
            </p>
          </div>
          
          <Select
            label="Select Course"
            value={grantCourseId}
            onChange={(e) => setGrantCourseId(e.target.value)}
            options={[
              { value: '', label: 'Choose a course...' },
              ...availableCoursesForGrant.map(c => ({ 
                value: c.id, 
                label: `${c.title} (${c.level})` 
              }))
            ]}
          />
          
          <Input
            label="Reason (Optional)"
            value={grantReason}
            onChange={(e) => setGrantReason(e.target.value)}
            placeholder="e.g., Scholarship, Free trial, Beta tester, Promo code..."
            hint="This will be logged in the audit trail"
          />
          
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => { setShowGrantAccess(false); setGrantCourseId(''); setGrantReason(''); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleGrantAccess} disabled={!grantCourseId} icon={Gift}>
              Grant Access
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================
// User Detail Drawer
// ============================================
interface UserDetailDrawerProps {
  user: UserDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onPause: (user: User) => void;
  onDelete: (user: User) => void;
  onRevokeAccess: (userId: string, courseId: string) => void;
  onGrantAccess: () => void;
  onUpdateNotes: (notes: string) => void;
  onChangeRole: (role: 'student' | 'admin' | 'editor') => void;
}

const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  user, isOpen, onClose, onPause, onDelete, onRevokeAccess, onGrantAccess, onUpdateNotes, onChangeRole
}) => {
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);

  useEffect(() => {
    if (user) {
      setNotes(user.adminNotes || '');
    }
  }, [user]);

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Details" size="lg">
      <div className="space-y-8">
        {/* User Header */}
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl font-black text-gray-900">{user.name}</h3>
              <StatusBadge status={user.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Mail size={14} />
                {user.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Role Management */}
        <div className="bg-purple-50 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-purple-900 uppercase tracking-widest mb-1">User Role</h4>
              <p className="text-xs text-purple-600">Change this user's access level</p>
            </div>
            <select
              value={user.role}
              onChange={(e) => onChangeRole(e.target.value as 'student' | 'admin' | 'editor')}
              className="px-4 py-2 bg-white border border-purple-200 rounded-xl text-sm font-bold text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="student">Student</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
          {user.account ? <><p>Email: {user.account.confirmedAt ? 'Confirmed' : 'Unconfirmed'}</p><p className="mt-1">Last sign-in: {user.account.lastSignInAt ? new Date(user.account.lastSignInAt).toLocaleString() : 'Not recorded'}</p></> : <p>No authentication account is linked to this profile.</p>}
        </div>
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-gray-900">{user.enrollments.length}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Courses</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <div className="text-lg font-black text-gray-900">
              {user.spentByCurrency?.length ? user.spentByCurrency.map(row => <p key={row.currency}>{new Intl.NumberFormat(undefined, {style:'currency',currency:row.currency}).format(row.amount)}</p>) : <p>No paid orders</p>}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Net Paid Orders</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-gray-900">
              {user.progress.length 
                ? Math.round(user.progress.reduce((s, p) => s + p.percentage, 0) / user.progress.length)
                : '—'}{user.progress.length ? '%' : ''}
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Avg Progress</p>
          </div>
        </div>

        {/* Enrolled Courses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <BookOpen size={16} className="text-purple-600" />
              Enrolled Courses
            </h4>
            <button
              onClick={onGrantAccess}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-200 transition-all"
            >
              <Gift size={12} />
              Grant Access
            </button>
          </div>
          {user.enrollments.length === 0 ? (
            <p className="text-gray-400 text-sm">No enrollments yet</p>
          ) : (
            <div className="space-y-3">
              {user.enrollments.map((enrollment) => {
                const progress = user.progress.find(p => p.courseId === enrollment.courseId);
                return (
                  <div key={enrollment.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{enrollment.course.title}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <StatusBadge status={enrollment.status} />
                        <span className="text-xs text-gray-400">
                          Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="w-32">
                      {progress ? <><ProgressBar value={progress.percentage} size="sm" />{progress.total !== undefined && <p className="mt-1 text-xs text-gray-500">{progress.completed} / {progress.total} {progress.kind === 'live' ? 'classes attended' : 'items completed'}</p>}</> : <p className="text-xs text-gray-500">Not applicable</p>}
                    </div>
                    {enrollment.status === 'active' && (
                      <button
                        onClick={() => onRevokeAccess(user.id, enrollment.courseId)}
                        className="p-2 hover:bg-pink-50 rounded-xl text-gray-400 hover:text-pink-600 transition-all"
                        title="Revoke access"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Admin Notes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">
              Admin Notes
            </h4>
            {!editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-[10px] font-black text-purple-600 uppercase tracking-widest hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={3}
                placeholder="Add internal notes about this user..."
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setEditingNotes(false); setNotes(user.adminNotes || ''); }}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={() => { onUpdateNotes(notes); setEditingNotes(false); }}>
                  Save Notes
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-2xl p-4">
              {user.adminNotes || 'No notes yet'}
            </p>
          )}
        </div>

        {/* Last Activity */}
        <div className="text-xs text-gray-400">
          Last active: {new Date(user.lastActivityAt).toLocaleString()}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button
            variant="secondary"
            onClick={() => onPause(user)}
            icon={user.status === 'paused' ? Play : Pause}
          >
            {user.status === 'paused' ? 'Unpause Account' : 'Pause Account'}
          </Button>
          <Button
            variant="danger"
            onClick={() => onDelete(user)}
            icon={Trash2}
          >
            Delete Account
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AdminUsers;
