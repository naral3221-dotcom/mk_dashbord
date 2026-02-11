import { describe, it, expect, vi } from 'vitest';
import { Invitation } from './Invitation';
import { Role } from './types';
import { ValidationError } from '../errors';

describe('Invitation Entity', () => {
  const validProps = {
    email: 'invite@example.com',
    organizationId: 'org-123',
    invitedById: 'user-456',
    token: 'invite-token-abc',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  };

  describe('create()', () => {
    it('should create invitation with valid props', () => {
      const invitation = Invitation.create(validProps);
      expect(invitation.email).toBe('invite@example.com');
      expect(invitation.organizationId).toBe('org-123');
      expect(invitation.invitedById).toBe('user-456');
      expect(invitation.token).toBe('invite-token-abc');
      expect(invitation.id).toBeDefined();
      expect(invitation.createdAt).toBeInstanceOf(Date);
    });

    it('should create with custom id', () => {
      const invitation = Invitation.create(validProps, 'custom-id');
      expect(invitation.id).toBe('custom-id');
    });

    it('should default role to MEMBER', () => {
      const invitation = Invitation.create(validProps);
      expect(invitation.role).toBe(Role.MEMBER);
    });

    it('should default acceptedAt to null', () => {
      const invitation = Invitation.create(validProps);
      expect(invitation.acceptedAt).toBeNull();
    });

    it('should accept specified role', () => {
      const invitation = Invitation.create({ ...validProps, role: Role.ADMIN });
      expect(invitation.role).toBe(Role.ADMIN);
    });

    it('should trim and lowercase email', () => {
      const invitation = Invitation.create({
        ...validProps,
        email: '  Invite@EXAMPLE.COM  ',
      });
      expect(invitation.email).toBe('invite@example.com');
    });

    it('should throw on empty email', () => {
      expect(() => Invitation.create({ ...validProps, email: '' })).toThrow(
        'Invalid email format'
      );
    });

    it('should throw ValidationError instance on validation failure', () => {
      expect(() => Invitation.create({ ...validProps, email: '' })).toThrow(ValidationError);
    });

    it('should throw on invalid email format', () => {
      expect(() =>
        Invitation.create({ ...validProps, email: 'not-an-email' })
      ).toThrow('Invalid email format');
    });

    it('should throw on whitespace-only email', () => {
      expect(() =>
        Invitation.create({ ...validProps, email: '   ' })
      ).toThrow('Invalid email format');
    });

    it('should throw on empty organizationId', () => {
      expect(() =>
        Invitation.create({ ...validProps, organizationId: '' })
      ).toThrow('Organization ID is required');
    });

    it('should throw on empty invitedById', () => {
      expect(() =>
        Invitation.create({ ...validProps, invitedById: '' })
      ).toThrow('Inviter ID is required');
    });

    it('should throw on empty token', () => {
      expect(() => Invitation.create({ ...validProps, token: '' })).toThrow(
        'Token is required'
      );
    });

    it('should throw on whitespace-only token', () => {
      expect(() =>
        Invitation.create({ ...validProps, token: '   ' })
      ).toThrow('Token is required');
    });

    it('should throw on past expiresAt', () => {
      const pastDate = new Date(Date.now() - 1000);
      expect(() =>
        Invitation.create({ ...validProps, expiresAt: pastDate })
      ).toThrow('Expiration date must be in the future');
    });
  });

  describe('reconstruct()', () => {
    it('should reconstruct from props without validation', () => {
      const now = new Date();
      const pastDate = new Date(Date.now() - 1000); // past date - should work without validation
      const invitation = Invitation.reconstruct({
        id: 'inv-1',
        email: 'invite@example.com',
        role: Role.ADMIN,
        organizationId: 'org-1',
        invitedById: 'user-1',
        token: 'token-abc',
        expiresAt: pastDate,
        acceptedAt: null,
        createdAt: now,
      });
      expect(invitation.id).toBe('inv-1');
      expect(invitation.role).toBe(Role.ADMIN);
      expect(invitation.expiresAt).toBe(pastDate);
    });
  });

  describe('accept()', () => {
    it('should return new instance with acceptedAt set', () => {
      const invitation = Invitation.create(validProps);
      const accepted = invitation.accept();
      expect(accepted.acceptedAt).toBeInstanceOf(Date);
      expect(invitation.acceptedAt).toBeNull(); // immutable - original unchanged
    });

    it('should throw if already accepted', () => {
      const invitation = Invitation.create(validProps);
      const accepted = invitation.accept();
      expect(() => accepted.accept()).toThrow(
        'Invitation has already been accepted'
      );
    });

    it('should throw if expired', () => {
      const now = new Date();
      const pastDate = new Date(Date.now() - 1000);
      const invitation = Invitation.reconstruct({
        id: 'inv-1',
        email: 'invite@example.com',
        role: Role.MEMBER,
        organizationId: 'org-1',
        invitedById: 'user-1',
        token: 'token-abc',
        expiresAt: pastDate,
        acceptedAt: null,
        createdAt: now,
      });
      expect(() => invitation.accept()).toThrow('Invitation has expired');
    });
  });

  describe('isExpired()', () => {
    it('should return true when expiresAt is in the past', () => {
      const now = new Date();
      const pastDate = new Date(Date.now() - 1000);
      const invitation = Invitation.reconstruct({
        id: 'inv-1',
        email: 'invite@example.com',
        role: Role.MEMBER,
        organizationId: 'org-1',
        invitedById: 'user-1',
        token: 'token-abc',
        expiresAt: pastDate,
        acceptedAt: null,
        createdAt: now,
      });
      expect(invitation.isExpired()).toBe(true);
    });

    it('should return false when expiresAt is in the future', () => {
      const invitation = Invitation.create(validProps);
      expect(invitation.isExpired()).toBe(false);
    });
  });

  describe('isPending()', () => {
    it('should return true when not accepted and not expired', () => {
      const invitation = Invitation.create(validProps);
      expect(invitation.isPending()).toBe(true);
    });

    it('should return false when accepted', () => {
      const invitation = Invitation.create(validProps);
      const accepted = invitation.accept();
      expect(accepted.isPending()).toBe(false);
    });

    it('should return false when expired', () => {
      const now = new Date();
      const pastDate = new Date(Date.now() - 1000);
      const invitation = Invitation.reconstruct({
        id: 'inv-1',
        email: 'invite@example.com',
        role: Role.MEMBER,
        organizationId: 'org-1',
        invitedById: 'user-1',
        token: 'token-abc',
        expiresAt: pastDate,
        acceptedAt: null,
        createdAt: now,
      });
      expect(invitation.isPending()).toBe(false);
    });
  });

  describe('toObject()', () => {
    it('should return a copy of props', () => {
      const invitation = Invitation.create(validProps, 'inv-id');
      const obj = invitation.toObject();
      expect(obj.id).toBe('inv-id');
      expect(obj.email).toBe('invite@example.com');
      expect(obj.role).toBe(Role.MEMBER);
      expect(obj.organizationId).toBe('org-123');
      expect(obj.invitedById).toBe('user-456');
      expect(obj.token).toBe('invite-token-abc');
      expect(obj.acceptedAt).toBeNull();
      expect(obj.createdAt).toBeInstanceOf(Date);
    });
  });
});
