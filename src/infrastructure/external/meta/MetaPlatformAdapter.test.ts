import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetaPlatformAdapter } from './MetaPlatformAdapter';
import { Platform, CampaignStatus } from '@/domain/entities/types';
import type { IMetaApiClient, MetaAdAccountData, MetaCampaignData, MetaInsightData } from '@/domain/services/IMetaApiClient';

type MockedMetaApiClient = {
  [K in keyof IMetaApiClient]: ReturnType<typeof vi.fn>;
};

function createMockMetaApiClient(): MockedMetaApiClient {
  return {
    getAdAccounts: vi.fn(),
    getCampaigns: vi.fn(),
    getInsights: vi.fn(),
    exchangeToken: vi.fn(),
    validateToken: vi.fn(),
  };
}

describe('MetaPlatformAdapter', () => {
  const appId = 'test-app-id';
  const appSecret = 'test-app-secret';
  let mockClient: MockedMetaApiClient;
  let adapter: MetaPlatformAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockMetaApiClient();
    adapter = new MetaPlatformAdapter(mockClient as unknown as IMetaApiClient, appId, appSecret);
  });

  // ---------- Properties ----------

  it('should have platform set to Platform.META', () => {
    expect(adapter.platform).toBe(Platform.META);
  });

  it('should have authType set to oauth', () => {
    expect(adapter.authType).toBe('oauth');
  });

  // ---------- getAuthUrl ----------

  it('should return correct Facebook OAuth URL', () => {
    const redirectUri = 'https://example.com/callback';
    const state = 'random-state-123';

    const url = adapter.getAuthUrl(redirectUri, state);

    expect(url).toBe(
      `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=ads_management,ads_read`,
    );
  });

  // ---------- exchangeCodeForToken ----------

  it('should delegate exchangeCodeForToken to metaApiClient.exchangeToken and return TokenExchangeResult with refreshToken null', async () => {
    const expiresAt = new Date('2026-04-01');
    mockClient.exchangeToken.mockResolvedValueOnce({
      accessToken: 'long-lived-token',
      expiresAt,
    });

    const result = await adapter.exchangeCodeForToken('auth-code', 'https://example.com/callback');

    expect(mockClient.exchangeToken).toHaveBeenCalledWith('auth-code');
    expect(result).toEqual({
      accessToken: 'long-lived-token',
      refreshToken: null,
      expiresAt,
    });
  });

  // ---------- refreshAccessToken ----------

  it('should throw error for refreshAccessToken since META does not support refresh tokens', async () => {
    await expect(adapter.refreshAccessToken('any-token')).rejects.toThrow(
      'META platform does not support token refresh',
    );
  });

  // ---------- validateToken ----------

  it('should delegate validateToken to metaApiClient.validateToken', async () => {
    mockClient.validateToken.mockResolvedValueOnce(true);

    const result = await adapter.validateToken('test-token');

    expect(result).toBe(true);
    expect(mockClient.validateToken).toHaveBeenCalledWith('test-token');
  });

  // ---------- getAdAccounts ----------

  it('should map MetaAdAccountData to NormalizedAdAccountData correctly', async () => {
    const metaAccounts: MetaAdAccountData[] = [
      {
        id: 'act_123',
        name: 'My Account',
        accountId: '123',
        accountStatus: 1,
        currency: 'USD',
        timezoneName: 'America/New_York',
      },
    ];
    mockClient.getAdAccounts.mockResolvedValueOnce(metaAccounts);

    const result = await adapter.getAdAccounts('access-token');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      externalAccountId: '123',
      name: 'My Account',
      currency: 'USD',
      timezone: 'America/New_York',
      isActive: true,
    });
  });

  it('should map accountStatus 1 to isActive true', async () => {
    mockClient.getAdAccounts.mockResolvedValueOnce([
      {
        id: 'act_1',
        name: 'Active Account',
        accountId: '1',
        accountStatus: 1,
        currency: 'KRW',
        timezoneName: 'Asia/Seoul',
      },
    ]);

    const result = await adapter.getAdAccounts('token');

    expect(result[0]!.isActive).toBe(true);
  });

  it('should map accountStatus != 1 to isActive false', async () => {
    mockClient.getAdAccounts.mockResolvedValueOnce([
      {
        id: 'act_2',
        name: 'Disabled Account',
        accountId: '2',
        accountStatus: 2,
        currency: 'EUR',
        timezoneName: 'Europe/Berlin',
      },
    ]);

    const result = await adapter.getAdAccounts('token');

    expect(result[0]!.isActive).toBe(false);
  });

  // ---------- getCampaigns ----------

  it('should add act_ prefix to externalAccountId when calling metaApiClient.getCampaigns', async () => {
    mockClient.getCampaigns.mockResolvedValueOnce([]);

    await adapter.getCampaigns('token', '12345');

    expect(mockClient.getCampaigns).toHaveBeenCalledWith('token', 'act_12345');
  });

  it('should map ACTIVE status correctly', async () => {
    const metaCampaigns: MetaCampaignData[] = [
      {
        id: 'camp_1',
        name: 'Active Campaign',
        status: 'ACTIVE',
        objective: 'CONVERSIONS',
      },
    ];
    mockClient.getCampaigns.mockResolvedValueOnce(metaCampaigns);

    const result = await adapter.getCampaigns('token', '123');

    expect(result[0]).toEqual({
      externalCampaignId: 'camp_1',
      name: 'Active Campaign',
      status: CampaignStatus.ACTIVE,
    });
  });

  it('should map PAUSED status correctly', async () => {
    mockClient.getCampaigns.mockResolvedValueOnce([
      {
        id: 'camp_2',
        name: 'Paused Campaign',
        status: 'PAUSED',
        objective: 'REACH',
      },
    ]);

    const result = await adapter.getCampaigns('token', '123');

    expect(result[0]!.status).toBe(CampaignStatus.PAUSED);
  });

  it('should map unknown status to PAUSED', async () => {
    mockClient.getCampaigns.mockResolvedValueOnce([
      {
        id: 'camp_3',
        name: 'Unknown Status Campaign',
        status: 'SOMETHING_ELSE',
        objective: 'REACH',
      },
    ]);

    const result = await adapter.getCampaigns('token', '123');

    expect(result[0]!.status).toBe(CampaignStatus.PAUSED);
  });

  // ---------- getInsights ----------

  it('should map string values to numbers correctly', async () => {
    const metaInsights: MetaInsightData[] = [
      {
        dateStart: '2026-01-15',
        dateStop: '2026-01-15',
        spend: '150.75',
        impressions: '10000',
        clicks: '500',
        conversions: '25',
        revenue: '2500.50',
      },
    ];
    mockClient.getInsights.mockResolvedValueOnce(metaInsights);

    const result = await adapter.getInsights(
      'token',
      'camp_1',
      new Date('2026-01-01'),
      new Date('2026-01-31'),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: new Date('2026-01-15'),
      spend: 150.75,
      impressions: 10000,
      clicks: 500,
      conversions: 25,
      revenue: 2500.50,
    });
  });

  it('should map dateStart to Date object', async () => {
    mockClient.getInsights.mockResolvedValueOnce([
      {
        dateStart: '2026-03-20',
        dateStop: '2026-03-20',
        spend: '0',
        impressions: '0',
        clicks: '0',
        conversions: '0',
        revenue: '0',
      },
    ]);

    const result = await adapter.getInsights(
      'token',
      'camp_1',
      new Date('2026-03-01'),
      new Date('2026-03-31'),
    );

    expect(result[0]!.date).toEqual(new Date('2026-03-20'));
    expect(result[0]!.date).toBeInstanceOf(Date);
  });
});
