'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UsageResponse } from '@/application/dto/BillingDTO';

export interface UsePlanLimitsReturn {
  usage: UsageResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

async function fetchUsage(): Promise<UsageResponse> {
  const res = await fetch('/api/billing/usage');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function usePlanLimits(): UsePlanLimitsReturn {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['planLimits'],
    queryFn: fetchUsage,
  });

  return {
    usage: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['planLimits'] });
    },
  };
}
