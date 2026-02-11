import { Platform, PlanLimits } from '../entities/types';
import { IOrganizationRepository } from '../repositories/IOrganizationRepository';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { IUserRepository } from '../repositories/IUserRepository';
import { NotFoundError, ValidationError } from '../errors';

export type FeatureKey =
  | 'maxAdAccounts'
  | 'maxUsers'
  | 'allowedPlatforms'
  | 'hasAutoSync'
  | 'hasExports';

export interface CheckFeatureAccessInput {
  organizationId: string;
  feature: FeatureKey;
  platform?: Platform;
}

export interface CheckFeatureAccessOutput {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
}

export class CheckFeatureAccessUseCase {
  constructor(
    private readonly orgRepo: IOrganizationRepository,
    private readonly adAccountRepo: IAdAccountRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    input: CheckFeatureAccessInput,
  ): Promise<CheckFeatureAccessOutput> {
    // 1. Find organization
    const org = await this.orgRepo.findById(input.organizationId);
    if (!org) {
      throw new NotFoundError('Organization');
    }

    // 2. Get plan limits
    const planLimits = PlanLimits[org.plan];

    // 3. Check based on feature
    switch (input.feature) {
      case 'maxAdAccounts': {
        const count = await this.adAccountRepo.countByOrganizationId(
          input.organizationId,
        );
        const limit = planLimits.maxAdAccounts;
        if (limit === -1) {
          return { allowed: true, currentUsage: count, limit };
        }
        const allowed = count < limit;
        return {
          allowed,
          currentUsage: count,
          limit,
          reason: allowed ? undefined : 'Ad account limit reached',
        };
      }

      case 'maxUsers': {
        const count = await this.userRepo.countByOrganizationId(
          input.organizationId,
        );
        const limit = planLimits.maxUsers;
        if (limit === -1) {
          return { allowed: true, currentUsage: count, limit };
        }
        const allowed = count < limit;
        return {
          allowed,
          currentUsage: count,
          limit,
          reason: allowed ? undefined : 'User limit reached',
        };
      }

      case 'allowedPlatforms': {
        if (!input.platform) {
          throw new ValidationError(
            'Platform is required for allowedPlatforms check',
          );
        }
        const allowed = (
          planLimits.allowedPlatforms as readonly Platform[]
        ).includes(input.platform);
        return {
          allowed,
          reason: allowed
            ? undefined
            : `Platform ${input.platform} is not available on the ${org.plan} plan`,
        };
      }

      case 'hasAutoSync': {
        const allowed = planLimits.hasAutoSync;
        return {
          allowed,
          reason: allowed
            ? undefined
            : 'Auto sync is not available on the FREE plan',
        };
      }

      case 'hasExports': {
        const allowed = planLimits.hasExports;
        return {
          allowed,
          reason: allowed
            ? undefined
            : `Exports are not available on the ${org.plan} plan`,
        };
      }
    }
  }
}
