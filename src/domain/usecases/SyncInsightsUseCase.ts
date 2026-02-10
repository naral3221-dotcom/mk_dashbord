import { CampaignInsight } from '../entities/CampaignInsight';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { ICampaignRepository } from '../repositories/ICampaignRepository';
import { ICampaignInsightRepository } from '../repositories/ICampaignInsightRepository';
import { IPlatformAdapterRegistry } from '../services/IPlatformAdapterRegistry';
import { ITokenEncryption } from '../services/ITokenEncryption';
import { ICacheService } from '../services/ICacheService';

export interface SyncInsightsInput {
  campaignId: string;
  startDate: Date;
  endDate: Date;
}

export interface SyncInsightsOutput {
  synced: number;
  created: number;
  updated: number;
  dateRange: { start: Date; end: Date };
  errors: string[];
}

export class SyncInsightsUseCase {
  private static readonly CACHE_TTL = 86400; // 24 hours in seconds

  constructor(
    private readonly campaignRepo: ICampaignRepository,
    private readonly adAccountRepo: IAdAccountRepository,
    private readonly insightRepo: ICampaignInsightRepository,
    private readonly adapterRegistry: IPlatformAdapterRegistry,
    private readonly tokenEncryption: ITokenEncryption,
    private readonly cacheService: ICacheService,
  ) {}

  async execute(input: SyncInsightsInput): Promise<SyncInsightsOutput> {
    const errors: string[] = [];

    // 1. Find campaign and its ad account
    const campaign = await this.campaignRepo.findById(input.campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const adAccount = await this.adAccountRepo.findById(campaign.adAccountId);
    if (!adAccount) {
      throw new Error('Ad account not found');
    }
    if (!adAccount.accessToken) {
      throw new Error('Ad account has no access token');
    }

    // 2. Check cache (includes platform in key)
    const cacheKey = `insights:${adAccount.platform}:${campaign.externalId}:${input.startDate.toISOString()}:${input.endDate.toISOString()}`;
    const cached = await this.cacheService.get<SyncInsightsOutput>(cacheKey);
    if (cached) {
      return cached;
    }

    // 3. Get the appropriate platform adapter
    const adapter = this.adapterRegistry.getAdapter(adAccount.platform);

    // 4. Decrypt token
    const decryptedToken = await this.tokenEncryption.decrypt(adAccount.accessToken);

    // 5. Fetch insights from platform adapter
    const normalizedInsights = await adapter.getInsights(
      decryptedToken,
      campaign.externalId,
      input.startDate,
      input.endDate,
    );

    // 6. Map and save insights
    let created = 0;
    let updated = 0;
    const insightsToSave: CampaignInsight[] = [];

    for (const insight of normalizedInsights) {
      try {
        const existingInsight = await this.insightRepo.findByCampaignAndDate(
          campaign.id,
          insight.date,
        );

        if (existingInsight) {
          // Update existing insight
          const updatedInsight = existingInsight.updateMetrics({
            spend: insight.spend,
            impressions: insight.impressions,
            clicks: insight.clicks,
            conversions: insight.conversions,
            revenue: insight.revenue,
          });
          insightsToSave.push(updatedInsight);
          updated++;
        } else {
          // Create new insight
          const newInsight = CampaignInsight.create({
            date: insight.date,
            spend: insight.spend,
            impressions: insight.impressions,
            clicks: insight.clicks,
            conversions: insight.conversions,
            revenue: insight.revenue,
            campaignId: campaign.id,
          });
          insightsToSave.push(newInsight);
          created++;
        }
      } catch (err) {
        errors.push(
          `Failed to sync insight for ${insight.date.toISOString()}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // 7. Batch save
    if (insightsToSave.length > 0) {
      await this.insightRepo.saveMany(insightsToSave);
    }

    // 8. Build result and cache it
    const result: SyncInsightsOutput = {
      synced: created + updated,
      created,
      updated,
      dateRange: { start: input.startDate, end: input.endDate },
      errors,
    };

    await this.cacheService.set(cacheKey, result, SyncInsightsUseCase.CACHE_TTL);

    return result;
  }
}
