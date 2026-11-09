'use client';

import React, { useState, useEffect } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Calendar,
  Mail,
  LogOut,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Compass,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, logoutAll, updateProfile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Loading account details...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    setUpdateSuccess(false);

    if (!firstName.trim() || !lastName.trim()) {
      setUpdateError('First and last names cannot be empty.');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      if (res.success) {
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      } else {
        setUpdateError(res.error ?? 'Failed to update profile.');
      }
    } catch {
      setUpdateError('Network error while updating profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogoutAll = async () => {
    setIsLoggingOutAll(true);
    try {
      await logoutAll();
      router.push('/login');
    } finally {
      setIsLoggingOutAll(false);
      setShowLogoutAllConfirm(false);
    }
  };

  const memberSinceFormatted = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently';

  const userInitials =
    `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-[var(--text-primary)] font-medium">Account Settings</span>
        </nav>

        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-[var(--accent-primary)] text-white flex items-center justify-center font-serif text-3xl font-bold shadow-sm">
              {userInitials}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                  {user.firstName} {user.lastName}
                </h1>
                <span className="text-[11px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                  {user.role}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mt-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  Joined {memberSinceFormatted}
                </span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)]">
              <Shield className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>{user.emailVerified ? 'Email Verified' : 'Account Active'}</span>
            </div>
            <Link
              href="/account/bookings"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--text-primary)] hover:text-[var(--accent-primary)] font-semibold px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] hover:bg-white transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>My Bookings</span>
            </Link>
            <Link
              href="/stays"
              className="inline-flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline font-semibold"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore Stays</span>
            </Link>
          </div>
        </div>

        {/* Two-Column Grid: Profile Settings & Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column: Personal Details Form */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-sm">
            <h2 className="font-serif text-xl font-bold text-[var(--text-primary)] mb-1">
              Personal Details
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mb-6">
              Update your basic account information as visible across reservations.
            </p>

            {updateSuccess && (
              <div className="mb-6 p-4 rounded-2xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] text-sm flex items-center gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Profile details updated successfully!</span>
              </div>
            )}

            {updateError && (
              <div className="mb-6 p-4 rounded-2xl bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] text-sm flex items-center gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{updateError}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-1.5"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isUpdating}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] text-sm text-[var(--text-primary)] transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-1.5"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isUpdating}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] text-sm text-[var(--text-primary)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/70 text-sm text-[var(--text-secondary)] cursor-not-allowed"
                />
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Primary identifier. Email address changes will be enabled alongside email
                  verification.
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-3 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Side Column: Security, Sessions & Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-sm space-y-5">
              <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
                Security &amp; Session
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                StayScape uses short-lived JWT access tokens and cryptographically rotated refresh
                tokens in HTTP-only cookies.
              </p>

              <div className="pt-2 border-t border-[var(--border)] space-y-3">
                <button
                  onClick={() => logout()}
                  className="w-full py-3 px-4 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-primary)] text-sm font-medium text-[var(--text-primary)] flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span>Log out of this device</span>
                </button>

                <button
                  onClick={() => setShowLogoutAllConfirm(true)}
                  className="w-full py-3 px-4 rounded-xl border border-[var(--accent-secondary)]/40 hover:bg-[var(--accent-secondary)]/10 text-sm font-medium text-[var(--accent-secondary)] flex items-center justify-center gap-2 transition-colors"
                >
                  <Laptop className="w-4 h-4 text-[var(--accent-secondary)]" />
                  <span>Log out from all devices</span>
                </button>
              </div>
            </div>

            {/* Quick Preview Card */}
            <div className="bg-[var(--bg-primary)] rounded-3xl p-6 border border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-2">
              <div className="font-semibold text-[var(--text-primary)] text-sm">
                Upcoming Capabilities
              </div>
              <p>• Host listing and reservation management will unlock in Phase 4.</p>
              <p>• Saved wishlists and booking history will unlock in Phase 6.</p>
            </div>
          </div>
        </div>

        {/* Logout All Devices Confirmation Modal */}
        {showLogoutAllConfirm && (
          <AccessibleDialog
            ariaLabel="Log out from all devices"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClose={() => setShowLogoutAllConfirm(false)}
          >
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[var(--border)] relative">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] flex items-center justify-center mb-4">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-2">
                Log out everywhere?
              </h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
                This will revoke all active refresh tokens in your session family and invalidate all
                issued access tokens. You will be signed out across all browsers and devices.
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutAllConfirm(false)}
                  disabled={isLoggingOutAll}
                  className="flex-1 py-3 px-4 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogoutAll}
                  disabled={isLoggingOutAll}
                  className="flex-1 py-3 px-4 rounded-xl bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover-strong)] text-white text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {isLoggingOutAll ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Revoking...</span>
                    </>
                  ) : (
                    <span>Confirm Revoke</span>
                  )}
                </button>
              </div>
            </div>
          </AccessibleDialog>
        )}
      </div>
    </div>
  );
}
