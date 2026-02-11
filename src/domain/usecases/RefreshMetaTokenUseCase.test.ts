import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RefreshMetaTokenUseCase,
} from './RefreshMetaTokenUseCase';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { IMetaApiClient } from '../services/IMetaApiClient';
import { ITokenEncryption } from '../services/ITokenEncryption';
import { AdAccount } from '../entities/AdAccount';
import { Platform } from '../entities/types';
import { NotFoundError } from '../errors';

describe('RefreshMetaTokenUseCase', () => {
  let useCase: RefreshMetaTokenUseCase;
  let mockAdAccountRepo: IAdAccountRepository;
  let mockMetaApiClient: IMetaApiClient;
  let mockTokenEncryption: ITokenEncryption;

  const now = new Date();

  const createAdAccount = (overrides: Partial<{
    id: string;
    accessToken: string | null;
    tokenExpiresAt: Date | null;
    isActive: boolean;
  }> = {}): AdAccount => {
    return AdAccount.reconstruct({
      id: overrides.id ?? 'account-1',
      platform: Platform.META,
      accountId: 'act_123456789',
      accountName: 'My Meta Ad Account',
      accessToken: overrides.accessToken !== undefined ? overrides.accessToken : 'encrypted-token',
      refreshToken: null,
      tokenExpiresAt: overrides.tokenExpiresAt !== undefined ? overrides.tokenExpiresAt : new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days default
      isActive: overrides.isActive ?? true,
      organizationId: 'org-1',
      createdAt: now,
      updatedAt: now,
    });
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
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(createAdAccount());
    vi.mocked(mockTokenEncryption.decrypt).mockResolvedValue('decrypted-token-plain');
    vi.mocked(mockMetaApiClient.validateToken).mockResolvedValue(true);

    useCase = new RefreshMetaTokenUseCase(
      mockAdAccountRepo,
      mockMetaApiClient,
      mockTokenEncryption,
    );
  });

  it('should validate a healthy token (valid, not expiring soon)', async () => {
    // Token expires 60 days from now, is valid
    const result = await useCase.execute({ adAccountId: 'account-1' });

    expect(result.isValid).toBe(true);
    expect(result.needsReauth).toBe(false);
    expect(result.adAccount).toBeDefined();
    expect(result.adAccount.id).toBe('account-1');
  });

  it('should detect invalid token (needsReauth=true)', async () => {
    vi.mocked(mockMetaApiClient.validateToken).mockResolvedValue(false);

    const result = await useCase.execute({ adAccountId: 'account-1' });

    expect(result.isValid).toBe(false);
    expect(result.needsReauth).toBe(true);
  });

  it('should detect expired token (needsReauth=true)', async () => {
    const expiredAccount = createAdAccount({
      tokenExpiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
    });
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(expiredAccount);

    const result = await useCase.execute({ adAccountId: 'account-1' });

    expect(result.needsReauth).toBe(true);
  });

  it('should detect token expiring within 7 days (needsReauth=true)', async () => {
    const expiringAccount = createAdAccount({
      tokenExpiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    });
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(expiringAccount);

    const result = await useCase.execute({ adAccountId: 'account-1' });

    expect(result.isValid).toBe(true);
    expect(result.needsReauth).toBe(true);
  });

  it('should throw when ad account not found', async () => {
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute({ adAccountId: 'nonexistent' })).rejects.toThrow(
      'Ad account not found',
    );
    await expect(useCase.execute({ adAccountId: 'nonexistent' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should throw when ad account has no access token', async () => {
    const noTokenAccount = createAdAccount({ accessToken: null });
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(noTokenAccount);

    await expect(useCase.execute({ adAccountId: 'account-1' })).rejects.toThrow(
      'Ad account has no access token',
    );
  });

  it('should decrypt the stored token before validation', async () => {
    await useCase.execute({ adAccountId: 'account-1' });

    expect(mockTokenEncryption.decrypt).toHaveBeenCalledWith('encrypted-token');
    expect(mockMetaApiClient.validateToken).toHaveBeenCalledWith('decrypted-token-plain');

    // Ensure decrypt is called before validateToken
    const decryptOrder = vi.mocked(mockTokenEncryption.decrypt).mock.invocationCallOrder[0]!;
    const validateOrder = vi.mocked(mockMetaApiClient.validateToken).mock.invocationCallOrder[0]!;
    expect(decryptOrder).toBeLessThan(validateOrder);
  });

  it('should return correct expiresAt from ad account', async () => {
    const specificDate = new Date('2026-06-15T00:00:00.000Z');
    const accountWithSpecificExpiry = createAdAccount({
      tokenExpiresAt: specificDate,
    });
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(accountWithSpecificExpiry);

    const result = await useCase.execute({ adAccountId: 'account-1' });

    expect(result.expiresAt).toEqual(specificDate);
  });
});
