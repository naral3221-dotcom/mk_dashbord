import { Campaign } from '../entities/Campaign';
import { CampaignStatus } from '../entities/types';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { ICampaignRepository } from '../repositories/ICampaignRepository';
import { IMetaApiClient } from '../services/IMetaApiClient';
import { ITokenEncryption } from '../services/ITokenEncryption';
import { NotFoundError, ValidationError } from '../errors';

export interface SyncMetaCampaignsInput {
  adAccountId: string;
}

export interface SyncMetaCampaignsOutput {
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}

export class SyncMetaCampaignsUseCase {
  constructor(
    private readonly adAccountRepo: IAdAccountRepository,
    private readonly campaignRepo: ICampaignRepository,
    private readonly metaApiClient: IMetaApiClient,
    private readonly tokenEncryption: ITokenEncryption,
  ) {}

  async execute(input: SyncMetaCampaignsInput): Promise<SyncMetaCampaignsOutput> {
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

    // 2. Decrypt token
    const decryptedToken = await this.tokenEncryption.decrypt(adAccount.accessToken);

    // 3. Fetch campaigns from META
    const metaCampaigns = await this.metaApiClient.getCampaigns(
      decryptedToken,
      `act_${adAccount.accountId}`,
    );

    // 4. Map and save campaigns
    let created = 0;
    let updated = 0;
    const campaignsToSave: Campaign[] = [];

    for (const metaCampaign of metaCampaigns) {
      try {
        const existingCampaign = await this.campaignRepo.findByExternalId(
          adAccount.id,
          metaCampaign.id,
        );

        const status = this.mapMetaStatus(metaCampaign.status);

        if (existingCampaign) {
          // Update existing campaign
          let updatedCampaign = existingCampaign;
          if (existingCampaign.name !== metaCampaign.name) {
            updatedCampaign = updatedCampaign.updateName(metaCampaign.name);
          }
          if (existingCampaign.status !== status) {
            updatedCampaign = updatedCampaign.changeStatus(status);
          }
          campaignsToSave.push(updatedCampaign);
          updated++;
        } else {
          // Create new campaign
          const newCampaign = Campaign.create({
            externalId: metaCampaign.id,
            name: metaCampaign.name,
            adAccountId: adAccount.id,
            status,
          });
          campaignsToSave.push(newCampaign);
          created++;
        }
      } catch (err) {
        errors.push(
          `Failed to sync campaign ${metaCampaign.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // 5. Batch save
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

  private mapMetaStatus(metaStatus: string): CampaignStatus {
    switch (metaStatus.toUpperCase()) {
      case 'ACTIVE':
        return CampaignStatus.ACTIVE;
      case 'PAUSED':
        return CampaignStatus.PAUSED;
      case 'DELETED':
        return CampaignStatus.DELETED;
      case 'ARCHIVED':
        return CampaignStatus.ARCHIVED;
      default:
        return CampaignStatus.PAUSED;
    }
  }
}
