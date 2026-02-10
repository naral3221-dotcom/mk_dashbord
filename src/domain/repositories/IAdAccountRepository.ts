import { AdAccount } from '../entities/AdAccount';
import { Platform } from '../entities/types';

export interface IAdAccountRepository {
  findById(id: string): Promise<AdAccount | null>;
  findByOrganizationId(organizationId: string): Promise<AdAccount[]>;
  findByPlatform(organizationId: string, platform: Platform): Promise<AdAccount[]>;
  findByPlatformAndAccountId(organizationId: string, platform: Platform, accountId: string): Promise<AdAccount | null>;
  findActiveByOrganizationId(organizationId: string): Promise<AdAccount[]>;
  findWithExpiredTokens(): Promise<AdAccount[]>;
  save(adAccount: AdAccount): Promise<AdAccount>;
  delete(id: string): Promise<void>;
  countByOrganizationId(organizationId: string): Promise<number>;
}
