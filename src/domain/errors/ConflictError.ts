import { DomainError } from './DomainError';

export class ConflictError extends DomainError {
  readonly errorCode = 'CONFLICT';
  readonly statusHint = 409;

  constructor(
    message: string,
    public readonly entityName?: string
  ) {
    super(message);
  }
}
