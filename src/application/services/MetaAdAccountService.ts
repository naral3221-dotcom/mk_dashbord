import { ConnectMetaAdAccountUseCase } from '@/domain/usecases/ConnectMetaAdAccountUseCase';
import { IAdAccountRepository } from '@/domain/repositories/IAdAccountRepository';
import { Platform } from '@/domain/entities/types';
import {
  MetaConnectAdAccountRequest,
  AdAccountResponse,
  MetaAdAccountListResponse,
  toAdAccountResponse,
} from '../dto/MetaDTO';

export class MetaAdAccountService {
  constructor(
    private readonly connectUseCase: ConnectMetaAdAccountUseCase,
    private readonly adAccountRepo: IAdAccountRepository,
  ) {}

  async connectAdAccount(request: MetaConnectAdAccountRequest): Promise<{ account: AdAccountResponse; isNew: boolean }> {
    const result = await this.connectUseCase.execute({
      userId: request.userId,
      organizationId: request.organizationId,
      shortLivedToken: request.shortLivedToken,
      metaAccountId: request.metaAccountId,
      metaAccountName: request.metaAccountName,
    });

    return {
      account: toAdAccountResponse(result.adAccount),
      isNew: result.isNewAccount,
    };
  }

  async getAdAccounts(organizationId: string): Promise<MetaAdAccountListResponse> {
    const accounts = await this.adAccountRepo.findByPlatform(organizationId, Platform.META);
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
