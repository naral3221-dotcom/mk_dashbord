import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CreatePortalSessionUseCase,
  CreatePortalSessionInput,
} from './CreatePortalSessionUseCase';
import { IUserRepository } from '../repositories/IUserRepository';
import { IOrganizationRepository } from '../repositories/IOrganizationRepository';
import { IPaymentGateway } from '../services/IPaymentGateway';
import { User } from '../entities/User';
import { Organization } from '../entities/Organization';
import { Plan, Role } from '../entities/types';
import { NotFoundError } from '../errors';

describe('CreatePortalSessionUseCase', () => {
  let useCase: CreatePortalSessionUseCase;
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

  const orgWithStripe = Organization.reconstruct({
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    plan: Plan.PRO,
    stripeCustomerId: 'cus_abc123',
    createdAt: now,
    updatedAt: now,
  });

  const orgWithoutStripe = Organization.reconstruct({
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    plan: Plan.FREE,
    stripeCustomerId: null,
    createdAt: now,
    updatedAt: now,
  });

  const defaultInput: CreatePortalSessionInput = {
    userId: 'user-1',
    organizationId: 'org-1',
    returnUrl: 'https://example.com/billing',
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

    useCase = new CreatePortalSessionUseCase(
      mockUserRepo,
      mockOrgRepo,
      mockPaymentGateway,
    );
  });

  it('should create portal session successfully', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(orgWithStripe);
    vi.mocked(mockPaymentGateway.createPortalSession).mockResolvedValue({
      url: 'https://billing.stripe.com/session/portal_123',
    });

    const result = await useCase.execute(defaultInput);

    expect(result.url).toBe(
      'https://billing.stripe.com/session/portal_123',
    );
    expect(mockPaymentGateway.createPortalSession).toHaveBeenCalledWith({
      stripeCustomerId: 'cus_abc123',
      returnUrl: 'https://example.com/billing',
    });
  });

  it('should throw "User not found" when user does not exist', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(defaultInput)).rejects.toThrow(
      'User not found',
    );
    await expect(useCase.execute(defaultInput)).rejects.toBeInstanceOf(NotFoundError);

    expect(mockOrgRepo.findById).not.toHaveBeenCalled();
    expect(mockPaymentGateway.createPortalSession).not.toHaveBeenCalled();
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

  it('should throw "Organization not found" when org does not exist', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(defaultInput)).rejects.toThrow(
      'Organization not found',
    );

    expect(mockPaymentGateway.createPortalSession).not.toHaveBeenCalled();
  });

  it('should throw "No billing account found..." when no stripeCustomerId', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(orgWithoutStripe);

    await expect(useCase.execute(defaultInput)).rejects.toThrow(
      'No billing account found. Please subscribe to a plan first.',
    );

    expect(mockPaymentGateway.createPortalSession).not.toHaveBeenCalled();
  });

  it('should pass correct returnUrl to payment gateway', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(orgWithStripe);
    vi.mocked(mockPaymentGateway.createPortalSession).mockResolvedValue({
      url: 'https://billing.stripe.com/session/portal_456',
    });

    const customReturnUrl = 'https://example.com/settings/billing';
    await useCase.execute({
      ...defaultInput,
      returnUrl: customReturnUrl,
    });

    expect(mockPaymentGateway.createPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        returnUrl: customReturnUrl,
      }),
    );
  });

  it('should pass correct stripeCustomerId to payment gateway', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(ownerUser);
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(orgWithStripe);
    vi.mocked(mockPaymentGateway.createPortalSession).mockResolvedValue({
      url: 'https://billing.stripe.com/session/portal_789',
    });

    await useCase.execute(defaultInput);

    expect(mockPaymentGateway.createPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeCustomerId: 'cus_abc123',
      }),
    );
  });
});
