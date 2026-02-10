import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConnectMetaAdAccountUseCase,
  ConnectMetaAdAccountInput,
} from './ConnectMetaAdAccountUseCase';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { IUserRepository } from '../repositories/IUserRepository';
import { IMetaApiClient, MetaTokenExchangeResult } from '../services/IMetaApiClient';
import { ITokenEncryption } from '../services/ITokenEncryption';
import { User } from '../entities/User';
import { AdAccount } from '../entities/AdAccount';
import { Role, Platform } from '../entities/types';

describe('ConnectMetaAdAccountUseCase', () => {
  let useCase: ConnectMetaAdAccountUseCase;
  let mockAdAccountRepo: IAdAccountRepository;
  let mockUserRepo: IUserRepository;
  let mockMetaApiClient: IMetaApiClient;
  let mockTokenEncryption: ITokenEncryption;

  const now = new Date();
  const futureDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days from now

  const memberUser = User.reconstruct({
    id: 'user-1',
    email: 'member@example.com',
    name: 'Test Member',
    role: Role.MEMBER,
    organizationId: 'org-1',
    passwordHash: 'hashed',
    authProvider: 'credentials',
    emailVerified: null,
    image: null,
    createdAt: now,
    updatedAt: now,
  });

  const viewerUser = User.reconstruct({
    id: 'user-viewer',
    email: 'viewer@example.com',
    name: 'Test Viewer',
    role: Role.VIEWER,
    organizationId: 'org-1',
    passwordHash: 'hashed',
    authProvider: 'credentials',
    emailVerified: null,
    image: null,
    createdAt: now,
    updatedAt: now,
  });

  const userInDifferentOrg = User.reconstruct({
    id: 'user-other',
    email: 'other@example.com',
    name: 'Other User',
    role: Role.MEMBER,
    organizationId: 'org-other',
    passwordHash: 'hashed',
    authProvider: 'credentials',
    emailVerified: null,
    image: null,
    createdAt: now,
    updatedAt: now,
  });

  const tokenExchangeResult: MetaTokenExchangeResult = {
    accessToken: 'long-lived-token-abc123',
    expiresAt: futureDate,
  };

  const validInput: ConnectMetaAdAccountInput = {
    userId: 'user-1',
    organizationId: 'org-1',
    shortLivedToken: 'short-lived-token-xyz',
    metaAccountId: 'act_123456789',
    metaAccountName: 'My Meta Ad Account',
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

    mockUserRepo = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByOrganizationId: vi.fn(),
      findByOrganizationAndRole: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      existsByEmail: vi.fn(),
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
    vi.mocked(mockUserRepo.findById).mockResolvedValue(memberUser);
    vi.mocked(mockMetaApiClient.exchangeToken).mockResolvedValue(tokenExchangeResult);
    vi.mocked(mockTokenEncryption.encrypt).mockResolvedValue('encrypted-long-lived-token');
    vi.mocked(mockAdAccountRepo.findByPlatformAndAccountId).mockResolvedValue(null);
    vi.mocked(mockAdAccountRepo.save).mockImplementation(async (account) => account);

    useCase = new ConnectMetaAdAccountUseCase(
      mockAdAccountRepo,
      mockUserRepo,
      mockMetaApiClient,
      mockTokenEncryption,
    );
  });

  it('should connect new META ad account successfully', async () => {
    const result = await useCase.execute(validInput);

    expect(result.adAccount).toBeDefined();
    expect(result.adAccount.platform).toBe(Platform.META);
    expect(result.adAccount.accountId).toBe('act_123456789');
    expect(result.adAccount.accountName).toBe('My Meta Ad Account');
    expect(result.adAccount.organizationId).toBe('org-1');
    expect(result.adAccount.accessToken).toBe('encrypted-long-lived-token');
    expect(result.adAccount.tokenExpiresAt).toEqual(futureDate);
    expect(result.adAccount.isActive).toBe(true);
    expect(result.isNewAccount).toBe(true);
  });

  it('should update existing META ad account tokens', async () => {
    const existingAccount = AdAccount.reconstruct({
      id: 'existing-account-id',
      platform: Platform.META,
      accountId: 'act_123456789',
      accountName: 'My Meta Ad Account',
      accessToken: 'old-encrypted-token',
      refreshToken: null,
      tokenExpiresAt: new Date(now.getTime() - 1000), // expired
      isActive: true,
      organizationId: 'org-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockAdAccountRepo.findByPlatformAndAccountId).mockResolvedValue(existingAccount);

    const result = await useCase.execute(validInput);

    expect(result.isNewAccount).toBe(false);
    expect(result.adAccount.id).toBe('existing-account-id');
    expect(result.adAccount.accessToken).toBe('encrypted-long-lived-token');
    expect(result.adAccount.tokenExpiresAt).toEqual(futureDate);
  });

  it('should reactivate a deactivated existing account', async () => {
    const deactivatedAccount = AdAccount.reconstruct({
      id: 'deactivated-account-id',
      platform: Platform.META,
      accountId: 'act_123456789',
      accountName: 'My Meta Ad Account',
      accessToken: 'old-encrypted-token',
      refreshToken: null,
      tokenExpiresAt: new Date(now.getTime() - 1000),
      isActive: false,
      organizationId: 'org-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockAdAccountRepo.findByPlatformAndAccountId).mockResolvedValue(deactivatedAccount);

    const result = await useCase.execute(validInput);

    expect(result.isNewAccount).toBe(false);
    expect(result.adAccount.isActive).toBe(true);
    expect(result.adAccount.accessToken).toBe('encrypted-long-lived-token');
  });

  it('should throw when user not found', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow('User not found');
  });

  it('should throw when user does not belong to organization', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(userInDifferentOrg);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'User does not belong to this organization',
    );
  });

  it('should throw when user has insufficient permissions (VIEWER role)', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(viewerUser);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'Insufficient permissions to manage ad accounts',
    );
  });

  it('should call exchangeToken with the short-lived token', async () => {
    await useCase.execute(validInput);

    expect(mockMetaApiClient.exchangeToken).toHaveBeenCalledWith('short-lived-token-xyz');
    expect(mockMetaApiClient.exchangeToken).toHaveBeenCalledTimes(1);
  });

  it('should encrypt the long-lived token', async () => {
    await useCase.execute(validInput);

    expect(mockTokenEncryption.encrypt).toHaveBeenCalledWith('long-lived-token-abc123');
    expect(mockTokenEncryption.encrypt).toHaveBeenCalledTimes(1);
  });

  it('should save the ad account to repository', async () => {
    await useCase.execute(validInput);

    expect(mockAdAccountRepo.save).toHaveBeenCalledTimes(1);
    const savedAccount = vi.mocked(mockAdAccountRepo.save).mock.calls[0]![0];
    expect(savedAccount.platform).toBe(Platform.META);
    expect(savedAccount.accountId).toBe('act_123456789');
    expect(savedAccount.accessToken).toBe('encrypted-long-lived-token');
  });

  it('should return isNewAccount=true for new accounts', async () => {
    vi.mocked(mockAdAccountRepo.findByPlatformAndAccountId).mockResolvedValue(null);

    const result = await useCase.execute(validInput);

    expect(result.isNewAccount).toBe(true);
  });

  it('should return isNewAccount=false for existing accounts', async () => {
    const existingAccount = AdAccount.reconstruct({
      id: 'existing-id',
      platform: Platform.META,
      accountId: 'act_123456789',
      accountName: 'My Meta Ad Account',
      accessToken: 'old-token',
      refreshToken: null,
      tokenExpiresAt: futureDate,
      isActive: true,
      organizationId: 'org-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockAdAccountRepo.findByPlatformAndAccountId).mockResolvedValue(existingAccount);

    const result = await useCase.execute(validInput);

    expect(result.isNewAccount).toBe(false);
  });

  it('should handle token exchange failure (propagates error)', async () => {
    vi.mocked(mockMetaApiClient.exchangeToken).mockRejectedValue(
      new Error('META API token exchange failed'),
    );

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'META API token exchange failed',
    );

    // Should not have attempted to encrypt or save
    expect(mockTokenEncryption.encrypt).not.toHaveBeenCalled();
    expect(mockAdAccountRepo.save).not.toHaveBeenCalled();
  });
});
