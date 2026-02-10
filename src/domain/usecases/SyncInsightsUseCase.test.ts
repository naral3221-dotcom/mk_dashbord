import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SyncInsightsUseCase,
  SyncInsightsInput,
  SyncInsightsOutput,
} from './SyncInsightsUseCase';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { ICampaignRepository } from '../repositories/ICampaignRepository';
import { ICampaignInsightRepository } from '../repositories/ICampaignInsightRepository';
import { IPlatformAdapterRegistry } from '../services/IPlatformAdapterRegistry';
import { IAdPlatformClient, NormalizedInsightData } from '../services/IAdPlatformClient';
import { ITokenEncryption } from '../services/ITokenEncryption';
import { ICacheService } from '../services/ICacheService';
import { AdAccount } from '../entities/AdAccount';
import { Campaign } from '../entities/Campaign';
import { CampaignInsight } from '../entities/CampaignInsight';
import { Platform, CampaignStatus } from '../entities/types';

describe('SyncInsightsUseCase', () => {
  let useCase: SyncInsightsUseCase;
  let mockCampaignRepo: ICampaignRepository;
  let mockAdAccountRepo: IAdAccountRepository;
  let mockInsightRepo: ICampaignInsightRepository;
  let mockAdapterRegistry: IPlatformAdapterRegistry;
  let mockAdapter: IAdPlatformClient;
  let mockTokenEncryption: ITokenEncryption;
  let mockCacheService: ICacheService;

  const now = new Date();
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-07');

  const campaign = Campaign.reconstruct({
    id: 'campaign-1',
    externalId: 'ext-campaign-1',
    name: 'Test Campaign',
    status: CampaignStatus.ACTIVE,
    adAccountId: 'ad-account-1',
    createdAt: now,
    updatedAt: now,
  });

  const metaAdAccount = AdAccount.reconstruct({
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

  const googleAdAccount = AdAccount.reconstruct({
    id: 'ad-account-2',
    platform: Platform.GOOGLE,
    accountId: '987654321',
    accountName: 'Google Ad Account',
    accessToken: 'encrypted-google-token',
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

  const normalizedInsights: NormalizedInsightData[] = [
    {
      date: new Date('2024-01-01'),
      spend: 150.50,
      impressions: 10000,
      clicks: 500,
      conversions: 25,
      revenue: 750.00,
    },
    {
      date: new Date('2024-01-02'),
      spend: 200.75,
      impressions: 15000,
      clicks: 800,
      conversions: 40,
      revenue: 1200.00,
    },
  ];

  const validInput: SyncInsightsInput = {
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

    mockAdapter = {
      platform: Platform.META,
      authType: 'oauth' as const,
      getAuthUrl: vi.fn(),
      exchangeCodeForToken: vi.fn(),
      refreshAccessToken: vi.fn(),
      validateToken: vi.fn(),
      getAdAccounts: vi.fn(),
      getCampaigns: vi.fn(),
      getInsights: vi.fn(),
    };

    mockAdapterRegistry = {
      getAdapter: vi.fn(),
      hasAdapter: vi.fn(),
      getSupportedPlatforms: vi.fn(),
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
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(metaAdAccount);
    vi.mocked(mockCacheService.get).mockResolvedValue(null);
    vi.mocked(mockCacheService.set).mockResolvedValue(undefined);
    vi.mocked(mockAdapterRegistry.getAdapter).mockReturnValue(mockAdapter);
    vi.mocked(mockTokenEncryption.decrypt).mockResolvedValue('decrypted-token-xyz');
    vi.mocked(mockAdapter.getInsights).mockResolvedValue(normalizedInsights);
    vi.mocked(mockInsightRepo.findByCampaignAndDate).mockResolvedValue(null);
    vi.mocked(mockInsightRepo.saveMany).mockImplementation(async (insights) => insights);

    useCase = new SyncInsightsUseCase(
      mockCampaignRepo,
      mockAdAccountRepo,
      mockInsightRepo,
      mockAdapterRegistry,
      mockTokenEncryption,
      mockCacheService,
    );
  });

  it('should create new insights from normalized data', async () => {
    const result = await useCase.execute(validInput);

    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.synced).toBe(2);
    expect(result.errors).toHaveLength(0);

    const savedInsights = vi.mocked(mockInsightRepo.saveMany).mock.calls[0]![0];
    expect(savedInsights).toHaveLength(2);
    const insight = savedInsights[0]!;
    expect(insight.spend).toBe(150.50);
    expect(insight.impressions).toBe(10000);
    expect(insight.clicks).toBe(500);
    expect(insight.conversions).toBe(25);
    expect(insight.revenue).toBe(750.00);
    expect(insight.campaignId).toBe('campaign-1');
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

  it('should handle mixed create and update in same sync', async () => {
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

  it('should return cached result when available', async () => {
    const cachedResult: SyncInsightsOutput = {
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
    expect(mockAdapterRegistry.getAdapter).not.toHaveBeenCalled();
    expect(mockTokenEncryption.decrypt).not.toHaveBeenCalled();
    expect(mockAdapter.getInsights).not.toHaveBeenCalled();
    expect(mockInsightRepo.saveMany).not.toHaveBeenCalled();
  });

  it('should cache result after successful sync', async () => {
    await useCase.execute(validInput);

    expect(mockCacheService.set).toHaveBeenCalledTimes(1);
    const [cacheKey, cachedValue, ttl] = vi.mocked(mockCacheService.set).mock.calls[0]!;
    expect(cacheKey).toContain('insights:META:ext-campaign-1:');
    expect(cachedValue).toMatchObject({
      synced: 2,
      created: 2,
      updated: 0,
    });
    expect(ttl).toBe(86400);
  });

  it('should not call saveMany when insights list is empty', async () => {
    vi.mocked(mockAdapter.getInsights).mockResolvedValue([]);

    const result = await useCase.execute(validInput);

    expect(result.synced).toBe(0);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(mockInsightRepo.saveMany).not.toHaveBeenCalled();
  });

  it('should collect errors for individual insight failures without stopping', async () => {
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
    expect(result.errors[0]).toContain('Failed to sync insight for');
    expect(result.errors[0]).toContain('Database timeout');
    // Second insight should still be created
    expect(result.created).toBe(1);
    expect(result.synced).toBe(1);
  });

  it('should get correct adapter from registry based on adAccount.platform', async () => {
    // Test with META platform
    await useCase.execute(validInput);

    expect(mockAdapterRegistry.getAdapter).toHaveBeenCalledWith(Platform.META);
    expect(mockAdapterRegistry.getAdapter).toHaveBeenCalledTimes(1);

    // Test with GOOGLE platform
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(googleAdAccount);
    vi.mocked(mockAdapterRegistry.getAdapter).mockClear();

    const googleAdapter: IAdPlatformClient = {
      platform: Platform.GOOGLE,
      authType: 'oauth' as const,
      getAuthUrl: vi.fn(),
      exchangeCodeForToken: vi.fn(),
      refreshAccessToken: vi.fn(),
      validateToken: vi.fn(),
      getAdAccounts: vi.fn(),
      getCampaigns: vi.fn(),
      getInsights: vi.fn<IAdPlatformClient['getInsights']>().mockResolvedValue(normalizedInsights),
    };
    vi.mocked(mockAdapterRegistry.getAdapter).mockReturnValue(googleAdapter);

    await useCase.execute(validInput);

    expect(mockAdapterRegistry.getAdapter).toHaveBeenCalledWith(Platform.GOOGLE);
  });

  it('should properly decrypt token before calling adapter', async () => {
    await useCase.execute(validInput);

    expect(mockTokenEncryption.decrypt).toHaveBeenCalledWith('encrypted-token-xyz');
    expect(mockTokenEncryption.decrypt).toHaveBeenCalledTimes(1);

    // Verify adapter.getInsights was called with the decrypted token
    expect(mockAdapter.getInsights).toHaveBeenCalledWith(
      'decrypted-token-xyz',
      expect.any(String),
      expect.any(Date),
      expect.any(Date),
    );
  });

  it('should batch save all insights with saveMany', async () => {
    await useCase.execute(validInput);

    expect(mockInsightRepo.saveMany).toHaveBeenCalledTimes(1);
    const savedInsights = vi.mocked(mockInsightRepo.saveMany).mock.calls[0]![0];
    expect(savedInsights).toHaveLength(2);
  });

  it('should include date range in output', async () => {
    const result = await useCase.execute(validInput);

    expect(result.dateRange).toEqual({ start: startDate, end: endDate });
    expect(result.synced).toBe(2);
    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.errors).toEqual([]);
  });
});
