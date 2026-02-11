'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SubscriptionResponse } from '@/application/dto/BillingDTO';

export interface UseSubscriptionReturn {
  subscription: SubscriptionResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

async function fetchSubscription(): Promise<SubscriptionResponse> {
  const res = await fetch('/api/billing/subscription');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useSubscription(): UseSubscriptionReturn {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['subscription'],
    queryFn: fetchSubscription,
  });

  return {
    subscription: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  };
}
