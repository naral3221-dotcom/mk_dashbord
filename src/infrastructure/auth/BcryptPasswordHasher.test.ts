import { describe, it, expect } from 'vitest';
import { BcryptPasswordHasher } from './BcryptPasswordHasher';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('should hash a password', async () => {
    const hash = await hasher.hash('TestPassword123');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('TestPassword123');
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });

  it('should verify correct password', async () => {
    const hash = await hasher.hash('TestPassword123');
    const isValid = await hasher.compare('TestPassword123', hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const hash = await hasher.hash('TestPassword123');
    const isValid = await hasher.compare('WrongPassword', hash);
    expect(isValid).toBe(false);
  });

  it('should generate different hashes for same password', async () => {
    const hash1 = await hasher.hash('TestPassword123');
    const hash2 = await hasher.hash('TestPassword123');
    expect(hash1).not.toBe(hash2);
  });
});
