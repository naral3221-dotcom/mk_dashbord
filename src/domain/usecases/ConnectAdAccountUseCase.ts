import { AdAccount } from '../entities/AdAccount';
import { Platform, RolePermissions } from '../entities/types';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { IUserRepository } from '../repositories/IUserRepository';
import { IPlatformAdapterRegistry } from '../services/IPlatformAdapterRegistry';
import { ITokenEncryption } from '../services/ITokenEncryption';

export interface ConnectAdAccountInput {
  userId: string;
  organizationId: string;
  platform: Platform;
  externalAccountId: string;
  externalAccountName: string;
  // For OAuth platforms:
  authCode?: string;
  redirectUri?: string;
  // For API Key platforms:
  apiKey?: string;
  apiSecret?: string;
  customerId?: string;
}

export interface ConnectAdAccountOutput {
  adAccount: AdAccount;
  isNewAccount: boolean;
}

export class ConnectAdAccountUseCase {
  constructor(
    private readonly adAccountRepo: IAdAccountRepository,
    private readonly userRepo: IUserRepository,
    private readonly platformRegistry: IPlatformAdapterRegistry,
    private readonly tokenEncryption: ITokenEncryption,
  ) {}

  async execute(input: ConnectAdAccountInput): Promise<ConnectAdAccountOutput> {
    // 1. Find user and verify permissions
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.organizationId !== input.organizationId) {
      throw new Error('User does not belong to this organization');
    }
    if (!RolePermissions[user.role].canManageAdAccounts) {
      throw new Error('Insufficient permissions to manage ad accounts');
    }

    // 2. Get the platform adapter
    if (!this.platformRegistry.hasAdapter(input.platform)) {
      throw new Error(`Platform ${input.platform} is not supported`);
    }
    const adapter = this.platformRegistry.getAdapter(input.platform);

    // 3. Handle token acquisition based on auth type
    let encryptedAccessToken: string;
    let encryptedRefreshToken: string | null = null;
    let tokenExpiresAt: Date;

    if (adapter.authType === 'oauth') {
      // OAuth flow: exchange auth code for tokens
      if (!input.authCode) {
        throw new Error('Auth code is required for OAuth platforms');
      }
      if (!input.redirectUri) {
        throw new Error('Redirect URI is required for OAuth platforms');
      }

      const tokenResult = await adapter.exchangeCodeForToken(input.authCode, input.redirectUri);
      encryptedAccessToken = await this.tokenEncryption.encrypt(tokenResult.accessToken);

      if (tokenResult.refreshToken) {
        encryptedRefreshToken = await this.tokenEncryption.encrypt(tokenResult.refreshToken);
      }

      tokenExpiresAt = tokenResult.expiresAt;
    } else {
      // API Key flow: store credentials as JSON for platform adapters
      if (!input.apiKey) {
        throw new Error('API key is required for API Key platforms');
      }
      if (!input.apiSecret) {
        throw new Error('API secret is required for API Key platforms');
      }

      const credentials = JSON.stringify({
        apiKey: input.apiKey,
        apiSecret: input.apiSecret,
        customerId: input.customerId || input.externalAccountId,
      });
      encryptedAccessToken = await this.tokenEncryption.encrypt(credentials);
      encryptedRefreshToken = null;

      // API keys don't expire, set a far-future date
      tokenExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    // 4. Check if account already exists
    const existingAccount = await this.adAccountRepo.findByPlatformAndAccountId(
      input.organizationId,
      input.platform,
      input.externalAccountId,
    );

    let adAccount: AdAccount;
    let isNewAccount: boolean;

    if (existingAccount) {
      // Update existing account with new tokens
      adAccount = existingAccount.updateTokens(
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
      );
      // Reactivate if deactivated
      if (!adAccount.isActive) {
        adAccount = adAccount.activate();
      }
      isNewAccount = false;
    } else {
      // Create new ad account
      adAccount = AdAccount.create({
        platform: input.platform,
        accountId: input.externalAccountId,
        accountName: input.externalAccountName,
        organizationId: input.organizationId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
      });
      isNewAccount = true;
    }

    // 5. Save and return
    const savedAccount = await this.adAccountRepo.save(adAccount);
    return { adAccount: savedAccount, isNewAccount };
  }
}
