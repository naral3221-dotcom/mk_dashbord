import { Campaign } from '../entities/Campaign';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { ICampaignRepository } from '../repositories/ICampaignRepository';
import { IPlatformAdapterRegistry } from '../services/IPlatformAdapterRegistry';
import { ITokenEncryption } from '../services/ITokenEncryption';
import { NotFoundError, ValidationError } from '../errors';

export interface SyncCampaignsInput {
  adAccountId: string;
}

export interface SyncCampaignsOutput {
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}

export class SyncCampaignsUseCase {
  constructor(
    private readonly adAccountRepo: IAdAccountRepository,
    private readonly campaignRepo: ICampaignRepository,
    private readonly platformRegistry: IPlatformAdapterRegistry,
    private readonly tokenEncryption: ITokenEncryption,
  ) {}

  async execute(input: SyncCampaignsInput): Promise<SyncCampaignsOutput> {
    const errors: string[] = [];

    // 1. Find ad account
    const adAccount = await this.adAccountRepo.findById(input.adAccountId);
    if (!adAccount) {
      throw new NotFoundError('Ad account');
    }
    if (!adAccount.isActive) {
      throw new ValidationError('Ad account is not active');
    }
    if (!adAccount.accessToken) {
      throw new ValidationError('Ad account has no access token');
    }

    // 2. Get platform adapter
    const adapter = this.platformRegistry.getAdapter(adAccount.platform);

    // 3. Decrypt token
    const decryptedToken = await this.tokenEncryption.decrypt(adAccount.accessToken);

    // 4. Fetch campaigns from platform (adapter handles accountId formatting)
    const platformCampaigns = await adapter.getCampaigns(
      decryptedToken,
      adAccount.accountId,
    );

    // 5. Map and save campaigns
    let created = 0;
    let updated = 0;
    const campaignsToSave: Campaign[] = [];

    for (const platformCampaign of platformCampaigns) {
      try {
        const existingCampaign = await this.campaignRepo.findByExternalId(
          adAccount.id,
          platformCampaign.externalCampaignId,
        );

        if (existingCampaign) {
          // Update existing campaign
          let updatedCampaign = existingCampaign;
          if (existingCampaign.name !== platformCampaign.name) {
            updatedCampaign = updatedCampaign.updateName(platformCampaign.name);
          }
          if (existingCampaign.status !== platformCampaign.status) {
            updatedCampaign = updatedCampaign.changeStatus(platformCampaign.status);
          }
          campaignsToSave.push(updatedCampaign);
          updated++;
        } else {
          // Create new campaign
          const newCampaign = Campaign.create({
            externalId: platformCampaign.externalCampaignId,
            name: platformCampaign.name,
            adAccountId: adAccount.id,
            status: platformCampaign.status,
          });
          campaignsToSave.push(newCampaign);
          created++;
        }
      } catch (err) {
        errors.push(
          `Failed to sync campaign ${platformCampaign.externalCampaignId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // 6. Batch save
    if (campaignsToSave.length > 0) {
      await this.campaignRepo.saveMany(campaignsToSave);
    }

    return {
      synced: created + updated,
      created,
      updated,
      errors,
    };
  }
}
