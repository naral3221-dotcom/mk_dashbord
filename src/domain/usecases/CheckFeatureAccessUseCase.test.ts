import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CheckFeatureAccessUseCase,
  CheckFeatureAccessInput,
} from './CheckFeatureAccessUseCase';
import { IOrganizationRepository } from '../repositories/IOrganizationRepository';
import { IAdAccountRepository } from '../repositories/IAdAccountRepository';
import { IUserRepository } from '../repositories/IUserRepository';
import { Organization } from '../entities/Organization';
import { Plan, Platform } from '../entities/types';

describe('CheckFeatureAccessUseCase', () => {
  let useCase: CheckFeatureAccessUseCase;
  let mockOrgRepo: IOrganizationRepository;
  let mockAdAccountRepo: IAdAccountRepository;
  let mockUserRepo: IUserRepository;

  const now = new Date();

  const freeOrg = Organization.reconstruct({
    id: 'org-free',
    name: 'Free Org',
    slug: 'free-org',
    plan: Plan.FREE,
    stripeCustomerId: null,
    createdAt: now,
    updatedAt: now,
  });

  const starterOrg = Organization.reconstruct({
    id: 'org-starter',
    name: 'Starter Org',
    slug: 'starter-org',
    plan: Plan.STARTER,
    stripeCustomerId: 'cus_starter',
    createdAt: now,
    updatedAt: now,
  });

  const proOrg = Organization.reconstruct({
    id: 'org-pro',
    name: 'Pro Org',
    slug: 'pro-org',
    plan: Plan.PRO,
    stripeCustomerId: 'cus_pro',
    createdAt: now,
    updatedAt: now,
  });

  const enterpriseOrg = Organization.reconstruct({
    id: 'org-enterprise',
    name: 'Enterprise Org',
    slug: 'enterprise-org',
    plan: Plan.ENTERPRISE,
    stripeCustomerId: 'cus_enterprise',
    createdAt: now,
    updatedAt: now,
  });

  beforeEach(() => {
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

    mockAdAccountRepo = {
      findById: vi.fn(),
      findByOrganizationId: vi.fn(),
      findByPlatform: vi.fn(),
      findByPlatformAndAccountId: vi.fn(),
      findActiveByOrganizationId: vi.fn(),
      findWithExpiredTokens: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      countByOrganizationId: vi.fn(),
    };

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

    useCase = new CheckFeatureAccessUseCase(
      mockOrgRepo,
      mockAdAccountRepo,
      mockUserRepo,
    );
  });

  // --- maxAdAccounts ---

  it('should allow ad account creation when under limit (FREE, 0/1)', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(freeOrg);
    vi.mocked(mockAdAccountRepo.countByOrganizationId).mockResolvedValue(0);

    const result = await useCase.execute({
      organizationId: 'org-free',
      feature: 'maxAdAccounts',
    });

    expect(result.allowed).toBe(true);
    expect(result.currentUsage).toBe(0);
    expect(result.limit).toBe(1);
    expect(result.reason).toBeUndefined();
  });

  it('should deny ad account when at limit (FREE, 1/1)', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(freeOrg);
    vi.mocked(mockAdAccountRepo.countByOrganizationId).mockResolvedValue(1);

    const result = await useCase.execute({
      organizationId: 'org-free',
      feature: 'maxAdAccounts',
    });

    expect(result.allowed).toBe(false);
    expect(result.currentUsage).toBe(1);
    expect(result.limit).toBe(1);
    expect(result.reason).toBe('Ad account limit reached');
  });

  it('should allow unlimited ad accounts for ENTERPRISE (limit=-1)', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(enterpriseOrg);
    vi.mocked(mockAdAccountRepo.countByOrganizationId).mockResolvedValue(
      100,
    );

    const result = await useCase.execute({
      organizationId: 'org-enterprise',
      feature: 'maxAdAccounts',
    });

    expect(result.allowed).toBe(true);
    expect(result.currentUsage).toBe(100);
    expect(result.limit).toBe(-1);
  });

  // --- maxUsers ---

  it('should allow user addition when under limit', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(freeOrg);
    vi.mocked(mockUserRepo.countByOrganizationId).mockResolvedValue(1);

    const result = await useCase.execute({
      organizationId: 'org-free',
      feature: 'maxUsers',
    });

    expect(result.allowed).toBe(true);
    expect(result.currentUsage).toBe(1);
    expect(result.limit).toBe(2);
    expect(result.reason).toBeUndefined();
  });

  it('should deny user when at limit', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(freeOrg);
    vi.mocked(mockUserRepo.countByOrganizationId).mockResolvedValue(2);

    const result = await useCase.execute({
      organizationId: 'org-free',
      feature: 'maxUsers',
    });

    expect(result.allowed).toBe(false);
    expect(result.currentUsage).toBe(2);
    expect(result.limit).toBe(2);
    expect(result.reason).toBe('User limit reached');
  });

  // --- allowedPlatforms ---

  it('should allow platform META on FREE plan', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(freeOrg);

    const result = await useCase.execute({
      organizationId: 'org-free',
      feature: 'allowedPlatforms',
      platform: Platform.META,
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should deny platform GOOGLE on FREE plan', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(freeOrg);

    const result = await useCase.execute({
      organizationId: 'org-free',
      feature: 'allowedPlatforms',
      platform: Platform.GOOGLE,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(
      'Platform GOOGLE is not available on the FREE plan',
    );
  });

  it('should allow platform GOOGLE on STARTER plan', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(starterOrg);

    const result = await useCase.execute({
      organizationId: 'org-starter',
      feature: 'allowedPlatforms',
      platform: Platform.GOOGLE,
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should allow platform TIKTOK on PRO plan', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(proOrg);

    const result = await useCase.execute({
      organizationId: 'org-pro',
      feature: 'allowedPlatforms',
      platform: Platform.TIKTOK,
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should allow all platforms on ENTERPRISE', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(enterpriseOrg);

    const platforms = [
      Platform.META,
      Platform.GOOGLE,
      Platform.TIKTOK,
      Platform.NAVER,
      Platform.KAKAO,
    ];

    for (const platform of platforms) {
      const result = await useCase.execute({
        organizationId: 'org-enterprise',
        feature: 'allowedPlatforms',
        platform,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    }
  });

  // --- hasAutoSync ---

  it('should allow auto sync on STARTER plan', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(starterOrg);

    const result = await useCase.execute({
      organizationId: 'org-starter',
      feature: 'hasAutoSync',
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should deny auto sync on FREE plan', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(freeOrg);

    const result = await useCase.execute({
      organizationId: 'org-free',
      feature: 'hasAutoSync',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(
      'Auto sync is not available on the FREE plan',
    );
  });

  // --- hasExports ---

  it('should allow exports on PRO plan', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(proOrg);

    const result = await useCase.execute({
      organizationId: 'org-pro',
      feature: 'hasExports',
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should deny exports on STARTER plan', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(starterOrg);

    const result = await useCase.execute({
      organizationId: 'org-starter',
      feature: 'hasExports',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(
      'Exports are not available on the STARTER plan',
    );
  });

  // --- Error cases ---

  it('should throw "Organization not found" when org does not exist', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(null);

    await expect(
      useCase.execute({
        organizationId: 'non-existent',
        feature: 'maxAdAccounts',
      }),
    ).rejects.toThrow('Organization not found');

    expect(
      mockAdAccountRepo.countByOrganizationId,
    ).not.toHaveBeenCalled();
  });

  it('should throw "Platform is required" when checking allowedPlatforms without platform', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(freeOrg);

    await expect(
      useCase.execute({
        organizationId: 'org-free',
        feature: 'allowedPlatforms',
      }),
    ).rejects.toThrow('Platform is required for allowedPlatforms check');
  });
});
