import { DomainError } from './DomainError';

export class NotFoundError extends DomainError {
  readonly errorCode = 'NOT_FOUND';
  readonly statusHint = 404;

  constructor(
    public readonly entityName: string,
    public readonly entityId?: string
  ) {
    super(entityId ? `${entityName} not found: ${entityId}` : `${entityName} not found`);
  }
}
