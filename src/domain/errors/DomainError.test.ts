import { describe, it, expect } from 'vitest';
import {
  DomainError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ExternalServiceError,
  PlanLimitError,
} from './index';

describe('DomainError hierarchy', () => {
  describe('instanceof checks', () => {
    it('all error types are instances of DomainError and Error', () => {
      const errors = [
        new ValidationError('invalid'),
        new NotFoundError('User', '123'),
        new UnauthorizedError(),
        new ForbiddenError(),
        new ConflictError('duplicate'),
        new ExternalServiceError('MetaAPI', 'timeout'),
        new PlanLimitError('limit exceeded', 'ad_accounts'),
      ];

      for (const error of errors) {
        expect(error).toBeInstanceOf(DomainError);
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('ValidationError', () => {
    it('has correct errorCode and statusHint', () => {
      const error = new ValidationError('Email is invalid');
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.statusHint).toBe(400);
      expect(error.message).toBe('Email is invalid');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NotFoundError', () => {
    it('constructs message from entityName and entityId', () => {
      const error = new NotFoundError('User', 'abc-123');
      expect(error.errorCode).toBe('NOT_FOUND');
      expect(error.statusHint).toBe(404);
      expect(error.message).toBe('User not found: abc-123');
      expect(error.entityName).toBe('User');
      expect(error.entityId).toBe('abc-123');
      expect(error.name).toBe('NotFoundError');
    });

    it('constructs message from entityName alone when no entityId', () => {
      const error = new NotFoundError('Campaign');
      expect(error.message).toBe('Campaign not found');
      expect(error.entityName).toBe('Campaign');
      expect(error.entityId).toBeUndefined();
    });
  });

  describe('UnauthorizedError', () => {
    it('has correct errorCode, statusHint, and default message', () => {
      const error = new UnauthorizedError();
      expect(error.errorCode).toBe('UNAUTHORIZED');
      expect(error.statusHint).toBe(401);
      expect(error.message).toBe('Unauthorized');
      expect(error.name).toBe('UnauthorizedError');
    });

    it('accepts custom message', () => {
      const error = new UnauthorizedError('Token expired');
      expect(error.message).toBe('Token expired');
    });
  });

  describe('ForbiddenError', () => {
    it('has correct errorCode, statusHint, and default message', () => {
      const error = new ForbiddenError();
      expect(error.errorCode).toBe('FORBIDDEN');
      expect(error.statusHint).toBe(403);
      expect(error.message).toBe('Forbidden');
      expect(error.name).toBe('ForbiddenError');
    });

    it('accepts custom message', () => {
      const error = new ForbiddenError('Insufficient permissions');
      expect(error.message).toBe('Insufficient permissions');
    });
  });

  describe('ConflictError', () => {
    it('has correct errorCode and statusHint', () => {
      const error = new ConflictError('Email already exists', 'User');
      expect(error.errorCode).toBe('CONFLICT');
      expect(error.statusHint).toBe(409);
      expect(error.message).toBe('Email already exists');
      expect(error.entityName).toBe('User');
      expect(error.name).toBe('ConflictError');
    });

    it('entityName is optional', () => {
      const error = new ConflictError('Duplicate entry');
      expect(error.entityName).toBeUndefined();
    });
  });

  describe('ExternalServiceError', () => {
    it('constructs message from serviceName and message', () => {
      const error = new ExternalServiceError('MetaAPI', 'Rate limit exceeded');
      expect(error.errorCode).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.statusHint).toBe(502);
      expect(error.message).toBe('MetaAPI: Rate limit exceeded');
      expect(error.serviceName).toBe('MetaAPI');
      expect(error.name).toBe('ExternalServiceError');
    });

    it('stores originalError when provided', () => {
      const original = new Error('network failure');
      const error = new ExternalServiceError('Stripe', 'Connection failed', original);
      expect(error.originalError).toBe(original);
    });

    it('originalError is undefined when not provided', () => {
      const error = new ExternalServiceError('GoogleAds', 'Timeout');
      expect(error.originalError).toBeUndefined();
    });
  });

  describe('PlanLimitError', () => {
    it('has correct errorCode, statusHint, and stores limitType', () => {
      const error = new PlanLimitError('Maximum 3 ad accounts on free plan', 'ad_accounts');
      expect(error.errorCode).toBe('PLAN_LIMIT_EXCEEDED');
      expect(error.statusHint).toBe(403);
      expect(error.message).toBe('Maximum 3 ad accounts on free plan');
      expect(error.limitType).toBe('ad_accounts');
      expect(error.name).toBe('PlanLimitError');
    });
  });

  describe('Object.setPrototypeOf correctness', () => {
    it('allows proper instanceof checks through the prototype chain', () => {
      const error = new ValidationError('test');

      // Direct instanceof
      expect(error instanceof ValidationError).toBe(true);
      // Parent instanceof
      expect(error instanceof DomainError).toBe(true);
      // Root instanceof
      expect(error instanceof Error).toBe(true);

      // Negative check
      expect(error instanceof NotFoundError).toBe(false);
      expect(error instanceof ConflictError).toBe(false);
    });
  });
});
