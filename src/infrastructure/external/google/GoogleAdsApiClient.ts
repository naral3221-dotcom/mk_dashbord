import axios, { AxiosInstance, AxiosError } from 'axios';

export interface GoogleAdAccountRaw {
  readonly customerId: string;
  readonly descriptiveName: string;
  readonly currencyCode: string;
  readonly timeZone: string;
  readonly manager: boolean;
}

export interface GoogleCampaignRaw {
  readonly id: string;
  readonly name: string;
  readonly status: string;
}

export interface GoogleInsightRaw {
  readonly date: string;
  readonly costMicros: string;
  readonly impressions: string;
  readonly clicks: string;
  readonly conversions: number;
  readonly conversionsValue: number;
}

export interface GoogleTokenResult {
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly expiresIn: number;
}

export class GoogleAdsApiClient {
  private readonly client: AxiosInstance;
  private readonly oauthClient: AxiosInstance;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly developerToken: string;

  constructor(clientId: string, clientSecret: string, developerToken: string) {
    if (!clientId || !clientSecret || !developerToken) {
      throw new Error(
        'Google Ads Client ID, Client Secret, and Developer Token are required',
      );
    }

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.developerToken = developerToken;

    this.client = axios.create({
      baseURL: 'https://googleads.googleapis.com/v17',
      timeout: 30000,
    });

    this.oauthClient = axios.create({
      baseURL: 'https://oauth2.googleapis.com',
      timeout: 30000,
    });
  }

  async getAdAccounts(accessToken: string): Promise<GoogleAdAccountRaw[]> {
    // Step 1: List accessible customer IDs
    const listResponse = await this.requestWithRetry<{
      resourceNames: string[];
    }>(
      '/customers:listAccessibleCustomers',
      {
        headers: this.buildHeaders(accessToken),
      },
      'get',
    );

    const customerIds = listResponse.resourceNames.map((name) =>
      name.replace('customers/', ''),
    );

    // Step 2: Get details for each customer
    const accounts: GoogleAdAccountRaw[] = [];

    for (const customerId of customerIds) {
      try {
        const detail = await this.requestWithRetry<{
          resourceName: string;
          id: string;
          descriptiveName?: string;
          currencyCode?: string;
          timeZone?: string;
          manager?: boolean;
        }>(
          `/customers/${customerId}`,
          {
            headers: this.buildHeaders(accessToken),
          },
          'get',
        );

        accounts.push({
          customerId: detail.id || customerId,
          descriptiveName: detail.descriptiveName || '',
          currencyCode: detail.currencyCode || 'USD',
          timeZone: detail.timeZone || 'America/New_York',
          manager: detail.manager || false,
        });
      } catch {
        // Skip accounts we cannot access
        continue;
      }
    }

    return accounts;
  }

  async getCampaigns(
    accessToken: string,
    customerId: string,
  ): Promise<GoogleCampaignRaw[]> {
    const cleanCustomerId = customerId.replace(/-/g, '');

    const query =
      'SELECT campaign.id, campaign.name, campaign.status FROM campaign ORDER BY campaign.id';

    const response = await this.requestWithRetry<
      Array<{
        results?: Array<{
          campaign: {
            id: string;
            name: string;
            status: string;
          };
        }>;
      }>
    >(
      `/customers/${cleanCustomerId}/googleAds:searchStream`,
      {
        headers: this.buildHeaders(accessToken),
        data: { query },
      },
      'post',
    );

    const results = response[0]?.results || [];
    return results.map((row) => ({
      id: row.campaign.id,
      name: row.campaign.name,
      status: row.campaign.status,
    }));
  }

  async getInsights(
    accessToken: string,
    campaignId: string,
    customerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<GoogleInsightRaw[]> {
    const cleanCustomerId = customerId.replace(/-/g, '');
    const startStr = this.formatDate(startDate);
    const endStr = this.formatDate(endDate);

    const query = `SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE campaign.id = ${campaignId} AND segments.date BETWEEN '${startStr}' AND '${endStr}' ORDER BY segments.date`;

    const response = await this.requestWithRetry<
      Array<{
        results?: Array<{
          segments: { date: string };
          metrics: {
            costMicros: string;
            impressions: string;
            clicks: string;
            conversions: number;
            conversionsValue: number;
          };
        }>;
      }>
    >(
      `/customers/${cleanCustomerId}/googleAds:searchStream`,
      {
        headers: this.buildHeaders(accessToken),
        data: { query },
      },
      'post',
    );

    const results = response[0]?.results || [];
    return results.map((row) => ({
      date: row.segments.date,
      costMicros: row.metrics.costMicros || '0',
      impressions: row.metrics.impressions || '0',
      clicks: row.metrics.clicks || '0',
      conversions: row.metrics.conversions || 0,
      conversionsValue: row.metrics.conversionsValue || 0,
    }));
  }

  async exchangeCode(
    code: string,
    redirectUri: string,
  ): Promise<GoogleTokenResult> {
    const response = await this.oauthClient.post<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    }>('/token', {
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || null,
      expiresIn: response.data.expires_in,
    };
  }

  async refreshToken(refreshToken: string): Promise<GoogleTokenResult> {
    const response = await this.oauthClient.post<{
      access_token: string;
      expires_in: number;
    }>('/token', {
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
    });

    return {
      accessToken: response.data.access_token,
      refreshToken,
      expiresIn: response.data.expires_in,
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await this.oauthClient.get<{
        audience?: string;
        expires_in?: number;
      }>('/tokeninfo', {
        params: { access_token: accessToken },
      });

      return (response.data.expires_in ?? 0) > 0;
    } catch {
      return false;
    }
  }

  private buildHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': this.developerToken,
    };
  }

  private formatDate(d: Date): string {
    return d.toISOString().split('T')[0]!;
  }

  private async requestWithRetry<T>(
    url: string,
    config: {
      headers?: Record<string, string>;
      params?: Record<string, string>;
      data?: unknown;
    },
    method: 'get' | 'post' = 'get',
    retries = 3,
    delay = 1000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response =
          method === 'post'
            ? await this.client.post<T>(url, config.data, {
                headers: config.headers,
              })
            : await this.client.get<T>(url, {
                headers: config.headers,
                params: config.params,
              });
        return response.data;
      } catch (error) {
        if (error instanceof AxiosError) {
          // Rate limit - retry with exponential backoff
          if (error.response?.status === 429 && attempt < retries) {
            await this.sleep(delay * Math.pow(2, attempt - 1));
            continue;
          }

          // Google Ads API error formatting
          const googleError = error.response?.data as
            | {
                error?: {
                  message?: string;
                  code?: number;
                  status?: string;
                };
              }
            | undefined;
          if (googleError?.error) {
            throw new Error(
              `Google Ads API Error: ${googleError.error.message || 'Unknown error'} (code: ${googleError.error.code || 'unknown'})`,
            );
          }
        }
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
