'use client';

import React, { useEffect, useState } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import type { AdminReportItem, AdminPaginationMeta } from '@/types/admin';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [meta, setMeta] = useState<AdminPaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED'
  >('ALL');
  const [targetTypeFilter, setTargetTypeFilter] = useState<
    'ALL' | 'PROPERTY' | 'REVIEW' | 'USER' | 'MESSAGE'
  >('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update modal
  const [selectedReport, setSelectedReport] = useState<AdminReportItem | null>(null);
  const [newStatus, setNewStatus] = useState<'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED'>(
    'RESOLVED',
  );
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchReports = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getReports({
        page,
        limit: 10,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        targetType: targetTypeFilter !== 'ALL' ? targetTypeFilter : undefined,
      });

      if (res.data) {
        setReports(res.data.data);
        setMeta(res.data.meta);
      } else {
        setError(res.error ?? 'Failed to load reports');
      }
    } catch {
      setError('Network error while loading content reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchReports(1);
  }, [statusFilter, targetTypeFilter]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await adminApi.updateReportStatus(
        selectedReport.id,
        newStatus,
        resolutionNote.trim() || undefined,
      );

      if (res.data?.success) {
        setSelectedReport(null);
        setResolutionNote('');
        void fetchReports(meta.page);
      } else {
        setActionError(res.error ?? 'Failed to update report status');
      }
    } catch {
      setActionError('Network error during report update');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)]">
            Reports Queue
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Community moderation queue, trust & safety reports, and resolution auditing.
          </p>
        </div>
        <div className="text-xs font-medium text-[var(--text-secondary)] bg-white px-3 py-1.5 rounded-xl border border-[var(--border)] shadow-xs self-start">
          Total Reports: <strong className="text-[var(--text-primary)]">{meta.total}</strong>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[var(--border)] shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as 'ALL' | 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED',
              )
            }
            className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open Only</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>

          <select
            value={targetTypeFilter}
            onChange={(e) =>
              setTargetTypeFilter(
                e.target.value as 'ALL' | 'PROPERTY' | 'REVIEW' | 'USER' | 'MESSAGE',
              )
            }
            className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            <option value="ALL">All Targets</option>
            <option value="PROPERTY">Properties</option>
            <option value="REVIEW">Reviews</option>
            <option value="USER">User Profiles</option>
            <option value="MESSAGE">Direct Messages</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      ) : null}

      {/* Reports Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Target</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Reason</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Reporter</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Submitted</th>
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
              ) : reports.length > 0 ? (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--bg-primary)]/80 transition-colors">
                    {/* Target info */}
                    <td className="py-3.5 px-4">
                      <div className="min-w-0 max-w-xs">
                        <span className="font-mono text-[10px] uppercase font-bold text-[var(--accent-primary)]">
                          {r.targetType}
                        </span>
                        <p className="font-semibold text-xs text-[var(--text-primary)] truncate mt-0.5">
                          {r.targetPreview || r.targetId}
                        </p>
                        {r.description ? (
                          <p className="text-[11px] text-[var(--text-secondary)] truncate">
                            &ldquo;{r.description}&rdquo;
                          </p>
                        ) : null}
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold">
                        {r.reason}
                      </span>
                    </td>

                    {/* Reporter */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      <p className="font-medium text-[var(--text-primary)]">{r.reporter.name}</p>
                      <p className="text-[11px] truncate">{r.reporter.email}</p>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {r.status === 'OPEN' ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" /> Open
                        </span>
                      ) : r.status === 'UNDER_REVIEW' ? (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                          <Clock className="w-3.5 h-3.5" /> In Review
                        </span>
                      ) : r.status === 'RESOLVED' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[var(--text-secondary)] font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Dismissed
                        </span>
                      )}
                    </td>

                    {/* Submitted */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString()}
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
                          <Link href={`/admin/reports/${r.id}`}>Inspect</Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(r);
                            setNewStatus(r.status === 'OPEN' ? 'UNDER_REVIEW' : 'RESOLVED');
                            setResolutionNote(r.resolutionNotes || '');
                            setActionError(null);
                          }}
                          className="h-8 px-2.5 text-xs rounded-lg border-[var(--border)]"
                        >
                          Update Status
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[var(--text-secondary)]">
                    No content reports matching current filters.
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
              onClick={() => fetchReports(meta.page - 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNextPage || isLoading}
              onClick={() => fetchReports(meta.page + 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Update Status Modal */}
      {selectedReport ? (
        <AccessibleDialog
          ariaLabel="Resolve content report"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClose={() => setSelectedReport(null)}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-[var(--border)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                <ShieldCheck className="w-5 h-5 text-[var(--accent-primary)]" />
                <span>Update Report #{selectedReport.id.slice(0, 8)}</span>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusUpdate} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                  Change Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(
                      e.target.value as 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED',
                    )
                  }
                  className="w-full p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)]"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="DISMISSED">DISMISSED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                  Resolution Notes
                </label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Record resolution rationale or outcome..."
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
                  onClick={() => setSelectedReport(null)}
                  disabled={isSubmitting}
                  className="rounded-xl border-[var(--border)]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white"
                >
                  {isSubmitting ? 'Saving...' : 'Save Status'}
                </Button>
              </div>
            </form>
          </div>
        </AccessibleDialog>
      ) : null}
    </div>
  );
}
