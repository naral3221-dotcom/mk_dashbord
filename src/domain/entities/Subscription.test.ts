import { describe, it, expect } from 'vitest';
import { Subscription } from './Subscription';
import { Plan, SubscriptionStatus } from './types';

describe('Subscription Entity', () => {
  const validProps = {
    organizationId: 'org-123',
    stripeSubscriptionId: 'sub_abc123',
    stripePriceId: 'price_xyz789',
    plan: Plan.PRO,
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: new Date('2026-01-01'),
    currentPeriodEnd: new Date('2026-02-01'),
  };

  describe('create()', () => {
    it('should create subscription with valid props', () => {
      const sub = Subscription.create(validProps);
      expect(sub.organizationId).toBe('org-123');
      expect(sub.stripeSubscriptionId).toBe('sub_abc123');
      expect(sub.stripePriceId).toBe('price_xyz789');
      expect(sub.plan).toBe(Plan.PRO);
      expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
      expect(sub.currentPeriodStart).toEqual(new Date('2026-01-01'));
      expect(sub.currentPeriodEnd).toEqual(new Date('2026-02-01'));
      expect(sub.id).toBeDefined();
      expect(sub.createdAt).toBeInstanceOf(Date);
      expect(sub.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique id', () => {
      const sub1 = Subscription.create(validProps);
      const sub2 = Subscription.create(validProps);
      expect(sub1.id).not.toBe(sub2.id);
    });

    it('should use provided custom id', () => {
      const sub = Subscription.create(validProps, 'custom-id-123');
      expect(sub.id).toBe('custom-id-123');
    });

    it('should throw if organizationId is empty', () => {
      expect(() =>
        Subscription.create({ ...validProps, organizationId: '' })
      ).toThrow('Organization ID is required');
    });

    it('should throw if stripeSubscriptionId is empty', () => {
      expect(() =>
        Subscription.create({ ...validProps, stripeSubscriptionId: '' })
      ).toThrow('Stripe subscription ID is required');
    });

    it('should throw if stripePriceId is empty', () => {
      expect(() =>
        Subscription.create({ ...validProps, stripePriceId: '' })
      ).toThrow('Stripe price ID is required');
    });

    it('should throw if currentPeriodEnd is before currentPeriodStart', () => {
      expect(() =>
        Subscription.create({
          ...validProps,
          currentPeriodStart: new Date('2026-02-01'),
          currentPeriodEnd: new Date('2026-01-01'),
        })
      ).toThrow('Current period end must be after current period start');
    });

    it('should throw if currentPeriodEnd equals currentPeriodStart', () => {
      const sameDate = new Date('2026-01-15');
      expect(() =>
        Subscription.create({
          ...validProps,
          currentPeriodStart: sameDate,
          currentPeriodEnd: sameDate,
        })
      ).toThrow('Current period end must be after current period start');
    });

    it('should set defaults: cancelAtPeriodEnd=false, canceledAt=null', () => {
      const sub = Subscription.create(validProps);
      expect(sub.cancelAtPeriodEnd).toBe(false);
      expect(sub.canceledAt).toBeNull();
    });
  });

  describe('reconstruct()', () => {
    it('should reconstruct from props without validation', () => {
      const now = new Date();
      const sub = Subscription.reconstruct({
        id: 'sub-id',
        organizationId: 'org-123',
        stripeSubscriptionId: 'sub_abc',
        stripePriceId: 'price_xyz',
        plan: Plan.ENTERPRISE,
        status: SubscriptionStatus.CANCELED,
        currentPeriodStart: now,
        currentPeriodEnd: now, // same date - no validation in reconstruct
        cancelAtPeriodEnd: true,
        canceledAt: now,
        createdAt: now,
        updatedAt: now,
      });
      expect(sub.id).toBe('sub-id');
      expect(sub.plan).toBe(Plan.ENTERPRISE);
      expect(sub.status).toBe(SubscriptionStatus.CANCELED);
      expect(sub.cancelAtPeriodEnd).toBe(true);
      expect(sub.canceledAt).toBe(now);
    });
  });

  describe('isActive()', () => {
    it('should return true for ACTIVE status', () => {
      const sub = Subscription.create(validProps);
      expect(sub.isActive()).toBe(true);
    });

    it('should return true for TRIALING status', () => {
      const sub = Subscription.create({
        ...validProps,
        status: SubscriptionStatus.TRIALING,
      });
      expect(sub.isActive()).toBe(true);
    });

    it('should return false for CANCELED status', () => {
      const sub = Subscription.create({
        ...validProps,
        status: SubscriptionStatus.CANCELED,
      });
      expect(sub.isActive()).toBe(false);
    });
  });

  describe('isCanceling()', () => {
    it('should return true when cancelAtPeriodEnd is true and status is not CANCELED', () => {
      const now = new Date();
      const sub = Subscription.reconstruct({
        id: 'sub-id',
        organizationId: 'org-123',
        stripeSubscriptionId: 'sub_abc',
        stripePriceId: 'price_xyz',
        plan: Plan.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date('2026-01-01'),
        currentPeriodEnd: new Date('2026-02-01'),
        cancelAtPeriodEnd: true,
        canceledAt: null,
        createdAt: now,
        updatedAt: now,
      });
      expect(sub.isCanceling()).toBe(true);
    });

    it('should return false when status is CANCELED', () => {
      const now = new Date();
      const sub = Subscription.reconstruct({
        id: 'sub-id',
        organizationId: 'org-123',
        stripeSubscriptionId: 'sub_abc',
        stripePriceId: 'price_xyz',
        plan: Plan.PRO,
        status: SubscriptionStatus.CANCELED,
        currentPeriodStart: new Date('2026-01-01'),
        currentPeriodEnd: new Date('2026-02-01'),
        cancelAtPeriodEnd: true,
        canceledAt: now,
        createdAt: now,
        updatedAt: now,
      });
      expect(sub.isCanceling()).toBe(false);
    });
  });

  describe('isPastDue()', () => {
    it('should return true for PAST_DUE status', () => {
      const sub = Subscription.create({
        ...validProps,
        status: SubscriptionStatus.PAST_DUE,
      });
      expect(sub.isPastDue()).toBe(true);
    });

    it('should return false for ACTIVE status', () => {
      const sub = Subscription.create(validProps);
      expect(sub.isPastDue()).toBe(false);
    });
  });

  describe('updateStatus()', () => {
    it('should return new instance with updated status', () => {
      const sub = Subscription.create(validProps);
      const updated = sub.updateStatus(SubscriptionStatus.PAST_DUE);
      expect(updated.status).toBe(SubscriptionStatus.PAST_DUE);
      expect(sub.status).toBe(SubscriptionStatus.ACTIVE); // immutable
      expect(updated.id).toBe(sub.id);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(sub.updatedAt.getTime());
    });
  });

  describe('updatePeriod()', () => {
    it('should return new instance with updated dates', () => {
      const sub = Subscription.create(validProps);
      const newStart = new Date('2026-02-01');
      const newEnd = new Date('2026-03-01');
      const updated = sub.updatePeriod(newStart, newEnd);
      expect(updated.currentPeriodStart).toEqual(newStart);
      expect(updated.currentPeriodEnd).toEqual(newEnd);
      expect(sub.currentPeriodStart).toEqual(new Date('2026-01-01')); // immutable
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(sub.updatedAt.getTime());
    });

    it('should throw if end is before or equal to start', () => {
      const sub = Subscription.create(validProps);
      expect(() =>
        sub.updatePeriod(new Date('2026-03-01'), new Date('2026-02-01'))
      ).toThrow('Current period end must be after current period start');
    });
  });

  describe('markCanceled()', () => {
    it('should set status to CANCELED and canceledAt', () => {
      const sub = Subscription.create(validProps);
      const cancelDate = new Date('2026-01-15');
      const canceled = sub.markCanceled(cancelDate);
      expect(canceled.status).toBe(SubscriptionStatus.CANCELED);
      expect(canceled.canceledAt).toEqual(cancelDate);
      expect(sub.status).toBe(SubscriptionStatus.ACTIVE); // immutable
      expect(sub.canceledAt).toBeNull(); // immutable
      expect(canceled.updatedAt.getTime()).toBeGreaterThanOrEqual(sub.updatedAt.getTime());
    });
  });

  describe('setCancelAtPeriodEnd()', () => {
    it('should update cancelAtPeriodEnd', () => {
      const sub = Subscription.create(validProps);
      expect(sub.cancelAtPeriodEnd).toBe(false);
      const updated = sub.setCancelAtPeriodEnd(true);
      expect(updated.cancelAtPeriodEnd).toBe(true);
      expect(sub.cancelAtPeriodEnd).toBe(false); // immutable
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(sub.updatedAt.getTime());
    });
  });

  describe('changePlan()', () => {
    it('should update plan and stripePriceId', () => {
      const sub = Subscription.create(validProps);
      const updated = sub.changePlan(Plan.ENTERPRISE, 'price_new456');
      expect(updated.plan).toBe(Plan.ENTERPRISE);
      expect(updated.stripePriceId).toBe('price_new456');
      expect(sub.plan).toBe(Plan.PRO); // immutable
      expect(sub.stripePriceId).toBe('price_xyz789'); // immutable
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(sub.updatedAt.getTime());
    });

    it('should throw if newPriceId is empty', () => {
      const sub = Subscription.create(validProps);
      expect(() => sub.changePlan(Plan.ENTERPRISE, '')).toThrow(
        'Stripe price ID is required'
      );
    });

    it('should throw if newPriceId is whitespace only', () => {
      const sub = Subscription.create(validProps);
      expect(() => sub.changePlan(Plan.ENTERPRISE, '   ')).toThrow(
        'Stripe price ID is required'
      );
    });
  });

  describe('toObject()', () => {
    it('should return copy of props', () => {
      const sub = Subscription.create(validProps, 'test-id');
      const obj = sub.toObject();
      expect(obj.id).toBe('test-id');
      expect(obj.organizationId).toBe('org-123');
      expect(obj.stripeSubscriptionId).toBe('sub_abc123');
      expect(obj.stripePriceId).toBe('price_xyz789');
      expect(obj.plan).toBe(Plan.PRO);
      expect(obj.status).toBe(SubscriptionStatus.ACTIVE);
      expect(obj.currentPeriodStart).toEqual(new Date('2026-01-01'));
      expect(obj.currentPeriodEnd).toEqual(new Date('2026-02-01'));
      expect(obj.cancelAtPeriodEnd).toBe(false);
      expect(obj.canceledAt).toBeNull();
      expect(obj.createdAt).toBeInstanceOf(Date);
      expect(obj.updatedAt).toBeInstanceOf(Date);
    });
  });
});
