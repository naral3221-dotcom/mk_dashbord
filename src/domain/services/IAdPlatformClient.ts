import { CampaignStatus, Platform } from '../entities/types';

export interface NormalizedAdAccountData {
  readonly externalAccountId: string;
  readonly name: string;
  readonly currency: string;
  readonly timezone: string;
  readonly isActive: boolean;
}

export interface NormalizedCampaignData {
  readonly externalCampaignId: string;
  readonly name: string;
  readonly status: CampaignStatus;
}

export interface NormalizedInsightData {
  readonly date: Date;
  readonly spend: number;
  readonly impressions: number;
  readonly clicks: number;
  readonly conversions: number;
  readonly revenue: number;
}

export interface TokenExchangeResult {
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly expiresAt: Date;
}

export interface IAdPlatformClient {
  readonly platform: Platform;
  readonly authType: 'oauth' | 'api_key';

  getAuthUrl(redirectUri: string, state: string): string;
  exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenExchangeResult>;
  refreshAccessToken(refreshToken: string): Promise<TokenExchangeResult>;
  validateToken(accessToken: string): Promise<boolean>;
  getAdAccounts(accessToken: string): Promise<NormalizedAdAccountData[]>;
  getCampaigns(accessToken: string, externalAccountId: string): Promise<NormalizedCampaignData[]>;
  getInsights(
    accessToken: string,
    externalCampaignId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<NormalizedInsightData[]>;
}
