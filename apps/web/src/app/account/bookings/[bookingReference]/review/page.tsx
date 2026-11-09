'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck, Calendar } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { reviewsApi } from '@/lib/api';
import { ReviewEligibilityResponse } from '@/types/reviews';

interface ReviewPageProps {
  params: Promise<{ bookingReference: string }>;
}

export default function BookingReviewPage({ params }: ReviewPageProps) {
  const resolvedParams = use(params);
  const { bookingReference } = resolvedParams;

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [eligibility, setEligibility] = useState<ReviewEligibilityResponse | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(true);

  // Form State
  const [overallRating, setOverallRating] = useState<number>(5);
  const [cleanlinessRating, setCleanlinessRating] = useState<number>(5);
  const [accuracyRating, setAccuracyRating] = useState<number>(5);
  const [checkInRating, setCheckInRating] = useState<number>(5);
  const [communicationRating, setCommunicationRating] = useState<number>(5);
  const [locationRating, setLocationRating] = useState<number>(5);
  const [valueRating, setValueRating] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(
        `/login?redirect=/account/bookings/${encodeURIComponent(bookingReference)}/review`,
      );
    }
  }, [authLoading, isAuthenticated, bookingReference, router]);

  useEffect(() => {
    async function check() {
      if (!isAuthenticated) return;
      try {
        setLoadingEligibility(true);
        const res = await reviewsApi.checkEligibility(bookingReference);
        if (res.data) {
          setEligibility(res.data);
        } else {
          setErrorMsg(res.error || 'Failed to verify booking eligibility.');
        }
      } catch {
        setErrorMsg('Network error while checking review eligibility.');
      } finally {
        setLoadingEligibility(false);
      }
    }
    check();
  }, [isAuthenticated, bookingReference]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 20) {
      setErrorMsg('Comment must be at least 20 characters long.');
      return;
    }
    if (comment.trim().length > 2000) {
      setErrorMsg('Comment cannot exceed 2000 characters.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await reviewsApi.createReview({
        bookingReference,
        overallRating,
        cleanlinessRating,
        accuracyRating,
        checkInRating,
        communicationRating,
        locationRating,
        valueRating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });

      if (res.data) {
        setSuccess(true);
        setTimeout(() => {
          if (eligibility?.booking?.propertySlug) {
            router.push(`/stays/${eligibility.booking.propertySlug}#reviews`);
          } else {
            router.push('/account/bookings');
          }
        }, 2000);
      } else {
        setErrorMsg(res.error || 'Failed to submit review.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const StarPicker = ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (val: number) => void;
    label?: string;
  }) => (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border)]/60 last:border-b-0">
      {label && <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-110 transition-transform focus:outline-none"
            aria-label={`${star} star`}
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                star <= value
                  ? 'fill-[var(--accent-secondary)] text-[var(--accent-secondary)]'
                  : 'text-[var(--border)] hover:text-[var(--accent-secondary)]/50'
              }`}
            />
          </button>
        ))}
        <span className="text-xs font-semibold text-[var(--text-secondary)] ml-2 w-4">{value}</span>
      </div>
    </div>
  );

  if (authLoading || loadingEligibility) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="h-8 w-60 bg-stone-200 animate-pulse rounded-lg mb-8" />
        <div className="h-64 bg-stone-100 animate-pulse rounded-3xl" />
      </main>
    );
  }

  if (eligibility && !eligibility.eligible) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-white rounded-3xl border border-[var(--border)] p-10 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-3">
            Review Not Available
          </h1>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
            {eligibility.message || 'This reservation is not eligible for review at this time.'}
          </p>
          <Link
            href="/account/bookings"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium hover:bg-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Bookings
          </Link>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="bg-white rounded-3xl border border-[var(--border)] p-12 shadow-md">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)] mb-3">
            Review Submitted!
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Thank you for sharing your experience. Your verified review helps future travellers
            discover unique stays.
          </p>
          <p className="text-xs text-stone-400">Redirecting you to the property page...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      {/* Back link */}
      <Link
        href="/account/bookings"
        className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Bookings
      </Link>

      {/* Property Context Banner */}
      <div className="bg-white rounded-3xl border border-[var(--border)] p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
            Verified Stay Review
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            {eligibility?.booking?.propertyTitle || 'Stay Experience'}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Stay completed: {eligibility?.booking?.checkOut} • Reference: {bookingReference}
          </p>
        </div>
      </div>

      {/* Review Form Card */}
      <div className="bg-white rounded-3xl border border-[var(--border)] p-8 sm:p-10 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-8">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Overall Rating */}
          <div className="pb-6 border-b border-[var(--border)]">
            <label className="block font-serif text-lg font-bold text-[var(--text-primary)] mb-2">
              Overall Rating
            </label>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              How would you rate your stay overall? (1 = Poor, 5 = Exceptional)
            </p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setOverallRating(star)}
                  className="p-1 hover:scale-125 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= overallRating
                        ? 'fill-[var(--accent-secondary)] text-[var(--accent-secondary)]'
                        : 'text-[var(--border)] hover:text-[var(--accent-secondary)]/40'
                    }`}
                  />
                </button>
              ))}
              <span className="text-sm font-bold text-[var(--text-primary)] ml-3">
                {overallRating} / 5 Stars
              </span>
            </div>
          </div>

          {/* 2. Category Ratings */}
          <div className="pb-6 border-b border-[var(--border)]">
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)] mb-1">
              Category Ratings (Optional)
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Help other guests by rating specific aspects of your stay.
            </p>
            <div className="space-y-1">
              <StarPicker
                label="Cleanliness"
                value={cleanlinessRating}
                onChange={setCleanlinessRating}
              />
              <StarPicker
                label="Listing Accuracy"
                value={accuracyRating}
                onChange={setAccuracyRating}
              />
              <StarPicker
                label="Check-in Experience"
                value={checkInRating}
                onChange={setCheckInRating}
              />
              <StarPicker
                label="Host Communication"
                value={communicationRating}
                onChange={setCommunicationRating}
              />
              <StarPicker
                label="Location & Surroundings"
                value={locationRating}
                onChange={setLocationRating}
              />
              <StarPicker label="Value for Money" value={valueRating} onChange={setValueRating} />
            </div>
          </div>

          {/* 3. Review Title */}
          <div>
            <label
              htmlFor="review-title"
              className="block text-sm font-semibold text-[var(--text-primary)] mb-1"
            >
              Headline Title <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <input
              id="review-title"
              type="text"
              maxLength={100}
              placeholder="e.g. Stunning sunrise views and very cozy cabin"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all"
            />
          </div>

          {/* 4. Detailed Comment */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="review-comment"
                className="block text-sm font-semibold text-[var(--text-primary)]"
              >
                Your Review <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-xs ${comment.length < 20 ? 'text-amber-600' : 'text-stone-400'}`}
              >
                {comment.length} / 2000 characters {comment.length < 20 && '(min. 20)'}
              </span>
            </div>
            <textarea
              id="review-comment"
              required
              rows={5}
              maxLength={2000}
              placeholder="Tell others what you loved about this stay, the host's hospitality, or any tips for future guests..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all resize-y"
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-4 flex items-center justify-between gap-4">
            <Link
              href="/account/bookings"
              className="px-6 py-3 rounded-full border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-stone-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || comment.trim().length < 20}
              className="px-8 py-3 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? 'Submitting...' : 'Post Verified Review'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
