import { describe, it, expect } from 'vitest';
import { Campaign } from './Campaign';
import { CampaignStatus } from './types';
import { ValidationError } from '../errors';

describe('Campaign Entity', () => {
  const validProps = {
    externalId: 'ext_campaign_123',
    name: 'Summer Sale Campaign',
    adAccountId: 'acc-123',
  };

  describe('create()', () => {
    it('should create campaign with valid props', () => {
      const campaign = Campaign.create(validProps);
      expect(campaign.externalId).toBe('ext_campaign_123');
      expect(campaign.name).toBe('Summer Sale Campaign');
      expect(campaign.status).toBe(CampaignStatus.ACTIVE);
      expect(campaign.adAccountId).toBe('acc-123');
      expect(campaign.id).toBeDefined();
      expect(campaign.createdAt).toBeInstanceOf(Date);
    });

    it('should create with custom id', () => {
      const campaign = Campaign.create(validProps, 'custom-id');
      expect(campaign.id).toBe('custom-id');
    });

    it('should create with specified status', () => {
      const campaign = Campaign.create({
        ...validProps,
        status: CampaignStatus.PAUSED,
      });
      expect(campaign.status).toBe(CampaignStatus.PAUSED);
    });

    it('should default status to ACTIVE', () => {
      const campaign = Campaign.create(validProps);
      expect(campaign.status).toBe(CampaignStatus.ACTIVE);
    });

    it('should trim externalId', () => {
      const campaign = Campaign.create({ ...validProps, externalId: '  ext_123  ' });
      expect(campaign.externalId).toBe('ext_123');
    });

    it('should trim name', () => {
      const campaign = Campaign.create({ ...validProps, name: '  Campaign  ' });
      expect(campaign.name).toBe('Campaign');
    });

    it('should throw on empty externalId', () => {
      expect(() =>
        Campaign.create({ ...validProps, externalId: '' })
      ).toThrow('External campaign ID is required');
    });

    it('should throw ValidationError instance on validation failure', () => {
      expect(() => Campaign.create({ ...validProps, externalId: '' })).toThrow(ValidationError);
    });

    it('should throw on whitespace-only externalId', () => {
      expect(() =>
        Campaign.create({ ...validProps, externalId: '   ' })
      ).toThrow('External campaign ID is required');
    });

    it('should throw on empty name', () => {
      expect(() => Campaign.create({ ...validProps, name: '' })).toThrow(
        'Campaign name is required'
      );
    });

    it('should throw on missing adAccountId', () => {
      expect(() =>
        Campaign.create({ ...validProps, adAccountId: '' })
      ).toThrow('Ad account ID is required');
    });
  });

  describe('reconstruct()', () => {
    it('should reconstruct from props', () => {
      const now = new Date();
      const campaign = Campaign.reconstruct({
        id: 'camp-1',
        externalId: 'ext_1',
        name: 'Test',
        status: CampaignStatus.PAUSED,
        adAccountId: 'acc-1',
        createdAt: now,
        updatedAt: now,
      });
      expect(campaign.id).toBe('camp-1');
      expect(campaign.status).toBe(CampaignStatus.PAUSED);
    });
  });

  describe('updateName()', () => {
    it('should update name', () => {
      const campaign = Campaign.create(validProps);
      const updated = campaign.updateName('New Name');
      expect(updated.name).toBe('New Name');
      expect(campaign.name).toBe('Summer Sale Campaign');
    });

    it('should trim updated name', () => {
      const campaign = Campaign.create(validProps);
      const updated = campaign.updateName('  Trimmed  ');
      expect(updated.name).toBe('Trimmed');
    });

    it('should throw on empty name', () => {
      const campaign = Campaign.create(validProps);
      expect(() => campaign.updateName('')).toThrow('Campaign name is required');
    });
  });

  describe('changeStatus()', () => {
    it('should change status', () => {
      const campaign = Campaign.create(validProps);
      const paused = campaign.changeStatus(CampaignStatus.PAUSED);
      expect(paused.status).toBe(CampaignStatus.PAUSED);
    });

    it('should return same instance if same status', () => {
      const campaign = Campaign.create(validProps);
      const same = campaign.changeStatus(CampaignStatus.ACTIVE);
      expect(same).toBe(campaign);
    });

    it('should throw when changing from DELETED', () => {
      const campaign = Campaign.create({
        ...validProps,
        status: CampaignStatus.DELETED,
      });
      expect(() => campaign.changeStatus(CampaignStatus.ACTIVE)).toThrow(
        'Cannot change status of deleted campaign'
      );
    });

    it('should not mutate original', () => {
      const campaign = Campaign.create(validProps);
      const paused = campaign.changeStatus(CampaignStatus.PAUSED);
      expect(campaign.status).toBe(CampaignStatus.ACTIVE);
      expect(paused.status).toBe(CampaignStatus.PAUSED);
    });
  });

  describe('convenience methods', () => {
    it('pause() should set status to PAUSED', () => {
      const campaign = Campaign.create(validProps);
      expect(campaign.pause().status).toBe(CampaignStatus.PAUSED);
    });

    it('activate() should set status to ACTIVE', () => {
      const campaign = Campaign.create({
        ...validProps,
        status: CampaignStatus.PAUSED,
      });
      expect(campaign.activate().status).toBe(CampaignStatus.ACTIVE);
    });

    it('archive() should set status to ARCHIVED', () => {
      const campaign = Campaign.create(validProps);
      expect(campaign.archive().status).toBe(CampaignStatus.ARCHIVED);
    });

    it('delete() should set status to DELETED', () => {
      const campaign = Campaign.create(validProps);
      expect(campaign.delete().status).toBe(CampaignStatus.DELETED);
    });
  });

  describe('isActive()', () => {
    it('should return true for ACTIVE status', () => {
      const campaign = Campaign.create(validProps);
      expect(campaign.isActive()).toBe(true);
    });

    it('should return false for PAUSED status', () => {
      const campaign = Campaign.create({
        ...validProps,
        status: CampaignStatus.PAUSED,
      });
      expect(campaign.isActive()).toBe(false);
    });
  });

  describe('toObject()', () => {
    it('should return plain object', () => {
      const campaign = Campaign.create(validProps, 'camp-id');
      const obj = campaign.toObject();
      expect(obj.id).toBe('camp-id');
      expect(obj.externalId).toBe('ext_campaign_123');
      expect(obj.name).toBe('Summer Sale Campaign');
      expect(obj.status).toBe(CampaignStatus.ACTIVE);
      expect(obj.adAccountId).toBe('acc-123');
    });
  });
});
