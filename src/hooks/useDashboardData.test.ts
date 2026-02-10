import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from './useDashboardData';

const mockOverviewResponse = {
  kpis: {
    totalSpend: 1000,
    totalImpressions: 50000,
    totalClicks: 2000,
    totalConversions: 100,
    totalRevenue: 5000,
    ctr: 4.0,
    cpc: 0.5,
    cpm: 20.0,
    cvr: 5.0,
    cpa: 10.0,
    roas: 5.0,
    roi: 400.0,
    profit: 4000,
  },
  dailyTrend: [],
  spendByCampaign: [],
};

const mockCampaignsResponse = {
  campaigns: [],
  totalCount: 0,
};

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch overview and campaigns data', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOverviewResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCampaignsResponse),
      });

    const { result } = renderHook(() => useDashboardData('startDate=2024-01-01&endDate=2024-01-31'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.overview).toEqual(mockOverviewResponse);
    expect(result.current.campaigns).toEqual(mockCampaignsResponse);
    expect(result.current.error).toBeNull();
  });

  it('should set loading to true initially', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useDashboardData('startDate=2024-01-01&endDate=2024-01-31'));

    expect(result.current.loading).toBe(true);
  });

  it('should handle overview API error', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCampaignsResponse),
      });

    const { result } = renderHook(() => useDashboardData('startDate=2024-01-01&endDate=2024-01-31'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Server error');
    expect(result.current.overview).toBeNull();
  });

  it('should handle campaigns API error', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOverviewResponse),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad request' }),
      });

    const { result } = renderHook(() => useDashboardData('startDate=2024-01-01&endDate=2024-01-31'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Bad request');
  });

  it('should handle network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDashboardData('startDate=2024-01-01&endDate=2024-01-31'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('should refetch when refetch is called', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockOverviewResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCampaignsResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockOverviewResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCampaignsResponse) });

    const { result } = renderHook(() => useDashboardData('startDate=2024-01-01&endDate=2024-01-31'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledTimes(2);

    result.current.refetch();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(4);
    });
  });

  it('should pass query params to fetch URLs', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockOverviewResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCampaignsResponse) });

    renderHook(() => useDashboardData('startDate=2024-01-01&endDate=2024-01-31'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    expect(fetch).toHaveBeenCalledWith('/api/dashboard/overview?startDate=2024-01-01&endDate=2024-01-31');
    expect(fetch).toHaveBeenCalledWith('/api/dashboard/campaigns?startDate=2024-01-01&endDate=2024-01-31');
  });

  it('should refetch when queryParams change', async () => {
    global.fetch = vi.fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(mockOverviewResponse) });

    const { rerender } = renderHook(
      ({ params }) => useDashboardData(params),
      { initialProps: { params: 'startDate=2024-01-01&endDate=2024-01-31' } },
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    rerender({ params: 'startDate=2024-02-01&endDate=2024-02-28' });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(4);
    });
  });
});
