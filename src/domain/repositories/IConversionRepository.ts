import { Conversion } from '../entities/Conversion';
import { DateRange } from './ICampaignInsightRepository';

export interface IConversionRepository {
  findById(id: string): Promise<Conversion | null>;
  findByOrganizationId(organizationId: string): Promise<Conversion[]>;
  findByDateRange(organizationId: string, dateRange: DateRange): Promise<Conversion[]>;
  findBySource(organizationId: string, source: string): Promise<Conversion[]>;
  findByCampaign(organizationId: string, campaign: string): Promise<Conversion[]>;
  save(conversion: Conversion): Promise<Conversion>;
  saveMany(conversions: Conversion[]): Promise<Conversion[]>;
  delete(id: string): Promise<void>;
  countByOrganizationId(organizationId: string): Promise<number>;
}
