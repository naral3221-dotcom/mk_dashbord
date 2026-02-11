import { RolePermissions } from '../entities/types';
import { IUserRepository } from '../repositories/IUserRepository';
import { IOrganizationRepository } from '../repositories/IOrganizationRepository';
import { IPaymentGateway } from '../services/IPaymentGateway';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors';

export interface CreatePortalSessionInput {
  userId: string;
  organizationId: string;
  returnUrl: string;
}

export interface CreatePortalSessionOutput {
  url: string;
}

export class CreatePortalSessionUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly orgRepo: IOrganizationRepository,
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(
    input: CreatePortalSessionInput,
  ): Promise<CreatePortalSessionOutput> {
    // 1. Find user
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // 2. Verify user belongs to the organization
    if (user.organizationId !== input.organizationId) {
      throw new ValidationError('User does not belong to this organization');
    }

    // 3. Verify billing permission
    const permissions = RolePermissions[user.role];
    if (!permissions.canManageBilling) {
      throw new ForbiddenError('Only organization owners can manage billing');
    }

    // 4. Find organization
    const org = await this.orgRepo.findById(input.organizationId);
    if (!org) {
      throw new NotFoundError('Organization');
    }

    // 5. Verify stripe customer ID exists
    if (!org.stripeCustomerId) {
      throw new ValidationError(
        'No billing account found. Please subscribe to a plan first.',
      );
    }

    // 6. Create portal session via payment gateway
    const result = await this.paymentGateway.createPortalSession({
      stripeCustomerId: org.stripeCustomerId,
      returnUrl: input.returnUrl,
    });

    // 7. Return portal URL
    return {
      url: result.url,
    };
  }
}
