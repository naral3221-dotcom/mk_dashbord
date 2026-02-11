import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AcceptInvitationUseCase } from './AcceptInvitationUseCase';
import { Invitation } from '../entities/Invitation';
import { User } from '../entities/User';
import { Role } from '../entities/types';
import { NotFoundError } from '../errors';

describe('AcceptInvitationUseCase', () => {
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

  let useCase: AcceptInvitationUseCase;

  const pendingInvitation = Invitation.reconstruct({
    id: 'inv-1',
    email: 'newuser@example.com',
    role: Role.MEMBER,
    organizationId: 'org-1',
    invitedById: 'user-1',
    token: 'valid-token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    createdAt: new Date(),
  });

  const existingUser = User.reconstruct({
    id: 'user-1',
    email: 'newuser@example.com',
    name: 'New User',
    role: Role.MEMBER,
    organizationId: null,
    passwordHash: 'hashed',
    authProvider: 'credentials',
    emailVerified: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const validInput = {
    token: 'valid-token',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new AcceptInvitationUseCase(mockInvitationRepo, mockUserRepo);

    // Default: save returns whatever is passed to it
    mockInvitationRepo.save.mockImplementation((inv: Invitation) => Promise.resolve(inv));
    mockUserRepo.save.mockImplementation((user: User) => Promise.resolve(user));
  });

  it('should accept invitation and update user successfully', async () => {
    mockInvitationRepo.findByToken.mockResolvedValue(pendingInvitation);
    mockUserRepo.findById.mockResolvedValue(existingUser);

    const result = await useCase.execute(validInput);

    expect(mockInvitationRepo.findByToken).toHaveBeenCalledWith('valid-token');
    expect(mockUserRepo.findById).toHaveBeenCalledWith('user-1');
    expect(mockInvitationRepo.save).toHaveBeenCalled();
    expect(mockUserRepo.save).toHaveBeenCalled();

    expect(result).toBeInstanceOf(User);
    expect(result.email).toBe('newuser@example.com');
    expect(result.name).toBe('New User');
    expect(result.organizationId).toBe('org-1');
    expect(result.role).toBe(Role.MEMBER);
  });

  it('should throw if token not found', async () => {
    mockInvitationRepo.findByToken.mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow('Invitation not found');
    await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should throw if invitation is expired', async () => {
    const expiredInvitation = Invitation.reconstruct({
      id: 'inv-2',
      email: 'newuser@example.com',
      role: Role.MEMBER,
      organizationId: 'org-1',
      invitedById: 'user-1',
      token: 'expired-token',
      expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      acceptedAt: null,
      createdAt: new Date(),
    });

    mockInvitationRepo.findByToken.mockResolvedValue(expiredInvitation);

    await expect(useCase.execute({ ...validInput, token: 'expired-token' })).rejects.toThrow(
      'Invitation has expired'
    );
  });

  it('should throw if invitation already accepted', async () => {
    const acceptedInvitation = Invitation.reconstruct({
      id: 'inv-3',
      email: 'newuser@example.com',
      role: Role.MEMBER,
      organizationId: 'org-1',
      invitedById: 'user-1',
      token: 'accepted-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(), // already accepted
      createdAt: new Date(),
    });

    mockInvitationRepo.findByToken.mockResolvedValue(acceptedInvitation);

    await expect(useCase.execute({ ...validInput, token: 'accepted-token' })).rejects.toThrow(
      'Invitation has already been accepted'
    );
  });

  it('should throw if user not found', async () => {
    mockInvitationRepo.findByToken.mockResolvedValue(pendingInvitation);
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow('User not found');
  });

  it('should throw if email does not match', async () => {
    mockInvitationRepo.findByToken.mockResolvedValue(pendingInvitation);

    const wrongEmailUser = User.reconstruct({
      id: 'user-1',
      email: 'wrong@example.com',
      name: 'Wrong User',
      role: Role.MEMBER,
      organizationId: null,
      passwordHash: 'hashed',
      authProvider: 'credentials',
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockUserRepo.findById.mockResolvedValue(wrongEmailUser);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'Email does not match invitation'
    );
  });

  it('should handle case-insensitive email matching', async () => {
    mockInvitationRepo.findByToken.mockResolvedValue(pendingInvitation);

    const upperCaseEmailUser = User.reconstruct({
      id: 'user-1',
      email: 'NewUser@EXAMPLE.COM',
      name: 'New User',
      role: Role.MEMBER,
      organizationId: null,
      passwordHash: 'hashed',
      authProvider: 'credentials',
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockUserRepo.findById.mockResolvedValue(upperCaseEmailUser);

    const result = await useCase.execute(validInput);

    expect(result).toBeInstanceOf(User);
    expect(result.organizationId).toBe('org-1');
  });

  it('should set user role from invitation role', async () => {
    const adminInvitation = Invitation.reconstruct({
      id: 'inv-4',
      email: 'newuser@example.com',
      role: Role.ADMIN,
      organizationId: 'org-1',
      invitedById: 'user-1',
      token: 'admin-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: null,
      createdAt: new Date(),
    });

    mockInvitationRepo.findByToken.mockResolvedValue(adminInvitation);
    mockUserRepo.findById.mockResolvedValue(existingUser);

    const result = await useCase.execute({
      token: 'admin-token',
      userId: 'user-1',
    });

    expect(result.role).toBe(Role.ADMIN);
  });
});
