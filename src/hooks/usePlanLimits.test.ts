import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
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

describe('usePlanLimits', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return loading=true initially', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageResponse),
    });

    const { result } = renderHook(() => usePlanLimits());

    expect(result.current.loading).toBe(true);
    expect(result.current.usage).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return usage data on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageResponse),
    });

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.usage).toEqual(mockUsageResponse);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/billing/usage');
  });

  it('should return error on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.usage).toBeNull();
  });

  it('should refetch when refetch is called', async () => {
    const updatedUsageResponse = {
      plan: Plan.PRO,
      features: [
        {
          feature: 'ad_accounts',
          allowed: true,
          currentUsage: 4,
          limit: 10,
        },
      ],
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUsageResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedUsageResponse),
      });

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.usage).toEqual(mockUsageResponse);
    expect(fetch).toHaveBeenCalledTimes(1);

    result.current.refetch();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.usage).toEqual(updatedUsageResponse);
  });
});
