import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingService } from './BillingService';
import { Plan, SubscriptionStatus } from '@/domain/entities/types';
import { CreateCheckoutSessionUseCase } from '@/domain/usecases/CreateCheckoutSessionUseCase';
import { CreatePortalSessionUseCase } from '@/domain/usecases/CreatePortalSessionUseCase';
import { HandleStripeWebhookUseCase } from '@/domain/usecases/HandleStripeWebhookUseCase';
import { GetSubscriptionUseCase } from '@/domain/usecases/GetSubscriptionUseCase';
import { CheckFeatureAccessUseCase } from '@/domain/usecases/CheckFeatureAccessUseCase';

describe('BillingService', () => {
  let service: BillingService;
  let mockCreateCheckoutUC: { execute: ReturnType<typeof vi.fn> };
  let mockCreatePortalUC: { execute: ReturnType<typeof vi.fn> };
  let mockHandleWebhookUC: { execute: ReturnType<typeof vi.fn> };
  let mockGetSubscriptionUC: { execute: ReturnType<typeof vi.fn> };
  let mockCheckFeatureAccessUC: { execute: ReturnType<typeof vi.fn> };

  const userId = 'user-1';
  const orgId = 'org-1';

  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateCheckoutUC = { execute: vi.fn() };
    mockCreatePortalUC = { execute: vi.fn() };
    mockHandleWebhookUC = { execute: vi.fn() };
    mockGetSubscriptionUC = { execute: vi.fn() };
    mockCheckFeatureAccessUC = { execute: vi.fn() };

    service = new BillingService(
      mockCreateCheckoutUC as unknown as CreateCheckoutSessionUseCase,
      mockCreatePortalUC as unknown as CreatePortalSessionUseCase,
      mockHandleWebhookUC as unknown as HandleStripeWebhookUseCase,
      mockGetSubscriptionUC as unknown as GetSubscriptionUseCase,
      mockCheckFeatureAccessUC as unknown as CheckFeatureAccessUseCase,
    );
  });

  describe('createCheckout', () => {
    it('should delegate to use case and return result', async () => {
      const expectedResult = {
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/cs_test_123',
      };
      mockCreateCheckoutUC.execute.mockResolvedValue(expectedResult);

      const result = await service.createCheckout(userId, orgId, {
        plan: Plan.PRO,
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
      });

      expect(result).toEqual({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/cs_test_123',
      });
    });

    it('should pass correct userId and organizationId to use case', async () => {
      mockCreateCheckoutUC.execute.mockResolvedValue({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/cs_test_123',
      });

      await service.createCheckout(userId, orgId, {
        plan: Plan.STARTER,
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
      });

      expect(mockCreateCheckoutUC.execute).toHaveBeenCalledWith({
        userId,
        organizationId: orgId,
        plan: Plan.STARTER,
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
      });
      expect(mockCreateCheckoutUC.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('createPortalSession', () => {
    it('should delegate to use case and return result', async () => {
      const expectedResult = {
        url: 'https://billing.stripe.com/session/portal_123',
      };
      mockCreatePortalUC.execute.mockResolvedValue(expectedResult);

      const result = await service.createPortalSession(userId, orgId, {
        returnUrl: 'https://app.example.com/settings',
      });

      expect(result).toEqual({
        url: 'https://billing.stripe.com/session/portal_123',
      });
    });

    it('should pass correct returnUrl to use case', async () => {
      mockCreatePortalUC.execute.mockResolvedValue({
        url: 'https://billing.stripe.com/session/portal_123',
      });

      await service.createPortalSession(userId, orgId, {
        returnUrl: 'https://app.example.com/billing',
      });

      expect(mockCreatePortalUC.execute).toHaveBeenCalledWith({
        userId,
        organizationId: orgId,
        returnUrl: 'https://app.example.com/billing',
      });
      expect(mockCreatePortalUC.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleWebhook', () => {
    it('should delegate to use case with payload and signature', async () => {
      const expectedResult = {
        eventType: 'checkout.session.completed',
        processed: true,
      };
      mockHandleWebhookUC.execute.mockResolvedValue(expectedResult);

      const result = await service.handleWebhook(
        '{"type":"checkout.session.completed"}',
        'whsec_test_signature',
      );

      expect(result).toEqual({
        eventType: 'checkout.session.completed',
        processed: true,
      });
      expect(mockHandleWebhookUC.execute).toHaveBeenCalledWith({
        payload: '{"type":"checkout.session.completed"}',
        signature: 'whsec_test_signature',
      });
      expect(mockHandleWebhookUC.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSubscription', () => {
    it('should return formatted subscription response', async () => {
      const periodStart = new Date('2026-01-01T00:00:00.000Z');
      const periodEnd = new Date('2026-02-01T00:00:00.000Z');

      mockGetSubscriptionUC.execute.mockResolvedValue({
        subscription: {
          id: 'sub-1',
          plan: Plan.PRO,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
        plan: Plan.PRO,
      });

      const result = await service.getSubscription(orgId);

      expect(result).toEqual({
        subscription: {
          id: 'sub-1',
          plan: Plan.PRO,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: '2026-01-01T00:00:00.000Z',
          currentPeriodEnd: '2026-02-01T00:00:00.000Z',
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
        plan: Plan.PRO,
      });
    });

    it('should return null subscription for free plan', async () => {
      mockGetSubscriptionUC.execute.mockResolvedValue({
        subscription: null,
        plan: Plan.FREE,
      });

      const result = await service.getSubscription(orgId);

      expect(result.subscription).toBeNull();
      expect(result.plan).toBe(Plan.FREE);
    });

    it('should convert dates to ISO strings', async () => {
      const canceledDate = new Date('2026-01-15T12:30:00.000Z');

      mockGetSubscriptionUC.execute.mockResolvedValue({
        subscription: {
          id: 'sub-2',
          plan: Plan.STARTER,
          status: SubscriptionStatus.CANCELED,
          currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
          currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
          cancelAtPeriodEnd: true,
          canceledAt: canceledDate,
        },
        plan: Plan.STARTER,
      });

      const result = await service.getSubscription(orgId);

      expect(result.subscription!.currentPeriodStart).toBe(
        '2026-01-01T00:00:00.000Z',
      );
      expect(result.subscription!.currentPeriodEnd).toBe(
        '2026-02-01T00:00:00.000Z',
      );
      expect(result.subscription!.canceledAt).toBe(
        '2026-01-15T12:30:00.000Z',
      );
    });
  });

  describe('getUsage', () => {
    it('should return feature checks for all features', async () => {
      mockCheckFeatureAccessUC.execute.mockResolvedValue({
        allowed: true,
      });
      mockGetSubscriptionUC.execute.mockResolvedValue({
        subscription: null,
        plan: Plan.PRO,
      });

      const result = await service.getUsage(orgId);

      expect(result.features).toHaveLength(4);
      expect(result.features.map((f) => f.feature)).toEqual([
        'maxAdAccounts',
        'maxUsers',
        'hasAutoSync',
        'hasExports',
      ]);
    });

    it('should call checkFeatureAccess for each feature', async () => {
      mockCheckFeatureAccessUC.execute.mockResolvedValue({
        allowed: true,
      });
      mockGetSubscriptionUC.execute.mockResolvedValue({
        subscription: null,
        plan: Plan.PRO,
      });

      await service.getUsage(orgId);

      expect(mockCheckFeatureAccessUC.execute).toHaveBeenCalledTimes(4);
      expect(mockCheckFeatureAccessUC.execute).toHaveBeenCalledWith({
        organizationId: orgId,
        feature: 'maxAdAccounts',
      });
      expect(mockCheckFeatureAccessUC.execute).toHaveBeenCalledWith({
        organizationId: orgId,
        feature: 'maxUsers',
      });
      expect(mockCheckFeatureAccessUC.execute).toHaveBeenCalledWith({
        organizationId: orgId,
        feature: 'hasAutoSync',
      });
      expect(mockCheckFeatureAccessUC.execute).toHaveBeenCalledWith({
        organizationId: orgId,
        feature: 'hasExports',
      });
    });

    it('should return correct plan from subscription', async () => {
      mockCheckFeatureAccessUC.execute.mockResolvedValue({
        allowed: true,
      });
      mockGetSubscriptionUC.execute.mockResolvedValue({
        subscription: null,
        plan: Plan.ENTERPRISE,
      });

      const result = await service.getUsage(orgId);

      expect(result.plan).toBe(Plan.ENTERPRISE);
    });

    it('should return allowed/denied correctly based on plan', async () => {
      mockCheckFeatureAccessUC.execute
        .mockResolvedValueOnce({
          allowed: false,
          currentUsage: 1,
          limit: 1,
          reason: 'Ad account limit reached',
        })
        .mockResolvedValueOnce({
          allowed: true,
          currentUsage: 1,
          limit: 2,
        })
        .mockResolvedValueOnce({
          allowed: false,
          reason: 'Auto sync is not available on the FREE plan',
        })
        .mockResolvedValueOnce({
          allowed: false,
          reason: 'Exports are not available on the FREE plan',
        });

      mockGetSubscriptionUC.execute.mockResolvedValue({
        subscription: null,
        plan: Plan.FREE,
      });

      const result = await service.getUsage(orgId);

      expect(result.plan).toBe(Plan.FREE);

      // maxAdAccounts - denied
      expect(result.features[0]!.feature).toBe('maxAdAccounts');
      expect(result.features[0]!.allowed).toBe(false);
      expect(result.features[0]!.currentUsage).toBe(1);
      expect(result.features[0]!.limit).toBe(1);
      expect(result.features[0]!.reason).toBe('Ad account limit reached');

      // maxUsers - allowed
      expect(result.features[1]!.feature).toBe('maxUsers');
      expect(result.features[1]!.allowed).toBe(true);
      expect(result.features[1]!.currentUsage).toBe(1);
      expect(result.features[1]!.limit).toBe(2);

      // hasAutoSync - denied
      expect(result.features[2]!.feature).toBe('hasAutoSync');
      expect(result.features[2]!.allowed).toBe(false);
      expect(result.features[2]!.reason).toBe(
        'Auto sync is not available on the FREE plan',
      );

      // hasExports - denied
      expect(result.features[3]!.feature).toBe('hasExports');
      expect(result.features[3]!.allowed).toBe(false);
      expect(result.features[3]!.reason).toBe(
        'Exports are not available on the FREE plan',
      );
    });
  });
});
