import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { usePlanLimits } from './usePlanLimits';
import { Plan } from '@/domain/entities/types';

const mockUsageResponse = {
  plan: Plan.PRO,
  features: [
    {
      feature: 'ad_accounts',
      allowed: true,
      currentUsage: 3,
      limit: 10,
    },
    {
      feature: 'users',
      allowed: true,
      currentUsage: 5,
      limit: 20,
    },
    {
      feature: 'exports',
      allowed: true,
    },
    {
      feature: 'auto_sync',
      allowed: true,
    },
  ],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('usePlanLimits', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return loading=true initially', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageResponse),
    });

    const { result } = renderHook(() => usePlanLimits(), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(true);
    expect(result.current.usage).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return usage data on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageResponse),
    });

    const { result } = renderHook(() => usePlanLimits(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.usage).toEqual(mockUsageResponse);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/billing/usage');
  });

  it('should return error on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePlanLimits(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.usage).toBeNull();
  });

  it('should provide a refetch function', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageResponse),
    });

    const { result } = renderHook(() => usePlanLimits(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
