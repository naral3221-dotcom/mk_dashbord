import { Plan } from '../entities/types';

export interface CheckoutSessionParams {
  organizationId: string;
  stripeCustomerId: string | null;
  plan: Plan;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface PortalSessionParams {
  stripeCustomerId: string;
  returnUrl: string;
}

export interface PortalSessionResult {
  url: string;
}

export interface WebhookEventData {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface SubscriptionData {
  id: string;
  status: string;
  priceId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  customerId: string;
}

export interface IPaymentGateway {
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
  createPortalSession(params: PortalSessionParams): Promise<PortalSessionResult>;
  constructWebhookEvent(payload: string, signature: string): Promise<WebhookEventData>;
  getSubscription(subscriptionId: string): Promise<SubscriptionData>;
  cancelSubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<void>;
}
