import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SyncCampaignsUseCase,
  SyncCampaignsInput,
} from './SyncCampaignsUseCase';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { ICampaignRepository } from '../repositories/ICampaignRepository';
import { IPlatformAdapterRegistry } from '../services/IPlatformAdapterRegistry';
import { IAdPlatformClient, NormalizedCampaignData } from '../services/IAdPlatformClient';
import { ITokenEncryption } from '../services/ITokenEncryption';
import { AdAccount } from '../entities/AdAccount';
import { Campaign } from '../entities/Campaign';
import { Platform, CampaignStatus } from '../entities/types';

describe('SyncCampaignsUseCase', () => {
  let useCase: SyncCampaignsUseCase;
  let mockAdAccountRepo: IAdAccountRepository;
  let mockCampaignRepo: ICampaignRepository;
  let mockPlatformRegistry: IPlatformAdapterRegistry;
  let mockAdapter: IAdPlatformClient;
  let mockTokenEncryption: ITokenEncryption;

  const now = new Date();

  const activeMetaAdAccount = AdAccount.reconstruct({
    id: 'ad-account-1',
    platform: Platform.META,
    accountId: '123456789',
    accountName: 'Test Ad Account',
    accessToken: 'encrypted-token-abc',
    refreshToken: null,
    tokenExpiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
    isActive: true,
    organizationId: 'org-1',
    createdAt: now,
    updatedAt: now,
  });

  const activeGoogleAdAccount = AdAccount.reconstruct({
    id: 'ad-account-google-1',
    platform: Platform.GOOGLE,
    accountId: '987654321',
    accountName: 'Test Google Ad Account',
    accessToken: 'encrypted-google-token',
    refreshToken: null,
    tokenExpiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
    isActive: true,
    organizationId: 'org-1',
    createdAt: now,
    updatedAt: now,
  });

  const inactiveAdAccount = AdAccount.reconstruct({
    id: 'ad-account-inactive',
    platform: Platform.META,
    accountId: '123456789',
    accountName: 'Test Ad Account',
    accessToken: 'encrypted-token-abc',
    refreshToken: null,
    tokenExpiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
    isActive: false,
    organizationId: 'org-1',
    createdAt: now,
    updatedAt: now,
  });

  const noTokenAdAccount = AdAccount.reconstruct({
    id: 'ad-account-no-token',
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

  const normalizedCampaigns: NormalizedCampaignData[] = [
    {
      externalCampaignId: 'platform-campaign-1',
      name: 'Summer Sale Campaign',
      status: CampaignStatus.ACTIVE,
    },
    {
      externalCampaignId: 'platform-campaign-2',
      name: 'Winter Promo',
      status: CampaignStatus.PAUSED,
    },
  ];

  const validInput: SyncCampaignsInput = {
    adAccountId: 'ad-account-1',
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

    mockPlatformRegistry = {
      getAdapter: vi.fn(),
      hasAdapter: vi.fn(),
      getSupportedPlatforms: vi.fn(),
    };

    mockTokenEncryption = {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    };

    // Default happy path mocks
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(activeMetaAdAccount);
    vi.mocked(mockTokenEncryption.decrypt).mockResolvedValue('decrypted-token-abc');
    vi.mocked(mockPlatformRegistry.getAdapter).mockReturnValue(mockAdapter);
    vi.mocked(mockAdapter.getCampaigns).mockResolvedValue(normalizedCampaigns);
    vi.mocked(mockCampaignRepo.findByExternalId).mockResolvedValue(null);
    vi.mocked(mockCampaignRepo.saveMany).mockImplementation(async (campaigns) => campaigns);

    useCase = new SyncCampaignsUseCase(
      mockAdAccountRepo,
      mockCampaignRepo,
      mockPlatformRegistry,
      mockTokenEncryption,
    );
  });

  it('should sync new campaigns - creates new ones', async () => {
    const result = await useCase.execute(validInput);

    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.synced).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should sync campaigns - updates existing ones', async () => {
    const existingCampaign1 = Campaign.reconstruct({
      id: 'campaign-uuid-1',
      externalId: 'platform-campaign-1',
      name: 'Old Campaign Name',
      status: CampaignStatus.PAUSED,
      adAccountId: 'ad-account-1',
      createdAt: now,
      updatedAt: now,
    });

    const existingCampaign2 = Campaign.reconstruct({
      id: 'campaign-uuid-2',
      externalId: 'platform-campaign-2',
      name: 'Old Winter Name',
      status: CampaignStatus.ACTIVE,
      adAccountId: 'ad-account-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockCampaignRepo.findByExternalId).mockImplementation(
      async (_adAccountId, externalId) => {
        if (externalId === 'platform-campaign-1') return existingCampaign1;
        if (externalId === 'platform-campaign-2') return existingCampaign2;
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.updated).toBe(2);
    expect(result.created).toBe(0);
    expect(result.synced).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle mixed create and update in single sync', async () => {
    const existingCampaign = Campaign.reconstruct({
      id: 'campaign-uuid-2',
      externalId: 'platform-campaign-2',
      name: 'Old Winter Name',
      status: CampaignStatus.ACTIVE,
      adAccountId: 'ad-account-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockCampaignRepo.findByExternalId).mockImplementation(
      async (_adAccountId, externalId) => {
        if (externalId === 'platform-campaign-2') return existingCampaign;
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.synced).toBe(2);
  });

  it('should throw "Ad account not found" when account does not exist', async () => {
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow('Ad account not found');
  });

  it('should throw "Ad account is not active" when account is inactive', async () => {
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(inactiveAdAccount);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'Ad account is not active',
    );
  });

  it('should throw "Ad account has no access token" when token is missing', async () => {
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(noTokenAdAccount);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'Ad account has no access token',
    );
  });

  it('should collect errors for individual campaign failures without stopping', async () => {
    vi.mocked(mockCampaignRepo.findByExternalId).mockImplementation(
      async (_adAccountId, externalId) => {
        if (externalId === 'platform-campaign-1') {
          throw new Error('Database connection error');
        }
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to sync campaign platform-campaign-1');
    expect(result.errors[0]).toContain('Database connection error');
    // Second campaign should still be created
    expect(result.created).toBe(1);
    expect(result.synced).toBe(1);
  });

  it('should not call saveMany when no campaigns returned from platform', async () => {
    vi.mocked(mockAdapter.getCampaigns).mockResolvedValue([]);

    const result = await useCase.execute(validInput);

    expect(result.synced).toBe(0);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(mockCampaignRepo.saveMany).not.toHaveBeenCalled();
  });

  it('should update name when changed', async () => {
    const existingCampaign = Campaign.reconstruct({
      id: 'campaign-uuid-1',
      externalId: 'platform-campaign-1',
      name: 'Old Campaign Name',
      status: CampaignStatus.ACTIVE,
      adAccountId: 'ad-account-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockCampaignRepo.findByExternalId).mockImplementation(
      async (_adAccountId, externalId) => {
        if (externalId === 'platform-campaign-1') return existingCampaign;
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.updated).toBe(1);
    expect(result.created).toBe(1);

    const savedCampaigns = vi.mocked(mockCampaignRepo.saveMany).mock.calls[0]![0];
    const updatedCampaign = savedCampaigns.find(
      (c) => c.externalId === 'platform-campaign-1',
    );
    expect(updatedCampaign!.name).toBe('Summer Sale Campaign');
  });

  it('should update status when changed', async () => {
    const existingCampaign = Campaign.reconstruct({
      id: 'campaign-uuid-1',
      externalId: 'platform-campaign-1',
      name: 'Summer Sale Campaign',
      status: CampaignStatus.PAUSED,
      adAccountId: 'ad-account-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockCampaignRepo.findByExternalId).mockImplementation(
      async (_adAccountId, externalId) => {
        if (externalId === 'platform-campaign-1') return existingCampaign;
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.updated).toBe(1);
    expect(result.created).toBe(1);

    const savedCampaigns = vi.mocked(mockCampaignRepo.saveMany).mock.calls[0]![0];
    const updatedCampaign = savedCampaigns.find(
      (c) => c.externalId === 'platform-campaign-1',
    );
    expect(updatedCampaign!.status).toBe(CampaignStatus.ACTIVE);
  });

  it('should not modify campaign when name and status are the same', async () => {
    const existingCampaign = Campaign.reconstruct({
      id: 'campaign-uuid-1',
      externalId: 'platform-campaign-1',
      name: 'Summer Sale Campaign',
      status: CampaignStatus.ACTIVE,
      adAccountId: 'ad-account-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockCampaignRepo.findByExternalId).mockImplementation(
      async (_adAccountId, externalId) => {
        if (externalId === 'platform-campaign-1') return existingCampaign;
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.updated).toBe(1);
    expect(result.created).toBe(1);

    const savedCampaigns = vi.mocked(mockCampaignRepo.saveMany).mock.calls[0]![0];
    const unchangedCampaign = savedCampaigns.find(
      (c) => c.externalId === 'platform-campaign-1',
    );
    expect(unchangedCampaign!.name).toBe('Summer Sale Campaign');
    expect(unchangedCampaign!.status).toBe(CampaignStatus.ACTIVE);
  });

  it('should handle empty campaigns list from platform', async () => {
    vi.mocked(mockAdapter.getCampaigns).mockResolvedValue([]);

    const result = await useCase.execute(validInput);

    expect(result.synced).toBe(0);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(mockCampaignRepo.saveMany).not.toHaveBeenCalled();
  });

  it('should get correct adapter from registry based on adAccount.platform', async () => {
    await useCase.execute(validInput);

    expect(mockPlatformRegistry.getAdapter).toHaveBeenCalledWith(Platform.META);
    expect(mockPlatformRegistry.getAdapter).toHaveBeenCalledTimes(1);
  });

  it('should get adapter for GOOGLE platform when ad account is GOOGLE', async () => {
    const googleAdapter: IAdPlatformClient = {
      platform: Platform.GOOGLE,
      authType: 'oauth' as const,
      getAuthUrl: vi.fn(),
      exchangeCodeForToken: vi.fn(),
      refreshAccessToken: vi.fn(),
      validateToken: vi.fn(),
      getAdAccounts: vi.fn(),
      getCampaigns: vi.fn(),
      getInsights: vi.fn(),
    };

    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(activeGoogleAdAccount);
    vi.mocked(mockTokenEncryption.decrypt).mockResolvedValue('decrypted-google-token');
    vi.mocked(mockPlatformRegistry.getAdapter).mockReturnValue(googleAdapter);
    vi.mocked(googleAdapter.getCampaigns).mockResolvedValue([
      {
        externalCampaignId: 'google-campaign-1',
        name: 'Google Campaign',
        status: CampaignStatus.ACTIVE,
      },
    ]);

    const result = await useCase.execute({ adAccountId: 'ad-account-google-1' });

    expect(mockPlatformRegistry.getAdapter).toHaveBeenCalledWith(Platform.GOOGLE);
    expect(result.created).toBe(1);
  });

  it('should decrypt token before calling platform adapter', async () => {
    await useCase.execute(validInput);

    expect(mockTokenEncryption.decrypt).toHaveBeenCalledWith('encrypted-token-abc');
    expect(mockTokenEncryption.decrypt).toHaveBeenCalledTimes(1);

    // Verify getCampaigns was called with the decrypted token
    expect(mockAdapter.getCampaigns).toHaveBeenCalledWith(
      'decrypted-token-abc',
      expect.any(String),
    );
  });

  it('should batch save all campaigns with saveMany', async () => {
    await useCase.execute(validInput);

    expect(mockCampaignRepo.saveMany).toHaveBeenCalledTimes(1);
    const savedCampaigns = vi.mocked(mockCampaignRepo.saveMany).mock.calls[0]![0];
    expect(savedCampaigns).toHaveLength(2);
  });

  it('should pass accountId (not formatted) to adapter - adapter handles formatting', async () => {
    await useCase.execute(validInput);

    // The use case passes the raw accountId; the adapter is responsible for formatting
    expect(mockAdapter.getCampaigns).toHaveBeenCalledWith(
      'decrypted-token-abc',
      '123456789',
    );
  });
});
