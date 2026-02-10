'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SubscriptionResponse } from '@/application/dto/BillingDTO';

export interface UseSubscriptionReturn {
  subscription: SubscriptionResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const refetch = useCallback(() => {
    setFetchCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchSubscription() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/billing/subscription');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed: ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) {
          setSubscription(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSubscription();
    return () => {
      cancelled = true;
    };
  }, [fetchCount]);

  return { subscription, loading, error, refetch };
}
