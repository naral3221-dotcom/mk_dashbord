import { describe, it, expect } from 'vitest';
import { AdAccount } from './AdAccount';
import { Platform } from './types';
import { ValidationError } from '../errors';

describe('AdAccount Entity', () => {
  const validProps = {
    platform: Platform.META,
    accountId: 'act_123456',
    accountName: 'My Ad Account',
    organizationId: 'org-123',
  };

  describe('create()', () => {
    it('should create ad account with valid props', () => {
      const account = AdAccount.create(validProps);
      expect(account.platform).toBe(Platform.META);
      expect(account.accountId).toBe('act_123456');
      expect(account.accountName).toBe('My Ad Account');
      expect(account.isActive).toBe(true);
      expect(account.accessToken).toBeNull();
      expect(account.refreshToken).toBeNull();
      expect(account.tokenExpiresAt).toBeNull();
      expect(account.organizationId).toBe('org-123');
      expect(account.id).toBeDefined();
    });

    it('should create with custom id', () => {
      const account = AdAccount.create(validProps, 'custom-id');
      expect(account.id).toBe('custom-id');
    });

    it('should create with tokens', () => {
      const expiresAt = new Date('2026-12-31');
      const account = AdAccount.create({
        ...validProps,
        accessToken: 'token123',
        refreshToken: 'refresh123',
        tokenExpiresAt: expiresAt,
      });
      expect(account.accessToken).toBe('token123');
      expect(account.refreshToken).toBe('refresh123');
      expect(account.tokenExpiresAt).toEqual(expiresAt);
    });

    it('should trim accountId', () => {
      const account = AdAccount.create({ ...validProps, accountId: '  act_123  ' });
      expect(account.accountId).toBe('act_123');
    });

    it('should trim accountName', () => {
      const account = AdAccount.create({ ...validProps, accountName: '  Name  ' });
      expect(account.accountName).toBe('Name');
    });

    it('should throw on empty accountId', () => {
      expect(() =>
        AdAccount.create({ ...validProps, accountId: '' })
      ).toThrow('Account ID is required');
    });

    it('should throw ValidationError instance on validation failure', () => {
      expect(() => AdAccount.create({ ...validProps, accountId: '' })).toThrow(ValidationError);
    });

    it('should throw on whitespace-only accountId', () => {
      expect(() =>
        AdAccount.create({ ...validProps, accountId: '   ' })
      ).toThrow('Account ID is required');
    });

    it('should throw on empty accountName', () => {
      expect(() =>
        AdAccount.create({ ...validProps, accountName: '' })
      ).toThrow('Account name is required');
    });

    it('should throw on missing organizationId', () => {
      expect(() =>
        AdAccount.create({ ...validProps, organizationId: '' })
      ).toThrow('Organization ID is required');
    });
  });

  describe('reconstruct()', () => {
    it('should reconstruct from props without validation', () => {
      const now = new Date();
      const account = AdAccount.reconstruct({
        id: 'acc-1',
        platform: Platform.GOOGLE,
        accountId: 'gads_123',
        accountName: 'Google Account',
        accessToken: 'token',
        refreshToken: 'refresh',
        tokenExpiresAt: now,
        isActive: false,
        organizationId: 'org-1',
        createdAt: now,
        updatedAt: now,
      });
      expect(account.id).toBe('acc-1');
      expect(account.platform).toBe(Platform.GOOGLE);
      expect(account.isActive).toBe(false);
    });
  });

  describe('updateTokens()', () => {
    it('should update tokens', () => {
      const account = AdAccount.create(validProps);
      const expiresAt = new Date('2026-12-31');
      const updated = account.updateTokens('new-token', 'new-refresh', expiresAt);
      expect(updated.accessToken).toBe('new-token');
      expect(updated.refreshToken).toBe('new-refresh');
      expect(updated.tokenExpiresAt).toEqual(expiresAt);
    });

    it('should allow null refreshToken', () => {
      const account = AdAccount.create(validProps);
      const expiresAt = new Date('2026-12-31');
      const updated = account.updateTokens('new-token', null, expiresAt);
      expect(updated.refreshToken).toBeNull();
    });

    it('should throw on empty accessToken', () => {
      const account = AdAccount.create(validProps);
      expect(() =>
        account.updateTokens('', null, new Date())
      ).toThrow('Access token is required');
    });

    it('should not mutate original', () => {
      const account = AdAccount.create(validProps);
      const updated = account.updateTokens('new', null, new Date());
      expect(account.accessToken).toBeNull();
      expect(updated.accessToken).toBe('new');
    });
  });

  describe('isTokenExpired()', () => {
    it('should return true when no token expiry set', () => {
      const account = AdAccount.create(validProps);
      expect(account.isTokenExpired()).toBe(true);
    });

    it('should return true when token is expired', () => {
      const pastDate = new Date('2020-01-01');
      const account = AdAccount.create({
        ...validProps,
        accessToken: 'token',
        tokenExpiresAt: pastDate,
      });
      expect(account.isTokenExpired()).toBe(true);
    });

    it('should return false when token is not expired', () => {
      const futureDate = new Date('2030-01-01');
      const account = AdAccount.create({
        ...validProps,
        accessToken: 'token',
        tokenExpiresAt: futureDate,
      });
      expect(account.isTokenExpired()).toBe(false);
    });
  });

  describe('deactivate()', () => {
    it('should deactivate account', () => {
      const account = AdAccount.create(validProps);
      const deactivated = account.deactivate();
      expect(deactivated.isActive).toBe(false);
      expect(account.isActive).toBe(true); // immutable
    });
  });

  describe('activate()', () => {
    it('should activate account', () => {
      const account = AdAccount.create(validProps);
      const deactivated = account.deactivate();
      const activated = deactivated.activate();
      expect(activated.isActive).toBe(true);
    });
  });

  describe('updateAccountName()', () => {
    it('should update account name', () => {
      const account = AdAccount.create(validProps);
      const updated = account.updateAccountName('New Name');
      expect(updated.accountName).toBe('New Name');
      expect(account.accountName).toBe('My Ad Account');
    });

    it('should trim name', () => {
      const account = AdAccount.create(validProps);
      const updated = account.updateAccountName('  Trimmed  ');
      expect(updated.accountName).toBe('Trimmed');
    });

    it('should throw on empty name', () => {
      const account = AdAccount.create(validProps);
      expect(() => account.updateAccountName('')).toThrow(
        'Account name is required'
      );
    });
  });

  describe('toObject()', () => {
    it('should return plain object', () => {
      const account = AdAccount.create(validProps, 'acc-id');
      const obj = account.toObject();
      expect(obj.id).toBe('acc-id');
      expect(obj.platform).toBe(Platform.META);
      expect(obj.accountId).toBe('act_123456');
      expect(obj.isActive).toBe(true);
    });
  });
});
