import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangeUserRoleUseCase, ChangeUserRoleInput } from './ChangeUserRoleUseCase';
import { IUserRepository } from '../repositories/IUserRepository';
import { User } from '../entities/User';
import { Role } from '../entities/types';

describe('ChangeUserRoleUseCase', () => {
  let useCase: ChangeUserRoleUseCase;
  let mockUserRepo: IUserRepository;

  const adminUser = User.reconstruct({
    id: 'admin-1',
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

  const memberUser = User.reconstruct({
    id: 'member-1',
    email: 'member@test.com',
    name: 'Member',
    role: Role.MEMBER,
    organizationId: 'org-1',
    passwordHash: null,
    authProvider: 'credentials',
    emailVerified: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const ownerUser = User.reconstruct({
    id: 'owner-1',
    email: 'owner@test.com',
    name: 'Owner',
    role: Role.OWNER,
    organizationId: 'org-1',
    passwordHash: null,
    authProvider: 'credentials',
    emailVerified: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

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

    vi.mocked(mockUserRepo.save).mockImplementation(async (user) => user);

    useCase = new ChangeUserRoleUseCase(mockUserRepo);
  });

  it('should change user role successfully', async () => {
    vi.mocked(mockUserRepo.findById)
      .mockResolvedValueOnce(adminUser)   // actor
      .mockResolvedValueOnce(memberUser); // target

    const input: ChangeUserRoleInput = {
      actorUserId: 'admin-1',
      targetUserId: 'member-1',
      newRole: Role.VIEWER,
    };

    const result = await useCase.execute(input);

    expect(result.role).toBe(Role.VIEWER);
    expect(result.id).toBe('member-1');
    expect(mockUserRepo.save).toHaveBeenCalledOnce();
  });

  it('should throw if actor not found', async () => {
    vi.mocked(mockUserRepo.findById)
      .mockResolvedValueOnce(null)        // actor not found
      .mockResolvedValueOnce(memberUser); // target

    const input: ChangeUserRoleInput = {
      actorUserId: 'nonexistent',
      targetUserId: 'member-1',
      newRole: Role.VIEWER,
    };

    await expect(useCase.execute(input)).rejects.toThrow('Actor not found');
  });

  it('should throw if target not found', async () => {
    vi.mocked(mockUserRepo.findById)
      .mockResolvedValueOnce(adminUser) // actor
      .mockResolvedValueOnce(null);     // target not found

    const input: ChangeUserRoleInput = {
      actorUserId: 'admin-1',
      targetUserId: 'nonexistent',
      newRole: Role.VIEWER,
    };

    await expect(useCase.execute(input)).rejects.toThrow('Target user not found');
  });

  it('should throw if users are in different organizations', async () => {
    const otherOrgMember = User.reconstruct({
      id: 'other-1',
      email: 'other@test.com',
      name: 'Other',
      role: Role.MEMBER,
      organizationId: 'org-2',
      passwordHash: null,
      authProvider: 'credentials',
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(mockUserRepo.findById)
      .mockResolvedValueOnce(adminUser)      // actor in org-1
      .mockResolvedValueOnce(otherOrgMember); // target in org-2

    const input: ChangeUserRoleInput = {
      actorUserId: 'admin-1',
      targetUserId: 'other-1',
      newRole: Role.VIEWER,
    };

    await expect(useCase.execute(input)).rejects.toThrow(
      'Users must be in the same organization'
    );
  });

  it('should throw if actor lacks canManageUsers permission', async () => {
    vi.mocked(mockUserRepo.findById)
      .mockResolvedValueOnce(memberUser) // actor is MEMBER (no canManageUsers)
      .mockResolvedValueOnce(
        User.reconstruct({
          id: 'viewer-1',
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
        })
      );

    const input: ChangeUserRoleInput = {
      actorUserId: 'member-1',
      targetUserId: 'viewer-1',
      newRole: Role.MEMBER,
    };

    await expect(useCase.execute(input)).rejects.toThrow('Insufficient permissions');
  });

  it('should throw if changing own role', async () => {
    vi.mocked(mockUserRepo.findById)
      .mockResolvedValueOnce(adminUser) // actor
      .mockResolvedValueOnce(adminUser); // target is same user

    const input: ChangeUserRoleInput = {
      actorUserId: 'admin-1',
      targetUserId: 'admin-1',
      newRole: Role.MEMBER,
    };

    await expect(useCase.execute(input)).rejects.toThrow('Cannot change your own role');
  });

  it('should throw if promoting to OWNER role', async () => {
    vi.mocked(mockUserRepo.findById)
      .mockResolvedValueOnce(adminUser)   // actor
      .mockResolvedValueOnce(memberUser); // target

    const input: ChangeUserRoleInput = {
      actorUserId: 'admin-1',
      targetUserId: 'member-1',
      newRole: Role.OWNER,
    };

    await expect(useCase.execute(input)).rejects.toThrow(
      'Cannot promote user to OWNER role'
    );
  });

  it('should throw if demoting the last OWNER', async () => {
    vi.mocked(mockUserRepo.findById)
      .mockResolvedValueOnce(ownerUser)  // actor is OWNER
      .mockResolvedValueOnce(
        User.reconstruct({
          id: 'owner-2',
          email: 'owner2@test.com',
          name: 'Owner 2',
          role: Role.OWNER,
          organizationId: 'org-1',
          passwordHash: null,
          authProvider: 'credentials',
          emailVerified: null,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ); // target is also OWNER

    // Only 1 OWNER in the org (the target is the only one)
    vi.mocked(mockUserRepo.findByOrganizationAndRole).mockResolvedValue([
      User.reconstruct({
        id: 'owner-2',
        email: 'owner2@test.com',
        name: 'Owner 2',
        role: Role.OWNER,
        organizationId: 'org-1',
        passwordHash: null,
        authProvider: 'credentials',
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ]);

    const input: ChangeUserRoleInput = {
      actorUserId: 'owner-1',
      targetUserId: 'owner-2',
      newRole: Role.ADMIN,
    };

    await expect(useCase.execute(input)).rejects.toThrow(
      'Cannot demote the last owner'
    );
  });
});
