export class EnvValidationError extends Error {
  constructor(
    public readonly missingVars: string[],
  ) {
    super(`Missing required environment variables: ${missingVars.join(', ')}`);
    this.name = 'EnvValidationError';
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new EnvValidationError([name]);
  }
  return value;
}

export function validateRequiredEnvVars(names: string[]): void {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new EnvValidationError(missing);
  }
}

const SERVER_REQUIRED_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
];

export function validateServerEnv(): void {
  validateRequiredEnvVars(SERVER_REQUIRED_VARS);
}
