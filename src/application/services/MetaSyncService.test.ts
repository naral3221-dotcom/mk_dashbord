import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetaSyncService } from './MetaSyncService';
import { IAdAccountRepository } from '@/domain/repositories/IAdAccountRepository';
import { ICampaignRepository } from '@/domain/repositories/ICampaignRepository';
import { AdAccount } from '@/domain/entities/AdAccount';
import { Campaign } from '@/domain/entities/Campaign';
import { Platform, CampaignStatus } from '@/domain/entities/types';
import { SyncMetaCampaignsUseCase, SyncMetaCampaignsOutput } from '@/domain/usecases/SyncMetaCampaignsUseCase';
import { SyncMetaInsightsUseCase, SyncMetaInsightsOutput } from '@/domain/usecases/SyncMetaInsightsUseCase';

describe('MetaSyncService', () => {
  let service: MetaSyncService;
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

  const activeMetaAccount1 = AdAccount.reconstruct({
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

  const activeMetaAccount2 = AdAccount.reconstruct({
    id: 'acc-2',
    platform: Platform.META,
    accountId: '222',
    accountName: 'Meta Account 2',
    accessToken: 'encrypted-token-2',
    refreshToken: null,
    tokenExpiresAt: new Date('2026-03-01'),
    isActive: true,
    organizationId: 'org-1',
    createdAt: testDate,
    updatedAt: testDate,
  });

  const inactiveMetaAccount = AdAccount.reconstruct({
    id: 'acc-3',
    platform: Platform.META,
    accountId: '333',
    accountName: 'Inactive Account',
    accessToken: 'encrypted-token-3',
    refreshToken: null,
    tokenExpiresAt: new Date('2026-03-01'),
    isActive: false,
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

    service = new MetaSyncService(
      mockSyncCampaignsUseCase as unknown as SyncMetaCampaignsUseCase,
      mockSyncInsightsUseCase as unknown as SyncMetaInsightsUseCase,
      mockAdAccountRepo as IAdAccountRepository,
      mockCampaignRepo as ICampaignRepository,
    );
  });

  describe('syncCampaigns', () => {
    it('should delegate to SyncMetaCampaignsUseCase and return response', async () => {
      const useCaseOutput: SyncMetaCampaignsOutput = {
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
  });

  describe('syncInsights', () => {
    it('should delegate to SyncMetaInsightsUseCase and return response with ISO date strings', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      const useCaseOutput: SyncMetaInsightsOutput = {
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
    it('should sync campaigns for all active META accounts', async () => {
      mockAdAccountRepo.findByPlatform.mockResolvedValue([activeMetaAccount1]);
      mockSyncCampaignsUseCase.execute.mockResolvedValue({
        synced: 2, created: 1, updated: 1, errors: [],
      });
      mockCampaignRepo.findActiveCampaigns.mockResolvedValue([]);

      const result = await service.syncAllActiveAccounts('org-1');

      expect(mockAdAccountRepo.findByPlatform).toHaveBeenCalledWith('org-1', Platform.META);
      expect(mockSyncCampaignsUseCase.execute).toHaveBeenCalledWith({ adAccountId: 'acc-1' });
      expect(result.totalAccounts).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]!.campaigns).toEqual({
        synced: 2, created: 1, updated: 1, errors: [],
      });
    });

    it('should sync insights for active campaigns after campaign sync', async () => {
      mockAdAccountRepo.findByPlatform.mockResolvedValue([activeMetaAccount1]);
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

    it('should skip inactive accounts', async () => {
      mockAdAccountRepo.findByPlatform.mockResolvedValue([
        activeMetaAccount1,
        inactiveMetaAccount,
      ]);
      mockSyncCampaignsUseCase.execute.mockResolvedValue({
        synced: 1, created: 1, updated: 0, errors: [],
      });
      mockCampaignRepo.findActiveCampaigns.mockResolvedValue([]);

      const result = await service.syncAllActiveAccounts('org-1');

      expect(result.totalAccounts).toBe(1);
      expect(mockSyncCampaignsUseCase.execute).toHaveBeenCalledTimes(1);
      expect(mockSyncCampaignsUseCase.execute).toHaveBeenCalledWith({ adAccountId: 'acc-1' });
    });

    it('should handle account sync failure gracefully', async () => {
      mockAdAccountRepo.findByPlatform.mockResolvedValue([activeMetaAccount1, activeMetaAccount2]);
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
      mockAdAccountRepo.findByPlatform.mockResolvedValue([activeMetaAccount1]);
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
      mockAdAccountRepo.findByPlatform.mockResolvedValue([inactiveMetaAccount]);

      const result = await service.syncAllActiveAccounts('org-1');

      expect(result.totalAccounts).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toEqual([]);
      expect(mockSyncCampaignsUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return correct totals across multiple accounts', async () => {
      mockAdAccountRepo.findByPlatform.mockResolvedValue([activeMetaAccount1, activeMetaAccount2]);
      mockSyncCampaignsUseCase.execute
        .mockResolvedValueOnce({ synced: 3, created: 2, updated: 1, errors: [] })
        .mockResolvedValueOnce({ synced: 5, created: 3, updated: 2, errors: [] });
      mockCampaignRepo.findActiveCampaigns.mockResolvedValue([]);

      const result = await service.syncAllActiveAccounts('org-1');

      expect(result.totalAccounts).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]!.adAccountId).toBe('acc-1');
      expect(result.results[0]!.accountName).toBe('Meta Account 1');
      expect(result.results[1]!.adAccountId).toBe('acc-2');
      expect(result.results[1]!.accountName).toBe('Meta Account 2');
    });

    it('should pass last 30 days as date range for insights', async () => {
      const now = new Date();
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-10T12:00:00.000Z'));

      mockAdAccountRepo.findByPlatform.mockResolvedValue([activeMetaAccount1]);
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

    it('should return empty results when findByPlatform returns empty array', async () => {
      mockAdAccountRepo.findByPlatform.mockResolvedValue([]);

      const result = await service.syncAllActiveAccounts('org-1');

      expect(result.totalAccounts).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toEqual([]);
    });
  });
});
