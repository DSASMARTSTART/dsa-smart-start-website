import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Download, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  adminAnalyticsApi,
  analyticsCsv,
  type AdminAnalytics,
  type AnalyticsDays,
  type AnalyticsPeople,
} from '../../lib/adminAnalytics';

type Props = { onNavigate: (path: string) => void };
type Tab = 'overview' | 'people' | 'products' | 'live' | 'health';
const panel = 'rounded-3xl border border-gray-200 bg-white p-5 md:p-6';
const button =
  'rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-purple-300 disabled:opacity-50';
const stamp = (value: string | null, time = true) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        ...(time ? { timeStyle: 'short' as const } : {}),
      })
    : 'Not recorded';
const healthLabels: Record<
  keyof AdminAnalytics['health'],
  { title: string; detail: string; path: string }
> = {
  accountsWithoutProfile: {
    title: 'Accounts missing a platform profile',
    detail: 'Authentication accounts that cannot be matched to Users.',
    path: 'admin-users',
  },
  profilesWithoutAccount: {
    title: 'Profiles without a login account',
    detail:
      'Non-deleted profiles only. Archived records are retained for history. Review before creating or removing access.',
    path: 'admin-users',
  },
  paidWithoutAccess: {
    title: 'Paid orders without active access',
    detail: 'May include deliberately revoked access. Review each order before restoring it.',
    path: 'admin-transactions',
  },
  activeTeachersWithoutLogin: {
    title: 'Active teachers without a login',
    detail: 'Send a workspace invitation when the real teacher is ready. Includes demo profiles.',
    path: 'admin-teachers',
  },
  activeTeachersWithoutHours: {
    title: 'Active teachers without a schedule',
    detail: 'No weekly availability or group sessions have been entered.',
    path: 'admin-teachers',
  },
  failedAssets: {
    title: 'Failed material or recording uploads',
    detail: 'Review the upload error and retry the affected file.',
    path: 'admin-teachers',
  },
  staleUploads: {
    title: 'Uploads pending over 24 hours',
    detail: 'Processing may still be in progress; check the provider before uploading again.',
    path: 'admin-teachers',
  },
  livePackagesWithoutTeachers: {
    title: 'Published Live packages without teachers',
    detail: 'Assign an active teacher so students can book.',
    path: 'admin-teachers',
  },
  paymentOrphans: {
    title: 'Unresolved payment notifications',
    detail: 'Provider notifications without a matched purchase. Review reconciliation.',
    path: 'admin-payment-orphans',
  },
};
function Metric({ label, value, help }: { label: string; value: React.ReactNode; help?: string }) {
  return (
    <div className={panel}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
      {help && <p className="mt-2 text-xs leading-relaxed text-gray-500">{help}</p>}
    </div>
  );
}
function Trend({
  title,
  rows,
  valueKey,
  format,
}: {
  title: string;
  rows: AdminAnalytics['trends'];
  valueKey: 'registrations' | 'revenue' | 'learning_items';
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...rows.map((x) => x[valueKey]));
  const total = rows.reduce((sum, row) => sum + Number(row[valueKey]), 0);
  return (
    <section className={panel}>
      <h2 className="font-bold text-gray-800">{title}</h2>
      <p className="my-3 text-2xl font-bold text-purple-700">{format ? format(total) : total}</p>
      <div
        className="flex h-28 items-end gap-0.5"
        role="img"
        aria-label={`${title}: ${format ? format(total) : total} across ${rows.length} days`}
      >
        {rows.map((row) => (
          <div
            key={row.day}
            className="flex-1 rounded-t bg-purple-500"
            style={{ height: `${(100 * row[valueKey]) / max}%` }}
            title={`${row.day}: ${format ? format(row[valueKey]) : row[valueKey]}`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-gray-500">
        <span>{rows[0]?.day}</span>
        <span>{rows.at(-1)?.day}</span>
      </div>
      <details className="mt-3 text-xs text-gray-500">
        <summary className="cursor-pointer">View daily values</summary>
        <div className="mt-2 max-h-44 overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>Date</th>
                <th>{title}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.day}>
                  <td>{row.day}</td>
                  <td>{format ? format(row[valueKey]) : row[valueKey]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
function People({
  days,
  updatedAt,
  onNavigate,
}: {
  days: AnalyticsDays;
  updatedAt: string;
  onNavigate: Props['onNavigate'];
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AnalyticsPeople | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const timer = window.setTimeout(() => {
      void adminAnalyticsApi
        .people(days, search, page)
        .then((result) => {
          if (!cancelled) setData(result);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [days, search, page, updatedAt, retry]);
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">New student accounts</h2>
          <p className="mt-1 text-sm text-gray-500">
            Registered in this period. Staff and linked teacher accounts are excluded.
          </p>
        </div>
        <input
          aria-label="Search registrations"
          maxLength={100}
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="mt-5 text-red-700">
          {error}{' '}
          <button className="underline" onClick={() => setRetry((x) => x + 1)}>
            Retry
          </button>
        </p>
      ) : loading ? (
        <p role="status" className="py-8 text-gray-500">
          Loading registrations…
        </p>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b text-xs text-gray-500">
                <tr>
                  {[
                    'Student',
                    'Registered',
                    'Email / sign-in',
                    'Packages',
                    'Live attended',
                    'Last learning action',
                    'Details',
                  ].map((h) => (
                    <th className="pb-3 pr-4" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.rows.map((person) => (
                  <tr key={person.id} className="border-b border-gray-100">
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-gray-900">
                        {person.name || 'Unnamed student'}
                      </p>
                      <p className="text-xs text-gray-500">{person.email}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {person.status}
                        {person.guest_checkout ? ' · Guest checkout' : ''}
                      </p>
                    </td>
                    <td className="pr-4 text-gray-600">{stamp(person.created_at, false)}</td>
                    <td className="pr-4 text-xs text-gray-600">
                      {person.email_confirmed_at ? 'Email confirmed' : 'Email unconfirmed'}
                      <p className="mt-1">Last sign-in: {stamp(person.last_sign_in_at)}</p>
                    </td>
                    <td>{person.active_packages}</td>
                    <td>{person.live_attended}</td>
                    <td className="pr-4 text-xs text-gray-500">
                      {stamp(person.last_learning_activity)}
                    </td>
                    <td>
                      <button
                        className="text-purple-700 underline"
                        onClick={() => onNavigate(`admin-users?user=${person.id}`)}
                      >
                        View student
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.rows.length && (
              <p className="py-8 text-gray-500">No registrations match this period and search.</p>
            )}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 text-sm text-gray-500">
            <span>
              {data?.total || 0} accounts · Page {page} /{' '}
              {Math.max(1, Math.ceil((data?.total || 0) / 25))}
            </span>
            <div className="flex gap-2">
              <button className={button} disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <button
                className={button}
                disabled={page * 25 >= (data?.total || 0)}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
export default function AdminHome({ onNavigate }: Props) {
  const { user, profile } = useAuth();
  const allowed = profile?.role === 'admin' && profile?.status === 'active';
  const [days, setDays] = useState<AnalyticsDays>(30);
  const [currency, setCurrency] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const refresh = useCallback(
    async (background = false) => {
      if (!allowed || !user?.id) return;
      const version = ++request.current;
      if (!background) setLoading(true);
      setError('');
      try {
        const result = await adminAnalyticsApi.snapshot(days, currency);
        if (version === request.current) setData(result);
      } catch (err) {
        if (version === request.current)
          setError(err instanceof Error ? err.message : 'Could not load analytics.');
      } finally {
        if (version === request.current) setLoading(false);
      }
    },
    [allowed, days, currency, user?.id]
  );
  useEffect(() => {
    void refresh();
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refresh(true);
    };
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(onFocus, 60000);
    return () => {
      // Invalidate pending network responses; this ref is not a DOM node.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      request.current++;
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [refresh]);
  const money = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: data?.currency || 'EUR',
    }).format(n);
  function exportProducts() {
    if (!data) return;
    const rows: (string | number | null)[][] = [
      ['From', data.from, 'To', data.to, 'Currency', data.currency],
      [
        'Product',
        'Type',
        'Active student enrollments (current)',
        'New enrollments (period)',
        'Orders (period)',
        'Net order revenue',
        'Average interactive progress (%)',
        'Live attendances (period)',
        'Published materials',
      ],
    ];
    data.courses.forEach((c) =>
      rows.push([
        c.title,
        c.content_format,
        c.active_enrollments,
        c.new_enrollments,
        c.orders,
        c.revenue,
        c.average_progress,
        c.live_attendances,
        c.materials,
      ])
    );
    const url = URL.createObjectURL(
      new Blob([analyticsCsv(rows)], { type: 'text/csv;charset=utf-8;' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `eduway-products-${data.currency}-${data.days}d.csv`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!allowed)
    return (
      <div className={panel}>
        <h1 className="text-xl font-bold">Administrator access required</h1>
        <p className="mt-3 text-gray-600">
          Account and revenue analytics are available to active administrators.
        </p>
      </div>
    );
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-600">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Platform analytics</h1>
          <p className="mt-2 text-sm text-gray-500">
            Registrations, payments, learning and Live lessons from your database.
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className={`${button} flex items-center gap-2`}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2" role="group" aria-label="Reporting period">
          {([7, 30, 90] as const).map((n) => (
            <button
              key={n}
              aria-pressed={days === n}
              onClick={() => setDays(n)}
              className={`${button} ${days === n ? '!bg-purple-600 !text-white !border-purple-600' : ''}`}
            >
              {n} days
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">
            Revenue currency{' '}
            <select
              aria-label="Revenue currency"
              value={currency || data?.currency || ''}
              onChange={(e) => setCurrency(e.target.value)}
              className="ml-2 rounded-xl border border-gray-200 bg-white p-2.5"
            >
              <option value="" disabled>
                Select
              </option>
              {(data?.currencies || []).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button
            className={`${button} flex items-center gap-2`}
            disabled={!data || loading || !!error}
            onClick={exportProducts}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Analytics sections">
        {(['overview', 'people', 'products', 'live', 'health'] as const).map((x) => (
          <button
            key={x}
            aria-pressed={tab === x}
            className={`${button} ${tab === x ? '!border-purple-200 !bg-purple-50 !text-purple-700' : ''}`}
            onClick={() => setTab(x)}
          >
            {
              {
                overview: 'Overview',
                people: 'Registrations',
                products: 'Products & revenue',
                live: 'Live learning',
                health: 'Data checks',
              }[x]
            }
          </button>
        ))}
      </nav>
      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
          <p>{error}</p>
          <button className="mt-2 underline" onClick={() => void refresh()}>
            Retry analytics
          </button>
        </div>
      ) : loading ? (
        <div role="status" className={`${panel} py-16 text-center text-gray-500`}>
          Loading analytics from the database…
        </div>
      ) : (
        data && (
          <>
            <p className="text-xs text-gray-500">
              {stamp(data.from, false)} – {stamp(data.to, false)} · Reporting timezone:{' '}
              {data.timezone} · Updated {stamp(data.generatedAt)} · Refreshes every minute while
              this tab is visible.
            </p>
            {Object.values(data.health).some((n) => n > 0) && tab !== 'health' && (
              <button
                className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900"
                onClick={() => setTab('health')}
              >
                {Object.values(data.health).filter((n) => n > 0).length} data checks need review.
                Open Data checks →
              </button>
            )}
            {tab === 'overview' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    label="New student accounts"
                    value={data.summary.newRegistrations}
                    help={`${data.summary.previousRegistrations} in the preceding ${days} calendar days. Current period includes today.`}
                  />
                  <Metric
                    label="Active learners"
                    value={data.summary.activeLearners}
                    help="Students with a sign-in or a recorded learning/booking action in this period."
                  />
                  <Metric
                    label="Net order revenue"
                    value={money(data.summary.netRevenue)}
                    help={`${data.summary.paidOrders} completed/refunded orders · ${money(data.summary.previousRevenue)} in the preceding period.`}
                  />
                  <Metric
                    label="Live sessions taught"
                    value={data.live.completedSessions}
                    help={`${data.live.attendances} confirmed student attendances. Each shared group session is counted once.`}
                  />
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  <Trend title="New registrations" rows={data.trends} valueKey="registrations" />
                  <Trend
                    title={`Net order revenue · ${data.currency}`}
                    rows={data.trends}
                    valueKey="revenue"
                    format={money}
                  />
                  <Trend
                    title="Completed learning items"
                    rows={data.trends}
                    valueKey="learning_items"
                  />
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <section className={panel}>
                    <h2 className="text-lg font-bold text-gray-900">New-account journey</h2>
                    <p className="mt-2 text-xs leading-relaxed text-gray-500">
                      Accounts created in this period, evaluated now. Stages are independent: guest
                      purchases can precede sign-in. Paid status uses all currencies.
                    </p>
                    <div className="mt-5 space-y-4">
                      {(['registered', 'confirmed', 'signedIn', 'enrolled', 'paying'] as const)
                        .map((key) => [key, data.funnel[key]] as const)
                        .map(([key, n]) => (
                          <div key={key}>
                            <div className="mb-1.5 flex justify-between text-sm">
                              <span>
                                {
                                  {
                                    registered: 'Registered',
                                    confirmed: 'Email confirmed',
                                    signedIn: 'Signed in at least once',
                                    enrolled: 'Has active access',
                                    paying: 'Has a paid, non-fully-refunded order',
                                  }[key]
                                }
                              </span>
                              <strong>{n}</strong>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100">
                              <div
                                className="h-2 rounded-full bg-purple-500"
                                style={{
                                  width: `${data.funnel.registered ? (n / data.funnel.registered) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                    <button
                      className="mt-5 flex items-center gap-2 text-sm font-semibold text-purple-700"
                      onClick={() => setTab('people')}
                    >
                      Inspect registrations <ArrowRight size={16} />
                    </button>
                  </section>
                  <section className={panel}>
                    <h2 className="text-lg font-bold text-gray-900">Recent platform activity</h2>
                    <p className="mt-1 text-xs text-gray-500">
                      Latest 20 registration, order, booking and attendance records in this period.
                    </p>
                    <div className="mt-4 max-h-80 overflow-auto divide-y divide-gray-100">
                      {data.recentActivity.map((a) => (
                        <div key={a.id} className="py-3">
                          <p className="text-sm font-semibold text-gray-800">{a.description}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {a.name || 'User'} · {stamp(a.occurred_at)}
                          </p>
                        </div>
                      ))}
                      {!data.recentActivity.length && (
                        <p className="py-5 text-sm text-gray-500">
                          No activity recorded in this period.
                        </p>
                      )}
                    </div>
                  </section>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Metric
                    label="Student accounts · all time"
                    value={data.summary.studentAccounts}
                    help={`${data.summary.enabledAccounts} enabled accounts. Enabled status does not mean recent activity.`}
                  />
                  <Metric
                    label="Active enrollments · current"
                    value={data.summary.activeEnrollments}
                    help="Includes purchases and manual access grants; these are not all sales."
                  />
                  <Metric
                    label="Quiz attempts · period"
                    value={data.summary.quizAttempts}
                    help="Saved quiz submissions, including repeat attempts."
                  />
                </div>
              </>
            )}
            {tab === 'people' && (
              <People key={days} days={days} updatedAt={data.generatedAt} onNavigate={onNavigate} />
            )}
            {tab === 'products' && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Metric
                    label={`Gross orders · ${data.currency}`}
                    value={money(data.summary.grossRevenue)}
                    help="Completed/refunded orders purchased in the selected period."
                  />
                  <Metric
                    label="Refunds on those orders"
                    value={money(data.summary.refundsOnOrders)}
                    help="Current refunded amounts on this order cohort; not refunds processed in this period."
                  />
                  <Metric
                    label="Net order revenue"
                    value={money(data.summary.netRevenue)}
                    help="Gross order amounts minus refunds. Currencies are never added together."
                  />
                </div>
                <section className={panel}>
                  <h2 className="text-lg font-bold text-gray-900">Product performance</h2>
                  <p className="mt-2 text-xs text-gray-500">
                    Enrollments and progress are current snapshots. New access, orders, revenue and
                    Live attendance use the selected period. Progress applies to interactive courses
                    only.
                  </p>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-sm">
                      <thead className="border-b text-xs text-gray-500">
                        <tr>
                          {[
                            'Product',
                            'Active students',
                            'New access',
                            'Orders',
                            `Net · ${data.currency}`,
                            'Progress',
                            'Live attended',
                            'Materials',
                          ].map((h) => (
                            <th className="pb-3 pr-4" key={h}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.courses.map((c) => (
                          <tr key={c.id} className="border-b border-gray-100">
                            <td className="py-4 pr-4">
                              <button
                                className="text-left font-semibold text-purple-700 hover:underline"
                                onClick={() => onNavigate(`admin-course-edit-${c.id}`)}
                              >
                                {c.title}
                              </button>
                              <p className="text-xs text-gray-500">{c.content_format}</p>
                            </td>
                            <td>{c.active_enrollments}</td>
                            <td>{c.new_enrollments}</td>
                            <td>{c.orders}</td>
                            <td>{money(c.revenue)}</td>
                            <td>{c.average_progress === null ? '—' : `${c.average_progress}%`}</td>
                            <td>{c.live_attendances}</td>
                            <td>{c.materials}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!data.courses.length && (
                      <p className="py-6 text-gray-500">No products found.</p>
                    )}
                  </div>
                </section>
                <div className="grid gap-6 md:grid-cols-2">
                  <section className={panel}>
                    <h2 className="font-bold text-gray-900">Payment methods</h2>
                    {data.paymentsByMethod.map((p) => (
                      <div key={p.method} className="mt-4 flex justify-between gap-4 text-sm">
                        <span>
                          {p.method} · {p.orders} orders
                        </span>
                        <strong>{money(p.revenue)}</strong>
                      </div>
                    ))}
                    {!data.paymentsByMethod.length && (
                      <p className="mt-3 text-sm text-gray-500">
                        No completed/refunded orders in this currency and period.
                      </p>
                    )}
                  </section>
                  <section className={panel}>
                    <h2 className="font-bold text-gray-900">Checkout records by current status</h2>
                    <p className="mt-2 text-xs text-gray-500">
                      These are order records, not unique visitors or a marketing conversion rate.
                    </p>
                    {Object.entries(data.orderStatuses).map(([status, n]) => (
                      <div key={status} className="mt-3 flex justify-between text-sm">
                        <span>{status}</span>
                        <strong>{n}</strong>
                      </div>
                    ))}
                    <button
                      className="mt-4 text-sm font-semibold text-purple-700"
                      onClick={() => onNavigate('admin-transactions')}
                    >
                      View transactions →
                    </button>
                  </section>
                </div>
              </>
            )}
            {tab === 'live' && (
              <>
                <p className="text-sm text-gray-500">
                  Lesson dates within this period. Attendance is confirmed by a teacher/admin;
                  elapsed time alone does not count. Live totals include staff/test bookings if
                  present.
                </p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    label="Sessions taught"
                    value={data.live.completedSessions}
                    help="Groups count once, regardless of participants."
                  />
                  <Metric label="Student attendances" value={data.live.attendances} />
                  <Metric label="No-shows" value={data.live.noShows} />
                  <Metric label="Cancelled bookings" value={data.live.cancelled} />
                  <Metric
                    label="Awaiting attendance"
                    value={data.live.awaitingAttendance}
                    help="Past bookings still awaiting a completed/no-show decision."
                  />
                  <Metric
                    label="Missing recordings"
                    value={data.live.missingRecordings}
                    help="Ended attended/unconfirmed sessions with no ready/processing recording."
                  />
                  <Metric label="Upcoming bookings · current" value={data.live.upcoming} />
                  <Metric label="All booking records · period" value={data.live.bookings} />
                </div>
                <section className={panel}>
                  <div className="flex flex-wrap justify-between gap-3">
                    <h2 className="text-lg font-bold text-gray-900">Teacher performance</h2>
                    <button className={button} onClick={() => onNavigate('admin-teachers')}>
                      Open Live Learning
                    </button>
                  </div>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="border-b text-xs text-gray-500">
                        <tr>
                          {[
                            'Teacher',
                            'Status',
                            'Sessions',
                            'Taught',
                            'Attended',
                            'No-shows',
                            'Cancelled',
                            'Missing videos',
                          ].map((h) => (
                            <th className="pb-3 pr-4" key={h}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.live.teachers.map((t) => (
                          <tr key={t.id} className="border-b border-gray-100">
                            <td className="py-4 pr-4 font-semibold text-gray-900">{t.name}</td>
                            <td>{t.status}</td>
                            <td>{t.sessions}</td>
                            <td>{t.completed_sessions}</td>
                            <td>{t.attended}</td>
                            <td>{t.missed}</td>
                            <td>{t.cancelled}</td>
                            <td>{t.missing_recordings}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!data.live.teachers.length && (
                      <p className="py-6 text-gray-500">No teachers have been added.</p>
                    )}
                  </div>
                </section>
              </>
            )}
            {tab === 'health' && (
              <>
                <section className={panel}>
                  <h2 className="text-lg font-bold text-gray-900">Connections and data checks</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Current database checks, independent of the date filter. These are review
                    queues, not proof that every integration works end to end.
                  </p>
                  <div className="mt-5 divide-y divide-gray-100">
                    {Object.entries(healthLabels).map(([key, item]) => (
                      <div
                        key={key}
                        className="flex flex-wrap items-center justify-between gap-3 py-4"
                      >
                        <div className="max-w-xl">
                          <p className="font-semibold text-gray-900">{item.title}</p>
                          <p className="mt-1 text-xs text-gray-500">{item.detail}</p>
                        </div>
                        <button
                          className={`${button} ${data.health[key as keyof typeof healthLabels] > 0 ? '!border-amber-200 !bg-amber-50 !text-amber-800' : ''}`}
                          onClick={() => onNavigate(item.path)}
                        >
                          {data.health[key as keyof typeof healthLabels]} · Review
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
                <section className={panel}>
                  <h2 className="font-bold text-gray-900">Measurement coverage</h2>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-600">
                    <li>
                      Registrations, email confirmation and latest sign-in come from authentication
                      records.
                    </li>
                    <li>
                      Purchases, access grants, saved learning progress and Live bookings come from
                      platform tables.
                    </li>
                    <li>
                      Session duration, devices, traffic sources and video watch time are not
                      collected. They are not reported as zero.
                    </li>
                    <li>
                      Sign-in counts use the latest sign-in timestamp, not a historical login event
                      stream. Learning items reflect saved completion records and can change if a
                      student resets progress.
                    </li>
                    <li>
                      Recording metadata does not prove Vimeo playback or email delivery. Those
                      integrations require an actual upload/playback and invitation test.
                    </li>
                  </ul>
                </section>
              </>
            )}
          </>
        )
      )}
    </div>
  );
}
