import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvitationService } from './InvitationService';
import { InviteUserUseCase } from '@/domain/usecases/InviteUserUseCase';
import { AcceptInvitationUseCase } from '@/domain/usecases/AcceptInvitationUseCase';
import { IInvitationRepository } from '@/domain/repositories/IInvitationRepository';
import { Invitation } from '@/domain/entities/Invitation';
import { User } from '@/domain/entities/User';
import { Role, RolePermissions } from '@/domain/entities/types';

describe('InvitationService', () => {
  let invitationService: InvitationService;
  let mockInviteUserUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockAcceptInvitationUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockInvitationRepo: IInvitationRepository;

  const testDate = new Date('2024-01-01');
  const futureDate = new Date('2099-01-01');

  const mockInvitation = Invitation.reconstruct({
    id: 'inv-1',
    email: 'invitee@test.com',
    role: Role.MEMBER,
    organizationId: 'org-1',
    invitedById: 'user-1',
    token: 'token-abc',
    expiresAt: futureDate,
    acceptedAt: null,
    createdAt: testDate,
  });

  const mockAcceptedInvitation = Invitation.reconstruct({
    id: 'inv-2',
    email: 'accepted@test.com',
    role: Role.ADMIN,
    organizationId: 'org-1',
    invitedById: 'user-1',
    token: 'token-def',
    expiresAt: futureDate,
    acceptedAt: testDate,
    createdAt: testDate,
  });

  const mockUser = User.reconstruct({
    id: 'user-2',
    email: 'invitee@test.com',
    name: 'Invitee',
    role: Role.MEMBER,
    organizationId: 'org-1',
    passwordHash: null,
    authProvider: 'credentials',
    emailVerified: null,
    image: null,
    createdAt: testDate,
    updatedAt: testDate,
  });

  beforeEach(() => {
    mockInviteUserUseCase = { execute: vi.fn() };
    mockAcceptInvitationUseCase = { execute: vi.fn() };

    mockInvitationRepo = {
      findById: vi.fn(),
      findByToken: vi.fn(),
      findByEmail: vi.fn(),
      findByOrganizationId: vi.fn(),
      findPendingByOrganizationId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };

    invitationService = new InvitationService(
      mockInviteUserUseCase as unknown as InviteUserUseCase,
      mockAcceptInvitationUseCase as unknown as AcceptInvitationUseCase,
      mockInvitationRepo,
    );
  });

  describe('inviteUser', () => {
    it('should invite user and return InvitationResponse', async () => {
      mockInviteUserUseCase.execute.mockResolvedValue(mockInvitation);

      const request = {
        email: 'invitee@test.com',
        role: Role.MEMBER,
        organizationId: 'org-1',
        invitedById: 'user-1',
      };

      const result = await invitationService.inviteUser(request);

      expect(mockInviteUserUseCase.execute).toHaveBeenCalledWith(request);
      expect(result).toEqual({
        id: 'inv-1',
        email: 'invitee@test.com',
        role: Role.MEMBER,
        organizationId: 'org-1',
        token: 'token-abc',
        expiresAt: futureDate,
        acceptedAt: null,
        createdAt: testDate,
        isPending: true,
      });
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and return AuthenticatedUser', async () => {
      mockAcceptInvitationUseCase.execute.mockResolvedValue(mockUser);

      const request = {
        token: 'token-abc',
        userId: 'user-2',
      };

      const result = await invitationService.acceptInvitation(request);

      expect(mockAcceptInvitationUseCase.execute).toHaveBeenCalledWith(request);
      expect(result.userId).toBe('user-2');
      expect(result.email).toBe('invitee@test.com');
      expect(result.name).toBe('Invitee');
      expect(result.role).toBe(Role.MEMBER);
      expect(result.organizationId).toBe('org-1');
      expect(result.permissions).toEqual({ ...RolePermissions[Role.MEMBER] });
    });
  });

  describe('listPendingInvitations', () => {
    it('should return array of InvitationResponse for pending invitations', async () => {
      vi.mocked(mockInvitationRepo.findPendingByOrganizationId).mockResolvedValue([
        mockInvitation,
      ]);

      const result = await invitationService.listPendingInvitations('org-1');

      expect(mockInvitationRepo.findPendingByOrganizationId).toHaveBeenCalledWith('org-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'inv-1',
        email: 'invitee@test.com',
        role: Role.MEMBER,
        organizationId: 'org-1',
        token: 'token-abc',
        expiresAt: futureDate,
        acceptedAt: null,
        createdAt: testDate,
        isPending: true,
      });
    });

    it('should return empty array when no pending invitations', async () => {
      vi.mocked(mockInvitationRepo.findPendingByOrganizationId).mockResolvedValue([]);

      const result = await invitationService.listPendingInvitations('org-1');

      expect(result).toEqual([]);
    });
  });
});
