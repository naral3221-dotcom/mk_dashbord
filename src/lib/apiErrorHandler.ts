import * as Sentry from '@sentry/nextjs';
import { DomainError } from '@/domain/errors';
import { getLogger } from '@/infrastructure/logging';

export interface ApiErrorResponse {
  error: string;
  errorCode: string;
}

export interface ApiErrorResult {
  body: ApiErrorResponse;
  status: number;
}

export function handleApiError(error: unknown): ApiErrorResult {
  if (error instanceof DomainError) {
    return {
      body: {
        error: error.message,
        errorCode: error.errorCode,
      },
      status: error.statusHint,
    };
  }

  // Log and report unexpected errors
  const logger = getLogger();
  logger.error('Unhandled error in API route', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  Sentry.captureException(error);

  return {
    body: {
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    },
    status: 500,
  };
}
