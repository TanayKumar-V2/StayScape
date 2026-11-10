'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Users,
  Star,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { availabilityApi, bookingsApi } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import type { UnavailableRange, PriceBreakdown } from '@/types/booking';
import { AvailabilityCalendar } from './availability-calendar';
import { formatDateDisplay } from '@/lib/date-helpers';

interface BookingCardProps {
  propertySlug: string;
  pricePerNightPaise: number;
  maxGuests: number;
  rating?: number;
  reviewCount?: number;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
}

export function BookingCard({
  propertySlug,
  pricePerNightPaise,
  maxGuests,
  rating,
  reviewCount = 0,
  initialCheckIn = '',
  initialCheckOut = '',
  initialGuests = 1,
}: BookingCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [checkIn, setCheckIn] = useState<string>(initialCheckIn);
  const [checkOut, setCheckOut] = useState<string>(initialCheckOut);
  const [guests, setGuests] = useState<number>(Math.min(maxGuests, Math.max(1, initialGuests)));
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(true);

  const [unavailableRanges, setUnavailableRanges] = useState<UnavailableRange[]>([]);

  const [quote, setQuote] = useState<PriceBreakdown | null>(null);
  const [isCheckingQuote, setIsCheckingQuote] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. Fetch property unavailable ranges
  const fetchCalendar = useCallback(async () => {
    try {
      const res = await availabilityApi.getCalendar(propertySlug);
      if (res.data) {
        setUnavailableRanges(res.data.unavailableRanges);
      }
    } catch {
      // Non-blocking fallback
    }
  }, [propertySlug]);

  useEffect(() => {
    void fetchCalendar();
  }, [fetchCalendar]);

  // 2. Automatically query exact price quote when dates and guests are valid
  const checkAvailabilityQuote = useCallback(async () => {
    if (!checkIn || !checkOut || checkIn >= checkOut) {
      setQuote(null);
      return;
    }

    setIsCheckingQuote(true);
    setErrorMessage(null);

    try {
      const res = await availabilityApi.check(propertySlug, {
        checkIn,
        checkOut,
        guestCount: guests,
      });

      if (res.data) {
        if (res.data.available) {
          setQuote(res.data.pricing);
          setErrorMessage(null);
        } else {
          setQuote(null);
          setErrorMessage(
            res.data.reason || 'Selected dates are no longer available. Please choose other dates.',
          );
        }
      } else {
        setQuote(null);
        setErrorMessage(res.error || 'Unable to verify availability for these dates.');
      }
    } catch {
      setQuote(null);
      setErrorMessage('Network error checking availability. Please try again.');
    } finally {
      setIsCheckingQuote(false);
    }
  }, [propertySlug, checkIn, checkOut, guests]);

  useEffect(() => {
    if (checkIn && checkOut) {
      void checkAvailabilityQuote();
    } else {
      setQuote(null);
      setErrorMessage(null);
    }
  }, [checkIn, checkOut, guests, checkAvailabilityQuote]);

  // Handle date selection from calendar
  const handleSelectRange = (newCheckIn: string, newCheckOut: string) => {
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
    setErrorMessage(null);
    if (newCheckIn && newCheckOut) {
      // Both selected -> close or keep open according to preference
    }
  };

  // 3. Create temporary booking hold
  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkIn || !checkOut) {
      setErrorMessage('Please select both check-in and checkout dates.');
      return;
    }

    if (!isAuthenticated) {
      // Save return URL and redirect to login
      const returnUrl = encodeURIComponent(`/stays/${propertySlug}`);
      router.push(`/login?returnUrl=${returnUrl}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await bookingsApi.createHold({
        propertySlug,
        checkIn,
        checkOut,
        guestCount: guests,
      });

      if (res.data) {
        // Successfully created 10-minute hold -> navigate to hold detail page
        router.push(`/bookings/${res.data.bookingReference}`);
        return;
      }

      if (res.status === 409) {
        setErrorMessage(
          'These dates were just booked by another guest. Please choose a different date range.',
        );
        // Refresh availability calendar
        void fetchCalendar();
      } else if (res.status === 403) {
        setErrorMessage(res.error || 'You cannot book your own property listing.');
      } else {
        setErrorMessage(res.error || 'Could not reserve dates. Please check and try again.');
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred creating reservation.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasReviews = rating !== undefined && reviewCount > 0;
  const priceRupees = Math.round(pricePerNightPaise / 100);

  return (
    <div className="bg-white rounded-3xl border border-[var(--border)] shadow-xl p-6 sm:p-7 sticky top-28">
      {/* Price & Rating Header */}
      <div className="flex items-baseline justify-between mb-5 pb-4 border-b border-[var(--border)]/80">
        <div>
          <span className="font-serif text-3xl font-bold text-[var(--text-primary)]">
            {formatINR(priceRupees)}
          </span>
          <span className="text-xs text-[var(--text-secondary)]"> / night</span>
        </div>

        {hasReviews ? (
          <div className="flex items-center gap-1 text-xs font-semibold text-[var(--text-primary)]">
            <Star className="w-3.5 h-3.5 fill-[var(--accent-secondary)] text-[var(--accent-secondary)]" />
            <span>{rating.toFixed(2)}</span>
            <span className="text-[var(--text-secondary)] font-normal">({reviewCount})</span>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
            New listing
          </span>
        )}
      </div>

      {/* Date & Guest Selectors */}
      <div className="space-y-3 mb-4">
        {/* Date Selector Box */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsCalendarOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setIsCalendarOpen((prev) => !prev);
          }}
          className="grid grid-cols-2 rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--bg-primary)] cursor-pointer hover:border-[var(--accent-primary)]/40 transition-colors"
        >
          <div className="p-3 border-r border-[var(--border)]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Check-in
            </label>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
              <CalendarIcon className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
              <span>{checkIn ? formatDateDisplay(checkIn) : 'Add date'}</span>
            </div>
          </div>

          <div className="p-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Checkout
            </label>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
              <CalendarIcon className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
              <span>{checkOut ? formatDateDisplay(checkOut) : 'Add date'}</span>
            </div>
          </div>
        </div>

        {/* Guest Selector Box */}
        <div className="rounded-2xl border border-[var(--border)] p-3 bg-[var(--bg-primary)]">
          <label
            htmlFor="guest-count-select"
            className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1"
          >
            Guests
          </label>
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
            <select
              id="guest-count-select"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full bg-transparent text-xs font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'guest' : 'guests'} (max {maxGuests})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Interactive Calendar Accordion */}
      {isCalendarOpen && (
        <div className="mb-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <AvailabilityCalendar
            unavailableRanges={unavailableRanges}
            checkIn={checkIn}
            checkOut={checkOut}
            onSelectRange={handleSelectRange}
          />
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* Server-Side Exact Price Breakdown Quote */}
      {quote && !errorMessage && (
        <div className="mb-5 pt-4 border-t border-[var(--border)] space-y-2.5 text-xs animate-in fade-in duration-150">
          <div className="flex justify-between text-[var(--text-secondary)]">
            <span>
              {quote.pricePerNightFormatted} × {quote.nights}{' '}
              {quote.nights === 1 ? 'night' : 'nights'}
            </span>
            <span className="font-medium text-[var(--text-primary)]">
              {quote.nightlySubtotalFormatted}
            </span>
          </div>

          <div className="flex justify-between text-[var(--text-secondary)]">
            <span>Cleaning &amp; preparation fee</span>
            <span className="font-medium text-[var(--text-primary)]">
              {quote.cleaningFeeFormatted}
            </span>
          </div>

          <div className="pt-2.5 border-t border-[var(--border)] flex justify-between text-sm font-bold text-[var(--text-primary)]">
            <span>Total amount</span>
            <span className="text-[var(--accent-primary)]">{quote.totalAmountFormatted}</span>
          </div>
        </div>
      )}

      {/* CTA Reservation Button */}
      <button
        type="button"
        disabled={isSubmitting || isCheckingQuote || !checkIn || !checkOut || !!errorMessage}
        onClick={handleReserve}
        className="w-full py-3.5 px-4 rounded-2xl bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:hover:bg-[var(--accent-primary)] transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Securing 10-minute hold...</span>
          </>
        ) : isCheckingQuote ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Checking availability...</span>
          </>
        ) : !checkIn || !checkOut ? (
          'Check availability'
        ) : (
          'Reserve these dates'
        )}
      </button>

      {/* Reservation Note */}
      <p className="text-center text-[11px] text-[var(--text-secondary)] mt-3">
        {isAuthenticated ? (
          <span className="inline-flex items-center gap-1 text-[var(--accent-primary)]">
            <Clock className="w-3 h-3" />
            10-minute temporary hold • No immediate charge
          </span>
        ) : (
          'You will be asked to sign in to confirm your hold'
        )}
      </p>

      {/* Assurance Footnote */}
      <div className="mt-5 pt-4 border-t border-[var(--border)]/60 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
        <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
        <span>Transparent pricing • Concurrency-safe hold engine</span>
      </div>
    </div>
  );
}
