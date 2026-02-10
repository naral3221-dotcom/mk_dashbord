import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { GoogleAdsApiClient } from './GoogleAdsApiClient';

// Mock axios
vi.mock('axios', () => {
  const mockMainInstance = {
    get: vi.fn(),
    post: vi.fn(),
  };
  const mockOauthInstance = {
    get: vi.fn(),
    post: vi.fn(),
  };

  let callCount = 0;
  return {
    default: {
      create: vi.fn(() => {
        callCount++;
        // First call is the main Google Ads client, second is the OAuth client
        if (callCount % 2 === 1) return mockMainInstance;
        return mockOauthInstance;
      }),
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

// Helper to get mock instances - main client is created first, oauth second
function getMockInstances() {
  const calls = (axios.create as ReturnType<typeof vi.fn>).mock.results;
  const mainClient = calls[calls.length - 2]!.value as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };
  const oauthClient = calls[calls.length - 1]!.value as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };
  return { mainClient, oauthClient };
}

describe('GoogleAdsApiClient', () => {
  const clientId = 'test-client-id';
  const clientSecret = 'test-client-secret';
  const developerToken = 'test-developer-token';
  const accessToken = 'test-access-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- Constructor ----------

  describe('constructor', () => {
    it('should throw if clientId is missing', () => {
      expect(
        () => new GoogleAdsApiClient('', clientSecret, developerToken),
      ).toThrow(
        'Google Ads Client ID, Client Secret, and Developer Token are required',
      );
    });

    it('should throw if clientSecret is missing', () => {
      expect(
        () => new GoogleAdsApiClient(clientId, '', developerToken),
      ).toThrow(
        'Google Ads Client ID, Client Secret, and Developer Token are required',
      );
    });

    it('should throw if developerToken is missing', () => {
      expect(
        () => new GoogleAdsApiClient(clientId, clientSecret, ''),
      ).toThrow(
        'Google Ads Client ID, Client Secret, and Developer Token are required',
      );
    });

    it('should create instance with valid credentials', () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      expect(client).toBeInstanceOf(GoogleAdsApiClient);
    });
  });

  // ---------- getAdAccounts ----------

  describe('getAdAccounts', () => {
    it('should fetch and map ad accounts correctly', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { mainClient } = getMockInstances();

      // Step 1: listAccessibleCustomers
      mainClient.get.mockResolvedValueOnce({
        data: {
          resourceNames: ['customers/1234567890', 'customers/9876543210'],
        },
      });

      // Step 2: customer details
      mainClient.get.mockResolvedValueOnce({
        data: {
          resourceName: 'customers/1234567890',
          id: '1234567890',
          descriptiveName: 'My Business',
          currencyCode: 'USD',
          timeZone: 'America/New_York',
          manager: false,
        },
      });

      mainClient.get.mockResolvedValueOnce({
        data: {
          resourceName: 'customers/9876543210',
          id: '9876543210',
          descriptiveName: 'Second Business',
          currencyCode: 'KRW',
          timeZone: 'Asia/Seoul',
          manager: true,
        },
      });

      const result = await client.getAdAccounts(accessToken);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        customerId: '1234567890',
        descriptiveName: 'My Business',
        currencyCode: 'USD',
        timeZone: 'America/New_York',
        manager: false,
      });
      expect(result[1]).toEqual({
        customerId: '9876543210',
        descriptiveName: 'Second Business',
        currencyCode: 'KRW',
        timeZone: 'Asia/Seoul',
        manager: true,
      });

      expect(mainClient.get).toHaveBeenCalledWith(
        '/customers:listAccessibleCustomers',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': developerToken,
          },
          params: undefined,
        },
      );
    });

    it('should skip inaccessible accounts and continue', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { mainClient } = getMockInstances();

      mainClient.get.mockResolvedValueOnce({
        data: {
          resourceNames: ['customers/111', 'customers/222'],
        },
      });

      // First account throws error
      mainClient.get.mockRejectedValueOnce(new Error('Access denied'));

      // Second account succeeds
      mainClient.get.mockResolvedValueOnce({
        data: {
          id: '222',
          descriptiveName: 'Accessible Account',
          currencyCode: 'EUR',
          timeZone: 'Europe/Berlin',
          manager: false,
        },
      });

      const result = await client.getAdAccounts(accessToken);

      expect(result).toHaveLength(1);
      expect(result[0]!.customerId).toBe('222');
    });

    it('should return empty array when no accounts', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { mainClient } = getMockInstances();

      mainClient.get.mockResolvedValueOnce({
        data: { resourceNames: [] },
      });

      const result = await client.getAdAccounts(accessToken);

      expect(result).toEqual([]);
    });
  });

  // ---------- getCampaigns ----------

  describe('getCampaigns', () => {
    it('should use searchStream with correct GAQL query', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { mainClient } = getMockInstances();

      mainClient.post.mockResolvedValueOnce({
        data: [
          {
            results: [
              {
                campaign: {
                  id: '111',
                  name: 'Summer Sale',
                  status: 'ENABLED',
                },
              },
              {
                campaign: {
                  id: '222',
                  name: 'Brand Awareness',
                  status: 'PAUSED',
                },
              },
            ],
          },
        ],
      });

      const result = await client.getCampaigns(accessToken, '123-456-7890');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '111',
        name: 'Summer Sale',
        status: 'ENABLED',
      });
      expect(result[1]).toEqual({
        id: '222',
        name: 'Brand Awareness',
        status: 'PAUSED',
      });

      // Should remove hyphens from customer ID
      expect(mainClient.post).toHaveBeenCalledWith(
        '/customers/1234567890/googleAds:searchStream',
        {
          query:
            'SELECT campaign.id, campaign.name, campaign.status FROM campaign ORDER BY campaign.id',
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': developerToken,
          },
        },
      );
    });

    it('should return empty array when no campaigns', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { mainClient } = getMockInstances();

      mainClient.post.mockResolvedValueOnce({
        data: [{ results: [] }],
      });

      const result = await client.getCampaigns(accessToken, '1234567890');

      expect(result).toEqual([]);
    });

    it('should handle empty searchStream response', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { mainClient } = getMockInstances();

      mainClient.post.mockResolvedValueOnce({
        data: [{}],
      });

      const result = await client.getCampaigns(accessToken, '1234567890');

      expect(result).toEqual([]);
    });
  });

  // ---------- getInsights ----------

  describe('getInsights', () => {
    it('should fetch insights and return raw data with costMicros', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { mainClient } = getMockInstances();

      mainClient.post.mockResolvedValueOnce({
        data: [
          {
            results: [
              {
                segments: { date: '2026-01-15' },
                metrics: {
                  costMicros: '1500000',
                  impressions: '5000',
                  clicks: '250',
                  conversions: 10,
                  conversionsValue: 500.0,
                },
              },
              {
                segments: { date: '2026-01-16' },
                metrics: {
                  costMicros: '2000000',
                  impressions: '8000',
                  clicks: '400',
                  conversions: 15,
                  conversionsValue: 750.0,
                },
              },
            ],
          },
        ],
      });

      const result = await client.getInsights(
        accessToken,
        'camp_123',
        '1234567890',
        new Date('2026-01-15'),
        new Date('2026-01-16'),
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2026-01-15',
        costMicros: '1500000',
        impressions: '5000',
        clicks: '250',
        conversions: 10,
        conversionsValue: 500.0,
      });
      expect(result[1]).toEqual({
        date: '2026-01-16',
        costMicros: '2000000',
        impressions: '8000',
        clicks: '400',
        conversions: 15,
        conversionsValue: 750.0,
      });
    });

    it('should format date range correctly in query', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { mainClient } = getMockInstances();

      mainClient.post.mockResolvedValueOnce({
        data: [{ results: [] }],
      });

      await client.getInsights(
        accessToken,
        'camp_456',
        '111-222-3333',
        new Date('2026-06-15T14:30:00Z'),
        new Date('2026-07-20T08:00:00Z'),
      );

      const callData = mainClient.post.mock.calls[0]![1] as { query: string };
      expect(callData.query).toContain("'2026-06-15'");
      expect(callData.query).toContain("'2026-07-20'");
      // Hyphens should be removed from customer ID
      expect(mainClient.post.mock.calls[0]![0]).toBe(
        '/customers/1112223333/googleAds:searchStream',
      );
    });

    it('should default to 0 for missing metric values', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { mainClient } = getMockInstances();

      mainClient.post.mockResolvedValueOnce({
        data: [
          {
            results: [
              {
                segments: { date: '2026-02-01' },
                metrics: {
                  // costMicros, impressions, clicks not set
                  conversions: 0,
                  conversionsValue: 0,
                },
              },
            ],
          },
        ],
      });

      const result = await client.getInsights(
        accessToken,
        'camp_789',
        '111',
        new Date('2026-02-01'),
        new Date('2026-02-28'),
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.costMicros).toBe('0');
      expect(result[0]!.impressions).toBe('0');
      expect(result[0]!.clicks).toBe('0');
      expect(result[0]!.conversions).toBe(0);
      expect(result[0]!.conversionsValue).toBe(0);
    });
  });

  // ---------- exchangeCode ----------

  describe('exchangeCode', () => {
    it('should send correct params and return token result', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { oauthClient } = getMockInstances();

      oauthClient.post.mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        },
      });

      const result = await client.exchangeCode(
        'auth-code-123',
        'https://example.com/callback',
      );

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      });

      expect(oauthClient.post).toHaveBeenCalledWith('/token', {
        code: 'auth-code-123',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'https://example.com/callback',
        grant_type: 'authorization_code',
      });
    });

    it('should return null refreshToken when not provided', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { oauthClient } = getMockInstances();

      oauthClient.post.mockResolvedValueOnce({
        data: {
          access_token: 'access-token-only',
          expires_in: 3600,
        },
      });

      const result = await client.exchangeCode('code', 'https://example.com');

      expect(result.refreshToken).toBeNull();
    });
  });

  // ---------- refreshToken ----------

  describe('refreshToken', () => {
    it('should send correct params and return refreshed token', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { oauthClient } = getMockInstances();

      oauthClient.post.mockResolvedValueOnce({
        data: {
          access_token: 'refreshed-access-token',
          expires_in: 3600,
        },
      });

      const result = await client.refreshToken('existing-refresh-token');

      expect(result).toEqual({
        accessToken: 'refreshed-access-token',
        refreshToken: 'existing-refresh-token',
        expiresIn: 3600,
      });

      expect(oauthClient.post).toHaveBeenCalledWith('/token', {
        refresh_token: 'existing-refresh-token',
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      });
    });
  });

  // ---------- validateToken ----------

  describe('validateToken', () => {
    it('should return true for valid token with positive expires_in', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { oauthClient } = getMockInstances();

      oauthClient.get.mockResolvedValueOnce({
        data: {
          audience: clientId,
          expires_in: 3500,
        },
      });

      const result = await client.validateToken('valid-token');

      expect(result).toBe(true);
      expect(oauthClient.get).toHaveBeenCalledWith('/tokeninfo', {
        params: { access_token: 'valid-token' },
      });
    });

    it('should return false for expired token', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { oauthClient } = getMockInstances();

      oauthClient.get.mockResolvedValueOnce({
        data: {
          audience: clientId,
          expires_in: 0,
        },
      });

      const result = await client.validateToken('expired-token');

      expect(result).toBe(false);
    });

    it('should return false when token validation throws error', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { oauthClient } = getMockInstances();

      oauthClient.get.mockRejectedValueOnce(new Error('Invalid token'));

      const result = await client.validateToken('invalid-token');

      expect(result).toBe(false);
    });
  });

  // ---------- Rate Limiting / Retry ----------

  describe('rate limiting and retry', () => {
    it('should retry on 429 status and succeed on subsequent attempt', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { mainClient } = getMockInstances();

      // First call: 429 rate limit
      mainClient.get.mockRejectedValueOnce(
        new AxiosError('Rate limit', undefined, undefined, undefined, {
          status: 429,
          data: {},
        } as never),
      );

      // Second call: success
      mainClient.get.mockResolvedValueOnce({
        data: { resourceNames: [] },
      });

      const result = await client.getAdAccounts(accessToken);

      expect(result).toEqual([]);
      expect(mainClient.get).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries and throw Google Ads error on repeated 429', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { mainClient } = getMockInstances();

      const rateLimitError = new AxiosError(
        'Rate limit',
        undefined,
        undefined,
        undefined,
        {
          status: 429,
          data: {
            error: {
              message: 'Too many requests',
              code: 429,
            },
          },
        } as never,
      );

      // All 3 attempts fail with 429
      mainClient.get.mockRejectedValueOnce(rateLimitError);
      mainClient.get.mockRejectedValueOnce(rateLimitError);
      mainClient.get.mockRejectedValueOnce(rateLimitError);

      await expect(client.getAdAccounts(accessToken)).rejects.toThrow(
        'Google Ads API Error: Too many requests (code: 429)',
      );

      expect(mainClient.get).toHaveBeenCalledTimes(3);
    });
  });

  // ---------- Error Handling ----------

  describe('error handling', () => {
    it('should throw Google Ads API error with message and code', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { mainClient } = getMockInstances();

      mainClient.get.mockRejectedValueOnce(
        new AxiosError('Bad Request', undefined, undefined, undefined, {
          status: 400,
          data: {
            error: {
              message: 'Invalid customer ID',
              code: 400,
            },
          },
        } as never),
      );

      await expect(client.getAdAccounts(accessToken)).rejects.toThrow(
        'Google Ads API Error: Invalid customer ID (code: 400)',
      );
    });

    it('should throw Google Ads API error with defaults when message/code missing', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { mainClient } = getMockInstances();

      mainClient.get.mockRejectedValueOnce(
        new AxiosError('Server Error', undefined, undefined, undefined, {
          status: 500,
          data: {
            error: {},
          },
        } as never),
      );

      await expect(client.getAdAccounts(accessToken)).rejects.toThrow(
        'Google Ads API Error: Unknown error (code: unknown)',
      );
    });

    it('should rethrow non-Google errors (non-AxiosError)', async () => {
      const client = new GoogleAdsApiClient(
        clientId,
        clientSecret,
        developerToken,
      );
      const { mainClient } = getMockInstances();

      const genericError = new Error('Network failure');
      mainClient.get.mockRejectedValueOnce(genericError);

      await expect(client.getAdAccounts(accessToken)).rejects.toThrow(
        'Network failure',
      );
    });
  });
});
