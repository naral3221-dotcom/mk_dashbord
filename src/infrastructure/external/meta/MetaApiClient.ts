import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  IMetaApiClient,
  MetaAdAccountData,
  MetaCampaignData,
  MetaInsightData,
  MetaTokenExchangeResult,
} from '@/domain/services/IMetaApiClient';

export class MetaApiClient implements IMetaApiClient {
  private readonly client: AxiosInstance;
  private readonly appId: string;
  private readonly appSecret: string;

  constructor(appId: string, appSecret: string) {
    if (!appId || !appSecret) {
      throw new Error('META App ID and App Secret are required');
    }

    this.appId = appId;
    this.appSecret = appSecret;

    this.client = axios.create({
      baseURL: 'https://graph.facebook.com/v21.0',
      timeout: 30000,
    });
  }

  async getAdAccounts(accessToken: string): Promise<MetaAdAccountData[]> {
    const response = await this.requestWithRetry<{
      data: Array<{
        id: string;
        name: string;
        account_id: string;
        account_status: number;
        currency: string;
        timezone_name: string;
      }>;
    }>('/me/adaccounts', {
      params: {
        access_token: accessToken,
        fields: 'id,name,account_id,account_status,currency,timezone_name',
      },
    });

    return response.data.map((account) => ({
      id: account.id,
      name: account.name,
      accountId: account.account_id,
      accountStatus: account.account_status,
      currency: account.currency,
      timezoneName: account.timezone_name,
    }));
  }

  async getCampaigns(accessToken: string, adAccountId: string): Promise<MetaCampaignData[]> {
    const response = await this.requestWithRetry<{
      data: Array<{
        id: string;
        name: string;
        status: string;
        objective: string;
        daily_budget?: string;
        lifetime_budget?: string;
        start_time?: string;
        stop_time?: string;
      }>;
    }>(`/${adAccountId}/campaigns`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time',
      },
    });

    return response.data.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      dailyBudget: campaign.daily_budget,
      lifetimeBudget: campaign.lifetime_budget,
      startTime: campaign.start_time,
      stopTime: campaign.stop_time,
    }));
  }

  async getInsights(
    accessToken: string,
    campaignId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<MetaInsightData[]> {
    const formatDate = (d: Date) => d.toISOString().split('T')[0]!;

    const response = await this.requestWithRetry<{
      data: Array<{
        date_start: string;
        date_stop: string;
        spend: string;
        impressions: string;
        clicks: string;
        actions?: Array<{ action_type: string; value: string }>;
      }>;
    }>(`/${campaignId}/insights`, {
      params: {
        access_token: accessToken,
        fields: 'date_start,date_stop,spend,impressions,clicks,actions',
        time_range: JSON.stringify({
          since: formatDate(startDate),
          until: formatDate(endDate),
        }),
        time_increment: '1',
        level: 'campaign',
      },
    });

    return response.data.map((insight) => {
      const actions = insight.actions || [];
      const conversions = actions
        .filter((a) => a.action_type === 'offsite_conversion' || a.action_type === 'lead')
        .reduce((sum, a) => sum + parseInt(a.value, 10), 0);
      const revenue = actions
        .filter((a) => a.action_type === 'offsite_conversion.fb_pixel_purchase')
        .reduce((sum, a) => sum + parseFloat(a.value), 0);

      return {
        dateStart: insight.date_start,
        dateStop: insight.date_stop,
        spend: insight.spend,
        impressions: insight.impressions,
        clicks: insight.clicks,
        conversions: String(conversions),
        revenue: String(revenue),
        actions: insight.actions?.map((a) => ({
          actionType: a.action_type,
          value: a.value,
        })),
      };
    });
  }

  async exchangeToken(shortLivedToken: string): Promise<MetaTokenExchangeResult> {
    const response = await this.requestWithRetry<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>('/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: this.appId,
        client_secret: this.appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    return {
      accessToken: response.access_token,
      expiresAt: new Date(Date.now() + response.expires_in * 1000),
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.requestWithRetry<{ id: string }>('/me', {
        params: {
          access_token: accessToken,
          fields: 'id',
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  private async requestWithRetry<T>(
    url: string,
    config: { params: Record<string, string> },
    retries = 3,
    delay = 1000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.client.get<T>(url, config);
        return response.data;
      } catch (error) {
        if (error instanceof AxiosError) {
          // Rate limit - retry with exponential backoff
          if (error.response?.status === 429 && attempt < retries) {
            await this.sleep(delay * Math.pow(2, attempt - 1));
            continue;
          }

          // META API error formatting
          const metaError = error.response?.data as
            | { error?: { message?: string; code?: number } }
            | undefined;
          if (metaError?.error) {
            throw new Error(
              `META API Error: ${metaError.error.message || 'Unknown error'} (code: ${metaError.error.code || 'unknown'})`,
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
