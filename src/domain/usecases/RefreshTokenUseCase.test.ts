import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RefreshTokenUseCase,
} from './RefreshTokenUseCase';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { IPlatformAdapterRegistry } from '../services/IPlatformAdapterRegistry';
import { IAdPlatformClient, TokenExchangeResult } from '../services/IAdPlatformClient';
import { ITokenEncryption } from '../services/ITokenEncryption';
import { AdAccount } from '../entities/AdAccount';
import { Platform } from '../entities/types';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let mockAdAccountRepo: IAdAccountRepository;
  let mockAdapterRegistry: IPlatformAdapterRegistry;
  let mockAdapter: IAdPlatformClient;
  let mockTokenEncryption: ITokenEncryption;

  const now = new Date();

  const createAdAccount = (overrides: Partial<{
    id: string;
    platform: Platform;
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    isActive: boolean;
  }> = {}): AdAccount => {
    return AdAccount.reconstruct({
      id: overrides.id ?? 'account-1',
      platform: overrides.platform ?? Platform.GOOGLE,
      accountId: 'ext-account-123',
      accountName: 'Test Ad Account',
      accessToken: overrides.accessToken !== undefined ? overrides.accessToken : 'encrypted-access-token',
      refreshToken: overrides.refreshToken !== undefined ? overrides.refreshToken : null,
      tokenExpiresAt: overrides.tokenExpiresAt !== undefined ? overrides.tokenExpiresAt : new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days
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

    mockAdapter = {
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

    mockAdapterRegistry = {
      getAdapter: vi.fn().mockReturnValue(mockAdapter),
      hasAdapter: vi.fn(),
      getSupportedPlatforms: vi.fn(),
    };

    mockTokenEncryption = {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    };

    // Default happy path mocks: valid token, not expiring soon
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(createAdAccount());
    vi.mocked(mockTokenEncryption.decrypt).mockResolvedValue('decrypted-access-token');
    vi.mocked(mockAdapter.validateToken).mockResolvedValue(true);

    useCase = new RefreshTokenUseCase(
      mockAdAccountRepo,
      mockAdapterRegistry,
      mockTokenEncryption,
    );
  });

  it('should return valid with no refresh needed when token is healthy', async () => {
    // Token expires 60 days from now, is valid
    const result = await useCase.execute({ adAccountId: 'account-1' });

    expect(result.isValid).toBe(true);
    expect(result.needsReauth).toBe(false);
    expect(result.wasRefreshed).toBe(false);
    expect(result.adAccount).toBeDefined();
    expect(result.adAccount.id).toBe('account-1');
    expect(result.expiresAt).toEqual(new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000));
  });

  it('should set needsReauth when token is invalid and no refreshToken available', async () => {
    vi.mocked(mockAdapter.validateToken).mockResolvedValue(false);

    const result = await useCase.execute({ adAccountId: 'account-1' });

    expect(result.isValid).toBe(false);
    expect(result.needsReauth).toBe(true);
    expect(result.wasRefreshed).toBe(false);
  });

  it('should refresh token successfully when invalid but refreshToken exists', async () => {
    const accountWithRefresh = createAdAccount({
      refreshToken: 'encrypted-refresh-token',
    });
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(accountWithRefresh);
    vi.mocked(mockAdapter.validateToken).mockResolvedValue(false);

    const newExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const tokenResult: TokenExchangeResult = {
      accessToken: 'new-plain-access-token',
      refreshToken: 'new-plain-refresh-token',
      expiresAt: newExpiresAt,
    };
    vi.mocked(mockAdapter.refreshAccessToken).mockResolvedValue(tokenResult);

    vi.mocked(mockTokenEncryption.decrypt).mockImplementation(async (ciphertext) => {
      if (ciphertext === 'encrypted-access-token') return 'decrypted-access-token';
      if (ciphertext === 'encrypted-refresh-token') return 'decrypted-refresh-token';
      return 'unknown';
    });

    vi.mocked(mockTokenEncryption.encrypt).mockImplementation(async (plaintext) => {
      if (plaintext === 'new-plain-access-token') return 'new-encrypted-access-token';
      if (plaintext === 'new-plain-refresh-token') return 'new-encrypted-refresh-token';
      return 'encrypted-unknown';
    });

    const savedAccount = createAdAccount({
      accessToken: 'new-encrypted-access-token',
      refreshToken: 'new-encrypted-refresh-token',
      tokenExpiresAt: newExpiresAt,
    });
    vi.mocked(mockAdAccountRepo.save).mockResolvedValue(savedAccount);

    const result = await useCase.execute({ adAccountId: 'account-1' });

    expect(result.isValid).toBe(true);
    expect(result.needsReauth).toBe(false);
    expect(result.wasRefreshed).toBe(true);
    expect(result.expiresAt).toEqual(newExpiresAt);
    expect(result.adAccount.accessToken).toBe('new-encrypted-access-token');
  });

  it('should refresh when token is valid but expiring within 7 days and refreshToken exists', async () => {
    const expiringAccount = createAdAccount({
      tokenExpiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
      refreshToken: 'encrypted-refresh-token',
    });
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(expiringAccount);
    vi.mocked(mockAdapter.validateToken).mockResolvedValue(true);

    const newExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const tokenResult: TokenExchangeResult = {
      accessToken: 'new-plain-access-token',
      refreshToken: 'new-plain-refresh-token',
      expiresAt: newExpiresAt,
    };
    vi.mocked(mockAdapter.refreshAccessToken).mockResolvedValue(tokenResult);

    vi.mocked(mockTokenEncryption.decrypt).mockResolvedValue('decrypted-token');
    vi.mocked(mockTokenEncryption.encrypt).mockResolvedValue('new-encrypted-token');

    const savedAccount = createAdAccount({
      tokenExpiresAt: newExpiresAt,
    });
    vi.mocked(mockAdAccountRepo.save).mockResolvedValue(savedAccount);

    const result = await useCase.execute({ adAccountId: 'account-1' });

    expect(result.wasRefreshed).toBe(true);
    expect(result.needsReauth).toBe(false);
    expect(result.isValid).toBe(true);
  });

  it('should set needsReauth when token is expiring within 7 days but no refreshToken', async () => {
    const expiringAccount = createAdAccount({
      tokenExpiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
      refreshToken: null,
    });
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(expiringAccount);
    vi.mocked(mockAdapter.validateToken).mockResolvedValue(true);

    const result = await useCase.execute({ adAccountId: 'account-1' });

    expect(result.isValid).toBe(true);
    expect(result.needsReauth).toBe(true);
    expect(result.wasRefreshed).toBe(false);
  });

  it('should throw "Ad account not found" when account does not exist', async () => {
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute({ adAccountId: 'nonexistent' })).rejects.toThrow(
      'Ad account not found',
    );
  });

  it('should throw "Ad account has no access token" when accessToken is null', async () => {
    const noTokenAccount = createAdAccount({ accessToken: null });
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(noTokenAccount);

    await expect(useCase.execute({ adAccountId: 'account-1' })).rejects.toThrow(
      'Ad account has no access token',
    );
  });

  it('should catch refresh failure and set needsReauth=true', async () => {
    const accountWithRefresh = createAdAccount({
      refreshToken: 'encrypted-refresh-token',
    });
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(accountWithRefresh);
    vi.mocked(mockAdapter.validateToken).mockResolvedValue(false);
    vi.mocked(mockAdapter.refreshAccessToken).mockRejectedValue(new Error('Refresh token expired'));
    vi.mocked(mockTokenEncryption.decrypt).mockResolvedValue('decrypted-token');

    const result = await useCase.execute({ adAccountId: 'account-1' });

    expect(result.isValid).toBe(false);
    expect(result.needsReauth).toBe(true);
    expect(result.wasRefreshed).toBe(false);
  });

  it('should get the correct adapter from registry based on account platform', async () => {
    const metaAccount = createAdAccount({ platform: Platform.META });
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(metaAccount);

    await useCase.execute({ adAccountId: 'account-1' });

    expect(mockAdapterRegistry.getAdapter).toHaveBeenCalledWith(Platform.META);
  });

  it('should properly decrypt the access token before validation', async () => {
    await useCase.execute({ adAccountId: 'account-1' });

    expect(mockTokenEncryption.decrypt).toHaveBeenCalledWith('encrypted-access-token');
    expect(mockAdapter.validateToken).toHaveBeenCalledWith('decrypted-access-token');

    // Ensure decrypt is called before validateToken
    const decryptOrder = vi.mocked(mockTokenEncryption.decrypt).mock.invocationCallOrder[0]!;
    const validateOrder = vi.mocked(mockAdapter.validateToken).mock.invocationCallOrder[0]!;
    expect(decryptOrder).toBeLessThan(validateOrder);
  });

  it('should encrypt new tokens after successful refresh', async () => {
    const accountWithRefresh = createAdAccount({
      refreshToken: 'encrypted-refresh-token',
    });
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(accountWithRefresh);
    vi.mocked(mockAdapter.validateToken).mockResolvedValue(false);

    const newExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    vi.mocked(mockAdapter.refreshAccessToken).mockResolvedValue({
      accessToken: 'new-plain-access',
      refreshToken: 'new-plain-refresh',
      expiresAt: newExpiresAt,
    });

    vi.mocked(mockTokenEncryption.decrypt).mockResolvedValue('decrypted-token');
    vi.mocked(mockTokenEncryption.encrypt).mockImplementation(async (plaintext) => `encrypted(${plaintext})`);

    const savedAccount = createAdAccount({ tokenExpiresAt: newExpiresAt });
    vi.mocked(mockAdAccountRepo.save).mockResolvedValue(savedAccount);

    await useCase.execute({ adAccountId: 'account-1' });

    expect(mockTokenEncryption.encrypt).toHaveBeenCalledWith('new-plain-access');
    expect(mockTokenEncryption.encrypt).toHaveBeenCalledWith('new-plain-refresh');
    expect(mockTokenEncryption.encrypt).toHaveBeenCalledTimes(2);
  });

  it('should save updated account to repository after successful refresh', async () => {
    const accountWithRefresh = createAdAccount({
      refreshToken: 'encrypted-refresh-token',
    });
    vi.mocked(mockAdAccountRepo.findById).mockResolvedValue(accountWithRefresh);
    vi.mocked(mockAdapter.validateToken).mockResolvedValue(false);

    const newExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    vi.mocked(mockAdapter.refreshAccessToken).mockResolvedValue({
      accessToken: 'new-plain-access',
      refreshToken: null,
      expiresAt: newExpiresAt,
    });

    vi.mocked(mockTokenEncryption.decrypt).mockResolvedValue('decrypted-token');
    vi.mocked(mockTokenEncryption.encrypt).mockResolvedValue('new-encrypted-access');

    const savedAccount = createAdAccount({ tokenExpiresAt: newExpiresAt });
    vi.mocked(mockAdAccountRepo.save).mockResolvedValue(savedAccount);

    await useCase.execute({ adAccountId: 'account-1' });

    expect(mockAdAccountRepo.save).toHaveBeenCalledTimes(1);

    const savedArg = vi.mocked(mockAdAccountRepo.save).mock.calls[0]![0];
    expect(savedArg.accessToken).toBe('new-encrypted-access');
    // refreshToken from adapter was null, so encrypted refresh should be null
    expect(savedArg.refreshToken).toBeNull();
    expect(savedArg.tokenExpiresAt).toEqual(newExpiresAt);
  });
});
