import { describe, it, expect } from 'vitest';
import { User } from './User';
import { Role } from './types';
import { ValidationError } from '../errors';

describe('User Entity', () => {
  const validProps = {
    email: 'test@example.com',
    name: 'Test User',
  };

  describe('create()', () => {
    it('should create user with valid props', () => {
      const user = User.create(validProps);
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe(Role.MEMBER);
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should create with custom id', () => {
      const user = User.create(validProps, 'custom-id');
      expect(user.id).toBe('custom-id');
    });

    it('should default role to MEMBER', () => {
      const user = User.create(validProps);
      expect(user.role).toBe(Role.MEMBER);
    });

    it('should accept specified role', () => {
      const user = User.create({ ...validProps, role: Role.ADMIN });
      expect(user.role).toBe(Role.ADMIN);
    });

    it('should lowercase email', () => {
      const user = User.create({ ...validProps, email: 'Test@EXAMPLE.com' });
      expect(user.email).toBe('test@example.com');
    });

    it('should trim email', () => {
      const user = User.create({ ...validProps, email: '  test@example.com  ' });
      expect(user.email).toBe('test@example.com');
    });

    it('should trim name', () => {
      const user = User.create({ ...validProps, name: '  Test  ' });
      expect(user.name).toBe('Test');
    });

    it('should allow null name', () => {
      const user = User.create({ ...validProps, name: null });
      expect(user.name).toBeNull();
    });

    it('should allow undefined name (defaults to null)', () => {
      const user = User.create({ email: 'test@example.com' });
      expect(user.name).toBeNull();
    });

    it('should throw on invalid email', () => {
      expect(() => User.create({ ...validProps, email: 'invalid' })).toThrow(
        'Invalid email format'
      );
    });

    it('should throw ValidationError instance on validation failure', () => {
      expect(() => User.create({ ...validProps, email: 'invalid' })).toThrow(ValidationError);
    });

    it('should throw on empty email', () => {
      expect(() => User.create({ ...validProps, email: '' })).toThrow(
        'Invalid email format'
      );
    });

    it('should throw on name exceeding 100 chars', () => {
      expect(() =>
        User.create({ ...validProps, name: 'a'.repeat(101) })
      ).toThrow('Name must be less than 100 characters');
    });

    it('should default authProvider to credentials', () => {
      const user = User.create(validProps);
      expect(user.authProvider).toBe('credentials');
    });

    it('should accept specified authProvider', () => {
      const user = User.create({ ...validProps, authProvider: 'google' });
      expect(user.authProvider).toBe('google');
    });

    it('should default organizationId to null', () => {
      const user = User.create(validProps);
      expect(user.organizationId).toBeNull();
    });

    it('should accept organizationId', () => {
      const user = User.create({ ...validProps, organizationId: 'org-123' });
      expect(user.organizationId).toBe('org-123');
    });

    it('should default passwordHash to null', () => {
      const user = User.create(validProps);
      expect(user.passwordHash).toBeNull();
    });

    it('should default emailVerified to null', () => {
      const user = User.create(validProps);
      expect(user.emailVerified).toBeNull();
    });
  });

  describe('reconstruct()', () => {
    it('should reconstruct from props without validation', () => {
      const now = new Date();
      const user = User.reconstruct({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        role: Role.ADMIN,
        organizationId: 'org-1',
        passwordHash: 'hashed_password',
        authProvider: 'google',
        emailVerified: now,
        image: 'https://example.com/avatar.png',
        createdAt: now,
        updatedAt: now,
      });
      expect(user.id).toBe('user-1');
      expect(user.role).toBe(Role.ADMIN);
      expect(user.passwordHash).toBe('hashed_password');
      expect(user.authProvider).toBe('google');
      expect(user.emailVerified).toBe(now);
      expect(user.image).toBe('https://example.com/avatar.png');
    });
  });

  describe('updateName()', () => {
    it('should return new instance with updated name', () => {
      const user = User.create(validProps);
      const updated = user.updateName('New Name');
      expect(updated.name).toBe('New Name');
      expect(user.name).toBe('Test User'); // immutable
    });

    it('should set name to null', () => {
      const user = User.create(validProps);
      const updated = user.updateName(null);
      expect(updated.name).toBeNull();
    });

    it('should trim updated name', () => {
      const user = User.create(validProps);
      const updated = user.updateName('  Trimmed  ');
      expect(updated.name).toBe('Trimmed');
    });

    it('should throw on name exceeding 100 chars', () => {
      const user = User.create(validProps);
      expect(() => user.updateName('a'.repeat(101))).toThrow(
        'Name must be less than 100 characters'
      );
    });
  });

  describe('changeRole()', () => {
    it('should change role', () => {
      const user = User.create(validProps);
      const updated = user.changeRole(Role.ADMIN);
      expect(updated.role).toBe(Role.ADMIN);
    });

    it('should return same instance if same role', () => {
      const user = User.create(validProps);
      const same = user.changeRole(Role.MEMBER);
      expect(same).toBe(user);
    });

    it('should not mutate original', () => {
      const user = User.create(validProps);
      const updated = user.changeRole(Role.OWNER);
      expect(user.role).toBe(Role.MEMBER);
      expect(updated.role).toBe(Role.OWNER);
    });
  });

  describe('verifyEmail()', () => {
    it('should set emailVerified to current date', () => {
      const user = User.create(validProps);
      const before = new Date();
      const verified = user.verifyEmail();
      const after = new Date();
      expect(verified.emailVerified).toBeInstanceOf(Date);
      expect(verified.emailVerified!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(verified.emailVerified!.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(user.emailVerified).toBeNull(); // immutable
    });
  });

  describe('updateProfile()', () => {
    it('should update name and image', () => {
      const user = User.create(validProps);
      const updated = user.updateProfile({ name: 'New Name', image: 'https://example.com/new.png' });
      expect(updated.name).toBe('New Name');
      expect(updated.image).toBe('https://example.com/new.png');
      expect(user.name).toBe('Test User'); // immutable
      expect(user.image).toBeNull(); // immutable
    });

    it('should update only name', () => {
      const user = User.create({ ...validProps, image: 'https://example.com/old.png' });
      const updated = user.updateProfile({ name: 'New Name' });
      expect(updated.name).toBe('New Name');
      expect(updated.image).toBe('https://example.com/old.png');
    });

    it('should update only image', () => {
      const user = User.create(validProps);
      const updated = user.updateProfile({ image: 'https://example.com/new.png' });
      expect(updated.name).toBe('Test User');
      expect(updated.image).toBe('https://example.com/new.png');
    });

    it('should throw on name exceeding 100 chars', () => {
      const user = User.create(validProps);
      expect(() => user.updateProfile({ name: 'a'.repeat(101) })).toThrow(
        'Name must be less than 100 characters'
      );
    });
  });

  describe('joinOrganization()', () => {
    it('should set organizationId', () => {
      const user = User.create(validProps);
      expect(user.organizationId).toBeNull();
      const joined = user.joinOrganization('org-456');
      expect(joined.organizationId).toBe('org-456');
      expect(user.organizationId).toBeNull(); // immutable
    });
  });

  describe('toObject()', () => {
    it('should return plain object', () => {
      const user = User.create({ ...validProps, organizationId: 'org-123' }, 'user-id');
      const obj = user.toObject();
      expect(obj.id).toBe('user-id');
      expect(obj.email).toBe('test@example.com');
      expect(obj.name).toBe('Test User');
      expect(obj.role).toBe(Role.MEMBER);
      expect(obj.organizationId).toBe('org-123');
    });
  });
});
