import { Platform } from '@/domain/entities/types';

export interface MetaConnectAdAccountRequest {
  userId: string;
  organizationId: string;
  shortLivedToken: string;
  metaAccountId: string;
  metaAccountName: string;
}

export interface AdAccountResponse {
  id: string;
  platform: Platform;
  accountId: string;
  accountName: string;
  isActive: boolean;
  tokenExpiresAt: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MetaAdAccountListResponse {
  accounts: AdAccountResponse[];
  total: number;
}

export interface SyncCampaignsResponse {
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}

export interface SyncInsightsResponse {
  synced: number;
  created: number;
  updated: number;
  dateRange: { start: string; end: string };
  errors: string[];
}

export interface DateRangeRequest {
  startDate: string;
  endDate: string;
}

export interface BulkSyncResponse {
  totalAccounts: number;
  successful: number;
  failed: number;
  results: Array<{
    adAccountId: string;
    accountName: string;
    campaigns: SyncCampaignsResponse | null;
    error: string | null;
  }>;
}

export function toAdAccountResponse(adAccount: {
  id: string;
  platform: Platform;
  accountId: string;
  accountName: string;
  isActive: boolean;
  tokenExpiresAt: Date | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}): AdAccountResponse {
  return {
    id: adAccount.id,
    platform: adAccount.platform,
    accountId: adAccount.accountId,
    accountName: adAccount.accountName,
    isActive: adAccount.isActive,
    tokenExpiresAt: adAccount.tokenExpiresAt?.toISOString() ?? null,
    organizationId: adAccount.organizationId,
    createdAt: adAccount.createdAt.toISOString(),
    updatedAt: adAccount.updatedAt.toISOString(),
  };
}
