import { CampaignStatus, Platform } from '@/domain/entities/types';
import type {
  IAdPlatformClient,
  NormalizedAdAccountData,
  NormalizedCampaignData,
  NormalizedInsightData,
  TokenExchangeResult,
} from '@/domain/services/IAdPlatformClient';
import type { TikTokAdsApiClient } from './TikTokAdsApiClient';

export class TikTokAdsPlatformAdapter implements IAdPlatformClient {
  readonly platform = Platform.TIKTOK;
  readonly authType = 'oauth' as const;

  constructor(
    private readonly tikTokApiClient: TikTokAdsApiClient,
    private readonly appId: string,
  ) {}

  getAuthUrl(redirectUri: string, state: string): string {
    return `https://business-api.tiktok.com/portal/auth?app_id=${this.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }

  async exchangeCodeForToken(code: string, _redirectUri: string): Promise<TokenExchangeResult> {
    const result = await this.tikTokApiClient.exchangeCode(code);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: new Date(Date.now() + result.expiresIn * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenExchangeResult> {
    const result = await this.tikTokApiClient.refreshToken(refreshToken);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: new Date(Date.now() + result.expiresIn * 1000),
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    return this.tikTokApiClient.validateToken(accessToken);
  }

  async getAdAccounts(accessToken: string): Promise<NormalizedAdAccountData[]> {
    const advertisers = await this.tikTokApiClient.getAdvertisers(accessToken);
    return advertisers.map((adv) => ({
      externalAccountId: adv.advertiserId,
      name: adv.name,
      currency: adv.currency,
      timezone: adv.timezone,
      isActive: adv.status === 'STATUS_ENABLE',
    }));
  }

  async getCampaigns(
    accessToken: string,
    externalAccountId: string,
  ): Promise<NormalizedCampaignData[]> {
    const campaigns = await this.tikTokApiClient.getCampaigns(
      accessToken,
      externalAccountId,
    );
    return campaigns.map((campaign) => ({
      externalCampaignId: campaign.campaignId,
      name: campaign.campaignName,
      status: this.mapTikTokStatus(campaign.operationStatus),
    }));
  }

  async getInsights(
    accessToken: string,
    externalCampaignId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<NormalizedInsightData[]> {
    // TikTok reports require an advertiser_id; for the normalized interface,
    // we pass the campaignId as both advertiser context and campaign filter.
    // In practice, the caller should manage the advertiser-campaign mapping.
    const insights = await this.tikTokApiClient.getInsights(
      accessToken,
      externalCampaignId,
      [externalCampaignId],
      startDate,
      endDate,
    );

    return insights.map((insight) => ({
      date: new Date(insight.statTimeDay),
      spend: parseFloat(insight.spend),
      impressions: parseInt(insight.impressions, 10),
      clicks: parseInt(insight.clicks, 10),
      conversions: parseInt(insight.conversion, 10),
      revenue: parseFloat(insight.completePayment),
    }));
  }

  private mapTikTokStatus(operationStatus: string): CampaignStatus {
    switch (operationStatus) {
      case 'CAMPAIGN_STATUS_ENABLE':
        return CampaignStatus.ACTIVE;
      case 'CAMPAIGN_STATUS_DISABLE':
        return CampaignStatus.PAUSED;
      case 'CAMPAIGN_STATUS_DELETE':
        return CampaignStatus.DELETED;
      default:
        return CampaignStatus.PAUSED;
    }
  }
}
