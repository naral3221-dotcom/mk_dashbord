import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleAdsPlatformAdapter } from './GoogleAdsPlatformAdapter';
import { Platform, CampaignStatus } from '@/domain/entities/types';
import type { GoogleAdsApiClient } from './GoogleAdsApiClient';

function createMockGoogleAdsClient(): {
  [K in keyof GoogleAdsApiClient]: ReturnType<typeof vi.fn>;
} {
  return {
    getAdAccounts: vi.fn(),
    getCampaigns: vi.fn(),
    getInsights: vi.fn(),
    exchangeCode: vi.fn(),
    refreshToken: vi.fn(),
    validateToken: vi.fn(),
  } as unknown as {
    [K in keyof GoogleAdsApiClient]: ReturnType<typeof vi.fn>;
  };
}

describe('GoogleAdsPlatformAdapter', () => {
  const clientId = 'test-client-id';
  let mockClient: ReturnType<typeof createMockGoogleAdsClient>;
  let adapter: GoogleAdsPlatformAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockGoogleAdsClient();
    adapter = new GoogleAdsPlatformAdapter(
      mockClient as unknown as GoogleAdsApiClient,
      clientId,
    );
  });

  // ---------- Properties ----------

  it('should have platform set to Platform.GOOGLE', () => {
    expect(adapter.platform).toBe(Platform.GOOGLE);
  });

  it('should have authType set to oauth', () => {
    expect(adapter.authType).toBe('oauth');
  });

  // ---------- getAuthUrl ----------

  it('should return correct Google OAuth URL with all parameters', () => {
    const redirectUri = 'https://example.com/callback';
    const state = 'random-state-123';

    const url = adapter.getAuthUrl(redirectUri, state);

    expect(url).toContain(
      'https://accounts.google.com/o/oauth2/v2/auth?',
    );
    expect(url).toContain(`client_id=${clientId}`);
    expect(url).toContain(
      `redirect_uri=${encodeURIComponent(redirectUri)}`,
    );
    expect(url).toContain('response_type=code');
    expect(url).toContain(
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/adwords')}`,
    );
    expect(url).toContain(`state=${state}`);
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
  });

  // ---------- exchangeCodeForToken ----------

  it('should delegate exchangeCodeForToken and return TokenExchangeResult with refreshToken', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    mockClient.exchangeCode.mockResolvedValueOnce({
      accessToken: 'google-access-token',
      refreshToken: 'google-refresh-token',
      expiresIn: 3600,
    });

    const result = await adapter.exchangeCodeForToken(
      'auth-code',
      'https://example.com/callback',
    );

    expect(mockClient.exchangeCode).toHaveBeenCalledWith(
      'auth-code',
      'https://example.com/callback',
    );
    expect(result).toEqual({
      accessToken: 'google-access-token',
      refreshToken: 'google-refresh-token',
      expiresAt: new Date(now + 3600 * 1000),
    });

    vi.restoreAllMocks();
  });

  // ---------- refreshAccessToken ----------

  it('should delegate refreshAccessToken correctly', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    mockClient.refreshToken.mockResolvedValueOnce({
      accessToken: 'refreshed-access-token',
      refreshToken: 'existing-refresh-token',
      expiresIn: 3600,
    });

    const result = await adapter.refreshAccessToken(
      'existing-refresh-token',
    );

    expect(mockClient.refreshToken).toHaveBeenCalledWith(
      'existing-refresh-token',
    );
    expect(result).toEqual({
      accessToken: 'refreshed-access-token',
      refreshToken: 'existing-refresh-token',
      expiresAt: new Date(now + 3600 * 1000),
    });

    vi.restoreAllMocks();
  });

  // ---------- validateToken ----------

  it('should delegate validateToken to googleAdsClient.validateToken', async () => {
    mockClient.validateToken.mockResolvedValueOnce(true);

    const result = await adapter.validateToken('test-token');

    expect(result).toBe(true);
    expect(mockClient.validateToken).toHaveBeenCalledWith('test-token');
  });

  // ---------- getAdAccounts ----------

  it('should map Google ad accounts to NormalizedAdAccountData correctly', async () => {
    mockClient.getAdAccounts.mockResolvedValueOnce([
      {
        customerId: '1234567890',
        descriptiveName: 'My Business',
        currencyCode: 'USD',
        timeZone: 'America/New_York',
        manager: false,
      },
    ]);

    const result = await adapter.getAdAccounts('access-token');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      externalAccountId: '1234567890',
      name: 'My Business',
      currency: 'USD',
      timezone: 'America/New_York',
      isActive: true,
    });
  });

  it('should set isActive to false for manager accounts', async () => {
    mockClient.getAdAccounts.mockResolvedValueOnce([
      {
        customerId: '9876543210',
        descriptiveName: 'MCC Account',
        currencyCode: 'KRW',
        timeZone: 'Asia/Seoul',
        manager: true,
      },
    ]);

    const result = await adapter.getAdAccounts('token');

    expect(result[0]!.isActive).toBe(false);
  });

  it('should use fallback name when descriptiveName is empty', async () => {
    mockClient.getAdAccounts.mockResolvedValueOnce([
      {
        customerId: '111',
        descriptiveName: '',
        currencyCode: 'EUR',
        timeZone: 'Europe/Berlin',
        manager: false,
      },
    ]);

    const result = await adapter.getAdAccounts('token');

    expect(result[0]!.name).toBe('Account 111');
  });

  // ---------- getCampaigns ----------

  it('should map ENABLED status to ACTIVE', async () => {
    mockClient.getCampaigns.mockResolvedValueOnce([
      { id: '111', name: 'Active Campaign', status: 'ENABLED' },
    ]);

    const result = await adapter.getCampaigns('token', '1234567890');

    expect(result[0]).toEqual({
      externalCampaignId: '111',
      name: 'Active Campaign',
      status: CampaignStatus.ACTIVE,
    });
  });

  it('should map PAUSED status to PAUSED', async () => {
    mockClient.getCampaigns.mockResolvedValueOnce([
      { id: '222', name: 'Paused Campaign', status: 'PAUSED' },
    ]);

    const result = await adapter.getCampaigns('token', '1234567890');

    expect(result[0]!.status).toBe(CampaignStatus.PAUSED);
  });

  it('should map REMOVED status to DELETED', async () => {
    mockClient.getCampaigns.mockResolvedValueOnce([
      { id: '333', name: 'Removed Campaign', status: 'REMOVED' },
    ]);

    const result = await adapter.getCampaigns('token', '1234567890');

    expect(result[0]!.status).toBe(CampaignStatus.DELETED);
  });

  it('should map unknown status to PAUSED', async () => {
    mockClient.getCampaigns.mockResolvedValueOnce([
      { id: '444', name: 'Unknown Status Campaign', status: 'SOMETHING_ELSE' },
    ]);

    const result = await adapter.getCampaigns('token', '1234567890');

    expect(result[0]!.status).toBe(CampaignStatus.PAUSED);
  });

  it('should remove hyphens from customer ID before API call', async () => {
    mockClient.getCampaigns.mockResolvedValueOnce([]);

    await adapter.getCampaigns('token', '123-456-7890');

    expect(mockClient.getCampaigns).toHaveBeenCalledWith(
      'token',
      '1234567890',
    );
  });

  // ---------- getInsights ----------

  it('should convert cost_micros to dollars (divide by 1,000,000)', async () => {
    mockClient.getInsights.mockResolvedValueOnce([
      {
        date: '2026-01-15',
        costMicros: '1500000',
        impressions: '5000',
        clicks: '250',
        conversions: 10,
        conversionsValue: 500.0,
      },
    ]);

    const result = await adapter.getInsights(
      'token',
      '1234567890:camp_123',
      new Date('2026-01-15'),
      new Date('2026-01-15'),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: new Date('2026-01-15'),
      spend: 1.5,
      impressions: 5000,
      clicks: 250,
      conversions: 10,
      revenue: 500.0,
    });
  });

  it('should parse customerId:campaignId format for insights', async () => {
    mockClient.getInsights.mockResolvedValueOnce([]);

    await adapter.getInsights(
      'token',
      '9876543210:camp_456',
      new Date('2026-01-01'),
      new Date('2026-01-31'),
    );

    expect(mockClient.getInsights).toHaveBeenCalledWith(
      'token',
      'camp_456',
      '9876543210',
      new Date('2026-01-01'),
      new Date('2026-01-31'),
    );
  });

  it('should handle zero cost_micros', async () => {
    mockClient.getInsights.mockResolvedValueOnce([
      {
        date: '2026-03-01',
        costMicros: '0',
        impressions: '0',
        clicks: '0',
        conversions: 0,
        conversionsValue: 0,
      },
    ]);

    const result = await adapter.getInsights(
      'token',
      '111:camp_789',
      new Date('2026-03-01'),
      new Date('2026-03-31'),
    );

    expect(result[0]!.spend).toBe(0);
    expect(result[0]!.impressions).toBe(0);
    expect(result[0]!.clicks).toBe(0);
    expect(result[0]!.conversions).toBe(0);
    expect(result[0]!.revenue).toBe(0);
  });
});
