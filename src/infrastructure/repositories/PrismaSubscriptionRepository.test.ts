import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrismaSubscriptionRepository } from './PrismaSubscriptionRepository';
import { Subscription } from '@/domain/entities/Subscription';
import { Plan, SubscriptionStatus } from '@/domain/entities/types';
import { PrismaClient } from '@/generated/prisma';

// Mock PrismaClient
const mockPrisma = {
  subscription: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
};

// Sample DB record matching Prisma schema
const sampleDbRecord = {
  id: 'sub-1',
  organizationId: 'org-1',
  stripeSubscriptionId: 'sub_stripe_123',
  stripePriceId: 'price_123',
  plan: 'PRO' as const,
  status: 'ACTIVE' as const,
  currentPeriodStart: new Date('2025-01-01T00:00:00Z'),
  currentPeriodEnd: new Date('2025-02-01T00:00:00Z'),
  cancelAtPeriodEnd: false,
  canceledAt: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

const trialingDbRecord = {
  id: 'sub-2',
  organizationId: 'org-2',
  stripeSubscriptionId: 'sub_stripe_456',
  stripePriceId: 'price_456',
  plan: 'STARTER' as const,
  status: 'TRIALING' as const,
  currentPeriodStart: new Date('2025-01-15T00:00:00Z'),
  currentPeriodEnd: new Date('2025-02-15T00:00:00Z'),
  cancelAtPeriodEnd: false,
  canceledAt: null,
  createdAt: new Date('2025-01-15T00:00:00Z'),
  updatedAt: new Date('2025-01-15T00:00:00Z'),
};

describe('PrismaSubscriptionRepository', () => {
  let repository: PrismaSubscriptionRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaSubscriptionRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('findById', () => {
    it('should return Subscription when found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(sampleDbRecord);

      const result = await repository.findById('sub-1');

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Subscription);
      expect(result!.id).toBe('sub-1');
      expect(result!.organizationId).toBe('org-1');
      expect(result!.stripeSubscriptionId).toBe('sub_stripe_123');
      expect(result!.stripePriceId).toBe('price_123');
      expect(result!.plan).toBe(Plan.PRO);
      expect(result!.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result!.cancelAtPeriodEnd).toBe(false);
      expect(result!.canceledAt).toBeNull();
      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
      });
    });

    it('should return null when not found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
      });
    });
  });

  describe('findByOrganizationId', () => {
    it('should return Subscription when found by organizationId', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(sampleDbRecord);

      const result = await repository.findByOrganizationId('org-1');

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Subscription);
      expect(result!.organizationId).toBe('org-1');
      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
    });
  });

  describe('findByStripeSubscriptionId', () => {
    it('should return Subscription when found by stripeSubscriptionId', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(sampleDbRecord);

      const result = await repository.findByStripeSubscriptionId('sub_stripe_123');

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Subscription);
      expect(result!.stripeSubscriptionId).toBe('sub_stripe_123');
      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_stripe_123' },
      });
    });
  });

  describe('findActiveByOrganizationId', () => {
    it('should return active subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(sampleDbRecord);

      const result = await repository.findActiveByOrganizationId('org-1');

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Subscription);
      expect(result!.status).toBe(SubscriptionStatus.ACTIVE);
      expect(mockPrisma.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          status: { in: ['ACTIVE', 'TRIALING'] },
        },
      });
    });

    it('should return null when no active subscription exists', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      const result = await repository.findActiveByOrganizationId('org-1');

      expect(result).toBeNull();
      expect(mockPrisma.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          status: { in: ['ACTIVE', 'TRIALING'] },
        },
      });
    });
  });

  describe('save', () => {
    it('should upsert and return Subscription', async () => {
      const subscription = Subscription.reconstruct({
        id: 'sub-1',
        organizationId: 'org-1',
        stripeSubscriptionId: 'sub_stripe_123',
        stripePriceId: 'price_123',
        plan: Plan.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date('2025-01-01T00:00:00Z'),
        currentPeriodEnd: new Date('2025-02-01T00:00:00Z'),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      });

      mockPrisma.subscription.upsert.mockResolvedValue(sampleDbRecord);

      const result = await repository.save(subscription);

      expect(result).toBeInstanceOf(Subscription);
      expect(result.id).toBe('sub-1');

      const objData = subscription.toObject();
      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        create: {
          id: objData.id,
          organizationId: objData.organizationId,
          stripeSubscriptionId: objData.stripeSubscriptionId,
          stripePriceId: objData.stripePriceId,
          plan: objData.plan,
          status: objData.status,
          currentPeriodStart: objData.currentPeriodStart,
          currentPeriodEnd: objData.currentPeriodEnd,
          cancelAtPeriodEnd: objData.cancelAtPeriodEnd,
          canceledAt: objData.canceledAt,
          createdAt: objData.createdAt,
          updatedAt: objData.updatedAt,
        },
        update: {
          stripeSubscriptionId: objData.stripeSubscriptionId,
          stripePriceId: objData.stripePriceId,
          plan: objData.plan,
          status: objData.status,
          currentPeriodStart: objData.currentPeriodStart,
          currentPeriodEnd: objData.currentPeriodEnd,
          cancelAtPeriodEnd: objData.cancelAtPeriodEnd,
          canceledAt: objData.canceledAt,
          updatedAt: objData.updatedAt,
        },
      });
    });
  });

  describe('delete', () => {
    it('should call prisma delete with correct id', async () => {
      mockPrisma.subscription.delete.mockResolvedValue(sampleDbRecord);

      await repository.delete('sub-1');

      expect(mockPrisma.subscription.delete).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
      });
    });
  });
});
