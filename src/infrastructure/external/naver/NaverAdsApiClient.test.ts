import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { NaverAdsApiClient } from './NaverAdsApiClient';

// Mock axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
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

const mockAxios = axios.create() as unknown as { get: ReturnType<typeof vi.fn> };

describe('NaverAdsApiClient', () => {
  const apiKey = 'test-api-key';
  const apiSecret = 'test-api-secret';
  const customerId = 'test-customer-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- Constructor ----------

  describe('constructor', () => {
    it('should create instance with default baseUrl', () => {
      const client = new NaverAdsApiClient();
      expect(client).toBeInstanceOf(NaverAdsApiClient);
    });

    it('should create instance with custom baseUrl', () => {
      const client = new NaverAdsApiClient('https://custom.api.naver.com');
      expect(client).toBeInstanceOf(NaverAdsApiClient);
    });
  });

  // ---------- Headers ----------

  describe('request headers', () => {
    it('should include X-API-KEY, X-CUSTOMER, X-Signature, and X-Timestamp headers', async () => {
      const client = new NaverAdsApiClient();

      mockAxios.get.mockResolvedValueOnce({
        data: [
          {
            customerId: customerId,
            name: 'Test Customer',
            currency: 'KRW',
            timezone: 'Asia/Seoul',
          },
        ],
      });

      await client.getCustomerInfo(apiKey, apiSecret, customerId);

      const call = mockAxios.get.mock.calls[0]!;
      const config = call[1] as { headers: Record<string, string> };

      expect(config.headers['X-API-KEY']).toBe(apiKey);
      expect(config.headers['X-CUSTOMER']).toBe(customerId);
      expect(config.headers['X-Signature']).toBeDefined();
      expect(config.headers['X-Signature']).not.toBe('');
      expect(config.headers['X-Timestamp']).toBeDefined();
      expect(Number(config.headers['X-Timestamp'])).toBeGreaterThan(0);
    });
  });

  // ---------- getCustomerInfo ----------

  describe('getCustomerInfo', () => {
    it('should fetch and map customer info', async () => {
      const client = new NaverAdsApiClient();

      mockAxios.get.mockResolvedValueOnce({
        data: [
          {
            customerId: customerId,
            name: 'My Naver Account',
            currency: 'KRW',
            timezone: 'Asia/Seoul',
          },
        ],
      });

      const result = await client.getCustomerInfo(apiKey, apiSecret, customerId);

      expect(result).toEqual({
        customerId: customerId,
        name: 'My Naver Account',
        currency: 'KRW',
        timezone: 'Asia/Seoul',
      });

      expect(mockAxios.get).toHaveBeenCalledWith(
        '/ncc/customers',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-KEY': apiKey,
            'X-CUSTOMER': customerId,
          }),
        }),
      );
    });

    it('should throw when no customer data returned', async () => {
      const client = new NaverAdsApiClient();

      mockAxios.get.mockResolvedValueOnce({
        data: [],
      });

      await expect(
        client.getCustomerInfo(apiKey, apiSecret, customerId),
      ).rejects.toThrow('Naver API Error: No customer data returned');
    });
  });

  // ---------- getCampaigns ----------

  describe('getCampaigns', () => {
    it('should fetch and return campaign list', async () => {
      const client = new NaverAdsApiClient();

      mockAxios.get.mockResolvedValueOnce({
        data: [
          {
            nccCampaignId: 'cmp-001',
            name: 'Spring Sale',
            campaignTp: 'WEB_SITE',
            userLock: false,
            status: 'ELIGIBLE',
            deliveryMethod: 'ACCELERATED',
            budget: 100000,
          },
          {
            nccCampaignId: 'cmp-002',
            name: 'Brand Awareness',
            campaignTp: 'BRAND_SEARCH',
            userLock: true,
            status: 'PAUSED',
            deliveryMethod: 'STANDARD',
            budget: 50000,
          },
        ],
      });

      const result = await client.getCampaigns(apiKey, apiSecret, customerId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        nccCampaignId: 'cmp-001',
        name: 'Spring Sale',
        campaignTp: 'WEB_SITE',
        userLock: false,
        status: 'ELIGIBLE',
        deliveryMethod: 'ACCELERATED',
        budget: 100000,
      });
      expect(result[1]).toEqual({
        nccCampaignId: 'cmp-002',
        name: 'Brand Awareness',
        campaignTp: 'BRAND_SEARCH',
        userLock: true,
        status: 'PAUSED',
        deliveryMethod: 'STANDARD',
        budget: 50000,
      });
    });
  });

  // ---------- getInsights ----------

  describe('getInsights', () => {
    it('should fetch insights with formatted dates and map response', async () => {
      const client = new NaverAdsApiClient();
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      mockAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              stat: {
                date: '2026-01-01',
                impCnt: 5000,
                clkCnt: 250,
                salesAmt: 50000,
                ccnt: 10,
                crto: 200000,
              },
            },
            {
              stat: {
                date: '2026-01-02',
                impCnt: 6000,
                clkCnt: 300,
                salesAmt: 60000,
                ccnt: 15,
                crto: 300000,
              },
            },
          ],
        },
      });

      const result = await client.getInsights(
        apiKey,
        apiSecret,
        customerId,
        'cmp-001',
        startDate,
        endDate,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2026-01-01',
        impressions: 5000,
        clicks: 250,
        cost: 50000,
        conversions: 10,
        conversionRevenue: 200000,
      });
      expect(result[1]).toEqual({
        date: '2026-01-02',
        impressions: 6000,
        clicks: 300,
        cost: 60000,
        conversions: 15,
        conversionRevenue: 300000,
      });

      const callParams = mockAxios.get.mock.calls[0]![1] as {
        params: { timeRange: string };
      };
      const timeRange = JSON.parse(callParams.params.timeRange) as {
        since: string;
        until: string;
      };
      expect(timeRange.since).toBe('2026-01-01');
      expect(timeRange.until).toBe('2026-01-31');
    });

    it('should handle empty insights data', async () => {
      const client = new NaverAdsApiClient();

      mockAxios.get.mockResolvedValueOnce({
        data: { data: [] },
      });

      const result = await client.getInsights(
        apiKey,
        apiSecret,
        customerId,
        'cmp-001',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(result).toEqual([]);
    });
  });

  // ---------- validateCredentials ----------

  describe('validateCredentials', () => {
    it('should return true when credentials are valid', async () => {
      const client = new NaverAdsApiClient();

      mockAxios.get.mockResolvedValueOnce({
        data: [
          {
            customerId: customerId,
            name: 'Test',
            currency: 'KRW',
            timezone: 'Asia/Seoul',
          },
        ],
      });

      const result = await client.validateCredentials(apiKey, apiSecret, customerId);

      expect(result).toBe(true);
    });

    it('should return false when credentials are invalid', async () => {
      const client = new NaverAdsApiClient();

      mockAxios.get.mockRejectedValueOnce(
        new AxiosError('Unauthorized', undefined, undefined, undefined, {
          status: 401,
          data: {
            title: 'Unauthorized',
            detail: 'Invalid API key',
            status: 401,
          },
        } as never),
      );

      const result = await client.validateCredentials(apiKey, apiSecret, customerId);

      expect(result).toBe(false);
    });
  });

  // ---------- Rate Limiting / Retry ----------

  describe('rate limiting and retry', () => {
    it('should retry on 429 status and succeed on subsequent attempt', async () => {
      const client = new NaverAdsApiClient();

      // First call: 429 rate limit
      mockAxios.get.mockRejectedValueOnce(
        new AxiosError('Rate limit', undefined, undefined, undefined, {
          status: 429,
          data: {},
        } as never),
      );

      // Second call: success
      mockAxios.get.mockResolvedValueOnce({
        data: [
          {
            customerId: customerId,
            name: 'Test',
            currency: 'KRW',
            timezone: 'Asia/Seoul',
          },
        ],
      });

      const result = await client.validateCredentials(apiKey, apiSecret, customerId);

      expect(result).toBe(true);
      expect(mockAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries and throw error on repeated 429', async () => {
      const client = new NaverAdsApiClient();

      const rateLimitError = new AxiosError(
        'Rate limit',
        undefined,
        undefined,
        undefined,
        {
          status: 429,
          data: {
            title: 'Too Many Requests',
            detail: 'Rate limit exceeded',
            status: 429,
          },
        } as never,
      );

      // All 3 attempts fail with 429
      mockAxios.get.mockRejectedValueOnce(rateLimitError);
      mockAxios.get.mockRejectedValueOnce(rateLimitError);
      mockAxios.get.mockRejectedValueOnce(rateLimitError);

      await expect(
        client.getCampaigns(apiKey, apiSecret, customerId),
      ).rejects.toThrow('Naver API Error: Too Many Requests');

      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });
  });

  // ---------- Error Handling ----------

  describe('error handling', () => {
    it('should throw Naver API error with title and detail', async () => {
      const client = new NaverAdsApiClient();

      mockAxios.get.mockRejectedValueOnce(
        new AxiosError('Bad Request', undefined, undefined, undefined, {
          status: 400,
          data: {
            title: 'InvalidParameter',
            detail: 'Campaign ID is invalid',
            status: 400,
          },
        } as never),
      );

      await expect(
        client.getCampaigns(apiKey, apiSecret, customerId),
      ).rejects.toThrow(
        'Naver API Error: InvalidParameter - Campaign ID is invalid (status: 400)',
      );
    });

    it('should rethrow non-Naver errors (non-AxiosError)', async () => {
      const client = new NaverAdsApiClient();

      const genericError = new Error('Network failure');
      mockAxios.get.mockRejectedValueOnce(genericError);

      await expect(
        client.getCampaigns(apiKey, apiSecret, customerId),
      ).rejects.toThrow('Network failure');
    });
  });
});
