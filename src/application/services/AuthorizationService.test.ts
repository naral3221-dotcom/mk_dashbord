import { describe, it, expect, beforeEach } from 'vitest';
import { AuthorizationService } from './AuthorizationService';
import { CheckPermissionUseCase } from '@/domain/usecases/CheckPermissionUseCase';
import { Role } from '@/domain/entities/types';

describe('AuthorizationService', () => {
  let authorizationService: AuthorizationService;
  let checkPermissionUseCase: CheckPermissionUseCase;

  beforeEach(() => {
    checkPermissionUseCase = new CheckPermissionUseCase();
    authorizationService = new AuthorizationService(checkPermissionUseCase);
  });

  describe('checkPermission', () => {
    it('should return true when role has the permission', () => {
      const result = authorizationService.checkPermission(Role.OWNER, 'canManageBilling');

      expect(result).toBe(true);
    });

    it('should return false when role does not have the permission', () => {
      const result = authorizationService.checkPermission(Role.VIEWER, 'canManageUsers');

      expect(result).toBe(false);
    });
  });

  describe('requirePermission', () => {
    it('should not throw when role has the permission', () => {
      expect(() => {
        authorizationService.requirePermission(Role.ADMIN, 'canManageUsers');
      }).not.toThrow();
    });

    it('should throw when role does not have the permission', () => {
      expect(() => {
        authorizationService.requirePermission(Role.MEMBER, 'canManageUsers');
      }).toThrow();
    });

    it('should throw with correct error message', () => {
      expect(() => {
        authorizationService.requirePermission(Role.VIEWER, 'canManageBilling');
      }).toThrow('Forbidden: insufficient permissions');
    });
  });
});
