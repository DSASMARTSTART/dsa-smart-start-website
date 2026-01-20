// ============================================
// Admin Transactions Management
// ============================================

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, Calendar, CreditCard, Tag, User as UserIcon,
  ChevronLeft, ChevronRight, RefreshCw, FileText, DollarSign, TrendingUp
} from 'lucide-react';
import { 
  DataTable, StatusBadge, Button, Input, Select, KPICard
} from './AdminUIComponents';
import { supabase } from '../../lib/supabase';

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
}

interface TransactionFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  paymentMethod: string;
  productType: string;
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
    productType: 'all'
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    loadTransactions();
  }, [filters, page]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // Build query for transactions with user and course details
      let query = supabase
        .from('purchases')
        .select(`
          *,
          users:user_id (id, name, email),
          courses:course_id (id, title, product_type),
          discount_codes:discount_code_id (code)
        `, { count: 'exact' })
        .order('purchased_at', { ascending: false });

      // Apply filters
      if (filters.search) {
        // Search in user name, email, or transaction ID
        query = query.or(`transaction_id.ilike.%${filters.search}%`);
      }

      if (filters.dateFrom) {
        query = query.gte('purchased_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('purchased_at', `${filters.dateTo}T23:59:59`);
      }

      if (filters.paymentMethod !== 'all') {
        query = query.eq('payment_method', filters.paymentMethod);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

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
        purchasedAt: p.purchased_at
      }));

      // Filter by product type client-side (since it's in the joined table)
      const filtered = filters.productType === 'all' 
        ? transformed 
        : transformed.filter(t => t.productType === filters.productType);

      setTransactions(filtered);
      setTotalPages(Math.ceil((count || 0) / pageSize));

      // Calculate stats from all transactions (not just current page)
      await loadStats();
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get all purchases for stats
      const { data, error } = await supabase
        .from('purchases')
        .select('amount, discount_code_id');

      if (error) throw error;

      const purchases = data || [];
      const totalRevenue = purchases.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const totalTransactions = purchases.length;
      const discountedOrders = purchases.filter(p => p.discount_code_id).length;

      setStats({
        totalRevenue,
        totalTransactions,
        averageOrderValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        discountedOrders
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleExportCSV = () => {
    // Prepare CSV content
    const headers = ['Date', 'Transaction ID', 'Customer', 'Email', 'Product', 'Type', 'Amount', 'Discount', 'Final Amount', 'Payment Method'];
    const rows = transactions.map(t => [
      new Date(t.purchasedAt).toLocaleDateString(),
      t.transactionId,
      t.userName,
      t.userEmail,
      t.courseTitle,
      t.productType,
      t.originalAmount ? `€${t.originalAmount.toFixed(2)}` : `€${t.amount.toFixed(2)}`,
      t.discountCode ? `${t.discountCode} (-€${(t.discountAmount || 0).toFixed(2)})` : '-',
      `€${t.amount.toFixed(2)}`,
      t.paymentMethod
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
          <Button variant="primary" onClick={handleExportCSV}>
            <Download size={16} />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={`€${stats.totalRevenue.toFixed(2)}`}
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
          value={`€${stats.averageOrderValue.toFixed(2)}`}
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
            placeholder="Search transaction ID..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            icon={Search}
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
