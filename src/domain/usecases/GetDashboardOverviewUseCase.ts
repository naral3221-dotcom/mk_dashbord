import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { ICampaignRepository } from '../repositories/ICampaignRepository';
import { ICampaignInsightRepository, DateRange } from '../repositories/ICampaignInsightRepository';
import { CampaignInsight } from '../entities/CampaignInsight';
import { Platform } from '../entities/types';

export interface GetDashboardOverviewInput {
  organizationId: string;
  startDate: Date;
  endDate: Date;
  platform?: Platform;
}

export interface AggregatedKpis {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cvr: number;
  cpa: number;
  roas: number;
  roi: number;
  profit: number;
}

export interface DailyMetrics {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface SpendByCampaign {
  campaignId: string;
  campaignName: string;
  spend: number;
}

export interface GetDashboardOverviewOutput {
  kpis: AggregatedKpis;
  dailyTrend: DailyMetrics[];
  spendByCampaign: SpendByCampaign[];
}

export class GetDashboardOverviewUseCase {
  constructor(
    private readonly adAccountRepo: IAdAccountRepository,
    private readonly campaignRepo: ICampaignRepository,
    private readonly insightRepo: ICampaignInsightRepository,
  ) {}

  async execute(input: GetDashboardOverviewInput): Promise<GetDashboardOverviewOutput> {
    // 1. Validate inputs
    if (!input.organizationId || input.organizationId.trim().length === 0) {
      throw new Error('Organization ID is required');
    }

    if (input.startDate >= input.endDate) {
      throw new Error('Start date must be before end date');
    }

    // 2. Find ad accounts (filter by platform if specified)
    const adAccounts = input.platform
      ? await this.adAccountRepo.findByPlatform(input.organizationId, input.platform)
      : await this.adAccountRepo.findActiveByOrganizationId(input.organizationId);

    // When filtering by platform, findByPlatform may return inactive accounts too
    const activeAccounts = input.platform
      ? adAccounts.filter(a => a.isActive)
      : adAccounts;

    if (activeAccounts.length === 0) {
      return this.buildEmptyResult();
    }

    // 3. For each account, find all campaigns
    const campaignInsightsMap: Map<string, { campaignName: string; insights: CampaignInsight[] }> =
      new Map();

    const dateRange: DateRange = { start: input.startDate, end: input.endDate };

    for (const adAccount of activeAccounts) {
      const campaigns = await this.campaignRepo.findByAdAccountId(adAccount.id);

      for (const campaign of campaigns) {
        // 4. For each campaign, find insights in date range
        const insights = await this.insightRepo.findByCampaignAndDateRange(
          campaign.id,
          dateRange,
        );

        campaignInsightsMap.set(campaign.id, {
          campaignName: campaign.name,
          insights,
        });
      }
    }

    // 5. Aggregate all insights
    const allInsights: CampaignInsight[] = [];
    for (const entry of campaignInsightsMap.values()) {
      allInsights.push(...entry.insights);
    }

    const kpis = this.aggregateKpis(allInsights);
    const dailyTrend = this.buildDailyTrend(allInsights);
    const spendByCampaign = this.buildSpendByCampaign(campaignInsightsMap);

    return {
      kpis,
      dailyTrend,
      spendByCampaign,
    };
  }

  private aggregateKpis(insights: CampaignInsight[]): AggregatedKpis {
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

    const ctr = totalImpressions === 0 ? 0 : GetDashboardOverviewUseCase.roundToTwo((totalClicks / totalImpressions) * 100);
    const cpc = totalClicks === 0 ? 0 : GetDashboardOverviewUseCase.roundToTwo(totalSpend / totalClicks);
    const cpm = totalImpressions === 0 ? 0 : GetDashboardOverviewUseCase.roundToTwo((totalSpend / totalImpressions) * 1000);
    const cvr = totalClicks === 0 ? 0 : GetDashboardOverviewUseCase.roundToTwo((totalConversions / totalClicks) * 100);
    const cpa = totalConversions === 0 ? 0 : GetDashboardOverviewUseCase.roundToTwo(totalSpend / totalConversions);
    const roas = totalSpend === 0 ? 0 : GetDashboardOverviewUseCase.roundToTwo(totalRevenue / totalSpend);
    const roi = totalSpend === 0 ? 0 : GetDashboardOverviewUseCase.roundToTwo(((totalRevenue - totalSpend) / totalSpend) * 100);
    const profit = GetDashboardOverviewUseCase.roundToTwo(totalRevenue - totalSpend);

    return {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      totalRevenue,
      ctr,
      cpc,
      cpm,
      cvr,
      cpa,
      roas,
      roi,
      profit,
    };
  }

  private buildDailyTrend(insights: CampaignInsight[]): DailyMetrics[] {
    const dailyMap = new Map<string, DailyMetrics>();

    for (const insight of insights) {
      const dateKey = this.formatDateKey(insight.date);
      const existing = dailyMap.get(dateKey);

      if (existing) {
        existing.spend += insight.spend;
        existing.impressions += insight.impressions;
        existing.clicks += insight.clicks;
        existing.conversions += insight.conversions;
        existing.revenue += insight.revenue;
      } else {
        dailyMap.set(dateKey, {
          date: dateKey,
          spend: insight.spend,
          impressions: insight.impressions,
          clicks: insight.clicks,
          conversions: insight.conversions,
          revenue: insight.revenue,
        });
      }
    }

    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private buildSpendByCampaign(
    campaignInsightsMap: Map<string, { campaignName: string; insights: CampaignInsight[] }>,
  ): SpendByCampaign[] {
    const result: SpendByCampaign[] = [];

    for (const [campaignId, entry] of campaignInsightsMap.entries()) {
      let totalSpend = 0;
      for (const insight of entry.insights) {
        totalSpend += insight.spend;
      }

      result.push({
        campaignId,
        campaignName: entry.campaignName,
        spend: totalSpend,
      });
    }

    return result.sort((a, b) => b.spend - a.spend);
  }

  private buildEmptyResult(): GetDashboardOverviewOutput {
    return {
      kpis: {
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        cvr: 0,
        cpa: 0,
        roas: 0,
        roi: 0,
        profit: 0,
      },
      dailyTrend: [],
      spendByCampaign: [],
    };
  }

  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private static roundToTwo(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }
}
