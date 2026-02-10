import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSubscription } from './useSubscription';
import { Plan, SubscriptionStatus } from '@/domain/entities/types';

const mockSubscriptionResponse = {
  subscription: {
    id: 'sub_123',
    plan: Plan.PRO,
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: '2024-01-01T00:00:00.000Z',
    currentPeriodEnd: '2024-02-01T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    canceledAt: null,
  },
  plan: Plan.PRO,
};

const mockFreeResponse = {
  subscription: null,
  plan: Plan.FREE,
};

describe('useSubscription', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return loading=true initially', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSubscriptionResponse),
    });

    const { result } = renderHook(() => useSubscription());

    expect(result.current.loading).toBe(true);
    expect(result.current.subscription).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return subscription data on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSubscriptionResponse),
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscription).toEqual(mockSubscriptionResponse);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/billing/subscription');
  });

  it('should return null subscription for free plan', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFreeResponse),
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscription).toEqual(mockFreeResponse);
    expect(result.current.subscription!.subscription).toBeNull();
    expect(result.current.subscription!.plan).toBe(Plan.FREE);
    expect(result.current.error).toBeNull();
  });

  it('should return error on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.subscription).toBeNull();
  });

  it('should return error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' }),
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Internal server error');
    expect(result.current.subscription).toBeNull();
  });

  it('should refetch when refetch is called', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFreeResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSubscriptionResponse),
      });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscription).toEqual(mockFreeResponse);
    expect(fetch).toHaveBeenCalledTimes(1);

    result.current.refetch();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscription).toEqual(mockSubscriptionResponse);
  });
});
