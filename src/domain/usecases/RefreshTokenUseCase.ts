import { AdAccount } from '../entities/AdAccount';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { IPlatformAdapterRegistry } from '../services/IPlatformAdapterRegistry';
import { ITokenEncryption } from '../services/ITokenEncryption';

export interface RefreshTokenInput {
  adAccountId: string;
}

export interface RefreshTokenOutput {
  adAccount: AdAccount;
  isValid: boolean;
  expiresAt: Date | null;
  needsReauth: boolean;
  wasRefreshed: boolean;
}

export class RefreshTokenUseCase {
  constructor(
    private readonly adAccountRepo: IAdAccountRepository,
    private readonly adapterRegistry: IPlatformAdapterRegistry,
    private readonly tokenEncryption: ITokenEncryption,
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    // 1. Find ad account and validate
    const adAccount = await this.adAccountRepo.findById(input.adAccountId);
    if (!adAccount) {
      throw new Error('Ad account not found');
    }

    if (!adAccount.accessToken) {
      throw new Error('Ad account has no access token');
    }

    // 2. Get the platform adapter
    const adapter = this.adapterRegistry.getAdapter(adAccount.platform);

    // 3. Decrypt the stored access token
    const decryptedAccessToken = await this.tokenEncryption.decrypt(adAccount.accessToken);

    // 4. Validate the current token
    const isValid = await adapter.validateToken(decryptedAccessToken);

    // 5. Check if token is expiring within 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const isExpiringSoon = adAccount.tokenExpiresAt !== null &&
      adAccount.tokenExpiresAt <= sevenDaysFromNow;

    const needsRefresh = !isValid || adAccount.isTokenExpired() || isExpiringSoon;

    // 6. If token needs refresh, attempt to refresh
    if (needsRefresh) {
      if (adAccount.refreshToken) {
        try {
          const decryptedRefreshToken = await this.tokenEncryption.decrypt(adAccount.refreshToken);
          const tokenResult = await adapter.refreshAccessToken(decryptedRefreshToken);

          // Encrypt new tokens
          const encryptedAccessToken = await this.tokenEncryption.encrypt(tokenResult.accessToken);
          const encryptedRefreshToken = tokenResult.refreshToken
            ? await this.tokenEncryption.encrypt(tokenResult.refreshToken)
            : null;

          // Update and save account
          const updatedAccount = adAccount.updateTokens(
            encryptedAccessToken,
            encryptedRefreshToken,
            tokenResult.expiresAt,
          );
          const savedAccount = await this.adAccountRepo.save(updatedAccount);

          return {
            adAccount: savedAccount,
            isValid: true,
            expiresAt: tokenResult.expiresAt,
            needsReauth: false,
            wasRefreshed: true,
          };
        } catch {
          // Refresh failed - user needs to re-authenticate
          return {
            adAccount,
            isValid: false,
            expiresAt: adAccount.tokenExpiresAt,
            needsReauth: true,
            wasRefreshed: false,
          };
        }
      }

      // No refresh token available - needs re-authentication
      return {
        adAccount,
        isValid,
        expiresAt: adAccount.tokenExpiresAt,
        needsReauth: true,
        wasRefreshed: false,
      };
    }

    // 7. Token is healthy
    return {
      adAccount,
      isValid: true,
      expiresAt: adAccount.tokenExpiresAt,
      needsReauth: false,
      wasRefreshed: false,
    };
  }
}
