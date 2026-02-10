import { Campaign } from '../entities/Campaign';
import { CampaignStatus } from '../entities/types';

export interface ICampaignRepository {
  findById(id: string): Promise<Campaign | null>;
  findByAdAccountId(adAccountId: string): Promise<Campaign[]>;
  findByExternalId(adAccountId: string, externalId: string): Promise<Campaign | null>;
  findByStatus(adAccountId: string, status: CampaignStatus): Promise<Campaign[]>;
  findActiveCampaigns(adAccountId: string): Promise<Campaign[]>;
  save(campaign: Campaign): Promise<Campaign>;
  saveMany(campaigns: Campaign[]): Promise<Campaign[]>;
  delete(id: string): Promise<void>;
  countByStatus(adAccountId: string, status: CampaignStatus): Promise<number>;
}
