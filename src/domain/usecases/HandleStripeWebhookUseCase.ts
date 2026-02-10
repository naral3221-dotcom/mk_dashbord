import { Subscription } from '../entities/Subscription';
import { BillingEvent } from '../entities/BillingEvent';
import { Organization } from '../entities/Organization';
import { Plan, SubscriptionStatus } from '../entities/types';
import { ISubscriptionRepository } from '../repositories/ISubscriptionRepository';
import { IBillingEventRepository } from '../repositories/IBillingEventRepository';
import { IOrganizationRepository } from '../repositories/IOrganizationRepository';
import {
  IPaymentGateway,
  SubscriptionData,
} from '../services/IPaymentGateway';

export interface HandleStripeWebhookInput {
  payload: string;
  signature: string;
}

export interface HandleStripeWebhookOutput {
  eventType: string;
  processed: boolean;
}

export class HandleStripeWebhookUseCase {
  constructor(
    private readonly paymentGateway: IPaymentGateway,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly billingEventRepo: IBillingEventRepository,
    private readonly orgRepo: IOrganizationRepository,
    private readonly planFromPriceId: (priceId: string) => Plan,
  ) {}

  async execute(
    input: HandleStripeWebhookInput,
  ): Promise<HandleStripeWebhookOutput> {
    // 1. Construct and verify webhook event
    const event = await this.paymentGateway.constructWebhookEvent(
      input.payload,
      input.signature,
    );

    // 2. Idempotency check
    const existingEvent = await this.billingEventRepo.findByStripeEventId(
      event.id,
    );
    if (existingEvent) {
      return { eventType: event.type, processed: false };
    }

    // 3. Handle event by type
    let organizationId: string | null = null;

    switch (event.type) {
      case 'checkout.session.completed':
        organizationId = await this.handleCheckoutSessionCompleted(event.data);
        break;

      case 'invoice.paid':
        organizationId = await this.handleInvoicePaid(event.data);
        break;

      case 'invoice.payment_failed':
        organizationId = await this.handleInvoicePaymentFailed(event.data);
        break;

      case 'customer.subscription.updated':
        organizationId =
          await this.handleCustomerSubscriptionUpdated(event.data);
        break;

      case 'customer.subscription.deleted':
        organizationId =
          await this.handleCustomerSubscriptionDeleted(event.data);
        break;

      default:
        // Unrecognized event type - no-op
        break;
    }

    // 4. Save billing event if we have an organizationId
    if (organizationId) {
      const billingEvent = BillingEvent.create({
        organizationId,
        eventType: event.type,
        stripeEventId: event.id,
        data: event.data,
      });
      await this.billingEventRepo.save(billingEvent);
    }

    return { eventType: event.type, processed: true };
  }

  private async handleCheckoutSessionCompleted(
    data: Record<string, unknown>,
  ): Promise<string> {
    const subscription = data.subscription as string | undefined;
    const customer = data.customer as string | undefined;
    const metadata = data.metadata as Record<string, string> | undefined;
    const organizationId = metadata?.organizationId;

    if (!subscription || !customer || !organizationId) {
      throw new Error('Missing required checkout session data');
    }

    // Find organization
    const org = await this.orgRepo.findById(organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    // Get subscription data from Stripe
    const subData = await this.paymentGateway.getSubscription(subscription);

    // Determine plan from price ID
    const plan = this.planFromPriceId(subData.priceId);

    // Create and save subscription
    const newSubscription = Subscription.create({
      organizationId,
      stripeSubscriptionId: subscription,
      stripePriceId: subData.priceId,
      plan,
      status: this.mapStatus(subData.status),
      currentPeriodStart: subData.currentPeriodStart,
      currentPeriodEnd: subData.currentPeriodEnd,
    });
    await this.subscriptionRepo.save(newSubscription);

    // Update org: set stripeCustomerId if not set
    let updatedOrg = org;
    if (!org.stripeCustomerId) {
      updatedOrg = org.setStripeCustomerId(customer);
    }

    // Update org plan
    updatedOrg = Organization.reconstruct({
      ...updatedOrg.toObject(),
      plan,
      updatedAt: new Date(),
    });
    await this.orgRepo.save(updatedOrg);

    return organizationId;
  }

  private async handleInvoicePaid(
    data: Record<string, unknown>,
  ): Promise<string | null> {
    const stripeSubId = data.subscription as string;

    const subscription =
      await this.subscriptionRepo.findByStripeSubscriptionId(stripeSubId);
    if (!subscription) {
      return null;
    }

    // Get fresh subscription data from Stripe
    const subData = await this.paymentGateway.getSubscription(stripeSubId);

    // Update period and status
    let updated = subscription.updatePeriod(
      subData.currentPeriodStart,
      subData.currentPeriodEnd,
    );
    updated = updated.updateStatus(this.mapStatus(subData.status));
    await this.subscriptionRepo.save(updated);

    return subscription.organizationId;
  }

  private async handleInvoicePaymentFailed(
    data: Record<string, unknown>,
  ): Promise<string | null> {
    const stripeSubId = data.subscription as string;

    const subscription =
      await this.subscriptionRepo.findByStripeSubscriptionId(stripeSubId);
    if (!subscription) {
      return null;
    }

    const updated = subscription.updateStatus(SubscriptionStatus.PAST_DUE);
    await this.subscriptionRepo.save(updated);

    return subscription.organizationId;
  }

  private async handleCustomerSubscriptionUpdated(
    data: Record<string, unknown>,
  ): Promise<string | null> {
    const stripeSubId = data.id as string;

    const subscription =
      await this.subscriptionRepo.findByStripeSubscriptionId(stripeSubId);
    if (!subscription) {
      return null;
    }

    // Get fresh data from Stripe
    const subData = await this.paymentGateway.getSubscription(stripeSubId);

    const newPlan = this.planFromPriceId(subData.priceId);

    // Update subscription
    let updated = subscription
      .changePlan(newPlan, subData.priceId)
      .updateStatus(this.mapStatus(subData.status))
      .updatePeriod(subData.currentPeriodStart, subData.currentPeriodEnd)
      .setCancelAtPeriodEnd(subData.cancelAtPeriodEnd);
    await this.subscriptionRepo.save(updated);

    // Update org plan if changed
    if (newPlan !== subscription.plan) {
      const org = await this.orgRepo.findById(subscription.organizationId);
      if (org) {
        const updatedOrg = Organization.reconstruct({
          ...org.toObject(),
          plan: newPlan,
          updatedAt: new Date(),
        });
        await this.orgRepo.save(updatedOrg);
      }
    }

    return subscription.organizationId;
  }

  private async handleCustomerSubscriptionDeleted(
    data: Record<string, unknown>,
  ): Promise<string | null> {
    const stripeSubId = data.id as string;

    const subscription =
      await this.subscriptionRepo.findByStripeSubscriptionId(stripeSubId);
    if (!subscription) {
      return null;
    }

    // Mark subscription as canceled
    const updated = subscription.markCanceled(new Date());
    await this.subscriptionRepo.save(updated);

    // Reset org to FREE plan
    const org = await this.orgRepo.findById(subscription.organizationId);
    if (org) {
      const updatedOrg = Organization.reconstruct({
        ...org.toObject(),
        plan: Plan.FREE,
        updatedAt: new Date(),
      });
      await this.orgRepo.save(updatedOrg);
    }

    return subscription.organizationId;
  }

  private mapStatus(stripeStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.INCOMPLETE,
      trialing: SubscriptionStatus.TRIALING,
      paused: SubscriptionStatus.PAUSED,
      unpaid: SubscriptionStatus.UNPAID,
    };
    return statusMap[stripeStatus] ?? SubscriptionStatus.INCOMPLETE;
  }
}
