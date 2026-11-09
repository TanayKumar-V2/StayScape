'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import type { AdminDashboardOverview, AdminTimeseriesData } from '@/types/admin';
import {
  Users,
  Building2,
  Home,
  CalendarCheck,
  CreditCard,
  Flag,
  Bot,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [timeseries, setTimeseries] = useState<AdminTimeseriesData | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'bookings' | 'users' | 'revenue'>(
    'bookings',
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverviewData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ovRes, tsRes] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getTimeseries(selectedMetric, '30d'),
      ]);

      if (ovRes.data) {
        setOverview(ovRes.data);
      } else {
        setError(ovRes.error ?? 'Failed to load platform overview metrics');
      }

      if (tsRes.data) {
        setTimeseries(tsRes.data);
      }
    } catch {
      setError('An unexpected network error occurred while loading dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchOverviewData();
  }, [selectedMetric]);

  const formatPaiseToInr = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  if (isLoading && !overview) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-[var(--border)] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-white border border-[var(--border)] rounded-2xl p-4 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)]">
            Platform Overview
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Real-time operational visibility, platform metrics, and active moderation queues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOverviewData}
            disabled={isLoading}
            className="rounded-xl border-[var(--border)] hover:bg-[var(--bg-secondary)] gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Primary KPI Grid */}
      {overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Bookings & Volume */}
          <div className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Gross Booking Volume
              </span>
              <div className="p-2 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {formatPaiseToInr(overview.bookings.totalVolumePaise)}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-emerald-700">
                  {overview.bookings.confirmed} confirmed
                </span>
                <span>•</span>
                <span>{overview.bookings.total} total bookings</span>
              </div>
            </div>
          </div>

          {/* 2. Captured Payments */}
          <div className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Captured Payments
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {formatPaiseToInr(overview.payments.capturedVolumePaise)}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                <span>{overview.payments.capturedCount} transactions</span>
                {overview.payments.pendingRefundsCount > 0 ? (
                  <>
                    <span>•</span>
                    <span className="text-amber-700 font-medium">
                      {overview.payments.pendingRefundsCount} pending refund(s)
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* 3. Properties Moderation */}
          <div className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Listings & Moderation
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Home className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {overview.properties.published}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                <span className="text-emerald-700 font-medium">
                  {overview.properties.approved} approved
                </span>
                {overview.properties.flagged > 0 ? (
                  <>
                    <span>•</span>
                    <span className="text-amber-700 font-medium">
                      {overview.properties.flagged} flagged
                    </span>
                  </>
                ) : null}
                {overview.properties.rejected > 0 ? (
                  <>
                    <span>•</span>
                    <span className="text-rose-700 font-medium">
                      {overview.properties.rejected} rejected
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* 4. Active Reports Queue */}
          <div className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Reports Queue
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <Flag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {overview.reports.open + overview.reports.underReview}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                <span className="text-amber-700 font-medium">{overview.reports.open} open</span>
                <span>•</span>
                <span>{overview.reports.underReview} under review</span>
              </div>
            </div>
          </div>

          {/* 5. Users */}
          <div className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Users
              </span>
              <div className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {overview.users.total}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                <span className="text-emerald-700 font-medium">{overview.users.active} active</span>
                <span>•</span>
                <span>+{overview.users.newLast30Days} new (30d)</span>
              </div>
            </div>
          </div>

          {/* 6. Hosts */}
          <div className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Hosts
              </span>
              <div className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {overview.hosts.total}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                <span className="text-emerald-700 font-medium">{overview.hosts.active} active</span>
                {overview.hosts.suspended > 0 ? (
                  <>
                    <span>•</span>
                    <span className="text-rose-700 font-medium">
                      {overview.hosts.suspended} suspended
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* 7. AI Requests */}
          <div className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                AI Platform Activity
              </span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {overview.ai.totalRequests}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                <span>{overview.ai.last24HoursRequests} requests in last 24h</span>
              </div>
            </div>
          </div>

          {/* 8. Active Stays / Holds */}
          <div className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Stays Status
              </span>
              <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {overview.bookings.completed}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                <span>Completed stays</span>
                <span>•</span>
                <span className="text-amber-700 font-medium">
                  {overview.bookings.activeHolds} active holds
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Interactive Time-series Chart */}
      <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">
              30-Day Platform Trends
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Aggregated daily metrics across marketplace activity.
            </p>
          </div>
          <div className="flex items-center bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border)]">
            {(['bookings', 'users', 'revenue'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMetric(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  selectedMetric === m
                    ? 'bg-white text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Chart visualization */}
        {timeseries && timeseries.points.length > 0 ? (
          <div className="w-full h-64 flex flex-col justify-end pt-8">
            <div className="flex-1 flex items-end gap-1 sm:gap-2">
              {(() => {
                const maxVal = Math.max(
                  ...timeseries.points.map((p) =>
                    selectedMetric === 'revenue' ? (p.value ?? 0) / 100 : p.count,
                  ),
                  1,
                );
                return timeseries.points.map((pt, idx) => {
                  const val = selectedMetric === 'revenue' ? (pt.value ?? 0) / 100 : pt.count;
                  const heightPercent = Math.max(8, Math.round((val / maxVal) * 100));

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center group relative h-full justify-end"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--text-primary)] text-white text-[10px] px-2 py-1 rounded-md pointer-events-none whitespace-nowrap z-10 shadow-md">
                        {pt.date}: {selectedMetric === 'revenue' ? `₹${val.toLocaleString()}` : val}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-[var(--accent-primary)] group-hover:bg-[var(--accent-primary-hover)] rounded-t-md transition-all duration-300"
                      />
                    </div>
                  );
                });
              })()}
            </div>
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mt-3 border-t border-[var(--border)] pt-2">
              <span>{timeseries.points[0]?.date}</span>
              <span>{timeseries.points[Math.floor(timeseries.points.length / 2)]?.date}</span>
              <span>{timeseries.points[timeseries.points.length - 1]?.date}</span>
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-[var(--text-secondary)]">
            No activity data recorded in the selected 30-day window.
          </div>
        )}
      </div>

      {/* Moderation Fast-lane & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Moderation Actions */}
        <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Moderation Queues
            </h3>
            <Badge variant="outline" className="border-[var(--border)] text-xs">
              Live
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Items requiring administrative review or safety intervention.
          </p>

          <div className="space-y-3 pt-2">
            <Link
              href="/admin/reports"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--accent-primary)] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Flag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    User Content Reports
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {overview?.reports.open ?? 0} open, {overview?.reports.underReview ?? 0} in
                    review
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
            </Link>

            <Link
              href="/admin/properties?moderationStatus=FLAGGED"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--accent-primary)] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Flagged Listings
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {overview?.properties.flagged ?? 0} properties flagged
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
            </Link>

            <Link
              href="/admin/refunds?status=REQUESTED"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--accent-primary)] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Pending Refunds
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {overview?.payments.pendingRefundsCount ?? 0} pending processing
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
            </Link>
          </div>
        </div>

        {/* Recent Admin Audit Activity */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Recent Audit Activity
            </h3>
            <Link
              href="/admin/audit-logs"
              className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
            >
              View all logs
            </Link>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Immutable record of administrative actions taken on the platform.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[var(--text-secondary)] border-b border-[var(--border)]">
                <tr>
                  <th className="py-2.5 font-medium">Timestamp</th>
                  <th className="py-2.5 font-medium">Admin</th>
                  <th className="py-2.5 font-medium">Action</th>
                  <th className="py-2.5 font-medium">Entity</th>
                  <th className="py-2.5 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {overview?.recentActivity && overview.recentActivity.length > 0 ? (
                  overview.recentActivity.slice(0, 5).map((act) => (
                    <tr key={act.id} className="hover:bg-[var(--bg-primary)]">
                      <td className="py-3 text-[var(--text-secondary)] whitespace-nowrap">
                        {new Date(act.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 font-medium text-[var(--text-primary)] whitespace-nowrap">
                        {act.adminUser.firstName} ({act.adminUser.email})
                      </td>
                      <td className="py-3">
                        <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold">
                          {act.action}
                        </span>
                      </td>
                      <td className="py-3 text-[var(--text-secondary)] font-mono text-[11px] whitespace-nowrap">
                        {act.entityType}
                      </td>
                      <td className="py-3 text-[var(--text-secondary)] max-w-xs truncate">
                        {act.reason ?? '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[var(--text-secondary)]">
                      No administrative actions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
