'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import type { AdminReportItem } from '@/types/admin';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminReportDetailPage() {
  const params = useParams();
  const reportId = params?.reportId as string;

  const [report, setReport] = useState<AdminReportItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update
  const [status, setStatus] = useState<'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED'>(
    'RESOLVED',
  );
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const fetchReport = async () => {
    if (!reportId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getReportDetails(reportId);
      if (res.data) {
        setReport(res.data);
        setStatus(res.data.status);
        setNotes(res.data.resolutionNotes || '');
      } else {
        setError(res.error ?? 'Report not found');
      }
    } catch {
      setError('Network error loading report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport();
  }, [reportId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;
    setIsUpdating(true);
    setUpdateMsg(null);

    try {
      const res = await adminApi.updateReportStatus(report.id, status, notes.trim() || undefined);
      if (res.data?.success) {
        setUpdateMsg({ type: 'success', text: 'Report status successfully updated.' });
        void fetchReport();
      } else {
        setUpdateMsg({ type: 'error', text: res.error ?? 'Failed to update status.' });
      }
    } catch {
      setUpdateMsg({ type: 'error', text: 'Network error during report update.' });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-[var(--border)] rounded-md" />
        <div className="h-48 bg-white border border-[var(--border)] rounded-3xl p-6" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Reports
        </Link>
        <div className="p-6 bg-white rounded-3xl border border-[var(--border)] text-center">
          <p className="text-rose-700 font-medium">{error ?? 'Report could not be found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Reports Queue
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
              Target: {report.targetType}
            </span>
            <span className="font-mono text-xs font-semibold text-[var(--text-secondary)]">
              ID: {report.id}
            </span>
            {report.status === 'OPEN' ? (
              <Badge className="bg-amber-100 text-amber-800 border-none">Open</Badge>
            ) : report.status === 'UNDER_REVIEW' ? (
              <Badge className="bg-blue-100 text-blue-800 border-none">Under Review</Badge>
            ) : report.status === 'RESOLVED' ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-none">Resolved</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800 border-none">Dismissed</Badge>
            )}
          </div>
          <h1 className="font-serif text-2xl font-bold text-[var(--text-primary)] mt-3">
            Reason: <span className="text-rose-700">{report.reason}</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Submitted on {new Date(report.createdAt).toLocaleString()} by{' '}
            <strong className="text-[var(--text-primary)]">{report.reporter.name}</strong> (
            {report.reporter.email})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Target and Description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Preview */}
          <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-3">
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Reported Target Content
            </h3>
            <div className="p-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border)]">
              <p className="text-xs text-[var(--text-secondary)] font-mono mb-1">
                Target ID: {report.targetId}
              </p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {report.targetPreview || '—'}
              </p>
            </div>
            {report.targetType === 'PROPERTY' ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-xl border-[var(--border)] text-xs"
              >
                <Link href={`/admin/properties/${report.targetId}`}>
                  Inspect Property Details <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
            ) : null}
          </div>

          {/* Reporter Narrative */}
          <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-3">
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Reporter&apos;s Explanation
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border)] italic">
              &ldquo;
              {report.description ||
                'No detailed written description was provided with this report.'}
              &rdquo;
            </p>
          </div>
        </div>

        {/* Resolution Panel */}
        <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-4">
          <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
            Resolution & Actions
          </h3>
          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[var(--text-secondary)] uppercase mb-1.5">
                Resolution Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED')
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
              <label className="block font-semibold text-[var(--text-secondary)] uppercase mb-1.5">
                Resolution Notes
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log actions taken or findings..."
                className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)]"
              />
            </div>

            {updateMsg ? (
              <div
                className={`p-3 rounded-xl text-xs ${
                  updateMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {updateMsg.text}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isUpdating}
              className="w-full rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white"
            >
              {isUpdating ? 'Saving...' : 'Save Resolution'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
