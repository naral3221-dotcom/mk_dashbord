import { describe, it, expect, vi } from 'vitest';
import { handleApiError } from './apiErrorHandler';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ExternalServiceError,
  PlanLimitError,
} from '@/domain/errors';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/infrastructure/logging', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  }),
}));

describe('handleApiError', () => {
  it('should handle ValidationError with 400 status', () => {
    const error = new ValidationError('Invalid email format');
    const result = handleApiError(error);

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('Invalid email format');
    expect(result.body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('should handle NotFoundError with 404 status', () => {
    const error = new NotFoundError('User', 'user-123');
    const result = handleApiError(error);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('User not found: user-123');
    expect(result.body.errorCode).toBe('NOT_FOUND');
  });

  it('should handle NotFoundError without entityId', () => {
    const error = new NotFoundError('Organization');
    const result = handleApiError(error);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Organization not found');
    expect(result.body.errorCode).toBe('NOT_FOUND');
  });

  it('should handle UnauthorizedError with 401 status', () => {
    const error = new UnauthorizedError();
    const result = handleApiError(error);

    expect(result.status).toBe(401);
    expect(result.body.error).toBe('Unauthorized');
    expect(result.body.errorCode).toBe('UNAUTHORIZED');
  });

  it('should handle ForbiddenError with 403 status', () => {
    const error = new ForbiddenError('Insufficient permissions');
    const result = handleApiError(error);

    expect(result.status).toBe(403);
    expect(result.body.error).toBe('Insufficient permissions');
    expect(result.body.errorCode).toBe('FORBIDDEN');
  });

  it('should handle ConflictError with 409 status', () => {
    const error = new ConflictError('Email already registered', 'User');
    const result = handleApiError(error);

    expect(result.status).toBe(409);
    expect(result.body.error).toBe('Email already registered');
    expect(result.body.errorCode).toBe('CONFLICT');
  });

  it('should handle ExternalServiceError with 502 status', () => {
    const originalError = new Error('timeout');
    const error = new ExternalServiceError('META', 'API request failed', originalError);
    const result = handleApiError(error);

    expect(result.status).toBe(502);
    expect(result.body.error).toBe('META: API request failed');
    expect(result.body.errorCode).toBe('EXTERNAL_SERVICE_ERROR');
  });

  it('should handle PlanLimitError with 403 status', () => {
    const error = new PlanLimitError('Ad account limit reached', 'adAccounts');
    const result = handleApiError(error);

    expect(result.status).toBe(403);
    expect(result.body.error).toBe('Ad account limit reached');
    expect(result.body.errorCode).toBe('PLAN_LIMIT_EXCEEDED');
  });

  it('should handle unknown errors with 500 status', () => {
    const error = new Error('something unexpected');
    const result = handleApiError(error);

    expect(result.status).toBe(500);
    expect(result.body.error).toBe('Internal server error');
    expect(result.body.errorCode).toBe('INTERNAL_ERROR');
  });

  it('should handle non-Error objects with 500 status', () => {
    const result = handleApiError('string error');

    expect(result.status).toBe(500);
    expect(result.body.error).toBe('Internal server error');
    expect(result.body.errorCode).toBe('INTERNAL_ERROR');
  });

  it('should handle null/undefined with 500 status', () => {
    const result = handleApiError(null);

    expect(result.status).toBe(500);
    expect(result.body.error).toBe('Internal server error');
    expect(result.body.errorCode).toBe('INTERNAL_ERROR');
  });
});
