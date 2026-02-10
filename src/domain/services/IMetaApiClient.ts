export interface MetaAdAccountData {
  readonly id: string;
  readonly name: string;
  readonly accountId: string;
  readonly accountStatus: number;
  readonly currency: string;
  readonly timezoneName: string;
}

export interface MetaCampaignData {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly objective: string;
  readonly dailyBudget?: string;
  readonly lifetimeBudget?: string;
  readonly startTime?: string;
  readonly stopTime?: string;
}

export interface MetaInsightData {
  readonly dateStart: string;
  readonly dateStop: string;
  readonly spend: string;
  readonly impressions: string;
  readonly clicks: string;
  readonly conversions: string;
  readonly revenue: string;
  readonly actions?: Array<{ actionType: string; value: string }>;
}

export interface MetaTokenExchangeResult {
  readonly accessToken: string;
  readonly expiresAt: Date;
}

export interface IMetaApiClient {
  getAdAccounts(accessToken: string): Promise<MetaAdAccountData[]>;
  getCampaigns(accessToken: string, adAccountId: string): Promise<MetaCampaignData[]>;
  getInsights(accessToken: string, campaignId: string, startDate: Date, endDate: Date): Promise<MetaInsightData[]>;
  exchangeToken(shortLivedToken: string): Promise<MetaTokenExchangeResult>;
  validateToken(accessToken: string): Promise<boolean>;
}
