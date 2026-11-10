'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import type { AdminHostDetails } from '@/types/admin';
import { ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminHostDetailsPage() {
  const params = useParams();
  const hostProfileId = params?.hostProfileId as string;

  const [host, setHost] = useState<AdminHostDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status modal
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'SUSPEND' | 'ACTIVATE'>('SUSPEND');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchHostDetails = useCallback(async () => {
    if (!hostProfileId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getHostDetails(hostProfileId);
      if (res.data) {
        setHost(res.data);
      } else {
        setError(res.error ?? 'Host not found');
      }
    } catch {
      setError('Network error loading host details');
    } finally {
      setIsLoading(false);
    }
  }, [hostProfileId]);

  useEffect(() => {
    void fetchHostDetails();
  }, [fetchHostDetails]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      const res =
        modalAction === 'SUSPEND'
          ? await adminApi.suspendHost(host.id, reason.trim())
          : await adminApi.activateHost(host.id, reason.trim() || undefined);

      if (res.data?.success) {
        setShowModal(false);
        setReason('');
        void fetchHostDetails();
      } else {
        setModalError(res.error ?? 'Failed to update host status');
      }
    } catch {
      setModalError('Network error during status update');
    } finally {
      setIsSubmitting(false);
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

  if (error || !host) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/hosts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Hosts
        </Link>
        <div className="p-6 bg-white rounded-3xl border border-[var(--border)] text-center">
          <p className="text-rose-700 font-medium">{error ?? 'Host could not be found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/hosts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Hosts
        </Link>
      </div>

      {/* Host Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-[var(--accent-primary)] text-white flex items-center justify-center font-serif text-3xl font-bold shadow-sm">
            {host.displayName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-2xl font-bold text-[var(--text-primary)]">
                {host.displayName}
              </h1>
              {host.status === 'ACTIVE' ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-none">Active Host</Badge>
              ) : host.status === 'SUSPENDED' ? (
                <Badge className="bg-rose-100 text-rose-800 border-none">Suspended</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 border-none">Pending</Badge>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Account Email:{' '}
              <strong className="text-[var(--text-primary)]">{host.user.email}</strong> • User ID:{' '}
              <Link
                href={`/admin/users/${host.user.id}`}
                className="text-[var(--accent-primary)] hover:underline font-mono"
              >
                {host.user.id}
              </Link>
            </p>
            {host.bio ? (
              <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-xl italic">
                &ldquo;{host.bio}&rdquo;
              </p>
            ) : null}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {host.status === 'ACTIVE' ? (
            <Button
              variant="outline"
              onClick={() => {
                setModalAction('SUSPEND');
                setReason('');
                setModalError(null);
                setShowModal(true);
              }}
              className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl"
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              Suspend Host
            </Button>
          ) : (
            <Button
              onClick={() => {
                setModalAction('ACTIVATE');
                setReason('');
                setModalError(null);
                setShowModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Activate Host
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[var(--border)] shadow-xs">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Published Listings
          </span>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {host.stats.publishedProperties}
          </p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-[var(--border)] shadow-xs">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Total Listings
          </span>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {host.stats.totalProperties}
          </p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-[var(--border)] shadow-xs">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Draft Listings
          </span>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {host.stats.draftProperties}
          </p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-[var(--border)] shadow-xs">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Paused Listings
          </span>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {host.stats.pausedProperties}
          </p>
        </div>
      </div>

      {/* Hosted Properties List */}
      <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-4">
        <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
          Properties Hosted
        </h3>
        {host.properties && host.properties.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[var(--text-secondary)] border-b border-[var(--border)]">
                <tr>
                  <th className="py-2.5">Title</th>
                  <th className="py-2.5">Location</th>
                  <th className="py-2.5">Base Price</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Moderation</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {host.properties.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--bg-primary)]">
                    <td className="py-3 font-semibold text-[var(--text-primary)]">
                      <Link
                        href={`/admin/properties/${p.id}`}
                        className="hover:text-[var(--accent-primary)] hover:underline"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="py-3 text-[var(--text-secondary)]">{p.location}</td>
                    <td className="py-3 font-medium text-[var(--text-primary)]">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0,
                      }).format(p.pricePerNightPaise / 100)}
                      /night
                    </td>
                    <td className="py-3">
                      <span className="font-medium text-[11px] uppercase">{p.status}</span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`font-semibold text-[11px] px-2 py-0.5 rounded ${
                          p.moderationStatus === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : p.moderationStatus === 'FLAGGED'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {p.moderationStatus}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-[var(--accent-primary)]"
                      >
                        <Link href={`/admin/properties/${p.id}`}>Inspect</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-[var(--text-secondary)]">
            This host has not created any listings yet.
          </p>
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal ? (
        <AccessibleDialog
          ariaLabel="Update host status"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClose={() => setShowModal(false)}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-[var(--border)]">
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              {modalAction === 'SUSPEND' ? 'Suspend Host Profile' : 'Reactivate Host Profile'}
            </h3>
            <form onSubmit={handleAction} className="space-y-4 mt-4">
              <p className="text-xs text-[var(--text-secondary)]">
                {modalAction === 'SUSPEND'
                  ? `Provide the reason for suspending ${host.displayName}. Their listings will be hidden from search.`
                  : `Confirm reactivation of ${host.displayName}.`}
              </p>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                  Reason {modalAction === 'SUSPEND' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required={modalAction === 'SUSPEND'}
                  placeholder="Audit reason..."
                  className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)]"
                />
              </div>
              {modalError ? (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{modalError}</div>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="rounded-xl border-[var(--border)]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-xl text-white ${
                    modalAction === 'SUSPEND'
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
