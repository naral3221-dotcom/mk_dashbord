import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requireEnv, validateRequiredEnvVars, EnvValidationError } from './env';

describe('env utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('requireEnv', () => {
    it('should return value when env var exists', () => {
      process.env.TEST_VAR = 'test-value';
      expect(requireEnv('TEST_VAR')).toBe('test-value');
    });

    it('should throw EnvValidationError when env var is missing', () => {
      delete process.env.TEST_VAR;
      expect(() => requireEnv('TEST_VAR')).toThrow(EnvValidationError);
      expect(() => requireEnv('TEST_VAR')).toThrow('Missing required environment variables: TEST_VAR');
    });

    it('should throw EnvValidationError when env var is empty string', () => {
      process.env.TEST_VAR = '';
      expect(() => requireEnv('TEST_VAR')).toThrow(EnvValidationError);
    });
  });

  describe('validateRequiredEnvVars', () => {
    it('should not throw when all vars exist', () => {
      process.env.VAR_A = 'a';
      process.env.VAR_B = 'b';
      expect(() => validateRequiredEnvVars(['VAR_A', 'VAR_B'])).not.toThrow();
    });

    it('should throw with list of missing vars', () => {
      process.env.VAR_A = 'a';
      delete process.env.VAR_B;
      delete process.env.VAR_C;

      try {
        validateRequiredEnvVars(['VAR_A', 'VAR_B', 'VAR_C']);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnvValidationError);
        expect((error as EnvValidationError).missingVars).toEqual(['VAR_B', 'VAR_C']);
      }
    });

    it('should not throw for empty list', () => {
      expect(() => validateRequiredEnvVars([])).not.toThrow();
    });
  });

  describe('EnvValidationError', () => {
    it('should have correct name and missingVars', () => {
      const error = new EnvValidationError(['DB_URL', 'API_KEY']);
      expect(error.name).toBe('EnvValidationError');
      expect(error.missingVars).toEqual(['DB_URL', 'API_KEY']);
      expect(error.message).toContain('DB_URL');
      expect(error.message).toContain('API_KEY');
    });
  });
});
