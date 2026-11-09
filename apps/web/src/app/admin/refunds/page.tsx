'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import type { AdminRefundItem, AdminPaginationMeta } from '@/types/admin';
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<AdminRefundItem[]>([]);
  const [meta, setMeta] = useState<AdminPaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Retry action
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchRefunds = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getRefunds({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      if (res.data) {
        setRefunds(res.data.data);
        setMeta(res.data.meta);
      } else {
        setError(res.error ?? 'Failed to load refunds');
      }
    } catch {
      setError('Network error while loading refunds');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchRefunds(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleRetryRefund = async (refundId: string) => {
    setRetryingId(refundId);
    setRetryMessage(null);

    try {
      const res = await adminApi.retryRefund(refundId);
      if (res.data?.success) {
        setRetryMessage({ type: 'success', text: res.data.message ?? 'Refund retry queued.' });
        void fetchRefunds(meta.page);
      } else {
        setRetryMessage({ type: 'error', text: res.error ?? 'Failed to retry refund.' });
      }
    } catch {
      setRetryMessage({ type: 'error', text: 'Network error during refund retry.' });
    } finally {
      setRetryingId(null);
    }
  };

  const formatPaise = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)]">
            Refunds Management
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Track Razorpay payment returns, cancellation refunds, and retry failed operations.
          </p>
        </div>
        <div className="text-xs font-medium text-[var(--text-secondary)] bg-white px-3 py-1.5 rounded-xl border border-[var(--border)] shadow-xs self-start">
          Total Refunds: <strong className="text-[var(--text-primary)]">{meta.total}</strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[var(--border)] shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search refund ID, booking ref, or email..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        >
          <option value="ALL">All Statuses</option>
          <option value="REQUESTED">Requested</option>
          <option value="PROCESSING">Processing</option>
          <option value="PROCESSED">Processed</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {retryMessage ? (
        <div
          className={`p-4 rounded-2xl text-xs font-medium ${
            retryMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {retryMessage.text}
        </div>
      ) : null}

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      ) : null}

      {/* Refunds Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Refund Ref</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Booking Ref</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Customer</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Amount</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Reason</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-4 h-12 bg-gray-50/50" />
                  </tr>
                ))
              ) : refunds.length > 0 ? (
                refunds.map((rf) => (
                  <tr key={rf.id} className="hover:bg-[var(--bg-primary)]/80 transition-colors">
                    {/* Refund Reference */}
                    <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)]">
                      {rf.refundReference}
                      {rf.razorpayRefundId && rf.razorpayRefundId !== rf.refundReference ? (
                        <span className="text-[10px] text-[var(--text-secondary)] block font-normal font-mono">
                          {rf.razorpayRefundId}
                        </span>
                      ) : null}
                    </td>

                    {/* Booking Reference */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-[var(--accent-primary)]">
                      <Link
                        href={`/admin/bookings/${rf.bookingReference}`}
                        className="hover:underline"
                      >
                        {rf.bookingReference}
                      </Link>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      <p className="font-medium text-[var(--text-primary)]">{rf.propertyTitle}</p>
                      <p className="text-[11px] truncate">{rf.customerEmail}</p>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-bold text-[var(--text-primary)] whitespace-nowrap">
                      {formatPaise(rf.amountPaise)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {rf.status === 'PROCESSED' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Processed
                        </span>
                      ) : rf.status === 'FAILED' ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                          <Clock className="w-3.5 h-3.5" /> {rf.status}
                        </span>
                      )}
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)] max-w-xs">
                      <p className="truncate">{rf.reason ?? 'Cancellation refund'}</p>
                      {rf.failureReason ? (
                        <p className="text-[10px] text-rose-700 font-medium truncate">
                          Error: {rf.failureReason}
                        </p>
                      ) : null}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      {rf.status !== 'PROCESSED' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={retryingId === rf.id}
                          onClick={() => handleRetryRefund(rf.id)}
                          className="h-8 px-2.5 text-xs border-amber-300 text-amber-800 hover:bg-amber-50 rounded-lg gap-1.5"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${retryingId === rf.id ? 'animate-spin' : ''}`}
                          />
                          Retry
                        </Button>
                      ) : (
                        <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[var(--text-secondary)]">
                    No refunds matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-[var(--bg-primary)] border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>
            Showing page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong> (
            <strong>{meta.total}</strong> total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasPreviousPage || isLoading}
              onClick={() => fetchRefunds(meta.page - 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNextPage || isLoading}
              onClick={() => fetchRefunds(meta.page + 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
