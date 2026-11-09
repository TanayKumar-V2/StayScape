'use client';

import React, { useEffect, useState } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import type { AdminUserItem, AdminPaginationMeta } from '@/types/admin';
import {
  Search,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [meta, setMeta] = useState<AdminPaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action dialog states
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [actionType, setActionType] = useState<'SUSPEND' | 'ACTIVATE' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchUsers = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUsers({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
      });

      if (res.data) {
        setUsers(res.data.data);
        setMeta(res.data.meta);
      } else {
        setError(res.error ?? 'Failed to load users');
      }
    } catch {
      setError('Network error while loading user accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchUsers(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, roleFilter]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !actionType) return;

    if (actionType === 'SUSPEND' && !actionReason.trim()) {
      setActionError('A mandatory reason is required to suspend a user account.');
      return;
    }

    setIsSubmittingAction(true);
    setActionError(null);

    try {
      let res;
      if (actionType === 'SUSPEND') {
        res = await adminApi.suspendUser(selectedUser.id, actionReason.trim());
      } else {
        res = await adminApi.activateUser(selectedUser.id, actionReason.trim() || undefined);
      }

      if (res.data?.success) {
        // Reset dialog and reload list
        setActionType(null);
        setSelectedUser(null);
        setActionReason('');
        void fetchUsers(meta.page);
      } else {
        setActionError(res.error ?? 'Failed to complete user status update.');
      }
    } catch {
      setActionError('An unexpected network error occurred.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)]">
            User Management
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Search, inspect, and manage marketplace user accounts and operational security statuses.
          </p>
        </div>
        <div className="text-xs font-medium text-[var(--text-secondary)] bg-white px-3 py-1.5 rounded-xl border border-[var(--border)] shadow-xs self-start">
          Total Users: <strong className="text-[var(--text-primary)]">{meta.total}</strong>
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
            placeholder="Search by name, email..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'SUSPENDED')}
            className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | 'USER' | 'ADMIN')}
            className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            <option value="ALL">All Roles</option>
            <option value="USER">Guest / Host (USER)</option>
            <option value="ADMIN">Admin Only</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      ) : null}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">User</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Role</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Activity</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Registered</th>
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
              ) : users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--bg-primary)]/80 transition-colors">
                    {/* User info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--border)] text-[var(--text-primary)] flex items-center justify-center font-semibold text-xs shrink-0">
                          {u.firstName ? u.firstName[0] : 'U'}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="font-semibold text-sm text-[var(--text-primary)] hover:text-[var(--accent-primary)] hover:underline flex items-center gap-1.5"
                          >
                            <span>{u.name || 'Unnamed User'}</span>
                            {u.isHost ? (
                              <span className="text-[10px] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] px-1.5 py-0.5 rounded-full font-medium">
                                Host
                              </span>
                            ) : null}
                          </Link>
                          <p className="text-[11px] text-[var(--text-secondary)] truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      {u.role === 'ADMIN' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold text-[10px]">
                          <Shield className="w-3 h-3" />
                          ADMIN
                        </span>
                      ) : (
                        <span className="text-[var(--text-secondary)] font-medium">USER</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {u.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Suspended
                        </span>
                      )}
                    </td>

                    {/* Activity */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      <div className="space-y-0.5">
                        <p>{u.bookingsCount} booking(s)</p>
                        <p className="text-[11px]">{u.reviewsCount} review(s)</p>
                      </div>
                    </td>

                    {/* Registered */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
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
                          <Link href={`/admin/users/${u.id}`}>Details</Link>
                        </Button>

                        {u.status === 'ACTIVE' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(u);
                              setActionType('SUSPEND');
                              setActionReason('');
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
                              setSelectedUser(u);
                              setActionType('ACTIVATE');
                              setActionReason('');
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
                    No users found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
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
              onClick={() => fetchUsers(meta.page - 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNextPage || isLoading}
              onClick={() => fetchUsers(meta.page + 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Dialog for Suspend / Activate */}
      {actionType && selectedUser ? (
        <AccessibleDialog
          ariaLabel="Manage user account"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClose={() => {
            setActionType(null);
            setSelectedUser(null);
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-[var(--border)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold">
                {actionType === 'SUSPEND' ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
                <span>
                  {actionType === 'SUSPEND' ? 'Suspend User Account' : 'Reactivate User Account'}
                </span>
              </div>
              <button
                onClick={() => setActionType(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="space-y-4 pt-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {actionType === 'SUSPEND' ? (
                  <>
                    Are you sure you want to suspend{' '}
                    <strong className="text-[var(--text-primary)]">
                      {selectedUser.name || selectedUser.email}
                    </strong>
                    ? All active sessions will be terminated and they will be barred from creating
                    bookings or listings.
                  </>
                ) : (
                  <>
                    Are you sure you want to reactivate{' '}
                    <strong className="text-[var(--text-primary)]">
                      {selectedUser.name || selectedUser.email}
                    </strong>
                    ? They will regain full platform access immediately.
                  </>
                )}
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Administrative Reason{' '}
                  {actionType === 'SUSPEND' ? (
                    <span className="text-rose-600">*</span>
                  ) : (
                    '(Optional)'
                  )}
                </label>
                <textarea
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={
                    actionType === 'SUSPEND'
                      ? 'State the specific trust & safety reason or policy violation...'
                      : 'Note why this account is being reinstated...'
                  }
                  required={actionType === 'SUSPEND'}
                  className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                />
              </div>

              {actionError ? (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {actionError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActionType(null)}
                  disabled={isSubmittingAction}
                  className="rounded-xl border-[var(--border)]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingAction}
                  className={`rounded-xl text-white ${
                    actionType === 'SUSPEND'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isSubmittingAction
                    ? 'Processing...'
                    : actionType === 'SUSPEND'
                      ? 'Confirm Suspension'
                      : 'Confirm Activation'}
                </Button>
              </div>
            </form>
          </div>
        </AccessibleDialog>
      ) : null}
    </div>
  );
}
