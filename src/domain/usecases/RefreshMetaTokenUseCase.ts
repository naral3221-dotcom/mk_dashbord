import { AdAccount } from '../entities/AdAccount';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { IMetaApiClient } from '../services/IMetaApiClient';
import { ITokenEncryption } from '../services/ITokenEncryption';

export interface RefreshMetaTokenInput {
  adAccountId: string;
}

export interface RefreshMetaTokenOutput {
  adAccount: AdAccount;
  isValid: boolean;
  expiresAt: Date | null;
  needsReauth: boolean;
}

export class RefreshMetaTokenUseCase {
  constructor(
    private readonly adAccountRepo: IAdAccountRepository,
    private readonly metaApiClient: IMetaApiClient,
    private readonly tokenEncryption: ITokenEncryption,
  ) {}

  async execute(input: RefreshMetaTokenInput): Promise<RefreshMetaTokenOutput> {
    // 1. Find ad account
    const adAccount = await this.adAccountRepo.findById(input.adAccountId);
    if (!adAccount) {
      throw new Error('Ad account not found');
    }

    if (!adAccount.accessToken) {
      throw new Error('Ad account has no access token');
    }

    // 2. Decrypt the stored token
    const decryptedToken = await this.tokenEncryption.decrypt(adAccount.accessToken);

    // 3. Validate with META API
    const isValid = await this.metaApiClient.validateToken(decryptedToken);

    // 4. Check if token is expired or about to expire (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const needsReauth = !isValid ||
      adAccount.isTokenExpired() ||
      (adAccount.tokenExpiresAt !== null && adAccount.tokenExpiresAt <= sevenDaysFromNow);

    return {
      adAccount,
      isValid,
      expiresAt: adAccount.tokenExpiresAt,
      needsReauth,
    };
  }
}
