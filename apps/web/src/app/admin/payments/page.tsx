'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import type { AdminPaymentItem, AdminPaginationMeta } from '@/types/admin';
import { Search, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
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

  const fetchPayments = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getPayments({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      if (res.data) {
        setPayments(res.data.data);
        setMeta(res.data.meta);
      } else {
        setError(res.error ?? 'Failed to load payments');
      }
    } catch {
      setError('Network error while loading payment transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchPayments(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

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
            Payments Ledger
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Reconciled Razorpay payment transactions, payment methods, and captured volume.
          </p>
        </div>
        <div className="text-xs font-medium text-[var(--text-secondary)] bg-white px-3 py-1.5 rounded-xl border border-[var(--border)] shadow-xs self-start">
          Total Transactions: <strong className="text-[var(--text-primary)]">{meta.total}</strong>
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
            placeholder="Search transaction ID, order ID, booking ref..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        >
          <option value="ALL">All Statuses</option>
          <option value="CAPTURED">Captured</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      ) : null}

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Transaction ID</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Booking Ref</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Customer</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Method</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Amount</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Captured At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-4 h-12 bg-gray-50/50" />
                  </tr>
                ))
              ) : payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--bg-primary)]/80 transition-colors">
                    {/* Transaction ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)]">
                      {p.providerPaymentId}
                      <span className="text-[10px] text-[var(--text-secondary)] block font-normal font-mono">
                        {p.providerOrderId}
                      </span>
                    </td>

                    {/* Booking Reference */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-[var(--accent-primary)]">
                      <Link
                        href={`/admin/bookings/${p.bookingReference}`}
                        className="hover:underline"
                      >
                        {p.bookingReference}
                      </Link>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      <p className="font-medium text-[var(--text-primary)]">{p.customerName}</p>
                      <p className="text-[11px] truncate">{p.customerEmail}</p>
                    </td>

                    {/* Method */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      <span className="uppercase font-semibold text-[var(--text-primary)]">
                        {p.method ?? '—'}
                      </span>
                      {p.bank ? <span className="text-[11px] block">{p.bank}</span> : null}
                      {p.vpa ? (
                        <span className="text-[11px] block truncate max-w-xs">{p.vpa}</span>
                      ) : null}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-bold text-[var(--text-primary)] whitespace-nowrap">
                      {formatPaise(p.amountPaise)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {p.status === 'CAPTURED' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Captured
                        </span>
                      ) : p.status === 'FAILED' ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>

                    {/* Captured At */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                      {p.capturedAt ? new Date(p.capturedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[var(--text-secondary)]">
                    No payments found matching current filters.
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
              onClick={() => fetchPayments(meta.page - 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNextPage || isLoading}
              onClick={() => fetchPayments(meta.page + 1)}
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
