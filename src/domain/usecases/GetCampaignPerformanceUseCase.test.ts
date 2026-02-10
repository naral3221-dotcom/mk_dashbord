import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetCampaignPerformanceUseCase,
  GetCampaignPerformanceInput,
  GetCampaignPerformanceOutput,
  CampaignPerformanceItem,
} from './GetCampaignPerformanceUseCase';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { ICampaignRepository } from '../repositories/ICampaignRepository';
import { ICampaignInsightRepository } from '../repositories/ICampaignInsightRepository';
import { AdAccount } from '../entities/AdAccount';
import { Campaign } from '../entities/Campaign';
import { CampaignInsight } from '../entities/CampaignInsight';
import { Platform, CampaignStatus } from '../entities/types';

describe('GetCampaignPerformanceUseCase', () => {
  let useCase: GetCampaignPerformanceUseCase;
  let mockAdAccountRepo: IAdAccountRepository;
  let mockCampaignRepo: ICampaignRepository;
  let mockInsightRepo: ICampaignInsightRepository;

  const now = new Date();
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-31');

  const adAccount1 = AdAccount.reconstruct({
    id: 'ad-account-1',
    platform: Platform.META,
    accountId: '111111',
    accountName: 'Meta Account 1',
    accessToken: 'token-1',
    refreshToken: null,
    tokenExpiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
    isActive: true,
    organizationId: 'org-1',
    createdAt: now,
    updatedAt: now,
  });

  const adAccount2 = AdAccount.reconstruct({
    id: 'ad-account-2',
    platform: Platform.GOOGLE,
    accountId: '222222',
    accountName: 'Google Account 1',
    accessToken: 'token-2',
    refreshToken: null,
    tokenExpiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
    isActive: true,
    organizationId: 'org-1',
    createdAt: now,
    updatedAt: now,
  });

  const campaign1 = Campaign.reconstruct({
    id: 'campaign-1',
    externalId: 'ext-campaign-1',
    name: 'Campaign Alpha',
    status: CampaignStatus.ACTIVE,
    adAccountId: 'ad-account-1',
    createdAt: now,
    updatedAt: now,
  });

  const campaign2 = Campaign.reconstruct({
    id: 'campaign-2',
    externalId: 'ext-campaign-2',
    name: 'Campaign Beta',
    status: CampaignStatus.PAUSED,
    adAccountId: 'ad-account-1',
    createdAt: now,
    updatedAt: now,
  });

  const campaign3 = Campaign.reconstruct({
    id: 'campaign-3',
    externalId: 'ext-campaign-3',
    name: 'Campaign Gamma',
    status: CampaignStatus.ACTIVE,
    adAccountId: 'ad-account-2',
    createdAt: now,
    updatedAt: now,
  });

  // Insights for campaign1: total spend=500, impressions=20000, clicks=1000, conversions=50, revenue=2000
  const insightsForCampaign1 = [
    CampaignInsight.reconstruct({
      id: 'insight-1a',
      date: new Date('2024-01-01'),
      spend: 200,
      impressions: 8000,
      clicks: 400,
      conversions: 20,
      revenue: 800,
      campaignId: 'campaign-1',
      createdAt: now,
      updatedAt: now,
    }),
    CampaignInsight.reconstruct({
      id: 'insight-1b',
      date: new Date('2024-01-02'),
      spend: 300,
      impressions: 12000,
      clicks: 600,
      conversions: 30,
      revenue: 1200,
      campaignId: 'campaign-1',
      createdAt: now,
      updatedAt: now,
    }),
  ];

  // Insights for campaign2: total spend=800, impressions=30000, clicks=1500, conversions=60, revenue=3000
  const insightsForCampaign2 = [
    CampaignInsight.reconstruct({
      id: 'insight-2a',
      date: new Date('2024-01-01'),
      spend: 350,
      impressions: 15000,
      clicks: 750,
      conversions: 30,
      revenue: 1400,
      campaignId: 'campaign-2',
      createdAt: now,
      updatedAt: now,
    }),
    CampaignInsight.reconstruct({
      id: 'insight-2b',
      date: new Date('2024-01-02'),
      spend: 450,
      impressions: 15000,
      clicks: 750,
      conversions: 30,
      revenue: 1600,
      campaignId: 'campaign-2',
      createdAt: now,
      updatedAt: now,
    }),
  ];

  const validInput: GetCampaignPerformanceInput = {
    organizationId: 'org-1',
    startDate,
    endDate,
  };

  beforeEach(() => {
    mockAdAccountRepo = {
      findById: vi.fn(),
      findByOrganizationId: vi.fn(),
      findByPlatform: vi.fn(),
      findByPlatformAndAccountId: vi.fn(),
      findActiveByOrganizationId: vi.fn(),
      findWithExpiredTokens: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      countByOrganizationId: vi.fn(),
    };

    mockCampaignRepo = {
      findById: vi.fn(),
      findByAdAccountId: vi.fn(),
      findByExternalId: vi.fn(),
      findByStatus: vi.fn(),
      findActiveCampaigns: vi.fn(),
      save: vi.fn(),
      saveMany: vi.fn(),
      delete: vi.fn(),
      countByStatus: vi.fn(),
    };

    mockInsightRepo = {
      findById: vi.fn(),
      findByCampaignId: vi.fn(),
      findByCampaignAndDateRange: vi.fn(),
      findByCampaignAndDate: vi.fn(),
      save: vi.fn(),
      saveMany: vi.fn(),
      delete: vi.fn(),
      deleteOlderThan: vi.fn(),
    };

    // Default happy path: one ad account, two campaigns, insights for both
    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([adAccount1]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockResolvedValue([campaign1, campaign2]);
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockImplementation(
      async (campaignId) => {
        if (campaignId === 'campaign-1') return insightsForCampaign1;
        if (campaignId === 'campaign-2') return insightsForCampaign2;
        return [];
      },
    );

    useCase = new GetCampaignPerformanceUseCase(
      mockAdAccountRepo,
      mockCampaignRepo,
      mockInsightRepo,
    );
  });

  it('should aggregate performance metrics for each campaign', async () => {
    const result = await useCase.execute(validInput);

    // campaign1: spend=200+300=500, impressions=8000+12000=20000, clicks=400+600=1000, conversions=20+30=50, revenue=800+1200=2000
    const c1 = result.campaigns.find((c) => c.campaignId === 'campaign-1')!;
    expect(c1).toBeDefined();
    expect(c1.spend).toBe(500);
    expect(c1.impressions).toBe(20000);
    expect(c1.clicks).toBe(1000);
    expect(c1.conversions).toBe(50);
    expect(c1.revenue).toBe(2000);

    // campaign2: spend=350+450=800, impressions=15000+15000=30000, clicks=750+750=1500, conversions=30+30=60, revenue=1400+1600=3000
    const c2 = result.campaigns.find((c) => c.campaignId === 'campaign-2')!;
    expect(c2).toBeDefined();
    expect(c2.spend).toBe(800);
    expect(c2.impressions).toBe(30000);
    expect(c2.clicks).toBe(1500);
    expect(c2.conversions).toBe(60);
    expect(c2.revenue).toBe(3000);
  });

  it('should compute derived KPIs correctly for each campaign', async () => {
    const result = await useCase.execute(validInput);

    // campaign1: spend=500, impressions=20000, clicks=1000, conversions=50, revenue=2000
    // ctr = (1000/20000)*100 = 5
    // cpc = 500/1000 = 0.5
    // cpm = (500/20000)*1000 = 25
    // cvr = (50/1000)*100 = 5
    // cpa = 500/50 = 10
    // roas = 2000/500 = 4
    const c1 = result.campaigns.find((c) => c.campaignId === 'campaign-1')!;
    expect(c1.ctr).toBe(5);
    expect(c1.cpc).toBe(0.5);
    expect(c1.cpm).toBe(25);
    expect(c1.cvr).toBe(5);
    expect(c1.cpa).toBe(10);
    expect(c1.roas).toBe(4);

    // campaign2: spend=800, impressions=30000, clicks=1500, conversions=60, revenue=3000
    // ctr = (1500/30000)*100 = 5
    // cpc = 800/1500 = 0.53
    // cpm = (800/30000)*1000 = 26.67
    // cvr = (60/1500)*100 = 4
    // cpa = 800/60 = 13.33
    // roas = 3000/800 = 3.75
    const c2 = result.campaigns.find((c) => c.campaignId === 'campaign-2')!;
    expect(c2.ctr).toBe(5);
    expect(c2.cpc).toBe(0.53);
    expect(c2.cpm).toBe(26.67);
    expect(c2.cvr).toBe(4);
    expect(c2.cpa).toBe(13.33);
    expect(c2.roas).toBe(3.75);
  });

  it('should sort campaigns by spend descending', async () => {
    const result = await useCase.execute(validInput);

    // campaign2 spend=800 > campaign1 spend=500
    expect(result.campaigns).toHaveLength(2);
    expect(result.campaigns[0]!.campaignId).toBe('campaign-2');
    expect(result.campaigns[0]!.spend).toBe(800);
    expect(result.campaigns[1]!.campaignId).toBe('campaign-1');
    expect(result.campaigns[1]!.spend).toBe(500);
  });

  it('should return totalCount matching campaigns array length', async () => {
    const result = await useCase.execute(validInput);

    expect(result.totalCount).toBe(result.campaigns.length);
    expect(result.totalCount).toBe(2);
  });

  it('should return empty campaigns when no ad accounts', async () => {
    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([]);

    const result = await useCase.execute(validInput);

    expect(result.campaigns).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('should return empty campaigns when no campaigns found', async () => {
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockResolvedValue([]);

    const result = await useCase.execute(validInput);

    expect(result.campaigns).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('should return empty campaigns when no insights in date range', async () => {
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockResolvedValue([]);

    const result = await useCase.execute(validInput);

    // Campaigns with zero insights should not appear in results
    expect(result.campaigns).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('should handle campaigns from multiple ad accounts', async () => {
    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([
      adAccount1,
      adAccount2,
    ]);

    vi.mocked(mockCampaignRepo.findByAdAccountId).mockImplementation(
      async (adAccountId) => {
        if (adAccountId === 'ad-account-1') return [campaign1];
        if (adAccountId === 'ad-account-2') return [campaign3];
        return [];
      },
    );

    const insightsForCampaign3 = [
      CampaignInsight.reconstruct({
        id: 'insight-3a',
        date: new Date('2024-01-01'),
        spend: 1000,
        impressions: 50000,
        clicks: 2500,
        conversions: 100,
        revenue: 5000,
        campaignId: 'campaign-3',
        createdAt: now,
        updatedAt: now,
      }),
    ];

    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockImplementation(
      async (campaignId) => {
        if (campaignId === 'campaign-1') return insightsForCampaign1;
        if (campaignId === 'campaign-3') return insightsForCampaign3;
        return [];
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.campaigns).toHaveLength(2);
    expect(result.totalCount).toBe(2);

    // campaign3 spend=1000 > campaign1 spend=500 (sorted by spend desc)
    expect(result.campaigns[0]!.campaignId).toBe('campaign-3');
    expect(result.campaigns[0]!.campaignName).toBe('Campaign Gamma');
    expect(result.campaigns[0]!.spend).toBe(1000);

    expect(result.campaigns[1]!.campaignId).toBe('campaign-1');
    expect(result.campaigns[1]!.campaignName).toBe('Campaign Alpha');
    expect(result.campaigns[1]!.spend).toBe(500);
  });

  it('should throw when organizationId is empty', async () => {
    const invalidInput: GetCampaignPerformanceInput = {
      organizationId: '',
      startDate,
      endDate,
    };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'Organization ID is required',
    );
  });

  it('should throw when startDate >= endDate', async () => {
    const invalidInput: GetCampaignPerformanceInput = {
      organizationId: 'org-1',
      startDate: new Date('2024-01-31'),
      endDate: new Date('2024-01-01'),
    };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'Start date must be before end date',
    );

    const sameDate = new Date('2024-01-15');
    const invalidInput2: GetCampaignPerformanceInput = {
      organizationId: 'org-1',
      startDate: sameDate,
      endDate: sameDate,
    };

    await expect(useCase.execute(invalidInput2)).rejects.toThrow(
      'Start date must be before end date',
    );
  });
});
