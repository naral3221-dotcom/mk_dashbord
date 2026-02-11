import { DomainError } from './DomainError';

export class ValidationError extends DomainError {
  readonly errorCode = 'VALIDATION_ERROR';
  readonly statusHint = 400;

  constructor(message: string) {
    super(message);
  }
}
