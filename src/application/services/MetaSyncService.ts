import { SyncMetaCampaignsUseCase } from '@/domain/usecases/SyncMetaCampaignsUseCase';
import { SyncMetaInsightsUseCase } from '@/domain/usecases/SyncMetaInsightsUseCase';
import { IAdAccountRepository } from '@/domain/repositories/IAdAccountRepository';
import { ICampaignRepository } from '@/domain/repositories/ICampaignRepository';
import { Platform } from '@/domain/entities/types';
import {
  SyncCampaignsResponse,
  SyncInsightsResponse,
  BulkSyncResponse,
} from '../dto/MetaDTO';

export class MetaSyncService {
  constructor(
    private readonly syncCampaignsUseCase: SyncMetaCampaignsUseCase,
    private readonly syncInsightsUseCase: SyncMetaInsightsUseCase,
    private readonly adAccountRepo: IAdAccountRepository,
    private readonly campaignRepo: ICampaignRepository,
  ) {}

  async syncCampaigns(adAccountId: string): Promise<SyncCampaignsResponse> {
    const result = await this.syncCampaignsUseCase.execute({ adAccountId });
    return {
      synced: result.synced,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
    };
  }

  async syncInsights(
    campaignId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SyncInsightsResponse> {
    const result = await this.syncInsightsUseCase.execute({
      campaignId,
      startDate,
      endDate,
    });
    return {
      synced: result.synced,
      created: result.created,
      updated: result.updated,
      dateRange: {
        start: result.dateRange.start.toISOString(),
        end: result.dateRange.end.toISOString(),
      },
      errors: result.errors,
    };
  }

  async syncAllActiveAccounts(organizationId: string): Promise<BulkSyncResponse> {
    const accounts = await this.adAccountRepo.findByPlatform(organizationId, Platform.META);
    const activeAccounts = accounts.filter((a) => a.isActive);

    const results: BulkSyncResponse['results'] = [];
    let successful = 0;
    let failed = 0;

    for (const account of activeAccounts) {
      try {
        const campaignResult = await this.syncCampaignsUseCase.execute({
          adAccountId: account.id,
        });

        // Sync insights for active campaigns (last 30 days)
        const campaigns = await this.campaignRepo.findActiveCampaigns(account.id);
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        for (const campaign of campaigns) {
          try {
            await this.syncInsightsUseCase.execute({
              campaignId: campaign.id,
              startDate: thirtyDaysAgo,
              endDate: now,
            });
          } catch {
            // Individual insight sync failures don't fail the whole account
          }
        }

        results.push({
          adAccountId: account.id,
          accountName: account.accountName,
          campaigns: {
            synced: campaignResult.synced,
            created: campaignResult.created,
            updated: campaignResult.updated,
            errors: campaignResult.errors,
          },
          error: null,
        });
        successful++;
      } catch (err) {
        results.push({
          adAccountId: account.id,
          accountName: account.accountName,
          campaigns: null,
          error: err instanceof Error ? err.message : String(err),
        });
        failed++;
      }
    }

    return {
      totalAccounts: activeAccounts.length,
      successful,
      failed,
      results,
    };
  }
}
