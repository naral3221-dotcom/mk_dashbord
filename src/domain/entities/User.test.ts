import { describe, it, expect } from 'vitest';
import { User } from './User';
import { Role } from './types';

describe('User Entity', () => {
  const validProps = {
    email: 'test@example.com',
    name: 'Test User',
    organizationId: 'org-123',
  };

  describe('create()', () => {
    it('should create user with valid props', () => {
      const user = User.create(validProps);
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe(Role.MEMBER);
      expect(user.organizationId).toBe('org-123');
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
      const user = User.create({ email: 'test@example.com', organizationId: 'org-123' });
      expect(user.name).toBeNull();
    });

    it('should throw on invalid email', () => {
      expect(() => User.create({ ...validProps, email: 'invalid' })).toThrow(
        'Invalid email format'
      );
    });

    it('should throw on empty email', () => {
      expect(() => User.create({ ...validProps, email: '' })).toThrow(
        'Invalid email format'
      );
    });

    it('should throw on missing organizationId', () => {
      expect(() =>
        User.create({ ...validProps, organizationId: '' })
      ).toThrow('Organization ID is required');
    });

    it('should throw on name exceeding 100 chars', () => {
      expect(() =>
        User.create({ ...validProps, name: 'a'.repeat(101) })
      ).toThrow('Name must be less than 100 characters');
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
        createdAt: now,
        updatedAt: now,
      });
      expect(user.id).toBe('user-1');
      expect(user.role).toBe(Role.ADMIN);
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

  describe('toObject()', () => {
    it('should return plain object', () => {
      const user = User.create(validProps, 'user-id');
      const obj = user.toObject();
      expect(obj.id).toBe('user-id');
      expect(obj.email).toBe('test@example.com');
      expect(obj.name).toBe('Test User');
      expect(obj.role).toBe(Role.MEMBER);
      expect(obj.organizationId).toBe('org-123');
    });
  });
});
