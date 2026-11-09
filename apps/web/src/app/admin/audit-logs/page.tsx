'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import type { AdminAuditLogItem, AdminPaginationMeta } from '@/types/admin';
import { Search, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [meta, setMeta] = useState<AdminPaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getAuditLogs({
        page,
        limit: 15,
        search: search.trim() || undefined,
        entityType: entityFilter !== 'ALL' ? entityFilter : undefined,
      });

      if (res.data) {
        setLogs(res.data.data);
        setMeta(res.data.meta);
      } else {
        setError(res.error ?? 'Failed to load audit logs');
      }
    } catch {
      setError('Network error while loading audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchLogs(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, entityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)]">Audit Logs</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Immutable platform record of administrative actions, safety interventions, and state
            diffs.
          </p>
        </div>
        <div className="text-xs font-medium text-[var(--text-secondary)] bg-white px-3 py-1.5 rounded-xl border border-[var(--border)] shadow-xs self-start">
          Total Logs: <strong className="text-[var(--text-primary)]">{meta.total}</strong>
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
            placeholder="Search action, reason, or admin email..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        >
          <option value="ALL">All Entity Types</option>
          <option value="User">User</option>
          <option value="HostProfile">HostProfile</option>
          <option value="Property">Property</option>
          <option value="Review">Review</option>
          <option value="ContentReport">ContentReport</option>
          <option value="PaymentRefund">PaymentRefund</option>
        </select>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      ) : null}

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="w-8 py-3 px-3"></th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Timestamp</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Admin</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Action</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Target</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-4 h-12 bg-gray-50/50" />
                  </tr>
                ))
              ) : logs.length > 0 ? (
                logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="hover:bg-[var(--bg-primary)]/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-3 text-[var(--text-secondary)]">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[var(--text-primary)]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-[var(--text-primary)] whitespace-nowrap">
                          {log.adminUserName}
                          <span className="text-[11px] text-[var(--text-secondary)] block">
                            {log.adminUserEmail}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--text-primary)] text-white">
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {log.entityType}
                          </span>
                          <span className="text-[10px] block text-[var(--text-secondary)]">
                            {log.entityId}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[var(--text-secondary)] max-w-sm truncate">
                          {log.reason ?? '—'}
                        </td>
                      </tr>

                      {/* Expandable JSON State Diff Row */}
                      {isExpanded ? (
                        <tr className="bg-[var(--bg-primary)] border-y border-[var(--border)]">
                          <td colSpan={6} className="p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              <div className="bg-white p-3 rounded-xl border border-[var(--border)] space-y-1">
                                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider font-sans">
                                  Before State
                                </span>
                                <pre className="text-[11px] text-[var(--text-primary)] overflow-x-auto p-2 bg-[var(--bg-primary)] rounded-lg">
                                  {log.beforeData
                                    ? JSON.stringify(log.beforeData, null, 2)
                                    : 'null'}
                                </pre>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-[var(--border)] space-y-1">
                                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider font-sans">
                                  After State
                                </span>
                                <pre className="text-[11px] text-[var(--text-primary)] overflow-x-auto p-2 bg-[var(--bg-primary)] rounded-lg">
                                  {log.afterData ? JSON.stringify(log.afterData, null, 2) : 'null'}
                                </pre>
                              </div>
                            </div>

                            {log.metadata ? (
                              <div className="bg-white p-3 rounded-xl border border-[var(--border)] text-xs font-mono">
                                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider font-sans block mb-1">
                                  Context Metadata
                                </span>
                                <pre className="text-[11px] text-[var(--text-secondary)] overflow-x-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[var(--text-secondary)]">
                    No audit records matching current filters.
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
              onClick={() => fetchLogs(meta.page - 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNextPage || isLoading}
              onClick={() => fetchLogs(meta.page + 1)}
              className="h-8 gap-1 rounded-lg border-[var(--border)]"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
