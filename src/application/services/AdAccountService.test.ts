import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdAccountService } from './AdAccountService';
import { IAdAccountRepository } from '@/domain/repositories/IAdAccountRepository';
import { AdAccount } from '@/domain/entities/AdAccount';
import { Platform } from '@/domain/entities/types';
import { toAdAccountResponse } from '../dto/MetaDTO';

describe('AdAccountService', () => {
  let service: AdAccountService;
  let mockConnectUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockAdAccountRepo: IAdAccountRepository;

  const testDate = new Date('2026-01-01');
  const tokenExpiresDate = new Date('2026-03-01');

  const sampleMetaAccount = AdAccount.reconstruct({
    id: 'acc-1',
    platform: Platform.META,
    accountId: '123456',
    accountName: 'Test Meta Account',
    accessToken: 'encrypted-token',
    refreshToken: null,
    tokenExpiresAt: tokenExpiresDate,
    isActive: true,
    organizationId: 'org-1',
    createdAt: testDate,
    updatedAt: testDate,
  });

  const sampleGoogleAccount = AdAccount.reconstruct({
    id: 'acc-2',
    platform: Platform.GOOGLE,
    accountId: '789012',
    accountName: 'Test Google Account',
    accessToken: 'encrypted-token-2',
    refreshToken: 'encrypted-refresh',
    tokenExpiresAt: tokenExpiresDate,
    isActive: true,
    organizationId: 'org-1',
    createdAt: testDate,
    updatedAt: testDate,
  });

  const sampleNullTokenAccount = AdAccount.reconstruct({
    id: 'acc-3',
    platform: Platform.TIKTOK,
    accountId: '345678',
    accountName: 'No Token Account',
    accessToken: null,
    refreshToken: null,
    tokenExpiresAt: null,
    isActive: true,
    organizationId: 'org-1',
    createdAt: testDate,
    updatedAt: testDate,
  });

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

    service = new AdAccountService(
      mockConnectUseCase as never,
      mockAdAccountRepo,
    );
  });

  describe('connectAdAccount', () => {
    it('should delegate to ConnectAdAccountUseCase with all fields and return response', async () => {
      vi.mocked(mockConnectUseCase.execute).mockResolvedValue({
        adAccount: sampleMetaAccount,
        isNewAccount: true,
      });

      const result = await service.connectAdAccount({
        userId: 'user-1',
        organizationId: 'org-1',
        platform: Platform.META,
        externalAccountId: '123456',
        externalAccountName: 'Test Meta Account',
        authCode: 'auth-code-123',
        redirectUri: 'https://example.com/callback',
      });

      expect(mockConnectUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-1',
        organizationId: 'org-1',
        platform: Platform.META,
        externalAccountId: '123456',
        externalAccountName: 'Test Meta Account',
        authCode: 'auth-code-123',
        redirectUri: 'https://example.com/callback',
        apiKey: undefined,
        apiSecret: undefined,
        customerId: undefined,
      });
      expect(result.isNew).toBe(true);
      expect(result.account.id).toBe('acc-1');
      expect(result.account.platform).toBe(Platform.META);
    });

    it('should pass API key credentials for non-OAuth platforms', async () => {
      vi.mocked(mockConnectUseCase.execute).mockResolvedValue({
        adAccount: sampleGoogleAccount,
        isNewAccount: true,
      });

      const result = await service.connectAdAccount({
        userId: 'user-1',
        organizationId: 'org-1',
        platform: Platform.GOOGLE,
        externalAccountId: '789012',
        externalAccountName: 'Test Google Account',
        apiKey: 'api-key-123',
        apiSecret: 'api-secret-456',
        customerId: 'customer-789',
      });

      expect(mockConnectUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-1',
        organizationId: 'org-1',
        platform: Platform.GOOGLE,
        externalAccountId: '789012',
        externalAccountName: 'Test Google Account',
        authCode: undefined,
        redirectUri: undefined,
        apiKey: 'api-key-123',
        apiSecret: 'api-secret-456',
        customerId: 'customer-789',
      });
      expect(result.isNew).toBe(true);
      expect(result.account.platform).toBe(Platform.GOOGLE);
    });

    it('should convert AdAccount entity to response DTO correctly', async () => {
      vi.mocked(mockConnectUseCase.execute).mockResolvedValue({
        adAccount: sampleMetaAccount,
        isNewAccount: false,
      });

      const result = await service.connectAdAccount({
        userId: 'user-1',
        organizationId: 'org-1',
        platform: Platform.META,
        externalAccountId: '123456',
        externalAccountName: 'Test Meta Account',
        authCode: 'auth-code',
        redirectUri: 'https://example.com/callback',
      });

      expect(result.isNew).toBe(false);
      expect(result.account).toEqual({
        id: 'acc-1',
        platform: Platform.META,
        accountId: '123456',
        accountName: 'Test Meta Account',
        isActive: true,
        tokenExpiresAt: tokenExpiresDate.toISOString(),
        organizationId: 'org-1',
        createdAt: testDate.toISOString(),
        updatedAt: testDate.toISOString(),
      });
    });
  });

  describe('getAdAccounts', () => {
    it('should return all accounts when no platform specified', async () => {
      vi.mocked(mockAdAccountRepo.findByOrganizationId).mockResolvedValue([
        sampleMetaAccount,
        sampleGoogleAccount,
        sampleNullTokenAccount,
      ]);

      const result = await service.getAdAccounts('org-1');

      expect(mockAdAccountRepo.findByOrganizationId).toHaveBeenCalledWith('org-1');
      expect(mockAdAccountRepo.findByPlatform).not.toHaveBeenCalled();
      expect(result.total).toBe(3);
      expect(result.accounts).toHaveLength(3);
      expect(result.accounts[0]!.id).toBe('acc-1');
      expect(result.accounts[0]!.platform).toBe(Platform.META);
      expect(result.accounts[1]!.id).toBe('acc-2');
      expect(result.accounts[1]!.platform).toBe(Platform.GOOGLE);
      expect(result.accounts[2]!.id).toBe('acc-3');
      expect(result.accounts[2]!.platform).toBe(Platform.TIKTOK);
    });

    it('should return filtered accounts when platform specified', async () => {
      vi.mocked(mockAdAccountRepo.findByPlatform).mockResolvedValue([sampleMetaAccount]);

      const result = await service.getAdAccounts('org-1', Platform.META);

      expect(mockAdAccountRepo.findByPlatform).toHaveBeenCalledWith('org-1', Platform.META);
      expect(mockAdAccountRepo.findByOrganizationId).not.toHaveBeenCalled();
      expect(result.total).toBe(1);
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0]!.platform).toBe(Platform.META);
    });

    it('should return empty list when no accounts exist', async () => {
      vi.mocked(mockAdAccountRepo.findByOrganizationId).mockResolvedValue([]);

      const result = await service.getAdAccounts('org-1');

      expect(result.total).toBe(0);
      expect(result.accounts).toEqual([]);
    });

    it('should handle null tokenExpiresAt in response', async () => {
      vi.mocked(mockAdAccountRepo.findByOrganizationId).mockResolvedValue([sampleNullTokenAccount]);

      const result = await service.getAdAccounts('org-1');

      expect(result.accounts[0]!.tokenExpiresAt).toBeNull();
      expect(result.accounts[0]!.accountName).toBe('No Token Account');
    });
  });

  describe('disconnectAdAccount', () => {
    it('should deactivate the account', async () => {
      vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(sampleMetaAccount);
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
      const response = toAdAccountResponse(sampleMetaAccount);

      expect(response.createdAt).toBe('2026-01-01T00:00:00.000Z');
      expect(response.updatedAt).toBe('2026-01-01T00:00:00.000Z');
      expect(response.tokenExpiresAt).toBe('2026-03-01T00:00:00.000Z');
    });

    it('should handle null tokenExpiresAt', () => {
      const response = toAdAccountResponse(sampleNullTokenAccount);

      expect(response.tokenExpiresAt).toBeNull();
      expect(response.id).toBe('acc-3');
      expect(response.accountName).toBe('No Token Account');
    });
  });
});
