import { describe, it, expect } from 'vitest';
import { CheckPermissionUseCase } from './CheckPermissionUseCase';
import { Role } from '../entities/types';

describe('CheckPermissionUseCase', () => {
  const useCase = new CheckPermissionUseCase();

  describe('OWNER role', () => {
    it('should have canManageBilling', () => {
      expect(useCase.execute(Role.OWNER, 'canManageBilling')).toBe(true);
    });

    it('should have canDeleteOrganization', () => {
      expect(useCase.execute(Role.OWNER, 'canDeleteOrganization')).toBe(true);
    });
  });

  describe('ADMIN role', () => {
    it('should have canManageUsers', () => {
      expect(useCase.execute(Role.ADMIN, 'canManageUsers')).toBe(true);
    });

    it('should NOT have canManageBilling', () => {
      expect(useCase.execute(Role.ADMIN, 'canManageBilling')).toBe(false);
    });
  });

  describe('MEMBER role', () => {
    it('should NOT have canManageUsers', () => {
      expect(useCase.execute(Role.MEMBER, 'canManageUsers')).toBe(false);
    });
  });

  describe('VIEWER role', () => {
    it('should have canViewInsights', () => {
      expect(useCase.execute(Role.VIEWER, 'canViewInsights')).toBe(true);
    });

    it('should NOT have canManageAdAccounts', () => {
      expect(useCase.execute(Role.VIEWER, 'canManageAdAccounts')).toBe(false);
    });
  });

  describe('all roles should have canViewInsights', () => {
    it.each([Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER])(
      '%s should have canViewInsights',
      (role) => {
        expect(useCase.execute(role, 'canViewInsights')).toBe(true);
      },
    );
  });
});
