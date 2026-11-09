'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import type { AdminBookingItem, AdminPaginationMeta } from '@/types/admin';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBookingItem[]>([]);
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

  const fetchBookings = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getBookings({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      if (res.data) {
        setBookings(res.data.data);
        setMeta(res.data.meta);
      } else {
        setError(res.error ?? 'Failed to load bookings');
      }
    } catch {
      setError('Network error while loading bookings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchBookings(1);
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
            Bookings Oversight
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Complete platform booking records, reservation lifecycle states, and payment links.
          </p>
        </div>
        <div className="text-xs font-medium text-[var(--text-secondary)] bg-white px-3 py-1.5 rounded-xl border border-[var(--border)] shadow-xs self-start">
          Total Bookings: <strong className="text-[var(--text-primary)]">{meta.total}</strong>
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
            placeholder="Search booking ref, property, or guest..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        >
          <option value="ALL">All Statuses</option>
          <option value="HOLD">Hold (Temporary)</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      ) : null}

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Reference</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Property</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Guest</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Stay Dates</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Total</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
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
              ) : bookings.length > 0 ? (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--bg-primary)]/80 transition-colors">
                    {/* Reference */}
                    <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)]">
                      <Link
                        href={`/admin/bookings/${b.bookingReference}`}
                        className="hover:text-[var(--accent-primary)] hover:underline"
                      >
                        {b.bookingReference}
                      </Link>
                    </td>

                    {/* Property */}
                    <td className="py-3.5 px-4">
                      <div className="min-w-0 max-w-xs">
                        <Link
                          href={`/admin/properties/${b.property.id}`}
                          className="font-semibold text-xs text-[var(--text-primary)] hover:text-[var(--accent-primary)] hover:underline truncate block"
                        >
                          {b.property.title}
                        </Link>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          {b.property.city}
                        </p>
                      </div>
                    </td>

                    {/* Guest */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      <p className="font-medium text-[var(--text-primary)]">{b.guest.name}</p>
                      <p className="text-[11px] truncate">{b.guest.email}</p>
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                      <p className="text-xs text-[var(--text-primary)]">
                        {b.checkIn} → {b.checkOut}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {b.nights} night(s) • {b.guestCount} guest(s)
                      </p>
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 font-bold text-[var(--text-primary)] whitespace-nowrap">
                      {formatPaise(b.totalAmountPaise)}
                      <span className="text-[10px] text-[var(--text-secondary)] block font-normal">
                        {b.paymentSummary.hasCapturedPayment ? 'Captured' : 'Unpaid / Hold'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                          b.status === 'CONFIRMED'
                            ? 'bg-emerald-50 text-emerald-800'
                            : b.status === 'COMPLETED'
                              ? 'bg-blue-50 text-blue-800'
                              : b.status === 'HOLD'
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-[var(--accent-primary)]"
                      >
                        <Link href={`/admin/bookings/${b.bookingReference}`}>Inspect</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[var(--text-secondary)]">
                    No bookings found matching current filters.
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
              onClick={() => fetchBookings(meta.page - 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNextPage || isLoading}
              onClick={() => fetchBookings(meta.page + 1)}
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
