import { describe, it, expect, vi } from 'vitest';
import { Conversion } from './Conversion';

describe('Conversion Entity', () => {
  const validProps = {
    timestamp: new Date('2026-01-15T10:00:00'),
    source: 'facebook',
    medium: 'cpc',
    campaign: 'summer-sale',
    content: 'banner-ad',
    term: 'marketing tools',
    value: 99.99,
    trackingData: { fbclid: 'abc123', gclid: null },
    organizationId: 'org-123',
  };

  describe('create()', () => {
    it('should create conversion with valid props', () => {
      const conversion = Conversion.create(validProps);
      expect(conversion.source).toBe('facebook');
      expect(conversion.medium).toBe('cpc');
      expect(conversion.campaign).toBe('summer-sale');
      expect(conversion.content).toBe('banner-ad');
      expect(conversion.term).toBe('marketing tools');
      expect(conversion.value).toBe(99.99);
      expect(conversion.organizationId).toBe('org-123');
      expect(conversion.id).toBeDefined();
    });

    it('should create with custom id', () => {
      const conversion = Conversion.create(validProps, 'custom-id');
      expect(conversion.id).toBe('custom-id');
    });

    it('should default value to 0', () => {
      const { value, ...propsWithoutValue } = validProps;
      const conversion = Conversion.create(propsWithoutValue);
      expect(conversion.value).toBe(0);
    });

    it('should round value to 2 decimal places', () => {
      const conversion = Conversion.create({ ...validProps, value: 99.999 });
      expect(conversion.value).toBe(100);
    });

    it('should allow null UTM params', () => {
      const conversion = Conversion.create({
        timestamp: new Date('2026-01-15'),
        organizationId: 'org-123',
      });
      expect(conversion.source).toBeNull();
      expect(conversion.medium).toBeNull();
      expect(conversion.campaign).toBeNull();
      expect(conversion.content).toBeNull();
      expect(conversion.term).toBeNull();
    });

    it('should trim UTM params', () => {
      const conversion = Conversion.create({
        ...validProps,
        source: '  facebook  ',
        medium: '  cpc  ',
        campaign: '  summer  ',
      });
      expect(conversion.source).toBe('facebook');
      expect(conversion.medium).toBe('cpc');
      expect(conversion.campaign).toBe('summer');
    });

    it('should allow null trackingData', () => {
      const conversion = Conversion.create({
        ...validProps,
        trackingData: null,
      });
      expect(conversion.trackingData).toBeNull();
    });

    it('should store trackingData', () => {
      const conversion = Conversion.create(validProps);
      expect(conversion.trackingData).toEqual({ fbclid: 'abc123', gclid: null });
    });

    it('should throw on missing organizationId', () => {
      expect(() =>
        Conversion.create({ ...validProps, organizationId: '' })
      ).toThrow('Organization ID is required');
    });

    it('should throw on negative value', () => {
      expect(() =>
        Conversion.create({ ...validProps, value: -1 })
      ).toThrow('Conversion value cannot be negative');
    });

    it('should throw on future timestamp', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(() =>
        Conversion.create({ ...validProps, timestamp: futureDate })
      ).toThrow('Conversion timestamp cannot be in the future');
    });
  });

  describe('reconstruct()', () => {
    it('should reconstruct from props', () => {
      const now = new Date();
      const conversion = Conversion.reconstruct({
        id: 'conv-1',
        timestamp: now,
        source: 'google',
        medium: 'organic',
        campaign: null,
        content: null,
        term: null,
        value: 50,
        trackingData: null,
        organizationId: 'org-1',
        createdAt: now,
        updatedAt: now,
      });
      expect(conversion.id).toBe('conv-1');
      expect(conversion.source).toBe('google');
      expect(conversion.value).toBe(50);
    });
  });

  describe('getTrackingValue()', () => {
    it('should return tracking value for key', () => {
      const conversion = Conversion.create(validProps);
      expect(conversion.getTrackingValue('fbclid')).toBe('abc123');
    });

    it('should return null for missing key', () => {
      const conversion = Conversion.create(validProps);
      expect(conversion.getTrackingValue('nonexistent')).toBeNull();
    });

    it('should return null when trackingData is null', () => {
      const conversion = Conversion.create({
        ...validProps,
        trackingData: null,
      });
      expect(conversion.getTrackingValue('fbclid')).toBeNull();
    });
  });

  describe('hasUtmParameters()', () => {
    it('should return true when UTM params exist', () => {
      const conversion = Conversion.create(validProps);
      expect(conversion.hasUtmParameters()).toBe(true);
    });

    it('should return true with only source', () => {
      const conversion = Conversion.create({
        timestamp: new Date('2026-01-15'),
        source: 'google',
        organizationId: 'org-123',
      });
      expect(conversion.hasUtmParameters()).toBe(true);
    });

    it('should return false when no UTM params', () => {
      const conversion = Conversion.create({
        timestamp: new Date('2026-01-15'),
        organizationId: 'org-123',
      });
      expect(conversion.hasUtmParameters()).toBe(false);
    });
  });

  describe('getUtmParameters()', () => {
    it('should return all UTM parameters', () => {
      const conversion = Conversion.create(validProps);
      const utmParams = conversion.getUtmParameters();
      expect(utmParams).toEqual({
        source: 'facebook',
        medium: 'cpc',
        campaign: 'summer-sale',
        content: 'banner-ad',
        term: 'marketing tools',
      });
    });

    it('should return null values for missing params', () => {
      const conversion = Conversion.create({
        timestamp: new Date('2026-01-15'),
        organizationId: 'org-123',
      });
      const utmParams = conversion.getUtmParameters();
      expect(utmParams.source).toBeNull();
      expect(utmParams.medium).toBeNull();
      expect(utmParams.campaign).toBeNull();
    });
  });

  describe('toObject()', () => {
    it('should return plain object', () => {
      const conversion = Conversion.create(validProps, 'conv-id');
      const obj = conversion.toObject();
      expect(obj.id).toBe('conv-id');
      expect(obj.source).toBe('facebook');
      expect(obj.value).toBe(99.99);
      expect(obj.organizationId).toBe('org-123');
      expect(obj.trackingData).toEqual({ fbclid: 'abc123', gclid: null });
    });
  });
});
