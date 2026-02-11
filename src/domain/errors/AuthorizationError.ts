import { DomainError } from './DomainError';

export class UnauthorizedError extends DomainError {
  readonly errorCode = 'UNAUTHORIZED';
  readonly statusHint = 401;

  constructor(message: string = 'Unauthorized') {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  readonly errorCode = 'FORBIDDEN';
  readonly statusHint = 403;

  constructor(message: string = 'Forbidden') {
    super(message);
  }
}
