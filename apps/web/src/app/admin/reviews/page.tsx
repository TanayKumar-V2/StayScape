'use client';

import React, { useEffect, useState } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import type { AdminReviewItem, AdminPaginationMeta } from '@/types/admin';
import {
  Star,
  Search,
  CheckCircle2,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [meta, setMeta] = useState<AdminPaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'HIDDEN'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedReview, setSelectedReview] = useState<AdminReviewItem | null>(null);
  const [actionType, setActionType] = useState<'HIDE' | 'RESTORE' | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchReviews = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getReviews({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      if (res.data) {
        setReviews(res.data.data);
        setMeta(res.data.meta);
      } else {
        setError(res.error ?? 'Failed to load reviews');
      }
    } catch {
      setError('Network error while loading reviews');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchReviews(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview || !actionType) return;

    if (actionType === 'HIDE' && !reason.trim()) {
      setActionError('A mandatory administrative reason is required to hide a guest review.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res =
        actionType === 'HIDE'
          ? await adminApi.hideReview(selectedReview.id, reason.trim())
          : await adminApi.restoreReview(selectedReview.id, reason.trim() || undefined);

      if (res.data?.success) {
        setActionType(null);
        setSelectedReview(null);
        setReason('');
        void fetchReviews(meta.page);
      } else {
        setActionError(res.error ?? 'Failed to update review status');
      }
    } catch {
      setActionError('Network error during review status update');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)]">
            Review Moderation
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Audit guest reviews, maintain trust and authenticity, and suppress abusive or
            retaliatory content.
          </p>
        </div>
        <div className="text-xs font-medium text-[var(--text-secondary)] bg-white px-3 py-1.5 rounded-xl border border-[var(--border)] shadow-xs self-start">
          Total Reviews: <strong className="text-[var(--text-primary)]">{meta.total}</strong>
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
            placeholder="Search comment, property, or reviewer..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'PUBLISHED' | 'HIDDEN')}
          className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        >
          <option value="ALL">All Statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="HIDDEN">Hidden</option>
        </select>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      ) : null}

      {/* Reviews Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">
                  Property & Guest
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Rating</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Comment</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Date</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-4 h-12 bg-gray-50/50" />
                  </tr>
                ))
              ) : reviews.length > 0 ? (
                reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--bg-primary)]/80 transition-colors">
                    {/* Property & Reviewer */}
                    <td className="py-3.5 px-4">
                      <div className="min-w-0 max-w-xs">
                        <Link
                          href={`/admin/properties/${r.property.id}`}
                          className="font-semibold text-sm text-[var(--text-primary)] hover:text-[var(--accent-primary)] hover:underline truncate block"
                        >
                          {r.property.title}
                        </Link>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          By <strong className="text-[var(--text-primary)]">{r.author.name}</strong>{' '}
                          ({r.author.email})
                        </p>
                      </div>
                    </td>

                    {/* Rating */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-bold text-[var(--text-primary)]">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{r.overallRating.toFixed(1)}</span>
                      </div>
                    </td>

                    {/* Comment */}
                    <td className="py-3.5 px-4">
                      <p className="text-xs text-[var(--text-primary)] max-w-md line-clamp-2 leading-relaxed">
                        &ldquo;{r.comment}&rdquo;
                      </p>
                      {r.hiddenReason ? (
                        <p className="text-[10px] text-rose-700 mt-1 font-medium">
                          Hidden reason: {r.hiddenReason}
                        </p>
                      ) : null}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {r.status === 'PUBLISHED' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                          <EyeOff className="w-3.5 h-3.5" /> Hidden
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {r.status === 'PUBLISHED' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReview(r);
                            setActionType('HIDE');
                            setReason('');
                            setActionError(null);
                          }}
                          className="h-8 px-2.5 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg"
                        >
                          Hide Review
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReview(r);
                            setActionType('RESTORE');
                            setReason('');
                            setActionError(null);
                          }}
                          className="h-8 px-2.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                        >
                          Restore
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[var(--text-secondary)]">
                    No reviews found matching current filters.
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
              onClick={() => fetchReviews(meta.page - 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNextPage || isLoading}
              onClick={() => fetchReviews(meta.page + 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {actionType && selectedReview ? (
        <AccessibleDialog
          ariaLabel="Moderate review"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClose={() => {
            setActionType(null);
            setSelectedReview(null);
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-[var(--border)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>{actionType === 'HIDE' ? 'Hide Guest Review' : 'Restore Guest Review'}</span>
              </div>
              <button
                onClick={() => setActionType(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAction} className="space-y-4 pt-4">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {actionType === 'HIDE'
                  ? 'Hiding this review will remove its comment and rating impact from the public property score.'
                  : 'Restoring this review will make it publicly visible again.'}
              </p>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                  Reason {actionType === 'HIDE' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required={actionType === 'HIDE'}
                  placeholder="Specify moderation reason..."
                  className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)]"
                />
              </div>

              {actionError ? (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{actionError}</div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActionType(null)}
                  disabled={isSubmitting}
                  className="rounded-xl border-[var(--border)]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-xl text-white ${
                    actionType === 'HIDE'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isSubmitting ? 'Saving...' : 'Confirm'}
                </Button>
              </div>
            </form>
          </div>
        </AccessibleDialog>
      ) : null}
    </div>
  );
}
