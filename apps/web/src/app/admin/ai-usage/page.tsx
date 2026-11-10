'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import type { AdminAiUsageStats } from '@/types/admin';
import { Bot, Clock, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminAiUsagePage() {
  const [stats, setStats] = useState<AdminAiUsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getAiUsageStats();
      if (res.data) setStats(res.data);
      else setError(res.error ?? 'Failed to load AI usage statistics');
    } catch {
      setError('Network error while loading AI telemetry data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  if (isLoading && !stats) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-[var(--border)]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-white p-4"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)]">
            AI Usage &amp; Intelligence Analytics
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Request volume, token usage, success rate, and response times for the last 30 days.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchStats()}
          disabled={isLoading}
          className="self-start gap-2 rounded-xl border-[var(--border)] text-xs hover:bg-[var(--bg-secondary)]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total AI Requests"
              value={stats.summary.totalRequests.toLocaleString()}
              detail={`${stats.summary.successRatePercentage}% successful · ${stats.summary.failedRequests} failures`}
              icon={<Bot className="h-4 w-4" />}
              tone="purple"
            />
            <MetricCard
              title="Tokens Consumed"
              value={stats.summary.totalTokens.toLocaleString()}
              detail={`${stats.summary.totalInputTokens.toLocaleString()} input · ${stats.summary.totalOutputTokens.toLocaleString()} output`}
              icon={<Zap className="h-4 w-4" />}
              tone="blue"
            />
            <MetricCard
              title="Successful Requests"
              value={stats.summary.successfulRequests.toLocaleString()}
              detail="Completed within the selected period"
              icon={<Bot className="h-4 w-4" />}
              tone="green"
            />
            <MetricCard
              title="Average Latency"
              value={`${stats.summary.averageDurationMs.toLocaleString()} ms`}
              detail="Average provider request duration"
              icon={<Clock className="h-4 w-4" />}
              tone="amber"
            />
          </div>

          <section className="space-y-4 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xs">
            <h2 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Usage Breakdown by AI Feature
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Feature</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Requests</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                      Average Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {stats.requestsByFeature.map((feature) => (
                    <tr key={feature.feature} className="hover:bg-[var(--bg-primary)]">
                      <td className="px-4 py-3 font-mono font-bold text-[var(--text-primary)]">
                        {feature.feature}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                        {feature.count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {feature.averageDurationMs.toLocaleString()} ms
                      </td>
                    </tr>
                  ))}
                  {stats.requestsByFeature.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-6 text-center text-[var(--text-secondary)]"
                      >
                        No AI requests recorded in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xs">
            <h2 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Daily AI Usage Trends
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Requests</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Successes</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Failures</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Tokens</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                      Avg. Latency
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {stats.dailyTrends.map((day) => (
                    <tr key={day.date} className="hover:bg-[var(--bg-primary)]">
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {day.date}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                        {day.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-emerald-700">{day.success.toLocaleString()}</td>
                      <td className="px-4 py-3 text-rose-700">{day.failed.toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        {day.tokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {day.avgDurationMs.toLocaleString()} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: 'purple' | 'blue' | 'green' | 'amber';
}) {
  const toneClasses = {
    purple: 'bg-purple-50 text-purple-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          {title}
        </span>
        <div className={`rounded-xl p-2 ${toneClasses[tone]}`}>{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}
