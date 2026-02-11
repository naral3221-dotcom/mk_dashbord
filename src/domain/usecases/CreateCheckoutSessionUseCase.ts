import { Plan, RolePermissions } from '../entities/types';
import { IUserRepository } from '../repositories/IUserRepository';
import { IOrganizationRepository } from '../repositories/IOrganizationRepository';
import { IPaymentGateway } from '../services/IPaymentGateway';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors';

export interface CreateCheckoutSessionInput {
  userId: string;
  organizationId: string;
  plan: Plan;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutSessionOutput {
  sessionId: string;
  url: string;
}

const PLAN_HIERARCHY: readonly Plan[] = [
  Plan.FREE,
  Plan.STARTER,
  Plan.PRO,
  Plan.ENTERPRISE,
];

export class CreateCheckoutSessionUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly orgRepo: IOrganizationRepository,
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(
    input: CreateCheckoutSessionInput,
  ): Promise<CreateCheckoutSessionOutput> {
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

    // 5. Cannot checkout for free plan
    if (input.plan === Plan.FREE) {
      throw new ValidationError('Cannot checkout for free plan');
    }

    // 6. Cannot downgrade or stay on same plan
    const currentIndex = PLAN_HIERARCHY.indexOf(org.plan);
    const targetIndex = PLAN_HIERARCHY.indexOf(input.plan);
    if (targetIndex <= currentIndex) {
      throw new ValidationError(
        'Cannot downgrade via checkout. Use the customer portal.',
      );
    }

    // 7. Create checkout session via payment gateway
    const result = await this.paymentGateway.createCheckoutSession({
      organizationId: input.organizationId,
      stripeCustomerId: org.stripeCustomerId,
      plan: input.plan,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      customerEmail: user.email,
    });

    // 8. Return session details
    return {
      sessionId: result.sessionId,
      url: result.url,
    };
  }
}
