import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from './DashboardService';
import {
  GetDashboardOverviewUseCase,
  GetDashboardOverviewOutput,
} from '@/domain/usecases/GetDashboardOverviewUseCase';
import {
  GetCampaignPerformanceUseCase,
  GetCampaignPerformanceOutput,
} from '@/domain/usecases/GetCampaignPerformanceUseCase';
import { CampaignStatus } from '@/domain/entities/types';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockGetOverviewUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockGetCampaignPerformanceUseCase: { execute: ReturnType<typeof vi.fn> };

  const startDate = new Date('2026-01-01');
  const endDate = new Date('2026-01-31');
  const orgId = 'org-1';

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetOverviewUseCase = { execute: vi.fn() };
    mockGetCampaignPerformanceUseCase = { execute: vi.fn() };

    service = new DashboardService(
      mockGetOverviewUseCase as unknown as GetDashboardOverviewUseCase,
      mockGetCampaignPerformanceUseCase as unknown as GetCampaignPerformanceUseCase,
    );
  });

  describe('getOverview', () => {
    const overviewOutput: GetDashboardOverviewOutput = {
      kpis: {
        totalSpend: 5000,
        totalImpressions: 100000,
        totalClicks: 2500,
        totalConversions: 150,
        totalRevenue: 12000,
        ctr: 2.5,
        cpc: 2.0,
        cpm: 50.0,
        cvr: 6.0,
        cpa: 33.33,
        roas: 2.4,
        roi: 140.0,
        profit: 7000,
      },
      dailyTrend: [
        {
          date: '2026-01-01',
          spend: 200,
          impressions: 4000,
          clicks: 100,
          conversions: 6,
          revenue: 480,
        },
        {
          date: '2026-01-02',
          spend: 250,
          impressions: 5000,
          clicks: 125,
          conversions: 8,
          revenue: 600,
        },
      ],
      spendByCampaign: [
        { campaignId: 'camp-1', campaignName: 'Campaign A', spend: 3000 },
        { campaignId: 'camp-2', campaignName: 'Campaign B', spend: 2000 },
      ],
    };

    it('should call overview use case and return DTO', async () => {
      mockGetOverviewUseCase.execute.mockResolvedValue(overviewOutput);

      const result = await service.getOverview(orgId, startDate, endDate);

      expect(result).toEqual({
        kpis: overviewOutput.kpis,
        dailyTrend: overviewOutput.dailyTrend,
        spendByCampaign: overviewOutput.spendByCampaign,
      });
    });

    it('should pass correct parameters to overview use case', async () => {
      mockGetOverviewUseCase.execute.mockResolvedValue(overviewOutput);

      await service.getOverview(orgId, startDate, endDate);

      expect(mockGetOverviewUseCase.execute).toHaveBeenCalledWith({
        organizationId: orgId,
        startDate,
        endDate,
      });
      expect(mockGetOverviewUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from overview use case', async () => {
      mockGetOverviewUseCase.execute.mockRejectedValue(
        new Error('Organization ID is required'),
      );

      await expect(
        service.getOverview('', startDate, endDate),
      ).rejects.toThrow('Organization ID is required');
    });

    it('should return empty overview when use case returns empty data', async () => {
      const emptyOverview: GetDashboardOverviewOutput = {
        kpis: {
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalRevenue: 0,
          ctr: 0,
          cpc: 0,
          cpm: 0,
          cvr: 0,
          cpa: 0,
          roas: 0,
          roi: 0,
          profit: 0,
        },
        dailyTrend: [],
        spendByCampaign: [],
      };
      mockGetOverviewUseCase.execute.mockResolvedValue(emptyOverview);

      const result = await service.getOverview(orgId, startDate, endDate);

      expect(result.kpis.totalSpend).toBe(0);
      expect(result.kpis.totalImpressions).toBe(0);
      expect(result.kpis.totalClicks).toBe(0);
      expect(result.kpis.totalConversions).toBe(0);
      expect(result.kpis.totalRevenue).toBe(0);
      expect(result.dailyTrend).toEqual([]);
      expect(result.spendByCampaign).toEqual([]);
    });
  });

  describe('getCampaignPerformance', () => {
    const performanceOutput: GetCampaignPerformanceOutput = {
      campaigns: [
        {
          campaignId: 'camp-1',
          campaignName: 'Campaign A',
          status: CampaignStatus.ACTIVE,
          spend: 3000,
          impressions: 60000,
          clicks: 1500,
          conversions: 90,
          revenue: 7200,
          ctr: 2.5,
          cpc: 2.0,
          cpm: 50.0,
          cvr: 6.0,
          cpa: 33.33,
          roas: 2.4,
        },
        {
          campaignId: 'camp-2',
          campaignName: 'Campaign B',
          status: CampaignStatus.PAUSED,
          spend: 2000,
          impressions: 40000,
          clicks: 1000,
          conversions: 60,
          revenue: 4800,
          ctr: 2.5,
          cpc: 2.0,
          cpm: 50.0,
          cvr: 6.0,
          cpa: 33.33,
          roas: 2.4,
        },
      ],
      totalCount: 2,
    };

    it('should call campaign performance use case and return DTO', async () => {
      mockGetCampaignPerformanceUseCase.execute.mockResolvedValue(performanceOutput);

      const result = await service.getCampaignPerformance(orgId, startDate, endDate);

      expect(result).toEqual({
        campaigns: performanceOutput.campaigns,
        totalCount: performanceOutput.totalCount,
      });
    });

    it('should pass correct parameters to campaign performance use case', async () => {
      mockGetCampaignPerformanceUseCase.execute.mockResolvedValue(performanceOutput);

      await service.getCampaignPerformance(orgId, startDate, endDate);

      expect(mockGetCampaignPerformanceUseCase.execute).toHaveBeenCalledWith({
        organizationId: orgId,
        startDate,
        endDate,
      });
      expect(mockGetCampaignPerformanceUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from campaign performance use case', async () => {
      mockGetCampaignPerformanceUseCase.execute.mockRejectedValue(
        new Error('Start date must be before end date'),
      );

      await expect(
        service.getCampaignPerformance(orgId, endDate, startDate),
      ).rejects.toThrow('Start date must be before end date');
    });

    it('should return empty campaigns when use case returns no campaigns', async () => {
      const emptyPerformance: GetCampaignPerformanceOutput = {
        campaigns: [],
        totalCount: 0,
      };
      mockGetCampaignPerformanceUseCase.execute.mockResolvedValue(emptyPerformance);

      const result = await service.getCampaignPerformance(orgId, startDate, endDate);

      expect(result.campaigns).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });
});
