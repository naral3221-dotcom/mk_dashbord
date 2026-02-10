import { CampaignStatus, Platform } from '@/domain/entities/types';
import type {
  IAdPlatformClient,
  NormalizedAdAccountData,
  NormalizedCampaignData,
  NormalizedInsightData,
  TokenExchangeResult,
} from '@/domain/services/IAdPlatformClient';
import type { IMetaApiClient } from '@/domain/services/IMetaApiClient';

export class MetaPlatformAdapter implements IAdPlatformClient {
  readonly platform = Platform.META;
  readonly authType = 'oauth' as const;

  constructor(
    private readonly metaApiClient: IMetaApiClient,
    private readonly appId: string,
    private readonly appSecret: string,
  ) {}

  getAuthUrl(redirectUri: string, state: string): string {
    return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${this.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=ads_management,ads_read`;
  }

  async exchangeCodeForToken(code: string, _redirectUri: string): Promise<TokenExchangeResult> {
    const result = await this.metaApiClient.exchangeToken(code);
    return {
      accessToken: result.accessToken,
      refreshToken: null,
      expiresAt: result.expiresAt,
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<TokenExchangeResult> {
    throw new Error('META platform does not support token refresh');
  }

  async validateToken(accessToken: string): Promise<boolean> {
    return this.metaApiClient.validateToken(accessToken);
  }

  async getAdAccounts(accessToken: string): Promise<NormalizedAdAccountData[]> {
    const accounts = await this.metaApiClient.getAdAccounts(accessToken);
    return accounts.map((account) => ({
      externalAccountId: account.accountId,
      name: account.name,
      currency: account.currency,
      timezone: account.timezoneName,
      isActive: account.accountStatus === 1,
    }));
  }

  async getCampaigns(accessToken: string, externalAccountId: string): Promise<NormalizedCampaignData[]> {
    const campaigns = await this.metaApiClient.getCampaigns(accessToken, 'act_' + externalAccountId);
    return campaigns.map((campaign) => ({
      externalCampaignId: campaign.id,
      name: campaign.name,
      status: this.mapMetaStatus(campaign.status),
    }));
  }

  async getInsights(
    accessToken: string,
    externalCampaignId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<NormalizedInsightData[]> {
    const insights = await this.metaApiClient.getInsights(accessToken, externalCampaignId, startDate, endDate);
    return insights.map((insight) => ({
      date: new Date(insight.dateStart),
      spend: parseFloat(insight.spend),
      impressions: parseInt(insight.impressions, 10),
      clicks: parseInt(insight.clicks, 10),
      conversions: parseInt(insight.conversions, 10),
      revenue: parseFloat(insight.revenue),
    }));
  }

  private mapMetaStatus(status: string): CampaignStatus {
    switch (status) {
      case 'ACTIVE':
        return CampaignStatus.ACTIVE;
      case 'PAUSED':
        return CampaignStatus.PAUSED;
      case 'DELETED':
        return CampaignStatus.DELETED;
      case 'ARCHIVED':
        return CampaignStatus.ARCHIVED;
      default:
        return CampaignStatus.PAUSED;
    }
  }
}
