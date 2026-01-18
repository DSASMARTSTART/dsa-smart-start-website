// ============================================
// Shared UI Components for Admin Dashboard
// ============================================

import React, { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LucideIcon, AlertTriangle, X, Loader2 } from 'lucide-react';

// ============================================
// KPI Card - Reuses DashboardPage card styling
// ============================================
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  color?: 'purple' | 'blue' | 'green' | 'pink' | 'amber';
}

export const KPICard: React.FC<KPICardProps> = ({ 
  title, value, subtitle, icon: Icon, trend, color = 'purple' 
}) => {
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    pink: 'bg-pink-50 text-pink-600 border-pink-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl ${colorClasses[color]} border flex items-center justify-center`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
            trend.isPositive ? 'bg-green-50 text-green-600' : 'bg-pink-50 text-pink-600'
          }`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{title}</p>
      <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
      {subtitle && (
        <p className="text-xs font-medium text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
};

// ============================================
// Data Table - Skool-style minimal list
// ============================================
interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends { id: string }>({ 
  columns, data, onRowClick, emptyMessage = 'No data found', loading 
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-white rounded-[2rem] border border-gray-100 p-12 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-purple-500" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] border border-gray-100 p-12 text-center">
        <p className="text-gray-400 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="hidden md:grid gap-4 px-6 py-4 border-b border-gray-50 bg-gray-50/50" style={{ gridTemplateColumns: columns.map(c => c.width || '1fr').join(' ') }}>
        {columns.map(col => (
          <div key={col.key} className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {col.header}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-50">
        {data.map((item) => (
          <div
            key={item.id}
            onClick={() => onRowClick?.(item)}
            className={`grid gap-4 px-6 py-4 transition-all ${
              onRowClick ? 'cursor-pointer hover:bg-purple-50/50' : ''
            }`}
            style={{ gridTemplateColumns: columns.map(c => c.width || '1fr').join(' ') }}
          >
            {columns.map(col => (
              <div key={col.key} className="flex items-center">
                {col.render 
                  ? col.render(item) 
                  : <span className="text-sm font-medium text-gray-700">{(item as any)[col.key]}</span>
                }
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Status Badge
// ============================================
interface StatusBadgeProps {
  status: 'active' | 'paused' | 'deleted' | 'published' | 'draft' | 'completed' | 'revoked';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = {
    active: 'bg-green-50 text-green-600 border-green-100',
    published: 'bg-green-50 text-green-600 border-green-100',
    completed: 'bg-blue-50 text-blue-600 border-blue-100',
    paused: 'bg-amber-50 text-amber-600 border-amber-100',
    draft: 'bg-gray-50 text-gray-600 border-gray-200',
    deleted: 'bg-pink-50 text-pink-600 border-pink-100',
    revoked: 'bg-pink-50 text-pink-600 border-pink-100',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${styles[status]}`}>
      {status}
    </span>
  );
};

// ============================================
// Progress Bar
// ============================================
interface ProgressBarProps {
  value: number;
  size?: 'sm' | 'md';
  color?: 'purple' | 'green' | 'blue';
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, size = 'md', color = 'purple', showLabel = true 
}) => {
  const colors = {
    purple: 'bg-purple-600',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 bg-gray-100 rounded-full overflow-hidden ${size === 'sm' ? 'h-1.5' : 'h-2'}`}>
        <div 
          className={`h-full ${colors[color]} transition-all duration-500`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-bold text-gray-600 w-10 text-right">{value}%</span>
      )}
    </div>
  );
};

// ============================================
// Modal - Accessible overlay
// ============================================
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className={`relative bg-white rounded-[2rem] shadow-2xl ${sizeClasses[size]} w-full max-h-[90vh] flex flex-col animate-reveal`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 flex-shrink-0">
          <h2 id="modal-title" className="text-xl font-black text-gray-900 uppercase tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2.5 bg-gray-100 hover:bg-red-100 rounded-xl transition-colors group"
            aria-label="Close modal"
          >
            <X size={20} className="text-gray-500 group-hover:text-red-600" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-8 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================
// Confirm Modal - For destructive actions
// ============================================
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmType?: 'danger' | 'warning';
  requireTypedConfirmation?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, onClose, onConfirm, title, message, 
  confirmText = 'Confirm', confirmType = 'warning', 
  requireTypedConfirmation 
}) => {
  const [typedValue, setTypedValue] = React.useState('');
  const canConfirm = !requireTypedConfirmation || typedValue === requireTypedConfirmation;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
      setTypedValue('');
    }
  };

  const handleClose = () => {
    setTypedValue('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="text-center">
        <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
          confirmType === 'danger' ? 'bg-pink-50' : 'bg-amber-50'
        }`}>
          <AlertTriangle size={32} className={confirmType === 'danger' ? 'text-pink-500' : 'text-amber-500'} />
        </div>
        
        <p className="text-gray-600 mb-6">{message}</p>

        {requireTypedConfirmation && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">
              Type <strong className="text-pink-600">{requireTypedConfirmation}</strong> to confirm:
            </p>
            <input
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 border border-gray-200 rounded-2xl text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 px-6 py-3 rounded-2xl font-bold text-sm text-white transition-all ${
              confirmType === 'danger'
                ? 'bg-pink-500 hover:bg-pink-600 disabled:bg-pink-200'
                : 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200'
            } disabled:cursor-not-allowed`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================
// Button Components
// ============================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', size = 'md', loading, icon: Icon, className = '', ...props 
}) => {
  const variants = {
    primary: 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-100',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-pink-500 text-white hover:bg-pink-600 shadow-lg shadow-pink-100',
    ghost: 'text-gray-600 hover:bg-gray-50',
  };

  const sizes = {
    sm: 'px-3 py-2 text-[10px]',
    md: 'px-5 py-3 text-[11px]',
    lg: 'px-8 py-4 text-xs',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : Icon ? (
        <Icon size={14} />
      ) : null}
      {children}
    </button>
  );
};

// ============================================
// Input Components
// ============================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, hint, className = '', ...props }) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 border rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
          error ? 'border-pink-300 bg-pink-50/50' : 'border-gray-200 bg-white'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs font-medium text-pink-500">{error}</p>}
      {hint && !error && <p className="text-xs font-medium text-gray-400">{hint}</p>}
    </div>
  );
};

// ============================================
// Select Components
// ============================================
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          {label}
        </label>
      )}
      <select
        className={`w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none cursor-pointer ${className}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

// ============================================
// Textarea Components
// ============================================
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-4 py-3 border rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none ${
          error ? 'border-pink-300 bg-pink-50/50' : 'border-gray-200 bg-white'
        } ${className}`}
        rows={4}
        {...props}
      />
      {error && <p className="text-xs font-medium text-pink-500">{error}</p>}
    </div>
  );
};

// ============================================
// Unsaved Changes Bar
// ============================================
interface UnsavedChangesBarProps {
  show: boolean;
  lastPublished?: string;
  onSave: () => void;
  onDiscard: () => void;
  saving?: boolean;
}

export const UnsavedChangesBar: React.FC<UnsavedChangesBarProps> = ({ 
  show, lastPublished, onSave, onDiscard, saving 
}) => {
  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-50 bg-amber-50 border-t border-amber-200 px-6 py-4 animate-reveal">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-amber-800">You have unsaved changes</p>
          {lastPublished && (
            <p className="text-xs text-amber-600">Last published: {new Date(lastPublished).toLocaleDateString()}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            Discard
          </Button>
          <Button variant="primary" size="sm" onClick={onSave} loading={saving}>
            Save & Publish
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Activity Item - For activity feed
// ============================================
interface ActivityItemProps {
  type: string;
  description: string;
  timestamp: string;
  userName?: string;
  courseName?: string;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ 
  type, description, timestamp, userName, courseName 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'lesson_completed':
      case 'homework_completed':
        return '✅';
      case 'course_enrolled':
      case 'course_purchased':
        return '🎉';
      case 'course_completed':
        return '🏆';
      case 'admin_edit':
        return '✏️';
      default:
        return '📝';
    }
  };

  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-50 last:border-0">
      <span className="text-xl">{getIcon()}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 truncate">{description}</p>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
};
