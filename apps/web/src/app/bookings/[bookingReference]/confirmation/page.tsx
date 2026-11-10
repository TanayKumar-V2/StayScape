'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  CheckCircle2,
  Calendar,
  Users,
  MapPin,
  Printer,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  CreditCard,
  Building,
  Loader2,
  AlertTriangle,
  Sparkles,
  Compass,
} from 'lucide-react';
import { bookingsApi, paymentsApi } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import type { SerializedBookingResponse } from '@/types/booking';
import type { PaymentStatusSummary } from '@/types/payment';
import { formatDateDisplay } from '@/lib/date-helpers';
import { PageContainer } from '@/components/layout/page-container';
import { TripItineraryModal } from '@/components/booking/trip-itinerary-modal';

export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const bookingReference = params?.bookingReference as string;

  const [booking, setBooking] = useState<SerializedBookingResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paymentLoadError, setPaymentLoadError] = useState(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isItineraryModalOpen, setIsItineraryModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated && bookingReference) {
      router.push(
        `/login?returnUrl=/bookings/${encodeURIComponent(bookingReference)}/confirmation`,
      );
    }
  }, [authLoading, isAuthenticated, bookingReference, router]);

  const fetchDetails = useCallback(async () => {
    if (!bookingReference) return;
    setIsLoading(true);
    setLoadError(null);
    setPaymentLoadError(false);

    try {
      const [bookingResult, paymentResult] = await Promise.allSettled([
        bookingsApi.getDetail(bookingReference),
        paymentsApi.getPaymentStatus(bookingReference),
      ]);

      const bookingRes = bookingResult.status === 'fulfilled' ? bookingResult.value : null;
      const paymentRes = paymentResult.status === 'fulfilled' ? paymentResult.value : null;
      if (bookingRes?.data) {
        setBooking(bookingRes.data);
      } else {
        setLoadError(
          bookingRes?.error ||
            'We could not load this booking right now. Please retry or check your bookings.',
        );
      }
      if (paymentRes?.data) {
        setPaymentStatus(paymentRes.data);
      } else {
        setPaymentLoadError(true);
      }
      if (paymentResult.status === 'rejected') setPaymentLoadError(true);
      if (bookingResult.status === 'rejected') {
        setLoadError(
          'We could not load this booking right now. Please retry or check your bookings.',
        );
      }
    } catch {
      setLoadError(
        'We could not load this booking right now. Please retry or check your bookings.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [bookingReference]);

  useEffect(() => {
    void fetchDetails();
  }, [fetchDetails]);

  const handleCopyReference = () => {
    if (!bookingReference) return;
    void navigator.clipboard.writeText(bookingReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] py-16">
        <PageContainer>
          <div className="max-w-2xl mx-auto p-12 bg-white rounded-3xl border border-[var(--border)] text-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)] mx-auto mb-4" />
            <p className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Loading confirmation receipt...
            </p>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] py-16">
        <PageContainer>
          <div className="max-w-2xl mx-auto p-10 bg-white rounded-3xl border border-[var(--border)] text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-2">
              {loadError ? 'Confirmation temporarily unavailable' : 'Reservation Not Found'}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {loadError || 'Could not retrieve this booking reference.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {loadError && (
                <button
                  type="button"
                  onClick={() => void fetchDetails()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--text-primary)] text-white text-sm font-medium hover:bg-black transition-colors"
                >
                  Retry
                </button>
              )}
              <Link
                href="/account/bookings"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
              >
                <span>View My Bookings</span>
              </Link>
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  const transaction = paymentStatus?.transaction;
  const paymentMethodLabel = transaction?.method
    ? transaction.method.toUpperCase()
    : 'Online Payment';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-10 sm:py-16 print:py-0 print:bg-white">
      <PageContainer>
        <div className="max-w-3xl mx-auto">
          {/* Top Success Banner */}
          <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[var(--border)] shadow-sm mb-8 text-center print:border-none print:shadow-none">
            <div className="w-16 h-16 rounded-3xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] mb-3">
              {paymentStatus?.isPaid
                ? 'Payment Successful & Guaranteed'
                : paymentStatus
                  ? 'Payment Not Yet Confirmed'
                  : 'Payment Status Unavailable'}
            </span>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-3">
              {paymentStatus?.isPaid ? "You're All Set for Your Stay!" : 'Reservation details'}
            </h1>

            <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto mb-6">
              {paymentStatus?.isPaid ? (
                <>
                  Your reservation at{' '}
                  <strong className="text-[var(--text-primary)]">
                    {booking.propertyTitleSnapshot}
                  </strong>{' '}
                  has been paid in full and secured with instant host confirmation.
                </>
              ) : paymentLoadError ? (
                'Your booking details loaded, but we could not verify the payment status. Retry the page or check your bookings before making another payment.'
              ) : (
                'Your booking details are available. Payment is not confirmed yet; check your bookings for the latest status.'
              )}
            </p>
            {!paymentStatus?.isPaid && (
              <button
                type="button"
                onClick={() => void fetchDetails()}
                className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
              >
                Check payment status again
              </button>
            )}

            {/* Reference Badge with Copy */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)]">
              <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-medium">
                Booking Reference:
              </span>
              <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                {booking.bookingReference}
              </span>
              <button
                type="button"
                onClick={handleCopyReference}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Copy reference"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[var(--accent-primary)]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Stay & Payment Details Card */}
          <div className="bg-white rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden mb-8 print:border print:shadow-none">
            {/* Property Preview Header */}
            <div className="p-6 sm:p-8 border-b border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative w-full sm:w-32 h-32 rounded-2xl overflow-hidden bg-stone-100 shrink-0">
                {booking.propertyCoverImageSnapshot ? (
                  <Image
                    src={booking.propertyCoverImageSnapshot}
                    alt={booking.propertyTitleSnapshot}
                    fill
                    sizes="(max-width: 640px) 100vw, 128px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">
                    <Building className="w-8 h-8 opacity-40" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-1">
                  <MapPin className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>{booking.propertyCitySnapshot}</span>
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2 truncate">
                  {booking.propertyTitleSnapshot}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    {formatDateDisplay(booking.checkIn, {
                      month: 'short',
                      includeYear: false,
                    })}{' '}
                    – {formatDateDisplay(booking.checkOut, { month: 'short', includeYear: true })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    {booking.guestCount} {booking.guestCount === 1 ? 'Guest' : 'Guests'} •{' '}
                    {booking.nights} {booking.nights === 1 ? 'night' : 'nights'}
                  </span>
                </div>
              </div>
            </div>

            {/* Check-in / Checkout Grid */}
            <div className="grid grid-cols-2 border-b border-[var(--border)] p-6 sm:p-8 bg-[var(--bg-primary)] gap-4">
              <div className="p-4 rounded-2xl bg-white border border-[var(--border)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
                  Check-in
                </span>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatDateDisplay(booking.checkIn, {
                    weekday: 'short',
                    month: 'short',
                    includeYear: true,
                  })}
                </p>
                <span className="text-[11px] text-[var(--text-secondary)]">From 3:00 PM</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[var(--border)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
                  Checkout
                </span>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatDateDisplay(booking.checkOut, {
                    weekday: 'short',
                    month: 'short',
                    includeYear: true,
                  })}
                </p>
                <span className="text-[11px] text-[var(--text-secondary)]">Until 11:00 AM</span>
              </div>
            </div>

            {/* Payment Receipt Breakdown */}
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
                  Payment Receipt
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Paid via Razorpay
                </span>
              </div>

              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>
                    {booking.pricePerNightFormatted} × {booking.nights}{' '}
                    {booking.nights === 1 ? 'night' : 'nights'}
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {booking.nightlySubtotalFormatted}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cleaning &amp; hospitality fee</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {booking.cleaningFeeFormatted}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex justify-between text-base font-bold text-[var(--text-primary)]">
                <span>Total Paid</span>
                <span className="text-[var(--accent-primary)] font-serif text-xl">
                  {booking.totalAmountFormatted}
                </span>
              </div>

              {/* Transaction Metadata */}
              {transaction && (
                <div className="mt-4 pt-4 border-t border-dashed border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span>
                      Method:{' '}
                      <strong className="text-[var(--text-primary)]">{paymentMethodLabel}</strong>
                      {transaction.cardLast4 && ` (ending in ${transaction.cardLast4})`}
                    </span>
                  </div>
                  <div className="text-right sm:text-right">
                    <span>Payment ID: </span>
                    <span className="font-mono text-[var(--text-primary)]">
                      {transaction.razorpayPaymentId}
                    </span>
                  </div>
                </div>
              )}
              {/* AI Trip Planner Card */}
              <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-[var(--text-primary)] to-[var(--surface-deep)] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md print:hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-[var(--accent-secondary)]" />
                  </div>
                  <div>
                    <h4 className="font-serif text-base sm:text-lg font-bold text-white">
                      Plan Your Getaway with StayMatch AI
                    </h4>
                    <p className="text-xs text-white/70 mt-0.5">
                      Generate an authentic {booking.nights}-day itinerary with tailored morning,
                      afternoon and evening plans.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsItineraryModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-semibold text-white transition flex items-center gap-2 shrink-0 shadow-sm"
                >
                  <Compass className="w-4 h-4" />
                  <span>Generate Itinerary</span>
                </button>
              </div>
            </div>

            {/* Print & Action Bar */}
            <div className="p-6 sm:p-8 bg-[var(--bg-primary)] border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-4 print:hidden">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-white text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4 text-[var(--text-secondary)]" />
                <span>Print Receipt</span>
              </button>

              <div className="flex items-center gap-3">
                <Link
                  href="/account/bookings"
                  className="px-5 py-2.5 rounded-xl bg-[var(--text-primary)] text-white text-xs font-semibold hover:bg-black transition-colors inline-flex items-center gap-1.5"
                >
                  <span>My Bookings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/stays"
                  className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-white text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Explore More
                </Link>
              </div>
            </div>
          </div>
        </div>

        {booking && (
          <TripItineraryModal
            propertySlug={booking.propertySlugSnapshot}
            propertyTitle={booking.propertyTitleSnapshot}
            isOpen={isItineraryModalOpen}
            onClose={() => setIsItineraryModalOpen(false)}
            initialDays={Math.min(7, Math.max(1, booking.nights))}
            checkIn={booking.checkIn}
            checkOut={booking.checkOut}
          />
        )}
      </PageContainer>
    </div>
  );
}
