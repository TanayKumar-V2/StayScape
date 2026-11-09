'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import type { AdminBookingDetails } from '@/types/admin';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminBookingDetailPage() {
  const params = useParams();
  const bookingReference = params?.bookingReference as string;

  const [booking, setBooking] = useState<AdminBookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = async () => {
    if (!bookingReference) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getBookingDetails(bookingReference);
      if (res.data) {
        setBooking(res.data);
      } else {
        setError(res.error ?? 'Booking not found');
      }
    } catch {
      setError('Network error while loading booking details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchBooking();
  }, [bookingReference]);

  const formatPaise = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-[var(--border)] rounded-md" />
        <div className="h-48 bg-white border border-[var(--border)] rounded-3xl p-6" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Bookings
        </Link>
        <div className="p-6 bg-white rounded-3xl border border-[var(--border)] text-center">
          <p className="text-rose-700 font-medium">{error ?? 'Booking could not be found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Bookings
        </Link>
      </div>

      {/* Booking Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
              Reservation Ref
            </span>
            <span className="font-mono text-base font-bold text-[var(--text-primary)]">
              {booking.bookingReference}
            </span>
            <Badge className="text-xs uppercase border-none bg-[var(--bg-secondary)] text-[var(--text-primary)]">
              {booking.status}
            </Badge>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[var(--text-primary)] mt-3">
            {booking.property.title}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {booking.property.city} • Check-in: <strong>{booking.checkIn}</strong> • Check-out:{' '}
            <strong>{booking.checkOut}</strong> ({booking.nights} nights, {booking.guestCount}{' '}
            guests)
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
            Total Paid / Booked
          </p>
          <p className="font-serif text-3xl font-bold text-[var(--text-primary)]">
            {formatPaise(booking.pricing.totalAmountPaise)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Guest & Pricing */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pricing Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-3">
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Pricing Snapshot
            </h3>
            <div className="space-y-2 text-xs divide-y divide-[var(--border)]">
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-secondary)]">
                  Nightly Rate ({booking.nights} nights)
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {formatPaise(booking.pricing.nightlySubtotalPaise)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-secondary)]">Cleaning Fee</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {formatPaise(booking.pricing.cleaningFeePaise)}
                </span>
              </div>
              <div className="flex justify-between py-2 font-bold text-sm text-[var(--text-primary)]">
                <span>Total Amount</span>
                <span>{formatPaise(booking.pricing.totalAmountPaise)}</span>
              </div>
            </div>
          </div>

          {/* Payment & Refund Transactions */}
          <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-4">
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Payment Transactions
            </h3>
            {booking.transactions && booking.transactions.length > 0 ? (
              <div className="space-y-3">
                {booking.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border)] text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                        {tx.providerPaymentId}
                      </span>
                      <span className="font-semibold text-emerald-700">{tx.status}</span>
                    </div>
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>
                        Method: {tx.method ?? '—'}{' '}
                        {tx.bank ? `(${tx.bank})` : tx.vpa ? `(${tx.vpa})` : ''}
                      </span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {formatPaise(tx.amountPaise)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-secondary)]">
                No payment transactions captured for this hold/booking.
              </p>
            )}

            {/* Refunds if any */}
            {booking.refunds && booking.refunds.length > 0 ? (
              <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                  Refund Logs
                </h4>
                {booking.refunds.map((rf) => (
                  <div
                    key={rf.id}
                    className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 text-xs flex justify-between items-center"
                  >
                    <div>
                      <p className="font-mono font-semibold text-rose-900">{rf.refundReference}</p>
                      <p className="text-[11px] text-rose-700">{rf.reason ?? 'Refund processed'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-900">{formatPaise(rf.amountPaise)}</p>
                      <p className="text-[10px] uppercase font-semibold text-rose-700">
                        {rf.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Column: Guest & Host Profiles */}
        <div className="space-y-6">
          {/* Guest Profile */}
          <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-3">
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Guest Profile
            </h3>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{booking.guest.name}</p>
            <p className="text-xs text-[var(--text-secondary)]">{booking.guest.email}</p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full mt-2 rounded-xl border-[var(--border)] text-xs"
            >
              <Link href={`/admin/users/${booking.guest.id}`}>Inspect Guest Account</Link>
            </Button>
          </div>

          {/* Host Profile */}
          <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-3">
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Host Information
            </h3>
            {booking.property.host ? (
              <>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {booking.property.host.displayName}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {booking.property.host.user.email}
                </p>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 rounded-xl border-[var(--border)] text-xs"
                >
                  <Link href={`/admin/hosts/${booking.property.host.id}`}>
                    Inspect Host Profile
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-xs text-[var(--text-secondary)]">Host record unavailable.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
