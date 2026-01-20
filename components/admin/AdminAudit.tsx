// ============================================
// Admin Audit Log
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  History, Filter, ChevronRight, User, BookOpen, FileText,
  AlertCircle, Check, RefreshCw
} from 'lucide-react';
import { DataTable, Select, Button } from './AdminUIComponents';
import { auditApi } from '../../data/supabaseStore';
import { AuditLog, AuditAction } from '../../types';

interface AdminAuditProps {
  onNavigate: (path: string) => void;
}

const AdminAudit: React.FC<AdminAuditProps> = ({ onNavigate }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await auditApi.list(page, 15);
      setLogs(result.data);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (actionFilter !== 'all' && !log.action.includes(actionFilter)) return false;
    if (entityFilter !== 'all' && log.entityType !== entityFilter) return false;
    return true;
  });

  const getActionIcon = (action: AuditAction) => {
    if (action.includes('user')) return <User size={14} className="text-blue-500" />;
    if (action.includes('course') || action.includes('module') || action.includes('lesson') || action.includes('homework')) {
      return <BookOpen size={14} className="text-purple-500" />;
    }
    if (action.includes('pricing') || action.includes('video')) return <FileText size={14} className="text-amber-500" />;
    return <History size={14} className="text-gray-400" />;
  };

  const getActionColor = (action: AuditAction) => {
    if (action.includes('deleted') || action.includes('revoked')) return 'text-pink-600 bg-pink-50';
    if (action.includes('created') || action.includes('published') || action.includes('added')) return 'text-green-600 bg-green-50';
    if (action.includes('paused') || action.includes('unpublished')) return 'text-amber-600 bg-amber-50';
    return 'text-blue-600 bg-blue-50';
  };

  const formatAction = (action: AuditAction): string => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const columns = [
    {
      key: 'action',
      header: 'Action',
      width: '200px',
      render: (log: AuditLog) => (
        <div className="flex items-center gap-3">
          {getActionIcon(log.action)}
          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getActionColor(log.action)}`}>
            {formatAction(log.action)}
          </span>
        </div>
      )
    },
    {
      key: 'description',
      header: 'Description',
      width: '2fr',
      render: (log: AuditLog) => (
        <p className="text-sm font-medium text-gray-700 truncate">{log.description}</p>
      )
    },
    {
      key: 'admin',
      header: 'By',
      width: '150px',
      render: (log: AuditLog) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold">
            {log.adminName.charAt(0)}
          </div>
          <span className="text-xs font-medium text-gray-600">{log.adminName}</span>
        </div>
      )
    },
    {
      key: 'timestamp',
      header: 'When',
      width: '150px',
      render: (log: AuditLog) => (
        <span className="text-xs text-gray-400">
          {formatTimestamp(log.timestamp)}
        </span>
      )
    },
    {
      key: 'changes',
      header: '',
      width: '80px',
      render: (log: AuditLog) => (
        (log.before || log.after) && (
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
            className="text-[10px] font-black text-purple-600 uppercase tracking-widest hover:underline"
          >
            Details
          </button>
        )
      )
    }
  ];

  return (
    <div className="space-y-6 animate-reveal">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">
            Audit Log
          </h1>
          <p className="text-gray-500 font-medium">Track all administrative actions</p>
        </div>
        <Button variant="secondary" icon={RefreshCw} onClick={loadLogs}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Actions' },
            { value: 'created', label: 'Created' },
            { value: 'updated', label: 'Updated' },
            { value: 'deleted', label: 'Deleted' },
            { value: 'published', label: 'Published' },
            { value: 'paused', label: 'Paused/Unpaused' },
          ]}
        />
        <Select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Entities' },
            { value: 'user', label: 'Users' },
            { value: 'course', label: 'Courses' },
            { value: 'module', label: 'Modules' },
            { value: 'lesson', label: 'Lessons' },
            { value: 'homework', label: 'Homework' },
            { value: 'enrollment', label: 'Enrollments' },
          ]}
        />
      </div>

      {/* Audit Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        loading={loading}
        emptyMessage="No audit logs found"
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

      {/* Detail Modal */}
      {selectedLog && (
        <AuditDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

// ============================================
// Audit Detail Modal
// ============================================
const AuditDetailModal: React.FC<{
  log: AuditLog;
  onClose: () => void;
}> = ({ log, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  // Focus the close button when modal opens
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);
  
  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-detail-title"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
      />
      
      <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-reveal">
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
          <h2 id="audit-detail-title" className="text-xl font-black text-gray-900 uppercase tracking-tight">
            Audit Details
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Action Info */}
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Action</p>
                <p className="text-sm font-bold text-gray-900">{log.action.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Entity</p>
                <p className="text-sm font-bold text-gray-900">{log.entityType} ({log.entityId})</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Admin</p>
                <p className="text-sm font-bold text-gray-900">{log.adminName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Timestamp</p>
                <p className="text-sm font-bold text-gray-900">{new Date(log.timestamp).toLocaleString()}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Description</p>
              <p className="text-sm text-gray-700">{log.description}</p>
            </div>
          </div>

          {/* Changes Diff */}
          {(log.before || log.after) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-pink-500 mb-2 flex items-center gap-2">
                  <AlertCircle size={12} />
                  Before
                </p>
                <pre className="bg-pink-50 rounded-xl p-4 text-xs font-mono text-gray-700 overflow-x-auto">
                  {log.before ? JSON.stringify(log.before, null, 2) : '(empty)'}
                </pre>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-2 flex items-center gap-2">
                  <Check size={12} />
                  After
                </p>
                <pre className="bg-green-50 rounded-xl p-4 text-xs font-mono text-gray-700 overflow-x-auto">
                  {log.after ? JSON.stringify(log.after, null, 2) : '(empty)'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Helper Functions
// ============================================
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

export default AdminAudit;
