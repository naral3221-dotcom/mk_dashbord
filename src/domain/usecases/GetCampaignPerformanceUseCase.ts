import { CampaignStatus } from '../entities/types';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { ICampaignRepository } from '../repositories/ICampaignRepository';
import { ICampaignInsightRepository } from '../repositories/ICampaignInsightRepository';

export interface GetCampaignPerformanceInput {
  organizationId: string;
  startDate: Date;
  endDate: Date;
}

export interface CampaignPerformanceItem {
  campaignId: string;
  campaignName: string;
  status: CampaignStatus;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cvr: number;
  cpa: number;
  roas: number;
}

export interface GetCampaignPerformanceOutput {
  campaigns: CampaignPerformanceItem[];
  totalCount: number;
}

export class GetCampaignPerformanceUseCase {
  constructor(
    private readonly adAccountRepo: IAdAccountRepository,
    private readonly campaignRepo: ICampaignRepository,
    private readonly insightRepo: ICampaignInsightRepository,
  ) {}

  async execute(input: GetCampaignPerformanceInput): Promise<GetCampaignPerformanceOutput> {
    // 1. Validate inputs
    if (!input.organizationId || input.organizationId.trim().length === 0) {
      throw new Error('Organization ID is required');
    }

    if (input.startDate >= input.endDate) {
      throw new Error('Start date must be before end date');
    }

    // 2. Find active ad accounts for organization
    const adAccounts = await this.adAccountRepo.findActiveByOrganizationId(input.organizationId);
    if (adAccounts.length === 0) {
      return { campaigns: [], totalCount: 0 };
    }

    // 3. For each account, find campaigns
    const allCampaigns = [];
    for (const account of adAccounts) {
      const campaigns = await this.campaignRepo.findByAdAccountId(account.id);
      allCampaigns.push(...campaigns);
    }

    if (allCampaigns.length === 0) {
      return { campaigns: [], totalCount: 0 };
    }

    // 4. For each campaign, find insights in date range and aggregate
    const dateRange = { start: input.startDate, end: input.endDate };
    const performanceItems: CampaignPerformanceItem[] = [];

    for (const campaign of allCampaigns) {
      const insights = await this.insightRepo.findByCampaignAndDateRange(
        campaign.id,
        dateRange,
      );

      if (insights.length === 0) {
        continue;
      }

      // 5. Aggregate insights per campaign
      let totalSpend = 0;
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalConversions = 0;
      let totalRevenue = 0;

      for (const insight of insights) {
        totalSpend += insight.spend;
        totalImpressions += insight.impressions;
        totalClicks += insight.clicks;
        totalConversions += insight.conversions;
        totalRevenue += insight.revenue;
      }

      // 6. Compute derived KPIs
      const ctr = totalImpressions === 0
        ? 0
        : GetCampaignPerformanceUseCase.roundToTwo((totalClicks / totalImpressions) * 100);

      const cpc = totalClicks === 0
        ? 0
        : GetCampaignPerformanceUseCase.roundToTwo(totalSpend / totalClicks);

      const cpm = totalImpressions === 0
        ? 0
        : GetCampaignPerformanceUseCase.roundToTwo((totalSpend / totalImpressions) * 1000);

      const cvr = totalClicks === 0
        ? 0
        : GetCampaignPerformanceUseCase.roundToTwo((totalConversions / totalClicks) * 100);

      const cpa = totalConversions === 0
        ? 0
        : GetCampaignPerformanceUseCase.roundToTwo(totalSpend / totalConversions);

      const roas = totalSpend === 0
        ? 0
        : GetCampaignPerformanceUseCase.roundToTwo(totalRevenue / totalSpend);

      performanceItems.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        status: campaign.status,
        spend: GetCampaignPerformanceUseCase.roundToTwo(totalSpend),
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        revenue: GetCampaignPerformanceUseCase.roundToTwo(totalRevenue),
        ctr,
        cpc,
        cpm,
        cvr,
        cpa,
        roas,
      });
    }

    // 7. Sort by spend descending
    performanceItems.sort((a, b) => b.spend - a.spend);

    // 8. Return result
    return {
      campaigns: performanceItems,
      totalCount: performanceItems.length,
    };
  }

  private static roundToTwo(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }
}
