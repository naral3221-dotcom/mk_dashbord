import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NaverAdsPlatformAdapter } from './NaverAdsPlatformAdapter';
import { Platform, CampaignStatus } from '@/domain/entities/types';
import type { NaverAdsApiClient, NaverCustomerInfo, NaverCampaignData, NaverInsightData } from './NaverAdsApiClient';

function createMockNaverApiClient(): {
  [K in keyof Pick<
    NaverAdsApiClient,
    'getCustomerInfo' | 'getCampaigns' | 'getInsights' | 'validateCredentials'
  >]: ReturnType<typeof vi.fn>;
} {
  return {
    getCustomerInfo: vi.fn(),
    getCampaigns: vi.fn(),
    getInsights: vi.fn(),
    validateCredentials: vi.fn(),
  };
}

const validCredentials = JSON.stringify({
  apiKey: 'test-api-key',
  apiSecret: 'test-api-secret',
  customerId: 'test-customer-id',
});

describe('NaverAdsPlatformAdapter', () => {
  let mockClient: ReturnType<typeof createMockNaverApiClient>;
  let adapter: NaverAdsPlatformAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockNaverApiClient();
    adapter = new NaverAdsPlatformAdapter(mockClient as unknown as NaverAdsApiClient);
  });

  // ---------- Properties ----------

  it('should have platform set to Platform.NAVER', () => {
    expect(adapter.platform).toBe(Platform.NAVER);
  });

  it('should have authType set to api_key', () => {
    expect(adapter.authType).toBe('api_key');
  });

  // ---------- getAuthUrl ----------

  it('should throw error for getAuthUrl since Naver uses API Key auth', () => {
    expect(() => adapter.getAuthUrl('https://example.com/callback', 'state')).toThrow(
      'Naver platform uses API Key authentication, not OAuth',
    );
  });

  // ---------- exchangeCodeForToken ----------

  it('should throw error for exchangeCodeForToken since Naver uses API Key auth', async () => {
    await expect(
      adapter.exchangeCodeForToken('code', 'https://example.com/callback'),
    ).rejects.toThrow('Naver platform uses API Key authentication');
  });

  // ---------- refreshAccessToken ----------

  it('should throw error for refreshAccessToken since API keys do not expire', async () => {
    await expect(adapter.refreshAccessToken('any-token')).rejects.toThrow(
      'Naver platform uses API Key authentication, tokens do not expire',
    );
  });

  // ---------- validateToken ----------

  it('should parse JSON credentials and delegate to client validateCredentials', async () => {
    mockClient.validateCredentials.mockResolvedValueOnce(true);

    const result = await adapter.validateToken(validCredentials);

    expect(result).toBe(true);
    expect(mockClient.validateCredentials).toHaveBeenCalledWith(
      'test-api-key',
      'test-api-secret',
      'test-customer-id',
    );
  });

  // ---------- getAdAccounts ----------

  it('should parse JSON credentials and map customer info to NormalizedAdAccountData', async () => {
    const customerInfo: NaverCustomerInfo = {
      customerId: 'test-customer-id',
      name: 'My Naver Account',
      currency: 'KRW',
      timezone: 'Asia/Seoul',
    };
    mockClient.getCustomerInfo.mockResolvedValueOnce(customerInfo);

    const result = await adapter.getAdAccounts(validCredentials);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      externalAccountId: 'test-customer-id',
      name: 'My Naver Account',
      currency: 'KRW',
      timezone: 'Asia/Seoul',
      isActive: true,
    });

    expect(mockClient.getCustomerInfo).toHaveBeenCalledWith(
      'test-api-key',
      'test-api-secret',
      'test-customer-id',
    );
  });

  // ---------- getCampaigns ----------

  it('should map ELIGIBLE status to ACTIVE', async () => {
    const campaigns: NaverCampaignData[] = [
      {
        nccCampaignId: 'cmp-001',
        name: 'Active Campaign',
        campaignTp: 'WEB_SITE',
        userLock: false,
        status: 'ELIGIBLE',
        deliveryMethod: 'STANDARD',
        budget: 100000,
      },
    ];
    mockClient.getCampaigns.mockResolvedValueOnce(campaigns);

    const result = await adapter.getCampaigns(validCredentials, 'test-customer-id');

    expect(result[0]).toEqual({
      externalCampaignId: 'cmp-001',
      name: 'Active Campaign',
      status: CampaignStatus.ACTIVE,
    });
  });

  it('should map PAUSED status to PAUSED', async () => {
    mockClient.getCampaigns.mockResolvedValueOnce([
      {
        nccCampaignId: 'cmp-002',
        name: 'Paused Campaign',
        campaignTp: 'WEB_SITE',
        userLock: false,
        status: 'PAUSED',
        deliveryMethod: 'STANDARD',
        budget: 50000,
      },
    ]);

    const result = await adapter.getCampaigns(validCredentials, 'test-customer-id');

    expect(result[0]!.status).toBe(CampaignStatus.PAUSED);
  });

  it('should map DELETED status to DELETED', async () => {
    mockClient.getCampaigns.mockResolvedValueOnce([
      {
        nccCampaignId: 'cmp-003',
        name: 'Deleted Campaign',
        campaignTp: 'WEB_SITE',
        userLock: false,
        status: 'DELETED',
        deliveryMethod: 'STANDARD',
        budget: 0,
      },
    ]);

    const result = await adapter.getCampaigns(validCredentials, 'test-customer-id');

    expect(result[0]!.status).toBe(CampaignStatus.DELETED);
  });

  it('should map userLock=true to PAUSED regardless of status', async () => {
    mockClient.getCampaigns.mockResolvedValueOnce([
      {
        nccCampaignId: 'cmp-004',
        name: 'Locked Campaign',
        campaignTp: 'WEB_SITE',
        userLock: true,
        status: 'ELIGIBLE',
        deliveryMethod: 'STANDARD',
        budget: 100000,
      },
    ]);

    const result = await adapter.getCampaigns(validCredentials, 'test-customer-id');

    expect(result[0]!.status).toBe(CampaignStatus.PAUSED);
  });

  // ---------- getInsights ----------

  it('should map KRW amounts (integers) correctly', async () => {
    const insights: NaverInsightData[] = [
      {
        date: '2026-01-15',
        impressions: 10000,
        clicks: 500,
        cost: 50000,
        conversions: 25,
        conversionRevenue: 250000,
      },
    ];
    mockClient.getInsights.mockResolvedValueOnce(insights);

    const result = await adapter.getInsights(
      validCredentials,
      'cmp-001',
      new Date('2026-01-01'),
      new Date('2026-01-31'),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: new Date('2026-01-15'),
      spend: 50000,
      impressions: 10000,
      clicks: 500,
      conversions: 25,
      revenue: 250000,
    });
  });

  // ---------- Error Handling ----------

  it('should throw error for invalid JSON accessToken', async () => {
    await expect(adapter.validateToken('not-valid-json')).rejects.toThrow(
      'Invalid Naver credentials format: expected JSON with apiKey, apiSecret, customerId',
    );
  });

  it('should throw error for JSON missing required fields', async () => {
    const incomplete = JSON.stringify({ apiKey: 'key' });

    await expect(adapter.validateToken(incomplete)).rejects.toThrow(
      'Missing required credential fields',
    );
  });
});
