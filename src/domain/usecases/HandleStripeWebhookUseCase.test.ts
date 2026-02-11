import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  HandleStripeWebhookUseCase,
  HandleStripeWebhookInput,
} from './HandleStripeWebhookUseCase';
import { IPaymentGateway, WebhookEventData, SubscriptionData } from '../services/IPaymentGateway';
import { ISubscriptionRepository } from '../repositories/ISubscriptionRepository';
import { IBillingEventRepository } from '../repositories/IBillingEventRepository';
import { IOrganizationRepository } from '../repositories/IOrganizationRepository';
import { Subscription } from '../entities/Subscription';
import { BillingEvent } from '../entities/BillingEvent';
import { Organization } from '../entities/Organization';
import { Plan, SubscriptionStatus } from '../entities/types';
import { NotFoundError } from '../errors';

describe('HandleStripeWebhookUseCase', () => {
  let useCase: HandleStripeWebhookUseCase;
  let mockPaymentGateway: IPaymentGateway;
  let mockSubscriptionRepo: ISubscriptionRepository;
  let mockBillingEventRepo: IBillingEventRepository;
  let mockOrgRepo: IOrganizationRepository;
  let mockPlanFromPriceId: (priceId: string) => Plan;

  const now = new Date('2026-01-15T00:00:00Z');
  const periodStart = new Date('2026-01-01T00:00:00Z');
  const periodEnd = new Date('2026-02-01T00:00:00Z');
  const newPeriodStart = new Date('2026-02-01T00:00:00Z');
  const newPeriodEnd = new Date('2026-03-01T00:00:00Z');

  const testOrg = Organization.reconstruct({
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    plan: Plan.FREE,
    stripeCustomerId: null,
    createdAt: now,
    updatedAt: now,
  });

  const testOrgWithStripeId = Organization.reconstruct({
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    plan: Plan.PRO,
    stripeCustomerId: 'cus_existing',
    createdAt: now,
    updatedAt: now,
  });

  const testSubscription = Subscription.reconstruct({
    id: 'sub-internal-1',
    organizationId: 'org-1',
    stripeSubscriptionId: 'sub_stripe_123',
    stripePriceId: 'price_pro',
    plan: Plan.PRO,
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const defaultSubData: SubscriptionData = {
    id: 'sub_stripe_123',
    status: 'active',
    priceId: 'price_pro',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    customerId: 'cus_123',
  };

  const checkoutEvent: WebhookEventData = {
    id: 'evt_checkout_1',
    type: 'checkout.session.completed',
    data: {
      subscription: 'sub_stripe_123',
      customer: 'cus_123',
      metadata: { organizationId: 'org-1' },
    },
  };

  const invoicePaidEvent: WebhookEventData = {
    id: 'evt_invoice_paid_1',
    type: 'invoice.paid',
    data: {
      subscription: 'sub_stripe_123',
    },
  };

  const invoicePaymentFailedEvent: WebhookEventData = {
    id: 'evt_invoice_failed_1',
    type: 'invoice.payment_failed',
    data: {
      subscription: 'sub_stripe_123',
    },
  };

  const subscriptionUpdatedEvent: WebhookEventData = {
    id: 'evt_sub_updated_1',
    type: 'customer.subscription.updated',
    data: {
      id: 'sub_stripe_123',
    },
  };

  const subscriptionDeletedEvent: WebhookEventData = {
    id: 'evt_sub_deleted_1',
    type: 'customer.subscription.deleted',
    data: {
      id: 'sub_stripe_123',
    },
  };

  const defaultInput: HandleStripeWebhookInput = {
    payload: 'raw-body-payload',
    signature: 'stripe-signature-header',
  };

  beforeEach(() => {
    mockPaymentGateway = {
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      constructWebhookEvent: vi.fn(),
      getSubscription: vi.fn(),
      cancelSubscription: vi.fn(),
    };

    mockSubscriptionRepo = {
      findById: vi.fn(),
      findByOrganizationId: vi.fn(),
      findByStripeSubscriptionId: vi.fn(),
      findActiveByOrganizationId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };

    mockBillingEventRepo = {
      save: vi.fn(),
      findByOrganizationId: vi.fn(),
      findByStripeEventId: vi.fn(),
    };

    mockOrgRepo = {
      findById: vi.fn(),
      findBySlug: vi.fn(),
      findByStripeCustomerId: vi.fn(),
      findByPlan: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      existsBySlug: vi.fn(),
      countByPlan: vi.fn(),
      findAll: vi.fn(),
    };

    mockPlanFromPriceId = vi.fn((priceId: string) => {
      const map: Record<string, Plan> = {
        price_starter: Plan.STARTER,
        price_pro: Plan.PRO,
        price_enterprise: Plan.ENTERPRISE,
      };
      return map[priceId] ?? Plan.FREE;
    });

    // Default: no duplicate event
    vi.mocked(mockBillingEventRepo.findByStripeEventId).mockResolvedValue(null);
    vi.mocked(mockBillingEventRepo.save).mockImplementation(async (e) => e);
    vi.mocked(mockSubscriptionRepo.save).mockImplementation(async (s) => s);
    vi.mocked(mockOrgRepo.save).mockImplementation(async (o) => o);

    useCase = new HandleStripeWebhookUseCase(
      mockPaymentGateway,
      mockSubscriptionRepo,
      mockBillingEventRepo,
      mockOrgRepo,
      mockPlanFromPriceId,
    );
  });

  // ─── checkout.session.completed ─────────────────────────────────────

  it('should create subscription and update org plan on checkout.session.completed', async () => {
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(checkoutEvent);
    vi.mocked(mockPaymentGateway.getSubscription).mockResolvedValue(defaultSubData);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(testOrg);

    const result = await useCase.execute(defaultInput);

    expect(result.eventType).toBe('checkout.session.completed');
    expect(result.processed).toBe(true);

    // Should save subscription
    expect(mockSubscriptionRepo.save).toHaveBeenCalledTimes(1);
    const savedSub = vi.mocked(mockSubscriptionRepo.save).mock.calls[0]![0];
    expect(savedSub.organizationId).toBe('org-1');
    expect(savedSub.stripeSubscriptionId).toBe('sub_stripe_123');
    expect(savedSub.stripePriceId).toBe('price_pro');
    expect(savedSub.plan).toBe(Plan.PRO);
    expect(savedSub.status).toBe(SubscriptionStatus.ACTIVE);

    // Should save org with new plan
    expect(mockOrgRepo.save).toHaveBeenCalledTimes(1);
    const savedOrg = vi.mocked(mockOrgRepo.save).mock.calls[0]![0];
    expect(savedOrg.plan).toBe(Plan.PRO);
  });

  it('should set stripeCustomerId on org if not set during checkout', async () => {
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(checkoutEvent);
    vi.mocked(mockPaymentGateway.getSubscription).mockResolvedValue(defaultSubData);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(testOrg); // stripeCustomerId is null

    await useCase.execute(defaultInput);

    const savedOrg = vi.mocked(mockOrgRepo.save).mock.calls[0]![0];
    expect(savedOrg.stripeCustomerId).toBe('cus_123');
  });

  it('should not overwrite existing stripeCustomerId during checkout', async () => {
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(checkoutEvent);
    vi.mocked(mockPaymentGateway.getSubscription).mockResolvedValue(defaultSubData);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(testOrgWithStripeId); // stripeCustomerId is 'cus_existing'

    await useCase.execute(defaultInput);

    const savedOrg = vi.mocked(mockOrgRepo.save).mock.calls[0]![0];
    expect(savedOrg.stripeCustomerId).toBe('cus_existing');
  });

  it('should throw if org not found on checkout.session.completed', async () => {
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(checkoutEvent);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(defaultInput)).rejects.toThrow(
      'Organization not found',
    );
    await expect(useCase.execute(defaultInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  // ─── invoice.paid ───────────────────────────────────────────────────

  it('should update subscription period on invoice.paid', async () => {
    const updatedSubData: SubscriptionData = {
      ...defaultSubData,
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
    };
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(invoicePaidEvent);
    vi.mocked(mockPaymentGateway.getSubscription).mockResolvedValue(updatedSubData);
    vi.mocked(mockSubscriptionRepo.findByStripeSubscriptionId).mockResolvedValue(testSubscription);

    const result = await useCase.execute(defaultInput);

    expect(result.processed).toBe(true);
    expect(mockSubscriptionRepo.save).toHaveBeenCalledTimes(1);
    const savedSub = vi.mocked(mockSubscriptionRepo.save).mock.calls[0]![0];
    expect(savedSub.currentPeriodStart).toEqual(newPeriodStart);
    expect(savedSub.currentPeriodEnd).toEqual(newPeriodEnd);
  });

  it('should skip if subscription not found on invoice.paid', async () => {
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(invoicePaidEvent);
    vi.mocked(mockSubscriptionRepo.findByStripeSubscriptionId).mockResolvedValue(null);

    const result = await useCase.execute(defaultInput);

    expect(result.processed).toBe(true);
    expect(mockSubscriptionRepo.save).not.toHaveBeenCalled();
    // No billing event saved since organizationId is null
    expect(mockBillingEventRepo.save).not.toHaveBeenCalled();
  });

  // ─── invoice.payment_failed ─────────────────────────────────────────

  it('should set status to PAST_DUE on invoice.payment_failed', async () => {
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(invoicePaymentFailedEvent);
    vi.mocked(mockSubscriptionRepo.findByStripeSubscriptionId).mockResolvedValue(testSubscription);

    const result = await useCase.execute(defaultInput);

    expect(result.processed).toBe(true);
    expect(mockSubscriptionRepo.save).toHaveBeenCalledTimes(1);
    const savedSub = vi.mocked(mockSubscriptionRepo.save).mock.calls[0]![0];
    expect(savedSub.status).toBe(SubscriptionStatus.PAST_DUE);
  });

  it('should skip if subscription not found on invoice.payment_failed', async () => {
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(invoicePaymentFailedEvent);
    vi.mocked(mockSubscriptionRepo.findByStripeSubscriptionId).mockResolvedValue(null);

    const result = await useCase.execute(defaultInput);

    expect(result.processed).toBe(true);
    expect(mockSubscriptionRepo.save).not.toHaveBeenCalled();
    expect(mockBillingEventRepo.save).not.toHaveBeenCalled();
  });

  // ─── customer.subscription.updated ──────────────────────────────────

  it('should sync plan and status changes on customer.subscription.updated', async () => {
    const enterpriseSubData: SubscriptionData = {
      ...defaultSubData,
      priceId: 'price_enterprise',
      status: 'active',
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
      cancelAtPeriodEnd: false,
    };
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(subscriptionUpdatedEvent);
    vi.mocked(mockPaymentGateway.getSubscription).mockResolvedValue(enterpriseSubData);
    vi.mocked(mockSubscriptionRepo.findByStripeSubscriptionId).mockResolvedValue(testSubscription);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(testOrgWithStripeId);

    const result = await useCase.execute(defaultInput);

    expect(result.processed).toBe(true);
    expect(mockSubscriptionRepo.save).toHaveBeenCalledTimes(1);
    const savedSub = vi.mocked(mockSubscriptionRepo.save).mock.calls[0]![0];
    expect(savedSub.plan).toBe(Plan.ENTERPRISE);
    expect(savedSub.stripePriceId).toBe('price_enterprise');
    expect(savedSub.status).toBe(SubscriptionStatus.ACTIVE);
    expect(savedSub.currentPeriodStart).toEqual(newPeriodStart);
    expect(savedSub.currentPeriodEnd).toEqual(newPeriodEnd);
  });

  it('should update org plan if changed on customer.subscription.updated', async () => {
    const enterpriseSubData: SubscriptionData = {
      ...defaultSubData,
      priceId: 'price_enterprise',
    };
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(subscriptionUpdatedEvent);
    vi.mocked(mockPaymentGateway.getSubscription).mockResolvedValue(enterpriseSubData);
    vi.mocked(mockSubscriptionRepo.findByStripeSubscriptionId).mockResolvedValue(testSubscription);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(testOrgWithStripeId);

    await useCase.execute(defaultInput);

    // Org should be saved with ENTERPRISE plan
    expect(mockOrgRepo.save).toHaveBeenCalledTimes(1);
    const savedOrg = vi.mocked(mockOrgRepo.save).mock.calls[0]![0];
    expect(savedOrg.plan).toBe(Plan.ENTERPRISE);
  });

  it('should skip if subscription not found on customer.subscription.updated', async () => {
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(subscriptionUpdatedEvent);
    vi.mocked(mockSubscriptionRepo.findByStripeSubscriptionId).mockResolvedValue(null);

    const result = await useCase.execute(defaultInput);

    expect(result.processed).toBe(true);
    expect(mockSubscriptionRepo.save).not.toHaveBeenCalled();
    expect(mockOrgRepo.save).not.toHaveBeenCalled();
  });

  // ─── customer.subscription.deleted ──────────────────────────────────

  it('should mark subscription canceled on customer.subscription.deleted', async () => {
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(subscriptionDeletedEvent);
    vi.mocked(mockSubscriptionRepo.findByStripeSubscriptionId).mockResolvedValue(testSubscription);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(testOrgWithStripeId);

    const result = await useCase.execute(defaultInput);

    expect(result.processed).toBe(true);
    expect(mockSubscriptionRepo.save).toHaveBeenCalledTimes(1);
    const savedSub = vi.mocked(mockSubscriptionRepo.save).mock.calls[0]![0];
    expect(savedSub.status).toBe(SubscriptionStatus.CANCELED);
    expect(savedSub.canceledAt).toBeInstanceOf(Date);
  });

  it('should reset org to FREE plan on customer.subscription.deleted', async () => {
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(subscriptionDeletedEvent);
    vi.mocked(mockSubscriptionRepo.findByStripeSubscriptionId).mockResolvedValue(testSubscription);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(testOrgWithStripeId);

    await useCase.execute(defaultInput);

    expect(mockOrgRepo.save).toHaveBeenCalledTimes(1);
    const savedOrg = vi.mocked(mockOrgRepo.save).mock.calls[0]![0];
    expect(savedOrg.plan).toBe(Plan.FREE);
  });

  it('should skip if subscription not found on customer.subscription.deleted', async () => {
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(subscriptionDeletedEvent);
    vi.mocked(mockSubscriptionRepo.findByStripeSubscriptionId).mockResolvedValue(null);

    const result = await useCase.execute(defaultInput);

    expect(result.processed).toBe(true);
    expect(mockSubscriptionRepo.save).not.toHaveBeenCalled();
    expect(mockOrgRepo.save).not.toHaveBeenCalled();
  });

  // ─── Idempotency ────────────────────────────────────────────────────

  it('should return processed:false for duplicate stripeEventId (idempotency)', async () => {
    const existingBillingEvent = BillingEvent.reconstruct({
      id: 'be-1',
      organizationId: 'org-1',
      eventType: 'checkout.session.completed',
      stripeEventId: 'evt_checkout_1',
      data: {},
      createdAt: now,
    });

    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(checkoutEvent);
    vi.mocked(mockBillingEventRepo.findByStripeEventId).mockResolvedValue(existingBillingEvent);

    const result = await useCase.execute(defaultInput);

    expect(result.eventType).toBe('checkout.session.completed');
    expect(result.processed).toBe(false);

    // Should not attempt to process anything
    expect(mockSubscriptionRepo.save).not.toHaveBeenCalled();
    expect(mockOrgRepo.save).not.toHaveBeenCalled();
    expect(mockOrgRepo.findById).not.toHaveBeenCalled();
  });

  // ─── BillingEvent saving ────────────────────────────────────────────

  it('should save BillingEvent for each processed event', async () => {
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(checkoutEvent);
    vi.mocked(mockPaymentGateway.getSubscription).mockResolvedValue(defaultSubData);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(testOrg);

    await useCase.execute(defaultInput);

    expect(mockBillingEventRepo.save).toHaveBeenCalledTimes(1);
    const savedEvent = vi.mocked(mockBillingEventRepo.save).mock.calls[0]![0];
    expect(savedEvent.organizationId).toBe('org-1');
    expect(savedEvent.eventType).toBe('checkout.session.completed');
    expect(savedEvent.stripeEventId).toBe('evt_checkout_1');
  });

  // ─── Unrecognized event type ────────────────────────────────────────

  it('should return processed:true without error for unrecognized event type', async () => {
    const unknownEvent: WebhookEventData = {
      id: 'evt_unknown_1',
      type: 'payment_intent.succeeded',
      data: { amount: 2000 },
    };
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(unknownEvent);

    const result = await useCase.execute(defaultInput);

    expect(result.eventType).toBe('payment_intent.succeeded');
    expect(result.processed).toBe(true);
    // No billing event saved since no organizationId
    expect(mockBillingEventRepo.save).not.toHaveBeenCalled();
    expect(mockSubscriptionRepo.save).not.toHaveBeenCalled();
  });

  // ─── Signature verification failure ─────────────────────────────────

  it('should rethrow if constructWebhookEvent fails (invalid signature)', async () => {
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockRejectedValue(
      new Error('Invalid webhook signature'),
    );

    await expect(useCase.execute(defaultInput)).rejects.toThrow(
      'Invalid webhook signature',
    );

    expect(mockBillingEventRepo.findByStripeEventId).not.toHaveBeenCalled();
    expect(mockSubscriptionRepo.save).not.toHaveBeenCalled();
  });

  // ─── Correct eventType in output ────────────────────────────────────

  it('should return correct eventType in output for each event type', async () => {
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(invoicePaidEvent);
    vi.mocked(mockSubscriptionRepo.findByStripeSubscriptionId).mockResolvedValue(testSubscription);
    vi.mocked(mockPaymentGateway.getSubscription).mockResolvedValue(defaultSubData);

    const result = await useCase.execute(defaultInput);

    expect(result.eventType).toBe('invoice.paid');
  });

  // ─── cancelAtPeriodEnd handling ─────────────────────────────────────

  it('should handle subscription with cancelAtPeriodEnd=true on update', async () => {
    const cancelingSubData: SubscriptionData = {
      ...defaultSubData,
      cancelAtPeriodEnd: true,
    };
    vi.mocked(mockPaymentGateway.constructWebhookEvent).mockResolvedValue(subscriptionUpdatedEvent);
    vi.mocked(mockPaymentGateway.getSubscription).mockResolvedValue(cancelingSubData);
    vi.mocked(mockSubscriptionRepo.findByStripeSubscriptionId).mockResolvedValue(testSubscription);

    await useCase.execute(defaultInput);

    expect(mockSubscriptionRepo.save).toHaveBeenCalledTimes(1);
    const savedSub = vi.mocked(mockSubscriptionRepo.save).mock.calls[0]![0];
    expect(savedSub.cancelAtPeriodEnd).toBe(true);
  });
});
