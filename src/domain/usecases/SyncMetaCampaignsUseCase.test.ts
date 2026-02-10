import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SyncMetaCampaignsUseCase,
  SyncMetaCampaignsInput,
} from './SyncMetaCampaignsUseCase';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { ICampaignRepository } from '../repositories/ICampaignRepository';
import { IMetaApiClient, MetaCampaignData } from '../services/IMetaApiClient';
import { ITokenEncryption } from '../services/ITokenEncryption';
import { AdAccount } from '../entities/AdAccount';
import { Campaign } from '../entities/Campaign';
import { Platform, CampaignStatus } from '../entities/types';

describe('SyncMetaCampaignsUseCase', () => {
  let useCase: SyncMetaCampaignsUseCase;
  let mockAdAccountRepo: IAdAccountRepository;
  let mockCampaignRepo: ICampaignRepository;
  let mockMetaApiClient: IMetaApiClient;
  let mockTokenEncryption: ITokenEncryption;

  const now = new Date();

  const activeAdAccount = AdAccount.reconstruct({
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

  const metaCampaigns: MetaCampaignData[] = [
    {
      id: 'meta-campaign-1',
      name: 'Summer Sale Campaign',
      status: 'ACTIVE',
      objective: 'CONVERSIONS',
      dailyBudget: '5000',
    },
    {
      id: 'meta-campaign-2',
      name: 'Winter Promo',
      status: 'PAUSED',
      objective: 'REACH',
      dailyBudget: '3000',
    },
  ];

  const validInput: SyncMetaCampaignsInput = {
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

    // Default happy path mocks
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(activeAdAccount);
    vi.mocked(mockTokenEncryption.decrypt).mockResolvedValue('decrypted-token-abc');
    vi.mocked(mockMetaApiClient.getCampaigns).mockResolvedValue(metaCampaigns);
    vi.mocked(mockCampaignRepo.findByExternalId).mockResolvedValue(null);
    vi.mocked(mockCampaignRepo.saveMany).mockImplementation(async (campaigns) => campaigns);

    useCase = new SyncMetaCampaignsUseCase(
      mockAdAccountRepo,
      mockCampaignRepo,
      mockMetaApiClient,
      mockTokenEncryption,
    );
  });

  it('should sync new campaigns from META (created)', async () => {
    const result = await useCase.execute(validInput);

    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.synced).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should update existing campaigns that changed name', async () => {
    const existingCampaign = Campaign.reconstruct({
      id: 'campaign-uuid-1',
      externalId: 'meta-campaign-1',
      name: 'Old Campaign Name',
      status: CampaignStatus.ACTIVE,
      adAccountId: 'ad-account-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockCampaignRepo.findByExternalId).mockImplementation(
      async (_adAccountId, externalId) => {
        if (externalId === 'meta-campaign-1') return existingCampaign;
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.updated).toBe(1);
    expect(result.created).toBe(1);
    expect(result.synced).toBe(2);

    const savedCampaigns = vi.mocked(mockCampaignRepo.saveMany).mock.calls[0]![0];
    const updatedCampaign = savedCampaigns.find(
      (c) => c.externalId === 'meta-campaign-1',
    );
    expect(updatedCampaign!.name).toBe('Summer Sale Campaign');
  });

  it('should update existing campaigns that changed status', async () => {
    const existingCampaign = Campaign.reconstruct({
      id: 'campaign-uuid-1',
      externalId: 'meta-campaign-1',
      name: 'Summer Sale Campaign',
      status: CampaignStatus.PAUSED,
      adAccountId: 'ad-account-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockCampaignRepo.findByExternalId).mockImplementation(
      async (_adAccountId, externalId) => {
        if (externalId === 'meta-campaign-1') return existingCampaign;
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.updated).toBe(1);
    expect(result.created).toBe(1);

    const savedCampaigns = vi.mocked(mockCampaignRepo.saveMany).mock.calls[0]![0];
    const updatedCampaign = savedCampaigns.find(
      (c) => c.externalId === 'meta-campaign-1',
    );
    expect(updatedCampaign!.status).toBe(CampaignStatus.ACTIVE);
  });

  it('should not modify existing campaigns if nothing changed (but still count as updated)', async () => {
    const existingCampaign = Campaign.reconstruct({
      id: 'campaign-uuid-1',
      externalId: 'meta-campaign-1',
      name: 'Summer Sale Campaign',
      status: CampaignStatus.ACTIVE,
      adAccountId: 'ad-account-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockCampaignRepo.findByExternalId).mockImplementation(
      async (_adAccountId, externalId) => {
        if (externalId === 'meta-campaign-1') return existingCampaign;
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.updated).toBe(1);
    expect(result.created).toBe(1);

    const savedCampaigns = vi.mocked(mockCampaignRepo.saveMany).mock.calls[0]![0];
    const unchangedCampaign = savedCampaigns.find(
      (c) => c.externalId === 'meta-campaign-1',
    );
    // The campaign should be the exact same reference since nothing changed
    expect(unchangedCampaign!.name).toBe('Summer Sale Campaign');
    expect(unchangedCampaign!.status).toBe(CampaignStatus.ACTIVE);
  });

  it('should create and update in same sync', async () => {
    const existingCampaign = Campaign.reconstruct({
      id: 'campaign-uuid-2',
      externalId: 'meta-campaign-2',
      name: 'Old Winter Name',
      status: CampaignStatus.ACTIVE,
      adAccountId: 'ad-account-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockCampaignRepo.findByExternalId).mockImplementation(
      async (_adAccountId, externalId) => {
        if (externalId === 'meta-campaign-2') return existingCampaign;
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.synced).toBe(2);
  });

  it('should throw when ad account not found', async () => {
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow('Ad account not found');
  });

  it('should throw when ad account is not active', async () => {
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(inactiveAdAccount);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'Ad account is not active',
    );
  });

  it('should throw when ad account has no access token', async () => {
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(noTokenAdAccount);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'Ad account has no access token',
    );
  });

  it('should decrypt token before calling META API', async () => {
    await useCase.execute(validInput);

    expect(mockTokenEncryption.decrypt).toHaveBeenCalledWith('encrypted-token-abc');
    expect(mockTokenEncryption.decrypt).toHaveBeenCalledTimes(1);

    // Verify getCampaigns was called with the decrypted token
    expect(mockMetaApiClient.getCampaigns).toHaveBeenCalledWith(
      'decrypted-token-abc',
      expect.any(String),
    );
  });

  it('should pass correct account format (act_accountId)', async () => {
    await useCase.execute(validInput);

    expect(mockMetaApiClient.getCampaigns).toHaveBeenCalledWith(
      'decrypted-token-abc',
      'act_123456789',
    );
  });

  it('should map META statuses correctly (ACTIVE, PAUSED, DELETED, ARCHIVED)', async () => {
    const allStatusCampaigns: MetaCampaignData[] = [
      { id: 'c-1', name: 'Active', status: 'ACTIVE', objective: 'CONVERSIONS' },
      { id: 'c-2', name: 'Paused', status: 'PAUSED', objective: 'REACH' },
      { id: 'c-3', name: 'Deleted', status: 'DELETED', objective: 'REACH' },
      { id: 'c-4', name: 'Archived', status: 'ARCHIVED', objective: 'REACH' },
    ];

    vi.mocked(mockMetaApiClient.getCampaigns).mockResolvedValue(allStatusCampaigns);

    const result = await useCase.execute(validInput);

    expect(result.created).toBe(4);

    const savedCampaigns = vi.mocked(mockCampaignRepo.saveMany).mock.calls[0]![0];
    expect(savedCampaigns[0]!.status).toBe(CampaignStatus.ACTIVE);
    expect(savedCampaigns[1]!.status).toBe(CampaignStatus.PAUSED);
    expect(savedCampaigns[2]!.status).toBe(CampaignStatus.DELETED);
    expect(savedCampaigns[3]!.status).toBe(CampaignStatus.ARCHIVED);
  });

  it('should map unknown META status to PAUSED', async () => {
    const unknownStatusCampaigns: MetaCampaignData[] = [
      { id: 'c-1', name: 'Unknown', status: 'SOME_NEW_STATUS', objective: 'REACH' },
    ];

    vi.mocked(mockMetaApiClient.getCampaigns).mockResolvedValue(unknownStatusCampaigns);

    const result = await useCase.execute(validInput);

    expect(result.created).toBe(1);

    const savedCampaigns = vi.mocked(mockCampaignRepo.saveMany).mock.calls[0]![0];
    expect(savedCampaigns[0]!.status).toBe(CampaignStatus.PAUSED);
  });

  it('should batch save campaigns with saveMany', async () => {
    await useCase.execute(validInput);

    expect(mockCampaignRepo.saveMany).toHaveBeenCalledTimes(1);
    const savedCampaigns = vi.mocked(mockCampaignRepo.saveMany).mock.calls[0]![0];
    expect(savedCampaigns).toHaveLength(2);
  });

  it('should collect errors for individual campaign failures without stopping', async () => {
    // Make findByExternalId throw on the first campaign but succeed on the second
    vi.mocked(mockCampaignRepo.findByExternalId).mockImplementation(
      async (_adAccountId, externalId) => {
        if (externalId === 'meta-campaign-1') {
          throw new Error('Database connection error');
        }
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to sync campaign meta-campaign-1');
    expect(result.errors[0]).toContain('Database connection error');
    // Second campaign should still be created
    expect(result.created).toBe(1);
    expect(result.synced).toBe(1);
  });

  it('should return correct counts (synced, created, updated)', async () => {
    const threeCampaigns: MetaCampaignData[] = [
      { id: 'c-new-1', name: 'New One', status: 'ACTIVE', objective: 'CONVERSIONS' },
      { id: 'c-existing-1', name: 'Updated Name', status: 'ACTIVE', objective: 'REACH' },
      { id: 'c-new-2', name: 'New Two', status: 'PAUSED', objective: 'REACH' },
    ];

    const existingCampaign = Campaign.reconstruct({
      id: 'campaign-uuid-existing',
      externalId: 'c-existing-1',
      name: 'Old Name',
      status: CampaignStatus.ACTIVE,
      adAccountId: 'ad-account-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockMetaApiClient.getCampaigns).mockResolvedValue(threeCampaigns);
    vi.mocked(mockCampaignRepo.findByExternalId).mockImplementation(
      async (_adAccountId, externalId) => {
        if (externalId === 'c-existing-1') return existingCampaign;
        return null;
      },
    );

    const result = await useCase.execute(validInput);

    expect(result.created).toBe(2);
    expect(result.updated).toBe(1);
    expect(result.synced).toBe(3);
    expect(result.errors).toHaveLength(0);
  });

  it('should not call saveMany when no campaigns returned from META', async () => {
    vi.mocked(mockMetaApiClient.getCampaigns).mockResolvedValue([]);

    const result = await useCase.execute(validInput);

    expect(result.synced).toBe(0);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(mockCampaignRepo.saveMany).not.toHaveBeenCalled();
  });
});
