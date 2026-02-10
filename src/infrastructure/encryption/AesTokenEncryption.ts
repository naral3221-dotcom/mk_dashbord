import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';
import { ITokenEncryption } from '@/domain/services/ITokenEncryption';

export class AesTokenEncryption implements ITokenEncryption {
  private readonly key: Buffer;

  constructor(encryptionKey: string) {
    if (!encryptionKey || encryptionKey.length < 16) {
      throw new Error('Encryption key must be at least 16 characters');
    }
    // Derive a 32-byte key using scrypt
    this.key = scryptSync(encryptionKey, 'marketing-analytics-salt', 32);
  }

  async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) {
      throw new Error('Plaintext is required');
    }

    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  async decrypt(ciphertext: string): Promise<string> {
    if (!ciphertext) {
      throw new Error('Ciphertext is required');
    }

    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(parts[0]!, 'hex');
    const authTag = Buffer.from(parts[1]!, 'hex');
    const encrypted = parts[2]!;

    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
