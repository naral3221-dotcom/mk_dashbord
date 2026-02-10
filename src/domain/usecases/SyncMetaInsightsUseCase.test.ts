import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SyncMetaInsightsUseCase,
  SyncMetaInsightsInput,
  SyncMetaInsightsOutput,
} from './SyncMetaInsightsUseCase';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { ICampaignRepository } from '../repositories/ICampaignRepository';
import { ICampaignInsightRepository } from '../repositories/ICampaignInsightRepository';
import { IMetaApiClient, MetaInsightData } from '../services/IMetaApiClient';
import { ITokenEncryption } from '../services/ITokenEncryption';
import { ICacheService } from '../services/ICacheService';
import { AdAccount } from '../entities/AdAccount';
import { Campaign } from '../entities/Campaign';
import { CampaignInsight } from '../entities/CampaignInsight';
import { Platform, CampaignStatus } from '../entities/types';

describe('SyncMetaInsightsUseCase', () => {
  let useCase: SyncMetaInsightsUseCase;
  let mockCampaignRepo: ICampaignRepository;
  let mockAdAccountRepo: IAdAccountRepository;
  let mockInsightRepo: ICampaignInsightRepository;
  let mockMetaApiClient: IMetaApiClient;
  let mockTokenEncryption: ITokenEncryption;
  let mockCacheService: ICacheService;

  const now = new Date();
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-07');

  const campaign = Campaign.reconstruct({
    id: 'campaign-1',
    externalId: 'meta-ext-campaign-1',
    name: 'Test Campaign',
    status: CampaignStatus.ACTIVE,
    adAccountId: 'ad-account-1',
    createdAt: now,
    updatedAt: now,
  });

  const adAccount = AdAccount.reconstruct({
    id: 'ad-account-1',
    platform: Platform.META,
    accountId: '123456789',
    accountName: 'Test Ad Account',
    accessToken: 'encrypted-token-xyz',
    refreshToken: null,
    tokenExpiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
    isActive: true,
    organizationId: 'org-1',
    createdAt: now,
    updatedAt: now,
  });

  const noTokenAdAccount = AdAccount.reconstruct({
    id: 'ad-account-1',
    platform: Platform.META,
    accountId: '123456789',
    accountName: 'Test Ad Account',
    accessToken: null,
    refreshToken: null,
    tokenExpiresAt: null,
    isActive: true,
    organizationId: 'org-1',
    createdAt: now,
    updatedAt: now,
  });

  const metaInsights: MetaInsightData[] = [
    {
      dateStart: '2024-01-01',
      dateStop: '2024-01-01',
      spend: '150.50',
      impressions: '10000',
      clicks: '500',
      conversions: '25',
      revenue: '750.00',
    },
    {
      dateStart: '2024-01-02',
      dateStop: '2024-01-02',
      spend: '200.75',
      impressions: '15000',
      clicks: '800',
      conversions: '40',
      revenue: '1200.00',
    },
  ];

  const validInput: SyncMetaInsightsInput = {
    campaignId: 'campaign-1',
    startDate,
    endDate,
  };

  beforeEach(() => {
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

    mockMetaApiClient = {
      getAdAccounts: vi.fn(),
      getCampaigns: vi.fn(),
      getInsights: vi.fn(),
      exchangeToken: vi.fn(),
      validateToken: vi.fn(),
    };

    mockTokenEncryption = {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    };

    mockCacheService = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };

    // Default happy path mocks
    vi.mocked(mockCampaignRepo.findById).mockResolvedValue(campaign);
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(adAccount);
    vi.mocked(mockCacheService.get).mockResolvedValue(null);
    vi.mocked(mockCacheService.set).mockResolvedValue(undefined);
    vi.mocked(mockTokenEncryption.decrypt).mockResolvedValue('decrypted-token-xyz');
    vi.mocked(mockMetaApiClient.getInsights).mockResolvedValue(metaInsights);
    vi.mocked(mockInsightRepo.findByCampaignAndDate).mockResolvedValue(null);
    vi.mocked(mockInsightRepo.saveMany).mockImplementation(async (insights) => insights);

    useCase = new SyncMetaInsightsUseCase(
      mockCampaignRepo,
      mockAdAccountRepo,
      mockInsightRepo,
      mockMetaApiClient,
      mockTokenEncryption,
      mockCacheService,
    );
  });

  it('should sync new insights from META (created)', async () => {
    const result = await useCase.execute(validInput);

    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.synced).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should update existing insights', async () => {
    const existingInsight = CampaignInsight.reconstruct({
      id: 'insight-existing-1',
      date: new Date('2024-01-01'),
      spend: 100.0,
      impressions: 8000,
      clicks: 400,
      conversions: 20,
      revenue: 600.0,
      campaignId: 'campaign-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockInsightRepo.findByCampaignAndDate).mockImplementation(
      async (_campaignId, date) => {
        if (date.toISOString().startsWith('2024-01-01')) return existingInsight;
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.updated).toBe(1);
    expect(result.created).toBe(1);
    expect(result.synced).toBe(2);
  });

  it('should create and update in same sync', async () => {
    const existingInsight = CampaignInsight.reconstruct({
      id: 'insight-existing-1',
      date: new Date('2024-01-01'),
      spend: 100.0,
      impressions: 8000,
      clicks: 400,
      conversions: 20,
      revenue: 600.0,
      campaignId: 'campaign-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockInsightRepo.findByCampaignAndDate).mockImplementation(
      async (_campaignId, date) => {
        if (date.toISOString().startsWith('2024-01-01')) return existingInsight;
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.synced).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should throw when campaign not found', async () => {
    vi.mocked(mockCampaignRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow('Campaign not found');
  });

  it('should throw when ad account not found', async () => {
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow('Ad account not found');
  });

  it('should throw when ad account has no access token', async () => {
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(noTokenAdAccount);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'Ad account has no access token',
    );
  });

  it('should decrypt token before calling META API', async () => {
    await useCase.execute(validInput);

    expect(mockTokenEncryption.decrypt).toHaveBeenCalledWith('encrypted-token-xyz');
    expect(mockTokenEncryption.decrypt).toHaveBeenCalledTimes(1);

    // Verify getInsights was called with the decrypted token
    expect(mockMetaApiClient.getInsights).toHaveBeenCalledWith(
      'decrypted-token-xyz',
      expect.any(String),
      expect.any(Date),
      expect.any(Date),
    );
  });

  it('should return cached result if available', async () => {
    const cachedResult: SyncMetaInsightsOutput = {
      synced: 5,
      created: 3,
      updated: 2,
      dateRange: { start: startDate, end: endDate },
      errors: [],
    };

    vi.mocked(mockCacheService.get).mockResolvedValue(cachedResult);

    const result = await useCase.execute(validInput);

    expect(result).toEqual(cachedResult);
    // Should not have called any downstream services
    expect(mockTokenEncryption.decrypt).not.toHaveBeenCalled();
    expect(mockMetaApiClient.getInsights).not.toHaveBeenCalled();
    expect(mockInsightRepo.saveMany).not.toHaveBeenCalled();
  });

  it('should cache results after successful sync', async () => {
    await useCase.execute(validInput);

    expect(mockCacheService.set).toHaveBeenCalledTimes(1);
    const [cacheKey, cachedValue, ttl] = vi.mocked(mockCacheService.set).mock.calls[0]!;
    expect(cacheKey).toContain('insights:meta-ext-campaign-1:');
    expect(cachedValue).toMatchObject({
      synced: 2,
      created: 2,
      updated: 0,
    });
    expect(ttl).toBe(86400);
  });

  it('should use 24h TTL for cache', async () => {
    await useCase.execute(validInput);

    const ttl = vi.mocked(mockCacheService.set).mock.calls[0]![2];
    expect(ttl).toBe(86400); // 24 hours in seconds
  });

  it('should pass correct date range to META API', async () => {
    await useCase.execute(validInput);

    expect(mockMetaApiClient.getInsights).toHaveBeenCalledWith(
      'decrypted-token-xyz',
      'meta-ext-campaign-1',
      startDate,
      endDate,
    );
  });

  it('should parse META response data correctly (string to number conversion)', async () => {
    const singleInsight: MetaInsightData[] = [
      {
        dateStart: '2024-01-01',
        dateStop: '2024-01-01',
        spend: '150.50',
        impressions: '10000',
        clicks: '500',
        conversions: '25',
        revenue: '750.00',
      },
    ];

    vi.mocked(mockMetaApiClient.getInsights).mockResolvedValue(singleInsight);

    await useCase.execute(validInput);

    const savedInsights = vi.mocked(mockInsightRepo.saveMany).mock.calls[0]![0];
    expect(savedInsights).toHaveLength(1);
    const insight = savedInsights[0]!;
    expect(insight.spend).toBe(150.50);
    expect(insight.impressions).toBe(10000);
    expect(insight.clicks).toBe(500);
    expect(insight.conversions).toBe(25);
    expect(insight.revenue).toBe(750.00);
    expect(insight.campaignId).toBe('campaign-1');
  });

  it('should batch save insights with saveMany', async () => {
    await useCase.execute(validInput);

    expect(mockInsightRepo.saveMany).toHaveBeenCalledTimes(1);
    const savedInsights = vi.mocked(mockInsightRepo.saveMany).mock.calls[0]![0];
    expect(savedInsights).toHaveLength(2);
  });

  it('should collect errors for individual insight failures without stopping', async () => {
    // Make findByCampaignAndDate throw on the first date but succeed on the second
    vi.mocked(mockInsightRepo.findByCampaignAndDate).mockImplementation(
      async (_campaignId, date) => {
        if (date.toISOString().startsWith('2024-01-01')) {
          throw new Error('Database timeout');
        }
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to sync insight for 2024-01-01');
    expect(result.errors[0]).toContain('Database timeout');
    // Second insight should still be created
    expect(result.created).toBe(1);
    expect(result.synced).toBe(1);
  });

  it('should return correct output with counts and date range', async () => {
    const result = await useCase.execute(validInput);

    expect(result.synced).toBe(2);
    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.dateRange).toEqual({ start: startDate, end: endDate });
    expect(result.errors).toEqual([]);
  });

  it('should not call saveMany when no insights returned from META', async () => {
    vi.mocked(mockMetaApiClient.getInsights).mockResolvedValue([]);

    const result = await useCase.execute(validInput);

    expect(result.synced).toBe(0);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(mockInsightRepo.saveMany).not.toHaveBeenCalled();
  });
});
