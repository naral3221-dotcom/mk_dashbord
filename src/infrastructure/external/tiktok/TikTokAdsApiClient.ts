import axios, { AxiosInstance, AxiosError } from 'axios';

export interface TikTokAdvertiserData {
  readonly advertiserId: string;
  readonly name: string;
  readonly currency: string;
  readonly timezone: string;
  readonly status: string;
}

export interface TikTokCampaignData {
  readonly campaignId: string;
  readonly campaignName: string;
  readonly operationStatus: string;
  readonly objective: string;
  readonly budget: number;
  readonly budgetMode: string;
}

export interface TikTokInsightData {
  readonly statTimeDay: string;
  readonly spend: string;
  readonly impressions: string;
  readonly clicks: string;
  readonly conversion: string;
  readonly completePayment: string;
}

export interface TikTokTokenResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
  readonly refreshTokenExpiresIn: number;
}

interface TikTokApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export class TikTokAdsApiClient {
  private readonly client: AxiosInstance;
  private readonly appId: string;
  private readonly appSecret: string;

  constructor(appId: string, appSecret: string) {
    if (!appId || !appSecret) {
      throw new Error('TikTok App ID and App Secret are required');
    }

    this.appId = appId;
    this.appSecret = appSecret;

    this.client = axios.create({
      baseURL: 'https://business-api.tiktok.com/open_api/v1.3/',
      timeout: 30000,
    });
  }

  async getAdvertisers(accessToken: string): Promise<TikTokAdvertiserData[]> {
    const response = await this.requestWithRetry<
      TikTokApiResponse<{
        list: Array<{
          advertiser_id: string;
          advertiser_name: string;
          currency: string;
          timezone: string;
          status: string;
        }>;
      }>
    >('get', 'advertiser/info/', {
      headers: { 'Access-Token': accessToken },
    });

    this.assertSuccess(response);

    return (response.data.list || []).map((adv) => ({
      advertiserId: adv.advertiser_id,
      name: adv.advertiser_name,
      currency: adv.currency,
      timezone: adv.timezone,
      status: adv.status,
    }));
  }

  async getCampaigns(
    accessToken: string,
    advertiserId: string,
  ): Promise<TikTokCampaignData[]> {
    const response = await this.requestWithRetry<
      TikTokApiResponse<{
        list: Array<{
          campaign_id: string;
          campaign_name: string;
          operation_status: string;
          objective: string;
          budget: number;
          budget_mode: string;
        }>;
      }>
    >('get', 'campaign/get/', {
      headers: { 'Access-Token': accessToken },
      params: { advertiser_id: advertiserId },
    });

    this.assertSuccess(response);

    return (response.data.list || []).map((campaign) => ({
      campaignId: campaign.campaign_id,
      campaignName: campaign.campaign_name,
      operationStatus: campaign.operation_status,
      objective: campaign.objective,
      budget: campaign.budget,
      budgetMode: campaign.budget_mode,
    }));
  }

  async getInsights(
    accessToken: string,
    advertiserId: string,
    campaignIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<TikTokInsightData[]> {
    const formatDate = (d: Date) => d.toISOString().split('T')[0]!;

    const response = await this.requestWithRetry<
      TikTokApiResponse<{
        list: Array<{
          dimensions: { stat_time_day: string };
          metrics: {
            spend: string;
            impressions: string;
            clicks: string;
            conversion: string;
            complete_payment: string;
          };
        }>;
      }>
    >('get', 'report/integrated/get/', {
      headers: { 'Access-Token': accessToken },
      params: {
        advertiser_id: advertiserId,
        report_type: 'BASIC',
        data_level: 'AUCTION_CAMPAIGN',
        dimensions: JSON.stringify(['campaign_id', 'stat_time_day']),
        metrics: JSON.stringify([
          'spend',
          'impressions',
          'clicks',
          'conversion',
          'complete_payment',
        ]),
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        filtering: JSON.stringify([
          {
            field_name: 'campaign_ids',
            filter_type: 'IN',
            filter_value: JSON.stringify(campaignIds),
          },
        ]),
      },
    });

    this.assertSuccess(response);

    return (response.data.list || []).map((item) => ({
      statTimeDay: item.dimensions.stat_time_day,
      spend: item.metrics.spend,
      impressions: item.metrics.impressions,
      clicks: item.metrics.clicks,
      conversion: item.metrics.conversion,
      completePayment: item.metrics.complete_payment,
    }));
  }

  async exchangeCode(authCode: string): Promise<TikTokTokenResult> {
    const response = await this.requestWithRetry<
      TikTokApiResponse<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        refresh_token_expires_in: number;
      }>
    >('post', 'oauth2/access_token/', {
      data: {
        app_id: this.appId,
        secret: this.appSecret,
        auth_code: authCode,
      },
    });

    this.assertSuccess(response);

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      refreshTokenExpiresIn: response.data.refresh_token_expires_in,
    };
  }

  async refreshToken(refreshToken: string): Promise<TikTokTokenResult> {
    const response = await this.requestWithRetry<
      TikTokApiResponse<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        refresh_token_expires_in: number;
      }>
    >('post', 'oauth2/refresh_token/', {
      data: {
        app_id: this.appId,
        secret: this.appSecret,
        refresh_token: refreshToken,
      },
    });

    this.assertSuccess(response);

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      refreshTokenExpiresIn: response.data.refresh_token_expires_in,
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await this.requestWithRetry<
        TikTokApiResponse<{ display_name: string }>
      >('get', 'user/info/', {
        headers: { 'Access-Token': accessToken },
      });

      return response.code === 0;
    } catch {
      return false;
    }
  }

  private assertSuccess<T>(response: TikTokApiResponse<T>): void {
    if (response.code !== 0) {
      throw new Error(
        `TikTok API Error: ${response.message || 'Unknown error'} (code: ${response.code})`,
      );
    }
  }

  private async requestWithRetry<T>(
    method: 'get' | 'post',
    url: string,
    config: {
      headers?: Record<string, string>;
      params?: Record<string, string>;
      data?: Record<string, unknown>;
    },
    retries = 3,
    delay = 1000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const requestConfig: {
          headers?: Record<string, string>;
          params?: Record<string, string>;
        } = {};

        if (config.headers) {
          requestConfig.headers = config.headers;
        }
        if (config.params) {
          requestConfig.params = config.params;
        }

        let response;
        if (method === 'post') {
          response = await this.client.post<T>(url, config.data || {}, requestConfig);
        } else {
          response = await this.client.get<T>(url, requestConfig);
        }

        return response.data;
      } catch (error) {
        if (error instanceof AxiosError) {
          // Rate limit - retry with exponential backoff
          if (error.response?.status === 429 && attempt < retries) {
            await this.sleep(delay * Math.pow(2, attempt - 1));
            continue;
          }

          // TikTok API error formatting
          const tikTokError = error.response?.data as
            | { code?: number; message?: string }
            | undefined;
          if (tikTokError?.code !== undefined) {
            throw new Error(
              `TikTok API Error: ${tikTokError.message || 'Unknown error'} (code: ${tikTokError.code})`,
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
