/**
 * Domain-level type definitions
 * NO external dependencies allowed
 */

export enum Plan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum Platform {
  META = 'META',
  GOOGLE = 'GOOGLE',
  TIKTOK = 'TIKTOK',
  NAVER = 'NAVER',
  KAKAO = 'KAKAO',
}

export enum CampaignStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DELETED = 'DELETED',
  ARCHIVED = 'ARCHIVED',
}

export const PlanLimits = {
  [Plan.FREE]: {
    maxAdAccounts: 1,
    maxUsers: 2,
    dataRetentionDays: 30,
    apiCallsPerDay: 100,
  },
  [Plan.STARTER]: {
    maxAdAccounts: 3,
    maxUsers: 5,
    dataRetentionDays: 90,
    apiCallsPerDay: 1000,
  },
  [Plan.PRO]: {
    maxAdAccounts: 10,
    maxUsers: 20,
    dataRetentionDays: 365,
    apiCallsPerDay: 10000,
  },
  [Plan.ENTERPRISE]: {
    maxAdAccounts: -1,
    maxUsers: -1,
    dataRetentionDays: -1,
    apiCallsPerDay: -1,
  },
} as const;

export const RolePermissions = {
  [Role.OWNER]: {
    canManageBilling: true,
    canManageUsers: true,
    canDeleteOrganization: true,
    canManageAdAccounts: true,
    canViewInsights: true,
  },
  [Role.ADMIN]: {
    canManageBilling: false,
    canManageUsers: true,
    canDeleteOrganization: false,
    canManageAdAccounts: true,
    canViewInsights: true,
  },
  [Role.MEMBER]: {
    canManageBilling: false,
    canManageUsers: false,
    canDeleteOrganization: false,
    canManageAdAccounts: true,
    canViewInsights: true,
  },
  [Role.VIEWER]: {
    canManageBilling: false,
    canManageUsers: false,
    canDeleteOrganization: false,
    canManageAdAccounts: false,
    canViewInsights: true,
  },
} as const;

export type PlanLimit = (typeof PlanLimits)[Plan];
export type RolePermission = (typeof RolePermissions)[Role];
