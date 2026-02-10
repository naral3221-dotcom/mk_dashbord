import { CampaignStatus, Platform } from '@/domain/entities/types';
import type {
  IAdPlatformClient,
  NormalizedAdAccountData,
  NormalizedCampaignData,
  NormalizedInsightData,
  TokenExchangeResult,
} from '@/domain/services/IAdPlatformClient';
import type { NaverAdsApiClient } from './NaverAdsApiClient';

interface NaverCredentials {
  apiKey: string;
  apiSecret: string;
  customerId: string;
}

export class NaverAdsPlatformAdapter implements IAdPlatformClient {
  readonly platform = Platform.NAVER;
  readonly authType = 'api_key' as const;

  constructor(private readonly naverApiClient: NaverAdsApiClient) {}

  getAuthUrl(_redirectUri: string, _state: string): string {
    throw new Error('Naver platform uses API Key authentication, not OAuth');
  }

  async exchangeCodeForToken(
    _code: string,
    _redirectUri: string,
  ): Promise<TokenExchangeResult> {
    throw new Error('Naver platform uses API Key authentication');
  }

  async refreshAccessToken(_refreshToken: string): Promise<TokenExchangeResult> {
    throw new Error('Naver platform uses API Key authentication, tokens do not expire');
  }

  async validateToken(accessToken: string): Promise<boolean> {
    const credentials = this.parseCredentials(accessToken);
    return this.naverApiClient.validateCredentials(
      credentials.apiKey,
      credentials.apiSecret,
      credentials.customerId,
    );
  }

  async getAdAccounts(accessToken: string): Promise<NormalizedAdAccountData[]> {
    const credentials = this.parseCredentials(accessToken);
    const customerInfo = await this.naverApiClient.getCustomerInfo(
      credentials.apiKey,
      credentials.apiSecret,
      credentials.customerId,
    );

    return [
      {
        externalAccountId: customerInfo.customerId,
        name: customerInfo.name,
        currency: customerInfo.currency,
        timezone: customerInfo.timezone,
        isActive: true,
      },
    ];
  }

  async getCampaigns(
    accessToken: string,
    _externalAccountId: string,
  ): Promise<NormalizedCampaignData[]> {
    const credentials = this.parseCredentials(accessToken);
    const campaigns = await this.naverApiClient.getCampaigns(
      credentials.apiKey,
      credentials.apiSecret,
      credentials.customerId,
    );

    return campaigns.map((campaign) => ({
      externalCampaignId: campaign.nccCampaignId,
      name: campaign.name,
      status: this.mapNaverStatus(campaign.status, campaign.userLock),
    }));
  }

  async getInsights(
    accessToken: string,
    externalCampaignId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<NormalizedInsightData[]> {
    const credentials = this.parseCredentials(accessToken);
    const insights = await this.naverApiClient.getInsights(
      credentials.apiKey,
      credentials.apiSecret,
      credentials.customerId,
      externalCampaignId,
      startDate,
      endDate,
    );

    return insights.map((insight) => ({
      date: new Date(insight.date),
      spend: insight.cost,
      impressions: insight.impressions,
      clicks: insight.clicks,
      conversions: insight.conversions,
      revenue: insight.conversionRevenue,
    }));
  }

  private parseCredentials(accessToken: string): NaverCredentials {
    try {
      const parsed = JSON.parse(accessToken) as Partial<NaverCredentials>;
      if (!parsed.apiKey || !parsed.apiSecret || !parsed.customerId) {
        throw new Error('Missing required credential fields');
      }
      return {
        apiKey: parsed.apiKey,
        apiSecret: parsed.apiSecret,
        customerId: parsed.customerId,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(
          'Invalid Naver credentials format: expected JSON with apiKey, apiSecret, customerId',
        );
      }
      throw error;
    }
  }

  private mapNaverStatus(status: string, userLock: boolean): CampaignStatus {
    if (userLock) {
      return CampaignStatus.PAUSED;
    }

    switch (status) {
      case 'ELIGIBLE':
        return CampaignStatus.ACTIVE;
      case 'PAUSED':
        return CampaignStatus.PAUSED;
      case 'DELETED':
        return CampaignStatus.DELETED;
      default:
        return CampaignStatus.PAUSED;
    }
  }
}
