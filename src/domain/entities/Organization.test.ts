import { describe, it, expect } from 'vitest';
import { Organization } from './Organization';
import { Plan } from './types';

describe('Organization Entity', () => {
  const validProps = {
    name: 'Test Organization',
    slug: 'test-org',
  };

  describe('create()', () => {
    it('should create organization with valid props', () => {
      const org = Organization.create(validProps);
      expect(org.name).toBe('Test Organization');
      expect(org.slug).toBe('test-org');
      expect(org.plan).toBe(Plan.FREE);
      expect(org.stripeCustomerId).toBeNull();
      expect(org.id).toBeDefined();
      expect(org.createdAt).toBeInstanceOf(Date);
      expect(org.updatedAt).toBeInstanceOf(Date);
    });

    it('should create with custom id', () => {
      const org = Organization.create(validProps, 'custom-id');
      expect(org.id).toBe('custom-id');
    });

    it('should create with specified plan', () => {
      const org = Organization.create({ ...validProps, plan: Plan.PRO });
      expect(org.plan).toBe(Plan.PRO);
    });

    it('should default plan to FREE', () => {
      const org = Organization.create(validProps);
      expect(org.plan).toBe(Plan.FREE);
    });

    it('should trim name', () => {
      const org = Organization.create({ ...validProps, name: '  Trimmed  ' });
      expect(org.name).toBe('Trimmed');
    });

    it('should lowercase slug', () => {
      const org = Organization.create({ ...validProps, slug: 'Test-Org' });
      expect(org.slug).toBe('test-org');
    });

    it('should throw on empty name', () => {
      expect(() => Organization.create({ ...validProps, name: '' })).toThrow(
        'Organization name is required'
      );
    });

    it('should throw on whitespace-only name', () => {
      expect(() => Organization.create({ ...validProps, name: '   ' })).toThrow(
        'Organization name is required'
      );
    });

    it('should throw on name exceeding 100 chars', () => {
      const longName = 'a'.repeat(101);
      expect(() => Organization.create({ ...validProps, name: longName })).toThrow(
        'Organization name must be less than 100 characters'
      );
    });

    it('should throw on empty slug', () => {
      expect(() => Organization.create({ ...validProps, slug: '' })).toThrow(
        'Invalid organization slug format'
      );
    });

    it('should throw on invalid slug format (spaces)', () => {
      expect(() =>
        Organization.create({ ...validProps, slug: 'test org' })
      ).toThrow('Invalid organization slug format');
    });

    it('should throw on slug with uppercase (after lowercasing, still must match)', () => {
      // "TEST_ORG" lowercased = "test_org" - underscores not allowed
      expect(() =>
        Organization.create({ ...validProps, slug: 'test_org' })
      ).toThrow('Invalid organization slug format');
    });

    it('should throw on slug too short (less than 3 chars)', () => {
      expect(() => Organization.create({ ...validProps, slug: 'ab' })).toThrow(
        'Invalid organization slug format'
      );
    });

    it('should throw on slug too long (more than 50 chars)', () => {
      const longSlug = 'a'.repeat(51);
      expect(() =>
        Organization.create({ ...validProps, slug: longSlug })
      ).toThrow('Invalid organization slug format');
    });

    it('should accept valid slug with hyphens', () => {
      const org = Organization.create({
        ...validProps,
        slug: 'my-test-org',
      });
      expect(org.slug).toBe('my-test-org');
    });

    it('should reject slug starting with hyphen', () => {
      expect(() =>
        Organization.create({ ...validProps, slug: '-test-org' })
      ).toThrow('Invalid organization slug format');
    });

    it('should reject slug ending with hyphen', () => {
      expect(() =>
        Organization.create({ ...validProps, slug: 'test-org-' })
      ).toThrow('Invalid organization slug format');
    });
  });

  describe('reconstruct()', () => {
    it('should reconstruct from props without validation', () => {
      const now = new Date();
      const org = Organization.reconstruct({
        id: 'test-id',
        name: 'Test',
        slug: 'test',
        plan: Plan.PRO,
        stripeCustomerId: 'cus_123',
        createdAt: now,
        updatedAt: now,
      });
      expect(org.id).toBe('test-id');
      expect(org.name).toBe('Test');
      expect(org.plan).toBe(Plan.PRO);
      expect(org.stripeCustomerId).toBe('cus_123');
    });
  });

  describe('updateName()', () => {
    it('should return new instance with updated name', () => {
      const org = Organization.create(validProps);
      const updated = org.updateName('New Name');
      expect(updated.name).toBe('New Name');
      expect(org.name).toBe('Test Organization'); // immutable
      expect(updated.id).toBe(org.id);
    });

    it('should trim updated name', () => {
      const org = Organization.create(validProps);
      const updated = org.updateName('  Trimmed  ');
      expect(updated.name).toBe('Trimmed');
    });

    it('should throw on empty name', () => {
      const org = Organization.create(validProps);
      expect(() => org.updateName('')).toThrow('Organization name is required');
    });

    it('should throw on name exceeding 100 chars', () => {
      const org = Organization.create(validProps);
      expect(() => org.updateName('a'.repeat(101))).toThrow(
        'Organization name must be less than 100 characters'
      );
    });

    it('should update updatedAt timestamp', () => {
      const org = Organization.create(validProps);
      const before = org.updatedAt;
      const updated = org.updateName('New Name');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('upgradePlan()', () => {
    it('should upgrade from FREE to STARTER', () => {
      const org = Organization.create(validProps);
      const upgraded = org.upgradePlan(Plan.STARTER);
      expect(upgraded.plan).toBe(Plan.STARTER);
    });

    it('should upgrade from FREE to PRO', () => {
      const org = Organization.create(validProps);
      const upgraded = org.upgradePlan(Plan.PRO);
      expect(upgraded.plan).toBe(Plan.PRO);
    });

    it('should upgrade from FREE to ENTERPRISE', () => {
      const org = Organization.create(validProps);
      const upgraded = org.upgradePlan(Plan.ENTERPRISE);
      expect(upgraded.plan).toBe(Plan.ENTERPRISE);
    });

    it('should throw when downgrading', () => {
      const org = Organization.create({ ...validProps, plan: Plan.PRO });
      expect(() => org.upgradePlan(Plan.STARTER)).toThrow(
        'Cannot upgrade from PRO to STARTER'
      );
    });

    it('should throw when upgrading to same plan', () => {
      const org = Organization.create(validProps);
      expect(() => org.upgradePlan(Plan.FREE)).toThrow(
        'Cannot upgrade from FREE to FREE'
      );
    });

    it('should not mutate original instance', () => {
      const org = Organization.create(validProps);
      const upgraded = org.upgradePlan(Plan.PRO);
      expect(org.plan).toBe(Plan.FREE);
      expect(upgraded.plan).toBe(Plan.PRO);
    });
  });

  describe('changePlan()', () => {
    it('should change plan to any direction', () => {
      const org = Organization.reconstruct({
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org',
        plan: Plan.PRO,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const downgraded = org.changePlan(Plan.FREE);
      expect(downgraded.plan).toBe(Plan.FREE);

      const upgraded = org.changePlan(Plan.ENTERPRISE);
      expect(upgraded.plan).toBe(Plan.ENTERPRISE);
    });

    it('should change plan to same plan', () => {
      const org = Organization.reconstruct({
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org',
        plan: Plan.PRO,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const same = org.changePlan(Plan.PRO);
      expect(same.plan).toBe(Plan.PRO);
    });
  });

  describe('setStripeCustomerId()', () => {
    it('should set stripe customer id', () => {
      const org = Organization.create(validProps);
      const updated = org.setStripeCustomerId('cus_12345');
      expect(updated.stripeCustomerId).toBe('cus_12345');
    });

    it('should throw on empty customer id', () => {
      const org = Organization.create(validProps);
      expect(() => org.setStripeCustomerId('')).toThrow(
        'Stripe customer ID is required'
      );
    });

    it('should trim customer id', () => {
      const org = Organization.create(validProps);
      const updated = org.setStripeCustomerId('  cus_12345  ');
      expect(updated.stripeCustomerId).toBe('cus_12345');
    });
  });

  describe('toObject()', () => {
    it('should return plain object with all props', () => {
      const org = Organization.create(validProps, 'test-id');
      const obj = org.toObject();
      expect(obj.id).toBe('test-id');
      expect(obj.name).toBe('Test Organization');
      expect(obj.slug).toBe('test-org');
      expect(obj.plan).toBe(Plan.FREE);
      expect(obj.stripeCustomerId).toBeNull();
      expect(obj.createdAt).toBeInstanceOf(Date);
      expect(obj.updatedAt).toBeInstanceOf(Date);
    });
  });
});
