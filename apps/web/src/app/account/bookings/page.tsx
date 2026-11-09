'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Compass,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';
import { bookingsApi } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import type { SerializedBookingResponse, BookingStatus, PaginatedBookings } from '@/types/booking';
import { formatDateDisplay } from '@/lib/date-helpers';
import { PageContainer } from '@/components/layout/page-container';
import { cn } from '@/lib/utils';

const STATUS_TABS: { label: string; value: BookingStatus | 'ALL' }[] = [
  { label: 'All Bookings', value: 'ALL' },
  { label: 'Active Holds', value: 'HOLD' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Expired', value: 'EXPIRED' },
];

export default function MyBookingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<BookingStatus | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [data, setData] = useState<PaginatedBookings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?returnUrl=/account/bookings');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);

    try {
      const statusParam = activeTab === 'ALL' ? undefined : activeTab;
      const res = await bookingsApi.getMyBookings({
        page: currentPage,
        limit: 8,
        status: statusParam,
      });

      if (res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'Failed to retrieve bookings.');
      }
    } catch {
      setError('An error occurred while fetching your bookings.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, activeTab, currentPage]);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const handleTabChange = (tab: BookingStatus | 'ALL') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const renderStatusBadge = (booking: SerializedBookingResponse) => {
    const isHoldExpired =
      booking.status === 'HOLD' &&
      booking.holdExpiresAt &&
      new Date(booking.holdExpiresAt).getTime() <= Date.now();

    if (booking.status === 'HOLD') {
      if (isHoldExpired) {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Hold Expired
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          <Clock className="w-3.5 h-3.5" />
          Active Hold
        </span>
      );
    }

    if (booking.status === 'CONFIRMED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Confirmed
        </span>
      );
    }

    if (booking.status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Completed Stay
        </span>
      );
    }

    if (booking.status === 'REFUND_PENDING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
          <Clock className="w-3.5 h-3.5" />
          Refund Pending
        </span>
      );
    }

    if (booking.status === 'REFUNDED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Refunded
        </span>
      );
    }

    if (booking.status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
          <XCircle className="w-3.5 h-3.5" />
          Cancelled
        </span>
      );
    }

    if (booking.status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          <AlertTriangle className="w-3.5 h-3.5" />
          Expired
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
        {booking.status}
      </span>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] py-16">
        <PageContainer>
          <div className="max-w-4xl mx-auto p-12 bg-white rounded-3xl border border-[var(--border)] text-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)] mx-auto mb-4" />
            <p className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Checking authentication...
            </p>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-10 sm:py-16">
      <PageContainer>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <nav className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-2">
                <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">
                  Home
                </Link>
                <span>/</span>
                <Link
                  href="/account"
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  Account
                </Link>
                <span>/</span>
                <span className="text-[var(--text-primary)] font-semibold">My Bookings</span>
              </nav>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
                My Bookings &amp; Holds
              </h1>
            </div>

            <Link
              href="/stays"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-primary-hover)] transition-colors shadow-sm self-start sm:self-auto"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Stays</span>
            </Link>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8 no-scrollbar">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleTabChange(tab.value)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors',
                  activeTab === tab.value
                    ? 'bg-[var(--text-primary)] text-white shadow-sm'
                    : 'bg-white text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Content Area */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-3xl border border-[var(--border)] p-6 animate-pulse flex flex-col sm:flex-row gap-6 items-center"
                >
                  <div className="w-full sm:w-40 h-28 bg-[var(--bg-primary)] rounded-2xl" />
                  <div className="flex-1 space-y-3 w-full">
                    <div className="h-5 bg-[var(--bg-primary)] rounded w-1/3" />
                    <div className="h-4 bg-[var(--bg-primary)] rounded w-1/2" />
                    <div className="h-4 bg-[var(--bg-primary)] rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[var(--border)] p-12 text-center shadow-sm max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[var(--text-primary)] mb-2">
                No bookings found
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6">
                {activeTab === 'ALL'
                  ? 'You haven’t created any reservations or holds yet. Start exploring extraordinary stays curated across India.'
                  : `You have no ${activeTab.toLowerCase()} reservations at this time.`}
              </p>
              <Link
                href="/stays"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-primary-hover)] transition-colors"
              >
                <span>Browse Curated Stays</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {data.items.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-3xl border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Property Thumbnail & Info */}
                    <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center flex-1">
                      {booking.propertyCoverImageSnapshot ? (
                        <div className="relative w-full sm:w-36 h-28 rounded-2xl overflow-hidden shrink-0 border border-[var(--border)]">
                          <Image
                            src={booking.propertyCoverImageSnapshot}
                            alt={booking.propertyTitleSnapshot}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full sm:w-36 h-28 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center shrink-0 text-xs text-[var(--text-secondary)]">
                          No preview
                        </div>
                      )}

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-2 py-0.5 rounded-md">
                            {booking.bookingReference}
                          </span>
                          {renderStatusBadge(booking)}
                        </div>

                        <h3 className="font-serif text-lg font-bold text-[var(--text-primary)] truncate">
                          {booking.propertyTitleSnapshot}
                        </h3>

                        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                            {booking.propertyCitySnapshot}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                            {formatDateDisplay(booking.checkIn)} →{' '}
                            {formatDateDisplay(booking.checkOut)} ({booking.nights}{' '}
                            {booking.nights === 1 ? 'night' : 'nights'})
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                            {booking.guestCount} {booking.guestCount === 1 ? 'guest' : 'guests'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-6 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-[var(--border)]">
                      <div className="text-left lg:text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                          Total Amount
                        </span>
                        <span className="font-serif text-xl font-bold text-[var(--text-primary)]">
                          {booking.totalAmountFormatted}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {booking.status === 'COMPLETED' && (
                          <Link
                            href={`/account/bookings/${booking.bookingReference}/review`}
                            className="px-4 py-2.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span>Write Review</span>
                          </Link>
                        )}
                        <Link
                          href={`/bookings/${booking.bookingReference}`}
                          className="px-4 py-2.5 rounded-xl bg-[var(--text-primary)] text-white hover:bg-black text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {data.meta.totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
                  <span>
                    Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total
                    bookings)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!data.meta.hasPrevPage}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-2 rounded-lg border border-[var(--border)] hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={!data.meta.hasNextPage}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="p-2 rounded-lg border border-[var(--border)] hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
