import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrismaBillingEventRepository } from './PrismaBillingEventRepository';
import { BillingEvent } from '@/domain/entities/BillingEvent';
import { PrismaClient } from '@/generated/prisma';

// Mock PrismaClient
const mockPrisma = {
  billingEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
};

// Sample DB records matching Prisma schema
const sampleDbRecord = {
  id: 'evt-1',
  organizationId: 'org-1',
  eventType: 'invoice.paid',
  stripeEventId: 'evt_stripe_123',
  data: { amount: 2900, currency: 'usd' },
  createdAt: new Date('2025-01-15T10:00:00Z'),
};

const sampleDbRecord2 = {
  id: 'evt-2',
  organizationId: 'org-1',
  eventType: 'customer.subscription.updated',
  stripeEventId: 'evt_stripe_456',
  data: { previousPlan: 'STARTER', newPlan: 'PRO' },
  createdAt: new Date('2025-01-20T14:30:00Z'),
};

describe('PrismaBillingEventRepository', () => {
  let repository: PrismaBillingEventRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaBillingEventRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('save', () => {
    it('should create and return BillingEvent', async () => {
      const event = BillingEvent.reconstruct({
        id: 'evt-1',
        organizationId: 'org-1',
        eventType: 'invoice.paid',
        stripeEventId: 'evt_stripe_123',
        data: { amount: 2900, currency: 'usd' },
        createdAt: new Date('2025-01-15T10:00:00Z'),
      });

      mockPrisma.billingEvent.create.mockResolvedValue(sampleDbRecord);

      const result = await repository.save(event);

      expect(result).toBeInstanceOf(BillingEvent);
      expect(result.id).toBe('evt-1');
      expect(result.organizationId).toBe('org-1');
      expect(result.eventType).toBe('invoice.paid');
      expect(result.stripeEventId).toBe('evt_stripe_123');
      expect(result.data).toEqual({ amount: 2900, currency: 'usd' });

      const objData = event.toObject();
      expect(mockPrisma.billingEvent.create).toHaveBeenCalledWith({
        data: {
          id: objData.id,
          organizationId: objData.organizationId,
          eventType: objData.eventType,
          stripeEventId: objData.stripeEventId,
          data: objData.data,
          createdAt: objData.createdAt,
        },
      });
    });
  });

  describe('findByOrganizationId', () => {
    it('should return events ordered by createdAt desc', async () => {
      mockPrisma.billingEvent.findMany.mockResolvedValue([sampleDbRecord2, sampleDbRecord]);

      const result = await repository.findByOrganizationId('org-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(BillingEvent);
      expect(result[1]).toBeInstanceOf(BillingEvent);
      expect(result[0]!.id).toBe('evt-2');
      expect(result[1]!.id).toBe('evt-1');
      expect(mockPrisma.billingEvent.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should respect limit option', async () => {
      mockPrisma.billingEvent.findMany.mockResolvedValue([sampleDbRecord2]);

      const result = await repository.findByOrganizationId('org-1', { limit: 1 });

      expect(result).toHaveLength(1);
      expect(mockPrisma.billingEvent.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
    });
  });

  describe('findByStripeEventId', () => {
    it('should return event when found', async () => {
      mockPrisma.billingEvent.findUnique.mockResolvedValue(sampleDbRecord);

      const result = await repository.findByStripeEventId('evt_stripe_123');

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(BillingEvent);
      expect(result!.stripeEventId).toBe('evt_stripe_123');
      expect(mockPrisma.billingEvent.findUnique).toHaveBeenCalledWith({
        where: { stripeEventId: 'evt_stripe_123' },
      });
    });

    it('should return null when not found', async () => {
      mockPrisma.billingEvent.findUnique.mockResolvedValue(null);

      const result = await repository.findByStripeEventId('evt_nonexistent');

      expect(result).toBeNull();
      expect(mockPrisma.billingEvent.findUnique).toHaveBeenCalledWith({
        where: { stripeEventId: 'evt_nonexistent' },
      });
    });
  });
});
