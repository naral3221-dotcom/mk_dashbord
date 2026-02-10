import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaCampaignInsightRepository } from './PrismaCampaignInsightRepository';
import { CampaignInsight } from '@/domain/entities/CampaignInsight';

// Mock PrismaClient
const mockPrisma = {
  campaignInsight: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

const sampleDbInsight = {
  id: 'insight-1',
  date: new Date('2026-01-15'),
  spend: 150.50,
  impressions: 10000,
  clicks: 500,
  conversions: 25,
  revenue: 750.00,
  campaignId: 'campaign-1',
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
};

describe('PrismaCampaignInsightRepository', () => {
  let repository: PrismaCampaignInsightRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaCampaignInsightRepository(mockPrisma as any);
  });

  describe('findById', () => {
    it('should return CampaignInsight when found', async () => {
      mockPrisma.campaignInsight.findUnique.mockResolvedValue(sampleDbInsight);

      const result = await repository.findById('insight-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('insight-1');
      expect(result!.date).toEqual(new Date('2026-01-15'));
      expect(result!.spend).toBe(150.50);
      expect(result!.impressions).toBe(10000);
      expect(result!.clicks).toBe(500);
      expect(result!.conversions).toBe(25);
      expect(result!.revenue).toBe(750.00);
      expect(result!.campaignId).toBe('campaign-1');
      expect(mockPrisma.campaignInsight.findUnique).toHaveBeenCalledWith({
        where: { id: 'insight-1' },
      });
    });

    it('should return null when not found', async () => {
      mockPrisma.campaignInsight.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(mockPrisma.campaignInsight.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
      });
    });
  });

  describe('findByCampaignId', () => {
    it('should return array of CampaignInsights for campaign', async () => {
      const secondDbInsight = {
        ...sampleDbInsight,
        id: 'insight-2',
        date: new Date('2026-01-16'),
        spend: 200.00,
        clicks: 600,
      };
      mockPrisma.campaignInsight.findMany.mockResolvedValue([sampleDbInsight, secondDbInsight]);

      const result = await repository.findByCampaignId('campaign-1');

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('insight-1');
      expect(result[1]!.id).toBe('insight-2');
      expect(result[1]!.spend).toBe(200.00);
      expect(mockPrisma.campaignInsight.findMany).toHaveBeenCalledWith({
        where: { campaignId: 'campaign-1' },
      });
    });

    it('should return empty array when no insights found', async () => {
      mockPrisma.campaignInsight.findMany.mockResolvedValue([]);

      const result = await repository.findByCampaignId('campaign-empty');

      expect(result).toHaveLength(0);
    });
  });

  describe('findByCampaignAndDateRange', () => {
    it('should return CampaignInsights within date range', async () => {
      mockPrisma.campaignInsight.findMany.mockResolvedValue([sampleDbInsight]);

      const dateRange = {
        start: new Date('2026-01-01'),
        end: new Date('2026-01-31'),
      };
      const result = await repository.findByCampaignAndDateRange('campaign-1', dateRange);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('insight-1');
      expect(mockPrisma.campaignInsight.findMany).toHaveBeenCalledWith({
        where: {
          campaignId: 'campaign-1',
          date: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-01-31'),
          },
        },
      });
    });
  });

  describe('findByCampaignAndDate', () => {
    it('should return CampaignInsight for specific date', async () => {
      mockPrisma.campaignInsight.findFirst.mockResolvedValue(sampleDbInsight);

      const result = await repository.findByCampaignAndDate('campaign-1', new Date('2026-01-15'));

      expect(result).not.toBeNull();
      expect(result!.id).toBe('insight-1');
      expect(mockPrisma.campaignInsight.findFirst).toHaveBeenCalledWith({
        where: {
          campaignId: 'campaign-1',
          date: expect.any(Date),
        },
      });
    });

    it('should return null when not found for date', async () => {
      mockPrisma.campaignInsight.findFirst.mockResolvedValue(null);

      const result = await repository.findByCampaignAndDate('campaign-1', new Date('2026-02-01'));

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should call upsert and return the saved CampaignInsight', async () => {
      const insight = CampaignInsight.reconstruct({
        id: 'insight-1',
        date: new Date('2026-01-15'),
        spend: 150.50,
        impressions: 10000,
        clicks: 500,
        conversions: 25,
        revenue: 750.00,
        campaignId: 'campaign-1',
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-01-15'),
      });

      mockPrisma.campaignInsight.upsert.mockResolvedValue(sampleDbInsight);

      const result = await repository.save(insight);

      expect(result).not.toBeNull();
      expect(result.id).toBe('insight-1');
      expect(result.spend).toBe(150.50);

      const upsertCall = mockPrisma.campaignInsight.upsert.mock.calls[0]![0];
      expect(upsertCall.where).toEqual({ id: 'insight-1' });
      expect(upsertCall.create).toEqual({
        id: 'insight-1',
        date: new Date('2026-01-15'),
        spend: 150.50,
        impressions: 10000,
        clicks: 500,
        conversions: 25,
        revenue: 750.00,
        campaignId: 'campaign-1',
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-01-15'),
      });
      expect(upsertCall.update).toEqual({
        date: new Date('2026-01-15'),
        spend: 150.50,
        impressions: 10000,
        clicks: 500,
        conversions: 25,
        revenue: 750.00,
        updatedAt: new Date('2026-01-15'),
      });
    });
  });

  describe('saveMany', () => {
    it('should call $transaction with upserts and return saved CampaignInsights', async () => {
      const insight1 = CampaignInsight.reconstruct({
        id: 'insight-1',
        date: new Date('2026-01-15'),
        spend: 150.50,
        impressions: 10000,
        clicks: 500,
        conversions: 25,
        revenue: 750.00,
        campaignId: 'campaign-1',
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-01-15'),
      });
      const insight2 = CampaignInsight.reconstruct({
        id: 'insight-2',
        date: new Date('2026-01-16'),
        spend: 200.00,
        impressions: 12000,
        clicks: 600,
        conversions: 30,
        revenue: 900.00,
        campaignId: 'campaign-1',
        createdAt: new Date('2026-01-16'),
        updatedAt: new Date('2026-01-16'),
      });

      const secondDbInsight = {
        ...sampleDbInsight,
        id: 'insight-2',
        date: new Date('2026-01-16'),
        spend: 200.00,
        impressions: 12000,
        clicks: 600,
        conversions: 30,
        revenue: 900.00,
        createdAt: new Date('2026-01-16'),
        updatedAt: new Date('2026-01-16'),
      };
      mockPrisma.$transaction.mockResolvedValue([sampleDbInsight, secondDbInsight]);

      const result = await repository.saveMany([insight1, insight2]);

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('insight-1');
      expect(result[1]!.id).toBe('insight-2');
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('should call prisma delete with correct id', async () => {
      mockPrisma.campaignInsight.delete.mockResolvedValue(sampleDbInsight);

      await repository.delete('insight-1');

      expect(mockPrisma.campaignInsight.delete).toHaveBeenCalledWith({
        where: { id: 'insight-1' },
      });
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete insights older than given date and return count', async () => {
      mockPrisma.campaignInsight.deleteMany.mockResolvedValue({ count: 42 });

      const cutoffDate = new Date('2026-01-01');
      const result = await repository.deleteOlderThan(cutoffDate);

      expect(result).toBe(42);
      expect(mockPrisma.campaignInsight.deleteMany).toHaveBeenCalledWith({
        where: {
          date: { lt: cutoffDate },
        },
      });
    });

    it('should return 0 when no insights are older than given date', async () => {
      mockPrisma.campaignInsight.deleteMany.mockResolvedValue({ count: 0 });

      const result = await repository.deleteOlderThan(new Date('2020-01-01'));

      expect(result).toBe(0);
    });
  });

  describe('toDomain Decimal conversion', () => {
    it('should convert Prisma Decimal values to numbers', async () => {
      const decimalRecord = {
        ...sampleDbInsight,
        spend: { toNumber: () => 150.50, toString: () => '150.50' } as unknown,
        revenue: { toNumber: () => 750.00, toString: () => '750.00' } as unknown,
      };
      mockPrisma.campaignInsight.findUnique.mockResolvedValue(decimalRecord);

      const result = await repository.findById('insight-1');

      expect(result).not.toBeNull();
      expect(typeof result!.spend).toBe('number');
      expect(typeof result!.revenue).toBe('number');
    });
  });
});
