import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaAdAccountRepository } from './PrismaAdAccountRepository';
import { AdAccount } from '@/domain/entities/AdAccount';
import { Platform } from '@/domain/entities/types';

// Mock PrismaClient
const mockPrisma = {
  adAccount: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
};

const sampleDbAdAccount = {
  id: 'ad-account-1',
  platform: 'META' as const,
  accountId: 'act_123456',
  accountName: 'Test Ad Account',
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-123',
  tokenExpiresAt: new Date('2026-03-01'),
  isActive: true,
  organizationId: 'org-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('PrismaAdAccountRepository', () => {
  let repository: PrismaAdAccountRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaAdAccountRepository(mockPrisma as any);
  });

  describe('findById', () => {
    it('should return AdAccount when found', async () => {
      mockPrisma.adAccount.findUnique.mockResolvedValue(sampleDbAdAccount);

      const result = await repository.findById('ad-account-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('ad-account-1');
      expect(result!.platform).toBe(Platform.META);
      expect(result!.accountId).toBe('act_123456');
      expect(result!.accountName).toBe('Test Ad Account');
      expect(result!.accessToken).toBe('access-token-123');
      expect(result!.refreshToken).toBe('refresh-token-123');
      expect(result!.tokenExpiresAt).toEqual(new Date('2026-03-01'));
      expect(result!.isActive).toBe(true);
      expect(result!.organizationId).toBe('org-1');
      expect(mockPrisma.adAccount.findUnique).toHaveBeenCalledWith({
        where: { id: 'ad-account-1' },
      });
    });

    it('should return null when not found', async () => {
      mockPrisma.adAccount.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(mockPrisma.adAccount.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
      });
    });
  });

  describe('findByOrganizationId', () => {
    it('should return array of AdAccounts for organization', async () => {
      const secondDbAdAccount = {
        ...sampleDbAdAccount,
        id: 'ad-account-2',
        platform: 'GOOGLE' as const,
        accountId: 'gads_789',
        accountName: 'Google Ads Account',
      };
      mockPrisma.adAccount.findMany.mockResolvedValue([sampleDbAdAccount, secondDbAdAccount]);

      const result = await repository.findByOrganizationId('org-1');

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('ad-account-1');
      expect(result[0]!.platform).toBe(Platform.META);
      expect(result[1]!.id).toBe('ad-account-2');
      expect(result[1]!.platform).toBe(Platform.GOOGLE);
      expect(mockPrisma.adAccount.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
    });

    it('should return empty array when no ad accounts found', async () => {
      mockPrisma.adAccount.findMany.mockResolvedValue([]);

      const result = await repository.findByOrganizationId('org-empty');

      expect(result).toHaveLength(0);
    });
  });

  describe('findByPlatform', () => {
    it('should return AdAccounts filtered by organization and platform', async () => {
      mockPrisma.adAccount.findMany.mockResolvedValue([sampleDbAdAccount]);

      const result = await repository.findByPlatform('org-1', Platform.META);

      expect(result).toHaveLength(1);
      expect(result[0]!.platform).toBe(Platform.META);
      expect(mockPrisma.adAccount.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', platform: 'META' },
      });
    });
  });

  describe('findByPlatformAndAccountId', () => {
    it('should return AdAccount when found by unique constraint', async () => {
      mockPrisma.adAccount.findUnique.mockResolvedValue(sampleDbAdAccount);

      const result = await repository.findByPlatformAndAccountId('org-1', Platform.META, 'act_123456');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('ad-account-1');
      expect(result!.platform).toBe(Platform.META);
      expect(result!.accountId).toBe('act_123456');
      expect(mockPrisma.adAccount.findUnique).toHaveBeenCalledWith({
        where: {
          platform_accountId_organizationId: {
            organizationId: 'org-1',
            platform: 'META',
            accountId: 'act_123456',
          },
        },
      });
    });

    it('should return null when not found', async () => {
      mockPrisma.adAccount.findUnique.mockResolvedValue(null);

      const result = await repository.findByPlatformAndAccountId('org-1', Platform.META, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findActiveByOrganizationId', () => {
    it('should return only active AdAccounts for organization', async () => {
      mockPrisma.adAccount.findMany.mockResolvedValue([sampleDbAdAccount]);

      const result = await repository.findActiveByOrganizationId('org-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.isActive).toBe(true);
      expect(mockPrisma.adAccount.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', isActive: true },
      });
    });
  });

  describe('findWithExpiredTokens', () => {
    it('should return active AdAccounts with expired tokens', async () => {
      const expiredAccount = {
        ...sampleDbAdAccount,
        tokenExpiresAt: new Date('2025-01-01'),
      };
      mockPrisma.adAccount.findMany.mockResolvedValue([expiredAccount]);

      const result = await repository.findWithExpiredTokens();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('ad-account-1');
      expect(mockPrisma.adAccount.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          tokenExpiresAt: {
            not: null,
            lte: expect.any(Date),
          },
        },
      });
    });
  });

  describe('save', () => {
    it('should call upsert and return the saved AdAccount', async () => {
      const adAccount = AdAccount.reconstruct({
        id: 'ad-account-1',
        platform: Platform.META,
        accountId: 'act_123456',
        accountName: 'Test Ad Account',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        tokenExpiresAt: new Date('2026-03-01'),
        isActive: true,
        organizationId: 'org-1',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });

      mockPrisma.adAccount.upsert.mockResolvedValue(sampleDbAdAccount);

      const result = await repository.save(adAccount);

      expect(result).not.toBeNull();
      expect(result.id).toBe('ad-account-1');
      expect(result.platform).toBe(Platform.META);

      const upsertCall = mockPrisma.adAccount.upsert.mock.calls[0]![0];
      expect(upsertCall.where).toEqual({ id: 'ad-account-1' });
      expect(upsertCall.create).toEqual({
        id: 'ad-account-1',
        platform: 'META',
        accountId: 'act_123456',
        accountName: 'Test Ad Account',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        tokenExpiresAt: new Date('2026-03-01'),
        isActive: true,
        organizationId: 'org-1',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });
      expect(upsertCall.update).toEqual({
        platform: 'META',
        accountId: 'act_123456',
        accountName: 'Test Ad Account',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        tokenExpiresAt: new Date('2026-03-01'),
        isActive: true,
        updatedAt: new Date('2026-01-01'),
      });
    });
  });

  describe('delete', () => {
    it('should call prisma delete with correct id', async () => {
      mockPrisma.adAccount.delete.mockResolvedValue(sampleDbAdAccount);

      await repository.delete('ad-account-1');

      expect(mockPrisma.adAccount.delete).toHaveBeenCalledWith({
        where: { id: 'ad-account-1' },
      });
    });
  });

  describe('countByOrganizationId', () => {
    it('should return count of ad accounts in organization', async () => {
      mockPrisma.adAccount.count.mockResolvedValue(3);

      const result = await repository.countByOrganizationId('org-1');

      expect(result).toBe(3);
      expect(mockPrisma.adAccount.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
    });
  });
});
