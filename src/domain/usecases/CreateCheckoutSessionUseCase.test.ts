import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CreateCheckoutSessionUseCase,
  CreateCheckoutSessionInput,
} from './CreateCheckoutSessionUseCase';
import { IUserRepository } from '../repositories/IUserRepository';
import { IOrganizationRepository } from '../repositories/IOrganizationRepository';
import { IPaymentGateway } from '../services/IPaymentGateway';
import { User } from '../entities/User';
import { Organization } from '../entities/Organization';
import { Plan, Role } from '../entities/types';
import { NotFoundError } from '../errors';

describe('CreateCheckoutSessionUseCase', () => {
  let useCase: CreateCheckoutSessionUseCase;
  let mockUserRepo: IUserRepository;
  let mockOrgRepo: IOrganizationRepository;
  let mockPaymentGateway: IPaymentGateway;

  const now = new Date();

  const ownerUser = User.reconstruct({
    id: 'user-1',
    email: 'owner@test.com',
    name: 'Owner',
    role: Role.OWNER,
    organizationId: 'org-1',
    passwordHash: null,
    authProvider: 'credentials',
    emailVerified: null,
    image: null,
    createdAt: now,
    updatedAt: now,
  });

  const adminUser = User.reconstruct({
    id: 'user-2',
    email: 'admin@test.com',
    name: 'Admin',
    role: Role.ADMIN,
    organizationId: 'org-1',
    passwordHash: null,
    authProvider: 'credentials',
    emailVerified: null,
    image: null,
    createdAt: now,
    updatedAt: now,
  });

  const memberUser = User.reconstruct({
    id: 'user-3',
    email: 'member@test.com',
    name: 'Member',
    role: Role.MEMBER,
    organizationId: 'org-1',
    passwordHash: null,
    authProvider: 'credentials',
    emailVerified: null,
    image: null,
    createdAt: now,
    updatedAt: now,
  });

  const freeOrg = Organization.reconstruct({
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    plan: Plan.FREE,
    stripeCustomerId: null,
    createdAt: now,
    updatedAt: now,
  });

  const freeOrgWithStripeId = Organization.reconstruct({
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    plan: Plan.FREE,
    stripeCustomerId: 'cus_123',
    createdAt: now,
    updatedAt: now,
  });

  const starterOrg = Organization.reconstruct({
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    plan: Plan.STARTER,
    stripeCustomerId: 'cus_123',
    createdAt: now,
    updatedAt: now,
  });

  const proOrg = Organization.reconstruct({
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    plan: Plan.PRO,
    stripeCustomerId: 'cus_123',
    createdAt: now,
    updatedAt: now,
  });

  const defaultInput: CreateCheckoutSessionInput = {
    userId: 'user-1',
    organizationId: 'org-1',
    plan: Plan.PRO,
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
  };

  beforeEach(() => {
    mockUserRepo = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByOrganizationId: vi.fn(),
      findByOrganizationAndRole: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      existsByEmail: vi.fn(),
      countByOrganizationId: vi.fn(),
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

    mockPaymentGateway = {
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      constructWebhookEvent: vi.fn(),
      getSubscription: vi.fn(),
      cancelSubscription: vi.fn(),
    };

    useCase = new CreateCheckoutSessionUseCase(
      mockUserRepo,
      mockOrgRepo,
      mockPaymentGateway,
    );
  });

  it('should create checkout session successfully for upgrade (FREE -> PRO)', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(freeOrg);
    vi.mocked(mockPaymentGateway.createCheckoutSession).mockResolvedValue({
      sessionId: 'cs_123',
      url: 'https://checkout.stripe.com/session/cs_123',
    });

    const result = await useCase.execute(defaultInput);

    expect(result.sessionId).toBe('cs_123');
    expect(result.url).toBe('https://checkout.stripe.com/session/cs_123');
    expect(mockPaymentGateway.createCheckoutSession).toHaveBeenCalledWith({
      organizationId: 'org-1',
      stripeCustomerId: null,
      plan: Plan.PRO,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      customerEmail: 'owner@test.com',
    });
  });

  it('should pass org stripeCustomerId when available', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(freeOrgWithStripeId);
    vi.mocked(mockPaymentGateway.createCheckoutSession).mockResolvedValue({
      sessionId: 'cs_456',
      url: 'https://checkout.stripe.com/session/cs_456',
    });

    await useCase.execute(defaultInput);

    expect(mockPaymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeCustomerId: 'cus_123',
      }),
    );
  });

  it('should pass user email as customerEmail', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(freeOrg);
    vi.mocked(mockPaymentGateway.createCheckoutSession).mockResolvedValue({
      sessionId: 'cs_789',
      url: 'https://checkout.stripe.com/session/cs_789',
    });

    await useCase.execute(defaultInput);

    expect(mockPaymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: 'owner@test.com',
      }),
    );
  });

  it('should throw "User not found" when user does not exist', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(defaultInput)).rejects.toThrow(
      'User not found',
    );
    await expect(useCase.execute(defaultInput)).rejects.toBeInstanceOf(NotFoundError);

    expect(mockOrgRepo.findById).not.toHaveBeenCalled();
    expect(mockPaymentGateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('should throw "User does not belong to this organization" for wrong org', async () => {
    const userInDifferentOrg = User.reconstruct({
      id: 'user-1',
      email: 'owner@test.com',
      name: 'Owner',
      role: Role.OWNER,
      organizationId: 'org-other',
      passwordHash: null,
      authProvider: 'credentials',
      emailVerified: null,
      image: null,
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(mockUserRepo.findById).mockResolvedValue(userInDifferentOrg);

    await expect(useCase.execute(defaultInput)).rejects.toThrow(
      'User does not belong to this organization',
    );

    expect(mockOrgRepo.findById).not.toHaveBeenCalled();
  });

  it('should throw "Only organization owners can manage billing" for ADMIN', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(adminUser);

    await expect(
      useCase.execute({ ...defaultInput, userId: 'user-2' }),
    ).rejects.toThrow('Only organization owners can manage billing');

    expect(mockOrgRepo.findById).not.toHaveBeenCalled();
  });

  it('should throw "Only organization owners can manage billing" for MEMBER', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(memberUser);

    await expect(
      useCase.execute({ ...defaultInput, userId: 'user-3' }),
    ).rejects.toThrow('Only organization owners can manage billing');

    expect(mockOrgRepo.findById).not.toHaveBeenCalled();
  });

  it('should throw "Organization not found" when org does not exist', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(defaultInput)).rejects.toThrow(
      'Organization not found',
    );

    expect(mockPaymentGateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('should throw "Cannot checkout for free plan" when plan is FREE', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(freeOrg);

    await expect(
      useCase.execute({ ...defaultInput, plan: Plan.FREE }),
    ).rejects.toThrow('Cannot checkout for free plan');

    expect(mockPaymentGateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('should throw "Cannot downgrade via checkout" when current=PRO, target=STARTER', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(proOrg);

    await expect(
      useCase.execute({ ...defaultInput, plan: Plan.STARTER }),
    ).rejects.toThrow(
      'Cannot downgrade via checkout. Use the customer portal.',
    );

    expect(mockPaymentGateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('should throw "Cannot downgrade via checkout" when current=PRO, target=PRO (same plan)', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(proOrg);

    await expect(
      useCase.execute({ ...defaultInput, plan: Plan.PRO }),
    ).rejects.toThrow(
      'Cannot downgrade via checkout. Use the customer portal.',
    );

    expect(mockPaymentGateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('should allow upgrade from FREE to STARTER', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(freeOrg);
    vi.mocked(mockPaymentGateway.createCheckoutSession).mockResolvedValue({
      sessionId: 'cs_free_to_starter',
      url: 'https://checkout.stripe.com/session/cs_free_to_starter',
    });

    const result = await useCase.execute({
      ...defaultInput,
      plan: Plan.STARTER,
    });

    expect(result.sessionId).toBe('cs_free_to_starter');
    expect(mockPaymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ plan: Plan.STARTER }),
    );
  });

  it('should allow upgrade from STARTER to PRO', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(starterOrg);
    vi.mocked(mockPaymentGateway.createCheckoutSession).mockResolvedValue({
      sessionId: 'cs_starter_to_pro',
      url: 'https://checkout.stripe.com/session/cs_starter_to_pro',
    });

    const result = await useCase.execute({
      ...defaultInput,
      plan: Plan.PRO,
    });

    expect(result.sessionId).toBe('cs_starter_to_pro');
    expect(mockPaymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ plan: Plan.PRO }),
    );
  });

  it('should allow upgrade from PRO to ENTERPRISE', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(proOrg);
    vi.mocked(mockPaymentGateway.createCheckoutSession).mockResolvedValue({
      sessionId: 'cs_pro_to_enterprise',
      url: 'https://checkout.stripe.com/session/cs_pro_to_enterprise',
    });

    const result = await useCase.execute({
      ...defaultInput,
      plan: Plan.ENTERPRISE,
    });

    expect(result.sessionId).toBe('cs_pro_to_enterprise');
    expect(mockPaymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ plan: Plan.ENTERPRISE }),
    );
  });
});
