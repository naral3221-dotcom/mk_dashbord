import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { TikTokAdsApiClient } from './TikTokAdsApiClient';

// Mock axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
    AxiosError: class MockAxiosError extends Error {
      response: unknown;
      constructor(
        message: string,
        _config?: unknown,
        _code?: string,
        _request?: unknown,
        response?: unknown,
      ) {
        super(message);
        this.response = response;
        this.name = 'AxiosError';
      }
    },
  };
});

const mockAxios = axios.create() as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('TikTokAdsApiClient', () => {
  const appId = 'test-tiktok-app-id';
  const appSecret = 'test-tiktok-app-secret';
  const accessToken = 'test-access-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- Constructor ----------

  describe('constructor', () => {
    it('should throw if appId is missing', () => {
      expect(() => new TikTokAdsApiClient('', appSecret)).toThrow(
        'TikTok App ID and App Secret are required',
      );
    });

    it('should throw if appSecret is missing', () => {
      expect(() => new TikTokAdsApiClient(appId, '')).toThrow(
        'TikTok App ID and App Secret are required',
      );
    });

    it('should create instance with valid appId and appSecret', () => {
      const client = new TikTokAdsApiClient(appId, appSecret);
      expect(client).toBeInstanceOf(TikTokAdsApiClient);
    });
  });

  // ---------- getAdvertisers ----------

  describe('getAdvertisers', () => {
    it('should fetch and transform advertiser data', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);

      mockAxios.get.mockResolvedValueOnce({
        data: {
          code: 0,
          message: 'OK',
          data: {
            list: [
              {
                advertiser_id: 'adv_123',
                advertiser_name: 'My TikTok Account',
                currency: 'USD',
                timezone: 'America/New_York',
                status: 'STATUS_ENABLE',
              },
              {
                advertiser_id: 'adv_456',
                advertiser_name: 'Second Account',
                currency: 'KRW',
                timezone: 'Asia/Seoul',
                status: 'STATUS_DISABLE',
              },
            ],
          },
        },
      });

      const result = await client.getAdvertisers(accessToken);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        advertiserId: 'adv_123',
        name: 'My TikTok Account',
        currency: 'USD',
        timezone: 'America/New_York',
        status: 'STATUS_ENABLE',
      });
      expect(result[1]).toEqual({
        advertiserId: 'adv_456',
        name: 'Second Account',
        currency: 'KRW',
        timezone: 'Asia/Seoul',
        status: 'STATUS_DISABLE',
      });

      expect(mockAxios.get).toHaveBeenCalledWith('advertiser/info/', {
        headers: { 'Access-Token': accessToken },
      });
    });

    it('should return empty array when no advertisers', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);

      mockAxios.get.mockResolvedValueOnce({
        data: {
          code: 0,
          message: 'OK',
          data: { list: [] },
        },
      });

      const result = await client.getAdvertisers(accessToken);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  // ---------- getCampaigns ----------

  describe('getCampaigns', () => {
    it('should fetch and transform campaigns with advertiser_id param', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);
      const advertiserId = 'adv_123';

      mockAxios.get.mockResolvedValueOnce({
        data: {
          code: 0,
          message: 'OK',
          data: {
            list: [
              {
                campaign_id: 'camp_001',
                campaign_name: 'TikTok Summer Campaign',
                operation_status: 'CAMPAIGN_STATUS_ENABLE',
                objective: 'CONVERSIONS',
                budget: 5000,
                budget_mode: 'BUDGET_MODE_DAY',
              },
            ],
          },
        },
      });

      const result = await client.getCampaigns(accessToken, advertiserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        campaignId: 'camp_001',
        campaignName: 'TikTok Summer Campaign',
        operationStatus: 'CAMPAIGN_STATUS_ENABLE',
        objective: 'CONVERSIONS',
        budget: 5000,
        budgetMode: 'BUDGET_MODE_DAY',
      });

      expect(mockAxios.get).toHaveBeenCalledWith('campaign/get/', {
        headers: { 'Access-Token': accessToken },
        params: { advertiser_id: advertiserId },
      });
    });
  });

  // ---------- getInsights ----------

  describe('getInsights', () => {
    it('should fetch insights with correct date formatting and response mapping', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);
      const advertiserId = 'adv_123';
      const campaignIds = ['camp_001', 'camp_002'];
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      mockAxios.get.mockResolvedValueOnce({
        data: {
          code: 0,
          message: 'OK',
          data: {
            list: [
              {
                dimensions: { stat_time_day: '2026-01-15' },
                metrics: {
                  spend: '150.50',
                  impressions: '10000',
                  clicks: '500',
                  conversion: '25',
                  complete_payment: '2500.00',
                },
              },
            ],
          },
        },
      });

      const result = await client.getInsights(
        accessToken,
        advertiserId,
        campaignIds,
        startDate,
        endDate,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        statTimeDay: '2026-01-15',
        spend: '150.50',
        impressions: '10000',
        clicks: '500',
        conversion: '25',
        completePayment: '2500.00',
      });

      const callArgs = mockAxios.get.mock.calls[0]!;
      expect(callArgs[0]).toBe('report/integrated/get/');
      const params = (callArgs[1] as { params: Record<string, string> }).params;
      expect(params.advertiser_id).toBe(advertiserId);
      expect(params.start_date).toBe('2026-01-01');
      expect(params.end_date).toBe('2026-01-31');
    });

    it('should handle empty insight results', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);

      mockAxios.get.mockResolvedValueOnce({
        data: {
          code: 0,
          message: 'OK',
          data: { list: [] },
        },
      });

      const result = await client.getInsights(
        accessToken,
        'adv_123',
        ['camp_001'],
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(result).toEqual([]);
    });
  });

  // ---------- exchangeCode ----------

  describe('exchangeCode', () => {
    it('should send correct params and return token result', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);
      const authCode = 'test-auth-code';

      mockAxios.post.mockResolvedValueOnce({
        data: {
          code: 0,
          message: 'OK',
          data: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 86400,
            refresh_token_expires_in: 2592000,
          },
        },
      });

      const result = await client.exchangeCode(authCode);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 86400,
        refreshTokenExpiresIn: 2592000,
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        'oauth2/access_token/',
        {
          app_id: appId,
          secret: appSecret,
          auth_code: authCode,
        },
        {},
      );
    });
  });

  // ---------- refreshToken ----------

  describe('refreshToken', () => {
    it('should send correct params and return refreshed token result', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);
      const oldRefreshToken = 'old-refresh-token';

      mockAxios.post.mockResolvedValueOnce({
        data: {
          code: 0,
          message: 'OK',
          data: {
            access_token: 'refreshed-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 86400,
            refresh_token_expires_in: 2592000,
          },
        },
      });

      const result = await client.refreshToken(oldRefreshToken);

      expect(result).toEqual({
        accessToken: 'refreshed-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 86400,
        refreshTokenExpiresIn: 2592000,
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        'oauth2/refresh_token/',
        {
          app_id: appId,
          secret: appSecret,
          refresh_token: oldRefreshToken,
        },
        {},
      );
    });
  });

  // ---------- validateToken ----------

  describe('validateToken', () => {
    it('should return true for valid token (code 0)', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);

      mockAxios.get.mockResolvedValueOnce({
        data: {
          code: 0,
          message: 'OK',
          data: { display_name: 'Test User' },
        },
      });

      const result = await client.validateToken(accessToken);

      expect(result).toBe(true);
      expect(mockAxios.get).toHaveBeenCalledWith('user/info/', {
        headers: { 'Access-Token': accessToken },
      });
    });

    it('should return false when API call fails', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);

      mockAxios.get.mockRejectedValueOnce(
        new AxiosError('Unauthorized', undefined, undefined, undefined, {
          status: 401,
          data: {
            code: 40100,
            message: 'Invalid access token',
          },
        } as never),
      );

      const result = await client.validateToken('invalid-token');

      expect(result).toBe(false);
    });
  });

  // ---------- Access-Token header ----------

  describe('Access-Token header', () => {
    it('should use Access-Token header (not Bearer scheme)', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);

      mockAxios.get.mockResolvedValueOnce({
        data: {
          code: 0,
          message: 'OK',
          data: { list: [] },
        },
      });

      await client.getAdvertisers(accessToken);

      const callArgs = mockAxios.get.mock.calls[0]!;
      const config = callArgs[1] as { headers: Record<string, string> };
      expect(config.headers['Access-Token']).toBe(accessToken);
      expect(config.headers['Authorization']).toBeUndefined();
    });
  });

  // ---------- Error Handling ----------

  describe('error handling', () => {
    it('should throw TikTok API error when code !== 0', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);

      mockAxios.get.mockResolvedValueOnce({
        data: {
          code: 40001,
          message: 'Invalid parameter',
          data: null,
        },
      });

      await expect(client.getAdvertisers(accessToken)).rejects.toThrow(
        'TikTok API Error: Invalid parameter (code: 40001)',
      );
    });

    it('should throw TikTok API error from AxiosError response', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);

      mockAxios.get.mockRejectedValueOnce(
        new AxiosError('Bad Request', undefined, undefined, undefined, {
          status: 400,
          data: {
            code: 40002,
            message: 'Missing required field',
          },
        } as never),
      );

      await expect(client.getAdvertisers(accessToken)).rejects.toThrow(
        'TikTok API Error: Missing required field (code: 40002)',
      );
    });

    it('should rethrow non-AxiosError errors', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);

      const genericError = new Error('Network failure');
      mockAxios.get.mockRejectedValueOnce(genericError);

      await expect(client.getAdvertisers(accessToken)).rejects.toThrow(
        'Network failure',
      );
    });
  });

  // ---------- Rate Limiting / Retry ----------

  describe('rate limiting and retry', () => {
    it('should retry on 429 status and succeed on subsequent attempt', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);

      // First call: 429 rate limit
      mockAxios.get.mockRejectedValueOnce(
        new AxiosError('Rate limit', undefined, undefined, undefined, {
          status: 429,
          data: {},
        } as never),
      );

      // Second call: success
      mockAxios.get.mockResolvedValueOnce({
        data: {
          code: 0,
          message: 'OK',
          data: { display_name: 'Test User' },
        },
      });

      const result = await client.validateToken(accessToken);

      expect(result).toBe(true);
      expect(mockAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries and throw on repeated 429', async () => {
      const client = new TikTokAdsApiClient(appId, appSecret);

      const rateLimitError = new AxiosError(
        'Rate limit',
        undefined,
        undefined,
        undefined,
        {
          status: 429,
          data: {
            code: 42900,
            message: 'Too many requests',
          },
        } as never,
      );

      // All 3 attempts fail with 429
      mockAxios.get.mockRejectedValueOnce(rateLimitError);
      mockAxios.get.mockRejectedValueOnce(rateLimitError);
      mockAxios.get.mockRejectedValueOnce(rateLimitError);

      await expect(client.getAdvertisers(accessToken)).rejects.toThrow(
        'TikTok API Error: Too many requests (code: 42900)',
      );

      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });
  });
});
