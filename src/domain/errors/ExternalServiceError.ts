import { DomainError } from './DomainError';

export class ExternalServiceError extends DomainError {
  readonly errorCode = 'EXTERNAL_SERVICE_ERROR';
  readonly statusHint = 502;

  constructor(
    public readonly serviceName: string,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(`${serviceName}: ${message}`);
  }
}
