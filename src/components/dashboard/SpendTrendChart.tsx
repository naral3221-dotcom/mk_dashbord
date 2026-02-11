'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/formatters';

export interface DailyMetricsData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

type MetricKey = 'spend' | 'impressions' | 'clicks';

const metricConfig: Record<MetricKey, { label: string; color: string }> = {
  spend: { label: '지출', color: '#8b5cf6' },
  impressions: { label: '노출수', color: '#3b82f6' },
  clicks: { label: '클릭수', color: '#10b981' },
};

export interface SpendTrendChartProps {
  data: DailyMetricsData[];
}

export function SpendTrendChart({ data }: SpendTrendChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('spend');

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>일별 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground" data-testid="empty-trend">
            데이터 없음
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>일별 추이</CardTitle>
          <div className="flex gap-1">
            {(Object.keys(metricConfig) as MetricKey[]).map((key) => (
              <button
                key={key}
                type="button"
                data-testid={`metric-toggle-${key}`}
                onClick={() => setActiveMetric(key)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  activeMetric === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {metricConfig[key].label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]" data-testid="trend-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip labelFormatter={(label) => formatDate(String(label))} />
              <Legend />
              <Line
                type="monotone"
                dataKey={activeMetric}
                stroke={metricConfig[activeMetric].color}
                name={metricConfig[activeMetric].label}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
