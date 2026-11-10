'use client';

import { LineChart } from '@/components/charts/line-chart';
import { Line } from '@/components/charts/line';
import { LineBackdrop } from '@/components/charts/line-backdrop';
import { Grid } from '@/components/charts/grid';
import { XAxis } from '@/components/charts/x-axis';
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip';
import { formatINR } from '@/lib/utils';
import type { AdminTimeseriesData } from '@/types/admin';

interface AdminTrendsChartProps {
  points: AdminTimeseriesData['points'];
  metric: 'bookings' | 'users' | 'revenue';
}

export function AdminTrendsChart({ points, metric }: AdminTrendsChartProps) {
  const data = points.map((point) => ({
    date: new Date(`${point.date.slice(0, 10)}T12:00:00`),
    value: metric === 'revenue' ? (point.value ?? 0) / 100 : point.count,
  }));

  return (
    <figure role="img" aria-label={`${metric} trend for the past 30 days`}>
      <LineChart
        data={data}
        aspectRatio=""
        style={{ height: 270, touchAction: 'pan-y' }}
        margin={{ top: 18, right: 24, bottom: 32, left: 24 }}
        className="w-full"
      >
        <Grid horizontal numTicksRows={4} stroke="var(--chart-grid)" strokeOpacity={0.75} />
        <LineBackdrop
          dataKey="value"
          stops={[
            { offset: 0, color: 'var(--accent-primary)', opacity: 0.2 },
            { offset: 0.6, color: 'var(--accent-primary)', opacity: 0.06 },
            { offset: 1, color: 'var(--accent-primary)', opacity: 0 },
          ]}
        />
        <Line
          dataKey="value"
          stroke="var(--accent-primary)"
          strokeWidth={3}
          showMarkers
          highlight={{ dimOpacity: 0.24, span: 2, strokeWidth: 3.5 }}
        />
        <XAxis numTicks={6} />
        <ChartTooltip
          indicatorColor="var(--accent-primary)"
          dotHaloOpacity={0.35}
          rows={(point) => {
            const value = Number(point.value ?? 0);
            return [
              {
                color: 'var(--accent-primary)',
                label: metric === 'revenue' ? 'Captured revenue' : metric,
                value: metric === 'revenue' ? formatINR(value) : value.toLocaleString('en-IN'),
              },
            ];
          }}
        />
      </LineChart>
      <figcaption className="sr-only">
        Daily {metric} values for the latest 30-day reporting period. Hover or drag over the chart
        to inspect individual values.
      </figcaption>
    </figure>
  );
}
