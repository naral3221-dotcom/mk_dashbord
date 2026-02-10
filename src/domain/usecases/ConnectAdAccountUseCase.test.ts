import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConnectAdAccountUseCase,
  ConnectAdAccountInput,
} from './ConnectAdAccountUseCase';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { IUserRepository } from '../repositories/IUserRepository';
import { IPlatformAdapterRegistry } from '../services/IPlatformAdapterRegistry';
import { IAdPlatformClient, TokenExchangeResult } from '../services/IAdPlatformClient';
import { ITokenEncryption } from '../services/ITokenEncryption';
import { User } from '../entities/User';
import { AdAccount } from '../entities/AdAccount';
import { Role, Platform } from '../entities/types';

describe('ConnectAdAccountUseCase', () => {
  let useCase: ConnectAdAccountUseCase;
  let mockAdAccountRepo: IAdAccountRepository;
  let mockUserRepo: IUserRepository;
  let mockPlatformRegistry: IPlatformAdapterRegistry;
  let mockTokenEncryption: ITokenEncryption;
  let mockOAuthAdapter: IAdPlatformClient;
  let mockApiKeyAdapter: IAdPlatformClient;

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

  const oauthTokenResultNoRefresh: TokenExchangeResult = {
    accessToken: 'long-lived-token-meta',
    refreshToken: null,
    expiresAt: futureDate,
  };

  const oauthTokenResultWithRefresh: TokenExchangeResult = {
    accessToken: 'access-token-google',
    refreshToken: 'refresh-token-google',
    expiresAt: futureDate,
  };

  const validOAuthInput: ConnectAdAccountInput = {
    userId: 'user-1',
    organizationId: 'org-1',
    platform: Platform.META,
    externalAccountId: 'act_123456789',
    externalAccountName: 'My Meta Ad Account',
    authCode: 'auth-code-xyz',
    redirectUri: 'https://app.example.com/callback',
  };

  const validApiKeyInput: ConnectAdAccountInput = {
    userId: 'user-1',
    organizationId: 'org-1',
    platform: Platform.NAVER,
    externalAccountId: 'naver-acc-001',
    externalAccountName: 'My Naver Ad Account',
    apiKey: 'naver-api-key-123',
    apiSecret: 'naver-api-secret-456',
    customerId: 'naver-customer-789',
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

    mockOAuthAdapter = {
      platform: Platform.META,
      authType: 'oauth',
      getAuthUrl: vi.fn(),
      exchangeCodeForToken: vi.fn(),
      refreshAccessToken: vi.fn(),
      validateToken: vi.fn(),
      getAdAccounts: vi.fn(),
      getCampaigns: vi.fn(),
      getInsights: vi.fn(),
    };

    mockApiKeyAdapter = {
      platform: Platform.NAVER,
      authType: 'api_key',
      getAuthUrl: vi.fn(),
      exchangeCodeForToken: vi.fn(),
      refreshAccessToken: vi.fn(),
      validateToken: vi.fn(),
      getAdAccounts: vi.fn(),
      getCampaigns: vi.fn(),
      getInsights: vi.fn(),
    };

    mockPlatformRegistry = {
      getAdapter: vi.fn((platform: Platform) => {
        if (platform === Platform.META) return mockOAuthAdapter;
        if (platform === Platform.NAVER) return mockApiKeyAdapter;
        throw new Error(`Platform ${platform} is not supported`);
      }),
      hasAdapter: vi.fn((platform: Platform) => {
        return platform === Platform.META || platform === Platform.NAVER;
      }),
      getSupportedPlatforms: vi.fn(() => [Platform.META, Platform.NAVER]),
    };

    mockTokenEncryption = {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    };

    // Default happy path mocks
    vi.mocked(mockUserRepo.findById).mockResolvedValue(memberUser);
    vi.mocked(mockOAuthAdapter.exchangeCodeForToken).mockResolvedValue(oauthTokenResultNoRefresh);
    vi.mocked(mockTokenEncryption.encrypt).mockImplementation(
      async (plaintext) => `encrypted-${plaintext}`,
    );
    vi.mocked(mockAdAccountRepo.findByPlatformAndAccountId).mockResolvedValue(null);
    vi.mocked(mockAdAccountRepo.save).mockImplementation(async (account) => account);

    useCase = new ConnectAdAccountUseCase(
      mockAdAccountRepo,
      mockUserRepo,
      mockPlatformRegistry,
      mockTokenEncryption,
    );
  });

  it('should connect a new OAuth ad account successfully (META)', async () => {
    const result = await useCase.execute(validOAuthInput);

    expect(result.adAccount).toBeDefined();
    expect(result.adAccount.platform).toBe(Platform.META);
    expect(result.adAccount.accountId).toBe('act_123456789');
    expect(result.adAccount.accountName).toBe('My Meta Ad Account');
    expect(result.adAccount.organizationId).toBe('org-1');
    expect(result.adAccount.accessToken).toBe('encrypted-long-lived-token-meta');
    expect(result.adAccount.refreshToken).toBeNull();
    expect(result.adAccount.tokenExpiresAt).toEqual(futureDate);
    expect(result.adAccount.isActive).toBe(true);
    expect(result.isNewAccount).toBe(true);

    expect(mockOAuthAdapter.exchangeCodeForToken).toHaveBeenCalledWith(
      'auth-code-xyz',
      'https://app.example.com/callback',
    );
    expect(mockTokenEncryption.encrypt).toHaveBeenCalledWith('long-lived-token-meta');
  });

  it('should connect a new API Key ad account successfully (NAVER)', async () => {
    const result = await useCase.execute(validApiKeyInput);

    const expectedCredentials = JSON.stringify({
      apiKey: 'naver-api-key-123',
      apiSecret: 'naver-api-secret-456',
      customerId: 'naver-customer-789',
    });

    expect(result.adAccount).toBeDefined();
    expect(result.adAccount.platform).toBe(Platform.NAVER);
    expect(result.adAccount.accountId).toBe('naver-acc-001');
    expect(result.adAccount.accountName).toBe('My Naver Ad Account');
    expect(result.adAccount.organizationId).toBe('org-1');
    expect(result.adAccount.accessToken).toBe(`encrypted-${expectedCredentials}`);
    expect(result.adAccount.refreshToken).toBeNull();
    expect(result.adAccount.isActive).toBe(true);
    expect(result.isNewAccount).toBe(true);

    // Should NOT call exchangeCodeForToken for API Key platforms
    expect(mockApiKeyAdapter.exchangeCodeForToken).not.toHaveBeenCalled();
    // Credentials stored as single JSON string
    expect(mockTokenEncryption.encrypt).toHaveBeenCalledWith(expectedCredentials);
    // Only one encrypt call for api_key flow (combined credentials)
    expect(mockTokenEncryption.encrypt).toHaveBeenCalledTimes(1);
  });

  it('should update existing account with new tokens and reactivate if deactivated', async () => {
    const deactivatedAccount = AdAccount.reconstruct({
      id: 'existing-account-id',
      platform: Platform.META,
      accountId: 'act_123456789',
      accountName: 'My Meta Ad Account',
      accessToken: 'old-encrypted-token',
      refreshToken: null,
      tokenExpiresAt: new Date(now.getTime() - 1000), // expired
      isActive: false,
      organizationId: 'org-1',
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockAdAccountRepo.findByPlatformAndAccountId).mockResolvedValue(deactivatedAccount);

    const result = await useCase.execute(validOAuthInput);

    expect(result.isNewAccount).toBe(false);
    expect(result.adAccount.id).toBe('existing-account-id');
    expect(result.adAccount.accessToken).toBe('encrypted-long-lived-token-meta');
    expect(result.adAccount.tokenExpiresAt).toEqual(futureDate);
    expect(result.adAccount.isActive).toBe(true);
  });

  it('should throw "User not found" when userId is invalid', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validOAuthInput)).rejects.toThrow('User not found');
  });

  it('should throw "User does not belong to this organization" for wrong org', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(userInDifferentOrg);

    await expect(useCase.execute(validOAuthInput)).rejects.toThrow(
      'User does not belong to this organization',
    );
  });

  it('should throw "Insufficient permissions" for VIEWER role', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(viewerUser);

    await expect(useCase.execute(validOAuthInput)).rejects.toThrow(
      'Insufficient permissions to manage ad accounts',
    );
  });

  it('should throw if platform is not supported in registry', async () => {
    vi.mocked(mockPlatformRegistry.hasAdapter).mockReturnValue(false);

    const inputWithUnsupportedPlatform: ConnectAdAccountInput = {
      ...validOAuthInput,
      platform: Platform.TIKTOK,
    };

    await expect(useCase.execute(inputWithUnsupportedPlatform)).rejects.toThrow(
      'Platform TIKTOK is not supported',
    );
  });

  it('should throw if OAuth platform is missing authCode', async () => {
    const inputWithoutAuthCode: ConnectAdAccountInput = {
      userId: 'user-1',
      organizationId: 'org-1',
      platform: Platform.META,
      externalAccountId: 'act_123456789',
      externalAccountName: 'My Meta Ad Account',
      redirectUri: 'https://app.example.com/callback',
      // authCode is missing
    };

    await expect(useCase.execute(inputWithoutAuthCode)).rejects.toThrow(
      'Auth code is required for OAuth platforms',
    );
  });

  it('should throw if OAuth platform is missing redirectUri', async () => {
    const inputWithoutRedirectUri: ConnectAdAccountInput = {
      userId: 'user-1',
      organizationId: 'org-1',
      platform: Platform.META,
      externalAccountId: 'act_123456789',
      externalAccountName: 'My Meta Ad Account',
      authCode: 'auth-code-xyz',
      // redirectUri is missing
    };

    await expect(useCase.execute(inputWithoutRedirectUri)).rejects.toThrow(
      'Redirect URI is required for OAuth platforms',
    );
  });

  it('should throw if API Key platform is missing apiKey', async () => {
    const inputWithoutApiKey: ConnectAdAccountInput = {
      userId: 'user-1',
      organizationId: 'org-1',
      platform: Platform.NAVER,
      externalAccountId: 'naver-acc-001',
      externalAccountName: 'My Naver Ad Account',
      apiSecret: 'naver-api-secret-456',
      // apiKey is missing
    };

    await expect(useCase.execute(inputWithoutApiKey)).rejects.toThrow(
      'API key is required for API Key platforms',
    );
  });

  it('should throw if API Key platform is missing apiSecret', async () => {
    const inputWithoutApiSecret: ConnectAdAccountInput = {
      userId: 'user-1',
      organizationId: 'org-1',
      platform: Platform.NAVER,
      externalAccountId: 'naver-acc-001',
      externalAccountName: 'My Naver Ad Account',
      apiKey: 'naver-api-key-123',
      // apiSecret is missing
    };

    await expect(useCase.execute(inputWithoutApiSecret)).rejects.toThrow(
      'API secret is required for API Key platforms',
    );
  });

  it('should store encrypted refreshToken when present (Google/TikTok)', async () => {
    // Set up Google adapter (OAuth with refresh token)
    const mockGoogleAdapter: IAdPlatformClient = {
      platform: Platform.GOOGLE,
      authType: 'oauth',
      getAuthUrl: vi.fn(),
      exchangeCodeForToken: vi.fn(),
      refreshAccessToken: vi.fn(),
      validateToken: vi.fn(),
      getAdAccounts: vi.fn(),
      getCampaigns: vi.fn(),
      getInsights: vi.fn(),
    };

    vi.mocked(mockGoogleAdapter.exchangeCodeForToken).mockResolvedValue(oauthTokenResultWithRefresh);
    vi.mocked(mockPlatformRegistry.hasAdapter).mockImplementation(
      (platform: Platform) => platform === Platform.GOOGLE,
    );
    vi.mocked(mockPlatformRegistry.getAdapter).mockReturnValue(mockGoogleAdapter);

    const googleInput: ConnectAdAccountInput = {
      userId: 'user-1',
      organizationId: 'org-1',
      platform: Platform.GOOGLE,
      externalAccountId: 'google-acc-001',
      externalAccountName: 'My Google Ads Account',
      authCode: 'google-auth-code',
      redirectUri: 'https://app.example.com/callback/google',
    };

    const result = await useCase.execute(googleInput);

    expect(result.adAccount.accessToken).toBe('encrypted-access-token-google');
    expect(result.adAccount.refreshToken).toBe('encrypted-refresh-token-google');
    expect(result.adAccount.tokenExpiresAt).toEqual(futureDate);
    expect(result.isNewAccount).toBe(true);

    // Verify encrypt was called for both tokens
    expect(mockTokenEncryption.encrypt).toHaveBeenCalledWith('access-token-google');
    expect(mockTokenEncryption.encrypt).toHaveBeenCalledWith('refresh-token-google');
  });

  it('should set refreshToken to null when absent (META)', async () => {
    // META returns null refreshToken by default (oauthTokenResultNoRefresh)
    const result = await useCase.execute(validOAuthInput);

    expect(result.adAccount.refreshToken).toBeNull();

    // Encrypt should only be called once (for the access token)
    expect(mockTokenEncryption.encrypt).toHaveBeenCalledTimes(1);
    expect(mockTokenEncryption.encrypt).toHaveBeenCalledWith('long-lived-token-meta');
  });
});
