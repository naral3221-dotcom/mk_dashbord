import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetSubscriptionUseCase,
  GetSubscriptionInput,
} from './GetSubscriptionUseCase';
import { ISubscriptionRepository } from '../repositories/ISubscriptionRepository';
import { IOrganizationRepository } from '../repositories/IOrganizationRepository';
import { Organization } from '../entities/Organization';
import { Subscription } from '../entities/Subscription';
import { Plan, SubscriptionStatus } from '../entities/types';

describe('GetSubscriptionUseCase', () => {
  let useCase: GetSubscriptionUseCase;
  let mockSubscriptionRepo: ISubscriptionRepository;
  let mockOrgRepo: IOrganizationRepository;

  const now = new Date();
  const periodStart = new Date('2026-01-01T00:00:00Z');
  const periodEnd = new Date('2026-02-01T00:00:00Z');
  const canceledDate = new Date('2026-01-15T00:00:00Z');

  const freeOrg = Organization.reconstruct({
    id: 'org-1',
    name: 'Free Org',
    slug: 'free-org',
    plan: Plan.FREE,
    stripeCustomerId: null,
    createdAt: now,
    updatedAt: now,
  });

  const proOrg = Organization.reconstruct({
    id: 'org-2',
    name: 'Pro Org',
    slug: 'pro-org',
    plan: Plan.PRO,
    stripeCustomerId: 'cus_pro123',
    createdAt: now,
    updatedAt: now,
  });

  const starterOrg = Organization.reconstruct({
    id: 'org-3',
    name: 'Starter Org',
    slug: 'starter-org',
    plan: Plan.STARTER,
    stripeCustomerId: 'cus_starter123',
    createdAt: now,
    updatedAt: now,
  });

  const activeSubscription = Subscription.reconstruct({
    id: 'sub-1',
    organizationId: 'org-2',
    stripeSubscriptionId: 'sub_stripe_1',
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

  const cancelingSubscription = Subscription.reconstruct({
    id: 'sub-2',
    organizationId: 'org-3',
    stripeSubscriptionId: 'sub_stripe_2',
    stripePriceId: 'price_starter',
    plan: Plan.STARTER,
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: true,
    canceledAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const canceledSubscription = Subscription.reconstruct({
    id: 'sub-3',
    organizationId: 'org-3',
    stripeSubscriptionId: 'sub_stripe_3',
    stripePriceId: 'price_starter',
    plan: Plan.STARTER,
    status: SubscriptionStatus.CANCELED,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    canceledAt: canceledDate,
    createdAt: now,
    updatedAt: now,
  });

  const defaultInput: GetSubscriptionInput = {
    organizationId: 'org-2',
  };

  beforeEach(() => {
    mockSubscriptionRepo = {
      findById: vi.fn(),
      findByOrganizationId: vi.fn(),
      findByStripeSubscriptionId: vi.fn(),
      findActiveByOrganizationId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
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

    useCase = new GetSubscriptionUseCase(mockSubscriptionRepo, mockOrgRepo);
  });

  it('should return subscription details when subscription exists', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(proOrg);
    vi.mocked(mockSubscriptionRepo.findByOrganizationId).mockResolvedValue(
      activeSubscription,
    );

    const result = await useCase.execute(defaultInput);

    expect(result.subscription).not.toBeNull();
    expect(result.subscription!.id).toBe('sub-1');
    expect(result.subscription!.plan).toBe(Plan.PRO);
    expect(result.subscription!.status).toBe(SubscriptionStatus.ACTIVE);
    expect(result.plan).toBe(Plan.PRO);
  });

  it('should return null subscription for free plan with no subscription', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(freeOrg);
    vi.mocked(mockSubscriptionRepo.findByOrganizationId).mockResolvedValue(
      null,
    );

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result.subscription).toBeNull();
    expect(result.plan).toBe(Plan.FREE);
  });

  it('should return org plan even when no subscription exists', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(proOrg);
    vi.mocked(mockSubscriptionRepo.findByOrganizationId).mockResolvedValue(
      null,
    );

    const result = await useCase.execute(defaultInput);

    expect(result.subscription).toBeNull();
    expect(result.plan).toBe(Plan.PRO);
  });

  it('should throw "Organization not found" when org does not exist', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(null);

    await expect(
      useCase.execute({ organizationId: 'non-existent' }),
    ).rejects.toThrow('Organization not found');

    expect(
      mockSubscriptionRepo.findByOrganizationId,
    ).not.toHaveBeenCalled();
  });

  it('should return correct plan from org', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(starterOrg);
    vi.mocked(mockSubscriptionRepo.findByOrganizationId).mockResolvedValue(
      cancelingSubscription,
    );

    const result = await useCase.execute({ organizationId: 'org-3' });

    expect(result.plan).toBe(Plan.STARTER);
    expect(result.subscription!.plan).toBe(Plan.STARTER);
  });

  it('should return cancelAtPeriodEnd status', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(starterOrg);
    vi.mocked(mockSubscriptionRepo.findByOrganizationId).mockResolvedValue(
      cancelingSubscription,
    );

    const result = await useCase.execute({ organizationId: 'org-3' });

    expect(result.subscription!.cancelAtPeriodEnd).toBe(true);
  });

  it('should return current period dates', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(proOrg);
    vi.mocked(mockSubscriptionRepo.findByOrganizationId).mockResolvedValue(
      activeSubscription,
    );

    const result = await useCase.execute(defaultInput);

    expect(result.subscription!.currentPeriodStart).toEqual(periodStart);
    expect(result.subscription!.currentPeriodEnd).toEqual(periodEnd);
  });

  it('should return canceledAt when set', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(starterOrg);
    vi.mocked(mockSubscriptionRepo.findByOrganizationId).mockResolvedValue(
      canceledSubscription,
    );

    const result = await useCase.execute({ organizationId: 'org-3' });

    expect(result.subscription!.canceledAt).toEqual(canceledDate);
    expect(result.subscription!.status).toBe(SubscriptionStatus.CANCELED);
  });
});
