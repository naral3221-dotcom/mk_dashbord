import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InviteUserUseCase, InviteUserInput } from './InviteUserUseCase';
import { User } from '../entities/User';
import { Organization } from '../entities/Organization';
import { Invitation } from '../entities/Invitation';
import { Role, Plan } from '../entities/types';

const mockInvitationRepo = {
  findById: vi.fn(),
  findByToken: vi.fn(),
  findByEmail: vi.fn(),
  findByOrganizationId: vi.fn(),
  findPendingByOrganizationId: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
};

const mockUserRepo = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findByOrganizationId: vi.fn(),
  findByOrganizationAndRole: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  existsByEmail: vi.fn(),
  countByOrganizationId: vi.fn(),
};

const mockOrgRepo = {
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

const actorUser = User.reconstruct({
  id: 'user-1',
  email: 'admin@test.com',
  name: 'Admin',
  role: Role.ADMIN,
  organizationId: 'org-1',
  passwordHash: null,
  authProvider: 'credentials',
  emailVerified: null,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const org = Organization.reconstruct({
  id: 'org-1',
  name: 'Test Org',
  slug: 'test-org',
  plan: Plan.FREE,
  stripeCustomerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

function setupDefaultMocks() {
  vi.mocked(mockUserRepo.findById).mockResolvedValue(actorUser);
  vi.mocked(mockOrgRepo.findById).mockResolvedValue(org);
  vi.mocked(mockUserRepo.countByOrganizationId).mockResolvedValue(1);
  vi.mocked(mockInvitationRepo.findPendingByOrganizationId).mockResolvedValue([]);
  vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
  vi.mocked(mockInvitationRepo.save).mockImplementation(async (inv) => inv);
}

const defaultInput: InviteUserInput = {
  email: 'newuser@test.com',
  role: Role.MEMBER,
  organizationId: 'org-1',
  invitedById: 'user-1',
};

describe('InviteUserUseCase', () => {
  let useCase: InviteUserUseCase;

  beforeEach(() => {
    vi.resetAllMocks();
    setupDefaultMocks();
    useCase = new InviteUserUseCase(mockInvitationRepo, mockUserRepo, mockOrgRepo);
  });

  it('should create invitation successfully', async () => {
    const result = await useCase.execute(defaultInput);

    expect(result).toBeInstanceOf(Invitation);
    expect(result.email).toBe('newuser@test.com');
    expect(result.role).toBe(Role.MEMBER);
    expect(result.organizationId).toBe('org-1');
    expect(result.invitedById).toBe('user-1');
    expect(result.token).toBeDefined();
    expect(result.token.length).toBeGreaterThan(0);
    expect(result.acceptedAt).toBeNull();
    expect(mockInvitationRepo.save).toHaveBeenCalledOnce();
  });

  it('should throw if inviter not found', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(defaultInput)).rejects.toThrow('Inviter not found');
  });

  it('should throw if inviter lacks canManageUsers permission (VIEWER role)', async () => {
    const viewerUser = User.reconstruct({
      id: 'user-1',
      email: 'viewer@test.com',
      name: 'Viewer',
      role: Role.VIEWER,
      organizationId: 'org-1',
      passwordHash: null,
      authProvider: 'credentials',
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(mockUserRepo.findById).mockResolvedValue(viewerUser);

    await expect(useCase.execute(defaultInput)).rejects.toThrow('Insufficient permissions');
  });

  it('should throw if role is OWNER', async () => {
    const input: InviteUserInput = { ...defaultInput, role: Role.OWNER };

    await expect(useCase.execute(input)).rejects.toThrow('Cannot invite user as OWNER');
  });

  it('should throw if organization not found', async () => {
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(defaultInput)).rejects.toThrow('Organization not found');
  });

  it('should throw if user limit reached (FREE plan: maxUsers=2, already 2 users)', async () => {
    // FREE plan maxUsers=2, already 1 user + 1 pending invitation = 2 total
    vi.mocked(mockUserRepo.countByOrganizationId).mockResolvedValue(1);
    const pendingInvitation = Invitation.reconstruct({
      id: 'inv-1',
      email: 'pending@test.com',
      role: Role.MEMBER,
      organizationId: 'org-1',
      invitedById: 'user-1',
      token: 'token-1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: null,
      createdAt: new Date(),
    });
    vi.mocked(mockInvitationRepo.findPendingByOrganizationId).mockResolvedValue([pendingInvitation]);

    await expect(useCase.execute(defaultInput)).rejects.toThrow('User limit reached for current plan');
  });

  it('should allow invite if plan is ENTERPRISE (maxUsers=-1)', async () => {
    const enterpriseOrg = Organization.reconstruct({
      id: 'org-1',
      name: 'Enterprise Org',
      slug: 'enterprise-org',
      plan: Plan.ENTERPRISE,
      stripeCustomerId: 'stripe_123',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(mockOrgRepo.findById).mockResolvedValue(enterpriseOrg);
    vi.mocked(mockUserRepo.countByOrganizationId).mockResolvedValue(100);
    vi.mocked(mockInvitationRepo.findPendingByOrganizationId).mockResolvedValue([]);

    const result = await useCase.execute(defaultInput);

    expect(result).toBeInstanceOf(Invitation);
    expect(result.email).toBe('newuser@test.com');
  });

  it('should throw if email already in same organization', async () => {
    const existingUser = User.reconstruct({
      id: 'user-2',
      email: 'newuser@test.com',
      name: 'Existing',
      role: Role.MEMBER,
      organizationId: 'org-1',
      passwordHash: null,
      authProvider: 'credentials',
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(existingUser);

    await expect(useCase.execute(defaultInput)).rejects.toThrow(
      'User already exists in this organization'
    );
  });

  it('should allow invite if email exists in different organization', async () => {
    const userInDifferentOrg = User.reconstruct({
      id: 'user-3',
      email: 'newuser@test.com',
      name: 'Other Org User',
      role: Role.MEMBER,
      organizationId: 'org-999',
      passwordHash: null,
      authProvider: 'credentials',
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(userInDifferentOrg);

    const result = await useCase.execute(defaultInput);

    expect(result).toBeInstanceOf(Invitation);
    expect(result.email).toBe('newuser@test.com');
  });

  it('should set expiry to 7 days from now', async () => {
    const beforeExec = Date.now();
    const result = await useCase.execute(defaultInput);
    const afterExec = Date.now();

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const expectedMin = beforeExec + sevenDaysMs;
    const expectedMax = afterExec + sevenDaysMs;

    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
  });
});
