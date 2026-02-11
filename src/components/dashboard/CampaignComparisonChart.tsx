'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface CampaignComparisonData {
  campaignId: string;
  campaignName: string;
  spend: number;
  conversions: number;
  roas: number;
}

type ComparisonMetric = 'spend' | 'conversions' | 'roas';

const metricConfig: Record<ComparisonMetric, { label: string; color: string }> = {
  spend: { label: '지출', color: '#8b5cf6' },
  conversions: { label: '전환수', color: '#f59e0b' },
  roas: { label: 'ROAS', color: '#10b981' },
};

export interface CampaignComparisonChartProps {
  data: CampaignComparisonData[];
}

export function CampaignComparisonChart({ data }: CampaignComparisonChartProps) {
  const [activeMetric, setActiveMetric] = useState<ComparisonMetric>('spend');

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>캠페인 비교</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground" data-testid="empty-comparison">
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
          <CardTitle>캠페인 비교</CardTitle>
          <div className="flex gap-1">
            {(Object.keys(metricConfig) as ComparisonMetric[]).map((key) => (
              <button
                key={key}
                type="button"
                data-testid={`comparison-toggle-${key}`}
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
        <div className="h-[300px]" data-testid="comparison-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="campaignName" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey={activeMetric}
                fill={metricConfig[activeMetric].color}
                name={metricConfig[activeMetric].label}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
