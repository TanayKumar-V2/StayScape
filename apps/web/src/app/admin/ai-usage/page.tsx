'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import type { AdminAiUsageStats } from '@/types/admin';
import { Bot, Zap, DollarSign, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminAiUsagePage() {
  const [stats, setStats] = useState<AdminAiUsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getAiUsageStats();
      if (res.data) {
        setStats(res.data);
      } else {
        setError(res.error ?? 'Failed to load AI usage statistics');
      }
    } catch {
      setError('Network error while loading AI telemetry data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  if (isLoading && !stats) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-[var(--border)] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-white border border-[var(--border)] rounded-2xl p-4 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)]">
            AI Usage & Intelligence Analytics
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Telemetry, Groq token consumption, latency metrics, and estimated operational costs.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={isLoading}
          className="rounded-xl border-[var(--border)] hover:bg-[var(--bg-secondary)] gap-2 text-xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      ) : null}

      {/* KPI Cards */}
      {stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Total AI Requests
              </span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-3">
              {stats.totals.totalRequests.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Error Rate:{' '}
              <strong className="text-[var(--text-primary)]">{stats.totals.errorRate}%</strong> (
              {stats.totals.errorCount} failures)
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Tokens Consumed
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-3">
              {stats.totals.totalTokens.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {stats.totals.promptTokens.toLocaleString()} prompt •{' '}
              {stats.totals.completionTokens.toLocaleString()} output
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Estimated Cost
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-3">
              ${stats.totals.estimatedCostUsd.toFixed(4)}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Based on Groq Llama 3 API pricing
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Average Latency
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-3">
              {stats.totals.avgLatencyMs} ms
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              End-to-end response generation
            </p>
          </div>
        </div>
      ) : null}

      {/* Feature Breakdown Table */}
      {stats && stats.byFeature ? (
        <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-4">
          <h2 className="font-serif text-lg font-bold text-[var(--text-primary)]">
            Usage Breakdown by AI Feature
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)] border-b border-[var(--border)]">
                <tr>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Feature</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Total Calls</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">
                    Prompt Tokens
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">
                    Output Tokens
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Total Tokens</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Avg Latency</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Est. Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {Object.entries(stats.byFeature).map(([featureName, feat]) => (
                  <tr key={featureName} className="hover:bg-[var(--bg-primary)]">
                    <td className="py-3 px-4 font-mono font-bold text-[var(--text-primary)]">
                      {featureName}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                      {feat.count}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {feat.promptTokens.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {feat.completionTokens.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                      {feat.totalTokens.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {feat.avgLatencyMs} ms
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-800">
                      ${feat.estimatedCostUsd.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Recent AI Calls Telemetry Log */}
      {stats && stats.recentLogs ? (
        <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-4">
          <h2 className="font-serif text-lg font-bold text-[var(--text-primary)]">
            Recent AI Inference Telemetry
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)] border-b border-[var(--border)]">
                <tr>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Timestamp</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Feature</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Model</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">User</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Tokens</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Latency</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {stats.recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--bg-primary)]">
                    <td className="py-3 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[var(--text-primary)]">
                      {log.feature}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[var(--text-secondary)] font-mono">
                      {log.model}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)] truncate max-w-xs">
                      {log.userEmail ?? 'Anonymous'}
                    </td>
                    <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                      {log.totalTokens}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">{log.latencyMs} ms</td>
                    <td className="py-3 px-4">
                      {log.statusCode === 200 ? (
                        <span className="font-semibold text-[10px] uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          200 OK
                        </span>
                      ) : (
                        <span className="font-semibold text-[10px] uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                          Error {log.statusCode}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
