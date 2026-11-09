'use client';

import React, { useEffect, useState } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import Link from 'next/link';
import Image from 'next/image';
import { adminApi } from '@/lib/api';
import type { AdminPropertyItem, AdminPaginationMeta } from '@/types/admin';
import {
  Home,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<AdminPropertyItem[]>([]);
  const [meta, setMeta] = useState<AdminPaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [search, setSearch] = useState('');
  const [moderationFilter, setModerationFilter] = useState<
    'ALL' | 'APPROVED' | 'FLAGGED' | 'REJECTED'
  >('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'PAUSED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Moderation Dialog states
  const [selectedProp, setSelectedProp] = useState<AdminPropertyItem | null>(null);
  const [moderationAction, setModerationAction] = useState<'APPROVE' | 'FLAG' | 'REJECT' | null>(
    null,
  );
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchProperties = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getProperties({
        page,
        limit: 10,
        search: search.trim() || undefined,
        moderationStatus: moderationFilter !== 'ALL' ? moderationFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      if (res.data) {
        setProperties(res.data.data);
        setMeta(res.data.meta);
      } else {
        setError(res.error ?? 'Failed to load properties');
      }
    } catch {
      setError('Network error while loading listing moderation items');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchProperties(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, moderationFilter, statusFilter]);

  const handleModerationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProp || !moderationAction) return;

    if ((moderationAction === 'FLAG' || moderationAction === 'REJECT') && !reason.trim()) {
      setActionError(
        'A mandatory administrative rationale is required for flagging or rejecting a listing.',
      );
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      let res;
      if (moderationAction === 'APPROVE') {
        res = await adminApi.approveProperty(selectedProp.id, reason.trim() || undefined);
      } else if (moderationAction === 'FLAG') {
        res = await adminApi.flagProperty(selectedProp.id, reason.trim());
      } else {
        res = await adminApi.rejectProperty(selectedProp.id, reason.trim());
      }

      if (res.data?.success) {
        setModerationAction(null);
        setSelectedProp(null);
        setReason('');
        void fetchProperties(meta.page);
      } else {
        setActionError(res.error ?? 'Failed to update property moderation status.');
      }
    } catch {
      setActionError('Network error during moderation action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPaise = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)]">
            Property Moderation
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Review listings, ensure marketplace content compliance, and enforce safety approvals.
          </p>
        </div>
        <div className="text-xs font-medium text-[var(--text-secondary)] bg-white px-3 py-1.5 rounded-xl border border-[var(--border)] shadow-xs self-start">
          Total Listings: <strong className="text-[var(--text-primary)]">{meta.total}</strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[var(--border)] shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, slug, city..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Moderation Status Filter */}
          <select
            value={moderationFilter}
            onChange={(e) =>
              setModerationFilter(e.target.value as 'ALL' | 'APPROVED' | 'FLAGGED' | 'REJECTED')
            }
            className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            <option value="ALL">All Moderation</option>
            <option value="APPROVED">Approved Only</option>
            <option value="FLAGGED">Flagged for Review</option>
            <option value="REJECTED">Rejected / Delisted</option>
          </select>

          {/* Property Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'ALL' | 'PUBLISHED' | 'DRAFT' | 'PAUSED')
            }
            className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            <option value="ALL">All Listing States</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="PAUSED">Paused</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      ) : null}

      {/* Properties Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Property</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Host</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Pricing</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Moderation</th>
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
              ) : properties.length > 0 ? (
                properties.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--bg-primary)]/80 transition-colors">
                    {/* Property info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 rounded-lg bg-[var(--border)] overflow-hidden relative shrink-0">
                          {p.coverImage ? (
                            <Image
                              src={p.coverImage}
                              alt={p.title}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">
                              <Home className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <Link
                            href={`/admin/properties/${p.id}`}
                            className="font-semibold text-sm text-[var(--text-primary)] hover:text-[var(--accent-primary)] hover:underline truncate block"
                          >
                            {p.title}
                          </Link>
                          <p className="text-[11px] text-[var(--text-secondary)] truncate">
                            {p.city}, {p.state} • <span className="font-mono">{p.slug}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Host */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      <p className="font-medium text-[var(--text-primary)]">{p.host.displayName}</p>
                      <p className="text-[11px] truncate">{p.host.email}</p>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                      {formatPaise(p.basePricePaise)}
                      <span className="text-[10px] text-[var(--text-secondary)] block font-normal">
                        / night
                      </span>
                    </td>

                    {/* Listing Status */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                        {p.status}
                      </span>
                    </td>

                    {/* Moderation Status */}
                    <td className="py-3.5 px-4">
                      {p.moderationStatus === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approved
                        </span>
                      ) : p.moderationStatus === 'FLAGGED' ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Flagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          Rejected
                        </span>
                      )}
                      {p.moderationReason ? (
                        <span className="text-[10px] text-[var(--text-secondary)] block max-w-xs truncate mt-0.5">
                          &ldquo;{p.moderationReason}&rdquo;
                        </span>
                      ) : null}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-[var(--accent-primary)]"
                        >
                          <Link href={`/admin/properties/${p.id}`}>Inspect</Link>
                        </Button>

                        {p.moderationStatus !== 'APPROVED' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProp(p);
                              setModerationAction('APPROVE');
                              setReason('');
                              setActionError(null);
                            }}
                            className="h-8 px-2.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          >
                            Approve
                          </Button>
                        ) : null}

                        {p.moderationStatus !== 'FLAGGED' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProp(p);
                              setModerationAction('FLAG');
                              setReason('');
                              setActionError(null);
                            }}
                            className="h-8 px-2.5 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 rounded-lg"
                          >
                            Flag
                          </Button>
                        ) : null}

                        {p.moderationStatus !== 'REJECTED' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProp(p);
                              setModerationAction('REJECT');
                              setReason('');
                              setActionError(null);
                            }}
                            className="h-8 px-2.5 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg"
                          >
                            Reject
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[var(--text-secondary)]">
                    No properties found matching current filters.
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
              onClick={() => fetchProperties(meta.page - 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNextPage || isLoading}
              onClick={() => fetchProperties(meta.page + 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Moderation Confirmation Dialog */}
      {moderationAction && selectedProp ? (
        <AccessibleDialog
          ariaLabel="Moderate property listing"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClose={() => {
            setModerationAction(null);
            setSelectedProp(null);
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-[var(--border)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                {moderationAction === 'APPROVE' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : moderationAction === 'FLAG' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <span>
                  {moderationAction === 'APPROVE'
                    ? 'Approve Property Listing'
                    : moderationAction === 'FLAG'
                      ? 'Flag Property for Review'
                      : 'Reject / Delist Property Listing'}
                </span>
              </div>
              <button
                onClick={() => setModerationAction(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModerationSubmit} className="space-y-4 pt-4">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {moderationAction === 'APPROVE'
                  ? `Approving "${selectedProp.title}" will allow it to be visible in public search and bookable by guests.`
                  : moderationAction === 'FLAG'
                    ? `Flagging "${selectedProp.title}" keeps it in review and temporarily unpublishes it from public discovery.`
                    : `Rejecting "${selectedProp.title}" prevents it from being discovered or booked on the platform.`}
              </p>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                  Reason {moderationAction !== 'APPROVE' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required={moderationAction !== 'APPROVE'}
                  placeholder={
                    moderationAction === 'APPROVE'
                      ? 'Optional note...'
                      : 'Specify trust, safety, or quality concerns...'
                  }
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
                  onClick={() => setModerationAction(null)}
                  disabled={isSubmitting}
                  className="rounded-xl border-[var(--border)]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-xl text-white ${
                    moderationAction === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : moderationAction === 'FLAG'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmitting
                    ? 'Saving...'
                    : moderationAction === 'APPROVE'
                      ? 'Confirm Approval'
                      : moderationAction === 'FLAG'
                        ? 'Confirm Flag'
                        : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          </div>
        </AccessibleDialog>
      ) : null}
    </div>
  );
}
