import axios, { AxiosInstance, AxiosError } from 'axios';
import { createHmac } from 'crypto';

export interface NaverCustomerInfo {
  readonly customerId: string;
  readonly name: string;
  readonly currency: string;
  readonly timezone: string;
}

export interface NaverCampaignData {
  readonly nccCampaignId: string;
  readonly name: string;
  readonly campaignTp: string;
  readonly userLock: boolean;
  readonly status: string;
  readonly deliveryMethod: string;
  readonly budget: number;
}

export interface NaverInsightData {
  readonly date: string;
  readonly impressions: number;
  readonly clicks: number;
  readonly cost: number;
  readonly conversions: number;
  readonly conversionRevenue: number;
}

export class NaverAdsApiClient {
  private readonly client: AxiosInstance;

  constructor(baseUrl = 'https://api.naver.com') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
    });
  }

  async getCustomerInfo(
    apiKey: string,
    apiSecret: string,
    customerId: string,
  ): Promise<NaverCustomerInfo> {
    const path = '/ncc/customers';
    const method = 'GET';
    const response = await this.requestWithRetry<
      Array<{
        customerId: string;
        name: string;
        currency: string;
        timezone: string;
      }>
    >(path, method, apiKey, apiSecret, customerId);

    const customer = response.find((c) => c.customerId === customerId) ?? response[0];
    if (!customer) {
      throw new Error('Naver API Error: No customer data returned');
    }

    return {
      customerId: customer.customerId,
      name: customer.name,
      currency: customer.currency || 'KRW',
      timezone: customer.timezone || 'Asia/Seoul',
    };
  }

  async getCampaigns(
    apiKey: string,
    apiSecret: string,
    customerId: string,
  ): Promise<NaverCampaignData[]> {
    const path = '/ncc/campaigns';
    const method = 'GET';
    const response = await this.requestWithRetry<
      Array<{
        nccCampaignId: string;
        name: string;
        campaignTp: string;
        userLock: boolean;
        status: string;
        deliveryMethod: string;
        budget: number;
      }>
    >(path, method, apiKey, apiSecret, customerId);

    return response.map((campaign) => ({
      nccCampaignId: campaign.nccCampaignId,
      name: campaign.name,
      campaignTp: campaign.campaignTp,
      userLock: campaign.userLock,
      status: campaign.status,
      deliveryMethod: campaign.deliveryMethod,
      budget: campaign.budget,
    }));
  }

  async getInsights(
    apiKey: string,
    apiSecret: string,
    customerId: string,
    campaignId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<NaverInsightData[]> {
    const path = '/stats';
    const method = 'GET';
    const formatDate = (d: Date) => d.toISOString().split('T')[0]!;

    const params: Record<string, string> = {
      id: campaignId,
      fields: '["impCnt","clkCnt","salesAmt","ccnt","crto"]',
      timeRange: JSON.stringify({
        since: formatDate(startDate),
        until: formatDate(endDate),
      }),
      datePreset: 'custom',
      timeIncrement: '1',
    };

    const response = await this.requestWithRetry<{
      data: Array<{
        stat: {
          date: string;
          impCnt: number;
          clkCnt: number;
          salesAmt: number;
          ccnt: number;
          crto: number;
        };
      }>;
    }>(path, method, apiKey, apiSecret, customerId, params);

    return (response.data || []).map((item) => ({
      date: item.stat.date,
      impressions: item.stat.impCnt,
      clicks: item.stat.clkCnt,
      cost: item.stat.salesAmt,
      conversions: item.stat.ccnt,
      conversionRevenue: item.stat.crto,
    }));
  }

  async validateCredentials(
    apiKey: string,
    apiSecret: string,
    customerId: string,
  ): Promise<boolean> {
    try {
      await this.getCustomerInfo(apiKey, apiSecret, customerId);
      return true;
    } catch {
      return false;
    }
  }

  private generateSignature(
    timestamp: string,
    method: string,
    path: string,
    secret: string,
  ): string {
    const message = `${timestamp}.${method}.${path}`;
    return createHmac('sha256', secret).update(message).digest('base64');
  }

  private buildHeaders(
    method: string,
    path: string,
    apiKey: string,
    apiSecret: string,
    customerId: string,
  ): Record<string, string> {
    const timestamp = String(Date.now());
    const signature = this.generateSignature(timestamp, method, path, apiSecret);

    return {
      'X-API-KEY': apiKey,
      'X-CUSTOMER': customerId,
      'X-Signature': signature,
      'X-Timestamp': timestamp,
    };
  }

  private async requestWithRetry<T>(
    path: string,
    method: string,
    apiKey: string,
    apiSecret: string,
    customerId: string,
    params?: Record<string, string>,
    retries = 3,
    delay = 1000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const headers = this.buildHeaders(method, path, apiKey, apiSecret, customerId);
        const response = await this.client.get<T>(path, {
          headers,
          params,
        });
        return response.data;
      } catch (error) {
        if (error instanceof AxiosError) {
          // Rate limit - retry with exponential backoff
          if (error.response?.status === 429 && attempt < retries) {
            await this.sleep(delay * Math.pow(2, attempt - 1));
            continue;
          }

          // Naver API error formatting
          const naverError = error.response?.data as
            | { title?: string; detail?: string; status?: number }
            | undefined;
          if (naverError?.title) {
            throw new Error(
              `Naver API Error: ${naverError.title} - ${naverError.detail || 'Unknown error'} (status: ${naverError.status || 'unknown'})`,
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
