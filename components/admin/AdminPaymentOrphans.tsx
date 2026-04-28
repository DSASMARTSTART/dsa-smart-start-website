// ============================================
// Admin Payment Orphans - Reconciliation UI
// Lists unmatched provider payment notifications and lets an admin
// (a) match them to a user + course → confirm (creates purchase + enrollment),
// (b) mark as refunded, or
// (c) dismiss as test/noise.
// All mutations go through the resolve_payment_orphan SECURITY DEFINER RPC.
// ============================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, RefreshCw, CheckCircle, XCircle, FileWarning,
  CreditCard, Mail, Calendar, DollarSign, Code2,
} from 'lucide-react';
import {
  Button, Modal, ConfirmModal, Input, Select, Textarea,
  StatusBadge, KPICard,
} from './AdminUIComponents';
import {
  paymentOrphansApi,
  coursesApi,
  usersApi,
  type PaymentOrphan,
} from '../../data/supabaseStore';
import type { Course, User } from '../../types';

interface AdminPaymentOrphansProps {
  onNavigate: (path: string) => void;
}

const formatAmount = (amount: number | null, currency: string | null) => {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  } catch {
    return `${amount} ${currency || ''}`.trim();
  }
};

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
};

const AdminPaymentOrphans: React.FC<AdminPaymentOrphansProps> = ({ onNavigate: _onNavigate }) => {
  const [orphans, setOrphans] = useState<PaymentOrphan[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [selected, setSelected] = useState<PaymentOrphan | null>(null);
  const [confirmModal, setConfirmModal] = useState<
    { type: 'refunded' | 'dismiss'; orphan: PaymentOrphan } | null
  >(null);

  // Confirm-action form state
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void loadOrphans();
  }, [includeResolved]);

  // Load courses once for the confirm dropdown
  useEffect(() => {
    void coursesApi.list().then(setCourses).catch(() => setCourses([]));
  }, []);

  const loadOrphans = async () => {
    setLoading(true);
    try {
      const data = await paymentOrphansApi.list(includeResolved);
      setOrphans(data);
    } finally {
      setLoading(false);
    }
  };

  // Lazy user search (when admin opens "match" modal and types an email)
  useEffect(() => {
    if (!selected) return;
    const handle = setTimeout(async () => {
      try {
        const result = await usersApi.getStudents(
          { role: 'all', search: userSearch || selected.customerEmail || '' },
          1,
          25,
        );
        setUsers(result.data);
      } catch {
        setUsers([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [selected, userSearch]);

  const stats = useMemo(() => {
    const unresolved = orphans.filter(o => !o.resolved).length;
    const resolved = orphans.filter(o => o.resolved).length;
    const totalAmount = orphans
      .filter(o => !o.resolved)
      .reduce((sum, o) => sum + (o.amount || 0), 0);
    return { unresolved, resolved, totalAmount };
  }, [orphans]);

  const openConfirm = (orphan: PaymentOrphan) => {
    setSelected(orphan);
    setSelectedUserId('');
    setSelectedCourseId('');
    setUserSearch(orphan.customerEmail || '');
    setResolutionNotes('');
    setActionError(null);
  };

  const closeConfirm = () => {
    setSelected(null);
    setActionBusy(false);
    setActionError(null);
  };

  const submitConfirm = async () => {
    if (!selected) return;
    if (!selectedUserId || !selectedCourseId) {
      setActionError('Select both a user and a course before confirming.');
      return;
    }
    setActionBusy(true);
    setActionError(null);
    const result = await paymentOrphansApi.resolve({
      orphanId: selected.id,
      action: 'confirm',
      userId: selectedUserId,
      courseId: selectedCourseId,
      notes: resolutionNotes || undefined,
    });
    setActionBusy(false);
    if (!result.success) {
      setActionError(result.error || 'Resolution failed');
      return;
    }
    closeConfirm();
    void loadOrphans();
  };

  const submitSimpleAction = async (action: 'refunded' | 'dismiss', notes?: string) => {
    if (!confirmModal) return;
    const result = await paymentOrphansApi.resolve({
      orphanId: confirmModal.orphan.id,
      action,
      notes,
    });
    if (!result.success) {
      // Surface as a banner on the row; reload either way
      console.error('Orphan resolve failed:', result.error);
    }
    setConfirmModal(null);
    void loadOrphans();
  };

  return (
    <div className="space-y-8 animate-reveal">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600 px-3 py-1 bg-amber-50 rounded-full border border-amber-100">
              Payment Reconciliation
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase">
            Payment Orphans
          </h1>
          <p className="text-gray-500 font-medium">
            Provider notifications that could not be matched to a pending purchase.
            Resolve each one to keep customers' access in sync.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={loadOrphans}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            variant={includeResolved ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setIncludeResolved(v => !v)}
          >
            {includeResolved ? 'Hide Resolved' : 'Show Resolved'}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Unresolved"
          value={stats.unresolved}
          icon={AlertTriangle}
          color={stats.unresolved > 0 ? 'pink' : 'green'}
        />
        <KPICard
          title="Outstanding Amount"
          value={formatAmount(stats.totalAmount, 'EUR')}
          icon={DollarSign}
          color="amber"
        />
        <KPICard
          title="Resolved (loaded)"
          value={stats.resolved}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Orphan list */}
      {loading ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 p-12 text-center">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : orphans.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-100">
            <CheckCircle size={28} className="text-green-500" />
          </div>
          <p className="text-gray-700 font-bold">No payment orphans 🎉</p>
          <p className="text-gray-500 text-sm font-medium">
            Every provider notification has been matched to a purchase.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orphans.map(orphan => (
            <OrphanRow
              key={orphan.id}
              orphan={orphan}
              onConfirm={() => openConfirm(orphan)}
              onRefunded={() => setConfirmModal({ type: 'refunded', orphan })}
              onDismiss={() => setConfirmModal({ type: 'dismiss', orphan })}
            />
          ))}
        </div>
      )}

      {/* Confirm (match) modal */}
      <Modal
        isOpen={!!selected}
        onClose={closeConfirm}
        title="Match orphan to user & course"
        size="lg"
      >
        {selected && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <FileWarning size={18} className="text-amber-600 mt-0.5" />
                <div className="text-xs text-amber-900 font-medium">
                  Confirming will create a completed purchase row + active enrollment for
                  the selected user. Use this only after verifying the payment was genuinely
                  received in the provider portal.
                </div>
              </div>
            </div>

            <OrphanSummary orphan={selected} />

            <Input
              label="Search user by name or email"
              placeholder="customer@example.com"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              hint="Pre-filled from the orphan's customer_email when available."
            />

            <Select
              label="User"
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              options={[
                { value: '', label: '— Select a user —' },
                ...users.map(u => ({
                  value: u.id,
                  label: `${u.name} (${u.email})`,
                })),
              ]}
            />

            <Select
              label="Course / Product"
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              options={[
                { value: '', label: '— Select a course —' },
                ...courses.map(c => ({
                  value: c.id,
                  label: `${c.title} — ${formatAmount(
                    c.pricing?.discountPrice ?? c.pricing?.price ?? null,
                    c.pricing?.currency ?? 'EUR',
                  )}`,
                })),
              ]}
            />

            <Textarea
              label="Resolution notes (optional)"
              placeholder="e.g. matched against RaiAccept transaction RA-12345 in admin portal"
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              rows={3}
            />

            {actionError && (
              <div className="text-sm font-medium text-pink-600 bg-pink-50 border border-pink-100 rounded-2xl px-4 py-3">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={closeConfirm} disabled={actionBusy}>
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={CheckCircle}
                onClick={submitConfirm}
                loading={actionBusy}
              >
                Confirm & Grant Access
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Refunded / Dismiss confirm */}
      <ConfirmModal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={() =>
          confirmModal && submitSimpleAction(confirmModal.type, undefined)
        }
        title={
          confirmModal?.type === 'refunded'
            ? 'Mark orphan as refunded'
            : 'Dismiss orphan as test'
        }
        message={
          confirmModal?.type === 'refunded'
            ? 'This will mark the orphan as resolved without granting any access. Use when the payment was reversed in the provider portal.'
            : 'This will mark the orphan as resolved with no further action. Use only for sandbox / test notifications that reached production.'
        }
        confirmText={confirmModal?.type === 'refunded' ? 'Mark refunded' : 'Dismiss'}
        confirmType="warning"
      />
    </div>
  );
};

// ============================================
// One row in the list
// ============================================
interface OrphanRowProps {
  orphan: PaymentOrphan;
  onConfirm: () => void;
  onRefunded: () => void;
  onDismiss: () => void;
}

const OrphanRow: React.FC<OrphanRowProps> = ({ orphan, onConfirm, onRefunded, onDismiss }) => {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
              <CreditCard size={12} />
              {orphan.provider}
            </span>
            {orphan.resolved ? (
              <StatusBadge status="completed" />
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-amber-50 text-amber-600 border-amber-100">
                Unresolved
              </span>
            )}
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {orphan.reason}
            </span>
          </div>

          <OrphanSummary orphan={orphan} compact />
        </div>

        {!orphan.resolved && (
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
            <Button variant="primary" size="sm" icon={CheckCircle} onClick={onConfirm}>
              Match & Confirm
            </Button>
            <Button variant="secondary" size="sm" icon={DollarSign} onClick={onRefunded}>
              Mark Refunded
            </Button>
            <Button variant="ghost" size="sm" icon={XCircle} onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        )}
      </div>

      {/* Raw payload toggle */}
      <div className="mt-4 pt-4 border-t border-gray-50">
        <button
          onClick={() => setShowRaw(v => !v)}
          className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-purple-600 transition-colors flex items-center gap-2"
        >
          <Code2 size={12} />
          {showRaw ? 'Hide raw payload' : 'Show raw payload'}
        </button>
        {showRaw && (
          <pre className="mt-3 bg-gray-900 text-gray-100 text-[11px] font-mono p-4 rounded-2xl overflow-x-auto max-h-72">
            {JSON.stringify(orphan.providerResponse, null, 2)}
          </pre>
        )}
        {orphan.resolved && orphan.resolutionNotes && (
          <p className="mt-3 text-xs text-gray-500 font-medium">
            <span className="font-black uppercase tracking-widest text-gray-400">Notes:</span>{' '}
            {orphan.resolutionNotes}
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================
// Compact summary block, reused in row + modal
// ============================================
const OrphanSummary: React.FC<{ orphan: PaymentOrphan; compact?: boolean }> = ({
  orphan,
  compact,
}) => {
  return (
    <div
      className={`grid gap-3 ${
        compact ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'
      }`}
    >
      <Field label="Transaction ID" value={orphan.transactionId || '—'} mono />
      <Field
        label="Amount"
        value={formatAmount(orphan.amount, orphan.currency)}
        icon={DollarSign}
      />
      <Field label="Customer" value={orphan.customerEmail || '—'} icon={Mail} />
      <Field label="Created" value={formatDate(orphan.createdAt)} icon={Calendar} />
      {!compact && orphan.merchantOrderReference && (
        <Field label="Merchant Order" value={orphan.merchantOrderReference} mono />
      )}
      {!compact && orphan.orderIdentification && (
        <Field label="Order ID" value={orphan.orderIdentification} mono />
      )}
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
  mono?: boolean;
}> = ({ label, value, icon: Icon, mono }) => (
  <div>
    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
      {label}
    </p>
    <p
      className={`text-sm font-bold text-gray-900 truncate flex items-center gap-1.5 ${
        mono ? 'font-mono text-xs' : ''
      }`}
      title={value}
    >
      {Icon && <Icon size={12} className="text-gray-400 shrink-0" />}
      {value}
    </p>
  </div>
);

export default AdminPaymentOrphans;
