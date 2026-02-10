import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from './SyncService';
import { IAdAccountRepository } from '@/domain/repositories/IAdAccountRepository';
import { ICampaignRepository } from '@/domain/repositories/ICampaignRepository';
import { AdAccount } from '@/domain/entities/AdAccount';
import { Campaign } from '@/domain/entities/Campaign';
import { Platform, CampaignStatus } from '@/domain/entities/types';
import { SyncCampaignsUseCase, SyncCampaignsOutput } from '@/domain/usecases/SyncCampaignsUseCase';
import { SyncInsightsUseCase, SyncInsightsOutput } from '@/domain/usecases/SyncInsightsUseCase';

describe('SyncService', () => {
  let service: SyncService;
  let mockSyncCampaignsUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockSyncInsightsUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockAdAccountRepo: {
    findById: ReturnType<typeof vi.fn>;
    findByOrganizationId: ReturnType<typeof vi.fn>;
    findByPlatform: ReturnType<typeof vi.fn>;
    findByPlatformAndAccountId: ReturnType<typeof vi.fn>;
    findActiveByOrganizationId: ReturnType<typeof vi.fn>;
    findWithExpiredTokens: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    countByOrganizationId: ReturnType<typeof vi.fn>;
  };
  let mockCampaignRepo: {
    findById: ReturnType<typeof vi.fn>;
    findByAdAccountId: ReturnType<typeof vi.fn>;
    findByExternalId: ReturnType<typeof vi.fn>;
    findByStatus: ReturnType<typeof vi.fn>;
    findActiveCampaigns: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    saveMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    countByStatus: ReturnType<typeof vi.fn>;
  };

  const testDate = new Date('2026-01-15');

  const activeMetaAccount = AdAccount.reconstruct({
    id: 'acc-1',
    platform: Platform.META,
    accountId: '111',
    accountName: 'Meta Account 1',
    accessToken: 'encrypted-token-1',
    refreshToken: null,
    tokenExpiresAt: new Date('2026-03-01'),
    isActive: true,
    organizationId: 'org-1',
    createdAt: testDate,
    updatedAt: testDate,
  });

  const activeGoogleAccount = AdAccount.reconstruct({
    id: 'acc-2',
    platform: Platform.GOOGLE,
    accountId: '222',
    accountName: 'Google Account 1',
    accessToken: 'encrypted-token-2',
    refreshToken: 'encrypted-refresh-2',
    tokenExpiresAt: new Date('2026-03-01'),
    isActive: true,
    organizationId: 'org-1',
    createdAt: testDate,
    updatedAt: testDate,
  });

  const activeTiktokAccount = AdAccount.reconstruct({
    id: 'acc-3',
    platform: Platform.TIKTOK,
    accountId: '333',
    accountName: 'TikTok Account 1',
    accessToken: 'encrypted-token-3',
    refreshToken: null,
    tokenExpiresAt: new Date('2026-03-01'),
    isActive: true,
    organizationId: 'org-1',
    createdAt: testDate,
    updatedAt: testDate,
  });

  const activeCampaign1 = Campaign.reconstruct({
    id: 'camp-1',
    externalId: 'ext-1',
    name: 'Campaign One',
    status: CampaignStatus.ACTIVE,
    adAccountId: 'acc-1',
    createdAt: testDate,
    updatedAt: testDate,
  });

  const activeCampaign2 = Campaign.reconstruct({
    id: 'camp-2',
    externalId: 'ext-2',
    name: 'Campaign Two',
    status: CampaignStatus.ACTIVE,
    adAccountId: 'acc-1',
    createdAt: testDate,
    updatedAt: testDate,
  });

  const googleCampaign = Campaign.reconstruct({
    id: 'camp-3',
    externalId: 'ext-3',
    name: 'Google Campaign',
    status: CampaignStatus.ACTIVE,
    adAccountId: 'acc-2',
    createdAt: testDate,
    updatedAt: testDate,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockSyncCampaignsUseCase = { execute: vi.fn() };
    mockSyncInsightsUseCase = { execute: vi.fn() };
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

    service = new SyncService(
      mockSyncCampaignsUseCase as unknown as SyncCampaignsUseCase,
      mockSyncInsightsUseCase as unknown as SyncInsightsUseCase,
      mockAdAccountRepo as IAdAccountRepository,
      mockCampaignRepo as ICampaignRepository,
    );
  });

  describe('syncCampaigns', () => {
    it('should delegate to SyncCampaignsUseCase and return response', async () => {
      const useCaseOutput: SyncCampaignsOutput = {
        synced: 5,
        created: 3,
        updated: 2,
        errors: [],
      };
      mockSyncCampaignsUseCase.execute.mockResolvedValue(useCaseOutput);

      const result = await service.syncCampaigns('acc-1');

      expect(mockSyncCampaignsUseCase.execute).toHaveBeenCalledWith({ adAccountId: 'acc-1' });
      expect(result).toEqual({
        synced: 5,
        created: 3,
        updated: 2,
        errors: [],
      });
    });

    it('should propagate errors from use case', async () => {
      const useCaseOutput: SyncCampaignsOutput = {
        synced: 3,
        created: 2,
        updated: 1,
        errors: ['Failed to sync campaign ext-99: API error'],
      };
      mockSyncCampaignsUseCase.execute.mockResolvedValue(useCaseOutput);

      const result = await service.syncCampaigns('acc-1');

      expect(result.errors).toEqual(['Failed to sync campaign ext-99: API error']);
    });
  });

  describe('syncInsights', () => {
    it('should delegate to SyncInsightsUseCase and return response with ISO date strings', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      const useCaseOutput: SyncInsightsOutput = {
        synced: 10,
        created: 7,
        updated: 3,
        dateRange: { start: startDate, end: endDate },
        errors: ['minor warning'],
      };
      mockSyncInsightsUseCase.execute.mockResolvedValue(useCaseOutput);

      const result = await service.syncInsights('camp-1', startDate, endDate);

      expect(mockSyncInsightsUseCase.execute).toHaveBeenCalledWith({
        campaignId: 'camp-1',
        startDate,
        endDate,
      });
      expect(result).toEqual({
        synced: 10,
        created: 7,
        updated: 3,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        errors: ['minor warning'],
      });
    });
  });

  describe('syncAllActiveAccounts', () => {
    it('should use findActiveByOrganizationId to get ALL platform accounts', async () => {
      mockAdAccountRepo.findActiveByOrganizationId.mockResolvedValue([activeMetaAccount]);
      mockSyncCampaignsUseCase.execute.mockResolvedValue({
        synced: 2, created: 1, updated: 1, errors: [],
      });
      mockCampaignRepo.findActiveCampaigns.mockResolvedValue([]);

      const result = await service.syncAllActiveAccounts('org-1');

      expect(mockAdAccountRepo.findActiveByOrganizationId).toHaveBeenCalledWith('org-1');
      expect(mockAdAccountRepo.findByPlatform).not.toHaveBeenCalled();
      expect(mockSyncCampaignsUseCase.execute).toHaveBeenCalledWith({ adAccountId: 'acc-1' });
      expect(result.totalAccounts).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]!.campaigns).toEqual({
        synced: 2, created: 1, updated: 1, errors: [],
      });
    });

    it('should process accounts from multiple platforms', async () => {
      mockAdAccountRepo.findActiveByOrganizationId.mockResolvedValue([
        activeMetaAccount,
        activeGoogleAccount,
        activeTiktokAccount,
      ]);
      mockSyncCampaignsUseCase.execute
        .mockResolvedValueOnce({ synced: 3, created: 2, updated: 1, errors: [] })
        .mockResolvedValueOnce({ synced: 5, created: 3, updated: 2, errors: [] })
        .mockResolvedValueOnce({ synced: 1, created: 1, updated: 0, errors: [] });
      mockCampaignRepo.findActiveCampaigns.mockResolvedValue([]);

      const result = await service.syncAllActiveAccounts('org-1');

      expect(result.totalAccounts).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.results[0]!.adAccountId).toBe('acc-1');
      expect(result.results[0]!.accountName).toBe('Meta Account 1');
      expect(result.results[1]!.adAccountId).toBe('acc-2');
      expect(result.results[1]!.accountName).toBe('Google Account 1');
      expect(result.results[2]!.adAccountId).toBe('acc-3');
      expect(result.results[2]!.accountName).toBe('TikTok Account 1');
    });

    it('should sync insights for active campaigns after campaign sync', async () => {
      mockAdAccountRepo.findActiveByOrganizationId.mockResolvedValue([activeMetaAccount]);
      mockSyncCampaignsUseCase.execute.mockResolvedValue({
        synced: 2, created: 1, updated: 1, errors: [],
      });
      mockCampaignRepo.findActiveCampaigns.mockResolvedValue([activeCampaign1, activeCampaign2]);
      mockSyncInsightsUseCase.execute.mockResolvedValue({
        synced: 5, created: 3, updated: 2,
        dateRange: { start: new Date(), end: new Date() },
        errors: [],
      });

      await service.syncAllActiveAccounts('org-1');

      expect(mockCampaignRepo.findActiveCampaigns).toHaveBeenCalledWith('acc-1');
      expect(mockSyncInsightsUseCase.execute).toHaveBeenCalledTimes(2);
      expect(mockSyncInsightsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ campaignId: 'camp-1' }),
      );
      expect(mockSyncInsightsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ campaignId: 'camp-2' }),
      );
    });

    it('should handle account sync failure gracefully', async () => {
      mockAdAccountRepo.findActiveByOrganizationId.mockResolvedValue([
        activeMetaAccount,
        activeGoogleAccount,
      ]);
      mockSyncCampaignsUseCase.execute
        .mockRejectedValueOnce(new Error('API rate limit exceeded'))
        .mockResolvedValueOnce({ synced: 3, created: 2, updated: 1, errors: [] });
      mockCampaignRepo.findActiveCampaigns.mockResolvedValue([]);

      const result = await service.syncAllActiveAccounts('org-1');

      expect(result.totalAccounts).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[0]!.error).toBe('API rate limit exceeded');
      expect(result.results[0]!.campaigns).toBeNull();
      expect(result.results[1]!.error).toBeNull();
      expect(result.results[1]!.campaigns).not.toBeNull();
    });

    it('should handle individual insight sync failure without failing the account', async () => {
      mockAdAccountRepo.findActiveByOrganizationId.mockResolvedValue([activeMetaAccount]);
      mockSyncCampaignsUseCase.execute.mockResolvedValue({
        synced: 2, created: 1, updated: 1, errors: [],
      });
      mockCampaignRepo.findActiveCampaigns.mockResolvedValue([activeCampaign1, activeCampaign2]);
      mockSyncInsightsUseCase.execute
        .mockRejectedValueOnce(new Error('Insight fetch failed'))
        .mockResolvedValueOnce({
          synced: 5, created: 3, updated: 2,
          dateRange: { start: new Date(), end: new Date() },
          errors: [],
        });

      const result = await service.syncAllActiveAccounts('org-1');

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results[0]!.campaigns).toEqual({
        synced: 2, created: 1, updated: 1, errors: [],
      });
      expect(result.results[0]!.error).toBeNull();
    });

    it('should return empty results when no active accounts exist', async () => {
      mockAdAccountRepo.findActiveByOrganizationId.mockResolvedValue([]);

      const result = await service.syncAllActiveAccounts('org-1');

      expect(result.totalAccounts).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toEqual([]);
      expect(mockSyncCampaignsUseCase.execute).not.toHaveBeenCalled();
    });

    it('should pass last 30 days as date range for insights', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-10T12:00:00.000Z'));

      mockAdAccountRepo.findActiveByOrganizationId.mockResolvedValue([activeMetaAccount]);
      mockSyncCampaignsUseCase.execute.mockResolvedValue({
        synced: 1, created: 1, updated: 0, errors: [],
      });
      mockCampaignRepo.findActiveCampaigns.mockResolvedValue([activeCampaign1]);
      mockSyncInsightsUseCase.execute.mockResolvedValue({
        synced: 30, created: 30, updated: 0,
        dateRange: { start: new Date(), end: new Date() },
        errors: [],
      });

      await service.syncAllActiveAccounts('org-1');

      const insightCall = mockSyncInsightsUseCase.execute.mock.calls[0]!;
      const callArgs = insightCall[0] as { campaignId: string; startDate: Date; endDate: Date };

      expect(callArgs.campaignId).toBe('camp-1');

      const expectedStart = new Date('2026-01-11T12:00:00.000Z');
      const expectedEnd = new Date('2026-02-10T12:00:00.000Z');
      expect(callArgs.startDate.toISOString()).toBe(expectedStart.toISOString());
      expect(callArgs.endDate.toISOString()).toBe(expectedEnd.toISOString());

      vi.useRealTimers();
    });

    it('should sync insights for campaigns across different platform accounts', async () => {
      mockAdAccountRepo.findActiveByOrganizationId.mockResolvedValue([
        activeMetaAccount,
        activeGoogleAccount,
      ]);
      mockSyncCampaignsUseCase.execute
        .mockResolvedValueOnce({ synced: 2, created: 1, updated: 1, errors: [] })
        .mockResolvedValueOnce({ synced: 1, created: 1, updated: 0, errors: [] });
      mockCampaignRepo.findActiveCampaigns
        .mockResolvedValueOnce([activeCampaign1])
        .mockResolvedValueOnce([googleCampaign]);
      mockSyncInsightsUseCase.execute.mockResolvedValue({
        synced: 5, created: 3, updated: 2,
        dateRange: { start: new Date(), end: new Date() },
        errors: [],
      });

      const result = await service.syncAllActiveAccounts('org-1');

      expect(mockCampaignRepo.findActiveCampaigns).toHaveBeenCalledWith('acc-1');
      expect(mockCampaignRepo.findActiveCampaigns).toHaveBeenCalledWith('acc-2');
      expect(mockSyncInsightsUseCase.execute).toHaveBeenCalledTimes(2);
      expect(mockSyncInsightsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ campaignId: 'camp-1' }),
      );
      expect(mockSyncInsightsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ campaignId: 'camp-3' }),
      );
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });
  });
});
