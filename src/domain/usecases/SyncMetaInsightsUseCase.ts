import { CampaignInsight } from '../entities/CampaignInsight';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { ICampaignRepository } from '../repositories/ICampaignRepository';
import { ICampaignInsightRepository } from '../repositories/ICampaignInsightRepository';
import { IMetaApiClient } from '../services/IMetaApiClient';
import { ITokenEncryption } from '../services/ITokenEncryption';
import { ICacheService } from '../services/ICacheService';
import { NotFoundError, ValidationError } from '../errors';

export interface SyncMetaInsightsInput {
  campaignId: string;
  startDate: Date;
  endDate: Date;
}

export interface SyncMetaInsightsOutput {
  synced: number;
  created: number;
  updated: number;
  dateRange: { start: Date; end: Date };
  errors: string[];
}

export class SyncMetaInsightsUseCase {
  private static readonly CACHE_TTL = 86400; // 24 hours in seconds

  constructor(
    private readonly campaignRepo: ICampaignRepository,
    private readonly adAccountRepo: IAdAccountRepository,
    private readonly insightRepo: ICampaignInsightRepository,
    private readonly metaApiClient: IMetaApiClient,
    private readonly tokenEncryption: ITokenEncryption,
    private readonly cacheService: ICacheService,
  ) {}

  async execute(input: SyncMetaInsightsInput): Promise<SyncMetaInsightsOutput> {
    const errors: string[] = [];

    // 1. Find campaign and its ad account
    const campaign = await this.campaignRepo.findById(input.campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    const adAccount = await this.adAccountRepo.findById(campaign.adAccountId);
    if (!adAccount) {
      throw new NotFoundError('Ad account');
    }
    if (!adAccount.accessToken) {
      throw new ValidationError('Ad account has no access token');
    }

    // 2. Check cache
    const cacheKey = `insights:${campaign.externalId}:${input.startDate.toISOString()}:${input.endDate.toISOString()}`;
    const cached = await this.cacheService.get<SyncMetaInsightsOutput>(cacheKey);
    if (cached) {
      return cached;
    }

    // 3. Decrypt token
    const decryptedToken = await this.tokenEncryption.decrypt(adAccount.accessToken);

    // 4. Fetch insights from META
    const metaInsights = await this.metaApiClient.getInsights(
      decryptedToken,
      campaign.externalId,
      input.startDate,
      input.endDate,
    );

    // 5. Map and save insights
    let created = 0;
    let updated = 0;
    const insightsToSave: CampaignInsight[] = [];

    for (const metaInsight of metaInsights) {
      try {
        const insightDate = new Date(metaInsight.dateStart);
        const existingInsight = await this.insightRepo.findByCampaignAndDate(
          campaign.id,
          insightDate,
        );

        if (existingInsight) {
          // Update existing insight
          const updatedInsight = existingInsight.updateMetrics({
            spend: parseFloat(metaInsight.spend),
            impressions: parseInt(metaInsight.impressions, 10),
            clicks: parseInt(metaInsight.clicks, 10),
            conversions: parseInt(metaInsight.conversions, 10),
            revenue: parseFloat(metaInsight.revenue),
          });
          insightsToSave.push(updatedInsight);
          updated++;
        } else {
          // Create new insight
          const newInsight = CampaignInsight.create({
            date: insightDate,
            spend: parseFloat(metaInsight.spend),
            impressions: parseInt(metaInsight.impressions, 10),
            clicks: parseInt(metaInsight.clicks, 10),
            conversions: parseInt(metaInsight.conversions, 10),
            revenue: parseFloat(metaInsight.revenue),
            campaignId: campaign.id,
          });
          insightsToSave.push(newInsight);
          created++;
        }
      } catch (err) {
        errors.push(
          `Failed to sync insight for ${metaInsight.dateStart}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // 6. Batch save
    if (insightsToSave.length > 0) {
      await this.insightRepo.saveMany(insightsToSave);
    }

    // 7. Build result and cache it
    const result: SyncMetaInsightsOutput = {
      synced: created + updated,
      created,
      updated,
      dateRange: { start: input.startDate, end: input.endDate },
      errors,
    };

    await this.cacheService.set(cacheKey, result, SyncMetaInsightsUseCase.CACHE_TTL);

    return result;
  }
}
