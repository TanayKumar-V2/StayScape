'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Clock,
  Calendar,
  Users,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  XCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ChevronRight,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { bookingsApi, paymentsApi } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import type { SerializedBookingResponse, BookingStatus } from '@/types/booking';
import { useRazorpay } from '@/hooks/use-razorpay';
import { formatDateDisplay } from '@/lib/date-helpers';
import { PageContainer } from '@/components/layout/page-container';
import { cn } from '@/lib/utils';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const bookingReference = params?.bookingReference as string;

  useEffect(() => {
    if (!authLoading && !isAuthenticated && bookingReference) {
      router.push(`/login?returnUrl=/bookings/${encodeURIComponent(bookingReference)}`);
    }
  }, [authLoading, isAuthenticated, bookingReference, router]);

  const [booking, setBooking] = useState<SerializedBookingResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Payment states
  const [isPaying, setIsPaying] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [refundNotice, setRefundNotice] = useState<string | null>(null);

  // 1. Fetch booking details
  const fetchBooking = useCallback(async () => {
    if (!bookingReference) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await bookingsApi.getDetail(bookingReference);
      if (res.data) {
        setBooking(res.data);
      } else {
        setError(res.error || 'Booking reservation could not be found.');
      }
    } catch {
      setError('Failed to load booking details.');
    } finally {
      setIsLoading(false);
    }
  }, [bookingReference]);

  useEffect(() => {
    void fetchBooking();
  }, [fetchBooking]);

  // 2. Real-time 10-minute hold countdown timer
  useEffect(() => {
    if (
      !booking ||
      (booking.status !== 'HOLD' && booking.status !== 'PAYMENT_PENDING') ||
      !booking.holdExpiresAt
    ) {
      setSecondsRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const expireTime = new Date(booking.holdExpiresAt!).getTime();
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((expireTime - now) / 1000));
      return diffSecs;
    };

    setSecondsRemaining(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        // Refresh booking state when timer hits 0 to sync lazy DB expiration
        void fetchBooking();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking, fetchBooking]);

  // 3. Razorpay Checkout integration
  const { loadError: gatewayError, openCheckout } = useRazorpay({
    onSuccess: async (response) => {
      setIsPaying(true);
      setPaymentError(null);
      try {
        const verifyRes = await paymentsApi.verifyPayment({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });

        if (verifyRes.data?.success) {
          router.push(`/bookings/${encodeURIComponent(bookingReference)}/confirmation`);
        } else if (verifyRes.data?.status === 'REFUND_PENDING') {
          setRefundNotice(
            verifyRes.data.message ||
              'Reservation hold expired before payment completed. A full automatic refund has been initiated to your original payment method.',
          );
          void fetchBooking();
        } else {
          setPaymentError(
            verifyRes.error || verifyRes.data?.error || 'Payment verification failed.',
          );
        }
      } catch {
        setPaymentError('Network error while verifying payment.');
      } finally {
        setIsPaying(false);
      }
    },
    onDismiss: () => {
      setIsPaying(false);
      setPaymentError(
        'Checkout window was closed before completion. Your reservation hold is still active.',
      );
    },
    onError: (fail) => {
      setIsPaying(false);
      setPaymentError(fail.description || 'Payment transaction failed. Please retry.');
    },
  });

  const handleInitiatePayment = async () => {
    if (!booking) return;
    setIsPaying(true);
    setPaymentError(null);
    setRefundNotice(null);

    try {
      const orderRes = await paymentsApi.createOrder(booking.bookingReference);
      if (orderRes.data) {
        openCheckout(orderRes.data);
      } else {
        setPaymentError(orderRes.error || 'Failed to initialize payment gateway order.');
        setIsPaying(false);
      }
    } catch {
      setPaymentError('Network error initializing checkout order.');
      setIsPaying(false);
    }
  };

  // 4. Cancel hold handler
  const handleCancelHold = async () => {
    if (!booking) return;

    const confirmed = window.confirm(
      'Are you sure you want to release this temporary reservation hold? These dates will become immediately available for other travelers to book.',
    );
    if (!confirmed) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await bookingsApi.cancelHold(booking.bookingReference);
      if (res.data) {
        setBooking(res.data);
      } else {
        setCancelError(res.error || 'Failed to cancel hold.');
      }
    } catch {
      setCancelError('Network error while cancelling hold.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Format countdown mm:ss
  const formattedCountdown = useMemo(() => {
    if (secondsRemaining === null) return null;
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [secondsRemaining]);

  const isLowTime = secondsRemaining !== null && secondsRemaining > 0 && secondsRemaining < 120;
  const isHoldActive =
    (booking?.status === 'HOLD' || booking?.status === 'PAYMENT_PENDING') &&
    secondsRemaining !== null &&
    secondsRemaining > 0;
  const isExpired =
    booking?.status === 'EXPIRED' ||
    ((booking?.status === 'HOLD' || booking?.status === 'PAYMENT_PENDING') &&
      secondsRemaining !== null &&
      secondsRemaining <= 0);

  // Status badge styling helper
  const renderStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'HOLD':
      case 'PAYMENT_PENDING':
        if (isExpired) {
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
            Temporary Hold
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmed &amp; Paid
          </span>
        );
      case 'REFUND_PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Refund Pending
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            Refunded
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] py-16">
        <PageContainer>
          <div className="max-w-2xl mx-auto p-12 bg-white rounded-3xl border border-[var(--border)] text-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)] mx-auto mb-4" />
            <p className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Loading reservation details...
            </p>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] py-16">
        <PageContainer>
          <div className="max-w-2xl mx-auto p-10 bg-white rounded-3xl border border-[var(--border)] text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-2">
              Reservation Not Found
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {error ||
                'The requested booking reservation does not exist or you lack permission to view it.'}
            </p>
            <Link
              href="/stays"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--text-primary)] text-white text-sm font-medium hover:bg-black transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Explore Accommodations</span>
            </Link>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-10 sm:py-16">
      <PageContainer>
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-6">
            <Link href="/stays" className="hover:text-[var(--text-primary)] transition-colors">
              Stays
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link
              href={`/stays/${booking.propertySlugSnapshot}`}
              className="hover:text-[var(--text-primary)] transition-colors truncate max-w-[200px]"
            >
              {booking.propertyTitleSnapshot}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-mono text-[var(--text-primary)] font-semibold">
              {booking.bookingReference}
            </span>
          </div>

          {/* Refund Notice Banner */}
          {(refundNotice ||
            booking.status === 'REFUND_PENDING' ||
            booking.status === 'REFUNDED') && (
            <div className="mb-6 p-5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Automatic Refund Initiated</h4>
                <p className="text-xs text-purple-800 mt-1 leading-relaxed">
                  {refundNotice ||
                    'Payment for this booking was captured after the 10-minute reservation hold expired. A full automatic refund has been dispatched to your original payment method via Razorpay.'}
                </p>
              </div>
            </div>
          )}

          {/* Payment & Cancellation Error Banner */}
          {(paymentError || gatewayError || cancelError) && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Notification: </span>
                <span>{paymentError || gatewayError || cancelError}</span>
              </div>
            </div>
          )}

          {/* Real-time Hold Countdown Banner */}
          {isHoldActive && (
            <div
              className={cn(
                'mb-6 p-5 sm:p-6 rounded-3xl border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors',
                isLowTime
                  ? 'bg-amber-500/10 border-amber-300 text-amber-950'
                  : 'bg-emerald-500/10 border-emerald-300 text-emerald-950',
              )}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={cn(
                    'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5',
                    isLowTime ? 'bg-amber-500 text-white' : 'bg-[var(--accent-primary)] text-white',
                  )}
                >
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold mb-0.5">
                    {isLowTime
                      ? 'Hold Expiring Soon — Complete Payment'
                      : 'Temporary Reservation Hold Active'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    These dates are exclusively reserved for you. Complete payment before the timer
                    expires to confirm your booking.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <div className="px-4 py-2 rounded-2xl bg-white border border-[var(--border)] shadow-sm text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                    Time Remaining
                  </span>
                  <span
                    className={cn(
                      'font-mono text-xl font-bold',
                      isLowTime ? 'text-amber-600' : 'text-[var(--accent-primary)]',
                    )}
                  >
                    {formattedCountdown ?? '--:--'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Expired Hold Banner */}
          {isExpired && (
            <div className="mb-6 p-6 rounded-3xl bg-red-500/10 border border-red-300 text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold mb-0.5">
                    Reservation Hold Expired
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    The 10-minute hold window for these dates has elapsed. The property dates have
                    been released for other travelers.
                  </p>
                </div>
              </div>

              <Link
                href={`/stays/${booking.propertySlugSnapshot}`}
                className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shrink-0"
              >
                Rebook Dates
              </Link>
            </div>
          )}

          {/* Confirmed Booking Banner */}
          {booking.status === 'CONFIRMED' && (
            <div className="mb-6 p-6 rounded-3xl bg-emerald-500/10 border border-emerald-300 text-emerald-950 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[var(--accent-primary)] text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold mb-0.5">Reservation Confirmed</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Your payment was verified and your stay has been confirmed by the host.
                  </p>
                </div>
              </div>
              <Link
                href={`/bookings/${encodeURIComponent(booking.bookingReference)}/confirmation`}
                className="px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-primary-hover-strong)] transition-colors shrink-0"
              >
                View Receipt
              </Link>
            </div>
          )}

          {/* Main Booking Card */}
          <div className="bg-white rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden mb-6">
            {/* Header with Reference & Status */}
            <div className="p-6 sm:p-8 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Booking Reference
                </span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                  {booking.bookingReference}
                </span>
              </div>
              <div>{renderStatusBadge(booking.status)}</div>
            </div>

            {/* Property Snapshot */}
            <div className="p-6 sm:p-8 border-b border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative w-full sm:w-28 h-28 rounded-2xl overflow-hidden bg-stone-100 shrink-0">
                {booking.propertyCoverImageSnapshot ? (
                  <Image
                    src={booking.propertyCoverImageSnapshot}
                    alt={booking.propertyTitleSnapshot}
                    fill
                    sizes="(max-width: 640px) 100vw, 112px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-secondary)]">
                    No image
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-1">
                  <MapPin className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>{booking.propertyCitySnapshot}</span>
                </div>
                <h2 className="font-serif text-xl font-bold text-[var(--text-primary)] mb-2 truncate">
                  {booking.propertyTitleSnapshot}
                </h2>
                <Link
                  href={`/stays/${booking.propertySlugSnapshot}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                >
                  <span>View property details</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Travel Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-[var(--border)] p-6 sm:p-8 bg-[var(--bg-primary)] gap-4">
              <div className="p-4 rounded-2xl bg-white border border-[var(--border)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
                  Check-in
                </span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {formatDateDisplay(booking.checkIn, { weekday: 'short' })}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[var(--border)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
                  Checkout
                </span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {formatDateDisplay(booking.checkOut, { weekday: 'short' })}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[var(--border)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
                  Travelers
                </span>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {booking.guestCount} {booking.guestCount === 1 ? 'Guest' : 'Guests'} •{' '}
                    {booking.nights} {booking.nights === 1 ? 'night' : 'nights'}
                  </span>
                </div>
              </div>
            </div>

            {/* Price Breakdown Snapshot */}
            <div className="p-6 sm:p-8 border-b border-[var(--border)] space-y-3 text-sm">
              <h3 className="font-serif text-lg font-bold text-[var(--text-primary)] mb-3">
                Price Breakdown
              </h3>

              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>
                  {booking.pricePerNightFormatted} × {booking.nights}{' '}
                  {booking.nights === 1 ? 'night' : 'nights'}
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {booking.nightlySubtotalFormatted}
                </span>
              </div>

              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Cleaning &amp; preparation fee</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {booking.cleaningFeeFormatted}
                </span>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex justify-between text-base font-bold text-[var(--text-primary)]">
                <span>Total amount</span>
                <span className="text-[var(--accent-primary)] font-serif text-lg">
                  {booking.totalAmountFormatted}
                </span>
              </div>
            </div>

            {/* Action & Checkout Button */}
            <div className="p-6 sm:p-8 bg-[var(--bg-primary)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/account/bookings"
                className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                ← Back to My Bookings
              </Link>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                {booking.status === 'HOLD' && !isExpired && (
                  <button
                    type="button"
                    disabled={isCancelling || isPaying}
                    onClick={handleCancelHold}
                    className="px-4 py-3 rounded-2xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Releasing hold...</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Hold</span>
                      </>
                    )}
                  </button>
                )}

                {isHoldActive && (
                  <button
                    type="button"
                    disabled={isPaying || isCancelling}
                    onClick={handleInitiatePayment}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover-strong)] text-white text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting to Gateway...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pay {booking.totalAmountFormatted} &amp; Confirm</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Secure Payment Assurance Footer */}
          <div className="p-6 rounded-3xl bg-white border border-[var(--border)] shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-base font-bold text-[var(--text-primary)] mb-1">
                Guaranteed by StayScape &amp; Razorpay
              </h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Transactions are processed through encrypted 256-bit SSL connections via Razorpay.
                In the rare event that payment finishes after the 10-minute reservation hold
                expires, our backend engine will automatically initiate a 100% compensation refund.
              </p>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
