import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrganizationService } from './OrganizationService';
import { CreateOrganizationUseCase } from '@/domain/usecases/CreateOrganizationUseCase';
import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';
import { Organization } from '@/domain/entities/Organization';
import { User } from '@/domain/entities/User';
import { Plan, Role, RolePermissions } from '@/domain/entities/types';

describe('OrganizationService', () => {
  let organizationService: OrganizationService;
  let mockCreateOrgUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockOrgRepo: IOrganizationRepository;

  const testDate = new Date('2024-01-01');

  const mockOrg = Organization.reconstruct({
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    plan: Plan.FREE,
    stripeCustomerId: null,
    createdAt: testDate,
    updatedAt: testDate,
  });

  const mockUser = User.reconstruct({
    id: 'user-1',
    email: 'test@test.com',
    name: 'Owner',
    role: Role.OWNER,
    organizationId: 'org-1',
    passwordHash: null,
    authProvider: 'credentials',
    emailVerified: null,
    image: null,
    createdAt: testDate,
    updatedAt: testDate,
  });

  beforeEach(() => {
    mockCreateOrgUseCase = {
      execute: vi.fn(),
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

    organizationService = new OrganizationService(
      mockCreateOrgUseCase as unknown as CreateOrganizationUseCase,
      mockOrgRepo,
    );
  });

  describe('createOrganization', () => {
    it('should create organization and return response with owner', async () => {
      mockCreateOrgUseCase.execute.mockResolvedValue({
        organization: mockOrg,
        owner: mockUser,
      });

      const request = {
        name: 'Test Org',
        slug: 'test-org',
        userId: 'user-1',
        userName: 'Owner',
      };

      const result = await organizationService.createOrganization(request);

      expect(mockCreateOrgUseCase.execute).toHaveBeenCalledWith(request);
      expect(result.organization).toEqual({
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org',
        plan: Plan.FREE,
        createdAt: testDate,
      });
      expect(result.owner.userId).toBe('user-1');
      expect(result.owner.email).toBe('test@test.com');
      expect(result.owner.name).toBe('Owner');
      expect(result.owner.role).toBe(Role.OWNER);
      expect(result.owner.organizationId).toBe('org-1');
      expect(result.owner.permissions).toEqual({ ...RolePermissions[Role.OWNER] });
    });
  });

  describe('getOrganization', () => {
    it('should return OrganizationResponse when found by id', async () => {
      vi.mocked(mockOrgRepo.findById).mockResolvedValue(mockOrg);

      const result = await organizationService.getOrganization('org-1');

      expect(mockOrgRepo.findById).toHaveBeenCalledWith('org-1');
      expect(result).toEqual({
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org',
        plan: Plan.FREE,
        createdAt: testDate,
      });
    });

    it('should return null when organization is not found by id', async () => {
      vi.mocked(mockOrgRepo.findById).mockResolvedValue(null);

      const result = await organizationService.getOrganization('nonexistent');

      expect(mockOrgRepo.findById).toHaveBeenCalledWith('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getOrganizationBySlug', () => {
    it('should return OrganizationResponse when found by slug', async () => {
      vi.mocked(mockOrgRepo.findBySlug).mockResolvedValue(mockOrg);

      const result = await organizationService.getOrganizationBySlug('test-org');

      expect(mockOrgRepo.findBySlug).toHaveBeenCalledWith('test-org');
      expect(result).toEqual({
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org',
        plan: Plan.FREE,
        createdAt: testDate,
      });
    });

    it('should return null when organization is not found by slug', async () => {
      vi.mocked(mockOrgRepo.findBySlug).mockResolvedValue(null);

      const result = await organizationService.getOrganizationBySlug('nonexistent');

      expect(mockOrgRepo.findBySlug).toHaveBeenCalledWith('nonexistent');
      expect(result).toBeNull();
    });
  });
});
