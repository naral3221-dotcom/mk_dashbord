import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CreateOrganizationUseCase,
  CreateOrganizationInput,
} from './CreateOrganizationUseCase';
import { IOrganizationRepository } from '../repositories/IOrganizationRepository';
import { IUserRepository } from '../repositories/IUserRepository';
import { User } from '../entities/User';
import { Plan, Role } from '../entities/types';

describe('CreateOrganizationUseCase', () => {
  let useCase: CreateOrganizationUseCase;
  let mockOrgRepo: IOrganizationRepository;
  let mockUserRepo: IUserRepository;

  const existingUser = User.reconstruct({
    id: 'user-1',
    email: 'owner@example.com',
    name: 'Test Owner',
    role: Role.MEMBER,
    organizationId: null,
    passwordHash: 'hashed',
    authProvider: 'credentials',
    emailVerified: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const validInput: CreateOrganizationInput = {
    name: 'Test Organization',
    slug: 'test-org',
    userId: 'user-1',
    userName: 'Test Owner',
  };

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

    vi.mocked(mockOrgRepo.save).mockImplementation(async (org) => org);
    vi.mocked(mockUserRepo.save).mockImplementation(async (user) => user);
    vi.mocked(mockOrgRepo.existsBySlug).mockResolvedValue(false);
    vi.mocked(mockUserRepo.findById).mockResolvedValue(existingUser);

    useCase = new CreateOrganizationUseCase(mockOrgRepo, mockUserRepo);
  });

  it('should create organization and update owner user successfully', async () => {
    const result = await useCase.execute(validInput);

    expect(result.organization).toBeDefined();
    expect(result.owner).toBeDefined();
    expect(result.organization.name).toBe('Test Organization');
    expect(result.organization.slug).toBe('test-org');
    expect(result.owner.email).toBe('owner@example.com');
    expect(result.owner.organizationId).toBe(result.organization.id);
  });

  it('should set plan to FREE by default', async () => {
    const result = await useCase.execute(validInput);

    expect(result.organization.plan).toBe(Plan.FREE);
  });

  it('should set user role to OWNER', async () => {
    const result = await useCase.execute(validInput);

    expect(result.owner.role).toBe(Role.OWNER);
  });

  it('should throw if slug already exists', async () => {
    vi.mocked(mockOrgRepo.existsBySlug).mockResolvedValue(true);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'Organization slug already exists'
    );
  });

  it('should throw if user not found', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow('User not found');
  });

  it('should save organization before user', async () => {
    const callOrder: string[] = [];

    vi.mocked(mockOrgRepo.save).mockImplementation(async (org) => {
      callOrder.push('orgSave');
      return org;
    });

    vi.mocked(mockUserRepo.save).mockImplementation(async (user) => {
      callOrder.push('userSave');
      return user;
    });

    await useCase.execute(validInput);

    expect(callOrder).toEqual(['orgSave', 'userSave']);
  });

  it('should work without userName', async () => {
    const inputWithoutName: CreateOrganizationInput = {
      name: 'Test Organization',
      slug: 'test-org',
      userId: 'user-1',
    };

    const result = await useCase.execute(inputWithoutName);

    expect(result.organization).toBeDefined();
    expect(result.owner).toBeDefined();
    expect(result.owner.role).toBe(Role.OWNER);
  });
});
