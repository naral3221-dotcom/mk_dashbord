'use client';

import { useQuery } from '@tanstack/react-query';
import type { DashboardOverviewResponse, CampaignPerformanceResponse } from '@/application/dto/DashboardDTO';

export interface UseDashboardDataReturn {
  overview: DashboardOverviewResponse | null;
  campaigns: CampaignPerformanceResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

async function fetchOverview(queryParams: string): Promise<DashboardOverviewResponse> {
  const res = await fetch(`/api/dashboard/overview?${queryParams}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Overview request failed: ${res.status}`);
  }
  return res.json();
}

async function fetchCampaigns(queryParams: string): Promise<CampaignPerformanceResponse> {
  const res = await fetch(`/api/dashboard/campaigns?${queryParams}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Campaigns request failed: ${res.status}`);
  }
  return res.json();
}

export function useDashboardData(queryParams: string): UseDashboardDataReturn {
  const overviewQuery = useQuery({
    queryKey: ['dashboard', 'overview', queryParams],
    queryFn: () => fetchOverview(queryParams),
  });

  const campaignsQuery = useQuery({
    queryKey: ['dashboard', 'campaigns', queryParams],
    queryFn: () => fetchCampaigns(queryParams),
  });

  const loading = overviewQuery.isLoading || campaignsQuery.isLoading;
  const error = overviewQuery.error?.message ?? campaignsQuery.error?.message ?? null;

  return {
    overview: overviewQuery.data ?? null,
    campaigns: campaignsQuery.data ?? null,
    loading,
    error,
    refetch: () => {
      overviewQuery.refetch();
      campaignsQuery.refetch();
    },
  };
}
