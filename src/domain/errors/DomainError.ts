export abstract class DomainError extends Error {
  abstract readonly errorCode: string;
  abstract readonly statusHint: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
