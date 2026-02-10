import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TikTokAdsPlatformAdapter } from './TikTokAdsPlatformAdapter';
import { Platform, CampaignStatus } from '@/domain/entities/types';
import type {
  TikTokAdsApiClient,
  TikTokAdvertiserData,
  TikTokCampaignData,
  TikTokInsightData,
} from './TikTokAdsApiClient';

function createMockTikTokApiClient(): {
  [K in keyof Pick<
    TikTokAdsApiClient,
    'getAdvertisers' | 'getCampaigns' | 'getInsights' | 'exchangeCode' | 'refreshToken' | 'validateToken'
  >]: ReturnType<typeof vi.fn>;
} {
  return {
    getAdvertisers: vi.fn(),
    getCampaigns: vi.fn(),
    getInsights: vi.fn(),
    exchangeCode: vi.fn(),
    refreshToken: vi.fn(),
    validateToken: vi.fn(),
  };
}

describe('TikTokAdsPlatformAdapter', () => {
  const appId = 'test-tiktok-app-id';
  let mockClient: ReturnType<typeof createMockTikTokApiClient>;
  let adapter: TikTokAdsPlatformAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockTikTokApiClient();
    adapter = new TikTokAdsPlatformAdapter(
      mockClient as unknown as TikTokAdsApiClient,
      appId,
    );
  });

  // ---------- Properties ----------

  it('should have platform set to Platform.TIKTOK', () => {
    expect(adapter.platform).toBe(Platform.TIKTOK);
  });

  it('should have authType set to oauth', () => {
    expect(adapter.authType).toBe('oauth');
  });

  // ---------- getAuthUrl ----------

  it('should return correct TikTok OAuth URL', () => {
    const redirectUri = 'https://example.com/callback';
    const state = 'random-state-123';

    const url = adapter.getAuthUrl(redirectUri, state);

    expect(url).toBe(
      `https://business-api.tiktok.com/portal/auth?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
    );
  });

  // ---------- exchangeCodeForToken ----------

  it('should delegate exchangeCodeForToken to tikTokApiClient.exchangeCode and return TokenExchangeResult with refreshToken', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    mockClient.exchangeCode.mockResolvedValueOnce({
      accessToken: 'tiktok-access-token',
      refreshToken: 'tiktok-refresh-token',
      expiresIn: 86400,
      refreshTokenExpiresIn: 2592000,
    });

    const result = await adapter.exchangeCodeForToken('auth-code', 'https://example.com/callback');

    expect(mockClient.exchangeCode).toHaveBeenCalledWith('auth-code');
    expect(result).toEqual({
      accessToken: 'tiktok-access-token',
      refreshToken: 'tiktok-refresh-token',
      expiresAt: new Date(now + 86400 * 1000),
    });

    vi.restoreAllMocks();
  });

  // ---------- refreshAccessToken ----------

  it('should delegate refreshAccessToken to tikTokApiClient.refreshToken', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    mockClient.refreshToken.mockResolvedValueOnce({
      accessToken: 'refreshed-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 86400,
      refreshTokenExpiresIn: 2592000,
    });

    const result = await adapter.refreshAccessToken('old-refresh-token');

    expect(mockClient.refreshToken).toHaveBeenCalledWith('old-refresh-token');
    expect(result).toEqual({
      accessToken: 'refreshed-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: new Date(now + 86400 * 1000),
    });

    vi.restoreAllMocks();
  });

  // ---------- validateToken ----------

  it('should delegate validateToken to tikTokApiClient.validateToken', async () => {
    mockClient.validateToken.mockResolvedValueOnce(true);

    const result = await adapter.validateToken('test-token');

    expect(result).toBe(true);
    expect(mockClient.validateToken).toHaveBeenCalledWith('test-token');
  });

  // ---------- getAdAccounts ----------

  it('should map TikTok advertiser data to NormalizedAdAccountData correctly', async () => {
    const advertisers: TikTokAdvertiserData[] = [
      {
        advertiserId: 'adv_123',
        name: 'My TikTok Account',
        currency: 'USD',
        timezone: 'America/New_York',
        status: 'STATUS_ENABLE',
      },
    ];
    mockClient.getAdvertisers.mockResolvedValueOnce(advertisers);

    const result = await adapter.getAdAccounts('access-token');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      externalAccountId: 'adv_123',
      name: 'My TikTok Account',
      currency: 'USD',
      timezone: 'America/New_York',
      isActive: true,
    });
  });

  it('should map STATUS_ENABLE to isActive true and other statuses to false', async () => {
    mockClient.getAdvertisers.mockResolvedValueOnce([
      {
        advertiserId: 'adv_1',
        name: 'Active',
        currency: 'USD',
        timezone: 'UTC',
        status: 'STATUS_ENABLE',
      },
      {
        advertiserId: 'adv_2',
        name: 'Disabled',
        currency: 'USD',
        timezone: 'UTC',
        status: 'STATUS_DISABLE',
      },
    ]);

    const result = await adapter.getAdAccounts('token');

    expect(result[0]!.isActive).toBe(true);
    expect(result[1]!.isActive).toBe(false);
  });

  // ---------- getCampaigns ----------

  it('should map CAMPAIGN_STATUS_ENABLE to CampaignStatus.ACTIVE', async () => {
    const campaigns: TikTokCampaignData[] = [
      {
        campaignId: 'camp_001',
        campaignName: 'Active Campaign',
        operationStatus: 'CAMPAIGN_STATUS_ENABLE',
        objective: 'CONVERSIONS',
        budget: 5000,
        budgetMode: 'BUDGET_MODE_DAY',
      },
    ];
    mockClient.getCampaigns.mockResolvedValueOnce(campaigns);

    const result = await adapter.getCampaigns('token', 'adv_123');

    expect(result[0]).toEqual({
      externalCampaignId: 'camp_001',
      name: 'Active Campaign',
      status: CampaignStatus.ACTIVE,
    });
  });

  it('should map CAMPAIGN_STATUS_DISABLE to CampaignStatus.PAUSED', async () => {
    mockClient.getCampaigns.mockResolvedValueOnce([
      {
        campaignId: 'camp_002',
        campaignName: 'Paused Campaign',
        operationStatus: 'CAMPAIGN_STATUS_DISABLE',
        objective: 'REACH',
        budget: 1000,
        budgetMode: 'BUDGET_MODE_DAY',
      },
    ]);

    const result = await adapter.getCampaigns('token', 'adv_123');

    expect(result[0]!.status).toBe(CampaignStatus.PAUSED);
  });

  it('should map CAMPAIGN_STATUS_DELETE to CampaignStatus.DELETED', async () => {
    mockClient.getCampaigns.mockResolvedValueOnce([
      {
        campaignId: 'camp_003',
        campaignName: 'Deleted Campaign',
        operationStatus: 'CAMPAIGN_STATUS_DELETE',
        objective: 'TRAFFIC',
        budget: 0,
        budgetMode: 'BUDGET_MODE_DAY',
      },
    ]);

    const result = await adapter.getCampaigns('token', 'adv_123');

    expect(result[0]!.status).toBe(CampaignStatus.DELETED);
  });

  it('should map unknown status to CampaignStatus.PAUSED', async () => {
    mockClient.getCampaigns.mockResolvedValueOnce([
      {
        campaignId: 'camp_004',
        campaignName: 'Unknown Status',
        operationStatus: 'CAMPAIGN_STATUS_SOMETHING',
        objective: 'REACH',
        budget: 500,
        budgetMode: 'BUDGET_MODE_DAY',
      },
    ]);

    const result = await adapter.getCampaigns('token', 'adv_123');

    expect(result[0]!.status).toBe(CampaignStatus.PAUSED);
  });

  // ---------- getInsights ----------

  it('should map TikTok insight metrics to NormalizedInsightData', async () => {
    const insights: TikTokInsightData[] = [
      {
        statTimeDay: '2026-01-15',
        spend: '150.50',
        impressions: '10000',
        clicks: '500',
        conversion: '25',
        completePayment: '2500.00',
      },
    ];
    mockClient.getInsights.mockResolvedValueOnce(insights);

    const result = await adapter.getInsights(
      'token',
      'camp_001',
      new Date('2026-01-01'),
      new Date('2026-01-31'),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: new Date('2026-01-15'),
      spend: 150.50,
      impressions: 10000,
      clicks: 500,
      conversions: 25,
      revenue: 2500.00,
    });
  });

  it('should map statTimeDay to Date object', async () => {
    mockClient.getInsights.mockResolvedValueOnce([
      {
        statTimeDay: '2026-03-20',
        spend: '0',
        impressions: '0',
        clicks: '0',
        conversion: '0',
        completePayment: '0',
      },
    ]);

    const result = await adapter.getInsights(
      'token',
      'camp_001',
      new Date('2026-03-01'),
      new Date('2026-03-31'),
    );

    expect(result[0]!.date).toEqual(new Date('2026-03-20'));
    expect(result[0]!.date).toBeInstanceOf(Date);
  });
});
