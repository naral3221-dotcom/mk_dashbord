import { CampaignInsight } from '../entities/CampaignInsight';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ICampaignInsightRepository {
  findById(id: string): Promise<CampaignInsight | null>;
  findByCampaignId(campaignId: string): Promise<CampaignInsight[]>;
  findByCampaignAndDateRange(campaignId: string, dateRange: DateRange): Promise<CampaignInsight[]>;
  findByCampaignAndDate(campaignId: string, date: Date): Promise<CampaignInsight | null>;
  save(insight: CampaignInsight): Promise<CampaignInsight>;
  saveMany(insights: CampaignInsight[]): Promise<CampaignInsight[]>;
  delete(id: string): Promise<void>;
  deleteOlderThan(date: Date): Promise<number>;
}
