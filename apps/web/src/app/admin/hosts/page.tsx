'use client';

import React, { useEffect, useState } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import type { AdminHostItem, AdminPaginationMeta } from '@/types/admin';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminHostsPage() {
  const [hosts, setHosts] = useState<AdminHostItem[]>([]);
  const [meta, setMeta] = useState<AdminPaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'PENDING'>(
    'ALL',
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Actions
  const [selectedHost, setSelectedHost] = useState<AdminHostItem | null>(null);
  const [actionType, setActionType] = useState<'SUSPEND' | 'ACTIVATE' | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchHosts = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getHosts({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      if (res.data) {
        setHosts(res.data.data);
        setMeta(res.data.meta);
      } else {
        setError(res.error ?? 'Failed to load hosts');
      }
    } catch {
      setError('Network error while loading host profiles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchHosts(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHost || !actionType) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res =
        actionType === 'SUSPEND'
          ? await adminApi.suspendHost(selectedHost.id, reason.trim())
          : await adminApi.activateHost(selectedHost.id, reason.trim() || undefined);

      if (res.data?.success) {
        setActionType(null);
        setSelectedHost(null);
        setReason('');
        void fetchHosts(meta.page);
      } else {
        setActionError(res.error ?? 'Failed to update host status');
      }
    } catch {
      setActionError('Network error during status update');
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
            Host Management
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Review host listings portfolio, marketplace volume, and operational status.
          </p>
        </div>
        <div className="text-xs font-medium text-[var(--text-secondary)] bg-white px-3 py-1.5 rounded-xl border border-[var(--border)] shadow-xs self-start">
          Total Hosts: <strong className="text-[var(--text-primary)]">{meta.total}</strong>
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
            placeholder="Search by host name or email..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'PENDING')
          }
          className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      ) : null}

      {/* Hosts Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Host</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Properties</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Gross Volume</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Joined</th>
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
              ) : hosts.length > 0 ? (
                hosts.map((h) => (
                  <tr key={h.id} className="hover:bg-[var(--bg-primary)]/80 transition-colors">
                    {/* Host Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex items-center justify-center font-semibold text-xs shrink-0">
                          {h.displayName[0]}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/hosts/${h.id}`}
                            className="font-semibold text-sm text-[var(--text-primary)] hover:text-[var(--accent-primary)] hover:underline"
                          >
                            {h.displayName}
                          </Link>
                          <p className="text-[11px] text-[var(--text-secondary)] truncate">
                            {h.user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {h.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : h.status === 'SUSPENDED' ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Properties */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {h.counts.publishedProperties}
                      </span>{' '}
                      published
                      <span className="text-[11px] block">({h.counts.properties} total)</span>
                    </td>

                    {/* Gross Volume */}
                    <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                      {formatPaise(h.metrics.grossVolumePaise)}
                      <span className="text-[11px] text-[var(--text-secondary)] block font-normal">
                        {h.metrics.completedStays} completed stay(s)
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(h.createdAt).toLocaleDateString()}
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
                          <Link href={`/admin/hosts/${h.id}`}>Inspect</Link>
                        </Button>

                        {h.status === 'ACTIVE' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedHost(h);
                              setActionType('SUSPEND');
                              setReason('');
                              setActionError(null);
                            }}
                            className="h-8 px-2.5 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg"
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedHost(h);
                              setActionType('ACTIVATE');
                              setReason('');
                              setActionError(null);
                            }}
                            className="h-8 px-2.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[var(--text-secondary)]">
                    No hosts found matching current filters.
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
              onClick={() => fetchHosts(meta.page - 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNextPage || isLoading}
              onClick={() => fetchHosts(meta.page + 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {actionType && selectedHost ? (
        <AccessibleDialog
          ariaLabel="Manage host account"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClose={() => {
            setActionType(null);
            setSelectedHost(null);
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-[var(--border)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>
                  {actionType === 'SUSPEND' ? 'Suspend Host Profile' : 'Reactivate Host Profile'}
                </span>
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
                {actionType === 'SUSPEND'
                  ? `Suspending ${selectedHost.displayName} will temporarily unpublish all their listings from public search.`
                  : `Reactivating ${selectedHost.displayName} will restore their approved listings.`}
              </p>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                  Reason {actionType === 'SUSPEND' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required={actionType === 'SUSPEND'}
                  placeholder="Audit reason..."
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
                    actionType === 'SUSPEND'
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
