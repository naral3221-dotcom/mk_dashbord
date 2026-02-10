import { CampaignStatus, Platform } from '@/domain/entities/types';
import type {
  IAdPlatformClient,
  NormalizedAdAccountData,
  NormalizedCampaignData,
  NormalizedInsightData,
  TokenExchangeResult,
} from '@/domain/services/IAdPlatformClient';
import type { GoogleAdsApiClient } from './GoogleAdsApiClient';

export class GoogleAdsPlatformAdapter implements IAdPlatformClient {
  readonly platform = Platform.GOOGLE;
  readonly authType = 'oauth' as const;

  constructor(
    private readonly googleAdsClient: GoogleAdsApiClient,
    private readonly clientId: string,
  ) {}

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/adwords',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
  ): Promise<TokenExchangeResult> {
    const result = await this.googleAdsClient.exchangeCode(code, redirectUri);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: new Date(Date.now() + result.expiresIn * 1000),
    };
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<TokenExchangeResult> {
    const result = await this.googleAdsClient.refreshToken(refreshToken);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: new Date(Date.now() + result.expiresIn * 1000),
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    return this.googleAdsClient.validateToken(accessToken);
  }

  async getAdAccounts(
    accessToken: string,
  ): Promise<NormalizedAdAccountData[]> {
    const accounts = await this.googleAdsClient.getAdAccounts(accessToken);
    return accounts.map((account) => ({
      externalAccountId: account.customerId,
      name: account.descriptiveName || `Account ${account.customerId}`,
      currency: account.currencyCode,
      timezone: account.timeZone,
      isActive: !account.manager,
    }));
  }

  async getCampaigns(
    accessToken: string,
    externalAccountId: string,
  ): Promise<NormalizedCampaignData[]> {
    const cleanCustomerId = externalAccountId.replace(/-/g, '');
    const campaigns = await this.googleAdsClient.getCampaigns(
      accessToken,
      cleanCustomerId,
    );
    return campaigns.map((campaign) => ({
      externalCampaignId: campaign.id,
      name: campaign.name,
      status: this.mapGoogleStatus(campaign.status),
    }));
  }

  async getInsights(
    accessToken: string,
    externalCampaignId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<NormalizedInsightData[]> {
    // For Google Ads, we need the customer ID to query insights.
    // The externalCampaignId is passed as "customerId:campaignId" format
    const [customerId, campaignId] = this.parseCampaignId(externalCampaignId);
    const insights = await this.googleAdsClient.getInsights(
      accessToken,
      campaignId,
      customerId,
      startDate,
      endDate,
    );
    return insights.map((insight) => ({
      date: new Date(insight.date),
      spend: parseInt(insight.costMicros, 10) / 1_000_000,
      impressions: parseInt(insight.impressions, 10),
      clicks: parseInt(insight.clicks, 10),
      conversions: insight.conversions,
      revenue: insight.conversionsValue,
    }));
  }

  private parseCampaignId(externalCampaignId: string): [string, string] {
    const parts = externalCampaignId.split(':');
    if (parts.length === 2) {
      return [parts[0]!, parts[1]!];
    }
    // If no colon, assume it's just the campaign ID with no customer context
    return ['', externalCampaignId];
  }

  private mapGoogleStatus(status: string): CampaignStatus {
    switch (status) {
      case 'ENABLED':
        return CampaignStatus.ACTIVE;
      case 'PAUSED':
        return CampaignStatus.PAUSED;
      case 'REMOVED':
        return CampaignStatus.DELETED;
      default:
        return CampaignStatus.PAUSED;
    }
  }
}
