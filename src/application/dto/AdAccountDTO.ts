import { Platform } from '@/domain/entities/types';
import { AdAccountResponse } from './MetaDTO';

export interface ConnectAdAccountRequest {
  userId: string;
  organizationId: string;
  platform: Platform;
  externalAccountId: string;
  externalAccountName: string;
  // OAuth platforms
  authCode?: string;
  redirectUri?: string;
  // API Key platforms
  apiKey?: string;
  apiSecret?: string;
  customerId?: string;
}

export interface AdAccountListResponse {
  accounts: AdAccountResponse[];
  total: number;
}
