import Stripe from 'stripe';
import {
  IPaymentGateway,
  CheckoutSessionParams,
  CheckoutSessionResult,
  PortalSessionParams,
  PortalSessionResult,
  WebhookEventData,
  SubscriptionData,
} from '@/domain/services/IPaymentGateway';
import { getPriceIdForPlan } from './stripePriceConfig';

export class StripePaymentGateway implements IPaymentGateway {
  private stripe: Stripe;

  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string,
  ) {
    this.stripe = new Stripe(secretKey);
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [
        {
          price: getPriceIdForPlan(params.plan),
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        organizationId: params.organizationId,
      },
    };

    if (params.stripeCustomerId) {
      sessionParams.customer = params.stripeCustomerId;
    } else if (params.customerEmail) {
      sessionParams.customer_email = params.customerEmail;
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  async createPortalSession(params: PortalSessionParams): Promise<PortalSessionResult> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.stripeCustomerId,
      return_url: params.returnUrl,
    });
    return { url: session.url };
  }

  async constructWebhookEvent(payload: string, signature: string): Promise<WebhookEventData> {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );
    return {
      id: event.id,
      type: event.type,
      data: event.data.object as unknown as Record<string, unknown>,
    };
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionData> {
    const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
    const item = sub.items.data[0]!;
    return {
      id: sub.id,
      status: sub.status,
      priceId: item.price.id,
      currentPeriodStart: new Date(item.current_period_start * 1000),
      currentPeriodEnd: new Date(item.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
      customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    };
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<void> {
    if (atPeriodEnd) {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      await this.stripe.subscriptions.cancel(subscriptionId);
    }
  }
}
