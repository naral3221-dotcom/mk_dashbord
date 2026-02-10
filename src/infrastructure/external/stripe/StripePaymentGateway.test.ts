import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Plan } from '@/domain/entities/types';

const mockCheckoutSessionsCreate = vi.fn();
const mockBillingPortalSessionsCreate = vi.fn();
const mockWebhooksConstructEvent = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();
const mockSubscriptionsUpdate = vi.fn();
const mockSubscriptionsCancel = vi.fn();

// Mock stripe module - use a real class so `new Stripe(...)` works
vi.mock('stripe', () => {
  class MockStripe {
    checkout = {
      sessions: {
        create: mockCheckoutSessionsCreate,
      },
    };
    billingPortal = {
      sessions: {
        create: mockBillingPortalSessionsCreate,
      },
    };
    webhooks = {
      constructEvent: mockWebhooksConstructEvent,
    };
    subscriptions = {
      retrieve: mockSubscriptionsRetrieve,
      update: mockSubscriptionsUpdate,
      cancel: mockSubscriptionsCancel,
    };
  }
  return { default: MockStripe };
});

// Mock stripePriceConfig
vi.mock('./stripePriceConfig', () => ({
  getPriceIdForPlan: vi.fn((plan: string) => `price_${plan.toLowerCase()}`),
  planFromPriceId: vi.fn((priceId: string) => {
    if (priceId === 'price_pro') return 'PRO';
    if (priceId === 'price_enterprise') return 'ENTERPRISE';
    return 'STARTER';
  }),
  StripePriceConfig: {
    STARTER: 'price_starter',
    PRO: 'price_pro',
    ENTERPRISE: 'price_enterprise',
  },
}));

import { StripePaymentGateway } from './StripePaymentGateway';

// Helper to reference mock methods with shorter names
const mockStripe = {
  checkout: { sessions: { create: mockCheckoutSessionsCreate } },
  billingPortal: { sessions: { create: mockBillingPortalSessionsCreate } },
  webhooks: { constructEvent: mockWebhooksConstructEvent },
  subscriptions: {
    retrieve: mockSubscriptionsRetrieve,
    update: mockSubscriptionsUpdate,
    cancel: mockSubscriptionsCancel,
  },
};

describe('StripePaymentGateway', () => {
  const secretKey = 'sk_test_secret';
  const webhookSecret = 'whsec_test_secret';
  let gateway: StripePaymentGateway;

  beforeEach(() => {
    vi.clearAllMocks();
    gateway = new StripePaymentGateway(secretKey, webhookSecret);
  });

  // ---------- createCheckoutSession ----------

  describe('createCheckoutSession', () => {
    const baseParams = {
      organizationId: 'org_123',
      stripeCustomerId: null as string | null,
      plan: Plan.PRO,
      successUrl: 'https://app.example.com/success',
      cancelUrl: 'https://app.example.com/cancel',
    };

    it('should create session with correct params', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({
        id: 'cs_test_abc',
        url: 'https://checkout.stripe.com/session/abc',
      });

      await gateway.createCheckoutSession(baseParams);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        mode: 'subscription',
        line_items: [{ price: 'price_pro', quantity: 1 }],
        success_url: 'https://app.example.com/success',
        cancel_url: 'https://app.example.com/cancel',
        metadata: { organizationId: 'org_123' },
      });
    });

    it('should use existing stripeCustomerId when provided', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({
        id: 'cs_test_def',
        url: 'https://checkout.stripe.com/session/def',
      });

      await gateway.createCheckoutSession({
        ...baseParams,
        stripeCustomerId: 'cus_existing_123',
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing_123',
        }),
      );
    });

    it('should use customerEmail when no stripeCustomerId', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({
        id: 'cs_test_ghi',
        url: 'https://checkout.stripe.com/session/ghi',
      });

      await gateway.createCheckoutSession({
        ...baseParams,
        stripeCustomerId: null,
        customerEmail: 'user@example.com',
      });

      const callArgs = mockStripe.checkout.sessions.create.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs.customer).toBeUndefined();
      expect(callArgs.customer_email).toBe('user@example.com');
    });

    it('should return sessionId and url', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({
        id: 'cs_test_jkl',
        url: 'https://checkout.stripe.com/session/jkl',
      });

      const result = await gateway.createCheckoutSession(baseParams);

      expect(result).toEqual({
        sessionId: 'cs_test_jkl',
        url: 'https://checkout.stripe.com/session/jkl',
      });
    });

    it('should include organizationId in metadata', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({
        id: 'cs_test_mno',
        url: 'https://checkout.stripe.com/session/mno',
      });

      await gateway.createCheckoutSession({
        ...baseParams,
        organizationId: 'org_special_456',
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { organizationId: 'org_special_456' },
        }),
      );
    });
  });

  // ---------- createPortalSession ----------

  describe('createPortalSession', () => {
    it('should create portal session with customer and returnUrl', async () => {
      mockStripe.billingPortal.sessions.create.mockResolvedValueOnce({
        url: 'https://billing.stripe.com/session/portal_abc',
      });

      await gateway.createPortalSession({
        stripeCustomerId: 'cus_portal_123',
        returnUrl: 'https://app.example.com/settings',
      });

      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_portal_123',
        return_url: 'https://app.example.com/settings',
      });
    });

    it('should return url', async () => {
      mockStripe.billingPortal.sessions.create.mockResolvedValueOnce({
        url: 'https://billing.stripe.com/session/portal_def',
      });

      const result = await gateway.createPortalSession({
        stripeCustomerId: 'cus_portal_456',
        returnUrl: 'https://app.example.com/billing',
      });

      expect(result).toEqual({
        url: 'https://billing.stripe.com/session/portal_def',
      });
    });
  });

  // ---------- constructWebhookEvent ----------

  describe('constructWebhookEvent', () => {
    it('should validate and return event data', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_abc',
            status: 'active',
            customer: 'cus_xyz',
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);

      const result = await gateway.constructWebhookEvent(
        '{"raw":"payload"}',
        'sig_test_header',
      );

      expect(result).toEqual({
        id: 'evt_test_123',
        type: 'customer.subscription.updated',
        data: {
          id: 'sub_abc',
          status: 'active',
          customer: 'cus_xyz',
        },
      });

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        '{"raw":"payload"}',
        'sig_test_header',
        webhookSecret,
      );
    });

    it('should throw on invalid signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      await expect(
        gateway.constructWebhookEvent('invalid_payload', 'bad_sig'),
      ).rejects.toThrow('No signatures found matching the expected signature for payload');
    });
  });

  // ---------- getSubscription ----------

  describe('getSubscription', () => {
    const mockSubscription = {
      id: 'sub_test_123',
      status: 'active',
      items: {
        data: [
          {
            price: { id: 'price_pro' },
            current_period_start: 1700000000,
            current_period_end: 1702592000,
          },
        ],
      },
      cancel_at_period_end: false,
      canceled_at: null,
      customer: 'cus_sub_owner',
    };

    it('should retrieve and map subscription data', async () => {
      mockStripe.subscriptions.retrieve.mockResolvedValueOnce(mockSubscription);

      const result = await gateway.getSubscription('sub_test_123');

      expect(result.id).toBe('sub_test_123');
      expect(result.status).toBe('active');
      expect(result.priceId).toBe('price_pro');
      expect(result.cancelAtPeriodEnd).toBe(false);
      expect(result.customerId).toBe('cus_sub_owner');

      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_test_123');
    });

    it('should convert timestamps to Dates', async () => {
      mockStripe.subscriptions.retrieve.mockResolvedValueOnce(mockSubscription);

      const result = await gateway.getSubscription('sub_test_123');

      expect(result.currentPeriodStart).toEqual(new Date(1700000000 * 1000));
      expect(result.currentPeriodEnd).toEqual(new Date(1702592000 * 1000));
      expect(result.currentPeriodStart).toBeInstanceOf(Date);
      expect(result.currentPeriodEnd).toBeInstanceOf(Date);
    });

    it('should handle null canceledAt', async () => {
      mockStripe.subscriptions.retrieve.mockResolvedValueOnce(mockSubscription);

      const result = await gateway.getSubscription('sub_test_123');

      expect(result.canceledAt).toBeNull();
    });

    it('should handle canceledAt with a timestamp', async () => {
      mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
        ...mockSubscription,
        canceled_at: 1701500000,
        cancel_at_period_end: true,
      });

      const result = await gateway.getSubscription('sub_test_123');

      expect(result.canceledAt).toEqual(new Date(1701500000 * 1000));
      expect(result.canceledAt).toBeInstanceOf(Date);
      expect(result.cancelAtPeriodEnd).toBe(true);
    });

    it('should handle string customer ID', async () => {
      mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
        ...mockSubscription,
        customer: 'cus_string_id',
      });

      const result = await gateway.getSubscription('sub_test_123');

      expect(result.customerId).toBe('cus_string_id');
    });

    it('should handle expanded customer object', async () => {
      mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
        ...mockSubscription,
        customer: { id: 'cus_expanded_obj', email: 'test@example.com' },
      });

      const result = await gateway.getSubscription('sub_test_123');

      expect(result.customerId).toBe('cus_expanded_obj');
    });
  });

  // ---------- cancelSubscription ----------

  describe('cancelSubscription', () => {
    it('should update with cancel_at_period_end when atPeriodEnd is true', async () => {
      mockStripe.subscriptions.update.mockResolvedValueOnce({});

      await gateway.cancelSubscription('sub_cancel_123', true);

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_cancel_123', {
        cancel_at_period_end: true,
      });
      expect(mockStripe.subscriptions.cancel).not.toHaveBeenCalled();
    });

    it('should cancel immediately when atPeriodEnd is false', async () => {
      mockStripe.subscriptions.cancel.mockResolvedValueOnce({});

      await gateway.cancelSubscription('sub_cancel_456', false);

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_cancel_456');
      expect(mockStripe.subscriptions.update).not.toHaveBeenCalled();
    });
  });
});
