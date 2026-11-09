'use client';

import React, { useEffect, useState } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import type { AdminUserDetails } from '@/types/admin';
import { ArrowLeft, ShieldAlert, CheckCircle2, Mail, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminUserDetailsPage() {
  const params = useParams();
  const userId = params?.userId as string;

  const [user, setUser] = useState<AdminUserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status modal
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'SUSPEND' | 'ACTIVATE'>('SUSPEND');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchUserDetails = async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUserDetails(userId);
      if (res.data) {
        setUser(res.data);
      } else {
        setError(res.error ?? 'User not found');
      }
    } catch {
      setError('Network error while loading user details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchUserDetails();
  }, [userId]);

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      const res =
        modalAction === 'SUSPEND'
          ? await adminApi.suspendUser(user.id, reason.trim())
          : await adminApi.activateUser(user.id, reason.trim() || undefined);

      if (res.data?.success) {
        setShowModal(false);
        setReason('');
        void fetchUserDetails();
      } else {
        setModalError(res.error ?? 'Failed to update user status');
      }
    } catch {
      setModalError('Network error during status update');
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

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-[var(--border)] rounded-md" />
        <div className="h-48 bg-white border border-[var(--border)] rounded-3xl p-6" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to users
        </Link>
        <div className="p-6 bg-white rounded-3xl border border-[var(--border)] text-center">
          <p className="text-rose-700 font-medium">{error ?? 'User account could not be found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-[var(--accent-primary)] text-white flex items-center justify-center font-serif text-3xl font-bold shadow-sm">
            {user.firstName ? user.firstName[0] : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-2xl font-bold text-[var(--text-primary)]">
                {user.name || 'Unnamed User'}
              </h1>
              {user.role === 'ADMIN' ? (
                <Badge className="bg-purple-100 text-purple-800 border-none">Admin</Badge>
              ) : null}
              {user.isHost ? (
                <Badge className="bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-none">
                  Host Profile
                </Badge>
              ) : null}
              {user.status === 'ACTIVE' ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-none">Active</Badge>
              ) : (
                <Badge className="bg-rose-100 text-rose-800 border-none">Suspended</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mt-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Registered {new Date(user.createdAt).toLocaleDateString()}
              </span>
              <span>•</span>
              <span className="font-mono text-[11px]">ID: {user.id}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {user.status === 'ACTIVE' ? (
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
              Suspend Account
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
              Reactivate Account
            </Button>
          )}
        </div>
      </div>

      {/* Activity Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[var(--border)] shadow-xs">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Bookings
          </span>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {user.stats.bookingsCount}
          </p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-[var(--border)] shadow-xs">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Reviews Written
          </span>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {user.stats.reviewsCount}
          </p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-[var(--border)] shadow-xs">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Saved in Wishlist
          </span>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {user.stats.wishlistCount}
          </p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-[var(--border)] shadow-xs">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Reports Submitted
          </span>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {user.stats.reportsCount}
          </p>
        </div>
      </div>

      {/* Host profile details if applicable */}
      {user.hostProfile ? (
        <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Host Profile
            </h3>
            <Badge variant="outline" className="text-xs border-[var(--border)]">
              {user.hostProfile.status}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {user.hostProfile.displayName}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {user.hostProfile.bio || 'No public host biography provided.'}
          </p>
          <div className="text-xs text-[var(--text-secondary)]">
            Hosting <strong>{user.hostProfile.propertiesCount}</strong> listings on the platform.
          </div>
        </div>
      ) : null}

      {/* Recent Bookings by User */}
      <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-4">
        <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
          Recent Stays & Bookings
        </h3>
        {user.recentBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[var(--text-secondary)] border-b border-[var(--border)]">
                <tr>
                  <th className="py-2.5">Reference</th>
                  <th className="py-2.5">Property</th>
                  <th className="py-2.5">Stay Dates</th>
                  <th className="py-2.5">Amount</th>
                  <th className="py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {user.recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--bg-primary)]">
                    <td className="py-3 font-mono font-medium text-[var(--text-primary)]">
                      <Link
                        href={`/admin/bookings/${b.bookingReference}`}
                        className="hover:underline text-[var(--accent-primary)]"
                      >
                        {b.bookingReference}
                      </Link>
                    </td>
                    <td className="py-3 font-medium text-[var(--text-primary)]">
                      {b.propertyTitle}
                    </td>
                    <td className="py-3 text-[var(--text-secondary)]">
                      {b.checkIn} to {b.checkOut}
                    </td>
                    <td className="py-3 font-semibold text-[var(--text-primary)]">
                      {formatPaise(b.totalAmountPaise)}
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-[11px] uppercase tracking-wider">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-[var(--text-secondary)]">
            This user has not placed any bookings yet.
          </p>
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal ? (
        <AccessibleDialog
          ariaLabel="Update user status"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClose={() => setShowModal(false)}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-[var(--border)]">
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              {modalAction === 'SUSPEND' ? 'Suspend User Account' : 'Reactivate User Account'}
            </h3>
            <form onSubmit={handleStatusChange} className="space-y-4 mt-4">
              <p className="text-xs text-[var(--text-secondary)]">
                {modalAction === 'SUSPEND'
                  ? `Provide the mandatory administrative rationale for suspending ${user.email}.`
                  : `Confirm reactivation of ${user.email}.`}
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
                  placeholder="Reason for audit log..."
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
