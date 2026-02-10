'use client';

import { useState } from 'react';
import { useDateRange } from '@/hooks/useDateRange';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DateRangeFilter } from './DateRangeFilter';
import { PlatformFilter } from './PlatformFilter';
import { KpiCard } from './KpiCard';
import { SpendTrendChart } from './SpendTrendChart';
import { CampaignComparisonChart } from './CampaignComparisonChart';
import { SpendDistributionChart } from './SpendDistributionChart';
import { CampaignPerformanceTable } from './CampaignPerformanceTable';
import { Platform } from '@/domain/entities/types';

export function DashboardContent() {
  const dateRange = useDateRange('30d');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);

  const baseParams = dateRange.toQueryParams();
  const queryParams = selectedPlatform
    ? `${baseParams}&platform=${selectedPlatform}`
    : baseParams;
  const { overview, campaigns, loading, error } = useDashboardData(queryParams);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <PlatformFilter
            selectedPlatform={selectedPlatform}
            onPlatformChange={setSelectedPlatform}
          />
          <DateRangeFilter
            preset={dateRange.preset}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onPresetChange={dateRange.setPreset}
            onCustomRangeChange={dateRange.setCustomRange}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800" data-testid="dashboard-error">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Spend"
          value={overview?.kpis.totalSpend ?? 0}
          format="currency"
        />
        <KpiCard
          label="Impressions"
          value={overview?.kpis.totalImpressions ?? 0}
          format="compact"
        />
        <KpiCard
          label="Clicks"
          value={overview?.kpis.totalClicks ?? 0}
          format="compact"
        />
        <KpiCard
          label="ROAS"
          value={overview?.kpis.roas ?? 0}
          format="ratio"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SpendTrendChart data={overview?.dailyTrend ?? []} />
        <CampaignComparisonChart
          data={
            campaigns?.campaigns.map((c) => ({
              campaignId: c.campaignId,
              campaignName: c.campaignName,
              spend: c.spend,
              conversions: c.conversions,
              roas: c.roas,
            })) ?? []
          }
        />
      </div>

      {/* Distribution Chart */}
      <SpendDistributionChart data={overview?.spendByCampaign ?? []} />

      {/* Campaign Table */}
      <CampaignPerformanceTable
        loading={loading}
        data={
          campaigns?.campaigns.map((c) => ({
            campaignId: c.campaignId,
            campaignName: c.campaignName,
            status: c.status,
            spend: c.spend,
            impressions: c.impressions,
            clicks: c.clicks,
            conversions: c.conversions,
            revenue: c.revenue,
            ctr: c.ctr,
            cpc: c.cpc,
            roas: c.roas,
          })) ?? []
        }
      />
    </div>
  );
}
