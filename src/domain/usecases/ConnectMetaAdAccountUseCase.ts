import { AdAccount } from '../entities/AdAccount';
import { Platform, RolePermissions } from '../entities/types';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { IUserRepository } from '../repositories/IUserRepository';
import { IMetaApiClient } from '../services/IMetaApiClient';
import { ITokenEncryption } from '../services/ITokenEncryption';

export interface ConnectMetaAdAccountInput {
  userId: string;
  organizationId: string;
  shortLivedToken: string;
  metaAccountId: string;
  metaAccountName: string;
}

export interface ConnectMetaAdAccountOutput {
  adAccount: AdAccount;
  isNewAccount: boolean;
}

export class ConnectMetaAdAccountUseCase {
  constructor(
    private readonly adAccountRepo: IAdAccountRepository,
    private readonly userRepo: IUserRepository,
    private readonly metaApiClient: IMetaApiClient,
    private readonly tokenEncryption: ITokenEncryption,
  ) {}

  async execute(input: ConnectMetaAdAccountInput): Promise<ConnectMetaAdAccountOutput> {
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

    // 2. Exchange short-lived token for long-lived token
    const tokenResult = await this.metaApiClient.exchangeToken(input.shortLivedToken);

    // 3. Encrypt the long-lived token
    const encryptedToken = await this.tokenEncryption.encrypt(tokenResult.accessToken);

    // 4. Check if account already exists
    const existingAccount = await this.adAccountRepo.findByPlatformAndAccountId(
      input.organizationId,
      Platform.META,
      input.metaAccountId,
    );

    let adAccount: AdAccount;
    let isNewAccount: boolean;

    if (existingAccount) {
      // Update existing account with new tokens
      adAccount = existingAccount.updateTokens(
        encryptedToken,
        null,
        tokenResult.expiresAt,
      );
      // Reactivate if deactivated
      if (!adAccount.isActive) {
        adAccount = adAccount.activate();
      }
      isNewAccount = false;
    } else {
      // Create new ad account
      adAccount = AdAccount.create({
        platform: Platform.META,
        accountId: input.metaAccountId,
        accountName: input.metaAccountName,
        organizationId: input.organizationId,
        accessToken: encryptedToken,
        tokenExpiresAt: tokenResult.expiresAt,
      });
      isNewAccount = true;
    }

    // 5. Save and return
    const savedAccount = await this.adAccountRepo.save(adAccount);
    return { adAccount: savedAccount, isNewAccount };
  }
}
