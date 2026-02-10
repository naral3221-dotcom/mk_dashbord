import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { MetaApiClient } from './MetaApiClient';

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

describe('MetaApiClient', () => {
  const appId = 'test-app-id';
  const appSecret = 'test-app-secret';
  const accessToken = 'test-access-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- Constructor ----------

  describe('constructor', () => {
    it('should throw if appId is missing', () => {
      expect(() => new MetaApiClient('', appSecret)).toThrow(
        'META App ID and App Secret are required',
      );
    });

    it('should throw if appSecret is missing', () => {
      expect(() => new MetaApiClient(appId, '')).toThrow(
        'META App ID and App Secret are required',
      );
    });

    it('should create instance with valid appId and appSecret', () => {
      const client = new MetaApiClient(appId, appSecret);
      expect(client).toBeInstanceOf(MetaApiClient);
    });
  });

  // ---------- getAdAccounts ----------

  describe('getAdAccounts', () => {
    it('should fetch and transform ad accounts data', async () => {
      const client = new MetaApiClient(appId, appSecret);

      mockAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'act_123',
              name: 'My Ad Account',
              account_id: '123',
              account_status: 1,
              currency: 'USD',
              timezone_name: 'America/New_York',
            },
            {
              id: 'act_456',
              name: 'Second Account',
              account_id: '456',
              account_status: 2,
              currency: 'KRW',
              timezone_name: 'Asia/Seoul',
            },
          ],
        },
      });

      const result = await client.getAdAccounts(accessToken);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'act_123',
        name: 'My Ad Account',
        accountId: '123',
        accountStatus: 1,
        currency: 'USD',
        timezoneName: 'America/New_York',
      });
      expect(result[1]).toEqual({
        id: 'act_456',
        name: 'Second Account',
        accountId: '456',
        accountStatus: 2,
        currency: 'KRW',
        timezoneName: 'Asia/Seoul',
      });

      expect(mockAxios.get).toHaveBeenCalledWith('/me/adaccounts', {
        params: {
          access_token: accessToken,
          fields: 'id,name,account_id,account_status,currency,timezone_name',
        },
      });
    });

    it('should return empty array when no accounts', async () => {
      const client = new MetaApiClient(appId, appSecret);

      mockAxios.get.mockResolvedValueOnce({
        data: { data: [] },
      });

      const result = await client.getAdAccounts(accessToken);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  // ---------- getCampaigns ----------

  describe('getCampaigns', () => {
    it('should fetch and transform campaigns data', async () => {
      const client = new MetaApiClient(appId, appSecret);
      const adAccountId = 'act_123';

      mockAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'camp_1',
              name: 'Summer Campaign',
              status: 'ACTIVE',
              objective: 'CONVERSIONS',
              daily_budget: '5000',
              lifetime_budget: '150000',
              start_time: '2026-01-01T00:00:00+0000',
              stop_time: '2026-03-31T23:59:59+0000',
            },
          ],
        },
      });

      const result = await client.getCampaigns(accessToken, adAccountId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'camp_1',
        name: 'Summer Campaign',
        status: 'ACTIVE',
        objective: 'CONVERSIONS',
        dailyBudget: '5000',
        lifetimeBudget: '150000',
        startTime: '2026-01-01T00:00:00+0000',
        stopTime: '2026-03-31T23:59:59+0000',
      });

      expect(mockAxios.get).toHaveBeenCalledWith(`/${adAccountId}/campaigns`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time',
        },
      });
    });

    it('should handle campaigns without optional fields', async () => {
      const client = new MetaApiClient(appId, appSecret);

      mockAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'camp_2',
              name: 'Basic Campaign',
              status: 'PAUSED',
              objective: 'REACH',
              // no daily_budget, lifetime_budget, start_time, stop_time
            },
          ],
        },
      });

      const result = await client.getCampaigns(accessToken, 'act_789');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'camp_2',
        name: 'Basic Campaign',
        status: 'PAUSED',
        objective: 'REACH',
        dailyBudget: undefined,
        lifetimeBudget: undefined,
        startTime: undefined,
        stopTime: undefined,
      });
    });
  });

  // ---------- getInsights ----------

  describe('getInsights', () => {
    it('should fetch and transform insights with actions', async () => {
      const client = new MetaApiClient(appId, appSecret);
      const campaignId = 'camp_1';
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      mockAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              date_start: '2026-01-01',
              date_stop: '2026-01-01',
              spend: '100.50',
              impressions: '5000',
              clicks: '250',
              actions: [
                { action_type: 'offsite_conversion', value: '10' },
                { action_type: 'lead', value: '5' },
                { action_type: 'offsite_conversion.fb_pixel_purchase', value: '500.00' },
                { action_type: 'link_click', value: '200' },
              ],
            },
          ],
        },
      });

      const result = await client.getInsights(accessToken, campaignId, startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        dateStart: '2026-01-01',
        dateStop: '2026-01-01',
        spend: '100.50',
        impressions: '5000',
        clicks: '250',
        conversions: '15', // 10 offsite_conversion + 5 lead
        revenue: '500', // 500.00 from fb_pixel_purchase
        actions: [
          { actionType: 'offsite_conversion', value: '10' },
          { actionType: 'lead', value: '5' },
          { actionType: 'offsite_conversion.fb_pixel_purchase', value: '500.00' },
          { actionType: 'link_click', value: '200' },
        ],
      });

      expect(mockAxios.get).toHaveBeenCalledWith(`/${campaignId}/insights`, {
        params: {
          access_token: accessToken,
          fields: 'date_start,date_stop,spend,impressions,clicks,actions',
          time_range: JSON.stringify({
            since: '2026-01-01',
            until: '2026-01-31',
          }),
          time_increment: '1',
          level: 'campaign',
        },
      });
    });

    it('should handle insights without actions (default 0 conversions/revenue)', async () => {
      const client = new MetaApiClient(appId, appSecret);

      mockAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              date_start: '2026-02-01',
              date_stop: '2026-02-01',
              spend: '50.00',
              impressions: '2000',
              clicks: '100',
              // no actions field
            },
          ],
        },
      });

      const result = await client.getInsights(
        accessToken,
        'camp_2',
        new Date('2026-02-01'),
        new Date('2026-02-28'),
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.conversions).toBe('0');
      expect(result[0]!.revenue).toBe('0');
      expect(result[0]!.actions).toBeUndefined();
    });

    it('should format date range correctly', async () => {
      const client = new MetaApiClient(appId, appSecret);

      mockAxios.get.mockResolvedValueOnce({
        data: { data: [] },
      });

      const startDate = new Date('2026-06-15T14:30:00Z');
      const endDate = new Date('2026-07-20T08:00:00Z');

      await client.getInsights(accessToken, 'camp_3', startDate, endDate);

      const callParams = mockAxios.get.mock.calls[0]![1] as {
        params: { time_range: string };
      };
      const timeRange = JSON.parse(callParams.params.time_range) as {
        since: string;
        until: string;
      };

      expect(timeRange.since).toBe('2026-06-15');
      expect(timeRange.until).toBe('2026-07-20');
    });
  });

  // ---------- exchangeToken ----------

  describe('exchangeToken', () => {
    it('should exchange short-lived token for long-lived token', async () => {
      const client = new MetaApiClient(appId, appSecret);
      const shortLivedToken = 'short-lived-token-abc';

      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      mockAxios.get.mockResolvedValueOnce({
        data: {
          access_token: 'long-lived-token-xyz',
          token_type: 'bearer',
          expires_in: 5184000, // 60 days in seconds
        },
      });

      const result = await client.exchangeToken(shortLivedToken);

      expect(result.accessToken).toBe('long-lived-token-xyz');
      expect(result.expiresAt).toEqual(new Date(now + 5184000 * 1000));

      expect(mockAxios.get).toHaveBeenCalledWith('/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLivedToken,
        },
      });

      vi.restoreAllMocks();
    });
  });

  // ---------- validateToken ----------

  describe('validateToken', () => {
    it('should return true for valid token', async () => {
      const client = new MetaApiClient(appId, appSecret);

      mockAxios.get.mockResolvedValueOnce({
        data: { id: '12345' },
      });

      const result = await client.validateToken(accessToken);

      expect(result).toBe(true);
      expect(mockAxios.get).toHaveBeenCalledWith('/me', {
        params: {
          access_token: accessToken,
          fields: 'id',
        },
      });
    });

    it('should return false for invalid token', async () => {
      const client = new MetaApiClient(appId, appSecret);

      mockAxios.get.mockRejectedValueOnce(
        new AxiosError('Unauthorized', undefined, undefined, undefined, {
          status: 401,
          data: {
            error: {
              message: 'Invalid OAuth access token.',
              code: 190,
            },
          },
        } as never),
      );

      const result = await client.validateToken('invalid-token');

      expect(result).toBe(false);
    });
  });

  // ---------- Rate Limiting / Retry ----------

  describe('rate limiting and retry', () => {
    it('should retry on 429 status and succeed on subsequent attempt', async () => {
      const client = new MetaApiClient(appId, appSecret);

      // First call: 429 rate limit
      mockAxios.get.mockRejectedValueOnce(
        new AxiosError('Rate limit', undefined, undefined, undefined, {
          status: 429,
          data: {},
        } as never),
      );

      // Second call: success
      mockAxios.get.mockResolvedValueOnce({
        data: { id: '12345' },
      });

      // Use validateToken as a simple method to test retry
      const result = await client.validateToken(accessToken);

      expect(result).toBe(true);
      expect(mockAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries and throw META error on repeated 429', async () => {
      const client = new MetaApiClient(appId, appSecret);

      const rateLimitError = new AxiosError(
        'Rate limit',
        undefined,
        undefined,
        undefined,
        {
          status: 429,
          data: {
            error: {
              message: 'Too many calls',
              code: 32,
            },
          },
        } as never,
      );

      // All 3 attempts fail with 429
      mockAxios.get.mockRejectedValueOnce(rateLimitError);
      mockAxios.get.mockRejectedValueOnce(rateLimitError);
      mockAxios.get.mockRejectedValueOnce(rateLimitError);

      // validateToken catches errors and returns false, so use getAdAccounts instead
      await expect(client.getAdAccounts(accessToken)).rejects.toThrow(
        'META API Error: Too many calls (code: 32)',
      );

      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });
  });

  // ---------- Error Handling ----------

  describe('error handling', () => {
    it('should throw META API error with message and code', async () => {
      const client = new MetaApiClient(appId, appSecret);

      mockAxios.get.mockRejectedValueOnce(
        new AxiosError('Bad Request', undefined, undefined, undefined, {
          status: 400,
          data: {
            error: {
              message: 'Invalid parameter',
              code: 100,
            },
          },
        } as never),
      );

      await expect(client.getAdAccounts(accessToken)).rejects.toThrow(
        'META API Error: Invalid parameter (code: 100)',
      );
    });

    it('should throw META API error with defaults when message/code missing', async () => {
      const client = new MetaApiClient(appId, appSecret);

      mockAxios.get.mockRejectedValueOnce(
        new AxiosError('Server Error', undefined, undefined, undefined, {
          status: 500,
          data: {
            error: {},
          },
        } as never),
      );

      await expect(client.getCampaigns(accessToken, 'act_1')).rejects.toThrow(
        'META API Error: Unknown error (code: unknown)',
      );
    });

    it('should rethrow non-META errors (non-AxiosError)', async () => {
      const client = new MetaApiClient(appId, appSecret);

      const genericError = new Error('Network failure');
      mockAxios.get.mockRejectedValueOnce(genericError);

      await expect(client.getAdAccounts(accessToken)).rejects.toThrow('Network failure');
    });

    it('should rethrow AxiosError without META error body', async () => {
      const client = new MetaApiClient(appId, appSecret);

      mockAxios.get.mockRejectedValueOnce(
        new AxiosError('Timeout', undefined, undefined, undefined, {
          status: 504,
          data: null,
        } as never),
      );

      await expect(client.getAdAccounts(accessToken)).rejects.toThrow('Timeout');
    });
  });
});
