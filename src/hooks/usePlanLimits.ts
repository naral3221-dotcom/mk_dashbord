'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UsageResponse } from '@/application/dto/BillingDTO';

export interface UsePlanLimitsReturn {
  usage: UsageResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePlanLimits(): UsePlanLimitsReturn {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const refetch = useCallback(() => {
    setFetchCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchUsage() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/billing/usage');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed: ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) {
          setUsage(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch usage');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchUsage();
    return () => {
      cancelled = true;
    };
  }, [fetchCount]);

  return { usage, loading, error, refetch };
}
