import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetDashboardOverviewUseCase,
  GetDashboardOverviewInput,
  GetDashboardOverviewOutput,
} from './GetDashboardOverviewUseCase';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { ICampaignRepository } from '../repositories/ICampaignRepository';
import { ICampaignInsightRepository } from '../repositories/ICampaignInsightRepository';
import { AdAccount } from '../entities/AdAccount';
import { Campaign } from '../entities/Campaign';
import { CampaignInsight } from '../entities/CampaignInsight';
import { Platform, CampaignStatus } from '../entities/types';
import { ValidationError } from '../errors';

describe('GetDashboardOverviewUseCase', () => {
  let useCase: GetDashboardOverviewUseCase;
  let mockAdAccountRepo: IAdAccountRepository;
  let mockCampaignRepo: ICampaignRepository;
  let mockInsightRepo: ICampaignInsightRepository;

  const now = new Date();
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-07');

  const adAccount1 = AdAccount.reconstruct({
    id: 'ad-account-1',
    platform: Platform.META,
    accountId: '111111',
    accountName: 'Meta Ad Account 1',
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
    accountName: 'Google Ad Account 1',
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
    status: CampaignStatus.ACTIVE,
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

  // Insights for campaign 1 - two days
  const insight1a = CampaignInsight.reconstruct({
    id: 'insight-1a',
    date: new Date('2024-01-01'),
    spend: 100,
    impressions: 10000,
    clicks: 500,
    conversions: 25,
    revenue: 400,
    campaignId: 'campaign-1',
    createdAt: now,
    updatedAt: now,
  });

  const insight1b = CampaignInsight.reconstruct({
    id: 'insight-1b',
    date: new Date('2024-01-02'),
    spend: 150,
    impressions: 15000,
    clicks: 600,
    conversions: 30,
    revenue: 500,
    campaignId: 'campaign-1',
    createdAt: now,
    updatedAt: now,
  });

  // Insights for campaign 2 - overlapping day + new day
  const insight2a = CampaignInsight.reconstruct({
    id: 'insight-2a',
    date: new Date('2024-01-01'),
    spend: 200,
    impressions: 20000,
    clicks: 800,
    conversions: 40,
    revenue: 600,
    campaignId: 'campaign-2',
    createdAt: now,
    updatedAt: now,
  });

  const insight2b = CampaignInsight.reconstruct({
    id: 'insight-2b',
    date: new Date('2024-01-03'),
    spend: 250,
    impressions: 25000,
    clicks: 1000,
    conversions: 50,
    revenue: 800,
    campaignId: 'campaign-2',
    createdAt: now,
    updatedAt: now,
  });

  // Insights for campaign 3 (different ad account)
  const insight3a = CampaignInsight.reconstruct({
    id: 'insight-3a',
    date: new Date('2024-01-02'),
    spend: 300,
    impressions: 30000,
    clicks: 1200,
    conversions: 60,
    revenue: 1000,
    campaignId: 'campaign-3',
    createdAt: now,
    updatedAt: now,
  });

  const validInput: GetDashboardOverviewInput = {
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

    useCase = new GetDashboardOverviewUseCase(
      mockAdAccountRepo,
      mockCampaignRepo,
      mockInsightRepo,
    );
  });

  it('should aggregate KPIs from multiple campaigns across multiple ad accounts', async () => {
    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([
      adAccount1,
      adAccount2,
    ]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockImplementation(async (adAccountId) => {
      if (adAccountId === 'ad-account-1') return [campaign1, campaign2];
      if (adAccountId === 'ad-account-2') return [campaign3];
      return [];
    });
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockImplementation(
      async (campaignId) => {
        if (campaignId === 'campaign-1') return [insight1a, insight1b];
        if (campaignId === 'campaign-2') return [insight2a, insight2b];
        if (campaignId === 'campaign-3') return [insight3a];
        return [];
      },
    );

    const result = await useCase.execute(validInput);

    // Total: spend=100+150+200+250+300=1000, impressions=100000, clicks=4100, conversions=205, revenue=3300
    expect(result.kpis.totalSpend).toBe(1000);
    expect(result.kpis.totalImpressions).toBe(100000);
    expect(result.kpis.totalClicks).toBe(4100);
    expect(result.kpis.totalConversions).toBe(205);
    expect(result.kpis.totalRevenue).toBe(3300);
  });

  it('should compute derived KPIs correctly', async () => {
    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([adAccount1]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockResolvedValue([campaign1]);
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockResolvedValue([insight1a, insight1b]);

    const result = await useCase.execute(validInput);

    // spend=250, impressions=25000, clicks=1100, conversions=55, revenue=900
    // ctr = (1100/25000)*100 = 4.4
    expect(result.kpis.ctr).toBe(4.4);
    // cpc = 250/1100 = 0.227... -> 0.23
    expect(result.kpis.cpc).toBe(0.23);
    // cpm = (250/25000)*1000 = 10
    expect(result.kpis.cpm).toBe(10);
    // cvr = (55/1100)*100 = 5
    expect(result.kpis.cvr).toBe(5);
    // cpa = 250/55 = 4.545... -> 4.55
    expect(result.kpis.cpa).toBe(4.55);
    // roas = 900/250 = 3.6
    expect(result.kpis.roas).toBe(3.6);
    // roi = ((900-250)/250)*100 = 260
    expect(result.kpis.roi).toBe(260);
    // profit = 900-250 = 650
    expect(result.kpis.profit).toBe(650);
  });

  it('should group daily metrics by date and sort ascending', async () => {
    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([adAccount1]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockResolvedValue([campaign1, campaign2]);
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockImplementation(
      async (campaignId) => {
        if (campaignId === 'campaign-1') return [insight1a, insight1b];
        if (campaignId === 'campaign-2') return [insight2a, insight2b];
        return [];
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.dailyTrend).toHaveLength(3);
    // Sorted ascending by date
    expect(result.dailyTrend[0]!.date).toBe('2024-01-01');
    expect(result.dailyTrend[1]!.date).toBe('2024-01-02');
    expect(result.dailyTrend[2]!.date).toBe('2024-01-03');

    // 2024-01-01: insight1a (100,10000,500,25,400) + insight2a (200,20000,800,40,600)
    expect(result.dailyTrend[0]!.spend).toBe(300);
    expect(result.dailyTrend[0]!.impressions).toBe(30000);
    expect(result.dailyTrend[0]!.clicks).toBe(1300);
    expect(result.dailyTrend[0]!.conversions).toBe(65);
    expect(result.dailyTrend[0]!.revenue).toBe(1000);

    // 2024-01-02: insight1b only
    expect(result.dailyTrend[1]!.spend).toBe(150);
    expect(result.dailyTrend[1]!.impressions).toBe(15000);

    // 2024-01-03: insight2b only
    expect(result.dailyTrend[2]!.spend).toBe(250);
    expect(result.dailyTrend[2]!.impressions).toBe(25000);
  });

  it('should group spend by campaign and sort by spend descending', async () => {
    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([adAccount1]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockResolvedValue([campaign1, campaign2]);
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockImplementation(
      async (campaignId) => {
        if (campaignId === 'campaign-1') return [insight1a, insight1b]; // 100+150=250
        if (campaignId === 'campaign-2') return [insight2a, insight2b]; // 200+250=450
        return [];
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.spendByCampaign).toHaveLength(2);
    // Campaign Beta has more spend (450) so it should be first
    expect(result.spendByCampaign[0]!.campaignId).toBe('campaign-2');
    expect(result.spendByCampaign[0]!.campaignName).toBe('Campaign Beta');
    expect(result.spendByCampaign[0]!.spend).toBe(450);

    expect(result.spendByCampaign[1]!.campaignId).toBe('campaign-1');
    expect(result.spendByCampaign[1]!.campaignName).toBe('Campaign Alpha');
    expect(result.spendByCampaign[1]!.spend).toBe(250);
  });

  it('should return zero KPIs when no insights found', async () => {
    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([adAccount1]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockResolvedValue([campaign1]);
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockResolvedValue([]);

    const result = await useCase.execute(validInput);

    expect(result.kpis.totalSpend).toBe(0);
    expect(result.kpis.totalImpressions).toBe(0);
    expect(result.kpis.totalClicks).toBe(0);
    expect(result.kpis.totalConversions).toBe(0);
    expect(result.kpis.totalRevenue).toBe(0);
    expect(result.kpis.ctr).toBe(0);
    expect(result.kpis.cpc).toBe(0);
    expect(result.kpis.cpm).toBe(0);
    expect(result.kpis.cvr).toBe(0);
    expect(result.kpis.cpa).toBe(0);
    expect(result.kpis.roas).toBe(0);
    expect(result.kpis.roi).toBe(0);
    expect(result.kpis.profit).toBe(0);
    expect(result.dailyTrend).toEqual([]);
    expect(result.spendByCampaign).toHaveLength(1);
    expect(result.spendByCampaign[0]!.spend).toBe(0);
  });

  it('should return empty arrays when no active ad accounts', async () => {
    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([]);

    const result = await useCase.execute(validInput);

    expect(result.kpis.totalSpend).toBe(0);
    expect(result.kpis.totalImpressions).toBe(0);
    expect(result.kpis.totalClicks).toBe(0);
    expect(result.kpis.totalConversions).toBe(0);
    expect(result.kpis.totalRevenue).toBe(0);
    expect(result.kpis.ctr).toBe(0);
    expect(result.kpis.cpc).toBe(0);
    expect(result.kpis.cpm).toBe(0);
    expect(result.kpis.cvr).toBe(0);
    expect(result.kpis.cpa).toBe(0);
    expect(result.kpis.roas).toBe(0);
    expect(result.kpis.roi).toBe(0);
    expect(result.kpis.profit).toBe(0);
    expect(result.dailyTrend).toEqual([]);
    expect(result.spendByCampaign).toEqual([]);
    // Should not call campaign or insight repos
    expect(mockCampaignRepo.findByAdAccountId).not.toHaveBeenCalled();
    expect(mockInsightRepo.findByCampaignAndDateRange).not.toHaveBeenCalled();
  });

  it('should return empty arrays when no campaigns found', async () => {
    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([adAccount1]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockResolvedValue([]);

    const result = await useCase.execute(validInput);

    expect(result.kpis.totalSpend).toBe(0);
    expect(result.kpis.totalImpressions).toBe(0);
    expect(result.kpis.totalRevenue).toBe(0);
    expect(result.dailyTrend).toEqual([]);
    expect(result.spendByCampaign).toEqual([]);
    expect(mockInsightRepo.findByCampaignAndDateRange).not.toHaveBeenCalled();
  });

  it('should handle single campaign with single insight', async () => {
    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([adAccount1]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockResolvedValue([campaign1]);
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockResolvedValue([insight1a]);

    const result = await useCase.execute(validInput);

    // spend=100, impressions=10000, clicks=500, conversions=25, revenue=400
    expect(result.kpis.totalSpend).toBe(100);
    expect(result.kpis.totalImpressions).toBe(10000);
    expect(result.kpis.totalClicks).toBe(500);
    expect(result.kpis.totalConversions).toBe(25);
    expect(result.kpis.totalRevenue).toBe(400);

    expect(result.dailyTrend).toHaveLength(1);
    expect(result.dailyTrend[0]!.date).toBe('2024-01-01');
    expect(result.dailyTrend[0]!.spend).toBe(100);

    expect(result.spendByCampaign).toHaveLength(1);
    expect(result.spendByCampaign[0]!.campaignId).toBe('campaign-1');
    expect(result.spendByCampaign[0]!.campaignName).toBe('Campaign Alpha');
    expect(result.spendByCampaign[0]!.spend).toBe(100);
  });

  it('should handle insights from multiple ad accounts', async () => {
    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([
      adAccount1,
      adAccount2,
    ]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockImplementation(async (adAccountId) => {
      if (adAccountId === 'ad-account-1') return [campaign1];
      if (adAccountId === 'ad-account-2') return [campaign3];
      return [];
    });
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockImplementation(
      async (campaignId) => {
        if (campaignId === 'campaign-1') return [insight1a]; // spend=100
        if (campaignId === 'campaign-3') return [insight3a]; // spend=300
        return [];
      },
    );

    const result = await useCase.execute(validInput);

    // Total spend = 100 + 300 = 400
    expect(result.kpis.totalSpend).toBe(400);
    expect(result.kpis.totalImpressions).toBe(40000);
    expect(result.kpis.totalClicks).toBe(1700);
    expect(result.kpis.totalConversions).toBe(85);
    expect(result.kpis.totalRevenue).toBe(1400);

    // Two campaigns in spendByCampaign
    expect(result.spendByCampaign).toHaveLength(2);
    // campaign3 has more spend (300), should be first
    expect(result.spendByCampaign[0]!.campaignId).toBe('campaign-3');
    expect(result.spendByCampaign[0]!.spend).toBe(300);
    expect(result.spendByCampaign[1]!.campaignId).toBe('campaign-1');
    expect(result.spendByCampaign[1]!.spend).toBe(100);
  });

  it('should throw when organizationId is empty', async () => {
    const invalidInput: GetDashboardOverviewInput = {
      organizationId: '',
      startDate,
      endDate,
    };

    await expect(useCase.execute(invalidInput)).rejects.toThrow('Organization ID is required');
    await expect(useCase.execute(invalidInput)).rejects.toBeInstanceOf(ValidationError);
  });

  it('should throw when startDate >= endDate', async () => {
    const sameDate: GetDashboardOverviewInput = {
      organizationId: 'org-1',
      startDate: new Date('2024-01-07'),
      endDate: new Date('2024-01-07'),
    };

    await expect(useCase.execute(sameDate)).rejects.toThrow(
      'Start date must be before end date',
    );

    const reversedDate: GetDashboardOverviewInput = {
      organizationId: 'org-1',
      startDate: new Date('2024-01-10'),
      endDate: new Date('2024-01-07'),
    };

    await expect(useCase.execute(reversedDate)).rejects.toThrow(
      'Start date must be before end date',
    );
  });

  it('should handle zero impressions (ctr/cpm = 0, avoid division by zero)', async () => {
    const zeroImpressionsInsight = CampaignInsight.reconstruct({
      id: 'insight-zero-imp',
      date: new Date('2024-01-01'),
      spend: 50,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      campaignId: 'campaign-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([adAccount1]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockResolvedValue([campaign1]);
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockResolvedValue([
      zeroImpressionsInsight,
    ]);

    const result = await useCase.execute(validInput);

    expect(result.kpis.totalSpend).toBe(50);
    expect(result.kpis.totalImpressions).toBe(0);
    expect(result.kpis.ctr).toBe(0);
    expect(result.kpis.cpm).toBe(0);
    // clicks=0, so cpc and cvr should also be 0
    expect(result.kpis.cpc).toBe(0);
    expect(result.kpis.cvr).toBe(0);
  });

  it('should handle zero clicks (cpc/cvr = 0)', async () => {
    const zeroClicksInsight = CampaignInsight.reconstruct({
      id: 'insight-zero-clicks',
      date: new Date('2024-01-01'),
      spend: 100,
      impressions: 5000,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      campaignId: 'campaign-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([adAccount1]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockResolvedValue([campaign1]);
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockResolvedValue([zeroClicksInsight]);

    const result = await useCase.execute(validInput);

    expect(result.kpis.totalClicks).toBe(0);
    expect(result.kpis.cpc).toBe(0);
    expect(result.kpis.cvr).toBe(0);
    // ctr should still work: (0/5000)*100 = 0
    expect(result.kpis.ctr).toBe(0);
  });

  it('should filter by platform when platform is specified', async () => {
    // findByPlatform returns only META accounts
    vi.mocked(mockAdAccountRepo.findByPlatform).mockResolvedValue([adAccount1]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockResolvedValue([campaign1]);
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockResolvedValue([insight1a]);

    const result = await useCase.execute({
      ...validInput,
      platform: Platform.META,
    });

    expect(mockAdAccountRepo.findByPlatform).toHaveBeenCalledWith('org-1', Platform.META);
    expect(mockAdAccountRepo.findActiveByOrganizationId).not.toHaveBeenCalled();
    expect(result.kpis.totalSpend).toBe(100);
    expect(result.kpis.totalImpressions).toBe(10000);
  });

  it('should return all platforms when platform is not specified', async () => {
    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([
      adAccount1,
      adAccount2,
    ]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockImplementation(async (adAccountId) => {
      if (adAccountId === 'ad-account-1') return [campaign1];
      if (adAccountId === 'ad-account-2') return [campaign3];
      return [];
    });
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockImplementation(
      async (campaignId) => {
        if (campaignId === 'campaign-1') return [insight1a];
        if (campaignId === 'campaign-3') return [insight3a];
        return [];
      },
    );

    const result = await useCase.execute(validInput);

    expect(mockAdAccountRepo.findActiveByOrganizationId).toHaveBeenCalledWith('org-1');
    expect(mockAdAccountRepo.findByPlatform).not.toHaveBeenCalled();
    // Should include data from both META and GOOGLE accounts
    expect(result.kpis.totalSpend).toBe(400);
  });

  it('should return empty result for platform with no accounts', async () => {
    vi.mocked(mockAdAccountRepo.findByPlatform).mockResolvedValue([]);

    const result = await useCase.execute({
      ...validInput,
      platform: Platform.TIKTOK,
    });

    expect(mockAdAccountRepo.findByPlatform).toHaveBeenCalledWith('org-1', Platform.TIKTOK);
    expect(result.kpis.totalSpend).toBe(0);
    expect(result.kpis.totalImpressions).toBe(0);
    expect(result.dailyTrend).toEqual([]);
    expect(result.spendByCampaign).toEqual([]);
  });

  it('should filter out inactive accounts when filtering by platform', async () => {
    const inactiveMetaAccount = AdAccount.reconstruct({
      id: 'ad-account-inactive',
      platform: Platform.META,
      accountId: '333333',
      accountName: 'Inactive Meta Account',
      accessToken: 'token-3',
      refreshToken: null,
      tokenExpiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      isActive: false,
      organizationId: 'org-1',
      createdAt: now,
      updatedAt: now,
    });

    // findByPlatform returns both active and inactive
    vi.mocked(mockAdAccountRepo.findByPlatform).mockResolvedValue([
      adAccount1,
      inactiveMetaAccount,
    ]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockResolvedValue([campaign1]);
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockResolvedValue([insight1a]);

    const result = await useCase.execute({
      ...validInput,
      platform: Platform.META,
    });

    // Should only process active account (adAccount1), not the inactive one
    expect(mockCampaignRepo.findByAdAccountId).toHaveBeenCalledTimes(1);
    expect(mockCampaignRepo.findByAdAccountId).toHaveBeenCalledWith('ad-account-1');
    expect(result.kpis.totalSpend).toBe(100);
  });

  it('should handle zero spend (roas/roi = 0)', async () => {
    const zeroSpendInsight = CampaignInsight.reconstruct({
      id: 'insight-zero-spend',
      date: new Date('2024-01-01'),
      spend: 0,
      impressions: 10000,
      clicks: 500,
      conversions: 25,
      revenue: 300,
      campaignId: 'campaign-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockAdAccountRepo.findActiveByOrganizationId).mockResolvedValue([adAccount1]);
    vi.mocked(mockCampaignRepo.findByAdAccountId).mockResolvedValue([campaign1]);
    vi.mocked(mockInsightRepo.findByCampaignAndDateRange).mockResolvedValue([zeroSpendInsight]);

    const result = await useCase.execute(validInput);

    expect(result.kpis.totalSpend).toBe(0);
    expect(result.kpis.totalRevenue).toBe(300);
    expect(result.kpis.roas).toBe(0);
    expect(result.kpis.roi).toBe(0);
    // cpc = 0/500 = 0 (spend=0)
    expect(result.kpis.cpc).toBe(0);
    // cpa = 0/25 = 0
    expect(result.kpis.cpa).toBe(0);
    // profit = 300 - 0 = 300
    expect(result.kpis.profit).toBe(300);
  });
});
