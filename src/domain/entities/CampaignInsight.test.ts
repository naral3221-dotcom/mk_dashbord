import { describe, it, expect } from 'vitest';
import { CampaignInsight } from './CampaignInsight';

describe('CampaignInsight Entity', () => {
  const validProps = {
    date: new Date('2026-01-15'),
    spend: 1000,
    impressions: 50000,
    clicks: 2500,
    conversions: 100,
    revenue: 5000,
    campaignId: 'camp-123',
  };

  describe('create()', () => {
    it('should create insight with valid props', () => {
      const insight = CampaignInsight.create(validProps);
      expect(insight.spend).toBe(1000);
      expect(insight.impressions).toBe(50000);
      expect(insight.clicks).toBe(2500);
      expect(insight.conversions).toBe(100);
      expect(insight.revenue).toBe(5000);
      expect(insight.campaignId).toBe('camp-123');
      expect(insight.id).toBeDefined();
    });

    it('should create with custom id', () => {
      const insight = CampaignInsight.create(validProps, 'custom-id');
      expect(insight.id).toBe('custom-id');
    });

    it('should normalize date to midnight', () => {
      const dateWithTime = new Date('2026-01-15T14:30:00');
      const insight = CampaignInsight.create({ ...validProps, date: dateWithTime });
      expect(insight.date.getHours()).toBe(0);
      expect(insight.date.getMinutes()).toBe(0);
      expect(insight.date.getSeconds()).toBe(0);
    });

    it('should round spend to 2 decimal places', () => {
      const insight = CampaignInsight.create({ ...validProps, spend: 100.456 });
      expect(insight.spend).toBe(100.46);
    });

    it('should round revenue to 2 decimal places', () => {
      const insight = CampaignInsight.create({ ...validProps, revenue: 200.789 });
      expect(insight.revenue).toBe(200.79);
    });

    it('should floor impressions to integer', () => {
      const insight = CampaignInsight.create({ ...validProps, impressions: 50000.7, clicks: 100 });
      expect(insight.impressions).toBe(50000);
    });

    it('should floor clicks to integer', () => {
      const insight = CampaignInsight.create({ ...validProps, clicks: 50.9 });
      expect(insight.clicks).toBe(50);
    });

    it('should floor conversions to integer', () => {
      const insight = CampaignInsight.create({ ...validProps, conversions: 10.5 });
      expect(insight.conversions).toBe(10);
    });

    it('should throw on missing campaignId', () => {
      expect(() =>
        CampaignInsight.create({ ...validProps, campaignId: '' })
      ).toThrow('Campaign ID is required');
    });

    it('should throw on negative spend', () => {
      expect(() =>
        CampaignInsight.create({ ...validProps, spend: -1 })
      ).toThrow('Spend cannot be negative');
    });

    it('should throw on negative impressions', () => {
      expect(() =>
        CampaignInsight.create({ ...validProps, impressions: -1 })
      ).toThrow('Impressions cannot be negative');
    });

    it('should throw on negative clicks', () => {
      expect(() =>
        CampaignInsight.create({ ...validProps, clicks: -1 })
      ).toThrow('Clicks cannot be negative');
    });

    it('should throw on negative conversions', () => {
      expect(() =>
        CampaignInsight.create({ ...validProps, conversions: -1 })
      ).toThrow('Conversions cannot be negative');
    });

    it('should throw on negative revenue', () => {
      expect(() =>
        CampaignInsight.create({ ...validProps, revenue: -1 })
      ).toThrow('Revenue cannot be negative');
    });

    it('should throw when clicks exceed impressions', () => {
      expect(() =>
        CampaignInsight.create({ ...validProps, clicks: 60000, impressions: 50000 })
      ).toThrow('Clicks cannot exceed impressions');
    });

    it('should allow zero values', () => {
      const insight = CampaignInsight.create({
        ...validProps,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
      });
      expect(insight.spend).toBe(0);
      expect(insight.impressions).toBe(0);
    });
  });

  describe('reconstruct()', () => {
    it('should reconstruct from props', () => {
      const now = new Date();
      const insight = CampaignInsight.reconstruct({
        id: 'ins-1',
        date: now,
        spend: 500,
        impressions: 10000,
        clicks: 500,
        conversions: 50,
        revenue: 2500,
        campaignId: 'camp-1',
        createdAt: now,
        updatedAt: now,
      });
      expect(insight.id).toBe('ins-1');
      expect(insight.spend).toBe(500);
    });
  });

  describe('computed KPIs', () => {
    it('should calculate CTR correctly', () => {
      const insight = CampaignInsight.create(validProps);
      // (2500 / 50000) * 100 = 5.0
      expect(insight.ctr).toBe(5);
    });

    it('should calculate CPC correctly', () => {
      const insight = CampaignInsight.create(validProps);
      // 1000 / 2500 = 0.4
      expect(insight.cpc).toBe(0.4);
    });

    it('should calculate CPM correctly', () => {
      const insight = CampaignInsight.create(validProps);
      // (1000 / 50000) * 1000 = 20
      expect(insight.cpm).toBe(20);
    });

    it('should calculate CVR correctly', () => {
      const insight = CampaignInsight.create(validProps);
      // (100 / 2500) * 100 = 4.0
      expect(insight.cvr).toBe(4);
    });

    it('should calculate CPA correctly', () => {
      const insight = CampaignInsight.create(validProps);
      // 1000 / 100 = 10
      expect(insight.cpa).toBe(10);
    });

    it('should calculate ROAS correctly', () => {
      const insight = CampaignInsight.create(validProps);
      // 5000 / 1000 = 5
      expect(insight.roas).toBe(5);
    });

    it('should calculate ROI correctly', () => {
      const insight = CampaignInsight.create(validProps);
      // ((5000 - 1000) / 1000) * 100 = 400
      expect(insight.roi).toBe(400);
    });

    it('should calculate profit correctly', () => {
      const insight = CampaignInsight.create(validProps);
      // 5000 - 1000 = 4000
      expect(insight.profit).toBe(4000);
    });

    it('should return 0 for CTR when no impressions', () => {
      const insight = CampaignInsight.create({
        ...validProps,
        impressions: 0,
        clicks: 0,
      });
      expect(insight.ctr).toBe(0);
    });

    it('should return 0 for CPC when no clicks', () => {
      const insight = CampaignInsight.create({
        ...validProps,
        clicks: 0,
        conversions: 0,
      });
      expect(insight.cpc).toBe(0);
    });

    it('should return 0 for CPM when no impressions', () => {
      const insight = CampaignInsight.create({
        ...validProps,
        impressions: 0,
        clicks: 0,
      });
      expect(insight.cpm).toBe(0);
    });

    it('should return 0 for CVR when no clicks', () => {
      const insight = CampaignInsight.create({
        ...validProps,
        clicks: 0,
        conversions: 0,
      });
      expect(insight.cvr).toBe(0);
    });

    it('should return 0 for CPA when no conversions', () => {
      const insight = CampaignInsight.create({
        ...validProps,
        conversions: 0,
      });
      expect(insight.cpa).toBe(0);
    });

    it('should return 0 for ROAS when no spend', () => {
      const insight = CampaignInsight.create({
        ...validProps,
        spend: 0,
      });
      expect(insight.roas).toBe(0);
    });

    it('should return 0 for ROI when no spend', () => {
      const insight = CampaignInsight.create({
        ...validProps,
        spend: 0,
      });
      expect(insight.roi).toBe(0);
    });

    it('should calculate negative profit when spend exceeds revenue', () => {
      const insight = CampaignInsight.create({
        ...validProps,
        spend: 5000,
        revenue: 1000,
      });
      expect(insight.profit).toBe(-4000);
    });

    it('should calculate negative ROI when losing money', () => {
      const insight = CampaignInsight.create({
        ...validProps,
        spend: 5000,
        revenue: 1000,
      });
      // ((1000 - 5000) / 5000) * 100 = -80
      expect(insight.roi).toBe(-80);
    });
  });

  describe('updateMetrics()', () => {
    it('should update specific metrics', () => {
      const insight = CampaignInsight.create(validProps);
      const updated = insight.updateMetrics({ spend: 2000 });
      expect(updated.spend).toBe(2000);
      expect(updated.impressions).toBe(50000); // unchanged
    });

    it('should throw when updated clicks exceed impressions', () => {
      const insight = CampaignInsight.create(validProps);
      expect(() =>
        insight.updateMetrics({ clicks: 60000 })
      ).toThrow('Clicks cannot exceed impressions');
    });

    it('should not mutate original', () => {
      const insight = CampaignInsight.create(validProps);
      const updated = insight.updateMetrics({ spend: 2000 });
      expect(insight.spend).toBe(1000);
      expect(updated.spend).toBe(2000);
    });
  });

  describe('getAllMetrics()', () => {
    it('should include base props and computed KPIs', () => {
      const insight = CampaignInsight.create(validProps, 'ins-id');
      const metrics = insight.getAllMetrics();
      expect(metrics.id).toBe('ins-id');
      expect(metrics.spend).toBe(1000);
      expect(metrics.ctr).toBe(5);
      expect(metrics.cpc).toBe(0.4);
      expect(metrics.roas).toBe(5);
      expect(metrics.profit).toBe(4000);
    });
  });

  describe('toObject()', () => {
    it('should return plain object', () => {
      const insight = CampaignInsight.create(validProps, 'ins-id');
      const obj = insight.toObject();
      expect(obj.id).toBe('ins-id');
      expect(obj.spend).toBe(1000);
      expect(obj.campaignId).toBe('camp-123');
    });
  });
});
