'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DashboardOverviewResponse, CampaignPerformanceResponse } from '@/application/dto/DashboardDTO';

export interface UseDashboardDataReturn {
  overview: DashboardOverviewResponse | null;
  campaigns: CampaignPerformanceResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardData(queryParams: string): UseDashboardDataReturn {
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const refetch = useCallback(() => {
    setFetchCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const [overviewRes, campaignsRes] = await Promise.all([
          fetch(`/api/dashboard/overview?${queryParams}`),
          fetch(`/api/dashboard/campaigns?${queryParams}`),
        ]);

        if (!overviewRes.ok) {
          const body = await overviewRes.json().catch(() => ({}));
          throw new Error(body.error || `Overview request failed: ${overviewRes.status}`);
        }

        if (!campaignsRes.ok) {
          const body = await campaignsRes.json().catch(() => ({}));
          throw new Error(body.error || `Campaigns request failed: ${campaignsRes.status}`);
        }

        const [overviewData, campaignsData] = await Promise.all([
          overviewRes.json(),
          campaignsRes.json(),
        ]);

        if (!cancelled) {
          setOverview(overviewData);
          setCampaigns(campaignsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [queryParams, fetchCount]);

  return { overview, campaigns, loading, error, refetch };
}
