import { describe, it, expect } from 'vitest';
import { BillingEvent } from './BillingEvent';

describe('BillingEvent Entity', () => {
  const validProps = {
    organizationId: 'org-123',
    eventType: 'invoice.paid',
    stripeEventId: 'evt_abc123',
    data: { amount: 9900, currency: 'usd' },
  };

  describe('create()', () => {
    it('should create billing event with valid props', () => {
      const event = BillingEvent.create(validProps);
      expect(event.organizationId).toBe('org-123');
      expect(event.eventType).toBe('invoice.paid');
      expect(event.stripeEventId).toBe('evt_abc123');
      expect(event.data).toEqual({ amount: 9900, currency: 'usd' });
      expect(event.id).toBeDefined();
      expect(event.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique id when not provided', () => {
      const event1 = BillingEvent.create(validProps);
      const event2 = BillingEvent.create(validProps);
      expect(event1.id).not.toBe(event2.id);
    });

    it('should use provided custom id', () => {
      const event = BillingEvent.create(validProps, 'custom-id');
      expect(event.id).toBe('custom-id');
    });

    it('should throw if organizationId is empty', () => {
      expect(() =>
        BillingEvent.create({ ...validProps, organizationId: '' })
      ).toThrow('Organization ID is required');
    });

    it('should throw if organizationId is whitespace only', () => {
      expect(() =>
        BillingEvent.create({ ...validProps, organizationId: '   ' })
      ).toThrow('Organization ID is required');
    });

    it('should throw if eventType is empty', () => {
      expect(() =>
        BillingEvent.create({ ...validProps, eventType: '' })
      ).toThrow('Event type is required');
    });

    it('should throw if eventType is whitespace only', () => {
      expect(() =>
        BillingEvent.create({ ...validProps, eventType: '   ' })
      ).toThrow('Event type is required');
    });

    it('should throw if stripeEventId is empty', () => {
      expect(() =>
        BillingEvent.create({ ...validProps, stripeEventId: '' })
      ).toThrow('Stripe event ID is required');
    });

    it('should throw if stripeEventId is whitespace only', () => {
      expect(() =>
        BillingEvent.create({ ...validProps, stripeEventId: '   ' })
      ).toThrow('Stripe event ID is required');
    });
  });

  describe('reconstruct()', () => {
    it('should create entity without validation', () => {
      const now = new Date();
      const event = BillingEvent.reconstruct({
        id: 'test-id',
        organizationId: 'org-456',
        eventType: 'charge.succeeded',
        stripeEventId: 'evt_xyz789',
        data: { invoiceId: 'inv_001' },
        createdAt: now,
      });
      expect(event.id).toBe('test-id');
      expect(event.organizationId).toBe('org-456');
      expect(event.eventType).toBe('charge.succeeded');
      expect(event.stripeEventId).toBe('evt_xyz789');
      expect(event.data).toEqual({ invoiceId: 'inv_001' });
      expect(event.createdAt).toBe(now);
    });
  });

  describe('toObject()', () => {
    it('should return copy of all props', () => {
      const event = BillingEvent.create(validProps, 'test-id');
      const obj = event.toObject();
      expect(obj.id).toBe('test-id');
      expect(obj.organizationId).toBe('org-123');
      expect(obj.eventType).toBe('invoice.paid');
      expect(obj.stripeEventId).toBe('evt_abc123');
      expect(obj.data).toEqual({ amount: 9900, currency: 'usd' });
      expect(obj.createdAt).toBeInstanceOf(Date);
    });

    it('should return a deep copy of data', () => {
      const event = BillingEvent.create(validProps, 'test-id');
      const obj = event.toObject();
      obj.data['mutated'] = true;
      expect(event.data).not.toHaveProperty('mutated');
    });
  });

  describe('getters', () => {
    it('should return correct values for all getters', () => {
      const now = new Date();
      const event = BillingEvent.reconstruct({
        id: 'getter-test-id',
        organizationId: 'org-getter',
        eventType: 'subscription.created',
        stripeEventId: 'evt_getter',
        data: { planId: 'plan_pro' },
        createdAt: now,
      });

      expect(event.id).toBe('getter-test-id');
      expect(event.organizationId).toBe('org-getter');
      expect(event.eventType).toBe('subscription.created');
      expect(event.stripeEventId).toBe('evt_getter');
      expect(event.data).toEqual({ planId: 'plan_pro' });
      expect(event.createdAt).toBe(now);
    });
  });
});
