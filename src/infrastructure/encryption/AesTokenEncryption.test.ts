import { describe, it, expect } from 'vitest';
import { AesTokenEncryption } from './AesTokenEncryption';

describe('AesTokenEncryption', () => {
  const validKey = 'test-encryption-key-1234567890';

  it('should encrypt and decrypt successfully (round-trip)', async () => {
    const encryption = new AesTokenEncryption(validKey);
    const plaintext = 'my-secret-access-token';

    const ciphertext = await encryption.encrypt(plaintext);
    const decrypted = await encryption.decrypt(ciphertext);

    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for same plaintext (random IV)', async () => {
    const encryption = new AesTokenEncryption(validKey);
    const plaintext = 'same-plaintext-value';

    const ciphertext1 = await encryption.encrypt(plaintext);
    const ciphertext2 = await encryption.encrypt(plaintext);

    expect(ciphertext1).not.toBe(ciphertext2);

    // Both should decrypt to the same value
    expect(await encryption.decrypt(ciphertext1)).toBe(plaintext);
    expect(await encryption.decrypt(ciphertext2)).toBe(plaintext);
  });

  it('should throw on empty plaintext', async () => {
    const encryption = new AesTokenEncryption(validKey);

    await expect(encryption.encrypt('')).rejects.toThrow('Plaintext is required');
  });

  it('should throw on empty ciphertext', async () => {
    const encryption = new AesTokenEncryption(validKey);

    await expect(encryption.decrypt('')).rejects.toThrow('Ciphertext is required');
  });

  it('should throw on invalid ciphertext format', async () => {
    const encryption = new AesTokenEncryption(validKey);

    await expect(encryption.decrypt('not-valid-format')).rejects.toThrow(
      'Invalid ciphertext format',
    );
    await expect(encryption.decrypt('only:two')).rejects.toThrow(
      'Invalid ciphertext format',
    );
    await expect(encryption.decrypt('a:b:c:d')).rejects.toThrow(
      'Invalid ciphertext format',
    );
  });

  it('should throw on tampered ciphertext (wrong authTag)', async () => {
    const encryption = new AesTokenEncryption(validKey);
    const ciphertext = await encryption.encrypt('secret-data');

    const parts = ciphertext.split(':');
    // Tamper with the authTag (replace with zeros)
    const tampered = `${parts[0]!}:${'0'.repeat(32)}:${parts[2]!}`;

    await expect(encryption.decrypt(tampered)).rejects.toThrow();
  });

  it('should throw if encryption key is too short (< 16 chars)', () => {
    expect(() => new AesTokenEncryption('')).toThrow(
      'Encryption key must be at least 16 characters',
    );
    expect(() => new AesTokenEncryption('short')).toThrow(
      'Encryption key must be at least 16 characters',
    );
    expect(() => new AesTokenEncryption('exactly16chars!!')).not.toThrow();
  });

  it('should handle long strings', async () => {
    const encryption = new AesTokenEncryption(validKey);
    const longText = 'a'.repeat(10000);

    const ciphertext = await encryption.encrypt(longText);
    const decrypted = await encryption.decrypt(ciphertext);

    expect(decrypted).toBe(longText);
  });

  it('should handle special characters and unicode', async () => {
    const encryption = new AesTokenEncryption(validKey);
    const specialText = '한국어 테스트 🚀 <script>alert("xss")</script> émojis & spëcial chârs!';

    const ciphertext = await encryption.encrypt(specialText);
    const decrypted = await encryption.decrypt(ciphertext);

    expect(decrypted).toBe(specialText);
  });

  it('should use different keys to produce incompatible ciphertexts', async () => {
    const encryption1 = new AesTokenEncryption('first-key-at-least-16-chars');
    const encryption2 = new AesTokenEncryption('second-key-at-least-16-chars');
    const plaintext = 'cross-key-test';

    const ciphertext = await encryption1.encrypt(plaintext);

    // Decrypting with a different key should fail
    await expect(encryption2.decrypt(ciphertext)).rejects.toThrow();

    // But same key should work
    const decrypted = await encryption1.decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });
});
