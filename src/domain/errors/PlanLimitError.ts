import { DomainError } from './DomainError';

export class PlanLimitError extends DomainError {
  readonly errorCode = 'PLAN_LIMIT_EXCEEDED';
  readonly statusHint = 403;

  constructor(
    message: string,
    public readonly limitType: string
  ) {
    super(message);
  }
}
