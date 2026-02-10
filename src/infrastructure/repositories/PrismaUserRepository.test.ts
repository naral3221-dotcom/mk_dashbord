import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaUserRepository } from './PrismaUserRepository';
import { User } from '@/domain/entities/User';
import { Role } from '@/domain/entities/types';

// Mock PrismaClient
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
};

const sampleDbUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'MEMBER' as const,
  organizationId: 'org-1',
  passwordHash: null,
  authProvider: 'credentials',
  emailVerified: null,
  image: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaUserRepository(mockPrisma as any);
  });

  describe('findById', () => {
    it('should return User when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(sampleDbUser);

      const result = await repository.findById('user-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-1');
      expect(result!.email).toBe('test@example.com');
      expect(result!.name).toBe('Test User');
      expect(result!.role).toBe(Role.MEMBER);
      expect(result!.organizationId).toBe('org-1');
      expect(result!.passwordHash).toBeNull();
      expect(result!.authProvider).toBe('credentials');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should return null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
      });
    });
  });

  describe('findByEmail', () => {
    it('should return User when found by email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(sampleDbUser);

      const result = await repository.findByEmail('test@example.com');

      expect(result).not.toBeNull();
      expect(result!.email).toBe('test@example.com');
      expect(result!.authProvider).toBe('credentials');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when email not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByOrganizationId', () => {
    it('should return array of Users for organization', async () => {
      const secondDbUser = {
        ...sampleDbUser,
        id: 'user-2',
        email: 'user2@example.com',
        name: 'User Two',
        role: 'ADMIN' as const,
      };
      mockPrisma.user.findMany.mockResolvedValue([sampleDbUser, secondDbUser]);

      const result = await repository.findByOrganizationId('org-1');

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('user-1');
      expect(result[1]!.id).toBe('user-2');
      expect(result[1]!.role).toBe(Role.ADMIN);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
    });

    it('should return empty array when no users found', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await repository.findByOrganizationId('org-empty');

      expect(result).toHaveLength(0);
    });
  });

  describe('findByOrganizationAndRole', () => {
    it('should return Users filtered by organization and role', async () => {
      const adminUser = {
        ...sampleDbUser,
        id: 'user-3',
        email: 'admin@example.com',
        role: 'ADMIN' as const,
      };
      mockPrisma.user.findMany.mockResolvedValue([adminUser]);

      const result = await repository.findByOrganizationAndRole('org-1', Role.ADMIN);

      expect(result).toHaveLength(1);
      expect(result[0]!.role).toBe(Role.ADMIN);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', role: 'ADMIN' },
      });
    });
  });

  describe('save', () => {
    it('should call upsert and return the saved User', async () => {
      const user = User.reconstruct({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.MEMBER,
        organizationId: 'org-1',
        passwordHash: null,
        authProvider: 'credentials',
        emailVerified: null,
        image: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });

      mockPrisma.user.upsert.mockResolvedValue(sampleDbUser);

      const result = await repository.save(user);

      expect(result).not.toBeNull();
      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');

      const upsertCall = mockPrisma.user.upsert.mock.calls[0]![0];
      expect(upsertCall.where).toEqual({ id: 'user-1' });
      expect(upsertCall.create).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'MEMBER',
        organizationId: 'org-1',
        passwordHash: null,
        authProvider: 'credentials',
        emailVerified: null,
        image: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });
      expect(upsertCall.update).toEqual({
        email: 'test@example.com',
        name: 'Test User',
        role: 'MEMBER',
        organizationId: 'org-1',
        passwordHash: null,
        authProvider: 'credentials',
        emailVerified: null,
        image: null,
        updatedAt: new Date('2026-01-01'),
      });
    });
  });

  describe('delete', () => {
    it('should call prisma delete with correct id', async () => {
      mockPrisma.user.delete.mockResolvedValue(sampleDbUser);

      await repository.delete('user-1');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });

  describe('existsByEmail', () => {
    it('should return true when email exists', async () => {
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await repository.existsByEmail('test@example.com');

      expect(result).toBe(true);
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return false when email does not exist', async () => {
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await repository.existsByEmail('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('countByOrganizationId', () => {
    it('should return count of users in organization', async () => {
      mockPrisma.user.count.mockResolvedValue(5);

      const result = await repository.countByOrganizationId('org-1');

      expect(result).toBe(5);
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
    });
  });
});
