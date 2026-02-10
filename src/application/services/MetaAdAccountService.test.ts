import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetaAdAccountService } from './MetaAdAccountService';
import { IAdAccountRepository } from '@/domain/repositories/IAdAccountRepository';
import { AdAccount } from '@/domain/entities/AdAccount';
import { Platform } from '@/domain/entities/types';
import { MetaConnectAdAccountRequest, toAdAccountResponse } from '../dto/MetaDTO';

describe('MetaAdAccountService', () => {
  let service: MetaAdAccountService;
  let mockConnectUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockAdAccountRepo: IAdAccountRepository;

  const testDate = new Date('2026-01-01');
  const tokenExpiresDate = new Date('2026-03-01');

  const sampleAdAccount = AdAccount.reconstruct({
    id: 'acc-1',
    platform: Platform.META,
    accountId: '123456',
    accountName: 'Test Ad Account',
    accessToken: 'encrypted-token',
    refreshToken: null,
    tokenExpiresAt: tokenExpiresDate,
    isActive: true,
    organizationId: 'org-1',
    createdAt: testDate,
    updatedAt: testDate,
  });

  const sampleAdAccountNullToken = AdAccount.reconstruct({
    id: 'acc-2',
    platform: Platform.META,
    accountId: '789012',
    accountName: 'No Token Account',
    accessToken: null,
    refreshToken: null,
    tokenExpiresAt: null,
    isActive: true,
    organizationId: 'org-1',
    createdAt: testDate,
    updatedAt: testDate,
  });

  const sampleRequest: MetaConnectAdAccountRequest = {
    userId: 'user-1',
    organizationId: 'org-1',
    shortLivedToken: 'short-token-abc',
    metaAccountId: '123456',
    metaAccountName: 'Test Ad Account',
  };

  beforeEach(() => {
    mockConnectUseCase = {
      execute: vi.fn(),
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

    service = new MetaAdAccountService(
      mockConnectUseCase as never,
      mockAdAccountRepo,
    );
  });

  describe('connectAdAccount', () => {
    it('should delegate to use case and return DTO', async () => {
      vi.mocked(mockConnectUseCase.execute).mockResolvedValue({
        adAccount: sampleAdAccount,
        isNewAccount: true,
      });

      const result = await service.connectAdAccount(sampleRequest);

      expect(mockConnectUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-1',
        organizationId: 'org-1',
        shortLivedToken: 'short-token-abc',
        metaAccountId: '123456',
        metaAccountName: 'Test Ad Account',
      });
      expect(result.isNew).toBe(true);
      expect(result.account.id).toBe('acc-1');
      expect(result.account.platform).toBe(Platform.META);
    });

    it('should convert AdAccount entity to response DTO correctly', async () => {
      vi.mocked(mockConnectUseCase.execute).mockResolvedValue({
        adAccount: sampleAdAccount,
        isNewAccount: false,
      });

      const result = await service.connectAdAccount(sampleRequest);

      expect(result.isNew).toBe(false);
      expect(result.account).toEqual({
        id: 'acc-1',
        platform: Platform.META,
        accountId: '123456',
        accountName: 'Test Ad Account',
        isActive: true,
        tokenExpiresAt: tokenExpiresDate.toISOString(),
        organizationId: 'org-1',
        createdAt: testDate.toISOString(),
        updatedAt: testDate.toISOString(),
      });
    });
  });

  describe('getAdAccounts', () => {
    it('should return META accounts for organization as DTOs', async () => {
      vi.mocked(mockAdAccountRepo.findByPlatform).mockResolvedValue([
        sampleAdAccount,
        sampleAdAccountNullToken,
      ]);

      const result = await service.getAdAccounts('org-1');

      expect(mockAdAccountRepo.findByPlatform).toHaveBeenCalledWith('org-1', Platform.META);
      expect(result.total).toBe(2);
      expect(result.accounts).toHaveLength(2);
      expect(result.accounts[0]!.id).toBe('acc-1');
      expect(result.accounts[1]!.id).toBe('acc-2');
    });

    it('should return empty list when no META accounts', async () => {
      vi.mocked(mockAdAccountRepo.findByPlatform).mockResolvedValue([]);

      const result = await service.getAdAccounts('org-1');

      expect(mockAdAccountRepo.findByPlatform).toHaveBeenCalledWith('org-1', Platform.META);
      expect(result.total).toBe(0);
      expect(result.accounts).toEqual([]);
    });
  });

  describe('disconnectAdAccount', () => {
    it('should deactivate the account', async () => {
      vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(sampleAdAccount);
      vi.mocked(mockAdAccountRepo.save).mockImplementation(async (acc) => acc);

      await service.disconnectAdAccount('acc-1');

      expect(mockAdAccountRepo.findById).toHaveBeenCalledWith('acc-1');
      expect(mockAdAccountRepo.save).toHaveBeenCalledTimes(1);

      const savedAccount = vi.mocked(mockAdAccountRepo.save).mock.calls[0]![0]!;
      expect(savedAccount.isActive).toBe(false);
      expect(savedAccount.id).toBe('acc-1');
    });

    it('should throw when account not found', async () => {
      vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(null);

      await expect(service.disconnectAdAccount('nonexistent')).rejects.toThrow(
        'Ad account not found',
      );

      expect(mockAdAccountRepo.findById).toHaveBeenCalledWith('nonexistent');
      expect(mockAdAccountRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('DTO conversion', () => {
    it('should convert dates to ISO strings in response', () => {
      const response = toAdAccountResponse(sampleAdAccount);

      expect(response.createdAt).toBe('2026-01-01T00:00:00.000Z');
      expect(response.updatedAt).toBe('2026-01-01T00:00:00.000Z');
      expect(response.tokenExpiresAt).toBe('2026-03-01T00:00:00.000Z');
    });

    it('should handle null tokenExpiresAt', () => {
      const response = toAdAccountResponse(sampleAdAccountNullToken);

      expect(response.tokenExpiresAt).toBeNull();
      expect(response.id).toBe('acc-2');
      expect(response.accountName).toBe('No Token Account');
    });
  });
});
