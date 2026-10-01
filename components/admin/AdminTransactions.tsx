// ============================================
// Admin Transactions Management
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Filter, Download, Calendar, CreditCard, Tag, User as UserIcon,
  ChevronLeft, ChevronRight, RefreshCw, FileText, DollarSign, TrendingUp, Mail, Check
} from 'lucide-react';
import { 
  DataTable, StatusBadge, Button, Input, Select, KPICard
} from './AdminUIComponents';
import { analyticsCsv } from '../../lib/adminAnalytics';
import { supabase } from '../../lib/supabase';
import { generateAndSendInvoice } from '../../lib/emailService';

// Types for transactions view
interface TransactionWithDetails {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  productType: string;
  amount: number;
  originalAmount: number | null;
  discountAmount: number | null;
  discountCodeId: string | null;
  discountCode: string | null;
  currency: string;
  paymentMethod: string;
  transactionId: string;
  purchasedAt: string;
  invoiceNumber: string | null;
  invoiceEmailSentAt: string | null;
  status: string;
  refundedAmount: number;
}

interface TransactionFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  paymentMethod: string;
  productType: string;
  currency: string;
}

interface TransactionStats {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  discountedOrders: number;
}

interface AdminTransactionsProps {
  onNavigate: (path: string) => void;
}

const AdminTransactions: React.FC<AdminTransactionsProps> = ({ onNavigate }) => {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TransactionStats>({
    totalRevenue: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
    discountedOrders: 0
  });
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    dateFrom: '',
    dateTo: '',
    paymentMethod: 'all',
    productType: 'all', currency: 'EUR'
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 15;
  const loadVersion = useRef(0);
  const [error,setError]=useState('');
  const [exporting,setExporting]=useState(false);
  const [currencies,setCurrencies]=useState<string[]>(['EUR','RSD']);
  const money=(amount:number)=>new Intl.NumberFormat(undefined,{style:'currency',currency:filters.currency}).format(amount);
  useEffect(()=>{setPage(1);},[filters]);
  const [invoiceBusy, setInvoiceBusy] = useState<Record<string, boolean>>({});
  const [refundBusy, setRefundBusy] = useState<Record<string, boolean>>({});
  const [invoiceSuccess, setInvoiceSuccess] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadTransactions();
  }, [filters, page]);

  const loadTransactions = async () => {
    setLoading(true);
    setError('');
    const requestId = ++loadVersion.current;
    try {
      const { data: result, error } = await (supabase as any).rpc('admin_transactions', {p_filters:filters,p_page:page,p_limit:pageSize});
      if (error) throw error;
      if (requestId !== loadVersion.current) return;
      const {data, count} = result;
      setStats(result.stats);
      setCurrencies(result.currencies);

      // Transform data
      const transformed: TransactionWithDetails[] = (data || []).map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        userName: p.users?.name || 'Unknown User',
        userEmail: p.users?.email || 'N/A',
        courseId: p.course_id,
        courseTitle: p.courses?.title || 'Unknown Product',
        productType: p.courses?.product_type || 'course',
        amount: parseFloat(p.amount) || 0,
        originalAmount: p.original_amount ? parseFloat(p.original_amount) : null,
        discountAmount: p.discount_amount ? parseFloat(p.discount_amount) : null,
        discountCodeId: p.discount_code_id,
        discountCode: p.discount_codes?.code || null,
        currency: p.currency || 'EUR',
        paymentMethod: p.payment_method || 'unknown',
        transactionId: p.transaction_id || p.id,
        purchasedAt: p.purchased_at,
        invoiceNumber: null,
        invoiceEmailSentAt: null,
        status: p.status || 'pending',
        refundedAmount: parseFloat(p.refunded_amount) || 0
      }));

      // Fetch invoices for this page's transactions and merge
      const txnIds = Array.from(new Set(transformed.map(t => t.transactionId).filter(Boolean)));
      if (txnIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: invs } = await (supabase as any)
          .from('invoices')
          .select('transaction_id, invoice_number, email_sent_to_customer_at')
          .in('transaction_id', txnIds);
        const invMap = new Map<string, { invoice_number: string; email_sent_to_customer_at: string | null }>();
        for (const inv of (invs || [])) {
          invMap.set(inv.transaction_id, {
            invoice_number: inv.invoice_number,
            email_sent_to_customer_at: inv.email_sent_to_customer_at
          });
        }
        transformed.forEach(t => {
          const inv = invMap.get(t.transactionId);
          if (inv) {
            t.invoiceNumber = inv.invoice_number;
            t.invoiceEmailSentAt = inv.email_sent_to_customer_at;
          }
        });
      }

      if (requestId !== loadVersion.current) return;
      if(requestId !== loadVersion.current)return;
      setTransactions(transformed);
      setTotalPages(Math.ceil((count || 0) / pageSize));
      setError('');
    } catch (error) {
      if(requestId===loadVersion.current)setError(error instanceof Error ? error.message : 'Could not load transactions.');
    } finally {
      if(requestId===loadVersion.current)setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true); setError('');
    try {
      const rows: (string|number|null)[][] = [['Date','Transaction ID','Customer','Email','Product','Currency','Gross amount','Refunded amount','Net amount','Status','Payment method']];
      for (let exportPage=1; ; exportPage++) {
        const {data: result,error} = await (supabase as any).rpc('admin_transactions',{p_filters:filters,p_page:exportPage,p_limit:500});
        if(error) throw error;
        for (const t of result.data) rows.push([t.purchased_at,t.transaction_id,t.users.name,t.users.email,t.courses.title,t.currency,Number(t.amount),Number(t.refunded_amount||0),['completed','refunded'].includes(t.status)?Number(t.amount)-Number(t.refunded_amount||0):0,t.status,t.payment_method]);
        if(exportPage*500>=result.count) break;
      }
      const url = URL.createObjectURL(new Blob([analyticsCsv(rows)], {type:'text/csv;charset=utf-8;'}));
      const link=document.createElement('a'); link.href=url;link.download=`transactions-${filters.currency}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(error) {setError(error instanceof Error ? error.message : 'Export failed.');}
    finally {setExporting(false);}
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodBadge = (method: string) => {
    const styles: Record<string, string> = {
      paypal: 'bg-blue-50 text-blue-600 border-blue-100',
      card: 'bg-purple-50 text-purple-600 border-purple-100',
      raiffeisen: 'bg-amber-50 text-amber-600 border-amber-100',
      manual: 'bg-gray-50 text-gray-600 border-gray-100',
      unknown: 'bg-gray-50 text-gray-400 border-gray-100'
    };
    return styles[method.toLowerCase()] || styles.unknown;
  };

  const getProductTypeBadge = (type: string) => {
    const styles: Record<string, { bg: string; label: string }> = {
      ebook: { bg: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'E-book' },
      learndash: { bg: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: 'Course' },
      service: { bg: 'bg-pink-50 text-pink-600 border-pink-100', label: 'Service' }
    };
    const style = styles[type] || { bg: 'bg-gray-50 text-gray-600 border-gray-100', label: type };
    return style;
  };

  const handleRefund = async (t: TransactionWithDetails) => {
    const remaining = Math.max(0, (t.amount || 0) - (t.refundedAmount || 0));
    if (remaining <= 0) return;
    const reason = window.prompt(
      `Refund ${t.currency} ${remaining.toFixed(2)} for "${t.courseTitle}"?\n\n` +
      `This records the refund, revokes the customer's access, and cannot be undone. ` +
      `Make sure you have already issued the refund in the RaiAccept portal.\n\n` +
      `Optional reason:`,
      ''
    );
    if (reason === null) return; // cancelled
    setRefundBusy((prev) => ({ ...prev, [t.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('refund-purchase', {
        body: { purchaseId: t.id, amount: remaining, reason: reason || undefined },
      });
      if (error || !data?.success) {
        alert(`Refund failed: ${data?.error || error?.message || 'Unknown error'}`);
      } else {
        await loadTransactions();

      }
    } catch (err) {
      console.error('Refund failed:', err);
      alert('Refund failed. Please try again.');
    } finally {
      setRefundBusy((prev) => { const n = { ...prev }; delete n[t.id]; return n; });
    }
  };

  const handleGenerateOrResendInvoice = async (t: TransactionWithDetails) => {
    if (!t.transactionId) return;
    setInvoiceBusy((prev) => ({ ...prev, [t.id]: true }));
    try {
      await generateAndSendInvoice({
        transactionId: t.transactionId,
        userId: t.userId,
        paymentMethod: t.paymentMethod,
        resend: !!t.invoiceNumber,
        force: true,
      });
      setInvoiceSuccess((prev) => ({ ...prev, [t.id]: true }));
      setTimeout(() => {
        setInvoiceSuccess((prev) => { const n = { ...prev }; delete n[t.id]; return n; });
      }, 2500);
      await loadTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invoice delivery failed.');
    } finally {
      setInvoiceBusy((prev) => { const n = { ...prev }; delete n[t.id]; return n; });
    }
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      width: '140px',
      render: (t: TransactionWithDetails) => (
        <div>
          <p className="text-sm font-semibold text-gray-900">{formatDate(t.purchasedAt).split(',')[0]}</p>
          <p className="text-[10px] text-gray-400">{formatDate(t.purchasedAt).split(',')[1]}</p>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Customer',
      width: '1fr',
      render: (t: TransactionWithDetails) => (
        <div>
          <p className="text-sm font-semibold text-gray-900">{t.userName}</p>
          <p className="text-[10px] text-gray-400">{t.userEmail}</p>
        </div>
      )
    },
    {
      key: 'product',
      header: 'Product',
      width: '1.5fr',
      render: (t: TransactionWithDetails) => {
        const typeStyle = getProductTypeBadge(t.productType);
        return (
          <div>
            <p className="text-sm font-semibold text-gray-900 line-clamp-1">{t.courseTitle}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${typeStyle.bg}`}>
              {typeStyle.label}
            </span>
          </div>
        );
      }
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '120px',
      render: (t: TransactionWithDetails) => (
        <div>
          <p className="text-sm font-black text-gray-900">€{t.amount.toFixed(2)}</p>
          {t.discountCode && (
            <p className="text-[10px] text-emerald-600 font-medium">
              <Tag size={10} className="inline mr-1" />
              {t.discountCode}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'payment',
      header: 'Payment',
      width: '100px',
      render: (t: TransactionWithDetails) => (
        <span className={`inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${getPaymentMethodBadge(t.paymentMethod)}`}>
          {t.paymentMethod}
        </span>
      )
    },
    {
      key: 'transactionId',
      header: 'Transaction ID',
      width: '120px',
      render: (t: TransactionWithDetails) => (
        <p className="text-[10px] font-mono text-gray-400 truncate" title={t.transactionId}>
          {t.transactionId.substring(0, 12)}...
        </p>
      )
    },
    {
      key: 'invoice',
      header: 'Invoice',
      width: '200px',
      render: (t: TransactionWithDetails) => {
        const busy = !!invoiceBusy[t.id];
        const ok = !!invoiceSuccess[t.id];
        return (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              {t.invoiceNumber ? (
                <>
                  <p className="text-[11px] font-bold text-gray-900 truncate" title={t.invoiceNumber}>
                    {t.invoiceNumber}
                  </p>
                  <p className="text-[9px] text-gray-400">
                    {t.invoiceEmailSentAt ? `Sent ${new Date(t.invoiceEmailSentAt).toLocaleDateString('en-GB')}` : 'Not sent'}
                  </p>
                </>
              ) : (
                <p className="text-[10px] text-gray-400 italic">Not issued</p>
              )}
            </div>
            <button
              onClick={() => handleGenerateOrResendInvoice(t)}
              disabled={busy}
              title={t.invoiceNumber ? 'Resend invoice' : 'Generate & send invoice'}
              className={`p-2 rounded-lg border transition-all ${
                ok
                  ? 'bg-green-50 border-green-200 text-green-600'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 disabled:opacity-50'
              }`}
            >
              {ok ? <Check size={14} /> : <Mail size={14} />}
            </button>
          </div>
        );
      }
    },
    {
      key: 'refund',
      header: 'Refund',
      width: '130px',
      render: (t: TransactionWithDetails) => {
        const busy = !!refundBusy[t.id];
        const remaining = Math.max(0, (t.amount || 0) - (t.refundedAmount || 0));
        if (t.status === 'refunded' || ((t.refundedAmount || 0) > 0 && remaining <= 0)) {
          return <span className="text-[10px] font-bold text-gray-400 uppercase">Refunded</span>;
        }
        if (t.status !== 'completed') {
          return <span className="text-[10px] text-gray-300">—</span>;
        }
        return (
          <button
            onClick={() => handleRefund(t)}
            disabled={busy}
            title="Record a refund and revoke access"
            className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wide bg-white border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {busy ? '…' : 'Refund'}
          </button>
        );
      }
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Transactions</h1>
          <p className="text-gray-500 font-medium mt-1">View all purchases and payment history</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={loadTransactions}>
            <RefreshCw size={16} />
            Refresh
          </Button>
          <Button variant="primary" onClick={handleExportCSV} disabled={exporting}>
            <Download size={16} />
            Export CSV
          </Button>
        </div>
      </div>

      {error && <p role="alert" className="text-red-600">{error}</p>}
      <label>Reporting currency <select value={filters.currency} onChange={e=>setFilters({...filters,currency:e.target.value})}>{[...new Set(['EUR','RSD',...currencies])].map(c=><option key={c}>{c}</option>)}</select></label>
      <p className="text-sm text-gray-500">Totals use the selected filters and currency, excluding pending/failed orders and subtracting refunds. CSV includes all matching pages. Dates use Europe/Belgrade.</p>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={money(stats.totalRevenue)}
          icon={DollarSign}
          color="green"
        />
        <KPICard
          title="Total Transactions"
          value={stats.totalTransactions}
          icon={CreditCard}
          color="purple"
        />
        <KPICard
          title="Average Order Value"
          value={money(stats.averageOrderValue)}
          icon={TrendingUp}
          color="blue"
        />
        <KPICard
          title="Discounted Orders"
          value={stats.discountedOrders}
          subtitle={`${stats.totalTransactions > 0 ? Math.round((stats.discountedOrders / stats.totalTransactions) * 100) : 0}% of orders`}
          icon={Tag}
          color="amber"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[2rem] border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            placeholder="Search customer or transaction..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <Input
            type="date"
            placeholder="From date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          />
          <Input
            type="date"
            placeholder="To date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          />
          <Select
            value={filters.paymentMethod}
            onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
            options={[
              { value: 'all', label: 'All Payment Methods' },
              { value: 'paypal', label: 'PayPal' },
              { value: 'card', label: 'Card' },
              { value: 'manual', label: 'Manual' }
            ]}
          />
          <Select
            value={filters.productType}
            onChange={(e) => setFilters({ ...filters, productType: e.target.value })}
            options={[
              { value: 'all', label: 'All Products' },
              { value: 'ebook', label: 'E-books' },
              { value: 'learndash', label: 'Courses' },
              { value: 'service', label: 'Services' }
            ]}
          />
        </div>
      </div>

      {/* Transactions Table */}
      <DataTable
        columns={columns}
        data={transactions}
        loading={loading}
        emptyMessage="No transactions found"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-[2rem] border border-gray-100 px-6 py-4">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;
