import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './AuthService';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { User } from '@/domain/entities/User';
import { Role, RolePermissions } from '@/domain/entities/types';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepo: IUserRepository;

  const testDate = new Date('2024-01-01');

  const testUser = User.reconstruct({
    id: 'user-1',
    email: 'test@test.com',
    name: 'Test',
    role: Role.ADMIN,
    organizationId: 'org-1',
    passwordHash: null,
    authProvider: 'credentials',
    emailVerified: null,
    image: null,
    createdAt: testDate,
    updatedAt: testDate,
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

    authService = new AuthService(mockUserRepo);
  });

  describe('getUserById', () => {
    it('should return AuthenticatedUser when user is found by id', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(testUser);

      const result = await authService.getUserById('user-1');

      expect(mockUserRepo.findById).toHaveBeenCalledWith('user-1');
      expect(result).not.toBeNull();
      expect(result!.userId).toBe('user-1');
      expect(result!.email).toBe('test@test.com');
      expect(result!.name).toBe('Test');
      expect(result!.role).toBe(Role.ADMIN);
      expect(result!.organizationId).toBe('org-1');
      expect(result!.permissions).toEqual({ ...RolePermissions[Role.ADMIN] });
    });

    it('should return null when user is not found by id', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      const result = await authService.getUserById('nonexistent');

      expect(mockUserRepo.findById).toHaveBeenCalledWith('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return AuthenticatedUser when user is found by email', async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(testUser);

      const result = await authService.getUserByEmail('test@test.com');

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@test.com');
      expect(result).not.toBeNull();
      expect(result!.userId).toBe('user-1');
      expect(result!.email).toBe('test@test.com');
      expect(result!.name).toBe('Test');
      expect(result!.role).toBe(Role.ADMIN);
      expect(result!.organizationId).toBe('org-1');
      expect(result!.permissions).toEqual({ ...RolePermissions[Role.ADMIN] });
    });

    it('should return null when user is not found by email', async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

      const result = await authService.getUserByEmail('notfound@test.com');

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('notfound@test.com');
      expect(result).toBeNull();
    });
  });
});
