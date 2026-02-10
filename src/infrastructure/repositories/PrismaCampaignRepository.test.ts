import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaCampaignRepository } from './PrismaCampaignRepository';
import { Campaign } from '@/domain/entities/Campaign';
import { CampaignStatus } from '@/domain/entities/types';

// Mock PrismaClient
const mockPrisma = {
  campaign: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
};

const sampleDbCampaign = {
  id: 'campaign-1',
  externalId: 'ext_camp_001',
  name: 'Test Campaign',
  status: 'ACTIVE' as const,
  adAccountId: 'ad-account-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('PrismaCampaignRepository', () => {
  let repository: PrismaCampaignRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaCampaignRepository(mockPrisma as any);
  });

  describe('findById', () => {
    it('should return Campaign when found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(sampleDbCampaign);

      const result = await repository.findById('campaign-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('campaign-1');
      expect(result!.externalId).toBe('ext_camp_001');
      expect(result!.name).toBe('Test Campaign');
      expect(result!.status).toBe(CampaignStatus.ACTIVE);
      expect(result!.adAccountId).toBe('ad-account-1');
      expect(mockPrisma.campaign.findUnique).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
      });
    });

    it('should return null when not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(mockPrisma.campaign.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
      });
    });
  });

  describe('findByAdAccountId', () => {
    it('should return array of Campaigns for ad account', async () => {
      const secondDbCampaign = {
        ...sampleDbCampaign,
        id: 'campaign-2',
        externalId: 'ext_camp_002',
        name: 'Second Campaign',
        status: 'PAUSED' as const,
      };
      mockPrisma.campaign.findMany.mockResolvedValue([sampleDbCampaign, secondDbCampaign]);

      const result = await repository.findByAdAccountId('ad-account-1');

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('campaign-1');
      expect(result[1]!.id).toBe('campaign-2');
      expect(result[1]!.status).toBe(CampaignStatus.PAUSED);
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith({
        where: { adAccountId: 'ad-account-1' },
      });
    });

    it('should return empty array when no campaigns found', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);

      const result = await repository.findByAdAccountId('ad-account-empty');

      expect(result).toHaveLength(0);
    });
  });

  describe('findByExternalId', () => {
    it('should return Campaign when found by unique constraint', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(sampleDbCampaign);

      const result = await repository.findByExternalId('ad-account-1', 'ext_camp_001');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('campaign-1');
      expect(result!.externalId).toBe('ext_camp_001');
      expect(mockPrisma.campaign.findUnique).toHaveBeenCalledWith({
        where: {
          externalId_adAccountId: {
            adAccountId: 'ad-account-1',
            externalId: 'ext_camp_001',
          },
        },
      });
    });

    it('should return null when not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      const result = await repository.findByExternalId('ad-account-1', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByStatus', () => {
    it('should return Campaigns filtered by ad account and status', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([sampleDbCampaign]);

      const result = await repository.findByStatus('ad-account-1', CampaignStatus.ACTIVE);

      expect(result).toHaveLength(1);
      expect(result[0]!.status).toBe(CampaignStatus.ACTIVE);
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith({
        where: { adAccountId: 'ad-account-1', status: 'ACTIVE' },
      });
    });
  });

  describe('findActiveCampaigns', () => {
    it('should return only active Campaigns for ad account', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([sampleDbCampaign]);

      const result = await repository.findActiveCampaigns('ad-account-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.status).toBe(CampaignStatus.ACTIVE);
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith({
        where: { adAccountId: 'ad-account-1', status: 'ACTIVE' },
      });
    });
  });

  describe('save', () => {
    it('should call upsert and return the saved Campaign', async () => {
      const campaign = Campaign.reconstruct({
        id: 'campaign-1',
        externalId: 'ext_camp_001',
        name: 'Test Campaign',
        status: CampaignStatus.ACTIVE,
        adAccountId: 'ad-account-1',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });

      mockPrisma.campaign.upsert.mockResolvedValue(sampleDbCampaign);

      const result = await repository.save(campaign);

      expect(result).not.toBeNull();
      expect(result.id).toBe('campaign-1');
      expect(result.name).toBe('Test Campaign');

      const upsertCall = mockPrisma.campaign.upsert.mock.calls[0]![0];
      expect(upsertCall.where).toEqual({ id: 'campaign-1' });
      expect(upsertCall.create).toEqual({
        id: 'campaign-1',
        externalId: 'ext_camp_001',
        name: 'Test Campaign',
        status: 'ACTIVE',
        adAccountId: 'ad-account-1',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });
      expect(upsertCall.update).toEqual({
        externalId: 'ext_camp_001',
        name: 'Test Campaign',
        status: 'ACTIVE',
        updatedAt: new Date('2026-01-01'),
      });
    });
  });

  describe('saveMany', () => {
    it('should call $transaction with upserts and return saved Campaigns', async () => {
      const campaign1 = Campaign.reconstruct({
        id: 'campaign-1',
        externalId: 'ext_camp_001',
        name: 'Test Campaign',
        status: CampaignStatus.ACTIVE,
        adAccountId: 'ad-account-1',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });
      const campaign2 = Campaign.reconstruct({
        id: 'campaign-2',
        externalId: 'ext_camp_002',
        name: 'Second Campaign',
        status: CampaignStatus.PAUSED,
        adAccountId: 'ad-account-1',
        createdAt: new Date('2026-01-02'),
        updatedAt: new Date('2026-01-02'),
      });

      const secondDbCampaign = {
        ...sampleDbCampaign,
        id: 'campaign-2',
        externalId: 'ext_camp_002',
        name: 'Second Campaign',
        status: 'PAUSED' as const,
        createdAt: new Date('2026-01-02'),
        updatedAt: new Date('2026-01-02'),
      };
      mockPrisma.$transaction.mockResolvedValue([sampleDbCampaign, secondDbCampaign]);

      const result = await repository.saveMany([campaign1, campaign2]);

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('campaign-1');
      expect(result[1]!.id).toBe('campaign-2');
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('should call prisma delete with correct id', async () => {
      mockPrisma.campaign.delete.mockResolvedValue(sampleDbCampaign);

      await repository.delete('campaign-1');

      expect(mockPrisma.campaign.delete).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
      });
    });
  });

  describe('countByStatus', () => {
    it('should return count of campaigns with given status', async () => {
      mockPrisma.campaign.count.mockResolvedValue(7);

      const result = await repository.countByStatus('ad-account-1', CampaignStatus.ACTIVE);

      expect(result).toBe(7);
      expect(mockPrisma.campaign.count).toHaveBeenCalledWith({
        where: { adAccountId: 'ad-account-1', status: 'ACTIVE' },
      });
    });
  });
});
