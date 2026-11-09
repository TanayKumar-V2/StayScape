'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Star,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  MessageSquare,
  ChevronDown,
  Loader2,
  Calendar,
} from 'lucide-react';
import { reviewsApi, aiApi } from '@/lib/api';
import type {
  ReviewItem,
  ReviewSummaryData,
  AiReviewSummaryResponse,
  ReviewCategoryRatings,
} from '@/types/reviews';
import { cn } from '@/lib/utils';

interface PropertyReviewsProps {
  propertySlug: string;
  propertyTitle: string;
}

type SortOption = 'newest' | 'highest_rating' | 'lowest_rating';

const CATEGORY_LABELS: Record<keyof ReviewCategoryRatings, string> = {
  cleanliness: 'Cleanliness',
  accuracy: 'Accuracy',
  communication: 'Communication',
  location: 'Location',
  checkIn: 'Check-in',
  value: 'Value',
};

export function PropertyReviews({ propertySlug, propertyTitle }: PropertyReviewsProps) {
  const [summary, setSummary] = useState<ReviewSummaryData | null>(null);
  const [aiSummary, setAiSummary] = useState<AiReviewSummaryResponse | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [sort, setSort] = useState<SortOption>('newest');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Load Review Summary & AI Summary on mount / slug change
  useEffect(() => {
    let isMounted = true;

    async function fetchSummary() {
      try {
        const res = await reviewsApi.getPropertyReviewSummary(propertySlug);
        if (isMounted && res.data) {
          setSummary(res.data);
        }
      } catch {
        // Fallback gracefully
      }
    }

    async function fetchAiSummary() {
      try {
        const res = await aiApi.getReviewSummary(propertySlug);
        if (isMounted && res.data) {
          setAiSummary(res.data);
        }
      } catch {
        // AI summary is optional/progressive enhancement
      }
    }

    void fetchSummary();
    void fetchAiSummary();

    return () => {
      isMounted = false;
    };
  }, [propertySlug]);

  // Load Reviews list
  const fetchReviews = useCallback(
    async (targetPage: number, sortOption: SortOption, append = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoadingReviews(true);
      }

      try {
        const res = await reviewsApi.getPropertyReviews(propertySlug, targetPage, 6, sortOption);
        if (res.data) {
          if (append) {
            setReviews((prev) => [...prev, ...res.data!.data]);
          } else {
            setReviews(res.data.data);
          }
          setTotalPages(res.data.meta.totalPages);
          setTotalCount(res.data.meta.total);
          setPage(res.data.meta.page);
        }
      } catch {
        // Fallback gracefully
      } finally {
        setIsLoadingReviews(false);
        setIsLoadingMore(false);
      }
    },
    [propertySlug],
  );

  useEffect(() => {
    setPage(1);
    void fetchReviews(1, sort, false);
  }, [fetchReviews, sort]);

  const handleLoadMore = () => {
    if (page < totalPages && !isLoadingMore) {
      void fetchReviews(page + 1, sort, true);
    }
  };

  const handleSortChange = (newSort: SortOption) => {
    if (newSort !== sort) {
      setSort(newSort);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={cn(
              'w-3.5 h-3.5',
              s <= rating
                ? 'fill-[var(--accent-secondary)] text-[var(--accent-secondary)]'
                : 'text-[var(--border)] fill-[var(--bg-primary)]',
            )}
          />
        ))}
      </div>
    );
  };

  const formatReviewDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div id="reviews" className="space-y-10 pt-2">
      {/* Header & Overall Score */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]">
              <Star className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                {summary && summary.averageRating !== null ? (
                  <>
                    <span>{summary.averageRating.toFixed(2)}</span>
                    <span className="text-[var(--text-secondary)] font-normal text-xl sm:text-2xl">
                      ({summary.totalReviews} {summary.totalReviews === 1 ? 'review' : 'reviews'})
                    </span>
                  </>
                ) : (
                  <span>Guest Reviews</span>
                )}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Authentic feedback from verified guests who completed their stay at {propertyTitle}
              </p>
            </div>
          </div>

          {/* Sort selector */}
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-[var(--text-secondary)]">Sort by:</span>
              <div className="relative inline-block">
                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  className="appearance-none bg-white border border-[var(--border)] rounded-xl px-3.5 py-1.5 pr-8 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] cursor-pointer"
                >
                  <option value="newest">Most Recent</option>
                  <option value="highest_rating">Highest Rated</option>
                  <option value="lowest_rating">Lowest Rated</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Aggregate Score Grid & Distribution */}
      {summary && summary.totalReviews > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-8 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border)]">
          {/* Category Averages */}
          <div className="space-y-4">
            <h3 className="font-serif text-base font-bold text-[var(--text-primary)] mb-3">
              Ratings Breakdown
            </h3>
            <div className="space-y-3">
              {(Object.keys(CATEGORY_LABELS) as (keyof ReviewCategoryRatings)[]).map(
                (categoryKey) => {
                  const score = summary.categoryAverages[categoryKey];
                  const pct = score !== null ? (score / 5) * 100 : 0;
                  return (
                    <div key={categoryKey} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-primary)] font-medium w-28">
                        {CATEGORY_LABELS[categoryKey]}
                      </span>
                      <div className="flex items-center gap-3 flex-1 max-w-[180px]">
                        <div className="h-2 flex-1 rounded-full bg-[var(--border)] overflow-hidden">
                          <div
                            className="h-full bg-[var(--text-primary)] rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-semibold text-[var(--text-primary)] w-7 text-right">
                          {score !== null ? score.toFixed(1) : '—'}
                        </span>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>

          {/* Star Distribution */}
          <div className="space-y-4">
            <h3 className="font-serif text-base font-bold text-[var(--text-primary)] mb-3">
              Overall Score
            </h3>
            <div className="space-y-2.5">
              {[5, 4, 3, 2, 1].map((starCount) => {
                const distItem = summary.ratingDistribution[
                  starCount as keyof ReviewSummaryData['ratingDistribution']
                ] || { count: 0, percentage: 0 };
                return (
                  <div key={starCount} className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 w-12 text-[var(--text-primary)] font-medium">
                      <span>{starCount}</span>
                      <Star className="w-3 h-3 fill-[var(--accent-secondary)] text-[var(--accent-secondary)]" />
                    </div>
                    <div className="h-2 flex-1 rounded-full bg-[var(--border)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-secondary)] rounded-full transition-all duration-500"
                        style={{ width: `${distItem.percentage}%` }}
                      />
                    </div>
                    <span className="text-[var(--text-secondary)] w-14 text-right">
                      {distItem.count} ({distItem.percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AI Review Summary (Groq LLM) */}
      {aiSummary?.available && (
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[var(--bg-primary)] via-white to-[var(--bg-secondary)] border border-[var(--border)] shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)] block">
                  AI Intelligence
                </span>
                <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
                  Guest Insights, Summarized by AI
                </h3>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] self-start sm:self-auto">
              <ThumbsUp className="w-3 h-3" />
              {aiSummary.overallSentiment === 'POSITIVE'
                ? 'Highly Recommended'
                : aiSummary.overallSentiment === 'MIXED'
                  ? 'Balanced Experiences'
                  : 'Critical Feedback'}
            </span>
          </div>

          <p className="text-sm text-[var(--text-primary)]/85 leading-relaxed mb-6 font-light">
            {aiSummary.headline}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Highlights */}
            {aiSummary.highlights && aiSummary.highlights.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>What Guests Loved</span>
                </h4>
                <ul className="space-y-2">
                  {aiSummary.highlights.map((h, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-[var(--text-primary)] leading-relaxed flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-[var(--border)]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] mt-1.5 shrink-0" />
                      <div>
                        <span className="font-semibold">{h.topic}: </span>
                        <span>{h.summary}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Considerations */}
            {aiSummary.concerns && aiSummary.concerns.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Good to Keep in Mind</span>
                </h4>
                <ul className="space-y-2">
                  {aiSummary.concerns.map((c, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-[var(--text-primary)] leading-relaxed flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-[var(--border)]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <div>
                        <span className="font-semibold">{c.topic}: </span>
                        <span>{c.summary}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="text-[10px] text-[var(--text-secondary)] mt-5 pt-4 border-t border-[var(--border)]/60">
            Synthesized by Groq Llama 3 from {aiSummary.reviewCount} verified StayScape guest
            reviews.
          </p>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {isLoadingReviews ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-6 rounded-3xl bg-white border border-[var(--border)] animate-pulse space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-primary)]" />
                  <div className="space-y-1.5">
                    <div className="w-24 h-4 bg-[var(--bg-primary)] rounded" />
                    <div className="w-16 h-3 bg-[var(--bg-primary)] rounded" />
                  </div>
                </div>
                <div className="w-full h-12 bg-[var(--bg-primary)] rounded-xl" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border)] text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)] mb-1">
              No reviews yet for this property
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              This property is recently listed on StayScape. Reviews are verified and can only be
              submitted by guests following completed stays.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-6 rounded-3xl bg-white border border-[var(--border)] shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* User info & header */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center shrink-0">
                          {rev.guest.avatarUrl ? (
                            <Image
                              src={rev.guest.avatarUrl}
                              alt={rev.guest.displayName}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold text-[var(--accent-primary)]">
                              {rev.guest.displayName.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-[var(--text-primary)]">
                            {rev.guest.displayName}
                          </h4>
                          <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[var(--text-secondary)]" />
                            {formatReviewDate(rev.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        {renderStars(rev.overallRating)}
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-primary)] mt-1">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Stay
                        </span>
                      </div>
                    </div>

                    {/* Title if present */}
                    {rev.title && (
                      <h5 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] mt-1 mb-1">
                        {rev.title}
                      </h5>
                    )}

                    {/* Review text */}
                    <p className="text-xs sm:text-sm text-[var(--text-primary)]/85 leading-relaxed font-light mt-1 whitespace-pre-line">
                      {rev.comment}
                    </p>
                  </div>

                  {/* Host Response (if any) */}
                  {rev.hostResponse && (
                    <div className="mt-4 pt-3 border-t border-[var(--border)] bg-[var(--bg-primary)] -mx-2 -mb-2 p-3.5 rounded-2xl">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          Response from host
                        </span>
                        {rev.hostRespondedAt && (
                          <span className="text-[10px] text-[var(--text-secondary)] ml-auto">
                            {formatReviewDate(rev.hostRespondedAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                        &quot;{rev.hostResponse}&quot;
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {page < totalPages && (
              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors shadow-sm disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-primary)]" />
                      <span>Loading more reviews...</span>
                    </>
                  ) : (
                    <span>Show more reviews ({totalCount - reviews.length} remaining)</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
