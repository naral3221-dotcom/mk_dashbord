import { describe, it, expect } from 'vitest';
import {
  Plan,
  Role,
  Platform,
  CampaignStatus,
  PlanLimits,
  RolePermissions,
} from './types';

describe('Domain Types', () => {
  describe('Plan enum', () => {
    it('should have all plan values', () => {
      expect(Plan.FREE).toBe('FREE');
      expect(Plan.STARTER).toBe('STARTER');
      expect(Plan.PRO).toBe('PRO');
      expect(Plan.ENTERPRISE).toBe('ENTERPRISE');
    });
  });

  describe('Role enum', () => {
    it('should have all role values', () => {
      expect(Role.OWNER).toBe('OWNER');
      expect(Role.ADMIN).toBe('ADMIN');
      expect(Role.MEMBER).toBe('MEMBER');
      expect(Role.VIEWER).toBe('VIEWER');
    });
  });

  describe('Platform enum', () => {
    it('should have all platform values', () => {
      expect(Platform.META).toBe('META');
      expect(Platform.GOOGLE).toBe('GOOGLE');
      expect(Platform.TIKTOK).toBe('TIKTOK');
      expect(Platform.NAVER).toBe('NAVER');
      expect(Platform.KAKAO).toBe('KAKAO');
    });
  });

  describe('CampaignStatus enum', () => {
    it('should have all status values', () => {
      expect(CampaignStatus.ACTIVE).toBe('ACTIVE');
      expect(CampaignStatus.PAUSED).toBe('PAUSED');
      expect(CampaignStatus.DELETED).toBe('DELETED');
      expect(CampaignStatus.ARCHIVED).toBe('ARCHIVED');
    });
  });

  describe('PlanLimits', () => {
    it('should define limits for FREE plan', () => {
      expect(PlanLimits[Plan.FREE]).toEqual({
        maxAdAccounts: 1,
        maxUsers: 2,
        dataRetentionDays: 30,
        apiCallsPerDay: 100,
        allowedPlatforms: [Platform.META],
        hasAutoSync: false,
        hasExports: false,
      });
    });

    it('should define limits for ENTERPRISE plan as unlimited', () => {
      expect(PlanLimits[Plan.ENTERPRISE].maxAdAccounts).toBe(-1);
      expect(PlanLimits[Plan.ENTERPRISE].maxUsers).toBe(-1);
    });

    it('should have increasing limits for higher plans', () => {
      expect(PlanLimits[Plan.STARTER].maxAdAccounts).toBeGreaterThan(
        PlanLimits[Plan.FREE].maxAdAccounts
      );
      expect(PlanLimits[Plan.PRO].maxAdAccounts).toBeGreaterThan(
        PlanLimits[Plan.STARTER].maxAdAccounts
      );
    });
  });

  describe('RolePermissions', () => {
    it('should give OWNER all permissions', () => {
      const ownerPerms = RolePermissions[Role.OWNER];
      expect(ownerPerms.canManageBilling).toBe(true);
      expect(ownerPerms.canManageUsers).toBe(true);
      expect(ownerPerms.canDeleteOrganization).toBe(true);
      expect(ownerPerms.canManageAdAccounts).toBe(true);
      expect(ownerPerms.canViewInsights).toBe(true);
    });

    it('should restrict VIEWER to only viewing', () => {
      const viewerPerms = RolePermissions[Role.VIEWER];
      expect(viewerPerms.canManageBilling).toBe(false);
      expect(viewerPerms.canManageUsers).toBe(false);
      expect(viewerPerms.canDeleteOrganization).toBe(false);
      expect(viewerPerms.canManageAdAccounts).toBe(false);
      expect(viewerPerms.canViewInsights).toBe(true);
    });

    it('should not give ADMIN billing permissions', () => {
      expect(RolePermissions[Role.ADMIN].canManageBilling).toBe(false);
    });
  });
});
