import { Plan, SubscriptionStatus } from '../entities/types';
import { ISubscriptionRepository } from '../repositories/ISubscriptionRepository';
import { IOrganizationRepository } from '../repositories/IOrganizationRepository';
import { NotFoundError } from '../errors';

export interface GetSubscriptionInput {
  organizationId: string;
}

export interface GetSubscriptionOutput {
  subscription: {
    id: string;
    plan: Plan;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
  } | null;
  plan: Plan;
}

export class GetSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly orgRepo: IOrganizationRepository,
  ) {}

  async execute(
    input: GetSubscriptionInput,
  ): Promise<GetSubscriptionOutput> {
    // 1. Find organization
    const org = await this.orgRepo.findById(input.organizationId);
    if (!org) {
      throw new NotFoundError('Organization');
    }

    // 2. Find subscription by organization ID
    const subscription = await this.subscriptionRepo.findByOrganizationId(
      input.organizationId,
    );

    // 3. Return subscription details and org plan
    return {
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            canceledAt: subscription.canceledAt,
          }
        : null,
      plan: org.plan,
    };
  }
}
