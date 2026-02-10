import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrismaOrganizationRepository } from './PrismaOrganizationRepository';
import { Organization } from '@/domain/entities/Organization';
import { Plan } from '@/domain/entities/types';

// Mock PrismaClient
const mockPrisma = {
  organization: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
};

// Sample DB record matching Prisma schema
const sampleDbRecord = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org',
  plan: 'FREE' as const,
  stripeCustomerId: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

const sampleDbRecord2 = {
  id: 'org-2',
  name: 'Another Organization',
  slug: 'another-org',
  plan: 'PRO' as const,
  stripeCustomerId: 'cus_12345',
  createdAt: new Date('2025-02-01T00:00:00Z'),
  updatedAt: new Date('2025-02-01T00:00:00Z'),
};

describe('PrismaOrganizationRepository', () => {
  let repository: PrismaOrganizationRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PrismaOrganizationRepository(mockPrisma as any);
  });

  describe('findById', () => {
    it('should return Organization when found', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(sampleDbRecord);

      const result = await repository.findById('org-1');

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Organization);
      expect(result!.id).toBe('org-1');
      expect(result!.name).toBe('Test Organization');
      expect(result!.slug).toBe('test-org');
      expect(result!.plan).toBe(Plan.FREE);
      expect(result!.stripeCustomerId).toBeNull();
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'org-1' },
      });
    });

    it('should return null when not found', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
      });
    });
  });

  describe('findBySlug', () => {
    it('should return Organization when found by slug', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(sampleDbRecord);

      const result = await repository.findBySlug('test-org');

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Organization);
      expect(result!.slug).toBe('test-org');
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-org' },
      });
    });

    it('should return null when slug not found', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const result = await repository.findBySlug('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByStripeCustomerId', () => {
    it('should return Organization when found by stripeCustomerId', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(sampleDbRecord2);

      const result = await repository.findByStripeCustomerId('cus_12345');

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Organization);
      expect(result!.stripeCustomerId).toBe('cus_12345');
      expect(mockPrisma.organization.findFirst).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_12345' },
      });
    });

    it('should return null when stripeCustomerId not found', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      const result = await repository.findByStripeCustomerId('cus_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByPlan', () => {
    it('should return array of Organizations for given plan', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([sampleDbRecord]);

      const result = await repository.findByPlan(Plan.FREE);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Organization);
      expect(result[0]!.plan).toBe(Plan.FREE);
      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
        where: { plan: 'FREE' },
      });
    });

    it('should return empty array when no organizations match plan', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([]);

      const result = await repository.findByPlan(Plan.ENTERPRISE);

      expect(result).toHaveLength(0);
    });
  });

  describe('save', () => {
    it('should upsert and return Organization', async () => {
      const org = Organization.reconstruct({
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
        plan: Plan.FREE,
        stripeCustomerId: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      });

      mockPrisma.organization.upsert.mockResolvedValue(sampleDbRecord);

      const result = await repository.save(org);

      expect(result).toBeInstanceOf(Organization);
      expect(result.id).toBe('org-1');

      const objData = org.toObject();
      expect(mockPrisma.organization.upsert).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        create: {
          id: objData.id,
          name: objData.name,
          slug: objData.slug,
          plan: objData.plan,
          stripeCustomerId: objData.stripeCustomerId,
          createdAt: objData.createdAt,
          updatedAt: objData.updatedAt,
        },
        update: {
          name: objData.name,
          slug: objData.slug,
          plan: objData.plan,
          stripeCustomerId: objData.stripeCustomerId,
          updatedAt: objData.updatedAt,
        },
      });
    });
  });

  describe('delete', () => {
    it('should call prisma delete with correct id', async () => {
      mockPrisma.organization.delete.mockResolvedValue(sampleDbRecord);

      await repository.delete('org-1');

      expect(mockPrisma.organization.delete).toHaveBeenCalledWith({
        where: { id: 'org-1' },
      });
    });
  });

  describe('existsBySlug', () => {
    it('should return true when slug exists', async () => {
      mockPrisma.organization.count.mockResolvedValue(1);

      const result = await repository.existsBySlug('test-org');

      expect(result).toBe(true);
      expect(mockPrisma.organization.count).toHaveBeenCalledWith({
        where: { slug: 'test-org' },
      });
    });

    it('should return false when slug does not exist', async () => {
      mockPrisma.organization.count.mockResolvedValue(0);

      const result = await repository.existsBySlug('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('countByPlan', () => {
    it('should return count for given plan', async () => {
      mockPrisma.organization.count.mockResolvedValue(5);

      const result = await repository.countByPlan(Plan.PRO);

      expect(result).toBe(5);
      expect(mockPrisma.organization.count).toHaveBeenCalledWith({
        where: { plan: 'PRO' },
      });
    });
  });

  describe('findAll', () => {
    it('should return organizations with total count using defaults', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([sampleDbRecord, sampleDbRecord2]);
      mockPrisma.organization.count.mockResolvedValue(2);

      const result = await repository.findAll();

      expect(result.organizations).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.organizations[0]).toBeInstanceOf(Organization);
      expect(result.organizations[1]).toBeInstanceOf(Organization);
      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrisma.organization.count).toHaveBeenCalled();
    });

    it('should respect pagination and sorting options', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([sampleDbRecord]);
      mockPrisma.organization.count.mockResolvedValue(10);

      const result = await repository.findAll({
        skip: 5,
        take: 5,
        orderBy: 'name',
        order: 'asc',
      });

      expect(result.organizations).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        orderBy: { name: 'asc' },
      });
    });
  });
});
