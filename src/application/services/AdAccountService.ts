import { ConnectAdAccountUseCase } from '@/domain/usecases/ConnectAdAccountUseCase';
import { IAdAccountRepository } from '@/domain/repositories/IAdAccountRepository';
import { Platform } from '@/domain/entities/types';
import { AdAccountResponse, toAdAccountResponse } from '../dto/MetaDTO';
import { ConnectAdAccountRequest, AdAccountListResponse } from '../dto/AdAccountDTO';

export class AdAccountService {
  constructor(
    private readonly connectUseCase: ConnectAdAccountUseCase,
    private readonly adAccountRepo: IAdAccountRepository,
  ) {}

  async connectAdAccount(request: ConnectAdAccountRequest): Promise<{ account: AdAccountResponse; isNew: boolean }> {
    const result = await this.connectUseCase.execute({
      userId: request.userId,
      organizationId: request.organizationId,
      platform: request.platform,
      externalAccountId: request.externalAccountId,
      externalAccountName: request.externalAccountName,
      authCode: request.authCode,
      redirectUri: request.redirectUri,
      apiKey: request.apiKey,
      apiSecret: request.apiSecret,
      customerId: request.customerId,
    });

    return {
      account: toAdAccountResponse(result.adAccount),
      isNew: result.isNewAccount,
    };
  }

  async getAdAccounts(organizationId: string, platform?: Platform): Promise<AdAccountListResponse> {
    let accounts;
    if (platform) {
      accounts = await this.adAccountRepo.findByPlatform(organizationId, platform);
    } else {
      accounts = await this.adAccountRepo.findByOrganizationId(organizationId);
    }

    return {
      accounts: accounts.map(toAdAccountResponse),
      total: accounts.length,
    };
  }

  async disconnectAdAccount(adAccountId: string): Promise<void> {
    const adAccount = await this.adAccountRepo.findById(adAccountId);
    if (!adAccount) {
      throw new Error('Ad account not found');
    }

    const deactivated = adAccount.deactivate();
    await this.adAccountRepo.save(deactivated);
  }
}
