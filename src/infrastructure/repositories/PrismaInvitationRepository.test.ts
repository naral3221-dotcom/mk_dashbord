import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrismaInvitationRepository } from './PrismaInvitationRepository';
import { Invitation } from '@/domain/entities/Invitation';
import { Role } from '@/domain/entities/types';

// Mock PrismaClient
const mockPrisma = {
  invitation: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
};

// Sample DB record matching Prisma schema
const sampleDbInvitation = {
  id: 'inv-1',
  email: 'invite@example.com',
  role: 'MEMBER',
  organizationId: 'org-1',
  invitedById: 'user-1',
  token: 'token-abc',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  acceptedAt: null,
  createdAt: new Date('2026-01-01'),
};

const sampleDbInvitation2 = {
  id: 'inv-2',
  email: 'another@example.com',
  role: 'ADMIN',
  organizationId: 'org-1',
  invitedById: 'user-1',
  token: 'token-def',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  acceptedAt: null,
  createdAt: new Date('2026-01-02'),
};

describe('PrismaInvitationRepository', () => {
  let repository: PrismaInvitationRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PrismaInvitationRepository(mockPrisma as any);
  });

  describe('findById', () => {
    it('should return Invitation when found', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(sampleDbInvitation);

      const result = await repository.findById('inv-1');

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Invitation);
      expect(result!.id).toBe('inv-1');
      expect(result!.email).toBe('invite@example.com');
      expect(result!.role).toBe(Role.MEMBER);
      expect(result!.organizationId).toBe('org-1');
      expect(result!.invitedById).toBe('user-1');
      expect(result!.token).toBe('token-abc');
      expect(result!.acceptedAt).toBeNull();
      expect(mockPrisma.invitation.findUnique).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
      });
    });

    it('should return null when not found', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
      expect(mockPrisma.invitation.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
      });
    });
  });

  describe('findByToken', () => {
    it('should return Invitation when found by token', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(sampleDbInvitation);

      const result = await repository.findByToken('token-abc');

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Invitation);
      expect(result!.token).toBe('token-abc');
      expect(mockPrisma.invitation.findUnique).toHaveBeenCalledWith({
        where: { token: 'token-abc' },
      });
    });

    it('should return null when token not found', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(null);

      const result = await repository.findByToken('non-existent-token');

      expect(result).toBeNull();
      expect(mockPrisma.invitation.findUnique).toHaveBeenCalledWith({
        where: { token: 'non-existent-token' },
      });
    });
  });

  describe('findByEmail', () => {
    it('should return array of Invitations for given email', async () => {
      mockPrisma.invitation.findMany.mockResolvedValue([sampleDbInvitation]);

      const result = await repository.findByEmail('invite@example.com');

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Invitation);
      expect(result[0]!.email).toBe('invite@example.com');
      expect(mockPrisma.invitation.findMany).toHaveBeenCalledWith({
        where: { email: 'invite@example.com' },
      });
    });
  });

  describe('findByOrganizationId', () => {
    it('should return array of Invitations for given organizationId', async () => {
      mockPrisma.invitation.findMany.mockResolvedValue([
        sampleDbInvitation,
        sampleDbInvitation2,
      ]);

      const result = await repository.findByOrganizationId('org-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Invitation);
      expect(result[1]).toBeInstanceOf(Invitation);
      expect(result[0]!.organizationId).toBe('org-1');
      expect(result[1]!.organizationId).toBe('org-1');
      expect(mockPrisma.invitation.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
    });
  });

  describe('findPendingByOrganizationId', () => {
    it('should filter for pending invitations (acceptedAt null AND expiresAt > now)', async () => {
      mockPrisma.invitation.findMany.mockResolvedValue([sampleDbInvitation]);

      const result = await repository.findPendingByOrganizationId('org-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Invitation);
      expect(result[0]!.acceptedAt).toBeNull();

      const call = mockPrisma.invitation.findMany.mock.calls[0]![0];
      expect(call.where.organizationId).toBe('org-1');
      expect(call.where.acceptedAt).toBeNull();
      expect(call.where.expiresAt).toBeDefined();
      expect(call.where.expiresAt.gt).toBeInstanceOf(Date);
    });
  });

  describe('save', () => {
    it('should upsert and return Invitation', async () => {
      const invitation = Invitation.reconstruct({
        id: 'inv-1',
        email: 'invite@example.com',
        role: Role.MEMBER,
        organizationId: 'org-1',
        invitedById: 'user-1',
        token: 'token-abc',
        expiresAt: sampleDbInvitation.expiresAt,
        acceptedAt: null,
        createdAt: new Date('2026-01-01'),
      });

      mockPrisma.invitation.upsert.mockResolvedValue(sampleDbInvitation);

      const result = await repository.save(invitation);

      expect(result).toBeInstanceOf(Invitation);
      expect(result.id).toBe('inv-1');

      const objData = invitation.toObject();
      expect(mockPrisma.invitation.upsert).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        create: {
          id: objData.id,
          email: objData.email,
          role: objData.role,
          organizationId: objData.organizationId,
          invitedById: objData.invitedById,
          token: objData.token,
          expiresAt: objData.expiresAt,
          acceptedAt: objData.acceptedAt,
          createdAt: objData.createdAt,
        },
        update: {
          email: objData.email,
          role: objData.role,
          organizationId: objData.organizationId,
          invitedById: objData.invitedById,
          token: objData.token,
          expiresAt: objData.expiresAt,
          acceptedAt: objData.acceptedAt,
        },
      });
    });
  });

  describe('delete', () => {
    it('should call prisma delete with correct id', async () => {
      mockPrisma.invitation.delete.mockResolvedValue(sampleDbInvitation);

      await repository.delete('inv-1');

      expect(mockPrisma.invitation.delete).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
      });
    });
  });
});
